const CLAMP_CP = 1000; // +/- 10 pawns fills the bar

export interface EvalBarDisplay {
  /** Percentage (0-100) of the bar filled with White's color. */
  whitePercent: number;
  label: string;
}

/** Turns a raw score/mate/result into what the eval bar actually shows. */
export function computeEvalBarDisplay(
  score: number,
  mateIn: number | null,
  resultLabel?: string | null,
): EvalBarDisplay {
  const clamped = Math.max(-CLAMP_CP, Math.min(CLAMP_CP, score));
  // 50% = even; scale so +-CLAMP_CP maps to 0%/100% white fill.
  const whitePercent =
    mateIn !== null || resultLabel ? (score > 0 ? 100 : 0) : 50 + (clamped / CLAMP_CP) * 50;

  const label =
    resultLabel ?? (mateIn !== null ? `M${Math.abs(mateIn)}` : (score / 100).toFixed(1).replace('-0.0', '0.0'));

  return { whitePercent, label };
}
