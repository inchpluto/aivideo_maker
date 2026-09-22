import assert from 'node:assert/strict';
import { createManualBinding } from '../shared/assetVersions.mjs';
const binding = createManualBinding({ shotId:'shot-07', lineId:'line-03', viewKey:'threeQuarter', sceneId:'scene-02', filename:'ignored-name.mp4' });
assert.deepEqual(binding, { shotId:'shot-07', lineId:'line-03', viewKey:'threeQuarter', sceneId:'scene-02' }); assert.equal(Object.hasOwn(binding,'filename'), false);
const unbound = createManualBinding({}); assert.deepEqual(unbound, { shotId:'', lineId:'', viewKey:'', sceneId:'' });
console.log(JSON.stringify({ ok:true, binding, unbound:true }));
