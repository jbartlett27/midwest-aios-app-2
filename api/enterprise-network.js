// The DYFRENT Network inside Midwest (Midwest issue 3, DYFRENT issue 1382).
//
// Midwest's Profile, Network and Messages tabs show J's actual DYFRENT pages in a frame. The frame never holds a
// key, a token or a session: it asks this page, this page asks this server, and this server signs each call for the
// person who is signed in here and sends it to DYFRENT. Nothing from Midwest's own records (jobs, customers, quotes,
// bills, finances) is ever read or sent here; only the network call the person made.
//
// ops (POST JSON, same origin only):
//   status  { user }              is this Midwest login on the pilot list, and does it have a verified session here
//   login   { username, password } checks the same username and password as the Midwest sign-in, and sets an HttpOnly
//                                 signed session cookie (12 hours). Only pilot logins get one; for everyone else
//                                 nothing changes.
//   logout                        clears the session cookie
//   hello                         who the signed-in person is on the Network (DYFRENT answers from its own records)
//   call    { route, body }       one Network or Profile call from the frame: route net_team or profile_team
//
// Settings (server only, never in the browser): ENTERPRISE_NETWORK_PREVIEW=on, ENTERPRISE_INSTALLATION_ID,
// ENTERPRISE_BROKER_KEY (shared with DYFRENT), ENTERPRISE_SESSION_KEY (this server's own), ENTERPRISE_PILOT_USERS
// (Midwest users.id, comma separated), ENTERPRISE_APP_ORIGIN (https://midwestaios.com), ENTERPRISE_NETWORK_ENDPOINT
// (https://www.dyfrent.app/api/mcp?s=enterprise).
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SB = 'https://kogjthgceejpzxnekprr.supabase.co/rest/v1';
// The same public key the Midwest app uses in the browser (src/supabase.js): the sign-in check here reads exactly
// what the sign-in screen reads, so the same username and password work.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';
const COOKIE = 'mw_net';
const SESSION_MS = 12 * 60 * 60 * 1000;
const VERSION = 'dyfrent.enterprise/1';
const NET_OP = /^net_[a-z0-9_]{1,40}$/, PROFILE_OP = /^profile_[a-z0-9_]{1,40}$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const b64 = s => Buffer.from(s).toString('base64url');
const same = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && timingSafeEqual(x, y); };

export function pilotList(env) {
  return String(env.ENTERPRISE_PILOT_USERS || '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9_.:@-]{1,128}$/.test(s));
}
export function sealSession(env, user, now) {
  const body = b64(JSON.stringify({ u: user.id, n: String(user.name || '').slice(0, 80), e: now + SESSION_MS }));
  return body + '.' + createHmac('sha256', env.ENTERPRISE_SESSION_KEY).update(body).digest('base64url');
}
export function openSession(env, cookieHeader, now) {
  const key = String(env.ENTERPRISE_SESSION_KEY || '');
  if (key.length < 32) return null;
  const m = String(cookieHeader || '').split(/;\s*/).map(c => c.split('=')).find(([k]) => k === COOKIE);
  if (!m) return null;
  const [body, sig] = String(m.slice(1).join('=')).split('.');
  if (!body || !sig || !same(sig, createHmac('sha256', key).update(body).digest('base64url'))) return null;
  let s; try { s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!plain(s) || typeof s.u !== 'string' || !Number.isFinite(s.e) || s.e <= now) return null;
  return { id: s.u, name: String(s.n || '') };
}
const cookie = (value, maxAge) => COOKIE + '=' + value + '; Path=/api/enterprise-network; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge;

// One signed call to DYFRENT. request: { subject, name, kind, op?, payload? }
export async function signedCall(env, request, fetcher, now) {
  const envelope = { installation: env.ENTERPRISE_INSTALLATION_ID, nonce: randomBytes(24).toString('hex'), issued_at: new Date(now).toISOString(), request };
  const hash = createHash('sha256').update(JSON.stringify(envelope.request)).digest('hex');
  const signature = createHmac('sha256', env.ENTERPRISE_BROKER_KEY).update([VERSION, envelope.installation, envelope.nonce, envelope.issued_at, hash].join('\n')).digest('hex');
  const r = await fetcher(env.ENTERPRISE_NETWORK_ENDPOINT, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', 'X-Enterprise-Signature': signature }, body: JSON.stringify(envelope) });
  let body = {}; try { body = await r.json(); } catch (e) { body = {}; }
  return { status: r.status, body: plain(body) ? body : {} };
}

export function configured(env) {
  let end; try { end = new URL(String(env.ENTERPRISE_NETWORK_ENDPOINT || '')); } catch (e) { return false; }
  return env.ENTERPRISE_NETWORK_PREVIEW === 'on' && end.protocol === 'https:' && !end.username && !end.password
    && /^[a-z0-9][a-z0-9-]{2,62}$/.test(String(env.ENTERPRISE_INSTALLATION_ID || ''))
    && String(env.ENTERPRISE_BROKER_KEY || '').length >= 32 && String(env.ENTERPRISE_SESSION_KEY || '').length >= 32
    && /^https:\/\/[a-z0-9.-]+$/.test(String(env.ENTERPRISE_APP_ORIGIN || ''));
}

export function enterpriseBroker(env, deps = {}) {
  const fetcher = deps.fetch || fetch;
  const clock = deps.now || (() => Date.now());
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const say = (status, body) => res.status(status).json(body);
    if (req.method !== 'POST') return say(405, { ok: false, error: 'Use POST.' });
    if (!configured(env)) return say(200, { ok: false, code: 'closed', pilot: false });
    // Same origin only: a page on any other site can never ask this server for anything.
    if (String((req.headers && req.headers.origin) || '') !== env.ENTERPRISE_APP_ORIGIN) return say(403, { ok: false, error: 'Open the Network from your Midwest dashboard.' });
    let b = req.body;
    try { if (typeof b === 'string') b = JSON.parse(b); } catch (e) { return say(400, { ok: false, error: 'That request could not be read.' }); }
    if (!plain(b)) return say(400, { ok: false, error: 'That request could not be read.' });
    const now = clock();
    const pilot = pilotList(env);
    const op = String(b.op || '');

    if (op === 'status') {
      const s = openSession(env, req.headers.cookie, now);
      const who = String(b.user || '');
      return say(200, { ok: true, pilot: pilot.includes(who), session: !!(s && s.id === who && pilot.includes(s.id)) });
    }
    if (op === 'logout') { res.setHeader('Set-Cookie', cookie('', 0)); return say(200, { ok: true }); }
    if (op === 'login') {
      const username = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
      if (!username || !password || username.length > 80 || password.length > 200) return say(400, { ok: false, error: 'Enter your username and password.' });
      let rows = [];
      try {
        const r = await fetcher(SB + '/users?username=eq.' + encodeURIComponent(username) + '&password=eq.' + encodeURIComponent(password) + '&select=id,name,role&limit=1',
          { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }, signal: AbortSignal.timeout(8000) });
        rows = r.ok ? await r.json() : [];
      } catch (e) { return say(503, { ok: false, error: 'The sign-in check could not finish. Try again.' }); }
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u || typeof u.id !== 'string') return say(401, { ok: false, error: 'That username and password did not match.' });
      if (!pilot.includes(u.id)) return say(200, { ok: false, pilot: false });
      res.setHeader('Set-Cookie', cookie(sealSession(env, u, now), SESSION_MS / 1000));
      return say(200, { ok: true, pilot: true });
    }

    const s = openSession(env, req.headers.cookie, now);
    if (!s || !pilot.includes(s.id)) return say(401, { ok: false, code: 'signin', error: 'Confirm your password to open the Network.' });
    try {
      if (op === 'hello') {
        const out = await signedCall(env, { subject: s.id, name: s.name, kind: 'session' }, fetcher, now);
        if (out.status !== 200 || out.body.ok !== true || !plain(out.body.member)) return say(out.status === 200 ? 403 : out.status, { ok: false, code: out.body.code || 'unavailable', error: out.body.error || 'The Network could not answer just now.' });
        return say(200, { ok: true, member: { name: String(out.body.member.name || s.name), role: out.body.member.role === 'admin' ? 'admin' : 'member', key: createHash('sha256').update('mw:' + s.id).digest('hex').slice(0, 16) } });
      }
      if (op === 'call') {
        const route = String(b.route || ''), body = plain(b.body) ? b.body : null;
        const kind = route === 'net_team' ? 'net' : route === 'profile_team' ? 'profile' : '';
        const inner = kind && body ? String(body[kind] || '') : '';
        if (!kind || !(kind === 'net' ? NET_OP : PROFILE_OP).test(inner)) return say(400, { ok: false, error: 'That part of the Network is not open here.' });
        const payload = { ...body }; delete payload[kind]; delete payload.op;
        if (Buffer.byteLength(JSON.stringify(payload)) > 48000) return say(413, { ok: false, error: 'That is too large to send.' });
        const out = await signedCall(env, { subject: s.id, name: s.name, kind, op: inner, payload }, fetcher, now);
        return say(out.status, out.body);
      }
    } catch (e) { return say(503, { ok: false, error: 'The Network could not answer just now. Try again.' }); }
    return say(400, { ok: false, error: 'Unknown request.' });
  };
}

export default function handler(req, res) { return enterpriseBroker(process.env)(req, res); }
