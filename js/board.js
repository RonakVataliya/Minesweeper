// Handles the game board grid and layout logic

const DIFFICULTY_SETTINGS = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 }
};

/**
 * Creates an empty 2D board array initialized with default cell state objects.
 * @param {number} rows - The number of rows in the grid.
 * @param {number} cols - The number of columns in the grid.
 * @returns {Array<Array<Object>>} A 2D array representing the board grid.
 */
function createEmptyBoard(rows, cols) {
    const grid = [];
    for (let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            currentRow.push({
                row: row,
                col: col,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0
            });
        }
        grid.push(currentRow);
    }
    return grid;
}

/**
 * Generates a board layout metadata object and an empty grid for the specified difficulty.
 * @param {string} difficulty - The chosen difficulty setting ("beginner", "intermediate", "expert").
 * @returns {Object} The board object containing metadata and the grid array.
 */
function createBoard(difficulty) {
    let settings = DIFFICULTY_SETTINGS[difficulty];
    let activeDifficulty = difficulty;

    if (!settings) {
        console.warn(`Invalid difficulty "${difficulty}" specified. Defaulting to "beginner".`);
        settings = DIFFICULTY_SETTINGS.beginner;
        activeDifficulty = "beginner";
    }

    const grid = createEmptyBoard(settings.rows, settings.cols);

    return {
        difficulty: activeDifficulty,
        rows: settings.rows,
        cols: settings.cols,
        mineCount: settings.mines,
        grid: grid
    };
}

/**
 * Randomly places a specified number of mines on the board grid,
 * optionally excluding a specific cell coordinate (safe zone for the first click).
 * @param {Object} board - The board object containing the grid and dimensions.
 * @param {number} mineCount - The number of mines to place.
 * @param {number} [excludeRow] - The row index of the cell to exclude from mine placement.
 * @param {number} [excludeCol] - The column index of the cell to exclude from mine placement.
 */
function placeMines(board, mineCount, excludeRow, excludeCol) {
    let minesPlaced = 0;
    
    // Safety check: avoid infinite loops if requested mines exceed available spaces minus exclusion
    const totalCells = board.rows * board.cols;
    const maxPossibleMines = (excludeRow !== undefined && excludeCol !== undefined) ? totalCells - 1 : totalCells;
    const targetMines = Math.min(mineCount, maxPossibleMines);

    // Simple randomized coordinate selection approach.
    // This is performant and appropriate for the board sizes used here (max 480 cells).
    while (minesPlaced < targetMines) {
        const randomRow = Math.floor(Math.random() * board.rows);
        const randomCol = Math.floor(Math.random() * board.cols);

        // Check if this cell is the excluded cell
        const isExcluded = (excludeRow !== undefined && excludeCol !== undefined) && 
                           (randomRow === excludeRow && randomCol === excludeCol);

        if (!isExcluded) {
            const cell = board.grid[randomRow][randomCol];
            if (!cell.isMine) {
                cell.isMine = true;
                minesPlaced++;
            }
        }
    }
}

/**
 * Retrieves an array of valid neighboring cell objects surrounding a specific cell coordinate.
 * @param {Object} board - The board object containing the grid and dimensions.
 * @param {number} row - The row index of the target cell.
 * @param {number} col - The column index of the target cell.
 * @returns {Array<Object>} An array of neighboring cell objects.
 */
function getNeighbors(board, row, col) {
    const neighbors = [];
    
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (rowOffset === 0 && colOffset === 0) {
                continue; // Skip the target cell itself
            }
            
            const neighborRow = row + rowOffset;
            const neighborCol = col + colOffset;

            // Check if the neighbor coordinate is within the board bounds
            const isRowValid = neighborRow >= 0 && neighborRow < board.rows;
            const isColValid = neighborCol >= 0 && neighborCol < board.cols;

            if (isRowValid && isColValid) {
                neighbors.push(board.grid[neighborRow][neighborCol]);
            }
        }
    }
    
    return neighbors;
}

/**
 * Calculates and updates the adjacentMines count for every non-mine cell in the board grid.
 * @param {Object} board - The board object containing the grid and dimensions.
 */
function calculateAdjacentMines(board) {
    for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
            const cell = board.grid[row][col];
            
            // Only calculate adjacent mines for cells that do not contain a mine
            if (!cell.isMine) {
                const neighbors = getNeighbors(board, row, col);
                let mineCount = 0;
                for (let index = 0; index < neighbors.length; index++) {
                    if (neighbors[index].isMine) {
                        mineCount++;
                    }
                }
                cell.adjacentMines = mineCount;
            } else {
                cell.adjacentMines = 0;
            }
        }
    }
}



