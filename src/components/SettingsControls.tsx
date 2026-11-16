import { PRESETS, presetNames, UPSCALING, upscalerName, upscalingNames } from '../engine/settings';
import type { GameSettings, Gpu } from '../engine/types';

/** Compact preset + upscaling switches for the results pages. */
export function SettingsControls({ settings, gpu, onChange }: { settings: GameSettings; gpu?: Gpu; onChange: (s: GameSettings) => void }) {
  return (
    <div className="settings-controls">
      <div className="seg-tabs" role="group" aria-label="Graphics preset">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={p === settings.preset} className={p === settings.preset ? 'seg-tab seg-tab--on' : 'seg-tab'} onClick={() => onChange({ ...settings, preset: p })}>
            {presetNames[p]}
          </button>
        ))}
      </div>
      <div className="seg-tabs" role="group" aria-label={`Upscaling (${upscalerName(gpu)})`}>
        {UPSCALING.map((u) => (
          <button key={u} type="button" aria-pressed={u === settings.upscaling} className={u === settings.upscaling ? 'seg-tab seg-tab--on' : 'seg-tab'} onClick={() => onChange({ ...settings, upscaling: u })}>
            {u === 'off' ? `${upscalerName(gpu)} off` : upscalingNames[u]}
          </button>
        ))}
      </div>
    </div>
  );
}
