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
- Time controls with presets from 1+0 up to 30+0 (including 2+1/3+2-style Fischer increment), or no clock at all
- Premoves against the AI or a remote opponent: queue a move while it's not your turn and it plays instantly the
  moment it is
- Two piece styles — Minimalist (the default Unicode glyphs) and Fantasy (an MIT-licensed SVG set), remembered
  across visits
- Pieces slide between squares on every move (yours, the AI's, or a premove firing) instead of snapping instantly
- Classic wood-tone minimal board styling
- Desktop packaging via [Tauri](https://tauri.app)
- Optional full-stack features, each its own backend service, off by default (the live demo above runs
  without them — see [Full-stack](#full-stack-game-history--online-play) below):
  - Game history: save finished games and browse them later (Express + Postgres)
  - Online play: create a room, share the 6-character code, and play someone on another computer in real
    time (FastAPI + WebSockets, server-validated with `python-chess`)

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

## Full-stack: game history & online play

Two independent backend services, deliberately in two different languages — the frontend is otherwise 100%
client-side, and both of these are optional (off in the GitHub Pages demo above):

- **`server/`** — Express + Prisma + Postgres (TypeScript). Saves finished games (PGN, result, mode) for the
  "Save Game" / "Game History" UI. Enabled at build time by setting `VITE_API_URL`.
- **`online-server/`** — FastAPI (Python), using [`python-chess`](https://python-chess.readthedocs.io/) for
  server-side move validation. Powers the "Play Online" mode: a thin, server-authoritative WebSocket relay —
  rooms are in-memory (a 6-character code identifies each one), every move is re-validated on the server
  before being relayed to both players, and a room is cleaned up once both sides disconnect. Enabled at
  build time by setting `VITE_WS_URL`.

Neither is deployed anywhere publicly yet, and there's no reconnect-to-a-dropped-game support for online
play. Going from "works locally / on a LAN" to "playable with anyone on the internet" just needs each backend
hosted somewhere with a public URL (e.g. Render or Fly.io, both Docker-friendly with a free tier) and the
frontend's `VITE_API_URL` / `VITE_WS_URL` pointed at them.

Run the whole stack locally with Docker:

```sh
docker compose up --build
```

This starts Postgres, the games API (applying Prisma migrations automatically on boot) at
`http://localhost:4000`, and the online-play relay at `http://localhost:8000`. Then point the frontend at both:

```sh
cat > .env.local <<'EOF'
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:8000/ws
EOF
npm run dev
```

Open two browser tabs (or two computers on the same network pointed at your machine's IP) to try online play:
create a room in one, join with its code in the other.

To work on the games API directly (without Docker): copy `server/.env.example` to `server/.env` (point
`DATABASE_URL` at any local Postgres), then from `server/`:

```sh
npm install
npx prisma migrate dev
npm run dev          # API on http://localhost:4000
npm test              # runs against DATABASE_URL from server/.env.test (see .env.test.example)
npm run lint
```

To work on the online-play relay directly: from `online-server/`, with Python 3.11+:

```sh
python -m venv .venv
.venv/Scripts/activate       # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
pytest
ruff check . && ruff format --check . && mypy .
```

`server/` and `online-server/` each have their own dependency manifest, lint/format/typecheck tooling, and CI
job (`backend` and `online-server` in `.github/workflows/ci.yml`) — both are separate packages from the Vite
frontend, not a workspace.

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
- `src/clock.ts` / `src/hooks/useChessClock.ts` — time-control ticking, increment, and flag-fall, unit tested
- `src/premove.ts` — pseudo-legal premove target generation, unit tested
- `src/pieceThemes.ts` / `src/components/PieceGlyph.tsx` — piece-style theme switching (Unicode glyphs or SVG)
- `public/pieces/fantasy/` — the "Fantasy" SVG piece set (MIT licensed, see its `LICENSE.txt`)
- `src/components/Board.tsx` — the chessboard UI
- `src/components/EvalBar.tsx` — the evaluation bar
- `src/components/evalBarDisplay.ts` — pure score-to-percent/label math for the eval bar, unit tested
- `src/components/Controls.tsx` — mode/time-control/piece-style selectors, side selector, strength slider
- `src/components/ErrorBoundary.tsx` — catches render-time errors so the app fails visibly instead of going blank
- `src/components/GameHistory.tsx` — saved-games list/delete panel
- `src/gameResult.ts` — pure PGN-result derivation, unit tested
- `src/api/backend.ts` — per-service "is this backend configured" checks (`VITE_API_URL` for game history,
  `VITE_WS_URL` for online play), each independently optional
- `src/api/gamesClient.ts` — the games-history API client, no-ops when `VITE_API_URL` is unset
- `src/hooks/useOnlineGame.ts` / `src/components/OnlineLobby.tsx` — the online-play WebSocket client and its
  create/join-room UI, no-ops when `VITE_WS_URL` is unset
- `src/App.tsx` — game state and UI wiring
- `src-tauri/` — Tauri desktop shell (Rust)
- `server/` — standalone Express + Prisma + Postgres API for saved games (own `package.json`; TypeScript; see
  [Full-stack](#full-stack-game-history--online-play))
- `online-server/` — standalone FastAPI online-play relay (own `requirements.txt`/`pyproject.toml`; Python +
  [`python-chess`](https://python-chess.readthedocs.io/) for server-side legality; see
  [Full-stack](#full-stack-game-history--online-play))
  - `online-server/app/rooms.py` / `online-server/app/main.py` — in-memory room state and the WebSocket
    relay, unit tested (including a full two-client integration test via FastAPI's `TestClient`)
- `docker-compose.yml` — `db` + `api` + `online` services for running the full stack locally

## License

This project's own code is [MIT licensed](LICENSE).

The bundled Stockfish engine is GPLv3-licensed. This project uses it as a separate, unmodified WASM binary invoked over the UCI protocol (the same arrangement used by lichess.org and most web chess sites), not statically linked into the app's own code. If you plan to distribute this project further, keep `Copying.txt`/attribution for Stockfish alongside it.

The "Fantasy" piece set (`public/pieces/fantasy/`) is by Maurizio Monge, sourced from [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/fantasy), MIT licensed — see `public/pieces/fantasy/LICENSE.txt`.
