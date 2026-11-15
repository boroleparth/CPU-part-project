import { powerVersions } from '../data';
import type { Gpu } from '../engine/types';

/**
 * Laptop graphics power (TGP): the same chip ships at different wattages, and the
 * higher ones are noticeably faster. Shown under the chosen laptop GPU.
 */
export function PowerPicker({ gpu, onPick }: { gpu: Gpu; onPick: (g: Gpu) => void }) {
  const versions = powerVersions(gpu);
  if (versions.length < 2) return null;
  return (
    <div className="power-pick">
      <span className="power-pick-label" id={`power-${gpu.family}`}>Graphics power</span>
      <div className="pills pills--small" role="group" aria-labelledby={`power-${gpu.family}`}>
        {versions.map((v) => (
          <button key={v.id} type="button" className={`pill-btn${v.id === gpu.id ? ' pill-btn--on' : ''}`} aria-pressed={v.id === gpu.id} onClick={() => onPick(v)}>
            {v.tgp} W
          </button>
        ))}
      </div>
      <span className="power-pick-hint">Listed as "Max graphics power" or TGP on the spec sheet.</span>
    </div>
  );
}
