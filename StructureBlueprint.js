/**
 * Structure Blueprint Engine (Phase 1)
 * Multi-tile prefab template schema with rotation, mirroring, and layer definitions.
 */

class StructureBlueprint {
    id = "";
    name = "";
    category = "general";
    width = 0;
    height = 0;
    origin = { x: 0, y: 0 };
    tags = [];
    layers = {
        floor: [],
        walls: [],
        roof: []
    };

    constructor(config) {
        this.id = config.id || "structure_" + Math.random().toString(36).substr(2, 6);
        this.name = config.name || "Unnamed Structure";
        this.category = config.category || "general";
        this.width = config.width || (config.layers && config.layers.walls ? config.layers.walls[0].length : 0);
        this.height = config.height || (config.layers && config.layers.walls ? config.layers.walls.length : 0);
        this.origin = config.origin ? { ...config.origin } : { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
        this.tags = config.tags ? [...config.tags] : [];

        // Deep copy layer matrices
        this.layers = {
            floor: config.layers && config.layers.floor ? config.layers.floor.map(row => [...row]) : [],
            walls: config.layers && config.layers.walls ? config.layers.walls.map(row => [...row]) : [],
            roof: config.layers && config.layers.roof ? config.layers.roof.map(row => [...row]) : []
        };
    }

    /**
     * Rotates the blueprint clockwise by 90, 180, or 270 degrees.
     * @param {number} degrees 
     * @returns {StructureBlueprint} self for chaining
     */
    rotate(degrees = 90) {
        const normalized = ((degrees % 360) + 360) % 360;
        const steps = Math.floor(normalized / 90);

        for (let s = 0; s < steps; s++) {
            this._rotate90Clockwise();
        }
        return this;
    }

    _rotate90Clockwise() {
        const oldW = this.width;
        const oldH = this.height;

        const rotateMatrix = (mat) => {
            if (!mat || mat.length === 0) return [];
            const result = [];
            for (let x = 0; x < oldW; x++) {
                result[x] = [];
                for (let y = 0; y < oldH; y++) {
                    result[x][y] = mat[oldH - 1 - y][x];
                }
            }
            return result;
        };

        this.layers.floor = rotateMatrix(this.layers.floor);
        this.layers.walls = rotateMatrix(this.layers.walls);
        this.layers.roof = rotateMatrix(this.layers.roof);

        // Swap dimensions
        this.width = oldH;
        this.height = oldW;

        // Transform origin: (x, y) -> (oldH - 1 - y, x)
        const oldOx = this.origin.x;
        const oldOy = this.origin.y;
        this.origin = {
            x: oldH - 1 - oldOy,
            y: oldOx
        };
    }

    /**
     * Mirrors the blueprint horizontally (across vertical axis).
     * @returns {StructureBlueprint} self for chaining
     */
    flipHorizontal() {
        const flipMatrix = (mat) => {
            if (!mat || mat.length === 0) return [];
            return mat.map(row => [...row].reverse());
        };

        this.layers.floor = flipMatrix(this.layers.floor);
        this.layers.walls = flipMatrix(this.layers.walls);
        this.layers.roof = flipMatrix(this.layers.roof);
        this.origin.x = this.width - 1 - this.origin.x;
        return this;
    }

    /**
     * Mirrors the blueprint vertically (across horizontal axis).
     * @returns {StructureBlueprint} self for chaining
     */
    flipVertical() {
        const flipMatrix = (mat) => {
            if (!mat || mat.length === 0) return [];
            return [...mat].reverse().map(row => [...row]);
        };

        this.layers.floor = flipMatrix(this.layers.floor);
        this.layers.walls = flipMatrix(this.layers.walls);
        this.layers.roof = flipMatrix(this.layers.roof);
        this.origin.y = this.height - 1 - this.origin.y;
        return this;
    }

    /**
     * Creates an independent deep clone of the blueprint.
     * @returns {StructureBlueprint}
     */
    clone() {
        return new StructureBlueprint({
            id: this.id,
            name: this.name,
            category: this.category,
            width: this.width,
            height: this.height,
            origin: { ...this.origin },
            tags: [...this.tags],
            layers: {
                floor: this.layers.floor.map(row => [...row]),
                walls: this.layers.walls.map(row => [...row]),
                roof: this.layers.roof.map(row => [...row])
            }
        });
    }

    getFootprint() {
        return {
            width: this.width,
            height: this.height,
            origin: { ...this.origin }
        };
    }
}

/**
 * Standard Prefab Blueprint Library
 */
const StructureLibrary = {
    /**
     * 5x5 Woodland Cabin: Timber walls, wooden floor, hearth, and front entrance doorway.
     */
    WoodlandCabin: new StructureBlueprint({
        id: "woodland_cabin",
        name: "Woodland Cabin",
        category: "habitation",
        width: 5,
        height: 5,
        origin: { x: 2, y: 4 }, // Doorway anchor
        tags: ["grass", "forest", "residential"],
        layers: {
            floor: [
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [0, 0, 1, 0, 0]
            ],
            walls: [
                ["W", "W", "W", "W", "W"],
                ["W",  0 ,  0 ,  0 , "W"],
                ["W",  0 , "F",  0 , "W"], // F = Hearth/Stove
                ["W",  0 ,  0 ,  0 , "W"],
                [ 0 , "W", "D", "W",  0 ]  // D = Front door
            ],
            roof: [
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1],
                [0, 1, 1, 1, 0]
            ]
        }
    }),

    /**
     * 4x4 Stone Watchtower: Fortified masonry, internal stair/chest fixture, wooden door.
     */
    StoneWatchtower: new StructureBlueprint({
        id: "stone_watchtower",
        name: "Stone Watchtower",
        category: "fortification",
        width: 4,
        height: 4,
        origin: { x: 2, y: 3 },
        tags: ["stone", "defensive", "military"],
        layers: {
            floor: [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1]
            ],
            walls: [
                ["W", "W", "W", "W"],
                ["W",  0 ,  0 , "W"],
                ["W",  0 , "F", "W"], // F = Weapon rack / Chest
                ["W", "W", "D", "W"]  // D = Heavy door
            ],
            roof: [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1]
            ]
        }
    }),

    /**
     * 5x5 Ancient Shrine: Ruined stone sanctuary with cracked pillars and sacred altar.
     */
    AncientShrine: new StructureBlueprint({
        id: "ancient_shrine",
        name: "Ancient Shrine",
        category: "ruins",
        width: 5,
        height: 5,
        origin: { x: 2, y: 2 },
        tags: ["ruins", "sacred", "mystic"],
        layers: {
            floor: [
                [1, 0, 1, 0, 1],
                [0, 1, 1, 1, 0],
                [1, 1, 1, 1, 1],
                [0, 1, 1, 1, 0],
                [1, 0, 1, 0, 1]
            ],
            walls: [
                ["W",  0 , "W",  0 , "W"],
                [ 0 ,  0 ,  0 ,  0 ,  0 ],
                ["W",  0 , "F",  0 , "W"], // F = Altar fixture
                [ 0 ,  0 ,  0 ,  0 ,  0 ],
                ["W",  0 , "D",  0 , "W"]  // D = Portal threshold
            ],
            roof: [
                [1, 0, 1, 0, 1],
                [0, 1, 1, 1, 0],
                [1, 1, 0, 1, 1],
                [0, 1, 1, 1, 0],
                [1, 0, 0, 0, 1]
            ]
        }
    }),

    /**
     * 6x4 Lumber Camp: Open timber workstation with log boundaries and workbench.
     */
    LumberCamp: new StructureBlueprint({
        id: "lumber_camp",
        name: "Lumber Camp",
        category: "camp",
        width: 6,
        height: 4,
        origin: { x: 3, y: 2 },
        tags: ["forest", "workstation"],
        layers: {
            floor: [
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [0, 0, 1, 1, 0, 0]
            ],
            walls: [
                ["W", "W", "W", "W", "W", "W"],
                ["W",  0 ,  0 , "F",  0 , "W"], // F = Workbench
                [ 0 ,  0 ,  0 ,  0 ,  0 ,  0 ],
                [ 0 , "W", "P", "P", "W",  0 ]  // P = Wood planks approach
            ],
            roof: [
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0]
            ]
        }
    }),

    /**
     * 3x3 Bandit Barricade: Heavily fortified timber barricade guarding a hidden loot stash.
     */
    BanditBarricade: new StructureBlueprint({
        id: "bandit_barricade",
        name: "Bandit Barricade",
        category: "obstacle",
        width: 3,
        height: 3,
        origin: { x: 1, y: 2 },
        tags: ["obstacle", "defensive", "bandit"],
        layers: {
            floor: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ],
            walls: [
                ["W", "F", "W"], // F = Loot stash behind barricade
                ["W", "B", "W"], // B = Destructible barricade
                [ 0 , "P",  0 ]  // P = Pathway approach
            ],
            roof: [
                [1, 1, 1],
                [0, 0, 0],
                [0, 0, 0]
            ]
        }
    }),

    /**
     * 4x3 Horizontal Timber Bridge: Spans east-west river channels with wooden planks and side rails.
     */
    TimberBridgeH: new StructureBlueprint({
        id: "timber_bridge_h",
        name: "Timber Bridge (Horizontal)",
        category: "infrastructure",
        width: 4,
        height: 3,
        origin: { x: 2, y: 1 },
        tags: ["bridge", "infrastructure", "water"],
        layers: {
            floor: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0]
            ],
            walls: [
                ["W", "W", "W", "W"], // Upper guide rail
                ["P", "P", "P", "P"], // Passable bridge deck
                ["W", "W", "W", "W"]  // Lower guide rail
            ]
        }
    }),

    /**
     * 3x4 Vertical Timber Bridge: Spans north-south river channels with wooden planks and side rails.
     */
    TimberBridgeV: new StructureBlueprint({
        id: "timber_bridge_v",
        name: "Timber Bridge (Vertical)",
        category: "infrastructure",
        width: 3,
        height: 4,
        origin: { x: 1, y: 2 },
        tags: ["bridge", "infrastructure", "water"],
        layers: {
            floor: [
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0]
            ],
            walls: [
                ["W", "P", "W"], // Left rail, deck, right rail
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"]
            ]
        }
    }),

    /**
     * 4x3 Horizontal Stone Arch Bridge: Fortified masonry span across east-west river channels.
     */
    StoneArchBridgeH: new StructureBlueprint({
        id: "stone_arch_bridge_h",
        name: "Stone Arch Bridge (Horizontal)",
        category: "infrastructure",
        width: 4,
        height: 3,
        origin: { x: 2, y: 1 },
        tags: ["bridge", "stone", "infrastructure", "water"],
        layers: {
            floor: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0]
            ],
            walls: [
                ["W", "W", "W", "W"], // Heavy stone parapet
                ["P", "P", "P", "P"], // Passable paved deck
                ["W", "W", "W", "W"]  // Heavy stone parapet
            ]
        }
    }),

    /**
     * 3x4 Vertical Stone Arch Bridge: Fortified masonry span across north-south river channels.
     */
    StoneArchBridgeV: new StructureBlueprint({
        id: "stone_arch_bridge_v",
        name: "Stone Arch Bridge (Vertical)",
        category: "infrastructure",
        width: 3,
        height: 4,
        origin: { x: 1, y: 2 },
        tags: ["bridge", "stone", "infrastructure", "water"],
        layers: {
            floor: [
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0]
            ],
            walls: [
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"]
            ]
        }
    }),

    /**
     * 5x3 Horizontal Suspension Rope Bridge: Spans wide rocky gorges and chasms.
     */
    SuspensionBridgeH: new StructureBlueprint({
        id: "suspension_bridge_h",
        name: "Suspension Rope Bridge (Horizontal)",
        category: "infrastructure",
        width: 5,
        height: 3,
        origin: { x: 2, y: 1 },
        tags: ["bridge", "suspension", "chasm", "infrastructure"],
        layers: {
            floor: [
                [0, 0, 0, 0, 0],
                [1, 1, 1, 1, 1],
                [0, 0, 0, 0, 0]
            ],
            walls: [
                ["W", "W", "W", "W", "W"], // Tension guide rope
                ["P", "P", "P", "P", "P"], // Passable wooden plank walkway
                ["W", "W", "W", "W", "W"]  // Tension guide rope
            ]
        }
    }),

    /**
     * 3x5 Vertical Suspension Rope Bridge: Spans deep vertical fissures and chasms.
     */
    SuspensionBridgeV: new StructureBlueprint({
        id: "suspension_bridge_v",
        name: "Suspension Rope Bridge (Vertical)",
        category: "infrastructure",
        width: 3,
        height: 5,
        origin: { x: 1, y: 2 },
        tags: ["bridge", "suspension", "chasm", "infrastructure"],
        layers: {
            floor: [
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 0]
            ],
            walls: [
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"],
                ["W", "P", "W"]
            ]
        }
    }),

    /**
     * 4x4 Riverside Watermill: Millhouse with grinding hearth and external paddlewheel.
     */
    Watermill: new StructureBlueprint({
        id: "watermill",
        name: "Riverside Watermill",
        category: "settlement",
        width: 4,
        height: 4,
        origin: { x: 2, y: 2 },
        tags: ["hydrology", "settlement", "production"],
        layers: {
            floor: [
                [1, 1, 1, 0],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 0, 0]
            ],
            walls: [
                ["W", "W", "W",  0 ],
                ["W", "F",  0 , "W"], // F = Grist millstone; right wall = waterwheel hub
                ["W",  0 ,  0 , "W"],
                [ 0 , "D",  0 ,  0 ]  // D = South entryway facing inland
            ],
            roof: [
                [1, 1, 1, 0],
                [1, 1, 1, 0],
                [1, 1, 1, 0],
                [0, 0, 0, 0]
            ]
        }
    }),

    /**
     * 3x4 Lakeside Fishing Pier: Timber jetty extending over water with mooring posts.
     */
    FishingPier: new StructureBlueprint({
        id: "fishing_pier",
        name: "Lakeside Fishing Pier",
        category: "infrastructure",
        width: 3,
        height: 4,
        origin: { x: 1, y: 1 },
        tags: ["hydrology", "infrastructure", "fishing"],
        layers: {
            floor: [
                [0, 1, 0],
                [1, 1, 1],
                [1, 1, 1],
                [0, 1, 0]
            ],
            walls: [
                [ 0 , "P",  0 ], // P = Shore approach plank
                ["F", "P", "F"], // F = Mooring posts
                [ 0 , "P",  0 ],
                ["F", "P", "F"]  // Pier end
            ]
        }
    }),

    /**
     * Retrieves a fresh clone of a blueprint by ID.
     * @param {string} id 
     * @returns {StructureBlueprint|null}
     */
    getBlueprint(id) {
        for (const key of Object.keys(StructureLibrary)) {
            const bp = StructureLibrary[key];
            if (bp instanceof StructureBlueprint && (bp.id === id || key === id)) {
                return bp.clone();
            }
        }
        return null;
    },

    /**
     * Returns an array of all registered blueprints.
     * @returns {Array<StructureBlueprint>}
     */
    getAllBlueprints() {
        const result = [];
        for (const key of Object.keys(StructureLibrary)) {
            const val = StructureLibrary[key];
            if (val instanceof StructureBlueprint) {
                result.push(val.clone());
            }
        }
        return result;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.StructureBlueprint = StructureBlueprint;
    window.StructureLibrary = StructureLibrary;
}
