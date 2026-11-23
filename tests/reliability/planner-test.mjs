import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';import {createHmac} from 'node:crypto';
// The public Furniture Planner (/plan, api/plan.js). Made-up catalogue, prospects and model replies; no network.
const mutantIdx=process.argv.includes('--mutant')?Number(process.argv[process.argv.indexOf('--mutant')+1]):-1;
const MUTANTS=[
  ['a plan line must be in the catalogue','api/plan.js',"if (p) items.push(cleanPlanItem(it, p)); else unknown.push(","items.push(cleanPlanItem(it, p || {code:it.code,catalogId:''})); if(!p) unknown.push("],
  ['prices are scrubbed from specs','src/planCatalog.js',"const specs = pricey || PRICEY_HEADER.test(String(row.header || '')) ? '' : clip(scrubPrices(row.row), 220);","const specs = clip(row.row, 220);"],
  ['a repeated request makes no second card','api/plan.js',"if (already) return { prospectId: already.id, repeated: true, contact };",""],
  ['duplicates update the existing card','api/plan.js',"const dup = findDuplicateProspect(all, contact);","const dup = null;"],
  ['a booking webhook must be signed','api/plan.js',"if (!verifyCalendly(raw, req.headers['calendly-webhook-signature'], env.PLAN_BOOKING_SIGNING_KEY)) return res.status(401).json({ ok: false });",""],
  ['the booking assigns the rep whose calendar took it','api/plan.js',"if (repId) next.assignedRep = repId;",""],
  ['the daily limit stops the chat','api/plan.js',"if (spent >= dailyLimitCents(settings))","if (false)"],
  ['replies lose their dashes','api/plan.js',"const reply = plainDashes(","const reply = ("],
  ['product names, not fragments','src/planCatalog.js',"if (usable(row.name)) return String(row.name).trim();","return row.name;"],
  ['the model gets only catalogue tools','api/plan.js',"{ name: 'get_product',","{ name: 'get_job', description: 'x', input_schema: { type: 'object', properties: {} } },\n  { name: 'get_product',"],
];
const read=(f)=>{const t=fs.readFileSync('../../'+f,'utf8');if(mutantIdx<0||MUTANTS[mutantIdx][1]!==f)return t;assert.ok(t.includes(MUTANTS[mutantIdx][2]),'mutation anchor missing: '+MUTANTS[mutantIdx][0]);return t.replace(MUTANTS[mutantIdx][2],MUTANTS[mutantIdx][3]);};
const plugin={name:'mut',setup(b){b.onLoad({filter:/(planCatalog|prospectKeys)\.js$/},(a)=>({contents:read(a.path.slice(a.path.indexOf('src/'))),loader:'js'}));}};
const r=await build({stdin:{contents:read('api/plan.js'),resolveDir:'../../api',sourcefile:'plan.js',loader:'js'},bundle:true,write:false,format:'esm',platform:'node',plugins:[plugin]});
fs.writeFileSync('./.plan-bundle.mjs',r.outputFiles[0].text);const P=await import('./.plan-bundle.mjs?'+Date.now());fs.rmSync('./.plan-bundle.mjs');

// ---- a made-up catalogue (one with prices in its rows) ----
const CAT={v:1,headers:['Model | Description | Size | List'],sections:[{id:1,title:'Student Desks',group:'Desks'},{id:2,title:'Chairs',group:'Seating'}],
  pages:[{n:4,sec:1,title:'Flex Desk Series',text:'Flex desk adjustable height student desk list $412.00'},{n:9,sec:2,title:'Stack Chair',text:'Stack chair 18 inch seat'}],
  products:[{c:'FD-2030',p:4,b:'Flex Desk 20x30 adjustable',r:'FD-2030 | Adjustable student desk | 20x30 | $412.00',h:0},{c:'FD-99',p:4,b:'withstand heavy loads and daily wear. A',r:'FD-99 | heavy duty top',h:0},{c:'SC-18',p:9,b:'Stack Chair 18"',r:'SC-18 | Stack chair | 18" seat | 129.00',h:0}]};
const REC={vendorId:'V1',vendorName:'Acme Seating',title:'Acme 2026 Catalog',url:'https://x/acme.json',productCount:2,pageImgBase:'https://x/pages/',hasPrices:false};
let saved=[];const db={catalogRows:async()=>[{id:'VCAT-1',cat:'VendorCatalog',content:JSON.stringify(REC)}],prospects:async()=>saved.map(p=>({id:p.id,content:JSON.stringify(p.data)})),
  settings:async()=>({booking:{defaultRep:'S001',reps:{S001:{url:'https://calendly.com/dave/intro',hostEmails:['dave@mwf.test']},S004:{url:'',hostEmails:['jim@mwf.test']}}}}),
  spent:0,spendToday:async()=>db.spent,spendAdd:async(c)=>(db.spent+=c),
  saveProspect:async(id,data)=>{saved=saved.filter(p=>p.id!==id);saved.push({id,data});},uploadPdf:async()=>'https://x/plan.pdf'};
const fetcher=async(url)=>{if(url==='https://x/acme.json')return{ok:true,json:async()=>CAT};throw new Error('unexpected '+url);};
const cats=await P.loadPublicCatalogs(db,fetcher);

// 1. Catalogue facts, never prices.
const found=P.searchAll(cats,'adjustable desk');
assert.equal(found[0].code,'FD-2030','a search finds the real product');
assert.equal(P.findProduct(cats,'VCAT-1','FD-99').name,'Flex Desk Series','a customer sees a product name, never a sentence fragment from the catalogue');
assert.ok(!/412|\$/.test(JSON.stringify(found)),'no price reaches a customer, in specs or anywhere in the product');
assert.ok(!/129/.test(JSON.stringify(P.searchAll(cats,'stack chair'))),'a price written without a dollar sign is removed too');
assert.equal(P.findProduct(cats,'VCAT-1','NOPE-1'),null,'an unknown code is not a product');
const v=P.validatePlan(cats,{project:{room:'Grade 3 classroom',headcount:'28',cost:'$9000'},items:[{catalog_id:'VCAT-1',code:'FD-2030',qty:28},{catalog_id:'VCAT-1',code:'MADE-UP-9',qty:3}],assumptions:['28 students']});
assert.deepEqual([v.items.length,v.items[0].qty,v.unknown],[1,28,['MADE-UP-9']],'a plan keeps catalogue lines only and reports the invented one');
assert.equal(v.project.cost,undefined,'a plan carries only the project fields the planner knows');
assert.deepEqual(P.vendorList(cats).map(x=>x.vendor),['Acme Seating'],'the brands list names the loaded vendors');

// 2. The conversation: the model's tools are catalogue-only, and its plan is checked.
let seen=null,turn=0;
const model=async(url,init)=>{if(url==='https://x/acme.json')return fetcher(url);const b=JSON.parse(init.body);seen=b;turn++;
  const reply=turn===1?{stop_reason:'tool_use',content:[{type:'tool_use',id:'t1',name:'search_products',input:{query:'adjustable desk'}}]}
    :turn===2?{stop_reason:'tool_use',content:[{type:'tool_use',id:'t2',name:'update_plan',input:{project:{room:'Grade 3 classroom',headcount:'28'},items:[{catalog_id:'VCAT-1',code:'FD-2030',qty:28,note:'one per student'},{catalog_id:'VCAT-1',code:'ZZ-1',qty:1}],assumptions:['28 students']}}]}
    :{stop_reason:'end_turn',content:[{type:'text',text:'Here is a start \u2014 28 Flex Desks.'}]};
  reply.usage={input_tokens:2000,output_tokens:300};return{ok:true,json:async()=>reply};};
const out=await P.runChat({env:{ANTHROPIC_API_KEY:'k'},db,fetcher:model,messages:[{role:'user',text:'A 3rd grade classroom for 28'}],plan:{}});
assert.deepEqual(seen.tools.map(t=>t.name).sort(),['get_product','list_vendors','search_products','update_plan'],'the public model has four tools, all over the catalogues');
assert.equal(out.reply,'Here is a start, 28 Flex Desks.','the customer never sees an em dash from the model');
assert.equal(P.plainDashes('Plan saved \u2014 28 desks, 22\u201330 in'),'Plan saved, 28 desks, 22-30 in','replies never carry em or en dashes');
assert.ok(db.spent>0,'every model call adds to today\'s spend');
assert.ok(/Never give, estimate or discuss prices/.test(seen.system)&&/ABOUT MIDWEST/.test(seen.system),'the prompt forbids prices and carries the public facts about Midwest');
assert.deepEqual([out.plan.items.length,out.plan.items[0].code,out.unknown],[1,'FD-2030',['ZZ-1']],'the conversation returns a checked plan');
assert.equal(out.products[0].code,'FD-2030','the products it looked at come back as cards');

// 3. "Request a priced quote": a real card, duplicates merged, repeats safe.
saved=[{id:'PR-OLD',data:{name:'Pat Lee',company:'Lincoln Elementary',email:'pat@lincoln.test',status:'Contacted',assignedRep:'S004',notes:'met at expo'}}];
const plan={project:{room:'Library'},items:[{vendor:'Acme Seating',code:'FD-2030',name:'Flex Desk',qty:10,catalog:'Acme 2026 Catalog',page:4}],assumptions:[]};
const pdf=Buffer.from('%PDF-1.7 test').toString('base64');
const a=await P.saveRequest({db,body:{requestId:'aaaaaaaa-1111-2222-3333-444444444444',contact:{name:'Sam Ortiz',email:'Sam@Oak.test',company:'Oak Middle School'},plan,campaign:{utm_campaign:'fall',evil:'x'},pdf}});
assert.ok(a.created,'a new customer becomes a new prospect card');
const card=saved.find(p=>p.id===a.prospectId).data;
assert.deepEqual([card.status,card.source,card.email,card.campaign.utm_campaign,card.campaign.evil,card.planRequests[0].pdfUrl,card.planRequests[0].items[0].qty],['New','Furniture Planner','sam@oak.test','fall',undefined,'https://x/plan.pdf',10],'the card carries the contact, plan, quantities, PDF and campaign');
assert.match(card.notes,/10 x Acme Seating FD-2030/,'staff read the request on the card without asking the customer again');
const again=await P.saveRequest({db,body:{requestId:'aaaaaaaa-1111-2222-3333-444444444444',contact:{name:'Sam Ortiz',email:'sam@oak.test',company:'Oak Middle School'},plan,pdf}});
assert.deepEqual([again.repeated,saved.length],[true,2],'sending the same request again makes no second card');
const dup=await P.saveRequest({db,body:{requestId:'bbbbbbbb-1111-2222-3333-444444444444',contact:{name:'Pat Lee',email:'PAT@lincoln.test',company:'Lincoln Elementary School'},plan}});
const old=saved.find(p=>p.id==='PR-OLD').data;
assert.deepEqual([dup.updated,saved.length,old.assignedRep,old.status,old.notes.startsWith('met at expo'),old.planRequests.length],[true,2,'S004','Contacted',true,1],'a known prospect (same email) is updated in place, keeping its rep, status and notes');
await assert.rejects(P.saveRequest({db,body:{requestId:'cccccccc-1111-2222-3333-444444444444',contact:{name:'X',email:'nope',company:'Y'},plan}}),/valid email/,'a request needs a real email');

// 4. Booking: offered when set, never required; only a signed, confirmed booking assigns the rep.
const bk=P.bookingFor(await db.settings(),a.prospectId,{name:'Sam Ortiz',email:'sam@oak.test'});
assert.ok(bk.url.startsWith('https://calendly.com/dave/intro?')&&bk.url.includes('utm_content='+a.prospectId),'the default rep\'s link carries the prospect so the booking can be matched');
assert.equal(P.bookingFor({booking:{defaultRep:'S004',reps:{S004:{url:''}}}},'x',{}),null,'no link: no booking offered, the request still saved');
const ev={event:'invitee.created',payload:{email:'sam@oak.test',uri:'https://api.calendly.com/inv/1',tracking:{utm_content:a.prospectId},scheduled_event:{start_time:'2026-12-01T15:00:00Z',event_memberships:[{user_email:'jim@mwf.test'}]}}};
const raw=JSON.stringify(ev),t=Math.floor(Date.now()/1000),sig='t='+t+',v1='+createHmac('sha256','whsec').update(t+'.'+raw).digest('hex');
const H=P.planHandler({PLAN_BOOKING_SIGNING_KEY:'whsec'},{db,fetch:fetcher});
const call=async(op,body,headers={},method='POST')=>{const res={code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}};const {Readable}=await import('node:stream');const req=Readable.from([typeof body==='string'?body:JSON.stringify(body)]);Object.assign(req,{method,query:{op},headers,body:typeof body==='string'?undefined:body});await H(req,res);return res;};
let res=await call('booking',raw,{'calendly-webhook-signature':'t='+t+',v1=bad'});
assert.equal(res.code,401,'an unsigned or forged booking is refused');
res=await call('booking',raw,{'calendly-webhook-signature':sig});
const booked=saved.find(p=>p.id===a.prospectId).data;
assert.deepEqual([res.code,booked.status,booked.assignedRep],[200,'Meeting Set','S004'],'a confirmed booking marks the card and assigns the rep whose calendar took it');
res=await call('booking',raw,{'calendly-webhook-signature':sig});
assert.equal(saved.find(p=>p.id===a.prospectId).data.bookings.length,1,'the same booking twice is recorded once');
db.spent=0;db.settings=async()=>({dailyLimit:0.5});
res=await call('chat',{messages:[{role:'user',text:'hi'}]},{'x-forwarded-for':'1.1.1.1'});
assert.equal(res.code,503,'under the limit the chat runs (here the made-up model is unreachable)');
db.spent=50;res=await call('chat',{messages:[{role:'user',text:'hi'}]},{'x-forwarded-for':'1.1.1.2'});
assert.deepEqual([res.code,res.body.code],[429,'daily_limit'],'at the admin\'s daily limit the chat stops');
db.settings=async()=>({dailyLimit:0});db.spent=0;res=await call('chat',{messages:[{role:'user',text:'hi'}]},{'x-forwarded-for':'1.1.1.3'});
assert.equal(res.code,429,'a limit of 0 turns the chat off');
assert.equal(P.costCents({input_tokens:1000000,output_tokens:100000}),450,'cost is counted from the tokens each answer used');
db.settings=async()=>({booking:{defaultRep:'S001',reps:{S001:{url:'https://calendly.com/dave/intro',hostEmails:['dave@mwf.test']}}}});
res=await call('config',{},{},'GET');
assert.deepEqual([res.body.booking,res.body.vendors,res.body.theme,Object.keys(res.body).sort()],[true,['Acme Seating'],'light',['booking','ok','theme','vendors']],'the public config tells only whether booking is on and the brand names');

// 5. The duplicate rules are the Prospects page's own.
const app2=fs.readFileSync('../../src/App2.jsx','utf8');
const s=app2.indexOf('const _normProspectText='),e=app2.indexOf('// Build a Set of all existing prospect keys');
const pageKeys=new Function(app2.slice(s,e)+';return _prospectKeys;')();
const {prospectKeys}=await import('../../src/prospectKeys.js');
for(const p of [{name:"Bobby's School",company:'The ABC Schools, Inc.'},{email:' A@B.com '},{phone:'(312) 555-0100 x1',name:'A'},{name:'John Smith'},{linkedin:'https://www.linkedin.com/in/x/'}])assert.deepEqual(prospectKeys(p),pageKeys(p),'the server\'s duplicate keys equal the Prospects page\'s');
console.log('PASS Furniture Planner server ('+(mutantIdx<0?'source':'mutant '+mutantIdx)+')');
