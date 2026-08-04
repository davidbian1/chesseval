import { computeEvalBarDisplay } from './evalBarDisplay';

interface EvalBarProps {
  /** Centipawn score from White's perspective. */
  score: number;
  mateIn: number | null;
  thinking: boolean;
  /** Overrides the label entirely, e.g. "1–0"/"0–1" for a resignation. */
  resultLabel?: string | null;
}

export function EvalBar({ score, mateIn, thinking, resultLabel }: EvalBarProps) {
  const { whitePercent, label } = computeEvalBarDisplay(score, mateIn, resultLabel);

  return (
    <div className="eval-bar-wrap">
      <div className={`eval-bar ${thinking ? 'thinking' : ''}`}>
        <div className="eval-bar-black" style={{ height: `${100 - whitePercent}%` }} />
        <div className="eval-bar-white" style={{ height: `${whitePercent}%` }} />
      </div>
      <div className="eval-label">{label}</div>
    </div>
  );
}
