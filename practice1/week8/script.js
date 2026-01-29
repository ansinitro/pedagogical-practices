document.addEventListener("DOMContentLoaded", function () {
    // --- 1. Math Rendering ---
    renderMathInElement(document.body, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$", right: "$", display: false }
        ]
    });

    // --- 2. Keyboard Navigation ---
    const deck = document.getElementById('deck');
    const rows = document.querySelectorAll('.row');
    const navDots = document.querySelectorAll('.nav-dot');
    // --- 1. 2D Navigation Logic ---
    let currentRowIndex = 0;
    // Track column index for each row to remember position or reset? 
    // For now, let's reset to 0 when changing rows, or track current active slide.
    let currentColIndex = 0;

    window.scrollToRow = function (rowIndex) {
        navigateGrid(rowIndex, 0);
    };

    window.navigateGrid = function (rowIndex, colIndex) {
        const rows = document.querySelectorAll('.row');
        if (rowIndex >= 0 && rowIndex < rows.length) {
            const row = rows[rowIndex];
            const slides = row.querySelectorAll('.slide');

            if (colIndex >= 0 && colIndex < slides.length) {
                // Update State
                currentRowIndex = rowIndex;
                currentColIndex = colIndex;

                // Scroll
                slides[colIndex].scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });

                updateSidebar(currentRowIndex);
            }
        }
    };

    // Sidebar Update
    function updateSidebar(index) {
        navDots.forEach(dot => dot.classList.remove('active'));
        if (navDots[index]) navDots[index].classList.add('active');
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();

            if (e.key === 'ArrowDown') {
                navigateGrid(currentRowIndex + 1, 0); // Reset to start of next task
            } else if (e.key === 'ArrowUp') {
                navigateGrid(currentRowIndex - 1, 0);
            } else if (e.key === 'ArrowRight') {
                navigateGrid(currentRowIndex, currentColIndex + 1);
            } else if (e.key === 'ArrowLeft') {
                navigateGrid(currentRowIndex, currentColIndex - 1);
            }
        }
    });

    // --- 3. Workflow Animations (IntersectionObserver) ---
    const observerOptions = {
        root: null, // viewport
        threshold: 0.5 // trigger when 50% visible
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const slide = entry.target;
                const steps = slide.querySelectorAll('.step');

                // Add staggered delays and make visible
                steps.forEach((step, index) => {
                    // Start delay counter slightly higher
                    setTimeout(() => {
                        step.classList.add('visible');
                    }, (index + 1) * 800); // 800ms gap between steps
                });

                // Stop observing this slide once triggered (play once)
                observer.unobserve(slide);
            }
        });
    }, observerOptions);

    // Observe all solution slides
    document.querySelectorAll('.solution-slide').forEach(slide => {
        observer.observe(slide);
    });

    // --- 4. Interactive Quiz Logic ---
    window.checkAnswers = function () {
        if (!window.quizData) return; // Guard clause

        let allCorrect = true;

        // Iterate over each task row defined in config
        for (const [rowKey, rowData] of Object.entries(window.quizData)) {
            let rowCorrect = true;

            // Iterate over each expected input (e.g., q, r OR gcd, m, n)
            for (const [field, correctVal] of Object.entries(rowData.answers)) {
                const inputId = `${field}-${rowKey}`;
                const inputEl = document.getElementById(inputId);

                if (!inputEl) continue;

                // Flexible Validation: Handle both numbers and strings (case-insensitive)
                const userVal = inputEl.value.trim().toLowerCase();
                const targetVal = String(correctVal).toLowerCase();

                if (userVal === targetVal) {
                    inputEl.classList.add('correct');
                    inputEl.classList.remove('incorrect');
                } else {
                    inputEl.classList.add('incorrect');
                    inputEl.classList.remove('correct');
                    rowCorrect = false;
                    allCorrect = false;
                }
            }

            // Show/Hide Review Button based on row correctness
            // Assumes review button is in the last cell or we can find it via common parent
            // We'll look for .review-btn within the same tr (assuming table layout)
            // Or simpler: use an ID for the review button if needed, but relative search is better.
            // Let's rely on one of the inputs to find the parent row.
            const firstInput = document.getElementById(`${Object.keys(rowData.answers)[0]}-${rowKey}`);
            if (firstInput) {
                const row = firstInput.closest('tr');
                const reviewBtn = row ? row.querySelector('.review-btn') : null;

                if (reviewBtn) {
                    if (!rowCorrect) {
                        reviewBtn.classList.add('visible');
                        // Ensure onclick is set correct (it is in HTML)
                    } else {
                        reviewBtn.classList.remove('visible');
                    }
                }
            }
        }

        const msgDiv = document.getElementById('check-message');
        if (allCorrect) {
            msgDiv.textContent = "🎉 Excellent! All answers are correct.";
            msgDiv.style.color = "var(--success)";
        } else {
            msgDiv.textContent = "Some answers are incorrect. Review the solutions and try again.";
            msgDiv.style.color = "var(--highlight)";
        }
    };

    window.showAnswers = function () {
        if (!window.quizData) return;

        for (const [rowKey, rowData] of Object.entries(window.quizData)) {
            for (const [field, correctVal] of Object.entries(rowData.answers)) {
                const inputId = `${field}-${rowKey}`;
                const inputEl = document.getElementById(inputId);
                if (inputEl) {
                    inputEl.value = correctVal;
                    inputEl.classList.add('correct');
                    inputEl.classList.remove('incorrect');
                }
            }

            // Hide review button
            const firstInput = document.getElementById(`${Object.keys(rowData.answers)[0]}-${rowKey}`);
            if (firstInput) {
                const row = firstInput.closest('tr');
                const reviewBtn = row ? row.querySelector('.review-btn') : null;
                if (reviewBtn) reviewBtn.classList.remove('visible');
            }
        }

        const msgDiv = document.getElementById('check-message');
        msgDiv.textContent = "Answers revealed.";
        msgDiv.style.color = "var(--accent-color)";
    }
});

    // --- 5. Graph Visualization (Simple SVG) ---
    window.GraphRenderer = class GraphRenderer {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) return;
            this.width = this.container.clientWidth || 400;
            this.height = this.container.clientHeight || 300;
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.svg.setAttribute("width", "100%");
            this.svg.setAttribute("height", "100%");
            this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
            this.container.innerHTML = '';
            this.container.appendChild(this.svg);
        }

        draw(nodes, links, options = {}) {
             this.svg.innerHTML = ''; // basic clear
             const nodeRadius = options.nodeRadius || 15;
             const directed = options.directed || false;

             // Draw Links
             links.forEach(link => {
                 const src = nodes.find(n => n.id === link.source);
                 const tgt = nodes.find(n => n.id === link.target);
                 if (!src || !tgt) return;

                 const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                 line.setAttribute("x1", src.x);
                 line.setAttribute("y1", src.y);
                 line.setAttribute("x2", tgt.x);
                 line.setAttribute("y2", tgt.y);
                 line.setAttribute("stroke", "#94a3b8"); // Slate-400
                 line.setAttribute("stroke-width", "2");
                 line.setAttribute("opacity", "0.6");
                 this.svg.appendChild(line);
             });

             // Draw Nodes
             nodes.forEach(node => {
                 const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                 g.setAttribute("transform", `translate(${node.x},${node.y})`);

                 const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                 circle.setAttribute("r", nodeRadius);
                 circle.setAttribute("fill", "#1e293b"); // Slate-800
                 circle.setAttribute("stroke", "#38bdf8"); // Sky-400
                 circle.setAttribute("stroke-width", "2");
                 g.appendChild(circle);

                 const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                 text.setAttribute("text-anchor", "middle");
                 text.setAttribute("dy", ".3em");
                 text.setAttribute("fill", "#e2e8f0"); // Slate-200
                 text.setAttribute("font-size", "14px");
                 text.setAttribute("font-family", "Roboto Mono");
                 text.textContent = node.id;
                 g.appendChild(text);

                 this.svg.appendChild(g);
             });
        }
    };
