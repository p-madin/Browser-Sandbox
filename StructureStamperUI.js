/**
 * Structure Stamper UI Controller (Phase 1)
 * Interactive UI widget for selecting, rotating, and stamping multi-tile blueprints.
 */

class StructureStamperUI {
    static activeBlueprint = null;

    static init() {
        const select = document.getElementById("structure_select");
        const rotateBtn = document.getElementById("structure_rotate_btn");
        const flipBtn = document.getElementById("structure_flip_btn");
        const stampNearBtn = document.getElementById("structure_stamp_near_btn");
        const stampRandomBtn = document.getElementById("structure_stamp_random_btn");
        const statusEl = document.getElementById("structure_status");
        const toggleBtn = document.getElementById("structure_toggle_btn");
        const panel = document.getElementById("structure_panel");

        if (!select || !panel) return;

        // Toggle panel collapse
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                panel.classList.toggle("collapsed");
                toggleBtn.textContent = panel.classList.contains("collapsed") ? "+" : "_";
            });
        }

        // Populate blueprint select
        const blueprints = StructureLibrary.getAllBlueprints();
        select.innerHTML = "";
        blueprints.forEach(bp => {
            const opt = document.createElement("option");
            opt.value = bp.id;
            opt.textContent = `${bp.name} (${bp.width}x${bp.height})`;
            select.appendChild(opt);
        });

        // Set default active blueprint
        this.updateActiveBlueprint();

        select.addEventListener("change", () => {
            this.updateActiveBlueprint();
        });

        if (rotateBtn) {
            rotateBtn.addEventListener("click", () => {
                if (this.activeBlueprint) {
                    this.activeBlueprint.rotate(90);
                    this.updateStatus(`Rotated '${this.activeBlueprint.name}' (${this.activeBlueprint.width}x${this.activeBlueprint.height})`);
                }
            });
        }

        if (flipBtn) {
            flipBtn.addEventListener("click", () => {
                if (this.activeBlueprint) {
                    this.activeBlueprint.flipHorizontal();
                    this.updateStatus(`Flipped '${this.activeBlueprint.name}' horizontally`);
                }
            });
        }

        if (stampNearBtn) {
            stampNearBtn.addEventListener("click", () => {
                this.stampNearPlayer();
            });
        }

        if (stampRandomBtn) {
            stampRandomBtn.addEventListener("click", () => {
                this.stampRandom();
            });
        }
    }

    static updateActiveBlueprint() {
        const select = document.getElementById("structure_select");
        if (!select) return;
        this.activeBlueprint = StructureLibrary.getBlueprint(select.value);
        this.updateStatus(`Selected: ${this.activeBlueprint ? this.activeBlueprint.name : "None"}`);
    }

    static updateStatus(msg) {
        const statusEl = document.getElementById("structure_status");
        if (statusEl) {
            statusEl.textContent = msg;
        }
    }

    static stampNearPlayer() {
        if (!this.activeBlueprint || typeof globalMapObject === 'undefined' || !globalMapObject) {
            this.updateStatus("Error: Map not ready");
            return;
        }

        const px = (typeof agent !== 'undefined' && agent) ? agent.x : 0;
        const py = (typeof agent !== 'undefined' && agent) ? agent.y : 0;

        // Try offsets radiating outward from player to find clear space
        const offsets = [
            { x: 5, y: 0 },
            { x: 0, y: 5 },
            { x: -5, y: 0 },
            { x: 0, y: -5 },
            { x: 6, y: 6 },
            { x: -6, y: 6 },
            { x: 6, y: -6 },
            { x: -6, y: -6 }
        ];

        for (const off of offsets) {
            const targetX = px + off.x;
            const targetY = py + off.y;
            if (StructureStamper.canPlace(globalMapObject, this.activeBlueprint, targetX, targetY)) {
                const instance = StructureStamper.stamp(globalMapObject, this.activeBlueprint, targetX, targetY);
                if (instance) {
                    this.updateStatus(`Stamped '${instance.name}' at (${targetX}, ${targetY})`);
                    return;
                }
            }
        }

        this.updateStatus("Could not find clear footprint near player");
    }

    static stampRandom() {
        if (!this.activeBlueprint || typeof globalMapObject === 'undefined' || !globalMapObject) {
            this.updateStatus("Error: Map not ready");
            return;
        }

        const instance = StructureStamper.stampRandom(globalMapObject, this.activeBlueprint, 50);
        if (instance) {
            this.updateStatus(`Stamped '${instance.name}' at (${instance.originX}, ${instance.originY})`);
        } else {
            this.updateStatus("Failed to find clear random location");
        }
    }
}

// Auto-init on load
if (typeof window !== 'undefined') {
    window.StructureStamperUI = StructureStamperUI;
    window.addEventListener("DOMContentLoaded", () => {
        StructureStamperUI.init();
    });
}
