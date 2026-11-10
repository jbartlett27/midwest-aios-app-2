import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
// api/catalog.js (catalogue links and product names) run offline: the vendor site, storage and the AI are
// in-memory fakes, and every address is a literal IP so nothing is looked up or downloaded.
const mutant = process.argv.includes('--mutant');
const MUTANTS = [
  ['loopback addresses are refused', 'p[0] === 127 ||', 'false ||'],
  ['private 10.x addresses are refused', 'p[0] === 10 ||', 'false ||'],
  ['cloud metadata addresses are refused', '(p[0] === 169 && p[1] === 254)', 'false'],
  ['every redirect hop is checked', 'const url = await safeUrl(cur);', 'const url = new URL(cur);'],
  ['a download is saved in pieces under the storage limit', 'const PART_BYTES = 40 * 1000 * 1000;', 'const PART_BYTES = 400 * 1000 * 1000;'],
  ['the last piece is saved', '    await flush();\n    const name', '    const name'],
  ['an oversize PDF is refused', 'if (total > MAX_BYTES) throw', 'if (false) throw'],
  ['a web page answers with its PDF links', "if (!/^https?:$/.test(abs.protocol) || !/\\.pdf$/i.test(abs.pathname)) continue;", "if (!/^https?:$/.test(abs.protocol)) continue;"],
  ['a non-PDF file is refused', "return fail(res, 400, 'That link is not a PDF (' +", "return res.status(200).json({kind: 'pdf', parts: []}) || ('' +"],
  ['Google Drive share links download the file', "if (m) return 'https://drive.usercontent.google.com/download?id='", "if (false) return 'https://drive.usercontent.google.com/download?id='"],
  ['clearing only touches temporary pieces', "if (!okVendor(vendorId) || !okToken(token)) return fail(res, 400, 'Nothing to clear.');", ''],
  ['product names use the small model with no tools', "model: 'claude-haiku-4-5', max_tokens: 8000", "model: 'claude-sonnet-5', max_tokens: 8000, tools: [{type: 'web_search_20250305', name: 'web_search'}]"],
  ['at most eight pages per request', '.slice(0, 8)', '.slice(0, 80)'],
];
const src = fs.readFileSync('../../api/catalog.js', 'utf8');
if (mutant) for (const [, from] of MUTANTS) assert.ok(src.includes(from), 'mutation anchor missing: ' + from);
const mods = [];
for (let i = 0; i < (mutant ? MUTANTS.length : 1); i++) {
  const text = mutant ? src.replace(MUTANTS[i][1], MUTANTS[i][2]) : src;
  const out = './catalog-api-bundle-' + i + '.cjs';
  await build({stdin: {contents: text, resolveDir: '../../api', loader: 'js'}, bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error'});
  mods.push(createRequire(import.meta.url)(out));
}

const enc = (s) => new TextEncoder().encode(s);
function stream(chunks) { let i = 0; return new ReadableStream({pull(c) { if (i < chunks.length) c.enqueue(chunks[i++]); else c.close(); }}); }
const resp = (status, headers, chunks) => ({status, ok: status >= 200 && status < 300, headers: {get: (k) => headers[k.toLowerCase()] ?? null}, body: chunks instanceof ReadableStream ? chunks : stream(chunks || []), json: async () => JSON.parse(new TextDecoder().decode(Buffer.concat((chunks || []).map((c) => Buffer.from(c)))))});
function mkRes() { return {statusCode: 0, body: null, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(j) { this.body = j; return this; }, end() { return this; }}; }
const call = async (M, body) => { const res = mkRes(); await M.default({method: 'POST', body}, res); return res; };
const MB = 1000 * 1000;
// generated as it is read, so a 600 MB test file never sits in memory
function bigPdf(total) { let left = total; let first = true; return new ReadableStream({pull(c) { if (left <= 0) return c.close(); const n = Math.min(MB * 3, left); const b = new Uint8Array(n).fill(65); if (first) { b.set(enc('%PDF-1.7\n')); first = false; } left -= n; c.enqueue(b); }}); }

async function suite(M, label) {
  const ok = (c, m) => assert.ok(c, label + ': ' + m);
  const eq = (a, b, m) => assert.deepEqual(a, b, label + ': ' + m);
  const puts = [];
  let site = {};
  let ai = null;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith('https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/vendor-invoices/')) { puts.push({path: u.split('/vendor-invoices/')[1], size: opts.body.length, upsert: opts.headers['x-upsert']}); return {ok: true, status: 200}; }
    if (u === 'https://api.anthropic.com/v1/messages') { ai = JSON.parse(opts.body); return {ok: true, status: 200, json: async () => ({content: [{type: 'text', text: 'Here you go: {"items":[{"page":3,"name":"Hyve Rocker","code":""}]} done'}]})}; }
    const f = site[u];
    if (!f) return resp(404, {}, []);
    return f(opts);
  };

  // ---- addresses ----
  for (const ip of ['127.0.0.1', '10.0.0.5', '169.254.169.254', '192.168.1.4', '172.20.0.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) ok(M.privateAddress(ip), ip + ' is private');
  for (const ip of ['93.184.216.34', '8.8.8.8', '2606:4700::1111']) ok(!M.privateAddress(ip), ip + ' is public');
  eq(M.directLink('https://drive.google.com/file/d/1AbCdEfGhIjKlMn/view?usp=sharing'), 'https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMn&export=download&confirm=t', 'a Google Drive share link becomes a download');
  eq(M.directLink('https://www.dropbox.com/s/abc/cat.pdf?dl=0'), 'https://www.dropbox.com/s/abc/cat.pdf?dl=1', 'a Dropbox share link becomes a download');
  eq(M.directLink('ftp://x/y.pdf'), null, 'only web links');

  for (const bad of ['http://127.0.0.1/cat.pdf', 'http://10.0.0.5/cat.pdf', 'http://169.254.169.254/latest', 'http://localhost/cat.pdf', 'http://[::1]/cat.pdf', 'https://93.184.216.34:8443/cat.pdf', 'https://user:pw@93.184.216.34/cat.pdf']) {
    const r = await call(M, {action: 'fetch', url: bad, vendorId: 'V-acme'});
    ok(r.statusCode === 400 && /private network|port|user name/.test(r.body.error), 'refused: ' + bad);
  }
  site = {'https://93.184.216.34/go': () => resp(302, {location: 'http://10.1.2.3/secret.pdf'}, [])};
  let r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/go', vendorId: 'V-acme'});
  ok(r.statusCode === 400 && /private network/.test(r.body.error), 'a redirect into a private network is refused');
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/a.pdf', vendorId: '../x'});
  ok(r.statusCode === 400 && /vendor/.test(r.body.error), 'a vendor id with a path in it is refused');

  // ---- a big PDF ----
  puts.length = 0;
  site = {'https://93.184.216.34/start': () => resp(301, {location: '/files/Acme%20Catalog%202026.pdf'}, []), 'https://93.184.216.34/files/Acme%20Catalog%202026.pdf': () => resp(200, {'content-type': 'application/octet-stream'}, bigPdf(85 * MB))};
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/start', vendorId: 'V-acme'});
  eq(r.statusCode, 200, 'a PDF behind a redirect downloads');
  eq([r.body.kind, r.body.name, r.body.bytes, r.body.source], ['pdf', 'Acme Catalog 2026.pdf', 85 * MB, 'https://93.184.216.34/files/Acme%20Catalog%202026.pdf'], 'the answer names the PDF, its size and where it came from');
  eq(puts.map((p) => p.size), [40 * MB, 40 * MB, 5 * MB], 'the PDF is saved in pieces of 40 MB, the last one smaller');
  ok(puts.every((p) => p.upsert === 'true' && new RegExp('^catalogs/V-acme/_incoming/' + r.body.token + '/part-\\d\\.bin$').test(p.path)), 'pieces go to a fresh temporary folder for that vendor');
  eq(r.body.parts.length, 3, 'every piece is listed'); ok(r.body.parts[0].includes('/object/public/vendor-invoices/catalogs/V-acme/_incoming/'), 'pieces are listed by their public address');
  ok(/^[a-z0-9]{8,32}$/.test(r.body.token), 'the temporary folder has a plain name');
  site = {'https://93.184.216.34/huge.pdf': () => resp(200, {'content-type': 'application/pdf'}, bigPdf(601 * MB))};
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/huge.pdf', vendorId: 'V-acme'});
  ok(r.statusCode === 400 && /over 600 MB/.test(r.body.error), 'a PDF over 600 MB is refused');

  // ---- a web page ----
  const html = '<!doctype html><html><head><title>Acme &amp; Co Catalogs</title></head><body><a href="/docs/2026 Full Line.pdf#p2">2026 <b>Full Line</b></a> <a href=\'https://cdn.acme.test/price.PDF?v=3\'>Price list</a> <a href="/about">About</a> <a href="/docs/2026 Full Line.pdf">dup</a> <a href="javascript:x.pdf">x</a></body></html>';
  site = {'https://93.184.216.34/catalogs': () => resp(200, {'content-type': 'text/html; charset=utf-8'}, [enc(html)])};
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/catalogs', vendorId: 'V-acme'});
  eq(r.body, {kind: 'links', title: 'Acme & Co Catalogs', page: 'https://93.184.216.34/catalogs', links: [{url: 'https://93.184.216.34/docs/2026%20Full%20Line.pdf', text: '2026 Full Line'}, {url: 'https://cdn.acme.test/price.PDF?v=3', text: 'Price list'}]}, 'a web page answers with each PDF on it once, with its link text');
  site = {'https://93.184.216.34/viewer': () => resp(200, {'content-type': 'text/html'}, [enc('<html><body><div id="flipbook"></div></body></html>')])};
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/viewer', vendorId: 'V-acme'});
  ok(r.statusCode === 400 && /no PDF link/.test(r.body.error), 'a viewer page with no PDF says what to do');
  site = {'https://93.184.216.34/pic.png': () => resp(200, {'content-type': 'image/png'}, [enc('\x89PNG....')])};
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/pic.png', vendorId: 'V-acme'});
  ok(r.statusCode === 400 && /not a PDF \(image\/png\)/.test(r.body.error), 'a picture is not a catalogue');
  r = await call(M, {action: 'fetch', url: 'https://93.184.216.34/missing.pdf', vendorId: 'V-acme'});
  ok(r.statusCode === 400 && /answered 404/.test(r.body.error), 'a broken link says the site answer');

  // ---- clearing ----
  puts.length = 0;
  r = await call(M, {action: 'clear', vendorId: 'V-acme', token: 'abc12345xyz', count: 3});
  eq(puts.map((p) => p.path + ':' + p.size), ['catalogs/V-acme/_incoming/abc12345xyz/part-1.bin:0', 'catalogs/V-acme/_incoming/abc12345xyz/part-2.bin:0', 'catalogs/V-acme/_incoming/abc12345xyz/part-3.bin:0'], 'clearing empties exactly the temporary pieces');
  puts.length = 0;
  r = await call(M, {action: 'clear', vendorId: 'V-acme', token: '../../invoices', count: 3});
  ok(r.statusCode === 400 && puts.length === 0, 'clearing refuses anything but a temporary folder name');

  // ---- product names ----
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const pages = Array.from({length: 10}, (_, i) => ({n: i + 1, text: 'x'.repeat(7000)}));
  r = await call(M, {action: 'products', pages});
  eq(r.body, {items: [{page: 3, name: 'Hyve Rocker', code: ''}]}, 'the JSON answer is read even with words around it');
  ok(ai.model === 'claude-haiku-4-5' && !ai.tools, 'names are read by the small model with no web search');
  ok((ai.messages[0].content.match(/=== PAGE /g) || []).length === 8 && !ai.messages[0].content.includes('x'.repeat(6001)), 'at most eight pages of at most 6,000 characters go per request');
  ok(/Never invent/.test(ai.system), 'the reader is told not to invent names');
  r = await call(M, {action: 'products', pages: [{n: 'a', text: 1}]});
  ok(r.statusCode === 400, 'pages without a number and text are refused');
  delete process.env.ANTHROPIC_API_KEY;
  r = await call(M, {action: 'products', pages: [{n: 1, text: 'x'}]});
  ok(r.statusCode === 500 && /AI key/.test(r.body.error), 'no AI key says so');
  r = await call(M, {action: 'nope'});
  ok(r.statusCode === 400, 'an unknown action is refused');
}

if (!mutant) { await suite(mods[0], 'real'); console.log('PASS catalogue links and product names server (private addresses refused, redirects checked, 40 MB pieces, web page PDF links, clearing, small-model names)'); }
else {
  let failed = 0;
  for (let i = 0; i < MUTANTS.length; i++) {
    try { await suite(mods[i], 'mutant ' + MUTANTS[i][0]); console.log('SURVIVED ' + MUTANTS[i][0]); } catch (e) { failed++; console.log('killed ' + MUTANTS[i][0] + ' <- ' + String(e.message).split('\n')[0].slice(0, 90)); }
  }
  process.exit(failed === MUTANTS.length ? 1 : 0);
}
