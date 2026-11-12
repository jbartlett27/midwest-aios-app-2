// Catalogue lifecycle writes are conditional, awaited, and never touch storage objects.
export const ARCHIVED_CATALOG_CAT = 'VendorCatalogDeleted';
export function catalogData(sop) {
  try {
    const d = JSON.parse(sop?.content);
    return d && typeof d === 'object' && !Array.isArray(d) && typeof d.vendorId === 'string' && d.vendorId.trim() && typeof d.url === 'string' && d.url.trim() ? d : null;
  } catch { return null; }
}
export function archivedCatalogRecords(sops, vendorId) {
  return (Array.isArray(sops) ? sops : []).flatMap(s => {
    const d = s?.cat === ARCHIVED_CATALOG_CAT && catalogData(s);
    return d && d.vendorId === vendorId ? [{...d, id:s.id}] : [];
  });
}
export function catalogChange(sop, action, updates) {
  const data = catalogData(sop);
  const expectedCat = action === 'restore' ? ARCHIVED_CATALOG_CAT : 'VendorCatalog';
  if (!sop?.id || sop.cat !== expectedCat || !data) throw new Error('Catalogue not found or changed. Refresh and choose it again.');
  if (action === 'delete') return {cat:ARCHIVED_CATALOG_CAT};
  if (action === 'restore') return {cat:'VendorCatalog'};
  if (action !== 'edit' || !updates || typeof updates !== 'object' || Array.isArray(updates) || !Object.keys(updates).length || Object.keys(updates).some(k => !['title','edition'].includes(k))) throw new Error('Only catalogue title and edition can be edited. Upload a separate catalogue to replace its content.');
  const next = {...data};
  if (Object.hasOwn(updates,'title')) {
    if (typeof updates.title !== 'string' || !updates.title.trim() || updates.title.trim().length > 160) throw new Error('Catalogue title must contain 1 to 160 characters.');
    next.title = updates.title.trim();
  }
  if (Object.hasOwn(updates,'edition')) {
    if (typeof updates.edition !== 'string') throw new Error('Use a year, YYYY-MM-DD, or blank for an unknown edition.');
    const ed = updates.edition.trim();
    if (ed && !/^\d{4}(?:-\d{2}-\d{2})?$/.test(ed)) throw new Error('Use a year, YYYY-MM-DD, or blank for an unknown edition.');
    if (ed) {
      const y = Number(ed.slice(0,4)), m = Number(ed.slice(5,7)), day = Number(ed.slice(8,10));
      const d = ed.length === 10 ? new Date(y,m-1,day) : null;
      if (y < 1900 || y > 2100 || (d && (d.getFullYear() !== y || d.getMonth() !== m-1 || d.getDate() !== day))) throw new Error('Edition must be a valid publication year or date (1900 to 2100).');
    }
    next.edition = ed;
  }
  return {title:next.title || sop.title, content:JSON.stringify(next)};
}
export function selectCatalog(sops, vendors, input) {
  const q = typeof input?.vendor === 'string' ? input.vendor.trim().toLowerCase() : '';
  const exact = (vendors || []).filter(v => q && [v.id,v.name].some(x => String(x).toLowerCase() === q));
  const hits = exact.length ? exact : (vendors || []).filter(v => q && String(v.name || '').toLowerCase().includes(q));
  if (hits.length !== 1) return {error:hits.length ? 'More than one vendor matches. Give the exact vendor name or ID.' : 'Give one vendor from the Directory.'};
  const rows = (sops || []).filter(s => s?.cat === 'VendorCatalog' && catalogData(s)?.vendorId === hits[0].id && (!input.catalog_id || s.id === input.catalog_id));
  if (rows.length !== 1) return {error:rows.length ? 'More than one catalogue matches. Give its exact catalog_id: '+rows.map(s => s.id+' ('+s.title+')').join('; ') : 'No active catalogue matches that vendor and catalog_id.'};
  return {sop:{...rows[0]}, vendor:{...hits[0]}};
}
export async function persistCatalog({fetchImpl, baseUrl, headers, sop, action, updates}) {
  let patch;
  try { patch = action === 'insert' ? null : catalogChange(sop,action,updates); }
  catch (e) { return {ok:false,error:e.message}; }
  if (action === 'insert' && (!sop?.id || sop.cat !== 'VendorCatalog' || !catalogData(sop))) return {ok:false,error:'Invalid catalogue record.'};
  const expected = {...sop,...patch};
  const query = new URLSearchParams();
  if (patch) for (const key of ['id','cat','content','title']) query.set(key,'eq.'+sop[key]);
  try {
    const r = await fetchImpl(baseUrl+'/sops'+(patch?'?'+query:''), {method:patch?'PATCH':'POST', headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(patch || sop)});
    if (!r.ok) return {ok:false,error:'Could not save the catalogue change. Refresh and try again.'};
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || ['id','cat','content','title'].some(k => rows[0][k] !== expected[k])) return {ok:false,error:'Catalogue changed or could not be verified. Refresh and choose it again.'};
    return {ok:true,row:rows[0]};
  } catch { return {ok:false,error:'Could not confirm the catalogue change. Refresh before trying again.'}; }
}
