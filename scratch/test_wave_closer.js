const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9342;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_closer_${Date.now()}`);
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

        for (let i = 0; i < 50; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.globalGridObject.terrainPathService)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Move to river route
        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                const bench = window.globalWalkBenchmark;
                const river = bench.routes.river;
                window.globalGridObject.center_on_cell(river.start.x, river.start.y);
                await new Promise(r => setTimeout(r, 500));
            })()`,
            awaitPromise: true
        });

        // Test with closer path (tau = 0.535) and stroke-width / opacity breathing
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                const CellFlagsRef = window.CellFlags;
                const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

                const fWater = tps.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
                const bWater = tps.gaussianBlur(fWater);
                // Closer to shore boundary (tau = 0.535 instead of 0.56)
                const dWaveCloser = tps.extractPath(bWater, 0.535, 0.35);

                const waveEl = document.getElementById("path_shoreline_waves");
                if (waveEl) {
                    waveEl.setAttribute("d", dWaveCloser);
                }

                // Inject updated keyframe without stroke-dashoffset
                let styleEl = document.getElementById("macro_wave_test_style");
                if (!styleEl) {
                    styleEl = document.createElement("style");
                    styleEl.id = "macro_wave_test_style";
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = \`
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.90) !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                        stroke-dasharray: 14 5 24 6 18 5 !important;
                        animation: macro-shore-pulse 2.8s ease-in-out infinite !important;
                        pointer-events: none !important;
                        will-change: stroke-width, opacity !important;
                    }
                    @keyframes macro-shore-pulse {
                        0%, 100% {
                            opacity: 0.25;
                            stroke-width: 1.1px;
                        }
                        45% {
                            opacity: 0.90;
                            stroke-width: 2.5px;
                        }
                        70% {
                            opacity: 0.55;
                            stroke-width: 1.7px;
                        }
                    }
                \`;
            })()`
        });

        // Capture at minimum swell (paused at 0%)
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const el = document.getElementById("path_shoreline_waves");
                el.style.animationPlayState = "paused";
                el.style.opacity = "0.25";
                el.style.strokeWidth = "1.1px";
            })()`
        });
        await sleep(200);
        const shotMin = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_closer_trough.png', Buffer.from(shotMin.data, 'base64'));
        console.log("Saved wave_closer_trough.png");

        // Capture at peak swell (45%)
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const el = document.getElementById("path_shoreline_waves");
                el.style.opacity = "0.90";
                el.style.strokeWidth = "2.5px";
            })()`
        });
        await sleep(200);
        const shotPeak = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_closer_peak.png', Buffer.from(shotPeak.data, 'base64'));
        console.log("Saved wave_closer_peak.png");

        // Restore animation and test river walk FPS
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const el = document.getElementById("path_shoreline_waves");
                el.style.animationPlayState = "running";
                el.style.opacity = "";
                el.style.strokeWidth = "";
            })()`
        });

        console.log("Benchmarking new wave animation on River route...");
        const walkRes = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("New Animation River Walk:", walkRes.result.value.avgFps.toFixed(1), "FPS | Jank:", walkRes.result.value.jankFramesCount, `(${walkRes.result.value.jankFrameRatePct}%)`);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

