const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9341;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testTiming() {
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

        const breakdown = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;
                g.updateGrid(a, true);

                const pad = g.pad;
                const cols = g.cell_size_x + 2 * pad + 1;
                const rows = g.cell_size_y + 2 * pad + 1;

                // Time 1: Shifting data arrays only
                const t0 = performance.now();
                for (let c = 0; c < cols - 1; c++) {
                    const destOffset = c * rows;
                    const srcOffset = (c + 1) * rows;
                    for (let r = 0; r < rows; r++) {
                        g.all_cells[destOffset + r] = g.all_cells[srcOffset + r];
                        g.all_blocked_cells[destOffset + r] = g.all_blocked_cells[srcOffset + r];
                        g.slot_state[destOffset + r] = g.slot_state[srcOffset + r];
                        g.slot_reticle_state[destOffset + r] = g.slot_reticle_state[srcOffset + r];
                    }
                }
                const t1 = performance.now();

                // Time 2: Shifting pools only
                const pools = [
                    g.bridge_elements,
                    g.structure_elements,
                    g.tree_elements,
                    g.flora_elements,
                    g.roof_elements,
                    g.reticle_elements
                ];
                let setAttrCount = 0;
                for (let c = 0; c < cols - 1; c++) {
                    const destOffset = c * rows;
                    const srcOffset = (c + 1) * rows;
                    for (let r = 0; r < rows; r++) {
                        const kDest = destOffset + r;
                        const kSrc = srcOffset + r;
                        for (let p = 0; p < pools.length; p++) {
                            const pool = pools[p];
                            const el = pool[kSrc];
                            if (el) {
                                pool[kSrc] = null;
                                pool[kDest] = el;
                                el.setAttribute("x", g.slot_x[kDest]);
                                el.setAttribute("y", g.slot_y[kDest]);
                                setAttrCount++;
                            }
                        }
                    }
                }
                const t2 = performance.now();

                // Time 3: Populating 56 frontier cells
                const t3 = performance.now();
                const frontierCol = cols - 1;
                const map_x = (frontierCol - pad) - vector_horizontal;
                const colCells = globalMapObject.map_cells[map_x];
                const prevCol = globalMapObject.map_cells[map_x - 1];
                const nextCol = globalMapObject.map_cells[map_x + 1];
                for (let r = 0; r < rows; r++) {
                    const k = frontierCol * rows + r;
                    const j = r - pad;
                    const map_y = j - vector_vertical;
                    let cell_object = (colCells && colCells[map_y]) ? colCells[map_y] : new cell_meta(null, frontierCol - pad, j, k, CellFlags.BLOCKED);
                    cell_object.cell_element = g.rect_elements[k];
                    g.all_cells[k] = cell_object;
                    g.all_blocked_cells[k] = cell_object.isBlockedType();
                    cell_object.decorateCell();
                }
                const t4 = performance.now();

                const poolCounts = {};
                for (let p = 0; p < pools.length; p++) {
                    const pool = pools[p];
                    let c = 0;
                    for (let k = 0; k < pool.length; k++) {
                        if (pool[k]) c++;
                    }
                    poolCounts[p] = c;
                }

                let grassReticles = 0;
                let waterReticles = 0;
                let otherReticles = 0;
                for (let k = 0; k < g.slot_reticle_state.length; k++) {
                    const rk = g.slot_reticle_state[k];
                    if (rk !== 0) {
                        const cat = (rk >> 4) & 0xF;
                        if (cat === 4) grassReticles++;
                        else if (cat === 2 || cat === 3) waterReticles++;
                        else otherReticles++;
                    }
                }

                return {
                    tDataShiftMs: (t1 - t0).toFixed(3),
                    tPoolShiftMs: (t2 - t1).toFixed(3),
                    setAttrCount,
                    poolCounts,
                    reticleBreakdown: { grassReticles, waterReticles, otherReticles },
                    tFrontierMs: (t4 - t3).toFixed(3),
                    totalMs: ((t1 - t0) + (t2 - t1) + (t4 - t3)).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Breakdown:", breakdown.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testTiming().catch(console.error);
