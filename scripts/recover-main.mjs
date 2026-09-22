// 字节级恢复（修正版）：匹配 buf.toString('utf8') 的宽松解码行为，
// 为每个 U+FFFD 记录其保留的前导字节，据此得到 64 个候选字符，再用 dist 词典精确消歧。
import { readFileSync, writeFileSync } from 'node:fs';

const buf = readFileSync('src/main.jsx');
const dist = readFileSync('dist/index.html', 'utf8');
const FFFD = '\uFFFD';
const NA = /[^\x00-\x7f\uFFFD]/;

// 宽松解码（与 buf.toString('utf8') 一致，采用“最大子部分”替换）
function decode(buf) {
  const chars = [];
  const meta = []; // {byteStart, bytes, lead, cont1}
  let i = 0;
  while (i < buf.length) {
    const start = i;
    const b = buf[i];
    if (b < 0x80) { chars.push(String.fromCharCode(b)); meta.push({ byteStart: start, bytes: 1 }); i += 1; continue; }
    let n = 0, need = 0, cp = 0;
    if (b >= 0xC2 && b <= 0xDF) { n = 2; need = 1; cp = b & 0x1F; }
    else if (b >= 0xE0 && b <= 0xEF) { n = 3; need = 2; cp = b & 0x0F; }
    else if (b >= 0xF0 && b <= 0xF4) { n = 4; need = 3; cp = b & 0x07; }
    else { chars.push(FFFD); meta.push({ byteStart: start, bytes: 1, lead: b }); i += 1; continue; }
    let k = 0;
    while (k < need && i + 1 + k < buf.length && (buf[i + 1 + k] & 0xC0) === 0x80) k++;
    if (k === need) {
      for (let j = 0; j < k; j++) cp = (cp << 6) | (buf[i + 1 + j] & 0x3F);
      chars.push(String.fromCodePoint(cp));
      meta.push({ byteStart: start, bytes: 1 + k });
      i += 1 + k;
    } else {
      chars.push(FFFD);
      meta.push({ byteStart: start, bytes: 1 + k, lead: b, cont1: k >= 1 ? buf[i + 1] : undefined });
      i += 1 + k;
    }
  }
  return { text: chars.join(''), meta };
}

const { text, meta } = decode(buf);
console.log('decoded length:', text.length, 'vs buf.toString:', buf.toString('utf8').length);

// 收集 U+FFFD 及其 meta
const bad = [];
for (let ci = 0; ci < text.length; ci++) if (text[ci] === FFFD) bad.push(ci);
console.log('U+FFFD count:', bad.length);

// 每个损坏位置对应的 meta（byteStart）
const metaByChar = new Map();
meta.forEach((m, idx) => metaByChar.set(idx, m));
// 更精确：按 char index 顺序存 meta 数组即可
const metaOfChar = meta; // meta[i] 对应 text[i]

function candidatesFor(lead, cont1) {
  const chars = [];
  if (lead >= 0xE0 && lead <= 0xEF && cont1 != null) {
    const base = ((lead & 0x0F) << 12) | ((cont1 & 0x3F) << 6);
    for (let x = 0x80; x <= 0xBF; x++) chars.push(String.fromCodePoint(base | (x & 0x3F)));
  } else if (lead >= 0xC2 && lead <= 0xDF) {
    const base = (lead & 0x1F) << 6;
    for (let x = 0x80; x <= 0xBF; x++) chars.push(String.fromCodePoint(base | (x & 0x3F)));
  }
  return chars;
}

function beforeRun(t, pos) { let s = pos; while (s > 0 && NA.test(t[s - 1])) s--; return t.slice(s, pos); }
function afterRun(t, pos) { let e = pos; while (e < t.length && NA.test(t[e])) e++; return t.slice(pos, e); }

const fixes = [];
for (const pos of bad) {
  const m = metaOfChar[pos] || {};
  const lead = m.lead;
  const cont1 = m.cont1;
  let len = 1;
  if (text[pos + 1] === '?') len = 2;
  const cands = candidatesFor(lead, cont1);
  const before = beforeRun(text, pos);
  const after = afterRun(text, pos + len);
  let to = null;

  if (cands.length) {
    // 方法1：before 后缀 + 候选字符
    for (let k = Math.min(before.length, 30); k >= 1 && !to; k--) {
      const anchor = before.slice(-k);
      const hits = new Set();
      let idx = -1;
      while ((idx = dist.indexOf(anchor, idx + 1)) >= 0) {
        const nc = dist[idx + anchor.length] || '';
        if (cands.includes(nc)) hits.add(nc);
      }
      if (hits.size === 1) { to = [...hits][0]; break; }
      if (hits.size > 1 && k === 1) break;
    }
    // 方法2：候选字符 + after（处理 before 为空/歧义）
    if (!to && after) {
      for (const c of cands) {
        if (dist.includes(c + after)) { to = c; break; }
      }
    }
    // 方法3：候选字符出现在 dist 且前后为 ASCII（standalone）
    if (!to && !before && !after) {
      const hit = cands.filter(c => {
        let idx = -1;
        while ((idx = dist.indexOf(c, idx + 1)) >= 0) {
          const pre = dist[idx - 1] || '';
          const post = dist[idx + c.length] || '';
          if (/[\x00-\x7f]/.test(pre) && /[\x00-\x7f]/.test(post)) return true;
        }
        return false;
      });
      if (hit.length === 1) to = hit[0];
    }
  }
  fixes.push({ pos, len, to });
}

const ok = fixes.filter(f => f.to).length;
const fail = fixes.filter(f => !f.to);
console.log('fixable:', ok, 'unresolved:', fail.length);

let out = text;
for (const f of [...fixes].reverse()) if (f.to) out = out.slice(0, f.pos) + f.to + out.slice(f.pos + f.len);
writeFileSync('src/main.jsx.recovered', out, 'utf8');
console.log('remaining U+FFFD:', (out.match(/\uFFFD/g) || []).length);
console.log('--- unresolved ---');
const ul = fail.map(f => {
  const m = metaOfChar[f.pos] || {};
  return 'LEAD=0x' + (m.lead?.toString(16) || '?') + ' CONT=0x' + (m.cont1?.toString(16) || '?') +
    ' before=' + JSON.stringify(text.slice(Math.max(0, f.pos - 26), f.pos)) +
    ' after=' + JSON.stringify(text.slice(f.pos + f.len, f.pos + f.len + 26));
});
writeFileSync('scripts/unresolved.txt', ul.join('\n'), 'utf8');
for (const f of fail.slice(0, 40)) {
  const m = metaOfChar[f.pos] || {};
  console.log('@', f.pos, 'lead=0x' + (m.lead?.toString(16) || '?'), 'cont=0x' + (m.cont1?.toString(16) || '?'),
    'before:', JSON.stringify(text.slice(Math.max(0, f.pos - 16), f.pos)),
    'after:', JSON.stringify(text.slice(f.pos + f.len, f.pos + f.len + 14)));
}
