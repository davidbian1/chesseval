import { Chess } from 'chess.js';
import type { WebSocket } from 'ws';

export interface Room {
  id: string;
  chess: Chess;
  white: WebSocket | null;
  black: WebSocket | null;
}

// Excludes visually ambiguous characters (0/O, 1/I/L) so a code is easy to
// read aloud or copy correctly.
const ROOM_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_ID_LENGTH = 6;

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)];
  }
  return id;
}

export function createRoom(): Room {
  let id = generateRoomId();
  while (rooms.has(id)) id = generateRoomId();
  const room: Room = { id, chess: new Chess(), white: null, black: null };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}

export function roomCount(): number {
  return rooms.size;
}
