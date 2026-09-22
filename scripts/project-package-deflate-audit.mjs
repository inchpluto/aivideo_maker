import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createZip, inspectProjectPackage, inspectProjectPackageFile, importProjectPackage, PROJECT_PACKAGE_FORMAT, PROJECT_PACKAGE_VERSION } from '../server/projectPackage.mjs';

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-package-deflate-'));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const projectId = 'package-deflate-audit';
const media = Buffer.from('deflate media payload '.repeat(2000));
const project = { id: projectId, title: 'Deflate 项目包审计', timeline: [{ id: 'clip-1', mediaUrl: 'asset://asset-a' }] };
const projectData = Buffer.from(JSON.stringify(project));
const assetPath = 'assets/asset-a-sample.bin';
const manifest = {
  format: PROJECT_PACKAGE_FORMAT,
  version: PROJECT_PACKAGE_VERSION,
  projectId,
  project: { path: 'project.json', bytes: projectData.length, sha256: sha256(projectData) },
  entries: [{ path: assetPath, assetId: 'asset-a', kind: 'asset', scope: projectId, sourcePath: 'sample.bin', bytes: media.length, sha256: sha256(media) }],
  missingRefs: []
};

try {
  const zip = createZip([
    { path: 'manifest.json', data: Buffer.from(JSON.stringify(manifest)), compression: 'deflate' },
    { path: 'project.json', data: projectData, compression: 'deflate' },
    { path: assetPath, data: media, compression: 'deflate' }
  ]);
  const inspected = inspectProjectPackage(zip);
  assert.equal(inspected.preflight.complete, true);
  assert.deepEqual(inspected.entries.get(assetPath), media);
  assert.ok(zip.length < media.length, 'deflate 包应小于原始媒体数据');

  const packagePath = path.join(dataDir, 'compressed.xingmu.zip');
  await writeFile(packagePath, zip);
  const fileInspected = await inspectProjectPackageFile(packagePath);
  assert.equal(fileInspected.preflight.complete, true);
  assert.equal(fileInspected.entries.get(assetPath).bytes, media.length);
  const imported = await importProjectPackage({ inputPath: packagePath, dataDir, conflict: 'reject' });
  assert.equal(imported.projectId, projectId);
  assert.deepEqual(await readFile(path.join(dataDir, 'assets', projectId, path.basename(assetPath))), media);

  const zip64 = Buffer.from(zip);
  zip64.writeUInt16LE(0xffff, zip64.length - 22 + 10);
  assert.throws(() => inspectProjectPackage(zip64), error => error?.code === 'PACKAGE_ZIP_UNSUPPORTED');
  const zip64Path = path.join(dataDir, 'zip64.xingmu.zip');
  await writeFile(zip64Path, zip64);
  await assert.rejects(() => inspectProjectPackageFile(zip64Path), error => error?.code === 'PACKAGE_ZIP_UNSUPPORTED');
  console.log(JSON.stringify({ ok: true, compression: 'deflate', inMemory: true, fileScan: true, imported: true, mediaBytes: media.length, zipBytes: zip.length, zip64: 'explicitly-rejected' }));
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
