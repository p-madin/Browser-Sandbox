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
        pathCost = 0,
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
        this.pathCost = pathCost;
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
        if (!stepOptions || !Array.isArray(stepOptions)) return [];
        var toMeta = (targetCell && typeof targetCell.getCellMeta === 'function') ? targetCell.getCellMeta() : targetCell;
        if (!toMeta) return [];
        var temp = [];
        for (var i = 0; i < stepOptions.length; i++) {
            var item = stepOptions[i];
            if (!item) continue;
            var cellObj = item.cell ? item.cell : item;
            var candidateMeta = (cellObj && typeof cellObj.getCellMeta === 'function') ? cellObj.getCellMeta() : cellObj;
            if (!candidateMeta) continue;
            var dx = Math.abs(candidateMeta.my_x - toMeta.my_x);
            var dy = Math.abs(candidateMeta.my_y - toMeta.my_y);
            var dist = Math.sqrt(dx * dx + dy * dy);
            var cost = typeof PathfinderService !== 'undefined' ? PathfinderService.getTerrainBaseCost(candidateMeta) : 1.0;
            temp.push({ cell: cellObj, distance: dist, cost: cost });
        }
        temp.sort((a, b) => (a.distance * a.cost) - (b.distance * b.cost));
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

        let totalCost = 0;
        if (bestPath) {
            for (let s = 0; s < bestPath.length; s++) {
                const edge = bestPath[s];
                const toM = edge.stepOptionToCell ? (typeof edge.stepOptionToCell.getCellMeta === 'function' ? edge.stepOptionToCell.getCellMeta() : edge.stepOptionToCell) : null;
                totalCost += PathfinderService.getTerrainBaseCost(toM);
            }
        }

        return new PathResult({
            success: bestOptions.length > 0,
            bestPath: bestPath,
            pathLength: pathLength,
            pathCost: Number(totalCost.toFixed(2)),
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

        let totalCost = 0;
        if (bestPath) {
            for (let s = 0; s < bestPath.length; s++) {
                const edge = bestPath[s];
                const toM = edge.stepOptionToCell ? (typeof edge.stepOptionToCell.getCellMeta === 'function' ? edge.stepOptionToCell.getCellMeta() : edge.stepOptionToCell) : null;
                totalCost += PathfinderService.getTerrainBaseCost(toM);
            }
        }

        return new PathResult({
            success: bestOptions.length > 0,
            bestPath: bestPath,
            pathLength: pathLength,
            pathCost: Number(totalCost.toFixed(2)),
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
 * Priority Queue Binary Min-Heap for A*
 */
class BinaryHeap {
    constructor() {
        this.content = [];
    }

    push(element, priority) {
        this.content.push({ element, priority });
        this.bubbleUp(this.content.length - 1);
    }

    pop() {
        if (this.content.length === 0) return null;
        const result = this.content[0];
        const end = this.content.pop();
        if (this.content.length > 0) {
            this.content[0] = end;
            this.sinkDown(0);
        }
        return result.element;
    }

    peekPriority() {
        return this.content.length > 0 ? this.content[0].priority : Infinity;
    }

    isEmpty() {
        return this.content.length === 0;
    }

    size() {
        return this.content.length;
    }

    bubbleUp(n) {
        const element = this.content[n];
        while (n > 0) {
            const parentN = Math.floor((n + 1) / 2) - 1;
            const parent = this.content[parentN];
            if (element.priority >= parent.priority) break;
            this.content[parentN] = element;
            this.content[n] = parent;
            n = parentN;
        }
    }

    sinkDown(n) {
        const length = this.content.length;
        const element = this.content[n];
        while (true) {
            const child2N = (n + 1) * 2;
            const child1N = child2N - 1;
            let swap = null;
            let child1;

            if (child1N < length) {
                child1 = this.content[child1N];
                if (child1.priority < element.priority) {
                    swap = child1N;
                }
            }
            if (child2N < length) {
                const child2 = this.content[child2N];
                if (child2.priority < (swap === null ? element.priority : child1.priority)) {
                    swap = child2N;
                }
            }
            if (swap === null) break;
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
        }
    }
}

/**
 * Production Strategy: A* (A-Star) Engine with All-Shortest-Paths DAG Discovery
 * Discovers ALL alternative routes sharing the exact same minimum step count / cost.
 */
class AStarStrategy extends IPathfinderStrategy {
    octileDistance(dx, dy) {
        const min = Math.min(dx, dy);
        const max = Math.max(dx, dy);
        return (0.41421356237 * min + max);
    }

    findPath(startCell, targetCell, mapObject, options = {}) {
        const startMeta = startCell.getCellMeta();
        const targetMeta = targetCell.getCellMeta();
        const maxPaths = options.maxPaths || 25; // Maximum equal-shortest routes to collect
        const EPSILON = 0.001;

        if (startMeta.my_cell_ref === targetMeta.my_cell_ref) {
            return new PathResult({
                success: true,
                bestPath: [],
                pathLength: 0,
                bestOptions: [[]],
                uniqueOptions: [[]],
                complexity: 0
            });
        }

        const openHeap = new BinaryHeap();
        const closedSet = new Set();
        const gScores = new Map();
        const cameFrom = new Map(); // Multi-parent DAG: cellRef -> Array<{ fromCell, toCell }>

        let complexity = 0;
        const maxComplexity = options.maxComplexity || 500000;

        const startRef = startMeta.my_cell_ref;
        const targetRef = targetMeta.my_cell_ref;

        let minTargetG = Infinity;

        gScores.set(startRef, 0);
        const initialH = this.octileDistance(
            Math.abs(targetMeta.my_x - startMeta.my_x),
            Math.abs(targetMeta.my_y - startMeta.my_y)
        );
        openHeap.push(startCell, initialH);

        while (!openHeap.isEmpty()) {
            complexity++;
            if (complexity > maxComplexity) {
                break;
            }

            // If we have reached target and remaining frontier cannot equal or beat minTargetG, stop
            if (minTargetG < Infinity && openHeap.peekPriority() > minTargetG + EPSILON) {
                break;
            }

            const currentCell = openHeap.pop();
            const currentMeta = currentCell.getCellMeta();
            const currentRef = currentMeta.my_cell_ref;

            if (closedSet.has(currentRef)) {
                continue;
            }
            closedSet.add(currentRef);

            const currentG = gScores.get(currentRef) ?? Infinity;
            const neighbors = currentMeta.my_step_option || [];

            for (let i = 0; i < neighbors.length; i++) {
                const nextCell = neighbors[i];
                const nextMeta = nextCell.getCellMeta();
                const nextRef = nextMeta.my_cell_ref;

                const dx = Math.abs(nextMeta.my_x - currentMeta.my_x);
                const dy = Math.abs(nextMeta.my_y - currentMeta.my_y);
                const isDiagonal = (dx !== 0 && dy !== 0);

                // Phase 5: Geomorphic Terrain Movement Weighting
                const baseCost = PathfinderService.getTerrainBaseCost(nextMeta);
                let stepCost = isDiagonal ? baseCost * 1.41421356237 : baseCost;

                if (nextMeta.hasFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR) && !nextMeta.hasFlag(CellFlags.STRUCTURE_DOOR_OPEN)) {
                    stepCost += 1.5;
                }

                // Elevation slope kinetic modifier (uphill effort, downhill momentum)
                const fromElev = currentMeta.elevation !== undefined ? currentMeta.elevation : 1;
                const toElev = nextMeta.elevation !== undefined ? nextMeta.elevation : 1;
                const elevDelta = toElev - fromElev;
                if (elevDelta > 0) {
                    stepCost += 0.4 * elevDelta;
                } else if (elevDelta < 0) {
                    // Downhill momentum bonus, bounded by baseCost to preserve octileDistance admissibility
                    stepCost = Math.max(baseCost, stepCost - 0.1 * Math.abs(elevDelta));
                }

                const tentativeG = currentG + stepCost;

                // Check target reach
                if (nextRef === targetRef) {
                    if (tentativeG < minTargetG - EPSILON) {
                        minTargetG = tentativeG;
                        cameFrom.set(nextRef, [{ fromCell: currentCell, toCell: nextCell }]);
                    } else if (Math.abs(tentativeG - minTargetG) <= EPSILON) {
                        const parents = cameFrom.get(nextRef) || [];
                        if (!parents.some(p => p.fromCell.getCellMeta().my_cell_ref === currentRef)) {
                            parents.push({ fromCell: currentCell, toCell: nextCell });
                            cameFrom.set(nextRef, parents);
                        }
                    }
                    continue;
                }

                if (closedSet.has(nextRef)) continue;

                const prevG = gScores.get(nextRef) ?? Infinity;

                if (tentativeG < prevG - EPSILON) {
                    gScores.set(nextRef, tentativeG);
                    cameFrom.set(nextRef, [{ fromCell: currentCell, toCell: nextCell }]);
                    const h = this.octileDistance(
                        Math.abs(targetMeta.my_x - nextMeta.my_x),
                        Math.abs(targetMeta.my_y - nextMeta.my_y)
                    );
                    openHeap.push(nextCell, tentativeG + h);
                } else if (Math.abs(tentativeG - prevG) <= EPSILON) {
                    const parents = cameFrom.get(nextRef) || [];
                    if (!parents.some(p => p.fromCell.getCellMeta().my_cell_ref === currentRef)) {
                        parents.push({ fromCell: currentCell, toCell: nextCell });
                        cameFrom.set(nextRef, parents);
                    }
                }
            }
        }

        if (minTargetG === Infinity && !cameFrom.has(targetRef)) {
            return new PathResult({
                success: false,
                complexity: complexity,
                reason: "No reachable path exists"
            });
        }

        // Reconstruct all paths from target back to start via multi-parent DAG
        const allPaths = [];
        const visitedInBranch = new Set();

        const backtrack = (cellRef, currentEdges) => {
            if (allPaths.length >= maxPaths) return;

            if (cellRef === startRef) {
                // Reverse to get path from start -> target
                const reversed = [...currentEdges].reverse();
                reversed._cost = Number(minTargetG.toFixed(2));
                allPaths.push(reversed);
                return;
            }

            const incomingEdges = cameFrom.get(cellRef) || [];
            for (let i = 0; i < incomingEdges.length; i++) {
                if (allPaths.length >= maxPaths) break;
                const edge = incomingEdges[i];
                const fromRef = edge.fromCell.getCellMeta().my_cell_ref;

                if (visitedInBranch.has(fromRef)) continue; // cycle prevention

                visitedInBranch.add(fromRef);
                const StepOpt = (typeof stepOption !== 'undefined') ? stepOption : (typeof require !== 'undefined' ? require('./stepOption.js').stepOption : class {
                    constructor(f, t) { this.stepOptionFromCell = f; this.stepOptionToCell = t; this.stepOptionWeight = 1; }
                });
                const step = new StepOpt(edge.fromCell, edge.toCell);
                const toMeta = edge.toCell ? (typeof edge.toCell.getCellMeta === 'function' ? edge.toCell.getCellMeta() : edge.toCell) : null;
                step.stepOptionWeight = PathfinderService.getTerrainBaseCost(toMeta);
                currentEdges.push(step);
                backtrack(fromRef, currentEdges);
                currentEdges.pop();
                visitedInBranch.delete(fromRef);
            }
        };

        backtrack(targetRef, []);

        if (allPaths.length === 0) {
            return new PathResult({
                success: false,
                complexity: complexity,
                reason: "Path reconstruction failed"
            });
        }

        const bestPath = allPaths[0];
        const pathLength = bestPath.length;
        const dx = Math.abs(targetMeta.my_x - startMeta.my_x);
        const dy = Math.abs(targetMeta.my_y - startMeta.my_y);
        const euclidean = Math.sqrt(dx * dx + dy * dy);
        const manhattan = dx + dy;
        const optimality = pathLength > 0 ? Number((pathLength / (euclidean || 1)).toFixed(2)) : 0;

        return new PathResult({
            success: true,
            bestPath: bestPath,
            pathLength: pathLength,
            pathCost: Number(minTargetG.toFixed(2)),
            bestOptions: allPaths,
            uniqueOptions: allPaths,
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
    /**
     * Phase 5: Geomorphic Terrain Resistance Cost Matrix
     * Returns the base movement cost multiplier for traversing a cell.
     * Minimum cost is strictly >= 1.0 to preserve A* octileDistance heuristic admissibility.
     */
    static getTerrainBaseCost(cellMeta) {
        if (!cellMeta) return 1.10;
        const f = cellMeta.flags || 0;
        // 1. Bridges, paved stone paths, floor decks: smooth highway (1.00)
        if ((f & (CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_FLOOR)) !== 0) {
            return 1.00;
        }
        // 2. Shallow water (without bridge): fluid drag (1.85)
        if ((f & CellFlags.WATER_SHALLOW) !== 0) {
            return 1.85;
        }
        // 3. Earthen ramps: slope incline (1.35)
        if ((f & CellFlags.TERRAIN_RAMP) !== 0) {
            return 1.35;
        }
        // 4. Alluvial sand: loose footing (1.25)
        if ((f & CellFlags.TERRAIN_SAND) !== 0) {
            return 1.25;
        }
        // 5. Meadow grass and wild flora: foliage resistance (1.15)
        if ((f & (CellFlags.GRASS | CellFlags.TERRAIN_FLORA | CellFlags.TREE)) !== 0) {
            return 1.15;
        }
        // 6. Standard ground / dirt baseline (1.10)
        return 1.10;
    }

    constructor() {
        this.strategies = new Map();
        this.registerStrategy("astar", new AStarStrategy());
        this.registerStrategy("gpt", new GptBacktrackingDfsStrategy());
        this.registerStrategy("legacy", new LegacyDfsStrategy());
        this.defaultStrategy = "astar"; // A* is now the default production strategy
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

if (typeof window !== 'undefined') {
    window.PathfinderService = PathfinderService;
    window.globalPathfinderService = globalPathfinderService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PathfinderService, globalPathfinderService };
}
