# PC Harmony

**Live site: https://boroleparth.github.io/CPU-part-project/**

A website that simulates how PC parts work together, so you can pick components where **no part bottlenecks the others**.

- **Build & simulate**: choose a CPU, motherboard, RAM, GPU, storage, cooler, PSU and case. You get a live
  compatibility check, a bottleneck verdict for each workload, a frame-rate chart per resolution, and one-click
  suggested swaps (upgrade the weak part, save money on an overkill part, or fix an incompatibility).
- **Auto-build**: choose your workloads and a performance tier (or an FPS target), and it proposes the *least
  powerful* parts that reach that target without bottlenecking each other.
- **Workloads** (pick any mix): AAA gaming, esports, ray-traced gaming, gaming + streaming, video editing,
  3D rendering, local AI/LLMs, and everyday office/coding.
- Builds are encoded in the URL, so you can share one by copying the link.

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
