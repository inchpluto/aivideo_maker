import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-input-defense-'));
const dataDir = path.join(root, 'data');
const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=160x90:r=25', '-t', '0.8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const validVideo = await readFile(fixture);
const freePort = () => new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(() => resolve(value)); }); });
const port = await freePort();
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), LOCAL_TTS_AUTOSTART: 'false', MEDIA_UPLOAD_LIMIT_BYTES: '10000' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let childLog = '';
child.stdout.on('data', chunk => { childLog += chunk.toString(); });
child.stderr.on('data', chunk => { childLog += chunk.toString(); });
const request = (pathname, options = {}) => new Promise(resolve => {
  const payload = options.body ?? Buffer.alloc(0);
  const headers = { Host: `127.0.0.1:${port}`, ...(options.headers || {}) };
  if (Buffer.isBuffer(payload) && !headers['Content-Length']) headers['Content-Length'] = payload.length;
  const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) })); });
  req.on('error', error => resolve({ status: 0, headers: {}, body: Buffer.from(String(error.message)) }));
  if (payload.length) req.write(payload);
  req.end();
});
const json = response => JSON.parse(response.body.toString('utf8') || '{}');
try {
  let health = { status: 0 };
  for (let attempt = 0; attempt < 50 && health.status !== 200; attempt += 1) { health = await request('/api/health'); if (health.status !== 200) await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(health.status, 200);
  const valid = await request('/api/assets/media?projectId=input-defense&kind=fixture', { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: validVideo });
  assert.equal(valid.status, 201, valid.body.toString());
  const asset = json(valid).asset;
  assert.equal(asset.probeStatus, 'passed');
  const fake = await request('/api/assets/media?projectId=input-defense&kind=fake', { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: Buffer.from('not an mp4') });
  assert.equal(fake.status, 422); assert.equal(json(fake).code, 'MEDIA_SIGNATURE_INVALID');
  const mismatched = await request('/api/assets/media?projectId=input-defense&kind=mismatch', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: validVideo });
  assert.equal(mismatched.status, 422); assert.equal(json(mismatched).code, 'MEDIA_SIGNATURE_INVALID');
  const unsupported = await request('/api/assets/media?projectId=input-defense&kind=unsupported', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: validVideo });
  assert.equal(unsupported.status, 415); assert.equal(json(unsupported).code, 'UNSUPPORTED_MEDIA_TYPE');
  const corruptWav = await request('/api/assets/media?projectId=input-defense&kind=corrupt', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: Buffer.from('RIFF0000WAVE') });
  assert.equal(corruptWav.status, 422); assert.equal(json(corruptWav).code, 'MEDIA_PROBE_FAILED');
  const oversized = await request('/api/assets/media?projectId=input-defense&kind=oversized', { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: Buffer.alloc(10001) });
  assert.equal(oversized.status, 413); assert.equal(json(oversized).code, 'MEDIA_TOO_LARGE');
  const malformed = await request('/api/projects/input-defense', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': '1' }, body: Buffer.from('{') });
  assert.equal(malformed.status, 400); assert.equal(json(malformed).code, 'REQUEST_FAILED');
  const traversal = await request('/api/assets/input-defense/%2e%2e%2finput-defense.json');
  assert.notEqual(traversal.status, 200);
  const partial = await request(asset.url, { headers: { Range: 'bytes=0-15' } });
  assert.equal(partial.status, 206, childLog); assert.equal(partial.body.length, 16); assert.match(String(partial.headers['content-range']), /^bytes 0-15\//);
  const invalidRange = await request(asset.url, { headers: { Range: 'bytes=999999999-' } });
  assert.equal(invalidRange.status, 416);
  process.env.DATA_DIR = dataDir;
  const { saveRemoteAsset } = await import('../server/store.mjs');
  await assert.rejects(() => saveRemoteAsset({ url: 'https://127.0.0.1/private.mp4', projectId: 'input-defense' }), error => error.code === 'REMOTE_URL_PRIVATE');
  await assert.rejects(() => saveRemoteAsset({ url: 'http://127.0.0.1/private.mp4', projectId: 'input-defense' }), error => error.code === 'REMOTE_URL_INVALID');
  const files = await readdir(path.join(dataDir, 'assets', 'input-defense'));
  assert.equal(files.length, 1);
  console.log(JSON.stringify({ ok: true, valid: valid.status, fake: fake.status, mismatched: mismatched.status, unsupported: unsupported.status, corrupt: corruptWav.status, oversized: oversized.status, malformed: malformed.status, traversal: traversal.status, range: partial.status, invalidRange: invalidRange.status, remotePrivate: 'rejected', formalAssets: files.length }));
} finally {
  child.kill();
  await rm(root, { recursive: true, force: true });
}
