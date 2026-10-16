class frame_meta {
    frame_element;
    tiles_layer;
    chasm_layer;
    cliff_layer;
    water_layer;
    curves_layer;
    ramp_layer;
    bridges_layer;
    features_layer;
    player_layer;
    roof_layer;
    ambient_layer;
    player_avatar;
    player_rotator;
    frame_size_width = 0;
    frame_size_height = 0;
    cell_size = 20;
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
    tree_elements = new Array();
    flora_elements = new Array();
    roof_elements = new Array();
    elev2_layer;
    elev3_layer;

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

        // SVG Metasurface / Metaball Organic Fusion Filter with Natural Procedural Waves
        const createTerrainFilter = (id, baseFreq, scale, octaves = 2, blurDev = "2.2", type = "fractalNoise") => {
            var f = create_svg_element("filter");
            f.setAttribute("id", id);
            f.setAttribute("x", "-20%");
            f.setAttribute("y", "-20%");
            f.setAttribute("width", "140%");
            f.setAttribute("height", "140%");

            var turb = create_svg_element("feTurbulence");
            turb.setAttribute("type", type);
            turb.setAttribute("baseFrequency", baseFreq);
            turb.setAttribute("numOctaves", octaves);
            turb.setAttribute("result", "turb");
            f.appendChild(turb);

            var disp = create_svg_element("feDisplacementMap");
            disp.setAttribute("in", "SourceGraphic");
            disp.setAttribute("in2", "turb");
            disp.setAttribute("scale", scale);
            disp.setAttribute("xChannelSelector", "R");
            disp.setAttribute("yChannelSelector", "G");
            disp.setAttribute("result", "disp");
            f.appendChild(disp);

            var blur = create_svg_element("feGaussianBlur");
            blur.setAttribute("in", "disp");
            blur.setAttribute("stdDeviation", blurDev);
            blur.setAttribute("result", "blur");
            f.appendChild(blur);

            var mat = create_svg_element("feColorMatrix");
            mat.setAttribute("in", "blur");
            mat.setAttribute("mode", "matrix");
            mat.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9");
            mat.setAttribute("result", "fused");
            f.appendChild(mat);

            return f;
        };

        // 1. Organic rolling meadow waves for grass
        defs.appendChild(createTerrainFilter("terrain_smooth_grass", "0.035", "4.0", 2, "15.5", "fractalNoise"));

        // 1b. Mountain highlands plateau (1st layer mountain)
        defs.appendChild(createTerrainFilter("terrain_smooth_elev2", "0.038", "4.2", 2, "15.5", "fractalNoise"));

        // 1c. Mountain crags & peaks (2nd layer mountain)
        defs.appendChild(createTerrainFilter("terrain_smooth_elev3", "0.045", "4.5", 2, "14.0", "fractalNoise"));

        // 2. Gentle meandering fluid waves for rivers
        defs.appendChild(createTerrainFilter("terrain_smooth_water", "0.025", "3.5", 2, "15.5", "fractalNoise"));

        // 3. Craggy, jagged tectonic fracture noise for canyons
        defs.appendChild(createTerrainFilter("terrain_smooth_chasm", "0.060", "5.0", 3, "15.2", "turbulence"));

        // 4. Rocky escarpment fracture noise for cliffs
        defs.appendChild(createTerrainFilter("terrain_smooth_cliff", "0.050", "4.2", 2, "15.8", "turbulence"));

        // 5. Natural earthen slope waves for ramps
        defs.appendChild(createTerrainFilter("terrain_smooth_ramp", "0.040", "3.5", 2, "5.8", "fractalNoise"));

        this.frame_element.appendChild(defs);

        // Layer 1: Tiles layer for world tiles with smooth transform
        this.tiles_layer = create_svg_element("g");
        this.tiles_layer.setAttribute("id", "tiles_layer");
        this.frame_element.appendChild(this.tiles_layer);

        // Layer 1a: Canyon chasm contour curves layer (Craggy tectonic metasurface)
        this.chasm_layer = create_svg_element("g");
        this.chasm_layer.setAttribute("id", "chasm_layer");
        this.chasm_layer.setAttribute("filter", "url(#terrain_smooth_chasm)");
        this.chasm_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.chasm_layer);

        // Layer 1b: Rocky cliff flank contour layer (Fractured escarpment metasurface)
        this.cliff_layer = create_svg_element("g");
        this.cliff_layer.setAttribute("id", "cliff_layer");
        this.cliff_layer.setAttribute("filter", "url(#terrain_smooth_cliff)");
        this.cliff_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.cliff_layer);

        // Layer 1c: River water contour curves layer (Meandering fluid metasurface)
        this.water_layer = create_svg_element("g");
        this.water_layer.setAttribute("id", "water_layer");
        this.water_layer.setAttribute("filter", "url(#terrain_smooth_water)");
        this.water_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.water_layer);

        // Layer 1d: Terrain contour curves layer (Organic rolling meadow metasurface)
        this.curves_layer = create_svg_element("g");
        this.curves_layer.setAttribute("id", "curves_layer");
        this.curves_layer.setAttribute("filter", "url(#terrain_smooth_grass)");
        this.curves_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.curves_layer);

        // Layer 1d-2: Mountain Highlands Contour layer (1st layer mountain plateau)
        this.elev2_layer = create_svg_element("g");
        this.elev2_layer.setAttribute("id", "elev2_layer");
        this.elev2_layer.setAttribute("filter", "url(#terrain_smooth_elev2)");
        this.elev2_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.elev2_layer);

        // Layer 1d-3: Mountain Peaks Contour layer (2nd layer mountain crags)
        this.elev3_layer = create_svg_element("g");
        this.elev3_layer.setAttribute("id", "elev3_layer");
        this.elev3_layer.setAttribute("filter", "url(#terrain_smooth_elev3)");
        this.elev3_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.elev3_layer);

        // Layer 1e: Terrain ramp contour layer (Earthen slope metasurface)
        this.ramp_layer = create_svg_element("g");
        this.ramp_layer.setAttribute("id", "ramp_layer");
        this.ramp_layer.setAttribute("filter", "url(#terrain_smooth_ramp)");
        this.ramp_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.ramp_layer);

        // Layer 1f: Bridges layer (Engineered bridges cleanly span over contours)
        this.bridges_layer = create_svg_element("g");
        this.bridges_layer.setAttribute("id", "bridges_layer");
        this.bridges_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.bridges_layer);

        // Layer 1e: Organic features layer (Tree canopies & Riparian flora shrubs)
        this.features_layer = create_svg_element("g");
        this.features_layer.setAttribute("id", "features_layer");
        this.features_layer.style.pointerEvents = "none";
        this.frame_element.appendChild(this.features_layer);

        // Layer 2: Player layer for avatar
        this.player_layer = create_svg_element("g");
        this.player_layer.setAttribute("id", "player_layer");
        this.frame_element.appendChild(this.player_layer);

        // Layer 3: Overhead Roof layer for occlusion and cutaways (Phase 4)
        this.roof_layer = create_svg_element("g");
        this.roof_layer.setAttribute("id", "roof_layer");
        this.roof_layer.style.pointerEvents = "none";
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
        this.chasm_elements = new Array();
        this.cliff_elements = new Array();
        this.water_elements = new Array();
        this.contour_elements = new Array();
        this.elev2_elements = new Array();
        this.elev3_elements = new Array();
        this.ramp_elements = new Array();
        this.bridge_elements = new Array();
        this.tree_elements = new Array();
        this.flora_elements = new Array();
        this.roof_elements = new Array();
        this.all_cells = new Array();
        this.all_blocked_cells = new Array();

        // 3-tile margin buffer on all sides to prevent edge clipping during wide blur and subpixel slide
        var pad = 3;
        var frame_count = 0;
        for (var i = -pad; i <= this.cell_size_x + pad; i++) {
            for (var j = -pad; j <= this.cell_size_y + pad; j++) {
                var cell_element = create_svg_element("rect");
                cell_element.setAttribute('meta-frame', frame_count);
                cell_element.setAttribute('class', "cell");
                cell_element.setAttribute('x', (i * this.cell_size) + "px");
                cell_element.setAttribute('y', (j * this.cell_size) + "px");
                cell_element.setAttribute('height', this.cell_size + "px");
                cell_element.setAttribute('width', this.cell_size + "px");

                cell_element.addEventListener("click", this.handleCellClick.bind(this, cell_element));

                this.tiles_layer.appendChild(cell_element);
                this.rect_elements[frame_count] = cell_element;

                // Organic canyon chasm contour element (Fused organic metasurface)
                var chasm_element = create_svg_element("rect");
                chasm_element.setAttribute('meta-chasm-frame', frame_count);
                chasm_element.setAttribute('class', "terrain_contour contour_chasm");
                chasm_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                chasm_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                chasm_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                chasm_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                chasm_element.setAttribute('rx', "3px");
                chasm_element.setAttribute('ry', "3px");
                chasm_element.style.display = "none";
                chasm_element.style.pointerEvents = "none";
                this.chasm_layer.appendChild(chasm_element);
                this.chasm_elements[frame_count] = chasm_element;

                // Organic rocky cliff contour element (Fractured escarpment metasurface)
                var cliff_element = create_svg_element("rect");
                cliff_element.setAttribute('meta-cliff-frame', frame_count);
                cliff_element.setAttribute('class', "terrain_contour contour_cliff");
                cliff_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                cliff_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                cliff_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                cliff_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                cliff_element.setAttribute('rx', "3px");
                cliff_element.setAttribute('ry', "3px");
                cliff_element.style.display = "none";
                cliff_element.style.pointerEvents = "none";
                this.cliff_layer.appendChild(cliff_element);
                this.cliff_elements[frame_count] = cliff_element;

                // Organic river water contour element (Fused organic metasurface)
                var water_element = create_svg_element("rect");
                water_element.setAttribute('meta-water-frame', frame_count);
                water_element.setAttribute('class', "terrain_contour contour_water");
                water_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                water_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                water_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                water_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                water_element.setAttribute('rx', "3px");
                water_element.setAttribute('ry', "3px");
                water_element.style.display = "none";
                water_element.style.pointerEvents = "none";
                this.water_layer.appendChild(water_element);
                this.water_elements[frame_count] = water_element;

                // Organic terrain contour element (Fused organic metasurface)
                var contour_element = create_svg_element("rect");
                contour_element.setAttribute('meta-contour-frame', frame_count);
                contour_element.setAttribute('class', "terrain_contour");
                contour_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                contour_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                contour_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                contour_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                contour_element.setAttribute('rx', "3px");
                contour_element.setAttribute('ry', "3px");
                contour_element.style.display = "none";
                contour_element.style.pointerEvents = "none";
                this.curves_layer.appendChild(contour_element);
                this.contour_elements[frame_count] = contour_element;

                // Organic mountain highlands contour element (1st layer mountain plateau)
                var elev2_element = create_svg_element("rect");
                elev2_element.setAttribute('meta-elev2-frame', frame_count);
                elev2_element.setAttribute('class', "terrain_contour contour_elev_2");
                elev2_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                elev2_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                elev2_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                elev2_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                elev2_element.setAttribute('rx', "3px");
                elev2_element.setAttribute('ry', "3px");
                elev2_element.style.display = "none";
                elev2_element.style.pointerEvents = "none";
                this.elev2_layer.appendChild(elev2_element);
                this.elev2_elements[frame_count] = elev2_element;

                // Organic mountain peaks contour element (2nd layer mountain crags)
                var elev3_element = create_svg_element("rect");
                elev3_element.setAttribute('meta-elev3-frame', frame_count);
                elev3_element.setAttribute('class', "terrain_contour contour_elev_3");
                elev3_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                elev3_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                elev3_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                elev3_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                elev3_element.setAttribute('rx', "3px");
                elev3_element.setAttribute('ry', "3px");
                elev3_element.style.display = "none";
                elev3_element.style.pointerEvents = "none";
                this.elev3_layer.appendChild(elev3_element);
                this.elev3_elements[frame_count] = elev3_element;

                // Organic earthen ramp contour element (Earthen slope metasurface)
                var ramp_element = create_svg_element("rect");
                ramp_element.setAttribute('meta-ramp-frame', frame_count);
                ramp_element.setAttribute('class', "terrain_contour contour_ramp");
                ramp_element.setAttribute('x', (i * this.cell_size - 0.75) + "px");
                ramp_element.setAttribute('y', (j * this.cell_size - 0.75) + "px");
                ramp_element.setAttribute('width', (this.cell_size + 1.5) + "px");
                ramp_element.setAttribute('height', (this.cell_size + 1.5) + "px");
                ramp_element.setAttribute('rx', "3px");
                ramp_element.setAttribute('ry', "3px");
                ramp_element.style.display = "none";
                ramp_element.style.pointerEvents = "none";
                this.ramp_layer.appendChild(ramp_element);
                this.ramp_elements[frame_count] = ramp_element;

                // Engineered bridge span overlay element
                var bridge_element = create_svg_element("rect");
                bridge_element.setAttribute('meta-bridge-frame', frame_count);
                bridge_element.setAttribute('x', (i * this.cell_size) + "px");
                bridge_element.setAttribute('y', (j * this.cell_size) + "px");
                bridge_element.setAttribute('height', this.cell_size + "px");
                bridge_element.setAttribute('width', this.cell_size + "px");
                bridge_element.style.display = "none";
                bridge_element.style.pointerEvents = "none";
                this.bridges_layer.appendChild(bridge_element);
                this.bridge_elements[frame_count] = bridge_element;

                // Circular tree canopy feature element (nested within grass ground)
                var tree_element = create_svg_element("g");
                tree_element.setAttribute('meta-tree-frame', frame_count);
                tree_element.setAttribute('class', "cell_tree_feature");
                tree_element.style.display = "none";
                tree_element.style.pointerEvents = "none";

                var tree_shadow = create_svg_element("circle");
                tree_shadow.setAttribute('cx', (i * this.cell_size + this.cell_size / 2) + "px");
                tree_shadow.setAttribute('cy', (j * this.cell_size + this.cell_size / 2 + 1.5) + "px");
                tree_shadow.setAttribute('r', (this.cell_size * 0.40) + "px");
                tree_shadow.setAttribute('class', "tree_shadow");
                tree_element.appendChild(tree_shadow);

                var tree_canopy = create_svg_element("circle");
                tree_canopy.setAttribute('cx', (i * this.cell_size + this.cell_size / 2) + "px");
                tree_canopy.setAttribute('cy', (j * this.cell_size + this.cell_size / 2) + "px");
                tree_canopy.setAttribute('r', (this.cell_size * 0.38) + "px");
                tree_canopy.setAttribute('class', "tree_canopy");
                tree_element.appendChild(tree_canopy);

                var tree_trunk = create_svg_element("circle");
                tree_trunk.setAttribute('cx', (i * this.cell_size + this.cell_size / 2) + "px");
                tree_trunk.setAttribute('cy', (j * this.cell_size + this.cell_size / 2) + "px");
                tree_trunk.setAttribute('r', (this.cell_size * 0.10) + "px");
                tree_trunk.setAttribute('class', "tree_trunk");
                tree_element.appendChild(tree_trunk);

                this.features_layer.appendChild(tree_element);
                this.tree_elements[frame_count] = tree_element;

                // Standalone Riparian Flora shrub/bush feature element
                var flora_element = create_svg_element("g");
                flora_element.setAttribute('meta-flora-frame', frame_count);
                flora_element.setAttribute('class', "cell_flora_feature");
                flora_element.style.display = "none";
                flora_element.style.pointerEvents = "none";

                var shrub_shadow = create_svg_element("ellipse");
                shrub_shadow.setAttribute('cx', (i * this.cell_size + this.cell_size / 2) + "px");
                shrub_shadow.setAttribute('cy', (j * this.cell_size + this.cell_size / 2 + 1.5) + "px");
                shrub_shadow.setAttribute('rx', (this.cell_size * 0.28) + "px");
                shrub_shadow.setAttribute('ry', (this.cell_size * 0.20) + "px");
                shrub_shadow.setAttribute('class', "shrub_shadow");
                flora_element.appendChild(shrub_shadow);

                var flora_shrub_base = create_svg_element("circle");
                flora_shrub_base.setAttribute('cx', (i * this.cell_size + this.cell_size / 2 - 1.5) + "px");
                flora_shrub_base.setAttribute('cy', (j * this.cell_size + this.cell_size / 2 + 0.5) + "px");
                flora_shrub_base.setAttribute('r', (this.cell_size * 0.18) + "px");
                flora_shrub_base.setAttribute('class', "flora_shrub");
                flora_element.appendChild(flora_shrub_base);

                var flora_shrub = create_svg_element("circle");
                flora_shrub.setAttribute('cx', (i * this.cell_size + this.cell_size / 2 + 1) + "px");
                flora_shrub.setAttribute('cy', (j * this.cell_size + this.cell_size / 2 - 0.5) + "px");
                flora_shrub.setAttribute('r', (this.cell_size * 0.22) + "px");
                flora_shrub.setAttribute('class', "flora_shrub");
                flora_element.appendChild(flora_shrub);

                var flora_highlight = create_svg_element("circle");
                flora_highlight.setAttribute('cx', (i * this.cell_size + this.cell_size / 2 + 0.2) + "px");
                flora_highlight.setAttribute('cy', (j * this.cell_size + this.cell_size / 2 - 1.8) + "px");
                flora_highlight.setAttribute('r', (this.cell_size * 0.08) + "px");
                flora_highlight.setAttribute('class', "flora_highlight");
                flora_element.appendChild(flora_highlight);

                this.features_layer.appendChild(flora_element);
                this.flora_elements[frame_count] = flora_element;

                // Overhead roof element in secondary virtual layer
                var roof_element = create_svg_element("rect");
                roof_element.setAttribute('meta-roof-frame', frame_count);
                roof_element.setAttribute('class', "cell_roof");
                roof_element.setAttribute('x', (i * this.cell_size) + "px");
                roof_element.setAttribute('y', (j * this.cell_size) + "px");
                roof_element.setAttribute('height', this.cell_size + "px");
                roof_element.setAttribute('width', this.cell_size + "px");
                roof_element.style.pointerEvents = "none";

                this.roof_layer.appendChild(roof_element);
                this.roof_elements[frame_count] = roof_element;

                if (i === this.grid_mid_x && j === this.grid_mid_y) {
                    this.grid_mid_cell = frame_count;
                }

                frame_count++;
            }
        }

        this.updateGrid(i_agent, interactive);
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

        // Outer state ring / halo
        var ring = create_svg_element("circle");
        ring.setAttribute("class", "player_ring");
        ring.setAttribute("cx", "0");
        ring.setAttribute("cy", "0");
        ring.setAttribute("r", "8.5");
        this.player_rotator.appendChild(ring);

        // Main body
        var body = create_svg_element("circle");
        body.setAttribute("class", "player_body");
        body.setAttribute("cx", "0");
        body.setAttribute("cy", "0");
        body.setAttribute("r", "6.5");
        this.player_rotator.appendChild(body);

        // Directional pointer / visor facing East (+x, 0 deg)
        var visor = create_svg_element("path");
        visor.setAttribute("class", "player_visor");
        visor.setAttribute("d", "M 1 -4.5 L 8.5 0 L 1 4.5 L 3 0 Z");
        this.player_rotator.appendChild(visor);

        // Center core
        var core = create_svg_element("circle");
        core.setAttribute("class", "player_core");
        core.setAttribute("cx", "0");
        core.setAttribute("cy", "0");
        core.setAttribute("r", "2");
        this.player_rotator.appendChild(core);

        this.player_avatar.appendChild(this.player_rotator);
        this.player_layer.appendChild(this.player_avatar);
    }

    setPlayerRotation(deg) {
        if (this.player_rotator) {
            this.player_rotator.style.transform = `rotate(${deg}deg)`;
        }
    }

    setViewportShift(shiftX, shiftY) {
        const applyShift = (layer) => {
            if (!layer) return;
            if (shiftX === 0 && shiftY === 0) {
                layer.removeAttribute("transform");
            } else {
                layer.setAttribute("transform", `translate(${shiftX.toFixed(2)}, ${shiftY.toFixed(2)})`);
            }
        };
        applyShift(this.tiles_layer);
        applyShift(this.chasm_layer);
        applyShift(this.cliff_layer);
        applyShift(this.water_layer);
        applyShift(this.curves_layer);
        applyShift(this.elev2_layer);
        applyShift(this.elev3_layer);
        applyShift(this.ramp_layer);
        applyShift(this.bridges_layer);
        applyShift(this.features_layer);
        applyShift(this.roof_layer);
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

        for (var k = 0; k < this.all_cells.length; k++) {
            if (this.all_cells[k]) {
                this.all_cells[k].getCellMeta().cell_element = null;
            }
        }

        var pad = 3;
        var frame_count = 0;
        for (var i = -pad; i <= this.cell_size_x + pad; i++) {
            for (var j = -pad; j <= this.cell_size_y + pad; j++) {
                var map_x = i - vector_horizontal;
                var map_y = j - vector_vertical;
                var cell_object;

                if (typeof globalMapObject.map_cells[map_x] !== 'undefined'
                    && typeof globalMapObject.map_cells[map_x][map_y] !== 'undefined') {
                    cell_object = globalMapObject.map_cells[map_x][map_y];
                } else {
                    cell_object = new cell_meta(null, i, j, frame_count, CellFlags.BLOCKED);
                }

                var cell_element = this.rect_elements[frame_count];
                cell_element.setAttribute('meta-seed-ref', frame_count + my_cache_offset);

                var meta = cell_object.getCellMeta();
                meta.cell_element = cell_element;
                meta.my_seed_ref = frame_count + my_cache_offset;
                meta.my_shortest_path = Number.MAX_SAFE_INTEGER;

                if (typeof globalMapObject.map_cells[map_x] === 'undefined' || typeof globalMapObject.map_cells[map_x][map_y] === 'undefined') {
                    cell_object.my_seed = 100;
                }

                this.all_cells[frame_count] = cell_object;
                this.all_blocked_cells[frame_count] = cell_object.isBlockedType();
                frame_count++;
            }
        }

        // Phase 4: Dynamic Interior Cutaway & Ambient Lighting
        const occupiedStructure = (typeof StructureRegistry !== 'undefined')
            ? StructureRegistry.getOccupiedInterior(i_agent)
            : null;

        for (var k = 0; k < this.all_cells.length; k++) {
            this.all_cells[k].decorateCell(new Array());

            var cell_element = this.rect_elements[k];
            var chasm_element = this.chasm_elements ? this.chasm_elements[k] : null;
            var cliff_element = this.cliff_elements ? this.cliff_elements[k] : null;
            var water_element = this.water_elements ? this.water_elements[k] : null;
            var contour_element = this.contour_elements ? this.contour_elements[k] : null;
            var elev2_element = this.elev2_elements ? this.elev2_elements[k] : null;
            var elev3_element = this.elev3_elements ? this.elev3_elements[k] : null;
            var ramp_element = this.ramp_elements ? this.ramp_elements[k] : null;
            var bridge_element = this.bridge_elements ? this.bridge_elements[k] : null;
            var tree_element = this.tree_elements ? this.tree_elements[k] : null;
            var flora_element = this.flora_elements ? this.flora_elements[k] : null;
            var roof_element = this.roof_elements[k];
            var cell_object = this.all_cells[k];

            if (cell_object) {
                const hasStrictBuilding = (cell_object.flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_PATH)) !== 0;
                const isWaterOrChasm = (cell_object.flags & (CellFlags.WATER | CellFlags.CHASM)) !== 0;
                const isCliffOrRamp = (cell_object.flags & (CellFlags.TERRAIN_CLIFF | CellFlags.TERRAIN_RAMP)) !== 0;
                const isSelectedOrPath = (cell_object.flags & (CellFlags.SELECTED | CellFlags.THINKING | CellFlags.WALKING)) !== 0;

                // Canyon Chasm Contour Overlay (Deep tectonic gorge)
                if (chasm_element) {
                    if (cell_object.hasFlag(CellFlags.CHASM) && !hasStrictBuilding && !isSelectedOrPath) {
                        chasm_element.style.display = "block";
                    } else {
                        chasm_element.style.display = "none";
                    }
                }

                // Rocky Cliff Contour Overlay (Fractured rocky escarpment)
                if (cliff_element) {
                    if (cell_object.hasFlag(CellFlags.TERRAIN_CLIFF) && !cell_object.hasFlag(CellFlags.CHASM) && !hasStrictBuilding && !isSelectedOrPath) {
                        cliff_element.style.display = "block";
                    } else {
                        cliff_element.style.display = "none";
                    }
                }

                // River Water Contour Overlay (Meandering fluid stream)
                if (water_element) {
                    if (cell_object.hasFlag(CellFlags.WATER) && !hasStrictBuilding && !isSelectedOrPath) {
                        if (cell_object.hasFlag(CellFlags.WATER_SHALLOW)) {
                            water_element.setAttribute("class", "terrain_contour contour_water_shallow");
                        } else {
                            water_element.setAttribute("class", "terrain_contour contour_water");
                        }
                        water_element.style.display = "block";
                    } else {
                        water_element.style.display = "none";
                    }
                }

                // Terrestrial Grass Biome (Curves Layer - Lowlands grass meadows)
                if (contour_element) {
                    const isGrassBiome = cell_object.hasFlag(CellFlags.GRASS) || cell_object.hasFlag(CellFlags.TREE) || cell_object.hasFlag(CellFlags.TERRAIN_FLORA);
                    if (isGrassBiome && !hasStrictBuilding && !isWaterOrChasm && !isCliffOrRamp && !isSelectedOrPath) {
                        contour_element.setAttribute("class", "terrain_contour contour_grass");
                        contour_element.style.display = "block";
                    } else {
                        contour_element.style.display = "none";
                    }
                }

                // Mountain Highlands (Elev2 Layer - 1st Layer Mountain Plateau)
                if (elev2_element) {
                    if (!hasStrictBuilding && !isWaterOrChasm && !isCliffOrRamp && !isSelectedOrPath && cell_object.elevation >= 2) {
                        elev2_element.style.display = "block";
                    } else {
                        elev2_element.style.display = "none";
                    }
                }

                // Mountain Peaks (Elev3 Layer - 2nd Layer Mountain Crags)
                if (elev3_element) {
                    if (!hasStrictBuilding && !isWaterOrChasm && !isCliffOrRamp && !isSelectedOrPath && cell_object.elevation >= 3) {
                        elev3_element.style.display = "block";
                    } else {
                        elev3_element.style.display = "none";
                    }
                }

                // Earthen Terrain Ramp Overlay (Natural slope waves connecting elevation tiers)
                if (ramp_element) {
                    if (cell_object.hasFlag(CellFlags.TERRAIN_RAMP) && !hasStrictBuilding && !isSelectedOrPath) {
                        ramp_element.style.display = "block";
                    } else {
                        ramp_element.style.display = "none";
                    }
                }

                // Engineered Structures, Paths & Bridges (Cleanly spans over organic contours)
                if (bridge_element) {
                    const hasStructureDeck = (cell_object.flags & (CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH | CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR_OPEN | CellFlags.STRUCTURE_BARRICADE | CellFlags.STRUCTURE_FIXTURE)) !== 0;
                    if (hasStructureDeck) {
                        bridge_element.style.display = "block";
                        bridge_element.setAttribute('class', cell_element.getAttribute('class'));
                    } else {
                        bridge_element.style.display = "none";
                    }
                }

                // Circular Tree Canopies (nested within grass ground)
                if (tree_element) {
                    if (cell_object.hasFlag(CellFlags.TREE) && !cell_object.hasFlag(CellFlags.TERRAIN_FLORA) && !hasStrictBuilding) {
                        tree_element.style.display = "block";
                    } else {
                        tree_element.style.display = "none";
                    }
                }

                // Standalone Riparian Flora Shrub / Bush Feature
                if (flora_element) {
                    if (cell_object.hasFlag(CellFlags.TERRAIN_FLORA) && !hasStrictBuilding) {
                        const map_x = cell_object.my_x !== undefined ? cell_object.my_x : 0;
                        const map_y = cell_object.my_y !== undefined ? cell_object.my_y : 0;
                        const jitterX = ((((Math.sin(map_x * 12.9898 + map_y * 78.233) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                        const jitterY = ((((Math.cos(map_x * 39.346 + map_y * 11.135) * 43758.5453) % 1 + 1) % 1) - 0.5) * 5;
                        flora_element.setAttribute("transform", `translate(${jitterX.toFixed(1)}, ${jitterY.toFixed(1)})`);
                        flora_element.style.display = "block";
                    } else {
                        flora_element.style.display = "none";
                    }
                }

                // Overhead Roof Cutaway
                if (roof_element) {
                    if (cell_object.hasFlag(CellFlags.STRUCTURE_ROOF)) {
                        roof_element.style.display = "block";
                        const isCutaway = occupiedStructure && (cell_object.structureId === occupiedStructure.id);
                        if (isCutaway) {
                            roof_element.setAttribute('class', 'cell_roof cutaway');
                        } else {
                            const isStone = (cell_object.structureId && (cell_object.structureId.includes("watchtower") || cell_object.structureId.includes("catacombs") || cell_object.structureId.includes("dungeon") || cell_object.structureId.includes("shrine")));
                            roof_element.setAttribute('class', isStone ? 'cell_roof stone occluded' : 'cell_roof timber occluded');
                        }
                    } else {
                        roof_element.style.display = "none";
                    }
                }
            }
        }

        if (this.ambient_layer) {
            if (occupiedStructure) {
                this.ambient_layer.setAttribute("class", "ambient_interior active");
            } else {
                this.ambient_layer.setAttribute("class", "ambient_interior inactive");
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
            this.player_avatar.setAttribute("class", avatarClass);

            var centerX = (this.grid_mid_x + 0.5) * this.cell_size;
            var centerY = (this.grid_mid_y + 0.5) * this.cell_size;
            this.player_avatar.setAttribute("transform", `translate(${centerX}, ${centerY})`);
        }

        i_agent.agentCellOccupied = this.all_cells[this.grid_mid_cell];
    }
}
