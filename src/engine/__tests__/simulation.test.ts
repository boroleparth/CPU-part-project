import { estimateAi, evaluateBuild, evaluateWorkload, RESOLUTIONS, simulateFps, softMin } from '../simulation';
import { workloadById, type GamingWorkload } from '../workloads';
import { cpu, goodBuild, gpu, ram } from './helpers';

const aaa = workloadById.aaa as GamingWorkload;

describe('softMin', () => {
  it('is close to the smaller value and never exceeds it', () => {
    expect(softMin(100, 1000)).toBeCloseTo(100, 0);
    expect(softMin(100, 100)).toBeLessThan(100);
    expect(softMin(100, 100)).toBeGreaterThan(90);
    expect(softMin(0, 50)).toBe(0);
  });
});

describe('frame-rate model', () => {
  const unbalanced = { cpu: cpu('r5-5600'), gpu: gpu('rtx4090'), ram: ram('ddr4-2x16-3600') };

  it('shows a weak CPU bottlenecking a flagship GPU at 1080p but not at 4K', () => {
    const at1080 = simulateFps(unbalanced, aaa, '1080p');
    const at4k = simulateFps(unbalanced, aaa, '4K');
    expect(at1080.limitedBy).toBe('cpu');
    expect(at1080.bottleneck).toBeGreaterThan(0.3);
    expect(at4k.limitedBy).toBe('gpu');
  });

  it('keeps the CPU ceiling constant across resolutions while the GPU ceiling falls', () => {
    const pts = RESOLUTIONS.map((r) => simulateFps(unbalanced, aaa, r));
    expect(new Set(pts.map((p) => Math.round(p.cpuFps))).size).toBe(1);
    expect(pts[0].gpuFps).toBeGreaterThan(pts[1].gpuFps);
    expect(pts[1].gpuFps).toBeGreaterThan(pts[2].gpuFps);
  });

  it('penalises single-channel memory, less so on large-cache CPUs', () => {
    const dual = simulateFps({ ...goodBuild(), ram: ram('ddr5-2x16-6000') }, aaa, '1080p').cpuFps;
    const single = simulateFps({ ...goodBuild(), ram: ram('ddr5-1x16-5600') }, aaa, '1080p').cpuFps;
    expect(single).toBeLessThan(dual * 0.9);
    const x3d = { ...goodBuild(), cpu: cpu('r7-9800x3d') };
    const x3dDual = simulateFps({ ...x3d, ram: ram('ddr5-2x16-6000') }, aaa, '1080p').cpuFps;
    const x3dSingle = simulateFps({ ...x3d, ram: ram('ddr5-1x16-5600') }, aaa, '1080p').cpuFps;
    expect(1 - x3dSingle / x3dDual).toBeLessThan(1 - single / dual);
  });

  it('penalises 8 GB cards at 4K', () => {
    const b = { ...goodBuild(), cpu: cpu('r7-9800x3d') };
    const eight = simulateFps({ ...b, gpu: gpu('rtx5060') }, aaa, '4K').gpuFps;
    const sixteen = simulateFps({ ...b, gpu: gpu('rtx5060ti16') }, aaa, '4K').gpuFps;
    expect(sixteen / eight).toBeGreaterThan(1.25); // only ~17% raw speed difference
  });

  it('rates a mainstream matched pair as balanced at 1440p', () => {
    const r = evaluateWorkload(goodBuild(), 'aaa', '1440p');
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.tone).toBe('good');
  });
});

describe('throughput model', () => {
  it('flags a weak CPU paired with a strong GPU for video editing', () => {
    const b = { ...goodBuild(), cpu: cpu('i3-14100f'), motherboard: undefined, gpu: gpu('rtx4090'), ram: ram('ddr5-2x32-6000') };
    const r = evaluateWorkload(b, 'video', '1440p');
    expect(r.throughput!.weakest).toBe('cpuMulti');
    expect(r.score).toBeLessThan(60);
  });

  it('flags too little RAM', () => {
    const b = { ...goodBuild(), cpu: cpu('r9-9950x'), gpu: gpu('rtx4080s'), ram: ram('ddr5-2x8-5200') };
    const r = evaluateWorkload(b, 'video', '1440p');
    expect(r.throughput!.weakest).toBe('ram');
  });

  it('does not penalise RAM or storage that are already sufficient', () => {
    const b = { ...goodBuild(), ram: ram('ddr5-2x32-6000') };
    expect(evaluateWorkload(b, 'video', '1440p').throughput!.deficiency).toBe(1);
  });
});

describe('local AI estimate', () => {
  it('scales model size with VRAM and speed with bandwidth', () => {
    const small = estimateAi({ gpu: gpu('rtx4060') });
    const big = estimateAi({ gpu: gpu('rtx4090') });
    expect(big.maxModelB).toBeGreaterThan(small.maxModelB * 2);
    expect(big.tokensPerSec8B).toBeGreaterThan(small.tokensPerSec8B * 3);
  });
});

describe('evaluateBuild', () => {
  it('weights the overall score toward the worst workload', () => {
    const b = { ...goodBuild(), ram: ram('ddr5-2x8-5200') };
    const e = evaluateBuild(b, ['aaa', 'video'], '1440p');
    const avg = e.results.reduce((a, r) => a + r.score, 0) / e.results.length;
    expect(e.overall).toBeLessThan(avg);
  });
});
