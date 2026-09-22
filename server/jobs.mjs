import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from './fileCoordinator.mjs';
import { createSqliteBackend } from './sqliteBackend.mjs';

const jobsDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'), 'jobs');
const sqliteEnabled = String(process.env.STORAGE_BACKEND || '').toLowerCase() === 'sqlite';
const sqliteFile = path.resolve(process.env.SQLITE_DATABASE || path.join(path.dirname(jobsDir), 'xingmu.sqlite'));
let sqliteBackendPromise;
const getSqliteBackend = async () => { if (!sqliteEnabled) return null; sqliteBackendPromise ||= createSqliteBackend(sqliteFile); return sqliteBackendPromise; };
export async function closeJobsBackend() { if (sqliteBackendPromise) { (await sqliteBackendPromise).close(); sqliteBackendPromise = null; } }
const safe = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const jobPath = id => path.join(jobsDir, `${safe(id)}.json`);
const jobLockPath = id => path.join(jobsDir, `.${safe(id)}.lock`);

// 每 ID 串行写队列：与 store.saveProject 同样的并发安全策略，
// 避免 read-modify-write 竞态与 rename 冲突，防止丢更新/残留 .tmp。
const writeQueues = new Map();
const replaceAtomically = async (temporary, destination) => { let last; for (let attempt=0; attempt<6; attempt+=1) { try { await rename(temporary, destination); return; } catch (error) { last=error; if (!['EPERM','EACCES','EBUSY'].includes(error.code) || attempt===5) throw error; await new Promise(resolve=>setTimeout(resolve, 10*(attempt+1))); } } throw last; };
const withJobLock = (id, operation) => withFileLock(jobLockPath(id), operation);

async function writeGenerationJobUnlocked(job, idHint = '') {
  const id = safe(idHint || job.id || job.taskId) || `job-${Date.now()}`;
  const existing = await readGenerationJob(id).catch(() => ({}));
  const next = { ...existing, ...job, id, updatedAt: new Date().toISOString(), createdAt: existing.createdAt || new Date().toISOString() };
  const temporary = path.join(jobsDir, `.${id}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
  try { await replaceAtomically(temporary, jobPath(id)); }
  catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
  return next;
}

export async function saveGenerationJob(job) {
  if (sqliteEnabled) return (await getSqliteBackend()).saveJob(job);
  await mkdir(jobsDir, { recursive: true });
  const id = safe(job.id || job.taskId) || `job-${Date.now()}`;
  const previous = writeQueues.get(id) || Promise.resolve();
  const current = previous.catch(() => undefined).then(() => withJobLock(id, () => writeGenerationJobUnlocked(job, id)));
  writeQueues.set(id, current);
  try { return await current; } finally { if (writeQueues.get(id) === current) writeQueues.delete(id); }
}

export async function claimGenerationJob(id, { workerId, leaseMs = 30_000, allowWaitingProvider = false } = {}) {
  if (sqliteEnabled) return (await getSqliteBackend()).claimJob(id, { workerId, leaseMs, allowWaitingProvider });
  await mkdir(jobsDir, { recursive: true }); const cleanId = safe(id); const previous = writeQueues.get(cleanId) || Promise.resolve();
  const current = previous.catch(() => undefined).then(() => withJobLock(cleanId, async () => {
    const existing = await readGenerationJob(cleanId).catch(() => null); if (!existing || ['SUCCEEDED','FAILED','CANCELLED','awaiting_budget'].includes(existing.status) || (existing.status === 'WAITING_PROVIDER' && !allowWaitingProvider)) return null;
    const now = Date.now(); const leaseUntil = Number(existing.leaseUntil || 0); if (existing.status === 'RUNNING' && leaseUntil > now) return null;
    const next = { ...existing, status:'RUNNING', workerId:workerId || `worker-${process.pid}`, leaseUntil:now + Math.max(1000, Number(leaseMs) || 30_000), heartbeatAt:new Date(now).toISOString(), updatedAt:new Date(now).toISOString() };
    return writeGenerationJobUnlocked(next, cleanId);
  }));
  writeQueues.set(cleanId, current); try { return await current; } finally { if (writeQueues.get(cleanId) === current) writeQueues.delete(cleanId); }
}

export async function heartbeatGenerationJob(id, workerId, leaseMs = 30_000) {
  if (sqliteEnabled) return (await getSqliteBackend()).heartbeat(id, workerId, leaseMs);
  const cleanId = safe(id); if (!cleanId) return null;
  return withJobLock(cleanId, async () => {
    const existing = await readGenerationJob(cleanId).catch(() => null); if (!existing || existing.status !== 'RUNNING' || existing.workerId !== workerId) return null;
    return writeGenerationJobUnlocked({ id:cleanId, leaseUntil:Date.now() + Math.max(1000, Number(leaseMs) || 30_000), heartbeatAt:new Date().toISOString() }, cleanId);
  });
}

export async function findGenerationJob({ idempotencyKey = '', inputFingerprint = '', projectId = '' } = {}) {
  if (!idempotencyKey && !inputFingerprint) return null;
  if (sqliteEnabled && idempotencyKey) return (await getSqliteBackend()).findJob(projectId, idempotencyKey);
  const jobs = await listGenerationJobs(projectId); return jobs.find(job => (idempotencyKey && job.idempotencyKey === idempotencyKey) || (!idempotencyKey && inputFingerprint && job.inputFingerprint === inputFingerprint && !['FAILED','CANCELLED','needs_reconcile'].includes(job.status))) || null;
}

export async function recordGenerationJobEvent(id, event) {
  if (sqliteEnabled) return (await getSqliteBackend()).recordEvent(id, event);
  const cleanId = safe(id); if (!cleanId) return null;
  return withJobLock(cleanId, async () => {
    const existing = await readGenerationJob(cleanId).catch(() => null); if (!existing) return null;
    const nextEvent = { at:new Date().toISOString(), ...event }; return writeGenerationJobUnlocked({ id:cleanId, events:[...(existing.events || []), nextEvent] }, cleanId);
  });
}

export async function readGenerationJob(id) {
  if (sqliteEnabled) return (await getSqliteBackend()).readJob(id);
  return JSON.parse(await readFile(jobPath(id), 'utf8'));
}

export async function listGenerationJobs(projectId = '') {
  if (sqliteEnabled) return (await getSqliteBackend()).listJobs(projectId);
  await mkdir(jobsDir, { recursive: true });
  const files = (await readdir(jobsDir)).filter(name => name.endsWith('.json'));
  const jobs = await Promise.all(files.map(name => readFile(path.join(jobsDir, name), 'utf8').then(JSON.parse).catch(() => null)));
  return jobs.filter(job => job && (!projectId || job.projectId === projectId)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function deleteProjectJobs(projectId) {
  if (sqliteEnabled) return (await getSqliteBackend()).deleteJobs(projectId);
  const clean = safe(projectId);
  if (!clean || clean !== String(projectId || '')) throw new Error('项目 ID 无效。');
  const jobs = await listGenerationJobs(clean);
  await Promise.all(jobs.map(job => withJobLock(job.id, async () => unlink(jobPath(job.id)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  }))));
  return jobs.length;
}
