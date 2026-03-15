import { useState, useRef } from 'react';

const inputStyle = {width:"100%",padding:"8px 12px",background:"#111111",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e5e5e5",fontSize:13,outline:"none",fontFamily:"'Satoshi',sans-serif"};
const Card = ({children,style}) => <div style={{background:"#111111",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:22,...style}}>{children}</div>;
const Btn = ({children,onClick,v="primary",style:s}) => {const st={primary:{background:"#2dd4bf",color:"#000",fontWeight:600},secondary:{background:"transparent",color:"#a3a3a3",border:"1px solid rgba(255,255,255,0.1)"},danger:{background:"rgba(248,113,113,0.08)",color:"#f87171",border:"1px solid rgba(248,113,113,0.15)"}};return <button onClick={onClick} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)",...st[v],...s}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"}}>{children}</button>};
const fmt = n => '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function isHeaderRow(row) {
  const first = String(row[0]||'').toLowerCase().trim();
  return first === 'tag' || first === 'tags' || first === 'item' || first === 'line';
}

function isSectionHeader(row) {
  const hasDesc = row[3] && String(row[3]).trim().length > 0;
  const hasTag = row[0] && String(row[0]).trim().length > 0;
  const hasManuf = row[1] && String(row[1]).trim().length > 0;
  const hasQty = row[5] && Number(row[5]) > 0;
  const hasPrice = row[6] && Number(row[6]) > 0;
  const hasNet = row[8] && Number(row[8]) > 0;
  return hasDesc && !hasTag && !hasManuf && !hasQty && !hasPrice && !hasNet;
}

// Enhanced junk detection
function isJunkRow(row) {
  const desc = String(row[3]||'').trim().toLowerCase();
  const tag = String(row[0]||'').trim().toLowerCase();
  const manuf = String(row[1]||'').trim().toLowerCase();
  const allText = (desc + ' ' + tag + ' ' + manuf).toLowerCase();
  
  // Filter freight, surcharges, tariffs, installation-only lines, totals
  const junkPatterns = [
    /^freight$/i, /^frt$/i, /^shipping$/i, /^delivery$/i,
    /^surcharge$/i, /^tariff/i, /^fuel\s*surcharge/i,
    /^installation$/i, /^install$/i, /^installation:/i,
    /^total/i, /^subtotal/i, /^grand\s*total/i,
    /^tax$/i, /^sales\s*tax/i,
    /^quote\s*#/i, /^quote\s*date/i, /^prepared\s*by/i,
    /^customer:/i, /^ship\s*to:/i, /^bill\s*to:/i,
    /^terms:/i, /^payment/i, /^note:/i, /^notes:/i,
  ];
  
  for (const p of junkPatterns) {
    if (p.test(desc) || p.test(tag) || p.test(manuf)) return true;
  }
  
  // If description contains address-like patterns but no product info
  if (/^\d+\s+\w+\s+(street|st|ave|road|rd|hwy|blvd|dr|court|ct|lane|ln|way)\b/i.test(desc)) {
    // Looks like an address, not a product
    const hasQty = Number(row[5]) > 1;
    if (!hasQty) return true;
  }
  
  // If tag is just a number like "1.0" with no real description
  if (/^\d+\.?\d*$/.test(tag) && desc.length < 15 && !manuf) return true;
  
  return false;
}

function isLineItem(row) {
  const desc = row[3] && String(row[3]).trim().length > 0;
  const qty = Number(row[5]) > 0;
  const price = Number(row[8]) > 0 || Number(row[14]) > 0 || Number(row[6]) > 0;
  if (!desc) return false;
  if (!qty && !price) return false;
  if (isJunkRow(row)) return false;
  return true;
}

function cleanDesc(d) {
  if (!d) return '';
  let s = String(d).replace(/\r/g, '');
  const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  let main = lines[0] || '';
  let specIdx = main.indexOf('Item Specifics');
  if (specIdx > 0) main = main.substring(0, specIdx).trim();
  let roomIdx = main.indexOf('-- Room Number');
  if (roomIdx > 0) main = main.substring(0, roomIdx).trim();
  let roomIdx2 = main.indexOf('Room Number');
  if (roomIdx2 > 20) main = main.substring(0, roomIdx2).trim();
  return main.trim();
}

async function parseQuoteXLS(file) {
  const XLSX = (await import('xlsx'));
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const results = { sheets: [], allItems: [], vendors: new Set(), groups: new Set(), errors: [], skipped: [] };
  for (let si = 0; si < workbook.SheetNames.length; si++) {
    const sheetName = workbook.SheetNames[si];
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let currentGroup = '';
    let sheetItems = [];
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 4) continue;
      if (isHeaderRow(row)) continue;
      if (isSectionHeader(row)) {
        currentGroup = String(row[3]).trim().replace(/\n/g, ' ').substring(0, 80);
        results.groups.add(currentGroup);
        continue;
      }
      // Check for junk rows explicitly and track them
      if (isJunkRow(row)) {
        results.skipped.push(String(row[3]||row[0]||'').trim().substring(0, 50));
        continue;
      }
      if (isLineItem(row)) {
        const tag = String(row[0]||'').trim().replace(/\.0$/, '');
        const manuf = String(row[1]||'').trim();
        const model = String(row[2]||'').trim().replace(/\.0$/, '');
        const desc = cleanDesc(row[3]);
        const color = String(row[4]||'').trim();
        const qty = Math.round(Number(row[5])||0);
        const list = Number(row[6])||0;
        const netEach = Number(row[8])||0;
        const shipEach = Number(row[10])||0;
        const installEach = Number(row[12])||0;
        const costEach = Number(row[14])||netEach;
        const yourPrice = Number(row[16])||0;
        if (qty <= 0 && list <= 0 && netEach <= 0) continue;
        if (desc.toLowerCase().startsWith('quote ') || desc.startsWith('#')) continue;
        // Skip very short descriptions that look like noise
        if (desc.length < 5 && !manuf && !model) continue;
        sheetItems.push({
          tag, manufacturer: manuf || sheetName, modelNumber: model,
          description: desc, color, qtyOrdered: qty || 1,
          listPrice: list, unitCost: netEach || costEach,
          shippingPerUnit: shipEach, installPerUnit: installEach,
          unitPrice: yourPrice || 0, group: currentGroup, sheet: sheetName,
          qtyReceived: 0, qtyInvoiced: 0,
        });
        if (manuf) results.vendors.add(manuf);
      }
    }
    results.sheets.push({ name: sheetName, itemCount: sheetItems.length });
    results.allItems.push(...sheetItems);
  }
  try {
    const ws0 = workbook.Sheets[workbook.SheetNames[0]];
    const d0 = XLSX.utils.sheet_to_json(ws0, { header: 1, defval: '' });
    if (d0[0] && d0[0][4]) results.jobName = String(d0[0][4]).split('\n')[0].trim();
  } catch {}
  return results;
}

export default function CsvUploadPage({ jobs, addJob, addLineItem, addVendor, vendors, customers, notify, db }) {
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(null);
  const [jobName, setJobName] = useState('');
  const [selectedSheets, setSelectedSheets] = useState({});
  const [jobId, setJobId] = useState('new');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await parseQuoteXLS(file);
      let name = result.jobName || file.name.replace(/\.(xls|xlsx|csv)$/i, '').replace(/_/g, ' ');
      setJobName(name);
      const sel = {};
      result.sheets.forEach(s => { sel[s.name] = true; });
      setSelectedSheets(sel);
      setParsed(result);
      setImportDone(null);
    } catch (err) {
      notify('Error reading file: ' + err.message, 'error');
    }
  };

  const handleImport = async () => {
    if (!parsed || importing) return;
    setImporting(true);
    try {
      const items = parsed.allItems.filter(i => selectedSheets[i.sheet]);
      if (items.length === 0) { notify('No items selected', 'error'); setImporting(false); return; }
      let targetJobId;
      if (jobId === 'new') {
        targetJobId = 'JOB-' + Math.random().toString(36).slice(2, 8);
        addJob({
          id: targetJobId, name: jobName || 'Imported Quote',
          customer: customers[0]?.id || '', salesRep: '',
          phase: 'Quoting', createdDate: new Date().toISOString().split('T')[0],
          startDate: '', dueDate: '', endDate: '', notes: 'Imported from Excel quote',
          paymentStatus: 'unpaid', terms: 'Net 30', poNumber: '',
          shipTo: '', shipVia: '', billTo: '', orderNotes: '',
          docStatuses: {}, activities: [], auditTrail: [],
        });
      } else {
        targetJobId = jobId;
      }
      const existingNames = new Set(vendors.map(v => v.name.toLowerCase().trim()));
      const vendorMap = {};
      vendors.forEach(v => { vendorMap[v.name.toLowerCase().trim()] = v.id; });
      let newVendorCount = 0;
      for (const vName of parsed.vendors) {
        const key = vName.toLowerCase().trim();
        if (!existingNames.has(key)) {
          const vid = 'V-' + Math.random().toString(36).slice(2, 8);
          addVendor({ id: vid, name: vName, contact: '', email: '', phone: '', category: 'Furniture', address: '', discountRate: 0, discountType: 'percentage', discountNotes: '' });
          vendorMap[key] = vid;
          existingNames.add(key);
          newVendorCount++;
        }
      }
      let created = 0;
      for (const item of items) {
        const vendorId = vendorMap[(item.manufacturer || '').toLowerCase().trim()] || '';
        addLineItem({
          id: 'LI-' + Math.random().toString(36).slice(2, 8),
          jobId: targetJobId, description: item.description, vendor: vendorId,
          tag: item.tag, group: item.group, manufacturer: item.manufacturer,
          modelNumber: item.modelNumber, color: item.color, listPrice: item.listPrice,
          unitCost: item.unitCost, unitPrice: item.unitPrice,
          shippingPerUnit: item.shippingPerUnit, installPerUnit: item.installPerUnit,
          qtyOrdered: item.qtyOrdered, qtyReceived: 0, qtyInvoiced: 0,
          poDate: '', deliveryDate: '', invoiceDate: '',
        });
        created++;
      }
      setImportDone({ jobId: targetJobId, items: created, vendors: newVendorCount, jobName });
      notify('Imported ' + created + ' line items into "' + jobName + '"');
    } catch (err) {
      notify('Import error: ' + err.message, 'error');
    }
    setImporting(false);
  };

  return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
      <div><h2 style={{fontSize:24,fontWeight:700,color:"#f0f0f0",marginBottom:4,letterSpacing:-0.5}}>Data Import</h2><p style={{fontSize:13,color:"#737373"}}>Upload Excel quote spreadsheets to create jobs and line items</p></div>
    </div>

    <Card style={{marginBottom:24,border:"1px solid rgba(45,212,191,0.15)"}}>
      <div style={{fontSize:14,fontWeight:700,color:"#2dd4bf",marginBottom:16}}>Upload Excel Quote</div>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} style={{display:"none"}}/>
        <Btn onClick={()=>fileRef.current?.click()}>Choose File (.xls / .xlsx)</Btn>
        <span style={{fontSize:12,color:"#525252"}}>Supports Lisa's standard Excel quote format</span>
      </div>
    </Card>

    {parsed && !importDone && <>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:12}}>Preview: {parsed.allItems.length} line items across {parsed.sheets.length} sheet{parsed.sheets.length>1?"s":""}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={jobName} onChange={e=>setJobName(e.target.value)} style={inputStyle}/></div>
          <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Add to</label><select value={jobId} onChange={e=>setJobId(e.target.value)} style={inputStyle}><option value="new">Create New Job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
        </div>
        {parsed.sheets.length > 1 && <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Sheets to Import:</div>{parsed.sheets.map(s=><label key={s.name} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",cursor:"pointer"}}><input type="checkbox" checked={selectedSheets[s.name]||false} onChange={e=>setSelectedSheets({...selectedSheets,[s.name]:e.target.checked})}/><span style={{fontSize:13,color:"#d4d4d4"}}>{s.name}</span><span style={{fontSize:12,color:"#525252"}}>({s.itemCount} items)</span></label>)}</div>}
        {parsed.skipped.length > 0 && <div style={{marginBottom:16,padding:"10px 14px",background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:8}}><div style={{fontSize:12,fontWeight:600,color:"#fbbf24",marginBottom:6}}>Filtered out {parsed.skipped.length} non-product rows:</div><div style={{fontSize:11,color:"#a3a3a3"}}>{parsed.skipped.slice(0,8).join(", ")}{parsed.skipped.length>8?" + "+(parsed.skipped.length-8)+" more":""}</div></div>}
        <div style={{fontSize:12,color:"#a3a3a3",marginBottom:12}}>{parsed.vendors.size} vendors detected: {[...parsed.vendors].join(', ')}</div>
      </Card>

      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:600,color:"#e5e5e5",marginBottom:8}}>Items Preview</div>
        <div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#0a0a0a"}}><th style={{padding:"8px 10px",textAlign:"left",color:"#737373",fontWeight:600,fontSize:11}}>Tag</th><th style={{padding:"8px 10px",textAlign:"left",color:"#737373",fontWeight:600,fontSize:11}}>Manufacturer</th><th style={{padding:"8px 10px",textAlign:"left",color:"#737373",fontWeight:600,fontSize:11}}>Description</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373",fontWeight:600,fontSize:11}}>Qty</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373",fontWeight:600,fontSize:11}}>List</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373",fontWeight:600,fontSize:11}}>Net</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373",fontWeight:600,fontSize:11}}>Price</th></tr></thead>
            <tbody>{parsed.allItems.filter(i=>selectedSheets[i.sheet]).slice(0,30).map((item,i)=><tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}><td style={{padding:"6px 10px",color:"#a3a3a3"}}>{item.tag}</td><td style={{padding:"6px 10px",color:"#a78bfa"}}>{item.manufacturer}</td><td style={{padding:"6px 10px",color:"#d4d4d4",maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.description}</td><td style={{padding:"6px 10px",color:"#d4d4d4",textAlign:"right"}}>{item.qtyOrdered}</td><td style={{padding:"6px 10px",color:"#525252",textAlign:"right"}}>{item.listPrice?fmt(item.listPrice):''}</td><td style={{padding:"6px 10px",color:"#a3a3a3",textAlign:"right"}}>{fmt(item.unitCost)}</td><td style={{padding:"6px 10px",color:"#2dd4bf",textAlign:"right",fontWeight:600}}>{item.unitPrice?fmt(item.unitPrice):''}</td></tr>)}</tbody>
          </table>
          {parsed.allItems.filter(i=>selectedSheets[i.sheet]).length>30&&<div style={{padding:8,textAlign:"center",fontSize:12,color:"#525252"}}>+ {parsed.allItems.filter(i=>selectedSheets[i.sheet]).length-30} more items</div>}
        </div>
      </Card>

      <div style={{display:"flex",gap:12}}><Btn onClick={handleImport}>{importing?"Importing...":"Import "+parsed.allItems.filter(i=>selectedSheets[i.sheet]).length+" Items"}</Btn><Btn v="secondary" onClick={()=>{setParsed(null);if(fileRef.current)fileRef.current.value=''}}>Cancel</Btn></div>
    </>}

    {importDone && <Card style={{border:"1px solid rgba(52,211,153,0.2)"}}>
      <div style={{fontSize:16,fontWeight:700,color:"#34d399",marginBottom:8}}>Import Complete</div>
      <div style={{fontSize:13,color:"#a3a3a3",marginBottom:4}}>{importDone.items} line items imported into "{importDone.jobName}"</div>
      {importDone.vendors > 0 && <div style={{fontSize:13,color:"#a78bfa"}}>{importDone.vendors} new vendors added to directory</div>}
      <div style={{marginTop:16,display:"flex",gap:8}}><Btn onClick={()=>{setParsed(null);setImportDone(null);if(fileRef.current)fileRef.current.value=''}}>Upload Another</Btn></div>
    </Card>}
  </div>;
}
