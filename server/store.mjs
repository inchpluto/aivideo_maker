import { mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import path from 'node:path';
import { isIP } from 'node:net';
import { inspectWorkflow } from './pipeline.mjs';
import { createSqliteBackend } from './sqliteBackend.mjs';

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const sqliteEnabled = String(process.env.STORAGE_BACKEND || '').toLowerCase() === 'sqlite';
const sqliteFile = path.resolve(process.env.SQLITE_DATABASE || path.join(dataDir, 'xingmu.sqlite'));
let sqliteBackendPromise;
const getSqliteBackend = async () => { if (!sqliteEnabled) return null; sqliteBackendPromise ||= createSqliteBackend(sqliteFile); return sqliteBackendPromise; };
export async function closeStoreBackend() { if (sqliteBackendPromise) { (await sqliteBackendPromise).close(); sqliteBackendPromise = null; } }
const safeId = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
const writeQueues = new Map();
const MAX_REMOTE_BYTES = 250_000_000;
const nativeFetch = globalThis.fetch;
const supportedContentTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4', 'video/webm', 'video/quicktime']);
const normalizeContentType = value => String(value || '').split(';', 1)[0].trim().toLowerCase();
const hashFile = async file => { const digest=createHash('sha256'); let bytes=0; for await(const chunk of createReadStream(file,{highWaterMark:1024*1024})){digest.update(chunk);bytes+=chunk.length;} return {bytes,sha256:digest.digest('hex')}; };

function mediaSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'unknown';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return 'audio/wav';
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') return 'audio/ogg';
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return buffer.subarray(8, 12).toString('ascii') === 'qt  ' ? 'video/quicktime' : 'container/ftyp';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  return 'unknown';
}

function signatureMatches(buffer, contentType) {
  const signature = mediaSignature(buffer);
  if (contentType.startsWith('image/')) return signature === contentType;
  if (contentType === 'audio/wav') return signature === 'audio/wav';
  if (contentType === 'audio/ogg') return signature === 'audio/ogg';
  if (contentType === 'audio/mpeg') return signature === 'audio/mpeg';
  if (contentType === 'audio/mp4') return signature === 'container/ftyp';
  if (contentType === 'video/mp4') return signature === 'container/ftyp';
  if (contentType === 'video/quicktime') return signature === 'video/quicktime' || signature === 'container/ftyp';
  if (contentType === 'video/webm') return signature === 'video/webm';
  return false;
}

function contentTypeFromSignature(buffer, kind = 'video') {
  const signature = mediaSignature(buffer);
  if (signature === 'container/ftyp') return String(kind).startsWith('audio') ? 'audio/mp4' : 'video/mp4';
  if (signature === 'video/quicktime') return 'video/quicktime';
  if (signature === 'image/png' || signature === 'image/jpeg' || signature === 'image/gif' || signature === 'image/webp') return signature;
  if (signature === 'audio/wav' || signature === 'audio/ogg' || signature === 'audio/mpeg') return signature;
  if (signature === 'video/webm') return signature;
  return '';
}

function privateIpv4(address) {
  const parts = String(address).split('.').map(Number);
  if (parts.length !== 4 || parts.some(item => !Number.isInteger(item) || item < 0 || item > 255)) return true;
  const value = (((parts[0] * 256) + parts[1]) * 256 + parts[2]) * 256 + parts[3];
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) || (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) || (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) || parts[0] >= 224 || value === 0;
}

function privateIp(address) {
  const value = String(address || '').toLowerCase().split('%')[0];
  if (isIP(value) === 4) return privateIpv4(value);
  if (isIP(value) !== 6) return true;
  if (value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('2001:db8')) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(mapped && privateIpv4(mapped[1]));
}

async function resolveSafeRemoteEndpoint(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw Object.assign(new Error('媒体地址无效。'), { code: 'REMOTE_URL_INVALID' }); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) throw Object.assign(new Error('远程媒体仅允许无凭据的 HTTPS 地址。'), { code: 'REMOTE_URL_INVALID' });
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === 'metadata.google.internal' || hostname === 'metadata.google') throw Object.assign(new Error('远程媒体地址指向本机或内部域名，已拒绝。'), { code: 'REMOTE_URL_PRIVATE' });
  const addresses = isIP(hostname) ? [{ address:hostname, family:isIP(hostname) }] : (await lookup(hostname, { all: true, verbatim: true }).catch(() => []));
  if (!addresses.length || addresses.some(item => privateIp(typeof item === 'string' ? item : item.address))) throw Object.assign(new Error('远程媒体地址解析到本机或内网地址，已拒绝。'), { code: 'REMOTE_URL_PRIVATE' });
  const selected=typeof addresses[0]==='string'?{address:addresses[0],family:isIP(addresses[0])}:{address:addresses[0].address,family:addresses[0].family||isIP(addresses[0].address)};
  return { parsed, address:selected.address, family:selected.family };
}

function sameRemoteAddress(expected, actual) {
  const normalize=value=>String(value||'').toLowerCase().replace(/^\[|\]$/g,'').replace(/^::ffff:/,'');
  return Boolean(actual) && normalize(expected)===normalize(actual);
}

function pinnedHttpsResponse(url, endpoint) {
  return new Promise((resolve,reject)=>{
    const request=https.request(url,{method:'GET',agent:false,redirect:'manual',servername:endpoint.parsed.hostname,lookup:(hostname,options,callback)=>options?.all?callback(null,[{address:endpoint.address,family:endpoint.family}]):callback(null,endpoint.address,endpoint.family),signal:AbortSignal.timeout(120_000)},response=>{
      const actual=response.socket?.remoteAddress;
      if(!sameRemoteAddress(endpoint.address,actual)){response.resume();response.destroy();reject(Object.assign(new Error('远程媒体 DNS 解析地址与实际连接地址不一致。'),{code:'REMOTE_DNS_MISMATCH'}));return;}
      resolve(response);
    });
    request.on('error',reject);request.end();
  });
}

async function remoteResponse(url, endpoint) {
  if (globalThis.fetch !== nativeFetch) return globalThis.fetch(url,{redirect:'manual',signal:AbortSignal.timeout(120_000)});
  return pinnedHttpsResponse(url,endpoint);
}

async function fetchRemoteFile(rawUrl) {
  let current = String(rawUrl || '');
  for (let hop = 0; hop <= 3; hop += 1) {
    const endpoint=await resolveSafeRemoteEndpoint(current);
    const response = await remoteResponse(current,endpoint); const status=response.status ?? response.statusCode;
    const header=(name)=>typeof response.headers?.get==='function'?response.headers.get(name):response.headers?.[name]||response.headers?.[name.toLowerCase()]||null;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = header('location');
      if (!location || hop === 3) throw Object.assign(new Error('远程媒体重定向次数或目标无效。'), { code: 'REMOTE_REDIRECT_INVALID' });
      if (typeof response.body?.cancel === 'function') await response.body.cancel().catch(() => undefined); else response.resume?.();
      current = new URL(location, current).toString();
      continue;
    }
    if (!(status >= 200 && status < 300)) throw new Error(`下载生成媒体失败（HTTP ${status}）。`);
    const declared = Number(header('content-length') || 0);
    if (Number.isFinite(declared) && declared > MAX_REMOTE_BYTES) throw Object.assign(new Error('远程媒体超过 250MB。'), { code: 'MEDIA_TOO_LARGE' });
    const reader = response.body?.getReader(); const body=response.body || response;
    if (!reader && !body?.[Symbol.asyncIterator]) throw Object.assign(new Error('远程媒体响应为空。'), { code: 'REMOTE_MEDIA_EMPTY' });
    await mkdir(dataDir, { recursive: true });
    const temporary = path.join(dataDir, `.remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.part`);
    const handle = await open(temporary, 'wx'); let size = 0; let completed = false;
    try {
      if(reader) while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > MAX_REMOTE_BYTES) { await reader.cancel().catch(() => undefined); throw Object.assign(new Error('远程媒体超过 250MB。'), { code: 'MEDIA_TOO_LARGE' }); } await handle.write(Buffer.from(next.value)); }
      else for await (const chunk of body) { size += chunk.length; if (size > MAX_REMOTE_BYTES) { body.destroy?.(); throw Object.assign(new Error('远程媒体超过 250MB。'), { code: 'MEDIA_TOO_LARGE' }); } await handle.write(chunk); }
      completed = true;
      return { file: temporary, contentType: normalizeContentType(header('content-type') || 'video/mp4') };
    } finally {
      await handle.close().catch(() => undefined);
      if (!completed) await unlink(temporary).catch(() => undefined);
    }
  }
  throw Object.assign(new Error('远程媒体重定向失败。'), { code: 'REMOTE_REDIRECT_INVALID' });
}

const checkedId = id => {
  const raw = String(id || '');
  const clean = safeId(raw);
  if (!clean || clean !== raw) throw new Error('项目 ID 无效。');
  return clean;
};

const probeMedia = async (buffer, contentType) => {
  const normalizedType = normalizeContentType(contentType);
  if (!supportedContentTypes.has(normalizedType)) throw Object.assign(new Error(`不支持的媒体类型：${normalizedType || '未提供'}。`), { code: 'UNSUPPORTED_MEDIA_TYPE' });
  if (!signatureMatches(buffer, normalizedType)) throw Object.assign(new Error('媒体文件签名与声明类型不一致，已拒绝。'), { code: 'MEDIA_SIGNATURE_INVALID' });
  await mkdir(dataDir, { recursive: true });
  const extension = normalizedType.startsWith('image/') ? normalizedType.slice('image/'.length).replace('jpeg', 'jpg') : normalizedType === 'video/webm' ? 'webm' : normalizedType === 'video/quicktime' ? 'mov' : normalizedType.startsWith('video/') ? 'mp4' : normalizedType === 'audio/wav' ? 'wav' : normalizedType === 'audio/ogg' ? 'ogg' : normalizedType === 'audio/mp4' ? 'm4a' : 'mp3';
  const temporary = path.join(dataDir, `.probe-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await writeFile(temporary, buffer);
  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', temporary], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = ''; let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(stdout) : reject(Object.assign(new Error(stderr.trim() || `ffprobe exit ${code}`), { code: 'MEDIA_PROBE_FAILED' })));
    });
    const parsed = JSON.parse(output);
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const duration = Number(parsed.format?.duration);
    const expectedStream = normalizedType.startsWith('image/') ? 'video' : normalizedType.split('/')[0];
    const usableStreams = streams.filter(stream => stream.codec_type === expectedStream);
    if (!usableStreams.length || (expectedStream !== 'video' || !normalizedType.startsWith('image/')) && (!Number.isFinite(duration) || duration <= 0)) throw Object.assign(new Error('媒体缺少有效时长或匹配的音视频流。'), { code: 'MEDIA_PROBE_FAILED' });
    const mediaMetadata = { ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}), streams: streams.map(stream => ({ index: stream.index, type: stream.codec_type, codec: stream.codec_name, width: stream.width, height: stream.height, sampleRate: stream.sample_rate, channels: stream.channels })) };
    if (normalizedType.startsWith('image/')) return { probeStatus: 'not-required', mediaMetadata };
    return { probeStatus: 'passed', mediaMetadata };
  } catch (error) {
    if (['MEDIA_PROBE_FAILED', 'MEDIA_SIGNATURE_INVALID', 'UNSUPPORTED_MEDIA_TYPE'].includes(error.code)) throw error;
    throw Object.assign(new Error('无法完成媒体文件探测，请确认已安装 ffprobe。'), { code: 'MEDIA_PROBE_FAILED' });
  } finally { await rm(temporary, { force: true }).catch(() => undefined); }
};

const validateVoiceSample = async (buffer, contentType, probe) => {
  const metadata = probe.mediaMetadata || {};
  const streams = (metadata.streams || []).filter(stream => stream.type === 'audio');
  const duration = Number(metadata.duration);
  if (!/^audio\//i.test(contentType) || streams.length !== 1) throw Object.assign(new Error('参考音频必须是包含单条音频流的音频文件。'), { code: 'VOICE_SAMPLE_INVALID' });
  if (!Number.isFinite(duration) || duration < 0.5 || duration > 60) throw Object.assign(new Error('参考音频时长需在 0.5–60 秒之间。'), { code: 'VOICE_SAMPLE_INVALID' });
  const temporary = path.join(dataDir, `.voice-check-${Date.now()}-${Math.random().toString(36).slice(2)}.audio`);
  await writeFile(temporary, buffer);
  try {
    const stderr = await new Promise((resolve, reject) => {
      const sink = process.platform === 'win32' ? 'NUL' : '/dev/null';
      const child = spawn('ffmpeg', ['-hide_banner', '-v', 'info', '-i', temporary, '-af', 'volumedetect', '-f', 'null', sink], { stdio: ['ignore', 'ignore', 'pipe'] });
      let output = '';
      child.stderr.on('data', chunk => { output += chunk; });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(output) : reject(Object.assign(new Error('参考音频音量检测失败。'), { code: 'VOICE_SAMPLE_INVALID' })));
    });
    const match = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?|-inf)\s*dB/i);
    const maxVolumeDb = match ? (match[1].toLowerCase() === '-inf' ? -Infinity : Number(match[1])) : -Infinity;
    if (!Number.isFinite(maxVolumeDb) || maxVolumeDb <= -55) throw Object.assign(new Error('参考音频几乎全是静音，请导入清晰的人声干声。'), { code: 'VOICE_SAMPLE_INVALID' });
    return { duration, maxVolumeDb };
  } catch (error) {
    if (error.code === 'VOICE_SAMPLE_INVALID') throw error;
    throw Object.assign(new Error('无法完成参考音频静音检测，请确认已安装 ffmpeg。'), { code: 'VOICE_SAMPLE_INVALID' });
  } finally { await rm(temporary, { force: true }).catch(() => undefined); }
};

const readMediaHeader = async file => {
  const handle = await open(file, 'r');
  try { const header = Buffer.alloc(32); const result = await handle.read(header, 0, header.length, 0); return header.subarray(0, result.bytesRead); }
  finally { await handle.close().catch(() => undefined); }
};

const probeMediaFile = async (file, contentType) => {
  const normalizedType = normalizeContentType(contentType);
  if (!supportedContentTypes.has(normalizedType)) throw Object.assign(new Error(`不支持的媒体类型：${normalizedType || '未提供'}。`), { code: 'UNSUPPORTED_MEDIA_TYPE' });
  if (!signatureMatches(await readMediaHeader(file), normalizedType)) throw Object.assign(new Error('媒体文件签名与声明类型不一致，已拒绝。'), { code: 'MEDIA_SIGNATURE_INVALID' });
  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', file], { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = ''; let stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(stdout) : reject(Object.assign(new Error(stderr.trim() || `ffprobe exit ${code}`), { code: 'MEDIA_PROBE_FAILED' })));
    });
    const parsed = JSON.parse(output); const streams = Array.isArray(parsed.streams) ? parsed.streams : []; const duration = Number(parsed.format?.duration);
    const expectedStream = normalizedType.startsWith('image/') ? 'video' : normalizedType.split('/')[0]; const usableStreams = streams.filter(stream => stream.codec_type === expectedStream);
    if (!usableStreams.length || (expectedStream !== 'video' || !normalizedType.startsWith('image/')) && (!Number.isFinite(duration) || duration <= 0)) throw Object.assign(new Error('媒体缺少有效时长或匹配的音视频流。'), { code: 'MEDIA_PROBE_FAILED' });
    const mediaMetadata = { ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}), streams: streams.map(stream => ({ index: stream.index, type: stream.codec_type, codec: stream.codec_name, width: stream.width, height: stream.height, sampleRate: stream.sample_rate, channels: stream.channels })) };
    return { probeStatus: normalizedType.startsWith('image/') ? 'not-required' : 'passed', mediaMetadata };
  } catch (error) {
    if (['MEDIA_PROBE_FAILED', 'MEDIA_SIGNATURE_INVALID', 'UNSUPPORTED_MEDIA_TYPE'].includes(error.code)) throw error;
    throw Object.assign(new Error('无法完成媒体文件探测，请确认已安装 ffprobe。'), { code: 'MEDIA_PROBE_FAILED' });
  }
};

const validateVoiceSampleFile = async (file, contentType, probe) => {
  const metadata = probe.mediaMetadata || {}; const streams = (metadata.streams || []).filter(stream => stream.type === 'audio'); const duration = Number(metadata.duration);
  if (!/^audio\//i.test(contentType) || streams.length !== 1) throw Object.assign(new Error('参考音频必须是包含单条音频流的音频文件。'), { code: 'VOICE_SAMPLE_INVALID' });
  if (!Number.isFinite(duration) || duration < 0.5 || duration > 60) throw Object.assign(new Error('参考音频时长需在 0.5–60 秒之间。'), { code: 'VOICE_SAMPLE_INVALID' });
  try {
    const stderr = await new Promise((resolve, reject) => {
      const sink = process.platform === 'win32' ? 'NUL' : '/dev/null'; const child = spawn('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-af', 'volumedetect', '-f', 'null', sink], { stdio: ['ignore', 'ignore', 'pipe'] }); let output = '';
      child.stderr.on('data', chunk => { output += chunk; }); child.on('error', reject); child.on('close', code => code === 0 ? resolve(output) : reject(Object.assign(new Error('参考音频音量检测失败。'), { code: 'VOICE_SAMPLE_INVALID' })));
    });
    const match = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?|-inf)\s*dB/i); const maxVolumeDb = match ? (match[1].toLowerCase() === '-inf' ? -Infinity : Number(match[1])) : -Infinity;
    if (!Number.isFinite(maxVolumeDb) || maxVolumeDb <= -55) throw Object.assign(new Error('参考音频几乎全是静音，请导入清晰的人声干声。'), { code: 'VOICE_SAMPLE_INVALID' });
    return { duration, maxVolumeDb };
  } catch (error) {
    if (error.code === 'VOICE_SAMPLE_INVALID') throw error;
    throw Object.assign(new Error('无法完成参考音频静音检测，请确认已安装 ffmpeg。'), { code: 'VOICE_SAMPLE_INVALID' });
  }
};

export async function saveProject(project) {
  if (sqliteEnabled) return (await getSqliteBackend()).saveProject(project);
  await mkdir(dataDir, { recursive: true });
  const id = safeId(project.id) || `project-${Date.now()}`;
  const expectedRevision = Number.isInteger(project.expectedRevision) ? project.expectedRevision : Number.isInteger(project.revision) ? project.revision : null;
  const next = { ...project, id, updatedAt: new Date().toISOString() };
  delete next.expectedRevision;
  const destination = path.join(dataDir, `${id}.json`);
  const previous = writeQueues.get(id) || Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    let existing = null;
    try { existing = JSON.parse(await readFile(destination, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing && !Number.isInteger(existing.revision)) existing = { ...existing, revision: 0 };
    if (existing && expectedRevision !== existing.revision && !(existing.revision === 0 && expectedRevision === null)) {
      const error = new Error(`项目版本冲突：服务端为 ${existing.revision}，提交基于 ${expectedRevision ?? '未知版本'}。`);
      error.code = 'REVISION_CONFLICT';
      error.currentRevision = existing.revision;
      throw error;
    }
    next.revision = existing ? existing.revision + 1 : 1;
    const temporary = path.join(dataDir, `.${id}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
    await rename(temporary, destination);
  });
  writeQueues.set(id, current);
  try { await current; } finally { if (writeQueues.get(id) === current) writeQueues.delete(id); }
  return next;
}

export async function readProject(id) {
  if (sqliteEnabled) return (await getSqliteBackend()).readProject(id);
  return JSON.parse(await readFile(path.join(dataDir, `${safeId(id)}.json`), 'utf8'));
}

export async function listProjects() {
  if (sqliteEnabled) return (await getSqliteBackend()).listProjects();
  await mkdir(dataDir, { recursive: true });
  const files = (await readdir(dataDir)).filter(name => /^[a-zA-Z0-9_-]+\.json$/.test(name));
  const projects = await Promise.all(files.map(async name => {
    try {
      const project = JSON.parse(await readFile(path.join(dataDir, name), 'utf8'));
      const report = inspectWorkflow(project);
      return { id: project.id, title: project.title, type: project.type, synopsis: project.synopsis, updatedAt: project.updatedAt, completion: report.score, nextStage: report.next?.label, nextMissing: report.next?.missing?.[0] || '', deliveryReady: report.stages.find(item => item.id === 'delivery')?.score === 100, cover: project.cover || project.characters?.find(item => item.imageAsset)?.imageAsset || '' };
    } catch { return null; }
  }));
  return projects.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function deleteProject(id) {
  if (sqliteEnabled) return (await getSqliteBackend()).deleteProject(id);
  const clean = checkedId(id);
  const pending = writeQueues.get(clean);
  if (pending) await pending.catch(() => undefined);
  const projectFile = path.resolve(dataDir, `${clean}.json`);
  const assetRoot = path.resolve(dataDir, 'assets');
  const assetFolder = path.resolve(assetRoot, clean);
  if (path.dirname(projectFile) !== dataDir || !assetFolder.startsWith(`${assetRoot}${path.sep}`)) throw new Error('删除目标超出项目目录。');
  await unlink(projectFile);
  await rm(assetFolder, { recursive: true, force: true });
  return { id: clean };
}

export async function restoreProject(id) {
  if (!sqliteEnabled) throw Object.assign(new Error('当前 JSON 存储没有项目回收站记录。'), { code: 'RESTORE_UNSUPPORTED' });
  return (await getSqliteBackend()).restoreProject(id);
}

export function isSqliteStorage() { return sqliteEnabled; }

export async function readProjectStorageSnapshot(id) {
  if (!sqliteEnabled) return null;
  return (await getSqliteBackend()).projectSnapshot(id);
}

export async function restoreProjectStorageSnapshot(snapshot) {
  if (!sqliteEnabled) throw Object.assign(new Error('当前 JSON 存储不支持 SQLite 恢复快照。'), { code: 'RESTORE_UNSUPPORTED' });
  if (snapshot?.storageBackend !== 'sqlite') throw Object.assign(new Error('恢复快照存储类型不匹配。'), { code: 'SQLITE_SNAPSHOT_INVALID' });
  return (await getSqliteBackend()).restoreSnapshot(snapshot);
}

export async function saveAsset({ base64, contentType = 'application/octet-stream', kind = 'asset', projectId = 'shared', assetKey = '' }) {
  if (!base64) throw new Error('缺少媒体数据。');
  return saveBinaryAsset({ buffer: Buffer.from(base64, 'base64'), contentType, kind, projectId, assetKey });
}

export async function saveBinaryAsset({ buffer, contentType = 'application/octet-stream', kind = 'asset', projectId = 'shared', assetKey = '' }) {
  if (!buffer?.length) throw new Error('缺少媒体数据。');
  contentType = normalizeContentType(contentType);
  if (!supportedContentTypes.has(contentType)) throw Object.assign(new Error(`不支持的媒体类型：${contentType || '未提供'}。`), { code: 'UNSUPPORTED_MEDIA_TYPE' });
  const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  const extension = extensions[contentType] || 'bin';
  const probe = await probeMedia(buffer, contentType);
  const sampleQuality = kind === 'voice-sample' ? await validateVoiceSample(buffer, contentType, probe) : null;
  const folder = path.join(dataDir, 'assets', safeId(projectId) || 'shared');
  await mkdir(folder, { recursive: true });
  const name = assetKey ? `${safeId(kind) || 'asset'}-${createHash('sha256').update(`${safeId(projectId)}:${assetKey}`).digest('hex').slice(0, 32)}.${extension}` : `${safeId(kind) || 'asset'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const destination=path.join(folder,name); if (!(await stat(destination).catch(() => null))) await writeFile(destination, buffer);
  const digest=createHash('sha256').update(buffer).digest('hex'); const result={ assetId:`asset-${digest.slice(0,24)}`, url: `/api/assets/${encodeURIComponent(safeId(projectId) || 'shared')}/${encodeURIComponent(name)}`, contentType, name, bytes:buffer.length, sha256:digest, ...probe, ...(sampleQuality ? { sampleQuality } : {}) };
  if (sqliteEnabled) await (await getSqliteBackend()).saveAsset({id:result.assetId,projectId:safeId(projectId)||'shared',kind,...result});
  return result;
}

export async function saveFileAsset({ file, contentType = 'application/octet-stream', kind = 'asset', projectId = 'shared', assetKey = '' }) {
  if (!file) throw new Error('缺少媒体文件。');
  const absolute = path.resolve(file); if (!(absolute === dataDir || absolute.startsWith(`${dataDir}${path.sep}`))) throw Object.assign(new Error('媒体临时文件超出数据目录。'), { code: 'MEDIA_PATH_INVALID' });
  contentType = normalizeContentType(contentType);
  if (!supportedContentTypes.has(contentType)) throw Object.assign(new Error(`不支持的媒体类型：${contentType || '未提供'}。`), { code: 'UNSUPPORTED_MEDIA_TYPE' });
  const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  const probe = await probeMediaFile(absolute, contentType); const sampleQuality = kind === 'voice-sample' ? await validateVoiceSampleFile(absolute, contentType, probe) : null;
  const folder = path.join(dataDir, 'assets', safeId(projectId) || 'shared'); await mkdir(folder, { recursive: true });
  const name = assetKey ? `${safeId(kind) || 'asset'}-${createHash('sha256').update(`${safeId(projectId)}:${assetKey}`).digest('hex').slice(0, 32)}.${extensions[contentType]}` : `${safeId(kind) || 'asset'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensions[contentType]}`;
  const destination = path.join(folder, name);
  if (await stat(destination).catch(() => null)) await unlink(absolute).catch(() => undefined);
  else await rename(absolute, destination);
  const metadata=await hashFile(destination); const result={ assetId:`asset-${metadata.sha256.slice(0,24)}`, url: `/api/assets/${encodeURIComponent(safeId(projectId) || 'shared')}/${encodeURIComponent(name)}`, contentType, name, ...metadata, ...probe, ...(sampleQuality ? { sampleQuality } : {}) };
  if (sqliteEnabled) await (await getSqliteBackend()).saveAsset({id:result.assetId,projectId:safeId(projectId)||'shared',kind,...result});
  return result;
}

export async function registerImportedFileAsset({ file, projectId = 'shared', kind = 'asset', assetId = '' }) {
  const absolute=path.resolve(file); if(!(absolute===dataDir||absolute.startsWith(`${dataDir}${path.sep}`)))throw Object.assign(new Error('项目包媒体超出数据目录。'),{code:'MEDIA_PATH_INVALID'});
  const contentType=contentTypeFromSignature(await readMediaHeader(absolute),kind); if(!contentType)throw Object.assign(new Error('项目包媒体类型无法识别。'),{code:'MEDIA_SIGNATURE_INVALID'});
  const probe=await probeMediaFile(absolute,contentType); const metadata=await hashFile(absolute); const cleanProject=safeId(projectId)||'shared'; const name=path.basename(absolute); const result={assetId:assetId||`asset-${metadata.sha256.slice(0,24)}`,url:`/api/assets/${encodeURIComponent(cleanProject)}/${encodeURIComponent(name)}`,contentType,name,bytes:metadata.bytes,sha256:metadata.sha256,...probe};
  if(sqliteEnabled)await(await getSqliteBackend()).saveAsset({id:result.assetId,projectId:cleanProject,kind,...result});
  return result;
}

export async function saveRemoteAsset({ url, kind = 'video', projectId = 'shared', assetKey = '' }) {
  const remote = await fetchRemoteFile(url);
  const declaredType = normalizeContentType(remote.contentType || '');
  const contentType = supportedContentTypes.has(declaredType) ? declaredType : contentTypeFromSignature(await readMediaHeader(remote.file), kind);
  try {
    return await saveFileAsset({ file: remote.file, contentType: contentType || declaredType || 'application/octet-stream', kind, projectId, assetKey:assetKey || `remote:${url}` });
  } finally { await unlink(remote.file).catch(() => undefined); }
}

export function resolveAssetPath(projectId, name) {
  return path.join(dataDir, 'assets', safeId(projectId), path.basename(name));
}

export async function assetUrlToDataUri(url) {
  const match = String(url || '').match(/^\/api\/assets\/([^/]+)\/([^/?#]+)/);
  if (!match) return url;
  const file = resolveAssetPath(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
  const buffer = await readFile(file);
  if (buffer.length > 8_000_000) throw new Error('本地参考素材超过 8MB，请压缩后重新导入。');
  const extension = path.extname(file).toLowerCase();
  const contentType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : extension === '.wav' ? 'audio/wav' : extension === '.mp3' ? 'audio/mpeg' : extension === '.m4a' ? 'audio/mp4' : extension === '.ogg' ? 'audio/ogg' : 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
