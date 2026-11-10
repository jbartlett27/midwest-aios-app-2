// Vendor catalogues >> the two jobs a browser cannot do on its own.
//
// action "fetch": a vendor's catalogue link. Browsers cannot download a PDF from another company's website
// (the site does not allow it), so this downloads it here and saves it to storage in pieces of about 40 MB
// (storage refuses one file over about 50 MB, and a function cannot hand back more than a few MB). The
// browser then downloads the pieces, joins them and reads the PDF exactly like an uploaded file. A link to a
// web page instead of a PDF answers with the PDF links found on that page so the user can pick one.
// action "clear": empties the temporary pieces once the catalogue is loaded.
// action "products": names the products on catalogue pages that print no model code (lookbooks). The
// browser checks every name against the page text before it keeps it, so nothing unprinted gets in.
//
// Pure fetch, no packages, the same storage access the browser already has.
import dns from 'node:dns';
import net from 'node:net';

// Same public anon key the browser and api/task-reminders.js use.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';
const STORAGE = 'https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/';
const BUCKET = 'vendor-invoices';
const PART_BYTES = 40 * 1000 * 1000;
const MAX_BYTES = 600 * 1000 * 1000;
const TIME_BUDGET_MS = 270 * 1000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const fail = (res, code, msg) => res.status(code).json({ error: msg });
const okVendor = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
const okToken = (t) => typeof t === 'string' && /^[a-z0-9]{8,32}$/.test(t);

// ---------- links ----------
// Share links that hide the file behind a viewer page are turned into their direct download form.
export function directLink(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.toLowerCase();
  if (h === 'drive.google.com' || h === 'docs.google.com') {
    const m = /\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(u.pathname) || (u.searchParams.get('id') ? [0, u.searchParams.get('id')] : null);
    if (m) return 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(m[1]) + '&export=download&confirm=t';
  }
  if (h === 'www.dropbox.com' || h === 'dropbox.com') { u.searchParams.set('dl', '1'); return u.toString(); }
  return u.toString();
}

export function privateAddress(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    const p = ip.split('.').map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 192 && p[1] === 0 && p[2] === 0) || (p[0] === 198 && (p[1] === 18 || p[1] === 19));
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return privateAddress(mapped[1]);
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s);
  }
  return true;
}

async function safeUrl(u) {
  let url;
  try { url = new URL(u); } catch { throw new Error('That is not a web link.'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http and https links can be read.');
  if (url.username || url.password) throw new Error('Links with a user name or password cannot be read.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new Error('That link uses an unusual port and cannot be read.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$/i.test(host) || /\.(local|internal|localhost)$/i.test(host)) throw new Error('That link points inside a private network.');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.promises.lookup(host, { all: true }).catch(() => { throw new Error('That web address could not be found.'); });
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) throw new Error('That link points inside a private network.');
  return url;
}

// follows up to 6 redirects, checking every hop
async function open(link, signal) {
  let cur = link;
  for (let hop = 0; hop < 7; hop++) {
    const url = await safeUrl(cur);
    const r = await fetch(url, { redirect: 'manual', signal, headers: { 'User-Agent': UA, Accept: 'application/pdf,text/html;q=0.9,*/*;q=0.8' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { cur = new URL(r.headers.get('location'), url).toString(); try { await r.body?.cancel(); } catch {} continue; }
    return { r, url };
  }
  throw new Error('That link redirects too many times.');
}

const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
export function pdfLinksInHtml(html, base) {
  const out = [];
  const seen = new Set();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 25) {
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
    if (!href) continue;
    let abs;
    try { abs = new URL(decode(href[2] ?? href[3] ?? href[4] ?? ''), base); } catch { continue; }
    if (!/^https?:$/.test(abs.protocol) || !/\.pdf$/i.test(abs.pathname)) continue;
    abs.hash = '';
    const k = abs.toString();
    if (seen.has(k)) continue;
    seen.add(k);
    const text = decode(m[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 100);
    out.push({ url: k, text: text || decodeURIComponent(abs.pathname.split('/').pop() || '') });
  }
  return out;
}

async function put(path, body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
  let last = '';
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(STORAGE + BUCKET + '/' + path, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'x-upsert': 'true', 'Content-Type': 'application/octet-stream' }, body });
      if (r.ok) return STORAGE + 'public/' + BUCKET + '/' + path;
      last = 'HTTP ' + r.status;
    } catch (e) { last = (e && e.message) || 'network'; }
    await new Promise((s) => setTimeout(s, 600 * (i + 1)));
  }
  throw new Error('Could not save the download (' + last + ').');
}

async function fetchCatalog(req, res) {
  const { url, vendorId } = req.body || {};
  if (!okVendor(vendorId)) return fail(res, 400, 'Pick a vendor first.');
  const link = directLink(url);
  if (!link) return fail(res, 400, 'Paste the full link, starting with https://');
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIME_BUDGET_MS);
  try {
    const { r, url: finalUrl } = await open(link, ctl.signal);
    if (!r.ok) return fail(res, 400, 'The vendor site answered ' + r.status + ' for that link. Check that it opens in your browser.');
    const type = String(r.headers.get('content-type') || '').toLowerCase();
    const rdr = r.body.getReader();
    let first = await rdr.read();
    const head = first.value ? Buffer.from(first.value.subarray(0, 1024)).toString('latin1') : '';
    if (!/%PDF-/.test(head)) {
      if (/html/.test(type) || /<(!doctype|html|head|body)\b/i.test(head)) {
        const parts = [];
        let size = 0;
        while (!first.done && size < 3e6) { parts.push(Buffer.from(first.value)); size += first.value.length; first = await rdr.read(); }
        try { await rdr.cancel(); } catch {}
        const html = Buffer.concat(parts).toString('utf8');
        const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [0, ''])[1]).replace(/\s+/g, ' ').trim().slice(0, 120);
        const links = pdfLinksInHtml(html, finalUrl);
        if (!links.length) return fail(res, 400, 'That link opens a web page, not a PDF, and the page has no PDF link on it. Many vendors show their catalogue in an online viewer: look for a Download or PDF button there, then paste that link or upload the file.');
        return res.status(200).json({ kind: 'links', title, page: finalUrl.toString(), links });
      }
      try { await rdr.cancel(); } catch {}
      return fail(res, 400, 'That link is not a PDF (' + (type || 'unknown type') + '). Paste a link to the catalogue PDF or upload the file.');
    }
    const token = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);
    const base = 'catalogs/' + vendorId + '/_incoming/' + token + '/';
    const urls = [];
    let buf = [];
    let bufLen = 0;
    let total = 0;
    const flush = async () => { if (!bufLen) return; urls.push(await put(base + 'part-' + (urls.length + 1) + '.bin', Buffer.concat(buf, bufLen))); buf = []; bufLen = 0; };
    while (!first.done) {
      const v = Buffer.from(first.value);
      total += v.length;
      if (total > MAX_BYTES) throw new Error('That PDF is over ' + (MAX_BYTES / 1e6) + ' MB. Download it and upload the file instead.');
      let off = 0;
      while (off < v.length) {
        const take = Math.min(PART_BYTES - bufLen, v.length - off);
        buf.push(v.subarray(off, off + take)); bufLen += take; off += take;
        if (bufLen >= PART_BYTES) await flush();
      }
      first = await rdr.read();
    }
    await flush();
    const name = decodeURIComponent((finalUrl.pathname.split('/').pop() || '')).replace(/[^\w .()-]+/g, ' ').trim() || 'catalogue.pdf';
    return res.status(200).json({ kind: 'pdf', name: /\.pdf$/i.test(name) ? name : name + '.pdf', bytes: total, parts: urls, token, source: finalUrl.toString(), seconds: Math.round((Date.now() - t0) / 1000) });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'The vendor site took too long to send the PDF. Download it and upload the file instead.' : String((e && e.message) || e);
    return fail(res, 400, msg);
  } finally { clearTimeout(timer); }
}

async function clearIncoming(req, res) {
  const { vendorId, token, count } = req.body || {};
  if (!okVendor(vendorId) || !okToken(token)) return fail(res, 400, 'Nothing to clear.');
  const n = Math.min(20, Math.max(0, Number(count) || 0));
  let cleared = 0;
  for (let i = 1; i <= n; i++) { try { await put('catalogs/' + vendorId + '/_incoming/' + token + '/part-' + i + '.bin', Buffer.alloc(0)); cleared++; } catch {} }
  return res.status(200).json({ cleared });
}

// ---------- product names ----------
const PRODUCT_PROMPT = 'You read pages of a furniture or school-supply vendor catalogue. For every page, list each product, product family or model the page offers. Copy the name and any model or item code exactly as printed on that page (fix only letter spacing such as "P A L M A N O V A" -> "PALMANOVA"). Never invent, translate or guess a name or code that is not printed on the page. Skip company history, warranty text, headings that are not products, colours, finishes and features. Answer with JSON only: {"items":[{"page":<page number>,"name":"...","code":"..."}]} with code "" when none is printed.';

async function productNames(req, res) {
  const pages = Array.isArray(req.body && req.body.pages) ? req.body.pages.slice(0, 8) : [];
  const clean = pages.filter((p) => p && Number.isInteger(p.n) && typeof p.text === 'string').map((p) => ({ n: p.n, text: p.text.slice(0, 6000) }));
  if (!clean.length) return fail(res, 400, 'No pages given.');
  const keys = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_2, process.env.ANTHROPIC_API_KEY_3, process.env.ANTHROPIC_API_KEY_4].filter(Boolean);
  if (!keys.length) return fail(res, 500, 'The AI key is not set up on the server.');
  const content = clean.map((p) => '=== PAGE ' + p.n + ' ===\n' + p.text).join('\n\n');
  let last = '';
  for (const key of keys) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 8000, system: PRODUCT_PROMPT, messages: [{ role: 'user', content }] }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { last = (j && j.error && j.error.message) || ('HTTP ' + r.status); continue; }
      const txt = ((j && j.content) || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
      const s = txt.indexOf('{');
      const e = txt.lastIndexOf('}');
      let items = [];
      try { items = JSON.parse(txt.slice(s, e + 1)).items || []; } catch { items = []; }
      return res.status(200).json({ items: Array.isArray(items) ? items.slice(0, 400) : [] });
    } catch (e) { last = (e && e.message) || 'network'; }
  }
  return fail(res, 502, 'The AI could not read those pages (' + last + ').');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  const action = req.body && req.body.action;
  if (action === 'fetch') return fetchCatalog(req, res);
  if (action === 'clear') return clearIncoming(req, res);
  if (action === 'products') return productNames(req, res);
  return fail(res, 400, 'Unknown action.');
}
