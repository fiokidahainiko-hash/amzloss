/* Regenerates rss.xml from js/blog.js (the single source of truth the
   daily bot already updates). Run: node scripts/generate-rss.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'blog.js'), 'utf8');

const MONTHS = { Jan:'Jan',Feb:'Feb',Mar:'Mar',Apr:'Apr',May:'May',Jun:'Jun',
                 Jul:'Jul',Aug:'Aug',Sep:'Sep',Oct:'Oct',Nov:'Nov',Dec:'Dec' };
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toRFC822(s) {
  // "Aug 24, 2026" -> Wed, 24 Aug 2026 06:00:00 GMT
  const m = s.match(/(\w{3}) (\d+), (\d+)/);
  if (!m) return new Date().toUTCString();
  const monthIdx = Object.keys(MONTHS).indexOf(m[1]);
  const d = new Date(Date.UTC(Number(m[3]), monthIdx, Number(m[2]), 6, 0, 0));
  return `${DAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[m[1]]} ${d.getUTCFullYear()} 06:00:00 GMT`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const items = [];
const re = /\{[^{}]*?title:\s*"([^"]+)"[^{}]*?date:\s*"([^"]+)"[^{}]*?url:\s*"([^"]+)"[^{}]*?desc:\s*"([^"]*)"[^{}]*?\}/g;
let m;
while ((m = re.exec(src)) !== null) {
  const [, title, date, url, desc] = m;
  if (!url.includes('/')) continue;
  items.push({ title, date, url, desc });
}
if (!items.length) { console.error('no posts parsed'); process.exit(1); }

// newest first by parsed date (numeric tuple compare)
items.sort((a, b) => {
  const p = s => { const x = s.match(/(\w{3}) (\d+), (\d+)/);
    return [ +x[3], ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(x[1]), +x[2] ]; };
  const A = p(a.date), B = p(b.date);
  return B[0] - A[0] || B[1] - A[1] || B[2] - A[2];
});

const SITE = 'https://amzloss.com/';
const top = items.slice(0, 30);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>AmzLoss Blog</title>
<link>${SITE}</link>
<description>Audit your Amazon affiliate earnings, calculate commissions and grow traffic - new guides daily.</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link href="${SITE}rss.xml" rel="self" type="application/rss+xml"/>
${top.map(i => `<item>
<title>${esc(i.title)}</title>
<link>${SITE}${i.url}</link>
<guid isPermaLink="true">${SITE}${i.url}</guid>
<pubDate>${toRFC822(i.date)}</pubDate>
<description>${esc(i.desc)}</description>
</item>`).join('\n')}
</channel>
</rss>
`;

fs.writeFileSync(path.join(ROOT, 'rss.xml'), xml);
console.log('rss.xml written with', top.length, 'items; newest:', top[0].title);
