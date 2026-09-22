import assert from 'node:assert/strict';
import { compileVoicePerformance, voicePayloadFromPerformance } from '../shared/voicePerformance.mjs';

const hesitant=compileVoicePerformance({engine:'index_tts_local',character:{desire:'寻找真相'},line:{text:'如果现在回头一切还来得及吗？',emotion:'迟疑',intention:'向同伴寻求确认',pace:'偏慢',pauseStyle:'在“回头”后停顿',emphasis:'现在'}});
assert.equal(hesitant.emotion,'迟疑');
assert.equal(hesitant.emotionIntensity,50);
assert.equal(hesitant.speedFactor,.9);
assert.equal(hesitant.durationFactor,1.12);
assert.equal(hesitant.ttsText,'如果现在回头，一切还来得及吗？');
assert.equal(hesitant.intention,'向同伴寻求确认');
assert.equal(hesitant.emphasis,'现在');

const urgent=compileVoicePerformance({line:{text:'快走！',emotion:'紧张',pace:'急促'}});
assert.equal(urgent.emotionIntensity,77);
assert.equal(urgent.speedFactor,1.18);
assert.equal(urgent.durationFactor,.86);
const payload=voicePayloadFromPerformance(urgent);
assert.equal(payload.text,'快走！');
assert.equal(payload.performanceVersion,'1.0.0');

const manual=compileVoicePerformance({line:{text:'别开门。',emotion:'平静',pace:'中速'},overrides:{emotion:'坚定',emotionIntensity:81,speedFactor:1.07}});
assert.equal(manual.emotion,'坚定');
assert.equal(manual.emotionIntensity,81);
assert.equal(manual.speedFactor,1.07);
console.log(JSON.stringify({ok:true,hesitant,urgent:payload,manual},null,2));
