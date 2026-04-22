// Supabase Client -- Pure fetch(), zero npm packages

const URL = 'https://kogjthgceejpzxnekprr.supabase.co/rest/v1';
const SUPABASE_PROJECT = 'kogjthgceejpzxnekprr';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo';
const REALTIME_URL = 'wss://' + SUPABASE_PROJECT + '.supabase.co/realtime/v1/websocket?apikey=' + KEY + '&vsn=1.0.0';

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

// ---- MAPPERS: App state <-> Supabase row ----

const jobToDb = (j) => ({
  id: j.id, name: j.name, customer: j.customer, sales_rep: j.salesRep,
  phase: j.phase, created_date: j.createdDate, start_date: j.startDate || '',
  end_date: j.endDate || '', due_date: j.dueDate,
  notes: j.notes, payment_status: j.paymentStatus,
  terms: j.terms || 'Net 30',
  po_number: j.poNumber || '',
  ship_to: j.shipTo || '',
  ship_via: j.shipVia || '',
  bill_to: j.billTo || '',
  order_notes: j.orderNotes || '',
  doc_statuses: typeof j.docStatuses === 'string' ? j.docStatuses : JSON.stringify(j.docStatuses || {}),
  activities: typeof j.activities === 'string' ? j.activities : JSON.stringify(j.activities || []),
  audit_trail: typeof j.auditTrail === 'string' ? j.auditTrail : JSON.stringify(j.auditTrail || []),
});
const jobFromDb = (r) => ({
  id: r.id, name: r.name, customer: r.customer, salesRep: r.sales_rep,
  phase: r.phase, createdDate: r.created_date, startDate: r.start_date || '',
  endDate: r.end_date || '', dueDate: r.due_date,
  notes: r.notes, paymentStatus: r.payment_status,
  terms: r.terms || 'Net 30',
  poNumber: r.po_number || '',
  shipTo: r.ship_to || '',
  shipVia: r.ship_via || '',
  billTo: r.bill_to || '',
  orderNotes: r.order_notes || '',
  docStatuses: (() => { try { return JSON.parse(r.doc_statuses || '{}'); } catch { return {}; } })(),
  activities: (() => { try { return JSON.parse(r.activities || '[]'); } catch { return []; } })(),
  auditTrail: (() => { try { return JSON.parse(r.audit_trail || '[]'); } catch { return []; } })(),
});

const liToDb = (li) => ({
  id: li.id, job_id: li.jobId, description: li.description, vendor: li.vendor,
  tag: li.tag || '',
  item_group: li.group || '',
  manufacturer: li.manufacturer || '',
  model_number: li.modelNumber || '',
  color: li.color || '',
  list_price: li.listPrice || 0,
  unit_cost: li.unitCost, unit_price: li.unitPrice,
  shipping_per_unit: li.shippingPerUnit || 0,
  install_per_unit: li.installPerUnit || 0,
  qty_ordered: li.qtyOrdered,
  qty_received: li.qtyReceived, qty_invoiced: li.qtyInvoiced,
  po_date: li.poDate || '', delivery_date: li.deliveryDate || '', invoice_date: li.invoiceDate || '',
});
const liFromDb = (r) => ({
  id: r.id, jobId: r.job_id, description: r.description, vendor: r.vendor,
  tag: r.tag || '',
  group: r.item_group || '',
  manufacturer: r.manufacturer || '',
  modelNumber: r.model_number || '',
  color: r.color || '',
  listPrice: Number(r.list_price) || 0,
  unitCost: Number(r.unit_cost), unitPrice: Number(r.unit_price),
  shippingPerUnit: Number(r.shipping_per_unit) || 0,
  installPerUnit: Number(r.install_per_unit) || 0,
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
const repToDb = (r) => {
  // Pack roles array into the tier column when present so that multi-role
  // selections persist without requiring a Supabase schema migration. If no
  // roles array, fall back to the legacy tier string.
  let tierField = r.tier || 'Associate';
  if (Array.isArray(r.roles) && r.roles.length > 0) {
    tierField = JSON.stringify(r.roles);
  }
  return {
    id: r.id, name: r.name, email: r.email || '', territory: r.territory || '',
    commission_rate: r.commissionRate, tier: tierField,
  };
};
const repFromDb = (r) => {
  // Unpack: if tier looks like a JSON array (starts with "["), extract the
  // roles array and derive a human-readable display tier from the first role.
  // Otherwise treat tier as a legacy string and let getRoles() derive roles
  // from it (Push 1 fallback logic).
  let roles = null;
  let displayTier = r.tier || '';
  if (typeof r.tier === 'string' && r.tier.startsWith('[')) {
    try {
      const parsed = JSON.parse(r.tier);
      if (Array.isArray(parsed) && parsed.length > 0) {
        roles = parsed;
        displayTier = parsed[0];
      }
    } catch {}
  }
  return {
    id: r.id, name: r.name, email: r.email || '', territory: r.territory || '',
    commissionRate: Number(r.commission_rate), tier: displayTier,
    ...(roles ? { roles } : {}),
  };
};


const sopToDb = (s) => ({
  id: s.id, title: s.title, cat: s.cat || 'Custom', icon: s.icon || 'file',
  content: s.content || '', custom: s.custom ? true : false,
});
const sopFromDb = (r) => ({
  id: r.id, title: r.title, cat: r.cat || 'Custom', icon: r.icon || 'file',
  content: r.content || '', custom: r.custom !== false,
});

// ---- USERS ----
async function fetchUsers() {
  try {
    const r = await fetch(URL + '/users?select=*&order=id', { headers: hdrs });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.error('Fetch users:', e); return null; }
}

async function loginUser(username, password) {
  try {
    const r = await fetch(URL + '/users?username=eq.' + encodeURIComponent(username) + '&password=eq.' + encodeURIComponent(password) + '&select=*', { headers: hdrs });
    if (!r.ok) return null;
    const data = await r.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) { console.error('Login:', e); return null; }
}

// ---- REALTIME ----
class RealtimeConnection {
  constructor() { this.ws = null; this.ref = 0; this.heartbeat = null; this.listeners = {}; this.connected = false; }

  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(REALTIME_URL);
      this.ws.onopen = () => {
        this.connected = true;
        // Start heartbeat every 30s
        this.heartbeat = setInterval(() => { this._send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.ref) }); }, 30000);
        // Subscribe to all tables we care about
        ['jobs', 'line_items', 'vendors', 'customers', 'reps', 'sops'].forEach(table => {
          this._send({
            topic: 'realtime:public:' + table,
            event: 'phx_join',
            payload: { config: { postgres_changes: [{ event: '*', schema: 'public', table }] } },
            ref: String(++this.ref)
          });
        });
        // Subscribe to presence channel
        this._send({
          topic: 'realtime:presence:midwest-aios',
          event: 'phx_join',
          payload: {},
          ref: String(++this.ref)
        });
      };
      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.event === 'postgres_changes') {
            const payload = msg.payload?.data || msg.payload;
            const table = payload?.table || msg.topic?.replace('realtime:public:', '');
            const type = payload?.type || payload?.eventType; // INSERT, UPDATE, DELETE
            const record = payload?.record || payload?.new;
            const oldRecord = payload?.old_record || payload?.old;
            if (table && this.listeners[table]) {
              this.listeners[table].forEach(fn => fn({ type, record, oldRecord, table }));
            }
          }
          // Handle presence sync
          if (msg.event === 'presence_state' || msg.event === 'presence_diff') {
            if (this.listeners['_presence']) {
              this.listeners['_presence'].forEach(fn => fn(msg));
            }
          }
        } catch {}
      };
      this.ws.onclose = () => {
        this.connected = false;
        if (this.heartbeat) clearInterval(this.heartbeat);
        this.ws = null;
        // Auto-reconnect after 3s
        setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = () => { if (this.ws) this.ws.close(); };
    } catch {}
  }

  _send(msg) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg)); }

  on(table, fn) {
    if (!this.listeners[table]) this.listeners[table] = [];
    this.listeners[table].push(fn);
    return () => { this.listeners[table] = this.listeners[table].filter(f => f !== fn); };
  }

  trackPresence(user) {
    if (!this.ws || this.ws.readyState !== 1) return;
    this._send({
      topic: 'realtime:presence:midwest-aios',
      event: 'presence',
      payload: { type: 'presence', event: 'track', payload: { user_id: user.id, name: user.name, role: user.role, avatar: user.avatar || '', online_at: new Date().toISOString() } },
      ref: String(++this.ref)
    });
  }

  disconnect() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.ws) this.ws.close();
    this.ws = null; this.connected = false;
  }
}

const realtime = new RealtimeConnection();

export const db = {
  async loadAll() {
    const [jobsRaw, liRaw, vRaw, cRaw, rRaw, sRaw] = await Promise.all([
      fetchAll('jobs'), fetchAll('line_items'), fetchAll('vendors'), fetchAll('customers'), fetchAll('reps'), fetchAll('sops'),
    ]);
    return {
      jobs: jobsRaw ? jobsRaw.map(jobFromDb) : null,
      lineItems: liRaw ? liRaw.map(liFromDb) : null,
      vendors: vRaw ? vRaw.map(vendorFromDb) : null,
      customers: cRaw ? cRaw.map(custFromDb) : null,
      reps: rRaw ? rRaw.map(repFromDb) : null,
      sops: sRaw ? sRaw.map(sopFromDb) : null,
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
  async saveSop(s) { return upsertRow('sops', sopToDb(s)); },
  async deleteSop(id) { return deleteRow('sops', id); },
  async seed(initJobs, initLI, initV, initC, initR) {
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
  async fetchUsers() { return fetchUsers(); },
  async loginUser(u, p) { return loginUser(u, p); },
  async saveUser(user) { return upsertRow('users', user); },
  async deleteUser(id) { return deleteRow('users', id); },
  async seedSafe(initJobs, initLI, initV, initC, initR) {
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
  // Realtime
  realtime,
  connectRealtime() { realtime.connect(); },
  onTableChange(table, fn) { return realtime.on(table, fn); },
  onPresence(fn) { return realtime.on('_presence', fn); },
  trackPresence(user) { realtime.trackPresence(user); },
  disconnectRealtime() { realtime.disconnect(); },
  // Storage -- vendor invoice uploads
  async uploadFile(bucket, path, file) {
    try {
      const storageUrl = 'https://' + SUPABASE_PROJECT + '.supabase.co/storage/v1/object/' + bucket + '/' + path;
      const r = await fetch(storageUrl, {
        method: 'POST',
        headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
        body: file
      });
      if (!r.ok) { const err = await r.text(); console.error('Upload error:', err); return null; }
      const publicUrl = 'https://' + SUPABASE_PROJECT + '.supabase.co/storage/v1/object/public/' + bucket + '/' + path;
      return publicUrl;
    } catch (e) { console.error('Upload failed:', e); return null; }
  },
  getPublicUrl(bucket, path) {
    return 'https://' + SUPABASE_PROJECT + '.supabase.co/storage/v1/object/public/' + bucket + '/' + path;
  },
  // Mappers (exposed for realtime to convert records)
  jobFromDb, liFromDb, vendorFromDb, custFromDb, repFromDb, sopFromDb,
};
