# PC Harmony

**Live site: https://boroleparth.github.io/CPU-part-project/**

A website that checks whether PC parts work well together, so no part bottlenecks the others.

Three short questions, one per page:

1. **Purpose**: gaming, esports, streaming, video editing, 3D, local AI or everyday use.
2. **Monitor** (gaming only): resolution and refresh rate.
3. **Parts**: CPU, graphics card, memory and storage. The motherboard, cooler, power supply and case are
   matched automatically.

Then **Check my build** opens one results dashboard:

- **Verdict**: score, one-line headline, how the CPU and GPU match, peak power, PSU needed, compatibility.
- **What's limiting performance**: how busy each part is (CPU, GPU, VRAM, RAM, storage, power supply) for
  each use, with the bottleneck marked.
- **Suggestions**: fixes, upgrades and money-savers, each applied with one click.
- **Detailed analysis**: per use, the explanation plus the CPU-vs-GPU frame-rate chart (games) or the job
  time-share bars (creator and AI work).
- **Your games**: estimated FPS in ten popular games at standard settings, against your refresh rate.
- **Your build**: every part with a status dot and one-tap changes, plus a parts list or link to share.

**Compare with another build** opens a side-by-side view. Build B starts as a copy of your build; change any
of its parts and see both scores, each use's score, the bottleneck, power, and FPS in every game with the
difference. One build is recommended with a reason: a build with a real bottleneck (CPU, VRAM, RAM, power
supply, storage) loses to one without; otherwise the one that is at least 5% faster wins; otherwise the better
balanced one. Swap the builds, make B your build, or share the comparison as a link.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

Then open the URL that Vite prints (usually http://localhost:5173).

```bash
npm test
```

```bash
npm run build
```

## How the model works

See the **How it works** tab in the app. In short:

- **Compatibility**: socket, memory type and slots, board power delivery (VRM), cooler capacity and clearance,
  PSU wattage, connector and headroom, case fit.
- **Gaming**: the CPU sets a frame-rate ceiling that barely changes with resolution, and the GPU sets one that falls
  steeply as resolution rises. You get roughly the lower of the two (a soft minimum). The model applies penalties
  for single-channel, too little or slow RAM, insufficient VRAM, and x8 GPUs on PCIe 3.0.
- **Creator, AI and everyday work**: a time-share (Amdahl) model splits the job between CPU, GPU, RAM and storage.
  The verdict compares the CPU's class with the GPU's class, and checks that RAM, storage and VRAM are sufficient.

Performance numbers are **relative indices** approximated from aggregated public reviews. They are meant to guide
which parts suit each other, not to promise exact FPS.

## Project layout

```
src/
  data/          parts database (cpus.ts, gpus.ts, parts.ts)
  engine/        simulation logic, no UI dependencies
    compatibility.ts   will the parts physically/electrically work?
    workloads.ts       workload definitions and weights
    simulation.ts      frame-rate and time-share models, scoring
    builder.ts         auto-builder
    recommend.ts       swap suggestions
    __tests__/         Vitest suite
  components/    React UI
```

## Parts covered

- **CPUs (58)**: Ryzen 2000 / 3000 / 5000 / 5000G / 7000 / 8000G / 9000, Intel Core 10th–14th gen and Core Ultra 200S.
- **GPUs (75)**: GeForce GTX 10 / GTX 16 / RTX 20 / 30 / 40 / 50, Radeon RX 5000 / 6000 / 7000 / 9000, Intel Arc A and B.
- Motherboard classes for AM4, AM5, LGA1200, LGA1700 and LGA1851, plus RAM kits, storage, coolers, PSUs and cases.

The part picker groups CPUs and GPUs by generation, newest first.

## Adding or updating parts

Add an entry to `src/data/cpus.ts`, `src/data/gpus.ts` or `src/data/parts.ts`. CPU `gamingIndex` is relative
to the Ryzen 7 9800X3D (= 100), and `multiIndex` to the Ryzen 9 9950X (= 100). GPU `rasterIndex` and `rtIndex`
are relative to the RTX 5090 (= 100). Run `npm test` afterwards; the auto-builder tests check that every tier,
resolution and workload combination still produces a compatible build.

## Deploying

**https://boroleparth.github.io/CPU-part-project/** is built from `main` by `.github/workflows/deploy.yml`,
which runs the tests, builds the site and publishes it to GitHub Pages on every push to `main`. Pull requests run
the tests and build without publishing.

## Roadmap

- Prices (INR/USD), so the auto-builder can work from a budget
- More parts, plus per-game profiles (CPU-heavy vs GPU-heavy titles)
- Saved builds and side-by-side comparison
