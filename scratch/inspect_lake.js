const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9345;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function inspectLake() {
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

        // Wait for grid
        for (let i = 0; i < 40; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.globalGridObject && window.AgentBridge)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Teleport to Lake
        await sendCDP('Runtime.evaluate', {
            expression: `(async () => {
                AgentBridge.teleportToBiome("lake");
                await new Promise(r => setTimeout(r, 600));
            })()`,
            awaitPromise: true
        });

        // Inspect layers & elements
        const layerStats = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const g = window.globalGridObject;
                const stats = {};
                const layers = [
                    ['layer_static_terrain', g.layer_static_terrain],
                    ['layer_interactive_tiles', g.layer_interactive_tiles],
                    ['layer_shadows', g.layer_shadows],
                    ['layer_dynamic_structures', g.layer_dynamic_structures],
                    ['reticles_layer', g.reticles_layer],
                    ['features_layer', g.features_layer],
                    ['path_shoreline_waves', document.getElementById('path_shoreline_waves')]
                ];
                layers.forEach(([name, el]) => {
                    if (!el) {
                        stats[name] = 'null';
                    } else {
                        stats[name] = {
                            childCount: el.childElementCount,
                            display: el.style.display || window.getComputedStyle(el).display,
                            willChange: el.style.willChange || window.getComputedStyle(el).willChange
                        };
                    }
                });

                // Check active animating elements
                const animElements = [];
                document.querySelectorAll('*').forEach(el => {
                    const cs = window.getComputedStyle(el);
                    if (cs.animationName && cs.animationName !== 'none') {
                        animElements.push({
                            tag: el.tagName,
                            id: el.id,
                            cls: el.getAttribute('class'),
                            anim: cs.animationName,
                            vis: cs.display
                        });
                    }
                });

                return { stats, animCount: animElements.length, animElements: animElements.slice(0, 15) };
            })()`,
            returnByValue: true
        });

        console.log("Lake Layer & Animation Stats:", JSON.stringify(layerStats.result.value, null, 2));

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

inspectLake().catch(console.error);

