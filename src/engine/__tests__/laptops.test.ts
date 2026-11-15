import { catalog, laptopCpus, laptopGpus, partFits, powerVersions } from '../../data';
import { tgpScale } from '../../data/laptops';
import { completeBuild } from '../builder';
import { checkCompatibility, effectiveRamSpeed } from '../compatibility';
import { simulateGames } from '../games';
import { games } from '../../data/games';
import { suggest } from '../recommend';
import { evaluateBuild } from '../simulation';
import { decodeState, defaultState, encodeState } from '../../state';
import type { Build } from '../types';
import { cpu, gpu, laptopCpu, laptopGpu, ram, storage } from './helpers';

const errors = (b: Build) => checkCompatibility(b).filter((i) => i.severity === 'error');

/** The laptop that started this: i7-11800H, 2x8 GB DDR4-3200, RTX 3060 Laptop, 512 GB SSD. */
const myLaptop = (tgp = 95): Build => ({
  cpu: laptopCpu('i7-11800h'),
  gpu: laptopGpu(`rtx3060m-${tgp}`),
  ram: ram('ddr4-2x8-3200'),
  storage: storage('nvme3-512'),
});

describe('laptop data', () => {
  it('has unique ids across desktop and laptop parts', () => {
    for (const list of [catalog.cpu, catalog.gpu]) expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it('marks every laptop part, and every GPU family has exactly one typical power version', () => {
    expect(laptopCpus.every((c) => c.laptop && c.socket === 'BGA' && c.brand === 'Intel')).toBe(true);
    expect(laptopGpus.every((g) => g.laptop && g.brand === 'NVIDIA')).toBe(true);
    const families = new Set(laptopGpus.map((g) => g.family));
    for (const f of families) expect(laptopGpus.filter((g) => g.family === f && g.typical).length, f).toBe(1);
  });

  it('gets slower at lower graphics power, by 25-45% at the lowest version', () => {
    for (const g of laptopGpus.filter((x) => x.typical)) {
      const v = powerVersions(g);
      for (let i = 1; i < v.length; i++) expect(v[i].rasterIndex).toBeGreaterThanOrEqual(v[i - 1].rasterIndex);
    }
    expect(tgpScale(60, 130)).toBeGreaterThan(0.65);
    expect(tgpScale(60, 130)).toBeLessThan(0.8);
  });

  it('places laptop chips sensibly against desktop ones', () => {
    // A full-power laptop RTX 3060 is a little slower than the desktop card; a 4090 Laptop is far below the desktop 4090.
    expect(laptopGpu('rtx3060m-130').rasterIndex).toBeLessThan(gpu('rtx3060-12').rasterIndex);
    expect(laptopGpu('rtx3060m-130').rasterIndex).toBeGreaterThan(gpu('rtx3060-12').rasterIndex * 0.8);
    expect(laptopGpu('rtx4090m-175').rasterIndex).toBeLessThan(gpu('rtx4090').rasterIndex * 0.65);
    // An i7-11800H games a bit below the desktop i7-11700K; an i9-14900HX is quicker than both.
    expect(laptopCpu('i7-11800h').gamingIndex).toBeLessThan(cpu('i7-11700k').gamingIndex);
    expect(laptopCpu('i9-14900hx').gamingIndex).toBeGreaterThan(cpu('i7-11700k').gamingIndex);
    // Newer generations are faster.
    const chain = ['i7-10750h', 'i7-11800h', 'i7-12700h', 'i7-13700hx', 'i9-14900hx'];
    for (let i = 1; i < chain.length; i++) expect(laptopCpu(chain[i]).multiIndex).toBeGreaterThan(laptopCpu(chain[i - 1]).multiIndex);
  });

  it('keeps laptop and desktop parts apart in the part lists', () => {
    expect(partFits('cpu', laptopCpu('i7-11800h'), 'desktop')).toBe(false);
    expect(partFits('cpu', laptopCpu('i7-11800h'), 'laptop')).toBe(true);
    expect(partFits('gpu', gpu('rtx4060'), 'laptop')).toBe(false);
    expect(partFits('ram', ram('lpddr5x-16-8533'), 'desktop')).toBe(false);
    expect(partFits('ram', ram('ddr4-2x8-3200'), 'laptop')).toBe(true);
    expect(partFits('psu', catalog.psu[0], 'laptop')).toBe(false);
  });
});

describe('checking a laptop', () => {
  it('fills only memory and storage, never desktop parts', () => {
    for (const c of laptopCpus) {
      const b = completeBuild({ cpu: c, gpu: laptopGpu('rtx4060m-115') });
      expect(b.motherboard ?? b.psu ?? b.cooler ?? b.case, c.name).toBeUndefined();
      expect(b.ram, c.name).toBeDefined();
      expect(c.memTypes).toContain(b.ram!.type);
      expect(b.storage).toBeDefined();
      expect(errors(b), c.name).toEqual([]);
    }
  });

  it('drops desktop parts left over from a desktop build', () => {
    const b = completeBuild({ ...myLaptop(), psu: catalog.psu[0], case: catalog.case[0] });
    expect(b.psu).toBeUndefined();
    expect(b.case).toBeUndefined();
  });

  it('rejects mixing laptop and desktop parts', () => {
    expect(errors({ cpu: laptopCpu('i7-11800h'), gpu: gpu('rtx4060') }).length).toBeGreaterThan(0);
    expect(errors({ cpu: cpu('i5-12400'), gpu: laptopGpu('rtx4060m-115') }).length).toBeGreaterThan(0);
  });

  it('runs laptop memory at the rated speed, without a "wasted speed" note', () => {
    const b = { cpu: laptopCpu('i7-10750h'), ram: ram('ddr4-2x8-3200') };
    expect(effectiveRamSpeed(b)).toBe(2933);
    expect(checkCompatibility(b).some((i) => i.slots.includes('ram') && i.severity === 'info')).toBe(false);
  });

  it('gives sensible results for an i7-11800H + RTX 3060 Laptop', () => {
    const ev = evaluateBuild(myLaptop(), ['aaa', 'esports'], '1080p');
    const aaa = ev.results[0].judged!;
    // Reviews put a ~95 W laptop 3060 at roughly 45-70 FPS in heavy AAA games at 1080p high.
    expect(aaa.fps).toBeGreaterThan(38);
    expect(aaa.fps).toBeLessThan(75);
    expect(aaa.limitedBy).toBe('gpu');
    expect(errors(myLaptop())).toEqual([]);
    // More graphics power = more FPS.
    const full = evaluateBuild(myLaptop(130), ['aaa'], '1080p').results[0].judged!;
    expect(full.fps).toBeGreaterThan(aaa.fps * 1.08);
    const g = simulateGames(myLaptop(), games, '1080p', 144);
    expect(g.every((x) => x.fps > 30)).toBe(true);
  });

  it('suggests laptops (not part swaps) and a higher-power version of the same chip', () => {
    const b = myLaptop(60);
    const s = suggest(b, evaluateBuild(b, ['aaa'], '1080p').results, '1080p');
    expect(s.some((x) => x.id.startsWith('tgp-') && x.changes.gpu?.id === 'rtx3060m-130')).toBe(true);
    for (const x of s) {
      expect(x.title).not.toMatch(/^Upgrade (CPU|GPU)/);
      expect(x.changes.motherboard ?? x.changes.psu ?? x.changes.case ?? x.changes.cooler).toBeUndefined();
      if (x.changes.gpu) expect(x.changes.gpu.laptop).toBe(true);
      if (x.changes.cpu) expect(x.changes.cpu.laptop).toBe(true);
    }
  });

  it('suggests a second stick for a single-stick laptop', () => {
    const b = { ...myLaptop(), ram: ram('ddr4-1x8-3200') };
    const s = suggest(b, evaluateBuild(b, ['office'], '1080p').results, '1080p');
    expect(s.some((x) => x.changes.ram && x.changes.ram.sticks === 2 && x.changes.ram.type === 'DDR4')).toBe(true);
  });

  it('round-trips a laptop through the share link', () => {
    const state = { ...defaultState(), device: 'laptop' as const, build: myLaptop(), workloads: ['aaa' as const], chosen: [] };
    const back = decodeState(`#${encodeState(state)}`)!;
    expect(back.device).toBe('laptop');
    expect(back.build.gpu?.id).toBe('rtx3060m-95');
    expect(back.build.cpu?.id).toBe('i7-11800h');
  });
});
