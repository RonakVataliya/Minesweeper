# 🧨 Minesweeper

A classic, premium-feel Minesweeper clone built with native web technologies — no frameworks, no build step. Clear a rectangular board containing hidden mines using numerical clues about how many mines border each cell, without ever detonating one.

**🎮 [Play it live](https://minesweeper-five-iota.vercel.app)**

## Features

- **Guaranteed-Safe First Click** — mines are generated only after the first move, so the opening cell is never a bomb.
- **Configurable Difficulty** — Beginner (9×9, 10 mines), Intermediate (16×16, 40 mines), and Expert (16×30, 99 mines).
- **Live Mine Counter** — tracks remaining unflagged mines in real time.
- **Game Timer** — starts on the first move, freezes on win or loss.
- **Recursive Reveal** — cascading auto-reveal of connected zero-mine cells and their bordering numbers.
- **Right-Click Flagging** — mark suspected mines with 🚩 to avoid accidental clicks.
- **Win & Loss Detection** — status face transitions (🙂 → 😎 on win, 😵 on loss) with the board freezing on completion.
- **Instant Reset** — click the status face to restart at any time.
- **Responsive Layout** — playable on desktop and mobile, with overflow grid scrolling on smaller screens.
- **Full Keyboard Accessibility** — playable without a mouse via logical focus order, ARIA markup, and custom key bindings.

## How to Play

| Input | Action |
|---|---|
| Left-click | Reveal a cell |
| Right-click | Toggle a 🚩 flag on a hidden cell |
| `Tab` | Move focus onto the board |
| Arrow keys | Navigate focus across cells |
| `Enter` / `Spacebar` | Reveal the focused cell |
| `F` | Flag / unflag the focused cell |

Each revealed number tells you exactly how many mines sit in the 8 cells surrounding it. Win by safely revealing every cell that isn't a mine.

## Folder Structure

```
minesweeper/
├── index.html          # Main HTML structure and script bindings
├── README.md            # Project documentation
├── css/
│   └── styles.css       # Reset, layout grid, color styling, animations
├── js/
    ├── cell.js           # Individual cell data and behavior
    ├── board.js          # Grid generation, mine placement, neighbor mapping
    ├── game.js            # Core game state, rules, win/loss logic
    ├── ui.js              # Rendering, DOM updates, event delegation
    └── main.js            # Entry point — bootstraps the game instance

```

## Running the Project Locally

This is a pure static web app — no build tools, compilers, or server required.

1. Clone the repository:
   ```bash
   git clone https://github.com/RonakVataliya/Minesweeper.git
   cd Minesweeper
   ```
2. Open `index.html` directly in any modern browser (or serve it with a simple static server, e.g. `npx serve .`).

## Architecture

The codebase keeps a clean separation of concerns across a deferred, sequential script-loading model:

| Module | Responsibility |
|---|---|
| `board.js` | Grid creation, random mine distribution, neighbor-coordinate mapping |
| `game.js` | Centralized `gameState`, timer loop, reveal/flag/win-loss rule mutations |
| `ui.js` | User-interaction listeners, DOM updates, ARIA/tabindex accessibility metadata, focus management |
| `main.js` | Application bootstrap — spawns the initial game instance on load |

## Roadmap

Not yet implemented, but natural next steps:

- [ ] **Local High Scores** — persist best completion times per difficulty via `localStorage`.
- [ ] **Custom Grid Sizes** — let players set custom rows, columns, and mine counts.
- [ ] **Theme Customization** — dark/light modes, a retro Windows 95 skin, and classic board layouts.

## Contributing

This is a group project — pull requests are welcome. Please open an issue or PR describing the change before submitting larger features.

## Tech Stack

`HTML` · `CSS` · `JavaScript` (vanilla, no frameworks or build tools)
