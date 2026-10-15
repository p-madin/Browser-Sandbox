# Project Roadmap: Grid Engine (Archive: Version 1)

This document is the historical archive of Roadmap Version 1, detailing the foundation phases (Phases 1 through 7) through the completion of the Component / Bitmask Model modernization.

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | High-Performance Viewport & DOM Retention | `P0 - Critical` | ✅ Completed | v3.1 |
| **Phase 2** | Smooth Per-Step Movement & Interpolated `walkPath()` | `P0 - Critical` | ✅ Completed | v3.1 |
| **Phase 3** | Player SVG Asset & Directional Rotation | `P1 - High` | ✅ Completed | v3.2 |
| **Phase 4** | Automated Pathfinder Benchmarking Harness | `P1 - High` | ✅ Completed | v3.2 |
| **Phase 5** | Pathfinder Decoupling: Production Engine vs. Research Suite | `P1 - High` | ✅ Completed | v3.3 |
| **Phase 6** | A* (A-Star) Engine & True Shortest-Path Guarantee | `P1 - High` | ✅ Completed | v3.3 |
| **Phase 7** | Decorator Modernization: Component / Bitmask State Model | `P1 - High` | ✅ Completed | v3.4 |

---

## Required Phases

### Phase 1: High-Performance Viewport Rendering & DOM Retention
* **Current Bottleneck**:
  Every step in [agent.js:walkPath](file:///c:/Workspace/HTML%20Workspace/GridV3/agent.js#L45-L68) calls `empty_frame(frame_root)` (`innerHTML = ''`), destroying and recreating 2,000–4,000 SVG `<rect>` elements every 50ms. This causes continuous layout recalculations, style recalculations, and garbage collection pressure.
* **Architecture Solution**:
  1. **Persistent Tile Pool (Virtual Grid Window)**:
     - Instantiate SVG elements **once** during initialization based on viewport dimensions plus a 2-tile margin buffer.
     - Never destroy DOM nodes during camera movement.
     - As the camera shifts, recalculate cell offsets using modulo indexing and update only the required SVG attributes/CSS classes (`cell_object.decorateCell()`), eliminating DOM element creation and teardown.
  2. **Alternative Canvas 2D Renderer Option**:
     - Provide an interchangeable HTML5 `<canvas>` rendering pipeline where the tilemap is blitted via `ctx.fillRect()` / `ctx.drawImage()`, delivering 60 FPS performance with zero DOM overhead.
  3. **Decouple View from Model**:
     - Remove `cell_element` direct binding from `cell_meta`. Master map tiles should remain pure data; the renderer maintains the visual binding.

---

### Phase 2: Smooth Per-Step Transitions (`walkPath()` Interpolation)
* **Current Bottleneck**:
  The agent teleports discretely from tile to tile in 50ms jumps, and the entire camera instantly snaps by integer tile coordinates.
* **Architecture Solution**:
  1. **Decouple Logic from Render Coordinates**:
     - Keep discrete integer coordinates `(agent.x, agent.y)` for collision and path calculations.
     - Introduce floating-point visual coordinates `(renderX, renderY)` for rendering.
  2. **`requestAnimationFrame` Motion Loop**:
     - Replace `setTimeout` with a high-precision `requestAnimationFrame` game loop.
     - Given a `stepOption(fromCell, toCell)`:
       $$\text{renderX}(t) = \text{lerp}(\text{from.x}, \text{to.x}, t)$$
       $$\text{renderY}(t) = \text{lerp}(\text{from.y}, \text{to.y}, t)$$
       where $t \in [0, 1]$ represents normalized step progress governed by a configurable travel speed.
  3. **Hardware-Accelerated Translation**:
     - Apply smooth translations directly to the player container using GPU-accelerated CSS transforms (`transform: translate3d(x, y, 0)`).
  4. **Smooth Damped Camera**:
     - Implement a smooth follow camera (critically damped spring or lerp) that glides softly toward the player rather than rigid 1-tile camera snaps.

---

### Phase 3: Player SVG Asset & Directional Heading Rotation
* **Current Bottleneck**:
  The player is represented as a static colored square (`.cell.agent.walking`) without visual orientation, facing direction, or character identity.
* **Architecture Solution**:
  1. **Vector Asset Design (`player.svg`)**:
     - Create a dedicated SVG sprite asset:
       - Distinct directional pointer / arrow visor indicating facing direction.
       - Base character body with subtle drop-shadow for depth.
       - Embedded state indicators (glow/color transitions for idle, walking, thinking, interacting).
  2. **Dynamic Heading Angle Calculation**:
     - When advancing through a `stepOption`, compute the trajectory angle $\theta$:
       $$\Delta x = \text{to.my\_x} - \text{from.my\_x}$$
       $$\Delta y = \text{to.my\_y} - \text{from.my\_y}$$
       $$\theta = \text{atan2}(\Delta y, \Delta x) \times \left(\frac{180}{\pi}\right)$$
       *(e.g., East: 0°, South-East: 45°, South: 90°, South-West: 135°, West: 180°, North-West: -135°, North: -90°, North-East: -45°)*.
  3. **Smooth Rotation Tween**:
     - Apply `transform: rotate(θdeg)` with CSS transition easing (`transition: transform 120ms ease-out`), ensuring the character turns smoothly to face the path direction before and while walking.

---

### Phase 4: Automated & Streamlined Pathfinder Benchmarking
* **Current Bottleneck**:
  Benchmarking currently requires uncommenting temporary code in `pathfinder.js`, generating raw console outputs, and manually pasting logs into `benchmarking.txt`.
* **Architecture Solution**:
  1. **Dedicated Benchmark Module (`benchmark.js`)**:
     - Create a standalone test runner decoupled from game rendering.
  2. **Standardized Test Battery**:
     - **Micro (1–5 steps)**: Direct cardinal and diagonal maneuvers.
     - **Short (5–15 steps)**: Local obstacles and clearing navigation.
     - **Medium (15–35 steps)**: Multi-biome traversal with tree grove routing.
     - **Stress / Maze (35–55+ steps)**: Deep dead-end cul-de-sacs and wall-skirting.
     - **Unreachable Targets**: Pathing into isolated blocked clusters.
  3. **Automated Telemetry Capture**:
     - Execution time (sub-millisecond precision via `performance.now()`).
     - State complexity (iterations / recursive nodes visited).
     - Memory allocation and garbage collection delta.
     - Optimality ratio: computed path length versus Euclidean / Manhattan lower bound.
  4. **UI Dashboard & Data Export**:
     - Add a floating modal / overlay in `test_grid.html` with a **"Run Benchmark Suite"** button.
     - Output interactive histograms, average latencies, and a one-click **"Export Benchmark Report"** (Markdown/JSON).

---

### Phase 5: Pathfinder Engine Modularization (Production vs. Research Suite)
* **Current Bottleneck**:
  [pathfinder.js](file:///c:/Workspace/HTML%20Workspace/GridV3/pathfinder.js) contains commented benchmark loops, conflicting recursion algorithms (`findUniquePathRecurse` vs `findUniquePathRecurseGPT`), and hardcoded UI manipulation mixed into graph traversal logic.
* **Architecture Solution**:
  1. **Modular Architecture & Strategy Pattern**:
     - Define a clean, uniform pathfinding contract:
       ```javascript
       interface IPathfinderStrategy {
           findPath(startCell, targetCell, mapObject): PathResult;
       }
       ```
  2. **Separation of Concerns**:
     - `PathfinderService.js`: Lightweight, hyper-optimized production navigation engine.
     - `PathfinderResearchLab.js`: Diagnostic harness with step-by-step debug visualization, branch exploration tracking, and telemetry recording.
     - `PathOptionsRenderer.js`: Dedicated UI controller managing the disclosure panel and path hover highlighting, decoupled from the search algorithm.
  3. **Purge Technical Debt**:
     - Remove dead / commented-out code blocks from production bundles.
     - Eliminate global variable dependencies (`to`, `from`, `globalGridObject`).

---

### Phase 6: A* (A-Star) Algorithm & True Shortest-Path Guarantee
* **Motivation**:
  Recursive DFS has a worst-case $O(b^d)$ time complexity, requiring an arbitrary hard limit of 55 steps (`depth >= 55`). This causes navigation to fail completely for distant targets and risks UI freezes when exploring complex obstacle clusters.
* **Implementation Plan**:
  - Implement A* using an admissible octile distance heuristic:
    $$h(\Delta x, \Delta y) = (\sqrt{2} - 1) \min(|\Delta x|, |\Delta y|) + \max(|\Delta x|, |\Delta y|)$$
  - Utilize a binary min-heap for the open set priority queue.
  - Multi-Parent Shortest-Path DAG: Discovers and presents all alternative routes sharing the exact same minimum step count in the options disclosure panel.
  - Guarantees $O(E \log V)$ optimal routing in < 2ms without depth cutoffs.

---

### Phase 7: Decorator Modernization: Component / Bitmask Model
* **Status**: ✅ Completed
* **Motivation**:
  Legacy `cell.js` relied on recursive class decorator wrappers (`new TreeDecoration(new GrassDecoration(new CellDecoration(cell))))`), requiring $O(D)$ recursive traversal for `isBlockedType()`, `findDecoration()`, and `removeDecoration()`, while generating excessive GC pressure and memory allocations across 40,000 map cells.
* **Architecture Solution**:
  - Implemented 32-bit integer bitmask state representation (`CellFlags`):
    ```javascript
    const CellFlags = Object.freeze({
        NONE: 0,
        BLOCKED: 1 << 0,  // 1
        GRASS: 1 << 1,    // 2
        TREE: 1 << 2,     // 4
        ENEMY: 1 << 3,    // 8
        AGENT: 1 << 4,    // 16
        SELECTED: 1 << 5, // 32
        SPECIAL: 1 << 6,  // 64
        THINKING: 1 << 7, // 128
        WALKING: 1 << 8   // 256
    });
    ```
  - Replaced wrapper allocations with $O(1)$ bitwise operations: `addFlag()`, `removeFlag()`, `hasFlag()`, `toggleFlag()`.
  - Passability check is instantaneous: `isBlockedType() { return (this.flags & (CellFlags.BLOCKED | CellFlags.TREE)) !== 0; }`.
  - Direct style assembly in `decorateCell()` eliminates DOM class bubbling down prototype chains.
  - Full backward compatibility retained: decorator classes in `Agent States/` now serve as zero-allocation proxies that set flags and return the underlying cell directly.
