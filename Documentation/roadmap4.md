# Project Roadmap 4: Collision Resolution, Layer Precedence & Structural Integrity (Archived)

This roadmap outlines the engineering strategy implemented to resolve cell-level and structure-level collisions, layer precedence overrides, visual CSS cascade masking, bridge-gap spanning, and foundation elevation leveling across the Grid Engine world.

> [!NOTE]
> - **Roadmap 1 (Engine Core)**: Archival reference in [Documentation/roadmap1.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap1.md) (Viewport, Lerping, Vector Heading, Benchmarking, Modular A*, Bitmask Model).  
> - **Roadmap 2 (Structural Architecture)**: Archival reference in [Documentation/roadmap2.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap2.md) (Blueprints, Procedural Placer, Interactive Doors/Barricades, Roof Cutaways).  
> - **Roadmap 3 (Terrain & Hydrology)**: Archival reference in [Documentation/roadmap3.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap3.md) (Rivers, Lakes, Elevation Tiers, Chasms, Bridges, Riparian Ecology).  
> - **Roadmap 4 (Collision Resolution & Layer Precedence)**: Archived here.
> - **Roadmap 5 (Macro-Geomorphic Separation & Mandatory River Bridges)**: Active in [roadmap.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/roadmap.md).
> - Experimental concepts remain tracked in [sandbox.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/sandbox.md).

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | **Cell State Precedence & CSS Visual Hierarchy** | `P1 - High` | ✅ Completed | v5.0 |
| **Phase 2** | **Structure-Terrain Clearance & Placement Validation** | `P1 - High` | ✅ Completed | v5.1 |
| **Phase 3** | **Foundation Leveling & Elevation Topographic Integrity** | `P2 - Medium` | ✅ Completed | v5.2 |
| **Phase 4** | **Engineered Bridge Spanning & Abutment Alignment** | `P2 - Medium` | ✅ Completed | v5.3 |
| **Phase 5** | **Collision Regression Suite & End-to-End Validation** | `P3 - Low` | ✅ Completed | v5.4 |

---

## Technical Specifications & Phase Breakdown

### Phase 1: Cell State Precedence & CSS Visual Hierarchy
* **Status**: ✅ Completed

#### Problem Statement & Root Cause
1. **Structure Floor vs Water Contradiction (`cell structure_floor elev_0 water`)**:
   - When a structure blueprint is stamped on or near water, cells acquire both `STRUCTURE_FLOOR` and `WATER` flags.
   - In [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js), `isBlockedType()` checks `WATER` as blocked unless marked as `STRUCTURE_PATH` or `STRUCTURE_BRIDGE`. Because `STRUCTURE_FLOOR` is omitted from this exemption list, interior building floors over water become impassable barriers!
   - Visually, the cell receives both `.structure_floor` and `.water`, creating conflicting styles where water styling or elevation $0$ overrides or muddies the interior floor.
2. **Pathfinding & Selection Highlighting Masked by Cascade Order**:
   - In [styles.css](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css), highlighting classes (`.cell.selected`, `.cell.path_step`, `.cell.selectedDestination`) are declared early.
   - Subsequent terrain, hydrology, and structural rules (`.cell.water`, `.cell.structure_floor`, `.cell.structure_bridge`, `.cell.elev_2`, `.cell.elev_3`, `.cell.chasm`) are defined lower in the stylesheet with identical CSS specificity (`0-1-0` or `0-2-0`).
   - By standard CSS cascade rules, the later rules override the earlier highlight fills. Consequently, clicking on water, bridges, paths, highlands, or structure floors fails to display destination beacons or path step trails!
3. **Other Cell-Level Collisions Reviewed**:
   - `TREE` inside `WATER`: Trees randomly generated on river basins or lakeshores.
   - `BLOCKED` rocks inside `STRUCTURE_PATH` or `STRUCTURE_FLOOR`.
   - `TERRAIN_CLIFF` applied to `STRUCTURE_BRIDGE`: Bridge decks erroneously tagged with cliff boundaries, creating confusing conflicting visuals.
   - `CHASM` beneath `STRUCTURE_FLOOR`: Buildings floating over bottomless chasms.

#### Architectural Solutions
1. **Explicit Flag Override & Sanitization Rules**:
   - Establish an authoritative state hierarchy during cell mutation:
     $$\text{STRUCTURE\_FLOOR} \succ \text{STRUCTURE\_WALL} \succ \text{STRUCTURE\_PATH} \succ \text{TERRAIN (WATER, TREE, BLOCKED, CHASM)}$$
   - When `STRUCTURE_FLOOR` or `STRUCTURE_WALL` is applied to a cell:
     - Automatically purge `WATER`, `WATER_SHALLOW`, `TREE`, `BLOCKED`, `CHASM`, and `TERRAIN_CLIFF`.
     - Elevate cell elevation to the structure's dry foundation grade ($h \ge 1$).
   - Update `cell_meta.isBlockedType()` to ensure `STRUCTURE_FLOOR` guarantees interior passability.
2. **CSS Specificity & Layered Visual Order Overhaul**:
   - Restructured [styles.css](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css) into distinct rendering layers using higher specificity selectors:
     - Layer 1: Base Terrain & Elevation Tiers (`.cell.elev_0`, `.cell.water`, `.cell.chasm`, `.cell.cliff`)
     - Layer 2: Biome Vegetation (`.cell.grass`, `.cell.tree`, `.cell.flora`)
     - Layer 3: Built Infrastructure (`.cell.structure_floor`, `.cell.structure_path`, `.cell.structure_bridge`, `.cell.structure_wall`, `.cell.structure_door`)
     - Layer 4: Interactive Selection & Navigation Overlays (`#frame .cell.selected`, `#frame .cell.path_step`, `#frame .cell.selectedDestination` with `!important`)

---

### Phase 2: Structure-Terrain Clearance & Placement Validation
* **Status**: ✅ Completed

#### Problem Statement & Root Cause
1. **Structures Stamping Over Terrain Landforms**:
   - `StructureStamper.canPlace()` previously only checked collisions against existing `STRUCTURE_WALL` and `STRUCTURE_FLOOR`.
   - It did not check for `WATER`, `CHASM`, or steep `TERRAIN_CLIFF` drop-offs.
   - Consequently, procedural generators ([WorldStructurePlacer.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/WorldStructurePlacer.js)) frequently placed dryland buildings submerged in rivers or bisected by chasms.
2. **Deterministic Seed-Based Collision Retries**:
   - Replaced unseeded `Math.random()` in structure placement retries with deterministic coordinates computed from the root seed via `map.getCandidateCoord(salt, attempt, ...)`.

#### Architectural Solutions
1. **Category-Aware Placement Constraints in `StructureStamper.canPlace()`**:
   - Dry terrestrial buildings require 0% overlap with water or chasm, uniform elevation grade, and dry door egress.
   - Waterfront structures (watermill, fishing pier) require shore contact and water adjacency.
2. **Procedural Trail Routing**:
   - Doorway-to-doorway trail carving connects buildings across the terrain.

---

### Phase 3: Foundation Leveling & Elevation Topographic Integrity
* **Status**: ✅ Completed

#### Problem Statement & Root Cause
1. **Multi-Tier Elevation Splitting Inside Structures**:
   - Buildings crossing elevation boundaries inherited multiple elevations, causing internal invisible cliffs.
2. **Cliff Contours Running Through Interior Living Spaces**:
   - Cliff outlines rendered across indoor wood planks.

#### Architectural Solutions
1. **Foundation Leveling**:
   - Force all footprint cells to uniform elevation $h_{\text{foundation}}$.
   - Clear `TERRAIN_CLIFF` inside building interiors.
2. **Door Aprons & Ramps**:
   - Stamped external ramps (`TERRAIN_RAMP`) when doors transition across elevation tiers.

---

### Phase 4: Engineered Bridge Spanning & Abutment Alignment
* **Status**: ✅ Completed

#### Problem Statement & Root Cause
1. **Bridges Failing to Span the Full Gap**:
   - Diagonal walks across wide rivers resulted in disjointed bridge tiles that ended in water.
2. **Lack of Engineered Bridge Abutments**:
   - Bridge decks ended abruptly without firm ground anchors.

#### Architectural Solutions
1. **Orthogonal Gap Raycasting & Full-Span Raytracer in `BridgePlacer.js`**:
   - Raycast across the channel along the primary axis (Horizontal $E \leftrightarrow W$ or Vertical $N \leftrightarrow S$) until reaching solid land.
   - Stamp an unbroken line of bridge deck cells (`STRUCTURE_BRIDGE | STRUCTURE_PATH`).
2. **Dual-Sided Guardrails & Solid Shore Abutments**:
   - Parallel guide rails (`STRUCTURE_WALL`) on water flanks.
   - Solid stone/wood bridge abutments on both shoreline connection tiles.

---

### Phase 5: Collision Regression Suite & End-to-End Validation
* **Status**: ✅ Completed

#### Motivation & Deliverables
1. **Automated Collision & Precedence Test Battery in `benchmark.js`**:
   - 10-test standardized battery validating optimal pathfinding, collision safety, and structure traversal.
2. **Interactive Browser Subagent Verification**:
   - DOM and canvas verification of visual styling, zero illegal class combinations, and reproducible seeded placement across reloads.
