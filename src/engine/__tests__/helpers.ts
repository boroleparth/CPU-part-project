import { cases, coolers, cpus, gpus, laptopCpus as laptopCpusList, laptopGpus as laptopGpusList, motherboards, psus, ramKits, storages } from '../../data';
import type { Build } from '../types';

const find = <T extends { id: string }>(list: T[], id: string): T => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`Unknown part id: ${id}`);
  return item;
};

export const cpu = (id: string) => find(cpus, id);
export const gpu = (id: string) => find(gpus, id);
export const board = (id: string) => find(motherboards, id);
export const ram = (id: string) => find(ramKits, id);
export const psu = (id: string) => find(psus, id);
export const cooler = (id: string) => find(coolers, id);
export const pcCase = (id: string) => find(cases, id);
export const storage = (id: string) => find(storages, id);

/** A known-good mainstream AM5 build. */
export const goodBuild = (): Build => ({
  cpu: cpu('r5-7600'),
  motherboard: board('am5-b650-atx'),
  ram: ram('ddr5-2x16-6000'),
  gpu: gpu('rtx4070s'),
  storage: storage('nvme4-1tb'),
  cooler: cooler('tower-single'),
  psu: psu('psu-750'),
  case: pcCase('case-mid'),
});

export const laptopCpu = (id: string) => find(laptopCpusList, id);
export const laptopGpu = (id: string) => find(laptopGpusList, id);
