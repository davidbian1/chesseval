import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { pseudoLegalPremoveTargets } from './premove';

describe('pseudoLegalPremoveTargets', () => {
  it("offers a piece's normal moves as if it were their turn, even though it isn't", () => {
    // White to move (per the fen), but we're asking what Black's g8 knight could reach.
    const chess = new Chess();
    const targets = pseudoLegalPremoveTargets(chess.fen(), 'g8');
    expect(targets.sort()).toEqual(['f6', 'h6']);
  });

  it('returns an empty list for an empty square', () => {
    const chess = new Chess();
    expect(pseudoLegalPremoveTargets(chess.fen(), 'e4')).toEqual([]);
  });

  it("returns an empty list for the side actually on move's own square (they're not the flipped side)", () => {
    // It's White's move; querying a white piece flips the turn to Black, under
    // which white's pieces have no moves.
    const chess = new Chess();
    expect(pseudoLegalPremoveTargets(chess.fen(), 'e2')).toEqual([]);
  });

  it('reflects the actual position, not just the starting position', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('d5');
    // Now white to move; ask what black's queen (still on d8) could premove to.
    // It can slide down the now-open d-file as far as d6 (d5 is its own pawn),
    // but the diagonals out of d8 are still blocked by black's own e7/c7 pawns.
    const targets = pseudoLegalPremoveTargets(chess.fen(), 'd8');
    expect(targets.sort()).toEqual(['d6', 'd7']);
  });

  it('degrades to an empty list instead of throwing on a malformed fen', () => {
    expect(pseudoLegalPremoveTargets('not a fen', 'e2')).toEqual([]);
  });

  it('still returns targets when the position has a live en passant square', () => {
    // An en passant target is only ever valid for the side that could
    // immediately capture it — carried over verbatim after flipping whose
    // turn it is, it describes an impossible position, and chess.js's FEN
    // parser used to reject the whole thing outright (not just en passant
    // moves), silently breaking every premove target in positions like this.
    const chess = new Chess();
    chess.move('e4');
    chess.move('e6');
    chess.move('e5');
    chess.move('d5');
    expect(chess.fen()).toContain(' d6 '); // sanity check: this position really does carry an ep target
    const targets = pseudoLegalPremoveTargets(chess.fen(), 'g8');
    expect(targets.sort()).toEqual(['e7', 'f6', 'h6']);
  });
});
