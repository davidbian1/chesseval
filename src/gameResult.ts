import type { Chess } from 'chess.js';
import type { Side } from './components/Controls';

/** PGN-style result string, or null if the game isn't over yet. */
export function gameResult(chess: Chess, resignedBy: Side | null): '1-0' | '0-1' | '1/2-1/2' | null {
  if (resignedBy) return resignedBy === 'w' ? '0-1' : '1-0';
  if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
  if (chess.isGameOver()) return '1/2-1/2';
  return null;
}
