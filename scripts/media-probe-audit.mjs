import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = await mkdtemp(path.join(os.tmpdir(), 'xingmu-media-probe-'));
const source = path.join(root, 'fixture.mp4');
await new Promise((resolve, reject) => { const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=25', '-t', '0.8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))); });
process.env.DATA_DIR = path.join(root, 'data');
const { saveBinaryAsset } = await import('../server/store.mjs');
const asset = await saveBinaryAsset({ buffer: await readFile(source), contentType: 'video/mp4', projectId: 'probe-test', kind: 'fixture', assetKey:'provider-task:dedupe-1' });
assert.equal(asset.probeStatus, 'passed');
assert.ok(asset.mediaMetadata.duration > 0);
const duplicate = await saveBinaryAsset({ buffer: await readFile(source), contentType: 'video/mp4', projectId: 'probe-test', kind: 'fixture', assetKey:'provider-task:dedupe-1' }); assert.equal(duplicate.name, asset.name); assert.equal((await readdir(path.join(process.env.DATA_DIR,'assets','probe-test'))).length, 1);
await assert.rejects(() => saveBinaryAsset({ buffer: Buffer.from('not a video'), contentType: 'video/mp4', projectId: 'probe-test', kind: 'bad' }), error => ['MEDIA_PROBE_FAILED', 'MEDIA_SIGNATURE_INVALID'].includes(error.code));
await rm(root, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, probeStatus: asset.probeStatus, duration: Number(asset.mediaMetadata.duration.toFixed(2)), invalid: 'rejected' }));
