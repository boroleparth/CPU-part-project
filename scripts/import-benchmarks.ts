/**
 * Import benchmark indices from saved public chart pages.
 *
 *   npm run bench:import            # uses the newest folder in data/sources/
 *   npm run bench:import 2026-11-15 # or a specific date folder
 *
 * Reads the raw pages in data/sources/<date>/, matches each chart entry to our
 * catalog by name, scales it so the fastest matched catalog part = 100, and writes
 * src/data/benchmarks.json. Parts or metrics with no match keep the estimates in
 * src/data/cpus.ts / gpus.ts and show as "Estimated" in the UI.
 *
 * Pages (save each at the file name below; never per-part pages):
 *   passmark-cpu-list-amd.html    https://www.cpubenchmark.net/cpu-list/amd       -> multiIndex
 *   passmark-cpu-list-intel.html  https://www.cpubenchmark.net/cpu-list/          -> multiIndex
 *   passmark-single-thread.html   https://www.cpubenchmark.net/singleThread.html  -> singleIndex
 *   llamacpp-vulkan-discussion-10879.html
 *                                 https://github.com/ggml-org/llama.cpp/discussions/10879 -> aiIndex
 * Not yet wired up (TechPowerUp blocks automated fetching; save from a browser):
 *   gamingIndex, rasterIndex, rtIndex from TechPowerUp relative-performance charts.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cpus } from '../src/data/cpus';
import { gpus } from '../src/data/gpus';
import { laptopCpus } from '../src/data/laptops';
import type { BenchSource, CpuMetric, GpuMetric } from '../src/engine/types';
import {
  ambiguous, cpuCatalogKey, cpuKey, gpuKey, gpuVariants, match, parseLlamaScoreboard, parsePassmarkChart, parsePassmarkList, toIndex,
  type Adapter,
} from './benchmarks-lib';

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const cpuAdapters: Adapter<CpuMetric>[] = [
  {
    metric: 'multiIndex',
    dataset: 'PassMark CPU Mark',
    unit: 'points',
    pages: [
      { file: 'passmark-cpu-list-amd.html', url: 'https://www.cpubenchmark.net/cpu-list/amd' },
      { file: 'passmark-cpu-list-intel.html', url: 'https://www.cpubenchmark.net/cpu-list/' },
    ],
    parse: parsePassmarkList,
  },
  { metric: 'singleIndex', dataset: 'PassMark single-thread', unit: 'points', pages: [{ file: 'passmark-single-thread.html', url: 'https://www.cpubenchmark.net/singleThread.html' }], parse: parsePassmarkChart },
];
const gpuAdapters: Adapter<GpuMetric>[] = [
  {
    metric: 'aiIndex',
    dataset: 'llama.cpp Vulkan scoreboard (Llama 2 7B Q4_0, tg128)',
    unit: 'tokens/s',
    pages: [{ file: 'llamacpp-vulkan-discussion-10879.html', url: 'https://github.com/ggml-org/llama.cpp/discussions/10879' }],
    parse: parseLlamaScoreboard,
  },
];

type Out<M extends string> = Record<string, Partial<Record<M, number>> & { source: Partial<Record<M, BenchSource>> }>;

function run<P extends { id: string; name: string }, M extends string>(
  label: string,
  parts: P[],
  key: (p: P) => string,
  entryKey: (name: string) => string,
  adapters: Adapter<M>[],
  dir: string,
  date: string,
  out: Out<M>,
  sources: object[],
  pick?: (group: P[]) => P[],
) {
  for (const a of adapters) {
    const missingFiles = a.pages.filter((pg) => !existsSync(join(dir, pg.file)));
    if (missingFiles.length) {
      console.log(`\n[${label}] ${a.metric}: ${missingFiles.map((pg) => pg.file).join(', ')} not found, skipped (values stay estimated)`);
      continue;
    }
    const entries = a.pages.flatMap((pg) => a.parse(readFileSync(join(dir, pg.file), 'utf8')).map((e) => ({ ...e, url: pg.url })));
    const matched = match(parts, key, entryKey, entries, pick);
    const fastest = Math.max(...[...matched.values()].map((e) => e.raw));
    const fastestPart = parts.find((p) => matched.get(p.id)?.raw === fastest);
    for (const p of parts) {
      const e = matched.get(p.id);
      if (!e) continue;
      const row = (out[p.id] ??= { source: {} } as Out<M>[string]);
      (row as Record<string, number>)[a.metric] = toIndex(e.raw, fastest);
      row.source[a.metric] = { dataset: a.dataset, url: e.url!, date, raw: e.raw, unit: a.unit };
    }
    sources.push({ metric: a.metric, dataset: a.dataset, date, pages: a.pages.map((pg) => ({ url: pg.url, file: `data/sources/${date}/${pg.file}` })), entries: entries.length, matched: matched.size, fastest: fastestPart?.name });
    const missing = parts.filter((p) => !matched.has(p.id));
    console.log(`\n[${label}] ${a.metric} <- ${a.dataset}: ${entries.length} chart entries, matched ${matched.size}/${parts.length}, 100 = ${fastestPart?.name} (${fastest} ${a.unit})`);
    if (missing.length) console.log(`  Not matched (${missing.length}): ${missing.map((p) => p.name).join(', ')}`);
  }
}

function main() {
  const root = join(import.meta.dirname, '..');
  const sourcesDir = join(root, 'data', 'sources');
  const date = process.argv[2] ?? readdirSync(sourcesDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1);
  if (!date) throw new Error('No dated folder in data/sources/');
  const dir = join(sourcesDir, date);
  console.log(`Reading ${dir}`);

  const sources: object[] = [];
  const cpuOut: Out<CpuMetric> = {};
  const gpuOut: Out<GpuMetric> = {};
  // Laptop CPUs are in the same PassMark lists; laptop GPUs vary with power, so they stay estimated.
  run('CPU', [...cpus, ...laptopCpus], cpuCatalogKey, cpuKey, cpuAdapters, dir, date, cpuOut, sources);
  run('GPU', gpus, (g) => gpuKey(g.name), gpuKey, gpuAdapters, dir, date, gpuOut, sources, gpuVariants);
  if (ambiguous.length) console.log(`\n[GPU] Ambiguous memory variants, left estimated: ${ambiguous.join('; ')}`);

  // Unmeasured GPUs get an estimated aiIndex from memory bandwidth, calibrated on the
  // measured cards (median tokens/s per GB/s), so both sit on the same scale. No source = "Estimated".
  const measured = gpus.filter((g) => gpuOut[g.id]?.source.aiIndex);
  if (measured.length) {
    const perGBs = measured.map((g) => gpuOut[g.id].source.aiIndex!.raw / g.bandwidth).sort((x, y) => x - y)[measured.length >> 1];
    const fastest = Math.max(...measured.map((g) => gpuOut[g.id].source.aiIndex!.raw));
    for (const g of gpus) if (!gpuOut[g.id]?.source.aiIndex) (gpuOut[g.id] ??= { source: {} }).aiIndex = toIndex(Math.min(g.bandwidth * perGBs, fastest), fastest);
    console.log(`\n[GPU] aiIndex estimate for unmeasured cards: ${perGBs.toFixed(3)} tokens/s per GB/s (median of ${measured.length} measured)`);
  }

  const file = join(root, 'src', 'data', 'benchmarks.json');
  writeFileSync(file, JSON.stringify({ generated: date, sources, cpus: cpuOut, gpus: gpuOut }, null, 2) + '\n');
  const sourced = (o: Record<string, { source: object }>) => Object.values(o).filter((r) => Object.keys(r.source).length).length;
  console.log(`\nWrote ${file}: ${sourced(cpuOut)} CPUs and ${sourced(gpuOut)} GPUs with at least one source.`);
}

main();
