import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditVideoPayload, buildVeoRequestBody, compileSeedancePrompt, compileVeoPrompt, publicVideoPlatformKnowledge } from '../server/knowledge/videoPlatforms.mjs';
import { clampModelDuration } from '../shared/modelCapabilities.mjs';

const base={shotId:'03',sceneAnchor:'雨夜码头，冷蓝主光，180度轴线',subjectAction:'沈知遥拆开信封',environmentAction:'雨水沿站台边缘流动',type:'中近景',angle:'平视',move:'推进',cameraPath:'沿光轴平稳推进',duration:3,ratio:'16:9',startFrame:'信封位于画面下方',endFrame:'签名进入焦点',audio:'雨声持续',dialogue:'原来你一直知道。',performanceEmotion:'压低的震惊',continuity:['短发','黄色雨衣'],imageUrl:'/api/assets/frame.png',identityReferences:['/api/assets/front.png','/api/assets/profile.png'],audioReference:'/api/assets/line.wav',narrativePurpose:'揭示父亲隐瞒真相'};
const first={mimeType:'image/png',data:'AAA'};const last={mimeType:'image/png',data:'BBB'};
const request=buildVeoRequestBody({prompt:compileVeoPrompt(base),payload:base,firstFrame:first,lastFrame:last});
const referenceRequest=buildVeoRequestBody({prompt:'test',payload:{...base,imageUrl:'',duration:4},referenceFrames:[first,last,first,{mimeType:'image/png',data:'CCC'}]});
const seedance=compileSeedancePrompt(base);
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');

const checks=[
  ['Veo 提示词具有六段视听结构', /摄影：/.test(request.body.instances[0].prompt)&&/声音：/.test(request.body.instances[0].prompt)&&/最终稳定/.test(request.body.instances[0].prompt)],
  ['首帧使用官方 inlineData 结构', request.body.instances[0].image.inlineData.data==='AAA'],
  ['尾帧插值使用 lastFrame', request.body.instances[0].lastFrame.inlineData.data==='BBB'],
  ['Veo 时长只使用4/6/8秒', request.body.parameters.durationSeconds==='4'&&clampModelDuration('veo3.1',5)===4&&clampModelDuration('veo3.1',7)===6],
  ['资产参考最多提交3张并强制8秒', referenceRequest.body.instances[0].referenceImages.length===3&&referenceRequest.body.parameters.durationSeconds==='8'],
  ['Seedance 明确图片和声音参考分工', /图1锁定/.test(seedance)&&/音频1只用于/.test(seedance)&&/叙事目的/.test(seedance)],
  ['完整镜头通过平台预检', auditVideoPayload(base,'veo3.1').ready],
  ['缺失镜号与首尾帧会被阻止', !auditVideoPayload({...base,shotId:'',startFrame:'',endFrame:''},'veo3.1').ready],
  ['分镜台可直接切换视频模型', /aria-label="视频生成模型"/.test(main)&&/route:videoRoute\.route/.test(main)],
  ['后端暴露平台知识库与预检接口', fs.readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8').includes('/api/video/preflight')&&publicVideoPlatformKnowledge().veo.durations.join(',')==='4,6,8']
];
for(const [label,ok] of checks){assert.equal(ok,true,label);console.log(`✓ ${label}`)}
console.log(`Video platform audit passed (${checks.length} checks).`);
