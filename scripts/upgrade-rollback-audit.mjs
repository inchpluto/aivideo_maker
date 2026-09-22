import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createProjectBackup, restoreProjectBackup } from '../server/backup.mjs';

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-upgrade-rollback-'));
const backupRoot = path.join(dataDir, 'backups');
const projectId = 'rollback-audit';
const original = { id:projectId, title:'回退前项目', revision:7, timeline:[{id:'clip-1', start:0, duration:1}], updatedAt:'before-upgrade' };
try {
  await writeFile(path.join(dataDir, `${projectId}.json`), JSON.stringify(original), 'utf8');
  const backup = await createProjectBackup({ dataDir, projectId, backupRoot });
  const upgraded = { ...original, title:'升级后的项目', revision:8, timeline:[{id:'clip-1', start:2, duration:1}], updatedAt:'after-upgrade' };
  await writeFile(path.join(dataDir, `${projectId}.json`), JSON.stringify(upgraded), 'utf8');
  const restored = await restoreProjectBackup({ folder:backup.folder, dataDir });
  const actual = JSON.parse(await readFile(path.join(dataDir, `${projectId}.json`), 'utf8'));
  assert.equal(restored.ok, true);
  assert.deepEqual(actual, original);
  console.log(JSON.stringify({ ok:true, backupId:backup.backupId, upgradedRevision:upgraded.revision, restoredRevision:actual.revision, dataDirPreserved:true }));
} finally {
  await rm(dataDir, { recursive:true, force:true });
}
