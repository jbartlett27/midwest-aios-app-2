import { useState, useRef, useCallback } from 'react';

const inputStyle = {width:"100%",padding:"8px 12px",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e5e5e5",fontSize:13,outline:"none",fontFamily:"'Satoshi',sans-serif"};
const Card = ({children,style}) => <div style={{background:"#111111",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:22,...style}}>{children}</div>;
const Btn = ({children,onClick,v="primary",style:s,disabled}) => {const st={primary:{background:"#2dd4bf",color:"#000",fontWeight:600},secondary:{background:"transparent",color:"#a3a3a3",border:"1px solid rgba(255,255,255,0.1)"},danger:{background:"rgba(248,113,113,0.08)",color:"#f87171",border:"1px solid rgba(248,113,113,0.15)"},ghost:{background:"transparent",color:"#2dd4bf",border:"1px solid rgba(45,212,191,0.15)"}};return <button onClick={disabled?undefined:onClick} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:disabled?"not-allowed":"pointer",fontSize:13,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.2s",opacity:disabled?0.4:1,...st[v],...s}}>{children}</button>};
const Badge = ({label,color}) => <span style={{display:"inline-flex",padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",background:`${color}12`,color:`${color}cc`}}>{label}</span>;
const fmt = n => '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const I = ({ n, s = 18 }) => {
  const d = { upload:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12", file:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", package:"M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12", receipt:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 6h8M8 10h8M8 14h5", check:"M20 6L9 17l-5-5", link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d[n]||""}/></svg>;
};

// === QUOTE PARSER ===
function isHeaderRow(row){const f=String(row[0]||'').toLowerCase().trim();return f==='tag'||f==='tags'||f==='item'||f==='line'}
function isSectionHeader(row){return row[3]&&String(row[3]).trim().length>0&&!row[0]&&!row[1]&&!(Number(row[5])>0)&&!(Number(row[6])>0)&&!(Number(row[8])>0)}
function isJunkRow(row){const d=String(row[3]||'').trim(),t=String(row[0]||'').trim(),m=String(row[1]||'').trim();const junk=[/^freight$/i,/^frt$/i,/^shipping$/i,/^delivery$/i,/^surcharge$/i,/^tariff/i,/^fuel\s*surcharge/i,/^installation$/i,/^install$/i,/^total/i,/^subtotal/i,/^grand\s*total/i,/^tax$/i,/^sales\s*tax/i,/^quote\s*[#d]/i,/^prepared\s*by/i,/^customer:/i,/^ship\s*to:/i,/^bill\s*to:/i,/^terms:/i,/^payment/i,/^note[s]?:/i];for(const p of junk){if(p.test(d)||p.test(t)||p.test(m))return true}if(/^\d+\s+\w+\s+(street|st|ave|road|rd|hwy|blvd|dr|court|ct|lane|ln|way)\b/i.test(d)&&!(Number(row[5])>1))return true;if(/^\d+\.?\d*$/.test(t)&&d.length<15&&!m)return true;return false}
function cleanDesc(d){if(!d)return'';let s=String(d).replace(/\r/g,'');let main=s.split('\n').map(l=>l.trim()).filter(Boolean)[0]||'';let i=main.indexOf('Item Specifics');if(i>0)main=main.substring(0,i).trim();i=main.indexOf('-- Room Number');if(i>0)main=main.substring(0,i).trim();i=main.indexOf('Room Number');if(i>20)main=main.substring(0,i).trim();return main.trim()}

async function parseQuoteXLS(file){
  const XLSX=(await import('xlsx'));const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});
  const R={sheets:[],allItems:[],vendors:new Set(),groups:new Set(),skipped:[]};
  for(let si=0;si<wb.SheetNames.length;si++){const sn=wb.SheetNames[si];const ws=wb.Sheets[sn];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});let grp='';let items=[];
    for(let r=0;r<rows.length;r++){const row=rows[r];if(!row||row.length<4)continue;if(isHeaderRow(row))continue;if(isSectionHeader(row)){grp=String(row[3]).trim().replace(/\n/g,' ').substring(0,80);R.groups.add(grp);continue}if(isJunkRow(row)){R.skipped.push(String(row[3]||row[0]||'').trim().substring(0,50));continue}
      const desc=row[3]&&String(row[3]).trim().length>0,qty=Number(row[5])>0,price=Number(row[8])>0||Number(row[14])>0||Number(row[6])>0;
      if(desc&&(qty||price)){const tag=String(row[0]||'').trim().replace(/\.0$/,''),manuf=String(row[1]||'').trim(),model=String(row[2]||'').trim().replace(/\.0$/,''),d=cleanDesc(row[3]),color=String(row[4]||'').trim(),q=Math.round(Number(row[5])||0),list=Number(row[6])||0,net=Number(row[8])||0,ship=Number(row[10])||0,inst=Number(row[12])||0,cost=Number(row[14])||net,yourP=Number(row[16])||0;
        if(q<=0&&list<=0&&net<=0)continue;if(d.toLowerCase().startsWith('quote ')||d.startsWith('#'))continue;if(d.length<5&&!manuf&&!model)continue;
        items.push({tag,manufacturer:manuf||sn,modelNumber:model,description:d,color,qtyOrdered:q||1,listPrice:list,unitCost:net||cost,shippingPerUnit:ship,installPerUnit:inst,unitPrice:yourP||0,group:grp,sheet:sn,qtyReceived:0,qtyInvoiced:0});if(manuf)R.vendors.add(manuf)}}
    R.sheets.push({name:sn,itemCount:items.length});R.allItems.push(...items)}
  try{const ws0=wb.Sheets[wb.SheetNames[0]];const d0=XLSX.utils.sheet_to_json(ws0,{header:1,defval:''});if(d0[0]&&d0[0][4])R.jobName=String(d0[0][4]).split('\n')[0].trim()}catch{}
  return R;
}

// === GENERIC PARSER ===
async function parseGenericFile(file){
  const XLSX=(await import('xlsx'));const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});const sheets=[];
  for(const sn of wb.SheetNames){const ws=wb.Sheets[sn];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    let hIdx=0;for(let i=0;i<Math.min(rows.length,10);i++){if(rows[i].filter(c=>String(c).trim().length>0).length>=2){hIdx=i;break}}
    const headers=rows[hIdx].map((h,i)=>({original:String(h).trim(),index:i,sample:''}));
    const dataRows=rows.slice(hIdx+1).filter(r=>r.some(c=>String(c).trim().length>0));
    headers.forEach(h=>{h.sample=dataRows.slice(0,3).map(r=>String(r[h.index]||'').trim()).filter(Boolean).join(', ')});
    sheets.push({name:sn,headers:headers.filter(h=>h.original||h.sample),rows:dataRows,headerIdx:hIdx})}
  return sheets;
}

// === AUTO COLUMN MAPPING ===
const FIELD_DEFS={
  customers:[{key:'name',label:'Name',required:true,hints:['name','customer','company','organization','school','district','account']},{key:'contact',label:'Contact',hints:['contact','person','rep','first','last']},{key:'email',label:'Email',hints:['email','e-mail','mail']},{key:'phone',label:'Phone',hints:['phone','tel','telephone','mobile']},{key:'type',label:'Type',hints:['type','category','segment']},{key:'address',label:'Address',hints:['address','street','city','location']}],
  vendors:[{key:'name',label:'Company',required:true,hints:['name','vendor','manufacturer','company','supplier']},{key:'contact',label:'Contact',hints:['contact','person','rep']},{key:'email',label:'Email',hints:['email','e-mail']},{key:'phone',label:'Phone',hints:['phone','tel']},{key:'category',label:'Category',hints:['category','type','product']},{key:'address',label:'Address',hints:['address','street','city']},{key:'discountRate',label:'Discount %',hints:['discount','rate','margin']}],
  lineitems:[{key:'description',label:'Description',required:true,hints:['description','desc','item','product','name']},{key:'manufacturer',label:'Manufacturer',hints:['manufacturer','manuf','vendor','brand']},{key:'modelNumber',label:'Model #',hints:['model','sku','part','number']},{key:'color',label:'Color',hints:['color','colour','finish']},{key:'qtyOrdered',label:'Quantity',hints:['qty','quantity','count','units']},{key:'listPrice',label:'List Price',hints:['list','msrp','retail']},{key:'unitCost',label:'Net Cost',hints:['cost','net','dealer','wholesale']},{key:'unitPrice',label:'Customer Price',hints:['price','sell','customer','unit price']},{key:'tag',label:'Tag/Room',hints:['tag','room','location','area']}],
};
function autoMap(headers,fieldDefs){const m={};for(const f of fieldDefs){let best=null,bs=0;for(const h of headers){const n=h.original.toLowerCase().replace(/[^a-z0-9]/g,'');for(const hint of f.hints){const hn=hint.replace(/[^a-z0-9]/g,'');if(n===hn){best=h.index;bs=100;break}if(n.includes(hn)&&hn.length>=3&&bs<80){best=h.index;bs=80}if(hn.includes(n)&&n.length>=3&&bs<60){best=h.index;bs=60}}if(bs===100)break}if(best!==null)m[f.key]=best}return m}

// === DROP ZONE ===
function DropZone({onFile,icon,title,subtitle}){
  const ref=useRef();const[over,setOver]=useState(false);
  return <div onClick={()=>ref.current?.click()} onDragOver={e=>{e.preventDefault();e.stopPropagation()}} onDragEnter={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{e.preventDefault();setOver(false)}} onDrop={e=>{e.preventDefault();setOver(false);if(e.dataTransfer.files?.[0])onFile(e.dataTransfer.files[0])}}
    style={{border:"2px dashed "+(over?"#2dd4bf":"rgba(255,255,255,0.08)"),borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",background:over?"rgba(45,212,191,0.04)":"transparent",transition:"all 0.3s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.3)";e.currentTarget.style.background="rgba(45,212,191,0.02)"}} onMouseLeave={e=>{if(!over){e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.background="transparent"}}}>
    <input ref={ref} type="file" accept=".xls,.xlsx,.csv" onChange={e=>{if(e.target.files?.[0])onFile(e.target.files[0])}} style={{display:"none"}}/>
    <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,rgba(45,212,191,0.1),rgba(167,139,250,0.1))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#2dd4bf"}}><I n={icon||"upload"} s={24}/></div>
    <div style={{fontSize:15,fontWeight:600,color:"#e5e5e5",marginBottom:6}}>{title||"Drop file here or click to browse"}</div>
    <div style={{fontSize:12,color:"#525252"}}>{subtitle||".xls, .xlsx, .csv"}</div>
  </div>;
}

// === COLUMN MAPPER ===
function ColumnMapper({headers,fieldDefs,mapping,setMapping,sheetName}){
  return <div style={{marginBottom:16}}>
    <div style={{fontSize:13,fontWeight:600,color:"#e5e5e5",marginBottom:12}}>Map your columns {sheetName&&<span style={{color:"#525252",fontWeight:400}}> -- {sheetName}</span>}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 24px 1fr",gap:"8px 12px",alignItems:"center"}}>
      <div style={{fontSize:11,color:"#525252",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Your Column</div><div/><div style={{fontSize:11,color:"#525252",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Maps To</div>
      {fieldDefs.map(field=>{const mapped=mapping[field.key];return[
        <div key={field.key+"-f"} style={{padding:"8px 12px",background:mapped!==undefined?"rgba(45,212,191,0.04)":"#0a0a0a",border:"1px solid "+(mapped!==undefined?"rgba(45,212,191,0.15)":"rgba(255,255,255,0.06)"),borderRadius:8}}>
          <select value={mapped!==undefined?mapped:""} onChange={e=>{const v=e.target.value;const m={...mapping};if(v==="")delete m[field.key];else m[field.key]=parseInt(v);setMapping(m)}} style={{width:"100%",background:"transparent",border:"none",color:mapped!==undefined?"#2dd4bf":"#525252",fontSize:12,fontFamily:"'Satoshi',sans-serif",outline:"none",cursor:"pointer",WebkitAppearance:"auto",appearance:"auto"}}>
            <option value="">-- skip --</option>{headers.map(h=><option key={h.index} value={h.index}>{h.original||`Col ${h.index+1}`}{h.sample?` (${h.sample.substring(0,25)})`:''}</option>)}
          </select></div>,
        <div key={field.key+"-a"} style={{display:"flex",justifyContent:"center",color:mapped!==undefined?"#2dd4bf":"#333"}}><I n="link" s={14}/></div>,
        <div key={field.key+"-t"} style={{padding:"8px 12px",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:600,color:field.required?"#e5e5e5":"#a3a3a3"}}>{field.label}</span>{field.required&&<span style={{fontSize:9,color:"#f87171",fontWeight:700}}>REQ</span>}</div>
      ]}).flat()}
    </div>
  </div>;
}

// === MAIN ===
export default function CsvUploadPage({jobs,addJob,addLineItem,addVendor,addCustomer,vendors,customers,reps,notify,db,setPage,setSelectedJob}){
  const[mode,setMode]=useState("quote");
  const[fileName,setFileName]=useState('');
  const[parsed,setParsed]=useState(null);
  const[importing,setImporting]=useState(false);
  const[importDone,setImportDone]=useState(null);
  const[jobName,setJobName]=useState('');
  const[selectedSheets,setSelectedSheets]=useState({});
  const[jobId,setJobId]=useState('new');
  const[genericSheets,setGenericSheets]=useState(null);
  const[activeSheet,setActiveSheet]=useState(0);
  const[mapping,setMapping]=useState({});
  const[genericDone,setGenericDone]=useState(null);
  const[targetJobId,setTargetJobId]=useState('new');

  const reset=()=>{setFileName('');setParsed(null);setImportDone(null);setGenericSheets(null);setGenericDone(null);setMapping({});setJobName('')};

  const handleQuoteFile=async(f)=>{setFileName(f.name);try{const r=await parseQuoteXLS(f);setJobName(r.jobName||f.name.replace(/\.(xls|xlsx|csv)$/i,'').replace(/_/g,' '));const sel={};r.sheets.forEach(s=>{sel[s.name]=true});setSelectedSheets(sel);setParsed(r);setImportDone(null)}catch(err){notify('Error: '+err.message,'error')}};

  const handleGenericFile=async(f)=>{setFileName(f.name);try{const sheets=await parseGenericFile(f);setGenericSheets(sheets);setActiveSheet(0);setGenericDone(null);if(sheets[0]){setMapping(autoMap(sheets[0].headers,FIELD_DEFS[mode]||[]))}}catch(err){notify('Error: '+err.message,'error')}};

  const handleQuoteImport=async()=>{if(!parsed||importing)return;setImporting(true);try{
    const items=parsed.allItems.filter(i=>selectedSheets[i.sheet]);if(!items.length){notify('No items','error');setImporting(false);return}
    let tid;if(jobId==='new'){tid='JOB-'+Math.random().toString(36).slice(2,8);addJob({id:tid,name:jobName||'Imported',customer:customers[0]?.id||'',salesRep:'',phase:'Quoting',createdDate:new Date().toISOString().split('T')[0],startDate:'',dueDate:'',endDate:'',notes:'Imported from Excel',paymentStatus:'unpaid',terms:'Net 30',poNumber:'',shipTo:'',shipVia:'',billTo:'',orderNotes:'',docStatuses:{},activities:[],auditTrail:[]})}else{tid=jobId}
    const eN=new Set(vendors.map(v=>v.name.toLowerCase().trim()));const vM={};vendors.forEach(v=>{vM[v.name.toLowerCase().trim()]=v.id});let nv=0;
    for(const vn of parsed.vendors){const k=vn.toLowerCase().trim();if(!eN.has(k)){const vid='V-'+Math.random().toString(36).slice(2,8);addVendor({id:vid,name:vn,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0,discountType:'percentage',discountNotes:''});vM[k]=vid;eN.add(k);nv++}}
    let c=0;for(const item of items){const vid=vM[(item.manufacturer||'').toLowerCase().trim()]||'';addLineItem({id:'LI-'+Math.random().toString(36).slice(2,8),jobId:tid,description:item.description,vendor:vid,tag:item.tag,group:item.group,manufacturer:item.manufacturer,modelNumber:item.modelNumber,color:item.color,listPrice:item.listPrice,unitCost:item.unitCost,unitPrice:item.unitPrice,shippingPerUnit:item.shippingPerUnit,installPerUnit:item.installPerUnit,qtyOrdered:item.qtyOrdered,qtyReceived:0,qtyInvoiced:0,poDate:'',deliveryDate:'',invoiceDate:''});c++}
    setImportDone({jobId:tid,items:c,vendors:nv,jobName});notify('Imported '+c+' line items')}catch(err){notify('Error: '+err.message,'error')}setImporting(false)};

  const handleGenericImport=async()=>{if(!genericSheets)return;const sheet=genericSheets[activeSheet];if(!sheet)return;const defs=FIELD_DEFS[mode]||[];
    for(const rf of defs.filter(f=>f.required)){if(mapping[rf.key]===undefined){notify(rf.label+' is required','error');return}}
    let count=0,dupes=0;const eN=new Set(mode==='customers'?customers.map(c=>(c.name||'').toLowerCase().trim()):mode==='vendors'?vendors.map(v=>(v.name||'').toLowerCase().trim()):[]);
    for(const row of sheet.rows){const rec={};for(const f of defs){if(mapping[f.key]!==undefined){let val=String(row[mapping[f.key]]||'').trim();if(f.key==='discountRate')val=(parseFloat(val)||0)/(parseFloat(val)>1?100:1);else if(['qtyOrdered','listPrice','unitCost','unitPrice'].includes(f.key))val=parseFloat(val)||0;rec[f.key]=val}}
      if(!rec.name&&!rec.description)continue;const nk=(rec.name||rec.description||'').toLowerCase().trim();if(!nk)continue;
      if((mode==='customers'||mode==='vendors')&&eN.has(nk)){dupes++;continue}eN.add(nk);
      if(mode==='customers'){addCustomer({name:rec.name||'',contact:rec.contact||'',email:rec.email||'',phone:rec.phone||'',type:rec.type||'K-12 District',address:rec.address||''});count++}
      else if(mode==='vendors'){addVendor({name:rec.name||'',contact:rec.contact||'',email:rec.email||'',phone:rec.phone||'',category:rec.category||'',address:rec.address||'',discountRate:rec.discountRate||0,discountType:'percentage',discountNotes:''});count++}
      else if(mode==='lineitems'){if(targetJobId==='new'){notify('Select a job first','error');return}const vm=vendors.find(v=>v.name.toLowerCase()===(rec.manufacturer||'').toLowerCase().trim());addLineItem({id:'LI-'+Math.random().toString(36).slice(2,8),jobId:targetJobId,description:rec.description||'',vendor:vm?.id||'',manufacturer:rec.manufacturer||'',modelNumber:rec.modelNumber||'',color:rec.color||'',tag:rec.tag||'',listPrice:rec.listPrice||0,unitCost:rec.unitCost||0,unitPrice:rec.unitPrice||0,shippingPerUnit:0,installPerUnit:0,qtyOrdered:rec.qtyOrdered||1,qtyReceived:0,qtyInvoiced:0,poDate:'',deliveryDate:'',invoiceDate:''});count++}}
    setGenericDone({count,dupes,mode});notify('Imported '+count+' '+mode+(dupes>0?' ('+dupes+' dupes skipped)':''))};

  const modes=[{id:"quote",label:"Excel Quotes",icon:"receipt",desc:"Lisa's quote format",color:"#2dd4bf"},{id:"customers",label:"Customers",icon:"users",desc:"Import customer list",color:"#a78bfa"},{id:"vendors",label:"Vendors",icon:"package",desc:"Import vendor list",color:"#34d399"},{id:"lineitems",label:"Line Items",icon:"file",desc:"Import items to a job",color:"#fbbf24"}];
  const sheet=genericSheets?.[activeSheet];const defs=FIELD_DEFS[mode]||[];

  return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{marginBottom:24}}><h2 style={{fontSize:24,fontWeight:700,color:"#f0f0f0",marginBottom:4,letterSpacing:-0.5}}>Data Import</h2><p style={{fontSize:13,color:"#737373"}}>Upload and map any spreadsheet -- quotes, customers, vendors, or line items</p></div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:28}}>
      {modes.map(m=><div key={m.id} onClick={()=>{setMode(m.id);reset()}} className="hover-lift" style={{padding:"16px 18px",background:mode===m.id?m.color+'08':"#111111",border:"1px solid "+(mode===m.id?m.color+'30':"rgba(255,255,255,0.06)"),borderRadius:12,cursor:"pointer",transition:"all 0.2s"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><div style={{width:28,height:28,borderRadius:8,background:m.color+'15',display:"flex",alignItems:"center",justifyContent:"center",color:m.color}}><I n={m.icon} s={15}/></div><span style={{fontSize:13,fontWeight:600,color:mode===m.id?"#f0f0f0":"#a3a3a3"}}>{m.label}</span></div>
        <div style={{fontSize:11,color:"#525252"}}>{m.desc}</div>
      </div>)}
    </div>

    {/* QUOTE MODE */}
    {mode==="quote"&&!parsed&&!importDone&&<DropZone onFile={handleQuoteFile} icon="receipt" title="Drop Excel quote or click to browse" subtitle="Supports Lisa's standard format"/>}
    {mode==="quote"&&parsed&&!importDone&&<Card style={{marginBottom:16,border:"1px solid rgba(45,212,191,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div><div style={{fontSize:15,fontWeight:700,color:"#e5e5e5"}}>{parsed.allItems.length} items across {parsed.sheets.length} sheet{parsed.sheets.length>1?"s":""}</div><div style={{fontSize:12,color:"#525252"}}>{fileName}</div></div><Btn v="secondary" style={{fontSize:12}} onClick={reset}>Clear</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={jobName} onChange={e=>setJobName(e.target.value)} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Add to</label><select value={jobId} onChange={e=>setJobId(e.target.value)} style={inputStyle}><option value="new">Create New Job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select></div></div>
      {parsed.sheets.length>1&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Sheets:</div>{parsed.sheets.map(s=><label key={s.name} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",cursor:"pointer"}}><input type="checkbox" checked={selectedSheets[s.name]||false} onChange={e=>setSelectedSheets({...selectedSheets,[s.name]:e.target.checked})} style={{accentColor:"#2dd4bf"}}/><span style={{fontSize:13,color:"#d4d4d4"}}>{s.name}</span><span style={{fontSize:12,color:"#525252"}}>({s.itemCount})</span></label>)}</div>}
      {parsed.skipped.length>0&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:8}}><div style={{fontSize:12,fontWeight:600,color:"#fbbf24",marginBottom:4}}>Filtered {parsed.skipped.length} junk rows</div><div style={{fontSize:11,color:"#a3a3a3"}}>{parsed.skipped.slice(0,6).join(", ")}{parsed.skipped.length>6?" +"+(parsed.skipped.length-6)+" more":""}</div></div>}
      <div style={{fontSize:12,color:"#a3a3a3",marginBottom:12}}>{parsed.vendors.size} vendors: {[...parsed.vendors].join(', ')}</div>
      <div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#0a0a0a"}}>{["Tag","Manuf","Description","Qty","List","Net","Price"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:h==="Qty"||h==="List"||h==="Net"||h==="Price"?"right":"left",color:"#737373",fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
          <tbody>{parsed.allItems.filter(i=>selectedSheets[i.sheet]).slice(0,20).map((item,i)=><tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}><td style={{padding:"6px 10px",color:"#a3a3a3"}}>{item.tag}</td><td style={{padding:"6px 10px",color:"#a78bfa"}}>{item.manufacturer}</td><td style={{padding:"6px 10px",color:"#d4d4d4",maxWidth:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.description}</td><td style={{padding:"6px 10px",textAlign:"right"}}>{item.qtyOrdered}</td><td style={{padding:"6px 10px",color:"#525252",textAlign:"right"}}>{item.listPrice?fmt(item.listPrice):''}</td><td style={{padding:"6px 10px",color:"#a3a3a3",textAlign:"right"}}>{fmt(item.unitCost)}</td><td style={{padding:"6px 10px",color:"#2dd4bf",textAlign:"right",fontWeight:600}}>{item.unitPrice?fmt(item.unitPrice):''}</td></tr>)}</tbody></table>
        {parsed.allItems.filter(i=>selectedSheets[i.sheet]).length>20&&<div style={{padding:8,textAlign:"center",fontSize:12,color:"#525252"}}>+{parsed.allItems.filter(i=>selectedSheets[i.sheet]).length-20} more</div>}
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Btn onClick={handleQuoteImport} disabled={importing}>{importing?"Importing...":"Import "+parsed.allItems.filter(i=>selectedSheets[i.sheet]).length+" Items"}</Btn><Btn v="secondary" onClick={reset}>Cancel</Btn></div>
    </Card>}

    {/* GENERIC MODE */}
    {mode!=="quote"&&!genericSheets&&!genericDone&&<DropZone onFile={handleGenericFile} icon={modes.find(m=>m.id===mode)?.icon} title={"Drop "+mode+" spreadsheet or click to browse"} subtitle="Any layout -- you map the columns next"/>}
    {mode!=="quote"&&genericSheets&&!genericDone&&<Card style={{marginBottom:16,border:"1px solid "+(modes.find(m=>m.id===mode)?.color||"#2dd4bf")+"20"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div><div style={{fontSize:15,fontWeight:700,color:"#e5e5e5"}}>{sheet?.rows.length||0} rows found</div><div style={{fontSize:12,color:"#525252"}}>{fileName}</div></div><Btn v="secondary" style={{fontSize:12}} onClick={reset}>Clear</Btn></div>
      {genericSheets.length>1&&<div style={{display:"flex",gap:4,marginBottom:16,background:"#0a0a0a",padding:3,borderRadius:8,overflowX:"auto"}}>{genericSheets.map((s,i)=><button key={i} onClick={()=>{setActiveSheet(i);setMapping(autoMap(s.headers,defs))}} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:activeSheet===i?"#2dd4bf":"transparent",color:activeSheet===i?"#000":"#525252",fontSize:12,fontFamily:"inherit",fontWeight:activeSheet===i?600:400,whiteSpace:"nowrap"}}>{s.name} ({s.rows.length})</button>)}</div>}
      {mode==="lineitems"&&<div style={{marginBottom:16}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Import into Job</label><select value={targetJobId} onChange={e=>setTargetJobId(e.target.value)} style={{...inputStyle,maxWidth:400}}><option value="new" disabled>-- Select a job --</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select></div>}
      {sheet&&<ColumnMapper headers={sheet.headers} fieldDefs={defs} mapping={mapping} setMapping={setMapping} sheetName={genericSheets.length>1?sheet.name:null}/>}
      {sheet&&<div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Preview (first 8 rows)</div><div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#0a0a0a"}}>{defs.filter(f=>mapping[f.key]!==undefined).map(f=><th key={f.key} style={{padding:"8px 10px",textAlign:"left",color:"#737373",fontWeight:600,fontSize:11}}>{f.label}</th>)}</tr></thead><tbody>{sheet.rows.slice(0,8).map((row,ri)=><tr key={ri} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{defs.filter(f=>mapping[f.key]!==undefined).map(f=><td key={f.key} style={{padding:"6px 10px",color:"#d4d4d4",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(row[mapping[f.key]]||'').substring(0,50)}</td>)}</tr>)}</tbody></table></div></div>}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><Btn onClick={handleGenericImport} disabled={!Object.keys(mapping).length}>Import {sheet?.rows.length||0} {mode}</Btn><Btn v="secondary" onClick={reset}>Cancel</Btn></div>
    </Card>}

    {/* SUCCESS */}
    {(importDone||genericDone)&&<Card style={{border:"1px solid rgba(52,211,153,0.2)",background:"linear-gradient(135deg,rgba(52,211,153,0.03),transparent)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><div style={{width:40,height:40,borderRadius:12,background:"rgba(52,211,153,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#34d399"}}><I n="check" s={20}/></div><div><div style={{fontSize:16,fontWeight:700,color:"#34d399"}}>Import Complete</div>{importDone&&<div style={{fontSize:13,color:"#a3a3a3"}}>{importDone.items} line items into "{importDone.jobName}"{importDone.vendors>0?" + "+importDone.vendors+" new vendors":""}</div>}{genericDone&&<div style={{fontSize:13,color:"#a3a3a3"}}>{genericDone.count} {genericDone.mode} imported{genericDone.dupes>0?" ("+genericDone.dupes+" dupes skipped)":""}</div>}</div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn onClick={reset}>Import More</Btn>{importDone&&<Btn v="ghost" onClick={()=>{setSelectedJob?.(importDone.jobId);setPage?.("jobs")}}>View Job</Btn>}{genericDone&&(genericDone.mode==="customers"||genericDone.mode==="vendors")&&<Btn v="ghost" onClick={()=>setPage?.("directory")}>View Directory</Btn>}</div>
    </Card>}
  </div>;
}
