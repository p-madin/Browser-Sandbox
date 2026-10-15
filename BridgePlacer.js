/**
 * Bridge Placer & River Crossing Engine (Phase 2)
 * Detects trail-water intersections, stamps directional bridge infrastructure, and synchronizes navmesh connectivity.
 */

class BridgePlacer {
    /**
     * Scans the map for trails intersecting water bodies and reinforces them into engineered crossings.
     * @param {mapObject} map 
     * @returns {Array<Object>} detected crossings
     */
    static processRiverCrossings(map) {
        console.log("[BridgePlacer] Detecting and engineering river crossings...");
        const crossingCells = [];

        // 1. Identify all trail cells currently spanning water bodies
        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                if (cell.hasFlag(CellFlags.STRUCTURE_PATH) && cell.hasFlag(CellFlags.WATER)) {
                    crossingCells.push(cell);
                }
            }
        }

        if (crossingCells.length === 0) {
            console.log("[BridgePlacer] No trail-water intersections detected.");
            return [];
        }

        // 2. Cluster adjacent crossing cells into discrete crossing spans
        const visited = new Set();
        const clusters = [];

        for (const cell of crossingCells) {
            const key = `${cell.my_x},${cell.my_y}`;
            if (visited.has(key)) continue;

            const cluster = [];
            const queue = [cell];
            visited.add(key);

            while (queue.length > 0) {
                const curr = queue.shift();
                cluster.push(curr);

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = curr.my_x + dx;
                        const ny = curr.my_y + dy;
                        const nKey = `${nx},${ny}`;
                        if (visited.has(nKey)) continue;

                        const neighbor = map.map_cells[nx] && map.map_cells[nx][ny];
                        if (neighbor && neighbor.hasFlag(CellFlags.STRUCTURE_PATH) && neighbor.hasFlag(CellFlags.WATER)) {
                            visited.add(nKey);
                            queue.push(neighbor);
                        }
                    }
                }
            }

            clusters.push(cluster);
        }

        const crossings = [];
        const allModifiedCells = [];

        // 3. For each cluster, determine orientation and stamp bridge rails & decks
        for (let idx = 0; idx < clusters.length; idx++) {
            const cluster = clusters[idx];
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const c of cluster) {
                if (c.my_x < minX) minX = c.my_x;
                if (c.my_x > maxX) maxX = c.my_x;
                if (c.my_y < minY) minY = c.my_y;
                if (c.my_y > maxY) maxY = c.my_y;
            }

            const spanWidth = (maxX - minX) + 1;
            const spanHeight = (maxY - minY) + 1;
            const isHorizontal = spanWidth >= spanHeight;
            const isStone = (idx % 2 === 1); // Alternate timber and stone architectural styles

            // Stamp deck and side guide rails
            for (const c of cluster) {
                c.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                c.removeFlag(CellFlags.BLOCKED | CellFlags.TREE);
                allModifiedCells.push(c);

                // Add guide rails perpendicular to crossing direction
                if (isHorizontal) {
                    // Guide rails North & South
                    const railN = map.map_cells[c.my_x] && map.map_cells[c.my_x][c.my_y - 1];
                    const railS = map.map_cells[c.my_x] && map.map_cells[c.my_x][c.my_y + 1];
                    if (railN && railN.hasFlag(CellFlags.WATER) && !railN.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        railN.addFlag(CellFlags.STRUCTURE_WALL);
                        allModifiedCells.push(railN);
                    }
                    if (railS && railS.hasFlag(CellFlags.WATER) && !railS.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        railS.addFlag(CellFlags.STRUCTURE_WALL);
                        allModifiedCells.push(railS);
                    }
                } else {
                    // Guide rails West & East
                    const railW = map.map_cells[c.my_x - 1] && map.map_cells[c.my_x - 1][c.my_y];
                    const railE = map.map_cells[c.my_x + 1] && map.map_cells[c.my_x + 1][c.my_y];
                    if (railW && railW.hasFlag(CellFlags.WATER) && !railW.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        railW.addFlag(CellFlags.STRUCTURE_WALL);
                        allModifiedCells.push(railW);
                    }
                    if (railE && railE.hasFlag(CellFlags.WATER) && !railE.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        railE.addFlag(CellFlags.STRUCTURE_WALL);
                        allModifiedCells.push(railE);
                    }
                }
            }

            crossings.push({
                id: `crossing_${idx + 1}`,
                type: isStone ? "stone_arch" : "timber_trestle",
                orientation: isHorizontal ? "horizontal" : "vertical",
                span: cluster.length,
                bounds: { minX, maxX, minY, maxY }
            });
        }

        // 4. Synchronize navmesh connectivity across the crossings and shorelines
        this.recalculateCrossingPassability(map, allModifiedCells);

        console.log(`[BridgePlacer] Completed placement of ${crossings.length} bridges.`);
        return crossings;
    }

    /**
     * Stamps an individual bridge blueprint prefab at a specific world coordinate.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} coord 
     * @param {"H"|"V"} orientation 
     * @param {"timber"|"stone"} type 
     * @returns {Object|null}
     */
    static stampBridge(map, coord, orientation = "H", type = "timber") {
        let blueprintId = "timber_bridge_h";
        if (type === "stone") {
            blueprintId = (orientation === "H") ? "stone_arch_bridge_h" : "stone_arch_bridge_v";
        } else {
            blueprintId = (orientation === "H") ? "timber_bridge_h" : "timber_bridge_v";
        }

        const bp = StructureLibrary.getBlueprint(blueprintId);
        if (!bp) return null;

        const instance = StructureStamper.stamp(map, bp, coord.x, coord.y);
        if (instance) {
            // Guarantee all path cells on bridge are tagged with STRUCTURE_BRIDGE
            for (let y = instance.bounds.startY; y <= instance.bounds.endY; y++) {
                for (let x = instance.bounds.startX; x <= instance.bounds.endX; x++) {
                    const cell = map.map_cells[x] && map.map_cells[x][y];
                    if (cell && cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        cell.addFlag(CellFlags.STRUCTURE_BRIDGE);
                    }
                }
            }
        }
        return instance;
    }

    /**
     * Re-evaluates local passability graph along all bridge and shoreline cells.
     * @param {mapObject} map 
     * @param {Array<cell_meta>} cells 
     */
    static recalculateCrossingPassability(map, cells) {
        const uniqueSet = new Set();
        for (const c of cells) {
            if (!c) continue;
            uniqueSet.add(c);
            c.decorateCell([]);
            c.determineNeighboursPassable(map);
            for (const n of c.my_neighbours) {
                if (n && !uniqueSet.has(n)) {
                    uniqueSet.add(n);
                    n.decorateCell([]);
                    n.determineNeighboursPassable(map);
                }
            }
        }
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.BridgePlacer = BridgePlacer;
}
