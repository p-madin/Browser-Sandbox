const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9342;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testPrototype() {
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

        // Wait for ready
        for (let i = 0; i < 40; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.AgentBridge)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Evaluate prototype frontier update vs full sweep in the real browser environment
        const testRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;

                // Time full updateGrid
                const t0 = performance.now();
                g.updateGrid(a, true);
                const t1 = performance.now();
                const fullSweepMs = (t1 - t0).toFixed(3);

                // Let's implement and measure updateGridFrontier(a, interactive, dx, dy)
                function updateGridFrontier(i_agent, interactive, dx, dy) {
                    const tStart = performance.now();
                    g.interactive = (typeof interactive !== 'undefined') ? interactive : true;
                    my_cache_offset = (i_agent.x * g.cell_size_y) + i_agent.y;

                    const pad = g.pad;
                    const cols = g.cell_size_x + 2 * pad + 1;
                    const rows = g.cell_size_y + 2 * pad + 1;
                    const mapCells = globalMapObject.map_cells;

                    // Pools to shift
                    const pools = [
                        g.bridge_elements,
                        g.structure_elements,
                        g.tree_elements,
                        g.flora_elements,
                        g.roof_elements,
                        g.reticle_elements
                    ];

                    // Determine shift bounds and directions
                    const cStart = (dx > 0) ? 0 : cols - 1;
                    const cEnd = (dx > 0) ? cols - 1 : 0;
                    const cStep = (dx > 0) ? 1 : -1;

                    const rStart = (dy > 0) ? 0 : rows - 1;
                    const rEnd = (dy > 0) ? rows - 1 : 0;
                    const rStep = (dy > 0) ? 1 : -1;

                    // 1. Shift internal slots
                    for (let c = cStart; c !== cEnd; c += cStep) {
                        const srcC = c + dx;
                        if (srcC < 0 || srcC >= cols) continue;
                        const destOffset = c * rows;
                        const srcOffset = srcC * rows;

                        for (let r = rStart; r !== rEnd; r += rStep) {
                            const srcR = r + dy;
                            if (srcR < 0 || srcR >= rows) continue;

                            const kDest = destOffset + r;
                            const kSrc = srcOffset + srcR;

                            // Shift cell state & references
                            g.all_cells[kDest] = g.all_cells[kSrc];
                            g.all_blocked_cells[kDest] = g.all_blocked_cells[kSrc];
                            g.slot_state[kDest] = g.slot_state[kSrc];
                            g.slot_reticle_state[kDest] = g.slot_reticle_state[kSrc];

                            // Update rect_elements[kDest] class if needed
                            const cellObj = g.all_cells[kDest];
                            if (cellObj) cellObj.cell_element = g.rect_elements[kDest];

                            // Shift symbol instances
                            for (let p = 0; p < pools.length; p++) {
                                const pool = pools[p];
                                const el = pool[kSrc];
                                pool[kSrc] = null;
                                pool[kDest] = el;
                                if (el) {
                                    if (el.hasAttribute("x")) el.setAttribute("x", g.slot_x[kDest]);
                                    if (el.hasAttribute("y")) el.setAttribute("y", g.slot_y[kDest]);
                                }
                            }
                        }
                    }

                    // 2. Populate entering frontier cells
                    // If dx !== 0: column (dx > 0 ? cols - 1 : 0)
                    if (dx !== 0) {
                        const enterCol = (dx > 0) ? cols - 1 : 0;
                        const map_x = (enterCol - pad) - vector_horizontal;
                        const colCells = mapCells[map_x];
                        const prevCol = mapCells[map_x - 1];
                        const nextCol = mapCells[map_x + 1];
                        const sx = (enterCol - pad) * g.cell_size;
                        const destOffset = enterCol * rows;

                        for (let r = 0; r < rows; r++) {
                            const k = destOffset + r;
                            const j = r - pad;
                            const map_y = j - vector_vertical;
                            let cell_object;
                            if (colCells && colCells[map_y]) {
                                cell_object = colCells[map_y];
                            } else {
                                cell_object = new cell_meta(null, enterCol - pad, j, k, CellFlags.BLOCKED);
                            }
                            cell_object.cell_element = g.rect_elements[k];
                            cell_object.my_seed_ref = k + my_cache_offset;
                            cell_object.my_shortest_path = Number.MAX_SAFE_INTEGER;
                            g.all_cells[k] = cell_object;
                            g.all_blocked_cells[k] = cell_object.isBlockedType();

                            const flags = cell_object.flags;
                            const elev = cell_object.elevation !== undefined ? cell_object.elevation : 1;
                            const hasDynamic = (flags & (CellFlags.TERRAIN_FLORA | CellFlags.STRUCTURE_ROOF)) !== 0;
                            const stateKey = hasDynamic ? -1 : (flags | (elev << 24));
                            g.slot_state[k] = stateKey;

                            // Reticles for frontier
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
                            g.slot_reticle_state[k] = reticleKey;
                            if (reticleKey === 0) {
                                g.hideSymbolInstance(g.reticle_elements, k);
                            }
                        }
                    }

                    if (g.terrainPathService) {
                        g.terrainPathService.updateViewport(g, vector_horizontal, vector_vertical);
                    }
                    g.flushFreePools();

                    if (g.player_avatar) {
                        const avatarClass = !g.interactive ? "player_avatar walking" : "player_avatar idle";
                        if (g.player_avatar._lastCls !== avatarClass) {
                            g.player_avatar.setAttribute("class", avatarClass);
                            g.player_avatar._lastCls = avatarClass;
                        }
                    }

                    const tEnd = performance.now();
                    return (tEnd - tStart);
                }

                // Run 20 frontier updates
                let frontierTotal = 0;
                for (let step = 0; step < 20; step++) {
                    vector_horizontal -= 1;
                    a.x += 1;
                    frontierTotal += updateGridFrontier(a, false, 1, 0);
                }

                return {
                    fullSweepMs,
                    avgFrontierMs: (frontierTotal / 20).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Test Results:", testRes.result.value);

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testPrototype().catch(console.error);

