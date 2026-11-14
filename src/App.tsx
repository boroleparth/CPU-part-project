import { useEffect, useMemo, useState } from 'react';
import { PartBrowser } from './components/PartBrowser';
import { slotLabels, slotOrder } from './data';
import { games } from './data/games';
import { completeBuild } from './engine/builder';
import { checkCompatibility } from './engine/compatibility';
import { simulateGames } from './engine/games';
import { suggest } from './engine/recommend';
import { evaluateBuild } from './engine/simulation';
import type { Build, PartSlot, WorkloadId } from './engine/types';
import { workloadById } from './engine/workloads';
import { Dashboard } from './pages/Results';
import { ComparePage } from './pages/Compare';
import { MonitorPage, PartsPage, PurposePage } from './pages/Setup';
import { decodeState, defaultState, encodeState, type AppState } from './state';
import { partSummary } from './ui';

type PageId = 'purpose' | 'monitor' | 'parts' | 'dashboard' | 'compare';
const resultPages: PageId[] = ['dashboard', 'compare'];
const pageNames: Record<PageId, string> = { purpose: 'Purpose', monitor: 'Monitor', parts: 'Parts', dashboard: 'Results', compare: 'Compare' };

/** The four parts people choose; the rest are matched to them automatically. */
const mainSlots: PartSlot[] = ['cpu', 'gpu', 'ram', 'storage'];
const onlyMain = (b: Build): Build => ({ cpu: b.cpu, gpu: b.gpu, ram: b.ram, storage: b.storage });

function initial(): { state: AppState; page: PageId } {
  try {
    const decoded = decodeState(window.location.hash);
    if (decoded) {
      // Fill any parts the link doesn't include, so a partial link still opens a complete build.
      const fill = (b: Build) => (b.cpu ? completeBuild(b) : b);
      return {
        state: { ...decoded, build: fill(decoded.build), compare: decoded.compare && fill(decoded.compare) },
        page: decoded.compare ? 'compare' : 'dashboard',
      };
    }
  } catch {
    /* fall through */
  }
  return { state: { ...defaultState(), build: {}, workloads: [] }, page: 'purpose' };
}

export default function App() {
  const [boot] = useState(initial);
  const [state, setState] = useState<AppState>(boot.state);
  const [page, setPage] = useState<PageId>(boot.page);
  const [browsing, setBrowsing] = useState<PartSlot | null>(null);
  /** Which build the part browser edits: the main one (A) or the comparison (B). */
  const [browseSide, setBrowseSide] = useState<'a' | 'b'>('a');
  const [copied, setCopied] = useState<'' | 'link' | 'list'>('');
  const { build, workloads, resolution, refreshHz } = state;
  const gaming = workloads.some((id) => workloadById[id].kind === 'gaming');

  const pages = useMemo<PageId[]>(
    () => (['purpose', gaming && 'monitor', 'parts', 'dashboard'] as (PageId | false)[]).filter(Boolean) as PageId[],
    [gaming],
  );
  const index = Math.max(0, pages.indexOf(page));
  const isResult = resultPages.includes(page);

  const issues = useMemo(() => checkCompatibility(build), [build]);
  const evaluation = useMemo(() => evaluateBuild(build, workloads, resolution), [build, workloads, resolution]);
  const suggestions = useMemo(() => (isResult ? suggest(build, evaluation.results, resolution) : []), [isResult, build, evaluation, resolution]);

  // Result pages live in the URL, so copying the address shares the exact build.
  useEffect(() => {
    if (!isResult) return;
    try {
      window.history.replaceState(null, '', `#${encodeState(state)}`);
    } catch {
      /* sandboxed frames may block history access */
    }
  }, [state, page, isResult]);

  const go = (p: PageId) => {
    if (p === 'dashboard' && !resultPages.includes(page)) setState((s) => ({ ...s, build: completeBuild(s.build) }));
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  const next = () => pages[index + 1] && go(pages[index + 1]);
  const back = () => pages[index - 1] && go(pages[index - 1]);

  const canNext = page === 'purpose' ? workloads.length > 0 : page === 'parts' ? !!build.cpu : true;
  const nextLabel = page === 'parts' ? 'Check my build' : isResult ? '' : 'Next';

  const toggleWorkload = (id: WorkloadId) =>
    setState((s) => ({ ...s, workloads: s.workloads.includes(id) ? s.workloads.filter((w) => w !== id) : [...s.workloads, id] }));

  const pick = (slot: PartSlot, part: Build[PartSlot] | undefined) =>
    setState((s) => {
      let b: Build = { ...s.build, [slot]: part };
      if (slot === 'cpu' && b.cpu && b.ram && !b.cpu.memTypes.includes(b.ram.type)) b.ram = undefined;
      // On the results pages, keep the build complete: re-match the supporting parts.
      if (isResult && mainSlots.includes(slot)) b = completeBuild(b);
      const chosen = part ? [...new Set([...s.chosen, slot])] : s.chosen.filter((c) => c !== slot);
      return { ...s, build: b, chosen: chosen.filter((c) => b[c]) };
    });

  const pickCompare = (slot: PartSlot, part: Build[PartSlot] | undefined) =>
    setState((s) => {
      let b: Build = { ...(s.compare ?? s.build), [slot]: part };
      if (slot === 'cpu' && b.cpu && b.ram && !b.cpu.memTypes.includes(b.ram.type)) b.ram = undefined;
      if (mainSlots.includes(slot)) b = completeBuild(b);
      return { ...s, compare: b };
    });

  const openCompare = () => {
    setState((s) => ({ ...s, compare: s.compare ?? { ...s.build } }));
    go('compare');
  };
  const closeCompare = () => {
    setState((s) => ({ ...s, compare: undefined }));
    go('dashboard');
  };
  const openBrowser = (side: 'a' | 'b', slot: PartSlot) => {
    setBrowseSide(side);
    setBrowsing(slot);
  };

  const partsListText = () => {
    const lines = [`PC Harmony build: ${Math.round(evaluation.overall)}/100`, ''];
    for (const slot of slotOrder) {
      const part = build[slot];
      lines.push(`${slotLabels[slot]}: ${part ? `${part.name} (${partSummary(slot, part)})` : slot === 'gpu' ? 'Integrated graphics' : '—'}`);
    }
    if (gaming && build.cpu) {
      lines.push('', `Games at ${resolution}, ${refreshHz} Hz:`);
      for (const g of simulateGames(build, games, resolution, refreshHz)) lines.push(`• ${g.game.name}: ~${Math.round(g.fps)} FPS`);
    }
    lines.push('', window.location.href);
    return lines.join('\n');
  };

  const copy = async (what: 'link' | 'list') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? window.location.href : partsListText());
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const startOver = () => {
    setState({ ...defaultState(), build: {}, workloads: [], chosen: [] });
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* ignore */
    }
    setPage('purpose');
    window.scrollTo({ top: 0 });
  };

  // In the parts step (and for the four main parts later) the browser ignores the auto-matched
  // board etc., so any CPU can be picked and the platform follows it.
  const target = browseSide === 'b' && state.compare ? state.compare : build;
  let browserBuild = browsing && (!isResult || mainSlots.includes(browsing)) ? onlyMain(target) : target;
  // When choosing a CPU, RAM is re-matched afterwards, so it must not hide CPUs of another memory type.
  if (browsing === 'cpu') browserBuild = { ...browserBuild, ram: undefined };

  return (
    <div className={isResult ? 'app app--wide' : 'app'}>
      <header className="topbar">
        <button type="button" className="brand" onClick={startOver} aria-label="PC Harmony, start over">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="7" className="logo-bg" /><path d="M9 20.5c2.2-5.5 4.4-8 7-8s4.8 2.5 7 8" className="logo-wave" /><circle cx="16" cy="12.5" r="2.2" className="logo-dot" /></svg>
          <span>PC Harmony</span>
        </button>
        {isResult && (
          <span className="top-actions">
            {page === 'dashboard' && <button type="button" className="btn btn--ghost btn--small" onClick={openCompare}>Compare with another build</button>}
            {page === 'compare' && <button type="button" className="link-btn" onClick={closeCompare}>← Back to results</button>}
            <button type="button" className={`link-btn${page === 'compare' ? ' hide-sm' : ''}`} onClick={() => go('purpose')}>Edit answers</button>
            <button type="button" className="link-btn" onClick={startOver}>Start over</button>
          </span>
        )}
      </header>

      {!isResult && (
        <>
          <nav className="progress" aria-label={`Step ${index + 1} of ${pages.length}: ${pageNames[page]}`}>
            {pages.map((p, i) => (
              <span key={p} className={`progress-seg${i < index ? ' done' : i === index ? ' on' : ''}${resultPages.includes(p) ? ' result' : ''}`} />
            ))}
          </nav>
          <p className="progress-label">{pageNames[page]}</p>
        </>
      )}

      <main className="page" key={page}>
        {page === 'purpose' && <PurposePage selected={workloads} onToggle={toggleWorkload} />}
        {page === 'monitor' && (
          <MonitorPage
            resolution={resolution}
            refreshHz={refreshHz}
            onResolution={(r) => setState((s) => ({ ...s, resolution: r }))}
            onRefresh={(hz) => setState((s) => ({ ...s, refreshHz: hz }))}
          />
        )}
        {page === 'parts' && <PartsPage build={build} onOpen={(slot) => openBrowser('a', slot)} />}
        {page === 'dashboard' && (
          <Dashboard
            build={build}
            evaluation={evaluation}
            issues={issues}
            suggestions={suggestions}
            resolution={resolution}
            refreshHz={refreshHz}
            gaming={gaming}
            chosen={state.chosen}
            copied={copied}
            onOpen={(slot) => openBrowser('a', slot)}
            onApply={(s) => setState((st) => ({ ...st, build: { ...st.build, ...s.changes }, chosen: [...new Set([...st.chosen, ...(Object.keys(s.changes) as PartSlot[])])] }))}
            onCopy={copy}
            onCompare={openCompare}
          />
        )}
        {page === 'compare' && state.compare && (
          <ComparePage
            a={build}
            b={state.compare}
            workloads={workloads}
            resolution={resolution}
            refreshHz={refreshHz}
            onOpen={openBrowser}
            onSwap={() => setState((s) => ({ ...s, build: s.compare!, compare: s.build, chosen: mainSlots.filter((m) => s.compare![m]) }))}
            onUseB={() => {
              setState((s) => ({ ...s, build: s.compare!, compare: undefined, chosen: mainSlots.filter((m) => s.compare![m]) }));
              go('dashboard');
            }}
          />
        )}
      </main>

      {!isResult && <div className="page-nav">
        {index > 0 ? <button type="button" className="btn btn--ghost" onClick={back}>Back</button> : <span />}
        {nextLabel && <button type="button" className="btn btn--big" disabled={!canNext} onClick={next}>{nextLabel}</button>}
      </div>}

      {browsing && (
        <PartBrowser
          slot={browsing}
          build={browserBuild}
          workloads={workloads}
          resolution={resolution}
          onPick={(part) => {
            if (browseSide === 'b' && page === 'compare') pickCompare(browsing, part);
            else pick(browsing, part);
            setBrowsing(null);
          }}
          onClose={() => setBrowsing(null)}
        />
      )}
    </div>
  );
}
