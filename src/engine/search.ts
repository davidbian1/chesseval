import { Chess, type Move } from 'chess.js';
import { evaluate } from './evaluate';

export interface SearchResult {
  move: Move | null;
  /** Evaluation in centipawns from White's perspective. */
  score: number;
  depth: number;
  /** Positive: White forces mate in N moves. Negative: Black does. Null if no forced mate found. */
  mateIn: number | null;
}

const MATE_SCORE = 100000;
const CAPTURE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
}

function scoreMove(move: Move): number {
  if (move.captured) {
    // MVV-LVA: prioritize capturing high-value pieces with low-value ones.
    return CAPTURE_VALUE[move.captured] * 10 - CAPTURE_VALUE[move.piece];
  }
  if (move.promotion) return 800;
  return 0;
}

function sideSign(chess: Chess): 1 | -1 {
  return chess.turn() === 'w' ? 1 : -1;
}

interface SearchState {
  chess: Chess;
  deadline: number;
  timedOut: boolean;
  nodes: number;
}

function negamax(state: SearchState, depth: number, alpha: number, beta: number): number {
  if (state.timedOut) return 0;
  if (Date.now() > state.deadline) {
    state.timedOut = true;
    return 0;
  }
  state.nodes++;

  const { chess } = state;
  if (chess.isCheckmate()) return -MATE_SCORE - depth;
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) return 0;

  if (depth === 0) {
    return sideSign(chess) * evaluate(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = -Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = -negamax(state, depth - 1, -beta, -alpha);
    chess.undo();

    if (state.timedOut) return 0;

    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  return best;
}

/**
 * Iterative-deepening alpha-beta search bounded by a time budget.
 * `strength` (0-1) scales the max depth and time budget for a dynamic difficulty slider.
 */
export function findBestMove(chess: Chess, timeBudgetMs: number, strength = 1): SearchResult {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return { move: null, score: evaluate(chess), depth: 0, mateIn: null };
  }

  const maxDepth = Math.max(1, Math.round(2 + strength * 4)); // depth 2..6
  const deadline = Date.now() + Math.max(50, timeBudgetMs * Math.max(0.15, strength));

  const state: SearchState = { chess, deadline, timedOut: false, nodes: 0 };
  let bestMove: Move = legalMoves[0];
  let bestScoreFromSide = -Infinity;
  let completedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const moves = orderMoves(chess.moves({ verbose: true }));
    let depthBest = -Infinity;
    let depthBestMove: Move | null = null;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of moves) {
      chess.move(move);
      const score = -negamax(state, depth - 1, -beta, -alpha);
      chess.undo();

      if (state.timedOut) break;

      if (score > depthBest) {
        depthBest = score;
        depthBestMove = move;
      }
      if (depthBest > alpha) alpha = depthBest;
    }

    if (state.timedOut || !depthBestMove) break;

    bestMove = depthBestMove;
    bestScoreFromSide = depthBest;
    completedDepth = depth;

    if (Math.abs(depthBest) > MATE_SCORE - 1000) break; // found forced mate
    if (Date.now() > deadline) break;
  }

  const whiteScore = sideSign(chess) === 1 ? bestScoreFromSide : -bestScoreFromSide;

  let mateIn: number | null = null;
  if (Math.abs(bestScoreFromSide) > MATE_SCORE - 1000) {
    const pliesFromRoot = completedDepth - (Math.abs(bestScoreFromSide) - MATE_SCORE);
    const movesToMate = Math.max(1, Math.ceil(pliesFromRoot / 2));
    mateIn = whiteScore > 0 ? movesToMate : -movesToMate;
  }

  return { move: bestMove, score: whiteScore, depth: completedDepth, mateIn };
}
