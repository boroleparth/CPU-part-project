import { useEffect, useRef, useState } from 'react';
import { bookmarkletHref } from '../bookmarklet';
import { PowerPicker } from '../components/PowerPicker';
import { SlotIcon } from '../components/Icons';
import { REFRESH_RATES } from '../engine/games';
import { parseListing, type ListingResult, type PartMatch } from '../engine/listing';
import { RESOLUTIONS } from '../engine/simulation';
import type { Build, Device, Gpu, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { partSummary, type AnyPart } from '../ui';
import { purposeLabels } from './Setup';

const examples: { label: string; text: string }[] = [
  { label: 'Flipkart link', text: 'https://www.flipkart.com/asus-tuf-gaming-f15-core-i7-11th-gen-11800h-16-gb-512-gb-ssd-windows-11-home-6-gb-graphics-nvidia-geforce-rtx-3060-144-hz-fx506hm-hn095w-gaming-laptop/p/itm6f3e8e3d1c1a0' },
  { label: 'Croma link', text: 'https://www.croma.com/hp-victus-15-fa1351tx-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-ssd-windows-11-nvidia-geforce-rtx-4050-6gb-15-6-inch-fhd-ips-display-144hz-mica-silver-/p/300857' },
  { label: 'Pasted specs', text: 'Lenovo Legion Pro 7i Gen 9, Intel Core i9-14900HX, NVIDIA GeForce RTX 4080 12GB GDDR6, 175W TGP, 32GB (2x16GB) DDR5 5600MHz, 1TB PCIe Gen4 SSD, 16" WQXGA 240Hz' },
];

const slotRows: { slot: PartSlot; label: string; key: 'cpu' | 'gpu' | 'ram' | 'storage' }[] = [
  { slot: 'cpu', label: 'Processor', key: 'cpu' },
  { slot: 'gpu', label: 'Graphics', key: 'gpu' },
  { slot: 'ram', label: 'Memory', key: 'ram' },
  { slot: 'storage', label: 'Storage', key: 'storage' },
];

const purposeOrder: WorkloadId[] = ['aaa', 'esports', 'raytracing', 'streaming', 'video', 'render3d', 'ai', 'office'];

function statusOf(m: PartMatch<AnyPart> | undefined, current: AnyPart | undefined, slot: PartSlot): { tone: string; label: string } {
  if (current && m?.part && current !== m.part) return { tone: 'good', label: 'Chosen by you' };
  if (current && !m?.part) return { tone: 'good', label: 'Chosen by you' };
  if (!m) return { tone: 'muted', label: 'Not checked' };
  switch (m.status) {
    case 'found': return m.assumed ? { tone: 'warning', label: 'Found, partly assumed' } : { tone: 'good', label: 'Found' };
    case 'choose': return { tone: 'warning', label: 'Pick one' };
    case 'unsupported': return { tone: 'critical', label: 'Not in our database' };
    case 'none': return { tone: 'good', label: slot === 'gpu' ? 'Integrated only' : 'None' };
    default: return { tone: 'muted', label: 'Not in the listing' };
  }
}

export interface LinkPageProps {
  /** Text handed over by the bookmark button: recognised straight away. */
  initialText?: string;
  device: Device;
  build: Build;
  workloads: WorkloadId[];
  resolution: Resolution;
  refreshHz: number;
  onRecognise: (r: ListingResult) => void;
  onOpen: (slot: PartSlot) => void;
  onPick: (slot: PartSlot, part: AnyPart) => void;
  onPower: (g: Gpu) => void;
  onToggleWorkload: (id: WorkloadId) => void;
  onResolution: (r: Resolution) => void;
  onRefresh: (hz: number) => void;
  onAnalyse: () => void;
}

/** "Check a link": paste a store link or the product text, check what was recognised, analyse. */
export function LinkPage(props: LinkPageProps) {
  const { initialText, device, build, workloads, resolution, refreshHz, onRecognise, onOpen, onPick, onPower, onToggleWorkload, onResolution, onRefresh, onAnalyse } = props;
  const [input, setInput] = useState(initialText ?? '');
  const bookmark = useRef<HTMLAnchorElement>(null);
  const [result, setResult] = useState<ListingResult | null>(null);
  /** The user confirmed there is no separate graphics card (when the listing didn't say). */
  const [noGpu, setNoGpu] = useState(false);

  const recognise = (text: string, force?: Device) => {
    if (!text.trim()) return;
    const r = parseListing(text, force);
    setResult(r);
    setNoGpu(false);
    onRecognise(r);
  };

  useEffect(() => {
    if (initialText) recognise(initialText);
    // React blocks javascript: links in JSX, so the bookmark's address is set on the element directly.
    bookmark.current?.setAttribute('href', bookmarkletHref(window.location.origin + window.location.pathname));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unresolved = result?.cpu.status === 'choose' && !build.cpu;
  // Graphics the listing didn't mention must be chosen (or confirmed absent), not silently treated as none.
  const gpuOpen = result?.gpu.status === 'missing' && !build.gpu && !noGpu;
  const someMissing = !!result && ([result.cpu, result.gpu, result.ram, result.storage] as PartMatch<AnyPart>[]).some((m) => m.status === 'missing');
  const canAnalyse = !!build.cpu && workloads.length > 0 && !gpuOpen;

  return (
    <>
      <h1 className="page-title">Check a link</h1>
      <p className="page-sub">Paste a product link from any store (Amazon, Flipkart, Croma, Reliance Digital, brand sites…) or the product title and specs.</p>

      <form className="link-form" onSubmit={(e) => { e.preventDefault(); recognise(input); }}>
        <label htmlFor="link-input" className="sr-only">Product link or text</label>
        <textarea
          id="link-input"
          className="link-input"
          rows={3}
          placeholder="https://www.flipkart.com/asus-tuf-gaming-f15-core-i7-11800h-… or paste the product title"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (text) setTimeout(() => recognise(text), 0);
          }}
        />
        <div className="link-actions">
          <button type="submit" className="btn" disabled={!input.trim()}>Recognise</button>
          <span className="link-try">Try:</span>
          {examples.map((ex) => (
            <button key={ex.label} type="button" className="link-btn" onClick={() => { setInput(ex.text); recognise(ex.text); }}>{ex.label}</button>
          ))}
        </div>
        <p className="fineprint">Nothing is downloaded from the store: the specs are read from the link itself or from the text you paste.</p>
      </form>

      <details className="bookmark-box">
        <summary><b>Link missing details?</b> Read the whole product page with one click</summary>
        <div className="bookmark-body">
          <p>Store links often leave out the exact processor or graphics; the product page's spec section has them. Add this button to your bookmarks once:</p>
          <p className="bookmark-row">
            <a ref={bookmark} className="btn btn--ghost bookmark-btn" href="#" onClick={(e) => e.preventDefault()} draggable>Check in PC Harmony</a>
            <span>Drag it to your bookmarks bar (Ctrl+Shift+B / ⌘+Shift+B shows the bar).</span>
          </p>
          <p>Then open any laptop or PC on Amazon, Flipkart, Croma or a brand site and click the bookmark: it reads the title and spec table from the page you're on, in your own browser, and opens this page with everything filled in.</p>
          <p className="fineprint">On a phone: open the product page, select and copy the "Specifications" section, and paste it in the box above.</p>
        </div>
      </details>

      {result && (
        <section className="link-result" aria-label="What we found">
          {result.needsText ? (
            <p className="link-note link-note--warning">
              {result.store ? `This ${result.store} link` : 'This link'} doesn't include the specs. Open it, copy the product title or the spec list, and paste it above.
            </p>
          ) : (
            <>
              <div className="link-head">
                <span>{result.store ? `From ${result.store}` : 'From your text'}</span>
                <div className="seg-tabs" role="group" aria-label="Laptop or desktop">
                  {(['laptop', 'desktop'] as Device[]).map((d) => (
                    <button key={d} type="button" className={d === device ? 'seg-tab seg-tab--on' : 'seg-tab'} aria-pressed={d === device} onClick={() => d !== device && recognise(input || result.input, d)}>
                      {d === 'laptop' ? 'Laptop' : 'Desktop'}
                    </button>
                  ))}
                </div>
              </div>

              {someMissing && result.url && (
                <p className="link-note">Some specs aren't in this link. Paste the product title or spec list after the link in the box above and press Recognise again, or choose them below.</p>
              )}
              <ul className="pick-list">
                {slotRows.map(({ slot, label, key }) => {
                  const m = result[key] as PartMatch<AnyPart>;
                  const part = build[slot];
                  const st = statusOf(m, part, slot);
                  return (
                    <li key={slot}>
                      <div className={`pick pick--set lrow lrow--${st.tone}`}>
                        <span className="pick-icon"><SlotIcon slot={slot} size={24} /></span>
                        <span className="pick-body">
                          <span className="pick-label">{label} <span className={`lstatus lstatus--${st.tone}`}>{st.label}</span></span>
                          <b>{part ? part.name : slot === 'gpu' && (m.status === 'none' || m.status === 'missing') ? (m.status === 'none' || noGpu ? 'Integrated graphics' : 'Not found') : m.status === 'unsupported' ? m.text : m.status === 'choose' ? 'Which one?' : 'Not found'}</b>
                          {part && <span className="pick-spec">{partSummary(slot, part)}</span>}
                          {m.note && !(part && part !== m.part) && <span className="pick-spec">{m.note}</span>}
                          {slot === 'gpu' && m.status === 'missing' && !part && (
                            <span className="lchoices">
                              <button type="button" className={`pill-btn${noGpu ? ' pill-btn--on' : ''}`} aria-pressed={noGpu} onClick={() => setNoGpu(!noGpu)}>It has no separate graphics</button>
                            </span>
                          )}
                          {m.status === 'choose' && m.candidates && !part && (
                            <span className="lchoices">
                              {m.candidates.map((c) => <button key={c.id} type="button" className="pill-btn" onClick={() => onPick(slot, c)}>{c.name}</button>)}
                            </span>
                          )}
                        </span>
                        <button type="button" className="pick-action link-btn" onClick={() => onOpen(slot)}>{part ? 'Change' : 'Choose'}</button>
                      </div>
                      {slot === 'gpu' && build.gpu?.laptop && <PowerPicker gpu={build.gpu} onPick={onPower} />}
                    </li>
                  );
                })}
              </ul>

              <details className="read-box">
                <summary>What we read</summary>
                <p>{result.read}</p>
              </details>

              <div className="link-section">
                <h2 className="section-label">Screen</h2>
                <div className="pills pills--small" role="group" aria-label="Resolution">
                  {RESOLUTIONS.map((r) => <button key={r} type="button" className={`pill-btn${r === resolution ? ' pill-btn--on' : ''}`} aria-pressed={r === resolution} onClick={() => onResolution(r)}>{r}</button>)}
                </div>
                <div className="pills pills--small" role="group" aria-label="Refresh rate">
                  {REFRESH_RATES.map((hz) => <button key={hz} type="button" className={`pill-btn${hz === refreshHz ? ' pill-btn--on' : ''}`} aria-pressed={hz === refreshHz} onClick={() => onRefresh(hz)}>{hz} Hz</button>)}
                </div>
              </div>

              <div className="link-section">
                <h2 className="section-label">What's it for?</h2>
                <div className="pills pills--small" role="group" aria-label="Uses">
                  {purposeOrder.map((id) => <button key={id} type="button" className={`pill-btn${workloads.includes(id) ? ' pill-btn--on' : ''}`} aria-pressed={workloads.includes(id)} onClick={() => onToggleWorkload(id)}>{purposeLabels[id]}</button>)}
                </div>
              </div>

              <div className="page-nav">
                <span className="fineprint">{!build.cpu ? (unresolved ? 'Pick the processor to continue.' : 'A processor is needed to continue.') : gpuOpen ? 'Choose the graphics, or confirm it has none.' : !workloads.length ? 'Pick at least one use.' : ''}</span>
                <button type="button" className="btn btn--big" disabled={!canAnalyse} onClick={onAnalyse}>Analyse</button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
