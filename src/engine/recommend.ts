import { cpus, gpus, isLaptopBuild, isLegacyCpu, isLegacyGpu, laptopCpus, laptopGpus, powerVersions, ramKits, storages } from '../data';
import { pickCase, pickCooler, pickMotherboard, pickPsu, pickRam } from './builder';
import { checkCompatibility, recommendedPsuWatts } from './compatibility';
import { evaluateWorkload, minCpuIndexForGpu, type WorkloadResult } from './simulation';
import { DEFAULT_SETTINGS } from './settings';
import type { Build, Cpu, GameSettings, Gpu, Resolution, WorkloadId } from './types';
import { workloadById } from './workloads';

export interface Suggestion {
  id: string;
  kind: 'upgrade' | 'save' | 'fix';
  title: string;
  detail: string;
  /** Parts to swap in when the suggestion is applied. */
  changes: Build;
}

/** Suggestions recommend parts you can still buy new. Older CPUs are only offered as drop-in upgrades for an older platform. */
const buyableDesktopGpus = gpus.filter((g) => !isLegacyGpu(g));
/** Laptop graphics are offered at their usual power version; the power suggestion covers the rest. */
// RTX 30 laptops are end-of-line stock, so suggestions point at RTX 40 / 50 laptops.
const buyableLaptopGpus = laptopGpus.filter((g) => g.typical && !isLegacyGpu(g) && !/RTX 30/.test(g.name));
const gpuPool = (build: Build) => (isLaptopBuild(build) ? buyableLaptopGpus : buyableDesktopGpus);
const cpuPool = (build: Build) =>
  isLaptopBuild(build)
    ? laptopCpus.filter((c) => !isLegacyCpu(c))
    : cpus.filter((c) => !isLegacyCpu(c) || (!!build.cpu && isLegacyCpu(build.cpu) && c.socket === build.cpu.socket));

/** In a laptop the processor and graphics can't be swapped, so the advice is which laptop to buy instead. */
const cpuTitle = (build: Build, c: Cpu) => (isLaptopBuild(build) ? `Choose a laptop with the ${c.name}` : `Upgrade CPU to ${c.name}`);
const gpuTitle = (build: Build, g: Gpu) => (isLaptopBuild(build) ? `Choose a laptop with the ${g.name}` : `Upgrade GPU to ${g.name}`);

const cpuCost = (c: Cpu) => c.gamingIndex * 0.6 + c.multiIndex * 0.4;
const gpuCost = (g: Gpu) => g.rasterIndex + g.vram * 0.3;

/** Swaps the CPU, bringing a new board/RAM/cooler along if the socket changes. */
export function withCpu(build: Build, cpu: Cpu): Build {
  const next: Build = { ...build, cpu };
  const mb = build.motherboard;
  if (mb && (mb.socket !== cpu.socket || !cpu.memTypes.includes(mb.memType))) {
    next.motherboard = pickMotherboard(cpu, { formFactor: mb.formFactor });
    if (next.motherboard && build.ram) next.ram = pickRam(next.motherboard, cpu, build.ram.totalGb);
  }
  if (build.cooler && (build.cooler.ratedWatts < cpu.power || (build.cooler.kind === 'stock' && !cpu.includesCooler))) {
    next.cooler = pickCooler(cpu, 'high', build.case?.maxCoolerMm, build.case?.maxRadiatorMm);
  }
  return next;
}

function changesBetween(before: Build, after: Build): Build {
  const out: Build = {};
  for (const k of Object.keys(after) as (keyof Build)[]) {
    if (after[k] && after[k] !== before[k]) (out as Record<string, unknown>)[k] = after[k];
  }
  return out;
}

function hasNoErrors(build: Build) {
  return !checkCompatibility(build).some((i) => i.severity === 'error');
}

function hasErrors(build: Build) {
  return checkCompatibility(build).some((i) => i.severity === 'error');
}

/** Adds the PSU / case changes a bigger part needs, so the suggestion stays buildable. */
function withSupportingParts(build: Build): Build {
  const next = { ...build };
  if (next.psu && next.psu.watts < recommendedPsuWatts(next)) next.psu = pickPsu(next);
  if (next.psu && next.gpu?.needs12v2x6 && !next.psu.native12v2x6) next.psu = pickPsu(next);
  if (next.case && next.motherboard && next.cooler && hasErrors(next)) {
    const c = pickCase(next.motherboard, next.gpu, next.cooler);
    if (c) next.case = c;
  }
  return next;
}

const platformNote = (before: Build, after: Build) =>
  after.motherboard && after.motherboard !== before.motherboard
    ? ` Needs a new ${after.motherboard.socket} motherboard${after.ram && after.ram !== before.ram ? ' and RAM' : ''}.`
    : '';

function suggestForGaming(build: Build, r: WorkloadResult, res: Resolution, id: WorkloadId, settings: GameSettings): Suggestion[] {
  const out: Suggestion[] = [];
  const p = r.judged!;
  const name = workloadById[id].short;
  if (!build.cpu) return out;

  if (!build.gpu) {
    // No graphics card: suggest the least powerful card that is a balanced match for this CPU.
    const ok = (g: Gpu) => {
      const r2 = evaluateWorkload(withSupportingParts({ ...build, gpu: g }), id, res, settings);
      return r2.score >= 90 && hasNoErrors(withSupportingParts({ ...build, gpu: g }));
    };
    const pool = [...gpuPool(build)].sort((a, b) => gpuCost(a) - gpuCost(b));
    const g = pool.find(ok) ?? pool.find((x) => evaluateWorkload({ ...build, gpu: x }, id, res, settings).score >= 75);
    if (g) {
      const after = withSupportingParts({ ...build, gpu: g });
      const q = evaluateWorkload(after, id, res, settings).judged!;
      out.push({
        id: `add-gpu-${g.id}`,
        kind: 'fix',
        title: isLaptopBuild(build) ? `Choose a laptop with the ${g.name}` : `Add a graphics card: ${g.name}`,
        detail: `Matches the ${build.cpu.name}: ~${Math.round(p.fps)} → ~${Math.round(q.fps)} FPS in ${name} at ${res}.${after.psu !== build.psu && after.psu ? ` Includes a ${after.psu.watts} W PSU.` : ''}`,
        changes: changesBetween(build, after),
      });
    }
    return out;
  }

  if (p.limitedBy === 'cpu' && p.bottleneck >= 0.1) {
    // Weakest CPU that removes the bottleneck: same socket first, then any platform.
    const fixes = (c: Cpu) => {
      const trial = withCpu(build, c);
      const q = evaluateWorkload(trial, id, res, settings).judged!;
      return q.limitedBy === 'gpu' || q.bottleneck < 0.06;
    };
    const stronger = cpuPool(build).filter((c) => c.gamingIndex > build.cpu!.gamingIndex).sort((a, b) => cpuCost(a) - cpuCost(b));
    let same = stronger.find((c) => c.socket === build.cpu!.socket && fixes(c));
    if (!same) {
      // No drop-in CPU fully fixes it: offer the best drop-in upgrade if it helps meaningfully.
      const best = stronger.filter((c) => c.socket === build.cpu!.socket).sort((a, b) => b.gamingIndex - a.gamingIndex)[0];
      if (best && evaluateWorkload(withCpu(build, best), id, res, settings).judged!.fps >= p.fps * 1.1) same = best;
    }
    const any = stronger.find((c) => fixes(c));
    for (const c of [same, any !== same ? any : undefined]) {
      if (!c) continue;
      const after = withSupportingParts(withCpu(build, c));
      const q = evaluateWorkload(after, id, res, settings).judged!;
      out.push({
        id: `cpu-${c.id}-${id}`,
        kind: 'upgrade',
        title: cpuTitle(build, c),
        detail: `Removes the ${name} CPU bottleneck at ${res}: ~${Math.round(p.fps)} → ~${Math.round(q.fps)} FPS.${platformNote(build, after)}`,
        changes: changesBetween(build, after),
      });
    }
    if (!same && !any) {
      out.push({ id: `res-${id}`, kind: 'fix', title: 'Raise resolution or graphics settings', detail: `No CPU in the database can keep up with this GPU in ${name} at ${res}. Playing at a higher resolution shifts the load onto the GPU for free.`, changes: {} });
    }
  }

  if (p.limitedBy === 'gpu' && p.bottleneck > 0.4) {
    // Spare CPU: either a stronger GPU or a cheaper CPU that performs the same.
    const gpuFix = gpuPool(build)
      .filter((g) => gpuCost(g) > gpuCost(build.gpu!))
      .sort((a, b) => gpuCost(a) - gpuCost(b))
      .find((g) => {
        const q = evaluateWorkload({ ...build, gpu: g }, id, res, settings).judged!;
        return q.bottleneck <= 0.3 || q.limitedBy === 'cpu';
      });
    if (gpuFix) {
      const after = withSupportingParts({ ...build, gpu: gpuFix });
      const q = evaluateWorkload(after, id, res, settings).judged!;
      out.push({
        id: `gpu-${gpuFix.id}-${id}`,
        kind: 'upgrade',
        title: gpuTitle(build, gpuFix),
        detail: `Your CPU has headroom to spare. This card uses it: ~${Math.round(p.fps)} → ~${Math.round(q.fps)} FPS in ${name} at ${res}.${after.psu !== build.psu ? ` Includes a ${after.psu?.watts} W PSU.` : ''}`,
        changes: changesBetween(build, after),
      });
    }
    const cheaper = isLaptopBuild(build) ? undefined : cpuPool(build)
      .filter((c) => c.socket === build.cpu!.socket && cpuCost(c) < cpuCost(build.cpu!))
      .sort((a, b) => cpuCost(a) - cpuCost(b))
      .find((c) => {
        const q = evaluateWorkload(withCpu(build, c), id, res, settings).judged!;
        return q.limitedBy === 'gpu' && q.bottleneck >= 0.15 && q.fps >= p.fps * 0.97 && c.gamingIndex >= minCpuIndexForGpu(build.gpu!);
      });
    if (cheaper) {
      out.push({
        id: `save-cpu-${cheaper.id}-${id}`,
        kind: 'save',
        title: `Save money: ${cheaper.name} performs the same here`,
        detail: `In ${name} at ${res} this GPU is the limit, so a lesser CPU gives nearly identical FPS. Keep your CPU if you plan a GPU upgrade later.`,
        changes: changesBetween(build, withCpu(build, cheaper)),
      });
    }
  }

  // VRAM need at the chosen preset / upscaling.
  const vramNeed = r.judged?.memory.vramNeedGb ?? 0;
  if (build.gpu.vram < vramNeed) {
    const g = gpuPool(build)
      .filter((x) => x.vram >= vramNeed && x.rasterIndex >= build.gpu!.rasterIndex * 0.95)
      .sort((a, b) => gpuCost(a) - gpuCost(b))[0];
    if (g) {
      const after = withSupportingParts({ ...build, gpu: g });
      out.push({ id: `vram-${g.id}`, kind: 'fix', title: isLaptopBuild(build) ? `Get more VRAM: a laptop with the ${g.name} (${g.vram} GB)` : `Get more VRAM: ${g.name} (${g.vram} GB)`, detail: `${build.gpu.vram} GB is tight for ${res}. This card has similar or better speed and enough memory for high textures.`, changes: changesBetween(build, after) });
    }
  }
  return out;
}

function suggestForThroughput(build: Build, r: WorkloadResult, res: Resolution, id: WorkloadId, settings: GameSettings = DEFAULT_SETTINGS): Suggestion[] {
  const t = r.throughput!;
  const out: Suggestion[] = [];
  if (t.imbalance < 0.25 && t.strengths[t.weakest]! > 0.5) return out;
  const base = r.score;
  const better = (trial: Build) => evaluateWorkload(trial, id, res, settings).throughput!.performance > t.performance * 1.08 || evaluateWorkload(trial, id, res, settings).score > base + 10;
  const name = workloadById[id].short;

  if ((t.weakest === 'cpuMulti' || t.weakest === 'cpuSingle') && build.cpu) {
    const key = t.weakest === 'cpuMulti' ? 'multiIndex' : 'gamingIndex';
    const target = Math.min(1, t.strengths[t.strongest]!) * 100 * 0.85;
    const pool = cpuPool(build).filter((c) => c[key] > build.cpu![key]).sort((a, b) => cpuCost(a) - cpuCost(b));
    const c = pool.find((c) => c.socket === build.cpu!.socket && c[key] >= target) ?? pool.find((c) => c[key] >= target) ?? pool[pool.length - 1];
    if (c) {
      const after = withSupportingParts(withCpu(build, c));
      if (better(after)) out.push({ id: `cpu-${c.id}-${id}`, kind: 'upgrade', title: cpuTitle(build, c), detail: `${name} leans on ${t.weakest === 'cpuMulti' ? 'many cores' : 'fast single cores'}; ${c.cores} cores bring it in line with your other parts.${platformNote(build, after)}`, changes: changesBetween(build, after) });
    }
  }
  if (t.weakest === 'gpu' || t.weakest === 'gpuBandwidth') {
    const w = workloadById[id];
    const need = w.kind === 'throughput' ? w.vramNeed ?? 0 : 0;
    const current = build.gpu ? gpuCost(build.gpu) : 0;
    const prefersCuda = id === 'ai' || id === 'render3d';
    const pool = gpuPool(build).filter((g) => gpuCost(g) > current && g.vram >= need).sort((a, b) => gpuCost(a) - gpuCost(b));
    const g = pool.find((g) => (!prefersCuda || g.cuda) && better(withSupportingParts({ ...build, gpu: g }))) ?? pool.find((g) => better({ ...build, gpu: g }));
    if (g) {
      const after = withSupportingParts({ ...build, gpu: g });
      out.push({ id: `gpu-${g.id}-${id}`, kind: 'upgrade', title: gpuTitle(build, g), detail: `${name} is GPU-heavy; ${g.vram} GB${g.cuda && prefersCuda ? ' with CUDA support' : ''} lifts it to ~${Math.round(evaluateWorkload(after, id, res, settings).throughput!.performance)}% of top-end.`, changes: changesBetween(build, after) });
    }
  }
  if (t.weakest === 'ram' || (build.ram && build.ram.totalGb < workloadById[id].ramNeedGb)) {
    const type = build.motherboard?.memType ?? build.ram?.type ?? 'DDR5';
    const need = workloadById[id].ramNeedGb;
    // Soldered laptop memory can only be chosen when buying; other laptops take normal SO-DIMM sticks.
    const soldered = !!build.ram?.laptopOnly;
    const rated = build.cpu?.laptop ? build.cpu.maxMemSpeed[type] : undefined;
    const kit = (build.motherboard && build.cpu ? pickRam(build.motherboard, build.cpu, need) : undefined) ??
      ramKits
        .filter((k) => k.type === type && k.sticks === 2 && k.totalGb >= need && !!k.laptopOnly === soldered && (!rated || k.speed <= rated))
        .sort((a, b) => a.totalGb - b.totalGb || b.speed - a.speed)[0];
    const title = soldered ? `Choose the ${kit?.totalGb} GB version` : build.cpu?.laptop ? `Upgrade memory to ${kit?.name}` : `Use ${kit?.name}`;
    const detail = soldered ? `${name} wants ~${need} GB. This laptop's memory is soldered, so pick the bigger configuration when buying.` : `${name} wants ~${need} GB in two sticks (dual-channel).`;
    if (kit && kit !== build.ram) out.push({ id: `ram-${kit.id}`, kind: 'fix', title, detail, changes: { ram: kit } });
  }
  if (t.weakest === 'storage' || build.storage?.kind === 'HDD' || build.storage?.kind === 'SATA SSD') {
    const s = storages.find((x) => x.kind === 'NVMe Gen4' && x.capacityGb >= (build.storage?.capacityGb ?? 1000)) ?? storages.find((x) => x.id === 'nvme4-2tb')!;
    if (t.timeShare.storage && t.timeShare.storage > 0.15) out.push({ id: `storage-${s.id}`, kind: 'fix', title: `Use an NVMe SSD (${s.name})`, detail: 'Project files, caches and apps load several times faster from NVMe.', changes: { storage: s } });
  }
  return out;
}

/** Fixes for compatibility errors that have an obvious single-part answer. */
function compatibilityFixes(build: Build): Suggestion[] {
  const out: Suggestion[] = [];
  const issues = checkCompatibility(build);
  const { cpu } = build;
  if (cpu && issues.some((i) => i.severity === 'error' && i.slots.includes('motherboard'))) {
    const mb = pickMotherboard(cpu, { formFactor: build.motherboard?.formFactor, memType: build.ram?.type });
    if (mb && mb !== build.motherboard) {
      const ram = build.ram && build.ram.type !== mb.memType ? pickRam(mb, cpu, build.ram.totalGb) : undefined;
      out.push({ id: `fix-mb-${mb.id}`, kind: 'fix', title: `Use a ${mb.name} motherboard`, detail: `Matches the ${cpu.name}'s ${cpu.socket} socket${ram ? ` (with ${ram.name})` : ''}.`, changes: ram ? { motherboard: mb, ram } : { motherboard: mb } });
    }
  }
  if (build.ram && build.motherboard && cpu && build.ram.type !== build.motherboard.memType && build.motherboard.socket === cpu.socket) {
    const kit = pickRam(build.motherboard, cpu, build.ram.totalGb);
    if (kit) out.push({ id: `fix-ram-${kit.id}`, kind: 'fix', title: `Use ${kit.name}`, detail: `This board takes ${build.motherboard.memType}.`, changes: { ram: kit } });
  }
  if (cpu && build.cooler && issues.some((i) => i.slots.includes('cooler') && i.slots.includes('cpu'))) {
    const c = pickCooler(cpu, 'high', build.case?.maxCoolerMm, build.case?.maxRadiatorMm);
    if (c !== build.cooler) out.push({ id: `fix-cooler-${c.id}`, kind: 'fix', title: `Use a ${c.name}`, detail: `Rated for ~${c.ratedWatts} W, enough for the ${cpu.name}.`, changes: { cooler: c } });
  }
  if (build.psu && issues.some((i) => i.slots.includes('psu'))) {
    const p = pickPsu(build);
    if (p !== build.psu) out.push({ id: `fix-psu-${p.id}`, kind: 'fix', title: `Use a ${p.name}`, detail: `Covers the ~${recommendedPsuWatts(build)} W recommendation with headroom.`, changes: { psu: p } });
  }
  if (build.case && build.motherboard && build.cooler && issues.some((i) => i.severity === 'error' && i.slots.includes('case'))) {
    const c = pickCase(build.motherboard, build.gpu, build.cooler);
    if (c && c !== build.case) out.push({ id: `fix-case-${c.id}`, kind: 'fix', title: `Use a ${c.name} case`, detail: 'Fits the motherboard, graphics card and cooler.', changes: { case: c } });
  }
  return out;
}

/**
 * Laptop graphics at a low power limit: the same chip in a laptop that gives it more
 * watts is noticeably faster, so it is worth checking the spec sheet before buying.
 */
function powerSuggestion(build: Build, results: WorkloadResult[], res: Resolution, settings: GameSettings): Suggestion[] {
  const gpu = build.gpu;
  if (!gpu?.laptop || !results.length) return [];
  const top = powerVersions(gpu).at(-1)!;
  if (top === gpu) return [];
  // The biggest gain across the chosen uses (everyday work barely touches the GPU, games do).
  const perf = (b: Build, id: WorkloadResult['workload']) => {
    const x = evaluateWorkload(b, id, res, settings);
    return x.judged ? x.judged.fps : x.throughput!.performance;
  };
  const gain = Math.max(...results.map((r) => {
    const before = perf(build, r.workload);
    return before > 0 ? perf({ ...build, gpu: top }, r.workload) / before - 1 : 0;
  }));
  if (gain < 0.06) return [];
  return [{
    id: `tgp-${top.id}`,
    kind: 'upgrade',
    title: `Look for the ${top.tgp} W version of the ${gpu.family}`,
    detail: `Same chip with more power: about ${Math.round(gain * 100)}% faster than at ${gpu.tgp} W. Check "Max graphics power" (TGP) on the laptop's spec sheet.`,
    changes: { gpu: top },
  }];
}

/** One memory stick runs single-channel, which costs real speed (very common in budget laptops). */
function dualChannelFix(build: Build): Suggestion[] {
  const r = build.ram;
  if (!r || r.sticks !== 1) return [];
  const rated = build.cpu?.laptop ? build.cpu.maxMemSpeed[r.type] : undefined;
  const kit = ramKits
    .filter((k) => k.type === r.type && k.sticks === 2 && !k.laptopOnly && k.totalGb >= r.totalGb && (!rated || k.speed <= rated))
    .sort((a, b) => a.totalGb - b.totalGb || Math.abs(a.speed - r.speed) - Math.abs(b.speed - r.speed))[0];
  if (!kit) return [];
  const laptop = isLaptopBuild(build);
  return [{
    id: `dual-${kit.id}`,
    kind: 'fix',
    title: laptop ? `Add a second memory stick (${kit.name})` : `Use two sticks: ${kit.name}`,
    detail: laptop
      ? 'One stick runs single-channel, which slows games and the graphics. Most laptops have a free slot; check before buying.'
      : 'One stick runs single-channel and halves memory bandwidth. Two matching sticks fix it.',
    changes: { ram: kit },
  }];
}

export function suggest(build: Build, results: WorkloadResult[], res: Resolution, settings: GameSettings = DEFAULT_SETTINGS): Suggestion[] {
  const all: Suggestion[] = [...compatibilityFixes(build), ...dualChannelFix(build), ...powerSuggestion(build, results, res, settings)];
  for (const r of results) {
    const w = workloadById[r.workload];
    all.push(...(w.kind === 'gaming' ? suggestForGaming(build, r, res, r.workload, settings) : suggestForThroughput(build, r, res, r.workload)));
  }
  // De-duplicate by the set of parts changed (the first, most specific reason wins).
  const seen = new Set<string>();
  return all.filter((s) => {
    const ids = Object.values(s.changes).map((p) => p.id).sort().join('+');
    const key = ids || s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
