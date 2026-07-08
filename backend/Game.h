#pragma once
//===----------------------------------------------------------------------===
// Game.h
//
// Top-level controller. Composes a Board (has-a, not is-a - there is no
// inheritance in this codebase by design) and layers game-level concerns on
// top of it: difficulty presets, timing, win/loss state, and hint
// coordination (Game decides *when* a hint may be requested; Board's
// findHint() decides *which* cell to suggest).
//===----------------------------------------------------------------------===
#include "Board.h"
#include <chrono>
#include <string>

namespace minesweeper {

enum class Difficulty { Easy, Medium, Hard };
enum class GameState { Ready, Playing, Won, Lost };

class Game {
public:
    Game();

    // Starts a fresh game at the given difficulty. Mines are not placed
    // yet - that happens lazily on the first reveal() so the first click
    // is always safe.
    void newGame(Difficulty difficulty);

    // Reveals a cell. Returns false if that cell was a mine (game lost).
    bool reveal(int row, int col);

    bool toggleFlag(int row, int col);

    // Returns "row,col" of a suggested safe cell, or "-1,-1" if unavailable.
    // Only usable while the game is actively being played.
    std::string hint();

    long long elapsedSeconds() const;
    GameState state() const { return m_state; }
    Difficulty difficulty() const { return m_difficulty; }
    int hintsUsed() const { return m_hintsUsed; }
    const Board& board() const { return m_board; }

    std::string toJson() const;

    // --- Restoration helpers (used by SaveManager to rebuild a session) ---
    void restoreMeta(GameState state, Difficulty difficulty,
                      long long elapsedSeconds, int hintsUsed, bool minesPlaced);
    Board& mutableBoard() { return m_board; }

    static std::string difficultyName(Difficulty d);
    static std::string stateName(GameState s);

    // (rows, cols, mineCount) for a given difficulty preset.
    static std::tuple<int, int, int> difficultyConfig(Difficulty d);

private:
    Board m_board;
    GameState m_state       = GameState::Ready;
    Difficulty m_difficulty = Difficulty::Easy;
    int m_hintsUsed         = 0;

    std::chrono::steady_clock::time_point m_startTime;
    long long m_frozenElapsed = 0; // locked in once the game ends
    long long m_restoredElapsed = 0; // offset restored from a save file
};

} // namespace minesweeper
