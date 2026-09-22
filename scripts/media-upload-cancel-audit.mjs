import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const root = await mkdtemp(path.join(os.tmpdir(), 'xingmu-media-upload-cancel-'));
const dataDir = path.join(root, 'data');
const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24', '-t', '1.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const port = await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(() => resolve(value)); }); });
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), LOCAL_TTS_AUTOSTART: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let logs = ''; child.stdout.on('data', chunk => { logs += chunk.toString(); }); child.stderr.on('data', chunk => { logs += chunk.toString(); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const originalFetch = globalThis.fetch;
let delayedFirstPost = false; let firstChunkAccepted = false; let uploadId = '';
const { uploadProjectMedia } = await import('../src/workflow.js');
try {
  for (let attempt = 0; attempt < 50; attempt += 1) { const health = await originalFetch(`http://127.0.0.1:${port}/api/health`).catch(() => null); if (health?.status === 200) break; await wait(100); if (attempt === 49) throw new Error(`服务未启动：${logs}`); }
  const partial = new Blob([new Uint8Array(8_500_000)], { type: 'video/mp4' });
  const absoluteUrl = url => String(url).startsWith('/') ? `http://127.0.0.1:${port}${url}` : url;
  globalThis.fetch = async (url, options = {}) => {
    const targetUrl = absoluteUrl(url);
    const isFirstMediaPost = !delayedFirstPost && options.method === 'POST' && String(url).includes('/api/assets/media?');
    if (!isFirstMediaPost) return originalFetch(targetUrl, options);
    delayedFirstPost = true;
    const response = await originalFetch(targetUrl, options);
    firstChunkAccepted = response.status === 200;
    const signal = options.signal;
    if (!signal) return response;
    return new Promise((resolve, reject) => {
      let settled = false;
      const abort = () => { if (settled) return; settled = true; reject(Object.assign(new Error('媒体上传已取消'), { name: 'AbortError' })); };
      signal.addEventListener('abort', abort, { once: true });
      setTimeout(() => { if (settled) return; settled = true; signal.removeEventListener('abort', abort); resolve(response); }, 3_000);
    });
  };
  const controller = new globalThis.AbortController();
  const pending = uploadProjectMedia('cancel-audit', partial, 'cancelled', { signal: controller.signal, onProgress: state => { uploadId = state.uploadId; } });
  await wait(150);
  controller.abort();
  await assert.rejects(pending, error => error?.name === 'AbortError');
  assert.ok(firstChunkAccepted, '取消前应已让真实服务接收第一块媒体');
  assert.ok(uploadId, '客户端应暴露本次上传 ID 给进度回调');
  const cancelledState = await originalFetch(`http://127.0.0.1:${port}/api/assets/media?projectId=cancel-audit&uploadId=${encodeURIComponent(uploadId)}`);
  assert.equal(cancelledState.status, 404, await cancelledState.text());
  const afterCancelNames = await readdir(dataDir, { recursive: true });
  assert.equal(afterCancelNames.some(name => String(name).endsWith('.part')), false, afterCancelNames.join('\n'));
  globalThis.fetch = (url, options = {}) => originalFetch(absoluteUrl(url), options);
  const fixtureAsset = await uploadProjectMedia('cancel-audit', new Blob([await readFile(fixture)], { type: 'video/mp4' }), 'retry-after-cancel');
  assert.equal(fixtureAsset.probeStatus, 'passed');
  const finalNames = await readdir(dataDir, { recursive: true });
  assert.equal(finalNames.some(name => String(name).endsWith('.part')), false, finalNames.join('\n'));
  console.log(JSON.stringify({ ok: true, cancelledUpload: true, firstChunkAccepted, uploadId: Boolean(uploadId), cancelledStatus: 404, partialFilesClean: true, reimported: true, probeStatus: fixtureAsset.probeStatus }));
} finally {
  globalThis.fetch = originalFetch;
  child.kill();
  await wait(250);
  await rm(root, { recursive: true, force: true });
}
