import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createReleasePackage } from './create-release-package.mjs';

const root = process.cwd();
const sandbox = await mkdtemp(path.join(os.tmpdir(), 'xingmu-release-package-'));
const releaseRoot = path.join(sandbox, 'release');
const run = (command, args) => {
  const options = { cwd: releaseRoot, encoding: 'utf8', windowsHide: true, env: { ...process.env, DATA_DIR: path.join(sandbox, 'runtime-data'), LOCAL_TTS_AUTOSTART: 'false' } };
  if (process.platform !== 'win32') return spawnSync(command, args, options);
  const commandLine = [command, ...args].join(' ');
  return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], options);
};
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

async function filesUnder(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesUnder(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

try {
  const created = await createReleasePackage({ sourceRoot: root, destination: releaseRoot });
  const initialFiles = await filesUnder(releaseRoot);
  assert.ok(initialFiles.includes('README.md'));
  assert.ok(initialFiles.includes('package.json'));
  assert.ok(initialFiles.includes('pnpm-lock.yaml'));
  assert.ok(initialFiles.includes('.env.example'));
  assert.ok(initialFiles.includes('release-manifest.json'));
  const forbidden = initialFiles.filter(file => /(^|\/)(?:node_modules|server\/data|dist-demo|\.dsh-vision-router|\.local-baseline-[^/]*|\.git|\.env(?:\.|$)|.*\.(?:log|part|err|out)$|\.sqlite-migration-backup)(?:\/|$)/i.test(file) && !file.endsWith('.env.example'));
  assert.deepEqual(forbidden, []);
  assert.ok(created.manifest.files > 100);

  const install = run(pnpm, ['install', '--offline', '--frozen-lockfile']);
  assert.equal(install.status, 0, `${install.stdout}\n${install.stderr}`);
  const build = run(pnpm, ['build']);
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
  const doctor = run(pnpm, ['doctor']);
  assert.equal(doctor.status, 0, `${doctor.stdout}\n${doctor.stderr}`);
  const afterFiles = await filesUnder(releaseRoot);
  assert.equal(afterFiles.some(file => file.startsWith('node_modules/')), true, '离线安装后应生成依赖目录');
  assert.equal(afterFiles.some(file => (file === '.env' || file.startsWith('.env.')) && file !== '.env.example'), false);
  const runtimeDataFiles = afterFiles.filter(file => file.startsWith('server/data/') && !file.endsWith('/.gitkeep'));
  assert.deepEqual(runtimeDataFiles, [], 'doctor 不应在发布包中产生用户项目、媒体或配置');
  console.log(JSON.stringify({ ok: true, manifestFiles: created.manifest.files, forbiddenFiles: 0, offlineInstall: true, build: true, doctor: true, userDataExcluded: true }));
} finally {
  await rm(sandbox, { recursive: true, force: true });
}
