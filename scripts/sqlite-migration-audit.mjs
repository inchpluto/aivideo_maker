import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSqliteRepository, importJsonStore } from '../server/sqliteRepository.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-sqlite-'));
const dataDir = path.join(root, 'json'); const jobsDir = path.join(dataDir, 'jobs'); const databaseFile = path.join(root, 'migration', 'xingmu.sqlite');
try {
  await mkdir(jobsDir, { recursive:true });
  await writeFile(path.join(dataDir, 'project-audit.json'), JSON.stringify({ id:'project-audit', revision:3, title:'迁移审计' }), 'utf8');
  await writeFile(path.join(jobsDir, 'job-audit.json'), JSON.stringify({ id:'job-audit', projectId:'project-audit', status:'SUCCEEDED', result:{ deliverable:'/api/render/project-audit/deliverable.mp4' } }), 'utf8');
  const result = await importJsonStore({ dataDir, databaseFile });
  assert.deepEqual(result.imported, { projects:1, jobs:1 }); assert.deepEqual(result.counts, { projects:1, jobs:1, assets:0 });
  const repository = await createSqliteRepository(databaseFile);
  repository.saveJob({ id:'job-idempotent-a', projectId:'project-audit', status:'PENDING', idempotencyKey:'same-input' });
  assert.deepEqual(repository.findJobByIdempotency('project-audit','same-input'), { id:'job-idempotent-a', projectId:'project-audit', status:'PENDING', idempotencyKey:'same-input' });
  repository.saveJob({ id:'job-idempotent-a', status:'RUNNING' });
  assert.equal(repository.readJob('job-idempotent-a').idempotencyKey,'same-input');
  assert.throws(() => repository.saveJob({ id:'job-idempotent-b', projectId:'project-audit', status:'PENDING', idempotencyKey:'same-input' }), /UNIQUE|constraint/i);
  repository.close();
  const sqlite = await import('node:sqlite'); const db = new sqlite.DatabaseSync(databaseFile);
  db.exec('BEGIN IMMEDIATE'); db.prepare('INSERT INTO projects(id, revision, payload, updated_at) VALUES(?, ?, ?, ?)').run('broken', 1, '{', new Date().toISOString());
  db.exec('ROLLBACK'); assert.equal(db.prepare('SELECT COUNT(*) AS count FROM projects WHERE id=?').get('broken').count, 0); db.close();
  assert.equal(JSON.parse(await readFile(path.join(dataDir, 'project-audit.json'), 'utf8')).revision, 3);
  console.log(JSON.stringify({ ok:true, imported:result.imported, counts:result.counts, rollback:'verified', sourceUntouched:true, idempotencyUnique:true, partialUpdatePreserved:true }));
} finally { await rm(root, { recursive:true, force:true }); }
