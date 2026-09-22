const isCaption = item => item?.trackType === 'caption' || Number(item?.track) === 3;

export const captionItemsFromTimeline = items => (Array.isArray(items) ? items : [])
  .filter(isCaption)
  .map(item => ({
    start: Number(item.start || 0),
    end: Number(item.start || 0) + Number(item.duration || 0),
    text: String(item.label || '').trim(),
  }))
  .sort((a, b) => a.start - b.start);

const srtTime = seconds => {
  const milliseconds = Math.max(0, Math.round(Number(seconds) * 1000));
  const ms = milliseconds % 1000;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const secondsPart = totalSeconds % 60;
  const minutesPart = Math.floor(totalSeconds / 60) % 60;
  const hoursPart = Math.floor(totalSeconds / 3600);
  const pad = value => String(value).padStart(2, '0');
  return `${pad(hoursPart)}:${pad(minutesPart)}:${pad(secondsPart)},${String(ms).padStart(3, '0')}`;
};

export const buildSrt = captions => {
  const items = (Array.isArray(captions) ? captions : []).map(item => ({
    start: Number(item.start),
    end: Number(item.end),
    text: String(item.text || '').trim(),
  }));
  const invalid = items.find((item, index) => !Number.isFinite(item.start) || !Number.isFinite(item.end) || item.start < 0 || item.end <= item.start || !item.text || (index > 0 && item.start < items[index - 1].end - 0.01));
  if (invalid) throw new Error(`字幕时间或文本无效：${invalid.text || '未命名字幕'}`);
  return items.map((item, index) => `${index + 1}\n${srtTime(item.start)} --> ${srtTime(item.end)}\n${item.text}\n`).join('\n');
};
