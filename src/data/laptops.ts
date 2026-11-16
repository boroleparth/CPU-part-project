// Laptop processors (Intel and AMD) and graphics (NVIDIA for now).
//
// All values are estimates ("Estimated" in the UI) on the same scales as the desktop parts:
// multiIndex = PassMark CPU Mark / 70,111 (Ryzen 9 9950X3D) x 100,
// singleIndex = PassMark single-thread / 5,087 (Core Ultra 9 285K) x 100,
// rasterIndex / rtIndex on the desktop GPU scale (RTX 5090 = 100).
// The PassMark numbers below are approximate typical results, to be replaced by sourced
// values through scripts/import-benchmarks.ts (laptop CPUs are in the same PassMark lists).
import type { BenchSource, Cpu, Gpu, MemType } from '../engine/types';
import calibration from './laptop-calibration.json';

const MULTI_TOP = 70111;
const SINGLE_TOP = 5087;
const round = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

/**
 * Gaming relative to single-core speed. Architecture: how well each core design turns
 * single-thread speed into frame rate (from the desktop chips of the same design).
 * Class: laptop power limits, smaller caches and slower memory; HX chips are desktop
 * silicon with more power, U / V chips run at 15-30 W.
 */
const archGaming: Record<string, number> = {
  comet: 0.91, tiger: 0.86, alder: 0.89, raptor: 0.94, meteor: 0.8, lunar: 0.82, arrow: 0.8,
  // AMD, from the desktop Ryzen chips of each design (gaming / single-core).
  zen2: 0.86, zen3: 0.88, zen4: 0.9, zen5: 0.89,
};
const classGaming = { U: 0.78, V: 0.85, H: 0.88, HX: 0.94 } as const;
type LaptopClass = keyof typeof classGaming;

interface Gen {
  brand?: 'AMD';
  generation: string;
  arch: keyof typeof archGaming;
  memTypes: MemType[];
  maxMemSpeed: Partial<Record<MemType, number>>;
  pcieGen: 3 | 4 | 5;
}

const gens = {
  cometH: { generation: 'Comet Lake-H', arch: 'comet', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 2933 }, pcieGen: 3 },
  tigerH: { generation: 'Tiger Lake-H', arch: 'tiger', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 4 },
  tigerU: { generation: 'Tiger Lake-U', arch: 'tiger', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 4 },
  alderH: { generation: 'Alder Lake-H', arch: 'alder', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, pcieGen: 4 },
  alderHX: { generation: 'Alder Lake-HX', arch: 'alder', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, pcieGen: 5 },
  alderU: { generation: 'Alder Lake-U', arch: 'alder', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, pcieGen: 4 },
  raptorH: { generation: 'Raptor Lake-H', arch: 'raptor', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 5200 }, pcieGen: 4 },
  raptorHX: { generation: 'Raptor Lake-HX', arch: 'raptor', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 5600 }, pcieGen: 5 },
  raptorU: { generation: 'Raptor Lake-U', arch: 'raptor', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 5200 }, pcieGen: 4 },
  raptorRHX: { generation: 'Raptor Lake Refresh-HX', arch: 'raptor', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 5600 }, pcieGen: 5 },
  meteor: { generation: 'Meteor Lake', arch: 'meteor', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 7467 }, pcieGen: 4 },
  lunar: { generation: 'Lunar Lake', arch: 'lunar', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 8533 }, pcieGen: 4 },
  arrowH: { generation: 'Arrow Lake-H', arch: 'arrow', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 8400 }, pcieGen: 4 },
  arrowHX: { generation: 'Arrow Lake-HX', arch: 'arrow', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 6400 }, pcieGen: 5 },
  // AMD Ryzen mobile
  renoir: { brand: 'AMD', generation: 'Renoir', arch: 'zen2', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 3 },
  lucienne: { brand: 'AMD', generation: 'Lucienne', arch: 'zen2', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 3 },
  mendocino: { brand: 'AMD', generation: 'Mendocino', arch: 'zen2', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5500 }, pcieGen: 3 },
  cezanne: { brand: 'AMD', generation: 'Cezanne', arch: 'zen3', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 3 },
  barcelo: { brand: 'AMD', generation: 'Barcelo', arch: 'zen3', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 3 },
  rembrandt: { brand: 'AMD', generation: 'Rembrandt', arch: 'zen3', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 4800 }, pcieGen: 4 },
  phoenix: { brand: 'AMD', generation: 'Phoenix', arch: 'zen4', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 4 },
  hawk: { brand: 'AMD', generation: 'Hawk Point', arch: 'zen4', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 4 },
  dragon: { brand: 'AMD', generation: 'Dragon Range', arch: 'zen4', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5200 }, pcieGen: 5 },
  strix: { brand: 'AMD', generation: 'Strix Point', arch: 'zen5', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 4 },
  krackan: { brand: 'AMD', generation: 'Krackan Point', arch: 'zen5', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 4 },
  fire: { brand: 'AMD', generation: 'Fire Range', arch: 'zen5', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 5 },
} satisfies Record<string, Gen>;

/** Typical sustained CPU power in a laptop of each class, watts. */
const classPower: Record<LaptopClass, number> = { U: 28, V: 30, H: 65, HX: 120 };

/** [id, name, generation, class, cores, threads, PassMark CPU Mark, PassMark single-thread, integrated graphics index] */
type Row = [string, string, keyof typeof gens, LaptopClass, number, number, number, number, number];

const rows: Row[] = [
  // Core 10th gen (Comet Lake-H)
  ['i5-10300h', 'Core i5-10300H', 'cometH', 'H', 4, 8, 8800, 2500, 1.2],
  ['i5-10500h', 'Core i5-10500H', 'cometH', 'H', 6, 12, 11000, 2550, 1.2],
  ['i7-10750h', 'Core i7-10750H', 'cometH', 'H', 6, 12, 12100, 2620, 1.2],
  ['i7-10870h', 'Core i7-10870H', 'cometH', 'H', 8, 16, 15000, 2750, 1.2],
  ['i9-10885h', 'Core i9-10885H', 'cometH', 'H', 8, 16, 15000, 2800, 1.2],
  ['i9-10980hk', 'Core i9-10980HK', 'cometH', 'H', 8, 16, 15800, 2850, 1.2],
  // Core 11th gen (Tiger Lake)
  ['i5-11260h', 'Core i5-11260H', 'tigerH', 'H', 6, 12, 15500, 2950, 1.5],
  ['i5-11400h', 'Core i5-11400H', 'tigerH', 'H', 6, 12, 16800, 3000, 1.5],
  ['i7-11600h', 'Core i7-11600H', 'tigerH', 'H', 6, 12, 17800, 3100, 1.5],
  ['i7-11800h', 'Core i7-11800H', 'tigerH', 'H', 8, 16, 21000, 3150, 1.5],
  ['i9-11900h', 'Core i9-11900H', 'tigerH', 'H', 8, 16, 21800, 3250, 1.5],
  ['i9-11980hk', 'Core i9-11980HK', 'tigerH', 'H', 8, 16, 23000, 3350, 1.5],
  ['i5-1135g7', 'Core i5-1135G7', 'tigerU', 'U', 4, 8, 10000, 2700, 2.6],
  ['i7-1165g7', 'Core i7-1165G7', 'tigerU', 'U', 4, 8, 10500, 2900, 2.8],
  // Core 12th gen (Alder Lake)
  ['i5-12450h', 'Core i5-12450H', 'alderH', 'H', 8, 12, 16500, 3250, 2.2],
  ['i5-12500h', 'Core i5-12500H', 'alderH', 'H', 12, 16, 22500, 3400, 2.8],
  ['i7-12650h', 'Core i7-12650H', 'alderH', 'H', 10, 16, 23000, 3450, 2.2],
  ['i7-12700h', 'Core i7-12700H', 'alderH', 'H', 14, 20, 26500, 3550, 2.8],
  ['i9-12900h', 'Core i9-12900H', 'alderH', 'H', 14, 20, 28500, 3750, 2.8],
  ['i7-12800hx', 'Core i7-12800HX', 'alderHX', 'HX', 16, 24, 32000, 3650, 1.2],
  ['i9-12900hx', 'Core i9-12900HX', 'alderHX', 'HX', 16, 24, 36000, 3850, 1.2],
  ['i5-1235u', 'Core i5-1235U', 'alderU', 'U', 10, 12, 13500, 3100, 2.6],
  ['i7-1255u', 'Core i7-1255U', 'alderU', 'U', 10, 12, 14000, 3250, 2.8],
  // Core 13th gen and Core 5 / 7 (Raptor Lake)
  ['i5-13420h', 'Core i5-13420H', 'raptorH', 'H', 8, 12, 19500, 3350, 2.2],
  ['i5-13500h', 'Core i5-13500H', 'raptorH', 'H', 12, 16, 23500, 3500, 2.8],
  ['i7-13620h', 'Core i7-13620H', 'raptorH', 'H', 10, 16, 25000, 3700, 2.2],
  ['i7-13700h', 'Core i7-13700H', 'raptorH', 'H', 14, 20, 28000, 3800, 2.8],
  ['i9-13900h', 'Core i9-13900H', 'raptorH', 'H', 14, 20, 30000, 3950, 2.8],
  ['c5-210h', 'Core 5 210H', 'raptorH', 'H', 8, 12, 19500, 3400, 2.2],
  ['c7-240h', 'Core 7 240H', 'raptorH', 'H', 10, 16, 25500, 3750, 2.2],
  ['i5-13450hx', 'Core i5-13450HX', 'raptorHX', 'HX', 10, 16, 25000, 3400, 1.2],
  ['i5-13500hx', 'Core i5-13500HX', 'raptorHX', 'HX', 14, 20, 30500, 3550, 1.2],
  ['i7-13650hx', 'Core i7-13650HX', 'raptorHX', 'HX', 14, 20, 33000, 3750, 1.2],
  ['i7-13700hx', 'Core i7-13700HX', 'raptorHX', 'HX', 16, 24, 35000, 3800, 1.2],
  ['i9-13900hx', 'Core i9-13900HX', 'raptorHX', 'HX', 24, 32, 45000, 4100, 1.2],
  ['i9-13980hx', 'Core i9-13980HX', 'raptorHX', 'HX', 24, 32, 47000, 4200, 1.2],
  ['i5-1335u', 'Core i5-1335U', 'raptorU', 'U', 10, 12, 15000, 3350, 2.6],
  ['i7-1355u', 'Core i7-1355U', 'raptorU', 'U', 10, 12, 15500, 3500, 2.8],
  // Core 14th gen HX (Raptor Lake Refresh)
  ['i5-14450hx', 'Core i5-14450HX', 'raptorRHX', 'HX', 10, 16, 26000, 3550, 1.2],
  ['i7-14650hx', 'Core i7-14650HX', 'raptorRHX', 'HX', 16, 24, 41000, 3950, 1.2],
  ['i7-14700hx', 'Core i7-14700HX', 'raptorRHX', 'HX', 20, 28, 42000, 3950, 1.2],
  ['i9-14900hx', 'Core i9-14900HX', 'raptorRHX', 'HX', 24, 32, 48000, 4250, 1.2],
  // Core Ultra 100 (Meteor Lake)
  ['cu5-125u', 'Core Ultra 5 125U', 'meteor', 'U', 12, 14, 16000, 3350, 3],
  ['cu7-155u', 'Core Ultra 7 155U', 'meteor', 'U', 12, 14, 17000, 3500, 3.2],
  ['cu5-125h', 'Core Ultra 5 125H', 'meteor', 'H', 14, 18, 21500, 3500, 5],
  ['cu7-155h', 'Core Ultra 7 155H', 'meteor', 'H', 16, 22, 25500, 3700, 5.5],
  ['cu9-185h', 'Core Ultra 9 185H', 'meteor', 'H', 16, 22, 29000, 3900, 5.8],
  // Core Ultra 200V (Lunar Lake), memory on the chip
  ['cu5-226v', 'Core Ultra 5 226V', 'lunar', 'V', 8, 8, 19000, 4000, 6.5],
  ['cu7-258v', 'Core Ultra 7 258V', 'lunar', 'V', 8, 8, 20500, 4200, 7],
  // Core Ultra 200H / HX (Arrow Lake)
  ['cu5-225h', 'Core Ultra 5 225H', 'arrowH', 'H', 14, 14, 25000, 3900, 5.5],
  ['cu7-255h', 'Core Ultra 7 255H', 'arrowH', 'H', 16, 16, 29000, 4150, 6.2],
  ['cu9-285h', 'Core Ultra 9 285H', 'arrowH', 'H', 16, 16, 31000, 4250, 6.5],
  ['cu7-255hx', 'Core Ultra 7 255HX', 'arrowHX', 'HX', 20, 20, 45000, 4350, 2.5],
  ['cu9-275hx', 'Core Ultra 9 275HX', 'arrowHX', 'HX', 24, 24, 55000, 4500, 2.5],
  // AMD Ryzen 4000 / 5000 U (Renoir, Lucienne: Zen 2)
  ['r5-4600h', 'Ryzen 5 4600H', 'renoir', 'H', 6, 12, 14400, 2550, 2.3],
  ['r7-4800h', 'Ryzen 7 4800H', 'renoir', 'H', 8, 16, 18800, 2650, 2.6],
  ['r5-4500u', 'Ryzen 5 4500U', 'renoir', 'U', 6, 6, 10900, 2350, 2.3],
  ['r7-4700u', 'Ryzen 7 4700U', 'renoir', 'U', 8, 8, 13300, 2450, 2.6],
  ['r5-5500u', 'Ryzen 5 5500U', 'lucienne', 'U', 6, 12, 13000, 2550, 2.4],
  ['r7-5700u', 'Ryzen 7 5700U', 'lucienne', 'U', 8, 16, 16200, 2600, 2.8],
  ['r5-7520u', 'Ryzen 5 7520U', 'mendocino', 'U', 4, 8, 9500, 2450, 1.5],
  // Ryzen 5000 H / 5000-7000 U (Cezanne, Barcelo: Zen 3)
  ['r5-5600h', 'Ryzen 5 5600H', 'cezanne', 'H', 6, 12, 17200, 3050, 2.6],
  ['r7-5800h', 'Ryzen 7 5800H', 'cezanne', 'H', 8, 16, 21000, 3150, 2.9],
  ['r9-5900hx', 'Ryzen 9 5900HX', 'cezanne', 'H', 8, 16, 22500, 3300, 3],
  ['r5-5625u', 'Ryzen 5 5625U', 'barcelo', 'U', 6, 12, 15100, 3000, 2.5],
  ['r7-5825u', 'Ryzen 7 5825U', 'barcelo', 'U', 8, 16, 18500, 3050, 3],
  ['r3-7330u', 'Ryzen 3 7330U', 'barcelo', 'U', 4, 8, 9700, 2900, 2.3],
  ['r5-7430u', 'Ryzen 5 7430U', 'barcelo', 'U', 6, 12, 14500, 2950, 2.5],
  ['r5-7530u', 'Ryzen 5 7530U', 'barcelo', 'U', 6, 12, 15500, 3050, 2.5],
  ['r7-7730u', 'Ryzen 7 7730U', 'barcelo', 'U', 8, 16, 18800, 3100, 3],
  // Ryzen 6000 / 7035 (Rembrandt: Zen 3+, DDR5)
  ['r5-6600h', 'Ryzen 5 6600H', 'rembrandt', 'H', 6, 12, 20000, 3350, 4.5],
  ['r7-6800h', 'Ryzen 7 6800H', 'rembrandt', 'H', 8, 16, 23500, 3450, 7],
  ['r9-6900hx', 'Ryzen 9 6900HX', 'rembrandt', 'H', 8, 16, 25000, 3550, 7],
  ['r5-7235hs', 'Ryzen 5 7235HS', 'rembrandt', 'H', 4, 8, 13500, 3250, 1.5],
  ['r5-7535hs', 'Ryzen 5 7535HS', 'rembrandt', 'H', 6, 12, 20500, 3350, 4.5],
  ['r7-7735hs', 'Ryzen 7 7735HS', 'rembrandt', 'H', 8, 16, 24000, 3450, 7],
  // 8-core Zen 3+ without the Radeon 680M (only a basic display engine).
  ['r7-7435hs', 'Ryzen 7 7435HS', 'rembrandt', 'H', 8, 16, 23000, 3400, 0.5],
  // Ryzen 7040 / 8040 (Phoenix, Hawk Point: Zen 4)
  ['r5-7640hs', 'Ryzen 5 7640HS', 'phoenix', 'H', 6, 12, 24500, 3750, 7],
  ['r7-7840hs', 'Ryzen 7 7840HS', 'phoenix', 'H', 8, 16, 29000, 3850, 9],
  ['r9-7940hs', 'Ryzen 9 7940HS', 'phoenix', 'H', 8, 16, 30500, 3950, 9],
  ['r7-7840u', 'Ryzen 7 7840U', 'phoenix', 'U', 8, 16, 24500, 3750, 8],
  ['r5-8645hs', 'Ryzen 5 8645HS', 'hawk', 'H', 6, 12, 24500, 3750, 7],
  ['r7-8840hs', 'Ryzen 7 8840HS', 'hawk', 'H', 8, 16, 27000, 3850, 9],
  ['r7-8845hs', 'Ryzen 7 8845HS', 'hawk', 'H', 8, 16, 29500, 3900, 9],
  ['r7-8840u', 'Ryzen 7 8840U', 'hawk', 'U', 8, 16, 25000, 3800, 8],
  // Ryzen 7045 HX (Dragon Range: desktop Zen 4 silicon)
  ['r7-7745hx', 'Ryzen 7 7745HX', 'dragon', 'HX', 8, 16, 33000, 4050, 1.5],
  ['r9-7845hx', 'Ryzen 9 7845HX', 'dragon', 'HX', 12, 24, 46000, 4050, 1.5],
  ['r9-7945hx', 'Ryzen 9 7945HX', 'dragon', 'HX', 16, 32, 55000, 4100, 1.5],
  // Ryzen AI 300 (Strix / Krackan Point: Zen 5) and 9055 HX (Fire Range)
  ['rai5-340', 'Ryzen AI 5 340', 'krackan', 'H', 6, 12, 22000, 4050, 6],
  ['rai7-350', 'Ryzen AI 7 350', 'krackan', 'H', 8, 16, 28000, 4200, 8],
  ['rai9-365', 'Ryzen AI 9 365', 'strix', 'H', 10, 20, 32000, 4250, 10],
  ['rai9-hx370', 'Ryzen AI 9 HX 370', 'strix', 'H', 12, 24, 35000, 4300, 11],
  ['r9-9955hx', 'Ryzen 9 9955HX', 'fire', 'HX', 16, 32, 62000, 4600, 1.5],
];

export const laptopCpus: Cpu[] = rows.map(([id, name, genKey, cls, cores, threads, multiRaw, singleRaw, igpu]) => {
  const g = gens[genKey] as Gen;
  const singleIndex = round((singleRaw / SINGLE_TOP) * 100);
  return {
    id, name, brand: g.brand ?? 'Intel', socket: 'BGA', laptop: true,
    cores, threads,
    gamingIndex: Math.round(singleIndex * archGaming[g.arch] * classGaming[cls]),
    multiIndex: round((multiRaw / MULTI_TOP) * 100),
    singleIndex,
    power: classPower[cls],
    memTypes: g.memTypes, maxMemSpeed: g.maxMemSpeed, pcieGen: g.pcieGen,
    hasIgpu: true, igpuIndex: igpu, includesCooler: true,
    generation: g.generation,
  };
});

// ---------------------------------------------------------------------------
// Graphics
// ---------------------------------------------------------------------------

/**
 * Performance at a lower power limit than the chip's maximum. Laptop GPUs scale
 * sub-linearly with power: at half the watts they keep roughly three quarters of
 * the speed, which matches the ~30-40% spread reviewers measure between the
 * slowest and fastest versions of the same chip.
 */
export const tgpScale = (tgp: number, maxTgp: number) => Math.pow(Math.min(1, tgp / maxTgp), 0.4);
/** Speed at one power limit relative to another (either direction). */
const powerRatio = (tgp: number, ref: number) => Math.pow(tgp / ref, 0.4);

/** [family id, chip name, raster at max power, RT/raster ratio, VRAM GB, bandwidth GB/s, PCIe gen, lanes, power versions (W), typical W] */
type GpuRow = [string, string, number, number, number, number, 3 | 4 | 5, 8 | 16, number[], number];

const gpuRows: GpuRow[] = [
  ['gtx1650m', 'GTX 1650', 6.8, 0.12, 4, 128, 3, 16, [35, 50], 50],
  ['gtx1650tim', 'GTX 1650 Ti', 7.5, 0.12, 4, 192, 3, 16, [35, 55], 55],
  ['gtx1660tim', 'GTX 1660 Ti', 11.4, 0.12, 6, 288, 3, 16, [60, 80], 80],
  ['rtx2060m', 'RTX 2060', 14.4, 0.75, 6, 336, 3, 16, [65, 90, 115], 90],
  ['rtx2070m', 'RTX 2070', 17.6, 0.75, 8, 448, 3, 16, [80, 115], 115],
  ['rtx2070sm', 'RTX 2070 Super', 19, 0.75, 8, 448, 3, 16, [80, 115], 115],
  ['rtx2080m', 'RTX 2080', 20.8, 0.75, 8, 448, 3, 16, [80, 150], 150],
  ['rtx2080sm', 'RTX 2080 Super', 22, 0.75, 8, 448, 3, 16, [80, 150], 150],
  ['rtx2050m', 'RTX 2050', 8, 0.89, 4, 112, 4, 8, [30, 45], 45],
  ['rtx3050m', 'RTX 3050', 12, 0.89, 4, 192, 4, 8, [35, 60, 80], 60],
  ['rtx3050m6', 'RTX 3050 6GB', 13, 0.89, 6, 168, 4, 8, [35, 60, 75, 95], 75],
  ['rtx3050tim', 'RTX 3050 Ti', 12.8, 0.89, 4, 192, 4, 8, [35, 60, 80], 60],
  ['rtx3060m', 'RTX 3060', 19, 0.89, 6, 336, 4, 16, [60, 80, 95, 115, 130], 95],
  ['rtx3070m', 'RTX 3070', 26.6, 0.89, 8, 448, 4, 16, [80, 115, 150], 115],
  ['rtx3070tim', 'RTX 3070 Ti', 29.4, 0.89, 8, 448, 4, 16, [80, 115, 150], 115],
  ['rtx3080m', 'RTX 3080', 31, 0.89, 16, 448, 4, 16, [80, 125, 165], 125],
  ['rtx3080tim', 'RTX 3080 Ti', 32, 0.89, 16, 512, 4, 16, [80, 125, 175], 125],
  ['rtx4050m', 'RTX 4050', 20, 0.95, 6, 192, 4, 8, [35, 60, 85, 115, 140], 115],
  ['rtx4060m', 'RTX 4060', 23, 0.95, 8, 256, 4, 8, [35, 60, 85, 115, 140], 115],
  ['rtx4070m', 'RTX 4070', 25.5, 0.95, 8, 256, 4, 8, [35, 60, 85, 115, 140], 115],
  ['rtx4080m', 'RTX 4080', 37, 0.95, 12, 432, 4, 16, [60, 110, 150, 175], 150],
  ['rtx4090m', 'RTX 4090', 44, 0.95, 16, 576, 4, 16, [80, 125, 150, 175], 175],
  ['rtx5050m', 'RTX 5050', 23, 0.95, 8, 384, 5, 8, [50, 75, 100], 100],
  ['rtx5060m', 'RTX 5060', 26, 0.95, 8, 384, 5, 8, [45, 75, 115], 115],
  ['rtx5070m', 'RTX 5070', 28, 0.95, 8, 384, 5, 8, [50, 85, 115], 115],
  ['rtx5070tim', 'RTX 5070 Ti', 34, 0.95, 12, 672, 5, 16, [60, 100, 140], 140],
  ['rtx5080m', 'RTX 5080', 46, 0.95, 16, 896, 5, 16, [80, 125, 175], 175],
  ['rtx5090m', 'RTX 5090', 50, 0.95, 24, 896, 5, 16, [95, 135, 175], 175],
];

interface Calibrated { typical: number; laptops: number; url: string }
const measured = calibration.gpus as Record<string, Calibrated | undefined>;

/**
 * Measured where Notebookcheck has the chip: its median tested laptop sets the speed of our
 * typical power version, and the other versions scale from it with tgpScale (which matches
 * their fastest 10% of laptops within a few percent). Otherwise the estimate above, at max power.
 */
export const laptopGpus: Gpu[] = gpuRows.flatMap(([fid, chip, raster, rtRatio, vram, bandwidth, pcieGen, pcieLanes, tgps, typical]) => {
  const max = Math.max(...tgps);
  const m = measured[fid];
  const source = (r: number): Partial<Record<'rasterIndex', BenchSource>> | undefined =>
    m && { rasterIndex: { dataset: `Notebookcheck game benchmarks (median of ${m.laptops} laptops)`, url: m.url, date: calibration.generated, raw: round(r), unit: 'index' } };
  return tgps.map((tgp): Gpu => {
    const r = m ? m.typical * powerRatio(tgp, typical) : raster * tgpScale(tgp, max);
    return {
      source: source(r),
      id: `${fid}-${tgp}`,
      name: `GeForce ${chip} Laptop · ${tgp} W`,
      brand: 'NVIDIA', laptop: true, family: `${chip} Laptop`, tgp, typical: tgp === typical,
      rasterIndex: round(r), rtIndex: round(r * rtRatio),
      vram, bandwidth, power: tgp, lengthMm: 0, pcieLanes, pcieGen,
      cuda: true, needs12v2x6: false,
    };
  });
});

/** The other power versions of a laptop GPU, lowest first. */
export const powerVersions = (gpu: Gpu): Gpu[] =>
  gpu.family ? laptopGpus.filter((g) => g.family === gpu.family).sort((a, b) => a.tgp! - b.tgp!) : [gpu];
