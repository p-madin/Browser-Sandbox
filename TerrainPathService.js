/**
 * TerrainPathService.js (Roadmap 8 - Phase 6)
 * Generates continuous, organic vector <path> geometry for terrain landmarks (rivers, lakes, chasms, cliffs, mountains, ramps)
 * using 2D Separable Gaussian Scalar Field Blurring, Marching Squares Iso-Contour Extraction, and Quadratic Bezier Spline Fitting.
 */

class TerrainPathService {
    constructor(map, cellSize = 20) {
        this.map = map;
        this.cellSize = cellSize;
        this.pad = 2;
        this.minX = map ? map.min_width : -100;
        this.minY = map ? map.min_height : -100;
        this.rawW = map ? (map.max_width - map.min_width) : 200;
        this.rawH = map ? (map.max_height - map.min_height) : 200;
        this.W = this.rawW + this.pad * 2;
        this.H = this.rawH + this.pad * 2;
        this.originX = (this.minX - this.pad) * cellSize;
        this.originY = (this.minY - this.pad) * cellSize;
        this.pathElements = {};
        this.container = null;
        this.lastTf = null;
        this.sunAzimuth = 315;
        this.lastReliefLoops = null;
        this.shadowContainer = null;
        this.cachedStructureCells = null;
        this.cachedTreeCells = null;
    }

    createScalarField(predicate) {
        const field = new Float32Array(this.W * this.H);
        if (!this.map || !this.map.map_cells) return field;
        const mapCells = this.map.map_cells;

        for (let x = this.minX; x < this.map.max_width; x++) {
            const col = mapCells[x];
            if (!col) continue;
            const gx = (x - this.minX) + this.pad;
            for (let y = this.minY; y < this.map.max_height; y++) {
                const cell = col[y];
                if (!cell) continue;
                if (predicate(cell)) {
                    const gy = (y - this.minY) + this.pad;
                    field[gy * this.W + gx] = 1.0;
                }
            }
        }
        return field;
    }

    gaussianBlur(src, sigma = 0.85) {
        let w0 = 0.38774, w1 = 0.24477, w2 = 0.06136;

        if (Array.isArray(sigma)) {
            // Direct custom weight array [w0, w1, w2]
            w0 = sigma[0];
            w1 = sigma[1] || 0;
            w2 = sigma[2] || 0;
        } else if (typeof sigma === 'string') {
            switch (sigma.toLowerCase()) {
                case 'grid':
                case 'sharp':
                    w0 = 1.0; w1 = 0; w2 = 0; break;
                case 'crisp':
                    w0 = 0.84; w1 = 0.08; w2 = 0; break;
                case 'tight':
                    w0 = 0.70; w1 = 0.15; w2 = 0; break;
                case 'smooth':
                case 'liquid':
                default:
                    w0 = 0.38774; w1 = 0.24477; w2 = 0.06136; break;
            }
        } else if (typeof sigma === 'number') {
            if (sigma <= 0.05) {
                w0 = 1.0; w1 = 0; w2 = 0;
            } else if (Math.abs(sigma - 0.85) >= 0.01) {
                const s2 = 2 * sigma * sigma;
                const g0 = 1.0;
                const g1 = Math.exp(-1 / s2);
                const g2 = (sigma >= 0.6) ? Math.exp(-4 / s2) : 0;
                const sum = g0 + 2 * g1 + 2 * g2;
                w0 = g0 / sum;
                w1 = g1 / sum;
                w2 = g2 / sum;
            }
        }

        // If sharp / no blur, return clone immediately
        if (w0 >= 0.999 && w1 === 0 && w2 === 0) {
            return new Float32Array(src);
        }

        const temp = new Float32Array(this.W * this.H);
        const dst = new Float32Array(this.W * this.H);
        const W = this.W, H = this.H;

        // Horizontal pass
        for (let y = 0; y < H; y++) {
            const row = y * W;
            for (let x = 0; x < W; x++) {
                const xm2 = Math.max(0, x - 2), xm1 = Math.max(0, x - 1);
                const xp1 = Math.min(W - 1, x + 1), xp2 = Math.min(W - 1, x + 2);
                temp[row + x] = src[row + x] * w0 + (src[row + xm1] + src[row + xp1]) * w1 + (w2 > 0 ? (src[row + xm2] + src[row + xp2]) * w2 : 0);
            }
        }

        // Vertical pass
        for (let x = 0; x < W; x++) {
            for (let y = 0; y < H; y++) {
                const ym2 = Math.max(0, y - 2), ym1 = Math.max(0, y - 1);
                const yp1 = Math.min(H - 1, y + 1), yp2 = Math.min(H - 1, y + 2);
                dst[y * W + x] = temp[y * W + x] * w0 + (temp[ym1 * W + x] + temp[yp1 * W + x]) * w1 + (w2 > 0 ? (temp[ym2 * W + x] + temp[yp2 * W + x]) * w2 : 0);
            }
        }
        return dst;
    }

    extractPath(field, tau = 0.35, jitter = 0, returnLoops = false) {
        const W = this.W, H = this.H;
        const cellSize = this.cellSize;
        const originX = this.originX;
        const originY = this.originY;

        const H_EDGE = (x, y) => (y * (W + 2) + x) * 2;
        const V_EDGE = (x, y) => (y * (W + 2) + x) * 2 + 1;

        const getHPoint = (x, y, v0, v1) => {
            const t = (tau - v0) / (v1 - v0);
            return [originX + (x + t + 0.5) * cellSize, originY + (y + 0.5) * cellSize];
        };
        const getVPoint = (x, y, v0, v1) => {
            const t = (tau - v0) / (v1 - v0);
            return [originX + (x + 0.5) * cellSize, originY + (y + t + 0.5) * cellSize];
        };

        const segments = new Map();

        for (let y = 0; y < H - 1; y++) {
            for (let x = 0; x < W - 1; x++) {
                const v0 = field[y * W + x];
                const v1 = field[y * W + (x + 1)];
                const v2 = field[(y + 1) * W + (x + 1)];
                const v3 = field[(y + 1) * W + x];

                const c0 = v0 >= tau ? 8 : 0;
                const c1 = v1 >= tau ? 4 : 0;
                const c2 = v2 >= tau ? 2 : 0;
                const c3 = v3 >= tau ? 1 : 0;
                const code = c0 | c1 | c2 | c3;
                if (code === 0 || code === 15) continue;

                const topEdge = H_EDGE(x, y);
                const rightEdge = V_EDGE(x + 1, y);
                const bottomEdge = H_EDGE(x, y + 1);
                const leftEdge = V_EDGE(x, y);

                const ptTop = () => getHPoint(x, y, v0, v1);
                const ptRight = () => getVPoint(x + 1, y, v1, v2);
                const ptBottom = () => getHPoint(x, y + 1, v3, v2);
                const ptLeft = () => getVPoint(x, y, v0, v3);

                const addSeg = (inId, outId, ptA, ptB) => {
                    segments.set(inId, { outId, ptA, ptB });
                };

                switch (code) {
                    case 1: addSeg(bottomEdge, leftEdge, ptBottom(), ptLeft()); break;
                    case 2: addSeg(rightEdge, bottomEdge, ptRight(), ptBottom()); break;
                    case 3: addSeg(rightEdge, leftEdge, ptRight(), ptLeft()); break;
                    case 4: addSeg(topEdge, rightEdge, ptTop(), ptRight()); break;
                    case 5:
                        if ((v0 + v1 + v2 + v3) * 0.25 >= tau) {
                            addSeg(topEdge, leftEdge, ptTop(), ptLeft());
                            addSeg(bottomEdge, rightEdge, ptBottom(), ptRight());
                        } else {
                            addSeg(topEdge, rightEdge, ptTop(), ptRight());
                            addSeg(bottomEdge, leftEdge, ptBottom(), ptLeft());
                        }
                        break;
                    case 6: addSeg(topEdge, bottomEdge, ptTop(), ptBottom()); break;
                    case 7: addSeg(topEdge, leftEdge, ptTop(), ptLeft()); break;
                    case 8: addSeg(leftEdge, topEdge, ptLeft(), ptTop()); break;
                    case 9: addSeg(bottomEdge, topEdge, ptBottom(), ptTop()); break;
                    case 10:
                        if ((v0 + v1 + v2 + v3) * 0.25 >= tau) {
                            addSeg(leftEdge, topEdge, ptLeft(), ptTop());
                            addSeg(rightEdge, bottomEdge, ptRight(), ptBottom());
                        } else {
                            addSeg(leftEdge, bottomEdge, ptLeft(), ptBottom());
                            addSeg(rightEdge, topEdge, ptRight(), ptTop());
                        }
                        break;
                    case 11: addSeg(rightEdge, topEdge, ptRight(), ptTop()); break;
                    case 12: addSeg(leftEdge, rightEdge, ptLeft(), ptRight()); break;
                    case 13: addSeg(bottomEdge, rightEdge, ptBottom(), ptRight()); break;
                    case 14: addSeg(leftEdge, bottomEdge, ptLeft(), ptBottom()); break;
                }
            }
        }

        const loops = [];
        const visitedEdges = new Set();

        for (const [startInId, startSeg] of segments.entries()) {
            if (visitedEdges.has(startInId)) continue;

            const loop = [];
            let currId = startInId;
            let currSeg = startSeg;
            let guard = 0;

            while (currSeg && guard < 50000) {
                guard++;
                visitedEdges.add(currId);
                loop.push(currSeg.ptA);
                const nextId = currSeg.outId;
                if (nextId === startInId || visitedEdges.has(nextId)) {
                    break;
                }
                currId = nextId;
                currSeg = segments.get(nextId);
            }

            if (loop.length >= 3) {
                loops.push(loop);
            }
        }

        // Quadratic Bezier smoothing
        let pathD = "";
        for (const loop of loops) {
            if (loop.length < 3) continue;
            const n = loop.length;
            const mid = (p1, p2) => [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5];
            const m0 = mid(loop[n - 1], loop[0]);
            pathD += `M ${m0[0].toFixed(1)} ${m0[1].toFixed(1)}`;
            for (let i = 0; i < n; i++) {
                let curr = loop[i];
                if (jitter > 0) {
                    const jx = (Math.sin(curr[0] * 12.9898 + curr[1] * 78.233) * 43758.5453) % 1;
                    const jy = (Math.cos(curr[0] * 39.346 + curr[1] * 11.135) * 43758.5453) % 1;
                    curr = [curr[0] + jx * jitter, curr[1] + jy * jitter];
                }
                const next = loop[(i + 1) % n];
                const m = mid(curr, next);
                pathD += ` Q ${curr[0].toFixed(1)} ${curr[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
            }
            pathD += " Z ";
        }

        if (returnLoops) {
            return { pathD, loops };
        }
        return pathD;
    }

    generateScatterPath(loops, type) {
        if (!loops || loops.length === 0) return "";
        const det = this.generateEnhancedScatter(
            type === 'water' ? loops : null,
            null,
            type === 'grass' ? loops : null,
            type === 'cliff' ? loops : null
        );
        if (type === 'water') return det.scatter_pebbles + det.scatter_foam;
        if (type === 'grass') return det.scatter_clovers + det.scatter_flowers;
        if (type === 'cliff') return det.scatter_scree;
        return "";
    }

    generateEnhancedScatter(waterLoops, sandLoops, grassLoops, cliffLoops) {
        let dPebbles = "";
        let dFoam = "";
        let dClovers = "";
        let dFlowers = "";
        let dScree = "";

        function makePebble(px, py, rx, ry, ang) {
            let s = "";
            const cosA = Math.cos(ang), sinA = Math.sin(ang);
            for (let k = 0; k < 6; k++) {
                const theta = k * 1.0472;
                const rFactor = (k % 2 === 0 ? 1.0 : 0.88);
                const lx = Math.cos(theta) * rx * rFactor;
                const ly = Math.sin(theta) * ry * rFactor;
                const gx = px + lx * cosA - ly * sinA;
                const gy = py + lx * sinA + ly * cosA;
                s += `${k === 0 ? 'M' : 'L'} ${gx.toFixed(1)} ${gy.toFixed(1)} `;
            }
            return s + "Z ";
        }

        function makeFoam(fx, fy, r) {
            return `M ${(fx - r).toFixed(1)} ${fy.toFixed(1)} ` +
                `Q ${(fx - r * 0.7).toFixed(1)} ${(fy - r * 0.7).toFixed(1)} ${fx.toFixed(1)} ${(fy - r).toFixed(1)} ` +
                `Q ${(fx + r * 0.7).toFixed(1)} ${(fy - r * 0.7).toFixed(1)} ${(fx + r).toFixed(1)} ${fy.toFixed(1)} ` +
                `Q ${(fx + r * 0.7).toFixed(1)} ${(fy + r * 0.7).toFixed(1)} ${fx.toFixed(1)} ${(fy + r).toFixed(1)} ` +
                `Q ${(fx - r * 0.7).toFixed(1)} ${(fy + r * 0.7).toFixed(1)} ${(fx - r).toFixed(1)} ${fy.toFixed(1)} Z `;
        }

        function makeClover(cx, cy, scale, rot) {
            let s = "";
            for (let k = 0; k < 3; k++) {
                const angle = rot + k * 2.0944;
                const dist = scale * 2.4;
                const lx = cx + Math.cos(angle) * dist;
                const ly = cy + Math.sin(angle) * dist;
                const r = scale * 2.0;
                s += `M ${(lx - r).toFixed(1)} ${ly.toFixed(1)} ` +
                    `Q ${(lx - r).toFixed(1)} ${(ly - r).toFixed(1)} ${lx.toFixed(1)} ${(ly - r).toFixed(1)} ` +
                    `Q ${(lx + r).toFixed(1)} ${(ly - r).toFixed(1)} ${(lx + r).toFixed(1)} ${ly.toFixed(1)} ` +
                    `Q ${(lx + r).toFixed(1)} ${(ly + r).toFixed(1)} ${lx.toFixed(1)} ${(ly + r).toFixed(1)} ` +
                    `Q ${(lx - r).toFixed(1)} ${(ly + r).toFixed(1)} ${(lx - r).toFixed(1)} ${ly.toFixed(1)} Z `;
            }
            return s;
        }

        function makeFlower(fx, fy, r) {
            const p1 = `${fx.toFixed(1)} ${(fy - r).toFixed(1)}`;
            const p2 = `${(fx + r).toFixed(1)} ${fy.toFixed(1)}`;
            const p3 = `${fx.toFixed(1)} ${(fy + r).toFixed(1)}`;
            const p4 = `${(fx - r).toFixed(1)} ${fy.toFixed(1)}`;
            const c1 = `${(fx + r * 0.35).toFixed(1)} ${(fy - r * 0.35).toFixed(1)}`;
            const c2 = `${(fx + r * 0.35).toFixed(1)} ${(fy + r * 0.35).toFixed(1)}`;
            const c3 = `${(fx - r * 0.35).toFixed(1)} ${(fy + r * 0.35).toFixed(1)}`;
            const c4 = `${(fx - r * 0.35).toFixed(1)} ${(fy - r * 0.35).toFixed(1)}`;
            return `M ${p1} Q ${c1} ${p2} Q ${c2} ${p3} Q ${c3} ${p4} Q ${c4} ${p1} Z `;
        }

        function makeScree(sx, sy, r, rot) {
            const a1 = rot;
            const a2 = rot + 1.85 + (r % 0.4);
            const a3 = rot + 4.15 - (r % 0.3);
            const p1 = [(sx + Math.cos(a1) * r).toFixed(1), (sy + Math.sin(a1) * r).toFixed(1)];
            const p2 = [(sx + Math.cos(a2) * (r * 0.72)).toFixed(1), (sy + Math.sin(a2) * (r * 0.72)).toFixed(1)];
            const p3 = [(sx + Math.cos(a3) * (r * 1.15)).toFixed(1), (sy + Math.sin(a3) * (r * 1.15)).toFixed(1)];
            return `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} Z `;
        }

        // 1. Water Shoreline & Sand Banks (Pebbles & Foam)
        if (waterLoops) {
            for (const loop of waterLoops) {
                if (loop.length < 4) continue;
                for (let i = 0; i < loop.length; i += 6) {
                    const curr = loop[i];
                    const next = loop[(i + 1) % loop.length];
                    const dx = next[0] - curr[0], dy = next[1] - curr[1];
                    const len = Math.hypot(dx, dy);
                    if (len < 0.5) continue;
                    const nx = -dy / len, ny = dx / len;
                    const tx = dx / len, ty = dy / len;
                    const seed = (Math.abs(Math.sin(curr[0] * 19.17 + curr[1] * 47.31)) * 43758.5453) % 1;

                    if (seed < 0.75) {
                        const dist = 3.0 + seed * 6.0;
                        const cx = curr[0] + nx * dist;
                        const cy = curr[1] + ny * dist;
                        const ang = Math.atan2(dy, dx) + (seed - 0.5) * 0.5;
                        dPebbles += makePebble(cx, cy, 3.6 + seed * 2.4, 2.4 + seed * 1.6, ang);
                        if (seed > 0.30) {
                            dPebbles += makePebble(cx + tx * 5.5 + nx * 2.0, cy + ty * 5.5 + ny * 2.0, 2.6 + seed * 1.6, 1.8 + seed * 1.2, ang + 0.8);
                        }
                        if (seed > 0.55) {
                            dPebbles += makePebble(cx - tx * 5.0 - nx * 1.8, cy - ty * 5.0 - ny * 1.8, 2.0 + seed * 1.2, 1.5 + seed * 0.8, ang - 0.6);
                        }
                    }

                    const foamSeed = (Math.abs(Math.sin(curr[0] * 31.73 + curr[1] * 13.91)) * 43758.5453) % 1;
                    if (foamSeed < 0.70) {
                        const fx = curr[0] - nx * (0.5 + foamSeed * 2.0);
                        const fy = curr[1] - ny * (0.5 + foamSeed * 2.0);
                        dFoam += makeFoam(fx, fy, 2.5 + foamSeed * 1.8);
                        if (foamSeed > 0.35) {
                            dFoam += makeFoam(fx + tx * 4.5, fy + ty * 4.5, 1.5 + foamSeed * 1.0);
                        }
                    }
                }
            }
        }

        // 2. Sand bank pebbles (additional river stones scattered across beaches)
        if (sandLoops) {
            for (const loop of sandLoops) {
                if (loop.length < 4) continue;
                for (let i = 0; i < loop.length; i += 9) {
                    const curr = loop[i];
                    const next = loop[(i + 1) % loop.length];
                    const dx = next[0] - curr[0], dy = next[1] - curr[1];
                    const len = Math.hypot(dx, dy);
                    if (len < 0.5) continue;
                    const nx = -dy / len, ny = dx / len;
                    const tx = dx / len, ty = dy / len;
                    const seed = (Math.abs(Math.sin(curr[0] * 23.41 + curr[1] * 89.13)) * 43758.5453) % 1;
                    if (seed < 0.60) {
                        const cx = curr[0] + nx * (seed * 8 - 4);
                        const cy = curr[1] + ny * (seed * 8 - 4);
                        const ang = seed * 3.14;
                        dPebbles += makePebble(cx, cy, 3.2 + seed * 2.0, 2.2 + seed * 1.4, ang);
                        if (seed > 0.40) {
                            dPebbles += makePebble(cx + tx * 5.0, cy + ty * 5.0, 2.2 + seed * 1.2, 1.6 + seed * 0.8, ang + 0.7);
                        }
                    }
                }
            }
        }

        // 3. Grass / Meadow Margins (Clovers & Wildflowers)
        if (grassLoops) {
            for (const loop of grassLoops) {
                if (loop.length < 4) continue;
                for (let i = 0; i < loop.length; i += 7) {
                    const curr = loop[i];
                    const next = loop[(i + 1) % loop.length];
                    const dx = next[0] - curr[0], dy = next[1] - curr[1];
                    const len = Math.hypot(dx, dy);
                    if (len < 0.5) continue;
                    const nx = -dy / len, ny = dx / len;
                    const seed = (Math.abs(Math.sin(curr[0] * 13.37 + curr[1] * 71.19)) * 43758.5453) % 1;

                    if (seed < 0.72) {
                        const cx = curr[0] + nx * (seed * 10 - 5);
                        const cy = curr[1] + ny * (seed * 10 - 5);
                        const rot = seed * 6.28;
                        dClovers += makeClover(cx, cy, 1.2 + seed * 0.6, rot);
                    }

                    const flowerSeed = (Math.abs(Math.sin(curr[0] * 57.89 + curr[1] * 29.43)) * 43758.5453) % 1;
                    if (flowerSeed < 0.50) {
                        const fx = curr[0] + nx * (flowerSeed * 8 - 4);
                        const fy = curr[1] + ny * (flowerSeed * 8 - 4);
                        dFlowers += makeFlower(fx, fy, 2.6 + flowerSeed * 1.6);
                    }
                }
            }
        }

        // 4. Cliff / Mountain Scree
        if (cliffLoops) {
            for (const loop of cliffLoops) {
                if (loop.length < 4) continue;
                for (let i = 0; i < loop.length; i += 6) {
                    const curr = loop[i];
                    const next = loop[(i + 1) % loop.length];
                    const dx = next[0] - curr[0], dy = next[1] - curr[1];
                    const len = Math.hypot(dx, dy);
                    if (len < 0.5) continue;
                    const nx = -dy / len, ny = dx / len;
                    const seed = (Math.abs(Math.sin(curr[0] * 41.53 + curr[1] * 67.21)) * 43758.5453) % 1;

                    if (seed < 0.75) {
                        const cx = curr[0] + nx * (seed * 8 - 4);
                        const cy = curr[1] + ny * (seed * 8 - 4);
                        const rot = seed * 6.28;
                        dScree += makeScree(cx, cy, 3.8 + seed * 2.8, rot);
                        if (seed > 0.35) {
                            dScree += makeScree(cx + nx * 3.5, cy + ny * 3.5, 2.4 + seed * 1.6, rot + 1.2);
                        }
                    }
                }
            }
        }

        return {
            scatter_pebbles: dPebbles,
            scatter_foam: dFoam,
            scatter_clovers: dClovers,
            scatter_flowers: dFlowers,
            scatter_scree: dScree
        };
    }

    /**
     * Phase 3: Directional Topographic Shaded Relief (Sunlit Ridges & Cast Shadows)
     * Compares loop segment normal vectors to sun azimuth angle to generate 2.5D relief strokes.
     * @param {number} sunAngleDeg 
     * @param {Object} loopsObj 
     * @returns {{relief_sunlit: string, relief_shadow: string}}
     */
    generateReliefPaths(sunAngleDeg = this.sunAzimuth, loopsObj = this.lastReliefLoops) {
        if (!loopsObj) return { relief_sunlit: "", relief_shadow: "" };

        const rad = sunAngleDeg * Math.PI / 180;
        const sunX = -Math.cos(rad);
        const sunY = -Math.sin(rad);

        let dSunlit = "";
        let dShadow = "";

        const traceNormalEdges = (loops, isChasm = false) => {
            if (!loops) return;
            for (const loop of loops) {
                if (loop.length < 3) continue;
                for (let i = 0; i < loop.length; i++) {
                    const p1 = loop[i];
                    const p2 = loop[(i + 1) % loop.length];
                    const dx = p2[0] - p1[0];
                    const dy = p2[1] - p1[1];
                    const len = Math.hypot(dx, dy);
                    if (len < 0.5) continue;

                    let nx = -dy / len;
                    let ny = dx / len;
                    if (isChasm) {
                        nx = -nx;
                        ny = -ny;
                    }

                    const dot = nx * sunX + ny * sunY;

                    if (dot > 0.22) {
                        dSunlit += `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
                    } else if (dot < -0.22) {
                        const ox = nx * 1.5;
                        const oy = ny * 1.5;
                        dShadow += `M ${(p1[0] + ox).toFixed(1)} ${(p1[1] + oy).toFixed(1)} L ${(p2[0] + ox).toFixed(1)} ${(p2[1] + oy).toFixed(1)} `;
                    }
                }
            }
        };

        traceNormalEdges(loopsObj.elev2);
        traceNormalEdges(loopsObj.elev3);
        traceNormalEdges(loopsObj.cliff);
        traceNormalEdges(loopsObj.chasm, true);

        return { relief_sunlit: dSunlit, relief_shadow: dShadow };
    }

    /**
     * Phase 3 Iteration: Directional Structure Shadows (Houses, Walls, Watermills, Piers)
     * Projects extruded shadow polygons down-sun onto surrounding terrain and cobblestone paths.
     * @param {number} sunAngleDeg 
     * @param {Array<Object>} cells 
     * @returns {string} SVG path 'd' string
     */
    generateStructureShadows(sunAngleDeg = this.sunAzimuth, cells = this.cachedStructureCells) {
        if (!cells || cells.length === 0) return "";

        const rad = sunAngleDeg * Math.PI / 180;
        const sx = -Math.sin(rad);
        const sy = Math.cos(rad);
        const cellSize = this.cellSize;
        const baseH = 12;
        const towerH = 22;
        const fixtureH = 7;

        let d = "";
        for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            const H = c.isTower ? towerH : (c.isFixture ? fixtureH : baseH);
            const dx = sx * H;
            const dy = sy * H;

            const x0 = c.x * cellSize;
            const y0 = c.y * cellSize;
            const x1 = x0 + cellSize;
            const y1 = y0 + cellSize;

            const px0 = x0 + dx, py0 = y0 + dy;
            const px1 = x1 + dx, py1 = y0 + dy;
            const px2 = x1 + dx, py2 = y1 + dy;
            const px3 = x0 + dx, py3 = y1 + dy;

            if (dx >= 0 && dy >= 0) {
                d += `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y0.toFixed(1)} L ${px1.toFixed(1)} ${py1.toFixed(1)} L ${px2.toFixed(1)} ${py2.toFixed(1)} L ${px3.toFixed(1)} ${py3.toFixed(1)} L ${x0.toFixed(1)} ${y1.toFixed(1)} Z `;
            } else if (dx <= 0 && dy >= 0) {
                d += `M ${x1.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} L ${px2.toFixed(1)} ${py2.toFixed(1)} L ${px3.toFixed(1)} ${py3.toFixed(1)} L ${px0.toFixed(1)} ${py0.toFixed(1)} L ${x0.toFixed(1)} ${y0.toFixed(1)} Z `;
            } else if (dx <= 0 && dy <= 0) {
                d += `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x0.toFixed(1)} ${y1.toFixed(1)} L ${px3.toFixed(1)} ${py3.toFixed(1)} L ${px0.toFixed(1)} ${py0.toFixed(1)} L ${px1.toFixed(1)} ${py1.toFixed(1)} L ${x1.toFixed(1)} ${y0.toFixed(1)} Z `;
            } else {
                d += `M ${x0.toFixed(1)} ${y1.toFixed(1)} L ${x0.toFixed(1)} ${y0.toFixed(1)} L ${px0.toFixed(1)} ${py0.toFixed(1)} L ${px1.toFixed(1)} ${py1.toFixed(1)} L ${px2.toFixed(1)} ${py2.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} Z `;
            }
        }
        return d;
    }

    /**
     * Phase 3 Iteration: Sharp Directional Tree & Flora Shadows
     * Projects crisp tangent capsule shadows down-sun onto surrounding terrain and cobblestone paths.
     * @param {number} sunAngleDeg 
     * @param {Array<Object>} trees 
     * @returns {string} SVG path 'd' string
     */
    generateTreeShadows(sunAngleDeg = this.sunAzimuth, trees = this.cachedTreeCells) {
        if (!trees || trees.length === 0) return "";

        const rad = sunAngleDeg * Math.PI / 180;
        const sx = -Math.sin(rad);
        const sy = Math.cos(rad);
        const cellSize = this.cellSize;
        const L = 12; // projection length
        const R = 7.5; // canopy radius
        const rTrunk = 2.0;

        // Tangent perpendicular vector
        const vx = -sy;
        const vy = sx;

        let d = "";
        for (let i = 0; i < trees.length; i++) {
            const t = trees[i];
            const cx = t.x * cellSize + cellSize * 0.5;
            const cy = t.y * cellSize + cellSize * 0.5;

            const hx = cx + sx * L;
            const hy = cy + sy * L;

            const b1x = cx - vx * rTrunk, b1y = cy - vy * rTrunk;
            const b2x = cx + vx * rTrunk, b2y = cy + vy * rTrunk;

            const t1x = hx - vx * R, t1y = hy - vy * R;
            const t2x = hx + vx * R, t2y = hy + vy * R;

            d += `M ${b1x.toFixed(1)} ${b1y.toFixed(1)} L ${t1x.toFixed(1)} ${t1y.toFixed(1)} A ${R} ${R} 0 0 1 ${t2x.toFixed(1)} ${t2y.toFixed(1)} L ${b2x.toFixed(1)} ${b2y.toFixed(1)} Z `;
        }
        return d;
    }

    /**
     * Phase 3: Macro-Shoreline Compound Waves & Reticle Animation Decoupling
     * Detects continuous closed polylines representing land-water shoreline boundaries and offsets
     * slightly into water bodies to generate a unified compound SVG wave path.
     * @param {Float32Array|Object} [bWaterOrMap] 
     * @returns {string} SVG path 'd' string
     */
    generateShorelineWavePath(bWaterOrMap = this.map) {
        let bWater;
        if (bWaterOrMap instanceof Float32Array) {
            bWater = bWaterOrMap;
        } else {
            const targetMap = bWaterOrMap || this.map;
            const CellFlagsRef = (typeof CellFlags !== 'undefined') ? CellFlags : (typeof require !== 'undefined' ? require('./cell.js').CellFlags : {});
            const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;
            const fWater = this.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
            bWater = this.gaussianBlur(fWater);
        }
        // Option A: Extract shoreline wave contour with uniform 1.5px water margin off the shore boundary (tau = 0.545, jitter = 0.35)
        return this.extractPath(bWater, 0.75, 0.05);
    }

    generateAllPathData() {
        const CellFlagsRef = (typeof CellFlags !== 'undefined') ? CellFlags : (typeof require !== 'undefined' ? require('./cell.js').CellFlags : {});
        const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

        // 1. Grass (Dual-Threshold: Core tau=0.50, Fringe tau=0.25)
        const fGrass = this.createScalarField(c => (c.flags & (CellFlagsRef.GRASS | CellFlagsRef.TREE | CellFlagsRef.TERRAIN_FLORA)) !== 0 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const bGrass = this.gaussianBlur(fGrass);
        const resGrassCore = this.extractPath(bGrass, 0.50, 0, true);
        const resGrassFringe = this.extractPath(bGrass, 0.25, 0, true);

        // 1b. Sand (Dual-Threshold: Core tau=0.50, Fringe tau=0.25)
        const fSand = this.createScalarField(c => (c.flags & CellFlagsRef.TERRAIN_SAND) !== 0 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const bSand = this.gaussianBlur(fSand);
        const resSandCore = this.extractPath(bSand, 0.50, 0, true);
        const resSandFringe = this.extractPath(bSand, 0.25, 0, true);

        // 2. Elev2 (Plateaus)
        const fElev2 = this.createScalarField(c => c.elevation >= 2 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const resElev2 = this.extractPath(this.gaussianBlur(fElev2), 0.35, 0, true);

        // 3. Elev3 (Peaks)
        const fElev3 = this.createScalarField(c => c.elevation >= 3 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const resElev3 = this.extractPath(this.gaussianBlur(fElev3), 0.35, 0, true);

        // 4. Chasm (Tectonic fracture jitter)
        const fChasm = this.createScalarField(c => (c.flags & CellFlagsRef.CHASM) !== 0 && !hasStrictBuilding(c));
        const resChasm = this.extractPath(this.gaussianBlur(fChasm), 0.35, 1.2, true);

        // 5. Cliff (Dual-Threshold: Core tau=0.50, Fringe tau=0.25)
        const fCliff = this.createScalarField(c => (c.flags & CellFlagsRef.TERRAIN_CLIFF) !== 0 && (c.flags & CellFlagsRef.CHASM) === 0 && !hasStrictBuilding(c));
        const bCliff = this.gaussianBlur(fCliff);
        const resCliffCore = this.extractPath(bCliff, 0.50, 0.8, true);
        const resCliffFringe = this.extractPath(bCliff, 0.25, 0.8, true);

        // 6. Water (Dual-Threshold: Core tau=0.50, Fringe tau=0.25)
        const fWater = this.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
        const bWater = this.gaussianBlur(fWater);
        const resWaterCore = this.extractPath(bWater, 0.50, 0, true);
        const resWaterFringe = this.extractPath(bWater, 0.25, 0, true);
        const dShorelineWaves = this.generateShorelineWavePath(bWater);

        // 6b. Shallow Water (Fords)
        const fShallow = this.createScalarField(c => (c.flags & CellFlagsRef.WATER_SHALLOW) !== 0 && !hasStrictBuilding(c));
        const dShallow = this.extractPath(this.gaussianBlur(fShallow, 'sharp'), 0.35);

        // 7. Ramp
        const fRamp = this.createScalarField(c => (c.flags & CellFlagsRef.TERRAIN_RAMP) !== 0 && !hasStrictBuilding(c));
        const dRamp = this.extractPath(this.gaussianBlur(fRamp, 'sharp'), 0.30);

        // 8. Enhanced Boundary Detritus Scatter
        const detritus = this.generateEnhancedScatter(
            resWaterFringe.loops,
            resSandFringe.loops,
            resGrassFringe.loops,
            resCliffFringe.loops
        );

        // 9. Directional Shaded Relief (Sunlit Ridges & Cast Shadows)
        this.lastReliefLoops = {
            elev2: resElev2.loops,
            elev3: resElev3.loops,
            cliff: resCliffCore.loops,
            chasm: resChasm.loops
        };
        const relief = this.generateReliefPaths(this.sunAzimuth, this.lastReliefLoops);

        // 10. Directional Object Shadows (Structures & Trees)
        const structureCells = [];
        const treeCells = [];
        if (this.map && this.map.map_cells) {
            for (let x = this.minX; x < this.map.max_width; x++) {
                const col = this.map.map_cells[x];
                if (!col) continue;
                for (let y = this.minY; y < this.map.max_height; y++) {
                    const c = col[y];
                    if (!c) continue;
                    const flags = c.flags;
                    if ((flags & (CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_ROOF | CellFlagsRef.STRUCTURE_FIXTURE | CellFlagsRef.STRUCTURE_BARRICADE)) !== 0) {
                        const isTower = (c.elevation >= 2) || (c.structureId && c.structureId.includes("watchtower"));
                        const isFixture = (flags & (CellFlagsRef.STRUCTURE_FIXTURE | CellFlagsRef.STRUCTURE_BARRICADE)) !== 0 && (flags & (CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_ROOF)) === 0;
                        structureCells.push({ x, y, isTower, isFixture });
                    }
                    if ((flags & CellFlagsRef.TREE) !== 0 && (flags & CellFlagsRef.TERRAIN_FLORA) === 0 && !hasStrictBuilding(c)) {
                        treeCells.push({ x, y });
                    }
                }
            }
        }
        this.cachedStructureCells = structureCells;
        this.cachedTreeCells = treeCells;

        const dStructShadows = this.generateStructureShadows(this.sunAzimuth, structureCells);
        const dTreeShadows = this.generateTreeShadows(this.sunAzimuth, treeCells);

        return {
            grass_fringe: resGrassFringe.pathD,
            grass: resGrassCore.pathD,
            sand_fringe: resSandFringe.pathD,
            sand: resSandCore.pathD,
            elev2: resElev2.pathD,
            elev3: resElev3.pathD,
            cliff_fringe: resCliffFringe.pathD,
            cliff: resCliffCore.pathD,
            chasm: resChasm.pathD,
            water_fringe: resWaterFringe.pathD,
            water: resWaterCore.pathD,
            water_shallow: dShallow,
            shoreline_waves: dShorelineWaves,
            ramp: dRamp,
            scatter_pebbles: detritus.scatter_pebbles,
            scatter_foam: detritus.scatter_foam,
            scatter_clovers: detritus.scatter_clovers,
            scatter_flowers: detritus.scatter_flowers,
            scatter_scree: detritus.scatter_scree,
            scatter_water: detritus.scatter_pebbles,
            scatter_grass: detritus.scatter_clovers,
            scatter_cliff: detritus.scatter_scree,
            relief_shadow: relief.relief_shadow,
            relief_sunlit: relief.relief_sunlit,
            structure_shadows: dStructShadows,
            tree_shadows: dTreeShadows
        };
    }

    mountTerrainLayers(gridObject) {
        if (!gridObject || !gridObject.world_viewport) return;
        this.grid = gridObject;

        const createSvg = (typeof create_svg_element === 'function')
            ? create_svg_element
            : (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag);

        this.container = createSvg("g");
        this.container.setAttribute("id", "world_terrain_paths");
        this.container.style.pointerEvents = "none";

        this.rampContainer = gridObject.ramp_layer || createSvg("g");
        if (!gridObject.ramp_layer) {
            this.rampContainer.setAttribute("id", "world_ramp_paths");
            this.rampContainer.style.pointerEvents = "none";
        }

        this.scatterContainer = gridObject.scatter_layer || createSvg("g");
        if (!gridObject.scatter_layer) {
            this.scatterContainer.setAttribute("id", "scatter_layer");
            this.scatterContainer.style.pointerEvents = "none";
        }

        const pathDefs = [
            { id: "path_grass_fringe", cls: "terrain_contour contour_fringe contour_grass_fringe", key: "grass_fringe" },
            { id: "path_grass", cls: "terrain_contour contour_grass", key: "grass" },
            { id: "path_sand_fringe", cls: "terrain_contour contour_fringe contour_sand_fringe", key: "sand_fringe" },
            { id: "path_sand", cls: "terrain_contour contour_sand", key: "sand" },
            { id: "path_elev2", cls: "terrain_contour contour_elev_2", key: "elev2" },
            { id: "path_elev3", cls: "terrain_contour contour_elev_3", key: "elev3" },
            { id: "path_cliff_fringe", cls: "terrain_contour contour_fringe contour_cliff_fringe", key: "cliff_fringe" },
            { id: "path_cliff", cls: "terrain_contour contour_cliff", key: "cliff" },
            { id: "path_chasm", cls: "terrain_contour contour_chasm", key: "chasm" },
            { id: "path_water_fringe", cls: "terrain_contour contour_fringe contour_water_fringe", key: "water_fringe" },
            { id: "path_water", cls: "terrain_contour contour_water", key: "water" },
            { id: "path_water_shallow", cls: "terrain_contour contour_water_shallow", key: "water_shallow" },
            { id: "path_relief_shadow", cls: "terrain_relief relief_shadow", key: "relief_shadow" },
            { id: "path_relief_sunlit", cls: "terrain_relief relief_sunlit", key: "relief_sunlit" }
        ];

        const scatterDefs = [
            { id: "path_scatter_pebbles", cls: "terrain_scatter scatter_pebbles", key: "scatter_pebbles" },
            { id: "path_scatter_foam", cls: "terrain_scatter scatter_foam", key: "scatter_foam" },
            { id: "path_scatter_clovers", cls: "terrain_scatter scatter_clovers", key: "scatter_clovers" },
            { id: "path_scatter_flowers", cls: "terrain_scatter scatter_flowers", key: "scatter_flowers" },
            { id: "path_scatter_scree", cls: "terrain_scatter scatter_scree", key: "scatter_scree" }
        ];

        const pathData = this.generateAllPathData();

        for (const def of pathDefs) {
            const p = createSvg("path");
            p.setAttribute("id", def.id);
            p.setAttribute("class", def.cls);
            const d = pathData[def.key] || "";
            p.setAttribute("d", d);
            p.style.display = d.length > 0 ? "block" : "none";
            this.container.appendChild(p);
            this.pathElements[def.key] = p;
        }

        // Mount ramp path into dedicated rampContainer (Layer 2c, above reticles_layer)
        const pRamp = createSvg("path");
        pRamp.setAttribute("id", "path_ramp");
        pRamp.setAttribute("class", "terrain_contour contour_ramp");
        const dRamp = pathData.ramp || "";
        pRamp.setAttribute("d", dRamp);
        pRamp.style.display = dRamp.length > 0 ? "block" : "none";
        this.rampContainer.appendChild(pRamp);
        this.pathElements["ramp"] = pRamp;

        // Mount scatter paths into dedicated scatterContainer (Layer 2d, above reticles & ramps)
        for (const sdef of scatterDefs) {
            const p = createSvg("path");
            p.setAttribute("id", sdef.id);
            p.setAttribute("class", sdef.cls);
            const d = pathData[sdef.key] || "";
            p.setAttribute("d", d);
            p.style.display = d.length > 0 ? "block" : "none";
            this.scatterContainer.appendChild(p);
            this.pathElements[sdef.key] = p;
        }

        // Mount directional object shadow container (Layer 2e, between bridges_layer and structures_layer)
        this.shadowContainer = gridObject.shadow_layer || createSvg("g");
        if (!gridObject.shadow_layer) {
            this.shadowContainer.setAttribute("id", "world_shadow_paths");
            this.shadowContainer.style.pointerEvents = "none";
        }

        const pStructureShadow = createSvg("path");
        pStructureShadow.setAttribute("id", "path_structure_shadows");
        pStructureShadow.setAttribute("class", "terrain_shadow structure_shadow");
        const dStruct = pathData.structure_shadows || "";
        pStructureShadow.setAttribute("d", dStruct);
        pStructureShadow.style.display = dStruct.length > 0 ? "block" : "none";
        this.shadowContainer.appendChild(pStructureShadow);
        this.pathElements["structure_shadows"] = pStructureShadow;

        const pTreeShadow = createSvg("path");
        pTreeShadow.setAttribute("id", "path_tree_shadows");
        pTreeShadow.setAttribute("class", "terrain_shadow tree_shadow");
        const dTree = pathData.tree_shadows || "";
        pTreeShadow.setAttribute("d", dTree);
        pTreeShadow.style.display = dTree.length > 0 ? "block" : "none";
        this.shadowContainer.appendChild(pTreeShadow);
        this.pathElements["tree_shadows"] = pTreeShadow;

        // Phase 3 (Roadmap 10): Mount continuous macro-shoreline wave container (in layer_interactive_tiles above reticles)
        this.waveContainer = gridObject.wave_layer || createSvg("g");
        if (!gridObject.wave_layer) {
            this.waveContainer.setAttribute("id", "world_wave_paths");
            this.waveContainer.style.pointerEvents = "none";
        }

        const pWave = createSvg("path");
        pWave.setAttribute("id", "path_shoreline_waves");
        pWave.setAttribute("class", "terrain_wave macro_shoreline_wave");
        const dWave = pathData.shoreline_waves || "";
        pWave.setAttribute("d", dWave);
        pWave.style.display = dWave.length > 0 ? "block" : "none";
        this.waveContainer.appendChild(pWave);
        this.pathElements["shoreline_waves"] = pWave;

        // Compositor Layer Decomposition (Roadmap 10 Phase 2 & 3):
        // Mount terrain fills, ramps, and scatter into layer_static_terrain (beneath tiles/reticles)
        // Mount shoreline wave container into layer_interactive_tiles (above reticles, beneath player effects)
        // Mount directional shadows into layer_shadows (in front of reticles, beneath structures)
        if (gridObject.layer_static_terrain) {
            gridObject.layer_static_terrain.appendChild(this.container);
            gridObject.layer_static_terrain.appendChild(this.rampContainer);
            gridObject.layer_static_terrain.appendChild(this.scatterContainer);
            if (gridObject.layer_interactive_tiles) {
                if (gridObject.player_effects_layer && gridObject.player_effects_layer.parentNode === gridObject.layer_interactive_tiles) {
                    gridObject.layer_interactive_tiles.insertBefore(this.waveContainer, gridObject.player_effects_layer);
                } else {
                    gridObject.layer_interactive_tiles.appendChild(this.waveContainer);
                }
            } else {
                gridObject.layer_static_terrain.appendChild(this.waveContainer);
            }
            if (gridObject.layer_shadows) {
                gridObject.layer_shadows.appendChild(this.shadowContainer);
            } else {
                gridObject.layer_static_terrain.appendChild(this.shadowContainer);
            }
        } else {
            // Legacy un-decomposed fallback
            if (gridObject.tiles_layer && gridObject.tiles_layer.parentNode === gridObject.world_viewport) {
                gridObject.world_viewport.insertBefore(this.container, gridObject.tiles_layer);
            } else {
                gridObject.world_viewport.appendChild(this.container);
            }

            if (this.rampContainer.parentNode !== gridObject.world_viewport) {
                if (gridObject.bridges_layer && gridObject.bridges_layer.parentNode === gridObject.world_viewport) {
                    gridObject.world_viewport.insertBefore(this.rampContainer, gridObject.bridges_layer);
                } else if (gridObject.reticles_layer && gridObject.reticles_layer.parentNode === gridObject.world_viewport) {
                    gridObject.reticles_layer.after(this.rampContainer);
                } else {
                    gridObject.world_viewport.appendChild(this.rampContainer);
                }
            }

            if (this.scatterContainer.parentNode !== gridObject.world_viewport) {
                if (gridObject.bridges_layer && gridObject.bridges_layer.parentNode === gridObject.world_viewport) {
                    gridObject.world_viewport.insertBefore(this.scatterContainer, gridObject.bridges_layer);
                } else {
                    gridObject.world_viewport.appendChild(this.scatterContainer);
                }
            }

            if (this.waveContainer.parentNode !== gridObject.world_viewport) {
                if (gridObject.reticles_layer && gridObject.reticles_layer.parentNode === gridObject.world_viewport) {
                    gridObject.reticles_layer.after(this.waveContainer);
                } else {
                    gridObject.world_viewport.appendChild(this.waveContainer);
                }
            }

            if (this.shadowContainer.parentNode !== gridObject.world_viewport) {
                if (gridObject.structures_layer && gridObject.structures_layer.parentNode === gridObject.world_viewport) {
                    gridObject.world_viewport.insertBefore(this.shadowContainer, gridObject.structures_layer);
                } else if (gridObject.features_layer && gridObject.features_layer.parentNode === gridObject.world_viewport) {
                    gridObject.world_viewport.insertBefore(this.shadowContainer, gridObject.features_layer);
                } else {
                    gridObject.world_viewport.appendChild(this.shadowContainer);
                }
            }
        }

        console.log("[TerrainPathService] Mounted 14 terrain paths, 1 ramp, 5 scatter paths, 1 continuous wave path, and 2 directional object shadow paths.");
    }

    updateViewport(gridObject, vector_horizontal, vector_vertical) {
        if (!this.container) return;
        const shiftX = vector_horizontal * this.cellSize;
        const shiftY = vector_vertical * this.cellSize;
        const tf = `translate(${shiftX.toFixed(1)}, ${shiftY.toFixed(1)})`;
        if (this.lastTf !== tf) {
            this.container.setAttribute("transform", tf);
            if (this.rampContainer) {
                this.rampContainer.setAttribute("transform", tf);
            }
            if (this.scatterContainer) {
                this.scatterContainer.setAttribute("transform", tf);
            }
            if (this.waveContainer) {
                this.waveContainer.setAttribute("transform", tf);
            }
            if (this.shadowContainer) {
                this.shadowContainer.setAttribute("transform", tf);
            }
            this.lastTf = tf;
        }
    }

    setSunAzimuth(deg) {
        this.sunAzimuth = deg;
        const rad = deg * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Gradient start (x1, y1) faces light (sunward), end (x2, y2) points down-sun into shadow
        const x1 = (50 - 50 * cos).toFixed(1) + "%";
        const y1 = (50 - 50 * sin).toFixed(1) + "%";
        const x2 = (50 + 50 * cos).toFixed(1) + "%";
        const y2 = (50 + 50 * sin).toFixed(1) + "%";

        const gradIds = ["grad_elev2_relief", "grad_elev3_relief", "grad_cliff_relief", "grad_chasm_depth"];
        if (typeof document !== 'undefined') {
            for (const gid of gradIds) {
                const el = document.getElementById(gid);
                if (el) {
                    el.setAttribute("x1", x1);
                    el.setAttribute("y1", y1);
                    el.setAttribute("x2", x2);
                    el.setAttribute("y2", y2);
                }
            }
        }

        // Recompute relief paths from cached boundary loops (no scalar re-extraction)
        if (this.lastReliefLoops) {
            const relief = this.generateReliefPaths(deg, this.lastReliefLoops);
            if (this.pathElements["relief_sunlit"]) {
                this.pathElements["relief_sunlit"].setAttribute("d", relief.relief_sunlit);
                this.pathElements["relief_sunlit"].style.display = relief.relief_sunlit.length > 0 ? "block" : "none";
            }
            if (this.pathElements["relief_shadow"]) {
                this.pathElements["relief_shadow"].setAttribute("d", relief.relief_shadow);
                this.pathElements["relief_shadow"].style.display = relief.relief_shadow.length > 0 ? "block" : "none";
            }
        }

        // Recompute directional structure & tree shadows
        if (this.cachedStructureCells) {
            const dStruct = this.generateStructureShadows(deg, this.cachedStructureCells);
            if (this.pathElements["structure_shadows"]) {
                this.pathElements["structure_shadows"].setAttribute("d", dStruct);
                this.pathElements["structure_shadows"].style.display = dStruct.length > 0 ? "block" : "none";
            }
        }
        if (this.cachedTreeCells) {
            const dTree = this.generateTreeShadows(deg, this.cachedTreeCells);
            if (this.pathElements["tree_shadows"]) {
                this.pathElements["tree_shadows"].setAttribute("d", dTree);
                this.pathElements["tree_shadows"].style.display = dTree.length > 0 ? "block" : "none";
            }
        }
    }

    rebuildTerrainPaths(map, gridObject) {
        if (map) this.map = map;
        const pathData = this.generateAllPathData();
        for (const [key, p] of Object.entries(this.pathElements)) {
            const d = pathData[key] || "";
            p.setAttribute("d", d);
            p.style.display = d.length > 0 ? "block" : "none";
        }
        console.log("[TerrainPathService] Rebuilt all 23 vector landmark, relief, ecotone, wave, and shadow paths.");
    }
}

if (typeof window !== 'undefined') {
    window.TerrainPathService = TerrainPathService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TerrainPathService };
}

