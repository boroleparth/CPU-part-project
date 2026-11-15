# Benchmark sources

Raw chart pages, one folder per save date (`YYYY-MM-DD/`). The HTML is third-party content and is
git-ignored; only the extracted scores in `src/data/benchmarks.json` are committed. Re-run the import
after saving a new folder:

```bash
npm run bench:import
```

| File | Page | Gives |
|---|---|---|
| `passmark-cpu-list-amd.html` | https://www.cpubenchmark.net/cpu-list/amd | CPU `multiIndex` (CPU Mark) |
| `passmark-cpu-list-intel.html` | https://www.cpubenchmark.net/cpu-list/ | CPU `multiIndex` (CPU Mark) |
| `passmark-single-thread.html` | https://www.cpubenchmark.net/singleThread.html | CPU `singleIndex` |
| `llamacpp-vulkan-discussion-10879.html` | https://github.com/ggml-org/llama.cpp/discussions/10879 | GPU `aiIndex` (scoreboard, Llama 2 7B Q4_0, tg128) |

**Not wired up yet:** TechPowerUp relative-performance charts (CPU `gamingIndex`, GPU `rasterIndex` and
`rtIndex`). TechPowerUp answers automated requests with a bot challenge, so these pages have to be saved
from a browser (File → Save Page As, "HTML only"). Their parsers will be added to
`scripts/benchmarks-lib.ts` once a saved page is available.

Rules: load only the few pages that list every part, never per-part pages, and don't work around bot
protection.

## Notebookcheck (laptop graphics calibration)

`notebookcheck/<id>.html.gz`: one Notebookcheck GPU page per laptop chip, plus 13 desktop reference
cards (list in `scripts/notebookcheck-pages.ts`). Each page lists measured FPS per game, preset and
resolution for every laptop tested with that chip. Fetched once, 4 s apart (`npm run bench:laptops:fetch`).

```bash
npm run bench:laptops
```

compares each laptop chip with the desktop reference cards in identical game / preset / resolution
rows (GPU-bound rows only), converts to our `rasterIndex` scale, and writes
`src/data/laptop-calibration.json` (median laptop, fastest 10%, slowest 10%, number of laptops).
`src/data/laptops.ts` uses the median laptop for each chip's typical power version.
