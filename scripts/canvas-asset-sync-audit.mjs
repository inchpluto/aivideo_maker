import assert from 'node:assert/strict';
import { synchronizeAssetVersions, synchronizeCanvasAssetNodes } from '../shared/assetVersions.mjs';
const project = { id:'canvas-sync', characters:[{ id:'char-1', name:'林夏', imageAsset:'/old.png' }], assets:{ environments:[], props:[] }, shots:[] };
const canvas = { nodes:[{ id:'node-1', type:'image', x:20, y:30, url:'/old.png', assetKind:'character', businessEntityId:'char-1', entityId:'char-1' }] };
const oldState = synchronizeCanvasAssetNodes(project, canvas); assert.equal(oldState.nodes[0].url, '/old.png'); assert.equal(oldState.nodes[0].businessEntityId, 'char-1'); assert(oldState.nodes[0].versionId);
const moved = { ...canvas, nodes:[{ ...canvas.nodes[0], x:820, y:440 }] }; const movedState = synchronizeCanvasAssetNodes(project, moved); assert.equal(movedState.nodes[0].businessEntityId, 'char-1'); assert.equal(movedState.nodes[0].x, 820);
const versionedProject = synchronizeAssetVersions(project); const updated = synchronizeCanvasAssetNodes({ ...versionedProject, characters:[{ ...versionedProject.characters[0], imageAsset:'/new.png' }] }, canvas); assert.equal(updated.nodes[0].url, '/new.png'); assert.equal(updated.nodes[0].businessEntityId, 'char-1'); assert.notEqual(updated.nodes[0].versionId, oldState.nodes[0].versionId); assert.notEqual(updated.nodes[0].assetVersionHash, oldState.nodes[0].assetVersionHash);
console.log(JSON.stringify({ ok:true, entityId:updated.nodes[0].businessEntityId, moved:{x:movedState.nodes[0].x,y:movedState.nodes[0].y}, versions:{old:oldState.nodes[0].versionId,next:updated.nodes[0].versionId} }));
