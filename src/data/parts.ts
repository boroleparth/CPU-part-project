import type { Case, Cooler, Motherboard, Psu, RamKit, Storage } from '../engine/types';

// Motherboards are representative chipset classes rather than specific
// retail models, so their specs are typical values for that class.
export const motherboards: Motherboard[] = [
  // AM5
  { id: 'am5-a620-matx', name: 'A620 mATX (entry)', socket: 'AM5', chipset: 'A620', formFactor: 'mATX', memType: 'DDR5', memSlots: 2, maxMemGb: 96, maxMemSpeed: 6000, pcieGen: 4, vrmWatts: 110, m2Slots: 1 },
  { id: 'am5-b650-matx', name: 'B650 mATX', socket: 'AM5', chipset: 'B650', formFactor: 'mATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 6400, pcieGen: 4, vrmWatts: 170, m2Slots: 2 },
  { id: 'am5-b650-atx', name: 'B650 ATX', socket: 'AM5', chipset: 'B650', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 6400, pcieGen: 4, vrmWatts: 180, m2Slots: 2 },
  { id: 'am5-b650-itx', name: 'B650 Mini-ITX', socket: 'AM5', chipset: 'B650', formFactor: 'ITX', memType: 'DDR5', memSlots: 2, maxMemGb: 96, maxMemSpeed: 6400, pcieGen: 4, vrmWatts: 160, m2Slots: 2 },
  { id: 'am5-b850-atx', name: 'B850 ATX', socket: 'AM5', chipset: 'B850', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 8000, pcieGen: 5, vrmWatts: 220, m2Slots: 3 },
  { id: 'am5-x870e-atx', name: 'X870E ATX (high-end)', socket: 'AM5', chipset: 'X870E', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 256, maxMemSpeed: 8000, pcieGen: 5, vrmWatts: 260, m2Slots: 4 },
  // AM4
  { id: 'am4-b450-matx', name: 'B450 mATX (older)', socket: 'AM4', chipset: 'B450', formFactor: 'mATX', memType: 'DDR4', memSlots: 2, maxMemGb: 64, maxMemSpeed: 3600, pcieGen: 3, vrmWatts: 95, m2Slots: 1, biosNoteFor: ['Zen 3', 'Zen 3 (APU die)', 'Zen 3 APU'] },
  { id: 'am4-b550-matx', name: 'B550 mATX', socket: 'AM4', chipset: 'B550', formFactor: 'mATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 4000, pcieGen: 4, vrmWatts: 130, m2Slots: 2, unsupported: ['Zen+'] },
  { id: 'am4-b550-atx', name: 'B550 ATX', socket: 'AM4', chipset: 'B550', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 4400, pcieGen: 4, vrmWatts: 150, m2Slots: 2, unsupported: ['Zen+'] },
  { id: 'am4-x570-atx', name: 'X570 ATX', socket: 'AM4', chipset: 'X570', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 4400, pcieGen: 4, vrmWatts: 170, m2Slots: 2 },
  { id: 'am4-a520-matx', name: 'A520 mATX (entry)', socket: 'AM4', chipset: 'A520', formFactor: 'mATX', memType: 'DDR4', memSlots: 2, maxMemGb: 64, maxMemSpeed: 3600, pcieGen: 3, vrmWatts: 95, m2Slots: 1, unsupported: ['Zen+'] },
  { id: 'am4-x470-atx', name: 'X470 ATX (older)', socket: 'AM4', chipset: 'X470', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, maxMemGb: 64, maxMemSpeed: 3600, pcieGen: 3, vrmWatts: 150, m2Slots: 2, biosNoteFor: ['Zen 3', 'Zen 3 (APU die)', 'Zen 3 APU'] },
  // LGA1200 (Intel 10th / 11th gen, DDR4)
  { id: 'lga1200-h510-matx', name: 'H510 mATX (entry)', socket: 'LGA1200', chipset: 'H510', formFactor: 'mATX', memType: 'DDR4', memSlots: 2, maxMemGb: 64, maxMemSpeed: 2933, pcieGen: 3, vrmWatts: 125, m2Slots: 1 },
  { id: 'lga1200-b560-atx', name: 'B560 ATX', socket: 'LGA1200', chipset: 'B560', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 3600, pcieGen: 4, vrmWatts: 180, m2Slots: 2 },
  { id: 'lga1200-z590-atx', name: 'Z590 ATX', socket: 'LGA1200', chipset: 'Z590', formFactor: 'ATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 4800, pcieGen: 4, vrmWatts: 250, m2Slots: 3 },
  // LGA1700
  { id: 'lga1700-h610-ddr4', name: 'H610 mATX DDR4 (entry)', socket: 'LGA1700', chipset: 'H610', formFactor: 'mATX', memType: 'DDR4', memSlots: 2, maxMemGb: 64, maxMemSpeed: 3200, pcieGen: 4, vrmWatts: 120, m2Slots: 1, biosNoteFor: ['Raptor Lake Refresh'] },
  { id: 'lga1700-b760-ddr4', name: 'B760 mATX DDR4', socket: 'LGA1700', chipset: 'B760', formFactor: 'mATX', memType: 'DDR4', memSlots: 4, maxMemGb: 128, maxMemSpeed: 3600, pcieGen: 4, vrmWatts: 170, m2Slots: 2 },
  { id: 'lga1700-b760-ddr5', name: 'B760 ATX DDR5', socket: 'LGA1700', chipset: 'B760', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 6800, pcieGen: 4, vrmWatts: 190, m2Slots: 3 },
  { id: 'lga1700-z790-ddr5', name: 'Z790 ATX DDR5', socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 7800, pcieGen: 5, vrmWatts: 260, m2Slots: 4 },
  { id: 'lga1700-z790-itx', name: 'Z790 Mini-ITX', socket: 'LGA1700', chipset: 'Z790', formFactor: 'ITX', memType: 'DDR5', memSlots: 2, maxMemGb: 96, maxMemSpeed: 7200, pcieGen: 5, vrmWatts: 200, m2Slots: 2 },
  // LGA1851
  { id: 'lga1851-b860-atx', name: 'B860 ATX', socket: 'LGA1851', chipset: 'B860', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 192, maxMemSpeed: 7200, pcieGen: 5, vrmWatts: 200, m2Slots: 3 },
  { id: 'lga1851-z890-atx', name: 'Z890 ATX', socket: 'LGA1851', chipset: 'Z890', formFactor: 'ATX', memType: 'DDR5', memSlots: 4, maxMemGb: 256, maxMemSpeed: 8800, pcieGen: 5, vrmWatts: 270, m2Slots: 4 },
];

export const ramKits: RamKit[] = [
  { id: 'ddr4-1x8-3200', name: 'DDR4 8GB (1×8) 3200 CL16', type: 'DDR4', sticks: 1, totalGb: 8, speed: 3200, cl: 16 },
  { id: 'ddr4-1x16-3200', name: 'DDR4 16GB (1×16) 3200 CL16', type: 'DDR4', sticks: 1, totalGb: 16, speed: 3200, cl: 16 },
  { id: 'ddr4-2x8-3200', name: 'DDR4 16GB (2×8) 3200 CL16', type: 'DDR4', sticks: 2, totalGb: 16, speed: 3200, cl: 16 },
  { id: 'ddr4-2x16-3200', name: 'DDR4 32GB (2×16) 3200 CL16', type: 'DDR4', sticks: 2, totalGb: 32, speed: 3200, cl: 16 },
  { id: 'ddr4-2x16-3600', name: 'DDR4 32GB (2×16) 3600 CL18', type: 'DDR4', sticks: 2, totalGb: 32, speed: 3600, cl: 18 },
  { id: 'ddr4-2x32-3600', name: 'DDR4 64GB (2×32) 3600 CL18', type: 'DDR4', sticks: 2, totalGb: 64, speed: 3600, cl: 18 },
  { id: 'ddr5-1x16-5600', name: 'DDR5 16GB (1×16) 5600 CL40', type: 'DDR5', sticks: 1, totalGb: 16, speed: 5600, cl: 40 },
  { id: 'ddr5-2x8-5200', name: 'DDR5 16GB (2×8) 5200 CL40', type: 'DDR5', sticks: 2, totalGb: 16, speed: 5200, cl: 40 },
  { id: 'ddr5-2x16-5600', name: 'DDR5 32GB (2×16) 5600 CL36', type: 'DDR5', sticks: 2, totalGb: 32, speed: 5600, cl: 36 },
  { id: 'ddr5-2x16-6000', name: 'DDR5 32GB (2×16) 6000 CL30', type: 'DDR5', sticks: 2, totalGb: 32, speed: 6000, cl: 30 },
  { id: 'ddr5-2x32-6000', name: 'DDR5 64GB (2×32) 6000 CL30', type: 'DDR5', sticks: 2, totalGb: 64, speed: 6000, cl: 30 },
  { id: 'ddr5-2x16-7200', name: 'DDR5 32GB (2×16) 7200 CL34', type: 'DDR5', sticks: 2, totalGb: 32, speed: 7200, cl: 34 },
  { id: 'ddr5-2x48-6400', name: 'DDR5 96GB (2×48) 6400 CL32', type: 'DDR5', sticks: 2, totalGb: 96, speed: 6400, cl: 32 },
  { id: 'ddr5-4x32-5600', name: 'DDR5 128GB (4×32) 5600 CL40', type: 'DDR5', sticks: 4, totalGb: 128, speed: 5600, cl: 40 },
];

export const storages: Storage[] = [
  { id: 'hdd-2tb', name: '2TB Hard drive (7200rpm)', kind: 'HDD', capacityGb: 2000 },
  { id: 'sata-1tb', name: '1TB SATA SSD', kind: 'SATA SSD', capacityGb: 1000 },
  { id: 'nvme3-1tb', name: '1TB NVMe Gen3', kind: 'NVMe Gen3', capacityGb: 1000 },
  { id: 'nvme4-1tb', name: '1TB NVMe Gen4', kind: 'NVMe Gen4', capacityGb: 1000 },
  { id: 'nvme4-2tb', name: '2TB NVMe Gen4', kind: 'NVMe Gen4', capacityGb: 2000 },
  { id: 'nvme4-4tb', name: '4TB NVMe Gen4', kind: 'NVMe Gen4', capacityGb: 4000 },
  { id: 'nvme5-2tb', name: '2TB NVMe Gen5', kind: 'NVMe Gen5', capacityGb: 2000 },
];

export const coolers: Cooler[] = [
  { id: 'stock', name: 'Box cooler (included with CPU)', kind: 'stock', ratedWatts: 95, heightMm: 60 },
  { id: 'lowprofile', name: 'Low-profile air cooler', kind: 'air', ratedWatts: 110, heightMm: 47 },
  { id: 'tower-single', name: 'Single-tower 120mm air', kind: 'air', ratedWatts: 180, heightMm: 155 },
  { id: 'tower-dual', name: 'Dual-tower air', kind: 'air', ratedWatts: 240, heightMm: 165 },
  { id: 'aio-240', name: '240mm liquid (AIO)', kind: 'aio', ratedWatts: 240, radiatorMm: 240 },
  { id: 'aio-360', name: '360mm liquid (AIO)', kind: 'aio', ratedWatts: 300, radiatorMm: 360 },
];

export const psus: Psu[] = [
  { id: 'psu-450', name: '450W 80+ Bronze', watts: 450, efficiency: '80+ Bronze', native12v2x6: false },
  { id: 'psu-550', name: '550W 80+ Bronze', watts: 550, efficiency: '80+ Bronze', native12v2x6: false },
  { id: 'psu-650', name: '650W 80+ Gold', watts: 650, efficiency: '80+ Gold', native12v2x6: false },
  { id: 'psu-750', name: '750W 80+ Gold (ATX 3.1)', watts: 750, efficiency: '80+ Gold', native12v2x6: true },
  { id: 'psu-850', name: '850W 80+ Gold (ATX 3.1)', watts: 850, efficiency: '80+ Gold', native12v2x6: true },
  { id: 'psu-1000', name: '1000W 80+ Gold (ATX 3.1)', watts: 1000, efficiency: '80+ Gold', native12v2x6: true },
  { id: 'psu-1200', name: '1200W 80+ Platinum (ATX 3.1)', watts: 1200, efficiency: '80+ Platinum', native12v2x6: true },
];

export const cases: Case[] = [
  { id: 'case-itx', name: 'Compact Mini-ITX', supports: ['ITX'], maxGpuMm: 310, maxCoolerMm: 70, maxRadiatorMm: 240 },
  { id: 'case-matx', name: 'Micro-ATX tower', supports: ['mATX', 'ITX'], maxGpuMm: 330, maxCoolerMm: 160, maxRadiatorMm: 240 },
  { id: 'case-mid', name: 'Mid-tower ATX', supports: ['ATX', 'mATX', 'ITX'], maxGpuMm: 380, maxCoolerMm: 170, maxRadiatorMm: 360 },
  { id: 'case-full', name: 'Full-tower', supports: ['ATX', 'mATX', 'ITX'], maxGpuMm: 450, maxCoolerMm: 185, maxRadiatorMm: 420 },
];
