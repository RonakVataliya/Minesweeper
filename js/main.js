// Entry point - initializes the game

/**
 * Starts a fresh game instance with the specified difficulty.
 * Resets the board, game state, UI counters, and status face.
 * Clears any active timer.
 * @param {string} difficulty - The difficulty setting ("beginner", "intermediate", "expert").
 */
function startNewGame(difficulty) {
    // Clear any active running timer from a previous game
    stopTimer();

    // Initialize state
    initGame(difficulty);

    // Initial render of the board and status UI
    renderBoard(gameState.board);
    renderMineCounter(gameState.board.mineCount);
    renderTimer(0);

    // Reset the restart button face
    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
        restartButton.textContent = "🙂";
    }
}

// Start a beginner game on initial page load
startNewGame("beginner");
