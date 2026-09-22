import { createServer } from 'node:http';
import { localTtsConfiguration, localTtsServiceStatus } from '../server/localTtsManager.mjs';

const envKeys = ['INDEXTTS_BASE_URL', 'INDEXTTS_URL', 'INDEXTTS_PORT', 'INDEXTTS_HEALTH', 'INDEXTTS_PYTHON', 'INDEXTTS_ROOT', 'INDEXTTS_MODEL_DIR', 'F5TTS_BASE_URL', 'F5TTS_URL', 'F5TTS_PORT', 'F5TTS_HEALTH', 'F5TTS_PYTHON', 'F5TTS_APP', 'F5TTS_CWD', 'LOCAL_TTS_AUTOSTART'];
const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const setEnv = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
const fail = message => { throw new Error(message); };

const server = createServer((request, response) => {
  if (request.url !== '/health') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ status: 'ready', engine: 'fake-local-tts' }));
});

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  setEnv('INDEXTTS_BASE_URL', base);
  setEnv('INDEXTTS_URL', undefined);
  setEnv('INDEXTTS_PORT', String(address.port));
  setEnv('INDEXTTS_HEALTH', '/health');
  setEnv('INDEXTTS_PYTHON', 'C:\\temporary\\index-python.exe');
  setEnv('INDEXTTS_ROOT', 'C:\\temporary\\index-root');
  setEnv('INDEXTTS_MODEL_DIR', 'C:\\temporary\\index-models');
  setEnv('F5TTS_BASE_URL', base);
  setEnv('F5TTS_URL', undefined);
  setEnv('F5TTS_HEALTH', '/health');
  setEnv('F5TTS_PORT', String(address.port));
  setEnv('F5TTS_PYTHON', 'C:\\temporary\\f5-python.exe');
  setEnv('F5TTS_APP', 'C:\\temporary\\f5-app.py');
  setEnv('LOCAL_TTS_AUTOSTART', undefined);

  const index = localTtsConfiguration('index_tts_local');
  const f5 = localTtsConfiguration('f5_tts_local');
  if (index.base !== base || index.health !== '/health' || index.port !== String(address.port)) fail('IndexTTS 配置未从项目环境变量读取');
  if (f5.base !== base || f5.health !== '/health' || f5.port !== String(address.port)) fail('F5-TTS 配置未从项目环境变量读取');
  if (!index.managedStartConfigured || !f5.managedStartConfigured) fail('托管启动配置判断错误');
  if ([index, f5].some(item => JSON.stringify(item).includes('deepseekharness') || JSON.stringify(item).includes('.zcode'))) fail('本地 TTS 配置仍包含用户目录硬编码');

  const status = await localTtsServiceStatus();
  if (!status.services.index_tts_local.ready || !status.services.f5_tts_local.ready) fail('临时本地 TTS 健康探针未通过');
  if (status.services.index_tts_local.base !== base || status.services.f5_tts_local.base !== base) fail('服务状态未返回实际配置地址');
  console.log(JSON.stringify({ ok: true, base, engines: Object.keys(status.services), autostartDefault: process.env.LOCAL_TTS_AUTOSTART === 'true' }));
} finally {
  await new Promise(resolve => server.close(resolve));
  for (const key of envKeys) setEnv(key, previous[key]);
}
