import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createReleasePackage, parseArgs } from './create-release-package.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-release-safety-'));
const source = path.join(root, 'source');
const put = async (relative, content = 'excluded') => {
  const file = path.join(source, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
};
try {
  await put('package.json', JSON.stringify({ name: 'fixture', version: '0.2.0' }));
  await put('README.md', '源码发布包');
  await put('.env.example', 'KEY=');
  await put('src/main.js', 'export const title = "星幕";');
  for (const file of ['.env', '.env.local', '.npmrc', 'server/data/private.json', 'node_modules/private.txt', 'nested/node_modules/private.txt', '.git/config', 'dist-demo/index.html', 'private.sqlite-wal', '.cache/private.txt', 'local-data/project.json', 'old.corrupted.bak', 'release/previous/README.md']) await put(file);
  // A generic source snapshot doesn't have a usable Git repository.
  await rm(path.join(source, '.git'), { recursive: true });
  const destination = path.join(source, 'release', 'xingmu-source');
  const result = await createReleasePackage({ sourceRoot: source, destination, dataDir: 'local-data' });
  assert.equal(result.manifest.appVersion, '0.2.0');
  assert.equal(result.manifest.version, '1.0.0', 'format version stays independent of application version');
  assert.equal(result.manifest.revision, null);
  const manifest = JSON.parse(await readFile(path.join(destination, 'release-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.files.map(file => file.path), ['.env.example', 'README.md', 'package.json', 'src/main.js']);
  for (const entry of manifest.files) {
    const bytes = await readFile(path.join(destination, entry.path));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
  assert.equal(manifest.totalBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
  await assert.rejects(createReleasePackage({ sourceRoot: source, destination }), /已存在/);
  assert.equal(await readFile(path.join(destination, 'README.md'), 'utf8'), '源码发布包');
  await assert.rejects(createReleasePackage({ sourceRoot: source, destination: source }), /已存在|源码/);
  await assert.rejects(createReleasePackage({ sourceRoot: source, destination: path.join(root, 'missing-build'), includeDist: true }), /pnpm build/);
  await put('dist/index.html', '<!doctype html>');
  const withDist = await createReleasePackage({ sourceRoot: source, destination: path.join(root, 'with-dist'), includeDist: true, dataDir: 'local-data' });
  assert.equal(withDist.manifest.includeDist, true);
  assert.equal(await readFile(path.join(root, 'with-dist', 'dist', 'index.html'), 'utf8'), '<!doctype html>');

  // Reject links instead of resolving them and leaking the target's contents.
  const secret = path.join(root, 'secret.txt');
  await writeFile(secret, 'not for distribution');
  await symlink(secret, path.join(source, 'linked-secret.txt'));
  await assert.rejects(createReleasePackage({ sourceRoot: source, destination: path.join(root, 'unsafe') }), /符号链接/);
  await assert.rejects(readFile(path.join(root, 'unsafe', 'release-manifest.json')), { code: 'ENOENT' });
  assert.equal(await readFile(secret, 'utf8'), 'not for distribution');
  const dangling = path.join(root, 'dangling');
  await symlink(path.join(root, 'does-not-exist'), dangling);
  await assert.rejects(createReleasePackage({ sourceRoot: source, destination: dangling }), /已存在/);
  assert.throws(() => parseArgs(['--output']), /缺少参数值/);
  assert.throws(() => parseArgs(['--unknown']), /未知参数/);
  assert.deepEqual(parseArgs(['--', '--output', 'folder with spaces', '--include-dist']), { output: 'folder with spaces', includeDist: true });
  console.log(JSON.stringify({ ok: true, nestedOutput: true, noOverwrite: true, symlinksRejected: true, sensitiveFilesExcluded: true, hashesVerified: true, appVersion: manifest.appVersion }));
} finally {
  await rm(root, { recursive: true, force: true });
}
