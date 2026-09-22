// 服务端 FFmpeg 渲染器：只使用项目中已通过真实性探测的实际视频素材。
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAssetPath } from './store.mjs';
import { withFileLock } from './fileCoordinator.mjs';
import { isVerifiedMedia } from '../shared/mediaReadiness.mjs';
import { getRenderCapabilities, mediaToolCommand, renderPreflight, resolveRenderProfile } from './mediaTools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'server', 'data'));
const safeId = v => String(v || '').replace(/[^a-zA-Z0-9_-]/g, '');
const stableRenderValue = value => {
  if (Array.isArray(value)) return value.map(stableRenderValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableRenderValue(value[key])]));
  return value;
};

export function proxyRenderFingerprint(project = {}) {
  return createHash('sha256').update(JSON.stringify(stableRenderValue(project)), 'utf8').digest('hex');
}

function proxyProfile(source) {
  const maxDimension = 640;
  const factor = Math.min(1, maxDimension / Math.max(source.width, source.height));
  return { ...source, width: Math.max(2, Math.floor(source.width * factor / 2) * 2), height: Math.max(2, Math.floor(source.height * factor / 2) * 2), proxyMaxDimension: maxDimension };
}

function runFfmpeg(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(mediaToolCommand('ffmpeg'), args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, ...options });
    let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('error', error => reject(Object.assign(new Error(error.code === 'ENOENT' ? 'FFmpeg 不可用，请安装并配置 FFMPEG_PATH。' : `FFmpeg 启动失败：${error.message}`), { code: error.code === 'ENOENT' ? 'FFMPEG_UNAVAILABLE' : 'FFMPEG_START_FAILED', cause: error })));
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg 渲染失败（${code}）：${stderr.trim().slice(-500)}`)));
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw Object.assign(new Error('渲染已取消。'), { code: 'RENDER_CANCELLED', name: 'AbortError' });
}

function parseRate(value) {
  const [numerator, denominator] = String(value || '').split('/').map(Number);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : 0;
}

function normalizeSpeedRamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('速度渐变必须是包含 from/to 的对象。'), { code: 'RENDER_SPEED_RAMP_INVALID' });
  const read = candidate => { const number = Number(candidate); return Number.isFinite(number) ? Math.max(0.25, Math.min(4, number)) : null; };
  const from = read(value.from ?? value.start); const to = read(value.to ?? value.end);
  if (from === null || to === null) throw Object.assign(new Error('速度渐变的起止速率必须是 0.25–4 之间的数字。'), { code: 'RENDER_SPEED_RAMP_INVALID' });
  return { from, to };
}

function normalizeStabilization(value) {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return true;
  throw Object.assign(new Error('画面稳定字段只接受 true/false。'), { code: 'RENDER_STABILIZATION_INVALID' });
}

function probeOutput(file, requireAudio, signal, profile) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const proc = spawn(mediaToolCommand('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,sample_rate,channels,r_frame_rate', '-of', 'json', file], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, signal });
    let stdout = ''; let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; }); proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('error', error => reject(Object.assign(new Error(error.code === 'ENOENT' ? 'FFprobe 不可用，请安装并配置 FFPROBE_PATH。' : `FFprobe 启动失败：${error.message}`), { code: error.code === 'ENOENT' ? 'FFPROBE_UNAVAILABLE' : 'FFPROBE_START_FAILED', cause: error })));
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`成片技术探测失败：${stderr.trim().slice(-300)}`));
      try {
        const parsed = JSON.parse(stdout); const streams = Array.isArray(parsed.streams) ? parsed.streams : []; const duration = Number(parsed.format?.duration); const video = streams.find(stream => stream.codec_type === 'video');
        if (!Number.isFinite(duration) || duration <= 0 || !video || (requireAudio && !streams.some(stream => stream.codec_type === 'audio'))) return reject(new Error('成片缺少有效视频/音频流或时长。'));
        const actualFps = parseRate(video.r_frame_rate);
        if (profile && (Number(video.width) !== profile.width || Number(video.height) !== profile.height || Math.abs(actualFps - profile.fps) > 0.05)) return reject(Object.assign(new Error(`成片输出规格不匹配：期望 ${profile.width}x${profile.height} ${profile.fps}fps，实际 ${video.width}x${video.height} ${actualFps}fps。`), { code: 'RENDER_OUTPUT_PROFILE_MISMATCH' }));
        resolve({ duration, width: Number(video.width), height: Number(video.height), fps: actualFps, streams: streams.map(stream => ({ type:stream.codec_type, codec:stream.codec_name, width:stream.width, height:stream.height, fps:parseRate(stream.r_frame_rate), sampleRate:stream.sample_rate, channels:stream.channels })) });
      } catch { reject(new Error('成片技术探测返回无效 JSON。')); }
    });
  });
}

function scanTechnicalRisks(file, hasAudio, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const args = ['-v', 'info', '-i', file, '-vf', 'blackdetect=d=0.3:pic_th=0.98'];
    if (hasAudio) args.push('-af', 'silencedetect=n=-50dB:d=0.5');
    args.push('-f', 'null', '-');
    const proc = spawn(mediaToolCommand('ffmpeg'), args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, signal }); let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk; }); proc.on('error', reject); proc.on('close', code => {
      if (code !== 0) return reject(new Error('成片黑帧/静音扫描失败。'));
      const warnings = [];
      if (/black_start:/i.test(stderr)) warnings.push('检测到黑帧区段，请确认是否为有意转场');
      if (hasAudio && /silence_start:/i.test(stderr)) warnings.push('检测到至少 0.5 秒静音区段，请确认对白与音乐是否完整');
      resolve(warnings);
    });
  });
}

function srtTime(seconds) {
  const t = Math.max(0, Math.round(seconds * 1000));
  const ms = t % 1000, s = Math.floor(t / 1000) % 60, m = Math.floor(t / 60000) % 60, h = Math.floor(t / 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)},${String(ms).padStart(3, '0')}`;
}

function buildSrt(cues) { return cues.map((cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join('\n'); }

function mediaPath(url, projectId) {
  const match = String(url || '').match(/^\/api\/assets\/([^/]+)\/([^/?#]+)$/);
  if (!match) throw Object.assign(new Error('渲染只接受服务端已入库的项目媒体。'), { code: 'RENDER_MEDIA_NOT_LOCAL' });
  const assetProject = decodeURIComponent(match[1]);
  if (assetProject !== projectId && assetProject !== 'shared') throw Object.assign(new Error('镜头媒体不属于当前项目。'), { code: 'RENDER_MEDIA_PROJECT_MISMATCH' });
  return resolveAssetPath(assetProject, decodeURIComponent(match[2]));
}

async function videoToSegment(input, duration, segment, sourceOffset = 0, playbackRate = 1, profile, signal, transform = {}) {
  const d = Math.max(0.1, Number(duration) || 3);
  const offset = Math.max(0, Number(sourceOffset) || 0);
  const rate = Math.max(0.25, Math.min(4, Number(playbackRate) || 1));
  const speedRamp = normalizeSpeedRamp(transform.speedRamp);
  const stabilization = normalizeStabilization(transform.stabilization);
  const scale = Math.max(0.25, Math.min(4, Number(transform.scale ?? 100) / 100 || 1));
  const handheld = Boolean(transform.handheld);
  const positionX = Math.max(-profile.width, Math.min(profile.width, Number(transform.positionX) || 0));
  const positionY = Math.max(-profile.height, Math.min(profile.height, Number(transform.positionY) || 0));
  const rotation = Math.max(-180, Math.min(180, Number(transform.rotation) || 0));
  throwIfAborted(signal);
  const targetWidth = Math.max(2, Math.round(profile.width * scale * (handheld ? 1.04 : 1) / 2) * 2);
  const targetHeight = Math.max(2, Math.round(profile.height * scale * (handheld ? 1.04 : 1) / 2) * 2);
  const foreground = [];
  if (speedRamp) {
    const slope = speedRamp.to - speedRamp.from;
    const sourceDuration = d * (speedRamp.from + speedRamp.to) / 2;
    foreground.push(`trim=duration=${sourceDuration.toFixed(6)}`);
    if (Math.abs(slope) < 0.0001) foreground.push(`setpts=PTS/${speedRamp.from.toFixed(6)}`);
    else foreground.push(`setpts=(${d.toFixed(6)}/${slope.toFixed(6)})*(sqrt(${(speedRamp.from * speedRamp.from).toFixed(6)}+${(2 * slope).toFixed(6)}*T/${d.toFixed(6)})-${speedRamp.from.toFixed(6)})/TB`);
  } else if (rate !== 1) foreground.push(`setpts=PTS/${rate}`);
  if (stabilization) foreground.push('deshake=rx=16:ry=16:blocksize=8:edge=mirror');
  foreground.push(`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`);
  if (rotation) foreground.push(`rotate=${(rotation * Math.PI / 180).toFixed(6)}:fillcolor=black`);
  foreground.push('format=yuv420p');
  const barHeight = transform.letterbox ? Math.max(2, Math.floor(profile.height * 0.12 / 2) * 2) : 0;
  const shake = handheld ? Math.max(2, Number((profile.height * 0.012).toFixed(2))) : 0;
  const motionX = shake ? `+${shake.toFixed(2)}*sin(2*PI*t*1.7)` : '';
  const motionY = shake ? `+${(shake * 0.7).toFixed(2)}*cos(2*PI*t*1.3)` : '';
  const graph = `[0:v]${foreground.join(',')}[fg];color=c=black:s=${profile.width}x${profile.height}:r=${profile.fps}:d=${d}[bg];[bg][fg]overlay=x=(main_w-overlay_w)/2+${positionX.toFixed(2)}${motionX}:y=(main_h-overlay_h)/2+${positionY.toFixed(2)}${motionY}:shortest=1,format=yuv420p[frame];[frame]${barHeight ? `drawbox=x=0:y=0:w=iw:h=${barHeight}:color=black:t=fill,drawbox=x=0:y=ih-${barHeight}:w=iw:h=${barHeight}:color=black:t=fill` : 'null'}[v]`;
  await runFfmpeg(['-y', ...(offset ? ['-ss', String(offset)] : []), '-i', input, '-t', String(d), '-filter_complex', graph, '-map', '[v]', '-r', String(profile.fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', segment], { signal });
  return segment;
}

async function blackSegment(duration, output, profile, signal) {
  const d = Math.max(0.01, Number(duration) || 0);
  await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=black:s=${profile.width}x${profile.height}:r=${profile.fps}:d=${d}`, '-t', String(d), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', output], { signal });
  return output;
}

async function burnSubtitles(input, srtPath, output, signal) {
  await runFfmpeg(['-y', '-i', input, '-vf', 'subtitles=captions.srt', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', output], { cwd: path.dirname(srtPath), signal });
  return output;
}

async function copyMedia(input, output, signal) {
  await runFfmpeg(['-y', '-i', input, '-c', 'copy', output], { signal });
  return output;
}

async function composeSegments(segments, durations, transitions, transitionTypes, profile, output, signal) {
  if (!transitions.some(value => value > 0.01)) {
    const list = path.join(path.dirname(output), 'concat.txt');
    await writeFile(list, segments.map(segment => `file '${segment.replace(/'/g, "'\\''")}'`).join('\n') + '\n', 'utf8');
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', output], { signal });
    return output;
  }
  const filters = [];
  let current = '[0:v]';
  let currentDuration = Number(durations[0] || 0);
  for (let index = 1; index < segments.length; index += 1) {
    const transition = Number(transitions[index] || 0);
    const transitionType = transitionTypes[index] || 'crossfade';
    const next = `[${index}:v]`;
    const label = `[xfade${index}]`;
    if (transition > 0.01) {
      const offset = Math.max(0, currentDuration - transition);
      const xfadeType = transitionType === 'flash' ? 'fadewhite' : 'fade';
      filters.push(`${current}${next}xfade=transition=${xfadeType}:duration=${transition.toFixed(3)}:offset=${offset.toFixed(3)}${label}`);
      currentDuration += Number(durations[index] || 0) - transition;
    } else {
      filters.push(`${current}${next}concat=n=2:v=1:a=0${label}`);
      currentDuration += Number(durations[index] || 0);
    }
    current = label;
  }
  await runFfmpeg(['-y', ...segments.flatMap(segment => ['-i', segment]), '-filter_complex', filters.join(';'), '-map', current, '-r', String(profile.fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', output], { signal });
  return output;
}

function atempoFilters(rate) {
  let remaining = Math.max(0.25, Math.min(4, Number(rate) || 1));
  const filters = [];
  while (remaining > 2) { filters.push('atempo=2'); remaining /= 2; }
  while (remaining < 0.5) { filters.push('atempo=0.5'); remaining /= 0.5; }
  if (Math.abs(remaining - 1) > 0.001) filters.push(`atempo=${remaining}`);
  return filters;
}

async function mixAudio(input, audioClips, projectId, duration, output, signal) {
  const activeAudioClips = audioClips.filter(clip => !clip.muted);
  if (!activeAudioClips.length) return input;
  const args = ['-y', '-i', input, '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo'];
  activeAudioClips.forEach(clip => args.push('-i', mediaPath(clip.mediaUrl, projectId)));
  const filters = [`[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS[base]`];
  const labels = ['[base]'];
  activeAudioClips.forEach((clip, index) => {
    const start = Math.max(0, Number(clip.start) || 0); const clipDuration = Math.max(0.05, Number(clip.duration) || duration); const rate = Math.max(0.25, Math.min(4, Number(clip.playbackRate) || 1));
    const sourceDuration = clipDuration * rate; const label = `audio${index}`; const transforms = [`[${index + 2}:a]atrim=0:${sourceDuration}`, 'asetpts=PTS-STARTPTS', ...atempoFilters(rate)];
    const volume = Number(clip.volume);
    const gainDb = Number.isFinite(Number(clip.gainDb)) ? Number(clip.gainDb) : Number.isFinite(volume) ? (volume <= 0 ? -90 : 20 * Math.log10(Math.max(0.001, volume / 100))) : 0;
    transforms.push(`volume=${gainDb.toFixed(3)}dB`);
    const fadeIn = Math.min(clipDuration / 2, Math.max(0, Number(clip.fadeIn) || 0));
    const fadeOut = Math.min(clipDuration / 2, Math.max(0, Number(clip.fadeOut) || 0));
    if (fadeIn > 0.01) transforms.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
    if (fadeOut > 0.01) transforms.push(`afade=t=out:st=${Math.max(0, clipDuration - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`);
    transforms.push(`adelay=${Math.round(start * 1000)}:all=1[${label}]`); filters.push(transforms.join(',')); labels.push(`[${label}]`);
  });
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${duration}[mixed]`);
  args.push('-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[mixed]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', output);
  await runFfmpeg(args, { signal });
  return output;
}

export async function renderProject(project, { workDir, renderKey, signal, profileOverride = null, renderMode = 'deliverable' } = {}) {
  throwIfAborted(signal);
  if (!project?.timeline?.length) throw new Error('项目没有时间线片段，无法渲染。');
  const projectId = safeId(project.id) || 'project-' + Date.now();
  const safeRenderKey = renderKey ? safeId(renderKey) : '';
  const outFolder = workDir || path.join(dataDir, 'render', projectId, ...(safeRenderKey ? [safeRenderKey] : []));
  await mkdir(outFolder, { recursive: true });
  const shotsById = new Map((project.shots || []).map(shot => [String(shot.id), shot]));
  const sourceProfile = resolveRenderProfile(project);
  if (!sourceProfile.ok) throw Object.assign(new Error(sourceProfile.message), { code: sourceProfile.code });
  const profile = profileOverride ? { ...sourceProfile, ...profileOverride } : sourceProfile;
  const clips = project.timeline.filter(clip => (clip.track ?? 0) === 0 && clip.mediaType !== 'audio').sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
  if (!clips.length) throw new Error('没有 V1 画面轨片段，无法渲染。');
  const segments = [];
  const segmentDurations = [];
  const segmentTransitions = [];
  const segmentTransitionTypes = [];
  const segmentKinds = [];
  let cursor = 0;
  const stabilizationRequested = clips.some(clip => clip.stabilization === true);
  if (stabilizationRequested) {
    const capabilities = await getRenderCapabilities();
    if (!capabilities.stabilizationDeshake) throw Object.assign(new Error('当前 FFmpeg 没有 deshake 滤镜，无法渲染画面稳定。'), { code: 'RENDER_STABILIZATION_FILTER_UNAVAILABLE' });
  }
  for (let i = 0; i < clips.length; i += 1) {
    throwIfAborted(signal);
    const clip = clips[i];
    normalizeSpeedRamp(clip.speedRamp);
    const start = Math.max(0, Number(clip.start) || 0);
    const transitionName = String(clip.transition || '').trim().toLowerCase();
    if (transitionName && !['crossfade', 'flash'].includes(transitionName)) throw Object.assign(new Error(`片段 ${clip.id} 的转场“${clip.transition}”尚未接入真实导出。`), { code: 'RENDER_TRANSITION_UNSUPPORTED' });
    const transition = transitionName ? Math.max(0.05, Math.min(2, Number(clip.transitionDuration) || 0.25)) : 0;
    if (start > cursor + 0.01) {
      const gap = path.join(outFolder, `seg-${i}-gap.mp4`);
      await blackSegment(start - cursor, gap, profile, signal);
      segments.push(gap);
      segmentDurations.push(start - cursor);
      segmentTransitions.push(0);
      segmentTransitionTypes.push('');
      segmentKinds.push('gap');
      cursor = start;
    }
    const shot = shotsById.get(String(clip.id).replace(/^clip-/, '')) || shotsById.get(String(clip.shotId || ''));
    const media = { videoUrl: clip.mediaUrl || shot?.videoUrl, probeStatus: clip.probeStatus || shot?.probeStatus };
    const duration = Math.max(0.1, Number(clip.duration) || Number(shot?.duration) || Number(media.mediaMetadata?.duration) || 3);
    const overlap = cursor - start;
    if (transition) {
      const previousDuration = Number(segmentDurations.at(-1) || 0);
      if (i === 0 || segmentKinds.at(-1) !== 'clip' || start > cursor + 0.01 || Math.abs(overlap - transition) > 0.03 || transition >= Math.min(previousDuration, duration) / 2) {
        throw Object.assign(new Error(`片段 ${clip.id} 的${transitionName === 'flash' ? '叠化闪白' : '交叉溶解'}必须与上一片段保持 ${transition.toFixed(2)} 秒重叠。`), { code: 'RENDER_TRANSITION_GEOMETRY' });
      }
    } else if (start < cursor - 0.01) throw Object.assign(new Error(`画面片段 ${clip.id} 与上一片段重叠。`), { code: 'RENDER_TIMELINE_OVERLAP' });
    if (!isVerifiedMedia(media, 'videoUrl')) throw Object.assign(new Error(`镜头 ${shot?.id || clip.id} 缺少已验证的真实视频，已停止渲染。`), { code: 'RENDER_MEDIA_NOT_VERIFIED' });
    const input = mediaPath(media.videoUrl, projectId);
    await stat(input);
    const segment = path.join(outFolder, `seg-${i}.mp4`);
    await videoToSegment(input, duration, segment, clip.sourceOffset ?? clip.sourceIn ?? 0, clip.playbackRate ?? 1, profile, signal, clip);
    segments.push(segment);
      segmentDurations.push(duration);
      segmentTransitions.push(transition);
      segmentTransitionTypes.push(transitionName);
    segmentKinds.push('clip');
    cursor = start + duration;
  }
  const full = path.join(outFolder, 'full.mp4');
  await composeSegments(segments, segmentDurations, segmentTransitions, segmentTransitionTypes, profile, full, signal);
  const captionClips = project.timeline.filter(clip => Number(clip.track) === 3 && String(clip.label || '').trim()).sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
  const cues = captionClips.map(clip => ({ start:Number(clip.start || 0), end:Number(clip.start || 0) + Number(clip.duration || 0), text:String(clip.label).trim() }));
  const invalidCaption = cues.find((cue, index) => !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.end > cursor + 0.02 || (index > 0 && cue.start < cues[index - 1].end - 0.01));
  if (invalidCaption) throw Object.assign(new Error(`字幕时间无效或越界：${invalidCaption.text}`), { code:'RENDER_CAPTION_INVALID' });
  const audioClips = project.timeline.filter(clip => [1, 2].includes(Number(clip.track)) && clip.mediaUrl);
  for (const clip of audioClips) {
    if (!isVerifiedMedia({ mediaUrl: clip.mediaUrl, probeStatus: clip.probeStatus }, 'mediaUrl')) throw Object.assign(new Error(`音频片段 ${clip.id} 未通过真实性探测。`), { code: 'RENDER_AUDIO_NOT_VERIFIED' });
  }
  const mixed = path.join(outFolder, 'mixed.mp4');
  const mixedSource = await mixAudio(full, audioClips, projectId, cursor, mixed, signal);
  const srt = path.join(outFolder, 'captions.srt');
  await writeFile(srt, buildSrt(cues), 'utf8');
  const deliverable = path.join(outFolder, 'deliverable.mp4');
  throwIfAborted(signal);
  if (cues.length) await burnSubtitles(mixedSource, srt, deliverable, signal); else await copyMedia(mixedSource, deliverable, signal);
  const technicalQc = await probeOutput(deliverable, audioClips.some(clip => !clip.muted), signal, profile);
  technicalQc.warnings = await scanTechnicalRisks(deliverable, audioClips.some(clip => !clip.muted), signal);
  technicalQc.renderProfile = profile;
  const deliverableUrl = safeRenderKey ? `/api/render/${encodeURIComponent(projectId)}/${encodeURIComponent(safeRenderKey)}/deliverable.mp4` : `/api/render/${encodeURIComponent(projectId)}/deliverable.mp4`;
  return { ok: true, projectId, renderMode, timelineClips: clips.length, audioClips: audioClips.length, durationSeconds: cursor, deliverable: deliverableUrl, path: deliverable, renderProfile: profile, mediaMode: audioClips.some(clip => !clip.muted) ? 'verified-video-audio' : 'verified-video-only', technicalQc };
}

export async function renderProxyProject(project, { signal } = {}) {
  const sourceProfile = resolveRenderProfile(project);
  if (!sourceProfile.ok) throw Object.assign(new Error(sourceProfile.message), { code: sourceProfile.code });
  const projectId = safeId(project.id) || 'project-' + Date.now();
  const fingerprint = proxyRenderFingerprint(project);
  const renderKey = `proxy-${fingerprint.slice(0, 32)}`;
  const folder = path.join(dataDir, 'render', projectId, renderKey);
  const deliverable = path.join(folder, 'deliverable.mp4');
  const url = `/api/render/${encodeURIComponent(projectId)}/${encodeURIComponent(renderKey)}/deliverable.mp4`;
  const profile = proxyProfile(sourceProfile);
  return withFileLock(path.join(dataDir, 'render', projectId, `.${renderKey}.lock`), async () => {
    const cached = await stat(deliverable).catch(() => null);
    if (cached?.isFile() && cached.size > 0) {
      try {
        const technicalQc = await probeOutput(deliverable, Array.isArray(project.timeline) && project.timeline.some(clip => [1, 2].includes(Number(clip.track)) && clip.mediaUrl && !clip.muted), signal, profile);
        return { ok: true, projectId, renderMode: 'proxy', cached: true, fingerprint, deliverable: url, path: deliverable, renderProfile: profile, technicalQc };
      } catch {
        // A partial or corrupt cache is rebuilt under the same lock.
      }
    }
    const result = await renderProject(project, { renderKey, signal, profileOverride: profile, renderMode: 'proxy' });
    await writeFile(path.join(folder, 'proxy-manifest.json'), JSON.stringify({ version: 1, fingerprint, sourceProfile, renderProfile: profile, createdAt: new Date().toISOString() }, null, 2), 'utf8');
    return { ...result, cached: false, fingerprint, sourceRenderProfile: sourceProfile };
  });
}

export { getRenderCapabilities, renderPreflight };
