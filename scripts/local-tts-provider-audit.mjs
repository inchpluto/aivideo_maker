import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-tts-provider-'));
const referenceFile = path.join(dataDir, 'reference.wav');
const outputFile = path.join(dataDir, 'generated.wav');
const generated = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.8', '-c:a', 'pcm_s16le', '-ar', '16000', '-ac', '1', referenceFile], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const outputBytes = await readFile(referenceFile);
const requests = [];
const service = createServer(async (request, response) => {
  requests.push(request.url);
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true, status: 'ready', engine: 'f5-tts' }));
    return;
  }
  if (request.url === '/api/status') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'bridge exposes /health' }));
    return;
  }
  if (request.url === '/api/tts' && request.method === 'POST') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(payload.engine, 'f5-tts');
    assert.equal(payload.language, 'en-US');
    assert.match(payload.referenceAudio, /^data:audio\/wav;base64,/);
    assert.equal(payload.referenceText, 'The harbor is quiet.');
    assert.equal(payload.text, 'The harbor is quiet tonight.');
    response.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': outputBytes.length });
    response.end(outputBytes);
    return;
  }
  response.writeHead(404);
  response.end();
});

try {
  await new Promise((resolve, reject) => { service.once('error', reject); service.listen(0, '127.0.0.1', resolve); });
  const port = service.address().port;
  process.env.DATA_DIR = dataDir;
  process.env.MOCK_MODE = 'false';
  delete process.env.NODE_ENV;
  process.env.F5TTS_BASE_URL = `http://127.0.0.1:${port}`;
  delete process.env.F5TTS_HEALTH;
  delete process.env.F5TTS_PYTHON;
  delete process.env.F5TTS_APP;
  const { saveAsset, saveBinaryAsset } = await import('../server/store.mjs');
  const { localTtsServiceStatus } = await import('../server/localTtsManager.mjs');
  const { publicProviders, runProvider } = await import('../server/providers.mjs');
  const reference = await saveBinaryAsset({ buffer: await readFile(referenceFile), contentType: 'audio/wav', projectId: 'tts-provider-audit', kind: 'voice-reference' });
  assert.equal(reference.probeStatus, 'passed');

  const status = await localTtsServiceStatus();
  assert.equal(status.services.f5_tts_local.ready, true);
  assert.equal(status.services.f5_tts_local.healthEndpoint, '/health');

  const response = await runProvider('voice', {
    projectId: 'tts-provider-audit',
    scene: 'The harbor at night',
    language: 'en-US',
    originalText: 'The harbor is quiet tonight.',
    text: 'The harbor is quiet tonight.',
    referenceAudio: reference.url,
    referenceText: 'The harbor is quiet.',
    rightsConfirmed: true,
    emotion: 'calm',
    voiceSettings: { autoEmotion: false, speed: 1 }
  }, 'f5_tts_local');
  assert.equal(response.mode, 'live');
  assert.equal(response.result.contentType, 'audio/wav');
  const generatedBytes = Buffer.from(response.result.audioBase64, 'base64');
  assert.deepEqual(generatedBytes, outputBytes);
  const generatedAsset = await saveAsset({ base64: response.result.audioBase64, contentType: response.result.contentType, projectId: 'tts-provider-audit', kind: 'voice-generated', assetKey: 'line-1' });
  assert.equal(generatedAsset.probeStatus, 'passed');
  assert.ok(generatedAsset.mediaMetadata.duration > 0.5);
  const providers = await publicProviders();
  assert.equal(providers.voice.options.find(item => item.id === 'f5_tts_local').executed, true);
  assert.equal(requests.filter(item => item === '/api/tts').length, 1);
  console.log(JSON.stringify({ ok: true, engine: 'f5_tts_local', fallbackHealth: '/health', mode: response.mode, inputReference: reference.url, generatedAsset: generatedAsset.url, generatedBytes: generatedBytes.length, duration: Number(generatedAsset.mediaMetadata.duration.toFixed(2)), apiTtsCalls: requests.filter(item => item === '/api/tts').length }));
} finally {
  await new Promise(resolve => service.close(resolve));
  await rm(dataDir, { recursive: true, force: true });
}
