import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createZip, PROJECT_PACKAGE_FORMAT, PROJECT_PACKAGE_VERSION } from '../server/projectPackage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-package-disk-'));
const port = 49800 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), PACKAGE_DISK_RESERVE_BYTES: '1000000000000', LOCAL_TTS_AUTOSTART: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
const waitForServer = async () => { const deadline = Date.now() + 10_000; while (Date.now() < deadline) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`服务未启动：${logs.slice(-1000)}`); };
try {
  const projectData = Buffer.from(JSON.stringify({ id: 'package-disk-audit', timeline: [] }));
  const manifestData = Buffer.from(JSON.stringify({ format: PROJECT_PACKAGE_FORMAT, version: PROJECT_PACKAGE_VERSION, projectId: 'package-disk-audit', project: { path: 'project.json', bytes: projectData.length, sha256: createHash('sha256').update(projectData).digest('hex') }, entries: [], missingRefs: [] }));
  const packageBuffer = createZip([{ path: 'manifest.json', data: manifestData }, { path: 'project.json', data: projectData }]);
  await waitForServer();
  const response = await fetch(`${base}/api/projects/package/inspect`, { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: packageBuffer });
  const body = await response.json();
  assert.equal(response.status, 507, JSON.stringify(body));
  assert.equal(body.code, 'PACKAGE_DISK_SPACE_LOW');
  assert.deepEqual((await readdir(dataDir)).filter(name => name.startsWith('.package-') && name.endsWith('.part')), []);
  console.log(JSON.stringify({ ok: true, lowSpaceRejected: true, status: response.status, temporaryFilesClean: true }));
} finally {
  child.kill();
  await new Promise(resolve => setTimeout(resolve, 150));
  await rm(dataDir, { recursive: true, force: true });
}
