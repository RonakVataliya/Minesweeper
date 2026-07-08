// =============================================================================
// app.js
//
// Pure presentation layer. This file only does DOM manipulation, event
// handling, and animation - every game *rule* (mine placement, flood fill,
// win/loss detection, hints) lives in C++ and runs here as WebAssembly via
// the Embind bindings declared in backend/Game.cpp / backend/SaveManager.cpp.
//
// Data flow: user input -> app.js calls a Game method -> app.js re-reads
// game.toJson() -> render() repaints the DOM from that state. app.js never
// decides whether a move is legal or who won; it only reflects what the
// C++ layer reports.
// =============================================================================

const NUMBER_CLASS = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

const els = {
  board: document.getElementById('board'),
  mineCounter: document.getElementById('mineCounter'),
  timer: document.getElementById('timer'),
  faceButton: document.getElementById('faceButton'),
  faceIcon: document.getElementById('faceIcon'),
  hintButton: document.getElementById('hintButton'),
  saveButton: document.getElementById('saveButton'),
  loadButton: document.getElementById('loadButton'),
  flagModeButton: document.getElementById('flagModeButton'),
  difficultySwitch: document.getElementById('difficultySwitch'),
  loseOverlay: document.getElementById('loseOverlay'),
  winOverlay: document.getElementById('winOverlay'),
  winSummary: document.getElementById('winSummary'),
  loseRetryButton: document.getElementById('loseRetryButton'),
  winRetryButton: document.getElementById('winRetryButton'),
  bestTime: document.getElementById('bestTime'),
  bestDifficultyLabel: document.getElementById('bestDifficultyLabel'),
};

let Module = null;      // the loaded Emscripten module
let game = null;        // bound C++ Game instance
let saveManager = null; // bound C++ SaveManager instance
let currentDifficulty = 'Easy';
let flagMode = false;
let timerHandle = null;
let hintCell = null;    // {row, col} currently highlighted, or null
let explodedCell = null;

const SAVE_DIR = '/minesweeper-save';

function pad3(n) {
  return String(Math.max(0, Math.min(999, n))).padStart(3, '0');
}

// --- Persistence bootstrap: mount an IndexedDB-backed folder so save files
// and high scores survive a page reload, not just the current session. ---
function mountPersistentStorage() {
  try {
    Module.FS.mkdir(SAVE_DIR);
  } catch (e) { /* already exists */ }
  Module.FS.mount(Module.IDBFS, {}, SAVE_DIR);
  return new Promise((resolve) => {
    Module.FS.syncfs(true, () => resolve());
  });
}

function persistToIndexedDb() {
  Module.FS.syncfs(false, () => {});
}

async function boot() {
  Module = await createMinesweeperModule();
  await mountPersistentStorage();

  game = new Module.Game();
  saveManager = new Module.SaveManager(SAVE_DIR);

  game.newGame(Module.Difficulty.Easy);
  refreshBestTime();
  startTimerLoop();
  render();

  wireEvents();
}

function wireEvents() {
  els.faceButton.addEventListener('click', () => {
    game.newGame(Module.Difficulty[currentDifficulty]);
    hintCell = null;
    explodedCell = null;
    render();
  });

  els.difficultySwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('.diff-btn');
    if (!btn) return;
    currentDifficulty = btn.dataset.difficulty;
    [...els.difficultySwitch.children].forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    game.newGame(Module.Difficulty[currentDifficulty]);
    hintCell = null;
    explodedCell = null;
    refreshBestTime();
    render();
  });

  els.hintButton.addEventListener('click', () => {
    const raw = game.hint(); // "row,col" or "-1,-1"
    const [r, c] = raw.split(',').map(Number);
    hintCell = (r >= 0) ? { row: r, col: c } : null;
    render();
  });

  els.flagModeButton.addEventListener('click', () => {
    flagMode = !flagMode;
    els.flagModeButton.classList.toggle('active', flagMode);
  });

  els.saveButton.addEventListener('click', () => {
    saveManager.saveGame(game, 'autosave');
    persistToIndexedDb();
    flashButton(els.saveButton);
  });

  els.loadButton.addEventListener('click', () => {
    const ok = saveManager.loadGame(game, 'autosave');
    if (ok) {
      hintCell = null;
      explodedCell = null;
      render();
    }
    flashButton(els.loadButton);
  });

  els.loseRetryButton.addEventListener('click', () => {
    game.newGame(Module.Difficulty[currentDifficulty]);
    hideOverlays();
    render();
  });

  els.winRetryButton.addEventListener('click', () => {
    game.newGame(Module.Difficulty[currentDifficulty]);
    hideOverlays();
    render();
  });
}

function flashButton(btn) {
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 220);
}

function hideOverlays() {
  els.loseOverlay.classList.add('hidden');
  els.winOverlay.classList.add('hidden');
}

function startTimerLoop() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    els.timer.textContent = pad3(Number(game.elapsedSeconds()));
  }, 250);
}

function refreshBestTime() {
  els.bestDifficultyLabel.textContent = currentDifficulty;
  const best = saveManager ? Number(saveManager.bestTime(currentDifficulty)) : -1;
  els.bestTime.textContent = best >= 0 ? `${best}s` : '\u2014';
}

// --- Rendering: fully re-paints the board from the current game state. ---
function render() {
  const state = JSON.parse(game.toJson());
  const board = state.board;

  els.mineCounter.textContent =
    String(Math.max(0, board.mineCount - board.flagsUsed)).padStart(3, '0');
  els.timer.textContent = pad3(state.elapsedSeconds);

  els.board.style.gridTemplateColumns = `repeat(${board.cols}, var(--tile-size, 34px))`;
  els.board.innerHTML = '';

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.cells[r][c];
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = r;
      tile.dataset.col = c;

      if (cell.f === 1 && cell.r === 0) {
        tile.classList.add('flagged');
      } else if (cell.r === 1) {
        tile.classList.add('revealed');
        if (cell.m === 1) {
          tile.classList.add('mine');
          tile.textContent = '\u{1F4A3}';
          if (explodedCell && explodedCell.row === r && explodedCell.col === c) {
            tile.classList.add('exploded');
          }
        } else if (cell.a > 0) {
          tile.textContent = String(cell.a);
          tile.classList.add(NUMBER_CLASS[cell.a]);
        }
      }

      if (hintCell && hintCell.row === r && hintCell.col === c && cell.r === 0) {
        tile.classList.add('hint-glow');
      }

      tile.addEventListener('click', () => onTileClick(r, c));
      tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onTileFlag(r, c);
      });

      els.board.appendChild(tile);
    }
  }

  updateFace(state.state);

  if (state.state === 'Lost') {
    explodedCell = findExplodedCell(board);
    render_finalizeLoss(state);
  } else if (state.state === 'Won') {
    render_finalizeWin(state);
  }
}

function findExplodedCell(board) {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.cells[r][c];
      if (cell.m === 1 && cell.r === 1) return { row: r, col: c };
    }
  }
  return null;
}

function render_finalizeLoss(state) {
  els.loseOverlay.classList.remove('hidden');
}

function render_finalizeWin(state) {
  saveManager.recordHighScore(currentDifficulty, BigInt(state.elapsedSeconds));
  persistToIndexedDb();
  refreshBestTime();
  els.winSummary.textContent = `Cleared the board in ${state.elapsedSeconds}s.`;
  els.winOverlay.classList.remove('hidden');
}

function updateFace(stateName) {
  if (stateName === 'Won') els.faceIcon.textContent = '\u{1F60E}';
  else if (stateName === 'Lost') els.faceIcon.textContent = '\u{1F635}';
  else els.faceIcon.textContent = '\u{1F642}';
}

function onTileClick(row, col) {
  if (flagMode) {
    onTileFlag(row, col);
    return;
  }
  hintCell = null;
  game.reveal(row, col);
  render();
}

function onTileFlag(row, col) {
  game.toggleFlag(row, col);
  render();
}

boot();
