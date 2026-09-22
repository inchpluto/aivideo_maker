import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/AssistantWorkflow.jsx',import.meta.url),'utf8');
assert.match(source,/useModelRoute\('story'\)/);
assert.match(source,/useModelRoute\('voice'\)/);
assert.match(source,/task\.task === 'voice' \? voiceRoute : storyRoute/);
assert.match(source,/referenceAudio: character\.voiceReferenceUrl/);
assert.match(source,/rightsConfirmed: Boolean\(character\.voiceRightsConfirmed\)/);
assert.match(source,/runAutomatic\(task\)/);
assert.match(source,/结果自动写回项目/);
assert.doesNotMatch(source,/用 DeepSeek 一键补全|DeepSeek 未配置|由 DeepSeek 实时生成/);
console.log(JSON.stringify({ok:true,checks:8},null,2));
