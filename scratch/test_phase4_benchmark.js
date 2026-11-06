const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePort = 9349;
const serverPort = 8080;
const seed = 12345;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_p4b_${Date.now()}`);
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

        // Measure Lake route BEFORE Phase 4
        console.log("Measuring Lake Walk BEFORE Phase 4...");
        const preLake = await sendCDP('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "lake")`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("Pre-Phase 4 Lake:", preLake.result.value.avgFps.toFixed(1), "FPS | Jank:", preLake.result.value.jankFramesCount, `(${preLake.result.value.jankFrameRatePct}%)`);

        // Inject Phase 4: 4 Harmonic Wave Symbols in defs + Distance Culling
        const patchRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                const svg = document.getElementById("frame");
                const defs = svg.querySelector("defs");

                // Create 4-phase harmonic wave symbols
                for (let p = 0; p < 4; p++) {
                    let sym = document.getElementById("symbol_pure_wave_" + p);
                    if (!sym) {
                        sym = document.createElementNS("http://www.w3.org/2000/svg", "g");
                        sym.setAttribute("id", "symbol_pure_wave_" + p);
                        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        path.setAttribute("class", "pure_wave pure_wave_phase_" + p);
                        path.setAttribute("d", "M 3 10 Q 7 7.5 11 10 Q 15 12.5 19 10");
                        sym.appendChild(path);
                        defs.appendChild(sym);
                    }
                }

                // Add CSS for 4-phase harmonic delays
                let style = document.getElementById("p4_style");
                if (!style) {
                    style = document.createElement("style");
                    style.id = "p4_style";
                    document.head.appendChild(style);
                }
                style.textContent = \`
                    .pure_wave {
                        will-change: transform, opacity !important;
                    }
                    .pure_wave_phase_0 { animation-delay: 0.0s !important; }
                    .pure_wave_phase_1 { animation-delay: -1.75s !important; }
                    .pure_wave_phase_2 { animation-delay: -3.50s !important; }
                    .pure_wave_phase_3 { animation-delay: -5.25s !important; }
                \`;

                // Patch gridObject prototype / instance updateGrid for pure waves
                const g = window.globalGridObject;
                const PURE_WAVE_SYMBOLS = [
                    "#symbol_pure_wave_0",
                    "#symbol_pure_wave_1",
                    "#symbol_pure_wave_2",
                    "#symbol_pure_wave_3"
                ];
                window.PURE_WAVE_SYMBOLS = PURE_WAVE_SYMBOLS;

                // Test applying distance culling & 4-phase symbols directly
                let activeSwells = 0;
                for (let k = 0; k < g.slot_reticle_state.length; k++) {
                    const rk = g.slot_reticle_state[k];
                    if ((rk & 0x8000) !== 0) {
                        const i = Math.floor(k / g.cell_size_y);
                        const j = k % g.cell_size_y;
                        const di = i - g.grid_mid_x;
                        const dj = j - g.grid_mid_y;
                        if ((di * di + dj * dj) > 256) {
                            g.hideSymbolInstance(g.reticle_elements, k);
                            g.slot_reticle_state[k] = 0;
                        } else {
                            activeSwells++;
                        }
                    }
                }
                return { activeSwells };
            })()`,
            returnByValue: true
        });
        console.log("Patch status:", patchRes.result.value);

    } finally {
        if (ws) ws.close();
        chrome.kill('SIGKILL');
    }
}

run().catch(console.error);
