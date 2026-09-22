import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { applyDeliveryPatch, previewDeliveryPatch, undoDeliveryPatch, validateDeliveryManifest } from '../server/deliveryValidator.mjs';

const run=(args,cwd)=>new Promise((resolve,reject)=>{const child=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd,stdio:['ignore','pipe','pipe']});let error='';child.stderr.on('data',chunk=>{error+=chunk});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(error||`ffmpeg exit ${code}`)))});
const runNode=(args,cwd)=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd,stdio:['ignore','pipe','pipe']});let out='',error='';child.stdout.on('data',chunk=>{out+=chunk});child.stderr.on('data',chunk=>{error+=chunk});child.on('error',reject);child.on('close',code=>resolve({code,out,error}))});
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=await mkdtemp(path.join(os.tmpdir(),'xingmu-delivery-audit-'));
try{
  await run(['-f','lavfi','-i','color=c=red:s=320x180','-frames:v','1','image.png'],dir);
  await run(['-f','lavfi','-i','sine=frequency=880:sample_rate=48000','-t','1.2','-c:a','pcm_s16le','-ar','48000','-ac','2','audio.wav'],dir);
  await run(['-f','lavfi','-i','testsrc=size=320x180:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1.2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','video.mp4'],dir);
  const manifest={format:'xingmu-delivery-manifest',version:1,projectId:'arbitrary-project',title:'任意项目',root:'.',settings:{fpsTolerance:.02,durationToleranceSec:.1},artifacts:[
    {id:'image-1',kind:'image',path:'image.png',expected:{width:320,height:180,codec:'png'}},
    {id:'audio-1',kind:'audio',path:'audio.wav',expected:{sampleRate:48000,channels:2,codec:'pcm_s16le'}},
    {id:'video-1',kind:'video',path:'video.mp4',expected:{width:320,height:180,codec:'h264',fps:25,durationSec:1.2,hasAudio:true}}
  ]};
  const report=await validateDeliveryManifest(manifest,{root:dir});assert.equal(report.ok,true);assert.deepEqual(report.summary,{total:3,passed:3,failed:0,missing:0});assert.ok(report.artifacts.find(item=>item.id==='video-1').probe.streams.some(item=>item.codecType==='audio'));
  const preview=previewDeliveryPatch(manifest,report);assert.ok(preview.changes.length>0);assert.equal(preview.before.validation,undefined);assert.equal(preview.after.validation.status,'passed');
  const manifestPath=path.join(dir,'manifest.json');await writeFile(manifestPath,JSON.stringify(manifest,null,2));const cliArgs=['scripts/validate-delivery.mjs','--manifest',manifestPath,'--root',dir,'--strict','--preview'];const cliPreview=await runNode(cliArgs,projectRoot);assert.equal(cliPreview.code,0);assert.equal(JSON.parse(cliPreview.out).report.ok,true);
  const cliApply=await runNode([...cliArgs.filter(item=>item!=='--preview'),'--apply'],projectRoot);assert.equal(cliApply.code,0);const appliedData=JSON.parse(await readFile(manifestPath,'utf8'));assert.equal(appliedData.validation.status,'passed');assert.match(cliApply.out,/"applied": true/);
  const cliUndo=await runNode(['scripts/validate-delivery.mjs','--manifest',manifestPath,'--root',dir,'--undo'],projectRoot);assert.equal(cliUndo.code,0);const restored=JSON.parse(await readFile(manifestPath,'utf8'));assert.equal(restored.validation,undefined);
  const bad={...manifest,settings:{...manifest.settings},artifacts:manifest.artifacts.map(item=>({...item,expected:item.id==='video-1'?{...item.expected,fps:24,hasAudio:false}:item.expected}))};const badReport=await validateDeliveryManifest(bad,{root:dir});assert.equal(badReport.ok,false);assert.ok(badReport.failures.find(item=>item.id==='video-1').mismatches.some(item=>item.field==='fps'));assert.ok(badReport.failures.find(item=>item.id==='video-1').mismatches.some(item=>item.field==='audioTrack'));
  const unsafeReport=await validateDeliveryManifest({...manifest,artifacts:[{id:'bad',kind:'video',path:'../outside.mp4'}]},{root:dir});assert.equal(unsafeReport.ok,false);assert.match(unsafeReport.failures[0].mismatches[0].actual,/路径不安全|路径越界/);
  console.log(JSON.stringify({ok:true,arbitraryProject:true,formats:['png','wav','mp4'],fps:true,durationTolerance:true,audioTrack:true,imageSize:true,preview:true,apply:true,undo:true,invalidRejected:true}));
}finally{await rm(dir,{recursive:true,force:true})}
