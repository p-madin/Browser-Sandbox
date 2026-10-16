/**
 * Elevation & Topography Service (Phase 3)
 * Assigns discrete elevation tiers (0=water, 1=lowlands, 2=highlands, 3=peaks),
 * establishes cliff boundaries, carves natural ramps, and governs vertical kinetic traversal.
 */

class ElevationService {
    /**
     * Authoritative mountain massif geological centers and clearance envelopes.
     */
    static mountainRidges = [
        { cx: -65, cy: -60, radius: 18, peakRadius: 8, name: "Northwest Highlands" },
        { cx: 60, cy: -55, radius: 17, peakRadius: 7, name: "Northeast Crags" },
        { cx: -60, cy: 55, radius: 18, peakRadius: 8, name: "Southwest Bluffs" },
        { cx: 25, cy: 75, radius: 16, peakRadius: 7, name: "Southern Ridge" }
    ];

    /**
     * Initializes authoritative mountain massif geological centers and clearance envelopes.
     * Uses seeded pseudo-random distribution across the entire map, avoiding spawn and each other.
     * @param {mapObject} map 
     */
    static initializeRidges(map) {
        const rng = () => (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();

        const numMassifs = 2 + Math.floor(rng() * 3); // 2 to 4 massifs
        const massifs = [];
        const names = [
            "Mistveil Ridge", "Cragstone Peaks", "Stormfall Massif", 
            "Frostfang Highlands", "Ironhorn Range", "Shadowcrag Heights",
            "Thunderpeak Bluffs", "Ashen Crest"
        ];
        const shuffledNames = [...names].sort(() => rng() - 0.5);

        for (let attempt = 0; attempt < 400 && massifs.length < numMassifs; attempt++) {
            // Pick a random location across [-80, 80]
            const cx = Math.round((rng() - 0.5) * 160);
            const cy = Math.round((rng() - 0.5) * 160);

            // Keep player spawn sanctuary clear (at least 22 tiles away from (0,0))
            if (Math.hypot(cx, cy) < 22) continue;

            const radius = 14 + Math.floor(rng() * 8); // 14 to 21
            const peakRadius = 5 + Math.floor(rng() * 4); // 5 to 8

            // Keep valleys open between massifs (~28-34 tiles separation)
            let tooClose = false;
            for (const m of massifs) {
                if (Math.hypot(cx - m.cx, cy - m.cy) < Math.max(radius, m.radius) + 12) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            // Generate 1 to 2 ridge elongation lobes for organic, asymmetric mountain ranges
            const lobes = [];
            const numLobes = 1 + (rng() < 0.65 ? 1 : 0);
            for (let li = 0; li < numLobes; li++) {
                const ridgeAngle = rng() * Math.PI * 2;
                const ridgeDist = 7 + Math.floor(rng() * 9);
                const lobeX = Math.round(cx + Math.cos(ridgeAngle) * ridgeDist);
                const lobeY = Math.round(cy + Math.sin(ridgeAngle) * ridgeDist);
                const lobeR = Math.round(radius * (0.65 + rng() * 0.2));
                const lobePeak = Math.max(3, Math.round(peakRadius * 0.65));

                if (Math.hypot(lobeX, lobeY) >= 18) {
                    lobes.push({ cx: lobeX, cy: lobeY, radius: lobeR, peakRadius: lobePeak });
                }
            }

            massifs.push({
                cx,
                cy,
                radius,
                peakRadius,
                name: shuffledNames[massifs.length % shuffledNames.length],
                lobe: lobes[0] || null,
                lobes: lobes
            });
        }

        // Fallback: If rejection sampling produced fewer than 2 massifs, add a guaranteed distant massif
        if (massifs.length < 2) {
            const fallbackAngle = rng() * Math.PI * 2;
            const fallbackDist = 45 + Math.floor(rng() * 25);
            massifs.push({
                cx: Math.round(Math.cos(fallbackAngle) * fallbackDist),
                cy: Math.round(Math.sin(fallbackAngle) * fallbackDist),
                radius: 16,
                peakRadius: 6,
                name: "Wild Peak",
                lobe: null,
                lobes: []
            });
        }

        ElevationService.mountainRidges = massifs;
        console.log(`[ElevationService] Initialized ${massifs.length} procedural mountain ranges:`, massifs);
        return massifs;
    }

    /**
     * Procedurally generates elevation tiers across the world map.
     * @param {mapObject} map 
     * @param {Object} options 
     * @returns {Object} elevation statistics
     */
    static generateHeightmap(map, options = {}) {
        console.log("[ElevationService] Generating multi-tier topography & elevation heightmap...");

        let count0 = 0, count1 = 0, count2 = 0, count3 = 0, rampsPlaced = 0;
        const modifiedCells = [];

        // 1. Highland and Mountain geological centers
        if (!ElevationService.mountainRidges || ElevationService.mountainRidges.length === 0) {
            ElevationService.initializeRidges(map);
        }
        const ridges = ElevationService.mountainRidges;

        // Seed-driven harmonic boundary jitter parameters
        const phaseX = (map && map.seeds && map.seeds.length >= 1) ? ((map.seeds[0] % 1000) * 0.01) : 0.0;
        const phaseY = (map && map.seeds && map.seeds.length >= 2) ? ((map.seeds[1] % 1000) * 0.01) : 0.0;
        const freq = 0.38 + ((map && map.seeds && map.seeds.length >= 3 ? (map.seeds[2] % 10) : 5) * 0.008);

        // 2. Assign elevation tiers
        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                // Water and chasm cells are strictly sea/river level h = 0
                if (cell.hasFlag(CellFlags.WATER) || cell.hasFlag(CellFlags.WATER_SHALLOW) || cell.hasFlag(CellFlags.CHASM)) {
                    cell.elevation = 0;
                    count0++;
                    modifiedCells.push(cell);
                    continue;
                }

                // Protect player spawn sanctuary as flat lowland meadow (h = 1)
                const distFromSpawn = Math.hypot(x, y);
                if (distFromSpawn < 14) {
                    cell.elevation = 1;
                    count1++;
                    modifiedCells.push(cell);
                    continue;
                }

                let elev = 1;
                for (const r of ridges) {
                    const dist = Math.hypot(x - r.cx, y - r.cy);
                    const jitter = Math.sin(x * freq + phaseX) * 2.8 + Math.cos(y * freq + phaseY) * 2.8;

                    let inPeak = (dist < r.peakRadius + jitter * 0.6);
                    let inHighland = (dist < r.radius + jitter);

                    const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                    for (const lb of lobesList) {
                        const lDist = Math.hypot(x - lb.cx, y - lb.cy);
                        if (lDist < lb.peakRadius + jitter * 0.5) inPeak = true;
                        if (lDist < lb.radius + jitter * 0.8) inHighland = true;
                    }

                    if (inPeak) {
                        elev = 3; // Mountain peaks & crags
                        break;
                    } else if (inHighland) {
                        if (elev < 2) elev = 2; // Highland plateaus
                    }
                }

                // Macro-Geomorphic Invariant: Mountains and highlands (elev >= 2) must NEVER
                // overlap or border water or chasms within a 6-tile safety clearance buffer.
                if (elev >= 2) {
                    let nearWaterOrChasm = false;
                    for (let dx = -6; dx <= 6 && !nearWaterOrChasm; dx++) {
                        for (let dy = -6; dy <= 6 && !nearWaterOrChasm; dy++) {
                            if (dx * dx + dy * dy > 36) continue;
                            const nc = map.map_cells[x + dx] && map.map_cells[x + dx][y + dy];
                            if (nc && (nc.hasFlag(CellFlags.WATER) || nc.hasFlag(CellFlags.WATER_SHALLOW) || nc.hasFlag(CellFlags.CHASM))) {
                                nearWaterOrChasm = true;
                            }
                        }
                    }
                    if (nearWaterOrChasm) {
                        elev = 1; // Clamp to lowland floodplain meadow
                    }
                }

                cell.elevation = elev;
                if (elev === 1) count1++;
                else if (elev === 2) count2++;
                else if (elev === 3) count3++;

                modifiedCells.push(cell);
            }
        }

        // 3. Connect trails with ramps where they cross elevation boundaries
        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                if (cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                    // Check neighbors for elevation differences
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const neighbor = map.map_cells[x + dx] && map.map_cells[x + dx][y + dy];
                            if (neighbor && Math.abs((cell.elevation || 1) - (neighbor.elevation || 1)) >= 1) {
                                cell.addFlag(CellFlags.TERRAIN_RAMP);
                                neighbor.addFlag(CellFlags.TERRAIN_RAMP);
                                rampsPlaced++;
                            }
                        }
                    }
                }
            }
        }

        // 4. Carve natural perimeter ramps every 10 boundary tiles so plateaus are naturally accessible
        let boundaryCounter = 0;
        for (let x = map.min_width + 1; x < map.max_width - 1; x++) {
            for (let y = map.min_height + 1; y < map.max_height - 1; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell || cell.hasFlag(CellFlags.WATER)) continue;

                const curElev = cell.elevation || 1;
                // Look for step-up to higher tier
                const east = map.map_cells[x + 1] && map.map_cells[x + 1][y];
                const south = map.map_cells[x] && map.map_cells[x][y + 1];

                const hasStep = (east && Math.abs((east.elevation || 1) - curElev) === 1) ||
                                (south && Math.abs((south.elevation || 1) - curElev) === 1);

                if (hasStep) {
                    boundaryCounter++;
                    if (boundaryCounter % 10 === 0) {
                        cell.addFlag(CellFlags.TERRAIN_RAMP);
                        cell.removeFlag(CellFlags.BLOCKED | CellFlags.TREE);
                        if (east) east.addFlag(CellFlags.TERRAIN_RAMP);
                        if (south) south.addFlag(CellFlags.TERRAIN_RAMP);
                        rampsPlaced++;
                    }
                }
            }
        }

        // 5. Synchronize passability graph and visual decorations
        for (const cell of modifiedCells) {
            cell.decorateCell([]);
            cell.determineNeighboursPassable(map);
        }

        const stats = { count0, count1, count2, count3, rampsPlaced };
        console.log(`[ElevationService] Heightmap complete: Lowlands=${count1}, Highlands=${count2}, Peaks=${count3}, Ramps=${rampsPlaced}`);
        return stats;
    }

    /**
     * Carves a deliberate ramp passage between two cells.
     * @param {mapObject} map 
     * @param {cell_meta} fromCell 
     * @param {cell_meta} toCell 
     */
    static carveRamp(map, fromCell, toCell) {
        if (!fromCell || !toCell) return;
        fromCell.addFlag(CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_PATH);
        fromCell.removeFlag(CellFlags.BLOCKED | CellFlags.TREE);
        toCell.addFlag(CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_PATH);
        toCell.removeFlag(CellFlags.BLOCKED | CellFlags.TREE);

        fromCell.decorateCell([]);
        toCell.decorateCell([]);
        fromCell.determineNeighboursPassable(map);
        toCell.determineNeighboursPassable(map);
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.ElevationService = ElevationService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ElevationService };
}
