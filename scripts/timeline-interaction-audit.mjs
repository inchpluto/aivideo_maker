import assert from 'node:assert/strict';
import { TIMELINE_STEP, roundTimelineTime, snapTimelineTime, timelineTimeFromPointer } from '../src/timelineMath.js';

assert.equal(TIMELINE_STEP, 0.01);
assert.equal(roundTimelineTime(3.146), 3.15);
assert.equal(roundTimelineTime(-2), 0);

const clips = [
  { id:'a', start:1.25, duration:2.5 },
  { id:'b', start:5, duration:1.75 }
];
assert.equal(snapTimelineTime(4.996,clips,'',.02,true),5);
assert.equal(snapTimelineTime(4.996,clips,'',.02,false),5);
assert.equal(snapTimelineTime(4.984,clips,'',.005,true),4.98);

const withoutOffset = timelineTimeFromPointer({clientX:500,laneLeft:0,laneWidth:1000,total:20,grabOffset:0,clips:[],magnetic:false});
const withOffset = timelineTimeFromPointer({clientX:500,laneLeft:0,laneWidth:1000,total:20,grabOffset:1.25,clips:[],magnetic:false});
assert.equal(withoutOffset,10);
assert.equal(withOffset,8.75);
assert.equal(timelineTimeFromPointer({clientX:250,laneLeft:100,laneWidth:600,total:24,grabOffset:1,clips:[],magnetic:false}),5);

console.log(JSON.stringify({ok:true,step:TIMELINE_STEP,pointerTime:withoutOffset,grabAlignedTime:withOffset},null,2));
