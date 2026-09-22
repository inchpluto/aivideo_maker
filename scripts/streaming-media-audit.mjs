import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

const root = await mkdtemp(path.join(os.tmpdir(), 'xingmu-streaming-media-'));
const dataDir = path.join(root, 'data'); const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc=size=320x180:rate=25','-t','1.2','-c:v','libx264','-pix_fmt','yuv420p',fixture], { encoding:'utf8' });
assert.equal(generated.status, 0, generated.stderr); const media = await readFile(fixture);
const freePort = () => new Promise((resolve, reject) => { const probe=net.createServer(); probe.once('error',reject); probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>resolve(port));}); });
const port = await freePort(); const child = spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,DATA_DIR:dataDir,PORT:String(port),LOCAL_TTS_AUTOSTART:'false',MEDIA_UPLOAD_LIMIT_BYTES:String(media.length+128)},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs=''; child.stdout.on('data',chunk=>{logs+=chunk.toString();}); child.stderr.on('data',chunk=>{logs+=chunk.toString();});
const request = (pathname, { method='GET', headers={}, chunks=[] } = {}) => new Promise(resolve => {
  const req=http.request({hostname:'127.0.0.1',port,path:pathname,method,headers:{Host:`127.0.0.1:${port}`,...headers}},res=>{const body=[];res.on('data',chunk=>body.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(body)}));});
  req.on('error',error=>resolve({status:0,headers:{},body:Buffer.from(String(error.message))}));
  let index=0; const writeNext=()=>{while(index<chunks.length){if(!req.write(chunks[index++])){req.once('drain',writeNext);return;}}req.end();}; writeNext();
});
const json = response => JSON.parse(response.body.toString('utf8') || '{}');
try {
  let health={status:0}; for(let attempt=0;attempt<50&&health.status!==200;attempt+=1){health=await request('/api/health');if(health.status!==200)await new Promise(resolve=>setTimeout(resolve,100));} assert.equal(health.status,200,logs);
  const chunks=[]; for(let offset=0;offset<media.length;offset+=32768)chunks.push(media.subarray(offset,Math.min(media.length,offset+32768)));
  const uploaded=await request('/api/assets/media?projectId=streaming-audit&kind=chunked',{method:'POST',headers:{'Content-Type':'video/mp4'},chunks}); assert.equal(uploaded.status,201,uploaded.body.toString()); const asset=json(uploaded).asset; assert.equal(asset.probeStatus,'passed');
  const first=await request(asset.url,{headers:{Range:'bytes=0-127'}}); const second=await request(asset.url,{headers:{Range:'bytes=128-255'}}); assert.equal(first.status,206);assert.equal(second.status,206);assert.deepEqual(first.body,media.subarray(0,128));assert.deepEqual(second.body,media.subarray(128,256));
  const head=await request(asset.url,{method:'HEAD'}); assert.equal(head.status,200);assert.equal(Number(head.headers['content-length']),media.length);assert.equal(head.headers['accept-ranges'],'bytes');
  const uploadId='resumable-audit'; const firstChunk=media.subarray(0,1000); const resumablePath=`/api/assets/media?projectId=streaming-audit&kind=resumable&uploadId=${uploadId}`;
  const firstResumable=await request(resumablePath,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(firstChunk.length),'Content-Range':`bytes 0-${firstChunk.length-1}/${media.length}`,'X-Upload-Id':uploadId},chunks:[firstChunk]}); assert.equal(firstResumable.status,200,firstResumable.body.toString()); assert.equal(json(firstResumable).nextOffset,firstChunk.length);
  const duplicate=await request(resumablePath,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(firstChunk.length),'Content-Range':`bytes 0-${firstChunk.length-1}/${media.length}`,'X-Upload-Id':uploadId},chunks:[firstChunk]}); assert.equal(duplicate.status,409,duplicate.body.toString()); assert.equal(json(duplicate).nextOffset,firstChunk.length);
  const resumeState=await request(`/api/assets/media?projectId=streaming-audit&uploadId=${uploadId}`); assert.equal(resumeState.status,200); assert.equal(json(resumeState).nextOffset,firstChunk.length);
  let offset=firstChunk.length; let resumedAsset=null;
  while(offset<media.length){const chunk=media.subarray(offset,Math.min(media.length,offset+1000)); const response=await request(resumablePath,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(chunk.length),'Content-Range':`bytes ${offset}-${offset+chunk.length-1}/${media.length}`,'X-Upload-Id':uploadId},chunks:[chunk]}); assert.ok([200,201].includes(response.status),response.body.toString()); const detail=json(response); offset=detail.nextOffset; if(detail.complete)resumedAsset=detail.asset;}
  assert.equal(offset,media.length); assert.equal(resumedAsset?.probeStatus,'passed'); assert.equal((await readdir(dataDir)).some(name=>name.endsWith('.part')),false);
  const cancelledId='cancel-audit'; const cancelledPath=`/api/assets/media?projectId=streaming-audit&kind=cancelled&uploadId=${cancelledId}`; const cancelledChunk=media.subarray(0,128); const cancelledUpload=await request(cancelledPath,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(cancelledChunk.length),'Content-Range':`bytes 0-${cancelledChunk.length-1}/${media.length}`,'X-Upload-Id':cancelledId},chunks:[cancelledChunk]}); assert.equal(cancelledUpload.status,200); const cancelled=await request(`/api/assets/media?projectId=streaming-audit&uploadId=${cancelledId}`,{method:'DELETE'}); assert.equal(cancelled.status,200); const cancelledState=await request(`/api/assets/media?projectId=streaming-audit&uploadId=${cancelledId}`); assert.equal(cancelledState.status,404); assert.equal((await readdir(dataDir)).some(name=>name.endsWith('.part')),false);
  console.log(JSON.stringify({ok:true,uploadedBytes:media.length,chunkSize:32768,probeStatus:asset.probeStatus,resumeRanges:[first.status,second.status],headContentLength:Number(head.headers['content-length']),streamingUpload:true,resumableUpload:true,resumableFinalStatus:201,duplicateOffset:409,resumableProbeStatus:resumedAsset.probeStatus,cancelledUploadClean:true,partialFilesClean:true}));
} finally { child.kill(); await rm(root,{recursive:true,force:true}); }
