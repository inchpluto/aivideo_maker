import assert from 'node:assert/strict';
import { buildSourceChunkPlan } from '../server/sourceChunks.mjs';
const text = `第一章\n${'甲'.repeat(125000)}\n第二章\n${'乙'.repeat(125000)}\n第三章\n最后一章的重要事件：灯塔重新点亮。`;
const plan = buildSourceChunkPlan(text, { maxChars: 50000, overlapChars: 500 });
assert.equal(plan.chapterCount, 3); assert(plan.chunkCount > 6); assert(plan.chunks.some(item => item.chapterId === 'chapter-003' && item.hasChapterEnd));
assert.equal(new Set(plan.chunks.map(item => item.id)).size, plan.chunkCount); assert(plan.chunks.every(item => item.sourceEnd > item.sourceStart && item.textHash.length === 64));
assert.equal(plan.sourceHash.length, 64); assert(plan.coveredChars >= 250000); console.log(JSON.stringify({ ok: true, chapters: plan.chapterCount, chunks: plan.chunkCount, lastChapterCovered: true }));
