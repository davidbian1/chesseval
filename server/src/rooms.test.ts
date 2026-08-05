import { describe, expect, it } from 'vitest';
import { createRoom, deleteRoom, getRoom, roomCount } from './rooms.js';

describe('rooms', () => {
  it('creates a room with a 6-character id and the starting position', () => {
    const room = createRoom();
    expect(room.id).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.white).toBeNull();
    expect(room.black).toBeNull();
    expect(room.chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('retrieves a created room by id', () => {
    const room = createRoom();
    expect(getRoom(room.id)).toBe(room);
  });

  it('returns undefined for an unknown id', () => {
    expect(getRoom('ZZZZZZ')).toBeUndefined();
  });

  it('generates unique ids across many rooms', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createRoom().id));
    expect(ids.size).toBe(50);
  });

  it('removes a room on delete', () => {
    const room = createRoom();
    const before = roomCount();
    deleteRoom(room.id);
    expect(getRoom(room.id)).toBeUndefined();
    expect(roomCount()).toBe(before - 1);
  });
});
