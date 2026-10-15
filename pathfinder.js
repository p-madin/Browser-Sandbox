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

        return this.best_options;
    }

    findPathHeadless(fromCell, toCell, algorithm = 'gpt') {
        to = toCell.getCellMeta();
        if (toCell.isBlockedType()) {
            return {
                success: false,
                reason: "Target cell is blocked",
                complexity: 0,
                pathLength: 0,
                bestPath: null,
                uniqueCount: 0,
                bestCount: 0,
                executionTimeMs: 0,
                euclidean: 0,
                manhattan: 0,
                optimalityRatio: 0
            };
        }

        const t0 = performance.now();
        this.complexity = 0;
        this.best_size = Number.MAX_SAFE_INTEGER;
        this.unique_options = new Array();
        this.best_options = new Array();

        var current_node = fromCell.getCellMeta();
        var step_options_array = current_node.my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(fromCell, sorted_step_options_array[i].cell);
            var path = new Array();
            path.push(stepOptionRepresentation);
            if (algorithm === 'legacy') {
                this.findUniquePathRecurse(path, sorted_step_options_array[i].cell, 1);
            } else {
                this.findUniquePathRecurseGPT(path, sorted_step_options_array[i].cell, 1);
            }
        }

        for (var i = 0; i < this.unique_options.length; i++) {
            if (this.unique_options[i].length == this.best_size) {
                this.best_options.push(this.unique_options[i]);
            }
        }

        const t1 = performance.now();
        var bestPath = (this.best_options.length > 0) ? this.best_options[0] : null;
        var pathLength = bestPath ? bestPath.length : 0;
        var dx = Math.abs(to.my_x - current_node.my_x);
        var dy = Math.abs(to.my_y - current_node.my_y);
        var euclidean = Math.sqrt(dx * dx + dy * dy);
        var manhattan = dx + dy;
        var optimality = pathLength > 0 ? Number((pathLength / (euclidean || 1)).toFixed(2)) : 0;

        return {
            success: this.best_options.length > 0,
            pathLength: pathLength,
            bestPath: bestPath,
            uniqueCount: this.unique_options.length,
            bestCount: this.best_options.length,
            complexity: this.complexity,
            executionTimeMs: Number((t1 - t0).toFixed(3)),
            euclidean: Number(euclidean.toFixed(2)),
            manhattan: manhattan,
            optimalityRatio: optimality
        };
    }
    findUniquePath(i_agent) {
        this.best_size = Number.MAX_SAFE_INTEGER;
        this.unique_options = new Array();
        this.best_options = new Array();

        var current_node = i_agent.agentCellOccupied;
        var step_options_array = current_node.getCellMeta().my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(i_agent.agentCellOccupied, sorted_step_options_array[i].cell);
            var path = new Array();
            path.push(stepOptionRepresentation);
            this.findUniquePathRecurseGPT(path, sorted_step_options_array[i].cell, 1);
        }

        for (var i = 0; i < this.unique_options.length; i++) {
            if (this.unique_options[i].length == this.best_size) {
                this.best_options.push(this.unique_options[i]);
            }
        }

        if (typeof path_optionsUI !== 'undefined' && path_optionsUI) {
            path_optionsUI.innerHTML = '';
            for (var i = 0; i < this.unique_options.length; i++) {
                var row = document.createElement("div");
                row.setAttribute("class", "path_option");
                row.setAttribute("data-path", i);
                var row_text = document.createTextNode("Option #" + i + " Length: " + this.unique_options[i].length);
                row.appendChild(row_text);
                row.addEventListener("mouseover", highlightPathInteger);
                path_optionsUI.appendChild(row);
            }
        }
        if (typeof path_options_disclosureUI !== 'undefined' && path_options_disclosureUI) {
            path_options_disclosureUI.setAttribute("open", "open");
        }
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

        if (this_step.my_cell_ref == to.my_cell_ref) {
            if (deep_path.length < this.best_size) {
                this.best_size = deep_path.length;
                this.unique_options.push(deep_path);
            }
            return;
        }
        if (this_step.getCellMeta().my_step_option.length == 0) {
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
        this.complexity += 1;
        depth += 1;
        this_step = this_step.getCellMeta();
        if (this.complexity > 1000000 || depth >= 55 || i_path.length > this.best_size) {
            return;
        }

        if (visited.has(this_step.my_cell_ref) && visited.get(this_step.my_cell_ref) <= depth) {
            return;
        }

        visited.set(this_step.my_cell_ref, depth);

        if (this_step.my_cell_ref == to.my_cell_ref) {
            console.log('target found');
            if (i_path.length <= this.best_size) {
                this.best_size = i_path.length;
                this.unique_options.push([...i_path]);
            }
            return;
        }
        var step_options_array = this_step.my_step_option;
        var sorted_step_options_array = this.sortStepOptions(to, step_options_array);

        for (var i = 0; i < sorted_step_options_array.length; i++) {
            var stepOptionRepresentation = new stepOption(this_step, sorted_step_options_array[i].cell);
            i_path.push(stepOptionRepresentation);
            this.findUniquePathRecurseGPT(i_path, sorted_step_options_array[i].cell, depth, visited);
            i_path.pop();
        }
        visited.delete(this_step.my_cell_ref);
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
