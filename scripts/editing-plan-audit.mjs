import assert from 'node:assert/strict';
import { executeEditingPlan, parseEditingParams, validateTimeline } from '../src/editingPlan.js';

const tracks = [
  { id:'video-1', type:'video', label:'V1 画面' },
  { id:'voice-1', type:'voice', label:'A1 人声 / 环境' },
  { id:'caption-1', type:'caption', label:'T1 字幕' }
];
const items = [
  { id:'clip-01', track:0, trackType:'video', trackId:'video-1', start:0, duration:4, label:'镜头 01', mediaType:'video' },
  { id:'voice-01', track:1, trackType:'voice', trackId:'voice-1', start:0, duration:3, label:'对白', mediaType:'audio', volume:100 }
];
const operations = [
  { operation:'trim', target:'clip-01', params:{inSeconds:.5,outSeconds:.5}, reason:'去掉不稳定首尾帧' },
  { operation:'move', target:'clip-01', params:'{"start":1,"trackId":"video-1"}', reason:'调整节拍' },
  { operation:'setVolume', target:'A1', params:{volume:82}, reason:'对白余量' },
  { operation:'normalizeAudio', target:'master', params:{targetLufs:-14}, reason:'交付响度目标' },
  { operation:'addCaptions', target:'master', params:{style:'cinematic'}, reason:'生成字幕草稿' },
  { operation:'rippleDelete', target:'master', params:{reasonCode:'unsafe'}, reason:'不应批量删除' },
  { operation:'unsupportedEffect', target:'clip-01', params:{}, reason:'保留人工任务' }
];
const result = executeEditingPlan({items,tracks,operations,dialogues:[{character:'林岚',text:'风暴已经到了。'}]});
const video = result.items.find(item=>item.id==='clip-01'); const voice = result.items.find(item=>item.id==='voice-01'); const caption = result.items.find(item=>item.trackType==='caption');

assert.deepEqual(parseEditingParams('start=2；trackId=video-1'), {start:'2',trackId:'video-1'});
assert.equal(video.start,1);
assert.equal(video.duration,3);
assert.equal(video.sourceOffset,.5);
assert.equal(video.sourceIn,.5);
assert.equal(video.sourceOut,3.5);
assert.equal(voice.volume,82);
assert.equal(voice.targetLufs,-14);
assert.equal(voice.renderRequired,true);
assert.equal(caption.label,'风暴已经到了。');
assert.equal(caption.status,'needs-sync');
assert.equal(result.applied.length,5);
assert.equal(result.rejected.some(item=>item.operation==='rippleDelete'),true);
assert.equal(result.deferred.some(item=>item.operation==='unsupportedEffect'),true);
assert.equal(validateTimeline(result.items).length, 0);
const overlap = executeEditingPlan({ items:[...items, { id:'clip-02', track:0, trackType:'video', trackId:'video-1', start:5, duration:2, label:'镜头 02', mediaType:'video' }], tracks, operations:[{ operation:'move', target:'clip-01', params:{start:5}, reason:'冲突测试' }] });
assert.equal(overlap.rejected.length, 1);
assert.equal(overlap.items.find(item=>item.id==='clip-01').start, 0);

const noGuess = executeEditingPlan({items,tracks,operations:[{operation:'trimSilence',target:'voice-01',params:{thresholdDb:-36},reason:'没有可验证时间码'}]});
assert.equal(noGuess.items[1].duration,3);
assert.equal(noGuess.deferred.length,1);

console.log(JSON.stringify({ok:true,applied:result.applied.length,deferred:result.deferred.length,rejected:result.rejected.length,captions:result.items.filter(item=>item.trackType==='caption').length},null,2));
