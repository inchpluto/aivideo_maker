import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

const root=await import('node:fs/promises').then(({mkdtemp})=>mkdtemp(path.join(tmpdir(),'xingmu-sqlite-cache-')));
const dataDir=path.join(root,'data'); const databaseFile=path.join(dataDir,'xingmu.sqlite'); const projectId='sqlite-cache-audit'; const port=4500+Math.floor(Math.random()*300); let server=null; let output='';
process.env.DATA_DIR=dataDir; process.env.STORAGE_BACKEND='sqlite'; process.env.SQLITE_DATABASE=databaseFile;
const request=(pathname,payload={},method='POST')=>new Promise((resolve,reject)=>{const body=method==='GET'?'':JSON.stringify(payload);const req=http.request({hostname:'127.0.0.1',port,path:pathname,method,headers:{Host:`127.0.0.1:${port}`,...(method==='GET'?{}:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)})}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end(body);});
const stop=async()=>{if(!server)return;server.kill();await new Promise(resolve=>server.once('close',resolve));server=null;};
try {
  const fixture=path.join(root,'fixture.mp4'); const made=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=320x180:rate=24','-t','0.8','-c:v','libx264','-pix_fmt','yuv420p',fixture],{encoding:'utf8',windowsHide:true}); assert.equal(made.status,0,made.stderr);
  const { closeStoreBackend, saveBinaryAsset, saveProject }=await import('../server/store.mjs?sqlite-cache-seed'); const { proxyRenderFingerprint, renderProxyProject }=await import('../server/render.mjs?sqlite-cache-seed');
  const asset=await saveBinaryAsset({buffer:await readFile(fixture),contentType:'video/mp4',projectId,kind:'shot',assetKey:'cache-clip'});
  const project=await saveProject({id:projectId,title:'SQLite cache 生命周期审计',settings:{aspectRatio:'16:9',fps:24},shots:[{id:'shot-1',videoUrl:asset.url,probeStatus:asset.probeStatus,duration:0.8}],timeline:[{id:'clip-1',track:0,mediaType:'video',mediaUrl:asset.url,probeStatus:asset.probeStatus,duration:0.8,sourceOffset:0,playbackRate:1,positionX:0,positionY:0,scale:100,rotation:0}]});
  const first=await renderProxyProject(project); assert.equal(first.cached,false); assert.ok((await stat(first.path)).size>100);
  const changed=await saveProject({...project,timeline:[{...project.timeline[0],positionX:24}],expectedRevision:project.revision}); const second=await renderProxyProject(changed); assert.equal(second.cached,false); assert.notEqual(second.path,first.path); assert.equal(`proxy-${proxyRenderFingerprint(changed).slice(0,32)}`,path.basename(path.dirname(second.path)));
  const old=new Date(Date.now()-3*24*60*60*1000); await utimes(path.dirname(first.path),old,old);
  await mkdir(path.join(dataDir,'render','orphan-old'),{recursive:true}); await writeFile(path.join(dataDir,'render','orphan-old','deliverable.mp4'),'orphan'); await utimes(path.join(dataDir,'render','orphan-old'),old,old);
  await mkdir(path.join(dataDir,'assets','voice-library'),{recursive:true}); await writeFile(path.join(dataDir,'assets','voice-library','shared-voice.wav'),'shared');
  await closeStoreBackend();
  server=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),MOCK_MODE:'true',LOCAL_TTS_AUTOSTART:'false',AUTO_PROJECT_BACKUP:'false'},stdio:['ignore','pipe','pipe'],windowsHide:true}); server.stdout.on('data',chunk=>{output+=chunk});server.stderr.on('data',chunk=>{output+=chunk});
  let ready=false;for(let attempt=0;attempt<100&&!ready;attempt+=1){try{const res=await request('/api/health',{},'GET');ready=res.status===200;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,80));}assert.equal(ready,true,output);
  const dryResponse=await request('/api/maintenance/cleanup',{maxAgeMs:24*60*60*1000,apply:false});assert.equal(dryResponse.status,200,dryResponse.body.toString());const dry=JSON.parse(dryResponse.body);const plan=dry.cleanup;
  assert.equal(plan.referencedProjectIds.includes(projectId),true,JSON.stringify(plan)); assert.ok(plan.protected.some(item=>item.path===path.join(dataDir,'render',projectId)&&item.reason==='project-referenced'),JSON.stringify(plan)); assert.ok(plan.candidates.some(item=>item.kind==='stale-proxy-cache'&&item.path===path.dirname(first.path)),JSON.stringify(plan)); assert.ok(plan.candidates.some(item=>item.kind==='orphan-render-cache'&&item.path===path.join(dataDir,'render','orphan-old')),JSON.stringify(plan));
  const appliedResponse=await request('/api/maintenance/cleanup',{maxAgeMs:24*60*60*1000,apply:true});assert.equal(appliedResponse.status,200,appliedResponse.body.toString());const applied=JSON.parse(appliedResponse.body).cleanup; assert.equal(applied.applied,true); assert.ok(applied.removed.includes(path.dirname(first.path)));assert.ok(applied.removed.includes(path.join(dataDir,'render','orphan-old')));assert.ok(await stat(second.path));await assert.rejects(()=>stat(first.path));assert.equal(await readFile(path.join(dataDir,'assets','voice-library','shared-voice.wav'),'utf8'),'shared');
  console.log(JSON.stringify({ok:true,storageBackend:'sqlite',realProxy:true,currentProxyProtected:true,staleProxyRemoved:true,orphanRemoved:true,sharedVoiceProtected:true,dryRun:true,applied:true}));
} finally { await stop(); await rm(root,{recursive:true,force:true}); }
