import http from 'node:http';
import { mkdir, open, readFile, rename, stat, statfs, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { analyzeNovelText, applyScreenplay, partitionImportedEpisodes } from './workflow.mjs';
import { auditProviderIntegration, pollProviderTask, publicProviders, runProvider, runStagedStory } from './providers.mjs';
import { publicProviderConfig, testProviderConnection, updateProviderConfig } from './config.mjs';
import { compilePromptTask, publicPromptSpecs } from './prompts.mjs';
import { inspectWorkflow, workflowBlueprint } from './pipeline.mjs';
import { closeStoreBackend, deleteProject, isSqliteStorage, listProjects, readProject, readProjectStorageSnapshot, registerImportedFileAsset, resolveAssetPath, restoreProject, restoreProjectStorageSnapshot, saveAsset, saveFileAsset, saveProject } from './store.mjs';
import { closeJobsBackend, deleteProjectJobs, listGenerationJobs, readGenerationJob, saveGenerationJob } from './jobs.mjs';
import { publicCameraKnowledge } from './knowledge/cinematography.mjs';
import { publicRunwayMotionKnowledge } from './knowledge/runwayMotion.mjs';
import { auditVideoPayload, publicVideoPlatformKnowledge } from './knowledge/videoPlatforms.mjs';
import { inspectCreativeContext } from '../shared/creativeContext.mjs';
import { getRenderCapabilities, renderPreflight, renderProject, renderProxyProject } from './render.mjs';
import { deleteVoice, listVoicePacks, upsertVoice } from './voiceLibrary.mjs';
import { ensureLocalTtsService, localTtsServiceStatus, startPreferredLocalTts, stopLocalTtsServices } from './localTtsManager.mjs';
import { repositoryContract } from './repositories.mjs';
import { createProjectBackup, listProjectBackups, pruneProjectBackups, restoreProjectBackup } from './backup.mjs';
import { createTaskWorker } from './taskWorker.mjs';
import { bindProviderAsset } from './assetBindings.mjs';
import { createProjectPackageStream, importProjectPackage, inspectProjectPackageFile, PROJECT_PACKAGE_MAX_BYTES } from './projectPackage.mjs';
import { applyCacheCleanup, previewCacheCleanup } from './cleanup.mjs';
import { createDiagnostics } from './diagnostics.mjs';
import { createDiagnosticsPackage } from './diagnosticPackage.mjs';
import { withFileLock } from './fileCoordinator.mjs';
import { buildSrt, captionItemsFromTimeline } from '../src/captionExport.js';
import { sendFile, sendMediaFile } from './httpFiles.mjs';
import { readJsonBody as body } from './httpBody.mjs';
import { APP_VERSION } from './version.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const dataRoot = path.resolve(process.env.DATA_DIR || path.join(root, 'server', 'data'));
const backupRoot = path.join(dataRoot, 'backups');
const sourceRoot = path.join(dataRoot, 'source-documents');
const safeId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const port = Number(process.env.PORT || 4174);
const mediaUploadLimit = Math.max(1_000, Number(process.env.MEDIA_UPLOAD_LIMIT_BYTES) || 250_000_000);
const packageUploadLimit = Math.min(PROJECT_PACKAGE_MAX_BYTES, Math.max(1_000_000, Number(process.env.PACKAGE_UPLOAD_LIMIT_BYTES) || PROJECT_PACKAGE_MAX_BYTES));
const packageDiskReserve = Math.min(1_000_000_000_000, Math.max(0, Number.isFinite(Number(process.env.PACKAGE_DISK_RESERVE_BYTES)) ? Number(process.env.PACKAGE_DISK_RESERVE_BYTES) : 32 * 1024 * 1024));
const renderControllers = new Map();
const renderJobLocks = new Map();
const cancelledRenderJobs = new Set();
const renderRequestLocks = new Map();
const autoBackupLast = new Map();
const diagnostics = createDiagnostics();

function scheduleAutoBackup(projectId) {
  if (process.env.AUTO_PROJECT_BACKUP !== 'true') return;
  const interval = Math.max(60_000, Number(process.env.AUTO_PROJECT_BACKUP_INTERVAL_MS) || 3_600_000); const last=autoBackupLast.get(projectId)||0;
  if (Date.now()-last<interval) return; autoBackupLast.set(projectId,Date.now());
  void readProjectStorageSnapshot(projectId).then(snapshot=>createProjectBackup({dataDir:dataRoot,projectId,backupRoot,snapshot})).then(()=>pruneProjectBackups({backupRoot,projectId,keep:Number(process.env.AUTO_PROJECT_BACKUP_KEEP)||5,maxBytes:Number(process.env.AUTO_PROJECT_BACKUP_MAX_BYTES)||2_000_000_000})).catch(error=>console.error('[server] 自动备份失败',error));
}

async function persistSourceDocument(projectId, filename, text) {
  const source = String(text || '');
  await mkdir(sourceRoot, { recursive: true });
  const file = path.join(sourceRoot, `${projectId}.txt`);
  const temporary = path.join(sourceRoot, `.${projectId}.${Date.now()}.part`);
  await writeFile(temporary, source, 'utf8');
  await rename(temporary, file);
  return { documentId: `source-${projectId}`, filename, storage: 'server/source-documents', path: `/api/projects/${encodeURIComponent(projectId)}/source`, bytes: Buffer.byteLength(source, 'utf8'), sha256: createHash('sha256').update(source, 'utf8').digest('hex') };
}

const json = (res, status, body) => { if (body?.code) res.__xingmuErrorCode = body.code; res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };

// 对外错误信息脱敏：避免把上游响应体/密钥等原始内容回吐给前端，同时保留有意义的 HTTP/code 与摘要。
// 内部完整错误可记录到服务端日志；此处只对前端返回清洗后的 message。
function sanitizeErrorMessage(message) {
  const raw = String(message || 'Unknown error');
  // 截断超长文本（多半是上游响应体）
  let text = raw.length > 500 ? `${raw.slice(0, 320)}…（已截断）` : raw;
  // 剥离疑似密钥/令牌片段
  text = text.replace(/Bearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer ***')
    .replace(/x-goog-api-key[=:]\s*[A-Za-z0-9._-]+/gi, 'key=***')
    .replace(/API[_-]?KEY[=:]\s*[A-Za-z0-9._-]{6,}/gi, 'API_KEY=***')
    .replace(/data:(image|audio|video)\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, 'data:***');
  return text || '请求失败。';
}

const binaryBody = (req, limit = 250_000_000) => new Promise((resolve, reject) => { const chunks = []; let size = 0; let failed = false; const label = limit >= 1_000_000 ? `${Math.round(limit / 1_000_000)}MB` : `${limit} bytes`; const declared = Number(req.headers['content-length'] || 0); if (Number.isFinite(declared) && declared > limit) { failed = true; req.resume(); const error = new Error(`请求内容超过 ${label}。`); error.code = 'MEDIA_TOO_LARGE'; reject(error); return; } req.on('data', chunk => { if (failed) return; size += chunk.length; if (size > limit) { failed = true; const error = new Error(`请求内容超过 ${label}。`); error.code = 'MEDIA_TOO_LARGE'; reject(error); return; } chunks.push(chunk); }); req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks)); }); req.on('error', reject); });
async function ensureFreeSpace(requiredBytes, reserveBytes = 0) {
  const required = Math.max(0, Number(requiredBytes) || 0); const reserve = Math.max(0, Number(reserveBytes) || 0);
  if (!required || !reserve) return;
  const fileSystem = await statfs(dataRoot).catch(() => null); if (!fileSystem) return;
  const available = Number(fileSystem.bavail) * Number(fileSystem.bsize);
  if (Number.isFinite(available) && available < required + reserve) throw Object.assign(new Error(`磁盘空间不足，项目包至少需要 ${Math.ceil((required + reserve) / 1_000_000)}MB 可用空间。`), { code: 'PACKAGE_DISK_SPACE_LOW', availableBytes: available, requiredBytes: required + reserve });
}
async function receiveBinaryFile(req, destination, limit = 250_000_000, options = {}) {
  const label = limit >= 1_000_000 ? `${Math.round(limit / 1_000_000)}MB` : `${limit} bytes`; const declared = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declared) && declared > limit) { req.resume(); const error = new Error(`请求内容超过 ${label}。`); error.code = 'MEDIA_TOO_LARGE'; throw error; }
  const reserveBytes = Math.max(0, Number(options.reserveBytes) || 0); await ensureFreeSpace(declared, reserveBytes);
  const handle = await open(destination, 'wx'); let size = 0; let nextSpaceCheck = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) { req.resume(); const error = new Error(`请求内容超过 ${label}。`); error.code = 'MEDIA_TOO_LARGE'; throw error; }
      if (reserveBytes && size >= nextSpaceCheck) { try { await ensureFreeSpace(size, reserveBytes); } catch (error) { req.resume(); throw error; } nextSpaceCheck = size + 8 * 1024 * 1024; }
      await handle.write(chunk);
    }
    return size;
  } finally { await handle.close().catch(() => undefined); }
}

const safeUploadId = value => { const id = String(value || ''); return /^[a-zA-Z0-9_-]{1,120}$/.test(id) ? id : ''; };
const uploadTemporaryPath = (projectId, uploadId) => path.join(dataRoot, `.upload-${safeUploadId(projectId) || 'shared'}-${uploadId}.part`);
const parseContentRange = (value, limit) => {
  const match = String(value || '').match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!match) { const error = new Error('分块上传需要合法的 Content-Range。'); error.code = 'UPLOAD_RANGE_INVALID'; throw error; }
  const start = Number(match[1]); const end = Number(match[2]); const total = Number(match[3]);
  if (![start, end, total].every(Number.isSafeInteger) || start < 0 || end < start || total <= end || total > limit) { const error = new Error(`分块上传范围无效，文件上限为 ${Math.round(limit / 1_000_000)}MB。`); error.code = 'UPLOAD_RANGE_INVALID'; throw error; }
  return { start, end, total, length: end - start + 1 };
};
async function receiveUploadChunk(req, destination, range, limit) {
  const existing = await stat(destination).catch(() => null); const currentOffset = existing?.size || 0;
  if (currentOffset !== range.start) { req.resume(); const error = new Error(`上传偏移不匹配，服务端下一偏移为 ${currentOffset}。`); error.code = 'UPLOAD_OFFSET_CONFLICT'; error.nextOffset = currentOffset; throw error; }
  const declared = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declared) && declared !== range.length) { const error = new Error('分块 Content-Length 与 Content-Range 不一致。'); error.code = 'UPLOAD_CHUNK_LENGTH_MISMATCH'; throw error; }
  const handle = await open(destination, currentOffset ? 'r+' : 'wx'); let written = 0;
  try {
    for await (const chunk of req) {
      const remaining = range.length - written;
      if (chunk.length > remaining) {
        if (remaining > 0) { await handle.write(chunk.subarray(0, remaining), 0, remaining, range.start + written); written += remaining; }
        await handle.truncate(range.start + written);
        const error = new Error('分块实际大小超过 Content-Range。'); error.code = 'UPLOAD_CHUNK_TOO_LARGE'; throw error;
      }
      await handle.write(chunk, 0, chunk.length, range.start + written); written += chunk.length;
    }
    if (written !== range.length) { await handle.truncate(range.start + written); const error = new Error('分块未完整到达，可从返回偏移继续上传。'); error.code = 'UPLOAD_CHUNK_INCOMPLETE'; error.nextOffset = range.start + written; throw error; }
    return range.start + written;
  } finally { await handle.close().catch(() => undefined); }
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };

async function materialize(result, projectId = 'shared', kind = 'asset') {
  if (!result?.result) return result;
  const output = { ...result, result: { ...result.result } };
  if (output.result.imageBase64) {
    const asset = await saveAsset({ base64: output.result.imageBase64, contentType: output.result.contentType || 'image/png', projectId, kind, assetKey:output.result.assetKey || output.result.taskId || output.result.interactionId || '' });
    delete output.result.imageBase64;
    output.result.imageUrl = asset.url;
    output.result.url = asset.url;
  }
  if (output.result.audioBase64) {
    const asset = await saveAsset({ base64: output.result.audioBase64, contentType: output.result.contentType || 'audio/mpeg', projectId, kind, assetKey:output.result.assetKey || output.result.taskId || output.result.interactionId || '' });
    delete output.result.audioBase64;
    output.result.audioUrl = asset.url;
    output.result.url = asset.url;
    output.result.probeStatus = asset.probeStatus;
    output.result.mediaMetadata = asset.mediaMetadata;
  }
  if (output.result.videoBase64) {
    const asset = await saveAsset({ base64: output.result.videoBase64, contentType: output.result.contentType || 'video/mp4', projectId, kind, assetKey:output.result.assetKey || output.result.taskId || output.result.interactionId || '' });
    delete output.result.videoBase64;
    output.result.videoUrl = asset.url;
    output.result.url = asset.url;
    output.result.output = [asset.url];
    output.result.probeStatus = asset.probeStatus;
    output.result.mediaMetadata = asset.mediaMetadata;
  }
  return output;
}
const generationWorker = createTaskWorker({ limits:{ default:Number(process.env.GENERATION_CONCURRENCY||2), video:1, voice:1, render:1 }, budget:{ maxTasks:process.env.GENERATION_MAX_TASKS?Number(process.env.GENERATION_MAX_TASKS):Number.POSITIVE_INFINITY, maxCalls:process.env.GENERATION_MAX_CALLS?Number(process.env.GENERATION_MAX_CALLS):Number.POSITIVE_INFINITY, maxMediaSeconds:process.env.GENERATION_MAX_MEDIA_SECONDS?Number(process.env.GENERATION_MAX_MEDIA_SECONDS):Number.POSITIVE_INFINITY }, execute:async (item)=>materialize(item.task==='story'&&item.payload?.stagedStory?await runStagedStory(item.payload,item.route,{completedResults:item.stageResults||[],onChunk:async ({results,coveredChunkIds,index,total})=>saveGenerationJob({id:item.id,stage:`story-chunk-${index+1}-of-${total}`,coveredChunkIds,stageResults:results})}):await runProvider(item.task,item.payload,item.route),item.projectId,item.task), reconcile:async (item)=>materialize({ ok:true, mode:'live', task:item.task, result:await pollProviderTask(item.providerTaskId,item.route), providerTaskId:item.providerTaskId },item.projectId,item.task) });

const publicRenderJob = job => {
  if (!job) return job;
  const { projectSnapshot, idempotencyKey, ...publicJob } = job;
  return publicJob;
};
const publicGenerationJob = job => { if (!job) return job; const { payloadSnapshot, stageResults, ...publicJob } = job; return publicJob; };

const stableRenderValue = value => {
  if (Array.isArray(value)) return value.map(stableRenderValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableRenderValue(value[key])]));
  return value;
};
const renderInputFingerprint = ({ project, preset = null, expectedRevision = null }) => createHash('sha256').update(JSON.stringify(stableRenderValue({ project, preset, expectedRevision })), 'utf8').digest('hex');
const withRenderRequestLock = async (key, work) => {
  const previous = renderRequestLocks.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(work);
  renderRequestLocks.set(key, current);
  try { return await current; } finally { if (renderRequestLocks.get(key) === current) renderRequestLocks.delete(key); }
};
const withRenderJobLock = async (id, work) => {
  const previous = renderJobLocks.get(id) || Promise.resolve();
  const current = previous.catch(() => undefined).then(work);
  renderJobLocks.set(id, current);
  try { return await current; } finally { if (renderJobLocks.get(id) === current) renderJobLocks.delete(id); }
};

async function runRenderJob(id, project) {
  if (renderControllers.has(id)) return;
  const existing = await readGenerationJob(id).catch(() => null);
  if (!existing || ['CANCELLED', 'SUCCEEDED'].includes(existing.status)) return;
  const controller = new globalThis.AbortController();
  renderControllers.set(id, controller);
  try {
    const current = await readGenerationJob(id).catch(() => null);
    if (cancelledRenderJobs.has(id) || current?.status === 'CANCELLED') return;
    await saveGenerationJob({ id, type: 'render', status: 'RUNNING', progress: 10 });
    const result = await renderProject(project, { renderKey: id, signal: controller.signal });
    await withRenderJobLock(id, async () => {
      const latest = await readGenerationJob(id).catch(() => null);
      if (controller.signal.aborted || cancelledRenderJobs.has(id) || latest?.status === 'CANCELLED') throw Object.assign(new Error('渲染已取消。'), { code: 'RENDER_CANCELLED', name: 'AbortError' });
      await saveGenerationJob({ id, type: 'render', status: 'SUCCEEDED', progress: 100, result, output: [result.deliverable], technicalQc: result.technicalQc, failure: null, code: null });
    });
  } catch (error) {
    const cancelled = controller.signal.aborted || error?.name === 'AbortError' || error?.code === 'RENDER_CANCELLED' || error?.code === 'ABORT_ERR';
    await saveGenerationJob({ id, type: 'render', status: cancelled ? 'CANCELLED' : 'FAILED', progress: 100, failure: cancelled ? '渲染已取消。' : sanitizeErrorMessage(error.message), code: cancelled ? 'RENDER_CANCELLED' : (error.code || 'RENDER_FAILED') });
  } finally {
    renderControllers.delete(id);
    cancelledRenderJobs.delete(id);
  }
}

async function recoverRenderJobs() {
  const jobs = await listGenerationJobs();
  for (const job of jobs.filter(item => item.type === 'render' && ['PENDING', 'RUNNING'].includes(item.status))) {
    const project = job.projectSnapshot || await readProject(job.projectId).catch(() => null);
    if (project) void runRenderJob(job.id, project);
    else await saveGenerationJob({ id: job.id, status: 'FAILED', progress: 100, failure: '服务重启后找不到渲染项目快照。', code: 'RENDER_PROJECT_NOT_FOUND' });
  }
}

async function diagnosticMetrics() {
  const fileSystem = await statfs(dataRoot).catch(() => null);
  return {
    generationQueueLength: generationWorker.queued(),
    generationActiveCount: generationWorker.active().length,
    renderActiveCount: renderControllers.size,
    dataDirFreeBytes: fileSystem ? Number(fileSystem.bavail) * Number(fileSystem.bsize) : null,
  };
}

async function staticFile(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return json(res, 405, { error: '静态资源仅支持 GET / HEAD。', code: 'METHOD_NOT_ALLOWED' });
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { throw Object.assign(new Error('请求路径编码无效。'), { code: 'INVALID_REQUEST_URL' }); }
  const publicAssets = path.join(root, 'assets');
  const isWorkspaceAsset = pathname.startsWith('/assets/');
  const candidates = pathname === '/'
    ? [path.join(dist, 'index.html')]
    : isWorkspaceAsset
      ? [path.resolve(root, `.${pathname}`), path.resolve(dist, `.${pathname}`)]
      : [path.resolve(dist, `.${pathname}`)];
  const allowedRoots = isWorkspaceAsset ? [publicAssets, dist] : [dist];
  if (candidates.some(candidate => !allowedRoots.some(allowedRoot => candidate === allowedRoot || candidate.startsWith(`${allowedRoot}${path.sep}`)))) return json(res, 403, { error: 'Forbidden' });
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      const file = info.isDirectory() ? path.join(candidate, 'index.html') : candidate;
      await sendFile(req, res, mime[path.extname(file)] || 'application/octet-stream', await readFile(file));
      return;
    } catch { /* 尝试下一个安全候选路径 */ }
  }
  // A missing JS/CSS/media file must not receive HTML with a success status.
  if (isWorkspaceAsset || path.extname(pathname)) return json(res, 404, { error: '静态资源不存在。', code: 'STATIC_FILE_NOT_FOUND' });
  try { await sendFile(req, res, 'text/html; charset=utf-8', await readFile(path.join(dist, 'index.html'))); } catch { json(res, 404, { error: '请先运行 pnpm build' }); }
}

const server = http.createServer(async (req, res) => {
  const requestId = diagnostics.requestId();
  const startedAt = Date.now();
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { return json(res, 400, { error: '请求地址无效。', code: 'INVALID_REQUEST_URL' }); }
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const projectMatch = url.pathname.match(/\/projects\/([^/]+)/);
    const jobMatch = url.pathname.match(/\/(?:render|generate)\/jobs\/([^/]+)/);
    diagnostics.record({ requestId, method: req.method, path: url.pathname, status: res.statusCode, durationMs: Date.now() - startedAt, projectId: res.__xingmuProjectId || projectMatch?.[1] || '', jobId: res.__xingmuJobId || jobMatch?.[1] || '', errorCode: res.__xingmuErrorCode });
  });
  const host = String(req.headers.host || '').replace(/\.$/, '');
  const trustedHost = /^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(host);
  if (!trustedHost) return json(res, 403, { error: '仅允许本机访问。', code: 'UNTRUSTED_HOST' });
  const origin = req.headers.origin || '';
  const trustedOrigin = !origin || /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(origin);
  if (origin && trustedOrigin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { if (!trustedOrigin) return json(res, 403, { error: '不允许的来源。' }); res.writeHead(204, { 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' }); return res.end(); }
  if (url.pathname.startsWith('/api/') && !trustedOrigin) return json(res, 403, { error: '不允许的来源。' });
  if (origin && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originUrl = new URL(origin);
    if (originUrl.hostname !== host.split(':')[0]) return json(res, 403, { error: '来源与本地服务不匹配。', code: 'CSRF_ORIGIN_MISMATCH' });
  }
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const config = await publicProviderConfig();
      const workflowAudit = await auditProviderIntegration();
      const providerStates = Object.values(config.providers || {});
      const configured = providerStates.filter(item => item.configured).length;
      const verified = providerStates.filter(item => item.verified).length;
      const mode = config.liveMode === false ? 'demo' : verified > 0 ? 'live' : configured > 0 ? 'configured-unverified' : 'manual';
      const productionTasks=workflowAudit.tasks.filter(item=>item.task!=='review');const readyTasks=productionTasks.filter(item=>item.credentialVerified).length;const manualTasks=productionTasks.filter(item=>item.manualOnly).length;
      return json(res, 200, { ok: true, service: 'xingmu-orchestrator', version: APP_VERSION, mode, strictMode: config.liveMode !== false, generationReady: workflowAudit.readyForLive, partialGenerationReady: verified > 0, manualFallbackReady: workflowAudit.manualFallbackComplete, taskReadiness:{ready:readyTasks,manual:manualTasks,total:productionTasks.length}, providers: { configured, verified, total: providerStates.length }, render: await getRenderCapabilities(), time: new Date().toISOString() });
    }
    if (req.method === 'GET' && url.pathname === '/api/diagnostics') return json(res, 200, { ok: true, schemaVersion: 1, generatedAt: new Date().toISOString(), metrics: await diagnosticMetrics(), recent: diagnostics.recent() });
    if (req.method === 'GET' && url.pathname === '/api/diagnostics/export') {
      const projects = await listProjects();
      const jobs = await listGenerationJobs();
      const backups = (await Promise.all(projects.map(async project => listProjectBackups({ backupRoot, projectId: project.id }).catch(() => [])))).flat();
      const packaged = createDiagnosticsPackage({ diagnostics, metrics: await diagnosticMetrics(), projects, jobs, backups });
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': packaged.buffer.length, 'Content-Disposition': `attachment; filename="xingmu-diagnostics-${stamp}.zip"` });
      return res.end(packaged.buffer);
    }
    if (req.method === 'GET' && url.pathname === '/api/diagnostics/storage') return json(res, 200, { ok: true, contract: repositoryContract });
    if (req.method === 'GET' && url.pathname === '/api/providers') return json(res, 200, { providers: await publicProviders(), config: await publicProviderConfig() });
    if (req.method === 'GET' && url.pathname === '/api/config/providers') return json(res, 200, await publicProviderConfig());
    if (req.method === 'PUT' && url.pathname === '/api/config/providers') return json(res, 200, await updateProviderConfig(await body(req)));
    if (req.method === 'POST' && url.pathname === '/api/config/providers/test') { const input = await body(req); return json(res, 200, await testProviderConnection(input.provider)); }
    if (req.method === 'POST' && url.pathname === '/api/assets/upload') { const input = await body(req); const asset = await saveAsset({ base64: input.base64, contentType: input.contentType, kind: input.kind || 'reference', projectId: input.projectId }); return json(res, 201, { asset }); }
    if (req.method === 'POST' && url.pathname === '/api/assets/media') {
      const uploadId = safeUploadId(url.searchParams.get('uploadId') || req.headers['x-upload-id']);
      if (url.searchParams.has('uploadId') || req.headers['x-upload-id'] || req.headers['content-range']) {
        if (!uploadId) throw Object.assign(new Error('分块上传缺少合法 uploadId。'), { code: 'UPLOAD_ID_INVALID' });
        const projectId = safeId(url.searchParams.get('projectId') || 'shared') || 'shared'; const range = parseContentRange(req.headers['content-range'], mediaUploadLimit); const temporary = uploadTemporaryPath(projectId, uploadId); await mkdir(dataRoot, { recursive: true });
        let finalizing = false;
        try {
          const result = await withFileLock(`${temporary}.lock`, async () => {
            const nextOffset = await receiveUploadChunk(req, temporary, range, mediaUploadLimit);
            if (nextOffset < range.total) return { complete: false, nextOffset, total: range.total };
            finalizing = true;
            const asset = await saveFileAsset({ file: temporary, contentType: String(req.headers['content-type'] || '').split(';', 1)[0], kind: url.searchParams.get('kind') || 'local-media', projectId });
            return { complete: true, nextOffset, total: range.total, asset };
          });
          return json(res, result.complete ? 201 : 200, { ok: true, uploadId, ...result });
        } catch (error) {
          if (finalizing) await unlink(temporary).catch(() => undefined);
          throw error;
        }
      }
      const temporary = path.join(dataRoot, `.upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.part`);
      try {
        await receiveBinaryFile(req, temporary, mediaUploadLimit);
        const asset = await saveFileAsset({ file: temporary, contentType: String(req.headers['content-type'] || '').split(';', 1)[0], kind: url.searchParams.get('kind') || 'local-media', projectId: url.searchParams.get('projectId') || 'shared' });
        return json(res, 201, { asset });
      } finally { await unlink(temporary).catch(() => undefined); }
    }
    if (req.method === 'GET' && url.pathname === '/api/assets/media' && url.searchParams.has('uploadId')) {
      const uploadId = safeUploadId(url.searchParams.get('uploadId')); if (!uploadId) throw Object.assign(new Error('uploadId 无效。'), { code: 'UPLOAD_ID_INVALID' });
      const projectId = safeId(url.searchParams.get('projectId') || 'shared') || 'shared'; const temporary = uploadTemporaryPath(projectId, uploadId); const current = await stat(temporary).catch(() => null);
      if (!current?.isFile()) return json(res, 404, { error: '未找到可恢复的上传。', code: 'UPLOAD_NOT_FOUND', uploadId, nextOffset: 0 });
      return json(res, 200, { ok: true, uploadId, complete: false, nextOffset: current.size });
    }
    if (req.method === 'DELETE' && url.pathname === '/api/assets/media' && url.searchParams.has('uploadId')) {
      const uploadId = safeUploadId(url.searchParams.get('uploadId')); if (!uploadId) throw Object.assign(new Error('uploadId 无效。'), { code: 'UPLOAD_ID_INVALID' });
      const projectId = safeId(url.searchParams.get('projectId') || 'shared') || 'shared'; await unlink(uploadTemporaryPath(projectId, uploadId)).catch(() => undefined); return json(res, 200, { ok: true, uploadId, cancelled: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/voices') return json(res, 200, await listVoicePacks());
    if (req.method === 'GET' && url.pathname === '/api/tts/services') return json(res, 200, await localTtsServiceStatus());
    if (req.method === 'POST' && url.pathname === '/api/tts/services/start') { const input=await body(req);return json(res,200,await ensureLocalTtsService(input.engine||'index_tts_local',{waitMs:Number(input.waitMs??0)})); }
    if (req.method === 'POST' && url.pathname === '/api/voices') return json(res, 200, await upsertVoice(await body(req)));
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/voices/')) { const [, , , packId, voiceId] = url.pathname.split('/'); return json(res, 200, { deleted:await deleteVoice(packId,voiceId) }); }
    if (req.method === 'GET' && url.pathname === '/api/prompts') return json(res, 200, { prompts: publicPromptSpecs() });
    if (req.method === 'POST' && url.pathname === '/api/prompts/compile') { const input = await body(req); return json(res, 200, { promptTask: compilePromptTask(input.task, input.values || {}) }); }
    if (req.method === 'GET' && url.pathname === '/api/knowledge/camera-movements') return json(res, 200, publicCameraKnowledge());
    if (req.method === 'GET' && url.pathname === '/api/knowledge/runway-motion') return json(res, 200, publicRunwayMotionKnowledge());
    if (req.method === 'GET' && url.pathname === '/api/knowledge/video-platforms') return json(res, 200, publicVideoPlatformKnowledge());
    if (req.method === 'POST' && url.pathname === '/api/video/preflight') { const input=await body(req);return json(res,200,{report:auditVideoPayload(input.payload||{},input.route||'')}); }
    if (req.method === 'GET' && url.pathname === '/api/workflow') return json(res, 200, { version: '2.0.0', blueprint: workflowBlueprint });
    if (req.method === 'GET' && url.pathname === '/api/workflow/audit') return json(res, 200, { audit:await auditProviderIntegration() });
    if (req.method === 'POST' && url.pathname === '/api/workflow/inspect') { const input = await body(req); return json(res, 200, { report: inspectWorkflow(input.project || input) }); }
    if (req.method === 'GET' && url.pathname === '/api/projects') return json(res, 200, { projects: await listProjects() });
    const sourceMatch = url.pathname.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)\/source$/);
    if (sourceMatch && req.method === 'GET') { const projectId = sourceMatch[1]; const sourceFile = path.join(sourceRoot, `${projectId}.txt`); const source = await readFile(sourceFile, 'utf8'); res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(source, 'utf8'), 'Content-Disposition': 'inline' }); return res.end(source); }
     if (req.method === 'GET' && url.pathname === '/api/jobs') { const jobs=await listGenerationJobs(url.searchParams.get('projectId') || ''); return json(res, 200, { jobs:jobs.map(job=>job.type==='render'?publicRenderJob(job):publicGenerationJob(job)) }); }
    if (req.method === 'POST' && url.pathname === '/api/generate/jobs') {
      const input=await body(req); const id=`generation-${String(input.task||'task').replace(/[^a-zA-Z0-9_-]/g,'')}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; const job=await generationWorker.enqueue({id,task:input.task,payload:input.payload||{},route:input.route,projectId:input.projectId||'shared',budget:input.budget,idempotencyKey:input.idempotencyKey||'',stage:input.stage,episodeIndex:input.episodeIndex,coveredChunkIds:input.coveredChunkIds}); res.__xingmuProjectId=input.projectId||'shared'; res.__xingmuJobId=id; return json(res,202,{ok:true,job:publicGenerationJob(job)});
    }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/generate\/jobs\/[^/]+\/cancel$/)) { const id=decodeURIComponent(url.pathname.split('/')[4]); const job=await generationWorker.cancel(id); return json(res,200,{ok:true,job:publicGenerationJob(job)}); }
    if (req.method === 'POST' && url.pathname.match(/^\/api\/generate\/jobs\/[^/]+\/retry$/)) { const id=decodeURIComponent(url.pathname.split('/')[4]); const job=await generationWorker.retry(id); return json(res,202,{ok:true,job:publicGenerationJob(job)}); }
    if (req.method === 'GET' && url.pathname.startsWith('/api/generate/jobs/')) { const id=decodeURIComponent(url.pathname.slice('/api/generate/jobs/'.length)); return json(res,200,{ok:true,job:publicGenerationJob(await readGenerationJob(id))}); }
    if (req.method === 'POST' && url.pathname === '/api/novel/analyze') {
      const input = await body(req); let parsed = analyzeNovelText(input); parsed = partitionImportedEpisodes(parsed, { text: input.text, episodeCount: input.episodeCount }); const sourceDocument = await persistSourceDocument(parsed.id, input.filename || '导入小说.txt', input.text); parsed.source = { ...(parsed.source || {}), ...sourceDocument }; const creativeBrief={sourceType:input.sourceType||'novel',mode:input.creativeMode||'adapt',synopsis:input.synopsis||parsed.synopsis,designConstraints:input.designConstraints||'',mustKeep:input.mustKeep||'',avoid:input.avoid||'',targetEnding:input.targetEnding||'',approved:input.creativeMode==='planned',updatedAt:new Date().toISOString()};parsed.title=String(input.projectName||parsed.title).trim();parsed.synopsis=String(input.synopsis||parsed.synopsis).trim();parsed.settings = { ...(parsed.settings || {}), aspectRatio: input.aspectRatio || '9:16', fps: 24 };parsed.creativeBrief=creativeBrief;parsed.platformPlan={...(parsed.platformPlan||{}),targetPlatform:input.publishPlatform||'YouTube Shorts / Bilibili'};parsed.promptContextAudit=inspectCreativeContext(parsed);
      const storyPayload = { title: input.projectName||parsed.title, synopsis: input.synopsis||parsed.synopsis, sourceText: String(input.text || ''), sourceChunkPlan: parsed.source.chunkPlan, sourceType:creativeBrief.sourceType, creativeMode:creativeBrief.mode, designConstraints:creativeBrief.designConstraints, mustKeep:creativeBrief.mustKeep, avoid:creativeBrief.avoid, targetEnding:creativeBrief.targetEnding, type: parsed.type, episodeLength: parsed.workflow.episodeLength, episodeCount: input.episodeCount || 1, genre: input.genre, audience: input.audience, visualStyle: input.visualStyle, adaptation: input.adaptation, aspectRatio: input.aspectRatio, publishPlatform:input.publishPlatform||'YouTube Shorts / Bilibili', performanceGoal:'提高选择观看率、留存与完播，同时兑现故事承诺', retentionLessons:'暂无历史数据，不得伪造', contextGaps:parsed.promptContextAudit.gaps.map(item=>`[${item.stage}] ${item.entity}:${item.label}`).join('；')||'无', revisionInstruction:parsed.promptContextAudit.revisionBrief, characters: parsed.characters };
      try {
        const story = await runProvider('story', storyPayload, input.route); const applied = applyScreenplay(parsed, story); const project = await saveProject(story.mode === 'demo' ? partitionImportedEpisodes(applied, { text: input.text, episodeCount: input.episodeCount }) : applied);
        return json(res, 200, { project, mode: story.mode === 'live' ? 'server-live' : 'server-mock', generation: { provider: story.provider, model: story.model }, workflowReport: inspectWorkflow(project) });
      } catch (error) {
        if (error.code !== 'PROVIDER_NOT_CONFIGURED') throw error;
        const project = await saveProject({ ...parsed, generation:{...(parsed.generation||{}),story:{status:'manual-required',mode:'manual',promptTask:compilePromptTask('story',storyPayload),generatedAt:null}}, jobs:(parsed.jobs||[]).map(job=>job.id==='job-script'?{...job,status:'waiting',provider:'手动提示词工作流'}:job), workflow:{...parsed.workflow,current:'script',completion:28} });
        return json(res, 200, { project, mode:'server-manual', generation:{provider:'未配置',model:input.route||'未选择'}, warning:'未配置剧本 API，已创建可编辑草稿并生成手动任务。', workflowReport:inspectWorkflow(project) });
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const input = await body(req); res.__xingmuProjectId=input.projectId||''; const generated = await materialize(await runProvider(input.task, input.payload, input.route), input.projectId, input.task);
      if (input.task === 'video' && generated.result?.taskId) { res.__xingmuJobId=generated.result.taskId; await saveGenerationJob({ id: generated.result.taskId, taskId: generated.result.taskId, projectId: input.projectId, shotId: input.payload?.shotId, route: input.route, provider: generated.provider, model: generated.model, status: generated.result.status, output: generated.result.output || [] }); }
      return json(res, 200, generated);
    }
    if (req.method === 'POST' && url.pathname === '/api/generate/status') {
      const input = await body(req); const existing = await readGenerationJob(input.taskId).catch(() => null);
      if (existing?.status === 'SUCCEEDED' && existing.output?.[0]?.startsWith('/api/assets/')) return json(res, 200, { ok: true, mode: 'live', task: 'video', provider: existing.provider || 'Runway', model: existing.model, result: existing });
      const task = await pollProviderTask(input.taskId, input.route || existing?.route);
      if (task.status === 'SUCCEEDED' && task.videoBase64) {
        const asset=await bindProviderAsset({providerTaskId:input.taskId,base64:task.videoBase64,contentType:task.contentType||'video/mp4',projectId:input.projectId||existing?.projectId,kind:`video-${input.shotId||existing?.shotId||'shot'}`});delete task.videoBase64;task.remoteOutput ||= task.output;task.output=[asset.url];
      } else if (task.status === 'SUCCEEDED' && task.output?.[0]) {
        const asset = await bindProviderAsset({providerTaskId:input.taskId,url:task.output[0],projectId:input.projectId||existing?.projectId,kind:`video-${input.shotId||existing?.shotId||'shot'}`});
        task.remoteOutput = task.output; task.output = [asset.url]; task.probeStatus = asset.probeStatus; task.mediaMetadata = asset.mediaMetadata;
      }
      const provider=task.provider||existing?.provider||'视频供应商';await saveGenerationJob({ ...(existing || {}), ...task, id: input.taskId, taskId: input.taskId, projectId: input.projectId || existing?.projectId, shotId: input.shotId || existing?.shotId, route: input.route || existing?.route, provider });
      return json(res, 200, { ok: true, mode: 'live', task: 'video', provider, model: task.model, result: task });
    }
    const backupMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/backups(?:\/([^/]+)\/restore)?$/);
    const pruneMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/backups\/prune$/);
    if (pruneMatch && req.method === 'POST') { const input=await body(req); const result=await pruneProjectBackups({backupRoot,projectId:decodeURIComponent(pruneMatch[1]),keep:input.keep ?? 5,maxBytes:input.maxBytes ?? 2_000_000_000}); return json(res,200,{ok:true,result}); }
    if (backupMatch && req.method === 'GET' && !backupMatch[2]) {
      const backups = await listProjectBackups({ backupRoot, projectId:decodeURIComponent(backupMatch[1]) }); return json(res, 200, { ok:true, backups:backups.map(({folder,...item})=>item) });
    }
    if (backupMatch && req.method === 'POST' && !backupMatch[2]) {
      const projectId=decodeURIComponent(backupMatch[1]); const snapshot=await readProjectStorageSnapshot(projectId); const created = await createProjectBackup({ dataDir:dataRoot, projectId, backupRoot, snapshot }); return json(res, 201, { ok:true, backup:{ backupId:created.backupId, manifest:created.manifest } });
    }
    if (backupMatch && req.method === 'POST' && backupMatch[2]) {
      const projectId=decodeURIComponent(backupMatch[1]); const backupId=decodeURIComponent(backupMatch[2]); if (!/^[a-zA-Z0-9_-]+$/.test(backupId) || !backupId.startsWith(`${projectId}-`)) throw Object.assign(new Error('备份 ID 与项目不匹配。'), { code:'BACKUP_SCOPE_MISMATCH' });
      const folder=path.resolve(backupRoot, backupId); if (path.dirname(folder)!==path.resolve(backupRoot)) throw Object.assign(new Error('备份路径无效。'), { code:'BACKUP_PATH_INVALID' });
      const restored=await restoreProjectBackup({ folder, dataDir:dataRoot, afterRestore:async snapshot=>{ if (isSqliteStorage()) { if (!snapshot) throw Object.assign(new Error('SQLite 恢复要求备份包含数据库快照。'), { code:'BACKUP_STORAGE_MISMATCH' }); return restoreProjectStorageSnapshot(snapshot); } if (snapshot) throw Object.assign(new Error('SQLite 备份不能恢复到 JSON 存储。'), { code:'BACKUP_STORAGE_MISMATCH' }); } }); return json(res, 200, { ok:true, restored });
    }
    const packageMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/package$/);
    if(packageMatch&&req.method==='GET'){
      const projectId=decodeURIComponent(packageMatch[1]);const project=await readProject(projectId);const packaged=await createProjectPackageStream({project,dataDir:dataRoot});const filename=(String(projectId).replace(/[^a-zA-Z0-9_-]/g,'_')||'project')+'.xingmu.zip';
      res.writeHead(200,{'Content-Type':'application/zip','Content-Length':packaged.contentLength,'Content-Disposition':`attachment; filename="${filename}"`});
      try { for await(const chunk of packaged.stream()){if(res.destroyed)break;if(!res.write(chunk))await new Promise(resolve=>res.once('drain',resolve));} } finally { if(!res.writableEnded&&!res.destroyed)res.end(); }
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/projects/package/inspect') {
      const temporary = path.join(dataRoot, `.package-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.part`);
      let inspected;
      try {
        await receiveBinaryFile(req, temporary, packageUploadLimit, { reserveBytes: packageDiskReserve });
        inspected = await inspectProjectPackageFile(temporary);
      } finally { await unlink(temporary).catch(() => undefined); }
      return json(res, 200, { ok: true, legacy: inspected.legacy, manifest: inspected.manifest, preflight: inspected.preflight });
    }
    if (req.method === 'POST' && url.pathname === '/api/projects/package/import') {
      const temporary = path.join(dataRoot, `.package-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.part`);
      let imported;
      try {
        await receiveBinaryFile(req, temporary, packageUploadLimit, { reserveBytes: packageDiskReserve });
        imported = await importProjectPackage({ inputPath: temporary, dataDir: dataRoot, allowMissing: url.searchParams.get('allowMissing') === 'true', conflict: url.searchParams.get('conflict') || 'copy', existingProjectIds: (await listProjects()).map(project => project.id) });
        if (isSqliteStorage()) {
          imported.project = await saveProject(imported.project);
          imported.assets = await Promise.all((imported.assets || []).map(asset => registerImportedFileAsset({ file: path.join(dataRoot, 'assets', imported.projectId, asset.name), projectId: imported.projectId, kind: asset.kind, assetId: asset.assetId })));
        }
      } finally { await unlink(temporary).catch(() => undefined); }
      // Success means temporary upload cleanup has completed, not just begun.
      return json(res, 201, { ok: true, imported });
    }
    if(req.method==='POST'&&url.pathname==='/api/maintenance/cleanup'){
      const input=await body(req);const projects=await listProjects();const projectDocuments=await Promise.all(projects.map(project=>readProject(project.id).catch(()=>null)));const jobs=await listGenerationJobs();const activeJobProjects=jobs.filter(job=>!['SUCCEEDED','FAILED','CANCELLED','needs_reconcile','awaiting_budget'].includes(job.status)).map(job=>job.projectId);const plan=await previewCacheCleanup({dataDir:dataRoot,maxAgeMs:Number(input.maxAgeMs)||24*60*60*1000,projectIds:[...projects.map(project=>project.id),...activeJobProjects],projectDocuments});const result=input.apply===true?await applyCacheCleanup(plan,{dryRun:false}):plan;return json(res,200,{ok:true,applied:result.applied===true,cleanup:result});
    }
    if (req.method === 'PUT' && url.pathname.startsWith('/api/projects/')) { const input = await body(req); const project=await saveProject({ ...input, id: url.pathname.split('/').pop() }); res.__xingmuProjectId=project.id; scheduleAutoBackup(project.id); return json(res, 200, { project }); }
    const restoreMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/restore$/); if(req.method==='POST'&&restoreMatch){const restored=await restoreProject(decodeURIComponent(restoreMatch[1]));return json(res,200,{ok:true,project:restored});}
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/projects/')) { const id = url.pathname.split('/').pop(); const deleted = await deleteProject(id); res.__xingmuProjectId=id; const jobsDeleted = await deleteProjectJobs(id); return json(res, 200, { deleted, jobsDeleted }); }
    const captionsMatch=url.pathname.match(/^\/api\/projects\/([^/]+)\/captions\.srt$/);
     if (captionsMatch && ['GET','HEAD'].includes(req.method)) {
      const project=await readProject(decodeURIComponent(captionsMatch[1]));
      const captions=captionItemsFromTimeline(project?.timeline);
      if (!captions.length) throw Object.assign(new Error('时间线上没有可导出的字幕。'), { code:'CAPTIONS_NOT_FOUND' });
      const srt=buildSrt(captions);
      const filename=`${String(project.title||'星幕作品').replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g,'-').slice(0,64)||'星幕作品'}_字幕.srt`;
      res.writeHead(200, { 'Content-Type':'application/x-subrip; charset=utf-8', 'Content-Length':Buffer.byteLength(srt,'utf8'), 'Content-Disposition':`attachment; filename="captions.srt"; filename*=UTF-8''${encodeURIComponent(filename)}` });
       return req.method === 'HEAD' ? res.end() : res.end(srt,'utf8');
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/projects/')) return json(res, 200, { project: await readProject(url.pathname.split('/').pop()) });
    if (['GET', 'HEAD'].includes(req.method) && url.pathname.startsWith('/api/assets/')) {
      const [, , , projectId, ...nameParts] = url.pathname.split('/');
      const file = resolveAssetPath(projectId, decodeURIComponent(nameParts.join('/')));
      const contentType = mime[path.extname(file)] || (path.extname(file) === '.mp3' ? 'audio/mpeg' : path.extname(file) === '.mp4' ? 'video/mp4' : 'application/octet-stream');
      return await sendMediaFile(req, res, file, contentType);
    }
    if (req.method === 'POST' && url.pathname === '/api/render') {
      const input = await body(req); res.__xingmuProjectId=input.projectId||'';
      const project = input.projectId ? await readProject(input.projectId) : input.project;
      if (!project) throw new Error('缺少要渲染的项目。');
      const result = await renderProject(project);
      return json(res, 200, result);
    }
    if (req.method === 'POST' && url.pathname === '/api/render/proxy') {
      const input = await body(req); res.__xingmuProjectId=input.projectId||input.project?.id||'';
      const project = input.projectId ? await readProject(input.projectId) : input.project;
      if (!project) throw new Error('缺少要生成代理预览的项目。');
      const result = await renderProxyProject(project);
      return json(res, 200, result);
    }
    if (req.method === 'POST' && url.pathname === '/api/render/preflight') {
      const input = await body(req);
      const project = input.projectId ? await readProject(input.projectId) : input.project;
      return json(res, 200, { ok: true, report: await renderPreflight(project || {}) });
    }
    if (req.method === 'POST' && url.pathname === '/api/render/jobs') {
      const input = await body(req); res.__xingmuProjectId=input.projectId||'';
      const submittedProject = input.project && typeof input.project === 'object' ? input.project : null;
      const projectId = String(input.projectId || submittedProject?.id || '').trim();
      const persistedProject = projectId ? await readProject(projectId).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)) : null;
      const expectedRevision = input.expectedRevision === undefined || input.expectedRevision === null || input.expectedRevision === '' ? null : Number(input.expectedRevision);
      if (expectedRevision !== null && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) throw Object.assign(new Error('expectedRevision 必须是非负整数。'), { code:'RENDER_EXPECTED_REVISION_INVALID' });
      if (persistedProject && expectedRevision !== null && persistedProject.revision !== expectedRevision) {
        throw Object.assign(new Error(`项目版本冲突：服务端为 ${persistedProject.revision}，渲染提交基于 ${expectedRevision}。`), { code:'REVISION_CONFLICT', currentRevision:persistedProject.revision });
      }
      const project = submittedProject || persistedProject;
      if (!project && projectId) throw Object.assign(new Error('项目不存在。'), { code:'ENOENT' });
      if (!project) throw new Error('缺少要渲染的项目。');
      if (projectId && String(project.id || '') !== projectId) throw Object.assign(new Error('渲染项目 ID 与提交内容不一致。'), { code:'RENDER_PROJECT_MISMATCH' });
      const projectKey = String(project.id || 'project').replace(/[^a-zA-Z0-9_-]/g, '') || 'project';
      const idempotencyKey = String(input.idempotencyKey || '').trim();
      if (idempotencyKey.length > 128) throw Object.assign(new Error('渲染幂等键过长。'), { code:'RENDER_IDEMPOTENCY_INVALID' });
      const preset = input.preset && typeof input.preset === 'object' ? input.preset : { aspectRatio:project.settings?.aspectRatio || '', fps:project.settings?.fps || '' };
      const inputFingerprint = renderInputFingerprint({ project, preset, expectedRevision });
      const create = async () => {
        const existing = idempotencyKey ? (await listGenerationJobs(project.id)).find(job => job.type === 'render' && job.idempotencyKey === idempotencyKey) : null;
        if (existing) {
          if (existing.inputFingerprint && existing.inputFingerprint !== inputFingerprint) throw Object.assign(new Error('同一渲染幂等键已用于不同的项目输入。'), { code:'RENDER_IDEMPOTENCY_CONFLICT' });
          res.__xingmuProjectId=project.id; res.__xingmuJobId=existing.id;
          return { status:200, reused:true, job:publicRenderJob(existing) };
        }
        const id = `render-${projectKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const job = await saveGenerationJob({ id, taskId:id, type:'render', projectId:project.id, projectSnapshot: project, idempotencyKey, inputRevision:expectedRevision ?? (Number.isInteger(project.revision) ? project.revision : null), inputFingerprint, preset, deliveryReady:false, status:'PENDING', progress:0 });
        res.__xingmuProjectId=project.id; res.__xingmuJobId=id; void runRenderJob(id, project);
        return { status:202, reused:false, job:{ id:job.id, type:'render', status:'PENDING', progress:0, inputRevision:job.inputRevision, deliveryReady:false } };
      };
      const created = idempotencyKey ? await withRenderRequestLock(`${project.id}:${idempotencyKey}`, create) : await create();
      return json(res, created.status, { ok:true, ...(created.reused ? { reused:true } : {}), job:created.job });
    }
    const cancelMatch = req.method === 'POST' && url.pathname.match(/^\/api\/render\/jobs\/([^/]+)\/cancel$/);
    if (cancelMatch) {
      const id = decodeURIComponent(cancelMatch[1]);
      cancelledRenderJobs.add(id);
      const job = await readGenerationJob(id);
      if (!['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job.status)) {
        renderControllers.get(id)?.abort();
        await withRenderJobLock(id, async () => {
          const latest = await readGenerationJob(id).catch(() => null);
          if (latest && !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(latest.status)) await saveGenerationJob({ id, type:'render', status:'CANCELLED', progress:100, failure:'渲染已取消。', code:'RENDER_CANCELLED' });
        });
      }
      const deadline = Date.now() + 3_000;
      while (renderControllers.has(id) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      if (!renderControllers.has(id)) cancelledRenderJobs.delete(id);
      return json(res, 200, { ok:true, job: publicRenderJob(await readGenerationJob(id)) });
    }
    const retryMatch = req.method === 'POST' && url.pathname.match(/^\/api\/render\/jobs\/([^/]+)\/retry$/);
    if (retryMatch) {
      const id = decodeURIComponent(retryMatch[1]);
      const job = await readGenerationJob(id);
      if (['PENDING', 'RUNNING'].includes(job.status)) return json(res, 409, { error:'渲染任务仍在运行。', code:'RENDER_ALREADY_RUNNING' });
      for (let wait = 0; renderControllers.has(id) && wait < 100; wait += 1) await new Promise(resolve => setTimeout(resolve, 20));
      if (renderControllers.has(id)) return json(res, 409, { error:'上一次渲染尚未完全退出，请稍后重试。', code:'RENDER_STOPPING' });
      const project = job.projectSnapshot || await readProject(job.projectId).catch(() => null);
      if (!project) throw Object.assign(new Error('找不到可重试的渲染项目。'), { code:'RENDER_PROJECT_NOT_FOUND' });
      cancelledRenderJobs.delete(id);
      await saveGenerationJob({ id, type:'render', projectSnapshot:project, status:'PENDING', progress:0, failure:null, code:null, result:null, output:[], deliveryReady:false, deliveryReview:null });
      void runRenderJob(id, project);
      return json(res, 202, { ok:true, job: publicRenderJob(await readGenerationJob(id)) });
    }
    const reviewMatch = req.method === 'POST' && url.pathname.match(/^\/api\/render\/jobs\/([^/]+)\/review$/);
    if (reviewMatch) {
      const id = decodeURIComponent(reviewMatch[1]);
      const job = await readGenerationJob(id);
      if (job.type !== 'render' || job.status !== 'SUCCEEDED' || !job.result?.deliverable || !job.technicalQc) return json(res, 409, { error:'只有已通过技术质检的成片才能人工审核。', code:'RENDER_REVIEW_NOT_READY' });
      const input = await body(req);
      const decision = String(input.decision || '').trim();
      if (!['pass', 'needs-revision'].includes(decision)) throw Object.assign(new Error('审核结论必须是 pass 或 needs-revision。'), { code:'RENDER_REVIEW_INVALID' });
      const review = { decision, note:String(input.note || '').trim().slice(0, 500), reviewedAt:new Date().toISOString() };
      const reviewed = await saveGenerationJob({ id, deliveryReady:decision === 'pass', deliveryReview:review });
      return json(res, 200, { ok:true, job:publicRenderJob(reviewed) });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/render/jobs/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/render/jobs/'.length));
      const job = await readGenerationJob(id);
      return json(res, 200, { ok:true, job: publicRenderJob(job) });
    }
    if (['GET', 'HEAD'].includes(req.method) && url.pathname.startsWith('/api/render/')) {
      const [, , , rawProjectId, ...rest] = url.pathname.split('/');
      const projectId = String(rawProjectId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!projectId || ![1, 2].includes(rest.length)) return json(res, 404, { error: '渲染产物不存在' });
      const decoded = rest.map(segment => decodeURIComponent(segment));
      const renderKey = decoded.length === 2 ? decoded[0] : '';
      const name = decoded.at(-1);
      if ((renderKey && !/^[a-zA-Z0-9_-]+$/.test(renderKey)) || !/^[a-zA-Z0-9_-]+\.(mp4|mov|webm)$/.test(name)) return json(res, 404, { error: '渲染产物不存在' });
      const renderRoot = path.join(dataRoot, 'render', projectId, ...(renderKey ? [renderKey] : []));
      const file = path.join(renderRoot, name);
      if (path.dirname(file) !== renderRoot) return json(res, 403, { error: 'Forbidden' });
      return await sendMediaFile(req, res, file, 'video/mp4');
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'API 路由不存在' });
    return await staticFile(req, res);
  } catch (error) {
    // A failed/aborted stream has already started its response. Never write a
    // second set of headers; terminate it without crashing other requests.
    if (res.headersSent || res.destroyed) {
      res.__xingmuErrorCode = error?.code || 'STREAM_FAILED';
      res.destroy();
      return;
    }
    // 完整错误仅写服务端日志，前端只收到脱敏后的摘要；请求上下文用于定位偶发尾请求。
    const errorCode = error?.code || 'REQUEST_FAILED';
    res.__xingmuErrorCode = errorCode;
    if (error?.stack) console.error('[server]', JSON.stringify({ requestId, method: req.method, path: url.pathname, errorCode, stack: error.stack }));
    const packageValidationCodes = ['PACKAGE_EMPTY', 'PACKAGE_FORMAT_INVALID', 'PACKAGE_ZIP_INVALID', 'PACKAGE_ZIP_UNSUPPORTED', 'PACKAGE_DUPLICATE_ENTRY', 'PACKAGE_CHECKSUM_MISMATCH', 'PACKAGE_MANIFEST_INVALID', 'PACKAGE_PATH_INVALID', 'PACKAGE_CREDENTIALS_FOUND', 'PACKAGE_ABSOLUTE_PATH', 'PACKAGE_MISSING_ASSETS'];
    const status = errorCode === 'ENOENT' ? 404 : errorCode === 'PACKAGE_DISK_SPACE_LOW' ? 507 : ['REQUEST_TOO_LARGE', 'MEDIA_TOO_LARGE', 'PACKAGE_TOO_LARGE'].includes(errorCode) ? 413 : errorCode === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : ['MEDIA_SIGNATURE_INVALID', 'MEDIA_PROBE_FAILED', 'UPLOAD_RANGE_INVALID', 'UPLOAD_ID_INVALID', 'UPLOAD_CHUNK_LENGTH_MISMATCH', 'UPLOAD_CHUNK_TOO_LARGE', 'UPLOAD_CHUNK_INCOMPLETE', 'CAPTIONS_NOT_FOUND', ...packageValidationCodes].includes(errorCode) ? 422 : ['PROVIDER_NOT_CONFIGURED','REVISION_CONFLICT','RENDER_IDEMPOTENCY_CONFLICT','UPLOAD_OFFSET_CONFLICT'].includes(errorCode) ? 409 : 400;
    return json(res, status, { error: sanitizeErrorMessage(error?.message), code: errorCode, ...(errorCode === 'REVISION_CONFLICT' ? { currentRevision: error.currentRevision } : {}), ...(Number.isSafeInteger(error.nextOffset) ? { nextOffset: error.nextOffset } : {}), ...(Array.isArray(error.issues)?{issues:error.issues}: {}) });
  }
});

server.requestTimeout = 360_000;   // 单个请求最长 6 分钟（覆盖同步视频生成/下载）
server.headersTimeout = 65_000;    // 请求头解析超时
server.keepAliveTimeout = 10_000;
server.maxConnections = 500;       // 在 listen 前设置，防止上游故障时连接无限堆积

server.listen(port, '127.0.0.1', async () => {
  console.log(`星幕服务已启动：http://127.0.0.1:${port}`);
  const config=await publicProviderConfig().catch(()=>({}));
  const preferred=['index_tts_local','f5_tts_local'].includes(config.routePreferences?.voice)?config.routePreferences.voice:'index_tts_local';
  startPreferredLocalTts(preferred);
  recoverRenderJobs().catch(error => console.error('[server] 渲染任务恢复失败', error));
  generationWorker.recover(job => job.type === 'generation').catch(error => console.error('[server] 生成任务恢复失败', error));
});

let shuttingDown = false;
let cleanupPromise;
const shutdown=signal=>{
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal}，正在关闭本地语音服务`);
  stopLocalTtsServices({force:true});
  const close = () => {
    cleanupPromise ||= Promise.allSettled([closeStoreBackend(), closeJobsBackend()]);
    void cleanupPromise.then(() => process.exit(0));
  };
  server.close(() => { void close(); });
  setTimeout(() => { void close(); }, 3000).unref();
};
process.once('SIGINT',()=>shutdown('SIGINT'));
process.once('SIGTERM',()=>shutdown('SIGTERM'));
