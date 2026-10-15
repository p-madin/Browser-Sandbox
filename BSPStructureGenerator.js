/**
 * Binary Space Partitioning (BSP) Structure Generator (Phase 2)
 * Procedurally generates multi-room dungeons, ruins, and complexes with guaranteed connectivity.
 */

class BSPNode {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.left = null;
        this.right = null;
        this.room = null; // { x, y, w, h }
    }

    split(minSize = 4) {
        if (this.left || this.right) return false;

        // Choose split axis based on aspect ratio with small random bias
        let splitHorizontal = Math.random() > 0.5;
        if (this.w > this.h && this.w / this.h >= 1.25) splitHorizontal = false;
        else if (this.h > this.w && this.h / this.w >= 1.25) splitHorizontal = true;

        const maxSplit = (splitHorizontal ? this.h : this.w) - minSize;
        if (maxSplit <= minSize) return false;

        const splitAt = Math.floor(Math.random() * (maxSplit - minSize + 1)) + minSize;

        if (splitHorizontal) {
            this.left = new BSPNode(this.x, this.y, this.w, splitAt);
            this.right = new BSPNode(this.x, this.y + splitAt, this.w, this.h - splitAt);
        } else {
            this.left = new BSPNode(this.x, this.y, splitAt, this.h);
            this.right = new BSPNode(this.x + splitAt, this.y, this.w - splitAt, this.h);
        }
        return true;
    }

    createRooms(minRoomSize = 3) {
        if (this.left || this.right) {
            if (this.left) this.left.createRooms(minRoomSize);
            if (this.right) this.right.createRooms(minRoomSize);
            return;
        }

        // Leaf node: carve an interior room with random padding
        const roomW = Math.max(minRoomSize, Math.floor(Math.random() * (this.w - 3)) + minRoomSize);
        const roomH = Math.max(minRoomSize, Math.floor(Math.random() * (this.h - 3)) + minRoomSize);
        const roomX = this.x + Math.floor(Math.random() * (this.w - roomW - 1)) + 1;
        const roomY = this.y + Math.floor(Math.random() * (this.h - roomH - 1)) + 1;

        this.room = {
            x: roomX,
            y: roomY,
            w: Math.min(roomW, this.w - 2),
            h: Math.min(roomH, this.h - 2)
        };
    }

    getRoom() {
        if (this.room) return this.room;
        if (this.left) {
            const l = this.left.getRoom();
            if (l) return l;
        }
        if (this.right) {
            const r = this.right.getRoom();
            if (r) return r;
        }
        return null;
    }
}

class BSPStructureGenerator {
    /**
     * Generates a procedural multi-room dungeon blueprint using BSP.
     * @param {Object} options 
     * @returns {StructureBlueprint}
     */
    static generateDungeon(options = {}) {
        const width = options.width || 13;
        const height = options.height || 13;
        const depth = options.depth || 3;
        const minSize = options.minSize || 4;
        const minRoomSize = options.minRoomSize || 2;
        const id = options.id || "bsp_dungeon_" + Math.random().toString(36).substr(2, 6);
        const name = options.name || "Ancient Catacombs";

        // Initialize 2D matrices
        const floor = Array.from({ length: height }, () => Array(width).fill(0));
        const walls = Array.from({ length: height }, () => Array(width).fill(0));

        // 1. Root BSP Tree
        const root = new BSPNode(0, 0, width, height);
        const nodes = [root];

        for (let i = 0; i < depth; i++) {
            const currentNodes = [...nodes];
            for (const node of currentNodes) {
                if (!node.left && !node.right) {
                    if (node.split(minSize)) {
                        nodes.push(node.left, node.right);
                    }
                }
            }
        }

        // 2. Carve Rooms in leaf nodes
        root.createRooms(minRoomSize);

        // Gather all carved rooms
        const rooms = [];
        const collectRooms = (node) => {
            if (node.room) rooms.push(node.room);
            if (node.left) collectRooms(node.left);
            if (node.right) collectRooms(node.right);
        };
        collectRooms(root);

        // Fallback: If no rooms generated, carve a central chamber
        if (rooms.length === 0) {
            rooms.push({ x: 2, y: 2, w: width - 4, h: height - 4 });
        }

        // Stamp rooms into floor matrix
        for (const r of rooms) {
            for (let y = r.y; y < r.y + r.h; y++) {
                for (let x = r.x; x < r.x + r.w; x++) {
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        floor[y][x] = 1;
                    }
                }
            }
        }

        // 3. Connect sibling rooms via corridors
        const connectNodes = (node) => {
            if (!node || !node.left || !node.right) return;

            const roomA = node.left.getRoom();
            const roomB = node.right.getRoom();

            if (roomA && roomB) {
                const cAx = Math.floor(roomA.x + roomA.w / 2);
                const cAy = Math.floor(roomA.y + roomA.h / 2);
                const cBx = Math.floor(roomB.x + roomB.w / 2);
                const cBy = Math.floor(roomB.y + roomB.h / 2);

                // Carve L-shaped corridor
                const startX = Math.min(cAx, cBx);
                const endX = Math.max(cAx, cBx);
                for (let x = startX; x <= endX; x++) {
                    floor[cAy][x] = 1;
                }

                const startY = Math.min(cAy, cBy);
                const endY = Math.max(cAy, cBy);
                for (let y = startY; y <= endY; y++) {
                    floor[y][cBx] = 1;
                }
            }

            connectNodes(node.left);
            connectNodes(node.right);
        };
        connectNodes(root);

        // 4. Construct Walls around floor perimeter
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (floor[y][x] === 0) {
                    // Check if adjacent to floor in any of the 8 directions
                    let adjacentToFloor = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                if (floor[ny][nx] === 1) {
                                    adjacentToFloor = true;
                                    break;
                                }
                            }
                        }
                        if (adjacentToFloor) break;
                    }

                    if (adjacentToFloor) {
                        walls[y][x] = "W";
                    }
                }
            }
        }

        // 5. Add Exterior Entrance Doorway
        let doorPlaced = false;
        // Search southern wall for a valid doorway adjacent to floor
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 1; x < width - 1; x++) {
                if (walls[y][x] === "W") {
                    // Check if interior north is floor and exterior south is open
                    if (y > 0 && floor[y - 1][x] === 1) {
                        walls[y][x] = "D";
                        floor[y][x] = 1;
                        doorPlaced = true;
                        break;
                    }
                }
            }
            if (doorPlaced) break;
        }

        // Fallback door if south wall had no candidate
        if (!doorPlaced) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (walls[y][x] === "W") {
                        walls[y][x] = "D";
                        floor[y][x] = 1;
                        doorPlaced = true;
                        break;
                    }
                }
                if (doorPlaced) break;
            }
        }

        // 6. Place Fixtures (Chest / Shrine Altar in deepest room)
        if (rooms.length > 0) {
            const deepRoom = rooms[rooms.length - 1];
            const fx = Math.floor(deepRoom.x + deepRoom.w / 2);
            const fy = Math.floor(deepRoom.y + deepRoom.h / 2);
            if (floor[fy] && floor[fy][fx] === 1 && walls[fy][fx] === 0) {
                walls[fy][fx] = "F";
            }
        }

        return new StructureBlueprint({
            id: id,
            name: name,
            category: "dungeon",
            width: width,
            height: height,
            origin: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
            tags: ["dungeon", "bsp", "ruins"],
            layers: {
                floor: floor,
                walls: walls
            }
        });
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.BSPNode = BSPNode;
    window.BSPStructureGenerator = BSPStructureGenerator;
}
