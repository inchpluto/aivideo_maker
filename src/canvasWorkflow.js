import { inspectCreativeContext } from '../shared/creativeContext.mjs';

export const CANVAS_TEMPLATES = {
  full: { label: '叙事全链路', nodes: ['source','bible','script','refs','voice','board','prompt','keyframe','video','edit'] },
  visual: { label: '首帧一致性', nodes: ['script','refs','board','prompt','keyframe','video'] },
  finish: { label: '声音与成片', nodes: ['script','refs','voice','video','edit'] },
};

const TASK_NODE_MAP = {
  story: ['bible','script','board','prompt'],
  character: ['refs'],
  prop: ['refs'],
  environment: ['refs'],
  voice: ['voice'],
  keyframe: ['keyframe'],
  video: ['video'],
  editing: ['edit'],
};

const hasUrl = value => typeof value === 'string' && value.trim().length > 0;
const hasImageReference = item => hasUrl(item?.imageAsset) || (item?.imageReferences || []).some(reference => hasUrl(reference?.url));

export function deriveCanvasGraph(project = {}) {
  const shots = project.shots || [];
  const characters = project.characters || [];
  const environments = project.assets?.environments || [];
  const dialogues = (project.episodes || []).flatMap(episode => episode.dialogues || []);
  const contextAudit = inspectCreativeContext(project);
  const voiced = characters.flatMap(character => character.sceneVoices || character.voiceLines || character.generatedVoiceLines || []).filter(item => hasUrl(item?.audioUrl || item?.url)).length;
  const referenceReady = characters.length > 0 && characters.every(hasImageReference) && environments.length > 0;
  const definitions = [
    { id:'source', label:'创作简报', output:'故事目标与约束', deps:[], done:Boolean(project.source || project.synopsis), meta:project.source?.filename || project.title || '待创建' },
    { id:'bible', label:'故事圣经', output:'世界规则与人物弧光', deps:['source'], done:Boolean(project.storyBible), meta:project.storyBible?.genre || '待生成' },
    { id:'script', label:'剧本与对白', output:'场次、动作与对白', deps:['bible'], done:Boolean(project.episodes?.length)&&contextAudit.complete, meta:contextAudit.complete?`${project.episodes?.[0]?.scenes?.length || 0} 场 · ${dialogues.length} 条对白`:`待补 ${contextAudit.gaps.length} 项生产信息` },
    { id:'refs', label:'连续性资产', output:'角色、场景与道具参考', deps:['script'], done:referenceReady, meta:`角色 ${characters.filter(hasImageReference).length}/${characters.length} · 场景 ${environments.length}` },
    { id:'voice', label:'角色声音', output:'逐句情绪语音', deps:['script','refs'], done:dialogues.length > 0 && voiced >= dialogues.length, meta:`${Math.min(voiced,dialogues.length)} / ${dialogues.length} 条` },
    { id:'board', label:'连续性分镜', output:'镜号、调度与镜头 DNA', deps:['script','refs'], done:shots.length > 0, meta:`${shots.length} 镜` },
    { id:'prompt', label:'模型提示词', output:'首帧与视频生成指令', deps:['board','refs'], done:shots.length > 0 && shots.every(shot => hasUrl(shot.prompt) && hasUrl(shot.move)), meta:`${shots.filter(shot=>hasUrl(shot.prompt)&&hasUrl(shot.move)).length} / ${shots.length} 镜` },
    { id:'keyframe', label:'镜头首帧', output:'已审核首帧参考', deps:['prompt'], done:shots.length > 0 && shots.every(shot => hasUrl(shot.imageUrl) || hasUrl(shot.keyframeStatus)), meta:`${shots.filter(shot=>hasUrl(shot.imageUrl)||hasUrl(shot.keyframeStatus)).length} / ${shots.length} 镜` },
    { id:'video', label:'图生视频', output:'连续视频片段', deps:['keyframe','voice'], done:shots.length > 0 && shots.every(shot => ['generated','simulated'].includes(shot.status) || hasUrl(shot.videoUrl)), meta:`${shots.filter(shot=>['generated','simulated'].includes(shot.status)||hasUrl(shot.videoUrl)).length} / ${shots.length} 镜` },
    { id:'edit', label:'剪辑与交付', output:'时间线与质检结果', deps:['video','voice'], done:project.generation?.editing?.status === 'applied' || project.qualityReport?.status === 'passed', meta:project.qualityReport?.status === 'passed' ? '质检通过' : 'AI 提案 · 手动精修' },
  ];
  const resolved = new Map();
  return definitions.map(node => {
    const missingDeps = node.deps.filter(id => resolved.get(id)?.status !== 'done');
    const status = node.done ? (missingDeps.length ? 'stale' : 'done') : missingDeps.length ? 'blocked' : 'ready';
    const result = { ...node, status, missingDeps };
    resolved.set(node.id,result);
    return result;
  });
}

export function canvasImpactedNodes(nodes, startId) {
  const impacted = new Set([startId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!impacted.has(node.id) && node.deps.some(id => impacted.has(id))) {
        impacted.add(node.id);
        changed = true;
      }
    }
  }
  return nodes.filter(node => impacted.has(node.id)).map(node => node.id);
}

export function productionPlanForCanvasScope(plan, impacted) {
  if (!Array.isArray(impacted) || !impacted.length) return plan;
  const scope = new Set(impacted);
  const tasks = (plan?.tasks || []).filter(task => (TASK_NODE_MAP[task.task] || []).some(nodeId => scope.has(nodeId)));
  const counts = { text:0, image:0, voice:0, video:0 };
  for (const task of tasks) if (task.costClass in counts) counts[task.costClass] += 1;
  return { ...plan, tasks, total:tasks.length, next:tasks[0] || null, counts, canvasScope:[...scope] };
}
