/**
 * Riparian Ecology & Geomorphic World Integration Service (Phase 5)
 * Distributes moisture-driven vegetation (reeds, willows, alpine pines) and
 * procedurally aligns waterfront architectural landmarks (watermills, fishing piers).
 */

class RiparianEcologyService {
    /**
     * Distributes moisture-driven vegetation along rivers and alpine flora on highlands.
     * @param {mapObject} map 
     * @returns {Object} statistics of distributed flora
     */
    static populateRiparianFlora(map) {
        console.log("[RiparianEcologyService] Generating moisture-driven riparian ecology and alpine flora...");
        let reedsCount = 0;
        let willowsCount = 0;
        let alpineCount = 0;
        const modifiedCells = [];

        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                // Protect spawn clearing
                if (Math.hypot(x, y) < 8) continue;

                // Exclude structures, paths, and water itself
                if (cell.hasFlag(CellFlags.WATER | CellFlags.CHASM | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BRIDGE)) {
                    continue;
                }

                const elev = cell.elevation || 1;

                // 1. Riparian Moisture Zone (Lowlands near water)
                if (elev <= 1) {
                    let hasNearbyWater = false;
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dy = -2; dy <= 2; dy++) {
                            const n = map.map_cells[x + dx] && map.map_cells[x + dx][y + dy];
                            if (n && n.hasFlag(CellFlags.WATER)) {
                                hasNearbyWater = true;
                                break;
                            }
                        }
                        if (hasNearbyWater) break;
                    }

                    if (hasNearbyWater) {
                        const seed = (Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453) % 1;
                        if (seed < 0.28) {
                            // Lush riparian reeds & rushes
                            cell.addFlag(CellFlags.TERRAIN_FLORA);
                            cell.removeFlag(CellFlags.BLOCKED);
                            reedsCount++;
                            modifiedCells.push(cell);
                        } else if (seed < 0.40) {
                            // Riparian willow tree
                            cell.addFlag(CellFlags.TREE);
                            willowsCount++;
                            modifiedCells.push(cell);
                        }
                    }
                }

                // 2. Alpine Crag Zone (High elevation peaks h = 3)
                if (elev === 3) {
                    const seed = (Math.abs(Math.sin(x * 93.9898 + y * 34.233)) * 43758.5453) % 1;
                    if (seed < 0.18) {
                        // Alpine boulder / bedrock obstacle
                        cell.addFlag(CellFlags.BLOCKED);
                        alpineCount++;
                        modifiedCells.push(cell);
                    }
                }
            }
        }

        console.log(`[RiparianEcologyService] Distributed ${reedsCount} riparian reeds, ${willowsCount} willows, and ${alpineCount} alpine crags.`);
        return { reedsCount, willowsCount, alpineCount, modifiedCells };
    }

    /**
     * Finds waterfront sites and stamps specialized hydrological architecture.
     * @param {mapObject} map 
     * @returns {Array<Object>} placed waterfront structures
     */
    static placeWaterfrontArchitecture(map) {
        console.log("[RiparianEcologyService] Placing waterfront architecture (Watermill & Fishing Pier)...");
        const placed = [];
        const minClearance = 12;

        // 1. Locate candidate riverbank cell for Riverside Watermill
        const watermillBP = StructureLibrary.getBlueprint("watermill");
        if (watermillBP) {
            let placedMill = false;
            for (let x = -30; x <= 30 && !placedMill; x += 3) {
                for (let y = -30; y <= 30 && !placedMill; y += 3) {
                    if (Math.hypot(x, y) < 10) continue;

                    const cell = map.map_cells[x] && map.map_cells[x][y];
                    if (!cell || cell.hasFlag(CellFlags.WATER)) continue;

                    // Verify adjacent water for the paddlewheel
                    const eastCell = map.map_cells[x + 1] && map.map_cells[x + 1][y];
                    if (eastCell && eastCell.hasFlag(CellFlags.WATER)) {
                        if (WorldStructurePlacer.hasClearance(map.structures, x, y, minClearance)) {
                            if (StructureStamper.canPlace(map, watermillBP, x, y)) {
                                const inst = StructureStamper.stamp(map, watermillBP, x, y);
                                if (inst) {
                                    placed.push(inst);
                                    map.structures.push(inst);
                                    placedMill = true;

                                    // Carve connecting trail to starter settlement
                                    if (map.structures.length > 0) {
                                        const cabin = map.structures[0];
                                        const cabinDoor = WorldStructurePlacer.findDoorway(map, cabin);
                                        const millDoor = WorldStructurePlacer.findDoorway(map, inst);
                                        if (cabinDoor && millDoor) {
                                            WorldStructurePlacer.carveTrail(map, cabinDoor, millDoor);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Locate candidate lake perimeter cell for Lakeside Fishing Pier
        const pierBP = StructureLibrary.getBlueprint("fishing_pier");
        if (pierBP) {
            let placedPier = false;
            // Lake basin is centered around (35, 30)
            const searchCoords = [
                { x: 35, y: 22 },
                { x: 30, y: 28 },
                { x: 40, y: 36 },
                { x: 28, y: 32 }
            ];

            for (const cand of searchCoords) {
                if (WorldStructurePlacer.hasClearance(map.structures, cand.x, cand.y, 8)) {
                    if (StructureStamper.canPlace(map, pierBP, cand.x, cand.y)) {
                        const inst = StructureStamper.stamp(map, pierBP, cand.x, cand.y);
                        if (inst) {
                            placed.push(inst);
                            map.structures.push(inst);
                            placedPier = true;
                            break;
                        }
                    }
                }
            }
        }

        // Synchronize local passability graph across all modified cells
        for (const s of placed) {
            const b = s.bounds;
            for (let x = b.startX - 1; x <= b.endX + 1; x++) {
                for (let y = b.startY - 1; y <= b.endY + 1; y++) {
                    const c = map.map_cells[x] && map.map_cells[x][y];
                    if (c) {
                        c.decorateCell([]);
                        c.determineNeighboursPassable(map);
                    }
                }
            }
        }

        console.log(`[RiparianEcologyService] Placed ${placed.length} waterfront landmarks.`);
        return placed;
    }

    /**
     * Executes complete Phase 5 geomorphic integration.
     * @param {mapObject} map 
     */
    static integrateGeomorphicWorld(map) {
        this.populateRiparianFlora(map);
        this.placeWaterfrontArchitecture(map);
        if (typeof BridgePlacer !== 'undefined') {
            BridgePlacer.processRiverCrossings(map);
        }
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.RiparianEcologyService = RiparianEcologyService;
}
