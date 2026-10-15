
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
    all_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    constructor(element, i_agent, interactive) {
        this.frame_element = element;
        this.frame_size_width = this.frame_element.clientWidth-110;
        this.frame_size_height = this.frame_element.clientHeight-20;
        this.cell_size_x = Math.floor(this.frame_size_width / this.cell_size);
        this.cell_size_y = Math.floor(this.frame_size_height / this.cell_size);
        this.grid_mid_x = Math.floor(this.cell_size_x/2);
        this.grid_mid_y = Math.floor(this.cell_size_y/2);
        if(i_agent.x=="unset"){
            i_agent.x = 0;
            i_agent.y = 0;
            vector_horizontal = this.grid_mid_x;
            vector_vertical = this.grid_mid_y;
        }
        my_cache_offset = (i_agent.x*this.cell_size_y)+i_agent.y;
        var frame_count = 0;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                if(typeof globalMapObject.map_cells[i-vector_horizontal] !== 'undefined' 
                   && typeof globalMapObject.map_cells[i-vector_horizontal][j-vector_vertical] !== 'undefined'){
                    var cell_object = globalMapObject.map_cells[i-vector_horizontal][j-vector_vertical];
                }else{
                    var cell_object = new cell_meta(null,i,j,frame_count);
                    cell_object = new BlockedDecoration(cell_object);
                }
                var cell_element = create_svg_element("rect");
                cell_element.setAttribute('meta-frame', frame_count);
                cell_element.setAttribute('class', "cell");
                cell_element.setAttribute('x', (i * this.cell_size) + "px");
                cell_element.setAttribute('y', (j * this.cell_size) + "px");
                cell_element.setAttribute('height', this.cell_size + "px");
                cell_element.setAttribute('width', this.cell_size + "px");
                cell_element.setAttribute('meta-seed-ref', frame_count+my_cache_offset);
                this.frame_element.appendChild(cell_element);
                cell_object.getCellMeta().cell_element = cell_element;
                cell_object.getCellMeta().my_seed_ref = frame_count+my_cache_offset;
                cell_object.getCellMeta().my_shortest_path = Number.MAX_SAFE_INTEGER;
                if(typeof globalMapObject.map_cells[i-vector_horizontal] === 'undefined' || typeof globalMapObject.map_cells[i-vector_horizontal][j-vector_vertical] === 'undefined'){
                    cell_object.my_seed = 100;
                }
                if(interactive){
                    cell_element.addEventListener("click", cell_object.setAnchor);
                }
                
                this.all_cells[frame_count] = cell_object;
                frame_count++;
            }
        }
        //set start
        this.grid_mid_cell = this.grid_mid_x*this.cell_size_y+this.grid_mid_y;
        this.all_cells[this.grid_mid_cell] = new AgentDecoration(this.all_cells[this.grid_mid_cell]);
        if(!interactive){
            this.all_cells[this.grid_mid_cell] = new WalkingAgentDecoration(this.all_cells[this.grid_mid_cell]);
        }
        var frame_count = 0;
        for (var i = 0; i < this.cell_size_x; i++) {
            for (var j = 0; j < this.cell_size_y; j++) {
                this.all_cells[frame_count].decorateCell(new Array());
                frame_count++;
            }
        }
        agent.agentCellOccupied = this.all_cells[this.grid_mid_cell];
        //setTimeout(tick, 1000);
    }
}