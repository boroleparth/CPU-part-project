import { cases, coolers, cpus as allCpus, gpus as allGpus, isLegacyCpu, isLegacyGpu, motherboards, psus, ramKits, storages } from '../data';

// The auto-builder recommends parts that are still sold new.
const cpus = allCpus.filter((c) => !isLegacyCpu(c));
const gpus = allGpus.filter((g) => !isLegacyGpu(g));
import { checkCompatibility, recommendedPsuWatts } from './compatibility';
import { minCpuIndexForGpu, simulateFps } from './simulation';
import type { Build, Case, Cooler, Cpu, FormFactor, Gpu, MemType, Motherboard, RamKit, Resolution, WorkloadId } from './types';
import { type GamingWorkload, workloadById } from './workloads';

export type Tier = 'entry' | 'mid' | 'high' | 'enthusiast';

export const tiers: { id: Tier; label: string; blurb: string }[] = [
  { id: 'entry', label: 'Entry', blurb: 'Smooth, playable, sensible' },
  { id: 'mid', label: 'Mainstream', blurb: 'The sweet spot for most people' },
  { id: 'high', label: 'High-end', blurb: 'High refresh, high settings' },
  { id: 'enthusiast', label: 'Enthusiast', blurb: 'No compromises' },
];

/** Default FPS targets per tier for each frame-rate workload. */
export const fpsTargets: Record<'aaa' | 'esports' | 'raytracing' | 'streaming', Record<Tier, number>> = {
  aaa: { entry: 60, mid: 90, high: 120, enthusiast: 160 },
  esports: { entry: 144, mid: 240, high: 360, enthusiast: 500 },
  raytracing: { entry: 40, mid: 60, high: 90, enthusiast: 120 },
  streaming: { entry: 60, mid: 80, high: 110, enthusiast: 144 },
};

/** Minimum relative strength (0–1) of the main parts for creator workloads. */
const creatorStrength: Record<Tier, number> = { entry: 0.3, mid: 0.48, high: 0.7, enthusiast: 0.92 };
const aiVram: Record<Tier, number> = { entry: 12, mid: 16, high: 24, enthusiast: 32 };

export interface AutoBuildRequest {
  workloads: WorkloadId[];
  resolution: Resolution;
  tier: Tier;
  /** Optional override of the AAA/primary-game FPS target. */
  targetFps?: number;
  cpuBrand?: 'any' | Cpu['brand'];
  gpuBrand?: 'any' | Gpu['brand'];
  formFactor?: 'any' | FormFactor;
}

export interface AutoBuildResult {
  build: Build;
  reasons: string[];
  /** Targets that could not be met even with the strongest parts. */
  shortfalls: string[];
}

const gamingIds = ['aaa', 'esports', 'raytracing', 'streaming'] as const;
type GamingId = (typeof gamingIds)[number];
const isGaming = (id: WorkloadId): id is GamingId => (gamingIds as readonly string[]).includes(id);

/** Lower is "cheaper": parts are ranked by performance as a cost proxy (no prices yet). */
const cpuCost = (c: Cpu) => c.gamingIndex * 0.6 + c.multiIndex * 0.4;

export function targetFor(id: GamingId, req: AutoBuildRequest): number {
  if (req.targetFps && (id === 'aaa' || (id === 'streaming' && !req.workloads.includes('aaa')))) return req.targetFps;
  return fpsTargets[id][req.tier];
}

/** Best motherboard for a CPU: right socket, VRM strong enough, preferred form factor and memory type. */
export function pickMotherboard(cpu: Cpu, opts: { formFactor?: FormFactor | 'any'; memType?: MemType; minPcie?: number; tier?: Tier } = {}): Motherboard | undefined {
  const all = motherboards.filter((m) => m.socket === cpu.socket && cpu.memTypes.includes(m.memType) && !m.unsupported?.includes(cpu.generation));
  const ff = opts.formFactor && opts.formFactor !== 'any' ? opts.formFactor : undefined;
  const memPref: MemType | undefined = opts.memType ?? (cpu.memTypes.includes('DDR5') && opts.tier !== 'entry' ? 'DDR5' : undefined);
  const score = (m: Motherboard) => {
    let s = 0;
    if (m.vrmWatts < cpu.power) s += 1000 + (cpu.power - m.vrmWatts) * 5; // avoid throttling boards
    if (ff && m.formFactor !== ff) s += 500;
    if (!ff && m.formFactor === 'ITX') s += 50; // ITX only when asked for
    if (memPref && m.memType !== memPref) s += 200;
    if (m.biosNoteFor?.includes(cpu.generation)) s += 30;
    // Prefer a PCIe 4.0+ slot for x8 cards; older platforms simply don't have one.
    if (m.pcieGen < (opts.minPcie ?? 3)) s += 150;
    // Higher tiers get a mainstream-or-better chipset (better VRM, more M.2 / USB).
    if ((opts.tier === 'high' || opts.tier === 'enthusiast') && ['A620', 'H610', 'B450', 'A520', 'H510', 'H310'].includes(m.chipset)) s += 300;
    if (opts.tier === 'enthusiast' && !ff && m.formFactor !== 'ATX') s += 100;
    s += m.vrmWatts * 0.3; // otherwise prefer the simplest board that does the job
    return s;
  };
  return [...all].sort((a, b) => score(a) - score(b))[0];
}

/** Two-stick kit of the right type with at least `needGb`, at the fastest speed the platform actually uses. */
export function pickRam(board: Motherboard, cpu: Cpu, needGb: number): RamKit | undefined {
  const cpuMax = Math.round(((cpu.maxMemSpeed[board.memType] ?? 3200) * 1.15) / 200) * 200;
  const usable = Math.min(board.maxMemSpeed, Math.max(cpuMax, board.memType === 'DDR5' ? 6000 : 3600));
  const kits = ramKits.filter((k) => !k.laptopOnly && k.type === board.memType && k.sticks <= board.memSlots && k.sticks >= 2 && k.totalGb <= board.maxMemGb);
  const enough = kits.filter((k) => k.totalGb >= needGb);
  const pool = enough.length ? enough : kits;
  const score = (k: RamKit) => {
    const capPenalty = Math.abs(k.totalGb - needGb) * (k.totalGb < needGb ? 10 : 1);
    const wasted = k.speed > usable ? (k.speed - usable) / 100 : 0;
    const slow = (usable - Math.min(k.speed, usable)) / 200;
    return capPenalty + wasted * 2 + slow + k.cl / 10 + (k.sticks === 4 ? 5 : 0);
  };
  return [...pool].sort((a, b) => score(a) - score(b))[0];
}

export function pickCooler(cpu: Cpu, tier: Tier, maxHeight = 999, maxRadiator = 999): Cooler {
  if (cpu.includesCooler && cpu.power <= 95 && tier !== 'enthusiast') {
    const stock = coolers.find((c) => c.kind === 'stock')!;
    if ((stock.heightMm ?? 0) <= maxHeight) return stock;
  }
  // Low-profile coolers only make sense when a tower cooler will not fit.
  const fits = (c: Cooler) => c.kind !== 'stock' && (c.heightMm ?? 0) <= maxHeight && (c.radiatorMm ?? 0) <= maxRadiator && (c.id !== 'lowprofile' || maxHeight < 150);
  const order = [...coolers].filter(fits).sort((a, b) => a.ratedWatts - b.ratedWatts || (a.kind === 'air' ? -1 : 1));
  return order.find((c) => c.ratedWatts >= cpu.power) ?? order[order.length - 1];
}

export function pickCase(board: Motherboard, gpu: Gpu | undefined, cooler: Cooler): Case | undefined {
  return cases.find((c) =>
    c.supports.includes(board.formFactor) &&
    (!gpu || gpu.lengthMm <= c.maxGpuMm) &&
    (cooler.kind === 'stock' || (cooler.heightMm ?? 0) <= c.maxCoolerMm) &&
    (cooler.radiatorMm ?? 0) <= c.maxRadiatorMm,
  );
}

export function pickPsu(build: Build) {
  const rec = recommendedPsuWatts(build);
  const needsNative = build.gpu?.needs12v2x6 ?? false;
  return psus.find((p) => p.watts >= rec && (!needsNative || p.native12v2x6)) ?? psus[psus.length - 1];
}

function ramNeed(req: AutoBuildRequest): number {
  let need = req.tier === 'entry' ? 16 : 32;
  if (req.workloads.some((w) => w === 'video' || w === 'render3d' || w === 'ai')) {
    need = Math.max(need, req.tier === 'entry' ? 32 : req.tier === 'enthusiast' ? 96 : 64);
  }
  if (req.workloads.every((w) => w === 'esports' || w === 'office')) need = Math.min(need, req.tier === 'entry' ? 16 : 32);
  return need;
}

/** A balanced reference CPU used to size the GPU before the real CPU is chosen. */
const referenceBuild = (gpu: Gpu): Build => ({
  cpu: cpus.find((c) => c.id === 'r7-9800x3d'),
  gpu,
  ram: ramKits.find((k) => k.id === 'ddr5-2x16-6000'),
  motherboard: motherboards.find((m) => m.id === 'am5-b650-atx'),
});

export function autoBuild(req: AutoBuildRequest): AutoBuildResult {
  const reasons: string[] = [];
  const shortfalls: string[] = [];
  const ids = req.workloads.length ? req.workloads : (['aaa'] as WorkloadId[]);
  const formFactor = req.formFactor ?? 'any';
  const maxGpuLen = formFactor === 'ITX' ? 310 : formFactor === 'mATX' ? 330 : 450;

  // 1. GPU: weakest card that meets every GPU requirement.
  const anyGpuBrand = (req.gpuBrand ?? 'any') === 'any';
  // AI and GPU rendering software runs best on CUDA, so prefer NVIDIA unless a brand was chosen.
  const wantsCuda = anyGpuBrand && ids.some((w) => w === 'ai' || w === 'render3d');
  const gpuPool = gpus
    .filter((g) => anyGpuBrand || g.brand === req.gpuBrand)
    .filter((g) => !wantsCuda || g.cuda)
    .filter((g) => g.lengthMm <= maxGpuLen);
  const gpuNeeds: ((g: Gpu) => boolean)[] = [];
  for (const id of ids) {
    if (isGaming(id)) {
      const w = workloadById[id] as GamingWorkload;
      const target = targetFor(id, req);
      gpuNeeds.push((g) => simulateFps(referenceBuild(g), w, req.resolution).gpuFps >= target && g.vram >= w.vramNeed[req.resolution] - (req.tier === 'entry' ? 2 : 0));
    } else if (id === 'video') {
      gpuNeeds.push((g) => g.rasterIndex / 100 >= creatorStrength[req.tier] * 0.6 && g.vram >= 8);
    } else if (id === 'render3d') {
      gpuNeeds.push((g) => (g.rasterIndex / 100) * (g.cuda ? 1 : 0.65) >= creatorStrength[req.tier] && g.vram >= 12);
    } else if (id === 'ai') {
      gpuNeeds.push((g) => g.vram >= aiVram[req.tier]);
    }
  }
  let gpu: Gpu | undefined;
  if (gpuNeeds.length) {
    const sorted = [...gpuPool].sort((a, b) => a.rasterIndex - b.rasterIndex || b.vram - a.vram || (a.cuda === b.cuda ? 0 : a.cuda ? -1 : 1));
    gpu = sorted.find((g) => gpuNeeds.every((n) => n(g)));
    if (!gpu) {
      gpu = [...gpuPool].sort((a, b) => b.rasterIndex - a.rasterIndex)[0];
      shortfalls.push(`No graphics card in the database meets every target; using the strongest available (${gpu.name}).`);
    }
    reasons.push(`${gpu.name}: the least powerful card that hits your targets — anything stronger would be wasted or bottlenecked.`);
  } else if (ids.includes('office')) {
    reasons.push('No graphics card: integrated graphics are plenty for everyday work.');
  }

  // 2. CPU: weakest CPU that keeps the GPU fully fed and meets core-count needs.
  const cpuPool = cpus
    .filter((c) => (req.cpuBrand ?? 'any') === 'any' || c.brand === req.cpuBrand)
    .filter((c) => gpu || c.hasIgpu);
  const cpuNeeds: ((c: Cpu) => boolean)[] = [];
  for (const id of ids) {
    if (isGaming(id)) {
      const w = workloadById[id] as GamingWorkload;
      const target = targetFor(id, req);
      cpuNeeds.push((c) => {
        const ramId = c.memTypes.includes('DDR5') ? 'ddr5-2x16-6000' : 'ddr4-2x16-3600';
        const trial: Build = { cpu: c, gpu, ram: ramKits.find((k) => k.id === ramId) };
        const p = simulateFps(trial, w, req.resolution);
        // Keep the GPU the limit, but never demand far more than the target needs.
        return !gpu || p.cpuFps >= Math.min(p.gpuFps * 1.05, target * 1.25);
      });
      if (id === 'streaming') cpuNeeds.push((c) => c.cores >= (req.tier === 'entry' ? 6 : 8));
      // Modern AAA games stutter on 4-core CPUs even when average FPS looks fine.
      if (id === 'aaa' || id === 'raytracing') cpuNeeds.push((c) => c.cores >= 6);
    } else if (id === 'video') {
      cpuNeeds.push((c) => c.multiIndex / 100 >= creatorStrength[req.tier]);
    } else if (id === 'render3d') {
      cpuNeeds.push((c) => c.multiIndex / 100 >= creatorStrength[req.tier] * 0.6);
    } else if (id === 'office') {
      cpuNeeds.push((c) => c.gamingIndex >= (req.tier === 'entry' ? 45 : 60));
    } else if (id === 'ai') {
      cpuNeeds.push((c) => c.cores >= 6);
    }
  }
  if (req.tier !== 'entry') cpuNeeds.push((c) => (c.socket !== 'AM4' && c.socket !== 'LGA1200' && c.socket !== 'LGA1151') || req.tier === 'mid');
  if (gpu && ids.some(isGaming)) cpuNeeds.push((c) => c.gamingIndex >= minCpuIndexForGpu(gpu!));
  const sortedCpus = [...cpuPool].sort((a, b) => cpuCost(a) - cpuCost(b));
  let cpu = sortedCpus.find((c) => cpuNeeds.every((n) => n(c)));
  if (!cpu) {
    cpu = [...cpuPool].sort((a, b) => cpuCost(b) - cpuCost(a))[0];
    shortfalls.push(`No processor meets every target; using one of the strongest (${cpu.name}).`);
  }
  reasons.push(`${cpu.name}: the least powerful CPU that keeps ${gpu ? 'the GPU fully used' : 'everything responsive'} for your workloads.`);

  // 3. Platform
  const motherboard = pickMotherboard(cpu, { formFactor, minPcie: gpu?.pcieLanes === 8 ? 4 : 3, tier: req.tier })!;
  reasons.push(`${motherboard.name}: matches the ${cpu.socket} socket and can power the CPU without throttling.`);
  const ram = pickRam(motherboard, cpu, ramNeed(req))!;
  reasons.push(`${ram.name}: two sticks for dual-channel bandwidth, sized for your workloads.`);

  // 4. Cooling, case, power, storage
  const caseCandidates = formFactor === 'ITX' ? { h: 70, r: 240 } : formFactor === 'mATX' ? { h: 160, r: 240 } : { h: 170, r: 360 };
  const cooler = pickCooler(cpu, req.tier, caseCandidates.h, caseCandidates.r);
  const pcCase = pickCase(motherboard, gpu, cooler)!;
  const storage = storages.find((s) => s.id === (ids.some((w) => w === 'video' || w === 'ai' || w === 'render3d') && req.tier !== 'entry' ? (req.tier === 'enthusiast' ? 'nvme4-4tb' : 'nvme4-2tb') : req.tier === 'entry' ? 'nvme4-1tb' : 'nvme4-2tb'))!;
  const partial: Build = { cpu, gpu, motherboard, ram, cooler, case: pcCase, storage };
  const psu = pickPsu(partial);
  reasons.push(`${cooler.name}, ${psu.name} and ${pcCase.name}: sized to the CPU's heat, the system's peak power and the parts' dimensions.`);

  const build: Build = { ...partial, psu };
  const errors = checkCompatibility(build).filter((i) => i.severity === 'error');
  for (const e of errors) shortfalls.push(e.message);
  return { build, reasons, shortfalls };
}

/**
 * Fills in the parts people don't usually want to choose (motherboard, cooler,
 * power supply, case, and RAM/storage if missing) so they match the CPU, GPU
 * and RAM that were picked. Parts already present are kept when they fit.
 */
export function completeBuild(picked: Build, tier: Tier = 'mid'): Build {
  const build: Build = { ...picked };
  const { cpu } = build;
  if (!cpu) return build;
  if (build.ram && !cpu.memTypes.includes(build.ram.type)) build.ram = undefined;
  if (cpu.laptop) return completeLaptop(build);

  const mbOk = (m?: Motherboard) => m && m.socket === cpu.socket && cpu.memTypes.includes(m.memType) && !m.unsupported?.includes(cpu.generation) && (!build.ram || build.ram.type === m.memType);
  if (!mbOk(build.motherboard)) {
    build.motherboard = pickMotherboard(cpu, { memType: build.ram?.type, minPcie: build.gpu?.pcieLanes === 8 ? 4 : 3, tier });
  }
  const mb = build.motherboard!;
  if (!build.ram || build.ram.sticks > mb.memSlots) build.ram = pickRam(mb, cpu, 32);
  if (!build.storage) build.storage = storages.find((s) => s.id === 'nvme4-1tb');

  const coolerOk = build.cooler && build.cooler.ratedWatts >= cpu.power && (build.cooler.kind !== 'stock' || cpu.includesCooler);
  if (!coolerOk) build.cooler = pickCooler(cpu, tier);
  const caseOk = build.case && checkCompatibility(build).every((i) => i.severity !== 'error' || !i.slots.includes('case'));
  if (!caseOk) build.case = pickCase(mb, build.gpu, build.cooler!) ?? cases[cases.length - 1];
  if (!build.psu || build.psu.watts < recommendedPsuWatts(build) || (build.gpu?.needs12v2x6 && !build.psu.native12v2x6)) build.psu = pickPsu(build);
  return build;
}

/**
 * A laptop has no motherboard, cooler, power supply or case to choose. If memory or
 * storage is missing, assume what most laptops with this processor ship with:
 * two 8 GB sticks at the processor's rated speed and a 512 GB NVMe drive.
 */
function completeLaptop(build: Build): Build {
  const cpu = build.cpu!;
  const { motherboard: _m, cooler: _c, psu: _p, case: _k, ...laptop } = build;
  if (!laptop.ram) {
    const type: MemType = cpu.memTypes.includes('DDR5') ? 'DDR5' : 'DDR4';
    const rated = cpu.maxMemSpeed[type] ?? 3200;
    const kits = ramKits.filter((k) => k.type === type && k.totalGb === 16 && k.sticks === 2 && k.speed <= rated);
    laptop.ram = [...kits].sort((a, b) => b.speed - a.speed)[0] ?? ramKits.find((k) => k.type === type && k.totalGb === 16 && k.sticks === 2);
  }
  if (!laptop.storage) laptop.storage = storages.find((s) => s.id === 'nvme4-512');
  return laptop;
}
