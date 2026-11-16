// "Check in PC Harmony" bookmark button.
//
// Saved as a bookmark and clicked on a product page (Amazon, Flipkart, Croma, brand sites…), it
// runs in the viewer's own browser on the page they are looking at: it collects the title and
// the spec rows (tables, bullet lists) and opens PC Harmony's "Check a link" page with that text.
// The text travels in the URL hash (after #), which browsers never send to any server.

/** Collector that runs on the product page. `__SITE__` is replaced with this site's address. */
const collector = `(function(){
var SITE='__SITE__',seen={},out=[];
var KEY=/processor|cpu|core i|core ultra|ryzen|graphic|gpu|rtx|gtx|radeon|\\bram\\b|memory|ddr|ssd|storage|hard (disk|drive)|display|screen|refresh|hz|tgp|resolution|variant|generation/i;
function add(t){t=(t||'').replace(/\\s+/g,' ').trim();if(t&&t.length<400&&!seen[t]){seen[t]=1;out.push(t);}}
add(document.title);
['#productTitle','h1'].forEach(function(s){document.querySelectorAll(s).forEach(function(e){add(e.innerText);});});
document.querySelectorAll('tr').forEach(function(r){var c=[].map.call(r.cells,function(x){return x.innerText;}).join(': ');if(KEY.test(c))add(c);});
document.querySelectorAll('li,dt,dd,[class*=spec] div,[class*=Spec] div').forEach(function(e){if(e.children.length<6){var t=e.innerText;if(KEY.test(t))add(t);}});
var text=out.join('\\n').slice(0,6000);
var u=SITE+'#text='+encodeURIComponent(text)+'&src='+encodeURIComponent(location.origin+location.pathname);
if(!window.open(u,'_blank'))location.href=u;
})();`;

/** The bookmark's address (a javascript: URL) for a given site address. */
export function bookmarkletHref(site: string): string {
  return `javascript:${encodeURIComponent(collector.replace('__SITE__', site.replace(/'/g, '%27')).replace(/\n/g, ''))}`;
}

/** The collector's source, for tests. */
export const bookmarkletSource = (site: string) => collector.replace('__SITE__', site);

/** Reads `#text=...&src=...` written by the bookmark button. */
export function readBookmarkletHash(hash: string): string | undefined {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const text = params.get('text');
  if (!text) return undefined;
  const src = params.get('src');
  return src && /^https?:\/\//i.test(src) ? `${src}\n${text}` : text;
}
