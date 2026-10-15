class cell_meta {
    cell_element;
    my_x = 0;
    my_y = 0;
    my_cell_ref = 0;
    my_north;
    my_east;
    my_south;
    my_west;
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
    determineNeighboursPassable(mapObject){
        var i = this.my_x;
        var j = this.my_y;
        if (i > mapObject.min_width){
            this.my_neighbours.push(mapObject.map_cells[i-1][j]);
        }
        if (i < mapObject.max_width - 1){
            this.my_neighbours.push(mapObject.map_cells[i+1][j]);
        }
        if(j > mapObject.min_height){
            this.my_neighbours.push(mapObject.map_cells[i][j-1]);
        }
        if(j < mapObject.max_height - 1){
            this.my_neighbours.push(mapObject.map_cells[i][j+1]);
        }
        if (i > mapObject.min_width && !mapObject.map_cells[i-1][j].isBlockedType()) {
            this.my_west = mapObject.map_cells[i-1][j];
            this.my_step_option.push(mapObject.map_cells[i-1][j]);
        }
        if (i < mapObject.max_width - 1 && !mapObject.map_cells[i+1][j].isBlockedType()) {
            this.my_east = mapObject.map_cells[i+1][j];
            this.my_step_option.push(mapObject.map_cells[i+1][j]);
        }
        if (j > mapObject.min_height && !mapObject.map_cells[i][j-1].isBlockedType()) {
            this.my_north = mapObject.map_cells[i][j-1];
            this.my_step_option.push(mapObject.map_cells[i][j-1]);
        }
        if (j < mapObject.max_height - 1 && !mapObject.map_cells[i][j+1].isBlockedType()) {
            this.my_south = mapObject.map_cells[i][j+1];
            this.my_step_option.push(mapObject.map_cells[i][j+1]);
        }
    }
    setAnchor(e){
        agent.agentCellOccupied = new ThinkingAgentDecoration(agent.agentCellOccupied);
        agent.agentCellOccupied.decorateCell(new Array());
        
        agent.destination = this;
        setTimeout(function() {
            agent.requestPathFinder();
        });
    }
    async setAnchorProbe(target){
        agent.agentCellOccupied = new ThinkingAgentDecoration(agent.agentCellOccupied);
        agent.agentCellOccupied.decorateCell(new Array());
        console.log(target);
        agent.destination = target;
        
        var pathfinder_output = false;
        
        return new Promise((resolve, reject) => {
            setTimeout(function() {
                pathfinder_output = agent.requestPathFinder();
                resolve(pathfinder_output);
            });
            
        });
    }
    decorateCell(input){
        this.cell_element.classList.remove(...this.cell_element.classList);
        for(var i=0;i<input.length;i++){
            this.cell_element.classList.add(input[i]);
        }
    }
    getCellMeta(){
        if(this.constructor.name=='cell_meta'){
            return this;
        }else{
            return this.cell.getCellMeta();
        }
    }
    toDecoratorChainString(){
        console.log(this.constructor.name);
        if(this.constructor.name!='cell_meta'){
            this.cell.toDecoratorChainString();
        }
    }
    toDecoratorChainArray(input){
        input.push(this.constructor.name);
        if(this.constructor.name!='cell_meta'){
            this.cell.toDecoratorChainArray(input);
        }
        return input;
    }
    findDecoration(input){
        if(this.constructor.name==input){
            return true;
        }
        if(this.constructor.name!='cell_meta'){
            return this.cell.findDecoration(input);
        }
        return false;
    }
    isBlockedType(){
        //BlockedDecoration
        //TreeDecoration
        if(this.constructor.name=='cell_meta'){
            return false;
        }
        if(this.constructor.name=="BlockedDecoration" || this.constructor.name=="TreeDecoration"){
            return true;
        }
        return this.cell.isBlockedType();
        
    }
    cloneCellMeta(){
        var clone_source = this.getCellMeta();
        return new cell_meta(clone_source.cell_element, clone_source.my_x, clone_source.my_y, clone_source.my_cell_ref);
    }
    removeDecoration(input, returnedObject = null){
        if(returnedObject==null){
            var returnedObject = this.cloneCellMeta();
        }
        
        if(this.constructor.name=='cell_meta'){
            return returnedObject;
        }
        if(this.constructor.name!=input){
            returnedObject = new(eval(this.constructor.name))(returnedObject);
        }
        return this.cell.removeDecoration(input, returnedObject);
    }
    
}