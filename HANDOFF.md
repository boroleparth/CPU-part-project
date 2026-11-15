# Handoff: PC Harmony

**Live site:** https://boroleparth.github.io/CPU-part-project/
**Repo:** `boroleparth/CPU-part-project`. Work happens on `claude/amazing-knuth-1e53v3` and is pushed to `main`;
every push to `main` runs the tests and deploys to GitHub Pages.

## What it is

A static website that checks whether PC parts work well together, so no part bottlenecks the others.

1. **Questions, one page each:** purpose (AAA games, esports, ray tracing, streaming, video editing,
   3D rendering, local AI, everyday) → monitor resolution and refresh rate (gaming only) → CPU, GPU,
   RAM and storage. Motherboard, cooler, PSU and case are matched automatically ("Auto-picked").
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
**214 tests**, all passing.

## Key architectural decisions

- **Static site, no backend.** React 19 + TypeScript + Vite, everything runs in the browser and is hosted
  free on GitHub Pages. State lives in the URL hash, so any build or comparison is shareable as a link.
- **Engine separate from UI.** `src/engine/` is pure TypeScript with no React; all logic is unit-tested
  with Vitest. The UI (`src/pages`, `src/components`) only renders engine results.
- **Relative benchmark indices.** Every part is scored on one shared scale with the fastest model = 100:
  CPU `gamingIndex` (Ryzen 7 9800X3D = 100) and `multiIndex` (Ryzen 9 9950X = 100); GPU `rasterIndex` and
  `rtIndex` (RTX 5090 = 100). Values are **my estimates from aggregated public reviews**, not measured or
  fetched live; expect roughly 5–10% error per part.
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
- **UI direction from the user:** questions one per page with lots of whitespace and little text; all
  results on one dashboard; consistent status colors (green good, amber minor, orange bottleneck,
  red problem; teal = actions only); light and dark themes; works at phone width.

## Files

| Path | Purpose |
|---|---|
| `src/data/cpus.ts`, `gpus.ts` | CPU and GPU datasets with benchmark indices |
| `src/data/parts.ts` | Motherboards, RAM, storage, coolers, PSUs, cases |
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
2. **Verifiable benchmarks:** source every index from one named public dataset and show the source on each
   part; this is the biggest accuracy and trust improvement.
3. **Prices (INR):** enables "B costs ₹X more for Y% more FPS", value-based suggestions, and a budget mode
   for the auto-builder that already exists in `builder.ts`.
4. **Laptops:** laptop CPUs/GPUs need their own data (the same GPU name varies 30–40% with power limits).
5. **More games / custom games:** each new game is one profile plus a benchmark reference test.
6. **Not covered yet:** Threadripper / Xeon, OEM- or China-only models, pre-2017 parts.
7. **Removed from the UI but still in the engine** (can be brought back): budget-free auto-builder by tier,
   "How it works" page.
