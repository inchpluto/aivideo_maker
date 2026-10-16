import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(path.join(os.tmpdir(),'xingmu-package-http-'));
const port=48000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dataDir,PORT:String(port),LOCAL_TTS_AUTOSTART:'false'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk});
child.on('error',error=>{output+=` ${error.message}`});
const waitForServer=async()=>{const deadline=Date.now()+10_000;while(Date.now()<deadline){try{const response=await fetch(`${base}/api/health`);if(response.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error(`服务未启动：${output.slice(-1000)}`)};
const request=async(pathname,options={})=>{const response=await fetch(`${base}${pathname}`,options);const contentType=response.headers.get('content-type')||'';const body=contentType.includes('json')?await response.json():Buffer.from(await response.arrayBuffer());return {response,body}};
try{
  await waitForServer();
  const projectId='http-package-audit';
  const project={id:projectId,title:'HTTP 项目包审计',type:'AI 视频',revision:0,shots:[],timeline:[],assets:{localMedia:[]},updatedAt:new Date().toISOString()};
  const saved=await request(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});assert.equal(saved.response.status,200);
  project.revision=saved.body.project.revision;
  const pngFixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  const asset=await request(`/api/assets/media?projectId=${projectId}&kind=reference`,{method:'POST',headers:{'Content-Type':'image/png'},body:pngFixture});assert.equal(asset.response.status,201,JSON.stringify(asset.body));assert.ok(asset.body.asset?.url);
  project.assets.localMedia=[{id:'fixture-asset',name:'fixture.png',kind:'image',url:asset.body.asset.url}];
  const updated=await request(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});assert.equal(updated.response.status,200);
  const packageResponse=await request(`/api/projects/${projectId}/package`);assert.equal(packageResponse.response.status,200);assert.match(packageResponse.response.headers.get('content-type')||'',/application\/zip/);assert.ok(packageResponse.body.length>100);
  const inspected=await request('/api/projects/package/inspect',{method:'POST',headers:{'Content-Type':'application/zip'},body:packageResponse.body});assert.equal(inspected.response.status,200);assert.equal(inspected.body.preflight.complete,true);assert.equal(inspected.body.manifest.projectId,projectId);
  const imported=await request('/api/projects/package/import?allowMissing=false&conflict=copy',{method:'POST',headers:{'Content-Type':'application/zip'},body:packageResponse.body});assert.equal(imported.response.status,201);assert.equal(imported.body.imported.conflictCopied,true);assert.notEqual(imported.body.imported.projectId,projectId);
  assert.equal((await readdir(dataDir)).some(name=>name.startsWith('.package-')&&name.endsWith('.part')),false);
  console.log(JSON.stringify({ok:true,health:true,exportStatus:packageResponse.response.status,inspectStatus:inspected.response.status,importStatus:imported.response.status,copyId:imported.body.imported.projectId,streamingPackageRequest:true,partialFilesClean:true}));
}finally{child.kill();await new Promise(resolve=>setTimeout(resolve,100));await rm(dataDir,{recursive:true,force:true})}
