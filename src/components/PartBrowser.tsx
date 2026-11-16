import { useEffect, useMemo, useRef, useState } from 'react';
import { catalog, partFits } from '../data';
import { checkCompatibility } from '../engine/compatibility';
import { evaluateBuild, toneFor } from '../engine/simulation';
import type { Build, Device, GameSettings, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { benchLine, brandNames, brandOf, partSummary, seriesOf, seriesRank, strengthOf, type AnyPart, type BrandKey } from '../ui';
import { isLegacyCpu, isLegacyGpu } from '../data';
import type { Cpu, Gpu } from '../engine/types';
import { SearchIcon, SlotIcon } from './Icons';
import { SourceLine } from './Badges';

const titles: Record<PartSlot, string> = {
  cpu: 'Processor',
  motherboard: 'Motherboard',
  ram: 'Memory',
  gpu: 'Graphics card',
  storage: 'Storage',
  cooler: 'CPU cooler',
  psu: 'Power supply',
  case: 'Case',
};

type SortKey = 'gen' | 'fit' | 'strong' | 'weak' | 'name';
const sortLabels: Record<SortKey, string> = { gen: 'By generation', fit: 'Best match', strong: 'Most powerful', weak: 'Least powerful', name: 'Name' };

interface Props {
  device: Device;
  slot: PartSlot;
  build: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  settings: GameSettings;
  onPick: (part: AnyPart | undefined) => void;
  onClose: () => void;
}

export function PartBrowser({ device, slot, build, workloads, resolution, settings, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const grouped = slot === 'cpu' || slot === 'gpu';
  const [sort, setSort] = useState<SortKey>(grouped ? 'gen' : 'fit');
  const [brand, setBrand] = useState<BrandKey | null>(null);
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

  // Only parts that fit the rest of the build, each scored as if it were chosen.
  const rows = useMemo(() => {
    // Laptop graphics: one row per chip, at its usual power (or the version already chosen).
    const listed = (p: AnyPart) => {
      const g = p as Gpu;
      return !g.family || p === current || (g.typical && (current as Gpu | undefined)?.family !== g.family);
    };
    return (catalog[slot] as readonly AnyPart[])
      .filter((part) => partFits(slot, part, device) && listed(part))
      .map((part) => {
        const trial: Build = { ...build, [slot]: part };
        const fits = !checkCompatibility(trial).some((i) => i.severity === 'error' && i.slots.includes(slot));
        return { part, fits, fit: fits ? evaluateBuild(trial, workloads, resolution, settings).overall : 0, strength: strengthOf(slot, part), brand: brandOf(slot, part), series: seriesOf(slot, part) ?? '' };
      })
      .filter((r) => r.fits || r.part === current);
  }, [device, slot, build, workloads, resolution, settings, current]);

  const brands = [...new Set(rows.map((r) => r.brand).filter(Boolean))] as BrandKey[];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => (!brand || r.brand === brand) && (!q || r.part.name.toLowerCase().includes(q)));
    const by: Record<SortKey, (a: (typeof rows)[0], b: (typeof rows)[0]) => number> = {
      // Newest generation first, strongest first inside each generation.
      gen: (a, b) => seriesRank(slot, a.series) - seriesRank(slot, b.series) || b.strength - a.strength,
      // Highest score first; among equals, the least powerful part (no paying for overkill).
      fit: (a, b) => Math.round(b.fit) - Math.round(a.fit) || a.strength - b.strength,
      strong: (a, b) => b.strength - a.strength,
      weak: (a, b) => a.strength - b.strength,
      name: (a, b) => a.part.name.localeCompare(b.part.name),
    };
    return [...list].sort(by[sort]);
  }, [rows, query, brand, sort]);
  // A fit score needs something to pair with: no CPU score before a GPU is chosen, and vice versa.
  const scoreless = (slot === 'cpu' && !build.gpu) || (slot === 'gpu' && !build.cpu);
  // "Best match" points at a part you can still buy new, unless only older parts fit (old platform).
  const legacy = (p: AnyPart) => (slot === 'cpu' && isLegacyCpu(p as Cpu)) || (slot === 'gpu' && isLegacyGpu(p as Gpu));
  const bestPool = rows.some((r) => r.fits && !legacy(r.part)) ? rows.filter((r) => !legacy(r.part)) : rows;
  const bestId = !scoreless && !query && !brand ? [...bestPool].sort((a, b) => Math.round(b.fit) - Math.round(a.fit) || a.strength - b.strength)[0]?.part.id : undefined;

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="browser-title">
        <header className="sheet-head">
          <span className="sheet-icon"><SlotIcon slot={slot} size={22} /></span>
          <h2 id="browser-title">{device === 'laptop' && slot === 'gpu' ? 'Laptop graphics' : titles[slot]}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="sheet-tools">
          <label className="search">
            <SearchIcon />
            <input id="part-search" ref={searchRef} type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="tool-row">
            <select id="part-sort" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {(Object.keys(sortLabels) as SortKey[]).filter((k) => k !== 'gen' || grouped).map((k) => <option key={k} value={k}>{sortLabels[k]}</option>)}
            </select>
            {brands.length > 1 && brands.map((b) => (
              <button key={b} type="button" aria-pressed={brand === b} className={`fchip fchip--${b}${brand === b ? ' fchip--on' : ''}`} onClick={() => setBrand(brand === b ? null : b)}>
                <i aria-hidden="true" />{brandNames[b]}
              </button>
            ))}
          </div>
        </div>

        <ul className="part-results" aria-label="Parts">
          {slot === 'gpu' && !query && (
            <li>
              <button type="button" className={`prow${!current ? ' prow--current' : ''}`} onClick={() => onPick(undefined)}>
                <span className="prow-main"><b>{device === 'laptop' ? 'No separate graphics' : 'No graphics card'}</b><span className="prow-spec">Integrated graphics</span></span>
              </button>
            </li>
          )}
          {visible.map((r, i) => {
            const header = sort === 'gen' && (i === 0 || visible[i - 1].series !== r.series) ? r.series : null;
            const tone = r.fits ? toneFor(r.fit) : 'critical';
            const isCurrent = r.part === current;
            return (
              <li key={r.part.id}>
                {header && <h3 className="series-head">{header}</h3>}
                <button type="button" className={`prow${isCurrent ? ' prow--current' : ''}`} onClick={() => onPick(r.part)}>
                  <span className="prow-main">
                    <span className="prow-name">
                      {r.brand && <i className={`bdot bdot--${r.brand}`} title={brandNames[r.brand]} aria-hidden="true" />}
                      <b>{r.part.name}</b>
                      {isCurrent && <span className="tag tag--current">Selected</span>}
                      {r.part.id === bestId && !isCurrent && <span className="tag tag--best">Best match</span>}
                      {legacy(r.part) && <span className="tag tag--old" title="Older generation, mostly sold used">Older</span>}
                    </span>
                    <span className="prow-spec">{partSummary(slot, r.part)}</span>
                    {benchLine(slot, r.part) && <span className="prow-bench" title="Benchmark scores; fastest model = 100">{benchLine(slot, r.part)}</span>}
                  </span>
                  {!scoreless && <span className={`score-chip score-chip--${tone}`} title="Score with this part">{r.fits ? Math.round(r.fit) : '✕'}</span>}
                </button>
                <SourceLine slot={slot} part={r.part} />
              </li>
            );
          })}
          {!visible.length && <li className="empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
