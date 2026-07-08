// Handles rendering and DOM updates

/**
 * Dynamically renders the Minesweeper board grid.
 * Renders cells based on their actual state: isRevealed, isFlagged, etc.
 * Adds keyboard accessibility (tabindex, role, aria-label).
 * @param {Object} board - The board data object containing the grid and dimensions.
 */
function renderBoard(board) {
    const boardElement = document.getElementById("board");
    if (!boardElement) return;

    // Clear any existing content inside #board
    boardElement.innerHTML = "";

    // Set CSS grid layout columns, rows, and force max-content width
    boardElement.style.display = "grid";
    boardElement.style.gridTemplateColumns = `repeat(${board.cols}, 28px)`;
    boardElement.style.gridTemplateRows = `repeat(${board.rows}, 28px)`;
    boardElement.style.width = "max-content";

    // Iterate over every cell in the grid
    for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
            const cellData = board.grid[row][col];
            const cellDiv = document.createElement("div");
            cellDiv.className = "cell";
            cellDiv.setAttribute("data-row", row);
            cellDiv.setAttribute("data-col", col);
            cellDiv.setAttribute("tabindex", "0");
            cellDiv.setAttribute("role", "button");

            // Render based on isRevealed and isFlagged states
            if (cellData.isFlagged && !cellData.isRevealed) {
                cellDiv.classList.add("flagged");
                cellDiv.textContent = "🚩";
            } else if (!cellData.isRevealed) {
                cellDiv.classList.add("hidden");
                cellDiv.textContent = "";
            } else {
                cellDiv.classList.add("revealed");
                if (cellData.isMine) {
                    cellDiv.classList.add("mine");
                    cellDiv.textContent = "💣";
                } else if (cellData.adjacentMines > 0) {
                    cellDiv.classList.add(`number-${cellData.adjacentMines}`);
                    cellDiv.textContent = cellData.adjacentMines;
                } else {
                    cellDiv.textContent = "";
                }
            }

            // Build the aria-label dynamically for accessibility
            let ariaLabel = "";
            const humanRow = row + 1;
            const humanCol = col + 1;

            if (cellData.isFlagged && !cellData.isRevealed) {
                ariaLabel = `Flagged cell, row ${humanRow}, column ${humanCol}`;
            } else if (!cellData.isRevealed) {
                ariaLabel = `Hidden cell, row ${humanRow}, column ${humanCol}`;
            } else {
                if (cellData.isMine) {
                    ariaLabel = `Mine, row ${humanRow}, column ${humanCol}`;
                } else if (cellData.adjacentMines > 0) {
                    ariaLabel = `Revealed cell, row ${humanRow}, column ${humanCol}, ${cellData.adjacentMines} adjacent mines`;
                } else {
                    ariaLabel = `Revealed cell, row ${humanRow}, column ${humanCol}, no adjacent mines`;
                }
            }
            cellDiv.setAttribute("aria-label", ariaLabel);

            boardElement.appendChild(cellDiv);
        }
    }
}

/**
 * Updates the mine counter display.
 * @param {number} mineCount - The number of mines remaining or total mines.
 */
function renderMineCounter(mineCount) {
    const counterElement = document.getElementById("mine-counter");
    if (counterElement) {
        counterElement.textContent = `Mines: ${mineCount}`;
    }
}

/**
 * Updates the game timer display.
 * @param {number} seconds - The number of elapsed seconds.
 */
function renderTimer(seconds) {
    const timerElement = document.getElementById("timer");
    if (timerElement) {
        timerElement.textContent = `Time: ${seconds}`;
    }
}

/**
 * Handles cell reveal mutation and re-renders the board, updating status elements.
 * Maintains keyboard focus state across renders if a cell was focused.
 * @param {number} row - The row index.
 * @param {number} col - The column index.
 */
function handleCellReveal(row, col) {
    // Save current active element state to restore focus after render
    const activeElement = document.activeElement;
    const isCellFocused = activeElement && activeElement.classList.contains("cell");
    const activeRow = isCellFocused ? activeElement.getAttribute("data-row") : null;
    const activeCol = isCellFocused ? activeElement.getAttribute("data-col") : null;

    revealCell(gameState, row, col);

    renderBoard(gameState.board);
    renderMineCounter(gameState.board.mineCount - gameState.flagCount);

    if (gameState.isGameOver) {
        const restartButton = document.getElementById("restart-button");
        if (restartButton) {
            if (gameState.result === "loss") {
                restartButton.textContent = "😵";
            } else if (gameState.result === "win") {
                restartButton.textContent = "😎";
            }
        }
    }

    // Restore focus on the corresponding cell if focus was lost during re-render
    if (activeRow !== null && activeCol !== null) {
        const cellToFocus = document.querySelector(`.cell[data-row="${activeRow}"][data-col="${activeCol}"]`);
        if (cellToFocus) {
            cellToFocus.focus();
        }
    }
}

/**
 * Handles cell flag toggling mutation and re-renders the board, updating status elements.
 * Maintains keyboard focus state across renders if a cell was focused.
 * @param {number} row - The row index.
 * @param {number} col - The column index.
 */
function handleCellFlag(row, col) {
    // Save current active element state to restore focus after render
    const activeElement = document.activeElement;
    const isCellFocused = activeElement && activeElement.classList.contains("cell");
    const activeRow = isCellFocused ? activeElement.getAttribute("data-row") : null;
    const activeCol = isCellFocused ? activeElement.getAttribute("data-col") : null;

    toggleFlag(gameState, row, col);

    renderBoard(gameState.board);
    renderMineCounter(gameState.board.mineCount - gameState.flagCount);

    // Restore focus on the corresponding cell if focus was lost during re-render
    if (activeRow !== null && activeCol !== null) {
        const cellToFocus = document.querySelector(`.cell[data-row="${activeRow}"][data-col="${activeCol}"]`);
        if (cellToFocus) {
            cellToFocus.focus();
        }
    }
}

// Event delegation: attach click, contextmenu, and keydown listeners to the #board element
const boardElement = document.getElementById("board");
if (boardElement) {
    // Left-click to reveal cells
    boardElement.addEventListener("click", (event) => {
        const cellElement = event.target.closest(".cell");
        if (!cellElement) return;

        const row = parseInt(cellElement.getAttribute("data-row"), 10);
        const col = parseInt(cellElement.getAttribute("data-col"), 10);

        handleCellReveal(row, col);
    });

    // Right-click to flag/unflag cells
    boardElement.addEventListener("contextmenu", (event) => {
        event.preventDefault(); // Stop standard browser right-click menu

        const cellElement = event.target.closest(".cell");
        if (!cellElement) return;

        const row = parseInt(cellElement.getAttribute("data-row"), 10);
        const col = parseInt(cellElement.getAttribute("data-col"), 10);

        handleCellFlag(row, col);
    });

    // Keydown delegation to support accessibility and keyboard controls
    boardElement.addEventListener("keydown", (event) => {
        const cellElement = event.target.closest(".cell");
        if (!cellElement) return;

        const row = parseInt(cellElement.getAttribute("data-row"), 10);
        const col = parseInt(cellElement.getAttribute("data-col"), 10);

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); // Stop page scrolling on Spacebar
            handleCellReveal(row, col);
        } else if (event.key === "f" || event.key === "F") {
            event.preventDefault();
            handleCellFlag(row, col);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (row > 0) {
                const targetCell = document.querySelector(`.cell[data-row="${row - 1}"][data-col="${col}"]`);
                if (targetCell) targetCell.focus();
            }
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            if (row < gameState.board.rows - 1) {
                const targetCell = document.querySelector(`.cell[data-row="${row + 1}"][data-col="${col}"]`);
                if (targetCell) targetCell.focus();
            }
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            if (col > 0) {
                const targetCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col - 1}"]`);
                if (targetCell) targetCell.focus();
            }
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            if (col < gameState.board.cols - 1) {
                const targetCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col + 1}"]`);
                if (targetCell) targetCell.focus();
            }
        }
    });
}

// Click handler directly on the restart button to trigger a game reset
const restartButton = document.getElementById("restart-button");
if (restartButton) {
    restartButton.addEventListener("click", () => {
        startNewGame(gameState.board.difficulty);
    });
}

// Change handler directly on the difficulty select dropdown to start a new game at the chosen difficulty
const difficultySelect = document.getElementById("difficulty-select");
if (difficultySelect) {
    difficultySelect.addEventListener("change", (event) => {
        startNewGame(event.target.value);
    });
}
