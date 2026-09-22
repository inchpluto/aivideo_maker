import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createZip, inspectProjectPackage, PROJECT_PACKAGE_FORMAT, PROJECT_PACKAGE_MAX_BYTES, PROJECT_PACKAGE_VERSION } from '../server/projectPackage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-package-pressure-'));
const port = 49000 + Math.floor(Math.random() * 800);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), PACKAGE_UPLOAD_LIMIT_BYTES: '1000000', LOCAL_TTS_AUTOSTART: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
const memory = () => {
  const usage = process.memoryUsage();
  return { rss: usage.rss, heapUsed: usage.heapUsed, external: usage.external, arrayBuffers: usage.arrayBuffers };
};
const sha256 = data => createHash('sha256').update(data).digest('hex');
const request = async (pathname, options = {}) => {
  const response = await fetch(`${base}${pathname}`, options);
  const type = response.headers.get('content-type') || '';
  return { response, body: type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer()) };
};
const waitForServer = async () => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${base}/api/health`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`服务未启动：${logs.slice(-1000)}`);
};
const packageTempFiles = async () => (await readdir(dataDir)).filter(name => name.startsWith('.package-') && name.endsWith('.part'));

try {
  const projectData = Buffer.from(JSON.stringify({ id: 'package-pressure-audit', title: '受控压力审计', timeline: [] }));
  const manifestData = Buffer.from(JSON.stringify({
    format: PROJECT_PACKAGE_FORMAT,
    version: PROJECT_PACKAGE_VERSION,
    projectId: 'package-pressure-audit',
    project: { path: 'project.json', bytes: projectData.length, sha256: sha256(projectData) },
    entries: [],
    missingRefs: [],
  }));
  const validPackage = createZip([{ path: 'manifest.json', data: manifestData }, { path: 'project.json', data: projectData }]);
  const inspected = inspectProjectPackage(validPackage);
  assert.equal(inspected.preflight.complete, true);

  const multiData = Array.from({ length: 64 }, (_, index) => ({ path: `assets/entry-${index}.bin`, data: Buffer.alloc(4096, index) }));
  const multiProjectData = Buffer.from(JSON.stringify({ id: 'package-multi-audit', timeline: [] }));
  const multiManifestData = Buffer.from(JSON.stringify({
    format: PROJECT_PACKAGE_FORMAT,
    version: PROJECT_PACKAGE_VERSION,
    projectId: 'package-multi-audit',
    project: { path: 'project.json', bytes: multiProjectData.length, sha256: sha256(multiProjectData) },
    entries: multiData.map(item => ({ path: item.path, assetId: item.path.replace(/[^a-z0-9]/gi, '-'), kind: 'asset', scope: '', sourcePath: '', bytes: item.data.length, sha256: sha256(item.data) })),
    missingRefs: [],
  }));
  const multiPackage = createZip([{ path: 'manifest.json', data: multiManifestData }, { path: 'project.json', data: multiProjectData }, ...multiData]);
  const multiInspected = inspectProjectPackage(multiPackage);
  assert.equal(multiInspected.entries.size, multiData.length + 2);
  assert.equal(multiInspected.entries.get(multiData[0].path).buffer, multiPackage.buffer);

  const checksumDamaged = Buffer.from(validPackage);
  const projectOffset = checksumDamaged.lastIndexOf(projectData);
  assert.ok(projectOffset > 0);
  checksumDamaged[projectOffset] ^= 0x01;
  assert.throws(() => inspectProjectPackage(checksumDamaged), error => error?.code === 'PACKAGE_CHECKSUM_MISMATCH');

  const structureDamaged = Buffer.from(validPackage);
  const centralOffset = structureDamaged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.ok(centralOffset > 0);
  structureDamaged.writeUInt16LE(0xffff, centralOffset + 32);
  assert.throws(() => inspectProjectPackage(structureDamaged), error => error?.code === 'PACKAGE_ZIP_INVALID');

  const memoryBeforeGuard = memory();
  const oversized = Buffer.allocUnsafe(PROJECT_PACKAGE_MAX_BYTES + 1);
  assert.throws(() => inspectProjectPackage(oversized), error => error?.code === 'PACKAGE_TOO_LARGE');
  const memoryAfterGuard = memory();
  assert.equal(oversized.length, PROJECT_PACKAGE_MAX_BYTES + 1);

  await waitForServer();
  const corruptInspect = await request('/api/projects/package/inspect', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: checksumDamaged });
  assert.equal(corruptInspect.response.status, 422, JSON.stringify(corruptInspect.body));
  assert.equal(corruptInspect.body.code, 'PACKAGE_CHECKSUM_MISMATCH');
  const corruptImport = await request('/api/projects/package/import?allowMissing=true', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: structureDamaged });
  assert.equal(corruptImport.response.status, 422, JSON.stringify(corruptImport.body));
  assert.equal(corruptImport.body.code, 'PACKAGE_ZIP_INVALID');
  const tooLargeForConfiguredLimit = Buffer.alloc(1_000_001, 0x7f);
  const oversizedRequest = await request('/api/projects/package/inspect', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: tooLargeForConfiguredLimit });
  assert.equal(oversizedRequest.response.status, 413, JSON.stringify(oversizedRequest.body));
  assert.equal(oversizedRequest.body.code, 'MEDIA_TOO_LARGE');
  assert.deepEqual(await packageTempFiles(), []);

  console.log(JSON.stringify({
    ok: true,
    validPackageInspected: true,
    multiEntryCount: multiInspected.entries.size,
    entriesShareInputBuffer: true,
    checksumRejected: true,
    structuralCorruptionRejected: true,
    oversizedDirectRejected: true,
    configuredLimitStatus: oversizedRequest.response.status,
    requestLimitRejected: true,
    temporaryFilesClean: true,
    memoryBeforeGuard,
    memoryAfterGuard,
    rssDeltaBytes: memoryAfterGuard.rss - memoryBeforeGuard.rss,
  }));
} finally {
  child.kill();
  await new Promise(resolve => setTimeout(resolve, 150));
  await rm(dataDir, { recursive: true, force: true });
}
