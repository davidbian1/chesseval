import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Tests share one real Postgres database and reset it between cases;
    // running files in parallel would race on that shared state.
    fileParallelism: false,
  },
});
