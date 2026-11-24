// The public Furniture Planner's server (midwestaios.com/plan). Anyone can reach it, so it can do very little:
//
//   POST ?op=chat     the planning conversation. The model gets exactly three tools, all read-only over the approved
//                     vendor catalogues (search_products, get_product) plus update_plan, which the server checks
//                     against the catalogues before a line reaches the customer. No prices, costs, discounts, jobs,
//                     customers, notes or staff tools exist here, so none can be asked for or leaked.
//   POST ?op=request  "Request a priced quote": saves the plan and contact as a Prospect card (the Prospects page's
//                     own duplicate rules), safe to repeat (the request id is kept on the card).
//   GET  ?op=config   whether a booking link is set, and the reps a customer may ask for by name (names and areas only).
//   POST ?op=booking  Calendly's "invitee created" webhook: a CONFIRMED booking. Signed with PLAN_BOOKING_SIGNING_KEY;
//                     matched to the prospect and assigned to the rep whose calendar took the meeting.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { catalogRecords, loadCatalog, searchCatalog, getProduct } from '../src/vendorCatalog.js';
import { publicCatalogs, publicProduct, cleanPlanItem } from '../src/planCatalog.js';
import { findDuplicateProspect, normProspectEmail } from '../src/prospectKeys.js';

const SB = 'https://kogjthgceejpzxnekprr.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';
const H = { apikey: ANON, Authorization: 'Bearer ' + ANON };
const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
export const SETTINGS_ID = 'PLANNER_SETTINGS';

// ---- small database door (the same public key the Midwest app uses) ----
export function makeDb(fetcher = fetch) {
  const rest = async (path, init = {}) => {
    const r = await fetcher(SB + '/rest/v1/' + path, { ...init, headers: { ...H, 'Content-Type': 'application/json', ...(init.headers || {}) }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('db ' + r.status);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  return {
    catalogRows: () => rest('sops?cat=eq.VendorCatalog&select=id,cat,content'),
    // Every Prospect card, page by page: the database answers at most 1000 rows at a time and Midwest has more.
    prospects: async () => { const all = []; for (let off = 0; off < 100000; off += 1000) { const page = await rest('sops?cat=eq.Prospect&select=id,content&order=id.asc&limit=1000&offset=' + off); all.push(...(page || [])); if (!page || page.length < 1000) break; } return all; },
    settings: async () => { const r = await rest('sops?id=eq.' + SETTINGS_ID + '&select=content'); try { return JSON.parse((r && r[0] && r[0].content) || '{}'); } catch (e) { return {}; } },
    saveProspect: (id, data) => rest('sops?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id, title: data.name || data.company || 'Prospect', cat: 'Prospect', icon: 'target', content: JSON.stringify(data), custom: true }]) }),
    spendToday: async () => Number(await rest('rpc/planner_spend_get', { method: 'POST', body: '{}' })) || 0,
    spendAdd: async (cents) => Number(await rest('rpc/planner_spend_add', { method: 'POST', body: JSON.stringify({ p_cents: Math.ceil(cents) }) })) || 0,
    uploadPdf: async (bytes) => {
      const path = 'planner/' + new Date().toISOString().slice(0, 10) + '/' + randomBytes(16).toString('hex') + '.pdf';
      const r = await fetcher(SB + '/storage/v1/object/vendor-invoices/' + path, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: bytes, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('upload ' + r.status);
      return SB + '/storage/v1/object/public/vendor-invoices/' + path;
    },
  };
}

// ---- the catalogues, as a customer may see them ----
export async function loadPublicCatalogs(db, fetcher = fetch) {
  const recs = publicCatalogs(catalogRecords(await db.catalogRows()));
  const out = await Promise.all(recs.map(async (rec) => { try { return { rec, cat: await loadCatalog(rec, { fetchImpl: fetcher }) }; } catch (e) { return null; } }));
  return out.filter(Boolean);
}
export function searchAll(cats, query, limit = 20) {
  const hits = [];
  for (const { rec, cat } of cats) {
    const r = searchCatalog(cat, query, { limit: 10 });
    for (const row of r.rows || []) hits.push({ rec, row, score: String(row.code).toLowerCase() === String(query).toLowerCase() ? 3 : 1 });
  }
  const seen = new Set(); const out = [];
  for (const h of hits.sort((a, b) => b.score - a.score)) {
    const p = publicProduct(h.rec, h.row); const k = p.vendor + '|' + p.code;
    if (seen.has(k)) continue; seen.add(k); out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
export function vendorList(cats) {
  const by = new Map();
  for (const { rec } of cats) { const v = str(rec.vendorName, 80) || 'Vendor'; if (!by.has(v)) by.set(v, []); by.get(v).push({ catalog: str(rec.title, 100), groups: (Array.isArray(rec.groups) ? rec.groups : []).map((g) => str(g && (g.name || g.title || g), 40)).filter(Boolean).slice(0, 8) }); }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([vendor, catalogs]) => ({ vendor, catalogs }));
}
export function findProduct(cats, catalogId, code) {
  const hit = cats.find((c) => c.rec.id === catalogId);
  if (!hit) return null;
  const r = getProduct(hit.cat, code);
  const row = r.exact ? r.rows[0] : null;
  return row ? publicProduct(hit.rec, row) : null;
}
// Every plan line is checked against the catalogues: a code that is not in the named catalogue never reaches the plan.
// Plans run from one chair to a whole district: up to 250 lines, quantities up to 100,000.
export const PLAN_LINES = 250;
export function validatePlan(cats, plan) {
  const items = []; const unknown = [];
  for (const it of (plain(plan) && Array.isArray(plan.items) ? plan.items : []).slice(0, PLAN_LINES)) {
    const p = findProduct(cats, str(it && it.catalog_id || it && it.catalogId, 200), str(it && it.code, 80));
    if (p) items.push(cleanPlanItem(it, p)); else unknown.push(str(it && (it.code || it.name), 80));
  }
  const pr = plain(plan && plan.project) ? plan.project : {};
  const project = {};
  for (const k of ['room', 'organization', 'headcount', 'dimensions', 'age_group', 'constraints', 'timeline', 'location']) if (pr[k] != null) project[k] = str(pr[k], 300);
  const assumptions = (Array.isArray(plan && plan.assumptions) ? plan.assumptions : []).map((a) => str(a, 300)).filter(Boolean).slice(0, 12);
  return { project, items, assumptions, unknown: unknown.filter(Boolean) };
}

// ---- the conversation ----
export const SYSTEM = `You are the Midwest Educational Furnishings Furniture Planner, a friendly planning assistant on Midwest's public website.
You help schools, colleges, offices and organizations anywhere in the country plan a space and leave with a planning quote.

ABOUT MIDWEST (public facts you may share)
- Midwest Educational Furnishings (MW Furnishings, mwfurnishings.com) is a founder-operated furniture dealer that furnishes learning and work spaces: classrooms, libraries and media centers, cafeterias, science labs, makerspaces, early childhood rooms, athletics, offices, lobbies and collaboration spaces.
- Midwest works with a wide network of manufacturer partners (use list_vendors for the brands whose catalogues are loaded here) and helps customers choose products, plan quantities and layouts, and coordinate ordering, delivery and installation through its team.
- Pricing, contracts and purchasing details are handled by a Midwest specialist after a request; you do not quote prices.
- For anything else about Midwest (locations, staff, policies, references, cooperative contracts) say a Midwest specialist will answer and suggest "Request a priced quote" to be contacted. Never guess.

HOW TO WORK
- Any size, from one chair to a whole district or a multi-building, multimillion dollar project. Scale the plan to what the customer describes.
- For a large project, plan by area: one area per room type or space (for example "Grade 3 classrooms (12 rooms)", "Cafeteria", "Library"). Build a standard package for one room, multiply it by the room count, set area on every line, and keep each area's lines together. Ask how many rooms of each type there are and whether the work is phased, and save phases and room counts in the project details.
- ITERATION: whenever the customer asks for any change at all (add, remove, swap, more or fewer, a different color, size or model, a new room or area, or new project details), call update_plan in that SAME turn with the full updated list, then confirm in one sentence what changed. Never say you changed the plan without calling update_plan.
- Build the plan for the customer. As soon as you know the kind of space and roughly how many people, search the catalogues, pick the best-fitting real products (one clear pick per need) with sensible quantities from the headcount (for a classroom: one desk and one chair per student plus a teacher station), and call update_plan in the same turn. Never tell the customer to add products themselves. The product cards shown under your reply are only alternatives they can swap in.
- update_plan replaces the whole list: always send every line that should stay, including the lines already on the customer's screen (see the plan below), plus the new ones. Remove a line only when the customer asks.
- Save every project fact the customer gives (room, organization, headcount, dimensions, age_group, timeline, location, constraints) in update_plan's project. Save only what the customer actually said; leave a fact out until they tell you (never a placeholder like "not yet named" or "TBD").
- In your first reply, ask in one short friendly message for the missing essentials among: school or organization, age group or grade, room dimensions, timeline, and city and state. At most 3 questions at a time. Never wait for the answers to build the plan: build with stated assumptions, then ask.
- After saving, say briefly what you added (for example "I added 28 desks, 28 chairs and a teacher desk to your plan.") and invite changes.
- Use list_vendors when someone asks which brands Midwest carries. Use search_products to find real products in Midwest's vendor catalogues and get_product to confirm a model code. Use catalog_id and code exactly as the tools returned them, and give each line a quantity and a short note.

NEVER
- Never invent a model code, product, size, color, availability, lead time, warranty or ship date. If the tools do not show it, say "not confirmed in the catalogue" and that a Midwest specialist will confirm it.
- Never use em dashes or en dashes in replies. Use commas, colons or periods.
- Never give, estimate or discuss prices, costs, discounts, budgets in dollars, margins or financing. This is a planning quote, not a priced offer. For pricing say the customer can press "Request a priced quote" and Midwest will follow up.
- Never promise delivery, installation dates or anything on Midwest's behalf. Never discuss other customers, Midwest's internal records or staff systems; you have no access to them.
Keep answers short, warm and practical. Plain text with short lists; no tables.`;

const TOOLS = [
  { name: 'list_vendors', description: 'The vendor brands whose catalogues Midwest has loaded, with each catalogue title and its product groups.', input_schema: { type: 'object', properties: {} } },
  { name: 'search_products', description: 'Search Midwest\'s approved vendor catalogues by words or a model code (e.g. "student desk adjustable", "stacking chair 18 inch", "mobile whiteboard"). Returns real products with vendor, code, name, series, section, page and specs. No prices.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_product', description: 'Confirm one product by catalog_id and model code exactly as search_products returned them.', input_schema: { type: 'object', properties: { catalog_id: { type: 'string' }, code: { type: 'string' } }, required: ['catalog_id', 'code'] } },
  { name: 'update_plan', description: 'Save the current plan shown to the customer. Lines not found in the catalogues are dropped and reported back.', input_schema: { type: 'object', properties: {
    project: { type: 'object', properties: { room: { type: 'string' }, organization: { type: 'string' }, headcount: { type: 'string' }, dimensions: { type: 'string' }, age_group: { type: 'string' }, constraints: { type: 'string' }, timeline: { type: 'string' }, location: { type: 'string' } } },
    items: { type: 'array', items: { type: 'object', properties: { catalog_id: { type: 'string' }, code: { type: 'string' }, qty: { type: 'number' }, note: { type: 'string' }, area: { type: 'string', description: 'The room type or space this line belongs to, e.g. "Grade 3 classrooms (12 rooms)". Set it on every line of a multi-area project.' } }, required: ['catalog_id', 'code', 'qty'] } },
    assumptions: { type: 'array', items: { type: 'string' } } }, required: ['items'] } },
];

async function claude(env, body, fetcher) {
  const keys = [env.ANTHROPIC_API_KEY, env.ANTHROPIC_API_KEY_2, env.ANTHROPIC_API_KEY_3, env.ANTHROPIC_API_KEY_4].filter(Boolean);
  let last = null;
  for (const key of keys) {
    const r = await fetcher('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(55000) });
    if (r.ok) return r.json();
    last = r.status; if (![401, 403, 429, 529].includes(r.status)) break;
  }
  throw new Error('model ' + last);
}

// What one model call cost, in cents, from the tokens it reports (rates per million tokens; conservative).
export const RATES = { input: 3, output: 15 };
export const costCents = (usage) => (((Number(usage && usage.input_tokens) || 0) + (Number(usage && usage.cache_creation_input_tokens) || 0)) * RATES.input + (Number(usage && usage.output_tokens) || 0) * RATES.output) / 10000;
export const DEFAULT_DAILY_LIMIT = 10;   // dollars, until an admin sets one
export function dailyLimitCents(settings) { const d = Number(settings && settings.dailyLimit); return Math.round((Number.isFinite(d) && d >= 0 ? Math.min(d, 1000) : DEFAULT_DAILY_LIMIT) * 100); }

// Midwest writes without em or en dashes: ranges keep a hyphen, any other dash becomes a comma.
export const plainDashes = (t) => String(t || '').replace(/(\d)\s*\u2013\s*(\d)/g, '$1-$2').replace(/\s*[\u2014\u2013]\s*/g, ', ');

// How many lines the assistant put in the plan that were not on the customer's screen before (by catalogue and code).
export function addedLines(before, after) {
  if (!after || !Array.isArray(after.items)) return 0;
  const had = new Set(((before && before.items) || []).map((i) => i.catalogId + '::' + i.code));
  return after.items.filter((i) => !had.has(i.catalogId + '::' + i.code)).length;
}

// What the model sees of a product: enough to choose and cite it, small enough for big projects.
const compact = (p) => ({ catalog_id: p.catalogId, code: p.code, name: p.name, vendor: p.vendor, series: p.series, section: p.section, page: p.page, specs: p.specs });
// A line the model re-sends without its note or area keeps the ones already on the customer's screen.
function keepNotes(next, current) {
  const was = new Map(current.items.map((i) => [i.catalogId + '|' + i.code, i]));
  for (const it of next.items) { const o = was.get(it.catalogId + '|' + it.code); if (!o) continue; if (!it.note && o.note) it.note = o.note; if (!it.area && o.area) it.area = o.area; }
}

export async function runChat({ env, db, fetcher = fetch, messages, plan, model }) {
  const cats = await loadPublicCatalogs(db, fetcher);
  const convo = (Array.isArray(messages) ? messages : []).slice(-24).map((m) => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: str(m && m.text, 4000) || '...' }));
  while (convo.length && convo[0].role !== 'user') convo.shift();
  if (!convo.length) throw Object.assign(new Error('empty'), { status: 400 });
  const current = validatePlan(cats, plan || {});
  const sys = SYSTEM + '\n\nThe plan on the customer\'s screen now (they may have edited it): ' + JSON.stringify({ project: current.project, items: current.items.map((i) => ({ catalog_id: i.catalogId, code: i.code, name: i.name, qty: i.qty, ...(i.area ? { area: i.area } : {}), ...(i.note ? { note: i.note } : {}) })), assumptions: current.assumptions });
  let nextPlan = null; const shown = new Map(); let unknown = [];
  const msgs = convo.slice();
  for (let round = 0; round < 10; round++) {
    const out = await claude(env, { model: model || 'claude-sonnet-5', max_tokens: 8000, system: sys, tools: TOOLS, messages: msgs }, fetcher);
    if (db.spendAdd) await db.spendAdd(costCents(out.usage)).catch(() => 0);
    const uses = (out.content || []).filter((c) => c.type === 'tool_use');
    if (!uses.length || out.stop_reason !== 'tool_use') {
      const reply = plainDashes((out.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim());
      return { reply, products: [...shown.values()].slice(0, 12), plan: nextPlan, unknown, added: addedLines(current, nextPlan) };
    }
    msgs.push({ role: 'assistant', content: out.content });
    const results = [];
    for (const u of uses) {
      let result;
      if (u.name === 'list_vendors') result = vendorList(cats);
      else if (u.name === 'search_products') { const ps = searchAll(cats, str(u.input && u.input.query, 200)); ps.forEach((p) => shown.set(p.id, p)); result = ps.length ? ps.map(compact) : 'No product in the approved catalogues matched. Say so plainly and ask a clarifying question or try other words.'; }
      else if (u.name === 'get_product') { const p = findProduct(cats, str(u.input && u.input.catalog_id, 200), str(u.input && u.input.code, 80)); if (p) shown.set(p.id, p); result = p || 'Not found in that catalogue. Do not use this code.'; }
      else if (u.name === 'update_plan') { const v = validatePlan(cats, u.input || {}); keepNotes(v, current); nextPlan = v; unknown = v.unknown; result = { saved: v.items.length, dropped_not_in_catalogue: v.unknown }; }
      else result = 'Unknown tool.';
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(result).slice(0, 12000) });
    }
    msgs.push({ role: 'user', content: results });
  }
  return { reply: 'I have your plan so far. Tell me what to adjust, or press "Download PDF".', products: [...shown.values()].slice(0, 12), plan: nextPlan, unknown, added: addedLines(current, nextPlan) };
}

// ---- "Request a priced quote" ----
// The reps a customer may ask for by name (Users & Permissions >> Furniture Planner >> "Customers can choose").
// Only a name and an area leave the server: never an email, a calendar or anything else about the rep.
export function plannerReps(settings) {
  const b = plain(settings && settings.booking) ? settings.booking : {};
  const reps = plain(b.reps) ? b.reps : {};
  return Object.keys(reps).filter((id) => plain(reps[id]) && reps[id].offer === true && str(reps[id].name, 80))
    .map((id) => ({ id: str(id, 20), name: str(reps[id].name, 80), area: str(reps[id].area, 80) }));
}
// Who a new request goes to: the rep the customer asked for when Midwest offers that rep, otherwise the default rep.
export function chooseRep(settings, wanted) {
  const w = str(wanted, 20);
  if (w && plannerReps(settings).some((r) => r.id === w)) return { repId: w, chosen: true };
  const b = plain(settings && settings.booking) ? settings.booking : {};
  return { repId: str(b.defaultRep, 20), chosen: false };
}
const repName = (settings, repId) => { const b = plain(settings && settings.booking) ? settings.booking : {}; const r = plain(b.reps) && plain(b.reps[repId]) ? b.reps[repId] : null; return r ? str(r.name, 80) : ''; };
// The booking link offered after a request: the link of the rep the request went to (the default rep when none is
// given). A rep without a link offers none, so a customer who asked for Jim is never sent to someone else's calendar.
export function bookingFor(settings, prospectId, contact, forRep) {
  const b = plain(settings && settings.booking) ? settings.booking : {};
  const repId = str(forRep, 20) || str(b.defaultRep, 20); const rep = plain(b.reps) && plain(b.reps[repId]) ? b.reps[repId] : null;
  const url = rep && /^https:\/\/[^\s]+$/.test(String(rep.url || '')) ? String(rep.url) : '';
  if (!url) return null;
  const u = new URL(url);
  u.searchParams.set('utm_source', 'midwest-plan'); u.searchParams.set('utm_content', prospectId);
  if (contact.name) u.searchParams.set('name', contact.name); if (contact.email) u.searchParams.set('email', contact.email);
  return { url: u.href, repId };
}

export async function saveRequest({ db, body, settings = {}, now = () => new Date() }) {
  const c = plain(body.contact) ? body.contact : {};
  const contact = { name: str(c.name, 120), email: normProspectEmail(str(c.email, 200)), phone: str(c.phone, 40), company: str(c.company, 160), title: str(c.title, 120), city: str(c.city, 80), state: str(c.state, 40), type: str(c.type, 60) };
  if (!contact.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) || !contact.company) throw Object.assign(new Error('Please add your name, a valid email and your school or company.'), { status: 400 });
  const requestId = str(body.requestId, 64);
  if (!/^[a-f0-9-]{16,64}$/i.test(requestId)) throw Object.assign(new Error('bad request id'), { status: 400 });
  const plan = plain(body.plan) ? body.plan : {};
  const items = (Array.isArray(plan.items) ? plan.items : []).slice(0, PLAN_LINES).map((i) => ({ area: str(i.area, 80), vendor: str(i.vendor, 80), code: str(i.code, 60), name: str(i.name, 120), qty: Math.max(1, Math.min(100000, Math.round(Number(i.qty) || 1))), note: str(i.note, 200), catalog: str(i.catalog, 100), page: Number(i.page) || null }));
  const project = {}; for (const [k, v] of Object.entries(plain(plan.project) ? plan.project : {}).slice(0, 12)) project[str(k, 30)] = str(v, 300);
  const { repId, chosen } = chooseRep(settings, body.preferredRep);
  const bestTime = str(body.bestTime, 120);
  const camp = plain(body.campaign) ? body.campaign : {};
  const campaign = {}; for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'landing', 'referrer']) if (camp[k]) campaign[k] = str(camp[k], 200);
  const rows = await db.prospects();
  const all = (rows || []).map((r) => { try { return { id: r.id, ...JSON.parse(r.content) }; } catch (e) { return null; } }).filter(Boolean);
  const already = all.find((p) => Array.isArray(p.planRequests) && p.planRequests.some((q) => q.id === requestId));
  if (already) return { prospectId: already.id, repeated: true, contact, repId: already.assignedRep || repId, repName: repName(settings, already.assignedRep || repId) };
  let pdfUrl = '';
  if (typeof body.pdf === 'string' && body.pdf.length < 6000000) {
    const bytes = Buffer.from(body.pdf, 'base64');
    if (bytes.slice(0, 5).toString() === '%PDF-') pdfUrl = await db.uploadPdf(bytes);
  }
  const at = now().toISOString();
  const request = { id: requestId, at, project, items, assumptions: (Array.isArray(plan.assumptions) ? plan.assumptions : []).map((a) => str(a, 300)).slice(0, 12), pdfUrl, campaign, ...(chosen ? { preferredRep: repId } : {}), ...(bestTime ? { bestTime } : {}) };
  const summary = 'Furniture Planner request ' + at.slice(0, 10) + ': ' + (project.room || 'space') + (project.headcount ? ', ' + project.headcount + ' people' : '') + '. ' + items.map((i) => i.qty + ' x ' + i.vendor + ' ' + i.code + (i.name ? ' (' + i.name + ')' : '')).join('; ') + (pdfUrl ? '. Plan PDF: ' + pdfUrl : '') + (chosen ? '. Asked to talk with ' + (repName(settings, repId) || repId) : '') + (bestTime ? '. Best time to reach them: ' + bestTime : '');
  const dup = findDuplicateProspect(all, contact);
  if (dup) {
    const next = { ...dup }; delete next.id;
    for (const k of Object.keys(contact)) if (!next[k] && contact[k]) next[k] = contact[k];
    next.planRequests = [...(Array.isArray(dup.planRequests) ? dup.planRequests : []), request].slice(-20);
    next.notes = (next.notes ? next.notes + '\n\n' : '') + summary;
    if (!next.source) next.source = 'Furniture Planner';
    if (!next.status || next.status === 'Lost') next.status = 'New';
    // An existing card keeps its rep; an unassigned one goes to the rep this request chose (or the default rep).
    if (!next.assignedRep && repId) next.assignedRep = repId;
    await db.saveProspect(dup.id, next);
    return { prospectId: dup.id, updated: true, contact, repId: next.assignedRep || '', repName: repName(settings, next.assignedRep) };
  }
  const id = 'PR-PLAN-' + randomBytes(5).toString('hex').toUpperCase();
  await db.saveProspect(id, { ...contact, status: 'New', assignedRep: repId, addedAt: at, source: 'Furniture Planner', campaign, notes: summary, planRequests: [request] });
  return { prospectId: id, created: true, contact, repId, repName: repName(settings, repId) };
}

// ---- a confirmed booking (Calendly invitee.created) ----
export function verifyCalendly(raw, header, key, nowMs = Date.now()) {
  if (!key || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((p) => p.split('=').map((s) => s.trim())));
  const t = Number(parts.t); if (!Number.isFinite(t) || Math.abs(nowMs / 1000 - t) > 600) return false;
  const want = createHmac('sha256', key).update(parts.t + '.' + raw).digest('hex');
  const a = Buffer.from(want), b = Buffer.from(String(parts.v1 || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function applyBooking({ db, event }) {
  if (!plain(event) || event.event !== 'invitee.created' || !plain(event.payload)) return { ignored: true };
  const p = event.payload;
  const email = normProspectEmail(p.email);
  const tracked = str(p.tracking && p.tracking.utm_content, 64);
  const hostEmails = (Array.isArray(p.scheduled_event && p.scheduled_event.event_memberships) ? p.scheduled_event.event_memberships : []).map((m) => normProspectEmail(m.user_email)).filter(Boolean);
  const settings = await db.settings();
  const reps = plain(settings.booking && settings.booking.reps) ? settings.booking.reps : {};
  const repId = Object.keys(reps).find((id) => (Array.isArray(reps[id].hostEmails) ? reps[id].hostEmails : []).map(normProspectEmail).some((e) => hostEmails.includes(e))) || '';
  const rows = await db.prospects();
  const all = (rows || []).map((r) => { try { return { id: r.id, ...JSON.parse(r.content) }; } catch (e) { return null; } }).filter(Boolean);
  const hit = (tracked && all.find((x) => x.id === tracked)) || (email && all.find((x) => normProspectEmail(x.email) === email));
  if (!hit) return { unmatched: true };
  const next = { ...hit }; delete next.id;
  const start = str(p.scheduled_event && p.scheduled_event.start_time, 40);
  const uri = str(p.uri, 300);
  if ((Array.isArray(next.bookings) ? next.bookings : []).some((b) => b.uri === uri)) return { prospectId: hit.id, repeated: true };
  next.bookings = [...(Array.isArray(next.bookings) ? next.bookings : []), { uri, start, repId, hostEmails, at: new Date().toISOString() }].slice(-10);
  if (repId) next.assignedRep = repId;
  next.status = 'Meeting Set';
  next.notes = (next.notes ? next.notes + '\n\n' : '') + 'Meeting booked' + (start ? ' for ' + start : '') + (repId ? ' with ' + repId : '') + ' (confirmed by the calendar).';
  await db.saveProspect(hit.id, next);
  return { prospectId: hit.id, repId };
}

// ---- abuse limits for a public door ----
const hits = new Map();
function limited(ip, max, windowMs) {
  const now = Date.now(); const k = ip + '|' + max; const h = (hits.get(k) || []).filter((t) => now - t < windowMs);
  h.push(now); hits.set(k, h); if (hits.size > 5000) hits.clear();
  return h.length > max;
}
const readRaw = (req) => new Promise((ok, no) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > 200000) no(new Error('too big')); }); req.on('end', () => ok(s)); req.on('error', no); });

export function planHandler(env, deps = {}) {
  const fetcher = deps.fetch || fetch; const db = deps.db || makeDb(fetcher);
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const op = String((req.query && req.query.op) || '');
    const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'unknown';
    try {
      if (op === 'booking') {
        if (req.method !== 'POST') return res.status(405).json({ ok: false });
        const raw = await readRaw(req);   // the exact bytes Calendly signed; req.body is never touched here
        if (!verifyCalendly(raw, req.headers['calendly-webhook-signature'], env.PLAN_BOOKING_SIGNING_KEY)) return res.status(401).json({ ok: false });
        return res.status(200).json({ ok: true, ...(await applyBooking({ db, event: JSON.parse(raw) })) });
      }
      if (op === 'config') {
        const [settings, rows] = await Promise.all([db.settings().catch(() => ({})), db.catalogRows().catch(() => [])]);
        const vendors = [...new Set(publicCatalogs(catalogRecords(rows)).map((r) => str(r.vendorName, 60)).filter(Boolean))].sort();
        return res.status(200).json({ ok: true, booking: !!bookingFor(settings, 'x', {}), reps: plannerReps(settings), vendors, theme: settings && settings.theme === 'dark' ? 'dark' : 'light' });
      }
      if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST.' });
      const body = plain(req.body) ? req.body : (() => { try { return JSON.parse(req.body); } catch (e) { return {}; } })();
      if (op === 'chat') {
        if (limited(ip, 40, 10 * 60 * 1000)) return res.status(429).json({ ok: false, error: 'You are going quickly. Please wait a minute and try again.' });
        // The admin's daily limit (Users & Permissions >> Furniture Planner): once today's spend reaches it, the planner rests until tomorrow.
        const [settings, spent] = await Promise.all([db.settings().catch(() => ({})), db.spendToday()]);
        if (spent >= dailyLimitCents(settings)) return res.status(429).json({ ok: false, code: 'daily_limit', error: 'The planner has reached today\'s limit. Your plan is saved on this device: download it, or press "Request a priced quote" and Midwest will help you directly.' });
        const out = await runChat({ env, db, fetcher, messages: body.messages, plan: body.plan });
        return res.status(200).json({ ok: true, ...out });
      }
      if (op === 'request') {
        if (limited(ip, 8, 10 * 60 * 1000)) return res.status(429).json({ ok: false, error: 'Please wait a minute and try again.' });
        const settings = await db.settings().catch(() => ({}));
        const saved = await saveRequest({ db, body, settings });
        const booking = bookingFor(settings, saved.prospectId, saved.contact, saved.repId);
        return res.status(200).json({ ok: true, saved: true, repeated: !!saved.repeated, booking: booking ? booking.url : '', rep: saved.repName || '' });
      }
      return res.status(400).json({ ok: false, error: 'Unknown request.' });
    } catch (e) {
      return res.status(e && e.status === 400 ? 400 : 503).json({ ok: false, error: e && e.status === 400 ? e.message : 'The planner could not answer just now. Please try again.' });
    }
  };
}
export default function handler(req, res) { return planHandler(process.env)(req, res); }
