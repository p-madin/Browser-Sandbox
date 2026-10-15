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
        this.findUniquePath();

        return this.best_options;
    }
    findUniquePath() {
        this.best_size = Number.MAX_SAFE_INTEGER;

        var current_node = from;
        var path = new Array();
        path.push(from);

        var step_options_array = current_node.getCellMeta().my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);
        for (var i = 0; i < sorted_step_options_array.length; i++) {
            this.findUniquePathRecurse(path, sorted_step_options_array[i].cell, 1);
        }
        for (var i = 0; i < this.unique_options.length; i++) {
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

        deep_path.push(this_step);
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
            this.findUniquePathRecurse(deep_path, sorted_step_options_array[i].cell, depth);
        }
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