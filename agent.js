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
        
        to = new SelectedDecoration(to);
        to.decorateCell(new Array());
        var best_path = this.pickBestPath(best_options);
        this.walkPath(best_path);
        return true;
    }
    
    pickBestPath(i_options){
        return i_options[0];
    }
    
    walkPath(i_path){
        if(i_path.length==1){
            //no more to walk
            return;
        }
        empty_frame(frame_root);
        let this_step = i_path[1].getCellMeta();
        
        vector_horizontal = vector_horizontal + agent.x - this_step.my_x;
        vector_vertical = vector_vertical + agent.y - this_step.my_y;
        agent.x = this_step.my_x;
        agent.y = this_step.my_y;
        this.agentCellOccupied = this_step;
        my_cache_offset = this_step.my_cell_ref;
        if(i_path.length==2){
            globalGridObject = new frame_meta(frame_root, agent, true);
        }else{
            globalGridObject = new frame_meta(frame_root, agent, false);
        }
        i_path.splice(0, 1);
        setTimeout(function() {
            agent.walkPath(i_path);
        }, 200);
    }
}