
class mapObject {
    rand_cache = new Array();
    map_cells = new Array();
    all_blocked_cells = new Array();
    all_grass_cells = new Array();
    all_agents = new Array();
    structures = new Array();
    min_width;
    max_width;
    min_height;
    max_height;
    seeds = [];
    prng = null;

    constructor(map_width, map_height, seeds = null, ...rest) {
        this.min_width = (map_width / 2) * -1;
        this.max_width = map_width / 2;
        this.min_height = (map_height / 2) * -1;
        this.max_height = map_height / 2;

        // Initialize deterministic root seeds
        if (seeds && Array.isArray(seeds) && seeds.length >= 4) {
            this.seeds = [...seeds];
        } else if (typeof seeds === 'number' && rest.length >= 3) {
            this.seeds = [seeds, rest[0], rest[1], rest[2]];
        } else if (typeof seed_a !== 'undefined' && typeof seed_b !== 'undefined' && typeof seed_c !== 'undefined' && typeof seed_d !== 'undefined') {
            this.seeds = [seed_a, seed_b, seed_c, seed_d];
        } else if (typeof globalThis !== 'undefined' && globalThis.seed_a && globalThis.seed_b) {
            this.seeds = [globalThis.seed_a, globalThis.seed_b, globalThis.seed_c, globalThis.seed_d];
        } else {
            const randSeed = () => (Math.random() * 2 ** 32) >>> 0;
            this.seeds = [randSeed(), randSeed(), randSeed(), randSeed()];
        }

        if (typeof sfc32 === 'function') {
            this.prng = sfc32(this.seeds[0], this.seeds[1], this.seeds[2], this.seeds[3]);
        }

        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                if (typeof this.rand_cache[i] === 'undefined') {
                    this.rand_cache[i] = new Array();
                }
                this.rand_cache[i][j] = this.getRandom() * 100;
            }
        }
        var frame_count = 0;

        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                var cell_object = new cell_meta(null, i, j, frame_count);
                if (typeof this.rand_cache[i] === 'undefined' || typeof this.rand_cache[i][j] === 'undefined') {
                    cell_object.my_seed = 100;
                } else {
                    cell_object.my_seed = this.rand_cache[i][j];
                }
                if (typeof this.map_cells[i] === 'undefined') {
                    this.map_cells[i] = new Array();
                }
                if (cell_object.my_seed > 90) {
                    //cell_object.addFlag(CellFlags.BLOCKED);
                }
                if (cell_object.my_seed.toFixed(1) == 59.7) {
                    if (typeof this.all_grass_cells[i] === 'undefined') {
                        this.all_grass_cells[i] = new Array();
                    }
                    cell_object.addFlag(CellFlags.GRASS);
                    this.all_grass_cells[i][j] = "grass";
                }
                this.map_cells[i][j] = cell_object;
                frame_count++;
            }
        }
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                let this_cell = this.map_cells[i][j].getCellMeta();
                this_cell.determineNeighboursPassable(this);
            }
        }
        var grass_size = 10;
        for (const [key, value] of Object.entries(this.all_grass_cells)) {
            for (const [inner_key, inner_value] of Object.entries(value)) {
                var grass_cell = this.map_cells[key][inner_key];
                var this_selection = new Array();
                var key_int = parseInt(key);
                var inner_key_int = parseInt(inner_key);
                for (var i = key_int - grass_size; i < key_int + grass_size; i++) {
                    for (var j = inner_key_int - grass_size; j < inner_key_int + grass_size; j++) {
                        if (typeof this.map_cells[i] === 'undefined' || typeof this.map_cells[i][j] === 'undefined') {
                            continue;
                        }
                        var thisMapCell = this.map_cells[i][j];
                        var distance = thisMapCell.getDistance(grass_cell);
                        if (distance > 10) {
                            continue;
                        }
                        this_selection[thisMapCell.getCellMeta().my_cell_ref] = thisMapCell;
                    }
                }
                for (const [grass_key, grass_value] of Object.entries(this_selection)) {
                    var cell = grass_value.getCellMeta();
                    cell.addFlag(CellFlags.GRASS);
                    if (Math.round(cell.my_seed) % 100 < 15) {
                        cell.addFlag(CellFlags.TREE);
                    }
                    if (cell.my_seed < 0.1) {
                        cell.addFlag(CellFlags.ENEMY);
                        this.all_agents.push(cell);
                    }
                    this.map_cells[cell.my_x][cell.my_y] = cell;
                }
            }
        }
        this.structures = [];
        if (typeof ElevationService !== 'undefined' && typeof ElevationService.initializeRidges === 'function') {
            ElevationService.initializeRidges(this);
        }
        if (typeof RiverGenerator !== 'undefined') {
            RiverGenerator.generateHydrology(this);
        }
        if (typeof ElevationService !== 'undefined') {
            ElevationService.generateHeightmap(this);
        }
        if (typeof CanyonGenerator !== 'undefined') {
            CanyonGenerator.generateCanyons(this);
        }
        if (typeof WorldStructurePlacer !== 'undefined') {
            WorldStructurePlacer.populateWorld(this);
        } else if (typeof StructureStamper !== 'undefined' && typeof StructureLibrary !== 'undefined') {
            StructureStamper.stampStarterSettlement(this);
        }
        if (typeof BridgePlacer !== 'undefined') {
            BridgePlacer.processRiverCrossings(this);
        }
        if (typeof RiparianEcologyService !== 'undefined') {
            RiparianEcologyService.integrateGeomorphicWorld(this);
        }
        for (var i = this.min_width; i < this.max_width; i++) {
            for (var j = this.min_height; j < this.max_height; j++) {
                let this_cell = this.map_cells[i][j].getCellMeta();
                this_cell.my_step_option = new Array();
                this_cell.determineNeighboursPassable(this);
            }
        }
    }

    /**
     * Returns a seeded pseudo-random float in [0, 1) tied to the map's root seed.
     * @returns {number}
     */
    getRandom() {
        if (this.prng) {
            return this.prng();
        }
        if (typeof getRand === 'function') {
            return getRand();
        }
        return Math.random();
    }

    /**
     * Computes a 32-bit FNV-1a integer hash from any string or number input.
     * @param {*} value 
     * @returns {number}
     */
    hashInt(value) {
        let h = 2166136261 >>> 0;
        const str = String(value);
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }

    /**
     * Deterministically calculates candidate placement coordinates for a structure retry attempt based on map seeds.
     * @param {string} salt Unique structure identifier (e.g. blueprint id or category)
     * @param {number} attempt Attempt index (0, 1, 2, ...)
     * @param {number} minX Minimum X bound
     * @param {number} maxX Maximum X bound
     * @param {number} minY Minimum Y bound
     * @param {number} maxY Maximum Y bound
     * @returns {{x: number, y: number}}
     */
    getCandidateCoord(salt, attempt, minX, maxX, minY, maxY) {
        const rootSeed = (this.seeds && this.seeds[0]) ? this.seeds[0] : 4270865943;
        // SplitMix32 / Avalanche hash mixing rootSeed, salt, and attempt
        let h = (rootSeed ^ this.hashInt(salt) ^ Math.imul(attempt + 1, 0x9E3779B9)) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
        h = (h ^ (h >>> 16)) >>> 0;

        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);

        const x = minX + (h % spanX);
        const y = minY + ((h >>> 16) % spanY);

        return { x, y };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mapObject };
}