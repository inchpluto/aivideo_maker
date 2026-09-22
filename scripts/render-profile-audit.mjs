import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'xingmu-render-profile-'));
process.env.DATA_DIR = root;
const { saveBinaryAsset } = await import('../server/store.mjs');
const { renderPreflight, renderProject } = await import('../server/render.mjs');
const { resolveRenderProfile } = await import('../server/mediaTools.mjs');
const fixture = path.join(root, 'fixture.mp4');
const generated = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr);
const transitionFixture = path.join(root, 'transition-fixture.mp4');
const generatedTransition = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:size=320x180:rate=30', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', transitionFixture], { encoding: 'utf8' });
assert.equal(generatedTransition.status, 0, generatedTransition.stderr);
const transitionStartFixture = path.join(root, 'transition-start-fixture.mp4');
const generatedTransitionStart = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=red:size=320x180:rate=30', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', transitionStartFixture], { encoding: 'utf8' });
assert.equal(generatedTransitionStart.status, 0, generatedTransitionStart.stderr);
const stabilizationFixture = path.join(root, 'stabilization-fixture.mp4');
const generatedStabilization = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=size=360x220:rate=30', '-vf', 'crop=320:180:x=20+8*sin(2*PI*t*1.6):y=20+5*cos(2*PI*t*1.1),scale=320:180', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', stabilizationFixture], { encoding: 'utf8' });
assert.equal(generatedStabilization.status, 0, generatedStabilization.stderr);

try {
  const asset = await saveBinaryAsset({ buffer: await readFile(fixture), contentType: 'video/mp4', projectId: 'render-profile-audit', kind: 'shot' });
  const transitionAsset = await saveBinaryAsset({ buffer: await readFile(transitionFixture), contentType: 'video/mp4', projectId: 'render-profile-audit', kind: 'shot' });
  const transitionStartAsset = await saveBinaryAsset({ buffer: await readFile(transitionStartFixture), contentType: 'video/mp4', projectId: 'render-profile-audit', kind: 'shot' });
  const stabilizationAsset = await saveBinaryAsset({ buffer: await readFile(stabilizationFixture), contentType: 'video/mp4', projectId: 'render-profile-audit', kind: 'shot' });
  assert.equal(asset.probeStatus, 'passed');
  assert.equal(transitionAsset.probeStatus, 'passed');
  assert.equal(transitionStartAsset.probeStatus, 'passed');
  assert.equal(stabilizationAsset.probeStatus, 'passed');
  const base = { id: 'clip-1', track: 0, mediaType: 'video', mediaUrl: asset.url, probeStatus: asset.probeStatus, duration: 0.8, sourceOffset: 0.25, playbackRate: 1.5 };
  const cases = [
    ['16:9', 24], ['16:9', 25], ['16:9', 30],
    ['9:16', 24], ['9:16', 25], ['9:16', 30], ['1:1', 24]
  ];
  const outputs = [];
  for (const [aspectRatio, fps] of cases) {
    const result = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio, fps }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 0.8 }], timeline: [{ ...base, id: `clip-${aspectRatio}-${fps}` }] }, { workDir: path.join(root, `${aspectRatio.replace(':', '-')}-${fps}`) });
    const profile = resolveRenderProfile({ settings: { aspectRatio, fps } });
    assert.equal(result.renderProfile.width, profile.width);
    assert.equal(result.renderProfile.height, profile.height);
    assert.equal(result.technicalQc.width, profile.width);
    assert.equal(result.technicalQc.height, profile.height);
    assert.ok(Math.abs(result.technicalQc.fps - fps) <= 0.05, `${aspectRatio} ${fps}fps 实际为 ${result.technicalQc.fps}`);
    outputs.push(`${aspectRatio}/${fps}`);
  }

  const gapped = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 0.4 }], timeline: [
    { ...base, id: 'clip-gap-1', start: 0, duration: 0.4, playbackRate: 1 },
    { ...base, id: 'clip-gap-2', start: 0.8, duration: 0.4, playbackRate: 1.5 }
  ] }, { workDir: path.join(root, 'gap-speed') });
  assert.equal(gapped.renderProfile.fps, 30);
  assert.ok(Math.abs(gapped.durationSeconds - 1.2) < 0.001);
  assert.ok(Math.abs(gapped.technicalQc.duration - 1.2) < 0.15, `空隙成片时长异常：${gapped.technicalQc.duration}`);

  const transformedBase = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'transform-base', duration: 1, sourceOffset: 0, playbackRate: 1 }] }, { workDir: path.join(root, 'transform-base') });
  const transformed = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'transform-applied', duration: 1, sourceOffset: 0, playbackRate: 1, positionX: 120, positionY: -40, scale: 145, rotation: 8 }] }, { workDir: path.join(root, 'transform-applied') });
  const frameFingerprintAt = (output, time) => spawnSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', output, '-frames:v', '1', '-f', 'framemd5', '-'], { encoding: 'utf8' }).stdout.trim();
  const frameFingerprint = output => frameFingerprintAt(output, 0.5);
  const meanGray = (output, crop) => { const measured = spawnSync('ffmpeg', ['-v', 'error', '-ss', '0.5', '-i', output, '-vf', `crop=${crop},format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 2 * 1024 * 1024 }); assert.equal(measured.status, 0, measured.stderr?.toString()); const bytes = [...measured.stdout]; return bytes.reduce((sum, value) => sum + value, 0) / Math.max(1, bytes.length); };
  assert.notEqual(frameFingerprint(transformed.path), frameFingerprint(transformedBase.path), '基础变换未反映到导出帧');
  const speedRamp = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 2 }], timeline: [{ ...base, id: 'speed-ramp', duration: 1, sourceOffset: 0, playbackRate: 1, speedRamp: { from: 0.75, to: 1.35 } }] }, { workDir: path.join(root, 'speed-ramp') });
  assert.notEqual(frameFingerprintAt(speedRamp.path, 0.25), frameFingerprintAt(transformedBase.path, 0.25), '速度渐变未改变前段导出帧');
  assert.notEqual(frameFingerprintAt(speedRamp.path, 0.75), frameFingerprintAt(transformedBase.path, 0.75), '速度渐变未改变后段导出帧');
  assert.ok(Math.abs(speedRamp.technicalQc.duration - 1) < 0.15, `速度渐变成片时长异常：${speedRamp.technicalQc.duration}`);
  await assert.rejects(() => renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'speed-ramp-invalid', duration: 1, sourceOffset: 0, playbackRate: 1, speedRamp: { from: 'invalid', to: 1.2 } }] }), error => error.code === 'RENDER_SPEED_RAMP_INVALID');
  const handheld = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'handheld', duration: 1, sourceOffset: 0, playbackRate: 1, handheld: true }] }, { workDir: path.join(root, 'handheld') });
  assert.notEqual(frameFingerprint(handheld.path), frameFingerprint(transformedBase.path), '轻微手持未反映到导出帧');
  assert.notEqual(frameFingerprintAt(handheld.path, 0.2), frameFingerprintAt(handheld.path, 0.8), '轻微手持没有产生时间变化');
  const stabilizationBase = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: stabilizationAsset.url, probeStatus: stabilizationAsset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'stabilization-base', mediaUrl: stabilizationAsset.url, duration: 1, sourceOffset: 0, playbackRate: 1 }] }, { workDir: path.join(root, 'stabilization-base') });
  const stabilized = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: stabilizationAsset.url, probeStatus: stabilizationAsset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'stabilization', mediaUrl: stabilizationAsset.url, duration: 1, sourceOffset: 0, playbackRate: 1, stabilization: true }] }, { workDir: path.join(root, 'stabilization') });
  assert.notEqual(frameFingerprintAt(stabilized.path, 0.5), frameFingerprintAt(stabilizationBase.path, 0.5), '画面稳定未反映到真实导出帧');
  assert.ok(Math.abs(stabilized.technicalQc.duration - 1) < 0.15, `画面稳定成片时长异常：${stabilized.technicalQc.duration}`);
  const stabilizationPreflight = await renderPreflight({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, timeline: [{ ...base, id: 'stabilization-preflight', mediaUrl: stabilizationAsset.url, stabilization: true }] });
  assert.equal(stabilizationPreflight.capabilities.stabilizationDeshake, true);
  assert.equal(stabilizationPreflight.blockers.some(item => item.code === 'STABILIZATION_FILTER_UNAVAILABLE'), false);
  await assert.rejects(() => renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 24 }, shots: [{ id: '1', videoUrl: stabilizationAsset.url, probeStatus: stabilizationAsset.probeStatus }], timeline: [{ ...base, id: 'stabilization-invalid', mediaUrl: stabilizationAsset.url, stabilization: 'yes' }] }), error => error.code === 'RENDER_STABILIZATION_INVALID');
  const letterbox = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }], timeline: [{ ...base, id: 'letterbox', duration: 1, sourceOffset: 0, playbackRate: 1, letterbox: true }] }, { workDir: path.join(root, 'letterbox') });
  const letterboxTop = meanGray(letterbox.path, 'iw:80:0:0'); const letterboxCenter = meanGray(letterbox.path, 'iw:80:0:320');
  assert(letterboxTop < 2, `电影黑边顶部不是黑色：${letterboxTop}`); assert(letterboxCenter > 2, `电影黑边中心内容丢失：${letterboxCenter}`);
  const crossfade = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus, duration: 1 }, { id: '2', videoUrl: transitionAsset.url, probeStatus: transitionAsset.probeStatus, duration: 1 }], timeline: [
    { ...base, id: 'crossfade-1', mediaUrl: transitionStartAsset.url, shotId: '1', start: 0, duration: 1, sourceOffset: 0, playbackRate: 1 },
    { ...base, id: 'crossfade-2', mediaUrl: transitionAsset.url, shotId: '2', start: 0.75, duration: 1, sourceOffset: 0, playbackRate: 1, transition: 'crossfade', transitionDuration: 0.25 }
  ] }, { workDir: path.join(root, 'crossfade') });
  const meanColor = (output, time) => { const measured = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', output, '-vf', 'crop=1:1:160:90,format=rgb24', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1024 * 1024 }); assert.equal(measured.status, 0, measured.stderr?.toString()); const bytes = [...measured.stdout]; return [bytes[0] || 0, bytes[1] || 0, bytes[2] || 0]; };
  const crossfadeMidColor = meanColor(crossfade.path, 0.875);
  assert(crossfadeMidColor[2] > 20 && crossfadeMidColor[0] > 20, `交叉溶解中间帧没有同时包含前后片段：${crossfadeMidColor}`);
  assert.ok(Math.abs(crossfade.technicalQc.duration - 1.75) < 0.15, `交叉溶解成片时长异常：${crossfade.technicalQc.duration}`);
  const flash = await renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 30 }, shots: [{ id: '1', videoUrl: transitionStartAsset.url, probeStatus: transitionStartAsset.probeStatus, duration: 1 }, { id: '2', videoUrl: transitionAsset.url, probeStatus: transitionAsset.probeStatus, duration: 1 }], timeline: [
    { ...base, id: 'flash-1', mediaUrl: transitionStartAsset.url, shotId: '1', start: 0, duration: 1, sourceOffset: 0, playbackRate: 1 },
    { ...base, id: 'flash-2', mediaUrl: transitionAsset.url, shotId: '2', start: 0.75, duration: 1, sourceOffset: 0, playbackRate: 1, transition: 'flash', transitionDuration: 0.25 }
  ] }, { workDir: path.join(root, 'flash') });
  const flashMidColor = meanColor(flash.path, 0.875);
  assert(Math.min(...flashMidColor) > 100 && flashMidColor.reduce((sum, value) => sum + value, 0) / 3 > 170, `叠化闪白中间帧不够明亮：${flashMidColor}`);
  assert.ok(Math.abs(flash.technicalQc.duration - 1.75) < 0.15, `叠化闪白成片时长异常：${flash.technicalQc.duration}`);

  assert.equal(resolveRenderProfile({ settings: { aspectRatio: '4:3', fps: 24 } }).ok, false);
  await assert.rejects(() => renderProject({ id: 'unsupported', settings: { aspectRatio: '16:9', fps: 23 }, shots: [], timeline: [{ ...base, mediaUrl: '' }] }), error => error.code === 'RENDER_FPS_UNSUPPORTED');
  await assert.rejects(() => renderProject({ id: 'render-profile-audit', settings: { aspectRatio: '16:9', fps: 24 }, shots: [{ id: '1', videoUrl: asset.url, probeStatus: asset.probeStatus }], timeline: [{ ...base, id: 'a', start: 0, duration: 1 }, { ...base, id: 'b', start: 0.5, duration: 1 }] }), error => error.code === 'RENDER_TIMELINE_OVERLAP');
  console.log(JSON.stringify({ ok: true, profiles: outputs, gap: true, playbackRate: true, sourceOffset: true, transform: true, speedRamp: true, speedRampDuration: Number(speedRamp.technicalQc.duration.toFixed(2)), speedRampInvalidRejected: true, handheld: true, stabilization: true, stabilizationDuration: Number(stabilized.technicalQc.duration.toFixed(2)), stabilizationInvalidRejected: true, letterbox: true, letterboxTop: Number(letterboxTop.toFixed(2)), letterboxCenter: Number(letterboxCenter.toFixed(2)), crossfade: true, crossfadeMidColor: crossfadeMidColor.map(value => Number(value.toFixed(2))), crossfadeDuration: Number(crossfade.technicalQc.duration.toFixed(2)), flash: true, flashMidColor: flashMidColor.map(value => Number(value.toFixed(2))), flashDuration: Number(flash.technicalQc.duration.toFixed(2)), unsupportedRejected: true, overlapRejected: true }));
} finally {
  await rm(root, { recursive: true, force: true });
}
