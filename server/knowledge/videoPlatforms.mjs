import { findCameraMovement } from './cinematography.mjs';

export const VIDEO_PLATFORM_KNOWLEDGE_VERSION = '1.0.0';

const clean = (value, fallback = '') => String(value || fallback).trim().replace(/\s+/g, ' ');
const list = value => (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

export function compileVeoPrompt(values = {}) {
  const camera = values.camera || {};
  const movement = findCameraMovement(camera.move || values.move);
  const identity = clean(values.characterContext || list(values.continuity).join('、'), '主体身份遵循输入参考');
  const subject = clean(values.subjectAction || values.visualContent || values.prompt, '主体完成一个清晰动作');
  const context = clean(values.sceneAnchor || values.scene, '场景保持空间与光线连续');
  const environment = clean(values.environmentAction, '环境产生与动作相呼应的自然运动');
  const framing = [values.type || camera.type || '中景', values.angle || camera.angle || '平视', values.composition || camera.composition || '三分法'].filter(Boolean).join('，');
  const style = [values.visualStyle || '电影级写实', values.lighting || '稳定的电影主光'].filter(Boolean).join('，');
  const audio = clean(values.audio, '与画面同步的自然环境声');
  const dialogue = clean(values.dialogue);
  const endFrame = clean(values.endFrame, '动作完成后的稳定构图');
  return [
    `摄影：${framing}；${movement.label}，${clean(values.cameraPath, movement.execution)}。`,
    `主体：${identity}。动作：${subject}。`,
    `场景：${context}。环境运动：${environment}。`,
    `风格与氛围：${style}。`,
    `声音：${audio}。${dialogue ? `角色以${clean(values.performanceEmotion, '自然')}情绪说：“${dialogue}”。` : ''}`,
    `保持一个连续镜头，最终稳定在：${endFrame}。`
  ].join(' ').replace(/\s+/g, ' ').trim();
}

export function compileSeedancePrompt(values = {}) {
  const imageCount = Math.min(9, new Set([values.imageUrl, ...list(values.identityReferences), ...list(values.environmentReference), ...list(values.propReferences)].filter(Boolean)).size);
  const hasAudio = Boolean(values.audioReference);
  const movement = findCameraMovement(values.camera?.move || values.move);
  const refs = [
    imageCount ? `按上传顺序引用 ${imageCount} 张图片：图1锁定当前镜头首帧与构图，其余图片分别锁定人物身份、服装、场景和关键道具` : '当前没有图片参考，按文字分镜建立画面',
    hasAudio ? '音频1只用于角色音色、对白时序和口型节奏' : '当前没有参考音频，声音按下方声音设计生成'
  ].join('；');
  const dialogue = clean(values.dialogue);
  return [
    `【镜头 ${clean(values.shotId, '未编号')}｜${clean(values.duration, 3)}秒｜${clean(values.ratio, '16:9')}】`,
    `参考分工：${refs}。`,
    `画面：${clean(values.visualContent || values.subjectAction || values.prompt)}；场景为${clean(values.sceneAnchor || values.scene)}。`,
    `动作：${clean(values.subjectAction)}；环境：${clean(values.environmentAction)}。`,
    `摄影：${clean(values.type, '中景')}，${clean(values.angle, '平视')}，${movement.label}；${clean(values.cameraPath, movement.execution)}；最后稳定在${clean(values.endFrame)}。`,
    `声音：${clean(values.audio, '自然环境声')}。${dialogue ? `对白：“${dialogue}”，表演情绪为${clean(values.performanceEmotion, '自然')}。` : ''}`,
    `叙事目的：${clean(values.narrativePurpose, '完成当前动作并承接下一镜')}。保持人物、服装、道具、空间轴线、天气、色板和主光方向与参考资产一致。`
  ].join(' ').replace(/\s+/g, ' ').trim();
}

export function nearestSupportedDuration(requested, supported = [4, 6, 8]) {
  const value = Number.isFinite(Number(requested)) ? Number(requested) : supported[0];
  return supported.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best, supported[0]);
}

export function buildVeoRequestBody({ prompt, payload = {}, firstFrame, lastFrame, referenceFrames = [] } = {}) {
  const refs = referenceFrames.filter(Boolean).slice(0, 3);
  const usesAssetReferences = !firstFrame && refs.length > 0;
  const requestedDuration = nearestSupportedDuration(payload.duration);
  const renderDuration = usesAssetReferences ? 8 : requestedDuration;
  const instance = { prompt: clean(prompt) };
  if (firstFrame) instance.image = { inlineData:firstFrame };
  if (firstFrame && lastFrame) instance.lastFrame = { inlineData:lastFrame };
  if (usesAssetReferences) instance.referenceImages = refs.map(image => ({ image:{ inlineData:image }, referenceType:'asset' }));
  const parameters = {
    aspectRatio:['16:9','9:16'].includes(payload.ratio) ? payload.ratio : '16:9',
    durationSeconds:String(renderDuration),
    numberOfVideos:1,
    resolution:payload.resolution || '720p'
  };
  if (payload.negativePrompt) parameters.negativePrompt = clean(payload.negativePrompt);
  if (Number.isFinite(Number(payload.seed))) parameters.seed = Math.max(0, Math.round(Number(payload.seed)));
  return { body:{ instances:[instance], parameters }, requestedDuration:Number(payload.duration)||3, renderDuration, referenceCount:refs.length, mode:firstFrame?(lastFrame?'first-last-frame':'image-to-video'):usesAssetReferences?'reference-images':'text-to-video' };
}

export function auditVideoPayload(payload = {}, routeId = '') {
  const issues = [];
  const warnings = [];
  if (!clean(payload.shotId)) issues.push({ field:'shotId', label:'镜号', fix:'返回分镜台为当前镜头保存镜号' });
  if (!clean(payload.sceneAnchor)) issues.push({ field:'sceneAnchor', label:'场景一致性锚点', fix:'先补齐场景空间、轴线、光向和道具位置' });
  if (!clean(payload.subjectAction)) issues.push({ field:'subjectAction', label:'主体动作', fix:'每镜填写一个可观察、可完成的动作' });
  if (!clean(payload.camera?.move || payload.move)) issues.push({ field:'move', label:'主运镜', fix:'选择一种主运镜' });
  if (!clean(payload.startFrame) || !clean(payload.endFrame)) issues.push({ field:'frames', label:'首尾帧', fix:'补齐可验证的首帧与尾帧描述' });
  if (Number(payload.duration) < 1 || Number(payload.duration) > 10) issues.push({ field:'duration', label:'镜头时长', fix:'控制在1–10秒，默认先做3秒样片' });
  if (routeId === 'gen4_turbo' && !payload.imageUrl) issues.push({ field:'imageUrl', label:'审核首帧', fix:'Gen-4 Turbo 必须先绑定首帧图' });
  if (routeId === 'veo3.1' && ![4,6,8].includes(Number(payload.duration))) warnings.push(`Veo 3.1 将把 ${Number(payload.duration)||3} 秒映射为 ${nearestSupportedDuration(payload.duration)} 秒供应商时长，回收后按分镜时长裁切。`);
  if (routeId === 'veo3.1' && list(payload.identityReferences).length > 3) warnings.push('Veo 3.1 最多使用3张资产参考图；将优先提交前3张。');
  if (payload.dialogue && !payload.audioReference) warnings.push('该镜包含对白但没有参考配音；原生音频可能与角色声线不一致。');
  return { ready:issues.length===0, issues, warnings, routeId, checkedAt:new Date().toISOString() };
}

export function publicVideoPlatformKnowledge() {
  return { version:VIDEO_PLATFORM_KNOWLEDGE_VERSION, updatedAt:'2026-09-04', veo:{durations:[4,6,8],referenceImages:3,firstLastFrame:true,nativeAudio:true}, seedance:{maxImages:9,maxVideos:3,maxAudio:3,maxDuration:15,multimodalReference:true,nativeStereoAudio:true} };
}
