# Project Roadmap: World Structures & Generation

This document outlines the strategic engineering roadmap for Grid Engine's multi-tile structures, dynamic procedural generation, interactive architecture, and layered interior rendering.

> [!NOTE]
> The foundational engine milestones (Phases 1–7: Viewport Retention, Motion Lerping, Vector Heading, Benchmarking, Modular A*, and Bitmask State Model) are archived in [Documentation/roadmap1.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/Documentation/roadmap1.md).  
> Deferred experimental features (Autonomous NPC AI, Fog of War FOV, Web Audio SFX) are tracked in [sandbox.md](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/sandbox.md).

---

## Roadmap Overview & Progress Matrix

| Phase | Milestone | Priority | Status | Target Release |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | Structure Blueprint Engine & Prefab Stamp System | `P1 - High` | 🟡 Next | v3.5 |
| **Phase 2** | Dynamic & Procedural Structure Generation Engine | `P1 - High` | ⏳ Pending | v3.5 |
| **Phase 3** | Interactive Structural Mechanics & Dynamic Pathfinding Integration | `P2 - Medium` | ⏳ Pending | v3.6 |
| **Phase 4** | Multi-Layer Interior Occlusion & Dynamic Roof Cutaway | `P2 - Medium` | ⏳ Pending | v3.6 |

---

## Technical Specifications & Phase Breakdown

### Phase 1: Structure Blueprint Engine & Prefab Stamp System
* **Motivation**:
  Currently, map generation in [mapObject.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/mapObject.js) only places single isolated tiles (`BLOCKED`, `GRASS`, `TREE`, `ENEMY`). Cohesive structures—such as wooden cabins, stone fortresses, ancient ruins, bridges, shrines, and boundary fences—require a dedicated multi-tile Blueprint schema, coordinate transformation engine, and stamping pipeline.
* **Architecture Solution**:
  1. **Structure Bitmask Extensions (`CellFlags`)**:
     Extend `CellFlags` in [cell.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/cell.js) with structural components:
     ```javascript
     const CellFlags = Object.freeze({
         // Base terrain & entities (0 - 8)
         NONE: 0,
         BLOCKED: 1 << 0,
         GRASS: 1 << 1,
         TREE: 1 << 2,
         ENEMY: 1 << 3,
         AGENT: 1 << 4,
         SELECTED: 1 << 5,
         SPECIAL: 1 << 6,
         THINKING: 1 << 7,
         WALKING: 1 << 8,
         // Structural Components (9 - 14)
         STRUCTURE_WALL: 1 << 9,     // 512  - Impassable structural barrier
         STRUCTURE_FLOOR: 1 << 10,   // 1024 - Wood plank / stone tile interior floor
         STRUCTURE_DOOR: 1 << 11,    // 2048 - Ingress/egress doorway opening
         STRUCTURE_ROOF: 1 << 12,    // 4096 - Overhead canopy / roof tile
         STRUCTURE_FIXTURE: 1 << 13, // 8192 - Internal fixture (chest, bench, hearth)
         STRUCTURE_PATH: 1 << 14     // 16384 - Exterior gravel / stone pathway
     });
     ```
  2. **Structure Blueprint Schema (`StructureBlueprint.js`)**:
     - Define prefabs using compact 2D matrix representations with local coordinate offsets:
       ```javascript
       const CabinBlueprint = {
           id: "cabin_small",
           name: "Woodland Cabin",
           width: 5,
           height: 5,
           origin: { x: 2, y: 2 },
           layers: {
               floor: [
                   [1, 1, 1, 1, 1],
                   [1, 1, 1, 1, 1],
                   [1, 1, 1, 1, 1],
                   [1, 1, 1, 1, 1],
                   [1, 1, 1, 1, 1]
               ],
               walls: [
                   ["W", "W", "W", "W", "W"],
                   ["W",  0 ,  0 ,  0 , "W"],
                   ["W",  0 , "F",  0 , "W"],
                   ["W",  0 ,  0 ,  0 , "W"],
                   ["W", "W", "D", "W", "W"] // D = Doorway
               ]
           }
       };
       ```
  3. **Blueprint Transformation Engine**:
     - Support matrix rotation ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) and horizontal/vertical mirroring so prefabs can face any cardinal direction naturally.
  4. **Structure Stamper Service (`StructureStamper.js`)**:
     - `canPlace(mapObject, blueprint, originX, originY)`: Validates bounding box within map bounds, verifies terrain passability clearance, and prevents clipping into existing structural bounds.
     - `stamp(mapObject, blueprint, originX, originY)`: Atomically applies the blueprint onto `mapObject.map_cells`, applies `CellFlags`, clears overlapping natural obstacles (trees/rocks), and re-evaluates neighbor passability for affected cells and their perimeter in $O(W \times H)$.
  5. **Visual Styling Tokens**:
     - Update [styles.css](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/styles.css) with rich SVG classes for wooden walls, stone brick masonry, interior plank floors, doorways, and gravel trails.

---

### Phase 2: Dynamic & Procedural Structure Generation Engine
* **Motivation**:
  Pre-baked static placements limit replayability and map scale. A robust open world requires dynamic procedural generation capable of generating varied ruins, multi-room dungeons, and clustered settlements that organically blend into surrounding biomes.
* **Architecture Solution**:
  1. **Binary Space Partitioning (BSP) Multi-Room Dungeon Generator**:
     - Implement recursive BSP room-partitioning in `BSPStructureGenerator.js`:
       - Recursively subdivide a structural bounding box into sub-sectors.
       - Carve rooms within each partition with randomized margins.
       - Connect rooms via $L$-shaped hallway corridors with guaranteed connectivity.
       - Add perimeter walls and doorways at hallway intersections.
  2. **Biome-Aware Placement Engine (`WorldStructurePlacer.js`)**:
     - Define structural distribution rules matching biomes and elevations:
       - **Lush Grass Biomes**: Woodcutter cabins, fenced pastures, windmills, stone well shrines.
       - **Dense Forest Clusters**: Bandit hideouts, overgrown ancient stone ruins, timber lodges.
       - **Stone / Rocky Outcrops**: Mountain watchtowers, fortified stone outposts, dungeon entrances.
  3. **Poisson Disk Distribution with Clearance Buffers**:
     - Enforce a minimum Euclidean clearance distance $d_{\text{min}}$ between major structures to avoid unnatural crowding while ensuring walkable surrounding paths.
  4. **Terrain Leveling & Perimeter Blending**:
     - Perform a pre-placement pass: flatten terrain obstacles within the footprint buffer $+1$ tile.
     - Connect structural doorways to the surrounding biome via procedural dirt/gravel trail generation (A* path carving with natural wandering cost bias).

---

### Phase 3: Interactive Structural Mechanics & Dynamic Pathfinding Integration
* **Motivation**:
  Structures should not be static geometry. Doors must be openable and lockable, barricades destructible, and navigation must adapt dynamically in real-time as doorways open or close without requiring a full map rebuild.
* **Architecture Solution**:
  1. **Interactive Doorways & State Machines**:
     - `CellFlags.DOOR_CLOSED` vs. `CellFlags.DOOR_OPEN`:
       - Closed doors act as collision blockers (`isBlockedType() === true`).
       - Clicking a closed door within interaction reach (distance $\le 1.4$) toggles it open, immediately removing collision, updating CSS styling, and reconnecting adjacent graph edges.
  2. **Dynamic A* Graph Invalidation & Route Re-evaluation**:
     - When a door state transitions, invoke local passability updates:
       `doorCell.determineNeighboursPassable(globalMapObject)` and notify immediate neighbors.
     - Enable A* pathfinder to optionally consider closed doors as traverse-with-interaction steps: player can click beyond a closed door, the pathfinder routes through it, and the agent auto-opens doors upon arrival.
  3. **Destructible Barricades & Woodcutting Integration**:
     - Wooden barricades and cracked stone walls support degradation counters (e.g., 3 chops with axe).
     - Integrated with the player's interaction distance checks from Phase 7.
  4. **Interior Fixtures (Containers / Chests / Beds)**:
     - Interactive anchor points with custom hover and click inspection dialogs.

---

### Phase 4: Multi-Layer Interior Occlusion & Dynamic Roof Cutaway
* **Motivation**:
  When structures possess roofs or upper canopies, the player cannot see interior layouts from the outside. However, upon walking inside, the roof must seamlessly fade away so the interior floor plan and objects are clear.
* **Architecture Solution**:
  1. **Dual-Layer Virtual SVG Renderer**:
     - Extend [grid.js](file:///c:/Workspace/HTML%20Workspace/Browser-Sandbox/grid.js) virtual pool to manage a secondary `<g id="roof_layer">` positioned above the entity layer.
  2. **Structure Bounding Volume Hierarchy (BVH)**:
     - Register every spawned structure in a spatial index with its rectangular or polygonal bounds:
       `StructureRegistry.getStructureAt(x, y)`.
  3. **Proximity & Interior Detection**:
     - Whenever the player's visual or grid coordinate enters a structure's bounds or interior tile (`CellFlags.STRUCTURE_FLOOR` or `CellFlags.STRUCTURE_ROOF`):
       - Trigger a smooth opacity fade on that specific building's roof group (`opacity: 1.0` $\to$ `0.1` or `0.0`).
       - As the player leaves the perimeter, smoothly restore the roof group opacity (`0.0` $\to$ `1.0`).
  4. **Interior Ambient Lighting / Vignette**:
     - Apply an interior atmospheric filter or subtle vignette when inside buildings to create visual contrast between indoor sanctuaries and the outdoor wilderness.

---

## Technical Specifications & Class Contracts

```
+-------------------------------------------------------------+
|                  StructureBlueprint.js                      |
|  - id: string, name: string                                 |
|  - width: number, height: number, origin: {x, y}            |
|  - layers: { floor, walls, fixtures, roof }                 |
|  - rotate(degrees), flipHorizontal(), flipVertical()        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   StructureStamper.js                       |
|  - canPlace(mapObject, blueprint, originX, originY): bool   |
|  - stamp(mapObject, blueprint, originX, originY): Structure |
|  - clearFootprint(mapObject, bounds)                        |
|  - updateLocalPassability(mapObject, bounds)                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                WorldStructurePlacer.js                      |
|  - generateSettlement(mapObject, seed)                      |
|  - generateDungeonBSP(bounds, minRoomSize)                  |
|  - connectWithTrails(mapObject, fromDoor, toDoor)           |
+-------------------------------------------------------------+
```
