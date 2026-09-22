import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createProjectBackup, listProjectBackups, pruneProjectBackups } from '../server/backup.mjs';

const root=await mkdtemp(path.join(os.tmpdir(),'xingmu-backup-retention-'));const dataDir=path.join(root,'data');const backupRoot=path.join(root,'backups');const id='project-retention';
try{
  await mkdir(dataDir,{recursive:true});await writeFile(path.join(dataDir,`${id}.json`),JSON.stringify({id,revision:1,payload:'a'.repeat(400)}));
  await createProjectBackup({dataDir,projectId:id,backupRoot});await new Promise(r=>setTimeout(r,5));await writeFile(path.join(dataDir,`${id}.json`),JSON.stringify({id,revision:2,payload:'b'.repeat(400)}));await createProjectBackup({dataDir,projectId:id,backupRoot});await new Promise(r=>setTimeout(r,5));await writeFile(path.join(dataDir,`${id}.json`),JSON.stringify({id,revision:3,payload:'c'.repeat(400)}));await createProjectBackup({dataDir,projectId:id,backupRoot});
  const all=await listProjectBackups({backupRoot,projectId:id,maxCount:10_000,maxBytes:Number.MAX_SAFE_INTEGER});assert.equal(all.length,3);const countPruned=await pruneProjectBackups({backupRoot,projectId:id,keep:2,maxBytes:2_000_000_000});assert.equal(countPruned.kept,2);assert.equal(countPruned.removed.length,1);
  await writeFile(path.join(dataDir,`${id}.json`),JSON.stringify({id,revision:4,payload:'d'.repeat(400)}));await new Promise(r=>setTimeout(r,5));await createProjectBackup({dataDir,projectId:id,backupRoot});const beforeBytes=await listProjectBackups({backupRoot,projectId:id,maxCount:10_000,maxBytes:Number.MAX_SAFE_INTEGER});const byteLimit=beforeBytes[0].bytes;const bytesPruned=await pruneProjectBackups({backupRoot,projectId:id,keep:5,maxBytes:byteLimit});assert.equal(bytesPruned.kept,1);assert.equal(bytesPruned.bytes<=byteLimit,true);assert.equal(JSON.parse(await readFile(path.join(dataDir,`${id}.json`))).revision,4);
  console.log(JSON.stringify({ok:true,created:3,countLimit:true,byteLimit:true,projectProtected:true,kept:bytesPruned.kept}));
}finally{await rm(root,{recursive:true,force:true})}
