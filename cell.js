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
    WALKING: 1 << 8        // 256 - Agent walking state
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
    "walking": CellFlags.WALKING
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
    cell = this; // Self-reference shim for legacy wrapper code

    constructor(element = null, my_x = 0, my_y = 0, my_cell_ref = 0, initialFlags = CellFlags.NONE) {
        this.cell_element = element;
        this.my_x = my_x;
        this.my_y = my_y;
        this.my_cell_ref = my_cell_ref;
        this.my_shortest_path = Number.MAX_SAFE_INTEGER;
        this.flags = initialFlags;
        this.cell = this;
    }

    // --- Bitmask Flag API ---
    addFlag(flag) {
        if (typeof flag === 'string') flag = CellFlagAliases[flag] || 0;
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
        return (this.flags & (CellFlags.BLOCKED | CellFlags.TREE)) !== 0;
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
        return input;
    }

    cloneCellMeta() {
        var clone = new cell_meta(this.cell_element, this.my_x, this.my_y, this.my_cell_ref, this.flags);
        clone.my_seed = this.my_seed;
        clone.my_seed_ref = this.my_seed_ref;
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

        // Cardinal directions
        if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j].isBlockedType()) {
            this.my_west = mapObject.map_cells[i - 1][j];
            this.my_step_option.push(mapObject.map_cells[i - 1][j]);
        }
        if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j].isBlockedType()) {
            this.my_east = mapObject.map_cells[i + 1][j];
            this.my_step_option.push(mapObject.map_cells[i + 1][j]);
        }
        if (j > mapObject.min_height && !mapObject.map_cells[i][j - 1].isBlockedType()) {
            this.my_north = mapObject.map_cells[i][j - 1];
            this.my_step_option.push(mapObject.map_cells[i][j - 1]);
        }
        if (j < mapObject.max_height - 1 && !mapObject.map_cells[i][j + 1].isBlockedType()) {
            this.my_south = mapObject.map_cells[i][j + 1];
            this.my_step_option.push(mapObject.map_cells[i][j + 1]);
        }

        // Diagonal directions (corner-cut protected)
        if (j > mapObject.min_height && !mapObject.map_cells[i][j - 1].isBlockedType()) {
            if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j].isBlockedType()) {
                if (!mapObject.map_cells[i - 1][j - 1].isBlockedType()) {
                    this.my_north_west = mapObject.map_cells[i - 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j - 1]);
                }
            }
            if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j].isBlockedType()) {
                if (!mapObject.map_cells[i + 1][j - 1].isBlockedType()) {
                    this.my_north_east = mapObject.map_cells[i + 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i + 1][j - 1]);
                }
            }
        }
        if (j < mapObject.max_height - 1 && !mapObject.map_cells[i][j + 1].isBlockedType()) {
            if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j].isBlockedType()) {
                if (!mapObject.map_cells[i - 1][j + 1].isBlockedType()) {
                    this.my_south_west = mapObject.map_cells[i - 1][j + 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j + 1]);
                }
            }
            if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j].isBlockedType()) {
                if (!mapObject.map_cells[i + 1][j + 1].isBlockedType()) {
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
}
