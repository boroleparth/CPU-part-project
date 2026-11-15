import { cpus, gpus, motherboards } from '../../data';
import { completeBuild } from '../builder';
import { checkCompatibility } from '../compatibility';
import type { Build } from '../types';
import { board, cpu, gpu, ram } from './helpers';

const errors = (b: Build) => checkCompatibility(b).filter((i) => i.severity === 'error');

describe('parts database', () => {
  it('has unique ids', () => {
    for (const list of [cpus, gpus, motherboards]) expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it('can complete every CPU into a compatible build', () => {
    for (const c of cpus) {
      const b = completeBuild({ cpu: c, gpu: gpu('rtx4060') });
      expect(b.motherboard, c.name).toBeDefined();
      expect(errors(b), c.name).toEqual([]);
    }
  });

  it('can complete every GPU into a compatible build', () => {
    for (const g of gpus) {
      const b = completeBuild({ cpu: cpu('r5-7600'), gpu: g });
      expect(errors(b), g.name).toEqual([]);
    }
  });

  it('rejects Ryzen 2000 on B550 / A520 but allows it on B450', () => {
    const base = { cpu: cpu('r5-2600'), ram: ram('ddr4-2x16-3200'), gpu: gpu('gtx1660s') };
    expect(errors({ ...base, motherboard: board('am4-b550-atx') }).length).toBeGreaterThan(0);
    expect(errors({ ...base, motherboard: board('am4-a520-matx') }).length).toBeGreaterThan(0);
    expect(errors({ ...base, motherboard: board('am4-b450-matx') })).toEqual([]);
  });

  it('keeps Intel 10th/11th gen on LGA1200 with DDR4', () => {
    const b = completeBuild({ cpu: cpu('i5-10400f'), gpu: gpu('gtx1660s') });
    expect(b.motherboard!.socket).toBe('LGA1200');
    expect(b.ram!.type).toBe('DDR4');
  });
});

/** Well-known real-world equivalences (raster, from widely published reviews), within ~12%. */
const close = (a: number, b: number) => Math.abs(a / b - 1) <= 0.12;
describe('relative ratings match known pairings', () => {
  const pairs: [string, string][] = [
    ['rtx3070', 'rtx2080ti'],
    ['rtx3060ti', 'rtx2080s'],
    ['rx6800xt', 'rtx3080'],
    ['rx6700xt', 'rtx3060ti'],
    ['rtx4070', 'rtx3080'],
    ['gtx1080ti', 'rtx2070s'],
    ['rx5700xt', 'rtx2070'],
    ['gtx1660s', 'gtx1660ti'],
    ['rx580', 'gtx1060'],
    ['vega64', 'gtx1080'],
    ['vega56', 'gtx1070ti'],
    ['radeon7', 'rtx2080'],
    ['rtx5050', 'rtx4060'],
    ['rx9060xt8', 'rtx5060ti8'],
  ];
  for (const [a, b] of pairs) {
    it(`${gpu(a).name} ≈ ${gpu(b).name}`, () => expect(close(gpu(a).rasterIndex, gpu(b).rasterIndex)).toBe(true));
  }

  it('orders each GPU family sensibly', () => {
    const chain = ['gtx1050ti', 'gtx1650', 'gtx1060', 'gtx1660', 'rtx2060', 'rtx3060-12', 'rtx3060ti', 'rtx3070', 'rtx3080', 'rtx3090', 'rtx4080', 'rtx4090', 'rtx5090'];
    for (let i = 1; i < chain.length; i++) expect(gpu(chain[i]).rasterIndex).toBeGreaterThan(gpu(chain[i - 1]).rasterIndex);
  });

  it('orders CPUs sensibly for gaming', () => {
    const chain = ['r5-2600', 'r5-3600', 'r5-5600', 'r7-5800x3d', 'r7-7800x3d', 'r7-9800x3d'];
    for (let i = 1; i < chain.length; i++) expect(cpu(chain[i]).gamingIndex).toBeGreaterThan(cpu(chain[i - 1]).gamingIndex);
    expect(cpu('i5-10400f').gamingIndex).toBeLessThan(cpu('i5-12400f').gamingIndex);
  });

  it('penalises an x4 card on a PCIe 3.0 board', async () => {
    const { pcieFactor } = await import('../simulation');
    expect(pcieFactor({ gpu: gpu('rx6500xt'), cpu: cpu('r5-2600'), motherboard: board('am4-b450-matx') })).toBeLessThan(0.8);
    expect(pcieFactor({ gpu: gpu('rx6500xt'), cpu: cpu('r5-7600'), motherboard: board('am5-b650-atx') })).toBeGreaterThan(0.85);
  });

  it('gives K and KF (and F / non-F) models the same performance', () => {
    for (const [a, b] of [['i9-14900k', 'i9-14900kf'], ['i5-13600k', 'i5-13600kf'], ['i5-12400', 'i5-12400f'], ['i7-9700k', 'i7-9700kf']]) {
      expect(cpu(a).gamingIndex).toBe(cpu(b).gamingIndex);
      // Multi- and single-core come from separate PassMark measurements of each model,
      // so twins differ by sampling noise; allow 5% on the raw scores.
      for (const m of ['multiIndex', 'singleIndex'] as const) {
        const ra = cpu(a).source?.[m]?.raw ?? cpu(a)[m] ?? 0;
        const rb = cpu(b).source?.[m]?.raw ?? cpu(b)[m] ?? 0;
        expect(Math.abs(ra / rb - 1), `${a}/${b} ${m}`).toBeLessThan(0.05);
      }
      expect(cpu(a).hasIgpu).not.toBe(cpu(b).hasIgpu);
    }
  });

  it('orders each CPU family across generations', () => {
    const amd = ['r5-1600', 'r5-2600', 'r5-3600', 'r5-5600', 'r5-7600', 'r5-9600x'];
    const intel = ['i5-8400', 'i5-9400f', 'i5-10400f', 'i5-11400f', 'i5-12400f', 'i5-13400f', 'i5-14400f'];
    for (const chain of [amd, intel]) for (let i = 1; i < chain.length; i++) expect(cpu(chain[i]).gamingIndex).toBeGreaterThan(cpu(chain[i - 1]).gamingIndex);
    expect(cpu('r5-5600x3d').gamingIndex).toBeGreaterThan(cpu('r5-5600x').gamingIndex);
  });
});

describe('older platforms', () => {
  it('rejects Ryzen 1000 on B550 / X570 / A520 and allows it on B450', () => {
    const base = { cpu: cpu('r5-1600'), ram: ram('ddr4-2x16-3200'), gpu: gpu('rx580') };
    for (const b of ['am4-b550-atx', 'am4-x570-atx', 'am4-a520-matx']) expect(errors({ ...base, motherboard: board(b) }).length, b).toBeGreaterThan(0);
    expect(errors({ ...base, motherboard: board('am4-b450-matx') })).toEqual([]);
  });

  it('puts Intel 8th / 9th gen on an LGA1151 DDR4 board', () => {
    for (const id of ['i5-8400', 'i7-9700k']) {
      const b = completeBuild({ cpu: cpu(id), gpu: gpu('gtx1070') });
      expect(b.motherboard!.socket).toBe('LGA1151');
      expect(errors(b)).toEqual([]);
    }
  });

  it('gives APUs real integrated graphics, stronger on newer chips', async () => {
    const { igpuIndex } = await import('../simulation');
    expect(igpuIndex(cpu('r7-8700g'))).toBeGreaterThan(igpuIndex(cpu('r5-5600g')));
    expect(igpuIndex(cpu('r5-5600g'))).toBeGreaterThan(igpuIndex(cpu('r3-2200g')));
    expect(igpuIndex(cpu('i5-12400f'))).toBe(0);
  });
});
