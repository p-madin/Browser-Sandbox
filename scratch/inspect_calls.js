const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9340;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function inspectCalls() {
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

        // Instrument updateGrid and updateGridFrontier and updateGridFull
        const logData = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const calls = [];
                const g = window.globalGridObject;
                const origFrontier = g.updateGridFrontier;
                const origFull = g.updateGridFull;

                g.updateGridFrontier = function(...args) {
                    const t0 = performance.now();
                    const r = origFrontier.apply(this, args);
                    const t1 = performance.now();
                    calls.push({ type: 'frontier', duration: (t1 - t0).toFixed(3), dx: args[2], dy: args[3], inter: args[1] });
                    return r;
                };

                g.updateGridFull = function(...args) {
                    const t0 = performance.now();
                    const r = origFull.apply(this, args);
                    const t1 = performance.now();
                    calls.push({ type: 'full', duration: (t1 - t0).toFixed(3), inter: args[1] });
                    return r;
                };

                return window.runWalkBenchmark(10, "spawn").then(bench => {
                    return { calls, benchAvgFps: bench.avgFps.toFixed(1) };
                });
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Logged updateGrid calls during 10-step walk:", JSON.stringify(logData.result.value, null, 2));
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

inspectCalls().catch(console.error);

