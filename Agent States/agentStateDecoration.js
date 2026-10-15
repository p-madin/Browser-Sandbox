class AgentDecoration extends cell_meta{
    cell;
    constructor(cell){
        super();
        this.cell = cell;
    }
    decorateCell(input){
        input.push("agent");
        this.cell.decorateCell(input);
    }
}