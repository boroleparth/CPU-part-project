import { checkCompatibility, effectiveRamSpeed, isCompatibleChoice, recommendedPsuWatts } from '../compatibility';
import { board, cooler, cpu, goodBuild, gpu, pcCase, psu, ram } from './helpers';

const errors = (b: Parameters<typeof checkCompatibility>[0]) => checkCompatibility(b).filter((i) => i.severity === 'error');

describe('checkCompatibility', () => {
  it('passes a known-good build with no errors or warnings', () => {
    const issues = checkCompatibility(goodBuild()).filter((i) => i.severity !== 'info');
    expect(issues).toEqual([]);
  });

  it('flags a CPU socket that does not match the motherboard', () => {
    const e = errors({ ...goodBuild(), cpu: cpu('i5-14600k') });
    expect(e.some((i) => i.slots.includes('cpu') && i.slots.includes('motherboard'))).toBe(true);
  });

  it('flags DDR4 memory on a DDR5 board', () => {
    expect(errors({ ...goodBuild(), ram: ram('ddr4-2x16-3200') }).some((i) => i.slots.includes('ram'))).toBe(true);
  });

  it('allows DDR4 on an LGA1700 DDR4 board', () => {
    const b = { cpu: cpu('i5-14400f'), motherboard: board('lga1700-b760-ddr4'), ram: ram('ddr4-2x16-3600'), gpu: gpu('rtx4060') };
    expect(errors(b)).toEqual([]);
  });

  it('requires a graphics card for CPUs without integrated graphics', () => {
    const { gpu: _gpu, ...noGpu } = goodBuild();
    expect(errors({ ...noGpu, cpu: cpu('r5-5600'), motherboard: board('am4-b550-atx'), ram: ram('ddr4-2x16-3600') }).some((i) => i.slots.includes('gpu'))).toBe(true);
    expect(errors({ ...noGpu }).some((i) => i.slots.includes('gpu'))).toBe(false); // Ryzen 7600 has an iGPU
  });

  it('flags a PSU that cannot supply peak draw', () => {
    const b = { ...goodBuild(), gpu: gpu('rtx5090'), psu: psu('psu-550') };
    expect(errors(b).some((i) => i.slots.includes('psu'))).toBe(true);
    expect(recommendedPsuWatts(b)).toBeGreaterThanOrEqual(1000);
  });

  it('flags a graphics card longer than the case allows', () => {
    const b = { ...goodBuild(), motherboard: board('am5-b650-itx'), case: pcCase('case-itx'), gpu: { ...gpu('rtx4080s'), lengthMm: 340 }, cooler: cooler('aio-240') };
    expect(errors(b).some((i) => i.slots.includes('gpu') && i.slots.includes('case'))).toBe(true);
  });

  it('flags a box cooler on a CPU sold without one, and an undersized cooler', () => {
    expect(errors({ ...goodBuild(), cpu: cpu('r7-9800x3d'), cooler: cooler('stock') }).some((i) => i.slots.includes('cooler'))).toBe(true);
    expect(errors({ ...goodBuild(), cpu: cpu('r9-9950x'), cooler: cooler('lowprofile') }).some((i) => i.slots.includes('cooler'))).toBe(true);
  });

  it('flags an ATX board in a micro-ATX case', () => {
    expect(errors({ ...goodBuild(), case: pcCase('case-matx') }).some((i) => i.slots.includes('case'))).toBe(true);
  });

  it('warns when the board VRM is too weak for the CPU', () => {
    const b = { ...goodBuild(), cpu: cpu('r9-9950x'), motherboard: board('am5-a620-matx'), case: pcCase('case-mid'), cooler: cooler('aio-360'), psu: psu('psu-850') };
    expect(checkCompatibility(b).some((i) => i.severity === 'warning' && i.slots.includes('motherboard'))).toBe(true);
  });
});

describe('effectiveRamSpeed', () => {
  it('caps kit speed at what the board supports', () => {
    expect(effectiveRamSpeed({ ram: ram('ddr5-2x16-7200'), motherboard: board('am5-a620-matx') })).toBe(6000);
  });
});

describe('isCompatibleChoice', () => {
  it('rejects a part that would create an error and accepts one that would not', () => {
    const b = goodBuild();
    expect(isCompatibleChoice(b, 'cpu', cpu('i9-14900k'))).toBe(false);
    expect(isCompatibleChoice(b, 'cpu', cpu('r7-9800x3d'))).toBe(true);
  });
});
