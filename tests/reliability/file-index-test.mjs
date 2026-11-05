import {build} from 'esbuild';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Synthetic QuickBooks-shaped data only. Real client exports are never committed to this public repo.
const mutant = process.argv.includes('--mutant');
const MUTANTS = [
  ['year range check', 'if (!(y >= 2000 && y <= 2100)) return \'\';', 'if (false) return \'\';'],
  ['totals use displayed rows only', 'const total = round2(rows.reduce(', 'const total = round2(rows.slice(0, lim).reduce('],
  ['TOTAL row skipped', "if (/^(grand )?total\\b/.test(norm(r[0]))) continue;", ''],
  ['footer and subtotal lines skipped', "if (!date && !base.num) continue; // a subtotal or footer line, not a transaction", ''],
  ['newest version wins', '(f.version || 1) > (cur.version || 1)', '(f.version || 1) < (cur.version || 1)'],
  ['blank-number journal match by name', 'if (!rec.num) lines = lines.filter((l) => norm(l.name) === norm(rec.name));', ''],
  ['failed read is not cached', 'p.catch(() => _sheetCache.delete(key));', ''],
  ['exact number beats partial', 'if (exact.length) rows = exact; else {', 'if (false) rows = exact; else {'],
];
const src = fs.readFileSync('../../src/fileIndex.js', 'utf8');
if (mutant) { for (const [, from, to] of MUTANTS) assert.ok(src.includes(from), 'mutation anchor missing: ' + from); }
const outs = [];
for (let i = 0; i < (mutant ? MUTANTS.length : 1); i++) {
  let text = src;
  if (mutant) text = src.replace(MUTANTS[i][1], MUTANTS[i][2]);
  await build({stdin: {contents: text, resolveDir: '../../src', loader: 'js'}, bundle: true, format: 'cjs', platform: 'node', outfile: 'file-index-bundle-' + i + '.cjs'});
  outs.push('./file-index-bundle-' + i + '.cjs');
}
const require = createRequire(import.meta.url);

async function suite(M, label) {
  const invRows = [
    ['Acme Supply Co'], ['Invoices — January 1 through November 5, 2026'], [],
    ['Date', 'Invoice #', 'Customer:Project', 'Invoice Amount'],
    ['01/02/2026', '10367', 'Maple School District:Chairs', '1084.54'],
    ['01/05/2026', '103670', 'Maple School District:Desks', '500'],
    ['02/10/2026', '10400', 'Oak College:Tables', '17,145.00'],
    ['03/15/2026', '10410', 'Oak College', '(250.00)'],
    ['', '', '', ''],
    ['TOTAL', '4 transactions', '', '18479.54'],
    [' Thursday, November 05, 2026 8:00 PM'],
  ];
  const journalRows = [
    ['Acme Supply Co'], ['Journal Detail'], [],
    ['Date', 'Type', 'Num', 'Name', 'Memo/Description', 'Account', 'Debit', 'Credit'],
    ['01/02/2026', 'Invoice', '10367', 'Maple School District', '', '11000 Accounts Receivable', '1084.54', ''],
    ['01/02/2026', 'Invoice', '10367', 'Maple School District', 'Chairs', '40000 Sales', '', '1084.54'],
    ['01/05/2026', 'Invoice', '103670', 'Maple School District', 'Desks', '40000 Sales', '', '500'],
    ['01/05/2026', 'Expense', '', 'Gas Station A', 'fuel', '60000 Auto', '40', ''],
    ['01/05/2026', 'Expense', '', 'Gas Station B', 'fuel', '60000 Auto', '55', ''],
  ];
  const vp = [
    ['Acme Supply Co'], ['Bill Payments'], [],
    ['Date', 'Type', 'Check #', 'Vendor', 'Paid From', 'Amount Paid'],
    ['01/06/2026', 'Bill Payment (Check)', '9165', 'Widget Makers', '10110 Bank', '664.49'],
    ['02/06/2026', 'Bill Payment (Check)', '9170', 'Widget Makers', '10110 Bank', '100'],
    ['02/07/2026', 'Bill Payment (Check)', '9171', 'Chair Factory', '10110 Bank', '2000'],
  ];
  const ce = [
    ['Acme Supply Co'], ['Checks & Expenses'], [],
    ['Date', 'Type', 'Num', 'Payee', 'Paid From', 'Expense Account(s)', 'Amount'],
    ['01/05/2026', 'Expense', '', 'Gas Station A', '10110 Bank', 'Auto', '40'],
    ['01/05/2026', 'Expense', '', 'Gas Station B', '10110 Bank', 'Auto', '55'],
    ['01/02/2026', 'Check', '9164', 'Pat Owner', '10110 Bank', 'Distributions', '20000'],
  ];
  const po = [
    ['Acme Supply Co'], ['Transaction List by Date'], ['January 1-November 5, 2026'], [],
    ['Date', 'Transaction type', 'Num', 'Posting (Y/N)', 'Name', 'Memo', 'Account full name', 'Split', 'Amount'],
    ['01/07/2026', 'Purchase Order', '4702', 'No', 'Widget Makers', '', '20000 Accounts Payable', '', '3096'],
    ['01/09/2026', 'Payment', 'ref77', 'Yes', 'Oak College', '', '11000 Undeposited', '', '17145'],
  ];
  const files = [
    {id: 'F1', name: '2026 Invoices.xlsx', url: 'u1', size: 10, version: 1},
    {id: 'F2', name: '2026 Vendor Payments.xlsx', url: 'u2', size: 10, version: 1},
    {id: 'F3', name: '2026 Purchase Orders.xlsx', url: 'u3', size: 10, version: 1},
  ];
  const book = {u1: [{name: 'Invoices', rows: invRows}, {name: 'Journal Detail', rows: journalRows}, {name: 'Notes', rows: [['just a note'], ['nothing here']]}], u2: [{name: 'Bill Payments', rows: vp}, {name: 'Checks & Expenses', rows: ce}], u3: [{name: 'Sheet1', rows: po}]};
  const XLSX = {read: (buf) => ({SheetNames: book[buf.u].map((s) => s.name), Sheets: Object.fromEntries(book[buf.u].map((s) => [s.name, s.rows]))}), utils: {sheet_to_json: (rows) => rows}};
  let fetches = 0; let failUrl = '';
  const fetchImpl = async (u) => { fetches++; if (u === failUrl) return {ok: false, status: 404}; return {ok: true, arrayBuffer: async () => ({u})}; };

  // dates and amounts
  for (const bad of [null, undefined, '', 'x', '0002-08-19', '02/30/2026', '13/01/2026', '1/1/1999', '2101-01-01', 5, 99999999]) assert.equal(M.toIsoDate(bad), '', label + ' bad date ' + bad);
  assert.equal(M.toIsoDate('01/02/2026'), '2026-01-02'); assert.equal(M.toIsoDate('1/2/26'), '2026-01-02'); assert.equal(M.toIsoDate('2026-01-02'), '2026-01-02'); assert.equal(M.toIsoDate(46024), '2026-01-02');
  assert.equal(M.toAmount('$1,234.50'), 1234.5); assert.equal(M.toAmount('(12.00)'), -12); assert.equal(M.toAmount(''), null); assert.equal(M.toAmount('n/a'), null); assert.equal(M.toAmount(NaN), null);

  // classification
  assert.equal(M.classifySheet(invRows[3], 'Invoices'), 'invoice');
  assert.equal(M.classifySheet(vp[3], 'Bill Payments'), 'vendor_payment');
  assert.equal(M.classifySheet(ce[3], 'Checks & Expenses'), 'check_expense');
  assert.equal(M.classifySheet(journalRows[3], 'Journal Detail'), 'journal');
  assert.equal(M.classifySheet(po[4], 'Sheet1'), 'transactions');
  assert.equal(M.kindFromType('Purchase Order'), 'purchase_order'); assert.equal(M.kindFromType('Payment'), 'customer_payment'); assert.equal(M.kindFromType('Bill Payment (Check)'), 'vendor_payment');

  // loading, isolation and caching
  M._resetFileIndexCache();
  const idx = await M.buildFileIndex(files, {importXlsx: async () => XLSX, fetchImpl});
  assert.equal(idx.errors.length, 0);
  const kinds = {}; idx.records.forEach((r) => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
  assert.deepEqual(kinds, {invoice: 4, vendor_payment: 3, check_expense: 3, purchase_order: 1, customer_payment: 1}, label + ' record counts (the Total row is not a record)');
  assert.ok(idx.sheets.some((s) => s.kind === 'unrecognized'), 'a sheet with no transaction table is reported, not guessed');
  const before = fetches;
  await M.buildFileIndex(files, {importXlsx: async () => XLSX, fetchImpl});
  assert.equal(fetches, before, 'an unchanged file set is not downloaded again');

  // search
  const S = (q) => M.searchRecords(idx, q);
  let r = S({kind: 'Invoices', number: '10367'});
  assert.equal(r.total, 1, 'an exact number finds only that document, not 103670'); assert.equal(r.rows[0].num, '10367'); assert.equal(r.loose, false);
  assert.equal(S({number: '#10367'}).total, 1, 'a leading # is ignored');
  r = S({number: '1036'}); assert.equal(r.loose, true); assert.equal(r.total, 2);
  r = S({name: 'widget', kind: 'vendor_payment'}); assert.equal(r.total, 2); assert.equal(r.amount, 764.49);
  r = S({kind: 'vendor_payment', limit: 1}); assert.equal(r.rows.length, 1); assert.equal(r.total, 3); assert.equal(r.amount, 2764.49, 'the total covers every match, not just the rows shown'); assert.equal(r.truncated, true);
  assert.equal(S({amount: 17145}).total, 2, 'same dollar amount on an invoice and a customer payment');
  assert.equal(S({amountMin: 1000, amountMax: 3000}).total, 2);
  assert.equal(S({kind: 'invoice', dateFrom: '2026-02-01', dateTo: '2026-02-28'}).rows[0].num, '10400');
  assert.ok(S({dateFrom: '02/30/2026'}).error, 'an impossible date is an error, never a silent empty search');
  assert.equal(S({kind: 'invoice', amount: 250}).total, 1, 'a credit shows up when searching by its amount');
  assert.equal(S({kind: 'purchase orders'}).total, 1); assert.equal(S({kind: 'checks'}).total, 3);
  const g = S({kind: 'vendor_payment', groupBy: 'month'}).groups; assert.deepEqual(g.map((x) => [x.key, x.count, x.amount]), [['2026-01', 1, 664.49], ['2026-02', 2, 2100]]);
  assert.equal(S({kind: 'invoice', name: 'oak'}).rows.find((x) => x.num === '10400').customer, 'Oak College'); assert.equal(S({kind: 'invoice', name: 'oak'}).rows.find((x) => x.num === '10400').project, 'Tables');
  assert.equal(M.quickSearch(idx, '10367').rows[0].num, '10367'); assert.equal(M.quickSearch(idx, '$17,145').total, 2); assert.equal(M.quickSearch(idx, 'widget makers').total, 3); assert.equal(M.quickSearch(idx, '   '), null);

  // journal detail
  const inv = S({kind: 'invoice', number: '10367'}).rows[0];
  assert.equal(M.journalFor(idx, inv).length, 2, 'invoice 10367 gets its own two lines and none of 103670');
  const gasA = S({kind: 'check_expense', name: 'gas station a'}).rows[0];
  const jl = M.journalFor(idx, gasA); assert.equal(jl.length, 1, 'a blank-number expense matches on name'); assert.equal(jl[0].debit, 40);
  assert.deepEqual(M.journalFor(idx, S({kind: 'purchase_order'}).rows[0]), []);

  // versions and file types
  assert.deepEqual(M.latestVersions([{id: 'a', version: 1}, {id: 'b', parentId: 'a', version: 2}, {id: 'c'}]).map((f) => f.id).sort(), ['b', 'c']);
  assert.equal(M.isSpreadsheetFile({name: 'x.XLSX'}), true); assert.equal(M.isSpreadsheetFile({name: 'q.pdf', type: 'application/pdf'}), false);

  // one unreadable file never hides the others, and is retried on the next try
  M._resetFileIndexCache(); failUrl = 'u2';
  const idx2 = await M.buildFileIndex(files, {importXlsx: async () => XLSX, fetchImpl});
  assert.equal(idx2.errors.length, 1); assert.equal(idx2.errors[0].fileName, '2026 Vendor Payments.xlsx'); assert.equal(M.searchRecords(idx2, {kind: 'invoice'}).total, 4);
  failUrl = '';
  const idx3 = await M.buildFileIndex(files, {importXlsx: async () => XLSX, fetchImpl});
  assert.equal(idx3.errors.length, 0, 'a failed read is not cached'); assert.equal(M.searchRecords(idx3, {kind: 'vendor_payment'}).total, 3);
  const withOld = [{...files[0], id: 'O1', version: 1, url: 'u1'}, {...files[0], id: 'O2', parentId: 'O1', version: 2, url: 'u1'}];
  M._resetFileIndexCache(); const idx4 = await M.buildFileIndex(withOld, {importXlsx: async () => XLSX, fetchImpl});
  assert.equal(M.searchRecords(idx4, {kind: 'invoice'}).total, 4, 'two versions of one export are searched once, not twice');
}

if (!mutant) {
  await suite(require(outs[0]), 'base');
  // The same code on a real workbook round trip, when the xlsx package is installed locally.
  let XLSX = null; try { XLSX = require('../../node_modules/xlsx'); } catch { XLSX = null; }
  if (XLSX) {
    const M = require(outs[0]); M._resetFileIndexCache();
    const ws = XLSX.utils.aoa_to_sheet([['Acme'], ['Invoices'], [], ['Date', 'Invoice #', 'Customer:Project', 'Invoice Amount'], ['01/02/2026', '10367', 'Maple:Chairs', 1084.54], ['01/03/2026', 10368, 'Maple', '$2,000.00']]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    const buf = XLSX.write(wb, {type: 'array', bookType: 'xlsx'});
    const ix = await M.buildFileIndex([{id: 'R', name: 'r.xlsx', url: 'r', size: 1}], {importXlsx: async () => XLSX, fetchImpl: async () => ({ok: true, arrayBuffer: async () => buf})});
    assert.equal(ix.errors.length, 0); assert.equal(M.searchRecords(ix, {number: '10368'}).rows[0].amount, 2000); assert.equal(M.searchRecords(ix, {number: '10367'}).rows[0].date, '2026-01-02');
    console.log('PASS real xlsx round trip');
  } else console.log('SKIP real xlsx round trip (xlsx package not installed here)');
  console.log('PASS QuickBooks file index: parsing, classification, search, totals, journal detail, versions and failure isolation');
} else {
  let failed = 0;
  for (let i = 0; i < MUTANTS.length; i++) {
    try { await suite(require(outs[i]), 'mutant ' + MUTANTS[i][0]); console.log('SURVIVED ' + MUTANTS[i][0]); } catch (e) { failed++; console.log('killed ' + MUTANTS[i][0] + ' <- ' + String(e.message).split('\n')[0].slice(0, 90)); }
  }
  // run.mjs expects a failing exit when the mutants are caught, and a clean exit if any survived.
  process.exit(failed === MUTANTS.length ? 1 : 0);
}
