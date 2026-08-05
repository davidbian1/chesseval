import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Chess } from 'chess.js';
import { findBestMove } from '../engine/stockfish';
import type { GameMode, Side } from '../components/Controls';

const AI_BASE_TIME_MS = 1200;

export interface EngineEvaluation {
  evalScore: number;
  mateIn: number | null;
  aiThinking: boolean;
  evalThinking: boolean;
  /** Sets the eval bar to reflect a side losing for a reason outside chess.js's rules (resignation, timeout). */
  applyExternalLoss: (losingSide: Side) => void;
  /** Resets eval-bar state for a fresh game. */
  resetForNewGame: () => void;
}

/**
 * Owns the AI opponent's move search and the eval bar's honest-assessment
 * refresh — the two effects that talk to the Stockfish engine. Keeping this
 * separate from App's UI/input handling means the engine-orchestration
 * concern can be reasoned about (and swapped out) independently.
 */
export function useEngineEvaluation(
  chessRef: MutableRefObject<Chess>,
  fen: string,
  mode: GameMode,
  humanSide: Side,
  strength: number,
  externalLoser: Side | null,
  refresh: () => void,
): EngineEvaluation {
  const [evalScore, setEvalScore] = useState(0);
  const [mateIn, setMateIn] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [evalThinking, setEvalThinking] = useState(false);
  const skipNextEvalRef = useRef(false);

  const chess = chessRef.current;
  const gameOver = chess.isGameOver() || externalLoser !== null;

  // AI move effect.
  useEffect(() => {
    if (mode !== 'ai' || gameOver) return;
    if (chess.turn() === humanSide) return;

    let cancelled = false;
    setAiThinking(true);
    const timeBudget = AI_BASE_TIME_MS * (0.3 + strength * 1.7);
    const timer = setTimeout(async () => {
      const result = await findBestMove(chessRef.current, timeBudget, strength);
      if (cancelled) return;
      if (result.move) {
        chessRef.current.move(result.move);
        skipNextEvalRef.current = true;
        setEvalScore(result.score);
        setMateIn(result.mateIn);
      }
      setAiThinking(false);
      refresh();
    }, 30);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, mode, humanSide, externalLoser]);

  // Eval-bar refresh for any position not already scored by the AI-move effect.
  // Always evaluated at full engine strength, regardless of the AI opponent's
  // difficulty setting — the bar should show the honest assessment.
  useEffect(() => {
    if (skipNextEvalRef.current) {
      skipNextEvalRef.current = false;
      return;
    }
    if (externalLoser) return; // eval already set directly by applyExternalLoss.
    if (gameOver) {
      if (chess.isCheckmate()) {
        setEvalScore(chess.turn() === 'w' ? -100000 : 100000);
        setMateIn(chess.turn() === 'b' ? 1 : -1);
      } else {
        setEvalScore(0);
        setMateIn(null);
      }
      return;
    }
    let cancelled = false;
    setEvalThinking(true);
    const timer = setTimeout(async () => {
      const result = await findBestMove(chessRef.current, 600, 1);
      if (cancelled) return;
      setEvalScore(result.score);
      setMateIn(result.mateIn);
      setEvalThinking(false);
    }, 10);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, externalLoser]);

  return {
    evalScore,
    mateIn,
    aiThinking,
    evalThinking,
    applyExternalLoss: (losingSide) => {
      setAiThinking(false);
      setEvalScore(losingSide === 'w' ? -100000 : 100000);
      setMateIn(null);
    },
    resetForNewGame: () => {
      setAiThinking(false);
      setEvalScore(0);
      setMateIn(null);
      skipNextEvalRef.current = false;
    },
  };
}
