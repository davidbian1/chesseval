// Both colors use the "black chess piece" Unicode glyphs (solid silhouettes)
// rather than the "white chess piece" ones — the latter render as fixed
// hollow/outline shapes in many fonts, ignoring the CSS color applied below.
// Solid glyphs respond correctly to `.piece.w`/`.piece.b`'s color + stroke.
export const UNICODE_PIECES: Record<string, string> = {
  wp: '♟',
  wn: '♞',
  wb: '♝',
  wr: '♜',
  wq: '♛',
  wk: '♚',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};
