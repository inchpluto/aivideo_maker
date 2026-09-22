import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const dataDir = path.resolve(process.argv[2] || '');
if (!dataDir || dataDir === path.parse(dataDir).root) throw new Error('需要明确的隔离 DATA_DIR。');
process.env.DATA_DIR = dataDir;
process.env.STORAGE_BACKEND = 'sqlite';
process.env.SQLITE_DATABASE = path.join(dataDir, 'browser-recovery.sqlite');
const { closeStoreBackend, saveBinaryAsset, saveProject } = await import('../server/store.mjs');

const fixture = path.join(dataDir, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding:'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const asset = await saveBinaryAsset({ buffer:await readFile(fixture), contentType:'video/mp4', projectId:'browser-recovery', kind:'shot' });
const project = await saveProject({
  id:'browser-recovery',
  title:'浏览器重开恢复审计',
  settings:{ aspectRatio:'16:9', fps:24 },
  shots:[{ id:'shot-1', name:'真实测试图像', duration:4, videoUrl:asset.url, probeStatus:asset.probeStatus, mediaMetadata:asset.mediaMetadata }],
  timeline:[{ id:'clip-1', track:0, mediaType:'video', mediaUrl:asset.url, probeStatus:asset.probeStatus, duration:4, start:0 }],
});
console.log(JSON.stringify({ ok:true, dataDir, projectId:project.id, revision:project.revision, assetBytes:asset.bytes, probeStatus:asset.probeStatus }));
await closeStoreBackend();
