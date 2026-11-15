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
