import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureLocalTtsService, stopLocalTtsServices } from '../server/localTtsManager.mjs';

const envKeys = ['INDEXTTS_BASE_URL', 'INDEXTTS_HEALTH', 'INDEXTTS_PYTHON', 'INDEXTTS_BRIDGE', 'INDEXTTS_PORT'];
const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const setEnv = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
const root = await mkdtemp(path.join(tmpdir(), 'xingmu-tts-start-error-'));
const failingBridge = path.join(root, 'failing.mjs');
await writeFile(failingBridge, "console.error('CUDA out of memory'); process.exit(1);", 'utf8');
try {
  setEnv('INDEXTTS_BASE_URL', 'http://127.0.0.1:1'); setEnv('INDEXTTS_HEALTH', '/health'); setEnv('INDEXTTS_PORT', '1');
  delete process.env.INDEXTTS_PYTHON; delete process.env.INDEXTTS_BRIDGE;
  await assert.rejects(() => ensureLocalTtsService('index_tts_local', { waitMs:100 }), error => error.code === 'LOCAL_TTS_START_FAILED' && /未配置托管 Python/.test(error.message));
  setEnv('INDEXTTS_PYTHON', process.execPath); setEnv('INDEXTTS_BRIDGE', failingBridge);
  await assert.rejects(() => ensureLocalTtsService('index_tts_local', { waitMs:3000 }), error => error.code === 'LOCAL_TTS_START_FAILED' && /CUDA\/显存/.test(error.message));
  console.log(JSON.stringify({ ok:true, missingPython:'LOCAL_TTS_START_FAILED', cuda:'classified', editorUnaffected:true }));
} finally {
  stopLocalTtsServices({ force:true });
  for (const key of envKeys) setEnv(key, previous[key]);
  await rm(root, { recursive:true, force:true });
}
