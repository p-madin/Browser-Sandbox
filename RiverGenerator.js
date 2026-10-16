/**
 * River & Hydrology Generator (Phase 1)
 * Procedurally generates natural river courses, meandering tributaries, shallow fords, and lake basins.
 */

class RiverGenerator {
    static primaryRiverCourse = [];
    static lakeCenter = null;

    /**
     * Carves a continuous meandering river across the map.
     * @param {mapObject} map 
     * @param {{x: number, y: number}} start 
     * @param {{x: number, y: number}} end 
     * @param {Object} options 
     * @returns {Array<cell_meta>} list of modified water cells
     */
    static carveRiverCourse(map, start, end, options = {}) {
        const baseWidth = options.width || 2;
        const shallowFrequency = options.shallowFrequency || 0.12;
        const modifiedCells = [];

        let curX = start.x;
        let curY = start.y;
        const visitedKeys = new Set();

        const stepRiverAt = (cx, cy, isShallow = false) => {
            const halfW = Math.floor(baseWidth / 2);
            for (let ox = -halfW; ox <= halfW; ox++) {
                for (let oy = -halfW; oy <= halfW; oy++) {
                    const tx = cx + ox;
                    const ty = cy + oy;

                    // Bounds check
                    if (tx < map.min_width + 2 || tx > map.max_width - 3 || ty < map.min_height + 2 || ty > map.max_height - 3) {
                        continue;
                    }

                    // Keep player spawn clearing dry
                    if (Math.hypot(tx, ty) < 14) {
                        continue;
                    }

                    const cell = map.map_cells[tx] && map.map_cells[tx][ty];
                    if (!cell) continue;

                    // Do not overwrite buildings or paths
                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        continue;
                    }

                    // Macro-Geomorphic Invariant: Never carve water into mountain massifs
                    const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];
                    let touchesMountain = false;
                    for (const r of ridges) {
                        if (Math.hypot(tx - r.cx, ty - r.cy) < r.radius + 6) {
                            touchesMountain = true;
                            break;
                        }
                        const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                        for (const lb of lobesList) {
                            if (Math.hypot(tx - lb.cx, ty - lb.cy) < lb.radius + 6) {
                                touchesMountain = true;
                                break;
                            }
                        }
                        if (touchesMountain) break;
                    }
                    if (touchesMountain) continue;

                    // Macro-Geomorphic Invariant: Never carve water into chasms
                    if (cell.hasFlag(CellFlags.CHASM)) continue;

                    const key = `${tx},${ty}`;
                    if (visitedKeys.has(key)) continue;
                    visitedKeys.add(key);

                    // Clear natural terrestrial obstacles
                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.WATER);

                    if (isShallow) {
                        cell.addFlag(CellFlags.WATER_SHALLOW);
                    }

                    modifiedCells.push(cell);
                }
            }
        };

        // Trace course with directional momentum and smooth sinusoidal meander
        let steps = 0;
        const maxSteps = 450;

        while ((Math.hypot(end.x - curX, end.y - curY) > 2) && steps < maxSteps) {
            steps++;

            const targetAngle = Math.atan2(end.y - curY, end.x - curX);
            // Meander noise wave
            const riverRng1 = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            const meanderOffset = Math.sin(steps * 0.18) * 0.75 + (riverRng1 - 0.5) * 0.4;

            // Mountain massif avoidance deflection vector
            let deflectAngle = 0;
            const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];
            for (const r of ridges) {
                const dist = Math.hypot(curX - r.cx, curY - r.cy);
                const safeDist = r.radius + 9;
                if (dist < safeDist) {
                    const awayAngle = Math.atan2(curY - r.cy, curX - r.cx);
                    const force = (safeDist - dist) / safeDist;
                    deflectAngle += Math.sin(awayAngle - targetAngle) * force * 1.8;
                }
                const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                for (const lb of lobesList) {
                    const lDist = Math.hypot(curX - lb.cx, curY - lb.cy);
                    const lSafeDist = lb.radius + 9;
                    if (lDist < lSafeDist) {
                        const awayAngle = Math.atan2(curY - lb.cy, curX - lb.cx);
                        const force = (lSafeDist - lDist) / lSafeDist;
                        deflectAngle += Math.sin(awayAngle - targetAngle) * force * 1.8;
                    }
                }
            }

            // Spawn sanctuary avoidance deflection vector (keep r < 14 dry)
            const distSpawn = Math.hypot(curX, curY);
            if (distSpawn < 18) {
                const awaySpawn = Math.atan2(curY, curX);
                const force = (18 - distSpawn) / 18;
                deflectAngle += Math.sin(awaySpawn - targetAngle) * force * 2.2;
            }

            const currentAngle = targetAngle + meanderOffset + deflectAngle;

            curX += Math.round(Math.cos(currentAngle));
            curY += Math.round(Math.sin(currentAngle));

            // Occasionally create shallow wading fords
            const riverRng2 = (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();
            const isShallowFord = (riverRng2 < shallowFrequency) && (steps % 15 === 0);
            stepRiverAt(curX, curY, isShallowFord);
        }

        return modifiedCells;
    }

    /**
     * Carves an organic lake basin.
     * @param {mapObject} map 
     * @param {number} centerX 
     * @param {number} centerY 
     * @param {number} radius 
     * @returns {Array<cell_meta>}
     */
    static carveLakeBasin(map, centerX, centerY, radius = 6) {
        const modifiedCells = [];

        for (let x = centerX - radius - 1; x <= centerX + radius + 1; x++) {
            for (let y = centerY - radius - 1; y <= centerY + radius + 1; y++) {
                if (x < map.min_width + 2 || x > map.max_width - 3 || y < map.min_height + 2 || y > map.max_height - 3) {
                    continue;
                }
                if (Math.hypot(x, y) < 6) continue;

                const dist = Math.hypot(x - centerX, y - centerY);
                // Organic jitter at the lake shore
                const threshold = radius + (Math.sin(x * 1.5) * 0.8 + Math.cos(y * 1.5) * 0.8);

                if (dist <= threshold) {
                    const cell = map.map_cells[x] && map.map_cells[x][y];
                    if (!cell) continue;

                    if (cell.hasFlag(CellFlags.STRUCTURE_WALL) || cell.hasFlag(CellFlags.STRUCTURE_FLOOR) || cell.hasFlag(CellFlags.STRUCTURE_PATH)) {
                        continue;
                    }

                    // Macro-Geomorphic Invariant: Never carve lake into mountain massifs or chasms
                    const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];
                    let touchesMountain = false;
                    for (const r of ridges) {
                        if (Math.hypot(x - r.cx, y - r.cy) < r.radius + 6) {
                            touchesMountain = true;
                            break;
                        }
                    }
                    if (touchesMountain) continue;
                    if (cell.hasFlag(CellFlags.CHASM)) continue;

                    cell.removeFlag(CellFlags.TREE | CellFlags.BLOCKED);
                    cell.addFlag(CellFlags.WATER);

                    // Shallow water near the perimeter
                    if (dist > threshold - 1.4) {
                        cell.addFlag(CellFlags.WATER_SHALLOW);
                    }

                    modifiedCells.push(cell);
                }
            }
        }

        return modifiedCells;
    }

    /**
     * Generates a complete natural hydrological system across the world.
     * @param {mapObject} map 
     */
    static generateHydrology(map) {
        console.log("[RiverGenerator] Generating natural hydrology, rivers, and lakes...");
        const allModified = [];
        const rng = () => (map && typeof map.getRandom === 'function') ? map.getRandom() : Math.random();

        // Ensure mountain ridges are initialized for deflection and avoidance
        if (typeof ElevationService !== 'undefined' && (!ElevationService.mountainRidges || ElevationService.mountainRidges.length === 0)) {
            ElevationService.initializeRidges(map);
        }
        const ridges = (typeof ElevationService !== 'undefined' && ElevationService.mountainRidges) ? ElevationService.mountainRidges : [];

        // Helper to pick a random perimeter coordinate along one of 4 map borders:
        // 0 = North (y = -85), 1 = East (x = 85), 2 = South (y = 85), 3 = West (x = -85)
        const getBorderPoint = (borderSide) => {
            const span = -60 + Math.round(rng() * 120);
            switch (borderSide) {
                case 0: return { x: span, y: -85 };
                case 1: return { x: 85, y: span };
                case 2: return { x: span, y: 85 };
                case 3: return { x: -85, y: span };
                default: return { x: span, y: -85 };
            }
        };

        // Pick random start border and a different exit border (adjacent or opposite)
        const startBorder = Math.floor(rng() * 4);
        const endBorder = (startBorder + 1 + Math.floor(rng() * 3)) % 4;

        let startPoint = null;
        let endPoint = null;

        // Find valid start point outside mountain massif clearance
        for (let attempt = 0; attempt < 50; attempt++) {
            const pt = getBorderPoint(startBorder);
            let inMountain = false;
            for (const r of ridges) {
                if (Math.hypot(pt.x - r.cx, pt.y - r.cy) < r.radius + 9) inMountain = true;
                const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                for (const lb of lobesList) {
                    if (Math.hypot(pt.x - lb.cx, pt.y - lb.cy) < lb.radius + 9) inMountain = true;
                }
            }
            if (!inMountain) {
                startPoint = pt;
                break;
            }
        }
        if (!startPoint) startPoint = getBorderPoint(startBorder);

        // Find valid end point outside mountain massif clearance
        for (let attempt = 0; attempt < 50; attempt++) {
            const pt = getBorderPoint(endBorder);
            let inMountain = false;
            for (const r of ridges) {
                if (Math.hypot(pt.x - r.cx, pt.y - r.cy) < r.radius + 9) inMountain = true;
                const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                for (const lb of lobesList) {
                    if (Math.hypot(pt.x - lb.cx, pt.y - lb.cy) < lb.radius + 9) inMountain = true;
                }
            }
            if (!inMountain) {
                endPoint = pt;
                break;
            }
        }
        if (!endPoint) endPoint = getBorderPoint(endBorder);

        // Select an intermediate lowland waypoint so the river bends naturally across the world
        let midPoint = null;
        for (let attempt = 0; attempt < 80; attempt++) {
            const mx = Math.round((rng() - 0.5) * 110);
            const my = Math.round((rng() - 0.5) * 110);
            if (Math.hypot(mx, my) < 22) continue; // avoid spawn sanctuary
            let inMtn = false;
            for (const r of ridges) {
                if (Math.hypot(mx - r.cx, my - r.cy) < r.radius + 10) inMtn = true;
                const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                for (const lb of lobesList) {
                    if (Math.hypot(mx - lb.cx, my - lb.cy) < lb.radius + 10) inMtn = true;
                }
            }
            if (!inMtn) {
                midPoint = { x: mx, y: my };
                break;
            }
        }

        this.primaryRiverCourse = [];
        if (midPoint) {
            const riverSegment1 = this.carveRiverCourse(
                map,
                startPoint,
                midPoint,
                { width: 2, shallowFrequency: 0.12 }
            );
            allModified.push(...riverSegment1);

            const riverSegment2 = this.carveRiverCourse(
                map,
                midPoint,
                endPoint,
                { width: 2, shallowFrequency: 0.12 }
            );
            allModified.push(...riverSegment2);
            this.primaryRiverCourse = [...riverSegment1, ...riverSegment2].map(c => ({ x: c.my_x, y: c.my_y }));
        } else {
            const river1 = this.carveRiverCourse(
                map,
                startPoint,
                endPoint,
                { width: 2, shallowFrequency: 0.12 }
            );
            allModified.push(...river1);
            this.primaryRiverCourse = river1.map(c => ({ x: c.my_x, y: c.my_y }));
        }

        // 2. Lake Basin: Formed along the river meander in open lowlands outside spawn & mountains
        const candidateRiverPoints = this.primaryRiverCourse.filter(p => {
            if (Math.hypot(p.x, p.y) < 18) return false;
            if (Math.abs(p.x) > 70 || Math.abs(p.y) > 70) return false;
            for (const r of ridges) {
                if (Math.hypot(p.x - r.cx, p.y - r.cy) < r.radius + 12) return false;
                const lobesList = r.lobes || (r.lobe ? [r.lobe] : []);
                for (const lb of lobesList) {
                    if (Math.hypot(p.x - lb.cx, p.y - lb.cy) < lb.radius + 12) return false;
                }
            }
            return true;
        });

        let lakePt = null;
        if (candidateRiverPoints.length > 0) {
            lakePt = candidateRiverPoints[Math.floor(rng() * candidateRiverPoints.length)];
        } else if (this.primaryRiverCourse.length > 0) {
            lakePt = this.primaryRiverCourse[Math.floor(this.primaryRiverCourse.length * 0.5)];
        } else {
            lakePt = { x: 35, y: 30 };
        }

        const lakeR = 5 + Math.floor(rng() * 3);
        this.lakeCenter = { x: lakePt.x, y: lakePt.y, radius: lakeR };
        const lake1 = this.carveLakeBasin(map, lakePt.x, lakePt.y, lakeR);
        allModified.push(...lake1);

        // 3. Secondary Tributary: Joining from another perimeter side to primary river
        const tribBorder = (startBorder + 2) % 4;
        const tribStart = getBorderPoint(tribBorder);
        let tribTarget = endPoint;
        if (this.primaryRiverCourse.length > 10) {
            tribTarget = this.primaryRiverCourse[Math.floor(rng() * Math.floor(this.primaryRiverCourse.length * 0.7))];
        }

        const river2 = this.carveRiverCourse(
            map,
            tribStart,
            tribTarget,
            { width: 2, shallowFrequency: 0.08 }
        );
        allModified.push(...river2);

        // Synchronize local passability graph along river courses and shorelines
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

        console.log(`[RiverGenerator] Hydrology generation complete. Carved ${allModified.length} water cells.`);
        return allModified;
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.RiverGenerator = RiverGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RiverGenerator };
}
