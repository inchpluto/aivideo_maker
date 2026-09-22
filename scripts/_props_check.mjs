import { readFile } from 'node:fs/promises';
import { buildProductionPlan } from '../src/productionPlan.js';
import { inspectCreativeContext } from '../shared/creativeContext.mjs';

const project = JSON.parse(await readFile('server/data/project-1787490128785.json', 'utf8'));
console.log('=== 项目 props ===');
console.log(JSON.stringify((project.assets?.props||[]).map(p=>({name:p.name,appearance:p.appearance,owner:p.owner})), null, 1));
console.log('\n=== 剧情文本是否提到这些道具 ===');
const scenes = (project.episodes||[]).flatMap(e=>e.scenes||[]);
const dialogues = (project.episodes||[]).flatMap(e=>e.dialogues||[]);
const storyText = [...scenes.flatMap(s=>[s.action,s.purpose,s.conflict,s.sceneBible?.propPositions].filter(Boolean).join(' ')),
  ...dialogues.map(d=>`${d.character} ${d.text} ${d.subtext||''}`),
  ...(project.characters||[]).map(c=>c.wardrobe||'')].join(' ');
(project.assets?.props||[]).forEach(p=>console.log(`  道具「${p.name}」在剧情中出现: ${storyText.includes(String(p.name))}`));

console.log('\n=== buildProductionPlan 缺口（应只含剧情相关道具）===');
const plan = buildProductionPlan(project);
console.log('总缺口:', plan.total, '| gate:', plan.gate, '| counts:', JSON.stringify(plan.counts));
(plan.tasks||[]).slice(0,20).forEach(t=>console.log(`  [${t.costClass}] ${t.stage} · ${t.label}`));