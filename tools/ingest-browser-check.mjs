// Real-browser check of the vendor catalogue upload (src/catalogIngest.js): real pdf.js reading, real page
// rendering, real PDF splitting with pdf-lib, a big file, storage replaced by a stand-in that refuses any single
// file over 50 MB exactly like the live bucket does. Not part of the offline battery (it needs a browser and the
// two libraries); run it by hand after changing the upload engine:
//
//   mkdir lab && cd lab && npm i pdfjs-dist@4.10.38 pdf-lib@1.17.1 esbuild playwright
//   node genpdf.mjs big.pdf 160 0.94          (any big made-up PDF will do)
//   node ../tools/ingest-browser-check.mjs big.pdf [outDir]
//
// Uses only made-up files. The libraries are served from the local node_modules in place of the CDN.
import {chromium} from 'playwright';
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(process.argv[2] || 'big.pdf');
const outDir = path.resolve(process.argv[3] || 'ingest-out');
fs.mkdirSync(outDir, {recursive: true});
const size = fs.statSync(pdfPath).size;
const nm = path.resolve('node_modules');
const bundle = (await build({entryPoints: [path.join(here, '../src/catalogIngest.js')], bundle: true, format: 'iife', globalName: 'CI', write: false})).outputFiles[0].text;

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const log = [];
page.on('console', (m) => { if (/error/i.test(m.type())) log.push(m.text()); });
page.on('pageerror', (e) => log.push('pageerror ' + e.message));
const stored = new Map();
await page.route('http://test.local/', (r) => r.fulfill({contentType: 'text/html', body: '<!doctype html><input type=file id=f>'}));
const cdn = {
  'pdf.min.mjs': path.join(nm, 'pdfjs-dist/build/pdf.min.mjs'),
  'pdf.worker.min.mjs': path.join(nm, 'pdfjs-dist/build/pdf.worker.min.mjs'),
  'pdf-lib.esm.min.js': path.join(nm, 'pdf-lib/dist/pdf-lib.esm.min.js'),
};
await page.route(/cdn\.jsdelivr\.net\/npm\/(pdfjs-dist|pdf-lib)@/, (r) => {
  const f = cdn[r.request().url().split('/').pop()];
  if (!f) return r.fulfill({status: 404, body: ''});
  return r.fulfill({body: fs.readFileSync(f), contentType: 'text/javascript', headers: {'access-control-allow-origin': '*'}});
});
await page.route('https://kogjthgceejpzxnekprr.supabase.co/storage/**', async (r) => {
  const req = r.request();
  const len = Number(req.headers()['content-length'] || 0);
  const p = decodeURIComponent(req.url().split('/vendor-invoices/')[1]);
  if (len > 50 * 1000 * 1000) return r.fulfill({status: 413, contentType: 'application/json', body: '{"statusCode":"413","error":"Payload too large"}'});
  const buf = req.postDataBuffer();
  stored.set(p, {len, buf: /catalog\.json$|p-00[12]\.jpg$|p-100\.jpg$/.test(p) ? buf : null});
  return r.fulfill({status: 200, contentType: 'application/json', body: '{"Key":"ok"}'});
});
await page.goto('http://test.local/');
await page.addScriptTag({content: bundle});
await page.setInputFiles('#f', pdfPath);
const t0 = Date.now();
const res = await page.evaluate(async () => {
  const file = document.getElementById('f').files[0];
  const marks = [];
  const out = await CI.ingestCatalog({
    file, vendor: {id: 'V-acme', name: 'Acme Furniture', phone: '555.0100'}, title: 'Acme Big Catalog', edition: '2026-11-06',
    deps: {
      upload: async (p, blob) => {
        const r = await fetch('https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/vendor-invoices/' + p, {method: 'POST', body: blob, headers: {'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true'}});
        return r.ok ? 'https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/public/vendor-invoices/' + p : null;
      },
      publicUrl: (p) => 'https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/public/vendor-invoices/' + p,
    },
    onProgress: (p) => { if (!marks.length || marks[marks.length - 1] !== p.stage) marks.push(p.stage); },
  });
  return {rec: out.rec, stats: out.stats, warnings: out.warnings, id: out.id, marks};
});
const secs = ((Date.now() - t0) / 1000).toFixed(0);
const paths = [...stored.keys()];
const jpgs = paths.filter((p) => /\/pages\/p-\d+\.jpg$/.test(p));
const parts = paths.filter((p) => /\/pdf\//.test(p));
console.log('ingest of ' + (size / 1048576).toFixed(0) + ' MB took ' + secs + ' s', JSON.stringify(res.stats), 'stages', res.marks.join('>'));
console.log('warnings', JSON.stringify(res.warnings), 'browser errors', JSON.stringify(log.slice(0, 3)));
console.log('pdf pieces', res.rec.pdfParts ? res.rec.pdfParts.map((p) => p.from + '-' + p.to + ':' + (p.bytes / 1e6).toFixed(1) + 'MB').join(' ') : res.rec.pdfUrl);

const pages = res.stats.pages;
assert.equal(jpgs.length, pages, 'a picture for every page');
assert.ok(paths.some((p) => /catalog\.json$/.test(p)), 'catalogue file saved');
assert.ok(parts.length >= 1, 'PDF saved');
assert.ok([...stored.entries()].every(([, v]) => v.len <= 50e6), 'no single file over the storage limit');
if (size > 50e6) {
  assert.ok(res.rec.pdfParts && res.rec.pdfParts.length >= 3 && !res.rec.pdfUrl, 'a big PDF is stored in pieces');
  let next = 1;
  for (const p of res.rec.pdfParts) { assert.equal(p.from, next, 'pieces are contiguous'); next = p.to + 1; }
  assert.equal(next, pages + 1, 'pieces cover every page');
}
const json = JSON.parse(stored.get(paths.find((p) => /catalog\.json$/.test(p))).buf.toString());
assert.equal(json.v, 1); assert.equal(json.pageCount, pages); assert.equal(json.pages.length, pages);
assert.ok(json.sections.length >= 4 && json.sections[0].group, 'bookmarks became sections');
if (!process.env.REAL) { // checks that only make sense for the made-up catalogue from genpdf.mjs
  assert.ok(json.products.length >= pages * 6, 'model rows found on the pages');
  assert.equal(json.hasPrices, true, 'dollar figures mean prices');
  assert.ok(json.products.some((r) => r.c === 'AC1030-RED'), 'a known model code was read');
  const p3 = json.pages.find((p) => p.n === 3);
  assert.match(p3.text, /AC1030-RED \| 20 x 30 \| \$103\.50/, 'a table row keeps its columns and price: ' + p3.text.split('\n')[2]);
}
fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(json));
for (const k of paths.filter((p) => /p-00[12]\.jpg$/.test(p))) fs.writeFileSync(path.join(outDir, path.basename(k)), stored.get(k).buf);
const j2 = stored.get(paths.find((p) => /p-002\.jpg$/.test(p))).buf;
assert.equal(j2[0], 0xff); assert.equal(j2[1], 0xd8); assert.ok(j2.length > 5000, 'a real picture, not an empty file');
console.log('PASS real-browser upload check: ' + pages + ' pages, ' + json.products.length + ' rows, ' + res.stats.pdfPieces + ' PDF piece(s), prices ' + json.hasPrices);
await browser.close();
