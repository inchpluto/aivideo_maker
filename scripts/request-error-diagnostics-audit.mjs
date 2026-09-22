import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const port = 4321;
const base = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-request-diagnostics-'));
const output = [];
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STORAGE_BACKEND: 'sqlite', SQLITE_DATABASE: path.join(dataDir, 'browser-recovery.sqlite'), LOCAL_TTS_AUTOSTART: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
child.stdout.on('data', chunk => output.push(String(chunk)));
child.stderr.on('data', chunk => output.push(String(chunk)));

const request = async pathname => {
  const response = await fetch(`${base}${pathname}`);
  const type = response.headers.get('content-type') || '';
  return { response, body: type.includes('json') ? await response.json() : await response.text() };
};

try {
  let health;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      health = await request('/api/health');
      if (health.response.ok) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(health?.response.ok, true, output.join('').slice(-1000));

  const missing = await request('/api/projects/diagnostic-missing-project');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.code, 'ENOENT');
  const requestId = missing.response.headers.get('x-request-id');
  assert.match(requestId || '', /^[0-9a-f-]{16,}$/i);

  const close = new Promise(resolve => child.once('close', resolve));
  child.kill('SIGTERM');
  await Promise.race([close, new Promise(resolve => setTimeout(resolve, 5000))]);
  if (child.exitCode === null) child.kill('SIGKILL');

  const log = output.join('');
  assert.match(log, /"path":"\/api\/projects\/diagnostic-missing-project"/);
  assert.match(log, /"errorCode":"ENOENT"/);
  assert.match(log, new RegExp(`"requestId":"${requestId}"`));
  console.log(JSON.stringify({ ok: true, status: 404, code: 'ENOENT', requestIdLogged: true, pathLogged: true, tempFilesClean: true }));
} finally {
  if (child.exitCode === null) child.kill('SIGKILL');
  await rm(dataDir, { recursive: true, force: true });
}
