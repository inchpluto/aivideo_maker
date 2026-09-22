export class ProviderError extends Error {
  constructor(message, { provider = '', model = '', status = 0, retryAfterMs = 0, retryable = false, needsReconcile = false, providerCode = '', detail = '', cause } = {}) {
    super(message, cause ? { cause } : undefined); this.name='ProviderError'; this.provider=provider; this.model=model; this.status=Number(status)||0; this.retryAfterMs=Math.max(0,Number(retryAfterMs)||0); this.retryable=Boolean(retryable); this.needsReconcile=Boolean(needsReconcile); this.providerCode=String(providerCode||'').slice(0,120); this.detail=String(detail||'').slice(0,500); this.code=this.needsReconcile?'NEEDS_RECONCILE':this.retryable?'PROVIDER_RETRYABLE':`PROVIDER_HTTP_${this.status||'UNKNOWN'}`;
  }
}

export function retryAfterMs(headers) { const value=headers?.get?.('retry-after') || headers?.['retry-after']; if (!value) return 0; const seconds=Number(value); if (Number.isFinite(seconds)) return Math.max(0,seconds*1000); const date=Date.parse(value); return Number.isFinite(date)?Math.max(0,date-Date.now()):0; }

function redactedText(value) { return String(value||'').replace(/Bearer\s+[^\s,;]+/gi,'Bearer [REDACTED]').replace(/(api[_-]?key|access[_-]?token|secret)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]').slice(0,500); }

function errorBodyDetails(body) {
  if (!body || typeof body !== 'object') return { message: redactedText(body), providerCode: '' };
  const error = body.error && typeof body.error === 'object' ? body.error : body;
  const message = error.message || error.detail || error.error_description || body.message || body.detail || (typeof body.error === 'string' ? body.error : '');
  const providerCode = error.code || error.type || error.status || body.code || body.type || '';
  return { message: redactedText(message), providerCode: String(providerCode||'').slice(0,120) };
}

export function normalizeProviderError(error, { provider = '', model = '', task = '' } = {}) {
  if (error instanceof ProviderError) return error;
  const message=redactedText(error?.message||error||'供应商请求失败'); const status=Number(error?.status||error?.statusCode||error?.response?.status||error?.response?.statusCode||error?.error?.status||message.match(/\b([1-5]\d{2})\b/)?.[1]||0); const retryable=Boolean(error?.retryable)||status===429||status>=500||/429|rate.?limit|temporar|timeout|timed out|ECONNRESET/i.test(message); const needsReconcile=Boolean(error?.needsReconcile)||(task==='video'&&/network|fetch failed|timeout|timed out|受理|下载失败/i.test(message));
  const providerCode=error?.providerCode||error?.error?.code||error?.code||''; const retryHeader=error?.headers||error?.response?.headers; return new ProviderError(message,{provider,model,status,retryAfterMs:error?.retryAfterMs||error?.retryAfter||retryAfterMs(retryHeader),providerCode,retryable:retryable&&!needsReconcile,needsReconcile,cause:error});
}

export async function requireProviderResponse(response, context = {}) {
  if (response.ok) return response;
  const raw=(await response.text().catch(()=>'' )).slice(0,2000); let parsed=null; try { parsed=raw?JSON.parse(raw):null; } catch { /* plain text is handled below */ }
  const details=errorBodyDetails(parsed||raw); const status=Number(response.status)||0; const retryable=status===429||status>=500; const message=details.message?`${context.provider||'供应商'} HTTP ${status}：${details.message}`:`${context.provider||'供应商'} HTTP ${status}`;
  throw new ProviderError(message,{...context,status,retryAfterMs:retryAfterMs(response.headers),providerCode:details.providerCode,detail:details.message,retryable});
}
