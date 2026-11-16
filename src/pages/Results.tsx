import { useState } from 'react';
import { games } from '../data/games';
import { limitReport, type LimitItem } from '../engine/limits';
import { slotsFor } from '../data';
import { simulateGames } from '../engine/games';
import type { Suggestion } from '../engine/recommend';
import { componentLabelShort, type BuildEvaluation, type Tone, type WorkloadResult } from '../engine/simulation';
import type { Build, Device, Gpu, Issue, PartSlot, Resolution } from '../engine/types';
import { ScoreRing, SourceLine, TierBadge, toneText } from '../components/Badges';
import { SlotIcon } from '../components/Icons';
import { PowerPicker } from '../components/PowerPicker';
import { partSummary, tierOf } from '../ui';
import { purposeLabels } from './Setup';
import { workloadById } from '../engine/workloads';
import { FpsChart, TimeShareChart } from '../components/Charts';
import { estimatePowerDraw, recommendedPsuWatts } from '../engine/compatibility';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** A short title + one line for a workload result (the long text stays in the engine). */
export function shortVerdict(r: WorkloadResult, res: Resolution): { title: string; line: string } {
  if (r.judged) {
    const p = r.judged;
    if (r.headline.startsWith('No graphics card')) return { title: 'No graphics card', line: 'Games need one. See the suggestion.' };
    if (r.shortfall) return { title: r.shortfall.part === 'VRAM' ? 'Graphics memory is too small' : 'Not enough RAM', line: `${r.shortfall.have} GB of ~${r.shortfall.need} GB needed at ${res}` };
    if (p.limitedBy === 'cpu' && p.bottleneck >= 0.1) return { title: 'CPU is holding back the GPU', line: `${pct(p.bottleneck)} of the GPU sits idle at ${res}` };
    if (p.limitedBy === 'gpu' && p.bottleneck > 0.4) return { title: 'CPU has power to spare', line: `The GPU is the limit at ${res}` };
    return { title: 'CPU and GPU are well matched', line: `~${Math.round(p.fps)} FPS at ${res}` };
  }
  const t = r.throughput!;
  if (r.score >= 80) return { title: 'Well balanced', line: 'No part is holding the others back' };
  return { title: `${componentLabelShort(t.weakest)} is holding this back`, line: `~${pct(t.fixGain)} faster if it matched the rest` };
}

/** The detailed breakdown under the verdict: key facts, problems, then one card per use. */
function Analysis({ evaluation, resolution }: { evaluation: BuildEvaluation; resolution: Resolution }) {
  return (
    <section className="analysis" aria-label="Detailed analysis">
      <h2 className="section-label">Detailed analysis</h2>
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

function VerdictCard({ build, evaluation, issues, resolution, laptop }: { build: Build; evaluation: BuildEvaluation; issues: Issue[]; resolution: Resolution; laptop: boolean }) {
  const errors = issues.filter((i) => i.severity === 'error');
  const worst = [...evaluation.results].sort((a, b) => a.score - b.score)[0];
  const main = worst ? shortVerdict(worst, resolution) : { title: 'Add parts to see a verdict', line: '' };
  const tone: Tone = errors.length ? 'critical' : evaluation.tone;

  const problems = issues.filter((i) => i.severity !== 'info');

  return (
      <aside className="analysis-side">
        <div className="verdict">
          <ScoreRing score={errors.length ? Math.min(evaluation.overall, 30) : evaluation.overall} tone={tone} size={140} label="Harmony score" />
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

        <div className="facts">
          {laptop ? <>
            <div className="fact"><span>Graphics power</span><b>{build.gpu?.tgp ? `${build.gpu.tgp} W` : 'Integrated'}</b></div>
            <div className={`fact fact--${build.ram && (build.ram.sticks < 2 || build.ram.totalGb < Math.max(0, ...evaluation.results.map((r) => workloadById[r.workload].ramNeedGb))) ? 'warning' : 'good'}`}><span>Memory</span><b>{build.ram ? `${build.ram.totalGb} GB${build.ram.sticks < 2 ? ', 1 stick' : ''}` : '—'}</b></div>
          </> : <>
            <div className="fact"><span>Peak power</span><b>~{estimatePowerDraw(build)} W</b></div>
            <div className="fact"><span>PSU needed</span><b>{recommendedPsuWatts(build)} W</b></div>
          </>}
          <div className={`fact fact--${errors.length ? 'critical' : 'good'}`}><span>Compatibility</span><b>{errors.length ? `${errors.length} problem${errors.length > 1 ? 's' : ''}` : 'All fit'}</b></div>
        </div>

        {problems.length > 0 && (
          <ul className="issue-list">
            {problems.map((i, n) => <li key={n} className={`issue-item issue-item--${i.severity}`}>{i.message}</li>)}
          </ul>
        )}
      </aside>
  );
}

function GamesCard({ build, resolution, refreshHz }: { build: Build; resolution: Resolution; refreshHz: number }) {
  const results = simulateGames(build, games, resolution, refreshHz);
  const groups = [
    { title: 'Competitive', list: results.filter((r) => r.game.kind === 'competitive') },
    { title: 'Story & open world', list: results.filter((r) => r.game.kind === 'story') },
  ];
  return (
    <section className="panel panel--games" aria-labelledby="games-title">
      <div className="panel-head">
        <h2 id="games-title">Your games</h2>
        <span className="panel-meta">{resolution} · {refreshHz} Hz · standard settings</span>
      </div>
      <div className="game-cols">
        {groups.map((g) => (
          <div key={g.title} className="game-group">
            <h3 className="group-title">{g.title}</h3>
            <ul className="game-list">
              {g.list.map((r) => (
                <li key={r.game.id} className="game-row" title={r.verdict}>
                  <span className="game-title">{r.game.name}</span>
                  <span className="game-fps"><b>{Math.round(r.fps)}</b> FPS</span>
                  <span className={`chip chip--${r.tone}`}>{r.short}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="fineprint">Estimates. Real results vary by scene, patch and driver.{build.cpu?.laptop && ' Laptops: assumes plugged in, Performance / Turbo mode and the game running on the NVIDIA GPU. Older laptops also lose speed to heat; cleaning the fans helps.'}</p>
    </section>
  );
}

const slotNames: Record<PartSlot, string> = {
  cpu: 'Processor', motherboard: 'Motherboard', ram: 'Memory', gpu: 'Graphics card',
  storage: 'Storage', cooler: 'Cooler', psu: 'Power supply', case: 'Case',
};

function BuildCard({ build, issues, chosen, gaming, device, onOpen, onPower }: { build: Build; issues: Issue[]; chosen: PartSlot[]; gaming: boolean; device: Device; onOpen: (slot: PartSlot) => void; onPower: (g: Gpu) => void }) {
  const laptop = device === 'laptop';
  return (
    <section className="panel panel--flush panel--build" aria-labelledby="build-title">
      <div className="panel-head">
        <h2 id="build-title">{laptop ? 'This laptop' : 'Your build'}</h2>
        <span className="panel-meta">Tap to change</span>
      </div>
      <ul className="build-list">
        {slotsFor(device).map((slot) => {
          const part = build[slot];
          const own = issues.filter((i) => i.slots.includes(slot) && i.severity !== 'info');
          const noGpuForGames = slot === 'gpu' && !part && gaming;
          const state: Tone = noGpuForGames || own.some((i) => i.severity === 'error') ? 'critical' : own.length ? 'warning' : 'good';
          return (
            <li key={slot}>
              <button type="button" className="build-row" onClick={() => onOpen(slot)} title={own.map((i) => i.message).join('\n') || undefined}>
                <span className={`state-dot state-dot--${part || slot === 'gpu' ? state : 'warning'}`} aria-label={toneText[state]} />
                <span className="build-icon"><SlotIcon slot={slot} size={20} /></span>
                <span className="build-body">
                  <span className="build-label">{laptop && slot === 'gpu' ? 'Graphics' : slotNames[slot]}{part && !chosen.includes(slot) && <span className="auto-tag">{laptop ? 'Assumed' : 'Auto-picked'}</span>}</span>
                  <b>{part ? part.name : slot === 'gpu' ? 'Integrated graphics' : 'Not chosen'}</b>
                  {noGpuForGames ? <span className="build-issue build-issue--critical">{laptop ? 'Too slow for games. Look for a laptop with separate graphics.' : 'Too slow for games. Add a graphics card.'}</span>
                    : own[0] ? <span className={`build-issue build-issue--${state}`}>{own[0].message}</span> : part && <span className="build-spec">{partSummary(slot, part)}</span>}
                </span>
                <span className="build-change">Change</span>
              </button>
              {slot === 'gpu' && build.gpu?.laptop && <PowerPicker gpu={build.gpu} onPick={onPower} />}
              {part && <SourceLine slot={slot} part={part} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const loadTone = (i: LimitItem, ideal: boolean): Tone =>
  i.status === 'over' ? 'critical' : i.status === 'limit' ? (ideal ? 'good' : 'serious') : 'good';

/** "Which part is holding this back?": load on every part for one use, with the bottleneck marked. */
function LimitsCard({ build, evaluation, resolution }: { build: Build; evaluation: BuildEvaluation; resolution: Resolution }) {
  const worst = [...evaluation.results].sort((a, b) => a.score - b.score)[0];
  const [picked, setPicked] = useState<string | null>(null);
  const r = evaluation.results.find((x) => x.workload === picked) ?? worst;
  if (!r) return null;
  const rep = limitReport(build, r, resolution);
  const tone: Tone = rep.bottleneck === null || rep.ideal ? 'good' : rep.items.some((i) => i.status === 'over') ? 'critical' : 'serious';
  return (
    <section className="panel panel--limits" aria-labelledby="limits-title">
      <div className="panel-head">
        <h2 id="limits-title">What's limiting performance</h2>
        {evaluation.results.length > 1 && (
          <div className="seg-tabs" role="tablist" aria-label="Use">
            {evaluation.results.map((x) => (
              <button key={x.workload} type="button" role="tab" aria-selected={x === r} className={x === r ? 'seg-tab seg-tab--on' : 'seg-tab'} onClick={() => setPicked(x.workload)}>
                {purposeLabels[x.workload]}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className={`limit-headline limit-headline--${tone}`}>
        {rep.bottleneck && !rep.ideal && <span className="limit-badge">Bottleneck: {rep.bottleneck}</span>}
        {rep.headline}
      </p>
      <ul className="limit-list">
        {rep.items.map((i) => {
          const t = loadTone(i, rep.ideal);
          const isNeck = i.part === rep.bottleneck && !rep.ideal;
          return (
            <li key={i.part} className={`limit-row${isNeck ? ' limit-row--neck' : ''}`}>
              <span className="limit-part">{i.part}</span>
              <span className="limit-track"><span className={`limit-fill limit-fill--${t}`} style={{ width: `${Math.min(100, Math.max(3, i.load * 100))}%` }} /></span>
              <span className="limit-label">{i.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const kindOrder = { fix: 0, upgrade: 1, save: 2 } as const;

function SuggestionsCard({ suggestions, score, onApply }: { suggestions: Suggestion[]; score: number; onApply: (s: Suggestion) => void }) {
  const top = suggestions.filter((s) => Object.keys(s.changes).length).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]).slice(0, 4);
  return (
    <section className="panel panel--suggest" aria-labelledby="improve-title">
      <div className="panel-head">
        <h2 id="improve-title">Suggestions</h2>
      </div>
      {top.length ? (
        <ul className="improve-list">
          {top.map((s) => (
            <li key={s.id} className={`improve-row improve-row--${s.kind}`}>
              <span className="improve-kind">{s.kind === 'save' ? 'Save' : s.kind === 'fix' ? 'Fix' : 'Upgrade'}</span>
              <span className="improve-body">
                <b>{s.title.replace(/^Save money: /, '')}</b>
                <span>{s.detail}</span>
              </span>
              <button type="button" className="btn btn--small" onClick={() => onApply(s)}>Apply</button>
            </li>
          ))}
        </ul>
      ) : score >= 80 ? (
        <p className="all-good"><span className="state-dot state-dot--good" /> Nothing to change. This build is well balanced.</p>
      ) : (
        <p className="all-good"><span className="state-dot state-dot--warning" /> No single swap fixes this. Try a different processor or graphics card.</p>
      )}
    </section>
  );
}

export interface DashboardProps {
  build: Build;
  evaluation: BuildEvaluation;
  issues: Issue[];
  suggestions: Suggestion[];
  resolution: Resolution;
  refreshHz: number;
  gaming: boolean;
  chosen: PartSlot[];
  device: Device;
  listing?: { url: string; store?: string };
  copied: '' | 'link' | 'list';
  onOpen: (slot: PartSlot) => void;
  onPower: (g: Gpu) => void;
  onApply: (s: Suggestion) => void;
  onCopy: (what: 'link' | 'list') => void;
  onCompare: () => void;
}

/** Everything after "Check my build", on one page. */
export function Dashboard(props: DashboardProps) {
  const { build, evaluation, issues, suggestions, resolution, refreshHz, gaming, chosen, device, listing, copied, onOpen, onPower, onApply, onCopy, onCompare } = props;
  const laptop = device === 'laptop';
  return (
    <div className="dashboard">
      <div className="dash-side">
        {listing && (
          <a className="listing-chip" href={listing.url} target="_blank" rel="noopener noreferrer nofollow">
            <span>Checked from {listing.store ?? 'a store link'}</span><span aria-hidden="true">Open listing ↗</span>
          </a>
        )}
        <VerdictCard build={build} evaluation={evaluation} issues={issues} resolution={resolution} laptop={laptop} />
        <BuildCard build={build} issues={issues} chosen={chosen} gaming={gaming} device={device} onOpen={onOpen} onPower={onPower} />
        <div className="share">
          <button type="button" className="btn" onClick={() => onCopy('list')}>{copied === 'list' ? 'Copied ✓' : 'Copy parts list'}</button>
          <button type="button" className="btn btn--ghost" onClick={() => onCopy('link')}>{copied === 'link' ? 'Copied ✓' : 'Copy link'}</button>
          <button type="button" className="btn btn--ghost" onClick={onCompare}>{laptop ? 'Compare with another laptop' : 'Compare with another build'}</button>
        </div>
      </div>
      <div className="dash-main">
        <LimitsCard build={build} evaluation={evaluation} resolution={resolution} />
        <SuggestionsCard suggestions={suggestions} score={issues.some((i) => i.severity === 'error') ? 0 : evaluation.overall} onApply={onApply} />
        <Analysis evaluation={evaluation} resolution={resolution} />
        {gaming && build.cpu && <GamesCard build={build} resolution={resolution} refreshHz={refreshHz} />}
      </div>
    </div>
  );
}
