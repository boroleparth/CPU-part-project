/**
 * Download the Notebookcheck GPU pages listed in scripts/notebookcheck-pages.ts into
 * data/sources/<today>/notebookcheck/<id>.html.gz (git-ignored), one every 4 seconds.
 *
 *   npm run bench:laptops:fetch
 *   npm run bench:laptops
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { nbcPages } from './notebookcheck-pages';

const date = new Date().toISOString().slice(0, 10);
const dir = join(import.meta.dirname, '..', 'data', 'sources', date, 'notebookcheck');
mkdirSync(dir, { recursive: true });
for (const p of nbcPages) {
  const res = await fetch(p.url, { headers: { 'User-Agent': 'Mozilla/5.0 (PC Harmony benchmark calibration)' } });
  if (!res.ok) {
    console.log(`${p.id}: HTTP ${res.status}, skipped`);
  } else {
    const html = await res.text();
    writeFileSync(join(dir, `${p.id}.html.gz`), gzipSync(html));
    console.log(`${p.id}: ${(html.length / 1e6).toFixed(1)} MB`);
  }
  await new Promise((r) => setTimeout(r, 4000));
}
