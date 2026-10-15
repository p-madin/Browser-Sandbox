/**
 * pathfinder.js (Phase 5 Refactored)
 * Backward-compatible facade delegating to the modular PathfinderService
 * and PathOptionsRenderer.
 */

class pathfinder {
    best_size = Number.MAX_SAFE_INTEGER;
    unique_options = new Array();
    best_options = new Array();
    complexity = 0;
    optionsRenderer = null;

    constructor() {
        if (typeof PathOptionsRenderer !== 'undefined') {
            this.optionsRenderer = new PathOptionsRenderer();
        }
    }

    dertmineBestPath(i_agent) {
        var startCell = i_agent.agentCellOccupied;
        var destinationElement = i_agent.destination;
        var targetCell = null;

        if (destinationElement && destinationElement.getAttribute) {
            var frame_id = destinationElement.getAttribute("meta-frame");
            if (globalGridObject && globalGridObject.all_blocked_cells && globalGridObject.all_blocked_cells[frame_id]) {
                console.log("blocked cell, return");
                return [];
            }
            if (globalGridObject && globalGridObject.all_cells && globalGridObject.all_cells[frame_id]) {
                targetCell = globalGridObject.all_cells[frame_id];
            }
        } else if (destinationElement && typeof destinationElement.getCellMeta === 'function') {
            targetCell = destinationElement;
        }

        if (!targetCell) {
            console.log("Target cell could not be resolved");
            return [];
        }

        // Backward compatibility for any remaining legacy callers
        window.to = targetCell.getCellMeta();
        i_agent.destinationCell = targetCell;

        // Execute via decoupled PathfinderService
        var result = globalPathfinderService.findPath(
            startCell,
            targetCell,
            typeof globalMapObject !== 'undefined' ? globalMapObject : null,
            'gpt'
        );

        this.complexity = result.complexity;
        this.unique_options = result.uniqueOptions;
        this.best_options = result.bestOptions;
        this.best_size = result.pathLength || Number.MAX_SAFE_INTEGER;

        // Render UI via decoupled PathOptionsRenderer
        if (this.optionsRenderer) {
            this.optionsRenderer.render(this.unique_options);
        }

        return this.best_options;
    }

    findPathHeadless(fromCell, toCell, algorithm = 'gpt') {
        window.to = toCell.getCellMeta();
        var result = globalPathfinderService.findPath(
            fromCell,
            toCell,
            typeof globalMapObject !== 'undefined' ? globalMapObject : null,
            algorithm
        );

        this.complexity = result.complexity;
        this.unique_options = result.uniqueOptions;
        this.best_options = result.bestOptions;
        this.best_size = result.pathLength;

        return {
            success: result.success,
            pathLength: result.pathLength,
            bestPath: result.bestPath,
            uniqueCount: result.uniqueOptions.length,
            bestCount: result.bestOptions.length,
            complexity: result.complexity,
            executionTimeMs: result.executionTimeMs,
            euclidean: result.euclidean,
            manhattan: result.manhattan,
            optimalityRatio: result.optimalityRatio
        };
    }
}
