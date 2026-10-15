class agent_meta {
    x = "unset";
    y = "unset";
    self;
    destination;
    agentCellOccupied;
    step_duration = 100;
    activeAnimation = null;

    constructor() {
        self = this;
    }

    requestPathFinder() {
        global_pathfinder_object = new pathfinder();
        var my_pathfinder_object = global_pathfinder_object;
        var start = new Date();
        var best_options = my_pathfinder_object.dertmineBestPath(this);
        var end = new Date();
        console.log("---Operation start---");
        console.log("From: ");
        console.log("To: ");
        console.log("Operation took: " + ((end - start) / 1000) + " seconds");
        console.log("Operation took: " + (end - start) + " milliseconds");
        console.log("Complexity: " + my_pathfinder_object.complexity);
        console.log("Unique options: " + my_pathfinder_object.unique_options.length);
        console.log("Best options: " + my_pathfinder_object.best_options.length);
        console.log("---Operation end---");

        this.agentCellOccupied = this.agentCellOccupied.removeDecoration("ThinkingAgentDecoration");
        this.agentCellOccupied.decorateCell(new Array());

        if (!best_options || best_options.length === 0) {
            console.log("Couldnt find a best option");
            return false;
        }

        globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y] = new SelectedDecoration(globalMapObject.map_cells[to.getCellMeta().my_x][to.getCellMeta().my_y]);
        globalGridObject.updateGrid(this, true);

        var best_path = this.pickBestPath(best_options);
        this.walkPath(best_path);
        return true;
    }

    pickBestPath(i_options) {
        return i_options[0];
    }

    walkPath(i_path) {
        if (!i_path || i_path.length === 0) {
            return;
        }

        if (this.activeAnimation) {
            cancelAnimationFrame(this.activeAnimation);
            this.activeAnimation = null;
        }

        var self = this;
        var step = i_path[0];
        var from_meta = step.stepOptionFromCell.getCellMeta();
        var to_meta = step.stepOptionToCell.getCellMeta();

        var dx = to_meta.my_x - from_meta.my_x;
        var dy = to_meta.my_y - from_meta.my_y;
        var isDiagonal = (dx !== 0 && dy !== 0);

        var duration = isDiagonal ? self.step_duration * 1.414 : self.step_duration;
        var startTime = null;

        globalGridObject.updateGrid(self, false);

        function animateFrame(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var t = Math.min(1.0, elapsed / duration);

            var shiftX = -dx * t * globalGridObject.cell_size;
            var shiftY = -dy * t * globalGridObject.cell_size;
            globalGridObject.setViewportShift(shiftX, shiftY);

            if (t < 1.0) {
                self.activeAnimation = requestAnimationFrame(animateFrame);
            } else {
                globalGridObject.setViewportShift(0, 0);

                vector_horizontal = vector_horizontal + self.x - to_meta.my_x;
                vector_vertical = vector_vertical + self.y - to_meta.my_y;
                self.x = to_meta.my_x;
                self.y = to_meta.my_y;
                self.agentCellOccupied = to_meta;
                my_cache_offset = to_meta.my_cell_ref;

                var isFinal = (i_path.length === 1);

                if (isFinal) {
                    self.activeAnimation = null;
                    if (typeof to !== 'undefined' && to) {
                        var to_x = to.getCellMeta().my_x;
                        var to_y = to.getCellMeta().my_y;
                        if (globalMapObject.map_cells[to_x] && globalMapObject.map_cells[to_x][to_y]) {
                            globalMapObject.map_cells[to_x][to_y] = globalMapObject.map_cells[to_x][to_y].removeDecoration("SelectedDecoration");
                        }
                    }
                    globalGridObject.updateGrid(self, true);
                    return;
                }

                i_path.splice(0, 1);
                self.walkPath(i_path);
            }
        }

        self.activeAnimation = requestAnimationFrame(animateFrame);
    }
}
