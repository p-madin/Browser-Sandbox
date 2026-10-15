# Project Roadmap: Natural Terrain Structures & World Hydrology

This document outlines the strategic engineering roadmap for Grid Engine's natural terrain structures, hydrology systems, elevation topography, and geological landforms (rivers, bridges, hills, canyons, and cliff passes).

> [!NOTE]
> - Foundational engine milestones (Phases 1–7: Viewport, Lerping, Vector Heading, Benchmarking, Modular A*, Bitmask Model) are archived in [Documentation/roadmap1.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap1.md).  
> - Structural architecture milestones (Phases 1–4: Blueprints, Procedural Placer, Interactive Doors/Barricades, Roof Cutaways) are archived in [Documentation/roadmap2.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap2.md).  
> - Experimental and deferred concepts remain tracked in [sandbox.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/sandbox.md).

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | Hydrology & River Systems (Water Cells, Rivers & Lakes) | `P1 - High` | ✅ Completed | v4.0 |
| **Phase 2** | Bridges & River Crossings (Timber Trestles, Stone Arches & Fords) | `P1 - High` | ✅ Completed | v4.1 |
| **Phase 3** | Topography & Elevation Tiers (Hills, Plateaus, Slopes & Ramps) | `P2 - Medium` | ✅ Completed | v4.2 |
| **Phase 4** | Canyons, Chasms & Suspension Crossings | `P2 - Medium` | ✅ Completed | v4.3 |
| **Phase 5** | Riparian Ecology & Geomorphic World Integration | `P3 - Low` | ✅ Completed | v4.4 |

---

## Technical Specifications & Phase Breakdown

### Phase 1: Hydrology & River Systems (Water Cells, Rivers & Lakes)
* **Status**: ✅ Completed
* **Motivation**:
  The world terrain currently consists of simple binary land tiles (`GRASS`, `TREE`, `BLOCKED`). Natural worlds feature water bodies—meandering rivers, tributaries, and expansive lakes—that carve geographic boundaries, divide regions into territories, and establish realistic natural obstacles for navigation.
* **Architecture Solution**:
  1. **Cell Bitmask Extensions (`CellFlags`)**:
     - Extend `CellFlags` in [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js) with:
       ```javascript
       WATER: 1 << 17,          // 131072 - Impassable aquatic cell
       WATER_SHALLOW: 1 << 18,  // 262144 - Wading water / ford (passable with high cost)
       TERRAIN_CLIFF: 1 << 19   // 524288 - Impassable vertical cliff face
       ```
     - Update `isBlockedType()` so `CellFlags.WATER` acts as an impassable barrier unless designated as shallow or bridged.
  2. **Hydrological River Generator (`RiverGenerator.js`)**:
     - Implement procedural river generation algorithms across the 200×200 world:
       - **Source-to-Sink Pathing**: Pick river origins at map borders/highlands and route to lakes or lowlands using constrained random-walk with momentum persistence and gradient descent.
       - **Meander Curves**: Apply Perlin noise / cubic spline offsets to create realistic S-bends and variable river widths (1 to 3 tiles).
       - **Lake Basins**: Procedural cellular automata or radial distance carving for ponds and inland lakes.
  3. **Visual Aesthetics & Water Styling**:
     - Add deep sapphire water hues (`fill: #1e3a8a; stroke: #1d4ed8;`) and lighter shallow coastal water (`fill: #0284c7;`) to [styles.css](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css).
     - Implement subtle CSS river flow wave animations or shimmer micro-effects.
  4. **Pathfinder Integration**:
     - Rivers naturally segment the navmesh graph. A* automatically routes around riverbanks or seeks nearest crossings.

---

### Phase 2: Bridges & River Crossings (Timber Trestles, Stone Arches & Fords)
* **Status**: ✅ Completed
* **Motivation**:
  With rivers dividing the landscape, travel between territories requires engineered crossing points. Trails must connect organically with bridges, and players must be able to cross waterways without breaking pathfinding continuity.
* **Architecture Solution**:
  1. **Bridge Blueprint Schema & Directional Prefabs**:
     - Define modular bridge blueprints in [StructureBlueprint.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/StructureBlueprint.js):
       - `TimberBridge`: Wooden planks spanning water with guide rails (`"P"` pathway over `"W"` water).
       - `StoneArchBridge`: Heavy fortified masonry with stone parapets.
       - `ShallowFord`: Stepping stones and sandy shallows offering pedestrian wading crossings.
  2. **Procedural Bridge Placer (`BridgePlacer.js`)**:
     - Analyze intersections between procedural trails ([WorldStructurePlacer.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/WorldStructurePlacer.js)) and rivers:
       - Detect river width and orientation (horizontal, vertical, or diagonal).
       - Stamp matching bridge structure over the water gap.
       - Re-evaluate local graph passability in $O(W \times H)$, connecting the two shores.
  3. **Weighted Pathfinding Integration**:
     - Bridges provide standard walking cost ($1.0$), while shallow fords incur a wading penalty ($+1.2$), ensuring the pathfinder prefers dry bridges over wet fords when available.

---

### Phase 3: Topography & Elevation Tiers (Hills, Plateaus, Slopes & Ramps)
* **Status**: ✅ Completed
* **Motivation**:
  Currently, all tiles lie on a flat plane. Introducing discrete elevation tiers (valleys, lowlands, rolling hills, and high mountain plateaus) provides verticality, tactical high ground, and scenic landscapes.
* **Architecture Solution**:
  1. **Discrete Heightmap Engine (`ElevationService.js`)**:
     - Assign an integer elevation level $h \in [0, 3]$ to every cell in `mapObject.map_cells`:
       - `h = 0`: Water level & river basins
       - `h = 1`: Lowland meadows & forests (default land)
       - `h = 2`: Highland plateaus & rolling hills
       - `h = 3`: Mountain peaks & rocky crags
  2. **Cliff Boundaries & Ramp Passages**:
     - Cells adjacent to a higher elevation tier ($\Delta h \ge 1$) render with cliff edges.
     - Cliffs without ramps are strictly impassable.
     - Natural grass ramps or carved stone steps (`STRUCTURE_STAIRS`) connect adjacent elevation tiers.
  3. **Elevation-Weighted A\* Traversal**:
     - Traversal between tiers via ramps adds realistic kinetic cost (uphill $+0.4$, downhill $-0.1$).

---

### Phase 4: Canyons, Chasms & Suspension Crossings
* **Status**: ✅ Completed
* **Motivation**:
  Rugged mountainous areas and arid biomes require dramatic geological features: deep chasms, rocky gorges, and sheer drop-offs that channel exploration through narrow defiles.
* **Architecture Solution**:
  1. **Procedural Fault-Line Generator (`CanyonGenerator.js`)**:
     - Carve linear fissures and jagged canyon trenches using recursive midpoint displacement.
     - Canyon beds feature rocky rubble and dried riverbeds with central impassable `CHASM` voids.
  2. **Suspension Rope Bridges**:
     - Long-span wooden suspension bridges spanning across wide gorges with rope rails and timber walkway.
  3. **Tactical Defiles & Choke Points**:
     - Creates strategic bottleneck navigation routes ideal for future NPC ambushes, bandit barricades, and watchtower defense.

---

### Phase 5: Riparian Ecology & Geomorphic World Integration
* **Status**: ✅ Completed
* **Motivation**:
  Terrain structures should organically dictate the surrounding biome flora, resource distribution, and architectural placement.
* **Architecture Solution**:
  1. **Moisture-Driven Flora Distribution (`RiparianEcologyService.js`)**:
     - Riverbanks and lake margins sprout lush reeds (`TERRAIN_FLORA`), willow clusters, and berry bushes.
     - High elevation plateaus transition to alpine pines, sparse tundra shrubs, and exposed bedrock.
  2. **Hydrological Architecture Alignment**:
     - Watermills dynamically placed adjacent to riverbanks with paddlewheels in flowing water.
     - Lakeside fishing piers with mooring posts extending from shore into the lake basin.

---

## Technical Specifications & Class Contracts

```
+-------------------------------------------------------------+
|                     RiverGenerator.js                       |
|  - generateHydrology(mapObject)                             |
|  - carveRiverCourse(startCoord, endCoord, options)          |
|  - carveLakeBasin(centerCoord, radius)                      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    ElevationService.js                      |
|  - generateHeightmap(mapObject, options)                    |
|  - carveRamp(fromCell, toCell)                              |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     CanyonGenerator.js                      |
|  - generateCanyons(mapObject)                               |
|  - carveFaultLine(startCoord, endCoord, options)            |
|  - stampSuspensionCrossing(mapObject, center, modified)     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      BridgePlacer.js                        |
|  - processRiverCrossings(mapObject)                         |
|  - stampBridge(mapObject, coord, orientation, type)         |
|  - recalculateCrossingPassability(mapObject, cells)         |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  RiparianEcologyService.js                  |
|  - populateRiparianFlora(mapObject)                         |
|  - placeWaterfrontArchitecture(mapObject)                   |
|  - integrateGeomorphicWorld(mapObject)                      |
+-------------------------------------------------------------+
```
