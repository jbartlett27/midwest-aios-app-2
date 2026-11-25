import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://planner.test/plan' });
const { window } = dom;
Object.assign(globalThis, {
  window, document: window.document, localStorage: window.localStorage,
  sessionStorage: window.sessionStorage, location: window.location, IS_REACT_ACT_ENVIRONMENT: true,
});
window.HTMLElement.prototype.scrollIntoView = () => {};
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;

const mutation = process.argv.includes('--mutant');
const bundle = await build({
  stdin: { contents: "export { PlannerVendorCard } from '../../src/plannerSettings.jsx'; export { default as Planner } from '../../src/planner/Planner.jsx';", resolveDir: import.meta.dirname },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'],
});
let source = bundle.outputFiles[0].text;
if (mutation) {
  const anchor = 'const visibleItems = restored ? plan.items : [];';
  assert.ok(source.includes(anchor), 'mutation anchor missing');
  source = source.replace(anchor, 'const visibleItems = plan.items;');
}
const loaded = { exports: {} };
new Function('require', 'module', 'exports', source)(require, loaded, loaded.exports);
const { PlannerVendorCard, Planner } = loaded.exports;
const root = createRoot(document.getElementById('root'));
const render = (Component, props) => act(async () => root.render(React.createElement(Component, props)));
const selected = () => document.querySelector('select');
const click = (element) => act(async () => { element.click(); });
const sops = [
  { id: 'VCAT-ALLOWED', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'V-A', vendorName: 'Same Brand', url: 'https://fixture.test/a', productCount: 2 }) },
  { id: 'VCAT-REVIEWED', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'V-B', vendorName: 'Same Brand', url: 'https://fixture.test/b', productCount: 1 }) },
  { id: 'VCAT-EMPTY', cat: 'VendorCatalog', content: JSON.stringify({ vendorId: 'V-C', vendorName: 'Empty Index', url: 'https://fixture.test/c', productCount: 0 }) },
  { id: 'PLANNER_VENDOR_POLICY', cat: 'Config', content: '{"V-A":{"grades":["Pre-K"]}}' },
];
const saves = [];
await render(PlannerVendorCard, {
  customSops: sops, notify() {},
  savePolicy: async (row, expected) => { saves.push({ row, expected }); return { ok: true }; },
});
assert.deepEqual([...selected().options].map(option => option.value), ['', 'V-A', 'V-B']);
assert.match(selected().options[2].textContent, /Same Brand \(V-B\)/);
await act(async () => {
  selected().value = 'V-B';
  selected().dispatchEvent(new window.Event('change', { bubbles: true }));
});
await click(document.querySelector('input[type="checkbox"]'));
await click(document.querySelector('button[type="submit"]'));
assert.equal(saves.length, 1);
assert.equal(saves[0].row.id, 'PLANNER_VENDOR_POLICY');
assert.equal(saves[0].expected, sops.at(-1).content);
assert.deepEqual(JSON.parse(saves[0].row.content), { 'V-A': { grades: ['Pre-K'] }, 'V-B': { excluded: true } });

const allowed = { id: 'VCAT-ALLOWED::AA-1', catalogId: 'VCAT-ALLOWED', code: 'AA-1', name: 'Indexed Chair', vendor: 'Actual Manufacturer', qty: 2, referenceUrl: 'https://manufacturer.example/chairs' };
const stale = { id: 'VCAT-REVIEWED::XX-1', catalogId: 'VCAT-REVIEWED', code: 'XX-1', name: 'Stale Chair', vendor: 'Excluded Maker', qty: 3 };
const draft = { project: { room: 'Preschool' }, assumptions: [], items: [allowed, stale] };
localStorage.setItem('mw_plan_v1', JSON.stringify({ plan: draft, messages: [{ role: 'assistant', text: 'Try Excluded Maker.', products: [allowed, stale] }], ref: 'MW-ABCD1234' }));
const requests = [];
let resolveRestore;
globalThis.fetch = async (url, options) => {
  requests.push({ url, body: options?.body && JSON.parse(options.body) });
  if (url.endsWith('op=config')) return { ok: true, json: async () => ({ ok: true, vendors: ['Actual Manufacturer'] }) };
  assert.ok(url.endsWith('op=validate'));
  if (requests.length < 3) await new Promise(resolve => { resolveRestore = resolve; });
  return { ok: true, json: async () => ({ ok: true, plan: { ...draft, items: [allowed], unknown: ['XX-1'] }, products: [allowed] }) };
};
await render(Planner);
const pendingItemCount = document.querySelectorAll('[data-item]').length;
const pendingRequestDisabled = document.querySelector('[data-request-open]').disabled;
await act(async () => resolveRestore());
assert.deepEqual([...document.querySelectorAll('[data-item]')].map(el => el.dataset.item), ['AA-1']);
assert.equal(document.querySelector('[data-product="XX-1"]'), null);
assert.doesNotMatch(document.body.textContent, /Try Excluded Maker/);
const link = document.querySelector('[data-item] a');
assert.equal(link.href, allowed.referenceUrl);
assert.equal(link.rel, 'noopener noreferrer');
assert.equal(JSON.parse(localStorage.getItem('mw_plan_v1')).plan.items.length, 1);
await click(document.querySelector('[data-request-open]'));
assert.ok(document.querySelector('[role="dialog"][aria-label="Request a priced quote"]'));
assert.ok(requests.every(({ url }) => url.startsWith('/api/plan?op=')), 'reference links are not fetched');
await act(async () => root.unmount());
dom.window.close();
assert.equal(pendingItemCount, 0, 'saved product facts are hidden until the public validation result arrives');
assert.equal(pendingRequestDisabled, true);
console.log('PASS staff vendor settings form and public saved-plan revalidation');
