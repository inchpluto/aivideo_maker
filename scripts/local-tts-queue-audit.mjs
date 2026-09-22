import { createServer } from 'node:http';
import { withLocalTtsService, localTtsServiceStatus } from '../server/localTtsManager.mjs';

const envKeys = ['INDEXTTS_BASE_URL', 'INDEXTTS_URL', 'INDEXTTS_HEALTH', 'F5TTS_BASE_URL', 'F5TTS_URL', 'F5TTS_HEALTH', 'LOCAL_TTS_QUEUE_LIMIT', 'LOCAL_TTS_QUEUE_TIMEOUT_MS'];
const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const setEnv = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
const fail = message => { throw new Error(message); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (check, timeoutMs = 4000) => { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { if (await check()) return; await wait(20); } fail('等待本地 TTS 队列状态超时'); };

const service = createServer((request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ status: 'ready' })); });
try {
  await new Promise((resolve, reject) => { service.once('error', reject); service.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${service.address().port}`;
  setEnv('INDEXTTS_BASE_URL', base); setEnv('INDEXTTS_HEALTH', '/health');
  setEnv('F5TTS_BASE_URL', base); setEnv('F5TTS_HEALTH', '/health');
  setEnv('LOCAL_TTS_QUEUE_LIMIT', '2'); setEnv('LOCAL_TTS_QUEUE_TIMEOUT_MS', '5000');
  const order = []; let releaseFirst;
  const first = withLocalTtsService('index_tts_local', async () => { order.push('a:start'); await new Promise(resolve => { releaseFirst = resolve; }); order.push('a:end'); return 'a'; });
  await waitFor(async () => (await localTtsServiceStatus()).services.index_tts_local.queueRunning);
  const second = withLocalTtsService('index_tts_local', async () => { order.push('b:start'); await wait(20); order.push('b:end'); return 'b'; });
  let capacityError = '';
  try { await withLocalTtsService('index_tts_local', async () => 'c'); } catch (error) { capacityError = error.message; }
  if (!capacityError.includes('队列已满')) fail('超过容量的本地语音请求未被明确拒绝');
  await waitFor(async () => (await localTtsServiceStatus()).services.index_tts_local.queueWaiting === 1);
  releaseFirst();
  const values = await Promise.all([first, second]);
  if (values.join(',') !== 'a,b' || order.join(',') !== 'a:start,a:end,b:start,b:end') fail(`同引擎队列未按 FIFO 串行执行：${JSON.stringify({ values, order })}`);

  let releaseIndex;
  const indexTask = withLocalTtsService('index_tts_local', async () => { order.push('index:start'); await new Promise(resolve => { releaseIndex = resolve; }); order.push('index:end'); });
  await waitFor(async () => (await localTtsServiceStatus()).services.index_tts_local.queueRunning);
  const f5Task = withLocalTtsService('f5_tts_local', async () => { order.push('f5:start'); order.push('f5:end'); });
  await waitFor(async () => (await localTtsServiceStatus()).services.f5_tts_local.queueWaiting === 1);
  const during = await localTtsServiceStatus();
  if (during.inferenceLease !== 'index_tts_local' || during.services.f5_tts_local.queueRunning) fail('不同引擎没有共享显存互斥 lease');
  releaseIndex();
  await Promise.all([indexTask, f5Task]);
  if (order.slice(-4).join(',') !== 'index:start,index:end,f5:start,f5:end') fail(`不同引擎未在 lease 释放后串行执行：${order.join(',')}`);
  console.log(JSON.stringify({ ok: true, queueLimit: 2, fifo: true, capacityRejected: true, gpuLease: true, order }));
} finally {
  await new Promise(resolve => service.close(resolve));
  for (const key of envKeys) setEnv(key, previous[key]);
}
