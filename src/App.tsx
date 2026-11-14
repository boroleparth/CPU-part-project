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
import { BuildPage, GamesPage, VerdictPage } from './pages/Results';
import { MonitorPage, PartsPage, PurposePage } from './pages/Setup';
import { decodeState, defaultState, encodeState, type AppState } from './state';
import { partSummary } from './ui';

type PageId = 'purpose' | 'monitor' | 'parts' | 'verdict' | 'games' | 'build';
const resultPages: PageId[] = ['verdict', 'games', 'build'];
const pageNames: Record<PageId, string> = { purpose: 'Purpose', monitor: 'Monitor', parts: 'Parts', verdict: 'Analysis', games: 'Games', build: 'Build' };

/** The four parts people choose; the rest are matched to them automatically. */
const mainSlots: PartSlot[] = ['cpu', 'gpu', 'ram', 'storage'];
const onlyMain = (b: Build): Build => ({ cpu: b.cpu, gpu: b.gpu, ram: b.ram, storage: b.storage });

function initial(): { state: AppState; page: PageId } {
  try {
    const decoded = decodeState(window.location.hash);
    if (decoded) {
      const p = new URLSearchParams(window.location.hash.slice(1)).get('p') as PageId | null;
      return { state: decoded, page: p && resultPages.includes(p) ? p : 'verdict' };
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
  const [copied, setCopied] = useState<'' | 'link' | 'list'>('');
  const { build, workloads, resolution, refreshHz } = state;
  const gaming = workloads.some((id) => workloadById[id].kind === 'gaming');

  const pages = useMemo<PageId[]>(
    () => (['purpose', gaming && 'monitor', 'parts', 'verdict', gaming && 'games', 'build'] as (PageId | false)[]).filter(Boolean) as PageId[],
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
      window.history.replaceState(null, '', `#${encodeState(state)}&p=${page}`);
    } catch {
      /* sandboxed frames may block history access */
    }
  }, [state, page, isResult]);

  const go = (p: PageId) => {
    if (p === 'verdict' && !resultPages.includes(page)) setState((s) => ({ ...s, build: completeBuild(s.build) }));
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  const next = () => pages[index + 1] && go(pages[index + 1]);
  const back = () => pages[index - 1] && go(pages[index - 1]);

  const canNext = page === 'purpose' ? workloads.length > 0 : page === 'parts' ? !!build.cpu : true;
  const nextLabel = page === 'parts' ? 'Check my build' : page === 'build' ? '' : isResult ? `Next: ${pageNames[pages[index + 1]]}` : 'Next';

  const toggleWorkload = (id: WorkloadId) =>
    setState((s) => ({ ...s, workloads: s.workloads.includes(id) ? s.workloads.filter((w) => w !== id) : [...s.workloads, id] }));

  const pick = (slot: PartSlot, part: Build[PartSlot] | undefined) =>
    setState((s) => {
      let b: Build = { ...s.build, [slot]: part };
      if (slot === 'cpu' && b.cpu && b.ram && !b.cpu.memTypes.includes(b.ram.type)) b.ram = undefined;
      // On the results pages, keep the build complete: re-match the supporting parts.
      if (isResult && mainSlots.includes(slot)) b = completeBuild(b);
      return { ...s, build: b };
    });

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
    setState({ ...defaultState(), build: {}, workloads: [] });
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
  const browserBuild = browsing && (!isResult || mainSlots.includes(browsing)) ? onlyMain(build) : build;

  return (
    <div className={page === 'verdict' ? 'app app--wide' : 'app'}>
      <header className="topbar">
        <button type="button" className="brand" onClick={startOver} aria-label="PC Harmony, start over">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="7" className="logo-bg" /><path d="M9 20.5c2.2-5.5 4.4-8 7-8s4.8 2.5 7 8" className="logo-wave" /><circle cx="16" cy="12.5" r="2.2" className="logo-dot" /></svg>
          <span>PC Harmony</span>
        </button>
        {isResult && <button type="button" className="link-btn" onClick={startOver}>Start over</button>}
      </header>

      <nav className="progress" aria-label={`Step ${index + 1} of ${pages.length}: ${pageNames[page]}`}>
        {pages.map((p, i) => (
          <span key={p} className={`progress-seg${i < index ? ' done' : i === index ? ' on' : ''}${resultPages.includes(p) ? ' result' : ''}`} />
        ))}
      </nav>
      <p className="progress-label">{pageNames[page]}</p>

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
        {page === 'parts' && <PartsPage build={build} onOpen={setBrowsing} />}
        {page === 'verdict' && <VerdictPage build={build} evaluation={evaluation} issues={issues} resolution={resolution} />}
        {page === 'games' && <GamesPage build={build} resolution={resolution} refreshHz={refreshHz} />}
        {page === 'build' && (
          <BuildPage
            build={build}
            issues={issues}
            suggestions={suggestions}
            copied={copied}
            onOpen={setBrowsing}
            onApply={(s) => setState((st) => ({ ...st, build: { ...st.build, ...s.changes } }))}
            onCopy={copy}
          />
        )}
      </main>

      <div className="page-nav">
        {index > 0 ? <button type="button" className="btn btn--ghost" onClick={back}>Back</button> : <span />}
        {nextLabel && <button type="button" className="btn btn--big" disabled={!canNext} onClick={next}>{nextLabel}</button>}
      </div>

      {browsing && (
        <PartBrowser
          slot={browsing}
          build={browserBuild}
          workloads={workloads}
          resolution={resolution}
          onPick={(part) => {
            pick(browsing, part);
            setBrowsing(null);
          }}
          onClose={() => setBrowsing(null)}
        />
      )}
    </div>
  );
}
