import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const sandbox = await mkdtemp(path.join(os.tmpdir(), 'xingmu-clean-upgrade-'));
const oldRelease = path.join(sandbox, 'release-old');
const failedRelease = path.join(sandbox, 'release-upgrade-failed');
const dataDir = path.join(sandbox, 'data');
const projectId = 'clean-upgrade-audit';
let service;

const excluded = source => {
  const relative = path.relative(root, source).replaceAll('\\', '/');
  return !['node_modules', 'dist', 'dist-demo', 'server/data', '.pnpm-store', '.audit-build', '.git'].some(item => relative === item || relative.startsWith(`${item}/`)) && !relative.endsWith('.env');
};

async function copyRelease(destination) {
  await cp(root, destination, { recursive: true, filter: excluded });
  await symlink(path.join(root, 'node_modules'), path.join(destination, 'node_modules'), 'junction');
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
}

function startRelease(release, port) {
  const output = [];
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: release,
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'false', LOCAL_TTS_AUTOSTART: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  child.stdout.on('data', chunk => output.push(String(chunk)));
  child.stderr.on('data', chunk => output.push(String(chunk)));
  child.output = output;
  return child;
}

async function waitForHealth(child, port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`服务提前退出：${child.output.join('').slice(-1000)}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return await response.json();
    } catch { /* 端口尚未就绪，继续等待 */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`服务在 ${timeoutMs}ms 内未健康：${child.output.join('').slice(-1000)}`);
}

async function stopRelease(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5_000);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
}

async function request(port, method, route, body) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

try {
  const port = await freePort();
  await copyRelease(oldRelease);

  service = startRelease(oldRelease, port);
  const beforeHealth = await waitForHealth(service, port);
  assert.equal(beforeHealth.ok, true);
  const original = { id: projectId, title: '升级前仍可恢复', type: '短片', synopsis: '保留同一数据目录验证代码升级回退。', revision: 0, timeline: [] };
  const saved = await request(port, 'PUT', `/api/projects/${projectId}`, original);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.project.revision, 1);
  const beforeRollback = await readFile(path.join(dataDir, `${projectId}.json`), 'utf8');
  await stopRelease(service);
  service = null;

  await copyRelease(failedRelease);
  await writeFile(path.join(failedRelease, 'server', 'index.mjs'), `${await readFile(path.join(failedRelease, 'server', 'index.mjs'), 'utf8')}\nthis is an intentionally invalid upgrade;\n`, 'utf8');
  const preflight = spawn(process.execPath, ['--check', 'server/index.mjs'], { cwd: failedRelease, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const preflightCode = await new Promise((resolve, reject) => {
    let output = '';
    preflight.stderr.on('data', chunk => { output += String(chunk); });
    preflight.on('error', reject);
    preflight.on('close', code => resolve({ code, output }));
  });
  assert.notEqual(preflightCode.code, 0, `故意损坏的升级代码应被预检拒绝：${preflightCode.output}`);
  assert.match(preflightCode.output, /SyntaxError|Unexpected|invalid/i);
  assert.equal(await readFile(path.join(dataDir, `${projectId}.json`), 'utf8'), beforeRollback, '升级失败不应改写数据目录');

  service = startRelease(oldRelease, port);
  const afterHealth = await waitForHealth(service, port);
  assert.equal(afterHealth.ok, true);
  const restored = await request(port, 'GET', `/api/projects/${projectId}`);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.project.id, projectId);
  assert.equal(restored.body.project.revision, 1);
  assert.equal(restored.body.project.title, original.title);
  console.log(JSON.stringify({ ok: true, preflightRejected: true, sameDataDir: true, oldReleaseHealth: true, restoredProject: projectId, restoredRevision: restored.body.project.revision, dataUnchanged: true }));
} finally {
  await stopRelease(service);
  await rm(sandbox, { recursive: true, force: true });
}
