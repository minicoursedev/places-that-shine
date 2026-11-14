export const CONFIG = {
  DESIGNERS_URL: '/data/oshen-designers.json',
  DEV_TOOLS: typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname),
};

export const browserOrigin = () => typeof location === 'undefined' ? 'https://localhost' : location.origin;

export function resolveAsset(value, baseUrl = CONFIG.DESIGNERS_URL) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const base = new URL(baseUrl, browserOrigin());
    const url = new URL(value, base);
    if (url.username || url.password) return '';
    if (url.origin === base.origin && ['https:', 'http:'].includes(url.protocol)) {
      return url.pathname + url.search + url.hash;
    }
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
