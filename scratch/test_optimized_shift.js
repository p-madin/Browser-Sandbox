const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9340;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testOptimized() {
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${chromePort}`,
        '--headless=new',
        '--window-size=1936,1036',
        `http://127.0.0.1:${serverPort}/test_grid.html?seed=${seed}`
    ]);
    await sleep(1500);

    let ws = null;
    try {
        const res = await fetch(`http://127.0.0.1:${chromePort}/json`);
        const targets = await res.json();
        const page = targets.find(t => t.type === 'page' && t.url.includes(`${serverPort}`));
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let msgId = 1;
        function sendCDP(method, params = {}) {
            return new Promise((resolve, reject) => {
                const reqId = msgId++;
                const handler = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.id === reqId) {
                        ws.removeEventListener('message', handler);
                        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                        else resolve(msg.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id: reqId, method, params }));
            });
        }

        for (let i = 0; i < 40; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.AgentBridge)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        const benchRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;
                g.updateGrid(a, true);

                const pad = g.pad;
                const cols = g.cell_size_x + 2 * pad + 1;
                const rows = g.cell_size_y + 2 * pad + 1;

                const pools = [
                    g.bridge_elements,
                    g.structure_elements,
                    g.tree_elements,
                    g.flora_elements,
                    g.roof_elements
                ];

                const runs = 20;
                let totalTime = 0;

                for (let run = 0; run < runs; run++) {
                    const t0 = performance.now();
                    const dx = 1;
                    const dy = 0;

                    // 1. Data shift (typed arrays)
                    for (let c = 0; c < cols - 1; c++) {
                        const destOffset = c * rows;
                        const srcOffset = (c + 1) * rows;
                        for (let r = 0; r < rows; r++) {
                            const kd = destOffset + r;
                            const ks = srcOffset + r;
                            g.all_cells[kd] = g.all_cells[ks];
                            g.all_blocked_cells[kd] = g.all_blocked_cells[ks];
                            g.slot_state[kd] = g.slot_state[ks];
                            g.slot_reticle_state[kd] = g.slot_reticle_state[ks];

                            const cObj = g.all_cells[kd];
                            if (cObj) cObj.cell_element = g.rect_elements[kd];
                        }
                    }

                    // 2. Dynamic symbol shift (only shift pools)
                    for (let c = 0; c < cols - 1; c++) {
                        const destOffset = c * rows;
                        const srcOffset = (c + 1) * rows;
                        const newX = g.slot_x[destOffset];

                        for (let r = 0; r < rows; r++) {
                            const kd = destOffset + r;
                            const ks = srcOffset + r;

                            // Standard symbols
                            for (let p = 0; p < pools.length; p++) {
                                const pool = pools[p];
                                const el = pool[ks];
                                if (el) {
                                    pool[ks] = null;
                                    pool[kd] = el;
                                    el.setAttribute("x", newX);
                                }
                            }

                            // Reticles
                            const retEl = g.reticle_elements[ks];
                            if (retEl) {
                                g.reticle_elements[ks] = null;
                                g.reticle_elements[kd] = retEl;
                                const rk = g.slot_reticle_state[kd];
                                if ((rk & 0x8000) !== 0) {
                                    retEl.setAttribute("x", newX);
                                } else {
                                    const mask = rk & 0xF;
                                    const ang = RETICLE_ANGLES[mask];
                                    const i = c - pad;
                                    const j = r - pad;
                                    const sx = i * g.cell_size;
                                    const sy = j * g.cell_size;
                                    const tf = \`translate(\${sx}, \${sy}) rotate(\${ang}, 10, 10)\`;
                                    retEl.setAttribute("transform", tf);
                                    retEl._lastTf = tf;
                                }
                            }
                        }
                    }

                    // 3. Frontier column (56 cells)
                    const frontierCol = cols - 1;
                    const map_x = (frontierCol - pad) - vector_horizontal;
                    const colCells = globalMapObject.map_cells[map_x];
                    const prevCol = globalMapObject.map_cells[map_x - 1];
                    const nextCol = globalMapObject.map_cells[map_x + 1];
                    for (let r = 0; r < rows; r++) {
                        const kd = frontierCol * rows + r;
                        const j = r - pad;
                        const map_y = j - vector_vertical;
                        let cell_object = (colCells && colCells[map_y]) ? colCells[map_y] : new cell_meta(null, frontierCol - pad, j, kd, CellFlags.BLOCKED);
                        cell_object.cell_element = g.rect_elements[kd];
                        g.all_cells[kd] = cell_object;
                        g.all_blocked_cells[kd] = cell_object.isBlockedType();
                        cell_object.decorateCell();
                    }

                    const t1 = performance.now();
                    totalTime += (t1 - t0);
                }

                return {
                    avgStepMs: (totalTime / runs).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Optimized Step Benchmark:", benchRes.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testOptimized().catch(console.error);

