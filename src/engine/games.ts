import type { Game } from '../data/games';
import { simulateFps, type Tone } from './simulation';
import type { Build, Resolution } from './types';

export const REFRESH_RATES = [60, 75, 120, 144, 165, 240, 360] as const;

export interface GameResult {
  game: Game;
  /** Average FPS at the game's preset (after any engine cap). */
  fps: number;
  /** Estimated 1% low FPS (how bad the dips get). */
  low1: number;
  cpuFps: number;
  gpuFps: number;
  limitedBy: 'cpu' | 'gpu' | 'cap';
  tone: Tone;
  verdict: string;
}

/** Estimated frame rates for one game, and how they compare with the monitor's refresh rate. */
export function simulateGame(build: Build, game: Game, res: Resolution, refreshHz: number): GameResult {
  const p = simulateFps(build, game, res);
  let fps = p.fps;
  let limitedBy: GameResult['limitedBy'] = p.limitedBy;
  // CPU-bound games dip harder (draw-call and simulation spikes) than GPU-bound ones.
  let low1 = fps * (p.limitedBy === 'cpu' ? 0.68 : 0.78);
  if (game.fpsCap && fps >= game.fpsCap) {
    fps = game.fpsCap;
    low1 = Math.min(low1, game.fpsCap * 0.95);
    limitedBy = 'cap';
  }
  const { tone, verdict } = refreshVerdict(fps, refreshHz, game.fpsCap);
  return { game, fps, low1, cpuFps: p.cpuFps, gpuFps: p.gpuFps, limitedBy, tone, verdict };
}

export function refreshVerdict(fps: number, hz: number, cap?: number): { tone: Tone; verdict: string } {
  if (cap && cap < hz && fps >= cap * 0.97) return { tone: 'good', verdict: `Runs at the game's ${cap} FPS cap` };
  if (fps >= hz * 0.98) return { tone: 'good', verdict: `Maxes out your ${hz} Hz monitor` };
  if (fps >= hz * 0.8 && fps >= 60) return { tone: 'good', verdict: `Near ${hz} Hz: smooth with G-Sync / FreeSync` };
  if (fps >= 60) return { tone: 'warning', verdict: `Smooth, but below your ${hz} Hz` };
  if (fps >= 40) return { tone: 'serious', verdict: 'Playable; lower a few settings for smoother play' };
  return { tone: 'critical', verdict: 'Too slow at this preset; lower settings or resolution' };
}

export function simulateGames(build: Build, list: Game[], res: Resolution, refreshHz: number): GameResult[] {
  return list.map((g) => simulateGame(build, g, res, refreshHz));
}
