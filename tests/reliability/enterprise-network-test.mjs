import {JSDOM} from 'jsdom';import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';import {createRequire} from 'node:module';
import {createHmac, createHash} from 'node:crypto';
// The DYFRENT Network inside Midwest (issue 3): the server broker (api/enterprise-network.js) and the tabs' relay
// (src/enterprise.jsx). Made-up people and keys; no network, no database: fetch is a stand-in that plays Midwest's
// users table and DYFRENT's door (which checks the signature exactly the way api/_enterprise_network.js does).
const mutantIdx=process.argv.includes('--mutant')?Number(process.argv[process.argv.indexOf('--mutant')+1]):-1;
const MUTANTS=[
  ['only Midwest pages may ask the server','api/enterprise-network.js',"if (!appOrigins(env).includes(String((req.headers && req.headers.origin) || '')))","if (false)"],
  ['a Network call needs a pilot session','api/enterprise-network.js',"if (!s || !mayUse(env, s.id)) return say(401","if (!s) return say(401"],
  ['the session cookie is checked against its signature','api/enterprise-network.js',"if (!body || !sig || !same(sig, createHmac('sha256', key).update(body).digest('base64url'))) return null;","if (!body) return null;"],
  ['the session cookie is HttpOnly','api/enterprise-network.js',"; HttpOnly; Secure; SameSite=Strict","; Secure"],
  ['only pilot logins get a session','api/enterprise-network.js',"if (!mayUse(env, u.id)) return say(200, { ok: false, pilot: false });",""],
  ['the relay answers only the DYFRENT frame','src/enterprise.jsx',"if (!f || e.source !== f.contentWindow || e.origin !== NETWORK_APP) return;","if (!f) return;"],
  ['the frame call cannot name another kind of op','api/enterprise-network.js',"if (!kind || !(kind === 'net' ? NET_OP : PROFILE_OP).test(inner))","if (!kind)"],
  ['an expired session is refused','api/enterprise-network.js',"|| s.e <= now) return null;",") return null;"],
  ['the frame can switch tabs (Open full profile)','src/enterprise.jsx',"if (p && m.view !== view && onGo) onGo(p); return;","return;"],
  ['Add to Apple Wallet opens the pass at the top','src/enterprise.jsx',"if (m.kind === \"pass\") { openPass(m.url, onPass); return; }",""],
  ['only DYFRENT\'s signed pass link is opened','src/enterprise.jsx',"if (!PASS_LINK.test(u)) return false;",""],
  ['the frame cannot switch to a page that is not one of the three','src/enterprise.jsx',"const p = GO_PAGE[m.view]; if (p &&","const p = GO_PAGE[m.view] || m.view; if (p &&"],
  ['the connector relay takes the person from the connector, never from the request','api/enterprise-network.js',"const request = kind === 'session' ? { subject: who.id, name: who.name, kind }","const request = kind === 'session' ? { ...q, subject: q.subject || who.id, name: who.name, kind }"],
  ['the connector relay only serves pilot logins','api/enterprise-network.js',"if (!mayUse(env, who.id)) return say(403","if (false) return say(403"],
  ['the connector relay sends only net_ and profile_ ops','api/enterprise-network.js',"else if (!((kind === 'net' && NET_OP.test(op)) || (kind === 'profile' && PROFILE_OP.test(op))) || !plain(payload))","else if (!plain(payload))"],
  ['the connector relay refuses a token the connector does not vouch for','api/enterprise-network.js',"const w = r.status === 200 ? await r.json() : null;","const w = { ok: true, nu: 'USR-001', nn: 'Maureen Welter' };"],
  ['DYFRENT issue 1488: without open requests only the pilot list may use the Network','api/enterprise-network.js',"export function openRequests(env) { return env.ENTERPRISE_OPEN_REQUESTS === 'on'; }","export function openRequests(env) { return true; }"],
  ['DYFRENT issue 1488: looking at the join state never asks','api/enterprise-network.js',"op: b.ask === true ? 'ask' : 'status'","op: 'ask'"],
  ['DYFRENT issue 1488: only an approved person gets the frame','src/enterprise.jsx',"if (st.state === \"approved\") return children;","if (st.state) return children;"],
  ['the connector relay asks only an https connector','api/enterprise-network.js',"return u.protocol === 'https:' && !u.username","return !u.username"],
  ['DYFRENT issue 1488: the bell reads connection requests only once the person is listed','api/enterprise-network.js',"if (mk.body.listed === true && mk.body.left !== true) {","if (true) {"],
  ['DYFRENT issue 1488: the bell hides when the Network refuses this person','src/enterprise.jsx',"else if (r.status === 401 || r.status === 403) setCounts(null);",""],
  ['DYFRENT issue 1488: work that fits you is listed but never counted on the badge','src/enterprise.jsx',".filter(r => r.key !== \"work\").reduce(",".reduce("],
  ['DYFRENT issue 1488: the bell sends counts only, never what DYFRENT answered','api/enterprise-network.js',"return say(200, { ok: true, messages: n(c.unread),","return say(200, { ...mk.body, ok: true, messages: n(c.unread),"],
  ['DYFRENT issue 1488: a passing failure keeps the bell where it was','src/enterprise.jsx',"else if (r.status === 401 || r.status === 403) setCounts(null);","else setCounts(null);"],
  ['DYFRENT issue 1488: the bell reads no connection requests for someone who left the Network','api/enterprise-network.js',"if (mk.body.listed === true && mk.body.left !== true) {","if (mk.body.listed === true) {"],
  ['DYFRENT issue 1488: the bell reads at most once each 20 seconds unless opened','src/enterprise.jsx',"if (busy.current || (!force && t - lastAt.current < BELL_GAP_MS)) return;","if (busy.current) return;"],
  ['DYFRENT issue 1488: Ask Jarvis always goes to Jarvis, never where the page says','api/enterprise-network.js',"payload: { to: [JARVIS], subject:","payload: { to: Array.isArray(b.to) ? b.to : [JARVIS], subject:"],
  ['DYFRENT issue 1488: Ask Jarvis names only a plain screen','api/enterprise-network.js',"if (!JARVIS_SCREEN.test(screen)) return say(400","if (!screen) return say(400"],
  ['DYFRENT issue 1488: a phone keyboard opening does not close the question to Jarvis','src/enterprise.jsx',"const shut = (e) => { if (!(composing.current && e && e.type !== \"blur\"","const shut = (e) => { if (!(false && e && e.type !== \"blur\""],
  ['DYFRENT issue 1488: one press of Send, one question','src/enterprise.jsx',"if (!text || sending.current) return;","if (!text) return;"],
  ['DYFRENT issue 1488: a question over 4,000 characters is refused','api/enterprise-network.js',"if (text.length > 4000) return say(413","if (false) return say(413"],
  ['DYFRENT issue 1488: a draft keeps the screen it was written about','src/enterprise.jsx',"const askScreen = draft.trim() && draftOf.current.screen ? draftOf.current.screen : shownScreen;","const askScreen = shownScreen;"],
  ['DYFRENT issue 1488: a retry of the same draft is one message','api/enterprise-network.js',"update([s.id, screen, text, nonce].join('|'))","update([s.id, screen, text, nonce, Math.random()].join('|'))"],
  ['DYFRENT issue 1488: the page never says it is the person\'s own Claude','api/enterprise-network.js',"{ subject: s.id, name: s.name, kind, op: inner, payload }","{ subject: s.id, name: s.name, kind, op: inner, payload, app: 'connector' }"],
  ['DYFRENT issue 1488: a net call from the connector says it is the person\'s own Claude','api/enterprise-network.js',"kind, op, payload, app: 'connector' }","kind, op, payload, app: String(q.app || 'connector') }"],
];
const read=(f)=>{const t=fs.readFileSync('../../'+f,'utf8');if(mutantIdx<0||MUTANTS[mutantIdx][1]!==f)return t;assert.ok(t.includes(MUTANTS[mutantIdx][2]),'mutation anchor missing: '+MUTANTS[mutantIdx][0]);return t.replace(MUTANTS[mutantIdx][2],MUTANTS[mutantIdx][3]);};
const bundle=async(file,platform)=>{const r=await build({stdin:{contents:read(file),resolveDir:'../../'+file.split('/').slice(0,-1).join('/'),sourcefile:file,loader:file.endsWith('.jsx')?'jsx':'js'},bundle:true,write:false,format:'esm',platform,external:['react','react-dom','node:crypto'],jsx:'transform'});const out='./.enterprise-'+platform+'.mjs';fs.writeFileSync(out,r.outputFiles[0].text);try{return await import(out+'?'+Date.now())}finally{fs.rmSync(out)}};

// ── 1. The broker ─────────────────────────────────────────────────────────
const B=await bundle('api/enterprise-network.js','node');
const KEY='b'.repeat(40),SKEY='s'.repeat(40),NOW=Date.parse('2026-11-23T15:00:00Z');
const env={ENTERPRISE_NETWORK_PREVIEW:'on',ENTERPRISE_INSTALLATION_ID:'midwest',ENTERPRISE_BROKER_KEY:KEY,ENTERPRISE_SESSION_KEY:SKEY,ENTERPRISE_PILOT_USERS:'USR-000,USR-001',ENTERPRISE_APP_ORIGIN:'https://midwestaios.com,https://www.midwestaios.com',ENTERPRISE_NETWORK_ENDPOINT:'https://www.dyfrent.app/api/mcp?s=enterprise'};
const USERS=[{id:'USR-001',username:'maureen',password:'pw-maureen',name:'Maureen Welter',role:'admin'},{id:'USR-002',username:'dave',password:'pw-dave',name:'Dave Welter',role:'admin'}];
let sent=[];const JOIN={'USR-001':'approved'};const BELL_FAKE={};
const fakeFetch=async(url,init={})=>{
  const u=new URL(url);
  // Midwest's database function mw_check_login: the password is compared there and never read back (Nov 26 2026).
  if(u.hostname==='kogjthgceejpzxnekprr.supabase.co'){assert.equal(u.pathname,'/rest/v1/rpc/mw_check_login','the Network sign-in asks the database function, never the users table');assert.equal(init.method,'POST');const a=JSON.parse(init.body);const row=USERS.find(x=>x.username===a.p_username&&x.password===a.p_password);return {ok:true,status:200,json:async()=>row?{id:row.id,name:row.name,role:row.role}:null};}
  if(u.hostname==='www.dyfrent.app'){const b=JSON.parse(init.body);sent.push(b);
    // DYFRENT's own check (api/_enterprise_network.js brokerText / brokerSignature)
    const text=['dyfrent.enterprise/1',b.installation,b.nonce,b.issued_at,createHash('sha256').update(JSON.stringify(b.request)).digest('hex')].join('\n');
    const good=createHmac('sha256',KEY).update(text).digest('hex')===init.headers['X-Enterprise-Signature'];
    if(!good)return {status:401,json:async()=>({ok:false,code:'unauthorized'})};
    if(b.request.kind==='session')return {status:200,json:async()=>({ok:true,member:{name:b.request.name,role:'admin'}})};
    if(b.request.kind==='join'){const st=JOIN[b.request.subject]||'none';if(b.request.op==='ask'&&st==='none')JOIN[b.request.subject]='pending';return {status:200,json:async()=>({ok:true,state:b.request.op==='ask'&&st==='none'?'pending':st})};}
    if(b.request.kind==='net'&&BELL_FAKE[b.request.op]){const f=BELL_FAKE[b.request.op];return {status:f.status||200,json:async()=>f.body};}
    return {status:200,json:async()=>({ok:true,echo:{kind:b.request.kind,op:b.request.op,subject:b.request.subject,payload:b.request.payload}})};}
  throw new Error('unexpected fetch '+url);
};
// The connector (midwest-aios-mcp /network-whois): who a connector access token speaks for. Made-up tokens.
const WHOIS={'tok-maureen':{nu:'USR-001',nn:'Maureen Welter'},'tok-dave':{nu:'USR-002',nn:'Dave Welter'}};
let whois=[],whoisDown=false;
const baseFetch=fakeFetch;
const relayFetch=async(url,init={})=>{const u=new URL(url);
  if(u.hostname==='midwest-aios-mcp.vercel.app'){whois.push({url:String(url),init});if(whoisDown)throw new Error('down');const t=JSON.parse(init.body).token;const w=WHOIS[t];return w?{status:200,json:async()=>({ok:true,...w})}:{status:401,json:async()=>({ok:false})};}
  return baseFetch(url,init);};
const handler=B.enterpriseBroker(env,{fetch:relayFetch,now:()=>NOW});
const call=async(body,{origin='https://midwestaios.com',cookie='',method='POST'}={})=>{const res={code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}};await handler({method,headers:{origin,cookie},body},res);return res;};
const cookieOf=(res)=>String(res.headers['Set-Cookie']||'').split(';')[0];

let r=await call({op:'login',username:'maureen',password:'pw-maureen'});
assert.equal(r.body.ok,true,'Maureen signs in to the Network with her Midwest username and password');
const setc=String(r.headers['Set-Cookie']);
assert.match(setc,/^mw_net=[^;]+; Path=\/api\/enterprise-network; HttpOnly; Secure; SameSite=Strict; Max-Age=43200$/,'the Network session is an HttpOnly, Secure, same-site cookie for this one route, twelve hours');
const maureen=cookieOf(r);
r=await call({op:'login',username:'maureen',password:'wrong'});
assert.equal(r.code,401,'a wrong password gets no session');assert.equal(r.headers['Set-Cookie'],undefined,'and no cookie');
r=await call({op:'login',username:'dave',password:'pw-dave'});
assert.deepEqual([r.body.ok,r.body.pilot,r.headers['Set-Cookie']],[false,false,undefined],'a real Midwest login that is not on the pilot list gets no Network session (nothing changes for them)');
r=await call({op:'status',user:'USR-001'},{cookie:maureen});
assert.deepEqual([r.body.pilot,r.body.session],[true,true],'status: Maureen is a pilot login with a verified session');
r=await call({op:'status',user:'USR-002'},{cookie:maureen});
assert.deepEqual([r.body.pilot,r.body.session],[false,false],'status for Dave says no tabs, even from a browser holding Maureen\'s cookie');
r=await call({op:'status',user:'USR-001'});
assert.deepEqual([r.body.pilot,r.body.session],[true,false],'status with no cookie: the tabs show and ask to confirm the password');

sent=[];r=await call({op:'hello'},{cookie:maureen});
assert.deepEqual([r.code,r.body.member&&r.body.member.name],[200,'Maureen Welter'],'hello answers who Maureen is on the Network');
assert.equal(sent.length,1,'one signed request went to DYFRENT');assert.deepEqual(Object.keys(sent[0]).sort(),['installation','issued_at','nonce','request'],'the envelope carries only installation, nonce, time and request');
assert.deepEqual([sent[0].installation,sent[0].request.subject,sent[0].request.kind],['midwest','USR-001','session'],'the subject is the signed-in Midwest user, from the server session');
assert.match(sent[0].nonce,/^[a-f0-9]{48}$/,'each request has a fresh 48-hex nonce');
assert.ok(!JSON.stringify(sent[0]).includes(KEY)&&!JSON.stringify(sent[0]).includes(SKEY),'no key ever travels');

sent=[];r=await call({op:'call',route:'net_team',body:{net:'net_directory',kind:'person',q:'J',op:'net_admin'}},{cookie:maureen});
assert.equal(r.code,200,'a Network call from the frame is answered');
assert.deepEqual(r.body.echo,{kind:'net',op:'net_directory',subject:'USR-001',payload:{kind:'person',q:'J'}},'DYFRENT receives the op the frame named, as Maureen, and the payload cannot carry another op');
assert.equal(sent[0]&&('app' in sent[0].request),false,'a call from the page never says it is the person\'s own Claude (DYFRENT issue 1488)');
sent=[];r=await call({op:'call',route:'profile_team',body:{profile:'profile_me'}},{cookie:maureen});
assert.deepEqual(r.body.echo&&[r.body.echo.kind,r.body.echo.op],['profile','profile_me'],'a Profile call goes as a profile op');
r=await call({op:'call',route:'net_team',body:{net:'brain_chat'}},{cookie:maureen});
assert.equal(r.code,400,'anything but a net_ or profile_ op is refused here');
r=await call({op:'call',route:'brain',body:{net:'net_overview'}},{cookie:maureen});
assert.equal(r.code,400,'a route other than the two network doors is refused');
sent=[];r=await call({op:'call',route:'net_team',body:{net:'net_overview'}});
assert.deepEqual([r.code,r.body.code,sent.length],[401,'signin',0],'no session: refused, nothing sent to DYFRENT');
r=await call({op:'call',route:'net_team',body:{net:'net_overview'}},{cookie:maureen.replace(/\.[^.]+$/,'.forged')});
assert.equal(r.code,401,'a forged session cookie is refused');
const forgedBody=Buffer.from(JSON.stringify({u:'USR-002',n:'Dave',e:NOW+1e6})).toString('base64url');
r=await call({op:'call',route:'net_team',body:{net:'net_overview'}},{cookie:'mw_net='+forgedBody+'.'+maureen.split('.')[1]});
assert.equal(r.code,401,'Maureen\'s signature on a cookie naming someone else is refused');
const daveSession='mw_net='+B.sealSession(env,{id:'USR-002',name:'Dave'},NOW);
sent=[];r=await call({op:'hello'},{cookie:daveSession});
assert.deepEqual([r.code,sent.length],[401,0],'a validly signed session for a login that is not on the pilot list is refused (removing someone from the list takes effect at once)');
const expired='mw_net='+B.sealSession(env,{id:'USR-001',name:'Maureen'},NOW-13*3600*1000);
r=await call({op:'hello'},{cookie:expired});
assert.equal(r.code,401,'a session older than twelve hours is refused');

// DYFRENT issue 1488: asking to join, and every login once ENTERPRISE_OPEN_REQUESTS is on.
sent=[];r=await call({op:'join'},{cookie:maureen});
assert.deepEqual([r.code,r.body.state,sent[0].request],[200,'approved',{subject:'USR-001',name:'Maureen Welter',kind:'join',op:'status'}],'join: Maureen is approved; the signed request carries only her id, name, the join kind and status');
sent=[];r=await call({op:'join',ask:'yes'},{cookie:maureen});
assert.equal(sent[0].request.op,'status','only ask: true asks, nothing else does');
sent=[];r=await call({op:'join',ask:true});
assert.deepEqual([r.code,r.body.code,sent.length],[401,'signin',0],'join with no session: refused, nothing sent');
// DYFRENT issue 1488 >> the bell: counts only, from three reads DYFRENT already answers for the person.
Object.assign(BELL_FAKE,{net_mk_overview:{body:{ok:true,intros:[{name:'Somebody Else'}],counts:{unread:3,intros:1,to_decide:2,for_you:4,mine_open:9},listed:true,left:false}},
  net_wire_unread:{body:{ok:true,unread:2,threads:[{subject:'secret words'}]}},net_overview:{body:{ok:true,incoming:[{name:'A Person'}],counts:{incoming:5,connections:40}}}});
sent=[];r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual(r.body,{ok:true,messages:3,agents:2,requests:5,intros:1,decide:2,work:4},'the bell answers counts only: no names, no words, nothing else DYFRENT sent');
assert.deepEqual(sent.map(x=>[x.request.subject,x.request.kind,x.request.op]).sort(),[['USR-001','net','net_mk_overview'],['USR-001','net','net_overview'],['USR-001','net','net_wire_unread']],'three signed reads, as Maureen');
assert.ok(sent.every(x=>Object.keys(x.request).sort().join()==='kind,name,op,payload,subject'),'each read carries only what DYFRENT reads');
BELL_FAKE.net_mk_overview.body={...BELL_FAKE.net_mk_overview.body,listed:false};
sent=[];r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual([r.body.requests,r.body.messages,sent.map(x=>x.request.op).includes('net_overview')],[0,3,false],'someone who has never opened the Network is not read through net_overview (which would list them)');
BELL_FAKE.net_mk_overview.body={...BELL_FAKE.net_mk_overview.body,listed:true,left:true};
sent=[];r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual([r.body.requests,sent.map(x=>x.request.op).includes('net_overview')],[0,false],'someone who left the Network is not read through net_overview either');
BELL_FAKE.net_mk_overview.body={...BELL_FAKE.net_mk_overview.body,left:false};const ovWas=BELL_FAKE.net_overview;BELL_FAKE.net_overview={status:503,body:{ok:false}};
r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual([r.code,r.body.messages,r.body.requests],[200,3,0],'a failed connection-request read still answers the other counts');
BELL_FAKE.net_overview=ovWas;
BELL_FAKE.net_mk_overview.body={...BELL_FAKE.net_mk_overview.body,listed:true,counts:{unread:-4,intros:'7',to_decide:2.5,for_you:5000}};BELL_FAKE.net_wire_unread={status:403,body:{ok:false,code:'forbidden'}};
r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual(r.body,{ok:true,messages:0,agents:0,requests:5,intros:0,decide:0,work:999},'garbage counts read as nothing, huge ones are capped, and a refused agent read is zero');
BELL_FAKE.net_mk_overview={status:403,body:{ok:false,code:'forbidden',error:'Your company Network access is unavailable.'}};
r=await call({op:'bell'},{cookie:maureen});
assert.deepEqual([r.code,r.body.ok,r.body.messages],[403,false,undefined],'a person DYFRENT does not answer for (not approved, paused) gets no counts');
sent=[];r=await call({op:'bell'});
assert.deepEqual([r.code,r.body.code,sent.length],[401,'signin',0],'the bell with no session: refused, nothing sent');
r=await call({op:'bell'},{cookie:maureen,origin:'https://evil.example'});
assert.equal(r.code,403,'another site cannot read the bell');
// DYFRENT issue 1488 >> Ask Jarvis about this screen.
BELL_FAKE.net_wire_open={body:{ok:true,thread:'awt-0123456789abcdef',message:{body:'echo'},woke:true}};
sent=[];r=await call({op:'ask',screen:'Job Records',text:'  Why is the PO column blank?  ',to:['@someone-else'],subject:'x',nonce:'abc12345xyz'},{cookie:maureen});
assert.deepEqual(r.body,{ok:true,thread:'awt-0123456789abcdef'},'asking Jarvis answers ok and the conversation id, nothing else DYFRENT sent');
assert.deepEqual(sent.map(x=>x.request),[{subject:'USR-001',name:'Maureen Welter',kind:'net',op:'net_wire_open',payload:{to:['@j-claude'],subject:'Midwest: Job Records',text:'Why is the PO column blank?\n\n(Asked from the Job Records screen in Midwest AIOS.)',ref:'mwask-'+createHash('sha256').update(['USR-001','Job Records','Why is the PO column blank?','abc12345xyz'].join('|')).digest('hex').slice(0,40)}}],'one signed message, as Maureen, to Jarvis only: her words and the screen name, whatever else the page sent');
const refOfAsk=async(body)=>{sent=[];await call(body,{cookie:maureen});return sent[0].request.payload.ref;};
const ref1=await refOfAsk({op:'ask',screen:'Tasks',text:'Same words',nonce:'nonce000aaa'});
assert.match(ref1,/^mwask-[0-9a-f]{40}$/,'each question carries a ref DYFRENT accepts');
assert.equal(await refOfAsk({op:'ask',screen:'Tasks',text:'Same words',nonce:'nonce000aaa'}),ref1,'a retry of the same draft is the same message (DYFRENT keeps the first)');
assert.notEqual(await refOfAsk({op:'ask',screen:'Tasks',text:'Same words',nonce:'nonce000bbb'}),ref1,'the same words in a new draft are a new message');
assert.equal(await refOfAsk({op:'ask',screen:'Tasks',text:'Same words',nonce:'BAD NONCE!'}),await refOfAsk({op:'ask',screen:'Tasks',text:'Same words'}),'an odd nonce is ignored');
for(const [label,body,code] of [['an empty question',{op:'ask',screen:'Tasks',text:'   '},400],['a question over 4,000 characters',{op:'ask',screen:'Tasks',text:'x'.repeat(4001)},413],['a screen name that is not plain',{op:'ask',screen:'<img src=x>',text:'hi'},400],['a missing screen',{op:'ask',text:'hi'},400],['a screen name over 40 characters',{op:'ask',screen:'A'.repeat(41),text:'hi'},400]]){
  sent=[];r=await call(body,{cookie:maureen});assert.deepEqual([r.code,sent.length],[code,0],label+' is refused before anything is sent');}
sent=[];r=await call({op:'ask',screen:'Tasks',text:'hi'});
assert.deepEqual([r.code,r.body.code,sent.length],[401,'signin',0],'asking with no session: refused, nothing sent');
r=await call({op:'ask',screen:'Tasks',text:'hi'},{cookie:maureen,origin:'https://evil.example'});
assert.equal(r.code,403,'another site cannot ask Jarvis for her');
BELL_FAKE.net_wire_open={status:429,body:{ok:false,code:'cap',error:'You have sent a lot today. Try again tomorrow.'}};
r=await call({op:'ask',screen:'Tasks',text:'hi'},{cookie:maureen});
assert.deepEqual([r.code,r.body.error],[429,'You have sent a lot today. Try again tomorrow.'],'a refusal from DYFRENT comes back as said');
BELL_FAKE.net_wire_open={body:{ok:true,thread:'not a thread id'}};
r=await call({op:'ask',screen:'Tasks',text:'hi'},{cookie:maureen});
assert.deepEqual(r.body,{ok:true},'an odd conversation id is not passed on');
for(const k of Object.keys(BELL_FAKE))delete BELL_FAKE[k];
const openEnv={...env,ENTERPRISE_OPEN_REQUESTS:'on'};
const openH=B.enterpriseBroker(openEnv,{fetch:relayFetch,now:()=>NOW});
const ocall=async(body,{origin='https://midwestaios.com',cookie=''}={})=>{const res={code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}};await openH({method:'POST',headers:{origin,cookie},body},res);return res;};
r=await ocall({op:'status',user:'USR-002'});
assert.deepEqual([r.body.pilot,r.body.session],[true,false],'open requests: Dave sees the tabs and is asked for his password');
r=await ocall({op:'login',username:'dave',password:'pw-dave'});
const dave=cookieOf(r);
assert.deepEqual([r.body.ok,/^mw_net=/.test(dave)],[true,true],'open requests: Dave gets a verified Network session with his own Midwest password');
sent=[];r=await ocall({op:'join'},{cookie:dave});
assert.deepEqual([r.body.state,sent[0].request.subject,sent[0].request.op],['none','USR-002','status'],'Dave has not asked yet: none, and looking asks nothing');
sent=[];r=await ocall({op:'join',ask:true},{cookie:dave});
assert.deepEqual([r.body.state,sent[0].request.op,JOIN['USR-002']],['pending','ask','pending'],'Dave asks to join: pending, waiting for J');
r=await ocall({op:'login',username:'dave',password:'wrong'});
assert.equal(r.code,401,'open requests still need the right password');
r=await ocall({op:'join',ask:true},{cookie:dave,origin:'https://evil.example'});
assert.equal(r.code,403,'another site cannot ask to join for him');
delete JOIN['USR-002'];
r=await call({op:'hello'},{cookie:maureen,origin:'https://evil.example'});
assert.equal(r.code,403,'a request from any other site is refused, even with the cookie');
r=await call({op:'hello'},{cookie:maureen,origin:'https://www.midwestaios.com'});
assert.equal(r.code,200,'www.midwestaios.com is Midwest too');
r=await call({op:'hello'},{cookie:maureen,method:'GET'});
assert.equal(r.code,405,'only POST');
r=await call({op:'logout'});
assert.match(String(r.headers['Set-Cookie']),/^mw_net=; .*Max-Age=0$/,'sign-out clears the Network session');
const closed=B.enterpriseBroker({...env,ENTERPRISE_NETWORK_PREVIEW:''},{fetch:fakeFetch,now:()=>NOW});
const cr={code:0,headers:{},body:null,setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}};await closed({method:'POST',headers:{origin:'https://midwestaios.com'},body:{op:'status',user:'USR-001'}},cr);
assert.deepEqual([cr.body.pilot,cr.body.code],[false,'closed'],'with the preview switch off nobody sees the tabs');
assert.deepEqual([...read('api/enterprise-network.js').matchAll(/SB \+ '\/([a-z_/]+)/g)].map(m=>m[1]),['rpc/mw_check_login'],'the broker asks Midwest one thing, the sign-in check (mw_check_login), and reads no table');

// ── 1b. The connector relay (server to server, no origin, no cookie) ──────
const CONN='https://midwest-aios-mcp.vercel.app';
const relayEnv={...env,ENTERPRISE_CONNECTOR_ORIGIN:CONN};
const relay=B.enterpriseBroker(relayEnv,{fetch:relayFetch,now:()=>NOW});
const rcall=async(body,h=relay)=>{const res={code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}};await h({method:'POST',headers:{},body},res);return res;};
sent=[];whois=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'session',op:'net_threads'}});
assert.equal(r.code,400,'a session request names no op');assert.deepEqual([sent.length,whois.length],[0,0],'and nothing is asked or sent');
sent=[];whois=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'session',subject:'USR-000'}});
assert.deepEqual([r.code,r.body.member&&r.body.member.name],[200,'Maureen Welter'],'the connector asks who Maureen is, with no browser origin and no cookie');
assert.equal(whois.length,1,'the connector is asked once about the token');
assert.deepEqual([whois[0].url,whois[0].init.method,whois[0].init.redirect,JSON.parse(whois[0].init.body)],[CONN+'/network-whois','POST','error',{token:'tok-maureen'}],'at its own /network-whois, POST, no redirects, with only the token');
assert.deepEqual(sent[0].request,{subject:'USR-001',name:'Maureen Welter',kind:'session'},'and DYFRENT gets the same signed session request the tabs send, for Maureen');
sent=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'net',op:'net_thread_send',subject:'USR-000',name:'J Bartlett',payload:{id:'nt-0123456789abcdef',body:'hi',subject:'USR-000'}}});
assert.equal(r.code,200,'a message through the relay is answered');
assert.deepEqual([sent[0].request.subject,sent[0].request.name,sent[0].request.op],['USR-001','Maureen Welter','net_thread_send'],'naming someone else in the request changes nothing: it goes as the person the connector vouched for');
assert.deepEqual(Object.keys(sent[0].request).sort(),['app','kind','name','op','payload','subject'],'and the signed request holds only what DYFRENT reads');
assert.equal(sent[0].request.app,'connector','a net call from the connector says it is the person\'s own Claude (DYFRENT issue 1488), whatever the request said');
sent=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'profile',op:'profile_me',payload:{}}});
assert.deepEqual(r.body.echo&&[r.body.echo.kind,r.body.echo.op,r.body.echo.subject],['profile','profile_me','USR-001'],'a Profile call goes as a profile op');
assert.equal('app' in sent[0].request,false,'and a Profile call never says it is the app');
sent=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'net',op:'net_wire_inbox',payload:{},app:'page'}});
assert.equal(sent[0]&&sent[0].request.app,'connector','the request cannot choose what app says');
for(const [label,q] of [['another kind',{kind:'brain',op:'brain_chat',payload:{}}],['a non-network op',{kind:'net',op:'brain_chat',payload:{}}],['a profile op under net',{kind:'net',op:'profile_me',payload:{}}],['a net op under profile',{kind:'profile',op:'net_threads',payload:{}}],['no payload',{kind:'net',op:'net_threads'}],['an odd op name',{kind:'net',op:'net_threads; drop',payload:{}}]]){
  sent=[];whois=[];r=await rcall({op:'connector',token:'tok-maureen',request:q});
  assert.deepEqual([r.code,sent.length,whois.length],[400,0,0],label+' is refused before anything is asked or sent');}
sent=[];whois=[];r=await rcall({op:'connector',token:'forged',request:{kind:'session'}});
assert.deepEqual([r.code,r.body.code,sent.length],[401,'signin',0],'a token the connector does not vouch for is refused, nothing sent to DYFRENT');
sent=[];r=await rcall({op:'connector',token:'tok-dave',request:{kind:'net',op:'net_threads',payload:{}}});
assert.deepEqual([r.code,r.body.code,sent.length],[403,'pilot',0],'a real Midwest person who is not on the pilot list is refused');
sent=[];r=await rcall({op:'connector',request:{kind:'session'}});
assert.deepEqual([r.code,sent.length],[400,0],'no token: refused');
whoisDown=true;sent=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'session'}});
assert.deepEqual([r.code,sent.length],[503,0],'when the connector cannot answer, nothing is sent');whoisDown=false;
for(const o of ['', 'http://midwest-aios-mcp.vercel.app', 'https://user:pw@midwest-aios-mcp.vercel.app', 'https://midwest-aios-mcp.vercel.app/elsewhere']){
  const h=B.enterpriseBroker({...env,ENTERPRISE_CONNECTOR_ORIGIN:o},{fetch:relayFetch,now:()=>NOW});
  sent=[];whois=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'session'}},h);
  assert.deepEqual([r.body.code,sent.length,whois.length],['closed',0,0],'connector origin '+JSON.stringify(o)+' keeps the relay closed');}
const relayOff=B.enterpriseBroker({...relayEnv,ENTERPRISE_NETWORK_PREVIEW:''},{fetch:relayFetch,now:()=>NOW});
sent=[];whois=[];r=await rcall({op:'connector',token:'tok-maureen',request:{kind:'session'}},relayOff);
assert.deepEqual([r.body.code,sent.length,whois.length],['closed',0,0],'the preview switch off closes the relay too');
r=await call({op:'hello'},{cookie:maureen,origin:'https://evil.example'});
assert.equal(r.code,403,'the browser ops still need a Midwest page');

// ── 2. The tabs and the relay ─────────────────────────────────────────────
const dom=new JSDOM('<div id="root"></div>',{url:'https://midwestaios.com/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MessageEvent:dom.window.MessageEvent,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
const posts=[];const uiJoin={state:'approved',fail:false};
globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);posts.push(b);
  const answer=b.op==='status'?{ok:true,pilot:b.user==='USR-001',session:false}:b.op==='login'?(b.password==='pw-maureen'?{ok:true,pilot:true}:{ok:false,error:'That username and password did not match.'}):b.op==='hello'?{ok:true,member:{name:'Maureen Welter',role:'admin',key:'k'}}:b.op==='join'?(uiJoin.fail?{ok:false,error:'The Network could not answer just now. Try again.'}:{ok:true,state:b.ask===true&&uiJoin.state==='none'?(uiJoin.state='pending'):uiJoin.state}):{ok:true,echo:b};
  return {status:b.op==='login'&&b.password!=='pw-maureen'?401:200,json:async()=>answer};};
const req=createRequire(import.meta.url);const React=req('react');const {createRoot}=req('react-dom/client');const {act}=React;
const origErr=console.error;console.error=(...a)=>{if(/act\(|not wrapped/.test(String(a[0])))return;origErr(...a)};
const E=await bundle('src/enterprise.jsx','browser');
assert.deepEqual(E.NETWORK_PAGES.map(p=>p.label),['Profile','Network','Messages'],'three new tabs: Profile, Network, Messages');
const root=createRoot(document.getElementById('root'));
let pilot;const went=[];const passes=[];
function Host({user,view}){const [st,setSt]=E.useNetworkPilot(user);pilot=st;return React.createElement(E.NetworkPage,{view,currentUser:user,pilotState:st,setPilotState:setSt,setPage:p=>went.push(p),onPass:u=>passes.push(u)});}
const flush=async()=>{for(let i=0;i<6;i++)await act(async()=>{await new Promise(r=>setTimeout(r,0))});};
await act(async()=>root.render(React.createElement(Host,{user:{id:'USR-002',username:'dave'},view:'network'})));await flush();
assert.deepEqual([pilot.checked,pilot.pilot,document.getElementById('root').innerHTML],[true,false,''],'a login that is not on the pilot list sees nothing at all');
await act(async()=>root.render(React.createElement(Host,{user:{id:'USR-001',username:'maureen'},view:'network'})));await flush();
assert.match(document.body.textContent,/Confirm your password/,'a pilot login with no verified session is asked to confirm the password once');
assert.equal(document.querySelector('iframe'),null,'no frame opens before the password is confirmed');
const pw=document.querySelector('input[type=password]');const setVal=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
await act(async()=>{setVal.call(pw,'wrong');pw.dispatchEvent(new window.Event('input',{bubbles:true}))});
await act(async()=>{document.querySelector('button').click()});await flush();
assert.match(document.body.textContent,/did not match/,'a wrong password is refused and says so');
await act(async()=>{setVal.call(pw,'pw-maureen');pw.dispatchEvent(new window.Event('input',{bubbles:true}))});
await act(async()=>{document.querySelector('button').click()});await flush();
const frame=document.querySelector('iframe');
assert.ok(frame,'the right password opens the Network');
assert.equal(frame.getAttribute('src'),'https://www.dyfrent.app/enterprise?host=https%3A%2F%2Fmidwestaios.com&view=network','the frame is J\'s DYFRENT page, told which Midwest origin hosts it');
assert.ok(!frame.getAttribute('src').includes('pw-maureen')&&!JSON.stringify(posts.filter(p=>p.op!=='login')).includes('pw-maureen'),'the password goes only to Midwest\'s own server, never into the frame or a later call');
const replies=[];frame.contentWindow.postMessage=(m,o)=>replies.push([m,o]);
const fire=async(data,{source=frame.contentWindow,origin='https://www.dyfrent.app'}={})=>{await act(async()=>{window.dispatchEvent(new window.MessageEvent('message',{data,origin,source}))});await flush();};
posts.length=0;
await fire({t:E.FRAME_PROTOCOL,kind:'call',id:'a1',route:'net_team',body:{net:'net_overview'}},{origin:'https://evil.example'});
await fire({t:E.FRAME_PROTOCOL,kind:'call',id:'a2',route:'net_team',body:{net:'net_overview'}},{source:window});
assert.deepEqual([posts.length,replies.length],[0,0],'a message from any other origin or window is ignored: nothing reaches the server, nothing is answered');
await fire({t:E.FRAME_PROTOCOL,kind:'hello',id:'h1'});
assert.deepEqual([posts[0]&&posts[0].op,replies[0]&&replies[0][1],replies[0]&&replies[0][0].id,replies[0]&&replies[0][0].body.member.name],['hello','https://www.dyfrent.app','h1','Maureen Welter'],'the frame\'s hello is answered, to the DYFRENT origin only');
await fire({t:E.FRAME_PROTOCOL,kind:'call',id:'c1',route:'net_team',body:{net:'net_directory',q:'J'}});
assert.deepEqual(posts[1],{op:'call',route:'net_team',body:{net:'net_directory',q:'J'}},'a frame call goes to Midwest\'s server as it was asked');
assert.deepEqual([replies[1][0].kind,replies[1][0].id,replies[1][0].status],['result','c1',200],'and the answer goes back to that call');
const sentBefore=posts.length;
await fire({t:E.FRAME_PROTOCOL,kind:'go',id:'g0',view:'profile'},{origin:'https://evil.example'});
await fire({t:E.FRAME_PROTOCOL,kind:'go',id:'g1',view:'profile'});
await fire({t:E.FRAME_PROTOCOL,kind:'go',id:'g2',view:'messages'});
await fire({t:E.FRAME_PROTOCOL,kind:'go',id:'g3',view:'network'});
await fire({t:E.FRAME_PROTOCOL,kind:'go',id:'g4',view:'jobs'});
assert.deepEqual(went,['netprofile','netmessages'],'the frame can switch to the Profile or Messages tab (Open full profile), never to its own view, another page or from another origin');
assert.equal(posts.length,sentBefore,'switching tabs calls nothing on the server');
const PASS='https://www.dyfrent.app/api/book?action=netpass&t='+'Q'.repeat(144);
await fire({t:E.FRAME_PROTOCOL,kind:'pass',id:'p0',url:PASS},{origin:'https://evil.example'});
for(const bad of ['https://evil.example/api/book?action=netpass&t='+'Q'.repeat(144),'https://www.dyfrent.app/api/book?action=netpass&t=short','javascript:alert(1)',PASS+'&x=1',null])await fire({t:E.FRAME_PROTOCOL,kind:'pass',id:'p1',url:bad});
await fire({t:E.FRAME_PROTOCOL,kind:'pass',id:'p2',url:PASS});
assert.deepEqual(passes,[PASS],'Add to Apple Wallet: only DYFRENT\'s own signed pass link, from the DYFRENT frame, is opened at the top of this page');
assert.equal(posts.length,sentBefore,'opening the pass calls nothing on the server');
// DYFRENT issue 1488: a login J has not approved sees Ask to join, then Waiting; a paused one is told; only approved gets the frame.
const pages={};function Host2({view}){const [st,setSt]=React.useState({checked:true,pilot:true,session:true});return React.createElement(E.NetworkPage,{view,currentUser:{id:'USR-002',username:'dave'},pilotState:st,setPilotState:setSt,setPage:()=>{}});}
await act(async()=>root.unmount());
const root2=createRoot(document.getElementById('root'));
uiJoin.state='none';posts.length=0;
await act(async()=>root2.render(React.createElement(Host2,{view:'network'})));await flush();
assert.deepEqual([document.querySelector('[data-network-join]')&&document.querySelector('[data-network-join]').dataset.networkJoin,!!document.querySelector('iframe'),posts.map(p=>[p.op,p.ask])],['none',false,[['join',false]]],'not yet asked: the Join card, no frame, and looking asked nothing');
assert.match(document.body.textContent,/Ask to join/,'the card offers Ask to join');
assert.ok(!/[\u2013\u2014]/.test(document.body.textContent),'no em dash in the join card');
await act(async()=>{document.querySelector('[data-network-ask]').click()});await flush();
assert.deepEqual([posts[1]&&posts[1].ask,document.querySelector('[data-network-join]').dataset.networkJoin],[true,'pending'],'Ask to join sends one ask and shows Waiting for J');
assert.match(document.body.textContent,/Waiting for J to approve you/,'the waiting card says who decides');
uiJoin.state='approved';
await act(async()=>{document.querySelector('[data-network-check]').click()});await flush();
assert.ok(document.querySelector('iframe'),'once J approves, Check again opens the Network');
await act(async()=>root2.unmount());
const root3=createRoot(document.getElementById('root'));uiJoin.state='paused';
await act(async()=>root3.render(React.createElement(Host2,{view:'network'})));await flush();
assert.deepEqual([document.querySelector('[data-network-join]')&&document.querySelector('[data-network-join]').dataset.networkJoin,!!document.querySelector('iframe'),!!document.querySelector('button')],['paused',false,false],'a paused person is told, with no frame and nothing to press');
await act(async()=>root3.unmount());
const root4=createRoot(document.getElementById('root'));uiJoin.fail=true;
await act(async()=>root4.render(React.createElement(Host2,{view:'network'})));await flush();
assert.deepEqual([document.querySelector('[data-network-join]')&&document.querySelector('[data-network-join]').dataset.networkJoin,!!document.querySelector('iframe')],['error',false],'when DYFRENT cannot answer: a Try again card, never the frame');
await act(async()=>root4.unmount());
// DYFRENT issue 1488 >> the Network in Midwest's bell.
const bellFake={status:200,body:{ok:true,messages:3,agents:0,requests:1,intros:0,decide:0,work:4}};const bellPosts=[];
globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);bellPosts.push(b);return {status:bellFake.status,json:async()=>bellFake.body};};
const bellWent=[];let setBellPage;
function BellHost({st,screen}){const [page,setPage]=React.useState('dashboard');setBellPage=setPage;return React.createElement(E.NetworkBell,{pilotState:st,page,screen,setPage:p=>{bellWent.push(p);setPage(p);}});}
const q=(sel)=>document.querySelector(sel);
const root5=createRoot(document.getElementById('root'));
await act(async()=>root5.render(React.createElement(BellHost,{st:{checked:true,pilot:true,session:false}})));await flush();
assert.deepEqual([bellPosts.length,document.getElementById('root').innerHTML],[0,''],'no verified Network session: no bell and nothing asked');
await act(async()=>root5.render(React.createElement(BellHost,{st:{checked:true,pilot:true,session:true}})));await flush();
assert.deepEqual(bellPosts,[{op:'bell'}],'with a session the bell asks once for its counts');
assert.equal(q('[data-network-bell-count]')&&q('[data-network-bell-count]').textContent,'4','the badge counts what needs the person (3 messages and 1 request), not the 4 work requests that fit them');
assert.match(q('[data-network-bell] button').getAttribute('aria-label'),/^4 waiting on the DYFRENT Network$/,'the bell says what it counts');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.deepEqual([...document.querySelectorAll('[data-network-bell-row]')].map(b=>b.dataset.networkBellRow+':'+b.textContent),['messages:3unread messages','requests:1connection request','work:4work requests that fit you'],'the panel lists only what is waiting, singular and plural right');
assert.ok(!/[\u2013\u2014]/.test(q('[data-network-bell]').textContent),'no em dash in the bell');
assert.ok([...document.querySelectorAll('[data-network-bell-panel] button')].every(b=>parseInt(b.style.minHeight,10)>=40),'every row is a comfortable target');
await act(async()=>{q('[data-network-bell-row="messages"]').click()});await flush();
assert.deepEqual([bellWent.at(-1),!!q('[data-network-bell-panel]')],['netmessages',false],'unread messages open the Messages tab and close the panel');
bellFake.body={ok:true,messages:0,agents:0,requests:0,intros:0,decide:0,work:0};const before=bellPosts.length;
await act(async()=>setBellPage('dashboard'));await flush();
assert.equal(bellPosts.length,before+1,'coming back from a Network tab reads the bell again');
assert.equal(q('[data-network-bell-count]'),null,'nothing waiting: no badge');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.match(q('[data-network-bell-panel]').textContent,/Nothing new on the Network\./,'an empty panel says so');
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
assert.equal(q('[data-network-bell-panel]'),null,'Escape closes the panel');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
await act(async()=>{document.body.dispatchEvent(new window.MouseEvent('mousedown',{bubbles:true}))});await flush();
assert.equal(q('[data-network-bell-panel]'),null,'a click outside closes the panel');
const quiet=bellPosts.length;
await act(async()=>setBellPage('jobs'));await flush();
assert.equal(bellPosts.length,quiet,'moving between Midwest pages asks nothing');
// Ask Jarvis about this screen, from the bell.
await act(async()=>root5.render(React.createElement(BellHost,{st:{checked:true,pilot:true,session:true},screen:'Job Records'})));await flush();
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.ok(q('[data-network-ask-open]'),'the panel offers Ask Jarvis about this screen');
await act(async()=>{q('[data-network-ask-open]').click()});await flush();
assert.match(q('[data-network-ask]').textContent,/About the Job Records screen/,'the question names the screen the person is on');
assert.match(q('[data-network-ask]').textContent,/nothing else from Midwest/,'and says what Jarvis gets');
assert.equal(document.activeElement&&document.activeElement.tagName,'TEXTAREA','the question box takes focus');
assert.equal(q('[data-network-ask-send]').disabled,true,'nothing to send until something is written');
const ta=q('#network-ask-text');const setTa=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
await act(async()=>{setTa.call(ta,'Can this show the PO date?');ta.dispatchEvent(new window.Event('input',{bubbles:true}))});await flush();
await act(async()=>{window.dispatchEvent(new window.Event('resize'))});await flush();
assert.ok(q('[data-network-ask]'),'a phone keyboard opening (a resize) does not close the question');
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.equal(q('#network-ask-text')&&q('#network-ask-text').value,'Can this show the PO date?','closing the panel keeps the draft');
bellFake.body={ok:false,error:'You have sent a lot today. Try again tomorrow.'};bellFake.status=429;
let nAsk=bellPosts.length;
await act(async()=>{q('[data-network-ask-send]').click()});await flush();
const askPost=bellPosts.filter(x=>x.op==='ask').at(-1);
assert.deepEqual([Object.keys(askPost).sort().join(),askPost.screen,askPost.text],['nonce,op,screen,text','Job Records','Can this show the PO date?'],'Send asks the server with the screen name, the words and the draft\'s nonce only');
assert.match(askPost.nonce,/^[a-z0-9]{8,40}$/,'the nonce has the shape the server accepts');
assert.equal(document.activeElement&&document.activeElement.id,'network-ask-text','after a refusal the question box has focus again');
assert.match(q('[data-network-ask] [role=alert]').textContent,/sent a lot today/,'a refusal is shown');
assert.equal(q('#network-ask-text').value,'Can this show the PO date?','and the words are not lost');
bellFake.status=200;bellFake.body={ok:true,thread:'awt-1',messages:0,agents:0,requests:0,intros:0,decide:0,work:0};
await act(async()=>{q('[data-network-ask-send]').click()});await flush();
const nonceRetry=bellPosts.filter(x=>x.op==='ask').at(-1).nonce;
assert.equal(nonceRetry,askPost.nonce,'the retry of the same draft carries the same nonce');
assert.match(q('[data-network-ask-sent]').textContent,/Sent to Jarvis/,'sent: says where the answer will arrive');
assert.equal(q('[data-network-ask-sent]').getAttribute('role'),'status','the sent note is announced');
await flush();assert.match(document.activeElement&&document.activeElement.textContent||'',/Done/,'focus moves to Done');
await act(async()=>{[...q('[data-network-ask-sent]').querySelectorAll('button')].find(x=>/Open Messages/.test(x.textContent)).click()});await flush();
assert.deepEqual([bellWent.at(-1),!!q('[data-network-bell-panel]')],['netmessages',false],'Open Messages goes to the Messages tab');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
await act(async()=>{q('[data-network-ask-open]').click()});await flush();
assert.equal(q('#network-ask-text').value,'','after sending, the next question starts empty');
// A draft keeps the screen it was started on.
await act(async()=>{const t=q('#network-ask-text');setTa.call(t,'Where did my filter go?');t.dispatchEvent(new window.Event('input',{bubbles:true}))});await flush();
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
await act(async()=>root5.render(React.createElement(BellHost,{st:{checked:true,pilot:true,session:true},screen:'Tasks'})));await flush();
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.match(q('[data-network-ask]').textContent,/About the Job Records screen/,'a draft started on Job Records still names Job Records on another screen');
const asksBefore=bellPosts.filter(x=>x.op==='ask').length;
await act(async()=>{const b=q('[data-network-ask-send]');b.click();b.click();});await flush();
assert.equal(bellPosts.filter(x=>x.op==='ask').length,asksBefore+1,'a double press sends once');
assert.equal(bellPosts.filter(x=>x.op==='ask').at(-1).screen,'Job Records','and is sent under the screen it was written about');
await act(async()=>{[...q('[data-network-ask-sent]').querySelectorAll('button')].find(x=>/Done/.test(x.textContent)).click()});await flush();
await act(async()=>{q('[data-network-ask-open]').click()});await flush();
assert.match(q('[data-network-ask]').textContent,/About the Tasks screen/,'a new question names the screen the person is on now');
await act(async()=>{window.dispatchEvent(new window.Event('blur'))});await flush();
assert.equal(q('[data-network-bell-panel]'),null,'a click into the Network frame closes the panel even while asking');
assert.ok(!/[\u2013\u2014]/.test(q('[data-network-bell]').textContent),'no em dash in Ask Jarvis');
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
bellFake.status=200;bellFake.body={ok:true,messages:2,agents:0,requests:0,intros:0,decide:0,work:0};
let n0=bellPosts.length;
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.equal(q('[data-network-bell-count]').textContent,'2','opening the bell always reads it fresh');
assert.ok(q('[data-network-bell-panel]').contains(document.activeElement)&&document.activeElement.tagName==='BUTTON','opening moves focus into the panel');
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
assert.equal(document.activeElement,q('[data-network-bell] button'),'Escape returns focus to the bell');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
await act(async()=>{window.dispatchEvent(new window.Event('resize'))});await flush();
assert.equal(q('[data-network-bell-panel]'),null,'a resize or rotation closes the panel instead of leaving it adrift');
await act(async()=>{q('[data-network-bell] button').click()});await flush();
await act(async()=>{window.dispatchEvent(new window.Event('blur'))});await flush();
assert.equal(q('[data-network-bell-panel]'),null,'a click into the Network frame (the page loses focus) closes the panel');
n0=bellPosts.length;
Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
await act(async()=>{document.dispatchEvent(new window.Event('visibilitychange'))});await flush();
await act(async()=>{document.dispatchEvent(new window.Event('visibilitychange'))});await flush();
assert.equal(bellPosts.length,n0,'flipping back to the page right after a read asks nothing more');
bellFake.status=503;bellFake.body={ok:false,error:'down'};
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.equal(q('[data-network-bell-count]')&&q('[data-network-bell-count]').textContent,'2','a passing failure keeps the last counts; the bell does not jump away');
await act(async()=>{document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))});await flush();
bellFake.status=403;bellFake.body={ok:false,code:'forbidden'};
await act(async()=>{q('[data-network-bell] button').click()});await flush();
assert.equal(document.getElementById('root').innerHTML,'','once DYFRENT refuses the person (paused), the bell goes');
await act(async()=>root5.unmount());
bellFake.status=403;bellFake.body={ok:false,code:'forbidden'};
const root6=createRoot(document.getElementById('root'));
await act(async()=>root6.render(React.createElement(BellHost,{st:{checked:true,pilot:true,session:true}})));await flush();
assert.equal(document.getElementById('root').innerHTML,'','a person DYFRENT does not answer for (waiting or paused) sees no bell');
await act(async()=>root6.unmount());
assert.equal(E.BELL_EVERY_MS,120000,'the bell reads every two minutes while the page is visible');
assert.equal(E.bellTotal({messages:1,agents:2,requests:3,intros:4,decide:5,work:6}),15,'the badge adds everything but work that fits');
console.error=origErr;
console.log('PASS DYFRENT Network in Midwest: broker and tabs ('+(mutantIdx<0?'source':'mutant '+mutantIdx)+')');
