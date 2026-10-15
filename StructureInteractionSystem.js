/**
 * Structure Interaction System (Phase 3)
 * Manages interactive door state transitions, barricade degradation, fixture inspection dialogs, and notifications.
 */

class StructureInteractionSystem {
    static toastElement = null;
    static toastTimer = null;

    static init() {
        if (typeof document === 'undefined') return;
        let el = document.getElementById("structure_toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "structure_toast";
            el.className = "structure_toast";
            document.body.appendChild(el);
        }
        this.toastElement = el;
    }

    /**
     * Displays a sleek glassmorphic banner notification.
     * @param {string} message 
     * @param {number} durationMs 
     */
    static showToast(message, durationMs = 2400) {
        if (!this.toastElement) this.init();
        if (!this.toastElement) return;

        this.toastElement.textContent = message;
        this.toastElement.classList.add("visible");

        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
        }

        this.toastTimer = setTimeout(() => {
            if (this.toastElement) {
                this.toastElement.classList.remove("visible");
            }
        }, durationMs);
    }

    /**
     * Automatically opens a closed doorway as the player steps through.
     * @param {cell_meta} doorCell 
     */
    static autoOpenDoor(doorCell) {
        if (!doorCell) return;
        const targetX = doorCell.my_x;
        const targetY = doorCell.my_y;

        const mapCell = (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells[targetX])
            ? globalMapObject.map_cells[targetX][targetY]
            : doorCell;

        if (doorCell.hasFlag(CellFlags.STRUCTURE_DOOR_CLOSED) || doorCell.hasFlag(CellFlags.STRUCTURE_DOOR)) {
            doorCell.removeFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR);
            doorCell.addFlag(CellFlags.STRUCTURE_DOOR_OPEN);

            if (mapCell !== doorCell) {
                mapCell.removeFlag(CellFlags.STRUCTURE_DOOR_CLOSED | CellFlags.STRUCTURE_DOOR);
                mapCell.addFlag(CellFlags.STRUCTURE_DOOR_OPEN);
            }

            // Sync passability graph
            if (typeof globalMapObject !== 'undefined') {
                mapCell.determineNeighboursPassable(globalMapObject);
                for (const n of mapCell.my_neighbours) {
                    if (n) n.determineNeighboursPassable(globalMapObject);
                }
            }

            doorCell.decorateCell([]);
            this.showToast("🚪 Door swung open");
        }
    }

    /**
     * Inspects an interior fixture and generates narrative/loot.
     * @param {cell_meta} cell 
     */
    static inspectFixture(cell) {
        if (!cell) return;

        // Check if previously looted/interacted
        if (cell.looted) {
            this.showToast("📦 Empty Container: Already searched.");
            return;
        }

        // Determine fixture personality based on structure or seed
        const seedVal = Math.abs(Math.round(cell.my_seed || 0)) % 4;

        if (seedVal === 0) {
            // Chest
            const gold = Math.floor(Math.random() * 30) + 15;
            cell.looted = true;
            this.showToast(`📦 Wooden Chest: Found ${gold} Gold Coins and Ancient Key!`, 3000);
        } else if (seedVal === 1) {
            // Sacred Shrine Altar
            this.showToast("✨ Sacred Altar: The ancient runes shimmer with radiant energy.", 3000);
        } else if (seedVal === 2) {
            // Hearth / Fireplace
            this.showToast("🔥 Stone Fireplace: Crackling embers radiate warmth throughout the chamber.", 3000);
        } else {
            // Workbench
            this.showToast("🪓 Timber Workbench: Stocked with seasoned oak and woodcutting tools.", 3000);
        }
    }
}

// Global export & auto-init
if (typeof window !== 'undefined') {
    window.StructureInteractionSystem = StructureInteractionSystem;
    window.addEventListener("DOMContentLoaded", () => {
        StructureInteractionSystem.init();
    });
}
