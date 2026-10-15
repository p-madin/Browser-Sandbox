class agent_meta{
    x = "unset";
    y = "unset";
    self;
    destination;
    agentCellOccupied;
    constructor() {
        self = this;
    }

    requestPathFinder(){
        global_pathfinder_object = new pathfinder();
        var my_pathfinder_object = global_pathfinder_object;
        var start = new Date();
        var best_options = my_pathfinder_object.dertmineBestPath(this);
        var end = new Date();
        console.log("---Operation start---");
        console.log("From: ");
        //console.log(this.agentCellOccupied.getCellMeta());
        console.log("To: ");
        //var frame_id = this.destination.getAttribute("meta-frame");
        //console.log(globalGridObject.all_cells[frame_id].getCellMeta());
        console.log("Operation took: "+((end - start)/1000)+" seconds");
        console.log("Operation took: "+(end - start)+" milliseconds");
        console.log("Complexity: "+my_pathfinder_object.complexity);
        console.log("Unique options: "+my_pathfinder_object.unique_options.length);
        console.log("Best options: "+my_pathfinder_object.best_options.length);
        
        console.log("---Operation end---");
        
        this.agentCellOccupied = this.agentCellOccupied.removeDecoration("ThinkingAgentDecoration");
        this.agentCellOccupied.decorateCell(new Array());
        //pick a path
        if(!best_options || best_options.length==0){
            console.log("Couldnt find a best option");
            return false;
        }
        
        globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y] = new SelectedDecoration(globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y]);
        
        //to.decorateCell(new Array());
        //console.log(self.destination);
        //console.log(globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y]);
        //return;
        
        var best_path = this.pickBestPath(best_options);
        
        this.walkPath(best_path, false);
        return true;
    }
    
    pickBestPath(i_options){
        return i_options[0];
    }
    
    walkPath(i_path, step_final){
        //console.log(i_path[0].getCellMeta());
        empty_frame(frame_root);
        let this_step = i_path[0].stepOptionFromCell.getCellMeta();
        //console.log("getting to option step");
        //console.log(i_path[0]);
        //console.log(this_step.toString());
        //console.log(this_step.my_x);
        //console.log(this_step.my_y);
        //console.log(this_step.cell_element);
        
        vector_horizontal = vector_horizontal + agent.x - this_step.my_x;
        vector_vertical = vector_vertical + agent.y - this_step.my_y;
        agent.x = this_step.my_x;
        agent.y = this_step.my_y;
        
        //console.log("in walk path:" + this.x);
        //console.log("in walk path:" + this.y);
        //console.log(this_step);
        
        this.agentCellOccupied = this_step;
        my_cache_offset = this_step.my_cell_ref;
        //console.log(i_path.length);
        globalGridObject = new frame_meta(frame_root, agent, step_final);
        if(i_path.length==1){
            if(!step_final){
                //the final step, re use the last step, overwrite from with to
                i_path[0].stepOptionFromCell = i_path[0].stepOptionToCell;
                console.log(i_path[0].stepOptionFromCell.getCellMeta().my_step_option);
                console.log(i_path[0].stepOptionToCell.getCellMeta().my_step_option);
                setTimeout(function() {
                    agent.walkPath(i_path, true);
                }, 50);
                return;
            }
            //console.log(globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y]);
            //globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y].removeDecoration("SelectedDecoration");
            globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y] = globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y].removeDecoration("SelectedDecoration");
            return;
        }
        i_path.splice(0, 1);
        setTimeout(function() {
            agent.walkPath(i_path, false);
        }, 50);
    }
}