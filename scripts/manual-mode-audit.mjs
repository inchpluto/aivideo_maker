import assert from 'node:assert/strict';
import { inspectWorkflow } from '../server/pipeline.mjs';

const media = { url: '/api/assets/p/manual.mp4', probeStatus: 'passed', mediaMetadata: { duration: 2, streams: [{ codec_type: 'video' }] } };
const shot = {
  id: 'shot-manual-1', sceneRef: 'manual-scene', subjectAction: '人物走入画面', type: '中景', move: '固定',
  visualContent: '室内走廊', sound: '环境声', narrativePurpose: '建立冲突', startFrame: '首帧', endFrame: '尾帧',
  continuity: ['服装一致', '光向一致'], duration: 2, videoUrl: media.url, ...media,
  status: 'generated', videoReview: { decision: 'pass' }
};
const project = {
  id: 'manual-project', title: '手动成片', type: '短片', synopsis: '一镜手动导入验收',
  settings: { aspectRatio: '16:9' }, manualWorkflow: { mode: 'manual-media' }, shots: [shot], timeline: [{
    id: 'clip-shot-manual-1', track: 0, mediaUrl: media.url, ...media, status: 'generated'
  }], generation: { editing: { status: 'applied' } }
};
const report = inspectWorkflow(project);
const stages = Object.fromEntries(report.stages.map(stage => [stage.id, stage]));
for (const id of ['story', 'identity', 'storyboard', 'keyframe', 'voice', 'video', 'edit']) assert.equal(stages[id].state, 'done', id);
assert.equal(stages.storyboard.metrics.manualMediaMode, true);
console.log(JSON.stringify({ ok: true, mode: 'manual-media', storyboard: stages.storyboard.state, video: stages.video.state, edit: stages.edit.state }));
