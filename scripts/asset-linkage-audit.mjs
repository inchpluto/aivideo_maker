import assert from 'node:assert/strict';
import { summarizeAssetLinks, synchronizeAssetLinks } from '../src/assetLinkage.js';

const input={
  episodes:[{title:'第一集',scenes:[{heading:'外景 · 站台 · 夜',characters:[]}],dialogues:[{character:'林夏',text:'列车来了。',emotion:'警觉'}]}],
  shots:[{id:'01',sceneRef:'missing',dialogue:'列车来了。',characters:[]}],
  assets:{props:[{name:'录音机',sceneRefs:['missing']}]}
};
assert.ok(summarizeAssetLinks(input).broken.length>0,'broken references should be detected');
const linked=synchronizeAssetLinks(input);
const summary=summarizeAssetLinks(linked);
assert.equal(summary.broken.length,0,'all references should be repaired');
assert.equal(linked.episodes[0].dialogues[0].sceneRef,linked.episodes[0].scenes[0].id);
assert.equal(linked.shots[0].dialogueRef,linked.episodes[0].dialogues[0].id);
assert.ok(linked.shots[0].characters.includes('林夏'));
console.log('asset linkage audit passed');
