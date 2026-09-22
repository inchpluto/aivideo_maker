import { readFileSync } from 'node:fs';
const d = readFileSync('dist/index.html', 'utf8');
const qs = readFileSync(new URL('./queries.txt', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean);
for (const q of qs) {
  let c = 0, i = -1;
  while ((i = d.indexOf(q, i + 1)) >= 0 && c < 3) {
    console.log('[' + q + '] ' + JSON.stringify(d.slice(Math.max(0, i - 28), i + q.length + 22)));
    c++;
  }
  if (c === 0) console.log('[' + q + '] NOTFOUND');
}
