const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9340;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function testLayerTranslation() {
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

        // Test running 10 walk steps in benchmark with standard harness to observe baseline
        const walkBaseline = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "spawn")`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Spawn Walk Baseline:", {
            avgFps: walkBaseline.result.value.avgFps.toFixed(1),
            avgUpdateGridMs: walkBaseline.result.value.avgUpdateGridMs.toFixed(2),
            maxUpdateGridMs: walkBaseline.result.value.maxUpdateGridMs.toFixed(2),
            jankFrames: walkBaseline.result.value.jankFramesCount,
            maxFrameTimeMs: walkBaseline.result.value.maxFrameTimeMs.toFixed(1)
        });

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

testLayerTranslation().catch(console.error);

