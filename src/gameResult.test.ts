import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { gameResult } from './gameResult';

describe('gameResult', () => {
  it('returns null while the game is still in progress', () => {
    const chess = new Chess();
    chess.move('e4');
    expect(gameResult(chess, null)).toBeNull();
  });

  it("reports Black winning on White's checkmate", () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4');
    expect(gameResult(chess, null)).toBe('0-1');
  });

  it('reports a draw on stalemate', () => {
    const chess = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
    expect(gameResult(chess, null)).toBe('1/2-1/2');
  });

  it('reports a draw on insufficient material', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(gameResult(chess, null)).toBe('1/2-1/2');
  });

  it('reports the opponent winning when a side resigns, regardless of board state', () => {
    const chess = new Chess();
    chess.move('e4');
    expect(gameResult(chess, 'w')).toBe('0-1');
    expect(gameResult(chess, 'b')).toBe('1-0');
  });
});
