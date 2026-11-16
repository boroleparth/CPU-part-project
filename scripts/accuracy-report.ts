/**
 * How close is the model to real, measured laptops? Uses the saved Notebookcheck pages.
 *
 *   npm run bench:accuracy            # newest data/sources/<date>/notebookcheck/
 *
 * 1. Relative accuracy of laptop GPUs: in each game / preset / resolution, are the chips'
 *    speeds right relative to each other? (Scene differences between sources cancel out.)
 * 2. Out-of-sample check: the calibration method fitted on half the games, judged on the
 *    other half, next to this branch's data judged on the same games. Identical on every
 *    branch, so it is the fair way to compare estimates with calibration.
 * 3. Absolute FPS per game at our presets (game profiles vs Notebookcheck's scenes).
 * 4. Desktop cross-check: our desktop indices vs Notebookcheck's desktop measurements.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { gpus, laptopCpus, laptopGpus } from '../src/data';
import { games } from '../src/data/games';
import { completeBuild } from '../src/engine/builder';
import { fittedSettings } from '../src/engine/settings';
import { simulateGame } from '../src/engine/games';
import {
  fitRaster, median, nbcGames, parseNotebookcheckGpuPage, relativeErrors, rowMedians, summarise, type ChipError, type NbcRow,
} from './notebookcheck-lib';
import { nbcPages } from './notebookcheck-pages';

const root = join(import.meta.dirname, '..');
const sourcesDir = join(root, 'data', 'sources');
const date = process.argv[2] ?? readdirSync(sourcesDir).filter((d) => existsSync(join(sourcesDir, d, 'notebookcheck'))).sort().at(-1);
if (!date) throw new Error('No data/sources/<date>/notebookcheck/ folder (npm run bench:laptops:fetch)');
const dir = join(sourcesDir, date, 'notebookcheck');
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%`;
const abs = (x: number) => `${(x * 100).toFixed(1)}%`;

const pages = new Map<string, NbcRow[]>();
for (const p of nbcPages) {
  const f = join(dir, `${p.id}.html.gz`);
  if (existsSync(f)) pages.set(p.id, parseNotebookcheckGpuPage(gunzipSync(readFileSync(f)).toString('utf8')));
}
const laptopIds = nbcPages.filter((p) => p.kind === 'laptop' && pages.has(p.id)).map((p) => p.id);
const desktopIds = nbcPages.filter((p) => p.kind === 'desktop' && pages.has(p.id)).map((p) => p.id);
const family = (id: string) => id.replace(/-\d+$/, '');
/** This branch's speed for each laptop chip: its typical power version. */
const predicted: Record<string, number> = Object.fromEntries(laptopGpus.filter((g) => g.typical).map((g) => [family(g.id), g.rasterIndex]));
const desktopRaster: Record<string, number> = Object.fromEntries(gpus.map((g) => [g.id, g.rasterIndex]));

const measuredFor = (ids: string[], keep?: (r: NbcRow) => boolean) => new Map(ids.map((id) => [id, rowMedians(pages.get(id)!, keep)]));

function chipTable(errors: Map<string, ChipError>) {
  console.log('| Chip | Rows | Avg error | Model rates it |\n|---|---|---|---|');
  for (const id of laptopIds) {
    const e = errors.get(id);
    if (e) console.log(`| ${id} | ${e.rows} | ${abs(e.meanAbs)} | ${Math.abs(e.bias) < 0.03 ? 'about right' : `${pct(e.bias)} ${e.bias > 0 ? 'too fast' : 'too slow'}`} |`);
  }
}

console.log(`# Accuracy report (Notebookcheck pages from ${date})\n`);

// 1. Relative accuracy on all rows -------------------------------------------------------
const all = relativeErrors(measuredFor(laptopIds), predicted);
const s1 = summarise(all);
console.log(`## 1. Laptop GPUs, relative accuracy (all games)\n`);
console.log(`**Average error ${abs(s1.meanAbs)}** over ${s1.rows} measurements of ${s1.chips} chips; median chip bias ${abs(s1.medianBias)}; worst: ${s1.worst[0]} (${pct(s1.worst[1].bias)}).\n`);
chipTable(all);

// 2. Out-of-sample: fit on half the games, test on the other half -------------------------
const gameNames = [...new Set(laptopIds.flatMap((id) => pages.get(id)!.map((r) => r.game)))].sort();
const fold = (g: string) => gameNames.indexOf(g) % 2;
let methodLog = 0;
let branchLog = 0;
let rows = 0;
for (const f of [0, 1]) {
  const train = (r: NbcRow) => fold(r.game) !== f;
  const test = (r: NbcRow) => fold(r.game) === f;
  const desktops = desktopIds.filter((id) => desktopRaster[id]).map((id) => ({ raster: desktopRaster[id], fps: rowMedians(pages.get(id)!, train) }));
  const fitted: Record<string, number> = {};
  for (const id of laptopIds) {
    const r = fitRaster(rowMedians(pages.get(id)!, train), desktops);
    if (r) fitted[id] = r.raster;
  }
  const measured = measuredFor(laptopIds, test);
  const m = summarise(relativeErrors(measured, fitted));
  const b = summarise(relativeErrors(measured, predicted));
  methodLog += m.meanAbs * m.rows;
  branchLog += b.meanAbs * b.rows;
  rows += m.rows;
}
console.log(`\n## 2. Out-of-sample check (fit on half the games, judge on the other half)\n`);
console.log(`| | Avg error on unseen games |\n|---|---|`);
console.log(`| Calibration method (refitted here, never saw these games) | ${abs(methodLog / rows)} |`);
console.log(`| This branch's laptop GPU data | ${abs(branchLog / rows)} |`);
console.log(`\nIf this branch's data was fitted on all games, its row here is partly in-sample; the first row is the fair estimate of its real accuracy.`);

// 3. Absolute FPS per game at our presets -------------------------------------------------
const cpuByName = new Map(laptopCpus.map((c) => [c.name.toLowerCase(), c]));
const matchCpu = (nbc: string) => cpuByName.get(nbc.replace(/^Intel\s+/i, '').replace(/\s+[\d.]+\s*GHz.*$/i, '').trim().toLowerCase());
console.log(`\n## 3. Absolute FPS per game, 1080p at our preset (laptops with a CPU we know)\n`);
console.log('| Game | Our preset | Measurements | Measured ÷ model (median) |\n|---|---|---|---|');
for (const [gid, m] of Object.entries(nbcGames)) {
  const game = games.find((g) => g.id === gid);
  if (!game) continue;
  const ratios: number[] = [];
  for (const id of laptopIds) {
    const gpu = laptopGpus.find((g) => g.typical && family(g.id) === id);
    const row = m.names.map((n) => pages.get(id)!.find((r) => r.game === n && r.preset === m.preset && r.resolution === '1920x1080')).find(Boolean);
    if (!gpu || !row) continue;
    for (const x of row.results) {
      const cpu = matchCpu(x.cpu);
      if (!cpu) continue;
      ratios.push(x.fps / simulateGame(completeBuild({ cpu, gpu }), game, '1080p', 144, fittedSettings(game)).fps);
    }
  }
  if (ratios.length) console.log(`| ${game.name} | ${m.preset} | ${ratios.length} | ${median(ratios).toFixed(2)}× |`);
}
console.log(`\n1.00× = the model matches Notebookcheck's scene; above 1 = their scene runs faster than our profile.`);

// 4. Desktop cross-check ---------------------------------------------------------------------
const desk = relativeErrors(new Map(desktopIds.map((id) => [id, rowMedians(pages.get(id)!)])), desktopRaster);
const s4 = summarise(desk);
console.log(`\n## 4. Desktop cards, relative accuracy\n`);
console.log(`**Average error ${abs(s4.meanAbs)}** over ${s4.rows} measurements of ${s4.chips} cards.\n`);
console.log('| Card | Rows | Avg error | Model rates it |\n|---|---|---|---|');
for (const [id, e] of [...desk.entries()].sort((a, b) => Math.abs(b[1].bias) - Math.abs(a[1].bias))) {
  console.log(`| ${id} | ${e.rows} | ${abs(e.meanAbs)} | ${Math.abs(e.bias) < 0.03 ? 'about right' : `${pct(e.bias)} ${e.bias > 0 ? 'too fast' : 'too slow'}`} |`);
}
