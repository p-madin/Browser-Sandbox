const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9348;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_shot_${Date.now()}`);
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${tempDir}`,
        '--headless=new',
        '--window-size=1936,1036',
        'http://127.0.0.1:8080/test_grid.html?seed=12345'
    ]);

    try {
        let wsUrl = null;
        for (let i = 0; i < 40; i++) {
            try {
                const res = await fetch(`http://127.0.0.1:${PORT}/json`);
                const targets = await res.json();
                const page = targets.find(t => t.type === 'page' && t.url.includes('8080'));
                if (page && page.webSocketDebuggerUrl) {
                    wsUrl = page.webSocketDebuggerUrl;
                    break;
                }
            } catch (e) {}
            await sleep(150);
        }

        const ws = new WebSocket(wsUrl);
        await new Promise(r => ws.onopen = r);

        let id = 1;
        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const reqId = id++;
                const handler = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.id === reqId) {
                        ws.removeEventListener('message', handler);
                        if (msg.error) reject(msg.error);
                        else resolve(msg.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id: reqId, method, params }));
            });
        }

        await send('Runtime.enable');
        await send('Page.enable');
        await sleep(2000);

        // Teleport to spawn near houses/trees
        await send('Runtime.evaluate', {
            expression: `AgentBridge.teleport(0, 0)`
        });
        await sleep(500);

        // Capture current bug screenshot
        const shot1 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
            path.resolve('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/shadow_bug_current.png'),
            Buffer.from(shot1.data, 'base64')
        );
        console.log("Saved shadow_bug_current.png");

        // Now test moving world_shadow_paths in front of layer_interactive_tiles
        await send('Runtime.evaluate', {
            expression: `
                const shadowLayer = document.getElementById("world_shadow_paths");
                const interactiveTiles = document.getElementById("layer_interactive_tiles");
                const dynamicStructures = document.getElementById("layer_dynamic_structures");
                const worldViewport = document.getElementById("world_viewport");
                
                if (shadowLayer && dynamicStructures) {
                    // Insert shadow layer right before dynamic structures (in front of interactive tiles)
                    worldViewport.insertBefore(shadowLayer, dynamicStructures);
                    shadowLayer.style.willChange = "transform";
                    shadowLayer.style.contain = "strict";
                    shadowLayer.style.pointerEvents = "none";
                }
            `
        });
        await sleep(500);

        const shot2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
            path.resolve('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/shadow_fixed_infront_reticles.png'),
            Buffer.from(shot2.data, 'base64')
        );
        console.log("Saved shadow_fixed_infront_reticles.png");

        // Also teleport to River to inspect trees/bridges/riverbank shadows
        await send('Runtime.evaluate', {
            expression: `AgentBridge.teleportToBiome("river")`
        });
        await sleep(500);

        const shotRiverFixed = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(
            path.resolve('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/shadow_fixed_river.png'),
            Buffer.from(shotRiverFixed, 'base64')
        );
        console.log("Saved shadow_fixed_river.png");

        ws.close();
    } finally {
        try { chrome.kill(); } catch (e) {}
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
}

main().catch(console.error);

