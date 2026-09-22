import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { deflateRawSync, createInflateRaw, inflateRawSync } from 'node:zlib';
import path from 'node:path';

const FORMAT = 'xingmu-project-package';
const VERSION = '1.0.0';
const MAX_PACKAGE_BYTES = 500_000_000;
const MAX_ENTRIES = 10_000;
const MAX_UNCOMPRESSED_BYTES = 1_000_000_000;
const MAX_JSON_ENTRY_BYTES = 32_000_000;
const STREAM_CHUNK_BYTES = 1024 * 1024;
const importLocks = new Map();
const sha256 = data => createHash('sha256').update(data).digest('hex');
const cleanProjectId = value => { const id = String(value || ''); if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw Object.assign(new Error('项目 ID 无效。'), { code:'PACKAGE_PROJECT_ID_INVALID' }); return id; };
const safeEntryPath = value => { const raw = String(value || '').replaceAll('\\', '/'); const normalized = path.posix.normalize(raw); if (!raw || normalized === '.' || normalized.startsWith('/') || normalized.includes('..') || /^[A-Za-z]:/.test(raw) || normalized !== raw) throw Object.assign(new Error(`项目包路径不安全：${raw}`), { code:'PACKAGE_PATH_INVALID' }); return normalized; };
const assetRef = value => String(value || '').match(/^asset:\/\/([a-zA-Z0-9_-]+)$/)?.[1] || '';
const apiAsset = value => { const match = String(value || '').match(/^\/api\/assets\/([^/]+)\/(.+)$/); return match ? { scope:decodeURIComponent(match[1]), name:decodeURIComponent(match[2]) } : null; };
const sourceRef = (value, projectId) => String(value || '') === `/api/projects/${encodeURIComponent(projectId)}/source`;
const credentialKey = key => /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization|secret)$/i.test(String(key));
const absolutePath = value => /^[A-Za-z]:[\\/]/.test(String(value || '')) || /^\\\\/.test(String(value || ''));

function sanitizeValue(value, sensitive = []) {
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, sensitive));
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (credentialKey(key)) { sensitive.push(key); continue; }
    output[key] = sanitizeValue(item, sensitive);
  }
  return output;
}

function walkStrings(value, callback, prefix = '$') {
  if (Array.isArray(value)) return value.forEach((item, index) => walkStrings(item, callback, `${prefix}[${index}]`));
  if (!value || typeof value !== 'object') return callback(value, prefix);
  for (const [key, item] of Object.entries(value)) walkStrings(item, callback, `${prefix}.${key}`);
}

function replaceRefs(value, references) {
  if (Array.isArray(value)) return value.map(item => replaceRefs(item, references));
  if (!value || typeof value !== 'object') {
    const key = String(value || '');
    return references.get(key) || value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceRefs(item, references)]));
}

async function filesUnder(root, prefix = '') {
  const entries = await readdir(root, { withFileTypes:true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesUnder(path.join(root, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

function crc32Update(crc, buffer) {
  for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return crc >>> 0;
}

function crc32(buffer) {
  return (crc32Update(0xffffffff, buffer) ^ 0xffffffff) >>> 0;
}

const supportedZipMethod = method => method === 0 || method === 8;
const unsupportedZipError = () => Object.assign(new Error('项目包仅支持未加密的存储或 deflate 条目。'), { code:'PACKAGE_ZIP_UNSUPPORTED' });
const zip64Error = () => Object.assign(new Error('项目包使用 Zip64 扩展，当前上限内无需 Zip64；请导出为标准 ZIP。'), { code:'PACKAGE_ZIP_UNSUPPORTED' });

function decodeZipData(data, method, expectedBytes) {
  if (method === 0) {
    if (data.length !== expectedBytes) throw Object.assign(new Error('项目包条目长度与目录不一致。'), { code:'PACKAGE_ZIP_INVALID' });
    return data;
  }
  if (method !== 8) throw unsupportedZipError();
  try {
    const decoded = inflateRawSync(data, { maxOutputLength: expectedBytes });
    if (decoded.length !== expectedBytes) throw Object.assign(new Error('项目包 deflate 条目解压长度不一致。'), { code:'PACKAGE_ZIP_INVALID' });
    return decoded;
  } catch (error) {
    if (error.code === 'PACKAGE_ZIP_INVALID') throw error;
    throw Object.assign(new Error('项目包 deflate 条目解压失败。'), { code:'PACKAGE_ZIP_INVALID' });
  }
}

function dosTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return { time:(date.getHours()<<11) | (date.getMinutes()<<5) | Math.floor(date.getSeconds()/2), date:((year-1980)<<9) | ((date.getMonth()+1)<<5) | date.getDate() };
}

function createZip(entries) {
  const local = []; const central = []; let offset = 0; const now = dosTime();
  for (const entry of entries) {
    const name = Buffer.from(safeEntryPath(entry.path)); const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data); const compressed = entry.compression === 'deflate' ? deflateRawSync(raw) : raw; const method = entry.compression === 'deflate' ? 8 : 0; const crc = crc32(raw);
    const header = Buffer.alloc(30 + name.length); header.writeUInt32LE(0x04034b50,0); header.writeUInt16LE(20,4); header.writeUInt16LE(0,6); header.writeUInt16LE(method,8); header.writeUInt16LE(now.time,10); header.writeUInt16LE(now.date,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(compressed.length,18); header.writeUInt32LE(raw.length,22); header.writeUInt16LE(name.length,26); header.writeUInt16LE(0,28); name.copy(header,30); local.push(header,compressed);
    const record = Buffer.alloc(46 + name.length); record.writeUInt32LE(0x02014b50,0); record.writeUInt16LE(20,4); record.writeUInt16LE(20,6); record.writeUInt16LE(0,8); record.writeUInt16LE(method,10); record.writeUInt16LE(now.time,12); record.writeUInt16LE(now.date,14); record.writeUInt32LE(crc,16); record.writeUInt32LE(compressed.length,20); record.writeUInt32LE(raw.length,24); record.writeUInt16LE(name.length,28); record.writeUInt16LE(0,30); record.writeUInt16LE(0,32); record.writeUInt16LE(0,34); record.writeUInt16LE(0,36); record.writeUInt32LE(0,38); record.writeUInt32LE(offset,42); name.copy(record,46); central.push(record); offset += header.length + compressed.length;
  }
  const centralData = Buffer.concat(central); const localData = Buffer.concat(local); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(0,4); end.writeUInt16LE(0,6); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(centralData.length,12); end.writeUInt32LE(localData.length,16); end.writeUInt16LE(0,20); return Buffer.concat([localData,centralData,end]);
}

function parseZip(buffer) {
  if (buffer.length > MAX_PACKAGE_BYTES) throw Object.assign(new Error('项目包超过 500MB 限制。'), { code:'PACKAGE_TOO_LARGE' });
  let end = -1; for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65_557); index--) if (buffer.readUInt32LE(index) === 0x06054b50) { end = index; break; }
  if (end < 0) throw Object.assign(new Error('项目包 ZIP 结束记录无效。'), { code:'PACKAGE_ZIP_INVALID' });
  const count = buffer.readUInt16LE(end+10); const centralSize = buffer.readUInt32LE(end+12); const centralOffset = buffer.readUInt32LE(end+16); if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw zip64Error(); if (count > MAX_ENTRIES || centralOffset + centralSize > buffer.length) throw Object.assign(new Error('项目包目录超限或越界。'), { code:'PACKAGE_ZIP_INVALID' });
  const entries = new Map(); let cursor = centralOffset; let total = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw Object.assign(new Error('项目包中央目录损坏。'), { code:'PACKAGE_ZIP_INVALID' });
    const flags = buffer.readUInt16LE(cursor + 8); const method = buffer.readUInt16LE(cursor + 10); const compressed = buffer.readUInt32LE(cursor + 20); const uncompressed = buffer.readUInt32LE(cursor + 24); const nameLength = buffer.readUInt16LE(cursor + 28); const extraLength = buffer.readUInt16LE(cursor + 30); const commentLength = buffer.readUInt16LE(cursor + 32); const localOffset = buffer.readUInt32LE(cursor + 42);
    if (count === 0xffff || compressed === 0xffffffff || uncompressed === 0xffffffff || localOffset === 0xffffffff) throw zip64Error();
    if (flags & 1 || !supportedZipMethod(method) || localOffset >= buffer.length) throw flags & 1 || !supportedZipMethod(method) ? unsupportedZipError() : Object.assign(new Error('项目包目录越界。'), { code:'PACKAGE_ZIP_INVALID' });
    const name = safeEntryPath(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    if (entries.has(name)) throw Object.assign(new Error(`项目包存在重复条目：${name}`), { code:'PACKAGE_DUPLICATE_ENTRY' });
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw Object.assign(new Error(`项目包本地条目无效：${name}`), { code:'PACKAGE_ZIP_INVALID' });
    const localFlags = buffer.readUInt16LE(localOffset + 6); const localMethod = buffer.readUInt16LE(localOffset + 8); const localCompressed = buffer.readUInt32LE(localOffset + 18); const localUncompressed = buffer.readUInt32LE(localOffset + 22); const localNameLength = buffer.readUInt16LE(localOffset + 26); const localExtraLength = buffer.readUInt16LE(localOffset + 28); const start = localOffset + 30 + localNameLength + localExtraLength;
    if (localFlags !== flags || localMethod !== method || localCompressed !== compressed || localUncompressed !== uncompressed) throw Object.assign(new Error(`项目包本地条目与目录不一致：${name}`), { code:'PACKAGE_ZIP_INVALID' });
    if (start + compressed > buffer.length) throw Object.assign(new Error(`项目包条目越界：${name}`), { code:'PACKAGE_ZIP_INVALID' });
    const data = decodeZipData(buffer.subarray(start, start + compressed), method, uncompressed);
    if (crc32(data) !== buffer.readUInt32LE(cursor + 16)) throw Object.assign(new Error(`项目包 CRC 校验失败：${name}`), { code:'PACKAGE_CHECKSUM_MISMATCH' });
    total += data.length; if (total > MAX_UNCOMPRESSED_BYTES) throw Object.assign(new Error('项目包解压后超过 1GB 限制。'), { code:'PACKAGE_TOO_LARGE' }); entries.set(name, data); cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function validateZipStructure(buffer) {
  if (buffer.length < 22) throw Object.assign(new Error('项目包 ZIP 结束记录无效。'), { code:'PACKAGE_ZIP_INVALID' });
  let end = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65_557); index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) { end = index; break; }
  }
  if (end < 0 || end + 22 > buffer.length) throw Object.assign(new Error('项目包 ZIP 结束记录无效。'), { code:'PACKAGE_ZIP_INVALID' });
  const count = buffer.readUInt16LE(end + 10);
  const centralSize = buffer.readUInt32LE(end + 12);
  const centralOffset = buffer.readUInt32LE(end + 16);
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw zip64Error();
  const centralEnd = centralOffset + centralSize;
  if (count > MAX_ENTRIES || centralEnd > end || centralEnd > buffer.length) throw Object.assign(new Error('项目包目录超限或越界。'), { code:'PACKAGE_ZIP_INVALID' });
  const entries = new Set();
  let cursor = centralOffset;
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > centralEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) throw Object.assign(new Error('项目包中央目录损坏。'), { code:'PACKAGE_ZIP_INVALID' });
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const uncompressed = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > centralEnd) throw Object.assign(new Error('项目包中央目录条目越界。'), { code:'PACKAGE_ZIP_INVALID' });
    if (flags & 1 || !supportedZipMethod(method) || compressed === 0xffffffff || uncompressed === 0xffffffff || localOffset === 0xffffffff) throw flags & 1 || !supportedZipMethod(method) ? unsupportedZipError() : zip64Error();
    const name = safeEntryPath(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    if (entries.has(name)) throw Object.assign(new Error(`项目包存在重复条目：${name}`), { code:'PACKAGE_DUPLICATE_ENTRY' });
    entries.add(name);
    if (localOffset + 30 > buffer.length || localOffset >= centralOffset || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw Object.assign(new Error(`项目包本地条目无效：${name}`), { code:'PACKAGE_ZIP_INVALID' });
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart > centralOffset || dataStart + compressed > centralOffset || dataStart + compressed > buffer.length) throw Object.assign(new Error(`项目包条目越界：${name}`), { code:'PACKAGE_ZIP_INVALID' });
    total += uncompressed;
    if (total > MAX_UNCOMPRESSED_BYTES) throw Object.assign(new Error('项目包解压后超过 1GB 限制。'), { code:'PACKAGE_TOO_LARGE' });
    cursor = recordEnd;
  }
  if (cursor !== centralEnd) throw Object.assign(new Error('项目包中央目录长度不一致。'), { code:'PACKAGE_ZIP_INVALID' });
}

function parseCheckedZip(buffer) {
  if (buffer.length > MAX_PACKAGE_BYTES) throw Object.assign(new Error('项目包超过 500MB 限制。'), { code:'PACKAGE_TOO_LARGE' });
  validateZipStructure(buffer);
  return parseZip(buffer);
}

function entryData(entry) { return Buffer.isBuffer(entry) ? entry : entry?.data || null; }
function entryBytes(entry) { return Buffer.isBuffer(entry) ? entry.length : Number(entry?.bytes || 0); }
function entrySha256(entry) { return Buffer.isBuffer(entry) ? sha256(entry) : String(entry?.sha256 || ''); }
function jsonEntry(entries, name) { const data=entryData(entries.get(name)); if(!data) throw Object.assign(new Error(`项目包缺少 ${name}。`), { code:'PACKAGE_MANIFEST_INVALID' }); try{return JSON.parse(data.toString('utf8'));}catch{throw Object.assign(new Error(`${name} 不是有效 JSON。`), { code:'PACKAGE_MANIFEST_INVALID' });} }

function inspectZipEntries(entries) {
  const manifest=jsonEntry(entries,'manifest.json');
  if(manifest.format!==FORMAT||manifest.version!==VERSION||!Array.isArray(manifest.entries))throw Object.assign(new Error('项目包 manifest 版本或格式不支持。'),{code:'PACKAGE_MANIFEST_INVALID'});
  const projectPath=safeEntryPath(manifest.project?.path||'project.json'); const project=jsonEntry(entries,projectPath); const projectEntry=entries.get(projectPath); const expected=manifest.project?.sha256;
  if(expected&&entrySha256(projectEntry)!==expected)throw Object.assign(new Error('项目数据 SHA-256 校验失败。'),{code:'PACKAGE_CHECKSUM_MISMATCH'});
  for(const item of manifest.entries){const entry=entries.get(safeEntryPath(item.path));if(!entry||entryBytes(entry)!==item.bytes||entrySha256(entry)!==item.sha256)throw Object.assign(new Error(`项目包媒体校验失败：${item.path}`),{code:'PACKAGE_CHECKSUM_MISMATCH'});}
  const preflight=preflightProject(project,manifest); return {legacy:false,manifest,project,preflight,entries};
}

async function readExact(handle, position, length) {
  if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < 0 || length < 0) throw Object.assign(new Error('项目包 ZIP 读取范围无效。'), { code:'PACKAGE_ZIP_INVALID' });
  const output=Buffer.alloc(length); let offset=0;
  while(offset<length){const result=await handle.read(output,offset,length-offset,position+offset);if(!result.bytesRead)throw Object.assign(new Error('项目包 ZIP 数据不完整。'),{code:'PACKAGE_ZIP_INVALID'});offset+=result.bytesRead;}
  return output;
}

async function* readFileRange(handle, position, length) {
  let remaining=length; let offset=position;
  while(remaining>0){const size=Math.min(STREAM_CHUNK_BYTES,remaining);yield await readExact(handle,offset,size);offset+=size;remaining-=size;}
}

async function readZipEntry(handle, entry, collect = false) {
  if (collect && entry.bytes > MAX_JSON_ENTRY_BYTES) throw Object.assign(new Error(`${entry.name} 超过 JSON 条目大小限制。`), { code:'PACKAGE_MANIFEST_INVALID' });
  const digest=createHash('sha256'); const parts=collect?[]:null; let bytes=0; let crc=0xffffffff;
  const verifier=new Transform({ transform(chunk, encoding, callback) { bytes+=chunk.length; if(bytes>entry.bytes)return callback(Object.assign(new Error(`项目包条目解压后超出声明长度：${entry.name}`),{code:'PACKAGE_ZIP_INVALID'})); crc=crc32Update(crc,chunk);digest.update(chunk);if(parts)parts.push(chunk);callback(); } });
  const source=Readable.from(readFileRange(handle,entry.dataStart,entry.compressedBytes)); const decoder=entry.method===8?createInflateRaw():new Transform({ transform(chunk, encoding, callback) { callback(null,chunk); } });
  try { await pipeline(source,decoder,verifier); } catch(error) { if(error.code==='PACKAGE_ZIP_INVALID')throw error; throw Object.assign(new Error(`项目包 ${entry.method===8?'deflate ':''}条目解压失败：${entry.name}`),{code:'PACKAGE_ZIP_INVALID'}); }
  if(bytes!==entry.bytes)throw Object.assign(new Error(`项目包条目解压长度不一致：${entry.name}`),{code:'PACKAGE_ZIP_INVALID'});
  return { data:parts?Buffer.concat(parts):null, bytes, crc:(crc^0xffffffff)>>>0, sha256:digest.digest('hex') };
}

async function scanZipFile(filePath) {
  const info=await stat(filePath).catch(()=>null); if(!info?.isFile())throw Object.assign(new Error('项目包文件不存在。'),{code:'PACKAGE_ZIP_INVALID'});
  if(info.size>MAX_PACKAGE_BYTES)throw Object.assign(new Error('项目包超过 500MB 限制。'),{code:'PACKAGE_TOO_LARGE'});
  if(info.size<22)throw Object.assign(new Error('项目包 ZIP 结束记录无效。'),{code:'PACKAGE_ZIP_INVALID'});
  const handle=await open(filePath,'r');
  try {
    const tailStart=Math.max(0,info.size-65_557);const tail=await readExact(handle,tailStart,info.size-tailStart);let end=-1;
    for(let index=tail.length-22;index>=0;index--)if(tail.readUInt32LE(index)===0x06054b50){end=tailStart+index;break;}
    if(end<0||end+22>info.size)throw Object.assign(new Error('项目包 ZIP 结束记录无效。'),{code:'PACKAGE_ZIP_INVALID'});
    const eocd=tail.subarray(end-tailStart,end-tailStart+22);const disk=eocd.readUInt16LE(4);const centralDisk=eocd.readUInt16LE(6);const countDisk=eocd.readUInt16LE(8);const count=eocd.readUInt16LE(10);const centralSize=eocd.readUInt32LE(12);const centralOffset=eocd.readUInt32LE(16);if(count===0xffff||countDisk===0xffff||centralSize===0xffffffff||centralOffset===0xffffffff)throw zip64Error();const centralEnd=centralOffset+centralSize;
    if(disk!==0||centralDisk!==0||countDisk!==count||count>MAX_ENTRIES||centralEnd>end||centralEnd>info.size)throw Object.assign(new Error('项目包 ZIP 目录超限或越界。'),{code:'PACKAGE_ZIP_INVALID'});
    const entries=new Map();let cursor=0;let total=0;
    for(let index=0;index<count;index++){
      if(cursor+30>centralOffset)throw Object.assign(new Error('项目包本地条目损坏。'),{code:'PACKAGE_ZIP_INVALID'});
      const header=await readExact(handle,cursor,30);if(header.readUInt32LE(0)!==0x04034b50)throw Object.assign(new Error('项目包本地条目签名无效。'),{code:'PACKAGE_ZIP_INVALID'});
      const flags=header.readUInt16LE(6);const method=header.readUInt16LE(8);const crc=header.readUInt32LE(14);const compressed=header.readUInt32LE(18);const uncompressed=header.readUInt32LE(22);const nameLength=header.readUInt16LE(26);const extraLength=header.readUInt16LE(28);
      if(flags!==0||!supportedZipMethod(method)||compressed===0xffffffff||uncompressed===0xffffffff)throw flags!==0||!supportedZipMethod(method)?unsupportedZipError():zip64Error();
      const name=safeEntryPath((await readExact(handle,cursor+30,nameLength)).toString('utf8'));const dataStart=cursor+30+nameLength+extraLength;const dataEnd=dataStart+compressed;
      if(dataStart>centralOffset||dataEnd>centralOffset||dataEnd>info.size)throw Object.assign(new Error(`项目包条目越界：${name}`),{code:'PACKAGE_ZIP_INVALID'});
      if(entries.has(name))throw Object.assign(new Error(`项目包存在重复条目：${name}`),{code:'PACKAGE_DUPLICATE_ENTRY'});
      const entry={name,localOffset:cursor,dataStart,method,compressedBytes:compressed,bytes:uncompressed,crc};const checked=await readZipEntry(handle,entry,name==='manifest.json'||name==='project.json');
      if(checked.crc!==crc)throw Object.assign(new Error(`项目包 CRC 校验失败：${name}`),{code:'PACKAGE_CHECKSUM_MISMATCH'});
      total+=uncompressed;if(total>MAX_UNCOMPRESSED_BYTES)throw Object.assign(new Error('项目包解压后超过 1GB 限制。'),{code:'PACKAGE_TOO_LARGE'});
      entries.set(name,{...entry,data:checked.data,sha256:checked.sha256});cursor=dataEnd;
    }
    if(cursor!==centralOffset)throw Object.assign(new Error('项目包本地条目长度不一致。'),{code:'PACKAGE_ZIP_INVALID'});
    const centralEntries=new Map();cursor=centralOffset;
    for(let index=0;index<count;index++){
      if(cursor+46>centralEnd)throw Object.assign(new Error('项目包中央目录损坏。'),{code:'PACKAGE_ZIP_INVALID'});
      const header=await readExact(handle,cursor,46);if(header.readUInt32LE(0)!==0x02014b50)throw Object.assign(new Error('项目包中央目录损坏。'),{code:'PACKAGE_ZIP_INVALID'});
      const flags=header.readUInt16LE(8);const method=header.readUInt16LE(10);const crc=header.readUInt32LE(16);const compressed=header.readUInt32LE(20);const uncompressed=header.readUInt32LE(24);const nameLength=header.readUInt16LE(28);const extraLength=header.readUInt16LE(30);const commentLength=header.readUInt16LE(32);const localOffset=header.readUInt32LE(42);const recordEnd=cursor+46+nameLength+extraLength+commentLength;
      if(recordEnd>centralEnd)throw Object.assign(new Error('项目包中央目录条目越界。'),{code:'PACKAGE_ZIP_INVALID'});
      if(flags!==0||!supportedZipMethod(method))throw unsupportedZipError();
      if(compressed===0xffffffff||uncompressed===0xffffffff||localOffset===0xffffffff)throw zip64Error();
      const name=safeEntryPath((await readExact(handle,cursor+46,nameLength)).toString('utf8'));if(centralEntries.has(name))throw Object.assign(new Error(`项目包存在重复条目：${name}`),{code:'PACKAGE_DUPLICATE_ENTRY'});centralEntries.set(name,{bytes:uncompressed,compressedBytes:compressed,method,crc,localOffset});cursor=recordEnd;
    }
    if(cursor!==centralEnd||centralEntries.size!==entries.size)throw Object.assign(new Error('项目包中央目录长度或条目数不一致。'),{code:'PACKAGE_ZIP_INVALID'});
    for(const [name,entry] of entries){const central=centralEntries.get(name);if(!central||central.localOffset!==entry.localOffset||central.bytes!==entry.bytes||central.compressedBytes!==entry.compressedBytes||central.method!==entry.method||central.crc!==entry.crc)throw Object.assign(new Error(`项目包目录与本地条目不一致：${name}`),{code:'PACKAGE_ZIP_INVALID'});}
    return {entries};
  } finally { await handle.close().catch(()=>undefined); }
}

export async function inspectProjectPackageFile(inputPath) {
  const info=await stat(inputPath).catch(()=>null);if(!info?.isFile())throw Object.assign(new Error('项目包文件不存在。'),{code:'PACKAGE_FORMAT_INVALID'});if(info.size>MAX_PACKAGE_BYTES)throw Object.assign(new Error('项目包超过 500MB 限制。'),{code:'PACKAGE_TOO_LARGE'});
  const prefix=await open(inputPath,'r');let signature;try{signature=await readExact(prefix,0,Math.min(2,info.size));}finally{await prefix.close().catch(()=>undefined);}
  if(signature[0]!==0x50||signature[1]!==0x4b){if(info.size>MAX_JSON_ENTRY_BYTES)throw Object.assign(new Error('旧 JSON 项目包超过大小限制。'),{code:'PACKAGE_TOO_LARGE'});return inspectProjectPackage(await readFile(inputPath));}
  const scanned=await scanZipFile(inputPath);return inspectZipEntries(scanned.entries);
}

function preflightProject(project, manifest) {
  const sensitive=[]; sanitizeValue(project,sensitive); if(sensitive.length) throw Object.assign(new Error('项目包包含凭据字段。'), { code:'PACKAGE_CREDENTIALS_FOUND', fields:[...new Set(sensitive)] });
  const unsafe=[]; walkStrings(project,(value,location)=>{if(absolutePath(value))unsafe.push(location)}); if(unsafe.length) throw Object.assign(new Error('项目包包含本机绝对路径。'), { code:'PACKAGE_ABSOLUTE_PATH', locations:unsafe.slice(0,10) });
  const referenced=new Set(); walkStrings(project,value=>{const id=assetRef(value);if(id)referenced.add(id)});
  const rawRefs=[]; walkStrings(project,(value,location)=>{if(apiAsset(value))rawRefs.push({location,value})}); const listed=new Set((manifest.entries||[]).filter(item=>item.kind==='asset').map(item=>item.assetId)); const missing=[...referenced].filter(id=>!listed.has(id)); const missingRefs=[...(Array.isArray(manifest.missingRefs)?manifest.missingRefs:[]),...rawRefs.filter(item=>!manifest.missingRefs?.some(missingRef=>missingRef.location===item.location&&missingRef.value===item.value))]; return { referencedAssetIds:[...referenced], missingAssetIds:missing, missingRefs, complete:missing.length===0&&missingRefs.length===0 };
}

export async function createProjectPackage({ project, dataDir }) {
  const projectId=cleanProjectId(project?.id); const root=path.resolve(dataDir); const sensitive=[]; const sanitized=sanitizeValue(project,sensitive); if(sensitive.length) throw Object.assign(new Error('项目包含凭据字段，不能导出。'), { code:'PACKAGE_CREDENTIALS_FOUND', fields:[...new Set(sensitive)] });
  const unsafe=[]; walkStrings(sanitized,(value,location)=>{if(absolutePath(value))unsafe.push(location)}); if(unsafe.length) throw Object.assign(new Error('项目包含本机绝对路径，不能导出。'),{code:'PACKAGE_ABSOLUTE_PATH',locations:unsafe.slice(0,10)});
  const references=new Map(); const entries=[]; const usedIds=new Set(); const scopes=[projectId,'shared'];
  for (const scope of scopes) for (const relative of await filesUnder(path.join(root,'assets',scope))) { const source=path.join(root,'assets',scope,relative); const data=await readFile(source); const digest=sha256(data); let assetId=`asset-${digest.slice(0,24)}`; let suffix=1; while(usedIds.has(assetId)&&!entries.some(item=>item.assetId===assetId&&item.sha256===digest)){assetId=`asset-${digest.slice(0,20)}-${suffix++}`} if(usedIds.has(assetId)) { for(const key of [`/api/assets/${scope}/${encodeURIComponent(relative)}`,`/api/assets/${scope}/${relative}`]) references.set(key,`asset://${assetId}`); continue; } usedIds.add(assetId); const packagePath=`assets/${assetId}-${path.posix.basename(relative)}`; entries.push({path:packagePath,data,assetId,kind:'asset',scope,sourcePath:relative,bytes:data.length,sha256:digest}); for(const key of [`/api/assets/${scope}/${encodeURIComponent(relative)}`,`/api/assets/${scope}/${relative}`]) references.set(key,`asset://${assetId}`); }
  const sourceFile=path.join(root,'source-documents',`${projectId}.txt`); if(await stat(sourceFile).catch(()=>null)){const data=await readFile(sourceFile);entries.push({path:'sources/original.txt',data,assetId:'source-original',kind:'source',bytes:data.length,sha256:sha256(data)}); references.set(`/api/projects/${encodeURIComponent(projectId)}/source`,'package://sources/original.txt');}
  const packagedProject=replaceRefs(sanitized,references); const missingRefs=[]; walkStrings(sanitized,(value,location)=>{if(apiAsset(value)&&!references.has(value))missingRefs.push({location,value})}); const manifest={format:FORMAT,version:VERSION,projectId,createdAt:new Date().toISOString(),project:{path:'project.json'},entries:entries.map(item=>({path:item.path,assetId:item.assetId,kind:item.kind,scope:item.scope||'',sourcePath:item.sourcePath||'',bytes:item.bytes,sha256:item.sha256})),missingRefs}; const projectData=Buffer.from(JSON.stringify(packagedProject,null,2)); manifest.project.bytes=projectData.length; manifest.project.sha256=sha256(projectData); const manifestData=Buffer.from(JSON.stringify(manifest,null,2)); const zip=createZip([{path:'manifest.json',data:manifestData},{path:'project.json',data:projectData},...entries]); return {buffer:zip,manifest,project:packagedProject,preflight:{complete:missingRefs.length===0,missingRefs}};
}

async function hashFile(filePath) {
  const digest=createHash('sha256'); let crc=0xffffffff; let bytes=0;
  for await (const chunk of createReadStream(filePath,{highWaterMark:STREAM_CHUNK_BYTES})) { bytes+=chunk.length; digest.update(chunk); crc=crc32Update(crc,chunk); }
  return {bytes,sha256:digest.digest('hex'),crc:(crc^0xffffffff)>>>0};
}

function zipLocalHeader(entry, date) {
  const name=Buffer.from(safeEntryPath(entry.path)); const header=Buffer.alloc(30+name.length); header.writeUInt32LE(0x04034b50,0); header.writeUInt16LE(20,4); header.writeUInt16LE(0,6); header.writeUInt16LE(0,8); header.writeUInt16LE(date.time,10); header.writeUInt16LE(date.date,12); header.writeUInt32LE(entry.crc,14); header.writeUInt32LE(entry.bytes,18); header.writeUInt32LE(entry.bytes,22); header.writeUInt16LE(name.length,26); header.writeUInt16LE(0,28); name.copy(header,30); return header;
}

function zipCentralHeader(entry, date, offset) {
  const name=Buffer.from(safeEntryPath(entry.path)); const header=Buffer.alloc(46+name.length); header.writeUInt32LE(0x02014b50,0); header.writeUInt16LE(20,4); header.writeUInt16LE(20,6); header.writeUInt16LE(0,8); header.writeUInt16LE(0,10); header.writeUInt16LE(date.time,12); header.writeUInt16LE(date.date,14); header.writeUInt32LE(entry.crc,16); header.writeUInt32LE(entry.bytes,20); header.writeUInt32LE(entry.bytes,24); header.writeUInt16LE(name.length,28); header.writeUInt16LE(0,30); header.writeUInt16LE(0,32); header.writeUInt16LE(0,34); header.writeUInt16LE(0,36); header.writeUInt32LE(0,38); header.writeUInt32LE(offset,42); name.copy(header,46); return header;
}

async function* streamPackageEntry(entry) {
  if (!entry.filePath) { yield entry.data; return; }
  for await (const chunk of createReadStream(entry.filePath,{highWaterMark:STREAM_CHUNK_BYTES})) yield chunk;
}

export async function createProjectPackageStream({ project, dataDir }) {
  const projectId=cleanProjectId(project?.id); const root=path.resolve(dataDir); const sensitive=[]; const sanitized=sanitizeValue(project,sensitive); if(sensitive.length) throw Object.assign(new Error('项目包含凭据字段，不能导出。'), { code:'PACKAGE_CREDENTIALS_FOUND', fields:[...new Set(sensitive)] });
  const unsafe=[]; walkStrings(sanitized,(value,location)=>{if(absolutePath(value))unsafe.push(location)}); if(unsafe.length) throw Object.assign(new Error('项目包含本机绝对路径，不能导出。'),{code:'PACKAGE_ABSOLUTE_PATH',locations:unsafe.slice(0,10)});
  const references=new Map(); const entries=[]; const usedIds=new Set(); const scopes=[projectId,'shared'];
  for (const scope of scopes) for (const relative of await filesUnder(path.join(root,'assets',scope))) {
    const source=path.join(root,'assets',scope,relative); const hashed=await hashFile(source); let assetId=`asset-${hashed.sha256.slice(0,24)}`; let suffix=1;
    while(usedIds.has(assetId)&&!entries.some(item=>item.assetId===assetId&&item.sha256===hashed.sha256))assetId=`asset-${hashed.sha256.slice(0,20)}-${suffix++}`;
    if(usedIds.has(assetId)){for(const key of [`/api/assets/${scope}/${encodeURIComponent(relative)}`,`/api/assets/${scope}/${relative}`])references.set(key,`asset://${assetId}`);continue;}
    usedIds.add(assetId); const packagePath=`assets/${assetId}-${path.posix.basename(relative)}`; entries.push({path:packagePath,filePath:source,assetId,kind:'asset',scope,sourcePath:relative,bytes:hashed.bytes,sha256:hashed.sha256,crc:hashed.crc}); for(const key of [`/api/assets/${scope}/${encodeURIComponent(relative)}`,`/api/assets/${scope}/${relative}`])references.set(key,`asset://${assetId}`);
  }
  const sourceFile=path.join(root,'source-documents',`${projectId}.txt`); if(await stat(sourceFile).catch(()=>null)){const hashed=await hashFile(sourceFile);entries.push({path:'sources/original.txt',filePath:sourceFile,assetId:'source-original',kind:'source',bytes:hashed.bytes,sha256:hashed.sha256,crc:hashed.crc});references.set(`/api/projects/${encodeURIComponent(projectId)}/source`,'package://sources/original.txt');}
  const packagedProject=replaceRefs(sanitized,references); const missingRefs=[]; walkStrings(sanitized,(value,location)=>{if(apiAsset(value)&&!references.has(value))missingRefs.push({location,value})}); const manifest={format:FORMAT,version:VERSION,projectId,createdAt:new Date().toISOString(),project:{path:'project.json'},entries:entries.map(item=>({path:item.path,assetId:item.assetId,kind:item.kind,scope:item.scope||'',sourcePath:item.sourcePath||'',bytes:item.bytes,sha256:item.sha256})),missingRefs}; const projectData=Buffer.from(JSON.stringify(packagedProject,null,2)); manifest.project.bytes=projectData.length; manifest.project.sha256=sha256(projectData); const manifestData=Buffer.from(JSON.stringify(manifest,null,2)); const packageEntries=[{path:'manifest.json',data:manifestData,bytes:manifestData.length,crc:crc32(manifestData)},{path:'project.json',data:projectData,bytes:projectData.length,crc:crc32(projectData)},...entries];
  let offset=0; let centralSize=0; for(const entry of packageEntries){const nameLength=Buffer.byteLength(safeEntryPath(entry.path));offset+=30+nameLength+entry.bytes;centralSize+=46+nameLength;} const contentLength=offset+centralSize+22; if(contentLength>MAX_PACKAGE_BYTES)throw Object.assign(new Error('项目包超过 500MB 限制。'),{code:'PACKAGE_TOO_LARGE'});
  const stream=async function*(){const date=dosTime();for(const entry of packageEntries) { yield zipLocalHeader(entry,date); for await(const chunk of streamPackageEntry(entry)) yield chunk; } let centralOffset=0; for(const entry of packageEntries) { yield zipCentralHeader(entry,date,centralOffset); centralOffset+=30+Buffer.byteLength(safeEntryPath(entry.path))+entry.bytes; } const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(packageEntries.length,8);end.writeUInt16LE(packageEntries.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);end.writeUInt16LE(0,20);yield end;};
  return {stream,contentLength,manifest,project:packagedProject,preflight:{complete:missingRefs.length===0,missingRefs}};
}

export function inspectProjectPackage(input) {
  const buffer=Buffer.isBuffer(input)?input:Buffer.from(input); if(buffer.length>MAX_PACKAGE_BYTES)throw Object.assign(new Error('项目包超过 500MB 限制。'),{code:'PACKAGE_TOO_LARGE'}); if(!buffer.length)throw Object.assign(new Error('项目包为空。'),{code:'PACKAGE_EMPTY'});
  if(buffer[0]!==0x50||buffer[1]!==0x4b){let parsed;try{parsed=JSON.parse(buffer.toString('utf8'))}catch{throw Object.assign(new Error('项目包既不是 ZIP 也不是旧 JSON。'),{code:'PACKAGE_FORMAT_INVALID'})} const project=parsed?.project&&typeof parsed.project==='object'?parsed.project:parsed; const manifest={format:'xingmu-project-v1',version:'legacy',projectId:project.id||'',entries:[],legacy:true}; const preflight=preflightProject(project,manifest); return {legacy:true,manifest,project,preflight,entries:new Map()};}
  return inspectZipEntries(parseCheckedZip(buffer));
}

async function withImportLock(key, task) { const previous=importLocks.get(key)||Promise.resolve(); const current=previous.catch(()=>undefined).then(task); importLocks.set(key,current); try{return await current}finally{if(importLocks.get(key)===current)importLocks.delete(key)} }
async function availableProjectId(dataDir, requested, conflict, existingProjectIds=[]) {
  const occupied=new Set((Array.isArray(existingProjectIds)?existingProjectIds:[]).map(value=>cleanProjectId(value)).filter(Boolean));
  const isOccupied=async id=>occupied.has(id)||Boolean(await stat(path.join(dataDir,`${id}.json`)).catch(()=>null))||Boolean(await stat(path.join(dataDir,'assets',id)).catch(()=>null));
  const id=cleanProjectId(requested);
  if(!(await isOccupied(id)))return id;
  if(conflict==='reject')throw Object.assign(new Error(`项目 ID 已存在：${id}`),{code:'PACKAGE_PROJECT_CONFLICT'});
  for(let index=1;index<10000;index++){const candidate=`${id}-copy-${index}`;if(!(await isOccupied(candidate)))return candidate;}
  throw Object.assign(new Error('无法为冲突项目分配新 ID。'),{code:'PACKAGE_PROJECT_CONFLICT'});
}

async function copyPackageEntry(inputPath, entry, target) {
  const expected=inputPath?entry.bytes:entry.length;
  if (!inputPath) {
    if (entry.length !== expected) throw Object.assign(new Error('项目包条目写入不完整。'),{code:'PACKAGE_ZIP_INVALID'});
    await writeFile(target,entry,{flag:'wx'});
    return;
  }
  const handle=await open(inputPath,'r'); let written=0; let crc=0xffffffff;
  const verifier=new Transform({ transform(chunk, encoding, callback) { written+=chunk.length; if(written>expected)return callback(Object.assign(new Error('项目包条目写入超出声明长度。'),{code:'PACKAGE_ZIP_INVALID'})); crc=crc32Update(crc,chunk);callback(null,chunk); } });
  try {
    const source=Readable.from(readFileRange(handle,entry.dataStart,entry.compressedBytes)); const decoder=entry.method===8?createInflateRaw():new Transform({ transform(chunk, encoding, callback) { callback(null,chunk); } });
    await pipeline(source,decoder,verifier,createWriteStream(target,{flags:'wx'}));
  } catch(error) { if(error.code==='EEXIST')throw error; if(error.code==='PACKAGE_ZIP_INVALID')throw error; throw Object.assign(new Error('项目包条目写入失败。'),{code:'PACKAGE_ZIP_INVALID'}); }
  finally { await handle.close().catch(()=>undefined); }
  if(written!==expected||((crc^0xffffffff)>>>0)!==entry.crc)throw Object.assign(new Error('项目包条目校验失败。'),{code:'PACKAGE_CHECKSUM_MISMATCH'});
}

export async function importProjectPackage({ input, inputPath, dataDir, allowMissing=false, conflict='copy', existingProjectIds=[] }) {
  const inspected=inputPath?await inspectProjectPackageFile(inputPath):inspectProjectPackage(input); if(!inspected.preflight.complete&&!allowMissing)throw Object.assign(new Error('项目包存在缺失媒体，请先预检并显式允许缺失后再导入。'),{code:'PACKAGE_MISSING_ASSETS',preflight:inspected.preflight});
   const root=path.resolve(dataDir); await mkdir(root,{recursive:true}); const requested=cleanProjectId(inspected.project?.id||`import-${Date.now()}`); return withImportLock(requested,async()=>{const projectId=await availableProjectId(root,requested,conflict,existingProjectIds); const stage=path.join(root,`.import-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2)}`); const projectTarget=path.join(root,`${projectId}.json`); const assetsTarget=path.join(root,'assets',projectId); const sourceTarget=path.join(root,'source-documents',`${projectId}.txt`); const assetsStage=path.join(stage,'assets',projectId); const sourceStage=path.join(stage,'source-documents'); const refs=new Map(); const importedAssets=[]; let movedProject=false; let movedAssets=false; let movedSource=false; await mkdir(assetsStage,{recursive:true}); await mkdir(sourceStage,{recursive:true});
    try {
       for(const item of inspected.manifest.entries||[]){const data=inspected.entries.get(safeEntryPath(item.path));if(item.kind==='asset'){const filename=path.posix.basename(item.path);const target=path.join(assetsStage,filename);if(inputPath)await copyPackageEntry(inputPath,data,target);else await writeFile(target,data);importedAssets.push({assetId:item.assetId,name:filename,kind:item.kind,bytes:item.bytes,sha256:item.sha256});refs.set(`asset://${item.assetId}`,`/api/assets/${projectId}/${encodeURIComponent(filename)}`);} if(item.kind==='source'){const target=path.join(sourceStage,`${projectId}.txt`);if(inputPath)await copyPackageEntry(inputPath,data,target);else await writeFile(target,data);refs.set('package://sources/original.txt',`/api/projects/${encodeURIComponent(projectId)}/source`);}}
       for(const missing of inspected.preflight.missingRefs||[])if(missing.value)refs.set(missing.value,`missing://asset/${encodeURIComponent(missing.value)}`); const project=replaceRefs(inspected.project,refs);project.id=projectId;project.importedFrom={format:inspected.manifest.format,projectId:requested,importedAt:new Date().toISOString(),missingAssets:inspected.preflight.missingAssetIds||[],missingRefs:inspected.preflight.missingRefs||[]}; delete project.revision; await writeFile(path.join(stage,'project.json'),JSON.stringify(project,null,2),'utf8'); await mkdir(path.join(root,'assets'),{recursive:true}); await mkdir(path.join(root,'source-documents'),{recursive:true}); await rename(path.join(stage,'project.json'),projectTarget); movedProject=true; await rename(assetsStage,assetsTarget); movedAssets=true; const sourceFile=path.join(sourceStage,`${projectId}.txt`);if(await stat(sourceFile).catch(()=>null)){await rename(sourceFile,sourceTarget); movedSource=true;} return {projectId,project,assets:importedAssets,preflight:inspected.preflight,conflictCopied:projectId!==requested};
     } catch(error) { if(movedSource)await rm(sourceTarget,{force:true}).catch(()=>undefined); if(movedAssets)await rm(assetsTarget,{recursive:true,force:true}).catch(()=>undefined); if(movedProject)await rm(projectTarget,{force:true}).catch(()=>undefined); throw error; } finally { await rm(stage,{recursive:true,force:true}); }
  });
}

export { createZip, FORMAT as PROJECT_PACKAGE_FORMAT, VERSION as PROJECT_PACKAGE_VERSION, MAX_PACKAGE_BYTES as PROJECT_PACKAGE_MAX_BYTES };
