const DEMO_MARKERS = /(?:^|[-_:/])(?:demo|mock|simulated|placeholder|sample)(?:[-_:/]|$)/i;

export function isDemoMedia(media = {}) {
  const values = [media.status, media.mode, media.sourceType, media.provider, media.url, media.videoUrl, media.mediaUrl];
  return media.simulated === true || values.some(value => DEMO_MARKERS.test(String(value || '')));
}

export function isVerifiedMedia(media = {}, field = 'videoUrl') {
  const url = media?.[field];
  return Boolean(String(url || '').trim()) && !isDemoMedia({ ...media, url }) && media.probeStatus === 'passed';
}

export function mediaReadiness(media = {}, field = 'videoUrl') {
  const url = String(media?.[field] || '').trim();
  if (!url) return { ready: false, code: 'MISSING_URL', message: '缺少媒体地址。' };
  if (isDemoMedia({ ...media, url })) return { ready: false, code: 'DEMO_MEDIA', message: '演示/模拟媒体不能作为真实交付素材。' };
  if (media.probeStatus !== 'passed') return { ready: false, code: media.probeStatus === 'failed' ? 'PROBE_FAILED' : 'NOT_PROBED', message: media.probeStatus === 'failed' ? '媒体探测失败。' : '媒体尚未通过文件探测。' };
  return { ready: true, code: 'READY', message: '' };
}
