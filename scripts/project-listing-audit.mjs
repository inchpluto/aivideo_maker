import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = await mkdtemp(path.join(tmpdir(), 'xingmu-project-listing-'));
process.env.DATA_DIR = dataDir;
const { saveProject, listProjects } = await import('../server/store.mjs');
try {
  await saveProject({ id: 'imported-legacy-20260906', title: '旧项目可见性夹具', type: 'AI 视频', timeline: [], shots: [], settings: { aspectRatio: '16:9', fps: 25 } });
  const projects = await listProjects();
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, 'imported-legacy-20260906');
  console.log(JSON.stringify({ ok: true, arbitraryValidIdListed: true, projects: projects.length }));
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
