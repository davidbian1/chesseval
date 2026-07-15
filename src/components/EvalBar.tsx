interface EvalBarProps {
  /** Centipawn score from White's perspective. */
  score: number;
  mateIn: number | null;
  thinking: boolean;
  /** Overrides the label entirely, e.g. "1–0"/"0–1" for a resignation. */
  resultLabel?: string | null;
}

const CLAMP_CP = 1000; // +/- 10 pawns fills the bar

export function EvalBar({ score, mateIn, thinking, resultLabel }: EvalBarProps) {
  const clamped = Math.max(-CLAMP_CP, Math.min(CLAMP_CP, score));
  // 50% = even; scale so +-CLAMP_CP maps to 0%/100% white fill.
  const whitePercent = mateIn !== null || resultLabel
    ? (score > 0 ? 100 : 0)
    : 50 + (clamped / CLAMP_CP) * 50;

  const label = resultLabel
    ?? (mateIn !== null
      ? `M${Math.abs(mateIn)}`
      : (score / 100).toFixed(1).replace('-0.0', '0.0'));

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
