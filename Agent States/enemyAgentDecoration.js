class EnemyDecoration extends cell_meta {
    cell;
    constructor(cell) {
        super();
        this.cell = cell;
    }
    decorateCell(input) {
        input.push("enemy");
        this.cell.decorateCell(input);
    }
    async setAnchor(e) {
        var target_cell = globalGridObject.all_cells[this.getAttribute("meta-frame")];
        var target_x = target_cell.getCellMeta().my_x;
        var target_y = target_cell.getCellMeta().my_y;
        var x_distance = Math.abs(agent.x - target_x);
        var y_distance = Math.abs(agent.y - target_y);
        var cartisian_distance = Math.sqrt(x_distance * x_distance + y_distance * y_distance).toFixed(1);
        console.log(cartisian_distance);

        if (cartisian_distance == 1 || cartisian_distance == 1.4) {
            var map_cell = globalMapObject.map_cells[target_x][target_y];
            var map_cell_meta = globalMapObject.map_cells[target_x][target_y].getCellMeta();

            globalMapObject.map_cells[target_x][target_y] = map_cell.removeDecoration("EnemyDecoration");
            target_cell = target_cell.removeDecoration("EnemyDecoration");
            target_cell.getCellMeta().cell_element.addEventListener("click", target_cell.setAnchor);
            target_cell.decorateCell(new Array());
            globalMapObject.map_cells[target_x][target_y].getCellMeta().determineNeighboursPassable(globalMapObject);

            for (var i = 0; i < globalMapObject.map_cells[target_x][target_y].getCellMeta().my_neighbours.length; i++) {
                globalMapObject.map_cells[target_x][target_y].getCellMeta().my_neighbours[i].getCellMeta().determineNeighboursPassable(globalMapObject);
            }
        } else {
            var pathfinderObject = new pathfinder();
            var options = target_cell.getCellMeta().my_step_option;
            var sortedOptions = pathfinderObject.sortStepOptions(agent.agentCellOccupied.getCellMeta(), options);
            for (var i = 0; i < sortedOptions.length; i++) {
                console.log(sortedOptions[i]);
                var destination_probe = sortedOptions[i].cell.getCellMeta();
                var bool_output = await destination_probe.setAnchorProbe(destination_probe.cell_element);

                if (bool_output) {
                    break;
                }
            }

        }
    }
}