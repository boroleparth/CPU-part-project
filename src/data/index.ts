import type { PartSlot } from '../engine/types';
import { cpus } from './cpus';
import { gpus } from './gpus';
import { cases, coolers, motherboards, psus, ramKits, storages } from './parts';

export { cpus, gpus, cases, coolers, motherboards, psus, ramKits, storages };

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
