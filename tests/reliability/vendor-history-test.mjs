// Maureen, 2026-11-23: Jim Lindner (sales) asked for a vendor's purchase history and saw only his own purchases.
// Everyone sees the company's full history with each vendor now; sales logins see it without dollars.
// Run: node vendor-history-test.mjs [--mutant N]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['sales never see dollars in the history', 'src/vendorHistory.js', '...(withMoney ? { spend } : {}),', 'spend,'],
  ['the item words narrow the vendor ranking', 'src/vendorHistory.js', "if (words.length) { const t = lc(i.description + ' ' + (i.modelNumber || '')); if (!words.every((w) => t.includes(w))) continue; }", ''],
  ['the Brain reads the whole company, not the user\'s jobs', 'src/App2.jsx', 'const _companyJobs=allJobs||jobs;const _companyLineItems=lineItems;', 'const _companyJobs=jobs;const _companyLineItems=lineItems;'],
  ['the Brain tool keeps dollars from sales logins', 'src/App2.jsx', "const withMoney = !(currentUser && currentUser.role === 'sales');", 'const withMoney = true;'],
  ['the Directory vendor panel counts every job', 'src/App2.jsx', 'const vJobs=_cJobs.filter(j=>jobIdSet.has(j.id));', 'const vJobs=jobs.filter(j=>jobIdSet.has(j.id));'],
  ['the Brain runs the history lookup without asking', 'src/App2.jsx', "'get_bills_summary','vendor_purchase_history',", "'get_bills_summary',"],
];
const read = (f) => {
  const t = fs.readFileSync('../../' + f, 'utf8');
  if (mutantIdx < 0 || MUTANTS[mutantIdx][1] !== f) return t;
  assert.ok(t.includes(MUTANTS[mutantIdx][2]), 'mutation anchor missing: ' + MUTANTS[mutantIdx][0]);
  return t.replace(MUTANTS[mutantIdx][2], MUTANTS[mutantIdx][3]);
};
const r = await build({ stdin: { contents: read('src/vendorHistory.js'), resolveDir: '../../src', sourcefile: 'vendorHistory.js', loader: 'js' }, bundle: true, write: false, format: 'esm', platform: 'node' });
fs.writeFileSync('./.vh-bundle.mjs', r.outputFiles[0].text);
const H = await import('./.vh-bundle.mjs?' + Date.now()); fs.rmSync('./.vh-bundle.mjs');

// ---- a company: Jim (S005) has one Virco job, Dave (S001) has two ----
const jobs = [
  { id: 'J1', name: 'Oak MS Grade 6', customer: 'C1', salesRep: 'S005', createdDate: '2026-03-01' },
  { id: 'J2', name: 'Lincoln ES Library', customer: 'C2', salesRep: 'S001', createdDate: '2026-05-10' },
  { id: 'J3', name: 'Elm HS Commons', customer: 'C3', salesRep: 'S001', createdDate: '2026-08-02' },
];
const lineItems = [
  { id: 'L1', jobId: 'J1', vendor: 'V1', description: 'Student desk 20x26\nlaminate top', modelNumber: '785', qtyOrdered: 30, qtyReceived: 30, unitCost: 80, poDate: '2026-03-05' },
  { id: 'L2', jobId: 'J2', vendor: 'V1', description: 'Student desk 20x26', modelNumber: '785', qtyOrdered: 20, qtyReceived: 20, unitCost: 82, poDate: '2026-05-12' },
  { id: 'L3', jobId: 'J3', vendor: 'V1', description: 'Stack chair 18in', modelNumber: '9018', qtyOrdered: 100, qtyReceived: 40, unitCost: 30, poDate: '2026-08-05' },
  { id: 'L4', jobId: 'J3', vendor: 'V2', description: 'Library shelving', modelNumber: 'LS-1', qtyOrdered: 6, qtyReceived: 0, unitCost: 400, poDate: '2026-08-06' },
  { id: 'L5', jobId: 'GONE', vendor: 'V1', description: 'Old line', modelNumber: 'X', qtyOrdered: 5, unitCost: 1 },
];
const customers = [{ id: 'C1', name: 'Oak District' }, { id: 'C2', name: 'Lincoln District' }, { id: 'C3', name: 'Elm District' }];
const vendors = [{ id: 'V1', name: 'Virco' }, { id: 'V2', name: 'KI' }];
const reps = [{ id: 'S001', name: 'Dave Welter' }, { id: 'S005', name: 'Jim Lindner' }];
const jobNum = (id) => 'MW-' + id;

const h = H.vendorPurchaseHistory({ vendorId: 'V1', jobs, lineItems, customers, jobNum });
assert.deepEqual([h.jobCount, h.units, h.first, h.last, h.orders.map((o) => o.jobId)], [3, 150, '2026-03-05', '2026-08-05', ['J3', 'J2', 'J1']], 'the history covers every job the company ordered from the vendor, newest first');
assert.deepEqual(h.products.map((p) => [p.model, p.units, p.jobs]), [['785', 50, 2], ['9018', 100, 1]], 'products rank by how many jobs ordered them, then units');
assert.equal(h.orders[2].items[0].description, 'Student desk 20x26', 'a product shows its first line, not the whole description');
assert.ok(!/spend|unitCost/.test(JSON.stringify(h)), 'without money, no cost or spend leaves the helper');
const hm = H.vendorPurchaseHistory({ vendorId: 'V1', jobs, lineItems, customers, jobNum, withMoney: true });
assert.equal(hm.spend, 30 * 80 + 20 * 82 + 100 * 30, 'with money (admin and office), spend is the cost of every ordered unit');
assert.equal(H.vendorPurchaseHistory({ vendorId: 'V1', jobs, lineItems, customers, query: 'chair' }).units, 100, 'item words narrow the history');
assert.deepEqual(H.vendorUsage({ vendors, jobs, lineItems }).map((v) => [v.vendor, v.jobs]), [['Virco', 3], ['KI', 1]], 'the ranking shows which vendors the company uses most');
assert.deepEqual(H.vendorUsage({ vendors, jobs, lineItems, query: 'shelving' }).map((v) => v.vendor), ['KI'], 'the ranking can be for one kind of item');

// ---- the Brain tool, run from the shipped App2.jsx lines ----
const app2 = read('src/App2.jsx');
const a = app2.indexOf("if (toolName === 'vendor_purchase_history') {");
const b = app2.indexOf("if (toolName === 'search_vendor_catalog') {", a);
assert.ok(a > 0 && b > a, 'the Brain has the vendor_purchase_history handler');
const run = new Function('toolName', 'input', 'currentUser', 'vendors', '_companyJobs', '_companyLineItems', 'customers', 'jobNum', 'reps', 'vendorPurchaseHistory', 'vendorUsage', 'return (async () => { ' + app2.slice(a, b) + ' return null; })();');
const tool = (input, role) => run('vendor_purchase_history', input, { role }, vendors, jobs, lineItems, customers, jobNum, reps, H.vendorPurchaseHistory, H.vendorUsage);
const sales = await tool({ vendor: 'virco' }, 'sales');
assert.ok(sales.success && sales.message.includes('3 jobs') && sales.message.includes('Lincoln ES Library') && sales.message.includes('Dave Welter'), 'a sales login sees the whole company\'s jobs with the vendor, other reps included');
assert.ok(!/\$/.test(sales.message), 'a sales login sees no dollar amounts');
const admin = await tool({ vendor: 'Virco' }, 'admin');
assert.ok(admin.message.includes('$7,040') && admin.message.includes('| Cost |'), 'admin and office see the cost');
const rank = await tool({ item: 'desk' }, 'sales');
assert.ok(rank.message.includes('| Virco | 2 |') && !rank.message.includes('KI'), 'with no vendor, the tool ranks vendors for the item');
assert.ok((await tool({ vendor: 'Nobody' }, 'sales')).error, 'an unknown vendor is said plainly');

// ---- the Brain is wired to the company data, and the Directory panel counts every job ----
const brain = app2.slice(app2.indexOf('function BrainPage('), app2.indexOf('function ProspectsPage('));
const cap = brain.indexOf('const _companyJobs=allJobs||jobs;const _companyLineItems=lineItems;');
const filt = brain.indexOf("if(currentUser&&currentUser.role==='sales'){\n    const _visIds");
assert.ok(cap > 0 && filt > cap, 'the company data is captured before the sales filter narrows the Brain');
assert.ok(/function BrainPage\(\{jobs,allJobs,jobNum,/.test(app2), 'the Brain receives the whole company\'s jobs');
assert.ok(/const _brainReadOnly=new Set\(\[[^\n]*'vendor_purchase_history',/.test(app2), 'the history lookup runs without a confirmation');
assert.ok(app2.includes('const vJobs=_cJobs.filter(j=>jobIdSet.has(j.id));') && app2.includes('deleteRep,notify,jobs,allJobs,userRole,jobNum,lineItems,'), 'the Directory vendor panel counts every company job');
assert.ok(app2.includes('{_sales?jUnits.toLocaleString()+" units":fmt(jSpend)}'), 'the Directory panel shows units, not dollars, to sales');
console.log('PASS vendor purchase history (' + (mutantIdx < 0 ? 'source' : 'mutant ' + mutantIdx) + ')');
