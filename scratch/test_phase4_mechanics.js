const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9348;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_p4_${Date.now()}`);
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

        // Test in Chrome: does animation-delay: inherit work inside <use>?
        const inheritTest = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                // Check if animation-delay: inherit on symbol child inherits from <use>
                const svg = document.getElementById("frame");
                const defs = svg.querySelector("defs");

                const testSym = document.createElementNS("http://www.w3.org/2000/svg", "g");
                testSym.id = "test_sym";
                const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
                p.setAttribute("d", "M 0 0 L 10 10");
                p.style.animation = "pure-wave-swell 7s infinite";
                p.style.animationDelay = "inherit";
                testSym.appendChild(p);
                defs.appendChild(testSym);

                const useEl = document.createElementNS("http://www.w3.org/2000/svg", "use");
                useEl.setAttribute("href", "#test_sym");
                useEl.style.animationDelay = "-3.5s";
                svg.appendChild(useEl);

                // Check shadow root child computed style
                const shadowP = useEl.shadowRoot ? useEl.shadowRoot.querySelector("path") : null;
                const computed = shadowP ? window.getComputedStyle(shadowP).animationDelay : null;

                useEl.remove();
                testSym.remove();

                return {
                    hasShadowRoot: Boolean(useEl.shadowRoot),
                    childComputedDelay: computed
                };
            })()`,
            returnByValue: true
        });
        console.log("Inherit test:", inheritTest.result.value);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);

