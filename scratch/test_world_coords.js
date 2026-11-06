const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9340;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testWorldCoords() {
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

                // Measure cost of 1-column frontier update
                const runs = 50;
                let totalTime = 0;

                for (let r = 0; r < runs; r++) {
                    const t0 = performance.now();

                    // 1. Shift data array pointers
                    for (let c = 0; c < cols - 1; c++) {
                        const destOffset = c * rows;
                        const srcOffset = (c + 1) * rows;
                        for (let row = 0; row < rows; row++) {
                            g.all_cells[destOffset + row] = g.all_cells[srcOffset + row];
                            g.all_blocked_cells[destOffset + row] = g.all_blocked_cells[srcOffset + row];
                            g.slot_state[destOffset + row] = g.slot_state[srcOffset + row];
                            g.slot_reticle_state[destOffset + row] = g.slot_reticle_state[srcOffset + row];
                        }
                    }

                    // 2. Frontier column update (56 cells)
                    const frontierCol = cols - 1;
                    const map_x = (frontierCol - pad) - vector_horizontal;
                    const colCells = globalMapObject.map_cells[map_x];
                    const prevCol = globalMapObject.map_cells[map_x - 1];
                    const nextCol = globalMapObject.map_cells[map_x + 1];

                    for (let row = 0; row < rows; row++) {
                        const kd = frontierCol * rows + row;
                        const j = row - pad;
                        const map_y = j - vector_vertical;
                        let cell_object = (colCells && colCells[map_y]) ? colCells[map_y] : new cell_meta(null, frontierCol - pad, j, kd, CellFlags.BLOCKED);
                        g.all_cells[kd] = cell_object;
                        g.all_blocked_cells[kd] = cell_object.isBlockedType();

                        // Reticle evaluation on 1 cell
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
                        g.slot_reticle_state[kd] = reticleKey;
                    }

                    // 3. Layer transform updates
                    const shiftX = vector_horizontal * g.cell_size;
                    const shiftY = vector_vertical * g.cell_size;
                    const tf = \`translate(\${shiftX.toFixed(1)}, \${shiftY.toFixed(1)})\`;
                    if (g.terrainPathService) g.terrainPathService.updateViewport(g, vector_horizontal, vector_vertical);

                    const t1 = performance.now();
                    totalTime += (t1 - t0);
                }

                return {
                    avgStepMs: (totalTime / runs).toFixed(3)
                };
            })()`,
            returnByValue: true
        });

        console.log("Frontier-only Latency:", benchRes.result.value);
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testWorldCoords().catch(console.error);

