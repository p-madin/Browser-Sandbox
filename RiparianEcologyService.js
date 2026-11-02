/**
 * Riparian Ecology & Geomorphic World Integration Service (Phase 5 - Deprecated / Replaced)
 * Waterfront architectural landmarks (Watermill & Fishing Pier) have been relocated to WorldStructurePlacer.
 * Riparian flora (reeds & willows) has been superseded by continuous alluvial sand banks and
 * the tabletop boundary micro-scatter system (#scatter_layer: pebbles, foam, clovers, flowers, scree).
 */

class RiparianEcologyService {
    /**
     * @deprecated Riparian flora distribution has been removed in favor of continuous sand banks and vector micro-scatter.
     */
    static populateRiparianFlora(map) {
        return { reedsCount: 0, willowsCount: 0, alpineCount: 0, modifiedCells: [] };
    }

    /**
     * Forwards waterfront architecture placement to WorldStructurePlacer.
     * @param {mapObject} map 
     * @returns {Array<Object>} placed waterfront structures
     */
    static placeWaterfrontArchitecture(map) {
        if (typeof WorldStructurePlacer !== 'undefined' && typeof WorldStructurePlacer.placeWaterfrontArchitecture === 'function') {
            return WorldStructurePlacer.placeWaterfrontArchitecture(map, map.structures || []);
        }
        return [];
    }

    /**
     * Legacy integration entry point.
     * @param {mapObject} map 
     */
    static integrateGeomorphicWorld(map) {
        this.placeWaterfrontArchitecture(map);
        if (typeof BridgePlacer !== 'undefined') {
            BridgePlacer.processRiverCrossings(map);
        }
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.RiparianEcologyService = RiparianEcologyService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RiparianEcologyService };
}
