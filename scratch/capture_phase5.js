const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9338;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function capture() {
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

        // 1. Spawn shot
        await sendCDP('Runtime.evaluate', { expression: `AgentBridge.teleportToBiome("spawn");` });
        await sleep(800);
        const spawnShot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\PCAdmin\\.gemini\\antigravity\\brain\\14c16049-e7fe-4e8c-92c6-9f4cd47166dd\\phase5_verified_spawn.png', Buffer.from(spawnShot.data, 'base64'));

        // 2. River shot
        await sendCDP('Runtime.evaluate', { expression: `AgentBridge.teleportToBiome("river");` });
        await sleep(800);
        const riverShot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\PCAdmin\\.gemini\\antigravity\\brain\\14c16049-e7fe-4e8c-92c6-9f4cd47166dd\\phase5_verified_river.png', Buffer.from(riverShot.data, 'base64'));

        // 3. Mountains shot
        await sendCDP('Runtime.evaluate', { expression: `AgentBridge.teleportToBiome("mountains");` });
        await sleep(800);
        const mtnShot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\PCAdmin\\.gemini\\antigravity\\brain\\14c16049-e7fe-4e8c-92c6-9f4cd47166dd\\phase5_verified_mountains.png', Buffer.from(mtnShot.data, 'base64'));

        console.log("Captured all 3 Phase 5 verification screenshots!");
        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

capture().catch(console.error);

