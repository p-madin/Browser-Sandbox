class GrassDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("grass");
        this.cell.decorateCell(input);
    }
    decorateNeighbours(mapObject){
        for(var i=0;i<this.getCellMeta().my_step_option.length;i++){
            this.decorateNeighboursRecurse(mapObject, this.getCellMeta().my_step_option[i], 10);
        }
    }
    decorateNeighboursRecurse(mapObject, cellObject, depth){
        if(depth == 0){
            return;
        }
        if(!cellObject){
            return;
        }
        if(!mapObject.map_cells[cellObject.getCellMeta().my_x][cellObject.getCellMeta().my_y]){
            return;
        }
        depth = depth - 1;
        //console.log(cellObject.getCellMeta().my_x);
        //console.log(cellObject.getCellMeta().my_y);
        
        mapObject.map_cells[cellObject.getCellMeta().my_x][cellObject.getCellMeta().my_y] = new GrassDecoration(cellObject);
        if(Math.round(cellObject.getCellMeta().my_seed)%3==0){
            mapObject.map_cells[cellObject.getCellMeta().my_x][cellObject.getCellMeta().my_y] = new TreeDecoration(cellObject);
        }
        for(var i=0;i<cellObject.getCellMeta().my_step_option.length;i++){
            if(cellObject.getCellMeta().my_step_option[i].findDecoration("GrassDecoration")){
                continue;
            }
            //if(cellObject.getCellMeta().my_step_option[i])
            this.decorateNeighboursRecurse(mapObject, cellObject.getCellMeta().my_step_option[i], depth);
        }
    }
}