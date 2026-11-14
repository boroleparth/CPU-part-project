import { games } from '../data/games';
import { checkCompatibility, estimatePowerDraw, recommendedPsuWatts } from './compatibility';
import { simulateGames, type GameResult } from './games';
import { limitReport } from './limits';
import { evaluateBuild, type BuildEvaluation } from './simulation';
import type { Build, Resolution, WorkloadId } from './types';
import { workloadById } from './workloads';

export type Side = 'a' | 'b';

export interface SideSummary {
  evaluation: BuildEvaluation;
  errors: number;
  games: GameResult[];
  power: number;
  psuNeeded: number;
  /** Bottleneck per workload ("CPU", "GPU", … or null when balanced). */
  bottlenecks: Record<string, string | null>;
  /** A bottleneck that actually costs performance (not just a GPU-limited build with spare CPU). */
  harmful: string | null;
}

/** GPU-limited is how a gaming PC should be; these parts holding things back cost real performance. */
const HARMFUL = ['CPU', 'VRAM', 'RAM', 'Power supply', 'Storage'];

export interface Comparison {
  a: SideSummary;
  b: SideSummary;
  /** Geometric-mean FPS ratio B/A across the games (1 = same). Undefined without gaming. */
  fpsRatio?: number;
  /** Which build to recommend, or null when they are effectively equal. */
  winner: Side | null;
  /** Short reason for the recommendation. */
  reason?: string;
  /** One or two short sentences. */
  lines: string[];
}

function summarize(build: Build, workloads: WorkloadId[], res: Resolution, hz: number, gaming: boolean): SideSummary {
  const evaluation = evaluateBuild(build, workloads, res);
  const bottlenecks: Record<string, string | null> = {};
  for (const r of evaluation.results) {
    const rep = limitReport(build, r, res);
    bottlenecks[r.workload] = rep.ideal ? null : rep.bottleneck;
  }
  const harmful = Object.values(bottlenecks).find((b) => b && HARMFUL.includes(b)) ?? null;
  return {
    evaluation,
    harmful,
    errors: checkCompatibility(build).filter((i) => i.severity === 'error').length,
    games: gaming && build.cpu ? simulateGames(build, games, res, hz) : [],
    power: estimatePowerDraw(build),
    psuNeeded: recommendedPsuWatts(build),
    bottlenecks,
  };
}

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

export function compareBuilds(a: Build, b: Build, workloads: WorkloadId[], res: Resolution, hz: number): Comparison {
  const gaming = workloads.some((id) => workloadById[id].kind === 'gaming');
  const A = summarize(a, workloads, res, hz, gaming);
  const B = summarize(b, workloads, res, hz, gaming);

  let fpsRatio: number | undefined;
  if (A.games.length && B.games.length) {
    const logs = A.games.map((g, i) => Math.log(Math.max(B.games[i].fps, 0.1) / Math.max(g.fps, 0.1)));
    fpsRatio = Math.exp(logs.reduce((s, x) => s + x, 0) / logs.length);
  }

  const lines: string[] = [];
  let winner: Side | null = null;
  let reason: string | undefined;
  const name = (x: Side) => `Build ${x.toUpperCase()}`;
  if (A.errors || B.errors) {
    if (A.errors && !B.errors) winner = 'b';
    if (B.errors && !A.errors) winner = 'a';
    lines.push(A.errors && B.errors ? 'Both builds have parts that don’t fit together.' : `Build ${A.errors ? 'A' : 'B'} has parts that don’t fit together.`);
    if (winner) reason = 'all its parts fit';
  } else {
    const scoreGap = B.evaluation.overall - A.evaluation.overall;
    const faster: Side | null = fpsRatio === undefined || Math.abs(fpsRatio - 1) < 0.03 ? null : fpsRatio > 1 ? 'b' : 'a';
    if (fpsRatio !== undefined) {
      if (!faster) lines.push('About the same speed in games.');
      else lines.push(`${name(faster)} is ~${pct(fpsRatio > 1 ? fpsRatio - 1 : 1 / fpsRatio - 1)} faster in games.`);
    }
    if (Math.abs(scoreGap) >= 5) lines.push(`${name(scoreGap > 0 ? 'b' : 'a')} is better balanced (${Math.round(Math.max(A.evaluation.overall, B.evaluation.overall))} vs ${Math.round(Math.min(A.evaluation.overall, B.evaluation.overall))}).`);
    else lines.push('Both are similarly balanced.');

    // 1. A build with a real bottleneck loses to one without.
    if (A.harmful && !B.harmful) { winner = 'b'; reason = `Build A has a ${A.harmful} bottleneck`; }
    else if (B.harmful && !A.harmful) { winner = 'a'; reason = `Build B has a ${B.harmful} bottleneck`; }
    // 2. Otherwise the faster build (at least 5% faster) wins.
    else if (faster && Math.abs(fpsRatio! - 1) >= 0.05) { winner = faster; reason = A.harmful ? 'faster' : 'faster, with nothing holding it back'; }
    // 3. Otherwise the clearly better balanced one.
    else if (Math.abs(scoreGap) >= 5) { winner = scoreGap > 0 ? 'b' : 'a'; reason = 'better balanced'; }
  }
  return { a: A, b: B, fpsRatio, winner, reason, lines };
}
