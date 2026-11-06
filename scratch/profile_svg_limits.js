const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const serverPort = 8080;
const chromePort = 9336;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function profileSvgLimits() {
    console.log(`================================================================`);
    console.log(`🔬 Empirical Analysis of SVG Retained-Mode Architecture Limits`);
    console.log(`================================================================\n`);

    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_svg_limits_${Date.now()}`);
    const targetUrl = `http://127.0.0.1:${serverPort}/test_grid.html?seed=12345`;

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

        if (!wsUrl) throw new Error(`Failed to obtain WebSocket URL`);

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

        await sendCDP('Runtime.enable');
        await sendCDP('DOM.enable');
        await sendCDP('Performance.enable');

        // Wait for page ready
        for (let i = 0; i < 50; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark)`
            });
            if (check.result && check.result.value === true) break;
            await sleep(200);
        }

        // Measure DOM architecture stats across biomes
        const biomesToInspect = ["spawn", "mountains", "river", "canyons", "lake"];
        const biomeLimits = {};

        for (const b of biomesToInspect) {
            // Teleport agent to route start
            await sendCDP('Runtime.evaluate', {
                expression: `(() => {
                    const bm = window.globalWalkBenchmark;
                    const route = bm.routes["${b}"];
                    window.agent.x = route.start.x;
                    window.agent.y = route.start.y;
                    window.globalGridObject.updateGrid(window.agent, true);
                })()`
            });
            await sleep(300);

            const stats = await sendCDP('Runtime.evaluate', {
                expression: `(() => {
                    const frame = document.getElementById('frame');
                    const allEls = frame.getElementsByTagName('*');
                    const useEls = frame.getElementsByTagName('use');
                    const pathEls = frame.getElementsByTagName('path');
                    const gEls = frame.getElementsByTagName('g');
                    const defs = frame.querySelector('defs');
                    const defChildren = defs ? defs.children.length : 0;

                    // Compute total SVG Path length/points
                    let totalPathLengthChars = 0;
                    for (let p of pathEls) {
                        const d = p.getAttribute('d');
                        if (d) totalPathLengthChars += d.length;
                    }

                    // Count active animating wave elements
                    const swells = frame.querySelectorAll('.pure_wave_active, [class*="pure_wave_phase"]');
                    const animatedFoam = frame.querySelectorAll('.macro_wave_foam_animated');

                    // Layer breakdown
                    const layers = {};
                    const topGroups = frame.querySelectorAll(':scope > g');
                    topGroups.forEach(g => {
                        layers[g.id || 'unnamed'] = {
                            children: g.children.length,
                            willChange: window.getComputedStyle(g).willChange,
                            display: window.getComputedStyle(g).display
                        };
                    });

                    const mem = window.performance && window.performance.memory ? {
                        usedJSHeapSizeMB: +(window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
                        totalJSHeapSizeMB: +(window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)
                    } : null;

                    return {
                        totalSvgElements: allEls.length,
                        useElementsCount: useEls.length,
                        pathElementsCount: pathEls.length,
                        groupElementsCount: gEls.length,
                        defsSymbolCount: defChildren,
                        totalPathLengthChars,
                        activeAnimatingSwells: swells.length,
                        activeAnimatedFoamPaths: animatedFoam.length,
                        layers,
                        memory: mem
                    };
                })()`,
                returnByValue: true
            });

            biomeLimits[b] = stats.result.value;
        }

        console.log(`DOM Architecture Inspection Results:`);
        console.log(JSON.stringify(biomeLimits, null, 2));

        const outPath = path.resolve(__dirname, '../Documentation/Benchmarking/svg_architecture_limits.json');
        fs.writeFileSync(outPath, JSON.stringify(biomeLimits, null, 2), 'utf8');
        console.log(`\n💾 Saved SVG architecture limits report to: ${outPath}`);

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

profileSvgLimits().catch(err => {
    console.error('Profiling error:', err);
    process.exit(1);
});

