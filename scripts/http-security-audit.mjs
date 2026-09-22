import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-security-'));
const port = 4197;
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), MOCK_MODE: 'true' }, stdio: 'ignore' });
const request = (pathName, headers, method='GET') => new Promise(resolve => { const req=http.request({ hostname:'127.0.0.1', port, path:pathName, method, headers }, res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({ status:res.statusCode, headers:res.headers, body:Buffer.concat(chunks) }));});req.on('error',()=>resolve({ status:0, headers:{}, body:Buffer.alloc(0) }));req.end() });
try {
  let ready = false; for (let i=0; i<30 && !ready; i += 1) { ready = (await request('/api/health', { Host:`127.0.0.1:${port}` })).status === 200; if (!ready) await new Promise(resolve=>setTimeout(resolve,100)); }
  assert.equal(ready, true);
  assert.equal((await request('/api/health', { Host:`evil.example:${port}` })).status, 403);
  assert.equal((await request('/api/health', { Host:`127.0.0.1:${port}`, Origin:'https://evil.example' })).status, 403);
  await mkdir(path.join(dataDir, 'assets', 'p'), { recursive:true }); await writeFile(path.join(dataDir, 'assets', 'p', 'media.mp4'), Buffer.from('0123456789'));
  const ranged = await request('/api/assets/p/media.mp4', { Host:`127.0.0.1:${port}`, Range:'bytes=2-5' });
  assert.equal(ranged.status, 206); assert.equal(ranged.headers['content-range'], 'bytes 2-5/10'); assert.equal(ranged.body.toString(), '2345');
  const head = await request('/api/assets/p/media.mp4', { Host:`127.0.0.1:${port}` }, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(head.headers['content-length'], '10');
  console.log(JSON.stringify({ ok:true, local:200, badHost:403, badOrigin:403, range:206, head:200 }));
} finally { child.kill(); await rm(dataDir, { recursive:true, force:true }); }
