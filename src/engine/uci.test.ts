import { describe, expect, it } from 'vitest';
import type { Move } from 'chess.js';
import {
  applyUciLine,
  INITIAL_UCI_INFO,
  matchUciMove,
  parseBestMoveToken,
  scoreFromUciInfo,
  type UciInfo,
} from './uci';

describe('applyUciLine', () => {
  it('ignores non-info lines', () => {
    expect(applyUciLine('bestmove e2e4', INITIAL_UCI_INFO)).toBe(INITIAL_UCI_INFO);
    expect(applyUciLine('uciok', INITIAL_UCI_INFO)).toBe(INITIAL_UCI_INFO);
  });

  it('parses depth and a centipawn score', () => {
    const info = applyUciLine(
      'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 50000 pv e2e4 e7e5',
      INITIAL_UCI_INFO,
    );
    expect(info.depth).toBe(12);
    expect(info.scoreCpFromSideToMove).toBe(34);
    expect(info.scoreMateFromSideToMove).toBeNull();
  });

  it('parses a negative centipawn score', () => {
    const info = applyUciLine('info depth 5 score cp -220 pv a2a3', INITIAL_UCI_INFO);
    expect(info.scoreCpFromSideToMove).toBe(-220);
  });

  it('parses a mate score and clears any prior cp score', () => {
    let info = applyUciLine('info depth 8 score cp 900 pv d1h5', INITIAL_UCI_INFO);
    info = applyUciLine('info depth 9 score mate 3 pv d1h5 g8f6 h5f7', info);
    expect(info.scoreMateFromSideToMove).toBe(3);
    expect(info.scoreCpFromSideToMove).toBeNull();
  });

  it('a later cp score line clears a prior mate score', () => {
    let info = applyUciLine('info depth 9 score mate -2 pv a2a3', INITIAL_UCI_INFO);
    info = applyUciLine('info depth 10 score cp -50 pv a2a3', info);
    expect(info.scoreCpFromSideToMove).toBe(-50);
    expect(info.scoreMateFromSideToMove).toBeNull();
  });

  it('does not mutate the input info object', () => {
    const before: UciInfo = { ...INITIAL_UCI_INFO };
    applyUciLine('info depth 4 score cp 10 pv e2e4', INITIAL_UCI_INFO);
    expect(INITIAL_UCI_INFO).toEqual(before);
  });
});

describe('scoreFromUciInfo', () => {
  it('reports a positive cp score for White as a positive score with White to move', () => {
    const info: UciInfo = { depth: 10, scoreCpFromSideToMove: 50, scoreMateFromSideToMove: null };
    expect(scoreFromUciInfo(info, true)).toEqual({ score: 50, mateIn: null });
  });

  it('flips a side-to-move cp score into White\'s perspective when Black is to move', () => {
    const info: UciInfo = { depth: 10, scoreCpFromSideToMove: 50, scoreMateFromSideToMove: null };
    expect(scoreFromUciInfo(info, false)).toEqual({ score: -50, mateIn: null });
  });

  it('maps a forced mate for the side to move to the sentinel score, sign-adjusted for perspective', () => {
    const whiteMatesInfo: UciInfo = { depth: 10, scoreCpFromSideToMove: null, scoreMateFromSideToMove: 3 };
    expect(scoreFromUciInfo(whiteMatesInfo, true)).toEqual({ score: 100000, mateIn: 3 });
    expect(scoreFromUciInfo(whiteMatesInfo, false)).toEqual({ score: -100000, mateIn: -3 });
  });

  it('maps being mated (negative mate count) to the negative sentinel score', () => {
    const gettingMatedInfo: UciInfo = { depth: 10, scoreCpFromSideToMove: null, scoreMateFromSideToMove: -2 };
    expect(scoreFromUciInfo(gettingMatedInfo, true)).toEqual({ score: -100000, mateIn: -2 });
    expect(scoreFromUciInfo(gettingMatedInfo, false)).toEqual({ score: 100000, mateIn: 2 });
  });

  it('defaults to an even score when no info was ever parsed', () => {
    expect(scoreFromUciInfo(INITIAL_UCI_INFO, true)).toEqual({ score: 0, mateIn: null });
  });
});

describe('parseBestMoveToken', () => {
  it('extracts the move token', () => {
    expect(parseBestMoveToken('bestmove e2e4 ponder e7e5')).toBe('e2e4');
  });

  it('handles a bare bestmove with no ponder move', () => {
    expect(parseBestMoveToken('bestmove d7d5')).toBe('d7d5');
  });
});

describe('matchUciMove', () => {
  const legalMoves = [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e8', promotion: 'q' },
    { from: 'e7', to: 'e8', promotion: 'n' },
  ] as Move[];

  it('matches a plain move', () => {
    expect(matchUciMove(legalMoves, 'e2e4')).toBe(legalMoves[0]);
  });

  it('matches a promotion move by its trailing piece letter', () => {
    expect(matchUciMove(legalMoves, 'e7e8q')).toBe(legalMoves[1]);
    expect(matchUciMove(legalMoves, 'e7e8n')).toBe(legalMoves[2]);
  });

  it('returns null for "(none)" (no legal moves / mated position)', () => {
    expect(matchUciMove(legalMoves, '(none)')).toBeNull();
  });

  it('returns null for an undefined token', () => {
    expect(matchUciMove(legalMoves, undefined)).toBeNull();
  });

  it('returns null when the move is not among the legal moves', () => {
    expect(matchUciMove(legalMoves, 'a2a4')).toBeNull();
  });
});
