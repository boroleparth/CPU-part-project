import { normalise, parseListing, storeOf } from '../listing';

const flipkart = 'https://www.flipkart.com/asus-tuf-gaming-f15-core-i7-11th-gen-11800h-16-gb-512-gb-ssd-windows-11-home-6-gb-graphics-nvidia-geforce-rtx-3060-144-hz-fx506hm-hn095w-gaming-laptop/p/itm6f3e8e3d1c1a0?pid=COMG6YH';
const croma = 'https://www.croma.com/hp-victus-15-fa1351tx-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-ssd-windows-11-nvidia-geforce-rtx-4050-6gb-15-6-inch-fhd-ips-display-144hz-mica-silver-/p/300857';
const reliance = 'https://www.reliancedigital.in/lenovo-loq-15irx9-gaming-laptop-intel-core-i7-13650hx-16-gb-512-gb-ssd-nvidia-geforce-rtx-4060-8-gb-windows-11-home-ms-office-39-62-cm-15-6-inch-luna-grey/p/494335817';
const amazon = 'https://www.amazon.in/ASUS-15-6-inch-i7-11800H-GeForce-FX506HM-HN095W/dp/B09KX5XYZ1/ref=sr_1_3';
const vijay = 'https://www.vijaysales.com/p/P123/acer-nitro-v-15-anv15-51-intel-core-i5-13420h-8gb-ram-512gb-ssd-rtx-4050-6gb-15-6-inch-fhd-144hz-gaming-laptop';

describe('reading store links', () => {
  it('names the store', () => {
    expect(storeOf(flipkart)).toBe('Flipkart');
    expect(storeOf(croma)).toBe('Croma');
    expect(storeOf(reliance)).toBe('Reliance Digital');
    expect(storeOf(amazon)).toBe('Amazon');
    expect(storeOf('https://www.tatacliq.com/x/p-mp000')).toBe('Tata CLiQ');
    expect(storeOf('https://www.asus.com/in/laptops/x/')).toBe('ASUS');
  });

  it('reads a Flipkart link with "11th gen" before the model number', () => {
    const r = parseListing(flipkart);
    expect(r.device).toBe('laptop');
    expect(r.cpu.part?.id).toBe('i7-11800h');
    expect(r.gpu.part?.family).toBe('RTX 3060 Laptop');
    expect(r.gpu.assumed).toBe(true); // power not listed
    expect(r.ram.part?.totalGb).toBe(16);
    expect(r.ram.part?.type).toBe('DDR4');
    expect(r.storage.part?.capacityGb).toBe(512);
    expect(r.refreshHz).toBe(144);
  });

  it('uses the model code when the listing only says "i5 13th gen" (HP Victus 15-fa1xxx: i5-13420H), with alternatives', () => {
    const r = parseListing(croma);
    expect(r.cpu.part?.id).toBe('i5-13420h');
    expect(r.cpu.assumed).toBe(true);
    const ids = r.cpu.candidates!.map((c) => c.id);
    expect(ids).toContain('i5-13420h');
    expect(ids).not.toContain('i5-1335u');
    expect(r.gpu.part?.family).toBe('RTX 4050 Laptop');
    expect(r.ram.part?.type).toBe('DDR5');
    expect(r.resolution).toBe('1080p');
  });

  it('asks which processor when neither the listing nor the model code settles it', () => {
    const r = parseListing('https://www.croma.com/hp-omen-16-wd0990tx-intel-core-i5-13th-gen-16-1-inch-16gb-512gb-windows-11-home-ms-office-2021-nvidia-geforce-rtx-4050-fhd-ips-display-shadow-black-88y66pa-/p/274584');
    expect(r.cpu.status).toBe('choose');
    expect(r.cpu.candidates!.every((c) => c.laptop)).toBe(true); // "16.1 inch" / OMEN: no desktop chips
    expect(r.storage.part?.capacityGb).toBe(512); // "16gb 512gb" without "ssd"
  });

  it('reads Reliance Digital and Vijay Sales links (id before or after the name)', () => {
    const a = parseListing(reliance);
    expect(a.cpu.part?.id).toBe('i7-13650hx');
    expect(a.gpu.part?.family).toBe('RTX 4060 Laptop');
    const b = parseListing(vijay);
    expect(b.cpu.part?.id).toBe('i5-13420h');
    expect(b.ram.part).toMatchObject({ totalGb: 8, sticks: 1 });
  });

  it('reads what an Amazon link has and leaves the rest to choose', () => {
    const r = parseListing(amazon);
    expect(r.store).toBe('Amazon');
    expect(r.cpu.part?.id).toBe('i7-11800h');
    expect(r.gpu.status).toBe('missing');
    expect(r.needsText).toBe(false);
  });

  it('asks for the product text when a link has no specs in it', () => {
    expect(parseListing('https://amzn.in/d/2xYz9Ab').needsText).toBe(true);
    expect(parseListing('https://dl.flipkart.com/s/abc123').needsText).toBe(true);
    expect(parseListing('https://www.lenovo.com/in/en/p/laptops/legion-laptops/legion-pro-series/len101g0030').needsText).toBe(true);
  });
});

describe('reading copied product pages (title + spec table)', () => {
  it('finds the exact processor in a Flipkart spec table when the title only says "i7 13th Gen"', () => {
    const r = parseListing(`HP Victus Intel Core i7 13th Gen - (16 GB/512 GB SSD/Windows 11 Home/6 GB Graphics/NVIDIA GeForce RTX 4050) 15-fa1351TX Gaming Laptop
Processor Brand: Intel
Processor Name: Core i7
Processor Generation: 13th Gen
Processor Variant: 13620H
SSD Capacity: 512 GB
RAM: 16 GB
RAM Type: DDR4
RAM Frequency: 3200 MHz
Expandable Memory: Upto 32 GB
Graphic Processor: NVIDIA GeForce RTX 4050
Dedicated Graphic Memory Capacity: 6 GB
Screen Resolution: 1920 x 1080 Pixel
Refresh Rate: 144 Hz`);
    expect(r.cpu.part?.id).toBe('i7-13620h');
    expect(r.gpu.part?.family).toBe('RTX 4050 Laptop');
    expect(r.ram.part).toMatchObject({ totalGb: 16, type: 'DDR4', speed: 3200 });
    expect(r.storage.part?.capacityGb).toBe(512);
    expect(r.resolution).toBe('1080p');
    expect(r.refreshHz).toBe(144);
  });

  it('reads an Amazon technical-details table and feature bullets', () => {
    const r = parseListing(`Lenovo LOQ 2024, Intel Core i7 13th Gen, NVIDIA RTX 4060-8GB, 16GB RAM, 1TB SSD, FHD 144Hz, 15.6"/39.6cm, Windows 11, Gaming Laptop
Hard Disk Size: 1 TB
CPU Model: Core i7
RAM Memory Installed Size: 16 GB
Maximum Memory Supported: 32 GB
Memory Technology: DDR5
Hard Disk Description: SSD
Graphics Coprocessor: NVIDIA GeForce RTX 4060
Graphics Card Ram Size: 8 GB
• Processor: 13th Gen Intel Core i7-13650HX (14C, 6P+8E) up to 4.9GHz
• Memory: 16GB (1x16GB) DDR5 4800MHz`);
    expect(r.cpu.part?.id).toBe('i7-13650hx');
    expect(r.gpu.part?.family).toBe('RTX 4060 Laptop');
    expect(r.ram.part).toMatchObject({ totalGb: 16, sticks: 1, type: 'DDR5' });
    expect(r.storage.part?.capacityGb).toBe(1000);
  });

  it('reads storage given only as a spec row', () => {
    const r = parseListing('Intel Core i5-13420H, RTX 4050, RAM: 8 GB, Hard Disk Size: 512 GB, Hard Disk Description: SSD');
    expect(r.storage.part?.capacityGb).toBe(512);
    expect(r.ram.part?.totalGb).toBe(8);
  });
});

describe('reading pasted product text', () => {
  it('reads an Amazon title, taking "4GB" as graphics memory, not RAM', () => {
    const r = parseListing('ASUS TUF Gaming F15, 15.6"(39.62 cm) FHD 144Hz, Intel Core i7-11800H 11th Gen, 4GB NVIDIA GeForce RTX 3050 Ti, Gaming Laptop (16GB RAM/512GB SSD/Windows 11/Graphite Black/2.3 Kg) FX506HE');
    expect(r.cpu.part?.id).toBe('i7-11800h');
    expect(r.gpu.part?.family).toBe('RTX 3050 Ti Laptop');
    expect(r.ram.part?.totalGb).toBe(16);
    expect(r.storage.part?.capacityGb).toBe(512);
    expect(r.resolution).toBe('1080p');
  });

  it('reads a spec list with graphics power, sticks and memory speed', () => {
    const r = parseListing('Lenovo Legion Pro 7i Gen 9, Intel Core i9-14900HX, NVIDIA GeForce RTX 4080 12GB GDDR6, 175W TGP, 32GB (2x16GB) DDR5 5600MHz, 1TB PCIe Gen4 SSD, 16" WQXGA 240Hz');
    expect(r.gpu.part?.id).toBe('rtx4080m-175');
    expect(r.gpu.assumed).toBeFalsy();
    expect(r.ram.part).toMatchObject({ totalGb: 32, sticks: 2, type: 'DDR5', speed: 5600 });
    expect(r.ram.assumed).toBeFalsy();
    expect(r.storage.part?.id).toBe('nvme4-1tb');
    expect(r.resolution).toBe('1440p');
    expect(r.refreshHz).toBe(240);
  });

  it('picks the nearest power version for a listed TGP', () => {
    expect(parseListing('RTX 3060 laptop 105W TGP, i7-11800H').gpu.part?.tgp).toBe(95);
  });

  it('reads a desktop PC and the right memory variant of a card', () => {
    const r = parseListing('Gaming PC - Intel Core i5-12400F, RTX 3060 12GB, 16GB DDR4 3200MHz (2x8GB), 1TB NVMe SSD');
    expect(r.device).toBe('desktop');
    expect(r.cpu.part?.id).toBe('i5-12400f');
    expect(r.gpu.part?.id).toBe('rtx3060-12');
    expect(r.ram.part).toMatchObject({ totalGb: 16, sticks: 2, type: 'DDR4' });
  });

  it('reads a thin laptop with integrated graphics and soldered memory', () => {
    const r = parseListing('ASUS Zenbook 14 OLED, Intel Core Ultra 7 258V, 32GB LPDDR5X 8533, 1TB SSD, Intel Arc 140V graphics, 3K 120Hz');
    expect(r.cpu.part?.id).toBe('cu7-258v');
    expect(r.gpu.status).toBe('none');
    expect(r.ram.part?.laptopOnly).toBe(true);
  });

  it('says clearly when a processor is not covered yet', () => {
    const r = parseListing('HP 15s, AMD Ryzen 5 7520U, 8GB LPDDR5, 512GB SSD');
    expect(r.cpu.status).toBe('unsupported');
    expect(r.cpu.note).toMatch(/not in our database/i);
  });

  it('rejects a desktop processor when the user says it is a laptop', () => {
    const r = parseListing('Intel Core i5-12400F, RTX 3060', 'laptop');
    expect(r.cpu.status).toBe('unsupported');
  });

  it('does not mistake RAM right after the graphics chip for graphics memory', () => {
    const r = parseListing('ASUS TUF F15, Intel Core i7-11800H, 6GB NVIDIA GeForce RTX 3060, 16GB RAM, 512GB SSD');
    expect(r.ram.part?.totalGb).toBe(16);
    const d = parseListing('Gaming PC Core i5-12400F RTX 3060 16GB DDR4 1TB SSD');
    expect(d.ram.part?.totalGb).toBe(16);
    expect(d.gpu.status).toBe('choose'); // 8 GB or 12 GB card: not stated
  });

  it('normalises separators', () => {
    expect(normalise('Core_i7-11800H/16GB+512GB')).toBe('core i7 11800h 16gb 512gb');
  });
});

/** Real product links found on the stores (Nov 2026), with what each link itself contains. */
describe('real store links', () => {
  const cases: [string, string, string | undefined, number | undefined][] = [
    // [link, processor, graphics family, RAM GB]
    ['https://www.flipkart.com/lenovo-loq-intel-core-i7-13th-gen-13620h-16-gb-512-gb-ssd-windows-11-home-8-graphics-nvidia-geforce-rtx-4060-15irh8-gaming-laptop/p/itm0a107f7d8e2af', 'i7-13620h', 'RTX 4060 Laptop', 16],
    ['https://www.flipkart.com/gigabyte-g6-kf-h3in853sh-intel-core-i7-13th-gen-g-series-16-gb-512-gb-ssd-windows-11-home-6-graphics-nvidia-geforce-rtx-4060-165-hz-gaming-laptop/p/itmc0a0fd11d7fd4', 'i7-13620h', 'RTX 4060 Laptop', 16],
    ['https://www.flipkart.com/hp-omen-intel-core-i7-13th-gen-13700hx-16-gb-512-gb-ssd-windows-11-home-8-graphics-nvidia-geforce-rtx-4060-16-wf0055tx-gaming-laptop/p/itmf8ab1adff347c', 'i7-13700hx', 'RTX 4060 Laptop', 16],
    ['https://www.flipkart.com/acer-predator-helios-16-core-i7-13th-gen-16-gb-512-gb-ssd-windows-11-home-8-graphics-nvidia-geforce-rtx-4060-ph16-71-gaming-laptop/p/itm3e3225513534d', 'i7-13700hx', 'RTX 4060 Laptop', 16],
    ['https://www.flipkart.com/colorful-p15-intel-core-i7-12th-gen-12650h-16-gb-512-gb-ssd-windows-11-home-8-graphics-nvidia-geforce-rtx-4060-23-hf76b16512e-b-sa-gaming-laptop/p/itm539c6f24a89a5', 'i7-12650h', 'RTX 4060 Laptop', 16],
    ['https://www.croma.com/acer-nitro-5-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-windows-11-home-6gb-graphics-15-6-inch-144-hz-fhd-ips-display-nvidia-geforce-rtx-4050-ms-office-2021-obsidian-black-2-13-kg-/p/302709', 'i5-13420h', 'RTX 4050 Laptop', 16],
    ['https://www.croma.com/acer-16-predator-neo-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-ssd-windows-11-home-6gb-graphics-16-inch-165-hz-qhd-led-backlit-display-nvidia-geforce-rtx-4050-obsidian-black-2-6-kg-/p/272086', 'i5-13500hx', 'RTX 4050 Laptop', 16],
    ['https://www.croma.com/lenovo-loq-15irx9-intel-core-i5-13th-gen-gaming-laptop-24gb-512gb-ssd-windows-11-home-6gb-graphics-15-6-inch-144-hz-full-hd-ips-display-nvidia-geforce-rtx-4050-ms-office-home-2024-luna-grey-2-38-kg-/p/314362', 'i5-13450hx', 'RTX 4050 Laptop', 24],
    ['https://www.croma.com/msi-thin-15-b13ve-2611in-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-ssd-windows-11-home-6gb-graphics-15-6-inch-144-hz-full-hd-display-nvidia-geforce-rtx-4050-ms-office-2021-cosmos-gray-1-86-kg-/p/311031', 'i5-13420h', 'RTX 4050 Laptop', 16],
    ['https://www.croma.com/hp-victus-15-fa2375tx-intel-core-i5-13th-gen-gaming-laptop-16gb-512gb-ssd-windows-11-home-6gb-graphics-15-6-inch-144-hz-full-hd-ips-display-nvidia-geforce-rtx-4050-performance-blue-2-29-kg-/p/318675', 'i5-13420h', 'RTX 4050 Laptop', 16],
    // Amazon links keep only part of the title: the processor is there, the rest has to be pasted.
    ['https://www.amazon.in/HP-Victus-i5-13420H-Flicker-Free-Enhanced/dp/B0F79G1XW6', 'i5-13420h', undefined, undefined],
    ['https://www.amazon.in/Lenovo-i5-13450HX-300Nits-Graphics-83DV007GIN/dp/B0D49W5KZP', 'i5-13450hx', undefined, undefined],
    ['https://www.amazon.in/Acer-i5-13420H-Graphics-Display-ANV15-51/dp/B0CHJJZ9G8', 'i5-13420h', undefined, undefined],
  ];
  for (const [url, cpu, gpu, ram] of cases) {
    it(url.split('/')[3].slice(0, 60), () => {
      const r = parseListing(url);
      expect(r.device).toBe('laptop');
      expect(r.cpu.part?.id).toBe(cpu);
      expect(r.gpu.part?.family).toBe(gpu);
      expect(r.ram.part?.totalGb).toBe(ram);
      if (gpu) expect(r.storage.part?.capacityGb).toBe(512);
    });
  }

  it('reads an Amazon link plus its pasted title completely', () => {
    const r = parseListing('https://www.amazon.in/HP-Victus-i5-13420H-Flicker-Free-Enhanced/dp/B0F79G1XW6 HP Victus, 13th Gen Intel Core i5-13420H, RTX 4050-6GB, 16GB DDR4, 512GB SSD, FHD IPS, 15.6"/39.6cm, 144Hz, Win 11, Office21, Mica Silver, 2.29kg, fa1279TX, Flicker-Free Enhanced Cooling Gaming Laptop');
    expect(r.cpu.part?.id).toBe('i5-13420h');
    expect(r.gpu.part?.family).toBe('RTX 4050 Laptop');
    expect(r.ram.part).toMatchObject({ totalGb: 16, type: 'DDR4' });
    expect(r.storage.part?.capacityGb).toBe(512);
    expect(r.refreshHz).toBe(144);
  });
});
