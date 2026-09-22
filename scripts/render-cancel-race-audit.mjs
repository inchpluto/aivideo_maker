import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-render-cancel-race-'));
const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24', '-t', '40', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', fixture], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);

const reservePort = async () => {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
};
const port = await reservePort();
const base = `http://127.0.0.1:${port}`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = async (pathname, method = 'GET', payload) => {
  const response = await fetch(`${base}${pathname}`, { method, headers: payload ? { 'content-type': 'application/json' } : undefined, body: payload ? JSON.stringify(payload) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};
const waitForHealth = async child => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`服务提前退出：${child.exitCode}`);
    try { if ((await request('/api/health')).status === 200) return; } catch { /* 等待监听 */ }
    await wait(50);
  }
  throw new Error('等待取消竞态审计服务启动超时。');
};
const waitForJob = async id => {
  let latest;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    latest = (await request(`/api/render/jobs/${encodeURIComponent(id)}`)).body?.job;
    if (latest && ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(latest.status)) return latest;
    await wait(100);
  }
  throw new Error(`任务未在限定时间内结束：${id}`);
};
const waitForRunning = async id => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = (await request(`/api/render/jobs/${encodeURIComponent(id)}`)).body?.job;
    if (job?.status === 'RUNNING') return job;
    if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job?.status)) return job;
    await wait(25);
  }
  throw new Error(`任务未进入 RUNNING：${id}`);
};
const stop = async child => {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, wait(3_000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await Promise.race([exited, wait(3_000)]);
};

let service;
try {
  process.env.DATA_DIR = root;
  process.env.STORAGE_BACKEND = 'sqlite';
  process.env.SQLITE_DATABASE = path.join(root, 'cancel-race.sqlite');
  const { closeStoreBackend, saveBinaryAsset, saveProject } = await import('../server/store.mjs');
  const asset = await saveBinaryAsset({ buffer: await readFile(fixture), contentType: 'video/mp4', projectId: 'render-cancel-race', kind: 'shot' });
  assert.equal(asset.probeStatus, 'passed');
  const project = await saveProject({ id: 'render-cancel-race', title: '渲染取消竞态审计', revision: 1, settings: { aspectRatio: '16:9', fps: 24 }, shots: [{ id: 'shot-1', name: '取消竞态测试', videoUrl: asset.url, duration: 40, probeStatus: asset.probeStatus, mediaMetadata: asset.mediaMetadata }], timeline: [{ id: 'clip-1', track: 0, trackType: 'video', trackId: 'video-1', mediaType: 'video', mediaUrl: asset.url, duration: 40, start: 0, probeStatus: asset.probeStatus }] });
  await closeStoreBackend();

  service = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: root, STORAGE_BACKEND: 'sqlite', SQLITE_DATABASE: path.join(root, 'cancel-race.sqlite'), PORT: String(port), MOCK_MODE: 'false', LOCAL_TTS_AUTOSTART: 'false' }, stdio: 'ignore', windowsHide: true });
  await waitForHealth(service);
  const submitted = await request('/api/render/jobs', 'POST', { projectId: project.id, expectedRevision: project.revision, idempotencyKey: 'cancel-race-audit', preset: { aspectRatio: '16:9', fps: 24 }, project });
  assert.equal(submitted.status, 202, JSON.stringify(submitted.body));
  const jobId = submitted.body.job.id;
  const running = await waitForRunning(jobId);
  assert.equal(running.status, 'RUNNING');
  const cancelled = await request(`/api/render/jobs/${encodeURIComponent(jobId)}/cancel`, 'POST', {});
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  const final = await waitForJob(jobId);
  assert.equal(final.status, 'CANCELLED', JSON.stringify(final));
  assert.equal(final.code, 'RENDER_CANCELLED', JSON.stringify(final));
  assert.equal(final.progress, 100);
  assert.equal(final.result, undefined);
  await wait(500);
  const stable = (await request(`/api/render/jobs/${encodeURIComponent(jobId)}`)).body.job;
  assert.equal(stable.status, 'CANCELLED', JSON.stringify(stable));
  assert.equal(stable.code, 'RENDER_CANCELLED', JSON.stringify(stable));
  console.log(JSON.stringify({ ok: true, jobId, running: running.status, cancelResponse: cancelled.body.job.status, final: final.status, code: final.code, stableAfter500ms: stable.status, successOverwritePrevented: true }));
} finally {
  await stop(service).catch(() => undefined);
  await rm(root, { recursive: true, force: true });
}
