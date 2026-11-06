const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9340;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testOptimizedFrontier() {
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

        // Test with bitwise skipping and selective coordinate updates
        const result = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;
                g.updateGrid(a, true);

                const FEATURE_MASK = CellFlags.TREE | CellFlags.TERRAIN_FLORA | CellFlags.STRUCTURE_ROOF | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_FIXTURE;

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

                    const cFrom = 0;
                    const cTo = cols - 2;

                    for (let c = 0; c <= cTo; c++) {
                        const srcC = c + 1;
                        const destOffset = c * rows;
                        const srcOffset = srcC * rows;
                        const destPx = g.slot_x[destOffset];

                        for (let r = 0; r < rows; r++) {
                            const kDest = destOffset + r;
                            const kSrc = srcOffset + r;

                            g.all_cells[kDest] = g.all_cells[kSrc];
                            g.all_blocked_cells[kDest] = g.all_blocked_cells[kSrc];
                            g.slot_state[kDest] = g.slot_state[kSrc];
                            const rk = g.slot_reticle_state[kSrc];
                            g.slot_reticle_state[kDest] = rk;

                            const cellObj = g.all_cells[kDest];
                            const cellEl = g.rect_elements[kDest];
                            if (cellObj) cellObj.cell_element = cellEl;

                            const srcEl = g.rect_elements[kSrc];
                            if (cellEl && srcEl && cellEl._lastClass !== srcEl._lastClass) {
                                cellEl.setAttribute("class", srcEl._lastClass);
                                cellEl._lastClass = srcEl._lastClass;
                            }

                            // Dynamic feature symbols: check mask first
                            if (cellObj && (cellObj.flags & FEATURE_MASK) !== 0) {
                                for (let p = 0; p < pools.length; p++) {
                                    const pool = pools[p];
                                    const el = pool[kSrc];
                                    if (el) {
                                        pool[kSrc] = null;
                                        pool[kDest] = el;
                                        if (el.getAttribute("x") !== destPx) el.setAttribute("x", destPx);
                                    }
                                }
                            }

                            // Reticle: check rk !== 0 first
                            if (rk !== 0) {
                                const retEl = g.reticle_elements[kSrc];
                                if (retEl) {
                                    g.reticle_elements[kSrc] = null;
                                    g.reticle_elements[kDest] = retEl;
                                    if ((rk & 0x8000) !== 0) {
                                        if (retEl.getAttribute("x") !== destPx) retEl.setAttribute("x", destPx);
                                    } else {
                                        const mask = rk & 0xF;
                                        const ang = RETICLE_ANGLES[mask];
                                        const i = c - pad;
                                        const j = r - pad;
                                        const sx = i * g.cell_size;
                                        const sy = j * g.cell_size;
                                        const tf = \`translate(\${sx}, \${sy}) rotate(\${ang}, 10, 10)\`;
                                        if (retEl._lastTf !== tf) {
                                            retEl.setAttribute("transform", tf);
                                            retEl._lastTf = tf;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const t1 = performance.now();
                    totalTime += (t1 - t0);
                }

                return {
                    avgShiftMs: (totalTime / runs).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Optimized Shift Result:", result.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testOptimizedFrontier().catch(console.error);

