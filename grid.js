class frame_meta {
    frame_element;
    frame_size_width = 0;
    frame_size_height = 0;
    cell_size = 20;
    cell_size_x = 0;
    cell_size_y = 0;
    grid_mid_x = 0;
    grid_mid_y = 0;
    grid_mid_cell;
    interactive = true;
    all_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    rect_elements = new Array();

    constructor(element, i_agent, interactive) {
        this.frame_element = element;
        this.buildGridPool(i_agent, interactive);
    }

    buildGridPool(i_agent, interactive) {
        this.frame_size_width = Math.max(100, this.frame_element.clientWidth - 110);
        this.frame_size_height = Math.max(100, this.frame_element.clientHeight - 20);
        this.cell_size_x = Math.max(1, Math.floor(this.frame_size_width / this.cell_size));
        this.cell_size_y = Math.max(1, Math.floor(this.frame_size_height / this.cell_size));
        this.grid_mid_x = Math.floor(this.cell_size_x / 2);
        this.grid_mid_y = Math.floor(this.cell_size_y / 2);
        this.grid_mid_cell = this.grid_mid_x * this.cell_size_y + this.grid_mid_y;

        if (i_agent.x == "unset") {
            i_agent.x = 0;
            i_agent.y = 0;
            vector_horizontal = this.grid_mid_x;
            vector_vertical = this.grid_mid_y;
        }

        empty_frame(this.frame_element);
        this.rect_elements = new Array();
        this.all_cells = new Array();
        this.all_blocked_cells = new Array();

        var frame_count = 0;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                var cell_element = create_svg_element("rect");
                cell_element.setAttribute('meta-frame', frame_count);
                cell_element.setAttribute('class', "cell");
                cell_element.setAttribute('x', (i * this.cell_size) + "px");
                cell_element.setAttribute('y', (j * this.cell_size) + "px");
                cell_element.setAttribute('height', this.cell_size + "px");
                cell_element.setAttribute('width', this.cell_size + "px");

                cell_element.addEventListener("click", this.handleCellClick.bind(this, cell_element));

                this.frame_element.appendChild(cell_element);
                this.rect_elements[frame_count] = cell_element;
                frame_count++;
            }
        }

        this.updateGrid(i_agent, interactive);
    }

    handleCellClick(cell_element, e) {
        if (!this.interactive) {
            return;
        }
        var frame_id = cell_element.getAttribute("meta-frame");
        var cell_object = this.all_cells[frame_id];
        if (cell_object && typeof cell_object.setAnchor === 'function') {
            cell_object.setAnchor.call(cell_element, e);
        }
    }

    updateGrid(i_agent, interactive) {
        this.interactive = (typeof interactive !== 'undefined') ? interactive : true;

        my_cache_offset = (i_agent.x * this.cell_size_y) + i_agent.y;

        for (var k = 0; k < this.all_cells.length; k++) {
            if (this.all_cells[k]) {
                this.all_cells[k].getCellMeta().cell_element = null;
            }
        }

        var frame_count = 0;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                var map_x = i - vector_horizontal;
                var map_y = j - vector_vertical;
                var cell_object;

                if (typeof globalMapObject.map_cells[map_x] !== 'undefined'
                   && typeof globalMapObject.map_cells[map_x][map_y] !== 'undefined') {
                    cell_object = globalMapObject.map_cells[map_x][map_y];
                } else {
                    cell_object = new cell_meta(null, i, j, frame_count);
                    cell_object = new BlockedDecoration(cell_object);
                }

                var cell_element = this.rect_elements[frame_count];
                cell_element.setAttribute('meta-seed-ref', frame_count + my_cache_offset);

                var meta = cell_object.getCellMeta();
                meta.cell_element = cell_element;
                meta.my_seed_ref = frame_count + my_cache_offset;
                meta.my_shortest_path = Number.MAX_SAFE_INTEGER;

                if (typeof globalMapObject.map_cells[map_x] === 'undefined' || typeof globalMapObject.map_cells[map_x][map_y] === 'undefined') {
                    cell_object.my_seed = 100;
                }

                this.all_cells[frame_count] = cell_object;
                this.all_blocked_cells[frame_count] = cell_object.isBlockedType();
                frame_count++;
            }
        }

        this.all_cells[this.grid_mid_cell] = new AgentDecoration(this.all_cells[this.grid_mid_cell]);
        if (!this.interactive) {
            this.all_cells[this.grid_mid_cell] = new WalkingAgentDecoration(this.all_cells[this.grid_mid_cell]);
        }

        for (var k = 0; k < this.all_cells.length; k++) {
            this.all_cells[k].decorateCell(new Array());
        }

        i_agent.agentCellOccupied = this.all_cells[this.grid_mid_cell];
    }
}
