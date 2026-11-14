import { cpus, gpus, ramKits, storages } from '../data';
import { pickCase, pickCooler, pickMotherboard, pickPsu, pickRam } from './builder';
import { checkCompatibility, recommendedPsuWatts } from './compatibility';
import { evaluateWorkload, type WorkloadResult } from './simulation';
import type { Build, Cpu, Gpu, Resolution, WorkloadId } from './types';
import { workloadById } from './workloads';

export interface Suggestion {
  id: string;
  kind: 'upgrade' | 'save' | 'fix';
  title: string;
  detail: string;
  /** Parts to swap in when the suggestion is applied. */
  changes: Build;
}

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

function suggestForGaming(build: Build, r: WorkloadResult, res: Resolution, id: WorkloadId): Suggestion[] {
  const out: Suggestion[] = [];
  const p = r.judged!;
  const name = workloadById[id].short;
  if (!build.cpu || !build.gpu) return out;

  if (p.limitedBy === 'cpu' && p.bottleneck >= 0.1) {
    // Weakest CPU that removes the bottleneck: same socket first, then any platform.
    const fixes = (c: Cpu) => {
      const trial = withCpu(build, c);
      const q = evaluateWorkload(trial, id, res).judged!;
      return q.limitedBy === 'gpu' || q.bottleneck < 0.06;
    };
    const stronger = cpus.filter((c) => c.gamingIndex > build.cpu!.gamingIndex).sort((a, b) => cpuCost(a) - cpuCost(b));
    let same = stronger.find((c) => c.socket === build.cpu!.socket && fixes(c));
    if (!same) {
      // No drop-in CPU fully fixes it: offer the best drop-in upgrade if it helps meaningfully.
      const best = stronger.filter((c) => c.socket === build.cpu!.socket).sort((a, b) => b.gamingIndex - a.gamingIndex)[0];
      if (best && evaluateWorkload(withCpu(build, best), id, res).judged!.fps >= p.fps * 1.1) same = best;
    }
    const any = stronger.find((c) => fixes(c));
    for (const c of [same, any !== same ? any : undefined]) {
      if (!c) continue;
      const after = withSupportingParts(withCpu(build, c));
      const q = evaluateWorkload(after, id, res).judged!;
      out.push({
        id: `cpu-${c.id}-${id}`,
        kind: 'upgrade',
        title: `Upgrade CPU to ${c.name}`,
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
    const gpuFix = gpus
      .filter((g) => gpuCost(g) > gpuCost(build.gpu!))
      .sort((a, b) => gpuCost(a) - gpuCost(b))
      .find((g) => {
        const q = evaluateWorkload({ ...build, gpu: g }, id, res).judged!;
        return q.bottleneck <= 0.3 || q.limitedBy === 'cpu';
      });
    if (gpuFix) {
      const after = withSupportingParts({ ...build, gpu: gpuFix });
      const q = evaluateWorkload(after, id, res).judged!;
      out.push({
        id: `gpu-${gpuFix.id}-${id}`,
        kind: 'upgrade',
        title: `Upgrade GPU to ${gpuFix.name}`,
        detail: `Your CPU has headroom to spare. This card uses it: ~${Math.round(p.fps)} → ~${Math.round(q.fps)} FPS in ${name} at ${res}.${after.psu !== build.psu ? ` Includes a ${after.psu?.watts} W PSU.` : ''}`,
        changes: changesBetween(build, after),
      });
    }
    const cheaper = cpus
      .filter((c) => c.socket === build.cpu!.socket && cpuCost(c) < cpuCost(build.cpu!))
      .sort((a, b) => cpuCost(a) - cpuCost(b))
      .find((c) => {
        const q = evaluateWorkload(withCpu(build, c), id, res).judged!;
        return q.limitedBy === 'gpu' && q.bottleneck >= 0.15 && q.fps >= p.fps * 0.97;
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

  const w = workloadById[id];
  if (w.kind === 'gaming' && build.gpu.vram < w.vramNeed[res]) {
    const g = gpus
      .filter((x) => x.vram >= w.vramNeed[res] && x.rasterIndex >= build.gpu!.rasterIndex * 0.95)
      .sort((a, b) => gpuCost(a) - gpuCost(b))[0];
    if (g) {
      const after = withSupportingParts({ ...build, gpu: g });
      out.push({ id: `vram-${g.id}`, kind: 'fix', title: `Get more VRAM: ${g.name} (${g.vram} GB)`, detail: `${build.gpu.vram} GB is tight for ${res}. This card has similar or better speed and enough memory for high textures.`, changes: changesBetween(build, after) });
    }
  }
  return out;
}

function suggestForThroughput(build: Build, r: WorkloadResult, res: Resolution, id: WorkloadId): Suggestion[] {
  const t = r.throughput!;
  const out: Suggestion[] = [];
  if (t.imbalance < 0.25 && t.strengths[t.weakest]! > 0.5) return out;
  const base = r.score;
  const better = (trial: Build) => evaluateWorkload(trial, id, res).throughput!.performance > t.performance * 1.08 || evaluateWorkload(trial, id, res).score > base + 10;
  const name = workloadById[id].short;

  if ((t.weakest === 'cpuMulti' || t.weakest === 'cpuSingle') && build.cpu) {
    const key = t.weakest === 'cpuMulti' ? 'multiIndex' : 'gamingIndex';
    const target = Math.min(1, t.strengths[t.strongest]!) * 100 * 0.85;
    const pool = cpus.filter((c) => c[key] > build.cpu![key]).sort((a, b) => cpuCost(a) - cpuCost(b));
    const c = pool.find((c) => c.socket === build.cpu!.socket && c[key] >= target) ?? pool.find((c) => c[key] >= target) ?? pool[pool.length - 1];
    if (c) {
      const after = withSupportingParts(withCpu(build, c));
      if (better(after)) out.push({ id: `cpu-${c.id}-${id}`, kind: 'upgrade', title: `Upgrade CPU to ${c.name}`, detail: `${name} leans on ${t.weakest === 'cpuMulti' ? 'many cores' : 'fast single cores'}; ${c.cores} cores bring it in line with your other parts.${platformNote(build, after)}`, changes: changesBetween(build, after) });
    }
  }
  if (t.weakest === 'gpu' || t.weakest === 'gpuBandwidth') {
    const w = workloadById[id];
    const need = w.kind === 'throughput' ? w.vramNeed ?? 0 : 0;
    const current = build.gpu ? gpuCost(build.gpu) : 0;
    const prefersCuda = id === 'ai' || id === 'render3d';
    const pool = gpus.filter((g) => gpuCost(g) > current && g.vram >= need).sort((a, b) => gpuCost(a) - gpuCost(b));
    const g = pool.find((g) => (!prefersCuda || g.cuda) && better(withSupportingParts({ ...build, gpu: g }))) ?? pool.find((g) => better({ ...build, gpu: g }));
    if (g) {
      const after = withSupportingParts({ ...build, gpu: g });
      out.push({ id: `gpu-${g.id}-${id}`, kind: 'upgrade', title: `Upgrade GPU to ${g.name}`, detail: `${name} is GPU-heavy; ${g.vram} GB${g.cuda && prefersCuda ? ' with CUDA support' : ''} lifts it to ~${Math.round(evaluateWorkload(after, id, res).throughput!.performance)}% of top-end.`, changes: changesBetween(build, after) });
    }
  }
  if (t.weakest === 'ram' || (build.ram && build.ram.totalGb < workloadById[id].ramNeedGb)) {
    const type = build.motherboard?.memType ?? build.ram?.type ?? 'DDR5';
    const need = workloadById[id].ramNeedGb;
    const kit = (build.motherboard && build.cpu ? pickRam(build.motherboard, build.cpu, need) : undefined) ??
      ramKits.filter((k) => k.type === type && k.sticks === 2 && k.totalGb >= need).sort((a, b) => a.totalGb - b.totalGb)[0];
    if (kit && kit !== build.ram) out.push({ id: `ram-${kit.id}`, kind: 'fix', title: `Use ${kit.name}`, detail: `${name} wants ~${need} GB in two sticks (dual-channel).`, changes: { ram: kit } });
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

export function suggest(build: Build, results: WorkloadResult[], res: Resolution): Suggestion[] {
  const all: Suggestion[] = [...compatibilityFixes(build)];
  for (const r of results) {
    const w = workloadById[r.workload];
    all.push(...(w.kind === 'gaming' ? suggestForGaming(build, r, res, r.workload) : suggestForThroughput(build, r, res, r.workload)));
  }
  // De-duplicate by the set of parts changed.
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
