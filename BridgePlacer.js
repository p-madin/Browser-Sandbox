/**
 * Bridge Placer & River Crossing Engine (Phase 4)
 * Engineered shore-to-shore raycasting, continuous deck spanning, solid abutments, and flank railings.
 */

class BridgePlacer {
    /**
     * Scans the world map for trails intersecting water or chasms and builds full-span engineered crossings.
     * @param {mapObject} map 
     * @returns {Array<Object>} list of completed bridges
     */
    static processRiverCrossings(map) {
        console.log("[BridgePlacer] Engineering shore-to-shore bridge spans and abutments...");
        const bridges = [];
        const processedCoords = new Set();
        const allModifiedCells = [];

        // 1. Identify trail cells that touch water or chasms
        for (let x = map.min_width + 1; x < map.max_width - 1; x++) {
            for (let y = map.min_height + 1; y < map.max_height - 1; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                // Look for trail entering water or chasm
                const isWaterCrossing = cell.hasFlag(CellFlags.STRUCTURE_PATH) && cell.hasFlag(CellFlags.WATER);
                const isChasmCrossing = cell.hasFlag(CellFlags.STRUCTURE_PATH) && cell.hasFlag(CellFlags.CHASM);

                if ((isWaterCrossing || isChasmCrossing) && !processedCoords.has(`${x},${y}`)) {
                    const span = this.spanFullCrossing(map, cell, processedCoords);
                    if (span) {
                        bridges.push(span);
                        allModifiedCells.push(...span.deckCells, ...span.railCells, ...span.abutmentCells);
                    }
                }
            }
        }

        // 2. Mandatory River Bridge Invariant Sweep:
        // Guarantee that NO water cell ever retains STRUCTURE_PATH without STRUCTURE_BRIDGE
        for (let x = map.min_width; x < map.max_width; x++) {
            for (let y = map.min_height; y < map.max_height; y++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (cell && cell.hasFlag(CellFlags.WATER)) {
                    if (cell.hasFlag(CellFlags.STRUCTURE_PATH) && !cell.hasFlag(CellFlags.STRUCTURE_BRIDGE)) {
                        const span = this.spanFullCrossing(map, cell, processedCoords);
                        if (span) {
                            bridges.push(span);
                            allModifiedCells.push(...span.deckCells, ...span.railCells, ...span.abutmentCells);
                        } else {
                            // If water channel cannot be spanned, strip bare path flag
                            cell.removeFlag(CellFlags.STRUCTURE_PATH);
                            allModifiedCells.push(cell);
                        }
                    }
                }
            }
        }

        // 3. Synchronize passability graph across all bridges and shorelines
        this.recalculateCrossingPassability(map, allModifiedCells);

        console.log(`[BridgePlacer] Engineered ${bridges.length} full-span bridges across waterways and chasms.`);
        return bridges;
    }

    /**
     * Constructs an engineered shore-to-shore bridge crossing at a specific coordinate on-demand.
     * @param {mapObject} map 
     * @param {number} x 
     * @param {number} y 
     * @returns {Object|null}
     */
    static spanCrossingAt(map, x, y) {
        const seedCell = map.map_cells[x] && map.map_cells[x][y];
        if (!seedCell) return null;
        const processedCoords = new Set();
        const span = this.spanFullCrossing(map, seedCell, processedCoords);
        if (span) {
            const allModified = [...span.deckCells, ...span.railCells, ...span.abutmentCells];
            this.recalculateCrossingPassability(map, allModified);
        }
        return span;
    }

    /**
     * Traces across an obstacle channel from Shore A to Shore B, building an unbroken bridge span.
     * @param {mapObject} map 
     * @param {cell_meta} seedCell 
     * @param {Set<string>} processedCoords 
     * @returns {Object|null} bridge metadata
     */
    static spanFullCrossing(map, seedCell, processedCoords) {
        const sx = seedCell.my_x;
        const sy = seedCell.my_y;

        // Determine primary channel orientation:
        // Check if water extends more horizontally or vertically around this seed
        let waterH = 0, waterV = 0;
        for (let d = -3; d <= 3; d++) {
            const hCell = map.map_cells[sx + d] && map.map_cells[sx + d][sy];
            if (hCell && (hCell.hasFlag(CellFlags.WATER) || hCell.hasFlag(CellFlags.CHASM))) waterH++;

            const vCell = map.map_cells[sx] && map.map_cells[sx][sy + d];
            if (vCell && (vCell.hasFlag(CellFlags.WATER) || vCell.hasFlag(CellFlags.CHASM))) waterV++;
        }

        // If water runs horizontally (river flowing East-West), the bridge crosses vertically (North-South)
        // If water runs vertically (river flowing North-South), the bridge crosses horizontally (East-West)
        const crossAxis = (waterH >= waterV) ? "V" : "H";

        const deckCells = [];
        const railCells = [];
        const abutmentCells = [];

        if (crossAxis === "H") {
            // Horizontal bridge: Raycast West to find Shore A, Raycast East to find Shore B
            let westX = sx;
            while (westX > map.min_width + 1) {
                const c = map.map_cells[westX][sy];
                if (!c.hasFlag(CellFlags.WATER) && !c.hasFlag(CellFlags.CHASM)) break;
                westX--;
            }

            let eastX = sx;
            while (eastX < map.max_width - 2) {
                const c = map.map_cells[eastX][sy];
                if (!c.hasFlag(CellFlags.WATER) && !c.hasFlag(CellFlags.CHASM)) break;
                eastX++;
            }

            // Shore A is westX, Shore B is eastX
            const shoreA = map.map_cells[westX] && map.map_cells[westX][sy];
            const shoreB = map.map_cells[eastX] && map.map_cells[eastX][sy];
            if (!shoreA || !shoreB) return null;

            // Anchor abutments on solid ground
            shoreA.addFlag(CellFlags.STRUCTURE_PATH);
            shoreA.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF);
            abutmentCells.push(shoreA);

            shoreB.addFlag(CellFlags.STRUCTURE_PATH);
            shoreB.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF);
            abutmentCells.push(shoreB);

            // Lay continuous bridge deck from westX to eastX
            for (let x = westX + 1; x <= eastX - 1; x++) {
                const cell = map.map_cells[x] && map.map_cells[x][sy];
                if (!cell) continue;

                processedCoords.add(`${x},${sy}`);
                cell.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                cell.removeFlag(CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF);
                deckCells.push(cell);

                // Flank guide rails North and South
                for (const dy of [-1, 1]) {
                    const rail = map.map_cells[x] && map.map_cells[x][sy + dy];
                    if (rail && (rail.hasFlag(CellFlags.WATER) || rail.hasFlag(CellFlags.CHASM)) && !rail.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        rail.addFlag(CellFlags.STRUCTURE_WALL);
                        railCells.push(rail);
                    }
                }
            }
        } else {
            // Vertical bridge: Raycast North to find Shore A, Raycast South to find Shore B
            let northY = sy;
            while (northY > map.min_height + 1) {
                const c = map.map_cells[sx][northY];
                if (!c.hasFlag(CellFlags.WATER) && !c.hasFlag(CellFlags.CHASM)) break;
                northY--;
            }

            let southY = sy;
            while (southY < map.max_height - 2) {
                const c = map.map_cells[sx][southY];
                if (!c.hasFlag(CellFlags.WATER) && !c.hasFlag(CellFlags.CHASM)) break;
                southY++;
            }

            const shoreA = map.map_cells[sx] && map.map_cells[sx][northY];
            const shoreB = map.map_cells[sx] && map.map_cells[sx][southY];
            if (!shoreA || !shoreB) return null;

            // Anchor abutments on solid ground
            shoreA.addFlag(CellFlags.STRUCTURE_PATH);
            shoreA.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF);
            abutmentCells.push(shoreA);

            shoreB.addFlag(CellFlags.STRUCTURE_PATH);
            shoreB.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF);
            abutmentCells.push(shoreB);

            // Lay continuous bridge deck from northY to southY
            for (let y = northY + 1; y <= southY - 1; y++) {
                const cell = map.map_cells[sx] && map.map_cells[sx][y];
                if (!cell) continue;

                processedCoords.add(`${sx},${y}`);
                cell.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                cell.removeFlag(CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF);
                deckCells.push(cell);

                // Flank guide rails West and East
                for (const dx of [-1, 1]) {
                    const rail = map.map_cells[sx + dx] && map.map_cells[sx + dx][y];
                    if (rail && (rail.hasFlag(CellFlags.WATER) || rail.hasFlag(CellFlags.CHASM)) && !rail.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        rail.addFlag(CellFlags.STRUCTURE_WALL);
                        railCells.push(rail);
                    }
                }
            }
        }

        return {
            crossAxis,
            deckCells,
            railCells,
            abutmentCells,
            spanLength: deckCells.length
        };
    }

    /**
     * Stamps an individual bridge blueprint prefab at a specific coordinate.
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
            for (let y = instance.bounds.startY; y <= instance.bounds.endY; y++) {
                for (let x = instance.bounds.startX; x <= instance.bounds.endX; x++) {
                    const cell = map.map_cells[x] && map.map_cells[x][y];
                    if (cell && cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        cell.addFlag(CellFlags.STRUCTURE_BRIDGE);
                        cell.removeFlag(CellFlags.TERRAIN_CLIFF);
                    }
                }
            }
        }
        return instance;
    }

    /**
     * Re-evaluates passability and CSS decoration along all bridge, rail, and shoreline cells.
     * @param {mapObject} map 
     * @param {Array<cell_meta>} cells 
     */
    static recalculateCrossingPassability(map, cells) {
        const unique = new Set(cells);
        for (const cell of unique) {
            if (!cell) continue;
            cell.decorateCell([]);
            cell.determineNeighboursPassable(map);
            for (const n of cell.my_neighbours) {
                if (n && !unique.has(n)) {
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
