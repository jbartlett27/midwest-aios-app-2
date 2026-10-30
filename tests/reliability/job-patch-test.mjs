import {build} from 'esbuild';import fs from 'node:fs';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {parse} from '@babel/parser';
const mutant=process.argv.includes('--mutant');
await build({entryPoints:['../../src/supabase.js'],bundle:true,platform:'node',format:'cjs',outfile:'db.cjs',plugins:mutant?[{name:'mutant',setup(b){b.onLoad({filter:/supabase.js$/},async a=>({contents:fs.readFileSync(a.path,'utf8').replace("Object.prototype.hasOwnProperty.call(patch,key)&&patch[key]!==undefined",'true'),loader:'js'}))}}]:[]});
const {db}=createRequire(import.meta.url)('./db.cjs');let server={id:'JOB-1',name:'Lisa changed this in another tab',notes:'old',terms:'Net 15',doc_statuses:'{"keep":true}'};let calls=[];
globalThis.fetch=async(url,opts)=>{calls.push({url,opts});assert.equal(opts.method,'PATCH','existing jobs are never upserted');const body=JSON.parse(opts.body);server={...server,...body};return {ok:true,json:async()=>[server]}};
assert.equal((await db.patchJob('JOB-1',{notes:'new note'})).ok,true);
assert.equal(server.name,'Lisa changed this in another tab','unrelated remote edit survives');assert.equal(server.terms,'Net 15');assert.equal(server.doc_statuses,'{"keep":true}');assert.deepEqual(JSON.parse(calls[0].opts.body),{notes:'new note'});
await db.patchJob('JOB/1?',{dueDate:'2026-12-01',docStatuses:{invoice:'sent'}});assert.match(calls[1].url,/JOB%2F1%3F/);assert.deepEqual(JSON.parse(calls[1].opts.body),{due_date:'2026-12-01',doc_statuses:'{"invoice":"sent"}'});
const before=calls.length;assert.equal((await db.patchJob('JOB-1',{dueDate:'0002-08-19'})).ok,false);assert.equal(calls.length,before);
globalThis.fetch=async()=>({ok:true,json:async()=>[]});assert.equal((await db.patchJob('deleted',{notes:'x'})).ok,false,'deleted jobs are not recreated');
globalThis.fetch=async()=>({ok:false,status:500});assert.equal((await db.patchJob('JOB-1',{notes:'x'})).ok,false);
globalThis.fetch=async()=>{throw new Error('offline')};assert.equal((await db.patchJob('JOB-1',{notes:'x'})).ok,false);
// Run the shell's exact updater against stale local state, including full edit-form input.
const source=fs.readFileSync('../../src/App.jsx','utf8');const ast=parse(source,{sourceType:'module',plugins:['jsx']});const close=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='jobCloseOutPatch');
const start=source.indexOf('  const updateJob = (id, u) => {');const end=source.indexOf('\n  // Ids handed',start);const code=source.slice(start,end);
let local=[{id:'JOB-1',name:'old title',notes:'old note',phase:'Quoting',auditTrail:[]}];let patch;let errors=[];
const run=new Function('setJobs','db','currentUser','notify','isoDay','_commYmd',source.slice(close.start,close.end)+'\n'+code+'\nreturn updateJob;')(
 fn=>{local=fn(local)}, {patchJob:async(id,p)=>{patch=p;return {ok:true}}},{name:'Tester'},(...x)=>errors.push(x),(y,m,d)=>`${y}-${m+1}-${d}`,s=>s);
run('JOB-1',{...local[0],notes:'my note'});assert.deepEqual(Object.keys(patch).sort(),['auditTrail','notes']);assert.equal(local[0].notes,'my note');assert.equal(patch.auditTrail[0].fields[0].field,'notes');
patch=null;run('JOB-1',{notes:'my note'});assert.equal(patch,null,'unchanged form fields never produce a save');
run('JOB-1',{phase:'Complete'});assert.ok(patch.closedDate,'completion stamping survives selective saves');
console.log('PASS exact updater and real database client with mocked concurrent edits, mapping, missing rows and failures');
