const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9343;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function profile() {
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

        // Wait for grid
        for (let i = 0; i < 40; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.AgentBridge)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Measure sub-parts of updateGrid
        const subTimings = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;
                
                // Instrument updateGrid
                const origUpdate = g.updateGrid;

                let tNullSweep = 0;
                let tLoopMapFetch = 0;
                let tLoopReticles = 0;
                let tLoopOther = 0;
                let tPass1 = 0;
                let tPass2 = 0;
                let tOther = 0;
                let changedCountTotal = 0;

                const runs = 20;
                for (let r = 0; r < runs; r++) {
                    vector_horizontal -= 1;
                    a.x += 1;
                    
                    const pad = g.pad;
                    let frame_count = 0;
                    const mapCells = globalMapObject.map_cells;

                    const t0 = performance.now();
                    for (var c = 0; c < g.all_cells.length; c++) {
                        var oldCell = g.all_cells[c];
                        if (oldCell) oldCell.cell_element = null;
                    }
                    const t1 = performance.now();
                    tNullSweep += (t1 - t0);

                    let changedCount = 0;
                    for (var i = -pad; i <= g.cell_size_x + pad; i++) {
                        var map_x = i - vector_horizontal;
                        var colCells = mapCells[map_x];
                        var prevCol = mapCells[map_x - 1];
                        var nextCol = mapCells[map_x + 1];
                        var sx = i * g.cell_size;
                        for (var j = -pad; j <= g.cell_size_y + pad; j++) {
                            var map_y = j - vector_vertical;
                            var cell_object;
                            if (colCells !== undefined && colCells[map_y] !== undefined) {
                                cell_object = colCells[map_y];
                            } else {
                                cell_object = new cell_meta(null, i, j, frame_count, CellFlags.BLOCKED);
                            }
                            var cell_element = g.rect_elements[frame_count];
                            cell_object.cell_element = cell_element;
                            cell_object.my_seed_ref = frame_count;
                            cell_object.my_shortest_path = Number.MAX_SAFE_INTEGER;
                            g.all_cells[frame_count] = cell_object;
                            g.all_blocked_cells[frame_count] = cell_object.isBlockedType();

                            const flags = cell_object.flags;
                            const elev = cell_object.elevation !== undefined ? cell_object.elevation : 1;
                            const hasDynamic = (flags & (CellFlags.TERRAIN_FLORA | CellFlags.STRUCTURE_ROOF)) !== 0;
                            const stateKey = hasDynamic ? -1 : (flags | (elev << 24));
                            if (g.slot_state[frame_count] !== stateKey || stateKey === -1 || cell_element._lastClass === null) {
                                g.slot_state[frame_count] = stateKey;
                                g.changed_slots[changedCount++] = frame_count;
                            }

                            // Reticles
                            const cat = g.getReticleCategory(cell_object);
                            let reticleKey = 0;
                            if (cat > 0) {
                                const catN = colCells ? g.getReticleCategory(colCells[map_y - 1]) : 0;
                                const catE = nextCol ? g.getReticleCategory(nextCol[map_y]) : 0;
                                const catS = colCells ? g.getReticleCategory(colCells[map_y + 1]) : 0;
                                const catW = prevCol ? g.getReticleCategory(prevCol[map_y]) : 0;
                                const mask = (catN !== cat ? 1 : 0) | (catE !== cat ? 2 : 0) | (catS !== cat ? 4 : 0) | (catW !== cat ? 8 : 0);
                                if (mask > 0) reticleKey = (cat << 4) | mask;
                            }
                            if (g.slot_reticle_state[frame_count] !== reticleKey) {
                                g.slot_reticle_state[frame_count] = reticleKey;
                                if (reticleKey === 0) g.hideSymbolInstance(g.reticle_elements, frame_count);
                            }
                            frame_count++;
                        }
                    }
                    const t2 = performance.now();
                    tLoopMapFetch += (t2 - t1);
                    changedCountTotal += changedCount;
                }

                return {
                    avgNullSweepMs: (tNullSweep / runs).toFixed(3),
                    avgLoopMs: (tLoopMapFetch / runs).toFixed(3),
                    avgChangedCount: (changedCountTotal / runs).toFixed(1)
                };
            })()`,
            returnByValue: true
        });

        console.log("Sub-timings:", subTimings.result.value);

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

profile().catch(console.error);
