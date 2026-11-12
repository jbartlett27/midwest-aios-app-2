import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const mutations=[
  ["if (_bkRole !== 'admin' && _bkRole !== 'office')",'if (false)'],
  ["if (!current || ['cat','content','title'].some(k=>current[k]!==catalogProposal.sop[k]))",'if (false)'],
  ["await changeVendorCatalog(catalogProposal.sop,action,input.updates)","changeVendorCatalog(catalogProposal.sop,action,input.updates)"],
  ["if(brainCatalogExecuting.current)return;",''],
  ["if (!saved || saved.id!==catalogProposal.sop.id)",'if (false)'],
  ["tb.input?.catalog_id ? selectCatalog(customSops,vendors,tb.input)","true ? selectCatalog(customSops,vendors,tb.input)"],
  ["if(a.catalogProposal){",'if(false){'],
  ["'get_catalog_product','read_catalog_page']);", "'get_catalog_product','read_catalog_page','delete_vendor_catalog']);"],
];
const idx=process.argv.includes('--mutant')?Number(process.argv.at(-1)):-1;
const src='../../src';
const charts=[...new Set(['App.jsx','App2.jsx','App3.jsx'].flatMap(f=>[...fs.readFileSync(src+'/'+f,'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*["']recharts["']/g)].flatMap(m=>m[1].split(',').map(n=>n.trim().split(/\s+as\s+/)[0]))))];
const stub={clerk:'export const ClerkProvider=({children})=>children;export const useUser=()=>({isLoaded:true,isSignedIn:false,user:null});export const useClerk=()=>({signOut(){}});export const useAuth=()=>({getToken:async()=>null});export const SignIn=()=>null;export const UserButton=()=>null;',charts:charts.map(n=>'export const '+n+'=()=>null;').join('\n'),xlsx:'export const read=()=>({});export const utils={};export default {read,utils};',db:'export const db=globalThis.__db;'};
await build({entryPoints:[src+'/App2.jsx'],bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom','react-dom/client'],define:{'import.meta.env':'{}'},outfile:'catalog-brain-controls-bundle.cjs',plugins:[{name:'offline',setup(b){
  if(idx>=0)b.onLoad({filter:/App2\.jsx$/},a=>{const source=fs.readFileSync(a.path,'utf8');assert.ok(source.includes(mutations[idx][0]),'mutation anchor');return {contents:source.replace(...mutations[idx]),loader:'jsx',resolveDir:src};});
  b.onResolve({filter:/^(@clerk\/clerk-react|recharts|xlsx)$/},a=>({path:a.path,namespace:'stub'}));b.onResolve({filter:/supabase\.js$/},()=>({path:'db',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='@clerk/clerk-react'?stub.clerk:a.path==='recharts'?stub.charts:a.path==='xlsx'?stub.xlsx:stub.db,loader:'js'}));
}}]});
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:f=>setTimeout(()=>f(performance.now()+1000),0),cancelAnimationFrame:clearTimeout});
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});globalThis.matchMedia=window.matchMedia;
const require=createRequire(import.meta.url);const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');
globalThis.__db=new Proxy({fetchPeriodLocks:async()=>[]},{get:(o,k)=>o[k]||(()=>{throw Error('Unexpected db '+String(k));})});
const {BrainPage}=require('./catalog-brain-controls-bundle.cjs');
const lifecycle=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(src+'/catalogLifecycle.js','utf8')).toString('base64'));
const vendors=[{id:'V1',name:'Acme Furniture'},{id:'V2',name:'Acme West'}];
const rec=(id,vendorId='V1',title='Original Catalogue')=>({id,cat:'VendorCatalog',title,icon:'book',custom:true,content:JSON.stringify({vendorId,vendorName:vendors.find(v=>v.id===vendorId).name,title,edition:'2026',url:'https://files.test/'+id+'.json',pdfUrl:'https://files.test/'+id+'.pdf',pageCount:2,productCount:3})});
const original=rec('VCAT-1'),other=rec('VCAT-2','V2','Other Catalogue');
let store,uiRows,plan,bodies,calls,pending,mode,root,role;
const response=(rows,ok=true)=>({ok,json:async()=>rows});
globalThis.fetch=async(url,opts)=>{
  if(String(url).startsWith('https://files.test/'))return {ok:false,status:404};
  assert.equal(url,'/api/brain','all fetches mocked');bodies.push(JSON.parse(opts.body));return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>plan.shift()||{content:[{type:'text',text:'Finished.'}],stop_reason:'end_turn'}};
};
const base={jobs:[],reps:[],lineItems:[],vendors,customers:[],getJobFinancials:()=>({}),getJobItems:()=>[],_commissionFor:()=>0,_bankTxnHash:()=>'',addSop(){},deleteSop(){throw Error('generic delete forbidden');},updateJob(){},addJob(){},updateLineItem(){},addLineItem(){},deleteLineItem(){},updateRep(){},addRep(){},addCustomer(){},updateCustomer(){},addVendor(){},updateVendor(){},notify(){},setPage(){},deleteJob(){},pendingBrainFile:null,setPendingBrainFile(){},pendingBrainEmail:null,setPendingBrainEmail(){},lineItemShipTos:{},jobReportDate:()=>'',setJobs(){},forceDeleteLineItem(){},forceDeleteCustomer(){},forceDeleteVendor(){},forceDeleteRep(){},confirmJobId:async()=>true};
const change=async(sop,action,updates)=>{
  calls.push({sop:structuredClone(sop),action,updates});
  await new Promise((resolve,reject)=>pending={resolve,reject});
  if(mode==='undefined')return undefined;
  const result=await lifecycle.persistCatalog({sop,action,updates,baseUrl:'https://db.test',headers:{},fetchImpl:async(u,o)=>{
    const p=new URL(u).searchParams;const rows=store.filter(s=>['id','cat','title','content'].every(k=>p.get(k)==='eq.'+s[k]));
    for(const row of rows)Object.assign(row,JSON.parse(o.body));return response(rows);
  }});
  if(!result.ok)throw Error(result.error);
  uiRows=structuredClone(store);render();return result.row;
};
function Host(){const [h,setH]=React.useState([]),[loading,setLoading]=React.useState(false),[q,setQ]=React.useState('Change the catalogue');return React.createElement(BrainPage,{...base,customSops:uiRows,currentUser:{name:'Tester',email:'tester@example.test',role},userRole:role,brainQuery:q,setBrainQuery:setQ,brainHistory:h,setBrainHistory:setH,brainLoading:loading,setBrainLoading:setLoading,changeVendorCatalog:change});}
function render(){root.render(React.createElement(Host));}
const settle=async()=>act(async()=>{await new Promise(r=>setTimeout(r,75));});
const btn=name=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===name);
const text=()=>document.body.textContent;
async function click(name){assert.ok(btn(name),'control exists: '+name);await act(async()=>btn(name).click());}
async function mount(tool,input,{rows=[original,other],userRole='office'}={}){
  store=structuredClone(rows);uiRows=structuredClone(rows);calls=[];bodies=[];pending=null;mode='';role=userRole;plan=[{content:[{type:'tool_use',id:'tc1',name:tool,input}],stop_reason:'tool_use'}];
  root=createRoot(document.getElementById('root'));await act(async()=>render());
  const inputBox=document.querySelector('input[placeholder]:not([type=file])');assert.ok(inputBox);
  await act(async()=>inputBox.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));await settle();await settle();
}
async function unmount(){await act(async()=>root.unmount());document.body.innerHTML='<div id="root"></div>';}
const input={vendor:'Acme Furniture',catalog_id:original.id};
await mount('delete_vendor_catalog',input);
assert.equal(calls.length,0,'proposal does not write');assert.ok(btn('Confirm'));
assert.ok(text().includes(original.title)&&text().includes(vendors[0].name)&&text().includes(original.id),'confirmation names exact vendor, title and id');assert.match(text(),/files kept/);
await click('Cancel');assert.equal(calls.length,0);assert.equal(store[0].cat,'VendorCatalog');assert.equal(btn('Confirm'),undefined);await unmount();
await mount('delete_vendor_catalog',input);
await act(async()=>{btn('Confirm').click();btn('Confirm').click();btn('Confirm').click();});
assert.equal(calls.length,1,'double confirmation executes once');assert.equal(store[0].cat,'VendorCatalog','await persistence');assert.doesNotMatch(text(),/Done: Deleted catalogue/);
await act(async()=>pending.resolve());await settle();assert.equal(store[0].cat,'VendorCatalogDeleted');assert.deepEqual(store[1],other);assert.equal(store[0].content,original.content);assert.match(text(),/Done: Deleted catalogue/);assert.equal(btn('Undo'),undefined,'no unsafe generic undo offered');await unmount();
for(const userRole of ['sales','unknown']){await mount('delete_vendor_catalog',input,{userRole});await click('Confirm');await settle();assert.equal(calls.length,0);assert.match(text(),/Only the office/);await unmount();}
for(const [rows,proposal] of [[[original,other],{vendor:'Acme',catalog_id:original.id}],[[original],{vendor:'Acme Furniture'}],[[original],{...input,catalog_id:'no-match'}],[[{...original,cat:'Notes'}],input],[[original,rec('VCAT-3')],{vendor:'Acme Furniture'}]]){
  await mount('delete_vendor_catalog',proposal,{rows});await click('Confirm');await settle();assert.equal(calls.length,0);assert.match(text(),/No catalogue change|Give the exact|No active catalogue|More than one vendor/);await unmount();
}
await mount('delete_vendor_catalog',input);uiRows=[{...original,content:JSON.stringify({...JSON.parse(original.content),title:'New content'})},other];await act(async()=>render());await click('Confirm');await settle();assert.equal(calls.length,0);assert.match(text(),/changed after confirmation/);await unmount();
await mount('delete_vendor_catalog',input);store[0].content='{"vendorId":"V1","url":"https://files.test/new.json"}';await click('Confirm');await act(async()=>pending.resolve());await settle();assert.equal(store[0].cat,'VendorCatalog');assert.match(text(),/Failed:/);assert.doesNotMatch(text(),/Done: Deleted catalogue/);await unmount();
await mount('delete_vendor_catalog',input);await click('Confirm');await act(async()=>pending.reject(Error('Synthetic save failure')));await settle();assert.equal(store[0].cat,'VendorCatalog');assert.match(text(),/Synthetic save failure/);assert.doesNotMatch(text(),/Done: Deleted catalogue/);await unmount();
await mount('delete_vendor_catalog',input);mode='undefined';await click('Confirm');await act(async()=>pending.resolve());await settle();assert.match(text(),/Could not verify/);assert.doesNotMatch(text(),/Done: Deleted catalogue/);await unmount();
await mount('edit_vendor_catalog',{...input,updates:{title:'Correct Catalogue',edition:''}});assert.match(text(),/Correct Catalogue/);await click('Confirm');assert.equal(calls.length,1);await act(async()=>pending.resolve());await settle();assert.equal(store[0].title,'Correct Catalogue');assert.deepEqual(JSON.parse(store[0].content),{...JSON.parse(original.content),title:'Correct Catalogue',edition:''});assert.deepEqual(store[1],other);assert.match(text(),/Done: Updated catalogue/);await unmount();
for(const updates of [{vendorId:'V2'},{url:'https://bad.test'},{products:[]},{title:''},{edition:'2026-02-30'}]){await mount('edit_vendor_catalog',{...input,updates});await click('Confirm');await settle();assert.equal(calls.length,0);assert.match(text(),/No catalogue change/);await unmount();}
// All same-vendor catalogues and their IDs are listed, not an silently selected newest record.
const second=rec('VCAT-second');await mount('list_vendor_catalogs',{vendor:'Acme Furniture'},{rows:[original,second]});assert.ok(text().includes(original.id)&&text().includes(second.id));assert.equal(calls.length,0);assert.equal(btn('Confirm'),undefined);await unmount();
await mount('list_vendor_catalogs',{}, {rows:[original]});assert.ok(text().includes(original.id),'broken catalogue still exposes metadata ID for management');assert.equal(calls.length,0);await unmount();
await mount('list_vendor_catalogs',{vendor:'Acme Furniture'}, {rows:[original,other]});assert.ok(text().includes(original.id),'vendor-filtered broken catalogue exposes its ID');assert.equal(calls.length,0);await unmount();
console.log('PASS Brain catalogue controls: exact confirmation, Cancel, double-confirm, roles, ambiguity/no match, stale UI/database, failed/unverified save, bounded metadata edit, retained storage metadata, complete list IDs');
