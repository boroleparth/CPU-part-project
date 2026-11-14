import { slotLabels } from '../data';
import { estimatePowerDraw, recommendedPsuWatts } from '../engine/compatibility';
import type { Suggestion } from '../engine/recommend';
import type { BuildEvaluation, WorkloadResult } from '../engine/simulation';
import type { Build, Issue, PartSlot, Resolution } from '../engine/types';
import { workloadById } from '../engine/workloads';
import { FpsChart, TimeShareChart } from './Charts';
import { ScoreRing, StatusPill, toneText } from './Badges';
import { SlotIcon } from './Icons';


function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <p className="ok-line"><span className="pill pill--good">✓ Compatible</span> All selected parts work together.</p>;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const icon = { error: '✕', warning: '!', info: 'i' } as const;
  return (
    <ul className="issues">
      {[...issues].sort((a, b) => order[a.severity] - order[b.severity]).map((i, n) => (
        <li key={n} className={`issue issue--${i.severity}`}>
          <span className="issue-icon" aria-label={i.severity}>{icon[i.severity]}</span>
          <span className="issue-part" aria-hidden="true"><SlotIcon slot={i.slots[0]} size={18} /></span>
          <span>
            <span className="issue-slots">{i.slots.map((s) => slotLabels[s as PartSlot].split(' (')[0]).join(' + ')}</span>
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WorkloadCard({ r, resolution }: { r: WorkloadResult; resolution: Resolution }) {
  const w = workloadById[r.workload];
  return (
    <article className={`card workload-card workload-card--${r.tone}`}>
      <header className="card-head">
        <div>
          <h3>{w.name}</h3>
          <p className="muted small">{w.description}</p>
        </div>
        <div className="score-block">
          <ScoreRing score={r.score} tone={r.tone} size={64} label={`${w.name} score`} />
        </div>
      </header>
      <p className={`headline headline--${r.tone}`}><StatusPill tone={r.tone} /> {r.headline}</p>
      <p className="detail">{r.detail}</p>
      {r.fps && <FpsChart points={r.fps} judged={resolution} />}
      {r.throughput && <TimeShareChart share={r.throughput.timeShare} weakest={r.throughput.weakest} />}
      {r.notes.length > 0 && (
        <ul className="notes">
          {r.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </article>
  );
}

interface Props {
  build: Build;
  evaluation: BuildEvaluation;
  issues: Issue[];
  suggestions: Suggestion[];
  resolution: Resolution;
  onApply: (s: Suggestion) => void;
}

const kindOrder = { fix: 0, upgrade: 1, save: 2 } as const;

export function Results({ build, evaluation, issues, suggestions, resolution, onApply }: Props) {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const draw = estimatePowerDraw(build);
  const rec = recommendedPsuWatts(build);
  const worst = [...evaluation.results].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="results">
      <section className="card summary" aria-label="Build summary">
        <ScoreRing score={errors ? Math.min(evaluation.overall, 30) : evaluation.overall} tone={errors ? 'critical' : evaluation.tone} label="Harmony score" />
        <div className="summary-main">
          <span className="eyebrow">Harmony score</span>
          <p className="summary-verdict">
            {errors
              ? `${errors} compatibility problem${errors > 1 ? 's' : ''} to fix first`
              : toneText[evaluation.tone] + (worst && evaluation.results.length > 1 ? ` · weakest fit: ${workloadById[worst.workload].short}` : '')}
          </p>
          <div className="summary-facts">
            <div><span className="muted small">Peak power</span><b>~{draw} W</b></div>
            <div><span className="muted small">Recommended PSU</span><b>{rec} W</b></div>
            <div><span className="muted small">Workloads checked</span><b>{evaluation.results.length}</b></div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Compatibility</h2>
        <IssueList issues={issues} />
      </section>

      {suggestions.length > 0 && (
        <section className="card">
          <h2 className="section-title">Suggested changes</h2>
          <ul className="suggestions">
            {[...suggestions].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]).map((s) => (
              <li key={s.id} className={`suggestion suggestion--${s.kind}`}>
                <div>
                  <span className={`suggestion-kind suggestion-kind--${s.kind}`}>{s.kind === 'save' ? 'Save money' : s.kind === 'fix' ? 'Fix' : 'Upgrade'}</span>
                  <b>{s.title}</b>
                  <p className="small">{s.detail}</p>
                </div>
                {Object.keys(s.changes).length > 0 && <button type="button" className="btn btn--small" onClick={() => onApply(s)}>Apply</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {evaluation.results.map((r) => <WorkloadCard key={r.workload} r={r} resolution={resolution} />)}
    </div>
  );
}
