import type { Gpu } from '../engine/types';

// rasterIndex: relative raster performance at 1440p/4K, RTX 5090 = 100.
// rtIndex: relative ray-tracing performance, RTX 5090 = 100.
// Values are approximations of aggregated public review data.

export const gpus: Gpu[] = [
  // NVIDIA
  { id: 'rtx5090', name: 'GeForce RTX 5090', brand: 'NVIDIA', rasterIndex: 100, rtIndex: 100, vram: 32, bandwidth: 1792, power: 575, lengthMm: 304, pcieLanes: 16, pcieGen: 5, cuda: true, needs12v2x6: true },
  { id: 'rtx4090', name: 'GeForce RTX 4090', brand: 'NVIDIA', rasterIndex: 78, rtIndex: 77, vram: 24, bandwidth: 1008, power: 450, lengthMm: 304, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx5080', name: 'GeForce RTX 5080', brand: 'NVIDIA', rasterIndex: 64, rtIndex: 63, vram: 16, bandwidth: 960, power: 360, lengthMm: 304, pcieLanes: 16, pcieGen: 5, cuda: true, needs12v2x6: true },
  { id: 'rtx4080s', name: 'GeForce RTX 4080 Super', brand: 'NVIDIA', rasterIndex: 60, rtIndex: 59, vram: 16, bandwidth: 736, power: 320, lengthMm: 310, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx5070ti', name: 'GeForce RTX 5070 Ti', brand: 'NVIDIA', rasterIndex: 56, rtIndex: 54, vram: 16, bandwidth: 896, power: 300, lengthMm: 286, pcieLanes: 16, pcieGen: 5, cuda: true, needs12v2x6: true },
  { id: 'rtx4070tis', name: 'GeForce RTX 4070 Ti Super', brand: 'NVIDIA', rasterIndex: 52, rtIndex: 50, vram: 16, bandwidth: 672, power: 285, lengthMm: 285, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx5070', name: 'GeForce RTX 5070', brand: 'NVIDIA', rasterIndex: 46, rtIndex: 44, vram: 12, bandwidth: 672, power: 250, lengthMm: 242, pcieLanes: 16, pcieGen: 5, cuda: true, needs12v2x6: true },
  { id: 'rtx4070s', name: 'GeForce RTX 4070 Super', brand: 'NVIDIA', rasterIndex: 45, rtIndex: 43, vram: 12, bandwidth: 504, power: 220, lengthMm: 244, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx4070', name: 'GeForce RTX 4070', brand: 'NVIDIA', rasterIndex: 39, rtIndex: 37, vram: 12, bandwidth: 504, power: 200, lengthMm: 244, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx5060ti16', name: 'GeForce RTX 5060 Ti 16GB', brand: 'NVIDIA', rasterIndex: 35, rtIndex: 33, vram: 16, bandwidth: 448, power: 180, lengthMm: 230, pcieLanes: 8, pcieGen: 5, cuda: true, needs12v2x6: false },
  { id: 'rtx4060ti8', name: 'GeForce RTX 4060 Ti 8GB', brand: 'NVIDIA', rasterIndex: 30, rtIndex: 28, vram: 8, bandwidth: 288, power: 160, lengthMm: 240, pcieLanes: 8, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx5060', name: 'GeForce RTX 5060', brand: 'NVIDIA', rasterIndex: 30, rtIndex: 28, vram: 8, bandwidth: 448, power: 145, lengthMm: 220, pcieLanes: 8, pcieGen: 5, cuda: true, needs12v2x6: false },
  { id: 'rtx4060', name: 'GeForce RTX 4060', brand: 'NVIDIA', rasterIndex: 25, rtIndex: 23, vram: 8, bandwidth: 272, power: 115, lengthMm: 200, pcieLanes: 8, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3060-12', name: 'GeForce RTX 3060 12GB', brand: 'NVIDIA', rasterIndex: 21, rtIndex: 18, vram: 12, bandwidth: 360, power: 170, lengthMm: 242, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  // AMD
  { id: 'rx7900xtx', name: 'Radeon RX 7900 XTX', brand: 'AMD', rasterIndex: 62, rtIndex: 42, vram: 24, bandwidth: 960, power: 355, lengthMm: 287, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx9070xt', name: 'Radeon RX 9070 XT', brand: 'AMD', rasterIndex: 56, rtIndex: 46, vram: 16, bandwidth: 640, power: 304, lengthMm: 300, pcieLanes: 16, pcieGen: 5, cuda: false, needs12v2x6: false },
  { id: 'rx7900xt', name: 'Radeon RX 7900 XT', brand: 'AMD', rasterIndex: 54, rtIndex: 36, vram: 20, bandwidth: 800, power: 315, lengthMm: 276, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx9070', name: 'Radeon RX 9070', brand: 'AMD', rasterIndex: 50, rtIndex: 41, vram: 16, bandwidth: 640, power: 220, lengthMm: 280, pcieLanes: 16, pcieGen: 5, cuda: false, needs12v2x6: false },
  { id: 'rx7800xt', name: 'Radeon RX 7800 XT', brand: 'AMD', rasterIndex: 42, rtIndex: 28, vram: 16, bandwidth: 624, power: 263, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx7700xt', name: 'Radeon RX 7700 XT', brand: 'AMD', rasterIndex: 36, rtIndex: 24, vram: 12, bandwidth: 432, power: 245, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx9060xt16', name: 'Radeon RX 9060 XT 16GB', brand: 'AMD', rasterIndex: 34, rtIndex: 27, vram: 16, bandwidth: 320, power: 160, lengthMm: 240, pcieLanes: 16, pcieGen: 5, cuda: false, needs12v2x6: false },
  { id: 'rx7600', name: 'Radeon RX 7600', brand: 'AMD', rasterIndex: 24, rtIndex: 15, vram: 8, bandwidth: 288, power: 165, lengthMm: 204, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  // Intel
  { id: 'arc-b580', name: 'Arc B580', brand: 'Intel', rasterIndex: 26, rtIndex: 22, vram: 12, bandwidth: 456, power: 190, lengthMm: 272, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'arc-a750', name: 'Arc A750', brand: 'Intel', rasterIndex: 20, rtIndex: 16, vram: 8, bandwidth: 512, power: 225, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  // ---- Older and extra models (added for used / upgrade builds) ----
  // NVIDIA RTX 50 / 40 extras
  { id: 'rtx5060ti8', name: 'GeForce RTX 5060 Ti 8GB', brand: 'NVIDIA', rasterIndex: 34, rtIndex: 32, vram: 8, bandwidth: 448, power: 180, lengthMm: 230, pcieLanes: 8, pcieGen: 5, cuda: true, needs12v2x6: false },
  { id: 'rtx4080', name: 'GeForce RTX 4080', brand: 'NVIDIA', rasterIndex: 57, rtIndex: 56, vram: 16, bandwidth: 717, power: 320, lengthMm: 310, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx4070ti', name: 'GeForce RTX 4070 Ti', brand: 'NVIDIA', rasterIndex: 47, rtIndex: 45, vram: 12, bandwidth: 504, power: 285, lengthMm: 285, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx4060ti16', name: 'GeForce RTX 4060 Ti 16GB', brand: 'NVIDIA', rasterIndex: 30.5, rtIndex: 28.5, vram: 16, bandwidth: 288, power: 165, lengthMm: 240, pcieLanes: 8, pcieGen: 4, cuda: true, needs12v2x6: false },
  // NVIDIA RTX 30 (Ampere)
  { id: 'rtx3090ti', name: 'GeForce RTX 3090 Ti', brand: 'NVIDIA', rasterIndex: 50, rtIndex: 45, vram: 24, bandwidth: 1008, power: 450, lengthMm: 313, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: true },
  { id: 'rtx3090', name: 'GeForce RTX 3090', brand: 'NVIDIA', rasterIndex: 46, rtIndex: 41, vram: 24, bandwidth: 936, power: 350, lengthMm: 313, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3080ti', name: 'GeForce RTX 3080 Ti', brand: 'NVIDIA', rasterIndex: 45, rtIndex: 40, vram: 12, bandwidth: 912, power: 350, lengthMm: 285, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3080', name: 'GeForce RTX 3080 10GB', brand: 'NVIDIA', rasterIndex: 41, rtIndex: 37, vram: 10, bandwidth: 760, power: 320, lengthMm: 285, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3070ti', name: 'GeForce RTX 3070 Ti', brand: 'NVIDIA', rasterIndex: 34, rtIndex: 30, vram: 8, bandwidth: 608, power: 290, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3070', name: 'GeForce RTX 3070', brand: 'NVIDIA', rasterIndex: 32, rtIndex: 28.5, vram: 8, bandwidth: 448, power: 220, lengthMm: 242, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3060ti', name: 'GeForce RTX 3060 Ti', brand: 'NVIDIA', rasterIndex: 28, rtIndex: 25, vram: 8, bandwidth: 448, power: 200, lengthMm: 242, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3060-8', name: 'GeForce RTX 3060 8GB', brand: 'NVIDIA', rasterIndex: 19, rtIndex: 17, vram: 8, bandwidth: 240, power: 170, lengthMm: 242, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3050', name: 'GeForce RTX 3050 8GB', brand: 'NVIDIA', rasterIndex: 14, rtIndex: 12.5, vram: 8, bandwidth: 224, power: 130, lengthMm: 200, pcieLanes: 8, pcieGen: 4, cuda: true, needs12v2x6: false },
  // NVIDIA RTX 20 (Turing)
  { id: 'rtx2080ti', name: 'GeForce RTX 2080 Ti', brand: 'NVIDIA', rasterIndex: 31, rtIndex: 23, vram: 11, bandwidth: 616, power: 250, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2080s', name: 'GeForce RTX 2080 Super', brand: 'NVIDIA', rasterIndex: 26, rtIndex: 19.5, vram: 8, bandwidth: 496, power: 250, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2080', name: 'GeForce RTX 2080', brand: 'NVIDIA', rasterIndex: 24.5, rtIndex: 18.5, vram: 8, bandwidth: 448, power: 215, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2070s', name: 'GeForce RTX 2070 Super', brand: 'NVIDIA', rasterIndex: 23, rtIndex: 17, vram: 8, bandwidth: 448, power: 215, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2070', name: 'GeForce RTX 2070', brand: 'NVIDIA', rasterIndex: 20, rtIndex: 15, vram: 8, bandwidth: 448, power: 175, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2060s', name: 'GeForce RTX 2060 Super', brand: 'NVIDIA', rasterIndex: 18.5, rtIndex: 14, vram: 8, bandwidth: 448, power: 175, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rtx2060', name: 'GeForce RTX 2060', brand: 'NVIDIA', rasterIndex: 16, rtIndex: 12, vram: 6, bandwidth: 336, power: 160, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  // NVIDIA GTX 16 (Turing, no ray-tracing hardware)
  { id: 'gtx1660s', name: 'GeForce GTX 1660 Super', brand: 'NVIDIA', rasterIndex: 13, rtIndex: 1.6, vram: 6, bandwidth: 336, power: 125, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1660ti', name: 'GeForce GTX 1660 Ti', brand: 'NVIDIA', rasterIndex: 13, rtIndex: 1.6, vram: 6, bandwidth: 288, power: 120, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1660', name: 'GeForce GTX 1660', brand: 'NVIDIA', rasterIndex: 11.5, rtIndex: 1.4, vram: 6, bandwidth: 192, power: 120, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1650s', name: 'GeForce GTX 1650 Super', brand: 'NVIDIA', rasterIndex: 9.5, rtIndex: 1.1, vram: 4, bandwidth: 192, power: 100, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1650', name: 'GeForce GTX 1650', brand: 'NVIDIA', rasterIndex: 7.5, rtIndex: 0.9, vram: 4, bandwidth: 128, power: 75, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  // NVIDIA GTX 10 (Pascal, no ray-tracing hardware)
  { id: 'gtx1080ti', name: 'GeForce GTX 1080 Ti', brand: 'NVIDIA', rasterIndex: 21, rtIndex: 2.5, vram: 11, bandwidth: 484, power: 250, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1080', name: 'GeForce GTX 1080', brand: 'NVIDIA', rasterIndex: 16.5, rtIndex: 2, vram: 8, bandwidth: 320, power: 180, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1070', name: 'GeForce GTX 1070', brand: 'NVIDIA', rasterIndex: 13, rtIndex: 1.6, vram: 8, bandwidth: 256, power: 150, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1060', name: 'GeForce GTX 1060 6GB', brand: 'NVIDIA', rasterIndex: 10, rtIndex: 1.2, vram: 6, bandwidth: 192, power: 120, lengthMm: 250, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1050ti', name: 'GeForce GTX 1050 Ti', brand: 'NVIDIA', rasterIndex: 6, rtIndex: 0.7, vram: 4, bandwidth: 112, power: 75, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  // AMD RX 7000 extras
  { id: 'rx7900gre', name: 'Radeon RX 7900 GRE', brand: 'AMD', rasterIndex: 47, rtIndex: 32, vram: 16, bandwidth: 576, power: 260, lengthMm: 276, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx7600xt', name: 'Radeon RX 7600 XT', brand: 'AMD', rasterIndex: 25, rtIndex: 16, vram: 16, bandwidth: 288, power: 190, lengthMm: 204, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  // AMD RX 6000 (RDNA 2)
  { id: 'rx6950xt', name: 'Radeon RX 6950 XT', brand: 'AMD', rasterIndex: 50, rtIndex: 31, vram: 16, bandwidth: 576, power: 335, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6900xt', name: 'Radeon RX 6900 XT', brand: 'AMD', rasterIndex: 47, rtIndex: 29, vram: 16, bandwidth: 512, power: 300, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6800xt', name: 'Radeon RX 6800 XT', brand: 'AMD', rasterIndex: 44, rtIndex: 27, vram: 16, bandwidth: 512, power: 300, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6800', name: 'Radeon RX 6800', brand: 'AMD', rasterIndex: 38, rtIndex: 23.5, vram: 16, bandwidth: 512, power: 250, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6750xt', name: 'Radeon RX 6750 XT', brand: 'AMD', rasterIndex: 31, rtIndex: 19, vram: 12, bandwidth: 432, power: 250, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6700xt', name: 'Radeon RX 6700 XT', brand: 'AMD', rasterIndex: 29, rtIndex: 18, vram: 12, bandwidth: 384, power: 230, lengthMm: 267, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6700', name: 'Radeon RX 6700 10GB', brand: 'AMD', rasterIndex: 26, rtIndex: 16, vram: 10, bandwidth: 320, power: 175, lengthMm: 250, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6650xt', name: 'Radeon RX 6650 XT', brand: 'AMD', rasterIndex: 24, rtIndex: 15, vram: 8, bandwidth: 280, power: 180, lengthMm: 240, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6600xt', name: 'Radeon RX 6600 XT', brand: 'AMD', rasterIndex: 23, rtIndex: 14, vram: 8, bandwidth: 256, power: 160, lengthMm: 240, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6600', name: 'Radeon RX 6600', brand: 'AMD', rasterIndex: 20, rtIndex: 12.5, vram: 8, bandwidth: 224, power: 132, lengthMm: 200, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx6500xt', name: 'Radeon RX 6500 XT', brand: 'AMD', rasterIndex: 9.5, rtIndex: 5.5, vram: 4, bandwidth: 144, power: 107, lengthMm: 190, pcieLanes: 4, pcieGen: 4, cuda: false, needs12v2x6: false },
  // AMD RX 5000 (RDNA 1, no ray-tracing hardware)
  { id: 'rx5700xt', name: 'Radeon RX 5700 XT', brand: 'AMD', rasterIndex: 21, rtIndex: 2.5, vram: 8, bandwidth: 448, power: 225, lengthMm: 272, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx5700', name: 'Radeon RX 5700', brand: 'AMD', rasterIndex: 19, rtIndex: 2.3, vram: 8, bandwidth: 448, power: 180, lengthMm: 268, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx5600xt', name: 'Radeon RX 5600 XT', brand: 'AMD', rasterIndex: 17, rtIndex: 2, vram: 6, bandwidth: 288, power: 150, lengthMm: 240, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx5500xt', name: 'Radeon RX 5500 XT 8GB', brand: 'AMD', rasterIndex: 11, rtIndex: 1.3, vram: 8, bandwidth: 224, power: 130, lengthMm: 200, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  // Intel Arc extras
  { id: 'arc-b570', name: 'Arc B570', brand: 'Intel', rasterIndex: 22, rtIndex: 19, vram: 10, bandwidth: 380, power: 150, lengthMm: 250, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'arc-a770', name: 'Arc A770 16GB', brand: 'Intel', rasterIndex: 22, rtIndex: 19, vram: 16, bandwidth: 560, power: 225, lengthMm: 272, pcieLanes: 16, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'arc-a580', name: 'Arc A580', brand: 'Intel', rasterIndex: 18, rtIndex: 15, vram: 8, bandwidth: 512, power: 185, lengthMm: 250, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'arc-a380', name: 'Arc A380', brand: 'Intel', rasterIndex: 7, rtIndex: 6, vram: 6, bandwidth: 186, power: 75, lengthMm: 190, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  // ---- Complete line-ups, remaining models ----
  { id: 'rtx5050', name: 'GeForce RTX 5050', brand: 'NVIDIA', rasterIndex: 23.5, rtIndex: 21.5, vram: 8, bandwidth: 320, power: 130, lengthMm: 210, pcieLanes: 8, pcieGen: 5, cuda: true, needs12v2x6: false },
  { id: 'rtx3080-12', name: 'GeForce RTX 3080 12GB', brand: 'NVIDIA', rasterIndex: 43, rtIndex: 39, vram: 12, bandwidth: 912, power: 350, lengthMm: 285, pcieLanes: 16, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx3050-6', name: 'GeForce RTX 3050 6GB', brand: 'NVIDIA', rasterIndex: 11, rtIndex: 9.5, vram: 6, bandwidth: 168, power: 70, lengthMm: 180, pcieLanes: 8, pcieGen: 4, cuda: true, needs12v2x6: false },
  { id: 'rtx2060-12', name: 'GeForce RTX 2060 12GB', brand: 'NVIDIA', rasterIndex: 17.5, rtIndex: 13, vram: 12, bandwidth: 336, power: 185, lengthMm: 229, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1630', name: 'GeForce GTX 1630', brand: 'NVIDIA', rasterIndex: 4.5, rtIndex: 0.5, vram: 4, bandwidth: 96, power: 75, lengthMm: 180, pcieLanes: 8, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1070ti', name: 'GeForce GTX 1070 Ti', brand: 'NVIDIA', rasterIndex: 15, rtIndex: 1.8, vram: 8, bandwidth: 256, power: 180, lengthMm: 267, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1060-3', name: 'GeForce GTX 1060 3GB', brand: 'NVIDIA', rasterIndex: 9, rtIndex: 1.1, vram: 3, bandwidth: 192, power: 120, lengthMm: 250, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gtx1050', name: 'GeForce GTX 1050 2GB', brand: 'NVIDIA', rasterIndex: 4.8, rtIndex: 0.6, vram: 2, bandwidth: 112, power: 75, lengthMm: 180, pcieLanes: 16, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'gt1030', name: 'GeForce GT 1030', brand: 'NVIDIA', rasterIndex: 2.5, rtIndex: 0.3, vram: 2, bandwidth: 48, power: 30, lengthMm: 150, pcieLanes: 4, pcieGen: 3, cuda: true, needs12v2x6: false },
  { id: 'rx9060xt8', name: 'Radeon RX 9060 XT 8GB', brand: 'AMD', rasterIndex: 32.5, rtIndex: 25.5, vram: 8, bandwidth: 320, power: 150, lengthMm: 240, pcieLanes: 16, pcieGen: 5, cuda: false, needs12v2x6: false },
  { id: 'rx6400', name: 'Radeon RX 6400', brand: 'AMD', rasterIndex: 6.5, rtIndex: 3.5, vram: 4, bandwidth: 128, power: 53, lengthMm: 170, pcieLanes: 4, pcieGen: 4, cuda: false, needs12v2x6: false },
  { id: 'rx5500xt4', name: 'Radeon RX 5500 XT 4GB', brand: 'AMD', rasterIndex: 10, rtIndex: 1.2, vram: 4, bandwidth: 224, power: 130, lengthMm: 200, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
  // AMD Vega / Radeon VII (no ray-tracing hardware)
  { id: 'radeon7', name: 'Radeon VII', brand: 'AMD', rasterIndex: 24, rtIndex: 2.9, vram: 16, bandwidth: 1024, power: 300, lengthMm: 280, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'vega64', name: 'Radeon RX Vega 64', brand: 'AMD', rasterIndex: 17, rtIndex: 2, vram: 8, bandwidth: 484, power: 295, lengthMm: 280, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'vega56', name: 'Radeon RX Vega 56', brand: 'AMD', rasterIndex: 15, rtIndex: 1.8, vram: 8, bandwidth: 410, power: 210, lengthMm: 280, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  // AMD Polaris RX 400 / 500 (no ray-tracing hardware)
  { id: 'rx590', name: 'Radeon RX 590', brand: 'AMD', rasterIndex: 10.5, rtIndex: 1.2, vram: 8, bandwidth: 256, power: 225, lengthMm: 250, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'rx580', name: 'Radeon RX 580 8GB', brand: 'AMD', rasterIndex: 9.5, rtIndex: 1.1, vram: 8, bandwidth: 256, power: 185, lengthMm: 241, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'rx570', name: 'Radeon RX 570 4GB', brand: 'AMD', rasterIndex: 8, rtIndex: 0.9, vram: 4, bandwidth: 224, power: 150, lengthMm: 241, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'rx560', name: 'Radeon RX 560 4GB', brand: 'AMD', rasterIndex: 4.5, rtIndex: 0.5, vram: 4, bandwidth: 112, power: 75, lengthMm: 170, pcieLanes: 8, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'rx480', name: 'Radeon RX 480 8GB', brand: 'AMD', rasterIndex: 9.2, rtIndex: 1.1, vram: 8, bandwidth: 256, power: 150, lengthMm: 241, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  { id: 'rx470', name: 'Radeon RX 470 4GB', brand: 'AMD', rasterIndex: 7.8, rtIndex: 0.9, vram: 4, bandwidth: 211, power: 120, lengthMm: 241, pcieLanes: 16, pcieGen: 3, cuda: false, needs12v2x6: false },
  // Intel Arc entry
  { id: 'arc-a310', name: 'Arc A310', brand: 'Intel', rasterIndex: 4.5, rtIndex: 3.8, vram: 4, bandwidth: 124, power: 75, lengthMm: 170, pcieLanes: 8, pcieGen: 4, cuda: false, needs12v2x6: false },
];
