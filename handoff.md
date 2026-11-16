# Handoff: PC Harmony

**Live site:** https://boroleparth.github.io/CPU-part-project/
**Repo:** `boroleparth/CPU-part-project` (default branch `main`). Work happens on `claude/amazing-knuth-1e53v3`
and is pushed to `main`; every push to `main` runs the tests and deploys to GitHub Pages (about a minute).

> **This file is where all summaries go.** At the end of each working session, add an entry at the top of
> [Session log](#session-log) (newest first) and update [Status](#status) and [Next to-do plan](#next-to-do-plan).

---

## Status

*Last updated: 16 Nov 2026*

PC Harmony checks how well a **desktop PC or a laptop** will work before you buy it: whether the parts are
balanced (no part holding the others back), how fast it is in 10 popular games, and what to change.

| Area | State |
|---|---|
| Desktop checker | Done: questions → dashboard → compare. 192 CPUs, 98 GPUs, boards, RAM, storage, coolers, PSUs, cases |
| Laptop checker | Done: 93 laptop CPUs (54 Intel, 39 AMD Ryzen), 28 NVIDIA laptop GPUs in 2–5 power versions each |
| Check a link | Done: store links (Flipkart, Croma, Amazon, Reliance Digital, Vijay Sales, brand sites) or pasted specs; "Check in PC Harmony" bookmark reads the whole product page |
| Benchmarks | Desktop CPU multi/single: PassMark (sourced). GPU local AI: llama.cpp (sourced). Laptop GPUs: Notebookcheck (calibrated). Desktop gaming/raster/RT and all laptop CPUs: estimates |
| Accuracy | Laptop GPUs 12.2% average error vs ~8,000 real measurements (noise floor ~10%). 5 games refitted to measured FPS (measured ÷ model 0.87–1.04) |
| Tests | 295 passing (`npm test`) |
| Deployed | Yes, `main` = live site |

**Open decisions for the user**
- Add a separate **"How well it runs"** speed grade next to the balance score? (Balance 100 can read as "best
  laptop" when it means "nothing wasted".) Proposed, not decided.
- RAM target for AAA games stays **32 GB** (16 GB laptops show RAM in amber/red). The user's own laptop fills
  16 GB quickly, which supports keeping it.

---

## Next to-do plan

In priority order. "Needs" says what has to come from the user or outside this repo.

| # | Task | Why | Effort | Needs |
|---|---|---|---|---|
| 1 | **Source laptop CPUs from PassMark:** run `npm run bench:import` on the PassMark pages saved on the home computer (`data/sources/2026-11-15/`) | All 93 laptop CPUs (incl. the new AMD ones) are still estimates; they are already in the import list | Small | The home computer (pages are git-ignored, so only there) |
| 2 | **Real failing links → tests:** collect store links that misread, add each to `listing.test.ts`, extend `seriesHints` in `src/engine/listing.ts` (HP OMEN 16-wd0, Victus 16, ASUS TUF FX507, ROG Strix G16, Legion 5i …) | Croma / Amazon listings often only say "i5 13th Gen"; the model-code table resolves them | Small per link | Links from the user; "What we read" box shows what the reader saw |
| 3 | **Accuracy parameters 1, 2, 6** (see list below): memory pressure, 1% lows, CPU main-thread load | Real laptops rarely show "GPU 100% busy"; RAM / VRAM overflow lowers GPU usage and causes stutter | Medium | – |
| 4 | **Accuracy parameters 3, 4, 5:** settings preset + DLSS question, laptop cooling / chassis / age, MUX switch | Large FPS effects the model doesn't see yet | Medium | – |
| 5 | **Desktop GPU corrections:** apply the Notebookcheck cross-check (desktop RTX 5070 ~8% low; RTX 3070 / 4090 ~9–11% high), and source desktop gaming / raster / RT (Tom's Hardware GPU hierarchy is reachable from the cloud session; TechPowerUp needs browser screenshots) | Desktop gaming indices are still estimates | Medium | Screenshots only if TechPowerUp is used |
| 6 | **Remaining game profiles:** Valorant, Apex, Marvel Rivals (≤9 Notebookcheck measurements), Fortnite (none) | Still estimates; Apex looks ~35% low, Valorant ~25% high | Small | More measured data |
| 7 | **User's own laptop as reference tests** (accuracy parameter 7): MSI Afterburner numbers from the ASUS TUF F15 2021 | First real measured laptop reference | Small | Game, settings, avg FPS, GPU %, CPU %, RAM / VRAM used, power mode |
| 8 | **Quality-of-life** (agreed list, not started): browser Back button, keep answers on refresh, undo after Apply, forgiving search (`i5 13600k`, `4070s`), saved builds, light/dark switch, keyboard navigation | Things that feel broken / missing in daily use | Small–medium | – |
| 9 | **Phones:** "Share to PC Harmony" (installable web app with a share target) so the Amazon / Flipkart app's Share sends the title straight in | The bookmark button is computer-only | Medium | – |
| 10 | **Coverage gaps:** Radeon laptop GPUs (RX 7600S etc.), Intel P-series, laptop model presets ("ASUS TUF F15 2021" fills all specs), Threadripper / Xeon, pre-2017 parts | Rare in India; lower priority | Medium | – |
| 11 | **Prices (INR) and budget mode** | Value suggestions ("₹X more for Y% more FPS"); user deprioritised it | Medium | A price source |

**Accuracy parameters (agreed list, from the user's real-world feedback)**
1. Memory pressure: Windows (~4 GB) + background apps + game RAM, and VRAM overflow into RAM → GPU shows
   60–80% busy instead of 100%, lower FPS, stutter.
2. 1% lows (stutter) next to average FPS.
3. Game settings preset (Low–Ultra) and upscaling (DLSS / FSR) as a question.
4. Laptop shared power and cooling budget; thin vs thick chassis; age (thermal throttling).
5. MUX switch / Advanced Optimus (5–15% FPS without one).
6. CPU main-thread load instead of "total CPU %" (Task Manager averages all threads).
7. Real measured reference points as tests.

---

## Session log

### 15–16 Nov 2026: laptops, real benchmarks, Check a link, AMD

**Laptop mode** (`a65e666`)
- New first question: desktop or laptop. Laptop mode: CPU, graphics (+ power picker), RAM, storage; no
  board / cooler / PSU / case; suggestions become "Choose a laptop with …", "Look for the 130 W version",
  "Add a second memory stick", "Choose the 32 GB version" (soldered memory).
- 53 Intel laptop CPUs, 26 NVIDIA laptop GPUs; laptop RAM (SO-DIMM, LPDDR5X), 256 / 512 GB drives.

**Grading fixes from testing 16 market laptops** (`2f5ba5f`, `d61e9fe`)
- One memory stick caps the gaming grade at 85, under 16 GB at 70 (a budget laptop with one 8 GB stick
  scored 100 before). Integrated graphics use shared system memory (not a fixed 2 GB).
- VRAM / RAM shortfalls now cap the grade and the verdict names them ("Graphics memory is too small:
  6 GB of ~8 GB"). The user's ASUS TUF F15 (i7-11800H, RTX 3060 95 W, 16 GB) went from 90 to 75 for AAA,
  matching their experience (low GPU usage, RAM filling up).

**Measured benchmarks**
- PassMark CPU Mark / single-thread for 191 desktop CPUs and llama.cpp AI speeds for 53 GPUs (done on the
  home computer, `acd67a0`).
- **Notebookcheck calibration** (`d8ab0ca`, kept in `1c6045b` after a separate-branch trial): 28 laptop GPUs
  compared with 13 desktop cards in identical game / preset / resolution rows (~8,000 measurements).
  Laptop GPU error 15.3% → 12.2%; no chip off by more than 5% (9 of 26 were off by 10%+). The power formula
  `(W / W_ref)^0.4` matches the fastest 10% of tested laptops within a few percent.
- **Accuracy report** `npm run bench:accuracy` (`9c84b5f`): relative error per chip, out-of-sample check
  (fit on half the games, judge on the other half: 12.4%), absolute FPS per game, desktop cross-check.
- **Game profiles refitted** (`fca1c75`): Cyberpunk 1.40× → 0.98×, Baldur's Gate 3 1.53× → 1.04×,
  RDR2 1.59× → 1.02×, CS2 0.75× → 0.87×, CoD 1.00× (measured ÷ model). The user's laptop: Cyberpunk
  41 → 59 FPS at 1080p High (Notebookcheck laptops with that chip: ~69–73, mostly at higher power).

**Check a link** (`b6f8995`, `7f8e8c0`, `bb9d13e`)
- Paste a store link or product text; parts are read from the link's own words (nothing is downloaded:
  Amazon, Flipkart, Croma and Reliance Digital block server downloads; tested). Each part shows Found /
  partly assumed / Pick one / Not in our database and stays editable; results link back to the listing.
- "Check in PC Harmony" bookmark: reads the title and spec table of the product page in the user's own
  browser and opens Check a link (URL hash only, cleared after reading).
- Spec-table parsing (Flipkart "Processor Variant", Amazon "Hard Disk Size" …); model-code hints for 10 popular
  series (LOQ 15IRX9, Victus 15-fa, Nitro V / 5, Predator Neo / Helios 16, MSI Thin 15, Gigabyte G6,
  Dell G15, Legion Pro 5i) turn "i5 13th Gen" into the likely chip with alternatives.
- Tested on 20 real store links: Flipkart 6/6 exact CPUs, Croma 5/6, Amazon links carry only the CPU
  (paste the title or use the Amazon app's Share).

**AMD Ryzen laptops** (`8d6d7b7`)
- 39 Ryzen laptop CPUs (Ryzen 4000 → Ryzen AI 300 and 9955HX, incl. 7535HS / 7735HS / 7435HS / 7520U),
  gaming factor per Zen generation from the desktop Ryzen chips. RTX 2050 and RTX 3050 6GB laptop GPUs,
  calibrated (the 6 GB 3050 is ~15% faster than the 4 GB one; the 2050 is below a GTX 1650).
- Link reader handles "Ryzen 7 Octa Core 7735HS", "Ryzen Hexa 7535HS", a bare "7535HS", Ryzen AI names, and
  graphics power written after the chip ("140-w", "140-tgp").

**Also:** default branch switched to `main` (user); raw benchmark pages (`.html`, `.html.gz`) are git-ignored;
`HANDOFF.md` renamed to `handoff.md` and restructured (this file).

### Before 15 Nov 2026: the desktop checker

- One-question-per-page flow → results dashboard (verdict, what's limiting performance, suggestions with
  Apply, detailed analysis, FPS in 10 games, the build) → compare two builds.
- Complete desktop line-ups: 192 CPUs (Ryzen 1000–9000, Intel 8th–14th gen, Core Ultra 200S), 98 GPUs
  (GT 1030 → RTX 50, RX 400 → RX 9000, Arc A/B), older generations grouped and marked "Older".
- Auto-matched motherboard, cooler, PSU and case; light / dark themes; phone layout.

---

## What the site does

1. **Questions, one page each:** desktop or laptop → purpose (AAA games, esports, ray tracing, streaming,
   video editing, 3D rendering, local AI, everyday) → screen resolution and refresh rate (gaming only) →
   CPU, GPU, RAM, storage. Desktops: motherboard, cooler, PSU and case are matched automatically
   ("Auto-picked"). Laptops: graphics power picker; missing RAM / storage are "Assumed".
2. **Check a link:** paste a store link or product text, or use the bookmark on a product page; review the
   recognised parts, pick uses, Analyse.
3. **Results dashboard:** score ring and verdict (names VRAM / RAM shortfalls), CPU/GPU match, power or
   graphics power, memory, compatibility; "What's limiting performance"; suggestions with one-click Apply;
   detailed analysis per use; FPS in 10 games vs the refresh rate; the build / laptop with one-tap changes;
   copy parts list / link; "Checked from <store>" link back to the listing.
4. **Compare:** two builds or two laptops side by side, with a recommended one and the reason.

## Data and accuracy

| Data | Source | Where |
|---|---|---|
| Desktop CPU multi / single-core | PassMark (191 / 192 CPUs) | `src/data/benchmarks.json` via `npm run bench:import` |
| Desktop GPU local AI | llama.cpp Vulkan scoreboard (53 GPUs; rest from memory bandwidth) | same |
| Laptop GPU speed | Notebookcheck, median of 4–67 tested laptops per chip | `src/data/laptop-calibration.json` via `npm run bench:laptops` |
| Game profiles (CS2, CoD, Cyberpunk, RDR2, BG3) | Notebookcheck measured FPS | `src/data/games.ts`, `scripts/fit-game-profiles.ts` |
| Desktop gaming / raster / RT, laptop CPUs, other games | Estimates (shown as "Estimated") | `src/data/cpus.ts`, `gpus.ts`, `laptops.ts`, `games.ts` |

- Scale: fastest model = 100 for each index (CPU games: Ryzen 7 9800X3D; CPU multi: Ryzen 9 9950X3D;
  CPU single: Core Ultra 9 285K; GPU: RTX 5090). Laptop chips are on the same scale as desktop ones.
- Every part shows "Source: X, date · Verify →" or an "Estimated" badge.
- Raw pages are saved under `data/sources/<date>/` and git-ignored (third-party content); see
  `data/sources/README.md`.
- Two laptops with the same chip differ by ~10%, so ~10–12% average error is the practical floor.

## Key architectural decisions

- **Static site, no backend.** React 19 + TypeScript + Vite in the browser, hosted free on GitHub Pages.
  State lives in the URL hash, so every result is a shareable link. Nothing is fetched from stores.
- **Engine separate from UI.** `src/engine/` is pure TypeScript, unit-tested with Vitest; `src/pages` and
  `src/components` only render engine results.
- **Two performance models.** Gaming: CPU and GPU frame-rate ceilings combined as a soft minimum, with
  penalties for RAM, VRAM and PCIe; GPU-limited with some CPU headroom is ideal. Creator / AI / everyday:
  Amdahl-style time shares across CPU, GPU, RAM and storage.
- **Grades:** balance first, then capped by shortfalls: VRAM (¾ of need → 75), RAM (half → 85), one stick → 85,
  under 16 GB → 70. The verdict names the capping part.
- **Laptops share the engine.** Laptop parts are `Cpu` / `Gpu` entries with `laptop: true` (socket `BGA`), in
  separate lists (`laptopCpus`, `laptopGpus`) so the desktop builder never sees them. Each laptop GPU power
  version is its own entry (`rtx3060m-95`). Mixing laptop and desktop parts is a compatibility error.
  Laptop memory runs at the CPU's rated speed (no XMP).
- **Recommend only buyable parts:** older generations can be checked but aren't suggested (incl. RTX 30 laptops).
- **Comparison winner:** a harmful bottleneck loses; otherwise ≥5% faster wins; otherwise better balanced.
- **Link reading is local and transparent:** URL words + pasted text, normalised; "What we read" shows them;
  assumed details are labelled; model-code hints give "likely" chips with alternatives.
- **UI direction from the user:** one question per page, lots of whitespace, little text; all results on one
  dashboard; status colours green / amber / orange / red, teal only for actions; light and dark; phone width.

## Files

| Path | Purpose |
|---|---|
| `src/data/cpus.ts`, `gpus.ts` | Desktop CPUs and GPUs with benchmark indices |
| `src/data/laptops.ts` | Laptop CPUs (Intel, AMD) and GPUs, power versions generated per chip |
| `src/data/parts.ts` | Motherboards, RAM (incl. laptop / soldered), storage, coolers, PSUs, cases |
| `src/data/games.ts` | Ten game profiles (preset, CPU/GPU factors, resolution scaling, VRAM need, caps) |
| `src/data/benchmarks.json` | Sourced desktop indices (PassMark, llama.cpp) |
| `src/data/laptop-calibration.json` | Measured laptop GPU speeds (Notebookcheck) |
| `src/data/index.ts` | Catalog, sourced-value overlay, legacy helpers, desktop/laptop filters |
| `src/engine/types.ts` | Part, build, issue types |
| `src/engine/compatibility.ts` | Compatibility rules, power, effective RAM speed |
| `src/engine/workloads.ts` | Workload definitions, shared `FpsModel` |
| `src/engine/simulation.ts` | FPS and time-share models, grades, shortfall caps, verdicts |
| `src/engine/games.ts` | Per-game FPS, 1% lows, refresh-rate verdicts |
| `src/engine/limits.ts` | "What's limiting performance" |
| `src/engine/recommend.ts` | Suggestions (desktop and laptop wording, power versions, second stick) |
| `src/engine/builder.ts` | `completeBuild` (desktop and laptop), part pickers, auto-builder (not in UI) |
| `src/engine/compare.ts` | Build-vs-build comparison |
| `src/engine/listing.ts` | Recognise parts from store links / pasted text; `seriesHints` model-code table |
| `src/bookmarklet.ts` | "Check in PC Harmony" bookmark code and hash reader |
| `src/engine/__tests__/` | Vitest suites (incl. real store links, laptops, Notebookcheck, accuracy maths) |
| `src/pages/Setup.tsx`, `Link.tsx`, `Results.tsx`, `Compare.tsx` | Question pages, Check a link, dashboard, compare |
| `src/components/` | Part browser, power picker, charts, badges, icons |
| `src/App.tsx`, `src/state.ts`, `src/ui.ts` | Page flow, URL state, presentation helpers |
| `scripts/import-benchmarks.ts`, `benchmarks-lib.ts` | PassMark / llama.cpp import |
| `scripts/notebookcheck-*.ts`, `fetch-notebookcheck.ts`, `calibrate-notebookcheck.ts` | Notebookcheck page list, parser, download, calibration |
| `scripts/accuracy-report.ts`, `fit-game-profiles.ts` | Accuracy report, game-profile fitting |
| `data/sources/` | Saved raw pages by date (git-ignored) + README |
| `.github/workflows/deploy.yml` | Test, build, deploy to GitHub Pages |

## Commands

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run bench:import
```

```bash
npm run bench:laptops:fetch
```

```bash
npm run bench:laptops
```

```bash
npm run bench:accuracy
```

```bash
npx vite-node scripts/fit-game-profiles.ts
```

`bench:import` reads the newest `data/sources/<date>/` PassMark / llama.cpp pages; `bench:laptops:fetch`
downloads the Notebookcheck pages (4 s apart); `bench:laptops` recalibrates laptop GPUs; `bench:accuracy`
prints the accuracy report; `fit-game-profiles.ts` suggests per-game factors.

## Known limits

- Store pages can't be downloaded by the site or a server (blocked); links are read locally, plus the bookmark.
- Amazon links contain only part of the title; Croma links usually give only "i5 13th Gen" + model code.
- Graphics power (TGP) is rarely listed; the usual version is assumed and labelled.
- Laptop CPUs, desktop gaming / raster / RT, and 5 game profiles are still estimates.
- Not covered: Radeon laptop GPUs, Intel P-series, Threadripper / Xeon, pre-2017 parts.
