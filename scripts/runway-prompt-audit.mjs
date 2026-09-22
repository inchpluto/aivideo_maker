import assert from 'node:assert/strict';
import { compileRunwayMotionPrompt, publicRunwayMotionKnowledge } from '../server/knowledge/runwayMotion.mjs';
import fs from 'node:fs';

const locked = compileRunwayMotionPrompt({ move:'固定镜头', subjectAction:'slowly raises her eyes', environmentAction:'Rain slides down the window', intensity:15, endFrame:'her eyes holding on the letter' });
const push = compileRunwayMotionPrompt({ camera:{ move:'推进', intensity:35 }, subjectAction:'opens the sealed letter', endFrame:'the handwritten signature in focus' });

const checks = [
  ['固定镜头使用正向锁定语言', /remains entirely locked off/i.test(locked)],
  ['推进被编译为可执行英文路径', /dollies forward along the optical axis/i.test(push)],
  ['包含连续单镜头约束', /Continuous, seamless shot/i.test(push)],
  ['包含稳定尾帧', /settles on/i.test(push)],
  ['不输出抽象强度数字', !/\d+\s*\/\s*100/.test(push)],
  ['缺省强度采用平稳中速', /smooth and measured/i.test(push)],
  ['不包含否定式运镜命令', !/\b(no|not|never|don['’]?t|doesn['’]?t)\b/i.test(`${locked} ${push}`)],
  ['提示词满足 Runway 1000 字符限制', locked.length < 1000 && push.length < 1000],
  ['知识库覆盖常用运镜', Object.keys(publicRunwayMotionKnowledge().cameraPhrases).length >= 20]
  ,['后端暴露运镜知识库接口', fs.readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8').includes('/api/knowledge/runway-motion')]
];

for (const [label, ok] of checks) {
  assert.equal(ok, true, label);
  console.log(`✓ ${label}`);
}
console.log(`Runway motion prompt audit passed (${checks.length} checks).`);
