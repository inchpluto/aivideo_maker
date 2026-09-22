import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-sqlite-recovery-'));
const port = 4217;
process.env.DATA_DIR = root;
process.env.STORAGE_BACKEND = 'sqlite';
process.env.SQLITE_DATABASE = path.join(root, 'recovery.sqlite');
const { closeStoreBackend, readProject, saveBinaryAsset, saveProject } = await import('../server/store.mjs');
const { closeJobsBackend, readGenerationJob, saveGenerationJob } = await import('../server/jobs.mjs');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = async (pathname, options = {}) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
    const body = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, body };
  } catch {
    return { status: 0, headers: new globalThis.Headers(), body: Buffer.alloc(0) };
  }
};
const waitForHealth = async child => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`服务提前退出：${child.exitCode}`);
    if ((await request('/api/health')).status === 200) return;
    await wait(50);
  }
  throw new Error('等待 SQLite 审计服务启动超时。');
};
const waitForExit = child => new Promise(resolve => {
  if (child.exitCode !== null || child.signalCode !== null) return resolve();
  child.once('exit', resolve);
});
const stop = async (child, force = false) => {
  if (child.exitCode !== null) return;
  if (force && process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio:'ignore' });
  else child.kill(force ? 'SIGKILL' : 'SIGTERM');
  await Promise.race([waitForExit(child), wait(4_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio:'ignore' });
    else child.kill('SIGKILL');
  }
  await waitForExit(child);
};
const startServer = () => spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, DATA_DIR:root, STORAGE_BACKEND:'sqlite', SQLITE_DATABASE:path.join(root, 'recovery.sqlite'), PORT:String(port), MOCK_MODE:'true' },
  stdio: 'ignore',
});

let firstServer;
let secondServer;
try {
  const fixture = path.join(root, 'fixture.mp4');
  const generated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=purple:s=320x180:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding:'utf8' });
  assert.equal(generated.status, 0, generated.stderr);
  const asset = await saveBinaryAsset({ buffer:await readFile(fixture), contentType:'video/mp4', projectId:'sqlite-recovery', kind:'shot' });
  const timeline = Array.from({ length:80 }, (_, index) => ({ id:`clip-${index}`, track:0, mediaType:'video', mediaUrl:asset.url, probeStatus:asset.probeStatus, duration:1, start:index }));
  const project = await saveProject({ id:'sqlite-recovery', title:'SQLite 重启恢复审计', shots:[{ id:'shot-1', name:'真实视频', duration:1, videoUrl:asset.url, probeStatus:asset.probeStatus, mediaMetadata:asset.mediaMetadata }], timeline });
  const jobId = 'render-sqlite-recovery-audit';
  await saveGenerationJob({ id:jobId, taskId:jobId, type:'render', projectId:project.id, projectSnapshot:project, status:'RUNNING', progress:10, deliveryReady:false, inputRevision:project.revision });
  await Promise.all([closeStoreBackend(), closeJobsBackend()]);

  firstServer = startServer();
  await waitForHealth(firstServer);
  await wait(20);
  await stop(firstServer, true);
  firstServer = null;
  const interrupted = await readGenerationJob(jobId);
  assert.ok(['PENDING', 'RUNNING'].includes(interrupted.status), `首个进程中断前任务不应已完成：${interrupted.status}`);
  await closeJobsBackend();

  secondServer = startServer();
  await waitForHealth(secondServer);
  let recovered;
  for (let attempt = 0; attempt < 900; attempt += 1) {
    recovered = JSON.parse((await request(`/api/render/jobs/${encodeURIComponent(jobId)}`)).body).job;
    if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(recovered.status)) break;
    await wait(200);
  }
  assert.equal(recovered.status, 'SUCCEEDED', recovered.failure || 'SQLite 重启恢复渲染失败');
  assert.equal(recovered.result.mediaMode, 'verified-video-only');
  assert.match(recovered.result.deliverable, new RegExp(`/api/render/${project.id}/${jobId}/deliverable\\.mp4$`));
  const outputResponse = await request(new URL(recovered.result.deliverable, `http://127.0.0.1:${port}`).pathname);
  assert.equal(outputResponse.status, 200);
  assert.match(outputResponse.headers.get('content-type') || '', /video\/mp4/);
  assert(outputResponse.body.length > 100, '恢复产物为空');
  const output = path.join(root, 'recovered.mp4');
  await writeFile(output, outputResponse.body);
  const probe = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration:stream=codec_type','-of','default=nw=1',output], { encoding:'utf8' });
  assert.equal(probe.status, 0, probe.stderr);
  assert.match(probe.stdout, /codec_type=video/);
  assert(Number(probe.stdout.match(/duration=([0-9.]+)/)?.[1]) > 70, '恢复成片时长异常');
  const unchanged = await readProject(project.id);
  assert.equal(unchanged.revision, project.revision);
  assert.equal(unchanged.title, project.title);
  assert.equal(unchanged.timeline.length, project.timeline.length);
  console.log(JSON.stringify({ ok:true, firstProcessStatus:interrupted.status, recoveredStatus:recovered.status, outputBytes:outputResponse.body.length, duration:probe.stdout.match(/duration=([0-9.]+)/)?.[1], projectRevision:unchanged.revision, projectTimeline:unchanged.timeline.length }));
} finally {
  if (firstServer) await stop(firstServer, true).catch(() => undefined);
  if (secondServer) await stop(secondServer).catch(() => undefined);
  await Promise.allSettled([closeStoreBackend(), closeJobsBackend()]);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { await rm(root, { recursive:true, force:true }); break; }
    catch (error) { if (error.code !== 'EBUSY' || attempt === 7) throw error; await wait(250); }
  }
}
