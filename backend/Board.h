#pragma once
//===----------------------------------------------------------------------===
// Board.h
//
// Owns the Minesweeper grid: cell state, mine placement, reveal/flood-fill,
// flagging, win detection and hint search. Game orchestrates *when* these
// operations happen; Board is purely responsible for *how* the grid behaves.
//===----------------------------------------------------------------------===
#include <vector>
#include <string>
#include <utility>

namespace minesweeper {

// A single grid cell. Plain data on purpose - Board is the only class
// allowed to mutate it, everything else sees it through const accessors.
struct Cell {
    bool isMine        = false;
    bool isRevealed     = false;
    bool isFlagged      = false;
    int  adjacentMines  = 0;
};

class Board {
public:
    Board(int rows, int cols, int mineCount);

    // Places mines uniformly at random, guaranteeing (firstRow, firstCol)
    // and its neighbors are mine-free (classic "safe first click" rule).
    // No-op if mines have already been placed for this board instance.
    void placeMines(int firstRow, int firstCol);

    // Reveals a cell. Returns false if the revealed cell was a mine
    // (i.e. the game is lost), true otherwise. Flagged cells cannot be
    // revealed - the call is ignored and true is returned.
    bool reveal(int row, int col);

    // Toggles the flag on an unrevealed cell. Returns the new flag count.
    int toggleFlag(int row, int col);

    // True once every non-mine cell has been revealed.
    bool isWin() const;

    bool isValid(int row, int col) const;
    int  countAdjacentMines(int row, int col) const;

    // Reveals every mine on the board (called on loss, for the UI reveal).
    void revealAllMines();

    // Finds a safe, currently-hidden, unflagged cell to suggest as a hint.
    // Returns {-1, -1} if no such cell exists (shouldn't happen mid-game).
    std::pair<int, int> findHint() const;

    // Serializes full board state to a JSON string for the frontend.
    std::string toJson() const;

    int rows() const { return m_rows; }
    int cols() const { return m_cols; }
    int mineCount() const { return m_mineCount; }
    int flagsUsed() const { return m_flagsUsed; }
    bool minesPlaced() const { return m_minesPlaced; }
    const Cell& at(int row, int col) const { return m_grid[row][col]; }

    // --- Restoration helpers (used by SaveManager to rebuild a board) ---
    // Two-phase by design: restoreCell() only sets raw flags (mine/revealed/
    // flagged) since adjacentMines can't be computed correctly until every
    // cell's mine flag is in place. finalizeRestore() runs the adjacency
    // pass afterwards, once all cells have been restored.
    void restoreCell(int row, int col, bool mine, bool revealed, bool flagged);
    void finalizeRestore();
    void markMinesPlaced() { m_minesPlaced = true; }

private:
    int m_rows;
    int m_cols;
    int m_mineCount;
    int m_flagsUsed  = 0;
    bool m_minesPlaced = false;
    std::vector<std::vector<Cell>> m_grid;

    // BFS flood fill: reveals (row, col) and expands outward through
    // every connected run of zero-adjacent-mine cells.
    void floodFill(int row, int col);

    std::vector<std::pair<int, int>> neighbors(int row, int col) const;
};

} // namespace minesweeper
