export const TIMELINE_STEP = 0.01;

export function roundTimelineTime(value) {
  return Number(Math.max(0, Number(value) || 0).toFixed(2));
}

export function snapTimelineTime(value, clips = [], excludeId = '', threshold = 0, enabled = true) {
  const exact = roundTimelineTime(value);
  if (!enabled || threshold <= 0) return exact;
  const points = [0];
  for (const clip of clips) {
    if (clip.id === excludeId) continue;
    points.push(Number(clip.start) || 0, (Number(clip.start) || 0) + (Number(clip.duration) || 0));
  }
  const nearest = points.reduce((best, point) => Math.abs(point - exact) < Math.abs(best - exact) ? point : best, points[0]);
  return Math.abs(nearest - exact) <= threshold ? roundTimelineTime(nearest) : exact;
}

export function timelineTimeFromPointer({ clientX, laneLeft, laneWidth, total, grabOffset = 0, clips = [], excludeId = '', magnetic = true }) {
  const width = Math.max(1, Number(laneWidth) || 1);
  const duration = Math.max(TIMELINE_STEP, Number(total) || TIMELINE_STEP);
  const pointer = Math.max(0, Math.min(width, Number(clientX) - Number(laneLeft)));
  const raw = Math.max(0, pointer / width * duration - Math.max(0, Number(grabOffset) || 0));
  const threshold = duration / width * 7;
  return snapTimelineTime(raw, clips, excludeId, threshold, magnetic);
}
