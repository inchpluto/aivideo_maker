import { readFileSync, statSync, existsSync } from 'node:fs';
for (const f of ['src/main.jsx', 'src/main.jsx.recovered', 'src/main.jsx.corrupted.bak']) {
  if (!existsSync(f)) { console.log(f, 'MISSING'); continue; }
  const b = readFileSync(f);
  const s = b.toString('utf8');
  const lines = s.split(/\r?\n/).length;
  const fffd = (s.match(/\uFFFD/g) || []).length;
  console.log(f, '| bytes:', b.length, '| chars:', s.length, '| lines:', lines, '| U+FFFD:', fffd,
    '| ScriptReader:', s.includes('ScriptReader'), '| 阅读:', s.includes('阅读'),
    '| tabs:', (s.match(/\['[^']*剧本[^']*'\s*,\s*'[^']*'/g) || []).slice(0, 2));
}
