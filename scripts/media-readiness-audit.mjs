import assert from 'node:assert/strict';
import { isVerifiedMedia, mediaReadiness } from '../shared/mediaReadiness.mjs';

assert.equal(isVerifiedMedia({ videoUrl: '/shot.mp4', status: 'generated', probeStatus: 'passed' }), true);
assert.equal(isVerifiedMedia({ videoUrl: '/shot.mp4', status: 'simulated', probeStatus: 'passed' }), false);
assert.equal(mediaReadiness({ videoUrl: '/demo-shot.mp4', status: 'generated', probeStatus: 'passed' }).code, 'DEMO_MEDIA');
assert.equal(mediaReadiness({ videoUrl: '/shot.mp4', status: 'generated' }).code, 'NOT_PROBED');
assert.equal(mediaReadiness({ status: 'generated' }).code, 'MISSING_URL');
console.log(JSON.stringify({ ok: true, verified: 1, rejected: ['simulated', 'demo', 'not-probed', 'missing-url'] }));
