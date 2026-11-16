import { estimatePowerDraw } from './compatibility';
import { graphicsMemoryGb, type WorkloadResult } from './simulation';
import type { Build, Resolution } from './types';
import { workloadById } from './workloads';

export type LimitPart = 'CPU' | 'GPU' | 'VRAM' | 'RAM' | 'Storage' | 'Power supply';

export interface LimitItem {
  part: LimitPart;
  /** How hard this part is working / how full it is, 0–1 (can exceed 1 when it is too small). */
  load: number;
  label: string;
  /** One line explaining the number (shown under the label). */
  hint?: string;
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
/** GB with at most one decimal: 2.5, 8. */
const gb = (x: number) => String(Math.round(x * 2) / 2);
const storageLoad = { HDD: 1, 'SATA SSD': 0.6, 'NVMe Gen3': 0.35, 'NVMe Gen4': 0.25, 'NVMe Gen5': 0.2 } as const;

/** Which part limits performance for one workload result, and how loaded every part is. */
export function limitReport(build: Build, r: WorkloadResult, _res: Resolution): LimitReport {
  const w = workloadById[r.workload];
  const items: LimitItem[] = [];

  if (r.judged) {
    const p = r.judged;
    const m = p.memory;
    items.push({
      part: 'CPU', load: p.mainThread, label: `Main thread ${pct(p.mainThread)}`,
      hint: build.cpu && `Task Manager would show ~${pct(p.cpuTotal)}: it averages all ${build.cpu.threads} threads, but games wait on the main one.`,
      status: p.limitedBy === 'cpu' ? 'limit' : 'ok',
    });
    const gpuHint = !build.gpu
      ? undefined
      : p.stall === 'vram'
        ? `Waiting on graphics memory: ${gb(m.spillGb)} GB doesn't fit in VRAM and comes from system RAM.`
        : p.stall === 'ram'
          ? 'Waiting while Windows swaps RAM to the drive.'
          : p.limitedBy === 'cpu'
            ? 'Waiting on the CPU for new frames.'
            : undefined;
    items.push({
      part: 'GPU', load: p.gpuBusy, label: build.gpu ? `${pct(p.gpuBusy)} busy` : 'Integrated graphics', hint: gpuHint,
      status: p.limitedBy === 'gpu' ? 'limit' : 'ok',
    });
    if (w.kind === 'gaming' && build.gpu) {
      items.push({
        part: 'VRAM', load: m.vramNeedGb / m.vramGb, label: `${m.vramNeedGb} GB needed of ${m.vramGb} GB`,
        hint: m.spillGb > 0 ? `${gb(m.spillGb)} GB spills into system RAM.` : undefined,
        status: m.vramGb < m.vramNeedGb ? 'over' : 'ok',
      });
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
      const have = graphicsMemoryGb(build);
      items.push({ part: 'VRAM', load: have ? w.vramNeed / have : 2, label: `${w.vramNeed} GB needed of ${have} GB${build.gpu ? '' : ' shared'}`, status: have < w.vramNeed ? 'over' : 'ok' });
    }
  }

  // Capacity checks shared by every workload.
  if (build.ram && r.judged) {
    // Gaming: what actually fills RAM, against the recommended size.
    const m = r.judged.memory;
    const need = w.ramNeedGb;
    const single = build.ram.sticks === 1;
    const parts = [`Windows ${gb(m.windowsGb)}`, `apps ${gb(m.backgroundGb)}`, `game ${gb(m.gameGb)}`];
    if (m.spillGb > 0) parts.push(`${m.shared ? 'graphics' : 'VRAM overflow'} ${gb(m.spillGb)}`);
    const full = m.pressure > 1 ? ' Full: Windows swaps to the drive (stutter).' : m.pressure > 0.9 ? ' Nearly full.' : '';
    items.push({
      part: 'RAM',
      load: m.pressure,
      label: `~${gb(m.usedGb)} GB used of ${build.ram.totalGb} GB${single ? ' · single stick' : ''}`,
      hint: `${parts.join(' + ')} GB.${full}${build.ram.totalGb < need ? ` ${need} GB recommended.` : ''}`,
      status: build.ram.totalGb < need || single || m.pressure > 1 ? 'over' : 'ok',
    });
  } else if (build.ram) {
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
