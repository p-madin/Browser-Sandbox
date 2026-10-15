# Pathfinder Benchmark Telemetry Report
Generated: 2026-10-15T05:54:56.425Z

## 3-Way Comparative Benchmark: A* Engine vs. GPT DFS vs. Legacy DFS

| Test Case | Category | Distance | A* Time | GPT Time | Legacy Time | A* Nodes | GPT Nodes | A* Speedup vs GPT | Nodes Saved | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Micro: Cardinal East** | Micro (1-5) | 3 | **0.14ms** | 1.08ms | 0.26ms | **4** | 2,677 | **7.7x** | **99.9%** | Passed |
| **Micro: Diagonal SE** | Micro (1-5) | 4.24 | **0.06ms** | 3.62ms | 0.32ms | **5** | 14,512 | **60.3x** | **100.0%** | Passed |
| **Short: North-East Clearing** | Short (5-15) | 9.22 | **0.06ms** | 186.1ms | 204.12ms | **22** | 1,000,038 | **3101.7x** | **100.0%** | Passed |
| **Short: South-West Obstacle** | Short (5-15) | 10 | **0.18ms** | 159.92ms | 95.48ms | **73** | 1,000,050 | **888.4x** | **100.0%** | Passed |
| **Medium: Multi-Biome East** | Medium (15-35) | 18.68 | **0.06ms** | 111.46ms | 246.62ms | **49** | 1,000,104 | **1857.7x** | **100.0%** | Passed |
| **Medium: Tree Grove Routing** | Medium (15-35) | 21.26 | **0.16ms** | 160.08ms | 222.32ms | **161** | 1,000,093 | **1000.5x** | **100.0%** | Passed |
| **Stress: Deep Wall-Skirting** | Stress (35-55+) | 32.56 | **0.14ms** | 108.36ms | 247.38ms | **175** | 1,000,194 | **774.0x** | **100.0%** | Passed |
| **Unreachable: Blocked Target** | Unreachable | 0 | **0ms** | 0ms | 0ms | **0** | 0 | **1.0x** | **0%** | Expected Block |
