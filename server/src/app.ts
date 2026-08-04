import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { gamesRouter } from './routes/games.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(healthRouter);
  app.use('/games', gamesRouter);
  return app;
}
