import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cleanId = id => { const raw = String(id || ''); if (!/^[a-zA-Z0-9_-]+$/.test(raw)) throw new Error('项目 ID 无效。'); return raw; };
const digest = data => createHash('sha256').update(data).digest('hex');
const projectLocks = new Map();
const withProjectLock = async (id, task) => { const previous = projectLocks.get(id) || Promise.resolve(); const current = previous.catch(() => undefined).then(task); projectLocks.set(id, current); try { return await current; } finally { if (projectLocks.get(id) === current) projectLocks.delete(id); } };
const filesUnder = async (root, prefix = '') => {
  const entries = await readdir(root, { withFileTypes:true }).catch(() => []); const files = [];
  for (const entry of entries) { const rel = path.join(prefix, entry.name); if (entry.isDirectory()) files.push(...await filesUnder(path.join(root, entry.name), rel)); else files.push(rel); }
  return files;
};

const snapshotAssetName = (asset, projectId) => {
  const name = String(asset?.name || '');
  if (!name || name !== path.basename(name) || name.includes('/') || name.includes('\\')) throw Object.assign(new Error(`SQLite 资产文件名无效：${name || '(empty)'}`), { code:'BACKUP_SNAPSHOT_INVALID' });
  return `assets/${projectId}/${name}`;
};
const jsonBuffer = value => Buffer.from(JSON.stringify(value, null, 2), 'utf8');

export async function createProjectBackup({ dataDir, projectId, backupRoot, snapshot = null }) {
  const id = cleanId(projectId); return withProjectLock(id, async () => { const sourceRoot = path.resolve(dataDir); const folder = path.join(backupRoot, `${id}-${Date.now()}`); await mkdir(folder, { recursive:true });
  const manifest = []; const added = new Set();
  const addFile = async (relative, data) => { const normalized = relative.replaceAll(path.sep, '/'); if (added.has(normalized)) throw Object.assign(new Error(`备份存在重复路径：${normalized}`), { code:'BACKUP_SNAPSHOT_INVALID' }); added.add(normalized); const target = path.join(folder, relative); await mkdir(path.dirname(target), { recursive:true }); await writeFile(target, data); const item={ path:normalized, bytes:data.length, sha256:digest(data) }; manifest.push(item); return item; };
  let snapshotRecord = null;
  if (snapshot) {
    if (snapshot.storageBackend !== 'sqlite' || snapshot.project?.id !== id) throw Object.assign(new Error('SQLite 备份快照与项目不匹配。'), { code:'BACKUP_SNAPSHOT_INVALID' });
    const projectData = jsonBuffer(snapshot.project); const projectFile = await addFile(`${id}.json`, projectData);
    const jobRefs = [];
    for (const job of snapshot.jobs || []) {
      const jobId = cleanId(job.id || job.taskId); if (String(job.projectId || '') !== id) throw Object.assign(new Error(`SQLite 任务不属于项目：${jobId}`), { code:'BACKUP_SNAPSHOT_INVALID' });
      const jobData = jsonBuffer({ ...job, id:jobId }); const jobFile = await addFile(path.join('jobs', `${jobId}.json`), jobData); jobRefs.push({ id:jobId, path:jobFile.path, status:job.status || 'PENDING', sha256:jobFile.sha256 });
    }
    const assetRefs = [];
    for (const asset of snapshot.assets || []) {
      if (String(asset.projectId || id) !== id) throw Object.assign(new Error(`SQLite 资产不属于项目：${asset.id || '(unknown)'}`), { code:'BACKUP_SNAPSHOT_INVALID' });
      const relative = snapshotAssetName(asset, id); const source = path.join(sourceRoot, relative); const sourceInfo = await stat(source).catch(() => null);
      if (!sourceInfo?.isFile()) throw Object.assign(new Error(`SQLite 资产文件缺失：${relative}`), { code:'BACKUP_SNAPSHOT_MISSING' });
      const assetData = await readFile(source); const file = await addFile(relative, assetData); if (asset.bytes !== undefined && Number(asset.bytes) !== file.bytes) throw Object.assign(new Error(`SQLite 资产字节数不一致：${asset.id || relative}`), { code:'BACKUP_SNAPSHOT_MISMATCH' }); if (asset.sha256 && asset.sha256 !== file.sha256) throw Object.assign(new Error(`SQLite 资产哈希不一致：${asset.id || relative}`), { code:'BACKUP_SNAPSHOT_MISMATCH' });
      assetRefs.push({ ...asset, projectId:id, path:file.path, bytes:file.bytes, sha256:file.sha256 });
    }
    snapshotRecord = { storageBackend:'sqlite', project:{ id, revision:snapshot.project.revision, path:projectFile.path, sha256:projectFile.sha256 }, jobs:jobRefs, assets:assetRefs };
  } else {
    const projectJobs = [];
    for (const file of await filesUnder(path.join(sourceRoot, 'jobs'))) {
      const absolute = path.join(sourceRoot, 'jobs', file); let job = null;
      try { job = JSON.parse(await readFile(absolute, 'utf8')); } catch { continue; }
      if (job?.projectId === id) projectJobs.push(path.join('jobs', file));
    }
    const candidates = [`${id}.json`, ...((await filesUnder(path.join(sourceRoot, 'assets', id))).map(file => path.join('assets', id, file))), ...projectJobs];
    for (const relative of candidates) { const source = path.join(sourceRoot, relative); if (!(await stat(source).catch(() => null))) continue; await addFile(relative, await readFile(source)); }
  }
  const record = { version:snapshotRecord ? '1.1.0' : '1.0.0', projectId:id, createdAt:new Date().toISOString(), ...(snapshotRecord ? { snapshot:snapshotRecord } : {}), files:manifest };
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(record, null, 2), 'utf8'); return { folder, backupId:path.basename(folder), manifest:record }; });
}

export async function listProjectBackups({ backupRoot, projectId, maxCount = 10, maxBytes = 2_000_000_000 }) {
  const id = cleanId(projectId); const entries = await readdir(backupRoot, { withFileTypes:true }).catch(() => []); const backups = [];
  for (const entry of entries.filter(item => item.isDirectory() && item.name.startsWith(`${id}-`))) { const folder = path.join(backupRoot, entry.name); try { const verification = await verifyProjectBackup(folder); const files = await filesUnder(folder); let bytes=0; for (const file of files) bytes += (await stat(path.join(folder,file))).size; backups.push({ backupId:entry.name, folder, bytes, ...verification }); } catch { /* 损坏备份不进入可恢复列表 */ } }
  return backups.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, maxCount).filter(item => item.bytes <= maxBytes);
}

export async function pruneProjectBackups({ backupRoot, projectId, keep = 5, maxBytes = 2_000_000_000 }) {
  const id = cleanId(projectId); const keepCount=Math.max(0,Math.floor(Number(keep)||0)); const byteLimit=Math.max(0,Number(maxBytes)||0); return withProjectLock(id, async () => { const entries = await listProjectBackups({ backupRoot, projectId:id, maxCount:10_000, maxBytes:Number.MAX_SAFE_INTEGER }); let total=0; let kept=0; const removed=[];
    for (const item of entries) { const keepByCount=kept<keepCount; const keepByBytes=total+item.bytes<=byteLimit; if (keepByCount&&keepByBytes) { total+=item.bytes; kept+=1; continue; } await rm(item.folder, { recursive:true, force:true }); removed.push(item.backupId); }
    return { kept, removed, bytes:total, keep:keepCount, maxBytes:byteLimit, limitExceeded:total>byteLimit };
  });
}

export async function verifyProjectBackup(folder) {
  const manifest = JSON.parse(await readFile(path.join(folder, 'manifest.json'), 'utf8')); if (!Array.isArray(manifest.files)) throw new Error('备份清单无效。');
  const fileMap = new Map();
  for (const item of manifest.files) { if (!item || path.isAbsolute(item.path) || item.path.includes('..')) throw new Error('备份路径越界。'); const data = await readFile(path.join(folder, item.path)); if (data.length !== item.bytes || digest(data) !== item.sha256) throw Object.assign(new Error(`备份校验失败：${item.path}`), { code:'BACKUP_CHECKSUM_MISMATCH' }); fileMap.set(item.path, item); }
  if (manifest.snapshot) {
    const snapshot = manifest.snapshot; if (snapshot.storageBackend !== 'sqlite' || !snapshot.project?.path || snapshot.project.id !== manifest.projectId) throw Object.assign(new Error('SQLite 备份快照无效。'), { code:'BACKUP_SNAPSHOT_INVALID' });
    const projectEntry = fileMap.get(snapshot.project.path); if (!projectEntry || snapshot.project.sha256 !== projectEntry.sha256) throw Object.assign(new Error('SQLite 项目快照哈希不一致。'), { code:'BACKUP_SNAPSHOT_MISMATCH' });
    let project; try { project=JSON.parse(await readFile(path.join(folder, snapshot.project.path), 'utf8')); } catch { throw Object.assign(new Error('SQLite 项目快照不是有效 JSON。'), { code:'BACKUP_SNAPSHOT_INVALID' }); }
    if (project.id !== manifest.projectId || Number(project.revision) !== Number(snapshot.project.revision)) throw Object.assign(new Error('SQLite 项目快照 ID 或版本不一致。'), { code:'BACKUP_SNAPSHOT_MISMATCH' });
    for (const job of snapshot.jobs || []) { const item=fileMap.get(job.path); if (!item || item.sha256 !== job.sha256) throw Object.assign(new Error(`SQLite 任务快照哈希不一致：${job.id}`), { code:'BACKUP_SNAPSHOT_MISMATCH' }); let parsed; try { parsed=JSON.parse(await readFile(path.join(folder, job.path), 'utf8')); } catch { throw Object.assign(new Error(`SQLite 任务快照不是有效 JSON：${job.id}`), { code:'BACKUP_SNAPSHOT_INVALID' }); } if (parsed.id !== job.id || parsed.projectId !== manifest.projectId) throw Object.assign(new Error(`SQLite 任务快照归属不一致：${job.id}`), { code:'BACKUP_SNAPSHOT_MISMATCH' }); }
    const assetPaths = new Set(); for (const asset of snapshot.assets || []) { const item=fileMap.get(asset.path); if (!item || item.bytes !== Number(asset.bytes) || item.sha256 !== asset.sha256 || asset.projectId !== manifest.projectId) throw Object.assign(new Error(`SQLite 资产 manifest 不一致：${asset.id || asset.path}`), { code:'BACKUP_SNAPSHOT_MISMATCH' }); assetPaths.add(asset.path); }
    for (const item of manifest.files.filter(entry => entry.path.startsWith(`assets/${manifest.projectId}/`))) if (!assetPaths.has(item.path)) throw Object.assign(new Error(`SQLite 资产缺少元数据：${item.path}`), { code:'BACKUP_SNAPSHOT_MISMATCH' });
  }
  return { ok:true, projectId:manifest.projectId, files:manifest.files.length, createdAt:manifest.createdAt, storageBackend:manifest.snapshot?.storageBackend || 'filesystem' };
}

const readSnapshot = async (folder, manifest) => {
  if (!manifest.snapshot) return null;
  const snapshot=manifest.snapshot; const project=JSON.parse(await readFile(path.join(folder,snapshot.project.path),'utf8')); const jobs=[];
  for (const reference of snapshot.jobs || []) jobs.push(JSON.parse(await readFile(path.join(folder,reference.path),'utf8')));
  return { storageBackend:snapshot.storageBackend, project, jobs, assets:snapshot.assets || [] };
};

export async function restoreProjectBackup({ folder, dataDir, afterRestore = null }) {
  const verification = await verifyProjectBackup(folder); await mkdir(dataDir, { recursive:true });
  const manifest = JSON.parse(await readFile(path.join(folder, 'manifest.json'), 'utf8')); const id = cleanId(manifest.projectId); const snapshot = await readSnapshot(folder, manifest);
  return withProjectLock(id, async () => { const stage = path.join(dataDir, `.restore-${id}-${Date.now()}`); const rollback = path.join(dataDir, `.rollback-${id}-${Date.now()}`); const moved = [];
  try {
    for (const item of manifest.files) { if (path.isAbsolute(item.path) || item.path.includes('..')) throw new Error('备份路径越界。'); const staged = path.join(stage, item.path); await mkdir(path.dirname(staged), { recursive:true }); await cp(path.join(folder, item.path), staged); }
    for (const item of manifest.files) {
      const target = path.join(dataDir, item.path); const old = path.join(rollback, item.path); const staged = path.join(stage, item.path); await mkdir(path.dirname(old), { recursive:true });
      if (await stat(target).catch(() => null)) { await rename(target, old); moved.push({ target, old }); }
      await mkdir(path.dirname(target), { recursive:true }); await rename(staged, target); moved.push({ target, old:null });
    }
    if (afterRestore) await afterRestore(snapshot);
    return { ...verification, storageBackend:snapshot?.storageBackend || 'filesystem' };
  } catch (error) {
    for (const item of [...moved].reverse()) { if (item.old) { await rm(item.target, { force:true }); await mkdir(path.dirname(item.target), { recursive:true }); await rename(item.old, item.target).catch(() => undefined); } else await rm(item.target, { force:true }); }
    throw error;
  } finally { await rm(stage, { recursive:true, force:true }); await rm(rollback, { recursive:true, force:true }); } });
}
