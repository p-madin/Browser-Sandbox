/**
 * Structure Stamper Service (Phase 1)
 * Validates, applies, and updates neighbor passability for multi-tile blueprints.
 */

class StructureStamper {
    /**
     * Checks whether a blueprint can be legally placed at the given map origin.
     * @param {mapObject} map 
     * @param {StructureBlueprint} blueprint 
     * @param {number} originX 
     * @param {number} originY 
     * @returns {boolean}
     */
    static canPlace(map, blueprint, originX, originY) {
        if (!map || !blueprint) return false;

        const startX = originX - blueprint.origin.x;
        const startY = originY - blueprint.origin.y;
        const endX = startX + blueprint.width - 1;
        const endY = startY + blueprint.height - 1;

        // 1. Boundary check: must fit within map dimensions with a 1-tile safety margin
        if (startX < map.min_width + 1 || endX >= map.max_width - 1 ||
            startY < map.min_height + 1 || endY >= map.max_height - 1) {
            return false;
        }

        // 2. Collision check: must not overlap existing structural walls or floors, and obey terrain constraints
        const tags = blueprint.tags || [];
        const isBridge = tags.includes("bridge") || tags.includes("infrastructure") || blueprint.category === "infrastructure";
        const isWaterfront = tags.includes("hydrology") || tags.includes("fishing") || blueprint.id === "watermill" || blueprint.id === "fishing_pier";

        let waterCount = 0;
        let chasmCount = 0;
        let cliffCount = 0;
        let doorCoord = null;

        for (let x = 0; x < blueprint.width; x++) {
            for (let y = 0; y < blueprint.height; y++) {
                const mx = startX + x;
                const my = startY + y;

                if (!map.map_cells[mx] || !map.map_cells[mx][my]) {
                    return false;
                }

                const cell = map.map_cells[mx][my];
                // Check if already contains structural elements
                if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR)) {
                    return false;
                }

                if (cell.hasFlag(CellFlags.WATER)) waterCount++;
                if (cell.hasFlag(CellFlags.CHASM)) chasmCount++;
                if (cell.hasFlag(CellFlags.TERRAIN_CLIFF)) cliffCount++;

                // Track doorway location if any
                if (blueprint.layers.walls && blueprint.layers.walls[y] && blueprint.layers.walls[y][x] === "D") {
                    doorCoord = { x: mx, y: my, localX: x, localY: y };
                }
            }
        }

        // Terrain rules:
        // A. Dry terrestrial structures must have 0% water and 0% chasm
        if (!isBridge && !isWaterfront) {
            if (waterCount > 0 || chasmCount > 0) {
                return false;
            }
            if (cliffCount > 0) {
                return false; // Cannot build dry buildings on sheer cliff edges
            }
        }

        // B. Waterfront structures require water contact, but cannot be built in chasms
        if (isWaterfront) {
            if (chasmCount > 0) return false;
            if (waterCount === 0) return false; // Must touch water
        }

        // C. Doorway egress clearance: ensure doorway does not exit into deep water, chasm, or solid wall
        if (doorCoord && !isBridge) {
            let exitDx = 0, exitDy = 0;
            if (doorCoord.localY === blueprint.height - 1) exitDy = 1;
            else if (doorCoord.localY === 0) exitDy = -1;
            else if (doorCoord.localX === 0) exitDx = -1;
            else if (doorCoord.localX === blueprint.width - 1) exitDx = 1;

            const exitCell = map.map_cells[doorCoord.x + exitDx] && map.map_cells[doorCoord.x + exitDx][doorCoord.y + exitDy];
            if (exitCell) {
                if (exitCell.hasFlag(CellFlags.CHASM) || exitCell.hasFlag(CellFlags.STRUCTURE_WALL)) {
                    return false;
                }
                if (!isWaterfront && exitCell.hasFlag(CellFlags.WATER)) {
                    return false; // Dry structure doorway cannot open into water
                }
            }
        }

        // 3. Player collision check: do not stamp impassable walls directly on the player
        if (typeof agent !== 'undefined' && agent) {
            const playerX = agent.x;
            const playerY = agent.y;
            if (playerX >= startX && playerX <= endX && playerY >= startY && playerY <= endY) {
                const localX = playerX - startX;
                const localY = playerY - startY;
                if (blueprint.layers.walls && blueprint.layers.walls[localY]) {
                    const token = blueprint.layers.walls[localY][localX];
                    if (token === "W" || token === "B") {
                        return false; // Would trap or crush the player in a wall or barricade
                    }
                }
            }
        }

        return true;
    }

    /**
     * Stamps a blueprint onto the map, clearing natural obstacles and updating neighbor passability.
     * @param {mapObject} map 
     * @param {StructureBlueprint} blueprint 
     * @param {number} originX 
     * @param {number} originY 
     * @returns {Object|null} StructureInstance or null if placement failed
     */
    static stamp(map, blueprint, originX, originY) {
        if (!this.canPlace(map, blueprint, originX, originY)) {
            console.warn(`[StructureStamper] Cannot place '${blueprint.name}' at (${originX}, ${originY})`);
            return null;
        }

        const startX = originX - blueprint.origin.x;
        const startY = originY - blueprint.origin.y;
        const endX = startX + blueprint.width - 1;
        const endY = startY + blueprint.height - 1;

        const instanceId = `${blueprint.id}_${originX}_${originY}`;
        const affectedCells = [];

        // 1. Foundation Leveling: Determine uniform foundation elevation for the building footprint
        const elevations = [];
        for (let y = 0; y < blueprint.height; y++) {
            for (let x = 0; x < blueprint.width; x++) {
                const c = map.map_cells[startX + x] && map.map_cells[startX + x][startY + y];
                if (c && c.elevation !== undefined && !c.hasFlag(CellFlags.WATER)) {
                    elevations.push(c.elevation);
                }
            }
        }
        const foundationElev = elevations.length > 0 
            ? elevations.sort((a, b) => a - b)[Math.floor(elevations.length / 2)] 
            : 1;

        // Level foundation grade and clear cliff seams across the footprint
        for (let y = 0; y < blueprint.height; y++) {
            for (let x = 0; x < blueprint.width; x++) {
                const cell = map.map_cells[startX + x][startY + y];
                cell.elevation = foundationElev;
                cell.removeFlag(CellFlags.TERRAIN_CLIFF | CellFlags.TREE | CellFlags.BLOCKED);
            }
        }

        let doorwayCoord = null;
        let doorwayLocal = null;

        // Apply layers
        for (let y = 0; y < blueprint.height; y++) {
            for (let x = 0; x < blueprint.width; x++) {
                const mx = startX + x;
                const my = startY + y;
                const cell = map.map_cells[mx][my];

                // Clear natural trees, rocks, and water
                cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.WATER | CellFlags.WATER_SHALLOW);

                // Apply floor layer
                if (blueprint.layers.floor && blueprint.layers.floor[y] && blueprint.layers.floor[y][x]) {
                    cell.addFlag(CellFlags.STRUCTURE_FLOOR);
                }

                // Apply walls/fixtures/doors/barricades layer
                const wallToken = blueprint.layers.walls && blueprint.layers.walls[y] ? blueprint.layers.walls[y][x] : 0;
                if (wallToken === "W") {
                    cell.addFlag(CellFlags.STRUCTURE_WALL);
                } else if (wallToken === "D") {
                    cell.addFlag(CellFlags.STRUCTURE_DOOR);
                    doorwayCoord = { x: mx, y: my };
                    doorwayLocal = { x: x, y: y };
                } else if (wallToken === "F") {
                    cell.addFlag(CellFlags.STRUCTURE_FIXTURE);
                } else if (wallToken === "P") {
                    cell.addFlag(CellFlags.STRUCTURE_PATH);
                } else if (wallToken === "B") {
                    cell.addFlag(CellFlags.STRUCTURE_BARRICADE);
                    cell.durability = 3;
                }

                // Apply roof layer
                if (blueprint.layers.roof && blueprint.layers.roof[y] && blueprint.layers.roof[y][x]) {
                    cell.addFlag(CellFlags.STRUCTURE_ROOF);
                }

                cell.structureId = instanceId;
                affectedCells.push(cell);

                // Update visual representation if rendered
                cell.decorateCell([]);
            }
        }

        // 2. Doorway Threshold Ramp: If the doorway steps out onto a differing elevation tier, attach a threshold ramp
        if (doorwayCoord && doorwayLocal) {
            let exitDx = 0, exitDy = 0;
            if (doorwayLocal.y === blueprint.height - 1) exitDy = 1;
            else if (doorwayLocal.y === 0) exitDy = -1;
            else if (doorwayLocal.x === 0) exitDx = -1;
            else if (doorwayLocal.x === blueprint.width - 1) exitDx = 1;

            const exitCell = map.map_cells[doorwayCoord.x + exitDx] && map.map_cells[doorwayCoord.x + exitDx][doorwayCoord.y + exitDy];
            if (exitCell && Math.abs((exitCell.elevation || 1) - foundationElev) >= 1) {
                const doorCell = map.map_cells[doorwayCoord.x][doorwayCoord.y];
                doorCell.addFlag(CellFlags.TERRAIN_RAMP);
                exitCell.addFlag(CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_PATH);
                exitCell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                doorCell.decorateCell([]);
                exitCell.decorateCell([]);
            }
        }

        // Recompute neighbor graph for all cells in footprint plus a 1-tile border
        for (let ix = startX - 1; ix <= endX + 1; ix++) {
            for (let iy = startY - 1; iy <= endY + 1; iy++) {
                if (map.map_cells[ix] && map.map_cells[ix][iy]) {
                    map.map_cells[ix][iy].determineNeighboursPassable(map);
                }
            }
        }

        // Create structure tracking record
        const instance = {
            id: instanceId,
            blueprintId: blueprint.id,
            name: blueprint.name,
            originX: originX,
            originY: originY,
            bounds: { startX, startY, endX, endY },
            blueprint: blueprint.clone(),
            cells: affectedCells,
            cellsCount: affectedCells.length
        };

        map.structures = map.structures || [];
        map.structures.push(instance);

        if (typeof StructureRegistry !== 'undefined') {
            StructureRegistry.registerStructure(instance);
        }

        // Re-render active grid if player is present
        if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof agent !== 'undefined' && agent) {
            globalGridObject.updateGrid(agent, true);
        }

        console.log(`[StructureStamper] Successfully stamped '${blueprint.name}' at (${originX}, ${originY})`);
        return instance;
    }

    /**
     * Attempts to stamp a blueprint at a random valid location.
     * @param {mapObject} map 
     * @param {StructureBlueprint} blueprint 
     * @param {number} maxAttempts 
     * @param {string|null} preferredBiome "grass" or null
     * @returns {Object|null}
     */
    static stampRandom(map, blueprint, maxAttempts = 50, preferredBiome = null) {
        for (let i = 0; i < maxAttempts; i++) {
            const minX = map.min_width + blueprint.width;
            const maxX = map.max_width - blueprint.width * 2;
            const minY = map.min_height + blueprint.height;
            const maxY = map.max_height - blueprint.height * 2;

            let rx, ry;
            if (map && typeof map.getCandidateCoord === 'function') {
                const coord = map.getCandidateCoord(blueprint.id, i, minX, maxX, minY, maxY);
                rx = coord.x;
                ry = coord.y;
            } else {
                rx = Math.floor(Math.random() * (maxX - minX)) + minX;
                ry = Math.floor(Math.random() * (maxY - minY)) + minY;
            }

            if (preferredBiome === "grass") {
                const cell = map.map_cells[rx] && map.map_cells[rx][ry];
                if (!cell || !cell.hasFlag(CellFlags.GRASS)) {
                    continue;
                }
            }

            const instance = this.stamp(map, blueprint, rx, ry);
            if (instance) {
                return instance;
            }
        }
        return null;
    }

    /**
     * Stamped starter set of structures into the map during initial world generation.
     * @param {mapObject} map 
     * @returns {Array<Object>} list of stamped structures
     */
    static stampStarterSettlement(map) {
        const stamped = [];

        // 1. Woodland Cabin: Near spawn in a grassy area
        let cabinInstance = null;
        // Search in a ring around spawn (distance 5 to 12)
        for (let r = 5; r <= 15; r += 2) {
            const candidates = [
                { x: r, y: r },
                { x: r, y: -r },
                { x: -r, y: r },
                { x: -r, y: -r },
                { x: r + 2, y: 1 },
                { x: 1, y: r + 2 }
            ];
            for (const c of candidates) {
                const cell = map.map_cells[c.x] && map.map_cells[c.x][c.y];
                if (cell && cell.hasFlag(CellFlags.GRASS)) {
                    cabinInstance = this.stamp(map, StructureLibrary.WoodlandCabin, c.x, c.y);
                    if (cabinInstance) break;
                }
            }
            if (cabinInstance) break;
        }

        // Fallback random placement if candidate positions were blocked
        if (!cabinInstance) {
            cabinInstance = this.stampRandom(map, StructureLibrary.WoodlandCabin, 30, "grass");
        }
        if (cabinInstance) stamped.push(cabinInstance);

        // 2. Stone Watchtower: Fortified outpost in the northern territory
        const tower = StructureLibrary.StoneWatchtower.clone();
        let towerInstance = this.stamp(map, tower, -10, -12);
        if (!towerInstance) {
            towerInstance = this.stampRandom(map, tower, 30);
        }
        if (towerInstance) stamped.push(towerInstance);

        // 3. Ancient Shrine: Mystic ruins in the south-east territory
        const shrine = StructureLibrary.AncientShrine.clone();
        let shrineInstance = this.stamp(map, shrine, 14, -10);
        if (!shrineInstance) {
            shrineInstance = this.stampRandom(map, shrine, 30);
        }
        if (shrineInstance) stamped.push(shrineInstance);

        // 4. Lumber Camp: Workstation in the western territory
        const camp = StructureLibrary.LumberCamp.clone();
        let campInstance = this.stamp(map, camp, -14, 10);
        if (!campInstance) {
            campInstance = this.stampRandom(map, camp, 30);
        }
        if (campInstance) stamped.push(campInstance);

        console.log(`[StructureStamper] Starter settlement generation complete. ${stamped.length} structures placed.`);
        return stamped;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.StructureStamper = StructureStamper;
}
