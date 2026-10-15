
class mapObject {
    rand_cache = new Array();
    all_blocked_cells = new Array();
    map_cells = new Array();
    all_grass_cells = new Array();
    min_width;
    max_width;
    min_height;
    max_height;
    constructor(map_width, map_height) {
        this.min_width = (map_width / 2) * -1;
        this.max_width = map_width / 2;
        this.min_height = (map_height / 2) * -1;
        this.max_height = map_height / 2;
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                if (typeof this.rand_cache[i] === 'undefined') {
                    this.rand_cache[i] = new Array();
                }
                this.rand_cache[i][j] = getRand() * 100;
            }
        }
        var frame_count = 0;

        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                var cell_object = new cell_meta(null, i, j, frame_count);
                if (typeof this.rand_cache[i] === 'undefined' || typeof this.rand_cache[i][j] === 'undefined') {
                    cell_object.my_seed = 100;
                } else {
                    cell_object.my_seed = this.rand_cache[i][j];
                }
                if (typeof this.map_cells[i] === 'undefined') {
                    this.map_cells[i] = new Array();
                }
                this.map_cells[i][j] = new CellDecoration(cell_object);
                if (cell_object.my_seed > 60) {
                    this.map_cells[i][j] = new BlockedDecoration(this.map_cells[i][j]);
                }
                if (cell_object.my_seed.toFixed(1) == 59.7) {
                    if (typeof this.all_grass_cells[i] === 'undefined') {
                        this.all_grass_cells[i] = new Array();
                    }
                    this.map_cells[i][j] = new GrassDecoration(this.map_cells[i][j]);
                    this.all_grass_cells[i][j] = "grass";
                }
                // if(Math.round(cell_object.my_seed) == 99){
                //     this.all_cells[frame_count] = new SpecialDecoration(this.all_cells[frame_count]);
                //     this.all_blocked_cells.splice(frame_count, 1);
                // }
                frame_count++;
            }
        }
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                let this_cell = this.map_cells[i][j].getCellMeta();
                this_cell.determineNeighboursPassable(this);
            }
        }
        for (const [key, value] of Object.entries(this.all_grass_cells)) {
            for (const [inner_key, inner_value] of Object.entries(value)) {
                this.map_cells[key][inner_key].decorateNeighbours(this);
            }
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