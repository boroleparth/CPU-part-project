import { useEffect, useMemo, useState } from 'react';
import { AutoBuilder } from './components/AutoBuilder';
import { WorkloadControls } from './components/Controls';
import { HowItWorks } from './components/HowItWorks';
import { PartBrowser } from './components/PartBrowser';
import { BuildList, partSummary } from './components/PartPicker';
import { slotLabels, slotOrder } from './data';
import { workloadById } from './engine/workloads';
import { Results } from './components/Results';
import { Wizard } from './components/Wizard';
import { GamesPanel } from './components/GamesPanel';
import { completeBuild } from './engine/builder';
import { simulateGames } from './engine/games';
import { games } from './data/games';
import { checkCompatibility } from './engine/compatibility';
import { suggest } from './engine/recommend';
import { evaluateBuild } from './engine/simulation';
import type { Build, PartSlot, WorkloadId } from './engine/types';
import { decodeState, defaultState, encodeState, exampleBuild, type AppState } from './state';

type Tab = 'start' | 'build' | 'auto' | 'how';

/** A shared link (build in the URL) opens straight on the results; otherwise start with the questions. */
function initial(): { state: AppState; tab: Tab } {
  try {
    const decoded = decodeState(window.location.hash);
    if (decoded) return { state: decoded, tab: 'build' };
  } catch {
    /* fall through */
  }
  return { state: defaultState(), tab: 'start' };
}

export default function App() {
  const [boot] = useState(initial);
  const [state, setState] = useState<AppState>(boot.state);
  const [tab, setTab] = useState<Tab>(boot.tab);
  const [browsing, setBrowsing] = useState<PartSlot | null>(null);
  const [copied, setCopied] = useState<'' | 'link' | 'list'>('');
  const { build, workloads, resolution, refreshHz } = state;
  const gaming = workloads.some((id) => workloadById[id].kind === 'gaming');

  // Keep the URL in sync on the results page so a build can be shared by copying the link.
  useEffect(() => {
    if (tab !== 'build') return;
    try {
      window.history.replaceState(null, '', `#${encodeState(state)}`);
    } catch {
      /* sandboxed frames may block history access */
    }
  }, [state, tab]);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const issues = useMemo(() => checkCompatibility(build), [build]);
  const evaluation = useMemo(() => evaluateBuild(build, workloads, resolution), [build, workloads, resolution]);
  const suggestions = useMemo(() => suggest(build, evaluation.results, resolution).slice(0, 6), [build, evaluation, resolution]);

  const setPart = (slot: PartSlot, part: Build[PartSlot] | undefined) =>
    setState((s) => ({ ...s, build: { ...s.build, [slot]: part } }));
  const toggleWorkload = (id: WorkloadId) =>
    setState((s) => {
      const has = s.workloads.includes(id);
      const next = has ? s.workloads.filter((w) => w !== id) : [...s.workloads, id];
      return { ...s, workloads: next.length ? next : s.workloads };
    });

  const copy = async (what: 'link' | 'list') => {
    const text = what === 'link' ? window.location.href : partsListText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  /** Plain-text build sheet for sending to someone. */
  const partsListText = () => {
    const lines = [`PC Harmony build — harmony score ${Math.round(evaluation.overall)}/100`, ''];
    for (const slot of slotOrder) {
      const part = build[slot];
      lines.push(`${slotLabels[slot]}: ${part ? `${part.name} (${partSummary(slot, part)})` : slot === 'gpu' ? 'Integrated graphics' : '—'}`);
    }
    lines.push('', 'Verdicts:');
    for (const r of evaluation.results) lines.push(`• ${workloadById[r.workload].name}: ${Math.round(r.score)}/100 — ${r.headline}`);
    if (gaming && build.cpu) {
      lines.push('', `Games at ${resolution}, ${refreshHz} Hz monitor:`);
      for (const g of simulateGames(build, games, resolution, refreshHz)) lines.push(`• ${g.game.name} (${g.game.preset}): ~${Math.round(g.fps)} FPS, 1% low ~${Math.round(g.low1)}`);
    }
    lines.push('', window.location.href);
    return lines.join('\n');
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="36" height="36"><rect x="3" y="3" width="26" height="26" rx="7" className="logo-bg" /><path d="M9 20.5c2.2-5.5 4.4-8 7-8s4.8 2.5 7 8" className="logo-wave" /><circle cx="16" cy="12.5" r="2.2" className="logo-dot" /></svg>
          </span>
          <div>
            <h1>PC Harmony</h1>
            <p className="muted small">Find PC parts that work together — without one holding the others back.</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {([['start', 'Check a PC'], ['build', 'Results'], ['auto', 'Suggest a build'], ['how', 'How it works']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'tab tab--on' : 'tab'} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'start' && (
        <main>
          <Wizard
            workloads={workloads}
            resolution={resolution}
            refreshHz={refreshHz}
            initialBuild={build}
            onWorkloads={(w) => setState((s) => ({ ...s, workloads: w }))}
            onResolution={(r) => setState((s) => ({ ...s, resolution: r }))}
            onRefresh={(hz) => setState((s) => ({ ...s, refreshHz: hz }))}
            onFinish={(picked) => {
              setState((s) => ({ ...s, build: completeBuild(picked) }));
              go('build');
            }}
          />
        </main>
      )}

      {tab === 'build' && (
        <div className="results-intro">
          <div>
            <h2>Your results</h2>
            <p className="muted">Change anything below and the results update instantly.</p>
          </div>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go('start')}>← Edit answers</button>
        </div>
      )}

      {(tab === 'build' || tab === 'auto') && (
        <WorkloadControls
          selected={workloads}
          resolution={resolution}
          onToggle={toggleWorkload}
          onResolution={(r) => setState((s) => ({ ...s, resolution: r }))}
        />
      )}

      {tab === 'build' && gaming && build.cpu && (
        <GamesPanel build={build} resolution={resolution} refreshHz={refreshHz} onRefresh={(hz) => setState((s) => ({ ...s, refreshHz: hz }))} />
      )}

      {tab === 'build' && (
        <main className="layout">
          <aside className="card picker">
            <div className="picker-head">
              <h2 className="section-title">Your build</h2>
              <span className="muted small">Tap a part to search and compare</span>
            </div>
            <BuildList build={build} issues={issues} onOpen={setBrowsing} onRemove={(slot) => setPart(slot, undefined)} />
            <div className="picker-actions">
              <button type="button" className="btn btn--small" onClick={() => copy('list')}>{copied === 'list' ? 'Parts list copied ✓' : 'Copy parts list'}</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => copy('link')}>{copied === 'link' ? 'Link copied ✓' : 'Copy share link'}</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setState((s) => ({ ...s, build: exampleBuild() }))}>Load example</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setState((s) => ({ ...s, build: {} }))}>Clear all</button>
            </div>
          </aside>
          <Results
            build={build}
            evaluation={evaluation}
            issues={issues}
            suggestions={suggestions}
            resolution={resolution}
            onApply={(s) => setState((st) => ({ ...st, build: { ...st.build, ...s.changes } }))}
          />
        </main>
      )}

      {tab === 'auto' && (
        <main>
          <AutoBuilder
            workloads={workloads}
            resolution={resolution}
            onOpen={(b) => {
              setState((s) => ({ ...s, build: b }));
              go('build');
            }}
          />
        </main>
      )}

      {tab === 'how' && <main><HowItWorks /></main>}

      {browsing && (
        <PartBrowser
          slot={browsing}
          build={build}
          workloads={workloads}
          resolution={resolution}
          onPick={(part) => {
            setPart(browsing, part);
            setBrowsing(null);
          }}
          onClose={() => setBrowsing(null)}
        />
      )}

      <footer className="footer muted small">
        {tab === 'build' && <div className="legend-strip" aria-label="Color key">
          <span><i className="key key--good" />Balanced</span>
          <span><i className="key key--warning" />Minor imbalance</span>
          <span><i className="key key--serious" />Bottlenecked</span>
          <span><i className="key key--critical" />Mismatched / won't fit</span>
          <span><i className="key key--cpu" />CPU</span>
          <span><i className="key key--gpu" />GPU</span>
        </div>}
        <p>Estimates from a simplified performance model using relative benchmark indices: guidance, not guarantees. Prices not included.</p>
      </footer>
    </div>
  );
}
