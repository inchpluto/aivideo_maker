const PLACEHOLDER = /待确认|待设定|待补|根据.{0,12}(确认|补全|提取)|自动提取|尚未|未知|未指定|自然叙事声线/;
const text = value => String(value ?? '').trim();
export const contextPresent = value => text(value) !== '' && !PLACEHOLDER.test(text(value));

const compact = value => text(value).replace(/\s+/g, ' ');
const excerpt = value => {
  const source = compact(value);
  return source.length > 42 ? `${source.slice(0, 42)}…` : source || '未填写';
};
const detailParts = value => compact(value).split(/[，,；;、|/·\n]/).map(item => item.trim()).filter(Boolean);
const keywordHits = (value, keywords = []) => keywords.filter(keyword => compact(value).includes(keyword)).length;
const structuredCount = (value, fields = []) => value && typeof value === 'object' && !Array.isArray(value)
  ? fields.filter(field => contextPresent(value[field])).length : 0;
const describeRule = ({ minChars = 0, minParts = 0, keywords = [], minKeywords = 0, fields = [], minFields = 0 } = {}) => ({
  minChars, minParts, keywords, minKeywords, fields, minFields
});
const assessDetail = (value, rule = {}, displayValue = value) => {
  const visible = compact(displayValue);
  if (!visible || (PLACEHOLDER.test(visible) && visible.length < 20)) return { ok:false, reason:'尚未提供有效信息', current:excerpt(visible), quality:'missing' };
  if (rule.minFields && value && typeof value === 'object' && !Array.isArray(value)) {
    const count = structuredCount(value, rule.fields);
    if (count >= rule.minFields) return { ok:true, quality:'structured', current:excerpt(visible) };
    return { ok:false, reason:`结构化信息仅覆盖 ${count}/${rule.minFields} 个必要维度`, current:excerpt(visible), quality:'vague' };
  }
  const longEnough = !rule.minChars || visible.length >= rule.minChars;
  const hasPartsRule = Boolean(rule.minParts);
  const hasKeywordsRule = Boolean(rule.minKeywords);
  const partsEnough = hasPartsRule && detailParts(visible).length >= rule.minParts;
  const keywordsEnough = hasKeywordsRule && keywordHits(visible, rule.keywords) >= rule.minKeywords;
  const facetsEnough = !hasPartsRule && !hasKeywordsRule ? true : partsEnough || keywordsEnough;
  if (longEnough && facetsEnough) return { ok:true, quality:'detailed', current:excerpt(visible) };
  return { ok:false, reason:'信息过于概括，无法稳定复现', current:excerpt(visible), quality:'vague' };
};

const RULES = {
  backstory:describeRule({ minChars:12, minParts:2 }),
  personality:describeRule({ minChars:8, minParts:2 }),
  motivation:describeRule({ minChars:6 }),
  appearance:describeRule({ minChars:18, minParts:3, keywords:['发','眼','脸','肤','体态','身高','轮廓','疤','痣','年龄'], minKeywords:3, fields:['face','hair','body','skin','distinctiveFeatures'], minFields:3 }),
  wardrobe:describeRule({ minChars:14, minParts:2, keywords:['服','衣','裤','裙','鞋','材质','色','配饰','轮廓'], minKeywords:2, fields:['silhouette','garments','materials','palette','accessories'], minFields:3 }),
  voice:describeRule({ minChars:16, minParts:3, keywords:['音色','声线','音高','高音','低音','语速','节奏','口音','普通话','方言','情绪','停顿','沙哑','清亮','浑厚','气声'], minKeywords:3, fields:['timbre','pitch','rhythm','accent','baselineEmotion','dynamicRange'], minFields:4 }),
  localVoice:describeRule({ fields:['engine','referenceUrl','referenceText','rightsConfirmed'], minFields:4 }),
  performance:describeRule({ minChars:14, minParts:2 }),
  action:describeRule({ minChars:10 }), conflict:describeRule({ minChars:10 }), visualHook:describeRule({ minChars:8 }),
  scene:describeRule({ minChars:4 }),
  propAppearance:describeRule({ minChars:12, minParts:2 }), propDetail:describeRule({ minChars:6 }), propFunction:describeRule({ minChars:8 })
};

const appearanceText = value => typeof value === 'string' ? value : [
  value?.face && `脸部=${value.face}`, value?.hair && `发型=${value.hair}`,
  value?.body && `体态=${value.body}`, value?.skin && `肤色=${value.skin}`,
  value?.distinctiveFeatures && `识别特征=${value.distinctiveFeatures}`
].filter(Boolean).join('；');
const wardrobeText = value => typeof value === 'string' ? value : [
  value?.silhouette && `轮廓=${value.silhouette}`, value?.garments && `服装=${value.garments}`,
  value?.materials && `材质=${value.materials}`, value?.palette && `色板=${value.palette}`,
  value?.accessories && `配饰=${value.accessories}`
].filter(Boolean).join('；');
const voiceText = value => typeof value === 'string' ? value : [
  value?.timbre && `音色=${value.timbre}`, value?.pitch && `音高=${value.pitch}`,
  value?.rhythm && `语速节奏=${value.rhythm}`, value?.accent && `口音=${value.accent}`,
  value?.baselineEmotion && `基准情绪=${value.baselineEmotion}`, value?.dynamicRange && `情绪变化=${value.dynamicRange}`
].filter(Boolean).join('；');

export function profileToCharacter(profile = {}, existing = {}, index = 0) {
  const appearance = appearanceText(profile.appearance) || existing.appearance || '待补全外形身份锚点';
  const wardrobe = wardrobeText(profile.wardrobe) || existing.wardrobe || '待补全服装材质与色板';
  const voiceProfile = typeof profile.voice === 'object' ? profile.voice : existing.voiceProfile || {};
  const voice = voiceText(profile.voice) || existing.voice || '待补全音色、节奏与口音';
  return {
    ...existing,
    id: existing.id || `char-ai-${Date.now()}-${index}`,
    name: profile.name || existing.name || `角色 ${index + 1}`,
    role: profile.role || existing.role || (index ? '关键角色' : '主角'),
    age: profile.age || existing.age || '待确认',
    backstory: profile.backstory || existing.backstory || '',
    personality: profile.personality || existing.personality || '',
    contradiction: profile.contradiction || existing.contradiction || '',
    desire: profile.desire || existing.desire || '',
    fear: profile.fear || existing.fear || '',
    appearance, appearanceDetails: typeof profile.appearance === 'object' ? profile.appearance : existing.appearanceDetails || {},
    wardrobe, wardrobeDetails: typeof profile.wardrobe === 'object' ? profile.wardrobe : existing.wardrobeDetails || {},
    voice, voiceProfile,
    performanceRules: Array.isArray(profile.performanceRules) ? profile.performanceRules : existing.performanceRules || [],
    sourceBasis: profile.sourceBasis || existing.sourceBasis || 'inferred',
    missingFacts: Array.isArray(profile.missingFacts) ? profile.missingFacts : existing.missingFacts || [],
    emotion: profile.voice?.baselineEmotion || existing.emotion || '自然',
    voiceProvider: existing.voiceProvider || 'ElevenLabs',
    status: 'draft'
  };
}

export function characterPromptContext(character = {}) {
  return [
    `姓名=${character.name || '待确认'}`, `定位=${character.role || '待确认'}`, `年龄感=${character.age || '待确认'}`,
    `经历=${character.backstory || '待补全'}`, `性格=${character.personality || '待补全'}`, `内外矛盾=${character.contradiction || '待补全'}`,
    `欲望=${character.desire || '待补全'}`, `恐惧=${character.fear || '待补全'}`, `外形=${character.appearance || '待补全'}`,
    `服装=${character.wardrobe || '待补全'}`, `声音=${character.voice || '待补全'}`,
    `表演规则=${(character.performanceRules || []).join('；') || '待补全'}`
  ].join('；');
}

export function scenePromptContext(scene = {}) {
  const bible = scene.sceneBible || {};
  return [`场景=${scene.heading || scene.id || '待确认'}`, `动作=${scene.action || '待补全'}`, `冲突=${scene.conflict || '待补全'}`, `视觉钩子=${scene.visualHook || '待补全'}`, `时间天气=${bible.timeWeather || '待补全'}`, `布局=${bible.layout || '待补全'}`, `入口动线=${bible.entrances || '待补全'}`, `轴线=${bible.axis || '待补全'}`, `光线=${bible.lighting || '待补全'}`, `色板材质=${bible.palette || '待补全'}`, `道具位置=${bible.propPositions || '待补全'}`].join('；');
}

export function propPromptContext(prop = {}) {
  return [`道具=${prop.name || '待确认'}`, `持有者=${prop.owner || '待确认'}`, `外观=${prop.appearance || '待补全'}`, `尺寸=${prop.scale || '待补全'}`, `材质=${prop.materialPalette || '待补全'}`, `识别细节=${prop.signatureDetail || '待补全'}`, `状态=${prop.state || '待补全'}`, `叙事功能=${prop.narrativeFunction || '待补全'}`].join('；');
}

export function inspectCreativeContext(project = {}) {
  const gaps = []; let checks = 0; let passed = 0;
  const check = (stage, entityId, entity, field, label, value, severity = 'blocking', rule = {}, suggestion = '', displayValue = value) => {
    checks += 1;
    const assessment = assessDetail(value, rule, displayValue);
    if (assessment.ok) passed += 1;
    else gaps.push({ stage, entityId, entity, field, label, severity, ...assessment, suggestion });
  };
  for (const character of project.characters || []) {
    const id = character.id || character.name; const entity = character.name || id;
    check('人物', id, entity, 'backstory', '经历与关系背景', character.backstory, 'blocking', RULES.backstory, '写清关键经历、人物关系及其对当前选择的影响');
    check('人物', id, entity, 'personality', '性格与行为方式', character.personality, 'blocking', RULES.personality, '给出至少两项可被镜头观察的性格与行为习惯');
    check('人物', id, entity, 'desire', '核心欲望', character.desire, 'blocking', RULES.motivation, '写成可行动、可验证的当前目标');
    check('人物', id, entity, 'fear', '内在恐惧', character.fear, 'blocking', RULES.motivation, '说明角色害怕失去什么，以及会怎样影响选择');
    const appearanceSource = Object.keys(character.appearanceDetails || {}).length ? character.appearanceDetails : character.appearance;
    check('人物', id, entity, 'appearance', '脸部/发型/体态/识别特征', appearanceSource, 'blocking', RULES.appearance, '至少明确脸部、发型、体态、肤色、唯一识别特征中的三项', character.appearance || appearanceText(appearanceSource));
    const wardrobeSource = Object.keys(character.wardrobeDetails || {}).length ? character.wardrobeDetails : character.wardrobe;
    check('人物', id, entity, 'wardrobe', '服装轮廓/材质/色板', wardrobeSource, 'blocking', RULES.wardrobe, '至少明确服装轮廓、单品、材质、色板、配饰中的三项', character.wardrobe || wardrobeText(wardrobeSource));
    const localVoice = /index|f5/i.test(character.voiceEngine || '') && /local/i.test(character.voiceEngine || '');
    const voiceSource = localVoice ? { engine:character.voiceEngine, referenceUrl:character.voiceReferenceUrl, referenceText:character.voiceReferenceText, rightsConfirmed:character.voiceRightsConfirmed } : (Object.keys(character.voiceProfile || {}).length ? character.voiceProfile : character.voice);
    const voiceLabel = localVoice ? '参考音频/文本/授权/本地引擎' : '音色/音高/语速/口音';
    const voiceSuggestion = localVoice ? '选择 5–10 秒干净参考音频，填写对应原文并确认使用权；情绪与节奏由逐句参数控制' : '至少明确音色、音高、语速节奏、口音/语言、基准情绪、动态范围中的四项';
    check('声音', id, entity, 'voice', voiceLabel, voiceSource, 'blocking', localVoice ? RULES.localVoice : RULES.voice, voiceSuggestion, localVoice ? `引擎=${character.voiceEngine||'未选'}；参考=${character.voiceReferenceUrl?'已绑定':'未绑定'}；文本=${character.voiceReferenceText||'未填写'}；授权=${character.voiceRightsConfirmed?'已确认':'未确认'}` : character.voice || voiceText(voiceSource));
    check('声音', id, entity, 'performanceRules', '表演与情绪变化规则', (character.performanceRules || []).join('；'), 'blocking', RULES.performance, '给出至少两条“触发情境 → 可听见或可看见变化”的表演规则');
  }
  const scenes = (project.episodes || []).flatMap(item => item.scenes || []);
  for (const scene of scenes) {
    const id = scene.id || scene.heading; const entity = scene.heading || id; const bible = scene.sceneBible || {};
    check('情节', id, entity, 'action', '可观察动作', scene.action, 'blocking', RULES.action, '用主语、动作、对象写出镜头能够直接拍到的行为');
    check('情节', id, entity, 'conflict', '目标与阻力', scene.conflict, 'blocking', RULES.conflict, '同时写清角色目标、阻力与失败代价');
    check('情节', id, entity, 'visualHook', '视觉钩子', scene.visualHook, 'blocking', RULES.visualHook, '给出一个可构图、可识别、能承载情绪的视觉事件');
    const sceneSuggestions={timeWeather:'明确时段、天气及环境状态',layout:'说明前中后景、主要物体与角色活动区',entrances:'说明出入口、角色进入方向和运动路径',axis:'确定主要人物或动作的 180°轴线',lighting:'明确主光方向、色温和明暗关系',palette:'明确主色、辅色与主要材质',propPositions:'写清关键道具相对人物和固定物的位置'};
    for (const [field, label] of [['timeWeather','时间天气'],['layout','空间布局'],['entrances','入口与动线'],['axis','180°轴线'],['lighting','主光方向'],['palette','色板与材质'],['propPositions','道具位置']]) check('场景', id, entity, `sceneBible.${field}`, label, bible[field], 'blocking', RULES.scene, sceneSuggestions[field]);
  }
  for (const prop of project.assets?.props || []) {
    const id = prop.id || prop.name; const entity = prop.name || id;
    const propRules={appearance:RULES.propAppearance,materialPalette:RULES.propDetail,signatureDetail:RULES.propDetail,state:RULES.propDetail,narrativeFunction:RULES.propFunction};
    const propSuggestions={appearance:'明确尺寸、形状、颜色和磨损特征',materialPalette:'明确主材质、表面质感和色板',signatureDetail:'给出跨镜头保持不变的唯一识别标记',state:'说明该情节时刻的完整、损坏、开启或持有状态',narrativeFunction:'说明它推动哪一步行动、冲突或信息揭示'};
    for (const [field,label] of [['appearance','外形尺寸与颜色'],['materialPalette','材质与色板'],['signatureDetail','唯一识别细节'],['state','剧情状态'],['narrativeFunction','叙事功能']]) check('道具',id,entity,field,label,prop[field],'blocking',propRules[field],propSuggestions[field]);
  }
  const blocking = gaps.filter(item => item.severity === 'blocking');
  const grouped = Object.groupBy ? Object.groupBy(gaps, item => item.stage) : gaps.reduce((map, item) => ({ ...map, [item.stage]:[...(map[item.stage] || []), item] }), {});
  const revisionBrief = gaps.length ? `请依据现有梗概、人物关系和场景因果只补全以下生产信息；原文明确内容标为 explicit，合理推断标为 inferred，纯创作补足标为 proposed；保留现有情节顺序、已确认事实和用户硬约束，不得借补全之名重写故事：\n${gaps.slice(0, 40).map(item => `- [${item.stage}] ${item.entity}｜${item.label}｜当前：${item.current}｜问题：${item.reason}｜补写：${item.suggestion}`).join('\n')}` : '人物、声音、情节、场景与道具生产信息已达到可复现标准。';
  return { version:'1.1.0', score:checks?Math.round(passed/checks*100):0, checks, passed, gaps, blocking, grouped, revisionBrief, complete:gaps.length===0 };
}
