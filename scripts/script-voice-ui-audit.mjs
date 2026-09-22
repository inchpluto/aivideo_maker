import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
const voices=await readFile(new URL('../src/VoiceLibraryPanel.jsx',import.meta.url),'utf8');
const routes=await readFile(new URL('../src/useModelRoute.js',import.meta.url),'utf8');
const provider=await readFile(new URL('../server/providers.mjs',import.meta.url),'utf8');
const prompts=await readFile(new URL('../server/prompts.mjs',import.meta.url),'utf8');

assert.match(main,/aria-label="选择剧本生成模型"/);
assert.match(main,/生成内容已写入章节/);
assert.match(main,/setScriptTab\('章节全文'\)/);
assert.match(main,/ScriptChapterReader/);
assert.match(main,/continueScript\('context-repair'\)/);
assert.match(main,/generationMode==='auto'\?'full-draft'/);
assert.match(routes,/xingmu-provider-configured/);
assert.match(voices,/本地合成/);
assert.match(voices,/API 生成/);
assert.match(voices,/选择声音生成模型/);
assert.match(voices,/voice-import-preview/);
assert.doesNotMatch(voices,/sampleDuration<5|sampleDuration>10/);
assert.doesNotMatch(provider,/请先在语音库导入 5–10 秒/);
assert.match(prompts,/不得接收角色设定、场景说明或自然语言导演词/);
console.log(JSON.stringify({ok:true,checks:14},null,2));
