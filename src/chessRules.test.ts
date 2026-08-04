import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';

describe('chess.js move legality edge cases', () => {
  it('allows en passant only immediately after the qualifying double pawn push', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5'); // black double-pushes past e5, opening en passant on d6

    const epMoves = chess.moves({ square: 'e5', verbose: true }).filter((m) => m.flags.includes('e'));
    expect(epMoves).toHaveLength(1);
    expect(epMoves[0].to).toBe('d6');

    chess.move({ from: 'e5', to: 'd6' });
    expect(chess.get('d5')).toBeUndefined();
    expect(chess.get('d6')?.type).toBe('p');
  });

  it('forbids en passant once the capture window has passed', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5');
    chess.move('a3'); // waste a tempo, forfeiting the en passant right
    chess.move('a5');

    const epMoves = chess.moves({ square: 'e5', verbose: true }).filter((m) => m.flags.includes('e'));
    expect(epMoves).toHaveLength(0);
  });

  it('allows kingside castling once the path is clear and unattacked', () => {
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const castleMoves = chess.moves({ square: 'e1', verbose: true }).filter((m) => m.flags.includes('k'));
    expect(castleMoves).toHaveLength(1);

    chess.move({ from: 'e1', to: 'g1' });
    expect(chess.get('g1')?.type).toBe('k');
    expect(chess.get('f1')?.type).toBe('r');
  });

  it('forbids castling through check', () => {
    // Black rook on f8 attacks f1, the square the king must pass through.
    const chess = new Chess('4k3/8/8/8/8/8/8/R3K2r w Q - 0 1');
    const castleMoves = chess.moves({ square: 'e1', verbose: true }).filter((m) => m.flags.includes('q'));
    expect(castleMoves).toHaveLength(0);
  });

  it('forbids castling after the king has already moved', () => {
    const chess = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    chess.move({ from: 'e1', to: 'e2' });
    chess.move({ from: 'e8', to: 'e7' });
    chess.move({ from: 'e2', to: 'e1' });
    chess.move({ from: 'e7', to: 'e8' });

    const castleMoves = chess.moves({ square: 'e1', verbose: true }).filter((m) => m.isKingsideCastle());
    expect(castleMoves).toHaveLength(0);
  });

  it('only offers promotion once a pawn reaches the last rank, with all four piece choices', () => {
    const chess = new Chess('8/P7/8/8/8/8/8/k1K5 w - - 0 1');
    const promotions = chess.moves({ square: 'a7', verbose: true });
    expect(promotions.map((m) => m.promotion).sort()).toEqual(['b', 'n', 'q', 'r']);
  });

  it('forbids a pinned piece from moving off the pin line', () => {
    // White king e1, white bishop e2 pinned by black rook on e8.
    const chess = new Chess('4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1');
    const bishopMoves = chess.moves({ square: 'e2', verbose: true });
    expect(bishopMoves).toHaveLength(0);
  });

  it('rejects a move that would leave the mover in check', () => {
    const chess = new Chess('4r1k1/8/8/8/8/8/4B3/4K3 w - - 0 1');
    expect(() => chess.move({ from: 'e2', to: 'd3' })).toThrow();
  });

  it('rejects an out-of-range move for the piece', () => {
    const chess = new Chess();
    expect(() => chess.move({ from: 'e2', to: 'e5' })).toThrow();
  });
});

describe('checkmate / stalemate / draw detection', () => {
  it("detects checkmate (fool's mate)", () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4');

    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
    expect(chess.isStalemate()).toBe(false);
    expect(chess.isDraw()).toBe(false);
  });

  it('detects stalemate', () => {
    // Black king h8 has no legal move and is not in check.
    const chess = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
    expect(chess.isStalemate()).toBe(true);
    expect(chess.isCheckmate()).toBe(false);
    expect(chess.isGameOver()).toBe(true);
  });

  it('detects draw by insufficient material (king vs king)', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(chess.isInsufficientMaterial()).toBe(true);
    expect(chess.isDraw()).toBe(true);
  });

  it('detects draw by threefold repetition', () => {
    const chess = new Chess();
    for (let i = 0; i < 2; i++) {
      chess.move('Nf3');
      chess.move('Nf6');
      chess.move('Ng1');
      chess.move('Ng8');
    }
    expect(chess.isThreefoldRepetition()).toBe(true);
    expect(chess.isDraw()).toBe(true);
  });

  it('does not report game over for an ordinary mid-game position', () => {
    const chess = new Chess();
    chess.move('e4');
    expect(chess.isCheckmate()).toBe(false);
    expect(chess.isStalemate()).toBe(false);
    expect(chess.isDraw()).toBe(false);
    expect(chess.isGameOver()).toBe(false);
  });
});
