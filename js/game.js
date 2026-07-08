// Handles core game state, rules, and win/loss logic

let gameState = null;
let timerIntervalId = null;

/**
 * Initializes a new game instance with the chosen difficulty.
 * @param {string} difficulty - The difficulty level ("beginner", "intermediate", "expert").
 * @returns {Object} The initialized game state object.
 */
function initGame(difficulty) {
    const board = createBoard(difficulty);
    gameState = {
        board: board,
        isFirstClick: true,
        isGameOver: false,
        flagCount: 0,
        result: null, // Will be "win" or "loss" when isGameOver is true
        elapsedSeconds: 0
    };
    return gameState;
}

/**
 * Starts the game timer interval, incrementing elapsed seconds and triggering a UI update callback.
 * Clears any active timer before starting to prevent duplicate intervals.
 * @param {Function} onTick - The callback function to run on each tick, receiving elapsed seconds.
 */
function startTimer(onTick) {
    stopTimer(); // Ensure any existing timer is cleared first

    timerIntervalId = setInterval(() => {
        gameState.elapsedSeconds++;
        if (typeof onTick === "function") {
            onTick(gameState.elapsedSeconds);
        }
    }, 1000);
}

/**
 * Stops the active game timer interval and resets the interval tracking variable.
 */
function stopTimer() {
    if (timerIntervalId !== null) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
}

/**
 * Checks if all non-mine cells on the board have been revealed.
 * @param {Object} gameState - The current centralized game state.
 * @returns {boolean} True if all non-mine cells are revealed, false otherwise.
 */
function checkWinCondition(gameState) {
    const board = gameState.board;
    for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
            const cell = board.grid[row][col];
            if (!cell.isMine && !cell.isRevealed) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Reveals all mine cells on the board (used on game loss).
 * @param {Object} gameState - The current centralized game state.
 */
function revealAllMines(gameState) {
    const board = gameState.board;
    for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
            const cell = board.grid[row][col];
            if (cell.isMine) {
                cell.isRevealed = true;
            }
        }
    }
}

/**
 * Reveals a cell on the board. If the cell is empty (0 adjacent mines),
 * it recursively reveals all connected empty cells and bordering numbered cells.
 * Also handles first-click safety, placing mines only after the first coordinate is clicked.
 * Handles win/loss outcome detection and timer controls.
 * @param {Object} gameState - The current centralized game state.
 * @param {number} row - The row index of the cell to reveal.
 * @param {number} col - The column index of the cell to reveal.
 * @returns {Object|undefined} The cell object if valid, otherwise undefined.
 */
function revealCell(gameState, row, col) {
    // Early guard: if game is already over, do nothing
    if (gameState.isGameOver) {
        return undefined;
    }

    const board = gameState.board;

    // Boundary check: ensure coordinates are valid
    if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
        return undefined;
    }

    const cell = board.grid[row][col];

    // Base case: if cell is already revealed or flagged, stop recursion
    if (cell.isRevealed || cell.isFlagged) {
        return cell;
    }

    // Handle first click mine generation and start the timer
    if (gameState.isFirstClick) {
        placeMines(board, board.mineCount, row, col);
        calculateAdjacentMines(board);
        gameState.isFirstClick = false;
        startTimer(renderTimer);
    }

    // Set current cell state to revealed
    cell.isRevealed = true;

    // Base case: if cell is a mine, trigger game loss, stop timer, and reveal all mines
    if (cell.isMine) {
        gameState.isGameOver = true;
        gameState.result = "loss";
        stopTimer();
        revealAllMines(gameState);
        return cell;
    }

    // Recursive case: if cell has zero adjacent mines, cascade to neighbors
    if (cell.adjacentMines === 0) {
        const neighbors = getNeighbors(board, row, col);
        for (let index = 0; index < neighbors.length; index++) {
            const neighbor = neighbors[index];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
                revealCell(gameState, neighbor.row, neighbor.col);
            }
        }
    }

    // Check for win condition after a successful non-mine reveal
    if (checkWinCondition(gameState)) {
        gameState.isGameOver = true;
        gameState.result = "win";
        stopTimer();
    }

    return cell;
}

/**
 * Toggles the flagged state of a hidden cell on the board.
 * Increments or decrements the state's flagCount.
 * Respects game-over state.
 * @param {Object} gameState - The current centralized game state.
 * @param {number} row - The row index of the cell to flag.
 * @param {number} col - The column index of the cell to flag.
 * @returns {Object|undefined} The cell object.
 */
function toggleFlag(gameState, row, col) {
    // Early guard: if game is already over, do nothing
    if (gameState.isGameOver) {
        return undefined;
    }

    const board = gameState.board;
    const cell = board.grid[row][col];

    // If the cell is already revealed, it cannot be flagged
    if (cell.isRevealed) {
        return cell;
    }

    cell.isFlagged = !cell.isFlagged;
    
    // Update the flag count
    if (cell.isFlagged) {
        gameState.flagCount++;
    } else {
        gameState.flagCount--;
    }

    return cell;
}
