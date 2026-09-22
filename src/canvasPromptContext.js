import { characterPromptContext, inspectCreativeContext, propPromptContext, scenePromptContext } from '../shared/creativeContext.mjs';

export const CANVAS_CONTEXT_MARKER='\n\n【项目生产上下文】\n';
const UNRESOLVED_CONTEXT=/待补全|待设定|待确认|自动提取|根据原文|自然叙事声线|尚未|未知|未指定/;
const usableContext=(value,fallback)=>String(value||'').split('；').map(item=>item.trim()).filter(item=>item&&!UNRESOLVED_CONTEXT.test(item)).join('；')||fallback;

export const projectScenes=project=>(project?.episodes||[]).flatMap(episode=>episode.scenes||[]);

export function findShotScene(project={},shot={}) {
  const scenes=projectScenes(project);
  return scenes.find(scene=>String(scene.id||'')===String(shot?.sceneRef||''))
    ||scenes.find(scene=>String(scene.id||'').endsWith(`-${shot?.sceneRef}`))
    ||scenes[0]
    ||{heading:'主场景'};
}

export function compileCanvasContext(project={},node={}) {
  const shots=project.shots||[], shot=shots.find(item=>String(item.id)===String(node.shotId))||shots[0]||{};
  const scene=findShotScene(project,shot), allCharacters=project.characters||[];
  const searchable=[shot.subjectAction,shot.prompt,shot.dialogue].filter(Boolean).join(' ');
  const characters=allCharacters.filter(character=>shot.characters?.includes?.(character.name)||searchable.includes(character.name));
  const roles=(characters.length?characters:allCharacters).slice(0,4);
  const props=((project.assets||{}).props||[]).filter(prop=>!prop.sceneRefs?.length||prop.sceneRefs.some(ref=>String(scene.id||'').endsWith(String(ref)))).slice(0,5);
  const dialogues=(project.episodes||[]).flatMap(episode=>episode.dialogues||[]);
  const dialogue=dialogues.find(line=>line.id===shot.dialogueRef||line.text===shot.dialogue)||null;
  const audit=inspectCreativeContext(project), duration=Math.max(1,Math.min(10,Number(shot.duration)||3));
  const lines=[
    `项目：${project.title||'未命名作品'}；类型=${project.type||'AI 视频'}；画幅=${node.ratio||project.settings?.aspectRatio||'16:9'}。`,
    `镜头：${shot.id||'待绑定'} ${shot.name||'主画面'}；时长=${duration}s；叙事目的=${shot.narrativePurpose||shot.purpose||'推进当前情节'}。`,
    `场景：${usableContext(scenePromptContext(scene),scene.heading||project.synopsis||'按剧本场景执行')}。`,
    `人物：${usableContext(roles.map(characterPromptContext).filter(Boolean).join('；'),'无人场景；不得擅自增加人物')}。`,
    `道具：${usableContext(props.map(propPromptContext).filter(Boolean).join('；'),'无关键道具')}。`,
    `画面与动作：${shot.subjectAction||shot.visualContent||shot.prompt||project.synopsis||'保持动作单一清晰'}；环境变化=${shot.environmentAction||'仅保留连续、可控的细微变化'}。`,
    `摄影：${shot.type||'中景'}；${shot.angle||'平视'}；${shot.composition||'三分法构图'}；运镜=${shot.move||'固定镜头'}；光线=${shot.lighting||shot.tone||project.storyBible?.visualStyle||'电影主光稳定'}。`,
    `首尾帧：起始=${shot.startFrame||'从稳定姿态开始'}；结束=${shot.endFrame||'动作完成后稳定停留，便于承接下一镜'}。`,
    `表演与声音：${dialogue?`${dialogue.character||'角色'}说“${dialogue.text}”，情绪=${dialogue.emotion||shot.performanceEmotion||'自然克制'}，潜台词=${dialogue.subtext||'服从情节目标'}`:shot.audio||'无对白；环境声保持连续'}。`,
    `连续性：${Array.isArray(shot.continuity)?shot.continuity.join('；'):shot.continuity||'锁定人物身份、服装、道具状态、空间轴线、主光方向和色板'}。`,
    `负面约束：${shot.negativePrompt||'换脸、服装漂移、道具变形、空间跳轴、光向突变、多余肢体、无意义镜头运动、画面文字乱码'}。`,
  ];
  return {text:lines.join('\n'),shotId:shot.id||'',shotTitle:shot.name||'主画面',gapCount:audit.gaps.length,gaps:audit.gaps.slice(0,6)};
}

export function composeCanvasPrompt(project={},node={}) {
  const current=String(node.text||'').trim();
  if(current.includes(CANVAS_CONTEXT_MARKER))return current;
  return `${current}${CANVAS_CONTEXT_MARKER}${compileCanvasContext(project,node).text}`;
}
