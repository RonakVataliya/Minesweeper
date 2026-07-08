//===----------------------------------------------------------------------===
// Game.cpp
//===----------------------------------------------------------------------===
#include "Game.h"
#include <sstream>
#include <stdexcept>

namespace minesweeper {

std::tuple<int, int, int> Game::difficultyConfig(Difficulty d) {
    switch (d) {
        case Difficulty::Easy:   return {9, 9, 10};
        case Difficulty::Medium: return {16, 16, 40};
        case Difficulty::Hard:   return {16, 30, 99};
    }
    throw std::invalid_argument("Unknown difficulty");
}

std::string Game::difficultyName(Difficulty d) {
    switch (d) {
        case Difficulty::Easy:   return "Easy";
        case Difficulty::Medium: return "Medium";
        case Difficulty::Hard:   return "Hard";
    }
    return "Unknown";
}

std::string Game::stateName(GameState s) {
    switch (s) {
        case GameState::Ready:   return "Ready";
        case GameState::Playing: return "Playing";
        case GameState::Won:     return "Won";
        case GameState::Lost:    return "Lost";
    }
    return "Unknown";
}

Game::Game() : m_board(9, 9, 10) {}

void Game::newGame(Difficulty difficulty) {
    auto [rows, cols, mines] = difficultyConfig(difficulty);
    m_board       = Board(rows, cols, mines);
    m_difficulty  = difficulty;
    m_state       = GameState::Ready;
    m_hintsUsed   = 0;
    m_frozenElapsed = 0;
    m_restoredElapsed = 0;
}

bool Game::reveal(int row, int col) {
    if (m_state == GameState::Won || m_state == GameState::Lost) return true;
    if (!m_board.isValid(row, col)) return true;

    if (m_state == GameState::Ready) {
        m_board.placeMines(row, col);
        m_state = GameState::Playing;
        m_startTime = std::chrono::steady_clock::now();
    }

    bool survived = m_board.reveal(row, col);

    if (!survived) {
        m_state = GameState::Lost;
        m_board.revealAllMines();
        m_frozenElapsed = elapsedSeconds();
    } else if (m_board.isWin()) {
        m_state = GameState::Won;
        m_frozenElapsed = elapsedSeconds();
    }
    return survived;
}

bool Game::toggleFlag(int row, int col) {
    if (m_state != GameState::Playing && m_state != GameState::Ready) return false;
    if (!m_board.isValid(row, col)) return false;
    m_board.toggleFlag(row, col);
    return true;
}

std::string Game::hint() {
    if (m_state != GameState::Playing) return "-1,-1";
    auto [r, c] = m_board.findHint();
    ++m_hintsUsed;
    std::ostringstream out;
    out << r << "," << c;
    return out.str();
}

long long Game::elapsedSeconds() const {
    if (m_state == GameState::Won || m_state == GameState::Lost) {
        return m_frozenElapsed;
    }
    if (m_state == GameState::Ready) {
        return m_restoredElapsed;
    }
    auto now = std::chrono::steady_clock::now();
    auto secs = std::chrono::duration_cast<std::chrono::seconds>(now - m_startTime).count();
    return secs + m_restoredElapsed;
}

void Game::restoreMeta(GameState state, Difficulty difficulty,
                        long long elapsedSeconds, int hintsUsed, bool minesPlaced) {
    m_state = state;
    m_difficulty = difficulty;
    m_hintsUsed = hintsUsed;
    m_restoredElapsed = elapsedSeconds;
    m_frozenElapsed = elapsedSeconds;
    m_startTime = std::chrono::steady_clock::now();
    if (minesPlaced) m_board.markMinesPlaced();
}

std::string Game::toJson() const {
    std::ostringstream out;
    out << "{\"state\":\"" << stateName(m_state) << "\""
        << ",\"difficulty\":\"" << difficultyName(m_difficulty) << "\""
        << ",\"elapsedSeconds\":" << elapsedSeconds()
        << ",\"hintsUsed\":" << m_hintsUsed
        << ",\"board\":" << m_board.toJson()
        << "}";
    return out.str();
}

} // namespace minesweeper

//===----------------------------------------------------------------------===
// Browser build: expose Game to JavaScript via Embind. app.js drives the
// entire UI through this binding - no game rules are duplicated in JS.
//===----------------------------------------------------------------------===
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(minesweeper_module) {
    emscripten::enum_<minesweeper::Difficulty>("Difficulty")
        .value("Easy", minesweeper::Difficulty::Easy)
        .value("Medium", minesweeper::Difficulty::Medium)
        .value("Hard", minesweeper::Difficulty::Hard);

    emscripten::class_<minesweeper::Game>("Game")
        .constructor<>()
        .function("newGame", &minesweeper::Game::newGame)
        .function("reveal", &minesweeper::Game::reveal)
        .function("toggleFlag", &minesweeper::Game::toggleFlag)
        .function("hint", &minesweeper::Game::hint)
        .function("elapsedSeconds", &minesweeper::Game::elapsedSeconds)
        .function("toJson", &minesweeper::Game::toJson);
}
#endif

//===----------------------------------------------------------------------===
// Native build: a tiny text-mode console driver. This exists purely so the
// backend logic can be built, played, and demoed with plain g++ (no
// Emscripten toolchain required) - useful for local testing and for
// showing the algorithms work independent of any UI layer.
//===----------------------------------------------------------------------===
#ifndef __EMSCRIPTEN__
#include <iostream>
#include "SaveManager.h"

namespace {

void printBoard(const minesweeper::Game& game) {
    const auto& board = game.board();
    std::cout << "\n   ";
    for (int c = 0; c < board.cols(); ++c) std::cout << (c % 10) << " ";
    std::cout << "\n";
    for (int r = 0; r < board.rows(); ++r) {
        std::cout << (r % 10) << "  ";
        for (int c = 0; c < board.cols(); ++c) {
            const auto& cell = board.at(r, c);
            char symbol = '.';
            if (cell.isFlagged) symbol = 'F';
            else if (!cell.isRevealed) symbol = '#';
            else if (cell.isMine) symbol = '*';
            else if (cell.adjacentMines == 0) symbol = ' ';
            else symbol = static_cast<char>('0' + cell.adjacentMines);
            std::cout << symbol << " ";
        }
        std::cout << "\n";
    }
    std::cout << "Mines: " << board.mineCount() << "  Flags: " << board.flagsUsed()
              << "  Time: " << game.elapsedSeconds() << "s"
              << "  State: " << minesweeper::Game::stateName(game.state()) << "\n";
}

} // namespace

int main() {
    minesweeper::Game game;
    minesweeper::SaveManager saveManager;
    game.newGame(minesweeper::Difficulty::Easy);

    std::cout << "Minesweeper (console demo)\n"
                 "Commands: r <row> <col> | f <row> <col> | h | save | load | new | quit\n";

    std::string cmd;
    while (true) {
        printBoard(game);
        if (game.state() == minesweeper::GameState::Won) {
            std::cout << "You win! Time: " << game.elapsedSeconds() << "s\n";
            saveManager.recordHighScore(minesweeper::Game::difficultyName(game.difficulty()),
                                         game.elapsedSeconds());
        } else if (game.state() == minesweeper::GameState::Lost) {
            std::cout << "Boom - game over.\n";
        }

        std::cout << "> ";
        if (!(std::cin >> cmd)) break;

        if (cmd == "quit") {
            break;
        } else if (cmd == "new") {
            game.newGame(game.difficulty());
        } else if (cmd == "h") {
            std::cout << "Hint: " << game.hint() << "\n";
        } else if (cmd == "save") {
            saveManager.saveGame(game, "autosave");
            std::cout << "Saved.\n";
        } else if (cmd == "load") {
            if (saveManager.loadGame(game, "autosave")) std::cout << "Loaded.\n";
            else std::cout << "No save found.\n";
        } else if (cmd == "r" || cmd == "f") {
            int r, c;
            std::cin >> r >> c;
            if (cmd == "r") game.reveal(r, c);
            else game.toggleFlag(r, c);
        } else {
            std::cout << "Unknown command.\n";
        }
    }
    return 0;
}
#endif
