/**
 * River & Hydrology Generator (Phase 1)
 * Procedurally generates natural river courses, meandering tributaries, shallow fords, and lake basins.
 */

class RiverGenerator {
    /**
     * Carves a continuous meandering river across the map.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} start 
     * @param {{x: number, y: number}} end 
     * @param {Object} options 
     * @returns {Array<cell_meta>} list of modified water cells
     */
    static carveRiverCourse(map, start, end, options = {}) {
        const baseWidth = options.width || 2;
        const shallowFrequency = options.shallowFrequency || 0.12;
        const modifiedCells = [];

        let curX = start.x;
        let curY = start.y;
        const visitedKeys = new Set();

        const stepRiverAt = (cx, cy, isShallow = false) => {
            const halfW = Math.floor(baseWidth / 2);
            for (let ox = -halfW; ox <= halfW; ox++) {
                for (let oy = -halfW; oy <= halfW; oy++) {
                    const tx = cx + ox;
                    const ty = cy + oy;

                    // Bounds check
                    if (tx < map.min_width + 2 || tx > map.max_width - 3 || ty < map.min_height + 2 || ty > map.max_height - 3) {
                        continue;
                    }

                    // Keep player spawn clearing dry
                    if (Math.hypot(tx, ty) < 6) {
                        continue;
                    }

                    const cell = map.map_cells[tx] && map.map_cells[tx][ty];
                    if (!cell) continue;

                    // Do not overwrite buildings or paths
                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        continue;
                    }

                    const key = `${tx},${ty}`;
                    if (visitedKeys.has(key)) continue;
                    visitedKeys.add(key);

                    // Clear natural terrestrial obstacles
                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.WATER);

                    if (isShallow) {
                        cell.addFlag(CellFlags.WATER_SHALLOW);
                    }

                    modifiedCells.push(cell);
                }
            }
        };

        // Trace course with directional momentum and smooth sinusoidal meander
        let steps = 0;
        const maxSteps = 400;

        while ((Math.hypot(end.x - curX, end.y - curY) > 2) && steps < maxSteps) {
            steps++;

            const targetAngle = Math.atan2(end.y - curY, end.x - curX);
            // Meander noise wave
            const riverRng1 = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            const meanderOffset = Math.sin(steps * 0.18) * 0.75 + (riverRng1 - 0.5) * 0.4;
            const currentAngle = targetAngle + meanderOffset;

            curX += Math.round(Math.cos(currentAngle));
            curY += Math.round(Math.sin(currentAngle));

            // Occasionally create shallow wading fords
            const riverRng2 = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            const isShallowFord = (riverRng2 < shallowFrequency) && (steps % 15 === 0);
            stepRiverAt(curX, curY, isShallowFord);
        }

        return modifiedCells;
    }

    /**
     * Carves an organic lake basin.
     * @param {mapObject} map 
     * @param {number} centerX 
     * @param {number} centerY 
     * @param {number} radius 
     * @returns {Array<cell_meta>}
     */
    static carveLakeBasin(map, centerX, centerY, radius = 6) {
        const modifiedCells = [];

        for (let x = centerX - radius - 1; x <= centerX + radius + 1; x++) {
            for (let y = centerY - radius - 1; y <= centerY + radius + 1; y++) {
                if (x < map.min_width + 2 || x > map.max_width - 3 || y < map.min_height + 2 || y > map.max_height - 3) {
                    continue;
                }
                if (Math.hypot(x, y) < 6) continue;

                const dist = Math.hypot(x - centerX, y - centerY);
                // Organic jitter at the lake shore
                const threshold = radius + (Math.sin(x * 1.5) * 0.8 + Math.cos(y * 1.5) * 0.8);

                if (dist <= threshold) {
                    const cell = map.map_cells[x] && map.map_cells[x][y];
                    if (!cell) continue;

                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        continue;
                    }

                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.WATER);

                    // Shallow water near the perimeter
                    if (dist > threshold - 1.4) {
                        cell.addFlag(CellFlags.WATER_SHALLOW);
                    }

                    modifiedCells.push(cell);
                }
            }
        }

        return modifiedCells;
    }

    /**
     * Generates a complete natural hydrological system across the world.
     * @param {mapObject} map 
     */
    static generateHydrology(map) {
        console.log("[RiverGenerator] Generating natural hydrology, rivers, and lakes...");
        const allModified = [];

        // 1. Primary River: Flows from northwest highland to southeast sea
        const river1 = this.carveRiverCourse(
            map,
            { x: -75, y: -70 },
            { x: 75, y: 65 },
            { width: 2, shallowFrequency: 0.15 }
        );
        allModified.push(...river1);

        // 2. Lake Basin: Formed along the southeastern river meander
        const lake1 = this.carveLakeBasin(map, 35, 30, 6);
        allModified.push(...lake1);

        // 3. Secondary Tributary: Joining the main river from northeast
        const river2 = this.carveRiverCourse(
            map,
            { x: 60, y: -65 },
            { x: 10, y: -10 },
            { width: 2, shallowFrequency: 0.10 }
        );
        allModified.push(...river2);

        // Synchronize local passability graph along river courses and shorelines
        for (const cell of allModified) {
            cell.decorateCell([]);
            cell.determineNeighboursPassable(map);
            for (const n of cell.my_neighbours) {
                if (n) {
                    n.decorateCell([]);
                    n.determineNeighboursPassable(map);
                }
            }
        }

        console.log(`[RiverGenerator] Hydrology generation complete. Carved ${allModified.length} water cells.`);
        return allModified;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.RiverGenerator = RiverGenerator;
}
