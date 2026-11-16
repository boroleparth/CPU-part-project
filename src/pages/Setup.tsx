import { REFRESH_RATES } from '../engine/games';
import { RESOLUTIONS } from '../engine/simulation';
import type { Build, Device, Gpu, PartSlot, Resolution, WorkloadId } from '../engine/types';
import { SlotIcon } from '../components/Icons';
import { PowerPicker } from '../components/PowerPicker';
import { partSummary } from '../ui';

export const purposeLabels: Record<WorkloadId, string> = {
  aaa: 'AAA games',
  esports: 'Esports',
  raytracing: 'Ray tracing',
  streaming: 'Streaming',
  video: 'Video editing',
  render3d: '3D rendering',
  ai: 'Local AI',
  office: 'Everyday',
};

const purposeIcons: Record<WorkloadId, React.ReactNode> = {
  aaa: <path d="M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5.2 2L14 14h-4l-1.8 2A3 3 0 0 1 3 14v-2a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" />,
  esports: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  raytracing: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  streaming: <><circle cx="12" cy="12" r="2" /><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  render3d: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  ai: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>,
  office: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></>,
};

const deviceIcons: Record<Device, React.ReactNode> = {
  desktop: <><rect x="3" y="4" width="13" height="10" rx="1.5" /><path d="M7 18h5M9.5 14v4M19 4v14M19 8h2M19 12h2" /></>,
  laptop: <><rect x="5" y="5" width="14" height="10" rx="1.5" /><path d="M2 19h20l-2-4H4z" /></>,
};
const deviceText: Record<Device, { name: string; hint: string }> = {
  desktop: { name: 'Desktop PC', hint: 'Choose the parts' },
  laptop: { name: 'Laptop', hint: 'Check a model' },
};

export function DevicePage({ device, onPick, onLink }: { device: Device; onPick: (d: Device) => void; onLink: () => void }) {
  return (
    <>
      <h1 className="page-title">What are you checking?</h1>
      <p className="page-sub">A desktop you're building or a laptop you're buying.</p>
      <div className="tiles tiles--2">
        {(['desktop', 'laptop'] as Device[]).map((d) => (
          <button key={d} type="button" className={`tile tile--tall${d === device ? ' tile--on' : ''}`} aria-pressed={d === device} onClick={() => onPick(d)}>
            <svg className="tile-icon" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {deviceIcons[d]}
            </svg>
            <span className="tile-big">{deviceText[d].name}</span>
            <span className="tile-small">{deviceText[d].hint}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link-cta" onClick={onLink}>
        <span><b>Have a store link?</b> Paste an Amazon, Flipkart, Croma… link or the product specs and we'll read the parts for you.</span>
        <span aria-hidden="true">→</span>
      </button>
    </>
  );
}

const purposeOrder: WorkloadId[] = ['aaa', 'esports', 'raytracing', 'streaming', 'video', 'render3d', 'ai', 'office'];

export function PurposePage({ selected, onToggle }: { selected: WorkloadId[]; onToggle: (id: WorkloadId) => void }) {
  return (
    <>
      <h1 className="page-title">What's it for?</h1>
      <p className="page-sub">Pick one or more.</p>
      <div className="tiles tiles--4">
        {purposeOrder.map((id) => {
          const on = selected.includes(id);
          return (
            <button key={id} type="button" className={`tile${on ? ' tile--on' : ''}`} aria-pressed={on} onClick={() => onToggle(id)}>
              <svg className="tile-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {purposeIcons[id]}
              </svg>
              <span>{purposeLabels[id]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

const resNames: Record<Resolution, string> = { '1080p': 'Full HD', '1440p': 'Quad HD', '4K': 'Ultra HD' };

export function MonitorPage(props: { device: Device; resolution: Resolution; refreshHz: number; onResolution: (r: Resolution) => void; onRefresh: (hz: number) => void }) {
  const { device, resolution, refreshHz, onResolution, onRefresh } = props;
  return (
    <>
      <h1 className="page-title">{device === 'laptop' ? 'The screen you play on' : 'Your monitor'}</h1>
      <p className="page-sub">{device === 'laptop' ? 'The laptop screen, or a monitor you plug in. 1600p counts as 1440p.' : 'Resolution and refresh rate.'}</p>
      <div className="tiles tiles--3">
        {RESOLUTIONS.map((r) => (
          <button key={r} type="button" className={`tile tile--tall${r === resolution ? ' tile--on' : ''}`} aria-pressed={r === resolution} onClick={() => onResolution(r)}>
            <span className="tile-big">{r}</span>
            <span className="tile-small">{resNames[r]}</span>
          </button>
        ))}
      </div>
      <div className="pills" role="group" aria-label="Refresh rate">
        {REFRESH_RATES.map((hz) => (
          <button key={hz} type="button" className={`pill-btn${hz === refreshHz ? ' pill-btn--on' : ''}`} aria-pressed={hz === refreshHz} onClick={() => onRefresh(hz)}>
            {hz} Hz
          </button>
        ))}
      </div>
    </>
  );
}

const mainSlots: { slot: PartSlot; label: string }[] = [
  { slot: 'cpu', label: 'Processor' },
  { slot: 'gpu', label: 'Graphics card' },
  { slot: 'ram', label: 'Memory' },
  { slot: 'storage', label: 'Storage' },
];

export function PartsPage({ device, build, onOpen, onPower }: { device: Device; build: Build; onOpen: (slot: PartSlot) => void; onPower: (g: Gpu) => void }) {
  const laptop = device === 'laptop';
  return (
    <>
      <h1 className="page-title">{laptop ? "The laptop's specs" : 'Your parts'}</h1>
      <p className="page-sub">{laptop ? 'From the listing or spec sheet.' : "We'll match the rest."}</p>
      <ul className="pick-list">
        {mainSlots.map(({ slot, label }) => {
          const part = build[slot];
          return (
            <li key={slot}>
              <button type="button" className={`pick${part ? ' pick--set' : ''}`} onClick={() => onOpen(slot)}>
                <span className="pick-icon"><SlotIcon slot={slot} size={24} /></span>
                <span className="pick-body">
                  <span className="pick-label">{label}</span>
                  <b>{part ? part.name : 'Choose'}</b>
                  {part && <span className="pick-spec">{partSummary(slot, part)}</span>}
                </span>
                <span className="pick-action">{part ? 'Change' : '+'}</span>
              </button>
              {slot === 'gpu' && build.gpu?.laptop && <PowerPicker gpu={build.gpu} onPick={onPower} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
