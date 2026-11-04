const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9344;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_dist_${Date.now()}`);
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

        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                const bench = window.globalWalkBenchmark;
                const river = bench.routes.river;
                window.globalGridObject.center_on_cell(river.start.x, river.start.y);
                await new Promise(r => setTimeout(r, 400));
            })()`,
            awaitPromise: true
        });

        // Test Margin Distances:
        // Tau = 0.545: 1.5px margin from shore boundary
        // Combined with organic wave dash padding
        const resDist = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                const CellFlagsRef = window.CellFlags;
                const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

                const fWater = tps.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
                const bWater = tps.gaussianBlur(fWater);
                const dWave545 = tps.extractPath(bWater, 0.545, 0.35);

                const waveEl = document.getElementById("path_shoreline_waves");
                if (waveEl) waveEl.setAttribute("d", dWave545);

                let styleEl = document.getElementById("opt_style");
                if (!styleEl) {
                    styleEl = document.createElement("style");
                    styleEl.id = "opt_style";
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = \`
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.92) !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                        stroke-dasharray: 10 12 18 14 14 12 !important;
                        animation: macro-shore-breathe 2.8s ease-in-out infinite !important;
                        pointer-events: none !important;
                        will-change: stroke-width, opacity !important;
                    }
                    @keyframes macro-shore-breathe {
                        0%, 100% { opacity: 0.20; stroke-width: 1.0px; }
                        45% { opacity: 0.92; stroke-width: 2.6px; }
                        70% { opacity: 0.55; stroke-width: 1.7px; }
                    }
                \`;
            })()`
        });

        await sleep(300);
        const shotDist = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_margin_tau545.png', Buffer.from(shotDist.data, 'base64'));

        const benchDist = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Tau 0.545 with Dash Margins River Walk:", benchDist.result.value.avgFps.toFixed(1), "FPS | Jank:", benchDist.result.value.jankFramesCount);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

