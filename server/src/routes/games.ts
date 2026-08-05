import { Router } from 'express';
import { prisma } from '../db.js';

export const gamesRouter = Router();

const VALID_RESULTS = new Set(['1-0', '0-1', '1/2-1/2']);
const VALID_MODES = new Set(['human', 'ai', 'online']);
const VALID_SIDES = new Set(['w', 'b']);

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** List saved games, most recent first. */
gamesRouter.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const games = await prisma.game.findMany({
    // id as a tiebreaker: createdAt only has millisecond precision, so two
    // games saved in the same millisecond would otherwise sort unstably.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    skip: offset,
  });
  res.json(games);
});

/** Fetch one saved game by id. */
gamesRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'id must be a positive integer' });
    return;
  }

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    res.status(404).json({ error: 'game not found' });
    return;
  }
  res.json(game);
});

/** Save a finished game. */
gamesRouter.post('/', async (req, res) => {
  const { pgn, result, mode, humanSide } = req.body ?? {};

  if (typeof pgn !== 'string' || pgn.trim().length === 0) {
    res.status(400).json({ error: 'pgn is required' });
    return;
  }
  if (!VALID_RESULTS.has(result)) {
    res.status(400).json({ error: 'result must be one of "1-0", "0-1", "1/2-1/2"' });
    return;
  }
  if (!VALID_MODES.has(mode)) {
    res.status(400).json({ error: 'mode must be "human", "ai", or "online"' });
    return;
  }
  if (humanSide !== undefined && humanSide !== null && !VALID_SIDES.has(humanSide)) {
    res.status(400).json({ error: 'humanSide must be "w", "b", or omitted' });
    return;
  }

  const game = await prisma.game.create({
    data: { pgn, result, mode, humanSide: humanSide ?? null },
  });
  res.status(201).json(game);
});

/** Delete a saved game. */
gamesRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'id must be a positive integer' });
    return;
  }

  try {
    await prisma.game.delete({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'game not found' });
  }
});
