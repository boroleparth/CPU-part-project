import { autoBuild, tiers, type Tier } from '../builder';
import { checkCompatibility } from '../compatibility';
import { evaluateBuild, minCpuIndexForGpu, RESOLUTIONS } from '../simulation';
import type { WorkloadId } from '../types';

const combos: WorkloadId[][] = [['aaa'], ['esports'], ['raytracing'], ['streaming'], ['video'], ['render3d'], ['ai'], ['office'], ['aaa', 'video'], ['aaa', 'ai', 'streaming']];

describe('autoBuild', () => {
  for (const { id: tier } of tiers) {
    for (const res of RESOLUTIONS) {
      for (const wl of combos) {
        it(`${tier} / ${res} / ${wl.join('+')} is a complete, compatible build`, () => {
          const { build } = autoBuild({ workloads: wl, resolution: res, tier: tier as Tier });
          expect(build.cpu && build.motherboard && build.ram && build.storage && build.cooler && build.psu && build.case).toBeTruthy();
          expect(checkCompatibility(build).filter((i) => i.severity === 'error')).toEqual([]);
        });
      }
    }
  }

  it('produces well-balanced gaming builds when targets are reachable', () => {
    for (const tier of ['entry', 'mid', 'high'] as Tier[]) {
      for (const res of ['1080p', '1440p'] as const) {
        const { build } = autoBuild({ workloads: ['aaa'], resolution: res, tier });
        expect(evaluateBuild(build, ['aaa'], res).overall).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('never pairs a low-end CPU with a high-end GPU for gaming', () => {
    for (const { id: tier } of tiers) {
      for (const res of RESOLUTIONS) {
        const { build } = autoBuild({ workloads: ['aaa'], resolution: res, tier });
        expect(build.cpu!.gamingIndex).toBeGreaterThanOrEqual(minCpuIndexForGpu(build.gpu!));
      }
    }
  });

  it('respects brand and form-factor preferences', () => {
    const { build } = autoBuild({ workloads: ['aaa'], resolution: '1440p', tier: 'mid', cpuBrand: 'Intel', gpuBrand: 'AMD', formFactor: 'ITX' });
    expect(build.cpu!.brand).toBe('Intel');
    expect(build.gpu!.brand).toBe('AMD');
    expect(build.motherboard!.formFactor).toBe('ITX');
  });

  it('prefers CUDA graphics for local AI when no brand is chosen', () => {
    expect(autoBuild({ workloads: ['ai'], resolution: '1440p', tier: 'mid' }).build.gpu!.cuda).toBe(true);
  });

  it('skips the graphics card for everyday-only builds', () => {
    const { build } = autoBuild({ workloads: ['office'], resolution: '1080p', tier: 'mid' });
    expect(build.gpu).toBeUndefined();
    expect(build.cpu!.hasIgpu).toBe(true);
  });
});
