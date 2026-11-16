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
// tuned so the model lands near published averages for each preset.
// CS2, Call of Duty, Cyberpunk, RDR2 and Baldur's Gate 3 are fitted to Notebookcheck's
// measured FPS at 1080p (15-163 laptops and desktops each; scripts/fit-game-profiles.ts).
// The others have too few measurements there and stay estimates.
//   cpuFpsPerPoint × CPU gamingIndex  → CPU frame-rate ceiling
//   gpuFpsPerPoint × GPU rasterIndex × resolution scale → GPU ceiling at 1080p/1440p/4K
//   ramUseGb: the game's own RAM use (Task Manager, high preset); threads: cores it keeps busy
const vram = (a: number, b: number, c: number) => ({ '1080p': a, '1440p': b, '4K': c });

export const games: Game[] = [
  {
    id: 'cs2', name: 'Counter-Strike 2', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 5.7, gpuFpsPerPoint: 8.2, resolutionScale: { '1080p': 1, '1440p': 0.74, '4K': 0.46 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 8), ramNeedGb: 16, ramUseGb: 4.5, threads: 3,
    note: 'Very CPU-heavy at high frame rates; large-cache CPUs shine.',
  },
  {
    id: 'valorant', name: 'Valorant', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 8, gpuFpsPerPoint: 16, resolutionScale: { '1080p': 1, '1440p': 0.84, '4K': 0.6 },
    gpuMetric: 'raster', vramNeed: vram(4, 6, 6), ramNeedGb: 16, ramUseGb: 3, threads: 3,
    note: 'Light on the GPU; frame rate is almost entirely set by the CPU.',
  },
  {
    id: 'fortnite', name: 'Fortnite', kind: 'competitive', preset: 'High (DX12, no Lumen)',
    cpuFpsPerPoint: 3.0, gpuFpsPerPoint: 3.8, resolutionScale: { '1080p': 1, '1440p': 0.72, '4K': 0.42 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16, ramUseGb: 6, threads: 5,
  },
  {
    id: 'apex', name: 'Apex Legends', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 3.2, gpuFpsPerPoint: 5.1, resolutionScale: { '1080p': 1, '1440p': 0.75, '4K': 0.45 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 8), ramNeedGb: 16, ramUseGb: 5, threads: 5, fpsCap: 300,
    note: 'The engine is capped at 300 FPS.',
  },
  {
    id: 'cod', name: 'Call of Duty: Black Ops 6', kind: 'competitive', preset: 'Balanced / High',
    cpuFpsPerPoint: 2.4, gpuFpsPerPoint: 3.6, resolutionScale: { '1080p': 1, '1440p': 0.72, '4K': 0.42 },
    gpuMetric: 'raster', vramNeed: vram(8, 10, 12), ramNeedGb: 16, ramUseGb: 9, threads: 8,
  },
  {
    id: 'rivals', name: 'Marvel Rivals', kind: 'competitive', preset: 'High',
    cpuFpsPerPoint: 2.3, gpuFpsPerPoint: 2.7, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.4 },
    gpuMetric: 'raster', vramNeed: vram(8, 8, 12), ramNeedGb: 16, ramUseGb: 7, threads: 6,
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk 2077', kind: 'story', preset: 'High (no ray tracing)',
    cpuFpsPerPoint: 2.5, gpuFpsPerPoint: 3.75, resolutionScale: { '1080p': 1, '1440p': 0.62, '4K': 0.28 },
    gpuMetric: 'raster', vramNeed: vram(8, 10, 12), ramNeedGb: 16, ramUseGb: 8, threads: 8,
  },
  {
    id: 'rdr2', name: 'Red Dead Redemption 2', kind: 'story', preset: 'High',
    cpuFpsPerPoint: 2.0, gpuFpsPerPoint: 3.9, resolutionScale: { '1080p': 1, '1440p': 0.8, '4K': 0.53 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16, ramUseGb: 7, threads: 7,
  },
  {
    id: 'bg3', name: "Baldur's Gate 3", kind: 'story', preset: 'Ultra',
    cpuFpsPerPoint: 2.65, gpuFpsPerPoint: 4.1, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.38 },
    gpuMetric: 'raster', vramNeed: vram(8, 8, 10), ramNeedGb: 16, ramUseGb: 8, threads: 6,
    note: 'Busy late-game city areas (Act 3) are limited by the CPU and run well below this.',
  },
  {
    id: 'eldenring', name: 'Elden Ring', kind: 'story', preset: 'High',
    cpuFpsPerPoint: 1.8, gpuFpsPerPoint: 3.4, resolutionScale: { '1080p': 1, '1440p': 0.7, '4K': 0.4 },
    gpuMetric: 'raster', vramNeed: vram(6, 8, 10), ramNeedGb: 16, ramUseGb: 6, threads: 4, fpsCap: 60,
    note: 'Locked to 60 FPS, so a high-refresh monitor makes no difference here.',
  },
];
