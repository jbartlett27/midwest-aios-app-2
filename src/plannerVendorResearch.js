// Users & Permissions >> Furniture Planner vendor recommendations: the research Maureen would otherwise do by hand.
// Maureen, 2026-11-25: "Many of them offer a wide range of products, so I need to figure out the best way to research
// them, so the Furniture Plan pulls from the vendors we use most."
// Two answers, both read-only and dollar-free: which catalog vendors Midwest buys from most (its own purchase
// history), and for one vendor, which grade, category and space tags its loaded catalogs actually support. A tag is
// only suggested when the planner's own matching finds it in that vendor's indexed products, so a suggestion can
// never be a tag that does nothing. Staff still choose and save; nothing here writes.
import { plannerWords, includesPlannerWords, categoryWords, indexedProductText } from './plannerVendorPolicy.js';
import { vendorUsage } from './vendorHistory.js';

// The words a customer or a catalog uses. Each is tried as written; only the ones found in the catalog are offered.
export const TAG_VOCABULARY = {
  grades: ['Pre-K', 'Infant', 'Toddler', 'Kindergarten', 'Elementary', 'Primary', 'Middle School', 'Junior High', 'High School', 'Secondary', 'K-12', 'College', 'University', 'Higher Education', 'Adult'],
  categories: ['Chair', 'Stool', 'Seating', 'Soft Seating', 'Lounge', 'Sofa', 'Ottoman', 'Bench', 'Desk', 'Table', 'Activity Table', 'Workstation', 'Carrel', 'Storage', 'Cabinet', 'Locker', 'Cubby', 'Shelf', 'Bookcase', 'Shelving', 'Cart', 'Easel', 'Whiteboard', 'Markerboard', 'Rug', 'Carpet', 'Mat', 'Cot', 'Crib', 'Kitchen', 'Dramatic Play', 'Lectern', 'Podium', 'Partition', 'Divider', 'Riser', 'Wardrobe'],
  spaces: ['Classroom', 'Library', 'Media Center', 'Cafeteria', 'Dining', 'Science', 'Lab', 'Makerspace', 'STEM', 'Art', 'Music', 'Band', 'Choir', 'Gym', 'Athletic', 'Locker Room', 'Office', 'Conference', 'Training', 'Lobby', 'Reception', 'Breakroom', 'Commons', 'Collaborative', 'Outdoor', 'Auditorium', 'Nurse', 'Health'],
};

const day = (s) => (/^\d{4}-\d{2}-\d{2}/.test(String(s || '')) ? String(s).slice(0, 10) : '');

// Which catalog vendors Midwest buys from most, and where each one stands in the planner settings.
// Vendors the company buys from but whose catalogs have no indexed products are listed apart: the planner cannot
// recommend them until a catalog with products is loaded.
export function vendorResearchOverview({ eligible, policy, vendors, jobs, lineItems }) {
  const usage = new Map(vendorUsage({ vendors, jobs, lineItems }).map((u) => [u.vendorId, u]));
  const ranked = [...eligible].map(([vendorId, name]) => {
    const u = usage.get(vendorId); const rule = policy && Object.hasOwn(policy, vendorId) ? policy[vendorId] : null;
    const tags = rule ? ['grades', 'categories', 'spaces'].reduce((n, k) => n + (Array.isArray(rule[k]) ? rule[k].length : 0), 0) : 0;
    const status = rule?.excluded === true ? 'excluded' : tags ? 'preferred' : 'open';
    return { vendorId, name, jobs: u ? u.jobs : 0, last: u ? u.last : '', status };
  }).sort((a, b) => b.jobs - a.jobs || (b.last || '').localeCompare(a.last || '') || a.name.localeCompare(b.name));
  const noCatalog = [...usage.values()].filter((u) => !eligible.has(u.vendorId) && u.jobs > 0).slice(0, 8)
    .map((u) => ({ vendorId: u.vendorId, name: u.vendor, jobs: u.jobs }));
  return { ranked, noCatalog };
}

// The text Midwest's own orders carry for one vendor: what was bought, on which jobs, for which customers.
function purchaseTexts({ vendorId, jobs, lineItems, customers }) {
  const byJob = new Map((jobs || []).map((j) => [j.id, j]));
  const custName = new Map((customers || []).map((c) => [c.id, c.name]));
  const perJob = new Map();
  for (const i of lineItems || []) {
    if (!i || i.vendor !== vendorId || !((Number(i.qtyOrdered) || 0) > 0) || !byJob.has(i.jobId)) continue;
    const j = byJob.get(i.jobId);
    if (!perJob.has(j.id)) perJob.set(j.id, { items: [], place: (j.name || '') + ' ' + (custName.get(j.customer) || ''), date: '' });
    const p = perJob.get(j.id); p.items.push((i.description || '') + ' ' + (i.modelNumber || ''));
    const d = day(i.poDate) || day(j.createdDate); if (d > p.date) p.date = d;
  }
  return [...perJob.values()];
}

// Suggested tags for one vendor, from its loaded catalogs (rows as vendorCatalog.js prepares them) and Midwest's orders.
// products: how many indexed products the planner would match with the tag. jobs: how many of Midwest's jobs with this
// vendor mention it (what was bought for grades and spaces also reads the job and customer names).
export function suggestVendorTags({ rows, vendorId, jobs, lineItems, customers, existing = {} }) {
  const facts = (rows || []).map((row) => { const text = indexedProductText(row); return { plain: plannerWords(text), cat: categoryWords(text) }; });
  const orders = purchaseTexts({ vendorId, jobs, lineItems, customers })
    .map((o) => ({ items: categoryWords(o.items.join(' ')), all: plannerWords(o.items.join(' ') + ' ' + o.place) }));
  const minimum = facts.length >= 50 ? 2 : 1;
  const out = {};
  for (const [field, words] of Object.entries(TAG_VOCABULARY)) {
    const have = new Set((existing[field] || []).map((t) => field === 'categories' ? categoryWords(t) : plannerWords(t)));
    const seen = new Set();
    out[field] = words.map((tag) => {
      const key = field === 'categories' ? categoryWords(tag) : plannerWords(tag);
      if (!key || seen.has(key)) return null; seen.add(key);
      const products = facts.filter((f) => includesPlannerWords(field === 'categories' ? f.cat : f.plain, key)).length;
      const bought = orders.filter((o) => includesPlannerWords(field === 'categories' ? o.items : o.all, key)).length;
      return products >= minimum ? { tag, products, jobs: bought, saved: have.has(key) } : null;
    }).filter(Boolean).sort((a, b) => b.jobs - a.jobs || b.products - a.products).slice(0, 8);
  }
  return out;
}

// What Midwest bought most from one vendor, for the research panel. Labels and counts only, never money.
export function topPurchases({ vendorId, jobs, lineItems, limit = 5 }) {
  const byJob = new Set((jobs || []).map((j) => j.id));
  const by = new Map();
  for (const i of lineItems || []) {
    if (!i || i.vendor !== vendorId || !((Number(i.qtyOrdered) || 0) > 0) || !byJob.has(i.jobId)) continue;
    const label = String(i.description || '').split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 70) || String(i.modelNumber || '').trim() || 'Item';
    const key = label.toLowerCase();
    if (!by.has(key)) by.set(key, { label, jobs: new Set() });
    by.get(key).jobs.add(i.jobId);
  }
  return [...by.values()].map((p) => ({ label: p.label, jobs: p.jobs.size })).sort((a, b) => b.jobs - a.jobs || a.label.localeCompare(b.label)).slice(0, limit);
}

// Adds suggested tags to what staff already typed, without duplicates and within the planner's 12-tag limit.
export function mergeTags(current, additions) {
  const list = String(current || '').split(',').map((t) => t.trim()).filter(Boolean);
  const keys = new Set(list.map((t) => t.toLowerCase()));
  for (const tag of additions) if (!keys.has(tag.toLowerCase()) && list.length < 12) { list.push(tag); keys.add(tag.toLowerCase()); }
  return list.join(', ');
}
