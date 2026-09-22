import assert from 'node:assert/strict';
import { previewCaptionAt, previewClipAt, previewDuration, previewPlaybackRate, previewSourceTime, previewTransitionAt } from '../src/previewTimeline.js';

const items = [
  { id: 'v1', trackType: 'video', start: 0, duration: 2, sourceIn: 1 },
  { id: 'v2', trackType: 'video', start: 3, duration: 1, playbackRate: 2, sourceIn: 0.5 },
  { id: 'voice', trackType: 'voice', start: 0.5, duration: 2 },
  { id: 'caption', trackType: 'caption', start: 3, duration: 0.8, label: '下一镜' }
];

assert.equal(previewDuration(items), 4);
assert.equal(previewClipAt(items, 1, 'video')?.id, 'v1');
assert.equal(previewClipAt(items, 2.5, 'video'), null);
assert.equal(previewClipAt(items, 3.25, 'video')?.id, 'v2');
assert.equal(previewClipAt(items, 1, 'audio')?.id, 'voice');
assert.equal(previewCaptionAt(items, 3.2)?.label, '下一镜');
assert.equal(previewSourceTime(items[1], 3.25), 1);
const ramped = { id: 'ramped', trackType: 'video', start: 4, duration: 2, sourceOffset: 2, speedRamp: { from: 0.5, to: 1.5 } };
assert.equal(previewPlaybackRate(ramped, 4), 0.5);
assert.equal(previewPlaybackRate(ramped, 5), 1);
assert.equal(previewPlaybackRate(ramped, 6), 1.5);
assert.equal(previewSourceTime(ramped, 5), 2.75);
assert.equal(previewSourceTime(ramped, 6), 4);
const transitionItems = [
  { id: 'outgoing', trackType: 'video', trackId: 'video-1', start: 0, duration: 2 },
  { id: 'incoming', trackType: 'video', trackId: 'video-1', start: 1.5, duration: 2, transition: 'crossfade', transitionDuration: 0.5 },
];
const transition = previewTransitionAt(transitionItems, 1.75);
assert.equal(transition?.outgoing.id, 'outgoing');
assert.equal(transition?.incoming.id, 'incoming');
assert.equal(transition?.type, 'crossfade');
assert.equal(transition?.progress, 0.5);
const flash = previewTransitionAt([{ ...transitionItems[0] }, { ...transitionItems[1], transition: 'flash' }], 1.75);
assert.equal(flash?.flashOpacity, 1);
assert.equal(previewTransitionAt(transitionItems, 2), null);
console.log(JSON.stringify({ ok: true, duration: 4, gap: true, sourceIn: true, playbackRate: true, speedRamp: true, caption: true, transition: true, transitionProgress: transition.progress, flashPeak: flash.flashOpacity }));
