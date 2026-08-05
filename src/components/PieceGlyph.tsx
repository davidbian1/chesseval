import { UNICODE_PIECES } from './pieceGlyphs';
import type { PieceTheme } from '../pieceThemes';

interface PieceGlyphProps {
  theme: PieceTheme;
  color: 'w' | 'b';
  type: string;
  className?: string;
}

/** Renders a single piece in whichever theme is active — a Unicode glyph, or an SVG image. */
export function PieceGlyph({ theme, color, type, className }: PieceGlyphProps) {
  if (theme === 'fantasy') {
    const src = `${import.meta.env.BASE_URL}pieces/fantasy/${color}${type.toUpperCase()}.svg`;
    return (
      <img src={src} alt="" draggable={false} className={className ? `piece-image ${className}` : 'piece-image'} />
    );
  }
  return <>{UNICODE_PIECES[`${color}${type}`]}</>;
}
