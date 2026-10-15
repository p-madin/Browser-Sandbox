
class frame_meta {
    frame_element;
    frame_size_width = 0;
    frame_size_height = 0;
    cell_size_x = 0;
    cell_size_y = 0;
    all_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    constructor(element, i_agent, interactive) {
        this.frame_element = element;
        this.frame_size_width = this.frame_element.clientWidth - 110;
        this.frame_size_height = this.frame_element.clientHeight - 20;
        this.cell_size_x = Math.floor(this.frame_size_width / cell_size);
        this.cell_size_y = Math.floor(this.frame_size_height / cell_size);
        var frame_count = 0;
        var x_mid = Math.floor(this.cell_size_x / 2);
        var y_mid = Math.floor(this.cell_size_y / 2);
        var agent_offset_x = 0;
        var agent_offset_y = 0;
        if (i_agent.x == "unset") {
            i_agent.x = x_mid;
            i_agent.y = y_mid;
            agent_offset_x = x_mid;
            agent_offset_y = y_mid;
        } else {
            agent_offset_x = i_agent.x;
            agent_offset_y = i_agent.y;
        }
        my_cache_offset = (agent_offset_x * this.cell_size_y) + agent_offset_y;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                var cell_object = globalMapObject.map_cells[i - vector_horizontal][j - vector_vertical];
                var cell_element = create_svg_element("rect");
                cell_element.setAttribute('meta-frame', frame_count);
                cell_element.setAttribute('class', "cell");
                cell_element.setAttribute('x', (i * cell_size) + "px");
                cell_element.setAttribute('y', (j * cell_size) + "px");
                cell_element.setAttribute('height', cell_size + "px");
                cell_element.setAttribute('width', cell_size + "px");
                cell_element.setAttribute('meta-seed-ref', frame_count + my_cache_offset);
                this.frame_element.appendChild(cell_element);
                cell_object.getCellMeta().my_x = i - vector_horizontal;
                cell_object.getCellMeta().my_y = j - vector_vertical;
                cell_object.getCellMeta().cell_element = cell_element;
                cell_object.getCellMeta().my_seed_ref = frame_count + my_cache_offset;
                cell_object.getCellMeta().my_shortest_path = Number.MAX_SAFE_INTEGER;
                if (typeof globalMapObject.map_cells[i - vector_horizontal] === 'undefined' || typeof globalMapObject.map_cells[i - vector_horizontal][j - vector_vertical] === 'undefined') {
                    cell_object.my_seed = 100;
                }
                if (interactive) {
                    cell_element.addEventListener("click", cell_object.setAnchor);
                }

                this.all_cells[frame_count] = cell_object;
                frame_count++;
            }
        }
        //set start
        var mido = x_mid * this.cell_size_y + y_mid;
        this.all_cells[mido] = new AgentDecoration(this.all_cells[mido]);
        if (!interactive) {
            this.all_cells[mido] = new WalkingAgentDecoration(this.all_cells[mido]);
        }
        var frame_count = 0;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                this.all_cells[frame_count].decorateCell(new Array());
                frame_count++;
            }
        }
        from = this.all_cells[mido];
        agent.agentCellOccupied = this.all_cells[mido];
    }
}