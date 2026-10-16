/**
 * AgentBridge.js
 * Browser Sub-agent Synergy & Automation Controller.
 * Provides declarative DOM hooks, URL query parameter dispatching, and programmatic
 * navigation so browser subagents never need to execute disallowed javascript: pseudo-URLs.
 */

class AgentBridge {
    /**
     * Repositions the agent and centers the viewport on coordinate (x, y).
     * @param {number} x 
     * @param {number} y 
     */
    static teleport(x, y) {
        x = Math.round(x);
        y = Math.round(y);
        console.log(`[AgentBridge] Teleporting agent to (${x}, ${y})...`);

        if (typeof globalGridObject === 'undefined' || !globalGridObject || typeof agent === 'undefined' || !agent) {
            console.warn("[AgentBridge] Grid or agent not initialized yet.");
            return false;
        }

        vector_horizontal = globalGridObject.grid_mid_x - x;
        vector_vertical = globalGridObject.grid_mid_y - y;
        agent.x = x;
        agent.y = y;

        if (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells[x] && globalMapObject.map_cells[x][y]) {
            agent.agentCellOccupied = globalMapObject.map_cells[x][y].getCellMeta();
        }

        globalGridObject.updateGrid(agent);
        this.updateTelemetry();
        return true;
    }

    /**
     * Teleports to a named macro-geomorphic biome location.
     * @param {"spawn"|"mountains"|"canyons"|"river"|"lake"} biome 
     */
    static teleportBiome(biome) {
        switch (biome.toLowerCase()) {
            case "spawn":
                return this.teleport(0, 0);

            case "mountains":
                if (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges && ElevationService.mountainRidges.length > 0) {
                    const r = ElevationService.mountainRidges[0];
                    return this.teleport(r.cx, r.cy);
                }
                return this.teleport(-60, -60);

            case "canyons":
            case "canyon":
                if (typeof CanyonGenerator !== 'undefined' && CanyonGenerator.faultLines && CanyonGenerator.faultLines.length > 0) {
                    const fl = CanyonGenerator.faultLines[0];
                    return this.teleport(fl.start.x, fl.start.y);
                }
                return this.teleport(80, 0);

            case "river":
                if (typeof RiverGenerator !== 'undefined' && RiverGenerator.primaryRiverCourse && RiverGenerator.primaryRiverCourse.length > 0) {
                    const mid = RiverGenerator.primaryRiverCourse[Math.floor(RiverGenerator.primaryRiverCourse.length / 2)];
                    return this.teleport(mid.x, mid.y);
                }
                return this.teleport(20, 20);

            case "lake":
                if (typeof RiverGenerator !== 'undefined' && RiverGenerator.lakeCenter) {
                    return this.teleport(RiverGenerator.lakeCenter.x, RiverGenerator.lakeCenter.y);
                }
                return this.teleport(35, 30);

            default:
                console.warn(`[AgentBridge] Unknown biome: ${biome}`);
                return false;
        }
    }

    /**
     * Re-seeds the world with specific or random seeds and re-renders the map.
     * @param {number} [a] 
     * @param {number} [b] 
     * @param {number} [c] 
     * @param {number} [d] 
     */
    static applySeeds(a, b, c, d) {
        if (typeof seedgen === 'function') {
            seed_a = (a !== undefined) ? (a >>> 0) : seedgen();
            seed_b = (b !== undefined) ? (b >>> 0) : seedgen();
            seed_c = (c !== undefined) ? (c >>> 0) : seedgen();
            seed_d = (d !== undefined) ? (d >>> 0) : seedgen();
        }
        console.log(`[AgentBridge] Applying seeds: [${seed_a}, ${seed_b}, ${seed_c}, ${seed_d}]`);

        if (typeof init === 'function') {
            init();
        }
        this.updateTelemetry();
    }

    /**
     * Collects and serializes world state telemetry for machine inspection.
     * @returns {Object}
     */
    static getTelemetry() {
        let waterCount = 0, chasmCount = 0, elev2Count = 0, elev3Count = 0;
        let collisionsWaterMountain = 0, collisionsCanyonWater = 0, collisionsCanyonMountain = 0;

        if (typeof globalMapObject !== 'undefined' && globalMapObject && globalMapObject.map_cells) {
            for (let x = globalMapObject.min_width; x < globalMapObject.max_width; x++) {
                for (let y = globalMapObject.min_height; y < globalMapObject.max_height; y++) {
                    const c = globalMapObject.map_cells[x] && globalMapObject.map_cells[x][y];
                    if (!c) continue;

                    const isWater = c.hasFlag(CellFlags.WATER);
                    const isChasm = c.hasFlag(CellFlags.CHASM);
                    const isMtn = (c.elevation >= 2);

                    if (isWater) waterCount++;
                    if (isChasm) chasmCount++;
                    if (c.elevation === 2) elev2Count++;
                    if (c.elevation === 3) elev3Count++;

                    if (isWater && isMtn) collisionsWaterMountain++;
                    if (isChasm && isWater) collisionsCanyonWater++;
                    if (isChasm && isMtn) collisionsCanyonMountain++;
                }
            }
        }

        const data = {
            seeds: (typeof globalMapObject !== 'undefined' && globalMapObject) ? globalMapObject.seeds : [seed_a, seed_b, seed_c, seed_d],
            agentPosition: (typeof agent !== 'undefined' && agent) ? { x: agent.x, y: agent.y } : { x: 0, y: 0 },
            mountains: (typeof ElevationService !== 'undefined') ? ElevationService.mountainRidges : [],
            river: {
                lakeCenter: (typeof RiverGenerator !== 'undefined') ? RiverGenerator.lakeCenter : null,
                waterCells: waterCount
            },
            canyon: {
                faultLines: (typeof CanyonGenerator !== 'undefined') ? CanyonGenerator.faultLines : [],
                chasmCells: chasmCount
            },
            elevationCounts: {
                highlands: elev2Count,
                peaks: elev3Count
            },
            collisions: {
                waterMountain: collisionsWaterMountain,
                canyonWater: collisionsCanyonWater,
                canyonMountain: collisionsCanyonMountain,
                total: collisionsWaterMountain + collisionsCanyonWater + collisionsCanyonMountain
            },
            status: "ready"
        };

        return data;
    }

    /**
     * Updates the DOM telemetry element with latest data.
     */
    static updateTelemetry() {
        if (typeof document === 'undefined') return;
        const el = document.getElementById("world_status_telemetry");
        if (el) {
            el.textContent = JSON.stringify(this.getTelemetry(), null, 2);
        }
    }

    /**
     * Dispatches action according to URL query parameters on initial page load.
     */
    static processQueryParams() {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return;

        const params = new URLSearchParams(window.location.search);

        // 1. Seed parameter: ?seed=12345 or ?seed=1,2,3,4
        if (params.has("seed")) {
            const seedVal = params.get("seed");
            if (seedVal.includes(",")) {
                const parts = seedVal.split(",").map(Number);
                this.applySeeds(parts[0], parts[1], parts[2], parts[3]);
            } else {
                const s = Number(seedVal) >>> 0;
                this.applySeeds(s, s ^ 0x5a5a5a5a, (s * 3) >>> 0, (s * 7) >>> 0);
            }
        }

        // 2. Teleport parameter: ?teleport=mountains
        if (params.has("teleport")) {
            const biome = params.get("teleport");
            setTimeout(() => this.teleportBiome(biome), 150);
        }

        // 3. Explicit coordinates: ?x=-60&y=-60
        if (params.has("x") && params.has("y")) {
            const qx = parseFloat(params.get("x"));
            const qy = parseFloat(params.get("y"));
            setTimeout(() => this.teleport(qx, qy), 150);
        }

        // 4. Run benchmark automatically: ?run_benchmark=true
        if (params.get("run_benchmark") === "true") {
            setTimeout(() => {
                const runBtn = document.getElementById("benchmark_run_btn");
                if (runBtn) runBtn.click();
            }, 300);
        }

        // 5. Run walk animation benchmark automatically: ?run_walk_benchmark=true
        if (params.get("run_walk_benchmark") === "true") {
            setTimeout(() => {
                const walkBtn = document.getElementById("benchmark_walk_btn");
                if (walkBtn) walkBtn.click();
            }, 400);
        }
    }

    /**
     * Programmatically executes the 10-step walk animation performance benchmark.
     */
    static async runWalkBenchmark(steps = 10) {
        if (typeof window !== 'undefined' && typeof window.runWalkBenchmark === 'function') {
            return await window.runWalkBenchmark(steps);
        }
        return null;
    }

    /**
     * Initializes UI event listeners for the subagent automation bar.
     */
    static init() {
        if (typeof document === 'undefined') return;

        const bindBtn = (id, fn) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener("click", fn);
        };

        bindBtn("teleport_spawn_btn", () => this.teleportBiome("spawn"));
        bindBtn("teleport_mountains_btn", () => this.teleportBiome("mountains"));
        bindBtn("teleport_canyons_btn", () => this.teleportBiome("canyons"));
        bindBtn("teleport_river_btn", () => this.teleportBiome("river"));
        bindBtn("teleport_lake_btn", () => this.teleportBiome("lake"));

        bindBtn("seed_apply_btn", () => {
            const input = document.getElementById("seed_input");
            if (input && input.value) {
                const val = input.value.trim();
                if (val.includes(",")) {
                    const p = val.split(",").map(Number);
                    this.applySeeds(p[0], p[1], p[2], p[3]);
                } else {
                    const s = Number(val) >>> 0;
                    this.applySeeds(s, s ^ 0x5a5a5a5a, (s * 3) >>> 0, (s * 7) >>> 0);
                }
            }
        });

        bindBtn("seed_random_btn", () => {
            this.applySeeds();
        });

        this.processQueryParams();
        this.updateTelemetry();
    }
}

// Global browser registration
if (typeof window !== 'undefined') {
    window.AgentBridge = AgentBridge;
    if (typeof EventTrait !== 'undefined') {
        EventTrait.onReady(() => AgentBridge.init());
    } else {
        window.addEventListener("DOMContentLoaded", () => AgentBridge.init());
    }
}

// Node export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AgentBridge };
}
