// Presentation helpers: tiers, brands and sort metrics shared by the UI.
import { cpuMetricLabels, gpuMetricLabels } from './data';
import type { BenchSource, Build, Case, Cooler, Cpu, Gpu, Motherboard, PartSlot, Psu, RamKit, Storage } from './engine/types';

export type AnyPart = NonNullable<Build[PartSlot]>;
export type TierLevel = 1 | 2 | 3 | 4;
export const tierNames: Record<TierLevel, string> = { 1: 'Entry', 2: 'Mainstream', 3: 'High-end', 4: 'Flagship' };

export type BrandKey = 'amd' | 'intel' | 'nvidia';
export const brandNames: Record<BrandKey, string> = { amd: 'AMD', intel: 'Intel', nvidia: 'NVIDIA' };

const band = (v: number, cuts: [number, number, number]): TierLevel => (v >= cuts[2] ? 4 : v >= cuts[1] ? 3 : v >= cuts[0] ? 2 : 1);

/** Overall CPU strength used for tiers and sorting (gaming weighted over multi-core). */
export const cpuScore = (c: Cpu) => c.gamingIndex * 0.6 + c.multiIndex * 0.4;

/** Product class of a part, for the tier badge. Undefined for parts where tiers don't mean much. */
export function tierOf(slot: PartSlot, part: AnyPart): TierLevel | undefined {
  switch (slot) {
    case 'cpu':
      return band(cpuScore(part as Cpu), [45, 60, 80]);
    case 'gpu':
      return band((part as Gpu).rasterIndex, [30, 50, 75]);
    case 'motherboard': {
      const chip = (part as Motherboard).chipset;
      if (['A620', 'H610', 'B450', 'A520', 'H510', 'H310'].includes(chip)) return 1;
      if (['B550', 'B650', 'B760', 'B860', 'B560', 'X470', 'B365'].includes(chip)) return 2;
      if (['X570', 'B850', 'Z790', 'Z590', 'Z390'].includes(chip)) return 3;
      return 4;
    }
    default:
      return undefined;
  }
}

export function brandOf(slot: PartSlot, part: AnyPart): BrandKey | undefined {
  if (slot === 'cpu') return (part as Cpu).brand === 'AMD' ? 'amd' : 'intel';
  if (slot === 'gpu') {
    const b = (part as Gpu).brand;
    return b === 'NVIDIA' ? 'nvidia' : b === 'AMD' ? 'amd' : 'intel';
  }
  if (slot === 'motherboard') return (part as Motherboard).socket.startsWith('AM') ? 'amd' : 'intel';
  return undefined;
}

const storageRank = { HDD: 1, 'SATA SSD': 2, 'NVMe Gen3': 3, 'NVMe Gen4': 4, 'NVMe Gen5': 5 } as const;

/** A single "how much part is this" number per slot, used for sorting and the strength bar. */
export function strengthOf(slot: PartSlot, part: AnyPart): number {
  switch (slot) {
    case 'cpu': return cpuScore(part as Cpu);
    case 'gpu': return (part as Gpu).rasterIndex;
    case 'motherboard': return (part as Motherboard).vrmWatts;
    case 'ram': return (part as RamKit).totalGb * 100 + (part as RamKit).speed / 100;
    case 'storage': return storageRank[(part as Storage).kind] * 10000 + (part as Storage).capacityGb;
    case 'cooler': return (part as Cooler).ratedWatts;
    case 'psu': return (part as Psu).watts;
    case 'case': return (part as Case).maxGpuMm;
  }
}

/** Very short spec line for a part (one glance, not a datasheet). */
export function partSummary(slot: PartSlot, part: AnyPart): string {
  switch (slot) {
    case 'cpu': { const c = part as Cpu; return `${c.cores} cores · ${c.socket}`; }
    case 'gpu': { const g = part as Gpu; return `${g.vram} GB VRAM`; }
    case 'motherboard': { const m = part as Motherboard; return `${m.socket} · ${m.formFactor} · ${m.memType}`; }
    case 'ram': { const r = part as RamKit; return `${r.type} · ${r.speed} MT/s`; }
    case 'storage': { const s = part as Storage; return `${s.kind} · ${s.capacityGb >= 1000 ? `${s.capacityGb / 1000} TB` : `${s.capacityGb} GB`}`; }
    case 'cooler': return `Handles ~${(part as Cooler).ratedWatts} W`;
    case 'psu': return (part as Psu).efficiency;
    case 'case': return `Fits ${(part as Case).supports.join(' / ')}`;
  }
}

/** Generation / series a CPU or GPU belongs to, for grouping in lists (newest first). */
const cpuSeries: [string, string][] = [
  ['Zen 5', 'Ryzen 9000'],
  ['Arrow Lake', 'Core Ultra 200S'],
  ['Zen 4 APU', 'Ryzen 8000'],
  ['Zen 4', 'Ryzen 7000'],
  ['Raptor Lake Refresh', 'Core 14th gen'],
  ['Raptor Lake', 'Core 13th gen'],
  ['Alder Lake', 'Core 12th gen'],
  ['Zen 3', 'Ryzen 5000'],
  ['Zen 3 (APU die)', 'Ryzen 5000'],
  ['Zen 3 APU', 'Ryzen 5000G'],
  ['Rocket Lake', 'Core 11th gen'],
  ['Comet Lake', 'Core 10th gen'],
  ['Zen 2 APU', 'Ryzen 4000'],
  ['Zen 2', 'Ryzen 3000'],
  ['Coffee Lake Refresh', 'Core 9th gen'],
  ['Zen+', 'Ryzen 2000'],
  ['Zen+ APU', 'Ryzen 2000G / 3000G'],
  ['Coffee Lake', 'Core 8th gen'],
  ['Zen', 'Ryzen 1000'],
];
const gpuSeries: [RegExp, string][] = [
  [/RTX 50/, 'GeForce RTX 50 series'],
  [/RX 9\d{3}/, 'Radeon RX 9000 series'],
  [/Arc B/, 'Intel Arc B series'],
  [/RTX 40/, 'GeForce RTX 40 series'],
  [/RX 7\d{3}/, 'Radeon RX 7000 series'],
  [/RTX 30/, 'GeForce RTX 30 series'],
  [/RX 6\d{3}/, 'Radeon RX 6000 series'],
  [/Arc A/, 'Intel Arc A series'],
  [/RTX 20/, 'GeForce RTX 20 series'],
  [/GTX 16/, 'GeForce GTX 16 series'],
  [/RX 5\d{3}/, 'Radeon RX 5000 series'],
  [/Radeon VII|Vega/, 'Radeon Vega / VII'],
  [/GTX 10|GT 1030/, 'GeForce GTX 10 series'],
  [/RX [45]\d0\b/, 'Radeon RX 400 / 500 series'],
];
const cpuSeriesOrder = [...new Set(cpuSeries.map(([, s]) => s))];
const gpuSeriesOrder = gpuSeries.map(([, s]) => s);

export function seriesOf(slot: PartSlot, part: AnyPart): string | undefined {
  if (slot === 'cpu') return cpuSeries.find(([g]) => g === (part as Cpu).generation)?.[1] ?? (part as Cpu).generation;
  if (slot === 'gpu') return gpuSeries.find(([re]) => re.test(part.name))?.[1] ?? 'Other';
  return undefined;
}

/** Sort position of a series (lower = newer). */
export function seriesRank(slot: PartSlot, series: string): number {
  const order = slot === 'cpu' ? cpuSeriesOrder : gpuSeriesOrder;
  const i = order.indexOf(series);
  return i < 0 ? order.length : i;
}

/** Benchmark scores on the shared scale (fastest model = 100), for showing next to a part. */
export function benchLine(slot: PartSlot, part: AnyPart): string | undefined {
  if (slot === 'cpu') {
    const c = part as Cpu;
    return `Games ${c.gamingIndex} · Single-core ${c.singleIndex ?? c.gamingIndex} · Multi-core ${c.multiIndex}`;
  }
  if (slot === 'gpu') {
    const g = part as Gpu;
    return `Raster ${g.rasterIndex} · Ray tracing ${g.rtIndex}${g.aiIndex !== undefined ? ` · Local AI ${g.aiIndex}` : ''}`;
  }
  return undefined;
}

export interface SourceGroup {
  /** Publisher, e.g. "PassMark" or "llama.cpp". */
  publisher: string;
  date: string;
  /** One "Verify" link per metric from this publisher. */
  links: { label: string; url: string; title: string }[];
}

/** Where a CPU's or GPU's numbers come from: named sources, plus the metrics that are still estimates. */
export function provenance(slot: PartSlot, part: AnyPart): { sourced: SourceGroup[]; estimated: string[] } | undefined {
  if (slot !== 'cpu' && slot !== 'gpu') return undefined;
  const labels: Record<string, string> = slot === 'cpu' ? cpuMetricLabels : gpuMetricLabels;
  const sources = ((part as Cpu | Gpu).source ?? {}) as Record<string, BenchSource | undefined>;
  const groups = new Map<string, SourceGroup>();
  const estimated: string[] = [];
  for (const [metric, label] of Object.entries(labels)) {
    const s = sources[metric];
    if (!s) {
      estimated.push(label);
      continue;
    }
    const publisher = s.dataset.split(' ')[0];
    const g = groups.get(publisher) ?? { publisher, date: s.date, links: [] };
    g.links.push({ label, url: s.url, title: `${s.dataset}: ${s.raw.toLocaleString('en-US')} ${s.unit ?? ''}`.trim() });
    groups.set(publisher, g);
  }
  return { sourced: [...groups.values()], estimated };
}

/** "2026-11-15" -> "15 Nov 2026" */
export function formatSourceDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
}
