import { games } from '../../data/games';
import { completeBuild } from '../builder';
import { simulateGame } from '../games';
import { limitReport } from '../limits';
import { evaluateWorkload, memoryUse, simulateFps } from '../simulation';
import type { Build } from '../types';
import { workloadById } from '../workloads';
import { cpu, gpu, laptopCpu, laptopGpu, ram, storage } from './helpers';

const aaa = workloadById.aaa as Extract<(typeof workloadById)['aaa'], { kind: 'gaming' }>;
const esports = workloadById.esports as typeof aaa;
const game = (id: string) => games.find((g) => g.id === id)!;

/** The user's ASUS TUF F15: i7-11800H, RTX 3060 Laptop 95 W (6 GB), 2x8 GB DDR4-3200. */
const tuf = (ramId = 'ddr4-2x8-3200'): Build => ({
  cpu: laptopCpu('i7-11800h'),
  gpu: laptopGpu('rtx3060m-95'),
  ram: ram(ramId),
  storage: storage('nvme3-512'),
});
const balanced = completeBuild({ cpu: cpu('r5-7600'), gpu: gpu('rtx4070s'), ram: ram('ddr5-2x16-6000') });
const cpuBound = completeBuild({ cpu: cpu('r5-5600'), gpu: gpu('rtx4090'), ram: ram('ddr4-2x16-3600') });

describe('memory pressure', () => {
  it('adds Windows, background apps, the game and VRAM overflow', () => {
    const m = memoryUse(tuf(), aaa, '1080p');
    expect(m.spillGb).toBe(2); // 8 GB needed, 6 GB on the card
    expect(m.usedGb).toBeCloseTo(m.windowsGb + m.backgroundGb + m.gameGb + 2);
    expect(m.pressure).toBeGreaterThan(1); // 16 GB is full: Windows pages to the drive
    expect(memoryUse(tuf('ddr4-2x16-3200'), aaa, '1080p').pressure).toBeLessThan(0.6);
  });

  it('counts integrated graphics memory as RAM', () => {
    const apu: Build = { cpu: cpu('r7-8700g'), ram: ram('ddr5-2x8-5200') };
    const m = memoryUse(apu, esports, '1080p');
    expect(m.shared).toBe(true);
    expect(m.spillGb).toBeGreaterThan(0);
    expect(m.usedGb).toBeGreaterThan(memoryUse(balanced, esports, '1080p').usedGb);
  });

  it('adds OBS while streaming', () => {
    const streaming = workloadById.streaming as typeof aaa;
    expect(memoryUse(balanced, streaming, '1080p').usedGb).toBeGreaterThan(memoryUse(balanced, aaa, '1080p').usedGb);
  });
});

describe('GPU busy and CPU main thread', () => {
  it('shows the TUF GPU waiting on graphics memory (not 100% busy)', () => {
    const p = simulateFps(tuf(), aaa, '1080p');
    expect(p.limitedBy).toBe('gpu');
    expect(p.stall).toBe('vram');
    expect(p.gpuBusy).toBeGreaterThan(0.6);
    expect(p.gpuBusy).toBeLessThan(0.9);
  });

  it('keeps a balanced GPU-limited build near 100% GPU busy', () => {
    const p = simulateFps(balanced, aaa, '1080p');
    expect(p.stall).toBeUndefined();
    expect(p.gpuBusy).toBeGreaterThan(0.95);
  });

  it('reports a CPU bottleneck as a full main thread while Task Manager shows far less', () => {
    const p = simulateFps(cpuBound, aaa, '1080p');
    expect(p.mainThread).toBeGreaterThan(0.95);
    expect(p.cpuTotal).toBeLessThan(0.5);
    expect(p.gpuBusy).toBeLessThan(0.7);
  });

  it('shows more Task Manager load for heavily threaded games', () => {
    const cs2 = simulateFps(cpuBound, game('cs2'), '1080p');
    const cod = simulateFps(cpuBound, game('cod'), '1080p');
    expect(cod.cpuTotal).toBeGreaterThan(cs2.cpuTotal);
  });
});

describe('1% lows', () => {
  const ratio = (b: Build, id = 'cyberpunk') => {
    const r = simulateGame(b, game(id), '1080p', 144);
    return r.low1 / r.fps;
  };

  it('are worse on a CPU-bound build than a GPU-bound one', () => {
    expect(ratio(cpuBound)).toBeLessThan(ratio(balanced));
  });

  it('suffer from VRAM spill and full RAM, and recover with 32 GB', () => {
    expect(ratio(tuf())).toBeLessThan(ratio(balanced) - 0.1);
    expect(ratio(tuf('ddr4-2x16-3200'))).toBeGreaterThan(ratio(tuf()));
  });

  it('get worse with one stick and a hard drive, better with a large-cache CPU', () => {
    expect(ratio({ ...balanced, ram: ram('ddr5-1x16-5600') })).toBeLessThan(ratio(balanced));
    expect(ratio({ ...balanced, storage: storage('hdd-2tb') })).toBeLessThan(ratio(balanced));
    const x3d = completeBuild({ cpu: cpu('r7-9800x3d'), gpu: gpu('rtx4090'), ram: ram('ddr5-2x16-6000') });
    const nonX3d = completeBuild({ cpu: cpu('r5-7600'), gpu: gpu('rtx4090'), ram: ram('ddr5-2x16-6000') });
    expect(ratio(x3d, 'cs2')).toBeGreaterThan(ratio(nonX3d, 'cs2'));
  });

  it('warn of stutter on the TUF in AAA games', () => {
    const r = evaluateWorkload(tuf(), 'aaa', '1080p');
    expect(r.notes.some((n) => /Expect stutter/.test(n))).toBe(true);
    expect(evaluateWorkload(balanced, 'aaa', '1080p').notes.some((n) => /Expect stutter/.test(n))).toBe(false);
  });
});

describe('limit report wording', () => {
  it('explains the TUF: main thread, GPU waiting on VRAM, RAM full', () => {
    const b = tuf();
    const rep = limitReport(b, evaluateWorkload(b, 'aaa', '1080p'), '1080p');
    const item = (part: string) => rep.items.find((i) => i.part === part)!;
    expect(item('CPU').label).toMatch(/^Main thread \d+%$/);
    expect(item('CPU').hint).toMatch(/Task Manager would show ~\d+%/);
    expect(item('GPU').hint).toMatch(/graphics memory/);
    expect(item('RAM').label).toMatch(/used of 16 GB/);
    expect(item('RAM').hint).toMatch(/Windows .* \+ apps .* \+ game .* \+ VRAM overflow 2 GB/);
    expect(item('RAM').hint).toMatch(/swaps to the drive/);
  });
});
