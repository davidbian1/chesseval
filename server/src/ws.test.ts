import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createApp } from './app.js';
import { attachWebSocketServer } from './ws.js';

type Message = Record<string, unknown>;

let server: http.Server;
let port: number;

beforeEach(async () => {
  server = http.createServer(createApp());
  attachWebSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('expected a bound TCP address');
  port = address.port;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage(ws: WebSocket): Promise<Message> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(raw.toString())));
  });
}

async function createAndJoinRoom(): Promise<{ white: WebSocket; black: WebSocket; roomId: string }> {
  const white = await connect();
  white.send(JSON.stringify({ type: 'create' }));
  const created = await nextMessage(white);
  const roomId = created.roomId as string;

  const black = await connect();
  black.send(JSON.stringify({ type: 'join', roomId }));
  await Promise.all([nextMessage(black), nextMessage(white)]);

  return { white, black, roomId };
}

describe('WebSocket rooms', () => {
  it('lets a client create a room and become white', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'create' }));
    const msg = await nextMessage(ws);
    expect(msg).toMatchObject({ type: 'joined', color: 'w' });
    expect(msg.roomId).toMatch(/^[A-Z0-9]{6}$/);
    ws.close();
  });

  it('lets a second client join as black and notifies white', async () => {
    const white = await connect();
    white.send(JSON.stringify({ type: 'create' }));
    const created = await nextMessage(white);

    const black = await connect();
    black.send(JSON.stringify({ type: 'join', roomId: created.roomId }));

    const [joinedMsg, opponentJoinedMsg] = await Promise.all([nextMessage(black), nextMessage(white)]);
    expect(joinedMsg).toMatchObject({ type: 'joined', color: 'b', roomId: created.roomId });
    expect(opponentJoinedMsg).toEqual({ type: 'opponent-joined' });

    white.close();
    black.close();
  });

  it('rejects joining an unknown room', async () => {
    const ws = await connect();
    ws.send(JSON.stringify({ type: 'join', roomId: 'ZZZZZZ' }));
    const msg = await nextMessage(ws);
    expect(msg).toEqual({ type: 'error', message: 'Room not found' });
    ws.close();
  });

  it('rejects joining a full room', async () => {
    const { white, black, roomId } = await createAndJoinRoom();

    const third = await connect();
    third.send(JSON.stringify({ type: 'join', roomId }));
    const msg = await nextMessage(third);
    expect(msg).toEqual({ type: 'error', message: 'Room is full' });

    white.close();
    black.close();
    third.close();
  });

  it('relays a legal move to both players with the updated fen', async () => {
    const { white, black } = await createAndJoinRoom();

    white.send(JSON.stringify({ type: 'move', from: 'e2', to: 'e4' }));
    const [whiteEcho, blackEcho] = await Promise.all([nextMessage(white), nextMessage(black)]);
    expect(whiteEcho).toMatchObject({ type: 'move', from: 'e2', to: 'e4' });
    expect(blackEcho).toEqual(whiteEcho);
    expect(whiteEcho.fen).toContain(' b '); // black to move next

    white.close();
    black.close();
  });

  it('rejects a move played out of turn', async () => {
    const { white, black } = await createAndJoinRoom();

    black.send(JSON.stringify({ type: 'move', from: 'e7', to: 'e5' }));
    const msg = await nextMessage(black);
    expect(msg).toEqual({ type: 'error', message: 'Not your turn' });

    white.close();
    black.close();
  });

  it('rejects an illegal move', async () => {
    const white = await connect();
    white.send(JSON.stringify({ type: 'create' }));
    await nextMessage(white);

    white.send(JSON.stringify({ type: 'move', from: 'e2', to: 'e5' }));
    const msg = await nextMessage(white);
    expect(msg).toEqual({ type: 'error', message: 'Illegal move' });

    white.close();
  });

  it('notifies the remaining player when their opponent disconnects', async () => {
    const { white, black } = await createAndJoinRoom();

    const leftPromise = nextMessage(white);
    black.close();
    const msg = await leftPromise;
    expect(msg).toEqual({ type: 'opponent-left' });

    white.close();
  });

  it('relays a resignation to both players', async () => {
    const { white, black } = await createAndJoinRoom();

    white.send(JSON.stringify({ type: 'resign' }));
    const [whiteMsg, blackMsg] = await Promise.all([nextMessage(white), nextMessage(black)]);
    expect(whiteMsg).toEqual({ type: 'resigned', color: 'w' });
    expect(blackMsg).toEqual({ type: 'resigned', color: 'w' });

    white.close();
    black.close();
  });
});
