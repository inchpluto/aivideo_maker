import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyCacheCleanup, previewCacheCleanup } from '../server/cleanup.mjs';

const dataDir=await mkdtemp(path.join(os.tmpdir(),'xingmu-cleanup-audit-'));const old=new Date(Date.now()-3*24*60*60*1000);
try{
  await mkdir(path.join(dataDir,'render','orphan-old'),{recursive:true});await writeFile(path.join(dataDir,'render','orphan-old','deliverable.mp4'),'orphan');await utimes(path.join(dataDir,'render','orphan-old','deliverable.mp4'),old,old);await utimes(path.join(dataDir,'render','orphan-old'),old,old);
  await mkdir(path.join(dataDir,'render','live-project'),{recursive:true});await writeFile(path.join(dataDir,'live-project.json'),JSON.stringify({id:'live-project'}));await writeFile(path.join(dataDir,'render','live-project','deliverable.mp4'),'live');await utimes(path.join(dataDir,'render','live-project'),old,old);
  await writeFile(path.join(dataDir,'.probe-old-1'),'temporary');await utimes(path.join(dataDir,'.probe-old-1'),old,old);await writeFile(path.join(dataDir,'.upload-old-1.part'),'partial');await utimes(path.join(dataDir,'.upload-old-1.part'),old,old);await writeFile(path.join(dataDir,'.upload-fresh-1.part'),'active');const fresh=new Date(Date.now()+365*24*60*60*1000);await utimes(path.join(dataDir,'.upload-fresh-1.part'),fresh,fresh);await mkdir(path.join(dataDir,'assets','live-project'),{recursive:true});await writeFile(path.join(dataDir,'assets','live-project','keep.mp4'),'keep');await utimes(path.join(dataDir,'assets','live-project','keep.mp4'),old,old);
  const plan=await previewCacheCleanup({dataDir,maxAgeMs:24*60*60*1000,now:Date.now()+365*24*60*60*1000});assert.equal(plan.candidates.length,3,JSON.stringify(plan));assert.ok(plan.candidates.some(item=>item.kind==='orphan-render-cache'));assert.ok(plan.candidates.filter(item=>item.kind==='stale-temporary').length===2);assert.ok(plan.protected.some(item=>item.reason==='project-referenced'));assert.ok(plan.protected.some(item=>item.path.endsWith('.upload-fresh-1.part')));
  const dry=await applyCacheCleanup(plan,{dryRun:true});assert.equal(dry.removed.length,0);const applied=await applyCacheCleanup(plan,{dryRun:false});assert.equal(applied.removed.length,3);await assert.rejects(()=>stat(path.join(dataDir,'render','orphan-old')));await assert.rejects(()=>stat(path.join(dataDir,'.probe-old-1')));await assert.rejects(()=>stat(path.join(dataDir,'.upload-old-1.part')));assert.ok(await stat(path.join(dataDir,'.upload-fresh-1.part')));
  assert.ok(await stat(path.join(dataDir,'render','live-project')));assert.equal(await readFile(path.join(dataDir,'assets','live-project','keep.mp4'),'utf8'),'keep');
  console.log(JSON.stringify({ok:true,orphanRemoved:true,staleTempRemoved:true,resumableUploadProtected:true,liveRenderProtected:true,projectAssetProtected:true,dryRun:true}));
}finally{await rm(dataDir,{recursive:true,force:true})}
