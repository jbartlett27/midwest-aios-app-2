// _tools.js -- Midwest AIOS data layer + tool definitions for the MCP server.
// Talks to the SAME Supabase project the live app uses (service-role key, server-only).
// Financial math mirrors the app's getJobFinancials EXACTLY:
//   revenue = sum(unit_price * qty_ordered)
//   rawCost = sum(unit_cost * qty_ordered)
//   totalCost = max(0, rawCost + StandaloneBill amounts - VendorCredit amounts)  [per job, from `sops`]
//   margin  = revenue>0 ? (revenue-totalCost)/revenue*100 : 0
//   commission = max(0, revenue-totalCost) * rep.commission_rate
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kogjthgceejpzxnekprr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _sb = null;
function sb() {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set on the server');
  if (!_sb) _sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

// ---------- helpers ----------
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const clip = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '...' : s; };
// Strip characters that would break a PostgREST `.or()` / `.ilike()` filter expression.
const safeLike = s => String(s == null ? '' : s).replace(/[,()%*\\]/g, ' ').trim();

function must(cond, msg) { if (!cond) throw new Error(msg); }

// Page through a query in 1000-row batches (PostgREST caps a single select at ~1000 rows).
// `build` must return a FRESH query builder each call so .range() can be applied per page.
async function pageAll(build) {
  const PAGE = 1000; let from = 0; const all = [];
  for (;;) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data || []; all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Fetch per-job cost adjustments (StandaloneBill adds to cost, VendorCredit reduces it).
async function costAdjustments() {
  const { data, error } = await sb().from('sops').select('cat,content').in('cat', ['StandaloneBill', 'VendorCredit']);
  if (error) throw new Error('cost adjustments: ' + error.message);
  const map = {}; // jobId -> {bills, credits}
  for (const row of (data || [])) {
    let d = null; try { d = JSON.parse(row.content || '{}'); } catch { continue; }
    if (!d || !d.jobId) continue;
    const amt = Number(d.amount); if (!isFinite(amt) || amt <= 0) continue;
    if (!map[d.jobId]) map[d.jobId] = { bills: 0, credits: 0 };
    if (row.cat === 'StandaloneBill') map[d.jobId].bills += amt; else map[d.jobId].credits += amt;
  }
  return map;
}

// Compute financials for a set of job ids. Returns { [jobId]: {...} }.
async function financialsFor(jobIds) {
  const out = {};
  for (const id of jobIds) out[id] = { revenue: 0, rawCost: 0, ordered: 0, received: 0, invoiced: 0, invoicedAmt: 0, itemCount: 0 };
  if (!jobIds.length) return out;
  // chunk the IN() list to stay well under URL limits
  for (let i = 0; i < jobIds.length; i += 150) {
    const chunk = jobIds.slice(i, i + 150);
    const data = await pageAll(() => sb().from('line_items')
      .select('job_id,unit_cost,unit_price,qty_ordered,qty_received,qty_invoiced').in('job_id', chunk));
    for (const it of (data || [])) {
      const g = out[it.job_id]; if (!g) continue;
      const qo = Number(it.qty_ordered) || 0, up = Number(it.unit_price) || 0, uc = Number(it.unit_cost) || 0;
      g.revenue += up * qo; g.rawCost += uc * qo; g.ordered += qo;
      g.received += Number(it.qty_received) || 0; g.invoiced += Number(it.qty_invoiced) || 0;
      g.invoicedAmt += up * (Number(it.qty_invoiced) || 0); g.itemCount++;
    }
  }
  const adj = await costAdjustments();
  for (const id of jobIds) {
    const g = out[id], a = adj[id] || { bills: 0, credits: 0 };
    g.cost = Math.max(0, g.rawCost + a.bills - a.credits);
    g.margin = g.revenue > 0 ? (g.revenue - g.cost) / g.revenue * 100 : 0;
    g.profit = g.revenue - g.cost;
    g.revenue = r2(g.revenue); g.rawCost = r2(g.rawCost); g.cost = r2(g.cost);
    g.margin = r1(g.margin); g.profit = r2(g.profit); g.invoicedAmt = r2(g.invoicedAmt);
    g.costAdj = { standaloneBills: r2(a.bills), vendorCredits: r2(a.credits) };
  }
  return out;
}

async function nameMaps(customerIds, repIds) {
  const cust = {}, rep = {};
  const cids = [...new Set(customerIds.filter(Boolean))];
  const rids = [...new Set(repIds.filter(Boolean))];
  if (cids.length) {
    const { data } = await sb().from('customers').select('id,name').in('id', cids);
    for (const c of (data || [])) cust[c.id] = c.name;
  }
  if (rids.length) {
    const { data } = await sb().from('reps').select('id,name').in('id', rids);
    for (const r of (data || [])) rep[r.id] = r.name;
  }
  return { cust, rep };
}

async function resolveJob(ref) {
  must(ref && String(ref).trim(), 'job id or name is required');
  ref = String(ref).trim();
  let { data } = await sb().from('jobs').select('*').eq('id', ref).limit(1);
  if (data && data.length) return data[0];
  const res = await sb().from('jobs').select('*').ilike('name', '%' + safeLike(ref) + '%').limit(5);
  data = res.data || [];
  must(data.length, 'No job found matching "' + ref + '"');
  if (data.length > 1) {
    const err = new Error('Multiple jobs match "' + ref + '": ' + data.map(j => j.id + ' (' + j.name + ')').join('; ') + '. Use the exact job id.');
    err._ambiguous = true; throw err;
  }
  return data[0];
}

async function resolveOne(table, ref, label) {
  must(ref && String(ref).trim(), label + ' id or name is required');
  ref = String(ref).trim();
  let { data } = await sb().from(table).select('*').eq('id', ref).limit(1);
  if (data && data.length) return data[0];
  const res = await sb().from(table).select('*').ilike('name', '%' + safeLike(ref) + '%').limit(5);
  data = res.data || [];
  must(data.length, 'No ' + label + ' found matching "' + ref + '"');
  if (data.length > 1) throw new Error('Multiple ' + label + 's match "' + ref + '": ' + data.map(x => x.name).join('; ') + '. Be more specific.');
  return data[0];
}

const rid = pfx => pfx + Math.random().toString(36).slice(2, 8);

// ---------- tool implementations ----------
const impl = {
  async business_summary() {
    const { data: jobs, error } = await sb().from('jobs').select('id,name,customer,sales_rep,phase,payment_status');
    if (error) throw new Error(error.message);
    const fin = await financialsFor(jobs.map(j => j.id));
    const { cust } = await nameMaps(jobs.map(j => j.customer), []);
    // vendor cost rollup (paginated -- full line_items scan exceeds 1000 rows)
    const vAgg = {};
    const liV = await pageAll(() => sb().from('line_items').select('vendor,unit_cost,qty_ordered'));
    for (const it of (liV || [])) { const k = it.vendor || '(none)'; vAgg[k] = (vAgg[k] || 0) + (Number(it.unit_cost) || 0) * (Number(it.qty_ordered) || 0); }
    const vIds = Object.keys(vAgg).filter(x => x !== '(none)');
    const vName = {};
    if (vIds.length) { const { data } = await sb().from('vendors').select('id,name').in('id', vIds); for (const v of (data || [])) vName[v.id] = v.name; }
    let totalRev = 0, totalCost = 0, ar = 0, openRev = 0, openCost = 0;
    const phase = {}, pay = {}, custRev = {};
    for (const j of jobs) {
      const f = fin[j.id]; totalRev += f.revenue; totalCost += f.cost;
      phase[j.phase || 'None'] = (phase[j.phase || 'None'] || 0) + 1;
      pay[j.payment_status || 'unpaid'] = (pay[j.payment_status || 'unpaid'] || 0) + 1;
      if ((j.payment_status || 'unpaid') !== 'paid') ar += f.invoicedAmt;
      if (!/complete/i.test(j.phase || '')) { openRev += f.revenue; openCost += f.cost; }
      const cn = cust[j.customer] || j.customer || 'Unknown'; custRev[cn] = (custRev[cn] || 0) + f.revenue;
    }
    const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ name: k, value: r2(v) }));
    return {
      jobs: jobs.length,
      revenue_all: r2(totalRev), cost_all: r2(totalCost),
      profit_all: r2(totalRev - totalCost), margin_all_pct: totalRev > 0 ? r1((totalRev - totalCost) / totalRev * 100) : 0,
      open_jobs_revenue: r2(openRev), open_jobs_profit: r2(openRev - openCost),
      accounts_receivable_outstanding: r2(ar),
      jobs_by_phase: phase, jobs_by_payment_status: pay,
      top_customers_by_revenue: top(custRev, 5),
      top_vendors_by_cost: Object.entries(vAgg).filter(([k]) => k !== '(none)').sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ vendor: vName[k] || k, cost: r2(v) })),
      counts: {
        customers: (await sb().from('customers').select('id', { count: 'exact', head: true })).count || 0,
        vendors: (await sb().from('vendors').select('id', { count: 'exact', head: true })).count || 0,
        line_items: (await sb().from('line_items').select('id', { count: 'exact', head: true })).count || 0
      }
    };
  },

  async list_jobs(a) {
    const limit = Math.min(Math.max(Number(a.limit) || 25, 1), 100);
    const offset = Math.max(Number(a.offset) || 0, 0);
    let q = sb().from('jobs').select('*');
    if (a.query) q = q.ilike('name', '%' + safeLike(a.query) + '%');
    if (a.phase) q = q.ilike('phase', safeLike(a.phase));
    if (a.payment_status) q = q.eq('payment_status', String(a.payment_status).toLowerCase());
    if (a.customer) { const cs = await sb().from('customers').select('id').ilike('name', '%' + safeLike(a.customer) + '%'); const ids = (cs.data || []).map(x => x.id); if (!ids.length) return { count: 0, jobs: [], note: 'No customer matched "' + a.customer + '"' }; q = q.in('customer', ids); }
    if (a.rep) { const rs = await sb().from('reps').select('id').ilike('name', '%' + safeLike(a.rep) + '%'); const ids = (rs.data || []).map(x => x.id); if (!ids.length) return { count: 0, jobs: [], note: 'No rep matched "' + a.rep + '"' }; q = q.in('sales_rep', ids); }
    q = q.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);
    const { data, error } = await q; if (error) throw new Error(error.message);
    const fin = await financialsFor((data || []).map(j => j.id));
    const { cust, rep } = await nameMaps((data || []).map(j => j.customer), (data || []).map(j => j.sales_rep));
    let jobs = (data || []).map(j => {
      const f = fin[j.id];
      return { id: j.id, name: j.name, customer: cust[j.customer] || null, rep: rep[j.sales_rep] || null, phase: j.phase, payment_status: j.payment_status, revenue: f.revenue, cost: f.cost, margin_pct: f.margin, qty_ordered: f.ordered, qty_received: f.received, item_count: f.itemCount, created_date: j.created_date, due_date: j.due_date };
    });
    if (a.has_open_delivery) jobs = jobs.filter(j => j.qty_ordered > j.qty_received);
    return { returned: jobs.length, offset, limit, jobs };
  },

  async get_job(a) {
    const j = await resolveJob(a.job);
    const { data: items } = await sb().from('line_items').select('*').eq('job_id', j.id).order('item_group', { ascending: true });
    const fin = (await financialsFor([j.id]))[j.id];
    const { cust, rep } = await nameMaps([j.customer], [j.sales_rep]);
    const vIds = [...new Set((items || []).map(i => i.vendor).filter(Boolean))];
    const vName = {}; if (vIds.length) { const { data } = await sb().from('vendors').select('id,name').in('id', vIds); for (const v of (data || [])) vName[v.id] = v.name; }
    const allRecv = (items || []).length > 0 && (items || []).every(i => (i.qty_received || 0) >= (i.qty_ordered || 0));
    const anyRecv = (items || []).some(i => (i.qty_received || 0) > 0);
    const allInv = (items || []).length > 0 && (items || []).every(i => (i.qty_invoiced || 0) >= (i.qty_ordered || 0));
    return {
      id: j.id, name: j.name, customer: cust[j.customer] || null, sales_rep: rep[j.sales_rep] || null,
      phase: j.phase, payment_status: j.payment_status, terms: j.terms, po_number: j.po_number,
      created_date: j.created_date, due_date: j.due_date, ship_to: j.ship_to, bill_to: j.bill_to, notes: j.notes,
      financials: { revenue: fin.revenue, cost: fin.cost, profit: fin.profit, margin_pct: fin.margin, raw_cost: fin.rawCost, cost_adjustments: fin.costAdj, invoiced_amount: fin.invoicedAmt },
      delivery_status: !((items || []).length) ? 'no_items' : allRecv ? 'complete' : anyRecv ? 'partial' : 'ordered',
      invoice_status: !((items || []).length) ? 'no_items' : allInv ? 'complete' : (items || []).some(i => (i.qty_invoiced || 0) > 0) ? 'partial' : 'not_started',
      item_count: (items || []).length,
      line_items: (items || []).map(i => ({ id: i.id, tag: i.tag, group: i.item_group, vendor: vName[i.vendor] || i.manufacturer || null, manufacturer: i.manufacturer, model_number: i.model_number, description: clip(i.description, 300), color: i.color, qty_ordered: i.qty_ordered, qty_received: i.qty_received, qty_invoiced: i.qty_invoiced, unit_cost: r2(i.unit_cost), unit_price: r2(i.unit_price), line_revenue: r2((i.unit_price || 0) * (i.qty_ordered || 0)) }))
    };
  },

  async search_line_items(a) {
    must(a.query, 'query is required');
    const limit = Math.min(Math.max(Number(a.limit) || 25, 1), 100);
    const q = safeLike(a.query);
    let sel = sb().from('line_items').select('*').or(`description.ilike.%${q}%,model_number.ilike.%${q}%,manufacturer.ilike.%${q}%,tag.ilike.%${q}%`);
    if (a.job) { const j = await resolveJob(a.job); sel = sel.eq('job_id', j.id); }
    sel = sel.limit(limit);
    const { data, error } = await sel; if (error) throw new Error(error.message);
    const jIds = [...new Set((data || []).map(i => i.job_id).filter(Boolean))];
    const jName = {}; if (jIds.length) { const { data: js } = await sb().from('jobs').select('id,name').in('id', jIds); for (const jj of (js || [])) jName[jj.id] = jj.name; }
    return { returned: (data || []).length, items: (data || []).map(i => ({ id: i.id, job_id: i.job_id, job: jName[i.job_id] || null, tag: i.tag, manufacturer: i.manufacturer, model_number: i.model_number, description: clip(i.description, 200), color: i.color, qty_ordered: i.qty_ordered, unit_cost: r2(i.unit_cost), unit_price: r2(i.unit_price) })) };
  },

  async list_customers(a) {
    const limit = Math.min(Math.max(Number(a.limit) || 25, 1), 100);
    let q = sb().from('customers').select('*');
    if (a.query) q = q.ilike('name', '%' + safeLike(a.query) + '%');
    if (a.type) q = q.eq('type', a.type);
    q = q.order('name', { ascending: true }).limit(limit);
    const { data, error } = await q; if (error) throw new Error(error.message);
    return { returned: (data || []).length, customers: (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, contact: c.contact, email: c.email, phone: c.phone, address: c.address })) };
  },

  async get_customer(a) {
    const c = await resolveOne('customers', a.customer, 'customer');
    const { data: jobs } = await sb().from('jobs').select('id,name,phase,payment_status,created_date').eq('customer', c.id);
    const fin = await financialsFor((jobs || []).map(j => j.id));
    let spend = 0, open = 0;
    const jl = (jobs || []).map(j => { const f = fin[j.id]; spend += f.revenue; if ((j.payment_status || 'unpaid') !== 'paid') open += f.invoicedAmt; return { id: j.id, name: j.name, phase: j.phase, payment_status: j.payment_status, revenue: f.revenue, created_date: j.created_date }; });
    jl.sort((x, y) => (y.created_date || '').localeCompare(x.created_date || ''));
    return { id: c.id, name: c.name, type: c.type, contact: c.contact, email: c.email, phone: c.phone, address: c.address, job_count: jl.length, lifetime_revenue: r2(spend), open_receivable: r2(open), jobs: jl.slice(0, 50) };
  },

  async list_vendors(a) {
    const limit = Math.min(Math.max(Number(a.limit) || 25, 1), 100);
    let q = sb().from('vendors').select('*');
    if (a.query) q = q.ilike('name', '%' + safeLike(a.query) + '%');
    if (a.category) q = q.ilike('category', '%' + safeLike(a.category) + '%');
    q = q.order('name', { ascending: true }).limit(limit);
    const { data, error } = await q; if (error) throw new Error(error.message);
    return { returned: (data || []).length, vendors: (data || []).map(v => ({ id: v.id, name: v.name, category: v.category, contact: v.contact, email: v.email, phone: v.phone, discount_rate_pct: r1((Number(v.discount_rate) || 0) * 100), discount_type: v.discount_type })) };
  },

  async get_vendor(a) {
    const v = await resolveOne('vendors', a.vendor, 'vendor');
    const items = await pageAll(() => sb().from('line_items').select('job_id,unit_cost,qty_ordered,description').eq('vendor', v.id));
    const jIds = [...new Set((items || []).map(i => i.job_id).filter(Boolean))];
    const jName = {}; if (jIds.length) { const { data: js } = await sb().from('jobs').select('id,name').in('id', jIds); for (const jj of (js || [])) jName[jj.id] = jj.name; }
    let spend = 0; const perJob = {};
    for (const it of (items || [])) { const c = (Number(it.unit_cost) || 0) * (Number(it.qty_ordered) || 0); spend += c; perJob[it.job_id] = (perJob[it.job_id] || 0) + c; }
    return { id: v.id, name: v.name, category: v.category, contact: v.contact, email: v.email, phone: v.phone, address: v.address, discount_rate_pct: r1((Number(v.discount_rate) || 0) * 100), discount_notes: v.discount_notes, total_cost_all_jobs: r2(spend), line_item_count: (items || []).length, jobs_supplied: Object.entries(perJob).sort((a2, b2) => b2[1] - a2[1]).slice(0, 25).map(([id, c]) => ({ job: jName[id] || id, cost: r2(c) })) };
  },

  async list_reps() {
    const { data: reps } = await sb().from('reps').select('*');
    const { data: jobs } = await sb().from('jobs').select('id,sales_rep');
    const fin = await financialsFor((jobs || []).map(j => j.id));
    const byRep = {}; for (const j of (jobs || [])) { const k = j.sales_rep || '(none)'; (byRep[k] = byRep[k] || []).push(j.id); }
    return {
      reps: (reps || []).map(rp => {
        const ids = byRep[rp.id] || []; let rev = 0, cost = 0; for (const id of ids) { rev += fin[id].revenue; cost += fin[id].cost; }
        const profit = Math.max(0, rev - cost); const rate = Number(rp.commission_rate) || 0;
        return { id: rp.id, name: rp.name, email: rp.email, territory: rp.territory, tier: rp.tier, commission_rate_pct: r1(rate * 100), job_count: ids.length, total_revenue: r2(rev), total_profit: r2(rev - cost), commission_earned: r2(profit * rate) };
      })
    };
  },

  async delivery_report(a) {
    const limit = Math.min(Math.max(Number(a.limit) || 50, 1), 200);
    const data = await pageAll(() => sb().from('line_items').select('id,job_id,description,tag,qty_ordered,qty_received,vendor,delivery_date').gt('qty_ordered', 0));
    const open = (data || []).filter(i => (Number(i.qty_received) || 0) < (Number(i.qty_ordered) || 0));
    const jIds = [...new Set(open.map(i => i.job_id).filter(Boolean))];
    const jName = {}; if (jIds.length) { const { data: js } = await sb().from('jobs').select('id,name,phase').in('id', jIds); for (const jj of (js || [])) jName[jj.id] = { name: jj.name, phase: jj.phase }; }
    const byJob = {};
    for (const i of open) { const k = i.job_id; if (!byJob[k]) byJob[k] = { job_id: k, job: (jName[k] || {}).name || null, phase: (jName[k] || {}).phase || null, outstanding_units: 0, items: [] }; const out = (Number(i.qty_ordered) || 0) - (Number(i.qty_received) || 0); byJob[k].outstanding_units += out; if (byJob[k].items.length < 20) byJob[k].items.push({ line_item_id: i.id, description: clip(i.description, 120), tag: i.tag, ordered: i.qty_ordered, received: i.qty_received, outstanding: out }); }
    const jobs = Object.values(byJob).sort((x, y) => y.outstanding_units - x.outstanding_units).slice(0, limit);
    return { jobs_with_open_deliveries: jobs.length, total_open_line_items: open.length, jobs };
  },

  async accounts_receivable(a) {
    const limit = Math.min(Math.max(Number(a.limit) || 50, 1), 200);
    const { data: jobs } = await sb().from('jobs').select('id,name,customer,payment_status,terms,created_date').neq('payment_status', 'paid');
    const fin = await financialsFor((jobs || []).map(j => j.id));
    const { cust } = await nameMaps((jobs || []).map(j => j.customer), []);
    const today = new Date();
    const rows = [];
    for (const j of (jobs || [])) {
      const inv = fin[j.id].invoicedAmt; if (inv <= 0) continue;
      const t = j.terms || 'Net 30'; const days = /15/.test(t) ? 15 : /receipt/i.test(t) ? 0 : 30;
      let overdue = false, daysOver = 0;
      if (j.created_date) { const due = new Date(j.created_date); if (!isNaN(due)) { due.setDate(due.getDate() + days); if (today > due) { overdue = true; daysOver = Math.floor((today - due) / 86400000); } } }
      rows.push({ job: j.name, job_id: j.id, customer: cust[j.customer] || null, invoiced_outstanding: inv, payment_status: j.payment_status, terms: t, overdue, days_overdue: daysOver });
    }
    rows.sort((x, y) => y.invoiced_outstanding - x.invoiced_outstanding);
    return { total_outstanding: r2(rows.reduce((s, r) => s + r.invoiced_outstanding, 0)), overdue_count: rows.filter(r => r.overdue).length, accounts: rows.slice(0, limit) };
  },

  // ---------- writes ----------
  async update_job_phase(a) {
    const j = await resolveJob(a.job);
    const phase = String(a.phase || '').trim(); must(phase, 'phase is required');
    const { data, error } = await sb().from('jobs').update({ phase, updated_at: new Date().toISOString() }).eq('id', j.id).select('id,name,phase');
    if (error) throw new Error(error.message);
    return { ok: true, job_id: j.id, name: j.name, previous_phase: j.phase, new_phase: (data && data[0] && data[0].phase) || phase };
  },

  async update_job_payment_status(a) {
    const j = await resolveJob(a.job);
    const status = String(a.status || '').toLowerCase().trim();
    must(['unpaid', 'partial', 'paid'].includes(status), 'status must be one of: unpaid, partial, paid');
    const { error } = await sb().from('jobs').update({ payment_status: status, updated_at: new Date().toISOString() }).eq('id', j.id);
    if (error) throw new Error(error.message);
    return { ok: true, job_id: j.id, name: j.name, previous_status: j.payment_status, new_status: status };
  },

  async set_line_item_received(a) {
    must(a.line_item_id, 'line_item_id is required (get it from get_job or delivery_report)');
    const qty = Number(a.qty_received); must(isFinite(qty) && qty >= 0, 'qty_received must be a number >= 0');
    const { data: cur } = await sb().from('line_items').select('id,job_id,description,qty_ordered,qty_received').eq('id', a.line_item_id).limit(1);
    must(cur && cur.length, 'No line item with id "' + a.line_item_id + '"');
    const it = cur[0];
    const { error } = await sb().from('line_items').update({ qty_received: Math.round(qty), updated_at: new Date().toISOString() }).eq('id', it.id);
    if (error) throw new Error(error.message);
    return { ok: true, line_item_id: it.id, job_id: it.job_id, description: clip(it.description, 120), previous_received: it.qty_received, new_received: Math.round(qty), qty_ordered: it.qty_ordered, warning: qty > (it.qty_ordered || 0) ? 'qty_received exceeds qty_ordered' : undefined };
  },

  async create_customer(a) {
    must(a.name && String(a.name).trim(), 'name is required');
    const row = { id: rid('CUST-'), name: String(a.name).trim(), contact: a.contact || '', email: a.email || '', phone: a.phone || '', type: a.type || 'K-12 District', address: a.address || '' };
    const { error } = await sb().from('customers').insert(row); if (error) throw new Error(error.message);
    return { ok: true, created: 'customer', ...row };
  },

  async create_vendor(a) {
    must(a.name && String(a.name).trim(), 'name is required');
    const row = { id: rid('V-'), name: String(a.name).trim(), contact: a.contact || '', email: a.email || '', phone: a.phone || '', category: a.category || 'Furniture', address: a.address || '', discount_rate: Number(a.discount_rate_pct) > 0 ? Number(a.discount_rate_pct) / 100 : 0, discount_type: 'percentage', discount_notes: a.discount_notes || '' };
    const { error } = await sb().from('vendors').insert(row); if (error) throw new Error(error.message);
    return { ok: true, created: 'vendor', ...row, discount_rate_pct: r1(row.discount_rate * 100) };
  }
};

// ---------- tool metadata (schemas + annotations) ----------
const S = (props, required = []) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = d => ({ type: 'string', description: d });
const num = d => ({ type: 'number', description: d });
const bool = d => ({ type: 'boolean', description: d });
const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS = [
  { name: 'business_summary', description: 'Company-wide KPIs for Midwest Educational Furnishings: total jobs, revenue, cost, profit, margin, accounts-receivable outstanding, job counts by phase and payment status, top customers by revenue, and top vendors by cost. Start here for an overview.', inputSchema: S({}), annotations: READ, run: impl.business_summary },
  { name: 'list_jobs', description: 'List/search jobs with computed financials (revenue, cost, margin, quantities). Filter by name (query), phase, payment_status, customer name, rep name, or has_open_delivery. Paginated.', inputSchema: S({ query: str('Search job name (partial match)'), phase: str('Filter by phase, e.g. Quoting, In Progress, Invoiced, Complete'), payment_status: str('unpaid | partial | paid'), customer: str('Filter by customer name (partial match)'), rep: str('Filter by sales rep name (partial match)'), has_open_delivery: bool('Only jobs with undelivered units'), limit: num('Max results (default 25, max 100)'), offset: num('Pagination offset') }), annotations: READ, run: impl.list_jobs },
  { name: 'get_job', description: 'Full detail for one job by id (e.g. JOB-2026-168) or name: fields, financials with cost adjustments, delivery/invoice status, and every line item with per-line pricing.', inputSchema: S({ job: str('Job id or name') }, ['job']), annotations: READ, run: impl.get_job },
  { name: 'search_line_items', description: 'Search line items across all jobs by description, model number, manufacturer, or tag. Optionally scope to one job. Useful for "which jobs ordered X".', inputSchema: S({ query: str('Text to search in description/model/manufacturer/tag'), job: str('Optional job id or name to scope the search'), limit: num('Max results (default 25, max 100)') }, ['query']), annotations: READ, run: impl.search_line_items },
  { name: 'list_customers', description: 'List/search customers (school districts, universities, etc.). Filter by name (query) or type.', inputSchema: S({ query: str('Search customer name'), type: str('Exact type filter, e.g. "K-12 District"'), limit: num('Max results (default 25, max 100)') }), annotations: READ, run: impl.list_customers },
  { name: 'get_customer', description: 'Customer 360: profile, lifetime revenue, open receivable, and their jobs.', inputSchema: S({ customer: str('Customer id or name') }, ['customer']), annotations: READ, run: impl.get_customer },
  { name: 'list_vendors', description: 'List/search vendors (manufacturers/suppliers) with their discount rate. Filter by name (query) or category.', inputSchema: S({ query: str('Search vendor name'), category: str('Filter by category'), limit: num('Max results (default 25, max 100)') }), annotations: READ, run: impl.list_vendors },
  { name: 'get_vendor', description: 'Vendor 360: profile, discount, total cost across all jobs, and the jobs they supply.', inputSchema: S({ vendor: str('Vendor id or name') }, ['vendor']), annotations: READ, run: impl.get_vendor },
  { name: 'list_reps', description: 'Sales reps with commission rate/tier and their totals: job count, revenue, profit, and commission earned (commission is paid on profit, not revenue).', inputSchema: S({}), annotations: READ, run: impl.list_reps },
  { name: 'delivery_report', description: 'Jobs with outstanding deliveries (units ordered but not yet received), sorted by outstanding units, with the specific open line items.', inputSchema: S({ limit: num('Max jobs (default 50, max 200)') }), annotations: READ, run: impl.delivery_report },
  { name: 'accounts_receivable', description: 'Open accounts receivable: unpaid/partial jobs with an invoiced balance, flagged overdue against their payment terms.', inputSchema: S({ limit: num('Max accounts (default 50, max 200)') }), annotations: READ, run: impl.accounts_receivable },
  { name: 'update_job_phase', description: 'Set a job\u2019s phase (e.g. Quoting, Approved, Ordered, In Progress, Invoiced, Complete). Writes to the live system.', inputSchema: S({ job: str('Job id or name'), phase: str('New phase value') }, ['job', 'phase']), annotations: WRITE, run: impl.update_job_phase },
  { name: 'update_job_payment_status', description: 'Set a job\u2019s payment status to unpaid, partial, or paid. Writes to the live system.', inputSchema: S({ job: str('Job id or name'), status: str('unpaid | partial | paid') }, ['job', 'status']), annotations: WRITE, run: impl.update_job_payment_status },
  { name: 'set_line_item_received', description: 'Record received quantity on a specific line item (delivery progress). Get the line_item_id from get_job or delivery_report. Writes to the live system.', inputSchema: S({ line_item_id: str('The line item id (LI-...)'), qty_received: num('Total units now received (absolute value, not a delta)') }, ['line_item_id', 'qty_received']), annotations: WRITE, run: impl.set_line_item_received },
  { name: 'create_customer', description: 'Add a new customer to the directory. Writes to the live system.', inputSchema: S({ name: str('Organization name'), contact: str('Contact person'), email: str('Email'), phone: str('Phone'), type: str('Type, default "K-12 District"'), address: str('Address') }, ['name']), annotations: WRITE, run: impl.create_customer },
  { name: 'create_vendor', description: 'Add a new vendor/manufacturer to the directory. Writes to the live system.', inputSchema: S({ name: str('Vendor name'), contact: str('Contact person'), email: str('Email'), phone: str('Phone'), category: str('Category, default "Furniture"'), discount_rate_pct: num('Vendor discount off list, as a percent (e.g. 55 for 55%)'), discount_notes: str('Notes') }, ['name']), annotations: WRITE, run: impl.create_vendor }
];

export async function callTool(name, args) {
  const t = TOOLS.find(x => x.name === name);
  if (!t) throw new Error('Unknown tool: ' + name);
  return await t.run(args || {});
}
