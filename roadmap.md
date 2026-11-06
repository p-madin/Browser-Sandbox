# Project Roadmap 10: High-Performance Locomotion Kinematics, Compositor Optimization & Canvas 2D Architecture

This roadmap establishes the technical specifications, architectural refactoring, empirical telemetry framework, and future migration blueprint required to achieve locked 60–75 FPS locomotion across all biomes. Key objectives include isolating static SVG terrain vector paths from dynamic browser compositor invalidations, consolidating 540 per-tile animated reticles into a unified continuous macro-shoreline wave path, converting synchronous full-viewport grid sweeps into 1-tile frontier diffing, providing an automated markdown benchmark generator, and designing the subsequent conversion from retained-mode `<svg>` to immediate-mode layered `<canvas>`.

> [!NOTE]
> - **Roadmap 1 (Engine Core)**: Archival reference in [Documentation/roadmap1.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap1.md) (Viewport, Lerping, Vector Heading, Benchmarking, Modular A*, Bitmask Model).  
> - **Roadmap 2 (Structural Architecture)**: Archival reference in [Documentation/roadmap2.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap2.md) (Blueprints, Procedural Placer, Interactive Doors/Barricades, Roof Cutaways).  
> - **Roadmap 3 (Terrain & Hydrology)**: Archival reference in [Documentation/roadmap3.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap3.md) (Rivers, Lakes, Elevation Tiers, Chasms, Bridges, Riparian Ecology).  
> - **Roadmap 4 (Collision Resolution & Layer Precedence)**: Archival reference in [Documentation/roadmap4.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap4.md) (Cell flag hierarchy, CSS specificity cascades, seed-deterministic retries).  
> - **Roadmap 5 (Macro-Geomorphic Clearance & River Bridges)**: Archival reference in [Documentation/roadmap5.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap5.md) (Disjoint geomorphic domains, zero water-mountain-chasm overlaps, mandatory river bridge spans).  
> - **Roadmap 6 (Geomorphic Crossings & Organic Contours)**: Archival reference in [Documentation/roadmap6.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap6.md) (Adaptive chasm raycasting bridges, wading kinematics, feGaussianBlur threshold contours).  
> - **Roadmap 7 (Procedural Topography & Subagent Synergy)**: Archival reference in [Documentation/roadmap7.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap7.md) (Seed-driven massifs, hydrology deflection, unconstrained chasms, AgentBridge).  
> - **Roadmap 8 (Rendering Optimization & Vector Landmark Contours)**: Archival reference in [Documentation/roadmap8.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap8.md) (Symbol instancing, dirty-checking, 75 FPS walk certification, Marching Squares vector paths).  
> - **Roadmap 9 (Geomorphic Riparian Buffers, Ecotones & Topographic Relief)**: Archival reference in [Documentation/roadmap9.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap9.md) (Alluvial sandbars, ecotone detritus, directional sun azimuth casting, tidal reticle waves, biome path costs).  
> - **Roadmap 10 Empirical Benchmark Log**: Canonical telemetry registry in [Documentation/Benchmarking/roadmap10_benchmark.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/Benchmarking/roadmap10_benchmark.md) (mirror: [roadmap10_benchmark.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/roadmap10_benchmark.md)).

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Metric |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | **Automated Empirical Benchmark Template & Markdown Row Generator** | `P0 - Critical` | ✅ Completed & Verified | 5-Route Telemetry Standard |
| **Phase 2** | **Compositor Layer Decomposition & `will-change` Isolation** | `P0 - Critical` | ✅ Completed & Verified | Mountains: 74.3 FPS (0% jank), Spawn: 33.7 FPS |
| **Phase 3** | **Macro-Shoreline Compound Waves & Reticle Animation Decoupling** | `P0 - Critical` | 🟡 Ready for Implementation | River $\ge$ 45 FPS (1 path vs 540) |
| **Phase 4** | **Sparse Open-Water Swell Optimization & Distance Culling** | `P1 - High` | 🔲 Scheduled | Lake $\ge$ 55 FPS (4 harmonic phases) |
| **Phase 5** | **Frontier-Only Grid Updating & Locomotion Kinematics Overhaul** | `P0 - Critical` | 🔲 Scheduled | `updateGrid` < 0.8 ms, 0 frame drops |
| **Phase 6** | **Multi-Biome 75 FPS Certification, SVG Limits & Canvas Decision Gate** | `P0 - Critical` | 🔲 Scheduled | Locked 60–75 FPS across all seeds |

---

## Architectural Progression Diagram

```mermaid
flowchart TD
    subgraph R10 ["Roadmap 10: High-Performance Locomotion Kinematics & Compositor Engine"]
        P1["Phase 1: Automated Empirical Benchmark Template & Markdown Row Generator<br/>(Documentation/Benchmarking/roadmap10_benchmark.md)"]
        P2["Phase 2: Compositor Layer Decomposition<br/>(will-change: transform; contain: strict;)"]
        P3["Phase 3: Macro-Shoreline Compound Waves<br/>(540 reticle animations -> 1 continuous GPU wave path)"]
        P4["Phase 4: Open-Water Swell Cluster Culling<br/>(16-tile distance culling & 4 harmonic phase buckets)"]
        P5["Phase 5: Frontier-Only Grid Updating<br/>(1-tile diffing during walkPath)"]
        P6["Phase 6: Multi-Biome Certification & Architectural Decision Gate<br/>(SVG Performance Boundary Assessment)"]
        
        P1 --> P2
        P2 --> P3
        P3 --> P4
        P4 --> P5
        P5 --> P6
    end

    subgraph R11 ["Roadmap 11: Next-Gen Canvas 2D Migration Engine (Architectural Evolution)"]
        C1["Phase 1: Multi-Layered Canvas Viewport Architecture & Coordinate Pipeline"]
        C2["Phase 2: Procedural Sprite Atlas & Tile Sheet Batching"]
        C3["Phase 3: High-Resolution Path2D Vector Terrain Rendering"]
        C4["Phase 4: Zero-DOM Particle & Hydrological Kinematics"]
        C5["Phase 5: Hardware-Accelerated Camera Gliding & Viewport Blitting"]
        C6["Phase 6: Head-to-Head Comparative Certification: SVG vs. Canvas"]
        
        C1 --> C2
        C2 --> C3
        C3 --> C4
        C4 --> C5
        C5 --> C6
    end

    P6 -->|"Empirical Evaluation & Decision Gate"| C1
```

---

## Technical Specifications & Phase Breakdown

### Phase 1: Automated Empirical Benchmark Template & Markdown Row Generator
* **Status**: ✅ Completed & Verified
* **Outcome**: Established [Documentation/Benchmarking/roadmap10_benchmark.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/Benchmarking/roadmap10_benchmark.md) (mirror: [roadmap10_benchmark.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/roadmap10_benchmark.md)), enhanced `benchmark.js` with automated markdown row formatting and section updating, integrated the `📊 Record Phase Benchmark` UI harness in `test_grid.html`, and executed the baseline 5-route benchmark via `scripts/run_phase_benchmark.js`, recording the initial 62.0 FPS stationary baseline and multi-route locomotion figures.
* **Goal**: Establish a standardized, automated empirical benchmarking infrastructure that establishes pre-optimization baselines across 5 standardized biome routes and automatically generates, formats, and appends GitHub-Flavored Markdown table rows directly into `Documentation/Benchmarking/roadmap10_benchmark.md` and `./roadmap10_benchmark.md` for every subsequent phase.

#### Problem Statement & Root Cause
1. **Manual Telemetry Bottleneck**:
   - In Roadmap 9 Phase 6, measuring frame rates required running custom scratch scripts and manually copying console logs. This lacks repeatability and creates latency when comparing iterative optimizations.
2. **Missing Longitudinal Comparison Document**:
   - As optimizations progress from Layer Decomposition to Macro Waves to Frontier Diffing, each phase needs a clear row-by-row comparative record tracking exact metrics against the identical baseline routes.

#### Architectural Solutions
1. **Benchmark Template Specification (`Documentation/Benchmarking/roadmap10_benchmark.md` & `./roadmap10_benchmark.md`)**:
   - Formulate a permanent markdown benchmark log containing environment metadata (OS, GPU, Chrome version, Viewport 1936×1036, seed `12345`), followed by a master multi-phase summary matrix.
   - Define the 5 standardized certification routes:
     - **Route 1: Lowland Meadow** (`spawn`, seed 12345, 10 steps, baseline 16–20 FPS).
     - **Route 2: Mountain Ramp** (`mountains`, seed 12345, 10 steps, baseline 60–65 FPS).
     - **Route 3: River Crossing** (`river`, seed 12345, 10 steps, baseline 6.7–7.3 FPS).
     - **Route 4: Canyon Suspension Rim** (`canyons`, seed 12345, 10 steps, baseline 45–55 FPS).
     - **Route 5: Lakeside Waterfront** (`lake`, seed 12345, 10 steps, baseline 12–15 FPS).
2. **Automated Row Generator in `benchmark.js`**:
   - Extend `WalkAnimationBenchmark` in [`benchmark.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/benchmark.js):
     - `formatPhaseMarkdownRow(phaseName, biome, telemetry)`: Generates an individual GitHub-Flavored Markdown table row.
     - `formatMultiBiomePhaseReport(phaseName, multiBiomeReport)`: Formats the entire multi-route comparison table for that phase.
     - `appendPhaseToBenchmarkMarkdown(phaseName, multiBiomeReport)`: Appends or updates the target phase section in the markdown file.
3. **Automated Node CLI Runner (`scripts/run_phase_benchmark.js`)**:
   - Provide a zero-touch CLI command:
     ```powershell
     node scripts/run_phase_benchmark.js --phase "Baseline" --seed 12345
     ```
   - Connects to headless Chrome via Chrome DevTools Protocol (CDP), teleports to each of the 5 routes, runs `runWalkBenchmark(10, biome)`, extracts high-resolution frame deltas and DOM counts, and directly appends the formatted markdown rows to `Documentation/Benchmarking/roadmap10_benchmark.md`.
4. **Interactive Browser UI Button**:
   - In [`test_grid.html`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/test_grid.html), add a `📊 Record Phase Benchmark` button with a phase dropdown selector (`Baseline`, `Phase 2`, `Phase 3`, etc.) that executes the suite and offers instant clipboard copying or markdown file export.

---

### Phase 2: Compositor Layer Decomposition & `will-change` Isolation
* **Status**: ✅ Completed & Verified
* **Outcome**: Decomposed `#world_viewport` into `#layer_static_terrain`, `#layer_interactive_tiles`, and `#layer_dynamic_structures`. Promoted `#layer_static_terrain`, `#world_terrain_paths`, `#world_shadow_paths`, and `#world_ramp_paths` to isolated GPU hardware layers with `will-change: transform; contain: strict; pointer-events: none;`. Mountains walk frame rate leaped to **74.3 FPS with 0.0% jank frames** (13.34 ms latency, max spike 13.5 ms), Canyons reached **72.1 FPS** (3% jank), and Spawn rose to **33.7 FPS** (up from 23.5 FPS). Full telemetry recorded in `roadmap10_benchmark.md`.
* **Goal**: Isolate 350,000 characters of static Marching Squares vector paths, 128,000 characters of building/tree shadow fills, and boundary scatter into an independent GPU-backed hardware texture layer, preventing any dynamic element or player movement from triggering Skia vector re-rasterization.

#### Problem Statement & Root Cause
1. **The Shared-Compositor Invalidation Trap**:
   - Currently, `<svg id="frame">` contains `<g id="world_viewport">` which has `will-change: transform`. Chrome promotes `#world_viewport` to a single GPU layer.
   - However, `#world_viewport` contains both the massive static paths (`#world_terrain_paths`, `#world_shadow_paths`) AND all dynamic interactive elements (`#tiles_layer`, `#reticles_layer`, `#features_layer`).
   - When any child element changes attributes, animates, or moves, Chrome invalidates the entire `#world_viewport` texture, forcing Skia to re-parse and re-rasterize over 350,000 vector path commands every frame.

#### Architectural Solutions
1. **Three-Tier Compositor Decomposition in [`grid.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/grid.js)**:
   - Deconstruct `#world_viewport` into 3 independently composited SVG `<g>` groups:
     1. `<g id="layer_static_terrain">`: Encapsulates `#world_terrain_paths`, `#world_shadow_paths`, `#world_ramp_paths`, and `#scatter_layer`.
     2. `<g id="layer_dynamic_structures">`: Encapsulates `#bridges_layer`, `#structures_layer`, `#features_layer`, and `#roof_layer`.
     3. `<g id="layer_interactive_tiles">`: Encapsulates `#tiles_layer` and `#reticles_layer`.
2. **Hardware Promotion & CSS Containment in [`styles.css`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css)**:
   - Apply `will-change: transform; contain: strict; pointer-events: none;` to `#layer_static_terrain`.
   - Its massive vector geometry is rasterized once into a GPU texture upon map generation. During camera panning, the GPU merely translates this texture quad with zero CPU or Skia re-rasterization overhead.
3. **Target Telemetry Metrics**:
   - Mountains Walk FPS: 60.8 FPS $\rightarrow$ **72.0 – 75.0 FPS** (13.3 – 13.8 ms).
   - Spawn Walk FPS: 16.0 FPS $\rightarrow$ **35.0 – 45.0 FPS**.

---

### Phase 3: Macro-Shoreline Compound Waves & Reticle Decoupling
* **Status**: ✅ Completed & Empirically Verified
* **Goal**: Eliminate 451 concurrent animated SVG `<use>` instances in river corridors by decoupling reticles into pure static vector borders and consolidating all wave animation into a single continuous GPU-accelerated compound shoreline wave path.

#### Problem Statement & Root Cause
1. **The 540-Element Keyframe Storm**:
   - In `river`, 451 water reticles run `@keyframes tidal-wave-breathe` and 89 pure swells run `@keyframes pure-wave-swell`.
   - In SVG, CSS animations on elements inside `<use>` shadow DOMs cannot be promoted to isolated hardware layers. 540 concurrent CSS transforms force Skia to recalculate layout and re-rasterize the entire SVG surface 60+ times per second, dropping FPS to 6.7.

#### Architectural Solutions Delivered
1. **Static Reticle Border Purification**:
   - Stripped all individual `@keyframes` animations (`tidal-wave-breathe*`, `tidal-corner-breathe`, `tidal-u-breathe`, `tidal-island-breathe`) from `#symbol_reticle_*_water` in [`styles.css`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css).
   - Reticles remain crisp, clean static masks denoting tile borders without animation re-rasterization overhead.
2. **Continuous Macro-Shoreline Wave Path Generation in [`TerrainPathService.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/TerrainPathService.js)**:
   - Implemented `generateShorelineWavePath(bWaterOrMap)`:
     - Detects continuous closed polylines representing land-water boundaries via Marching Squares.
     - Option A: Insets contour with uniform 1.5px blue water margin off the shore boundary ($\tau = 0.545, \text{jitter} = 0.35$) to generate a unified compound SVG path (`#path_shoreline_waves`).
     - Organic stroke-width and opacity wave breathing with generous negative space dash padding (`stroke-dasharray: 10 12 18 14 14 12`, `@keyframes macro-shore-breathe` pulsing 1.0px @ 0.20 to 2.6px @ 0.92).
     - Mounted in dedicated `<g id="world_wave_paths">` inside `layer_interactive_tiles` directly above reticles and behind `layer_shadows`.
3. **Compositor & Performance Impact**:
   - Animated SVG elements in river: 451 reticles $\rightarrow$ **1 single animated compound wave element**.
   - Lowland Meadow Walk FPS: 23.5 FPS $\rightarrow$ **47.1 FPS** (more than doubled).
   - River Crossing Walk FPS: 7.3 FPS $\rightarrow$ **23.9 FPS** (3.3x speedup).
   - River Jank Rate: 100.0% $\rightarrow$ **59.1%**.
   - Lakeside Waterfront Walk FPS: 15.6 FPS $\rightarrow$ **42.5 FPS** (2.7x speedup).
   - Canyon Suspension Rim Walk FPS: 65.2 FPS $\rightarrow$ **73.5 FPS** (**1.0% jank frames**).
   - Mountain Ramp Walk FPS: 62.2 FPS $\rightarrow$ **72.8 FPS** (**2.1% jank frames**).
   - Max Frame Spike: 333.4 ms $\rightarrow$ **146.7 ms** (cut by 56%).
   - Overall Jank Rate: 51.4% $\rightarrow$ **24.6%** (cut in half; down 26.8 percentage points vs baseline).

---

### Phase 4: Sparse Open-Water Swell Cluster Optimization & Distance Culling
* **Status**: ✅ Completed & Empirically Verified
* **Goal**: Optimize open-water swells (`#symbol_pure_wave`) across wide water bodies (lakes, wide river bends, oceans) through camera-relative distance culling and harmonic GPU phase batching.

#### Problem Statement & Root Cause
1. **Unbounded Off-Screen Swell Animations**:
   - In wide water bodies like `lake`, hundreds of pure water cells instantiate `#symbol_pure_wave`. Even cells far outside the player's active view frustum continue animating CSS transforms, consuming compositor CPU cycles.
2. **Keyframe Phase Fragmentation**:
   - Random animation delays prevent the browser from batching GPU transform updates across identical symbols.

#### Architectural Solutions Delivered
1. **Camera Distance Culling in [`grid.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/grid.js)**:
   - Pure wave swell animations are strictly culled outside an $r \le 16$ tile radius around the player agent (`(di * di + dj * dj) <= 256`).
   - Distant swells are dynamically hidden via pool-recycled `display: none;`, keeping active animating pure wave instances under 15 across any biome (verified 11 active on `lake`, $\le 25$ target achieved).
   - Swells are sparse-clustered via 1-in-8 hash (`((map_x * 37 + map_y * 17) & 7) === 0`).
2. **4-Phase GPU Harmonic Channels**:
   - Replaced disparate fractional inline `animationDelay` styles with 4 deterministic coordinate-hashed GPU harmonic channels: `#symbol_pure_wave_0` through `#symbol_pure_wave_3` in `<defs>` and `.pure_wave_phase_0` through `.pure_wave_phase_3` in [`styles.css`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css).
   - Phase selection uses decorrelated bitwise hash `(((map_x * 19) ^ (map_y >> 1)) & 3)`, ensuring perfectly uniform 25% phase distribution.
   - Phases are evenly spaced at 90-degree offsets ($0.0\text{s}, -1.75\text{s}, -3.50\text{s}, -5.25\text{s}$) over the 7.0s cycle with `will-change: transform, opacity;` and inherited stroke styling.
3. **Empirical Telemetry Verification**:
   - Max Frame Spike: **90.0 ms** (dropped under 100 ms for the first time across all biomes; 73% reduction from 333.4 ms baseline).
   - Overall Jank Rate: **20.9%** (down from 51.4% baseline and 28.6% Phase 3).
   - River Crossing Walk FPS: 7.3 FPS (baseline) $\rightarrow$ 24.2 FPS (P3) $\rightarrow$ **36.3 FPS** (5.0x speedup vs baseline).
   - Lowland Meadow Walk FPS: 23.5 FPS (baseline) $\rightarrow$ 40.8 FPS (P3) $\rightarrow$ **45.1 FPS** (1.9x speedup vs baseline).
   - Canyon Suspension Rim Walk FPS: 65.2 FPS $\rightarrow$ **67.8 FPS** (**0.0% dropped frames / 0 jank**).
   - Lakeside Waterfront Walk FPS: 15.6 FPS (baseline) $\rightarrow$ 18.0 FPS (P2) $\rightarrow$ **41.7 FPS** (2.7x speedup vs baseline).

---

### Phase 5: Frontier-Only Grid Updating & Locomotion Kinematics Overhaul
* **Status**: ✅ Completed & Empirically Verified
* **Goal**: Eliminate 146–162 ms frame spikes and 6–8 ms synchronous JavaScript execution pauses during step transitions by transitioning `updateGrid()` from full-viewport sweeps to 1-tile frontier diffing.

#### Problem Statement & Root Cause
1. **Synchronous 5,400-Cell Full Re-Scans**:
   - At every single tile step handoff in `agent.walkPath()`, `globalGridObject.updateGrid()` sweeps all 5,400 cells in the viewport.
   - When moving 1 tile, 98% of viewport cells are identical to the previous frame—only the leading edge of ~54 cells is newly exposed. Full re-scans trigger hundreds of synchronous DOM `setAttribute` calls, causing severe frame drops.
2. **Redundant Pre-Step Grid Sweep**:
   - In [`agent.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/agent.js), `updateGrid` was invoked *both* immediately before a step animation starts and *again* upon completion, sweeping 5,400 cells simply to toggle the avatar's walking CSS class.

#### Architectural Solutions Delivered
1. **Elimination of Redundant Pre-Step Grid Sweep in [`agent.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/agent.js)**:
   - Replaced `globalGridObject.updateGrid(self, false)` with an $O(1)$ avatar class and interactivity toggle `globalGridObject.setInteractive(false)`, eliminating 50% of all `updateGrid` calls during locomotion (< 0.01 ms).
   - Passed step displacement $(\Delta x, \Delta y)$ directly to step completion handoff.
2. **1-Tile Directional Frontier Diffing Engine in [`grid.js`](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/grid.js)**:
   - Implemented `updateGridFrontier(i_agent, interactive, dx, dy)`:
     - Shifts internal slot state and references in directional order (`cFrom` to `cTo`, `rFrom` to `rTo`), reusing 98% of unchanged cells with zero re-scans.
     - Retires exiting edge slots into layer free pools (`hideSymbolInstance`).
     - Translates active `<use>` coordinate attributes (`x`, `y`, or `transform`) only where coordinates changed.
     - Scans and evaluates ONLY the entering frontier of ~54 cells (1 column or 1 row).
   - Retained `updateGridFull(i_agent, interactive)` for map initialization, teleports, and blueprint stamping, guaranteeing 100% baseline fidelity.
3. **Empirical Telemetry Verification**:
   - Mountain Ramp Walk FPS: **74.2 FPS** with **0.0% dropped frames / 0 jank** (locked at 75 Hz display cap).
   - Canyon Suspension Rim Walk FPS: **74.3 FPS** with **0.0% dropped frames / 0 jank** (locked at 75 Hz display cap).
   - Lowland Meadow Walk FPS: 23.5 FPS (baseline) $\rightarrow$ 45.1 FPS (P4) $\rightarrow$ **64.5 FPS** (**+174% speedup vs baseline**).
   - River Crossing Walk FPS: 7.3 FPS (baseline) $\rightarrow$ 36.3 FPS (P4) $\rightarrow$ **52.1 FPS** (**7.1x speedup vs baseline**).
   - Lakeside Waterfront Walk FPS: 15.6 FPS (baseline) $\rightarrow$ 41.7 FPS (P4) $\rightarrow$ **54.5 FPS** (**3.5x speedup vs baseline**).
   - Maximum Frame Spike: 333.4 ms (baseline) $\rightarrow$ 90.0 ms (P4) $\rightarrow$ **40.1 ms** (88% reduction vs baseline).
   - Overall Mean Jank Rate: 51.4% (baseline) $\rightarrow$ 20.9% (P4) $\rightarrow$ **16.3%** (cut by more than two thirds).

---

### Phase 6: Multi-Biome 75 FPS Certification, SVG Limits & Canvas Decision Gate
* **Status**: ✅ Completed & Empirically Verified
* **Goal**: Execute comprehensive automated certification across all 5 biomes and multiple seeds (`12345`, `42`, `88888`, `99999`), populate the complete longitudinal record in `Documentation/Benchmarking/roadmap10_benchmark.md`, and evaluate the empirical performance boundary of SVG to trigger the transition to Roadmap 11.

#### Verification Suite Results & Delivered Solutions
1. **Multi-Seed 75 FPS Certification (`12345`, `42`, `88888`, `99999`)**:
   - **Mountain Ramp & Canyon Rim**: Verified locked at display cap (**67.0 – 74.3 FPS**, **0.0% jank / 0 dropped frames**).
   - **Lowland Meadow (`spawn`)**: **63.1 – 68.1 FPS** (1.1% – 4.7% jank).
   - **River Crossing**: **53.4 – 68.2 FPS** (seed dependent: 67.3 FPS on seed 42; 53.4 FPS on seed 12345).
   - **Lakeside Waterfront**: **53.4 – 60.6 FPS** (up to 3.9x speedup vs 15.6 FPS baseline).
   - **Overall Jank Rate**: **9.7%** (first time in project history under 10% across all 5 routes).
2. **100% Invariant Compliance (A, B, C, D)**:
   - **Invariant A (Disjoint Domains)**: **0 collisions** between Water, Cliffs, and Chasms across 40,000 cells per seed.
   - **Invariant B (River Bridges)**: **0 unbridged water path crossings** across all seeds; 100% crossing decks engineered with `STRUCTURE_BRIDGE`.
   - **Invariant C (Shoreline Continuity)**: Continuous alluvial sand buffers and ecotone detritus preserved.
   - **Invariant D (Deterministic Seed Reproducibility)**: Verified deterministic layout hashes across all seeds.
3. **Architectural Evaluation & Decision Gate: The Retained-Mode SVG Ceiling**:
   - **DOM Tree Ceiling**: Viewport requires **7,199 – 7,661 DOM elements** (`1,771 – 2,233` `<use>` elements) and **626,782 characters of SVG path data** in memory (60.2 MB JS heap).
   - **Rasterization Bottleneck**: While dry biomes achieve 74 FPS, aquatic biomes (River & Lake) plateau at 52–54 FPS due to Skia vector polygon re-tessellation and Blink style resolution on DOM updates.
   - **Decision Gate Outcome**: SVG has reached its maximum theoretical retained-mode limit. Formal transition to **Roadmap 11: Next-Gen Canvas 2D Migration Engine** is triggered.

---

## Roadmap 11: Next-Gen Canvas 2D Migration Engine

### Problem Statement & Architectural Justification

While Roadmap 10 maximizes SVG efficiency by decoupling layers, consolidating animations, and diffing frontiers, SVG remains inherently a **retained-mode Document Object Model (DOM)** architecture:

```mermaid
graph LR
    subgraph SVG_Model ["Retained-Mode SVG Pipeline"]
        S_DOM["5,400+ DOM Nodes & Elements"] --> S_STYLE["Style Resolution & CSS Cascade"]
        S_STYLE --> S_LAYOUT["Layout & Geometry Tree (Blink)"]
        S_LAYOUT --> S_SKIA["Skia Display List & Rasterization"]
        S_SKIA --> S_GPU["GPU Compositor Quad Assembly"]
    end

    subgraph Canvas_Model ["Immediate-Mode Canvas 2D Pipeline"]
        C_STATE["In-Memory Cell Matrix & Entity State"] --> C_LOOP["Single Render Loop (< 0.5 ms)"]
        C_LOOP --> C_ATLAS["Pre-Baked Sprite Atlas Blitting (drawImage)"]
        C_ATLAS --> C_OFFSCREEN["Offscreen Static Path2D Terrain Cache"]
        C_OFFSCREEN --> C_GPU["Direct GPU Framebuffer Blit (0 DOM Nodes)"]
    end
```

#### Inherent Limits of the SVG DOM Architecture
1. **DOM Tree Memory & Traversal**:
   - Maintaining 5,400 cells + hundreds of vector paths requires Blink to manage thousands of C++ `Element` instances, style resolution passes, and hit-testing structures in memory.
2. **Compositor Invalidation Rigidity**:
   - Even with sub-layering, Chrome cannot promote individual `<use>` symbols to isolated hardware layers. Any dynamic attribute update dirties the entire sub-layer.
3. **Sub-Pixel Camera Zooming & Massive Worlds**:
   - Expanding the world grid or implementing continuous smooth zooming causes SVG memory consumption and rasterization time to scale super-linearly with DOM element count.

#### Advantages of the Immediate-Mode Canvas 2D Pipeline
1. **Zero DOM Footprint**:
   - Exactly **0 DOM nodes** are allocated for cells, walls, roofs, trees, footprints, or waves.
2. **Sub-Millisecond Frame Render Time**:
   - Static terrain contours are drawn once onto an `OffscreenCanvas` and blitted directly.
   - Dynamic entities and tiles are drawn via fast `ctx.drawImage` sprite atlas lookups.
   - Frame render time drops from 15–120 ms down to **0.5 – 1.8 ms**, easily sustaining **120 – 144+ FPS** displays.

---

### Roadmap 11 Overview & Phase Breakdown

| Phase | Milestone | Priority | Target Architecture |
| :--- | :--- | :---: | :---: |
| **Phase 1** | **Multi-Layered Canvas Viewport Architecture & Coordinate Pipeline** | `P0 - Critical` | 4 Layered Canvas Stack in `#canvas_container` |
| **Phase 2** | **Procedural Sprite Atlas & Tile Sheet Batching** | `P0 - Critical` | Pre-baked in-memory sprite atlas (`ctx.drawImage`) |
| **Phase 3** | **High-Resolution Path2D Vector Terrain Rendering** | `P1 - High` | Marching Squares to `Path2D` on `OffscreenCanvas` |
| **Phase 4** | **Zero-DOM Particle & Hydrological Kinematics** | `P1 - High` | Procedural waves, ripples, and footprints |
| **Phase 5** | **Hardware-Accelerated Camera Gliding & Viewport Blitting** | `P0 - Critical` | Sub-pixel 2D matrix camera translation (< 0.2 ms) |
| **Phase 6** | **Head-to-Head Comparative Certification: SVG vs. Canvas** | `P0 - Critical` | Full 5-route comparison in `roadmap10_benchmark.md` |

---

### Detailed Roadmap 11 Specifications

#### Phase 1: Multi-Layered Canvas Viewport Architecture & Coordinate Pipeline
* Replace `<svg id="frame">` in `#canvas_container` with a high-DPI layered Canvas stack:
  ```html
  <div id="canvas_container">
      <canvas id="canvas_terrain_static"></canvas>
      <canvas id="canvas_dynamic_structures"></canvas>
      <canvas id="canvas_entities_effects"></canvas>
      <canvas id="canvas_ui_overlay"></canvas>
  </div>
  ```
* Implement automatic Device Pixel Ratio (`window.devicePixelRatio`) scaling for crisp rendering on Retina and 4K displays.
* Establish a unified `CanvasCamera` service supporting sub-pixel translation, smooth zooming, and world-to-screen coordinate transforms.

#### Phase 2: Procedural Sprite Atlas & Tile Sheet Batching
* Convert all existing SVG `<symbol>` definitions (trees, shrubs, cobblestone, bridges, footprints, door frames) into an in-memory Sprite Atlas bitmap.
* Replace DOM `<use>` creation with fast `ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh)` batch blits.
* Implement texture caching so cell rendering requires zero allocations per frame.

#### Phase 3: High-Resolution Path2D Vector Terrain Rendering
* Adapt `TerrainPathService` to generate native Canvas `Path2D` objects for Marching Squares contours (water, sand, elevation cliffs, grass ecotones).
* Cache static terrain onto an `OffscreenCanvas`, blitting to `#canvas_terrain_static` only when the camera viewport shifts.

#### Phase 4: Zero-DOM Particle & Hydrological Kinematics
* Coastal waves, open-water swells, and wading ripples render procedurally on `#canvas_entities_effects` using Canvas composite operations (`ctx.globalCompositeOperation = 'source-over'`).
* Footprints, wading ripples, and dust puffs render as lightweight decaying particle arrays with zero DOM garbage collection.

#### Phase 5: Hardware-Accelerated Camera Gliding & Viewport Blitting
* Camera panning translates the viewport via Canvas 2D transform matrices or CSS `transform: translate3d`.
* Viewport tile culling operates in a single, tight JavaScript loop (< 0.2 ms), eliminating all DOM `setAttribute` overhead.

#### Phase 6: Head-to-Head Comparative Certification: SVG vs. Canvas
* Execute the standardized 5-route benchmark battery from `Documentation/Benchmarking/roadmap10_benchmark.md`.
* Directly compare SVG Baseline (Roadmap 9) vs. SVG Optimized (Roadmap 10) vs. Canvas Engine (Roadmap 11) in a unified benchmark report.

---

## Architectural & Geomorphic Invariants (A, B, C, D)

All code modifications in Roadmap 10 and Roadmap 11 must strictly preserve the established invariants:

1. **Invariant A (Disjoint Geomorphic Domains)**:
   - Water bodies (`CellFlags.WATER`, `WATER_SHALLOW`), mountain massifs (`elevation >= 2`, `CellFlags.TERRAIN_CLIFF`), and canyon chasms (`CellFlags.CHASM`) must never collide or overlap on any cell.
2. **Invariant B (Mandatory River Bridge Spans)**:
   - Any path traversing a river corridor must strictly cross via an engineered wooden bridge (`STRUCTURE_BRIDGE`). Unbridged walking across deep water is strictly prohibited.
3. **Invariant C (Hydrological Shoreline Continuity)**:
   - Every water cell must be bounded by a continuous 1–2 tile alluvial sandy riverbank buffer or rocky cliff edge.
4. **Invariant D (Deterministic Seed Reproducibility)**:
   - Identical PRNG seeds (`seed=12345`, `seed=42`, etc.) must produce pixel-identical terrain layouts, structural footprints, and benchmark telemetry.

