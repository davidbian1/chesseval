import type { Chess, Move } from 'chess.js';
import { applyUciLine, INITIAL_UCI_INFO, matchUciMove, parseBestMoveToken, scoreFromUciInfo } from './uci';

export interface SearchResult {
  move: Move | null;
  /** Evaluation in centipawns from White's perspective. */
  score: number;
  depth: number;
  /** Positive: White forces mate in N moves. Negative: Black does. Null if no forced mate found. */
  mateIn: number | null;
}

// Respects Vite's configured base path so the worker still resolves correctly
// when the app is served from a subpath (e.g. GitHub Pages project sites).
const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish-18-lite-single.js`;

class StockfishEngine {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    // Without this, a failed/blocked worker load (e.g. wrong deploy base path)
    // fails silently: readyPromise never resolves and every search just hangs.
    this.worker.addEventListener('error', (e) => {
      console.error('Stockfish worker failed to load or crashed:', e.message);
    });
    this.readyPromise = this.handshake();
  }

  private handshake(): Promise<void> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent<string>) => {
        if (e.data === 'uciok') {
          this.worker.postMessage('isready');
        } else if (e.data === 'readyok') {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage('uci');
    });
  }

  /** Runs one search at a time; concurrent calls queue behind each other. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async go(chess: Chess, opts: { movetimeMs: number; skillLevel: number }): Promise<SearchResult> {
    await this.readyPromise;

    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
      return { move: null, score: 0, depth: 0, mateIn: null };
    }

    const fen = chess.fen();
    const whiteToMove = chess.turn() === 'w';

    return this.enqueue(
      () =>
        new Promise<SearchResult>((resolve) => {
          let info = INITIAL_UCI_INFO;

          const handler = (e: MessageEvent<string>) => {
            const line = e.data;
            if (line.startsWith('info')) {
              info = applyUciLine(line, info);
            } else if (line.startsWith('bestmove')) {
              this.worker.removeEventListener('message', handler);

              const move = matchUciMove(legalMoves, parseBestMoveToken(line));
              const { score, mateIn } = scoreFromUciInfo(info, whiteToMove);

              resolve({ move, score, depth: info.depth, mateIn });
            }
          };

          this.worker.addEventListener('message', handler);
          this.worker.postMessage(`setoption name Skill Level value ${opts.skillLevel}`);
          this.worker.postMessage('ucinewgame');
          this.worker.postMessage(`position fen ${fen}`);
          this.worker.postMessage(`go movetime ${Math.max(50, Math.round(opts.movetimeMs))}`);
        }),
    );
  }

  /** Interrupts any in-flight search so it reports a bestmove immediately instead of running out its full budget. */
  stop(): void {
    this.worker.postMessage('stop');
  }
}

let engine: StockfishEngine | null = null;

function getEngine(): StockfishEngine {
  if (!engine) engine = new StockfishEngine();
  return engine;
}

/**
 * `strength` (0-1) maps to Stockfish's Skill Level (0-20) and scales think time.
 */
export function findBestMove(chess: Chess, timeBudgetMs: number, strength = 1): Promise<SearchResult> {
  const skillLevel = Math.round(strength * 20);
  const movetimeMs = Math.max(50, timeBudgetMs * Math.max(0.15, strength));
  return getEngine().go(chess, { movetimeMs, skillLevel });
}

/** Interrupts whatever search is currently running (e.g. when the game is reset mid-think). */
export function stopSearch(): void {
  engine?.stop();
}
