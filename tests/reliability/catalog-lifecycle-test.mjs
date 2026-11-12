import assert from 'node:assert/strict';
import fs from 'node:fs';
const mutations=[
  ["rows.length !== 1",'false'],
  ["['id','cat','content','title'].some(k => rows[0][k] !== expected[k])",'false'],
  ["['id','cat','content','title']) query", "['id','cat','title']) query"],
  ["['id','cat','content','title']) query", "['id','content','title']) query"],
  ["method:patch?'PATCH':'POST'", "method:patch?'PATCH':'PUT'"],
  ["const next = {...data};", "const next = {};"],
  ["!['title','edition'].includes(k)", 'false'],
  ["if (action === 'delete') return {cat:ARCHIVED_CATALOG_CAT};", "if (action === 'delete') return {cat:'VendorCatalog'};"],
  ["return {sop:{...rows[0]}, vendor:{...hits[0]}};", "return {sop:{...rows[0]}, vendor:{...hits[0]}};"],
  ["(d && (d.getFullYear() !== y || d.getMonth() !== m-1 || d.getDate() !== day))", 'false'],
  ["if (!r.ok)", 'if (false)'],
];
let source=fs.readFileSync('../../src/catalogLifecycle.js','utf8');
const idx=process.argv.includes('--mutant') ? Number(process.argv.at(-1)) : -1;
if(idx>=0){let [from,to]=mutations[idx];if(idx===8){from="if (rows.length !== 1) return {error:";to="if (!rows.length) return {error:";}assert.ok(source.includes(from),'mutation anchor');source=source.replace(from,to);}
const {catalogData,catalogChange,selectCatalog,archivedCatalogRecords,persistCatalog}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data={vendorId:'V1',vendorName:'Acme',title:'Original',edition:'2025',url:'https://files.test/c.json',pdfUrl:'https://files.test/c.pdf',pageImgBase:'https://files.test/pages/',pdfParts:[{url:'https://files.test/p.pdf',from:1,to:2}],pageCount:2,productCount:4};
const original={id:'VCAT-1 "a,b"',cat:'VendorCatalog',title:data.title,icon:'book',custom:true,content:JSON.stringify(data)};
const other={...original,id:'VCAT-2',content:JSON.stringify({...data,vendorId:'V2'})};
const vendors=[{id:'V1',name:'Acme'},{id:'V2',name:'Acme West'}];
const before=JSON.stringify(original);let calls=[];
const response=(rows,ok=true)=>({ok,json:async()=>rows});
async function run(sop=original,action='delete',updates,fetchImpl=async(u,o)=>{calls.push({u,o});return response([{...sop,...catalogChange(sop,action,updates)}]);}){return persistCatalog({sop,action,updates,fetchImpl,baseUrl:'https://db.test',headers:{'Content-Type':'application/json'}});}
const archived={...original,cat:'VendorCatalogDeleted'};
for(const [sop,action,updates] of [[original,'delete'],[archived,'restore'],[original,'edit',{title:'Renamed',edition:''}],[original,'insert']]){
  calls=[];
  const result=await run(sop,action,updates,async(u,o)=>{calls.push({u,o});return response([{...sop,...(action==='insert'?{}:catalogChange(sop,action,updates))}]);});
  assert.equal(result.ok,true);assert.equal(calls.length,1);
  const {u,o}=calls[0];assert.equal(o.method,action==='insert'?'POST':'PATCH');assert.equal(o.headers.Prefer,'return=representation');
  assert.equal(o.headers['Content-Type'],'application/json');
  if(action==='insert'){assert.equal(new URL(u).search,'','no upsert/conflict overwrite');assert.deepEqual(JSON.parse(o.body),sop);}
  else {for(const key of ['id','cat','content','title'])assert.equal(new URL(u).searchParams.get(key),'eq.'+sop[key]);assert.deepEqual(JSON.parse(o.body),catalogChange(sop,action,updates));}
}
assert.deepEqual(catalogChange(original,'delete'),{cat:'VendorCatalogDeleted'});
assert.deepEqual(catalogChange(archived,'restore'),{cat:'VendorCatalog'});
const edit=catalogChange(original,'edit',{title:' New title ',edition:'2024-02-29'});
assert.equal(edit.title,'New title');assert.deepEqual(JSON.parse(edit.content),{...data,title:'New title',edition:'2024-02-29'});
assert.equal(JSON.stringify(original),before);
for(const updates of [null,[],{}, {url:'https://bad.test'}, {vendorId:'V2'}, {products:[]}, {title:''},{title:2},{title:'x'.repeat(161)},{edition:'2025-02-29'},{edition:'2026-13-01'},{edition:'2026-04-31'},{edition:'0001'},{edition:2026}])assert.throws(()=>catalogChange(original,'edit',updates));
for(const sop of [null,{...original,cat:'Notes'},{...original,content:'null'},{...original,content:'[]'},{...original,content:'broken'},{...original,content:'{}'}]){calls=[];assert.equal((await run(sop)).ok,false);assert.equal(calls.length,0);}
for(const rows of [[],[archived,archived],[null],{},[{...archived,id:'wrong'}],[original],[{...archived,content:'{}'}],[{...archived,title:'wrong'}]])assert.equal((await run(original,'delete',undefined,async()=>response(rows))).ok,false);
assert.equal((await run(original,'delete',undefined,async()=>response([archived],false))).ok,false);
assert.equal((await run(original,'delete',undefined,async()=>{throw Error('offline');})).ok,false);
assert.equal((await run(original,'delete',undefined,async()=>({ok:true,json:async()=>{throw Error('invalid');}}))).ok,false);
// Persisted store applies the exact outgoing filters. A stale row cannot be deleted or edited.
let store=[structuredClone(original),structuredClone(other)];
const fake=async(u,o)=>{const p=new URL(u).searchParams;const matches=store.filter(s=>['id','cat','content','title'].every(k=>p.get(k)==='eq.'+s[k]));for(const s of matches)Object.assign(s,JSON.parse(o.body));return response(matches);};
assert.equal((await run(original,'edit',{title:'Edited'},fake)).ok,true);
assert.equal((await run(original,'delete',undefined,fake)).ok,false,'stale snapshot fails');
assert.equal((await run(store[0],'delete',undefined,fake)).ok,true);
assert.equal((await run(original,'delete',undefined,fake)).ok,false,'repeat deletion is not false success');
assert.deepEqual(store[1],other,'other vendor unchanged');assert.equal(JSON.parse(store[0].content).pdfUrl,data.pdfUrl);
assert.deepEqual(archivedCatalogRecords([...store,null,{...archived,content:'[]'}],'V1').map(s=>s.id),[original.id]);
assert.equal(catalogData({content:'null'}),null);
assert.equal(selectCatalog([original,other],vendors,{vendor:'Acme',catalog_id:original.id}).sop.id,original.id);
for(const [rows,input] of [[[original,other],{vendor:'Ac'}],[[original,original],{vendor:'Acme'}],[[other],{vendor:'Acme',catalog_id:other.id}],[[archived],{vendor:'Acme',catalog_id:original.id}],[[original],{vendor:'Acme',catalog_id:'Notes'}],[[original],{}]])assert.ok(selectCatalog(rows,vendors,input).error);
const spoof={...original,content:JSON.stringify({...data,id:'evil'})};assert.equal(selectCatalog([spoof],vendors,{vendor:'Acme',catalog_id:original.id}).sop.id,original.id);
// The shipped shell waits for persistence before local state and bypasses generic delete/save.
const app=fs.readFileSync('../../src/App.jsx','utf8');
const start=app.indexOf('  const changeVendorCatalog = async');const end=app.indexOf('  // Line-item ship-to override',start);
assert.ok(start>=0&&end>start);
let shellSource=app.slice(start,end)+';return {changeVendorCatalog,addSop};';
const shell=new Function('db','setCustomSops',shellSource);
let rows=[original,other],release;
const db={changeVendorCatalog:async()=>new Promise(r=>release=r),deleteSop(){throw Error('generic delete forbidden');},saveSop(){throw Error('generic upsert forbidden');}};
const helpers=shell(db,f=>{rows=f(rows);});
const pending=helpers.changeVendorCatalog(original,'delete');assert.deepEqual(rows,[original,other]);
release({ok:false,error:'Denied'});await assert.rejects(pending,/Denied/);assert.deepEqual(rows,[original,other]);
const next=helpers.changeVendorCatalog(original,'delete');release({ok:true,row:archived});await next;assert.deepEqual(rows,[archived,other]);
const inserted={...original,id:'VCAT-new'};const upload=helpers.addSop(inserted);assert.ok(upload instanceof Promise);assert.equal(rows.length,2);release({ok:true,row:inserted});await upload;assert.equal(rows.length,3);assert.deepEqual(rows[1],other);
console.log('PASS catalogue lifecycle: exact CAS, insert-only, stale/repeated writes, metadata retention, strict edit validation, selection, shell await/failure/local isolation');
