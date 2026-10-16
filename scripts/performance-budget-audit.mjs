import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-performance-budget-'));
const run = budget => spawnSync(process.execPath, ['scripts/performance-baseline.mjs', root], {
  encoding: 'utf8', env: { ...process.env, PERFORMANCE_BUDGET_BYTES: String(budget) },
});
try {
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<script src="./assets/app.js"></script>');
  await writeFile(path.join(root, 'assets', 'app.js'), 'export const title = "星幕";');
  const pass = run(1000);
  assert.equal(pass.status, 0, pass.stderr);
  assert.equal(JSON.parse(pass.stdout).ok, true);
  const exceeded = run(1);
  assert.equal(exceeded.status, 1);
  assert.equal(JSON.parse(exceeded.stdout).ok, false);
  assert.match(exceeded.stderr, /超过预算/);
  assert.equal(run(0).status, 1, 'invalid budgets must not silently disable the gate');
  await writeFile(path.join(root, 'index.html'), '<html>no entrypoint</html>');
  const noAssets = run(1000);
  assert.equal(noAssets.status, 1);
  assert.equal(JSON.parse(noAssets.stdout).ok, false);
  console.log(JSON.stringify({ ok: true, budgetPass: true, budgetFailure: true, missingAssetsRejected: true }));
} finally {
  await rm(root, { recursive: true, force: true });
}
