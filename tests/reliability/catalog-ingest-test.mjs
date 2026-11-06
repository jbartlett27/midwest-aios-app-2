import {build} from 'esbuild';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Vendor catalogue upload engine on a made-up PDF ("Acme Furniture"). pdf.js, pdf-lib and storage are replaced
// by in-memory fakes, so this runs offline. The real libraries are exercised by tools/ingest-browser-check.mjs.
const mutant = process.argv.includes('--mutant');
const MUTANTS = [
  ['a missing edition stays unknown', "if (value == null) return '';", "if (value == null) return todayLocal();"],
  ['blank editions are not replaced with the upload date', 'const ed = normalizeCatalogEdition(edition);', 'const ed = normalizeCatalogEdition(edition || todayLocal());'],
  ['year-only edition precision is kept', 'if (!ed || /^[1-9]\\d{3}$/.test(ed)) return ed;', "if (!ed || /^[1-9]\\d{3}$/.test(ed)) return ed ? ed + '-01-01' : ed;"],
  ['impossible edition dates are refused', 'day <= days[month - 1]', 'day <= 31'],

  ['a wide gap between words becomes a column break', "if (gap > Math.max(8, row.h * 1.0)) out += ' | ';", "if (false) out += ' | ';"],
  ['lines run top to bottom', 'its.sort((a, b) => b.y - a.y || a.x - b.x);', 'its.sort((a, b) => a.y - b.y || a.x - b.x);'],
  ['a dollar figure is not mistaken for a model code', '(?<![A-Za-z0-9\\-/.$])([A-Z]{1,6}', '(?<![A-Za-z0-9\\-/.])([A-Z]{1,6}'],
  ['standards bodies are not model codes', 'const STOP = /^(ISO|', 'const STOP = /^(ZZZ|'],
  ['the column headings above a row are kept with it', 'if (cur >= 0) row.h = cur;', ''],
  ['a section runs to the page before the next one', 'Math.max(l.page, leaves[i + 1].page - (leaves[i + 1].page > l.page ? 1 : 0))', 'leaves[i + 1].page'],
  ['pages before the first bookmark become front matter', "if (leaves[0].page > 1) leaves.unshift(", "if (false) leaves.unshift("],
  ['a PDF with no useful bookmarks still gets sections', 'if (sections.length < Math.max(2, pageCount / 10)) sections = sectionsFromTitles(', 'if (false) sections = sectionsFromTitles('],
  ['bookmarks that are web links to page 1 are dropped', 'leaves = leaves.filter((l) => l.page !== 1 || ++atOne === 1);', ''],
  ['body text is not mistaken for a column heading', 'cells.every((c) => c.length <= 32)', 'true'],
  ['prices are detected from the text', 'figures >= Math.max(10, pageCount * 0.5) || pricedHeaders >= Math.max(5, pageCount * 0.1)', 'false'],
  ['the person can say whether the edition has prices', "hasPrices === true || hasPrices === 'yes' ? true", "false ? true"],
  ['a big PDF is split into pieces', 'if (pdfBytes <= STORAGE_MAX_BYTES) {', 'if (true) {'],
  ['a piece that comes out too big is halved', 'if (bytes.length > STORAGE_MAX_BYTES) {', 'if (false) {'],
  ['a failed PDF store does not lose the catalogue', "warnings.push('The catalogue is loaded, but the original PDF could not be stored", "throw new Error('The catalogue is loaded, but the original PDF could not be stored"],
  ['a failed upload is tried again', 'try { const v = await fn(); if (v) return v; err = new Error', 'try { const v = await fn(); return v; err = new Error'],
  ['the job can be cancelled', "const check = () => { if (isCancelled()) throw new Error('Cancelled.'); };", "const check = () => {};"],
  ['a PDF with no text is flagged', 'if (textChars < pageCount * 20) warnings.push(', 'if (false) warnings.push('],
  ['only PDFs are accepted', "if (!/\\.pdf$/i.test(file.name || '') && file.type !== 'application/pdf') throw", "if (false) throw"],
  ['page pictures are saved under numbered names', "'pages/p-' + pad3(n) + '.jpg'", "'pages/' + n + '.jpg'"],
];
const src = fs.readFileSync('../../src/catalogIngest.js', 'utf8');
if (mutant) { for (const [, from] of MUTANTS) assert.ok(src.includes(from), 'mutation anchor missing: ' + from); }
const outs = [];
for (let i = 0; i < (mutant ? MUTANTS.length : 1); i++) {
  const text = mutant ? src.replace(MUTANTS[i][1], MUTANTS[i][2]) : src;
  await build({stdin: {contents: text, resolveDir: '../../src', loader: 'js'}, bundle: true, format: 'cjs', platform: 'node', outfile: 'catalog-ingest-bundle-' + i + '.cjs'});
  outs.push('./catalog-ingest-bundle-' + i + '.cjs');
}
await build({entryPoints: ['../../src/vendorCatalog.js'], bundle: true, format: 'cjs', platform: 'node', outfile: 'catalog-ingest-vc-bundle.cjs'});
const require = createRequire(import.meta.url);
const VC = require('./catalog-ingest-vc-bundle.cjs');

const it = (str, x, y, h = 10, w) => ({str, transform: [h, 0, 0, h, x, y], width: w == null ? str.length * h * 0.5 : w, height: h});

// A made-up PDF the fake reader hands back: pages of text items, bookmarks, and a size.
function fakePdf(pages, {outline = null} = {}) {
  return {
    numPages: pages.length,
    getPage: async (n) => ({getTextContent: async () => ({items: pages[n - 1]}), cleanup() {}, render: null}),
    getOutline: async () => outline,
    getDestination: async (d) => d,
    getPageIndex: async (ref) => ref.page,
  };
}
const row = (y, ...cells) => { let x = 40; const out = []; for (const c of cells) { out.push(it(c, x, y)); x += c.length * 5 + 40; } return out; };
const PAGES = [
  [...row(750, 'Acme Furniture 2026'), ...row(700, 'Welcome to our catalogue. Call 800-242-2303 for orders.')],
  [...row(750, 'Alpha Desk'), ...row(720, 'Model', 'Size', 'List Price'), ...row(700, 'Alpha Desk', 'AB1000-RED', '20 x 30', '$425.00'), ...row(680, 'AB1001', '22 x 30', '$450.00')],
  [...row(750, 'Warranty'), ...row(720, 'Limited lifetime warranty. ISO9001 certified.')],
];
const OUTLINE = [{title: 'Front', dest: [{page: 0}], items: []}, {title: 'Desks', dest: [{page: 1}], items: [{title: 'Alpha Desk', dest: [{page: 1}], items: []}]}, {title: 'Reference', dest: [{page: 2}], items: [{title: 'Warranty', dest: [{page: 2}], items: []}]}];

function mkFile(name, size, bytes = 64) {
  const buf = new Uint8Array(bytes).fill(7);
  return {name, size, type: 'application/pdf', arrayBuffer: async () => buf.buffer.slice(0)};
}
function mkDeps(pdf, over = {}) {
  const uploads = new Map(); let failFor = over.failFor || (() => false);
  return {
    uploads,
    deps: {
      pdfjs: {getDocument: () => ({promise: Promise.resolve(pdf)})},
      renderPage: async () => new Blob(['jpeg'], {type: 'image/jpeg'}),
      upload: async (path, blob) => { if (failFor(path)) return null; uploads.set(path, blob); return 'https://store.test/' + path; },
      publicUrl: (p) => 'https://store.test/' + p,
      retryDelay: 0,
      ...over.deps,
    },
  };
}
const VENDOR = {id: 'V-acme', name: 'Acme Furniture', phone: '555.0100', email: 'a@acme.test'};

async function suite(M, label) {
  const ok = (cond, msg) => assert.ok(cond, label + ': ' + msg);
  const eq = (a, b, msg) => assert.deepEqual(a, b, label + ': ' + msg);

  for (const bad of ['next week', '2026-02-29', '2024-02-30', '2026-00-01', '2026-13-01', '2026-01-00', '0000', '2026-7-1', 2026, {}, []]) {
    assert.throws(() => M.normalizeCatalogEdition(bad), /Edition must be/, label + ': invalid edition metadata is refused');
    const fixture = mkDeps(fakePdf(PAGES));
    await assert.rejects(M.ingestCatalog({file: mkFile('bad.pdf', 1e6), vendor: VENDOR, edition: bad, deps: fixture.deps}), /Edition must be/, label + ': all upload paths validate before saving');
    eq(fixture.uploads.size, 0, 'invalid edition metadata never writes files');
  }
  eq(M.normalizeCatalogEdition('2000-02-29'), '2000-02-29', 'a leap century is accepted without a timezone conversion');
  assert.throws(() => M.normalizeCatalogEdition('1900-02-29'), /Edition must be/, 'a non-leap century is refused');

  // ---- text ----
  eq(M.linesFromItems([it('Model', 40, 700), it('Size', 140, 700), it('Top', 40, 750)]), ['Top', 'Model | Size'], 'lines run top to bottom and a wide gap is a column break');
  eq(M.linesFromItems([it('AB', 40, 700, 10, 10), it('1000', 50.5, 700, 10, 20)]), ['AB1000'], 'pieces of one word are joined');
  eq(M.linesFromItems([it('Alpha', 40, 700, 10, 25), it('Desk', 67, 700, 10, 20)]), ['Alpha Desk'], 'a small gap is a space');
  eq(M.linesFromItems([it('  ', 40, 700), it('Hello', 40, 690), null, {str: 5}]), ['Hello'], 'blank and broken items are ignored');
  eq(M.linesFromItems(null), [], 'no items is fine');
  eq(M.priceFigures('Desk $1,250.00 each, or $99 and $ 5.5; 100 units'), 3, 'dollar figures are counted');
  eq(M.priceFigures(null), 0, 'no text, no prices');

  // ---- model codes and rows ----
  eq(M.codesInLine('AB1000-RED | 20 x 30 | $425.00'), ['AB1000-RED'], 'a model code is found and a price is not');
  eq(M.codesInLine('Total $CH100 due, ship CH200'), ['CH200'], 'a token that starts with a dollar sign is not a model code');
  eq(M.codesInLine('ELS7601 | ELS6601 | 39 | 32'), ['ELS7601', 'ELS6601'], 'every code on a line is found');
  eq(M.codesInLine('Call 800-242-2303 or ISO9001 and ANSI12345 certified'), [], 'phone numbers and standards are not model codes');
  eq(M.codesInLine('Item 12-AB34 ships in 2 weeks'), ['12-AB34'], 'a number-led code with a letter in it is found');
  const rows = M.rowsFromPages([{n: 2, lines: ['Alpha Desk', 'Model | Size | List Price', 'Alpha Desk | AB1000-RED | 20 x 30 | $425.00', 'AB1001 | 22 x 30 | $450.00']}]);
  eq(rows.products.map((r) => [r.c, r.p, r.h]), [['AB1000-RED', 2, 0], ['AB1001', 2, 0]], 'rows keep their page and the heading above them');
  eq(rows.headers, ['Model | Size | List Price'], 'the column heading is recorded once');
  eq([rows.products[0].b, rows.products[0].x, rows.products[1].x], ['Alpha Desk', undefined, undefined], 'a leading name is kept; a heading line or another row is not context');
  eq(M.rowsFromPages([{n: 1, lines: ['Student chair, stackable', 'CH100A | 18 in']}]).products[0].x, 'Student chair, stackable', 'a plain line above a row is kept as its context');
  eq(rows.pricedHeaders, 1, 'a price column heading is counted');

  // ---- sections ----
  const tree = [{title: 'Front', page: 1, items: []}, {title: 'Desks', page: 4, items: [{title: 'Alpha Desk', page: 4, items: []}, {title: 'Beta Desk', page: 7, items: []}]}, {title: 'Gone', page: 0, items: []}];
  const secs = M.sectionsFromTree(tree, 10);
  eq(secs.map((s) => [s.group, s.title, s.page, s.end]), [['Front', 'Front', 1, 3], ['Desks', 'Alpha Desk', 4, 6], ['Desks', 'Beta Desk', 7, 10]], 'bookmarks become group and section with page ranges (a parent that starts where its first child does is not listed twice)');
  eq(M.sectionsFromTree([{title: 'Intro', page: 1, items: [{title: 'Part', page: 3, items: []}]}], 5).map((s) => [s.group, s.title, s.page, s.end]), [['Intro', 'Intro', 1, 2], ['Intro', 'Part', 3, 5]], 'a parent with its own pages before its first child is a section too');
  eq(M.sectionsFromTree([{title: 'Late', page: 3, items: []}], 5).map((s) => [s.title, s.page, s.end]), [['Front matter', 1, 2], ['Late', 3, 5]], 'pages before the first bookmark are front matter');
  eq(M.sectionsFromTree([], 5), [], 'no bookmarks, no sections');
  eq(M.sectionsFromTree([{title: 'Cover', page: 1, items: []}, {title: 'Web A', page: 1, items: []}, {title: 'Web B', page: 1, items: []}, {title: 'Real', page: 4, items: []}], 9).map((x) => [x.title, x.page, x.end]), [['Cover', 1, 3], ['Real', 4, 9]], 'bookmarks that are web links all pointing at page 1 are dropped');
  eq(M.rowsFromPages([{n: 1, lines: ['2 single doors, each w/adj. shelf - left and right | 36 | 722', 'CH100A | 18 in']}]).headers, [], 'body text with a stray word like "each" is not a column heading');
  const byTitle = M.sectionsFromTitles(['Intro', 'Intro', 'Desks', '123', 'Chairs'], 5);
  eq(byTitle.map((s) => [s.title, s.page, s.end]), [['Intro', 1, 2], ['Desks', 3, 4], ['Chairs', 5, 5]], 'with no bookmarks the page headings make the sections, runs merged');
  const chunked = M.sectionsFromTitles(Array.from({length: 25}, (_, i) => 'Heading ' + i), 25);
  eq(chunked.map((s) => s.title), ['Pages 1-10', 'Pages 11-20', 'Pages 21-25'], 'a different heading on every page falls back to ten-page sections');

  // ---- splitting plan ----
  eq(M.splitPlan(180, 150e6), [[1, 36], [37, 72], [73, 108], [109, 144], [145, 180]], 'a 150 MB PDF is planned as pieces of equal page runs');
  eq(M.splitPlan(10, 20e6), [[1, 10]], 'a small PDF is one piece');
  eq(M.slugify('WB Mfg 2026 -- Full Line!'), 'wb-mfg-2026-full-line', 'names become safe path parts');

  // ---- the whole job ----
  const marks = [];
  let { deps, uploads } = mkDeps(fakePdf(PAGES, {outline: OUTLINE}));
  let out = await M.ingestCatalog({file: mkFile('Acme 2026.pdf', 5e6), vendor: VENDOR, title: 'Acme 2026 Catalog', edition: '2026-01-01', deps, onProgress: (p) => marks.push(p.stage)});
  const base = 'catalogs/V-acme/acme-2026-catalog-2026-01-01/';
  eq([...uploads.keys()].sort(), [base + 'catalog.json', base + 'pages/p-001.jpg', base + 'pages/p-002.jpg', base + 'pages/p-003.jpg', base + 'pdf/catalog.pdf'], 'the catalogue file, a picture of every page and the PDF are saved');
  eq(out.rec.pdfUrl, 'https://store.test/' + base + 'pdf/catalog.pdf', 'a PDF under the storage limit is stored whole');
  eq(out.rec.pageImgBase, 'https://store.test/' + base + 'pages/', 'page pictures are found under one address');
  eq([out.rec.pageCount, out.rec.productCount, out.rec.sectionCount, out.rec.hasPrices, out.rec.vendorId, out.rec.edition], [3, 2, 3, false, 'V-acme', '2026-01-01'], 'the link row counts pages, rows and sections');
  eq(out.stats, {pages: 3, rows: 2, codes: 2, sections: 3, priceFigures: 2, images: 3, pdfPieces: 1}, 'the summary counts what was found');
  eq(out.id, 'VCAT-V-acme-acme-2026-catalog-2026-01-01', 'the link row has a stable id so a re-upload replaces it');
  ok(marks.includes('reading') && marks.includes('pages') && marks.includes('saving') && marks[marks.length - 1] === 'done', 'progress is reported from reading to done');
  eq(out.warnings, [], 'nothing to warn about');
  const json = JSON.parse(await uploads.get(base + 'catalog.json').text());
  VC._resetCatalogCache();
  const cat = await VC.loadCatalog({url: 'u1'}, {fetchImpl: async () => ({ok: true, json: async () => json})});
  eq(cat.rows.map((r) => r.code), ['AB1000-RED', 'AB1001'], 'the saved file loads as a catalogue');
  eq(VC.searchCatalog(cat, 'AB1001').rows.map((r) => r.page), [2], 'a model code from the upload can be searched');
  eq(VC.getPage(cat, 3).title, 'Warranty', 'pages keep their headings');
  eq(cat.profilePages, [3], 'the warranty page is a company page');
  ok(/\$425\.00/.test(VC.pageMarkdown(cat, out.rec, 2)), 'the price is on the page card the Brain shows');
  eq(json.sections.map((s) => s.products), [false, true, false], 'only sections that hold model rows are product sections');
  ok(json.company.name === 'Acme Furniture' && json.company.phone === '555.0100', 'the vendor record fills in the company block');

  // Missing publication metadata must never become the upload date.
  for (const edition of [undefined, null, '', '   ', '2026', ' 2025 ', '2024-02-29']) {
    const fixture = mkDeps(fakePdf(PAGES));
    const result = await M.ingestCatalog({file: mkFile('edition.pdf', 1e6), vendor: VENDOR, edition, deps: fixture.deps});
    const expected = edition == null ? '' : edition.trim();
    eq(result.rec.edition, expected, 'the link row preserves unknown, year-only and full edition metadata');
    const stored = JSON.parse(await [...fixture.uploads.entries()].find(([p]) => p.endsWith('/catalog.json'))[1].text());
    eq(stored.edition, expected, 'the catalogue JSON preserves the same edition metadata');
    ok(result.rec.url.includes('-' + (expected || 'unknown') + '/catalog.json'), 'an unknown edition uses an explicit stable storage path');
    ok(/^\d{4}-\d{2}-\d{2}$/.test(result.rec.uploadedAt), 'the upload date stays separate from publication metadata');
  }

  // prices: detected, and the person can overrule
  const priced = Array.from({length: 3}, () => [...row(750, 'Chair'), ...Array.from({length: 4}, (_, i) => row(700 - i * 10, 'CH100' + i, '$' + (100 + i) + '.00')).flat()]);
  ({ deps, uploads } = mkDeps(fakePdf(priced)));
  out = await M.ingestCatalog({file: mkFile('c.pdf', 1e6), vendor: VENDOR, deps});
  eq([out.rec.hasPrices, out.stats.priceFigures], [true, 12], 'a catalogue full of dollar figures is marked as having prices');
  ({ deps } = mkDeps(fakePdf(priced)));
  out = await M.ingestCatalog({file: mkFile('c.pdf', 1e6), vendor: VENDOR, deps, hasPrices: false});
  eq(out.rec.hasPrices, false, 'the person can say it has no prices');
  ({ deps } = mkDeps(fakePdf(PAGES)));
  out = await M.ingestCatalog({file: mkFile('c.pdf', 1e6), vendor: VENDOR, deps, hasPrices: 'yes'});
  eq(out.rec.hasPrices, true, 'the person can say it has prices');
  eq(out.rec.title, 'c', 'with no title the file name is used');

  // a big PDF is split
  const fakeLib = (perPage, seen = []) => ({PDFDocument: {
    load: async () => ({kind: 'src'}),
    create: async () => { const d = {pages: 0, async copyPages(_, idx) { return idx.map(() => ({})); }, addPage() { d.pages++; }, async save() { return new Uint8Array(d.pages * perPage); }}; seen.push(d); return d; },
  }});
  const twelve = Array.from({length: 12}, (_, i) => row(750, 'Page ' + (i + 1)));
  ({ deps, uploads } = mkDeps(fakePdf(twelve), {deps: {pdflib: fakeLib(10e6)}}));
  out = await M.ingestCatalog({file: mkFile('big.pdf', 120e6), vendor: VENDOR, deps});
  eq(out.rec.pdfParts.map((p) => [p.from, p.to]), [[1, 3], [4, 6], [7, 9], [10, 12]], 'a 120 MB PDF is saved as pieces that cover every page once');
  ok(out.rec.pdfParts.every((p) => p.bytes <= 44e6) && !out.rec.pdfUrl, 'every piece fits and there is no whole-file link');
  eq(VC.pdfPageUrl(out.rec, 5), out.rec.pdfParts[1].url + '#page=2', 'a page is found in its piece');
  ({ deps, uploads } = mkDeps(fakePdf(twelve), {deps: {pdflib: fakeLib(20e6)}}));
  out = await M.ingestCatalog({file: mkFile('big.pdf', 120e6), vendor: VENDOR, deps});
  ok(out.rec.pdfParts.every((p) => p.bytes <= 44e6) && out.rec.pdfParts.reduce((a, p) => a + (p.to - p.from + 1), 0) === 12, 'a piece that comes out too big is halved until it fits');
  eq(out.rec.pdfParts.map((p) => p.from), [...out.rec.pdfParts.map((p) => p.from)].sort((a, b) => a - b), 'pieces are listed in page order');
  ({ deps } = mkDeps(fakePdf(twelve), {deps: {pdflib: fakeLib(60e6)}}));
  out = await M.ingestCatalog({file: mkFile('big.pdf', 120e6), vendor: VENDOR, deps});
  ok(!out.rec.pdfParts && !out.rec.pdfUrl && out.warnings.some((w) => /original PDF could not be stored \(page 1 alone/.test(w)) && out.rec.url, 'a single page too big to store loses only the PDF link, not the catalogue');

  // failures
  ({ deps, uploads } = mkDeps(fakePdf(PAGES), {failFor: (p) => /pdf\/catalog\.pdf$/.test(p)}));
  out = await M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, title: 'Acme 2026 Catalog', edition: '2026-01-01', deps});
  ok(!out.rec.pdfUrl && out.warnings.some((w) => /original PDF could not be stored/.test(w)) && uploads.has(base + 'catalog.json'), 'when the PDF will not store the catalogue is still saved and the person is told');
  let tries = 0;
  const uploads2 = new Map();
  ({ deps } = mkDeps(fakePdf(PAGES), {deps: {upload: async (p, b) => { if (/p-002/.test(p) && ++tries < 3) return null; uploads2.set(p, b); return 'https://store.test/' + p; }}}));
  out = await M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, deps});
  ok(tries === 3 && out.stats.images === 3 && out.warnings.length === 0, 'a failed upload is tried again');
  ({ deps } = mkDeps(fakePdf(PAGES), {failFor: (p) => /pages\//.test(p)}));
  out = await M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, deps});
  ok(!out.rec.pageImgBase && out.warnings.some((w) => /3 page pictures could not be saved/.test(w)), 'no page pictures saved means no picture address and a warning');
  ({ deps } = mkDeps(fakePdf(PAGES), {failFor: (p) => /catalog\.json$/.test(p)}));
  await assert.rejects(M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, deps}), /upload refused/, label + ': if the catalogue file itself will not save the job fails');
  let cancel = false;
  ({ deps } = mkDeps(fakePdf(PAGES)));
  await assert.rejects(M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, deps, isCancelled: () => cancel, onProgress: (p) => { if (p.stage === 'pages' && p.done === 1) cancel = true; }}), /Cancelled/, label + ': the job can be cancelled part way');
  ({ deps } = mkDeps(fakePdf([row(750, 'x'), row(750, 'y')])));
  out = await M.ingestCatalog({file: mkFile('a.pdf', 1e6), vendor: VENDOR, deps});
  ok(out.warnings.some((w) => /almost no text/.test(w)), 'a PDF of pictures is flagged');
  await assert.rejects(M.ingestCatalog({file: {...mkFile('notes.txt', 10), type: 'text/plain'}, vendor: VENDOR, deps}), /Only PDF/, label + ': only PDFs are accepted');
  await assert.rejects(M.ingestCatalog({file: mkFile('a.pdf', 10), vendor: null, deps}), /Pick a vendor/, label + ': a vendor is required');
  ({ deps } = mkDeps(null, {deps: {pdfjs: {getDocument: () => ({promise: Promise.reject(new Error('Invalid PDF structure'))})}}}));
  await assert.rejects(M.ingestCatalog({file: mkFile('a.pdf', 10), vendor: VENDOR, deps}), /could not be opened \(Invalid PDF structure\)/, label + ': a broken PDF says so');
}

if (!mutant) { await suite(require(outs[0]), 'real'); console.log('PASS vendor catalogue upload engine on a made-up PDF (text columns, model codes, prices, sections, page pictures, split big PDFs, retries, cancel)'); }
else {
  let failed = 0;
  for (let i = 0; i < MUTANTS.length; i++) {
    try { await suite(require(outs[i]), 'mutant ' + MUTANTS[i][0]); console.log('SURVIVED ' + MUTANTS[i][0]); } catch (e) { failed++; console.log('killed ' + MUTANTS[i][0] + ' <- ' + String(e.message).split('\n')[0].slice(0, 90)); }
  }
  process.exit(failed === MUTANTS.length ? 1 : 0);
}
