import { readFileSync, writeFileSync } from 'node:fs';
// 反转：.corrupted.bak 是“GB2312 解码得到的乱码串再按 UTF-8 编码”的产物。
// 恢复：UTF-8 解码回乱码串 M，再用 GBK 编码回原始字节 O'。
import { TextDecoder, TextEncoder } from 'node:util';
import iconv from 'iconv-lite';

const c = readFileSync('src/main.jsx.corrupted.bak');
// strip BOM if present
let buf = c;
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) buf = buf.subarray(3);
const M = new TextDecoder('utf-8', { fatal: false }).decode(buf);
const Oprime = iconv.encode(M, 'gb2312');
const decoded = new TextDecoder('utf-8', { fatal: false }).decode(Oprime);
const fffd = (decoded.match(/\uFFFD/g) || []).length;
console.log('M chars:', M.length, '| Oprime bytes:', Oprime.length, '| U+FFFD in result:', fffd,
  '| has ScriptReader:', decoded.includes('ScriptReader'), '| has 阅读:', decoded.includes('阅读'));
writeFileSync('src/main.jsx.reversed-check', Oprime);
