import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const distRoot = process.argv[2] || 'dist';
const indexPath = `${distRoot}/index.html`;
if (!existsSync(indexPath)) throw new Error(`缺少 ${indexPath}，请先运行 pnpm build`);

const html = readFileSync(indexPath, 'utf8');
const initialFiles = [...new Set([...html.matchAll(/(?:src|href)=["']\.\/(assets\/[^"']+)["']/g)].map(match => match[1]))];
const files = initialFiles.map(relative => {
  const path = `${distRoot}/${relative}`;
  if (!existsSync(path)) throw new Error(`构建清单引用了不存在的资源：${path}`);
  const bytes = readFileSync(path);
  return { path: relative, bytes: bytes.length, gzipBytes: gzipSync(bytes).length, initial: true };
});
const assetDir = `${distRoot}/assets`;
const assetCount = existsSync(assetDir) ? readdirSync(assetDir).filter(name => statSync(`${assetDir}/${name}`).isFile()).length : 0;
const jsCss = files.filter(file => /\.(?:js|css)$/.test(file.path));
const report = {
  ok: true,
  distRoot,
  initialFiles: files.length,
  initialJsCssBytes: jsCss.reduce((sum, file) => sum + file.bytes, 0),
  initialJsCssGzipBytes: jsCss.reduce((sum, file) => sum + file.gzipBytes, 0),
  initialFilesDetail: files,
  assetCount,
  targets: { initialJsCssGzipBytes: 1500000, maxLongTaskMs: 16, interactionP95Ms: 100 }
};
console.log(JSON.stringify(report, null, 2));
