window.addEventListener("load", init);
// window.addEventListener("resize", function () {
//     if (typeof globalGridObject !== 'undefined' && globalGridObject && typeof agent !== 'undefined' && agent) {
//         globalGridObject.buildGridPool(agent, globalGridObject.interactive);
//     }
// });

var globalMapObject, globalGridObject, agent, frame_root, my_cache_offset;
var vector_horizontal = 0;
var vector_vertical = 0;
var to;
// Root map seeds (SFC32 PRNG seed vector)
var seed_a = 4270865943;
var seed_b = 3540297175;
var seed_c = 1158276817;
var seed_d = 265803571;
const getRand = sfc32(seed_a, seed_b, seed_c, seed_d);

function sfc32(a, b, c, d) {
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

function init() {
    globalMapObject = new mapObject(200, 200);
    frame_root = document.getElementById('frame');
    agent = new agent_meta();
    globalGridObject = new frame_meta(frame_root, agent, true);

    path_optionsUI = document.getElementById("path_options");
    path_options_disclosureUI = document.querySelector(".path_options_disclosure");
    path_options_summaryUI = document.querySelector(".path_options_disclosure summary");
}

function tick() {
    for (const [agent_key, agent_value] of Object.entries(globalMapObject.all_agents)) {
        if (agent_value.getCellMeta().cell_element !== null) {
            console.log(agent_value.getCellMeta().cell_element);
            console.log("this is on screen");
        }
    }
}

function create_svg_element(element_name) {
    return document.createElementNS("http://www.w3.org/2000/svg", element_name);
}
function empty_frame(i_frame) {
    i_frame.innerHTML = '';
}

var global_pathfinder_object;

var path_optionsUI;
var path_options_summaryUI;
var path_options_disclosureUI;

function highlightPath(path) {
    for (var i = 0; i < path.length; i++) {
        if (typeof (path[i].stepOptionToCell) !== 'undefined') {
            var toElem = path[i].stepOptionToCell.getCellMeta().cell_element;
            var fromElem = path[i].stepOptionFromCell.getCellMeta().cell_element;
            if (toElem) toElem.classList.add("path_step");
            if (fromElem) fromElem.classList.add("path_step");
        } else {
            var elem = path[i].getCellMeta().cell_element;
            if (elem) elem.classList.add("path_step");
        }
    }
}

function highlightPathInteger(e) {
    clearGridPaths();
    var pathInteger = e.target.getAttribute("data-path");
    highlightPath(global_pathfinder_object.unique_options[pathInteger]);
}

function clearGridPaths() {
    for (var i = 0; i < globalGridObject.all_cells.length; i++) {
        var elem = globalGridObject.all_cells[i].getCellMeta().cell_element;
        if (elem) {
            elem.classList.remove("path_step");
        }
    }
}
