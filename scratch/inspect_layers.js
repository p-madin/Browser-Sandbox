const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9340;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_inspect_${Date.now()}`);
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
            } catch (e) { }
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
        await sleep(1500);

        const checkRes = await send('Runtime.evaluate', {
            expression: `
                const wv = document.getElementById("world_viewport");
                const lst = document.getElementById("layer_static_terrain");
                const wtp = document.getElementById("world_terrain_paths");
                const lit = document.getElementById("layer_interactive_tiles");
                const lsh = document.getElementById("layer_shadows");
                const wsp = document.getElementById("world_shadow_paths");
                const lds = document.getElementById("layer_dynamic_structures");
                
                ({
                    wv_children: Array.from(wv.children).map(c => c.id),
                    lst_children: lst ? Array.from(lst.children).map(c => c.id) : null,
                    lit_children: lit ? Array.from(lit.children).map(c => c.id) : null,
                    lsh_children: lsh ? Array.from(lsh.children).map(c => c.id) : null,
                    lsh_willChange: lsh ? window.getComputedStyle(lsh).willChange : null,
                    wsp_parent: wsp ? wsp.parentNode.id : null,
                    lds_children: lds ? Array.from(lds.children).map(c => c.id) : null
                })
            `,
            returnByValue: true
        });

        console.log("DOM Inspection:", JSON.stringify(checkRes.result.value, null, 2));

        ws.close();
    } finally {
        try { chrome.kill(); } catch (e) { }
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
    }
}

main().catch(console.error);

