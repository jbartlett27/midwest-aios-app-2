import {build} from 'esbuild';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// The Brain's grounding check (src/brainGrounding.js), bundled as shipped with the real catalogue code reader.
// Made-up catalogue text only. Every mutant below must make this suite fail.
const mutantIdx = process.argv.includes('--mutant') ? Number(process.argv[process.argv.indexOf('--mutant') + 1]) : -1;
const MUTANTS = [
  ['a code is known only if a source has it', 'return lo < tokens.length && tokens[lo].startsWith(c);', 'return true;'],
  ['the check\'s own note to the Brain is not a source', "if (!/^\\[Automatic grounding check/.test(String(c.text || ''))) out.push(String(c.text || ''));", "out.push(String(c.text || ''));"],
  ['the Brain\'s own earlier answers are not a source', "if (!m || m.role !== 'user') continue;", 'if (!m) continue;'],
  ['tool results are a source', "else if (c.type === 'tool_result') out.push(", "else if (false) out.push("],
  ['a price printed nowhere is caught', 'if (v != null && !have.has(v) &&', 'if (v != null && false &&'],
  ['worked-out totals are the answer\'s own math', "if (/=\\s*$/.test(before) || /\\b(sub)?totals?\\b/i.test(line)) continue;", ''],
  ['K12 and B2B are not model codes', '!NOT_CODES.test(c) && ', ''],
  ['an answer naming a catalogue vendor is checked', "return w.length >= 2 && new RegExp(", "return false && new RegExp("],
  ['answers that are not about catalogues are left alone', "if (!aboutCatalogs(a, src, catalogVendors)) return { codes: [], prices: [], any: false };", ''],
];
const file = '../../src/brainGrounding.js';
const code = fs.readFileSync(file, 'utf8');
if (mutantIdx >= 0) assert.ok(code.includes(MUTANTS[mutantIdx][1]), 'mutation anchor missing: ' + MUTANTS[mutantIdx][0]);
await build({entryPoints: [file], bundle: true, format: 'cjs', platform: 'node', outfile: 'brain-grounding-bundle.cjs', logLevel: 'silent', plugins: [{name: 'mutant', setup(b) {
  if (mutantIdx >= 0) b.onLoad({filter: /brainGrounding\.js$/}, () => ({contents: code.replace(MUTANTS[mutantIdx][1], MUTANTS[mutantIdx][2]), loader: 'js', resolveDir: '../../src'}));
}}]});
const G = createRequire(import.meta.url)('./brain-grounding-bundle.cjs');
const V = ['WB Mfg', 'Joy Carpets', 'Columbia Manufacturing'];

const toolPage = 'Page 42: Student desks\n| EONP401-EJA | 24 x 30 | 25 lb |\n#2066 Alphabet rug\nCH-OM-CL-G-12 chair\nList $6995.00\n\nCatalog ID: VCAT-1\nSource: WB Mfg >> 2026 Full Line Catalog (edition 2026). Page numbers are PDF pages.';
const convo = [
  {role: 'user', content: 'What desks does WB make? Is the QX77 one of them?'},
  {role: 'assistant', content: [{type: 'text', text: 'WB makes the ZZ9000 desk.'}, {type: 'tool_use', id: 't1', name: 'search_vendor_catalog', input: {query: 'desk'}}]},
  {role: 'user', content: [{type: 'tool_result', tool_use_id: 't1', content: toolPage}]},
];
const src = G.groundingSources('SYSTEM: job JOB-2026-001 line item model AB1000', convo);
const gaps = (a) => G.groundingGaps(a, src, V);

// grounded answers pass
assert.equal(gaps('WB Mfg >> 2026 Full Line Catalog, page 42: EONP401-EJA, 24 x 30, 25 lb.').any, false, 'a code printed on the catalogue page is grounded');
assert.equal(gaps('The EONP401 family is on page 42.').any, false, 'the start of a printed code (its family) is grounded');
assert.equal(gaps('Joy rug #2066 and the Columbia CH-OM-CL-G-12 chair.').any, false, 'number-sign items and hyphenated series are read as printed');
assert.equal(gaps('You asked about QX77: that is not in the loaded WB Mfg catalogue.').any, false, 'a code the user typed may be repeated back');
assert.equal(gaps('WB AB1000 is on job JOB-2026-001.').any, false, 'a code in the business context is grounded');
assert.equal(gaps('The insert on page 42 lists $6995.00.').any, false, 'a price printed on the page is grounded');
assert.equal(gaps('Four of them: 4 x $6995.00 = $27980.00').any, false, 'a worked-out total is the answer\'s own math');
assert.equal(gaps('WB Mfg page 42, line total $27,980.00').any, false, 'a total line is the answer\'s own math');
assert.equal(gaps('WB sells to K12 schools and B2B dealers.').any, false, 'K12 and B2B are words, not model codes');

// made-up codes and prices are caught
let g = gaps('WB also makes the ELS7601 locker bench and the CH-OM-CL-G-99 chair.');
assert.deepEqual(g.codes, ['ELS7601', 'CH-OM-CL-G-99'], 'codes printed nowhere are caught'); assert.equal(g.any, true);
assert.deepEqual(gaps('WB makes the ZZ9000 desk.').codes, ['ZZ9000'], 'the Brain\'s own earlier answer is not a source');
assert.deepEqual(gaps('Joy #9999 is a great rug.').codes, ['9999'], 'a made-up number-sign item is caught');
assert.deepEqual(gaps('No prices are printed, but it runs about $450.').prices, ['$450'], 'a price printed nowhere is caught after a catalogue lookup');

// scope: only answers about vendor products
assert.equal(G.groundingGaps('We filed the 1099-NEC and paid ABC123 last year.', 'JOB stuff', V).any, false, 'a bookkeeping answer is not a catalogue answer');
assert.deepEqual(G.groundingGaps('WB makes the QX500 desk.', 'JOB stuff', V).codes, ['QX500'], 'an answer naming a vendor with a catalogue is checked, even with no lookup');
assert.deepEqual(G.groundingGaps('The catalogue lists model QX500.', 'JOB stuff', V).codes, ['QX500'], 'an answer about a catalogue is checked');
assert.equal(G.aboutCatalogs('What a joyful day', '', V), false, 'a vendor word inside another word does not count');
assert.equal(G.groundingGaps('The ROI was $9,000 this quarter.', 'JOB stuff', V).any, false, 'prices are only checked after a catalogue lookup');

// the second pass: the note to the Brain does not ground the codes it names
const again = [...convo, {role: 'assistant', content: [{type: 'text', text: 'WB makes ELS7601.'}]}, {role: 'user', content: [{type: 'text', text: G.groundingNudge({codes: ['ELS7601'], prices: ['$450']})}]}];
assert.deepEqual(G.groundingGaps('WB makes ELS7601 at $450.', G.groundingSources('', again), V), {codes: ['ELS7601'], prices: ['$450'], any: true}, 'the check\'s note never counts as a source');
const nudge = G.groundingNudge({codes: ['ELS7601'], prices: ['$450']});
assert.match(nudge, /ELS7601/); assert.match(nudge, /\$450/); assert.match(nudge, /cite the vendor, catalogue and PDF page/); assert.doesNotMatch(nudge, /\u2014/);
assert.equal(G.groundingNotice({codes: ['ELS7601'], prices: []}), '\n\n**Not verified:** ELS7601 is not in any loaded vendor catalogue or Midwest record. Treat it as unconfirmed.');
assert.match(G.groundingNotice({codes: ['A1B2'], prices: ['$5']}), /A1B2, \$5 are not in any loaded vendor catalogue or Midwest record\. Treat them as unconfirmed\./);
fs.rmSync('brain-grounding-bundle.cjs', {force: true});
if (mutantIdx < 0) console.log('PASS Brain grounding check (codes and catalogue prices must come from a source; own answers and its own notes never count)');
