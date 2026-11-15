import { evaluateBuild, evaluateWorkload } from '../simulation';
import { suggest } from '../recommend';
import { checkCompatibility, recommendedPsuWatts } from '../compatibility';
import { completeBuild } from '../builder';
import type { Build } from '../types';
import { board, cooler, cpu, goodBuild, gpu, psu, ram } from './helpers';

const apply = (b: Build, changes: Build): Build => ({ ...b, ...changes });

describe('suggest', () => {
  it('offers a CPU upgrade that actually raises FPS when CPU-bound', () => {
    const b: Build = { ...goodBuild(), cpu: cpu('r5-5600'), motherboard: board('am4-b550-atx'), ram: ram('ddr4-2x16-3600'), gpu: gpu('rtx4090'), psu: psu('psu-850'), cooler: cooler('tower-single') };
    const e = evaluateBuild(b, ['aaa'], '1080p');
    const s = suggest(b, e.results, '1080p').filter((x) => x.changes.cpu);
    expect(s.length).toBeGreaterThan(0);
    const before = e.results[0].judged!.fps;
    for (const x of s) expect(evaluateWorkload(apply(b, x.changes), 'aaa', '1080p').judged!.fps).toBeGreaterThan(before * 1.1);
    // Cross-platform suggestions bring a matching board and RAM.
    const cross = s.find((x) => x.changes.cpu!.socket !== 'AM4');
    if (cross) {
      expect(cross.changes.motherboard?.socket).toBe(cross.changes.cpu!.socket);
      expect(cross.changes.ram?.type).toBe(cross.changes.motherboard!.memType);
    }
  });

  it('offers a GPU upgrade or a cheaper CPU when the CPU is overkill', () => {
    const b: Build = { ...goodBuild(), cpu: cpu('r7-9800x3d'), gpu: gpu('rtx4060') };
    const e = evaluateBuild(b, ['aaa'], '1440p');
    const s = suggest(b, e.results, '1440p');
    expect(s.some((x) => x.kind === 'upgrade' && x.changes.gpu)).toBe(true);
    expect(s.some((x) => x.kind === 'save' && x.changes.cpu)).toBe(true);
  });

  it('offers a motherboard fix for a socket mismatch', () => {
    const b: Build = { ...goodBuild(), cpu: cpu('i5-14600k') };
    const s = suggest(b, evaluateBuild(b, ['aaa'], '1440p').results, '1440p');
    const fix = s.find((x) => x.changes.motherboard);
    expect(fix?.changes.motherboard?.socket).toBe('LGA1700');
  });

  it('upgraded GPU suggestions include a PSU sized for the new card', () => {
    const b: Build = { ...goodBuild(), cpu: cpu('r7-9800x3d'), gpu: gpu('rtx4060'), psu: psu('psu-450') };
    const s = suggest(b, evaluateBuild(b, ['aaa'], '1080p').results, '1080p').find((x) => x.changes.gpu);
    expect(s).toBeDefined();
    const after = apply(b, s!.changes);
    expect(after.gpu!.power).toBeGreaterThan(b.gpu!.power);
    expect(after.psu!.watts).toBeGreaterThanOrEqual(recommendedPsuWatts(after));
  });

  it('suggests adding a matching graphics card when there is none (gaming)', () => {
    // Regression: CPU only, gaming selected → used to say "nothing to change".
    const b: Build = completeBuild({ cpu: cpu('r5-7600') });
    for (const [id, res] of [['esports', '1440p'], ['aaa', '1080p'], ['aaa', '4K']] as const) {
      const e = evaluateBuild(b, [id], res);
      expect(e.results[0].score).toBeLessThan(40);
      expect(e.results[0].headline).toMatch(/No graphics card/);
      const s = suggest(b, e.results, res).find((x) => x.changes.gpu);
      expect(s).toBeDefined();
      const after = apply(b, s!.changes);
      expect(evaluateWorkload(after, id, res).score).toBeGreaterThanOrEqual(75);
      expect(checkCompatibility(after).filter((i) => i.severity === 'error')).toEqual([]);
    }
  });

  it('suggests a graphics card for GPU-heavy creator work when there is none', () => {
    const b: Build = completeBuild({ cpu: cpu('r7-7700x') });
    const e = evaluateBuild(b, ['render3d'], '1440p');
    expect(suggest(b, e.results, '1440p').some((x) => x.changes.gpu)).toBe(true);
  });

  it('suggests parts that are still sold new for a modern build', async () => {
    const { isLegacyCpu, isLegacyGpu } = await import('../../data');
    for (const [c, g, res] of [['r5-7600', 'rtx4060', '4K'], ['r7-9800x3d', 'rtx4060', '1440p'], ['r5-7600', undefined, '1440p']] as const) {
      const b = completeBuild({ cpu: cpu(c), gpu: g ? gpu(g) : undefined });
      for (const s of suggest(b, evaluateBuild(b, ['aaa'], res).results, res)) {
        if (s.changes.gpu) expect(isLegacyGpu(s.changes.gpu), s.title).toBe(false);
        if (s.changes.cpu) expect(isLegacyCpu(s.changes.cpu), s.title).toBe(false);
      }
    }
  });

  it('can still suggest a drop-in upgrade on an older platform', () => {
    const b = completeBuild({ cpu: cpu('r5-1600'), gpu: gpu('rtx3070') });
    const s = suggest(b, evaluateBuild(b, ['aaa'], '1080p').results, '1080p').filter((x) => x.changes.cpu);
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((x) => x.changes.cpu!.socket === 'AM4')).toBe(true);
  });
});
