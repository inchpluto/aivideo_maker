import assert from 'node:assert/strict';
import { inspectWorkflow } from '../server/pipeline.mjs';

const shot = index => ({ id: `shot-${index}`, sceneRef: 'scene-1', subjectAction: '人物观察雨幕', type: '中景', move: '固定镜头', visualContent: '人物与站台', sound: '雨声', narrativePurpose: '建立悬念', continuity: ['黄色雨衣', '左侧来光'], duration: 3 });
const report = inspectWorkflow({ shots: [1, 2, 3, 4].map(shot), episodes: [] });
const storyboard = report.stages.find(stage => stage.id === 'storyboard');
assert.equal(storyboard.score, 90);
assert.equal(storyboard.state, 'blocked');
assert.deepEqual(storyboard.blockers, ['部分镜头缺少首尾帧']);
assert.ok(report.blockers.includes('storyboard：部分镜头缺少首尾帧'));
assert.ok(Array.isArray(report.warnings));
console.log(JSON.stringify({ ok: true, score: storyboard.score, state: storyboard.state, blockers: storyboard.blockers }));
