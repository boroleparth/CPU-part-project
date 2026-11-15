import type { Build, Issue, PartSlot } from './types';

/** Power drawn by everything that is not the CPU or GPU (board, RAM, drives, fans). */
const PLATFORM_WATTS = 60;

/** Estimated sustained peak draw of the whole system in watts. */
export function estimatePowerDraw(build: Build): number {
  return (build.cpu?.power ?? 0) + (build.gpu?.power ?? 0) + PLATFORM_WATTS;
}

/**
 * Recommended PSU capacity: covers GPU transient spikes (+15%) and keeps the
 * unit around 80% load at peak, rounded up to the next 50 W.
 */
export function recommendedPsuWatts(build: Build): number {
  const peak = (build.cpu?.power ?? 0) + (build.gpu?.power ?? 0) * 1.15 + PLATFORM_WATTS;
  return Math.ceil((peak * 1.2) / 50) * 50;
}

/** RAM speed the system will actually run at (capped by CPU and board). */
export function effectiveRamSpeed(build: Build): number | undefined {
  const { ram, cpu, motherboard } = build;
  if (!ram) return undefined;
  let speed = ram.speed;
  if (motherboard) speed = Math.min(speed, motherboard.maxMemSpeed);
  // CPUs' "official" spec is conservative; XMP/EXPO usually runs ~15% above it.
  const cpuMax = cpu?.maxMemSpeed[ram.type];
  // Laptops run memory at the processor's rated speed (no XMP / EXPO).
  if (cpuMax) speed = Math.min(speed, cpu?.laptop ? cpuMax : Math.round(cpuMax * 1.15 / 200) * 200);
  return speed;
}

const issue = (severity: Issue['severity'], slots: PartSlot[], message: string): Issue => ({ severity, slots, message });

/** Checks whether the selected parts physically and electrically work together. */
export function checkCompatibility(build: Build): Issue[] {
  const issues: Issue[] = [];
  const { cpu, motherboard: mb, ram, gpu, cooler, psu, case: pcCase, storage } = build;

  // Laptop parts can't be mixed with desktop parts.
  if (cpu && gpu && !!cpu.laptop !== !!gpu.laptop) {
    issues.push(issue('error', ['cpu', 'gpu'], cpu.laptop ? `${cpu.name} is a laptop processor; it can't be paired with a desktop graphics card.` : `${gpu.name} is laptop graphics; it can't be paired with a desktop processor.`));
  }
  if (ram?.laptopOnly && cpu && !cpu.laptop) {
    issues.push(issue('error', ['ram', 'cpu'], `${ram.name} is soldered laptop memory; desktops use DIMM sticks.`));
  }

  // CPU ↔ motherboard
  if (cpu && mb) {
    if (cpu.socket !== mb.socket) {
      issues.push(issue('error', ['cpu', 'motherboard'], `${cpu.name} uses socket ${cpu.socket}, but the ${mb.name} board is ${mb.socket}.`));
    } else {
      if (cpu.power > mb.vrmWatts) {
        issues.push(issue('warning', ['cpu', 'motherboard'], `The ${mb.chipset} board's power delivery (~${mb.vrmWatts} W) is weaker than the ${cpu.name} can draw (${cpu.power} W). Expect throttling under heavy all-core loads.`));
      }
      if (mb.unsupported?.includes(cpu.generation)) {
        issues.push(issue('error', ['cpu', 'motherboard'], `${mb.chipset} motherboards don't support ${cpu.generation} processors like the ${cpu.name}, even though the socket matches.`));
      }
      if (mb.biosNoteFor?.includes(cpu.generation)) {
        issues.push(issue('info', ['cpu', 'motherboard'], `Older ${mb.chipset} boards may need a BIOS update before they boot a ${cpu.generation} CPU. Buy one marked "ready" or with BIOS flashback.`));
      }
      if (!cpu.memTypes.includes(mb.memType)) {
        issues.push(issue('error', ['cpu', 'motherboard'], `${cpu.name} does not support ${mb.memType}.`));
      }
    }
  }

  // RAM ↔ motherboard / CPU
  if (ram && mb) {
    if (ram.type !== mb.memType) {
      issues.push(issue('error', ['ram', 'motherboard'], `${ram.type} memory will not fit a ${mb.memType} motherboard — the slots are keyed differently.`));
    } else {
      if (ram.sticks > mb.memSlots) {
        issues.push(issue('error', ['ram', 'motherboard'], `The kit has ${ram.sticks} sticks but the board has only ${mb.memSlots} slots.`));
      }
      if (ram.totalGb > mb.maxMemGb) {
        issues.push(issue('error', ['ram', 'motherboard'], `${ram.totalGb} GB exceeds the board's ${mb.maxMemGb} GB maximum.`));
      }
    }
  }
  if (ram && cpu && !cpu.memTypes.includes(ram.type)) {
    issues.push(issue('error', ['ram', 'cpu'], `${cpu.name} does not support ${ram.type}.`));
  }
  if (ram && (mb || cpu) && (!mb || ram.type === mb.memType)) {
    const eff = effectiveRamSpeed(build);
    if (eff !== undefined && eff < ram.speed && !cpu?.laptop) {
      issues.push(issue('info', ['ram'], `This kit is rated ${ram.speed} MT/s but will likely run at about ${eff} MT/s on this CPU/board, so you would be paying for speed you can't use.`));
    }
  }
  if (ram?.sticks === 4 && ram.type === 'DDR5') {
    issues.push(issue('info', ['ram'], 'Four DDR5 sticks usually have to run slower than two. Prefer 2 larger sticks unless you need the capacity.'));
  }

  // Display output
  if (cpu && !gpu && !cpu.hasIgpu) {
    issues.push(issue('error', ['gpu'], `${cpu.name} has no integrated graphics. Add a graphics card or you will get no display.`));
  }

  // GPU ↔ case / PSU
  if (gpu && pcCase && gpu.lengthMm > pcCase.maxGpuMm) {
    issues.push(issue('error', ['gpu', 'case'], `${gpu.name} (~${gpu.lengthMm} mm) is longer than the case allows (${pcCase.maxGpuMm} mm).`));
  }
  if (gpu?.needs12v2x6 && psu && !psu.native12v2x6) {
    issues.push(issue('warning', ['gpu', 'psu'], `${gpu.name} uses a 12V-2x6 power connector. This PSU needs an adapter; an ATX 3.1 unit with a native cable is safer.`));
  }

  // Motherboard ↔ case
  if (mb && pcCase && !pcCase.supports.includes(mb.formFactor)) {
    issues.push(issue('error', ['motherboard', 'case'], `A ${mb.formFactor} motherboard does not fit in the ${pcCase.name} case.`));
  }

  // Cooler
  if (cooler && cpu) {
    if (cooler.kind === 'stock' && !cpu.includesCooler) {
      issues.push(issue('error', ['cooler', 'cpu'], `${cpu.name} is sold without a cooler. Choose an air cooler or AIO.`));
    } else if (cooler.ratedWatts < cpu.power) {
      const sev = cooler.ratedWatts < cpu.power * 0.75 ? 'error' : 'warning';
      issues.push(issue(sev, ['cooler', 'cpu'], `${cooler.name} handles ~${cooler.ratedWatts} W but the ${cpu.name} can produce ${cpu.power} W of heat. It will run hot and lose boost clocks.`));
    }
  }
  if (cooler && pcCase) {
    if (cooler.heightMm && cooler.kind !== 'stock' && cooler.heightMm > pcCase.maxCoolerMm) {
      issues.push(issue('error', ['cooler', 'case'], `${cooler.name} (${cooler.heightMm} mm tall) does not fit; the case allows ${pcCase.maxCoolerMm} mm.`));
    }
    if (cooler.radiatorMm && cooler.radiatorMm > pcCase.maxRadiatorMm) {
      issues.push(issue('error', ['cooler', 'case'], `The ${cooler.radiatorMm} mm radiator does not fit; the case supports up to ${pcCase.maxRadiatorMm} mm.`));
    }
  }

  // PSU capacity
  if (psu && (cpu || gpu)) {
    const draw = estimatePowerDraw(build);
    const rec = recommendedPsuWatts(build);
    if (psu.watts < draw) {
      issues.push(issue('error', ['psu'], `Estimated peak draw is ~${draw} W, more than this ${psu.watts} W PSU can supply. Recommended: ${rec} W.`));
    } else if (psu.watts < rec) {
      issues.push(issue('warning', ['psu'], `${psu.watts} W works but has little headroom for GPU power spikes. Recommended: ${rec} W.`));
    }
  }

  // Storage on old platforms
  if (storage?.kind === 'NVMe Gen5' && mb && mb.pcieGen < 5) {
    issues.push(issue('info', ['storage', 'motherboard'], 'This board has no PCIe 5.0 M.2 slot; the Gen5 drive will run at Gen4 speed.'));
  }

  return issues;
}

/** True when the part in `slot` would introduce no compatibility *errors* against the rest of the build. */
export function isCompatibleChoice<S extends PartSlot>(build: Build, slot: S, part: NonNullable<Build[S]>): boolean {
  const trial: Build = { ...build, [slot]: part };
  return !checkCompatibility(trial).some((i) => i.severity === 'error' && i.slots.includes(slot));
}
