export const ENTERPRISE_VERSION = 1;
export const ENTERPRISE_TABS = Object.freeze(['profile', 'network', 'messages']);
export const ENTERPRISE_ACTIONS = Object.freeze(['profile_me', 'profile_get', 'profile_update', 'net_overview', 'net_directory', 'net_profile', 'net_request', 'net_respond', 'net_thread', 'net_send', 'net_threads', 'net_messages']);

export function enterpriseRpc(data) {
  if (!data || typeof data.request_id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(data.request_id) ||
      !ENTERPRISE_ACTIONS.includes(data.action) || !data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)) return false;
  try { return JSON.stringify(data.payload).length <= 32768; } catch { return false; }
}

export function enterpriseFrameUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/enterprise') return null;
    return url;
  } catch {
    return null;
  }
}

export function enterpriseMessage(event, frame, origin, nonce, expectedType) {
  const data = event && event.data;
  return Boolean(frame && event.source === frame && event.origin === origin && data &&
    data.version === ENTERPRISE_VERSION && data.nonce === nonce && data.type === expectedType);
}

export function enterpriseSession(value, now = Date.now()) {
  const frame = enterpriseFrameUrl(value && value.ui_url);
  const expires = Date.parse(value && value.expires_at);
  if (!value || value.ok !== true || !frame || typeof value.session_id !== 'string' || !value.session_id ||
      !value.member || typeof value.member.id !== 'string' || !value.member.id ||
      !Number.isFinite(expires) || expires <= now || expires > now + 5 * 60 * 1000) return null;
  return { ...value, frame, expires };
}

export function selectedShare(description, screenLabel, includeScreen, files) {
  const text = String(description || '').trim();
  if (!text || text.length > 4000) throw new Error('Describe what you want to ask Jarvis in 4,000 characters or fewer.');
  const chosen = Array.from(files || []);
  if (chosen.length > 4 || chosen.some(file => !file || !Number.isFinite(file.size) || file.size < 0 || file.size > 10 * 1024 * 1024)) {
    throw new Error('Choose up to four attachments, each 10 MB or smaller.');
  }
  return { description: text, screen: includeScreen ? String(screenLabel || '').slice(0, 160) : '', attachments: chosen };
}
