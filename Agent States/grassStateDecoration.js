class GrassDecoration extends cell_meta {
    constructor(cell) {
        super();
        var target = cell ? ((typeof cell.getCellMeta === 'function') ? cell.getCellMeta() : cell) : this;
        target.addFlag(CellFlags.GRASS);
        if (cell) return target;
    }
}