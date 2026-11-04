const fs = require('fs');

const b1 = fs.readFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_in_terrain_paths.png');
const b2 = fs.readFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_in_interactive_tiles.png');
const b3 = fs.readFileSync('C:/Users/PCAdmin/.gemini/antigravity/brain/14c16049-e7fe-4e8c-92c6-9f4cd47166dd/wave_reticle_purified.png');

console.log('Size 1 (in terrain paths):', b1.length);
console.log('Size 2 (in interactive tiles):', b2.length);
console.log('Size 3 (reticle purified):', b3.length);

let diff12 = 0;
const minLen = Math.min(b1.length, b2.length);
for (let i = 0; i < minLen; i++) {
    if (b1[i] !== b2[i]) diff12++;
}
console.log('Byte diff count between 1 and 2:', diff12);

