# Project Roadmap: Geomorphic Crossings, Wading Kinematics & Organic Terrain Aesthetics

This roadmap establishes the technical specifications to resolve remaining bridge fabrication failures across canyons, restore interactive pathfinding and wading across shallow water fords, and introduce organic geometric rendering (circular tree canopies within grass blocks and curved boundary blends between grass and mountain terrain).

> [!NOTE]
> - **Roadmap 1 (Engine Core)**: Archival reference in [Documentation/roadmap1.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap1.md) (Viewport, Lerping, Vector Heading, Benchmarking, Modular A*, Bitmask Model).  
> - **Roadmap 2 (Structural Architecture)**: Archival reference in [Documentation/roadmap2.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap2.md) (Blueprints, Procedural Placer, Interactive Doors/Barricades, Roof Cutaways).  
> - **Roadmap 3 (Terrain & Hydrology)**: Archival reference in [Documentation/roadmap3.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap3.md) (Rivers, Lakes, Elevation Tiers, Chasms, Bridges, Riparian Ecology).  
> - **Roadmap 4 (Collision Resolution & Layer Precedence)**: Archival reference in [Documentation/roadmap4.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap4.md) (Cell flag hierarchy, CSS specificity cascades, seed-deterministic retries).  
> - **Roadmap 5 (Macro-Geomorphic Clearance & River Bridges)**: Archival reference in [Documentation/roadmap5.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap5.md) (Disjoint geomorphic domains, zero water-mountain-chasm overlaps, mandatory river bridge spans).  
> - Experimental concepts remain tracked in [sandbox.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/sandbox.md).

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | **Dynamic Shore-to-Shore Canyon Suspension Bridges** | `P1 - High` | ✅ Completed | v7.0 |
| **Phase 2** | **Shallow Water Wading Passability & Ford Kinematics** | `P1 - High` | ✅ Completed | v7.1 |
| **Phase 3** | **Circular Tree Canopies on Grass & Structural Rectilinear Integrity** | `P2 - Medium` | ✅ Completed | v7.2 |
| **Phase 4** | **Organic Curved Terrain Blending & Shaded Relief Gradients** | `P2 - Medium` | ✅ Completed | v7.3 |
| **Phase 5** | **Benchmark Telemetry, Navmesh Validation & Interactive Verification** | `P2 - Medium` | ✅ Completed | v7.4 |

---

## Technical Specifications & Phase Breakdown

### Phase 1: Dynamic Shore-to-Shore Canyon Suspension Bridges
* **Status**: ✅ Completed
* **Goal**: Replace rigid 5-tile horizontal bridge stamps in [CanyonGenerator.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/CanyonGenerator.js) with adaptive shore-to-shore raycasting that reliably spans chasm voids across any fault line angle (North-South, East-West, and diagonal defiles), anchoring solid cliff abutments and ensuring 100% pathfinding traversal.

#### Problem Statement & Root Cause
1. **Hardcoded Horizontal Orientation**:
   - In [CanyonGenerator.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/CanyonGenerator.js#L137-L160), `stampSuspensionCrossing()` iterates strictly over $ox \in [-2, 2]$ and $oy \in [-1, 1]$, placing the passable deck at $oy = 0$:
     ```javascript
     for (let ox = -2; ox <= 2; ox++) {
         for (let oy = -1; oy <= 1; oy++) {
             if (oy === 0) { // Walkway hardcoded along X-axis
     ```
   - In the **Eastern Arid Rift** ($x \approx 82, y \in [-25, 25]$), the fault line runs North-South, so a horizontal deck happens to cross it.
   - In the **Western Defile** ($x \in [-82, -50], y \approx -5$), the fault line runs **East-West**. The bridge deck is stamped horizontally **directly inside the chasm, parallel to the fracture**, rather than crossing it.
2. **Fixed Span Length Without Shore Raycasting**:
   - The canyon fracture generator introduces pseudo-random jaggedness (`jaggedOffset = (canyonRng - 0.5) * 1.2 + Math.sin(steps * 0.35) * 0.5`) and variable corridor widths.
   - A rigid 5-tile span does not test for solid land. As a result, bridges either fall short of the opposite rim (creating an impassable 1-tile drop into the chasm), hover in mid-air over the void, or collide into solid rock without proper abutments.

#### Architectural Solutions
1. **Adaptive Chasm Raycasting Engine**:
   - At each candidate bridge location along a fault line, evaluate the local tangent vector of the fracture:
     $$\vec{T} = (\Delta x, \Delta y) = (\cos \theta, \sin \theta)$$
   - Establish the normal crossing vector perpendicular to the chasm:
     $$\vec{N} = (-\sin \theta, \cos \theta)$$
   - Snap the crossing axis to the dominant cardinal orientation:
     $$\text{Axis} = \begin{cases} \text{Vertical (V)}, & \text{if } |\Delta x| \ge |\Delta y| \text{ (fissure runs East-West)} \\ \text{Horizontal (H)}, & \text{if } |\Delta y| > |\Delta x| \text{ (fissure runs North-South)} \end{cases}$$
2. **True Shore-to-Shore Spanning & Abutment Anchoring**:
   - Raycast in both positive and negative directions along the crossing axis until solid ground ($\neg \text{CHASM} \land \neg \text{WATER}$) is encountered on both sides: `Shore A` and `Shore B`.
   - Validate span distance: if $d(\text{Shore A}, \text{Shore B}) \in [2, 8]$, lay an unbroken bridge deck tagged with `STRUCTURE_BRIDGE | STRUCTURE_PATH` and set `cell.elevation = shoreA.elevation || 1`.
   - Anchor both shores: remove `TERRAIN_CLIFF`, `TREE`, and `BLOCKED` flags from `Shore A` and `Shore B` and tag them with `STRUCTURE_PATH` so agents can seamlessly enter and exit the span.
   - Flank both sides of the deck over the chasm with protective suspension railings (`STRUCTURE_WALL`).
3. **Passability Synchronization**:
   - Invoke `cell.determineNeighboursPassable(map)` across all deck, abutment, and railing cells immediately after placement so the navmesh instantly reflects the new crossing.

---

### Phase 2: Shallow Water Wading Passability & Ford Kinematics
* **Status**: ✅ Completed
* **Goal**: Permit agents to click, pathfind, and wade across shallow water fords with an intentional kinetic wading penalty ($+1.5$), while preserving strict bridge requirements for deep river channels.

#### Problem Statement & Root Cause
1. **Dual Flag Collision in `cell.isBlockedType()`**:
   - In [RiverGenerator.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/RiverGenerator.js#L69-L73), shallow water fords receive both `WATER` and `WATER_SHALLOW`:
     ```javascript
     cell.addFlag(CellFlags.WATER);
     if (isShallow) cell.addFlag(CellFlags.WATER_SHALLOW);
     ```
   - In [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js#L208-L210), `isBlockedType()` enforces:
     ```javascript
     if (this.flags & CellFlags.WATER) {
         return (this.flags & CellFlags.STRUCTURE_BRIDGE) === 0;
     }
     ```
   - Because shallow water carries `CellFlags.WATER` and does not have `STRUCTURE_BRIDGE`, `isBlockedType()` returns `true`. The engine treats shallow fords as solid impassable barriers.
2. **Elevation Cliff Barrier**:
   - In [ElevationService.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/ElevationService.js#L40), all water cells are clamped to $h = 0$, while surrounding terrain is $h = 1$.
   - In [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js#L376-L384), vertical steps of $\Delta h = 1$ are blocked unless bridged by `TERRAIN_RAMP`, `STRUCTURE_PATH`, or `STRUCTURE_BRIDGE`. Natural shallow fords possess none of these, creating an invisible sheer wall between the riverbank and the water.

#### Architectural Solutions
1. **Refined Water Blocking Contract in `cell.isBlockedType()`**:
   - Deep water remains strictly impassable without an engineered bridge deck.
   - Shallow water (`WATER_SHALLOW`) is explicitly designated as a passable wading surface:
     ```javascript
     if (this.flags & CellFlags.WATER) {
         if (this.flags & CellFlags.STRUCTURE_BRIDGE) return false;
         if (this.flags & CellFlags.WATER_SHALLOW) return false; // Shallow ford wading
         return true; // Deep river channel remains impassable
     }
     ```
2. **Shoreline Wading Transition in `canStepInto(c)`**:
   - Update vertical stepping logic in [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js) to recognize transitions into and out of `CellFlags.WATER_SHALLOW`:
     $$\text{hasRampOrFord} = \text{hasRamp} \lor \text{this.hasFlag}(\text{WATER\_SHALLOW}) \lor c.\text{hasFlag}(\text{WATER\_SHALLOW})$$
   - Agents can step down from the bank ($h=1$) into shallow water ($h=0$) and climb back out without requiring an artificial wooden ramp.
3. **Kinetic Cost Balancing**:
   - Preserve the $+1.5$ cost penalty in [PathfinderService.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/PathfinderService.js#L409-L411):
     ```javascript
     if (nextMeta.hasFlag(CellFlags.WATER_SHALLOW) && !nextMeta.hasFlag(CellFlags.STRUCTURE_BRIDGE)) {
         stepCost += 1.5; // Shallow water wading penalty
     }
     ```
   - A* will naturally prioritize dry timber/stone bridges ($1.0$ cost) when nearby, only choosing shallow fords ($2.5$ cost) when no bridge is available or when the detour would be excessively long.

---

### Phase 3: Circular Tree Canopies on Grass & Structural Rectilinear Integrity
* **Status**: ✅ Completed
* **Goal**: Transform trees from rigid solid-color squares into organic circular canopies centered within grass tiles, while strictly maintaining square geometry for architectural elements (walls, floors, and roofs).

#### Problem Statement & Root Cause
1. **Homogeneous Rectangular Tile Rendering**:
   - In [grid.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/grid.js#L88-L95), every map tile is rendered as a single SVG `<rect>` element.
   - When a cell has `CellFlags.TREE`, `.cell.tree` overrides the tile fill:
     ```css
     .cell.tree { fill: rgb(126, 72, 8); }
     ```
   - This paints the entire square block brown, obliterating the underlying green grass terrain and giving forests an artificial, blocky appearance.
2. **Geometry Contrast Requirement**:
   - Buildings, watchtowers, doorways, and barricades are man-made structures that must retain crisp square silhouettes ($90^\circ$ corners).
   - Flora and trees are natural organisms that should appear round or clustered.

#### Architectural Solutions
1. **Secondary SVG Feature Layer in `grid.js`**:
   - Introduce a dedicated `features_layer` in the SVG viewport positioned between `tiles_layer` and `roof_layer`:
     ```
     <svg id="frame">
       <g id="tiles_layer">    <!-- Base terrain: Grass, Water, Stone paths, Floors -->
       <g id="features_layer"> <!-- Organic elements: Tree canopies, Rocks, Flora -->
       <g id="roof_layer">     <!-- Overhead roofs, Canopies -->
       <g id="agents_layer">   <!-- Player and NPCs -->
     </svg>
     ```
   - For each viewport cell, instantiate a circular feature element `<circle class="cell_feature">`:
     ```javascript
     var feature = create_svg_element("circle");
     feature.setAttribute("cx", (i * this.cell_size + this.cell_size / 2) + "px");
     feature.setAttribute("cy", (j * this.cell_size + this.cell_size / 2) + "px");
     feature.setAttribute("r", (this.cell_size * 0.42) + "px");
     ```
2. **Grass Base Preservation for Tree Tiles**:
   - When a cell possesses `CellFlags.TREE`:
     - The base tile `<rect>` maintains its native `.cell.grass` styling (vibrant green ground).
     - The corresponding circular feature element is displayed with a rich foliage canopy style (e.g. deep forest green/emerald with wood trunk core or soft drop shadow).
   - When a cell does not have `CellFlags.TREE`, the feature circle remains `display: none`.
3. **Strict Rectilinear Preservation for Structures**:
   - All structural components (`STRUCTURE_WALL`, `STRUCTURE_FLOOR`, `STRUCTURE_DOOR`, `STRUCTURE_ROOF`, `STRUCTURE_BARRICADE`) remain exclusively on the rectilinear `<rect>` layer, preserving architectural fidelity.

---

### Phase 4: Organic Curved Terrain Blending & Shaded Relief Gradients
* **Status**: ✅ Completed
* **Goal**: Eliminate rigid checkerboard boundaries between contiguous grass tiles, highland plateaus, and mountain crags by introducing curved corner overlays and shaded relief gradients that create natural, rolling topography.

#### Problem Statement & Root Cause
1. **Grid Sharpness at Biome Boundaries**:
   - Individual cells are rendered as independent squares with sharp $90^\circ$ borders.
   - Boundaries between meadow grass ($h=1$), highland plateaus ($h=2$), and mountain crags ($h=3$) appear as harsh staircase steps.
2. **Uniform Flat Color Fills**:
   - Mountains and hills use flat hex colors (`.cell.elev_2 { fill: #15803d; }`, `.cell.elev_3 { fill: #475569; }`), providing no visual sensation of slope, depth, or organic curvature.

#### Architectural Solutions
1. **Corner-Fillet & Circle Overlay Trick for Organic Blending**:
   - Use an organic corner blending technique between adjacent cells of the same terrain classification:
     - For contiguous grass-to-grass or mountain-to-mountain clusters, compute the 4-neighbor adjacency mask:
       $$\text{Adjacency} = (\text{North}, \text{East}, \text{South}, \text{West})$$
     - At exterior corners where matching terrain meets, overlay curved circular fillet patches or rounded corner caps (`rx` / `ry` or corner `<path>` arcs in the terrain decoration layer).
     - These overlapping arcs round off the jagged $90^\circ$ grid steps, transforming pixelated stepped boundaries into smooth rolling contours.
2. **Topographic Shaded Relief Gradients in SVG `<defs>`**:
   - Define multi-stop radial and directional linear gradients in the SVG header:
     - `gradient_highland`: Smooth transition from sunlit crest (`#16a34a`) to shaded base (`#15803d`).
     - `gradient_mountain_peak`: Crag relief shading from granite peak (`#64748b`) to talus slope (`#334155`).
     - `gradient_grass_meadow`: Subtle organic radial gradient giving natural turf depth without distracting from navigation markers.
3. **Riverbank & Shoreline Softening**:
   - Add a subtle 1px soft inner glow / shoreline transition to `.cell.water_shallow` and coastal edges, producing a natural aquatic gradient into deep river channels.

---

### Phase 5: Benchmark Telemetry, Navmesh Validation & Interactive Verification
* **Status**: ✅ Completed
* **Goal**: Validate that all geomorphic crossings are 100% pathfindable, shallow water wading functions reliably without regressions, and visual curves/canopies render smoothly at 60 FPS.

#### Verification Criteria & Automated Battery
1. **Automated Benchmark Suite Extensions in `benchmark.js`**:
   - **Test 1 (`canyon_cross_h`)**: Pathfind across East-West canyon via suspension bridge. Verify length, cost, and $0\%$ failure rate.
   - **Test 2 (`canyon_cross_v`)**: Pathfind across North-South canyon via suspension bridge. Verify length, cost, and $0\%$ failure rate.
   - **Test 3 (`shallow_ford_wade`)**: Pathfind across a river using a shallow water ford without bridges. Verify success and ensure $+1.5$ wading cost penalty is accurately accumulated.
   - **Test 4 (`bridge_over_ford_preference`)**: Set destination across river with both a bridge and a shallow ford available. Verify A* chooses the bridge due to lower total path cost.
2. **Live Browser Validation**:
   - Visually inspect canyon bridges: verify both North-South and East-West bridges span cleanly from cliff to cliff without hovering or running parallel.
   - Visually inspect tree canopies: verify round canopies nested inside green grass tiles, with walls/roofs remaining crisp squares.
   - Visually inspect terrain transitions: verify smooth curved boundaries and shaded gradients between grass, hills, and mountain peaks.
   - Interactive click testing: click on shallow water tiles to confirm immediate beacon placement and avatar traversal.

---

## Invariant Safety Matrix

| Domain | Rule / Invariant | Enforcement Location |
| :--- | :--- | :--- |
| **Canyon Bridges** | All canyon crossings must raycast perpendicular to the fault line and anchor on solid cliff edges on both shores. | `CanyonGenerator.js` & `BridgePlacer.js` |
| **River Bridges** | Deep water (`CellFlags.WATER`) strictly requires `STRUCTURE_BRIDGE` to be passable. | `cell.js:isBlockedType` |
| **Shallow Water** | Shallow fords (`CellFlags.WATER_SHALLOW`) are passable with a $+1.5$ kinetic wading penalty. | `cell.js:isBlockedType`, `PathfinderService.js` |
| **Tree Rendering** | Trees must render as circular canopies over grass tiles; architectural structures must render as crisp squares. | `grid.js`, `styles.css` |
| **Terrain Curves** | Contour blending must only affect visual styling; underlying navmesh coordinates remain exact. | `grid.js`, `styles.css`, `cell.js` |
