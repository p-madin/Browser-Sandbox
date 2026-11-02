# Walk Animation & Performance Benchmark Telemetry Log

This document tracks empirical performance telemetry before, during, and after each phase of rendering and movement optimization in [roadmap.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/roadmap.md).

---

## 1. Baseline Benchmark: Stationary vs Walk Movement Comparison

*Recorded prior to applying Phase 2–5 rendering optimizations.*

| Telemetry Metric | Stationary Baseline (At Rest) | Walk Baseline (Moving) | Delta / Movement Degradation | Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Average Frame Rate** | **60.0 FPS** | **20.2 FPS** | **-39.8 FPS (-66.3%)** | Severe collapse under motion |
| **Minimum FPS (1% Low)**| **60.0 FPS** | **10.7 FPS** | **-49.3 FPS (-82.2%)** | Violent stuttering & frame drops |
| **Average Frame Latency**| **16.67 ms** | **48.61 ms** | **+31.94 ms (+191.6%)** | 3× over 60Hz frame budget |
| **95th Percentile Latency**| **16.71 ms** | **93.40 ms** | **+76.69 ms (+458.9%)** | Steady-state animation collapse |
| **Maximum Frame Spike** | **16.85 ms** | **93.50 ms** | **+76.65 ms (+454.9%)** | **Primary cause of movement jitter** |
| **Jank Frames (>20ms)** | **0 (0.0%)** | **37 (82.2%)** | **+37 frames (+82.2%)** | **4 out of 5 frames dropped** |
| **Heavy Jank (>33ms)** | **0 (0.0%)** | **25 (55.6%)** | **+25 frames (+55.6%)** | More than half of frames drop < 30 FPS |
| **updateGrid Latency** | N/A (Idle) | **31.39 ms** (Max: 34.2 ms) | **+31.4 ms synchronous pause**| Blocks main-thread at every tile handoff |
| **Active SVG DOM Nodes**| **74,960 elements** | **74,960 elements** | 0 elements | Massive DOM footprint |

> [!IMPORTANT]
> **Key Empirical Takeaway**:  
> The browser maintains a flawless **60.0 FPS** with **0 jank frames** while stationary. The moment `walkPath()` executes, frame rates plummet by **66.3%** down to **20.2 FPS**, with **82.2% of all frames dropped** and **93.5ms frame spikes**. This definitively confirms that the jitter is caused by the dynamic movement pipeline (`updateGrid` synchronous DOM blocking + layer translation filter re-rasterization).

---

## 2. Optimization Phase Yield Tracking Registry

### Phase 2: Flora & Arboreal Feature Optimization
*Status: ✅ Completed & Verified*

| Metric | Pre-Phase 2 Baseline | Post-Drop-Shadow Removal | Post-Symbol Instancing | Net Yield / Gain |
| :--- | :---: | :---: | :---: | :---: |
| **Average Frame Rate** | **20.2 FPS** | **32.3 FPS** | **42.1 FPS** | **+21.9 FPS (+108.4% — More than doubled!)** |
| **1% Low / Min FPS** | **10.7 FPS** | **10.2 FPS** | **12.5 FPS** | **+1.8 FPS (+16.8%)** |
| **Average Frame Time** | **48.61 ms** | **30.22 ms** | **23.10 ms** | **-25.51 ms (-52.5% faster frame render)** |
| **95th Percentile Latency**| **93.40 ms** | **94.20 ms** | **80.00 ms** | **-13.40 ms (-14.3%)** |
| **Max Frame Spike** | **93.50 ms** | **94.50 ms** | **80.30 ms** | **-13.20 ms (-14.1%)** |
| **Jank Frame Rate (>20ms)**| **82.2% (37 frames)** | **50.0% (34 frames)** | **31.7% (26 frames)** | **-50.5% reduction in dropped frames** |
| **updateGrid Latency** | **31.39 ms** | **41.00 ms** | **39.30 ms** | *[Next target: Phase 4 dirty-checking]* |
| **Active SVG DOM Nodes** | **74,960 nodes** | **74,960 nodes** | **66,815 nodes** | **-8,145 active nodes (-10.9%)** |

> [!TIP]
> **Phase 2 Analysis**:  
> 1. Stripping `filter: drop-shadow(...)` from `.tree_canopy` and `.flora_shrub` yielded an immediate **+12.1 FPS** jump (from 20.2 to 32.3 FPS) by eliminating offscreen bitmap blur re-rasterization during viewport shift.
> 2. Consolidating multi-circle trees and flora into `<defs>` symbols with `<use>` instances further boosted frame rates to **42.1 FPS** (+108.4% over baseline) and cut average frame latency in half (from 48.6ms down to 23.1ms).
> 3. The remaining 80ms frame spikes and 39.3ms pauses are strictly driven by `updateGrid()` synchronous DOM execution and multi-layer shifting, which are addressed in Phases 3 and 4.

---

### Phase 2.5: Extended SVG `<defs>` Symbol, `<pattern>`, & Sparse Free-List `<use>` Instancing
*Status: ✅ Completed & Verified (1920×941 Viewport, 5,562 Pool Cells, 75Hz Native Refresh, `?seed=12345`)*

| Optimization Stage | Total SVG DOM Nodes | `<use>` Instances | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0. Post-Phase 2 Baseline** (`#symbol_tree` & `#symbol_flora` eager pool) | 66,815 | 11,124 | **18.4 FPS** | 9.4 FPS | 53.35 ms | 80.10 ms | 106.70 ms | 30 (76.9%) | 28.86 ms |
| **1. Eager `<defs>` Symbols Across All 11 Overlay Layers** | 66,819 | 61,183 | **21.4 FPS** | 12.5 FPS | 45.94 ms | 80.00 ms | 80.10 ms | 30 (75.0%) | 29.34 ms |
| **2. On-Demand Sparse `<use>` Instancing + Empty-Layer Culling** | 9,491 | 9,417 | **22.8 FPS** | 15.0 FPS | 43.09 ms | 66.70 ms | 66.80 ms | 29 (74.4%) | 9.74 ms |
| **3. Free-List `<use>` Recycling + `slot_state` Diffing + `#world_viewport`** | 9,492 | 9,417 | **36.3 FPS** | 15.0 FPS | 26.94 ms | 53.30 ms | 66.80 ms | 31 (62.0%) | 6.21 ms |
| **4. Pure Vector `#symbol_contour` Instancing (No Full-Screen Filter Rebuilds)** | 9,478 | 3,855 | **46.0 FPS** | 15.0 FPS | 21.59 ms | 53.30 ms | 66.60 ms | 15 (27.3%) | 5.02 ms |
| **5. Full Symbol Architecture (`#symbol_grid_pattern` + Pre-Warmed Pools + `changed_slots`)** | **12,212** (9,481 active) | **6,585** (3,855 active) | **74.5 FPS** | **74.1 FPS** | **13.34 ms** | **13.50 ms** | **13.50 ms** | **0 (0.0%)** | **3.13 – 3.97 ms** |

---

### Phase 3: Terrain Contour Metasurface Optimization
*Status: ✅ Completed & Verified*

| Metric | Pre-Phase 3 Baseline | Post-Master Viewport + Sparse Recycling | Post-Vector `#symbol_contour` + `#symbol_grid_pattern` | Net Yield |
| :--- | :---: | :---: | :---: | :---: |
| **Average FPS** | **18.4 FPS** | **36.3 FPS** | **74.5 FPS** | **+56.1 FPS (+304.9%)** |
| **Average Frame Time** | **53.35 ms** | **26.94 ms** | **13.34 ms** | **-40.01 ms (-75.0%)** |
| **Max Frame Spike** | **106.70 ms** | **66.80 ms** | **13.50 ms** | **-93.20 ms (-87.3%)** |
| **Jank Frame Rate** | **76.9% (30 frames)** | **62.0% (31 frames)** | **0.0% (0 frames)** | **-76.9% (Zero jank)** |

---

### Phase 4: updateGrid Dirty-Checking & Free-List Recycling Optimization
*Status: ✅ Completed & Verified*

| Metric | Pre-Phase 4 Baseline | Post-`slot_state` Diffing & Pre-Warmed Pools | Net Yield |
| :--- | :---: | :---: | :---: |
| **updateGrid Latency** | **28.86 – 37.46 ms** | **2.95 – 3.97 ms** | **~9.5× speedup (-89%)** |
| **Max Frame Spike** | **93.50 – 106.70 ms** | **13.50 – 13.60 ms** | **-93.20 ms (Spike eliminated)** |
| **Jank Frames (>20ms)** | **30 – 38 frames (76.9–82.2%)** | **0 frames (0.0%)** | **100% jank elimination** |
| **Average FPS** | **18.4 – 20.2 FPS** | **73.9 – 74.5 FPS** | **Locked to 75Hz display cap** |

---

### Phase 5: Multi-Biome 60+ FPS Walk Certification (`runMultiBiomeWalkBenchmark`)
*Status: ✅ Completed & Verified*

| Certification Route | Stationary FPS | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg (Max) | Active SVG Nodes (`<use>`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Route 1: Lowland Meadow (`spawn`)** | **74.9 FPS** | **74.3 – 74.5 FPS** | **73.5 – 74.1 FPS** | **13.34 ms** | **13.50 ms** | **13.50 – 13.60 ms** | **0 (0.0%)** | **3.13 ms** (3.70 ms) | **12,212** (`6,585`) |
| **Route 2: Mountain Ramp (`mountains`)** | **74.9 FPS** | **74.3 FPS** | **73.5 FPS** | **13.34 ms** | **13.40 ms** | **13.60 ms** | **0 (0.0%)** | **2.95 ms** (3.70 ms) | **12,212** (`6,585`) |
| **Route 3: River Crossing (`river`)** | **74.9 FPS** | **74.4 FPS** | **74.1 FPS** | **13.34 ms** | **13.50 ms** | **13.50 ms** | **0 (0.0%)** | **3.04 ms** (3.60 ms) | **12,212** (`6,585`) |

---

### Phase 6: Pre-Baked Vector `<path>` Landmark Contours (Scalar Field Blur & Marching Squares)
*Status: ✅ Completed & Verified (1920×941 Viewport, 5,562 Pool Cells, 75Hz Native Refresh, `?seed=12345`)*

| Optimization Stage | Total SVG DOM Nodes | `<use>` Instances | Terrain `<path>` Count | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-Phase 6 (Phase 5 Per-Tile `#symbol_contour`)** | 12,212 | 6,585 | 0 | **74.3 – 74.5 FPS** | 73.5 – 74.1 FPS | 13.34 ms | 13.50 ms | 13.60 ms | 0 (0.0%) | 2.95 – 3.97 ms |
| **Phase 6: Pre-Baked Continuous Vector `<path>` Contours** | **6,989** | **1,359** | **8** | **74.0 – 74.5 FPS** | **73.5 – 74.1 FPS** | **13.34 ms** | **13.50 ms** | **13.60 ms** | **0 (0.0%)** | **2.24 – 2.48 ms** |
| **Net Yield / Architectural Gain** | **-5,223 nodes (-42.8%)** | **-5,226 `<use>` (-79.4%)** | **+8 paths** | **Locked at 75Hz cap** | **Rock-solid** | **0.00 ms change** | **0.00 ms change** | **Zero spikes** | **0 frames (0.0%)** | **~25% faster `updateGrid`** |

#### Multi-Biome Phase 6 Walk Benchmark Breakdown (`runMultiBiomeWalkBenchmark`)

| Certification Route | Stationary FPS | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg (Max) | Total SVG Nodes (`<use>`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Route 1: Lowland Meadow (`spawn`)** | **73.8 FPS** | **74.5 FPS** | **73.5 FPS** | **13.34 ms** | **13.50 ms** | **13.60 ms** | **0 (0.0%)** | **2.41 ms** (2.80 ms) | **6,989** (`1,359`) |
| **Route 2: Mountain Ramp (`mountains`)** | **73.8 FPS** | **74.0 FPS** | **74.1 FPS** | **13.34 ms** | **13.50 ms** | **13.50 ms** | **0 (0.0%)** | **2.48 ms** (4.50 ms) | **6,989** (`1,359`) |
| **Route 3: River Crossing (`river`)** | **73.8 FPS** | **74.2 FPS** | **73.5 FPS** | **13.34 ms** | **13.50 ms** | **13.60 ms** | **0 (0.0%)** | **2.42 ms** (3.30 ms) | **6,989** (`1,359`) |

> [!TIP]
> **Phase 6 Architectural Analysis & Visual Realization**:
> 1. **Massive DOM Footprint Reduction**: By eliminating the 7 per-cell contour pools (`chasm`, `cliff`, `water`, `water_shallow`, `grass`, `elev2`, `elev3`, `ramp`), total SVG DOM elements plummeted from **12,212** down to **6,989** (-42.8%), and `<use>` instances dropped from **6,585** to **1,359** (-79.4%).
> 2. **Elimination of Per-Step Contour Diffing**: In `grid.js`, `updateGrid()` no longer tests 7 contour bitmasks across visible cells nor dispatches contour pool allocations. Average `updateGrid()` execution time dropped from **3.13–3.97 ms** down to **2.24–2.48 ms**.
> 3. **Aesthetic Restoration of Roadmap 6 Phase 4**: Unlike discrete square or rounded per-cell rects which formed disjoint 90° corners, `TerrainPathService` uses 2D separable Gaussian blurring and Marching Squares to trace continuous curves. This enables true concave inner fillets, smooth convex headlands, craggy tectonic fractures (cliff/chasm seed jitter), and unbroken shoreline foam rim strokes (`#7dd3fc` foam stroke on water, dark slate rims on elevation cliffs).
> 4. **Single-Transform Camera Movement**: The container `<g id="world_terrain_paths">` inside `grid.world_viewport` pans seamlessly via CSS transform on tile handoff and smooth sub-pixel lerp during kinematic walking, requiring zero path string recalculation during movement.
