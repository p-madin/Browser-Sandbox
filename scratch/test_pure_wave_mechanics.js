const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9347;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_pw_${Date.now()}`);
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
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Center on lake
        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                const bench = window.globalWalkBenchmark;
                const lake = bench.routes.lake;
                window.globalGridObject.center_on_cell(lake.start.x, lake.start.y);
                await new Promise(r => setTimeout(r, 600));
            })()`,
            awaitPromise: true
        });

        // Inspect pure wave elements in DOM
        const inspectRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const uses = document.querySelectorAll('use[href*="pure_wave"]');
                const count = uses.length;
                const first = uses[0];
                const shadow = first ? first.shadowRoot : null;
                const computed = first ? window.getComputedStyle(first) : null;
                return {
                    count,
                    firstClass: first ? first.getAttribute("class") : null,
                    firstDelay: first ? first.style.animationDelay : null,
                    animNameOnUse: computed ? computed.animationName : null,
                    animDelayOnUse: computed ? computed.animationDelay : null
                };
            })()`,
            returnByValue: true
        });
        console.log("Pure wave inspection:", inspectRes.result.value);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

