/**
 * Structure Spatial Registry & Bounding Volume Hierarchy (BVH)
 * Phase 4: Manages structure spatial bounds, interior detection, and dynamic roof cutaway coordination.
 */

class StructureRegistry {
    static structures = new Map(); // id -> instance
    static cellToStructure = new Map(); // "x,y" -> instance

    /**
     * Registers a stamped structure instance into the spatial index.
     * @param {Object} instance 
     */
    static registerStructure(instance) {
        if (!instance || !instance.id) return;
        this.structures.set(instance.id, instance);

        if (instance.cells && instance.cells.length > 0) {
            for (const c of instance.cells) {
                const key = `${c.my_x},${c.my_y}`;
                this.cellToStructure.set(key, instance);
            }
        } else if (instance.bounds) {
            for (let x = instance.bounds.startX; x <= instance.bounds.endX; x++) {
                for (let y = instance.bounds.startY; y <= instance.bounds.endY; y++) {
                    const key = `${x},${y}`;
                    this.cellToStructure.set(key, instance);
                }
            }
        }
    }

    /**
     * Unregisters a structure by ID.
     * @param {string} id 
     */
    static unregisterStructure(id) {
        const inst = this.structures.get(id);
        if (!inst) return;
        if (inst.bounds) {
            for (let x = inst.bounds.startX; x <= inst.bounds.endX; x++) {
                for (let y = inst.bounds.startY; y <= inst.bounds.endY; y++) {
                    this.cellToStructure.delete(`${x},${y}`);
                }
            }
        }
        this.structures.delete(id);
    }

    /**
     * Clears all registered structures.
     */
    static clear() {
        this.structures.clear();
        this.cellToStructure.clear();
    }

    /**
     * Retrieves the structure instance at the given world coordinate.
     * @param {number} x 
     * @param {number} y 
     * @returns {Object|null}
     */
    static getStructureAt(x, y) {
        return this.cellToStructure.get(`${x},${y}`) || null;
    }

    /**
     * Determines whether the agent is considered inside the interior of a structure.
     * @param {agent} agent 
     * @returns {Object|null} The occupied structure instance if inside, or null if outside
     */
    static getOccupiedInterior(agent) {
        if (!agent || typeof agent.x === 'undefined' || typeof agent.y === 'undefined') return null;
        const inst = this.getStructureAt(agent.x, agent.y);
        if (!inst) return null;

        // Check if current cell is an interior tile
        const cell = (typeof globalMapObject !== 'undefined' && globalMapObject.map_cells[agent.x])
            ? globalMapObject.map_cells[agent.x][agent.y]
            : null;

        if (cell) {
            const hasFloor = cell.hasFlag(CellFlags.STRUCTURE_FLOOR);
            const hasFixture = cell.hasFlag(CellFlags.STRUCTURE_FIXTURE);
            const isDoorway = cell.hasFlag(CellFlags.STRUCTURE_DOOR_OPEN) || cell.hasFlag(CellFlags.STRUCTURE_DOOR);
            const isExteriorPath = cell.hasFlag(CellFlags.STRUCTURE_PATH);

            if ((hasFloor || hasFixture || isDoorway) && !isExteriorPath) {
                return inst;
            }
        }

        return null;
    }

    /**
     * Returns an array of all registered structure instances.
     * @returns {Array<Object>}
     */
    static getAllStructures() {
        return Array.from(this.structures.values());
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.StructureRegistry = StructureRegistry;
}
