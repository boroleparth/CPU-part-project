import { useMemo, useState } from 'react';
import { slotLabels, slotOrder } from '../data';
import { autoBuild, fpsTargets, tiers, type AutoBuildRequest, type Tier } from '../engine/builder';
import { evaluateBuild } from '../engine/simulation';
import type { Build, FormFactor, Resolution, WorkloadId } from '../engine/types';
import { partSummary } from './PartPicker';
import { brandOf, tierOf } from '../ui';
import { BrandTag, ScoreRing, StatusPill, TierBadge } from './Badges';
import { SlotIcon } from './Icons';

interface Props {
  workloads: WorkloadId[];
  resolution: Resolution;
  onOpen: (build: Build) => void;
}

export function AutoBuilder({ workloads, resolution, onOpen }: Props) {
  const [tier, setTier] = useState<Tier>('mid');
  const [cpuBrand, setCpuBrand] = useState<AutoBuildRequest['cpuBrand']>('any');
  const [gpuBrand, setGpuBrand] = useState<AutoBuildRequest['gpuBrand']>('any');
  const [formFactor, setFormFactor] = useState<'any' | FormFactor>('any');
  const [customFps, setCustomFps] = useState<string>('');

  const primaryGame = (['aaa', 'raytracing', 'streaming', 'esports'] as const).find((g) => workloads.includes(g));
  const defaultFps = primaryGame ? fpsTargets[primaryGame][tier] : undefined;
  const target = customFps ? Number(customFps) : undefined;

  const result = useMemo(
    () => autoBuild({ workloads, resolution, tier, cpuBrand, gpuBrand, formFactor, targetFps: primaryGame === 'aaa' || primaryGame === 'streaming' ? target : undefined }),
    [workloads, resolution, tier, cpuBrand, gpuBrand, formFactor, target, primaryGame],
  );
  const evaluation = useMemo(() => evaluateBuild(result.build, workloads, resolution), [result, workloads, resolution]);

  return (
    <div className="auto">
      <section className="card">
        <h2 className="section-title">Performance target</h2>
        <p className="muted small">No prices yet, so instead of a budget pick how much performance you want. The builder chooses the <em>least powerful</em> parts that reach it — so nothing is overkill and nothing bottlenecks.</p>
        <div className="tier-grid" role="radiogroup" aria-label="Performance tier">
          {tiers.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tier === t.id} className={tier === t.id ? 'tier tier--on' : 'tier'} onClick={() => setTier(t.id)}>
              <b>{t.label}</b>
              <span className="small muted">{t.blurb}</span>
              {primaryGame && <span className="small">{fpsTargets[primaryGame][t.id]} FPS @ {resolution}</span>}
            </button>
          ))}
        </div>
        <div className="form-grid">
          {(primaryGame === 'aaa' || primaryGame === 'streaming') && (
            <label>Custom FPS target
              <input type="number" min={30} max={360} step={10} placeholder={`${defaultFps}`} value={customFps} onChange={(e) => setCustomFps(e.target.value)} />
            </label>
          )}
          <label>CPU brand
            <select value={cpuBrand} onChange={(e) => setCpuBrand(e.target.value as AutoBuildRequest['cpuBrand'])}>
              <option value="any">Any</option><option value="AMD">AMD</option><option value="Intel">Intel</option>
            </select>
          </label>
          <label>GPU brand
            <select value={gpuBrand} onChange={(e) => setGpuBrand(e.target.value as AutoBuildRequest['gpuBrand'])}>
              <option value="any">Any</option><option value="NVIDIA">NVIDIA</option><option value="AMD">AMD</option><option value="Intel">Intel</option>
            </select>
          </label>
          <label>PC size
            <select value={formFactor} onChange={(e) => setFormFactor(e.target.value as 'any' | FormFactor)}>
              <option value="any">Any</option><option value="ATX">Full size (ATX)</option><option value="mATX">Compact (Micro-ATX)</option><option value="ITX">Small form factor (Mini-ITX)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h2 className="section-title">Recommended build</h2>
          <div className="score-block">
            <ScoreRing score={evaluation.overall} tone={evaluation.tone} size={72} label="Harmony score" />
          </div>
        </header>
        {result.shortfalls.length > 0 && (
          <ul className="issues">
            {result.shortfalls.map((s, i) => <li key={i} className="issue issue--warning"><span className="issue-icon">!</span><span>{s}</span></li>)}
          </ul>
        )}
        <table className="build-table">
          <tbody>
            {slotOrder.map((slot) => {
              const part = result.build[slot];
              return (
                <tr key={slot}>
                  <th scope="row"><span className="th-inner"><SlotIcon slot={slot} size={18} />{slotLabels[slot]}</span></th>
                  <td>
                    {part ? (
                      <>
                        <b>{part.name}</b>
                        <div className="muted small">{partSummary(slot, part)}</div>
                        {(brandOf(slot, part) || tierOf(slot, part)) && (
                          <div className="slot-badges">
                            {brandOf(slot, part) && <BrandTag brand={brandOf(slot, part)!} />}
                            {tierOf(slot, part) && <TierBadge level={tierOf(slot, part)!} />}
                          </div>
                        )}
                      </>
                    ) : <span className="muted">{slot === 'gpu' ? 'Not needed — integrated graphics' : '—'}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ul className="results-inline">
          {evaluation.results.map((r) => <li key={r.workload}><StatusPill tone={r.tone}>{Math.round(r.score)}</StatusPill> {r.headline}</li>)}
        </ul>
        <details>
          <summary>Why these parts?</summary>
          <ul className="notes">{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </details>
        <button type="button" className="btn" onClick={() => onOpen(result.build)}>Open in simulator to fine-tune →</button>
      </section>
    </div>
  );
}
