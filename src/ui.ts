// Presentation helpers: tiers, brands and sort metrics shared by the UI.
import type { Build, Case, Cooler, Cpu, Gpu, Motherboard, PartSlot, Psu, RamKit, Storage } from './engine/types';

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
      if (['A620', 'H610', 'B450'].includes(chip)) return 1;
      if (['B550', 'B650', 'B760', 'B860'].includes(chip)) return 2;
      if (['X570', 'B850', 'Z790'].includes(chip)) return 3;
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
