import {JSDOM} from 'jsdom';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import fs from 'node:fs';
// Partial vendor invoices on one PO (Doane Keyes, JOB-2026-963, Nov 17 2026). Made-up records shaped like
// the real ones: 20 chairs at $171.20 plus $125 freight, vendor invoice 774758 for 19 chairs and freight,
// a standalone bill 774970 for the last chair. Runs the real DocumentsPage from the bundle build-harness.mjs makes,
// and the real helper in src/poBill.js.
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:f=>setTimeout(()=>f(performance.now()+1000),0),cancelAnimationFrame:clearTimeout});
window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});globalThis.matchMedia=window.matchMedia;
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
globalThis.fetch=async()=>{throw new Error('unexpected network call')};
globalThis.__db=new Proxy({fetchPeriodLocks:async()=>[]},{get:(o,k)=>o[k]||(async()=>({ok:true}))});
const origErr=console.error;console.error=()=>{};
import {build} from 'esbuild';
const mutantIdx=process.argv.includes('--mutant')?Number(process.argv[process.argv.indexOf('--mutant')+1]):-1;
const MUTANTS=[
  ['the Vendor Bills list uses the vendor invoice amount','App.jsx','const cost=_billAmt.cost;','const cost=_billAmt.received;'],
  ['the helper prefers the vendor invoice amount','poBill.js','cost: invoiced === null ? received : invoiced','cost: received'],
  ['the detail box saves the amount','App.jsx','setDocStatus(bill.billDocNum,{...existing,invoicedAmount:amt});','void 0;'],
  ['clearing the box removes the amount','App.jsx','const next={...existing};delete next.invoicedAmount;','const next={...existing};'],
  ['the detail box refuses an unreadable amount','App.jsx',"if(!/^\\d+(\\.\\d{1,2})?$/.test(raw)){notify(","if(false){notify("],
  ['the helper ignores an unreadable amount','poBill.js',"if (!/^\\d+(\\.\\d{1,2})?$/.test(text)) return null;",''],
  ['Financials accounts payable uses the vendor invoice amount','App3.jsx',"const cost=poBillAmount(g.items,","const cost=((x)=>({cost:x.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyReceived)||0),0)}))(g.items,"],
  ['the Brain bill list uses the vendor invoice amount','App2.jsx',"const cost = poBillAmount(vItems,","const cost = ((x)=>({cost:x.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyReceived)||0),0)}))(vItems,"],
];
const srcDir='../../src';
const readSrc=(f)=>{const t=fs.readFileSync(srcDir+'/'+f,'utf8');if(mutantIdx<0||MUTANTS[mutantIdx][1]!==f)return t;assert.ok(t.includes(MUTANTS[mutantIdx][2]),'mutation anchor missing: '+MUTANTS[mutantIdx][0]);return t.replace(MUTANTS[mutantIdx][2],MUTANTS[mutantIdx][3]);};
// every place that prices a PO bill goes through the one helper
for(const f of ['App.jsx','App2.jsx','App3.jsx']){const t=readSrc(f);assert.doesNotMatch(t,/unitCost\|\|0\)\s*\*\s*\(Number\(i\.qtyReceived\)\|\|0\)/,f+' prices PO bills only through poBillAmount');assert.match(t,/import \{ poBillAmount \} from '\.\/poBill\.js';/,f+' uses the shared helper');}
const chartNames=[...new Set(['App.jsx','App2.jsx','App3.jsx'].flatMap(f=>[...fs.readFileSync(srcDir+'/'+f,'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*["']recharts["']/g)].flatMap(m=>m[1].split(',').map(n=>n.trim().split(/\s+as\s+/)[0]))))];
const stubs={clerk:'export const ClerkProvider=({children})=>children;export const useUser=()=>({isLoaded:true,isSignedIn:false,user:null});export const useClerk=()=>({signOut:()=>{}});export const useAuth=()=>({getToken:async()=>null});export const SignIn=()=>null;export const UserButton=()=>null;',recharts:chartNames.map(n=>'export const '+n+'=()=>null;').join('\n'),xlsx:'export const read=()=>({});export const utils={};export default {read,utils};',db:'export const db=globalThis.__db;'};
await build({entryPoints:[srcDir+'/App.jsx'],bundle:true,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom','react-dom/client'],define:{'import.meta.env':'{}'},outfile:'po-bill-bundle.cjs',logLevel:'silent',plugins:[{name:'offline-only',setup(b){b.onLoad({filter:/(App\.jsx|App2\.jsx|App3\.jsx|poBill\.js)$/},a=>({contents:readSrc(a.path.split('/').pop()),loader:a.path.endsWith('.js')?'js':'jsx',resolveDir:srcDir}));b.onResolve({filter:/^(?:@clerk\/clerk-react|recharts|xlsx)$/},a=>({path:a.path,namespace:'stub'}));b.onResolve({filter:/supabase\.js$/},()=>({path:'db',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path==='@clerk/clerk-react'?'clerk':a.path],loader:'js'}));}}]});
const require=createRequire(import.meta.url);const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {DocumentsPage}=require('./po-bill-bundle.cjs');

// ---- the helper itself ----
const helperSrc=readSrc('poBill.js').replace(/export function/g,'function');
const {poBillAmount,invoicedAmountOf}=new Function(helperSrc+';return {poBillAmount,invoicedAmountOf};')();
const lines=(recv)=>[{unitCost:171.2,qtyReceived:recv},{unitCost:125,qtyReceived:1}];
assert.deepEqual(poBillAmount(lines(19),{}),{cost:3377.8,received:3377.8,invoiced:null},'with no vendor amount a bill follows what was received');
assert.deepEqual(poBillAmount(lines(20),{}),{cost:3549,received:3549,invoiced:null},'and climbs as the rest arrives');
assert.deepEqual(poBillAmount(lines(20),{invoicedAmount:3377.8}),{cost:3377.8,received:3549,invoiced:3377.8},'the vendor invoice amount holds the bill where the vendor billed it');
assert.equal(poBillAmount(lines(20),{invoicedAmount:'3,377.80'}).cost,3377.8,'a typed amount with commas reads the same');
assert.equal(poBillAmount(lines(20),{invoicedAmount:0}).cost,0,'zero is a real amount (a no-charge invoice)');
for(const bad of ['', 'abc', '-5', '12.345', null, undefined, NaN, {}]) assert.equal(invoicedAmountOf({invoicedAmount:bad}),null,'a blank or unreadable amount is ignored: '+String(bad));
assert.equal(poBillAmount(null,null).cost,0);

// ---- the Vendor Bills tab ----
const job={id:'JOB-2026-963',name:'Woodfield ES - Chairs',customer:'C-1778617588770',salesRep:'S1',createdDate:'2026-10-13',terms:'Net 30',phase:'Invoiced',paymentStatus:'unpaid',docStatuses:{}};
const vendor={id:'V-ef3i8suki',name:'Doane Keyes Associates'};
const PO='PO-6963-SUKI',BILL='BILL-6963-SUKI';
const items=[{id:'L1',jobId:job.id,vendor:vendor.id,description:'Box Arm Accent Chair',qtyOrdered:20,qtyReceived:20,qtyInvoiced:0,unitPrice:250,unitCost:171.2,deliveryDate:'2026-10-26'},{id:'L2',jobId:job.id,vendor:vendor.id,description:'Freight',qtyOrdered:1,qtyReceived:1,qtyInvoiced:0,unitPrice:150,unitCost:125}];
const standalone={id:'SB-1',cat:'StandaloneBill',title:'774970',content:JSON.stringify({vendorId:vendor.id,vendorName:vendor.name,jobId:job.id,jobName:job.name,amount:171.2,creditDate:'2026-10-26',refNumber:'774970',memo:'Backordered chair',paid:false})};
async function mount(billData, cachedBill){
  const statuses={[PO]:'approved',[BILL]:billData,[BILL+'__date']:'2026-10-19',[BILL+'__due']:'2026-11-18'};
  const saved=[];
  const props={jobs:[job],lineItems:items,vendors:[vendor],customers:[{id:job.customer,name:'Waterford'}],reps:[{id:'S1',name:'Rep'}],getJobItems:id=>items.filter(i=>i.jobId===id),getJobFinancials:()=>({totalRevenue:5150,totalCost:3549,margin:31,totalOrdered:21,totalReceived:21}),_commissionFor:()=>0,setJobs:()=>{},setPage:()=>{},updateJob:()=>{},updateLineItem:()=>{},notify:()=>{},triggerPrint:()=>{},customSops:[{id:'DOC_STATUSES_GLOBAL',cat:'DocStatuses',content:JSON.stringify(statuses)},standalone],addSop:r=>saved.push(r),deleteSop:()=>{},lineItemShipTos:{},setLineItemShipTo:()=>{},confirm:async()=>false};
  document.body.innerHTML='<div id="root"></div>';localStorage.clear();
  if(cachedBill)localStorage.setItem('mw_doc_statuses_fallback',JSON.stringify({[BILL]:cachedBill}));
  function Fixture(){
    const [rows,setRows]=React.useState(props.customSops);
    const addSop=(record,changes)=>{
      saved.push(record);
      assert.ok(changes, 'write carries only the edited document keys');
      setRows(prev=>[record,...prev.filter(row=>row.id!==record.id)]);
      return {ok:true};
    };
    return React.createElement(DocumentsPage,{...props,customSops:rows,addSop});
  }
  const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Fixture)));
  const tab=[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Vendor Bills'));assert.ok(tab,'Vendor Bills tab');await act(async()=>tab.click());
  return {root,saved};
}
const text=()=>document.body.textContent;
const billRow=()=>[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('774758'));

// Before: with all 20 chairs received, the PO bill climbs to $3,549.00 while 774970 also bills the last chair.
let m=await mount({vendorInvNum:'774758',status:'unpaid'});
assert.ok(billRow(),'the PO bill is listed with its vendor invoice number');
assert.match(billRow().textContent,/\$3,549\.00/,'with no vendor amount the bill follows all 20 received chairs (the double count Lisa hit)');
await act(async()=>m.root.unmount());

// With the vendor invoice amount entered, the PO bill stays at $3,377.80 and the open total is the two vendor invoices.
m=await mount({vendorInvNum:'774758',status:'unpaid',invoicedAmount:3377.8});
assert.match(billRow().textContent,/\$3,377\.80/,'the bill stays at the amount on vendor invoice 774758 after the last chair is received');
assert.doesNotMatch(billRow().textContent,/\$3,549\.00/);
assert.match(text(),/\$3,549\.00/,'the two vendor invoices together owe $3,549.00 (3,377.80 + 171.20)');

// A browser that last saw an open bill must show the saved partial payment.
await act(async()=>m.root.unmount());
const staleMount=await mount({
  vendorInvNum:'774758',status:'partial',payments:[{date:'2026-11-11',amount:3377.8,checkNum:'9516',method:'check'}],
},{vendorInvNum:'774758',status:'unpaid',payments:[]});
await act(async()=>[...billRow().querySelectorAll('td')].find(td=>td.textContent.includes(PO)).click());
assert.match(text(),/check #9516/,'the shared payment trail wins over the old browser snapshot');
assert.match(text(),/PARTIAL/);
assert.match(text(),/\$171\.20/);
await act(async()=>staleMount.root.unmount());
m=await mount({vendorInvNum:'774758',status:'unpaid',invoicedAmount:3377.8});

// The bill detail lets the office set and clear the amount.
await act(async()=>[...billRow().querySelectorAll('td')].find(td=>td.textContent.includes('PO-6963-SUKI')).click());
assert.match(text(),/Amount on Vendor Invoice/,'the bill detail has the vendor invoice amount box');
assert.match(text(),/Received so far on this PO: \$3,549\.00/,'and shows what has been received so far');
const box=[...document.querySelectorAll('input')].find(i=>/Blank = what has been received/.test(i.placeholder||''));assert.ok(box);assert.equal(box.value,'3377.80');
const setVal=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
const lastStatuses=()=>{const r=[...m.saved].reverse().find(x=>x.id==='DOC_STATUSES_GLOBAL');return r?JSON.parse(r.content):null};
await act(async()=>{box.focus();setVal.call(box,'');box.dispatchEvent(new window.Event('input',{bubbles:true}));box.dispatchEvent(new window.FocusEvent('blur'));box.dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));});
let st=lastStatuses();assert.ok(st,'clearing the box saves');assert.equal(st[BILL].invoicedAmount,undefined,'a cleared box removes the amount');assert.equal(st[BILL].vendorInvNum,'774758','and keeps the rest of the bill');
const box2=[...document.querySelectorAll('input')].find(i=>/Blank = what has been received/.test(i.placeholder||''));
await act(async()=>{box2.focus();setVal.call(box2,'$3,377.80');box2.dispatchEvent(new window.Event('input',{bubbles:true}));box2.dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));});
st=lastStatuses();assert.equal(st[BILL].invoicedAmount,3377.8,'a typed amount is saved on the bill');assert.equal(st[BILL].vendorInvNum,'774758');
const n=m.saved.length;const box3=[...document.querySelectorAll('input')].find(i=>/Blank = what has been received/.test(i.placeholder||''));
await act(async()=>{box3.focus();setVal.call(box3,'12.345');box3.dispatchEvent(new window.Event('input',{bubbles:true}));box3.dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));});
assert.equal(m.saved.length,n,'an unreadable amount is refused and nothing is saved');
await act(async()=>m.root.unmount());
console.error=origErr;
fs.rmSync('po-bill-bundle.cjs',{force:true});
if(mutantIdx<0)console.log('PASS PO bill holds at the vendor invoice amount when a vendor bills shipments separately (helper, Vendor Bills list, open total, detail box)');
