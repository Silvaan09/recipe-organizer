import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/* global process */

const distDirectory = join(process.cwd(), 'dist');
const indexFile = join(distDirectory, 'index.html');
const fallbackFile = join(distDirectory, '404.html');

if (!existsSync(indexFile)) {
  throw new Error('dist/index.html was not found. Run the Vite build before creating the Pages fallback.');
}

copyFileSync(indexFile, fallbackFile);
