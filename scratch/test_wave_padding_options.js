const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9343;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_opts_${Date.now()}`);
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

        // Center on river
        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                const bench = window.globalWalkBenchmark;
                const river = bench.routes.river;
                window.globalGridObject.center_on_cell(river.start.x, river.start.y);
                await new Promise(r => setTimeout(r, 400));
            })()`,
            awaitPromise: true
        });

        // -------------------------------------------------------------
        // OPTION 1: Wider Negative Space Margin in Dasharray (Cleaner, distinct wave crests)
        // -------------------------------------------------------------
        console.log("Testing Option 1: Negative Space Dash Padding...");
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                let styleEl = document.getElementById("opt_style");
                if (!styleEl) {
                    styleEl = document.createElement("style");
                    styleEl.id = "opt_style";
                    document.head.appendChild(styleEl);
                }
                // Wide dash gap (margin) between wave crests
                styleEl.textContent = \`
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.92) !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                        stroke-dasharray: 10 14 18 16 12 18 !important;
                        animation: macro-shore-breathe 2.8s ease-in-out infinite !important;
                        pointer-events: none !important;
                        will-change: stroke-width, opacity !important;
                    }
                    @keyframes macro-shore-breathe {
                        0%, 100% { opacity: 0.20; stroke-width: 1.0px; }
                        45% { opacity: 0.95; stroke-width: 2.6px; }
                        70% { opacity: 0.50; stroke-width: 1.6px; }
                    }
                \`;
            })()`
        });
        await sleep(300);
        const shot1 = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_opt1_dash_margin.png', Buffer.from(shot1.data, 'base64'));

        // Benchmark Option 1
        const bench1 = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("   Option 1 River Walk:", bench1.result.value.avgFps.toFixed(1), "FPS | Jank:", bench1.result.value.jankFramesCount);

        // -------------------------------------------------------------
        // OPTION 2: Dual Concentric Waves (Inner Foam + Outer Swell with physical water margin)
        // Both in 1 single compound path!
        // -------------------------------------------------------------
        console.log("Testing Option 2: Dual Concentric Wave Crests (Physical Water Margin in 1 Path)...");
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                const CellFlagsRef = window.CellFlags;
                const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

                const fWater = tps.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
                const bWater = tps.gaussianBlur(fWater);
                // Inner contour at tau=0.525, outer contour at tau=0.575 (separated by ~3.5px margin)
                const dInner = tps.extractPath(bWater, 0.525, 0.35);
                const dOuter = tps.extractPath(bWater, 0.575, 0.40);
                const dDual = dInner + " " + dOuter;

                const waveEl = document.getElementById("path_shoreline_waves");
                if (waveEl) waveEl.setAttribute("d", dDual);

                const styleEl = document.getElementById("opt_style");
                styleEl.textContent = \`
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.88) !important;
                        stroke-linecap: round !important;
                        stroke-linejoin: round !important;
                        stroke-dasharray: 12 10 20 12 16 10 !important;
                        animation: macro-shore-breathe 3.0s ease-in-out infinite !important;
                        pointer-events: none !important;
                        will-change: stroke-width, opacity !important;
                    }
                    @keyframes macro-shore-breathe {
                        0%, 100% { opacity: 0.20; stroke-width: 1.0px; }
                        45% { opacity: 0.90; stroke-width: 2.2px; }
                        70% { opacity: 0.50; stroke-width: 1.5px; }
                    }
                \`;
            })()`
        });
        await sleep(300);
        const shot2 = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_opt2_dual_concentric.png', Buffer.from(shot2.data, 'base64'));

        // Benchmark Option 2
        const bench2 = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("   Option 2 River Walk:", bench2.result.value.avgFps.toFixed(1), "FPS | Jank:", bench2.result.value.jankFramesCount);

        // -------------------------------------------------------------
        // OPTION 3: Layered Foam Underlay (Dual Stroke Margin: Translucent foam base + crisp crest)
        // -------------------------------------------------------------
        console.log("Testing Option 3: Layered Foam Margin (Base Foam + Sharp Crest)...");
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const tps = g.terrainPathService;
                const waveContainer = document.getElementById("world_wave_paths");

                let baseEl = document.getElementById("path_shoreline_waves_base");
                if (!baseEl) {
                    baseEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    baseEl.setAttribute("id", "path_shoreline_waves_base");
                    baseEl.setAttribute("class", "macro_shoreline_base");
                    waveContainer.insertBefore(baseEl, document.getElementById("path_shoreline_waves"));
                }
                const waveEl = document.getElementById("path_shoreline_waves");
                baseEl.setAttribute("d", waveEl.getAttribute("d"));

                const styleEl = document.getElementById("opt_style");
                styleEl.textContent = \`
                    .macro_shoreline_base {
                        fill: none;
                        stroke: rgba(186, 230, 253, 0.40);
                        stroke-width: 4.5px;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        pointer-events: none;
                        animation: macro-base-breathe 3.0s ease-in-out infinite;
                        will-change: stroke-width, opacity;
                    }
                    .macro_shoreline_wave {
                        fill: none;
                        stroke: rgba(255, 255, 255, 0.95);
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        stroke-dasharray: 12 10 20 12 16 10;
                        animation: macro-crest-breathe 3.0s ease-in-out infinite;
                        pointer-events: none;
                        will-change: stroke-width, opacity;
                    }
                    @keyframes macro-base-breathe {
                        0%, 100% { opacity: 0.15; stroke-width: 2.5px; }
                        45% { opacity: 0.60; stroke-width: 5.5px; }
                        70% { opacity: 0.35; stroke-width: 3.8px; }
                    }
                    @keyframes macro-crest-breathe {
                        0%, 100% { opacity: 0.25; stroke-width: 1.0px; }
                        45% { opacity: 0.95; stroke-width: 2.2px; }
                        70% { opacity: 0.55; stroke-width: 1.5px; }
                    }
                \`;
            })()`
        });
        await sleep(300);
        const shot3 = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            clip: { x: 350, y: 180, width: 900, height: 650, scale: 1 }
        });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_opt3_layered_foam.png', Buffer.from(shot3.data, 'base64'));

        // Benchmark Option 3
        const bench3 = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("   Option 3 River Walk:", bench3.result.value.avgFps.toFixed(1), "FPS | Jank:", bench3.result.value.jankFramesCount);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

