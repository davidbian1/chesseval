import { Chess, type Square } from 'chess.js';

/**
 * Squares a piece on `square` could reach if it were that side's turn right
 * now. Used only to decide which squares are offered as a premove target —
 * NOT authoritative. The premove itself is re-validated for real (full
 * legality, including check) once it actually becomes that side's turn; an
 * unusable premove is just silently dropped at that point.
 */
export function pseudoLegalPremoveTargets(fen: string, square: Square): Square[] {
  const parts = fen.split(' ');
  if (parts.length < 4) return [];
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  // An en passant target is only ever valid for the side that could just
  // capture it — carrying it over after flipping the turn describes an
  // impossible position and chess.js's FEN validator rejects it outright
  // (breaking target generation entirely, not just en passant specifically).
  // Clearing it trades away en-passant premove highlighting for correctness
  // everywhere else.
  parts[3] = '-';
  try {
    const clone = new Chess(parts.join(' '));
    return clone.moves({ square, verbose: true }).map((m) => m.to as Square);
  } catch {
    return [];
  }
}
