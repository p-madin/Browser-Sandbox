class pathfinder {
    best_size = Number.MAX_SAFE_INTEGER;
    unique_options = new Array();
    best_options = new Array();
    complexity = 0;
    constructor() {
    }
    dertmineBestPath(i_agent) {
        var frame_id = i_agent.destination.getAttribute("meta-frame");
        if (globalGridObject.all_blocked_cells[frame_id]) {
            console.log("blocked cell, return");
            return;
        }
        to = globalGridObject.all_cells[frame_id].getCellMeta();
        this.findUniquePath(i_agent);

        //return;
        return this.best_options;
    }
    findUniquePath(i_agent) {
        this.best_size = Number.MAX_SAFE_INTEGER;

        var current_node = i_agent.agentCellOccupied;
        //path.push(i_agent.agentCellOccupied);

        var step_options_array = current_node.getCellMeta().my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        //benchmarking
        /*
        for(var i=0;i<50;i++){
            var index = Math.round(Math.random() * globalGridObject.all_cells.length);
            console.log("Looking for: "+index);
            //console.log(globalGridObject.all_cells[index]);
            to = globalGridObject.all_cells[index].getCellMeta();
            this.complexity = 0;
            var path = new Array();
            //path.push(i_agent.agentCellOccupied);
            
            var stepOptionRepresentation = new stepOption(null, i_agent.agentCellOccupied);
            path.push(stepOptionRepresentation);
            this.best_size = Number.MAX_SAFE_INTEGER;

            for(var j=0;j<globalGridObject.all_cells.length;j++){
                globalGridObject.all_cells[j].my_shortest_path = Number.MAX_SAFE_INTEGER;
            }
    
            let visited = new Map();
            this.findUniquePathRecurse(path, current_node, 1);
            //this.findUniquePathRecurseGPT(path, current_node, 1);
            
        }
        console.log(path);
        console.log(this.unique_options);
        for(var j=0;j<this.unique_options.length;j++){
            var row = document.createElement("div");
            row.setAttribute("class", "path_option");
            row.setAttribute("data-path", j);
            var row_text = document.createTextNode("Option #"+j+" Length: "+this.unique_options[j].length);
            row.appendChild(row_text);
            row.addEventListener("mouseover", highlightPathInteger);
            path_optionsUI.appendChild(row);
        }

        //this.findUniquePathRecurse(path, sorted_step_options_array[i].cell, 1);
        */
        //benchmarking end

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(i_agent.agentCellOccupied, sorted_step_options_array[i].cell);
            var path = new Array();
            path.push(stepOptionRepresentation);
            //stepOptionRepresentation.stepOptionToCell = sorted_step_options_array[i].cell;
            //this.findUniquePathRecurse(path, sorted_step_options_array[i].cell, 1);
            this.findUniquePathRecurseGPT(path, sorted_step_options_array[i].cell, 1);
        }
        //console.log(path);
        //console.log(this.unique_options);
        //return;
        /*
        for(var j=0;j<this.unique_options.length;j++){
            var row = document.createElement("div");
            row.setAttribute("class", "path_option");
            row.setAttribute("data-path", j);
            var row_text = document.createTextNode("Option #"+j+" Length: "+this.unique_options[j].length);
            row.appendChild(row_text);
            row.addEventListener("mouseover", highlightPathInteger);
            path_optionsUI.appendChild(row);
        }
        



        return;
        */
        for (var i = 0; i < this.unique_options.length; i++) {
            //console.log(this.unique_options[i]);
            //console.log(this.best_size);
            //console.log(this.unique_options[i].length);
            if (this.unique_options[i].length == this.best_size) {
                this.best_options.push(this.unique_options[i]);
            }
        }
        for (var i = 0; i < this.unique_options.length; i++) {
            var row = document.createElement("div");
            row.setAttribute("class", "path_option");
            row.setAttribute("data-path", i);
            var row_text = document.createTextNode("Option #" + i + " Length: " + this.unique_options[i].length);
            row.appendChild(row_text);
            row.addEventListener("mouseover", highlightPathInteger);
            path_optionsUI.appendChild(row);
        }
        path_options_disclosureUI.setAttribute("open", "open");
    }
    sortStepOptions(to_cell, input_options) {
        var unsorted_step_options_array = new Array();
        var sorted_step_options_array = new Array();
        for (var i = 0; i < input_options.length; i++) {
            var x_distance = Math.abs(input_options[i].getCellMeta().my_x - to_cell.my_x);
            var y_distance = Math.abs(input_options[i].getCellMeta().my_y - to_cell.my_y);
            var cartisian_distance = Math.sqrt(x_distance * x_distance + y_distance * y_distance).toFixed(6);

            var temp = new Array();
            temp['distance'] = cartisian_distance;
            temp['cell'] = input_options[i];
            unsorted_step_options_array.push(temp);
        }
        sorted_step_options_array = unsorted_step_options_array.sort(function (a, b) { return a.distance - b.distance });
        return sorted_step_options_array;
    }
    findUniquePathRecurse(i_path, this_step, depth) {
        this.complexity = this.complexity + 1;
        depth = depth + 1;
        this_step = this_step.getCellMeta();
        if (this.complexity > 1000000) {
            return;
        }
        if (depth >= 55) {
            return;
        }
        if (depth > this.best_size) {
            return;
        }
        if (depth > this_step.my_shortest_path) {
            return;
        } else {
            this_step.my_shortest_path = depth;
        }
        var deep_path = new Array();
        for (var i = 0; i < i_path.length; i++) {
            deep_path.push(i_path[i]);
        }

        //var stepOptionRepresentation = new stepOption(this_step, sorted_step_options_array[i].cell);
        //deep_path.push(this_step);
        if (this_step.my_cell_ref == to.my_cell_ref) {
            //found it
            if (deep_path.length < this.best_size) {
                this.best_size = deep_path.length;
                //this.garbageCollectOptions();
                this.unique_options.push(deep_path);
            }

            return;
        }
        if (this_step.getCellMeta().my_step_option.length == 0) {
            //no more options without backtracking
            return;
        }
        var step_options_array = this_step.getCellMeta().my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(this_step, sorted_step_options_array[i].cell);
            deep_path.push(stepOptionRepresentation);
            this.findUniquePathRecurse(deep_path, sorted_step_options_array[i].cell, depth);
        }
    }
    findUniquePathRecurseGPT(i_path, this_step, depth, visited = new Map()) {
        //console.log('recurse find');
        this.complexity += 1;
        depth += 1;
        this_step = this_step.getCellMeta();
        if (this.complexity > 1000000 || depth >= 55 || depth >= this.best_size) {
            return;
        }

        if (visited.has(this_step.my_cell_ref) && visited.get(this_step.my_cell_ref) <= depth) {
            return;
        }

        visited.set(this_step.my_cell_ref, depth);  // Mark as visited

        if (this_step.my_cell_ref == to.my_cell_ref) {
            //found it
            console.log('target found');
            if (depth < this.best_size) {
                this.best_size = depth;
                //this.garbageCollectOptions();
                this.unique_options.push([...i_path]);
            }
            //visited.delete(this_step.my_cell_ref);  // Backtrack before returning

            return;
        }
        var step_options_array = this_step.my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(this_step, sorted_step_options_array[i].cell);
            i_path.push(stepOptionRepresentation);
            this.findUniquePathRecurseGPT(i_path, sorted_step_options_array[i].cell, depth, visited);
            i_path.pop();  // Backtrack path
        }
        visited.delete(this_step.my_cell_ref);  // Backtrack visited
    }
    garbageCollectOptions() {
        let i = 0;
        while (i < this.unique_options.length) {
            if (this.unique_options[i].length > this.best_size) {
                this.unique_options.splice(i, 1);
            } else {
                i++;
            }
        }
    }
}