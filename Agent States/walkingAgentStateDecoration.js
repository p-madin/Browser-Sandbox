class WalkingAgentDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("walking");
        this.cell.decorateCell(input);
    }
}