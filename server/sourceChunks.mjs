import { createHash } from 'node:crypto';

export const normalized = value => String(value || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const hash = value => createHash('sha256').update(String(value), 'utf8').digest('hex');

export function buildSourceChunkPlan(text, { maxChars = 120000, overlapChars = 1200 } = {}) {
  const source = normalized(text); const chapters = []; const marker = /^(第[零一二三四五六七八九十百千\d]+[章节回幕卷]|chapter\s+\d+)[^\n]*$/gim; const matches = [...source.matchAll(marker)];
  if (matches.length) matches.forEach((match, index) => chapters.push({ id: `chapter-${String(index + 1).padStart(3, '0')}`, title: match[0].trim(), start: match.index + match[0].length, end: matches[index + 1]?.index ?? source.length }));
  else chapters.push({ id: 'chapter-001', title: '第一章', start: 0, end: source.length });
  const chunks = [];
  for (const chapter of chapters) {
    const content = source.slice(chapter.start, chapter.end).trim(); if (!content) continue;
    let cursor = 0; let part = 0;
    while (cursor < content.length) {
      const end = Math.min(content.length, cursor + maxChars); const value = content.slice(cursor, end);
      chunks.push({ id: `${chapter.id}-chunk-${String(++part).padStart(3, '0')}`, chapterId: chapter.id, sourceStart: chapter.start + cursor, sourceEnd: chapter.start + end, chars: value.length, textHash: hash(value), hasChapterStart: cursor === 0, hasChapterEnd: end === content.length });
      if (end >= content.length) break;
      cursor = Math.max(cursor + 1, end - Math.min(overlapChars, Math.floor(maxChars / 4)));
    }
  }
  return { version: '1.0.0', sourceChars: source.length, maxChars, overlapChars, chapterCount: chapters.length, chunkCount: chunks.length, chapters: chapters.map(item => ({ id: item.id, title: item.title, sourceStart: item.start, sourceEnd: item.end })), chunks, coveredChars: chunks.reduce((sum, item) => sum + item.chars, 0), sourceHash: hash(source) };
}
