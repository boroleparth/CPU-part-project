# Handoff: PC Harmony

**Live site:** https://boroleparth.github.io/CPU-part-project/
**Repo:** `boroleparth/CPU-part-project`. Work happens on `claude/amazing-knuth-1e53v3` and is pushed to `main`;
every push to `main` runs the tests and deploys to GitHub Pages.

## What it is

A static website that checks how well a desktop PC or a laptop will work before you buy it: whether the
parts work well together, so no part bottlenecks the others.

1. **Questions, one page each:** desktop or laptop → purpose (AAA games, esports, ray tracing, streaming, video editing,
   3D rendering, local AI, everyday) → monitor resolution and refresh rate (gaming only) → CPU, GPU,
   RAM and storage. Motherboard, cooler, PSU and case are matched automatically ("Auto-picked").
   **Laptop mode:** the same questions with laptop parts only; the graphics chip gets a **power (TGP) picker**,
   there is no motherboard/cooler/PSU/case, and missing RAM/storage are "Assumed" (2×8 GB at the CPU's rated
   speed, 512 GB NVMe). Suggestions become "Choose a laptop with …", "Look for the 130 W version",
   "Add a second memory stick" or "Choose the 32 GB version" (soldered LPDDR5X).
   **Check a link** (top bar, or the card on the first page): paste a store link (Amazon, Flipkart, Croma,
   Reliance Digital, Vijay Sales, brand sites) or the product title / spec list; the parts are recognised from
   the link's own words or the pasted text (`src/engine/listing.ts`; nothing is fetched, a static site can't
   read other shops' pages). Each part shows Found / partly assumed / Pick one / Not in our database, stays
   editable, and the results page links back to the listing (`src=` in the share link).
   **"Check in PC Harmony" bookmark** (`src/bookmarklet.ts`, offered on the Check a link page): clicked on a
   product page it collects the title and spec rows in the user's own browser and opens Check a link via
   `#text=...&src=...` (hash only, never sent to a server; cleared after reading). Fixes listings whose link
   or title only says "i7 13th Gen" while the spec table has the exact model. Phones: copy-paste the specs.
2. **Results dashboard** (one wide page):
   - verdict: score ring, headline, CPU/GPU match, peak power, PSU needed, compatibility;
   - **What's limiting performance**: how busy each part is, with the bottleneck marked;
   - suggestions (fix / upgrade / save) with one-click Apply;
   - detailed analysis per use (CPU-vs-GPU FPS chart, or job time-share bars);
   - FPS in 10 popular games against the monitor's refresh rate;
   - the full build with one-tap part changes, plus copy parts list / copy link.
3. **Compare with another build:** Build B starts as a copy; side-by-side scores, bottlenecks, power and
   per-game FPS, with a recommended build and the reason; Swap A ⇄ B and Use Build B.

**Data:** 192 desktop CPUs (Ryzen 1000–9000, Intel 8th–14th gen, Core Ultra 200S, including X3D, F, KF and
APU variants), 98 GPUs (GT 1030 / GTX 10 through RTX 50, RX 400 through RX 9000, Arc A/B), motherboard classes
for AM4, AM5, LGA1151, LGA1200, LGA1700 and LGA1851, plus RAM, storage, coolers, PSUs and cases.
**Laptops:** 53 Intel laptop CPUs (10th–14th gen H/HX/U, Core 5/7 200-series H, Core Ultra 100 H/U,
200V, 200H/HX) and 26 NVIDIA laptop GPUs (GTX 1650 to RTX 5090 Laptop), each in 2–5 power versions
(`src/data/laptops.ts`); plus SO-DIMM / LPDDR5X memory and 256/512 GB drives.
**273 tests**, all passing.

## Key architectural decisions

- **Static site, no backend.** React 19 + TypeScript + Vite, everything runs in the browser and is hosted
  free on GitHub Pages. State lives in the URL hash, so any build or comparison is shareable as a link.
- **Engine separate from UI.** `src/engine/` is pure TypeScript with no React; all logic is unit-tested
  with Vitest. The UI (`src/pages`, `src/components`) only renders engine results.
- **Relative benchmark indices.** Every part is scored on one shared scale with the fastest model = 100:
  CPU `gamingIndex` (Ryzen 7 9800X3D = 100) and `multiIndex` (Ryzen 9 9950X = 100); GPU `rasterIndex` and
  `rtIndex` (RTX 5090 = 100), plus `singleIndex` (CPU) and `aiIndex` (GPU). **Sourced** values come from named
  public datasets via `npm run bench:import` (`scripts/import-benchmarks.ts` → `src/data/benchmarks.json`,
  merged over the estimates in `src/data/index.ts`; scale = raw / fastest catalog part × 100): PassMark CPU Mark
  and single-thread for 191/192 CPUs, llama.cpp Vulkan scoreboard for 53/97 GPUs. Everything else (all
  gaming / raster / RT indices for now) is **my estimate from aggregated public reviews**, shown as "Estimated"
  in the UI; expect roughly 5–10% error per estimated value. See `data/sources/README.md`.
- **Two performance models.**
  - *Gaming:* the CPU sets an FPS ceiling that barely changes with resolution, the GPU one that falls with
    resolution; the result is a soft minimum, with penalties for RAM (single stick, too little, slow), VRAM
    shortfall and narrow PCIe links. Being GPU-limited with some CPU headroom is treated as ideal.
  - *Creator / AI / everyday:* an Amdahl-style time-share model across CPU, GPU, RAM and storage. Balance
    compares the CPU class with the GPU class; RAM, storage and VRAM are "enough or not".
- **Per-game profiles** (`src/data/games.ts`) tune the gaming model to published averages and apply engine
  frame caps (Apex 300, Elden Ring 60). Tests keep 9 reference points within ±20%.
- **Compatibility as data-driven rules** (`compatibility.ts`): socket, chipset generation support
  (`unsupported`), memory type and slots, VRM, cooler capacity and clearance, PSU wattage and 12V-2x6, case fit.
- **Auto-completion** (`builder.ts` `completeBuild`): the user picks 4 parts; the board, RAM (if missing),
  storage, cooler, case and PSU are chosen to fit. PCIe 4.0 is a preference, not a requirement.
- **Recommend only buyable parts.** `isLegacyCpu` / `isLegacyGpu` (`src/data/index.ts`) mark older
  generations: they can be checked, but suggestions, "Best match" and the auto-builder only recommend
  current parts. The exception is a drop-in CPU upgrade on an older platform.
- **Comparison winner rule** (`compare.ts`): a build with a harmful bottleneck (CPU, VRAM, RAM, PSU,
  storage) loses; otherwise the one ≥5% faster wins; otherwise the better-balanced one; otherwise a tie.
- **Laptops share the engine.** Laptop parts are ordinary `Cpu` / `Gpu` entries with `laptop: true` (socket
  `BGA`), kept in separate lists (`laptopCpus`, `laptopGpus`) so the desktop builder and suggestions never see
  them; `catalog` holds both so links decode. A build is a laptop when its CPU or GPU is (`isLaptopBuild`);
  `AppState.device` (`d=laptop` in the link) picks the flow. Mixing laptop and desktop parts is a compatibility
  error. Each laptop GPU power version is its own entry (`rtx3060m-95`), speed scaled by
  `(W / max W)^0.4` (≈ 25–35% slower at the lowest version). Laptop CPU estimates come from approximate
  PassMark scores (same scale as the sourced desktop ones) with a gaming factor per architecture and class
  (U/V/H/HX); laptop memory runs at the CPU's rated speed (no XMP). All laptop values show as "Estimated".
- **UI direction from the user:** questions one per page with lots of whitespace and little text; all
  results on one dashboard; consistent status colors (green good, amber minor, orange bottleneck,
  red problem; teal = actions only); light and dark themes; works at phone width.

## Files

| Path | Purpose |
|---|---|
| `src/data/cpus.ts`, `gpus.ts` | CPU and GPU datasets with benchmark indices |
| `src/data/parts.ts` | Motherboards, RAM, storage, coolers, PSUs, cases |
| `src/data/laptops.ts` | Laptop CPUs and GPUs (power versions generated from one row per chip) |
| `src/data/laptop-calibration.json` | Laptop GPU speeds measured by Notebookcheck (`npm run bench:laptops`) |
| `scripts/notebookcheck-*.ts`, `calibrate-notebookcheck.ts` | Notebookcheck page list, parser, fetch, calibration |
| `src/components/PowerPicker.tsx` | Laptop graphics power (TGP) picker |
| `src/data/benchmarks.json` | Sourced indices + raw scores, generated by `npm run bench:import` |
| `scripts/import-benchmarks.ts`, `benchmarks-lib.ts` | Benchmark import: parse saved pages, match names, scale |
| `data/sources/` | Saved source pages by date (HTML git-ignored) |
| `src/data/games.ts` | Ten game profiles (preset, CPU/GPU factors, VRAM need, frame cap) |
| `src/data/index.ts` | Catalog, slot labels/order, legacy-part helpers |
| `src/engine/types.ts` | Part, build and issue types |
| `src/engine/compatibility.ts` | Compatibility checks, power estimates |
| `src/engine/workloads.ts` | Workload definitions and the shared `FpsModel` |
| `src/engine/simulation.ts` | FPS and time-share models, scores, verdicts |
| `src/engine/games.ts` | Per-game FPS, 1% lows, refresh-rate verdicts |
| `src/engine/limits.ts` | "What's limiting performance" report |
| `src/engine/recommend.ts` | Suggestions (fix / upgrade / save, add a GPU) |
| `src/engine/builder.ts` | `completeBuild`, part pickers, auto-builder (not in UI) |
| `src/engine/compare.ts` | Build-vs-build comparison and winner |
| `src/engine/__tests__/` | Vitest suites for all of the above |
| `src/engine/listing.ts` | Recognise parts from a store link or pasted product text |
| `src/pages/Link.tsx` | "Check a link" page |
| `src/pages/Setup.tsx` | Purpose, monitor and parts question pages |
| `src/pages/Results.tsx` | Results dashboard |
| `src/pages/Compare.tsx` | Side-by-side comparison page |
| `src/components/PartBrowser.tsx` | Part picker: search, sort, generation groups, scores |
| `src/components/Charts.tsx`, `Badges.tsx`, `Icons.tsx` | Charts, score ring/badges, slot icons |
| `src/App.tsx`, `src/state.ts`, `src/ui.ts` | Page flow, URL state, presentation helpers |
| `src/styles.css`, `index.html` | Styles (tokens, light/dark), page shell |
| `.github/workflows/deploy.yml` | Test, build and deploy to GitHub Pages |

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Next steps

1. **Repo setting:** change the default branch from `claude/amazing-knuth-1e53v3` to `main`
   (Settings → General → Default branch).
2. **Verifiable benchmarks (partly done):** PassMark and llama.cpp are imported and shown per part. Still to do:
   TechPowerUp relative-performance charts for `gamingIndex`, `rasterIndex` and `rtIndex` (TechPowerUp blocks
   automated fetching; save the pages from a browser, then add parsers in `scripts/benchmarks-lib.ts`).
3. **Prices (INR):** enables "B costs ₹X more for Y% more FPS", value-based suggestions, and a budget mode
   for the auto-builder that already exists in `builder.ts`.
4. **Laptops (Intel + NVIDIA done, GPUs calibrated):** laptop GPU speeds come from Notebookcheck (median of
   10–67 tested laptops per chip, ~45,000 measured rows; `npm run bench:laptops`). The power formula
   `(W / W_ref)^0.4` predicts their fastest 10% of laptops within a few percent. next are AMD Ryzen laptop CPUs (and Radeon / Arc laptop graphics), and
   sourcing laptop CPUs: they are already in the import script, so re-running `npm run bench:import` on the
   saved PassMark pages replaces the estimates. Laptop GPUs stay estimated (scores vary by power).
   Possible later: laptop model presets ("ASUS TUF F15 2021") that fill all four specs at once.
5. **Game profiles (refitted to Notebookcheck):** CS2, Call of Duty, Cyberpunk, RDR2 and Baldur's Gate 3 are
   fitted to measured FPS at 1080p (15–163 laptops and desktops each, `scripts/fit-game-profiles.ts`), and the
   generic AAA / streaming profiles scaled ×1.4 to match. Measured ÷ model is now 0.87–1.04 for those games.
   Valorant, Apex, Marvel Rivals (≤9 measurements) and Fortnite (none) are still estimates; accuracy report:
   `npm run bench:accuracy`. Desktop RTX 5070 ~8% low, RTX 3070 / 4090 ~9–11% high (not yet corrected).
6. **Accuracy parameters to add (agreed list):**
   1. memory pressure (Windows + background apps + game RAM, VRAM overflow into RAM): GPU shows 60–80% busy,
      not 100%, and FPS / stutter get worse;
   2. 1% lows (stutter) next to average FPS;
   3. game settings preset (Low–Ultra) and upscaling (DLSS) as a question;
   4. laptop shared power / cooling budget, thin vs thick chassis, age (thermal throttling);
   5. MUX switch / Advanced Optimus (5–15% FPS without one);
   6. CPU main-thread load instead of "total CPU %";
   7. real measured reference points as tests (start: the user's ASUS TUF F15 2021).
7. **More games / custom games:** each new game is one profile plus a benchmark reference test.
8. **Not covered yet:** Threadripper / Xeon, OEM- or China-only models, pre-2017 parts.
9. **Removed from the UI but still in the engine** (can be brought back): budget-free auto-builder by tier,
   "How it works" page.
