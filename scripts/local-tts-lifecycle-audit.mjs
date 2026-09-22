import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureLocalTtsService, localTtsServiceStatus, stopLocalTtsServices, waitForLocalTtsStop, withLocalTtsService } from '../server/localTtsManager.mjs';

const envKeys = ['INDEXTTS_BASE_URL', 'INDEXTTS_URL', 'INDEXTTS_PORT', 'INDEXTTS_HEALTH', 'INDEXTTS_PYTHON', 'INDEXTTS_BRIDGE', 'INDEXTTS_CWD', 'F5TTS_BASE_URL', 'F5TTS_URL', 'F5TTS_PORT', 'F5TTS_HEALTH', 'F5TTS_PYTHON', 'F5TTS_APP'];
const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const setEnv = (key, value) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; };
const fail = message => { throw new Error(message); };
const reservePort = async () => {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
};
const waitFor = async (check, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  fail('等待临时假引擎状态超时');
};

const tempRoot = await mkdtemp(path.join(tmpdir(), 'xingmu-tts-lifecycle-'));
const bridge = path.join(tempRoot, 'fake-tts.mjs');
const pidFile = path.join(tempRoot, 'pids.txt');
const fakeSource = `import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
appendFileSync(process.env.FAKE_TTS_PID_FILE, String(process.pid) + '\\n');
const server = createServer((request, response) => { response.writeHead(request.url === '/health' ? 200 : 404, {'Content-Type':'application/json'}); response.end(JSON.stringify({status:'ready'})); });
server.listen(port, '127.0.0.1');`;
await writeFile(bridge, fakeSource, 'utf8');

let externalServer;
try {
  const port = await reservePort();
  setEnv('INDEXTTS_BASE_URL', `http://127.0.0.1:${port}`);
  setEnv('INDEXTTS_HEALTH', '/health');
  setEnv('INDEXTTS_PORT', String(port));
  setEnv('INDEXTTS_PYTHON', process.execPath);
  setEnv('INDEXTTS_BRIDGE', bridge);
  setEnv('INDEXTTS_CWD', tempRoot);
  setEnv('FAKE_TTS_PID_FILE', pidFile);
  setEnv('F5TTS_BASE_URL', 'http://127.0.0.1:1');
  setEnv('F5TTS_HEALTH', '/health');
  delete process.env.F5TTS_PYTHON;
  delete process.env.F5TTS_APP;

  const [first, second] = await Promise.all([ensureLocalTtsService('index_tts_local'), ensureLocalTtsService('index_tts_local')]);
  const pids = (await readFile(pidFile, 'utf8')).trim().split(/\r?\n/).filter(Boolean);
  if (pids.length !== 1 || first.pid !== second.pid || !first.startToken || first.startToken !== second.startToken) fail(`同引擎并发启动未合并为单一托管进程：${JSON.stringify({ pids, first, second })}`);

  let release;
  const held = withLocalTtsService('index_tts_local', () => new Promise(resolve => { release = resolve; }));
  await waitFor(async () => (await localTtsServiceStatus()).services.index_tts_local.activeRequests === 1);
  const busyStop = stopLocalTtsServices();
  if (busyStop.stopped || busyStop.reason !== 'busy') fail('正在推理时未拒绝停止托管进程');
  let switchError = '';
  try { await ensureLocalTtsService('f5_tts_local', { waitMs: 0 }); } catch (error) { switchError = error.message; }
  if (!switchError.includes('仍由本项目托管运行中') || (await localTtsServiceStatus()).activePid !== first.pid) fail('切换引擎时错误终止了当前托管进程');
  release();
  await held;
  const stopped = stopLocalTtsServices();
  if (!stopped.stopped || stopped.pid !== first.pid) fail('显式停止未只停止当前托管进程');
  await waitForLocalTtsStop();

  externalServer = createServer((request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ status: 'ready' })); });
  await new Promise((resolve, reject) => { externalServer.once('error', reject); externalServer.listen(0, '127.0.0.1', resolve); });
  const externalPort = externalServer.address().port;
  setEnv('INDEXTTS_BASE_URL', `http://127.0.0.1:${externalPort}`);
  setEnv('INDEXTTS_PORT', String(externalPort));
  const beforeExternalStop = await localTtsServiceStatus();
  const externalStop = stopLocalTtsServices();
  const afterExternalStop = await localTtsServiceStatus();
  if (!beforeExternalStop.services.index_tts_local.ready || externalStop.stopped || !afterExternalStop.services.index_tts_local.ready) fail('停止托管服务时影响了外部已启动服务');
  console.log(JSON.stringify({ ok: true, pid: first.pid, startToken: first.startToken, spawnedPids: pids.length, busyStop: busyStop.reason, switchProtected: true, externalProtected: true }));
} finally {
  if (externalServer) await new Promise(resolve => externalServer.close(resolve));
  stopLocalTtsServices({ force: true });
  await waitForLocalTtsStop();
  for (const key of envKeys) setEnv(key, previous[key]);
  delete process.env.FAKE_TTS_PID_FILE;
  await rm(tempRoot, { recursive: true, force: true });
}
