import React, {useRef, useState} from 'react';
import {Btn, inputStyle} from './App.jsx';
import {archivedCatalogRecords, catalogChange, catalogData} from './catalogLifecycle.js';

export function CatalogControls({vendor,customSops,rec,changeVendorCatalog,notify}) {
  const [target,setTarget] = useState(null);
  const [updates,setUpdates] = useState({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const lock = useRef(false);
  const archived = archivedCatalogRecords(customSops,vendor.id);
  if (!changeVendorCatalog) return null;
  const open = (sop,action) => {
    if (lock.current || !sop) return;
    const data = catalogData(sop);
    if (!data || data.vendorId !== vendor.id) return;
    setError('');setUpdates({title:data.title || sop.title,edition:data.edition || ''});setTarget({sop,action});
  };
  const save = async () => {
    if (lock.current || !target) return;
    lock.current=true;setBusy(true);setError('');
    try {
      catalogChange(target.sop,target.action,updates);
      if(catalogData(target.sop)?.vendorId!==vendor.id)throw new Error('Vendor changed. Choose the catalogue again.');
      const saved=await changeVendorCatalog(target.sop,target.action,updates);
      if(!saved || saved.id!==target.sop.id)throw new Error('Could not verify the catalogue change. Refresh before trying again.');
      setTarget(null);notify?.(target.action === 'delete' ? 'Catalogue deleted. Files kept; restore is available.' : 'Catalogue saved.');
    } catch (e) { setError(String(e?.message || e)); }
    finally {lock.current=false;setBusy(false);}
  };
  return <div style={{margin:'12px 0',fontSize:12,color:'#9a9a9a'}}>
    {rec&&<div style={{display:'flex',gap:8}}><Btn v="secondary" disabled={busy} onClick={()=>open(customSops.find(s=>s.id===rec.id),'edit')}>Edit Catalog</Btn><Btn v="secondary" disabled={busy} onClick={()=>open(customSops.find(s=>s.id===rec.id),'delete')}>Delete Catalog</Btn></div>}
    {!!archived.length&&<div style={{marginTop:12}}>Deleted catalogues (files kept)
      {archived.map(r=><div key={r.id} style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}><span>{r.title} | edition {r.edition || 'unknown'} | {r.id}</span><Btn v="secondary" disabled={busy} onClick={()=>open(customSops.find(s=>s.id===r.id),'restore')}>Restore catalogue</Btn></div>)}
    </div>}
    {target&&<div role="dialog" aria-modal="true" aria-label={target.action === 'edit' ? 'Edit Catalog' : target.action === 'delete' ? 'Delete Catalog' : 'Restore Catalog'} style={{position:'fixed',inset:0,zIndex:1250,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{width:'min(520px,94vw)',background:'#111111',border:'1px solid #333',borderRadius:14,padding:22}}>
        <div style={{fontSize:17,fontWeight:700,color:'#f0f0f0'}}>{target.action === 'edit' ? 'Edit Catalog' : target.action === 'delete' ? 'Delete Catalog?' : 'Restore Catalog?'}</div>
        <p>{vendor.name} &gt;&gt; {target.sop.title} | edition {catalogData(target.sop).edition || 'unknown'}<br/>{target.sop.id}</p>
        {target.action === 'edit' ? <>
          <label>Catalogue title<input aria-label="Catalogue title" disabled={busy} value={updates.title} maxLength={160} style={{...inputStyle,margin:'6px 0 12px'}} onChange={e=>setUpdates({...updates,title:e.target.value})}/></label>
          <label>Edition<input aria-label="Edition" disabled={busy} value={updates.edition} placeholder="YYYY or YYYY-MM-DD; blank if unknown" style={{...inputStyle,margin:'6px 0 12px'}} onChange={e=>setUpdates({...updates,edition:e.target.value})}/></label>
          <p>Only title and edition change. All catalogue content and files are kept. Upload a separate catalogue for different content.</p>
        </> : <p>{target.action === 'delete' ? 'Remove only this catalogue from the vendor and Brain answers? All files are kept. You can restore it below.' : 'Make this catalogue available to the vendor and Brain again? All files are kept.'}</p>}
        {error&&<div role="alert" style={{color:'#f87171',marginBottom:12}}>{error}</div>}
        <div style={{display:'flex',gap:8}}><Btn v="secondary" disabled={busy} onClick={()=>{setTarget(null);setError('')}}>Cancel</Btn><Btn disabled={busy} onClick={save}>{busy?'Saving...':target.action === 'edit'?'Save Catalog':target.action === 'delete'?'Delete Catalog':'Restore Catalog'}</Btn></div>
      </div>
    </div>}
  </div>;
}
