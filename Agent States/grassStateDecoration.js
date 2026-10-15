class GrassDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("grass");
        this.cell.decorateCell(input);
    }
}