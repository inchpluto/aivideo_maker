import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

const root = process.cwd();
const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-browser-bootstrap-'));
const freePort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), LOCAL_TTS_AUTOSTART: 'false', FFMPEG_PATH: 'xingmu-browser-missing-ffmpeg', FFPROBE_PATH: 'xingmu-browser-missing-ffprobe' }, stdio: ['ignore', 'pipe', 'pipe'] });
const request = async (pathname, options = {}) => { try { const response = await fetch(`${base}${pathname}`, options); const bytes = new Uint8Array(await response.arrayBuffer()); return { response, bytes, text: Buffer.from(bytes).toString('utf8') }; } catch { return { response: { status: 0, headers: { get: () => null } }, bytes: new Uint8Array(), text: '' }; } };
try {
  let health;
  for (let i = 0; i < 50; i += 1) { health = await request('/api/health'); if (health.response.status === 200) break; await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(health.response.status, 200);
  const html = await request('/');
  assert.equal(html.response.status, 200);
  const scriptMatch = html.text.match(/<script[^>]+src="([^"]+\.js)"/i);
  const cssMatch = html.text.match(/<link[^>]+href="([^"]+\.css)"/i);
  assert.ok(scriptMatch && cssMatch, '生产 HTML 缺少 JS/CSS 入口');
  const script = await request(new URL(scriptMatch[1], `${base}/`).pathname);
  const css = await request(new URL(cssMatch[1], `${base}/`).pathname);
  assert.equal(script.response.status, 200);
  assert.match(script.response.headers.get('content-type') || '', /javascript/i);
  assert.doesNotMatch(script.text.slice(0, 200), /^<!doctype html/i);
  assert.match(script.text, /createRoot/);
  assert.equal(css.response.status, 200);
  assert.match(css.response.headers.get('content-type') || '', /css/i);

  const preflight = await request('/api/render/preflight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: { id: 'browser-bootstrap', settings: { aspectRatio: '9:16', fps: 30 }, timeline: [] } }) });
  assert.equal(preflight.response.status, 200);
  const preflightBody = JSON.parse(preflight.text).report;
  assert.equal(preflightBody.profile.width, 720);
  assert.equal(preflightBody.profile.height, 1280);
  assert.equal(preflightBody.profile.fps, 30);
  assert.equal(preflightBody.ready, false);
  assert.ok(preflightBody.blockers.some(item => item.code === 'FFMPEG_UNAVAILABLE' && item.message));
  assert.ok(preflightBody.blockers.some(item => item.code === 'TIMELINE_VIDEO_EMPTY'));

  const diagnostics = await request('/api/diagnostics/export');
  assert.equal(diagnostics.response.status, 200);
  assert.equal(String(diagnostics.response.headers.get('content-type') || '').toLowerCase(), 'application/zip');
  assert.equal(diagnostics.bytes[0], 0x50);
  assert.equal(diagnostics.bytes[1], 0x4b);
  console.log(JSON.stringify({ ok: true, health: true, html: 200, scriptMime: true, cssMime: true, preflightProfile: '9:16/30', noFfmpegBlocked: true, diagnosticZip: true }));
} finally {
  child.kill();
  await rm(dataDir, { recursive: true, force: true });
}
