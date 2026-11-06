const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9339;
const serverPort = 8080;
const seed = 12345;
const brainDir = 'C:\\Users\\PCAdmin\\.gemini\\antigravity\\brain\\14c16049-e7fe-4e8c-92c6-9f4cd47166dd';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function capture() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_p6_${Date.now()}`);
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${tempDir}`,
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

        const biomes = [
            { name: "spawn", file: "phase6_verified_spawn.png" },
            { name: "river", file: "phase6_verified_river.png" },
            { name: "canyons", file: "phase6_verified_canyons.png" },
            { name: "lake", file: "phase6_verified_lake.png" }
        ];

        for (const b of biomes) {
            await sendCDP('Runtime.evaluate', { expression: `AgentBridge.teleportToBiome("${b.name}");` });
            await sleep(800);
            const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(brainDir, b.file), Buffer.from(shot.data, 'base64'));
            console.log(`Saved ${b.file}`);
        }

        console.log("Captured all Phase 6 certification screenshots!");
    } finally {
        if (ws) {
            try { ws.close(); } catch (e) { }
        }
        try { chrome.kill('SIGKILL'); } catch (e) { }
        try {
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) { }
    }
}

capture().catch(console.error);

