const TYPE_INDEX = { video: 0, voice: 1, music: 2, caption: 3 };
const typeOf = item => item.trackType || ['video', 'voice', 'music', 'caption'][Number(item.track)] || 'video';
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value, min)));

export function parseEditingParams(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return {};
  try { const parsed = JSON.parse(text); return parsed && typeof parsed === 'object' ? parsed : {}; } catch {}
  return Object.fromEntries(text.split(/[;；,，]/).map(part => part.split(/[:=：]/, 2).map(item => item.trim())).filter(pair => pair.length === 2 && pair[0]));
}

const operationName = value => ({
  trimSilence: 'trim', trimClip: 'trim', moveClip: 'move', setClipVolume: 'setVolume',
  normalizeLoudness: 'normalizeAudio', captions: 'addCaptions', changeSpeed: 'setSpeed',
  transition: 'addTransition', splitClip: 'split', duplicateClip: 'duplicate', deleteClip: 'rippleDelete'
}[value] || value);

const matchesTarget = (item, target, tracks) => {
  if (!target || target === 'master' || target === 'all') return true;
  if (item.id === target) return true;
  const track = tracks.find(entry => entry.id === item.trackId);
  return item.trackId === target || track?.label === target || track?.label?.startsWith(`${target} `);
};
const compatibleTrack = (item, track) => {
  if (!track) return true;
  const type = typeOf(item); const media = item.mediaType;
  if (track.type === 'video') return type === 'video' || ['video', 'image'].includes(media);
  if (track.type === 'caption') return type === 'caption' || media === 'caption';
  return ['voice', 'music'].includes(track.type) && (['voice', 'music'].includes(type) || media === 'audio');
};

export function validateTimeline(items = []) {
  const issues = [];
  for (const item of items) {
    const start = number(item.start, NaN); const duration = number(item.duration, NaN);
    if (!Number.isFinite(start) || start < 0) issues.push({ id:item.id, code:'NEGATIVE_START', message:'片段开始时间不能小于 0 秒' });
    if (!Number.isFinite(duration) || duration <= 0) issues.push({ id:item.id, code:'INVALID_DURATION', message:'片段必须有正数时长' });
  }
  const groups = new Map();
  items.forEach(item => { const key = item.trackId || `track-${item.track ?? 0}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
  for (const group of groups.values()) {
    const sorted = group.filter(item => number(item.duration) > 0).sort((a, b) => number(a.start) - number(b.start));
    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1]; const current = sorted[i];
      if (number(current.start) < number(previous.start) + number(previous.duration) - 0.01) issues.push({ id:current.id, code:'OVERLAP', with:previous.id, message:`片段 ${current.id} 与 ${previous.id} 在同一轨道重叠` });
    }
  }
  return issues;
}

const captionItems = ({ items, tracks, dialogues, nonce }) => {
  if (items.some(item => typeOf(item) === 'caption')) return [];
  const track = tracks.find(item => item.type === 'caption');
  if (!track || !dialogues.length) return [];
  const total = items.filter(item => typeOf(item) === 'video').reduce((end, item) => Math.max(end, number(item.start) + number(item.duration)), 0);
  const span = Math.max(1.2, total / dialogues.length || 2);
  return dialogues.map((line, index) => ({
    id: `caption-ai-${nonce}-${index}`, track: 3, trackType: 'caption', trackId: track.id,
    start: Number((index * span).toFixed(2)), duration: Number(Math.max(.8, Math.min(span, total - index * span || span)).toFixed(2)),
    label: line.text, character: line.character || '', cls: 'clip-caption', status: 'needs-sync', source: 'ai-editing-plan'
  }));
};

/**
 * Executes only deterministic, non-destructive timeline operations. Rendering-only work is
 * stored as metadata and reported separately so the UI never claims media was actually rendered.
 */
export function executeEditingPlan({ items = [], tracks = [], operations = [], dialogues = [] } = {}) {
  let next = items.map(item => ({ ...item }));
  const applied = []; const deferred = []; const rejected = []; const nonce = Date.now();
  const record = (bucket, operation, message, mode = 'timeline') => bucket.push({ operation: operation.operation, target: operation.target, message, mode });

  operations.forEach((raw, operationIndex) => {
    const operation = { ...raw, operation: operationName(raw?.operation), params: parseEditingParams(raw?.params) };
    const params = operation.params; const targets = next.filter(item => matchesTarget(item, operation.target, tracks));
    if (operation.operation === 'addCaptions') {
      const additions = captionItems({ items: next, tracks, dialogues, nonce });
      if (!additions.length) return record(deferred, operation, next.some(item => typeOf(item) === 'caption') ? '已有字幕，保留现有校时结果' : '缺少对白或字幕轨');
      next = [...next, ...additions]; return record(applied, operation, `新增 ${additions.length} 条待校时字幕`);
    }
    if (operation.operation === 'normalizeAudio') {
      const audioTargets = targets.filter(item => ['voice', 'music'].includes(typeOf(item)));
      if (!audioTargets.length) return record(rejected, operation, '未找到目标音频片段');
      const targetLufs = clamp(params.targetLufs ?? params.lufs ?? -14, -24, -8);
      next = next.map(item => audioTargets.some(target => target.id === item.id) ? { ...item, targetLufs, renderRequired: true } : item);
      return record(applied, operation, `已写入 ${targetLufs} LUFS 渲染目标`, 'render-target');
    }
    if (!targets.length) return record(rejected, operation, '目标片段或轨道不存在');

    if (operation.operation === 'trim') {
      const inSeconds = clamp(params.inSeconds ?? params.in ?? 0, 0, 60); const outSeconds = clamp(params.outSeconds ?? params.out ?? 0, 0, 60);
      if (inSeconds + outSeconds <= 0) return record(deferred, operation, '没有可执行的入点或出点秒数');
      let changed = 0;
      next = next.map(item => { if (!targets.some(target => target.id === item.id) || number(item.duration) - inSeconds - outSeconds < .2) return item; changed += 1; const nextDuration = number(item.duration) - inSeconds - outSeconds; const nextOffset = number(item.sourceOffset) + inSeconds; return { ...item, start: Number((number(item.start) + inSeconds).toFixed(2)), sourceOffset: Number(nextOffset.toFixed(2)), duration: Number(nextDuration.toFixed(2)), sourceIn: Number(nextOffset.toFixed(2)), sourceOut: Number((nextOffset + nextDuration).toFixed(2)) }; });
      return record(changed ? applied : rejected, operation, changed ? `已非破坏性修剪 ${changed} 个片段` : '修剪后时长不足 0.2 秒');
    }
    if (operation.operation === 'move') {
      const track = tracks.find(item => item.id === params.trackId || item.label === params.trackId);
      const start = Math.max(0, number(params.start, NaN));
      if (!Number.isFinite(start)) return record(rejected, operation, '缺少有效 start 秒数');
      if (track && targets.some(item => !compatibleTrack(item, track))) return record(rejected, operation, '目标轨道与片段媒体类型不兼容');
      const candidate = next.map(item => targets.some(target => target.id === item.id) ? { ...item, start: Number(start.toFixed(2)), ...(track ? { trackId: track.id, trackType: track.type, track: TYPE_INDEX[track.type] } : {}) } : item);
      const timelineIssues = validateTimeline(candidate);
      if (timelineIssues.length) return record(rejected, operation, timelineIssues[0].message);
      next = candidate;
      return record(applied, operation, `已移动 ${targets.length} 个片段到 ${start.toFixed(2)}s`);
    }
    if (operation.operation === 'setVolume') {
      const volume = clamp(params.volume ?? params.percent, 0, 200);
      next = next.map(item => targets.some(target => target.id === item.id) ? { ...item, volume } : item);
      return record(applied, operation, `已设置 ${targets.length} 个片段音量为 ${volume}%`);
    }
    if (operation.operation === 'setSpeed') {
      const speed = clamp(params.speed, .25, 4);
      next = next.map(item => targets.some(target => target.id === item.id) ? { ...item, duration: Number((number(item.duration) * number(item.speed, 1) / speed).toFixed(2)), speed } : item);
      return record(applied, operation, `已设置 ${targets.length} 个片段速度为 ${speed}x`);
    }
    if (operation.operation === 'addTransition') {
      const duration = clamp(params.duration ?? .25, .05, 2); const transition = String(params.transition || params.type || 'dissolve');
      next = next.map(item => targets.some(target => target.id === item.id) ? { ...item, transition: { type: transition, duration }, renderRequired: true } : item);
      return record(applied, operation, `已写入 ${transition} 转场渲染目标`, 'render-target');
    }
    if (operation.operation === 'split') {
      const target = targets[0]; if (!Number.isFinite(Number(params.at))) return record(rejected, operation, '缺少有效的片段内拆分秒数'); const at = clamp(params.at, .1, number(target.duration) - .1);
      if (!target || at <= 0 || at >= number(target.duration)) return record(rejected, operation, '拆分点必须位于片段内部');
      next = next.flatMap(item => item.id === target.id ? [{ ...item, id: `${item.id}-a-${nonce}-${operationIndex}`, duration: Number(at.toFixed(2)), sourceOut: Number((number(item.sourceOffset) + at).toFixed(2)), label: `${item.label} A` }, { ...item, id: `${item.id}-b-${nonce}-${operationIndex}`, start: Number((number(item.start) + at).toFixed(2)), sourceOffset: Number((number(item.sourceOffset) + at).toFixed(2)), sourceIn: Number((number(item.sourceOffset) + at).toFixed(2)), duration: Number((number(item.duration) - at).toFixed(2)), label: `${item.label} B` }] : item);
      return record(applied, operation, `已在片段内 ${at.toFixed(2)}s 拆分`);
    }
    if (operation.operation === 'duplicate') {
      const copies = targets.map((item, index) => ({ ...item, id: `${item.id}-copy-${nonce}-${operationIndex}-${index}`, start: Number(number(params.start, number(item.start) + number(item.duration)).toFixed(2)), label: `${item.label} 副本` }));
      const candidate = [...next, ...copies]; const timelineIssues = validateTimeline(candidate);
      if (timelineIssues.length) return record(rejected, operation, timelineIssues[0].message);
      next = candidate; return record(applied, operation, `已复制 ${copies.length} 个片段`);
    }
    if (operation.operation === 'rippleDelete') {
      if (!next.some(item => item.id === operation.target)) return record(rejected, operation, '波纹删除必须指定唯一片段 ID');
      const ids = new Set(targets.map(item => item.id)); const removed = [...targets].sort((a, b) => number(a.start) - number(b.start));
      next = next.filter(item => !ids.has(item.id)).map(item => { const shift = removed.filter(target => target.trackId === item.trackId && number(target.start) < number(item.start)).reduce((sum, target) => sum + number(target.duration), 0); return shift ? { ...item, start: Math.max(0, Number((number(item.start) - shift).toFixed(2))) } : item; });
      return record(applied, operation, `已波纹删除 ${removed.length} 个明确目标片段`);
    }
    record(deferred, operation, '当前编辑器不支持自动执行，已保留为人工任务');
  });

  return { items: next, applied, deferred, rejected, changed: JSON.stringify(next) !== JSON.stringify(items), timelineIssues: validateTimeline(next) };
}
