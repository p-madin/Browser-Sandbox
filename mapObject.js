
class mapObject {
    rand_cache = new Array();
    map_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    all_agents = new Array();
    structures = new Array();
    min_width;
    max_width;
    min_height;
    max_height;
    constructor(map_width, map_height) {
        this.min_width = (map_width/2)*-1;
        this.max_width = map_width/2;
        this.min_height = (map_height/2)*-1;
        this.max_height = map_height/2;
        for(var i = this.min_width; i < this.max_width; i++){
            for(var j = this.min_height; j < this.max_height; j++){
                if(typeof this.rand_cache[i] === 'undefined'){
                    this.rand_cache[i] = new Array();
                }
                this.rand_cache[i][j] = getRand()*100;
            }
        }
        var frame_count = 0;
        
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                var cell_object = new cell_meta(null,i,j,frame_count);
                if(typeof this.rand_cache[i] === 'undefined' || typeof this.rand_cache[i][j] === 'undefined'){
                    cell_object.my_seed = 100;
                }else{
                    cell_object.my_seed = this.rand_cache[i][j];
                }
                if(typeof this.map_cells[i] === 'undefined'){
                    this.map_cells[i] = new Array();
                }
                if(cell_object.my_seed > 90){
                    cell_object.addFlag(CellFlags.BLOCKED);
                }
                if(cell_object.my_seed.toFixed(1) == 59.7){
                    if(typeof this.all_grass_cells[i] === 'undefined'){
                        this.all_grass_cells[i] = new Array();
                    }
                    cell_object.addFlag(CellFlags.GRASS);
                    this.all_grass_cells[i][j] = "grass";
                }
                this.map_cells[i][j] = cell_object;
                frame_count++;
            }
        }
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                let this_cell = this.map_cells[i][j].getCellMeta();
                this_cell.determineNeighboursPassable(this);
            }
        }
        var grass_size = 10;
        for (const [key, value] of Object.entries(this.all_grass_cells)) {
            for (const [inner_key, inner_value] of Object.entries(value)) {
                var grass_cell = this.map_cells[key][inner_key];
                var this_selection = new Array();
                var key_int = parseInt(key);
                var inner_key_int = parseInt(inner_key);
                for (var i = key_int-grass_size; i < key_int+grass_size; i++) {
                    for (var j = inner_key_int-grass_size; j < inner_key_int+grass_size; j++) {
                        if(typeof this.map_cells[i] === 'undefined' || typeof this.map_cells[i][j] === 'undefined' ){
                            continue;
                        }
                        var thisMapCell = this.map_cells[i][j];
                        var distance = thisMapCell.getDistance(grass_cell);
                        if(distance>10){
                            continue;
                        }
                        this_selection[thisMapCell.getCellMeta().my_cell_ref] = thisMapCell;
                    }
                }
                for(const [grass_key, grass_value] of Object.entries(this_selection)){
                    var cell = grass_value.getCellMeta();
                    cell.addFlag(CellFlags.GRASS);
                    if(Math.round(cell.my_seed)%100<15){
                        cell.addFlag(CellFlags.TREE);
                    }
                    if(cell.my_seed<0.1){
                        cell.addFlag(CellFlags.ENEMY);
                        this.all_agents.push(cell);
                    }
                    this.map_cells[cell.my_x][cell.my_y] = cell;
                }
            }
        }
        this.structures = [];
        if (typeof WorldStructurePlacer !== 'undefined') {
            WorldStructurePlacer.populateWorld(this);
        } else if (typeof StructureStamper !== 'undefined' && typeof StructureLibrary !== 'undefined') {
            StructureStamper.stampStarterSettlement(this);
        }
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                let this_cell = this.map_cells[i][j].getCellMeta();
                this_cell.my_step_option = new Array();
                this_cell.determineNeighboursPassable(this);
            }
        }
    }
}