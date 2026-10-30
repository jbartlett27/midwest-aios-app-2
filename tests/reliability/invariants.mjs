import fs from 'node:fs';import {parse} from '@babel/parser';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root='../..';const baseline='daa7defe26115151d57c02e6d83ee93e767821cc';
function walk(n,fn){if(!n||typeof n!=='object')return;fn(n);for(const [k,v]of Object.entries(n)){if(['loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn)}}
function named(source,name){const ast=parse(source,{sourceType:'module',plugins:['jsx']});let found;walk(ast,n=>{if(n.type==='FunctionDeclaration'&&n.id.name===name)found=source.slice(n.start,n.end);if(n.type==='VariableDeclarator'&&n.id.name===name)found=source.slice(n.start,n.end)});assert.ok(found,name+' exists');return found;}
let files=fs.readdirSync(root+'/src').filter(f=>/\.(jsx|js)$/.test(f));for(const name of files){const s=fs.readFileSync(root+'/src/'+name,'utf8');parse(s,{sourceType:'module',plugins:['jsx']});assert.ok(Buffer.byteLength(s)<1000000,name+' stays below editor limit');}
for(const name of fs.readdirSync(root+'/api').filter(f=>f.endsWith('.js')))parse(fs.readFileSync(root+'/api/'+name,'utf8'),{sourceType:'module'});
const source=fs.readFileSync(root+'/src/App.jsx','utf8');const old=execFileSync('git',['show',baseline+':src/App.jsx'],{cwd:root,encoding:'utf8',maxBuffer:3000000});
for(const name of ['getJobFinancials','parseLocalDate','allocateInvoicePayments','invoiceLineTotal','nextInvoiceNum','commissionEarned','commissionEarnedDate','planPlaidImport','MW_LOGO'])assert.equal(named(source,name),named(old,name),name+' invariant unchanged');
const db=fs.readFileSync(root+'/src/supabase.js','utf8');const oldDb=execFileSync('git',['show',baseline+':src/supabase.js'],{cwd:root,encoding:'utf8'});
for(const name of ['fetchAll','jobToDb','jobFromDb','liToDb'])assert.equal(named(db,name),named(oldDb,name),name+' unchanged');
const ast=parse(source,{sourceType:'module',plugins:['jsx']});const defaults=ast.program.body.filter(n=>n.type==='ExportDefaultDeclaration');assert.equal(defaults.length,1);assert.equal(ast.program.body.at(-1).type,'ExportDefaultDeclaration');
let rawDates=0;for(const name of ['App.jsx','App2.jsx','App3.jsx'])walk(parse(fs.readFileSync(root+'/src/'+name,'utf8'),{sourceType:'module',plugins:['jsx']}),n=>{if(n.type==='JSXOpeningElement'&&n.name.name==='input'&&n.attributes.some(a=>a.name?.name==='type'&&a.value?.value==='date'))rawDates++});assert.equal(rawDates,0,'all literal business date fields use the validated component');
execFileSync('git',['diff','--check',baseline],{cwd:root});
console.log('PASS parse all source/API files, size limits, financial/import/ID invariants, entrypoint and diff whitespace');
