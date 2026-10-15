/**
 * PathOptionsRenderer.js (Phase 5)
 * Dedicated UI controller managing the path options disclosure panel,
 * item rendering, and hover path highlighting decoupled from pathfinding logic.
 */

class PathOptionsRenderer {
    constructor(container = null, disclosure = null) {
        this.container = container || document.getElementById("path_options");
        this.disclosure = disclosure || document.querySelector(".path_options_disclosure");
    }

    render(uniqueOptions, onHover = null) {
        if (!this.container) return;
        this.clear();

        if (!uniqueOptions || uniqueOptions.length === 0) {
            return;
        }

        var frag = document.createDocumentFragment();
        for (var i = 0; i < uniqueOptions.length; i++) {
            var row = document.createElement("div");
            row.className = "path_option";
            row.setAttribute("data-path", i);
            row.textContent = `Option #${i} Length: ${uniqueOptions[i].length}`;

            if (onHover) {
                row.addEventListener("mouseover", onHover);
            } else if (typeof highlightPathInteger === 'function') {
                row.addEventListener("mouseover", highlightPathInteger);
            }

            frag.appendChild(row);
        }

        this.container.appendChild(frag);

        if (this.disclosure && uniqueOptions.length > 0) {
            this.disclosure.setAttribute("open", "open");
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = "";
        }
    }
}
