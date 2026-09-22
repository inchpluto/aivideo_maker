import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-cross-project-'));
const port = 4199;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'true', LOCAL_TTS_AUTOSTART: 'false' }, stdio: 'ignore' });
const request = (pathName, { method = 'GET', body } = {}) => new Promise(resolve => {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const req = http.request({ hostname: '127.0.0.1', port, path: pathName, method, headers: { Host: `127.0.0.1:${port}`, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}) } }, res => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) })); });
  req.on('error', () => resolve({ status: 0, body: Buffer.alloc(0) })); if (payload) req.write(payload); req.end();
});
const json = response => JSON.parse(response.body.toString('utf8') || '{}');
const project = id => ({ id, revision: 0, title: id, type: 'AI 视频', settings: { aspectRatio: '16:9', fps: 24 }, workflow: { current: 'editor', completion: 90 }, shots: [], timeline: [], assets: { localMedia: [] }, characters: [], episodes: [], jobs: [] });

try {
  let ready = false; for (let index = 0; index < 30 && !ready; index += 1) { ready = (await request('/api/health')).status === 200; if (!ready) await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(ready, true);
  assert.equal((await request('/api/projects/project-a', { method: 'PUT', body: project('project-a') })).status, 200);
  assert.equal((await request('/api/projects/project-b', { method: 'PUT', body: project('project-b') })).status, 200);

  const created = await Promise.all(['project-a', 'project-b'].map(projectId => request('/api/generate/jobs', { method: 'POST', body: { task: 'story', projectId, payload: { projectId, title: projectId }, idempotencyKey: `cross-${projectId}` } })));
  assert.deepEqual(created.map(item => item.status), [202, 202]);
  const jobs = created.map(item => json(item).job);
  assert.equal(jobs[0].projectId, 'project-a');
  assert.equal(jobs[1].projectId, 'project-b');

  const isolatedA = json(await request('/api/jobs?projectId=project-a')).jobs;
  const isolatedB = json(await request('/api/jobs?projectId=project-b')).jobs;
  assert(isolatedA.length >= 1 && isolatedA.every(item => item.projectId === 'project-a'));
  assert(isolatedB.length >= 1 && isolatedB.every(item => item.projectId === 'project-b'));
  assert(!isolatedA.some(item => item.projectId === 'project-b'));
  assert(!isolatedB.some(item => item.projectId === 'project-a'));

  const cancelled = await Promise.all(jobs.map(job => request(`/api/generate/jobs/${encodeURIComponent(job.id)}/cancel`, { method: 'POST' })));
  const terminalStatuses = cancelled.map(item => json(item).job.status);
  assert(terminalStatuses.every(status => ['CANCELLED', 'SUCCEEDED', 'FAILED', 'WAITING_PROVIDER', 'awaiting_budget', 'needs_reconcile'].includes(status)));
  const afterA = json(await request('/api/projects/project-a')).project;
  const afterB = json(await request('/api/projects/project-b')).project;
  assert.equal(afterA.title, 'project-a'); assert.equal(afterB.title, 'project-b');
  assert.equal(afterA.revision, 1); assert.equal(afterB.revision, 1);
  console.log(JSON.stringify({ ok: true, projects: 2, isolatedA: isolatedA.length, isolatedB: isolatedB.length, cancellationTerminal: true, projectDataUnchanged: true }));
} finally { child.kill(); await rm(dataDir, { recursive: true, force: true }); }
