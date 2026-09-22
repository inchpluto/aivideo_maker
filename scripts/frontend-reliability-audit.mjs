import assert from 'node:assert/strict';
import { generateTask, listServerProjects, syncProject } from '../src/workflow.js';

const store = new Map();
globalThis.localStorage = { setItem(key, value) { store.set(key, value); }, getItem(key) { return store.get(key) || null; } };
const originalFetch = globalThis.fetch;
let mode = 'conflict';
let seenSignal = null;

globalThis.fetch = async (url, options = {}) => {
  seenSignal = options.signal || null;
  if (mode === 'conflict') return new globalThis.Response(JSON.stringify({ error: '项目已被其他窗口更新', code: 'REVISION_CONFLICT', currentRevision: 7 }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  if (mode === 'abort') throw new globalThis.DOMException('The operation was aborted.', 'AbortError');
  if (mode === 'list') return new globalThis.Response(JSON.stringify({ projects: [{ id: 'p1' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  throw new Error(`unexpected mock mode for ${url}`);
};

const conflict = await syncProject({ id: 'p1', revision: 6, title: 'local draft' });
assert.equal(conflict.mode, 'conflict');
assert.equal(conflict.currentRevision, 7);
assert.equal(conflict.localStorage, true);

mode = 'abort';
const cancelled = await syncProject({ id: 'p1', revision: 7, title: 'cancel me' });
assert.equal(cancelled.mode, 'cancelled');
assert.equal(cancelled.cancelled, true);

mode = 'list';
const controller = new globalThis.AbortController();
const projects = await listServerProjects({ signal: controller.signal });
assert.deepEqual(projects, [{ id: 'p1' }]);
assert.equal(seenSignal, controller.signal);

mode = 'abort';
await assert.rejects(() => generateTask('story', { projectId: 'p1' }, { signal: controller.signal }), error => error?.name === 'AbortError');

globalThis.fetch = originalFetch;
console.log(JSON.stringify({ ok: true, conflict: true, localDraftPreserved: true, requestAbort: true, signalForwarded: true }));
