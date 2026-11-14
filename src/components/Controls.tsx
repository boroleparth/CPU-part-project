import type { Resolution, WorkloadId } from '../engine/types';
import { workloadById } from '../engine/workloads';
import { RESOLUTIONS } from '../engine/simulation';

interface Props {
  selected: WorkloadId[];
  resolution: Resolution;
  onToggle: (id: WorkloadId) => void;
  onResolution: (r: Resolution) => void;
}

const groups: { label: string; ids: WorkloadId[] }[] = [
  { label: 'Gaming', ids: ['aaa', 'esports', 'raytracing', 'streaming'] },
  { label: 'Creating & AI', ids: ['video', 'render3d', 'ai'] },
  { label: 'Everyday', ids: ['office'] },
];

/** "What will you use this PC for?": grouped multi-select workloads plus target resolution. */
export function WorkloadControls({ selected, resolution, onToggle, onResolution }: Props) {
  const anyGaming = selected.some((id) => workloadById[id].kind === 'gaming');
  return (
    <section className="controls" aria-label="Use case">
      <div className="controls-main">
        <h2 className="controls-title">What will you use this PC for? <span className="muted small">Pick one or more</span></h2>
        <div className="chip-groups">
          {groups.map((g) => (
            <div className="chip-group" role="group" aria-label={g.label} key={g.label}>
              <span className="chip-group-label">{g.label}</span>
              <div className="chips">
                {g.ids.map((id) => {
                  const w = workloadById[id];
                  const on = selected.includes(id);
                  return (
                    <button key={id} type="button" className={on ? 'chip chip--on' : 'chip'} aria-pressed={on} title={w.description} onClick={() => onToggle(id)}>
                      <span className="chip-check" aria-hidden="true">{on ? '✓' : '+'}</span>{w.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="res-picker">
        <span className="chip-group-label">Monitor resolution</span>
        <div className={`segmented${anyGaming ? '' : ' segmented--off'}`} role="group" aria-label="Monitor resolution">
          {RESOLUTIONS.map((r) => (
            <button key={r} type="button" disabled={!anyGaming} className={r === resolution ? 'seg seg--on' : 'seg'} aria-pressed={r === resolution} onClick={() => onResolution(r)}>
              {r}
            </button>
          ))}
        </div>
        {!anyGaming && <span className="muted tiny">Only matters for gaming</span>}
      </div>
    </section>
  );
}
