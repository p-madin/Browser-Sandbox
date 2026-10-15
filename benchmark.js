/**
 * Pathfinder Benchmark Suite (Phase 4)
 * Automated, streamlined testing and telemetry harness for Grid Engine pathfinders.
 */

class PathfinderBenchmark {
    constructor() {
        this.results = [];
        this.isRunning = false;
        this.testBattery = [
            { id: "micro_east", name: "Micro: Cardinal East", category: "Micro (1-5)", from: [0, 0], to: [3, 0], wantBlocked: false },
            { id: "micro_diag", name: "Micro: Diagonal SE", category: "Micro (1-5)", from: [0, 0], to: [3, 3], wantBlocked: false },
            { id: "short_ne", name: "Short: North-East Clearing", category: "Short (5-15)", from: [0, 0], to: [6, -7], wantBlocked: false },
            { id: "short_sw", name: "Short: South-West Obstacle", category: "Short (5-15)", from: [0, 0], to: [-8, 6], wantBlocked: false },
            { id: "med_east", name: "Medium: Multi-Biome East", category: "Medium (15-35)", from: [0, 0], to: [18, 5], wantBlocked: false },
            { id: "med_west", name: "Medium: Tree Grove Routing", category: "Medium (15-35)", from: [0, 0], to: [-16, -14], wantBlocked: false },
            { id: "stress_deep", name: "Stress: Deep Wall-Skirting", category: "Stress (35-55+)", from: [0, 0], to: [24, 22], wantBlocked: false },
            { id: "unreachable", name: "Unreachable: Blocked Target", category: "Unreachable", from: [0, 0], to: [5, 5], wantBlocked: true }
        ];
    }

    findSafeCell(targetX, targetY, wantBlocked = false) {
        if (!globalMapObject || !globalMapObject.map_cells) return null;
        
        // Exact match check
        if (globalMapObject.map_cells[targetX] && globalMapObject.map_cells[targetX][targetY]) {
            var cell = globalMapObject.map_cells[targetX][targetY];
            if (cell.isBlockedType() === wantBlocked) {
                return cell;
            }
        }

        // Spiral search for nearest cell matching wantBlocked criteria
        for (var r = 1; r < 20; r++) {
            for (var dx = -r; dx <= r; dx++) {
                for (var dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) === r || Math.abs(dy) === r) {
                        var cx = targetX + dx;
                        var cy = targetY + dy;
                        if (globalMapObject.map_cells[cx] && globalMapObject.map_cells[cx][cy]) {
                            var candidate = globalMapObject.map_cells[cx][cy];
                            if (candidate.isBlockedType() === wantBlocked) {
                                return candidate;
                            }
                        }
                    }
                }
            }
        }
        return globalMapObject.map_cells[targetX][targetY];
    }

    runSingleTest(testDef, algorithm = 'gpt', iterations = 1) {
        var fromCell = this.findSafeCell(testDef.from[0], testDef.from[1], false);
        var toCell = this.findSafeCell(testDef.to[0], testDef.to[1], testDef.wantBlocked);

        if (!fromCell || !toCell) {
            return {
                id: testDef.id,
                name: testDef.name,
                category: testDef.category,
                algorithm: algorithm,
                status: "Error: Coordinates out of map bounds",
                success: false
            };
        }

        var times = [];
        var complexities = [];
        var lastOutcome = null;

        for (var iter = 0; iter < iterations; iter++) {
            var outcome = globalPathfinderService.findPath(fromCell, toCell, globalMapObject, algorithm);
            times.push(outcome.executionTimeMs);
            complexities.push(outcome.complexity);
            lastOutcome = outcome;
        }

        var totalTime = times.reduce((a, b) => a + b, 0);
        var avgTime = totalTime / times.length;
        var minTime = Math.min(...times);
        var maxTime = Math.max(...times);
        var avgComplexity = Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length);

        var fromMeta = fromCell.getCellMeta();
        var toMeta = toCell.getCellMeta();

        return {
            id: testDef.id,
            name: testDef.name,
            category: testDef.category,
            algorithm: algorithm,
            fromCoord: `(${fromMeta.my_x}, ${fromMeta.my_y})`,
            toCoord: `(${toMeta.my_x}, ${toMeta.my_y})`,
            euclidean: lastOutcome.euclidean,
            manhattan: lastOutcome.manhattan,
            success: lastOutcome.success,
            pathLength: lastOutcome.pathLength,
            bestPath: lastOutcome.bestPath,
            uniqueCount: lastOutcome.uniqueCount,
            bestCount: lastOutcome.bestCount,
            avgTimeMs: Number(avgTime.toFixed(3)),
            minTimeMs: Number(minTime.toFixed(3)),
            maxTimeMs: Number(maxTime.toFixed(3)),
            complexity: avgComplexity,
            optimalityRatio: lastOutcome.optimalityRatio,
            status: lastOutcome.success ? "Passed" : (testDef.wantBlocked ? "Expected Block" : "No Path")
        };
    }

    async runSuite(algorithm = 'gpt', iterations = 1, onProgress = null) {
        this.isRunning = true;
        var suiteResults = [];

        for (var i = 0; i < this.testBattery.length; i++) {
            var testDef = this.testBattery[i];
            if (onProgress) {
                onProgress({ current: i + 1, total: this.testBattery.length, testName: testDef.name });
            }
            // Yield briefly to keep UI responsive
            await new Promise(r => setTimeout(r, 10));

            var result = this.runSingleTest(testDef, algorithm, iterations);
            suiteResults.push(result);
        }

        this.isRunning = false;
        this.results = suiteResults;
        return suiteResults;
    }

    async runComparison(iterations = 1, onProgress = null) {
        this.isRunning = true;
        var comparison = [];

        var total = this.testBattery.length * 2;
        var current = 0;

        for (var i = 0; i < this.testBattery.length; i++) {
            var testDef = this.testBattery[i];

            current++;
            if (onProgress) onProgress({ current, total, testName: `${testDef.name} (GPT)` });
            await new Promise(r => setTimeout(r, 10));
            var gptResult = this.runSingleTest(testDef, 'gpt', iterations);

            current++;
            if (onProgress) onProgress({ current, total, testName: `${testDef.name} (Legacy)` });
            await new Promise(r => setTimeout(r, 10));
            var legacyResult = this.runSingleTest(testDef, 'legacy', iterations);

            var speedup = legacyResult.avgTimeMs > 0 && gptResult.avgTimeMs > 0
                ? (legacyResult.avgTimeMs / gptResult.avgTimeMs).toFixed(2) + "x"
                : "N/A";
            var nodeReduction = legacyResult.complexity > 0
                ? (((legacyResult.complexity - gptResult.complexity) / legacyResult.complexity) * 100).toFixed(1) + "%"
                : "0%";

            comparison.push({
                test: testDef.name,
                category: testDef.category,
                distance: gptResult.euclidean,
                gptTime: gptResult.avgTimeMs,
                legacyTime: legacyResult.avgTimeMs,
                speedup: speedup,
                gptComplexity: gptResult.complexity,
                legacyComplexity: legacyResult.complexity,
                nodeReduction: nodeReduction,
                pathLength: gptResult.pathLength,
                status: gptResult.status
            });
        }

        this.isRunning = false;
        this.lastComparison = comparison;
        return comparison;
    }

    generateMarkdown(results, mode = 'suite') {
        var lines = [];
        lines.push("# Pathfinder Benchmark Telemetry Report");
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push("");

        if (mode === 'compare' && this.lastComparison) {
            lines.push("## Head-to-Head Algorithm Comparison: GPT Backtracking vs. Legacy DFS");
            lines.push("");
            lines.push("| Test Case | Category | Euclidean | GPT Time (ms) | Legacy Time (ms) | Speedup | GPT Nodes | Legacy Nodes | Complexity Delta | Status |");
            lines.push("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");
            for (var c of this.lastComparison) {
                lines.push(`| **${c.test}** | ${c.category} | ${c.distance} | ${c.gptTime}ms | ${c.legacyTime}ms | **${c.speedup}** | ${c.gptComplexity.toLocaleString()} | ${c.legacyComplexity.toLocaleString()} | ${c.nodeReduction} | ${c.status} |`);
            }
        } else {
            lines.push("## Benchmark Suite Results");
            lines.push("");
            lines.push("| Test Case | Category | From $\\rightarrow$ To | Euclidean | Avg Latency | Complexity (Nodes) | Path Steps | Optimality | Status |");
            lines.push("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");
            for (var r of results) {
                lines.push(`| **${r.name}** | ${r.category} | ${r.fromCoord} $\\rightarrow$ ${r.toCoord} | ${r.euclidean} | ${r.avgTimeMs}ms | ${r.complexity.toLocaleString()} | ${r.pathLength} | ${r.optimalityRatio || 'N/A'} | ${r.status} |`);
            }
        }
        lines.push("");
        return lines.join("\n");
    }

    generateJSON(results) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            suiteResults: results,
            comparison: this.lastComparison || null
        }, null, 2);
    }
}

// UI Controller for test_grid.html
class BenchmarkUIController {
    constructor(benchmark) {
        this.benchmark = benchmark;
        this.lastResults = null;
        this.lastMode = 'suite';
        this.initDOM();
    }

    initDOM() {
        this.panel = document.getElementById("benchmark_panel");
        this.toggleBtn = document.getElementById("benchmark_toggle_btn");
        this.runBtn = document.getElementById("benchmark_run_btn");
        this.copyBtn = document.getElementById("benchmark_copy_btn");
        this.exportBtn = document.getElementById("benchmark_export_btn");
        this.algoSelect = document.getElementById("benchmark_algo_select");
        this.iterSelect = document.getElementById("benchmark_iter_select");
        this.statusEl = document.getElementById("benchmark_status");
        this.cardsEl = document.getElementById("benchmark_summary_cards");
        this.tableBody = document.getElementById("benchmark_results_body");

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener("click", () => this.toggleCollapse());
        }
        if (this.runBtn) {
            this.runBtn.addEventListener("click", () => this.handleRun());
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener("click", () => this.handleCopy());
        }
        if (this.exportBtn) {
            this.exportBtn.addEventListener("click", () => this.handleExport());
        }
    }

    toggleCollapse() {
        if (!this.panel) return;
        this.panel.classList.toggle("collapsed");
        var isCollapsed = this.panel.classList.contains("collapsed");
        this.toggleBtn.textContent = isCollapsed ? "+" : "_";
    }

    async handleRun() {
        if (this.benchmark.isRunning) return;
        var algo = this.algoSelect.value;
        var iters = parseInt(this.iterSelect.value, 10) || 1;

        this.runBtn.disabled = true;
        this.runBtn.textContent = "⏳ Running...";
        this.statusEl.textContent = "Initializing benchmark battery...";

        try {
            if (algo === 'compare') {
                this.lastMode = 'compare';
                var comparison = await this.benchmark.runComparison(iters, (p) => {
                    this.statusEl.textContent = `Running [${p.current}/${p.total}]: ${p.testName}...`;
                });
                this.renderComparisonTable(comparison);
            } else {
                this.lastMode = 'suite';
                var results = await this.benchmark.runSuite(algo, iters, (p) => {
                    this.statusEl.textContent = `Running [${p.current}/${p.total}]: ${p.testName}...`;
                });
                this.lastResults = results;
                this.renderSuiteTable(results);
                this.renderSummaryCards(results);
            }
            this.statusEl.textContent = `✅ Benchmark completed (${new Date().toLocaleTimeString()})`;
        } catch (err) {
            console.error("Benchmark error:", err);
            this.statusEl.textContent = `❌ Error: ${err.message}`;
        } finally {
            this.runBtn.disabled = false;
            this.runBtn.textContent = "▶ Run Suite";
        }
    }

    renderSummaryCards(results) {
        if (!this.cardsEl) return;
        this.cardsEl.style.display = "flex";

        var totalTime = results.reduce((acc, r) => acc + r.avgTimeMs, 0).toFixed(2);
        var totalNodes = results.reduce((acc, r) => acc + r.complexity, 0).toLocaleString();
        var passedCount = results.filter(r => r.success).length;
        var avgOptimality = (results.filter(r => r.optimalityRatio > 0)
            .reduce((acc, r) => acc + r.optimalityRatio, 0) / Math.max(1, passedCount)).toFixed(2);

        this.cardsEl.innerHTML = `
            <div class="benchmark_card">
                <div class="card_val">${totalTime}ms</div>
                <div class="card_lbl">Total Time</div>
            </div>
            <div class="benchmark_card">
                <div class="card_val">${totalNodes}</div>
                <div class="card_lbl">Total Nodes</div>
            </div>
            <div class="benchmark_card">
                <div class="card_val">${passedCount}/${results.length}</div>
                <div class="card_lbl">Paths Found</div>
            </div>
            <div class="benchmark_card">
                <div class="card_val">${avgOptimality}x</div>
                <div class="card_lbl">Avg Optimality</div>
            </div>
        `;
    }

    renderSuiteTable(results) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = "";

        // Reset table headers
        var thead = document.querySelector("#benchmark_results_table thead tr");
        if (thead) {
            thead.innerHTML = `
                <th>Test Case</th>
                <th>Distance</th>
                <th>Time</th>
                <th>Nodes</th>
                <th>Steps</th>
                <th>Opt.</th>
                <th>Status</th>
            `;
        }

        results.forEach((r, idx) => {
            var tr = document.createElement("tr");
            tr.className = "benchmark_row clickable";
            var statusBadge = r.success
                ? `<span class="badge success">Passed</span>`
                : (r.category === "Unreachable" ? `<span class="badge neutral">Expected Block</span>` : `<span class="badge fail">No Path</span>`);

            tr.innerHTML = `
                <td>
                    <strong>${r.name}</strong>
                    <div class="subtext">${r.category} | ${r.fromCoord} &rarr; ${r.toCoord}</div>
                </td>
                <td>${r.euclidean}</td>
                <td><span class="mono highlight">${r.avgTimeMs}ms</span></td>
                <td><span class="mono">${r.complexity.toLocaleString()}</span></td>
                <td>${r.pathLength || '-'}</td>
                <td>${r.optimalityRatio ? r.optimalityRatio + 'x' : '-'}</td>
                <td>${statusBadge}</td>
            `;

            if (r.bestPath && typeof window.highlightPath === 'function') {
                tr.addEventListener("click", () => {
                    if (typeof window.clearGridPaths === 'function') window.clearGridPaths();
                    window.highlightPath(r.bestPath);
                });
            }

            this.tableBody.appendChild(tr);
        });
    }

    renderComparisonTable(comparison) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = "";

        var thead = document.querySelector("#benchmark_results_table thead tr");
        if (thead) {
            thead.innerHTML = `
                <th>Test Case</th>
                <th>Distance</th>
                <th>GPT Time</th>
                <th>Legacy Time</th>
                <th>Speedup</th>
                <th>Complexity Delta</th>
                <th>Status</th>
            `;
        }

        comparison.forEach((c) => {
            var tr = document.createElement("tr");
            tr.className = "benchmark_row";
            tr.innerHTML = `
                <td>
                    <strong>${c.test}</strong>
                    <div class="subtext">${c.category}</div>
                </td>
                <td>${c.distance}</td>
                <td><span class="mono highlight">${c.gptTime}ms</span></td>
                <td><span class="mono">${c.legacyTime}ms</span></td>
                <td><span class="badge speedup">${c.speedup}</span></td>
                <td><span class="mono text-emerald">${c.nodeReduction}</span></td>
                <td><span class="badge success">${c.status}</span></td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    async handleCopy() {
        if (!this.lastResults && !this.benchmark.lastComparison) {
            this.statusEl.textContent = "Please run benchmark before copying report";
            return;
        }
        var md = this.benchmark.generateMarkdown(this.lastResults, this.lastMode);
        try {
            await navigator.clipboard.writeText(md);
            this.statusEl.textContent = "📋 Report copied to clipboard!";
            setTimeout(() => {
                this.statusEl.textContent = "Ready";
            }, 2500);
        } catch (err) {
            console.warn("Clipboard API restricted, showing modal/log:", err);
            this.statusEl.textContent = "Exported report to console (Clipboard access blocked)";
            console.log(md);
        }
    }

    handleExport() {
        if (!this.lastResults && !this.benchmark.lastComparison) {
            this.statusEl.textContent = "Please run benchmark before exporting JSON";
            return;
        }
        var jsonStr = this.benchmark.generateJSON(this.lastResults);
        var blob = new Blob([jsonStr], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = `pathfinder_benchmark_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.statusEl.textContent = "💾 Exported benchmark JSON file";
    }
}

// Global initialization on window load
var globalBenchmarkInstance = null;
var globalBenchmarkUI = null;

window.addEventListener("load", function () {
    setTimeout(function () {
        globalBenchmarkInstance = new PathfinderBenchmark();
        globalBenchmarkUI = new BenchmarkUIController(globalBenchmarkInstance);
    }, 100);
});
