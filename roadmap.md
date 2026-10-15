# Project Roadmap: Grid Engine

This document outlines the strategic engineering roadmap for Grid Engine, detailing current architectural bottlenecks, prioritized development phases, technical specifications, and recommended future expansions.

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Estimated Complexity | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | High-Performance Viewport & DOM Retention | `P0 - Critical` | Medium | v3.1 |
| **Phase 2** | Smooth Per-Step Movement & Interpolated `walkPath()` | `P0 - Critical` | Medium | v3.1 |
| **Phase 3** | Player SVG Asset & Directional Rotation | `P1 - High` | Low | v3.2 |
| **Phase 4** | Automated Pathfinder Benchmarking Harness | `P1 - High` | Medium | v3.2 |
| **Phase 5** | Pathfinder Decoupling: Production Engine vs. Research Suite | `P1 - High` | Medium | v3.3 |
| **Phase 6** | A* (A-Star) Engine & True Shortest-Path Guarantee | `P1 - High` | Medium | v3.3 |
| **Phase 7** | Real-Time Game Loop & Autonomous NPC AI (`tick()`) | `P2 - Medium` | High | v3.4 |
| **Phase 8** | Decorator Modernization: Component / Bitmask State Model | `P2 - Medium` | Medium | v3.4 |
| **Phase 9** | Dynamic Fog of War & Line-of-Sight Visibility | `P3 - Low` | Medium | v3.5 |
| **Phase 10** | Web Audio SFX & Interactive Particle FX | `P3 - Low` | Low | v3.5 |

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

## Suggested Additional Phases

### Phase 6: A* (A-Star) Algorithm & True Shortest-Path Guarantee
* **Motivation**:
  Recursive DFS has a worst-case $O(b^d)$ time complexity, requiring an arbitrary hard limit of 55 steps (`depth >= 55`). This causes navigation to fail completely for distant targets and risks UI freezes when exploring complex obstacle clusters.
* **Implementation Plan**:
  - Implement A* using an admissible octile distance heuristic:
    $$h(\Delta x, \Delta y) = (\sqrt{2} - 1) \min(|\Delta x|, |\Delta y|) + \max(|\Delta x|, |\Delta y|)$$
  - Utilize a binary min-heap for the open set priority queue.
  - Guarantees $O(E \log V)$ optimal routing in < 2ms without depth cutoffs.

### Phase 7: Real-Time Game Loop & Autonomous NPC AI (`tick()`)
* **Motivation**:
  `EnemyDecoration` instances are spawned into `all_agents`, but remain static. An active world requires living entities that react to the player.
* **Implementation Plan**:
  - Implement a central ticker loop (`requestAnimationFrame` / 100ms tick interval).
  - Add Finite State Machine (FSM) AI for enemies:
    - **Patrol**: Wander within home grass biome.
    - **Alert / Investigate**: Turn toward player if sound/movement detected within radius.
    - **Chase**: Execute pathfinding toward player coordinates.
    - **Attack / Interact**: Trigger encounter if within distance $\le 1.4$.

### Phase 8: Decorator Modernization: Component / Bitmask Model
* **Motivation**:
  [cell.js](file:///c:/Workspace/HTML%20Workspace/GridV3/cell.js#L141) currently relies on `new(eval(this.constructor.name))` to remove decorators, which breaks under bundlers, is slow, and inverts decoration chains.
* **Implementation Plan**:
  - Transition to an Entity-Component or Bitmask Flag model:
    ```javascript
    const CellFlags = {
        NONE: 0,
        BLOCKED: 1 << 0,
        GRASS: 1 << 1,
        TREE: 1 << 2,
        ENEMY: 1 << 3,
        AGENT: 1 << 4
    };
    ```
  - State changes become fast bitwise operations (`cell.flags |= CellFlags.TREE`), eliminating object wrapper allocations entirely while retaining clean styling hooks.

### Phase 9: Dynamic Fog of War & Line of Sight (Raycasting FOV)
* **Motivation**:
  The entire map is currently 100% visible, reducing exploration excitement and tactical value.
* **Implementation Plan**:
  - Add shadowcasting or Bresenham raycasting field of view (FOV).
  - Three visibility tiers: Unexplored (black), Previously Explored (dim / static), Currently Visible (bright / dynamic).

### Phase 10: Web Audio SFX & Interactive Particle Effects
* **Motivation**:
  Visual actions (woodcutting, walking, enemy encounters) lack sensory feedback.
* **Implementation Plan**:
  - Zero-dependency procedural sound generator using Web Audio API:
    - Rhythmic footsteps with tonal variation (grass vs. stone).
    - Wooden crunch / thud sound on tree chopping.
    - Subtle tone chime upon destination arrival.
  - SVG/Canvas particle burst (wood splinters, grass blades) when interacting with environment tiles.
