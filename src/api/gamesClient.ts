const API_URL = import.meta.env.VITE_API_URL;

export interface SavedGame {
  id: number;
  pgn: string;
  result: string;
  mode: string;
  humanSide: string | null;
  createdAt: string;
}

export interface SaveGameInput {
  pgn: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  mode: 'human' | 'ai';
  humanSide?: 'w' | 'b' | null;
}

/** Whether a chesseval-server API is configured — game history is a no-op without one (e.g. static deploys). */
export function isGameHistoryEnabled(): boolean {
  return Boolean(API_URL);
}

export async function saveGame(input: SaveGameInput): Promise<SavedGame> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save game (${res.status})`);
  return res.json();
}

export async function listGames(): Promise<SavedGame[]> {
  const res = await fetch(`${API_URL}/games?limit=50`);
  if (!res.ok) throw new Error(`Failed to load game history (${res.status})`);
  return res.json();
}

export async function deleteGame(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/games/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete game (${res.status})`);
}
