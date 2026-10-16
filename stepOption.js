class stepOption{
    stepOptionFromCell;
    stepOptionToCell;
    stepOptionWeight;
    constructor(from_i, to_i) {
        this.stepOptionFromCell = from_i;
        this.stepOptionToCell = to_i;
        this.stepOptionWeight = 1;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stepOption };
}