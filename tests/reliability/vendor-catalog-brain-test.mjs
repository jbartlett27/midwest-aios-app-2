import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// The real Vendor360Page, BrainPage and PlaybookPage, mounted in jsdom with a synthetic vendor catalogue.
// No client data, no network: fetch is replaced by an in-memory fake and the catalogue is made up.
const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['vendor page shows the catalogue', '<VendorCatalogPanel key={vend.id} vendor={vend} customSops={customSops} setPage={setPage} addSop={addSop} notify={notify}/>', ''],
  ['a vendor only sees its own catalogue', 'catalogsForVendor(customSops,vendor.id).slice()', 'catalogRecords(customSops).slice()'],
  ['catalogue tools registered as read-only', "'recent_actions','list_vendor_catalogs','search_vendor_catalog','get_catalog_product','read_catalog_page']);", "'recent_actions']);"],
  ['Brain told about the catalogues', '+ catLine + filesLine +', '+ filesLine +'],
  ['catalogue rows hidden from the Playbook', '"Invoice","VendorBill","VendorCatalog"]);', '"Invoice","VendorBill"]);'],
  ['product lookup finds the page', 'const g = vcProduct(p.cat, code);', 'const g = vcProduct(p.cat, code + "zz");'],
  ['the vendor page shows the whole page text', '{pg.text}</pre>', "{''}</pre>"],
  ['catalogue link rows kept out of the Brain procedure list', '"HistoricalDoc","Settings","VendorCatalog"].includes(s.cat)', '"HistoricalDoc","Settings"].includes(s.cat)'],
  ['the vendor page shows the page picture', '{vcImg(rec,pg.n)&&<a href=', '{false&&<a href='],
  ['the Brain chat shows a catalogue page picture', 'if(_im)result.push(', 'if(false)result.push('],
  ['the Brain can look at a page picture when asked', 'if(ok&&r&&Array.isArray(r.images)&&r.images.length)o.content=', 'if(false)o.content='],
  ['the Brain gets a private note on how to answer', 'if(ok&&r&&r.modelNote)t+=', 'if(false&&r&&r.modelNote)t+='],
  ['a words search shows the best page in full', "if (_top) msg += '\\n\\n'+vcPageCard(p.cat, p.rec, _top);", ''],
  ['every catalogue answer names the PDF pieces', "vcPdfLinks(rec).map(l=>' ['+l.label+']('+l.url+')').join('')", "''"],
  ['the vendor page opens each PDF', '{vcPdfLinks(rec).map(l=><Btn', '{[].map(l=><Btn'],
  ['two catalogues need a vendor name', "else if(m.length>1)return {error:'More than one catalogue is loaded.", "else if(false)return {error:'More than one catalogue is loaded."],
  ['the Directory offers a catalogue upload per vendor', 'e.stopPropagation();setCatUp(r)', 'e.stopPropagation();void 0'],
  ['a vendor with no catalogue offers to upload one', '<Btn onClick={()=>setShowUp(true)}>Upload catalogue</Btn>', ''],
  ['an upload saves the link row to the vendor', "addSop({id:out.id,title:out.rec.title,cat:'VendorCatalog',icon:'book'", "(()=>{})({id:out.id,title:out.rec.title,cat:'VendorCatalog',icon:'book'"],
  ['the edition date is checked before an upload starts', 'if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(edition.trim())){setErr(', 'if(false){setErr('],
  ['the Stop button stops an upload', '<Btn v="secondary" onClick={()=>{stopRef.current=true}}>Stop</Btn>', '<Btn v="secondary" onClick={()=>{}}>Stop</Btn>'],
  ['the upload shows what it is doing', '<span>{prog.message}</span>', "<span>{''}</span>"],
  ['upload warnings are shown', '{res.warnings.map((w,i)=>', '{[].map((w,i)=>'],
  ['a catalogue-sized PDF is never sent to the model', 'brainFile.size > 25 * 1024 * 1024', 'brainFile.size > 25000 * 1024 * 1024'],
  ['a finished upload opens the vendor page', 'window._viewVendorId=vendor.id;setPage("vendor360");onClose()', 'window._viewVendorId=vendor.id;setPage("brain");onClose()'],
  ['only the office loads catalogues through the Brain', "if (_bkRole === 'sales') return {error: 'Only the office can load vendor catalogues.'};", ''],
  ['the Brain says when no PDF is attached', "if (!f) return {error: 'No catalogue PDF is attached.", "if (false) return {error: 'No catalogue PDF is attached."],
  ['the Brain needs a vendor that is in the Directory', "if (!hits.length) return {error: 'No vendor named", "if (false) return {error: 'No vendor named"],
  ['the Brain will not guess between two vendors', "if (hits.length > 1) return {error: 'More than one vendor matches", "if (false) return {error: 'More than one vendor matches"],
];
const src = '../../src';
const chartNames = [...new Set(['App.jsx', 'App2.jsx', 'App3.jsx'].flatMap((f) => [...fs.readFileSync(src + '/' + f, 'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*["']recharts["']/g)].flatMap((m) => m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]))))];
const stubs = {
  clerk: 'export const ClerkProvider=({children})=>children;export const useUser=()=>({isLoaded:true,isSignedIn:false,user:null});export const useClerk=()=>({signOut:()=>{}});export const useAuth=()=>({getToken:async()=>null});export const SignIn=()=>null;export const UserButton=()=>null;',
  recharts: chartNames.map((n) => 'export const ' + n + '=()=>null;').join('\n'),
  xlsx: 'export const read=(...a)=>globalThis.__XLSX.read(...a);export const utils={sheet_to_json:(...a)=>globalThis.__XLSX.utils.sheet_to_json(...a)};export default {read,utils};',
  db: 'export const db=globalThis.__db;',
  ci: "export const ingestCatalog=(a)=>globalThis.__ciIngest(a);export const todayLocal=()=>'2026-11-06';",
};
if (mutantIdx >= 0) assert.ok(fs.readFileSync(src + '/App2.jsx', 'utf8').includes(MUTANTS[mutantIdx][1]), 'mutation anchor missing: ' + MUTANTS[mutantIdx][0]);
await build({entryPoints: [src + '/App2.jsx'], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/client'], define: {'import.meta.env': '{}'}, outfile: 'vendor-catalog-bundle-ui.cjs', plugins: [{name: 'offline-only', setup(b) {
  if (mutantIdx >= 0) b.onLoad({filter: /App2\.jsx$/}, async (a) => ({contents: fs.readFileSync(a.path, 'utf8').replace(MUTANTS[mutantIdx][1], MUTANTS[mutantIdx][2]), loader: 'jsx', resolveDir: src}));
  b.onResolve({filter: /^(@clerk\/clerk-react|recharts|xlsx)$/}, (a) => ({path: a.path, namespace: 'stub'}));
  b.onResolve({filter: /supabase\.js$/}, () => ({path: 'db', namespace: 'stub'}));
  b.onResolve({filter: /catalogIngest\.js$/}, () => ({path: 'ci', namespace: 'stub'}));
  b.onLoad({filter: /.*/, namespace: 'stub'}, (a) => ({contents: a.path === '@clerk/clerk-react' ? stubs.clerk : a.path === 'recharts' ? stubs.recharts : a.path === 'xlsx' ? stubs.xlsx : a.path === 'ci' ? stubs.ci : stubs.db, loader: 'js'}));
}}]});

const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost/'});
Object.assign(globalThis, {FileReader: dom.window.FileReader, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (f) => setTimeout(() => f(performance.now() + 1000), 0), cancelAnimationFrame: clearTimeout});
window.matchMedia = () => ({matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}});
globalThis.matchMedia = window.matchMedia;
Object.defineProperty(globalThis, 'navigator', {value: window.navigator, configurable: true});
globalThis.__db = new Proxy({fetchPeriodLocks: async () => []}, {get: (o, k) => o[k] || (async () => ({ok: true}))});
const errors = []; const origErr = console.error; console.error = (...a) => { const m = a.map(String).join(' '); if (process.env.DBG && /toLowerCase/.test(m)) console.log('DBGERR', a.map((x) => (x && x.stack) || String(x)).join('\n').slice(0, 900)); if (/same key|unique "key"/i.test(m)) errors.push(m); };
const require = createRequire(import.meta.url);
const React = require('react'); const {act} = React; const {createRoot} = require('react-dom/client');

const {Vendor360Page, BrainPage, PlaybookPage, DirectoryPage} = require('./vendor-catalog-bundle-ui.cjs');

// ---- synthetic catalogues (fake vendors) ----
const catFile = (vendorId, vendorName, title, pre) => ({
  v: 1, vendorId, vendorName, title, edition: '2026-01-01', hasPrices: false, pageOffset: 2, pageCount: 9,
  company: {name: vendorName + ' Co', phone: '555.0100', address: '1 Main St, Springfield'}, profilePages: [1, 9], notes: [],
  sections: [
    {id: 's1', group: 'Front matter', title: 'Welcome', page: 1, end: 1, products: false},
    {id: 's2', group: 'Desks', title: 'Student Desks: Alpha Desk', page: 2, end: 4, products: true},
    {id: 's4', group: 'Seating', title: 'Chair', page: 5, end: 6, products: true},
    {id: 's8', group: 'Reference', title: 'Warranty', page: 7, end: 9, products: false},
  ],
  pages: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({n, pn: n > 1 ? n - 1 : null, sec: n === 1 ? 's1' : n <= 4 ? 's2' : n <= 6 ? 's4' : 's8', title: n === 9 ? 'Warranty' : n === 3 ? 'Alpha Desk sizes' : pre + ' page ' + n, text: n === 9 ? 'Warranty\nLimited lifetime warranty on laminate furniture.' : n === 3 ? 'Alpha Desk sizes\nAB1000 | 20 x 30\nAB1001 | 22 x 30' : pre + ' page ' + n + '\nsome text'})),
  headers: ['Model | Wgt'],
  products: [{c: pre + 'DESK1', p: 2, r: pre + 'DESK1 | 25 lb', b: 'Alpha Desk', h: 0}, {c: 'AB1000', p: 3, r: 'AB1000 | 20 x 30'}, {c: 'AB1001', p: 3, r: 'AB1001 | 22 x 30'}, {c: 'CH100A', p: 5, r: 'CH100A | chair 18 in'}, {c: 'CH100B', p: 6, r: 'CH100B | chair 20 in'}],
  index: [],
});
const rec = (vendorId, vendorName, title, url, extra = {}) => ({vendorId, vendorName, title, edition: '2026-01-01', url, pdfUrl: url.replace('.json', '.pdf'), pageCount: 9, productCount: 5, sectionCount: 4, groups: ['Desks', 'Seating'], hasPrices: false, ...extra});
const linkSop = (id, d) => ({id, title: d.title, cat: 'VendorCatalog', content: JSON.stringify(d), custom: true});
const ACME = linkSop('VCAT-1', rec('V-acme', 'Acme Furniture', 'Acme 2026 Catalog', 'https://files.test/acme.json', {pageImgBase: 'https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/public/vendor-invoices/catalogs/V-acme/acme/pages/'}));
const ZETA = linkSop('VCAT-2', rec('V-zeta', 'Zeta Supply', 'Zeta Priced Catalog', 'https://files.test/zeta.json', {hasPrices: true, pdfUrl: '', pdfParts: [{url: 'https://files.test/z1.pdf', from: 1, to: 5}, {url: 'https://files.test/z2.pdf', from: 6, to: 9}]}));
const BROKEN = linkSop('VCAT-3', rec('V-acme', 'Acme Furniture', 'Acme Broken', 'https://files.test/missing.json'));
const files = {'https://files.test/acme.json': catFile('V-acme', 'Acme Furniture', 'Acme 2026 Catalog', 'AC'), 'https://files.test/zeta.json': {...catFile('V-zeta', 'Zeta Supply', 'Zeta Priced Catalog', 'ZE'), hasPrices: true}};
let fetchLog = []; let opened = []; let brainPlan = []; let brainBodies = [];
globalThis.fetch = async (url, opts) => {
  fetchLog.push(String(url));
  if (String(url) === '/api/brain') { brainBodies.push(JSON.parse(opts.body)); const step = brainPlan.shift() || {content: [{type: 'text', text: 'done'}], stop_reason: 'end_turn'}; return {ok: true, status: 200, headers: {get: () => 'application/json'}, json: async () => step}; }
  if (files[url]) return {ok: true, status: 200, json: async () => files[url]};
  return {ok: false, status: 404};
};
window.open = (...a) => { opened.push(a); return null; };
const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
const selSet = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
async function typeInto(el, value) { el.focus(); await act(async () => { set.call(el, value); el.dispatchEvent(new window.Event('input', {bubbles: true})); }); }
async function pick(el, value) { await act(async () => { selSet.call(el, value); el.dispatchEvent(new window.Event('change', {bubbles: true})); }); }
const settle = async () => { for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const unmount = async (root) => { await act(async () => root.unmount()); document.body.innerHTML = '<div id="root"></div>'; };
const btn = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent));
const text = () => document.body.textContent;

// ---- the vendor page ----
const vendors = [{id: 'V-acme', name: 'Acme Furniture', contact: 'Pat', email: 'pat@acme.test', phone: '555.0100', category: 'Furniture'}, {id: 'V-plain', name: 'Plain Co', contact: 'Sam', email: '', phone: '', category: 'Misc'}];
let pagesVisited = [];
async function mountVendor(vendorId, customSops, addSop = () => {}) {
  window._viewVendorId = vendorId;
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Vendor360Page, {jobs: [], lineItems: [], vendors, customers: [], reps: [], getJobFinancials: () => ({}), getJobItems: () => [], setPage: (p) => pagesVisited.push(p), setSelectedJob() {}, notify() {}, updateVendor() {}, jobNum: () => '', customSops, addSop, deleteSop() {}, setFocusSopId() {}})));
  await settle(); return root;
}
let root = await mountVendor('V-acme', [ACME, ZETA]);
assert.match(text(), /Vendor Catalogue/, 'the vendor page shows the catalogue linked to the vendor');
assert.match(text(), /Acme 2026 Catalog/); assert.match(text(), /edition 2026-01-01 \| 9 pages \| 5 model rows \| no prices in this edition/);
assert.doesNotMatch(text(), /Zeta Priced Catalog/, 'another vendor\'s catalogue never shows on this vendor\'s page');
assert.match(text(), /Acme Furniture Co \| 1 Main St, Springfield \| 555\.0100/, 'the catalogue\'s own company details show');
assert.match(text(), /Student Desks: Alpha Desk\s*p\.2-4/, 'every section is listed with its pages');
assert.ok(btn(/Open PDF/), 'a stored PDF can be opened'); await act(async () => btn(/Open PDF/).click()); assert.equal(opened[0][0], 'https://files.test/acme.pdf');
await act(async () => btn(/Ask the Brain/).click()); assert.deepEqual(pagesVisited, ['brain'], 'Ask the Brain goes to the Brain page');
const box = document.querySelector('input[placeholder^="Model code or words"]'); assert.ok(box, 'search box');
await typeInto(box, 'AB1000'); await settle();
assert.match(text(), /1 model row \(1 distinct model code\)/); assert.match(text(), /AB1000/);
await typeInto(box, 'DESK1'); await settle();
assert.match(text(), /ACDESK1/); assert.match(text(), /Alpha Desk >> ACDESK1 \| 25 lb/, 'the product name shows with its row');
await typeInto(box, 'AB10'); await settle();
const link3 = [...document.querySelectorAll('td span')].find((s) => s.textContent === 'p.3'); assert.ok(link3, 'a result links to its page'); await act(async () => link3.click());
assert.match(text(), /Page 3 \(printed 2\): Alpha Desk sizes/, 'opening a result shows the whole page'); assert.ok(document.querySelector('img[src$="/pages/p-003.jpg"]'), 'the page picture shows beside the page text'); assert.match(text(), /AB1001 \| 22 x 30/); assert.equal(document.querySelector('pre').textContent, 'Alpha Desk sizes\nAB1000 | 20 x 30\nAB1001 | 22 x 30', 'the whole printed page text shows, line for line');
await act(async () => btn(/This page in the PDF/).click()); assert.equal(opened[1][0], 'https://files.test/acme.pdf#page=3', 'the PDF opens at that page');
await act(async () => btn(/^Next$/).click()); assert.match(text(), /Page 4/, 'Next turns the page');
await act(async () => btn(/^Close$/).click()); assert.doesNotMatch(text(), /Page 4/);
await typeInto(box, ''); await settle();
await pick(document.querySelector('select'), 'Seating'); await settle();
assert.match(text(), /2 model rows/, 'choosing a section lists its models'); assert.match(text(), /CH100A/); assert.match(text(), /CH100B/); assert.doesNotMatch(text(), /AB1001/);
await act(async () => btn(/^Clear$/).click()); await settle(); assert.match(text(), /Student Desks: Alpha Desk\s*p\.2-4/, 'Clear goes back to the section list');
await typeInto(box, 'warranty'); await settle(); assert.match(text(), /Pages that mention it \(1\)/); assert.match(text(), /Limited lifetime warranty/);
await unmount(root);
// ---- the upload dialog (the real ingest engine is replaced by a fake that the test controls) ----
let ciArgs = []; let ciRelease = null; let ciFail = null; let ciSawStop = null; const saved = [];
const ciOut = (a) => ({id: 'VCAT-' + a.vendor.id + '-' + (a.edition || '2026-11-06').slice(0, 4), rec: {vendorId: a.vendor.id, vendorName: a.vendor.name, title: a.title || 'Untitled', edition: a.edition || '2026-11-06', hasPrices: true, pageCount: 12}, stats: {pages: 12, rows: 40, codes: 38, sections: 5, priceFigures: 77, images: 12, pdfPieces: 3}, warnings: ['Pages 9-10 had no readable text.']});
globalThis.__ciIngest = (a) => {
  ciArgs.push(a); a.onProgress({stage: 'pages', done: 5, total: 10, message: 'Reading page 5 of 10...'});
  return new Promise((res, rej) => { ciRelease = () => { ciSawStop = typeof a.isCancelled === 'function' ? a.isCancelled() : null; if (ciFail) rej(new Error(ciFail)); else res(ciOut(a)); }; });
};
const pickFile = async (f) => { const inp = document.querySelector('input[type=file][accept=".pdf,application/pdf"]'); Object.defineProperty(inp, 'files', {value: [f], configurable: true}); await act(async () => { inp.dispatchEvent(new window.Event('change', {bubbles: true})); }); };
const bigPdf = (name, mb) => ({name, size: Math.round(mb * 1048576), type: 'application/pdf'});
root = await mountVendor('V-plain', [ACME, ZETA], (x) => saved.push(x));
assert.doesNotMatch(text(), /Acme 2026 Catalog/, 'another vendor\'s catalogue never shows on a vendor with none');
assert.match(text(), /No catalogue loaded for this vendor yet/, 'a vendor with no catalogue says so'); assert.ok(btn(/^Upload catalogue$/), 'and offers the upload');
await act(async () => btn(/^Upload catalogue$/).click());
assert.match(text(), /Upload catalogue >> Plain Co/, 'the dialog names the vendor');
await pickFile(bigPdf('Plain 2026 Full Line.pdf', 148));
assert.equal(document.querySelector('input[placeholder="2026 Full Line Catalog"]').value, 'Plain 2026 Full Line', 'the title is filled from the file name'); assert.match(text(), /148\.0 MB/, 'the file size shows');
const edIn = document.querySelector('input[placeholder="2026-07-31"]'); assert.equal(edIn.value, '2026-11-06', 'the edition starts as today');
await typeInto(edIn, 'next week'); await act(async () => btn(/^Upload$/).click());
assert.match(text(), /Edition date must look like 2026-07-31\./, 'a bad edition date is refused'); assert.equal(ciArgs.length, 0, 'and nothing is read');
await typeInto(edIn, '2026-11-06'); await pick(document.querySelectorAll('select')[document.querySelectorAll('select').length - 1], 'yes');
await act(async () => btn(/^Upload$/).click()); await settle();
assert.equal(ciArgs.length, 1, 'Upload starts the reading'); assert.equal(ciArgs[0].vendor.id, 'V-plain'); assert.equal(ciArgs[0].title, 'Plain 2026 Full Line'); assert.equal(ciArgs[0].edition, '2026-11-06'); assert.equal(ciArgs[0].hasPrices, 'yes', 'the prices choice is passed on'); assert.equal(ciArgs[0].file.size, 148 * 1048576, 'the big file itself is handed over');
assert.match(text(), /Reading page 5 of 10\.\.\./, 'the page being read shows'); assert.match(text(), /40%/, 'the bar moves with the pages'); assert.match(text(), /Working\.\.\./);
await act(async () => btn(/^Stop$/).click()); await act(async () => { ciRelease(); }); await settle();
assert.equal(ciSawStop, true, 'Stop reaches the reader');
assert.equal(saved.length, 1, 'the finished catalogue is linked to the vendor once'); assert.equal(saved[0].id, 'VCAT-V-plain-2026'); assert.equal(saved[0].cat, 'VendorCatalog'); assert.equal(saved[0].custom, true); assert.equal(JSON.parse(saved[0].content).vendorId, 'V-plain', 'the saved row names the vendor');
assert.match(text(), /Loaded: Plain 2026 Full Line/); assert.match(text(), /12 pages, 40 model rows \(38 distinct codes\), 5 sections/); assert.match(text(), /Prices found \(77 dollar figures read\)/); assert.match(text(), /the PDF is kept in 3 pieces/); assert.match(text(), /Pages 9-10 had no readable text\./, 'a warning from the reader shows'); assert.match(text(), /The Brain can read it now/);
await unmount(root);
// a failed reading shows the reason and saves nothing
saved.length = 0; ciFail = 'The PDF is damaged.';
root = await mountVendor('V-plain', [], (x) => saved.push(x));
await act(async () => btn(/^Upload catalogue$/).click()); await pickFile(bigPdf('bad.pdf', 3));
await act(async () => btn(/^Upload$/).click()); await settle(); await act(async () => { ciRelease(); }); await settle();
assert.match(text(), /The PDF is damaged\./, 'a failure says why'); assert.equal(saved.length, 0, 'a failed reading links nothing'); assert.ok(btn(/^Upload$/), 'and the form is still there to try again');
await unmount(root); ciFail = null;
// a vendor that already has a catalogue lists it in the dialog
root = await mountVendor('V-acme', [ACME], () => {});
await act(async () => btn(/^Upload catalogue$/).click()); assert.match(text(), /Already loaded: Acme 2026 Catalog \(edition 2026-01-01\)/, 'the dialog lists what is already loaded');
await unmount(root);

// ---- the Directory ----
{
  const saved2 = []; const dirPages = [];
  const mountDir = async (props) => { const r = createRoot(document.getElementById('root')); await act(async () => r.render(React.createElement(DirectoryPage, {customSops: [ACME], addSop: (x) => saved2.push(x), vendors, customers: [], reps: [], updateVendor() {}, addVendor() {}, deleteVendor() {}, forceDeleteVendor() {}, forceDeleteCustomer() {}, forceDeleteRep() {}, updateCustomer() {}, addCustomer() {}, deleteCustomer() {}, updateRep() {}, addRep() {}, deleteRep() {}, notify() {}, jobs: [], lineItems: [], getJobFinancials: () => ({}), getJobItems: () => [], setPage: (p) => dirPages.push(p), confirm: async () => true, ...props}))); await settle(); return r; };
  const r = await mountDir({});
  const dbtn = (re) => [...document.querySelectorAll('tbody button')].filter((b) => re.test(b.textContent));
  assert.equal(dbtn(/^\+ Catalogue$/).length, 1, 'a vendor with no catalogue gets "+ Catalogue"'); assert.equal(dbtn(/^Catalogue$/).length, 1, 'a vendor that has one gets "Catalogue"');
  await act(async () => dbtn(/^\+ Catalogue$/)[0].click()); assert.match(text(), /Upload catalogue >> Plain Co/, 'the button opens the upload for that vendor'); assert.doesNotMatch(text(), /Already loaded/);
  await pickFile(bigPdf('plain.pdf', 160)); ciArgs = []; await act(async () => btn(/^Upload$/).click()); await settle(); await act(async () => { ciRelease(); }); await settle();
  assert.equal(saved2.length, 1, 'uploading from the Directory links the catalogue to that vendor'); assert.equal(JSON.parse(saved2[0].content).vendorId, 'V-plain'); assert.equal(ciArgs[0].file.size, 160 * 1048576, 'a 160 MB PDF is accepted');
  assert.ok(btn(/^Ask the Brain$/), 'a finished upload offers the Brain'); await act(async () => btn(/^Open vendor page$/).click()); assert.equal(window._viewVendorId, 'V-plain', 'Open vendor page selects that vendor'); assert.deepEqual(dirPages, ['vendor360'], 'and goes to the vendor page'); assert.doesNotMatch(text(), /Upload catalogue >> Plain Co/, 'the dialog closes');
  await act(async () => dbtn(/^Catalogue$/)[0].click()); assert.match(text(), /Upload catalogue >> Acme Furniture/); assert.match(text(), /Already loaded: Acme 2026 Catalog/);
  await act(async () => btn(/^Cancel$/).click()); assert.doesNotMatch(text(), /Upload catalogue >> Acme Furniture/, 'Cancel leaves the dialog');
  await unmount(r);
  const r2 = await mountDir({addSop: undefined}); assert.equal(dbtn(/Catalogue/).length, 0, 'without a way to save, no catalogue button is shown'); await unmount(r2);
}
root = await mountVendor('V-acme', [BROKEN]);
assert.match(text(), /Could not open the catalogue file \(HTTP 404\)/, 'a file that will not load says so plainly'); assert.ok(/Try again/.test(text()));
await unmount(root);

// ---- the Playbook never lists the linking rows ----
{
  const r = createRoot(document.getElementById('root'));
  await act(async () => r.render(React.createElement(PlaybookPage, {jobs: [], reps: [], vendors, customers: [], lineItems: [], getJobFinancials: () => ({}), setPage() {}, customSops: [ACME, {id: 'SOP-9', title: 'Zebra Procedure', cat: 'Process', content: 'STEP ONE\n\nDo it.', custom: true}], addSop() {}, deleteSop() {}, notify() {}})));
  await settle();
  assert.match(text(), /Zebra Procedure/, 'control: the Playbook shows ordinary procedures');
  assert.doesNotMatch(text(), /Acme 2026 Catalog/, 'the Playbook does not list a vendor catalogue link row');
  await unmount(r);
}

// ---- Brain ----
const brainBase = {jobs: [], reps: [], lineItems: [], vendors: [], customers: [], getJobFinancials: () => ({totalRevenue: 0, totalCost: 0, margin: 0, totalOrdered: 0, totalReceived: 0}), getJobItems: () => [], _commissionFor: () => 0, _bankTxnHash: () => '', setBrainQuery: () => {}, addSop: () => {}, deleteSop: () => {}, updateJob: () => {}, addJob: () => {}, updateLineItem: () => {}, addLineItem: () => {}, deleteLineItem: () => {}, updateRep: () => {}, addRep: () => {}, addCustomer: () => {}, updateCustomer: () => {}, addVendor: () => {}, updateVendor: () => {}, notify: () => {}, setPage: () => {}, deleteJob: () => {}, pendingBrainFile: null, setPendingBrainFile: () => {}, pendingBrainEmail: null, setPendingBrainEmail: () => {}, lineItemShipTos: {}, jobReportDate: () => '', setJobs: () => {}, forceDeleteLineItem: () => {}, forceDeleteCustomer: () => {}, forceDeleteVendor: () => {}, forceDeleteRep: () => {}, confirmJobId: async () => true};
function Host(props) { const [h, setH] = React.useState([]); const [l, setL] = React.useState(false); return React.createElement(BrainPage, {...brainBase, ...props, brainHistory: h, setBrainHistory: setH, brainLoading: l, setBrainLoading: setL}); }
async function askBrain(role, customSops, question, tools, finalText) {
  brainPlan = tools.map((t, i) => ({content: [{type: 'tool_use', id: 'tu' + i, name: t[0], input: t[1]}], stop_reason: 'tool_use'})); brainBodies = [];
  if (finalText) brainPlan.push({content: [{type: 'text', text: finalText}], stop_reason: 'end_turn'});
  const r = createRoot(document.getElementById('root'));
  await act(async () => r.render(React.createElement(Host, {customSops, currentUser: {name: 'Tester', email: 'tester@example.test', role}, userRole: role, brainQuery: question})));
  const input = document.querySelector('input[placeholder]:not([type=file])') || document.querySelector('input'); assert.ok(input, 'brain input');
  await act(async () => { input.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); }); await settle(); await settle();
  const results = brainBodies.flatMap((b) => b.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : []).filter((c) => c.type === 'tool_result')));
  const out = {html: document.body.innerHTML, bodies: brainBodies, results: [...new Map(results.map((x) => [x.tool_use_id, x])).values()]};
  await unmount(r); return out;
}
const ok1 = (res) => { assert.ok(res.results.length && !res.results[0].is_error, 'tool ran: ' + JSON.stringify(res.results[0])); return res.results[0].content; };
const bad1 = (res, re) => { assert.ok(res.results.length, 'tool ran'); assert.equal(res.results[0].is_error, true, res.results[0].content); assert.match(res.results[0].content, re); };

let res = await askBrain('admin', [ACME], 'what does the Acme catalogue cover', [['list_vendor_catalogs', {}]], 'It covers desks and seating.');
assert.ok(res.bodies.length >= 2, 'the Brain called the tool and then answered');
assert.doesNotMatch(res.bodies[0].system, /\[VendorCatalog\]/, 'the catalogue link row is not listed as a procedure');
assert.match(res.bodies[0].system, /VENDOR CATALOGUES: Acme Furniture: Acme 2026 Catalog \(edition 2026-01-01, 9 pages, 5 model rows, no prices; covers Desks, Seating\)/, 'the Brain is told which catalogues exist');
for (const n of ['list_vendor_catalogs', 'search_vendor_catalog', 'get_catalog_product', 'read_catalog_page']) assert.ok(res.bodies[0].tools.some((t) => t.name === n), n + ' is offered to the Brain');
let t0 = ok1(res);
assert.match(t0, /- Welcome \(page 1\)/); assert.match(t0, /Acme 2026 Catalog/); assert.match(t0, /Page numbers are PDF pages \(the printed page number is the PDF page minus 2\)/); assert.match(t0, /Student Desks: Alpha Desk \(pages 2-4, 3 model rows\)/);
assert.match(t0, /Source: Acme Furniture >> Acme 2026 Catalog \(edition 2026-01-01\)\. Page numbers are PDF pages\. \[Open PDF\]\(https:\/\/files\.test\/acme\.pdf\)/, 'every catalogue answer cites the catalogue');
res = await askBrain('admin', [ACME], 'warranty', [['list_vendor_catalogs', {topic: 'warranty'}]]);
t0 = ok1(res); assert.match(t0, /### Page 9: Warranty/); assert.match(t0, /Limited lifetime warranty on laminate furniture/);
res = await askBrain('admin', [ACME], 'find AB1000', [['search_vendor_catalog', {query: 'AB1000'}]]);
t0 = ok1(res); assert.match(t0, /\*\*1 model row\*\* \(1 distinct model code\)/); assert.match(t0, /\| AB1000 \| \[page 3\]\(https:\/\/files\.test\/acme\.pdf#page=3\) \| Student Desks: Alpha Desk \| AB1000 \/ 20 x 30 \|/, 'a model row gives its page as a link into the PDF'); assert.match(t0, /Pages that mention it \(1\)/);
res = await askBrain('admin', [ACME], 'chairs', [['search_vendor_catalog', {query: '', section: 'Seating'}]]);
t0 = ok1(res); assert.match(t0, /\*\*2 model rows\*\*/); assert.match(t0, /CH100A/); assert.match(t0, /CH100B/);
res = await askBrain('admin', [ACME], 'nothing', [['search_vendor_catalog', {query: 'zzzz'}]]);
t0 = ok1(res); assert.match(t0, /Nothing in the Acme Furniture catalogue matches "zzzz"/);
res = await askBrain('admin', [ACME], 'blank', [['search_vendor_catalog', {query: ''}]]); bad1(res, /model code or words/);
res = await askBrain('admin', [ACME], 'one model', [['get_catalog_product', {code: 'acdesk1'}]]);
t0 = ok1(res); assert.match(t0, /\*\*ACDESK1\*\* is in 1 row/); assert.match(t0, /Column headings printed above those rows:\n- Model \| Wgt/); assert.match(t0, /Alpha Desk >> ACDESK1 \/ 25 lb/);
res = await askBrain('admin', [ACME], 'part code', [['get_catalog_product', {code: 'CH100'}]]);
t0 = ok1(res); assert.match(t0, /No exact match for "CH100"\. 2 rows start with it/);
res = await askBrain('admin', [ACME], 'no such model', [['get_catalog_product', {code: 'NOPE9'}]]); bad1(res, /No model code "NOPE9" in the Acme Furniture catalogue/);
res = await askBrain('admin', [ACME], 'no code', [['get_catalog_product', {code: ' '}]]); bad1(res, /Give the model code/);
res = await askBrain('admin', [ACME], 'page 9', [['read_catalog_page', {page: 9}]]);
t0 = ok1(res); assert.match(t0, /### Acme Furniture catalogue, page 9 \(printed page 8\): Warranty\nSection: Reference >> Warranty/); assert.match(t0, /Limited lifetime warranty on laminate furniture\./, 'the page text is given whole');
res = await askBrain('admin', [ACME], 'page 99', [['read_catalog_page', {page: 99}]]); bad1(res, /has pages 1 to 9/);
res = await askBrain('admin', [ACME], 'page x', [['read_catalog_page', {page: 'abc'}]]); bad1(res, /PDF page number/);
res = await askBrain('admin', [ACME], 'wrong vendor', [['search_vendor_catalog', {query: 'AB1000', vendor: 'Nope Co'}]]); bad1(res, /No catalogue matches "Nope Co"\. Loaded: Acme Furniture\./);
res = await askBrain('admin', [ACME, ZETA], 'both', [['list_vendor_catalogs', {}]]);
t0 = ok1(res); assert.match(t0, /- Acme Furniture: Acme 2026 Catalog/); assert.match(t0, /- Zeta Supply: Zeta Priced Catalog/); assert.match(t0, /Name a vendor/);
res = await askBrain('admin', [ACME, ZETA], 'which one', [['search_vendor_catalog', {query: 'AB1000'}]]); bad1(res, /More than one catalogue is loaded\. Say which vendor: Acme Furniture, Zeta Supply/);
res = await askBrain('admin', [ACME, ZETA], 'zeta', [['search_vendor_catalog', {query: 'ZEDESK1', vendor: 'zeta'}]]);
t0 = ok1(res); assert.match(t0, /ZEDESK1/); assert.match(t0, /Zeta Priced Catalog/);
assert.match(res.bodies[0].system, /Zeta Supply: Zeta Priced Catalog \(edition 2026-01-01, 9 pages, 5 model rows; covers/, 'a catalogue with prices is not described as having none');
res = await askBrain('sales', [ACME, ZETA], 'sales rep asks', [['search_vendor_catalog', {query: 'AB1000', vendor: 'acme'}]]);
t0 = ok1(res); assert.match(t0, /Acme Furniture catalogue/, 'a sales rep can use a catalogue that has no prices (and the vendor name is needed once two catalogues are open)');
res = await askBrain('sales', [ACME, ZETA], 'sales rep asks for priced', [['search_vendor_catalog', {query: 'ZEDESK1', vendor: 'zeta'}]]);
t0 = ok1(res); assert.match(t0, /ZEDESK1/, 'a catalogue that has prices is open to the sales role too (no role rule against prices)');
assert.match(res.bodies[0].system, /Zeta Supply: Zeta Priced Catalog/, 'the sales role prompt describes a priced catalogue');
res = await askBrain('admin', [ACME], 'show page 9', [['read_catalog_page', {page: 9}]]);
t0 = ok1(res); assert.equal(typeof t0, 'string', 'without see the Brain gets text only');
assert.match(t0, /!\[Page 9 of the Acme Furniture catalogue\]\(https:\/\/kogjthgceejpzxnekprr\.supabase\.co\/storage\/v1\/object\/public\/vendor-invoices\/catalogs\/V-acme\/acme\/pages\/p-009\.jpg\)/, 'the page card carries the page picture');
assert.match(t0, /\[Note for you, not shown to the user: The page card above is already on the user's screen/, 'the Brain is told to explain the page, not just point at it');
assert.ok(res.html.includes('src="https://kogjthgceejpzxnekprr.supabase.co/storage/v1/object/public/vendor-invoices/catalogs/V-acme/acme/pages/p-009.jpg"'), 'the picture is drawn in the chat');
assert.ok(!res.html.includes('Note for you'), 'the private note never shows to the user');
assert.match(res.html, /Show page 8 of the Acme Furniture catalogue/, 'the chat offers the previous page');
res = await askBrain('admin', [ACME], 'look at page 9', [['read_catalog_page', {page: 9, see: true}]]);
t0 = ok1(res); assert.ok(Array.isArray(t0) && t0[0].type === 'text' && t0[1].type === 'image' && t0[1].source.type === 'url' && t0[1].source.url.endsWith('/pages/p-009.jpg'), 'with see the Brain also gets the page picture');
res = await askBrain('admin', [ACME], 'run of pages', [['read_catalog_page', {page: 2, to: 9}]]);
t0 = ok1(res); assert.match(t0, /page 2 \(/); assert.match(t0, /page 5 \(/); assert.doesNotMatch(t0, /catalogue, page 6 \(/, 'a run of pages stops at four');
res = await askBrain('admin', [ACME], 'about warranty', [['search_vendor_catalog', {query: 'warranty'}]]);
t0 = ok1(res); assert.match(t0, /\*\*Everything printed on the page\*\*\nWarranty\nLimited lifetime warranty/, 'a words search that finds one page shows that whole page, not just its number');
res = await askBrain('admin', [ACME], 'one page', [['search_vendor_catalog', {query: 'AB1000'}]]);
t0 = ok1(res); assert.match(t0, /\*\*Everything printed on the page\*\*/, 'a model found on one page shows that whole page'); assert.match(t0, /The page card above is already on the user's screen/);
res = await askBrain('admin', [ACME], 'pointer only', [['search_vendor_catalog', {query: '', section: 'Student Desks'}]]);
t0 = ok1(res); assert.match(t0, /These results are only pointers\. Call read_catalog_page/, 'when a search spans several pages the Brain is told to open the page for the user');
res = await askBrain('admin', [ACME, ZETA], 'split pdf', [['read_catalog_page', {page: 7, vendor: 'zeta'}]]);
t0 = ok1(res); assert.match(t0, /Source: Zeta Supply >> Zeta Priced Catalog \(edition 2026-01-01\)\. Page numbers are PDF pages\. \[PDF pages 1-5\]\(https:\/\/files\.test\/z1\.pdf\) \[PDF pages 6-9\]\(https:\/\/files\.test\/z2\.pdf\)/, 'a split PDF lists each piece');
assert.match(t0, /\[Open page 7 in the PDF\]\(https:\/\/files\.test\/z2\.pdf#page=2\)/, 'a page opens in the piece that holds it');
res = await askBrain('admin', [], 'none loaded', [['list_vendor_catalogs', {}]]);
t0 = ok1(res); assert.equal(t0, 'No vendor catalogues are loaded yet.'); assert.doesNotMatch(res.bodies[0].system, /VENDOR CATALOGUES/, 'with no catalogue the Brain prompt is unchanged');
res = await askBrain('admin', [BROKEN], 'broken file', [['search_vendor_catalog', {query: 'AB1000'}]]); bad1(res, /Could not open the Acme Furniture catalogue file \(HTTP 404\)/);
// ---- the Brain loads an attached catalogue ----
const bvendors = [{id: 'V-plain', name: 'Plain Co'}, {id: 'V-acme', name: 'Acme Furniture'}, {id: 'V-acs', name: 'Acme Seating'}];
async function brainIngest(role, input, file, sops = []) {
  brainPlan = [{content: [{type: 'tool_use', id: 'ing1', name: 'ingest_vendor_catalog', input}], stop_reason: 'tool_use'}, {content: [{type: 'text', text: 'All set.'}], stop_reason: 'end_turn'}]; brainBodies = []; ciArgs = []; const brainSaved = [];
  const r = createRoot(document.getElementById('root'));
  await act(async () => r.render(React.createElement(Host, {customSops: sops, vendors: bvendors, addSop: (x) => brainSaved.push(x), currentUser: {name: 'Tester', email: 'tester@example.test', role}, userRole: role, brainQuery: 'load this as a catalogue'})));
  if (file) { const fi = document.querySelector('input[type=file]'); Object.defineProperty(fi, 'files', {value: [file], configurable: true}); await act(async () => { fi.dispatchEvent(new window.Event('change', {bubbles: true})); }); }
  const inp = document.querySelector('input[placeholder]:not([type=file])') || document.querySelector('input');
  await act(async () => { inp.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); }); await settle();
  const first = brainBodies[0];
  const confirm = btn(/^Confirm/); const asked = !!confirm;
  if (confirm) { const p = act(async () => confirm.click()); await settle(); if (ciRelease) await act(async () => { ciRelease(); ciRelease = null; }); await p; await settle(); await settle(); }
  const out = {text: document.body.textContent, first, asked, saved: brainSaved.filter((x) => x.cat === 'VendorCatalog'), ciArgs: ciArgs.slice()}; await unmount(r); return out;
}
let bi = await brainIngest('admin', {vendor: 'plain', title: 'Plain Full Line', edition: '2026-11-06', has_prices: 'yes'}, bigPdf('plain-150.pdf', 150));
const lastUser = bi.first.messages[bi.first.messages.length - 1];
assert.ok(JSON.stringify(lastUser).includes('plain-150.pdf (150 MB PDF)'), 'the model is told a 150 MB PDF is attached'); assert.ok(!JSON.stringify(bi.first.messages).includes('"type":"document"') && !JSON.stringify(bi.first.messages).includes('base64'), 'a catalogue-sized PDF is never sent to the model');
assert.ok(bi.first.tools.some((t) => t.name === 'ingest_vendor_catalog'), 'the Brain is offered the upload tool');
assert.ok(bi.asked, 'loading a catalogue asks for a Confirm first');
assert.equal(bi.ciArgs.length, 1, 'confirming reads the PDF'); assert.equal(bi.ciArgs[0].vendor.id, 'V-plain', 'the vendor is found by a part of its name'); assert.equal(bi.ciArgs[0].title, 'Plain Full Line'); assert.equal(bi.ciArgs[0].edition, '2026-11-06'); assert.equal(bi.ciArgs[0].hasPrices, 'yes'); assert.equal(bi.ciArgs[0].file.size, 150 * 1048576);
assert.equal(bi.saved.length, 1, 'the catalogue is linked to the vendor'); assert.equal(bi.saved[0].cat, 'VendorCatalog'); assert.equal(JSON.parse(bi.saved[0].content).vendorId, 'V-plain');
assert.match(bi.text, /Loaded "Plain Full Line" as the Plain Co catalogue/); assert.match(bi.text, /12 pages, 40 model rows \(38 distinct model codes\), 5 sections/); assert.match(bi.text, /Prices were found \(77 dollar figures\)/); assert.match(bi.text, /in 3 pieces/);
bi = await brainIngest('admin', {vendor: 'Plain Co'}, null); assert.match(bi.text, /No catalogue PDF is attached/, 'with no PDF attached the Brain says how to attach one'); assert.equal(bi.saved.length, 0);
bi = await brainIngest('admin', {vendor: 'Nowhere Inc'}, bigPdf('x.pdf', 30)); assert.match(bi.text, /No vendor named "Nowhere Inc" in the Directory/, 'a vendor that is not in the Directory is refused'); assert.equal(bi.saved.length, 0);
bi = await brainIngest('admin', {vendor: 'acme'}, bigPdf('x.pdf', 30)); assert.match(bi.text, /More than one vendor matches: Acme Furniture, Acme Seating\. Say which one\./, 'two matching vendors are never guessed'); assert.equal(bi.saved.length, 0); assert.equal(bi.ciArgs.length, 0);
bi = await brainIngest('admin', {vendor: 'Acme Furniture'}, bigPdf('x.pdf', 30)); assert.equal(bi.ciArgs[0].vendor.id, 'V-acme', 'an exact name wins over a longer one that contains it');
bi = await brainIngest('sales', {vendor: 'Plain Co'}, bigPdf('x.pdf', 30)); assert.equal(bi.ciArgs.length, 0, 'the sales role cannot load a catalogue'); assert.equal(bi.saved.length, 0);
console.error = origErr;

if (mutantIdx < 0) console.log('PASS vendor page catalogue panel and Brain catalogue tools on a synthetic catalogue (own vendor only, page links, read-only tools, Playbook hides link rows)');
