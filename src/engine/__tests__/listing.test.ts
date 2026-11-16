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

  it('asks which processor when the listing only says "i5 13th gen", leaving out low-power chips for gaming laptops', () => {
    const r = parseListing(croma);
    expect(r.cpu.status).toBe('choose');
    const ids = r.cpu.candidates!.map((c) => c.id);
    expect(ids).toContain('i5-13420h');
    expect(ids).not.toContain('i5-1335u');
    expect(r.gpu.part?.family).toBe('RTX 4050 Laptop');
    expect(r.ram.part?.type).toBe('DDR5');
    expect(r.resolution).toBe('1080p');
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
