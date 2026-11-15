/**
 * Parsing for Notebookcheck graphics-card pages (pure, no Node APIs, so tests can import it).
 *
 * A page has one block per game; each block has one row per setting ("high 1920x1080",
 * "QHD 2560x1440", ...) and, per row, the FPS measured on each tested laptop with its CPU.
 */

export interface NbcResult {
  fps: number;
  /** Laptop (or desktop system) model as named in the review. */
  system: string;
  cpu: string;
}
export interface NbcRow {
  game: string;
  /** Normalised preset: low / medium / high / ultra, or the raw label for anything else. */
  preset: string;
  /** "1920x1080" etc. */
  resolution: string;
  results: NbcResult[];
}

const strip = (s: string) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;|´/g, "'").replace(/\s+/g, ' ').trim();

/** Notebookcheck labels "low", "med.", "high", "ultra"; QHD and 4K rows use the highest preset. */
export function normalisePreset(label: string): string {
  const l = label.toLowerCase().trim();
  if (l === 'low') return 'low';
  if (l === 'med.' || l === 'medium') return 'medium';
  if (l === 'high') return 'high';
  if (l === 'ultra' || l === 'qhd' || l === '4k') return 'ultra';
  return l;
}

export function parseNotebookcheckGpuPage(html: string): NbcRow[] {
  const rows: NbcRow[] = [];
  for (const block of html.split('<div class="gpugame_surrounding"').slice(1)) {
    const h = block.match(/<h3 class="gpugame_header">([\s\S]*?)<\/h3>/);
    if (!h) continue;
    const game = strip(h[1]);
    for (const part of block.split('<div class="gpugame_details').slice(1)) {
      const head = part.match(/^[^>]*>\s*(?:<abbr[^>]*>)?\s*(?:<b>)?([^<]*?)(?:<\/b>)?\s*(\d{3,4}x\d{3,4})/);
      if (!head) continue;
      const results: NbcResult[] = [];
      const re = /class="gpugame_resulta"[^>]*>([\d.]+)<\/a>\s*<div id="gamebench_[^"]*" class="gpugame_benchdiv"[^>]*>([\s\S]*?)<\/div>/g;
      for (const m of part.matchAll(re)) {
        const fps = Number(m[1]);
        const system = strip(m[2].match(/font-style:italic;"><a [^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '');
        const cpu = m[2].split(/<br\s*>/).map(strip).find((l) => /\b(Intel|AMD|Apple|Qualcomm)\b/.test(l)) ?? '';
        if (Number.isFinite(fps) && fps > 0) results.push({ fps, system, cpu });
      }
      if (results.length) rows.push({ game, preset: normalisePreset(head[1]), resolution: head[2], results });
    }
  }
  return rows;
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
};
export const geomean = (xs: number[]) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
export const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
};

/** Our game ids -> Notebookcheck game names (newest version first) and the preset our profile assumes. */
export const nbcGames: Record<string, { names: string[]; preset: string }> = {
  cs2: { names: ['Counter-Strike 2'], preset: 'high' },
  valorant: { names: ['Valorant'], preset: 'high' },
  apex: { names: ['Apex Legends'], preset: 'high' },
  cod: { names: ['Call of Duty Black Ops 6', 'Call of Duty Black Ops 7'], preset: 'high' },
  rivals: { names: ['Marvel Rivals'], preset: 'high' },
  cyberpunk: { names: ['Cyberpunk 2077 2.2 Phantom Liberty', 'Cyberpunk 2077 2.0 Phantom Liberty', 'Cyberpunk 2077'], preset: 'high' },
  rdr2: { names: ['Red Dead Redemption 2'], preset: 'high' },
  bg3: { names: ["Baldur's Gate 3"], preset: 'ultra' },
  eldenring: { names: ['Elden Ring'], preset: 'high' },
};

// ---------------------------------------------------------------------------
// Calibration and accuracy maths (shared by calibrate-notebookcheck.ts and accuracy-report.ts)
// ---------------------------------------------------------------------------

/** Rows that measure the graphics chip, not the CPU: high/ultra at 1080p, high/ultra at 1440p and 4K. */
export const gpuBound = (r: NbcRow) =>
  r.resolution === '1920x1080' ? r.preset === 'high' || r.preset === 'ultra' : ['ultra', 'high'].includes(r.preset) && /^(2560x1440|2560x1600|3840x2160)$/.test(r.resolution);
export const rowKey = (r: NbcRow) => `${r.game}|${r.preset}|${r.resolution}`;

/** Median FPS per GPU-bound row (under 200 FPS, where frame-rate caps and CPU limits start to show). */
export function rowMedians(rows: NbcRow[], keep: (r: NbcRow) => boolean = () => true): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!gpuBound(r) || !keep(r)) continue;
    const m = median(r.results.map((x) => x.fps));
    if (m < 200) out.set(rowKey(r), m);
  }
  return out;
}

/**
 * A laptop chip's rasterIndex from its FPS, via desktop reference cards measured in the same rows:
 * geometric mean of (laptop / desktop FPS) x desktop rasterIndex, weighted by shared rows.
 */
export function fitRaster(chip: Map<string, number>, desktops: { raster: number; fps: Map<string, number> }[], minShared = 4) {
  let w = 0;
  let logSum = 0;
  for (const d of desktops) {
    const ratios: number[] = [];
    for (const [k, f] of chip) {
      const df = d.fps.get(k);
      if (df) ratios.push(f / df);
    }
    if (ratios.length < minShared) continue;
    logSum += ratios.length * Math.log(geomean(ratios) * d.raster);
    w += ratios.length;
  }
  return w ? { raster: Math.exp(logSum / w), rows: w } : undefined;
}

export interface ChipError {
  /** Rows the chip was compared in. */
  rows: number;
  /** Mean absolute error, e.g. 0.08 = predictions off by 8% on average. */
  meanAbs: number;
  /** Signed overall bias: +0.1 = model rates the chip 10% too fast. */
  bias: number;
}

/**
 * Relative accuracy: in each row (same game, version, preset, resolution) the chips' predicted
 * speeds are scaled by one common factor to best fit the measured FPS; what remains is each
 * chip's error relative to the others. Scene differences between sources cancel out.
 */
export function relativeErrors(measured: Map<string, Map<string, number>>, predicted: Record<string, number>, minChips = 3): Map<string, ChipError> {
  const byRow = new Map<string, { chip: string; m: number; p: number }[]>();
  for (const [chip, rows] of measured) {
    const p = predicted[chip];
    if (!p) continue;
    for (const [k, m] of rows) byRow.set(k, [...(byRow.get(k) ?? []), { chip, m, p }]);
  }
  const logs = new Map<string, number[]>();
  for (const entries of byRow.values()) {
    if (entries.length < minChips) continue;
    const k = geomean(entries.map((e) => e.m / e.p));
    for (const e of entries) logs.set(e.chip, [...(logs.get(e.chip) ?? []), Math.log((k * e.p) / e.m)]);
  }
  const out = new Map<string, ChipError>();
  for (const [chip, l] of logs) {
    out.set(chip, {
      rows: l.length,
      meanAbs: Math.exp(l.reduce((a, x) => a + Math.abs(x), 0) / l.length) - 1,
      bias: Math.exp(l.reduce((a, x) => a + x, 0) / l.length) - 1,
    });
  }
  return out;
}

/** Row-weighted summary of chip errors. */
export function summarise(errors: Map<string, ChipError>) {
  const all = [...errors.values()];
  const rows = all.reduce((a, e) => a + e.rows, 0);
  const meanAbs = all.reduce((a, e) => a + e.meanAbs * e.rows, 0) / rows;
  const worst = [...errors.entries()].sort((a, b) => Math.abs(b[1].bias) - Math.abs(a[1].bias))[0];
  return { chips: all.length, rows, meanAbs, medianBias: median(all.map((e) => Math.abs(e.bias))), worst };
}
