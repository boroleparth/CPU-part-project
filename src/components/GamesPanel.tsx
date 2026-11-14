import { games, type Game } from '../data/games';
import { REFRESH_RATES, simulateGames, type GameResult } from '../engine/games';
import type { Build, Resolution } from '../engine/types';
import { StatusPill } from './Badges';

interface Props {
  build: Build;
  resolution: Resolution;
  refreshHz: number;
  onRefresh: (hz: number) => void;
}

const groups: { kind: Game['kind']; title: string }[] = [
  { kind: 'competitive', title: 'Competitive & online' },
  { kind: 'story', title: 'Story & open world' },
];

const limitText = { cpu: 'CPU-limited', gpu: 'GPU-limited', cap: 'Frame cap' } as const;

function GameGroup({ title, results, refreshHz }: { title: string; results: GameResult[]; refreshHz: number }) {
  // One scale per group so bars compare honestly; leave room past the refresh line.
  const max = Math.max(refreshHz * 1.2, ...results.map((r) => r.fps)) * 1.05;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="game-group">
      <div className="game-group-head">
        <h3>{title}</h3>
        <span className="hz-key"><i aria-hidden="true" /> Your monitor: {refreshHz} Hz</span>
      </div>
      <ul className="games">
        {results.map((r) => (
          <li key={r.game.id} className="game">
            <div className="game-name">
              <b>{r.game.name}</b>
              <span className="muted tiny">{r.game.preset} preset</span>
            </div>
            <div className="game-bar" role="img" aria-label={`${Math.round(r.fps)} FPS average, ${Math.round(r.low1)} FPS 1% low; monitor ${refreshHz} Hz`}>
              <span className={`game-fill game-fill--${r.tone}`} style={{ width: pct(r.fps) }} />
              <span className="game-low" style={{ left: pct(r.low1) }} title={`1% low ≈ ${Math.round(r.low1)} FPS`} />
              <span className="game-hz" style={{ left: pct(refreshHz) }} />
            </div>
            <div className="game-fps">
              <b>{Math.round(r.fps)}</b><span className="muted tiny"> FPS</span>
              <span className="muted tiny game-low-text">1% low {Math.round(r.low1)}</span>
            </div>
            <div className="game-verdict">
              <StatusPill tone={r.tone}>{r.verdict}</StatusPill>
              <span className="muted tiny">{limitText[r.limitedBy]}{r.game.note ? ` · ${r.game.note}` : ''}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "How will my games run?": ten popular games at a standard preset, against the monitor's refresh rate. */
export function GamesPanel({ build, resolution, refreshHz, onRefresh }: Props) {
  const results = simulateGames(build, games, resolution, refreshHz);
  const maxed = results.filter((r) => r.tone === 'good').length;
  return (
    <section className="card games-card" aria-labelledby="games-title">
      <header className="games-head">
        <div>
          <h2 id="games-title" className="section-title">How your games will run</h2>
          <p className="muted small">Estimated average frame rate at {resolution} with each game's standard preset. {maxed} of {results.length} games run smoothly at or near your refresh rate.</p>
        </div>
        <label className="hz-select">
          <span className="muted small">Monitor</span>
          <select id="refresh-select" value={refreshHz} onChange={(e) => onRefresh(Number(e.target.value))}>
            {REFRESH_RATES.map((hz) => <option key={hz} value={hz}>{hz} Hz</option>)}
          </select>
        </label>
      </header>
      <div className="games-legend muted tiny" aria-hidden="true">
        <span><i className="lg-fill" /> Average FPS</span>
        <span><i className="lg-low" /> 1% low (worst dips)</span>
        <span><i className="lg-hz" /> Monitor refresh rate</span>
      </div>
      {groups.map((g) => (
        <GameGroup key={g.kind} title={g.title} results={results.filter((r) => r.game.kind === g.kind)} refreshHz={refreshHz} />
      ))}
      <details className="table-view">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th>Game</th><th>Preset</th><th>Average</th><th>1% low</th><th>Limited by</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.game.id}><td>{r.game.name}</td><td>{r.game.preset}</td><td>{Math.round(r.fps)}</td><td>{Math.round(r.low1)}</td><td>{limitText[r.limitedBy]}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="muted tiny games-foot">Estimates tuned to typical published benchmarks; your results vary with drivers, game patches and the exact scene.</p>
    </section>
  );
}
