import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APP_VERSION } from '../server/version.mjs';

const packageInfo = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const pinnedNode = (await readFile(new URL('../.node-version', import.meta.url), 'utf8')).trim();
assert.match(packageInfo.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(APP_VERSION, packageInfo.version);
assert.ok(changelog.includes(`## [${packageInfo.version}] - `), `CHANGELOG.md 缺少 ${packageInfo.version} 版本条目`);
assert.match(packageInfo.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
assert.match(pinnedNode, /^\d+\.\d+\.\d+$/);
const [major, minor] = pinnedNode.split('.').map(Number);
assert.ok(major >= 22 && major < 25 && (major > 22 || minor >= 13), '.node-version 必须支持内置 SQLite 与当前测试工具');
const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args[0], '--tag', '用法：pnpm version:check [--tag vX.Y.Z]');
  assert.equal(args.length, 2);
  assert.equal(args[1], `v${packageInfo.version}`, 'Git tag 与 package.json 版本不一致');
}
console.log(JSON.stringify({ ok: true, version: APP_VERSION, pinnedNode, node: packageInfo.engines.node, packageManager: packageInfo.packageManager }));
