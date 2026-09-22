const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export const previewTrackType = item => item?.trackType || (Number(item?.track) === 3 ? 'caption' : Number(item?.track) > 0 ? 'voice' : 'video');

export const previewItems = (items = [], type) => (Array.isArray(items) ? items : [])
  .filter(item => (!type || (type === 'audio' ? ['voice', 'music'].includes(previewTrackType(item)) : previewTrackType(item) === type)) && numeric(item?.duration) > 0)
  .map(item => ({ ...item, start: Math.max(0, numeric(item.start)), duration: numeric(item.duration) }))
  .sort((a, b) => numeric(a.start) - numeric(b.start) || String(a.id).localeCompare(String(b.id)));

export const previewDuration = items => previewItems(items).reduce((end, item) => Math.max(end, item.start + item.duration), 0);

export const previewClipAt = (items, time, type) => {
  const position = Math.max(0, numeric(time));
  const candidates = previewItems(items, type).filter(item => position >= item.start - 0.0001 && position < item.start + item.duration - 0.0001);
  return candidates.at(-1) || null;
};

export const previewTransitionAt = (items, time) => {
  const position = Math.max(0, numeric(time));
  const videos = previewItems(items, 'video');
  for (const incoming of [...videos].reverse()) {
    const type = String(incoming.transition || '').toLowerCase();
    const duration = Math.max(0.05, Math.min(Number(incoming.transitionDuration) || 0.25, Number(incoming.duration) || 0.25));
    if (!['crossfade', 'flash'].includes(type) || position < incoming.start - 0.0001 || position >= incoming.start + duration - 0.0001) continue;
    const sameTrack = videos.filter(item => item.trackId === incoming.trackId || (!item.trackId && !incoming.trackId));
    const index = sameTrack.findIndex(item => item.id === incoming.id);
    const outgoing = sameTrack[index - 1];
    if (!outgoing || position < outgoing.start || position >= outgoing.start + outgoing.duration) continue;
    const progress = Math.max(0, Math.min(1, (position - incoming.start) / duration));
    return { type, outgoing, incoming, duration, progress, flashOpacity: type === 'flash' ? (progress < 0.5 ? progress * 2 : (1 - progress) * 2) : 0 };
  }
  return null;
};

const clampRate = value => Math.max(0.25, Math.min(4, numeric(value) || 1));
const speedRampBounds = clip => {
  const ramp = clip?.speedRamp;
  if (!ramp || typeof ramp !== 'object') return null;
  const from = clampRate(ramp.from ?? ramp.start);
  const to = clampRate(ramp.to ?? ramp.end);
  return Number.isFinite(from) && Number.isFinite(to) ? { from, to } : null;
};

export const previewPlaybackRate = (clip, time) => {
  const ramp = speedRampBounds(clip);
  if (!ramp) return clampRate(clip?.playbackRate);
  const duration = Math.max(0.01, numeric(clip.duration));
  const progress = Math.max(0, Math.min(1, (numeric(time) - numeric(clip.start)) / duration));
  return clampRate(ramp.from + (ramp.to - ramp.from) * progress);
};

export const previewSourceTime = (clip, time) => {
  if (!clip) return 0;
  const sourceStart = numeric(clip.sourceOffset ?? clip.sourceIn);
  const elapsed = Math.max(0, numeric(time) - numeric(clip.start));
  const ramp = speedRampBounds(clip);
  if (ramp) {
    const duration = Math.max(0.01, numeric(clip.duration));
    const boundedElapsed = Math.min(duration, elapsed);
    const slope = (ramp.to - ramp.from) / duration;
    return Math.max(0, sourceStart + ramp.from * boundedElapsed + 0.5 * slope * boundedElapsed * boundedElapsed);
  }
  return Math.max(0, sourceStart + elapsed * clampRate(clip.playbackRate));
};

export const previewCaptionAt = (items, time) => previewClipAt(items, time, 'caption');
