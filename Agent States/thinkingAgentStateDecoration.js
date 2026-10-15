class ThinkingAgentDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("thinking");
        this.cell.decorateCell(input);
    }
}