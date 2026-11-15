// Core data types for parts, builds and simulation results.

export type Socket = 'AM4' | 'AM5' | 'LGA1151' | 'LGA1200' | 'LGA1700' | 'LGA1851' | 'BGA';

/** Desktop PC (parts you choose) or laptop (parts fixed by the model). */
export type Device = 'desktop' | 'laptop';
export type MemType = 'DDR4' | 'DDR5';
export type FormFactor = 'ATX' | 'mATX' | 'ITX';
export type PcieGen = 3 | 4 | 5;

/** Where one benchmark number came from. Missing = the value is an estimate. */
export interface BenchSource {
  /** Dataset name, e.g. "PassMark CPU Mark". */
  dataset: string;
  url: string;
  /** Date the source page was saved, YYYY-MM-DD. */
  date: string;
  /** Score as published, before scaling to our 0-100 index. */
  raw: number;
  /** Unit of the raw score, e.g. "points" or "tokens/s". */
  unit?: string;
}

export type CpuMetric = 'gamingIndex' | 'multiIndex' | 'singleIndex';
export type GpuMetric = 'rasterIndex' | 'rtIndex' | 'aiIndex';

export interface Cpu {
  id: string;
  name: string;
  brand: 'AMD' | 'Intel';
  socket: Socket;
  cores: number;
  threads: number;
  /** Relative gaming performance (CPU-bound), fastest gaming CPU = 100. */
  gamingIndex: number;
  /** Relative multi-threaded performance, fastest = 100. */
  multiIndex: number;
  /** Relative single-thread performance, fastest = 100. Falls back to gamingIndex when absent. */
  singleIndex?: number;
  /** Benchmark source per metric; a metric without one is an estimate. */
  source?: Partial<Record<CpuMetric, BenchSource>>;
  /** Sustained/boost package power in watts (Intel: PL2). */
  power: number;
  memTypes: readonly MemType[];
  /** Officially supported max memory speed in MT/s, per memory type. */
  maxMemSpeed: Partial<Record<MemType, number>>;
  pcieGen: PcieGen;
  hasIgpu: boolean;
  includesCooler: boolean;
  /** Large-cache CPUs (X3D) are much less sensitive to RAM speed. */
  bigCache?: boolean;
  /** Integrated graphics strength on the discrete-GPU raster scale (APUs only). */
  igpuIndex?: number;
  generation: string;
  /** Laptop processor (soldered, socket 'BGA'). */
  laptop?: boolean;
}

export interface Gpu {
  id: string;
  name: string;
  brand: 'NVIDIA' | 'AMD' | 'Intel';
  /** Relative raster performance, fastest = 100. */
  rasterIndex: number;
  /** Relative ray-tracing performance, fastest = 100. */
  rtIndex: number;
  /** Relative local-LLM token generation speed, fastest = 100. Falls back to memory bandwidth when absent. */
  aiIndex?: number;
  /** Benchmark source per metric; a metric without one is an estimate. */
  source?: Partial<Record<GpuMetric, BenchSource>>;
  vram: number;
  /** Memory bandwidth in GB/s (drives local AI token speed). */
  bandwidth: number;
  power: number;
  lengthMm: number;
  pcieLanes: 4 | 8 | 16;
  pcieGen: PcieGen;
  /** NVIDIA CUDA ecosystem — best software support for AI and rendering. */
  cuda: boolean;
  /** Needs a 12V-2x6 / 12VHPWR power connector. */
  needs12v2x6: boolean;
  /** Laptop graphics: the same chip comes in several power versions. */
  laptop?: boolean;
  /** Laptop chip name shared by its power versions, e.g. "RTX 3060 Laptop". */
  family?: string;
  /** Laptop graphics power limit (TGP) in watts. */
  tgp?: number;
  /** The power version most laptops with this chip use (shown first in the picker). */
  typical?: boolean;
}

export interface Motherboard {
  id: string;
  name: string;
  socket: Socket;
  chipset: string;
  formFactor: FormFactor;
  memType: MemType;
  memSlots: 2 | 4;
  maxMemGb: number;
  maxMemSpeed: number;
  pcieGen: PcieGen;
  /** CPU power the board's VRM can sustain without throttling, watts. */
  vrmWatts: number;
  m2Slots: number;
  /** Older boards that need a BIOS update for newer CPUs. */
  biosNoteFor?: string[];
  /** CPU generations this chipset does not support at all (e.g. B550 with Ryzen 2000). */
  unsupported?: string[];
}

export interface RamKit {
  id: string;
  name: string;
  type: MemType;
  sticks: 1 | 2 | 4;
  totalGb: number;
  speed: number;
  cl: number;
  /** Soldered laptop memory (LPDDR5X): only for laptops, can't be upgraded. */
  laptopOnly?: boolean;
}

export type StorageKind = 'HDD' | 'SATA SSD' | 'NVMe Gen3' | 'NVMe Gen4' | 'NVMe Gen5';

export interface Storage {
  id: string;
  name: string;
  kind: StorageKind;
  capacityGb: number;
}

export interface Cooler {
  id: string;
  name: string;
  kind: 'stock' | 'air' | 'aio';
  /** Heat it can handle while keeping the CPU at full boost, watts. */
  ratedWatts: number;
  heightMm?: number;
  radiatorMm?: number;
}

export interface Psu {
  id: string;
  name: string;
  watts: number;
  efficiency: '80+ Bronze' | '80+ Gold' | '80+ Platinum';
  native12v2x6: boolean;
}

export interface Case {
  id: string;
  name: string;
  supports: FormFactor[];
  maxGpuMm: number;
  maxCoolerMm: number;
  maxRadiatorMm: number;
}

export interface Build {
  cpu?: Cpu;
  motherboard?: Motherboard;
  ram?: RamKit;
  gpu?: Gpu;
  storage?: Storage;
  cooler?: Cooler;
  psu?: Psu;
  case?: Case;
}

export type PartSlot = keyof Build;

export type Resolution = '1080p' | '1440p' | '4K';

export type WorkloadId =
  | 'aaa'
  | 'esports'
  | 'raytracing'
  | 'streaming'
  | 'video'
  | 'render3d'
  | 'ai'
  | 'office';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  slots: PartSlot[];
  message: string;
}
