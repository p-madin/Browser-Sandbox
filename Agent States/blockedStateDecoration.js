class BlockedDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("blocked");
        this.cell.decorateCell(input);
    }
}