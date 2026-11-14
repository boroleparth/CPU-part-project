import type { Tone } from '../engine/simulation';
import { brandNames, tierNames, type BrandKey, type TierLevel } from '../ui';

/** Ordinal tier: four pips, filled up to the level, plus the name. */
export function TierBadge({ level }: { level: TierLevel }) {
  return (
    <span className={`tier-badge tier-badge--${level}`} title={`${tierNames[level]} class`}>
      <span className="pips" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => <i key={i} className={i <= level ? 'on' : ''} />)}
      </span>
      {tierNames[level]}
    </span>
  );
}

export function BrandTag({ brand }: { brand: BrandKey }) {
  return <span className={`brand-tag brand-tag--${brand}`}><i aria-hidden="true" />{brandNames[brand]}</span>;
}

const toneIcon: Record<Tone, string> = { good: '✓', warning: '!', serious: '▲', critical: '✕' };
export const toneText: Record<Tone, string> = { good: 'Balanced', warning: 'Minor imbalance', serious: 'Bottlenecked', critical: 'Badly mismatched' };

export function StatusPill({ tone, children }: { tone: Tone; children?: React.ReactNode }) {
  return (
    <span className={`pill pill--${tone}`}>
      <span aria-hidden="true">{toneIcon[tone]}</span> {children ?? toneText[tone]}
    </span>
  );
}

/** Circular gauge for a 0–100 score, colored by its status. */
export function ScoreRing({ score, tone, size = 112, label }: { score: number; tone: Tone; size?: number; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, score));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Score'} ${Math.round(v)} out of 100, ${toneText[tone]}`}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle cx="50" cy="50" r={r} className={`ring-value ring-value--${tone}`} strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ring-num">{Math.round(v)}</span>
    </div>
  );
}
