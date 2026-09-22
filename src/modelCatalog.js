import { getModelCapability } from '../shared/modelCapabilities.mjs';

export const modelOptions = {
  story: {
    label: '小说 / 剧本 / 台词',
    fallback: '星幕故事引擎',
    recommended: 'gpt-5.6',
    options: [
      { id: 'gpt-5.6', provider: 'OpenAI', name: 'GPT-5.6', badge: '总编首选', note: '长篇理解、结构化剧本、复杂改编与审稿' },
      { id: 'claude-opus-5', provider: 'Anthropic', name: 'Claude Opus 5', badge: '人物对白', note: '自然对白、人物关系与长篇叙事润色' },
      { id: 'qwen3.8-max', provider: '阿里云百炼', name: 'Qwen3.8-Max', badge: '中文长篇', note: '中文小说、百万上下文与结构化输出' },
      { id: 'deepseek-v4-pro', provider: 'DeepSeek', name: 'DeepSeek V4 Pro', badge: '高性价比', note: '长上下文、剧情推理与批量场次生成' },
      { id: 'gemini-3.1-pro-preview', provider: 'Google', name: 'Gemini 3.1 Pro', badge: '原著拆解', note: '超长原文理解、多模态参考与剧情归纳' },
      { id: 'custom-openai', provider: '自定义 OpenAI 兼容', name: '自定义模型', badge: '第三方接入', note: '接入任意 OpenAI 兼容文本模型（Moonshot / GLM / SiliconFlow / Ollama 等）' }
    ]
  },
  character: {
    label: '人物形象', fallback: '星幕角色画师', recommended: 'gemini-3-pro-image',
    options: [
      { id: 'gemini-3-pro-image', provider: 'Google', name: 'Nano Banana Pro', badge: '一致性', note: '多参考人物设定、服装与面部身份锚点' },
      { id: 'gemini-3.1-flash-image', provider: 'Google', name: 'Nano Banana 2', badge: '快速预览', note: '高吞吐角色草图与参考图迭代' },
      { id: 'custom-openai-image', provider: '自定义 OpenAI 兼容', name: '自定义生图', badge: '第三方接入', note: '接入支持 images/generations 的第三方生图服务' }
    ]
  },
  prop: {
    label: '关键道具', fallback: '星幕道具美术', recommended: 'gpt-image-2',
    options: [
      { id: 'gpt-image-2', provider: 'OpenAI', name: 'GPT Image 2', badge: '材质细节', note: '道具结构、材质、磨损与状态版本' },
      { id: 'gemini-3-pro-image', provider: 'Google', name: 'Nano Banana Pro', badge: '参考一致', note: '多视图道具参考与场景内复用' },
      { id: 'custom-openai-image', provider: '自定义 OpenAI 兼容', name: '自定义生图', badge: '第三方接入', note: '接入支持 images/generations 的第三方生图服务' }
    ]
  },
  environment: {
    label: '环境背景', fallback: '星幕场景画师', recommended: 'gpt-image-2',
    options: [
      { id: 'gpt-image-2', provider: 'OpenAI', name: 'GPT Image 2', badge: '场景首选', note: '复杂场景、美术细节与参考图控制' },
      { id: 'gemini-3-pro-image', provider: 'Google', name: 'Nano Banana Pro', badge: '多参考', note: '场景延展、风格继承与空间一致性' },
      { id: 'custom-openai-image', provider: '自定义 OpenAI 兼容', name: '自定义生图', badge: '第三方接入', note: '接入支持 images/generations 的第三方生图服务' }
    ]
  },
  voice: {
    label: '角色声音', fallback: '星幕演播室', recommended: 'index_tts_local',
    options: [
      { id: 'index_tts_local', provider: '本地 IndexTTS', name: 'IndexTTS 2.5 中文', badge: '中文本地', note: '中文对白、情绪控制与批量生成，使用已授权参考音频' },
      { id: 'f5_tts_local', provider: '本地 F5-TTS', name: 'F5-TTS 英文', badge: '英文本地', note: '英文零样本对白与旁白；预训练权重为非商用许可' },
      { id: 'eleven_v3', provider: 'ElevenLabs', name: 'Eleven v3', badge: '表演力', note: '多语种、情绪化角色对白与声线克隆' },
      { id: 'eleven_multilingual_v2', provider: 'ElevenLabs', name: 'Multilingual v2', badge: '稳定', note: '成熟稳定的中文角色声音生成' }
    ]
  },
  video: {
    label: '镜头视频', fallback: '星幕镜头引擎', recommended: 'gemini_omni_flash',
    options: [
      { id: 'gemini_omni_flash', provider: 'Google', name: 'Gemini Omni Flash', badge: '官方 API', note: '多输入理解、角色一致性与图生视频' },
      { id: 'seedance2', provider: '外部平台', name: 'Seedance 2', badge: '手动回收', note: '复制规范提示词到外部平台，生成后上传回收' },
      { id: 'gen4.5', provider: 'Runway', name: 'Gen-4.5', badge: '电影质感', note: '高质量文生 / 图生视频与专业母版' },
      { id: 'veo3.1', provider: 'Google', name: 'Veo 3.1', badge: '官方 API', note: '原生音频、首尾帧控制、参考图与镜头延展' },
      { id: 'gen4_turbo', provider: 'Runway', name: 'Gen-4 Turbo', badge: '低成本预览', note: '角色关键帧快速动效预览' }
    ]
  },
  editing: {
    label: 'AI 剪辑 / 质检', fallback: '星幕剪辑导演', recommended: 'gpt-5.6-terra',
    options: [
      { id: 'gpt-5.6-terra', provider: 'OpenAI', name: 'GPT-5.6 Terra', badge: '剪辑导演', note: '节奏、字幕、镜头连续性与可撤销剪辑提案' },
      { id: 'gemini-3.5-flash', provider: 'Google', name: 'Gemini 3.5 Flash', badge: '视频理解', note: '长视频理解、时间点分析与批量质检' },
      { id: 'deepseek-v4-flash', provider: 'DeepSeek', name: 'DeepSeek V4 Flash', badge: '批量', note: '低成本生成剪辑决策与交付检查表' },
      { id: 'custom-openai', provider: '自定义 OpenAI 兼容', name: '自定义模型', badge: '第三方接入', note: '接入任意 OpenAI 兼容文本模型（Moonshot / GLM / SiliconFlow / Ollama 等）' }
    ]
  }
};

for (const group of Object.values(modelOptions)) for (const option of group.options) option.capability = getModelCapability(option.id);

export const providerCatalog = Object.fromEntries(Object.entries(modelOptions).map(([task, group]) => {
  const active = group.options.find(item => item.id === group.recommended) || group.options[0];
  return [task, { label: group.label, fallback: group.fallback, provider: active.provider, model: active.name }];
}));

export function getModelPreferences() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('xingmu-model-routes')) || {}; } catch { saved = {}; }
  return Object.fromEntries(Object.entries(modelOptions).map(([task, group]) => [task, group.options.some(item => item.id === saved[task]) ? saved[task] : group.recommended]));
}

export function getModelSelection(task) {
  return getModelPreferences()[task] || modelOptions[task]?.recommended;
}

export function saveModelPreferences(preferences) {
  localStorage.setItem('xingmu-model-routes', JSON.stringify(preferences));
}

export function selectedModelLabel(task) {
  const group = modelOptions[task];
  const model = group?.options.find(item => item.id === getModelSelection(task));
  return model ? `${model.provider} · ${model.name}` : `${providerCatalog[task]?.provider} · ${providerCatalog[task]?.model}`;
}
