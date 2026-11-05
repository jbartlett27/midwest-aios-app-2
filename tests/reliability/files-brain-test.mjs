import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// The real FilesPage and BrainPage, mounted in jsdom with synthetic QuickBooks-shaped workbooks.
// No client data, no network: fetch and xlsx are replaced by in-memory fakes.
const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['search tool open to every role', "if (_bkRole !== 'admin') return {error: 'Only an admin can search the QuickBooks files.'};", ''],
  ['Files tab search open to every role', "const _isAdmin=(currentUser&&currentUser.role)==='admin';", 'const _isAdmin=true;'],
  ['category chips deduplicated', 'const CATEGORIES=[...new Set([...PREDEFINED_CATEGORIES,...customCategories])];', 'const CATEGORIES=[...PREDEFINED_CATEGORIES,...customCategories];'],
  ['Brain told about the Files tab', '+ filesLine + "\\n\\nALL JOBS:', '+ "\\n\\nALL JOBS:'],
  ['file tools registered as read-only', "const _brainReadOnly=new Set(['list_files','search_file_records','get_file_record','load_file',", "const _brainReadOnly=new Set(["],
  ['source links clickable in replies', '\\((https:\\/\\/[^)\\s"\'<>]+)\\)', '\\((httpz:\\/\\/[^)\\s"\'<>]+)\\)'],
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
await build({entryPoints: [src + '/App2.jsx'], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/client'], define: {'import.meta.env': '{}'}, outfile: 'files-brain-bundle.cjs', plugins: [{name: 'offline-only', setup(b) {
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
const {FilesPage, BrainPage} = require('./files-brain-bundle.cjs');

// ---- synthetic books (fake names) ----
const invRows = [['Acme Supply'], ['Invoices'], [], ['Date', 'Invoice #', 'Customer:Project', 'Invoice Amount'], ['01/02/2026', '10367', 'Maple School District:Chairs', '1084.54'], ['02/10/2026', '10400', 'Oak College:Tables', '17,145.00'], ['TOTAL', '2 transactions', '', '18229.54']];
const jrnRows = [['Acme Supply'], ['Journal Detail'], [], ['Date', 'Type', 'Num', 'Name', 'Memo/Description', 'Account', 'Debit', 'Credit'], ['01/02/2026', 'Invoice', '10367', 'Maple School District', '', '11000 Accounts Receivable', '1084.54', ''], ['01/02/2026', 'Invoice', '10367', 'Maple School District', 'Chairs', '40000 Sales', '', '1084.54']];
const poRows = [['Acme Supply'], ['Transaction List by Date'], [], ['Date', 'Transaction type', 'Num', 'Posting (Y/N)', 'Name', 'Memo', 'Account full name', 'Split', 'Amount'], ['01/07/2026', 'Purchase Order', '4702', 'No', 'Widget Makers', '', '20000 Accounts Payable', '', '3096'], ['03/09/2026', 'Payment', 'ref77', 'Yes', 'Oak College', '', '11000 Undeposited', '', '17145']];
const books = {'https://files.test/inv.xlsx': [{name: 'Invoices', rows: invRows}, {name: 'Journal Detail', rows: jrnRows}], 'https://files.test/po.xlsx': [{name: 'Sheet1', rows: poRows}]};
globalThis.__XLSX = {read: (buf) => ({SheetNames: books[buf.u].map((s) => s.name), Sheets: Object.fromEntries(books[buf.u].map((s) => [s.name, s.rows]))}), utils: {sheet_to_json: (rows) => rows}};
const fileSop = (id, name, url, category, extra = {}) => ({id, title: name, cat: 'File', content: JSON.stringify({name, originalName: name, size: 1000, type: name.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url, path: 'files/' + id, category, tags: [], folderId: null, uploadedAt: '2026-11-05T12:00:00Z', version: 1, ...extra})});
const sops = [fileSop('FILE-1', '2026 Invoices.xlsx', 'https://files.test/inv.xlsx', 'Customer Invoice'), fileSop('FILE-2', '2026 Purchase Orders.xlsx', 'https://files.test/po.xlsx', 'Purchase Order'), fileSop('FILE-3', 'Quote 55.pdf', 'https://files.test/q.pdf', 'Quote'), {id: 'CUSTOM_FILE_CATEGORIES', title: 'File Categories', cat: 'Config', content: JSON.stringify(['Vendor Payment'])}];
let fetchLog = [];
const realFetch = async (url, opts) => {
  fetchLog.push(String(url));
  if (String(url) === '/api/brain') return brainReply(JSON.parse(opts.body));
  if (books[url]) return {ok: true, status: 200, arrayBuffer: async () => ({u: String(url)})};
  if (String(url).endsWith('q.pdf')) return {ok: true, status: 200, blob: async () => new window.Blob([new Uint8Array([37, 80, 68, 70])], {type: 'application/pdf'})};
  return {ok: false, status: 404};
};
globalThis.fetch = realFetch;
let brainPlan = []; let brainBodies = [];
const brainReply = (body) => { brainBodies.push(body); const step = brainPlan.shift() || {content: [{type: 'text', text: 'done'}], stop_reason: 'end_turn'}; return {ok: true, status: 200, headers: {get: () => 'application/json'}, json: async () => step}; };
const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
async function typeInto(el, value) { el.focus(); await act(async () => { set.call(el, value); el.dispatchEvent(new window.Event('input', {bubbles: true})); }); }
const settle = async () => { for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); }); };
const unmount = async (root) => { await act(async () => root.unmount()); document.body.innerHTML = '<div id="root"></div>'; };

// ---- Files tab ----
async function mountFiles(role) {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(FilesPage, {customSops: sops, addSop: () => {}, deleteSop: () => {}, notify: () => {}, currentUser: {name: 'T', role}, setPage: () => {}, setPendingBrainFile: () => {}, db: {}})));
  return root;
}
const openBtn = () => [...document.querySelectorAll('button')].find((b) => /Search inside QuickBooks files|Hide search/.test(b.textContent));
let root = await mountFiles('office');
assert.ok(!openBtn(), 'a non-admin never sees the QuickBooks search');
await unmount(root);
root = await mountFiles('admin');
assert.ok(openBtn(), 'an admin sees the QuickBooks search when spreadsheets are stored');
const chips = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim().startsWith('Vendor Payment'));
assert.equal(chips.length, 1, 'Vendor Payment is one category chip even when it is also a saved custom category'); assert.deepEqual(errors, [], 'no duplicate React keys');
assert.ok([...document.querySelectorAll('button')].some((b) => b.textContent.trim().startsWith('Customer Payment')), 'the new payment categories exist');
await act(async () => openBtn().click()); await settle();
assert.match(document.body.textContent, /4 records from 2 spreadsheets/, 'both workbooks were read (the TOTAL row is not a record)');
const box = document.querySelector('input[placeholder^="Invoice or check number"]'); assert.ok(box);
await typeInto(box, '10367'); await settle();
assert.match(document.body.textContent, /1 match/); assert.match(document.body.textContent, /Maple School District:Chairs/); assert.match(document.body.textContent, /\$1,084\.54/);
const row = [...document.querySelectorAll('tbody tr')].find((r) => /10367/.test(r.textContent) && /Maple/.test(r.textContent)); assert.ok(row, 'result row'); await act(async () => row.click());
assert.match(document.body.textContent, /11000 Accounts Receivable/, 'opening a result shows its journal lines'); assert.match(document.body.textContent, /40000 Sales/);
await typeInto(box, '$17,145'); await settle(); assert.match(document.body.textContent, /2 matches/, 'an amount finds the invoice and the customer payment');
await typeInto(box, 'zzzz'); await settle(); assert.match(document.body.textContent, /No matches in the uploaded spreadsheets/);
await unmount(root);

// ---- Brain ----
const brainBase = {jobs: [], reps: [], lineItems: [], vendors: [], customers: [], getJobFinancials: () => ({totalRevenue: 0, totalCost: 0, margin: 0, totalOrdered: 0, totalReceived: 0}), getJobItems: () => [], _commissionFor: () => 0, _bankTxnHash: () => '', setBrainQuery: () => {}, addSop: () => {}, deleteSop: () => {}, updateJob: () => {}, addJob: () => {}, updateLineItem: () => {}, addLineItem: () => {}, deleteLineItem: () => {}, updateRep: () => {}, addRep: () => {}, addCustomer: () => {}, updateCustomer: () => {}, addVendor: () => {}, updateVendor: () => {}, notify: () => {}, setPage: () => {}, deleteJob: () => {}, pendingBrainFile: null, setPendingBrainFile: () => {}, pendingBrainEmail: null, setPendingBrainEmail: () => {}, lineItemShipTos: {}, jobReportDate: () => '', setJobs: () => {}, forceDeleteLineItem: () => {}, forceDeleteCustomer: () => {}, forceDeleteVendor: () => {}, forceDeleteRep: () => {}, confirmJobId: async () => true};
function Host(props) { const [h, setH] = React.useState([]); const [l, setL] = React.useState(false); return React.createElement(BrainPage, {...brainBase, ...props, brainHistory: h, setBrainHistory: setH, brainLoading: l, setBrainLoading: setL}); }
async function askBrain(role, question, tools, finalText) {
  brainPlan = tools.map((t, i) => ({content: [{type: 'tool_use', id: 'tu' + i, name: t[0], input: t[1]}], stop_reason: 'tool_use'})); brainBodies = [];
  if (finalText) brainPlan.push({content: [{type: 'text', text: finalText}], stop_reason: 'end_turn'});
  const r = createRoot(document.getElementById('root'));
  await act(async () => r.render(React.createElement(Host, {customSops: sops, currentUser: {name: 'Tester', email: 'tester@example.test', role}, userRole: role, brainQuery: question})));
  const input = document.querySelector('input[placeholder]:not([type=file])') || document.querySelector('input'); assert.ok(input, 'brain input');
  await act(async () => { input.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); }); await settle(); await settle();
  if (process.env.DBG) console.log('DBG inputs', [...document.querySelectorAll('input')].map((i) => i.placeholder + '|' + i.value).join(' ;; '), 'bodies', brainBodies.length, 'log', fetchLog.join(','), document.body.textContent.slice(0, 600));
  const results = brainBodies.flatMap((b) => b.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : []).filter((c) => c.type === 'tool_result')));
  const link = document.querySelector('a[href="https://files.test/inv.xlsx"]');
  const out = {link: link ? link.textContent : null, bodies: brainBodies, results: [...new Map(results.map((x) => [x.tool_use_id, x])).values()]};
  await unmount(r); return out;
}
let res = await askBrain('admin', 'find invoice 10367', [['search_file_records', {number: '10367', kind: 'invoice'}]], 'Found it. Source: [2026 Invoices.xlsx](https://files.test/inv.xlsx)');
assert.ok(res.bodies.length >= 2, 'the Brain called the tool and then answered');
assert.equal(res.link, '2026 Invoices.xlsx', 'a source link in the Brain reply is clickable');
assert.match(res.bodies[0].system, /FILES TAB: 3 files \(2 spreadsheets\)/, 'the Brain is told what is in the Files tab'); assert.match(res.bodies[0].system, /search_file_records/);
for (const n of ['list_files', 'search_file_records', 'get_file_record', 'load_file']) assert.ok(res.bodies[0].tools.some((t) => t.name === n), n + ' is offered to the Brain');
let t0 = res.results[0].content; assert.ok(!res.results[0].is_error, t0);
assert.match(t0, /\*\*1 record\*\* totaling \$1,084\.54/); assert.match(t0, /Maple School District:Chairs/); assert.match(t0, /2026 Invoices\.xlsx > Invoices row 5/); assert.match(t0, /Source: \[2026 Invoices\.xlsx\]\(https:\/\/files\.test\/inv\.xlsx\)/, 'every answer cites the stored file with a link');
res = await askBrain('admin', 'open it', [['get_file_record', {number: '10367'}]]);
t0 = res.results[0].content; assert.match(t0, /### Invoice 10367 -- Maple School District:Chairs/); assert.match(t0, /11000 Accounts Receivable \| -- \| \$1,084\.54/); assert.match(t0, /Customer \/ project: Maple School District \/ Chairs/);
res = await askBrain('admin', 'totals', [['search_file_records', {amount: 17145, group_by: 'kind'}]]);
t0 = res.results[0].content; assert.match(t0, /\*\*2 records\*\* totaling \$34,290\.00/); assert.match(t0, /\| Invoice \| 1 \| \$17,145\.00 \|/); assert.match(t0, /\| Customer Payment \| 1 \| \$17,145\.00 \|/);
res = await askBrain('admin', 'what files', [['list_files', {}]]);
t0 = res.results[0].content; assert.match(t0, /\*\*3 files in the Files tab\*\*/); assert.match(t0, /2026 Invoices\.xlsx > Invoices: 2 invoices, 01\/02\/2026 to 02\/10\/2026, total \$18,229\.54/); assert.match(t0, /Quote 55\.pdf/);
res = await askBrain('admin', 'nope', [['get_file_record', {number: '99999'}]]);
assert.equal(res.results[0].is_error, true); assert.match(res.results[0].content, /No QuickBooks record numbered 99999/);
res = await askBrain('admin', 'bad date', [['search_file_records', {date_from: '02/30/2026'}]]);
assert.equal(res.results[0].is_error, true); assert.match(res.results[0].content, /real date/);
res = await askBrain('admin', 'load the quote', [['load_file', {file: 'quote 55'}]]);
assert.ok(!res.results[0].is_error, res.results[0].content); assert.match(res.results[0].content, /Loaded "Quote 55\.pdf"/);
res = await askBrain('admin', 'load invoices', [['load_file', {file: 'invoices'}]]);
assert.equal(res.results[0].is_error, true); assert.match(res.results[0].content, /spreadsheet/);
res = await askBrain('office', 'find invoice 10367', [['search_file_records', {number: '10367'}]]);
assert.equal(res.results[0].is_error, true); assert.match(res.results[0].content, /Only an admin/); assert.doesNotMatch(res.bodies[0].system, /search_file_records and opened/, 'the QuickBooks instructions are not given to a non-admin');
assert.ok(!/Maple School District/.test(JSON.stringify(res.bodies)), 'no QuickBooks data reaches a non-admin conversation');
console.error = origErr;

if (mutantIdx < 0) console.log('PASS Files tab search and Brain file tools on synthetic QuickBooks workbooks (admin only, cited sources, journal detail)');
