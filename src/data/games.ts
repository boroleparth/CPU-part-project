import type { FpsModel } from '../engine/simulation';

export interface Game extends FpsModel {
  id: string;
  name: string;
  /** Which kind of game, used for grouping. */
  kind: 'competitive' | 'story';
  /** The settings preset the estimate assumes. */
  preset: string;
  /** Engine frame cap at default settings, if any. */
  fpsCap?: number;
  note?: string;
}

// Ten of the most played and most benchmarked PC games. Per-game factors are
// tuned so the model lands near typical published averages for each preset
// (e.g. RTX 4070 Super + Ryzen 7 9800X3D). Estimates, not measurements.
//   cpuFpsPerPoint × CPU gamingIndex  → CPU frame-rate ceiling
//   gpuFpsPerPoint × GPU rasterIndex × resolution scale → GPU ceiling at 1080p/1440p/4K
const vram = (a: number, b: number, c: number) => ({ '1080p': a, '1440p': b, '4K': c });

export const games: Game[] = [
  {
    id: 'cs2', name: 'Counter-Strike 2', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 6.5, gpuFpsPerPoint: 9.5, resolutionScale: { '1080p': 1, '1440p': 0.74, '4K': 0.46 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 8), ramNeedGb: 16,
    note: 'Very CPU-heavy at high frame rates; large-cache CPUs shine.',
  },
  {
    id: 'valorant', name: 'Valorant', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 8, gpuFpsPerPoint: 16, resolutionScale: { '1080p': 1, '1440p': 0.84, '4K': 0.6 },
    gpuMetric: 'raster', vramNeed: vram(4, 6, 6), ramNeedGb: 16,
    note: 'Light on the GPU; frame rate is almost entirely set by the CPU.',
  },
  {
    id: 'fortnite', name: 'Fortnite', kind: 'competitive', preset: 'High (DX12, no Lumen)',
    cpuFpsPerPoint: 3.0, gpuFpsPerPoint: 3.8, resolutionScale: { '1080p': 1, '1440p': 0.72, '4K': 0.42 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16,
  },
  {
    id: 'apex', name: 'Apex Legends', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 3.2, gpuFpsPerPoint: 5.1, resolutionScale: { '1080p': 1, '1440p': 0.75, '4K': 0.45 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 8), ramNeedGb: 16, fpsCap: 300,
    note: 'The engine is capped at 300 FPS.',
  },
  {
    id: 'cod', name: 'Call of Duty: Black Ops 6', kind: 'competitive', preset: 'Balanced / High',
    cpuFpsPerPoint: 2.6, gpuFpsPerPoint: 3.6, resolutionScale: { '1080p': 1, '1440p': 0.72, '4K': 0.42 },
    gpuMetric: 'raster', vramNeed: vram(8, 10, 12), ramNeedGb: 16,
  },
  {
    id: 'rivals', name: 'Marvel Rivals', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 2.3, gpuFpsPerPoint: 2.7, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.4 },
    gpuMetric: 'raster', vramNeed: vram(8, 8, 12), ramNeedGb: 16,
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk 2077', kind: 'story', preset: 'High (no ray tracing)',
    cpuFpsPerPoint: 1.9, gpuFpsPerPoint: 2.6, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.37 },
    gpuMetric: 'raster', vramNeed: vram(8, 10, 12), ramNeedGb: 16,
  },
  {
    id: 'rdr2', name: 'Red Dead Redemption 2', kind: 'story', preset: 'High',
    cpuFpsPerPoint: 2.0, gpuFpsPerPoint: 2.45, resolutionScale: { '1080p': 1, '1440p': 0.76, '4K': 0.48 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16,
  },
  {
    id: 'bg3', name: "Baldur's Gate 3", kind: 'story', preset: 'Ultra (Act 3 city)',
    cpuFpsPerPoint: 1.4, gpuFpsPerPoint: 3.1, resolutionScale: { '1080p': 1, '1440p': 0.72, '4K': 0.42 },
    gpuMetric: 'raster', vramNeed: vram(8, 8, 10), ramNeedGb: 16,
    note: 'Busy late-game areas are limited by the CPU.',
  },
  {
    id: 'eldenring', name: 'Elden Ring', kind: 'story', preset: 'High',
    cpuFpsPerPoint: 1.8, gpuFpsPerPoint: 3.4, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.4 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16, fpsCap: 60,
    note: 'Locked to 60 FPS, so a high-refresh monitor makes no difference here.',
  },
];
