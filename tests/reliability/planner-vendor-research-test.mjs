// Maureen, 2026-11-25: "Many of them offer a wide range of products, so I need to figure out the best way to research
// them, so the Furniture Plan pulls from the vendors we use most."
// Users & Permissions >> Furniture Planner vendor recommendations now ranks catalog vendors by Midwest's own orders and
// suggests grade, category and space tags found in the chosen vendor's loaded catalogs. Offline fixture, no network.
// Run: node planner-vendor-research-test.mjs [--mutant N]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['a tag is suggested only when the catalog has it', 'src/plannerVendorResearch.js', 'return products >= minimum ? { tag, products, jobs: bought, saved: have.has(key) } : null;', 'return { tag, products, jobs: bought, saved: have.has(key) };'],
  ['vendors rank by Midwest jobs', 'src/plannerVendorResearch.js', '.sort((a, b) => b.jobs - a.jobs || (b.last', '.sort((a, b) => 0 || (b.last'],
  ['suggestions match the way the planner matches categories', 'src/plannerVendorResearch.js', 'return { plain: plannerWords(text), cat: categoryWords(text) };', 'return { plain: plannerWords(text), cat: plannerWords(text) };'],
  ['adding a suggestion keeps what staff typed', 'src/plannerVendorResearch.js', "const list = String(current || '').split(',').map((t) => t.trim()).filter(Boolean);", 'const list = [];'],
  ['excluded vendors show as do not recommend', 'src/plannerVendorResearch.js', "const status = rule?.excluded === true ? 'excluded'", "const status = false ? 'excluded'"],
];
const mutate = (file, text) => {
  if (mutantIdx < 0 || !file.endsWith(MUTANTS[mutantIdx][1])) return text;
  assert.ok(text.includes(MUTANTS[mutantIdx][2]), 'mutation anchor missing: ' + MUTANTS[mutantIdx][0]);
  return text.replace(MUTANTS[mutantIdx][2], MUTANTS[mutantIdx][3]);
};
const plugin = { name: 'mut', setup(b) { b.onLoad({ filter: /plannerVendorResearch\.js$/ }, (a) => ({ contents: mutate(a.path, fs.readFileSync(a.path, 'utf8')), loader: 'js' })); } };

const dom = new JSDOM('<div id="root"></div>', { url: 'https://aios.test/' });
const { window } = dom;
Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage, sessionStorage: window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true });
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;
const bundle = await build({
  stdin: { contents: "export { PlannerVendorCard } from '../../src/plannerSettings.jsx'; export { preferredProduct } from '../../src/plannerVendorPolicy.js'; export { mergeTags } from '../../src/plannerVendorResearch.js';", resolveDir: import.meta.dirname },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'], plugins: [plugin],
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, loaded, loaded.exports);
const { PlannerVendorCard, preferredProduct, mergeTags } = loaded.exports;

// ---- fixture (Academia has more jobs, Jonti-Craft the latest order): three catalog vendors, one bought from often, one excluded, one never bought from ----
const catalogFile = (products, sections) => ({ v: 1, headers: [], sections, pages: sections.map((s, i) => ({ n: i + 1, sec: s.id, title: s.title, text: '' })), products });
const JONTI = catalogFile([
  { c: 'JC-1', p: 1, b: 'Preschool Cubbies 10 tray', r: 'JC-1 | cubbies for early childhood classroom' },
  { c: 'JC-2', p: 1, b: 'Toddler Cubby', r: 'JC-2 | toddler cubby' },
  { c: 'JC-3', p: 2, b: 'Preschool Activity Table', r: 'JC-3 | activity tables for pre-k' },
  { c: 'JC-4', p: 2, b: 'Rocking Chairs', r: 'JC-4 | preschool chairs' },
], [{ id: 1, title: 'Early Childhood Storage', group: 'Storage' }, { id: 2, title: 'Classroom Tables', group: 'Tables' }]);
const ACAD = catalogFile([
  { c: 'AC-1', p: 1, b: 'Student Desk', r: 'AC-1 | high school desk' },
  { c: 'AC-2', p: 1, b: 'Library Table', r: 'AC-2 | library tables' },
], [{ id: 1, title: 'Desks', group: 'Desks' }]);
const files = { 'https://f.test/jonti.json': JONTI, 'https://f.test/acad.json': ACAD, 'https://f.test/lake.json': ACAD };
const fetches = [];
const fetchImpl = async (url) => { fetches.push(url); return files[url] ? { ok: true, json: async () => files[url] } : { ok: false, status: 404 }; };
const sops = [
  { id: 'VCAT-J', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'V006', vendorName: 'Jonti-Craft', url: 'https://f.test/jonti.json', productCount: 4 }) },
  { id: 'VCAT-A', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'VA', vendorName: 'Academia', url: 'https://f.test/acad.json', productCount: 2 }) },
  { id: 'VCAT-L', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'VL', vendorName: 'Lakeshore', url: 'https://f.test/lake.json', productCount: 2 }) },
  { id: 'PLANNER_VENDOR_POLICY', cat: 'Config', content: JSON.stringify({ VA: { grades: ['Grade 1 - 12'] }, VL: { excluded: true } }) },
];
const vendors = [{ id: 'V006', name: 'Jonti-Craft' }, { id: 'VA', name: 'Academia Furniture' }, { id: 'VL', name: 'Lakeshore Learning' }, { id: 'VD', name: 'Doane Keyes' }];
const customers = [{ id: 'C1', name: 'Little Sprouts Preschool' }, { id: 'C2', name: 'Oak High School' }];
const jobs = [
  { id: 'J1', name: 'Pre-K classroom', customer: 'C1', createdDate: '2026-01-10' },
  { id: 'J2', name: 'Toddler room', customer: 'C1', createdDate: '2026-03-01' },
  { id: 'J3', name: 'Library refresh', customer: 'C2', createdDate: '2026-01-15' },
  { id: 'J4', name: 'Office', customer: 'C2', createdDate: '2026-01-01' },
];
const line = (jobId, vendor, description, qtyOrdered = 2) => ({ id: jobId + vendor + description, jobId, vendor, description, qtyOrdered, unitCost: 999 });
const lineItems = [
  line('J1', 'VA', 'Student desk'), line('J2', 'V006', 'Cubbies'), line('J1', 'V006', 'Preschool cubbies'), line('J1', 'V006', 'Activity table'),
  line('J3', 'VA', 'Library table'), line('J4', 'VA', 'Desk'), line('J4', 'VD', 'Office chair'), line('J3', 'VD', 'Lounge'), line('J2', 'VL', 'Rug', 0),
];

const root = createRoot(document.getElementById('root'));
const saves = [];
const props = { vendors, customSops: sops, customers, jobs, lineItems, fetchImpl, notify() {}, savePolicy: async (row, expected) => { saves.push({ row, expected }); return { ok: true }; } };
await act(async () => root.render(React.createElement(PlannerVendorCard, props)));

// 1. The busiest catalog vendors come first, with where each stands.
const ranks = [...document.querySelectorAll('[data-rank]')];
assert.deepEqual(ranks.map(b => b.dataset.rank), ['VA', 'V006'], 'catalog vendors rank by Midwest jobs, and a vendor with no orders is not in the top list');
assert.match(ranks[0].textContent, /Academia Furniture.*3 jobs.*Preferences set/);
assert.match(ranks[1].textContent, /Jonti-Craft.*2 jobs.*Not set up yet/);
assert.match(document.querySelector('[data-most-used]').textContent, /1 of 2 are set up/);
assert.match(document.querySelector('[data-most-used]').textContent, /no catalog products loaded.*Doane Keyes \(2\)/, 'vendors bought from without a catalog are named, so staff know to load one');
assert.doesNotMatch(document.body.textContent, /\$|999/, 'no money reaches the research panel');
await act(async () => document.querySelector('[data-most-used] button:not([data-rank])').click());
const allRanks = [...document.querySelectorAll('[data-rank]')];
assert.equal(allRanks.length, 3);
assert.match(allRanks.find(b => b.dataset.rank === 'VL').textContent, /Do not recommend/, 'an excluded vendor reads as do not recommend');

// 2. Choosing Jonti-Craft reads only its catalog and suggests the tags it actually carries.
await act(async () => allRanks.find(b => b.dataset.rank === 'V006').click());
await act(async () => new Promise(r => setTimeout(r, 0)));
assert.deepEqual(fetches, ['https://f.test/jonti.json']);
const research = document.querySelector('[data-vendor-research]');
assert.match(research.textContent, /ordered from this vendor on 2 jobs/);
const offered = [...research.querySelectorAll('[data-suggest]')].map(b => b.dataset.suggest);
for (const want of ['grades:Pre-K', 'grades:Toddler', 'categories:Cubby', 'categories:Table', 'categories:Chair', 'categories:Activity Table', 'spaces:Classroom']) assert.ok(offered.includes(want), 'suggests ' + want + ' (got ' + offered.join(', ') + ')');
for (const absent of ['grades:High School', 'spaces:Library', 'categories:Locker']) assert.ok(!offered.includes(absent), 'never suggests a tag the catalog does not carry: ' + absent);
const preK = research.querySelector('[data-suggest="grades:Pre-K"]');
assert.match(preK.textContent, /Pre-K 4 \/ 2 jobs/, 'pre-K matches every early childhood product and both early childhood jobs');
const cubby = research.querySelector('[data-suggest="categories:Cubby"]');
assert.match(cubby.textContent, /Cubby 2 \/ 2 jobs/, 'cubbies and cubby match the same category the way the planner matches it');

// 3. One click adds a suggestion beside what staff typed; Add all fills the rest; Save stores real tags.
const gradeInput = () => document.querySelector('input[placeholder="Pre-K, Grade 3"]');
await act(async () => { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(gradeInput(), 'Infant'); gradeInput().dispatchEvent(new window.Event('input', { bubbles: true })); });
await act(async () => preK.click());
assert.equal(gradeInput().value, 'Infant, Pre-K');
assert.match(document.querySelector('[data-suggest="grades:Pre-K"]').textContent, /^Added: Pre-K/);
await act(async () => document.querySelector('[data-suggest-all]').click());
await act(async () => document.querySelector('button[type="submit"]').click());
assert.equal(saves.length, 1);
const saved = JSON.parse(saves[0].row.content);
assert.deepEqual(saved.VA, { grades: ['Grade 1 - 12'] }, 'other vendors keep their settings');
assert.deepEqual(saved.VL, { excluded: true });
assert.equal(saved.V006.grades[0], 'Infant');
assert.ok(saved.V006.grades.includes('Pre-K') && saved.V006.grades.includes('Toddler'));
assert.ok(saved.V006.categories.includes('Cubby') && saved.V006.spaces.includes('Classroom'));
assert.equal(new Set(saved.V006.grades.map(t => t.toLowerCase())).size, saved.V006.grades.length, 'no duplicate tags');

// 4. The saved suggestions do what they say in the public planner's own matching.
const cubbyRow = { name: 'Preschool Cubbies 10 tray', row: 'JC-1 | cubbies for early childhood classroom', ctx: '', section: 'Early Childhood Storage', group: 'Storage', series: '' };
assert.equal(preferredProduct(saved.V006, cubbyRow, 'cubbies', 'pre-K transition school', 'Storage'), true);
assert.equal(preferredProduct(saved.V006, cubbyRow, 'cubbies', 'classroom', ''), true);
assert.equal(mergeTags(Array.from({ length: 12 }, (_, i) => 'T' + i).join(', '), ['Extra']).split(', ').length, 12, 'never past the 12 tags the planner keeps');

await act(async () => root.unmount());
dom.window.close();
console.log('PASS Furniture Planner vendor research: most-used ranking, catalog tag suggestions, one-click add and save');
