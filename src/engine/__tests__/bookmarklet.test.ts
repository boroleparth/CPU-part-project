import { bookmarkletHref, bookmarkletSource, readBookmarkletHash } from '../../bookmarklet';

describe('Check in PC Harmony bookmark', () => {
  it('is valid JavaScript that opens this site', () => {
    const src = bookmarkletSource('https://boroleparth.github.io/CPU-part-project/');
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain("'https://boroleparth.github.io/CPU-part-project/'");
    const href = bookmarkletHref('https://boroleparth.github.io/CPU-part-project/');
    expect(href.startsWith('javascript:')).toBe(true);
    expect(() => new Function(decodeURIComponent(href.slice('javascript:'.length)))).not.toThrow();
  });

  it('hands the page text and its address to Check a link', () => {
    const hash = `#text=${encodeURIComponent('Processor Variant: 13620H')}&src=${encodeURIComponent('https://www.flipkart.com/hp-victus/p/itm1')}`;
    expect(readBookmarkletHash(hash)).toBe('https://www.flipkart.com/hp-victus/p/itm1\nProcessor Variant: 13620H');
    expect(readBookmarkletHash('#b=cpu:r5-7600')).toBeUndefined();
    expect(readBookmarkletHash(`#text=x&src=${encodeURIComponent('javascript:alert(1)')}`)).toBe('x');
  });
});
