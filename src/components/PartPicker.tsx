import { catalog, slotLabels, slotOrder } from '../data';
import { isCompatibleChoice } from '../engine/compatibility';
import type { Build, Case, Cooler, Cpu, Gpu, Issue, Motherboard, PartSlot, Psu, RamKit, Storage } from '../engine/types';

type AnyPart = NonNullable<Build[PartSlot]>;

/** One-line spec summary shown under each selected part and in the option text. */
export function partSummary(slot: PartSlot, part: AnyPart): string {
  switch (slot) {
    case 'cpu': {
      const c = part as Cpu;
      return `${c.cores}C/${c.threads}T · ${c.socket} · ${c.memTypes.join('/')} · ${c.power} W${c.hasIgpu ? '' : ' · no iGPU'}`;
    }
    case 'gpu': {
      const g = part as Gpu;
      return `${g.vram} GB · ${g.power} W · ${g.lengthMm} mm`;
    }
    case 'motherboard': {
      const m = part as Motherboard;
      return `${m.socket} · ${m.formFactor} · ${m.memType} ×${m.memSlots} · PCIe ${m.pcieGen}.0`;
    }
    case 'ram': {
      const r = part as RamKit;
      return `${r.type} · ${r.sticks === 1 ? 'single-channel' : 'dual-channel'}`;
    }
    case 'storage':
      return (part as Storage).kind;
    case 'cooler': {
      const c = part as Cooler;
      return `handles ~${c.ratedWatts} W${c.radiatorMm ? ` · ${c.radiatorMm} mm radiator` : c.heightMm ? ` · ${c.heightMm} mm tall` : ''}`;
    }
    case 'psu':
      return (part as Psu).efficiency;
    case 'case': {
      const c = part as Case;
      return `${c.supports.join('/')} · GPU ≤ ${c.maxGpuMm} mm`;
    }
  }
}

const groupKey = (slot: PartSlot, p: AnyPart): string => {
  if (slot === 'cpu') return `${(p as Cpu).brand} · ${(p as Cpu).socket}`;
  if (slot === 'gpu') return (p as Gpu).brand;
  if (slot === 'motherboard') return (p as Motherboard).socket;
  if (slot === 'ram') return (p as RamKit).type;
  return '';
};

interface Props {
  build: Build;
  issues: Issue[];
  onlyCompatible: boolean;
  onChange: (slot: PartSlot, part: AnyPart | undefined) => void;
}

export function PartPicker({ build, issues, onlyCompatible, onChange }: Props) {
  return (
    <div className="part-list">
      {slotOrder.map((slot) => {
        const list = catalog[slot] as readonly AnyPart[];
        const current = build[slot];
        const slotIssues = issues.filter((i) => i.slots.includes(slot) && i.severity !== 'info');
        const worst = slotIssues.some((i) => i.severity === 'error') ? 'error' : slotIssues.length ? 'warning' : undefined;

        // Group options (e.g. by brand + socket) and mark/hide incompatible ones.
        const groups = new Map<string, { part: AnyPart; ok: boolean }[]>();
        for (const part of list) {
          const ok = part === current || isCompatibleChoice(build, slot, part as never);
          if (onlyCompatible && !ok) continue;
          const key = groupKey(slot, part);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push({ part, ok });
        }
        const hidden = list.length - [...groups.values()].reduce((a, g) => a + g.length, 0);

        return (
          <div className={`part-row${worst ? ` part-row--${worst}` : ''}`} key={slot}>
            <label htmlFor={`pick-${slot}`} className="part-label">
              {slotLabels[slot]}
              {worst && <span className={`flag flag--${worst}`} aria-label={worst}>{worst === 'error' ? '✕' : '!'}</span>}
            </label>
            <select
              id={`pick-${slot}`}
              value={current?.id ?? ''}
              onChange={(e) => onChange(slot, list.find((p) => p.id === e.target.value))}
            >
              <option value="">{slot === 'gpu' ? '— None (integrated graphics) —' : '— Not chosen —'}</option>
              {[...groups.entries()].map(([key, items]) => {
                const options = items.map(({ part, ok }) => (
                  <option key={part.id} value={part.id}>
                    {part.name}{ok ? '' : '  ⚠ incompatible'}
                  </option>
                ));
                return key ? <optgroup key={key} label={key}>{options}</optgroup> : options;
              })}
            </select>
            <div className="part-meta">
              {current ? partSummary(slot, current) : <span className="muted">Nothing selected</span>}
              {hidden > 0 && <span className="muted"> · {hidden} incompatible hidden</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
