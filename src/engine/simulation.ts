import { effectiveRamSpeed } from './compatibility';
import type { Build, Cpu, Gpu, Resolution, StorageKind, WorkloadId } from './types';
import { type Component, type GamingWorkload, type ThroughputWorkload, workloadById } from './workloads';

export const RESOLUTIONS: Resolution[] = ['1080p', '1440p', '4K'];

/** How sharply two frame-rate ceilings combine. Higher = closer to a hard min(). */
const SOFT_MIN_P = 8;

export function softMin(a: number, b: number, p = SOFT_MIN_P): number {
  if (a <= 0 || b <= 0) return 0;
  return Math.pow(Math.pow(a, -p) + Math.pow(b, -p), -1 / p);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Component factors
// ---------------------------------------------------------------------------

/** Integrated graphics expressed on the discrete-GPU raster scale. */
export function igpuIndex(cpu?: Cpu): number {
  if (!cpu?.hasIgpu) return 0;
  return cpu.generation.includes('APU') ? 9 : 3;
}

/**
 * Multiplier on CPU-bound performance from memory configuration:
 * channel count, capacity and speed. Large-cache (X3D) CPUs care much less
 * about speed.
 */
export function ramFactor(build: Build, needGb = 16): { factor: number; notes: string[] } {
  const { ram, cpu } = build;
  const notes: string[] = [];
  if (!ram) return { factor: 0.85, notes: ['No RAM selected — assuming a basic 16 GB kit.'] };
  let f = 1;
  if (ram.sticks === 1) {
    f *= cpu?.bigCache ? 0.92 : 0.85;
    notes.push('Single stick = single-channel memory, which halves memory bandwidth. Use 2 sticks.');
  }
  if (ram.totalGb < needGb) {
    const shortage = ram.totalGb / needGb;
    f *= shortage <= 0.25 ? 0.6 : shortage <= 0.5 ? 0.82 : 0.95;
    notes.push(`${ram.totalGb} GB is below the ~${needGb} GB this workload wants, which leads to stutter or swapping.`);
  }
  const speed = effectiveRamSpeed(build) ?? ram.speed;
  const reference = ram.type === 'DDR5' ? 6000 : 3600;
  const exponent = cpu?.bigCache ? 0.08 : 0.25;
  f *= clamp(Math.pow(speed / reference, exponent), 0.88, 1.04);
  return { factor: f, notes };
}

/** Penalty for x8 GPUs on PCIe 3.0 platforms (worse when VRAM is small). */
export function pcieFactor(build: Build): number {
  const { gpu, cpu, motherboard } = build;
  if (!gpu) return 1;
  const gen = Math.min(cpu?.pcieGen ?? 5, motherboard?.pcieGen ?? 5, gpu.pcieGen);
  if (gen >= 4 || gpu.pcieLanes === 16) return 1;
  return gpu.vram <= 8 ? 0.88 : 0.94;
}

const storageScore: Record<StorageKind, number> = {
  HDD: 0.15, 'SATA SSD': 0.45, 'NVMe Gen3': 0.75, 'NVMe Gen4': 0.95, 'NVMe Gen5': 1,
};

function gpuIndexFor(gpu: Gpu | undefined, build: Build, metric: 'raster' | 'rt'): number {
  if (!gpu) return metric === 'rt' ? igpuIndex(build.cpu) * 0.4 : igpuIndex(build.cpu);
  return metric === 'rt' ? gpu.rtIndex : gpu.rasterIndex;
}

function vramFactor(vram: number, need: number): number {
  if (vram >= need) return 1;
  const ratio = vram / need;
  return ratio >= 0.75 ? 0.88 : ratio >= 0.5 ? 0.72 : 0.5;
}

/** CPU frame-rate penalty from encoding/background work while streaming. */
function streamingCpuFactor(cpu: Cpu): number {
  if (cpu.cores >= 12) return 0.97;
  if (cpu.cores >= 8) return 0.93;
  if (cpu.cores >= 6) return 0.85;
  return 0.72;
}

/**
 * Minimum sensible CPU gamingIndex for a GPU. Average FPS can look fine with a
 * weak CPU at 4K, but 1% lows, shader compilation and future games suffer, so
 * pairing a low-end CPU with a flagship GPU is still a poor buy.
 */
export function minCpuIndexForGpu(gpu: Gpu): number {
  return 38 + gpu.rasterIndex * 0.42;
}

// ---------------------------------------------------------------------------
// Gaming (frame-rate) simulation
// ---------------------------------------------------------------------------

export interface FpsPoint {
  resolution: Resolution;
  cpuFps: number;
  gpuFps: number;
  fps: number;
  limitedBy: 'cpu' | 'gpu';
  /** How much of the faster part's capability is unused, 0–1. */
  bottleneck: number;
}

export function simulateFps(build: Build, w: GamingWorkload, res: Resolution): FpsPoint {
  const { cpu, gpu } = build;
  const ram = ramFactor(build, w.ramNeedGb).factor;
  let cpuFps = cpu ? cpu.gamingIndex * w.cpuFpsPerPoint * ram : 0;
  if (cpu && w.cpuOverhead) cpuFps *= streamingCpuFactor(cpu);

  const vram = gpu ? gpu.vram : 2;
  let gpuFps = gpuIndexFor(gpu, build, w.gpuMetric) * w.gpuFpsPerPoint * w.resolutionScale[res];
  gpuFps *= vramFactor(vram, w.vramNeed[res]) * pcieFactor(build);

  const fps = softMin(cpuFps, gpuFps);
  const limitedBy = cpuFps < gpuFps ? 'cpu' : 'gpu';
  const lo = Math.min(cpuFps, gpuFps);
  const hi = Math.max(cpuFps, gpuFps);
  return { resolution: res, cpuFps, gpuFps, fps, limitedBy, bottleneck: hi > 0 ? 1 - lo / hi : 0 };
}

/**
 * Balance score for a frame-rate workload. Being GPU-limited with the CPU a
 * little faster is the ideal state: you get everything you paid for in the GPU
 * and the CPU still has headroom for heavy scenes.
 */
export function gamingBalanceScore(p: FpsPoint): number {
  if (p.cpuFps <= 0 || p.gpuFps <= 0) return 0;
  const r = p.gpuFps / p.cpuFps;
  if (r > 1) return clamp(100 - (1 - 1 / r) * 200, 0, 100); // CPU-bound: GPU wasted
  if (r >= 0.6) return 100;
  return clamp(100 - (0.6 - r) * 120, 0, 100); // CPU far more than needed
}

// ---------------------------------------------------------------------------
// Throughput (creator / AI / everyday) simulation
// ---------------------------------------------------------------------------

export function componentStrength(build: Build, w: ThroughputWorkload, c: Component): number {
  const { cpu, gpu, storage } = build;
  switch (c) {
    case 'cpuSingle':
      return cpu ? cpu.gamingIndex / 100 : 0;
    case 'cpuMulti':
      return cpu ? cpu.multiIndex / 100 : 0;
    case 'gpu': {
      let r = gpuIndexFor(gpu, build, 'raster') / 100;
      if (gpu && !gpu.cuda && w.nonCudaFactor) r *= w.nonCudaFactor;
      if (w.vramNeed) r *= vramFactor(gpu?.vram ?? 2, w.vramNeed);
      return r;
    }
    case 'gpuBandwidth': {
      if (!gpu) return 0.03;
      let r = gpu.bandwidth / 1792;
      if (!gpu.cuda && w.nonCudaFactor) r *= w.nonCudaFactor;
      if (w.vramNeed) r *= vramFactor(gpu.vram, w.vramNeed);
      return r;
    }
    case 'ram': {
      const { factor } = ramFactor(build, w.ramNeedGb);
      return clamp(factor, 0.05, 1);
    }
    case 'storage':
      // Not chosen yet: assume a typical NVMe drive rather than flagging it.
      return storage ? storageScore[storage.kind] : 0.9;
  }
}

export interface ThroughputResult {
  /** Overall speed relative to a top-end machine, 0–100. */
  performance: number;
  strengths: Partial<Record<Component, number>>;
  /** Fraction of the job's time spent waiting on each component. */
  timeShare: Partial<Record<Component, number>>;
  /** The part holding the job back most (relative to the rest of the build). */
  weakest: Component;
  /** The part it is being compared against. */
  strongest: Component;
  /**
   * CPU-vs-GPU tier mismatch, 0–1. RAM and storage are not tiered — they are
   * either sufficient or they are not — so they count through `deficiency`.
   */
  imbalance: number;
  /** Multiplier 0–1 from parts that are simply not enough (RAM, storage, VRAM). */
  deficiency: number;
  /** How much faster the job gets if the weakest part were brought up to par. */
  fixGain: number;
}

const tiered: Component[] = ['cpuSingle', 'cpuMulti', 'gpu', 'gpuBandwidth'];
const isCpu = (c: Component) => c === 'cpuSingle' || c === 'cpuMulti';

/** Strength at which a non-tiered part (RAM, storage) stops holding anything back. */
const SUFFICIENT = 0.85;
/** CPU/GPU ratio regarded as fully balanced. */
const BALANCED_RATIO = 0.7;

export function simulateThroughput(build: Build, w: ThroughputWorkload): ThroughputResult {
  const comps = Object.keys(w.shares) as Component[];
  const strengths: Partial<Record<Component, number>> = {};
  const terms: Partial<Record<Component, number>> = {};
  let time = 0;
  for (const c of comps) {
    const s = Math.max(componentStrength(build, w, c), 0.01);
    strengths[c] = s;
    terms[c] = w.shares[c]! / s;
    time += terms[c]!;
  }
  const timeShare: Partial<Record<Component, number>> = {};
  for (const c of comps) timeShare[c] = terms[c]! / time;

  // Combine CPU single/multi into one CPU strength, GPU raster/bandwidth into one GPU strength.
  const group = (pred: (c: Component) => boolean) => {
    const cs = comps.filter((c) => tiered.includes(c) && pred(c));
    const share = cs.reduce((a, c) => a + w.shares[c]!, 0);
    if (!cs.length || share < 0.1) return undefined;
    const s = cs.reduce((a, c) => a + w.shares[c]! * strengths[c]!, 0) / share;
    const main = cs.reduce((a, b) => (w.shares[b]! > w.shares[a]! ? b : a));
    return { s, main };
  };
  const cpuG = group(isCpu);
  const gpuG = group((c) => !isCpu(c));

  let imbalance = 0;
  let weakest: Component = (cpuG ?? gpuG)!.main;
  let strongest: Component = weakest;
  if (cpuG && gpuG) {
    const [lo, hi] = cpuG.s <= gpuG.s ? [cpuG, gpuG] : [gpuG, cpuG];
    weakest = lo.main;
    strongest = hi.main;
    imbalance = clamp(1 - lo.s / hi.s, 0, 1);
  }

  // Insufficient RAM/storage (or a single tiered part far below the tier it sits in) override.
  let deficiency = 1;
  for (const c of comps) {
    if (tiered.includes(c) || w.shares[c]! < 0.05) continue;
    const s = strengths[c]!;
    if (s < SUFFICIENT) {
      const d = clamp(0.4 + (s / SUFFICIENT) * 0.6, 0.4, 1);
      if (d < deficiency) {
        deficiency = d;
        if (d < 0.9) weakest = c;
      }
    }
  }
  // VRAM shortfalls show up as a weakened GPU strength; surface them too.
  if (w.vramNeed && (build.gpu?.vram ?? 0) < w.vramNeed) {
    const d = vramFactor(build.gpu?.vram ?? 2, w.vramNeed);
    if (d < deficiency) {
      deficiency = d;
      weakest = gpuG?.main ?? 'gpu';
    }
  }

  const targetS = weakest === strongest || !tiered.includes(weakest)
    ? Math.max(SUFFICIENT, strengths[weakest]!)
    : Math.max(strengths[strongest]! * BALANCED_RATIO, strengths[weakest]!);
  const fixedTime = time - terms[weakest]! + w.shares[weakest]! / Math.min(1, targetS);
  return {
    performance: clamp(100 / time, 0, 100),
    strengths,
    timeShare,
    weakest,
    strongest,
    imbalance,
    deficiency,
    fixGain: Math.max(0, time / fixedTime - 1),
  };
}

export function throughputBalanceScore(r: ThroughputResult): number {
  const ratio = 1 - r.imbalance;
  const balance = ratio >= BALANCED_RATIO ? 1 : clamp((ratio - 0.15) / (BALANCED_RATIO - 0.15), 0, 1);
  return clamp(balance * r.deficiency * 100, 0, 100);
}

// ---------------------------------------------------------------------------
// Local AI specifics
// ---------------------------------------------------------------------------

export interface AiEstimate {
  /** Largest model (billions of parameters, 4-bit quantised) that fits in VRAM. */
  maxModelB: number;
  /** Estimated generation speed for an 8B model at 4-bit, tokens/second. */
  tokensPerSec8B: number;
  onGpu: boolean;
}

export function estimateAi(build: Build): AiEstimate {
  const { gpu, ram } = build;
  const modelGb8B = 4.9;
  if (!gpu) {
    const channels = ram && ram.sticks >= 2 ? 2 : 1;
    const bw = ((ram?.speed ?? 3200) * 8 * channels) / 1000; // GB/s
    return { maxModelB: Math.max(0, ((ram?.totalGb ?? 16) * 0.6 - 2) / 0.6), tokensPerSec8B: (bw * 0.6) / modelGb8B, onGpu: false };
  }
  const efficiency = gpu.cuda ? 0.7 : 0.58;
  return {
    maxModelB: Math.max(0, (gpu.vram - 1.5) / 0.62),
    tokensPerSec8B: gpu.vram >= 6 ? (gpu.bandwidth * efficiency) / modelGb8B : 0,
    onGpu: true,
  };
}

// ---------------------------------------------------------------------------
// Whole-build evaluation
// ---------------------------------------------------------------------------

export type Tone = 'good' | 'warning' | 'serious' | 'critical';

export interface WorkloadResult {
  workload: WorkloadId;
  score: number;
  tone: Tone;
  headline: string;
  detail: string;
  fps?: FpsPoint[];
  /** The resolution being judged for frame-rate workloads. */
  judged?: FpsPoint;
  throughput?: ThroughputResult;
  ai?: AiEstimate;
  notes: string[];
}

export function toneFor(score: number): Tone {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  if (score >= 40) return 'serious';
  return 'critical';
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function evaluateGaming(build: Build, w: GamingWorkload, res: Resolution): WorkloadResult {
  const fps = RESOLUTIONS.map((r) => simulateFps(build, w, r));
  const judged = fps.find((p) => p.resolution === res)!;
  const notes = [...ramFactor(build, w.ramNeedGb).notes];
  if (build.gpu && build.gpu.vram < w.vramNeed[res]) {
    notes.push(`${build.gpu.vram} GB of VRAM is tight for ${res} in this workload (${w.vramNeed[res]} GB recommended): expect texture pop-in or stutter unless you lower texture quality.`);
  }
  if (pcieFactor(build) < 1) notes.push('This x8 graphics card is on a PCIe 3.0 platform and loses some performance.');
  if (build.storage?.kind === 'HDD') notes.push('Modern games on a hard drive load slowly and can stutter while streaming assets. Use an SSD.');
  if (build.cpu && build.gpu && build.cpu.gamingIndex < minCpuIndexForGpu(build.gpu) && judged.limitedBy === 'gpu') {
    notes.push(`The ${build.cpu.name} is a low tier for a ${build.gpu.name}. Average FPS looks fine here, but expect weaker 1% lows (stutter) in CPU-heavy scenes and future games.`);
  }
  if (w.cpuOverhead && build.cpu && build.cpu.cores < 8) notes.push(`${build.cpu.cores} cores is tight for gaming and streaming at once. 8+ cores or GPU encoding (NVENC/AMF) helps.`);

  if (!build.cpu || (!build.gpu && !build.cpu.hasIgpu)) {
    return { workload: w.id, score: 0, tone: 'critical', headline: 'Pick a CPU and GPU', detail: 'The frame-rate model needs both a processor and graphics.', fps, judged, notes };
  }
  const score = gamingBalanceScore(judged);
  const fpsTxt = `~${Math.round(judged.fps)} FPS at ${res}`;
  let headline: string;
  let detail: string;
  if (judged.limitedBy === 'cpu') {
    if (judged.bottleneck < 0.1) {
      headline = `Balanced: ${fpsTxt}`;
      detail = 'CPU and GPU are evenly matched. The CPU is only marginally the limit.';
    } else {
      headline = `CPU bottleneck: ${pct(judged.bottleneck)} of the GPU sits idle`;
      detail = `${fpsTxt}. The GPU could deliver ~${Math.round(judged.gpuFps)} FPS, but the CPU tops out around ${Math.round(judged.cpuFps)}.`;
    }
  } else {
    const headroom = judged.bottleneck;
    if (headroom > 0.4) {
      headline = `GPU-limited with a lot of spare CPU: ${fpsTxt}`;
      detail = `The CPU could drive ~${Math.round(judged.cpuFps)} FPS but the GPU caps it at ~${Math.round(judged.gpuFps)}. A faster GPU would scale well, or a cheaper CPU would perform the same here.`;
    } else {
      headline = `Well balanced: ${fpsTxt}`;
      detail = `GPU-limited (the ideal state) with ${pct(headroom)} CPU headroom for heavy scenes.`;
    }
  }
  return { workload: w.id, score, tone: toneFor(score), headline, detail, fps, judged, notes };
}

function evaluateThroughput(build: Build, w: ThroughputWorkload): WorkloadResult {
  const t = simulateThroughput(build, w);
  const notes = [...ramFactor(build, w.ramNeedGb).notes];
  if (w.vramNeed && (build.gpu?.vram ?? 0) < w.vramNeed) {
    notes.push(`${w.name} benefits from at least ${w.vramNeed} GB of VRAM; ${build.gpu ? `${build.gpu.vram} GB` : 'integrated graphics'} will limit scene/model size.`);
  }
  if (w.nonCudaFactor && build.gpu && !build.gpu.cuda) {
    notes.push(`Much ${w.id === 'ai' ? 'AI' : 'rendering'} software is best optimised for NVIDIA CUDA; ${build.gpu.brand} cards work but are less efficient here.`);
  }
  let ai: AiEstimate | undefined;
  if (w.id === 'ai') {
    ai = estimateAi(build);
    notes.unshift(`Fits up to a ~${Math.floor(ai.maxModelB)}B-parameter model (4-bit) ${ai.onGpu ? 'in VRAM' : 'in system RAM (CPU only — slow)'}; ~${Math.round(ai.tokensPerSec8B)} tokens/s on an 8B model.`);
  }
  if (w.id === 'office' && (build.gpu?.rasterIndex ?? 0) > 35) {
    notes.push('For everyday work this graphics card is far more than needed.');
  }

  const score = throughputBalanceScore(t);
  const label = componentLabelShort(t.weakest);
  const balanced = score >= 80;
  const headline = balanced
    ? `Balanced — ${Math.round(t.performance)}% of a top-end machine`
    : `${label} is holding this back`;
  const compared = t.weakest !== t.strongest && tiered.includes(t.weakest)
    ? `Bringing it closer to the ${componentLabelShort(t.strongest)}'s class`
    : 'Fixing it';
  const detail = balanced
    ? `No part is out of step with the others. The job spends the most time on the ${componentLabelShort(maxKey(t.timeShare))}, as expected for this kind of work.`
    : `The ${label} accounts for ${pct(t.timeShare[t.weakest]!)} of the job's time. ${compared} would make this ~${pct(t.fixGain)} faster.`;
  return { workload: w.id, score, tone: toneFor(score), headline, detail, throughput: t, ai, notes };
}

function maxKey(o: Partial<Record<Component, number>>): Component {
  return (Object.keys(o) as Component[]).reduce((a, b) => (o[b]! > o[a]! ? b : a));
}

export function componentLabelShort(c: Component): string {
  return { cpuSingle: 'CPU', cpuMulti: 'CPU', gpu: 'GPU', gpuBandwidth: 'GPU', ram: 'RAM', storage: 'Storage' }[c];
}

export function evaluateWorkload(build: Build, id: WorkloadId, res: Resolution): WorkloadResult {
  const w = workloadById[id];
  return w.kind === 'gaming' ? evaluateGaming(build, w, res) : evaluateThroughput(build, w);
}

export interface BuildEvaluation {
  results: WorkloadResult[];
  overall: number;
  tone: Tone;
}

export function evaluateBuild(build: Build, ids: WorkloadId[], res: Resolution): BuildEvaluation {
  const results = ids.map((id) => evaluateWorkload(build, id, res));
  // Weighted toward the worst workload so one bad fit is not hidden by averages.
  const scores = results.map((r) => r.score);
  const overall = scores.length ? 0.6 * (scores.reduce((a, b) => a + b, 0) / scores.length) + 0.4 * Math.min(...scores) : 0;
  return { results, overall, tone: toneFor(overall) };
}
