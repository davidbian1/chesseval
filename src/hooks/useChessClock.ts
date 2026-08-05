import { useEffect, useRef, useState } from 'react';
import type { Side } from '../components/Controls';
import { applyIncrement, initialClockTimes, tickClock, type ClockTimes, type TimeControl } from '../clock';

const TICK_MS = 100;

export interface ChessClock extends ClockTimes {
  /** Snaps both clocks back to the time control's starting time — call on New Game. */
  resetClock: (fenAtReset: string) => void;
}

/**
 * Owns clock state for a `TimeControl`: ticks down the side on move, credits
 * increment when a move lands (detected via `fen` changing), and stops
 * ticking once the game is over. Flag-fall detection is the caller's job —
 * this hook just reports `whiteMs`/`blackMs` reaching zero.
 */
export function useChessClock(timeControl: TimeControl, turn: Side, fen: string, gameOver: boolean): ChessClock {
  const [times, setTimes] = useState<ClockTimes>(() => initialClockTimes(timeControl));
  const lastFenRef = useRef(fen);

  // A different time control selection always starts both clocks fresh.
  useEffect(() => {
    setTimes(initialClockTimes(timeControl));
    lastFenRef.current = fen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeControl]);

  // Credit the mover's increment once their move lands on the board.
  useEffect(() => {
    if (fen === lastFenRef.current) return;
    lastFenRef.current = fen;
    const mover: Side = turn === 'w' ? 'b' : 'w';
    setTimes((t) => applyIncrement(t, mover, timeControl.incrementMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  // Tick down the side on move, once per TICK_MS, using real elapsed time
  // (not just TICK_MS) so the clock stays accurate under timer throttling.
  useEffect(() => {
    if (timeControl.initialMs === null || gameOver) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - last;
      last = now;
      setTimes((t) => tickClock(t, turn, elapsed));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [turn, gameOver, timeControl]);

  const resetClock = (fenAtReset: string) => {
    setTimes(initialClockTimes(timeControl));
    lastFenRef.current = fenAtReset;
  };

  return { ...times, resetClock };
}
