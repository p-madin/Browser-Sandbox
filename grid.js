const RETICLE_SYMBOLS = [
    null,
    "#symbol_reticle_edge",     // 1: N
    "#symbol_reticle_edge",     // 2: E
    "#symbol_reticle_corner",   // 3: N+E
    "#symbol_reticle_edge",     // 4: S
    "#symbol_reticle_parallel", // 5: N+S
    "#symbol_reticle_corner",   // 6: E+S
    "#symbol_reticle_u",        // 7: N+E+S (open W)
    "#symbol_reticle_edge",     // 8: W
    "#symbol_reticle_corner",   // 9: W+N
    "#symbol_reticle_parallel", // 10: E+W
    "#symbol_reticle_u",        // 11: W+N+E (open S)
    "#symbol_reticle_corner",   // 12: S+W
    "#symbol_reticle_u",        // 13: S+W+N (open E)
    "#symbol_reticle_u",        // 14: E+S+W (open N)
    "#symbol_reticle_island"    // 15: all 4
];

// Phase 4: Hydrological Water Reticle Symbols (with animated tidal wave crests)
const RETICLE_WATER_SYMBOLS = [
    null,
    "#symbol_reticle_edge_water",     // 1: N
    "#symbol_reticle_edge_water",     // 2: E
    "#symbol_reticle_corner_water",   // 3: N+E
    "#symbol_reticle_edge_water",     // 4: S
    "#symbol_reticle_parallel_water", // 5: N+S
    "#symbol_reticle_corner_water",   // 6: E+S
    "#symbol_reticle_u_water",        // 7: N+E+S (open W)
    "#symbol_reticle_edge_water",     // 8: W
    "#symbol_reticle_corner_water",   // 9: W+N
    "#symbol_reticle_parallel_water", // 10: E+W
    "#symbol_reticle_u_water",        // 11: W+N+E (open S)
    "#symbol_reticle_corner_water",   // 12: S+W
    "#symbol_reticle_u_water",        // 13: S+W+N (open E)
    "#symbol_reticle_u_water",        // 14: E+S+W (open N)
    "#symbol_reticle_island_water"    // 15: all 4
];

const RETICLE_ANGLES = [
    0, 0, 90, 0,
    180, 0, 90, 90,
    270, 270, 90, 0,
    180, 270, 180, 0
];

const RETICLE_CLASSES = [
    null,
    "cell_reticle reticle_sand",
    "cell_reticle reticle_water",
    "cell_reticle reticle_water_shallow",
    "cell_reticle reticle_grass",
    "cell_reticle reticle_cliff",
    "cell_reticle reticle_chasm",
    "cell_reticle reticle_mountain_tier1",
    "cell_reticle reticle_mountain_tier2"
];

class frame_meta {
    frame_element;
    tiles_layer;
    chasm_layer;
    cliff_layer;
    water_layer;
    curves_layer;
    ramp_layer;
    scatter_layer;
    bridges_layer;
    structures_layer;
    features_layer;
    player_layer;
    roof_layer;
    ambient_layer;
    reticles_layer;
    player_effects_layer;
    effect_elements = new Array();
    effect_pool_index = 0;
    player_avatar;
    player_rotator;
    frame_size_width = 0;
    frame_size_height = 0;
    cell_size = 20;
    pad = 2;
    cell_size_x = 0;
    cell_size_y = 0;
    grid_mid_x = 0;
    grid_mid_y = 0;
    grid_mid_cell;
    interactive = true;
    all_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    rect_elements = new Array();
    chasm_elements = new Array();
    cliff_elements = new Array();
    water_elements = new Array();
    contour_elements = new Array();
    elev2_elements = new Array();
    elev3_elements = new Array();
    ramp_elements = new Array();
    bridge_elements = new Array();
    structure_elements = new Array();
    tree_elements = new Array();
    flora_elements = new Array();
    roof_elements = new Array();
    reticle_elements = new Array();
    elev2_layer;
    elev3_layer;
    slot_reticle_state;
    enable_grass_reticles = true;

    constructor(element, i_agent, interactive) {
        this.frame_element = element;
        this.buildGridPool(i_agent, interactive);
    }

    buildGridPool(i_agent, interactive) {
        this.frame_size_width = Math.max(100, this.frame_element.clientWidth);
        this.frame_size_height = Math.max(100, this.frame_element.clientHeight);
        this.cell_size_x = Math.max(1, Math.floor(this.frame_size_width / this.cell_size));
        this.cell_size_y = Math.max(1, Math.floor(this.frame_size_height / this.cell_size));
        this.grid_mid_x = Math.floor(this.cell_size_x / 2);
        this.grid_mid_y = Math.floor(this.cell_size_y / 2);
        var pad = this.pad;
        this.grid_mid_cell = (this.grid_mid_x + pad) * (this.cell_size_y + 2 * pad + 1) + (this.grid_mid_y + pad);

        if (i_agent.x == "unset") {
            i_agent.x = 0;
            i_agent.y = 0;
            vector_horizontal = this.grid_mid_x;
            vector_vertical = this.grid_mid_y;
        }

        empty_frame(this.frame_element);

        // Helper to add gradient color stop
        const addGradientStop = (grad, offset, color, opacity = "1") => {
            var stop = create_svg_element("stop");
            stop.setAttribute("offset", offset);
            stop.setAttribute("stop-color", color);
            if (opacity !== "1") stop.setAttribute("stop-opacity", opacity);
            grad.appendChild(stop);
        };

        // SVG Defs: Volumetric Tree Canopy Gradient
        var defs = create_svg_element("defs");

        var gradTree = create_svg_element("radialGradient");
        gradTree.setAttribute("id", "grad_tree");
        gradTree.setAttribute("cx", "35%");
        gradTree.setAttribute("cy", "35%");
        gradTree.setAttribute("r", "65%");
        addGradientStop(gradTree, "0%", "#86efac");
        addGradientStop(gradTree, "35%", "#22c55e");
        addGradientStop(gradTree, "70%", "#15803d");
        addGradientStop(gradTree, "95%", "#0f391b");
        addGradientStop(gradTree, "100%", "#052e16");
        defs.appendChild(gradTree);

        // Phase 3: Directional Topographic Shaded Relief Gradients (Sun Azimuth Theta = 315 deg, Northwest Sun)
        const createReliefGrad = (id, x1, y1, x2, y2, stops) => {
            var g = create_svg_element("linearGradient");
            g.setAttribute("id", id);
            g.setAttribute("x1", x1);
            g.setAttribute("y1", y1);
            g.setAttribute("x2", x2);
            g.setAttribute("y2", y2);
            for (const st of stops) {
                addGradientStop(g, st.offset, st.color, st.opacity !== undefined ? String(st.opacity) : "1");
            }
            defs.appendChild(g);
        };

        createReliefGrad("grad_elev2_relief", "0%", "0%", "100%", "100%", [
            { offset: "0%", color: "#22c55e" },
            { offset: "40%", color: "#16a34a" },
            { offset: "80%", color: "#15803d" },
            { offset: "100%", color: "#14532d" }
        ]);

        createReliefGrad("grad_elev3_relief", "0%", "0%", "100%", "100%", [
            { offset: "0%", color: "#94a3b8" },
            { offset: "35%", color: "#64748b" },
            { offset: "70%", color: "#475569" },
            { offset: "100%", color: "#1e293b" }
        ]);

        createReliefGrad("grad_cliff_relief", "0%", "0%", "100%", "100%", [
            { offset: "0%", color: "#64748b" },
            { offset: "45%", color: "#475569" },
            { offset: "80%", color: "#334155" },
            { offset: "100%", color: "#0f172a" }
        ]);

        createReliefGrad("grad_chasm_depth", "0%", "0%", "50%", "100%", [
            { offset: "0%", color: "#312e81" },
            { offset: "25%", color: "#1e1b4b" },
            { offset: "65%", color: "#09090b" },
            { offset: "100%", color: "#000000" }
        ]);

        // SVG Symbol: Organic Tree Feature (Instanced via <use>)
        var symTree = create_svg_element("g");
        symTree.setAttribute("id", "symbol_tree");
        var symTreeShadow = create_svg_element("circle");
        symTreeShadow.setAttribute("cx", (this.cell_size / 2) + "px");
        symTreeShadow.setAttribute("cy", (this.cell_size / 2 + 0.8) + "px");
        symTreeShadow.setAttribute("r", (this.cell_size * 0.18) + "px");
        symTreeShadow.setAttribute("class", "tree_shadow");
        symTree.appendChild(symTreeShadow);
        var symTreeCanopy = create_svg_element("circle");
        symTreeCanopy.setAttribute("cx", (this.cell_size / 2) + "px");
        symTreeCanopy.setAttribute("cy", (this.cell_size / 2) + "px");
        symTreeCanopy.setAttribute("r", (this.cell_size * 0.38) + "px");
        symTreeCanopy.setAttribute("class", "tree_canopy");
        symTree.appendChild(symTreeCanopy);
        var symTreeTrunk = create_svg_element("circle");
        symTreeTrunk.setAttribute("cx", (this.cell_size / 2) + "px");
        symTreeTrunk.setAttribute("cy", (this.cell_size / 2) + "px");
        symTreeTrunk.setAttribute("r", (this.cell_size * 0.10) + "px");
        symTreeTrunk.setAttribute("class", "tree_trunk");
        symTree.appendChild(symTreeTrunk);
        defs.appendChild(symTree);

        // SVG Symbol: Riparian Flora Shrub / Bush Feature (Instanced via <use>)
        var symFlora = create_svg_element("g");
        symFlora.setAttribute("id", "symbol_flora");
        var symShrubShadow = create_svg_element("ellipse");
        symShrubShadow.setAttribute("cx", (this.cell_size / 2) + "px");
        symShrubShadow.setAttribute("cy", (this.cell_size / 2 + 1.5) + "px");
        symShrubShadow.setAttribute("rx", (this.cell_size * 0.28) + "px");
        symShrubShadow.setAttribute("ry", (this.cell_size * 0.20) + "px");
        symShrubShadow.setAttribute("class", "shrub_shadow");
        symFlora.appendChild(symShrubShadow);
        var symFloraBase = create_svg_element("circle");
        symFloraBase.setAttribute("cx", (this.cell_size / 2 - 1.5) + "px");
        symFloraBase.setAttribute("cy", (this.cell_size / 2 + 0.5) + "px");
        symFloraBase.setAttribute("r", (this.cell_size * 0.18) + "px");
        symFloraBase.setAttribute("class", "flora_shrub");
        symFlora.appendChild(symFloraBase);
        var symFloraMain = create_svg_element("circle");
        symFloraMain.setAttribute("cx", (this.cell_size / 2 + 1) + "px");
        symFloraMain.setAttribute("cy", (this.cell_size / 2 - 0.5) + "px");
        symFloraMain.setAttribute("r", (this.cell_size * 0.22) + "px");
        symFloraMain.setAttribute("class", "flora_shrub");
        symFlora.appendChild(symFloraMain);
        var symFloraHighlight = create_svg_element("circle");
        symFloraHighlight.setAttribute("cx", (this.cell_size / 2 + 0.2) + "px");
        symFloraHighlight.setAttribute("cy", (this.cell_size / 2 - 1.8) + "px");
        symFloraHighlight.setAttribute("r", (this.cell_size * 0.08) + "px");
        symFloraHighlight.setAttribute("class", "flora_highlight");
        symFlora.appendChild(symFloraHighlight);
        defs.appendChild(symFlora);

        // SVG Symbol: Shared Organic Terrain Contour Geometry (Instanced via <use> across 7 contour layers)
        var symContour = create_svg_element("rect");
        symContour.setAttribute("id", "symbol_contour");
        symContour.setAttribute("x", "-1.25px");
        symContour.setAttribute("y", "-1.25px");
        symContour.setAttribute("width", (this.cell_size + 2.5) + "px");
        symContour.setAttribute("height", (this.cell_size + 2.5) + "px");
        symContour.setAttribute("rx", "4.5px");
        symContour.setAttribute("ry", "4.5px");
        defs.appendChild(symContour);

        // SVG Symbol: Shared Unit Tile Geometry (Instanced via <use> across bridges & roofs)
        var symTile = create_svg_element("rect");
        symTile.setAttribute("id", "symbol_tile");
        symTile.setAttribute("width", this.cell_size + "px");
        symTile.setAttribute("height", this.cell_size + "px");
        defs.appendChild(symTile);

        // SVG Pattern Symbol: Hardware-tiled base grid background (replaces 5,562 individual cell stroke/fill draws)
        var gridPattern = create_svg_element("pattern");
        gridPattern.setAttribute("id", "symbol_grid_pattern");
        gridPattern.setAttribute("width", this.cell_size + "px");
        gridPattern.setAttribute("height", this.cell_size + "px");
        gridPattern.setAttribute("patternUnits", "userSpaceOnUse");
        var gridPatRect = create_svg_element("rect");
        gridPatRect.setAttribute("width", this.cell_size + "px");
        gridPatRect.setAttribute("height", this.cell_size + "px");
        gridPatRect.setAttribute("fill", "rgba(145, 255, 86, 0.3)");
        gridPatRect.setAttribute("stroke", "rgba(0, 0, 0, 0.15)");
        gridPatRect.setAttribute("stroke-width", "0.5px");
        gridPattern.appendChild(gridPatRect);
        defs.appendChild(gridPattern);

        // SVG Symbol: Player Avatar Composite Geometry (5 primitives instanced via <use>)
        var symPlayer = create_svg_element("g");
        symPlayer.setAttribute("id", "symbol_player_body");
        var pShadow = create_svg_element("circle");
        pShadow.setAttribute("class", "player_shadow");
        pShadow.setAttribute("cx", "0");
        pShadow.setAttribute("cy", "2");
        pShadow.setAttribute("r", "7.5");
        symPlayer.appendChild(pShadow);
        var ring = create_svg_element("circle");
        ring.setAttribute("class", "player_ring");
        ring.setAttribute("cx", "0");
        ring.setAttribute("cy", "0");
        ring.setAttribute("r", "8.5");
        symPlayer.appendChild(ring);
        var body = create_svg_element("circle");
        body.setAttribute("class", "player_body");
        body.setAttribute("cx", "0");
        body.setAttribute("cy", "0");
        body.setAttribute("r", "6.5");
        symPlayer.appendChild(body);
        var visor = create_svg_element("path");
        visor.setAttribute("class", "player_visor");
        visor.setAttribute("d", "M 1 -4.5 L 8.5 0 L 1 4.5 L 3 0 Z");
        symPlayer.appendChild(visor);
        var core = create_svg_element("circle");
        core.setAttribute("class", "player_core");
        core.setAttribute("cx", "0");
        core.setAttribute("cy", "0");
        core.setAttribute("r", "2");
        symPlayer.appendChild(core);
        defs.appendChild(symPlayer);

        // SVG Metasurface / Metaball Organic Fusion Filter (GPU-accelerated Gaussian + Alpha Threshold)
        const createTerrainFilter = (id, baseFreq, scale, octaves = 1, blurDev = "3.2", type = "fractalNoise") => {
            var f = create_svg_element("filter");
            f.setAttribute("id", id);
            f.setAttribute("x", "-5%");
            f.setAttribute("y", "-5%");
            f.setAttribute("width", "110%");
            f.setAttribute("height", "110%");

            var blur = create_svg_element("feGaussianBlur");
            blur.setAttribute("in", "SourceGraphic");
            blur.setAttribute("stdDeviation", blurDev);
            blur.setAttribute("result", "blur");
            f.appendChild(blur);

            var mat = create_svg_element("feColorMatrix");
            mat.setAttribute("in", "blur");
            mat.setAttribute("mode", "matrix");
            mat.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7");
            mat.setAttribute("result", "fused");
            f.appendChild(mat);

            return f;
        };

        // 1. Organic rolling meadow waves for grass
        defs.appendChild(createTerrainFilter("terrain_smooth_grass", "0.035", "4.0", 1, "3.2", "fractalNoise"));

        // 1b. Mountain highlands plateau (1st layer mountain)
        defs.appendChild(createTerrainFilter("terrain_smooth_elev2", "0.038", "4.2", 1, "3.2", "fractalNoise"));

        // 1c. Mountain crags & peaks (2nd layer mountain)
        defs.appendChild(createTerrainFilter("terrain_smooth_elev3", "0.045", "4.5", 1, "3.2", "fractalNoise"));

        // 2. Gentle meandering fluid waves for rivers
        defs.appendChild(createTerrainFilter("terrain_smooth_water", "0.025", "3.5", 1, "3.2", "fractalNoise"));

        // 3. Craggy, jagged tectonic fracture noise for canyons
        defs.appendChild(createTerrainFilter("terrain_smooth_chasm", "0.060", "5.0", 2, "3.2", "turbulence"));

        // 4. Rocky escarpment fracture noise for cliffs
        defs.appendChild(createTerrainFilter("terrain_smooth_cliff", "0.050", "4.2", 1, "3.2", "turbulence"));

        // 5. Natural earthen slope waves for ramps
        defs.appendChild(createTerrainFilter("terrain_smooth_ramp", "0.040", "3.5", 1, "2.8", "fractalNoise"));

        // SVG Symbols: Directional Prefab Cell Reticles (Phase 2 - Architecture 1: Restrained Plain Fills)
        const addReticleSymbol = (id, fillD, strokeD, waves = null) => {
            var sym = create_svg_element("g");
            sym.setAttribute("id", id);

            // Plain fill restrained by the border boundary
            var fillPath = create_svg_element("path");
            fillPath.setAttribute("class", "reticle_fill");
            fillPath.setAttribute("d", fillD);
            sym.appendChild(fillPath);

            // Directional border stroke path
            var strokePath = create_svg_element("path");
            strokePath.setAttribute("class", "reticle_path");
            strokePath.setAttribute("d", strokeD);
            sym.appendChild(strokePath);

            // Phase 4: Hydrological breathing tidal wave crests
            if (waves) {
                var waveList = Array.isArray(waves) ? waves : [waves];
                for (var w = 0; w < waveList.length; w++) {
                    var waveInfo = waveList[w];
                    var wavePath = create_svg_element("path");
                    wavePath.setAttribute("class", "reticle_wave " + waveInfo.cls);
                    wavePath.setAttribute("d", waveInfo.d);
                    sym.appendChild(wavePath);
                }
            }

            defs.appendChild(sym);
        };

        // 1. Edge: fill from Y=1.5 down to Y=20, stroke along Y=1.5
        addReticleSymbol("symbol_reticle_edge",
            "M 0 1.5 L 20 1.5 L 20 20 L 0 20 Z",
            "M 0 1.5 L 20 1.5"
        );

        // 2. Corner: fill restrained inside rounded L-bracket
        addReticleSymbol("symbol_reticle_corner",
            "M 0 20 L 0 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20 Z",
            "M 0 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20"
        );

        // 3. Parallel: fill between Y=1.5 and Y=18.5
        addReticleSymbol("symbol_reticle_parallel",
            "M 0 1.5 L 20 1.5 L 20 18.5 L 0 18.5 Z",
            "M 0 1.5 L 20 1.5 M 0 18.5 L 20 18.5"
        );

        // 4. U-Shape: fill restrained inside U-cup
        addReticleSymbol("symbol_reticle_u",
            "M 1.5 20 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20 Z",
            "M 1.5 20 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20"
        );

        // 5. Island: fill restrained inside 4-corner rounded frame
        addReticleSymbol("symbol_reticle_island",
            "M 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 14.5 Q 18.5 18.5 14.5 18.5 L 5.5 18.5 Q 1.5 18.5 1.5 14.5 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 Z",
            "M 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 14.5 Q 18.5 18.5 14.5 18.5 L 5.5 18.5 Q 1.5 18.5 1.5 14.5 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 Z"
        );

        // Phase 4: Hydrological water reticle symbols with animated tidal wave crests
        addReticleSymbol("symbol_reticle_edge_water",
            "M 0 1.5 L 20 1.5 L 20 20 L 0 20 Z",
            "M 0 1.5 L 20 1.5",
            { d: "M 0 3.2 Q 5 1.6 10 3.2 Q 15 4.8 20 3.2", cls: "reticle_wave_edge" }
        );

        addReticleSymbol("symbol_reticle_corner_water",
            "M 0 20 L 0 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20 Z",
            "M 0 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20",
            { d: "M 0 3.8 Q 3.5 2.5 7 3.8 Q 10.5 5.1 13.5 4.0 Q 16.0 4.0 16.0 6.5 Q 14.7 9.5 16.0 13.0 Q 17.3 16.5 16.0 20", cls: "reticle_wave_corner" }
        );

        addReticleSymbol("symbol_reticle_parallel_water",
            "M 0 1.5 L 20 1.5 L 20 18.5 L 0 18.5 Z",
            "M 0 1.5 L 20 1.5 M 0 18.5 L 20 18.5",
            [
                { d: "M 0 3.2 Q 5 1.6 10 3.2 Q 15 4.8 20 3.2", cls: "reticle_wave_edge" },
                { d: "M 0 16.8 Q 5 15.2 10 16.8 Q 15 18.4 20 16.8", cls: "reticle_wave_edge_opposing" }
            ]
        );

        addReticleSymbol("symbol_reticle_u_water",
            "M 1.5 20 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20 Z",
            "M 1.5 20 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 20",
            { d: "M 3.8 20 Q 2.6 16.5 3.8 13.0 Q 5.0 9.5 3.8 6.5 Q 3.8 3.8 6.5 3.8 Q 8.5 2.5 10 3.8 Q 11.5 5.1 13.5 3.8 Q 16.2 3.8 16.2 6.5 Q 15.0 9.5 16.2 13.0 Q 17.4 16.5 16.2 20", cls: "reticle_wave_u" }
        );

        addReticleSymbol("symbol_reticle_island_water",
            "M 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 14.5 Q 18.5 18.5 14.5 18.5 L 5.5 18.5 Q 1.5 18.5 1.5 14.5 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 Z",
            "M 5.5 1.5 L 14.5 1.5 Q 18.5 1.5 18.5 5.5 L 18.5 14.5 Q 18.5 18.5 14.5 18.5 L 5.5 18.5 Q 1.5 18.5 1.5 14.5 L 1.5 5.5 Q 1.5 1.5 5.5 1.5 Z",
            { d: "M 6.5 3.8 Q 10 2.5 13.5 3.8 Q 16.2 3.8 16.2 6.5 Q 17.5 10 16.2 13.5 Q 16.2 16.2 13.5 16.2 Q 10 17.5 6.5 16.2 Q 3.8 16.2 3.8 13.5 Q 2.5 10 3.8 6.5 Q 3.8 3.8 6.5 3.8 Z", cls: "reticle_wave_island" }
        );

        // Open Water "Pure" Tile Wave Swell Symbol
        var pureWaveSym = create_svg_element("g");
        pureWaveSym.setAttribute("id", "symbol_pure_wave");
        var pureWavePath = create_svg_element("path");
        pureWavePath.setAttribute("class", "pure_wave");
        pureWavePath.setAttribute("d", "M 3 10 Q 7 7.5 11 10 Q 15 12.5 19 10");
        pureWaveSym.appendChild(pureWavePath);
        defs.appendChild(pureWaveSym);

        // Phase 4: Step Kinematic Micro-Interaction Symbols
        // 1. Wading ripple in shallow water
        var rippleSym = create_svg_element("g");
        rippleSym.setAttribute("id", "symbol_wading_ripple");
        var rippleEl = create_svg_element("ellipse");
        rippleEl.setAttribute("cx", "10");
        rippleEl.setAttribute("cy", "10");
        rippleEl.setAttribute("rx", "6");
        rippleEl.setAttribute("ry", "3.6");
        rippleEl.setAttribute("class", "wading_ripple_shape");
        rippleSym.appendChild(rippleEl);
        defs.appendChild(rippleSym);

        // 2. Wet sand footprint indentation
        var sandSym = create_svg_element("g");
        sandSym.setAttribute("id", "symbol_sand_footprint");
        var pLeft = create_svg_element("ellipse");
        pLeft.setAttribute("cx", "7");
        pLeft.setAttribute("cy", "10");
        pLeft.setAttribute("rx", "1.8");
        pLeft.setAttribute("ry", "3");
        pLeft.setAttribute("class", "sand_print_shape");
        sandSym.appendChild(pLeft);
        var pRight = create_svg_element("ellipse");
        pRight.setAttribute("cx", "13");
        pRight.setAttribute("cy", "10");
        pRight.setAttribute("rx", "1.8");
        pRight.setAttribute("ry", "3");
        pRight.setAttribute("class", "sand_print_shape");
        sandSym.appendChild(pRight);
        defs.appendChild(sandSym);

        // 3. Dry grass / turf dust puff
        var dustSym = create_svg_element("g");
        dustSym.setAttribute("id", "symbol_grass_dust");
        var d1 = create_svg_element("circle");
        d1.setAttribute("cx", "7.5");
        d1.setAttribute("cy", "9.5");
        d1.setAttribute("r", "1.8");
        d1.setAttribute("class", "grass_dust_shape");
        dustSym.appendChild(d1);
        var d2 = create_svg_element("circle");
        d2.setAttribute("cx", "12.5");
        d2.setAttribute("cy", "10.5");
        d2.setAttribute("r", "1.4");
        d2.setAttribute("class", "grass_dust_shape");
        dustSym.appendChild(d2);
        defs.appendChild(dustSym);

        this.frame_element.appendChild(defs);

        // Master hardware-composited world viewport container
        this.world_viewport = create_svg_element("g");
        this.world_viewport.setAttribute("id", "world_viewport");
        this.world_viewport.style.willChange = "transform";
        this.frame_element.appendChild(this.world_viewport);

        // Layer 0: Background grid pattern rect
        this.bg_layer = create_svg_element("g");
        this.bg_layer.setAttribute("id", "bg_layer");
        var bgGridRect = create_svg_element("rect");
        bgGridRect.setAttribute("x", (-pad * this.cell_size) + "px");
        bgGridRect.setAttribute("y", (-pad * this.cell_size) + "px");
        bgGridRect.setAttribute("width", ((this.cell_size_x + 2 * pad + 1) * this.cell_size) + "px");
        bgGridRect.setAttribute("height", ((this.cell_size_y + 2 * pad + 1) * this.cell_size) + "px");
        bgGridRect.setAttribute("fill", "url(#symbol_grid_pattern)");
        bgGridRect.style.pointerEvents = "none";
        this.bg_layer.appendChild(bgGridRect);
        this.world_viewport.appendChild(this.bg_layer);

        // Layer 2: Tiles layer for cell element click detection & interactive overlays (.path_step, .selectedDestination)
        this.tiles_layer = create_svg_element("g");
        this.tiles_layer.setAttribute("id", "tiles_layer");
        const onViewportClick = (e) => {
            var target = e.target;
            if (target && target.hasAttribute("meta-frame")) {
                this.handleCellClick(target, e);
            }
        };
        this.tiles_layer.addEventListener("click", onViewportClick);
        this.world_viewport.addEventListener("click", onViewportClick);
        this.world_viewport.appendChild(this.tiles_layer);

        // Layer 2b: Reticles layer for directional ecotone cell borders (Architecture 1)
        this.reticles_layer = create_svg_element("g");
        this.reticles_layer.setAttribute("id", "reticles_layer");
        this.reticles_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.reticles_layer);

        // Layer 2c: Dedicated Ramp Paths layer (overlaps all other terrain and reticles)
        this.ramp_layer = create_svg_element("g");
        this.ramp_layer.setAttribute("id", "world_ramp_paths");
        this.ramp_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.ramp_layer);

        // Layer 2d: Dedicated Boundary Micro-Scatter Layer (Pebbles, Foam, Clovers, Wildflowers, Scree)
        this.scatter_layer = create_svg_element("g");
        this.scatter_layer.setAttribute("id", "scatter_layer");
        this.scatter_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.scatter_layer);

        // Layer 2f: Dedicated Player Kinematic Effects Layer (Wading ripples, footprints, dust puffs)
        this.player_effects_layer = create_svg_element("g");
        this.player_effects_layer.setAttribute("id", "player_effects_layer");
        this.player_effects_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.player_effects_layer);

        // Pre-warm 8 kinematic effect instances (container <g> with inner <use>)
        this.effect_elements = new Array(8);
        this.effect_pool_index = 0;
        for (var ep = 0; ep < 8; ep++) {
            var g = create_svg_element("g");
            g.setAttribute("class", "effect_container");
            g.style.display = "none";
            g._vis = false;

            var ef = create_svg_element("use");
            ef.setAttribute("href", "#symbol_wading_ripple");
            ef.setAttribute("class", "effect_instance");
            ef.style.pointerEvents = "none";
            g.appendChild(ef);

            this.player_effects_layer.appendChild(g);
            this.effect_elements[ep] = g;
        }

        // Layer 3: Bridges layer (Engineered bridges, paths, and floors cleanly span over contours)
        this.bridges_layer = create_svg_element("g");
        this.bridges_layer.setAttribute("id", "bridges_layer");
        this.bridges_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.bridges_layer);

        // Layer 3b: Vertical structures layer (Walls, doors, barricades, fixtures)
        this.structures_layer = create_svg_element("g");
        this.structures_layer.setAttribute("id", "structures_layer");
        this.structures_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.structures_layer);

        // Layer 1: Vector Terrain Landmark Paths (Phase 6)
        if (typeof TerrainPathService !== 'undefined' && typeof globalMapObject !== 'undefined' && globalMapObject) {
            this.terrainPathService = new TerrainPathService(globalMapObject, this.cell_size);
            this.terrainPathService.mountTerrainLayers(this);
        }

        // Layer 4: Organic features layer (Tree canopies & Riparian flora shrubs)
        this.features_layer = create_svg_element("g");
        this.features_layer.setAttribute("id", "features_layer");
        this.features_layer.style.pointerEvents = "none";
        this.world_viewport.appendChild(this.features_layer);

        // Layer 2: Player layer for avatar
        this.player_layer = create_svg_element("g");
        this.player_layer.setAttribute("id", "player_layer");
        this.frame_element.appendChild(this.player_layer);

        // Layer 3: Overhead Roof layer for occlusion and cutaways (Phase 4)
        this.roof_layer = create_svg_element("g");
        this.roof_layer.setAttribute("id", "roof_layer");
        this.roof_layer.style.pointerEvents = "none";
        this.roof_layer.style.willChange = "transform";
        this.frame_element.appendChild(this.roof_layer);

        // Layer 4: Ambient interior lighting / vignette layer (Phase 4)
        this.ambient_layer = create_svg_element("g");
        this.ambient_layer.setAttribute("id", "ambient_layer");
        this.ambient_layer.setAttribute("class", "ambient_interior inactive");
        this.ambient_layer.style.pointerEvents = "none";
        var vignette = create_svg_element("rect");
        vignette.setAttribute("x", "0");
        vignette.setAttribute("y", "0");
        vignette.setAttribute("width", "100%");
        vignette.setAttribute("height", "100%");
        vignette.setAttribute("class", "interior_vignette");
        this.ambient_layer.appendChild(vignette);
        this.frame_element.appendChild(this.ambient_layer);

        this.buildPlayerAvatar();

        this.rect_elements = new Array();
        this.slot_x = new Array();
        this.slot_y = new Array();
        this.slot_contour_x = new Array();
        this.slot_contour_y = new Array();
        this.slot_state = new Int32Array(0);
        this.chasm_elements = new Array();
        this.cliff_elements = new Array();
        this.water_elements = new Array();
        this.contour_elements = new Array();
        this.elev2_elements = new Array();
        this.elev3_elements = new Array();
        this.ramp_elements = new Array();
        this.bridge_elements = new Array();
        this.structure_elements = new Array();
        this.tree_elements = new Array();
        this.flora_elements = new Array();
        this.roof_elements = new Array();
        this.reticle_elements = new Array();
        this.layer_free_pools = new Map();
        this.all_cells = new Array();
        this.all_blocked_cells = new Array();

        // 2-tile margin buffer on all sides to prevent edge clipping during subpixel slide
        var pad = this.pad;
        var frame_count = 0;
        for (var i = -pad; i <= this.cell_size_x + pad; i++) {
            var px = (i * this.cell_size) + "px";
            var cpx = (i * this.cell_size - 0.75) + "px";
            for (var j = -pad; j <= this.cell_size_y + pad; j++) {
                var py = (j * this.cell_size) + "px";
                var cpy = (j * this.cell_size - 0.75) + "px";
                this.slot_x[frame_count] = px;
                this.slot_y[frame_count] = py;
                this.slot_contour_x[frame_count] = cpx;
                this.slot_contour_y[frame_count] = cpy;

                var cell_element = create_svg_element("rect");
                cell_element.setAttribute('meta-frame', frame_count);
                cell_element.setAttribute('class', "cell");
                cell_element._lastClass = "cell";
                cell_element.setAttribute('x', px);
                cell_element.setAttribute('y', py);
                cell_element.setAttribute('width', this.cell_size + "px");
                cell_element.setAttribute('height', this.cell_size + "px");

                this.tiles_layer.appendChild(cell_element);
                this.rect_elements[frame_count] = cell_element;

                if (i === this.grid_mid_x && j === this.grid_mid_y) {
                    this.grid_mid_cell = frame_count;
                }

                frame_count++;
            }
        }
        this.slot_state = new Int32Array(frame_count);
        this.slot_state.fill(-1);
        this.slot_reticle_state = new Int16Array(frame_count);
        this.slot_reticle_state.fill(-1);

        this.updateGrid(i_agent, interactive);
        this.prewarmSymbolPools();
    }

    prewarmSymbolPools() {
        const warm = (pool, layer, href, targetTotal, cls) => {
            var fp = this.getFreePool(pool);
            const toAdd = Math.max(0, targetTotal - layer.childElementCount);
            for (var i = 0; i < toAdd; i++) {
                var el = create_svg_element("use");
                el.setAttribute("href", href);
                el._lastHref = href;
                if (cls) {
                    el.setAttribute("class", cls);
                    el._lastClass = cls;
                }
                el.style.display = "none";
                el._vis = false;
                layer.appendChild(el);
                fp.push(el);
            }
        };
        warm(this.bridge_elements, this.bridges_layer, "#symbol_tile", 120, "cell structure_path");
        warm(this.structure_elements, this.structures_layer, "#symbol_tile", 120, "cell structure_wall timber");
        warm(this.tree_elements, this.features_layer, "#symbol_tree", 300, "cell_tree_feature");
        warm(this.flora_elements, this.features_layer, "#symbol_flora", 200, "cell_flora_feature");
        warm(this.roof_elements, this.roof_layer, "#symbol_tile", 100, "cell_roof timber occluded");
        warm(this.reticle_elements, this.reticles_layer, "#symbol_reticle_edge", 600, "cell_reticle reticle_sand");
    }

    getFreePool(pool) {
        var fp = this.layer_free_pools.get(pool);
        if (!fp) {
            fp = [];
            this.layer_free_pools.set(pool, fp);
        }
        return fp;
    }

    getReticleCategory(c) {
        if (!c) return 0;
        const f = c.flags;
        const hasBldg = (f & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_PATH)) !== 0;
        if (hasBldg) return 0;
        if (f & CellFlags.TERRAIN_RAMP) return 0;

        if (f & CellFlags.CHASM) return 6;
        if (f & CellFlags.TERRAIN_CLIFF) return 5;
        if (f & CellFlags.WATER_SHALLOW) return 3;
        if (f & CellFlags.WATER) return 2;

        const elev = c.elevation !== undefined ? c.elevation : 1;
        if (elev >= 3) return 8; // Mountain Tier 2 (Peaks)
        if (elev === 2) return 7; // Mountain Tier 1 (Highlands)

        if (f & CellFlags.TERRAIN_SAND) return 1;
        if (this.enable_grass_reticles && (f & (CellFlags.GRASS | CellFlags.TREE | CellFlags.TERRAIN_FLORA))) return 4;
        return 0;
    }

    ensureSymbolInstance(pool, layer, symbolHref, k, className, transform = null, animDelay = null) {
        var el = pool[k];
        if (!el) {
            var freePool = this.getFreePool(pool);
            if (freePool.length > 0) {
                el = freePool.pop();
                if (!el._vis) {
                    el.style.display = "block";
                    el._vis = true;
                }
                el.style.pointerEvents = "none";
            } else {
                el = create_svg_element("use");
                el.setAttribute("href", symbolHref);
                el._lastHref = symbolHref;
                el._vis = true;
                el.style.pointerEvents = "none";
                layer.appendChild(el);
            }
            pool[k] = el;
        } else {
            if (!el._vis) {
                el.style.display = "block";
                el._vis = true;
            }
        }

        if (el._lastHref !== symbolHref) {
            el.setAttribute("href", symbolHref);
            el._lastHref = symbolHref;
        }

        if (transform) {
            if (el._lastTf !== transform) {
                el.setAttribute("transform", transform);
                el._lastTf = transform;
            }
            if (el.hasAttribute("x")) el.removeAttribute("x");
            if (el.hasAttribute("y")) el.removeAttribute("y");
        } else {
            if (el.getAttribute("x") !== this.slot_x[k]) el.setAttribute("x", this.slot_x[k]);
            if (el.getAttribute("y") !== this.slot_y[k]) el.setAttribute("y", this.slot_y[k]);
            if (el.hasAttribute("transform")) el.removeAttribute("transform");
            el._lastTf = null;
        }

        if (className && el._lastClass !== className) {
            el.setAttribute("class", className);
            el._lastClass = className;
        }

        if (animDelay !== null) {
            if (el._lastAnimDelay !== animDelay) {
                el.style.animationDelay = animDelay;
                el._lastAnimDelay = animDelay;
            }
        } else if (el._lastAnimDelay) {
            el.style.animationDelay = "";
            el._lastAnimDelay = null;
        }
        return el;
    }

    hideSymbolInstance(pool, k) {
        var el = pool[k];
        if (el) {
            pool[k] = null;
            this.getFreePool(pool).push(el);
            if (el._lastAnimDelay) {
                el.style.animationDelay = "";
                el._lastAnimDelay = null;
            }
        }
    }

    flushFreePools() {
        for (const [, freePool] of this.layer_free_pools.entries()) {
            for (var i = 0; i < freePool.length; i++) {
                var el = freePool[i];
                if (el._vis) {
                    el.style.display = "none";
                    el._vis = false;
                }
            }
        }
    }

    buildPlayerAvatar() {
        var centerX = (this.grid_mid_x + 0.5) * this.cell_size;
        var centerY = (this.grid_mid_y + 0.5) * this.cell_size;

        this.player_avatar = create_svg_element("g");
        this.player_avatar.setAttribute("id", "player_avatar");
        this.player_avatar.setAttribute("class", "player_avatar idle");
        this.player_avatar.setAttribute("transform", `translate(${centerX}, ${centerY})`);
        this.player_avatar.style.pointerEvents = "none";

        this.player_rotator = create_svg_element("g");
        this.player_rotator.setAttribute("id", "player_rotator");

        var playerUse = create_svg_element("use");
        playerUse.setAttribute("href", "#symbol_player_body");
        playerUse.setAttribute("xlink:href", "#symbol_player_body");
        this.player_rotator.appendChild(playerUse);

        this.player_avatar.appendChild(this.player_rotator);
        this.player_layer.appendChild(this.player_avatar);
    }

    setPlayerRotation(deg) {
        if (this.player_rotator) {
            this.player_rotator.style.transform = `rotate(${deg}deg)`;
        }
    }

    setViewportShift(shiftX, shiftY) {
        const tf = (shiftX === 0 && shiftY === 0)
            ? "translate3d(0px, 0px, 0px)"
            : `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0px)`;
        if (this.world_viewport) {
            this.world_viewport.style.transform = tf;
        }
        if (this.roof_layer && this.roof_layer._lastVis === "block") {
            this.roof_layer.style.transform = tf;
        }
    }

    // Phase 4: Dynamic Locomotion Particle Spawner (Wading ripples, footprints, dust puffs)
    spawnStepKinematicEffect(to_meta, heading) {
        if (!to_meta || !this.effect_elements || this.effect_elements.length === 0) return;
        var f = to_meta.flags;

        var symHref = null;
        var effectClass = null;

        if (f & CellFlags.WATER_SHALLOW) {
            symHref = "#symbol_wading_ripple";
            effectClass = "effect_instance wading_ripple_instance";
        } else if (f & CellFlags.TERRAIN_SAND) {
            symHref = "#symbol_sand_footprint";
            effectClass = "effect_instance sand_footprint_instance";
        } else if ((f & CellFlags.GRASS) || ((f & CellFlags.TERRAIN_FLORA) && !(f & CellFlags.STRUCTURE_FLOOR))) {
            symHref = "#symbol_grass_dust";
            effectClass = "effect_instance grass_dust_instance";
        }

        if (!symHref) return;

        var g = this.effect_elements[this.effect_pool_index];
        this.effect_pool_index = (this.effect_pool_index + 1) % this.effect_elements.length;

        // Position effect container at center cell in world_viewport coordinates
        var cx = this.grid_mid_x * this.cell_size;
        var cy = this.grid_mid_y * this.cell_size;
        var rot = heading || 0;

        g.setAttribute("transform", `translate(${cx}, ${cy}) rotate(${rot}, 10, 10)`);
        if (!g._vis) {
            g.style.display = "block";
            g._vis = true;
        }

        var useEl = g.firstElementChild;
        if (useEl) {
            useEl.setAttribute("href", symHref);
            useEl.setAttribute("class", "effect_instance");
            useEl.setAttribute("class", effectClass);
        }
    }

    handleCellClick(cell_element, e) {
        if (!this.interactive) {
            return;
        }
        var frame_id = cell_element.getAttribute("meta-frame");
        var cell_object = this.all_cells[frame_id];
        if (cell_object && typeof cell_object.setAnchor === 'function') {
            cell_object.setAnchor.call(cell_element, e);
        }
    }

    updateGrid(i_agent, interactive) {
        this.interactive = (typeof interactive !== 'undefined') ? interactive : true;

        my_cache_offset = (i_agent.x * this.cell_size_y) + i_agent.y;

        if (!this.changed_slots) {
            this.changed_slots = new Int32Array(this.rect_elements.length);
        }
        var changedCount = 0;

        var pad = this.pad;
        var frame_count = 0;
        var mapCells = globalMapObject.map_cells;
        for (var c = 0; c < this.all_cells.length; c++) {
            var oldCell = this.all_cells[c];
            if (oldCell) {
                oldCell.cell_element = null;
            }
        }
        for (var i = -pad; i <= this.cell_size_x + pad; i++) {
            var map_x = i - vector_horizontal;
            var colCells = mapCells[map_x];
            var prevCol = mapCells[map_x - 1];
            var nextCol = mapCells[map_x + 1];
            var sx = i * this.cell_size;
            for (var j = -pad; j <= this.cell_size_y + pad; j++) {
                var map_y = j - vector_vertical;
                var cell_object;

                if (colCells !== undefined && colCells[map_y] !== undefined) {
                    cell_object = colCells[map_y];
                } else {
                    cell_object = new cell_meta(null, i, j, frame_count, CellFlags.BLOCKED);
                    cell_object.my_seed = 100;
                }

                var cell_element = this.rect_elements[frame_count];
                cell_object.cell_element = cell_element;
                cell_object.my_seed_ref = frame_count + my_cache_offset;
                cell_object.my_shortest_path = Number.MAX_SAFE_INTEGER;

                this.all_cells[frame_count] = cell_object;
                this.all_blocked_cells[frame_count] = cell_object.isBlockedType();

                const flags = cell_object.flags;
                const elev = cell_object.elevation !== undefined ? cell_object.elevation : 1;
                const hasDynamic = (flags & (CellFlags.TERRAIN_FLORA | CellFlags.STRUCTURE_ROOF)) !== 0;
                const stateKey = hasDynamic ? -1 : (flags | (elev << 24));

                if (this.slot_state[frame_count] !== stateKey || stateKey === -1 || cell_element._lastClass === null) {
                    this.slot_state[frame_count] = stateKey;
                    this.changed_slots[changedCount++] = frame_count;
                }

                // Directional Prefab Reticle Evaluation (Architecture 1)
                const cat = this.getReticleCategory(cell_object);
                let reticleKey = 0;
                if (cat > 0) {
                    const catN = colCells ? this.getReticleCategory(colCells[map_y - 1]) : 0;
                    const catE = nextCol ? this.getReticleCategory(nextCol[map_y]) : 0;
                    const catS = colCells ? this.getReticleCategory(colCells[map_y + 1]) : 0;
                    const catW = prevCol ? this.getReticleCategory(prevCol[map_y]) : 0;

                    const mask = (catN !== cat ? 1 : 0) | (catE !== cat ? 2 : 0) | (catS !== cat ? 4 : 0) | (catW !== cat ? 8 : 0);
                    if (mask > 0) {
                        reticleKey = (cat << 4) | mask;
                    } else if (cat === 2 || cat === 3) {
                        // Open Water "Pure" Tile Swells (sparse ~25% hash)
                        if (((map_x * 37 + map_y * 17) & 3) === 0) {
                            const delayIdx = (map_x * 19 + map_y * 31) % 70;
                            reticleKey = (cat << 16) | 0x8000 | delayIdx;
                        }
                    }
                }

                if (this.slot_reticle_state[frame_count] !== reticleKey) {
                    this.slot_reticle_state[frame_count] = reticleKey;
                    if (reticleKey === 0) {
                        this.hideSymbolInstance(this.reticle_elements, frame_count);
                    } else if ((reticleKey & 0x8000) !== 0) {
                        const cellCat = (reticleKey >> 16) & 0xFF;
                        const cls = (cellCat === 3) ? "cell_pure_wave pure_wave_shallow" : "cell_pure_wave pure_wave_deep";
                        const delay = -((reticleKey & 0x7F) / 10) + "s";
                        this.ensureSymbolInstance(this.reticle_elements, this.reticles_layer, "#symbol_pure_wave", frame_count, cls, null, delay);
                    } else {
                        const mask = reticleKey & 0xF;
                        const cellCat = (reticleKey >> 4) & 0xF;
                        const isWater = (cellCat === 2 || cellCat === 3);
                        const sym = isWater ? RETICLE_WATER_SYMBOLS[mask] : RETICLE_SYMBOLS[mask];
                        const ang = RETICLE_ANGLES[mask];
                        const cls = RETICLE_CLASSES[cellCat];
                        const sy = j * this.cell_size;
                        const tf = `translate(${sx}, ${sy}) rotate(${ang}, 10, 10)`;
                        this.ensureSymbolInstance(this.reticle_elements, this.reticles_layer, sym, frame_count, cls, tf, null);
                    }
                }

                frame_count++;
            }
        }

        if (this.terrainPathService) {
            this.terrainPathService.updateViewport(this, vector_horizontal, vector_vertical);
        }

        // Phase 4: Dynamic Interior Cutaway & Ambient Lighting
        const occupiedStructure = (typeof StructureRegistry !== 'undefined')
            ? StructureRegistry.getOccupiedInterior(i_agent)
            : null;

        // Pass 1: Release symbol instances only from changed slots
        for (var c = 0; c < changedCount; c++) {
            var k = this.changed_slots[c];
            var cell_object = this.all_cells[k];
            const flags = cell_object.flags;

            const hasStrictBuilding = (flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_PATH)) !== 0;
            const hasStructureDeck = (flags & (CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_FLOOR)) !== 0;
            const hasStructureWall = (flags & (CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_FIXTURE)) !== 0;
            if (!hasStructureDeck) {
                this.hideSymbolInstance(this.bridge_elements, k);
            }
            if (!hasStructureWall) {
                this.hideSymbolInstance(this.structure_elements, k);
            }
            if (!((flags & CellFlags.TREE) !== 0 && (flags & CellFlags.TERRAIN_FLORA) === 0 && !hasStrictBuilding)) {
                this.hideSymbolInstance(this.tree_elements, k);
            }
            if (!((flags & CellFlags.TERRAIN_FLORA) !== 0 && !hasStrictBuilding)) {
                this.hideSymbolInstance(this.flora_elements, k);
            }
            if ((flags & CellFlags.STRUCTURE_ROOF) === 0) {
                this.hideSymbolInstance(this.roof_elements, k);
            }
        }

        // Pass 2: Acquire recycled or new symbol instances only for changed slots
        for (var c = 0; c < changedCount; c++) {
            var k = this.changed_slots[c];
            var cell_object = this.all_cells[k];
            const flags = cell_object.flags;

            cell_object.decorateCell();
            var cell_element = this.rect_elements[k];

            const hasStrictBuilding = (flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_PATH)) !== 0;
            const hasStructureDeck = (flags & (CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_FLOOR)) !== 0;
            const hasStructureWall = (flags & (CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_FIXTURE)) !== 0;

            if (hasStructureDeck) {
                this.ensureSymbolInstance(this.bridge_elements, this.bridges_layer, "#symbol_tile", k, cell_element._lastClass || cell_element.getAttribute('class'));
            }
            if (hasStructureWall) {
                this.ensureSymbolInstance(this.structure_elements, this.structures_layer, "#symbol_tile", k, cell_element._lastClass || cell_element.getAttribute('class'));
            }
            if ((flags & CellFlags.TREE) !== 0 && (flags & CellFlags.TERRAIN_FLORA) === 0 && !hasStrictBuilding) {
                this.ensureSymbolInstance(this.tree_elements, this.features_layer, "#symbol_tree", k, "cell_tree_feature");
            }
            if ((flags & CellFlags.TERRAIN_FLORA) !== 0 && !hasStrictBuilding) {
                var floraEl = this.ensureSymbolInstance(this.flora_elements, this.features_layer, "#symbol_flora", k, "cell_flora_feature");
                const map_x = cell_object.my_x !== undefined ? cell_object.my_x : 0;
                const map_y = cell_object.my_y !== undefined ? cell_object.my_y : 0;
                const jitterX = ((((Math.sin(map_x * 12.9898 + map_y * 78.233) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                const jitterY = ((((Math.cos(map_x * 39.346 + map_y * 11.135) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                const tf = `translate(${jitterX.toFixed(1)}, ${jitterY.toFixed(1)})`;
                if (floraEl._lastTf !== tf) {
                    floraEl.setAttribute("transform", tf);
                    floraEl._lastTf = tf;
                }
            }
            if ((flags & CellFlags.STRUCTURE_ROOF) !== 0) {
                const isCutaway = occupiedStructure && (cell_object.structureId === occupiedStructure.id);
                var roofCls;
                if (isCutaway) {
                    roofCls = 'cell_roof cutaway';
                } else {
                    const isStone = (cell_object.structureId && (cell_object.structureId.includes("watchtower") || cell_object.structureId.includes("catacombs") || cell_object.structureId.includes("dungeon") || cell_object.structureId.includes("shrine")));
                    roofCls = isStone ? 'cell_roof stone occluded' : 'cell_roof timber occluded';
                }
                this.ensureSymbolInstance(this.roof_elements, this.roof_layer, "#symbol_tile", k, roofCls);
            }
        }

        this.flushFreePools();

        // Empty-layer culling
        const toggleLayerVis = (layer, pool) => {
            if (!layer) return;
            const activeCount = layer.childElementCount - this.getFreePool(pool).length;
            const vis = activeCount > 0 ? "block" : "none";
            if (layer._lastVis !== vis) {
                layer.style.display = vis;
                layer._lastVis = vis;
            }
        };
        toggleLayerVis(this.bridges_layer, this.bridge_elements);
        toggleLayerVis(this.structures_layer, this.structure_elements);
        toggleLayerVis(this.roof_layer, this.roof_elements);
        toggleLayerVis(this.reticles_layer, this.reticle_elements);

        if (this.ambient_layer) {
            const ambCls = occupiedStructure ? "ambient_interior active" : "ambient_interior inactive";
            if (this.ambient_layer._lastCls !== ambCls) {
                this.ambient_layer.setAttribute("class", ambCls);
                this.ambient_layer._lastCls = ambCls;
            }
        }

        // Update player avatar appearance and position
        if (this.player_avatar) {
            var avatarClass = "player_avatar";
            if (!this.interactive) {
                avatarClass += " walking";
            } else {
                avatarClass += " idle";
            }
            if (i_agent.agentCellOccupied && i_agent.agentCellOccupied.findDecoration && i_agent.agentCellOccupied.findDecoration("ThinkingAgentDecoration")) {
                avatarClass += " thinking";
            }
            if (this.player_avatar._lastCls !== avatarClass) {
                this.player_avatar.setAttribute("class", avatarClass);
                this.player_avatar._lastCls = avatarClass;
            }

            var centerX = (this.grid_mid_x + 0.5) * this.cell_size;
            var centerY = (this.grid_mid_y + 0.5) * this.cell_size;
            var avatarTf = `translate(${centerX}, ${centerY})`;
            if (this.player_avatar._lastTf !== avatarTf) {
                this.player_avatar.setAttribute("transform", avatarTf);
                this.player_avatar._lastTf = avatarTf;
            }
        }

        if (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells && globalMapObject.map_cells[i_agent.x] && globalMapObject.map_cells[i_agent.x][i_agent.y]) {
            i_agent.agentCellOccupied = globalMapObject.map_cells[i_agent.x][i_agent.y];
        } else if (this.all_cells && this.all_cells[this.grid_mid_cell]) {
            i_agent.agentCellOccupied = this.all_cells[this.grid_mid_cell];
        } else if (this.all_cells && this.all_cells.length > 0) {
            i_agent.agentCellOccupied = this.all_cells[0];
        }
    }

    setSunAzimuth(deg) {
        if (this.terrainPathService && typeof this.terrainPathService.setSunAzimuth === 'function') {
            this.terrainPathService.setSunAzimuth(deg);
        }
    }
}

if (typeof window !== 'undefined') {
    window.frame_meta = frame_meta;
    window.setSunAzimuth = (deg) => {
        if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof globalGridObject.setSunAzimuth === 'function') {
            globalGridObject.setSunAzimuth(deg);
        }
    };
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { frame_meta, RETICLE_SYMBOLS, RETICLE_ANGLES, RETICLE_CLASSES };
}
