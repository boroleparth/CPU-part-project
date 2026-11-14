import { games } from '../data/games';
import { slotOrder } from '../data';
import { simulateGames } from '../engine/games';
import type { Suggestion } from '../engine/recommend';
import { componentLabelShort, type BuildEvaluation, type Tone, type WorkloadResult } from '../engine/simulation';
import type { Build, Issue, PartSlot, Resolution } from '../engine/types';
import { ScoreRing, TierBadge, toneText } from '../components/Badges';
import { SlotIcon } from '../components/Icons';
import { partSummary, tierOf } from '../ui';
import { purposeLabels } from './Setup';
import { FpsChart, TimeShareChart } from '../components/Charts';
import { estimatePowerDraw, recommendedPsuWatts } from '../engine/compatibility';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** A short title + one line for a workload result (the long text stays in the engine). */
export function shortVerdict(r: WorkloadResult, res: Resolution): { title: string; line: string } {
  if (r.judged) {
    const p = r.judged;
    if (p.limitedBy === 'cpu' && p.bottleneck >= 0.1) return { title: 'CPU is holding back the GPU', line: `${pct(p.bottleneck)} of the GPU sits idle at ${res}` };
    if (p.limitedBy === 'gpu' && p.bottleneck > 0.4) return { title: 'CPU has power to spare', line: `The GPU is the limit at ${res}` };
    return { title: 'CPU and GPU are well matched', line: `~${Math.round(p.fps)} FPS at ${res}` };
  }
  const t = r.throughput!;
  if (r.score >= 80) return { title: 'Well balanced', line: 'No part is holding the others back' };
  return { title: `${componentLabelShort(t.weakest)} is holding this back`, line: `~${pct(t.fixGain)} faster if it matched the rest` };
}

/** The detailed breakdown under the verdict: key facts, problems, then one card per use. */
function Analysis({ build, evaluation, issues, resolution }: { build: Build; evaluation: BuildEvaluation; issues: Issue[]; resolution: Resolution }) {
  const problems = issues.filter((i) => i.severity !== 'info');
  const errors = problems.filter((i) => i.severity === 'error').length;
  return (
    <section className="analysis" aria-label="Detailed analysis">
      <h2 className="section-label">Detailed analysis</h2>
      <div className="facts">
        <div className="fact"><span>Peak power</span><b>~{estimatePowerDraw(build)} W</b></div>
        <div className="fact"><span>PSU needed</span><b>{recommendedPsuWatts(build)} W</b></div>
        <div className={`fact fact--${errors ? 'critical' : 'good'}`}><span>Compatibility</span><b>{errors ? `${errors} problem${errors > 1 ? 's' : ''}` : 'All fit'}</b></div>
      </div>

      {problems.length > 0 && (
        <ul className="issue-list">
          {problems.map((i, n) => <li key={n} className={`issue-item issue-item--${i.severity}`}>{i.message}</li>)}
        </ul>
      )}

      {evaluation.results.map((r) => (
        <article key={r.workload} className={`acard acard--${r.tone}`}>
          <div className="acard-head">
            <h3>{purposeLabels[r.workload]}</h3>
            <span className={`score-chip score-chip--${r.tone}`}>{Math.round(r.score)}</span>
          </div>
          <p className="acard-headline">{r.headline}</p>
          <p className="acard-detail">{r.detail}</p>
          {r.fps && <FpsChart points={r.fps} judged={resolution} />}
          {r.throughput && <TimeShareChart share={r.throughput.timeShare} weakest={r.throughput.weakest} />}
          {r.notes.length > 0 && (
            <ul className="acard-notes">
              {r.notes.slice(0, 2).map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}

export function VerdictPage({ build, evaluation, issues, resolution }: { build: Build; evaluation: BuildEvaluation; issues: Issue[]; resolution: Resolution }) {
  const errors = issues.filter((i) => i.severity === 'error');
  const worst = [...evaluation.results].sort((a, b) => a.score - b.score)[0];
  const main = worst ? shortVerdict(worst, resolution) : { title: 'Add parts to see a verdict', line: '' };
  const tone: Tone = errors.length ? 'critical' : evaluation.tone;

  return (
    <>
      <div className="verdict">
        <ScoreRing score={errors.length ? Math.min(evaluation.overall, 30) : evaluation.overall} tone={tone} size={148} label="Harmony score" />
        <span className={`verdict-tag verdict-tag--${tone}`}>{errors.length ? 'Parts don’t fit' : toneText[tone]}</span>
        <h1 className="page-title">{errors.length ? `${errors.length} part${errors.length > 1 ? 's' : ''} won’t work together` : main.title}</h1>
        {!errors.length && main.line && <p className="page-sub">{main.line}</p>}
      </div>

      {build.cpu && build.gpu && (
        <div className="match">
          <div className="match-part">
            <span className="match-label">CPU</span>
            <b>{build.cpu.name}</b>
            <TierBadge level={tierOf('cpu', build.cpu)!} />
          </div>
          <span className={`match-link match-link--${tone}`} aria-hidden="true" />
          <div className="match-part">
            <span className="match-label">GPU</span>
            <b>{build.gpu.name}</b>
            <TierBadge level={tierOf('gpu', build.gpu)!} />
          </div>
        </div>
      )}

      <Analysis build={build} evaluation={evaluation} issues={issues} resolution={resolution} />
    </>
  );
}

export function GamesPage({ build, resolution, refreshHz }: { build: Build; resolution: Resolution; refreshHz: number }) {
  const results = simulateGames(build, games, resolution, refreshHz);
  const groups = [
    { title: 'Competitive', list: results.filter((r) => r.game.kind === 'competitive') },
    { title: 'Story & open world', list: results.filter((r) => r.game.kind === 'story') },
  ];
  return (
    <>
      <h1 className="page-title">Your games</h1>
      <p className="page-sub">{resolution} · {refreshHz} Hz · standard settings</p>
      {groups.map((g) => (
        <section key={g.title} className="game-group">
          <h2 className="group-title">{g.title}</h2>
          <ul className="game-list">
            {g.list.map((r) => (
              <li key={r.game.id} className="game-row" title={r.verdict}>
                <span className="game-title">{r.game.name}</span>
                <span className="game-fps"><b>{Math.round(r.fps)}</b> FPS</span>
                <span className={`chip chip--${r.tone}`}>{r.short}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="fineprint">Estimates. Real results vary by scene, patch and driver.</p>
    </>
  );
}

const slotNames: Record<PartSlot, string> = {
  cpu: 'Processor', motherboard: 'Motherboard', ram: 'Memory', gpu: 'Graphics card',
  storage: 'Storage', cooler: 'Cooler', psu: 'Power supply', case: 'Case',
};

interface BuildPageProps {
  build: Build;
  issues: Issue[];
  suggestions: Suggestion[];
  copied: '' | 'link' | 'list';
  onOpen: (slot: PartSlot) => void;
  onApply: (s: Suggestion) => void;
  onCopy: (what: 'link' | 'list') => void;
}

export function BuildPage({ build, issues, suggestions, copied, onOpen, onApply, onCopy }: BuildPageProps) {
  const top = suggestions.filter((s) => Object.keys(s.changes).length).slice(0, 3);
  return (
    <>
      <h1 className="page-title">Your build</h1>
      <p className="page-sub">Tap a part to change it.</p>
      <ul className="build-list">
        {slotOrder.map((slot) => {
          const part = build[slot];
          const own = issues.filter((i) => i.slots.includes(slot) && i.severity !== 'info');
          const state: Tone = own.some((i) => i.severity === 'error') ? 'critical' : own.length ? 'warning' : 'good';
          return (
            <li key={slot}>
              <button type="button" className="build-row" onClick={() => onOpen(slot)} title={own.map((i) => i.message).join('\n') || undefined}>
                <span className={`state-dot state-dot--${part || slot === 'gpu' ? state : 'warning'}`} aria-label={toneText[state]} />
                <span className="build-icon"><SlotIcon slot={slot} size={20} /></span>
                <span className="build-body">
                  <span className="build-label">{slotNames[slot]}</span>
                  <b>{part ? part.name : slot === 'gpu' ? 'Integrated graphics' : 'Not chosen'}</b>
                  {own[0] ? <span className={`build-issue build-issue--${state}`}>{own[0].message}</span> : part && <span className="build-spec">{partSummary(slot, part)}</span>}
                </span>
                <span className="build-change">Change</span>
              </button>
            </li>
          );
        })}
      </ul>

      {top.length > 0 && (
        <section className="improve">
          <h2 className="group-title">Improve it</h2>
          <ul>
            {top.map((s) => (
              <li key={s.id} className={`improve-row improve-row--${s.kind}`}>
                <span className="improve-kind">{s.kind === 'save' ? 'Save' : s.kind === 'fix' ? 'Fix' : 'Upgrade'}</span>
                <span className="improve-title">{s.title.replace(/^Save money: /, '')}</span>
                <button type="button" className="btn btn--small" onClick={() => onApply(s)}>Apply</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="share">
        <button type="button" className="btn" onClick={() => onCopy('list')}>{copied === 'list' ? 'Copied ✓' : 'Copy parts list'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => onCopy('link')}>{copied === 'link' ? 'Copied ✓' : 'Copy link'}</button>
      </div>
    </>
  );
}
