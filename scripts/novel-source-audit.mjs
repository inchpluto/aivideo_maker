import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-source-audit-')); const port = 4217;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'true' }, stdio: 'ignore' });
const request = (pathname, method = 'GET', payload) => new Promise(resolve => { const raw = payload === undefined ? '' : JSON.stringify(payload); const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) })); }); req.on('error', () => resolve({ status: 0, body: Buffer.alloc(0) })); req.end(raw); });
const original = '\uFEFF第一章\r\n林夏：雨停之前不要开门。\r\n\r\n第二章\r\n顾川：钥匙在灯塔。这里还有新的线索。';
try {
  let ready = false; for (let attempt = 0; attempt < 40 && !ready; attempt += 1) { ready = (await request('/api/health')).status === 200; if (!ready) await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(ready, true);
  const analyzed = await request('/api/novel/analyze', 'POST', { text: original, filename: '长篇审计.txt', projectName: '长篇审计', synopsis: '雨夜线索', episodeCount: 2, episodeLength: 60, aspectRatio: '9:16' });
  assert.equal(analyzed.status, 200, analyzed.body.toString()); const project = JSON.parse(analyzed.body).project; assert(project.id);
  assert.equal(project.source.encoding, 'utf-8'); assert.equal(project.source.originalSha256, createHash('sha256').update(original, 'utf8').digest('hex')); assert.equal(project.source.chapterIndex.length, 2); assert(project.source.chapterIndex.every(item => item.textHash && item.sourceEnd > item.sourceStart)); assert.equal(project.episodes.length, 2); assert.notEqual(project.episodes[0].id, project.episodes[1].id); assert(project.episodes.every(episode => episode.scenes.every(scene => scene.id.startsWith(episode.id.replaceAll('-', '')) || scene.id.startsWith('ep')))); assert(project.shots.every(shot => shot.episodeId));
  const stored = await readFile(path.join(dataDir, 'source-documents', `${project.id}.txt`), 'utf8'); assert.equal(stored, original);
  const downloaded = await request(project.source.path); assert.equal(downloaded.status, 200); assert.equal(downloaded.body.toString('utf8'), original);
  console.log(JSON.stringify({ ok: true, chapters: project.source.chapterIndex.length, hash: project.source.originalSha256, sourceBytes: project.source.bytes, downloaded: downloaded.status }));
} finally { child.kill(); await rm(dataDir, { recursive: true, force: true }); }
