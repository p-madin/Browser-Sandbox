const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9345;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function verify() {
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

        // Wait for grid to be ready
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

        // Inspect DOM for pure waves at Lake
        const domInfo = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const uses = Array.from(document.querySelectorAll('use')).filter(u => {
                    const h = u.getAttribute('href') || '';
                    return h.startsWith('#symbol_pure_wave') && u.style.display !== 'none';
                });

                const phaseCounts = { 0: 0, 1: 0, 2: 0, 3: 0, other: 0 };
                const distances = [];
                const g = window.globalGridObject;

                uses.forEach(u => {
                    const href = u.getAttribute('href');
                    const phase = href.replace('#symbol_pure_wave_', '');
                    if (phaseCounts[phase] !== undefined) phaseCounts[phase]++;
                    else phaseCounts.other++;

                    const x = parseFloat(u.getAttribute('x'));
                    const y = parseFloat(u.getAttribute('y'));
                    const cellI = Math.round(x / g.cell_size);
                    const cellJ = Math.round(y / g.cell_size);
                    const di = cellI - g.grid_mid_x;
                    const dj = cellJ - g.grid_mid_y;
                    const dist = Math.sqrt(di * di + dj * dj);
                    distances.push(dist);
                });

                const maxDist = distances.length > 0 ? Math.max(...distances) : 0;

                return {
                    activeVisiblePureWaves: uses.length,
                    phaseCounts,
                    maxDistTiles: maxDist.toFixed(1),
                    withinRadius16: maxDist <= 16.0
                };
            })()`,
            returnByValue: true
        });

        console.log("Lake DOM Inspection Result:", JSON.stringify(domInfo.result.value, null, 2));

        // Now run a quick walk benchmark on lake
        console.log("\nRunning 10-step walk on Lake...");
        const walkRes = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "lake")`,
            awaitPromise: true,
            returnByValue: true
        });
        const d = walkRes.result.value;
        console.log(`Lake Walk Result: ${d.avgFps.toFixed(1)} FPS | Min: ${d.minFps.toFixed(1)} FPS | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%)`);

        ws.close();
    } finally {
        chrome.kill('SIGKILL');
    }
}

verify().catch(console.error);
