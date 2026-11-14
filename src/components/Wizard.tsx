import { useState } from 'react';
import { slotLabels } from '../data';
import { autoBuild, type Tier } from '../engine/builder';
import { REFRESH_RATES } from '../engine/games';
import { RESOLUTIONS } from '../engine/simulation';
import type { Build, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { workloadById } from '../engine/workloads';
import { brandOf, tierOf } from '../ui';
import { BrandTag, TierBadge } from './Badges';
import { SlotIcon } from './Icons';
import { PartBrowser } from './PartBrowser';
import { partSummary } from './PartPicker';

const purposeGroups: { label: string; ids: WorkloadId[] }[] = [
  { label: 'Gaming', ids: ['aaa', 'esports', 'raytracing', 'streaming'] },
  { label: 'Creating & AI', ids: ['video', 'render3d', 'ai'] },
  { label: 'Everyday', ids: ['office'] },
];

const resolutionInfo: Record<Resolution, { name: string; px: string }> = {
  '1080p': { name: 'Full HD', px: '1920 × 1080' },
  '1440p': { name: 'Quad HD', px: '2560 × 1440' },
  '4K': { name: 'Ultra HD', px: '3840 × 2160' },
};

const wizardSlots: PartSlot[] = ['cpu', 'gpu', 'ram', 'storage'];

interface Props {
  workloads: WorkloadId[];
  resolution: Resolution;
  refreshHz: number;
  initialBuild: Build;
  onWorkloads: (w: WorkloadId[]) => void;
  onResolution: (r: Resolution) => void;
  onRefresh: (hz: number) => void;
  onFinish: (picked: Build) => void;
}

export function Wizard({ workloads, resolution, refreshHz, initialBuild, onWorkloads, onResolution, onRefresh, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Build>(() => ({ cpu: initialBuild.cpu, gpu: initialBuild.gpu, ram: initialBuild.ram, storage: initialBuild.storage }));
  const [browsing, setBrowsing] = useState<PartSlot | null>(null);

  const games = workloads.some((id) => workloadById[id].kind === 'gaming');
  const steps = games ? (['purpose', 'screen', 'parts'] as const) : (['purpose', 'parts'] as const);
  const current = steps[Math.min(step, steps.length - 1)];
  const toggle = (id: WorkloadId) => onWorkloads(workloads.includes(id) ? workloads.filter((w) => w !== id) : [...workloads, id]);

  const suggest = (tier: Tier) => {
    const { build } = autoBuild({ workloads, resolution, tier });
    setDraft({ cpu: build.cpu, gpu: build.gpu, ram: build.ram, storage: build.storage });
  };

  const canContinue = current === 'purpose' ? workloads.length > 0 : current === 'parts' ? !!draft.cpu : true;

  return (
    <div className="wizard">
      <ol className="steps" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <span>{i < step ? '✓' : i + 1}</span>
            {s === 'purpose' ? 'Purpose' : s === 'screen' ? 'Monitor' : 'Parts'}
          </li>
        ))}
      </ol>

      {current === 'purpose' && (
        <section className="wz-step">
          <h2 className="wz-q">What will you use this PC for?</h2>
          <p className="wz-hint">Pick everything that applies. We'll check your parts against each one.</p>
          {purposeGroups.map((g) => (
            <div key={g.label} className="wz-group">
              <h3 className="wz-group-label">{g.label}</h3>
              <div className="wz-options">
                {g.ids.map((id) => {
                  const w = workloadById[id];
                  const on = workloads.includes(id);
                  return (
                    <button key={id} type="button" className={`wz-option${on ? ' wz-option--on' : ''}`} aria-pressed={on} onClick={() => toggle(id)}>
                      <span className="wz-check" aria-hidden="true">{on ? '✓' : ''}</span>
                      <span className="wz-option-text">
                        <b>{w.name}</b>
                        <span>{w.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {current === 'screen' && (
        <section className="wz-step">
          <h2 className="wz-q">What monitor will you play on?</h2>
          <p className="wz-hint">Resolution decides how hard the graphics card works. Refresh rate is the frame rate your screen can actually show.</p>
          <h3 className="wz-group-label">Resolution</h3>
          <div className="wz-options wz-options--3">
            {RESOLUTIONS.map((r) => (
              <button key={r} type="button" className={`wz-option wz-option--center${r === resolution ? ' wz-option--on' : ''}`} aria-pressed={r === resolution} onClick={() => onResolution(r)}>
                <span className="wz-option-text">
                  <b className="wz-big">{r}</b>
                  <span>{resolutionInfo[r].name} · {resolutionInfo[r].px}</span>
                </span>
              </button>
            ))}
          </div>
          <h3 className="wz-group-label">Refresh rate</h3>
          <div className="wz-pills" role="group" aria-label="Refresh rate">
            {REFRESH_RATES.map((hz) => (
              <button key={hz} type="button" className={`wz-pill${hz === refreshHz ? ' wz-pill--on' : ''}`} aria-pressed={hz === refreshHz} onClick={() => onRefresh(hz)}>
                {hz} Hz
              </button>
            ))}
          </div>
          <p className="wz-hint small">Not sure? Most everyday monitors are 60 Hz; gaming monitors are usually 144 Hz or 165 Hz.</p>
        </section>
      )}

      {current === 'parts' && (
        <section className="wz-step">
          <h2 className="wz-q">Which parts do you have in mind?</h2>
          <p className="wz-hint">Choose the main four. We'll match a motherboard, cooler, power supply and case to them; you can change those later.</p>
          <div className="wz-suggest">
            <span>Not sure? Start from a suggestion:</span>
            {([['entry', 'Budget'], ['mid', 'Mainstream'], ['high', 'High-end']] as [Tier, string][]).map(([t, label]) => (
              <button key={t} type="button" className="wz-pill" onClick={() => suggest(t)}>{label}</button>
            ))}
          </div>
          <ul className="wz-parts">
            {wizardSlots.map((slot) => {
              const part = draft[slot];
              const brand = part && brandOf(slot, part);
              const tier = part && tierOf(slot, part);
              return (
                <li key={slot}>
                  <button type="button" className={`wz-part${part ? ' wz-part--set' : ''}`} onClick={() => setBrowsing(slot)}>
                    <span className="wz-part-icon"><SlotIcon slot={slot} size={26} /></span>
                    <span className="wz-part-body">
                      <span className="wz-part-label">{slotLabels[slot]}{slot === 'gpu' || slot === 'storage' ? '' : ''}</span>
                      <b>{part ? part.name : slot === 'gpu' ? 'Choose a graphics card' : `Choose…`}</b>
                      {part && <span className="muted small">{partSummary(slot, part)}</span>}
                      {(brand || tier) && (
                        <span className="slot-badges">
                          {brand && <BrandTag brand={brand} />}
                          {tier && <TierBadge level={tier} />}
                        </span>
                      )}
                    </span>
                    <span className="wz-part-action">{part ? 'Change' : 'Choose'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!draft.cpu && <p className="wz-hint small">Choose a processor to continue.</p>}
        </section>
      )}

      <div className="wz-nav">
        {step > 0 ? <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
        {current !== 'parts' ? (
          <button type="button" className="btn btn--big" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue →</button>
        ) : (
          <button type="button" className="btn btn--big" disabled={!canContinue} onClick={() => onFinish(draft)}>See my results →</button>
        )}
      </div>

      {browsing && (
        <PartBrowser
          slot={browsing}
          build={draft}
          workloads={workloads}
          resolution={resolution}
          onPick={(part) => {
            setDraft((d) => {
              const next = { ...d, [browsing]: part };
              // Switching CPU platform can make the chosen RAM type unusable.
              if (browsing === 'cpu' && next.cpu && next.ram && !next.cpu.memTypes.includes(next.ram.type)) next.ram = undefined;
              return next;
            });
            setBrowsing(null);
          }}
          onClose={() => setBrowsing(null)}
        />
      )}
    </div>
  );
}
