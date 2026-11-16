import { effectiveRamSpeed } from './compatibility';
import { applySettings, DEFAULT_SETTINGS, isDefaultSettings, settingsLabel } from './settings';
import type { Build, Cpu, GameSettings, Gpu, Resolution, StorageKind, WorkloadId } from './types';
import { type Component, type FpsModel, type GamingWorkload, type ThroughputWorkload, workloadById } from './workloads';

export type { FpsModel };

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
  return cpu.igpuIndex ?? 3;
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

/** Penalty for narrow-link GPUs (x8 / x4) on older PCIe generations, worse when VRAM is small. */
export function pcieFactor(build: Build): number {
  const { gpu, cpu, motherboard } = build;
  if (!gpu) return 1;
  const gen = Math.min(cpu?.pcieGen ?? 5, motherboard?.pcieGen ?? 5, gpu.pcieGen);
  // Link bandwidth in "PCIe 3.0 lanes": x16 Gen3 = 16, x8 Gen4 = 16, x4 Gen4 = 8, x4 Gen3 = 4.
  const effective = gpu.pcieLanes * 2 ** (gen - 3);
  if (effective >= 16) return 1;
  if (effective >= 8) return gpu.vram <= 8 ? 0.88 : 0.94;
  return gpu.vram <= 4 ? 0.75 : 0.85;
}

const storageScore: Record<StorageKind, number> = {
  HDD: 0.15, 'SATA SSD': 0.45, 'NVMe Gen3': 0.75, 'NVMe Gen4': 0.95, 'NVMe Gen5': 1,
};

function gpuIndexFor(gpu: Gpu | undefined, build: Build, metric: 'raster' | 'rt'): number {
  if (!gpu) {
    // Integrated graphics read from system memory: one stick (single-channel) starves them.
    const ig = igpuIndex(build.cpu) * (build.ram?.sticks === 1 ? 0.7 : 1);
    return metric === 'rt' ? ig * 0.4 : ig;
  }
  return metric === 'rt' ? gpu.rtIndex : gpu.rasterIndex;
}

/** Graphics memory: the card's VRAM, or for integrated graphics the share of system RAM they may use (up to half). */
export function graphicsMemoryGb(build: Build): number {
  if (build.gpu) return build.gpu.vram;
  return build.ram ? Math.min(build.ram.totalGb / 2, 16) : 2;
}

/**
 * Upper limit on a gaming score from system memory, which the CPU/GPU balance can't see when
 * the GPU is the limit: one stick (single-channel) hurts 1% lows, and under 16 GB modern games stutter.
 */
export function ramGamingCap(build: Build): number {
  const ram = build.ram;
  if (!ram) return 100;
  let cap = 100;
  if (ram.sticks === 1) cap = 85;
  if (ram.totalGb < 16) cap = Math.min(cap, 70);
  if (ram.totalGb < 8) cap = Math.min(cap, 45);
  return cap;
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
  /** GPU frame-rate ceiling including time lost waiting on memory (VRAM spill, paging). */
  gpuFps: number;
  /** What the GPU could do with enough memory: the ceiling it would be at 100% busy. */
  gpuCapacityFps: number;
  fps: number;
  /** Estimated 1% low FPS: the frame rate of the slowest 1% of frames (stutter). */
  low1: number;
  limitedBy: 'cpu' | 'gpu';
  /** How much of the faster part's capability is unused, 0–1. */
  bottleneck: number;
  /** How busy the CPU's main (game) thread is, 0–1. */
  mainThread: number;
  /** What Task Manager would show for the whole CPU, 0–1 (averages all threads). */
  cpuTotal: number;
  /** How busy the GPU is, 0–1: lower when it waits on the CPU or on memory. */
  gpuBusy: number;
  /** Why the GPU waits even though it is the limit, if it does. */
  stall?: 'vram' | 'ram';
  memory: MemoryUse;
}

// ---------------------------------------------------------------------------
// Memory pressure: what actually fills RAM while a game runs
// ---------------------------------------------------------------------------

/** Windows 11 with drivers and services, typical idle use. */
export const WINDOWS_RAM_GB = 3.5;
/** Browser, Discord, game launcher, antivirus: what usually runs alongside a game. */
export const BACKGROUND_RAM_GB = 2.5;
/** OBS and a browser with chat, while streaming. */
const STREAMING_RAM_GB = 2;

export interface MemoryUse {
  /** System RAM installed (GB). */
  ramGb: number;
  windowsGb: number;
  backgroundGb: number;
  gameGb: number;
  /** Graphics data that doesn't fit in VRAM and spills into system RAM (or iGPU memory carved from RAM). */
  spillGb: number;
  /** Total RAM in use. */
  usedGb: number;
  /** usedGb / ramGb; above ~0.9 Windows starts paging to the drive. */
  pressure: number;
  vramGb: number;
  vramNeedGb: number;
  /** True for integrated graphics, which use system RAM as graphics memory. */
  shared: boolean;
}

export function memoryUse(build: Build, w: FpsModel, res: Resolution): MemoryUse {
  const ramGb = build.ram?.totalGb ?? 16;
  const vramGb = graphicsMemoryGb(build);
  const vramNeedGb = w.vramNeed[res];
  const shared = !build.gpu;
  // A card short on VRAM keeps the overflow in system RAM; integrated graphics keep all of it there.
  const spillGb = shared ? Math.min(vramNeedGb, vramGb) : Math.max(0, vramNeedGb - vramGb);
  const backgroundGb = BACKGROUND_RAM_GB + (w.cpuOverhead ? STREAMING_RAM_GB : 0);
  const usedGb = WINDOWS_RAM_GB + backgroundGb + w.ramUseGb + spillGb;
  return { ramGb, windowsGb: WINDOWS_RAM_GB, backgroundGb, gameGb: w.ramUseGb, spillGb, usedGb, pressure: usedGb / ramGb, vramGb, vramNeedGb, shared };
}

/**
 * Slow-down when RAM overflows and Windows pages to the drive. Mild on average FPS
 * (the game's hot data stays resident), heavy on 1% lows (see lowRatio).
 */
function pagingFactor(m: MemoryUse, build: Build): number {
  const over = m.usedGb - m.ramGb;
  if (over <= 0) return 1;
  const drive = build.storage?.kind === 'HDD' ? 1.6 : 1;
  return clamp(1 - (0.5 * drive * over) / m.ramGb, 0.6, 1);
}

/** 1% low / average FPS, from what makes frame times uneven. */
function lowRatio(build: Build, cpuLoad: number, m: MemoryUse): number {
  // GPU-bound frames are even; CPU-bound frames spike on draw calls and simulation.
  const cpuBound = clamp((cpuLoad - 0.8) / 0.2, 0, 1);
  let r = 0.78 - 0.1 * cpuBound;
  if (build.cpu?.bigCache) r += 0.04 * cpuBound; // large cache smooths CPU spikes
  if (build.ram?.sticks === 1) r -= 0.05;
  if (build.cpu && build.gpu && build.cpu.gamingIndex < minCpuIndexForGpu(build.gpu)) r -= 0.04;
  // Graphics data fetched over PCIe from system RAM arrives late: hitches.
  if (!m.shared && m.spillGb > 0) {
    const short = m.spillGb / m.vramNeedGb;
    r -= short <= 0.25 ? 0.1 : short <= 0.5 ? 0.18 : 0.28;
  }
  // Paging: frames wait for the drive.
  if (m.pressure > 1) r -= m.pressure > 1.15 ? 0.22 : 0.14;
  else if (m.pressure > 0.9) r -= 0.05;
  if (build.storage?.kind === 'HDD') r -= 0.08;
  else if (build.storage?.kind === 'SATA SSD') r -= 0.02;
  return clamp(r, 0.3, 0.85);
}

/**
 * Task Manager's CPU % for a game: the main thread plus the worker threads it keeps partly busy,
 * averaged over every logical processor. A CPU-bound game often shows only 30–50% here.
 */
export function taskManagerCpu(cpu: Cpu, w: FpsModel, mainThread: number): number {
  const cores = Math.min(w.threads, cpu.cores);
  const extra = w.cpuOverhead ? 3 : 0; // software encoding while streaming
  const busy = mainThread * (1 + 0.65 * (cores - 1)) + 0.3 + extra * Math.min(1, cpu.cores / 8);
  return clamp(busy / cpu.threads, 0, 1);
}

export function simulateFps(build: Build, model: FpsModel, res: Resolution, settings: GameSettings = DEFAULT_SETTINGS): FpsPoint {
  const w = applySettings(model, settings);
  const { cpu, gpu } = build;
  const ram = ramFactor(build, w.ramNeedGb).factor;
  let cpuFps = cpu ? cpu.gamingIndex * w.cpuFpsPerPoint * ram : 0;
  if (cpu && w.cpuOverhead) cpuFps *= streamingCpuFactor(cpu);

  const memory = memoryUse(build, w, res);
  const paging = pagingFactor(memory, build);
  cpuFps *= paging;
  const gpuCapacityFps = gpuIndexFor(gpu, build, w.gpuMetric) * w.gpuFpsPerPoint * w.resolutionScale[res] * pcieFactor(build);
  // Too little VRAM, or RAM paging, makes the GPU wait for data: same chip, fewer frames.
  const vf = vramFactor(memory.vramGb, memory.vramNeedGb);
  const gpuFps = gpuCapacityFps * vf * paging;

  const fps = softMin(cpuFps, gpuFps);
  const limitedBy = cpuFps < gpuFps ? 'cpu' : 'gpu';
  const lo = Math.min(cpuFps, gpuFps);
  const hi = Math.max(cpuFps, gpuFps);
  const mainThread = cpuFps > 0 ? clamp(fps / cpuFps, 0, 1) : 0;
  const stall: FpsPoint['stall'] = gpu && vf < 1 ? 'vram' : paging < 0.99 ? 'ram' : undefined;
  return {
    resolution: res, cpuFps, gpuFps, gpuCapacityFps, fps, limitedBy,
    bottleneck: hi > 0 ? 1 - lo / hi : 0,
    low1: fps * lowRatio(build, mainThread, memory),
    mainThread,
    cpuTotal: cpu ? taskManagerCpu(cpu, w, mainThread) : 0,
    gpuBusy: gpuCapacityFps > 0 ? clamp(fps / gpuCapacityFps, 0, 1) : 0,
    stall,
    memory,
  };
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
      return cpu ? (cpu.singleIndex ?? cpu.gamingIndex) / 100 : 0;
    case 'cpuMulti':
      return cpu ? cpu.multiIndex / 100 : 0;
    case 'gpu': {
      let r = gpuIndexFor(gpu, build, 'raster') / 100;
      if (gpu && !gpu.cuda && w.nonCudaFactor) r *= w.nonCudaFactor;
      if (w.vramNeed) r *= vramFactor(graphicsMemoryGb(build), w.vramNeed);
      return r;
    }
    case 'gpuBandwidth': {
      if (!gpu) return 0.03;
      // Measured llama.cpp speed where we have it, otherwise memory bandwidth (RTX 5090 = 1).
      let r = gpu.aiIndex !== undefined ? gpu.aiIndex / 100 : gpu.bandwidth / 1792;
      if (!gpu.cuda && w.nonCudaFactor) r *= w.nonCudaFactor;
      if (w.vramNeed) r *= vramFactor(gpu.vram, w.vramNeed);
      return r;
    }
    case 'ram': {
      // Channels/speed from the shared factor; capacity weighs more for big projects than for games.
      const { factor } = ramFactor(build, 0);
      const capacity = build.ram ? Math.min(1, build.ram.totalGb / w.ramNeedGb) : 0.5;
      return clamp(factor * Math.pow(capacity, 0.7), 0.05, 1);
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
  if (w.vramNeed && graphicsMemoryGb(build) < w.vramNeed) {
    const d = vramFactor(graphicsMemoryGb(build), w.vramNeed);
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

/** Size of the llama.cpp benchmark model (Llama 2 7B Q4_0, 3.56 GiB) in GB. */
const llamaBenchModelGb = 3.83;

export function estimateAi(build: Build): AiEstimate {
  const { gpu, ram } = build;
  const modelGb8B = 4.9;
  if (!gpu) {
    const channels = ram && ram.sticks >= 2 ? 2 : 1;
    const bw = ((ram?.speed ?? 3200) * 8 * channels) / 1000; // GB/s
    return { maxModelB: Math.max(0, ((ram?.totalGb ?? 16) * 0.6 - 2) / 0.6), tokensPerSec8B: (bw * 0.6) / modelGb8B, onGpu: false };
  }
  const efficiency = gpu.cuda ? 0.7 : 0.58;
  // A measured llama.cpp result (Llama 2 7B Q4_0, 3.83 GB) scales to the 8B model by file size.
  const measured = gpu.source?.aiIndex?.raw;
  const tokens = measured !== undefined ? (measured * llamaBenchModelGb) / modelGb8B : (gpu.bandwidth * efficiency) / modelGb8B;
  return {
    maxModelB: Math.max(0, (gpu.vram - 1.5) / 0.62),
    tokensPerSec8B: gpu.vram >= 6 ? tokens : 0,
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
  /** A part that is simply too small for this use and caps its grade (gaming). */
  shortfall?: { part: 'VRAM' | 'RAM'; have: number; need: number };
}

export function toneFor(score: number): Tone {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  if (score >= 40) return 'serious';
  return 'critical';
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function evaluateGaming(build: Build, workload: GamingWorkload, res: Resolution, settings: GameSettings): WorkloadResult {
  // The workload at the chosen preset / upscaling: frame-rate factors and VRAM / RAM needs all move.
  const w = applySettings(workload, settings) as GamingWorkload;
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
  if (build.gpu && judged.low1 < judged.fps * 0.6) {
    const why = judged.memory.pressure > 1 ? 'RAM is full, so Windows swaps to the drive' : judged.stall === 'vram' ? 'graphics data spills out of VRAM' : 'frame times are uneven';
    notes.push(`Expect stutter: 1% lows around ${Math.round(judged.low1)} FPS against a ${Math.round(judged.fps)} FPS average, because ${why}.`);
  }
  if (w.cpuOverhead && build.cpu && build.cpu.cores < 8) notes.push(`${build.cpu.cores} cores is tight for gaming and streaming at once. 8+ cores or GPU encoding (NVENC/AMF) helps.`);

  if (!build.cpu || (!build.gpu && !build.cpu.hasIgpu)) {
    return { workload: w.id, score: 0, tone: 'critical', headline: 'Pick a CPU and GPU', detail: 'The frame-rate model needs both a processor and graphics.', fps, judged, notes };
  }
  const fpsTxt = `~${Math.round(judged.fps)} FPS at ${res}${isDefaultSettings(settings) ? '' : ` (${settingsLabel(settings, build.gpu)})`}`;
  if (!build.gpu) {
    // The CPU's built-in graphics: technically "GPU-limited", but the real answer is "add a graphics card".
    const score = Math.min(gamingBalanceScore(judged), 15);
    return {
      workload: w.id, score, tone: toneFor(score), fps, judged, notes,
      headline: `No graphics card: ${fpsTxt}`,
      detail: `The ${build.cpu.name}'s built-in graphics are far too slow for these games. Add a graphics card that matches the CPU.`,
    };
  }
  // Too little graphics memory or RAM caps the grade: the overflow spills into slower memory,
  // so the GPU waits (low GPU usage), RAM fills up and frame times stutter, whatever the balance.
  const balance = Math.min(gamingBalanceScore(judged), ramGamingCap(build));
  const vramHave = graphicsMemoryGb(build);
  const vramNeed = w.vramNeed[res];
  const vramCap = shortfallCap(vramHave / vramNeed, [75, 60, 40]);
  const ramHave = build.ram?.totalGb ?? 16;
  const ramCap = shortfallCap(ramHave / w.ramNeedGb, [90, 85, 60]);
  const score = Math.min(balance, vramCap, ramCap);
  const shortfall: WorkloadResult['shortfall'] =
    score < balance ? (vramCap <= ramCap ? { part: 'VRAM', have: vramHave, need: vramNeed } : { part: 'RAM', have: ramHave, need: w.ramNeedGb }) : undefined;
  let headline: string;
  let detail: string;
  if (shortfall) {
    const what = shortfall.part === 'VRAM' ? 'graphics memory (VRAM)' : 'RAM';
    headline = `Not enough ${what}: ${shortfall.have} GB of ~${shortfall.need} GB`;
    detail = shortfall.part === 'VRAM'
      ? `${fpsTxt} on paper, but games that need more than ${shortfall.have} GB spill into system RAM: the GPU waits (low GPU usage), RAM fills up and you get stutter unless you lower texture quality.`
      : `${fpsTxt} on paper, but with the game, Windows and background apps ${shortfall.have} GB fills up, so expect stutter and slow alt-tabbing.`;
  } else if (judged.limitedBy === 'cpu') {
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
  return { workload: w.id, score, tone: toneFor(score), headline, detail, fps, judged, notes, shortfall };
}

/** Grade cap for a part that is too small: have/need ratio >= 1 no cap, >= 0.75, >= 0.5, below. */
function shortfallCap(ratio: number, caps: [number, number, number]): number {
  if (ratio >= 1) return 100;
  return ratio >= 0.75 ? caps[0] : ratio >= 0.5 ? caps[1] : caps[2];
}

function evaluateThroughput(build: Build, w: ThroughputWorkload): WorkloadResult {
  const t = simulateThroughput(build, w);
  const notes = [...ramFactor(build, w.ramNeedGb).notes];
  if (w.vramNeed && graphicsMemoryGb(build) < w.vramNeed) {
    notes.push(`${w.name} benefits from at least ${w.vramNeed} GB of VRAM; ${build.gpu ? `${build.gpu.vram} GB` : `integrated graphics (~${graphicsMemoryGb(build)} GB shared)`} will limit scene/model size.`);
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

export function evaluateWorkload(build: Build, id: WorkloadId, res: Resolution, settings: GameSettings = DEFAULT_SETTINGS): WorkloadResult {
  const w = workloadById[id];
  return w.kind === 'gaming' ? evaluateGaming(build, w, res, settings) : evaluateThroughput(build, w);
}

export interface BuildEvaluation {
  results: WorkloadResult[];
  overall: number;
  tone: Tone;
}

export function evaluateBuild(build: Build, ids: WorkloadId[], res: Resolution, settings: GameSettings = DEFAULT_SETTINGS): BuildEvaluation {
  const results = ids.map((id) => evaluateWorkload(build, id, res, settings));
  // Weighted toward the worst workload so one bad fit is not hidden by averages.
  const scores = results.map((r) => r.score);
  const overall = scores.length ? 0.6 * (scores.reduce((a, b) => a + b, 0) / scores.length) + 0.4 * Math.min(...scores) : 0;
  return { results, overall, tone: toneFor(overall) };
}
