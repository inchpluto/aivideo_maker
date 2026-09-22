import { getConfigValue, isLiveMode, publicProviderConfig, publicRouteExecutions, recordRouteExecution } from './config.mjs';
import { compilePrompt, compilePromptTask, promptSpecs } from './prompts.mjs';
import { assetUrlToDataUri } from './store.mjs';
import { withLocalTtsService } from './localTtsManager.mjs';
import { clampModelDuration, getModelCapability } from '../shared/modelCapabilities.mjs';
import { compileRunwayMotionPrompt } from './knowledge/runwayMotion.mjs';
import { auditVideoPayload, buildVeoRequestBody, compileVeoPrompt } from './knowledge/videoPlatforms.mjs';
import { compileVoicePerformance } from '../shared/voicePerformance.mjs';
import { normalizeProviderError, requireProviderResponse } from './providerErrors.mjs';
import { getProviderContract } from './providerContracts.mjs';
import { assertProviderInput, assertProviderOutput } from './providerSchemas.mjs';
import { buildSourceChunkPlan, normalized as normalizeSourceText } from './sourceChunks.mjs';

// 为所有出站供应商请求统一加超时，避免上游挂起时无限占用连接（除非调用方已自带 signal）。
// 文本/图片类默认 240s（剧本/剪辑是长生成，DeepSeek 这类模型响应可超过 2 分钟），媒体/视频类更长。
const fetchWithTimeout = (url, init = {}, ms = 240000) => fetch(url, { ...init, signal: init.signal || AbortSignal.timeout(ms) });

const routes = {
  story: [
    { id: 'gpt-5.6', provider: 'OpenAI', name: 'GPT-5.6', env: 'OPENAI_API_KEY', adapter: 'openai' },
    { id: 'claude-opus-5', provider: 'Anthropic', name: 'Claude Opus 5', env: 'ANTHROPIC_API_KEY', adapter: 'anthropic' },
    { id: 'qwen3.8-max', provider: '阿里云百炼', name: 'Qwen3.8-Max', env: 'DASHSCOPE_API_KEY', adapter: 'qwen' },
    { id: 'deepseek-v4-pro', provider: 'DeepSeek', name: 'DeepSeek V4 Pro', env: 'DEEPSEEK_API_KEY', adapter: 'deepseek' },
    { id: 'gemini-3.1-pro-preview', provider: 'Google', name: 'Gemini 3.1 Pro', env: 'GEMINI_API_KEY', adapter: 'gemini-text' },
    { id: 'custom-openai', provider: '自定义 OpenAI 兼容', name: '自定义模型', env: 'CUSTOM_OPENAI_API_KEY', adapter: 'custom-openai' }
  ],
  character: [
    { id: 'gemini-3-pro-image', provider: 'Google', name: 'Nano Banana Pro', env: 'GEMINI_API_KEY', adapter: 'gemini-image' },
    { id: 'gemini-3.1-flash-image', provider: 'Google', name: 'Nano Banana 2', env: 'GEMINI_API_KEY', adapter: 'gemini-image' },
    { id: 'custom-openai-image', provider: '自定义 OpenAI 兼容', name: '自定义生图模型', env: 'CUSTOM_OPENAI_API_KEY', adapter: 'custom-openai-image' }
  ],
  environment: [
    { id: 'gpt-image-2', provider: 'OpenAI', name: 'GPT Image 2', env: 'OPENAI_API_KEY', adapter: 'openai-image' },
    { id: 'gemini-3-pro-image', provider: 'Google', name: 'Nano Banana Pro', env: 'GEMINI_API_KEY', adapter: 'gemini-image' },
    { id: 'custom-openai-image', provider: '自定义 OpenAI 兼容', name: '自定义生图模型', env: 'CUSTOM_OPENAI_API_KEY', adapter: 'custom-openai-image' }
  ],
  voice: [
    { id: 'index_tts_local', provider: '本地 IndexTTS', name: 'IndexTTS 2.5 中文', env: 'INDEXTTS_BASE_URL', adapter: 'local-tts', language: 'zh-CN', defaultBase:'http://127.0.0.1:7860' },
    { id: 'f5_tts_local', provider: '本地 F5-TTS', name: 'F5-TTS 英文', env: 'F5TTS_BASE_URL', adapter: 'local-tts', language: 'en-US', defaultBase:'http://127.0.0.1:7862' },
    { id: 'eleven_v3', provider: 'ElevenLabs', name: 'Eleven v3', env: 'ELEVENLABS_API_KEY', adapter: 'elevenlabs' },
    { id: 'eleven_multilingual_v2', provider: 'ElevenLabs', name: 'Multilingual v2', env: 'ELEVENLABS_API_KEY', adapter: 'elevenlabs' }
  ],
  video: [
    { id: 'gemini_omni_flash', provider: 'Google', name: 'Gemini Omni Flash', env: 'GEMINI_API_KEY', adapter: 'gemini-omni-video', apiModel: 'gemini-omni-flash-preview' },
    { id: 'seedance2', provider: '外部平台', name: 'Seedance 2', env: '', adapter: 'manual', accessMode: 'manual' },
    { id: 'gen4.5', provider: 'Runway', name: 'Gen-4.5', env: 'RUNWAY_API_KEY', adapter: 'runway' },
    { id: 'veo3.1', provider: 'Google', name: 'Veo 3.1', env: 'GEMINI_API_KEY', adapter: 'gemini-veo', apiModel: 'veo-3.1-generate-preview' },
    { id: 'gen4_turbo', provider: 'Runway', name: 'Gen-4 Turbo', env: 'RUNWAY_API_KEY', adapter: 'runway' }
  ],
  editing: [
    { id: 'gpt-5.6-terra', provider: 'OpenAI', name: 'GPT-5.6 Terra', env: 'OPENAI_API_KEY', adapter: 'openai' },
    { id: 'gemini-3.5-flash', provider: 'Google', name: 'Gemini 3.5 Flash', env: 'GEMINI_API_KEY', adapter: 'gemini-text' },
    { id: 'deepseek-v4-flash', provider: 'DeepSeek', name: 'DeepSeek V4 Flash', env: 'DEEPSEEK_API_KEY', adapter: 'deepseek' },
    { id: 'custom-openai', provider: '自定义 OpenAI 兼容', name: '自定义模型', env: 'CUSTOM_OPENAI_API_KEY', adapter: 'custom-openai' }
  ]
};
routes.keyframe = routes.environment.map(item => ({ ...item, inheritedTask:'environment' }));
routes.prop = routes.environment;

const fallbackNames = { story: '星幕故事引擎', character: '星幕角色画师', prop: '星幕道具美术', environment: '星幕场景画师', keyframe: '星幕首帧导演', voice: '星幕演播室', video: '星幕镜头引擎', editing: '星幕剪辑导演' };
const defaultRoute = { story: 'gpt-5.6', character: 'gemini-3-pro-image', prop: 'gpt-image-2', environment: 'gpt-image-2', keyframe: 'gpt-image-2', voice: 'index_tts_local', video: 'gemini_omni_flash', editing: 'gpt-5.6-terra' };
export const providerRoutes = routes;
export const defaultProviderRoute = defaultRoute;

function resolveRoute(task, routeId) {
  const list = routes[task];
  if (!list) throw new Error(`未知生成任务：${task}`);
  return list.find(item => item.id === routeId) || list.find(item => item.id === defaultRoute[task]) || list[0];
}

export async function publicProviders() {
  const configState = await publicProviderConfig();
  const executions = await publicRouteExecutions();
  const providerForEnv = { OPENAI_API_KEY:'openai', ANTHROPIC_API_KEY:'anthropic', DEEPSEEK_API_KEY:'deepseek', DASHSCOPE_API_KEY:'dashscope', GEMINI_API_KEY:'gemini', ELEVENLABS_API_KEY:'elevenlabs', INDEXTTS_BASE_URL:'indexTts', F5TTS_BASE_URL:'f5Tts', RUNWAY_API_KEY:'runway', CUSTOM_OPENAI_API_KEY:'customOpenai' };
  const entries = await Promise.all(Object.entries(routes).map(async ([task, definitions]) => {
  const options=await Promise.all(definitions.map(async item => { const manualOnly=item.accessMode==='manual';const providerState=configState.providers?.[providerForEnv[item.env]];const execution=executions[`${task}:${item.id}`];const configuredValue=(await getConfigValue(item.env))||item.defaultBase||''; return { id: item.id, provider: item.provider, model: item.name, accessMode:manualOnly?'manual':'api', connected: manualOnly?false:Boolean(configuredValue), verified:manualOnly?false:Boolean(providerState?.verified), executed:execution?.status==='succeeded',lastSucceededAt:execution?.succeededAt||null,connectionStatus:manualOnly?'manual':providerState?.connectionStatus||'missing', requiredEnv: item.env, capability:getModelCapability(item.id), inheritedTask:item.inheritedTask||null, contract:getProviderContract(item.adapter) }; }));
    const selectedId=configState.routePreferences?.[task]||defaultRoute[task];const selected=options.find(item=>item.id===selectedId)||options[0];
    return [task,{task,fallback:fallbackNames[task],default:defaultRoute[task],selected:selected?.id||'',selectedAccessMode:selected?.accessMode||'api',connected:Boolean(selected?.connected),verified:Boolean(selected?.verified),executed:Boolean(selected?.executed),anyConnected:options.some(item=>item.connected),anyVerified:options.some(item=>item.verified),options}];
  }));
  return Object.fromEntries(entries);
}

export async function auditProviderIntegration() {
  const providerMatrix=await publicProviders();
  const handoffs={story:['episodes','characters','assets.props','shots','platformPlan'],character:['character.imageReferences'],prop:['assets.props.imageReferences'],environment:['assets.environments'],keyframe:['shot.imageUrl'],voice:['character.sceneVoices'],video:['shot.videoUrl','timeline.mediaUrl'],editing:['generation.editing.operations'],review:['manualWorkflow.tasks.review']};
  const tasks=Object.keys(promptSpecs).map(task=>({task,promptVersion:promptSpecs[task].version,promptBuiltIn:true,routeCount:routes[task]?.length||0,manualOnly:task==='review'||providerMatrix[task]?.selectedAccessMode==='manual',selectedRoute:providerMatrix[task]?.selected||'',configured:Boolean(providerMatrix[task]?.connected),credentialVerified:Boolean(providerMatrix[task]?.verified),executed:Boolean(providerMatrix[task]?.executed),handoffs:handoffs[task]||[]}));
  const issues=[];
  for(const item of tasks){if(!item.promptBuiltIn)issues.push(`${item.task} 缺少内置提示词`);if(!item.manualOnly&&!item.routeCount)issues.push(`${item.task} 缺少真实模型路由`);if(item.configured&&!item.credentialVerified)issues.push(`${item.task} 已配置密钥但尚未通过供应商连接验证`)}
  const requiredTasks=tasks.filter(item=>item.task!=='review');
  return {version:'1.2.0',checkedAt:new Date().toISOString(),readyForLive:requiredTasks.every(item=>!item.manualOnly&&item.credentialVerified),provenInProduction:requiredTasks.every(item=>!item.manualOnly&&item.executed),hybridReady:requiredTasks.every(item=>item.manualOnly||item.credentialVerified),manualFallbackComplete:tasks.every(item=>item.promptBuiltIn),tasks,issues};
}

const screenplaySchema = {
  type: 'object', additionalProperties: false, required: ['title', 'logline', 'theme', 'storyBible', 'platformPlan', 'episodes', 'storyboard'],
  properties: {
    title: { type: 'string' }, logline: { type: 'string' }, theme: { type: 'string' },
    storyBible: { type: 'object', additionalProperties: false, required: ['genre', 'tone', 'audience', 'visualStyle', 'worldRules', 'promises', 'characterArcs', 'characterProfiles', 'props'], properties: {
      genre: { type: 'string' }, tone: { type: 'string' }, audience: { type: 'string' }, visualStyle: { type: 'string' },
      worldRules: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } }, promises: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
      characterArcs: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['character', 'start', 'turn', 'end'], properties: { character: { type: 'string' }, start: { type: 'string' }, turn: { type: 'string' }, end: { type: 'string' } } } },
      characterProfiles: { type:'array', minItems:1, maxItems:8, items:{ type:'object', additionalProperties:false, required:['name','role','age','backstory','personality','contradiction','desire','fear','appearance','wardrobe','voice','performanceRules','sourceBasis','missingFacts'], properties:{
        name:{type:'string'},role:{type:'string'},age:{type:'string'},backstory:{type:'string'},personality:{type:'string'},contradiction:{type:'string'},desire:{type:'string'},fear:{type:'string'},
        appearance:{type:'object',additionalProperties:false,required:['face','hair','body','skin','distinctiveFeatures'],properties:{face:{type:'string'},hair:{type:'string'},body:{type:'string'},skin:{type:'string'},distinctiveFeatures:{type:'string'}}},
        wardrobe:{type:'object',additionalProperties:false,required:['silhouette','garments','materials','palette','accessories'],properties:{silhouette:{type:'string'},garments:{type:'string'},materials:{type:'string'},palette:{type:'string'},accessories:{type:'string'}}},
        voice:{type:'object',additionalProperties:false,required:['timbre','pitch','rhythm','accent','baselineEmotion','dynamicRange'],properties:{timbre:{type:'string'},pitch:{type:'string'},rhythm:{type:'string'},accent:{type:'string'},baselineEmotion:{type:'string'},dynamicRange:{type:'string'}}},
        performanceRules:{type:'array',minItems:2,maxItems:8,items:{type:'string'}},sourceBasis:{type:'string',enum:['explicit','inferred','proposed']},missingFacts:{type:'array',items:{type:'string'}}
      } } },
      props: { type:'array', minItems:1, maxItems:20, items:{ type:'object', additionalProperties:false, required:['name','appearance','scale','materialPalette','signatureDetail','narrativeFunction','owner','state','stateChanges','sceneRefs'], properties:{name:{type:'string'},appearance:{type:'string'},scale:{type:'string'},materialPalette:{type:'string'},signatureDetail:{type:'string'},narrativeFunction:{type:'string'},owner:{type:'string'},state:{type:'string'},stateChanges:{type:'array',items:{type:'string'}},sceneRefs:{type:'array',items:{type:'string'}}} } }
    } },
    platformPlan: { type:'object', additionalProperties:false, required:['targetPlatform','openingVariants','retentionBeats','titleOptions','thumbnailConcept','complianceNotes'], properties:{ targetPlatform:{type:'string'}, openingVariants:{type:'array',minItems:3,maxItems:3,items:{type:'string'}}, retentionBeats:{type:'array',minItems:3,maxItems:12,items:{type:'string'}}, titleOptions:{type:'array',minItems:3,maxItems:8,items:{type:'string'}}, thumbnailConcept:{type:'string'}, complianceNotes:{type:'array',items:{type:'string'}} } },
    episodes: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['title', 'hook', 'cliffhanger', 'scenes', 'dialogues'], properties: {
      title: { type: 'string' }, hook: { type: 'string' }, cliffhanger: { type: 'string' },
      scenes: { type: 'array', minItems: 3, maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['id','heading', 'action', 'purpose', 'conflict', 'visualHook', 'beat', 'transition', 'characters', 'sceneBible'], properties: { id:{type:'string'},heading: { type: 'string' }, action: { type: 'string' }, purpose: { type: 'string' }, conflict: { type: 'string' }, visualHook: { type: 'string' }, beat: { type: 'string' }, transition: { type: 'string' }, characters: { type: 'array', items: { type: 'string' } }, sceneBible:{type:'object',additionalProperties:false,required:['timeWeather','layout','entrances','axis','lighting','palette','propPositions'],properties:{timeWeather:{type:'string'},layout:{type:'string'},entrances:{type:'string'},axis:{type:'string'},lighting:{type:'string'},palette:{type:'string'},propPositions:{type:'string'}}} } } },
      dialogues: { type: 'array', minItems: 2, maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['id','sceneRef','character','emotion','text','subtext','intention','pace','pauseStyle','emphasis'], properties: { id:{type:'string'},sceneRef:{type:'string'},character:{type:'string'},emotion:{type:'string'},text:{type:'string'},subtext:{type:'string'},intention:{type:'string'},pace:{type:'string'},pauseStyle:{type:'string'},emphasis:{type:'string'} } } }
    } } },
    storyboard: { type: 'array', minItems: 6, maxItems: 60, items: { type: 'object', additionalProperties: false, required: ['groupId','sceneRef','dialogueRef','scene','timeRange','characters','name','type','angle','move','composition','duration','visualContent','narrativePurpose','subjectAction','environmentAction','lighting','sound','audio','caption','startFrame','endFrame','transition','negativePrompt','continuity'], properties: { groupId:{type:'string'},sceneRef: { type: 'string' },dialogueRef:{type:'string'},scene:{type:'string'},timeRange:{type:'string'},characters:{type:'array',items:{type:'string'}}, name: { type: 'string' }, type: { type: 'string' }, angle: { type: 'string' }, move: { type: 'string' }, composition: { type: 'string' }, duration: { type: 'number',minimum:1,maximum:10 },visualContent:{type:'string'},narrativePurpose:{type:'string'}, subjectAction: { type: 'string' }, environmentAction: { type: 'string' }, lighting: { type: 'string' },sound:{type:'string'}, audio:{type:'string'}, caption:{type:'string'}, startFrame: { type: 'string' }, endFrame: { type: 'string' }, transition:{type:'string'}, negativePrompt: { type: 'string' }, continuity: { type: 'array', minItems: 2, maxItems: 10, items: { type: 'string' } } } } }
  }
};

const editingOperation = (operation, properties, required = Object.keys(properties)) => ({
  type: 'object', additionalProperties: false, required: ['operation', 'target', 'params', 'reason'], properties: {
    operation: { type: 'string', enum: [operation] }, target: { type: 'string' }, reason: { type: 'string' },
    params: { type: 'object', additionalProperties: false, required, properties }
  }
});
const editingSchema = { type: 'object', additionalProperties: false, required: ['operations'], properties: { operations: { type: 'array', minItems: 1, maxItems: 12, items: { anyOf: [
  editingOperation('trim', { inSeconds:{type:'number',minimum:0}, outSeconds:{type:'number',minimum:0} }),
  editingOperation('move', { start:{type:'number',minimum:0}, trackId:{type:'string'} }),
  editingOperation('setVolume', { volume:{type:'number',minimum:0,maximum:200} }),
  editingOperation('normalizeAudio', { targetLufs:{type:'number',minimum:-24,maximum:-8} }),
  editingOperation('addCaptions', { style:{type:'string'} }),
  editingOperation('setSpeed', { speed:{type:'number',minimum:.25,maximum:4} }),
  editingOperation('addTransition', { transition:{type:'string'}, duration:{type:'number',minimum:.05,maximum:2} }),
  editingOperation('split', { at:{type:'number',minimum:.1} }),
  editingOperation('duplicate', { start:{type:'number',minimum:0} }),
  editingOperation('rippleDelete', { reasonCode:{type:'string'} })
] } } } };
const instructionFor = (task, payload) => compilePrompt(task === 'story' ? 'story' : 'editing', payload);

function extractJson(text) {
  const source = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(source); } catch { const start = source.indexOf('{'); const end = source.lastIndexOf('}'); if (start >= 0 && end > start) return JSON.parse(source.slice(start, end + 1)); throw new Error('模型返回内容未通过结构化 JSON 校验。'); }
}

async function openAIText(task, payload, config) {
  const story = task === 'story'; const schema = story ? screenplaySchema : editingSchema;
  const response = await fetchWithTimeout('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${await getConfigValue('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.id, instructions: instructionFor(task, payload), input: JSON.stringify(payload).slice(0, 600000), reasoning: { effort: story ? 'medium' : 'low' }, text: { format: { type: 'json_schema', name: story ? 'screenplay_package' : 'editing_plan', strict: true, schema } } }) });
  await requireProviderResponse(response,{provider:'OpenAI',model:config.id,task});
  const data = await response.json(); const parsed = extractJson(data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.text)?.text || ''); return story ? { screenplay: parsed } : parsed;
}

async function openAICompatibleText(task, payload, config) {
  const story = task === 'story'; const endpoint = config.adapter === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : `${((await getConfigValue('DASHSCOPE_BASE_URL')) || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')}/chat/completions`; const apiKey = config.adapter === 'deepseek' ? await getConfigValue('DEEPSEEK_API_KEY') : await getConfigValue('DASHSCOPE_API_KEY');
  // DeepSeek 真实 API 的模型名在上游会演进，允许用 DEEPSEEK_MODEL 覆盖（例如 deepseek-chat / deepseek-reasoner）。
  const model = config.adapter === 'deepseek' ? (await getConfigValue('DEEPSEEK_MODEL') || config.id) : config.id;
  const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: instructionFor(task, payload) }, { role: 'user', content: JSON.stringify({ schema: story ? screenplaySchema : editingSchema, input: payload }).slice(0, 800000) }], response_format: { type: 'json_object' }, temperature: story ? 0.7 : 0.2 }) });
  await requireProviderResponse(response,{provider:config.provider,model:config.id,task}); const data = await response.json(); const parsed = extractJson(data.choices?.[0]?.message?.content); return story ? { screenplay: parsed } : parsed;
}

async function anthropicText(task, payload, config) {
  const story = task === 'story'; const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': await getConfigValue('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.id, max_tokens: story ? 32000 : 8000, system: instructionFor(task, payload), messages: [{ role: 'user', content: JSON.stringify({ schema: story ? screenplaySchema : editingSchema, input: payload }).slice(0, 800000) }] }) });
  await requireProviderResponse(response,{provider:'Anthropic',model:config.id,task}); const data = await response.json(); const parsed = extractJson(data.content?.find(item => item.type === 'text')?.text); return story ? { screenplay: parsed } : parsed;
}

async function geminiText(task, payload, config) {
  const story = task === 'story'; const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.id)}:generateContent?key=${encodeURIComponent(await getConfigValue('GEMINI_API_KEY'))}`; const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${instructionFor(task, payload)}\n\n输入：${JSON.stringify(payload).slice(0, 800000)}` }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: story ? screenplaySchema : editingSchema } }) });
  await requireProviderResponse(response,{provider:'Google',model:config.id,task}); const data = await response.json(); const parsed = extractJson(data.candidates?.[0]?.content?.parts?.map(item => item.text || '').join('')); return story ? { screenplay: parsed } : parsed;
}

async function elevenLabsVoice(payload, config) {
  const voiceId = payload.voiceId || await getConfigValue('ELEVENLABS_VOICE_ID'); if (!voiceId) throw new Error('缺少 ELEVENLABS_VOICE_ID 或 voiceId。');
  const emotionTag = {开心:'[happy]',喜悦:'[happy]',悲伤:'[sad]',愤怒:'[angry]',紧张:'[nervous]',坚定:'[determined]',低语:'[whispers]',自然:'' }[payload.emotion] || '';
  const spokenText = String(payload.text || '这是一段角色声音试听。').trim();
  const text = config.id === 'eleven_v3' && emotionTag ? `${emotionTag} ${spokenText}` : spokenText;
  const performanceDirection = {
    scene:String(payload.sceneContext||payload.scene||''),
    intention:String(payload.intention||''),
    actingBeat:String(payload.actingBeat||payload.subtext||''),
    emotion:String(payload.emotion||'自然'),
    intensity:Number(payload.emotionIntensity||50),
    pace:String(payload.speed||payload.pauseStyle||'自然')
  };
  const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': await getConfigValue('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: config.id, voice_settings: payload.voiceSettings || { stability: 0.48, similarity_boost: 0.78, style: 0.22 } }) });
  await requireProviderResponse(response,{provider:'ElevenLabs',model:config.id,task:'voice'}); return { contentType: 'audio/mpeg', audioBase64: Buffer.from(await response.arrayBuffer()).toString('base64'), appliedText:text, emotionTag:config.id==='eleven_v3'?emotionTag:'', performanceDirection, voiceModel:config.id };
}

function localTtsBase(config,value='') {
  const base=String(value||config.defaultBase||'').trim().replace(/\/+$/,'');
  if(!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(base))throw new Error('本地 TTS 地址仅允许 127.0.0.1 或 localhost。');
  return base;
}

function dataUriFile(dataUri,name='reference.wav') {
  const matched=String(dataUri||'').match(/^data:([^;]+);base64,(.+)$/);
  if(!matched)throw new Error('参考音频格式无效。');
  return {blob:new Blob([Buffer.from(matched[2],'base64')],{type:matched[1]}),name};
}

async function localServiceProtocol(base,config) {
  const probes=config.id==='f5_tts_local'?[['f5-desktop','/api/status'],['xingmu-bridge','/health']]:[['xingmu-bridge','/health'],['index-gradio','/gradio_api/info'],['index-gradio','/config']];
  let detail='服务未启动';
  for(const [protocol,path] of probes){
    try{
      const response=await fetchWithTimeout(`${base}${path}`,{headers:{Accept:'application/json'}},5000);
      if(!response.ok){detail=`${path} 返回 HTTP ${response.status}`;continue}
      const data=await response.json().catch(()=>({}));
      if(protocol==='f5-desktop'&&data.status!=='ready')throw new Error(data.message||`模型状态：${data.status||'未知'}`);
      return protocol;
    }catch(error){detail=error.message||'连接失败'}
  }
  throw new Error(`${config.name} 未就绪：${detail}。请先启动对应桌面应用。`);
}

async function f5DesktopVoice(base,request,referenceAudio,payload,config) {
  const file=dataUriFile(referenceAudio,'xingmu-reference.wav');
  const form=new FormData();form.append('file',file.blob,file.name);
  const uploaded=await fetchWithTimeout(`${base}/api/upload`,{method:'POST',body:form},120000);
  await requireProviderResponse(uploaded,{provider:config.name,model:config.id,task:'voice'});
  const upload=await uploaded.json();
  const settings=payload.voiceSettings||{};
  const submitted=await fetchWithTimeout(`${base}/api/synthesize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    ref:{type:'upload',name:upload.name},ref_text:request.referenceText,gen_text:request.text,
    speed:Math.max(.5,Math.min(2,Number(settings.speed??request.speed??1))),
    nfe_step:Math.max(8,Math.min(64,Math.round(Number(settings.nfeStep??32)))),
    cfg_strength:Math.max(.5,Math.min(5,Number(settings.guidance??2))),
    cross_fade:Math.max(0,Math.min(.5,Number(settings.crossFade??.15))),
    seed:Number.isFinite(Number(settings.seed))?Math.round(Number(settings.seed)):-1,
    remove_silence:Boolean(settings.removeSilence)
  })},30000);
  await requireProviderResponse(submitted,{provider:config.name,model:config.id,task:'voice'});
  const {job_id:jobId}=await submitted.json();if(!jobId)throw new Error('F5-TTS 未返回任务编号。');
  const deadline=Date.now()+300000;let job;
  while(Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,500));
    const response=await fetchWithTimeout(`${base}/api/job/${encodeURIComponent(jobId)}`,{headers:{Accept:'application/json'}},10000);
    await requireProviderResponse(response,{provider:config.name,model:config.id,task:'voice'});
    job=await response.json();
    if(job.status==='error')throw new Error(job.error||job.stage||'F5-TTS 合成失败。');
    if(job.status==='done')break;
  }
  if(job?.status!=='done'||!job.result?.url)throw new Error('F5-TTS 合成等待超时。');
  const mediaUrl=new URL(job.result.url,`${base}/`);const media=await fetchWithTimeout(mediaUrl,{},120000);
  await requireProviderResponse(media,{provider:config.name,model:config.id,task:'voice'});
  return {contentType:(media.headers.get('content-type')||'audio/wav').split(';')[0],audioBase64:Buffer.from(await media.arrayBuffer()).toString('base64'),jobId};
}

async function localTtsVoice(payload,config) {
  const voiceSettings=payload.voiceSettings||payload.voiceProfile?.voiceSettings||{};
  const language=config.language||payload.language||'zh-CN';
  if(config.id==='index_tts_local'&&!/^zh\b/i.test(language))throw new Error('IndexTTS 中文路由只接受中文语音包；英文请选择 F5-TTS。');
  if(config.id==='f5_tts_local'&&!/^en\b/i.test(language))throw new Error('F5-TTS 英文路由只接受英文语音包；中文请选择 IndexTTS。');
  const referenceUrl=payload.referenceAudio||payload.voiceReferenceUrl||'';
  if(!referenceUrl)throw new Error('当前音色没有参考音频，请先在语音库导入已授权样本。');
  if(!payload.rightsConfirmed)throw new Error('当前音色尚未确认声音授权，不能用于生成。');
  const referenceAudio=await assetUrlToDataUri(referenceUrl);
  const base=localTtsBase(config,await getConfigValue(config.env));
   const performance=compileVoicePerformance({engine:config.id,line:{text:payload.originalText||payload.text,emotion:payload.emotion,emotionIntensity:payload.emotionIntensity,pace:payload.pace||payload.speed,pauseStyle:payload.pauseStyle,emphasis:payload.emphasis,intention:payload.intention,subtext:payload.subtext},overrides:{speedFactor:payload.speedFactor,durationFactor:payload.durationFactor}});
  const autoEmotion=voiceSettings.autoEmotion!==false;const emotion=autoEmotion?performance.emotion:'自然';const intensity=autoEmotion?performance.emotionIntensity:50;
  const baseSpeed=Math.max(.5,Math.min(2,Number(voiceSettings.speed||1)));const baseDuration=Math.max(.5,Math.min(2,Number(voiceSettings.durationFactor||1)));
  const request={engine:config.id==='index_tts_local'?'index-tts':'f5-tts',language,text:autoEmotion?performance.ttsText:String(payload.originalText||payload.text||'').trim(),referenceAudio,referenceText:String(payload.referenceText||payload.voiceReferenceText||'').trim(),emotion,emotionIntensity:intensity,speed:autoEmotion?Math.max(.5,Math.min(2,baseSpeed*performance.speedFactor)):baseSpeed,durationFactor:autoEmotion?Math.max(.5,Math.min(2,baseDuration*performance.durationFactor)):baseDuration,voiceId:payload.voiceProfileId||'',voiceSettings:{...voiceSettings,performanceVersion:performance.version}};
   return withLocalTtsService(config.id,async()=>{
     const protocol=await localServiceProtocol(base,config);
     if(protocol==='index-gradio')throw new Error('检测到 IndexTTS WebUI，但它未开放星幕所需的合成接口。请用 scripts/local_tts_bridge.py 启动 IndexTTS 桥接服务。');
     if(protocol==='f5-desktop'){
      const result=await f5DesktopVoice(base,request,referenceAudio,payload,config);
       return {...result,appliedText:request.text,voiceModel:config.id,language,voiceProfileId:request.voiceId,protocol};
     }
     const response=await fetchWithTimeout(`${base}/api/tts`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'audio/wav, application/json'},body:JSON.stringify(request)},300000);
     await requireProviderResponse(response,{provider:config.name,model:config.id,task:'voice'});
     const contentType=(response.headers.get('content-type')||'').split(';')[0];
     if(contentType.startsWith('audio/'))return {contentType,audioBase64:Buffer.from(await response.arrayBuffer()).toString('base64'),appliedText:request.text,voiceModel:config.id,language,voiceProfileId:request.voiceId};
     const data=await response.json();let audioBase64=data.audioBase64||data.audio_base64||'';let resolvedType=data.contentType||data.content_type||'audio/wav';
     if(!audioBase64&&String(data.audio||'').startsWith('data:')){const parsed=String(data.audio).match(/^data:([^;]+);base64,(.+)$/);if(parsed){resolvedType=parsed[1];audioBase64=parsed[2]}}
     if(!audioBase64&&data.url){const audioUrl=new URL(data.url,`${base}/`);if(!['127.0.0.1','localhost'].includes(audioUrl.hostname))throw new Error('本地 TTS 返回了非本机音频地址，已拒绝下载。');const media=await fetchWithTimeout(audioUrl,{},120000);await requireProviderResponse(media,{provider:config.name,model:config.id,task:'voice'});resolvedType=(media.headers.get('content-type')||'audio/wav').split(';')[0];audioBase64=Buffer.from(await media.arrayBuffer()).toString('base64')}
     if(!audioBase64)throw new Error('本地 TTS 未返回音频数据。');
     return {contentType:resolvedType,audioBase64,appliedText:request.text,voiceModel:config.id,language,voiceProfileId:request.voiceId};
   });
}

function referenceUrls(payload = {}) {
  const values = [payload.referenceImages,payload.identityReferences,payload.environmentReference,payload.propReferences,payload.identityAnchor,payload.assetAnchor,payload.imageReference].flat(Infinity);
  return [...new Set(values.filter(value => typeof value === 'string' && (/^\/api\/assets\//.test(value) || /^data:image\//.test(value))))].slice(0, 10);
}
async function referenceDataUris(payload = {}) {
  return Promise.all(referenceUrls(payload).map(assetUrlToDataUri));
}
function dataUriPart(uri) {
  const match=String(uri||'').match(/^data:([^;]+);base64,(.+)$/);
  return match ? { mimeType:match[1], data:match[2] } : null;
}

async function geminiImage(payload, config, task = 'environment') {
  const prompt = payload.prompt || compilePrompt(task, payload); const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.id)}:generateContent?key=${encodeURIComponent(await getConfigValue('GEMINI_API_KEY'))}`;
  const references=(await referenceDataUris(payload)).map(dataUriPart).filter(Boolean);const parts=[{text:references.length?`${prompt}\n\n将随后 ${references.length} 张图作为身份、服装、道具或空间参考；只继承任务明确要求的锚点，不复制无关构图。`:prompt},...references.map(inlineData=>({inlineData}))];
  const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) }); await requireProviderResponse(response,{provider:'Google',model:config.id,task:'character'}); const data = await response.json(); const image = data.candidates?.flatMap(item => item.content?.parts || []).find(part => part.inlineData || part.inline_data); const inline = image?.inlineData || image?.inline_data; if (!inline?.data) throw new Error('Gemini 未返回图像数据。'); return { contentType: inline.mimeType || inline.mime_type || 'image/png', imageBase64: inline.data, prompt, referenceCount:references.length };
}

async function openAIImage(payload, config, task = 'environment') {
  const prompt = payload.prompt || compilePrompt(task, payload); const key=await getConfigValue('OPENAI_API_KEY');const references=(await referenceDataUris(payload)).map(dataUriPart).filter(Boolean);let response;
  if(references.length){const form=new FormData();form.append('model',config.id);form.append('prompt',prompt);form.append('size',payload.size||'1536x1024');references.forEach((item,index)=>form.append('image[]',new Blob([Buffer.from(item.data,'base64')],{type:item.mimeType}),`reference-${index+1}.${item.mimeType.includes('jpeg')?'jpg':'png'}`));response=await fetchWithTimeout('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form})}
  else response=await fetchWithTimeout('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.id, prompt, size: payload.size || '1536x1024' }) });
  await requireProviderResponse(response,{provider:'OpenAI',model:config.id,task}); const data = await response.json(); const item = data.data?.[0]; if (!item?.b64_json && !item?.url) throw new Error('OpenAI 未返回图像数据。'); return { contentType: 'image/png', imageBase64: item.b64_json, url: item.url, revisedPrompt: item.revised_prompt, prompt, referenceCount:references.length };
}

const customBaseUrl = async () => String(await getConfigValue('CUSTOM_OPENAI_BASE_URL') || '').trim().replace(/\/+$/, '');

async function customOpenAICompatibleText(task, payload, config) {
  const story = task === 'story';
  const base = await customBaseUrl(); if (!base) throw new Error('请先在“模型接入 → API 连接”填写 CUSTOM_OPENAI_BASE_URL（兼容接口地址）。');
  const apiKey = await getConfigValue('CUSTOM_OPENAI_API_KEY');
  const model = (await getConfigValue('CUSTOM_OPENAI_MODEL')) || config.id;
  const endpoint = `${base}/chat/completions`;
  const bodyWithFormat = { model, messages: [{ role: 'system', content: instructionFor(task, payload) }, { role: 'user', content: JSON.stringify({ schema: story ? screenplaySchema : editingSchema, input: payload }).slice(0, 800000) }], response_format: { type: 'json_object' }, temperature: story ? 0.7 : 0.2 };
  let response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bodyWithFormat) });
  // 部分第三方兼容接口不接受 response_format，遇到参数错误时自动降级为普通 JSON 提示。
  if (response.status === 400) {
    const { response_format: _omit, ...bodyPlain } = bodyWithFormat;
    response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPlain) });
  }
  await requireProviderResponse(response,{provider:config.provider,model:config.id,task});
  const data = await response.json(); const parsed = extractJson(data.choices?.[0]?.message?.content); return story ? { screenplay: parsed } : parsed;
}

async function customOpenAIImage(payload, config, task = 'environment') {
  const base = await customBaseUrl(); if (!base) throw new Error('请先在“模型接入 → API 连接”填写 CUSTOM_OPENAI_BASE_URL（兼容接口地址）。');
  const apiKey = await getConfigValue('CUSTOM_OPENAI_API_KEY');
  const model = (await getConfigValue('CUSTOM_OPENAI_IMAGE_MODEL')) || 'custom-openai-image';
  const prompt = payload.prompt || compilePrompt(task, payload);
  const size = payload.size || (payload.ratio === '9:16' ? '720x1280' : payload.ratio === '1:1' ? '1024x1024' : '1280x720');
  const response = await fetchWithTimeout(`${base}/images/generations`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size, n: 1 }) });
  await requireProviderResponse(response,{provider:config.provider,model:config.id,task:'character'});
  const data = await response.json(); const item = data.data?.[0]; if (!item?.b64_json && !item?.url) throw new Error('第三方生图服务未返回图像数据（b64_json 或 url）。');
  return { contentType: 'image/png', imageBase64: item.b64_json, url: item.url, prompt };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms)); const ratioMap = { '16:9': '1280:720', '9:16': '720:1280', '1:1': '960:960' };
async function runwayVideo(payload, config) {
  const headers = { Authorization: `Bearer ${await getConfigValue('RUNWAY_API_KEY')}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' }; const imageToVideo = Boolean(payload.imageUrl); const capability=getModelCapability(config.id);if(capability.requiresImage&&!imageToVideo) throw new Error(`${config.name} 只支持图生视频，请先为镜头生成首帧或选择支持文生视频的模型。`); const endpoint = imageToVideo ? 'image_to_video' : 'text_to_video'; const promptText = imageToVideo ? compileRunwayMotionPrompt(payload) : compilePrompt('video', { ...payload, ...(payload.camera || {}), generationMode: 'text-to-video', imageReference: '无', subjectAction: payload.subjectAction || payload.prompt, environmentAction: payload.environmentAction || '环境产生自然、克制的动态', lighting: payload.lighting || '电影级主光', continuity: payload.continuity || [], intensity: payload.camera?.intensity || 35 }); const requestedDuration=Math.max(1,Math.min(10,Math.round(Number(payload.duration)||3)));const renderDuration=clampModelDuration(config.id,requestedDuration);const request = { model: config.id, promptText: promptText.slice(0, 1000), ratio: ratioMap[payload.ratio] || payload.ratio || '1280:720', duration:renderDuration }; if (imageToVideo) request.promptImage = await assetUrlToDataUri(payload.imageUrl); if (Number.isFinite(Number(payload.seed))) request.seed = Number(payload.seed);
  const start = await fetchWithTimeout(`https://api.dev.runwayml.com/v1/${endpoint}`, { method: 'POST', headers, body: JSON.stringify(request) }); await requireProviderResponse(start,{provider:'Runway',model:config.id,task:'video'}); const queued = await start.json(); const taskId = queued.id; if (!taskId) throw new Error('Runway 未返回任务 ID。');
  return { taskId, status: 'PENDING', output: [], model: config.id, prompt: promptText, requestedDuration, renderDuration, trimTo:renderDuration===requestedDuration?null:requestedDuration };
}

async function geminiOmniVideo(payload, config) {
  const prompt=compilePrompt('video',{...payload,...(payload.camera||{}),generationMode:payload.imageUrl?'image-to-video':'text-to-video',imageReference:payload.imageUrl||'无'});
  const input=[];
  if(payload.imageUrl){const inline=dataUriPart(await assetUrlToDataUri(payload.imageUrl));if(inline)input.push({type:'image',data:inline.data,mime_type:inline.mimeType})}
  input.push({type:'text',text:prompt});
  const response=await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':await getConfigValue('GEMINI_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify({model:config.apiModel||'gemini-omni-flash-preview',input:input.length===1?prompt:input,response_format:{type:'video',aspect_ratio:['9:16','16:9'].includes(payload.ratio)?payload.ratio:'16:9'},generation_config:{video_config:{task:payload.imageUrl?'image_to_video':'text_to_video'}}})},300000);
  await requireProviderResponse(response,{provider:'Google',model:config.id,task:'video'});
  const data=await response.json();const video=data.output_video||data.outputVideo;
  if(!video?.data)throw new Error('Gemini Omni 未返回可写入的视频数据。');
  return {contentType:video.mime_type||video.mimeType||'video/mp4',videoBase64:video.data,prompt,interactionId:data.id||'',status:'SUCCEEDED'};
}

async function geminiVeoVideo(payload, config) {
  const prompt=compileVeoPrompt({...payload,...(payload.camera||{}),generationMode:payload.imageUrl?'image-to-video':'text-to-video',imageReference:payload.imageUrl||'无'});
  const firstFrame=payload.imageUrl?dataUriPart(await assetUrlToDataUri(payload.imageUrl)):null;
  const lastFrameUrl=payload.lastFrameImageUrl||payload.endFrameImageUrl||'';
  const lastFrame=lastFrameUrl?dataUriPart(await assetUrlToDataUri(lastFrameUrl)):null;
  const referenceFrames=[];
  if(!firstFrame)for(const url of [...new Set((payload.identityReferences||[]).filter(Boolean))].slice(0,3)){const part=dataUriPart(await assetUrlToDataUri(url));if(part)referenceFrames.push(part)}
  const request=buildVeoRequestBody({prompt,payload:{...payload,negativePrompt:payload.negativePrompt||'identity drift, wardrobe changes, prop drift, extra limbs, scene discontinuity'},firstFrame,lastFrame,referenceFrames});
  const requestedDuration=Math.max(1,Math.min(10,Math.round(Number(payload.duration)||3)));const renderDuration=request.renderDuration;
  const response=await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.apiModel||'veo-3.1-generate-preview')}:predictLongRunning`,{method:'POST',headers:{'x-goog-api-key':await getConfigValue('GEMINI_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify(request.body)});
  await requireProviderResponse(response,{provider:'Google',model:config.id,task:'video'});
  const operation=await response.json();if(!operation.name)throw new Error('Veo 3.1 未返回异步任务名称。');
  return {taskId:operation.name,status:operation.done?'RUNNING':'PENDING',output:[],model:config.id,prompt,requestedDuration,renderDuration,trimTo:renderDuration===requestedDuration?null:requestedDuration,requestMode:request.mode,referenceCount:request.referenceCount};
}

export function parseVeoOperation(operation={}) {
  const failure=operation.error?.message||operation.error?.status||'';const video=operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video||operation.response?.generatedVideos?.[0]?.video;
  return {done:Boolean(operation.done),failed:Boolean(operation.done&&failure),failure,uri:video?.uri||'',mimeType:video?.mimeType||video?.mime_type||'video/mp4'};
}

export async function pollProviderTask(taskId, routeId) {
  const config = resolveRoute('video', routeId);
  if (config.adapter === 'runway') {
    const headers = { Authorization: `Bearer ${await getConfigValue('RUNWAY_API_KEY')}`, 'X-Runway-Version': '2024-11-06' };
    const response = await fetchWithTimeout(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(taskId)}`, { headers });
    await requireProviderResponse(response,{provider:'Runway',model:config.id,task:'video'});
    const task = await response.json();
    return { taskId, status: task.status, output: task.output || [], failure: task.failure || task.failureCode || '', progress: task.progress ?? null, provider:'Runway', model: config.id };
  }
  if(config.adapter==='gemini-veo'){
    if(!/^[a-zA-Z0-9_./-]+$/.test(String(taskId||'')))throw new Error('Veo 异步任务名称无效。');
    const apiKey=await getConfigValue('GEMINI_API_KEY');const response=await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/${String(taskId).replace(/^\//,'')}`,{headers:{'x-goog-api-key':apiKey}});
    await requireProviderResponse(response,{provider:'Google',model:config.id,task:'video'});const operation=await response.json();
    const parsed=parseVeoOperation(operation);if(!parsed.done)return {taskId,status:'RUNNING',output:[],progress:null,provider:'Google',model:config.id};
    if(parsed.failed)return {taskId,status:'FAILED',output:[],failure:parsed.failure||'Veo 生成失败',provider:'Google',model:config.id};
    if(!parsed.uri)throw new Error('Veo 任务已完成，但未返回视频下载地址。');const media=await fetchWithTimeout(parsed.uri,{headers:{'x-goog-api-key':apiKey},redirect:'follow'},300000);await requireProviderResponse(media,{provider:'Google',model:config.id,task:'video'});
    return {taskId,status:'SUCCEEDED',output:[parsed.uri],remoteOutput:[parsed.uri],videoBase64:Buffer.from(await media.arrayBuffer()).toString('base64'),contentType:media.headers.get('content-type')?.split(';')[0]||parsed.mimeType,progress:1,provider:'Google',model:config.id};
  }
  throw new Error('该路线不支持异步任务查询。');
}

function sampleStoryboard(lead, partner) {
  const data = [['1','雨夜入口','远景','平视','缓慢推进','纵深构图',4,`${lead}进入雨幕中的码头`,'雾沿地面流动，远处信号灯闪烁','冷蓝逆光','空旷码头与远处孤立人物','人物停在异常信件前','多余人物，服装变化，空间跳轴'],['1','收到来信','中景','侧前方15°','横移跟拍','三分法',5,`${lead}弯腰拾起没有寄件人的信`,'雨水打在信封和雨衣上','青橙轮廓光','手伸向潮湿信封','信封打开，人物认出字迹','手指畸形，信件文字乱码，发型变化'],['1','父亲笔迹','特写','俯拍','焦点转移','中心构图',3,'手指掠过熟悉的签名','雨滴从纸面滑落','暖色局部光','焦点在湿润纸张','焦点转到颤抖指尖','错误文字，多余手指，道具颜色变化'],['2','顾川阻止','中近景','过肩','手持轻晃','对角构图',4,`${partner}挡在${lead}与灯塔之间`,'海雾变浓，背景灯塔忽明忽暗','冷蓝侧光','两人保持一前一后站位','主角越过对方看向灯塔','人物换脸，站位反转，视线不匹配'],['2','做出选择','大特写','平视','极慢推近','对称构图',4,`${lead}攥紧钥匙，眼神由犹豫变坚定`,'背景光斑缓慢拉长','琥珀眼神光','嘴唇轻抿，呼吸可见','眼神锁定画外灯塔','过度表情，五官漂移，雨衣变色'],['3','灯塔重启','全景','低机位','推轨后仰摇','引导线构图',5,`${lead}冲向亮起的废弃灯塔`,'灯光逐层点亮，海浪拍击台阶','高反差体积光','人物从画面下方进入','灯塔占满画面并留下悬念','建筑结构变化，人物比例异常，镜头抖动']];
  let cursor=0;
  return data.map(([sceneRef,name,type,angle,move,composition,duration,subjectAction,environmentAction,lighting,startFrame,endFrame,negativePrompt],index) => { const timeRange=`${cursor}–${cursor+duration}s`;cursor+=duration;const sound=index===0?'雨声先入，远处金属低鸣':'环境声连续，关键动作处加入克制音效';return { groupId:`group-${Math.floor(index/3)+1}`,sceneRef,scene:`场景 ${sceneRef}`,timeRange,characters:[lead,partner],name,type,angle,move,composition,duration,visualContent:`${subjectAction}；${environmentAction}`,narrativePurpose:index<3?'建立异常来信并推动发现':'升级阻力并完成选择',subjectAction,environmentAction,lighting,sound,audio:sound,caption:'',startFrame,endFrame,transition:index===data.length-1?'闪白切黑':'动作或视线匹配切下一镜',negativePrompt,continuity:[`${lead}身份锚点`,`${partner}身份锚点`,'雨夜冷蓝色板','雨衣与旧钥匙','码头空间轴线'] };});
}

function mockResult(task, payload) {
  const names = payload.characters?.map(item => item.name).filter(Boolean) || ['沈知遥', '顾川']; const lead = names[0] || '主角'; const partner = names[1] || '关键角色'; const seed = payload.synopsis || payload.sourceText || '主角收到一条改变命运的线索。';
  const results = {
    story: { message: '已完成故事圣经、平台留存计划、剧情节拍、对白医生、逐镜分镜与连续性检查。', screenplay: { title: payload.title || '未命名剧本', logline: String(seed).replace(/\s+/g,' ').slice(0,90), theme: '面对被掩埋的真相，选择比答案更重要。', storyBible: { genre: payload.genre || '悬疑情感短剧', tone: '克制、潮湿、逐步升级', audience: payload.audience || '18–35 岁竖屏短剧观众', visualStyle: payload.visualStyle || '电影级冷蓝雨夜，青橙点缀', worldRules: ['灯塔熄灭后不应再次亮起','旧钥匙只能打开塔顶档案室','角色外形、服装与道具跨镜头保持一致'], promises: ['前三秒出现异常信件','每个场次产生一次新信息','集尾揭示灯塔并未废弃'], characterArcs: [{ character: lead, start: '回避父亲失踪的真相', turn: '认出来信并失去退路', end: '主动进入灯塔承担代价' }, { character: partner, start: '试图保护并隐瞒', turn: '阻止失败暴露矛盾', end: '被迫跟随主角进入危险' }], characterProfiles:[{name:lead,role:'主角',age:'24 岁',backstory:'父亲失踪后回避雾港十年，熟悉旧码头路线但拒绝谈论灯塔。',personality:'克制、观察细致，遇到证据会压过恐惧立即行动。',contradiction:'渴望真相却害怕记忆证明自己曾被欺骗。',desire:'确认父亲失踪真相',fear:'重要记忆并不可靠',appearance:{face:'窄椭圆脸，直眉，琥珀色眼睛',hair:'黑色齐耳短发，雨水打湿后贴近脸侧',body:'中等身高，瘦而有耐力，站姿略前倾',skin:'自然偏冷肤色',distinctiveFeatures:'左眉尾浅疤，远看可识别的芥末黄雨衣'},wardrobe:{silhouette:'短款防水雨衣与深色直筒裤形成利落轮廓',garments:'芥末黄哑光雨衣、黑色针织衫、深灰工装裤、旧皮靴',materials:'磨砂防水布、细针织、潮湿旧皮革',palette:'芥末黄、炭黑、冷灰',accessories:'父亲留下的红色小型录音机挂在右侧肩带'},voice:{timbre:'清澈偏低，近讲时带轻微气声',pitch:'中低音区',rhythm:'平时短句偏慢，发现线索后语速提升',accent:'普通话，极轻沿海口音',baselineEmotion:'克制警觉',dynamicRange:'迟疑时收紧尾音，坚定时气息前置且不喊叫'},performanceRules:['思考时先移动视线再转头','恐惧通过呼吸与握紧道具表达，不夸张后退'],sourceBasis:'proposed',missingFacts:['左眉疤与录音机是否符合用户既有方案']},{name:partner,role:'关键角色',age:'29 岁',backstory:'曾参与灯塔封锁，知道父亲失踪部分真相。',personality:'寡言、保护欲强，以命令掩盖愧疚。',contradiction:'想阻止主角接近危险，却因此暴露自己知情。',desire:'让主角离开雾港',fear:'旧事故再次发生',appearance:{face:'方形下颌，深色眼睛，眼下有长期失眠痕迹',hair:'深棕短发，侧分，雨中保持整齐轮廓',body:'高而结实，动作克制',skin:'自然中性肤色',distinctiveFeatures:'深绿色旧航海夹克与银色口哨'},wardrobe:{silhouette:'宽肩短夹克配深色长裤',garments:'深绿色航海夹克、灰蓝衬衫、黑色防水长裤',materials:'旧帆布、棉布、防水纤维',palette:'深绿、灰蓝、黑',accessories:'磨损银色口哨固定在胸前'},voice:{timbre:'低沉干净，辅音收紧',pitch:'低音区',rhythm:'句间停顿长，警告时语速反而变慢',accent:'标准普通话',baselineEmotion:'压抑克制',dynamicRange:'愧疚时音量降低，危险迫近时仍保持低声'},performanceRules:['先观察主角再开口','阻止动作始终留有退路，不粗暴拉扯'],sourceBasis:'proposed',missingFacts:['参与封锁的具体身份需用户确认']}], props:[{name:'旧钥匙',appearance:'黄铜长柄旧钥匙，三齿，环柄有缺口和氧化绿锈',scale:'掌心长度约 11 厘米',materialPalette:'旧黄铜、氧化绿锈、深褐磨损',signatureDetail:'环柄右上方三角缺口',narrativeFunction:'打开灯塔档案室并证明父亲留下线索',owner:lead,state:'被雨水打湿但结构完整',stateChanges:['干燥封存→雨水打湿→插入铁门锁孔'],sceneRefs:['1','2','3']},{name:'无寄件人信封',appearance:'米白棉纸信封，右下角水渍，红色蜡封破损',scale:'A6 信封尺寸',materialPalette:'米白棉纸、暗红蜡封、灰蓝水渍',signatureDetail:'蜡封中央缺失一角的灯塔纹章',narrativeFunction:'触发调查并指向灯塔',owner:lead,state:'潮湿且已打开',stateChanges:['封闭潮湿→拆封→收入雨衣内袋'],sceneRefs:['1','2']}] }, platformPlan:{targetPlatform:payload.publishPlatform||'YouTube Shorts / Bilibili',openingVariants:['异常信件直接入画','顾川先说出禁止前往的警告','灯塔亮起结果前置后回到来信'],retentionBeats:['0–3s 建立异常','3–10s 认出笔迹','10–20s 阻止与选择','结尾灯塔亮起兑现'],titleOptions:['熄灭十年的灯塔，为何只为她亮起？','父亲失踪十年后，她收到一封亲笔信','这封雨夜来信把她引向废弃灯塔'],thumbnailConcept:'主角手持湿透信件，远处灯塔亮起，冷蓝雨夜中保留高对比面部与信件轮廓',complianceNotes:['标注 AI 生成或合成内容','音乐、声音克隆和参考图需确认授权']}, episodes: [{ title: '第 1 集 · 雾港来信', hook: '停运码头出现父亲亲笔信。', cliffhanger: '熄灭十年的灯塔在主角靠近时逐层亮起。', scenes: [{ heading: '1. 外景 · 雾港码头 · 夜', action: `${lead}在雨夜抵达停运码头，拾起没有寄件人的信并认出父亲笔迹。`, purpose: '前三秒建立视觉钩子并抛出谜题', conflict: `${partner}要求她立刻离开。`, visualHook: '异常信件、旧钥匙与远处熄灭灯塔形成连续动作', beat: '发现', transition: '由信封特写匹配切到钥匙特写', characters: [lead,partner], sceneBible:{timeWeather:'深夜暴雨，连续时间',layout:'码头雨棚在右，铁轨在左，灯塔位于远处正前方',entrances:'人物从雨棚后方进入，出口通往防波堤',axis:'人物与灯塔连线为主轴，摄影机保持轴线右侧',lighting:'冷蓝顶光，灯塔方向有弱暖色轮廓光',palette:'冷蓝灰为主，芥末黄雨衣和红蜡封为识别色',propPositions:'信封位于雨棚边积水处，钥匙在主角右手'} }, { heading: '2. 外景 · 防波堤 · 连续', action: `${lead}核对信中暗号，确认它指向废弃灯塔。`, purpose: '补足人物动机并升级风险', conflict: `${lead}必须在安全与真相之间立即选择。`, visualHook: '线索由模糊转清晰，焦点转移到人物反应', beat: '对抗', transition: '视线匹配切向灯塔', characters: [lead,partner], sceneBible:{timeWeather:'同一深夜暴雨，雨势增强',layout:'狭长防波堤通向灯塔，海面在左，护栏在右',entrances:'后方连接码头，前方连接灯塔入口',axis:'沿防波堤纵轴拍摄，不跨越人物对话轴',lighting:'左后方冷蓝海光，灯塔方向弱暖光',palette:'延续冷蓝灰与芥末黄识别色',propPositions:'钥匙始终在主角右手，信封收入雨衣内袋'} }, { heading: '3. 外景 · 灯塔入口 · 夜', action: `${lead}越过封锁线，灯塔在她面前逐层亮起。`, purpose: '完成第一幕转折并留下集尾悬念', conflict: '潮水封路，退路消失。', visualHook: '低机位推进，灯光由下至上逐层点亮', beat: '选择', transition: '灯光闪白切黑', characters: [lead,partner], sceneBible:{timeWeather:'同一深夜，暴雨与海雾',layout:'圆形灯塔居中，石阶正前方，铁门位于底部',entrances:'人物由防波堤进入，铁门为唯一入口',axis:'以石阶和铁门中线为主轴',lighting:'冷蓝环境光，塔灯由下至上转为暖白',palette:'冷蓝石材、锈红铁门、暖白塔灯',propPositions:'钥匙对准铁门锁孔，封锁带在台阶下方'} }], dialogues: [{ character: lead, emotion: '迟疑', text: '这封信……是他的字。', subtext: '她已经相信父亲可能还活着。' }, { character: partner, emotion: '克制', text: '灯塔熄了十年，你不该去。', subtext: '他知道灯塔为何熄灭。' }, { character: lead, emotion: '坚定', text: '如果答案在上面，我就必须去。', subtext: '她决定承担追查的代价。' }] }], storyboard: sampleStoryboard(lead,partner) } },
    character: { message: '已生成角色身份参考板提示词并锁定跨镜头锚点。', prompt: `${payload.name || '角色'}，正面、侧面、全身与四种表情，统一脸型、发型、服装材质和色板，电影角色参考板` }, prop: { message: '已生成关键道具资产提示词并锁定状态版本。', prompt: compilePrompt('prop', payload), status: 'prompt-ready' }, environment: { message: '已生成环境空间圣经并建立场景轴线。', prompt: `${payload.scene || '故事场景'}，电影环境概念设计，无人物，空间地图、主光方向、天气、材质和色板一致` }, keyframe: { message: '镜头首帧任务已建立并完成连续性校验。', prompt: compilePrompt('keyframe', payload), status: 'prompt-ready' }, voice: { message: '声音样片已生成并绑定角色与情绪。', duration: 4.8, status: 'prompt-ready' }, video: { message: '镜头任务已完成，首尾帧、运动参数与连续性锚点已保留。', duration: payload.duration || 3, status: 'SUCCEEDED', simulated: true }, editing: { message: 'AI 已生成安全的剪辑提案。', operations: [{ operation: 'trim', target: 'A1', params: { inSeconds: 0.1, outSeconds: 0.1 }, reason: '移除对白前后空白' }, { operation: 'addCaptions', target: 'T1', params: { style: 'cinematic' }, reason: '提升信息可读性' }, { operation: 'normalizeAudio', target: 'master', params: { targetLufs: -14 }, reason: '统一响度' }] }
  };
  return { ...results[task], provider: fallbackNames[task] };
}

export async function runProvider(task, payload = {}, routeId) {
  // 未显式传 routeId 时，优先使用用户在“模型接入中心”配置的 routePreferences，与前端展示保持一致。
  if (!routeId) { const prefs = (await publicProviderConfig()).routePreferences || {}; routeId = prefs[task] || defaultRoute[task]; }
  const list = routes[task];
  let config = resolveRoute(task, routeId); let connected = Boolean((await getConfigValue(config.env))||config.defaultBase); const live = await isLiveMode(); let autoFellBack = false;
  if (process.env.NODE_ENV === 'test' && process.env.XINGMU_TEST_PROVIDER_FAILURE) {
    const delayMs = Math.max(0, Math.min(10_000, Number(process.env.XINGMU_TEST_PROVIDER_DELAY_MS) || 0));
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
    const injected = String(process.env.XINGMU_TEST_PROVIDER_FAILURE).trim();
    if (injected === 'needs_reconcile') { const error = new Error('测试夹具：供应商受理结果无法确认。'); error.needsReconcile = true; throw error; }
  }
  // 智能分配：所选模型未配置密钥时，自动切换到同任务下第一个已配置密钥的真实模型，避免无谓失败。
  if (!live && config.accessMode !== 'manual' && !connected) {
    const candidates = await Promise.all((list || []).filter(item => item.accessMode !== 'manual' && item.id !== config.id).map(async item => ({ item, connected: Boolean(await getConfigValue(item.env)) })));
    const fallback = candidates.find(entry => entry.connected);
    if (fallback) { config = fallback.item; connected = true; autoFellBack = true; }
  }
  const promptValues=task==='video'?{...payload,...(payload.camera||{}),subjectAction:payload.subjectAction||payload.prompt,environmentAction:payload.environmentAction||'环境产生自然、克制的动态',lighting:payload.lighting||'电影级主光',continuity:payload.continuity||[],intensity:payload.camera?.intensity||35}:payload; const promptTask=compilePromptTask(task,promptValues);
  if(task==='video'){const preflight=auditVideoPayload(payload,config.id);promptTask.preflightResult=preflight;if(!preflight.ready){const error=new Error(`镜头生成准备未通过：${preflight.issues.map(item=>item.label).join('、')}。${preflight.issues[0]?.fix||'请返回分镜台补齐。'}`);error.code='VIDEO_PREFLIGHT_FAILED';error.issues=preflight.issues;throw error}}
  if (!promptTask.quality.ready) { const error=new Error(`${promptTask.label}输入预检未通过：缺少 ${promptTask.quality.missing.join('、')}。请先补齐上游资产或项目设定。`); error.code='PROMPT_INPUT_INCOMPLETE'; error.missing=promptTask.quality.missing; throw error; }
  assertProviderInput(task, payload);
  if (!live) return { ok: true, mode: 'demo', task, provider: fallbackNames[task], model: config.id, requestedModel: config.id, promptTask, result: mockResult(task, payload), warning: '当前明确启用了开发演示模式，此结果不是 AI 供应商生成。' };
  if (config.accessMode === 'manual') { const error=new Error(`${config.name} 当前采用外部平台生成：请复制该任务的规范提示词，生成后上传回收。`);error.code='PROVIDER_NOT_CONFIGURED';throw error; }
  if (!connected) { const error = new Error(`${config.provider} 尚未配置：请在“模型接入 → API 连接”中填写 ${config.env}。`); error.code = 'PROVIDER_NOT_CONFIGURED'; throw error; }
  let result;
  try { if (config.adapter === 'openai') result = await openAIText(task, payload, config); else if (['deepseek','qwen'].includes(config.adapter)) result = await openAICompatibleText(task, payload, config); else if (config.adapter === 'custom-openai') result = await customOpenAICompatibleText(task, payload, config); else if (config.adapter === 'anthropic') result = await anthropicText(task, payload, config); else if (config.adapter === 'gemini-text') result = await geminiText(task, payload, config); else if (config.adapter === 'gemini-image') result = await geminiImage(payload, config, task); else if (config.adapter === 'openai-image') result = await openAIImage(payload, config, task); else if (config.adapter === 'custom-openai-image') result = await customOpenAIImage(payload, config, task); else if (config.adapter === 'elevenlabs') result = await elevenLabsVoice(payload, config); else if (config.adapter === 'local-tts') result = await localTtsVoice(payload, config); else if (config.adapter === 'gemini-omni-video') result = await geminiOmniVideo(payload, config); else if (config.adapter === 'gemini-veo') result = await geminiVeoVideo(payload, config); else if (config.adapter === 'runway') result = await runwayVideo(payload, config); else throw new Error(`尚未实现模型适配器：${config.adapter}`); } catch (error) { throw normalizeProviderError(error,{provider:config.provider,model:config.id,task}); }
  assertProviderOutput(task, result, { live: true });
  await recordRouteExecution({task,routeId:config.id,provider:config.provider,model:config.id});
  return { ok: true, mode: 'live', task, provider: config.provider, model: config.id, promptTask, result, ...(autoFellBack ? { warning: `所选模型未配置，已自动切换到 ${config.provider} · ${config.name}。` } : {}) };
}

export async function runStagedStory(payload = {}, routeId, { completedResults = [], onChunk, failureAfterChunk = null } = {}) {
  const sourceText = String(payload.sourceText || ''); const plan = buildSourceChunkPlan(sourceText, { maxChars: Number(payload.chunkMaxChars) || 120000, overlapChars: Number(payload.chunkOverlapChars) || 1200 });
  if (plan.chunkCount <= 1) return { ...(await runProvider('story', { ...payload, stagedStory: false }, routeId)), stage: 'story-single', coveredChunkIds: plan.chunks.map(item => item.id) };
  const normalizedSource = normalizeSourceText(sourceText); const parts = [];
  for (const [index, chunk] of plan.chunks.entries()) {
    if (failureAfterChunk !== null && index >= Number(failureAfterChunk)) throw Object.assign(new Error(`分阶段审计故障：在第 ${Number(failureAfterChunk) + 1} 个 chunk 前中断。`), { code: 'STAGED_STORY_INJECTED_FAILURE', retryable: false });
    if (completedResults[index]) { parts.push(completedResults[index]); continue; }
    const chunkText = normalizedSource.slice(chunk.sourceStart, chunk.sourceEnd);
    const response = await runProvider('story', { ...payload, stagedStory: false, sourceText: chunkText, sourceChunkPlan: { ...plan, chunkCount: 1, chunks: [chunk] }, episodeCount: 1, revisionMode: 'chunk-analysis' }, routeId);
    parts[index] = response;
    if (onChunk) await onChunk({ results: parts, coveredChunkIds: plan.chunks.slice(0, index + 1).filter((_, itemIndex) => parts[itemIndex]).map((_, itemIndex) => plan.chunks[itemIndex].id), index, total: plan.chunkCount });
  }
  const first = parts[0]; const screenplays = parts.map(item => item.result?.screenplay).filter(Boolean); const base = screenplays[0] || {};
  const episodes = screenplays.flatMap((screenplay, index) => (screenplay.episodes || []).map((episode, episodeIndex) => ({ ...episode, id: `ep-${String(index + 1).padStart(2, '0')}`, title: episode.title || `第 ${index + 1} 集`, chunkId: plan.chunks[index]?.id || `chunk-${episodeIndex + 1}` })));
  const storyboard = screenplays.flatMap(screenplay => screenplay.storyboard || []);
  return { ...first, result: { ...first.result, screenplay: { ...base, episodes, storyboard } }, stage: 'story-chunks', coveredChunkIds: plan.chunks.map(item => item.id), chunkCount: plan.chunkCount };
}
