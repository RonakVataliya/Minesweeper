#pragma once
//===----------------------------------------------------------------------===
// SaveManager.h
//
// Persistence layer: serializes a Game to disk and back, and tracks best
// completion times per difficulty. Uses a small hand-rolled text format
// (not JSON) deliberately - Game::toJson()/Board::toJson() are one-way
// "display" formats for the frontend, while save files need to round-trip
// exactly, so a simpler fixed-layout format keeps this class dependency-free.
//===----------------------------------------------------------------------===
#include "Game.h"
#include <string>
#include <unordered_map>

namespace minesweeper {

class SaveManager {
public:
    explicit SaveManager(std::string saveDir = ".");

    bool saveGame(const Game& game, const std::string& slot = "autosave");
    bool loadGame(Game& game, const std::string& slot = "autosave");

    // Records a completion time if it beats the current best for that
    // difficulty. Returns true if a new high score was set.
    bool recordHighScore(const std::string& difficultyName, long long seconds);
    long long bestTime(const std::string& difficultyName) const;
    std::string highScoresJson() const;

private:
    std::string m_saveDir;
    std::unordered_map<std::string, long long> m_highScores;
    static constexpr const char* kHighScoreFile = "highscores.dat";

    std::string savePath(const std::string& slot) const;
    std::string highScorePath() const;
    void loadHighScores();
    void persistHighScores() const;
};

} // namespace minesweeper
