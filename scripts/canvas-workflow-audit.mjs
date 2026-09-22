import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CANVAS_TEMPLATES, canvasImpactedNodes, deriveCanvasGraph, productionPlanForCanvasScope } from '../src/canvasWorkflow.js';
import { CANVAS_CONTEXT_MARKER, compileCanvasContext, composeCanvasPrompt } from '../src/canvasPromptContext.js';

const draft = deriveCanvasGraph({ synopsis:'主角寻找失踪的父亲' });
assert.equal(draft.find(node=>node.id==='source').status,'done');
assert.equal(draft.find(node=>node.id==='bible').status,'ready');
assert.equal(draft.find(node=>node.id==='script').status,'blocked');

const production = deriveCanvasGraph({
  synopsis:'主角寻找失踪的父亲',
  storyBible:{ genre:'悬疑' },
  episodes:[{ scenes:[{id:'scene-1'}], dialogues:[{id:'line-1',text:'我会找到他'}] }],
  characters:[{ id:'c1', imageReferences:[{url:'/character.png'}], voiceLines:[{id:'line-1',url:'/line.wav'}] }],
  assets:{ environments:[{id:'env-1',imageUrl:'/env.png'}] },
  shots:[{ id:'01', prompt:'雨夜码头，人物走向灯塔', move:'缓慢推进', imageUrl:'/frame.png', videoUrl:'/shot.mp4' }],
});
assert.equal(production.find(node=>node.id==='script').status,'ready');
assert.equal(production.find(node=>node.id==='refs').status,'stale');
assert.equal(production.find(node=>node.id==='prompt').status,'stale');
assert.equal(production.find(node=>node.id==='video').status,'stale');
assert.deepEqual(canvasImpactedNodes(production,'refs'),['refs','voice','board','prompt','keyframe','video','edit']);
assert.equal(CANVAS_TEMPLATES.visual.nodes.includes('prompt'),true);

const scopedPlan = productionPlanForCanvasScope({
  tasks:[
    {id:'character-c1-front',task:'character',costClass:'image'},
    {id:'voice-c1-l1',task:'voice',costClass:'voice'},
    {id:'keyframe-01',task:'keyframe',costClass:'image'},
    {id:'video-01',task:'video',costClass:'video'},
    {id:'editing',task:'editing',costClass:'text'},
  ],
  total:5,
  counts:{text:1,image:2,voice:1,video:1},
}, ['keyframe','video','edit']);
assert.deepEqual(scopedPlan.tasks.map(task=>task.task),['keyframe','video','editing']);
assert.deepEqual(scopedPlan.counts,{text:1,image:1,voice:0,video:1});

const promptProject={
  title:'雾港来信',type:'AI 短剧',settings:{aspectRatio:'9:16'},storyBible:{visualStyle:'冷蓝电影写实'},
  characters:[{id:'c1',name:'沈知遥',role:'主角',age:'24',appearance:'黑色短发、琥珀眼睛',wardrobe:'黄色雨衣',personality:'克制警觉',desire:'找到父亲',fear:'再次失去亲人',voice:'清澈偏低'}],
  episodes:[{scenes:[{id:'scene-1',heading:'外景·雾港码头·夜',sceneBible:{timeWeather:'雨夜',layout:'铁轨在左、候车棚在右',axis:'沿铁轨纵深',lighting:'冷蓝逆光',palette:'冷蓝与少量琥珀',propPositions:'旧录音机在人物右手'}}],dialogues:[{id:'line-1',character:'沈知遥',text:'今晚必须找到他。',emotion:'坚定',subtext:'压住恐惧'}]}],
  assets:{props:[{id:'p1',name:'旧录音机',appearance:'红色磨损外壳',state:'沾雨',sceneRefs:['scene-1']}]},
  shots:[{id:'01',name:'雨夜入口',sceneRef:'scene-1',characters:['沈知遥'],dialogueRef:'line-1',duration:14,type:'中景',angle:'平视',composition:'纵深构图',move:'缓慢推进',subjectAction:'沈知遥抬头看向灯塔',environmentAction:'雾沿地面缓慢流动',startFrame:'人物站在画面右三分之一',endFrame:'停在旧信件前',continuity:['黄色雨衣不变','沿铁轨轴线前进']}],
};
const compiledContext=compileCanvasContext(promptProject,{shotId:'01',ratio:'9:16'});
assert.match(compiledContext.text,/时长=10s/);
for(const section of ['场景：','人物：','道具：','摄影：','首尾帧：','表演与声音：','连续性：','负面约束：'])assert.match(compiledContext.text,new RegExp(section));
assert.match(compiledContext.text,/沈知遥/);
assert.match(compiledContext.text,/缓慢推进/);
assert.doesNotMatch(compiledContext.text,/待补全|待设定|待确认/);
assert.equal(composeCanvasPrompt(promptProject,{shotId:'01',text:'用户创意'}).includes(CANVAS_CONTEXT_MARKER),true);

const [main,canvas,freeform,workflow,styles] = await Promise.all([
  readFile(new URL('../src/main.jsx', import.meta.url),'utf8'),
  readFile(new URL('../src/ProductionCanvas.jsx', import.meta.url),'utf8'),
  readFile(new URL('../src/FreeformCanvas.jsx', import.meta.url),'utf8'),
  readFile(new URL('../src/workflow.js', import.meta.url),'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url),'utf8'),
]);
const uiContracts = {
  '新版画布接入总览': /<ProductionCanvas/.test(main) && /onSaveLayout=\{layout=>updateProject/.test(main),
  '节点支持指针拖动': /onPointerDown=\{event=>beginDrag/.test(canvas) && /touch-action:none/.test(styles),
  '节点依赖以连线展示': /canvas-wires/.test(canvas) && /canvas-wires path/.test(styles),
  '支持画布模板和缩放': /CANVAS_TEMPLATES/.test(canvas) && /缩小画布/.test(canvas) && /放大画布/.test(canvas),
  '支持局部下游执行': /startNode:selected\.id,selectedNodes:activeIds,impacted/.test(canvas) && /执行所选分支/.test(canvas),
  '生产管线消费画布范围': /productionPlanForCanvasScope/.test(main) && /runFullPipeline\(options\)/.test(main) && /scoped\('keyframe'\)/.test(main),
  '支持批量选择与快捷键': /event\.shiftKey\|\|event\.metaKey/.test(canvas) && /Ctrl\+Z/.test(canvas) && /ArrowLeft/.test(canvas),
  '支持工作流导入导出': /xingmu-production-canvas/.test(canvas) && /importWorkflow/.test(canvas) && /exportWorkflow/.test(canvas),
  '支持缩略导航': /canvas-minimap/.test(canvas) && /navigateMiniMap/.test(canvas),
  '自由画布接入生产画布': /<FreeformCanvas/.test(canvas) && /onSaveCreative/.test(main),
  '提示词节点支持模型路由': /aria-label="生成模型"/.test(freeform) && /modelOptions\.video/.test(freeform) && /options\.route/.test(workflow),
  '图片连接成为参考资产': /kind='reference'/.test(freeform) && /kind==='reference'/.test(freeform) && /referenceImages:references/.test(freeform),
  '动态光线连接': /edge-light/.test(freeform) && /creative-edge-flow/.test(styles) && /creative-beam/.test(freeform),
  '无密钥保留手动闭环': /提示词已复制/.test(freeform) && /navigator\.clipboard/.test(freeform),
  '拖线连接带实时预览': /startWire/.test(freeform) && /moveWire/.test(freeform) && /document\.elementFromPoint/.test(freeform) && /draftPath/.test(freeform),
  '画布支持平移和锚点缩放': /beginPan/.test(freeform) && /spaceRef/.test(freeform) && /worldX\*\(next\/100\)-localX/.test(freeform),
  '提示词绑定镜头并注入项目上下文': /aria-label="绑定镜头"/.test(freeform) && /injectProjectContext/.test(freeform) && /composeCanvasPrompt/.test(freeform),
  '参考资产以可见引用呈现': /prompt-references/.test(freeform) && /@\{byId\.get/.test(freeform),
};
const failed = Object.entries(uiContracts).filter(([,passed])=>!passed).map(([name])=>name);
assert.deepEqual(failed,[]);
console.log(JSON.stringify({ok:true,nodes:production.length,impacted:canvasImpactedNodes(production,'refs'),uiChecks:Object.keys(uiContracts).length},null,2));
