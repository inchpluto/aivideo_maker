import assert from 'node:assert/strict';
import { uploadProjectMedia } from '../src/workflow.js';

const originalFetch = globalThis.fetch;
const file = new Blob([new Uint8Array(10_000_000)], { type: 'video/mp4' });
let serverOffset = 0; let failedOnce = false; const requests = [];
globalThis.fetch = async (url, options = {}) => {
  if (!options.method || options.method === 'GET') return new globalThis.Response(JSON.stringify({ ok: true, nextOffset: serverOffset, complete: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const range = String(options.headers?.['Content-Range'] || ''); const match = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/); assert(match, `缺少 Content-Range：${range}`);
  const start = Number(match[1]); const end = Number(match[2]); const total = Number(match[3]); requests.push({ url, range, bodyIsBlob: options.body instanceof Blob }); assert.equal(start, serverOffset); serverOffset = end + 1;
  if (!failedOnce) { failedOnce = true; throw new Error('模拟连接中断'); }
  return new globalThis.Response(JSON.stringify({ ok: true, complete: serverOffset === total, nextOffset: serverOffset, asset: { url: '/api/assets/uploaded.mp4', probeStatus: 'passed' } }), { status: serverOffset === total ? 201 : 200, headers: { 'Content-Type': 'application/json' } });
};
try {
  const asset = await uploadProjectMedia('client-upload-audit', file, 'chunked');
  assert.equal(asset.probeStatus, 'passed'); assert.equal(requests.length, 2); assert.equal(requests[0].bodyIsBlob, true); assert.equal(requests[1].bodyIsBlob, true); assert.equal(serverOffset, file.size); assert.match(requests[0].range, /^bytes 0-7999999\/10000000$/); assert.match(requests[1].range, /^bytes 8000000-9999999\/10000000$/);
  console.log(JSON.stringify({ ok: true, chunks: requests.length, retryAfterDisconnect: true, contentRange: true, blobBody: true, finalAsset: true }));
} finally { globalThis.fetch = originalFetch; }
