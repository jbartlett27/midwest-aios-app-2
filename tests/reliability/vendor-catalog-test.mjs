import {build} from 'esbuild';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Synthetic catalogue only ("Acme Furniture"). A real vendor catalogue is never committed to this public repo.
const mutant = process.argv.includes('--mutant');
const MUTANTS = [
  ['an exact model code ranks first', 'if (code === q) score = 100;', 'if (false) score = 100;'],
  ['a code that starts with the search beats one that only contains it', 'else if (code.startsWith(q)) score = 80;', 'else if (false) score = 80;'],
  ['every word has to match', 'toks.every((t) => r.blob.includes(t))) score = 40', 'toks.some((t) => r.blob.includes(t))) score = 40'],
  ['a section name that is exactly a group means that group only', 'let hit = cat.sections.filter((x) => lc(x.group) === s);', 'let hit = [];'],
  ['a section title that is exact means that section only', 'if (!hit.length) hit = cat.sections.filter((x) => lc(x.title) === s);', ''],
  ['the match total covers every match, not just the rows shown', 'total: scored.length,', 'total: Math.min(scored.length, limit),'],
  ['a section alone lists its models', 'if (!toks.length && !secSet) return', 'if (!toks.length) return'],
  ['a failed load is not remembered', 'p.catch(() => _cache.delete(rec.url));', ''],
  ['a loaded catalogue is read once', 'if (_cache.has(rec.url)) return _cache.get(rec.url);', ''],
  ['a file that is not a catalogue is refused', 'raw.v !== 1 || ', ''],
  ['a link row without a file address is ignored', '!d.url || !d.vendorId', 'false'],
  ['a page link opens that page of the PDF', "rec.pdfUrl + '#page=' + n", "rec.pdfUrl + '#p=' + n"],
  ['a split PDF opens the piece that holds the page, at its own page number', "'#page=' + (n - p.from + 1)", "'#page=' + n"],
  ['each piece of a split PDF gets its own button', "parts.length === 1 ? 'Open PDF' : 'PDF pages ' + p.from + '-' + p.to", "'Open PDF'"],
  ['the page card shows the page picture', "if (img) out.push(", "if (false) out.push("],
  ['the page card lists only the rows printed on that page', "if (r.page !== p.n) continue;", ""],
  ['a very long page is cut with a note', "if (text.length > PAGE_TEXT_MAX) text = text.slice(0, PAGE_TEXT_MAX);", ""],
  ['the page card offers the next page', "if (p.n < cat.pageCount) nav.push(", "if (false) nav.push("],
  ['the Brain is told never to answer with only a page number', "Never answer with only a page number", "Answer briefly"],
  ['a pipe in a row cannot break the table', ".replace(/\\|/g, '/')", ''],
  ['an exact model code is not mixed with longer codes', 'if (exact) return { rows: exact, exact: true };', ''],
  ['the Brain is told when a catalogue has no prices', "(r.hasPrices ? '' : ', no prices')", "''"],
];
const src = fs.readFileSync('../../src/vendorCatalog.js', 'utf8');
if (mutant) { for (const [, from] of MUTANTS) assert.ok(src.includes(from), 'mutation anchor missing: ' + from); }
const outs = [];
for (let i = 0; i < (mutant ? MUTANTS.length : 1); i++) {
  const text = mutant ? src.replace(MUTANTS[i][1], MUTANTS[i][2]) : src;
  await build({stdin: {contents: text, resolveDir: '../../src', loader: 'js'}, bundle: true, format: 'cjs', platform: 'node', outfile: 'vendor-catalog-bundle-' + i + '.cjs'});
  outs.push('./vendor-catalog-bundle-' + i + '.cjs');
}
const require = createRequire(import.meta.url);

const fixture = () => ({
  v: 1, vendorId: 'V-acme', vendorName: 'Acme Furniture', title: 'Acme 2026 Catalog', edition: '2026-01-01', hasPrices: false, pageOffset: 2, pageCount: 9,
  company: {name: 'Acme Furniture Co', phone: '555.0100'}, profilePages: [1, 9], notes: [],
  sections: [
    {id: 's1', group: 'Front matter', title: 'Welcome', page: 1, end: 1, products: false},
    {id: 's2', group: 'Desks', title: 'Student Desks: Alpha Desk', page: 2, end: 3, products: true},
    {id: 's3', group: 'Desks', title: 'Teacher Desks: Beta', page: 4, end: 4, products: true},
    {id: 's4', group: 'Seating', title: 'Chair', page: 5, end: 5, products: true},
    {id: 's5', group: 'Seating', title: '5-Star Chair', page: 6, end: 6, products: true},
    {id: 's6', group: 'Storage', title: 'Music Storage', page: 7, end: 7, products: true},
    {id: 's7', group: 'Media Centers', title: 'Media and Magazine Storage', page: 8, end: 8, products: true},
    {id: 's8', group: 'Reference', title: 'Warranty', page: 9, end: 9, products: false},
  ],
  pages: [
    {n: 1, pn: null, sec: 's1', title: 'Welcome to Acme', text: 'Welcome to Acme\nCall 555.0100'},
    {n: 2, pn: 1, sec: 's2', title: 'Alpha Desk', text: 'Alpha Desk\nModel | Wgt\nAB1000-RED | 25 lb'},
    {n: 3, pn: 2, sec: 's2', title: 'Alpha Desk sizes', text: 'Alpha Desk sizes\nAB1000 | 20 x 30\nAB1001 | 22 x 30'},
    {n: 4, pn: 3, sec: 's3', title: 'Beta Teacher Desk', text: 'Beta Teacher Desk\nBX2000 | teacher desk 30 x 60\nAB1000 | see also'},
    {n: 5, pn: 4, sec: 's4', title: 'Chair', text: 'Chair\nCH100A | chair 18 in'},
    {n: 6, pn: 5, sec: 's5', title: '5-Star Chair', text: '5-Star Chair\nCH100A-5 | star chair'},
    {n: 7, pn: 6, sec: 's6', title: 'Music Storage', text: 'Music Storage\nMS5000 | cabinet'},
    {n: 8, pn: 7, sec: 's7', title: 'Magazine Storage', text: 'Magazine Storage\nMM6000 | rack\nB1005 | rack small'},
    {n: 9, pn: 8, sec: 's8', title: 'Warranty', text: 'Warranty\nLimited lifetime warranty on laminate furniture. Claims within 30 days of delivery of damaged goods.'},
  ],
  headers: ['Model | Wgt'],
  products: [
    {c: 'AB1000-RED', p: 2, r: 'AB1000-RED | 25 lb', b: 'Alpha Desk', h: 0},
    {c: 'AB1000', p: 3, r: 'AB1000 | 20 x 30', x: 'laminate top'},
    {c: 'AB1001', p: 3, r: 'AB1001 | 22 x 30'},
    {c: 'BX2000', p: 4, r: 'BX2000 | teacher desk 30 x 60'},
    {c: 'AB1000', p: 4, r: 'AB1000 | see also | a|b'},
    {c: 'CH100A', p: 5, r: 'CH100A | chair 18 in'},
    {c: 'CH100A-5', p: 6, r: 'CH100A-5 | star chair'},
    {c: 'MS5000', p: 7, r: 'MS5000 | cabinet'},
    {c: 'MM6000', p: 8, r: 'MM6000 | rack'},
    {c: 'B1005', p: 8, r: 'B1005 | rack small'},
  ],
  index: [],
});

async function suite(M, label) {
  const ok = (cond, msg) => assert.ok(cond, label + ': ' + msg);
  const eq = (a, b, msg) => assert.deepEqual(a, b, label + ': ' + msg);
  const mk = (raw = fixture()) => ({ok: true, status: 200, json: async () => raw});

  // ---- the linking rows ----
  const row = (id, d, cat = 'VendorCatalog') => ({id, cat, content: typeof d === 'string' ? d : JSON.stringify(d)});
  const good = {vendorId: 'V-acme', vendorName: 'Acme Furniture', url: 'https://x.test/a.json'};
  const sops = [row('A', good), row('B', {...good, url: ''}), row('C', {vendorId: 'V-z', url: 'https://x.test/z.json'}), row('D', {...good, vendorId: 'V-other'}), row('E', '[1,2]'), row('F', 'not json'), row('G', good, 'Notes'), null];
  eq(M.catalogRecords(sops).map((r) => r.id), ['A', 'C', 'D'], 'only well-formed VendorCatalog rows link a catalogue (a row with no file address is ignored)');
  eq(M.catalogsForVendor(sops, 'V-acme').map((r) => r.id), ['A'], 'a vendor sees only its own catalogue');
  eq(M.catalogRecords(null), [], 'no rows is fine');

  // ---- loading ----
  M._resetCatalogCache();
  let calls = 0;
  const f1 = async () => { calls++; return mk(); };
  const rec = {url: 'https://x.test/a.json'};
  const [c1, c2] = await Promise.all([M.loadCatalog(rec, {fetchImpl: f1}), M.loadCatalog(rec, {fetchImpl: f1})]);
  await M.loadCatalog(rec, {fetchImpl: f1});
  eq(calls, 1, 'a catalogue file is fetched once however many times it is opened');
  ok(c1 === c2, 'the same prepared catalogue is shared');
  eq([c1.rows.length, c1.codeCount], [10, 9], 'every model row is loaded and distinct codes are counted');
  M._resetCatalogCache();
  let n = 0;
  const flaky = async () => { n++; return n === 1 ? {ok: false, status: 500} : mk(); };
  await assert.rejects(M.loadCatalog({url: 'https://x.test/b.json'}, {fetchImpl: flaky}), /HTTP 500/, label + ': a failed download says so');
  const again = await M.loadCatalog({url: 'https://x.test/b.json'}, {fetchImpl: flaky});
  ok(again && again.rows.length === 10, 'after a failed download the next try loads it (a failure is never remembered)');
  await assert.rejects(M.loadCatalog({url: 'https://x.test/c.json'}, {fetchImpl: async () => mk({...fixture(), v: 2})}), /Not a vendor catalogue/, label + ': a file that is not a catalogue is refused');
  await assert.rejects(M.loadCatalog({}, {fetchImpl: f1}), /No catalogue file address/, label + ': no address');

  const cat = again;
  // ---- search ----
  let r = M.searchCatalog(cat, 'AB1000');
  eq(r.rows.map((x) => x.code), ['AB1000', 'AB1000', 'AB1000-RED'], 'the exact model code comes first, then longer codes that start with it');
  eq([r.total, r.codes], [3, 2], 'totals count rows and distinct codes');
  r = M.searchCatalog(cat, 'b100');
  eq(r.rows[0].code, 'B1005', 'a code that starts with the search beats codes that only contain it');
  eq(r.rows.map((x) => x.code).sort(), ['AB1000', 'AB1000', 'AB1000-RED', 'AB1001', 'B1005'].sort(), 'codes that contain it follow');
  r = M.searchCatalog(cat, 'teacher desk 30');
  eq(r.rows.map((x) => x.code), ['BX2000'], 'words match against the whole row, section and page title');
  r = M.searchCatalog(cat, 'teacher zzzz');
  eq(r.total, 0, 'every word has to match');
  r = M.searchCatalog(cat, 'AB10', {limit: 1});
  eq([r.rows.length, r.total], [1, 4], 'the total covers every match even when fewer rows are shown');
  r = M.searchCatalog(cat, 'ch100a', {section: 'Chair'});
  eq(r.rows.map((x) => x.code), ['CH100A'], 'a section title that is exact does not pull in 5-Star Chair');
  r = M.searchCatalog(cat, 'ch100a', {section: 'Seating'});
  eq(r.rows.map((x) => x.code).sort(), ['CH100A', 'CH100A-5'], 'a group covers all its sections');
  r = M.searchCatalog(cat, '', {section: 'Storage'});
  eq(r.rows.map((x) => x.code), ['MS5000'], 'the group Storage does not pull in Media and Magazine Storage');
  r = M.searchCatalog(cat, '', {section: 'magazine'});
  eq(r.rows.map((x) => x.code).sort(), ['B1005', 'MM6000'], 'a loose word still finds a section');
  r = M.searchCatalog(cat, '');
  ok(r.error && r.total === 0, 'an empty search with no section asks for something to look for');
  r = M.searchCatalog(cat, 'warranty');
  eq(r.pages.map((p) => p.n), [9], 'words are also found in page text');
  ok(/warranty/i.test(r.pages[0].snippet) && r.pages[0].section === 'Warranty', 'the hit shows where it is');

  // ---- one model, one page ----
  let g = M.getProduct(cat, 'ab1000');
  ok(g.exact && g.rows.length === 2 && g.rows.every((x) => x.code === 'AB1000'), 'a model code is found any case, and an exact code is not mixed with longer ones');
  g = M.getProduct(cat, 'AB10');
  ok(!g.exact && g.rows.length === 4, 'part of a code lists the codes that start with it');
  eq(M.getProduct(cat, '  ').rows, [], 'a blank code finds nothing');
  const pg = M.getPage(cat, 3);
  eq([pg.n, pg.pn, pg.section, pg.group], [3, 2, 'Student Desks: Alpha Desk', 'Desks'], 'a page knows its printed number, section and group');
  eq(M.getPage(cat, 99), null, 'no such page');
  eq(M.getPage(cat, '4').title, 'Beta Teacher Desk', 'a page number may arrive as text');

  // ---- text for people and the Brain ----
  eq(M.pageRef({pdfUrl: 'https://x.test/a.pdf'}, 12), '[page 12](https://x.test/a.pdf#page=12)', 'a page reference opens that page of the PDF');
  eq(M.pageRef({}, 12), 'page 12', 'without a PDF it is still a page number');
  const split = {pdfParts: [{url: 'https://x.test/p1.pdf', from: 1, to: 59}, {url: 'https://x.test/p2.pdf', from: 60, to: 102}]};
  eq(M.pdfPageUrl(split, 61), 'https://x.test/p2.pdf#page=2', 'a split PDF opens the piece that holds the page, at that piece\'s own page number');
  eq(M.pdfPageUrl(split, 59), 'https://x.test/p1.pdf#page=59', 'the last page of a piece stays in that piece');
  eq(M.pdfPageUrl(split, 200), '', 'a page no piece holds has no link');
  eq(M.pageRef(split, 60), '[page 60](https://x.test/p2.pdf#page=1)', 'a page reference uses the right piece');
  eq(M.pdfLinks(split).map((l) => l.label), ['PDF pages 1-59', 'PDF pages 60-102'], 'each piece of a split PDF gets its own button');
  eq(M.pdfLinks({pdfUrl: 'https://x.test/a.pdf'}), [{label: 'Open PDF', url: 'https://x.test/a.pdf'}], 'one PDF, one button');
  eq(M.pdfLinks({}), [], 'no PDF, no button');
  eq(M.pageImageUrl({pageImgBase: 'https://x.test/pg/'}, 7), 'https://x.test/pg/p-007.jpg', 'a page picture has a numbered address');
  eq(M.pageImageUrl({}, 7), '', 'no pictures stored, no address');
  const crec = {vendorName: 'Acme Furniture', pageImgBase: 'https://x.test/pg/', pdfUrl: 'https://x.test/a.pdf'};
  const card = M.pageMarkdown(cat, crec, 3);
  ok(/^### Acme Furniture catalogue, page 3 \(printed page 2\): Alpha Desk sizes/.test(card), 'the page card names the catalogue, page, printed page and title');
  ok(/Section: Desks >> Student Desks: Alpha Desk\. This edition has no prices\./.test(card), 'the page card gives the section and says when there are no prices');
  ok(/\[Open page 3 in the PDF\]\(https:\/\/x\.test\/a\.pdf#page=3\)/.test(card), 'the page card links to that page of the PDF');
  ok(/\n!\[Page 3 of the Acme Furniture catalogue\]\(https:\/\/x\.test\/pg\/p-003\.jpg\)\n/.test(card), 'the page card shows the page picture on its own line');
  ok(/\| Model codes \| As printed \|/.test(card) && /\| AB1000 \| AB1000 \/ 20 x 30 \/ laminate top \|/.test(card) && /\| AB1001 \| AB1001 \/ 22 x 30 \|/.test(card), 'the page card lists the model rows on the page');
  ok(!/see also|CH100A|MS5000/.test(card.split('Everything printed')[0]), 'the page card lists only rows from that page');
  ok(/\*\*Everything printed on the page\*\*\nAlpha Desk sizes\nAB1000   20 x 30\nAB1001   22 x 30/.test(card), 'the page card carries every printed line, columns spaced apart');
  ok(/\n>> Show page 2 of the Acme Furniture catalogue\n>> Show page 4 of the Acme Furniture catalogue$/.test(card), 'the page card offers the previous and next pages');
  ok(!/!\[/.test(M.pageMarkdown(cat, {vendorName: 'Acme Furniture'}, 3)), 'no pictures stored, no picture line');
  ok(!/>> Show page 0/.test(M.pageMarkdown(cat, crec, 1)) && !/Show page 10/.test(M.pageMarkdown(cat, crec, 9)), 'the first page has no previous and the last has no next');
  eq(M.pageMarkdown(cat, crec, 99), '', 'a page that is not there gives nothing');
  const big = fixture(); big.pages[1].text = 'Alpha Desk\n' + 'x'.repeat(20000);
  M._resetCatalogCache();
  const bigCat = await M.loadCatalog({url: 'https://x.test/big.json'}, {fetchImpl: async () => mk(big)});
  const bigCard = M.pageMarkdown(bigCat, crec, 2);
  ok(bigCard.length < 15000 && /The page text was cut here/.test(bigCard), 'a very long page is cut with a note so the Brain can still answer');
  const md = M.rowsToMarkdown(M.getProduct(cat, 'AB1000').rows, {});
  ok(md.split('\n').every((l) => l.split('|').length === 6), 'a pipe inside a row never breaks the table');
  ok(/\| AB1000 \| page 3 \| Student Desks: Alpha Desk \|/.test(md), 'the table gives model, page and section');
  const ov = M.overviewMarkdown(cat, {});
  ok(/Acme 2026 Catalog/.test(ov) && /edition 2026-01-01/.test(ov), 'overview names the catalogue');
  ok(/Page numbers are PDF pages \(the printed page number is the PDF page minus 2\)/.test(ov), 'overview explains the page numbers');
  ok(/No prices appear in this edition/.test(ov), 'overview says there are no prices');
  ok(/Student Desks: Alpha Desk \(pages 2-3, 3 model rows\)/.test(ov), 'overview lists sections with page ranges and row counts');
  eq(M.promptLine([]), '', 'no catalogue, nothing added to the Brain prompt');
  const pl = M.promptLine([{vendorName: 'Acme Furniture', title: 'Acme 2026 Catalog', edition: '2026-01-01', pageCount: 9, productCount: 10, hasPrices: false, groups: ['Desks', 'Seating']}]);
  ok(/VENDOR CATALOGUES: Acme Furniture: Acme 2026 Catalog/.test(pl) && /, no prices; covers Desks, Seating/.test(pl) && /search_vendor_catalog/.test(pl) && /Never answer with only a page number/.test(pl), 'the Brain is told what catalogues exist, that there are no prices, and to give the real details instead of a page number');
  const pro = M.profileMarkdown(cat);
  ok(/### Page 1: Welcome to Acme/.test(pro) && /### Page 9: Warranty/.test(pro) && /lifetime warranty/.test(pro), 'company pages come out whole');
}

if (!mutant) { await suite(require(outs[0]), 'real'); console.log('PASS vendor catalogue module on a synthetic catalogue (loading, caching, search ranking, sections, models, pages, text)'); }
else {
  let failed = 0;
  for (let i = 0; i < MUTANTS.length; i++) {
    try { await suite(require(outs[i]), 'mutant ' + MUTANTS[i][0]); console.log('SURVIVED ' + MUTANTS[i][0]); } catch (e) { failed++; console.log('killed ' + MUTANTS[i][0] + ' <- ' + String(e.message).split('\n')[0].slice(0, 90)); }
  }
  process.exit(failed === MUTANTS.length ? 1 : 0);
}
