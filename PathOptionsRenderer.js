/**
 * PathOptionsRenderer.js (Phase 5 & 6 Enhanced)
 * Dedicated UI controller managing the path options disclosure panel,
 * multi-path rendering of equal-step routes, hover highlighting, and route selection.
 */

class PathOptionsRenderer {
    constructor(container = null, disclosure = null) {
        this.container = container || document.getElementById("path_options");
        this.disclosure = disclosure || document.querySelector(".path_options_disclosure");
        this.summary = this.disclosure ? this.disclosure.querySelector("summary") : null;
    }

    render(uniqueOptions, onHover = null) {
        if (!this.container) return;
        this.clear();

        if (!uniqueOptions || uniqueOptions.length === 0) {
            if (this.summary) this.summary.textContent = "Options (0 paths)";
            return;
        }

        const stepCount = uniqueOptions[0].length;
        if (this.summary) {
            this.summary.textContent = `Options (${uniqueOptions.length} route${uniqueOptions.length > 1 ? 's' : ''} — ${stepCount} steps)`;
        }

        var frag = document.createDocumentFragment();

        if (uniqueOptions.length > 1) {
            var headerBadge = document.createElement("div");
            headerBadge.className = "path_options_badge";
            headerBadge.textContent = `⭐ ${uniqueOptions.length} Equal Routes (${stepCount} steps)`;
            frag.appendChild(headerBadge);
        }

        for (var i = 0; i < uniqueOptions.length; i++) {
            const pathIndex = i;
            const currentRoute = uniqueOptions[pathIndex];

            var row = document.createElement("div");
            row.className = pathIndex === 0 ? "path_option active" : "path_option";
            row.setAttribute("data-path", pathIndex);
            row.title = "Click to walk this route, hover to preview";
            row.innerHTML = `<span>Route #${pathIndex + 1}</span> <span class="path_len">${currentRoute.length} steps</span>`;

            // Hover preview
            row.addEventListener("mouseover", (e) => {
                if (onHover) {
                    onHover(e);
                } else if (typeof window.clearGridPaths === 'function' && typeof window.highlightPath === 'function') {
                    window.clearGridPaths();
                    window.highlightPath(currentRoute);
                }
            });

            row.addEventListener("mouseout", () => {
                if (typeof window.clearGridPaths === 'function') {
                    window.clearGridPaths();
                }
            });

            // Click to choose and walk this route
            row.addEventListener("click", () => {
                if (typeof agent !== 'undefined' && agent && typeof agent.walkPath === 'function') {
                    // Update active styling
                    const allOptions = this.container.querySelectorAll(".path_option");
                    allOptions.forEach(opt => opt.classList.remove("active"));
                    row.classList.add("active");

                    agent.walkPath([...currentRoute]);
                }
            });

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
