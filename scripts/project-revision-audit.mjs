import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-revision-audit-'));
process.env.DATA_DIR = dataDir;
const { readProject, saveProject } = await import('../server/store.mjs');
const first = await saveProject({ id: 'project-revision', title: 'one' });
assert.equal(first.revision, 1);
const second = await saveProject({ id: first.id, title: 'two', revision: first.revision });
assert.equal(second.revision, 2);
await assert.rejects(() => saveProject({ id: first.id, title: 'stale', revision: first.revision }), error => error.code === 'REVISION_CONFLICT' && error.currentRevision === 2);
assert.equal((await readProject(first.id)).title, 'two');
await saveProject({ id: 'legacy-project', title: 'legacy payload' });
const legacy = await readProject('legacy-project');
assert.equal(legacy.revision, 1);
await rm(dataDir, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, revisions: [first.revision, second.revision], staleWrite: 'rejected', legacyMigrated: legacy.revision === 1 }));
