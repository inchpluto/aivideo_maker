import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const loadSqlite = async () => {
  try { return (await import('node:sqlite')).DatabaseSync; }
  catch { throw Object.assign(new Error('当前 Node 运行时没有 node:sqlite，暂不切换 SQLite 存储。'), { code: 'SQLITE_DRIVER_UNAVAILABLE' }); }
};

export async function createSqliteRepository(file) {
  const DatabaseSync = await loadSqlite();
  await mkdir(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, project_id TEXT, status TEXT NOT NULL, payload TEXT NOT NULL, idempotency_key TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);`);
  const jobColumns = db.prepare('PRAGMA table_info(jobs)').all().map(column => column.name);
  if (!jobColumns.includes('idempotency_key')) db.exec("ALTER TABLE jobs ADD COLUMN idempotency_key TEXT NOT NULL DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS jobs_project_idempotency_key ON jobs(project_id, idempotency_key) WHERE idempotency_key <> ''");
  const projectUpsert = db.prepare('INSERT INTO projects(id, revision, payload, updated_at) VALUES(?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, payload=excluded.payload, updated_at=excluded.updated_at');
  const jobUpsert = db.prepare('INSERT INTO jobs(id, project_id, status, payload, idempotency_key, updated_at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, status=excluded.status, payload=excluded.payload, idempotency_key=excluded.idempotency_key, updated_at=excluded.updated_at');
  const assetUpsert = db.prepare('INSERT INTO assets(id, project_id, payload, created_at) VALUES(?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, payload=excluded.payload');
  return {
    db,
    saveProject(project) { const now = new Date().toISOString(); projectUpsert.run(String(project.id), Number(project.revision || 1), JSON.stringify(project), now); return project; },
    readProject(id) { const row = db.prepare('SELECT payload FROM projects WHERE id=?').get(String(id)); return row ? JSON.parse(row.payload) : null; },
    saveJob(job) { const id=String(job.id || job.taskId); const existingRow=db.prepare('SELECT payload FROM jobs WHERE id=?').get(id); const next={...(existingRow?JSON.parse(existingRow.payload):{}),...job,id}; const now = new Date().toISOString(); jobUpsert.run(id, String(next.projectId || ''), String(next.status || 'PENDING'), JSON.stringify(next), String(next.idempotencyKey || ''), now); return next; },
    readJob(id) { const row = db.prepare('SELECT payload FROM jobs WHERE id=?').get(String(id)); return row ? JSON.parse(row.payload) : null; },
    findJobByIdempotency(projectId, idempotencyKey) { const row=db.prepare('SELECT payload FROM jobs WHERE project_id=? AND idempotency_key=? LIMIT 1').get(String(projectId || ''),String(idempotencyKey || '')); return row ? JSON.parse(row.payload) : null; },
    saveAsset(asset) { const now = new Date().toISOString(); assetUpsert.run(String(asset.id), String(asset.projectId || 'shared'), JSON.stringify(asset), now); return asset; },
    counts() { return { projects: db.prepare('SELECT COUNT(*) AS count FROM projects').get().count, jobs: db.prepare('SELECT COUNT(*) AS count FROM jobs').get().count, assets: db.prepare('SELECT COUNT(*) AS count FROM assets').get().count }; },
    close() { db.close(); },
  };
}

export async function importJsonStore({ dataDir, databaseFile }) {
  const repository = await createSqliteRepository(databaseFile);
  const projectFiles = (await readdir(dataDir).catch(() => [])).filter(name => /^project-[a-zA-Z0-9_-]+\.json$/.test(name));
  const jobsDir = path.join(dataDir, 'jobs');
  const jobFiles = (await readdir(jobsDir).catch(() => [])).filter(name => name.endsWith('.json'));
  try {
    repository.db.exec('BEGIN IMMEDIATE');
    for (const name of projectFiles) repository.saveProject(JSON.parse(await readFile(path.join(dataDir, name), 'utf8')));
    for (const name of jobFiles) repository.saveJob(JSON.parse(await readFile(path.join(jobsDir, name), 'utf8')));
    repository.db.exec('COMMIT');
    return { imported: { projects: projectFiles.length, jobs: jobFiles.length }, counts: repository.counts() };
  } catch (error) {
    repository.db.exec('ROLLBACK');
    throw error;
  } finally { repository.close(); }
}
