// The public planner's view of Midwest's vendor catalogues (midwestaios.com/plan, api/plan.js).
// A customer sees product facts only: vendor, catalogue, model code, name, series, section, page and specs with every
// price removed. Pure functions; the server does the loading. Nothing here reads jobs, customers, costs or notes.
import { pageImageUrl } from './vendorCatalog.js';

const MONEY = /(?:US)?\$\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*\.\d{2}\b|\b(?:list|net|msrp|price|cost|dealer)\b[^|;\n]{0,40}/gi;
const PRICEY_HEADER = /\b(price|list|cost|net|msrp|dealer|\$)\b/i;
const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 3) + '...' : s; };

// A catalogue whose numbers may be prices: its file says so, or its title calls it a price list or price book.
export function catalogHasPrices(rec) {
  return !!(rec && (rec.hasPrices === true || /price\s*(list|book)|pricebook|pricing/i.test(String(rec.title || '')) && !/no\s*(list\s*)?pric|without\s*pric/i.test(String(rec.title || ''))));
}
export function scrubPrices(text) {
  return String(text == null ? '' : text).replace(MONEY, ' ').replace(/\s*\|\s*(\|\s*)+/g, ' | ').replace(/\s+/g, ' ').trim();
}
// One catalogue row as a customer may see it.
export function publicProduct(rec, row) {
  const pricey = catalogHasPrices(rec);
  const specs = pricey || PRICEY_HEADER.test(String(row.header || '')) ? '' : clip(scrubPrices(row.row), 220);
  return {
    id: rec.id + '::' + row.code,
    catalogId: rec.id, vendor: clip(rec.vendorName || '', 80), catalog: clip(rec.title || '', 100),
    code: clip(row.code, 60), name: clip(scrubPrices(row.name || ''), 120), series: clip(scrubPrices(row.series || ''), 100),
    section: clip(row.section || '', 80), group: clip(row.group || '', 60), page: row.page, specs,
    image: pricey ? '' : pageImageUrl(rec, row.page),
  };
}
// Catalogue records a customer may search: real catalogues with products, never an archived one.
export function publicCatalogs(recs) {
  return (Array.isArray(recs) ? recs : []).filter((r) => r && r.url && r.vendorId && Number(r.productCount || 0) > 0);
}
// The plan line a customer keeps: only what the catalogue confirms, plus their own quantity and note.
export function cleanPlanItem(item, product) {
  const qty = Math.max(1, Math.min(10000, Math.round(Number(item && item.qty) || 1)));
  return { ...product, qty, note: clip(item && item.note, 200), confirmed: true };
}
