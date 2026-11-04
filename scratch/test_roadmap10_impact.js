const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_eval_${Date.now()}`);
    const targetUrl = `http://127.0.0.1:8080/test_grid.html?seed=12345`;

    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${tempDir}`,
        '--headless=new',
        '--window-size=1936,1036',
        targetUrl
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

        if (!wsUrl) throw new Error("Could not connect to Chrome CDP");

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
        await sleep(2000);

        console.log("=== EMPIRICAL IMPACT EVALUATION FOR ROADMAP 10 PHASES ===\n");

        // 1. Baseline River
        let res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        let d = res.result.value;
        console.log(`[Baseline] RIVER: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 2. Baseline Mountains
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "mountains")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Baseline] MOUNTAINS: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 3. Phase 2 Simulation: Promote static terrain layer to will-change: transform
        await send('Runtime.evaluate', {
            expression: `
                const st = document.getElementById("world_terrain_paths");
                if (st) {
                    st.style.willChange = "transform";
                    st.style.contain = "strict";
                    st.style.pointerEvents = "none";
                }
            `
        });
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "mountains")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Phase 2 - will-change isolation] MOUNTAINS: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 4. Phase 3 Simulation: Disable the 451 reticle wave animations in River
        await send('Runtime.evaluate', {
            expression: `
                const s = document.createElement("style");
                s.textContent = ".reticle_wave_edge { animation: none !important; }";
                document.head.appendChild(s);
            `
        });
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Phase 3 - Macro Shore Waves] RIVER: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 5. Phase 4 Simulation: Culling swell animations on Lake
        await send('Runtime.evaluate', {
            expression: `
                const s2 = document.createElement("style");
                s2.textContent = ".pure_wave_swell { animation: none !important; }";
                document.head.appendChild(s2);
            `
        });
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "lake")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Phase 4 - Open-Water Swell Culling] LAKE: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 6. Phase 5 Simulation: Frontier-Only updateGrid on Spawn
        await send('Runtime.evaluate', {
            expression: `
                globalGridObject.updateGrid = function() {
                    const t0 = performance.now();
                    while(performance.now() - t0 < 0.6) {}
                };
            `
        });
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "spawn")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Phase 5 - Frontier-Only Grid Diffing] SPAWN: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        // 7. Combined Full Optimization on River (Phase 2 + 3 + 5)
        res = await send('Runtime.evaluate', {
            expression: `window.runWalkBenchmark(10, "river")`,
            awaitPromise: true,
            returnByValue: true
        });
        d = res.result.value;
        console.log(`[Full Stack Phases 2+3+5 Combined] RIVER: ${d.avgFps.toFixed(1)} FPS | Frame: ${d.avgFrameTimeMs}ms | Jank: ${d.jankFramesCount} (${d.jankFrameRatePct}%) | Max Spike: ${d.maxFrameTimeMs}ms`);

        ws.close();
    } finally {
        try { chrome.kill(); } catch (e) { }
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
    }
}

main().catch(console.error);