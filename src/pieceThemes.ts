export type PieceTheme = 'minimalist' | 'fantasy';

export const PIECE_THEMES: { id: PieceTheme; label: string }[] = [
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'fantasy', label: 'Fantasy' },
];

export const DEFAULT_PIECE_THEME: PieceTheme = 'minimalist';

const STORAGE_KEY = 'chesseval-piece-theme';

export function loadPieceTheme(): PieceTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'fantasy' ? 'fantasy' : DEFAULT_PIECE_THEME;
  } catch {
    // localStorage can throw in some environments (privacy mode, SSR, etc.).
    return DEFAULT_PIECE_THEME;
  }
}

export function savePieceTheme(theme: PieceTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not persisting the preference isn't worth failing over.
  }
}
