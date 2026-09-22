import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-reconcile-http-'));
const reservePort = async () => {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
};
const port = await reservePort();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = async (pathname, method = 'GET', payload) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers: payload ? { 'content-type':'application/json' } : undefined, body: payload ? JSON.stringify(payload) : undefined });
    const text = await response.text();
    let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status:response.status, body };
  } catch (error) { return { status:0, body:{ error:error.message } }; }
};
const waitForHealth = async child => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`服务提前退出：${child.exitCode}`);
    if ((await request('/api/health')).status === 200) return;
    await wait(50);
  }
  throw new Error('等待 HTTP 对账审计服务启动超时。');
};
const waitForExit = child => new Promise(resolve => {
  if (child.exitCode !== null || child.signalCode !== null) return resolve();
  child.once('exit', resolve);
});
const stop = async child => {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([waitForExit(child), wait(3_000)]);
  if (child.exitCode === null && child.signalCode === null && process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio:'ignore' });
  await waitForExit(child);
};
const startServer = ({ mock = false, failure = '', delayMs = 0 } = {}) => spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, DATA_DIR:root, STORAGE_BACKEND:'sqlite', SQLITE_DATABASE:path.join(root, 'reconcile.sqlite'), PORT:String(port), MOCK_MODE:mock ? 'true' : 'false', NODE_ENV:'test', XINGMU_TEST_PROVIDER_FAILURE:failure, XINGMU_TEST_PROVIDER_DELAY_MS:String(delayMs) },
  stdio:'ignore',
});
const payload = { title:'对账边界审计', synopsis:'角色在雨夜确认一条无法核实的线索。', genre:'悬疑', type:'短剧', episodeLength:60, aspectRatio:'9:16' };
const waitForJob = async id => {
  let latest;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    latest = (await request(`/api/generate/jobs/${encodeURIComponent(id)}`)).body?.job;
    if (latest && ['SUCCEEDED','FAILED','CANCELLED','needs_reconcile','awaiting_budget'].includes(latest.status)) return latest;
    await wait(100);
  }
  throw new Error(`任务未在限定时间内结束：${id}`);
};
const waitForStatus = async (id, expected) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = (await request(`/api/generate/jobs/${encodeURIComponent(id)}`)).body?.job;
    if (job?.status === expected) return job;
    await wait(50);
  }
  throw new Error(`任务未进入 ${expected}：${id}`);
};

let firstServer;
let secondServer;
let thirdServer;
try {
  firstServer = startServer({ failure:'needs_reconcile' });
  await waitForHealth(firstServer);
  const submitted = await request('/api/generate/jobs', 'POST', { task:'story', projectId:'reconcile-http-audit', route:'gpt-5.6', idempotencyKey:'reconcile-http-key', payload });
  assert.equal(submitted.status, 202, JSON.stringify(submitted.body));
  const firstId = submitted.body.job.id;
  const reconciled = await waitForJob(firstId);
  assert.equal(reconciled.status, 'needs_reconcile');
  assert.equal(reconciled.code, 'NEEDS_RECONCILE');
  assert.match(reconciled.failure, /无法确认|对账/);
  const duplicate = await request('/api/generate/jobs', 'POST', { task:'story', projectId:'reconcile-http-audit', route:'gpt-5.6', idempotencyKey:'reconcile-http-key', payload });
  assert.equal(duplicate.status, 202, JSON.stringify(duplicate.body));
  assert.equal(duplicate.body.job.id, firstId);
  const listed = await request('/api/jobs?projectId=reconcile-http-audit');
  assert.equal(listed.status, 200);
  assert.ok(listed.body.jobs.some(job => job.id === firstId && job.events.some(event => event.type === 'needs_reconcile')));
  await stop(firstServer); firstServer = null;

  secondServer = startServer({ mock:true });
  await waitForHealth(secondServer);
  const retried = await request(`/api/generate/jobs/${encodeURIComponent(firstId)}/retry`, 'POST', {});
  assert.equal(retried.status, 202, JSON.stringify(retried.body));
  const succeeded = await waitForJob(firstId);
  assert.equal(succeeded.status, 'SUCCEEDED', JSON.stringify(succeeded));
  assert.ok(succeeded.events.some(event => event.type === 'manual_retry'));
  assert.ok(succeeded.events.some(event => event.type === 'succeeded'));
  await stop(secondServer); secondServer = null;

  thirdServer = startServer({ failure:'needs_reconcile', delayMs:500 });
  await waitForHealth(thirdServer);
  const cancellable = await request('/api/generate/jobs', 'POST', { task:'story', projectId:'reconcile-http-audit', route:'gpt-5.6', payload });
  assert.equal(cancellable.status, 202, JSON.stringify(cancellable.body));
  const cancelId = cancellable.body.job.id;
  await waitForStatus(cancelId, 'RUNNING');
  const cancelled = await request(`/api/generate/jobs/${encodeURIComponent(cancelId)}/cancel`, 'POST', {});
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  await waitForJob(cancelId);
  await wait(800);
  const cancelledFinal = (await request(`/api/generate/jobs/${encodeURIComponent(cancelId)}`)).body.job;
  assert.equal(cancelledFinal.status, 'CANCELLED', JSON.stringify(cancelledFinal));
  assert.equal(cancelledFinal.code, 'TASK_CANCELLED');
  assert.ok(cancelledFinal.events.some(event => event.type === 'cancelled'));
  assert.ok(!cancelledFinal.events.some(event => event.type === 'needs_reconcile'));
  console.log(JSON.stringify({ ok:true, needsReconcile:'verified', duplicateJob:'same-id', retry:'SUCCEEDED', cancellation:'CANCELLED', cancelNotDowngraded:true, eventTypes:cancelledFinal.events.map(event => event.type) }));
} finally {
  await stop(firstServer).catch(() => undefined);
  await stop(secondServer).catch(() => undefined);
  await stop(thirdServer).catch(() => undefined);
  await rm(root, { recursive:true, force:true }).catch(() => undefined);
}
