// Recognise a laptop or PC from a store link or pasted product text (title, spec list).
//
// The site has no server and browsers can't read other shops' pages, so nothing is fetched:
// store links (Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales, Tata CLiQ, brand stores)
// usually spell the specs out in the address, and the rest can be pasted as text.
import { catalog, cpus as desktopCpus, gpus as desktopGpus, laptopCpus, laptopGpus, powerVersions, ramKits, storages } from '../data';
import type { Cpu, Device, Gpu, MemType, RamKit, Resolution, Storage } from './types';

export type MatchStatus = 'found' | 'choose' | 'unsupported' | 'missing' | 'none';

export interface PartMatch<P> {
  status: MatchStatus;
  part?: P;
  /** For 'choose': the parts the text could mean. */
  candidates?: P[];
  /** The words in the listing this came from (or what was not recognised). */
  text?: string;
  /** True when a detail was not in the listing and a common default was used. */
  assumed?: boolean;
  note?: string;
}

export interface ListingResult {
  input: string;
  url?: string;
  /** Shop or brand, e.g. "Amazon", "Flipkart", "ASUS". */
  store?: string;
  /** Short link with no specs in it (amzn.in/d/..., fkrt.it/...): ask for the product title. */
  needsText: boolean;
  device?: Device;
  cpu: PartMatch<Cpu>;
  gpu: PartMatch<Gpu>;
  ram: PartMatch<RamKit>;
  storage: PartMatch<Storage>;
  resolution?: Resolution;
  refreshHz?: number;
  /** Product title words, for display. */
  title?: string;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const stores: [RegExp, string][] = [
  [/(^|\.)amazon\.|(^|\.)amzn\./, 'Amazon'],
  [/(^|\.)flipkart\.com$|(^|\.)fkrt\.it$/, 'Flipkart'],
  [/(^|\.)croma\.com$/, 'Croma'],
  [/(^|\.)reliancedigital\.in$/, 'Reliance Digital'],
  [/(^|\.)vijaysales\.com$/, 'Vijay Sales'],
  [/(^|\.)tatacliq\.com$/, 'Tata CLiQ'],
  [/(^|\.)mdcomputers\.in$/, 'MD Computers'],
  [/(^|\.)primeabgb\.com$/, 'PrimeABGB'],
  [/(^|\.)bestbuy\.com$/, 'Best Buy'],
  [/(^|\.)newegg\.com$/, 'Newegg'],
  [/(^|\.)asus\.com$/, 'ASUS'],
  [/(^|\.)lenovo\.com$/, 'Lenovo'],
  [/(^|\.)hp\.com$/, 'HP'],
  [/(^|\.)dell\.com$/, 'Dell'],
  [/(^|\.)acer\.com$/, 'Acer'],
  [/(^|\.)msi\.com$/, 'MSI'],
  [/(^|\.)samsung\.com$/, 'Samsung'],
  [/(^|\.)gigabyte\.com$/, 'Gigabyte'],
];
/** Shop or brand name for a link, e.g. "Flipkart". */
export function storeOf(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return stores.find(([re]) => re.test(host))?.[1];
  } catch {
    return undefined;
  }
}

/** Share links that only redirect: nothing about the product is in them. */
const shortLink = /^(amzn\.(in|to|eu|com)|a\.co|fkrt\.it|dl\.flipkart\.com|bit\.ly|tinyurl\.com)$/;

function readUrl(raw: string): { url?: string; store?: string; text: string; short: boolean } {
  const m = raw.trim().match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s]*/i);
  if (!m) return { text: raw, short: false };
  let u: URL;
  try {
    u = new URL(/^https?:/i.test(m[0]) ? m[0] : `https://${m[0]}`);
  } catch {
    return { text: raw, short: false };
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const store = stores.find(([re]) => re.test(host))?.[1];
  const short = shortLink.test(host) || (host.startsWith('amzn.') && /^\/d\//.test(u.pathname));
  // The product slug can sit before or after the product id (/dp/B0..., /p/itm..., /p/300857),
  // so read the whole path and drop id-like segments.
  let path = u.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep as is */
  }
  const slug = path.split('/').filter((seg) => !/^(dp|p|gp|product|ref=.*|[a-z0-9]{0,3}\d[a-z0-9]{5,})$/i.test(seg) && !/^ref=/i.test(seg)).join(' ');
  const words = [slug, u.searchParams.get('keywords') ?? '', u.searchParams.get('k') ?? ''].join(' ');
  const rest = raw.replace(m[0], ' ');
  return { url: u.toString(), store, text: `${words} ${rest}`, short };
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** Lowercase, words separated by single spaces; keeps "." in numbers like 15.6. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/(\d),(\d{3})\b/g, '$1$2')
    .replace(/[_+|/\\,;()[\]{}"“”:]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/(\d)\s*x\s*(\d)/g, '$1 x $2')
    .replace(/\s+/g, ' ')
    .trim();
}

const key = (name: string) => name.toLowerCase().replace(/\b(intel|amd)\b/g, '').replace(/[^a-z0-9]/g, '');
const allCpus = catalog.cpu as readonly Cpu[];
const cpuByKey = new Map(allCpus.map((c) => [key(c.name), c]));

function findCpu(t: string, device?: Device): PartMatch<Cpu> {
  // Exact models: "i7 11800h", "core ultra 7 155h", "core 5 210h", "ryzen 7 7800x3d", "i5 1135g7".
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/\b(?:core\s*)?ultra\s*([579])\s*(\d{3})\s*(hx|h|u|v|k|kf|f)?\b/, (m) => `coreultra${m[1]}${m[2]}${m[3] ?? ''}`],
    [/\b(?:core\s*)?i([3579])\s*(\d{4,5})\s*(g\d|hx|hk|hs|kf|ks|h|u|p|k|f|t)?\b/, (m) => `corei${m[1]}${m[2]}${m[3] ?? ''}`],
    [/\bcore\s*([357])\s*(\d{3})\s*(hx|h|u)\b/, (m) => `core${m[1]}${m[2]}${m[3]}`],
    [/\bryzen\s*([3579])\s*(?:pro\s*)?(\d{4})\s*(x3d|xt|x|g|ge|f|hx|hs|h|u)?\b/, (m) => `ryzen${m[1]}${m[2]}${m[3] ?? ''}`],
  ];
  for (const [re, toKey] of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const k = toKey(m);
    const cpu = cpuByKey.get(k);
    if (cpu) return { status: 'found', part: cpu, text: m[0] };
    const laptopish = /(hx|hk|hs|h|u|p|v|g\d)$/.test(k);
    return { status: 'unsupported', text: m[0], note: laptopish ? 'This laptop processor is not in our database yet (AMD Ryzen and some Intel P / G-series chips are coming).' : 'This processor is not in our database yet.' };
  }
  // "core i7 11th gen 11800h": tier and model number apart.
  const tierM = t.match(/\bi([3579])\b/);
  const bare = t.match(/\b(1[0-4]\d{2,3}|\d{4})\s*(g\d|hx|hk|hs|kf|ks|h|u|p|k|f)\b/);
  if (tierM && bare) {
    const cpu = cpuByKey.get(`corei${tierM[1]}${bare[1]}${bare[2]}`);
    if (cpu) return { status: 'found', part: cpu, text: `i${tierM[1]} ${bare[0]}` };
  }
  // Vague: "core i5 13th gen", "13th gen intel core i7".
  const vague = t.match(/\bi([3579])\s*(\d{1,2})(?:th|st|nd|rd)\s*gen\b/) ?? t.match(/\b(\d{1,2})(?:th|st|nd|rd)\s*gen\s*(?:intel\s*)?(?:core\s*)?i([3579])\b/);
  if (vague) {
    const [tier, gen] = /^\d{1,2}$/.test(vague[1]) && !/^[3579]$/.test(vague[1]) ? [vague[2], vague[1]] : [vague[1], vague[2]];
    const pool = device === 'desktop' ? desktopCpus : device === 'laptop' ? laptopCpus : allCpus;
    // A gaming laptop (separate graphics) won't have a 15-28 W U / V-series chip.
    const gaming = /\b(rtx|gtx|gaming)\b/.test(t);
    const candidates = pool.filter((c) => new RegExp(`^Core i${tier}-${gen}\\d{2,3}`).test(c.name) && !(gaming && /\d(U|G\d|V)$/.test(c.name)));
    if (candidates.length === 1) return { status: 'found', part: candidates[0], text: vague[0] };
    if (candidates.length) return { status: 'choose', candidates, text: vague[0], note: `"${vague[0]}" could be several processors. Check the spec sheet for the exact model.` };
    return { status: 'unsupported', text: vague[0] };
  }
  if (/\b(ryzen|athlon)\b/.test(t)) return { status: 'unsupported', text: 'AMD Ryzen', note: 'AMD Ryzen laptops are not in our database yet.' };
  if (/\b(apple|m[1-4] (pro|max|chip)|snapdragon|celeron|pentium|mediatek)\b/.test(t)) return { status: 'unsupported', text: t.match(/\b(apple|m[1-4] (pro|max|chip)|snapdragon|celeron|pentium|mediatek)\b/)![0], note: 'This kind of processor is not covered.' };
  return { status: 'missing' };
}

function findVram(t: string): number | undefined {
  const m =
    t.match(/\b(\d{1,2})\s*gb\s*(?:gddr\d\w*|graphics|vram|dedicated|video)\b/) ??
    t.match(/\b(?:rtx|gtx|rx|arc)\s*[ab]?\d{3,4}\s*(?:ti|super|xt|gre)?\s*(?:laptop\s*(?:gpu)?\s*)?(\d{1,2})\s*gb\b(?!\s*(?:ram|memory|ddr|lpddr|ssd))/) ??
    t.match(/\b(\d{1,2})\s*gb\s*(?:nvidia|geforce|rtx|gtx|amd radeon|radeon)\b/);
  return m ? Number(m[1]) : undefined;
}

function findGpu(t: string, device: Device | undefined, vram: number | undefined): PartMatch<Gpu> {
  const m = t.match(/\b(rtx|gtx)\s*(\d{4})\s*(ti|super)?\b/) ?? t.match(/\b(rx)\s*(\d{4})\s*(xt|gre)?\b/) ?? t.match(/\b(arc)\s*([ab]\d{3})\b/);
  if (!m) {
    if (/\b(integrated|iris xe|uhd graphics|intel graphics|arc graphics|radeon graphics|intel arc 1[34]0[tv])\b/.test(t)) return { status: 'none', text: 'integrated graphics' };
    return { status: 'missing' };
  }
  const brand = m[1].toUpperCase();
  const chip = `${brand} ${m[2].toUpperCase()}${m[3] ? ` ${m[3] === 'ti' ? 'Ti' : m[3] === 'super' ? 'Super' : m[3].toUpperCase()}` : ''}`;
  const laptop = device !== 'desktop';
  if (laptop) {
    const typical = laptopGpus.find((g) => g.typical && g.family === `${chip} Laptop`);
    if (typical) {
      const tgp = findTgp(t);
      if (tgp === undefined) return { status: 'found', part: typical, text: m[0], assumed: true, note: `Graphics power not listed: assumed ${typical.tgp} W, the most common. Check "Max graphics power" (TGP).` };
      const versions = powerVersions(typical);
      const nearest = versions.reduce((a, b) => (Math.abs(b.tgp! - tgp) < Math.abs(a.tgp! - tgp) ? b : a));
      return { status: 'found', part: nearest, text: `${m[0]} ${tgp} W` };
    }
    if (device === 'laptop') return { status: 'unsupported', text: m[0], note: 'This laptop graphics chip is not in our database yet.' };
  }
  const name = `GeForce ${chip}`.replace('GeForce RX', 'Radeon RX').replace('GeForce ARC', 'Arc');
  const variants = desktopGpus.filter((g) => g.name === name || g.name.startsWith(`${name} `) && /^\d+GB$/.test(g.name.slice(name.length + 1)));
  if (!variants.length) return { status: 'unsupported', text: m[0] };
  if (variants.length === 1) return { status: 'found', part: variants[0], text: m[0] };
  const byVram = vram !== undefined ? variants.filter((g) => g.vram === vram) : [];
  if (byVram.length === 1) return { status: 'found', part: byVram[0], text: `${m[0]} ${vram} GB` };
  return { status: 'choose', candidates: variants, text: m[0], note: 'This card comes with different memory sizes.' };
}

function findTgp(t: string): number | undefined {
  const m = t.match(/\b(\d{2,3})\s*w(?:att)?s?\s*(?:max\.?\s*)?(?:tgp|tdp graphics|graphics power|gpu power)\b/) ?? t.match(/\b(?:tgp|max(?:imum)? graphics power)\s*(?:of|up to|upto)?\s*(\d{2,3})\s*w\b/);
  return m ? Number(m[1]) : undefined;
}

function findStorage(t: string, cpu?: Cpu): { match: PartMatch<Storage>; rest: string } {
  const m = t.match(/\b(\d+(?:\.\d)?)\s*(gb|tb)\s*((?:(?:pcie|nvme|m\.?2|gen\s*\d|sata|pci e)\s*)*)(ssd|hdd|emmc)\b/);
  if (!m) return { match: { status: 'missing' }, rest: t };
  const gb = m[2] === 'tb' ? Number(m[1]) * 1000 : Number(m[1]);
  const kind = m[4] === 'hdd' ? 'HDD' : /sata/.test(m[3]) ? 'SATA SSD' : /gen\s*5/.test(m[3]) ? 'NVMe Gen5' : /gen\s*3/.test(m[3]) ? 'NVMe Gen3' : /gen\s*4/.test(m[3]) ? 'NVMe Gen4' : undefined;
  // Unstated SSD type: laptops from 2021 (Tiger Lake) on mostly ship PCIe 4.0 drives.
  const assumedKind = kind ?? (cpu && /Comet/.test(cpu.generation) ? 'NVMe Gen3' : 'NVMe Gen4');
  const pool = storages.filter((s) => s.kind === assumedKind);
  const part = [...(pool.length ? pool : storages)].sort((a, b) => Math.abs(Math.log(a.capacityGb / gb)) - Math.abs(Math.log(b.capacityGb / gb)))[0];
  return { match: { status: 'found', part, text: m[0], assumed: !kind && m[4] === 'ssd' }, rest: t.replace(m[0], ' ') };
}

function findRam(t: string, cpu?: Cpu): PartMatch<RamKit> {
  const sticksM = t.match(/\b([124])\s*x\s*(\d{1,2})\s*gb\b/) ?? t.match(/\b(\d{1,2})\s*gb\s*x\s*([124])\b/);
  let total: number | undefined;
  let sticks: number | undefined;
  if (sticksM) {
    const [a, b] = [Number(sticksM[1]), Number(sticksM[2])];
    [sticks, total] = /^\d{1,2}\s*gb/.test(sticksM[0]) ? [b, a * b] : [a, a * b];
  }
  const typeM = t.match(/\b(lp)?ddr\s*([45])x?\b/);
  const speedM = t.match(/\b(\d{4})\s*(?:mhz|mt\s*s|mts)\b/) ?? (typeM ? t.slice(t.indexOf(typeM[0])).match(/^(?:lp)?ddr\s*[45]x?\s*(\d{4})\b/) : null);
  if (total === undefined) {
    const m =
      t.match(/\b(\d{1,3})\s*gb\s*(?:(?:lp)?ddr\s*[45]x?\s*(?:\d{4}\s*(?:mhz|mt\s*s)?\s*)?)?(?:ram|memory)\b/) ??
      t.match(/\b(?:ram|memory)\s*(?:of\s*)?(\d{1,3})\s*gb\b/) ??
      t.match(/\b(\d{1,3})\s*gb\s*(?:lp)?ddr\s*[45]/) ??
      // Flipkart / Croma slugs: "16 gb 512 gb ssd" (storage already removed): a lone RAM-sized number.
      t.match(/\b(4|8|12|16|24|32|48|64|96|128)\s*gb\b/);
    if (m) total = Number(m[1]);
  }
  if (total === undefined) return { status: 'missing' };
  const lp = !!typeM?.[1];
  const type: MemType = typeM ? (`DDR${typeM[2]}` as MemType) : cpu?.memTypes.includes('DDR5') && (!cpu.memTypes.includes('DDR4') || /Raptor|Meteor|Lunar|Arrow/.test(cpu.generation)) ? 'DDR5' : 'DDR4';
  const speed = speedM ? Number(speedM[1]) : cpu?.maxMemSpeed[type] ?? (type === 'DDR5' ? 5600 : 3200);
  // Unstated stick count: 16 GB+ usually ships as two sticks, 8 GB as one.
  const stickGuess = sticks ?? (lp ? 2 : total >= 16 ? 2 : 1);
  const pool = ramKits.filter((k) => k.type === type && !!k.laptopOnly === lp && (lp || k.sticks === stickGuess) && k.totalGb === total);
  const ranked = [...(pool.length ? pool : ramKits.filter((k) => k.type === type))].sort(
    (a, b) => Math.abs(a.totalGb - total!) - Math.abs(b.totalGb - total!) || Math.abs(a.speed - (speed ?? a.speed)) - Math.abs(b.speed - (speed ?? b.speed)),
  );
  const part = ranked[0];
  if (!part) return { status: 'unsupported', text: `${total} GB` };
  const assumed = (sticks === undefined && !lp) || !typeM;
  const note = assumed ? `${sticks === undefined && !lp ? (stickGuess === 2 ? 'Assumed two sticks (dual-channel). ' : 'Assumed one stick; many budget laptops ship like this. ') : ''}${!typeM ? `Memory type not listed: assumed ${type}.` : ''}`.trim() : undefined;
  return { status: 'found', part, text: `${total} GB${typeM ? ` ${typeM[0].toUpperCase()}` : ''}`, assumed, note };
}

function findScreen(t: string): { resolution?: Resolution; refreshHz?: number } {
  let resolution: Resolution | undefined;
  if (/\b(4k|uhd|3840 x 2160|2160p|oled 4k)\b/.test(t)) resolution = '4K';
  else if (/\b(qhd|wqhd|wqxga|2\.5k|2560 x 1[46]00|1440p|1600p|3k|2880 x 1800|3200 x 2000)\b/.test(t)) resolution = '1440p';
  else if (/\b(fhd|full hd|1920 x 1080|1920 x 1200|1080p|wuxga)\b/.test(t)) resolution = '1080p';
  const hz = t.match(/\b(60|75|90|120|144|165|180|240|300|360)\s*hz\b/);
  return { resolution, refreshHz: hz ? Number(hz[1]) : undefined };
}

/** Read a store link and / or pasted product text into parts for the checker. */
export function parseListing(input: string, forceDevice?: Device): ListingResult {
  const { url, store, text, short } = readUrl(input);
  const t = normalise(text);
  let device: Device | undefined = forceDevice ??
    (/\b(laptop|notebook|ultrabook|2 in 1|chromebook|gaming laptop)\b/.test(t) ? 'laptop'
    : /\b(desktop|gaming pc|tower|all in one|mini pc|cabinet|prebuilt|pre built)\b/.test(t) ? 'desktop'
    : undefined);
  const cpu = findCpu(t, device);
  /** For memory and storage defaults: the found processor, or the first likely one. */
  const refCpu = cpu.part ?? cpu.candidates?.[0];
  if (!device && cpu.part) device = cpu.part.laptop ? 'laptop' : 'desktop';
  // A processor of the other kind than the forced device can't be used.
  if (forceDevice && cpu.part && !!cpu.part.laptop !== (forceDevice === 'laptop')) {
    cpu.status = 'unsupported';
    cpu.note = `${cpu.part.name} is a ${cpu.part.laptop ? 'laptop' : 'desktop'} processor.`;
    cpu.part = undefined;
  }
  if (!device && /\b\d{2}(\.\d)?\s*(inch|in|cm)\b/.test(t)) device = 'laptop';
  const vram = findVram(t);
  const gpu = findGpu(t, device, vram);
  if (!device && gpu.part) device = gpu.part.laptop ? 'laptop' : 'desktop';
  // Remove graphics memory and storage before reading RAM, so "6 GB graphics" or "512 GB SSD" isn't taken as RAM.
  const noVram = t
    .replace(/\b\d{1,2}\s*gb\s*(?:gddr\d\w*|graphics|vram|dedicated|video)\b/g, ' ')
    .replace(/\b((?:rtx|gtx|rx|arc)\s*[ab]?\d{3,4}\s*(?:ti|super|xt|gre)?\s*(?:laptop\s*(?:gpu)?\s*)?)\d{1,2}\s*gb\b(?!\s*(?:ram|memory|ddr|lpddr|ssd))/g, '$1')
    .replace(/\b\d{1,2}\s*gb\s*(nvidia|geforce|rtx|gtx|amd radeon|radeon)\b/g, '$1');
  const { match: storage, rest } = findStorage(noVram, refCpu);
  const ram = findRam(rest, refCpu);
  const screen = findScreen(t);
  return {
    input, url, store, needsText: (short || !!url) && cpu.status === 'missing' && gpu.status === 'missing',
    device, cpu, gpu, ram, storage, ...screen,
    title: url ? normalise(text).slice(0, 140) : undefined,
  };
}
