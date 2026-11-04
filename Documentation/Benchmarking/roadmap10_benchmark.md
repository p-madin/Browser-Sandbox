# Roadmap 10 & 11 Empirical Telemetry & Performance Benchmark Log

This document serves as the canonical, automated longitudinal performance benchmark registry for **Roadmap 10 (SVG Compositor & Kinematics Optimization)** and **Roadmap 11 (Next-Gen Canvas 2D Migration Engine)**. Every optimization phase is empirically tested across 5 standardized routes under identical conditions, tracking frame rate (FPS), 1% lows, frame latencies, jank dropped frames, `updateGrid` execution pause, and active DOM nodes.

> [!NOTE]
> - **Active Roadmap**: [roadmap.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/roadmap.md)
> - **Automated Runner**: `node scripts/run_phase_benchmark.js --phase "<Phase Name>" --seed 12345`
> - **Browser Harness**: [http://127.0.0.1:8080/test_grid.html?seed=12345](http://127.0.0.1:8080/test_grid.html?seed=12345)

---

## Benchmark Environment & Test Protocol

| Parameter | Specification / Telemetry Environment |
| :--- | :--- |
| **Operating System** | Windows 11 (x86_64) |
| **Runtime Browser** | Google Chrome (Headless / DevTools Protocol) |
| **Display Resolution / Viewport** | 1936 × 1036 (`#frame` SVG viewport: 5,400 cells visible) |
| **Target Display Refresh Rates** | 75 Hz (13.33 ms frame budget) / 60 Hz (16.67 ms frame budget) |
| **Standard Deterministic PRNG Seed**| `12345` |
| **Locomotion Test Distance** | 10 consecutive steps per route via `agent.walkPath()` |
| **Certification Routes** | 1: `spawn`, 2: `mountains`, 3: `river`, 4: `canyons`, 5: `lake` |

---

## Longitudinal Multi-Phase Summary Matrix

| Phase / Architecture | Route 1 (`spawn`) | Route 2 (`mountains`) | Route 3 (`river`) | Route 4 (`canyons`) | Route 5 (`lake`) | Max Frame Spike | Jank Rate | Target Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline (Pre-Opt SVG)** | **23.5 FPS** | **62.2 FPS** | **7.3 FPS** | **65.2 FPS** | **15.6 FPS** | **333.4 ms** | **51.4%** | 🟡 Baseline Recorded |
| **Phase 2: Compositor Layer Decomposition (will-change isolation)** | **35.7 FPS** | **74.3 FPS** | **7.8 FPS** | **71.4 FPS** | **18.0 FPS** | **320.1 ms** | **44.6%** | ✅ Measured |
| **Phase 3: Macro-Shoreline Compound Waves (Single-Path Foam)** | **40.8 FPS** | **73.1 FPS** | **24.2 FPS** | **73.5 FPS** | **40.2 FPS** | **146.7 ms** | **28.6%** | ✅ Measured |
| **Phase 4 (Swell Culling)** | — | — | — | — | — | — | — | 🔲 Scheduled |
| **Phase 5 (Frontier Diffing)** | — | — | — | — | — | — | — | 🔲 Scheduled |
| **Phase 6 (75 FPS Certified)** | — | — | — | — | — | — | — | 🔲 Scheduled |
| **Roadmap 11 (Canvas 2D)** | — | — | — | — | — | — | — | 🔲 Evolution |

---

<!-- PHASE_BENCHMARK_SECTIONS_BEGIN -->

## Phase 1: Pre-Optimization Baseline Telemetry (SVG Architecture)

*Status: ✅ Completed & Empirically Verified*  
*Timestamp: 2026-11-04T02:22:46.591Z*  
*Stationary Baseline: **62.0 FPS***

| Certification Route | Stationary FPS | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg (Max) | Total SVG Nodes (`<use>`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Route 1: Lowland Meadow (`spawn`)** | **62.0 FPS** | **23.5 FPS** | **8.3 FPS** | **42.02 ms** | **120.00 ms** | **120.10 ms** | **22 (55.0%)** | **5.95 ms (7.80 ms)** | **7245 (`1831`)** |
| **Route 2: Mountain Ramp (`mountains`)** | **62.0 FPS** | **62.2 FPS** | **18.8 FPS** | **15.91 ms** | **40.00 ms** | **53.30 ms** | **9 (10.8%)** | **2.67 ms (4.80 ms)** | **7245 (`1831`)** |
| **Route 3: River Crossing (`river`)** | **62.0 FPS** | **7.3 FPS** | **3.0 FPS** | **131.91 ms** | **306.70 ms** | **333.40 ms** | **27 (100.0%)** | **6.80 ms (8.10 ms)** | **7751 (`2337`)** |
| **Route 4: Canyon Suspension Rim (`canyons`)** | **62.0 FPS** | **65.2 FPS** | **25.0 FPS** | **15.22 ms** | **26.70 ms** | **40.00 ms** | **12 (13.0%)** | **3.18 ms (3.80 ms)** | **7751 (`2337`)** |
| **Route 5: Lakeside Waterfront (`lake`)** | **62.0 FPS** | **15.6 FPS** | **4.7 FPS** | **62.47 ms** | **186.70 ms** | **213.40 ms** | **32 (78.0%)** | **5.15 ms (6.30 ms)** | **7751 (`2337`)** |


## Phase 2: Compositor Layer Decomposition (will-change isolation)

*Status: ✅ Completed & Empirically Verified*  
*Timestamp: 2026-11-04T02:58:00.886Z*  
*Stationary Baseline: **61.6 FPS***

| Certification Route | Stationary FPS | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg (Max) | Total SVG Nodes (`<use>`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Route 1: Lowland Meadow (`spawn`)** | **61.6 FPS** | **35.7 FPS** | **10.7 FPS** | **27.65 ms** | **80.00 ms** | **93.40 ms** | **20 (36.4%)** | **5.80 ms (7.80 ms)** | **7249 (`1831`)** |
| **Route 2: Mountain Ramp (`mountains`)** | **61.6 FPS** | **74.3 FPS** | **74.1 FPS** | **13.34 ms** | **13.40 ms** | **13.50 ms** | **0 (0.0%)** | **2.62 ms (3.60 ms)** | **7249 (`1831`)** |
| **Route 3: River Crossing (`river`)** | **61.6 FPS** | **7.8 FPS** | **3.1 FPS** | **124.81 ms** | **293.70 ms** | **320.10 ms** | **28 (100.0%)** | **6.95 ms (8.60 ms)** | **7755 (`2337`)** |
| **Route 4: Canyon Suspension Rim (`canyons`)** | **61.6 FPS** | **71.4 FPS** | **37.3 FPS** | **13.86 ms** | **13.50 ms** | **26.80 ms** | **4 (3.9%)** | **3.43 ms (4.40 ms)** | **7755 (`2337`)** |
| **Route 5: Lakeside Waterfront (`lake`)** | **61.6 FPS** | **18.0 FPS** | **4.4 FPS** | **54.52 ms** | **160.00 ms** | **226.60 ms** | **38 (82.6%)** | **5.21 ms (6.30 ms)** | **7755 (`2337`)** |


## Phase 3: Macro-Shoreline Compound Waves (Single-Path Foam)

*Status: ✅ Completed & Empirically Verified*  
*Timestamp: 2026-11-04T04:06:53.466Z*  
*Stationary Baseline: **64.1 FPS***

| Certification Route | Stationary FPS | Walk Avg FPS | Walk Min FPS (1% Low) | Avg Frame Time | p95 Frame Time | Max Frame Spike | Jank Frames (>20ms) | `updateGrid` Avg (Max) | Total SVG Nodes (`<use>`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Route 1: Lowland Meadow (`spawn`)** | **64.1 FPS** | **40.8 FPS** | **10.7 FPS** | **24.23 ms** | **66.80 ms** | **93.30 ms** | **21 (35.0%)** | **5.61 ms (8.30 ms)** | **7251 (`1831`)** |
| **Route 2: Mountain Ramp (`mountains`)** | **64.1 FPS** | **73.1 FPS** | **37.6 FPS** | **13.61 ms** | **13.50 ms** | **26.60 ms** | **2 (2.1%)** | **2.84 ms (3.70 ms)** | **7251 (`1831`)** |
| **Route 3: River Crossing (`river`)** | **64.1 FPS** | **24.2 FPS** | **6.8 FPS** | **40.91 ms** | **106.70 ms** | **146.70 ms** | **29 (64.4%)** | **6.03 ms (7.50 ms)** | **7757 (`2337`)** |
| **Route 4: Canyon Suspension Rim (`canyons`)** | **64.1 FPS** | **73.5 FPS** | **37.3 FPS** | **13.47 ms** | **13.50 ms** | **26.80 ms** | **1 (1.0%)** | **3.14 ms (4.40 ms)** | **7757 (`2337`)** |
| **Route 5: Lakeside Waterfront (`lake`)** | **64.1 FPS** | **40.2 FPS** | **10.7 FPS** | **24.70 ms** | **80.00 ms** | **93.40 ms** | **30 (40.5%)** | **4.42 ms (5.90 ms)** | **7757 (`2337`)** |


<!-- PHASE_BENCHMARK_SECTIONS_END -->
