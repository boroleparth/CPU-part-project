import { completeBuild } from '../builder';
import { compareBuilds } from '../compare';
import { cpu, gpu, ram } from './helpers';

const mk = (c: string, g: string, r = 'ddr5-2x16-6000') => completeBuild({ cpu: cpu(c), gpu: gpu(g), ram: ram(r) });

describe('compareBuilds', () => {
  it('reports identical builds as a tie', () => {
    const a = mk('r5-7600', 'rtx4070s');
    const c = compareBuilds(a, { ...a }, ['aaa'], '1440p', 144);
    expect(c.winner).toBeNull();
    expect(c.fpsRatio).toBeCloseTo(1, 5);
    expect(c.lines[0]).toMatch(/same speed/);
  });

  it('picks the faster GPU build at 4K and quantifies the gap', () => {
    const a = mk('r5-7600', 'rtx4060');
    const b = mk('r5-7600', 'rtx4070s');
    const c = compareBuilds(a, b, ['aaa'], '4K', 60);
    expect(c.winner).toBe('b');
    expect(c.fpsRatio!).toBeGreaterThan(1.4);
    expect(c.lines[0]).toMatch(/Build B is ~\d+% faster/);
  });

  it('prefers the balanced build over a bottlenecked one', () => {
    const unbalanced = mk('r5-5600', 'rtx4090', 'ddr4-2x16-3600');
    const balanced = mk('r7-7800x3d', 'rtx4070tis');
    const c = compareBuilds(unbalanced, balanced, ['aaa'], '1080p', 144);
    expect(c.winner).toBe('b');
    expect(c.a.bottlenecks.aaa).toBe('CPU');
    expect(c.lines.join(' ')).toMatch(/Build B is better balanced/);
  });

  it('prefers a faster build whose only imbalance is spare CPU power', () => {
    const a = mk('r5-5600', 'rtx4070s', 'ddr4-2x16-3600');
    const b = mk('r7-7800x3d', 'rtx4070tis');
    const c = compareBuilds(a, b, ['aaa'], '1440p', 144);
    expect(c.fpsRatio!).toBeGreaterThan(1.1);
    expect(c.winner).toBe('b');
    expect(c.reason).toMatch(/faster/);
  });

  it('is symmetric when the builds are swapped', () => {
    const a = mk('r5-7600', 'rtx4060');
    const b = mk('r7-7800x3d', 'rtx4080');
    const ab = compareBuilds(a, b, ['aaa', 'video'], '1440p', 144);
    const ba = compareBuilds(b, a, ['aaa', 'video'], '1440p', 144);
    expect(ab.winner).toBe(ba.winner === 'a' ? 'b' : ba.winner === 'b' ? 'a' : null);
    expect(ab.fpsRatio! * ba.fpsRatio!).toBeCloseTo(1, 5);
  });

  it('flags a build with parts that do not fit', () => {
    const a = mk('r5-7600', 'rtx4070s');
    const broken = { ...a, cpu: cpu('i5-14600k') };
    const c = compareBuilds(a, broken, ['aaa'], '1440p', 144);
    expect(c.winner).toBe('a');
    expect(c.lines[0]).toMatch(/Build B has parts/);
  });

  it('works without gaming (no FPS comparison)', () => {
    const c = compareBuilds(mk('r5-7600', 'rtx4060'), mk('r9-9950x', 'rtx4060'), ['video'], '1440p', 60);
    expect(c.fpsRatio).toBeUndefined();
    expect(c.a.games).toEqual([]);
  });
});
