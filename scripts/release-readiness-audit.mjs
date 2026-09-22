import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const port = 4194;
const base = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-release-audit-'));
const output = [];
const child = spawn(process.execPath, ['server/index.mjs'], { cwd:process.cwd(), env:{ ...process.env, PORT:String(port), DATA_DIR:dataDir, FFMPEG_PATH:path.join(dataDir, 'missing-ffmpeg.exe'), FFPROBE_PATH:path.join(dataDir, 'missing-ffprobe.exe'), LOCAL_TTS_AUTOSTART:'false' }, stdio:['ignore','pipe','pipe'], windowsHide:true });
child.stdout.on('data', chunk => output.push(String(chunk)));
child.stderr.on('data', chunk => output.push(String(chunk)));
const request = async (pathname, options) => { const response = await fetch(`${base}${pathname}`, options); const type = response.headers.get('content-type') || ''; return { response, body:type.includes('json') ? await response.json() : await response.arrayBuffer() }; };
try {
  let health;
  for (let attempt = 0; attempt < 80; attempt += 1) { try { health = await request('/api/health'); if (health.response.ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  assert.equal(health?.response.ok, true, output.join('').slice(-1000));
  assert.equal(health.body.render.ffmpeg.available, false);
  assert.equal(health.body.render.ffprobe.available, false);
  const preflight = await request('/api/render/preflight', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ project:{ id:'release-audit', timeline:[{ id:'clip-1', track:0, mediaType:'video', mediaUrl:'/api/assets/release-audit/clip.mp4', probeStatus:'passed' }] } }) });
  assert.equal(preflight.response.status, 200);
  assert.equal(preflight.body.report.ready, false);
  assert.equal(preflight.body.report.blockers.some(item => item.code === 'FFMPEG_UNAVAILABLE'), true);
  const diagnostics = await request('/api/diagnostics/export');
  assert.equal(diagnostics.response.status, 200);
  assert.equal(diagnostics.response.headers.get('content-type'), 'application/zip');
  assert.equal(Buffer.from(diagnostics.body).subarray(0, 2).toString(), 'PK');
  console.log(JSON.stringify({ ok:true, serviceWithoutFfmpeg:true, preflightBlocked:true, diagnosticZip:true }));
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 250));
  if (!child.killed) child.kill('SIGKILL');
  await rm(dataDir, { recursive:true, force:true });
}
