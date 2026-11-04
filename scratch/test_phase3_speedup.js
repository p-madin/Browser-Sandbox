const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9339;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_bench_${Date.now()}`);
    const targetUrl = `http://127.0.0.1:${serverPort}/test_grid.html?seed=${seed}`;

    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${tempDir}`,
        '--headless=new',
        '--window-size=1936,1036',
        targetUrl
    ]);

    let ws = null;
    try {
        let wsUrl = null;
        for (let i = 0; i < 40; i++) {
            try {
                const res = await fetch(`http://127.0.0.1:${chromePort}/json`);
                const targets = await res.json();
                const page = targets.find(t => t.type === 'page' && t.url.includes(`${serverPort}`));
                if (page && page.webSocketDebuggerUrl) {
                    wsUrl = page.webSocketDebuggerUrl;
                    break;
                }
            } catch (e) { }
            await sleep(150);
        }

        ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

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

        // Wait for page readiness
        for (let i = 0; i < 50; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.globalGridObject.terrainPathService)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Measure un-optimized River route FPS first
        console.log("Measuring Un-Optimized River FPS...");
        const resPre = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Pre-Opt River:", resPre.result.value.avgFps.toFixed(1), "FPS | Jank:", resPre.result.value.jankFramesCount, `(${resPre.result.value.jankFrameRatePct}%)`);

        // Inject Phase 3 Optimization into runtime
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                const CellFlagsRef = window.CellFlags;
                const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

                const fWater = tps.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
                const bWater = tps.gaussianBlur(fWater);
                const dWave = tps.extractPath(bWater, 0.56, 0.4);

                let waveEl = document.getElementById("path_shoreline_waves");
                if (!waveEl) {
                    waveEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    waveEl.setAttribute("id", "path_shoreline_waves");
                    waveEl.setAttribute("class", "macro_shoreline_wave");
                }
                waveEl.setAttribute("d", dWave);

                let waveContainer = document.getElementById("world_wave_paths");
                if (!waveContainer) {
                    waveContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    waveContainer.setAttribute("id", "world_wave_paths");
                    waveContainer.style.pointerEvents = "none";
                    g.layer_interactive_tiles.appendChild(waveContainer);
                }
                waveContainer.appendChild(waveEl);

                // Wire up updateViewport
                tps.waveContainer = waveContainer;
                const oldUpdate = tps.updateViewport.bind(tps);
                tps.updateViewport = function(grid, vh, vv) {
                    oldUpdate(grid, vh, vv);
                    if (this.waveContainer && this.lastTf) {
                        this.waveContainer.setAttribute("transform", this.lastTf);
                    }
                };

                let styleEl = document.getElementById("macro_wave_style");
                if (!styleEl) {
                    styleEl = document.createElement("style");
                    styleEl.id = "macro_wave_style";
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = \`
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.85);
                        stroke-width: 2.2px;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        stroke-dasharray: 12 6 24 8 16 6;
                        animation: macro-shore-breathe 3.2s ease-in-out infinite;
                        pointer-events: none;
                        will-change: stroke-dashoffset, opacity, stroke-width;
                    }
                    @keyframes macro-shore-breathe {
                        0%, 100% {
                            stroke-dashoffset: 0;
                            opacity: 0.35;
                            stroke-width: 1.8px;
                        }
                        50% {
                            stroke-dashoffset: 36px;
                            opacity: 0.90;
                            stroke-width: 2.6px;
                        }
                    }
                    .reticle_wave {
                        animation: none !important;
                        display: none !important;
                    }
                    .reticle_wave_edge,
                    .reticle_wave_edge_opposing,
                    .reticle_wave_corner,
                    .reticle_wave_u,
                    .reticle_wave_island {
                        animation: none !important;
                    }
                \`;
            })()`
        });

        console.log("Measuring Phase 3 Optimized River FPS...");
        const resPost = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Post-Opt River:", resPost.result.value.avgFps.toFixed(1), "FPS | Jank:", resPost.result.value.jankFramesCount, `(${resPost.result.value.jankFrameRatePct}%) | Latency:`, resPost.result.value.avgFrameTimeMs, "ms");

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

