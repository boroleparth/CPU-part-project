/**
 * Suggest per-game factors from Notebookcheck's measured FPS (laptops and desktops), 1080p at
 * the preset each game profile assumes. For each game it searches the GPU factor (scales
 * gpuFpsPerPoint) and CPU factor (scales cpuFpsPerPoint) that minimise the average error, then
 * shrinks them toward 1 when there are few measurements: factor = 1 + (fit - 1) * n / (n + 20).
 *
 *   npx vite-node scripts/fit-game-profiles.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { cpus, gpus, laptopCpus, laptopGpus } from '../src/data';
import { games } from '../src/data/games';
import { completeBuild } from '../src/engine/builder';
import { fittedSettings } from '../src/engine/settings';
import { simulateFps, softMin } from '../src/engine/simulation';
import type { Build } from '../src/engine/types';
import { median, nbcGames, parseNotebookcheckGpuPage } from './notebookcheck-lib';
import { nbcPages } from './notebookcheck-pages';

const root = join(import.meta.dirname, '..');
const sourcesDir = join(root, 'data', 'sources');
const date = readdirSync(sourcesDir).filter((d) => existsSync(join(sourcesDir, d, 'notebookcheck'))).sort().at(-1)!;
const dir = join(sourcesDir, date, 'notebookcheck');

const cpuName = (s: string) => s.replace(/^\[X\]\s*/, '').replace(/^(AMD|Intel)\s+/i, '').replace(/\s+[\d.]+\s*GHz.*$/i, '').replace(/\s+via\s.*$/i, '').trim().toLowerCase();
const desktopCpu = new Map(cpus.map((c) => [c.name.toLowerCase(), c]));
const laptopCpu = new Map(laptopCpus.map((c) => [c.name.toLowerCase(), c]));

interface Point { cpuFps: number; gpuFps: number; measured: number; kind: 'laptop' | 'desktop' }
const points = new Map<string, Point[]>();

for (const p of nbcPages) {
  const f = join(dir, `${p.id}.html.gz`);
  if (!existsSync(f)) continue;
  const rows = parseNotebookcheckGpuPage(gunzipSync(readFileSync(f)).toString('utf8'));
  const gpu = p.kind === 'laptop' ? laptopGpus.find((g) => g.typical && g.id.startsWith(`${p.id}-`)) : gpus.find((g) => g.id === p.id);
  if (!gpu) continue;
  for (const [gid, m] of Object.entries(nbcGames)) {
    const game = games.find((g) => g.id === gid)!;
    const row = m.names.map((n) => rows.find((r) => r.game === n && r.preset === m.preset && r.resolution === '1920x1080')).find(Boolean);
    if (!row) continue;
    for (const x of row.results) {
      const cpu = (p.kind === 'laptop' ? laptopCpu : desktopCpu).get(cpuName(x.cpu));
      if (!cpu) continue;
      const b: Build = completeBuild({ cpu, gpu });
      const s = simulateFps(b, game, '1080p', fittedSettings(game));
      points.set(gid, [...(points.get(gid) ?? []), { cpuFps: s.cpuFps, gpuFps: s.gpuFps, measured: x.fps, kind: p.kind }]);
    }
  }
}

const err = (pts: Point[], a: number, c: number, cap?: number) =>
  median(pts.map((q) => Math.abs(Math.log(Math.min(softMin(c * q.cpuFps, a * q.gpuFps), cap ?? Infinity) / q.measured))));

console.log(`| Game | Measurements (laptop / desktop) | Error now | GPU factor | CPU factor | Error after | Unshrunk fit (GPU / CPU, error) |\n|---|---|---|---|---|---|---|`);
for (const game of games) {
  const pts = points.get(game.id);
  if (!pts?.length) { console.log(`| ${game.name} | 0 | – | 1.00 | 1.00 | – |`); continue; }
  let best = { a: 1, c: 1, e: Infinity };
  for (let a = 0.5; a <= 2.0001; a += 0.01) for (let c = 0.5; c <= 2.0001; c += 0.01) {
    const e = err(pts, a, c, game.fpsCap);
    if (e < best.e - 1e-9) best = { a, c, e };
  }
  const n = pts.length;
  const shrink = (x: number) => 1 + (x - 1) * (n / (n + 20));
  const a = shrink(best.a);
  const c = shrink(best.c);
  const lap = pts.filter((q) => q.kind === 'laptop').length;
  const pctE = (e: number) => `${((Math.exp(e) - 1) * 100).toFixed(0)}%`;
  console.log(`| ${game.name} | ${n} (${lap} / ${n - lap}) | ${pctE(err(pts, 1, 1, game.fpsCap))} | ${a.toFixed(2)} | ${c.toFixed(2)} | ${pctE(err(pts, a, c, game.fpsCap))} | ${best.a.toFixed(2)} / ${best.c.toFixed(2)}, ${pctE(best.e)} |`);
}
