// index.js -- single catch-all Vercel function for the Midwest AIOS MCP server.
// Routes (all served from the project root via vercel.json rewrite):
//   GET  /.well-known/oauth-protected-resource[/*]   -> Protected Resource Metadata
//   GET  /.well-known/oauth-authorization-server[/*]  -> Authorization Server Metadata
//   POST /register                                    -> OAuth Dynamic Client Registration
//   GET  /authorize                                   -> consent page (asks for access code)
//   POST /authorize                                   -> validate code, mint auth code, redirect to Claude
//   POST /token                                       -> exchange auth code / refresh for access token (PKCE S256)
//   POST /mcp                                         -> MCP JSON-RPC (Bearer required)
//   GET  /  or /mcp                                   -> info / 405
//
// Auth model: stateless, HMAC-signed tokens (no database). A shared secret
// (MCP_ACCESS_SECRET) gates the consent screen so only the owner can authorize.
// claude.ai requires OAuth 2.1 + PKCE for remote connectors; static bearer / URL
// tokens are not supported, which is why this file implements the full flow.
import crypto from 'crypto';
import { TOOLS, callTool } from './_tools.js';

const ACCESS_SECRET = process.env.MCP_ACCESS_SECRET || '';
const JWT_SECRET = process.env.MCP_JWT_SECRET || '';
const SERVER = { name: 'midwest-aios', version: '1.0.0' };
const SUPPORTED_PROTO = ['2025-06-18', '2025-03-26', '2024-11-05'];
const ACCESS_TTL = 60 * 60 * 24 * 30;   // 30 days
const REFRESH_TTL = 60 * 60 * 24 * 180; // 180 days
const CODE_TTL = 600;                   // 10 min

// ---------- low-level http helpers ----------
function origin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}
function pathOf(req) { try { return new URL(req.url, 'http://x').pathname; } catch { return req.url || '/'; } }
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-protocol-version, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, WWW-Authenticate');
}
function sendJson(res, code, obj, extra) { cors(res); if (extra) for (const k in extra) res.setHeader(k, extra[k]); res.setHeader('Content-Type', 'application/json'); res.statusCode = code; res.end(JSON.stringify(obj)); }
function sendHtml(res, code, html) { cors(res); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.statusCode = code; res.end(html); }
function redirect(res, loc) { cors(res); res.statusCode = 302; res.setHeader('Location', loc); res.end(); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) { try { return JSON.parse(req.body); } catch { return parseForm(req.body); } }
  const raw = await new Promise((resolve) => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', () => resolve('')); });
  if (!raw) return {};
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw); } catch { return {}; } }
  return parseForm(raw);
}
function parseForm(raw) { const o = {}; for (const p of String(raw).split('&')) { if (!p) continue; const i = p.indexOf('='); const k = decodeURIComponent(p.slice(0, i).replace(/\+/g, ' ')); const v = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); o[k] = v; } return o; }

// ---------- stateless signed tokens (HMAC-SHA256) ----------
const b64u = buf => Buffer.from(buf).toString('base64url');
function signToken(payload, ttl) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttl };
  const p = b64u(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(p).digest('base64url');
  return p + '.' + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [p, sig] = token.split('.');
  if (!p || !sig) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(p).digest('base64url');
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return null; }
  if (!ok) return null;
  let body; try { body = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch { return null; }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}
function pkceOk(verifier, challenge) {
  if (!verifier || !challenge) return false;
  const h = crypto.createHash('sha256').update(verifier).digest('base64url');
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(challenge)); } catch { return false; }
}
function safeEqStr(a, b) { const A = Buffer.from(String(a)), B = Buffer.from(String(b)); if (A.length !== B.length) return false; try { return crypto.timingSafeEqual(A, B); } catch { return false; } }

// ---------- OAuth metadata ----------
function protectedResourceMeta(o) { return { resource: o + '/mcp', authorization_servers: [o], bearer_methods_supported: ['header'], scopes_supported: ['mcp'] }; }
function authServerMeta(o) {
  return {
    issuer: o,
    authorization_endpoint: o + '/authorize',
    token_endpoint: o + '/token',
    registration_endpoint: o + '/register',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp']
  };
}

// ---------- OAuth: Dynamic Client Registration ----------
async function handleRegister(req, res) {
  const body = await readBody(req);
  const client_id = 'mw-' + crypto.randomBytes(8).toString('hex');
  const redirect_uris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  return sendJson(res, 201, {
    client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'mcp'
  });
}

// ---------- OAuth: authorize ----------
function consentPage(o, params, error) {
  const hidden = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'response_type', 'resource']
    .map(k => `<input type="hidden" name="${k}" value="${escapeHtml(params[k] || '')}">`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Midwest AIOS \u2014 Authorize Claude</title>
<style>body{margin:0;background:#0D0D0D;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#131313;border:1px solid #1f2937;border-radius:16px;padding:32px;max-width:400px;width:90%}
h1{font-size:20px;margin:0 0 4px} .sub{color:#9ca3af;font-size:13px;margin-bottom:20px}
.badge{display:inline-block;background:#0f766e;color:#ccfbf1;font-size:11px;padding:3px 8px;border-radius:999px;margin-bottom:16px;letter-spacing:.05em}
label{display:block;font-size:13px;color:#9ca3af;margin-bottom:6px}
input[type=password]{width:100%;box-sizing:border-box;background:#0b0b0b;border:1px solid #374151;color:#fff;border-radius:10px;padding:12px;font-size:15px}
button{width:100%;margin-top:16px;background:#2dd4bf;color:#062925;border:0;border-radius:10px;padding:13px;font-size:15px;font-weight:600;cursor:pointer}
.err{color:#fca5a5;font-size:13px;margin-top:12px}.foot{color:#6b7280;font-size:11px;margin-top:18px;text-align:center}</style></head>
<body><form class="card" method="POST" action="${o}/authorize">
<div class="badge">MIDWEST AIOS</div>
<h1>Authorize Claude</h1>
<div class="sub">Claude is requesting access to the Midwest AIOS. Enter your access code to allow it to read and update your business data.</div>
<label for="c">Access code</label>
<input id="c" type="password" name="access_code" autocomplete="off" autofocus>
${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
${hidden}
<button type="submit">Allow access</button>
<div class="foot">DYFRENT \u2014 The Art of Business</div>
</form></body></html>`;
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function handleAuthorize(req, res, o) {
  if (req.method === 'GET') {
    const u = new URL(req.url, o);
    const p = Object.fromEntries(u.searchParams.entries());
    if ((p.code_challenge_method || 'S256') !== 'S256') return sendJson(res, 400, { error: 'invalid_request', error_description: 'code_challenge_method must be S256' });
    if (!p.code_challenge) return sendJson(res, 400, { error: 'invalid_request', error_description: 'code_challenge (PKCE) is required' });
    if (!p.redirect_uri) return sendJson(res, 400, { error: 'invalid_request', error_description: 'redirect_uri is required' });
    return sendHtml(res, 200, consentPage(o, p, null));
  }
  // POST -> validate access code, mint authorization code
  const body = await readBody(req);
  if (!ACCESS_SECRET || !safeEqStr(body.access_code || '', ACCESS_SECRET)) {
    return sendHtml(res, 401, consentPage(o, body, 'Incorrect access code. Please try again.'));
  }
  if (!body.redirect_uri || !body.code_challenge) return sendJson(res, 400, { error: 'invalid_request' });
  const code = signToken({ t: 'code', cc: body.code_challenge, ru: body.redirect_uri, cid: body.client_id || '', scope: body.scope || 'mcp' }, CODE_TTL);
  const sep = body.redirect_uri.includes('?') ? '&' : '?';
  let loc = body.redirect_uri + sep + 'code=' + encodeURIComponent(code);
  if (body.state) loc += '&state=' + encodeURIComponent(body.state);
  return redirect(res, loc);
}

// ---------- OAuth: token ----------
async function handleToken(req, res) {
  const body = await readBody(req);
  const grant = body.grant_type;
  if (grant === 'authorization_code') {
    const c = verifyToken(body.code);
    if (!c || c.t !== 'code') return sendJson(res, 400, { error: 'invalid_grant', error_description: 'bad or expired authorization code' });
    if (c.ru && body.redirect_uri && c.ru !== body.redirect_uri) return sendJson(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    if (!pkceOk(body.code_verifier, c.cc)) return sendJson(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
    const access = signToken({ t: 'access', sub: 'owner', scope: c.scope || 'mcp' }, ACCESS_TTL);
    const refresh = signToken({ t: 'refresh', sub: 'owner', scope: c.scope || 'mcp' }, REFRESH_TTL);
    return sendJson(res, 200, { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, refresh_token: refresh, scope: c.scope || 'mcp' });
  }
  if (grant === 'refresh_token') {
    const rt = verifyToken(body.refresh_token);
    if (!rt || rt.t !== 'refresh') return sendJson(res, 400, { error: 'invalid_grant', error_description: 'bad or expired refresh token' });
    const access = signToken({ t: 'access', sub: 'owner', scope: rt.scope || 'mcp' }, ACCESS_TTL);
    const refresh = signToken({ t: 'refresh', sub: 'owner', scope: rt.scope || 'mcp' }, REFRESH_TTL);
    return sendJson(res, 200, { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL, refresh_token: refresh, scope: rt.scope || 'mcp' });
  }
  return sendJson(res, 400, { error: 'unsupported_grant_type' });
}

// ---------- MCP JSON-RPC ----------
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function handleRpc(msg) {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    const want = params && params.protocolVersion;
    const proto = SUPPORTED_PROTO.includes(want) ? want : SUPPORTED_PROTO[0];
    return rpcResult(id, { protocolVersion: proto, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: 'Tools for the Midwest Educational Furnishings AIOS: jobs, line items, customers, vendors, reps, deliveries, and receivables. Call business_summary first for an overview.' });
  }
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations })) });
  if (method === 'tools/call') {
    const name = params && params.name;
    try {
      const data = await callTool(name, (params && params.arguments) || {});
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false });
    } catch (e) {
      return rpcResult(id, { content: [{ type: 'text', text: 'Error: ' + (e && e.message ? e.message : String(e)) }], isError: true });
    }
  }
  return rpcError(id === undefined ? null : id, -32601, 'Method not found: ' + method);
}

async function handleMcp(req, res, o) {
  // Bearer required
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const claims = verifyToken(token);
  if (!claims || claims.t !== 'access') {
    cors(res);
    res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${o}/.well-known/oauth-protected-resource"`);
    return sendJson(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Authorization required' } });
  }
  if (req.method === 'GET') { cors(res); res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(); } // no server-initiated SSE
  const body = await readBody(req);
  if (Array.isArray(body)) {
    const out = [];
    for (const m of body) { if (m && m.id === undefined && String(m.method || '').startsWith('notifications/')) continue; out.push(await handleRpc(m)); }
    if (!out.length) { res.statusCode = 202; cors(res); return res.end(); }
    return sendJson(res, 200, out);
  }
  // notifications (no id) -> 202 Accepted, no body
  if (body && body.id === undefined && String(body.method || '').startsWith('notifications/')) { cors(res); res.statusCode = 202; return res.end(); }
  const result = await handleRpc(body);
  return sendJson(res, 200, result);
}

// ---------- main ----------
export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') { cors(res); res.statusCode = 204; return res.end(); }
    const o = origin(req);
    const path = pathOf(req);

    if (path.startsWith('/.well-known/oauth-protected-resource')) return sendJson(res, 200, protectedResourceMeta(o));
    if (path.startsWith('/.well-known/oauth-authorization-server') || path.startsWith('/.well-known/openid-configuration')) return sendJson(res, 200, authServerMeta(o));
    if (path === '/register') { if (req.method !== 'POST') { res.statusCode = 405; return res.end(); } return handleRegister(req, res); }
    if (path === '/authorize') return handleAuthorize(req, res, o);
    if (path === '/token') { if (req.method !== 'POST') { res.statusCode = 405; return res.end(); } return handleToken(req, res); }
    if (path === '/mcp' || path === '/') {
      if (path === '/' && req.method === 'GET') return sendHtml(res, 200, '<!doctype html><meta charset="utf-8"><title>Midwest AIOS MCP</title><body style="font-family:system-ui;background:#0D0D0D;color:#e5e7eb;padding:40px"><h2>Midwest AIOS MCP server</h2><p>This is an MCP endpoint for Claude. Add it as a custom connector using the URL ending in <code>/mcp</code>.</p><p style="color:#6b7280">DYFRENT \u2014 The Art of Business</p></body>');
      return handleMcp(req, res, o);
    }
    return sendJson(res, 404, { error: 'not_found', path });
  } catch (e) {
    return sendJson(res, 500, { error: 'server_error', message: e && e.message ? e.message : String(e) });
  }
}
