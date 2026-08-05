import { apiUrl, isGameHistoryConfigured } from './backend';

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
  mode: 'human' | 'ai' | 'online';
  humanSide?: 'w' | 'b' | null;
}

/** Whether a chesseval-server API is configured — game history is a no-op without one (e.g. static deploys). */
export function isGameHistoryEnabled(): boolean {
  return isGameHistoryConfigured();
}

export async function saveGame(input: SaveGameInput): Promise<SavedGame> {
  const res = await fetch(`${apiUrl()}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save game (${res.status})`);
  return res.json();
}

export async function listGames(): Promise<SavedGame[]> {
  const res = await fetch(`${apiUrl()}/games?limit=50`);
  if (!res.ok) throw new Error(`Failed to load game history (${res.status})`);
  return res.json();
}

export async function deleteGame(id: number): Promise<void> {
  const res = await fetch(`${apiUrl()}/games/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete game (${res.status})`);
}
