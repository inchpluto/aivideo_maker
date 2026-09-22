import { inspectCreativeContext } from '../shared/creativeContext.mjs';
import { isVerifiedMedia } from '../shared/mediaReadiness.mjs';
import { CHARACTER_VIEW_SPECS, CONSISTENCY_MODES, ENVIRONMENT_VIEW_SPECS, PROP_VIEW_SPECS } from '../shared/assetPolicy.mjs';
import { textInputHash } from '../shared/assetVersions.mjs';

export { CHARACTER_VIEW_SPECS, ENVIRONMENT_VIEW_SPECS, PROP_VIEW_SPECS } from '../shared/assetPolicy.mjs';

const present = value => Boolean(String(value ?? '').trim());
export const storyReady = project => Boolean(project?.generation?.story?.status === 'done' || project?.manualWorkflow?.tasks?.story?.status === 'collected');
export const characterViewReady = (character, viewKey) => Boolean((character?.imageReferences || []).some(item => item.key === viewKey && present(item.url)));
export const propViewReady = (prop, viewKey) => Boolean((prop?.imageReferences || []).some(item => item.key === viewKey && present(item.url)));
export const environmentViewReady = (project, scene, viewKey) => Boolean((project?.assets?.environments || []).some(item => present(item.imageUrl) && (item.sceneId === scene?.id || item.scene === (scene?.heading || scene?.id)) && (item.viewKey || 'establish') === viewKey));
export const voiceLineReady = (character, line, scene) => Boolean((character?.sceneVoices || []).some(item => present(item.audioUrl) && (line?.id ? item.lineId === line.id : item.sceneId === scene?.id) && (!line?.text || (item.textHash ? item.textHash === textInputHash(line.text) : item.text === undefined || item.text === line.text))));
export const keyframeReady = shot => present(shot?.imageUrl);
export const videoReady = shot => isVerifiedMedia(shot, 'videoUrl') && shot?.status !== 'simulated' && shot?.status !== 'stale' && shot?.videoStatus !== 'stale';
export const editingReady = project => ['proposed','applied'].includes(project?.generation?.editing?.status);

export function projectScenes(project = {}) {
  const scenes = (project.episodes || []).flatMap(item => item.scenes || []);
  return scenes.length ? scenes : [{ id:'main', heading:project.synopsis || '主场景' }];
}

export function sceneForLine(project, line, fallbackIndex = 0) {
  const scenes = projectScenes(project);
  return scenes.find(scene => scene.id === line?.sceneRef) || scenes[fallbackIndex] || scenes[0];
}

export function buildProductionPlan(project = {}) {
  const tasks = [];
  const consistencyMode = CONSISTENCY_MODES[project.workflow?.consistencyMode] ? project.workflow.consistencyMode : 'standard';
  const policy = CONSISTENCY_MODES[consistencyMode];
  if (!storyReady(project)) {
    tasks.push({ id:'story', task:'story', stage:'剧本', label:'完整剧本与结构化分镜', costClass:'text' });
    return { version:'1.1.0', tasks, total:1, next:tasks[0], blockedAfterStory:true, gate:'story', consistencyMode, consistencyPolicy:policy, counts:{ text:1, image:0, voice:0, video:0 } };
  }
  const contextAudit = inspectCreativeContext(project);
  if (!contextAudit.complete) {
    tasks.push({ id:'story-refine', task:'story', stage:'剧本', label:`补全 ${contextAudit.gaps.length} 项生产上下文`, costClass:'text', contextGaps:contextAudit.gaps });
    return { version:'1.1.0', tasks, total:1, next:tasks[0], blockedAfterStory:true, gate:'prompt-context', contextAudit, consistencyMode, consistencyPolicy:policy, counts:{ text:1, image:0, voice:0, video:0 } };
  }

  const characters = project.characters || [];
  const props = project.assets?.props || [];
  const scenes = projectScenes(project);
  const dialogues = (project.episodes || []).flatMap(item => item.dialogues || []);
  const shots = project.shots || [];
  const characterViews = CHARACTER_VIEW_SPECS.filter(([viewKey]) => policy.characterViews.includes(viewKey));
  const propViews = PROP_VIEW_SPECS.filter(([viewKey]) => policy.propViews.includes(viewKey));
  const environmentViews = ENVIRONMENT_VIEW_SPECS.filter(([viewKey]) => policy.environmentViews.includes(viewKey));

  // 只对"剧情中确实出现"的道具生成补全任务：道具名需出现在场景动作/对白/场景圣经道具位置/角色服装里。
  // 剧情未提及的道具（占位/预置）不生成，避免为剧情之外的道具要求用户补图。
  const storyText = [...scenes.flatMap(s=>[s.action,s.purpose,s.conflict,s.sceneBible?.propPositions].filter(Boolean).join(' ')),
    ...dialogues.map(d=>`${d.character} ${d.text} ${d.subtext||''}`),
    ...characters.map(c=>c.wardrobe||'')].join(' ');
  const storyProps = props.filter(prop => { const name = String(prop.name || '').trim(); return name && !/待|占位|new|新道具/i.test(name) && storyText.includes(name); });

  for (const character of characters) for (const [viewKey, viewLabel] of characterViews) if (!characterViewReady(character, viewKey)) tasks.push({ id:`character-${character.id}-${viewKey}`, task:'character', stage:'人物', label:`${character.name} · ${viewLabel}`, costClass:'image', target:{characterId:character.id,viewKey,viewLabel} });
  for (const prop of storyProps) for (const [viewKey, viewLabel] of propViews) if (!propViewReady(prop, viewKey)) tasks.push({ id:`prop-${prop.id}-${viewKey}`, task:'prop', stage:'道具', label:`${prop.name} · ${viewLabel}`, costClass:'image', target:{propId:prop.id,viewKey,viewLabel} });
  for (const scene of scenes) for (const [viewKey, viewLabel] of environmentViews) if (!environmentViewReady(project, scene, viewKey)) tasks.push({ id:`environment-${scene.id}-${viewKey}`, task:'environment', stage:'场景', label:`${scene.heading || scene.id} · ${viewLabel}`, costClass:'image', target:{sceneId:scene.id,viewKey,viewLabel} });

  for (const character of characters) {
    const lines = dialogues.filter(item => item.character === character.name);
    const assignments = lines.length ? lines.map((line,index)=>({line,scene:sceneForLine(project,line,index)})) : [{line:{id:`fallback-${character.id}`,text:`我是${character.name}，故事现在开始。`,emotion:character.emotion||'自然'},scene:scenes[0]}];
    for (const { line, scene } of assignments) if (!voiceLineReady(character,line,scene)) tasks.push({ id:`voice-${character.id}-${line.id}`, task:'voice', stage:'声音', label:`${character.name} · ${scene?.heading || '当前场'} · ${String(line.text||'').slice(0,12)}`, costClass:'voice', target:{characterId:character.id,lineId:line.id,sceneId:scene?.id} });
  }

  for (const shot of shots) if (!keyframeReady(shot)) tasks.push({ id:`keyframe-${shot.id}`, task:'keyframe', stage:'首帧', label:`镜头 ${shot.id} · 审核首帧`, costClass:'image', target:{shotId:shot.id} });
  for (const shot of shots) if (!videoReady(shot)) tasks.push({ id:`video-${shot.id}`, task:'video', stage:'视频', label:`镜头 ${shot.id} · ${shot.name}`, costClass:'video', target:{shotId:shot.id} });
  if (!editingReady(project)) tasks.push({ id:'editing', task:'editing', stage:'剪辑', label:'AI 初剪决策清单', costClass:'text' });

  const counts = { text:0, image:0, voice:0, video:0 };
  for (const item of tasks) counts[item.costClass] += 1;
  return { version:'1.1.0', tasks, total:tasks.length, next:tasks[0] || null, blockedAfterStory:false, gate:'production', contextAudit, consistencyMode, consistencyPolicy:policy, counts };
}
