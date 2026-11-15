/**
 * Calibrate laptop GPUs against real laptops measured by Notebookcheck.
 *
 *   npm run bench:laptops            # newest data/sources/<date>/notebookcheck/
 *
 * For every laptop chip, its FPS is compared with Notebookcheck's desktop reference cards in
 * the same games, versions, presets and resolutions (so the test scene is identical), using
 * GPU-bound settings only (high/ultra at 1080p, everything at 1440p and 4K, under 200 FPS).
 * The ratio times our desktop card's rasterIndex gives the laptop chip's rasterIndex for:
 *   - the median tested laptop  -> our "typical" power version
 *   - the 90th-percentile laptop -> our highest power version
 * Writes src/data/laptop-calibration.json, which src/data/laptops.ts uses instead of the estimates.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { gpus } from '../src/data/gpus';
import { geomean, median, parseNotebookcheckGpuPage, quantile, type NbcRow } from './notebookcheck-lib';
import { nbcPages } from './notebookcheck-pages';

const root = join(import.meta.dirname, '..');
const sourcesDir = join(root, 'data', 'sources');
const date = process.argv[2] ?? readdirSync(sourcesDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && existsSync(join(sourcesDir, d, 'notebookcheck'))).sort().at(-1);
if (!date) throw new Error('No data/sources/<date>/notebookcheck/ folder');
const dir = join(sourcesDir, date, 'notebookcheck');

const load = (id: string): NbcRow[] => {
  const file = join(dir, `${id}.html.gz`);
  return existsSync(file) ? parseNotebookcheckGpuPage(gunzipSync(readFileSync(file)).toString('utf8')) : [];
};

/** GPU-bound rows only: the comparison must measure the graphics chip, not the CPU. */
const gpuBound = (r: NbcRow) =>
  (r.resolution === '1920x1080' ? r.preset === 'high' || r.preset === 'ultra' : ['ultra', 'high'].includes(r.preset) && /^(2560x1440|2560x1600|3840x2160)$/.test(r.resolution));
const key = (r: NbcRow) => `${r.game}|${r.preset}|${r.resolution}`;

const desktopRaster = Object.fromEntries(gpus.map((g) => [g.id, g.rasterIndex]));
const desktops = nbcPages.filter((p) => p.kind === 'desktop').map((p) => {
  const rows = load(p.id).filter(gpuBound);
  return { id: p.id, raster: desktopRaster[p.id], fps: new Map(rows.map((r) => [key(r), median(r.results.map((x) => x.fps))])) };
}).filter((d) => d.fps.size && d.raster);

/** Laptop vs one desktop card: geometric mean of FPS ratios over shared GPU-bound rows. */
function ratioTo(rowFps: Map<string, number>, d: (typeof desktops)[number]) {
  const ratios: number[] = [];
  for (const [k, f] of rowFps) {
    const df = d.fps.get(k);
    if (df && f < 200 && df < 200) ratios.push(f / df);
  }
  return ratios.length >= 4 ? { ratio: geomean(ratios), n: ratios.length } : undefined;
}

/** rasterIndex from FPS per row, averaged over all desktop references (weighted by shared rows). */
function rasterFrom(rowFps: Map<string, number>) {
  let w = 0;
  let logSum = 0;
  const refs: string[] = [];
  for (const d of desktops) {
    const r = ratioTo(rowFps, d);
    if (!r) continue;
    logSum += r.n * Math.log(r.ratio * d.raster);
    w += r.n;
    refs.push(`${d.id}×${r.n}`);
  }
  return w ? { raster: Math.exp(logSum / w), rows: w, refs } : undefined;
}

// Sanity check: do Notebookcheck's desktop results agree with our desktop indices?
console.log(`Reading ${dir}\n\nDesktop cross-check (Notebookcheck ratio vs our rasterIndex ratio, vs RTX 4060):`);
const anchor = desktops.find((d) => d.id === 'rtx4060')!;
for (const d of desktops) {
  if (d === anchor) continue;
  const r = ratioTo(d.fps, anchor);
  if (r) console.log(`  ${d.id.padEnd(11)} measured ${r.ratio.toFixed(2)}  ours ${(d.raster / anchor.raster).toFixed(2)}  (${r.n} rows)`);
}

const out: Record<string, object> = {};
console.log('\nLaptop GPUs (rasterIndex, desktop scale RTX 5090 = 100):');
for (const p of nbcPages.filter((x) => x.kind === 'laptop')) {
  const rows = load(p.id).filter(gpuBound);
  if (!rows.length) continue;
  // Median laptop: the row medians.
  const med = new Map(rows.map((r) => [key(r), median(r.results.map((x) => x.fps))]));
  const typical = rasterFrom(med);
  // Each tested laptop's speed relative to the median, across the rows it appears in.
  const bySystem = new Map<string, number[]>();
  for (const r of rows) {
    const m = med.get(key(r))!;
    for (const x of r.results) {
      const name = x.system || x.cpu;
      bySystem.set(name, [...(bySystem.get(name) ?? []), x.fps / m]);
    }
  }
  const rel = [...bySystem.values()].filter((v) => v.length >= 3).map(geomean);
  if (!typical) continue;
  const p90 = rel.length >= 5 ? quantile(rel, 0.9) : 1.1;
  const p10 = rel.length >= 5 ? quantile(rel, 0.1) : 0.85;
  out[p.id] = {
    typical: Math.round(typical.raster * 10) / 10,
    top: Math.round(typical.raster * p90 * 10) / 10,
    low: Math.round(typical.raster * p10 * 10) / 10,
    laptops: rel.length,
    rows: typical.rows,
    url: p.url,
  };
  console.log(`  ${p.id.padEnd(11)} typical ${typical.raster.toFixed(1).padStart(5)}  top(p90) ${(typical.raster * p90).toFixed(1).padStart(5)}  low(p10) ${(typical.raster * p10).toFixed(1).padStart(5)}  laptops ${String(rel.length).padStart(3)}  rows ${typical.rows}`);
}

const file = join(root, 'src', 'data', 'laptop-calibration.json');
writeFileSync(file, JSON.stringify({ generated: date, source: 'Notebookcheck GPU benchmark pages', method: 'FPS ratio vs desktop reference cards in identical game/preset/resolution rows, GPU-bound rows only', gpus: out }, null, 2) + '\n');
console.log(`\nWrote ${file}`);
