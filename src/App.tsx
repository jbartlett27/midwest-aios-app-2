// ═══════════════════════════════════════════════════════════════
// SUPABASE CLIENT — Pure fetch(), zero npm packages
// ═══════════════════════════════════════════════════════════════

const URL = 'https://kogjthgceejpzxnekprr.supabase.co/rest/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';

const hdrs = {
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function fetchAll(table) {
  try {
    const r = await fetch(URL + '/' + table + '?select=*&order=id', { headers: hdrs });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.error('Fetch ' + table + ':', e); return null; }
}

async function upsertRow(table, row) {
  try {
    const r = await fetch(URL + '/' + table + '?on_conflict=id', {
      method: 'POST',
      headers: { ...hdrs, 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(row),
    });
    return { ok: r.ok };
  } catch (e) { console.error('Upsert ' + table + ':', e); return { ok: false }; }
}

async function upsertMany(table, rows) {
  if (!rows.length) return { ok: true };
  try {
    const r = await fetch(URL + '/' + table + '?on_conflict=id', {
      method: 'POST',
      headers: { ...hdrs, 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    });
    return { ok: r.ok };
  } catch (e) { console.error('UpsertMany ' + table + ':', e); return { ok: false }; }
}

async function deleteRow(table, id) {
  try {
    const r = await fetch(URL + '/' + table + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: hdrs,
    });
    return { ok: r.ok };
  } catch (e) { console.error('Delete ' + table + ':', e); return { ok: false }; }
}

async function deleteAll(table) {
  try {
    const r = await fetch(URL + '/' + table + '?id=not.is.null', {
      method: 'DELETE', headers: hdrs,
    });
    return { ok: r.ok };
  } catch (e) { console.error('DeleteAll ' + table + ':', e); return { ok: false }; }
}

const jobToDb = (j) => ({
  id: j.id, name: j.name, customer: j.customer, sales_rep: j.salesRep,
  phase: j.phase, created_date: j.createdDate, start_date: j.startDate || '',
  end_date: j.endDate || '', due_date: j.dueDate,
  notes: j.notes, payment_status: j.paymentStatus,
  doc_statuses: typeof j.docStatuses === 'string' ? j.docStatuses : JSON.stringify(j.docStatuses || {}),
  activities: typeof j.activities === 'string' ? j.activities : JSON.stringify(j.activities || []),
});
const jobFromDb = (r) => ({
  id: r.id, name: r.name, customer: r.customer, salesRep: r.sales_rep,
  phase: r.phase, createdDate: r.created_date, startDate: r.start_date || '',
  endDate: r.end_date || '', dueDate: r.due_date,
  notes: r.notes, paymentStatus: r.payment_status,
  docStatuses: (() => { try { return JSON.parse(r.doc_statuses || '{}'); } catch { return {}; } })(),
  activities: (() => { try { return JSON.parse(r.activities || '[]'); } catch { return []; } })(),
});
const liToDb = (li) => ({
  id: li.id, job_id: li.jobId, description: li.description, vendor: li.vendor,
  unit_cost: li.unitCost, unit_price: li.unitPrice, qty_ordered: li.qtyOrdered,
  qty_received: li.qtyReceived, qty_invoiced: li.qtyInvoiced,
  po_date: li.poDate || '', delivery_date: li.deliveryDate || '', invoice_date: li.invoiceDate || '',
});
const liFromDb = (r) => ({
  id: r.id, jobId: r.job_id, description: r.description, vendor: r.vendor,
  unitCost: Number(r.unit_cost), unitPrice: Number(r.unit_price),
  qtyOrdered: r.qty_ordered, qtyReceived: r.qty_received, qtyInvoiced: r.qty_invoiced,
  poDate: r.po_date || '', deliveryDate: r.delivery_date || '', invoiceDate: r.invoice_date || '',
});
const vendorToDb = (v) => ({
  id: v.id, name: v.name, contact: v.contact || '', email: v.email || '',
  phone: v.phone || '', category: v.category || '', address: v.address || '',
  discount_rate: v.discountRate || 0, discount_type: v.discountType || 'percentage',
  discount_notes: v.discountNotes || '',
});
const vendorFromDb = (r) => ({
  id: r.id, name: r.name, contact: r.contact || '', email: r.email || '',
  phone: r.phone || '', category: r.category || '', address: r.address || '',
  discountRate: Number(r.discount_rate) || 0, discountType: r.discount_type || 'percentage',
  discountNotes: r.discount_notes || '',
});
const custToDb = (c) => ({
  id: c.id, name: c.name, contact: c.contact || '', email: c.email || '',
  phone: c.phone || '', type: c.type || 'K-12 District', address: c.address || '',
});
const custFromDb = (r) => ({
  id: r.id, name: r.name, contact: r.contact || '', email: r.email || '',
  phone: r.phone || '', type: r.type || '', address: r.address || '',
});
const repToDb = (r) => ({
  id: r.id, name: r.name, email: r.email || '', territory: r.territory || '',
  commission_rate: r.commissionRate, tier: r.tier || 'Associate',
});
const repFromDb = (r) => ({
  id: r.id, name: r.name, email: r.email || '', territory: r.territory || '',
  commissionRate: Number(r.commission_rate), tier: r.tier || '',
});

export const db = {
  async loadAll() {
    const [jobsRaw, liRaw, vRaw, cRaw, rRaw] = await Promise.all([
      fetchAll('jobs'), fetchAll('line_items'), fetchAll('vendors'), fetchAll('customers'), fetchAll('reps'),
    ]);
    return {
      jobs: jobsRaw ? jobsRaw.map(jobFromDb) : null,
      lineItems: liRaw ? liRaw.map(liFromDb) : null,
      vendors: vRaw ? vRaw.map(vendorFromDb) : null,
      customers: cRaw ? cRaw.map(custFromDb) : null,
      reps: rRaw ? rRaw.map(repFromDb) : null,
    };
  },
  async saveJob(job) { return upsertRow('jobs', jobToDb(job)); },
  async saveLineItem(li) { return upsertRow('line_items', liToDb(li)); },
  async saveVendor(v) { return upsertRow('vendors', vendorToDb(v)); },
  async saveCustomer(c) { return upsertRow('customers', custToDb(c)); },
  async saveRep(r) { return upsertRow('reps', repToDb(r)); },
  async deleteJob(id) { return deleteRow('jobs', id); },
  async deleteLineItem(id) { return deleteRow('line_items', id); },
  async deleteVendor(id) { return deleteRow('vendors', id); },
  async deleteCustomer(id) { return deleteRow('customers', id); },
  async deleteRep(id) { return deleteRow('reps', id); },
  async seed(initJobs, initLI, initV, initC, initR) {
    // DANGEROUS: Deletes all data then re-inserts. Only for full database reset.
    await deleteAll('line_items');
    await deleteAll('jobs');
    await Promise.all([deleteAll('vendors'), deleteAll('customers'), deleteAll('reps')]);
    await Promise.all([
      upsertMany('vendors', initV.map(vendorToDb)),
      upsertMany('customers', initC.map(custToDb)),
      upsertMany('reps', initR.map(repToDb)),
    ]);
    await upsertMany('jobs', initJobs.map(jobToDb));
    await upsertMany('line_items', initLI.map(liToDb));
  },
  async seedSafe(initJobs, initLI, initV, initC, initR) {
    // SAFE: Only upserts — never deletes existing data. Used for first-time setup.
    await Promise.all([
      upsertMany('vendors', initV.map(vendorToDb)),
      upsertMany('customers', initC.map(custToDb)),
      upsertMany('reps', initR.map(repToDb)),
    ]);
    await upsertMany('jobs', initJobs.map(jobToDb));
    await upsertMany('line_items', initLI.map(liToDb));
  },
  async batchSaveVendors(vs) { return upsertMany('vendors', vs.map(vendorToDb)); },
  async batchSaveCustomers(cs) { return upsertMany('customers', cs.map(custToDb)); },
  async batchSaveReps(rs) { return upsertMany('reps', rs.map(repToDb)); },
  async batchSaveJobs(js) { return upsertMany('jobs', js.map(jobToDb)); },
  async batchSaveLineItems(lis) { return upsertMany('line_items', lis.map(liToDb)); },
};
