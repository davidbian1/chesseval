import type { Square } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const UNICODE_PIECES: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

export interface BoardSquare {
  square: Square;
  piece: { type: string; color: 'w' | 'b' } | null;
}

interface BoardProps {
  board: (BoardSquare['piece'])[][]; // 8x8, rank8 -> rank1, from chess.js .board()
  orientation: 'w' | 'b';
  selected: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  inCheckSquare: Square | null;
  onSquareClick: (square: Square) => void;
}

function toSquare(rank: number, file: number): Square {
  // rank 0 = rank 8 ... rank 7 = rank 1
  return `${FILES[file]}${8 - rank}` as Square;
}

export function Board({
  board,
  orientation,
  selected,
  legalTargets,
  lastMove,
  inCheckSquare,
  onSquareClick,
}: BoardProps) {
  const rankIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const fileIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="board">
      {rankIndices.map((rank) =>
        fileIndices.map((file) => {
          const square = toSquare(rank, file);
          const piece = board[rank][file];
          const isDark = (rank + file) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.includes(square);
          const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
          const isCheck = inCheckSquare === square;

          const classes = [
            'square',
            isDark ? 'dark' : 'light',
            isSelected ? 'selected' : '',
            isLastMove ? 'last-move' : '',
            isCheck ? 'in-check' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={square} className={classes} onClick={() => onSquareClick(square)}>
              {file === (orientation === 'w' ? 0 : 7) && (
                <span className="coord rank-label">{rank <= 7 && 8 - rank}</span>
              )}
              {rank === (orientation === 'w' ? 7 : 0) && (
                <span className="coord file-label">{FILES[file]}</span>
              )}
              {piece && (
                <span className={`piece ${piece.color}`}>
                  {UNICODE_PIECES[`${piece.color}${piece.type}`]}
                </span>
              )}
              {isTarget && <span className={piece ? 'target-dot capture' : 'target-dot'} />}
            </div>
          );
        }),
      )}
    </div>
  );
}
