import { cpus, gpus } from '../../data';
import { cpus as estimatedCpus } from '../../data/cpus';
import { cpuKey, gpuKey, gpuVariants, match, parseLlamaScoreboard, parsePassmarkChart, parsePassmarkList, toIndex } from '../../../scripts/benchmarks-lib';
import { estimateAi } from '../simulation';
import { gpu } from './helpers';

describe('benchmark import: parsing', () => {
  it('reads PassMark list rows', () => {
    const html = '<tr id="cpu1"><td><a href="/cpu_lookup.php?cpu=AMD+Ryzen+7+9800X3D&amp;id=1">AMD Ryzen 7 9800X3D</a></td><td>39,911</td><td>400</td></tr>';
    expect(parsePassmarkList(html)).toEqual([{ name: 'AMD Ryzen 7 9800X3D', raw: 39911 }]);
  });

  it('reads PassMark chart bars', () => {
    const html = '<li><a href="x"><span class="prdname">Intel Core i9-14900K</span><div><span class="index">(90%)</span></div><span class="count">4,700</span></a></li>';
    expect(parsePassmarkChart(html)).toEqual([{ name: 'Intel Core i9-14900K', raw: 4700 }]);
  });

  it('reads the llama.cpp scoreboard tg128 column from the no-FA table only', () => {
    const row = (n: string, tg: string) => `<tr><td>${n}</td><td>1000 ± 1</td><td>${tg}</td><td>abc</td><td></td></tr>`;
    const html = `Llama 2 7B, Q4_0, no FA<table><tr><th>Chip</th></tr>${row('Nvidia RTX 5090', '263.63 ± 0.91')}</table>
      Llama 2 7B, Q4_0, FA enabled<table>${row('Nvidia RTX 5090', '273.68 ± 0.52')}</table>`;
    expect(parseLlamaScoreboard(html)).toEqual([{ name: 'Nvidia RTX 5090', raw: 263.63 }]);
  });
});

describe('benchmark import: matching and scaling', () => {
  it('normalises CPU names (clock and iGPU suffixes)', () => {
    expect(cpuKey('Intel Core i7-8700K @ 3.70GHz')).toBe('intel core i7-8700k');
    expect(cpuKey('AMD Ryzen 5 8600G w/ Radeon 760M Graphics')).toBe('amd ryzen 5 8600g');
  });

  it('normalises GPU names and keeps laptop chips apart', () => {
    expect(gpuKey('GeForce RTX 5060 Ti 16GB')).toBe(gpuKey('Nvidia RTX 5060 Ti'));
    expect(gpuKey('Nvidia RTX 4060 Mobile')).not.toBe(gpuKey('GeForce RTX 4060'));
  });

  it('never matches a non-X part to an X part', () => {
    const parts = [{ id: 'a', name: 'Ryzen 5 7600' }, { id: 'b', name: 'Ryzen 5 7600X' }];
    const m = match(parts, (p) => cpuKey(`AMD ${p.name}`), cpuKey, [{ name: 'AMD Ryzen 5 7600X', raw: 10 }]);
    expect([...m.keys()]).toEqual(['b']);
  });

  it('gives a size-less GPU result only to the launch variant when bandwidth differs', () => {
    expect(gpuVariants([gpu('rtx3060-12'), gpu('rtx3060-8')]).map((g) => g.id)).toEqual(['rtx3060-12']);
    expect(gpuVariants([gpu('rtx3080'), gpu('rtx3080-12')]).map((g) => g.id)).toEqual(['rtx3080']);
    expect(gpuVariants([gpu('rtx5060ti16'), gpu('rtx5060ti8')])).toHaveLength(2);
  });

  it('scales to fastest = 100', () => {
    expect(toIndex(50, 50)).toBe(100);
    expect(toIndex(25, 50)).toBe(50);
    expect(toIndex(2, 50)).toBe(4);
  });
});

describe('sourced catalog', () => {
  it('has a source for every sourced metric and keeps estimates otherwise', () => {
    for (const c of cpus) {
      const est = estimatedCpus.find((e) => e.id === c.id)!;
      if (c.source?.multiIndex) expect(c.source.multiIndex.raw).toBeGreaterThan(0);
      else expect(c.multiIndex).toBe(est.multiIndex);
      expect(c.source?.gamingIndex === undefined ? c.gamingIndex === est.gamingIndex : true).toBe(true);
    }
  });

  it('has exactly one part at 100 for each sourced metric', () => {
    expect(cpus.filter((c) => c.source?.multiIndex && c.multiIndex === 100).length).toBe(1);
    expect(cpus.filter((c) => c.source?.singleIndex && c.singleIndex === 100).length).toBe(1);
    expect(gpus.filter((g) => g.source?.aiIndex && g.aiIndex === 100).length).toBe(1);
  });

  it('keeps every index within 0-100', () => {
    for (const c of cpus) for (const v of [c.gamingIndex, c.multiIndex, c.singleIndex ?? 0]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
    for (const g of gpus) for (const v of [g.rasterIndex, g.rtIndex, g.aiIndex ?? 0]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
  });

  it('uses the measured llama.cpp speed for local AI where available', () => {
    const g = gpu('rtx4090');
    expect(g.source?.aiIndex?.unit).toBe('tokens/s');
    // 188 t/s on a 3.83 GB model -> about 147 t/s on the 4.9 GB 8B model.
    expect(estimateAi({ gpu: g }).tokensPerSec8B).toBeCloseTo((g.source!.aiIndex!.raw * 3.83) / 4.9, 5);
  });
});
