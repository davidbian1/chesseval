import { existsSync } from 'node:fs';

// Locally, .env.test supplies a DATABASE_URL pointing at a separate test
// database so tests never touch dev data. In CI, DATABASE_URL is already
// injected by the workflow (a Postgres service container), so there's no
// file to load.
if (existsSync('.env.test')) {
  process.loadEnvFile('.env.test');
}
