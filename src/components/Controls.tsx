import type { Resolution, WorkloadId } from '../engine/types';
import { workloads } from '../engine/workloads';
import { RESOLUTIONS } from '../engine/simulation';

interface Props {
  selected: WorkloadId[];
  resolution: Resolution;
  onToggle: (id: WorkloadId) => void;
  onResolution: (r: Resolution) => void;
}

/** "What will you use this PC for?" — multi-select workloads plus target resolution. */
export function WorkloadControls({ selected, resolution, onToggle, onResolution }: Props) {
  const anyGaming = selected.some((id) => workloads.find((w) => w.id === id)?.kind === 'gaming');
  return (
    <div className="controls">
      <fieldset className="chips">
        <legend>What will you use this PC for? <span className="muted small">(pick one or more)</span></legend>
        {workloads.map((w) => {
          const on = selected.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              className={on ? 'chip chip--on' : 'chip'}
              aria-pressed={on}
              title={w.description}
              onClick={() => onToggle(w.id)}
            >
              {on && <span aria-hidden="true">✓ </span>}{w.name}
            </button>
          );
        })}
      </fieldset>
      <fieldset className="segmented" disabled={!anyGaming}>
        <legend>Monitor resolution {!anyGaming && <span className="muted small">(gaming only)</span>}</legend>
        {RESOLUTIONS.map((r) => (
          <button key={r} type="button" className={r === resolution ? 'seg seg--on' : 'seg'} aria-pressed={r === resolution} onClick={() => onResolution(r)}>
            {r}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
