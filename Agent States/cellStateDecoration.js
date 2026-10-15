class CellDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("cell");
        this.cell.decorateCell(input);
    }
}