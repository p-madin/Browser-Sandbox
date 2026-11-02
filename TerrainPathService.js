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

    gaussianBlur(src) {
        const temp = new Float32Array(this.W * this.H);
        const dst = new Float32Array(this.W * this.H);
        const w0 = 0.38774, w1 = 0.24477, w2 = 0.06136;
        const W = this.W, H = this.H;

        // Horizontal pass
        for (let y = 0; y < H; y++) {
            const row = y * W;
            for (let x = 0; x < W; x++) {
                const xm2 = Math.max(0, x - 2), xm1 = Math.max(0, x - 1);
                const xp1 = Math.min(W - 1, x + 1), xp2 = Math.min(W - 1, x + 2);
                temp[row + x] = src[row + x] * w0 + (src[row + xm1] + src[row + xp1]) * w1 + (src[row + xm2] + src[row + xp2]) * w2;
            }
        }

        // Vertical pass
        for (let x = 0; x < W; x++) {
            for (let y = 0; y < H; y++) {
                const ym2 = Math.max(0, y - 2), ym1 = Math.max(0, y - 1);
                const yp1 = Math.min(H - 1, y + 1), yp2 = Math.min(H - 1, y + 2);
                dst[y * W + x] = temp[y * W + x] * w0 + (temp[ym1 * W + x] + temp[yp1 * W + x]) * w1 + (temp[ym2 * W + x] + temp[yp2 * W + x]) * w2;
            }
        }
        return dst;
    }

    extractPath(field, tau = 0.35, jitter = 0) {
        const W = this.W, H = this.H;
        const cellSize = this.cellSize;
        const originX = this.originX;
        const originY = this.originY;

        const H_EDGE = (x, y) => (y * (W + 2) + x) * 2;
        const V_EDGE = (x, y) => (y * (W + 2) + x) * 2 + 1;

        const getHPoint = (x, y, v0, v1) => {
            const t = (tau - v0) / (v1 - v0);
            return [ originX + (x + t + 0.5) * cellSize, originY + (y + 0.5) * cellSize ];
        };
        const getVPoint = (x, y, v0, v1) => {
            const t = (tau - v0) / (v1 - v0);
            return [ originX + (x + 0.5) * cellSize, originY + (y + t + 0.5) * cellSize ];
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
                    case 1:  addSeg(bottomEdge, leftEdge, ptBottom(), ptLeft()); break;
                    case 2:  addSeg(rightEdge, bottomEdge, ptRight(), ptBottom()); break;
                    case 3:  addSeg(rightEdge, leftEdge, ptRight(), ptLeft()); break;
                    case 4:  addSeg(topEdge, rightEdge, ptTop(), ptRight()); break;
                    case 5:
                        if ((v0 + v1 + v2 + v3) * 0.25 >= tau) {
                            addSeg(topEdge, leftEdge, ptTop(), ptLeft());
                            addSeg(bottomEdge, rightEdge, ptBottom(), ptRight());
                        } else {
                            addSeg(topEdge, rightEdge, ptTop(), ptRight());
                            addSeg(bottomEdge, leftEdge, ptBottom(), ptLeft());
                        }
                        break;
                    case 6:  addSeg(topEdge, bottomEdge, ptTop(), ptBottom()); break;
                    case 7:  addSeg(topEdge, leftEdge, ptTop(), ptLeft()); break;
                    case 8:  addSeg(leftEdge, topEdge, ptLeft(), ptTop()); break;
                    case 9:  addSeg(bottomEdge, topEdge, ptBottom(), ptTop()); break;
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
            const mid = (p1, p2) => [ (p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5 ];
            const m0 = mid(loop[n - 1], loop[0]);
            pathD += `M ${m0[0].toFixed(1)} ${m0[1].toFixed(1)}`;
            for (let i = 0; i < n; i++) {
                let curr = loop[i];
                if (jitter > 0) {
                    const jx = (Math.sin(curr[0] * 12.9898 + curr[1] * 78.233) * 43758.5453) % 1;
                    const jy = (Math.cos(curr[0] * 39.346 + curr[1] * 11.135) * 43758.5453) % 1;
                    curr = [ curr[0] + jx * jitter, curr[1] + jy * jitter ];
                }
                const next = loop[(i + 1) % n];
                const m = mid(curr, next);
                pathD += ` Q ${curr[0].toFixed(1)} ${curr[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
            }
            pathD += " Z ";
        }

        return pathD;
    }

    generateAllPathData() {
        const CellFlagsRef = (typeof CellFlags !== 'undefined') ? CellFlags : (typeof require !== 'undefined' ? require('./cell.js').CellFlags : {});
        const hasStrictBuilding = (c) => (c.flags & (CellFlagsRef.STRUCTURE_FLOOR | CellFlagsRef.STRUCTURE_WALL | CellFlagsRef.STRUCTURE_DOOR | CellFlagsRef.STRUCTURE_DOOR_CLOSED | CellFlagsRef.STRUCTURE_DOOR_OPEN | CellFlagsRef.STRUCTURE_BRIDGE | CellFlagsRef.STRUCTURE_BARRICADE | CellFlagsRef.STRUCTURE_PATH)) !== 0;

        // 1. Grass
        const fGrass = this.createScalarField(c => (c.flags & (CellFlagsRef.GRASS | CellFlagsRef.TREE | CellFlagsRef.TERRAIN_FLORA)) !== 0 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const dGrass = this.extractPath(this.gaussianBlur(fGrass), 0.35);

        // 2. Elev2 (Plateaus)
        const fElev2 = this.createScalarField(c => c.elevation >= 2 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const dElev2 = this.extractPath(this.gaussianBlur(fElev2), 0.35);

        // 3. Elev3 (Peaks)
        const fElev3 = this.createScalarField(c => c.elevation >= 3 && !hasStrictBuilding(c) && (c.flags & (CellFlagsRef.WATER | CellFlagsRef.CHASM | CellFlagsRef.TERRAIN_CLIFF | CellFlagsRef.TERRAIN_RAMP)) === 0);
        const dElev3 = this.extractPath(this.gaussianBlur(fElev3), 0.35);

        // 4. Chasm (Tectonic fracture jitter)
        const fChasm = this.createScalarField(c => (c.flags & CellFlagsRef.CHASM) !== 0 && !hasStrictBuilding(c));
        const dChasm = this.extractPath(this.gaussianBlur(fChasm), 0.35, 1.2);

        // 5. Cliff (Rocky escarpment jitter)
        const fCliff = this.createScalarField(c => (c.flags & CellFlagsRef.TERRAIN_CLIFF) !== 0 && (c.flags & CellFlagsRef.CHASM) === 0 && !hasStrictBuilding(c));
        const dCliff = this.extractPath(this.gaussianBlur(fCliff), 0.35, 0.8);

        // 6. Water (Deep river channels & lakes)
        const fWater = this.createScalarField(c => (c.flags & CellFlagsRef.WATER) !== 0 && !hasStrictBuilding(c));
        const dWater = this.extractPath(this.gaussianBlur(fWater), 0.35);

        // 6b. Shallow Water (Fords)
        const fShallow = this.createScalarField(c => (c.flags & CellFlagsRef.WATER_SHALLOW) !== 0 && !hasStrictBuilding(c));
        const dShallow = this.extractPath(this.gaussianBlur(fShallow), 0.35);

        // 7. Ramp
        const fRamp = this.createScalarField(c => (c.flags & CellFlagsRef.TERRAIN_RAMP) !== 0 && !hasStrictBuilding(c));
        const dRamp = this.extractPath(this.gaussianBlur(fRamp), 0.30);

        return {
            grass: dGrass,
            elev2: dElev2,
            elev3: dElev3,
            chasm: dChasm,
            cliff: dCliff,
            water: dWater,
            water_shallow: dShallow,
            ramp: dRamp
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

        const pathDefs = [
            { id: "path_grass", cls: "terrain_contour contour_grass", key: "grass" },
            { id: "path_elev2", cls: "terrain_contour contour_elev_2", key: "elev2" },
            { id: "path_elev3", cls: "terrain_contour contour_elev_3", key: "elev3" },
            { id: "path_chasm", cls: "terrain_contour contour_chasm", key: "chasm" },
            { id: "path_cliff", cls: "terrain_contour contour_cliff", key: "cliff" },
            { id: "path_water", cls: "terrain_contour contour_water", key: "water" },
            { id: "path_water_shallow", cls: "terrain_contour contour_water_shallow", key: "water_shallow" },
            { id: "path_ramp", cls: "terrain_contour contour_ramp", key: "ramp" }
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

        // Insert container right after background grid, before tiles_layer
        if (gridObject.tiles_layer && gridObject.tiles_layer.parentNode === gridObject.world_viewport) {
            gridObject.world_viewport.insertBefore(this.container, gridObject.tiles_layer);
        } else {
            gridObject.world_viewport.appendChild(this.container);
        }

        console.log("[TerrainPathService] Mounted 8 vector landmark paths into world viewport.");
    }

    updateViewport(gridObject, vector_horizontal, vector_vertical) {
        if (!this.container) return;
        const shiftX = vector_horizontal * this.cellSize;
        const shiftY = vector_vertical * this.cellSize;
        const tf = `translate(${shiftX.toFixed(1)}, ${shiftY.toFixed(1)})`;
        if (this.lastTf !== tf) {
            this.container.setAttribute("transform", tf);
            this.lastTf = tf;
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
        console.log("[TerrainPathService] Rebuilt all 8 vector landmark paths.");
    }
}

if (typeof window !== 'undefined') {
    window.TerrainPathService = TerrainPathService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TerrainPathService };
}

