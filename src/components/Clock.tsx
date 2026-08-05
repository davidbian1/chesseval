import { formatClock } from '../clock';

interface ClockProps {
  ms: number | null;
  /** Whether this side is currently on the move (and thus ticking). */
  active: boolean;
}

const LOW_TIME_MS = 20_000;

export function Clock({ ms, active }: ClockProps) {
  if (ms === null) return null;

  const low = ms <= LOW_TIME_MS;
  const classes = ['clock', active ? 'clock-active' : '', low ? 'clock-low' : ''].filter(Boolean).join(' ');

  return <div className={classes}>{formatClock(ms)}</div>;
}
