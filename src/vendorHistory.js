// The company's purchase history with a vendor: every job Midwest ordered that vendor's products on, for every
// login (Maureen, 2026-11-23: "everyone can see the company's full purchase history with each vendor"). Sales
// logins still never see dollars: withMoney is false for them, so no cost, spend or price leaves this module.

const day = (s) => (/^\d{4}-\d{2}-\d{2}/.test(String(s || '')) ? String(s).slice(0, 10) : '');
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const lc = (s) => clean(s).toLowerCase();

// Ordered lines for one vendor (or all vendors), joined to their job and customer. Jobs that no longer exist are skipped.
function orderedLines({ vendorId, jobs, lineItems }) {
  const byJob = new Map((jobs || []).map((j) => [j.id, j]));
  return (lineItems || []).filter((i) => i && (!vendorId || i.vendor === vendorId) && (Number(i.qtyOrdered) || 0) > 0 && byJob.has(i.jobId))
    .map((i) => ({ i, j: byJob.get(i.jobId) }));
}

export function vendorPurchaseHistory({ vendorId, jobs, lineItems, customers, jobNum, withMoney = false, query = '' }) {
  const words = lc(query).split(' ').filter(Boolean);
  const custName = new Map((customers || []).map((c) => [c.id, c.name]));
  let lines = orderedLines({ vendorId, jobs, lineItems });
  if (words.length) lines = lines.filter(({ i }) => { const t = lc(i.description + ' ' + (i.modelNumber || '')); return words.every((w) => t.includes(w)); });
  const orders = new Map(); const products = new Map();
  let units = 0, received = 0, spend = 0, first = '', last = '';
  for (const { i, j } of lines) {
    const date = day(i.poDate) || day(j.createdDate);
    const qty = Number(i.qtyOrdered) || 0; const got = Number(i.qtyReceived) || 0; const cost = (Number(i.unitCost) || 0) * qty;
    units += qty; received += got; spend += cost;
    if (date && (!first || date < first)) first = date;
    if (date && date > last) last = date;
    if (!orders.has(j.id)) orders.set(j.id, { jobId: j.id, num: jobNum ? jobNum(j.id) : j.id, job: j.name || '', customer: custName.get(j.customer) || '', rep: j.salesRep || '', date, units: 0, items: [], ...(withMoney ? { spend: 0 } : {}) });
    const o = orders.get(j.id);
    if (date && (!o.date || date > o.date)) o.date = date;
    o.units += qty; if (withMoney) o.spend += cost;
    const label = clean(String(i.description || '').split('\n')[0]) || clean(i.modelNumber) || 'Item';
    o.items.push({ description: label, model: clean(i.modelNumber), qty, received: got, ...(withMoney ? { unitCost: Number(i.unitCost) || 0 } : {}) });
    const key = lc(i.modelNumber) || lc(label);
    if (!products.has(key)) products.set(key, { label, model: clean(i.modelNumber), units: 0, jobs: new Set(), last: '' });
    const p = products.get(key); p.units += qty; p.jobs.add(j.id); if (date > p.last) p.last = date;
  }
  return {
    jobCount: orders.size, lineCount: lines.length, units, received, first, last,
    ...(withMoney ? { spend } : {}),
    orders: [...orders.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    products: [...products.values()].map((p) => ({ ...p, jobs: p.jobs.size })).sort((a, b) => b.jobs - a.jobs || b.units - a.units),
  };
}

// Which vendors Midwest uses most, company-wide, optionally only for items matching some words ("student desk").
export function vendorUsage({ vendors, jobs, lineItems, query = '' }) {
  const words = lc(query).split(' ').filter(Boolean);
  const name = new Map((vendors || []).map((v) => [v.id, v.name]));
  const by = new Map();
  for (const { i, j } of orderedLines({ jobs, lineItems })) {
    if (words.length) { const t = lc(i.description + ' ' + (i.modelNumber || '')); if (!words.every((w) => t.includes(w))) continue; }
    if (!name.has(i.vendor)) continue;
    if (!by.has(i.vendor)) by.set(i.vendor, { vendorId: i.vendor, vendor: name.get(i.vendor), jobs: new Set(), units: 0, last: '' });
    const r = by.get(i.vendor); r.jobs.add(j.id); r.units += Number(i.qtyOrdered) || 0;
    const d = day(i.poDate) || day(j.createdDate); if (d > r.last) r.last = d;
  }
  return [...by.values()].map((r) => ({ ...r, jobs: r.jobs.size })).sort((a, b) => b.jobs - a.jobs || b.units - a.units);
}
