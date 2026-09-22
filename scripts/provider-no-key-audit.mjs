import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-provider-no-key-'));
const credentialNames = [
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DASHSCOPE_API_KEY', 'DEEPSEEK_API_KEY',
  'GEMINI_API_KEY', 'CUSTOM_OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'RUNWAY_API_KEY',
  'INDEXTTS_BASE_URL', 'F5TTS_BASE_URL'
];
const previous = Object.fromEntries(credentialNames.map(name => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
let fetchCalls = 0;

try {
  process.env.DATA_DIR = dataDir;
  process.env.MOCK_MODE = 'false';
  process.env.NODE_ENV = 'test';
  for (const name of credentialNames) delete process.env[name];
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('无密钥审计禁止任何外网请求');
  };

  const { runProvider } = await import(`../server/providers.mjs?provider-no-key-audit=${Date.now()}`);
  await assert.rejects(
    () => runProvider('story', {
      title: '无密钥边界审计',
      synopsis: '主角在停运码头发现一封没有寄件人的信，并决定沿着线索走进废弃灯塔。',
      type: '竖屏短剧',
      episodeLength: '60 秒',
      aspectRatio: '9:16'
    }, 'gpt-5.6'),
    error => {
      assert.equal(error.code, 'PROVIDER_NOT_CONFIGURED');
      assert.match(error.message, /OPENAI_API_KEY/);
      assert.doesNotMatch(error.message, /成功|已完成|模拟/);
      return true;
    }
  );
  assert.equal(fetchCalls, 0, '无密钥时不应发起供应商请求');
  console.log(JSON.stringify({ ok: true, code: 'PROVIDER_NOT_CONFIGURED', fetchCalls, mode: 'live', simulatedSuccess: false }));
} finally {
  globalThis.fetch = originalFetch;
  for (const name of credentialNames) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
  delete process.env.DATA_DIR;
  delete process.env.MOCK_MODE;
  delete process.env.NODE_ENV;
  await rm(dataDir, { recursive: true, force: true });
}
