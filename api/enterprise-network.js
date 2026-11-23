// Gated BFF for the shared Network. The existing browser user record is never identity.
import { createHash, createHmac, randomBytes } from 'node:crypto';

const ACTIONS = new Set(['profile_me', 'profile_get', 'profile_update', 'net_overview', 'net_directory',
  'net_profile', 'net_request', 'net_respond', 'net_thread', 'net_send', 'net_threads', 'net_messages']);
export function enterpriseBroker(env, fetcher = fetch, now = () => Date.now()) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const fail = (status, code, error) => res.status(status).json({ ok: false, code, error });
    if (req.method !== 'POST') return fail(405, 'method', 'Use POST.');
    if (env.ENTERPRISE_NETWORK_PREVIEW !== 'on') return fail(403, 'preview_closed', 'The enterprise Network preview is closed.');
    // Exact host origin is server-configured. No reflected host or CORS wildcard.
    if (!env.ENTERPRISE_APP_ORIGIN || req.headers.origin !== env.ENTERPRISE_APP_ORIGIN) {
      return fail(403, 'origin', 'Open the Network from your company dashboard.');
    }
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token || token.length > 16384) return fail(401, 'identity_required', 'A verified individual sign-in is required.');
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return fail(400, 'invalid_request', 'The Network request could not be read.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 32768 ||
        Object.keys(body).some(k => !['op', 'action', 'payload', 'request_id'].includes(k)) ||
        (body.request_id !== undefined && !/^[A-Za-z0-9_-]{1,80}$/.test(body.request_id)) ||
        !['session', 'call'].includes(body.op) ||
        (body.op === 'call' && (!ACTIONS.has(body.action) || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)))) {
      return fail(400, 'invalid_request', 'That Network action is unavailable.');
    }
    const installation = env.ENTERPRISE_INSTALLATION_ID;
    const secret = env.ENTERPRISE_BROKER_KEY;
    let endpoint;
    try {
      endpoint = new URL(env.ENTERPRISE_NETWORK_ENDPOINT);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
          endpoint.pathname !== '/api/enterprise-network' || !/^[a-z0-9.-]+$/.test(endpoint.hostname) || endpoint.port) throw new Error();
    } catch { return fail(503, 'configuration', 'The enterprise Network connection is awaiting setup.'); }
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(installation || '') || typeof secret !== 'string' || secret.length < 32) {
      return fail(503, 'configuration', 'The enterprise Network connection is awaiting setup.');
    }
    const envelope = {
      installation, nonce: randomBytes(24).toString('hex'), issued_at: new Date(now()).toISOString(),
      request: { token, action: body.op === 'session' ? 'session' : body.action, payload: body.op === 'session' ? {} : body.payload,
        ...(body.request_id ? { request_id: body.request_id } : {}) },
    };
    const hash = createHash('sha256').update(JSON.stringify(envelope.request)).digest('hex');
    const signature = createHmac('sha256', secret).update(['dyfrent.enterprise/1', installation, envelope.nonce, envelope.issued_at, hash].join('\n')).digest('hex');
    try {
      const response = await fetcher(endpoint.href, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'X-Enterprise-Signature': signature }, body: JSON.stringify(envelope),
      });
      const result = await response.json();
      // Never forward a credential or arbitrary hub URL to the iframe host.
      if (body.op === 'session' && response.ok && result.ok) {
        return fail(503, 'source_adapter_pending', 'Your identity was verified. The shared Profile, Network and Messages adapter is still in review.');
      }
      return res.status(response.status).json(result);
    } catch { return fail(503, 'network_unavailable', 'The shared Network could not answer. Try again.'); }
  };
}
export default enterpriseBroker(process.env);
