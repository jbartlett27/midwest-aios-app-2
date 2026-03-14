import { useState, useRef } from 'react';

const inputStyle = {width:"100%",padding:"8px 12px",background:"#111111",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e5e5e5",fontSize:13,outline:"none",fontFamily:"'Satoshi',sans-serif"};
const Card = ({children,style}) => <div style={{background:"#111111",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:22,...style}}>{children}</div>;
const Btn = ({children,onClick,v="primary",style:s}) => {const st={primary:{background:"#2dd4bf",color:"#000",fontWeight:600},secondary:{background:"transparent",color:"#a3a3a3",border:"1px solid rgba(255,255,255,0.1)"},danger:{background:"rgba(248,113,113,0.08)",color:"#f87171",border:"1px solid rgba(248,113,113,0.15)"}};return <button onClick={onClick} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)",...st[v],...s}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"}}>{children}</button>};
const fmt = n => '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function isHeaderRow(row) {
  return String(row[0]||'').toLowerCase().trim() === 'tag' || String(row[0]||'').toLowerCase().trim() === 'tags';
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

function isLineItem(row) {
  const desc = row[3] && String(row[3]).trim().length > 0;
  const qty = Number(row[5]) > 0;
  const price = Number(row[8]) > 0 || Number(row[14]) > 0 || Number(row[6]) > 0;
  return desc && (qty || price);
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
  const results = { sheets: [], allItems: [], vendors: new Set(), groups: new Set(), errors: [] };
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
  // Extract job name from first sheet
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

  const selectedCount = parsed ? parsed.allItems.filter(i => selectedSheets[i.sheet]).length : 0;
  const selectedCost = parsed ? parsed.allItems.filter(i => selectedSheets[i.sheet]).reduce((s, i) => s + (i.unitCost * i.qtyOrdered), 0) : 0;
  const selectedRevenue = parsed ? parsed.allItems.filter(i => selectedSheets[i.sheet]).reduce((s, i) => s + ((i.unitPrice || 0) * i.qtyOrdered), 0) : 0;

  return (
    <div style={{animation:"fadeUp 0.4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <h2 style={{fontSize:24,fontWeight:700,color:"#f0f0f0",marginBottom:4,letterSpacing:-0.5}}>Data Import</h2>
          <p style={{fontSize:13,color:"#737373"}}>Upload Excel quotes to create jobs with all line items</p>
        </div>
      </div>

      {!parsed && !importDone && (
        <Card style={{textAlign:"center",padding:48,border:"2px dashed rgba(45,212,191,0.2)",cursor:"pointer"}} onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} style={{display:"none"}}/>
          <div style={{fontSize:40,marginBottom:16,opacity:0.3}}>+</div>
          <div style={{fontSize:16,fontWeight:600,color:"#e5e5e5",marginBottom:8}}>Drop an Excel quote here or click to browse</div>
          <div style={{fontSize:13,color:"#737373",marginBottom:16}}>Supports .xls and .xlsx files</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {["Tag","Manuf","Model #","Description","Color","QTY","List","Net Each","Ship","Install","Your Price"].map(f => (
              <span key={f} style={{padding:"3px 8px",borderRadius:5,background:"rgba(45,212,191,0.08)",color:"#2dd4bf",fontSize:10,fontWeight:500}}>{f}</span>
            ))}
          </div>
          <div style={{fontSize:11,color:"#525252",marginTop:16}}>All columns auto-mapped from Midwest quote format</div>
        </Card>
      )}

      {parsed && !importDone && (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Sheets</div>
              <div style={{fontSize:28,fontWeight:700,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{parsed.sheets.length}</div>
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Line Items</div>
              <div style={{fontSize:28,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{selectedCount}</div>
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Vendors</div>
              <div style={{fontSize:28,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{parsed.vendors.size}</div>
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Total Cost</div>
              <div style={{fontSize:28,fontWeight:700,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selectedCost)}</div>
            </Card>
          </div>

          <Card>
            <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:16}}>Import Settings</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label>
                <input value={jobName} onChange={e => setJobName(e.target.value)} style={inputStyle} placeholder="e.g. DeKalb Mitchell ES"/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Import Into</label>
                <select value={jobId} onChange={e => setJobId(e.target.value)} style={inputStyle}>
                  <option value="new">+ Create New Job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>Sheets to Import</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={() => { const s = {}; parsed.sheets.forEach(sh => { s[sh.name] = true; }); setSelectedSheets(s); }} style={{fontSize:11,color:"#2dd4bf",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Select All</button>
                <button onClick={() => setSelectedSheets({})} style={{fontSize:11,color:"#737373",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Clear</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {parsed.sheets.map(sh => (
                <label key={sh.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:selectedSheets[sh.name]?"rgba(45,212,191,0.06)":"rgba(255,255,255,0.02)",border:selectedSheets[sh.name]?"1px solid rgba(45,212,191,0.15)":"1px solid rgba(255,255,255,0.04)",cursor:"pointer",transition:"all 0.15s"}}>
                  <input type="checkbox" checked={!!selectedSheets[sh.name]} onChange={e => setSelectedSheets({...selectedSheets,[sh.name]:e.target.checked})} style={{accentColor:"#2dd4bf",width:16,height:16}} onClick={e => e.stopPropagation()}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#e5e5e5"}}>{sh.name}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{sh.itemCount} items</span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>Preview ({selectedCount} items)</div>
              {selectedRevenue > 0 && <span style={{fontSize:13,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>Revenue: {fmt(selectedRevenue)}</span>}
            </div>
            <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1100}}>
                <thead>
                  <tr style={{background:"#0a0a0a"}}>
                    {["Tag","Manuf","Model #","Description","Color","Qty","List","Net Ea","Ship","Install","Price","Group"].map(h => (
                      <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#737373",fontSize:11,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.allItems.filter(i => selectedSheets[i.sheet]).slice(0, 50).map((item, idx) => (
                    <tr key={idx} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                      <td style={{padding:"5px 8px",color:"#a78bfa",fontWeight:500}}>{item.tag}</td>
                      <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{item.manufacturer}</td>
                      <td style={{padding:"5px 8px",color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{item.modelNumber}</td>
                      <td style={{padding:"5px 8px",color:"#e5e5e5",maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.description}</td>
                      <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{item.color}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{item.qtyOrdered}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#737373"}}>{item.listPrice ? fmt(item.listPrice) : '--'}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#34d399"}}>{fmt(item.unitCost)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#fbbf24"}}>{item.shippingPerUnit ? fmt(item.shippingPerUnit) : '--'}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa"}}>{item.installPerUnit ? fmt(item.installPerUnit) : '--'}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf",fontWeight:600}}>{item.unitPrice ? fmt(item.unitPrice) : '--'}</td>
                      <td style={{padding:"5px 8px",color:"#525252",fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedCount > 50 && <div style={{padding:12,textAlign:"center",color:"#525252",fontSize:12}}>Showing 50 of {selectedCount} items</div>}
            </div>
          </Card>

          <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={() => { setParsed(null); if(fileRef.current) fileRef.current.value=''; }}>Cancel</Btn>
            <Btn onClick={handleImport} style={{padding:"12px 32px",fontSize:15}}>
              {importing ? 'Importing...' : 'Import ' + selectedCount + ' Items'}
            </Btn>
          </div>
        </div>
      )}

      {importDone && (
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{width:56,height:56,borderRadius:28,background:"rgba(45,212,191,0.12)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24,color:"#2dd4bf"}}>+</div>
          <div style={{fontSize:22,fontWeight:700,color:"#2dd4bf",marginBottom:8}}>Import Complete</div>
          <div style={{fontSize:14,color:"#c4c4c4",marginBottom:24}}>{importDone.items} line items imported into "{importDone.jobName}"</div>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
            <Card style={{padding:16,minWidth:120}}>
              <div style={{fontSize:11,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Items</div>
              <div style={{fontSize:24,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{importDone.items}</div>
            </Card>
            <Card style={{padding:16,minWidth:120}}>
              <div style={{fontSize:11,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>New Vendors</div>
              <div style={{fontSize:24,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{importDone.vendors}</div>
            </Card>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <Btn v="secondary" onClick={() => { setParsed(null); setImportDone(null); if(fileRef.current) fileRef.current.value=''; }}>Import Another</Btn>
            <Btn onClick={() => { setParsed(null); setImportDone(null); }}>Done</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
