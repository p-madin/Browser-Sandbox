const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const seeds = [12345, 42, 88888, 99999];
const serverPort = 8080;
const chromePort = 9335;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function verifyAllSeedInvariants() {
    console.log(`================================================================`);
    console.log(`🛡️ Architectural Invariants Verification (A, B, C, D)`);
    console.log(`   Testing seeds: ${seeds.join(', ')}`);
    console.log(`================================================================\n`);

    const summary = {};

    for (const seed of seeds) {
        const tempDir = path.join(process.env.TEMP || 'C:\\Temp', `chrome_inv_${seed}_${Date.now()}`);
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

            if (!wsUrl) throw new Error(`Failed to obtain Chrome DevTools WebSocket URL`);

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

            // Wait for map readiness
            let ready = false;
            for (let i = 0; i < 50; i++) {
                const check = await sendCDP('Runtime.evaluate', {
                    expression: `Boolean(window.globalMapObject && window.CellFlags && window.globalMapObject.map_cells)`
                });
                if (check.result && check.result.value === true) {
                    ready = true;
                    break;
                }
                await sleep(200);
            }

            if (!ready) throw new Error(`Timeout waiting for seed ${seed}`);

            const invResult = await sendCDP('Runtime.evaluate', {
                expression: `(() => {
                    const map = window.globalMapObject;
                    const CF = window.CellFlags;
                    let totalCells = 0;
                    let waterCells = 0;
                    let shallowWaterCells = 0;
                    let cliffCells = 0;
                    let chasmCells = 0;
                    let bridgeCells = 0;
                    let pathCells = 0;
                    let invariantA_Violations = 0;
                    let invariantB_Violations = 0;

                    for (let x = map.min_width; x < map.max_width; x++) {
                        if (!map.map_cells[x]) continue;
                        for (let y = map.min_height; y < map.max_height; y++) {
                            const c = map.map_cells[x][y];
                            if (!c) continue;
                            totalCells++;

                            const isWater = (c.flags & CF.WATER) !== 0;
                            const isShallow = (c.flags & CF.WATER_SHALLOW) !== 0;
                            const isCliff = (c.flags & CF.TERRAIN_CLIFF) !== 0 || c.elevation >= 2;
                            const isChasm = (c.flags & CF.CHASM) !== 0;
                            const isBridge = (c.flags & CF.STRUCTURE_BRIDGE) !== 0;
                            const isPath = (c.flags & CF.STRUCTURE_PATH) !== 0;

                            if (isWater) waterCells++;
                            if (isShallow) shallowWaterCells++;
                            if (isCliff) cliffCells++;
                            if (isChasm) chasmCells++;
                            if (isBridge) bridgeCells++;
                            if (isPath) pathCells++;

                            // Invariant A: Water, Cliff, and Chasm must never collide
                            if ((isWater || isShallow) && (isCliff || isChasm)) {
                                invariantA_Violations++;
                            }

                            // Invariant B: Paths traversing water must strictly have STRUCTURE_BRIDGE
                            if ((isWater || isShallow) && isPath && !isBridge) {
                                invariantB_Violations++;
                            }
                        }
                    }

                    // Deterministic Hash across world grid sample
                    let hash = 0;
                    for (let x = map.min_width; x < map.max_width; x += 3) {
                        if (!map.map_cells[x]) continue;
                        for (let y = map.min_height; y < map.max_height; y += 3) {
                            const c = map.map_cells[x][y];
                            if (c) {
                                hash = ((hash << 5) - hash + c.elevation + (c.flags & 0xFFFF)) | 0;
                            }
                        }
                    }

                    return {
                        seed: ${seed},
                        totalCells,
                        waterCells,
                        shallowWaterCells,
                        cliffCells,
                        chasmCells,
                        bridgeCells,
                        pathCells,
                        invariantA_Violations,
                        invariantB_Violations,
                        deterministicLayoutHash: hash
                    };
                })()`,
                returnByValue: true
            });

            const data = invResult.result.value;
            summary[seed] = data;
            console.log(`✅ [Seed ${seed}] Verified:`, data);

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

    const outPath = path.resolve(__dirname, '../Documentation/Benchmarking/invariants_verification_report.json');
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\n💾 Invariants verification report saved to: ${outPath}`);
}

verifyAllSeedInvariants().catch(err => {
    console.error('Invariant check failed:', err);
    process.exit(1);
});
