const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9346;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_blur_${Date.now()}`);
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

        // Test with current settings (WITH blur(1px))
        console.log("Measuring River Walk WITH blur(1px)...");
        const benchWithBlur = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("With blur(1px):", benchWithBlur.result.value.avgFps.toFixed(1), "FPS | Jank:", benchWithBlur.result.value.jankFramesCount);

        // Test WITHOUT blur(1px)
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const el = document.getElementById("path_shoreline_waves");
                if (el) el.style.filter = "none";
            })()`
        });

        console.log("Measuring River Walk WITHOUT blur(1px)...");
        const benchWithoutBlur = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Without blur:", benchWithoutBlur.result.value.avgFps.toFixed(1), "FPS | Jank:", benchWithoutBlur.result.value.jankFramesCount);

        // Test Spawn with and without blur
        const benchSpawnNoBlur = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "spawn")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Spawn Without blur:", benchSpawnNoBlur.result.value.avgFps.toFixed(1), "FPS | Jank:", benchSpawnNoBlur.result.value.jankFramesCount);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

