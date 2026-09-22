import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-render-'));
process.env.DATA_DIR = root;
const { saveBinaryAsset, saveProject } = await import('../server/store.mjs');
const { renderProject } = await import('../server/render.mjs');
const fixture = path.join(root, 'fixture.mp4');
const audioFixture = path.join(root, 'fixture.mp3');
const generated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding:'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const audioGenerated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'libmp3lame', audioFixture], { encoding:'utf8' });
assert.equal(audioGenerated.status, 0, audioGenerated.stderr);
const meanVolume = (file, start, duration) => {
  const measured = spawnSync('ffmpeg', ['-v', 'info', '-ss', String(start), '-t', String(duration), '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding:'utf8' });
  assert.equal(measured.status, 0, measured.stderr);
  const value = Number(measured.stderr.match(/mean_volume:\s*(-?[0-9.]+) dB/i)?.[1]);
  assert(Number.isFinite(value), `无法读取 ${start}s 音频响度`);
  return value;
};
try {
  const asset = await saveBinaryAsset({ buffer: await readFile(fixture), contentType:'video/mp4', projectId:'render-audit', kind:'shot' });
  const audio = await saveBinaryAsset({ buffer: await readFile(audioFixture), contentType:'audio/mpeg', projectId:'render-audit', kind:'voice' });
  const media = { videoUrl:asset.url, probeStatus:asset.probeStatus, mediaMetadata:asset.mediaMetadata };
  const project = { id:'render-audit', shots:[{ id:'s1', name:'真实镜头', duration:1, ...media }], timeline:[{ id:'clip-s1', track:0, mediaType:'video', mediaUrl:asset.url, probeStatus:asset.probeStatus, duration:1 }, { id:'voice-s1', track:1, mediaType:'audio', mediaUrl:audio.url, probeStatus:audio.probeStatus, duration:1, start:0, volume:70, fadeIn:0.25, fadeOut:0.25 }, { id:'caption-s1', track:3, mediaType:'caption', start:0.1, duration:0.5, label:'真实字幕', status:'synced' }] };
  const result = await renderProject(project, { workDir:path.join(root, 'output') });
  assert.equal(result.ok, true); assert.equal(result.mediaMode, 'verified-video-audio');
  assert.equal(result.technicalQc.streams.filter(stream => ['video', 'audio'].includes(stream.type)).length, 2);
  assert(Array.isArray(result.technicalQc.warnings));
  await assert.rejects(() => renderProject({ ...project, timeline:[...project.timeline, { id:'caption-bad', track:3, mediaType:'caption', start:0.8, duration:1, label:'越界字幕' }] }, { workDir:path.join(root, 'bad-output') }), /字幕时间无效或越界/);
  const probe = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration:stream=codec_type','-of','default=nw=1',result.path], { encoding:'utf8' });
  assert.equal(probe.status, 0, probe.stderr); const renderedDuration=Number(probe.stdout.match(/duration=([0-9.]+)/)?.[1]); assert(renderedDuration > 0);
  assert.match(probe.stdout, /codec_type=audio/);
  const fadeInVolume = meanVolume(result.path, 0.02, 0.12); const middleVolume = meanVolume(result.path, 0.44, 0.12); const fadeOutVolume = meanVolume(result.path, 0.86, 0.12);
  assert(fadeInVolume < middleVolume - 1, `淡入未降低起始响度：${fadeInVolume} vs ${middleVolume}`);
  assert(fadeOutVolume < middleVolume - 1, `淡出未降低末尾响度：${fadeOutVolume} vs ${middleVolume}`);
  await mkdir(path.join(root,'jobs'), { recursive:true });
  await writeFile(path.join(root,'jobs','render-recovery.json'), JSON.stringify({ id:'render-recovery', taskId:'render-recovery', type:'render', projectId:project.id, projectSnapshot:project, status:'RUNNING', progress:10 }), 'utf8');
  const port = 4198;
  const server = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env:{ ...process.env, DATA_DIR:root, PORT:String(port), MOCK_MODE:'true' }, stdio:'ignore' });
  const request = (pathName, method, payload) => new Promise(resolve => { const body=payload ? JSON.stringify(payload) : ''; const req=http.request({hostname:'127.0.0.1',port,path:pathName,method,headers:{Host:`127.0.0.1:${port}`,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}))});req.on('error',()=>resolve({status:0,headers:{},body:Buffer.alloc(0)}));req.end(body)});
  try {
    let online=false; for(let i=0;i<30&&!online;i+=1){online=(await request('/api/health','GET')).status===200;if(!online)await new Promise(resolve=>setTimeout(resolve,100))}
    assert.equal(online,true);
    let recoveryJob; for(let i=0;i<600;i+=1){await new Promise(resolve=>setTimeout(resolve,100));recoveryJob=JSON.parse((await request('/api/render/jobs/render-recovery','GET')).body).job;if(['SUCCEEDED','FAILED','CANCELLED'].includes(recoveryJob.status))break}
    assert.equal(recoveryJob.status,'SUCCEEDED',recoveryJob.failure||'重启恢复渲染失败');
    const posted=await request('/api/render','POST',{ project }); assert.equal(posted.status,200,posted.body.toString());
    const postedResult=JSON.parse(posted.body); assert.equal(postedResult.ok,true);
    const downloaded=await request(new URL(postedResult.deliverable,'http://127.0.0.1').pathname,'GET'); assert.equal(downloaded.status,200); assert(downloaded.body.length>100);
    const persisted = await saveProject(project);
    const revisionProject = { ...project, revision:persisted.revision };
    const stale = await request('/api/render/jobs','POST',{ projectId:project.id, expectedRevision:persisted.revision + 1, idempotencyKey:'render-stale-audit', project:revisionProject });
    assert.equal(stale.status,409,stale.body.toString()); assert.equal(JSON.parse(stale.body).code,'REVISION_CONFLICT'); assert.equal(JSON.parse(stale.body).currentRevision,persisted.revision);
    const idempotentProject = { ...revisionProject, timeline:Array.from({ length:12 }, (_, index) => ({ ...project.timeline[0], id:`idem-${index}`, duration:1, start:index })) };
    const idempotencyKey = 'render-idempotency-audit';
    const idemFirst = await request('/api/render/jobs','POST',{ projectId:project.id, expectedRevision:persisted.revision, idempotencyKey, project:idempotentProject });
    assert.equal(idemFirst.status,202,idemFirst.body.toString()); const idemJob=JSON.parse(idemFirst.body).job; assert.equal(idemJob.inputRevision,persisted.revision); assert.equal(idemJob.deliveryReady,false);
    const idemDuplicate = await request('/api/render/jobs','POST',{ projectId:project.id, expectedRevision:persisted.revision, idempotencyKey, project:idempotentProject });
    assert.equal(idemDuplicate.status,200,idemDuplicate.body.toString()); const duplicateJob=JSON.parse(idemDuplicate.body); assert.equal(duplicateJob.reused,true); assert.equal(duplicateJob.job.id,idemJob.id); assert.equal('idempotencyKey' in duplicateJob.job,false);
    const idemConflict = await request('/api/render/jobs','POST',{ projectId:project.id, expectedRevision:persisted.revision, idempotencyKey, project:{ ...idempotentProject, title:'不同输入不应复用' } });
    assert.equal(idemConflict.status,409,idemConflict.body.toString()); assert.equal(JSON.parse(idemConflict.body).code,'RENDER_IDEMPOTENCY_CONFLICT');
    const idemCancelled = await request(`/api/render/jobs/${encodeURIComponent(idemJob.id)}/cancel`,'POST',{}); assert.equal(idemCancelled.status,200,idemCancelled.body.toString());
    let idemFinal=JSON.parse(idemCancelled.body).job; for(let i=0;i<30&&!['CANCELLED','SUCCEEDED','FAILED'].includes(idemFinal.status);i+=1){await new Promise(resolve=>setTimeout(resolve,100));idemFinal=JSON.parse((await request(`/api/render/jobs/${encodeURIComponent(idemJob.id)}`,'GET')).body).job}
    assert.equal(idemFinal.status,'CANCELLED',`幂等审计任务取消未生效：${idemFinal.status}`);
    const queued=await request('/api/render/jobs','POST',{ project }); assert.equal(queued.status,202);
    let queuedJob=JSON.parse(queued.body).job; for(let i=0;i<300&&!['SUCCEEDED','FAILED','CANCELLED'].includes(queuedJob.status);i+=1){await new Promise(resolve=>setTimeout(resolve,200));const status=await request(`/api/render/jobs/${encodeURIComponent(queuedJob.id)}`,'GET');queuedJob=JSON.parse(status.body).job}
    assert.equal(queuedJob.status,'SUCCEEDED',queuedJob.failure||'后台渲染失败'); assert.equal(queuedJob.result.mediaMode,'verified-video-audio'); assert.equal(queuedJob.deliveryReady,false);
    const reviewed = await request(`/api/render/jobs/${encodeURIComponent(queuedJob.id)}/review`,'POST',{decision:'pass',note:'审计确认真实成片可交付'}); assert.equal(reviewed.status,200,reviewed.body.toString()); const reviewedJob=JSON.parse(reviewed.body).job; assert.equal(reviewedJob.deliveryReady,true); assert.equal(reviewedJob.deliveryReview.decision,'pass');
    assert.match(queuedJob.result.deliverable, new RegExp(`/api/render/${project.id}/${queuedJob.id}/deliverable\\.mp4$`));
    const secondQueued = await request('/api/render/jobs','POST',{ project }); assert.equal(secondQueued.status,202);
    let secondQueuedJob=JSON.parse(secondQueued.body).job; for(let i=0;i<300&&!['SUCCEEDED','FAILED','CANCELLED'].includes(secondQueuedJob.status);i+=1){await new Promise(resolve=>setTimeout(resolve,200));const status=await request(`/api/render/jobs/${encodeURIComponent(secondQueuedJob.id)}`,'GET');secondQueuedJob=JSON.parse(status.body).job}
    assert.equal(secondQueuedJob.status,'SUCCEEDED',secondQueuedJob.failure||'第二次后台渲染失败'); assert.notEqual(secondQueuedJob.result.deliverable,queuedJob.result.deliverable);
    const publicJobs = JSON.parse((await request(`/api/jobs?projectId=${encodeURIComponent(project.id)}`,'GET')).body);
    assert.ok(publicJobs.jobs?.length >= 3); assert.ok(publicJobs.jobs.every(job => !Object.hasOwn(job,'projectSnapshot')));
    const cancellableProject = { ...project, timeline:Array.from({ length:12 }, (_, index) => ({ ...project.timeline[0], id:`cancel-${index}`, duration:1, start:index })) };
    const cancellable = await request('/api/render/jobs','POST',{ project:cancellableProject }); assert.equal(cancellable.status,202);
    const cancelId = JSON.parse(cancellable.body).job.id;
    const cancelled = await request(`/api/render/jobs/${encodeURIComponent(cancelId)}/cancel`,'POST',{}); assert.equal(cancelled.status,200);
    let cancelledJob=JSON.parse(cancelled.body).job; for(let i=0;i<20&&!['CANCELLED','SUCCEEDED','FAILED'].includes(cancelledJob.status);i+=1){await new Promise(resolve=>setTimeout(resolve,100));cancelledJob=JSON.parse((await request(`/api/render/jobs/${encodeURIComponent(cancelId)}`,'GET')).body).job}
    assert.equal(cancelledJob.status,'CANCELLED',`取消未生效：${cancelledJob.status}`);
    const retried = await request(`/api/render/jobs/${encodeURIComponent(cancelId)}/retry`,'POST',{}); assert.equal(retried.status,202);
    let retriedJob=JSON.parse(retried.body).job; for(let i=0;i<300&&!['SUCCEEDED','FAILED','CANCELLED'].includes(retriedJob.status);i+=1){await new Promise(resolve=>setTimeout(resolve,200));retriedJob=JSON.parse((await request(`/api/render/jobs/${encodeURIComponent(cancelId)}`,'GET')).body).job}
    assert.equal(retriedJob.status,'SUCCEEDED',retriedJob.failure||'重试渲染失败');
  } finally {
    if (server.exitCode === null) await new Promise(resolve => {
      const timeout = setTimeout(resolve, 1500);
      server.once('exit', () => { clearTimeout(timeout); resolve(); });
      server.kill();
    });
  }
  await assert.rejects(() => renderProject({ id:'blocked', shots:[{ id:'s1', videoUrl:'/api/assets/blocked/demo.mp4', probeStatus:'not-probed' }], timeline:[{ id:'clip-s1', track:0, mediaUrl:'/api/assets/blocked/demo.mp4', duration:1 }] }), /已验证的真实视频/);
  console.log(JSON.stringify({ ok:true, deliverable:result.path, httpRender:200, httpDownload:200, backgroundRender:'SUCCEEDED', duration:renderedDuration.toFixed(2), audio:'verified', audioEffects:{volume:'70%',fadeIn:'verified',fadeOut:'verified',edgeIn:fadeInVolume,middle:middleVolume,edgeOut:fadeOutVolume}, unverified:'rejected' }));
} finally {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { await rm(root, { recursive:true, force:true }); break; }
    catch (error) { if (error.code !== 'EBUSY' || attempt === 7) throw error; await new Promise(resolve => setTimeout(resolve, 250)); }
  }
}
