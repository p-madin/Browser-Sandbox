class cell_meta {
    cell_element;
    my_x = 0;
    my_y = 0;
    my_cell_ref = 0;
    my_north;
    my_east;
    my_south;
    my_west;

    my_north_west;
    my_south_east;
    my_south_west;
    my_north_east;

    my_shortest_path;
    my_seed;
    my_seed_ref;
    my_step_option = new Array();
    my_neighbours = new Array();
    self;
    constructor(element, my_x, my_y, my_cell_ref) {
        this.cell_element = element;
        this.my_x = my_x;
        this.my_y = my_y;
        this.my_cell_ref = my_cell_ref;
        this.my_shortest_path = Number.MAX_SAFE_INTEGER;
        self = this;
    }
    determineNeighboursPassable(mapObject) {
        //console.log("finding neighbours");
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

        if (j > mapObject.min_height && !mapObject.map_cells[i][j - 1].isBlockedType()) {
            if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j].isBlockedType()) {
                if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j - 1].isBlockedType()) {
                    this.my_north_west = mapObject.map_cells[i - 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j - 1]);
                }
            }
            if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j].isBlockedType()) {
                if (j > mapObject.min_height && !mapObject.map_cells[i + 1][j - 1].isBlockedType()) {
                    this.my_north_east = mapObject.map_cells[i + 1][j - 1];
                    this.my_step_option.push(mapObject.map_cells[i + 1][j - 1]);
                }
            }
        }
        if (j < mapObject.max_height - 1 && !mapObject.map_cells[i][j + 1].isBlockedType()) {
            if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j].isBlockedType()) {
                if (i > mapObject.min_width && !mapObject.map_cells[i - 1][j + 1].isBlockedType()) {
                    this.my_south_west = mapObject.map_cells[i - 1][j + 1];
                    this.my_step_option.push(mapObject.map_cells[i - 1][j + 1]);
                }
            }
            if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j].isBlockedType()) {
                if (i < mapObject.max_width - 1 && !mapObject.map_cells[i + 1][j + 1].isBlockedType()) {
                    this.my_south_east = mapObject.map_cells[i + 1][j + 1];
                    this.my_step_option.push(mapObject.map_cells[i + 1][j + 1]);
                }
            }
        }

    }
    setAnchor(e) {
        agent.agentCellOccupied = new ThinkingAgentDecoration(agent.agentCellOccupied);
        agent.agentCellOccupied.decorateCell(new Array());
        console.log("A click occured");

        agent.destination = this;
        setTimeout(function () {
            agent.requestPathFinder();
        });
    }
    async setAnchorProbe(target) {
        agent.agentCellOccupied = new ThinkingAgentDecoration(agent.agentCellOccupied);
        agent.agentCellOccupied.decorateCell(new Array());
        console.log(target);
        agent.destination = target;

        var pathfinder_output = false;

        return new Promise((resolve, reject) => {
            setTimeout(function () {
                pathfinder_output = agent.requestPathFinder();
                resolve(pathfinder_output);
            });

        });
    }
    decorateCell(input) {
        if (this.cell_element) {
            this.cell_element.setAttribute("class", input.join(" "));
        }
    }
    getCellMeta() {
        if (this.constructor.name == 'cell_meta') {
            return this;
        } else {
            return this.cell.getCellMeta();
        }
    }
    toDecoratorChainString() {
        console.log(this.constructor.name);
        if (this.constructor.name != 'cell_meta') {
            this.cell.toDecoratorChainString();
        }
    }
    toDecoratorChainArray(input) {
        input.push(this.constructor.name);
        if (this.constructor.name != 'cell_meta') {
            this.cell.toDecoratorChainArray(input);
        }
        return input;
    }
    findDecoration(input) {
        if (this.constructor.name == input) {
            return true;
        }
        if (this.constructor.name != 'cell_meta') {
            return this.cell.findDecoration(input);
        }
        return false;
    }
    isBlockedType() {
        //BlockedDecoration
        //TreeDecoration
        if (this.constructor.name == 'cell_meta') {
            return false;
        }
        if (this.constructor.name == "BlockedDecoration" || this.constructor.name == "TreeDecoration") {
            return true;
        }
        return this.cell.isBlockedType();

    }
    cloneCellMeta() {
        var clone_source = this.getCellMeta();
        return new cell_meta(clone_source.cell_element, clone_source.my_x, clone_source.my_y, clone_source.my_cell_ref);
    }
    removeDecoration(input, returnedObject = null) {
        if (returnedObject == null) {
            var returnedObject = this.cloneCellMeta();
        }

        if (this.constructor.name == 'cell_meta') {
            return returnedObject;
        }
        if (this.constructor.name != input) {
            returnedObject = new (eval(this.constructor.name))(returnedObject);
        }
        return this.cell.removeDecoration(input, returnedObject);
    }
    getDistance(target_cell) {
        var source_x = this.getCellMeta().my_x;
        var source_y = this.getCellMeta().my_y;
        var target_x = target_cell.getCellMeta().my_x;
        var target_y = target_cell.getCellMeta().my_y;
        var x_distance = Math.abs(source_x - target_x);
        var y_distance = Math.abs(source_y - target_y);
        var cartisian_distance = Math.sqrt(x_distance * x_distance + y_distance * y_distance).toFixed(1);
        return cartisian_distance;
    }
    toString() {
        return "X - " + this.my_x + "; Y - " + this.my_y + "; cell ref - " + this.my_cell_ref;
    }
}
