/**
 * PathfinderService.js (Phase 5)
 * Modularized pathfinding engine implementing the Strategy Pattern.
 * Decouples graph search algorithms from DOM rendering, eliminates global variable dependencies,
 * and provides distinct contracts for production navigation and research diagnostics.
 */

class PathResult {
    constructor({
        success = false,
        bestPath = null,
        pathLength = 0,
        bestOptions = [],
        uniqueOptions = [],
        complexity = 0,
        executionTimeMs = 0,
        euclidean = 0,
        manhattan = 0,
        optimalityRatio = 0,
        reason = ""
    } = {}) {
        this.success = success;
        this.bestPath = bestPath;
        this.pathLength = pathLength;
        this.bestOptions = bestOptions;
        this.uniqueOptions = uniqueOptions;
        this.complexity = complexity;
        this.executionTimeMs = executionTimeMs;
        this.euclidean = euclidean;
        this.manhattan = manhattan;
        this.optimalityRatio = optimalityRatio;
        this.reason = reason;
    }
}

/**
 * Base Strategy Contract
 */
class IPathfinderStrategy {
    findPath(startCell, targetCell, mapObject, options = {}) {
        throw new Error("Method findPath() must be implemented by strategy.");
    }

    sortStepOptions(targetCell, stepOptions) {
        var toMeta = targetCell.getCellMeta();
        var temp = [];
        for (var i = 0; i < stepOptions.length; i++) {
            var candidateMeta = stepOptions[i].getCellMeta();
            var dx = Math.abs(candidateMeta.my_x - toMeta.my_x);
            var dy = Math.abs(candidateMeta.my_y - toMeta.my_y);
            var dist = Math.sqrt(dx * dx + dy * dy);
            temp.push({ cell: stepOptions[i], distance: dist });
        }
        temp.sort((a, b) => a.distance - b.distance);
        return temp;
    }
}

/**
 * Production Strategy: GPT Backtracking Depth-First Search
 * Memory-efficient in-place stack with visited-map pruning.
 */
class GptBacktrackingDfsStrategy extends IPathfinderStrategy {
    findPath(startCell, targetCell, mapObject, options = {}) {
        const maxDepth = options.maxDepth || 55;
        const maxComplexity = options.maxComplexity || 1000000;

        const startMeta = startCell.getCellMeta();
        const targetMeta = targetCell.getCellMeta();

        let complexity = 0;
        let bestSize = Number.MAX_SAFE_INTEGER;
        const uniqueOptions = [];
        const bestOptions = [];
        const visited = new Map();

        const recurse = (path, currentCell, depth) => {
            complexity++;
            depth++;
            const currentMeta = currentCell.getCellMeta();

            if (complexity > maxComplexity || depth >= maxDepth || path.length > bestSize) {
                return;
            }

            if (visited.has(currentMeta.my_cell_ref) && visited.get(currentMeta.my_cell_ref) <= depth) {
                return;
            }

            visited.set(currentMeta.my_cell_ref, depth);

            if (currentMeta.my_cell_ref === targetMeta.my_cell_ref) {
                if (path.length <= bestSize) {
                    bestSize = path.length;
                    uniqueOptions.push([...path]);
                }
                return;
            }

            const stepOptions = currentMeta.my_step_option || [];
            const sorted = this.sortStepOptions(targetCell, stepOptions);

            for (let i = 0; i < sorted.length; i++) {
                const nextCell = sorted[i].cell;
                const edge = new stepOption(currentCell, nextCell.cell || nextCell);
                path.push(edge);
                recurse(path, nextCell.cell || nextCell, depth);
                path.pop();
            }

            visited.delete(currentMeta.my_cell_ref);
        };

        const initialOptions = startMeta.my_step_option || [];
        const sortedInitial = this.sortStepOptions(targetCell, initialOptions);

        for (let i = 0; i < sortedInitial.length; i++) {
            const nextCell = sortedInitial[i].cell;
            const firstEdge = new stepOption(startCell, nextCell.cell || nextCell);
            const path = [firstEdge];
            recurse(path, nextCell.cell || nextCell, 1);
        }

        for (let i = 0; i < uniqueOptions.length; i++) {
            if (uniqueOptions[i].length === bestSize) {
                bestOptions.push(uniqueOptions[i]);
            }
        }

        const bestPath = bestOptions.length > 0 ? bestOptions[0] : null;
        const pathLength = bestPath ? bestPath.length : 0;
        const dx = Math.abs(targetMeta.my_x - startMeta.my_x);
        const dy = Math.abs(targetMeta.my_y - startMeta.my_y);
        const euclidean = Math.sqrt(dx * dx + dy * dy);
        const manhattan = dx + dy;
        const optimality = pathLength > 0 ? Number((pathLength / (euclidean || 1)).toFixed(2)) : 0;

        return new PathResult({
            success: bestOptions.length > 0,
            bestPath: bestPath,
            pathLength: pathLength,
            bestOptions: bestOptions,
            uniqueOptions: uniqueOptions,
            complexity: complexity,
            euclidean: Number(euclidean.toFixed(2)),
            manhattan: manhattan,
            optimalityRatio: optimality
        });
    }
}

/**
 * Research Strategy: Legacy DFS with Array-Cloning and Node Memoization
 */
class LegacyDfsStrategy extends IPathfinderStrategy {
    findPath(startCell, targetCell, mapObject, options = {}) {
        const maxDepth = options.maxDepth || 55;
        const maxComplexity = options.maxComplexity || 1000000;

        const startMeta = startCell.getCellMeta();
        const targetMeta = targetCell.getCellMeta();

        let complexity = 0;
        let bestSize = Number.MAX_SAFE_INTEGER;
        const uniqueOptions = [];
        const bestOptions = [];
        const touchedCells = [];

        const recurse = (path, currentCell, depth) => {
            complexity++;
            depth++;
            const currentMeta = currentCell.getCellMeta();

            if (complexity > maxComplexity || depth >= maxDepth || depth > bestSize) {
                return;
            }

            if (typeof currentMeta.my_shortest_path !== 'undefined' && depth > currentMeta.my_shortest_path) {
                return;
            } else {
                currentMeta.my_shortest_path = depth;
                touchedCells.push(currentMeta);
            }

            const deepPath = [...path];

            if (currentMeta.my_cell_ref === targetMeta.my_cell_ref) {
                if (deepPath.length < bestSize) {
                    bestSize = deepPath.length;
                    uniqueOptions.push(deepPath);
                }
                return;
            }

            const stepOptions = currentMeta.my_step_option || [];
            const sorted = this.sortStepOptions(targetCell, stepOptions);

            for (let i = 0; i < sorted.length; i++) {
                const nextCell = sorted[i].cell;
                const edge = new stepOption(currentCell, nextCell.cell || nextCell);
                deepPath.push(edge);
                recurse(deepPath, nextCell.cell || nextCell, depth);
                deepPath.pop();
            }
        };

        const initialOptions = startMeta.my_step_option || [];
        const sortedInitial = this.sortStepOptions(targetCell, initialOptions);

        for (let i = 0; i < sortedInitial.length; i++) {
            const nextCell = sortedInitial[i].cell;
            const edge = new stepOption(startCell, nextCell.cell || nextCell);
            recurse([edge], nextCell.cell || nextCell, 1);
        }

        // Clean up touched cells so subsequent searches aren't corrupted
        for (let i = 0; i < touchedCells.length; i++) {
            touchedCells[i].my_shortest_path = Number.MAX_SAFE_INTEGER;
        }

        for (let i = 0; i < uniqueOptions.length; i++) {
            if (uniqueOptions[i].length === bestSize) {
                bestOptions.push(uniqueOptions[i]);
            }
        }

        const bestPath = bestOptions.length > 0 ? bestOptions[0] : null;
        const pathLength = bestPath ? bestPath.length : 0;
        const dx = Math.abs(targetMeta.my_x - startMeta.my_x);
        const dy = Math.abs(targetMeta.my_y - startMeta.my_y);
        const euclidean = Math.sqrt(dx * dx + dy * dy);
        const manhattan = dx + dy;
        const optimality = pathLength > 0 ? Number((pathLength / (euclidean || 1)).toFixed(2)) : 0;

        return new PathResult({
            success: bestOptions.length > 0,
            bestPath: bestPath,
            pathLength: pathLength,
            bestOptions: bestOptions,
            uniqueOptions: uniqueOptions,
            complexity: complexity,
            euclidean: Number(euclidean.toFixed(2)),
            manhattan: manhattan,
            optimalityRatio: optimality
        });
    }
}

/**
 * PathfinderService: Core Production Navigation Engine
 */
class PathfinderService {
    constructor() {
        this.strategies = new Map();
        this.registerStrategy("gpt", new GptBacktrackingDfsStrategy());
        this.registerStrategy("legacy", new LegacyDfsStrategy());
        this.defaultStrategy = "gpt";
    }

    registerStrategy(name, strategy) {
        if (!(strategy instanceof IPathfinderStrategy)) {
            throw new Error(`Strategy must implement IPathfinderStrategy contract`);
        }
        this.strategies.set(name, strategy);
    }

    findPath(startCell, targetCell, mapObject = null, strategyName = this.defaultStrategy, options = {}) {
        if (!startCell || !targetCell) {
            return new PathResult({ success: false, reason: "Start or Target cell is null" });
        }

        if (targetCell.isBlockedType && targetCell.isBlockedType()) {
            return new PathResult({ success: false, reason: "Target cell is blocked" });
        }

        const strategy = this.strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Pathfinder strategy '${strategyName}' is not registered`);
        }

        const t0 = performance.now();
        const result = strategy.findPath(startCell, targetCell, mapObject, options);
        const t1 = performance.now();

        result.executionTimeMs = Number((t1 - t0).toFixed(3));
        return result;
    }
}

// Global instance export
var globalPathfinderService = new PathfinderService();
