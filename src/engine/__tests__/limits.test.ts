import { completeBuild } from '../builder';
import { limitReport } from '../limits';
import { evaluateWorkload } from '../simulation';
import type { Build, Resolution, WorkloadId } from '../types';
import { cpu, gpu, psu, ram } from './helpers';

const report = (b: Build, id: WorkloadId, res: Resolution) => limitReport(b, evaluateWorkload(b, id, res), res);

describe('limitReport', () => {
  it('names the CPU when a weak CPU holds back a flagship GPU', () => {
    const b = completeBuild({ cpu: cpu('r5-5600'), gpu: gpu('rtx4090'), ram: ram('ddr4-2x16-3600') });
    const r = report(b, 'aaa', '1080p');
    expect(r.bottleneck).toBe('CPU');
    expect(r.ideal).toBe(false);
    expect(r.items.find((i) => i.part === 'CPU')!.load).toBeGreaterThan(0.9);
    expect(r.items.find((i) => i.part === 'GPU')!.load).toBeLessThan(0.7);
  });

  it('calls a GPU-limited balanced build ideal', () => {
    const b = completeBuild({ cpu: cpu('r5-7600'), gpu: gpu('rtx4070s'), ram: ram('ddr5-2x16-6000') });
    const r = report(b, 'aaa', '1080p');
    expect(r.bottleneck).toBe('GPU');
    expect(r.ideal).toBe(true);
  });

  it('flags too little VRAM before CPU/GPU load', () => {
    const b = completeBuild({ cpu: cpu('r7-7800x3d'), gpu: gpu('rtx3070'), ram: ram('ddr5-2x16-6000') });
    expect(report(b, 'aaa', '4K').bottleneck).toBe('VRAM');
  });

  it('flags single-stick RAM and an undersized power supply', () => {
    const b = completeBuild({ cpu: cpu('r5-7600'), gpu: gpu('rtx4060'), ram: ram('ddr5-1x16-5600') });
    expect(report(b, 'esports', '1080p').bottleneck).toBe('RAM');
    const weakPsu = { ...completeBuild({ cpu: cpu('i9-14900k'), gpu: gpu('rtx4090'), ram: ram('ddr5-2x16-6000') }), psu: psu('psu-650') };
    expect(report(weakPsu, 'aaa', '4K').bottleneck).toBe('Power supply');
  });

  it('names the CPU for video editing on a weak CPU', () => {
    const b = completeBuild({ cpu: cpu('i3-12100f'), gpu: gpu('rtx4080'), ram: ram('ddr5-2x32-6000') });
    expect(report(b, 'video', '1440p').bottleneck).toBe('CPU');
  });
});
