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
