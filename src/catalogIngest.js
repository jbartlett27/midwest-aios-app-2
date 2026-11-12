// Vendor catalogue upload: turn any vendor PDF (150 MB and more) into the structured catalogue that
// src/vendorCatalog.js reads. Runs in the browser. Nothing here needs a server: the PDF is read where it
// sits, the text, model rows, prices and a picture of every page are pulled out of it, and only those
// (plus the PDF itself, in pieces when it is too big for one storage file) are saved.
//
// The libraries (pdf.js to read, pdf-lib to split) load from a pinned CDN version when first needed, so
// nothing is added to the app bundle. Every outside dependency is injected, so tests run offline.

export const PDFJS_VERSION = '4.10.38';
export const PDFLIB_VERSION = '1.17.1';
const PDFJS_BASES = [
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VERSION + '/build/',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/',
  'https://unpkg.com/pdfjs-dist@' + PDFJS_VERSION + '/build/',
];
const PDFLIB_URLS = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@' + PDFLIB_VERSION + '/dist/pdf-lib.esm.min.js',
  'https://unpkg.com/pdf-lib@' + PDFLIB_VERSION + '/dist/pdf-lib.esm.min.js',
];

export const STORAGE_MAX_BYTES = 44 * 1000 * 1000; // storage refuses one file over about 50 MB
const TEXT_MAX = 20000;
const ROW_MAX = 300;
const IMG_WIDTH = 1100;

const lc = (s) => String(s == null ? '' : s).toLowerCase();
const pad3 = (n) => String(n).padStart(3, '0');

export function slugify(s) {
  return lc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'catalogue';
}

export function todayLocal() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Publication precision belongs to the source; uploadedAt records when it was loaded.
export function normalizeCatalogEdition(value) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Edition must be a year (2026), a date (2026-07-31), or blank if unknown.');
  const ed = value.trim();
  if (!ed || /^[1-9]\d{3}$/.test(ed)) return ed;
  const m = /^([1-9]\d{3})-(\d{2})-(\d{2})$/.exec(ed);
  if (m) {
    const y = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
    const days = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]) return ed;
  }
  throw new Error('Edition must be a year (2026), a date (2026-07-31), or blank if unknown.');
}

// ---------- libraries ----------
let _pdfjs = null;
export function loadPdfJs({ importer = (u) => import(/* @vite-ignore */ u), fetchImpl = (u) => fetch(u), urlFor = (b) => URL.createObjectURL(b) } = {}) {
  if (_pdfjs) return _pdfjs;
  const p = (async () => {
    let lastErr = null;
    for (const base of PDFJS_BASES) {
      try {
        const lib = await importer(base + 'pdf.min.mjs');
        const w = await fetchImpl(base + 'pdf.worker.min.mjs');
        if (!w || !w.ok) throw new Error('worker HTTP ' + (w && w.status));
        const blob = new Blob([await w.text()], { type: 'text/javascript' });
        lib.GlobalWorkerOptions.workerSrc = urlFor(blob);
        return lib;
      } catch (e) { lastErr = e; }
    }
    throw new Error('Could not load the PDF reader (' + ((lastErr && lastErr.message) || 'offline') + '). Check the connection and try again.');
  })();
  _pdfjs = p;
  p.catch(() => { _pdfjs = null; });
  return p;
}

let _pdflib = null;
export function _resetLibs() { _pdfjs = null; _pdflib = null; }
export function loadPdfLib({ importer = (u) => import(/* @vite-ignore */ u) } = {}) {
  if (_pdflib) return _pdflib;
  const p = (async () => {
    let lastErr = null;
    for (const u of PDFLIB_URLS) {
      try { const lib = await importer(u); if (lib && lib.PDFDocument) return lib; throw new Error('no PDFDocument'); } catch (e) { lastErr = e; }
    }
    throw new Error('Could not load the PDF splitter (' + ((lastErr && lastErr.message) || 'offline') + ').');
  })();
  _pdflib = p;
  p.catch(() => { _pdflib = null; });
  return p;
}

// ---------- text ----------
// Letter-spaced headings ("P A L M A N O V A") come out of the PDF with a space after every letter. Runs of
// single letters are closed up so the name reads and searches as one word; a double space stays a word break.
export function unspace(str) {
  const s = String(str == null ? '' : str);
  const toks = s.trim().split(/ +/);
  if (toks.length < 4 || toks.filter((t) => t.length === 1).length < toks.length * 0.75) return s;
  return s.trim().split(/ {2,}/).map((w) => w.replace(/ /g, '')).join(' ');
}

// pdf.js text items -> lines. Items on the same baseline form a line; a wide gap becomes " | " so table
// columns stay apart; lines run top to bottom.
export function linesFromItems(items) {
  const its = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it.str !== 'string' || !it.str.trim() || !Array.isArray(it.transform)) continue;
    const h = Math.abs(Number(it.height) || Number(it.transform[3]) || 10) || 10;
    its.push({ s: unspace(it.str), x: Number(it.transform[4]) || 0, y: Number(it.transform[5]) || 0, w: Number(it.width) || it.str.length * h * 0.5, h });
  }
  its.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const it of its) {
    const row = rows.length ? rows[rows.length - 1] : null;
    if (row && Math.abs(row.y - it.y) <= Math.max(2, 0.45 * Math.max(row.h, it.h))) { row.items.push(it); row.h = Math.max(row.h, it.h); }
    else rows.push({ y: it.y, h: it.h, items: [it] });
  }
  return rows.map((row) => {
    row.items.sort((a, b) => a.x - b.x);
    let out = '';
    let end = null;
    for (const it of row.items) {
      if (end !== null) {
        const gap = it.x - end;
        if (gap > Math.max(8, row.h * 1.0)) out += ' | ';
        else if (gap > row.h * 0.12 && !/\s$/.test(out) && !/^\s/.test(it.s)) out += ' ';
      }
      out += it.s;
      end = it.x + it.w;
    }
    return out.replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}

export const PRICE_RE = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
export function priceFigures(text) { const m = String(text == null ? '' : text).match(PRICE_RE); return m ? m.length : 0; }

// ---------- model rows ----------
const CODE_A = /(?<![A-Za-z0-9\-/.$])([A-Z]{1,6}\d[A-Z0-9]*(?:-[A-Z0-9]{1,14}){0,5})(?![A-Za-z0-9])/g;
const CODE_B = /(?<![A-Za-z0-9\-/.$])(\d{1,5}-[A-Z0-9]{2,12}(?:-[A-Z0-9]{1,10}){0,3})(?![A-Za-z0-9])/g;
// Numeric-leading model IDs keep their suffix and leading zeros (for example 0469JC18).
const CODE_C = /(?<![A-Za-z0-9\-/.$])(\d{2,7}[A-Z]{2,6}[A-Z0-9]*(?:-[A-Z0-9]{1,14}){0,5})(?![A-Za-z0-9])/g;
// Hyphenated letter series such as CH-OM-CL-G-12 or CH-OM-LF-C-AD (three or more parts).
const CODE_D = /(?<![A-Za-z0-9\-/.$#])([A-Z]{1,4}(?:-[A-Z0-9]{1,6}){2,7})(?![A-Za-z0-9\-])/g;
// Item numbers printed with a number sign, such as #2066, #18116 or #72.91 (stored without the sign).
const CODE_E = /(?<![A-Za-z0-9&])#\s?((?:\d{2,7}\.\d{1,3}|\d{3,7})[A-Z]{0,3}(?:-[A-Z0-9]{1,6}){0,3})(?![A-Za-z0-9\-])/g;
const MEASUREMENT_CODE = /^\d+(?:MM|CM|IN|FT|LB|LBS|KG|OZ|VAC|VDC|USB|AC|AMP|AMPS)\d*$/;
const STOP = /^(ISO|ANSI|BIFMA|ASTM|TSCA|CARB|AWI|NSF|CAL|UL|PO|FAX|TEL|SUITE|PAGE|FORM)/;
const HEADER_RE = /\b(model|item|part|sku|catalog|description|price|list|net|cost|each|qty|size|dimensions?|wgt|weight|color|finish|width|depth|height)\b/i;
const PRICEY_HEADER = /\b(price|msrp|your cost)\b/i;

export function codesInLine(line) {
  const out = [];
  for (const re of [CODE_A, CODE_B, CODE_C, CODE_D, CODE_E]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      const c = m[1];
      if (c.length < 3 || c.length > 30 || STOP.test(c)) continue;
      if (re === CODE_C && MEASUREMENT_CODE.test(c)) continue;
      if (re === CODE_B && !/[A-Z]/.test(c)) continue;
      if (re === CODE_D && (/^PRE-K/.test(c) || !(/\d/.test(c) || (c.split('-').length >= 4 && c.split('-').every((x) => x.length <= 3))))) continue;
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}

// pageLines: [{n, lines}] -> { products, headers, pricedHeaders }
export function rowsFromPages(pageLines) {
  const products = [];
  const headers = [];
  let pricedHeaders = 0;
  for (const pg of pageLines) {
    let cur = -1;
    for (let i = 0; i < pg.lines.length; i++) {
      const line = pg.lines[i];
      const cells = line.split(' | ');
      const codes = codesInLine(line);
      if (!codes.length && cells.length >= 2 && line.length <= 140 && HEADER_RE.test(line) && cells.every((c) => c.length <= 32)) {
        let hi = headers.indexOf(line);
        if (hi < 0) { headers.push(line); hi = headers.length - 1; }
        cur = hi;
        if (PRICEY_HEADER.test(line)) pricedHeaders++;
        continue;
      }
      if (!codes.length) continue;
      const lead = cells.length > 1 && !codesInLine(cells[0]).length ? cells[0].trim() : '';
      const prev = i > 0 ? pg.lines[i - 1] : '';
      const ctx = prev && !codesInLine(prev).length && prev.length <= 100 && !(HEADER_RE.test(prev) && prev.split(' | ').length >= 2 && prev.length <= 140) ? prev : '';
      for (const c of codes) {
        const row = { c, p: pg.n, r: line.slice(0, ROW_MAX) };
        if (lead) row.b = lead.slice(0, 80);
        if (ctx) row.x = ctx.slice(0, 120);
        if (cur >= 0) row.h = cur;
        products.push(row);
      }
    }
  }
  return { products, headers, pricedHeaders };
}

// ---------- products named on pages that print no model code ----------
// Lookbooks and brochures name their products without codes. A reader (the AI, injected) lists them; only
// names and codes that are really printed on that page are kept, so nothing invented gets in.
const normKey = (s) => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
export function namedRows(pageLines, items) {
  const byPage = new Map(pageLines.map((pg) => [pg.n, pg]));
  const out = [];
  const seen = new Set();
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it !== 'object') continue;
    const pg = byPage.get(Number(it.page));
    if (!pg) continue;
    const all = normKey(pg.lines.join(' '));
    const name = String(it.name == null ? '' : it.name).replace(/\s+/g, ' ').trim().slice(0, 80);
    let code = String(it.code == null ? '' : it.code).replace(/\s+/g, ' ').trim().slice(0, 30);
    const nk = normKey(name);
    const ck = normKey(code);
    if (!(ck.length >= 2 && all.includes(ck))) code = '';
    const nameOk = nk.length >= 3 && all.includes(nk);
    if (!nameOk && !code) continue;
    const key = pg.n + '|' + (code ? ck : nk);
    if (seen.has(key)) continue;
    seen.add(key);
    const want = code ? ck : nk;
    const line = pg.lines.find((l) => normKey(l).includes(want)) || '';
    const row = { c: code || name, p: pg.n, r: (line || name).slice(0, ROW_MAX), k: 'name' };
    if (code && nameOk) row.b = name;
    out.push(row);
  }
  return out;
}

// ---------- sections ----------
// tree: [{title, page, items:[...]}] already resolved to 1-based pages (0 = unknown).
export function sectionsFromTree(tree, pageCount) {
  const leaves = [];
  const walk = (nodes, group) => {
    for (const n of nodes || []) {
      if (!n || !n.title) continue;
      if (Array.isArray(n.items) && n.items.length) {
        // a parent with its own pages before its first child is a section too; otherwise its first child stands for it
        const first = Math.min(...n.items.map((c) => (c && c.page > 0 ? c.page : Infinity)));
        if (n.page > 0 && n.page < first) leaves.push({ group: group || String(n.title), title: String(n.title), page: n.page });
        walk(n.items, group || String(n.title));
      }
      else if (n.page > 0) leaves.push({ group: group || String(n.title), title: String(n.title), page: n.page });
    }
  };
  walk(tree, '');
  return finishSections(leaves, pageCount);
}

function finishSections(leaves, pageCount) {
  leaves = leaves.filter((l) => l.page >= 1 && l.page <= pageCount).sort((a, b) => a.page - b.page);
  // bookmarks that are really web links often all point at page 1: keep only the first of those
  let atOne = 0;
  leaves = leaves.filter((l) => l.page !== 1 || ++atOne === 1);
  const seen = new Set();
  leaves = leaves.filter((l) => { const k = l.page + '|' + lc(l.title); if (seen.has(k)) return false; seen.add(k); return true; });
  if (!leaves.length) return [];
  if (leaves[0].page > 1) leaves.unshift({ group: 'Front matter', title: 'Front matter', page: 1 });
  return leaves.map((l, i) => ({ group: l.group, title: l.title, page: l.page, id: 's' + (i + 1), end: i + 1 < leaves.length ? Math.max(l.page, leaves[i + 1].page - (leaves[i + 1].page > l.page ? 1 : 0)) : pageCount }));
}

// No bookmarks in the PDF: sections come from the heading line of each page, runs of the same heading merged.
export function sectionsFromTitles(titles, pageCount) {
  const leaves = [];
  let last = null;
  titles.forEach((t, i) => {
    const title = t && t.length <= 70 && !/^[\d\s.,$-]+$/.test(t) ? t : '';
    if (title && lc(title) !== lc(last)) { leaves.push({ group: 'Catalogue', title, page: i + 1 }); last = title; }
  });
  if (leaves.length < 2 || leaves.length > pageCount * 0.6) {
    const out = [];
    for (let a = 1; a <= pageCount; a += 10) out.push({ group: 'Catalogue', title: 'Pages ' + a + '-' + Math.min(pageCount, a + 9), page: a });
    return finishSections(out, pageCount);
  }
  return finishSections(leaves, pageCount);
}

// ---------- splitting ----------
// Equal page runs sized so each piece is likely under the storage limit; pieces that still come out too
// big are halved when they are made.
export function splitPlan(pageCount, totalBytes, maxBytes = STORAGE_MAX_BYTES) {
  const k = Math.max(1, Math.ceil(totalBytes / (maxBytes * 0.8)));
  const per = Math.max(1, Math.ceil(pageCount / k));
  const out = [];
  for (let a = 1; a <= pageCount; a += per) out.push([a, Math.min(pageCount, a + per - 1)]);
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, tries = 4, delay = 500) {
  let err = null;
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v; err = new Error('upload refused'); } catch (e) { err = e; }
    if (i + 1 < tries) await sleep(delay * (i + 1));
  }
  throw err || new Error('upload failed');
}

// ---------- the browser pieces (injected in tests) ----------
export async function renderPageJpeg(page) {
  const vp0 = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, IMG_WIDTH / vp0.width);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.72));
  canvas.width = 0; canvas.height = 0;
  return blob;
}

// ---------- the whole job ----------
// file: a File (or any Blob with name). vendor: {id, name, phone?, email?}.
// deps: {pdfjs, pdflib?, upload(path, blob) -> url|null, publicUrl?(path) -> url, renderPage?, company?}
export async function ingestCatalog({ file, vendor, title, edition, hasPrices = 'auto', sourceUrl = '', deps = {}, onProgress = () => {}, isCancelled = () => false }) {
  if (!file || !vendor || !vendor.id) throw new Error('Pick a vendor and a PDF.');
  if (!/\.pdf$/i.test(file.name || '') && file.type !== 'application/pdf') throw new Error('Only PDF catalogues can be loaded.');
  const ed = normalizeCatalogEdition(edition);
  const upload = deps.upload;
  if (typeof upload !== 'function') throw new Error('No place to save the catalogue.');
  const pdfjs = deps.pdfjs || (await loadPdfJs());
  const render = deps.renderPage || renderPageJpeg;
  const warnings = [];
  const check = () => { if (isCancelled()) throw new Error('Cancelled.'); };
  const retry = (fn) => withRetry(fn, 4, deps.retryDelay == null ? 500 : deps.retryDelay);
  const ttl = String(title || '').trim() || String(file.name || 'Catalogue').replace(/\.pdf$/i, '');
  const uploadId = globalThis.crypto.randomUUID();
  const base = 'catalogs/' + vendor.id + '/' + slugify(ttl) + '-' + slugify(ed || 'unknown') + '/' + uploadId + '/';
  const baseUrl = (deps.publicUrl || ((p) => p))(base);

  onProgress({ stage: 'reading', done: 0, total: 1, message: 'Reading the PDF (' + (file.size / 1048576).toFixed(0) + ' MB)...' });
  let data;
  try { data = new Uint8Array(await file.arrayBuffer()); } catch (e) { throw new Error('Could not read the file from this computer. ' + ((e && e.message) || '')); }
  check();
  let pdf;
  // pdf.js takes ownership of the bytes it is given; the file is read again later if it has to be stored or split
  try { pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise; } catch (e) { throw new Error('That PDF could not be opened (' + ((e && e.message) || 'unreadable or password protected') + ').'); }
  const pageCount = pdf.numPages;
  if (!pageCount) throw new Error('That PDF has no pages.');

  const pageLines = [];
  const pageRecs = [];
  const queue = new Set();
  let imgFail = 0, imgOk = 0;
  const pushUpload = async (n, blob) => {
    const job = retry(() => upload(base + 'pages/p-' + pad3(n) + '.jpg', blob)).then(() => { imgOk++; }, () => { imgFail++; }).finally(() => queue.delete(job));
    queue.add(job);
    if (queue.size >= 3) await Promise.race(queue);
  };
  let textChars = 0;
  for (let n = 1; n <= pageCount; n++) {
    check();
    onProgress({ stage: 'pages', done: n - 1, total: pageCount, message: 'Reading page ' + n + ' of ' + pageCount + '...' });
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    const lines = linesFromItems(tc.items);
    let text = lines.join('\n');
    textChars += text.length;
    const trunc = text.length > TEXT_MAX;
    if (trunc) text = text.slice(0, TEXT_MAX);
    pageLines.push({ n, lines });
    const rec = { n, pn: null, sec: '', title: (lines[0] || 'Page ' + n).slice(0, 90), text };
    if (trunc) rec.trunc = true;
    pageRecs.push(rec);
    try { const blob = await render(page); if (blob) await pushUpload(n, blob); else imgFail++; } catch { imgFail++; }
    if (page.cleanup) page.cleanup();
  }
  await Promise.all([...queue]);
  check();
  if (textChars < pageCount * 20) warnings.push('This PDF has almost no text (it may be scanned pictures), so searching by model code or word will find little. The page pictures are saved and can be read.');

  // structure
  onProgress({ stage: 'structure', done: 0, total: 1, message: 'Finding sections, model codes and prices...' });
  let sections = [];
  try {
    const outline = await pdf.getOutline();
    if (outline && outline.length) {
      const resolve = async (nodes) => {
        const out = [];
        for (const nd of nodes || []) {
          let page = 0;
          try {
            let d = nd.dest;
            if (typeof d === 'string') d = await pdf.getDestination(d);
            if (Array.isArray(d) && d.length) { const ref = d[0]; if (ref && typeof ref === 'object') page = (await pdf.getPageIndex(ref)) + 1; else if (Number.isInteger(ref)) page = ref + 1; }
          } catch { page = 0; }
          out.push({ title: nd.title, page, items: await resolve(nd.items) });
        }
        return out;
      };
      sections = sectionsFromTree(await resolve(outline), pageCount);
    }
  } catch { sections = []; }
  if (sections.length < Math.max(2, pageCount / 10)) sections = sectionsFromTitles(pageRecs.map((p) => p.title), pageCount);
  const secOf = (n) => { let s = sections[0]; for (const x of sections) if (x.page <= n) s = x; return s; };
  for (const p of pageRecs) p.sec = secOf(p.n).id;

  const { products, headers, pricedHeaders } = rowsFromPages(pageLines);
  let named = 0;
  if (typeof deps.aiProducts === 'function') {
    const have = new Set(products.map((r) => r.p));
    const todo = pageLines.filter((pg) => !have.has(pg.n) && pg.lines.join(' ').length >= 80);
    const batches = [];
    let cur = [];
    let size = 0;
    for (const pg of todo) {
      const t = pg.lines.join('\n').slice(0, 6000);
      if (cur.length && (cur.length >= 6 || size + t.length > 16000)) { batches.push(cur); cur = []; size = 0; }
      cur.push({ n: pg.n, text: t, lines: pg.lines });
      size += t.length;
    }
    if (cur.length) batches.push(cur);
    let aiFail = 0;
    let doneB = 0;
    const work = batches.map((b) => async () => {
      check();
      try {
        const rows = namedRows(b, await deps.aiProducts(b.map((x) => ({ n: x.n, text: x.text }))));
        products.push(...rows);
        named += rows.length;
      } catch (e) { if (/^Cancelled/.test((e && e.message) || '')) throw e; aiFail++; }
      doneB++;
      onProgress({ stage: 'products', done: doneB, total: batches.length, message: 'Reading product names on pages without model codes (' + doneB + ' of ' + batches.length + ')...' });
    });
    if (batches.length) onProgress({ stage: 'products', done: 0, total: batches.length, message: 'Reading product names on pages without model codes...' });
    for (let i = 0; i < work.length; i += 3) await Promise.all(work.slice(i, i + 3).map((f) => f()));
    check();
    if (aiFail) warnings.push('Product names could not be read on ' + aiFail + ' group' + (aiFail === 1 ? '' : 's') + ' of pages without model codes. Their text and pictures are still saved.');
    products.sort((a, b) => a.p - b.p);
  }
  const figures = pageLines.reduce((a, pg) => a + priceFigures(pg.lines.join('\n')), 0);
  const priced = hasPrices === true || hasPrices === 'yes' ? true : hasPrices === false || hasPrices === 'no' ? false : figures >= Math.max(10, pageCount * 0.5) || pricedHeaders >= Math.max(5, pageCount * 0.1);
  const withRows = new Set(products.map((r) => secOf(r.p).id));
  for (const s of sections) s.products = withRows.has(s.id);
  const profilePages = pageRecs.filter((p) => /warrant|terms and conditions|how to order|ordering|purchase order|contact us|returns|shipping/i.test(p.title)).slice(0, 10).map((p) => p.n);
  const groups = [...new Set(sections.filter((s) => s.products).map((s) => s.group))];
  const codeSet = new Set(products.map((r) => lc(r.c)));
  const catalog = {
    v: 1, vendorId: vendor.id, vendorName: vendor.name, title: ttl, edition: ed, source: file.name || '', hasPrices: priced, pageOffset: 0, pageCount,
    company: { name: vendor.name, phone: vendor.phone || '', email: vendor.email || '', ...(deps.company || {}) }, profilePages,
    notes: ['Loaded from the PDF "' + (file.name || ttl) + '" inside the app' + (sourceUrl ? ', downloaded from ' + sourceUrl : '') + '.', priced ? 'This edition has prices; they appear on the rows and pages as printed.' : 'No prices were found in this edition.'],
    sections, pages: pageRecs, headers, products, index: [], generatedAt: todayLocal(),
  };

  check();
  onProgress({ stage: 'saving', done: 0, total: 1, message: 'Saving the catalogue...' });
  const jsonUrl = await retry(() => upload(base + 'catalog.json', new Blob([JSON.stringify(catalog)], { type: 'application/json' })));

  // the PDF itself, whole or in pieces
  data = null;
  const link = {};
  const pdfBytes = file.size;
  try {
    if (pdfBytes <= STORAGE_MAX_BYTES) {
      onProgress({ stage: 'pdf', done: 0, total: 1, message: 'Saving the PDF...' });
      const whole = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
      link.pdfUrl = await retry(() => upload(base + 'pdf/catalog.pdf', whole));
    } else {
      const lib = deps.pdflib || (await loadPdfLib());
      onProgress({ stage: 'pdf', done: 0, total: 1, message: 'Splitting the ' + (pdfBytes / 1048576).toFixed(0) + ' MB PDF into pieces that fit in storage...' });
      const src = await lib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true, updateMetadata: false });
      const parts = [];
      const emit = async (from, to) => {
        check();
        const doc = await lib.PDFDocument.create();
        const copied = await doc.copyPages(src, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
        copied.forEach((pg) => doc.addPage(pg));
        const bytes = await doc.save();
        if (bytes.length > STORAGE_MAX_BYTES) {
          if (to === from) throw new Error('page ' + from + ' alone is over the storage limit');
          const mid = Math.floor((from + to) / 2);
          await emit(from, mid); await emit(mid + 1, to); return;
        }
        const name = 'part-p' + pad3(from) + '-' + pad3(to) + '.pdf';
        onProgress({ stage: 'pdf', done: parts.length, total: 0, message: 'Saving PDF pages ' + from + '-' + to + '...' });
        const url = await retry(() => upload(base + 'pdf/' + name, new Blob([bytes], { type: 'application/pdf' })));
        parts.push({ url, from, to, bytes: bytes.length });
      };
      for (const [a, b] of splitPlan(pageCount, pdfBytes)) await emit(a, b);
      link.pdfParts = parts.sort((x, y) => x.from - y.from);
    }
  } catch (e) {
    if (/^Cancelled/.test((e && e.message) || '')) throw e;
    warnings.push('The catalogue is loaded, but the original PDF could not be stored (' + ((e && e.message) || 'unknown error') + '). Page pictures and text still work.');
  }
  if (imgFail) warnings.push(imgFail + ' page picture' + (imgFail === 1 ? '' : 's') + ' could not be saved.');

  const rec = {
    vendorId: vendor.id, vendorName: vendor.name, title: ttl, edition: ed, url: jsonUrl,
    ...link, ...(imgOk ? { pageImgBase: baseUrl + 'pages/' } : {}),
    pageCount, productCount: products.length, sectionCount: sections.length, groups, hasPrices: priced, uploadedAt: todayLocal(),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
  const stats = { pages: pageCount, rows: products.length, named, codes: codeSet.size, sections: sections.length, priceFigures: figures, images: imgOk, pdfPieces: link.pdfParts ? link.pdfParts.length : link.pdfUrl ? 1 : 0 };
  onProgress({ stage: 'done', done: 1, total: 1, message: 'Done.' });
  return { id: 'VCAT-' + vendor.id + '-' + slugify(ttl).slice(0, 20) + '-' + slugify(ed || 'unknown') + '-' + uploadId, rec, stats, warnings };
}

// ---------- a catalogue from a link ----------
// The server downloads the vendor's PDF into storage pieces (see api/catalog.js); here they are joined back
// into one file that goes through ingestCatalog like an upload. A link to a web page answers with the PDF
// links found on it instead: {links, page, title}.
export async function fetchCatalogFromLink({ url, vendor, api = '/api/catalog', fetchImpl = (u, o) => fetch(u, o), onProgress = () => {}, isCancelled = () => false }) {
  const link = String(url == null ? '' : url).trim();
  if (!/^https?:\/\/[^\s]+$/i.test(link)) throw new Error('Paste the full link, starting with https://');
  if (!vendor || !vendor.id) throw new Error('Pick a vendor first.');
  onProgress({ stage: 'download', done: 0, total: 1, message: 'Getting the catalogue from the link...' });
  let r;
  try { r = await fetchImpl(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch', url: link, vendorId: vendor.id }) }); } catch (e) { throw new Error('Could not reach the app server (' + ((e && e.message) || 'offline') + ').'); }
  let j = null;
  try { j = await r.json(); } catch { j = null; }
  if (!r.ok || !j || j.error) throw new Error((j && j.error) || 'The link could not be read (HTTP ' + r.status + ').');
  if (j.kind === 'links') return { links: Array.isArray(j.links) ? j.links : [], page: j.page || link, title: j.title || '' };
  if (j.kind !== 'pdf' || !Array.isArray(j.parts) || !j.parts.length) throw new Error('The link did not give a PDF.');
  const blobs = [];
  for (let i = 0; i < j.parts.length; i++) {
    if (isCancelled()) throw new Error('Cancelled.');
    onProgress({ stage: 'download', done: i, total: j.parts.length, message: 'Downloading the PDF (' + Math.round((j.bytes || 0) / 1048576) + ' MB, piece ' + (i + 1) + ' of ' + j.parts.length + ')...' });
    let pr = null;
    for (let t = 0; t < 3 && !(pr && pr.ok); t++) { try { pr = await fetchImpl(j.parts[i]); } catch { pr = null; } }
    if (!pr || !pr.ok) throw new Error('Could not download piece ' + (i + 1) + ' of the PDF. Try again.');
    blobs.push(await pr.blob());
  }
  const name = String(j.name || 'catalogue.pdf');
  const file = new File(blobs, /\.pdf$/i.test(name) ? name : name + '.pdf', { type: 'application/pdf' });
  if (j.bytes && file.size !== j.bytes) throw new Error('The download was incomplete (' + file.size + ' of ' + j.bytes + ' bytes). Try again.');
  return { file, sourceUrl: j.source || link, token: j.token || '', pieces: j.parts.length };
}

// Empties the temporary download pieces; never throws.
export async function clearDownload({ vendor, token, pieces, api = '/api/catalog', fetchImpl = (u, o) => fetch(u, o) }) {
  if (!token || !vendor || !vendor.id) return;
  try { await fetchImpl(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear', vendorId: vendor.id, token, count: pieces || 0 }) }); } catch { /* temporary pieces stay; harmless */ }
}

// The AI reader for pages that name products without codes (api/catalog.js "products").
export function aiProductsVia(api = '/api/catalog', fetchImpl = (u, o) => fetch(u, o)) {
  return async (pages) => {
    const r = await fetchImpl(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'products', pages }) });
    let j = null;
    try { j = await r.json(); } catch { j = null; }
    if (!r.ok || !j || !Array.isArray(j.items)) throw new Error((j && j.error) || 'HTTP ' + r.status);
    return j.items;
  };
}
