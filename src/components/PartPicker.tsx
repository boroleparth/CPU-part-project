import { slotLabels, slotOrder } from '../data';
import type { Build, Case, Cooler, Cpu, Gpu, Issue, Motherboard, PartSlot, Psu, RamKit, Storage } from '../engine/types';
import { brandOf, tierOf, type AnyPart } from '../ui';
import { BrandTag, TierBadge } from './Badges';
import { SlotIcon } from './Icons';

/** One-line spec summary for a part. */
export function partSummary(slot: PartSlot, part: AnyPart): string {
  switch (slot) {
    case 'cpu': {
      const c = part as Cpu;
      return `${c.cores} cores / ${c.threads} threads · ${c.socket} · ${c.memTypes.join('/')} · ${c.power} W${c.hasIgpu ? '' : ' · no integrated graphics'}`;
    }
    case 'gpu': {
      const g = part as Gpu;
      return `${g.vram} GB VRAM · ${g.power} W · ${g.lengthMm} mm long`;
    }
    case 'motherboard': {
      const m = part as Motherboard;
      return `${m.socket} · ${m.formFactor} · ${m.memType} × ${m.memSlots} slots · PCIe ${m.pcieGen}.0`;
    }
    case 'ram': {
      const r = part as RamKit;
      return `${r.type} · ${r.speed} MT/s · ${r.sticks === 1 ? 'single-channel' : 'dual-channel'}`;
    }
    case 'storage': {
      const s = part as Storage;
      return `${s.kind} · ${s.capacityGb >= 1000 ? `${s.capacityGb / 1000} TB` : `${s.capacityGb} GB`}`;
    }
    case 'cooler': {
      const c = part as Cooler;
      return `Handles ~${c.ratedWatts} W${c.radiatorMm ? ` · ${c.radiatorMm} mm radiator` : c.heightMm ? ` · ${c.heightMm} mm tall` : ''}`;
    }
    case 'psu': {
      const p = part as Psu;
      return `${p.efficiency}${p.native12v2x6 ? ' · 12V-2x6 cable' : ''}`;
    }
    case 'case': {
      const c = part as Case;
      return `Fits ${c.supports.join(' / ')} · GPU up to ${c.maxGpuMm} mm`;
    }
  }
}

interface Props {
  build: Build;
  issues: Issue[];
  onOpen: (slot: PartSlot) => void;
  onRemove: (slot: PartSlot) => void;
}

/** The build as a list of slot cards; each opens the part browser. */
export function BuildList({ build, issues, onOpen, onRemove }: Props) {
  return (
    <ul className="slots">
      {slotOrder.map((slot) => {
        const part = build[slot];
        const slotIssues = issues.filter((i) => i.slots.includes(slot) && i.severity !== 'info');
        const state = slotIssues.some((i) => i.severity === 'error') ? 'error' : slotIssues.length ? 'warning' : part ? 'ok' : 'empty';
        const tier = part && tierOf(slot, part);
        const brand = part && brandOf(slot, part);
        const stateText = { error: 'Incompatible', warning: 'Check warning', ok: 'Fits', empty: slot === 'gpu' ? 'Integrated graphics' : 'Not chosen' }[state];
        return (
          <li key={slot} className={`slot slot--${state}`}>
            <button type="button" className="slot-btn" onClick={() => onOpen(slot)} aria-label={`${slotLabels[slot]}: ${part ? part.name : stateText}. Change`}>
              <span className="slot-icon"><SlotIcon slot={slot} /></span>
              <span className="slot-body">
                <span className="slot-label">
                  {slotLabels[slot]}
                  <span className={`slot-state slot-state--${state}`}>{stateText}</span>
                </span>
                <span className="slot-name">{part ? part.name : slot === 'gpu' ? 'None — choose a card' : 'Choose…'}</span>
                {part && <span className="slot-meta">{partSummary(slot, part)}</span>}
                {(brand || tier) && (
                  <span className="slot-badges">
                    {brand && <BrandTag brand={brand} />}
                    {tier && <TierBadge level={tier} />}
                  </span>
                )}
              </span>
              <span className="slot-chev" aria-hidden="true">›</span>
            </button>
            {part && (
              <button type="button" className="slot-remove" onClick={() => onRemove(slot)} aria-label={`Remove ${part.name}`} title="Remove">✕</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
