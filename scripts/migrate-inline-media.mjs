// 一次性迁移脚本：把项目中内联的 data:*;base64, 媒体字符串抽取落盘到 assets 目录，
// 并替换为 /api/assets/<projectId>/<filename> URL 引用。
//
// 背景：早期版本会通过 `import hero from '../assets/last-starline.png'` 这种内联封面，
// 在镜头无真实媒体时把 base64 data URI 写进 timeline[].mediaUrl，导致单个项目 JSON 膨胀
// 到 2MB+，且同一张图被复制进多个项目。本脚本扫描 server/data/*.json，把这类内联媒体迁移
// 到 server/data/assets/<projectId>/（store.saveBinaryAsset 的既定落盘方式）。
//
// 用法：
//   node scripts/migrate-inline-media.mjs            # 迁移全部项目（先写 .bak 备份）
//   node scripts/migrate-inline-media.mjs --dry-run  # 只报告，不落盘/不写回
//   node scripts/migrate-inline-media.mjs <projectId> # 只迁移指定项目
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'server', 'data');
const safe = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');

const dataUriRegex = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);([a-zA-Z0-9+,.-]+)?,([A-Za-z0-9+/=]+)$/;
const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

// 从 data URI 提取 { contentType, bytes }
function decodeDataUri(uri) {
  const m = String(uri || '').match(dataUriRegex);
  if (!m || m[3].length === 0) return null;
  return { contentType: m[1], bytes: Buffer.from(m[3], 'base64') };
}

async function saveAssetBytes({ bytes, contentType, projectId, kind, dryRun }) {
  const extension = extensions[contentType] || 'bin';
  const folder = path.join(dataDir, 'assets', safe(projectId) || 'shared');
  const name = `${safe(kind) || 'asset'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const url = `/api/assets/${encodeURIComponent(safe(projectId) || 'shared')}/${encodeURIComponent(name)}`;
  if (dryRun) return url; // 预览模式不落盘
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, name), bytes);
  return url;
}

// 递归遍历对象/数组，把内联 media data URI 抽出落盘并替换为 URL。返回迁移数量。
async function walkAndMigrate(node, context, migrated) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    if (/^data:(image|audio|video)\//.test(node)) {
      const decoded = decodeDataUri(node);
      if (!decoded || decoded.bytes.length === 0) return;
      if (decoded.bytes.length < 64) return; // 跳过极小的空图/占位
      const url = await saveAssetBytes({ bytes: decoded.bytes, contentType: decoded.contentType, projectId: context.projectId, kind: context.kind || 'media', dryRun: context.dryRun });
      migrated.push({ at: context.path, bytes: decoded.bytes.length, fromBytes: node.length, contentType: decoded.contentType });
      return url;
    }
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const result = await walkAndMigrate(node[i], { ...context, path: `${context.path}[${i}]` }, migrated);
      if (typeof result === 'string') node[i] = result;
    }
    return;
  }
  for (const key of Object.keys(node)) {
    const result = await walkAndMigrate(node[key], { ...context, path: `${context.path}.${key}` }, migrated);
    if (typeof result === 'string') node[key] = result;
  }
}

async function atomicWriteProject(destination, data) {
  const temporary = `${destination}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2), 'utf8');
  await rename(temporary, destination);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyId = args.find(arg => !arg.startsWith('--'));

  const files = (await readdir(dataDir)).filter(name => /^project-[a-zA-Z0-9_-]+\.json$/.test(name));
  const targets = onlyId ? files.filter(name => name === `${safe(onlyId)}.json`) : files;

  console.log(dryRun ? '（DRY RUN，只报告，不会落盘/写回）' : '迁移项目 JSON 中的内联媒体 → server/data/assets/');
  console.log('待处理项目:', targets.length);

  let totalMigrated = 0;
  const skippedToClean = [];

  for (const file of targets) {
    const absPath = path.join(dataDir, file);
    let project;
    let rawBefore = '';
    try { rawBefore = await readFile(absPath, 'utf8'); project = JSON.parse(rawBefore); }
    catch (error) { console.error(`跳过 ${file}: JSON 解析失败 ${error.message}`); skippedToClean.push(file); continue; }

    const projectId = project.id || safe(file.replace(/\.json$/, ''));
    const migrated = [];
    await walkAndMigrate(project, { path: 'root', projectId, kind: 'media', dryRun }, migrated);

    if (migrated.length === 0) {
      console.log(`  ${file}: 无内联媒体（无需迁移）`);
    } else {
      const savedBytes = migrated.reduce((sum, m) => sum + m.bytes, 0);
      const savedChars = migrated.reduce((sum, m) => sum + m.fromBytes, 0);
      console.log(`  ${file}: 迁移 ${migrated.length} 处内联媒体，落盘 ${(savedBytes / 1024 / 1024).toFixed(2)} MB，项目体量 -${(savedChars / 1024 / 1024).toFixed(2)} MB`);
      totalMigrated += migrated.length;
      if (!dryRun) {
        const backup = `${absPath}.bak-${Date.now()}.json`;
        await writeFile(backup, rawBefore, 'utf8'); // 备份原始内容
        await atomicWriteProject(absPath, project);
        console.log(`    已写回，备份 → ${path.basename(backup)}`);
      }
    }
  }

  console.log(dryRun
    ? `\nDRY RUN 完成，共 ${totalMigrated} 处内联媒体会被迁移。`
    : `\n迁移完成，共 ${totalMigrated} 处内联媒体已落盘。解析失败: ${skippedToClean.length ? skippedToClean.join(', ') : '无'}`);
}

main().catch(error => { console.error('迁移失败:', error); process.exit(1); });