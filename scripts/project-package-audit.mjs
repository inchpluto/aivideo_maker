import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createProjectPackage, importProjectPackage, inspectProjectPackage } from '../server/projectPackage.mjs';

const root=await mkdtemp(path.join(tmpdir(),'xingmu-project-package-'));
try {
  const projectId='package-audit'; const assetRoot=path.join(root,'assets',projectId); await mkdir(assetRoot,{recursive:true}); await writeFile(path.join(assetRoot,'shot.mp4'),Buffer.from('media-fixture'),'binary');
  const project={id:projectId,title:'可迁移项目',characters:[],episodes:[],shots:[{id:'shot-1',videoUrl:`/api/assets/${projectId}/shot.mp4`,imageUrl:`/api/assets/${projectId}/missing.png`}],assets:{localMedia:[]},credentials:{apiKey:'must-not-export'}};
  await assert.rejects(()=>createProjectPackage({project,dataDir:root}),error=>error.code==='PACKAGE_CREDENTIALS_FOUND');
  delete project.credentials;
  const packaged=await createProjectPackage({project,dataDir:root}); const inspected=inspectProjectPackage(packaged.buffer);
  assert.equal(inspected.legacy,false); assert.equal(inspected.manifest.format,'xingmu-project-package'); assert.equal(inspected.manifest.entries.length,1); assert.equal(inspected.project.shots[0].videoUrl,'asset://asset-b51ec014b15f942551263d60');
  assert.equal(inspected.preflight.complete,false); assert.equal(inspected.preflight.missingAssetIds.length,0); assert.equal(inspected.manifest.missingRefs.length,1);
  assert.match(JSON.stringify(inspected.project),/asset:\/\//); assert(!JSON.stringify(inspected.manifest).match(/G:\\|Users\\|API_KEY/));
  const corrupt=Buffer.from(packaged.buffer); const mediaIndex=corrupt.indexOf(Buffer.from('media-fixture')); assert(mediaIndex>0); corrupt[mediaIndex]^=1; assert.throws(()=>inspectProjectPackage(corrupt),error=>error.code==='PACKAGE_CHECKSUM_MISMATCH'||error.code==='PACKAGE_ZIP_INVALID');
  const legacy=inspectProjectPackage(Buffer.from(JSON.stringify({format:'xingmu-project-v1',project:{id:'legacy-1',title:'旧 JSON'}}))); assert.equal(legacy.legacy,true); assert.equal(legacy.project.id,'legacy-1');
  assert.throws(()=>inspectProjectPackage(Buffer.from(JSON.stringify({id:'bad',settings:{pythonPath:'C:\\Users\\someone\\model'}}))),error=>error.code==='PACKAGE_ABSOLUTE_PATH');
  const importRoot=path.join(root,'imported'); await assert.rejects(()=>importProjectPackage({input:packaged.buffer,dataDir:importRoot}),error=>error.code==='PACKAGE_MISSING_ASSETS'); const imported=await importProjectPackage({input:packaged.buffer,dataDir:importRoot,allowMissing:true}); assert.equal(imported.projectId,'package-audit'); assert.equal(imported.conflictCopied,false); assert.match(imported.project.shots[0].videoUrl,/api\/assets\/package-audit/); assert.match(imported.project.shots[0].imageUrl,/^missing:\/\/asset\//); const copied=await importProjectPackage({input:packaged.buffer,dataDir:importRoot,allowMissing:true}); assert.equal(copied.conflictCopied,true); assert.notEqual(copied.projectId,'package-audit');
  console.log(JSON.stringify({ok:true,format:inspected.manifest.format,assets:inspected.manifest.entries.length,legacyCompatible:legacy.legacy,corrupt:'rejected',absolutePath:'rejected',missing:'explicit-relink',atomicImport:true,conflictCopy:true}));
} finally { await rm(root,{recursive:true,force:true}); }
