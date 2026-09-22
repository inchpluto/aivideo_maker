import { readFile } from 'node:fs/promises';

const baseUrl = (process.env.XINGMU_BASE_URL || 'http://127.0.0.1:4183').replace(/\/$/, '');
const routes = {
  story: process.env.E2E_STORY_MODEL || 'gpt-5.6',
  character: process.env.E2E_CHARACTER_MODEL || 'gemini-3-pro-image',
  environment: process.env.E2E_ENVIRONMENT_MODEL || 'gpt-image-2',
  voice: process.env.E2E_VOICE_MODEL || 'eleven_v3',
  video: process.env.E2E_VIDEO_MODEL || 'gemini_omni_flash',
  editing: process.env.E2E_EDITING_MODEL || 'gpt-5.6-terra'
};

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}（HTTP ${response.status}）：${data.error || JSON.stringify(data)}`);
  return data;
}

const post = (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const health = await request('/api/health');
if (health.mode !== 'live') throw new Error('服务当前不是真实生成严格模式。');
const providerData = await request('/api/providers');
const missing = Object.entries(routes).filter(([task, route]) => !providerData.providers?.[task]?.options?.find(item => item.id === route)?.connected).map(([task, route]) => `${task}:${route}`);
if (missing.length) {
  console.error(`LIVE_E2E_BLOCKED 缺少所选路线密钥：${missing.join(', ')}`);
  console.error('请在页面“模型与 API 接入中心 → API 连接”配置并验证后重试。');
  process.exitCode = 2;
} else {

const sourceText = await readFile(new URL('../examples/雾港来信.txt', import.meta.url), 'utf8');
const analyzed = await post('/api/novel/analyze', { text: sourceText, filename: '真实闭环测试-雾港来信.txt', type: 'AI 视频', episodeLength: 30, episodeCount: 1, genre: '悬疑 / 情感', adaptation: '忠于原作', visualStyle: '电影级写实', aspectRatio: '16:9', audience: '18–35 岁', route: routes.story });
let project = analyzed.project;
const lead = project.characters?.[0];
const shot = project.shots?.[0];
if (!lead || !shot) throw new Error('真实剧本未返回角色或分镜。');

const character = await post('/api/generate', { task: 'character', route: routes.character, projectId: project.id, payload: { projectId: project.id, name: lead.name, role: lead.role, appearance: lead.appearance } });
const environment = await post('/api/generate', { task: 'environment', route: routes.environment, projectId: project.id, payload: { projectId: project.id, scene: project.episodes?.[0]?.scenes?.[0]?.heading, ratio: '16:9', lighting: shot.lighting, weather: '雨夜薄雾', palette: '冷蓝与少量琥珀' } });
const voice = await post('/api/generate', { task: 'voice', route: routes.voice, projectId: project.id, payload: { projectId: project.id, name: lead.name, emotion: project.episodes?.[0]?.dialogues?.[0]?.emotion || '克制', text: project.episodes?.[0]?.dialogues?.[0]?.text || '故事现在开始。' } });

let video = await post('/api/generate', { task: 'video', route: routes.video, projectId: project.id, payload: { projectId: project.id, shotId: shot.id, prompt: shot.prompt, subjectAction: shot.subjectAction, environmentAction: shot.environmentAction, lighting: shot.lighting, duration: Math.min(5, shot.duration || 4), ratio: '16:9', imageUrl: character.result.imageUrl, startFrame: shot.startFrame, endFrame: shot.endFrame, negativePrompt: shot.negativePrompt, continuity: shot.continuity, camera: { type: shot.type, move: shot.move, angle: shot.angle, composition: shot.composition, intensity: 35 } } });
for (let attempt = 0; attempt < 120 && video.result?.status !== 'SUCCEEDED'; attempt += 1) {
  if (['FAILED', 'CANCELLED'].includes(video.result?.status)) throw new Error(video.result.failure || `视频任务 ${video.result.status}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  video = await post('/api/generate/status', { taskId: video.result.taskId, route: routes.video, projectId: project.id, shotId: shot.id });
}
if (video.result?.status !== 'SUCCEEDED' || !video.result.output?.[0]) throw new Error('视频任务在 10 分钟内未完成。');

const editing = await post('/api/generate', { task: 'editing', route: routes.editing, projectId: project.id, payload: { projectId: project.id, instruction: '生成字幕、压缩停顿、检查跳轴并统一到 -14 LUFS', timeline: project.timeline } });
project = {
  ...project,
  characters: project.characters.map(item => item.id === lead.id ? { ...item, imageAsset: character.result.imageUrl, imageStatus: 'generated', voiceAsset: voice.result.audioUrl, voiceStatus: 'generated' } : item),
  assets: { ...(project.assets || {}), environments: [{ id: 'environment-e2e', scene: project.episodes?.[0]?.scenes?.[0]?.heading, imageUrl: environment.result.imageUrl, status: 'generated' }] },
  shots: project.shots.map(item => item.id === shot.id ? { ...item, videoUrl: video.result.output[0], videoTaskId: video.result.taskId, status: 'generated' } : item),
  timeline: project.timeline.map(item => item.id === `clip-${shot.id}` ? { ...item, mediaUrl: video.result.output[0], status: 'generated' } : item),
  generation: { story: { provider: analyzed.generation?.provider, model: analyzed.generation?.model, mode: 'live' }, character: { provider: character.provider, model: character.model, mode: 'live' }, environment: { provider: environment.provider, model: environment.model, mode: 'live' }, voice: { provider: voice.provider, model: voice.model, mode: 'live' }, video: { provider: video.provider, model: video.model, mode: 'live', taskId: video.result.taskId }, editing: { provider: editing.provider, model: editing.model, mode: 'live', operations: editing.result.operations } },
  workflow: { ...project.workflow, current: 'editor', completion: 96 }
};
await request(`/api/projects/${encodeURIComponent(project.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
console.log(JSON.stringify({ ok: true, projectId: project.id, title: project.title, image: character.result.imageUrl, environment: environment.result.imageUrl, audio: voice.result.audioUrl, video: video.result.output[0], videoTaskId: video.result.taskId, editOperations: editing.result.operations?.length || 0 }, null, 2));
}
