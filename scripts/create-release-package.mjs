import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RELEASE_FORMAT = 'xingmu-release-package';
const RELEASE_VERSION = '1.0.0';

function parseArgs(args) {
  const outputIndex = args.indexOf('--output');
  return { output: outputIndex >= 0 ? args[outputIndex + 1] : path.join('release', 'xingmu-source'), includeDist: args.includes('--include-dist') };
}

function isExcluded(relative, includeDist) {
  const normalized = relative.replaceAll('\\', '/');
  const exact = ['node_modules', 'dist-demo', '.git', '.pnpm-store', '.audit-build', '.dsh-vision-router', 'server/data', 'release', 'artifacts'];
  if (!includeDist) exact.push('dist');
  if (exact.some(item => normalized === item || normalized.startsWith(`${item}/`))) return true;
  if (/(^|\/)(?:\.env(?:\.[^/]+)?|.*\.(?:log|part|err|out)|\.sqlite-migration-backup|\.local-baseline-[^/]*)(?:\/|$)/i.test(normalized) && !normalized.endsWith('.env.example')) return true;
  return false;
}

async function filesUnder(root, prefix = '') {
  const items = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) files.push(...await filesUnder(path.join(root, item.name), relative));
    else files.push(relative);
  }
  return files;
}

async function createReleasePackage({ sourceRoot = process.cwd(), destination, includeDist = false }) {
  const source = path.resolve(sourceRoot);
  const target = path.resolve(destination);
  const relativeTarget = path.relative(source, target).replaceAll('\\', '/');
  if (!relativeTarget || relativeTarget === '.') throw new Error('发布包输出目录不能覆盖源码目录。');
  if (await stat(target).catch(() => null)) throw new Error(`发布包输出目录已存在：${target}；请换目录，不自动覆盖。`);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, filter: item => {
    const relative = path.relative(source, item);
    return relative === '' || relative === relativeTarget || !relative.startsWith(`${relativeTarget}${path.sep}`) && !isExcluded(relative, includeDist);
  } });
  const files = await filesUnder(target);
  const entries = [];
  for (const relative of files.sort()) {
    const data = await readFile(path.join(target, relative));
    entries.push({ path: relative.replaceAll('\\', '/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
  }
  const manifest = { format: RELEASE_FORMAT, version: RELEASE_VERSION, source: 'xingmu', includeDist, createdAt: new Date().toISOString(), files: entries, totalBytes: entries.reduce((sum, item) => sum + item.bytes, 0) };
  await writeFile(path.join(target, 'release-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return { destination: target, manifest: { ...manifest, files: entries.length } };
}

export { createReleasePackage, RELEASE_FORMAT, RELEASE_VERSION };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = await createReleasePackage({ destination: args.output, includeDist: args.includeDist });
  console.log(JSON.stringify({ ok: true, ...result }));
}
