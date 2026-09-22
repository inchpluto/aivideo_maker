import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

const root = await mkdtemp(path.join(os.tmpdir(), 'xingmu-caption-http-'));
const dataDir = path.join(root, 'data');
const port = await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(() => resolve(value)); }); });
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), LOCAL_TTS_AUTOSTART: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let logs = ''; child.stdout.on('data', chunk => { logs += chunk.toString(); }); child.stderr.on('data', chunk => { logs += chunk.toString(); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let attempt = 0; attempt < 50 && !ready; attempt += 1) { ready = (await fetch(`${base}/api/health`).catch(() => null))?.status === 200; if (!ready) await wait(100); }
  assert.equal(ready, true, logs);
  const project = { id: 'caption-http-audit', revision: 0, title: '字幕 HTTP 审计', settings: { aspectRatio: '16:9', fps: 24 }, timeline: [{ id: 'caption-1', trackType: 'caption', track: 3, start: 0.75, duration: 1.5, label: '第一行\n第二行' }, { id: 'caption-2', trackType: 'caption', track: 3, start: 2.5, duration: 0.75, label: '下一句' }] };
  const saved = await fetch(`${base}/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
  assert.equal(saved.status, 200, await saved.text());
  const head = await fetch(`${base}/api/projects/${project.id}/captions.srt`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type') || '', /application\/x-subrip/i);
  assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength('1\n00:00:00,750 --> 00:00:02,250\n第一行\n第二行\n\n2\n00:00:02,500 --> 00:00:03,250\n下一句\n', 'utf8'));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const response = await fetch(`${base}/api/projects/${project.id}/captions.srt`);
  const text = await response.text();
  assert.equal(response.status, 200, text);
  assert.match(response.headers.get('content-type') || '', /application\/x-subrip/i);
  assert.match(response.headers.get('content-disposition') || '', /attachment/);
  assert.match(response.headers.get('content-disposition') || '', /filename\*=UTF-8''/);
  assert.equal(Number(response.headers.get('content-length')), Buffer.byteLength(text, 'utf8'));
  assert.equal(text, '1\n00:00:00,750 --> 00:00:02,250\n第一行\n第二行\n\n2\n00:00:02,500 --> 00:00:03,250\n下一句\n');
  const emptySaved = await fetch(`${base}/api/projects/caption-http-empty`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'caption-http-empty', title: '空字幕', timeline: [] }) });
  assert.equal(emptySaved.status, 200, await emptySaved.text());
  const empty = await fetch(`${base}/api/projects/caption-http-empty/captions.srt`);
  const emptyBody = await empty.json();
  assert.equal(empty.status, 422);
  assert.equal(emptyBody.code, 'CAPTIONS_NOT_FOUND');
  console.log(JSON.stringify({ ok: true, status: 200, headStatus: head.status, captions: 2, utf8: true, contentDisposition: true, contentLength: Number(response.headers.get('content-length')), emptyStatus: empty.status, emptyCode: emptyBody.code }));
} finally {
  child.kill();
  await wait(250);
  await rm(root, { recursive: true, force: true });
}
