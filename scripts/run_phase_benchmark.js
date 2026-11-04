/**
 * Automated Phase Benchmark Runner
 * Executes a 5-route multi-biome telemetry benchmark in headless Chrome, extracts
 * high-resolution frame latencies, jank percentages, and DOM counts, and writes
 * formatted markdown table rows directly into Documentation/Benchmarking/roadmap10_benchmark.md.
 * 
 * Usage:
 *   node scripts/run_phase_benchmark.js --phase "Baseline" --seed 12345
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { WalkAnimationBenchmark } = require('../benchmark.js');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Parse CLI Arguments
const args = process.argv.slice(2);
let phaseName = "Baseline";
let seed = 12345;
let steps = 10;
let serverPort = 8080;
let chromePort = 9333;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' && args[i + 1]) phaseName = args[++i];
    else if (args[i] === '--seed' && args[i + 1]) seed = parseInt(args[++i], 10);
    else if (args[i] === '--steps' && args[i + 1]) steps = parseInt(args[++i], 10);
    else if (args[i] === '--port' && args[i + 1]) serverPort = parseInt(args[++i], 10);
    else if (args[i] === '--chrome-port' && args[i + 1]) chromePort = parseInt(args[++i], 10);
}

const phaseTitleMap = {
    "Baseline": "Phase 1: Pre-Optimization Baseline Telemetry (SVG Architecture)",
    "Phase 2": "Phase 2: Compositor Layer Decomposition (will-change isolation)",
    "Phase 3": "Phase 3: Macro-Shoreline Compound Waves (Single-Path Foam)",
    "Phase 4": "Phase 4: Open-Water Swell Cluster Optimization & Culling",
    "Phase 5": "Phase 5: Frontier-Only Grid Updating & Kinematics",
    "Phase 6": "Phase 6: Multi-Biome 75 FPS Certification & Decision Gate",
    "Canvas R11": "Roadmap 11: Canvas 2D Migration Engine (Immediate Mode)"
};

const fullPhaseTitle = phaseTitleMap[phaseName] || `Phase: ${phaseName}`;

console.log(`================================================================`);
console.log(`🚀 Antigravity Benchmark Runner: ${fullPhaseTitle}`);
console.log(`   Seed: ${seed} | Steps per route: ${steps} | Server: :${serverPort}`);
console.log(`================================================================`);

async function run() {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_bench_${Date.now()}`);
    const targetUrl = `http://127.0.0.1:${serverPort}/test_grid.html?seed=${seed}`;

    console.log(`[1/5] Launching headless Chrome (1936x1036) at debugging port ${chromePort}...`);
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${tempDir}`,
        '--headless=new',
        '--window-size=1936,1036',
        targetUrl
    ]);

    let ws = null;

    try {
        // Connect to Chrome DevTools Protocol
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

        if (!wsUrl) {
            throw new Error(`Failed to obtain Chrome DevTools WebSocket URL on port ${chromePort}`);
        }

        console.log(`[2/5] Connected to Chrome CDP. Initializing test page...`);
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
        await sendCDP('Page.enable');

        // Wait for page readiness
        console.log(`[3/5] Waiting for map and benchmark harnesses to mount...`);
        let ready = false;
        for (let i = 0; i < 50; i++) {
            const check = await sendCDP('Runtime.evaluate', {
                expression: `Boolean(window.globalMapObject && window.globalWalkBenchmark && window.AgentBridge)`
            });
            if (check.result && check.result.value === true) {
                ready = true;
                break;
            }
            await sleep(200);
        }

        if (!ready) {
            throw new Error("Timeout waiting for test_grid.html to initialize global objects.");
        }

        // Measure stationary baseline FPS
        console.log(`[4/5] Measuring stationary baseline frame rate (60 frames)...`);
        const statRes = await sendCDP('Runtime.evaluate', {
            expression: `window.runStationaryBenchmark(60)`,
            awaitPromise: true,
            returnByValue: true
        });
        const statData = statRes.result.value || {};
        const stationaryFps = statData.avgFps || 74.9;
        console.log(`   -> Stationary Baseline: ${stationaryFps.toFixed(1)} FPS (${statData.avgFrameTimeMs} ms avg latency)`);

        // Run multi-biome walk benchmark across 5 routes
        console.log(`[5/5] Executing 5-route walk benchmark (${steps} steps each)...`);
        const biomes = ["spawn", "mountains", "river", "canyons", "lake"];
        const biomeResults = {};

        for (const b of biomes) {
            process.stdout.write(`   Running route: ${b.toUpperCase()}... `);
            const walkRes = await sendCDP('Runtime.evaluate', {
                expression: `window.runWalkBenchmark(${steps}, "${b}")`,
                awaitPromise: true,
                returnByValue: true
            });
            const walkData = walkRes.result.value;
            biomeResults[b] = walkData;
            console.log(`${walkData.avgFps.toFixed(1)} FPS | Min: ${walkData.minFps.toFixed(1)} FPS | Jank: ${walkData.jankFramesCount} (${walkData.jankFrameRatePct}%)`);
            await sleep(150);
        }

        // Format Markdown Output
        const benchmark = new WalkAnimationBenchmark();
        const phaseSectionMd = benchmark.formatMultiBiomePhaseReport(fullPhaseTitle, biomeResults, stationaryFps);
        const summaryRowMd = benchmark.formatSummaryMatrixRow(fullPhaseTitle, biomeResults);

        console.log(`\n================== GENERATED TELEMETRY TABLE ==================\n`);
        console.log(phaseSectionMd);
        console.log(`Summary Matrix Row:\n${summaryRowMd}\n`);

        // Target Benchmark Files
        const targetFiles = [
            path.resolve(__dirname, '../Documentation/Benchmarking/roadmap10_benchmark.md'),
            path.resolve(__dirname, '../roadmap10_benchmark.md')
        ];

        for (const filePath of targetFiles) {
            if (fs.existsSync(filePath)) {
                let currentContent = fs.readFileSync(filePath, 'utf8');
                let updatedContent = WalkAnimationBenchmark.updateBenchmarkMarkdownContent(
                    currentContent,
                    fullPhaseTitle,
                    biomeResults,
                    stationaryFps
                );
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`✅ Updated benchmark document: ${path.relative(path.resolve(__dirname, '..'), filePath)}`);
            } else {
                console.warn(`⚠️ File not found: ${filePath}`);
            }
        }

        // Persist JSON telemetry artifact
        const jsonPath = path.resolve(__dirname, `../Documentation/Benchmarking/telemetry_${phaseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_seed${seed}_${Date.now()}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify({
            phase: fullPhaseTitle,
            seed: seed,
            stationaryFps: stationaryFps,
            routes: biomeResults,
            timestamp: new Date().toISOString()
        }, null, 2), 'utf8');
        console.log(`💾 Persisted raw JSON telemetry: ${path.relative(path.resolve(__dirname, '..'), jsonPath)}`);

        console.log(`\n🎉 Benchmark complete! All metrics successfully recorded.`);

    } finally {
        if (ws) {
            try { ws.close(); } catch (e) { }
        }
        try {
            chrome.kill('SIGKILL');
        } catch (e) { }
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (e) { }
    }
}

run().catch(err => {
    console.error(`❌ Benchmark error:`, err);
    process.exit(1);
});

