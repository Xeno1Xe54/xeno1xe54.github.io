import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const files = ['index.html', 'styles.css', 'app.js', 'site-config.js'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map(file => cp(resolve(root, file), resolve(output, file))));
// Copy the collection tree unchanged so image URLs begin with photos/2026/08/.
await cp(resolve(root, 'photos'), resolve(output, 'photos'), { recursive: true });
await mkdir(resolve(output, 'data'), { recursive: true });

console.log('Staged the static site in dist/.');
