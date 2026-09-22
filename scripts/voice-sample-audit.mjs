import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-voice-sample-'));
const valid = path.join(root, 'valid.mp3');
const silent = path.join(root, 'silent.wav');
const short = path.join(root, 'short.mp3');
const make = (args, output) => { const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args, output], { encoding:'utf8' }); assert.equal(result.status, 0, result.stderr); };
make(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1'], valid);
make(['-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '1'], silent);
make(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2'], short);
process.env.DATA_DIR = path.join(root, 'data');
const { saveBinaryAsset } = await import('../server/store.mjs');
const { upsertVoice, listVoicePacks } = await import('../server/voiceLibrary.mjs');
try {
  const asset = await saveBinaryAsset({ buffer:await readFile(valid), contentType:'audio/mpeg', projectId:'voice-audit', kind:'voice-sample' });
  assert.equal(asset.probeStatus, 'passed'); assert(asset.sampleQuality?.maxVolumeDb > -55); assert(asset.mediaMetadata?.duration >= 0.5);
  await assert.rejects(async () => saveBinaryAsset({ buffer:await readFile(silent), contentType:'audio/wav', projectId:'voice-audit', kind:'voice-sample' }), error => error.code === 'VOICE_SAMPLE_INVALID' && /静音/.test(error.message));
  await assert.rejects(async () => saveBinaryAsset({ buffer:await readFile(short), contentType:'audio/mpeg', projectId:'voice-audit', kind:'voice-sample' }), error => error.code === 'VOICE_SAMPLE_INVALID' && /0.5/.test(error.message));
  const saved = await upsertVoice({ packId:'zh-cinematic', id:'voice-audit', name:'审计音色', sampleUrl:asset.url, sampleDuration:asset.mediaMetadata.duration, sampleMetadata:asset.mediaMetadata, sampleQuality:asset.sampleQuality, referenceText:'测试台词', sourceType:'licensed', rightsConfirmed:true, rightsNote:'审计授权记录' });
  const voice = (await listVoicePacks()).packs.flatMap(pack => pack.voices).find(item => item.id === 'voice-audit');
  assert.equal(saved.voice.status, 'ready'); assert.equal(voice.sourceType, 'licensed'); assert.equal(voice.rightsConfirmed, true); assert.equal(voice.referenceText, '测试台词'); assert(voice.sampleQuality?.maxVolumeDb > -55); assert(voice.sampleMetadata?.duration >= 0.5);
  console.log(JSON.stringify({ ok:true, validDuration:Number(asset.mediaMetadata.duration.toFixed(2)), maxVolumeDb:asset.sampleQuality.maxVolumeDb, rejected:['silent','too-short'], rightsRecorded:true }));
} finally { await rm(root, { recursive:true, force:true }); }
