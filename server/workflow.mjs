import { inspectCreativeContext, profileToCharacter } from '../shared/creativeContext.mjs';
import { createHash } from 'node:crypto';
import { buildSourceChunkPlan } from './sourceChunks.mjs';
import { synchronizeAssetVersions } from '../shared/assetVersions.mjs';

const rawText = value => String(value || '');
const clean = value => rawText(value).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
const short = (value, size = 80) => clean(value).replace(/\s+/g, ' ').slice(0, size);

const sha256 = value => createHash('sha256').update(String(value), 'utf8').digest('hex');

export function analyzeNovelText({ text, filename = '导入小说.txt', type = 'AI 短剧', episodeLength = 90 }) {
  const original = rawText(text);
  const source = clean(original);
  if (source.length < 20) throw new Error('小说内容过短，请至少提供 20 个字符。');
  const markers = [...source.matchAll(/^(第[零一二三四五六七八九十百千\d]+[章节回幕卷]|chapter\s+\d+)[^\n]*$/gim)];
  const markedChapters = markers.map((match, index) => ({ title: clean(match[0]), text: source.slice(match.index + match[0].length, markers[index + 1]?.index ?? source.length).trim(), sourceStart: match.index, sourceEnd: markers[index + 1]?.index ?? source.length })).filter(item => item.text);
  // A one-line novel that starts with “第一章” can be consumed entirely by the heading regex.
  // Keep the original text as a safe chapter so manual/no-key imports never create an empty story.
  const chapters = markedChapters.length ? markedChapters : [{ title: '第一章', text: source, sourceStart: 0, sourceEnd: source.length }];
  const chapterIndex = chapters.map((chapter, index) => ({ id: `chapter-${String(index + 1).padStart(3, '0')}`, title: chapter.title, sourceStart: chapter.sourceStart, sourceEnd: chapter.sourceEnd, textHash: sha256(chapter.text) }));
  const sourceChunkPlan = buildSourceChunkPlan(original);
  const nameScores = new Map();
  for (const match of source.matchAll(/(?:^|[\n。！？!?])\s*([\u4e00-\u9fa5]{2,4})(?:（[^）]*）|\([^)]*\))?\s*[：:]/g)) nameScores.set(match[1], (nameScores.get(match[1]) || 0) + 3);
  for (const match of source.matchAll(/([\u4e00-\u9fa5]{2,4})(?:说|问|喊|答|低声道|轻声说)/g)) nameScores.set(match[1], (nameScores.get(match[1]) || 0) + 1);
  const blocked = new Set(['这个', '那个', '他们', '她们', '自己', '然后', '突然']);
  const names = [...nameScores.entries()].filter(([name]) => !blocked.has(name)).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  if (!names.length) names.push('主角', '关键角色'); else if (names.length === 1) names.push('关键角色');
  const characters = names.map((name, index) => ({ id: `char-${index + 1}`, name, role: index === 0 ? '主角' : '配角', age: index === 0 ? '24 岁' : '待设定', appearance: index === 0 ? '黑色短发，琥珀色眼睛，芥末黄雨衣；神情克制、警觉。' : '根据原文描写自动提取，生成前可继续补充。', desire: index === 0 ? '找到被隐藏的真相' : '推动主角做出选择', fear: '失去重要的人', voice: index === 0 ? '青年女声 · 清澈偏低' : '自然叙事声线', voiceProvider: 'ElevenLabs', emotion: '平静', status: index === 0 ? 'ready' : 'draft' }));
  const dialogues = [];
  for (const match of source.matchAll(/(?:^|[\n。！？!?])\s*([\u4e00-\u9fa5]{2,4})(?:（([^）]*)）|\(([^)]*)\))?\s*[：:]\s*([^\n。！？!?]+)/g)) dialogues.push({ character: match[1], emotion: match[2] || match[3] || '自然', text: clean(match[4]) });
  if (!dialogues.length) dialogues.push({ character: characters[0].name, emotion: '迟疑', text: '我必须知道真相。' }, { character: characters[1]?.name || '旁白', emotion: '遥远', text: '入口一直都在，只是你还没有选择。' });
  const grammar = [['远景', '缓慢推进', '建立环境'], ['中景', '横移跟拍', '人物入场'], ['特写', '焦点转移', '线索出现'], ['全景', '低机位推轨', '动作升级'], ['大特写', '极慢推近', '情绪决定'], ['中近景', '手持轻晃', '冲突峰值']];
  const paragraphs = chapters.flatMap(chapter => chapter.text.split(/\n{2,}|[。！？!?]\s*/).filter(line => clean(line).length > 5));
  const shots = grammar.map(([shotType, move, purpose], index) => ({ id: String(index + 1).padStart(2, '0'), name: short(paragraphs[index] || dialogues[index]?.text || purpose, 8), type: shotType, move, purpose, visualContent:short(paragraphs[index]||purpose,100),narrativePurpose:purpose,sound:dialogues[index]?.text?`对白：${dialogues[index].text}`:'场景环境声连续',tone: ['冷蓝', '青橙', '暖红', '冷蓝', '琥珀', '中性'][index], duration: 3, crop: ['wide', 'medium', 'detail', 'train', 'face', 'medium'][index], prompt: `${short(paragraphs[index] || purpose, 70)}。${shotType}，${move}，${purpose}，电影光影，保持角色、服装、道具位置、场景轴线与主光方向连续。`, dialogue: dialogues[index]?.text || '', status: index < 2 ? 'ready' : 'planned' }));
  const title = filename.replace(/\.(txt|md|json)$/i, '') || '未命名作品';
  const now = new Date().toISOString();
  return { id: `project-${Date.now()}`, title, type, updatedAt: now, source: { filename, characters: source.length, chapters: chapters.length, importedAt: now, encoding: 'utf-8', normalizedForParsing: true, originalSha256: sha256(original), originalCharacters: original.length, chapterIndex, chunkPlan: { version: sourceChunkPlan.version, maxChars: sourceChunkPlan.maxChars, overlapChars: sourceChunkPlan.overlapChars, chapterCount: sourceChunkPlan.chapterCount, chunkCount: sourceChunkPlan.chunkCount, coveredChars: sourceChunkPlan.coveredChars, sourceHash: sourceChunkPlan.sourceHash, chunks: sourceChunkPlan.chunks } }, settings: { aspectRatio: '9:16', fps: 24 }, production: { strategy: 'identity-prop-scene-set-image-to-video', hookTargetSeconds: 1, preferredShotDuration:3,shotDurationRange: [1, 10], variantCount: 2 }, workflow: { current: 'script', completion: 28, episodeLength }, synopsis: short(chapters[0].text, 110), structure: '三幕式', episodes: [{ id: 'ep-01', title: '第 1 集 · 命运的入口', duration: episodeLength, scenes: chapters.slice(0, 4).map((chapter, index) => ({ id: `scene-${index + 1}`, heading: `${index + 1}. ${index ? '内景' : '外景'} · ${chapter.title} · 夜`, action: short(chapter.text, 180), purpose: ['建立钩子', '触发事件', '升级冲突', '留下悬念'][index] || '推进剧情',beat:['发现','发展','对抗','转折'][index]||'发展',conflict:'待从原文确认',visualHook:'待从原文确认',sceneBible:{timeWeather:'夜 / 天气按原文',layout:'固定主空间与前中后景关系',entrances:'锁定主要入口与人物动线',axis:'以主要人物关系线为180度轴线',lighting:'主光方向固定，延续前后镜',palette:'遵循故事圣经色板',propPositions:'关键道具位置按资产图锁定'} })), dialogues: dialogues.slice(0, 12) }], characters,assets:{props:[],environments:[]},shotGroups:shots.map((shot,index)=>({id:`group-${index+1}`,label:`镜头组 ${index+1}`,shotIds:[shot.id]})),shots, timeline: shots.map((shot, index) => ({ id: `clip-${shot.id}`, track: 0, start: shots.slice(0, index).reduce((sum, item) => sum + item.duration, 0), duration: shot.duration, label: `${shot.id} ${shot.name}`, status: shot.status })), jobs: [{ id: 'job-script', label: '小说拆解与剧本', provider: '星幕故事引擎', status: 'done' }, { id: 'job-character', label: '角色圣经', provider: '星幕角色画师', status: 'done' }, { id: 'job-board', label: '分镜规划', provider: '星幕镜头引擎', status: 'done' }, { id: 'job-media', label: '视听素材生成', provider: '按需生成', status: 'waiting' }, { id: 'job-edit', label: '剪辑与导出', provider: '星幕剪辑导演', status: 'waiting' }] };
}

export function partitionImportedEpisodes(project, { text = '', episodeCount = 1 } = {}) {
  const source = clean(text); if (!source || !project) return project;
  const markers = [...source.matchAll(/^(第[零一二三四五六七八九十百千\d]+[章节回幕卷]|chapter\s+\d+)[^\n]*$/gim)];
  const chapters = markers.length ? markers.map((match, index) => ({ title: clean(match[0]), text: source.slice(match.index + match[0].length, markers[index + 1]?.index ?? source.length).trim() })).filter(item => item.text) : [{ title: '第一章', text: source }];
  const count = Math.max(1, Math.min(Number(episodeCount) || 1, chapters.length)); const size = Math.ceil(chapters.length / count); const characters = project.characters || [];
  const episodes = Array.from({ length: count }, (_, episodeIndex) => {
    const group = chapters.slice(episodeIndex * size, (episodeIndex + 1) * size); const episodeText = group.map(item => item.text).join('\n');
    const lines = [...episodeText.matchAll(/(?:^|[\n。！？!?])\s*([\u4e00-\u9fa5]{2,4})(?:（([^）]*)）|\(([^)]*)\))?\s*[：:]\s*([^\n。！？!?]+)/g)].map(match => ({ character: match[1], emotion: match[2] || match[3] || '自然', text: clean(match[4]) }));
    const dialogues = lines.length ? lines.slice(0, 12) : [{ character: characters[0]?.name || '主角', emotion: '自然', text: '我必须继续查下去。' }, { character: characters[1]?.name || '旁白', emotion: '克制', text: '线索还没有结束。' }];
    return { id: `ep-${String(episodeIndex + 1).padStart(2, '0')}`, title: `第 ${episodeIndex + 1} 集 · ${group[0]?.title || '未命名章节'}`, duration: project.workflow?.episodeLength || 90, scenes: group.map((chapter, sceneIndex) => ({ id: `ep${episodeIndex + 1}-scene-${sceneIndex + 1}`, heading: `${sceneIndex + 1}. ${episodeIndex ? '内景' : '外景'} · ${chapter.title} · 夜`, action: short(chapter.text, 180), purpose: ['建立钩子', '触发事件', '升级冲突', '留下悬念'][sceneIndex] || '推进剧情', beat: ['发现', '发展', '对抗', '转折'][sceneIndex] || '发展', conflict: '待从原文确认', visualHook: '待从原文确认', sceneBible: { timeWeather: '夜 / 天气按原文', layout: '固定主空间与前中后景关系', entrances: '锁定主要入口与人物动线', axis: '以主要人物关系线为180度轴线', lighting: '主光方向固定，延续前后镜', palette: '遵循故事圣经色板', propPositions: '关键道具位置按资产图锁定' } })), dialogues };
  });
  const shots = (project.shots || []).map((shot, index) => { const episodeIndex = Math.min(count - 1, Math.floor(index / Math.max(1, Math.ceil((project.shots || []).length / count)))); const episode = episodes[episodeIndex]; return { ...shot, episodeId: episode.id, sceneRef: episode.scenes[Math.min(episode.scenes.length - 1, Math.floor(index / 2))]?.id || `${episode.id}-scene-1` }; });
  return { ...project, episodes, shots, shotGroups: [...new Set(shots.map(item => item.groupId || 'group-1'))].map((id, index) => ({ id, label: `镜头组 ${index + 1}`, shotIds: shots.filter(item => (item.groupId || 'group-1') === id).map(item => item.id) })), timeline: shots.map((shot, index) => ({ id: `clip-${shot.id}`, track: 0, start: shots.slice(0, index).reduce((sum, item) => sum + item.duration, 0), duration: shot.duration, label: `${shot.id} ${shot.name}`, status: shot.status, episodeId: shot.episodeId })) };
}

const pathTokens = value => String(value || '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
const readPath = (root, path) => pathTokens(path).reduce((current, token) => { if (current === undefined || current === null) return undefined; if (Array.isArray(current)) return current.find(item => String(item?.id) === token) ?? current[Number(token)]; return current[token]; }, root);
const writePath = (root, path, value) => { const tokens = pathTokens(path); let current = root; for (const [index, token] of tokens.entries()) { const last = index === tokens.length - 1; if (Array.isArray(current)) { let next = current.find(item => String(item?.id) === token); if (!next) { next = {}; current.push(next); } if (last) { const position = current.indexOf(next); current[position] = value; } else current = next; } else if (last) current[token] = value; else { current[token] ??= {}; current = current[token]; } } return root; };
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const valueDigest = value => createHash('sha256').update(JSON.stringify(value ?? null), 'utf8').digest('hex').slice(0, 16);
const lockedFieldList = project => [...new Set([...(Array.isArray(project?.lockedFields) ? project.lockedFields : []), ...(Array.isArray(project?.locks?.fields) ? project.locks.fields : [])].filter(Boolean).map(String))];
const protectLockedFields = (previous, candidate) => { const protectedFields = []; for (const field of lockedFieldList(previous)) { const before = readPath(previous, field); const after = readPath(candidate, field); if (before !== undefined && !sameValue(before, after)) { writePath(candidate, field, before); protectedFields.push(field); } } return protectedFields; };
const buildRevisionProposal = (previous, candidate, protectedFields, generation) => { const fields = ['title', 'synopsis', 'theme', 'storyBible', 'platformPlan', 'characters', 'episodes', 'shots', 'timeline']; const changes = fields.flatMap(field => { const before = previous?.[field]; const after = candidate?.[field]; return sameValue(before, after) ? [] : [{ path: field, beforeHash: valueDigest(before), afterHash: valueDigest(after), locked: protectedFields.includes(field) }]; }); return { id: `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: protectedFields.length ? 'applied-with-locks' : 'applied', generatedAt: new Date().toISOString(), provider: generation.provider || '', model: generation.model || '', mode: generation.mode || '', changes, protectedFields, sourceRevision: previous?.revision ?? null }; };
const revisionSnapshot = (project, proposal) => ({ id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: 'AI 生成前自动快照', createdAt: new Date().toISOString(), proposalId: proposal.id, revision: project.revision ?? null, snapshot: { title: project.title, synopsis: project.synopsis, theme: project.theme, storyBible: project.storyBible, platformPlan: project.platformPlan, characters: project.characters, episodes: project.episodes, shots: project.shots, timeline: project.timeline } });

export function applyScreenplay(project, generation) {
  const screenplay = generation?.result?.screenplay || generation?.screenplay;
  if (!screenplay?.episodes?.length) return project;
  const episodes = screenplay.episodes.map((episode, episodeIndex) => ({
    id: `ep-${String(episodeIndex + 1).padStart(2, '0')}`,
    title: episode.title, hook: episode.hook || '', cliffhanger: episode.cliffhanger || '',
    duration: project.workflow?.episodeLength || 90,
    scenes: episode.scenes.map((scene, sceneIndex) => ({ id: `ep${episodeIndex + 1}-scene-${sceneIndex + 1}`, sceneBible:{timeWeather:'待确认',layout:'待确认',entrances:'待确认',axis:'待确认',lighting:'待确认',palette:'待确认',propPositions:'待确认'}, ...scene })),
    dialogues: episode.dialogues.map((line, lineIndex) => ({ id: `ep${episodeIndex + 1}-dialogue-${lineIndex + 1}`, ...line }))
  }));
  const grammar = [
    ['远景', '缓慢推进', 'wide', '冷蓝'], ['中景', '横移跟拍', 'medium', '青橙'],
    ['特写', '焦点转移', 'detail', '暖红'], ['全景', '低机位推轨', 'train', '冷蓝'],
    ['大特写', '极慢推近', 'face', '琥珀'], ['中近景', '手持轻晃', 'medium', '中性']
  ];
  const sceneSeeds = episodes.flatMap(episode => episode.scenes.flatMap(scene => [
    { name: scene.purpose, content: scene.action, purpose: scene.purpose, hook: scene.visualHook },
    { name: scene.conflict, content: scene.conflict, purpose: '推进冲突', hook: scene.visualHook }
  ]));
  const planned = Array.isArray(screenplay.storyboard) && screenplay.storyboard.length ? screenplay.storyboard : sceneSeeds.slice(0, 12);
  const shots = planned.map((seed, index) => {
    const [type, move, crop, tone] = grammar[index % grammar.length];
    const dialogue = episodes.flatMap(episode => episode.dialogues)[index]?.text || '';
    const subjectAction = seed.subjectAction || seed.content || seed.purpose;
    const environmentAction = seed.environmentAction || seed.hook || '环境产生与主体动作呼应的细微变化';
    const shotType = seed.type || type; const shotMove = seed.move || move;
    return { id: String(index + 1).padStart(2, '0'), groupId:seed.groupId||`group-${Math.floor(index/3)+1}`,sceneRef: seed.sceneRef || String(Math.floor(index / 2) + 1),scene:seed.scene||'',timeRange: seed.timeRange || '', characters: seed.characters || [], audio: seed.sound||seed.audio || '',sound:seed.sound||seed.audio||'',caption: seed.caption || '', transition: seed.transition || '', name: short(seed.name || seed.purpose, 9), type: shotType, angle: seed.angle || '平视', move: shotMove, composition: seed.composition || '三分法', crop, tone: seed.lighting || tone, lighting: seed.lighting || tone, purpose: seed.narrativePurpose||seed.purpose || subjectAction,narrativePurpose:seed.narrativePurpose||seed.purpose||subjectAction,visualContent:seed.visualContent||`${subjectAction}；${environmentAction}`,duration: Math.max(1, Math.min(10, Number(seed.duration) || 3)), subjectAction, environmentAction, startFrame: seed.startFrame || `${subjectAction}开始前的稳定构图`, endFrame: seed.endFrame || `${subjectAction}完成并为下一镜留下动作`, negativePrompt: seed.negativePrompt || '人物换脸，服装变化，道具漂移，空间跳轴，多余肢体，镜头抖动', continuity: seed.continuity || ['角色身份锚点','服装与道具','场景轴线','光线方向'], prompt: `${short(subjectAction, 90)}。环境：${short(environmentAction, 70)}。${shotType}，${seed.angle || '平视'}，${shotMove}，${seed.composition || '三分法'}，${seed.lighting || '电影级光影'}。首帧：${seed.startFrame || '稳定建立主体位置'}。尾帧：${seed.endFrame || '动作完成并承接下一镜'}。连续性：${(seed.continuity || ['角色身份','服装道具','场景方位']).join('、')}。`, dialogue, status: 'planned', validation: { subject: true, camera: true, environment: true, continuity: true, keyframes: true } };
  });
  const timeline = shots.map((shot, index) => ({ id: `clip-${shot.id}`, track: 0, start: shots.slice(0, index).reduce((sum, item) => sum + item.duration, 0), duration: shot.duration, label: `${shot.id} ${shot.name}`, status: 'planned' }));
  const profiles = screenplay.storyBible?.characterProfiles || [];
  const existingByName = new Map((project.characters || []).map(item => [item.name, item]));
  const characterNames = [...new Set([...profiles.map(item => item.name), ...episodes.flatMap(item => item.dialogues).map(item => item.character)].filter(Boolean))];
  const characters = characterNames.map((name, index) => profileToCharacter(profiles.find(item => item.name === name) || { name }, existingByName.get(name), index));
  // 只保留剧情中确实出现的道具：检查道具名是否出现在场景动作、对白、场景圣经道具位置或角色服装里。
  // 剧情未提及的道具（如预置的“旧照片/门禁卡”占位）一律过滤，避免为剧情之外的道具生成无意义的补全任务。
  const rawProps = screenplay.storyBible?.props || project.assets?.props || [];
  const storyText = episodes.flatMap(episode => [
    ...episode.scenes.map(scene => [scene.action, scene.purpose, scene.conflict, scene.sceneBible?.propPositions].filter(Boolean).join(' ')),
    ...episode.dialogues.map(line => `${line.character} ${line.text} ${line.subtext || ''}`)
  ].filter(Boolean)).join(' ') + ' ' + profiles.map(profile => profile.wardrobe || '').join(' ');
  const props = rawProps.filter(prop => !String(prop.name || '').trim() || /待|占位|new|新道具/i.test(String(prop.name || '')) ? false : storyText.includes(String(prop.name).trim()));
  const next = {
    ...project,
    title: screenplay.title || project.title,
    synopsis: screenplay.logline || project.synopsis,
    theme: screenplay.theme,
    storyBible: screenplay.storyBible || project.storyBible,
    characters: characters.length ? characters : project.characters,
    episodes,
    assets:{...(project.assets||{}),props,environments:project.assets?.environments||[]},
    shotGroups:[...new Set(shots.map(item=>item.groupId))].map((id,index)=>({id,label:`镜头组 ${index+1}`,shotIds:shots.filter(item=>item.groupId===id).map(item=>item.id)})),
    shots,
    timeline,
    generation: { story: { status: 'done', provider: generation.provider, model: generation.model, mode: generation.mode, generatedAt: new Date().toISOString() } },
    workflow: { ...project.workflow, current: 'script', completion: 58 },
    jobs: project.jobs.map(job => ['job-script', 'job-character', 'job-board'].includes(job.id) ? { ...job, status: 'done', provider: job.id === 'job-script' ? generation.provider : job.provider } : job)
  };
  const protectedFields = protectLockedFields(project, next); const revisionProposal = buildRevisionProposal(project, next, protectedFields, generation); const withHistory = { ...next, versions: [...(project.versions || []), revisionSnapshot(project, revisionProposal)], revisionProposal, generation: { ...(next.generation || {}), story: { ...(next.generation?.story || {}), revisionProposalId: revisionProposal.id, protectedFields } } };
  const versioned = synchronizeAssetVersions(withHistory); return { ...versioned, promptContextAudit: inspectCreativeContext(versioned) };
}
