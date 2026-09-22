import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-legacy-restart-'));
const dataDir = path.join(root, 'data');
const freePort = () => new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(() => resolve(port)); }); });
const request = (port, pathname, options = {}) => new Promise(resolve => {
  const body = options.body || Buffer.alloc(0);
  const headers = { Host: `127.0.0.1:${port}`, ...(options.headers || {}) };
  if (!headers['Content-Length']) headers['Content-Length'] = body.length;
  const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) })); });
  req.on('error', error => resolve({ status: 0, body: Buffer.from(String(error.message)) }));
  if (body.length) req.write(body);
  req.end();
});
const start = async port => {
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), LOCAL_TTS_AUTOSTART: 'false' }, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
  let health = { status: 0 };
  for (let attempt = 0; attempt < 50 && health.status !== 200; attempt += 1) { health = await request(port, '/api/health'); if (health.status !== 200) await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(health.status, 200);
  return child;
};
const stop = child => new Promise(resolve => { if (!child || child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill(); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1500).unref(); });
const legacyProject = {
  id: 'legacy-imported-20260906',
  title: '旧星幕 JSON 迁移夹具',
  type: 'AI 短剧',
  synopsis: '旧项目迁移后仍可追溯角色、场景、镜头和素材引用。',
  characters: [{ id: 'legacy-char-1', name: '旧角色', imageAsset: '/api/assets/legacy-imported-20260906/character.png' }],
  episodes: [{ id: 'legacy-episode-1', scenes: [{ id: 'legacy-scene-1', heading: '旧场景', action: '旧角色打开门', purpose: '推进冲突' }], dialogues: [{ id: 'legacy-line-1', character: '旧角色', text: '有人吗？', sceneRef: 'legacy-scene-1' }] }],
  shots: [{ id: 'legacy-shot-1', sceneRef: 'legacy-scene-1', name: '旧镜头', duration: 2, imageUrl: '/api/assets/legacy-imported-20260906/frame.png' }],
  timeline: [{ id: 'legacy-clip-1', track: 0, start: 0, duration: 2, mediaType: 'video', mediaUrl: '/api/assets/legacy-imported-20260906/clip.mp4' }],
  assets: { localMedia: [{ id: 'legacy-media-1', name: '旧素材.mp4', kind: 'video', url: '/api/assets/legacy-imported-20260906/clip.mp4' }] },
  settings: { aspectRatio: '16:9', fps: 25 }
};
const legacyBody = Buffer.from(JSON.stringify(legacyProject));
try {
  const firstPort = await freePort();
  const first = await start(firstPort);
  const imported = await request(firstPort, '/api/projects/package/import?allowMissing=true&conflict=copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: legacyBody });
  assert.equal(imported.status, 201, imported.body.toString());
  const importedBody = JSON.parse(imported.body.toString());
  assert.equal(importedBody.imported.project.id, legacyProject.id);
  assert.equal(importedBody.imported.project.characters[0].id, 'legacy-char-1');
  assert.equal(importedBody.imported.project.episodes[0].scenes[0].id, 'legacy-scene-1');
  assert.equal(importedBody.imported.project.shots[0].id, 'legacy-shot-1');
  assert.equal(importedBody.imported.preflight.missingRefs.length, 4);
  const listedBefore = JSON.parse((await request(firstPort, '/api/projects')).body.toString()).projects;
  assert.ok(listedBefore.some(item => item.id === legacyProject.id));
  await stop(first);
  const secondPort = await freePort();
  const second = await start(secondPort);
  const listedAfter = JSON.parse((await request(secondPort, '/api/projects')).body.toString()).projects;
  const reloaded = JSON.parse((await request(secondPort, `/api/projects/${legacyProject.id}`)).body.toString()).project;
  assert.ok(listedAfter.some(item => item.id === legacyProject.id));
  assert.equal(reloaded.id, legacyProject.id);
  assert.equal(reloaded.characters[0].name, '旧角色');
  assert.equal(reloaded.episodes[0].scenes[0].heading, '旧场景');
  assert.equal(reloaded.shots[0].id, 'legacy-shot-1');
  assert.equal(reloaded.importedFrom.projectId, legacyProject.id);
  assert.equal(reloaded.importedFrom.missingRefs.length, 4);
  await stop(second);
  console.log(JSON.stringify({ ok: true, imported: imported.status, beforeRestart: true, afterRestart: true, character: reloaded.characters.length, scenes: reloaded.episodes[0].scenes.length, shots: reloaded.shots.length, missingRefs: reloaded.importedFrom.missingRefs.length }));
} finally {
  await rm(root, { recursive: true, force: true });
}
