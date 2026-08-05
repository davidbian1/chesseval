import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Chess, Square } from 'chess.js';
import { isOnlinePlayConfigured, wsUrl } from '../api/backend';
import type { PromotionPiece } from '../components/PromotionPicker';
import type { Side } from '../components/Controls';

export type OnlineStatus =
  | 'idle' // never connected
  | 'connecting'
  | 'waiting' // connected, no opponent yet
  | 'playing' // both sides present
  | 'opponent-left'
  | 'error';

export interface OnlineGame {
  status: OnlineStatus;
  roomId: string | null;
  color: Side | null;
  errorMessage: string | null;
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  sendMove: (from: Square, to: Square, promotion?: PromotionPiece) => void;
  sendResign: () => void;
  disconnect: () => void;
}

interface ServerMessage {
  type: 'joined' | 'opponent-joined' | 'opponent-left' | 'move' | 'resigned' | 'error';
  roomId?: string;
  color?: Side;
  fen?: string;
  message?: string;
}

/**
 * Owns the WebSocket connection for online play. The server is the sole
 * authority on game state: outgoing moves are just requests (sendMove), and
 * the local chess position only ever changes in response to the server's
 * own "move"/"joined" messages (chessRef.current.load(fen) + refresh()) —
 * never applied optimistically. This trades a small round-trip latency for
 * guaranteeing both players can never see divergent positions.
 */
export function useOnlineGame(
  chessRef: MutableRefObject<Chess>,
  refresh: () => void,
  onResigned: (color: Side) => void,
): OnlineGame {
  const [status, setStatus] = useState<OnlineStatus>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [color, setColor] = useState<Side | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onResignedRef = useRef(onResigned);
  onResignedRef.current = onResigned;

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connect = (afterOpen: (ws: WebSocket) => void) => {
    if (!isOnlinePlayConfigured()) {
      setStatus('error');
      setErrorMessage('Online play is not configured for this deployment.');
      return;
    }
    wsRef.current?.close();
    setStatus('connecting');
    setErrorMessage(null);

    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;

    ws.onopen = () => afterOpen(ws);
    ws.onerror = () => {
      setStatus('error');
      setErrorMessage('Could not connect to the game server.');
    };
    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'joined':
          setRoomId(msg.roomId ?? null);
          setColor(msg.color ?? null);
          if (msg.fen) {
            chessRef.current.load(msg.fen);
            refresh();
          }
          // Joining an existing room (assigned black) means white is
          // already there; creating one (assigned white) means waiting.
          setStatus(msg.color === 'b' ? 'playing' : 'waiting');
          break;
        case 'opponent-joined':
          setStatus('playing');
          break;
        case 'opponent-left':
          setStatus('opponent-left');
          break;
        case 'move':
          if (msg.fen) {
            chessRef.current.load(msg.fen);
            refresh();
          }
          break;
        case 'resigned':
          if (msg.color) onResignedRef.current(msg.color);
          break;
        case 'error':
          setErrorMessage(msg.message ?? 'Something went wrong.');
          break;
      }
    };
  };

  const createRoom = () => {
    connect((ws) => ws.send(JSON.stringify({ type: 'create' })));
  };

  const joinRoom = (id: string) => {
    connect((ws) => ws.send(JSON.stringify({ type: 'join', roomId: id })));
  };

  const sendMove = (from: Square, to: Square, promotion?: PromotionPiece) => {
    wsRef.current?.send(JSON.stringify({ type: 'move', from, to, promotion }));
  };

  const sendResign = () => {
    wsRef.current?.send(JSON.stringify({ type: 'resign' }));
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('idle');
    setRoomId(null);
    setColor(null);
    setErrorMessage(null);
  };

  return { status, roomId, color, errorMessage, createRoom, joinRoom, sendMove, sendResign, disconnect };
}
