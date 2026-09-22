import assert from 'node:assert/strict';

let requests = 0;
globalThis.localStorage = { setItem() { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }, getItem() { return null; }, removeItem() {} };
globalThis.fetch = async () => { requests += 1; return { ok: true, json: async () => ({ project: { id: 'project-quota' }, revision: 2 }) }; };
const { syncProject } = await import('../src/workflow.js');
const result = await syncProject({ id: 'project-quota', title: 'quota regression' });
assert.equal(requests, 1, 'localStorage 配额错误不能阻断服务端保存');
assert.equal(result.mode, 'server');
assert.equal(result.localStorage, false);
console.log(JSON.stringify({ ok: true, requests, mode: result.mode, localStorage: result.localStorage }));
