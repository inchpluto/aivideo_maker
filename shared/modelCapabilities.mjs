export const modelCapabilities = {
  'gpt-5.6': { inputs:['text','image'], outputs:['text','json'], bestFor:'长篇理解、完整剧本与结构化分镜', constraints:['结构化输出可用'] },
  'gpt-5.6-terra': { inputs:['text','image'], outputs:['text','json'], bestFor:'剪辑决策、节奏与质检', constraints:['结构化输出可用'] },
  'claude-opus-5': { inputs:['text','image'], outputs:['text','json'], bestFor:'人物关系、对白和长篇润色', constraints:['长输出需控制场次数量'] },
  'qwen3.8-max': { inputs:['text'], outputs:['text','json'], bestFor:'中文长篇与批量场次', constraints:['通过百炼兼容接口'] },
  'deepseek-v4-pro': { inputs:['text'], outputs:['text','json'], bestFor:'剧情推理与成本敏感的长剧本', constraints:['通过兼容接口'] },
  'deepseek-v4-flash': { inputs:['text'], outputs:['text','json'], bestFor:'批量剪辑决策', constraints:['不直接渲染媒体'] },
  'custom-openai': { inputs:['text'], outputs:['text','json'], bestFor:'接入任意 OpenAI 兼容文本模型（Moonshot / GLM / SiliconFlow / Ollama 等）', constraints:['通过自定义兼容接口；模型名用 CUSTOM_OPENAI_MODEL 覆盖'] },
  'custom-openai-image': { inputs:['text'], outputs:['image'], bestFor:'接入支持 images/generations 的第三方生图服务', constraints:['兼容接口需返回 b64_json 或 url'] },
  'gemini-3.1-pro-preview': { inputs:['text','image'], outputs:['text','json'], bestFor:'超长原著拆解与多模态归纳', constraints:['预览模型，发布前复核版本状态'] },
  'gemini-3.5-flash': { inputs:['text','image','video'], outputs:['text','json'], bestFor:'视频理解与批量质检', constraints:['当前适配器只传文本化时间线'] },
  'gemini-3-pro-image': { inputs:['text','image-reference'], outputs:['image'], bestFor:'专业人物身份组与复杂参考图', constraints:['多参考图需使用图像编辑输入'] },
  'gemini-3.1-flash-image': { inputs:['text','image-reference'], outputs:['image'], bestFor:'快速角色预览与迭代', constraints:['复杂多视角身份组优先 Pro'] },
  'gpt-image-2': { inputs:['text','image-reference'], outputs:['image'], bestFor:'高保真道具、场景与首帧', constraints:['透明背景不作为默认承诺'] },
  'index_tts_local': { inputs:['text','licensed-voice-reference','emotion'], outputs:['audio'], bestFor:'本地中文角色对白、情绪控制与低成本批量生成', constraints:['参考音频不限时长；优先清晰、单人、低底噪的干声','仅允许自有或已授权声音','本地桥接服务默认 127.0.0.1:7860'] },
  'f5_tts_local': { inputs:['text','licensed-voice-reference','reference-transcript'], outputs:['audio'], bestFor:'本地英文零样本角色对白与旁白', constraints:['参考音频不限时长且需准确转写；清晰单人干声更稳定','预训练权重 CC-BY-NC，商用前需另行确认','本地桥接服务默认 127.0.0.1:7862'] },
  'eleven_v3': { inputs:['text','voice-id','audio-tags'], outputs:['audio'], bestFor:'高情绪角色对白', constraints:['最具表现力但波动和延迟更高','单段建议不超过 5000 字符'] },
  'eleven_multilingual_v2': { inputs:['text','voice-id'], outputs:['audio'], bestFor:'中文长对白与稳定声线', constraints:['不使用 Eleven v3 音频标签','单段建议不超过 10000 字符'] },
  'gemini_omni_flash': { inputs:['text','image'], outputs:['video'], bestFor:'快速视频生成、角色一致性与多轮编辑', constraints:['通过 Google Interactions API 直接接入','预览模型，发布前复核版本状态'], minDuration:3, maxDuration:10 },
  'seedance2': { inputs:['text','image','video-reference'], outputs:['video','audio'], bestFor:'参考驱动运镜、首尾帧与原生音频', constraints:['当前为外部平台手动生成与结果回收'], minDuration:4, maxDuration:10 },
  'gen4.5': { inputs:['text','image'], outputs:['video'], bestFor:'电影质感文生与图生视频', constraints:['提示词不超过 1000 字符'], minDuration:2, maxDuration:10 },
  'veo3.1': { inputs:['text','image','last-frame','reference-images'], outputs:['video','audio'], bestFor:'首尾帧、镜头延展、三张资产参考与原生音频', constraints:['仅支持4、6、8秒；参考图或1080p/4K需8秒','通过 Google predictLongRunning 异步接口直接接入','当前自动落盘默认720p'], minDuration:4, maxDuration:8, supportedDurations:[4,6,8] },
  'gen4_turbo': { inputs:['image'], outputs:['video'], bestFor:'低成本图生视频预览', constraints:['必须先有审核首帧'], minDuration:2, maxDuration:10, requiresImage:true }
};

export function getModelCapability(modelId) {
  return modelCapabilities[modelId] || { inputs:['text'], outputs:['unknown'], bestFor:'通用生成任务', constraints:['尚未建立模型能力档案'] };
}

export function clampModelDuration(modelId, requested = 3) {
  const capability = getModelCapability(modelId);
  const value = Number.isFinite(Number(requested)) ? Number(requested) : 3;
  if (Array.isArray(capability.supportedDurations) && capability.supportedDurations.length) return capability.supportedDurations.reduce((best,item)=>Math.abs(item-value)<Math.abs(best-value)?item:best,capability.supportedDurations[0]);
  return Math.max(capability.minDuration || 1, Math.min(capability.maxDuration || 10, Math.round(value)));
}
