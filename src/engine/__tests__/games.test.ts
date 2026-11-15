import { games } from '../../data/games';
import { completeBuild } from '../builder';
import { checkCompatibility } from '../compatibility';
import { refreshVerdict, simulateGame, simulateGames } from '../games';
import type { Build } from '../types';
import { cpu, gpu, ram } from './helpers';

const game = (id: string) => games.find((g) => g.id === id)!;
const build = (c: string, g: string, r: string): Build => completeBuild({ cpu: cpu(c), gpu: gpu(g), ram: ram(r) });

const highEnd = build('r7-9800x3d', 'rtx4090', 'ddr5-2x16-6000');
const midRange = build('r5-7600', 'rtx4070s', 'ddr5-2x16-6000');
const budget = build('r5-5600', 'rtx4060', 'ddr4-2x16-3600');
const zen3TiBuild = build('r9-5950x', 'rtx3060ti', 'ddr4-2x16-3600');

/**
 * Spot checks against published averages for the stated preset.
 * The bands are generous (about ±20%): they catch a broken model, not 5% drift.
 * Cyberpunk and RDR2 points are Notebookcheck measurements: RTX 4090 + Ryzen 7 9800X3D 1080p High
 * 232 FPS; RTX 4090 1440p / 4K Ultra medians 153 / 76 (High runs ~8% faster); RTX 4060 1080p High
 * 92 FPS; RTX 3060 Ti + Ryzen 9 5950X RDR2 1080p High 108 FPS.
 */
const reference: [string, Build, string, '1080p' | '1440p' | '4K', number][] = [
  ['9800X3D + 4090', highEnd, 'cyberpunk', '1080p', 232],
  ['9800X3D + 4090', highEnd, 'cyberpunk', '4K', 82],
  ['9800X3D + 4090', highEnd, 'cyberpunk', '1440p', 165],
  ['9800X3D + 4090', highEnd, 'cs2', '1080p', 600],
  ['7600 + 4070 Super', midRange, 'cyberpunk', '1440p', 95],
  ['7600 + 4070 Super', midRange, 'fortnite', '1080p', 170],
  ['5950X + 3060 Ti', zen3TiBuild, 'rdr2', '1080p', 108],
  ['5600 + 4060', budget, 'cod', '1080p', 95],
  ['5600 + 4060', budget, 'cyberpunk', '1080p', 88],
  ['5600 + 4060', budget, 'rivals', '1080p', 70],
];

describe('per-game estimates', () => {
  it('covers ten games', () => {
    expect(games).toHaveLength(10);
    expect(new Set(games.map((g) => g.id)).size).toBe(10);
  });

  for (const [label, b, id, res, expected] of reference) {
    it(`${label}: ${game(id).name} at ${res} is near ${expected} FPS`, () => {
      const fps = simulateGame(b, game(id), res, 144).fps;
      expect(fps).toBeGreaterThan(expected * 0.8);
      expect(fps).toBeLessThan(expected * 1.2);
    });
  }

  it('never exceeds an engine frame cap', () => {
    for (const b of [highEnd, midRange, budget]) {
      expect(simulateGame(b, game('eldenring'), '1080p', 240).fps).toBeLessThanOrEqual(60);
      expect(simulateGame(b, game('apex'), '1080p', 360).fps).toBeLessThanOrEqual(300);
    }
  });

  it('ranks esports titles far above heavy story games on the same PC', () => {
    const r = Object.fromEntries(simulateGames(midRange, games, '1440p', 144).map((x) => [x.game.id, x.fps]));
    // Notebookcheck, RTX 4090 at 1080p: CS2 339 FPS vs Cyberpunk 199 (~1.7x).
    expect(r.valorant).toBeGreaterThan(r.cyberpunk * 2.5);
    expect(r.cs2).toBeGreaterThan(r.cyberpunk * 1.6);
  });

  it('has 1% lows below the average', () => {
    for (const x of simulateGames(midRange, games, '1440p', 144)) expect(x.low1).toBeLessThan(x.fps);
  });

  it('lets a faster GPU raise FPS at 4K but not in CPU-bound esports at 1080p', () => {
    const slowGpu = build('r5-7600', 'rtx4060', 'ddr5-2x16-6000');
    expect(simulateGame(midRange, game('cyberpunk'), '4K', 60).fps).toBeGreaterThan(simulateGame(slowGpu, game('cyberpunk'), '4K', 60).fps * 1.5);
    const fastGpu = build('r5-7600', 'rtx4090', 'ddr5-2x16-6000');
    expect(simulateGame(fastGpu, game('valorant'), '1080p', 240).fps).toBeLessThan(simulateGame(midRange, game('valorant'), '1080p', 240).fps * 1.1);
  });
});

describe('refreshVerdict', () => {
  it('says when the monitor is fully used', () => {
    expect(refreshVerdict(150, 144).tone).toBe('good');
    expect(refreshVerdict(150, 144).verdict).toMatch(/144 Hz/);
  });
  it('grades below-refresh frame rates', () => {
    expect(refreshVerdict(90, 240).tone).toBe('warning');
    expect(refreshVerdict(45, 144).tone).toBe('serious');
    expect(refreshVerdict(25, 60).tone).toBe('critical');
  });
  it('explains frame caps below the refresh rate', () => {
    expect(refreshVerdict(60, 144, 60).verdict).toMatch(/cap/);
  });
});

describe('completeBuild', () => {
  it('fills the remaining parts with a compatible set', () => {
    for (const b of [highEnd, midRange, budget, build('i5-14400f', 'rx7600', 'ddr4-2x16-3200'), build('i5-14600k', 'rtx5070', 'ddr5-2x16-6000')]) {
      expect(b.motherboard && b.cooler && b.psu && b.case && b.storage).toBeTruthy();
      expect(checkCompatibility(b).filter((i) => i.severity === 'error')).toEqual([]);
    }
  });
  it('matches the board to the chosen RAM type on platforms that support both', () => {
    expect(build('i5-14400f', 'rx7600', 'ddr4-2x16-3200').motherboard!.memType).toBe('DDR4');
    expect(build('i5-14400f', 'rx7600', 'ddr5-2x16-6000').motherboard!.memType).toBe('DDR5');
  });
});
