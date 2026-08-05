import type { Side } from './components/Controls';

export interface TimeControl {
  id: string;
  label: string;
  /** Starting time per side, in ms. Null means untimed. */
  initialMs: number | null;
  incrementMs: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', label: 'No clock', initialMs: null, incrementMs: 0 },
  { id: '1+0', label: '1+0 · Bullet', initialMs: 60_000, incrementMs: 0 },
  { id: '2+1', label: '2+1 · Bullet', initialMs: 120_000, incrementMs: 1_000 },
  { id: '3+0', label: '3+0 · Blitz', initialMs: 180_000, incrementMs: 0 },
  { id: '3+2', label: '3+2 · Blitz', initialMs: 180_000, incrementMs: 2_000 },
  { id: '5+0', label: '5+0 · Blitz', initialMs: 300_000, incrementMs: 0 },
  { id: '5+3', label: '5+3 · Blitz', initialMs: 300_000, incrementMs: 3_000 },
  { id: '10+0', label: '10+0 · Rapid', initialMs: 600_000, incrementMs: 0 },
  { id: '10+5', label: '10+5 · Rapid', initialMs: 600_000, incrementMs: 5_000 },
  { id: '15+10', label: '15+10 · Rapid', initialMs: 900_000, incrementMs: 10_000 },
  { id: '30+0', label: '30+0 · Classical', initialMs: 1_800_000, incrementMs: 0 },
];

export const DEFAULT_TIME_CONTROL = TIME_CONTROLS[0];

export interface ClockTimes {
  whiteMs: number | null;
  blackMs: number | null;
}

export function initialClockTimes(timeControl: TimeControl): ClockTimes {
  return { whiteMs: timeControl.initialMs, blackMs: timeControl.initialMs };
}

/** Advances the clock for whichever side is on move by `elapsedMs`, clamped to zero. */
export function tickClock(times: ClockTimes, turn: Side, elapsedMs: number): ClockTimes {
  if (turn === 'w') {
    if (times.whiteMs === null) return times;
    return { ...times, whiteMs: Math.max(0, times.whiteMs - elapsedMs) };
  }
  if (times.blackMs === null) return times;
  return { ...times, blackMs: Math.max(0, times.blackMs - elapsedMs) };
}

/** Credits `mover`'s clock with the time control's increment, if any. */
export function applyIncrement(times: ClockTimes, mover: Side, incrementMs: number): ClockTimes {
  if (incrementMs <= 0) return times;
  if (mover === 'w') {
    if (times.whiteMs === null) return times;
    return { ...times, whiteMs: times.whiteMs + incrementMs };
  }
  if (times.blackMs === null) return times;
  return { ...times, blackMs: times.blackMs + incrementMs };
}

/** Which side's clock has hit zero, if any. */
export function flaggedSide(times: ClockTimes): Side | null {
  if (times.whiteMs === 0) return 'w';
  if (times.blackMs === 0) return 'b';
  return null;
}

/** Formats remaining time as "m:ss", or "s.t" (tenths) under 20 seconds — the standard blitz-clock convention. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 20_000) {
    const totalTenths = Math.ceil(clamped / 100);
    const seconds = Math.floor(totalTenths / 10);
    const tenths = totalTenths % 10;
    return `${seconds}.${tenths}`;
  }
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
