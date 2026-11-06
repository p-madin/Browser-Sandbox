const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9341;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testCorrectness() {
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

        // Test correctness across 10 steps
        const compResult = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const a = window.agent;

                // Capture initial state after full sweep
                g.updateGrid(a, true);
                for (let k = 0; k < g.rect_elements.length; k++) {
                    const el = g.rect_elements[k];
                    el._lastClass = el.getAttribute("class") || "cell";
                }

                // Define full updateGridFrontier implementation
                function frontierStep(dx, dy) {
                    vector_horizontal -= dx;
                    vector_vertical -= dy;
                    a.x += dx;
                    a.y += dy;

                    const pad = g.pad;
                    const cols = g.cell_size_x + 2 * pad + 1;
                    const rows = g.cell_size_y + 2 * pad + 1;
                    const mapCells = globalMapObject.map_cells;
                    my_cache_offset = (a.x * g.cell_size_y) + a.y;

                    const pools = [
                        g.bridge_elements,
                        g.structure_elements,
                        g.tree_elements,
                        g.flora_elements,
                        g.roof_elements,
                        g.reticle_elements
                    ];

                    // 1. Retire exiting slots
                    if (dx > 0) {
                        for (let r = 0; r < rows; r++) {
                            const k = 0 * rows + r;
                            for (let p = 0; p < pools.length; p++) g.hideSymbolInstance(pools[p], k);
                        }
                    } else if (dx < 0) {
                        for (let r = 0; r < rows; r++) {
                            const k = (cols - 1) * rows + r;
                            for (let p = 0; p < pools.length; p++) g.hideSymbolInstance(pools[p], k);
                        }
                    }
                    if (dy > 0) {
                        for (let c = 0; c < cols; c++) {
                            const k = c * rows + 0;
                            for (let p = 0; p < pools.length; p++) g.hideSymbolInstance(pools[p], k);
                        }
                    } else if (dy < 0) {
                        for (let c = 0; c < cols; c++) {
                            const k = c * rows + (rows - 1);
                            for (let p = 0; p < pools.length; p++) g.hideSymbolInstance(pools[p], k);
                        }
                    }

                    // 2. Shift internal slots
                    const cFrom = (dx > 0) ? 0 : cols - 1;
                    const cTo = (dx > 0) ? cols - 1 - dx : -dx;
                    const cStep = (dx > 0) ? 1 : -1;

                    const rFrom = (dy > 0) ? 0 : rows - 1;
                    const rTo = (dy > 0) ? rows - 1 - dy : -dy;
                    const rStep = (dy > 0) ? 1 : -1;

                    for (let c = cFrom; (cStep > 0 ? c <= cTo : c >= cTo); c += cStep) {
                        const srcC = c + dx;
                        const destOffset = c * rows;
                        const srcOffset = srcC * rows;

                        for (let r = rFrom; (rStep > 0 ? r <= rTo : r >= rTo); r += rStep) {
                            const srcR = r + dy;
                            const kDest = destOffset + r;
                            const kSrc = srcOffset + srcR;

                            g.all_cells[kDest] = g.all_cells[kSrc];
                            g.all_blocked_cells[kDest] = g.all_blocked_cells[kSrc];
                            g.slot_state[kDest] = g.slot_state[kSrc];
                            g.slot_reticle_state[kDest] = g.slot_reticle_state[kSrc];

                            const cellObj = g.all_cells[kDest];
                            const cellEl = g.rect_elements[kDest];
                            if (cellObj) cellObj.cell_element = cellEl;

                            const srcEl = g.rect_elements[kSrc];
                            if (cellEl && srcEl && cellEl._lastClass !== srcEl._lastClass) {
                                cellEl.setAttribute("class", srcEl._lastClass);
                                cellEl._lastClass = srcEl._lastClass;
                            }

                            // Shift symbol instances
                            for (let p = 0; p < pools.length; p++) {
                                const pool = pools[p];
                                const el = pool[kSrc];
                                pool[kSrc] = null;
                                pool[kDest] = el;
                                if (el) {
                                    if (pool === g.reticle_elements) {
                                        const rk = g.slot_reticle_state[kDest];
                                        if ((rk & 0x8000) !== 0) {
                                            el.setAttribute("x", g.slot_x[kDest]);
                                            el.setAttribute("y", g.slot_y[kDest]);
                                        } else {
                                            const mask = rk & 0xF;
                                            const ang = RETICLE_ANGLES[mask];
                                            const sx = (c - pad) * g.cell_size;
                                            const sy = (r - pad) * g.cell_size;
                                            const tf = \`translate(\${sx}, \${sy}) rotate(\${ang}, 10, 10)\`;
                                            if (el._lastTf !== tf) {
                                                el.setAttribute("transform", tf);
                                                el._lastTf = tf;
                                            }
                                        }
                                    } else {
                                        if (el.hasAttribute("x")) el.setAttribute("x", g.slot_x[kDest]);
                                        if (el.hasAttribute("y")) el.setAttribute("y", g.slot_y[kDest]);
                                    }
                                }
                            }
                        }
                    }

                    // 3. Populate frontier cells
                    function populateSlot(c, r) {
                        const k = c * rows + r;
                        const i = c - pad;
                        const j = r - pad;
                        const map_x = i - vector_horizontal;
                        const map_y = j - vector_vertical;
                        const colCells = mapCells[map_x];
                        const prevCol = mapCells[map_x - 1];
                        const nextCol = mapCells[map_x + 1];

                        let cell_object;
                        if (colCells && colCells[map_y]) {
                            cell_object = colCells[map_y];
                        } else {
                            cell_object = new cell_meta(null, i, j, k, CellFlags.BLOCKED);
                        }

                        const cell_element = g.rect_elements[k];
                        cell_object.cell_element = cell_element;
                        cell_object.my_seed_ref = k + my_cache_offset;
                        cell_object.my_shortest_path = Number.MAX_SAFE_INTEGER;
                        g.all_cells[k] = cell_object;
                        g.all_blocked_cells[k] = cell_object.isBlockedType();

                        cell_object.decorateCell();
                        const flags = cell_object.flags;
                        const elev = cell_object.elevation !== undefined ? cell_object.elevation : 1;
                        const hasDynamic = (flags & (CellFlags.TERRAIN_FLORA | CellFlags.STRUCTURE_ROOF)) !== 0;
                        g.slot_state[k] = hasDynamic ? -1 : (flags | (elev << 24));

                        // Reticles
                        const cat = g.getReticleCategory(cell_object);
                        let reticleKey = 0;
                        if (cat > 0) {
                            const catN = colCells ? g.getReticleCategory(colCells[map_y - 1]) : 0;
                            const catE = nextCol ? g.getReticleCategory(nextCol[map_y]) : 0;
                            const catS = colCells ? g.getReticleCategory(colCells[map_y + 1]) : 0;
                            const catW = prevCol ? g.getReticleCategory(prevCol[map_y]) : 0;
                            const mask = (catN !== cat ? 1 : 0) | (catE !== cat ? 2 : 0) | (catS !== cat ? 4 : 0) | (catW !== cat ? 8 : 0);
                            if (mask > 0) {
                                reticleKey = (cat << 4) | mask;
                            } else if (cat === 2 || cat === 3) {
                                const di = i - g.grid_mid_x;
                                const dj = j - g.grid_mid_y;
                                if ((di * di + dj * dj) <= 256) {
                                    if (((map_x * 37 + map_y * 17) & 7) === 0) {
                                        const phase = (((map_x * 19) ^ (map_y >> 1)) & 3);
                                        reticleKey = (cat << 16) | 0x8000 | phase;
                                    }
                                }
                            }
                        }

                        g.slot_reticle_state[k] = reticleKey;
                        if (reticleKey === 0) {
                            g.hideSymbolInstance(g.reticle_elements, k);
                        } else if ((reticleKey & 0x8000) !== 0) {
                            const cellCat = (reticleKey >> 16) & 0xFF;
                            const phase = reticleKey & 0x3;
                            const sym = PURE_WAVE_SYMBOLS[phase];
                            const cls = (cellCat === 3) ? "cell_pure_wave pure_wave_shallow" : "cell_pure_wave pure_wave_deep";
                            g.ensureSymbolInstance(g.reticle_elements, g.reticles_layer, sym, k, cls, null, null);
                        } else {
                            const mask = reticleKey & 0xF;
                            const cellCat = (reticleKey >> 4) & 0xF;
                            const isWater = (cellCat === 2 || cellCat === 3);
                            const sym = isWater ? RETICLE_WATER_SYMBOLS[mask] : RETICLE_SYMBOLS[mask];
                            const ang = RETICLE_ANGLES[mask];
                            const cls = RETICLE_CLASSES[cellCat];
                            const sx = i * g.cell_size;
                            const sy = j * g.cell_size;
                            const tf = \`translate(\${sx}, \${sy}) rotate(\${ang}, 10, 10)\`;
                            g.ensureSymbolInstance(g.reticle_elements, g.reticles_layer, sym, k, cls, tf, null);
                        }

                        // Dynamic feature symbols
                        const hasStrictBuilding = (flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_PATH)) !== 0;
                        const hasStructureDeck = (flags & (CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_FLOOR)) !== 0;
                        const hasStructureWall = (flags & (CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_FIXTURE)) !== 0;

                        if (hasStructureDeck) g.ensureSymbolInstance(g.bridge_elements, g.bridges_layer, "#symbol_tile", k, cell_element._lastClass);
                        else g.hideSymbolInstance(g.bridge_elements, k);

                        if (hasStructureWall) g.ensureSymbolInstance(g.structure_elements, g.structures_layer, "#symbol_tile", k, cell_element._lastClass);
                        else g.hideSymbolInstance(g.structure_elements, k);

                        if ((flags & CellFlags.TREE) !== 0 && (flags & CellFlags.TERRAIN_FLORA) === 0 && !hasStrictBuilding) {
                            g.ensureSymbolInstance(g.tree_elements, g.features_layer, "#symbol_tree", k, "cell_tree_feature");
                        } else {
                            g.hideSymbolInstance(g.tree_elements, k);
                        }

                        if ((flags & CellFlags.TERRAIN_FLORA) !== 0 && !hasStrictBuilding) {
                            const floraEl = g.ensureSymbolInstance(g.flora_elements, g.features_layer, "#symbol_flora", k, "cell_flora_feature");
                            const jitterX = ((((Math.sin(map_x * 12.9898 + map_y * 78.233) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                            const jitterY = ((((Math.cos(map_x * 39.346 + map_y * 11.135) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                            const tf = \`translate(\${jitterX.toFixed(1)}, \${jitterY.toFixed(1)})\`;
                            if (floraEl._lastTf !== tf) {
                                floraEl.setAttribute("transform", tf);
                                floraEl._lastTf = tf;
                            }
                        } else {
                            g.hideSymbolInstance(g.flora_elements, k);
                        }

                        if ((flags & CellFlags.STRUCTURE_ROOF) !== 0) {
                            g.ensureSymbolInstance(g.roof_elements, g.roof_layer, "#symbol_tile", k, 'cell_roof timber occluded');
                        } else {
                            g.hideSymbolInstance(g.roof_elements, k);
                        }
                    }

                    if (dx > 0) {
                        for (let r = 0; r < rows; r++) populateSlot(cols - 1, r);
                    } else if (dx < 0) {
                        for (let r = 0; r < rows; r++) populateSlot(0, r);
                    }

                    if (dy > 0) {
                        for (let c = 0; c < cols; c++) populateSlot(c, rows - 1);
                    } else if (dy < 0) {
                        for (let c = 0; c < cols; c++) populateSlot(c, 0);
                    }

                    if (g.terrainPathService) {
                        g.terrainPathService.updateViewport(g, vector_horizontal, vector_vertical);
                    }
                    g.flushFreePools();
                }

                // Run 10 frontier steps East
                const latencies = [];
                for (let s = 0; s < 10; s++) {
                    const tStart = performance.now();
                    frontierStep(1, 0);
                    const tEnd = performance.now();
                    latencies.push(tEnd - tStart);
                }

                // Capture state after 10 frontier steps
                const frontierMapXMid = g.all_cells[g.grid_mid_cell].my_x;
                const frontierMapYMid = g.all_cells[g.grid_mid_cell].my_y;
                const frontierActiveUses = Array.from(document.querySelectorAll('use')).filter(u => u.style.display !== 'none').length;

                // Now execute an authoritative full updateGrid at this exact same spot
                g.updateGrid(a, true);

                const fullMapXMid = g.all_cells[g.grid_mid_cell].my_x;
                const fullMapYMid = g.all_cells[g.grid_mid_cell].my_y;
                const fullActiveUses = Array.from(document.querySelectorAll('use')).filter(u => u.style.display !== 'none').length;

                const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3);
                const maxLatency = Math.max(...latencies).toFixed(3);

                return {
                    avgLatencyMs: avgLatency,
                    maxLatencyMs: maxLatency,
                    coordMatch: (frontierMapXMid === fullMapXMid && frontierMapYMid === fullMapYMid),
                    frontierMapCoords: [frontierMapXMid, frontierMapYMid],
                    fullMapCoords: [fullMapXMid, fullMapYMid],
                    frontierActiveUses,
                    fullActiveUses,
                    usesMatch: (frontierActiveUses === fullActiveUses)
                };
            })()`,
            returnByValue: true
        });

        console.log("Correctness & Performance Test:", compResult.result.value);

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testCorrectness().catch(console.error);
