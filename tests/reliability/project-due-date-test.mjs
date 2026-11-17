import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';

const source = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const jobDetail = source.slice(source.indexOf('function JobDetail('), source.indexOf('const jobQuoteRef=', source.indexOf('function JobDetail(')));
const duplicate = jobDetail.split('\n').find(line => line.includes('const duplicateJob='));
const original = { id:'JOB-2026-309', name:'Example project', dueDate:'2026-08-01', customer:'C-W67E', phase:'Invoiced', terms:'Net 30', paymentStatus:'unpaid', docStatuses:{} };
const duplicateWrites = [];
new Function('job','items','addJob','addLineItem','setSelectedJob','notify','confirmJobId', duplicate+'; duplicateJob();')(
  original, [], record=>{duplicateWrites.push(record); return record.id;}, ()=>{}, ()=>{}, ()=>{}
);
const fullJobDetail = source.slice(source.indexOf('function JobDetail('), source.indexOf('function DeliveryPage('));
const save = fullJobDetail.split('\n').find(line => line.includes('const saveJob='));
const jobWrites = [];
const submit = (editJob, openedDueDate) => new Function('job','editJob','editJobInitialDueDate','updateJob','setEditing','notify',
  save+'; saveJob();')(original,editJob,{current:openedDueDate},(id,patch)=>jobWrites.push(patch),()=>{},()=>{});

const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:f=>setTimeout(()=>f(performance.now()+1000),0),cancelAnimationFrame:clearTimeout});
window.matchMedia = ()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.__db = new Proxy({fetchPeriodLocks:async()=>[]},{get:(o,k)=>o[k]||(async()=>({ok:true}))});
globalThis.fetch = async()=>{throw new Error('Unexpected network call');};
const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { DocumentsPage } = require('./app-bundle.cjs');
const base='INV-6309-W67E';
const items = [{id:'I1',jobId:original.id,vendor:'V001',description:'Table',qtyOrdered:1,qtyReceived:1,qtyInvoiced:1,unitPrice:100,unitCost:50}];
const writes = [];
const props = {jobs:[original],lineItems:items,vendors:[{id:'V001',name:'Vendor'}],customers:[{id:original.customer,name:'Customer'}],reps:[],getJobItems:()=>items,getJobFinancials:()=>({totalRevenue:100,totalCost:50,margin:50,totalOrdered:1,totalReceived:1}),setJobs:()=>{},setPage:()=>{},updateJob:(...args)=>writes.push(args),updateLineItem:()=>{},notify:()=>{},triggerPrint:()=>{},addSop:r=>writes.push(r),deleteSop:()=>{},lineItemShipTos:{},setLineItemShipTo:()=>{}};
const sop=(dateValues)=>({id:'DOC_STATUSES_GLOBAL',cat:'DocStatuses',content:JSON.stringify(dateValues)});
const invoice=(id,invoiceNum,dates)=>({id,cat:'Invoice',content:JSON.stringify({jobId:original.id,invoiceNum,...dates,total:75})});
async function payRows(customSops, jobItems=items){
  const app=createRoot(document.getElementById('root'));
  try {
    await act(async()=>app.render(React.createElement(DocumentsPage,{...props,customSops,lineItems:jobItems,getJobItems:()=>jobItems})));
    const tab=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('Payments'));
    assert.ok(tab);
    await act(async()=>tab.click());
    const select=[...document.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value===original.id));
    assert.ok(select);
    await act(async()=>{select.value=original.id;select.dispatchEvent(new window.Event('change',{bubbles:true}));});
    const table=[...document.querySelectorAll('table')].find(t=>t.textContent.includes('Original Amount'));
    assert.ok(table);
    return [...table.tBodies[0].rows].map(row=>[row.cells[1].textContent,row.cells[2].textContent,row.cells[3].textContent]);
  } finally { await act(async()=>app.unmount()); }
}

const results = [];
async function check(label,fn){try{await fn();console.log('PASS '+label);}catch(e){console.error('FAIL '+label+': '+e.message);results.push(label);}}
await check('duplicating clears only the copied project due date',()=>{
  assert.equal(duplicateWrites[0].dueDate,'');
  assert.equal(original.dueDate,'2026-08-01');
  assert.equal(duplicateWrites[0].terms,'Net 30');
});
await check('save omits the untouched project due date; explicit edit or clear survives',()=>{
  submit({...original,name:'Edited name'},'2026-08-01'); submit({...original,dueDate:'2026-11-25'},'2026-08-01'); submit({...original,dueDate:''},'2026-08-01');
  assert.equal(jobWrites[0].name,'Edited name'); assert.equal(Object.hasOwn(jobWrites[0],'dueDate'),false);
  assert.equal(jobWrites[1].dueDate,'2026-11-25'); assert.equal(jobWrites[2].dueDate,'');
});
await check('Edit Job Record explains the optional scheduling field',()=>{
  assert.ok(fullJobDetail.includes('Project Due Date (optional)'));assert.ok(fullJobDetail.includes('Leave blank unless this project has a scheduling deadline. Invoice due dates are separate.'));
});
await check('legacy payment display does not borrow a project date or fabricate an invoice date', async()=>{
  assert.deepEqual(await payRows([]),[['Invoice '+base+' - '+original.name,'Not set','$100.00']]);
});
await check('legacy payment display uses invoice date evidence and rejects malformed saved dates', async()=>{
  assert.equal((await payRows([sop({[base+'__date']:'2026-10-01',[base+'__due']:'0002-08-19'})]))[0][1],'2026-10-31');
  assert.equal((await payRows([sop({[base+'__due']:'2026-11-15'})]))[0][1],'2026-11-15');
  assert.equal((await payRows([],[{...items[0],invoiceDate:'2026-10-01'},{...items[0],id:'I2',invoiceDate:'2026-10-05'}]))[0][1],'Not set');
});
await check('issued invoices keep independent validated dates and amounts',async()=>{
  const rows = await payRows([
    invoice('R1',base,{date:'2026-09-01',dueDate:'2026-10-01'}),
    invoice('R2',base+'-2',{date:'2026-10-10',dueDate:'0002-08-19'}),
    invoice('R3',base+'-3',{}),
    sop({[base+'__due']:'2026-10-03'}),
  ]);
  const byDescription = Object.fromEntries(rows.map(row=>[row[0].split(' - ')[0],row.slice(1)]));
  assert.deepEqual(byDescription['Invoice #'+base],['2026-10-03','$75.00']);
  assert.deepEqual(byDescription['Invoice #'+base+'-2'],['2026-11-09','$75.00']);
  assert.deepEqual(byDescription['Invoice #'+base+'-3'],['Not set','$75.00']);
  assert.deepEqual(writes,[]);
});
dom.window.close();
assert.deepEqual(results,[]);
