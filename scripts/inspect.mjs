import { readFileSync } from 'node:fs';
const b = readFileSync('src/main.jsx');
const s = b.toString('utf8');
console.log('has ScriptReader (utf8):', s.includes('ScriptReader'));
console.log('has ScriptReader (bytes):', b.includes(Buffer.from('ScriptReader')));
console.log('has 阅读 utf8:', s.includes('阅读'));
console.log('has 阅读 gbk D4C4C1A4:', b.includes(Buffer.from([0xd4, 0xc4, 0xc1, 0xa4])));
// find any occurrence of ScriptReader or its fragments
let idx = -1;
while ((idx = b.indexOf(Buffer.from('Script'), idx + 1)) >= 0) {
  console.log('Script@', idx, JSON.stringify(b.slice(idx, idx + 20).toString('latin1')));
}
// find the reading tab area: search for '场次表' and '人物关系' to locate tab block
const i2 = s.indexOf('人物关系');
console.log('人物关系 idx:', i2, JSON.stringify(s.slice(i2 - 120, i2 + 20)));
