# chesseval

[![CI](https://github.com/davidbian1/chesseval/actions/workflows/ci.yml/badge.svg)](https://github.com/davidbian1/chesseval/actions/workflows/ci.yml)

A minimalist chess game with a live evaluation bar, playable in the browser or as a native desktop app.

**Live demo:** [davidbian1.github.io/chesseval](https://davidbian1.github.io/chesseval/)

## Features

- Full chess rules (legal moves, check/checkmate/stalemate/draws) via [chess.js](https://github.com/jhlywa/chess.js)
- Real [Stockfish](https://stockfishchess.org) (lite, single-threaded WASM build) running fully offline in a Web Worker — no network calls
- Live eval bar showing Stockfish's honest assessment, updated after every move (always at full engine strength, independent of the AI opponent's difficulty)
- Toggle between **Human vs Human** and **Human vs AI**
- Adjustable AI strength slider — maps to Stockfish's Skill Level (0–20) and scales think time
- Classic wood-tone minimal board styling
- Desktop packaging via [Tauri](https://tauri.app)

## Running the web app

```sh
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL in your browser.

## Running the desktop app

Requires the Rust toolchain and (on Windows) Visual Studio Build Tools with the "Desktop development with C++" workload.

```sh
npm install
npm run tauri dev
```

This opens a native window running the same game. To build an installable binary:

```sh
npm run tauri build
```

The installer/executable is written to `src-tauri/target/release/bundle/`.

## Development

```sh
npm test           # run the Vitest suite once
npm run test:watch # re-run on file changes
npm run lint        # ESLint
npm run format      # Prettier --write
npm run format:check
```

CI (`.github/workflows/ci.yml`) runs lint, format-check, test, and build on every push and pull request
against `master`. Pushes to `master` also trigger `.github/workflows/deploy.yml`, which builds the web app
and publishes it to GitHub Pages.

## Project structure

- `src/engine/stockfish.ts` — Worker wrapper around Stockfish, speaks UCI, exposes a simple `findBestMove()` API
- `src/engine/uci.ts` — pure UCI info-line parsing, unit tested independent of the Worker
- `public/stockfish-18-lite-single.{js,wasm}` — the bundled engine (from the [`stockfish`](https://www.npmjs.com/package/stockfish) npm package)
- `src/hooks/useEngineEvaluation.ts` — owns the AI-move search and eval-bar refresh effects
- `src/components/Board.tsx` — the chessboard UI
- `src/components/EvalBar.tsx` — the evaluation bar
- `src/components/evalBarDisplay.ts` — pure score-to-percent/label math for the eval bar, unit tested
- `src/components/Controls.tsx` — mode toggle, side selector, strength slider
- `src/components/ErrorBoundary.tsx` — catches render-time errors so the app fails visibly instead of going blank
- `src/App.tsx` — game state and UI wiring
- `src-tauri/` — Tauri desktop shell (Rust)

## License

This project's own code is [MIT licensed](LICENSE).

The bundled Stockfish engine is GPLv3-licensed. This project uses it as a separate, unmodified WASM binary invoked over the UCI protocol (the same arrangement used by lichess.org and most web chess sites), not statically linked into the app's own code. If you plan to distribute this project further, keep `Copying.txt`/attribution for Stockfish alongside it.
