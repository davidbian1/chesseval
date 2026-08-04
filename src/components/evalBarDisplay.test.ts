import { describe, expect, it } from 'vitest';
import { computeEvalBarDisplay } from './evalBarDisplay';

describe('computeEvalBarDisplay', () => {
  it('renders an even position as a half-filled bar labeled 0.0', () => {
    const { whitePercent, label } = computeEvalBarDisplay(0, null);
    expect(whitePercent).toBe(50);
    expect(label).toBe('0.0');
  });

  it('scales a positive (White-favoring) score above 50%', () => {
    const { whitePercent, label } = computeEvalBarDisplay(250, null);
    expect(whitePercent).toBe(62.5);
    expect(label).toBe('2.5');
  });

  it('scales a negative (Black-favoring) score below 50%', () => {
    const { whitePercent, label } = computeEvalBarDisplay(-400, null);
    expect(whitePercent).toBe(30);
    expect(label).toBe('-4.0');
  });

  it('clamps extreme scores to the ends of the bar', () => {
    expect(computeEvalBarDisplay(5000, null).whitePercent).toBe(100);
    expect(computeEvalBarDisplay(-5000, null).whitePercent).toBe(0);
  });

  it('normalizes negative-zero rounding to "0.0" instead of "-0.0"', () => {
    expect(computeEvalBarDisplay(-4, null).label).toBe('0.0');
  });

  it('fills the bar fully and shows a mate label for a forced White mate', () => {
    const { whitePercent, label } = computeEvalBarDisplay(100000, 3);
    expect(whitePercent).toBe(100);
    expect(label).toBe('M3');
  });

  it('empties the bar and shows a mate label for a forced Black mate', () => {
    const { whitePercent, label } = computeEvalBarDisplay(-100000, -3);
    expect(whitePercent).toBe(0);
    expect(label).toBe('M3');
  });

  it('lets an explicit result label override the score-derived label and fill', () => {
    const { whitePercent, label } = computeEvalBarDisplay(-9999, null, '1–0');
    expect(label).toBe('1–0');
    // Even a hugely negative score falls back to the sign-of-score fill rule once a result is set.
    expect(whitePercent).toBe(0);
  });
});
