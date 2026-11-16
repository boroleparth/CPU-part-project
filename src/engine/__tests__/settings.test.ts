import { games } from '../../data/games';
import { completeBuild } from '../builder';
import { simulateGame } from '../games';
import { suggest } from '../recommend';
import { applySettings, DEFAULT_SETTINGS, fittedSettings, settingsLabel, upscalerName } from '../settings';
import { evaluateBuild, evaluateWorkload } from '../simulation';
import type { Build, GameSettings, Preset, Resolution, Upscaling } from '../types';
import { workloadById } from '../workloads';
import { cpu, gpu, laptopCpu, laptopGpu, ram, storage } from './helpers';

const S = (preset: Preset, upscaling: Upscaling = 'off'): GameSettings => ({ preset, upscaling });
const game = (id: string) => games.find((g) => g.id === id)!;
const fps = (b: Build, id: string, res: Resolution, s: GameSettings) => simulateGame(b, game(id), res, 144, s).fps;

const mid = completeBuild({ cpu: cpu('r5-7600'), gpu: gpu('rtx4070s'), ram: ram('ddr5-2x16-6000') });
const cpuBound = completeBuild({ cpu: cpu('r5-5600'), gpu: gpu('rtx4090'), ram: ram('ddr4-2x16-3600') });
/** The user's ASUS TUF F15: i7-11800H, RTX 3060 Laptop 95 W (6 GB), 2x8 GB. */
const tuf: Build = { cpu: laptopCpu('i7-11800h'), gpu: laptopGpu('rtx3060m-95'), ram: ram('ddr4-2x8-3200'), storage: storage('nvme3-512') };

describe('graphics preset', () => {
  it('leaves the calibrated model untouched at the default (High, no upscaling)', () => {
    expect(applySettings(workloadById.aaa as never, DEFAULT_SETTINGS)).toBe(workloadById.aaa);
    expect(evaluateBuild(mid, ['aaa', 'esports'], '1440p').overall).toBe(evaluateBuild(mid, ['aaa', 'esports'], '1440p', DEFAULT_SETTINGS).overall);
  });

  it('raises FPS from Ultra to Low in every game', () => {
    for (const g of games) {
      if (g.fpsCap) continue;
      const [low, med, high, ultra] = (['low', 'medium', 'high', 'ultra'] as Preset[]).map((p) => fps(mid, g.id, '1440p', S(p)));
      expect(low).toBeGreaterThan(med);
      expect(med).toBeGreaterThan(high);
      expect(high).toBeGreaterThan(ultra);
    }
  });

  it("is fitted at Baldur's Gate 3's Ultra, so High is faster than the measured Ultra", () => {
    expect(fittedSettings(game('bg3')).preset).toBe('ultra');
    expect(fps(mid, 'bg3', '1080p', S('high'))).toBeGreaterThan(fps(mid, 'bg3', '1080p', S('ultra')) * 1.1);
  });

  it('moves the bottleneck toward the CPU at Low', () => {
    expect(evaluateWorkload(tuf, 'aaa', '1080p', S('high')).judged!.limitedBy).toBe('gpu');
    expect(evaluateWorkload(tuf, 'aaa', '1080p', S('low')).judged!.limitedBy).toBe('cpu');
  });

  it('lowers the VRAM need: Medium clears the TUF 6 GB shortfall, Ultra deepens it', () => {
    expect(evaluateWorkload(tuf, 'aaa', '1080p', S('high')).shortfall?.part).toBe('VRAM');
    expect(evaluateWorkload(tuf, 'aaa', '1080p', S('medium')).shortfall?.part).not.toBe('VRAM');
    expect(evaluateWorkload(tuf, 'aaa', '1080p', S('ultra')).score).toBeLessThan(evaluateWorkload(tuf, 'aaa', '1080p', S('high')).score);
  });

  it('only suggests more VRAM when the chosen preset needs it', () => {
    const vramFix = (s: GameSettings) => suggest(tuf, evaluateBuild(tuf, ['aaa'], '1080p', s).results, '1080p', s).some((x) => x.id.startsWith('vram-'));
    expect(vramFix(S('high'))).toBe(true);
    expect(vramFix(S('medium'))).toBe(false);
  });
});

describe('upscaling', () => {
  it('helps more at 4K than at 1080p (typical DLSS Quality gains)', () => {
    const gain = (res: Resolution) => fps(mid, 'cyberpunk', res, S('high', 'quality')) / fps(mid, 'cyberpunk', res, S('high'));
    expect(gain('4K')).toBeGreaterThan(gain('1080p'));
    expect(gain('1440p')).toBeGreaterThan(1.25);
    expect(gain('1440p')).toBeLessThan(1.55);
    const perf4k = fps(mid, 'cyberpunk', '4K', S('high', 'performance')) / fps(mid, 'cyberpunk', '4K', S('high'));
    expect(perf4k).toBeGreaterThan(1.7);
    expect(perf4k).toBeLessThan(2.3);
  });

  it('does nothing in games without it, and little when the CPU is the limit', () => {
    expect(fps(mid, 'valorant', '1440p', S('high', 'performance'))).toBe(fps(mid, 'valorant', '1440p', S('high')));
    expect(fps(mid, 'eldenring', '4K', S('high', 'performance'))).toBe(fps(mid, 'eldenring', '4K', S('high')));
    expect(fps(cpuBound, 'cs2', '1080p', S('high', 'performance')) / fps(cpuBound, 'cs2', '1080p', S('high'))).toBeLessThan(1.05);
  });

  it('names the upscaler for the card', () => {
    expect(upscalerName(gpu('rtx4070s'))).toBe('DLSS');
    expect(upscalerName(gpu('rx7800xt'))).toBe('FSR');
    expect(upscalerName(undefined)).toBe('FSR');
    expect(settingsLabel(S('medium', 'quality'), gpu('rtx4070s'))).toBe('Medium · DLSS Quality');
    expect(settingsLabel(S('high'), gpu('rtx4070s'))).toBe('High');
  });

  it('shows the settings in the headline when they are not the default', () => {
    expect(evaluateWorkload(mid, 'aaa', '1440p', S('medium', 'quality')).headline).toMatch(/Medium · DLSS Quality/);
  });
});
