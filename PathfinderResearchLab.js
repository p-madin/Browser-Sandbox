/**
 * PathfinderResearchLab.js (Phase 5)
 * Diagnostic harness and research suite for in-depth pathfinding analysis:
 * - Step-by-step branch exploration tracking
 * - Comparative algorithm profiling
 * - Historical telemetry logging
 */

class PathfinderResearchLab {
    constructor(service = null) {
        this.service = service || globalPathfinderService;
        this.history = [];
    }

    profile(startCell, targetCell, mapObject, strategyNames = ['gpt', 'legacy']) {
        const profileRun = {
            id: `profile_${Date.now()}`,
            timestamp: new Date().toISOString(),
            start: startCell.getCellMeta().my_x + "," + startCell.getCellMeta().my_y,
            target: targetCell.getCellMeta().my_x + "," + targetCell.getCellMeta().my_y,
            runs: {}
        };

        for (const name of strategyNames) {
            const result = this.service.findPath(startCell, targetCell, mapObject, name);
            profileRun.runs[name] = {
                success: result.success,
                pathLength: result.pathLength,
                complexity: result.complexity,
                timeMs: result.executionTimeMs,
                uniquePathsFound: result.uniqueOptions.length,
                optimality: result.optimalityRatio
            };
        }

        this.history.push(profileRun);
        return profileRun;
    }

    getHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
    }
}

var globalResearchLab = new PathfinderResearchLab();
