// Benchmark Array Shifting & Frontier Updating for 101 x 56 grid
const cols = 101;
const rows = 56;
const total = cols * rows; // 5656 slots

const slot_state = new Int32Array(total);
const slot_reticle = new Int32Array(total);
const all_cells = new Array(total);
const rect_classes = new Array(total);

// Fill with dummy data
for (let i = 0; i < total; i++) {
    slot_state[i] = i * 7;
    slot_reticle[i] = (i * 13) & 0xFFFF;
    all_cells[i] = { my_x: i % cols, my_y: Math.floor(i / cols), flags: 4 };
    rect_classes[i] = "cell";
}

// Measure 1-step East shift (dx = 1, dy = 0)
const runs = 1000;
const start = performance.now();

for (let r = 0; r < runs; r++) {
    const dx = 1;
    const dy = 0;

    // Shift columns 0..cols-2 from cols 1..cols-1
    // In column-major layout: slot(c, row) = c * rows + row
    for (let c = 0; c < cols - 1; c++) {
        const destOffset = c * rows;
        const srcOffset = (c + 1) * rows;
        for (let row = 0; row < rows; row++) {
            slot_state[destOffset + row] = slot_state[srcOffset + row];
            slot_reticle[destOffset + row] = slot_reticle[srcOffset + row];
            all_cells[destOffset + row] = all_cells[srcOffset + row];
        }
    }

    // Entering frontier: column cols - 1 (56 cells)
    const frontierCol = cols - 1;
    const frontierOffset = frontierCol * rows;
    for (let row = 0; row < rows; row++) {
        const k = frontierOffset + row;
        slot_state[k] = 999;
        slot_reticle[k] = 123;
        all_cells[k] = { my_x: 200, my_y: row, flags: 4 };
    }
}

const end = performance.now();
const avgMs = (end - start) / runs;
console.log(`Array Shift + Frontier update for 5,656 slots: ${avgMs.toFixed(4)} ms`);

