import { slotLabels } from '../data';
import { estimatePowerDraw, recommendedPsuWatts } from '../engine/compatibility';
import type { Suggestion } from '../engine/recommend';
import type { BuildEvaluation, Tone, WorkloadResult } from '../engine/simulation';
import type { Build, Issue, PartSlot, Resolution } from '../engine/types';
import { workloadById } from '../engine/workloads';
import { FpsChart, TimeShareChart } from './Charts';

const toneLabel: Record<Tone, { icon: string; text: string }> = {
  good: { icon: '✓', text: 'Balanced' },
  warning: { icon: '!', text: 'Minor imbalance' },
  serious: { icon: '▲', text: 'Bottlenecked' },
  critical: { icon: '✕', text: 'Badly mismatched' },
};

export function StatusPill({ tone, children }: { tone: Tone; children?: React.ReactNode }) {
  return (
    <span className={`pill pill--${tone}`}>
      <span aria-hidden="true">{toneLabel[tone].icon}</span> {children ?? toneLabel[tone].text}
    </span>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return <p className="ok-line"><span className="pill pill--good">✓ Compatible</span> All selected parts work together.</p>;
  const order = { error: 0, warning: 1, info: 2 } as const;
  const icon = { error: '✕', warning: '!', info: 'i' } as const;
  return (
    <ul className="issues">
      {[...issues].sort((a, b) => order[a.severity] - order[b.severity]).map((i, n) => (
        <li key={n} className={`issue issue--${i.severity}`}>
          <span className="issue-icon" aria-label={i.severity}>{icon[i.severity]}</span>
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
    <article className="card workload-card">
      <header className="card-head">
        <div>
          <h3>{w.name}</h3>
          <p className="muted small">{w.description}</p>
        </div>
        <div className="score-block">
          <span className="score-num">{Math.round(r.score)}</span>
          <StatusPill tone={r.tone} />
        </div>
      </header>
      <p className="headline">{r.headline}</p>
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

export function Results({ build, evaluation, issues, suggestions, resolution, onApply }: Props) {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const draw = estimatePowerDraw(build);
  const rec = recommendedPsuWatts(build);
  const worst = [...evaluation.results].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="results">
      <section className="card summary" aria-label="Build summary">
        <div className="hero">
          <span className="hero-label">Harmony score</span>
          <span className="hero-num">{Math.round(evaluation.overall)}<small>/100</small></span>
          <StatusPill tone={errors ? 'critical' : evaluation.tone}>{errors ? `${errors} compatibility problem${errors > 1 ? 's' : ''}` : undefined}</StatusPill>
        </div>
        <div className="summary-facts">
          <div><span className="muted small">Weakest fit</span><b>{worst ? workloadById[worst.workload].short : '—'}</b></div>
          <div><span className="muted small">Peak power</span><b>~{draw} W</b></div>
          <div><span className="muted small">Recommended PSU</span><b>{rec} W</b></div>
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
            {suggestions.map((s) => (
              <li key={s.id} className={`suggestion suggestion--${s.kind}`}>
                <div>
                  <span className="suggestion-kind">{s.kind === 'save' ? 'Save' : s.kind === 'fix' ? 'Fix' : 'Upgrade'}</span>
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
