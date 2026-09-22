import assert from 'node:assert/strict';
import { buildSrt, captionItemsFromTimeline } from '../src/captionExport.js';

const captions = captionItemsFromTimeline([
  { track: 0, start: 0, duration: 1, label: '镜头名不能作为字幕' },
  { track: 3, start: 1.25, duration: 1.5, label: '第一行\n第二行' },
  { trackType: 'caption', start: 3, duration: 0.75, label: '下一句' },
]);
assert.equal(captions.length, 2);
const srt = buildSrt(captions);
assert.match(srt, /1\n00:00:01,250 --> 00:00:02,750\n第一行\n第二行/);
assert.match(srt, /2\n00:00:03,000 --> 00:00:03,750\n下一句/);
assert.throws(() => buildSrt([{ start: 1, end: 2, text: '前一句' }, { start: 1.5, end: 2.5, text: '重叠' }]), /字幕时间或文本无效/);
console.log(JSON.stringify({ ok: true, captions: captions.length, multiline: true, cameraTrackExcluded: true, overlapRejected: true }));
