import { useState } from 'react';
import type { Square } from 'chess.js';
import { UNICODE_PIECES } from './pieceGlyphs';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const DRAG_THRESHOLD_PX = 4;

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
  onPieceDragStart: (square: Square) => void;
  onDrop: (from: Square, to: Square) => void;
  onDragEnd: () => void;
  /** Whether the side to move may currently drag their own pieces. */
  canDrag: boolean;
  turnColor: 'w' | 'b';
}

interface DragGhost {
  square: Square;
  glyph: string;
  color: 'w' | 'b';
  x: number;
  y: number;
}

function toSquare(rank: number, file: number): Square {
  // rank 0 = rank 8 ... rank 7 = rank 1
  return `${FILES[file]}${8 - rank}` as Square;
}

/**
 * Drag-and-drop uses pointer events rather than the native HTML5 Drag and
 * Drop API — the native API relies on the OS's drag session, which is
 * unreliable inside embedded webviews (e.g. Tauri's WebView2).
 *
 * The move/up listeners are attached to `document` for the duration of the
 * gesture (rather than relying on the dragged element via setPointerCapture)
 * so the drag keeps tracking correctly even if the pointer moves faster than
 * the browser can keep the original element under it, and even in
 * environments where pointer capture itself is flaky.
 */
export function Board({
  board,
  orientation,
  selected,
  legalTargets,
  lastMove,
  inCheckSquare,
  onSquareClick,
  onPieceDragStart,
  onDrop,
  onDragEnd,
  canDrag,
  turnColor,
}: BoardProps) {
  const [ghost, setGhost] = useState<DragGhost | null>(null);

  const rankIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const fileIndices = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  function handlePointerDown(
    e: React.PointerEvent<HTMLSpanElement>,
    square: Square,
    piece: { type: string; color: 'w' | 'b' },
  ) {
    if (!canDrag || piece.color !== turnColor) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const glyph = UNICODE_PIECES[`${piece.color}${piece.type}`];
    let dragging = false;

    const onMove = (ev: PointerEvent) => {
      if (!dragging) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        setGhost({ square, glyph, color: piece.color, x: ev.clientX, y: ev.clientY });
        onPieceDragStart(square);
      }
      setGhost((g) => (g ? { ...g, x: ev.clientX, y: ev.clientY } : g));
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      setGhost(null);

      if (!dragging) return; // Plain click/tap — let the native click handler deal with it.

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const squareEl = target instanceof Element ? target.closest<HTMLElement>('[data-square]') : null;
      const toSquare = squareEl?.dataset.square as Square | undefined;
      if (toSquare) {
        onDrop(square, toSquare);
      } else {
        onDragEnd();
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

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
          const isDraggable = canDrag && !!piece && piece.color === turnColor;
          const isGhostSource = ghost?.square === square;

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
            <div key={square} data-square={square} className={classes} onClick={() => onSquareClick(square)}>
              {file === (orientation === 'w' ? 0 : 7) && (
                <span className="coord rank-label">{rank <= 7 && 8 - rank}</span>
              )}
              {rank === (orientation === 'w' ? 7 : 0) && (
                <span className="coord file-label">{FILES[file]}</span>
              )}
              {piece && (
                <span
                  className={`piece ${piece.color}${isDraggable ? ' draggable' : ''}${isGhostSource ? ' dragging-source' : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, square, piece)}
                >
                  {UNICODE_PIECES[`${piece.color}${piece.type}`]}
                </span>
              )}
              {isTarget && <span className={piece ? 'target-dot capture' : 'target-dot'} />}
            </div>
          );
        }),
      )}
      {ghost && (
        <span className={`piece ${ghost.color} drag-ghost`} style={{ left: ghost.x, top: ghost.y }}>
          {ghost.glyph}
        </span>
      )}
    </div>
  );
}
