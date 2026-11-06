// Vendor catalogues: read a structured catalogue (made by tools/extract_vendor_catalog.py) and
// search it. Pure functions. The network is injected so tests run offline.
//
// A catalogue is a JSON file in storage plus one small `sops` row (cat 'VendorCatalog') that
// links it to a vendor. The row says where the file is; the file holds sections, the text of
// every page, and every model row found in the product tables.

export const CATALOG_CAT = 'VendorCatalog';
const MAX_CELL = 240;

const lc = (s) => String(s == null ? '' : s).toLowerCase();
const clip = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 3) + '...' : s; };
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\n/g, ' ');

// ---- the linking rows ----
export function catalogRecords(sops) {
  const out = [];
  for (const s of Array.isArray(sops) ? sops : []) {
    if (!s || s.cat !== CATALOG_CAT) continue;
    let d = null;
    try { d = JSON.parse(s.content); } catch { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || !d.url || !d.vendorId) continue;
    out.push({ id: s.id, ...d });
  }
  return out;
}

export function catalogsForVendor(sops, vendorId) {
  return catalogRecords(sops).filter((r) => r.vendorId === vendorId);
}

// ---- loading ----
const _cache = new Map();
export function _resetCatalogCache() { _cache.clear(); }

function prepare(raw) {
  if (!raw || raw.v !== 1 || !Array.isArray(raw.pages) || !Array.isArray(raw.products) || !Array.isArray(raw.sections)) {
    throw new Error('Not a vendor catalogue file');
  }
  const secById = new Map(raw.sections.map((s) => [s.id, s]));
  const pageByN = new Map(raw.pages.map((p) => [p.n, p]));
  const headers = Array.isArray(raw.headers) ? raw.headers : [];
  const rows = raw.products.map((p) => {
    const pg = pageByN.get(p.p);
    const sec = pg ? secById.get(pg.sec) : null;
    return {
      code: p.c, page: p.p, name: p.b || '', row: p.r, ctx: p.x || '', header: p.h >= 0 && headers[p.h] ? headers[p.h] : '',
      series: pg ? pg.title : '', section: sec ? sec.title : '', group: sec ? sec.group : '',
      blob: lc(p.c + ' ' + (p.b || '') + ' ' + p.r + ' ' + (p.x || '') + ' ' + (sec ? sec.title + ' ' + sec.group : '') + ' ' + (pg ? pg.title : '')),
    };
  });
  const byCode = new Map();
  for (const r of rows) { const k = lc(r.code); if (!byCode.has(k)) byCode.set(k, []); byCode.get(k).push(r); }
  const pages = raw.pages.map((p) => ({ ...p, lower: lc(p.title + '\n' + p.text) }));
  return { ...raw, rows, byCode, pages, pageByN, secById, codeCount: byCode.size };
}

// Loads and caches a catalogue by its file address. A failed load is never cached.
export async function loadCatalog(rec, { fetchImpl }) {
  if (!rec || !rec.url) throw new Error('No catalogue file address');
  if (_cache.has(rec.url)) return _cache.get(rec.url);
  const p = (async () => {
    const r = await fetchImpl(rec.url);
    if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status));
    return prepare(await r.json());
  })();
  _cache.set(rec.url, p);
  p.catch(() => _cache.delete(rec.url));
  return p;
}

// ---- search ----
const tokens = (q) => lc(q).split(/[^a-z0-9"'.\-/]+/).filter(Boolean);

function sectionMatch(cat, section) {
  const s = lc(section).trim();
  if (!s) return null;
  // An exact group name or exact section title wins over a loose word match.
  let hit = cat.sections.filter((x) => lc(x.group) === s);
  if (!hit.length) hit = cat.sections.filter((x) => lc(x.title) === s);
  if (!hit.length) hit = cat.sections.filter((x) => lc(x.title).includes(s) || lc(x.group).includes(s));
  return new Set(hit.map((x) => x.title));
}

function snippet(text, toks) {
  const low = lc(text);
  let at = -1;
  for (const t of toks) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return clip(text.replace(/\s+/g, ' '), 200);
  const start = Math.max(0, at - 60);
  return (start > 0 ? '...' : '') + text.slice(start, start + 220).replace(/\s+/g, ' ') + '...';
}

// query: model code or words. opts: { section, limit }
export function searchCatalog(cat, query, opts = {}) {
  const limit = Math.min(Math.max(opts.limit || 25, 1), 60);
  const toks = tokens(query);
  const secSet = sectionMatch(cat, opts.section);
  if (!toks.length && !secSet) return { rows: [], total: 0, codes: 0, pages: [], pageTotal: 0, error: 'Type a model code or words to search for.' };
  const q = lc(query).trim();
  const scored = [];
  for (const r of cat.rows) {
    if (secSet && !secSet.has(r.section)) continue;
    const code = lc(r.code);
    let score = 0;
    if (!toks.length) score = 1;
    else if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (code.includes(q)) score = 60;
    else if (toks.every((t) => r.blob.includes(t))) score = 40 + (toks.some((t) => code.includes(t)) ? 5 : 0);
    if (score) scored.push({ r, score });
  }
  scored.sort((a, b) => b.score - a.score || a.r.page - b.r.page);
  const seen = new Set();
  for (const s of scored) seen.add(lc(s.r.code));
  const pageHits = [];
  for (const p of cat.pages) {
    if (secSet) { const sec = cat.secById.get(p.sec); if (!sec || !secSet.has(sec.title)) continue; }
    if (!toks.length || !toks.every((t) => p.lower.includes(t))) continue;
    let score = 0;
    for (const t of toks) { score += (p.lower.split(t).length - 1); if (lc(p.title).includes(t)) score += 10; }
    pageHits.push({ n: p.n, title: p.title, section: (cat.secById.get(p.sec) || {}).title || '', score, snippet: snippet(p.text, toks) });
  }
  pageHits.sort((a, b) => b.score - a.score || a.n - b.n);
  return { rows: scored.slice(0, limit).map((s) => s.r), total: scored.length, codes: seen.size, pages: pageHits.slice(0, 6), pageTotal: pageHits.length };
}

export function getProduct(cat, code) {
  const k = lc(code).trim();
  if (!k) return { rows: [], exact: false };
  const exact = cat.byCode.get(k);
  if (exact) return { rows: exact, exact: true };
  const rows = [];
  for (const [c, list] of cat.byCode) if (c.startsWith(k)) rows.push(...list);
  return { rows: rows.slice(0, 40), exact: false };
}

export function getPage(cat, n) {
  const p = cat.pageByN.get(Number(n));
  if (!p) return null;
  const sec = cat.secById.get(p.sec) || {};
  return { n: p.n, pn: p.pn, title: p.title, section: sec.title || '', group: sec.group || '', text: p.text, trunc: !!p.trunc };
}

// ---- text for people and for the Brain ----
export function pageRef(rec, n) {
  const url = rec && rec.pdfUrl;
  return url ? '[page ' + n + '](' + url + '#page=' + n + ')' : 'page ' + n;
}

export function rowsToMarkdown(rows, rec) {
  if (!rows.length) return '';
  const lines = ['| Model | Page | Section | Row |', '|---|---|---|---|'];
  for (const r of rows) {
    lines.push('| ' + esc(r.code) + ' | ' + pageRef(rec, r.page) + ' | ' + esc(clip(r.section, 50)) + ' | ' + esc(clip((r.name ? r.name + ' >> ' : '') + r.row + (r.ctx ? ' / ' + r.ctx : ''), MAX_CELL)) + ' |');
  }
  return lines.join('\n');
}

export function overviewMarkdown(cat, rec) {
  const c = cat.company || {};
  const out = [];
  out.push('**' + cat.title + '** (' + cat.vendorName + ', edition ' + cat.edition + ')');
  out.push('Page numbers are PDF pages' + (cat.pageOffset ? ' (the printed page number is the PDF page minus ' + cat.pageOffset + ')' : '') + '.');
  out.push(cat.pageCount + ' pages, ' + cat.sections.length + ' sections, ' + cat.rows.length + ' model rows covering ' + cat.codeCount + ' distinct model codes. ' + (cat.hasPrices ? 'Prices are included.' : 'No prices appear in this edition.'));
  if (c.name) out.push([c.name, c.address, c.phone, c.email, c.web].filter(Boolean).join(' | '));
  if (c.hours) out.push(c.hours);
  if (c.about) out.push(c.about);
  for (const n of cat.notes || []) out.push('Note: ' + n);
  const counts = new Map();
  for (const r of cat.rows) counts.set(r.section, (counts.get(r.section) || 0) + 1);
  const groups = new Map();
  for (const s of cat.sections) { if (!groups.has(s.group)) groups.set(s.group, []); groups.get(s.group).push(s); }
  out.push('');
  for (const [g, list] of groups) {
    out.push('**' + g + '**');
    for (const s of list) out.push('- ' + s.title + ' (' + (s.end > s.page ? 'pages ' + s.page + '-' + s.end : 'page ' + s.page) + (counts.get(s.title) ? ', ' + counts.get(s.title) + ' model rows' : '') + ')');
  }
  return out.join('\n');
}

export function profileMarkdown(cat) {
  const out = [];
  for (const n of cat.profilePages || []) {
    const p = getPage(cat, n);
    if (p) out.push('### Page ' + p.n + ': ' + p.title + '\n' + p.text);
  }
  return out.join('\n\n');
}

// One compact paragraph for the Brain system prompt.
export function promptLine(recs) {
  if (!recs.length) return '';
  const parts = recs.map((r) => {
    const groups = Array.isArray(r.groups) ? r.groups.join(', ') : '';
    return r.vendorName + ': ' + r.title + ' (edition ' + r.edition + ', ' + r.pageCount + ' pages, ' + r.productCount + ' model rows' + (r.hasPrices ? '' : ', no prices') + (groups ? '; covers ' + groups : '') + ')';
  });
  return '\n\nVENDOR CATALOGUES: ' + parts.join('; ') + '. Use list_vendor_catalogs for the contents, search_vendor_catalog for models and words, get_catalog_product for one model code, read_catalog_page for a whole page. These are vendor specs from the catalogue. They are not our quotes or our costs, and a catalogue without prices has no prices to report: say so instead of guessing. Always give the page number.';
}
