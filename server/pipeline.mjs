import { inspectCreativeContext } from '../shared/creativeContext.mjs';
import { isVerifiedMedia, mediaReadiness } from '../shared/mediaReadiness.mjs';

const present = value => Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim());
const every = (items, test) => items.length > 0 && items.every(test);
const percent = (passed, total) => total ? Math.round(passed / total * 100) : 0;

export const workflowBlueprint = [
  { id: 'brief', label: '创作简报', owner: '制片 / 选题', target: 'overview' },
  { id: 'story', label: '剧本与钩子', owner: '总编剧 / 对白医生', target: 'script' },
  { id: 'identity', label: '角色与场景圣经', owner: '美术 / 连续性', target: 'characters' },
  { id: 'storyboard', label: '分镜与镜头 DNA', owner: '分镜导演 / 摄影', target: 'storyboard' },
  { id: 'keyframe', label: '镜头首帧', owner: '视觉开发', target: 'storyboard' },
  { id: 'voice', label: '角色表演与声音', owner: '配音 / 声音导演', target: 'characters' },
  { id: 'video', label: '图生视频', owner: '视频生成 / 连续性', target: 'storyboard' },
  { id: 'edit', label: '粗剪与精修', owner: '剪辑 / 声音 / 字幕', target: 'editor' },
  { id: 'delivery', label: '质检与交付', owner: '制片 / QC', target: 'editor' }
];

export function recommendShotMode(shot = {}) {
  const text = `${shot.type || ''} ${shot.purpose || ''} ${shot.subjectAction || ''} ${shot.prompt || ''}`;
  const isAtmosphere = /空镜|环境|建立|风景|抽象|转场|特效/.test(text) && !/人物|角色|对白|表情|特写|近景/.test(text);
  if (shot.imageUrl) return { mode: 'image-to-video', label: '图生视频', reason: '已有审核首帧，可锁定构图、人物、光线与风格' };
  if (isAtmosphere) return { mode: 'text-to-video', label: '文生视频', reason: '环境或概念镜头可先用文本探索运动与氛围' };
  return { mode: 'image-first', label: '先生成首帧', reason: '包含人物或明确构图，先锁定视觉再做运动更稳' };
}

function stage(id, score, missing, metrics = {}, hardGate = false) {
  const state = hardGate && missing.length ? 'blocked' : score >= 85 ? 'done' : score > 0 ? 'ready' : 'blocked';
  return { ...workflowBlueprint.find(item => item.id === id), score, missing, blockers: hardGate ? [...missing] : [], warnings: hardGate ? [] : [...missing], metrics, state };
}

export function inspectWorkflow(project = {}) {
  const characters = project.characters || [];
  const shots = project.shots || [];
  const episodes = project.episodes || [];
  const scenes = episodes.flatMap(item => item.scenes || []);
  const dialogues = episodes.flatMap(item => item.dialogues || []);
  const environments = project.assets?.environments || [];
  const props = project.assets?.props || [];
  const timeline = project.timeline || [];
  const storyApproved = project.generation?.story?.status === 'done' || project.manualWorkflow?.tasks?.story?.status === 'collected';
  const actualEnvironments = environments.filter(item => present(item.imageUrl));
  const requiredSceneKeys = new Set(scenes.map(item => item.heading || item.id).filter(present));
  const actualEnvironmentKeys = new Set(actualEnvironments.map(item => item.scene || item.sceneId).filter(present));
  const environmentSets = new Map([...requiredSceneKeys].map(key => [key, actualEnvironments.filter(item => (item.scene || item.sceneId) === key)]));
  const completeSceneBibles = scenes.filter(scene => ['layout','axis','lighting','palette','propPositions'].every(key => present(scene.sceneBible?.[key]) && !String(scene.sceneBible[key]).includes('待确认')));
  const readyProps = props.filter(item => present(item.appearance) && present(item.narrativeFunction) && ((item.imageReferences || []).filter(reference => present(reference.url)).length >= 2 || present(item.imageAsset)));
  const actualKeyframes = shots.filter(item => present(item.imageUrl));
  const actualVoices = characters.filter(item => present(item.voiceAsset));
  const identitySets = characters.filter(item => (item.imageReferences || []).filter(reference => present(reference.url)).length >= 3);
  const requiredSceneVoices = new Set(dialogues.map((line, index) => { const sceneId=line.sceneRef || scenes[index]?.id || scenes[0]?.id; const character=characters.find(item=>item.name===line.character); return character&&sceneId?`${character.id}:${line.id||`${sceneId}-${index}`}`:''; }).filter(Boolean));
  const actualSceneVoices = new Set(characters.flatMap(character => (character.sceneVoices || []).filter(item=>present(item.audioUrl)&&present(item.lineId)).map(item=>`${character.id}:${item.lineId}`)));
  const actualVideos = shots.filter(item => isVerifiedMedia(item, 'videoUrl'));
  const reviewedVideos = actualVideos.filter(item => { const active=(item.videoTakes||[]).find(take=>take.id===item.activeVideoTakeId||take.url===item.videoUrl); return active ? active.qc?.decision==='pass' : item.videoReview?.decision==='pass'; });
  const visualTimeline = timeline.filter(item => item.track === 0 && isVerifiedMedia(item, 'mediaUrl'));
  const audioTimeline = timeline.filter(item => [1, 2].includes(item.track) && present(item.mediaUrl));
  const captionTimeline = timeline.filter(item => item.track === 3 && present(item.label));
  const promptContext = inspectCreativeContext(project);
  const manualMediaMode = project.manualWorkflow?.mode === 'manual-media' || project.production?.mode === 'manual-media' || project.creativeBrief?.mode === 'manual-media';
  const storyContextGaps = promptContext.gaps.filter(item => item.stage === '情节');
  const productionContextGaps = promptContext.gaps.filter(item => item.stage !== '情节');

  const briefChecks = [present(project.title), present(project.type), present(project.synopsis), present(project.settings?.aspectRatio || project.production?.aspectRatio)];
  const storyChecks = manualMediaMode ? [true] : [storyApproved, present(project.storyBible), episodes.length > 0, scenes.length >= 3, dialogues.length >= 2, episodes.some(item => present(item.hook)), episodes.some(item => present(item.cliffhanger)), storyContextGaps.length === 0];
  const identityChecks = manualMediaMode ? [characters.length === 0 || every(characters, item => present(item.appearance))] : [characters.length > 0, every(characters, item => present(item.appearance)), identitySets.length === characters.length, props.length === 0 || readyProps.length === props.length, requiredSceneKeys.size > 0 && [...requiredSceneKeys].every(key => (environmentSets.get(key) || []).length >= 3), scenes.length > 0 && completeSceneBibles.length === scenes.length, productionContextGaps.length === 0];
  const boardChecks = [shots.length >= (manualMediaMode ? 1 : 4), every(shots, item => present(item.sceneRef)), every(shots, item => present(item.subjectAction || item.prompt)), every(shots, item => present(item.type) && present(item.move)), every(shots, item => present(item.visualContent)), every(shots, item => present(item.sound || item.audio)), every(shots, item => present(item.narrativePurpose || item.purpose)), every(shots, item => present(item.startFrame) && present(item.endFrame)), every(shots, item => (item.continuity || []).length >= 2), every(shots, item => Number(item.duration) >= 1 && Number(item.duration) <= 10)];
  const keyframeChecks = [manualMediaMode || shots.length > 0, manualMediaMode || actualKeyframes.length === shots.length];
  const voiceChecks = manualMediaMode && dialogues.length === 0 ? [true] : [characters.length > 0, every(characters, item => present(item.voice)), actualVoices.length === characters.length, requiredSceneVoices.size===0||[...requiredSceneVoices].every(key=>actualSceneVoices.has(key))];
  const videoChecks = [shots.length > 0, actualVideos.length === shots.length, actualVideos.length > 0 && visualTimeline.length >= actualVideos.length, actualVideos.length > 0 && reviewedVideos.length === actualVideos.length];
  const editChecks = [actualVideos.length === shots.length && shots.length > 0, visualTimeline.length >= shots.length, dialogues.length === 0 || audioTimeline.length > 0, dialogues.length === 0 || (captionTimeline.length > 0 && captionTimeline.every(item => item.status === 'synced')), project.generation?.editing?.status === 'applied'];
  const deliveryChecks = [project.qualityReport?.status === 'passed', present(project.delivery?.preset), present(project.delivery?.videoUrl), present(project.delivery?.exportedAt)];

  const stages = [
    stage('brief', percent(briefChecks.filter(Boolean).length, briefChecks.length), ['标题/类型/梗概/画幅未完整'].filter(() => briefChecks.some(item => !item)), { aspectRatio: project.settings?.aspectRatio || project.production?.aspectRatio || '未设置' }),
    stage('story', percent(storyChecks.filter(Boolean).length, storyChecks.length), manualMediaMode ? [] : [!storyApproved?'剧本草稿尚未回收或确认':'',!present(project.storyBible)?'故事圣经未完成':'',scenes.length<3?'剧情少于 3 个可拍场次':'',dialogues.length<2?'对白样本不足':'',!episodes.some(item=>present(item.hook))?'缺少开场钩子':'',!episodes.some(item=>present(item.cliffhanger))?'缺少集尾悬念':'',storyContextGaps.length?`仍有 ${storyContextGaps.length} 项情节生产信息待补全`:'' ].filter(Boolean), { scenes: scenes.length, dialogues: dialogues.length, approved: storyApproved, promptContext: promptContext.score, manualMediaMode }),
    stage('identity', percent(identityChecks.filter(Boolean).length, identityChecks.length), manualMediaMode ? [] : [!characters.length?'尚未建立角色库':'',!every(characters,item=>present(item.appearance))?'部分角色缺少身份锚点':'',identitySets.length<characters.length?`仍有 ${characters.length-identitySets.length} 个角色未完成至少 3 个视角参考`:'',readyProps.length<props.length?`仍有 ${props.length-readyProps.length} 个道具未完成资产参考`:'',requiredSceneKeys.size&&[...requiredSceneKeys].some(key=>(environmentSets.get(key)||[]).length<3)?`仍有 ${[...requiredSceneKeys].filter(key=>(environmentSets.get(key)||[]).length<3).length} 个场景未完成三视图`:'',completeSceneBibles.length<scenes.length?`仍有 ${scenes.length-completeSceneBibles.length} 个场景未锁定空间、轴线、光向与道具位置`:'',productionContextGaps.length?`仍有 ${productionContextGaps.length} 项人物、声音、场景或道具信息待补全`:'' ].filter(Boolean), { characters: characters.length, identitySets: identitySets.length, requiredViewsPerCharacter: manualMediaMode ? 0 : 3, props: readyProps.length, requiredProps: props.length, environments: [...requiredSceneKeys].filter(key=>(environmentSets.get(key)||[]).length>=3).length, requiredEnvironments: requiredSceneKeys.size, requiredViewsPerScene: manualMediaMode ? 0 : 3, sceneBibles: completeSceneBibles.length, promptContext: promptContext.score, manualMediaMode }),
    stage('storyboard', percent(boardChecks.filter(Boolean).length, boardChecks.length), [shots.length<(manualMediaMode ? 1 : 4)?`可执行镜头少于 ${manualMediaMode ? 1 : 4} 个`:'',shots.some(item=>!present(item.sceneRef))?'部分镜头未绑定场景':'',shots.some(item=>!present(item.subjectAction||item.prompt))?'部分镜头缺少主体动作':'',shots.some(item=>!present(item.type)||!present(item.move))?'部分镜头缺少景别或运镜':'',shots.some(item=>!present(item.visualContent))?'部分镜头缺少画中内容':'',shots.some(item=>!present(item.sound||item.audio))?'部分镜头缺少声音设计':'',shots.some(item=>!present(item.narrativePurpose||item.purpose))?'部分镜头缺少叙事目的':'',shots.some(item=>!present(item.startFrame)||!present(item.endFrame))?'部分镜头缺少首尾帧':'',shots.some(item=>(item.continuity||[]).length<2)?'部分镜头连续性锚点不足':'',shots.some(item=>Number(item.duration)<1||Number(item.duration)>10)?'单镜必须控制在 1–10 秒，默认优先 3 秒':''].filter(Boolean), { shots: shots.length, preferredDuration: 3, maximumDuration: 10, groupedShots: (project.shotGroups || []).length, manualMediaMode }, true),
    stage('keyframe', percent(keyframeChecks.filter(Boolean).length, keyframeChecks.length), actualKeyframes.length<shots.length?[`待回收并审核 ${shots.length-actualKeyframes.length} 张镜头首帧`]:[], { ready: actualKeyframes.length, total: shots.length }),
    stage('voice', percent(voiceChecks.filter(Boolean).length, voiceChecks.length), [characters.some(item=>!present(item.voice))?'部分角色未固定声线':'',actualVoices.length<characters.length?`待回收 ${characters.length-actualVoices.length} 个角色的基础声线`:'',[...requiredSceneVoices].some(key=>!actualSceneVoices.has(key))?`待回收 ${[...requiredSceneVoices].filter(key=>!actualSceneVoices.has(key)).length} 条逐句情绪声音`:''].filter(Boolean), { ready: actualVoices.length, total: characters.length, lineVoices:[...requiredSceneVoices].filter(key=>actualSceneVoices.has(key)).length,requiredLineVoices:requiredSceneVoices.size }),
    stage('video', percent(videoChecks.filter(Boolean).length, videoChecks.length), [actualVideos.length<shots.length?`待回收 ${shots.length-actualVideos.length} 个实际视频镜头`:'',shots.some(item => !isVerifiedMedia(item, 'videoUrl')) ? `存在未通过真实性门禁的视频：${shots.filter(item => !isVerifiedMedia(item, 'videoUrl')).map(item => `${item.id}(${mediaReadiness(item).code})`).join('、')}` : '',actualVideos.length&&visualTimeline.length<actualVideos.length?'已生成视频尚未全部绑定 V1 时间线':'',actualVideos.length&&reviewedVideos.length<actualVideos.length?`待质检 ${actualVideos.length-reviewedVideos.length} 个主版本`:''].filter(Boolean), { ready: actualVideos.length, reviewed: reviewedVideos.length, timelineReady: visualTimeline.length, total: shots.length }, true),
    stage('edit', percent(editChecks.filter(Boolean).length, editChecks.length), [actualVideos.length<shots.length?'请先完成全部视频镜头':'',visualTimeline.length<shots.length?'视频素材未全部入轨':'',dialogues.length&&audioTimeline.length===0?'对白工程缺少人声轨':'',dialogues.length&&captionTimeline.length===0?'对白工程缺少字幕轨':'',dialogues.length&&captionTimeline.some(item=>item.status!=='synced')?'字幕仍是待校时草稿；在时间线逐条调整后才会通过':'',project.generation?.editing?.status!=='applied'?'剪辑提案尚未确认应用':''].filter(Boolean), { clips: timeline.length, visual: visualTimeline.length, audio: audioTimeline.length, captions: captionTimeline.length, captionsSynced: captionTimeline.filter(item=>item.status==='synced').length }),
    stage('delivery', percent(deliveryChecks.filter(Boolean).length, deliveryChecks.length), [project.qualityReport?.status!=='passed'?'成片质检尚未通过':'',!present(project.delivery?.preset)?'交付预设未锁定':'',!present(project.delivery?.videoUrl)?'尚无实际成片文件':'',!present(project.delivery?.exportedAt)?'尚未记录最终导出':''].filter(Boolean), { status: project.qualityReport?.status || 'pending', hasVideo: present(project.delivery?.videoUrl) })
  ];
  const firstShot = shots[0];
  const risks = [];
  if (firstShot && Number(firstShot.duration) > 3) risks.push('首镜超过 3 秒：短视频建议在首秒出现异常、冲突或结果预告');
  if (shots.some(item => !(item.continuity || []).length)) risks.push('部分镜头缺少身份、服装、道具、场景或光向锚点');
  if (shots.some(item => recommendShotMode(item).mode === 'image-first')) risks.push('人物镜头尚无首帧，直接文生视频的一致性风险较高');
  if (!dialogues.some(item => present(item.subtext))) risks.push('对白缺少潜台词，人物表演可能趋同');
  if (project.qualityReport?.status === 'needs-revision') risks.push('上一轮成片质检未通过，应先处理失败镜头再导出');
  if (actualVideos.length && reviewedVideos.length < actualVideos.length) risks.push('部分主版本尚未完成逐镜质检，不能直接进入最终交付');
  if (promptContext.gaps.length) risks.push(`生产上下文缺 ${promptContext.gaps.length} 项；应先回到剧本工坊补全，再生成人物、声音与场景资产`);
  if (project.qualityReport?.status === 'needs-revision') (project.qualityReport.failures || []).slice(0, 2).forEach(item => risks.push(`返工镜头 ${item.shotId || '未标记'}：${item.fix || item.evidence || '请根据质检证据修正'}`));
  const totalScore = Math.round(stages.reduce((sum, item) => sum + item.score, 0) / stages.length);
  const next = stages.find(item => item.score < 85) || stages.at(-1);
  const blockers = stages.flatMap(item => (item.blockers || []).map(message => `${item.id}：${message}`));
  const warnings = [...risks, ...stages.flatMap(item => (item.warnings || []).map(message => `${item.id}：${message}`))];
  return {
    version: '2.5.0', strategy: 'identity-prop-scene-set-voice-image-to-video', score: totalScore, stages, next,
    blockers, warnings, risks, shotModes: shots.map(item => ({ shotId: item.id, ...recommendShotMode(item) })),
    promptContext,
    sceneConsistency: { readyScenes: [...requiredSceneKeys].filter(key => (environmentSets.get(key) || []).length >= 3).length, totalScenes: requiredSceneKeys.size, sceneBibles: completeSceneBibles.length, readyProps: readyProps.length, totalProps: props.length },
    principles: ['首秒钩子', '角色多视角身份组', '道具状态资产化', '场景三视图与空间圣经', '分场情绪声音', '一镜一动作', '首尾帧承接', '图生视频优先', '质检通过后交付']
  };
}
