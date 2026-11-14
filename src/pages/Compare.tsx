import { ScoreRing, toneText } from '../components/Badges';
import { SlotIcon } from '../components/Icons';
import { compareBuilds, type Side } from '../engine/compare';
import type { Build, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { partSummary } from '../ui';
import { purposeLabels } from './Setup';

const mainSlots: { slot: PartSlot; label: string }[] = [
  { slot: 'cpu', label: 'Processor' },
  { slot: 'gpu', label: 'Graphics card' },
  { slot: 'ram', label: 'Memory' },
  { slot: 'storage', label: 'Storage' },
];

interface Props {
  a: Build;
  b: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  refreshHz: number;
  onOpen: (side: Side, slot: PartSlot) => void;
  onSwap: () => void;
  onUseB: () => void;
}

/** Which side wins a number (higher is better unless `lowerWins`), null on a near-tie. */
function better(a: number, b: number, tolerance = 0.02, lowerWins = false): Side | null {
  if (Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * tolerance) return null;
  return (b > a) !== lowerWins ? 'b' : 'a';
}

/** GPU-limited with spare CPU is fine for gaming, so say so instead of sounding like a problem. */
const neck = (b: string | null | undefined) => (!b ? 'None' : b === 'GPU' ? 'GPU (CPU has spare power)' : b);

function Cell({ side, win, children }: { side: Side; win: Side | null; children: React.ReactNode }) {
  return <td className={win === side ? 'cmp-win' : undefined}>{children}</td>;
}

export function ComparePage({ a, b, workloads, resolution, refreshHz, onOpen, onSwap, onUseB }: Props) {
  const c = compareBuilds(a, b, workloads, resolution, refreshHz);
  const sides: [Side, Build][] = [['a', a], ['b', b]];

  return (
    <div className="compare">
      <div className="cmp-top">
        <div>
          <h1 className="page-title">Compare builds</h1>
          <p className="page-sub cmp-sub">{workloads.map((w) => purposeLabels[w]).join(' · ')}{workloads.some((w) => ['aaa', 'esports', 'raytracing', 'streaming'].includes(w)) ? ` · ${resolution} · ${refreshHz} Hz` : ''}</p>
        </div>
        <div className="cmp-actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={onSwap}>Swap A ⇄ B</button>
          <button type="button" className="btn btn--small" onClick={onUseB}>Use Build B</button>
        </div>
      </div>

      <div className={`cmp-summary${c.winner ? ' cmp-summary--win' : ''}`}>
        {c.winner && <span className="cmp-summary-tag">Build {c.winner.toUpperCase()} recommended{c.reason ? `: ${c.reason}` : ''}</span>}
        {c.lines.map((l, i) => <p key={i}>{l}</p>)}
      </div>

      <div className="cmp-cols">
        {sides.map(([side, build]) => {
          const s = c[side];
          const other = side === 'a' ? b : a;
          const tone = s.errors ? 'critical' : s.evaluation.tone;
          return (
            <section key={side} className={`panel cmp-build${c.winner === side ? ' cmp-build--win' : ''}`} aria-label={`Build ${side.toUpperCase()}`}>
              <div className="cmp-build-head">
                <h2>Build {side.toUpperCase()}</h2>
                {c.winner === side && <span className="tag tag--best">Recommended</span>}
              </div>
              <div className="cmp-score">
                <ScoreRing score={s.errors ? Math.min(s.evaluation.overall, 30) : s.evaluation.overall} tone={tone} size={84} label={`Build ${side.toUpperCase()} score`} />
                <span className={`chip chip--${tone}`}>{s.errors ? 'Parts don’t fit' : toneText[tone]}</span>
              </div>
              <ul className="cmp-parts">
                {mainSlots.map(({ slot, label }) => {
                  const part = build[slot];
                  const differs = part?.id !== other[slot]?.id;
                  return (
                    <li key={slot}>
                      <button type="button" className={`cmp-part${differs ? ' cmp-part--diff' : ''}`} onClick={() => onOpen(side, slot)}>
                        <span className="cmp-part-icon"><SlotIcon slot={slot} size={18} /></span>
                        <span className="cmp-part-body">
                          <span className="cmp-part-label">{label}</span>
                          <b>{part ? part.name : slot === 'gpu' ? 'Integrated graphics' : 'Not chosen'}</b>
                          {part && <span className="cmp-part-spec">{partSummary(slot, part)}</span>}
                        </span>
                        <span className="cmp-change">Change</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="panel" aria-labelledby="cmp-detail">
        <h2 id="cmp-detail" className="cmp-h2">Side by side</h2>
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead><tr><th /><th>Build A</th><th>Build B</th></tr></thead>
            <tbody>
              {(() => {
                const w = better(c.a.evaluation.overall, c.b.evaluation.overall, 0.03);
                return <tr className="cmp-strong"><th>Harmony score</th><Cell side="a" win={w}>{Math.round(c.a.evaluation.overall)}</Cell><Cell side="b" win={w}>{Math.round(c.b.evaluation.overall)}</Cell></tr>;
              })()}
              {c.a.evaluation.results.map((ra, i) => {
                const rb = c.b.evaluation.results[i];
                const w = better(ra.score, rb.score, 0.03);
                return (
                  <tr key={ra.workload}>
                    <th>{purposeLabels[ra.workload]}</th>
                    <Cell side="a" win={w}>{Math.round(ra.score)}</Cell>
                    <Cell side="b" win={w}>{Math.round(rb.score)}</Cell>
                  </tr>
                );
              })}
              {c.a.evaluation.results.map((ra) => (
                <tr key={`bn-${ra.workload}`}>
                  <th>Bottleneck{c.a.evaluation.results.length > 1 ? ` · ${purposeLabels[ra.workload]}` : ''}</th>
                  <td>{neck(c.a.bottlenecks[ra.workload])}</td>
                  <td>{neck(c.b.bottlenecks[ra.workload])}</td>
                </tr>
              ))}
              {(() => {
                const w = better(c.a.power, c.b.power, 0.05, true);
                return <tr><th>Peak power</th><Cell side="a" win={w}>~{c.a.power} W</Cell><Cell side="b" win={w}>~{c.b.power} W</Cell></tr>;
              })()}
              <tr><th>PSU needed</th><td>{c.a.psuNeeded} W</td><td>{c.b.psuNeeded} W</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {c.a.games.length > 0 && (
        <section className="panel" aria-labelledby="cmp-games">
          <h2 id="cmp-games" className="cmp-h2">Games <span className="panel-meta">average FPS, standard settings</span></h2>
          <div className="cmp-table-wrap">
            <table className="cmp-table cmp-table--games">
              <thead><tr><th>Game</th><th>A</th><th>B</th><th>B vs A</th></tr></thead>
              <tbody>
                {c.a.games.map((ga, i) => {
                  const gb = c.b.games[i];
                  const w = better(ga.fps, gb.fps, 0.03);
                  const diff = ga.fps > 0 ? gb.fps / ga.fps - 1 : 0;
                  return (
                    <tr key={ga.game.id}>
                      <th>{ga.game.name}</th>
                      <Cell side="a" win={w}>{Math.round(ga.fps)}</Cell>
                      <Cell side="b" win={w}>{Math.round(gb.fps)}</Cell>
                      <td className={`cmp-diff${w === 'b' ? ' cmp-diff--up' : w === 'a' ? ' cmp-diff--down' : ''}`}>
                        {w === null ? 'Same' : `${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff) * 100)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
