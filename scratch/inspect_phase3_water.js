const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9336;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_test_${Date.now()}`);
    const targetUrl = `http://127.0.0.1:${serverPort}/test_grid.html?seed=${seed}`;

    console.log("Launching headless Chrome...");
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

        if (!wsUrl) throw new Error("Could not find Chrome CDP target");

        console.log("Connecting WebSocket...");
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
        let ready = false;
        for (let i = 0; i < 50; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.globalGridObject.terrainPathService)`
            });
            if (check.result && check.result.value === true) {
                ready = true;
                break;
            }
            await sleep(200);
        }

        // Select river route
        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                const bench = window.globalWalkBenchmark;
                const river = bench.routes.river;
                // Move player to start of river route
                window.globalGridObject.center_on_cell(river.start.x, river.start.y);
                await new Promise(r => setTimeout(r, 400));
            })()`,
            awaitPromise: true
        });

        const evalRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                try {
                    const g = window.globalGridObject;
                    const tps = g.terrainPathService;
                    const m = window.globalMapObject;
                    const bench = window.globalWalkBenchmark;

                    // Telemetry counts
                    const waterReticles = document.querySelectorAll('use[href*="_water"]').length;
                    const pureWaves = document.querySelectorAll('use[href*="pure_wave"]').length;
                    const allReticles = document.querySelectorAll('use[href*="symbol_reticle"]').length;

                    const CellFlagsRef = window.CellFlags;
                    const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

                    const fWater = tps.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
                    const bWater = tps.gaussianBlur(fWater);
                    const path50 = tps.extractPath(bWater, 0.50, 0);
                    const path54 = tps.extractPath(bWater, 0.54, 0.4);
                    const path56 = tps.extractPath(bWater, 0.56, 0.4);

                    return JSON.stringify({
                        waterReticles,
                        pureWaves,
                        allReticles,
                        path50Len: path50.length,
                        path54Len: path54.length,
                        path56Len: path56.length,
                        path56Sample: path56.slice(0, 150)
                    });
                } catch(err) {
                    return JSON.stringify({ error: err.message, stack: err.stack });
                }
            })()`
        });

        console.log("Evaluation Result:", JSON.parse(evalRes.result.value));

        // Take a screenshot of the River Crossing route
        const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/phase3_baseline_river.png', Buffer.from(shot.data, 'base64'));
        console.log("Saved phase3_baseline_river.png");

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);
