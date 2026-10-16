/**
 * Canyon & Chasm Generator (Phase 4)
 * Carves jagged tectonic fissures, bottomless chasms, and stamps suspension rope bridges across gorges.
 */

class CanyonGenerator {
    static faultLines = [];

    /**
     * Carves a jagged tectonic fault line across the map.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} start 
     * @param {{x: number, y: number}} end 
     * @param {Object} options 
     * @returns {Array<cell_meta>} modified cells
     */
    static carveFaultLine(map, start, end, options = {}) {
        const width = options.width || 2;
        const modifiedCells = [];
        const chasmCells = [];
        const visitedKeys = new Set();

        let curX = start.x;
        let curY = start.y;
        let steps = 0;
        const maxSteps = 300;

        const bridgeInterval = options.bridgeInterval || 25;
        const bridgePositions = [];

        while ((Math.hypot(end.x - curX, end.y - curY) > 2) && steps < maxSteps) {
            steps++;

            const targetAngle = Math.atan2(end.y - curY, end.x - curX);
            // Jagged fracture displacement
            const canyonRng = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            const jaggedOffset = (canyonRng - 0.5) * 1.2 + Math.sin(steps * 0.35) * 0.5;
            const currentAngle = targetAngle + jaggedOffset;

            curX += Math.round(Math.cos(currentAngle));
            curY += Math.round(Math.sin(currentAngle));

            // Check if this step should host a suspension bridge
            const shouldPlaceBridge = (steps % bridgeInterval === 0);

            // Carve chasm cross-section
            const halfW = Math.floor(width / 2);
            for (let ox = -halfW; ox <= halfW; ox++) {
                for (let oy = -halfW; oy <= halfW; oy++) {
                    const tx = curX + ox;
                    const ty = curY + oy;

                    if (tx < map.min_width + 2 || tx > map.max_width - 3 || ty < map.min_height + 2 || ty > map.max_height - 3) {
                        continue;
                    }
                    if (Math.hypot(tx, ty) < 14) continue; // Keep player spawn sanctuary safe

                    const cell = map.map_cells[tx] && map.map_cells[tx][ty];
                    if (!cell) continue;

                    // Do not destroy existing buildings or bridges
                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_BRIDGE)) {
                        continue;
                    }

                    // Macro-Geomorphic Invariant 1: Never carve chasm into or within 8 tiles of water
                    if (cell.hasFlag(CellFlags.WATER) || cell.hasFlag(CellFlags.WATER_SHALLOW)) {
                        continue;
                    }
                    let nearWater = false;
                    for (let cdx = -8; cdx <= 8 && !nearWater; cdx++) {
                        for (let cdy = -8; cdy <= 8 && !nearWater; cdy++) {
                            if (cdx * cdx + cdy * cdy > 64) continue;
                            const nc = map.map_cells[tx + cdx] && map.map_cells[tx + cdx][ty + cdy];
                            if (nc && (nc.hasFlag(CellFlags.WATER) || nc.hasFlag(CellFlags.WATER_SHALLOW))) {
                                nearWater = true;
                            }
                        }
                    }
                    if (nearWater) continue;

                    // Macro-Geomorphic Invariant 2: Never carve chasm into or within 8 tiles of mountain massifs
                    if (cell.elevation >= 2) continue;
                    const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];
                    let nearMountain = false;
                    for (const r of ridges) {
                        if (Math.hypot(tx - r.cx, ty - r.cy) < r.radius + 8) {
                            nearMountain = true;
                            break;
                        }
                        const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                        for (const lb of lobesList) {
                            if (Math.hypot(tx - lb.cx, ty - lb.cy) < lb.radius + 8) {
                                nearMountain = true;
                                break;
                            }
                        }
                        if (nearMountain) break;
                    }
                    if (nearMountain) continue;

                    const key = `${tx},${ty}`;
                    if (visitedKeys.has(key)) continue;
                    visitedKeys.add(key);

                    // Central fissure is bottomless CHASM
                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.CHASM);
                    cell.elevation = 0;
                    chasmCells.push(cell);
                    modifiedCells.push(cell);

                    // Bordering cliff flanks
                    for (let cdx = -1; cdx <= 1; cdx++) {
                        for (let cdy = -1; cdy <= 1; cdy++) {
                            const fx = tx + cdx;
                            const fy = ty + cdy;
                            const fCell = map.map_cells[fx] && map.map_cells[fx][fy];
                            if (fCell && !fCell.hasFlag(CellFlags.CHASM) && !fCell.hasFlag(CellFlags.WATER) && !fCell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                                fCell.addFlag(CellFlags.TERRAIN_CLIFF);
                                modifiedCells.push(fCell);
                            }
                        }
                    }
                }
            }

            if (shouldPlaceBridge) {
                bridgePositions.push({ x: curX, y: curY });
            }
        }

        // Stamp suspension bridges over designated canyon crossing points
        for (const bp of bridgePositions) {
            this.stampSuspensionCrossing(map, bp, modifiedCells);
        }

        return modifiedCells;
    }

    /**
     * Stamps an adaptive, engineered suspension rope bridge across a canyon chasm coordinate.
     * Evaluates local chasm orientation, raycasts until solid cliff edges are hit on both shores,
     * anchors cliff-top abutments, lays an unbroken deck, and flanks with safety guide rails.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} center 
     * @param {Array<cell_meta>} modifiedCells 
     * @returns {Object|null}
     */
    static stampSuspensionCrossing(map, center, modifiedCells) {
        // Find nearest central chasm cell around center
        let seedCell = map.map_cells[center.x] && map.map_cells[center.x][center.y];
        if (!seedCell || !seedCell.hasFlag(CellFlags.CHASM)) {
            let found = null;
            for (let r = 1; r <= 3 && !found; r++) {
                for (let dx = -r; dx <= r && !found; dx++) {
                    for (let dy = -r; dy <= r && !found; dy++) {
                        const c = map.map_cells[center.x + dx] && map.map_cells[center.x + dx][center.y + dy];
                        if (c && c.hasFlag(CellFlags.CHASM)) {
                            found = c;
                        }
                    }
                }
            }
            if (found) seedCell = found;
        }

        if (!seedCell) return null;
        const sx = seedCell.my_x;
        const sy = seedCell.my_y;

        // Determine dominant chasm direction: check whether chasm extends more horizontally or vertically
        let chasmH = 0, chasmV = 0;
        for (let d = -4; d <= 4; d++) {
            const hCell = map.map_cells[sx + d] && map.map_cells[sx + d][sy];
            if (hCell && hCell.hasFlag(CellFlags.CHASM)) chasmH++;

            const vCell = map.map_cells[sx] && map.map_cells[sx][sy + d];
            if (vCell && vCell.hasFlag(CellFlags.CHASM)) chasmV++;
        }

        // If chasm runs horizontally (East-West), bridge crosses Vertically (North-South, crossAxis = "V")
        // If chasm runs vertically (North-South), bridge crosses Horizontally (East-West, crossAxis = "H")
        const crossAxis = (chasmH >= chasmV) ? "V" : "H";

        const deckCells = [];
        const railCells = [];
        const abutmentCells = [];

        if (crossAxis === "H") {
            // Raycast West to find solid cliff edge Shore A
            let westX = sx;
            while (westX > map.min_width + 1) {
                const c = map.map_cells[westX] && map.map_cells[westX][sy];
                if (!c || (!c.hasFlag(CellFlags.CHASM) && !c.hasFlag(CellFlags.WATER))) break;
                westX--;
            }

            // Raycast East to find solid cliff edge Shore B
            let eastX = sx;
            while (eastX < map.max_width - 2) {
                const c = map.map_cells[eastX] && map.map_cells[eastX][sy];
                if (!c || (!c.hasFlag(CellFlags.CHASM) && !c.hasFlag(CellFlags.WATER))) break;
                eastX++;
            }

            const shoreA = map.map_cells[westX] && map.map_cells[westX][sy];
            const shoreB = map.map_cells[eastX] && map.map_cells[eastX][sy];
            if (!shoreA || !shoreB) return null;

            const spanLen = eastX - westX;
            if (spanLen < 2 || spanLen > 12) return null;

            const bridgeElev = shoreA.elevation || shoreB.elevation || 1;

            // Anchor abutments on solid ground
            shoreA.addFlag(CellFlags.STRUCTURE_PATH);
            shoreA.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM);
            shoreA.elevation = bridgeElev;
            abutmentCells.push(shoreA);
            modifiedCells.push(shoreA);

            shoreB.addFlag(CellFlags.STRUCTURE_PATH);
            shoreB.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM);
            shoreB.elevation = bridgeElev;
            abutmentCells.push(shoreB);
            modifiedCells.push(shoreB);

            // Lay continuous bridge deck from westX + 1 to eastX - 1
            for (let x = westX + 1; x <= eastX - 1; x++) {
                const cell = map.map_cells[x] && map.map_cells[x][sy];
                if (!cell) continue;

                cell.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                cell.removeFlag(CellFlags.CHASM | CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF);
                cell.elevation = bridgeElev;
                deckCells.push(cell);
                modifiedCells.push(cell);

                // Flank guide rails North and South
                for (const dy of [-1, 1]) {
                    const rail = map.map_cells[x] && map.map_cells[x][sy + dy];
                    if (rail && rail.hasFlag(CellFlags.CHASM) && !rail.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        rail.addFlag(CellFlags.STRUCTURE_WALL);
                        railCells.push(rail);
                        modifiedCells.push(rail);
                    }
                }
            }
        } else {
            // crossAxis === "V": Raycast North to find solid cliff edge Shore A
            let northY = sy;
            while (northY > map.min_height + 1) {
                const c = map.map_cells[sx] && map.map_cells[sx][northY];
                if (!c || (!c.hasFlag(CellFlags.CHASM) && !c.hasFlag(CellFlags.WATER))) break;
                northY--;
            }

            // Raycast South to find solid cliff edge Shore B
            let southY = sy;
            while (southY < map.max_height - 2) {
                const c = map.map_cells[sx] && map.map_cells[sx][southY];
                if (!c || (!c.hasFlag(CellFlags.CHASM) && !c.hasFlag(CellFlags.WATER))) break;
                southY++;
            }

            const shoreA = map.map_cells[sx] && map.map_cells[sx][northY];
            const shoreB = map.map_cells[sx] && map.map_cells[sx][southY];
            if (!shoreA || !shoreB) return null;

            const spanLen = southY - northY;
            if (spanLen < 2 || spanLen > 12) return null;

            const bridgeElev = shoreA.elevation || shoreB.elevation || 1;

            // Anchor abutments on solid ground
            shoreA.addFlag(CellFlags.STRUCTURE_PATH);
            shoreA.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM);
            shoreA.elevation = bridgeElev;
            abutmentCells.push(shoreA);
            modifiedCells.push(shoreA);

            shoreB.addFlag(CellFlags.STRUCTURE_PATH);
            shoreB.removeFlag(CellFlags.TREE | CellFlags.BLOCKED | CellFlags.TERRAIN_CLIFF | CellFlags.CHASM);
            shoreB.elevation = bridgeElev;
            abutmentCells.push(shoreB);
            modifiedCells.push(shoreB);

            // Lay continuous bridge deck from northY + 1 to southY - 1
            for (let y = northY + 1; y <= southY - 1; y++) {
                const cell = map.map_cells[sx] && map.map_cells[sx][y];
                if (!cell) continue;

                cell.addFlag(CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH);
                cell.removeFlag(CellFlags.CHASM | CellFlags.BLOCKED | CellFlags.TREE | CellFlags.TERRAIN_CLIFF);
                cell.elevation = bridgeElev;
                deckCells.push(cell);
                modifiedCells.push(cell);

                // Flank guide rails West and East
                for (const dx of [-1, 1]) {
                    const rail = map.map_cells[sx + dx] && map.map_cells[sx + dx][y];
                    if (rail && rail.hasFlag(CellFlags.CHASM) && !rail.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        rail.addFlag(CellFlags.STRUCTURE_WALL);
                        railCells.push(rail);
                        modifiedCells.push(rail);
                    }
                }
            }
        }

        return {
            crossAxis,
            deckCells,
            railCells,
            abutmentCells,
            spanLength: deckCells.length
        };
    }

    /**
     * Generates world canyon system with dramatic fissures and suspension bridge crossings.
     * @param {mapObject} map 
     * @returns {Array<cell_meta>}
     */
    /**
     * Finds a candidate tectonic fault line in open lowlands far from water, mountains, and spawn.
     * @param {mapObject} map 
     * @param {Array<Object>} existingFaults
     * @returns {{start: {x: number, y: number}, end: {x: number, y: number}}|null}
     */
    static findRandomFaultLine(map, existingFaults = []) {
        const rng = () => (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
        const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];

        for (let attempt = 0; attempt < 150; attempt++) {
            const sx = Math.round((rng() - 0.5) * 140);
            const sy = Math.round((rng() - 0.5) * 140);

            // Must be at least 22 tiles away from player spawn
            if (Math.hypot(sx, sy) < 22) continue;

            const cell = map.map_cells[sx] && map.map_cells[sx][sy];
            if (!cell) continue;

            if (cell.elevation > 1 || cell.hasFlag(CellFlags.WATER) || cell.hasFlag(CellFlags.CHASM)) continue;

            // Clearance check: at least 10 tiles away from water, chasms, and mountains
            let inClearance = false;
            for (let dx = -10; dx <= 10 && !inClearance; dx += 2) {
                for (let dy = -10; dy <= 10 && !inClearance; dy += 2) {
                    if (dx * dx + dy * dy > 100) continue;
                    const nc = map.map_cells[sx + dx] && map.map_cells[sx + dx][sy + dy];
                    if (!nc) continue;
                    if (nc.hasFlag(CellFlags.WATER) || nc.hasFlag(CellFlags.WATER_SHALLOW) || nc.hasFlag(CellFlags.CHASM) || nc.elevation >= 2) {
                        inClearance = true;
                    }
                }
            }
            if (inClearance) continue;

            // Check distance from existing fault lines
            let tooCloseToOther = false;
            for (const f of existingFaults) {
                if (Math.hypot(sx - f.start.x, sy - f.start.y) < 25) {
                    tooCloseToOther = true;
                    break;
                }
            }
            if (tooCloseToOther) continue;

            // Test candidate trajectories and choose one that stays in open lowlands
            let bestEnd = null;
            for (let aAttempt = 0; aAttempt < 10; aAttempt++) {
                const angle = rng() * Math.PI * 2;
                const length = 24 + Math.floor(rng() * 24); // 24 to 48 tiles
                let blocked = false;

                for (let step = 3; step <= length; step += 3) {
                    const cx = Math.round(sx + Math.cos(angle) * step);
                    const cy = Math.round(sy + Math.sin(angle) * step);
                    if (cx < map.min_width + 6 || cx >= map.max_width - 6 || cy < map.min_height + 6 || cy >= map.max_height - 6) {
                        blocked = true;
                        break;
                    }
                    if (Math.hypot(cx, cy) < 18) { blocked = true; break; }
                    const c = map.map_cells[cx] && map.map_cells[cx][cy];
                    if (!c || c.elevation >= 2 || c.hasFlag(CellFlags.WATER) || c.hasFlag(CellFlags.WATER_SHALLOW) || c.hasFlag(CellFlags.CHASM)) {
                        blocked = true;
                        break;
                    }
                }
                if (!blocked) {
                    const ex = Math.max(map.min_width + 6, Math.min(map.max_width - 7, Math.round(sx + Math.cos(angle) * length)));
                    const ey = Math.max(map.min_height + 6, Math.min(map.max_height - 7, Math.round(sy + Math.sin(angle) * length)));
                    bestEnd = { x: ex, y: ey };
                    break;
                }
            }

            if (bestEnd) {
                return { start: { x: sx, y: sy }, end: bestEnd };
            }
        }
        return null;
    }

    /**
     * Generates world canyon system with dramatic fissures and suspension bridge crossings.
     * @param {mapObject} map 
     * @returns {Array<cell_meta>}
     */
    static generateCanyons(map) {
        console.log("[CanyonGenerator] Carving rugged tectonic chasms and suspension crossings...");
        const allModified = [];
        const rng = () => (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();

        this.faultLines = [];
        const numCanyons = 2;

        for (let i = 0; i < numCanyons; i++) {
            const fault = this.findRandomFaultLine(map, this.faultLines);
            if (fault) {
                this.faultLines.push(fault);
                const carved = this.carveFaultLine(
                    map,
                    fault.start,
                    fault.end,
                    { width: 2, bridgeInterval: 20 }
                );
                allModified.push(...carved);
            }
        }

        // If random search could not find 2 faults due to water/mountain density, place a perimeter fallback
        if (this.faultLines.length === 0) {
            const fallback = { start: { x: 80, y: -20 }, end: { x: 80, y: 20 } };
            this.faultLines.push(fallback);
            const carved = this.carveFaultLine(map, fallback.start, fallback.end, { width: 2, bridgeInterval: 20 });
            allModified.push(...carved);
        }

        // Synchronize local passability graph along all chasm edges and suspension bridges
        for (const cell of allModified) {
            cell.decorateCell([]);
            cell.determineNeighboursPassable(map);
            for (const n of cell.my_neighbours) {
                if (n) {
                    n.decorateCell([]);
                    n.determineNeighboursPassable(map);
                }
            }
        }

        console.log(`[CanyonGenerator] Canyon generation complete. Carved ${allModified.length} geological cells across ${this.faultLines.length} chasms.`);
        return allModified;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.CanyonGenerator = CanyonGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CanyonGenerator };
}
