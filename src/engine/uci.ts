import type { Move } from 'chess.js';

/** Accumulated state parsed out of a Stockfish `info ...` line stream. */
export interface UciInfo {
  depth: number;
  scoreCpFromSideToMove: number | null;
  scoreMateFromSideToMove: number | null;
}

export const INITIAL_UCI_INFO: UciInfo = {
  depth: 0,
  scoreCpFromSideToMove: null,
  scoreMateFromSideToMove: null,
};

/**
 * Folds one line of UCI engine output into the running `UciInfo`. Non-`info`
 * lines (e.g. `bestmove`, `uciok`) are returned unchanged.
 */
export function applyUciLine(line: string, info: UciInfo): UciInfo {
  if (!line.startsWith('info')) return info;

  const depthMatch = /\bdepth (\d+)/.exec(line);
  const cpMatch = /\bscore cp (-?\d+)/.exec(line);
  const mateMatch = /\bscore mate (-?\d+)/.exec(line);

  const next: UciInfo = { ...info };
  if (depthMatch) next.depth = parseInt(depthMatch[1], 10);
  if (cpMatch) {
    next.scoreCpFromSideToMove = parseInt(cpMatch[1], 10);
    next.scoreMateFromSideToMove = null;
  } else if (mateMatch) {
    next.scoreMateFromSideToMove = parseInt(mateMatch[1], 10);
    next.scoreCpFromSideToMove = null;
  }
  return next;
}

/**
 * Converts accumulated (side-to-move-relative) UCI info into the White's-
 * perspective score/mate values the rest of the app expects.
 */
export function scoreFromUciInfo(
  info: UciInfo,
  whiteToMove: boolean,
): { score: number; mateIn: number | null } {
  const sign = whiteToMove ? 1 : -1;
  const score =
    info.scoreMateFromSideToMove !== null
      ? sign * (info.scoreMateFromSideToMove > 0 ? 100000 : -100000)
      : sign * (info.scoreCpFromSideToMove ?? 0);
  const mateIn =
    info.scoreMateFromSideToMove !== null ? sign * info.scoreMateFromSideToMove : null;
  return { score, mateIn };
}

/** Extracts the UCI move token (e.g. `e2e4`) from a `bestmove ...` line. */
export function parseBestMoveToken(line: string): string | undefined {
  return line.split(' ')[1];
}

/** Resolves a UCI move token (e.g. `e2e4`, `e7e8q`) to the matching chess.js `Move`. */
export function matchUciMove(legalMoves: Move[], uciMove: string | undefined): Move | null {
  if (!uciMove || uciMove === '(none)') return null;
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.length > 4 ? uciMove.slice(4) : undefined;
  return (
    legalMoves.find((m) => m.from === from && m.to === to && (m.promotion ?? undefined) === promotion) ??
    null
  );
}
