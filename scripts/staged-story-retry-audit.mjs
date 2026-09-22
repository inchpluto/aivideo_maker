import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
process.env.DATA_DIR = await mkdtemp(path.join(tmpdir(), 'xingmu-staged-retry-')); process.env.MOCK_MODE = 'true';
const { runStagedStory } = await import('../server/providers.mjs');
const payload = { title: '精准重试审计', synopsis: '每个章节都必须覆盖。', sourceText: `第一章\n${'甲'.repeat(75)}\n第二章\n${'乙'.repeat(75)}\n第三章\n最后事件。`, chunkMaxChars: 40, stagedStory: true, type: '短剧', episodeLength: 60, aspectRatio: '9:16' };
let partial = []; let failed = false;
try { await runStagedStory(payload, undefined, { failureAfterChunk: 1, onChunk: ({ results }) => { partial = results; } }); } catch (error) { failed = error.code === 'STAGED_STORY_INJECTED_FAILURE'; }
assert.equal(failed, true); assert.equal(partial.filter(Boolean).length, 1);
const resumedIndexes = []; const resumed = await runStagedStory(payload, undefined, { completedResults: partial, onChunk: ({ index }) => resumedIndexes.push(index) });
assert(resumedIndexes.length > 0); assert.equal(resumedIndexes[0], 1); assert(resumedIndexes.every(index => index > 0)); assert.equal(resumed.coveredChunkIds.length, resumed.chunkCount); assert.equal(resumed.stage, 'story-chunks');
await rm(process.env.DATA_DIR, { recursive: true, force: true }); console.log(JSON.stringify({ ok: true, injectedFailure: 'after-chunk-1', resumedFrom: 1, resumedCalls: resumedIndexes.length, chunks: resumed.chunkCount, covered: resumed.coveredChunkIds.length }));
