import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createProjectBackup, restoreProjectBackup, verifyProjectBackup } from '../server/backup.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-backup-')); const dataDir=path.join(root,'data'); const backupRoot=path.join(root,'backups'); const restored=path.join(root,'restored');
try {
  await mkdir(path.join(dataDir, 'jobs'), { recursive:true }); await writeFile(path.join(dataDir, 'project-audit.json'), JSON.stringify({ id:'project-audit', revision:2 }), 'utf8'); await writeFile(path.join(dataDir, 'jobs', 'job-audit.json'), JSON.stringify({ id:'job-audit', projectId:'project-audit', status:'SUCCEEDED' }), 'utf8'); await writeFile(path.join(dataDir, 'jobs', 'job-other.json'), JSON.stringify({ id:'job-other', projectId:'other', status:'SUCCEEDED' }), 'utf8');
  const created=await createProjectBackup({dataDir,projectId:'project-audit',backupRoot}); const checked=await verifyProjectBackup(created.folder); assert.equal(checked.files,2); assert.equal(created.manifest.files.some(item=>item.path.includes('job-other')), false);
  await restoreProjectBackup({folder:created.folder,dataDir:restored}); assert.equal(JSON.parse(await readFile(path.join(restored,'project-audit.json'),'utf8')).revision,2);
  await writeFile(path.join(created.folder,'project-audit.json'), '{tampered}', 'utf8'); await assert.rejects(()=>verifyProjectBackup(created.folder), /备份校验失败/); await writeFile(path.join(restored,'project-audit.json'), JSON.stringify({ id:'project-audit', revision:9 }), 'utf8'); await assert.rejects(()=>restoreProjectBackup({folder:created.folder,dataDir:restored}), /备份校验失败/); assert.equal(JSON.parse(await readFile(path.join(restored,'project-audit.json'),'utf8')).revision,9);
  console.log(JSON.stringify({ok:true,files:checked.files,restore:'verified',tamper:'rejected',failedRestore:'unchanged'}));
} finally { await rm(root,{recursive:true,force:true}); }
