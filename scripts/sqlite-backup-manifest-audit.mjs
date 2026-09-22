import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-sqlite-backup-'));
const dataDir = path.join(root, 'data');
const databaseFile = path.join(dataDir, 'xingmu.sqlite');
const backupRoot = path.join(dataDir, 'backups');
const projectId = 'sqlite-backup-audit';
const port = 4200 + Math.floor(Math.random() * 300);
let server = null;
let serverOutput = '';

process.env.DATA_DIR = dataDir;
process.env.STORAGE_BACKEND = 'sqlite';
process.env.SQLITE_DATABASE = databaseFile;

const request = (pathname, method = 'GET', payload = undefined) => new Promise((resolve, reject) => {
  const raw = payload === undefined ? '' : JSON.stringify(payload);
  const req = http.request({ hostname:'127.0.0.1', port, path:pathname, method, headers:{ Host:`127.0.0.1:${port}`, ...(payload === undefined ? {} : { 'Content-Type':'application/json', 'Content-Length':String(Buffer.byteLength(raw)) }) } }, response => {
    const chunks=[]; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status:response.statusCode, headers:response.headers, body:Buffer.concat(chunks) }));
  });
  req.on('error', reject); req.end(raw);
});
const json = response => JSON.parse(response.body.toString('utf8'));
const stopServer = async () => { if (!server) return; server.kill(); await new Promise(resolve => server.once('close', resolve)); server = null; };

try {
  const fixture = path.join(root, 'fixture.mp4');
  const generated = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=orange:s=160x90:r=25', '-t', '0.8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding:'utf8', windowsHide:true });
  assert.equal(generated.status, 0, generated.stderr);
  const media = await readFile(fixture);
  const { closeStoreBackend, readProjectStorageSnapshot, saveBinaryAsset, saveProject } = await import('../server/store.mjs?sqlite-backup-seed');
  const { closeJobsBackend, saveGenerationJob } = await import('../server/jobs.mjs?sqlite-backup-seed');
  const asset = await saveBinaryAsset({ buffer:media, contentType:'video/mp4', projectId, kind:'shot', assetKey:'manifest-clip' });
  const savedProject = await saveProject({ id:projectId, title:'SQLite manifest 审计', shots:[{ id:'shot-1', duration:0.8, videoUrl:asset.url, probeStatus:asset.probeStatus, mediaMetadata:asset.mediaMetadata }], timeline:[{ id:'clip-1', shotId:'shot-1', start:0, duration:0.8 }] });
  const savedJob = await saveGenerationJob({ id:'job-sqlite-backup-audit', type:'generation', task:'story', projectId, status:'SUCCEEDED', idempotencyKey:'sqlite-backup-once', output:[asset.url], events:[{ type:'succeeded', at:new Date().toISOString() }] });
  const snapshot = await readProjectStorageSnapshot(projectId);
  assert.equal(snapshot.storageBackend, 'sqlite');
  assert.equal(snapshot.project.revision, savedProject.revision);
  assert.equal(snapshot.jobs.some(job => job.id === savedJob.id), true);
  assert.equal(snapshot.assets.some(item => item.id === asset.assetId), true);
  await closeStoreBackend(); await closeJobsBackend();

  server = spawn(process.execPath, ['server/index.mjs'], { cwd:process.cwd(), env:{ ...process.env, PORT:String(port), MOCK_MODE:'true', LOCAL_TTS_AUTOSTART:'false', AUTO_PROJECT_BACKUP:'false' }, stdio:['ignore','pipe','pipe'], windowsHide:true });
  server.stdout.on('data', chunk => { serverOutput += chunk; }); server.stderr.on('data', chunk => { serverOutput += chunk; });
  let ready=false; for (let attempt=0; attempt<100 && !ready; attempt+=1) { try { ready=(await request('/api/health')).status===200; } catch {} if (!ready) await new Promise(resolve => setTimeout(resolve, 80)); }
  assert.equal(ready, true, serverOutput);

  const createdResponse = await request(`/api/projects/${projectId}/backups`, 'POST', {}); assert.equal(createdResponse.status, 201, createdResponse.body.toString());
  const created = json(createdResponse).backup; assert.equal(created.manifest.snapshot.storageBackend, 'sqlite');
  assert.equal(created.manifest.snapshot.project.revision, savedProject.revision);
  assert.equal(created.manifest.snapshot.jobs.length, 1);
  assert.equal(created.manifest.snapshot.assets.length, 1);
  const assetReference = created.manifest.snapshot.assets[0];
  const fileEntry = created.manifest.files.find(item => item.path === assetReference.path);
  assert.deepEqual({ bytes:assetReference.bytes, sha256:assetReference.sha256 }, { bytes:fileEntry.bytes, sha256:fileEntry.sha256 });
  assert.equal(created.manifest.files.some(item => item.path === `${projectId}.json`), true);
  assert.equal(created.manifest.files.some(item => item.path === `jobs/${savedJob.id}.json`), true);

  const deleted = await request(`/api/projects/${projectId}`, 'DELETE'); assert.equal(deleted.status, 200, deleted.body.toString());
  assert.equal((await request(`/api/projects/${projectId}`)).status, 404);
  const restored = await request(`/api/projects/${projectId}/backups/${encodeURIComponent(created.backupId)}/restore`, 'POST', {}); assert.equal(restored.status, 200, restored.body.toString());
  const restoredProject = await request(`/api/projects/${projectId}`); assert.equal(restoredProject.status, 200, restoredProject.body.toString());
  const restoredDocument = json(restoredProject).project;
  assert.equal(restoredDocument.revision, savedProject.revision);
  assert.equal(restoredDocument.shots[0].videoUrl, asset.url);
  const restoredAsset = await request(asset.url); assert.equal(restoredAsset.status, 200); assert.deepEqual(restoredAsset.body, media);
  const restoredJobs = json(await request(`/api/jobs?projectId=${projectId}`)).jobs; assert.equal(restoredJobs.length, 1); assert.equal(restoredJobs[0].status, 'SUCCEEDED');

  const { verifyProjectBackup, restoreProjectBackup } = await import('../server/backup.mjs?sqlite-backup-audit');
  const backupFolder = path.join(backupRoot, created.backupId);
  assert.equal((await verifyProjectBackup(backupFolder)).storageBackend, 'sqlite');
  await writeFile(path.join(backupFolder, assetReference.path), Buffer.from('tampered')); await assert.rejects(() => verifyProjectBackup(backupFolder), /备份校验失败|SQLite 资产 manifest 不一致/);
  const tamperTarget = path.join(root, 'tamper-target'); const sentinel = JSON.stringify({ sentinel:true }); await mkdir(tamperTarget, { recursive:true }); await writeFile(path.join(tamperTarget, `${projectId}.json`), sentinel, 'utf8');
  await assert.rejects(() => restoreProjectBackup({ folder:backupFolder, dataDir:tamperTarget }), /备份校验失败|SQLite 资产 manifest 不一致/);
  assert.equal(await readFile(path.join(tamperTarget, `${projectId}.json`), 'utf8'), sentinel);
  const tamperedInfo = await stat(path.join(backupFolder, assetReference.path)); assert.equal(tamperedInfo.size, Buffer.byteLength('tampered'));
  console.log(JSON.stringify({ ok:true, storageBackend:'sqlite', manifest:'project+jobs+asset-metadata+media-hash', restore:'http-delete-then-restore', revision:savedProject.revision, jobs:1, assets:1, mp4Bytes:media.length, tamper:'rejected-without-partial-restore' }));
} finally {
  await stopServer();
  await rm(root, { recursive:true, force:true });
}
