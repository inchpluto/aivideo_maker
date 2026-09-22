import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from './fileCoordinator.mjs';

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const configPath = path.join(dataDir, '.provider-config.json');

export const providerFields = {
  openai: { label: 'OpenAI', fields: ['OPENAI_API_KEY'], testUrl: 'https://api.openai.com/v1/models' },
  anthropic: { label: 'Anthropic', fields: ['ANTHROPIC_API_KEY'], testUrl: 'https://api.anthropic.com/v1/models' },
  deepseek: { label: 'DeepSeek', fields: ['DEEPSEEK_API_KEY'], testUrl: 'https://api.deepseek.com/models' },
  customOpenai: { label: '自定义 OpenAI 兼容', fields: ['CUSTOM_OPENAI_API_KEY', 'CUSTOM_OPENAI_BASE_URL', 'CUSTOM_OPENAI_MODEL', 'CUSTOM_OPENAI_IMAGE_MODEL'], testUrl: '' },
  dashscope: { label: '阿里云百炼', fields: ['DASHSCOPE_API_KEY', 'DASHSCOPE_BASE_URL'], testUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models' },
  gemini: { label: 'Google Gemini', fields: ['GEMINI_API_KEY'], testUrl: 'https://generativelanguage.googleapis.com/v1beta/models' },
  elevenlabs: { label: 'ElevenLabs', fields: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'], testUrl: 'https://api.elevenlabs.io/v1/models' },
  indexTts: { label: 'IndexTTS 本地中文', fields: ['INDEXTTS_BASE_URL'], testUrl: '', defaultUrl:'http://127.0.0.1:7860' },
  f5Tts: { label: 'F5-TTS 本地英文', fields: ['F5TTS_BASE_URL'], testUrl: '', defaultUrl:'http://127.0.0.1:7862' },
  runway: { label: 'Runway', fields: ['RUNWAY_API_KEY'], testUrl: 'https://api.dev.runwayml.com/v1/organization' }
};

const allowedFields = new Set(Object.values(providerFields).flatMap(item => item.fields));
const allowedRouteTasks = new Set(['story','character','prop','environment','keyframe','voice','video','editing']);
let runtimeCache;

async function persistRuntime(next) {
  next.updatedAt = new Date().toISOString();
  await mkdir(dataDir, { recursive: true });
  const temporary = `${configPath}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, configPath);
  runtimeCache = next;
}

async function readRuntime({ fresh = false } = {}) {
  if (runtimeCache && !fresh) return runtimeCache;
  try { runtimeCache = JSON.parse(await readFile(configPath, 'utf8')); }
  catch { runtimeCache = { values: {}, updatedAt: null }; }
  runtimeCache.values ||= {};
  return runtimeCache;
}

async function withRuntimeWrite(update) {
  return withFileLock(`${configPath}.lock`, async () => {
    const runtime = await readRuntime({ fresh: true });
    const next = await update(runtime);
    await persistRuntime(next);
    return next;
  });
}

export async function getConfigValue(name) {
  const runtime = await readRuntime({ fresh: true });
  return runtime.values[name] || process.env[name] || '';
}

export async function isLiveMode() {
  const runtime = await readRuntime({ fresh: true });
  if (typeof runtime.liveMode === 'boolean') return runtime.liveMode;
  return process.env.MOCK_MODE !== 'true';
}

export async function publicProviderConfig() {
  const runtime = await readRuntime({ fresh: true });
  const providers = {};
  for (const [id, definition] of Object.entries(providerFields)) {
    const fields = {};
    for (const field of definition.fields) {
      const value = runtime.values[field] || process.env[field] || (field.endsWith('BASE_URL') ? definition.defaultUrl || '' : '');
      fields[field] = {
        configured: Boolean(value),
        masked: value ? `${value.slice(0, Math.min(4, value.length))}${'•'.repeat(Math.min(8, Math.max(4, value.length - 4)))}` : '',
        value: field.endsWith('BASE_URL') || field.endsWith('VOICE_ID') ? value : ''
      };
    }
    const keyFields=definition.fields.filter(field=>field.endsWith('API_KEY'));const configured = keyFields.length?keyFields.some(field=>Boolean(runtime.values[field]||process.env[field])):definition.fields.some(field=>field.endsWith('BASE_URL')&&Boolean(runtime.values[field]||process.env[field]||definition.defaultUrl));
    const verification = runtime.verification?.[id] || null;
    providers[id] = { id, label: definition.label, connected: configured, configured, verified: configured && verification?.status === 'verified', connectionStatus: !configured ? 'missing' : verification?.status === 'verified' ? 'verified' : verification?.status === 'failed' ? 'failed' : 'unverified', verifiedAt: verification?.checkedAt || null, verificationError: verification?.error || '', fields };
  }
  return { liveMode: await isLiveMode(), providers, routePreferences: runtime.routePreferences || {}, updatedAt: runtime.updatedAt };
}

export async function updateProviderConfig(input = {}) {
  await withRuntimeWrite(runtime => {
    const next = { ...runtime, values: { ...runtime.values }, verification: { ...(runtime.verification || {}) } };
    let credentialsChanged = false;
    if (typeof input.liveMode === 'boolean') next.liveMode = input.liveMode;
    if (input.routePreferences && typeof input.routePreferences === 'object') {
      next.routePreferences = { ...(runtime.routePreferences || {}) };
      for (const [task, routeId] of Object.entries(input.routePreferences)) {
        if (allowedRouteTasks.has(task) && /^[a-z0-9._-]{2,80}$/i.test(String(routeId || ''))) next.routePreferences[task] = String(routeId);
      }
    }
    for (const [name, value] of Object.entries(input.values || {})) {
      if (!allowedFields.has(name)) continue;
      const owner = Object.entries(providerFields).find(([,definition])=>definition.fields.includes(name))?.[0];
      if (value === null) { delete next.values[name]; credentialsChanged = true; }
      else if (String(value).trim()) { next.values[name] = String(value).trim(); credentialsChanged = true; }
      if (owner) delete next.verification[owner];
    }
    if (credentialsChanged) next.routeExecutions = {};
    return next;
  });
  return publicProviderConfig();
}

export async function publicRouteExecutions() {
  const runtime = await readRuntime({ fresh: true });
  return runtime.routeExecutions || {};
}

export async function recordRouteExecution({ task, routeId, provider, model }) {
  if (!task || !routeId) return;
  const key = `${task}:${routeId}`;
  await withRuntimeWrite(runtime => ({ ...runtime, routeExecutions: { ...(runtime.routeExecutions || {}), [key]: { status:'succeeded', task, routeId, provider, model, succeededAt:new Date().toISOString() } } }));
}

export async function testProviderConnection(providerId) {
  const definition = providerFields[providerId];
  if (!definition) throw new Error('未知供应商。');
  const values = Object.fromEntries(await Promise.all(definition.fields.map(async field => [field, await getConfigValue(field)])));
  const keyField = definition.fields.find(field => field.endsWith('API_KEY'));
  if (keyField && !values[keyField]) throw new Error(`请先填写 ${keyField}。`);
  let url = definition.testUrl;
  let localError = '';
  const headers = { Accept: 'application/json' };
  if (providerId === 'openai' || providerId === 'deepseek' || providerId === 'dashscope' || providerId === 'customOpenai') headers.Authorization = `Bearer ${values[keyField]}`;
  if (providerId === 'anthropic') { headers['x-api-key'] = values[keyField]; headers['anthropic-version'] = '2023-06-01'; }
  if (providerId === 'gemini') url += `?key=${encodeURIComponent(values[keyField])}`;
  if (providerId === 'elevenlabs') headers['xi-api-key'] = values[keyField];
  if (providerId === 'runway') { headers.Authorization = `Bearer ${values[keyField]}`; headers['X-Runway-Version'] = '2024-11-06'; }
  if (providerId === 'dashscope' && values.DASHSCOPE_BASE_URL) url = `${values.DASHSCOPE_BASE_URL.replace(/\/$/, '')}/models`;
  if (providerId === 'customOpenai') { const base = String(values.CUSTOM_OPENAI_BASE_URL || '').trim().replace(/\/+$/, ''); if (!base) throw new Error('请先填写 CUSTOM_OPENAI_BASE_URL（兼容接口地址）。'); url = `${base}/models`; }
  if (providerId === 'indexTts' || providerId === 'f5Tts') {
    const field=providerId==='indexTts'?'INDEXTTS_BASE_URL':'F5TTS_BASE_URL';
    const base=String(values[field]||definition.defaultUrl||'').trim().replace(/\/+$/,'');
    if(!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(base))throw new Error('本地 TTS 地址仅允许 127.0.0.1 或 localhost。');
    const candidates=providerId==='f5Tts'?['/api/status','/health']:['/health','/gradio_api/info','/config'];
    let lastError='服务未启动';
    for(const endpoint of candidates){
      try{
        const response=await fetch(`${base}${endpoint}`,{headers,signal:AbortSignal.timeout(5000)});
        if(!response.ok){lastError=`${endpoint} 返回 HTTP ${response.status}`;continue}
        const data=await response.json().catch(()=>({}));
        if(providerId==='f5Tts'&&endpoint==='/api/status'&&data.status!=='ready')throw new Error(data.message||`模型状态：${data.status||'未知'}`);
        lastError='';break;
      }catch(error){lastError=error.message||'连接失败'}
    }
    if(lastError)localError=`${definition.label} 未就绪：${lastError}`;
    url='';
  }
  const checkedAt = new Date().toISOString();
  try {
    if(localError)throw new Error(localError);
    const response = url ? await fetch(url, { headers, signal: AbortSignal.timeout(15000) }) : { ok:true, status:200, text:async()=>'' };
    if (!response.ok) throw new Error(`${definition.label} 验证失败（HTTP ${response.status}）：${(await response.text()).slice(0, 280)}`);
    await withRuntimeWrite(runtime => ({ ...runtime, verification: { ...(runtime.verification || {}), [providerId]: { status: 'verified', checkedAt, error: '' } } }));
    return { ok: true, provider: providerId, label: definition.label, checkedAt };
  } catch (error) {
    await withRuntimeWrite(runtime => ({ ...runtime, verification: { ...(runtime.verification || {}), [providerId]: { status: 'failed', checkedAt, error: String(error.message || error).slice(0, 280) } } }));
    throw error;
  }
}
