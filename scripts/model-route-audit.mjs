import assert from 'node:assert/strict';
import { modelOptions } from '../src/modelCatalog.js';
import { defaultProviderRoute, parseVeoOperation, providerRoutes } from '../server/providers.mjs';
import { clampModelDuration, getModelCapability } from '../shared/modelCapabilities.mjs';

let routes = 0;
for (const [task, group] of Object.entries(modelOptions)) {
  const serverIds = new Set((providerRoutes[task] || []).map(item => item.id));
  assert.ok(serverIds.size, `${task} 缺少服务端路由`);
  assert.equal(defaultProviderRoute[task], group.recommended, `${task} 前后端推荐模型不一致`);
  for (const option of group.options) {
    assert.ok(serverIds.has(option.id), `${task}/${option.id} 只存在于前端，无法真实执行`);
    const capability = getModelCapability(option.id);
    assert.ok(capability.bestFor && capability.inputs.length && capability.outputs.length, `${option.id} 缺少能力档案`);
    routes += 1;
  }
}
assert.equal(getModelCapability('gen4_turbo').requiresImage, true);
assert.equal(clampModelDuration('seedance2', 3), 4);
assert.equal(clampModelDuration('gen4.5', 12), 10);
assert.equal(clampModelDuration('gemini_omni_flash', 3), 3);
assert.ok(getModelCapability('eleven_v3').inputs.includes('audio-tags'));
assert.equal(providerRoutes.voice.find(item=>item.id==='index_tts_local').adapter,'local-tts');
assert.equal(providerRoutes.voice.find(item=>item.id==='index_tts_local').language,'zh-CN');
assert.equal(providerRoutes.voice.find(item=>item.id==='f5_tts_local').adapter,'local-tts');
assert.equal(providerRoutes.voice.find(item=>item.id==='f5_tts_local').language,'en-US');
assert.ok(getModelCapability('index_tts_local').constraints.some(item=>item.includes('授权')));
assert.ok(getModelCapability('f5_tts_local').constraints.some(item=>item.includes('CC-BY-NC')));
assert.ok(getModelCapability('gpt-image-2').inputs.includes('image-reference'));
assert.equal(providerRoutes.video.find(item=>item.id==='gemini_omni_flash').adapter,'gemini-omni-video');
assert.equal(providerRoutes.video.find(item=>item.id==='veo3.1').adapter,'gemini-veo');
assert.equal(providerRoutes.video.find(item=>item.id==='veo3.1').env,'GEMINI_API_KEY');
assert.equal(providerRoutes.video.find(item=>item.id==='seedance2').accessMode,'manual');
assert.deepEqual(parseVeoOperation({done:false}),{done:false,failed:false,failure:'',uri:'',mimeType:'video/mp4'});
assert.equal(parseVeoOperation({done:true,response:{generateVideoResponse:{generatedSamples:[{video:{uri:'https://example.invalid/video.mp4',mimeType:'video/mp4'}}]}}}).uri,'https://example.invalid/video.mp4');
assert.equal(parseVeoOperation({done:true,error:{message:'blocked'}}).failure,'blocked');

console.log(JSON.stringify({ ok:true, tasks:Object.keys(modelOptions).length, routes, seedanceThreeSecondRender:clampModelDuration('seedance2',3) }, null, 2));
