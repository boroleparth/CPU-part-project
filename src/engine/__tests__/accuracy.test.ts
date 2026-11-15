import { fitRaster, relativeErrors, summarise } from '../../../scripts/notebookcheck-lib';

describe('accuracy maths', () => {
  const rows = (fps: number[]) => new Map(fps.map((f, i) => [`game${i}|high|1920x1080`, f]));

  it('scores perfect predictions as 0% error, whatever the game scene', () => {
    // Chip B is exactly twice chip A, in light and heavy scenes alike.
    const measured = new Map([['a', rows([50, 100, 30])], ['b', rows([100, 200, 60])], ['c', rows([75, 150, 45])]]);
    const e = relativeErrors(measured, { a: 10, b: 20, c: 15 });
    for (const x of e.values()) {
      expect(x.meanAbs).toBeCloseTo(0, 6);
      expect(x.bias).toBeCloseTo(0, 6);
    }
  });

  it('finds a chip rated too fast', () => {
    const measured = new Map([['a', rows([50, 100, 30])], ['b', rows([100, 200, 60])], ['c', rows([75, 150, 45])]]);
    const e = relativeErrors(measured, { a: 10, b: 26, c: 15 });
    expect(e.get('b')!.bias).toBeGreaterThan(0.1);
    expect(summarise(e).worst[0]).toBe('b');
  });

  it('fits a laptop chip from desktop cards measured in the same rows', () => {
    const desktop = { raster: 25, fps: rows([100, 80, 60, 40]) };
    const fit = fitRaster(rows([85, 68, 51, 34]), [desktop])!;
    expect(fit.raster).toBeCloseTo(21.25, 6);
    expect(fit.rows).toBe(4);
  });
});
