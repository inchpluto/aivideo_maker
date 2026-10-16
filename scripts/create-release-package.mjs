import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const RELEASE_FORMAT = 'xingmu-release-package';
// Manifest format version, NOT the application version in package.json.
const RELEASE_VERSION = '1.0.0';
const exec = promisify(execFile);

export function parseArgs(args) {
  let output = path.join('release', 'xingmu-source');
  let includeDist = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--include-dist') includeDist = true;
    else if (arg === '--output' && args[i + 1] && !args[i + 1].startsWith('--')) output = args[++i];
    else throw new Error(`未知参数或缺少参数值：${arg}。用法：--output <目录> [--include-dist]`);
  }
  return { output, includeDist };
}

function isExcluded(relative, includeDist) {
  const normalized = relative.replaceAll('\\', '/');
  const segments = normalized.split('/');
  const directories = new Set(['node_modules', 'dist-demo', '.git', '.pnpm-store', '.audit-build', '.dsh-vision-router', 'release', 'artifacts', '.cache', 'coverage', '__pycache__', '.sqlite-migration-backup']);
  if (!includeDist) directories.add('dist');
  if (segments.some(item => directories.has(item) || item.startsWith('.local-baseline-'))) return true;
  if (normalized === 'server/data' || normalized.startsWith('server/data/')) return true;
  const name = segments.at(-1);
  if (/^\.env(?:\.|$)/i.test(name) && name !== '.env.example') return true;
  return /\.(?:log|part|tmp|err|out|sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?|corrupted\.bak|recovered|reversed-check)$/i.test(name)
    || ['release-manifest.json', '.npmrc', '.netrc', '.DS_Store'].includes(name);
}

const isWithin = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

async function collectFiles(source, { target, includeDist, dataDir }, prefix = '') {
  const entries = await readdir(path.join(source, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(source, relative);
    if (isExcluded(relative, includeDist) || isWithin(target, absolute) || (dataDir && isWithin(dataDir, absolute))) continue;
    // Never package a link to a developer's credentials, media or another tree.
    if (entry.isSymbolicLink()) throw new Error(`发布包拒绝符号链接：${relative}`);
    if (entry.isDirectory()) files.push(...await collectFiles(source, { target, includeDist, dataDir }, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`发布包拒绝非常规文件：${relative}`);
  }
  return files.sort();
}

async function sourceRevision(source) {
  if (!await lstat(path.join(source, '.git')).catch(() => null)) return null;
  const { stdout: commit } = await exec('git', ['rev-parse', 'HEAD'], { cwd: source });
  const { stdout: status } = await exec('git', ['status', '--porcelain'], { cwd: source });
  return { commit: commit.trim(), dirty: Boolean(status.trim()) };
}

async function createReleasePackage({ sourceRoot = process.cwd(), destination, includeDist = false, dataDir = process.env.DATA_DIR } = {}) {
  if (!destination) throw new Error('请指定发布包输出目录。');
  const source = await realpath(path.resolve(sourceRoot));
  const requestedTarget = path.resolve(destination);
  // Reject existing paths, including dangling symlinks. Never overwrite/delete
  // someone else's directory, even if it is empty.
  if (await lstat(requestedTarget).catch(error => { if (error.code !== 'ENOENT') throw error; return null; })) throw new Error(`发布包输出目录已存在：${requestedTarget}；请换目录，不自动覆盖。`);
  await mkdir(path.dirname(requestedTarget), { recursive: true });
  const target = path.join(await realpath(path.dirname(requestedTarget)), path.basename(requestedTarget));
  if (isWithin(target, source)) throw new Error('发布包输出目录不能覆盖源码目录或其父目录。');
  const packageInfo = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageInfo.version || '')) throw new Error('package.json 缺少有效的应用版本。');
  if (includeDist && !(await lstat(path.join(source, 'dist', 'index.html')).catch(() => null))?.isFile()) throw new Error('缺少 dist/index.html，请先运行 pnpm build。');
  const files = await collectFiles(source, { target, includeDist, dataDir: dataDir ? path.resolve(source, dataDir) : null });
  const revision = await sourceRevision(source);
  // Enumerate before creating the destination so nested output never recurses.
  await mkdir(target); // exclusive ownership; a concurrent creator causes EEXIST
  try {
    const entries = [];
    for (const relative of files) {
      const input = path.join(source, relative);
      const output = path.join(target, relative);
      if (!(await lstat(input)).isFile()) throw new Error(`源文件类型已变化：${relative}`);
      await mkdir(path.dirname(output), { recursive: true });
      await copyFile(input, output, constants.COPYFILE_EXCL);
      const data = await readFile(output);
      entries.push({ path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
    }
    const manifest = {
      format: RELEASE_FORMAT, version: RELEASE_VERSION, appVersion: packageInfo.version,
      source: packageInfo.name || 'xingmu', revision, includeDist, createdAt: new Date().toISOString(),
      files: entries, totalBytes: entries.reduce((sum, item) => sum + item.bytes, 0),
    };
    await writeFile(path.join(target, 'release-manifest.json'), JSON.stringify(manifest, null, 2), { encoding: 'utf8', flag: 'wx' });
    return { destination: target, manifest: { ...manifest, files: entries.length } };
  } catch (error) {
    // Only this invocation's new destination is rolled back.
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}

export { createReleasePackage, RELEASE_FORMAT, RELEASE_VERSION };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await createReleasePackage({ destination: args.output, includeDist: args.includeDist });
    console.log(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
