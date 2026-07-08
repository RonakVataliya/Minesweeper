//===----------------------------------------------------------------------===
// Board.cpp
//===----------------------------------------------------------------------===
#include "Board.h"
#include <algorithm>
#include <numeric>
#include <queue>
#include <random>
#include <sstream>
#include <unordered_set>

namespace minesweeper {

Board::Board(int rows, int cols, int mineCount)
    : m_rows(rows), m_cols(cols), m_mineCount(mineCount),
      m_grid(rows, std::vector<Cell>(cols)) {}

bool Board::isValid(int row, int col) const {
    return row >= 0 && row < m_rows && col >= 0 && col < m_cols;
}

std::vector<std::pair<int, int>> Board::neighbors(int row, int col) const {
    std::vector<std::pair<int, int>> result;
    result.reserve(8);
    for (int dr = -1; dr <= 1; ++dr) {
        for (int dc = -1; dc <= 1; ++dc) {
            if (dr == 0 && dc == 0) continue;
            int nr = row + dr, nc = col + dc;
            if (isValid(nr, nc)) result.emplace_back(nr, nc);
        }
    }
    return result;
}

void Board::placeMines(int firstRow, int firstCol) {
    if (m_minesPlaced) return;

    // Cells that must stay mine-free: the clicked cell plus its neighbors.
    std::unordered_set<int> safeCells;
    safeCells.insert(firstRow * m_cols + firstCol);
    for (auto& [nr, nc] : neighbors(firstRow, firstCol)) {
        safeCells.insert(nr * m_cols + nc);
    }

    // Candidate pool = all cells minus the safe zone, then take a random
    // sample of size mineCount (reservoir-style via shuffle - simple and
    // more than fast enough for boards up to a few thousand cells).
    std::vector<int> candidates;
    candidates.reserve(m_rows * m_cols);
    for (int i = 0; i < m_rows * m_cols; ++i) {
        if (safeCells.find(i) == safeCells.end()) candidates.push_back(i);
    }

    std::random_device rd;
    std::mt19937 rng(rd());
    std::shuffle(candidates.begin(), candidates.end(), rng);

    int minesToPlace = std::min(m_mineCount, static_cast<int>(candidates.size()));
    for (int i = 0; i < minesToPlace; ++i) {
        int idx = candidates[i];
        m_grid[idx / m_cols][idx % m_cols].isMine = true;
    }

    // Precompute adjacent-mine counts once, up front - O(rows*cols*8).
    for (int r = 0; r < m_rows; ++r) {
        for (int c = 0; c < m_cols; ++c) {
            if (!m_grid[r][c].isMine) {
                m_grid[r][c].adjacentMines = countAdjacentMines(r, c);
            }
        }
    }

    m_minesPlaced = true;
}

int Board::countAdjacentMines(int row, int col) const {
    int count = 0;
    for (auto& [nr, nc] : neighbors(row, col)) {
        if (m_grid[nr][nc].isMine) ++count;
    }
    return count;
}

void Board::floodFill(int row, int col) {
    // Classic BFS flood fill: expand through every connected zero-cell,
    // revealing its bordering numbered cells but not tunneling past them.
    std::queue<std::pair<int, int>> frontier;
    frontier.emplace(row, col);
    m_grid[row][col].isRevealed = true;

    while (!frontier.empty()) {
        auto [r, c] = frontier.front();
        frontier.pop();

        if (m_grid[r][c].adjacentMines != 0) continue; // numbered border, stop

        for (auto& [nr, nc] : neighbors(r, c)) {
            Cell& cell = m_grid[nr][nc];
            if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
                cell.isRevealed = true;
                frontier.emplace(nr, nc);
            }
        }
    }
}

bool Board::reveal(int row, int col) {
    Cell& cell = m_grid[row][col];
    if (cell.isFlagged || cell.isRevealed) return true;

    if (cell.isMine) {
        cell.isRevealed = true;
        return false; // caller (Game) interprets this as a loss
    }

    if (cell.adjacentMines == 0) {
        floodFill(row, col);
    } else {
        cell.isRevealed = true;
    }
    return true;
}

int Board::toggleFlag(int row, int col) {
    Cell& cell = m_grid[row][col];
    if (cell.isRevealed) return m_flagsUsed;

    cell.isFlagged = !cell.isFlagged;
    m_flagsUsed += cell.isFlagged ? 1 : -1;
    return m_flagsUsed;
}

bool Board::isWin() const {
    for (const auto& row : m_grid) {
        for (const auto& cell : row) {
            if (!cell.isMine && !cell.isRevealed) return false;
        }
    }
    return true;
}

void Board::revealAllMines() {
    for (auto& row : m_grid) {
        for (auto& cell : row) {
            if (cell.isMine) cell.isRevealed = true;
        }
    }
}

std::pair<int, int> Board::findHint() const {
    // Prefer a hidden safe cell that borders an already-revealed number,
    // since that's the most "teachable" hint. Fall back to any safe
    // hidden cell if the board has no revealed frontier yet.
    for (int r = 0; r < m_rows; ++r) {
        for (int c = 0; c < m_cols; ++c) {
            const Cell& cell = m_grid[r][c];
            if (cell.isRevealed || cell.isMine) continue;
            for (auto& [nr, nc] : neighbors(r, c)) {
                if (m_grid[nr][nc].isRevealed) return {r, c};
            }
        }
    }
    for (int r = 0; r < m_rows; ++r) {
        for (int c = 0; c < m_cols; ++c) {
            const Cell& cell = m_grid[r][c];
            if (!cell.isRevealed && !cell.isMine) return {r, c};
        }
    }
    return {-1, -1};
}

void Board::restoreCell(int row, int col, bool mine, bool revealed, bool flagged) {
    Cell& cell = m_grid[row][col];
    cell.isMine = mine;
    cell.isRevealed = revealed;
    cell.isFlagged = flagged;
    if (flagged) ++m_flagsUsed;
}

void Board::finalizeRestore() {
    for (int r = 0; r < m_rows; ++r) {
        for (int c = 0; c < m_cols; ++c) {
            Cell& cell = m_grid[r][c];
            cell.adjacentMines = cell.isMine ? 0 : countAdjacentMines(r, c);
        }
    }
}

std::string Board::toJson() const {
    std::ostringstream out;
    out << "{\"rows\":" << m_rows << ",\"cols\":" << m_cols
        << ",\"mineCount\":" << m_mineCount << ",\"flagsUsed\":" << m_flagsUsed
        << ",\"cells\":[";
    for (int r = 0; r < m_rows; ++r) {
        out << "[";
        for (int c = 0; c < m_cols; ++c) {
            const Cell& cell = m_grid[r][c];
            out << "{\"m\":" << (cell.isMine ? 1 : 0)
                << ",\"r\":" << (cell.isRevealed ? 1 : 0)
                << ",\"f\":" << (cell.isFlagged ? 1 : 0)
                << ",\"a\":" << cell.adjacentMines << "}";
            if (c + 1 < m_cols) out << ",";
        }
        out << "]";
        if (r + 1 < m_rows) out << ",";
    }
    out << "]}";
    return out.str();
}

} // namespace minesweeper
