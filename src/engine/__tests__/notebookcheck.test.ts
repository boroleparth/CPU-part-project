import calibration from '../../data/laptop-calibration.json';
import { laptopGpus, powerVersions } from '../../data';
import { median, normalisePreset, parseNotebookcheckGpuPage } from '../../../scripts/notebookcheck-lib';
import { gpu } from './helpers';

const fixture = `
<div class="gpugame_surrounding" id="gpugame_el1"><div class="gpugame_image"><h3 class="gpugame_header"><a href="#">Cyberpunk 2077</a></h3></div>
<div class="gpugame_details_sur"><div class="gpugame_details" ><abbr class="tooltip" title="High Preset"><b>high</b> 1920x1080</abbr></div>
<div class="gpugame_results"> <a href="#gb1" class="gpugame_resulta" style="x" title="y">80.6</a> <div id="gamebench_1_1" class="gpugame_benchdiv" style="display:none;"><a><b>[X]</b></a> <span style="font-style:italic;"><a href="r">Lenovo LOQ 15IRX9</a></span><br>Intel Core i5-13450HX 1.8GHz <br >GeForce RTX 4060 Laptop GPU<br></div>
<a href="#gb2" class="gpugame_resulta" title="y">70.2</a> <div id="gamebench_1_2" class="gpugame_benchdiv"><span style="font-style:italic;"><a href="r">HP Victus 16</a></span><br>Intel Core i7-13700H 2.4GHz <br >GeForce RTX 4060 Laptop GPU<br></div></div>
<div class="gpugame_details" ><b>QHD</b> 2560x1440</div><div class="gpugame_results"><a class="gpugame_resulta">55</a> <div id="gamebench_1_3" class="gpugame_benchdiv"><span style="font-style:italic;"><a href="r">Lenovo LOQ 15IRX9</a></span><br>Intel Core i5-13450HX 1.8GHz <br ></div></div></div>`;

describe('Notebookcheck parser', () => {
  it('reads game, preset, resolution and each laptop with its CPU', () => {
    const rows = parseNotebookcheckGpuPage(fixture);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ game: 'Cyberpunk 2077', preset: 'high', resolution: '1920x1080' });
    expect(rows[0].results).toEqual([
      { fps: 80.6, system: 'Lenovo LOQ 15IRX9', cpu: 'Intel Core i5-13450HX 1.8GHz' },
      { fps: 70.2, system: 'HP Victus 16', cpu: 'Intel Core i7-13700H 2.4GHz' },
    ]);
    expect(rows[1]).toMatchObject({ preset: 'ultra', resolution: '2560x1440' });
  });

  it('normalises presets and takes medians', () => {
    expect(normalisePreset('med.')).toBe('medium');
    expect(normalisePreset('4K')).toBe('ultra');
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

const cal = calibration.gpus as Record<string, { typical: number; top: number; laptops: number; rows: number }>;

describe('laptop GPUs calibrated to measured laptops', () => {
  it('covers every laptop chip with enough measurements', () => {
    const families = new Set(laptopGpus.map((g) => g.id.replace(/-\d+$/, '')));
    for (const f of families) {
      expect(cal[f], f).toBeDefined();
      expect(cal[f].rows, f).toBeGreaterThanOrEqual(500);
    }
  });

  it('uses the measured median laptop for the typical power version, with the source attached', () => {
    for (const g of laptopGpus.filter((x) => x.typical)) {
      const c = cal[g.id.replace(/-\d+$/, '')];
      expect(Math.abs(g.rasterIndex - c.typical), g.name).toBeLessThanOrEqual(0.5);
      expect(g.source?.rasterIndex?.dataset, g.name).toMatch(/Notebookcheck/);
    }
  });

  it('lands the top power version near the fastest 10% of tested laptops', () => {
    for (const g of laptopGpus.filter((x) => x.typical)) {
      const top = powerVersions(g).at(-1)!;
      const c = cal[g.id.replace(/-\d+$/, '')];
      if (c.laptops < 10 || top === g) continue;
      expect(top.rasterIndex / c.top, g.name).toBeGreaterThan(0.9);
      expect(top.rasterIndex / c.top, g.name).toBeLessThan(1.12);
    }
  });

  it('matches well-known laptop vs desktop gaps', () => {
    // A typical RTX 3060 Laptop is ~85% of the desktop RTX 3060; RTX 4060 Laptop ~87% of the desktop 4060;
    // RTX 4090 Laptop ~55% of the desktop 4090.
    const ratio = (laptopFamily: string, desktop: string) => cal[laptopFamily].typical / gpu(desktop).rasterIndex;
    expect(ratio('rtx3060m', 'rtx3060-12')).toBeGreaterThan(0.78);
    expect(ratio('rtx3060m', 'rtx3060-12')).toBeLessThan(0.95);
    expect(ratio('rtx4060m', 'rtx4060')).toBeGreaterThan(0.8);
    expect(ratio('rtx4060m', 'rtx4060')).toBeLessThan(0.95);
    expect(ratio('rtx4090m', 'rtx4090')).toBeGreaterThan(0.5);
    expect(ratio('rtx4090m', 'rtx4090')).toBeLessThan(0.62);
    // Each generation's chips are in order.
    const chain = ['rtx4050m', 'rtx4060m', 'rtx4070m', 'rtx4080m', 'rtx4090m'];
    for (let i = 1; i < chain.length; i++) expect(cal[chain[i]].typical).toBeGreaterThan(cal[chain[i - 1]].typical);
  });
});
