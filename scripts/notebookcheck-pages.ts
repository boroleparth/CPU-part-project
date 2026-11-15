/**
 * Notebookcheck graphics-card pages used to calibrate the model against real laptops.
 * Each page lists measured FPS per game, preset and resolution, for every laptop
 * (or desktop card) Notebookcheck has tested with that chip. One page per chip;
 * fetched once, a few seconds apart, by scripts/fetch-notebookcheck.ts.
 */
export interface NbcPage {
  /** Our laptop GPU family id (src/data/laptops.ts, without the "-<W>" suffix) or desktop GPU id (src/data/gpus.ts). */
  id: string;
  kind: 'laptop' | 'desktop';
  url: string;
}

const nbc = 'https://www.notebookcheck.net/';

export const nbcPages: NbcPage[] = [
  // Laptop GPUs (all chips in src/data/laptops.ts)
  { id: 'gtx1650m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-GTX-1650-Laptop-GPU.416044.0.html` },
  { id: 'gtx1650tim', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-GTX-1650-Ti-Mobile-GPU-Benchmarks-and-Specs.452628.0.html` },
  { id: 'gtx1660tim', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-GTX-1660-Ti-Laptop-Graphics-Card.386426.0.html` },
  { id: 'rtx2060m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-2060-Laptop-Graphics-Card.384946.0.html` },
  { id: 'rtx2070m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-2070-Laptop-Graphics-Card.384936.0.html` },
  { id: 'rtx2070sm', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-2070-Super-Mobile-GPU-Benchmarks-and-Specs.452604.0.html` },
  { id: 'rtx2080m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-2080-Laptop-Graphics-Card.384931.0.html` },
  { id: 'rtx2080sm', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-2080-Super-Mobile-GPU-Benchmarks-and-Specs.452534.0.html` },
  { id: 'rtx3050m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3050-Laptop-GPU-Benchmarks-and-Specs.513790.0.html` },
  { id: 'rtx3050tim', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3050-Ti-Laptop-GPU-Benchmarks-and-Specs.527430.0.html` },
  { id: 'rtx3060m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3060-Laptop-GPU-Graphics-Card.497453.0.html` },
  { id: 'rtx3070m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3070-Mobile-GPU-Benchmarks-and-Specs.497451.0.html` },
  { id: 'rtx3070tim', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3070-Ti-Laptop-GPU-GPU-Benchmarks-and-Specs.588958.0.html` },
  { id: 'rtx3080m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3080-Mobile-GPU-Benchmarks-and-Specs.497450.0.html` },
  { id: 'rtx3080tim', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-3080-Ti-Laptop-GPU-GPU-Benchmarks-and-Specs.588451.0.html` },
  { id: 'rtx4050m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-4050-Laptop-GPU-Benchmarks-and-Specs.675695.0.html` },
  { id: 'rtx4060m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-4060-Laptop-GPU-Benchmarks-and-Specs.675692.0.html` },
  { id: 'rtx4070m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-4070-Laptop-GPU-Benchmarks-and-Specs.675690.0.html` },
  { id: 'rtx4080m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-4080-Laptop-GPU-Benchmarks-and-Specs.675174.0.html` },
  { id: 'rtx4090m', kind: 'laptop', url: `${nbc}NVIDIA-GeForce-RTX-4090-Laptop-GPU-Benchmarks-and-Specs.675091.0.html` },
  { id: 'rtx5050m', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5050-Laptop-Benchmarks-and-Specs.934804.0.html` },
  { id: 'rtx5060m', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5060-Laptop-Benchmarks-and-Specs.934941.0.html` },
  { id: 'rtx5070m', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5070-Laptop-Benchmarks-and-Specs.934942.0.html` },
  { id: 'rtx5070tim', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5070-Ti-Laptop-Benchmarks-and-Specs.934945.0.html` },
  { id: 'rtx5080m', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5080-Laptop-Benchmarks-and-Specs.934946.0.html` },
  { id: 'rtx5090m', kind: 'laptop', url: `${nbc}Nvidia-GeForce-RTX-5090-Laptop-Benchmarks-and-Specs.934947.0.html` },
  // Desktop reference cards: same games and settings, to tie laptop results to the desktop-calibrated model.
  { id: 'gtx1650', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-GTX-1650-Desktop-GPU-Benchmarks-and-Specs.421420.0.html` },
  { id: 'rtx2060', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-2060-Desktop-GPU.400716.0.html` },
  { id: 'rtx3050', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-3050-GPU-Benchmarks-and-Specs.659500.0.html` },
  { id: 'rtx3060-12', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-3060-Desktop-GPU-Benchmarks-and-Specs.579000.0.html` },
  { id: 'rtx3060ti', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-3060-Ti-GPU-Benchmarks-and-Specs.513792.0.html` },
  { id: 'rtx3070', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-3070-GPU-Benchmarks-and-Specs.509228.0.html` },
  { id: 'rtx4060', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-4060-GPU-Benchmarks-and-Specs.741899.0.html` },
  { id: 'rtx4070', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-4070-Desktop-GPU-Benchmarks-and-Specs.742254.0.html` },
  { id: 'rtx4070ti', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-4070-Ti-GPU-Benchmarks-and-Specs.679267.0.html` },
  { id: 'rtx4080', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-4080-GPU-Benchmarks-and-Specs.674575.0.html` },
  { id: 'rtx4090', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-4090-GPU-Benchmarks-and-Specs.674574.0.html` },
  { id: 'rtx5060', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-5060-Benchmarks-and-Specs.935684.0.html` },
  { id: 'rtx5070', kind: 'desktop', url: `${nbc}NVIDIA-GeForce-RTX-5070-Benchmarks-and-Specs.935682.0.html` },
];
