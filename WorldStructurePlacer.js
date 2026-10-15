/**
 * World Structure Placer (Phase 2)
 * Biome-aware procedural placement engine with Poisson-disk clearance and dynamic trail networking.
 */

class WorldStructurePlacer {
    /**
     * Checks whether a candidate origin satisfies the minimum Euclidean clearance distance.
     * @param {Array<Object>} existingInstances 
     * @param {number} x 
     * @param {number} y 
     * @param {number} minDistance 
     * @returns {boolean}
     */
    static hasClearance(existingInstances, x, y, minDistance = 12) {
        if (!existingInstances || existingInstances.length === 0) return true;
        for (const inst of existingInstances) {
            const dist = Math.hypot(x - inst.originX, y - inst.originY);
            if (dist < minDistance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Evaluates the dominant biome and obstacle densities within a candidate footprint.
     * @param {mapObject} map 
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} w 
     * @param {number} h 
     * @returns {Object}
     */
    static evaluateBiomeFitness(map, startX, startY, w, h) {
        let grassCount = 0;
        let treeCount = 0;
        let blockedCount = 0;
        let total = w * h;

        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (!cell) continue;

                if (cell.hasFlag(CellFlags.GRASS)) grassCount++;
                if (cell.hasFlag(CellFlags.TREE)) treeCount++;
                if (cell.hasFlag(CellFlags.BLOCKED)) blockedCount++;
            }
        }

        let dominant = "grass";
        if (treeCount > grassCount * 0.4) dominant = "forest";
        else if (blockedCount > total * 0.25) dominant = "rocky";

        return {
            dominant: dominant,
            grassRatio: grassCount / total,
            treeRatio: treeCount / total,
            blockedRatio: blockedCount / total
        };
    }

    /**
     * Finds the primary doorway coordinate of a stamped structure instance.
     * @param {mapObject} map 
     * @param {Object} instance 
     * @returns {{x: number, y: number}|null}
     */
    static findDoorway(map, instance) {
        if (!instance || !instance.bounds) return null;
        const b = instance.bounds;
        for (let y = b.startY; y <= b.endY; y++) {
            for (let x = b.startX; x <= b.endX; x++) {
                const cell = map.map_cells[x] && map.map_cells[x][y];
                if (cell && cell.hasFlag(CellFlags.STRUCTURE_DOOR)) {
                    return { x: x, y: y };
                }
            }
        }
        // Fallback: return bottom-center coordinate
        return { x: Math.floor((b.startX + b.endX) / 2), y: b.endY };
    }

    /**
     * Procedurally carves a connecting gravel trail between two map coordinates.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} from 
     * @param {{x: number, y: number}} to 
     */
    static carveTrail(map, from, to) {
        if (!from || !to) return;

        let curX = from.x;
        let curY = from.y;
        const trailCells = [];

        // Simple Bresenham-style stepped path carving
        while (curX !== to.x || curY !== to.y) {
            const dx = Math.sign(to.x - curX);
            const dy = Math.sign(to.y - curY);

            // Step either horizontally, vertically, or diagonally
            const rngVal = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            if (curX !== to.x && (curY === to.y || rngVal > 0.5)) {
                curX += dx;
            } else if (curY !== to.y) {
                curY += dy;
            }

            const cell = map.map_cells[curX] && map.map_cells[curX][curY];
            if (cell) {
                // Do not overwrite walls or interior floors
                if (!cell.hasFlag(CellFlags.STRUCTURE_WALL) && !cell.hasFlag(CellFlags.STRUCTURE_FLOOR)) {
                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.STRUCTURE_PATH);
                    if (cell.hasFlag(CellFlags.WATER)) {
                        cell.addFlag(CellFlags.STRUCTURE_BRIDGE);
                    }
                    if (trailCells.length > 0) {
                        const prev = trailCells[trailCells.length - 1];
                        if (Math.abs((prev.elevation || 1) - (cell.elevation || 1)) >= 1) {
                            prev.addFlag(CellFlags.TERRAIN_RAMP);
                            cell.addFlag(CellFlags.TERRAIN_RAMP);
                        }
                    }
                    trailCells.push(cell);
                    cell.decorateCell([]);
                }
            }
        }

        // Recompute passability along trail and its immediate neighbors
        for (const cell of trailCells) {
            cell.determineNeighboursPassable(map);
            for (const n of cell.my_neighbours) {
                if (n) n.determineNeighboursPassable(map);
            }
        }
    }

    /**
     * Seeds the game world with an organically populated network of structures and trails.
     * @param {mapObject} map 
     * @param {Object} options 
     * @returns {Array<Object>} placed structures
     */
    static populateWorld(map, options = {}) {
        const minClearance = options.minClearance || 12;
        map.structures = map.structures || [];
        const placed = [];

        // 1. Starter Settlement: Stamped near spawn in open grass
        const starter = StructureStamper.stampStarterSettlement(map);
        for (const s of starter) {
            placed.push(s);
        }

        // 2. Procedural BSP Dungeon Complex (e.g. 13x13 multi-room ruins)
        let dungeonInstance = null;
        const dungeonBP = BSPStructureGenerator.generateDungeon({
            width: 13,
            height: 13,
            depth: 3,
            name: "Sunken Catacombs",
            id: "bsp_dungeon_catacombs",
            rng: () => (map && typeof map.getRandom === 'function' ? map.getRandom() : Math.random())
        });

        // Search for a suitable placement away from player
        const dungeonCandidates = [
            { x: -16, y: 14 },
            { x: 16, y: 16 },
            { x: -18, y: -16 },
            { x: 18, y: -16 }
        ];

        for (const cand of dungeonCandidates) {
            if (this.hasClearance(placed, cand.x, cand.y, minClearance)) {
                if (StructureStamper.canPlace(map, dungeonBP, cand.x, cand.y)) {
                    dungeonInstance = StructureStamper.stamp(map, dungeonBP, cand.x, cand.y);
                    if (dungeonInstance) {
                        placed.push(dungeonInstance);
                        break;
                    }
                }
            }
        }

        // 3. Biome-Aware Scattered Outposts
        const outposts = [
            { bp: StructureLibrary.LumberCamp.clone(), preferred: "forest" },
            { bp: StructureLibrary.StoneWatchtower.clone().rotate(180), preferred: "rocky" },
            { bp: StructureLibrary.AncientShrine.clone().rotate(90), preferred: "grass" },
            { bp: StructureLibrary.WoodlandCabin.clone().rotate(270), preferred: "grass" }
        ];

        for (const item of outposts) {
            for (let attempt = 0; attempt < 35; attempt++) {
                const minX = map.min_width + 8;
                const maxX = map.max_width - 8;
                const minY = map.min_height + 8;
                const maxY = map.max_height - 8;

                let rx, ry;
                if (map && typeof map.getCandidateCoord === 'function') {
                    const coord = map.getCandidateCoord(item.bp.id, attempt, minX, maxX, minY, maxY);
                    rx = coord.x;
                    ry = coord.y;
                } else {
                    rx = Math.floor(Math.random() * (maxX - minX)) + minX;
                    ry = Math.floor(Math.random() * (maxY - minY)) + minY;
                }

                if (!this.hasClearance(placed, rx, ry, minClearance)) continue;

                const fitness = this.evaluateBiomeFitness(map, rx - item.bp.origin.x, ry - item.bp.origin.y, item.bp.width, item.bp.height);
                if (fitness.dominant === item.preferred || attempt > 20) {
                    if (StructureStamper.canPlace(map, item.bp, rx, ry)) {
                        const inst = StructureStamper.stamp(map, item.bp, rx, ry);
                        if (inst) {
                            placed.push(inst);
                            break;
                        }
                    }
                }
            }
        }

        // 4. Connect Doorways via Procedural Trails
        if (placed.length >= 2) {
            const cabin = placed[0]; // Starter cabin
            const cabinDoor = this.findDoorway(map, cabin);

            // Connect starter cabin to 2 nearest neighbor structures
            for (let i = 1; i < Math.min(placed.length, 3); i++) {
                const targetDoor = this.findDoorway(map, placed[i]);
                if (cabinDoor && targetDoor) {
                    this.carveTrail(map, cabinDoor, targetDoor);
                }
            }
        }

        // Final full-map passability sync
        for (let i = map.min_width; i < map.max_width; i++) {
            for (let j = map.min_height; j < map.max_height; j++) {
                const c = map.map_cells[i] && map.map_cells[i][j];
                if (c) c.determineNeighboursPassable(map);
            }
        }

        if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof agent !== 'undefined' && agent) {
            globalGridObject.updateGrid(agent, true);
        }

        console.log(`[WorldStructurePlacer] World population complete. Placed ${placed.length} structures and connected trail network.`);
        return placed;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.WorldStructurePlacer = WorldStructurePlacer;
}
