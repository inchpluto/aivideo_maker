import { randomUUID } from 'node:crypto';

const safeIdentifier = value => {
  const text = String(value || '');
  return /^[a-zA-Z0-9_-]{1,160}$/.test(text) ? text : '';
};

export function createDiagnostics({ limit = 300 } = {}) {
  const entries = [];
  return {
    requestId: () => randomUUID(),
    record(entry = {}) {
      entries.push({
        timestamp: new Date().toISOString(),
        requestId: safeIdentifier(entry.requestId) || String(entry.requestId || '').slice(0, 80),
        method: String(entry.method || '').slice(0, 12),
        path: String(entry.path || '').split('?')[0].slice(0, 240),
        status: Number(entry.status) || 0,
        durationMs: Math.max(0, Number(entry.durationMs) || 0),
        projectId: safeIdentifier(entry.projectId),
        jobId: safeIdentifier(entry.jobId),
        errorCode: String(entry.errorCode || '').replace(/[^A-Z0-9_-]/gi, '').slice(0, 80),
      });
      while (entries.length > limit) entries.shift();
    },
    recent(count = 100) {
      return entries.slice(-Math.max(1, Math.min(100, Number(count) || 100)));
    },
    clear() {
      entries.length = 0;
    },
  };
}
