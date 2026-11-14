import { useEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../data';
import { checkCompatibility } from '../engine/compatibility';
import { evaluateBuild, toneFor } from '../engine/simulation';
import type { Build, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { brandNames, brandOf, powerOf, strengthLabel, strengthOf, tierOf, type AnyPart, type BrandKey } from '../ui';
import { BrandTag, StatusPill, TierBadge } from './Badges';
import { SearchIcon, SlotIcon } from './Icons';
import { partSummary } from './PartPicker';

const titles: Record<PartSlot, string> = {
  cpu: 'Choose a processor (CPU)',
  motherboard: 'Choose a motherboard',
  ram: 'Choose memory (RAM)',
  gpu: 'Choose a graphics card (GPU)',
  storage: 'Choose storage',
  cooler: 'Choose a CPU cooler',
  psu: 'Choose a power supply',
  case: 'Choose a case',
};

type SortKey = 'fit' | 'strong' | 'weak' | 'name' | 'power';
const sortLabels: Record<SortKey, string> = {
  fit: 'Best match for this build',
  strong: 'Most powerful first',
  weak: 'Least powerful first',
  name: 'Name (A–Z)',
  power: 'Lowest power draw',
};

interface Row {
  part: AnyPart;
  compatible: boolean;
  /** Overall harmony score if this part were chosen. */
  fit: number;
  strength: number;
  brand?: BrandKey;
}

interface Props {
  slot: PartSlot;
  build: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  onPick: (part: AnyPart | undefined) => void;
  onClose: () => void;
}

export function PartBrowser({ slot, build, workloads, resolution, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('fit');
  const [brands, setBrands] = useState<BrandKey[]>([]);
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = build[slot];

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Score every candidate against the rest of the build (cheap: a few dozen evaluations).
  const rows: Row[] = useMemo(() => {
    const list = catalog[slot] as readonly AnyPart[];
    return list.map((part) => {
      const trial: Build = { ...build, [slot]: part };
      const compatible = !checkCompatibility(trial).some((i) => i.severity === 'error' && i.slots.includes(slot));
      return {
        part,
        compatible,
        fit: compatible ? evaluateBuild(trial, workloads, resolution).overall : 0,
        strength: strengthOf(slot, part),
        brand: brandOf(slot, part),
      };
    });
  }, [slot, build, workloads, resolution]);

  const maxStrength = Math.max(...rows.map((r) => r.strength));
  const brandOptions = [...new Set(rows.map((r) => r.brand).filter(Boolean))] as BrandKey[];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) =>
      (!onlyCompatible || r.compatible || r.part === current) &&
      (!brands.length || (r.brand && brands.includes(r.brand))) &&
      (!q || `${r.part.name} ${partSummary(slot, r.part)}`.toLowerCase().includes(q)),
    );
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      // Best match: compatible first, highest harmony, then the least powerful part that achieves it.
      fit: (a, b) => Number(b.compatible) - Number(a.compatible) || Math.round(b.fit) - Math.round(a.fit) || a.strength - b.strength,
      strong: (a, b) => b.strength - a.strength,
      weak: (a, b) => a.strength - b.strength,
      name: (a, b) => a.part.name.localeCompare(b.part.name),
      power: (a, b) => (powerOf(slot, a.part) ?? 0) - (powerOf(slot, b.part) ?? 0) || a.strength - b.strength,
    };
    return [...filtered].sort(by[sort]);
  }, [rows, query, brands, onlyCompatible, sort, slot, current]);

  const hiddenCount = rows.length - visible.length;
  const bestId = sort === 'fit' ? visible.find((r) => r.compatible)?.part.id : undefined;
  const toggleBrand = (b: BrandKey) => setBrands((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]));

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="browser-title">
        <header className="sheet-head">
          <span className="sheet-icon"><SlotIcon slot={slot} size={24} /></span>
          <div className="sheet-title">
            <h2 id="browser-title">{titles[slot]}</h2>
            <p className="muted small">The harmony score shows how the whole build would score with each part.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="sheet-tools">
          <label className="search">
            <SearchIcon />
            <input id="part-search" ref={searchRef} type="search" placeholder={`Search ${rows.length} parts…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="tool-row">
            <label className="sort">
              <span className="visually-hidden">Sort by</span>
              <select id="part-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {(Object.keys(sortLabels) as SortKey[]).filter((k) => k !== 'power' || slot === 'cpu' || slot === 'gpu').map((k) => <option key={k} value={k}>{sortLabels[k]}</option>)}
              </select>
            </label>
            {brandOptions.length > 1 && (
              <div className="filter-chips" role="group" aria-label="Brand">
                {brandOptions.map((b) => (
                  <button key={b} type="button" aria-pressed={brands.includes(b)} className={`fchip fchip--${b}${brands.includes(b) ? ' fchip--on' : ''}`} onClick={() => toggleBrand(b)}>
                    <i aria-hidden="true" />{brandNames[b]}
                  </button>
                ))}
              </div>
            )}
            <label className="toggle small">
              <input id="part-compatible" type="checkbox" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} />
              Compatible only
            </label>
          </div>
        </div>

        <ul className="part-results" aria-label="Parts">
          {slot === 'gpu' && !query && (
            <li>
              <button type="button" className={`prow${!current ? ' prow--current' : ''}`} onClick={() => onPick(undefined)}>
                <span className="prow-main"><b>No graphics card</b><span className="muted small">Use the processor's integrated graphics</span></span>
              </button>
            </li>
          )}
          {visible.map((r) => {
            const tier = tierOf(slot, r.part);
            const tone = toneFor(r.fit);
            const isCurrent = r.part === current;
            return (
              <li key={r.part.id}>
                <button type="button" className={`prow${isCurrent ? ' prow--current' : ''}${r.compatible ? '' : ' prow--bad'}`} onClick={() => onPick(r.part)}>
                  <span className="prow-main">
                    <span className="prow-name">
                      <b>{r.part.name}</b>
                      {isCurrent && <span className="tag tag--current">Selected</span>}
                      {r.part.id === bestId && !isCurrent && <span className="tag tag--best">Best match</span>}
                    </span>
                    <span className="muted small">{partSummary(slot, r.part)}</span>
                    <span className="prow-badges">
                      {r.brand && <BrandTag brand={r.brand} />}
                      {tier && <TierBadge level={tier} />}
                    </span>
                  </span>
                  <span className="prow-meter" title={`${strengthLabel[slot]}: relative to the strongest option`}>
                    <span className="muted tiny">{strengthLabel[slot]}</span>
                    <span className="meter"><span style={{ width: `${(r.strength / maxStrength) * 100}%` }} /></span>
                  </span>
                  <span className="prow-fit">
                    {r.compatible
                      ? <><span className="fit-num">{Math.round(r.fit)}</span><StatusPill tone={tone} /></>
                      : <StatusPill tone="critical">Won't fit</StatusPill>}
                  </span>
                </button>
              </li>
            );
          })}
          {!visible.length && <li className="empty">No parts match. Clear the search or turn off filters.</li>}
        </ul>
        {hiddenCount > 0 && <p className="sheet-foot muted small">{hiddenCount} part{hiddenCount === 1 ? '' : 's'} hidden by search or filters.</p>}
      </div>
    </div>
  );
}
