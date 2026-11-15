/**
 * Pure parsing, name matching and scaling for scripts/import-benchmarks.ts.
 * No Node APIs here, so the unit tests (and the app typecheck) can import it.
 */
import type { Cpu, Gpu } from '../src/engine/types';

export interface Entry { name: string; raw: number; url?: string }
export interface Adapter<M extends string> {
  metric: M;
  dataset: string;
  unit: string;
  /** One or more saved chart pages (e.g. PassMark splits its list by brand). */
  pages: { file: string; url: string }[];
  parse: (html: string) => Entry[];
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const num = (s: string) => Number(s.replace(/,/g, '').match(/[\d.]+/)?.[0] ?? NaN);

/** PassMark /cpu-list/: <a href="/cpu_lookup.php?...">NAME</a></td><td>CPU MARK</td> */
export function parsePassmarkList(html: string): Entry[] {
  return [...html.matchAll(/<a href="\/cpu_lookup\.php[^"]*">([^<]+)<\/a><\/td><td>([\d,]+)<\/td>/g)].map((m) => ({ name: decode(m[1]), raw: num(m[2]) }));
}

/** PassMark singleThread.html: <span class="prdname">NAME</span> ... <span class="count">SCORE</span> */
export function parsePassmarkChart(html: string): Entry[] {
  return [...html.matchAll(/class="prdname">([^<]+)<\/span>.*?class="count">([\d,]+)<\/span>/g)].map((m) => ({ name: decode(m[1]), raw: num(m[2]) }));
}

/** llama.cpp Vulkan scoreboard, first table ("Llama 2 7B, Q4_0, no FA"): Chip | pp512 | tg128. */
export function parseLlamaScoreboard(html: string): Entry[] {
  const start = html.indexOf('Llama 2 7B, Q4_0, no FA');
  if (start < 0) return [];
  const table = html.slice(start, html.indexOf('</table>', start));
  return [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => decode(c[1])))
    .filter((cells) => cells.length >= 3)
    .map((cells) => ({ name: cells[0], raw: num(cells[2]) }));
}

// ---------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------

/** "AMD Ryzen 5 8600G w/ Radeon 760M Graphics" / "Intel Core i7-8700K @ 3.70GHz" -> "amd ryzen 5 8600g" */
export function cpuKey(name: string): string {
  return name.toLowerCase().replace(/\s+(@|w\/|with)\s.*$/, '').replace(/\s+/g, ' ').trim();
}
export const cpuCatalogKey = (c: Cpu) => cpuKey(`${c.brand} ${c.name}`);

/** "Nvidia RTX 5060 Ti" / "GeForce RTX 5060 Ti 16GB" -> "rtx 5060 ti" (memory size dropped). */
export function gpuKey(name: string): string {
  return name.toLowerCase().replace(/\b(nvidia|geforce|amd|radeon|intel)\b/g, '').replace(/\b\d+\s?gb\b/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Map each catalog part to a chart entry. For GPUs the chart rarely names the
 * memory size, so when several catalog variants share a name the result goes only
 * to the variant(s) with the highest memory bandwidth (the reference card).
 */
export function match<P extends { id: string }>(parts: P[], partKey: (p: P) => string, entryKey: (name: string) => string, entries: Entry[], pick?: (group: P[]) => P[]): Map<string, Entry> {
  const byKey = new Map<string, Entry>();
  for (const e of entries) {
    const k = entryKey(e.name);
    if (Number.isFinite(e.raw) && !byKey.has(k)) byKey.set(k, e); // first listing wins
  }
  const groups = new Map<string, P[]>();
  for (const p of parts) groups.set(partKey(p), [...(groups.get(partKey(p)) ?? []), p]);
  const out = new Map<string, Entry>();
  for (const [k, group] of groups) {
    const e = byKey.get(k);
    if (!e) continue;
    for (const p of pick ? pick(group) : group) out.set(p.id, e);
  }
  return out;
}

/**
 * Chart names usually leave out the memory size. Variants with the same memory
 * bandwidth get the same result; where bandwidth differs only the launch model
 * listed here does, and any other split is reported as ambiguous. Cards under
 * 4 GB are skipped: the 3.8 GB test model does not fit on them.
 */
export const gpuReferenceVariant: Record<string, string> = { 'rtx 3060': 'rtx3060-12', 'rtx 3080': 'rtx3080', 'rtx 3050': 'rtx3050' };
/** Names whose memory variants could not be told apart (filled by gpuVariants). */
export const ambiguous: string[] = [];
export function gpuVariants(group: Gpu[]): Gpu[] {
  const fits = group.filter((g) => g.vram >= 4);
  if (new Set(fits.map((g) => g.bandwidth)).size <= 1) return fits;
  const ref = gpuReferenceVariant[gpuKey(group[0].name)];
  if (!ref) ambiguous.push(group.map((g) => g.name).join(' / '));
  return fits.filter((g) => g.id === ref);
}

/** Scale to our index: raw / fastest matched catalog part x 100. */
export function toIndex(raw: number, fastest: number): number {
  const v = (raw / fastest) * 100;
  return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
}
