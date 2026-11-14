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
];
