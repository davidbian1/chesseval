import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { createRoom, deleteRoom, getRoom, type Room } from './rooms.js';

type Color = 'w' | 'b';

type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; roomId: string }
  | { type: 'move'; from: string; to: string; promotion?: string }
  | { type: 'resign' };

type ServerMessage =
  | { type: 'joined'; roomId: string; color: Color; fen: string }
  | { type: 'opponent-joined' }
  | { type: 'opponent-left' }
  | { type: 'move'; from: string; to: string; promotion?: string; fen: string }
  | { type: 'resigned'; color: Color }
  | { type: 'error'; message: string };

interface ConnState {
  room: Room;
  color: Color;
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function opponentOf(room: Room, color: Color): WebSocket | null {
  return color === 'w' ? room.black : room.white;
}

export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });
  const connections = new Map<WebSocket, ConnState>();

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', message: 'Malformed message' });
        return;
      }

      switch (msg.type) {
        case 'create': {
          const room = createRoom();
          room.white = ws;
          connections.set(ws, { room, color: 'w' });
          send(ws, { type: 'joined', roomId: room.id, color: 'w', fen: room.chess.fen() });
          return;
        }

        case 'join': {
          const room = getRoom(msg.roomId);
          if (!room) {
            send(ws, { type: 'error', message: 'Room not found' });
            return;
          }
          if (room.white && room.black) {
            send(ws, { type: 'error', message: 'Room is full' });
            return;
          }
          const color: Color = room.white ? 'b' : 'w';
          if (color === 'w') room.white = ws;
          else room.black = ws;
          connections.set(ws, { room, color });
          send(ws, { type: 'joined', roomId: room.id, color, fen: room.chess.fen() });
          const opponent = opponentOf(room, color);
          if (opponent) send(opponent, { type: 'opponent-joined' });
          return;
        }

        case 'move': {
          const state = connections.get(ws);
          if (!state) return;
          const { room, color } = state;
          if (room.chess.turn() !== color) {
            send(ws, { type: 'error', message: 'Not your turn' });
            return;
          }
          let move;
          try {
            move = room.chess.move({ from: msg.from, to: msg.to, promotion: msg.promotion });
          } catch {
            move = null;
          }
          if (!move) {
            send(ws, { type: 'error', message: 'Illegal move' });
            return;
          }
          const payload: ServerMessage = {
            type: 'move',
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            fen: room.chess.fen(),
          };
          if (room.white) send(room.white, payload);
          if (room.black) send(room.black, payload);
          return;
        }

        case 'resign': {
          const state = connections.get(ws);
          if (!state) return;
          const { room, color } = state;
          const payload: ServerMessage = { type: 'resigned', color };
          if (room.white) send(room.white, payload);
          if (room.black) send(room.black, payload);
          return;
        }
      }
    });

    ws.on('close', () => {
      const state = connections.get(ws);
      if (!state) return;
      connections.delete(ws);
      const { room, color } = state;
      if (color === 'w') room.white = null;
      else room.black = null;
      const opponent = opponentOf(room, color);
      if (opponent) send(opponent, { type: 'opponent-left' });
      if (!room.white && !room.black) deleteRoom(room.id);
    });
  });

  return wss;
}
