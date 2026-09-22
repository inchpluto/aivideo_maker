import { getModelSelection } from './modelCatalog.js';
export { providerCatalog } from './modelCatalog.js';
import { inspectCreativeContext, profileToCharacter } from '../shared/creativeContext.mjs';
import { synchronizeAssetLinks } from './assetLinkage.js';
import { markAssetDependentsStale, markChangedVoiceLinesStale, markShotOutputsStale, markVoiceDependentsStale, shotDependencyInputHash, synchronizeAssetVersions, textInputHash } from '../shared/assetVersions.mjs';

const clean = value => String(value || '').replace(/\r/g, '').trim();
const short = (value, size = 80) => clean(value).replace(/\s+/g, ' ').slice(0, size);

function splitChapters(text) {
  const source = clean(text);
  const marker = /^(第[零一二三四五六七八九十百千\d]+[章节回幕卷]|chapter\s+\d+)[^\n]*$/gim;
  const matches = [...source.matchAll(marker)];
  if (!matches.length) return [{ title: '第一章', text: source }];
  return matches.map((m, index) => ({
    title: clean(m[0]),
    text: source.slice(m.index + m[0].length, matches[index + 1]?.index ?? source.length).trim()
  })).filter(chapter => chapter.text);
}

function inferCharacters(text) {
  const counts = new Map();
  const dialogueNames = [...text.matchAll(/(?:^|\n)\s*([\u4e00-\u9fa5]{2,4})(?:（[^）]*）|\([^)]*\))?\s*[：:]/g)];
  dialogueNames.forEach(match => counts.set(match[1], (counts.get(match[1]) || 0) + 3));
  const quoted = [...text.matchAll(/([\u4e00-\u9fa5]{2,4})(?:说|问|喊|答|低声道|轻声说)/g)];
  quoted.forEach(match => counts.set(match[1], (counts.get(match[1]) || 0) + 1));
  const blacklist = new Set(['这个', '那个', '他们', '她们', '自己', '母亲', '父亲', '然后', '突然']);
  const names = [...counts.entries()].filter(([name]) => !blacklist.has(name)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  if (!names.length) names.push('林夏', '母亲');
  return names.map((name, index) => ({
    id: `char-${index + 1}`,
    name,
    role: index === 0 ? '主角' : index === 1 ? '关键角色' : '配角',
    age: index === 0 ? '24 岁' : '待设定',
    appearance: index === 0 ? '黑色短发，琥珀色眼睛，芥末黄雨衣；神情克制、警觉。' : '根据原文描写自动提取，生成前可继续补充。',
    desire: index === 0 ? '找到被隐藏的真相' : '推动主角做出选择',
    fear: index === 0 ? '记忆并不可靠' : '失去重要的人',
    voice: index === 0 ? '青年女声 · 清澈偏低' : '自然叙事声线',
    voiceProvider: 'ElevenLabs',
    emotion: '平静',
    status: index === 0 ? 'ready' : 'draft'
  }));
}

function inferDialogues(text, characters) {
  const names = new Set(characters.map(item => item.name));
  const lines = [];
  for (const match of text.matchAll(/(?:^|\n)\s*([\u4e00-\u9fa5]{2,4})(?:（([^）]*)）|\(([^)]*)\))?\s*[：:]\s*([^\n]+)/g)) {
    if (names.has(match[1]) || lines.length < 6) lines.push({ character: match[1], emotion: match[2] || match[3] || '自然', text: clean(match[4]) });
  }
  if (!lines.length) return [
    { character: characters[0].name, emotion: '迟疑', text: '又错过了……最后一班。' },
    { character: characters[1]?.name || '旁白', emotion: '遥远', text: '如果你听见这句话，说明星轨还记得我们。' }
  ];
  return lines.slice(0, 12);
}

function makeShots(chapters, dialogues) {
  const source = chapters.flatMap(chapter => chapter.text.split(/\n{2,}|[。！？!?]\s*/).filter(line => clean(line).length > 5));
  const grammar = [
    ['远景', '缓慢推进', '建立环境与空间关系', '冷蓝'],
    ['中景', '横移跟拍', '人物进入目标场景', '青橙'],
    ['特写', '焦点转移', '关键道具或线索出现', '暖红'],
    ['全景', '低机位推轨', '动作升级并改变局势', '冷蓝'],
    ['大特写', '极慢推近', '捕捉人物决定瞬间', '琥珀'],
    ['中近景', '手持轻晃', '关系冲突达到峰值', '中性']
  ];
  return grammar.map(([type, move, purpose, tone], index) => {
    const seed = source[index] || dialogues[index]?.text || purpose;
    return {
      id: String(index + 1).padStart(2, '0'),
      name: short(seed, 8) || purpose,
      type, move, purpose, tone,
      duration: 3,
      crop: ['wide', 'medium', 'detail', 'train', 'face', 'medium'][index],
      visualContent: short(seed, 100), narrativePurpose: purpose, sound: dialogues[index]?.text ? `对白：${dialogues[index].text}` : '场景环境声连续',
      prompt: `${short(seed, 70)}。${type}，${move}，${purpose}，电影光影，保持角色外形、服装、道具位置、场景轴线与主光方向连续。`,
      dialogue: dialogues[index]?.text || '',
      status: index < 2 ? 'ready' : 'planned'
    };
  });
}

export function buildProjectFromNovel({ text, filename = '导入小说.txt', type = 'AI 短剧', episodeLength = 90 }) {
  const source = clean(text);
  if (source.length < 20) throw new Error('小说内容过短，请至少提供 20 个字符。');
  const chapters = splitChapters(source);
  const characters = inferCharacters(source);
  const dialogues = inferDialogues(source, characters);
  const generatedShots = makeShots(chapters, dialogues);
  const title = clean(filename).replace(/\.(txt|md|json)$/i, '') || chapters[0].title || '未命名作品';
  const summary = short(chapters[0].text, 110);
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}`,
    title,
    type,
    updatedAt: now,
    source: { filename, characters: source.length, chapters: chapters.length, importedAt: now },
    settings: { aspectRatio: '9:16', fps: 24 },
    production: { strategy: 'identity-prop-scene-set-image-to-video', hookTargetSeconds: 1, preferredShotDuration: 3, shotDurationRange: [1, 10], variantCount: 2 },
    workflow: { current: 'script', completion: 28, episodeLength },
    synopsis: summary,
    structure: '三幕式',
    episodes: [{
      id: 'ep-01', title: '第 1 集 · 命运的入口', duration: episodeLength,
      scenes: chapters.slice(0, 4).map((chapter, index) => ({ id: `scene-${index + 1}`, heading: `${index + 1}. ${index ? '内景' : '外景'} · ${chapter.title} · 夜`, action: short(chapter.text, 180), purpose: ['建立钩子', '触发事件', '升级冲突', '留下悬念'][index] || '推进剧情', beat:['发现','发展','对抗','转折'][index]||'发展', conflict:'待从原文确认', visualHook:'待从原文确认', sceneBible:{timeWeather:'夜 / 天气按原文',layout:'固定主空间与前中后景关系',entrances:'锁定主要入口与人物动线',axis:'以主要人物关系线为180度轴线',lighting:'主光方向固定，延续前后镜',palette:'遵循故事圣经色板',propPositions:'关键道具位置按资产图锁定'} })),
      dialogues
    }],
    characters,
    assets: { props: [], environments: [] },
    shotGroups: generatedShots.map((shot,index)=>({id:`group-${index+1}`,label:`镜头组 ${index+1}`,shotIds:[shot.id]})),
    shots: generatedShots,
    timeline: generatedShots.map((shot, index) => ({ id: `clip-${shot.id}`, track: 0, start: generatedShots.slice(0, index).reduce((n, item) => n + item.duration, 0), duration: shot.duration, label: `${shot.id} ${shot.name}`, status: shot.status })),
    jobs: [
      { id: 'job-script', label: '小说拆解与剧本', provider: '星幕故事引擎', status: 'done' },
      { id: 'job-character', label: '角色圣经', provider: '星幕角色画师', status: 'done' },
      { id: 'job-board', label: '分镜规划', provider: '星幕镜头引擎', status: 'done' },
      { id: 'job-media', label: '视听素材生成', provider: '按需生成', status: 'waiting' },
      { id: 'job-edit', label: '剪辑与导出', provider: '星幕剪辑导演', status: 'waiting' }
    ]
  };
}

const lockedPathTokens = value => String(value || '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
const readLockedPath = (root, path) => lockedPathTokens(path).reduce((current, token) => { if (current === undefined || current === null) return undefined; if (Array.isArray(current)) return current.find(item => String(item?.id) === token) ?? current[Number(token)]; return current[token]; }, root);
const writeLockedPath = (root, path, value) => { const tokens = lockedPathTokens(path); let current = root; tokens.forEach((token, index) => { if (index === tokens.length - 1) { if (Array.isArray(current)) { const item = current.find(entry => String(entry?.id) === token); if (item) current[current.indexOf(item)] = value; } else current[token] = value; return; } if (Array.isArray(current)) current = current.find(entry => String(entry?.id) === token); else { current[token] ??= {}; current = current[token]; } }); return root; };
const protectLockedScreenplayFields = (previous, candidate) => { const fields = [...new Set([...(Array.isArray(previous?.lockedFields) ? previous.lockedFields : []), ...(Array.isArray(previous?.locks?.fields) ? previous.locks.fields : [])].filter(Boolean).map(String))]; const protectedFields = fields.filter(field => { const before = readLockedPath(previous, field); const after = readLockedPath(candidate, field); if (before === undefined || JSON.stringify(before) === JSON.stringify(after)) return false; writeLockedPath(candidate, field, before); return true; }); return protectedFields; };
const buildScreenplayProposal = (previous, candidate, protectedFields, generation) => { const fields = ['title', 'synopsis', 'theme', 'storyBible', 'platformPlan', 'characters', 'episodes', 'shots', 'timeline']; const changes = fields.filter(field => JSON.stringify(previous?.[field]) !== JSON.stringify(candidate?.[field])).map(path => ({ path, changed: true, locked: protectedFields.includes(path) })); return { id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: protectedFields.length ? 'applied-with-locks' : 'applied', generatedAt: new Date().toISOString(), provider: generation.provider || '', model: generation.model || '', mode: generation.mode || '', changes, protectedFields, sourceRevision: previous?.revision ?? null }; };

function normalizeScreenplay(project, screenplay, generation = {}) {
  const episodes = (screenplay.episodes || []).map((episode, episodeIndex) => ({
    id: `ep-${String(episodeIndex + 1).padStart(2, '0')}`,
    title: episode.title, hook: episode.hook || '', cliffhanger: episode.cliffhanger || '',
    duration: project.workflow?.episodeLength || 90,
    scenes: (episode.scenes || []).map((scene, sceneIndex) => ({ id: `ep${episodeIndex + 1}-scene-${sceneIndex + 1}`, conflict: '', visualHook: '', sceneBible:{timeWeather:'待确认',layout:'待确认',entrances:'待确认',axis:'待确认',lighting:'待确认',palette:'待确认',propPositions:'待确认'}, ...scene })),
    dialogues: (episode.dialogues || []).map((line, lineIndex) => ({ id: `ep${episodeIndex + 1}-dialogue-${lineIndex + 1}`, subtext: '', ...line }))
  }));
  const sceneText = episodes.flatMap(episode => episode.scenes.map(scene => `${scene.action} ${scene.conflict} ${scene.visualHook}`)).join('\n\n');
  const dialogues = episodes.flatMap(episode => episode.dialogues);
  const profiles=screenplay.storyBible?.characterProfiles||[];const namedCharacters=[...new Set([...profiles.map(item=>item.name),...dialogues.map(line=>line.character),...(screenplay.storyBible?.characterArcs||[]).map(item=>item.character)].filter(Boolean))];
  const existingByName=new Map((project.characters||[]).map(item=>[item.name,item]));
  const characters=namedCharacters.map((name,index)=>profileToCharacter(profiles.find(item=>item.name===name)||{name},existingByName.get(name),index));
  const fallbackShots = makeShots([{ title: '自动剧情', text: sceneText }], dialogues);
  const sourceShots = screenplay.storyboard?.length ? screenplay.storyboard : fallbackShots;
  const flatScenes=episodes.flatMap(ep=>ep.scenes||[]); const generatedShots = sourceShots.map((item,index)=>{const base=fallbackShots[index%fallbackShots.length];const subjectAction=item.subjectAction || item.visualContent || item.prompt || base.prompt;const environmentAction=item.environmentAction || '环境产生与主体动作呼应的细微变化';const sceneRef=item.sceneRef || String(Math.floor(index/2)+1);const scene=flatScenes.find(scene=>String(scene.id||'').endsWith(`-${sceneRef}`))||flatScenes[Math.floor(index/2)]||{};const purpose=item.narrativePurpose||item.purpose||scene.purpose||base.purpose;const visualContent=item.visualContent||`${subjectAction}；${environmentAction}`;const sound=item.sound||item.audio||'';return { ...base,id:String(index+1).padStart(2,'0'),groupId:item.groupId||`group-${Math.floor(index/3)+1}`,sceneRef,scene:item.scene||scene.heading||'',timeRange:item.timeRange||'',characters:item.characters||[],name:short(item.name || base.name,9),type:item.type || base.type,angle:item.angle || '平视',move:item.move || base.move,composition:item.composition || '三分法',duration:Math.max(1,Math.min(10,Number(item.duration)||3)),lighting:item.lighting || base.tone,tone:item.lighting || base.tone,visualContent,narrativePurpose:purpose,subjectAction,environmentAction,sound,audio:sound,caption:item.caption||'',startFrame:item.startFrame || '稳定建立主体位置',endFrame:item.endFrame || '动作完成并承接下一镜',transition:item.transition||'动作或视线匹配切下一镜',negativePrompt:item.negativePrompt || '人物换脸，服装变化，道具漂移，空间跳轴，多余肢体',continuity:item.continuity || ['角色身份锚点','服装与道具','场景轴线','光线方向'],purpose,prompt:`${short(subjectAction,90)}。环境：${short(environmentAction,70)}。${item.type || base.type}，${item.angle || '平视'}，${item.move || base.move}，${item.composition || '三分法'}，${item.lighting || '电影级光影'}。首帧：${item.startFrame || '稳定建立主体位置'}。尾帧：${item.endFrame || '动作完成并承接下一镜'}。连续性：${(item.continuity || ['角色身份','服装道具','场景方位']).join('、')}。`,dialogue:dialogues[index]?.text || '',status:'planned',validation:{subject:true,camera:true,environment:true,continuity:true,keyframes:true}}});
  const existingProps=new Map(((project.assets||{}).props||[]).map(item=>[item.name,item]));const props=(screenplay.storyBible?.props||[]).map((item,index)=>({...existingProps.get(item.name),id:existingProps.get(item.name)?.id||`prop-${Date.now()}-${index}`,...item,status:existingProps.get(item.name)?.status||'draft'}));
  const next={ ...project, title: screenplay.title || project.title, synopsis: screenplay.logline || project.synopsis, theme: screenplay.theme || project.theme, storyBible:screenplay.storyBible || project.storyBible, platformPlan:screenplay.platformPlan||project.platformPlan, episodes: episodes.length ? episodes : project.episodes, characters:characters.length?characters:project.characters, assets:{...(project.assets||{}),props:props.length?props:((project.assets||{}).props||[])}, shotGroups:[...new Set(generatedShots.map(item=>item.groupId))].map((id,index)=>({id,label:`镜头组 ${index+1}`,shotIds:generatedShots.filter(item=>item.groupId===id).map(item=>item.id)})), shots: generatedShots, timeline: generatedShots.map((shot,index)=>({ id:`clip-${shot.id}`,track:0,start:generatedShots.slice(0,index).reduce((n,item)=>n+item.duration,0),duration:shot.duration,label:`${shot.id} ${shot.name}`,status:'planned' })), generation: { ...(project.generation || {}), story: { status:'done',provider:generation.provider || '未记录供应商',model:generation.model || 'unknown',mode:generation.mode || 'live',generatedAt:new Date().toISOString() } }, workflow: { ...project.workflow,current:'script',completion:58 }, jobs: project.jobs?.map(job=>['job-script','job-character','job-board'].includes(job.id)?{...job,status:'done'}:job) }; const protectedFields=protectLockedScreenplayFields(project,next); const revisionProposal=buildScreenplayProposal(project,next,protectedFields,generation); const linked=synchronizeAssetLinks({...next,versions:[...(project.versions||[]),{id:`version-${Date.now()}`,label:'AI 生成前自动快照',createdAt:new Date().toISOString(),proposalId:revisionProposal.id,snapshot:{title:project.title,synopsis:project.synopsis,episodes:project.episodes,characters:project.characters,storyBible:project.storyBible}}],revisionProposal}); return {...linked,promptContextAudit:inspectCreativeContext(linked)};
}

function applyProjectTaskInternal(project, task, response, target = {}) {
  if (!project) return project;
  const result=response?.result || {};
  if (task==='story' && result.screenplay) return normalizeScreenplay(project,result.screenplay,response);
  if (task==='character') { const imageAsset=result.imageUrl || result.url; const characters=project.characters.map(char=>{if(char.id!==target.characterId)return char;const previous=char.imageReferences||[];const imageReferences=target.viewKey?[...previous.filter(item=>item.key!==target.viewKey),{key:target.viewKey,label:target.viewLabel||target.viewKey,url:imageAsset||'',status:imageAsset?'generated':'prompt-ready',prompt:result.prompt,updatedAt:new Date().toISOString()}]:previous;const primaryAsset=imageAsset&&(target.viewKey==='front'||!char.imageAsset)?imageAsset:char.imageAsset;return {...char,status:imageAsset?'ready':char.status,imageStatus:imageAsset?'generated':'prompt-ready',imagePrompt:result.prompt,imageReferences,imageAsset:primaryAsset}}); return { ...project,characters,generation:{...(project.generation||{}),character:{status:characters.every(item=>item.imageAsset)?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt:new Date().toISOString()}},workflow:{...project.workflow,completion:Math.max(project.workflow?.completion||0,imageAsset?62:58)} }; }
  if (task==='prop') { const imageAsset=result.imageUrl || result.url; const props=((project.assets||{}).props||[]).map(item=>{if(item.id!==target.propId)return item;const previous=item.imageReferences||[];const imageReferences=target.viewKey?[...previous.filter(reference=>reference.key!==target.viewKey),{key:target.viewKey,label:target.viewLabel||target.viewKey,url:imageAsset||'',status:imageAsset?'generated':'prompt-ready',prompt:result.prompt,updatedAt:new Date().toISOString()}]:previous;return {...item,imageAsset:imageAsset&&(target.viewKey==='hero'||!item.imageAsset)?imageAsset:item.imageAsset,imageReferences,status:imageAsset?'ready':'prompt-ready'}}); return {...project,assets:{...(project.assets||{}),props},generation:{...(project.generation||{}),prop:{status:props.every(item=>item.imageAsset)?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt:new Date().toISOString()}}}; }
  if (task==='voice') { const voiceAsset=result.audioUrl || result.url; const performance={version:target.version||target.performanceVersion||'1.0.0',emotion:target.emotion||'自然',emotionIntensity:Number(target.emotionIntensity||target.intensity||55),intention:target.intention||'',subtext:target.subtext||'',pace:target.pace||'',pauseStyle:target.pauseStyle||'',emphasis:target.emphasis||'',speedFactor:Number(target.speedFactor||1),durationFactor:Number(target.durationFactor||1),ttsText:target.ttsText||target.lineText||''};const characters=project.characters.map(char=>{if(char.id!==target.characterId)return char;const previous=char.sceneVoices||[];const sceneVoices=target.lineId?[...previous.filter(item=>item.lineId!==target.lineId),{lineId:target.lineId,sceneId:target.sceneId||'',scene:target.scene||target.sceneId||'当前场',text:target.lineText||'',emotion:performance.emotion,intensity:performance.emotionIntensity,performance,audioUrl:voiceAsset||'',status:voiceAsset?'generated':'prompt-ready',updatedAt:new Date().toISOString()}]:target.sceneId?[...previous.filter(item=>item.lineId||item.sceneId!==target.sceneId),{lineId:'',sceneId:target.sceneId,scene:target.scene||target.sceneId,emotion:performance.emotion,intensity:performance.emotionIntensity,performance,audioUrl:voiceAsset||'',status:voiceAsset?'generated':'prompt-ready',updatedAt:new Date().toISOString()}]:previous;return {...char,voiceStatus:voiceAsset?'generated':'prompt-ready',voiceAsset:voiceAsset || char.voiceAsset,voiceDuration:result.duration,sceneVoices}}); let timeline=project.timeline||[]; if(voiceAsset){const clipId=`voice-${target.characterId}-${target.lineId||target.sceneId||'sample'}`;const existing=timeline.filter(item=>item.id!==clipId);const start=existing.filter(item=>item.track===1).reduce((end,item)=>Math.max(end,Number(item.start||0)+Number(item.duration||0)),0);const character=characters.find(item=>item.id===target.characterId);timeline=[...existing,{id:clipId,track:1,start,duration:Number(result.duration||5),label:`${character?.name||'角色'} · ${target.lineText||target.scene||'配音'}`,mediaUrl:voiceAsset,mediaType:'audio',probeStatus:result.probeStatus,mediaMetadata:result.mediaMetadata,cls:'clip-audio',volume:100,status:'generated',lineId:target.lineId||'',sceneId:target.sceneId||'',performance}]}; return { ...project,characters,timeline,generation:{...(project.generation||{}),voice:{status:characters.every(item=>item.voiceAsset)?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt:new Date().toISOString()}},workflow:{...project.workflow,completion:Math.max(project.workflow?.completion||0,voiceAsset?68:62)} }; }
  if (task==='environment') { const imageUrl=result.imageUrl || result.url; const scene=target.scene||'主场景';const viewKey=target.viewKey||'establish'; const environments=[...((project.assets||{}).environments||[]).filter(item=>!(item.scene===scene&&(item.viewKey||'establish')===viewKey)),{id:`environment-${Date.now()}`,scene,sceneId:target.sceneId||'',viewKey,viewLabel:target.viewLabel||viewKey,sceneAnchor:target.sceneAnchor||'',prompt:result.prompt,status:imageUrl?'generated':'prompt-ready',provider:response.provider,imageUrl}]; return { ...project,assets:{...(project.assets||{}),environments},generation:{...(project.generation||{}),environment:{status:imageUrl?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt:new Date().toISOString()}} }; }
  if (task==='keyframe') { const imageUrl=result.imageUrl || result.url; const shots=project.shots.map(shot=>shot.id===target.shotId?{...shot,imageUrl:imageUrl || shot.imageUrl,keyframePrompt:result.prompt,keyframeStatus:imageUrl?'generated':'prompt-ready',keyframeProvider:response.provider,generationMode:'image-to-video',lastGenerationError:'',lastGenerationStage:'',lastGenerationAttemptAt:new Date().toISOString()}:shot); return {...project,shots,generation:{...(project.generation||{}),keyframe:{status:shots.every(shot=>shot.imageUrl||shot.keyframeStatus==='prompt-ready')?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt:new Date().toISOString()}},workflow:{...project.workflow,current:'storyboard',completion:Math.max(project.workflow?.completion||0,72)}}; }
  if (task==='video') {
    const currentShot=(project.shots||[]).find(shot=>shot.id===target.shotId);
    if (target.inputSignature && currentShot && shotInputSignature(currentShot, project) !== target.inputSignature) {
      return { ...project, staleResults:[...(project.staleResults||[]),{ task, shotId:target.shotId, reason:'输入已变更，旧结果未写回',detectedAt:new Date().toISOString() }] };
    }
    const finished=result.status==='SUCCEEDED' || Boolean(result.output?.[0]);
    const simulated=response.mode==='demo' || result.simulated;
    const status=simulated?'simulated':finished?'generated':'processing';
    const outputUrl=result.output?.[0] || '';
    const generatedAt=new Date().toISOString();
    const shots=(project.shots||[]).map(shot=>{
      if(shot.id!==target.shotId)return shot;
      const existing=shot.videoTakes||[];
      const duplicate=outputUrl&&existing.find(item=>item.url===outputUrl);
      const take=outputUrl&&!duplicate?{id:`take-${shot.id}-${Date.now()}`,url:outputUrl,provider:response.provider,model:response.model,mode:response.mode,probeStatus:result.probeStatus,mediaMetadata:result.mediaMetadata,createdAt:generatedAt}:duplicate;
      return {...shot,status,videoTaskId:result.taskId,videoUrl:outputUrl || shot.videoUrl,probeStatus:result.probeStatus || shot.probeStatus,mediaMetadata:result.mediaMetadata || shot.mediaMetadata,videoRemoteUrl:result.remoteOutput?.[0] || shot.videoRemoteUrl,videoTakes:take&&!duplicate?[...existing,take]:existing,activeVideoTakeId:take?.id||shot.activeVideoTakeId,generatedAt,generationMode:shot.imageUrl?'image-to-video':'text-to-video',lastGenerationError:'',lastGenerationAttemptAt:generatedAt};
    });
    const allDone=shots.every(shot=>['generated','simulated'].includes(shot.status));
    return { ...project,shots,timeline:(project.timeline||[]).map(clip=>clip.id===`clip-${target.shotId}`?{...clip,status,mediaUrl:outputUrl || clip.mediaUrl,probeStatus:result.probeStatus || clip.probeStatus,mediaMetadata:result.mediaMetadata || clip.mediaMetadata}:clip),jobs:(project.jobs||[]).map(job=>job.id==='job-media'?{...job,status:allDone?'done':'running',provider:response.provider}:job),generation:{...(project.generation||{}),video:{status:allDone?'done':'running',provider:response.provider,model:response.model,mode:response.mode,generatedAt}},workflow:{...project.workflow,current:'storyboard',completion:Math.max(project.workflow?.completion||0,allDone?86:74)} };
  }
  if (task==='editing') return { ...project,generation:{...(project.generation||{}),editing:{status:'proposed',provider:response.provider,operations:result.operations||[],generatedAt:new Date().toISOString()}},jobs:project.jobs.map(job=>job.id==='job-edit'?{...job,status:'running',provider:response.provider}:job),workflow:{...project.workflow,current:'editor',completion:Math.max(project.workflow?.completion||0,92)} };
  return project;
}

function enrichVoiceOutput(project, target, response) {
  if (target.task !== 'voice' && !target.lineId && !target.sceneId) return project;
  const duration = Number(response?.result?.duration || response?.result?.mediaMetadata?.duration || 0);
  const text = String(target.lineText || '');
  const characters = (project.characters || []).map(character => character.id !== target.characterId ? character : { ...character, sceneVoices:(character.sceneVoices || []).map(voice => (target.lineId && voice.lineId === target.lineId) || (!target.lineId && target.sceneId && voice.sceneId === target.sceneId) ? { ...voice, text:text || voice.text || '', textHash:textInputHash(text || voice.text || ''), duration:duration || Number(voice.duration || 0) } : voice) });
  return { ...project, characters };
}

export function applyProjectTask(project, task, response, target = {}) {
  const before = project?.shots?.find(item => item.id === target.shotId);
  const next = applyProjectTaskInternal(project, task, response, target);
  const kind = ['character', 'prop', 'environment'].includes(task) ? task : '';
  const environment = task === 'environment' ? (next.assets?.environments || []).find(item => item.scene === (target.scene || '主场景') && (item.viewKey || 'establish') === (target.viewKey || 'establish')) : null;
  const entityId = task === 'character' ? target.characterId : task === 'prop' ? target.propId : environment?.id || target.environmentId || '';
  const hasNewImage = Boolean(response?.result?.imageUrl || response?.result?.imageAsset || response?.result?.url);
  const hasNewAudio = Boolean(response?.result?.audioUrl);
  const enriched = task === 'voice' ? enrichVoiceOutput(next, { ...target, task }, response) : next;
  const versioned = markChangedVoiceLinesStale(synchronizeAssetVersions(enriched));
  if (kind && entityId && hasNewImage) return markAssetDependentsStale(versioned, { kind, entityId });
  if (task === 'voice' && target.characterId && hasNewAudio) return markVoiceDependentsStale(versioned, { characterId:target.characterId, lineId:target.lineId, versionId:versioned.characters?.find(item => item.id === target.characterId)?.sceneVoices?.find(item => item.lineId === target.lineId)?.activeVersionId });
  if (task === 'keyframe' && target.shotId && response?.result?.imageUrl && before?.imageUrl && before.imageUrl !== response.result.imageUrl) return markShotOutputsStale(versioned, { shotId:target.shotId, kind:'keyframe' });
  return versioned;
}

export function shotInputSignature(shot = {}) {
  return shotDependencyInputHash(arguments[1] || {}, shot);
}

export async function analyzeNovel(payload) {
  let response;
  try { response=await fetch('/api/novel/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, route:getModelSelection('story') }) }); }
  catch { throw new Error('无法连接本地编排服务，请先运行 npm start。'); }
  if (!response.ok) { const detail=await response.json().catch(()=>({})); throw new Error(detail.error || `小说工作流失败（${response.status}）`); }
  return response.json();
}


export async function generateTask(task, payload = {}, options = {}) {
  let response;
  const route=options.route||getModelSelection(task==='keyframe'?'environment':task); const projectId=payload.projectId;
  try { response=await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, payload, route, projectId }), signal: options.signal }); }
  catch (error) { if (error?.name === 'AbortError') throw error; throw new Error('无法连接本地编排服务，请先运行 npm start。'); }
  if (!response.ok) { const detail=await response.json().catch(()=>({})); throw new Error(detail.error || `${task} 生成失败（${response.status}）`); }
  let result=await response.json();
  if(task==='video' && result.result?.taskId && !['SUCCEEDED','FAILED','CANCELLED'].includes(result.result.status)) {
    const deadline=Date.now()+10*60*1000;
    while(Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,5000));
      const statusResponse=await fetch('/api/generate/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:result.result.taskId,route,projectId,shotId:payload.shotId}),signal: options.signal});
      if(!statusResponse.ok){const detail=await statusResponse.json().catch(()=>({}));throw new Error(detail.error || `视频任务查询失败（${statusResponse.status}）`)}
      result=await statusResponse.json();
      if(result.result?.status==='SUCCEEDED')return result;
      if(['FAILED','CANCELLED'].includes(result.result?.status))throw new Error(result.result.failure || `视频任务${result.result.status}`);
    }
    throw new Error('视频生成超过 10 分钟，任务仍在供应商队列中。可稍后使用任务 ID 继续查询。');
  }
  return result;
}

const DRAFT_DB_NAME = 'xingmu-drafts';
const DRAFT_DB_VERSION = 1;
const DRAFT_STORE_NAME = 'projects';

const canUseIndexedDb = () => typeof indexedDB !== 'undefined';

function openDraftDb() {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB 不可用'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) request.result.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
  });
}

function draftTransaction(mode, action) {
  return openDraftDb().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, mode);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    let result;
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('IndexedDB 事务失败')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('IndexedDB 事务已中止')); };
    try { result = action(store); } catch (error) { db.close(); reject(error); }
  }));
}

export async function saveProjectDraft(project, { dirty = true } = {}) {
  if (!project?.id || !canUseIndexedDb()) return { ok: false, available: false };
  try {
    await draftTransaction('readwrite', store => store.put({ id: project.id, project, dirty: Boolean(dirty), updatedAt: project.updatedAt || new Date().toISOString(), savedAt: new Date().toISOString() }));
    return { ok: true, available: true };
  } catch (error) {
    return { ok: false, available: true, error: error?.message || '浏览器草稿存储不可用' };
  }
}

export async function loadProjectDraft(projectId) {
  if (!projectId || !canUseIndexedDb()) return null;
  try { return await draftTransaction('readonly', store => store.get(projectId)).then(request => request?.result || null); } catch { return null; }
}

export async function deleteProjectDraft(projectId) {
  if (!projectId || !canUseIndexedDb()) return { ok: false, available: false };
  try { await draftTransaction('readwrite', store => store.delete(projectId)); return { ok: true, available: true }; } catch (error) { return { ok: false, available: true, error: error?.message || '浏览器草稿删除失败' }; }
}

export function loadSavedProject() {
  try { return JSON.parse(localStorage.getItem('xingmu-project')) || null; } catch { return null; }
}

export function saveProject(project) {
  try {
    const metadata = project?.id ? { id: project.id, title: project.title || '', type: project.type || '', revision: Number.isInteger(project.revision) ? project.revision : undefined, updatedAt: project.updatedAt || '' } : project;
    localStorage.setItem('xingmu-project', JSON.stringify(metadata));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '浏览器本地缓存不可用' };
  }
}

export async function syncProject(project, { signal } = {}) {
  const local = saveProject(project);
  const draft = await saveProjectDraft(project, { dirty: true });
  if (!project?.id) return { mode: local.ok ? 'browser' : 'browser-unavailable', localError: local.error || '' };
  try {
    const response=await fetch(`/api/projects/${encodeURIComponent(project.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...project,expectedRevision:Number.isInteger(project.revision)?project.revision:undefined}),signal});
    const detail=await response.json().catch(()=>({}));
    if(response.status===409&&detail.code==='REVISION_CONFLICT')return {mode:'conflict',localStorage:local.ok,localError:local.error||'',error:detail.error||'项目已被其他窗口更新',code:detail.code,currentRevision:detail.currentRevision,serverProject:detail.project||null};
    if(!response.ok)throw new Error(detail.error||`保存失败（${response.status}）`);
    const persisted = detail.project?.revision ? { ...project, revision: detail.project.revision } : project;
    const cleanDraft = await saveProjectDraft(persisted, { dirty: false });
    return {mode:'server',localStorage:local.ok,draftStorage:draft.ok || cleanDraft.ok,...detail};
  } catch (error) {
    if (error?.name === 'AbortError') return {mode:'cancelled',localStorage:local.ok,draftStorage:draft.ok,localError:local.error||'',cancelled:true};
    return {mode:'browser',localStorage:local.ok,draftStorage:draft.ok,localError:local.error||'',error:error?.message||'服务端不可用'};
  }
}

export async function listServerProjects({ signal } = {}) {
  const response=await fetch('/api/projects',{signal});
  if(!response.ok)throw new Error('读取项目列表失败。');
  return (await response.json()).projects || [];
}

export async function loadServerProject(id) {
  const response=await fetch(`/api/projects/${encodeURIComponent(id)}`);
  if(!response.ok)throw new Error('读取项目失败。');
  return (await response.json()).project;
}

export async function downloadProjectPackage(projectId) {
  if(!projectId)throw new Error('请先打开一个项目。');
  const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/package`);
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||`项目包导出失败（${response.status}）`)}
  return response.blob();
}

export async function inspectProjectPackageFile(file) {
  if(!file)throw new Error('请选择项目包文件。');
  const response=await fetch('/api/projects/package/inspect',{method:'POST',headers:{'Content-Type':file.type||'application/zip'},body:file});
  const detail=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(detail.error||`项目包预检失败（${response.status}）`);
  return detail;
}

export async function importProjectPackageFile(file,{allowMissing=false,conflict='copy'}={}) {
  if(!file)throw new Error('请选择项目包文件。');
  const query=`allowMissing=${encodeURIComponent(String(Boolean(allowMissing)))}&conflict=${encodeURIComponent(conflict)}`;
  const response=await fetch(`/api/projects/package/import?${query}`,{method:'POST',headers:{'Content-Type':file.type||'application/zip'},body:file});
  const detail=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(detail.error||`项目包导入失败（${response.status}）`);
  return detail;
}

export async function deleteServerProject(id) {
  const response=await fetch(`/api/projects/${encodeURIComponent(id)}`,{method:'DELETE'});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error || '删除项目失败。')}
  return response.json();
}

export async function uploadProjectAsset(projectId, file, kind='reference') {
  if(!file)throw new Error('请选择素材文件。');
  if(file.size>8_000_000)throw new Error('素材请控制在 8MB 以内。');
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('读取素材失败。'));reader.readAsDataURL(file)});
  const base64=String(dataUrl).split(',')[1];
  const response=await fetch('/api/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,kind,contentType:file.type||'application/octet-stream',base64})});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error || '上传素材失败。')}
  return (await response.json()).asset;
}

export async function uploadProjectMedia(projectId, file, kind='local-media', options={}) {
  if(!file)throw new Error('请选择媒体文件。');
  if(file.size>250_000_000)throw new Error('单个媒体文件请控制在 250MB 以内。');
  const signal=options?.signal; const onProgress=options?.onProgress; const uploadId=`media-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; const query=`projectId=${encodeURIComponent(projectId)}&kind=${encodeURIComponent(kind)}&uploadId=${encodeURIComponent(uploadId)}`; const statusUrl=`/api/assets/media?projectId=${encodeURIComponent(projectId)}&uploadId=${encodeURIComponent(uploadId)}`; const chunkSize=Math.min(8_000_000,Math.max(64_000,file.size)); let offset=0; let retries=0;
  onProgress?.({uploadId,uploaded:0,total:file.size});
  while(offset<file.size){const end=Math.min(file.size,offset+chunkSize);try{const response=await fetch(`/api/assets/media?${query}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','Content-Range':`bytes ${offset}-${end-1}/${file.size}`,'X-Upload-Id':uploadId},body:file.slice(offset,end),signal});const detail=await response.json().catch(()=>({}));if(response.status===409&&detail.code==='UPLOAD_OFFSET_CONFLICT'&&Number.isSafeInteger(Number(detail.nextOffset))){offset=Math.max(0,Math.min(file.size,Number(detail.nextOffset)));retries=0;onProgress?.({uploadId,uploaded:offset,total:file.size});continue}if(!response.ok)throw new Error(detail.error||'导入媒体失败。');if(detail.complete&&detail.asset){onProgress?.({uploadId,uploaded:file.size,total:file.size});return detail.asset}offset=Math.max(offset,Math.min(file.size,Number(detail.nextOffset)||end));onProgress?.({uploadId,uploaded:offset,total:file.size});retries=0}catch(error){if(error?.name==='AbortError'){await fetch(statusUrl,{method:'DELETE'}).catch(()=>{});throw error}const status=await fetch(statusUrl,{signal}).then(response=>response.ok?response.json():null).catch(()=>null);if(status&&Number.isSafeInteger(Number(status.nextOffset))&&Number(status.nextOffset)!==offset){offset=Math.max(0,Math.min(file.size,Number(status.nextOffset)));retries=0;onProgress?.({uploadId,uploaded:offset,total:file.size});continue}if(++retries>=3){await fetch(statusUrl,{method:'DELETE'}).catch(()=>{});throw error}}}
  throw new Error('媒体上传未返回已入库资产。');
}

export async function listVoicePacks() {
  const response=await fetch('/api/voices');
  if(!response.ok)throw new Error('读取语音库失败。');
  return response.json();
}

export async function saveVoiceProfile(profile) {
  const response=await fetch('/api/voices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||'保存音色失败。')}
  return response.json();
}

export async function deleteVoiceProfile(packId,voiceId) {
  const response=await fetch(`/api/voices/${encodeURIComponent(packId)}/${encodeURIComponent(voiceId)}`,{method:'DELETE'});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||'删除音色失败。')}
  return response.json();
}

export async function listProjectJobs(projectId, { signal } = {}) {
  const response=await fetch(`/api/jobs?projectId=${encodeURIComponent(projectId)}`,{signal});
  if(!response.ok)return [];
  return (await response.json()).jobs || [];
}

export async function resumeVideoJob(job, options = {}) {
  const deadline=Date.now()+Math.max(5_000,Number(options.timeoutMs)||10*60*1000);
  while(Date.now()<deadline){
    const response=await fetch('/api/generate/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:job.taskId,route:job.route,projectId:job.projectId,shotId:job.shotId}),signal:options.signal});
    if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error || '恢复视频任务失败。')}
    const result=await response.json();if(['SUCCEEDED','FAILED','CANCELLED'].includes(result.result?.status))return result;
    await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,5000);if(options.signal){if(options.signal.aborted){clearTimeout(timer);reject(Object.assign(new Error('请求已取消'),{name:'AbortError'}));return}options.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Object.assign(new Error('请求已取消'),{name:'AbortError'}));},{once:true})}});
  }
  throw new Error('视频任务仍在供应商队列中，系统将在下次打开项目时继续恢复。');
}
