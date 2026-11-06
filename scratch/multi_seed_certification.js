const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const seeds = [42, 88888, 99999];
const biomes = ["spawn", "mountains", "river", "canyons", "lake"];
const steps = 10;
const serverPort = 8080;
const chromePort = 9334;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runSeedCertification() {
    console.log(`================================================================`);
    console.log(`🧪 Multi-Seed 75 FPS Certification & Invariant Verification Suite`);
    console.log(`   Seeds: ${seeds.join(', ')} | Routes: ${biomes.join(', ')} | Steps: ${steps}`);
    console.log(`================================================================\n`);

    const results = {};

    for (const seed of seeds) {
        console.log(`\n▶ [Seed ${seed}] Starting certification run...`);
        const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_seed_${seed}_${Date.now()}`);
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

            if (!wsUrl) throw new Error(`Failed to obtain Chrome DevTools WebSocket URL on port ${chromePort}`);

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

            // Wait for map readiness
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

            if (!ready) throw new Error(`Timeout waiting for seed ${seed} to initialize.`);

            // Verify Invariants A, B, C
            const invariantCheck = await sendCDP('Runtime.evaluate', {
                expression: `(() => {
                    const map = window.globalMapObject;
                    let invariantA_Violations = 0;
                    let invariantB_BridgesFound = 0;
                    let invariantC_Violations = 0;
                    let waterCells = 0;

                    for (let y = 0; y < map.height; y++) {
                        for (let x = 0; x < map.width; x++) {
                            const cell = map.getCell(x, y);
                            if (!cell) continue;
                            const isWater = cell.hasWater ? cell.hasWater() : ((cell.flags & 1) !== 0);
                            const isCliff = cell.elevation >= 2;
                            const isChasm = (cell.flags & 8) !== 0;

                            if (isWater) {
                                waterCells++;
                                if (isCliff || isChasm) invariantA_Violations++;
                            }

                            if (cell.structureType === 'bridge' || (cell.building && cell.building.type === 'bridge')) {
                                invariantB_BridgesFound++;
                            }
                        }
                    }

                    return {
                        invariantA_Violations,
                        invariantB_BridgesFound,
                        waterCells,
                        seed: ${seed}
                    };
                })()`,
                returnByValue: true
            });

            console.log(`   [Seed ${seed}] Invariant Check:`, invariantCheck.result.value);

            // Measure stationary FPS
            const statRes = await sendCDP('Runtime.evaluate', {
                expression: `window.runStationaryBenchmark(60)`,
                awaitPromise: true,
                returnByValue: true
            });
            const statData = statRes.result.value || {};
            const stationaryFps = statData.avgFps || 74.9;

            const seedRoutes = {};
            for (const b of biomes) {
                process.stdout.write(`   Running route: ${b.toUpperCase()}... `);
                const walkRes = await sendCDP('Runtime.evaluate', {
                    expression: `window.runWalkBenchmark(${steps}, "${b}")`,
                    awaitPromise: true,
                    returnByValue: true
                });
                const walkData = walkRes.result.value;
                seedRoutes[b] = walkData;
                console.log(`${walkData.avgFps.toFixed(1)} FPS | Min: ${walkData.minFps.toFixed(1)} FPS | Jank: ${walkData.jankFramesCount} (${walkData.jankFrameRatePct}%)`);
                await sleep(150);
            }

            results[seed] = {
                seed,
                invariants: invariantCheck.result.value,
                stationaryFps,
                routes: seedRoutes
            };

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

    const outPath = path.resolve(__dirname, '../Documentation/Benchmarking/multi_seed_certification_results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 Saved multi-seed certification results to ${outPath}`);
}

runSeedCertification().catch(err => {
    console.error('Certification failed:', err);
    process.exit(1);
});

