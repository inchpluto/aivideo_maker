import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-sqlite-switch-'));
const databaseFile = path.join(dataDir, 'state', 'xingmu.sqlite');
const projectId = 'sqlite-switch-audit';
const project = { id: projectId, title: '切换前项目', type: '短片', synopsis: '验证同一数据目录的后端切换与回退。', revision: 1, timeline: [], episodes: [], shots: [], updatedAt: 'switch-before' };
let service;

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const address = probe.address(); probe.close(() => resolve(address.port)); });
});

function startService(port, backend) {
  const output = [];
  const env = { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'true', LOCAL_TTS_AUTOSTART: 'false', STORAGE_BACKEND: backend, SQLITE_DATABASE: databaseFile };
  if (backend !== 'sqlite') delete env.STORAGE_BACKEND;
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.output = output;
  child.stdout.on('data', chunk => output.push(String(chunk)));
  child.stderr.on('data', chunk => output.push(String(chunk)));
  return child;
}

async function waitForHealth(child, port) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`服务提前退出：${child.output.join('').slice(-1200)}`);
    try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) return response.json(); } catch { /* 等待监听 */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`服务未在期限内就绪：${child.output.join('').slice(-1200)}`);
}

async function stopService(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5_000);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
}

async function readProject(port) {
  const response = await fetch(`http://127.0.0.1:${port}/api/projects/${projectId}`);
  assert.equal(response.status, 200);
  return (await response.json()).project;
}

try {
  await mkdir(path.join(dataDir, 'jobs'), { recursive: true });
  await writeFile(path.join(dataDir, `${projectId}.json`), JSON.stringify(project), 'utf8');
  const beforeSource = await readFile(path.join(dataDir, `${projectId}.json`), 'utf8');
  const dry = spawnSync(process.execPath, ['scripts/migrate-json-to-sqlite.mjs', '--data-dir', dataDir, '--database', databaseFile], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(dry.status, 0, dry.stderr);
  const applied = spawnSync(process.execPath, ['scripts/migrate-json-to-sqlite.mjs', '--data-dir', dataDir, '--database', databaseFile, '--apply'], { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(applied.status, 0, applied.stderr);
  const appliedReport = JSON.parse(applied.stdout);
  assert.equal(appliedReport.imported.projects, 1);
  assert.ok((await readdir(appliedReport.backupDir)).includes(`${projectId}.json`));

  const port = await freePort();
  service = startService(port, 'atomic-json');
  await waitForHealth(service, port);
  assert.deepEqual(await readProject(port), project);
  await stopService(service);
  service = null;

  service = startService(port, 'sqlite');
  await waitForHealth(service, port);
  assert.deepEqual(await readProject(port), project);
  const sqliteUpdate = await fetch(`http://127.0.0.1:${port}/api/projects/${projectId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...project, expectedRevision: 1, title: 'SQLite 切换后项目' }) });
  assert.equal(sqliteUpdate.status, 200);
  assert.equal((await sqliteUpdate.json()).project.revision, 2);
  await stopService(service);
  service = null;

  service = startService(port, 'atomic-json');
  await waitForHealth(service, port);
  assert.deepEqual(await readProject(port), project, '关闭 SQLite 后 JSON 源应可直接回退');
  assert.equal(await readFile(path.join(dataDir, `${projectId}.json`), 'utf8'), beforeSource, 'SQLite 写入不应覆盖 JSON 源');
  console.log(JSON.stringify({ ok: true, dryRun: true, migrationApplied: true, jsonBefore: true, sqliteRead: true, sqliteWriteRevision: 2, jsonRollbackRead: true, sourcePreserved: true, backupPreserved: true }));
} finally {
  await stopService(service);
  await rm(dataDir, { recursive: true, force: true });
}
