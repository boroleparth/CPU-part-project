import { useEffect, useRef, useState } from 'react';
import type { FpsPoint } from '../engine/simulation';
import type { Resolution } from '../engine/types';
import { componentLabels, type Component } from '../engine/workloads';

const niceMax = (v: number) => {
  // Multiples of 4 so the five gridlines land on round numbers.
  const steps = [40, 60, 80, 100, 120, 160, 200, 240, 320, 400, 480, 600, 800, 1000, 1200];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 500) * 500;
};

/**
 * Dumbbell chart: per resolution, the CPU's frame-rate ceiling and the GPU's
 * ceiling, joined by a line. The gap is the bottleneck; the dark tick is the
 * frame rate you actually get.
 */
export function FpsChart({ points, judged }: { points: FpsPoint[]; judged: Resolution }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real container width so text stays readable on phones (no SVG scaling).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = niceMax(Math.max(...points.flatMap((p) => [p.cpuFps, p.gpuFps])) * 1.05);
  const rowH = 44;
  const left = W < 400 ? 48 : 64;
  const right = 16;
  const top = 8;
  const H = top + points.length * rowH + 28;
  const x = (v: number) => left + (v / max) * (W - left - right);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * max));

  return (
    <figure className="chart">
      <div className="legend" aria-hidden="true">
        <span><i className="dot dot--cpu" /> CPU limit</span>
        <span><i className="dot dot--gpu" /> GPU limit</span>
        <span><i className="tick" /> What you get</span>
      </div>
      <div className="chart-wrap" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Frame-rate ceilings of CPU and GPU at each resolution" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top} y2={H - 24} className="grid" />
              <text x={x(t)} y={H - 8} className="axis-label" textAnchor="middle">{t}</text>
            </g>
          ))}
          {points.map((p, i) => {
            const cy = top + i * rowH + rowH / 2;
            const lo = Math.min(p.cpuFps, p.gpuFps);
            const hi = Math.max(p.cpuFps, p.gpuFps);
            const active = p.resolution === judged;
            return (
              <g key={p.resolution} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} className={active ? 'row row--active' : 'row'}>
                <rect x={0} y={cy - rowH / 2} width={W} height={rowH} className="hit" />
                <text x={left - 10} y={cy + 4} textAnchor="end" className={active ? 'row-label row-label--active' : 'row-label'}>{p.resolution}</text>
                <line x1={x(lo)} x2={x(hi)} y1={cy} y2={cy} className="connector" />
                <circle cx={x(p.cpuFps)} cy={cy} r={6} className="mark mark--cpu" />
                <circle cx={x(p.gpuFps)} cy={cy} r={6} className="mark mark--gpu" />
                <line x1={x(p.fps)} x2={x(p.fps)} y1={cy - 11} y2={cy + 11} className="result-tick" />
                {active && <text x={x(p.fps)} y={cy - 15} textAnchor="middle" className="value-label">{Math.round(p.fps)} FPS</text>}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ top: top + (hover + 1) * rowH }} role="status">
            <strong>{points[hover].resolution}</strong>
            <div><i className="dot dot--cpu" /> CPU limit <b>{Math.round(points[hover].cpuFps)} FPS</b></div>
            <div><i className="dot dot--gpu" /> GPU limit <b>{Math.round(points[hover].gpuFps)} FPS</b></div>
            <div>You get <b>~{Math.round(points[hover].fps)} FPS</b> ({points[hover].limitedBy.toUpperCase()}-limited)</div>
          </div>
        )}
      </div>
      <figcaption className="muted">Frames per second (average, high settings). The longer the line, the more one part waits on the other.</figcaption>
      <details className="table-view">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th>Resolution</th><th>CPU limit</th><th>GPU limit</th><th>Result</th><th>Limited by</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.resolution}><td>{p.resolution}</td><td>{Math.round(p.cpuFps)}</td><td>{Math.round(p.gpuFps)}</td><td>{Math.round(p.fps)}</td><td>{p.limitedBy.toUpperCase()}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars: share of the job's time spent on each part. */
export function TimeShareChart({ share, weakest }: { share: Partial<Record<Component, number>>; weakest: Component }) {
  const rows = (Object.keys(share) as Component[]).sort((a, b) => share[b]! - share[a]!);
  return (
    <figure className="chart">
      <div className="bars" role="img" aria-label="Share of job time per component">
        {rows.map((c) => (
          <div className="bar-row" key={c} title={`${componentLabels[c]}: ${Math.round(share[c]! * 100)}% of the time`}>
            <span className={c === weakest ? 'bar-label bar-label--weak' : 'bar-label'}>{componentLabels[c]}</span>
            <span className="bar-track">
              <span className={c === weakest ? 'bar bar--weak' : 'bar'} style={{ width: `${Math.max(share[c]! * 100, 1.5)}%` }} />
            </span>
            <span className="bar-value">{Math.round(share[c]! * 100)}%</span>
          </div>
        ))}
      </div>
      <figcaption className="muted">Where the job's time goes. A part taking far more time than the others is the bottleneck.</figcaption>
    </figure>
  );
}
