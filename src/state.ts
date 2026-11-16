import { catalog, isLaptopBuild, slotOrder } from './data';
import type { Build, Device, PartSlot, Resolution, WorkloadId } from './engine/types';
import { workloads } from './engine/workloads';
import { REFRESH_RATES } from './engine/games';
import { storeOf } from './engine/listing';

export interface AppState {
  /** Checking a desktop PC or a laptop. */
  device: Device;
  build: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  /** Monitor refresh rate in Hz. */
  refreshHz: number;
  /** Parts the person picked themselves; the rest were matched automatically. */
  chosen: PartSlot[];
  /** Second build for side-by-side comparison, when comparing. */
  compare?: Build;
  /** The store listing the build was read from (Check a link). */
  listing?: { url: string; store?: string };
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

export const defaultState = (): AppState => ({ device: 'desktop', build: exampleBuild(), workloads: ['aaa'], resolution: '1440p', refreshHz: 144, chosen: [] });

const encodeBuild = (b: Build) =>
  slotOrder
    .map((slot) => (b[slot] ? `${slot}:${b[slot]!.id}` : ''))
    .filter(Boolean)
    .join(',');

function decodeBuild(raw: string): Build {
  const build: Build = {};
  for (const pair of raw.split(',')) {
    const [slot, id] = pair.split(':') as [PartSlot, string];
    const list = catalog[slot] as readonly { id: string }[] | undefined;
    const part = list?.find((p) => p.id === id);
    if (part) (build as Record<string, unknown>)[slot] = part;
  }
  return build;
}

/** Encodes the state into a URL hash so a build (or a comparison) can be shared as a link. */
export function encodeState(s: AppState): string {
  const params = new URLSearchParams({ b: encodeBuild(s.build), w: s.workloads.join(','), r: s.resolution, hz: String(s.refreshHz), c: s.chosen.join(',') });
  if (s.compare) params.set('x', encodeBuild(s.compare));
  if (s.device === 'laptop') params.set('d', 'laptop');
  if (s.listing) params.set('src', s.listing.url);
  return params.toString();
}

export function decodeState(hash: string): AppState | undefined {
  const raw = hash.replace(/^#/, '');
  if (!raw) return undefined;
  const params = new URLSearchParams(raw);
  if (!params.has('b')) return undefined;
  const build = decodeBuild(params.get('b') ?? '');
  const compare = params.has('x') ? decodeBuild(params.get('x') ?? '') : undefined;
  const w = (params.get('w') ?? '').split(',').filter((x): x is WorkloadId => validWorkloads.has(x as WorkloadId));
  const r = params.get('r');
  const resolution: Resolution = r === '1080p' || r === '1440p' || r === '4K' ? r : '1440p';
  const hz = Number(params.get('hz'));
  const chosen = (params.get('c') ?? '').split(',').filter((x): x is PartSlot => slotOrder.includes(x as PartSlot) && !!build[x as PartSlot]);
  // Older links have no device: a laptop part means it's a laptop.
  const device: Device = params.get('d') === 'laptop' || isLaptopBuild(build) ? 'laptop' : 'desktop';
  const src = params.get('src');
  const listing = src && /^https?:\/\//i.test(src) ? { url: src, store: storeOf(src) } : undefined;
  return { device, listing, build, workloads: w.length ? w : ['aaa'], resolution, refreshHz: REFRESH_RATES.includes(hz as never) ? hz : 144, chosen, compare };
}
