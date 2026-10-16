import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import { parseByteRange, sendFile, sendMediaFile } from '../server/httpFiles.mjs';
import { readJsonBody } from '../server/httpBody.mjs';
import { APP_VERSION } from '../server/version.mjs';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = await mkdtemp(path.join(tmpdir(), 'xingmu-http-transport-'));
const media = path.join(root, 'media.mp4');
await writeFile(media, '0123456789');
await writeFile(path.join(root, 'empty.mp4'), '');
const request = (port, pathname, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
  const req = httpRequest({ hostname: '127.0.0.1', port, path: pathname, headers, method }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('error', reject);
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.setTimeout(5000, () => req.destroy(new Error('HTTP audit timed out')));
  req.on('error', reject);
  req.end();
});
const text = Buffer.from('星幕 transport regression '.repeat(100));
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/text') {
      res.setHeader('Vary', 'Origin');
      await sendFile(req, res, 'text/plain; charset=utf-8', text);
    } else {
      await sendMediaFile(req, res, req.url === '/missing' ? path.join(root, 'missing.mp4') : req.url === '/empty' ? path.join(root, 'empty.mp4') : media, 'video/mp4');
    }
  } catch (error) {
    if (res.headersSent || res.destroyed) return res.destroy();
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end();
  }
});
let child;
try {
  const cases = [
    [undefined, null], ['bytes=2-5', { start: 2, end: 5 }],
    ['bytes=-3', { start: 7, end: 9 }], ['bytes=-20', { start: 0, end: 9 }],
    ['bytes=4-', { start: 4, end: 9 }], ['bytes=4-99', { start: 4, end: 9 }],
    ['bytes=-0', false], ['bytes=10-', false], ['bytes=6-2', false],
    ['bytes=-', false], ['bytes=0-1,4-5', false], ['items=0-1', false],
    ['bytes=9007199254740992-', false], ['bytes=-9007199254740992', false],
  ];
  for (const [range, expected] of cases) assert.deepEqual(parseByteRange(range, 10), expected, String(range));
  assert.equal(parseByteRange('bytes=0-', 0), false);

  const payload = { title: '雾港来信🌌', text: '中文对白与 emoji 不应被网络分块损坏。' };
  const bytes = Buffer.from(JSON.stringify(payload));
  const split = Readable.from([...bytes].map(byte => Buffer.from([byte])));
  split.headers = {};
  assert.deepEqual(await readJsonBody(split), payload);
  for (const declared of [false, true]) {
    const oversized = Readable.from([bytes]);
    oversized.headers = declared ? { 'content-length': String(bytes.length) } : {};
    await assert.rejects(readJsonBody(oversized, { limit: bytes.length - 1 }), { code: 'REQUEST_TOO_LARGE' });
  }
  const invalid = Readable.from([Buffer.from('{')]);
  invalid.headers = {};
  await assert.rejects(readJsonBody(invalid), { code: 'INVALID_JSON' });
  const aborted = new Readable({ read() {} });
  aborted.headers = {};
  const pending = readJsonBody(aborted);
  aborted.emit('aborted');
  await assert.rejects(pending, { code: 'REQUEST_ABORTED' });
  aborted.destroy();

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  for (const [range, expected] of cases) {
    const response = await request(port, '/', range ? { Range: range } : {});
    assert.equal(response.status, expected === false ? 416 : expected ? 206 : 200, String(range));
    if (expected === false) assert.equal(response.headers['content-range'], 'bytes */10');
    else assert.equal(response.body.toString(), expected ? '0123456789'.slice(expected.start, expected.end + 1) : '0123456789');
  }
  const head = await request(port, '/', { Range: 'bytes=-3' }, 'HEAD');
  assert.equal(head.status, 206);
  assert.equal(head.headers['content-length'], '3');
  assert.equal(head.body.length, 0);
  assert.equal((await request(port, '/empty')).headers['content-length'], '0');
  assert.equal((await request(port, '/empty', { Range: 'bytes=0-' })).status, 416);
  assert.equal((await request(port, '/missing')).status, 404);
  const compressed = await request(port, '/text', { 'Accept-Encoding': 'gzip' });
  assert.deepEqual(gunzipSync(compressed.body), text);
  assert.equal(compressed.headers.vary, 'Origin, Accept-Encoding');
  const uncompressed = await request(port, '/text', { 'Accept-Encoding': 'gzip;q=0, *;q=1' });
  assert.equal(uncompressed.headers['content-encoding'], undefined);
  assert.deepEqual(uncompressed.body, text);
  const textHead = await request(port, '/text', { 'Accept-Encoding': 'gzip' }, 'HEAD');
  assert.equal(textHead.body.length, 0);
  assert.equal(textHead.headers['content-length'], compressed.headers['content-length']);

  // Abort an in-flight large media stream. The next request must still work.
  await writeFile(media, Buffer.alloc(8 * 1024 * 1024));
  await new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port }, res => {
      res.once('data', () => { res.destroy(); resolve(); });
      res.on('error', () => {});
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal((await request(port, '/text')).status, 200);

  // Exercise the actual async HTTP callback, not only helper functions.
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const appPort = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  await mkdir(path.join(root, 'assets', 'audit'), { recursive: true });
  await writeFile(path.join(root, 'assets', 'audit', 'tail.mp4'), '0123456789');
  child = spawn(process.execPath, ['server/index.mjs'], {
    env: { ...process.env, DATA_DIR: root, PORT: String(appPort), LOCAL_TTS_AUTOSTART: 'false', STORAGE_BACKEND: 'atomic-json', FFMPEG_PATH: 'audit-missing-ffmpeg', FFPROBE_PATH: 'audit-missing-ffprobe' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  let ready = false;
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error(logs);
    try { ready = (await request(appPort, '/api/health')).status === 200; } catch { /* starting */ }
    if (ready) break;
    await wait(50);
  }
  assert.ok(ready, logs);
  assert.equal(JSON.parse((await request(appPort, '/api/health')).body).version, APP_VERSION);
  const malformed = await request(appPort, '/%E0%A4%A');
  assert.equal(malformed.status, 400);
  assert.equal(JSON.parse(malformed.body).code, 'INVALID_REQUEST_URL');
  assert.equal((await request(appPort, 'http://[invalid')).status, 400);
  assert.equal((await request(appPort, '/assets/missing-audit.js')).status, 404);
  assert.equal((await request(appPort, '/', {}, 'POST')).status, 405);
  assert.equal((await request(appPort, '/api/assets/audit/tail.mp4', { Range: 'bytes=-3' })).body.toString(), '789');
  assert.equal((await request(appPort, '/api/health')).status, 200, 'malformed URL must not terminate the service');
  console.log(JSON.stringify({ ok: true, ranges: cases.length, utf8Chunks: true, byteLimit: true, gzipNegotiation: true, head: true, disconnect: true, malformedUrlSurvived: true }));
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timer);
  }
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
