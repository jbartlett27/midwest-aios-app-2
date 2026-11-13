// Brain grounding check (Nov 2026). J: "Make sure the brain can never make stuff up, it always
// grounds in facts. Like the vendor stuff especially it needs to cite the actual vendor
// catalogues and never hallucinate."
// After the Brain writes an answer, every model code in it (read with the same patterns the
// catalogue reader uses) must appear somewhere the Brain was actually given: the business context,
// what the user typed, or a tool result. In a conversation that used a vendor catalogue, every
// dollar figure must too (a figure the answer works out with "=" or on a "total" line is its own
// math). Anything else came from nowhere, and the Brain is sent back once to fix it; if it still
// will not, the answer carries a visible "not verified" line.
import { codesInLine } from './catalogIngest.js';

const PRICE = /\$\s?\d[\d,]*(?:\.\d{1,2})?/g;
const NUM = /\d[\d,]*(?:\.\d{1,2})?/g;
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const money = (s) => { const v = parseFloat(String(s).replace(/[$,\s]/g, '')); return isFinite(v) ? Math.round(v * 100) : null; };

// The text the Brain was given: the system context, the user's words and every tool result.
// The Brain's own earlier answers, and this check's own notes to it, are not a source.
export function groundingSources(system, convo) {
  const out = [typeof system === 'string' ? system : ''];
  for (const m of Array.isArray(convo) ? convo : []) {
    if (!m || m.role !== 'user') continue;
    const parts = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : Array.isArray(m.content) ? m.content : [];
    for (const c of parts) {
      if (!c) continue;
      if (c.type === 'text') { if (!/^\[Automatic grounding check/.test(String(c.text || ''))) out.push(String(c.text || '')); }
      else if (c.type === 'tool_result') out.push(typeof c.content === 'string' ? c.content : (Array.isArray(c.content) ? c.content : []).map((x) => (x && x.type === 'text' ? x.text : '')).join('\n'));
    }
  }
  return out.join('\n');
}

// Words that look like model codes but are not (K12 schools, B2B, tax forms).
const NOT_CODES = /^(K12|K-12|B2B|B2C|MP3|MP4|1099-[A-Z]+|W2|W9|I9)$/;

// The check runs on answers about vendor products: a conversation that opened a catalogue, or an
// answer that talks about catalogues or model codes or names a vendor that has one loaded.
export function aboutCatalogs(answer, sources, catalogVendors) {
  const a = String(answer == null ? '' : answer);
  if (/Catalog ID: /.test(String(sources == null ? '' : sources))) return true;
  if (/\bcatalog(ue)?s?\b|\bmodel (codes?|numbers?|#)/i.test(a)) return true;
  return (Array.isArray(catalogVendors) ? catalogVendors : []).some((v) => {
    const w = String(v || '').trim().split(/\s+/)[0].replace(/[^A-Za-z0-9-]/g, '');
    return w.length >= 2 && new RegExp('(^|[^A-Za-z0-9])' + w.replace(/-/g, '\\-') + '([^A-Za-z0-9]|$)').test(a);
  });
}

export function groundingGaps(answer, sources, catalogVendors) {
  const a = String(answer == null ? '' : answer);
  const src = String(sources == null ? '' : sources);
  if (!aboutCatalogs(a, src, catalogVendors)) return { codes: [], prices: [], any: false };
  const tokens = [...new Set((src.match(/[A-Za-z0-9#][A-Za-z0-9\-./#]*/g) || []).map(norm).filter(Boolean))].sort();
  const known = (code) => {
    const c = norm(code);
    if (!c) return true;
    let lo = 0, hi = tokens.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tokens[mid] < c) lo = mid + 1; else hi = mid; }
    return lo < tokens.length && tokens[lo].startsWith(c);
  };
  const codes = [];
  for (const line of a.split('\n')) for (const c of codesInLine(line)) if (!NOT_CODES.test(c) && !known(c) && !codes.includes(c)) codes.push(c);
  const prices = [];
  if (/Catalog ID: /.test(src)) {
    const have = new Set((src.match(NUM) || []).map(money).filter((v) => v != null));
    for (const line of a.split('\n')) {
      PRICE.lastIndex = 0; let m;
      while ((m = PRICE.exec(line))) {
        const before = line.slice(Math.max(0, m.index - 3), m.index);
        if (/=\s*$/.test(before) || /\b(sub)?totals?\b/i.test(line)) continue;
        const v = money(m[0]);
        if (v != null && !have.has(v) && !prices.includes(m[0].replace(/\s/g, ''))) prices.push(m[0].replace(/\s/g, ''));
      }
    }
  }
  return { codes, prices, any: codes.length + prices.length > 0 };
}

export function groundingNudge(g) {
  return '[Automatic grounding check, not from the user: your last answer contains ' +
    (g.codes.length ? 'model codes that appear in no tool result, record or catalogue page in this conversation (' + g.codes.join(', ') + ')' : '') +
    (g.codes.length && g.prices.length ? ' and ' : '') +
    (g.prices.length ? 'prices that are printed in no catalogue page or record you were given (' + g.prices.join(', ') + ')' : '') +
    '. Look them up with the vendor catalogue tools, or take them out. Then write the whole answer again using only what the records and the catalogue pages show, cite the vendor, catalogue and PDF page for each catalogue fact, and say plainly what the loaded catalogues do not show. Do not mention this check.]';
}

export function groundingNotice(g) {
  const items = [...g.codes, ...g.prices];
  return '\n\n**Not verified:** ' + items.join(', ') + (items.length === 1 ? ' is' : ' are') + ' not in any loaded vendor catalogue or Midwest record. Treat ' + (items.length === 1 ? 'it' : 'them') + ' as unconfirmed.';
}
