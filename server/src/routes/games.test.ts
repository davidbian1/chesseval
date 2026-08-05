import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../db.js';

const app = createApp();

const validGame = {
  pgn: '1. e4 e5 2. Nf3 Nc6',
  result: '1-0',
  mode: 'ai',
  humanSide: 'w',
};

beforeEach(async () => {
  await prisma.game.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /games', () => {
  it('saves a game and returns it with an id and createdAt', async () => {
    const res = await request(app).post('/games').send(validGame);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(validGame);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it('allows a null humanSide for Human vs Human games', async () => {
    const res = await request(app).post('/games').send({ pgn: '1. d4 d5', result: '1/2-1/2', mode: 'human' });
    expect(res.status).toBe(201);
    expect(res.body.humanSide).toBeNull();
  });

  it('accepts "online" as a mode', async () => {
    const res = await request(app)
      .post('/games')
      .send({ ...validGame, mode: 'online' });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe('online');
  });

  it('rejects a missing pgn', async () => {
    const res = await request(app)
      .post('/games')
      .send({ ...validGame, pgn: '' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid result', async () => {
    const res = await request(app)
      .post('/games')
      .send({ ...validGame, result: '2-0' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid mode', async () => {
    const res = await request(app)
      .post('/games')
      .send({ ...validGame, mode: 'bot' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid humanSide', async () => {
    const res = await request(app)
      .post('/games')
      .send({ ...validGame, humanSide: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('GET /games', () => {
  it('lists saved games most-recent-first', async () => {
    await prisma.game.create({ data: { ...validGame, pgn: 'first' } });
    await prisma.game.create({ data: { ...validGame, pgn: 'second' } });

    const res = await request(app).get('/games');
    expect(res.status).toBe(200);
    expect(res.body.map((g: { pgn: string }) => g.pgn)).toEqual(['second', 'first']);
  });

  it('respects limit and offset', async () => {
    for (const pgn of ['a', 'b', 'c']) {
      await prisma.game.create({ data: { ...validGame, pgn } });
    }
    const res = await request(app).get('/games').query({ limit: 1, offset: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].pgn).toBe('b');
  });
});

describe('GET /games/:id', () => {
  it('returns the matching game', async () => {
    const created = await prisma.game.create({ data: validGame });
    const res = await request(app).get(`/games/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
  });

  it('404s for an id that does not exist', async () => {
    const res = await request(app).get('/games/999999');
    expect(res.status).toBe(404);
  });

  it('400s for a non-numeric id', async () => {
    const res = await request(app).get('/games/not-a-number');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /games/:id', () => {
  it('deletes an existing game', async () => {
    const created = await prisma.game.create({ data: validGame });

    const del = await request(app).delete(`/games/${created.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/games/${created.id}`);
    expect(get.status).toBe(404);
  });

  it('404s when deleting an id that does not exist', async () => {
    const res = await request(app).delete('/games/999999');
    expect(res.status).toBe(404);
  });
});
