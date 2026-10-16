/**
 * Cell Bitmask Flags
 * Modern Entity-Component state representation using 32-bit integer bitmasks.
 */
const CellFlags = Object.freeze({
    NONE: 0,
    BLOCKED: 1 << 0,       // 1   - Stone barrier / impassable boundary
    GRASS: 1 << 1,         // 2   - Grass biome terrain
    TREE: 1 << 2,          // 4   - Choppable tree obstacle
    ENEMY: 1 << 3,         // 8   - Hostile NPC entity
    AGENT: 1 << 4,         // 16  - Player agent presence
    SELECTED: 1 << 5,      // 32  - Selected destination beacon
    SPECIAL: 1 << 6,       // 64  - Special interactive tile
    THINKING: 1 << 7,      // 128 - Agent thinking state
    WALKING: 1 << 8,       // 256 - Agent walking state
    // Structural Components (Phase 1 & 3)
    STRUCTURE_WALL: 1 << 9,     // 512   - Impassable structural wall
    STRUCTURE_FLOOR: 1 << 10,   // 1024  - Interior floor (wood plank / stone tile)
    STRUCTURE_DOOR: 1 << 11,    // 2048  - Ingress/egress doorway opening (default closed)
    STRUCTURE_DOOR_CLOSED: 1 << 11, // 2048 - Closed doorway (impassable without open action)
    STRUCTURE_ROOF: 1 << 12,    // 4096  - Overhead canopy / roof tile
    STRUCTURE_FIXTURE: 1 << 13, // 8192  - Internal fixture (chest, bench, hearth)
    STRUCTURE_PATH: 1 << 14,    // 16384 - Exterior gravel / stone pathway
    STRUCTURE_DOOR_OPEN: 1 << 15, // 32768 - Opened doorway (passable)
    STRUCTURE_BARRICADE: 1 << 16, // 65536 - Destructible wooden barricade
    // Terrain & Hydrological Components (Phase 1 & 3)
    WATER: 1 << 17,               // 131072 - Impassable aquatic cell
    WATER_SHALLOW: 1 << 18,       // 262144 - Wading water / ford (passable with penalty)
    TERRAIN_CLIFF: 1 << 19,       // 524288 - Impassable vertical cliff face
    STRUCTURE_BRIDGE: 1 << 20,    // 1048576 - Engineered river crossing deck
    TERRAIN_RAMP: 1 << 21,        // 2097152 - Ramp / stone steps connecting elevation tiers
    CHASM: 1 << 22,               // 4194304 - Impassable bottomless fissure/canyon void
    TERRAIN_FLORA: 1 << 23        // 8388608 - Riparian reeds/flora
});

/**
 * Mapping string names/aliases to bit flags for backwards compatibility
 */
const CellFlagAliases = Object.freeze({
    "CellDecoration": CellFlags.NONE,
    "cell": CellFlags.NONE,
    "BlockedDecoration": CellFlags.BLOCKED,
    "blocked": CellFlags.BLOCKED,
    "GrassDecoration": CellFlags.GRASS,
    "grass": CellFlags.GRASS,
    "TreeDecoration": CellFlags.TREE,
    "tree": CellFlags.TREE,
    "EnemyDecoration": CellFlags.ENEMY,
    "enemy": CellFlags.ENEMY,
    "AgentDecoration": CellFlags.AGENT,
    "agent": CellFlags.AGENT,
    "SelectedDecoration": CellFlags.SELECTED,
    "selected": CellFlags.SELECTED,
    "selectedDestination": CellFlags.SELECTED,
    "SpecialDecoration": CellFlags.SPECIAL,
    "special": CellFlags.SPECIAL,
    "ThinkingAgentDecoration": CellFlags.THINKING,
    "thinking": CellFlags.THINKING,
    "WalkingAgentDecoration": CellFlags.WALKING,
    "walking": CellFlags.WALKING,
    "StructureWall": CellFlags.STRUCTURE_WALL,
    "structure_wall": CellFlags.STRUCTURE_WALL,
    "wall": CellFlags.STRUCTURE_WALL,
    "StructureFloor": CellFlags.STRUCTURE_FLOOR,
    "structure_floor": CellFlags.STRUCTURE_FLOOR,
    "floor": CellFlags.STRUCTURE_FLOOR,
    "StructureDoor": CellFlags.STRUCTURE_DOOR,
    "structure_door": CellFlags.STRUCTURE_DOOR,
    "door": CellFlags.STRUCTURE_DOOR,
    "StructureDoorClosed": CellFlags.STRUCTURE_DOOR_CLOSED,
    "door_closed": CellFlags.STRUCTURE_DOOR_CLOSED,
    "StructureDoorOpen": CellFlags.STRUCTURE_DOOR_OPEN,
    "door_open": CellFlags.STRUCTURE_DOOR_OPEN,
    "StructureBarricade": CellFlags.STRUCTURE_BARRICADE,
    "barricade": CellFlags.STRUCTURE_BARRICADE,
    "StructureRoof": CellFlags.STRUCTURE_ROOF,
    "structure_roof": CellFlags.STRUCTURE_ROOF,
    "roof": CellFlags.STRUCTURE_ROOF,
    "StructureFixture": CellFlags.STRUCTURE_FIXTURE,
    "structure_fixture": CellFlags.STRUCTURE_FIXTURE,
    "fixture": CellFlags.STRUCTURE_FIXTURE,
    "StructurePath": CellFlags.STRUCTURE_PATH,
    "structure_path": CellFlags.STRUCTURE_PATH,
    "path": CellFlags.STRUCTURE_PATH,
    "WaterDecoration": CellFlags.WATER,
    "water": CellFlags.WATER,
    "WaterShallowDecoration": CellFlags.WATER_SHALLOW,
    "water_shallow": CellFlags.WATER_SHALLOW,
    "CliffDecoration": CellFlags.TERRAIN_CLIFF,
    "cliff": CellFlags.TERRAIN_CLIFF,
    "StructureBridge": CellFlags.STRUCTURE_BRIDGE,
    "bridge": CellFlags.STRUCTURE_BRIDGE,
    "TerrainRamp": CellFlags.TERRAIN_RAMP,
    "terrain_ramp": CellFlags.TERRAIN_RAMP,
    "ramp": CellFlags.TERRAIN_RAMP,
    "Chasm": CellFlags.CHASM,
    "chasm": CellFlags.CHASM,
    "TerrainFlora": CellFlags.TERRAIN_FLORA,
    "flora": CellFlags.TERRAIN_FLORA
});

// Expose globally for browser console and other modules
if (typeof window !== 'undefined') {
    window.CellFlags = CellFlags;
    window.CellFlagAliases = CellFlagAliases;
}

class cell_meta {
    flags = CellFlags.NONE;
    cell_element = null;
    my_x = 0;
    my_y = 0;
    my_cell_ref = 0;
    my_north = null;
    my_east = null;
    my_south = null;
    my_west = null;

    my_north_west = null;
    my_south_east = null;
    my_south_west = null;
    my_north_east = null;

    my_shortest_path = Number.MAX_SAFE_INTEGER;
    my_seed = 100;
    my_seed_ref = 0;
    my_step_option = [];
    my_neighbours = [];
    elevation = 1;
    cell = this; // Self-reference shim for legacy wrapper code

    constructor(element = null, my_x = 0, my_y = 0, my_cell_ref = 0, initialFlags = CellFlags.NONE) {
        this.cell_element = element;
        this.my_x = my_x;
        this.my_y = my_y;
        this.my_cell_ref = my_cell_ref;
        this.my_shortest_path = Number.MAX_SAFE_INTEGER;
        this.flags = initialFlags;
        this.elevation = 1;
        this.cell = this;
    }

    // --- Bitmask Flag API ---
    addFlag(flag) {
        if (typeof flag === 'string') flag = CellFlagAliases[flag] || 0;

        // Structure floor/wall overrides contradictory terrain elements
        if (flag & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL)) {
            this.flags &= ~(CellFlags.WATER | CellFlags.WATER_SHALLOW | CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM);
            if (this.elevation === 0) {
                this.elevation = 1; // dry ground foundation grade
            }
        }

        // Bridge deck clears cliff edges from crossing deck
        if (flag & CellFlags.STRUCTURE_BRIDGE) {
            this.flags &= ~CellFlags.TERRAIN_CLIFF;
        }

        // Structural paths clear trees and rocks
        if (flag & CellFlags.STRUCTURE_PATH) {
            this.flags &= ~(CellFlags.TREE | CellFlags.BLOCKED);
        }

        // Water cannot flood existing building structures
        if (flag & CellFlags.WATER) {
            if (this.flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL)) {
                return this; // Structure foundation blocks water
            }
            this.flags &= ~(CellFlags.TREE | CellFlags.BLOCKED);
        }

        this.flags |= flag;
        return this;
    }

    removeFlag(flag) {
        if (typeof flag === 'string') flag = CellFlagAliases[flag] || 0;
        this.flags &= ~flag;
        return this;
    }

    hasFlag(flag) {
        if (typeof flag === 'string') flag = CellFlagAliases[flag] || 0;
        return (this.flags & flag) !== 0;
    }

    toggleFlag(flag) {
        if (typeof flag === 'string') flag = CellFlagAliases[flag] || 0;
        this.flags ^= flag;
        return this;
    }

    setFlags(flags) {
        this.flags = flags;
        return this;
    }

    clearFlags() {
        this.flags = CellFlags.NONE;
        return this;
    }

    isBlockedType() {
        // Closed doors, barricades, and structural walls are impassable barriers
        if (this.flags & (CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_WALL)) return true;
        // Strict water crossing invariant: Water is strictly impassable unless covered by an engineered bridge deck
        if (this.flags & CellFlags.WATER) {
            return (this.flags & CellFlags.STRUCTURE_BRIDGE) === 0;
        }
        // Paths, bridges, ramps, and interior floors are always passable
        if (this.flags & (CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BRIDGE | CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_FLOOR)) return false;
        return (this.flags & (CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM)) !== 0;
    }

    // --- Compatibility Methods ---
    getCellMeta() {
        return this;
    }

    findDecoration(input) {
        if (typeof input === 'number') {
            return (this.flags & input) !== 0;
        }
        var flag = CellFlagAliases[input];
        if (flag !== undefined) {
            return (this.flags & flag) !== 0;
        }
        return false;
    }

    addDecoration(input) {
        return this.addFlag(input);
    }

    removeDecoration(input) {
        return this.removeFlag(input);
    }

    toDecoratorChainString() {
        console.log("Cell (" + this.my_x + "," + this.my_y + ") Flags: " + this.toDecoratorChainArray().join(", "));
    }

    toDecoratorChainArray(input = []) {
        input.push("cell_meta");
        if (this.flags & CellFlags.GRASS) input.push("GrassDecoration");
        if (this.flags & CellFlags.TREE) input.push("TreeDecoration");
        if (this.flags & CellFlags.BLOCKED) input.push("BlockedDecoration");
        if (this.flags & CellFlags.ENEMY) input.push("EnemyDecoration");
        if (this.flags & CellFlags.AGENT) input.push("AgentDecoration");
        if (this.flags & CellFlags.SELECTED) input.push("SelectedDecoration");
        if (this.flags & CellFlags.SPECIAL) input.push("SpecialDecoration");
        if (this.flags & CellFlags.THINKING) input.push("ThinkingAgentDecoration");
        if (this.flags & CellFlags.WALKING) input.push("WalkingAgentDecoration");
        if (this.flags & CellFlags.STRUCTURE_WALL) input.push("StructureWall");
        if (this.flags & CellFlags.STRUCTURE_FLOOR) input.push("StructureFloor");
        if (this.flags & CellFlags.STRUCTURE_DOOR) input.push("StructureDoor");
        if (this.flags & CellFlags.STRUCTURE_ROOF) input.push("StructureRoof");
        if (this.flags & CellFlags.STRUCTURE_FIXTURE) input.push("StructureFixture");
        if (this.flags & CellFlags.STRUCTURE_PATH) input.push("StructurePath");
        return input;
    }

    cloneCellMeta() {
        var clone = new cell_meta(this.cell_element, this.my_x, this.my_y, this.my_cell_ref, this.flags);
        clone.my_seed = this.my_seed;
        clone.my_seed_ref = this.my_seed_ref;
        clone.elevation = this.elevation;
        clone.my_step_option = this.my_step_option ? [...this.my_step_option] : [];
        clone.my_neighbours = this.my_neighbours ? [...this.my_neighbours] : [];
        clone.my_north = this.my_north;
        clone.my_south = this.my_south;
        clone.my_east = this.my_east;
        clone.my_west = this.my_west;
        clone.my_north_west = this.my_north_west;
        clone.my_north_east = this.my_north_east;
        clone.my_south_west = this.my_south_west;
        clone.my_south_east = this.my_south_east;
        return clone;
    }

    // --- Rendering / Styling ---
    decorateCell(input = []) {
        if (!this.cell_element) return;
        var classes = ["cell"];
        if (this.flags & CellFlags.GRASS) classes.push("grass");
        if (this.flags & CellFlags.TREE) classes.push("tree");
        if (this.flags & CellFlags.BLOCKED) classes.push("blocked");
        if (this.flags & CellFlags.ENEMY) classes.push("enemy");
        if (this.flags & CellFlags.AGENT) classes.push("agent");
        if (this.flags & CellFlags.SELECTED) classes.push("selectedDestination");
        if (this.flags & CellFlags.SPECIAL) classes.push("special");
        if (this.flags & CellFlags.THINKING) classes.push("thinking");
        if (this.flags & CellFlags.WALKING) classes.push("walking");
        // Structural CSS classes
        const hasStructure = (this.flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL)) !== 0;
        const hasBridge = (this.flags & CellFlags.STRUCTURE_BRIDGE) !== 0;

        if (this.flags & CellFlags.STRUCTURE_FLOOR) classes.push("structure_floor");
        if (this.flags & CellFlags.STRUCTURE_PATH) classes.push("structure_path");
        if (this.flags & CellFlags.STRUCTURE_WALL) classes.push("structure_wall");
        if (this.flags & CellFlags.STRUCTURE_DOOR_OPEN) {
            classes.push("structure_door", "open");
        } else if (this.flags & (CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR)) {
            classes.push("structure_door", "closed");
        }
        if (this.flags & CellFlags.STRUCTURE_FIXTURE) classes.push("structure_fixture");
        if (this.flags & CellFlags.STRUCTURE_BARRICADE) classes.push("structure_barricade");
        if (hasBridge) classes.push("structure_bridge");
        if (this.flags & CellFlags.TERRAIN_RAMP) classes.push("terrain_ramp");
        if (this.flags & CellFlags.CHASM && !hasBridge && !hasStructure) classes.push("chasm");
        if (this.flags & CellFlags.TERRAIN_FLORA && !hasStructure) classes.push("flora");

        if (this.elevation !== undefined && this.elevation !== 1 && !hasStructure) {
            classes.push(`elev_${this.elevation}`);
        }
        // Hydrology & Terrain CSS classes: DO NOT output water or cliff if a structure or bridge occupies the tile!
        if (this.flags & CellFlags.WATER && !hasStructure) {
            if (this.flags & CellFlags.WATER_SHALLOW) {
                classes.push("water_shallow");
            } else {
                classes.push("water");
            }
        }
        if (this.flags & CellFlags.TERRAIN_CLIFF && !hasStructure && !hasBridge) classes.push("cliff");

        if (Array.isArray(input)) {
            for (var i = 0; i < input.length; i++) {
                if (input[i] && !classes.includes(input[i])) {
                    classes.push(input[i]);
                }
            }
        }
        this.cell_element.setAttribute("class", classes.join(" "));
    }

    // --- Spatial & Distance ---
    getDistance(target_cell) {
        var target = (target_cell && typeof target_cell.getCellMeta === 'function') ? target_cell.getCellMeta() : target_cell;
        var x_distance = Math.abs(this.my_x - target.my_x);
        var y_distance = Math.abs(this.my_y - target.my_y);
        return parseFloat(Math.sqrt(x_distance * x_distance + y_distance * y_distance).toFixed(1));
    }

    determineNeighboursPassable(mapObject) {
        this.my_neighbours = [];
        this.my_step_option = [];
        this.my_north = null;
        this.my_east = null;
        this.my_south = null;
        this.my_west = null;
        this.my_north_west = null;
        this.my_north_east = null;
        this.my_south_west = null;
        this.my_south_east = null;

        var i = this.my_x;
        var j = this.my_y;

        if (i > mapObject.min_width) {
            this.my_neighbours.push(mapObject.map_cells[i - 1][j]);
        }
        if (i < mapObject.max_width - 1) {
            this.my_neighbours.push(mapObject.map_cells[i + 1][j]);
        }
        if (j > mapObject.min_height) {
            this.my_neighbours.push(mapObject.map_cells[i][j - 1]);
        }
        if (j < mapObject.max_height - 1) {
            this.my_neighbours.push(mapObject.map_cells[i][j + 1]);
        }

        const canStepInto = (c) => {
            if (!c) return false;
            if (!c.isBlockedType()) {
                const fromElev = this.elevation !== undefined ? this.elevation : 1;
                const toElev = c.elevation !== undefined ? c.elevation : 1;
                const delta = Math.abs(fromElev - toElev);
                if (delta > 0) {
                    if (delta > 1) return false; // Sheer cliff
                    const hasRamp = this.hasFlag(CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BRIDGE) ||
                                    c.hasFlag(CellFlags.TERRAIN_RAMP | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BRIDGE);
                    if (!hasRamp) return false;
                }
                return true;
            }
            return c.hasFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR);
        };

        // Cardinal directions
        if (i > mapObject.min_width && canStepInto(mapObject.map_cells[i - 1][j])) {
            this.my_west = mapObject.map_cells[i - 1][j];
            this.my_step_option.push(mapObject.map_cells[i - 1][j]);
        }
        if (i < mapObject.max_width - 1 && canStepInto(mapObject.map_cells[i + 1][j])) {
            this.my_east = mapObject.map_cells[i + 1][j];
            this.my_step_option.push(mapObject.map_cells[i + 1][j]);
        }
        if (j > mapObject.min_height && canStepInto(mapObject.map_cells[i][j - 1])) {
            this.my_north = mapObject.map_cells[i][j - 1];
            this.my_step_option.push(mapObject.map_cells[i][j - 1]);
        }
        if (j < mapObject.max_height - 1 && canStepInto(mapObject.map_cells[i][j + 1])) {
            this.my_south = mapObject.map_cells[i][j + 1];
            this.my_step_option.push(mapObject.map_cells[i][j + 1]);
        }

        // Diagonal directions (corner-cut protected)
        if (j > mapObject.min_height && canStepInto(mapObject.map_cells[i][j - 1])) {
            if (i > mapObject.min_width && canStepInto(mapObject.map_cells[i - 1][j])) {
                if (canStepInto(mapObject.map_cells[i - 1][j - 1])) {
                    this.my_north_west = mapObject.map_cells[i - 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j - 1]);
                }
            }
            if (i < mapObject.max_width - 1 && canStepInto(mapObject.map_cells[i + 1][j])) {
                if (canStepInto(mapObject.map_cells[i + 1][j - 1])) {
                    this.my_north_east = mapObject.map_cells[i + 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i + 1][j - 1]);
                }
            }
        }
        if (j < mapObject.max_height - 1 && canStepInto(mapObject.map_cells[i][j + 1])) {
            if (i > mapObject.min_width && canStepInto(mapObject.map_cells[i - 1][j])) {
                if (canStepInto(mapObject.map_cells[i - 1][j + 1])) {
                    this.my_south_west = mapObject.map_cells[i - 1][j + 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j + 1]);
                }
            }
            if (i < mapObject.max_width - 1 && canStepInto(mapObject.map_cells[i + 1][j])) {
                if (canStepInto(mapObject.map_cells[i + 1][j + 1])) {
                    this.my_south_east = mapObject.map_cells[i + 1][j + 1];
                    this.my_step_option.push(mapObject.map_cells[i + 1][j + 1]);
                }
            }
        }
    }

    // --- Interactive Anchor & Click Handling ---
    async setAnchor(e) {
        var elem = (this instanceof Element || (this && this.getAttribute)) ? this : this.cell_element;
        var frame_id = elem ? elem.getAttribute("meta-frame") : null;
        var target_cell = (frame_id !== null && typeof globalGridObject !== 'undefined' && globalGridObject.all_cells) 
            ? globalGridObject.all_cells[frame_id] 
            : this;

        if (!target_cell) return;

        // Tree interaction (Chopping or Navigation Probe)
        if (target_cell.hasFlag(CellFlags.TREE)) {
            await target_cell.handleTreeInteraction(elem, e);
            return;
        }

        // Enemy interaction (Encounter or Navigation Probe)
        if (target_cell.hasFlag(CellFlags.ENEMY)) {
            await target_cell.handleEnemyInteraction(elem, e);
            return;
        }

        // Doorway interaction (Open / Close or Navigation Probe)
        if (target_cell.hasFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_DOOR)) {
            await target_cell.handleDoorInteraction(elem, e);
            return;
        }

        // Barricade interaction (Destruction or Navigation Probe)
        if (target_cell.hasFlag(CellFlags.STRUCTURE_BARRICADE)) {
            await target_cell.handleBarricadeInteraction(elem, e);
            return;
        }

        // Fixture interaction (Chest / Shrine / Hearth inspection)
        if (target_cell.hasFlag(CellFlags.STRUCTURE_FIXTURE)) {
            await target_cell.handleFixtureInteraction(elem, e);
            return;
        }

        // Standard navigation anchor
        if (typeof agent !== 'undefined' && agent) {
            if (agent.agentCellOccupied) {
                agent.agentCellOccupied.addFlag(CellFlags.THINKING);
                agent.agentCellOccupied.decorateCell([]);
            }
            agent.destination = target_cell;
            setTimeout(function () {
                agent.requestPathFinder();
            });
        }
    }

    async handleTreeInteraction(elem, e) {
        var target_x = this.my_x;
        var target_y = this.my_y;
        var x_dist = Math.abs(agent.x - target_x);
        var y_dist = Math.abs(agent.y - target_y);
        var dist = Math.sqrt(x_dist * x_dist + y_dist * y_dist).toFixed(1);

        if (dist == 1 || dist == 1.4) {
            // Adjacent woodcutting: Chop tree into grass
            var map_cell = globalMapObject.map_cells[target_x][target_y];
            map_cell.removeFlag(CellFlags.TREE);
            this.removeFlag(CellFlags.TREE);
            this.decorateCell([]);
            map_cell.determineNeighboursPassable(globalMapObject);
            for (var i = 0; i < map_cell.my_neighbours.length; i++) {
                map_cell.my_neighbours[i].determineNeighboursPassable(globalMapObject);
            }
        } else {
            // Distant tree: Find closest walkable neighbor and navigate there
            var candidateOptions = (this.my_step_option && this.my_step_option.length > 0)
                ? this.my_step_option 
                : this.my_neighbours.filter(n => !n.isBlockedType());
            var pf = new pathfinder();
            var sortedOptions = pf.sortStepOptions(agent.agentCellOccupied.getCellMeta(), candidateOptions);
            for (var i = 0; i < sortedOptions.length; i++) {
                var probeTarget = sortedOptions[i].cell.getCellMeta();
                var reached = await probeTarget.setAnchorProbe(probeTarget.cell_element);
                if (reached) break;
            }
        }
    }

    async handleEnemyInteraction(elem, e) {
        var target_x = this.my_x;
        var target_y = this.my_y;
        var x_dist = Math.abs(agent.x - target_x);
        var y_dist = Math.abs(agent.y - target_y);
        var dist = Math.sqrt(x_dist * x_dist + y_dist * y_dist).toFixed(1);

        if (dist == 1 || dist == 1.4) {
            // Adjacent encounter: Clear enemy entity
            var map_cell = globalMapObject.map_cells[target_x][target_y];
            map_cell.removeFlag(CellFlags.ENEMY);
            this.removeFlag(CellFlags.ENEMY);
            this.decorateCell([]);
            map_cell.determineNeighboursPassable(globalMapObject);
            for (var i = 0; i < map_cell.my_neighbours.length; i++) {
                map_cell.my_neighbours[i].determineNeighboursPassable(globalMapObject);
            }
        } else {
            // Distant enemy: Find closest walkable neighbor and navigate there
            var candidateOptions = (this.my_step_option && this.my_step_option.length > 0)
                ? this.my_step_option 
                : this.my_neighbours.filter(n => !n.isBlockedType());
            var pf = new pathfinder();
            var sortedOptions = pf.sortStepOptions(agent.agentCellOccupied.getCellMeta(), candidateOptions);
            for (var i = 0; i < sortedOptions.length; i++) {
                var probeTarget = sortedOptions[i].cell.getCellMeta();
                var reached = await probeTarget.setAnchorProbe(probeTarget.cell_element);
                if (reached) break;
            }
        }
    }

    async setAnchorProbe(target) {
        if (typeof agent !== 'undefined' && agent) {
            if (agent.agentCellOccupied) {
                agent.agentCellOccupied.addFlag(CellFlags.THINKING);
                agent.agentCellOccupied.decorateCell([]);
            }
            agent.destination = target || this;
            return new Promise((resolve) => {
                setTimeout(function () {
                    var pathfinder_output = agent.requestPathFinder();
                    resolve(pathfinder_output);
                });
            });
        }
        return false;
    }

    toString() {
        return "X - " + this.my_x + "; Y - " + this.my_y + "; cell ref - " + this.my_cell_ref + "; flags - " + this.flags;
    }

    async handleDoorInteraction(elem, e) {
        var target_x = this.my_x;
        var target_y = this.my_y;
        var dist = Math.hypot(agent.x - target_x, agent.y - target_y);

        if (dist <= 1.5) {
            var map_cell = (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells[target_x]) 
                ? globalMapObject.map_cells[target_x][target_y] 
                : this;

            var isCurrentlyClosed = (this.flags & (CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR)) !== 0 
                && (this.flags & CellFlags.STRUCTURE_DOOR_OPEN) === 0;

            if (isCurrentlyClosed) {
                this.removeFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR);
                this.addFlag(CellFlags.STRUCTURE_DOOR_OPEN);
                if (map_cell !== this) {
                    map_cell.removeFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR);
                    map_cell.addFlag(CellFlags.STRUCTURE_DOOR_OPEN);
                }
                if (typeof StructureInteractionSystem !== 'undefined') {
                    StructureInteractionSystem.showToast("🚪 Opened door");
                }
            } else {
                this.removeFlag(CellFlags.STRUCTURE_DOOR_OPEN);
                this.addFlag(CellFlags.STRUCTURE_DOOR_CLOSED);
                if (map_cell !== this) {
                    map_cell.removeFlag(CellFlags.STRUCTURE_DOOR_OPEN);
                    map_cell.addFlag(CellFlags.STRUCTURE_DOOR_CLOSED);
                }
                if (typeof StructureInteractionSystem !== 'undefined') {
                    StructureInteractionSystem.showToast("🚪 Closed door");
                }
            }

            if (typeof globalMapObject !== 'undefined') {
                map_cell.determineNeighboursPassable(globalMapObject);
                for (var i = 0; i < map_cell.my_neighbours.length; i++) {
                    if (map_cell.my_neighbours[i]) {
                        map_cell.my_neighbours[i].determineNeighboursPassable(globalMapObject);
                    }
                }
            }

            this.decorateCell([]);
            if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof agent !== 'undefined' && agent) {
                globalGridObject.updateGrid(agent, true);
            }
        } else {
            var candidateOptions = (this.my_step_option && this.my_step_option.length > 0)
                ? this.my_step_option 
                : this.my_neighbours.filter(n => !n.isBlockedType());
            var pf = new pathfinder();
            var sortedOptions = pf.sortStepOptions(agent.agentCellOccupied.getCellMeta(), candidateOptions);
            for (var i = 0; i < sortedOptions.length; i++) {
                var probeTarget = sortedOptions[i].cell.getCellMeta();
                var reached = await probeTarget.setAnchorProbe(probeTarget.cell_element);
                if (reached) break;
            }
        }
    }

    async handleBarricadeInteraction(elem, e) {
        var target_x = this.my_x;
        var target_y = this.my_y;
        var dist = Math.hypot(agent.x - target_x, agent.y - target_y);

        if (dist <= 1.5) {
            var map_cell = (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells[target_x]) 
                ? globalMapObject.map_cells[target_x][target_y] 
                : this;

            this.durability = (this.durability !== undefined ? this.durability : 3) - 1;
            map_cell.durability = this.durability;

            if (this.durability > 0) {
                if (typeof StructureInteractionSystem !== 'undefined') {
                    StructureInteractionSystem.showToast(`💥 Damaged barricade (${this.durability}/3)`);
                }
            } else {
                this.removeFlag(CellFlags.STRUCTURE_BARRICADE);
                this.addFlag(CellFlags.STRUCTURE_PATH);
                if (map_cell !== this) {
                    map_cell.removeFlag(CellFlags.STRUCTURE_BARRICADE);
                    map_cell.addFlag(CellFlags.STRUCTURE_PATH);
                }

                if (typeof globalMapObject !== 'undefined') {
                    map_cell.determineNeighboursPassable(globalMapObject);
                    for (var i = 0; i < map_cell.my_neighbours.length; i++) {
                        if (map_cell.my_neighbours[i]) {
                            map_cell.my_neighbours[i].determineNeighboursPassable(globalMapObject);
                        }
                    }
                }
                this.decorateCell([]);
                if (typeof StructureInteractionSystem !== 'undefined') {
                    StructureInteractionSystem.showToast("🪓 Smashed barricade! Pathway cleared.");
                }
                if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof agent !== 'undefined' && agent) {
                    globalGridObject.updateGrid(agent, true);
                }
            }
        } else {
            var candidateOptions = (this.my_step_option && this.my_step_option.length > 0)
                ? this.my_step_option 
                : this.my_neighbours.filter(n => !n.isBlockedType());
            var pf = new pathfinder();
            var sortedOptions = pf.sortStepOptions(agent.agentCellOccupied.getCellMeta(), candidateOptions);
            for (var i = 0; i < sortedOptions.length; i++) {
                var probeTarget = sortedOptions[i].cell.getCellMeta();
                var reached = await probeTarget.setAnchorProbe(probeTarget.cell_element);
                if (reached) break;
            }
        }
    }

    async handleFixtureInteraction(elem, e) {
        var target_x = this.my_x;
        var target_y = this.my_y;
        var dist = Math.hypot(agent.x - target_x, agent.y - target_y);

        if (dist <= 1.5) {
            if (typeof StructureInteractionSystem !== 'undefined') {
                StructureInteractionSystem.inspectFixture(this);
            }
        } else {
            var candidateOptions = (this.my_step_option && this.my_step_option.length > 0)
                ? this.my_step_option 
                : this.my_neighbours.filter(n => !n.isBlockedType());
            var pf = new pathfinder();
            var sortedOptions = pf.sortStepOptions(agent.agentCellOccupied.getCellMeta(), candidateOptions);
            for (var i = 0; i < sortedOptions.length; i++) {
                var probeTarget = sortedOptions[i].cell.getCellMeta();
                var reached = await probeTarget.setAnchorProbe(probeTarget.cell_element);
                if (reached) break;
            }
        }
    }
}
