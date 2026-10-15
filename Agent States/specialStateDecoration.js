class SpecialDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("special");
        this.cell.decorateCell(input);
    }
}