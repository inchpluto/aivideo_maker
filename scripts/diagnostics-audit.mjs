import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-diagnostics-'));
const port = 4198;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'true', LOCAL_TTS_AUTOSTART: 'false' }, stdio: 'ignore' });
const request = (pathName, { method = 'GET', body, headers = {} } = {}) => new Promise(resolve => {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const req = http.request({ hostname: '127.0.0.1', port, path: pathName, method, headers: { Host: `127.0.0.1:${port}`, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}), ...headers } }, res => {
    const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', () => resolve({ status: 0, headers: {}, body: Buffer.alloc(0) }));
  if (payload) req.write(payload);
  req.end();
});
const json = response => JSON.parse(response.body.toString('utf8') || '{}');

try {
  let ready = false;
  for (let index = 0; index < 30 && !ready; index += 1) {
    ready = (await request('/api/health')).status === 200;
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true);

  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.match(String(health.headers['x-request-id']), /^[0-9a-f-]{36}$/i);

  const projectRead = await request('/api/projects/diagnostic-project');
  assert.equal(projectRead.status, 404);
  assert.equal(json(projectRead).code, 'ENOENT');
  assert.match(String(projectRead.headers['x-request-id']), /^[0-9a-f-]{36}$/i);

  const jobRead = await request('/api/render/jobs/diagnostic-job-1');
  assert.equal(jobRead.status, 404);
  assert.equal(json(jobRead).code, 'ENOENT');

  const rejected = await request('/api/render/jobs', { method: 'POST', body: { projectId: 'missing-project', token: 'Bearer supersecret-test-token-123456' } });
  assert.equal(rejected.status, 404);
  assert(!rejected.body.toString('utf8').includes('supersecret-test-token-123456'));

  const report = await request('/api/diagnostics');
  assert.equal(report.status, 200);
  const payload = json(report);
  assert.equal(payload.ok, true);
  assert.equal(payload.schemaVersion, 1);
  assert(Number.isInteger(payload.metrics.generationQueueLength));
  assert(Number.isInteger(payload.metrics.generationActiveCount));
  assert(Number.isInteger(payload.metrics.renderActiveCount));
  assert(payload.metrics.dataDirFreeBytes === null || payload.metrics.dataDirFreeBytes >= 0);
  assert(Array.isArray(payload.recent));
  const projectEntry = payload.recent.find(item => item.path === '/api/projects/diagnostic-project');
  const jobEntry = payload.recent.find(item => item.path === '/api/render/jobs/diagnostic-job-1');
  assert.equal(projectEntry?.status, 404);
  assert.equal(projectEntry?.projectId, 'diagnostic-project');
  assert.equal(projectEntry?.errorCode, 'ENOENT');
  assert.equal(jobEntry?.jobId, 'diagnostic-job-1');
  assert.equal(jobEntry?.errorCode, 'ENOENT');
  for (const entry of payload.recent) {
    assert.deepEqual(Object.keys(entry).sort(), ['durationMs', 'errorCode', 'jobId', 'method', 'path', 'projectId', 'requestId', 'status', 'timestamp']);
    assert(!JSON.stringify(entry).includes('supersecret-test-token-123456'));
    assert(!entry.path.includes('?'));
  }
  console.log(JSON.stringify({ ok: true, requestId: true, projectCorrelation: true, jobCorrelation: true, redacted: true, metrics: true, schemaVersion: payload.schemaVersion }));
} finally {
  child.kill();
  await rm(dataDir, { recursive: true, force: true });
}
