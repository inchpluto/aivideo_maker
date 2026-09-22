import assert from 'node:assert/strict';
import { characterPromptContext, inspectCreativeContext, profileToCharacter } from '../shared/creativeContext.mjs';
import { compilePromptTask } from '../server/prompts.mjs';
import { inspectWorkflow } from '../server/pipeline.mjs';

const incomplete = {
  characters:[{ id:'c1', name:'林岚', appearance:'待确认', voice:'自然叙事声线' }],
  episodes:[{ scenes:[{ id:'s1', heading:'气象塔控制室', action:'自动提取', sceneBible:{ layout:'待确认' } }] }],
  assets:{ props:[{ id:'p1', name:'旧钥匙', appearance:'待补全' }] }
};
const incompleteAudit = inspectCreativeContext(incomplete);
assert.ok(incompleteAudit.gaps.some(item => item.stage === '人物' && item.field === 'appearance'));
assert.ok(incompleteAudit.gaps.some(item => item.stage === '声音' && item.field === 'voice'));
assert.ok(incompleteAudit.gaps.some(item => item.stage === '场景' && item.field === 'sceneBible.axis'));
assert.ok(incompleteAudit.gaps.some(item => item.stage === '道具' && item.field === 'signatureDetail'));
assert.ok(incompleteAudit.gaps.every(item => item.reason && item.suggestion));

const vague = {
  characters:[{ id:'c1', name:'林岚', backstory:'工程师', personality:'冷静', desire:'修好机器', fear:'失败', appearance:'黑发女孩', wardrobe:'橙色外套', voice:'青年女声，偏低', performanceRules:['紧张'] }],
  episodes:[{ scenes:[{ id:'s1', heading:'仓库', action:'她走进去', conflict:'遇到困难', visualHook:'红灯', sceneBible:{ timeWeather:'夜晚', layout:'仓库内', entrances:'大门', axis:'人物轴线', lighting:'冷光', palette:'蓝色', propPositions:'桌上' } }] }],
  assets:{ props:[{ id:'p1', name:'旧钥匙', appearance:'黄色钥匙', materialPalette:'金属', signatureDetail:'划痕', state:'完好', narrativeFunction:'开门' }] }
};
const vagueAudit = inspectCreativeContext(vague);
assert.ok(vagueAudit.gaps.some(item => item.field === 'appearance' && item.quality === 'vague'));
assert.ok(vagueAudit.gaps.some(item => item.field === 'voice' && item.quality === 'vague'));
assert.ok(vagueAudit.gaps.some(item => item.field === 'sceneBible.layout' && item.reason.includes('概括')));
assert.match(vagueAudit.revisionBrief, /当前：黑发女孩/);
assert.match(vagueAudit.revisionBrief, /补写：至少明确脸部/);

const localVoiceReady = structuredClone(vague);
localVoiceReady.characters[0] = {...localVoiceReady.characters[0],voiceEngine:'index_tts_local',voiceReferenceUrl:'/voice.wav',voiceReferenceText:'今晚必须找到那扇门',voiceRightsConfirmed:true};
const localVoiceAudit = inspectCreativeContext(localVoiceReady);
assert.equal(localVoiceAudit.gaps.some(item => item.stage === '声音' && item.field === 'voice'), false);

const character = profileToCharacter({
  name:'林岚', role:'主角 / 气象工程师', age:'29 岁',
  backstory:'导师失踪后独自维护海港气象塔，与旧实验存在未解关系。', personality:'冷静、精确，压力越大越少说话。',
  contradiction:'依赖证据，却害怕证据证明导师背叛了她。', desire:'在日出前修复气象塔并查明真相。', fear:'再次失去重要的人。',
  appearance:{ face:'清晰颧骨、左眉细疤、深棕眼睛', hair:'耳下黑色短发', body:'瘦高、肩背挺直', skin:'偏冷中性肤色', distinctiveFeatures:'左眉细疤与专注凝视' },
  wardrobe:{ silhouette:'利落直线轮廓', garments:'橙色防寒工程服', materials:'防水尼龙与磨砂金属扣件', palette:'橙、炭黑、银灰', accessories:'银灰工具腰带' },
  voice:{ timbre:'清晰偏低的青年女声', pitch:'中低音', rhythm:'短句、稳定中速', accent:'普通话轻北方音色', baselineEmotion:'克制', dynamicRange:'紧急时语速略快但不喊叫' },
  performanceRules:['紧张时先收紧下颌再行动','说谎时避开对方目光不超过一秒'], sourceBasis:'proposed'
});
const complete = {
  title:'气象塔', type:'AI 短剧', synopsis:'林岚必须在日出前修复失控气象塔。', settings:{aspectRatio:'9:16'},
  characters:[character],
  episodes:[{ hook:'警报倒计时三分钟', cliffhanger:'导师实验重新启动', dialogues:[{character:'林岚',text:'切断北侧回路。'}], scenes:[{
    id:'s1', heading:'内景 · 气象塔控制室 · 夜', action:'林岚按下复位键后冲向北侧回路。', conflict:'她必须抢修回路，但导师留下的加密锁阻挡操作。', visualHook:'警报红光扫过她左眉细疤。',
    sceneBible:{ timeWeather:'暴风雪前夜', layout:'圆形控制室与中央控制台', entrances:'南侧检修门通向环形走廊', axis:'控制台南北轴', lighting:'北侧冷蓝顶光与南侧警报红光', palette:'冷蓝、银灰、警报红与湿润金属', propPositions:'旧钥匙固定在控制台左侧凹槽' }
  }] }],
  assets:{ props:[{ id:'p1', name:'旧钥匙', owner:'林岚', appearance:'11cm 磨砂黄铜钥匙，齿部三角缺口', scale:'11cm', materialPalette:'旧黄铜与暗红锈迹', signatureDetail:'编号 17 与三角缺口', state:'雨水浸湿但完整', narrativeFunction:'开启导师封存的气象塔核心舱' }] }
};
const completeAudit = inspectCreativeContext(complete);
assert.equal(completeAudit.complete, true);
assert.equal(completeAudit.score, 100);
assert.match(characterPromptContext(character), /左眉细疤/);
assert.match(characterPromptContext(character), /紧急时语速略快/);

const storyPrompt = compilePromptTask('story', {
  title:complete.title, type:complete.type, synopsis:complete.synopsis, episodeLength:60, aspectRatio:'9:16', genre:'科幻悬疑', audience:'短视频观众', visualStyle:'电影级写实', sourceText:complete.synopsis,
  revisionMode:'context-repair', existingEpisodes:complete.episodes,
  contextGaps:incompleteAudit.gaps.slice(0,3).map(item=>`[${item.stage}] ${item.entity}:${item.label}`).join('；'), revisionInstruction:incompleteAudit.revisionBrief
});
assert.match(storyPrompt.prompt, /上一轮生产上下文缺项/);
assert.match(storyPrompt.prompt, /脸部\/发型\/体态\/识别特征/);
assert.match(storyPrompt.prompt, /任务模式：context-repair/);
assert.match(storyPrompt.prompt, /当前剧本 JSON/);
assert.match(storyPrompt.prompt, /气象塔控制室/);
assert.match(storyPrompt.prompt, /不得借补全之名重写故事/);
const workflow = inspectWorkflow(incomplete);
assert.equal(workflow.promptContext.gaps.length, incompleteAudit.gaps.length);
assert.ok(workflow.risks.some(item => item.includes('生产上下文缺')));

console.log(JSON.stringify({ ok:true, incompleteGaps:incompleteAudit.gaps.length, completeScore:completeAudit.score, promptVersion:storyPrompt.version }, null, 2));
