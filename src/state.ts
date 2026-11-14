import { catalog, slotOrder } from './data';
import type { Build, PartSlot, Resolution, WorkloadId } from './engine/types';
import { workloads } from './engine/workloads';
import { REFRESH_RATES } from './engine/games';

export interface AppState {
  build: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  /** Monitor refresh rate in Hz. */
  refreshHz: number;
  /** Parts the person picked themselves; the rest were matched automatically. */
  chosen: PartSlot[];
}

const validWorkloads = new Set(workloads.map((w) => w.id));

export const exampleBuild = (): Build => ({
  cpu: catalog.cpu.find((p) => p.id === 'r5-7600'),
  motherboard: catalog.motherboard.find((p) => p.id === 'am5-b650-atx'),
  ram: catalog.ram.find((p) => p.id === 'ddr5-2x16-6000'),
  gpu: catalog.gpu.find((p) => p.id === 'rtx4070s'),
  storage: catalog.storage.find((p) => p.id === 'nvme4-1tb'),
  cooler: catalog.cooler.find((p) => p.id === 'tower-single'),
  psu: catalog.psu.find((p) => p.id === 'psu-750'),
  case: catalog.case.find((p) => p.id === 'case-mid'),
});

export const defaultState = (): AppState => ({ build: exampleBuild(), workloads: ['aaa'], resolution: '1440p', refreshHz: 144, chosen: [] });

/** Encodes the state into a URL hash so a build can be shared as a link. */
export function encodeState(s: AppState): string {
  const parts = slotOrder
    .map((slot) => (s.build[slot] ? `${slot}:${s.build[slot]!.id}` : ''))
    .filter(Boolean)
    .join(',');
  const params = new URLSearchParams({ b: parts, w: s.workloads.join(','), r: s.resolution, hz: String(s.refreshHz), c: s.chosen.join(',') });
  return params.toString();
}

export function decodeState(hash: string): AppState | undefined {
  const raw = hash.replace(/^#/, '');
  if (!raw) return undefined;
  const params = new URLSearchParams(raw);
  if (!params.has('b')) return undefined;
  const build: Build = {};
  for (const pair of (params.get('b') ?? '').split(',')) {
    const [slot, id] = pair.split(':') as [PartSlot, string];
    const list = catalog[slot] as readonly { id: string }[] | undefined;
    const part = list?.find((p) => p.id === id);
    if (part) (build as Record<string, unknown>)[slot] = part;
  }
  const w = (params.get('w') ?? '').split(',').filter((x): x is WorkloadId => validWorkloads.has(x as WorkloadId));
  const r = params.get('r');
  const resolution: Resolution = r === '1080p' || r === '1440p' || r === '4K' ? r : '1440p';
  const hz = Number(params.get('hz'));
  const chosen = (params.get('c') ?? '').split(',').filter((x): x is PartSlot => slotOrder.includes(x as PartSlot) && !!build[x as PartSlot]);
  return { build, workloads: w.length ? w : ['aaa'], resolution, refreshHz: REFRESH_RATES.includes(hz as never) ? hz : 144, chosen };
}
