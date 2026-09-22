import assert from 'node:assert/strict';
import { markChangedVoiceLinesStale, textInputHash } from '../shared/assetVersions.mjs';

const project = { episodes:[{ id:'ep-1', scenes:[{ id:'scene-1', heading:'码头' }], dialogues:[{ id:'line-1', character:'林夏', text:'已经改变的台词' }, { id:'line-2', character:'林夏', text:'保持不变' }] }], characters:[{ id:'char-1', name:'林夏', sceneVoices:[{ lineId:'line-1', sceneId:'scene-1', text:'旧台词', textHash:textInputHash('旧台词'), audioUrl:'/voice-old.wav', status:'generated' }, { lineId:'line-2', sceneId:'scene-1', text:'保持不变', textHash:textInputHash('保持不变'), audioUrl:'/voice-keep.wav', status:'generated' }] }], shots:[{ id:'shot-1', dialogueRef:'line-1', videoUrl:'/shot-1.mp4', status:'generated' }, { id:'shot-2', dialogueRef:'line-2', videoUrl:'/shot-2.mp4', status:'generated' }] };
const next = markChangedVoiceLinesStale(project);
const changed = next.characters[0].sceneVoices.find(item => item.lineId === 'line-1');
const kept = next.characters[0].sceneVoices.find(item => item.lineId === 'line-2');
assert.equal(changed.status, 'stale'); assert.match(changed.staleReason, /台词文本/); assert.equal(kept.status, 'generated');
assert.equal(next.shots.find(item => item.id === 'shot-1').status, 'stale'); assert.equal(next.shots.find(item => item.id === 'shot-2').status, 'generated');
console.log(JSON.stringify({ ok:true, staleVoice:'line-1', staleShot:'shot-1', unaffected:'line-2/shot-2' }));
