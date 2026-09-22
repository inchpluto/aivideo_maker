import assert from 'node:assert/strict';

const clips = [{ id: 'a', start: 0, duration: 2 }, { id: 'b', start: 2, duration: 3 }, { id: 'c', start: 5, duration: 1 }];
const jump = (selected, delta) => { const ordered = [...clips].sort((a, b) => a.start - b.start); const current = Math.max(0, ordered.findIndex(item => item.id === selected)); return ordered[Math.max(0, Math.min(ordered.length - 1, current + (delta < 0 ? -1 : 1)))]; };
assert.equal(jump('b', -1).id, 'a');
assert.equal(jump('b', 1).id, 'c');
assert.equal(jump('a', -1).id, 'a');
assert.equal(jump('c', 1).id, 'c');
console.log(JSON.stringify({ ok: true, previous: 'a', next: 'c', boundaries: 'clamped' }));
