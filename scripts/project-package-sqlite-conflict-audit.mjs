import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(os.tmpdir(),'xingmu-package-sqlite-conflict-'));
const database=path.join(dataDir,'audit.sqlite');
const port=49500+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dataDir,STORAGE_BACKEND:'sqlite',SQLITE_DATABASE:database,PORT:String(port),INDEX_TTS_AUTOSTART:'false',LOCAL_TTS_AUTOSTART:'false'},stdio:['ignore','pipe','pipe'],windowsHide:true});
const execFileAsync=promisify(execFile);
let output=''; child.stdout.on('data',chunk=>{output+=chunk}); child.stderr.on('data',chunk=>{output+=chunk}); child.on('error',error=>{output+=` ${error.message}`});
const waitForServer=async()=>{const deadline=Date.now()+10_000;while(Date.now()<deadline){try{const response=await fetch(`${base}/api/health`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`服务未启动：${output.slice(-1200)}`)};
const request=async(pathname,options={})=>{const response=await fetch(`${base}${pathname}`,options);const type=response.headers.get('content-type')||'';const body=type.includes('json')?await response.json():Buffer.from(await response.arrayBuffer());return {response,body}};
const stop=()=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill('SIGTERM');setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL')},2000)});

try{
  await waitForServer();
  const projectId='sqlite-package-audit';
  const project={id:projectId,title:'SQLite 项目包冲突审计',type:'AI 视频',revision:0,shots:[],timeline:[],assets:{localMedia:[]},updatedAt:new Date().toISOString()};
  const saved=await request(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)}); assert.equal(saved.response.status,200); project.revision=saved.body.project.revision;
  const fixture=path.join(dataDir,'fixture.mp4'); await execFileAsync(process.env.FFMPEG_PATH||'ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=320x180:rate=24','-t','4','-an','-c:v','libx264','-pix_fmt','yuv420p',fixture],{windowsHide:true}); const fixtureBytes=(await stat(fixture)).size;
  const media=await request(`/api/assets/media?projectId=${projectId}&kind=reference`,{method:'POST',headers:{'Content-Type':'video/mp4'},body:await (await import('node:fs/promises')).readFile(fixture)}); assert.equal(media.response.status,201); project.assets.localMedia=[{id:'fixture-video',name:'fixture.mp4',kind:'video',url:media.body.asset.url}];
  const updated=await request(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)}); assert.equal(updated.response.status,200); project.revision=updated.body.project.revision;
  const oldMedia=await request(media.body.asset.url); assert.equal(oldMedia.response.status,200); assert.equal(Number(oldMedia.response.headers.get('content-length')),fixtureBytes);
  const packaged=await request(`/api/projects/${projectId}/package`); assert.equal(packaged.response.status,200); assert.match(packaged.response.headers.get('content-type')||'',/application\/zip/); assert.ok(packaged.body.length>100);
  const imported=await request('/api/projects/package/import?allowMissing=false&conflict=copy',{method:'POST',headers:{'Content-Type':'application/zip'},body:packaged.body}); assert.equal(imported.response.status,201,JSON.stringify(imported.body)); const importedId=imported.body.imported.projectId; assert.notEqual(importedId,projectId); assert.equal(imported.body.imported.conflictCopied,true);
  const importedProject=await request(`/api/projects/${encodeURIComponent(importedId)}`); assert.equal(importedProject.response.status,200); const importedMedia=importedProject.body.project.assets.localMedia[0]; assert.match(importedMedia.url,new RegExp(`/api/assets/${importedId}/`)); const copiedMedia=await request(importedMedia.url); assert.equal(copiedMedia.response.status,200); assert.equal(Number(copiedMedia.response.headers.get('content-length')),fixtureBytes);
  const projects=(await request('/api/projects')).body.projects; assert.deepEqual(new Set(projects.map(item=>item.id)),new Set([projectId,importedId]));
  console.log(JSON.stringify({ok:true,storageBackend:'sqlite',exportStatus:packaged.response.status,importStatus:imported.response.status,originalProjectMediaIntact:oldMedia.response.status===200,copiedProjectId:importedId,copiedMediaStatus:copiedMedia.response.status,copiedMediaBytes:fixtureBytes,projectCount:projects.length}));
}finally{await stop(); await rm(dataDir,{recursive:true,force:true})}
