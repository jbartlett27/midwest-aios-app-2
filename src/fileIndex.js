// QuickBooks export index. Pure functions: no React, no network at import time.
// A workbook is read into sheets of plain rows, each sheet is classified by its header
// row, and every transaction row becomes a record that the Brain and the Files tab can
// search. Journal Detail sheets are kept apart and attached to a record on demand.
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
const cell = (v) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

export const KIND_LABEL = {
  invoice: 'Invoice', purchase_order: 'Purchase Order', vendor_payment: 'Vendor Payment',
  customer_payment: 'Customer Payment', check_expense: 'Check / Expense', bill: 'Bill',
  credit_memo: 'Credit Memo', journal: 'Journal line', other: 'Other',
};

const ALIASES = {
  date: ['date', 'transaction date'],
  num: ['invoice #', 'invoice no.', 'invoice number', 'num', 'no.', 'number', 'check #', 'check no.', 'ref no.', 'ref #', 'doc num', 'payment #'],
  name: ['customer:project', 'customer', 'customer name', 'name', 'vendor', 'vendor name', 'payee', 'received from', 'payor'],
  amount: ['invoice amount', 'amount', 'amount paid', 'amount received', 'payment amount', 'total'],
  type: ['type', 'transaction type'],
  memo: ['memo', 'memo/description', 'description'],
  account: ['account', 'account full name', 'expense account(s)', 'expense account'],
  paidFrom: ['paid from', 'deposit to', 'bank account'],
  method: ['payment method', 'pay method'],
  split: ['split'],
  debit: ['debit'],
  credit: ['credit'],
};

// "01/02/2026", "1/2/26", "2026-01-02" or an Excel date serial -> "2026-01-02". Anything else
// (or a date outside 2000 to 2100, or one that is not on the calendar) -> "".
export function toIsoDate(v) {
  const build = (y, m, d) => {
    if (!(y >= 2000 && y <= 2100)) return '';
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
    return String(y) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  };
  if (v == null || v === '') return '';
  if (typeof v === 'number') {
    if (!(v >= 36526 && v <= 73415)) return '';
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return build(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) return build(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[1]), Number(m[2]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  return '';
}

// 1234.5, "1,234.50", "$1,234.50", "(12.00)", "-12" -> number. "", "n/a", garbage -> null.
export function toAmount(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let x = String(v == null ? '' : v).replace(/[$,\s]/g, '');
  if (x === '') return null;
  const neg = /^\(.*\)$/.test(x);
  if (neg) x = x.slice(1, -1);
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(x)) return null;
  const n = Number(x);
  return isFinite(n) ? (neg ? -n : n) : null;
}

const round2 = (n) => Math.round(n * 100) / 100;
const usd = (n) => (n < 0 ? '-$' : '$') + Math.abs(round2(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const us = (iso) => (iso ? iso.slice(5, 7) + '/' + iso.slice(8, 10) + '/' + iso.slice(0, 4) : '--');

// Maps each field to the column index of its first matching alias (alias order is priority).
function mapColumns(headerRow) {
  const h = headerRow.map(norm);
  const cols = {};
  for (const f of Object.keys(ALIASES)) {
    for (const a of ALIASES[f]) { const i = h.indexOf(a); if (i >= 0) { cols[f] = i; break; } }
  }
  return cols;
}

// The header row is the first of the top 25 rows with at least 3 filled cells, a Date column
// and one more recognised column. Report title rows above it are kept as the sheet title.
export function findHeaderRow(rows) {
  const known = new Set(Object.values(ALIASES).flat());
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const r = rows[i] || [];
    const cells = r.map(norm).filter(Boolean);
    if (cells.length >= 3 && cells.some((c) => ALIASES.date.includes(c)) && cells.filter((c) => known.has(c)).length >= 3) return i;
  }
  return -1;
}

export function classifySheet(headerRow, sheetName) {
  const h = new Set(headerRow.map(norm));
  const has = (x) => h.has(x);
  const sn = norm(sheetName);
  if (has('debit') && has('credit') && has('account')) return 'journal';
  if (has('invoice #') || has('invoice no.') || has('invoice number')) return 'invoice';
  if (has('payee') || has('expense account(s)') || has('expense account')) return 'check_expense';
  if ((has('check #') || has('check no.')) && (has('vendor') || has('vendor name'))) return 'vendor_payment';
  if ((has('customer') || has('customer name') || has('received from')) && (has('payment method') || has('deposit to') || /payment|receipt/.test(sn))) return 'customer_payment';
  if (has('transaction type') || has('type')) return 'transactions';
  return 'other';
}

// Per-row kind for a "Transaction List by Date" style sheet.
export function kindFromType(t) {
  const x = norm(t);
  if (!x) return 'other';
  if (/purchase order/.test(x)) return 'purchase_order';
  if (/bill payment/.test(x)) return 'vendor_payment';
  if (/credit memo/.test(x)) return 'credit_memo';
  if (/^invoice/.test(x)) return 'invoice';
  if (/^(received )?payment|sales receipt/.test(x)) return 'customer_payment';
  if (/^(check|expense|credit card)/.test(x)) return 'check_expense';
  if (/^bill/.test(x)) return 'bill';
  return 'other';
}

const defaultJournalType = { invoice: 'Invoice', credit_memo: 'Credit Memo', bill: 'Bill' };

// One workbook (already read into [{name, rows}]) -> { sheets, records, journal }.
export function indexWorkbook(file, sheets) {
  const out = { sheets: [], records: [], journal: [] };
  for (const sh of sheets || []) {
    const rows = Array.isArray(sh && sh.rows) ? sh.rows : [];
    const hi = findHeaderRow(rows);
    if (hi < 0) { out.sheets.push({ fileId: file.id, fileName: file.name, sheet: sh.name, kind: 'unrecognized', count: 0, title: '' }); continue; }
    const headerRow = rows[hi];
    const kind = classifySheet(headerRow, sh.name);
    const cols = mapColumns(headerRow);
    const title = rows.slice(0, hi).map((r) => (r || []).map(cell).filter(Boolean).join(' ')).filter(Boolean).slice(0, 2).join(' | ');
    const get = (r, f) => (cols[f] == null ? '' : r[cols[f]]);
    const info = { fileId: file.id, fileName: file.name, sheet: sh.name, kind, count: 0, title, dateMin: '', dateMax: '', total: 0, kinds: {} };
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      if (!r.some((c) => cell(c) !== '')) continue;
      // QuickBooks ends a report with a TOTAL row whose number cell reads like "313 transactions".
      if (/^(grand )?total\b/.test(norm(r[0]))) continue;
      const date = toIsoDate(get(r, 'date'));
      const base = {
        fileId: file.id, fileName: file.name, sheet: sh.name, row: i + 1, date,
        num: cell(get(r, 'num')), name: cell(get(r, 'name')), type: cell(get(r, 'type')), memo: cell(get(r, 'memo')),
        account: cell(get(r, 'account')),
      };
      if (kind === 'journal') {
        if (!date && !base.num && !base.name) continue;
        out.journal.push({ ...base, debit: toAmount(get(r, 'debit')), credit: toAmount(get(r, 'credit')) });
        info.count++;
        continue;
      }
      if (!date && !base.num) continue; // a subtotal or footer line, not a transaction
      const k = kind === 'transactions' ? kindFromType(base.type) : kind;
      const amount = toAmount(get(r, 'amount'));
      const parts = base.name.split(':');
      const rec = {
        ...base, kind: k, amount,
        customer: k === 'invoice' || k === 'customer_payment' || k === 'credit_memo' ? cell(parts[0]) : '',
        project: parts.length > 1 ? cell(parts.slice(1).join(':')) : '',
        paidFrom: cell(get(r, 'paidFrom')), method: cell(get(r, 'method')), split: cell(get(r, 'split')),
      };
      out.records.push(rec);
      info.count++;
      info.kinds[k] = (info.kinds[k] || 0) + 1;
      if (amount != null) info.total = round2(info.total + amount);
      if (date) { if (!info.dateMin || date < info.dateMin) info.dateMin = date; if (!info.dateMax || date > info.dateMax) info.dateMax = date; }
    }
    out.sheets.push(info);
  }
  return out;
}

// Group files by version family and keep only the newest version, as the Files tab does.
export function latestVersions(files) {
  const g = new Map();
  for (const f of files || []) {
    if (!f) continue;
    const k = f.parentId || f.id;
    const cur = g.get(k);
    if (!cur || (f.version || 1) > (cur.version || 1)) g.set(k, f);
  }
  return [...g.values()];
}

export function isSpreadsheetFile(f) {
  const name = String((f && (f.originalName || f.name)) || '');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const t = String((f && f.type) || '').toLowerCase();
  return ['xlsx', 'xls', 'csv'].includes(ext) || t.includes('spreadsheet') || t.includes('ms-excel') || t === 'text/csv';
}

export function mergeIndexes(parts) {
  const idx = { sheets: [], records: [], journal: [], errors: [] };
  for (const p of parts) { idx.sheets.push(...p.sheets); idx.records.push(...p.records); idx.journal.push(...p.journal); }
  const jm = new Map();
  for (const j of idx.journal) {
    const key = [norm(j.type), norm(j.num), norm(j.date)].join('|');
    if (!jm.has(key)) jm.set(key, []);
    jm.get(key).push(j);
  }
  idx._jm = jm;
  return idx;
}

// Journal lines behind one record: same type, same number and same date, and the same name
// when the number is blank (expenses). Returns [] when the workbook had no Journal Detail.
export function journalFor(idx, rec) {
  if (!idx || !rec) return [];
  const type = rec.type || defaultJournalType[rec.kind] || '';
  const key = [norm(type), norm(rec.num), norm(rec.date)].join('|');
  let lines = (idx._jm && idx._jm.get(key)) || [];
  if (!rec.num) lines = lines.filter((l) => norm(l.name) === norm(rec.name));
  return lines;
}

// "Purchase Orders", "po", "checks", "Bill Payment" ... -> the kind keys used by the records.
const KIND_WORDS = {
  invoice: 'invoice', invoices: 'invoice', purchase_order: 'purchase_order', purchase_orders: 'purchase_order', po: 'purchase_order', pos: 'purchase_order',
  vendor_payment: 'vendor_payment', vendor_payments: 'vendor_payment', bill_payment: 'vendor_payment', bill_payments: 'vendor_payment',
  customer_payment: 'customer_payment', customer_payments: 'customer_payment', payment: 'customer_payment', payments: 'customer_payment',
  check: 'check_expense', checks: 'check_expense', expense: 'check_expense', expenses: 'check_expense', check_expense: 'check_expense', check_expenses: 'check_expense', checks_expenses: 'check_expense',
  bill: 'bill', bills: 'bill', credit_memo: 'credit_memo', credit_memos: 'credit_memo', journal: 'journal',
};
export const normKind = (v) => { const k = norm(v).replace(/[\s\/&-]+/g, '_'); return KIND_WORDS[k] || k; };

const asList = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const cleanNum = (s) => norm(String(s == null ? '' : s).replace(/^#/, ''));

// Search records. q: { kind, number, name, text, amount, amountMin, amountMax, dateFrom, dateTo,
// file, groupBy: 'name'|'month'|'kind'|'file', limit }. Totals cover every match, not just the
// rows returned, so a sum never depends on the display limit.
export function searchRecords(idx, q = {}) {
  const lim = Math.max(1, Math.min(200, Math.floor(Number(q.limit)) || 25));
  let rows = (idx && idx.records) || [];
  const kinds = asList(q.kind).map(normKind).filter(Boolean);
  if (kinds.length) rows = rows.filter((r) => kinds.includes(r.kind));
  if (q.file) { const f = norm(q.file); rows = rows.filter((r) => norm(r.fileName).includes(f)); }
  let loose = false;
  if (q.number != null && String(q.number).trim() !== '') {
    const n = cleanNum(q.number);
    const exact = rows.filter((r) => cleanNum(r.num) === n);
    if (exact.length) rows = exact; else { loose = true; rows = rows.filter((r) => cleanNum(r.num).includes(n)); }
  }
  if (q.name) { const n = norm(q.name); rows = rows.filter((r) => norm(r.name).includes(n)); }
  if (q.text) {
    const toks = norm(q.text).split(' ').filter(Boolean);
    rows = rows.filter((r) => { const hay = norm([r.name, r.memo, r.num, r.account, r.type, r.paidFrom, r.split].join(' ')); return toks.every((t) => hay.includes(t)); });
  }
  const exactAmt = toAmount(q.amount);
  if (exactAmt != null) rows = rows.filter((r) => r.amount != null && Math.abs(Math.abs(r.amount) - Math.abs(exactAmt)) < 0.005);
  const lo = toAmount(q.amountMin), hi = toAmount(q.amountMax);
  if (lo != null) rows = rows.filter((r) => r.amount != null && r.amount >= lo - 0.005);
  if (hi != null) rows = rows.filter((r) => r.amount != null && r.amount <= hi + 0.005);
  const df = toIsoDate(q.dateFrom), dt = toIsoDate(q.dateTo);
  if (q.dateFrom && !df) return { error: 'dateFrom must be a real date like 2026-03-31 or 03/31/2026' };
  if (q.dateTo && !dt) return { error: 'dateTo must be a real date like 2026-03-31 or 03/31/2026' };
  if (df) rows = rows.filter((r) => r.date && r.date >= df);
  if (dt) rows = rows.filter((r) => r.date && r.date <= dt);
  rows = rows.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.num).localeCompare(String(a.num), undefined, { numeric: true }));
  const total = round2(rows.reduce((s, r) => s + (r.amount || 0), 0));
  const out = { total: rows.length, amount: total, loose, rows: rows.slice(0, lim), truncated: rows.length > lim };
  if (q.groupBy) {
    const keyOf = { name: (r) => r.name || '(none)', month: (r) => (r.date ? r.date.slice(0, 7) : '(no date)'), kind: (r) => KIND_LABEL[r.kind] || r.kind, file: (r) => r.fileName }[q.groupBy];
    if (!keyOf) return { error: 'groupBy must be name, month, kind or file' };
    const g = new Map();
    for (const r of rows) { const k = keyOf(r); const e = g.get(k) || { key: k, count: 0, amount: 0 }; e.count++; e.amount = round2(e.amount + (r.amount || 0)); g.set(k, e); }
    out.groups = [...g.values()].sort((a, b) => (q.groupBy === 'month' ? a.key.localeCompare(b.key) : Math.abs(b.amount) - Math.abs(a.amount)));
  }
  return out;
}

// One search box for people: a document number, an amount, or words from a name or memo.
export function quickSearch(idx, query, kind, limit) {
  const q = String(query == null ? '' : query).trim();
  if (!q) return null;
  const base = { kind: kind || undefined, limit };
  if (/^[#$]?\d[\d,.]*$/.test(q) || /^#?\d[\w-]*$/.test(q)) {
    const byNum = searchRecords(idx, { ...base, number: q });
    if (byNum.total && !byNum.loose) return byNum;
    if (toAmount(q) != null) { const byAmt = searchRecords(idx, { ...base, amount: q }); if (byAmt.total) return byAmt; }
    if (byNum.total) return byNum;
  }
  return searchRecords(idx, { ...base, text: q });
}

const mdCell = (v) => cell(v).replace(/\|/g, '/') || '--';

export function recordsToMarkdown(rows) {
  if (!rows.length) return '_No matching records._';
  const head = '| Date | Type | # | Name | Amount | Source |\n|---|---|---|---|---|---|\n';
  return head + rows.map((r) => '| ' + [us(r.date), mdCell(r.type || KIND_LABEL[r.kind]), mdCell(r.num), mdCell(r.name), r.amount == null ? '--' : usd(r.amount), mdCell(r.fileName) + ' > ' + mdCell(r.sheet) + ' row ' + r.row].join(' | ') + ' |').join('\n');
}

export function journalToMarkdown(lines) {
  if (!lines.length) return '_No Journal Detail lines were found for this record in the uploaded files._';
  return '| Account | Memo | Debit | Credit |\n|---|---|---|---|\n' + lines.slice(0, 40).map((l) => '| ' + [mdCell(l.account), mdCell(l.memo), l.debit == null ? '' : usd(l.debit), l.credit == null ? '' : usd(l.credit)].join(' | ') + ' |').join('\n') + (lines.length > 40 ? '\n_(' + (lines.length - 40) + ' more lines)_' : '');
}

export function describeSheets(idx) {
  return (idx.sheets || []).map((s) => {
    if (s.kind === 'unrecognized') return { ...s, text: s.fileName + ' > ' + s.sheet + ': not a transaction table I recognise (no Date/Num/Amount header found).' };
    const what = s.kind === 'journal' ? s.count + ' Journal Detail lines' : Object.keys(s.kinds).map((k) => s.kinds[k] + ' ' + (KIND_LABEL[k] || k).toLowerCase() + (s.kinds[k] === 1 ? '' : 's')).join(', ');
    const range = s.dateMin ? ', ' + us(s.dateMin) + ' to ' + us(s.dateMax) : '';
    const total = s.kind === 'journal' ? '' : ', total ' + usd(s.total);
    return { ...s, text: s.fileName + ' > ' + s.sheet + ': ' + (what || s.count + ' rows') + range + total };
  });
}

export const fmtUsd = usd;
export const fmtUs = us;

// ---------- loading (network and xlsx are injected so tests can run offline) ----------
const _sheetCache = new Map();
const _idxCache = { sig: '', promise: null };

export async function readFileSheets(file, { XLSX, fetchImpl }) {
  const key = [file.id, file.size, file.url].join('|');
  if (_sheetCache.has(key)) return _sheetCache.get(key);
  const p = (async () => {
    const r = await fetchImpl(file.url);
    if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status));
    const wb = XLSX.read(await r.arrayBuffer(), { type: 'array' });
    return wb.SheetNames.map((n) => ({ name: n, rows: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }) }));
  })();
  _sheetCache.set(key, p);
  p.catch(() => _sheetCache.delete(key));
  return p;
}

// Index every newest-version spreadsheet in the Files tab. A file that cannot be read is
// reported in errors and never hides the others.
export async function buildFileIndex(files, { importXlsx, fetchImpl }) {
  const sheetFiles = latestVersions(files).filter((f) => f && f.url && isSpreadsheetFile(f));
  const sig = sheetFiles.map((f) => [f.id, f.size, f.url].join(':')).sort().join(',');
  if (_idxCache.sig === sig && _idxCache.promise) return _idxCache.promise;
  const p = (async () => {
    const XLSX = await importXlsx();
    const parts = [], errors = [];
    for (const f of sheetFiles) {
      try { parts.push(indexWorkbook(f, await readFileSheets(f, { XLSX, fetchImpl }))); }
      catch (e) { errors.push({ fileName: f.name, message: String((e && e.message) || e) }); }
    }
    const idx = mergeIndexes(parts);
    idx.errors = errors;
    idx.fileCount = sheetFiles.length;
    return idx;
  })();
  _idxCache.sig = sig; _idxCache.promise = p;
  p.then((i) => { if (i.errors.length) _idxCache.sig = ''; }, () => { _idxCache.sig = ''; });
  return p;
}

export function _resetFileIndexCache() { _sheetCache.clear(); _idxCache.sig = ''; _idxCache.promise = null; }
