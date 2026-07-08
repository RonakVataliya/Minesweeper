//===----------------------------------------------------------------------===
// SaveManager.cpp
//===----------------------------------------------------------------------===
#include "SaveManager.h"
#include <fstream>
#include <sstream>

namespace minesweeper {

SaveManager::SaveManager(std::string saveDir) : m_saveDir(std::move(saveDir)) {
    loadHighScores();
}

std::string SaveManager::savePath(const std::string& slot) const {
    return m_saveDir + "/" + slot + ".save";
}

std::string SaveManager::highScorePath() const {
    return m_saveDir + "/" + kHighScoreFile;
}

bool SaveManager::saveGame(const Game& game, const std::string& slot) {
    std::ofstream out(savePath(slot), std::ios::trunc);
    if (!out) return false;

    const Board& board = game.board();
    out << static_cast<int>(game.difficulty()) << ' '
        << static_cast<int>(game.state()) << ' '
        << game.elapsedSeconds() << ' '
        << game.hintsUsed() << ' '
        << (board.minesPlaced() ? 1 : 0) << ' '
        << board.rows() << ' ' << board.cols() << ' ' << board.mineCount() << '\n';

    for (int r = 0; r < board.rows(); ++r) {
        for (int c = 0; c < board.cols(); ++c) {
            const Cell& cell = board.at(r, c);
            int packed = (cell.isMine ? 1 : 0) | (cell.isRevealed ? 2 : 0) | (cell.isFlagged ? 4 : 0);
            out << static_cast<char>('0' + packed);
        }
        out << '\n';
    }
    return true;
}

bool SaveManager::loadGame(Game& game, const std::string& slot) {
    std::ifstream in(savePath(slot));
    if (!in) return false;

    int difficultyRaw, stateRaw, rows, cols, mineCount, minesPlacedRaw;
    long long elapsed;
    int hintsUsed;
    in >> difficultyRaw >> stateRaw >> elapsed >> hintsUsed >> minesPlacedRaw
       >> rows >> cols >> mineCount;
    if (!in) return false;

    auto difficulty = static_cast<Difficulty>(difficultyRaw);
    auto state       = static_cast<GameState>(stateRaw);

    game.newGame(difficulty); // resets board to the right dimensions
    Board& board = game.mutableBoard();

    std::string line;
    std::getline(in, line); // consume rest of the header line
    for (int r = 0; r < rows; ++r) {
        if (!std::getline(in, line) || static_cast<int>(line.size()) < cols) return false;
        for (int c = 0; c < cols; ++c) {
            int packed = line[c] - '0';
            bool mine     = packed & 1;
            bool revealed = packed & 2;
            bool flagged  = packed & 4;
            board.restoreCell(r, c, mine, revealed, flagged);
        }
    }
    board.finalizeRestore();

    game.restoreMeta(state, difficulty, elapsed, hintsUsed, minesPlacedRaw != 0);
    return true;
}

void SaveManager::loadHighScores() {
    std::ifstream in(highScorePath());
    if (!in) return;
    std::string difficultyName;
    long long seconds;
    while (in >> difficultyName >> seconds) {
        m_highScores[difficultyName] = seconds;
    }
}

void SaveManager::persistHighScores() const {
    std::ofstream out(highScorePath(), std::ios::trunc);
    for (const auto& [name, seconds] : m_highScores) {
        out << name << ' ' << seconds << '\n';
    }
}

bool SaveManager::recordHighScore(const std::string& difficultyName, long long seconds) {
    auto it = m_highScores.find(difficultyName);
    if (it == m_highScores.end() || seconds < it->second) {
        m_highScores[difficultyName] = seconds;
        persistHighScores();
        return true;
    }
    return false;
}

long long SaveManager::bestTime(const std::string& difficultyName) const {
    auto it = m_highScores.find(difficultyName);
    return it == m_highScores.end() ? -1 : it->second;
}

std::string SaveManager::highScoresJson() const {
    std::ostringstream out;
    out << "{";
    bool first = true;
    for (const auto& [name, seconds] : m_highScores) {
        if (!first) out << ",";
        first = false;
        out << "\"" << name << "\":" << seconds;
    }
    out << "}";
    return out.str();
}

} // namespace minesweeper

//===----------------------------------------------------------------------===
// Browser build: expose SaveManager alongside Game so app.js can save/load
// sessions and read high scores. The save directory is backed by an IDBFS
// mount (see app.js) so files actually survive a page reload.
//===----------------------------------------------------------------------===
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(minesweeper_save_module) {
    emscripten::class_<minesweeper::SaveManager>("SaveManager")
        .constructor<std::string>()
        .function("saveGame", &minesweeper::SaveManager::saveGame)
        .function("loadGame", &minesweeper::SaveManager::loadGame)
        .function("recordHighScore", &minesweeper::SaveManager::recordHighScore)
        .function("bestTime", &minesweeper::SaveManager::bestTime)
        .function("highScoresJson", &minesweeper::SaveManager::highScoresJson);
}
#endif
