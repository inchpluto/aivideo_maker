import assert from 'node:assert/strict';
import { compilePromptTask } from '../server/prompts.mjs';

const plannedBrief = {
  title: '气象塔', type: 'AI 短剧', synopsis: '女工程师必须在日出前修复失控气象塔，否则海港会被冻结。她发现故障来自导师留下的旧实验。',
  sourceType: 'creative-brief', creativeMode: 'planned', designConstraints: '主角是女工程师；气象塔必须保留；工程逻辑可解释',
  mustKeep: '气象塔、导师的旧实验', avoid: '梦境反转、无因果巧合', targetEnding: '主角完成修复并理解导师的选择',
  episodeLength: 60, aspectRatio: '9:16', genre: '科幻 / 冒险', audience: '短视频观众', visualStyle: '电影级写实',
  publishPlatform: 'YouTube Shorts / Bilibili', adaptation: '严格遵守已确认方案，只补全可拍摄结构', sourceText: '用户确认的创作简报'
};

const sceneAnchor = '时间天气=暴风雪前夜；布局=圆形控制室与中央控制台；出入口=南侧检修门；轴线=控制台南北轴；光向=蓝色顶光从北侧；色板=冷蓝与警报红；道具位置=旧钥匙在控制台左侧';
const samples = {
  story: plannedBrief,
  character: { name:'林岚',role:'主角 / 气象工程师',age:'29 岁',appearance:'短黑发、左眉细疤、深棕眼睛、清晰颧骨与坚毅神态',wardrobe:'橙色防寒工程服、银灰工具腰带',viewAngle:'正面胸像',referenceSet:'正面胸像、3/4 侧面、标准侧面、全身站姿、表情近景',identityAnchor:'首轮身份基准',visualStyle:'电影级写实' },
  prop: { name:'旧钥匙',owner:'林岚',appearance:'掌心长度的磨砂黄铜钥匙，齿部有三角缺口与编号 17',narrativeFunction:'开启导师封存的气象塔核心舱',state:'雨水浸湿但完整',viewAngle:'主视图',scale:'11cm',materialPalette:'旧黄铜与暗红锈迹',signatureDetail:'齿部三角缺口',stateVersion:'初始状态',assetAnchor:'首轮资产基准' },
  environment: { scene:'内景 · 气象塔控制室 · 夜',ratio:'9:16',lighting:'北侧冷蓝顶光，南侧红色警报灯',viewAngle:'建立视角',sceneAnchor,weather:'暴风雪前夜',palette:'冷蓝、银灰、警报红',props:'旧钥匙在中央控制台左侧' },
  keyframe: { shotId:'01',shotName:'警报启动',scene:'内景 · 气象塔控制室 · 夜',sceneAnchor,propReferences:'旧钥匙：主视图资产，控制台左侧',ratio:'9:16',identityReferences:'林岚：正面与三视图身份参考',environmentReference:'建立、反向、空间关系三视图',subjectAction:'林岚按下复位键，警报灯在她脸上亮起',environmentAction:'控制屏由黑转红',type:'近景',angle:'平视',composition:'三分法',move:'缓慢推进',lighting:'北侧冷蓝顶光与警报红',continuity:['角色身份','工程服','旧钥匙位置','控制室轴线'] },
  voice: { text:'还有三分钟，必须切断北侧回路。',emotion:'紧张',scene:'气象塔控制室',sceneContext:'暴风雪逼近，主角正在抢修失控回路',actingBeat:'压住恐惧并向同伴下达明确指令',name:'林岚',voice:'青年女声，清晰偏低' },
  video: { shotId:'01',sceneAnchor,propState:'旧钥匙=控制台左侧，雨水浸湿但完整',previousShotTail:'首镜，无前镜承接',imageReference:'/api/assets/project/shot-01.png',generationMode:'image-to-video',subjectAction:'林岚按下复位键后抬眼看向警报屏',environmentAction:'警报灯规律闪烁，屏幕数据连续滚动',type:'近景',move:'缓慢推进',angle:'平视',composition:'三分法',cameraPath:'0–1s 稳定建立；1–2.4s 缓慢推进；2.4–3s 稳定收尾',duration:3,ratio:'9:16',startFrame:'手指位于复位键上方',endFrame:'林岚抬眼，警报屏保持红色',lighting:'北侧冷蓝顶光与警报红',continuity:['角色身份','工程服','旧钥匙位置','控制室轴线'],dialogue:'',audio:'警报底声 -12dB' },
  editing: { instruction:'首秒建立警报钩子，压缩无效停顿，对齐对白与字幕，统一响度到 -14 LUFS',timeline:[{id:'clip-01',track:0,start:0,duration:3,label:'01 警报启动'}],deliveryPlatform:'YouTube Shorts / Bilibili',targetDuration:'60 秒',aspectRatio:'9:16',fps:24 },
  review: { projectTitle:'气象塔',shotSummary:'01 警报启动：近景缓慢推进，3 秒',deliveryTarget:'9:16 · 24fps · YouTube Shorts / Bilibili',observations:'基于最终成片逐镜填写' }
};

const report = Object.entries(samples).map(([task, values]) => {
  const compiled = compilePromptTask(task, values);
  assert.equal(compiled.quality.ready, true, `${task} 缺少 ${compiled.quality.missing.join('、')}`);
  assert.ok(compiled.fingerprint, `${task} 缺少提示词指纹`);
  return { task, version:compiled.version, completeness:compiled.quality.completeness, warnings:compiled.quality.warnings };
});

const story = compilePromptTask('story', plannedBrief);
assert.match(story.prompt, /创作模式：planned/);
assert.match(story.prompt, /气象塔必须保留/);
assert.match(story.prompt, /梦境反转/);
assert.match(story.prompt, /ep1-scene-1/);
assert.match(story.prompt, /sceneRef 精确绑定场景/);
assert.match(story.prompt, /current-scene/);
const voice = compilePromptTask('voice', samples.voice);
assert.match(voice.prompt, /<TTS_TEXT>还有三分钟，必须切断北侧回路。<\/TTS_TEXT>/);
assert.doesNotMatch(voice.prompt, /<TTS_TEXT>\[紧张\]/);
assert.match(voice.prompt, /中文台词送 IndexTTS，英文台词送 F5-TTS/);
const video = compilePromptTask('video', samples.video);
assert.equal(video.knowledge.camera.length > 0, true);
assert.match(video.prompt, /场景一致性锚点/);

console.log(JSON.stringify({ ok:true, tasks:report.length, report }, null, 2));
