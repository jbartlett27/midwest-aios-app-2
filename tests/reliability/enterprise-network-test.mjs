import {JSDOM} from 'jsdom';import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';import {createRequire} from 'node:module';
import {createHmac, createHash} from 'node:crypto';
// The DYFRENT Network inside Midwest (issue 3): the server broker (api/enterprise-network.js) and the tabs' relay
// (src/enterprise.jsx). Made-up people and keys; no network, no database: fetch is a stand-in that plays Midwest's
// users table and DYFRENT's door (which checks the signature exactly the way api/_enterprise_network.js does).
const mutantIdx=process.argv.includes('--mutant')?Number(process.argv[process.argv.indexOf('--mutant')+1]):-1;
const MUTANTS=[
  ['only Midwest pages may ask the server','api/enterprise-network.js',"if (!appOrigins(env).includes(String((req.headers && req.headers.origin) || '')))","if (false)"],
  ['a Network call needs a pilot session','api/enterprise-network.js',"if (!s || !pilot.includes(s.id)) return say(401","if (!s) return say(401"],
  ['the session cookie is checked against its signature','api/enterprise-network.js',"if (!body || !sig || !same(sig, createHmac('sha256', key).update(body).digest('base64url'))) return null;","if (!body) return null;"],
  ['the session cookie is HttpOnly','api/enterprise-network.js',"; HttpOnly; Secure; SameSite=Strict","; Secure"],
  ['only pilot logins get a session','api/enterprise-network.js',"if (!pilot.includes(u.id)) return say(200, { ok: false, pilot: false });",""],
  ['the relay answers only the DYFRENT frame','src/enterprise.jsx',"if (!f || e.source !== f.contentWindow || e.origin !== NETWORK_APP) return;","if (!f) return;"],
  ['the frame call cannot name another kind of op','api/enterprise-network.js',"if (!kind || !(kind === 'net' ? NET_OP : PROFILE_OP).test(inner))","if (!kind)"],
  ['an expired session is refused','api/enterprise-network.js',"|| s.e <= now) return null;",") return null;"],
];
const read=(f)=>{const t=fs.readFileSync('../../'+f,'utf8');if(mutantIdx<0||MUTANTS[mutantIdx][1]!==f)return t;assert.ok(t.includes(MUTANTS[mutantIdx][2]),'mutation anchor missing: '+MUTANTS[mutantIdx][0]);return t.replace(MUTANTS[mutantIdx][2],MUTANTS[mutantIdx][3]);};
const bundle=async(file,platform)=>{const r=await build({stdin:{contents:read(file),resolveDir:'../../'+file.split('/').slice(0,-1).join('/'),sourcefile:file,loader:file.endsWith('.jsx')?'jsx':'js'},bundle:true,write:false,format:'esm',platform,external:['react','react-dom','node:crypto'],jsx:'transform'});const out='./.enterprise-'+platform+'.mjs';fs.writeFileSync(out,r.outputFiles[0].text);try{return await import(out+'?'+Date.now())}finally{fs.rmSync(out)}};

// ── 1. The broker ─────────────────────────────────────────────────────────
const B=await bundle('api/enterprise-network.js','node');
const KEY='b'.repeat(40),SKEY='s'.repeat(40),NOW=Date.parse('2026-11-23T15:00:00Z');
const env={ENTERPRISE_NETWORK_PREVIEW:'on',ENTERPRISE_INSTALLATION_ID:'midwest',ENTERPRISE_BROKER_KEY:KEY,ENTERPRISE_SESSION_KEY:SKEY,ENTERPRISE_PILOT_USERS:'USR-000,USR-001',ENTERPRISE_APP_ORIGIN:'https://midwestaios.com,https://www.midwestaios.com',ENTERPRISE_NETWORK_ENDPOINT:'https://www.dyfrent.app/api/mcp?s=enterprise'};
const USERS=[{id:'USR-001',username:'maureen',password:'pw-maureen',name:'Maureen Welter',role:'admin'},{id:'USR-002',username:'dave',password:'pw-dave',name:'Dave Welter',role:'admin'}];
let sent=[];
const fakeFetch=async(url,init={})=>{
  const u=new URL(url);
  if(u.hostname==='kogjthgceejpzxnekprr.supabase.co'){const name=decodeURIComponent((u.search.match(/username=eq\.([^&]*)/)||[])[1]||''),pw=decodeURIComponent((u.search.match(/password=eq\.([^&]*)/)||[])[1]||'');const row=USERS.find(x=>x.username===name&&x.password===pw);return {ok:true,status:200,json:async()=>row?[{id:row.id,name:row.name,role:row.role}]:[]};}
  if(u.hostname==='www.dyfrent.app'){const b=JSON.parse(init.body);sent.push(b);
    // DYFRENT's own check (api/_enterprise_network.js brokerText / brokerSignature)
    const text=['dyfrent.enterprise/1',b.installation,b.nonce,b.issued_at,createHash('sha256').update(JSON.stringify(b.request)).digest('hex')].join('\n');
    const good=createHmac('sha256',KEY).update(text).digest('hex')===init.headers['X-Enterprise-Signature'];
    if(!good)return {status:401,json:async()=>({ok:false,code:'unauthorized'})};
    if(b.request.kind==='session')return {status:200,json:async()=>({ok:true,member:{name:b.request.name,role:'admin'}})};
    return {status:200,json:async()=>({ok:true,echo:{kind:b.request.kind,op:b.request.op,subject:b.request.subject,payload:b.request.payload}})};}
  throw new Error('unexpected fetch '+url);
};
const handler=B.enterpriseBroker(env,{fetch:fakeFetch,now:()=>NOW});
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
assert.deepEqual([...read('api/enterprise-network.js').matchAll(/SB \+ '\/([a-z_]+)/g)].map(m=>m[1]),['users'],'the broker reads one Midwest table, users (the sign-in check), and no business table');

// ── 2. The tabs and the relay ─────────────────────────────────────────────
const dom=new JSDOM('<div id="root"></div>',{url:'https://midwestaios.com/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MessageEvent:dom.window.MessageEvent,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
const posts=[];
globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);posts.push(b);
  const answer=b.op==='status'?{ok:true,pilot:b.user==='USR-001',session:false}:b.op==='login'?(b.password==='pw-maureen'?{ok:true,pilot:true}:{ok:false,error:'That username and password did not match.'}):b.op==='hello'?{ok:true,member:{name:'Maureen Welter',role:'admin',key:'k'}}:{ok:true,echo:b};
  return {status:b.op==='login'&&b.password!=='pw-maureen'?401:200,json:async()=>answer};};
const req=createRequire(import.meta.url);const React=req('react');const {createRoot}=req('react-dom/client');const {act}=React;
const origErr=console.error;console.error=(...a)=>{if(/act\(|not wrapped/.test(String(a[0])))return;origErr(...a)};
const E=await bundle('src/enterprise.jsx','browser');
assert.deepEqual(E.NETWORK_PAGES.map(p=>p.label),['Profile','Network','Messages'],'three new tabs: Profile, Network, Messages');
const root=createRoot(document.getElementById('root'));
let pilot;
function Host({user,view}){const [st,setSt]=E.useNetworkPilot(user);pilot=st;return React.createElement(E.NetworkPage,{view,currentUser:user,pilotState:st,setPilotState:setSt});}
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
await act(async()=>root.unmount());
console.error=origErr;
console.log('PASS DYFRENT Network in Midwest: broker and tabs ('+(mutantIdx<0?'source':'mutant '+mutantIdx)+')');
