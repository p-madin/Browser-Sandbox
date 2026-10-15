class CellDecoration extends cell_meta {
    constructor(cell) {
        super();
        if (cell) {
            return (typeof cell.getCellMeta === 'function') ? cell.getCellMeta() : cell;
        }
    }
}