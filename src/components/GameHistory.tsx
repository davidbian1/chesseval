import { useEffect, useState } from 'react';
import { deleteGame, listGames, type SavedGame } from '../api/gamesClient';

interface GameHistoryProps {
  onClose: () => void;
  /** Bumped by the caller after a new game is saved, to trigger a refetch. */
  refreshKey: number;
}

const RESULT_LABELS: Record<string, string> = {
  '1-0': 'White won',
  '0-1': 'Black won',
  '1/2-1/2': 'Draw',
};

const MODE_LABELS: Record<string, string> = {
  ai: 'vs AI',
  human: 'vs Human',
};

export function GameHistory({ onClose, refreshKey }: GameHistoryProps) {
  const [games, setGames] = useState<SavedGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listGames()
      .then((result) => {
        if (!cancelled) setGames(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleDelete = async (id: number) => {
    setGames((prev) => prev?.filter((g) => g.id !== id) ?? prev);
    try {
      await deleteGame(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
    }
  };

  return (
    <div className="promotion-backdrop" onClick={onClose}>
      <div className="history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <span>Game History</span>
          <button className="history-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {error && <div className="history-error">{error}</div>}
        {!error && games === null && <div className="history-empty">Loading…</div>}
        {!error && games !== null && games.length === 0 && <div className="history-empty">No saved games yet.</div>}
        {games && games.length > 0 && (
          <ul className="history-list">
            {games.map((game) => (
              <li key={game.id} className="history-row">
                <div>
                  <div className="history-result">
                    {RESULT_LABELS[game.result] ?? game.result} · {MODE_LABELS[game.mode] ?? game.mode}
                  </div>
                  <div className="history-date">{new Date(game.createdAt).toLocaleString()}</div>
                </div>
                <button className="history-delete" onClick={() => handleDelete(game.id)} aria-label="Delete saved game">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
