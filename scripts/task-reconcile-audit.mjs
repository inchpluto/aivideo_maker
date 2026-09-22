import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root=await mkdtemp(path.join(tmpdir(),'xingmu-reconcile-')); process.env.DATA_DIR=root;
const { saveGenerationJob, readGenerationJob }=await import('../server/jobs.mjs'); const { createTaskWorker }=await import('../server/taskWorker.mjs');
try { await saveGenerationJob({id:'reconcile-audit',type:'generation',task:'video',projectId:'p',payloadSnapshot:{duration:3},route:'audit',providerTaskId:'provider-accepted-1',status:'WAITING_PROVIDER',progress:100}); const worker=createTaskWorker({execute:async()=>({status:'FAILED'}),reconcile:async item=>({status:'SUCCEEDED',taskId:item.providerTaskId,output:['/api/assets/shared/reconciled.mp4']})}); await worker.recover(job=>job.id==='reconcile-audit'); let job;for(let i=0;i<40;i++){job=await readGenerationJob('reconcile-audit');if(job.status==='SUCCEEDED')break;await new Promise(r=>setTimeout(r,25))}assert.equal(job.status,'SUCCEEDED');assert.equal(job.providerTaskId,'provider-accepted-1');assert((job.events||[]).some(event=>event.type==='reconciled'));console.log(JSON.stringify({ok:true,status:job.status,providerTaskId:job.providerTaskId,reconciled:true}));}finally{await rm(root,{recursive:true,force:true});}
