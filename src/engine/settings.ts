import type { FpsModel } from './workloads';
import type { GameSettings, Gpu, Preset, Resolution, Upscaling } from './types';

/** What the models are calibrated at: each game's own preset, no upscaling. */
export const DEFAULT_SETTINGS: GameSettings = { preset: 'high', upscaling: 'off' };

export const PRESETS: Preset[] = ['low', 'medium', 'high', 'ultra'];
export const UPSCALING: Upscaling[] = ['off', 'quality', 'balanced', 'performance'];

export const presetNames: Record<Preset, string> = { low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };
export const upscalingNames: Record<Upscaling, string> = { off: 'Off', quality: 'Quality', balanced: 'Balanced', performance: 'Performance' };

/**
 * Preset cost relative to High, from typical preset-scaling tests (Cyberpunk, RDR2, CoD, Fortnite):
 * Low roughly doubles GPU frame rate; the CPU gains a little (draw distance, crowds, shadows).
 */
const presetGpu: Record<Preset, number> = { low: 1.8, medium: 1.4, high: 1, ultra: 0.8 };
const presetCpu: Record<Preset, number> = { low: 1.12, medium: 1.06, high: 1, ultra: 0.94 };
/** Texture and buffer memory compared with High (mostly texture quality). */
const presetVram: Record<Preset, number> = { low: 0.6, medium: 0.75, high: 1, ultra: 1.2 };
const presetRam: Record<Preset, number> = { low: -1.5, medium: -0.75, high: 0, ultra: 1 };

/**
 * GPU frame-rate gain from upscaling in a GPU-heavy game (Quality renders at 67% of each axis,
 * Balanced 58%, Performance 50%). Less than the pixel saving: the upscaler itself and
 * resolution-independent work cost time, most of all at 1080p.
 */
const upscaleGain: Record<Exclude<Upscaling, 'off'>, Record<Resolution, number>> = {
  quality: { '1080p': 1.25, '1440p': 1.38, '4K': 1.5 },
  balanced: { '1080p': 1.35, '1440p': 1.52, '4K': 1.68 },
  performance: { '1080p': 1.45, '1440p': 1.65, '4K': 1.9 },
};
const upscaleVram: Record<Upscaling, number> = { off: 0, quality: -0.5, balanced: -0.75, performance: -1 };

/** Which upscaler the graphics card would use. */
export function upscalerName(gpu?: Gpu): string {
  if (gpu?.brand === 'NVIDIA' && /RTX/i.test(gpu.name)) return 'DLSS';
  if (gpu?.brand === 'Intel') return 'XeSS';
  return 'FSR';
}

/** Short text for headers: "High", "Medium · DLSS Quality". */
export function settingsLabel(s: GameSettings, gpu?: Gpu): string {
  const p = presetNames[s.preset];
  return s.upscaling === 'off' ? p : `${p} · ${upscalerName(gpu)} ${upscalingNames[s.upscaling]}`;
}

export const isDefaultSettings = (s: GameSettings) => s.preset === DEFAULT_SETTINGS.preset && s.upscaling === DEFAULT_SETTINGS.upscaling;

/**
 * How strongly a game's GPU frame rate follows the pixel count, from its own 1080p → 4K scaling
 * (4x the pixels). Light esports games gain little from upscaling; heavy story games gain the most.
 */
function pixelElasticity(w: FpsModel): number {
  const k = Math.log(1 / w.resolutionScale['4K']) / Math.log(4);
  return Math.min(1.1, Math.max(0.4, k / 0.85));
}

/** The frame-rate model at the chosen preset and upscaling. */
export function applySettings(w: FpsModel, s: GameSettings = DEFAULT_SETTINGS): FpsModel {
  if (isDefaultSettings(s) && !w.basePreset) return w;
  const base = w.basePreset ?? 'high';
  const gpuPreset = presetGpu[s.preset] / presetGpu[base];
  const cpuPreset = presetCpu[s.preset] / presetCpu[base];
  const up = s.upscaling !== 'off' && !w.noUpscaling ? s.upscaling : 'off';
  const e = pixelElasticity(w);
  const gain = (res: Resolution) => (up === 'off' ? 1 : 1 + (upscaleGain[up][res] - 1) * e);
  const vramScale = presetVram[s.preset] / presetVram[base];
  const vram = (res: Resolution) => Math.max(2, Math.round((w.vramNeed[res] * vramScale + upscaleVram[up]) * 2) / 2);
  return {
    ...w,
    cpuFpsPerPoint: w.cpuFpsPerPoint * cpuPreset,
    gpuFpsPerPoint: w.gpuFpsPerPoint * gpuPreset,
    resolutionScale: { '1080p': w.resolutionScale['1080p'] * gain('1080p'), '1440p': w.resolutionScale['1440p'] * gain('1440p'), '4K': w.resolutionScale['4K'] * gain('4K') },
    vramNeed: { '1080p': vram('1080p'), '1440p': vram('1440p'), '4K': vram('4K') },
    ramUseGb: Math.max(2, w.ramUseGb + presetRam[s.preset] - presetRam[base]),
    basePreset: undefined,
  };
}

/** The settings a model's factors were fitted at (for comparing with measured FPS). */
export const fittedSettings = (w: FpsModel): GameSettings => ({ preset: w.basePreset ?? 'high', upscaling: 'off' });
