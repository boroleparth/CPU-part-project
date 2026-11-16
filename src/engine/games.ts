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
  /** Two-word version of the verdict for compact lists. */
  short: string;
  /** 1% lows far below the average: noticeable stutter. */
  stutter: boolean;
}

/** Estimated frame rates for one game, and how they compare with the monitor's refresh rate. */
export function simulateGame(build: Build, game: Game, res: Resolution, refreshHz: number): GameResult {
  const p = simulateFps(build, game, res);
  let fps = p.fps;
  let limitedBy: GameResult['limitedBy'] = p.limitedBy;
  // From the frame-rate model: CPU-bound frames, VRAM spill and RAM paging make dips worse.
  let low1 = p.low1;
  if (game.fpsCap && fps >= game.fpsCap) {
    fps = game.fpsCap;
    low1 = Math.min(low1, game.fpsCap * 0.95);
    limitedBy = 'cap';
  }
  const { tone, verdict, short } = refreshVerdict(fps, refreshHz, game.fpsCap);
  return { game, fps, low1, cpuFps: p.cpuFps, gpuFps: p.gpuFps, limitedBy, tone, verdict, short, stutter: low1 < fps * 0.6 };
}

export function refreshVerdict(fps: number, hz: number, cap?: number): { tone: Tone; verdict: string; short: string } {
  if (cap && cap < hz && fps >= cap * 0.97) return { tone: 'good', verdict: `Runs at the game's ${cap} FPS cap`, short: `${cap} FPS cap` };
  if (fps >= hz * 0.98) return { tone: 'good', verdict: `Maxes out your ${hz} Hz monitor`, short: `Maxes ${hz} Hz` };
  if (fps >= hz * 0.8 && fps >= 60) return { tone: 'good', verdict: `Near ${hz} Hz: smooth with G-Sync / FreeSync`, short: `Near ${hz} Hz` };
  if (fps >= 60) return { tone: 'warning', verdict: `Smooth, but below your ${hz} Hz`, short: 'Smooth' };
  if (fps >= 40) return { tone: 'serious', verdict: 'Playable; lower a few settings for smoother play', short: 'Playable' };
  return { tone: 'critical', verdict: 'Too slow at this preset; lower settings or resolution', short: 'Too slow' };
}

export function simulateGames(build: Build, list: Game[], res: Resolution, refreshHz: number): GameResult[] {
  return list.map((g) => simulateGame(build, g, res, refreshHz));
}
