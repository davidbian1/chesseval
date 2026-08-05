import { describe, expect, it } from 'vitest';
import {
  applyIncrement,
  DEFAULT_TIME_CONTROL,
  flaggedSide,
  formatClock,
  initialClockTimes,
  tickClock,
  type ClockTimes,
} from './clock';

describe('initialClockTimes', () => {
  it('returns null/null for the untimed default', () => {
    expect(initialClockTimes(DEFAULT_TIME_CONTROL)).toEqual({ whiteMs: null, blackMs: null });
  });

  it('returns the same starting time for both sides for a timed control', () => {
    expect(initialClockTimes({ id: '3+2', label: '3+2', initialMs: 180_000, incrementMs: 2_000 })).toEqual({
      whiteMs: 180_000,
      blackMs: 180_000,
    });
  });
});

describe('tickClock', () => {
  it('decrements only the side to move', () => {
    const times: ClockTimes = { whiteMs: 10_000, blackMs: 10_000 };
    expect(tickClock(times, 'w', 1_000)).toEqual({ whiteMs: 9_000, blackMs: 10_000 });
    expect(tickClock(times, 'b', 1_000)).toEqual({ whiteMs: 10_000, blackMs: 9_000 });
  });

  it('clamps at zero instead of going negative', () => {
    const times: ClockTimes = { whiteMs: 500, blackMs: 10_000 };
    expect(tickClock(times, 'w', 1_000).whiteMs).toBe(0);
  });

  it('is a no-op for an untimed clock', () => {
    const times: ClockTimes = { whiteMs: null, blackMs: null };
    expect(tickClock(times, 'w', 1_000)).toEqual(times);
  });
});

describe('applyIncrement', () => {
  it('credits the mover, not their opponent', () => {
    const times: ClockTimes = { whiteMs: 10_000, blackMs: 10_000 };
    expect(applyIncrement(times, 'w', 2_000)).toEqual({ whiteMs: 12_000, blackMs: 10_000 });
    expect(applyIncrement(times, 'b', 2_000)).toEqual({ whiteMs: 10_000, blackMs: 12_000 });
  });

  it('is a no-op when the increment is zero', () => {
    const times: ClockTimes = { whiteMs: 10_000, blackMs: 10_000 };
    expect(applyIncrement(times, 'w', 0)).toBe(times);
  });

  it('is a no-op for an untimed clock', () => {
    const times: ClockTimes = { whiteMs: null, blackMs: null };
    expect(applyIncrement(times, 'w', 2_000)).toEqual(times);
  });
});

describe('flaggedSide', () => {
  it('returns null while both clocks have time left', () => {
    expect(flaggedSide({ whiteMs: 1, blackMs: 1 })).toBeNull();
  });

  it('returns the side whose clock reached exactly zero', () => {
    expect(flaggedSide({ whiteMs: 0, blackMs: 5_000 })).toBe('w');
    expect(flaggedSide({ whiteMs: 5_000, blackMs: 0 })).toBe('b');
  });

  it('returns null for an untimed clock', () => {
    expect(flaggedSide({ whiteMs: null, blackMs: null })).toBeNull();
  });
});

describe('formatClock', () => {
  it('formats minutes:seconds at or above 20 seconds', () => {
    expect(formatClock(20_000)).toBe('0:20');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
  });

  it('formats seconds.tenths under 20 seconds', () => {
    expect(formatClock(19_900)).toBe('19.9');
    expect(formatClock(5_000)).toBe('5.0');
    expect(formatClock(100)).toBe('0.1');
  });

  it('never shows negative time', () => {
    expect(formatClock(-500)).toBe('0.0');
  });

  it('rounds up to avoid showing 0 while time nominally remains', () => {
    // 50ms left should still read as a nonzero tenth, not "0.0".
    expect(formatClock(50)).toBe('0.1');
  });
});
