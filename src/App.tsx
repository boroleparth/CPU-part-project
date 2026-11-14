import { useEffect, useMemo, useState } from 'react';
import { AutoBuilder } from './components/AutoBuilder';
import { WorkloadControls } from './components/Controls';
import { HowItWorks } from './components/HowItWorks';
import { PartPicker } from './components/PartPicker';
import { Results } from './components/Results';
import { checkCompatibility } from './engine/compatibility';
import { suggest } from './engine/recommend';
import { evaluateBuild } from './engine/simulation';
import type { Build, PartSlot, WorkloadId } from './engine/types';
import { decodeState, defaultState, encodeState, exampleBuild, type AppState } from './state';

type Tab = 'build' | 'auto' | 'how';

function initialState(): AppState {
  try {
    return decodeState(window.location.hash) ?? defaultState();
  } catch {
    return defaultState();
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [tab, setTab] = useState<Tab>('build');
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [copied, setCopied] = useState(false);
  const { build, workloads, resolution } = state;

  // Keep the URL in sync so a build can be shared by copying the link.
  useEffect(() => {
    try {
      window.history.replaceState(null, '', `#${encodeState(state)}`);
    } catch {
      /* sandboxed frames may block history access */
    }
  }, [state]);

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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">◎</span>
          <div>
            <h1>PC Harmony</h1>
            <p className="muted small">Find PC parts that work together — without one holding the others back.</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {([['build', 'Build & simulate'], ['auto', 'Auto-build'], ['how', 'How it works']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'tab tab--on' : 'tab'} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab !== 'how' && (
        <WorkloadControls
          selected={workloads}
          resolution={resolution}
          onToggle={toggleWorkload}
          onResolution={(r) => setState((s) => ({ ...s, resolution: r }))}
        />
      )}

      {tab === 'build' && (
        <main className="layout">
          <aside className="card picker">
            <div className="picker-head">
              <h2 className="section-title">Your parts</h2>
              <label className="toggle small">
                <input type="checkbox" checked={onlyCompatible} onChange={(e) => setOnlyCompatible(e.target.checked)} />
                Only show compatible parts
              </label>
            </div>
            <PartPicker build={build} issues={issues} onlyCompatible={onlyCompatible} onChange={setPart} />
            <div className="picker-actions">
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setState((s) => ({ ...s, build: exampleBuild() }))}>Load example</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setState((s) => ({ ...s, build: {} }))}>Clear all</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={copyLink}>{copied ? 'Link copied ✓' : 'Copy share link'}</button>
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
              setTab('build');
              window.scrollTo({ top: 0 });
            }}
          />
        </main>
      )}

      {tab === 'how' && <main><HowItWorks /></main>}

      <footer className="footer muted small">
        Estimates from a simplified performance model using relative benchmark indices — guidance, not guarantees.
      </footer>
    </div>
  );
}
