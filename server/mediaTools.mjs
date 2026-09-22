import { spawn } from 'node:child_process';

const toolEnv = { ffmpeg: 'FFMPEG_PATH', ffprobe: 'FFPROBE_PATH' };
const commandFor = kind => String(process.env[toolEnv[kind]] || kind).trim() || kind;
const renderProfiles = Object.freeze({
  '16:9': Object.freeze({ width: 1280, height: 720 }),
  '9:16': Object.freeze({ width: 720, height: 1280 }),
  '1:1': Object.freeze({ width: 1080, height: 1080 })
});
const supportedFps = Object.freeze([24, 25, 30]);

export function resolveRenderProfile(project = {}) {
  const aspectRatio = String(project.settings?.aspectRatio || '16:9').trim();
  const fps = Number(project.settings?.fps ?? 24);
  const dimensions = renderProfiles[aspectRatio];
  if (!dimensions) return { ok: false, code: 'RENDER_ASPECT_UNSUPPORTED', message: `暂不支持 ${aspectRatio} 画幅；支持 16:9、9:16、1:1。` };
  if (!supportedFps.includes(fps)) return { ok: false, code: 'RENDER_FPS_UNSUPPORTED', message: `暂不支持 ${fps}fps；支持 24、25、30fps。` };
  return { ok: true, aspectRatio, fps, width: dimensions.width, height: dimensions.height };
}

function runTool(kind, args, timeoutMs = 8_000) {
  return new Promise(resolve => {
    const command = commandFor(kind);
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, command, output: `${stdout}\n${stderr}`.slice(-200_000) });
    };
    let child;
    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (error) {
      return finish({ ok: false, code: error.code || 'SPAWN_FAILED', error: String(error.message || error) });
    }
    child.stdout?.on('data', chunk => { stdout += chunk; });
    child.stderr?.on('data', chunk => { stderr += chunk; });
    child.once('error', error => finish({ ok: false, code: error.code || 'SPAWN_FAILED', error: String(error.message || error) }));
    child.once('close', code => finish({ ok: code === 0, exitCode: code, code: code === 0 ? '' : 'TOOL_FAILED', error: code === 0 ? '' : `${kind} 退出码 ${code}` }));
    timer = setTimeout(() => { child.kill(); finish({ ok: false, code: 'TOOL_TIMEOUT', error: `${kind} 检查超时。` }); }, timeoutMs);
  });
}

async function inspectBinary(kind) {
  const result = await runTool(kind, ['-hide_banner', '-version']);
  const version = result.output.match(/(?:ffmpeg|ffprobe) version\s+([^\s]+)/i)?.[1] || '';
  return { available: result.ok, version, configured: Boolean(process.env[toolEnv[kind]]), path: result.command, error: result.ok ? '' : result.error || `${kind} 不可用。` };
}

export async function getRenderCapabilities() {
  const [ffmpeg, ffprobe] = await Promise.all([inspectBinary('ffmpeg'), inspectBinary('ffprobe')]);
  let encoder = false;
  let subtitlesFilter = false;
  let stabilizationDeshake = false;
  if (ffmpeg.available) {
    const [encoders, filters] = await Promise.all([
      runTool('ffmpeg', ['-hide_banner', '-encoders']),
      runTool('ffmpeg', ['-hide_banner', '-filters'])
    ]);
    encoder = /\blibx264\b/i.test(encoders.output);
    subtitlesFilter = /\bsubtitles\b/i.test(filters.output);
    stabilizationDeshake = /\bdeshake\b/i.test(filters.output);
  }
  return {
    ffmpeg: { available: ffmpeg.available, version: ffmpeg.version, configured: ffmpeg.configured, error: ffmpeg.error },
    ffprobe: { available: ffprobe.available, version: ffprobe.version, configured: ffprobe.configured, error: ffprobe.error },
    encoderLibx264: encoder,
    subtitlesFilter,
    stabilizationDeshake,
    ready: ffmpeg.available && ffprobe.available && encoder,
    checkedAt: new Date().toISOString()
  };
}

export async function renderPreflight(project = {}) {
  const capabilities = await getRenderCapabilities();
  const blockers = [];
  const warnings = [];
  const profile = resolveRenderProfile(project);
  if (!profile.ok) blockers.push({ code: profile.code, message: profile.message });
  if (!capabilities.ffmpeg.available) blockers.push({ code: 'FFMPEG_UNAVAILABLE', message: '未找到 FFmpeg；请安装 FFmpeg 并将其加入 PATH，或在 .env 设置 FFMPEG_PATH。' });
  if (!capabilities.ffprobe.available) blockers.push({ code: 'FFPROBE_UNAVAILABLE', message: '未找到 FFprobe；请安装与 FFmpeg 同版本的 FFprobe，或在 .env 设置 FFPROBE_PATH。' });
  if (!capabilities.encoderLibx264) blockers.push({ code: 'VIDEO_ENCODER_UNAVAILABLE', message: '当前 FFmpeg 没有 libx264 编码器，无法生成兼容 MP4。' });
  const timeline = Array.isArray(project.timeline) ? project.timeline : [];
  const video = timeline.filter(item => Number(item.track) === 0 && item.mediaType !== 'audio');
  if (!video.length) blockers.push({ code: 'TIMELINE_VIDEO_EMPTY', message: '时间线没有可渲染的画面片段。' });
  const captions = timeline.some(item => Number(item.track) === 3 && String(item.label || '').trim());
  if (captions && !capabilities.subtitlesFilter) blockers.push({ code: 'SUBTITLE_FILTER_UNAVAILABLE', message: '时间线包含字幕，但当前 FFmpeg 没有 subtitles 滤镜。' });
  const stabilizationClips = video.filter(item => item.stabilization === true);
  const invalidStabilization = video.find(item => item.stabilization !== undefined && item.stabilization !== null && typeof item.stabilization !== 'boolean');
  if (invalidStabilization) blockers.push({ code: 'STABILIZATION_INVALID', message: `片段 ${invalidStabilization.id || '未命名'} 的画面稳定字段无效，只接受 true/false。` });
  if (stabilizationClips.length && !capabilities.stabilizationDeshake) blockers.push({ code: 'STABILIZATION_FILTER_UNAVAILABLE', message: '时间线启用了画面稳定，但当前 FFmpeg 没有 deshake 滤镜。' });
  const unverified = video.filter(item => !(item.probeStatus === 'passed' && String(item.mediaUrl || item.videoUrl || '').trim()));
  if (unverified.length) blockers.push({ code: 'VIDEO_MEDIA_NOT_VERIFIED', message: `有 ${unverified.length} 个画面片段尚未通过真实媒体探测。` });
  if (!project?.id) warnings.push({ code: 'PROJECT_NOT_SAVED', message: '项目尚未保存；真实 MP4 需要先保存项目。' });
  return { ready: blockers.length === 0 && Boolean(project?.id), blockers, warnings, capabilities, profile: profile.ok ? profile : null, checkedAt: new Date().toISOString() };
}

export function mediaToolCommand(kind) { return commandFor(kind); }

export async function runMediaTool(kind, args, options = {}) {
  const result = await runTool(kind, args, options.timeoutMs || 120_000);
  if (!result.ok) {
    const code = kind === 'ffmpeg' ? 'FFMPEG_UNAVAILABLE' : 'FFPROBE_UNAVAILABLE';
    throw Object.assign(new Error(kind === 'ffmpeg' ? 'FFmpeg 不可用，请安装并配置 FFMPEG_PATH。' : 'FFprobe 不可用，请安装并配置 FFPROBE_PATH。'), { code, cause: result.error });
  }
  return result;
}
