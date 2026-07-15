# chesseval

A minimalist chess game with a live evaluation bar, playable in the browser or as a native desktop app.

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

## Project structure

- `src/engine/stockfish.ts` — Worker wrapper around Stockfish, speaks UCI, exposes a simple `findBestMove()` API
- `public/stockfish-18-lite-single.{js,wasm}` — the bundled engine (from the [`stockfish`](https://www.npmjs.com/package/stockfish) npm package)
- `src/components/Board.tsx` — the chessboard UI
- `src/components/EvalBar.tsx` — the evaluation bar
- `src/components/Controls.tsx` — mode toggle, side selector, strength slider
- `src/App.tsx` — game state and wiring
- `src-tauri/` — Tauri desktop shell (Rust)

## License note

The bundled Stockfish engine is GPLv3-licensed. This project uses it as a separate, unmodified WASM binary invoked over the UCI protocol (the same arrangement used by lichess.org and most web chess sites), not statically linked into the app's own code. If you plan to distribute this project further, keep `Copying.txt`/attribution for Stockfish alongside it.
