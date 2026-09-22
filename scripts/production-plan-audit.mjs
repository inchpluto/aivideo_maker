import assert from 'node:assert/strict';
import { buildProductionPlan, CHARACTER_VIEW_SPECS, PROP_VIEW_SPECS, ENVIRONMENT_VIEW_SPECS } from '../src/productionPlan.js';
import { applyProjectTask } from '../src/workflow.js';

const base = {
  id:'plan-test', title:'气象塔', synopsis:'女工程师抢修气象塔', generation:{}, manualWorkflow:{tasks:{}},
  characters:[{id:'char-1',name:'林岚',emotion:'紧张',imageReferences:[],sceneVoices:[]}],
  assets:{props:[{id:'prop-1',name:'旧钥匙',imageReferences:[]}],environments:[]},
  episodes:[{scenes:[{id:'scene-1',heading:'气象塔控制室'}],dialogues:[{id:'line-1',sceneRef:'scene-1',character:'林岚',text:'切断北侧回路。'},{id:'line-2',sceneRef:'scene-1',character:'林岚',text:'现在重新启动。'}]}],
  shots:[{id:'01',name:'警报',status:'planned'},{id:'02',name:'复位',status:'planned'}]
};

const beforeStory = buildProductionPlan(base);
assert.equal(beforeStory.total, 1);
assert.equal(beforeStory.next.task, 'story');
assert.equal(beforeStory.blockedAfterStory, true);

const storyProject = structuredClone(base);
storyProject.generation.story = {status:'done'};
storyProject.characters[0] = {...storyProject.characters[0],backstory:'导师失踪后，她独自维护气象塔，并暗中追查旧实验。',personality:'冷静、精确，压力越大越少说话。',desire:'日出前修复气象塔。',fear:'再次失去重要的人。',appearance:'短黑发、左眉细疤、深棕眼睛、瘦高体态。',appearanceDetails:{face:'清晰颧骨与左眉细疤',hair:'耳下黑色短发',body:'瘦高、肩背挺直',skin:'偏冷中性肤色',distinctiveFeatures:'左眉细疤'},wardrobe:'橙色防水工程服、银灰工具腰带、炭黑内搭。',wardrobeDetails:{silhouette:'利落直线轮廓',garments:'橙色防寒工程服',materials:'防水尼龙',palette:'橙、炭黑、银灰',accessories:'银灰工具腰带'},voice:'清晰偏低的青年女声，中速短句，普通话轻北方音色，情绪克制。',voiceProfile:{timbre:'清晰偏低的青年女声',pitch:'中低音',rhythm:'中速短句',accent:'普通话轻北方音色',baselineEmotion:'克制',dynamicRange:'紧急时略快但不喊叫'},performanceRules:['紧张时先收紧下颌再行动','说话时保持视线稳定']};
storyProject.episodes[0].scenes[0] = {...storyProject.episodes[0].scenes[0],action:'林岚按下复位键后冲向北侧回路。',conflict:'必须抢修回路，但导师留下的加密锁阻挡操作。',visualHook:'警报红光扫过她左眉细疤。',sceneBible:{timeWeather:'暴风雪前夜',layout:'圆形控制室与中央控制台',entrances:'南侧检修门通向走廊',axis:'控制台南北轴',lighting:'北侧冷蓝顶光',palette:'冷蓝、银灰、警报红',propPositions:'旧钥匙在控制台左侧'}};
storyProject.assets.props[0] = {...storyProject.assets.props[0],appearance:'11cm 磨砂黄铜钥匙，齿部带三角缺口',materialPalette:'旧黄铜与暗红锈迹',signatureDetail:'编号 17 与三角缺口',state:'雨水浸湿但完整',narrativeFunction:'开启导师封存的核心舱'};
const full = buildProductionPlan(storyProject);
assert.deepEqual(full.counts, {text:1,image:13,voice:2,video:2});
assert.equal(full.total, 18);

const contextBlocked = structuredClone(base);
contextBlocked.generation.story = {status:'done'};
const contextPlan = buildProductionPlan(contextBlocked);
assert.equal(contextPlan.total, 1);
assert.equal(contextPlan.next.id, 'story-refine');
assert.equal(contextPlan.gate, 'prompt-context');
assert.ok(contextPlan.contextAudit.gaps.length > 0);

const partial = structuredClone(storyProject);
partial.characters[0].imageReferences = [{key:'front',url:'/front.png'}];
partial.characters[0].sceneVoices = [{lineId:'line-1',sceneId:'scene-1',audioUrl:'/line-1.mp3'}];
partial.assets.props[0].imageReferences = [{key:'hero',url:'/prop.png'}];
partial.assets.environments = [{sceneId:'scene-1',scene:'气象塔控制室',viewKey:'establish',imageUrl:'/scene.png'}];
partial.shots[0] = {...partial.shots[0],imageUrl:'/shot-01.png',videoUrl:'/shot-01.mp4',probeStatus:'passed',status:'generated'};
partial.generation.editing = {status:'proposed'};
const resumed = buildProductionPlan(partial);
assert.equal(resumed.total, 11);
assert.equal(resumed.tasks.some(item=>item.id==='character-char-1-front'), false);
assert.equal(resumed.tasks.some(item=>item.id==='voice-char-1-line-1'), false);
assert.equal(resumed.tasks.some(item=>item.id==='voice-char-1-line-2'), true);
assert.equal(resumed.tasks.some(item=>item.id==='video-01'), false);

const complete = structuredClone(storyProject);
complete.characters[0].imageReferences = CHARACTER_VIEW_SPECS.map(([key,label])=>({key,label,url:`/${key}.png`}));
complete.characters[0].sceneVoices = complete.episodes[0].dialogues.map(line=>({lineId:line.id,sceneId:'scene-1',audioUrl:`/${line.id}.mp3`}));
complete.assets.props[0].imageReferences = PROP_VIEW_SPECS.map(([key,label])=>({key,label,url:`/prop-${key}.png`}));
complete.assets.environments = ENVIRONMENT_VIEW_SPECS.map(([key,label])=>({sceneId:'scene-1',scene:'气象塔控制室',viewKey:key,viewLabel:label,imageUrl:`/scene-${key}.png`}));
complete.shots = complete.shots.map(shot=>({...shot,imageUrl:`/${shot.id}.png`,videoUrl:`/${shot.id}.mp4`,probeStatus:'passed',status:'generated'}));
complete.generation.editing = {status:'applied'};
const done = buildProductionPlan(complete);
assert.equal(done.total, 0);
assert.equal(done.next, null);

const voiceOne = applyProjectTask(storyProject,'voice',{provider:'test',model:'voice',mode:'live',result:{audioUrl:'/line-1.mp3',duration:2.1}},{characterId:'char-1',lineId:'line-1',lineText:'切断北侧回路。',sceneId:'scene-1',scene:'气象塔控制室',emotion:'紧张',emotionIntensity:70});
const voiceTwo = applyProjectTask(voiceOne,'voice',{provider:'test',model:'voice',mode:'live',result:{audioUrl:'/line-2.mp3',duration:2.4}},{characterId:'char-1',lineId:'line-2',lineText:'现在重新启动。',sceneId:'scene-1',scene:'气象塔控制室',emotion:'坚定',emotionIntensity:65});
assert.equal(voiceTwo.characters[0].sceneVoices.length,2);
assert.equal(voiceTwo.characters[0].sceneVoices.find(item=>item.lineId==='line-1').audioUrl,'/line-1.mp3');
assert.equal(voiceTwo.characters[0].sceneVoices.find(item=>item.lineId==='line-2').audioUrl,'/line-2.mp3');
assert.equal(voiceTwo.timeline.filter(item=>item.mediaType==='audio').length,2);

console.log(JSON.stringify({ok:true,beforeStory:beforeStory.total,contextGate:contextPlan.contextAudit.gaps.length,full:full.counts,resumed:resumed.total,complete:done.total,voiceAssets:voiceTwo.characters[0].sceneVoices.length},null,2));
