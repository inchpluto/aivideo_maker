import assert from 'node:assert/strict';
import { applyProjectTask, shotInputSignature } from '../src/workflow.js';

const base = { id: 'p', shots: [{ id: 's1', prompt: '旧输入', videoUrl: '' }], timeline: [], jobs: [], workflow: {} };
const signature = shotInputSignature(base.shots[0]);
const changed = { ...base, shots: [{ ...base.shots[0], prompt: '新输入' }] };
const result = applyProjectTask(changed, 'video', { mode: 'live', result: { status: 'SUCCEEDED', output: ['/api/assets/p/video.mp4'], probeStatus: 'passed' } }, { shotId: 's1', inputSignature: signature });
assert.equal(result.shots[0].videoUrl, '');
assert.equal(result.staleResults[0].shotId, 's1');
console.log(JSON.stringify({ ok: true, stale: true, videoUrl: result.shots[0].videoUrl }));
