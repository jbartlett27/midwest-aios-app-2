import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// The real Vendor360Page, BrainPage and PlaybookPage, mounted in jsdom with a synthetic vendor catalogue.
// No client data, no network: fetch is replaced by an in-memory fake and the catalogue is made up.
const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['vendor page shows the catalogue', '<VendorCatalogPanel key={vend.id} vendor={vend} customSops={customSops} setPage={setPage}/>', ''],
  ['a vendor only sees its own catalogue', 'catalogsForVendor(customSops,vendor.id).slice()', 'catalogRecords(customSops).slice()'],
  ['catalogue tools registered as read-only', "'recent_actions','list_vendor_catalogs','search_vendor_catalog','get_catalog_product','read_catalog_page']);", "'recent_actions']);"],
  ['Brain told about the catalogues', '+ catLine + filesLine +', '+ filesLine +'],
  ['catalogue rows hidden from the Playbook', '"Invoice","VendorBill","VendorCatalog"]);', '"Invoice","VendorBill"]);'],
  ['priced catalogues kept from the sales role', "filter(r=>!(r.hasPrices&&_bkRole==='sales'))", 'filter(r=>true)'],
  ['product lookup finds the page', 'const g = vcProduct(p.cat, code);', 'const g = vcProduct(p.cat, code + "zz");'],
  ['page reader gives the page text', "'\\n\\n'+pg.text+(pg.trunc", "'\\n\\n'+(pg.trunc"],
  ['catalogue link rows kept out of the Brain procedure list', '"HistoricalDoc","Settings","VendorCatalog"].includes(s.cat)', '"HistoricalDoc","Settings"].includes(s.cat)'],
  ['two catalogues need a vendor name', "else if(m.length>1)return {error:'More than one catalogue is loaded.", "else if(false)return {error:'More than one catalogue is loaded."],
];
const src = '../../src';
const chartNames = [...new Set(['App.jsx', 'App2.jsx', 'App3.jsx'].flatMap((f) => [...fs.readFileSync(src + '/' + f, 'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*["']recharts["']/g)].flatMap((m) => m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]))))];
const stubs = {
  clerk: 'export const ClerkProvider=({children})=>children;export const useUser=()=>({isLoaded:true,isSignedIn:false,user:null});export const useClerk=()=>({signOut:()=>{}});export const useAuth=()=>({getToken:async()=>null});export const SignIn=()=>null;export const UserButton=()=>null;',
  recharts: chartNames.map((n) => 'export const ' + n + '=()=>null;').join('\n'),
  xlsx: 'export const read=(...a)=>globalThis.__XLSX.read(...a);export const utils={sheet_to_json:(...a)=>globalThis.__XLSX.utils.sheet_to_json(...a)};export default {read,utils};',
  db: 'export const db=globalThis.__db;',
};
if (mutantIdx >= 0) assert.ok(fs.readFileSync(src + '/App2.jsx', 'utf8').includes(MUTANTS[mutantIdx][1]), 'mutation anchor missing: ' + MUTANTS[mutantIdx][0]);
await build({entryPoints: [src + '/App2.jsx'], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/client'], define: {'import.meta.env': '{}'}, outfile: 'vendor-catalog-bundle-ui.cjs', plugins: [{name: 'offline-only', setup(b) {
  if (mutantIdx >= 0) b.onLoad({filter: /App2\.jsx$/}, async (a) => ({contents: fs.readFileSync(a.path, 'utf8').replace(MUTANTS[mutantIdx][1], MUTANTS[mutantIdx][2]), loader: 'jsx', resolveDir: src}));
  b.onResolve({filter: /^(@clerk\/clerk-react|recharts|xlsx)$/}, (a) => ({path: a.path, namespace: 'stub'}));
  b.onResolve({filter: /supabase\.js$/}, () => ({path: 'db', namespace: 'stub'}));
  b.onLoad({filter: /.*/, namespace: 'stub'}, (a) => ({contents: a.path === '@clerk/clerk-react' ? stubs.clerk : a.path === 'recharts' ? stubs.recharts : a.path === 'xlsx' ? stubs.xlsx : stubs.db, loader: 'js'}));
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

const {Vendor360Page, BrainPage, PlaybookPage} = require('./vendor-catalog-bundle-ui.cjs');

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
const ACME = linkSop('VCAT-1', rec('V-acme', 'Acme Furniture', 'Acme 2026 Catalog', 'https://files.test/acme.json'));
const ZETA = linkSop('VCAT-2', rec('V-zeta', 'Zeta Supply', 'Zeta Priced Catalog', 'https://files.test/zeta.json', {hasPrices: true}));
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
async function mountVendor(vendorId, customSops) {
  window._viewVendorId = vendorId;
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Vendor360Page, {jobs: [], lineItems: [], vendors, customers: [], reps: [], getJobFinancials: () => ({}), getJobItems: () => [], setPage: (p) => pagesVisited.push(p), setSelectedJob() {}, notify() {}, updateVendor() {}, jobNum: () => '', customSops, addSop() {}, deleteSop() {}, setFocusSopId() {}})));
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
assert.match(text(), /Page 3 \(printed 2\): Alpha Desk sizes/, 'opening a result shows the whole page'); assert.match(text(), /AB1001 \| 22 x 30/);
await act(async () => btn(/This page in the PDF/).click()); assert.equal(opened[1][0], 'https://files.test/acme.pdf#page=3', 'the PDF opens at that page');
await act(async () => btn(/^Next$/).click()); assert.match(text(), /Page 4/, 'Next turns the page');
await act(async () => btn(/^Close$/).click()); assert.doesNotMatch(text(), /Page 4/);
await typeInto(box, ''); await settle();
await pick(document.querySelector('select'), 'Seating'); await settle();
assert.match(text(), /2 model rows/, 'choosing a section lists its models'); assert.match(text(), /CH100A/); assert.match(text(), /CH100B/); assert.doesNotMatch(text(), /AB1001/);
await act(async () => btn(/^Clear$/).click()); await settle(); assert.match(text(), /Student Desks: Alpha Desk\s*p\.2-4/, 'Clear goes back to the section list');
await typeInto(box, 'warranty'); await settle(); assert.match(text(), /Pages that mention it \(1\)/); assert.match(text(), /Limited lifetime warranty/);
await unmount(root);
root = await mountVendor('V-plain', [ACME, ZETA]);
assert.doesNotMatch(text(), /Vendor Catalogue|Acme 2026 Catalog/, 'a vendor with no catalogue shows nothing extra');
await unmount(root);
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
  const out = {bodies: brainBodies, results: [...new Map(results.map((x) => [x.tool_use_id, x])).values()]};
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
assert.match(t0, /Source: Acme Furniture >> Acme 2026 Catalog \(edition 2026-01-01\)\. Page numbers are PDF pages\. \[Open the PDF\]\(https:\/\/files\.test\/acme\.pdf\)/, 'every catalogue answer cites the catalogue');
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
res = await askBrain('sales', [ACME, ZETA], 'sales rep asks', [['search_vendor_catalog', {query: 'AB1000'}]]);
t0 = ok1(res); assert.match(t0, /Acme Furniture catalogue/, 'a sales rep can use a catalogue that has no prices (and needs no vendor name when it is the only one open to them)');
assert.doesNotMatch(JSON.stringify(res.bodies[0].system), /Zeta/, 'a catalogue with prices is not described to the sales role');
res = await askBrain('sales', [ACME, ZETA], 'sales rep asks for priced', [['search_vendor_catalog', {query: 'ZEDESK1', vendor: 'zeta'}]]); bad1(res, /No catalogue matches "zeta"/);
res = await askBrain('admin', [], 'none loaded', [['list_vendor_catalogs', {}]]);
t0 = ok1(res); assert.equal(t0, 'No vendor catalogues are loaded yet.'); assert.doesNotMatch(res.bodies[0].system, /VENDOR CATALOGUES/, 'with no catalogue the Brain prompt is unchanged');
res = await askBrain('admin', [BROKEN], 'broken file', [['search_vendor_catalog', {query: 'AB1000'}]]); bad1(res, /Could not open the Acme Furniture catalogue file \(HTTP 404\)/);
console.error = origErr;

if (mutantIdx < 0) console.log('PASS vendor page catalogue panel and Brain catalogue tools on a synthetic catalogue (own vendor only, page links, read-only tools, no-price rule for sales, Playbook hides link rows)');
