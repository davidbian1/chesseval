import type { Chess, Move } from 'chess.js';

export interface SearchResult {
  move: Move | null;
  /** Evaluation in centipawns from White's perspective. */
  score: number;
  depth: number;
  /** Positive: White forces mate in N moves. Negative: Black does. Null if no forced mate found. */
  mateIn: number | null;
}

const ENGINE_URL = '/stockfish-18-lite-single.js';

interface UciInfo {
  depth: number;
  scoreCpFromSideToMove: number | null;
  scoreMateFromSideToMove: number | null;
}

class StockfishEngine {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.worker = new Worker(ENGINE_URL);
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

  async go(
    chess: Chess,
    opts: { movetimeMs: number; skillLevel: number },
  ): Promise<SearchResult> {
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
          const info: UciInfo = { depth: 0, scoreCpFromSideToMove: null, scoreMateFromSideToMove: null };

          const handler = (e: MessageEvent<string>) => {
            const line = e.data;
            if (line.startsWith('info')) {
              const depthMatch = /\bdepth (\d+)/.exec(line);
              const cpMatch = /\bscore cp (-?\d+)/.exec(line);
              const mateMatch = /\bscore mate (-?\d+)/.exec(line);
              if (depthMatch) info.depth = parseInt(depthMatch[1], 10);
              if (cpMatch) {
                info.scoreCpFromSideToMove = parseInt(cpMatch[1], 10);
                info.scoreMateFromSideToMove = null;
              } else if (mateMatch) {
                info.scoreMateFromSideToMove = parseInt(mateMatch[1], 10);
                info.scoreCpFromSideToMove = null;
              }
            } else if (line.startsWith('bestmove')) {
              this.worker.removeEventListener('message', handler);

              const uciMove = line.split(' ')[1];
              const move = matchUciMove(legalMoves, uciMove);

              const sign = whiteToMove ? 1 : -1;
              const score =
                info.scoreMateFromSideToMove !== null
                  ? sign * (info.scoreMateFromSideToMove > 0 ? 100000 : -100000)
                  : sign * (info.scoreCpFromSideToMove ?? 0);
              const mateIn =
                info.scoreMateFromSideToMove !== null ? sign * info.scoreMateFromSideToMove : null;

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
}

function matchUciMove(legalMoves: Move[], uciMove: string | undefined): Move | null {
  if (!uciMove || uciMove === '(none)') return null;
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.length > 4 ? uciMove.slice(4) : undefined;
  return (
    legalMoves.find((m) => m.from === from && m.to === to && (m.promotion ?? undefined) === promotion) ?? null
  );
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
