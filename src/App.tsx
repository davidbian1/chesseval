import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Board } from './components/Board';
import { EvalBar } from './components/EvalBar';
import { Clock } from './components/Clock';
import { Controls, type GameMode, type Side } from './components/Controls';
import { PromotionPicker, type PromotionPiece } from './components/PromotionPicker';
import { ConfirmDialog } from './components/ConfirmDialog';
import { stopSearch } from './engine/stockfish';
import { useEngineEvaluation } from './hooks/useEngineEvaluation';
import { useChessClock } from './hooks/useChessClock';
import { DEFAULT_TIME_CONTROL, flaggedSide, type TimeControl } from './clock';
import { pseudoLegalPremoveTargets } from './premove';
import { gameResult } from './gameResult';
import { isGameHistoryEnabled, saveGame } from './api/gamesClient';
import { GameHistory } from './components/GameHistory';
import './styles.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type TerminationReason = 'resignation' | 'timeout' | null;

function statusText(
  chess: Chess,
  mode: GameMode,
  humanSide: Side,
  thinking: boolean,
  externalLoser: Side | null,
  terminationReason: TerminationReason,
): string {
  if (externalLoser) {
    const winner = externalLoser === 'w' ? 'Black' : 'White';
    const loser = externalLoser === 'w' ? 'White' : 'Black';
    const cause = terminationReason === 'timeout' ? "'s time runs out" : ' resigns';
    return `${loser}${cause} — ${winner} wins`;
  }
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
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null);
  const [mode, setMode] = useState<GameMode>('ai');
  const [humanSide, setHumanSide] = useState<Side>('w');
  const [strength, setStrength] = useState(0.5);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: Side } | null>(null);
  const [resignedBy, setResignedBy] = useState<Side | null>(null);
  const [timedOutBy, setTimedOutBy] = useState<Side | null>(null);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl>(DEFAULT_TIME_CONTROL);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const chess = chessRef.current;
  // Either kind of forced loss (resignation or flag fall) ends the game the
  // same way chess.js's own game-over checks do, just outside its rules.
  const externalLoser = resignedBy ?? timedOutBy;
  const terminationReason: TerminationReason = resignedBy ? 'resignation' : timedOutBy ? 'timeout' : null;
  const gameOver = chess.isGameOver() || externalLoser !== null;

  const refresh = useCallback(() => {
    setFen(chessRef.current.fen());
  }, []);

  const { evalScore, mateIn, aiThinking, evalThinking, applyExternalLoss, resetForNewGame } = useEngineEvaluation(
    chessRef,
    fen,
    mode,
    humanSide,
    strength,
    externalLoser,
    refresh,
  );

  const { whiteMs, blackMs, resetClock } = useChessClock(timeControl, chess.turn(), fen, gameOver);

  // Flag fall: whichever side's clock hits zero loses. A position where the
  // opponent has no mating material left is already covered by chess.js's
  // own isGameOver()/isInsufficientMaterial() check above — that position
  // ends the game (as a draw) the moment it arises, before any clock could
  // reach zero in it, so no separate handling is needed here.
  useEffect(() => {
    if (gameOver) return;
    const flagged = flaggedSide({ whiteMs, blackMs });
    if (!flagged) return;
    stopSearch();
    applyExternalLoss(flagged);
    setTimedOutBy(flagged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteMs, blackMs, gameOver]);

  const isHumanTurn = mode === 'human' || chess.turn() === humanSide;
  const canAct = !gameOver && !aiThinking && isHumanTurn && !pendingPromotion && !confirmingResign;
  // Premoving only makes sense against an opponent who isn't sharing your
  // screen and keyboard — i.e. the AI, not local Human vs Human hotseat play.
  const canPremove = mode === 'ai' && !gameOver && !isHumanTurn && !confirmingResign && !pendingPromotion;

  const legalTargets = !selected
    ? []
    : canAct
      ? chess.moves({ square: selected, verbose: true }).map((m) => m.to as Square)
      : canPremove
        ? pseudoLegalPremoveTargets(fen, selected)
        : [];

  /** Applies a move if it's unambiguous, or opens the promotion picker if it isn't (or auto-promotes for a premove). */
  const attemptMove = (
    from: Square,
    to: Square,
    autoPromote?: PromotionPiece,
  ): 'moved' | 'promotion-pending' | 'invalid' => {
    const matches = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (matches.length === 0) return 'invalid';
    if (matches.length === 1) {
      chess.move(matches[0]);
      refresh();
      return 'moved';
    }
    if (autoPromote) {
      chess.move(matches.find((m) => m.promotion === autoPromote) ?? matches[0]);
      refresh();
      return 'moved';
    }
    // Multiple matches sharing the same from/to only happens for promotions (one per piece choice).
    setPendingPromotion({ from, to, color: chess.turn() });
    return 'promotion-pending';
  };

  // Once it's actually the human's turn, try the queued premove for real —
  // it either plays (auto-queening on promotion, like most chess UIs default
  // to) or, if the position no longer allows it, is silently discarded.
  useEffect(() => {
    if (!premove || gameOver || chess.turn() !== humanSide) return;
    attemptMove(premove.from, premove.to, 'q');
    setPremove(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, premove]);

  const handleSquareClick = (square: Square) => {
    if (canAct) {
      if (selected) {
        if (selected === square) {
          setSelected(null);
          return;
        }
        const outcome = attemptMove(selected, square);
        if (outcome === 'invalid') {
          // Clicked another square: reselect if it has a movable piece.
          const piece = chess.get(square);
          setSelected(piece && piece.color === chess.turn() ? square : null);
        } else {
          setSelected(null);
        }
        return;
      }

      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
      }
      return;
    }

    if (!canPremove) return;

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (pseudoLegalPremoveTargets(fen, selected).includes(square)) {
        setPremove({ from: selected, to: square });
        setSelected(null);
        return;
      }
      const piece = chess.get(square);
      setSelected(piece && piece.color === humanSide ? square : null);
      return;
    }

    // Any other click while a premove is queued cancels it — clicking a new
    // own piece then starts picking a replacement.
    setPremove(null);
    const piece = chess.get(square);
    if (piece && piece.color === humanSide) {
      setSelected(square);
    }
  };

  const handlePieceDragStart = (square: Square) => {
    if (!canAct) return;
    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelected(square);
    }
  };

  const handleDrop = (from: Square, to: Square) => {
    if (!canAct) return;
    if (from !== to) attemptMove(from, to);
    setSelected(null);
  };

  const completePromotion = (piece: PromotionPiece) => {
    if (!pendingPromotion) return;
    chess.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
    refresh();
  };

  const cancelPromotion = () => setPendingPromotion(null);

  const handleNewGame = () => {
    stopSearch();
    chessRef.current = new Chess();
    setSelected(null);
    setPremove(null);
    setPendingPromotion(null);
    setResignedBy(null);
    setTimedOutBy(null);
    setConfirmingResign(false);
    setSaveStatus('idle');
    resetForNewGame();
    resetClock(chessRef.current.fen());
    refresh();
  };

  const handleSaveGame = async () => {
    const result = gameResult(chess, externalLoser);
    if (!result) return;
    setSaveStatus('saving');
    try {
      await saveGame({ pgn: chess.pgn(), result, mode, humanSide: mode === 'ai' ? humanSide : null });
      setSaveStatus('saved');
      setHistoryRefreshKey((k) => k + 1);
    } catch {
      setSaveStatus('error');
    }
  };

  const requestResign = () => {
    if (gameOver) return;
    setConfirmingResign(true);
  };

  const cancelResign = () => setConfirmingResign(false);

  const confirmResign = () => {
    setConfirmingResign(false);
    // In Human vs AI, resigning always means the human gives up. In Human vs
    // Human there's no fixed "human side", so it's whoever's turn it is.
    const resigningSide: Side = mode === 'ai' ? humanSide : chess.turn();
    stopSearch();
    setSelected(null);
    setPremove(null);
    setPendingPromotion(null);
    applyExternalLoss(resigningSide);
    setResignedBy(resigningSide);
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
  const topSide: Side = orientation === 'w' ? 'b' : 'w';
  const bottomSide: Side = orientation;
  const turnActive = !gameOver && chess.turn();

  return (
    <div className="app">
      <h1 className="title">chesseval</h1>
      <div className="game-area">
        <EvalBar
          score={evalScore}
          mateIn={mateIn}
          thinking={aiThinking || evalThinking}
          resultLabel={externalLoser ? (externalLoser === 'w' ? '0–1' : '1–0') : null}
        />
        <div className="board-column">
          <Clock ms={topSide === 'w' ? whiteMs : blackMs} active={turnActive === topSide} />
          <Board
            board={chess.board()}
            orientation={orientation}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove ? { from: lastMove.from as Square, to: lastMove.to as Square } : null}
            inCheckSquare={inCheckSquare}
            premove={premove}
            onSquareClick={handleSquareClick}
            onPieceDragStart={handlePieceDragStart}
            onDrop={handleDrop}
            onDragEnd={() => setSelected(null)}
            canDrag={canAct}
            turnColor={chess.turn()}
          />
          <Clock ms={bottomSide === 'w' ? whiteMs : blackMs} active={turnActive === bottomSide} />
        </div>
        {pendingPromotion && (
          <PromotionPicker color={pendingPromotion.color} onPick={completePromotion} onCancel={cancelPromotion} />
        )}
        {confirmingResign && (
          <ConfirmDialog
            message="Resign this game?"
            confirmLabel="Resign"
            onConfirm={confirmResign}
            onCancel={cancelResign}
          />
        )}
        <Controls
          mode={mode}
          onModeChange={(m) => {
            stopSearch();
            setMode(m);
            setSelected(null);
            setPremove(null);
          }}
          humanSide={humanSide}
          onHumanSideChange={(side) => {
            stopSearch();
            setHumanSide(side);
            setPremove(null);
          }}
          strength={strength}
          onStrengthChange={setStrength}
          timeControl={timeControl}
          onTimeControlChange={setTimeControl}
          timeControlLocked={history.length > 0}
          onNewGame={handleNewGame}
          onResign={requestResign}
          canResign={!gameOver}
          status={statusText(chess, mode, humanSide, aiThinking, externalLoser, terminationReason)}
        />
      </div>
      {isGameHistoryEnabled() && (
        <div className="history-toolbar">
          {gameOver && (
            <button
              className="new-game"
              onClick={handleSaveGame}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            >
              {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'saving' ? 'Saving…' : 'Save Game'}
            </button>
          )}
          <button className="toggle" onClick={() => setShowHistory(true)}>
            Game History
          </button>
        </div>
      )}
      {showHistory && <GameHistory onClose={() => setShowHistory(false)} refreshKey={historyRefreshKey} />}
    </div>
  );
}
