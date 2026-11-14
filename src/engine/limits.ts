import { estimatePowerDraw } from './compatibility';
import type { WorkloadResult } from './simulation';
import type { Build, Resolution } from './types';
import { workloadById } from './workloads';

export type LimitPart = 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'Storage' | 'Power supply';

export interface LimitItem {
  part: LimitPart;
  /** How hard this part is working / how full it is, 0–1 (can exceed 1 when it is too small). */
  load: number;
  label: string;
  /** 'limit' = this part sets the pace; 'over' = not enough of it; 'ok' = has headroom. */
  status: 'limit' | 'over' | 'ok';
}

export interface LimitReport {
  items: LimitItem[];
  /** The part holding performance back, if any. */
  bottleneck: LimitPart | null;
  /** True when the limiting part is the ideal one (the GPU in a balanced gaming build). */
  ideal: boolean;
  headline: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const storageLoad = { HDD: 1, 'SATA SSD': 0.6, 'NVMe Gen3': 0.35, 'NVMe Gen4': 0.25, 'NVMe Gen5': 0.2 } as const;

/** Which part limits performance for one workload result, and how loaded every part is. */
export function limitReport(build: Build, r: WorkloadResult, res: Resolution): LimitReport {
  const w = workloadById[r.workload];
  const items: LimitItem[] = [];

  if (r.judged) {
    const p = r.judged;
    const cpuLoad = p.cpuFps > 0 ? p.fps / p.cpuFps : 0;
    const gpuLoad = p.gpuFps > 0 ? p.fps / p.gpuFps : 0;
    items.push({ part: 'CPU', load: cpuLoad, label: `${pct(Math.min(cpuLoad, 1))} busy`, status: p.limitedBy === 'cpu' ? 'limit' : 'ok' });
    items.push({ part: 'GPU', load: gpuLoad, label: build.gpu ? `${pct(Math.min(gpuLoad, 1))} busy` : 'Integrated graphics', status: p.limitedBy === 'gpu' ? 'limit' : 'ok' });
    if (w.kind === 'gaming' && build.gpu) {
      const need = w.vramNeed[res];
      items.push({ part: 'VRAM', load: need / build.gpu.vram, label: `${need} GB needed of ${build.gpu.vram} GB`, status: build.gpu.vram < need ? 'over' : 'ok' });
    }
  } else if (r.throughput) {
    const t = r.throughput.timeShare;
    const cpu = (t.cpuSingle ?? 0) + (t.cpuMulti ?? 0);
    const gpu = (t.gpu ?? 0) + (t.gpuBandwidth ?? 0);
    const weakest = r.throughput.weakest;
    const weakPart: LimitPart = weakest === 'ram' ? 'RAM' : weakest === 'storage' ? 'Storage' : weakest.startsWith('gpu') ? 'GPU' : 'CPU';
    const limiting = r.score < 80;
    if (cpu > 0) items.push({ part: 'CPU', load: cpu, label: `${pct(cpu)} of job time`, status: limiting && weakPart === 'CPU' ? 'limit' : 'ok' });
    if (gpu > 0) items.push({ part: 'GPU', load: gpu, label: `${pct(gpu)} of job time`, status: limiting && weakPart === 'GPU' ? 'limit' : 'ok' });
    if (w.kind === 'throughput' && w.vramNeed) {
      const have = build.gpu?.vram ?? 0;
      items.push({ part: 'VRAM', load: have ? w.vramNeed / have : 2, label: `${w.vramNeed} GB needed of ${have} GB`, status: have < w.vramNeed ? 'over' : 'ok' });
    }
  }

  // Capacity checks shared by every workload.
  if (build.ram) {
    const need = w.ramNeedGb;
    const single = build.ram.sticks === 1;
    items.push({
      part: 'RAM',
      load: need / build.ram.totalGb,
      label: `${need} GB needed of ${build.ram.totalGb} GB${single ? ' · single stick' : ''}`,
      status: build.ram.totalGb < need || single ? 'over' : 'ok',
    });
  }
  if (build.storage) {
    const load = storageLoad[build.storage.kind];
    items.push({ part: 'Storage', load, label: build.storage.kind === 'HDD' ? 'Hard drive: slow loading' : `${build.storage.kind}: fast enough`, status: build.storage.kind === 'HDD' ? 'over' : 'ok' });
  }
  if (build.psu) {
    const draw = estimatePowerDraw(build);
    items.push({ part: 'Power supply', load: draw / build.psu.watts, label: `~${draw} W of ${build.psu.watts} W`, status: draw > build.psu.watts * 0.9 ? 'over' : 'ok' });
  }

  // Pick the bottleneck: a part that is too small beats a part that is merely busy.
  const over = items.find((i) => i.status === 'over' && (i.part === 'VRAM' || i.part === 'Power supply' || i.part === 'RAM'));
  const limit = items.find((i) => i.status === 'limit');
  let bottleneck: LimitPart | null = over?.part ?? limit?.part ?? null;
  let ideal = false;
  let headline: string;

  if (over) {
    headline = `${over.part === 'Power supply' ? 'The power supply' : over.part} is too small`;
  } else if (r.judged && limit) {
    const p = r.judged;
    if (!build.gpu) headline = 'Integrated graphics are the bottleneck';
    else if (p.limitedBy === 'cpu' && p.bottleneck >= 0.1) headline = 'The CPU is the bottleneck';
    else if (p.limitedBy === 'gpu' && p.bottleneck > 0.4) headline = 'The GPU is the bottleneck: the CPU has power to spare';
    else {
      ideal = true;
      headline = p.limitedBy === 'gpu' ? 'The GPU sets the pace. That is the ideal balance' : 'CPU and GPU are evenly matched';
    }
  } else if (limit) {
    headline = `The ${limit.part} is the bottleneck`;
  } else {
    bottleneck = null;
    headline = 'No part is holding the others back';
  }
  return { items, bottleneck, ideal, headline };
}
