import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-remote-type-'));
const fixture = path.join(root, 'fixture.mp4');
const made = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:d=0.6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
assert.equal(made.status, 0, made.stderr);
const mp4 = await readFile(fixture);
const originalFetch = globalThis.fetch;
process.env.DATA_DIR = path.join(root, 'data');
const { saveRemoteAsset } = await import('../server/store.mjs');
let body = mp4;
globalThis.fetch = async () => new globalThis.Response(new globalThis.ReadableStream({ start(controller) { for (let offset = 0; offset < body.length; offset += 97) controller.enqueue(body.subarray(offset, Math.min(body.length, offset + 97))); controller.close(); } }), { status: 200, headers: { 'content-type': 'application/octet-stream' } });
try {
  const inferred = await saveRemoteAsset({ url: 'https://1.1.1.1/fixture.mp4', projectId: 'remote-type-audit', kind: 'video' });
  assert.equal(inferred.contentType, 'video/mp4');
  assert.equal(inferred.probeStatus, 'passed');
  body = Buffer.from('not-media');
  await assert.rejects(() => saveRemoteAsset({ url: 'https://1.1.1.1/not-media', projectId: 'remote-type-audit', kind: 'video' }), error => error.code === 'UNSUPPORTED_MEDIA_TYPE' || error.code === 'MEDIA_SIGNATURE_INVALID');
  console.log(JSON.stringify({ ok: true, inferred: inferred.contentType, probeStatus: inferred.probeStatus, streamingRemote: true, unknown: 'rejected' }));
} finally {
  globalThis.fetch = originalFetch;
  await rm(root, { recursive: true, force: true });
}
