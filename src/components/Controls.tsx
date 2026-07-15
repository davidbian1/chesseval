export type GameMode = 'human' | 'ai';
export type Side = 'w' | 'b';

interface ControlsProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  humanSide: Side;
  onHumanSideChange: (side: Side) => void;
  strength: number; // 0..1
  onStrengthChange: (strength: number) => void;
  onNewGame: () => void;
  onResign: () => void;
  canResign: boolean;
  status: string;
}

const STRENGTH_LABELS = ['Fast & Weak', 'Casual', 'Balanced', 'Strong', 'Deep Think'];

function strengthLabel(strength: number): string {
  const idx = Math.min(STRENGTH_LABELS.length - 1, Math.floor(strength * STRENGTH_LABELS.length));
  return STRENGTH_LABELS[idx];
}

export function Controls({
  mode,
  onModeChange,
  humanSide,
  onHumanSideChange,
  strength,
  onStrengthChange,
  onNewGame,
  onResign,
  canResign,
  status,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="control-row toggle-row">
        <button
          className={mode === 'human' ? 'toggle active' : 'toggle'}
          onClick={() => onModeChange('human')}
        >
          Human vs Human
        </button>
        <button
          className={mode === 'ai' ? 'toggle active' : 'toggle'}
          onClick={() => onModeChange('ai')}
        >
          Human vs AI
        </button>
      </div>

      {mode === 'ai' && (
        <>
          <div className="control-row">
            <label className="control-label">Play as</label>
            <div className="side-toggle">
              <button
                className={humanSide === 'w' ? 'toggle active' : 'toggle'}
                onClick={() => onHumanSideChange('w')}
              >
                White
              </button>
              <button
                className={humanSide === 'b' ? 'toggle active' : 'toggle'}
                onClick={() => onHumanSideChange('b')}
              >
                Black
              </button>
            </div>
          </div>

          <div className="control-row">
            <label className="control-label">
              AI strength — {strengthLabel(strength)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={strength}
              onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
              className="strength-slider"
            />
          </div>
        </>
      )}

      <div className="control-row button-row">
        <button className="new-game" onClick={onNewGame}>Restart Game</button>
        <button className="resign" onClick={onResign} disabled={!canResign}>
          Resign
        </button>
      </div>

      <div className="status">{status}</div>
    </div>
  );
}
