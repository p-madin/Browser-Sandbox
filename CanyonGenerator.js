/**
 * Canyon & Chasm Generator (Phase 4)
 * Carves jagged tectonic fissures, bottomless chasms, and stamps suspension rope bridges across gorges.
 */

class CanyonGenerator {
    /**
     * Carves a jagged tectonic fault line across the map.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} start 
     * @param {{x: number, y: number}} end 
     * @param {Object} options 
     * @returns {Array<cell_meta>} modified cells
     */
    static carveFaultLine(map, start, end, options = {}) {
        const width = options.width || 2;
        const modifiedCells = [];
        const chasmCells = [];
        const visitedKeys = new Set();

        let curX = start.x;
        let curY = start.y;
        let steps = 0;
        const maxSteps = 300;

        const bridgeInterval = options.bridgeInterval || 25;
        const bridgePositions = [];

        while ((Math.hypot(end.x - curX, end.y - curY) > 2) && steps < maxSteps) {
            steps++;

            const targetAngle = Math.atan2(end.y - curY, end.x - curX);
            // Jagged fracture displacement
            const jaggedOffset = (Math.random() - 0.5) * 1.2 + Math.sin(steps * 0.35) * 0.5;
            const currentAngle = targetAngle + jaggedOffset;

            curX += Math.round(Math.cos(currentAngle));
            curY += Math.round(Math.sin(currentAngle));

            // Check if this step should host a suspension bridge
            const shouldPlaceBridge = (steps % bridgeInterval === 0);

            // Carve chasm cross-section
            const halfW = Math.floor(width / 2);
            for (let ox = -halfW; ox <= halfW; ox++) {
                for (let oy = -halfW; oy <= halfW; oy++) {
                    const tx = curX + ox;
                    const ty = curY + oy;

                    if (tx < map.min_width + 2 || tx > map.max_width - 3 || ty < map.min_height + 2 || ty > map.max_height - 3) {
                        continue;
                    }
                    if (Math.hypot(tx, ty) < 14) continue; // Keep player spawn sanctuary safe

                    const cell = map.map_cells[tx] && map.map_cells[tx][ty];
                    if (!cell) continue;

                    // Do not destroy existing buildings or bridges
                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_BRIDGE)) {
                        continue;
                    }

                    const key = `${tx},${ty}`;
                    if (visitedKeys.has(key)) continue;
                    visitedKeys.add(key);

                    // Central fissure is bottomless CHASM
                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.CHASM);
                    chasmCells.push(cell);
                    modifiedCells.push(cell);

                    // Bordering cliff flanks
                    for (let cdx = -1; cdx <= 1; cdx++) {
                        for (let cdy = -1; cdy <= 1; cdy++) {
                            const fx = tx + cdx;
                            const fy = ty + cdy;
                            const fCell = map.map_cells[fx] && map.map_cells[fx][fy];
                            if (fCell && !fCell.hasFlag(CellFlags.CHASM) && !fCell.hasFlag(CellFlags.WATER) && !fCell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                                fCell.addFlag(CellFlags.TERRAIN_CLIFF);
                                modifiedCells.push(fCell);
                            }
                        }
                    }
                }
            }

            if (shouldPlaceBridge) {
                bridgePositions.push({ x: curX, y: curY });
            }
        }

        // Stamp suspension bridges over designated canyon crossing points
        for (const bp of bridgePositions) {
            this.stampSuspensionCrossing(map, bp, modifiedCells);
        }

        return modifiedCells;
    }

    /**
     * Stamps a timber-slat suspension rope bridge across a canyon chasm coordinate.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} center 
     * @param {Array<cell_meta>} modifiedCells 
     */
    static stampSuspensionCrossing(map, center, modifiedCells) {
        // Build 5x3 wooden rope bridge spanning from solid cliff to solid cliff
        for (let ox = -2; ox <= 2; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                const tx = center.x + ox;
                const ty = center.y + oy;
                const cell = map.map_cells[tx] && map.map_cells[tx][ty];
                if (!cell) continue;

                // Center line is passable wooden walkway
                if (oy === 0) {
                    cell.removeFlag(CellFlags.CHASM | CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF);
                    cell.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                    cell.elevation = 1;
                    modifiedCells.push(cell);
                } else {
                    // Flanks are suspension rope guide rails
                    if (cell.hasFlag(CellFlags.CHASM)) {
                        cell.addFlag(CellFlags.STRUCTURE_WALL);
                        modifiedCells.push(cell);
                    }
                }
            }
        }
    }

    /**
     * Generates world canyon system with dramatic fissures and suspension bridge crossings.
     * @param {mapObject} map 
     * @returns {Array<cell_meta>}
     */
    static generateCanyons(map) {
        console.log("[CanyonGenerator] Carving rugged tectonic chasms and suspension crossings...");
        const allModified = [];

        // 1. Primary East Ridge Chasm: Jagged gorge in eastern territory
        const canyon1 = this.carveFaultLine(
            map,
            { x: 30, y: -55 },
            { x: 65, y: -15 },
            { width: 2, bridgeInterval: 22 }
        );
        allModified.push(...canyon1);

        // 2. Southwest Fissure: Defile in southwest bluffs
        const canyon2 = this.carveFaultLine(
            map,
            { x: -55, y: 35 },
            { x: -25, y: 65 },
            { width: 2, bridgeInterval: 20 }
        );
        allModified.push(...canyon2);

        // Synchronize local passability graph along all chasm edges and suspension bridges
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

        console.log(`[CanyonGenerator] Canyon generation complete. Carved ${allModified.length} geological cells.`);
        return allModified;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.CanyonGenerator = CanyonGenerator;
}
