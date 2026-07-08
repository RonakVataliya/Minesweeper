# Minesweeper

A complete Minesweeper implementation with a C++17 game engine and a
glassmorphism-styled web UI. The engine is compiled twice from the same
source: once natively (a text console demo you can build and run in
seconds) and once to WebAssembly via Emscripten (what actually powers the
browser UI). No game rule is ever duplicated in JavaScript.

## Why WebAssembly, not a server

Vanilla JS in a browser has no way to call into a native C++ binary
directly — there's no process for it to talk to. The two honest options
for a "C++ backend, JS frontend" game with no framework and no server are
(a) run a local HTTP server the JS talks to, or (b) compile the C++ engine
itself into WebAssembly and let the JS call it in-process. This project
takes route (b): `backend/Game.cpp` exposes the `Game` and `SaveManager`
classes to JavaScript via [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html),
so `app.js` is genuinely just a thin DOM layer over the real C++ logic,
with no server process required.

## Project Structure

```
Minesweeper/
  backend/
    Game.h / Game.cpp          # controller: difficulty, timer, state, hints
    Board.h / Board.cpp         # grid, mine placement, flood fill, win check
    SaveManager.h / SaveManager.cpp   # save/load + high scores
  frontend/
    index.html                  # header, board, HUD, popups
    style.css                   # dark glassmorphism theme + animations
    app.js                       # DOM rendering & input only — no game rules
  CMakeLists.txt
  README.md
```

## Architecture

- **Board** owns grid state only: `Cell{isMine, isRevealed, isFlagged,
  adjacentMines}`, mine placement, flood fill, flag toggling, win
  detection, and hint search. It has no concept of a timer or game state.
- **Game** *composes* a `Board` (composition, not inheritance — there is
  no class hierarchy in this codebase, by design) and layers difficulty
  presets, a `steady_clock` timer, `GameState` (Ready/Playing/Won/Lost),
  and hint bookkeeping on top.
- **SaveManager** is a separate persistence concern: it serializes a
  `Game`/`Board` pair to a compact fixed-layout text format (not JSON —
  save files need to round-trip exactly, whereas `toJson()` is a one-way
  display format for the UI) and tracks best times per difficulty.
- **app.js** never encodes a rule. Every click calls a bound C++ method,
  re-reads `game.toJson()`, and repaints the DOM from that snapshot.

## OOP concepts used

- Encapsulation: `Cell`/`Board`/`Game` internals are private; everything
  external goes through const accessors or explicit mutators.
- Composition over inheritance: `Game` *has-a* `Board`; there is no
  base/derived class relationship anywhere in the engine.
- Namespaces: everything lives in `minesweeper::`.
- Const correctness: read-only methods (`isValid`, `at`, `toJson`,
  `isWin`, …) are all `const`.
- RAII/value semantics: `Board` and `Game` are ordinary stack-allocated
  value types; `Game::newGame()` simply assigns a fresh `Board`.

## Data structures & algorithms

| Concern              | Structure / Algorithm                                   | Complexity |
|-----------------------|----------------------------------------------------------|------------|
| Grid storage          | `std::vector<std::vector<Cell>>`                          | O(1) access |
| Mine placement        | Fisher–Yates shuffle over candidate cell indices (`std::shuffle`), excluding the first click and its 8 neighbors | O(rows·cols) |
| Adjacency counts      | Precomputed once after mine placement                    | O(rows·cols) |
| Flood fill (reveal)   | Iterative **BFS** with `std::queue<pair<int,int>>`, stopping at numbered (non-zero) cells | O(rows·cols) worst case |
| Win check             | Linear scan: every non-mine cell revealed?                | O(rows·cols) |
| Hint search            | Linear scan for a hidden safe cell bordering a revealed cell (falls back to any hidden safe cell) | O(rows·cols) |
| High scores            | `std::unordered_map<std::string, long long>` keyed by difficulty | O(1) amortized lookup |

## Building & running the native console demo

No Emscripten required — just a normal C++17 toolchain.

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/minesweeper_console
```

(If you don't have CMake installed, `g++ -std=c++17 -Ibackend
backend/Game.cpp backend/Board.cpp backend/SaveManager.cpp -o minesweeper_console`
works identically.)

Console commands: `r <row> <col>` reveal, `f <row> <col>` flag, `h` hint,
`save` / `load` (autosave slot), `new` (restart at the same difficulty),
`quit`.

## Building the browser (WASM) version

Requires the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
(`source ./emsdk_env.sh` after installing, so `emcc` is on your `PATH`):

```bash
emcc backend/Game.cpp backend/Board.cpp backend/SaveManager.cpp \
     -Ibackend -O2 -std=c++17 --bind \
     -s MODULARIZE=1 -s EXPORT_NAME=createMinesweeperModule \
     -s ALLOW_MEMORY_GROWTH=1 -lidbfs.js \
     -o frontend/minesweeper.js
```

This emits `frontend/minesweeper.js` and `frontend/minesweeper.wasm`.
Then serve the `frontend/` folder over HTTP (WASM won't load from
`file://`):

```bash
cd frontend && python3 -m http.server 8080
```

Open `http://localhost:8080`. `app.js` mounts an IDBFS-backed directory
before starting the game, so **Save**/**Load** and best times persist
across page reloads, not just within a session.

## Features

- Three difficulties: Easy (9×9, 10 mines), Medium (16×16, 40 mines),
  Hard (16×30, 99 mines).
- Guaranteed-safe first click.
- Flood-fill reveal, right-click (or Flag Mode toggle, for touch) to flag.
- Live mine counter, running timer, hint button, save/load, per-difficulty
  best times.
- Glassmorphism dark theme, tile flip-in animation on reveal, mine
  explosion animation on loss, animated victory/defeat popups, responsive
  layout down to small phone widths.

## Future improvements

- Chording (reveal all neighbors of a satisfied number with one click).
- Multiple named save slots instead of a single `autosave`.
- A proper minimum-remaining-mines solver for smarter hints (currently a
  simple frontier search rather than constraint propagation).
- Keyboard navigation for accessibility.
