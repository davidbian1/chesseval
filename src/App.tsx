import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Board } from './components/Board';
import { EvalBar } from './components/EvalBar';
import { Controls, type GameMode, type Side } from './components/Controls';
import { findBestMove } from './engine/stockfish';
import './styles.css';

const AI_BASE_TIME_MS = 1200;

function statusText(chess: Chess, mode: GameMode, humanSide: Side, thinking: boolean): string {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    return `Checkmate — ${winner} wins`;
  }
  if (chess.isStalemate()) return 'Draw — stalemate';
  if (chess.isThreefoldRepetition()) return 'Draw — repetition';
  if (chess.isDraw()) return 'Draw';
  if (thinking) return 'Engine is thinking…';
  const toMove = chess.turn() === 'w' ? 'White' : 'Black';
  if (mode === 'ai') {
    const isHumanTurn = chess.turn() === humanSide;
    return `${toMove} to move${isHumanTurn ? ' (you)' : ' (engine)'}${chess.isCheck() ? ' — check' : ''}`;
  }
  return `${toMove} to move${chess.isCheck() ? ' — check' : ''}`;
}

export default function App() {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [mode, setMode] = useState<GameMode>('ai');
  const [humanSide, setHumanSide] = useState<Side>('w');
  const [strength, setStrength] = useState(0.5);
  const [evalScore, setEvalScore] = useState(0);
  const [mateIn, setMateIn] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [evalThinking, setEvalThinking] = useState(false);
  const skipNextEvalRef = useRef(false);

  const chess = chessRef.current;
  const gameOver = chess.isGameOver();

  const refresh = useCallback(() => {
    setFen(chessRef.current.fen());
  }, []);

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
  }, [fen, mode, humanSide]);

  // Eval-bar refresh for any position not already scored by the AI-move effect.
  // Always evaluated at full engine strength, regardless of the AI opponent's
  // difficulty setting — the bar should show the honest assessment.
  useEffect(() => {
    if (skipNextEvalRef.current) {
      skipNextEvalRef.current = false;
      return;
    }
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
  }, [fen]);

  const legalTargets = selected
    ? chess.moves({ square: selected, verbose: true }).map((m) => m.to as Square)
    : [];

  const isHumanTurn = mode === 'human' || chess.turn() === humanSide;

  const handleSquareClick = (square: Square) => {
    if (gameOver || aiThinking || !isHumanTurn) return;

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      const moves = chess.moves({ square: selected, verbose: true });
      const target = moves.find((m) => m.to === square);
      if (target) {
        chess.move({ from: selected, to: square, promotion: target.promotion ?? 'q' });
        setSelected(null);
        refresh();
        return;
      }
      // Clicked another square: reselect if it has a movable piece.
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
      } else {
        setSelected(null);
      }
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelected(square);
    }
  };

  const handleNewGame = () => {
    chessRef.current = new Chess();
    setSelected(null);
    setAiThinking(false);
    setEvalScore(0);
    setMateIn(null);
    skipNextEvalRef.current = false;
    refresh();
  };

  const history = chess.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;

  let inCheckSquare: Square | null = null;
  if (chess.isCheck()) {
    const board = chess.board();
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === chess.turn()) {
          inCheckSquare = cell.square as Square;
        }
      }
    }
  }

  const orientation: Side = mode === 'ai' ? humanSide : 'w';

  return (
    <div className="app">
      <h1 className="title">chesseval</h1>
      <div className="game-area">
        <EvalBar score={evalScore} mateIn={mateIn} thinking={aiThinking || evalThinking} />
        <Board
          board={chess.board()}
          orientation={orientation}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove ? { from: lastMove.from as Square, to: lastMove.to as Square } : null}
          inCheckSquare={inCheckSquare}
          onSquareClick={handleSquareClick}
        />
        <Controls
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            setSelected(null);
          }}
          humanSide={humanSide}
          onHumanSideChange={setHumanSide}
          strength={strength}
          onStrengthChange={setStrength}
          onNewGame={handleNewGame}
          status={statusText(chess, mode, humanSide, aiThinking)}
        />
      </div>
    </div>
  );
}
