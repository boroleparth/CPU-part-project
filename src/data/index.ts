import type { BenchSource, Cpu, CpuMetric, Gpu, GpuMetric, PartSlot } from '../engine/types';
import { cpus as estimatedCpus } from './cpus';
import { gpus as estimatedGpus } from './gpus';
import benchmarks from './benchmarks.json';
import { cases, coolers, motherboards, psus, ramKits, storages } from './parts';

// Sourced benchmark indices (written by scripts/import-benchmarks.ts) override the
// estimates in cpus.ts / gpus.ts. A metric with no source keeps its estimate.
type Overlay<M extends string> = Record<string, Partial<Record<M, number>> & { source?: Partial<Record<M, BenchSource>> }>;

function withSources<P extends { id: string; source?: object }, M extends string>(parts: P[], overlay: Overlay<M>): P[] {
  return parts.map((p) => {
    const o = overlay[p.id];
    return o ? { ...p, ...o, source: { ...p.source, ...o.source } } : p;
  });
}

export const cpus: Cpu[] = withSources(estimatedCpus, benchmarks.cpus as Overlay<CpuMetric>);
export const gpus: Gpu[] = withSources(estimatedGpus, benchmarks.gpus as Overlay<GpuMetric>);

export { cases, coolers, motherboards, psus, ramKits, storages };
export const benchmarkSources = benchmarks.sources;

export const cpuMetricLabels: Record<CpuMetric, string> = { gamingIndex: 'Games', singleIndex: 'Single-core', multiIndex: 'Multi-core' };
export const gpuMetricLabels: Record<GpuMetric, string> = { rasterIndex: 'Raster', rtIndex: 'Ray tracing', aiIndex: 'Local AI' };

export const catalog = {
  cpu: cpus,
  motherboard: motherboards,
  ram: ramKits,
  gpu: gpus,
  storage: storages,
  cooler: coolers,
  psu: psus,
  case: cases,
} as const;

export const slotLabels: Record<PartSlot, string> = {
  cpu: 'Processor (CPU)',
  motherboard: 'Motherboard',
  ram: 'Memory (RAM)',
  gpu: 'Graphics card (GPU)',
  storage: 'Storage',
  cooler: 'CPU cooler',
  psu: 'Power supply',
  case: 'Case',
};

export const slotOrder: PartSlot[] = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'cooler', 'psu', 'case'];

/** Older generations: kept for checking existing / used builds, but not recommended as new purchases. */
const legacyCpuGenerations = ['Zen', 'Zen+', 'Zen+ APU', 'Zen 2', 'Zen 2 APU', 'Coffee Lake', 'Coffee Lake Refresh', 'Comet Lake', 'Rocket Lake'];
export const isLegacyCpu = (c: { generation: string }) => legacyCpuGenerations.includes(c.generation);
export const isLegacyGpu = (g: { name: string }) => /GTX|GT 1030|RTX 20|RX 5\d{3}|RX [45]\d0\b|Vega|Radeon VII/.test(g.name);
