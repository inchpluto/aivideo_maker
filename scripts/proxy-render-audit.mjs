import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-proxy-render-'));
process.env.DATA_DIR = root;
const { saveBinaryAsset, saveProject } = await import('../server/store.mjs');
const { proxyRenderFingerprint, renderProxyProject } = await import('../server/render.mjs');
const { applyCacheCleanup, previewCacheCleanup } = await import('../server/cleanup.mjs');
const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=24', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);

try {
  const asset = await saveBinaryAsset({ buffer: await readFile(fixture), contentType: 'video/mp4', projectId: 'proxy-audit', kind: 'shot' });
  const project = { id: 'proxy-audit', settings: { aspectRatio: '16:9', fps: 24 }, shots: [{ id: 'shot-1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ id: 'clip-shot-1', track: 0, mediaType: 'video', mediaUrl: asset.url, probeStatus: asset.probeStatus, duration: 1, sourceOffset: 0, playbackRate: 1, positionX: 0, positionY: 0, scale: 100, rotation: 0 }] };
  const first = await renderProxyProject(project);
  assert.equal(first.ok, true); assert.equal(first.renderMode, 'proxy'); assert.equal(first.cached, false); assert.equal(first.renderProfile.width, 640); assert.equal(first.renderProfile.height, 360); assert.equal(first.technicalQc.width, 640); assert.equal(first.technicalQc.height, 360); assert.ok((await stat(first.path)).size > 100);
  const second = await renderProxyProject(project);
  assert.equal(second.cached, true); assert.equal(second.path, first.path); assert.equal(second.fingerprint, proxyRenderFingerprint(project));

  const changedProject = { ...project, timeline: [{ ...project.timeline[0], positionX: 48 }] };
  const changed = await renderProxyProject(changedProject);
  assert.equal(changed.cached, false); assert.notEqual(changed.path, first.path); assert.notEqual(changed.fingerprint, first.fingerprint); assert.equal(changed.technicalQc.width, 640);
  await saveProject(changedProject);
  const port = 4217;
  const service = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: root, PORT: String(port), MOCK_MODE: 'true' }, stdio: 'ignore' });
  const request = (pathname, payload) => new Promise(resolve => { const body = JSON.stringify(payload); const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: 'POST', headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) })); }); req.on('error', () => resolve({ status: 0, body: Buffer.alloc(0) })); req.end(body); });
  try {
    let online = false; for (let attempt = 0; attempt < 30 && !online; attempt += 1) { online = (await new Promise(resolve => { const req = http.get({ hostname: '127.0.0.1', port, path: '/api/health', headers: { Host: `127.0.0.1:${port}` } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode === 200)); }); req.on('error', () => resolve(false)); })).valueOf(); if (!online) await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.equal(online, true);
    const api = await request('/api/render/proxy', { project: changedProject });
    assert.equal(api.status, 200, api.body.toString()); const apiResult = JSON.parse(api.body); assert.equal(apiResult.renderMode, 'proxy'); assert.equal(apiResult.cached, true); assert.equal(apiResult.deliverable, changed.deliverable);
  } finally {
    if (service.exitCode === null) { service.kill(); await new Promise(resolve => { const timeout = setTimeout(resolve, 1500); service.once('exit', () => { clearTimeout(timeout); resolve(); }); }); }
  }
  const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await utimes(path.dirname(first.path), old, old);
  const plan = await previewCacheCleanup({ dataDir: root, maxAgeMs: 24 * 60 * 60 * 1000, now: Date.now() });
  assert.ok(plan.candidates.some(item => item.kind === 'stale-proxy-cache' && item.path === path.dirname(first.path)), JSON.stringify(plan));
  const applied = await applyCacheCleanup(plan, { dryRun: false });
  assert.ok(applied.removed.includes(path.dirname(first.path))); assert.ok(await stat(changed.path));
  console.log(JSON.stringify({ ok: true, generated: true, cached: true, api: true, invalidated: true, reclaimed: true, profile: '640x360' }));
} finally {
  await rm(root, { recursive: true, force: true });
}
