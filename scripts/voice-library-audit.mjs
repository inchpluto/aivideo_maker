import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-voice-audit-'));
process.env.DATA_DIR = testDataDir;
const { findVoice, listVoicePacks, upsertVoice } = await import('../server/voiceLibrary.mjs');

const library=await listVoicePacks();
assert.equal(library.packs.length,2);
const chinese=library.packs.find(item=>item.id==='zh-cinematic');
const english=library.packs.find(item=>item.id==='en-cinematic');
assert.equal(chinese.engine,'index_tts_local');
assert.equal(chinese.language,'zh-CN');
assert.equal(english.engine,'f5_tts_local');
assert.equal(english.language,'en-US');
assert.ok(findVoice(library,'zh-young-calm'));
await assert.rejects(()=>upsertVoice({packId:'zh-cinematic',name:'未授权样音',sampleUrl:'/api/assets/voice-library/sample.wav',rightsConfirmed:false}),/授权/);

console.log(JSON.stringify({ok:true,packs:library.packs.length,voices:library.packs.reduce((sum,pack)=>sum+pack.voices.length,0),engines:[chinese.engine,english.engine]},null,2));
await rm(testDataDir, { recursive: true, force: true });
