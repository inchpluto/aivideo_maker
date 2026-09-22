import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createProjectPackage, importProjectPackage } from '../server/projectPackage.mjs';
import { executeEditingPlan, validateTimeline } from '../src/editingPlan.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceData = await mkdtemp(path.join(tmpdir(), 'xingmu-local-v1-source-'));
const targetData = await mkdtemp(path.join(tmpdir(), 'xingmu-local-v1-target-'));
const runFfmpeg = (args, cwd = root) => {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};
const makeMedia = async () => {
  const files = { red: path.join(sourceData, 'red.mp4'), green: path.join(sourceData, 'green.mp4'), blue: path.join(sourceData, 'blue.mp4'), voice: path.join(sourceData, 'voice.wav'), music: path.join(sourceData, 'music.wav') };
  runFfmpeg(['-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', files.red]);
  runFfmpeg(['-f', 'lavfi', '-i', 'color=c=green:s=320x180:r=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', files.green]);
  runFfmpeg(['-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', files.blue]);
  runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '4', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', files.voice]);
  runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=880:sample_rate=48000', '-t', '4', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', files.music]);
  return files;
};
const freePort = async () => {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
};
const request = async (base, pathname, options = {}) => {
  const response = await fetch(`${base}${pathname}`, options);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
};
const waitForHealth = async (base, output) => {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try { const health = await request(base, '/api/health'); if (health.response.ok) return health.body; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`隔离服务未启动：${output()}`);
};
const stopServer = async child => {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2500))]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2500))]);
  }
};
const startServer = async (dataDir, port) => {
  let output = '';
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'false', LOCAL_TTS_AUTOSTART: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', chunk => { output += String(chunk); });
  child.stderr.on('data', chunk => { output += String(chunk); });
  await waitForHealth(`http://127.0.0.1:${port}`, () => output.slice(-1200));
  return { child, base: `http://127.0.0.1:${port}`, output: () => output };
};
const ffprobe = file => {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

let service = null;
try {
  const files = await makeMedia();
  process.env.DATA_DIR = sourceData;
  const { saveBinaryAsset } = await import('../server/store.mjs');
  const red = await saveBinaryAsset({ buffer: await readFile(files.red), contentType: 'video/mp4', projectId: 'local-v1-audit', kind: 'shot-red' });
  const green = await saveBinaryAsset({ buffer: await readFile(files.green), contentType: 'video/mp4', projectId: 'local-v1-audit', kind: 'shot-green' });
  const blue = await saveBinaryAsset({ buffer: await readFile(files.blue), contentType: 'video/mp4', projectId: 'local-v1-audit', kind: 'shot-blue' });
  const voice = await saveBinaryAsset({ buffer: await readFile(files.voice), contentType: 'audio/wav', projectId: 'local-v1-audit', kind: 'voice' });
  const music = await saveBinaryAsset({ buffer: await readFile(files.music), contentType: 'audio/wav', projectId: 'local-v1-audit', kind: 'music' });
  for (const asset of [red, green, blue, voice, music]) assert.equal(asset.probeStatus, 'passed');

  const tracks = [{ id: 'video-1', type: 'video', label: 'V1 画面' }, { id: 'voice-1', type: 'voice', label: 'A1 人声' }, { id: 'music-1', type: 'music', label: 'A2 音乐' }, { id: 'caption-1', type: 'caption', label: 'T1 字幕' }];
  const initialTimeline = [
    { id: 'clip-red', track: 0, trackType: 'video', trackId: 'video-1', mediaType: 'video', mediaUrl: red.url, probeStatus: red.probeStatus, start: 0, duration: 1.4, sourceOffset: 0.2, label: '红色镜头' },
    { id: 'clip-green', track: 0, trackType: 'video', trackId: 'video-1', mediaType: 'video', mediaUrl: green.url, probeStatus: green.probeStatus, start: 1.4, duration: 1.2, sourceOffset: 0, label: '绿色镜头' },
    { id: 'clip-blue', track: 0, trackType: 'video', trackId: 'video-1', mediaType: 'video', mediaUrl: blue.url, probeStatus: blue.probeStatus, start: 2.8, duration: 1, sourceOffset: 0, label: '蓝色镜头' },
    { id: 'voice-1', track: 1, trackType: 'voice', trackId: 'voice-1', mediaType: 'audio', mediaUrl: voice.url, probeStatus: voice.probeStatus, start: 0, duration: 3.6, volume: 85, fadeIn: 0.1, fadeOut: 0.1 },
    { id: 'music-1', track: 2, trackType: 'music', trackId: 'music-1', mediaType: 'audio', mediaUrl: music.url, probeStatus: music.probeStatus, start: 0, duration: 3.6, volume: 60, muted: true }
  ];
  const edited = executeEditingPlan({ items: initialTimeline, tracks, operations: [
    { operation: 'trim', target: 'clip-red', params: { inSeconds: 0.1, outSeconds: 0.1 }, reason: '去除片头片尾' },
    { operation: 'split', target: 'clip-green', params: { at: 0.5 }, reason: '按动作拆分' },
    { operation: 'setSpeed', target: 'clip-blue', params: { speed: 1.25 }, reason: '节奏调整' },
    { operation: 'setVolume', target: 'voice-1', params: { volume: 85 }, reason: '对白清晰度' },
    { operation: 'normalizeAudio', target: 'master', params: { targetLufs: -14 }, reason: '交付响度' },
    { operation: 'addCaptions', target: 'master', params: { style: 'cinematic' }, reason: '对白字幕' }
  ], dialogues: [{ character: '甲', text: '红灯亮了。' }, { character: '乙', text: '继续往前。' }, { character: '甲', text: '我看见出口了。' }] });
  assert.equal(edited.applied.length, 6);
  assert.equal(edited.rejected.length, 0);
  assert.equal(edited.deferred.length, 0);
  assert.equal(validateTimeline(edited.items).length, 0);
  const sourceProject = { id: 'local-v1-audit', title: 'Local V1 综合夹具', revision: 1, settings: { aspectRatio: '16:9', fps: 24 }, shots: [
    { id: 'red', videoUrl: red.url, probeStatus: red.probeStatus, duration: 1.4 }, { id: 'green', videoUrl: green.url, probeStatus: green.probeStatus, duration: 1.2 }, { id: 'blue', videoUrl: blue.url, probeStatus: blue.probeStatus, duration: 1 }
  ], timeline: edited.items, assets: { localMedia: [red, green, blue, voice, music].map(asset => ({ id: asset.assetId, url: asset.url, kind: asset.contentType.startsWith('video') ? 'video' : 'audio', probeStatus: asset.probeStatus, sha256: asset.sha256, bytes: asset.bytes })) } };
  const { renderProject } = await import('../server/render.mjs');
  const sourceRender = await renderProject(sourceProject, { workDir: path.join(sourceData, 'source-render') });
  assert.equal(sourceRender.ok, true);
  assert.equal(sourceRender.mediaMode, 'verified-video-audio');
  assert.equal(sourceRender.technicalQc.width, 1280);
  assert.equal(sourceRender.technicalQc.height, 720);
  assert.ok(Math.abs(sourceRender.technicalQc.fps - 24) <= 0.05);
  assert.ok(sourceRender.technicalQc.streams.some(stream => stream.type === 'audio'));
  assert.match(await readFile(path.join(sourceData, 'source-render', 'captions.srt'), 'utf8'), /红灯亮了/);
  const sourceProbe = ffprobe(sourceRender.path);
  assert.ok(sourceProbe.streams.some(stream => stream.codec_type === 'video'));
  assert.ok(sourceProbe.streams.some(stream => stream.codec_type === 'audio'));

  const packaged = await createProjectPackage({ project: sourceProject, dataDir: sourceData });
  assert.equal(packaged.preflight.complete, true);
  const imported = await importProjectPackage({ input: packaged.buffer, dataDir: targetData, allowMissing: false, conflict: 'copy' });
  assert.equal(imported.preflight.complete, true);
  const importedId = imported.projectId;
  const importedVideo = imported.project.timeline.find(item => item.mediaType === 'video');
  assert.match(importedVideo.mediaUrl, new RegExp(`/api/assets/${importedId}/`));
  const importedVideoBytes = await readFile(path.join(targetData, 'assets', importedId, path.basename(decodeURIComponent(importedVideo.mediaUrl))));
  assert.deepEqual(importedVideoBytes, await readFile(files.red));

  const port = await freePort();
  service = await startServer(targetData, port);
  const currentResponse = await request(service.base, `/api/projects/${encodeURIComponent(importedId)}`);
  assert.equal(currentResponse.response.status, 200);
  const currentProject = currentResponse.body.project;
  const updatedResponse = await request(service.base, `/api/projects/${encodeURIComponent(importedId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...currentProject, settings: { ...currentProject.settings, aspectRatio: '9:16', fps: 30 } }) });
  assert.equal(updatedResponse.response.status, 200, JSON.stringify(updatedResponse.body));
  const updatedProject = updatedResponse.body.project;
  const targetRender = await request(service.base, '/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: importedId }) });
  assert.equal(targetRender.response.status, 200, JSON.stringify(targetRender.body));
  assert.equal(targetRender.body.technicalQc.width, 720);
  assert.equal(targetRender.body.technicalQc.height, 1280);
  assert.ok(Math.abs(targetRender.body.technicalQc.fps - 30) <= 0.05);
  assert.ok(targetRender.body.technicalQc.streams.some(stream => stream.type === 'audio'));
  const targetMedia = await request(service.base, new URL(targetRender.body.deliverable, service.base).pathname);
  assert.equal(targetMedia.response.status, 200);
  assert.ok(targetMedia.body.length > 1000);
  const targetOutput = path.join(targetData, 'target-deliverable.mp4');
  await writeFile(targetOutput, targetMedia.body);
  const targetProbe = ffprobe(targetOutput);
  assert.ok(targetProbe.streams.some(stream => stream.codec_type === 'video'));
  assert.ok(targetProbe.streams.some(stream => stream.codec_type === 'audio'));

  const importedRed = updatedProject.timeline.find(item => item.id === 'clip-red');
  assert.ok(importedRed?.mediaUrl?.includes(`/api/assets/${importedId}/`));
  const longVideo = Array.from({ length: 12 }, (_, index) => ({ ...importedRed, id: `recovery-${index}`, start: Number((index * 1.1).toFixed(2)), duration: 1.1 }));
  const recoveryProject = { ...updatedProject, timeline: [...updatedProject.timeline.filter(item => Number(item.track) !== 0), ...longVideo] };
  const queued = await request(service.base, '/api/render/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: importedId, expectedRevision: updatedProject.revision, idempotencyKey: 'local-v1-recovery', project: recoveryProject }) });
  assert.equal(queued.response.status, 202, JSON.stringify(queued.body));
  const recoveryId = queued.body.job.id;
  await new Promise(resolve => setTimeout(resolve, 30));
  await stopServer(service.child);
  service = null;
  const restarted = await startServer(targetData, await freePort());
  service = restarted;
  let recoveryJob;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const status = await request(service.base, `/api/render/jobs/${encodeURIComponent(recoveryId)}`);
    assert.equal(status.response.status, 200, JSON.stringify(status.body));
    recoveryJob = status.body.job;
    if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(recoveryJob.status)) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(recoveryJob.status, 'SUCCEEDED', recoveryJob.failure || '重启后后台渲染未完成');
  assert.equal(recoveryJob.result.technicalQc.width, 720);
  assert.equal(recoveryJob.result.technicalQc.height, 1280);
  const recoveryMedia = await request(service.base, new URL(recoveryJob.result.deliverable, service.base).pathname);
  assert.equal(recoveryMedia.response.status, 200);
  assert.ok(recoveryMedia.body.length > 1000);
  await writeFile(path.join(targetData, 'recovery-deliverable.mp4'), recoveryMedia.body);
  const recoveryProbe = ffprobe(path.join(targetData, 'recovery-deliverable.mp4'));
  assert.ok(recoveryProbe.streams.some(stream => stream.codec_type === 'video'));
  assert.ok(recoveryProbe.streams.some(stream => stream.codec_type === 'audio'));
  console.log(JSON.stringify({ ok: true, sourceEditing: { applied: edited.applied.length, sourceIn: true, split: true, speed: true, gap: true, mute: true, volume: true, captions: true }, sourceRender: { profile: '16:9/24', video: true, audio: true, srt: true }, package: { imported: true, bytesPreserved: true, noAbsolutePath: true }, targetRender: { profile: '9:16/30', video: true, audio: true }, restartRecovery: { status: recoveryJob.status, video: true, audio: true, bytes: recoveryMedia.body.length }, projectId: importedId }));
} finally {
  if (service) await stopServer(service.child);
  await rm(sourceData, { recursive: true, force: true });
  await rm(targetData, { recursive: true, force: true });
}
