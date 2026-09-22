import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { mkdtemp, open, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { inspectProjectPackageFile } from '../server/projectPackage.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(os.tmpdir(),'xingmu-package-stream-'));
const port=49000+Math.floor(Math.random()*800);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dataDir,PORT:String(port),INDEX_TTS_AUTOSTART:'false'},stdio:['ignore','pipe','pipe']});
const execFileAsync=promisify(execFile);
let output='';child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk});
const waitForServer=async()=>{const deadline=Date.now()+10_000;while(Date.now()<deadline){try{const response=await fetch(`${base}/api/health`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`服务未启动：${output.slice(-1000)}`)};
const writeResponse=async(response,target)=>{assert(response.body);const handle=await open(target,'wx');let bytes=0;let chunks=0;try{const reader=response.body.getReader();while(true){const part=await reader.read();if(part.done)break;const chunk=Buffer.from(part.value);await handle.write(chunk);bytes+=chunk.length;chunks++;}await handle.sync();}finally{await handle.close().catch(()=>undefined);}return {bytes,chunks};};
const streamRequest=async(pathname,options={})=>fetch(`${base}${pathname}`,{...options,duplex:'half'});
try{
  await waitForServer();
  const projectId='package-stream-audit';
  const project={id:projectId,title:'项目包流式审计',type:'AI 视频',revision:0,shots:[],timeline:[],assets:{localMedia:[]},updatedAt:new Date().toISOString()};
  const saved=await fetch(`${base}/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});assert.equal(saved.status,200);const savedBody=await saved.json();project.revision=savedBody.project.revision;
  const fixturePath=path.join(dataDir,'fixture.mp4');await execFileAsync(process.env.FFMPEG_PATH||'ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-t','6','-an','-c:v','libx264','-preset','ultrafast','-qp','0',fixturePath],{windowsHide:true});const fixtureInfo=await stat(fixturePath);assert(fixtureInfo.size>1024*1024);const asset=await streamRequest(`/api/assets/media?projectId=${projectId}&kind=reference`,{method:'POST',headers:{'Content-Type':'video/mp4'},body:createReadStream(fixturePath)});assert.equal(asset.status,201);const assetBody=await asset.json();project.assets.localMedia=[{id:'stream-fixture',name:'fixture.mp4',kind:'video',url:assetBody.asset.url}];
  const updated=await fetch(`${base}/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});assert.equal(updated.status,200);
  const packagePath=path.join(dataDir,'streamed-package.zip');const exported=await fetch(`${base}/api/projects/${projectId}/package`);assert.equal(exported.status,200);const written=await writeResponse(exported,packagePath);assert.equal(written.bytes,Number(exported.headers.get('content-length')));assert(written.chunks>1);
  const fileInspected=await inspectProjectPackageFile(packagePath);assert.equal(fileInspected.preflight.complete,true);assert.equal(fileInspected.manifest.projectId,projectId);
  const inspected=await streamRequest('/api/projects/package/inspect',{method:'POST',headers:{'Content-Type':'application/zip'},body:createReadStream(packagePath)});assert.equal(inspected.status,200);const inspectedBody=await inspected.json();assert.equal(inspectedBody.preflight.complete,true);assert.equal(inspectedBody.manifest.projectId,projectId);
  const imported=await streamRequest('/api/projects/package/import?allowMissing=false&conflict=copy',{method:'POST',headers:{'Content-Type':'application/zip'},body:createReadStream(packagePath)});assert.equal(imported.status,201);const importedBody=await imported.json();assert.equal(importedBody.imported.conflictCopied,true);assert.notEqual(importedBody.imported.projectId,projectId);
  const importedAssetRoot=path.join(dataDir,'assets',importedBody.imported.projectId);const importedFiles=(await readdir(importedAssetRoot)).filter(name=>!name.startsWith('.'));assert.equal(importedFiles.length,1);const importedInfo=await stat(path.join(importedAssetRoot,importedFiles[0]));assert.equal(importedInfo.size,fixtureInfo.size);
  assert.deepEqual((await readdir(dataDir)).filter(name=>name.startsWith('.package-')&&name.endsWith('.part')),[]);
  console.log(JSON.stringify({ok:true,getStreamed:true,downloadChunks:written.chunks,downloadBytes:written.bytes,fileInspect:true,httpInspect:200,httpImport:201,assetBytesPreserved:true,partialFilesClean:true}));
}finally{child.kill();await new Promise(resolve=>setTimeout(resolve,100));await rm(dataDir,{recursive:true,force:true})}
