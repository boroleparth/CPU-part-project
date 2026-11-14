import type { Cpu } from '../engine/types';

// Indices are relative, approximated from aggregated public review data:
// gamingIndex: 1080p CPU-bound gaming, Ryzen 7 9800X3D = 100.
// multiIndex: all-core rendering/encoding throughput, Ryzen 9 9950X = 100.

const am5 = { socket: 'AM5', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 5600 }, pcieGen: 5, hasIgpu: true } as const;
const am4 = { socket: 'AM4', memTypes: ['DDR4'], maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, hasIgpu: false } as const;
const lga1700 = { socket: 'LGA1700', memTypes: ['DDR4', 'DDR5'], maxMemSpeed: { DDR4: 3200, DDR5: 5600 }, pcieGen: 5 } as const;
const am4old = { socket: 'AM4', memTypes: ['DDR4'], hasIgpu: false } as const;
const lga1200 = { socket: 'LGA1200', memTypes: ['DDR4'] } as const;
const lga1851 = { socket: 'LGA1851', memTypes: ['DDR5'], maxMemSpeed: { DDR5: 6400 }, pcieGen: 5, hasIgpu: true } as const;

export const cpus: Cpu[] = [
  // AMD AM5 — Zen 5
  { id: 'r9-9950x3d', name: 'Ryzen 9 9950X3D', brand: 'AMD', ...am5, cores: 16, threads: 32, gamingIndex: 99, multiIndex: 101, power: 170, includesCooler: false, bigCache: true, generation: 'Zen 5' },
  { id: 'r7-9800x3d', name: 'Ryzen 7 9800X3D', brand: 'AMD', ...am5, cores: 8, threads: 16, gamingIndex: 100, multiIndex: 51, power: 120, includesCooler: false, bigCache: true, generation: 'Zen 5' },
  { id: 'r9-9950x', name: 'Ryzen 9 9950X', brand: 'AMD', ...am5, cores: 16, threads: 32, gamingIndex: 85, multiIndex: 100, power: 200, includesCooler: false, generation: 'Zen 5' },
  { id: 'r9-9900x', name: 'Ryzen 9 9900X', brand: 'AMD', ...am5, cores: 12, threads: 24, gamingIndex: 83, multiIndex: 77, power: 162, includesCooler: false, generation: 'Zen 5' },
  { id: 'r7-9700x', name: 'Ryzen 7 9700X', brand: 'AMD', ...am5, cores: 8, threads: 16, gamingIndex: 82, multiIndex: 53, power: 88, includesCooler: false, generation: 'Zen 5' },
  { id: 'r5-9600x', name: 'Ryzen 5 9600X', brand: 'AMD', ...am5, cores: 6, threads: 12, gamingIndex: 79, multiIndex: 41, power: 88, includesCooler: false, generation: 'Zen 5' },
  // AMD AM5 — Zen 4
  { id: 'r7-7800x3d', name: 'Ryzen 7 7800X3D', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 8, threads: 16, gamingIndex: 89, multiIndex: 44, power: 120, includesCooler: false, bigCache: true, generation: 'Zen 4' },
  { id: 'r9-7950x', name: 'Ryzen 9 7950X', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 16, threads: 32, gamingIndex: 80, multiIndex: 92, power: 230, includesCooler: false, generation: 'Zen 4' },
  { id: 'r7-7700x', name: 'Ryzen 7 7700X', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 8, threads: 16, gamingIndex: 75, multiIndex: 48, power: 142, includesCooler: false, generation: 'Zen 4' },
  { id: 'r5-7600x', name: 'Ryzen 5 7600X', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 6, threads: 12, gamingIndex: 72, multiIndex: 37, power: 142, includesCooler: false, generation: 'Zen 4' },
  { id: 'r5-7600', name: 'Ryzen 5 7600', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 6, threads: 12, gamingIndex: 70, multiIndex: 35, power: 88, includesCooler: true, generation: 'Zen 4' },
  { id: 'r5-8600g', name: 'Ryzen 5 8600G', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, pcieGen: 4, cores: 6, threads: 12, gamingIndex: 60, multiIndex: 32, power: 88, includesCooler: true, generation: 'Zen 4 APU' },
  // AMD AM4 — Zen 3 (DDR4)
  { id: 'r7-5800x3d', name: 'Ryzen 7 5800X3D', brand: 'AMD', ...am4, cores: 8, threads: 16, gamingIndex: 74, multiIndex: 33, power: 142, includesCooler: false, bigCache: true, generation: 'Zen 3' },
  { id: 'r7-5700x3d', name: 'Ryzen 7 5700X3D', brand: 'AMD', ...am4, cores: 8, threads: 16, gamingIndex: 70, multiIndex: 31, power: 142, includesCooler: false, bigCache: true, generation: 'Zen 3' },
  { id: 'r7-5700x', name: 'Ryzen 7 5700X', brand: 'AMD', ...am4, cores: 8, threads: 16, gamingIndex: 60, multiIndex: 32, power: 76, includesCooler: false, generation: 'Zen 3' },
  { id: 'r5-5600x', name: 'Ryzen 5 5600X', brand: 'AMD', ...am4, cores: 6, threads: 12, gamingIndex: 58, multiIndex: 25, power: 76, includesCooler: true, generation: 'Zen 3' },
  { id: 'r5-5600', name: 'Ryzen 5 5600', brand: 'AMD', ...am4, cores: 6, threads: 12, gamingIndex: 56, multiIndex: 24, power: 76, includesCooler: true, generation: 'Zen 3' },
  { id: 'r5-5500', name: 'Ryzen 5 5500', brand: 'AMD', ...am4, pcieGen: 3, cores: 6, threads: 12, gamingIndex: 48, multiIndex: 22, power: 76, includesCooler: true, generation: 'Zen 3 (APU die)' },
  // Intel LGA1700 — 12th/13th/14th gen
  { id: 'i9-14900k', name: 'Core i9-14900K', brand: 'Intel', ...lga1700, cores: 24, threads: 32, gamingIndex: 86, multiIndex: 90, power: 253, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake Refresh' },
  { id: 'i7-14700k', name: 'Core i7-14700K', brand: 'Intel', ...lga1700, cores: 20, threads: 28, gamingIndex: 84, multiIndex: 80, power: 253, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake Refresh' },
  { id: 'i5-14600k', name: 'Core i5-14600K', brand: 'Intel', ...lga1700, cores: 14, threads: 20, gamingIndex: 78, multiIndex: 60, power: 181, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake Refresh' },
  { id: 'i5-14400f', name: 'Core i5-14400F', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 5200 }, pcieGen: 5, cores: 10, threads: 16, gamingIndex: 67, multiIndex: 42, power: 148, hasIgpu: false, includesCooler: true, generation: 'Raptor Lake Refresh' },
  { id: 'i5-13400f', name: 'Core i5-13400F', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 10, threads: 16, gamingIndex: 64, multiIndex: 38, power: 148, hasIgpu: false, includesCooler: true, generation: 'Raptor Lake' },
  { id: 'i5-12400f', name: 'Core i5-12400F', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 6, threads: 12, gamingIndex: 60, multiIndex: 28, power: 117, hasIgpu: false, includesCooler: true, generation: 'Alder Lake' },
  { id: 'i3-14100f', name: 'Core i3-14100F', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 4, threads: 8, gamingIndex: 55, multiIndex: 18, power: 110, hasIgpu: false, includesCooler: true, generation: 'Raptor Lake Refresh' },
  // Intel LGA1851 — Core Ultra 200S
  { id: 'cu9-285k', name: 'Core Ultra 9 285K', brand: 'Intel', ...lga1851, cores: 24, threads: 24, gamingIndex: 82, multiIndex: 98, power: 250, includesCooler: false, generation: 'Arrow Lake' },
  { id: 'cu7-265k', name: 'Core Ultra 7 265K', brand: 'Intel', ...lga1851, cores: 20, threads: 20, gamingIndex: 80, multiIndex: 83, power: 250, includesCooler: false, generation: 'Arrow Lake' },
  { id: 'cu5-245k', name: 'Core Ultra 5 245K', brand: 'Intel', ...lga1851, cores: 14, threads: 14, gamingIndex: 74, multiIndex: 60, power: 159, includesCooler: false, generation: 'Arrow Lake' },
  // ---- Older and extra models (added for used / upgrade builds) ----
  // AMD AM5 extras
  { id: 'r9-7950x3d', name: 'Ryzen 9 7950X3D', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 16, threads: 32, gamingIndex: 90, multiIndex: 88, power: 162, includesCooler: false, bigCache: true, generation: 'Zen 4' },
  { id: 'r9-7900x', name: 'Ryzen 9 7900X', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 12, threads: 24, gamingIndex: 78, multiIndex: 72, power: 230, includesCooler: false, generation: 'Zen 4' },
  { id: 'r7-7700', name: 'Ryzen 7 7700', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, cores: 8, threads: 16, gamingIndex: 74, multiIndex: 46, power: 88, includesCooler: true, generation: 'Zen 4' },
  { id: 'r5-7500f', name: 'Ryzen 5 7500F', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, hasIgpu: false, cores: 6, threads: 12, gamingIndex: 69, multiIndex: 34, power: 88, includesCooler: true, generation: 'Zen 4' },
  { id: 'r5-9600', name: 'Ryzen 5 9600', brand: 'AMD', ...am5, cores: 6, threads: 12, gamingIndex: 77, multiIndex: 39, power: 88, includesCooler: true, generation: 'Zen 5' },
  { id: 'r5-8500g', name: 'Ryzen 5 8500G', brand: 'AMD', ...am5, maxMemSpeed: { DDR5: 5200 }, pcieGen: 4, cores: 6, threads: 12, gamingIndex: 52, multiIndex: 26, power: 88, includesCooler: true, generation: 'Zen 4 APU' },
  // AMD AM4 — Ryzen 5000 extras
  { id: 'r9-5950x', name: 'Ryzen 9 5950X', brand: 'AMD', ...am4, cores: 16, threads: 32, gamingIndex: 62, multiIndex: 58, power: 142, includesCooler: false, generation: 'Zen 3' },
  { id: 'r9-5900x', name: 'Ryzen 9 5900X', brand: 'AMD', ...am4, cores: 12, threads: 24, gamingIndex: 61, multiIndex: 47, power: 142, includesCooler: false, generation: 'Zen 3' },
  { id: 'r7-5800x', name: 'Ryzen 7 5800X', brand: 'AMD', ...am4, cores: 8, threads: 16, gamingIndex: 60, multiIndex: 33, power: 142, includesCooler: false, generation: 'Zen 3' },
  { id: 'r7-5700g', name: 'Ryzen 7 5700G', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 3200 }, pcieGen: 3, hasIgpu: true, cores: 8, threads: 16, gamingIndex: 48, multiIndex: 28, power: 88, includesCooler: true, generation: 'Zen 3 APU' },
  { id: 'r5-5600g', name: 'Ryzen 5 5600G', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 3200 }, pcieGen: 3, hasIgpu: true, cores: 6, threads: 12, gamingIndex: 46, multiIndex: 22, power: 88, includesCooler: true, generation: 'Zen 3 APU' },
  // AMD AM4 — Ryzen 3000 (Zen 2)
  { id: 'r9-3900x', name: 'Ryzen 9 3900X', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 12, threads: 24, gamingIndex: 46, multiIndex: 37, power: 142, includesCooler: true, generation: 'Zen 2' },
  { id: 'r7-3700x', name: 'Ryzen 7 3700X', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 8, threads: 16, gamingIndex: 45, multiIndex: 25, power: 88, includesCooler: true, generation: 'Zen 2' },
  { id: 'r5-3600', name: 'Ryzen 5 3600', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 6, threads: 12, gamingIndex: 43, multiIndex: 19, power: 88, includesCooler: true, generation: 'Zen 2' },
  // AMD AM4 — Ryzen 2000 (Zen+)
  { id: 'r7-2700x', name: 'Ryzen 7 2700X', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 2933 }, pcieGen: 3, cores: 8, threads: 16, gamingIndex: 37, multiIndex: 20, power: 142, includesCooler: true, generation: 'Zen+' },
  { id: 'r5-2600', name: 'Ryzen 5 2600', brand: 'AMD', ...am4old, maxMemSpeed: { DDR4: 2933 }, pcieGen: 3, cores: 6, threads: 12, gamingIndex: 34, multiIndex: 15, power: 88, includesCooler: true, generation: 'Zen+' },
  // Intel LGA1700 — 13th / 12th gen extras
  { id: 'i9-13900k', name: 'Core i9-13900K', brand: 'Intel', ...lga1700, cores: 24, threads: 32, gamingIndex: 84, multiIndex: 86, power: 253, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake' },
  { id: 'i7-13700k', name: 'Core i7-13700K', brand: 'Intel', ...lga1700, cores: 16, threads: 24, gamingIndex: 81, multiIndex: 72, power: 253, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake' },
  { id: 'i5-13600k', name: 'Core i5-13600K', brand: 'Intel', ...lga1700, cores: 14, threads: 20, gamingIndex: 76, multiIndex: 57, power: 181, hasIgpu: true, includesCooler: false, generation: 'Raptor Lake' },
  { id: 'i9-12900k', name: 'Core i9-12900K', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 16, threads: 24, gamingIndex: 75, multiIndex: 66, power: 241, hasIgpu: true, includesCooler: false, generation: 'Alder Lake' },
  { id: 'i7-12700k', name: 'Core i7-12700K', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 12, threads: 20, gamingIndex: 71, multiIndex: 57, power: 190, hasIgpu: true, includesCooler: false, generation: 'Alder Lake' },
  { id: 'i5-12600k', name: 'Core i5-12600K', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 10, threads: 16, gamingIndex: 68, multiIndex: 44, power: 150, hasIgpu: true, includesCooler: false, generation: 'Alder Lake' },
  { id: 'i3-12100f', name: 'Core i3-12100F', brand: 'Intel', ...lga1700, maxMemSpeed: { DDR4: 3200, DDR5: 4800 }, cores: 4, threads: 8, gamingIndex: 50, multiIndex: 16, power: 89, hasIgpu: false, includesCooler: true, generation: 'Alder Lake' },
  // Intel LGA1200 — 11th gen (Rocket Lake) and 10th gen (Comet Lake), DDR4 only
  { id: 'i9-11900k', name: 'Core i9-11900K', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 8, threads: 16, gamingIndex: 59, multiIndex: 35, power: 251, hasIgpu: true, includesCooler: false, generation: 'Rocket Lake' },
  { id: 'i7-11700k', name: 'Core i7-11700K', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 8, threads: 16, gamingIndex: 57, multiIndex: 34, power: 251, hasIgpu: true, includesCooler: false, generation: 'Rocket Lake' },
  { id: 'i5-11400f', name: 'Core i5-11400F', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 3200 }, pcieGen: 4, cores: 6, threads: 12, gamingIndex: 52, multiIndex: 24, power: 154, hasIgpu: false, includesCooler: true, generation: 'Rocket Lake' },
  { id: 'i9-10900k', name: 'Core i9-10900K', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 2933 }, pcieGen: 3, cores: 10, threads: 20, gamingIndex: 58, multiIndex: 38, power: 250, hasIgpu: true, includesCooler: false, generation: 'Comet Lake' },
  { id: 'i7-10700k', name: 'Core i7-10700K', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 2933 }, pcieGen: 3, cores: 8, threads: 16, gamingIndex: 55, multiIndex: 32, power: 229, hasIgpu: true, includesCooler: false, generation: 'Comet Lake' },
  { id: 'i5-10400f', name: 'Core i5-10400F', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 2666 }, pcieGen: 3, cores: 6, threads: 12, gamingIndex: 45, multiIndex: 20, power: 134, hasIgpu: false, includesCooler: true, generation: 'Comet Lake' },
  { id: 'i3-10100f', name: 'Core i3-10100F', brand: 'Intel', ...lga1200, maxMemSpeed: { DDR4: 2666 }, pcieGen: 3, cores: 4, threads: 8, gamingIndex: 38, multiIndex: 12, power: 90, hasIgpu: false, includesCooler: true, generation: 'Comet Lake' },
];
