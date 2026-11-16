import type { Resolution, WorkloadId } from './types';

export type Component = 'cpuSingle' | 'cpuMulti' | 'gpu' | 'gpuBandwidth' | 'ram' | 'storage';

interface BaseWorkload {
  id: WorkloadId;
  name: string;
  short: string;
  description: string;
  /** RAM capacity (GB) at which this workload stops being memory-limited. */
  ramNeedGb: number;
}

/** Inputs to the frame-rate model, shared by workloads and individual games. */
export interface FpsModel {
  /** Frames per second per CPU gamingIndex point. */
  cpuFpsPerPoint: number;
  /** Frames per second per GPU index point at 1080p. */
  gpuFpsPerPoint: number;
  /** GPU frame-rate scale per resolution, relative to 1080p. */
  resolutionScale: Record<Resolution, number>;
  /** Which GPU index to use. */
  gpuMetric: 'raster' | 'rt';
  /** Minimum VRAM (GB) per resolution before textures start to stutter. */
  vramNeed: Record<Resolution, number>;
  /** RAM capacity (GB) at which this stops being memory-limited. */
  ramNeedGb: number;
  /** Extra CPU load (e.g. software encoding) applied to the CPU ceiling. */
  cpuOverhead?: boolean;
  /** RAM the game itself uses at this preset (GB), on top of Windows and background apps. */
  ramUseGb: number;
  /** How many CPU cores the game keeps busy (main thread = 1, the rest partly). */
  threads: number;
}

/**
 * Frame-rate workloads: the CPU sets a frame-rate ceiling that barely moves
 * with resolution, the GPU sets one that falls steeply with resolution.
 */
export interface GamingWorkload extends BaseWorkload, FpsModel {
  kind: 'gaming';
}

/**
 * Throughput workloads (Amdahl-style): the job's time is split between parts.
 * Each share is the fraction of time on a top-end reference machine; a weaker
 * part stretches its share.
 */
export interface ThroughputWorkload extends BaseWorkload {
  kind: 'throughput';
  shares: Partial<Record<Component, number>>;
  vramNeed?: number;
  /** Non-CUDA GPUs are less effective in this software (e.g. Blender OptiX). */
  nonCudaFactor?: number;
}

export type Workload = GamingWorkload | ThroughputWorkload;

const gamingVram = { '1080p': 8, '1440p': 12, '4K': 16 } as const;

export const workloads: Workload[] = [
  {
    id: 'aaa', kind: 'gaming', name: 'AAA gaming', short: 'AAA',
    description: 'Story and open-world games at high settings (Cyberpunk, Starfield, Black Myth).',
    // x1.4 from the measured story games (Cyberpunk, RDR2, Baldur's Gate 3 on Notebookcheck);
    // resolution scaling is their average.
    cpuFpsPerPoint: 2.8, gpuFpsPerPoint: 3.65,
    resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.39 },
    gpuMetric: 'raster', vramNeed: gamingVram, ramNeedGb: 32, ramUseGb: 9, threads: 7,
  },
  {
    id: 'esports', kind: 'gaming', name: 'Competitive / esports', short: 'Esports',
    description: 'High-refresh shooters and MOBAs (Valorant, CS2, Fortnite performance mode).',
    cpuFpsPerPoint: 6.0, gpuFpsPerPoint: 9.0,
    resolutionScale: { '1080p': 1, '1440p': 0.78, '4K': 0.5 },
    gpuMetric: 'raster', vramNeed: { '1080p': 6, '1440p': 8, '4K': 10 }, ramNeedGb: 16, ramUseGb: 4.5, threads: 3,
  },
  {
    id: 'raytracing', kind: 'gaming', name: 'Ray-traced gaming', short: 'Ray tracing',
    description: 'Games with ray tracing / path tracing enabled, without frame generation.',
    cpuFpsPerPoint: 1.7, gpuFpsPerPoint: 1.6,
    resolutionScale: { '1080p': 1, '1440p': 0.64, '4K': 0.34 },
    gpuMetric: 'rt', vramNeed: { '1080p': 10, '1440p': 12, '4K': 16 }, ramNeedGb: 32, ramUseGb: 10, threads: 7,
  },
  {
    id: 'streaming', kind: 'gaming', name: 'Gaming + streaming', short: 'Streaming',
    description: 'Playing AAA games while streaming/recording with OBS and a browser open.',
    cpuFpsPerPoint: 2.8, gpuFpsPerPoint: 3.45,
    resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.39 },
    gpuMetric: 'raster', vramNeed: gamingVram, ramNeedGb: 32, cpuOverhead: true, ramUseGb: 9, threads: 7,
  },
  {
    id: 'video', kind: 'throughput', name: 'Video editing', short: 'Video',
    description: '4K timeline editing, effects and exports (Premiere Pro, DaVinci Resolve).',
    shares: { cpuMulti: 0.5, gpu: 0.28, ram: 0.14, storage: 0.08 },
    vramNeed: 8, ramNeedGb: 32,
  },
  {
    id: 'render3d', kind: 'throughput', name: '3D rendering', short: '3D render',
    description: 'GPU rendering and viewport work in Blender, Cinema 4D, Unreal.',
    shares: { gpu: 0.68, cpuMulti: 0.17, ram: 0.1, storage: 0.05 },
    vramNeed: 12, ramNeedGb: 32, nonCudaFactor: 0.65,
  },
  {
    id: 'ai', kind: 'throughput', name: 'Local AI / LLMs', short: 'Local AI',
    description: 'Running language and image models locally (Ollama, LM Studio, Stable Diffusion).',
    shares: { gpuBandwidth: 0.82, ram: 0.1, cpuSingle: 0.04, storage: 0.04 },
    vramNeed: 12, ramNeedGb: 32, nonCudaFactor: 0.8,
  },
  {
    id: 'office', kind: 'throughput', name: 'Office, coding & browsing', short: 'Everyday',
    description: 'Many browser tabs, office apps, compiling code, light photo work.',
    shares: { cpuSingle: 0.45, cpuMulti: 0.15, ram: 0.2, storage: 0.2 },
    ramNeedGb: 16,
  },
];

export const workloadById = Object.fromEntries(workloads.map((w) => [w.id, w])) as Record<WorkloadId, Workload>;

export const componentLabels: Record<Component, string> = {
  cpuSingle: 'CPU (single-core)',
  cpuMulti: 'CPU (multi-core)',
  gpu: 'GPU',
  gpuBandwidth: 'GPU memory bandwidth',
  ram: 'RAM',
  storage: 'Storage',
};
