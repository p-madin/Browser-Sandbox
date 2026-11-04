const { mapObject } = require('../mapObject.js');
const { TerrainPathService } = require('../TerrainPathService.js');
const { CellFlags } = require('../cell.js');

const map = new mapObject(12345);
const tps = new TerrainPathService(map, 20);

const hasStrictBuilding = (c) => (c.flags & (CellFlags.STRUCTURE_FLOOR | CellFlags.STRUCTURE_WALL | CellFlags.STRUCTURE_DOOR | CellFlags.STRUCTURE_BRIDGE | CellFlags.STRUCTURE_PATH)) !== 0;
const fWater = tps.createScalarField(c => (c.flags & CellFlags.WATER) !== 0 && !hasStrictBuilding(c));
const bWater = tps.gaussianBlur(fWater);

const dShorelineWaves = tps.extractPath(bWater, 0.56, 0.5);
console.log("Shoreline Wave Path Length (chars):", dShorelineWaves.length);
console.log("Preview:", dShorelineWaves.slice(0, 150));
