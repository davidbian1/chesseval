// Copies the Stockfish lite single-threaded WASM build into public/ so Vite
// serves it as a static asset. Runs on `npm install` so the binary doesn't
// need to be committed to git.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(rootDir, 'node_modules', 'stockfish', 'bin');
const destDir = join(rootDir, 'public');
const basename = 'stockfish-18-lite-single';

mkdirSync(destDir, { recursive: true });
for (const ext of ['.js', '.wasm']) {
  copyFileSync(join(srcDir, basename + ext), join(destDir, basename + ext));
}
console.log(`Copied ${basename}.{js,wasm} to public/`);
