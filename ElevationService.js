/**
 * Elevation & Topography Service (Phase 3)
 * Assigns discrete elevation tiers (0=water, 1=lowlands, 2=highlands, 3=peaks),
 * establishes cliff boundaries, carves natural ramps, and governs vertical kinetic traversal.
 */

class ElevationService {
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
        const ridges = [
            { cx: -45, cy: -45, radius: 22, peakRadius: 10 }, // Northwest highlands
            { cx: 45, cy: -35, radius: 18, peakRadius: 8 },   // Northeast crags
            { cx: -40, cy: 40, radius: 20, peakRadius: 9 },   // Southwest bluffs
            { cx: 50, cy: 45, radius: 16, peakRadius: 7 }     // Southeast plateau
        ];

        // 2. Assign elevation tiers
        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                // Water cells are always sea/river level h = 0
                if (cell.hasFlag(CellFlags.WATER)) {
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
                    const jitter = Math.sin(x * 0.4) * 2.5 + Math.cos(y * 0.4) * 2.5;

                    if (dist < r.peakRadius + jitter * 0.6) {
                        elev = 3; // Mountain peaks & crags
                        break;
                    } else if (dist < r.radius + jitter) {
                        if (elev < 2) elev = 2; // Highland plateaus
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
