class SelectedDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("selected");
        this.cell.decorateCell(input);
    }
}