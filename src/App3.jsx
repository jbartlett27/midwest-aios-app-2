import React, { useState, useEffect, useRef } from "react";
import { db } from "./supabase.js";
import { useUser, useClerk, SignIn, UserButton, useAuth } from "@clerk/clerk-react";
import{BarChart,Bar as RBar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell}from"recharts";
import { AnimNum, AnimatedNumber, BANK_LIABILITY_CATEGORIES, BANK_REVIEW_QUEUE_ID, BANK_RULES_ID, BANK_RULE_DEFAULTS, BANK_STALE_BUNDLE_MSG, Badge, Bar, Btn, Card, Header, I, applyBankRules, bankCategoryType, bankCheckNumber, bankChecksMatch, bankSyncBundleIsCurrent, bankTxnAcctKey, bankTxnFingerprint, fmt, inputStyle, parseBankRules, parseLocalDate, planPlaidImport, shipKey, statusColor } from "./App.jsx";
// ---------------------------------------------------------------
// Vendor bills (Sep 2026). A bill entered the way QuickBooks enters one: vendor,
// bill date, due date, and category lines that must add up to the bill total.
// The bill lives in sops as cat "VendorBill" and its lines flow into the P&L by
// category ON THE BILL DATE (accrual). Paying a bill records a payment on the
// bill and, when matched, stamps the bank-feed row with billId and moves it to
// the "Bill Payment" category, which is a movement category (like Transfer) so
// the same dollars are never counted twice. Record shape:
// {id, vendorId, vendorName, ref, date, dueDate, memo, total,
//  lines:[{category, amount, memo}],
//  payments:[{id, date, amount, method, ref, txnId, txnDescription}],
//  void, createdAt, createdBy}
// ---------------------------------------------------------------
const FIN_DEFAULT_CATEGORIES=['Uncategorized','Revenue - Product Sales','Revenue - Shipping','Revenue - Installation','COGS - Vendor Payments','COGS - Freight','Operating - Rent','Operating - Utilities','Operating - Insurance','Operating - Office Supplies','Operating - Commissions','Operating - Payroll','Operating - Marketing','Operating - Professional Services','Tax Payment','Transfer','Owner Draw','Owner Investment','Bill Payment','Refund','Other'];
const BILL_PAYMENT_CATEGORY='Bill Payment';
const VENDOR_BILL_PREFIX='VB-';
const _vbMoney=(n)=>{const v=Number(n);return isFinite(v)?Math.round(v*100)/100:0};
const parseVendorBills=(customSops)=>(Array.isArray(customSops)?customSops:[]).filter(s=>s&&s.cat==='VendorBill').map(s=>{let d=null;try{d=JSON.parse(s.content)}catch{d=null}return d&&typeof d==='object'&&!Array.isArray(d)?{...d,id:s.id}:null}).filter(Boolean);
const billLinesTotal=(lines)=>_vbMoney((Array.isArray(lines)?lines:[]).reduce((s,l)=>s+(Number(l&&l.amount)||0),0));
const billTotal=(b)=>{const t=Number(b&&b.total);return isFinite(t)&&t>0?_vbMoney(t):billLinesTotal(b&&b.lines)};
const billPaidTotal=(b)=>_vbMoney((Array.isArray(b&&b.payments)?b.payments:[]).reduce((s,p)=>s+(Number(p&&p.amount)||0),0));
const billBalance=(b)=>Math.max(0,_vbMoney(billTotal(b)-billPaidTotal(b)));
const billStatus=(b)=>{if(b&&b.void===true)return 'void';const t=billTotal(b);const p=billPaidTotal(b);if(t<=0.005)return 'open';if(p>=t-0.005)return 'paid';if(p>0.005)return 'partial';return 'open'};
// Categories a bill line may use: everything on the Financials list except the
// revenue side, the movement categories and the placeholders. Card and loan payments
// are balance-sheet movements (Sep 2026): a bill line filed there would vanish from the P&L.
const billLineCategories=(categories)=>(Array.isArray(categories)?categories:[]).filter(c=>c&&!/^Revenue/i.test(c)&&!['Uncategorized','Transfer','Owner Draw','Owner Investment','Refund',BILL_PAYMENT_CATEGORY].includes(c)&&!BANK_LIABILITY_CATEGORIES.includes(c));
// Amount already linked to bill payments, per bank transaction id, across every
// live bill. A check that paid two bills is linked twice; its remaining unlinked
// amount is what the next match can still claim.
const billLinkedByTxn=(bills)=>{const m={};(Array.isArray(bills)?bills:[]).forEach(b=>{if(!b||b.void===true)return;(Array.isArray(b.payments)?b.payments:[]).forEach(p=>{if(p&&p.txnId)m[p.txnId]=_vbMoney((m[p.txnId]||0)+(Number(p.amount)||0))})});return m};
// Rank bank-feed rows as candidates for a bill payment: exact amount first, then
// a vendor-name hit in the description (worth more than date closeness, because
// a payee name is the strongest human signal after the amount), then closeness
// in date to the due date and the bill date. Rows already fully linked drop out; a vendor bill only ever
// matches money going OUT.
const rankBankMatches=(txns,bill,wantAmount,linkedMap,query)=>{const q=String(query||'').trim().toLowerCase();const vendor=String((bill&&bill.vendorName)||'').toLowerCase();const vWords=vendor.split(/[^a-z0-9]+/).filter(w=>w.length>2);const want=_vbMoney(wantAmount);const due=parseLocalDate(bill&&bill.dueDate)||parseLocalDate(bill&&bill.date);const bd=parseLocalDate(bill&&bill.date);const out=[];(Array.isArray(txns)?txns:[]).forEach(t=>{if(!t||t.type!=='expense')return;const amt=_vbMoney(t.amount);if(amt<=0)return;const remaining=_vbMoney(amt-((linkedMap&&linkedMap[t.id])||0));if(remaining<=0.005)return;const desc=String(t.description||'').toLowerCase();if(q&&!desc.includes(q)&&!String(t.date||'').includes(q)&&!String(amt).includes(q))return;let score=0;const exact=want>0&&(Math.abs(remaining-want)<0.005||Math.abs(amt-want)<0.005);if(exact)score+=100;const td=parseLocalDate(t.date);if(td){const ref=due||bd;if(ref){const days=Math.abs(Math.round((td-ref)/86400000));score+=Math.max(0,30-Math.min(30,days))}if(bd&&td<bd)score-=15}const dWords=desc.split(/[^a-z0-9]+/).filter(w=>w.length>2);if(vWords.some(w=>desc.includes(w))||vWords.some(w=>dWords.some(d=>d.slice(0,3)===w.slice(0,3))))score+=50;out.push({t,remaining,score,exact})});return out.sort((a,b)=>b.score-a.score||String(b.t.date||'').localeCompare(String(a.t.date||'')))};

function FinancialsPage({jobs,lineItems,vendors,customers,reps,getJobFinancials,getJobItems,_commissionFor,_bankTxnHash,notify,triggerPrint,dateFilter,jobNum,customSops,addSop,deleteSop,...fCtx}){
  const [tab,setTab]=useState("overview");
  // ---- GENERAL LEDGER (Phase 1): chart of accounts + period close state ----
  const [glAccounts,setGlAccounts]=useState(null);
  const [glLocks,setGlLocks]=useState([]);
  const [coaSearch,setCoaSearch]=useState('');
  const [coaShowInactive,setCoaShowInactive]=useState(false);
  const [coaOpen,setCoaOpen]=useState({});
  const [coaEditing,setCoaEditing]=useState(null);
  const [coaForm,setCoaForm]=useState({number:'',name:'',type:'expense',description:''});
  const [closeYear,setCloseYear]=useState(2026);
  const [closeMonth,setCloseMonth]=useState(null);
  const [closeOverrides,setCloseOverrides]=useState({});
  const [closeAsk,setCloseAsk]=useState(false);
  const [reopenAsk,setReopenAsk]=useState(false);
  const [reopenReason,setReopenReason]=useState('');
  const [reconDraft,setReconDraft]=useState({});
  const [attachTxn,setAttachTxn]=useState(null);
  const [attachBusy,setAttachBusy]=useState(false);
  const [lateOpen,setLateOpen]=useState(false);
  // Bank review (Sep 2026). tombstones = live rows of bank_txn_tombstones (every deleted
  // bank row, so a sync cannot bring it back); null until the first read lands.
  const [tombstones,setTombstones]=useState(null);
  const [reviewRecOnly,setReviewRecOnly]=useState(false);
  const [reviewDupLimit,setReviewDupLimit]=useState(40);
  const [reviewBusy,setReviewBusy]=useState(false);
  const [ruleDraft,setRuleDraft]=useState({match:'',mode:'contains',category:'',direction:'out'});
  const [ruleApplyOpen,setRuleApplyOpen]=useState(false);
  const _reloadGl=async()=>{const[a,l,tb]=await Promise.all([db.fetchAccounts(),db.fetchPeriodLocks(),db.fetchTombstones().catch(()=>null)]);if(a)setGlAccounts(a);if(l)setGlLocks(l);if(tb)setTombstones(tb)};
  // The DB trigger writes the tombstone, and deleteSop does not hand back its promise:
  // show the deletion at once with a local stand-in, then re-read the real list.
  const _reloadTombs=async()=>{const tb=await db.fetchTombstones().catch(()=>null);if(tb)setTombstones(tb)};
  const _noteDeleted=(rows)=>{const list=(Array.isArray(rows)?rows:[rows]).filter(t=>t&&t.id);if(!list.length)return;const at=new Date().toISOString();setTombstones(prev=>[...(prev||[]),...list.map(t=>({id:'local-'+t.id,sopId:t.id,plaidId:t.plaidId||null,fingerprint:bankTxnFingerprint(t),acctKey:bankTxnAcctKey(t)||null,account:t.account||'',date:t.date||'',amount:String(t.amount==null?'':t.amount),description:t.description||'',category:t.category||'',deletedAt:at,restoredAt:null,note:'',_local:true}))]);setTimeout(_reloadTombs,1500)};
  useEffect(()=>{_reloadGl()},[]);
  const _closedSet=new Set((glLocks||[]).filter(l=>l.status==='closed').map(l=>l.period));
  const _periodOf=(d)=>String(d||'').slice(0,7);
  const _isLockedDate=(d)=>_closedSet.has(_periodOf(d));
  const _lockMsg=(d)=>'Period '+_periodOf(d)+' is closed. Post a prior-period adjustment dated in an open period, or reopen it from the Close tab.';
  const _glUser=(fCtx.currentUser&&(fCtx.currentUser.name||fCtx.currentUser.email))||'admin';
  const _glIsAdmin=fCtx.userRole==='admin'||!fCtx.userRole;
  const _lateArrivals=(()=>{const r=(customSops||[]).find(s2=>s2.id==='LATE_ARRIVALS_GLOBAL');if(!r)return[];try{const a=JSON.parse(r.content);return Array.isArray(a)?a:[]}catch{return[]}})();
  const now=new Date();
  const [period,setPeriod]=useState("ytd");
  const [dateFrom,setDateFrom]=useState(()=>{const d=new Date(now.getFullYear(),0,1);return d.toISOString().split("T")[0]});
  const [dateTo,setDateTo]=useState(()=>now.toISOString().split("T")[0]);
  // Banking / manual transaction state
  const [manualForm,setManualForm]=useState({date:'',description:'',category:'',amount:'',type:'expense',account:'Operating'});
  const [manualEditing,setManualEditing]=useState(null);
  // Vendor bills (QuickBooks-style bill entry) -- see the helpers above FinancialsPage.
  const [billForm,setBillForm]=useState(null);
  const [billPay,setBillPay]=useState(null);
  const [billsFilter,setBillsFilter]=useState('open');
  const [billsSearch,setBillsSearch]=useState('');
  const [billOpen,setBillOpen]=useState(null);
  // Initial Plaid state: prefer the cross-device sops record (source of truth)
  // over localStorage. This way, when Maureen opens the app on a fresh device,
  // the Banking tab immediately shows 'connected' instead of flashing 'not connected'
  // for the moment between mount and the customSops effect firing.
  const _plaidConnRec=(customSops||[]).find(s=>s.id==='PLAID_CONN_STATE');
  const _plaidConnData=(()=>{try{return _plaidConnRec?JSON.parse(_plaidConnRec.content||'{}'):{}}catch{return{}}})();
  const [plaidStatus,setPlaidStatus]=useState(()=>{if(_plaidConnData.status)return _plaidConnData.status;try{return localStorage.getItem('mw_plaid_status')||'disconnected'}catch{return 'disconnected'}});
  const [plaidAccessToken,setPlaidAccessToken]=useState(()=>{if(_plaidConnData.accessToken)return _plaidConnData.accessToken;try{return localStorage.getItem('mw_plaid_access_token')||''}catch{return ''}});
  const [plaidBankName,setPlaidBankName]=useState(()=>{if(_plaidConnData.bankName)return _plaidConnData.bankName;try{return localStorage.getItem('mw_plaid_bank_name')||''}catch{return ''}});
  const [plaidLoading,setPlaidLoading]=useState(false);
  const [plaidSyncRange,setPlaidSyncRange]=useState(()=>{try{return localStorage.getItem('mw_plaid_sync_range')||'year'}catch{return 'year'}});
  const [plaidSyncFrom,setPlaidSyncFrom]=useState('');
  const [plaidSyncTo,setPlaidSyncTo]=useState('');
  const [plaidLastSync,setPlaidLastSync]=useState(()=>{if(_plaidConnData.lastSync)return _plaidConnData.lastSync;try{return localStorage.getItem('mw_plaid_last_sync')||''}catch{return ''}});
  // plaidSyncing: true during any Plaid sync (silent or manual). Surfaces a visible
  // indicator so the user can see that the hourly auto-sync is actually firing.
  // plaidSyncError: persistent error message from the most recent silent sync that
  // failed. Cleared on the next successful sync. Without this, silent failures were
  // invisible to the user.
  const [plaidSyncing,setPlaidSyncing]=useState(false);
  // Initialize from localStorage so errors logged by the App-scope auto-sync
  // (which doesn't have access to this setter) are surfaced as soon as the
  // Banking tab mounts. Cleared on next successful sync.
  const [plaidSyncError,setPlaidSyncError]=useState(()=>{try{return localStorage.getItem('mw_plaid_sync_error')||''}catch{return ''}});
  // Watch customSops (Supabase realtime feed) for the cross-device PLAID_CONN_STATE
  // record. When it changes (e.g., user connected on another device), re-derive
  // local React state so the Banking UI immediately reflects the new connection
  // without requiring a page refresh.
  useEffect(()=>{
    try{
      const rec=(customSops||[]).find(s=>s.id==='PLAID_CONN_STATE');
      if(!rec)return;
      const data=JSON.parse(rec.content||'{}');
      if(data.status==='connected'&&data.accessToken){
        if(plaidAccessToken!==data.accessToken)setPlaidAccessToken(data.accessToken);
        if(plaidStatus!=='connected')setPlaidStatus('connected');
        if(data.bankName&&plaidBankName!==data.bankName)setPlaidBankName(data.bankName);
        if(data.lastSync&&(!plaidLastSync||data.lastSync>plaidLastSync))setPlaidLastSync(data.lastSync);
      }else if(data.status==='disconnected'){
        if(plaidStatus!=='disconnected'){
          setPlaidAccessToken('');setPlaidStatus('disconnected');setPlaidBankName('');
        }
      }
    }catch{}
  },[customSops]);
  // Tick state forces a re-render every minute so the "X mins ago" relative-time
  // display under Last Sync stays accurate without requiring user interaction.
  const [,setNowTick]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setNowTick(t=>t+1),60000);return()=>clearInterval(id)},[]);
  const plaidAutoSyncRef=useRef(false);
  const plaidLatestSyncRef=useRef(null);
  const [txnSelected,setTxnSelected]=useState(new Set());
  const [showCatEditor,setShowCatEditor]=useState(false);
  const [newCatName,setNewCatName]=useState('');
  const [editingCat,setEditingCat]=useState(null);
  const [editingCatName,setEditingCatName]=useState('');
  const [showAcctEditor,setShowAcctEditor]=useState(false);
  const [newAcctName,setNewAcctName]=useState('');
  const [bankSearch,setBankSearch]=useState('');
  const [bankCatFilter,setBankCatFilter]=useState('all');
  const [acctFilterOpen,setAcctFilterOpen]=useState(false);
  const acctFilterRef=useRef(null);
  useEffect(()=>{
    if(!acctFilterOpen)return;
    const handler=(e)=>{if(acctFilterRef.current&&!acctFilterRef.current.contains(e.target))setAcctFilterOpen(false)};
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[acctFilterOpen]);
  const [showBankAcctEditor,setShowBankAcctEditor]=useState(false);
  const [acctNicknameDraft,setAcctNicknameDraft]=useState({});
  // Bank statement upload: PDF statements go through Claude Vision (/api/ai-scan,
  // scan_type bank_statement); CSV exports parse locally in the browser.
  // Collapsible statement sections (P&L + Balance Sheet). Keys are section ids;
  // true = expanded to show the underlying jobs/transactions. The PDF exports read
  // the same state, so what prints is exactly what is expanded on screen.
  const [pnlOpen,setPnlOpen]=useState({});
  const [bsOpen,setBsOpen]=useState({});
  const _togglePnl=(k)=>setPnlOpen(prev=>({...prev,[k]:!prev[k]}));
  const _toggleBs=(k)=>setBsOpen(prev=>({...prev,[k]:!prev[k]}));
  const [stmtUploading,setStmtUploading]=useState(false);
  const [stmtAcct,setStmtAcct]=useState('Operating');
  const stmtFileRef=useRef(null);


  // Period presets
  const setPeriodPreset=(p)=>{setPeriod(p);const n=new Date();const y=n.getFullYear();const m=n.getMonth();if(p==="month"){const s=new Date(y,m,1);setDateFrom(s.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="quarter"){const qm=Math.floor(m/3)*3;setDateFrom(new Date(y,qm,1).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="ytd"){setDateFrom(new Date(y,0,1).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="year"){setDateFrom(new Date(y-1,m,n.getDate()).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="all"){setDateFrom("2020-01-01");setDateTo(n.toISOString().split("T")[0])}};


  // Filter jobs by date range
  const fromD=new Date(dateFrom+"T00:00:00");const toD=new Date(dateTo+"T23:59:59");
  // Jobs fall into the selected range by their business REPORTING date (invoice
  // date >> latest delivery >> due date >> created) -- not the date the record was
  // typed into the AIOS. See jobReportDate in App.jsx for why this matters.
  const _finReportDate=fCtx.jobReportDate;
  const filteredJobs=jobs.filter(j=>{const d=new Date(_finReportDate?_finReportDate(j):j.createdDate);return d>=fromD&&d<=toD});
  const filteredItems=lineItems.filter(i=>{const j=jobs.find(jj=>jj.id===i.jobId);if(!j)return false;const d=new Date(j.createdDate);return d>=fromD&&d<=toD});


  // Core calculations (use filteredJobs)
  // Load manual transactions from SOPs
  const manualTxns=(customSops||[]).filter(s=>s.cat==="ManualTxn").map(s=>{try{return{id:s.id,...JSON.parse(s.content)}}catch{return null}}).filter(Boolean);
  // Bank account meta (nicknames + exclusions + persisted filter selection) read at component scope so
  // ALL Financials sub-tabs (Overview, P&L, Balance Sheet, Receivables, Payables, Margins, Reports)
  // respect the user's account choices, not just the Banking tab.
  const _bankAcctMetaRecord=(customSops||[]).find(s=>s.id==='BANK_ACCOUNT_META');
  const _bankAcctMetaGlobal=_bankAcctMetaRecord?(()=>{try{return JSON.parse(_bankAcctMetaRecord.content)||{}}catch{return {}}})():{};
  const _allBankAcctIdsGlobal=Array.from(new Set(manualTxns.map(t=>t.account).filter(Boolean)));
  const _rawSelGlobal=Array.isArray(_bankAcctMetaGlobal._filterSelection)?_bankAcctMetaGlobal._filterSelection:[];
  const _selectedAcctIdsGlobal=_rawSelGlobal.filter(id=>_allBankAcctIdsGlobal.includes(id)&&!_bankAcctMetaGlobal[id]?.excluded);
  const _acctFilterActiveGlobal=_selectedAcctIdsGlobal.length>0;
  const filteredManualTxns=manualTxns.filter(t=>{
    if(t.account&&_bankAcctMetaGlobal[t.account]&&_bankAcctMetaGlobal[t.account].excluded)return false;
    if(_acctFilterActiveGlobal&&!_selectedAcctIdsGlobal.includes(t.account))return false;
    if(!t.date)return true;
    const d=parseLocalDate(t.date)||new Date(t.date);
    return d>=fromD&&d<=toD;
  });
  // P&L "manual" figures count true manual entries only (no plaidId). Plaid bank-feed
  // rows live in the Banking tab as cash flow -- deposits duplicate job invoice revenue
  // and vendor checks duplicate line-item costs, so auto-counting them here
  // double-counted both sides of the P&L.
  // P&L-eligible manual entries. Three exclusions keep the P&L honest:
  //   1. plaidId rows -- Plaid bank feed. Deposits duplicate job invoice revenue and
  //      vendor checks duplicate line-item costs, so they live in Banking as cash flow.
  //   2. source==='statement' rows -- uploaded bank statements. Same bank-feed data,
  //      just arriving by PDF/CSV instead of Plaid; counting them double-counts the
  //      P&L exactly like Plaid rows would.
  //   3. Movement categories (Transfer, Owner Draw, Owner Investment) -- money moving
  //      between accounts or between the business and its owner is never revenue or
  //      expense. This is the QuickBooks reconciliation rule: transfers map to
  //      Transfer and stay off the P&L.
  // ---- Vendor bills: derived data and the write paths. Lines flow into the P&L by
  // category on the BILL date; open balances flow into Payables and the Balance
  // Sheet; a matched bank payment is re-categorized to Bill Payment so it stays off
  // every expense total. ----
  const vendorBillsAll=parseVendorBills(customSops);
  const vendorBills=vendorBillsAll.filter(b=>b.void!==true);
  const _billLinked=billLinkedByTxn(vendorBills);
  const _billInRange=(b)=>{const d=parseLocalDate(b&&b.date);return !!d&&d>=fromD&&d<=toD};
  const billLinesInRange=vendorBills.filter(_billInRange).flatMap(b=>(Array.isArray(b.lines)?b.lines:[]).map((l,i)=>({id:'VBL-'+b.id+'-'+i,_billId:b.id,description:'Bill: '+(b.vendorName||'Vendor')+(b.ref?' #'+b.ref:'')+(l&&l.memo?' -- '+l.memo:''),date:b.date||'',category:(l&&l.category)||'Uncategorized',amount:String(_vbMoney(l&&l.amount)),type:'expense'})));
  const vendorBillExpenses=_vbMoney(billLinesInRange.reduce((s,l)=>s+(parseFloat(l.amount)||0),0));
  const _finCustomCats=(()=>{const r=(customSops||[]).find(s=>s.id==='CUSTOM_CATEGORIES');if(!r)return[];try{const a=JSON.parse(r.content);return Array.isArray(a)?a:[]}catch{return[]}})();
  const _finCategories=[...FIN_DEFAULT_CATEGORIES,..._finCustomCats.filter(c=>!FIN_DEFAULT_CATEGORIES.includes(c))];
  // ---- Bank review (Sep 2026): computed here, not in the tab, so the tab strip can
  // badge it. The bank-feed category list adds the two balance-sheet payment categories.
  const _bankCategories=[...FIN_DEFAULT_CATEGORIES,...BANK_LIABILITY_CATEGORIES.filter(c=>!FIN_DEFAULT_CATEGORIES.includes(c)),..._finCustomCats.filter(c=>!FIN_DEFAULT_CATEGORIES.includes(c)&&!BANK_LIABILITY_CATEGORIES.includes(c))];
  // Queue sop: {held:[rows a sync held back as possible copies], keep:[acctKeys she marked all real]}.
  const _reviewQueue=(()=>{const r=(customSops||[]).find(s=>s.id===BANK_REVIEW_QUEUE_ID);let q=null;try{q=r?JSON.parse(r.content):null}catch{q=null}q=q&&typeof q==='object'&&!Array.isArray(q)?q:{};return {...q,held:Array.isArray(q.held)?q.held.filter(x=>x&&typeof x==='object'):[],keep:Array.isArray(q.keep)?q.keep.map(String):[]}})();
  // A raw bank label is what Plaid writes: ALL_CAPS_WITH_UNDERSCORES (TRANSPORTATION, LOAN_PAYMENTS).
  // A category a person typed (Charitable Contributions, Personal - Non-Business) is never raw,
  // even when it is missing from the category list, so the rules and the recommended delete
  // never overrule a human decision.
  const _isRawBankCat=(c)=>!c||c==='Uncategorized'||(!_bankCategories.includes(c)&&/^[A-Z][A-Z0-9_]*$/.test(String(c)));
  // When a row was created: importedAt, else the ms stamp inside a TXN-<ms>-xxxx id.
  const _txnCreatedMs=(t)=>{const a=Date.parse((t&&t.importedAt)||'');if(isFinite(a))return a;const m=/^TXN-(\d{11,})/.exec(String((t&&t.id)||''));return m?Number(m[1]):0};
  // Possible duplicates: same account, day and amount, more than one row (the memo is what
  // the bank rewrites on a re-id, so it is ignored). The recommended delete is the copy
  // nobody worked on -- no bill match, no receipt, still Uncategorized or a raw bank label
  // -- newest first. A group where every row is categorized and clean gets no
  // recommendation: two real same-day charges happen and only Maureen can tell.
  // (Sep 29 2026) Rows are also joined when they are the same check -- entered by hand on the
  // day it was written, imported again when it cleared. Their dates differ, so the day key never
  // grouped them: four pairs ($27,073.31) were invisible here. A group is every copy of one
  // transaction, joined on either link. In a check group with a hand entry, the bank-feed copy
  // is the one to delete even once a rule has categorized it: the hand entry carries the payee.
  const _reviewDupGroups=(()=>{const keep=new Set(_reviewQueue.keep);const rows=manualTxns.filter(t=>!(t.account&&_bankAcctMetaGlobal[t.account]&&_bankAcctMetaGlobal[t.account].excluded));const par=rows.map((_,i)=>i);const find=(i)=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i]}return i};const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)par[b]=a};const byAk=new Map();const byCk=new Map();rows.forEach((t,i)=>{const k=bankTxnAcctKey(t);if(k){if(byAk.has(k))join(byAk.get(k),i);else byAk.set(k,i)}const n=bankCheckNumber(t.description);if(n){const ck=n+'|'+Math.abs(parseFloat(t.amount)||0).toFixed(2);if(!byCk.has(ck))byCk.set(ck,[]);byCk.get(ck).push(i)}});byCk.forEach(ix=>{for(let a=0;a<ix.length;a++)for(let b=a+1;b<ix.length;b++)if(bankChecksMatch(rows[ix[a]],rows[ix[b]]))join(ix[a],ix[b])});const comp=new Map();rows.forEach((t,i)=>{const r=find(i);if(!comp.has(r))comp.set(r,[]);comp.get(r).push(t)});const out=[];comp.forEach(g=>{if(g.length<2)return;const sorted=[...g].sort((a,b)=>_txnCreatedMs(a)-_txnCreatedMs(b)||String(a.id).localeCompare(String(b.id)));const kind=new Set(sorted.map(t=>t.date||'')).size>1?'check':'same-day';const lead=sorted.find(t=>t.plaidId)||sorted[0];const key=kind==='check'?'ck|'+bankCheckNumber(lead.description)+'|'+Math.abs(parseFloat(lead.amount)||0).toFixed(2)+'|'+(lead.account||''):bankTxnAcctKey(sorted[0]);if(!key||keep.has(key))return;const clean=(t)=>!t.billId&&!(Array.isArray(t.attachments)&&t.attachments.length);let cand=sorted.filter(t=>clean(t)&&_isRawBankCat(t.category));if(!cand.length&&kind==='check'&&sorted.some(t=>!t.plaidId))cand=sorted.filter(t=>clean(t)&&t.plaidId);out.push({key,kind,date:sorted.map(t=>t.date||'').filter(Boolean).sort()[0]||'',amount:Math.abs(parseFloat(lead.amount)||0).toFixed(2),account:lead.account||'',rows:sorted,rec:cand.length?cand[cand.length-1]:null})});return out.sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.key.localeCompare(b.key))})();
  const _reviewCount=_reviewQueue.held.length+_reviewDupGroups.length;
  const _vbToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const _vbPlusDays=(iso,n)=>{const d=parseLocalDate(iso);if(!d)return '';d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const _vbIsDate=(v)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!!parseLocalDate(v);
  const _vbWrite=(b)=>{const {id,...body}=b;addSop({id,title:('Bill '+(body.vendorName||'Vendor')+(body.ref?' #'+body.ref:'')+' '+(body.date||'')+' '+fmt(billTotal(body))).slice(0,80),cat:'VendorBill',icon:'receipt',content:JSON.stringify(body),custom:true})};
  const _vbTxnWrite=(t)=>{const {id,...body}=t;addSop({id,title:body.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify(body),custom:true})};
  const openNewBill=()=>{const today=_vbToday();setBillPay(null);setBillForm({id:null,vendorName:'',vendorId:'',ref:'',date:today,dueDate:_vbPlusDays(today,30),memo:'',total:'',lines:[{category:'',amount:'',memo:''},{category:'',amount:'',memo:''}]})};
  const openEditBill=(b)=>{if(_isLockedDate(b.date)){notify(_lockMsg(b.date),'error');return}setBillPay(null);setBillForm({id:b.id,vendorName:b.vendorName||'',vendorId:b.vendorId||'',ref:b.ref||'',date:b.date||'',dueDate:b.dueDate||'',memo:b.memo||'',total:String(billTotal(b)),lines:(Array.isArray(b.lines)&&b.lines.length?b.lines:[{category:'',amount:'',memo:''}]).map(l=>({category:l.category||'',amount:String(l.amount==null?'':l.amount),memo:l.memo||''}))})};
  const saveBillForm=()=>{
    if(!billForm)return;
    const vendorName=String(billForm.vendorName||'').trim();
    if(!vendorName){notify('Enter the vendor first','error');return}
    if(!_vbIsDate(billForm.date)){notify('Enter the bill date','error');return}
    if(billForm.dueDate&&!_vbIsDate(billForm.dueDate)){notify('Due date must be a full date','error');return}
    if(_isLockedDate(billForm.date)){notify(_lockMsg(billForm.date),'error');return}
    const lines=(billForm.lines||[]).map(l=>({category:String(l.category||'').trim(),amount:_vbMoney(String(l.amount||'').replace(/[$,\s]/g,'')),memo:String(l.memo||'').trim().slice(0,200)})).filter(l=>l.category||l.amount||l.memo);
    if(lines.length===0){notify('Add at least one category line','error');return}
    const bad=lines.find(l=>!l.category||!_finCategories.includes(l.category));
    if(bad){notify('Every line needs a category from the Financials list','error');return}
    if(lines.some(l=>l.amount<=0)){notify('Every line needs an amount above zero','error');return}
    const linesTotal=billLinesTotal(lines);
    const totalRaw=String(billForm.total||'').replace(/[$,\s]/g,'');
    const total=totalRaw===''?linesTotal:_vbMoney(totalRaw);
    if(!(total>0)){notify('Enter the bill total','error');return}
    if(Math.abs(total-linesTotal)>0.005){notify('The category lines add up to '+fmt(linesTotal)+', not '+fmt(total)+' -- fix a line or the total before saving','error');return}
    const existing=billForm.id?vendorBillsAll.find(b=>b.id===billForm.id):null;
    if(existing&&billPaidTotal(existing)>total+0.005){notify('This bill already has '+fmt(billPaidTotal(existing))+' paid against it; the total cannot go below that','error');return}
    const vend=(vendors||[]).find(v=>v&&v.name&&v.name.trim().toLowerCase()===vendorName.toLowerCase());
    const rec={...(existing||{createdAt:new Date().toISOString(),createdBy:_glUser,payments:[]}),id:billForm.id||(VENDOR_BILL_PREFIX+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),vendorName:vend?vend.name:vendorName,vendorId:vend?vend.id:'',ref:String(billForm.ref||'').trim().slice(0,60),date:billForm.date,dueDate:billForm.dueDate||_vbPlusDays(billForm.date,30),memo:String(billForm.memo||'').trim().slice(0,300),total,lines};
    _vbWrite(rec);
    setBillForm(null);setBillOpen(rec.id);
    notify((existing?'Bill updated: ':'Bill entered: ')+rec.vendorName+' '+fmt(total)+' in '+lines.length+' categor'+(lines.length!==1?'ies':'y'));
  };
  const voidBill=async(b)=>{
    if(_isLockedDate(b.date)){notify(_lockMsg(b.date),'error');return}
    const ok=typeof fCtx.confirm==='function'?await fCtx.confirm('Void bill '+(b.vendorName||'')+' '+fmt(billTotal(b))+'? Its lines leave the P&L and any matched bank payments go back to their own category.'):true;
    if(!ok)return;
    const linked=(b.payments||[]).map(p=>p.txnId).filter(Boolean);
    _vbWrite({...b,void:true,voidedAt:new Date().toISOString(),voidedBy:_glUser});
    linked.forEach(txnId=>{const other=vendorBills.some(o=>o.id!==b.id&&(o.payments||[]).some(p=>p.txnId===txnId));if(other)return;const t=manualTxns.find(x=>x.id===txnId);if(!t||!t.billId)return;const {billId,billLinkedCategory,...rest}=t;_vbTxnWrite({...rest,category:billLinkedCategory||'Uncategorized'})});
    if(billOpen===b.id)setBillOpen(null);
    notify('Bill voided: '+(b.vendorName||''));
  };
  const openPayBill=(b)=>{const bal=billBalance(b);setBillForm(null);setBillOpen(b.id);setBillPay({billId:b.id,amount:String(bal),date:_vbToday(),method:'ACH',ref:'',txnId:'',search:''})};
  const pickPayTxn=(t,remaining)=>{setBillPay(p=>{if(!p)return p;const b=vendorBills.find(x=>x.id===p.billId);const bal=b?billBalance(b):0;if(p.txnId===t.id)return {...p,txnId:''};return {...p,txnId:t.id,amount:String(_vbMoney(Math.min(remaining,bal))),date:t.date||p.date}})};
  const recordBillPayment=()=>{
    if(!billPay)return;
    const b=vendorBills.find(x=>x.id===billPay.billId);if(!b){setBillPay(null);return}
    const amount=_vbMoney(String(billPay.amount||'').replace(/[$,\s]/g,''));
    if(!(amount>0)){notify('Enter the payment amount','error');return}
    if(!_vbIsDate(billPay.date)){notify('Enter the payment date','error');return}
    if(_isLockedDate(billPay.date)){notify(_lockMsg(billPay.date),'error');return}
    if(_isLockedDate(b.date)){notify(_lockMsg(b.date),'error');return}
    const bal=billBalance(b);
    if(amount>bal+0.005){notify('That is more than the '+fmt(bal)+' still open on this bill','error');return}
    let txn=null;
    if(billPay.txnId){
      txn=manualTxns.find(x=>x.id===billPay.txnId);
      if(!txn){notify('That bank transaction is no longer here -- pick another or record the payment without a match','error');return}
      if(txn.type!=='expense'){notify('Only money going out can pay a bill','error');return}
      if(_isLockedDate(txn.date)){notify(_lockMsg(txn.date),'error');return}
      const remaining=_vbMoney(_vbMoney(txn.amount)-(_billLinked[txn.id]||0));
      if(amount>remaining+0.005){notify('Only '+fmt(remaining)+' of that bank transaction is still unassigned','error');return}
    }
    const pay={id:'BP-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:billPay.date,amount,method:billPay.method||'ACH',ref:String(billPay.ref||'').trim().slice(0,60),txnId:txn?txn.id:'',txnDescription:txn?String(txn.description||'').slice(0,120):'',recordedAt:new Date().toISOString(),recordedBy:_glUser};
    _vbWrite({...b,payments:[...(b.payments||[]),pay]});
    if(txn&&!txn.billId){_vbTxnWrite({...txn,billId:b.id,billLinkedCategory:txn.category||'',category:BILL_PAYMENT_CATEGORY,type:'expense'})}
    setBillPay(null);
    const after=_vbMoney(bal-amount);
    notify('Payment recorded: '+fmt(amount)+(txn?' matched to the bank feed':'')+(after>0.005?' -- '+fmt(after)+' still open':' -- bill paid in full'));
  };
  const removeBillPayment=async(b,pay)=>{
    if(_isLockedDate(pay.date)){notify(_lockMsg(pay.date),'error');return}
    const ok=typeof fCtx.confirm==='function'?await fCtx.confirm('Remove this '+fmt(pay.amount)+' payment from the bill?'+(pay.txnId?' The bank transaction goes back to its own category.':'')):true;
    if(!ok)return;
    _vbWrite({...b,payments:(b.payments||[]).filter(p=>p.id!==pay.id)});
    if(pay.txnId){const other=vendorBills.some(o=>(o.payments||[]).some(p=>p.txnId===pay.txnId&&p.id!==pay.id));if(!other){const t=manualTxns.find(x=>x.id===pay.txnId);if(t&&t.billId){const {billId,billLinkedCategory,...rest}=t;_vbTxnWrite({...rest,category:billLinkedCategory||'Uncategorized'})}}}
    notify('Payment removed');
  };
  const _plMovementCats=new Set(['Transfer','Owner Draw','Owner Investment',BILL_PAYMENT_CATEGORY]);
  // Also hard-exclude balance-sheet rows (asset/liability by type OR legacy category)
  // so no row can ever count in both the P&L and the Balance Sheet.
  const _isManualPL=t=>!t.plaidId&&!t.billId&&t.source!=='statement'&&!_plMovementCats.has(t.category)&&t.type!=='asset'&&t.type!=='liability'&&t.category!=='asset'&&t.category!=='liability';
  const manualRevenue=filteredManualTxns.filter(t=>t.type==='revenue'&&_isManualPL(t)).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
  const manualExpenses=filteredManualTxns.filter(t=>t.type==='expense'&&_isManualPL(t)).reduce((s,t)=>s+(parseFloat(t.amount)||0),0)+vendorBillExpenses;
  // Asset/liability entries are keyed by TYPE (what the manual-entry Type selector
  // sets). The old category==='asset' test only matched rows whose category text was
  // literally 'asset', so real asset entries with a named category never reached the
  // Balance Sheet. Accept either for backward compatibility.
  const manualAssets=filteredManualTxns.filter(t=>t.type==='asset'||t.category==='asset').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
  const manualLiabilities=filteredManualTxns.filter(t=>t.type==='liability'||t.category==='liability').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
  const totalRev=filteredJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)+manualRevenue;
  const totalCost=filteredJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0)+manualExpenses;
  const grossProfit=totalRev-totalCost;
  const grossMargin=totalRev>0?(grossProfit/totalRev*100):0;
  const paidRev=filteredJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const partialRev=filteredJobs.filter(j=>j.paymentStatus==="partial").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const unpaidRev=filteredJobs.filter(j=>j.paymentStatus==="unpaid"||!j.paymentStatus).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  // Commission is paid on PROFIT (revenue - cost), not revenue. Single source of truth via _commissionFor.
  const totalComm=reps.filter(r=>!r.id.includes("SEED_FLAG")).reduce((s,r)=>{const rate=r.commissionRate||0;if(!rate)return s;return s+filteredJobs.filter(j=>j.salesRep===r.id).reduce((s2,j)=>s2+_commissionFor(j.id,rate),0)},0);
  const netIncome=grossProfit-totalComm;
  // Invoice-issued detection for AR. qtyInvoiced on line items is not maintained by
  // the real workflow (invoices are issued through Documents >> Invoices, which
  // tracks status in docStatuses under the INV- doc number), so gating AR on
  // totalInvoiced alone made every job look never-invoiced and Receivables reported
  // $0.00 owed. A job now counts as invoiced when EITHER its line items carry
  // qtyInvoiced OR its invoice document has any status beyond 'new' (drafted /
  // sent / approved). Reported by Maureen Jul 8 2026 (AR showing $0.00 owed).
  // _stableNumFin and _finDocStatuses were previously declared further down (AP
  // section); they are declared here instead so the AR block can use them too.
  const _stableNumFin=(prefix,a,b)=>prefix+(a||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(b||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
  const _finDocStatuses=(()=>{const allDS=jobs.reduce((acc,j)=>({...acc,...(j.docStatuses||{})}),{});const rec=(customSops||[]).find(s=>s.id==='DOC_STATUSES_GLOBAL');let sopDS={};if(rec){try{sopDS=JSON.parse(rec.content||'{}')}catch{}}let lsDS={};try{lsDS=JSON.parse(localStorage.getItem('mw_doc_statuses_fallback')||'{}')}catch{}return {...allDS,...sopDS,...lsDS};})();
  const _jobInvoiced=(j,f)=>{if((f.totalInvoiced||0)>0)return true;const raw=_finDocStatuses[_stableNumFin('INV-',j.id,j.customer)];const st=(raw&&typeof raw==='object')?raw.status:raw;return !!st&&st!=='new';};
  const arAging={current:0,t30:0,t60:0,t90:0,over90:0};
  filteredJobs.filter(j=>j.paymentStatus!=="paid").forEach(j=>{const f=getJobFinancials(j.id);if(!_jobInvoiced(j,f))return;const inv=j.dueDate?new Date(j.dueDate):new Date(j.createdDate||now);const days=Math.floor((now-inv)/86400000);if(days<=0)arAging.current+=f.totalRevenue;else if(days<=30)arAging.t30+=f.totalRevenue;else if(days<=60)arAging.t60+=f.totalRevenue;else if(days<=90)arAging.t90+=f.totalRevenue;else arAging.over90+=f.totalRevenue});
  const totalAR=arAging.current+arAging.t30+arAging.t60+arAging.t90+arAging.over90;


  // AR by customer breakdown
  const arByCustomer={};
  filteredJobs.filter(j=>j.paymentStatus!=="paid").forEach(j=>{
    const f=getJobFinancials(j.id);if(!_jobInvoiced(j,f))return; // AR = invoiced-but-unpaid only; never-invoiced jobs are not receivables
    const c=customers.find(c2=>c2.id===j.customer);
    const cName=c?.name||"Unknown";const inv=j.dueDate?new Date(j.dueDate):new Date(j.createdDate||now);
    const days=Math.floor((now-inv)/86400000);
    if(!arByCustomer[cName])arByCustomer[cName]={current:0,t30:0,t60:0,t90:0,over90:0,total:0,jobs:0};
    arByCustomer[cName].total+=f.totalRevenue;arByCustomer[cName].jobs++;
    if(days<=0)arByCustomer[cName].current+=f.totalRevenue;
    else if(days<=30)arByCustomer[cName].t30+=f.totalRevenue;
    else if(days<=60)arByCustomer[cName].t60+=f.totalRevenue;
    else if(days<=90)arByCustomer[cName].t90+=f.totalRevenue;
    else arByCustomer[cName].over90+=f.totalRevenue;
  });
  const arCustomerList=Object.entries(arByCustomer).map(([name,d])=>({name,...d})).sort((a,b)=>b.total-a.total);
  const unpaidJobCount=filteredJobs.filter(j=>j.paymentStatus!=="paid"&&_jobInvoiced(j,getJobFinancials(j.id))).length;


  // AP Aging -- what Midwest actually owes vendors: OUTSTANDING BALANCES on vendor
  // bills, using the same bills engine DocumentsPage renders (received-based amounts,
  // payment history, explicit paid/unpaid/void status, deleted flags), aged by days
  // PAST DUE. Replaces the old approximation that counted every ordered item's full
  // cost as owed even when the bill was already paid.
  const _finShipTos=(()=>{const r=(customSops||[]).find(s=>s.id==='LINE_ITEM_SHIP_TO_GLOBAL');if(!r)return {};try{return JSON.parse(r.content)||{}}catch{return {}}})();
  const _finOpenBills=(()=>{
    const out=[];
    filteredJobs.forEach(job=>{
      const items=getJobItems(job.id);
      const groups={};
      items.forEach(i=>{const sv=_finShipTos[i.id];const ship=(sv&&String(sv).trim())?sv:((i.shipTo&&String(i.shipTo).trim())?i.shipTo:'');const key=(i.vendor||'')+'||'+(ship||'');if(!groups[key])groups[key]={vid:i.vendor||'',shipTo:ship||'',items:[]};groups[key].items.push(i);});
      Object.values(groups).forEach(g=>{
        const sk=(typeof shipKey==='function')?shipKey(g.shipTo):'';
        const poDocNum=sk?(_stableNumFin('PO-',job.id,g.vid)+'-S'+sk):_stableNumFin('PO-',job.id,g.vid);
        const poStatus=_finDocStatuses[poDocNum];
        const anyReceived=g.items.some(i=>(Number(i.qtyReceived)||0)>0);
        if(!(poStatus&&poStatus!=='new')&&!anyReceived)return;
        const cost=g.items.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyReceived)||0),0);
        const orderValue=g.items.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyOrdered)||0),0);
        if(orderValue<=0)return;
        const billDocNum='BILL-'+poDocNum.replace('PO-','');
        const billData=typeof _finDocStatuses[billDocNum]==='object'&&_finDocStatuses[billDocNum]?_finDocStatuses[billDocNum]:{};
        if(billData.deleted===true)return;
        if(billData.status==='void')return;
        const _payments=Array.isArray(billData.payments)?billData.payments:(((billData.paid||billData.checkNum||billData.payDate)&&billData.status!=='unpaid'&&billData.status!=='void')?[{amount:cost}]:[]);
        const _totalPaid=_payments.reduce((s,p)=>s+(Number(p.amount)||0),0);
        const _isFullyPaid=cost>0.005&&_totalPaid>=cost-0.005;
        const paid=(billData.status==='void'||billData.status==='unpaid')?false:(billData.status==='paid'?true:_isFullyPaid);
        const owed=paid?0:Math.max(0,cost-_totalPaid);
        if(owed<=0.005)return;
        const poDate=g.items[0]?.poDate||job.createdDate||'';
        const dateOv=_finDocStatuses[billDocNum+'__date']||'';const dueOv=_finDocStatuses[billDocNum+'__due']||'';
        let base=dateOv?new Date(dateOv+'T12:00:00'):(poDate?new Date(poDate):new Date());
        if(!base||isNaN(base.getTime())||base.getFullYear()<2000||base.getFullYear()>2100){const _p=poDate?new Date(poDate):null;base=(_p&&!isNaN(_p.getTime())&&_p.getFullYear()>=2000&&_p.getFullYear()<=2100)?_p:new Date();}
        let due=dueOv?new Date(dueOv+'T12:00:00'):new Date(base.getTime()+30*86400000);
        if(!due||isNaN(due.getTime())||due.getFullYear()<2000||due.getFullYear()>2100)due=new Date(base.getTime()+30*86400000);
        const v=vendors.find(v2=>v2.id===g.vid);
        out.push({vName:v?.name||g.items[0]?.manufacturer||'Unknown',owed,due});
      });
    });
    // Standalone bills (vendor bills entered directly, no PO). VendorCredit records
    // are contra entries and never add to AP.
    (customSops||[]).forEach(s=>{
      if(!s||s.cat!=='StandaloneBill')return;
      let d=null;try{d=JSON.parse(s.content||'{}')}catch{return}
      if(!d||d.paid===true||d.void===true)return;
      const amt=Number(d.amount);if(!isFinite(amt)||amt<=0)return;
      if(d.jobId&&!filteredJobs.some(j=>j.id===d.jobId))return;
      const v=(vendors||[]).find(vv=>vv.id===d.vendorId);
      let due=d.creditDate?new Date(d.creditDate+'T12:00:00'):new Date();
      if(!due||isNaN(due.getTime()))due=new Date();
      out.push({vName:d.vendorName||(v?v.name:'Unknown'),owed:amt,due});
    });
    // Vendor bills entered on the Bills tab: whatever is still unpaid, aged by due date.
    vendorBills.forEach(b=>{const owed=billBalance(b);if(owed<=0.005)return;const bd=parseLocalDate(b.date);if(bd&&bd>toD)return;const due=parseLocalDate(b.dueDate)||bd||new Date();out.push({vName:b.vendorName||'Vendor',owed,due})});
    return out;
  })();
  const apAging={current:0,t30:0,t60:0,t90:0,over90:0};
  const apByVendor={};
  _finOpenBills.forEach(b=>{
    const days=Math.floor((now-b.due)/86400000); // days PAST DUE; <=0 means not yet due
    if(!apByVendor[b.vName])apByVendor[b.vName]={current:0,t30:0,t60:0,t90:0,over90:0,total:0,items:0};
    apByVendor[b.vName].total+=b.owed;apByVendor[b.vName].items++;
    if(days<=0){apAging.current+=b.owed;apByVendor[b.vName].current+=b.owed}
    else if(days<=30){apAging.t30+=b.owed;apByVendor[b.vName].t30+=b.owed}
    else if(days<=60){apAging.t60+=b.owed;apByVendor[b.vName].t60+=b.owed}
    else if(days<=90){apAging.t90+=b.owed;apByVendor[b.vName].t90+=b.owed}
    else{apAging.over90+=b.owed;apByVendor[b.vName].over90+=b.owed}
  });
  const totalAP=apAging.current+apAging.t30+apAging.t60+apAging.t90+apAging.over90;
  const apVendorList=Object.entries(apByVendor).map(([name,d])=>({name,...d})).sort((a,b)=>b.total-a.total);
  // Real bank cash, captured from Plaid at every sync into the BANK_BALANCES_GLOBAL
  // record: sum of depository (checking/savings) current balances. Null until the
  // first sync after this ships -- callers fall back to the old paidRev-AP proxy.
  // Live cash respects the Banking tab's account settings: accounts Maureen has
  // excluded (personal / other-entity accounts on the same bank login) stay out of
  // the Balance Sheet. Matching is by Plaid account id, which the balance snapshot
  // now carries; legacy snapshots without ids fall back to including the account
  // until the next sync refreshes them. Reported by Maureen Aug 1 2026.
  const liveBankCash=(()=>{const r=(customSops||[]).find(s=>s.id==='BANK_BALANCES_GLOBAL');if(!r)return null;try{const d=JSON.parse(r.content||'{}');if(!Array.isArray(d.accounts)||d.accounts.length===0)return null;return d.accounts.filter(a=>(a.type||'')==='depository'&&!(a.id&&_bankAcctMetaGlobal[a.id]&&_bankAcctMetaGlobal[a.id].excluded)).reduce((s,a)=>s+(Number(a.current)||0),0);}catch{return null}})();


  // Monthly revenue data
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Year-aware monthly buckets. The old version filtered to the CURRENT calendar year
  // only, so Past Year / All Time / custom ranges silently dropped prior-year months
  // from the Overview chart. Keys are year+month; labels carry a 'YY suffix for
  // non-current years; chronological sort.
  const monthlyData=(()=>{const curY=new Date().getFullYear();const m={};filteredJobs.forEach(j=>{const _rd=String((_finReportDate?_finReportDate(j):j.createdDate)||'');const mm=/^(\d{4})-(\d{2})/.exec(_rd);let y,mo;if(mm){y=+mm[1];mo=+mm[2]-1}else{const d=new Date(_rd);if(isNaN(d.getTime()))return;y=d.getFullYear();mo=d.getMonth()}if(mo<0||mo>11)return;const k=y+'-'+mo;if(!m[k])m[k]={name:months[mo]+(y!==curY?" '"+String(y).slice(2):""),revenue:0,cost:0,_s:y*12+mo};const f=getJobFinancials(j.id);m[k].revenue+=f.totalRevenue;m[k].cost+=f.totalCost;});return Object.values(m).sort((a,b)=>a._s-b._s).map(o=>({name:o.name,revenue:o.revenue,cost:o.cost,profit:o.revenue-o.cost,margin:o.revenue>0?((o.revenue-o.cost)/o.revenue*100):0}));})();
  // Monthly bank cash flow (deposits vs payments) across the filtered transactions.
  // The cash-basis companion to the accrual Revenue vs Cost chart, and the fast
  // visual check that a statement upload landed in the right months.
  const monthlyBank=(()=>{const curY=new Date().getFullYear();const m={};filteredManualTxns.forEach(t=>{const mm=/^(\d{4})-(\d{2})/.exec(String(t.date||''));if(!mm)return;const y=+mm[1],mo=+mm[2]-1;if(mo<0||mo>11)return;const k=y+'-'+mo;if(!m[k])m[k]={name:months[mo]+(y!==curY?" '"+String(y).slice(2):""),inflow:0,outflow:0,_s:y*12+mo};const amt=parseFloat(t.amount)||0;if(t.type==='revenue')m[k].inflow+=amt;else if(t.type==='expense')m[k].outflow+=amt;});return Object.values(m).sort((a,b)=>a._s-b._s);})();


  // Vendor spend breakdown
  const vendorSpend=vendors.map(v=>{const spend=filteredItems.filter(i=>i.vendor===v.id).reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);return{name:v.name,spend,pct:totalCost>0?(spend/totalCost*100):0}}).filter(v=>v.spend>0).sort((a,b)=>b.spend-a.spend);
  // ---- Statement groupings, shared by the on-screen P&L / Balance Sheet and their
  // PDF exports so both always show identical numbers. ----
  const jobRevTotal=totalRev-manualRevenue;
  const jobCostTotal=totalCost-manualExpenses;
  const _vendorSpendSum=vendorSpend.reduce((s,v)=>s+v.spend,0);
  const _jobCostAdj=jobCostTotal-_vendorSpendSum; // credits + standalone bills + rounding
  const pnlRevCats=(()=>{const m={};filteredManualTxns.filter(t=>t.type==='revenue'&&_isManualPL(t)).forEach(t=>{const c=(t.category&&t.category!=='Uncategorized')?t.category:'Uncategorized Revenue';if(!m[c])m[c]={name:c,total:0,txns:[]};m[c].total+=parseFloat(t.amount)||0;m[c].txns.push(t);});return Object.values(m).sort((a,b)=>b.total-a.total);})();
  const pnlExpCats=(()=>{const m={};[...filteredManualTxns.filter(t=>t.type==='expense'&&_isManualPL(t)),...billLinesInRange].forEach(t=>{const c=(t.category&&t.category!=='Uncategorized')?t.category:'Uncategorized Expenses';if(!m[c])m[c]={name:c,total:0,txns:[]};m[c].total+=parseFloat(t.amount)||0;m[c].txns.push(t);});return Object.values(m).sort((a,b)=>b.total-a.total);})();
  const liveBankAccounts=(()=>{const r=(customSops||[]).find(s2=>s2.id==='BANK_BALANCES_GLOBAL');if(!r)return [];try{const d=JSON.parse(r.content||'{}');return Array.isArray(d.accounts)?d.accounts.filter(a=>(a.type||'')==='depository'&&!(a.id&&_bankAcctMetaGlobal[a.id]&&_bankAcctMetaGlobal[a.id].excluded)):[]}catch{return []}})();
  const arJobsList=filteredJobs.filter(j=>j.paymentStatus!=="paid"&&_jobInvoiced(j,getJobFinancials(j.id))).map(j=>({job:j,amount:getJobFinancials(j.id).totalRevenue,customer:customers.find(c=>c.id===j.customer)?.name||''})).sort((a,b)=>b.amount-a.amount);
  const invItemsList=filteredItems.filter(i=>(i.qtyOrdered||0)>(i.qtyReceived||0)).map(i=>({item:i,value:(i.unitCost||0)*((i.qtyOrdered||0)-(i.qtyReceived||0)),jobName:(jobs.find(j=>j.id===i.jobId)||{}).name||'',jobId:i.jobId})).filter(x=>x.value>0.005).sort((a,b)=>b.value-a.value);
  const commByRep=reps.filter(r=>!r.id.includes("SEED_FLAG")&&(r.commissionRate||0)>0).map(r=>({name:r.name,amount:filteredJobs.filter(j=>j.salesRep===r.id).reduce((s2,j)=>s2+_commissionFor(j.id,r.commissionRate),0)})).filter(x=>x.amount>0.005).sort((a,b)=>b.amount-a.amount);
  const assetTxnsList=filteredManualTxns.filter(t=>t.type==='asset'||t.category==='asset');
  const liabTxnsList=filteredManualTxns.filter(t=>t.type==='liability'||t.category==='liability');
  const _allPnlKeys=()=>{const o={rev_jobs:true,cogs_jobs:true,opex_comm:true};pnlRevCats.forEach(c=>o['revc_'+c.name]=true);pnlExpCats.forEach(c=>o['expc_'+c.name]=true);return o;};
  const _allBsKeys=()=>({bs_cash:true,bs_ar:true,bs_inv:true,bs_assets:true,bs_ap:true,bs_comm:true,bs_liab:true});
  const _periodLabel=new Date(dateFrom+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' \u2013 '+new Date(dateTo+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});


  // Customer revenue
  const custRev=customers.map(c=>{const rev=filteredJobs.filter(j=>j.customer===c.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const jc=filteredJobs.filter(j=>j.customer===c.id).length;return{name:c.name,revenue:rev,jobs:jc,pct:totalRev>0?(rev/totalRev*100):0}}).filter(c=>c.revenue>0).sort((a,b)=>b.revenue-a.revenue);


  const generatePDF=(type)=>{
    const today=new Date().toLocaleDateString();
    const hd='<div style="font-family:Helvetica,Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#111;font-size:12px">';
    const logo='<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px"><div style="font-size:18px;font-weight:700">Midwest Educational Furnishings, Inc.</div></div><div style="font-size:11px;color:#888;margin-bottom:24px">21191 N Valley Rd, Kildeer, IL 60047 US | (847) 847-1865</div>';
    let html=hd+logo;
    if(type==="pnl"){
      // The exported statement mirrors the on-screen collapse state: category rows
      // always print; detail rows print only for categories currently expanded.
      const _pdfCat=(label,sub,amt)=>'<tr style="border-bottom:1px solid #ddd"><td style="padding:7px 12px;font-weight:600;color:#222">'+label+(sub?' <span style="font-weight:400;color:#999;font-size:11px">'+sub+'</span>':'')+'</td><td style="text-align:right;padding:7px 0;font-weight:600;color:#222">$'+amt.toFixed(2)+'</td></tr>';
      const _pdfDet=(label,sub,amt)=>'<tr style="border-bottom:1px solid #f2f2f2"><td style="padding:4px 12px 4px 30px;color:#777;font-size:12px">'+label+(sub?' <span style="color:#bbb;font-size:11px">'+sub+'</span>':'')+'</td><td style="text-align:right;padding:4px 0;color:#777;font-size:12px">$'+amt.toFixed(2)+'</td></tr>';
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Profit & Loss Statement</div><div style="font-size:12px;color:#888;margin-bottom:20px">Generated: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>';
      html+='<tr style="border-bottom:2px solid #222"><td style="padding:10px 0;font-weight:700;font-size:14px">REVENUE</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px">$'+totalRev.toFixed(2)+'</td></tr>';
      html+=_pdfCat('Job Revenue',filteredJobs.length+' jobs',jobRevTotal);
      if(pnlOpen['rev_jobs'])filteredJobs.forEach(j=>{const f=getJobFinancials(j.id);html+=_pdfDet(j.name,'',f.totalRevenue)});
      pnlRevCats.forEach(c=>{html+=_pdfCat(c.name,c.txns.length+' txns',c.total);if(pnlOpen['revc_'+c.name])c.txns.forEach(t=>{html+=_pdfDet(t.description||'Manual entry',t.date||'',parseFloat(t.amount)||0)})});
      html+='<tr style="border-bottom:2px solid #222"><td style="padding:10px 0;font-weight:700;font-size:14px">COST OF GOODS SOLD</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px">$'+totalCost.toFixed(2)+'</td></tr>';
      html+=_pdfCat('Job Costs by Vendor',vendorSpend.length+' vendors',jobCostTotal);
      if(pnlOpen['cogs_jobs']){vendorSpend.forEach(v=>{html+=_pdfDet(v.name,'',v.spend)});if(Math.abs(_jobCostAdj)>0.005)html+=_pdfDet('Adjustments','vendor credits & standalone bills',_jobCostAdj);}
      pnlExpCats.forEach(c=>{html+=_pdfCat(c.name,c.txns.length+' txns',c.total);if(pnlOpen['expc_'+c.name])c.txns.forEach(t=>{html+=_pdfDet(t.description||'Manual expense',t.date||'',parseFloat(t.amount)||0)})});
      html+='<tr style="border-top:2px solid #222;background:#f9f9f9"><td style="padding:10px 0;font-weight:700;font-size:14px">GROSS PROFIT</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px;color:'+(grossProfit>=0?"#059669":"#dc2626")+'">$'+grossProfit.toFixed(2)+' ('+grossMargin.toFixed(1)+'%)</td></tr>';
      html+='<tr style="border-bottom:2px solid #222"><td style="padding:10px 0;font-weight:700;font-size:14px">OPERATING EXPENSES</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px">$'+totalComm.toFixed(2)+'</td></tr>';
      html+=_pdfCat('Sales Commissions',commByRep.length+' reps',totalComm);
      if(pnlOpen['opex_comm'])commByRep.forEach(r2=>{html+=_pdfDet(r2.name,'',r2.amount)});
      html+='<tr style="border-top:3px double #222;background:#f0fdf4"><td style="padding:12px 0;font-weight:700;font-size:16px">NET INCOME</td><td style="text-align:right;padding:12px 0;font-weight:700;font-size:16px;color:'+(netIncome>=0?"#059669":"#dc2626")+'">$'+netIncome.toFixed(2)+'</td></tr>';
      html+='</tbody></table>';
    } else if(type==="ar"){
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Accounts Receivable Aging</div><div style="font-size:12px;color:#888;margin-bottom:20px">As of: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #222"><th style="text-align:left;padding:8px 0">Customer / Job</th><th style="text-align:right;padding:8px">Current</th><th style="text-align:right;padding:8px">1-30</th><th style="text-align:right;padding:8px">31-60</th><th style="text-align:right;padding:8px">61-90</th><th style="text-align:right;padding:8px">90+</th><th style="text-align:right;padding:8px">Total</th></tr></thead><tbody>';
      filteredJobs.filter(j=>j.paymentStatus!=="paid").forEach(j=>{const f=getJobFinancials(j.id);if(!_jobInvoiced(j,f))return;const c=customers.find(c2=>c2.id===j.customer);const inv=j.dueDate?new Date(j.dueDate):new Date(j.createdDate||now);const days=Math.floor((now-inv)/86400000);html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 0">'+j.name+'<br><span style="color:#888;font-size:11px">'+(c?.name||"")+'</span></td><td style="text-align:right;padding:6px">'+(days<=0?"$"+f.totalRevenue.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(days>0&&days<=30?"$"+f.totalRevenue.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(days>30&&days<=60?"$"+f.totalRevenue.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(days>60&&days<=90?"$"+f.totalRevenue.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(days>90?"$"+f.totalRevenue.toFixed(2):"")+'</td><td style="text-align:right;padding:6px;font-weight:600">$'+f.totalRevenue.toFixed(2)+'</td></tr>'});
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL</td><td style="text-align:right;padding:8px">$'+arAging.current.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+arAging.t30.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+arAging.t60.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+arAging.t90.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+arAging.over90.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+totalAR.toFixed(2)+'</td></tr></tbody></table>';
    } else if(type==="ap"){
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Accounts Payable Aging</div><div style="font-size:12px;color:#888;margin-bottom:20px">As of: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #222"><th style="text-align:left;padding:8px 0">Vendor</th><th style="text-align:right;padding:8px">Current</th><th style="text-align:right;padding:8px">1-30</th><th style="text-align:right;padding:8px">31-60</th><th style="text-align:right;padding:8px">61-90</th><th style="text-align:right;padding:8px">90+</th><th style="text-align:right;padding:8px">Total</th></tr></thead><tbody>';
      apVendorList.forEach(v=>{html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 0">'+v.name+'<br><span style="color:#888;font-size:11px">'+v.items+' item'+(v.items!==1?'s':'')+'</span></td><td style="text-align:right;padding:6px">'+(v.current>0?"$"+v.current.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(v.t30>0?"$"+v.t30.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(v.t60>0?"$"+v.t60.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(v.t90>0?"$"+v.t90.toFixed(2):"")+'</td><td style="text-align:right;padding:6px">'+(v.over90>0?"$"+v.over90.toFixed(2):"")+'</td><td style="text-align:right;padding:6px;font-weight:600">$'+v.total.toFixed(2)+'</td></tr>'});
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL</td><td style="text-align:right;padding:8px">$'+apAging.current.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+apAging.t30.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+apAging.t60.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+apAging.t90.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+apAging.over90.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+totalAP.toFixed(2)+'</td></tr></tbody></table>';
    } else if(type==="margin"){
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Job Margin Analysis</div><div style="font-size:12px;color:#888;margin-bottom:20px">Generated: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #222"><th style="text-align:left;padding:8px 0">Job</th><th style="text-align:right;padding:8px">Revenue</th><th style="text-align:right;padding:8px">Cost</th><th style="text-align:right;padding:8px">Profit</th><th style="text-align:right;padding:8px">Margin</th></tr></thead><tbody>';
      filteredJobs.forEach(j=>{const f=getJobFinancials(j.id);const profit=f.totalRevenue-f.totalCost;html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 0">'+j.name+'</td><td style="text-align:right;padding:6px">$'+f.totalRevenue.toFixed(2)+'</td><td style="text-align:right;padding:6px">$'+f.totalCost.toFixed(2)+'</td><td style="text-align:right;padding:6px;color:'+(profit>=0?"#059669":"#dc2626")+'">$'+profit.toFixed(2)+'</td><td style="text-align:right;padding:6px;font-weight:600;color:'+(f.margin>=30?"#059669":f.margin>=20?"#d97706":"#dc2626")+'">'+f.margin.toFixed(1)+'%</td></tr>'});
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL</td><td style="text-align:right;padding:8px">$'+totalRev.toFixed(2)+'</td><td style="text-align:right;padding:8px">$'+totalCost.toFixed(2)+'</td><td style="text-align:right;padding:8px;color:'+(grossProfit>=0?"#059669":"#dc2626")+'">$'+grossProfit.toFixed(2)+'</td><td style="text-align:right;padding:8px">'+grossMargin.toFixed(1)+'%</td></tr></tbody></table>';
    } else if(type==="balance"){
      // Same figures as the on-screen Balance Sheet tab (manual assets/liabilities
      // included, same cash formula) and the same collapse state: expanded lines
      // print their underlying detail, collapsed lines print as single rows.
      const inventory=filteredItems.reduce((s,i)=>s+(i.unitCost||0)*Math.max(0,i.qtyOrdered-i.qtyReceived),0);
      const bsCash=liveBankCash!==null?Math.max(0,liveBankCash):Math.max(0,paidRev-totalAP);
      const bsTotalAssets=bsCash+totalAR+inventory+manualAssets;
      const bsTotalLiab=totalAP+totalComm+manualLiabilities;
      const bsRetained=totalRev-totalCost-totalComm;
      const _pdfBsDet=(label,sub,amt)=>'<tr style="border-bottom:1px solid #f2f2f2"><td style="padding:4px 12px 4px 30px;color:#777;font-size:12px">'+label+(sub?' <span style="color:#bbb;font-size:11px">'+sub+'</span>':'')+'</td><td style="text-align:right;padding:4px 0;color:#777;font-size:12px">$'+amt.toFixed(2)+'</td></tr>';
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Balance Sheet</div><div style="font-size:12px;color:#888;margin-bottom:20px">As of: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>';
      html+='<tr style="border-bottom:2px solid #222;background:#f9f9f9"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">ASSETS</td></tr>';
      html+='<tr style="border-bottom:2px solid #ddd"><td colspan="2" style="padding:8px 0;font-weight:600;font-size:13px;color:#555">Current Assets</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Cash & Cash Equivalents</td><td style="text-align:right;padding:6px 0">$'+bsCash.toFixed(2)+'</td></tr>';
      if(bsOpen['bs_cash']&&liveBankAccounts.length>0)liveBankAccounts.forEach((a,ai)=>{html+=_pdfBsDet((a.name||'Account')+(a.mask?' ***'+a.mask:''),a.subtype||'',Number(a.current)||0)});
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Accounts Receivable</td><td style="text-align:right;padding:6px 0">$'+totalAR.toFixed(2)+'</td></tr>';
      if(bsOpen['bs_ar'])arJobsList.forEach(x=>{html+=_pdfBsDet(x.job.name,x.customer,x.amount)});
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Inventory (In Transit)</td><td style="text-align:right;padding:6px 0">$'+inventory.toFixed(2)+'</td></tr>';
      if(bsOpen['bs_inv'])invItemsList.slice(0,40).forEach(x=>{html+=_pdfBsDet(x.item.description||'Item',x.jobName,x.value)});
      if(manualAssets>0){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Other Assets (Manual)</td><td style="text-align:right;padding:6px 0">$'+manualAssets.toFixed(2)+'</td></tr>';
        if(bsOpen['bs_assets'])assetTxnsList.forEach(t=>{html+=_pdfBsDet(t.description||'Asset entry',t.date||'',parseFloat(t.amount)||0)});}
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL ASSETS</td><td style="text-align:right;padding:8px 0">$'+bsTotalAssets.toFixed(2)+'</td></tr>';
      html+='<tr><td colspan="2" style="padding:8px 0"></td></tr>';
      html+='<tr style="border-bottom:2px solid #222;background:#f9f9f9"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">LIABILITIES</td></tr>';
      html+='<tr style="border-bottom:2px solid #ddd"><td colspan="2" style="padding:8px 0;font-weight:600;font-size:13px;color:#555">Current Liabilities</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Accounts Payable</td><td style="text-align:right;padding:6px 0">$'+totalAP.toFixed(2)+'</td></tr>';
      if(bsOpen['bs_ap'])apVendorList.forEach(v2=>{html+=_pdfBsDet(v2.name,v2.items+' bills',v2.total)});
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Commissions Payable</td><td style="text-align:right;padding:6px 0">$'+totalComm.toFixed(2)+'</td></tr>';
      if(bsOpen['bs_comm'])commByRep.forEach(r2=>{html+=_pdfBsDet(r2.name,'',r2.amount)});
      if(manualLiabilities>0){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Other Liabilities (Manual)</td><td style="text-align:right;padding:6px 0">$'+manualLiabilities.toFixed(2)+'</td></tr>';
        if(bsOpen['bs_liab'])liabTxnsList.forEach(t=>{html+=_pdfBsDet(t.description||'Liability entry',t.date||'',parseFloat(t.amount)||0)});}
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL LIABILITIES</td><td style="text-align:right;padding:8px 0">$'+bsTotalLiab.toFixed(2)+'</td></tr>';
      html+='<tr><td colspan="2" style="padding:8px 0"></td></tr>';
      html+='<tr style="border-bottom:2px solid #222;background:#f0fdf4"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">EQUITY</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Retained Earnings</td><td style="text-align:right;padding:6px 0;color:'+(bsRetained>=0?"#059669":"#dc2626")+'">$'+bsRetained.toFixed(2)+'</td></tr>';
      html+='<tr style="border-top:3px double #222;font-weight:700;font-size:15px"><td style="padding:12px 0">TOTAL LIABILITIES & EQUITY</td><td style="text-align:right;padding:12px 0">$'+(bsTotalLiab+bsRetained).toFixed(2)+'</td></tr>';
      html+='</tbody></table>';
    }
    html+='</div>';
    const w=window.open("","_blank");if(!w||w.closed){notify('Please allow popups to print','error');return}w.document.write(html);w.document.close();if(w.document.fonts){w.document.fonts.ready.then(()=>w.print())}else{setTimeout(()=>w.print(),800)}
  };


  // Statement rows -- pure-black ledger aesthetic. Hairline separators, a quiet
  // glass chevron, counts as refined mono pills (no faint grey micro-text), and a
  // liquid-glass hover. Expanded details hang from a single hairline rail.
  const _drillRow=(key,label,sub,value,color,openMap,toggle,children,pctBase)=>{const open=!!openMap[key];const pct=(pctBase&&pctBase>0.005&&isFinite(value))?Math.abs(value)/pctBase*100:null;return <div key={key}>
    <div onClick={()=>toggle(key)} style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",background:open?"rgba(255,255,255,0.018)":"transparent",backdropFilter:open?"blur(8px)":"none",transition:"background 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.035)"}} onMouseLeave={e=>{e.currentTarget.style.background=open?"rgba(255,255,255,0.018)":"transparent"}}>
      <span style={{width:16,height:16,borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"transform 0.25s cubic-bezier(0.34,1.4,0.64,1)",transform:open?"rotate(90deg)":"none"}}><span style={{fontSize:7,color:color||"#2dd4bf",lineHeight:1}}>{'\u25B6'}</span></span>
      <span style={{fontSize:13.5,color:"#f5f5f5",fontWeight:600,letterSpacing:0.15,fontFamily:"'Satoshi',sans-serif"}}>{label}</span>
      {sub?<span style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#9a9a9a",background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.06)",padding:"2.5px 9px",borderRadius:20,letterSpacing:0.4,whiteSpace:"nowrap",backdropFilter:"blur(6px)"}}>{sub}</span>:null}
      <span style={{flex:1}}/>
      {pct!==null&&<span style={{fontSize:9,fontWeight:600,color:(color||"#2dd4bf")+"cc",background:(color||"#2dd4bf")+"0d",border:"1px solid "+(color||"#2dd4bf")+"20",padding:"2.5px 8px",borderRadius:20,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,letterSpacing:0.3}}>{pct>=99.95?'100':pct.toFixed(1)}%</span>}
      <span style={{fontSize:13.5,fontWeight:700,color:color||"#e5e5e5",fontFamily:"'JetBrains Mono',monospace",flexShrink:0,minWidth:96,textAlign:"right",letterSpacing:-0.2}}>{fmt(value)}</span>
    </div>
    {open&&<div style={{animation:"fadeUp 0.25s",marginLeft:21,borderLeft:"1px solid rgba(255,255,255,0.07)"}}>{children}</div>}
  </div>};
  const _drillChild=(key2,label,sub,value,color,onClick)=><div key={key2} onClick={onClick} style={{padding:"6px 14px 6px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.03)",cursor:onClick?"pointer":"default",transition:"background 0.18s"}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.background="rgba(255,255,255,0.03)"}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:12,color:"#b8b8b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Satoshi',sans-serif"}}>{onClick&&<span style={{color:(color||"#2dd4bf")+"66",marginRight:7,fontSize:9}}>{'\u2197'}</span>}{label}{sub?<span style={{fontSize:9.5,color:"#7a7a7a",marginLeft:8,fontFamily:"'JetBrains Mono',monospace"}}>{sub}</span>:null}</span><span style={{fontSize:12,color:"#d4d4d4",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{fmt(value)}</span></div>;
  const _txnJump=(t)=>{if(t&&t._billId){setBillOpen(t._billId);setBillsFilter('all');setBillsSearch('');setBillForm(null);setTab('bills');return}setBankSearch(t.description||'');setBankCatFilter('all');setTab('banking')};
  const kpi=(label,value,sub,color)=><Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>{label}</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:color||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={value}/></div>{sub&&<div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{sub}</div>}</Card>;


  return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Financials" sub="Financial Intelligence"/>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[{k:"month",l:"Month"},{k:"quarter",l:"Quarter"},{k:"ytd",l:"YTD"},{k:"year",l:"Past Year"},{k:"all",l:"All Time"}].map(p=><button key={p.k} onClick={()=>setPeriodPreset(p.k)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(period===p.k?"#2dd4bf":"#333"),background:period===p.k?"rgba(45,212,191,0.1)":"transparent",color:period===p.k?"#2dd4bf":"#737373",fontSize:12,fontWeight:period===p.k?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{p.l}</button>)}</div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}><input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPeriod("custom")}} style={{padding:"8px 12px",background:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(200%) brightness(1.1)",WebkitBackdropFilter:"blur(8px) saturate(200%) brightness(1.1)",border:"1px solid #333",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/><span style={{color:"#525252",fontSize:12}}>to</span><input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPeriod("custom")}} style={{padding:"8px 12px",background:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(200%) brightness(1.1)",WebkitBackdropFilter:"blur(8px) saturate(200%) brightness(1.1)",border:"1px solid #333",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/></div>
      <div style={{fontSize:12,color:"#525252",fontFamily:"'JetBrains Mono',monospace"}}>{filteredJobs.length} job{filteredJobs.length!==1?"s":""}</div>
    </div>
        <div className="fin-tabs" style={{display:"flex",gap:3,background:"#111",padding:3,borderRadius:8,marginBottom:16,flexWrap:"wrap"}}>{[["overview","Overview"],["pnl","P&L"],["balance","Balance Sheet"],["banking","Banking"],["review","Review"],["bills","Bills"],["coa","Accounts"],["ar","Receivables"],["ap","Payables"],["margin","Margins"],["reports","Reports"],["close","Close"]].map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:tab===v?"#2dd4bf":"transparent",color:tab===v?"#000":"#737373",fontSize:12,fontWeight:tab===v?600:400,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>{l}{v==='review'&&_reviewCount>0?<span className="rv-count" style={{marginLeft:6,padding:"1px 6px",borderRadius:10,fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",background:tab===v?"rgba(0,0,0,0.18)":"rgba(248,113,113,0.14)",color:tab===v?"#000":"#f87171"}}>{_reviewCount}</span>:null}</button>)}</div>


    {tab==="overview"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}} className="resp-grid-4">
        {kpi("REVENUE",fmt(totalRev),filteredJobs.length+" jobs","#2dd4bf")}
        {kpi("GROSS PROFIT",fmt(grossProfit),grossMargin.toFixed(1)+"% margin","#34d399")}
        {kpi("COMMISSIONS",fmt(totalComm),reps.filter(r=>!r.id.includes("SEED_FLAG")).length+" reps","#fbbf24")}
        {kpi("NET INCOME",fmt(netIncome),totalRev>0?(netIncome/totalRev*100).toFixed(1)+"% net margin":"",netIncome>=0?"#34d399":"#f87171")}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
        <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Revenue vs Cost</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={monthlyData}><defs><linearGradient id="fRevG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.9}/><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.4}/></linearGradient><linearGradient id="fCostG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.7}/><stop offset="100%" stopColor="#f87171" stopOpacity={0.3}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#a3a3a3",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#737373",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+Math.round(v/1000)+"k"}/><Tooltip contentStyle={{background:"#111",border:"1px solid #222",borderRadius:8,fontSize:11,color:"#a3a3a3",boxShadow:"0 4px 12px rgba(0,0,0,0.5)"}} labelStyle={{color:"#737373",fontSize:11,marginBottom:4}} itemStyle={{color:"#a3a3a3",fontSize:11,padding:0}} formatter={(v,name)=>[fmt(v),name]} cursor={{fill:"rgba(45,212,191,0.06)"}}/><RBar dataKey="revenue" fill="url(#fRevG)" radius={[4,4,0,0]} name="Revenue"/><RBar dataKey="cost" fill="url(#fCostG)" radius={[4,4,0,0]} name="Cost"/></BarChart></ResponsiveContainer>
        </Card>
        <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Cash Position</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}} className="cash-pos-grid">
            <div style={{padding:12,background:"#000",borderRadius:10,textAlign:"center",overflow:"hidden"}}><div style={{fontSize:11,color:"#34d399"}}>Collected</div><div className="cash-val" style={{fontSize:18,fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(paidRev)}</div></div>
            <div style={{padding:12,background:"#000",borderRadius:10,textAlign:"center",overflow:"hidden"}}><div style={{fontSize:11,color:"#fbbf24"}}>Partial</div><div className="cash-val" style={{fontSize:18,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(partialRev)}</div></div>
            <div style={{padding:12,background:"#000",borderRadius:10,textAlign:"center",overflow:"hidden"}}><div style={{fontSize:11,color:"#f87171"}}>Outstanding</div><div className="cash-val" style={{fontSize:18,fontWeight:800,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(unpaidRev)}</div></div>
          </div>
          <Bar value={paidRev} max={totalRev||1} color="#34d399" height={10}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#737373"}}><span>Collection Rate</span><span style={{color:"#34d399",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{totalRev>0?(paidRev/totalRev*100).toFixed(1):0}%</span></div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="resp-grid-2">
        <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>AR Aging</div>
          {[{label:"Current",value:arAging.current,color:"#34d399"},{label:"1-30 Days",value:arAging.t30,color:"#2dd4bf"},{label:"31-60 Days",value:arAging.t60,color:"#fbbf24"},{label:"61-90 Days",value:arAging.t90,color:"#f97316"},{label:"90+ Days",value:arAging.over90,color:"#f87171"}].map(a=><div key={a.label} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,color:"#e5e5e5"}}>{a.label}</span><span style={{fontSize:13,fontWeight:700,color:a.color,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a.value)}</span></div><Bar value={a.value} max={totalAR||1} color={a.color} height={5}/></div>)}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #222"}}><span style={{fontSize:13,fontWeight:600,color:"#e5e5e5"}}>Total AR</span><span style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalAR)}</span></div>
        </Card>
        <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>AP Aging</div>
          {[{label:"Current",value:apAging.current,color:"#a78bfa"},{label:"1-30 Days",value:apAging.t30,color:"#8b5cf6"},{label:"31-60 Days",value:apAging.t60,color:"#fbbf24"},{label:"61-90 Days",value:apAging.t90,color:"#f97316"},{label:"90+ Days",value:apAging.over90,color:"#f87171"}].map(a=><div key={a.label} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,color:"#e5e5e5"}}>{a.label}</span><span style={{fontSize:13,fontWeight:700,color:a.color,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a.value)}</span></div><Bar value={a.value} max={totalAP||1} color={a.color} height={5}/></div>)}
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #222"}}><span style={{fontSize:13,fontWeight:600,color:"#e5e5e5"}}>Total AP</span><span style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalAP)}</span></div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}} className="resp-grid-2">
        <Card style={{padding:16}} hover><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14,flexWrap:"wrap",gap:6}}><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Cash Flow (Bank)</div><div style={{fontSize:10,color:"#525252"}}>deposits vs payments from bank transactions</div></div>
          {monthlyBank.length===0?<div style={{padding:"40px 0",textAlign:"center",color:"#525252",fontSize:12}}>No bank transactions in this period</div>:
          <ResponsiveContainer width="100%" height={200}><BarChart data={monthlyBank}><defs><linearGradient id="fBankInG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.9}/><stop offset="100%" stopColor="#34d399" stopOpacity={0.35}/></linearGradient><linearGradient id="fBankOutG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.75}/><stop offset="100%" stopColor="#f87171" stopOpacity={0.3}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#a3a3a3",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#737373",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+Math.round(v/1000)+"k"}/><Tooltip contentStyle={{background:"#111",border:"1px solid #222",borderRadius:8,fontSize:11,color:"#a3a3a3",boxShadow:"0 4px 12px rgba(0,0,0,0.5)"}} labelStyle={{color:"#737373",fontSize:11,marginBottom:4}} itemStyle={{color:"#a3a3a3",fontSize:11,padding:0}} formatter={(v,name)=>[fmt(v),name]} cursor={{fill:"rgba(52,211,153,0.06)"}}/><RBar dataKey="inflow" fill="url(#fBankInG)" radius={[4,4,0,0]} name="Money In" animationDuration={900} animationEasing="ease-out"/><RBar dataKey="outflow" fill="url(#fBankOutG)" radius={[4,4,0,0]} name="Money Out" animationDuration={900} animationEasing="ease-out"/></BarChart></ResponsiveContainer>}
        </Card>
        <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Top Customers</div>
          {custRev.slice(0,6).map((c,i)=><div key={c.name} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #111"}}><div style={{width:24,height:24,borderRadius:6,background:"#2dd4bf12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#2dd4bf",fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><span style={{flex:1,fontSize:13,color:"#e5e5e5"}}>{c.name}</span><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.revenue)}</span><span style={{fontSize:11,color:"#737373"}}>{c.pct.toFixed(0)}%</span></div>)}
        </Card>
      </div>
    </div>}


    {tab==="pnl"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>REVENUE</div><div style={{fontSize:22,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(totalRev)}/></div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>COGS</div><div style={{fontSize:22,fontWeight:800,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(totalCost)}/></div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>GROSS PROFIT</div><div style={{fontSize:22,fontWeight:800,color:grossProfit>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(grossProfit)}/></div><div style={{fontSize:11,color:"#737373",marginTop:4}}>{grossMargin.toFixed(1)}% margin</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>NET INCOME</div><div style={{fontSize:22,fontWeight:800,color:netIncome>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(netIncome)}/></div></Card>
        </div>
        <Card style={{padding:24,background:"#000000",border:"1px solid rgba(255,255,255,0.05)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
        <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Profit & Loss</div><div style={{fontSize:11,color:"#737373",marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{_periodLabel}</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(17,17,17,0.55)",backdropFilter:"blur(12px) saturate(180%)",WebkitBackdropFilter:"blur(12px) saturate(180%)"}}>
            <button onClick={()=>setPnlOpen(_allPnlKeys())} style={{padding:"6px 12px",border:"none",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373"}}>Expand All</button>
            <button onClick={()=>setPnlOpen({})} style={{padding:"6px 12px",border:"none",borderLeft:"1px solid rgba(255,255,255,0.07)",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373"}}>Collapse All</button>
          </div>
          <Btn v="secondary" onClick={()=>setTab("banking")} style={{fontSize:11}}><I n="plus" s={12}/> Add Entry</Btn><Btn onClick={()=>generatePDF("pnl")}><I n="download" s={14}/> Export PDF</Btn>
        </div>
      </div>
      <div style={{fontSize:10.5,color:"#7a7a7a",marginBottom:16,letterSpacing:0.2,fontFamily:"'Satoshi',sans-serif"}}>Open a category to see the jobs or transactions inside it. The PDF export prints exactly what is expanded on screen.</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"6px 0 10px 0",borderBottom:"1px solid rgba(45,212,191,0.25)"}}><span style={{fontSize:11,fontWeight:700,color:"#2dd4bf",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>REVENUE</span><span style={{fontSize:16,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}>{fmt(totalRev)}</span></div>
      {_drillRow('rev_jobs','Job Revenue',filteredJobs.length+' job'+(filteredJobs.length!==1?'s':''),jobRevTotal,'#2dd4bf',pnlOpen,_togglePnl,
        filteredJobs.map(j=>{const f=getJobFinancials(j.id);return _drillChild('rj_'+j.id,j.name,'',f.totalRevenue,'#2dd4bf',()=>{fCtx.setSelectedJob(j.id);fCtx.setPage('jobs')})}),totalRev
      )}
      {pnlRevCats.map(c=>_drillRow('revc_'+c.name,c.name,c.txns.length+' transaction'+(c.txns.length!==1?'s':''),c.total,'#2dd4bf',pnlOpen,_togglePnl,
        c.txns.map(t=>_drillChild('rt_'+t.id,(t.description||'Manual entry'),t.date||'',parseFloat(t.amount)||0,'#2dd4bf',()=>_txnJump(t))),totalRev
      ))}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"22px 0 10px 0",borderBottom:"1px solid rgba(248,113,113,0.25)"}}><span style={{fontSize:11,fontWeight:700,color:"#f87171",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>COST OF GOODS SOLD</span><span style={{fontSize:16,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}><AnimatedNumber value={totalCost} prefix="$"/></span></div>
      {_drillRow('cogs_jobs','Job Costs by Vendor',vendorSpend.length+' vendor'+(vendorSpend.length!==1?'s':''),jobCostTotal,'#f87171',pnlOpen,_togglePnl,
        <>
          {vendorSpend.map(v=>_drillChild('cv_'+v.name,v.name,'',v.spend,'#f87171',()=>{fCtx.setGlobalSearch(v.name);fCtx.setPage('jobs')}))}
          {Math.abs(_jobCostAdj)>0.005&&_drillChild('cv_adj','Adjustments','vendor credits & standalone bills',_jobCostAdj,'#f87171',()=>setTab('ap'))}
        </>,totalCost
      )}
      {pnlExpCats.map(c=>_drillRow('expc_'+c.name,c.name,c.txns.length+' transaction'+(c.txns.length!==1?'s':''),c.total,'#f87171',pnlOpen,_togglePnl,
        c.txns.map(t=>_drillChild('et_'+t.id,(t.description||'Manual expense'),t.date||'',parseFloat(t.amount)||0,'#f87171',()=>_txnJump(t))),totalCost
      ))}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",marginTop:18,borderRadius:12,background:"rgba(255,255,255,0.025)",backdropFilter:"blur(12px) saturate(160%)",WebkitBackdropFilter:"blur(12px) saturate(160%)",border:"1px solid rgba(255,255,255,0.06)"}}><span style={{fontSize:11,fontWeight:700,color:"#e5e5e5",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>GROSS PROFIT</span><span style={{fontSize:15,fontWeight:700,color:grossProfit>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}><AnimatedNumber value={grossProfit} prefix="$"/><span style={{fontSize:11,color:"#8a8a8a",marginLeft:8,fontWeight:600}}>{grossMargin.toFixed(1)}%</span></span></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"22px 0 10px 0",borderBottom:"1px solid rgba(251,191,36,0.25)"}}><span style={{fontSize:11,fontWeight:700,color:"#fbbf24",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>OPERATING EXPENSES</span><span style={{fontSize:16,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}>{fmt(totalComm)}</span></div>
      {_drillRow('opex_comm','Sales Commissions',commByRep.length+' rep'+(commByRep.length!==1?'s':''),totalComm,'#fbbf24',pnlOpen,_togglePnl,
        commByRep.map(r2=>_drillChild('cm_'+r2.name,r2.name,'',r2.amount,'#fbbf24',null)),totalComm
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",marginTop:22,borderRadius:14,background:"rgba(255,255,255,0.03)",backdropFilter:"blur(14px) saturate(170%)",WebkitBackdropFilter:"blur(14px) saturate(170%)",border:"1px solid rgba(255,255,255,0.08)",borderTop:"1px solid rgba(255,255,255,0.14)"}}><span style={{fontSize:12,fontWeight:800,color:"#ffffff",letterSpacing:3.5,fontFamily:"'Satoshi',sans-serif"}}>NET INCOME</span><span style={{fontSize:19,fontWeight:800,color:netIncome>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.4}}><AnimatedNumber value={netIncome} prefix="$"/></span></div>
    </Card></div>}


    {tab==="balance"&&(()=>{
      // Balance Sheet calculations
      const inventory=filteredItems.reduce((s,i)=>s+(i.unitCost||0)*Math.max(0,i.qtyOrdered-i.qtyReceived),0);
      const bsCash=liveBankCash!==null?Math.max(0,liveBankCash):Math.max(0,paidRev-totalAP);
      const bsTotalCurrentAssets=bsCash+totalAR+inventory+manualAssets;
      const bsTotalAssets=bsTotalCurrentAssets;
      const bsTotalCurrentLiab=totalAP+totalComm+manualLiabilities;
      const bsTotalLiab=bsTotalCurrentLiab;
      const bsRetained=totalRev-totalCost-totalComm;
      const bsEquity=bsRetained;
      const bsTotalLiabEquity=bsTotalLiab+bsEquity;
      const isBalanced=Math.abs(bsTotalAssets-bsTotalLiabEquity)<0.01;


      const bsLine=(label,value,indent,bold,color,border)=><div style={{display:"flex",justifyContent:"space-between",padding:(bold?"10px":"6px")+" "+(indent?"16px":"0"),borderBottom:border?"2px solid #222":"1px solid #111",background:bold&&border?"#0a0a0a":"transparent"}}><span style={{fontSize:bold?14:13,fontWeight:bold?700:400,color:bold?"#f0f0f0":"#a3a3a3"}}>{label}</span><span style={{fontSize:bold?15:13,fontWeight:bold?800:500,color:color||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{typeof value==='number'?fmt(value):value}</span></div>;


      return <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL ASSETS</div><div style={{fontSize:22,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(bsTotalAssets)}/></div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL LIABILITIES</div><div style={{fontSize:22,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(bsTotalLiab)}/></div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>EQUITY</div><div style={{fontSize:22,fontWeight:800,color:bsEquity>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(bsEquity)}/></div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>BALANCED</div><div style={{fontSize:22,fontWeight:800,color:isBalanced?"#34d399":"#f87171"}}>{isBalanced?"Yes":"No"}</div><div style={{fontSize:11,color:"#737373",marginTop:4}}>A = L + E</div></Card>
        </div>


        <Card style={{padding:24,background:"#000000",border:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:8}}>
            <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Balance Sheet</div><div style={{fontSize:12,color:"#737373",marginTop:2}}>As of {new Date(dateTo).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(17,17,17,0.55)",backdropFilter:"blur(12px) saturate(180%)",WebkitBackdropFilter:"blur(12px) saturate(180%)"}}>
                <button onClick={()=>setBsOpen(_allBsKeys())} style={{padding:"6px 12px",border:"none",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373"}}>Expand All</button>
                <button onClick={()=>setBsOpen({})} style={{padding:"6px 12px",border:"none",borderLeft:"1px solid rgba(255,255,255,0.07)",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373"}}>Collapse All</button>
              </div>
              <Btn v="secondary" onClick={()=>setTab("banking")} style={{fontSize:11}}><I n="plus" s={12}/> Add Entry</Btn><Btn onClick={()=>generatePDF("balance")}><I n="download" s={14}/> Export PDF</Btn>
            </div>
          </div>


          <div style={{marginBottom:30}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 0 10px 0",borderBottom:"1px solid rgba(45,212,191,0.25)"}}><span style={{color:"#2dd4bf",display:"flex"}}><I n="chart" s={13}/></span><span style={{fontSize:11,fontWeight:700,color:"#2dd4bf",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>ASSETS</span></div>
            <div style={{padding:"12px 14px 4px 14px"}}><span style={{fontSize:9.5,fontWeight:600,color:"#8a8a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'Satoshi',sans-serif"}}>Current Assets</span></div>
            {_drillRow('bs_cash','Cash & Cash Equivalents',liveBankAccounts.length>0?liveBankAccounts.length+' bank account'+(liveBankAccounts.length!==1?'s':'')+' (live)':'estimated (no bank sync)',bsCash,'#34d399',bsOpen,_toggleBs,
              liveBankAccounts.length>0?liveBankAccounts.map((a,ai)=>_drillChild('cash_'+ai,(a.name||'Account')+(a.mask?' ***'+a.mask:''),a.subtype||'',Number(a.current)||0,'#34d399',()=>setTab('banking'))):[_drillChild('cash_est','Estimated from collected revenue minus payables','connect the bank feed for live balances',bsCash,'#34d399',()=>setTab('banking'))],bsTotalAssets
            )}
            {_drillRow('bs_ar','Accounts Receivable',arJobsList.length+' invoiced unpaid job'+(arJobsList.length!==1?'s':''),totalAR,'#2dd4bf',bsOpen,_toggleBs,
              arJobsList.map(x=>_drillChild('ar_'+x.job.id,x.job.name,x.customer,x.amount,'#2dd4bf',()=>{fCtx.setSelectedJob(x.job.id);fCtx.setPage('jobs')})),bsTotalAssets
            )}
            {_drillRow('bs_inv','Inventory (In Transit)',invItemsList.length+' undelivered item'+(invItemsList.length!==1?'s':''),inventory,'#a78bfa',bsOpen,_toggleBs,
              <>
                {invItemsList.slice(0,40).map(x=>_drillChild('inv_'+x.item.id,x.item.description||'Item',x.jobName,x.value,'#a78bfa',()=>{fCtx.setSelectedJob(x.jobId);fCtx.setPage('jobs')}))}
                {invItemsList.length>40&&_drillChild('inv_more','... and '+(invItemsList.length-40)+' more items','',invItemsList.slice(40).reduce((s2,x)=>s2+x.value,0),'#a78bfa',null)}
              </>,bsTotalAssets
            )}
            {manualAssets>0&&_drillRow('bs_assets','Other Assets (Manual)',assetTxnsList.length+' entr'+(assetTxnsList.length!==1?'ies':'y'),manualAssets,'#8b5cf6',bsOpen,_toggleBs,
              assetTxnsList.map(t=>_drillChild('as_'+t.id,t.description||'Asset entry',t.date||'',parseFloat(t.amount)||0,'#8b5cf6',()=>_txnJump(t))),bsTotalAssets
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}><span style={{fontSize:13,fontWeight:600,color:"#d4d4d4",fontFamily:"'Satoshi',sans-serif"}}>Total Current Assets</span><span style={{fontSize:14,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalCurrentAssets)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.10)",borderBottom:"3px double rgba(255,255,255,0.16)"}}><span style={{fontSize:12,fontWeight:800,color:"#ffffff",letterSpacing:2.5,fontFamily:"'Satoshi',sans-serif"}}>TOTAL ASSETS</span><span style={{fontSize:16,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}>{fmt(bsTotalAssets)}</span></div>
          </div>


          <div style={{marginBottom:30}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 0 10px 0",borderBottom:"1px solid rgba(249,115,22,0.25)"}}><span style={{color:"#f97316",display:"flex"}}><I n="receipt" s={13}/></span><span style={{fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>LIABILITIES</span></div>
            <div style={{padding:"12px 14px 4px 14px"}}><span style={{fontSize:9.5,fontWeight:600,color:"#8a8a8a",letterSpacing:2,textTransform:"uppercase",fontFamily:"'Satoshi',sans-serif"}}>Current Liabilities</span></div>
            {_drillRow('bs_ap','Accounts Payable',apVendorList.length+' vendor'+(apVendorList.length!==1?'s':'')+' owed',totalAP,'#f97316',bsOpen,_toggleBs,
              apVendorList.map(v2=>_drillChild('ap_'+v2.name,v2.name,v2.items+' bill'+(v2.items!==1?'s':''),v2.total,'#f97316',()=>setTab('ap'))),bsTotalCurrentLiab
            )}
            {_drillRow('bs_comm','Commissions Payable',commByRep.length+' rep'+(commByRep.length!==1?'s':''),totalComm,'#fbbf24',bsOpen,_toggleBs,
              commByRep.map(r2=>_drillChild('bc_'+r2.name,r2.name,'',r2.amount,'#fbbf24',null)),bsTotalCurrentLiab
            )}
            {manualLiabilities>0&&_drillRow('bs_liab','Other Liabilities (Manual)',liabTxnsList.length+' entr'+(liabTxnsList.length!==1?'ies':'y'),manualLiabilities,'#f97316',bsOpen,_toggleBs,
              liabTxnsList.map(t=>_drillChild('li_'+t.id,t.description||'Liability entry',t.date||'',parseFloat(t.amount)||0,'#f97316',()=>_txnJump(t))),bsTotalCurrentLiab
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}><span style={{fontSize:13,fontWeight:600,color:"#d4d4d4",fontFamily:"'Satoshi',sans-serif"}}>Total Current Liabilities</span><span style={{fontSize:14,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalCurrentLiab)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.10)",borderBottom:"3px double rgba(255,255,255,0.16)"}}><span style={{fontSize:12,fontWeight:800,color:"#ffffff",letterSpacing:2.5,fontFamily:"'Satoshi',sans-serif"}}>TOTAL LIABILITIES</span><span style={{fontSize:16,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}>{fmt(bsTotalLiab)}</span></div>
          </div>


          <div style={{marginBottom:30}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 0 10px 0",borderBottom:"1px solid "+(bsEquity>=0?"rgba(52,211,153,0.25)":"rgba(248,113,113,0.25)")}}><span style={{color:bsEquity>=0?"#34d399":"#f87171",display:"flex"}}><I n="shield" s={13}/></span><span style={{fontSize:11,fontWeight:700,color:bsEquity>=0?"#34d399":"#f87171",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>EQUITY</span></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontSize:13.5,color:"#f5f5f5",fontWeight:600,fontFamily:"'Satoshi',sans-serif"}}>Retained Earnings</span><span style={{fontSize:13.5,fontWeight:700,color:bsRetained>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsRetained)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.10)",borderBottom:"3px double rgba(255,255,255,0.16)"}}><span style={{fontSize:12,fontWeight:800,color:"#ffffff",letterSpacing:2.5,fontFamily:"'Satoshi',sans-serif"}}>TOTAL EQUITY</span><span style={{fontSize:16,fontWeight:800,color:bsEquity>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.3}}>{fmt(bsEquity)}</span></div>
          </div>


          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderRadius:14,background:"rgba(255,255,255,0.03)",backdropFilter:"blur(14px) saturate(170%)",WebkitBackdropFilter:"blur(14px) saturate(170%)",border:"1px solid rgba(255,255,255,0.08)",borderTop:"1px solid rgba(255,255,255,0.14)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:12,fontWeight:800,color:"#ffffff",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>TOTAL LIABILITIES & EQUITY</span><span style={{fontSize:9,fontWeight:700,color:isBalanced?"#34d399":"#f87171",background:isBalanced?"rgba(52,211,153,0.08)":"rgba(248,113,113,0.08)",border:"1px solid "+(isBalanced?"rgba(52,211,153,0.25)":"rgba(248,113,113,0.25)"),padding:"3px 10px",borderRadius:20,letterSpacing:1.5,fontFamily:"'JetBrains Mono',monospace"}}>{isBalanced?"BALANCED":"A \u2260 L + E"}</span></div>
            <span style={{fontSize:18,fontWeight:800,color:isBalanced?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.4}}>{fmt(bsTotalLiabEquity)}</span>
          </div>
        </Card>


        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}} className="resp-grid-2">
          <Card style={{padding:16}}><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Asset Breakdown</div>
            {[{label:"Cash",value:bsCash,color:"#34d399"},{label:"Receivables",value:totalAR,color:"#2dd4bf"},{label:"Inventory",value:inventory,color:"#a78bfa"}].map(a=><div key={a.label} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,color:"#e5e5e5"}}>{a.label}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:a.color,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a.value)}</span><span style={{fontSize:11,color:"#737373"}}>{bsTotalAssets>0?(a.value/bsTotalAssets*100).toFixed(0):0}%</span></div></div><Bar value={a.value} max={bsTotalAssets||1} color={a.color} height={5}/></div>)}
          </Card>
          <Card style={{padding:16}}><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Liabilities & Equity</div>
            {[{label:"Accounts Payable",value:totalAP,color:"#f97316"},{label:"Commissions",value:totalComm,color:"#fbbf24"},{label:"Retained Earnings",value:Math.max(0,bsRetained),color:"#34d399"}].map(a=><div key={a.label} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,color:"#e5e5e5"}}>{a.label}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:a.color,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a.value)}</span><span style={{fontSize:11,color:"#737373"}}>{bsTotalLiabEquity>0?(a.value/bsTotalLiabEquity*100).toFixed(0):0}%</span></div></div><Bar value={a.value} max={bsTotalLiabEquity||1} color={a.color} height={5}/></div>)}
          </Card>
        </div>
      </div>})()}


    {tab==="banking"&&(()=>{
      const defaultCats=FIN_DEFAULT_CATEGORIES;
      const customCatRecord=(customSops||[]).find(s=>s.id==='CUSTOM_CATEGORIES');
      const customCats=customCatRecord?(()=>{try{return JSON.parse(customCatRecord.content)}catch{return []}})():[];
      // Card and loan payments (Sep 2026): offered here so she can file them; they are liabilities, not expenses.
      const categories=[...defaultCats,...BANK_LIABILITY_CATEGORIES.filter(c=>!defaultCats.includes(c)),...customCats.filter(c=>!defaultCats.includes(c)&&!BANK_LIABILITY_CATEGORIES.includes(c))];
      const addCustomCat=(name)=>{if(!name||categories.includes(name))return;const next=[...customCats,name];addSop({id:'CUSTOM_CATEGORIES',title:'Custom Categories',cat:'Settings',icon:'tag',content:JSON.stringify(next),custom:true});notify('Category added: '+name)};
      const removeCustomCat=(name)=>{const next=customCats.filter(c=>c!==name);addSop({id:'CUSTOM_CATEGORIES',title:'Custom Categories',cat:'Settings',icon:'tag',content:JSON.stringify(next),custom:true});notify('Category removed: '+name)};
      const renameCustomCat=(oldName,newName)=>{if(!newName||categories.includes(newName))return;const next=customCats.map(c=>c===oldName?newName:c);addSop({id:'CUSTOM_CATEGORIES',title:'Custom Categories',cat:'Settings',icon:'tag',content:JSON.stringify(next),custom:true});
        // Also rename in all transactions that used the old name
        manualTxns.filter(t=>t.category===oldName).forEach(t=>{addSop({id:t.id,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,category:newName}),custom:true})});
        notify('Category renamed: '+oldName+' -> '+newName);setEditingCat(null);setEditingCatName('')};
      // Custom accounts
      const defaultAccts=['Operating','Savings','Money Market','Credit Card','Payroll'];
      const customAcctRecord=(customSops||[]).find(s=>s.id==='CUSTOM_ACCOUNTS');
      const customAccts=customAcctRecord?(()=>{try{return JSON.parse(customAcctRecord.content)}catch{return []}})():[];
      const allAccounts=[...defaultAccts,...customAccts.filter(a=>!defaultAccts.includes(a))];
      const addCustomAcct=(name)=>{if(!name||allAccounts.includes(name))return;const next=[...customAccts,name];addSop({id:'CUSTOM_ACCOUNTS',title:'Custom Accounts',cat:'Settings',icon:'dollar',content:JSON.stringify(next),custom:true});notify('Account added: '+name)};
      const removeCustomAcct=(name)=>{if(defaultAccts.includes(name)){notify('Cannot remove default account');return}const next=customAccts.filter(a=>a!==name);addSop({id:'CUSTOM_ACCOUNTS',title:'Custom Accounts',cat:'Settings',icon:'dollar',content:JSON.stringify(next),custom:true});notify('Account removed: '+name)};
      // Bank account metadata (nicknames + exclusions for Plaid-imported account IDs)
      const bankAcctMetaRecord=(customSops||[]).find(s=>s.id==='BANK_ACCOUNT_META');
      const bankAcctMeta=bankAcctMetaRecord?(()=>{try{return JSON.parse(bankAcctMetaRecord.content)||{}}catch{return {}}})():{};
      const saveBankAcctMeta=(next)=>{addSop({id:'BANK_ACCOUNT_META',title:'Bank Account Settings',cat:'Settings',icon:'dollar',content:JSON.stringify(next),custom:true})};
      const setAcctNickname=(acctId,nickname)=>{const next={...bankAcctMeta,[acctId]:{...(bankAcctMeta[acctId]||{}),nickname:nickname||''}};saveBankAcctMeta(next);notify(nickname?'Account renamed: '+nickname:'Nickname cleared')};
      const toggleAcctExcluded=(acctId)=>{const cur=bankAcctMeta[acctId]||{};const next={...bankAcctMeta,[acctId]:{...cur,excluded:!cur.excluded}};saveBankAcctMeta(next);notify((next[acctId].excluded?'Excluded: ':'Included: ')+(cur.nickname||acctId.slice(0,12)+'...'))};
      // Delete an entire bank account: all its transactions plus the metadata entry.
      // Used when Plaid creates duplicate accounts after disconnect/reconnect cycles, or
      // when the user wants to permanently remove an account that's no longer relevant.
      // Irreversible -- transactions are removed from both local state and the database.
      const deleteAcct=async(acctId)=>{
        const meta=bankAcctMeta[acctId]||{};
        const label=meta.nickname||acctId.slice(0,16)+'...';
        const acctTxns=manualTxns.filter(t=>t.account===acctId);
        const cnt=acctTxns.length;
        const ok=await fCtx.confirm('Delete account "'+label+'" and all '+cnt+' of its transactions? This cannot be undone.');
        if(!ok)return;
        // Delete every transaction tied to this account (deleteSop removes from local state + DB)
        acctTxns.forEach(t=>{deleteSop(t.id)});_noteDeleted(acctTxns);
        // Strip the metadata entry and remove from filter selection
        const nextMeta={...bankAcctMeta};
        delete nextMeta[acctId];
        if(Array.isArray(nextMeta._filterSelection)){
          nextMeta._filterSelection=nextMeta._filterSelection.filter(id=>id!==acctId);
        }
        saveBankAcctMeta(nextMeta);
        notify('Account deleted: '+label+' ('+cnt+' transaction'+(cnt!==1?'s':'')+' removed)');
      };
      const acctDisplayName=(acctId)=>{if(!acctId)return '--';const m=bankAcctMeta[acctId];return m&&m.nickname?m.nickname:(acctId.length>20?acctId.slice(0,12)+'...':acctId)};
      const allTxns=manualTxns.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      // All unique account IDs found across transactions, used by the filter dropdown and the editor panel
      const allBankAcctIds=Array.from(new Set(allTxns.map(t=>t.account).filter(Boolean))).sort();
      // Persisted multi-select filter (cross-session, cross-device via Supabase)
      // Stored under the special _filterSelection key in BANK_ACCOUNT_META so it rides on the same SOP record as nicknames/exclusions
      const rawSel=Array.isArray(bankAcctMeta._filterSelection)?bankAcctMeta._filterSelection:[];
      // Drop any IDs that are no longer present or are excluded -- selection is always a subset of currently visible accounts
      const selectedAcctIds=rawSel.filter(id=>allBankAcctIds.includes(id)&&!bankAcctMeta[id]?.excluded);
      const acctFilterActive=selectedAcctIds.length>0;
      const setSelectedAcctIds=(nextIds)=>{const next={...bankAcctMeta,_filterSelection:nextIds};saveBankAcctMeta(next)};
      const toggleSelectedAcct=(id)=>{const isOn=selectedAcctIds.includes(id);setSelectedAcctIds(isOn?selectedAcctIds.filter(x=>x!==id):[...selectedAcctIds,id])};
      const filteredBankTxns=allTxns.filter(t=>{
        if(t.account&&bankAcctMeta[t.account]&&bankAcctMeta[t.account].excluded)return false;
        if(acctFilterActive&&!selectedAcctIds.includes(t.account))return false;
        if(bankCatFilter==='__uncat__'){if(t.category&&t.category!=='Uncategorized'&&categories.includes(t.category))return false;}
        else if(bankCatFilter!=='all'&&t.category!==bankCatFilter)return false;
        if(!bankSearch)return true;
        const q=bankSearch.toLowerCase();
        return (t.description||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q)||(t.account||'').toLowerCase().includes(q)||(bankAcctMeta[t.account]?.nickname||'').toLowerCase().includes(q)||(t.amount||'').toString().includes(q);
      });
      const saveTxn=()=>{
        // Dedup: only on NEW adds, not edits. In edit mode the user is updating an
        // existing row and its hash will of course match itself (or a fresh-changed
        // version of itself), so skipping the check is correct. For new entries,
        // compare the candidate against the freshly-built hash set so the user can't
        // double-click "Add" or re-enter the same row twice.
        if(!manualEditing){
          const candidateHash=_bankTxnHash(manualForm);
          const candDateLen=String(manualForm.date||'').trim().length;
          const candAmt=Math.abs(parseFloat(manualForm.amount)||0);
          // Only enforce when the candidate actually has a date AND a nonzero amount.
          // Empty/zero rows would all collide to the same key and become un-addable.
          if(candDateLen>0&&candAmt>0){
            const dupSet=new Set(manualTxns.map(mt=>_bankTxnHash(mt)));
            if(dupSet.has(candidateHash)){
              notify('Duplicate transaction -- same date, amount, and description already exists. Edit the existing entry instead, or change one of those fields.','error');
              return;
            }
            // A deleted bank row stays deleted (Sep 2026): the DB trigger refuses it too, so
            // say why here instead of failing at the database.
            const _tb=(tombstones||[]).find(x=>(x.fingerprint||bankTxnFingerprint(x))===bankTxnFingerprint(manualForm));
            if(_tb){notify('A bank transaction like this was deleted on '+(_tb.deletedAt?String(_tb.deletedAt).slice(0,10):'an earlier date')+' -- allow it again on the Review tab first','error');return}
          }
        }
        // Closed-period guard: the DB trigger would reject this anyway -- fail with a
        // clear message instead of a silent nothing. Covers both the new date and,
        // when editing, the row's original date.
        const _orig=manualEditing?allTxns.find(x=>x.id===manualEditing):null;
        if(_isLockedDate(manualForm.date)){notify(_lockMsg(manualForm.date),'error');return}
        if(_orig&&_isLockedDate(_orig.date)){notify(_lockMsg(_orig.date),'error');return}
        const id=manualEditing||'TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
        // Merge over the existing row on edit so fields the form does not carry
        // (plaidId, source, plaidCategory, attachments) survive the save.
        addSop({id,title:manualForm.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify(_orig?{..._orig,...manualForm}:manualForm),custom:true});
        notify(manualEditing?'Transaction updated':'Transaction added');
        setManualForm({date:'',description:'',category:'',amount:'',type:'expense',account:'Operating'});
        setManualEditing(null);
      };
      // ---- Receipt attachments: photos and PDFs pinned to a transaction so the
      // CPA can trace any number to its paper. Files live in Supabase storage under
      // receipts/<txn id>/ and the list rides on the ManualTxn row itself.
      const attachAdd=async(t,file)=>{
        if(!file)return;
        if(_isLockedDate(t.date)){notify(_lockMsg(t.date),'error');return}
        if(file.size>10*1024*1024){notify('File is over the 10 MB attachment limit','error');return}
        setAttachBusy(true);
        const clean=String(file.name||'receipt').replace(/[^a-zA-Z0-9._-]/g,'_');
        const path='receipts/'+t.id+'/'+Date.now()+'-'+clean;
        const url=await db.uploadFile('vendor-invoices',path,file);
        setAttachBusy(false);
        if(!url){notify('Upload failed -- check Supabase storage','error');return}
        const att={name:file.name||clean,url,type:file.type||'',size:file.size||0,at:new Date().toISOString(),by:_glUser};
        addSop({id:t.id,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,attachments:[...(t.attachments||[]),att]}),custom:true});
        notify('Receipt attached: '+att.name);
      };
      const attachRemove=(t,idx)=>{
        if(_isLockedDate(t.date)){notify(_lockMsg(t.date),'error');return}
        const next=(t.attachments||[]).filter((x,i2)=>i2!==idx);
        addSop({id:t.id,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,attachments:next}),custom:true});
        notify('Attachment removed');
      };
      const deleteTxn=(id)=>{const _t=allTxns.find(x=>x.id===id);if(_t&&_isLockedDate(_t.date)){notify(_lockMsg(_t.date),'error');return}deleteSop(id);_noteDeleted(_t);notify('Transaction deleted')};
      const editTxn=(t)=>{setManualForm({date:t.date||'',description:t.description||'',category:t.category||'',amount:t.amount||'',type:t.type||'expense',account:t.account||'Operating'});setManualEditing(t.id)};
      const updateCategory=(txnId,cat)=>{const t=allTxns.find(x=>x.id===txnId);if(!t)return;if(t.billId&&cat!==BILL_PAYMENT_CATEGORY){notify('This bank transaction is matched to a vendor bill payment -- remove the payment on the Bills tab to release it','error');return}if(_isLockedDate(t.date)){notify(_lockMsg(t.date),'error');return}const newType=bankCategoryType(cat,'expense');addSop({id:txnId,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,category:cat,type:newType}),custom:true});notify('Categorized: '+cat)};
      const totalBankIn=filteredBankTxns.filter(t=>t.type==='revenue').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const totalBankOut=filteredBankTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const uncategorized=filteredBankTxns.filter(t=>!t.category||t.category==='Uncategorized'||!categories.includes(t.category)).length;
      const toggleTxnSelect=(id)=>{const next=new Set(txnSelected);if(next.has(id))next.delete(id);else next.add(id);setTxnSelected(next)};
      const selectAllTxns=()=>{if(txnSelected.size===filteredBankTxns.length)setTxnSelected(new Set());else setTxnSelected(new Set(filteredBankTxns.map(t=>t.id)))};
      const bulkDelete=()=>{
        const ids=[...txnSelected];
        const locked=ids.filter(id=>{const _t=allTxns.find(x=>x.id===id);return _t&&_isLockedDate(_t.date)});
        const ok=ids.filter(id=>!locked.includes(id));
        ok.forEach(id=>deleteSop(id));_noteDeleted(ok.map(id=>allTxns.find(x=>x.id===id)));
        notify(ok.length+' transaction'+(ok.length!==1?'s':'')+' deleted'+(locked.length?' -- '+locked.length+' in closed periods left untouched':''),locked.length&&!ok.length?'error':undefined);
        setTxnSelected(new Set());
      };
      const bulkCategorize=(cat)=>{
        const ids=[...txnSelected];
        const locked=ids.filter(id=>{const _t=allTxns.find(x=>x.id===id);return _t&&_isLockedDate(_t.date)});
        const ok=ids.filter(id=>!locked.includes(id));
        ok.forEach(id=>{const t=allTxns.find(x=>x.id===id);if(t)updateCategory(id,cat)});
        notify(ok.length+' transaction'+(ok.length!==1?'s':'')+' categorized as '+cat+(locked.length?' -- '+locked.length+' in closed periods left untouched':''));
        setTxnSelected(new Set());
      };
      // CSV export of exactly what is on screen (all active filters applied).
      // Column-for-column comparable against the QuickBooks bank register export,
      // which is the fast manual cross-check during reconciliation.
      const exportBankCsv=()=>{
        if(filteredBankTxns.length===0){notify('No transactions to export with the current filters','error');return}
        const esc=v=>{const str=String(v==null?'':v);return /[",\n\r]/.test(str)?'"'+str.replace(/"/g,'""')+'"':str};
        const rows=[['Date','Description','Category','Amount','Type','Account','Source']];
        filteredBankTxns.forEach(t=>{rows.push([t.date||'',t.description||'',(t.category&&categories.includes(t.category))?t.category:'Uncategorized',(parseFloat(t.amount)||0).toFixed(2),t.type||'',acctDisplayName(t.account),t.plaidId?'bank feed':(t.source==='statement'?'statement upload':'manual')])});
        const csv=rows.map(r=>r.map(esc).join(',')).join('\n');
        const blob=new Blob([csv],{type:'text/csv'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download='midwest-bank-transactions-'+new Date().toISOString().split('T')[0]+'.csv';a.click();URL.revokeObjectURL(url);
        notify(filteredBankTxns.length+' transaction'+(filteredBankTxns.length!==1?'s':'')+' exported to CSV');
      };
      // Category totals across the filtered transactions -- the tie-out view. During
      // QuickBooks reconciliation these totals should match the QB category totals
      // for the same period one to one, so variances jump out per category instead
      // of hiding inside a single P&L number.
      const catTotals=(()=>{const m={};filteredBankTxns.forEach(t=>{const c=(t.category&&categories.includes(t.category))?t.category:'Uncategorized';if(!m[c])m[c]={name:c,inflow:0,outflow:0,count:0};const amt=parseFloat(t.amount)||0;if(t.type==='revenue')m[c].inflow+=amt;else if(t.type==='expense')m[c].outflow+=amt;m[c].count++;});return Object.values(m).sort((a,b)=>(b.inflow+b.outflow)-(a.inflow+a.outflow));})();
      const spendByCat=catTotals.filter(c=>c.outflow>0.005).map(c=>({name:c.name,value:c.outflow}));
      const CAT_COLORS=['#2dd4bf','#a78bfa','#34d399','#fbbf24','#f97316','#f87171','#38bdf8','#e879f9','#a3e635','#fb7185','#818cf8','#f472b6'];
      // One color per category, assigned in donut order, so the donut slices, legend
      // chips, and Category Totals share bars all agree on the same hue.
      const catColorOf={};spendByCat.forEach((c,i)=>{catColorOf[c.name]=CAT_COLORS[i%CAT_COLORS.length]});
      catTotals.forEach((c,i)=>{if(!catColorOf[c.name])catColorOf[c.name]=CAT_COLORS[(spendByCat.length+i)%CAT_COLORS.length]});
      const _catFlowMax=catTotals.reduce((mx,c)=>Math.max(mx,c.inflow+c.outflow),0);
      // Center label auto-fit: scale the font down as the dollar string grows so it
      // can never spill over the donut ring.
      const _centerAmt=fmt(totalBankOut);
      const _centerFs=_centerAmt.length>=14?14:_centerAmt.length>=12?16:_centerAmt.length>=10?18:21;


      // ---- Bank statement upload ----
      // PDF/image statements are extracted by Claude Vision via /api/ai-scan
      // (scan_type 'bank_statement'); CSV exports are parsed locally. Every
      // extracted transaction dedups against the existing store using the shared
      // _bankTxnHash (the same key Plaid sync and manual entry use), then saves
      // as a ManualTxn SOP row in Supabase -- so uploaded statements flow through
      // Banking, the P&L, and the Balance Sheet exactly like any other bank
      // transaction, and re-uploading the same statement never duplicates rows.
      const _stmtNormDate=(raw)=>{
        const str=String(raw||'').trim();if(!str)return'';
        let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);
        if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
        m=/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(str);
        if(m){let y=m[3];if(y.length===2)y=(Number(y)>50?'19':'20')+y;return y+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0')}
        const d=new Date(str);if(!isNaN(d.getTime())&&d.getFullYear()>=2000&&d.getFullYear()<=2100)return d.toISOString().split('T')[0];
        return'';
      };
      const _stmtParseCsv=(text)=>{
        // Minimal CSV parser that handles quoted fields with embedded commas/newlines.
        const rows=[];let row=[];let cur='';let inQ=false;
        for(let i=0;i<text.length;i++){
          const ch=text[i];
          if(inQ){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else inQ=false}else cur+=ch}
          else if(ch==='"')inQ=true;
          else if(ch===','){row.push(cur);cur=''}
          else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(c=>String(c).trim()!==''))rows.push(row);row=[]}
          else cur+=ch;
        }
        if(cur!==''||row.length>0){row.push(cur);if(row.some(c=>String(c).trim()!==''))rows.push(row)}
        if(rows.length===0)return[];
        const lower=r=>r.map(c=>String(c||'').trim().toLowerCase());
        // Locate a header row (a row naming a date column plus an amount/debit/credit column)
        let hdrIdx=-1,hdr=null;
        for(let i=0;i<Math.min(rows.length,10);i++){
          const h=lower(rows[i]);
          if(h.some(c=>c.includes('date'))&&h.some(c=>c.includes('amount')||c.includes('debit')||c.includes('credit')||c.includes('withdrawal')||c.includes('deposit'))){hdrIdx=i;hdr=h;break}
        }
        const num=v=>{const n=parseFloat(String(v||'').replace(/[$,()\s]/g,''));const neg=/\(.*\)/.test(String(v||''))||/^-/.test(String(v||'').trim());return isNaN(n)?NaN:(neg?-Math.abs(n):n)};
        const out=[];
        if(hdrIdx>=0){
          const col=(...names)=>hdr.findIndex(c=>names.some(n=>c.includes(n)));
          const dateC=col('date');
          let descC=col('description','memo','payee','name','details','transaction');
          if(descC<0)descC=(dateC+1<hdr.length)?dateC+1:0;
          const amtC=col('amount');
          const debC=col('debit','withdrawal');
          const credC=col('credit','deposit');
          // QuickBooks register exports carry a Category column -- pass it through so
          // imported rows arrive pre-categorized instead of Uncategorized.
          const catC=col('category');
          for(let i=hdrIdx+1;i<rows.length;i++){
            const r=rows[i];const date=_stmtNormDate(r[dateC]);if(!date)continue;
            const desc=String(r[descC]||'').trim();
            const cat=catC>=0?String(r[catC]||'').trim():'';
            let amt=NaN,type='expense';
            if(amtC>=0&&String(r[amtC]||'').trim()!==''){amt=num(r[amtC]);if(isFinite(amt)){type=amt<0?'expense':'revenue';amt=Math.abs(amt)}}
            else if(debC>=0&&String(r[debC]||'').trim()!==''&&Math.abs(num(r[debC])||0)>0){amt=Math.abs(num(r[debC]));type='expense'}
            else if(credC>=0&&String(r[credC]||'').trim()!==''&&Math.abs(num(r[credC])||0)>0){amt=Math.abs(num(r[credC]));type='revenue'}
            if(!isFinite(amt)||amt<=0)continue;
            out.push({date,description:desc,amount:amt,type,category:cat});
          }
        }else{
          // No header row: assume col0 = date, col1 = description, last col = signed amount
          for(let i=0;i<rows.length;i++){
            const r=rows[i];const date=_stmtNormDate(r[0]);if(!date)continue;
            const amtRaw=num(r[r.length-1]);if(!isFinite(amtRaw)||amtRaw===0)continue;
            out.push({date,description:String(r[1]||'').trim(),amount:Math.abs(amtRaw),type:amtRaw<0?'expense':'revenue'});
          }
        }
        return out;
      };
      const _stmtImport=(txnList,sourceLabel)=>{
        const existingHashes=new Set(manualTxns.map(mt=>_bankTxnHash(mt)));
        let imported=0,skipped=0,invalid=0,lockedOut=0;
        txnList.forEach((t,i)=>{
          if(!t||!t.date||!isFinite(Number(t.amount))||Number(t.amount)<=0){invalid++;return}
          // Imported rows carry the exact same fields the manual Add Transaction form
          // writes (date / description / category / amount-as-string / type / account),
          // plus source markers so the P&L knows they are bank-feed data. When the file
          // provided a category (QuickBooks CSV export), it comes through; otherwise
          // the row lands as Uncategorized ready for the categorize sweep.
          const rec={date:t.date,description:t.description||'Statement transaction',category:(t.category&&String(t.category).trim())?String(t.category).trim():'Uncategorized',amount:String(Number(t.amount).toFixed(2)),type:t.type==='revenue'?'revenue':'expense',account:stmtAcct,source:'statement',sourceFile:sourceLabel||''};
          const hash=_bankTxnHash(rec);
          if(existingHashes.has(hash)){skipped++;return}
          // The DB refuses writes into closed periods -- surface it as a skip, not a crash.
          if(_isLockedDate(rec.date)){lockedOut++;return}
          existingHashes.add(hash);
          const id='TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-S'+i;
          addSop({id,title:rec.description,cat:'ManualTxn',icon:'dollar',content:JSON.stringify(rec),custom:true});
          imported++;
        });
        return {imported,skipped,invalid,lockedOut};
      };
      const handleStatementUpload=async(e)=>{
        const file=e.target.files&&e.target.files[0];
        if(e.target)e.target.value='';
        if(!file)return;
        setStmtUploading(true);
        try{
          const fname=(file.name||'').toLowerCase();
          let txnList=[];
          if(fname.endsWith('.csv')||file.type==='text/csv'){
            const text=await file.text();
            txnList=_stmtParseCsv(text);
            if(txnList.length===0){notify('No transactions found in the CSV. Check that it has Date and Amount (or Debit/Credit) columns.','error');setStmtUploading(false);return}
          }else{
            const b64=await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(String(rd.result).split(',')[1]);rd.onerror=reject;rd.readAsDataURL(file)});
            const mediaType=(file.type==='application/pdf'||fname.endsWith('.pdf'))?'application/pdf':(file.type||'image/png');
            const r=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data:b64,media_type:mediaType,scan_type:'bank_statement'})});
            const resp=await r.json().catch(()=>null);
            if(!r.ok||!resp||resp.error){notify('Statement scan failed'+(resp&&resp.error?': '+(resp.error.message||JSON.stringify(resp.error)):'')+'. Try a CSV export from the bank instead.','error');setStmtUploading(false);return}
            const text=(resp.content||[])[0]?.text||'';
            const clean=text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
            let parsed=null;let salvaged=false;
            try{parsed=JSON.parse(clean)}catch{
              // Very long statements can run past the model's output window, cutting
              // the JSON off mid-transaction. Salvage everything up to the last
              // complete transaction object -- those rows are fully valid, and dedup
              // makes re-running the same statement safe.
              try{
                const arrIdx=clean.indexOf('"transactions"');
                const lastComplete=clean.lastIndexOf('}');
                if(arrIdx>=0&&lastComplete>arrIdx){
                  for(let cut=lastComplete;cut>arrIdx;cut=clean.lastIndexOf('}',cut-1)){
                    try{parsed=JSON.parse(clean.slice(0,cut+1)+']}');salvaged=true;break}catch{}
                    if(cut<=0)break;
                  }
                }
              }catch{}
            }
            const list=parsed&&Array.isArray(parsed.transactions)?parsed.transactions:null;
            if(!list||list.length===0){notify('No transactions could be extracted from that statement. Try a CSV export from the bank instead.','error');setStmtUploading(false);return}
            txnList=list.map(t=>({date:_stmtNormDate(t.date),description:String(t.description||'').trim(),amount:Math.abs(Number(t.amount)||0),type:(String(t.type||'').toLowerCase()==='credit')?'revenue':'expense'}));
            if(salvaged)notify('Long statement -- recovered '+txnList.length+' complete transactions before the read cut off. After import, spot-check the last few days of the statement; a CSV export from the bank is guaranteed complete.','error');
          }
          const {imported,skipped,invalid,lockedOut}=_stmtImport(txnList,file.name||'');
          notify(imported+' transaction'+(imported!==1?'s':'')+' imported to '+stmtAcct+(skipped>0?' -- '+skipped+' skipped (already in system)':'')+(invalid>0?' -- '+invalid+' unreadable row'+(invalid!==1?'s':'')+' ignored':'')+(lockedOut>0?' -- '+lockedOut+' in closed period'+(lockedOut!==1?'s':'')+' not imported':'')+' from '+(file.name||'statement'));
        }catch(err){notify('Statement upload error: '+(err&&err.message?err.message:'unknown'),'error')}
        setStmtUploading(false);
      };


      // Plaid connect handler
      const handlePlaidConnect=async()=>{
        setPlaidLoading(true);
        try{
          const r=await fetch('/api/plaid-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create_link_token'})}).catch(()=>null);
          if(!r){notify('Cannot reach /api/plaid-link. Make sure plaid-link.js is in the api/ folder on GitHub and Vercel has redeployed.','error');setPlaidLoading(false);return}
          if(r.status===404){notify('API route not found. Push plaid-link.js to the api/ folder in GitHub and redeploy Vercel.','error');setPlaidLoading(false);return}
          const text=await r.text();let data;try{data=JSON.parse(text)}catch{notify('API returned invalid response. Go to Vercel > Deployments and click Redeploy.','error');setPlaidLoading(false);return}
          if(!r.ok||!data.link_token){
            const msg=typeof data.error==='string'?data.error:data.error_message||data.error?.message||'Unknown error';
            const debugEnv=data._debug?.env||'unknown';
            if(msg.includes('not set')||msg.includes('CLIENT_ID')||msg.includes('SECRET')){
              notify('Plaid keys not set. Go to Vercel > Settings > Environment Variables, add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV=production, then Redeploy.','error');
            } else if(msg.includes('invalid client_id')||msg.includes('invalid secret')){
              notify('Plaid keys rejected (env: '+debugEnv+'). Verify PLAID_CLIENT_ID and PLAID_SECRET in Vercel match your Plaid dashboard, and PLAID_ENV is set to "production". Then Redeploy.','error');
            } else {notify('Plaid: '+msg,'error')}
            setPlaidLoading(false);return;
          }
          if(typeof window.Plaid==='undefined'){
            await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load Plaid SDK'));document.head.appendChild(s)});
          }
          const handler=window.Plaid.create({
            token:data.link_token,
            onSuccess:async(publicToken,metadata)=>{
              try{
                const ex=await fetch('/api/plaid-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'exchange_token',public_token:publicToken})});
                const exData=await ex.json();
                if(exData.access_token){
                  localStorage.setItem('mw_plaid_access_token',exData.access_token);
                  localStorage.setItem('mw_plaid_status','connected');
                  const bankName=metadata?.institution?.name||'Bank';
                  localStorage.setItem('mw_plaid_bank_name',bankName);
                  setPlaidAccessToken(exData.access_token);setPlaidStatus('connected');setPlaidBankName(bankName);
                  // Save to sops so connection state propagates to all other devices
                  // (laptop, phone, tablet) via Supabase realtime sync. Without this,
                  // each device would show 'Bank not connected' until the user re-linked there.
                  addSop({id:'PLAID_CONN_STATE',title:'Plaid Connection State',cat:'PlaidConn',icon:'dollar',content:JSON.stringify({status:'connected',accessToken:exData.access_token,bankName:bankName,lastSync:''}),custom:true});
                  // Auto-pull 3 months of transactions immediately on first connect.
                  // Reset the auto-sync ref so the hourly auto-refresh hook reseats with the new token.
                  plaidAutoSyncRef.current=false;
                  notify('Connected to '+bankName+'. Syncing last 3 months of transactions...');
                  setTimeout(()=>{handlePlaidSync('quarter')},800);
                }else{notify('Token exchange failed: '+(exData.error_message||JSON.stringify(exData.error)||'Unknown'),'error')}
              }catch(err2){notify('Exchange error: '+err2.message,'error')}
              setPlaidLoading(false);
            },
            onExit:(err)=>{if(err)notify('Plaid: '+(err.display_message||err.error_message||'Closed'),'error');setPlaidLoading(false)},
            onEvent:()=>{},
          });
          handler.open();
        }catch(err){notify('Connection error: '+err.message,'error');setPlaidLoading(false)}
      };


      // Plaid update-mode handler. Used when the bank forces a password reset and
      // Plaid returns ITEM_LOGIN_REQUIRED ("the login details of this item have changed").
      // Update mode re-authenticates the SAME Plaid item in place -- no disconnect, no new
      // item, no duplicate accounts, and the full transaction history is preserved. The user
      // simply re-enters their new password for the same institution. Passing the existing
      // access_token to create_link_token is what puts Plaid Link into update mode; on success
      // the same access_token stays valid so no token exchange is performed.
      const handlePlaidUpdate=async()=>{
        if(!plaidAccessToken){notify('No bank connected to update. Use Connect Bank (Plaid).','error');return}
        setPlaidLoading(true);
        try{
          const r=await fetch('/api/plaid-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create_link_token',access_token:plaidAccessToken})}).catch(()=>null);
          if(!r){notify('Cannot reach /api/plaid-link. Make sure plaid-link.js is in the api/ folder on GitHub and Vercel has redeployed.','error');setPlaidLoading(false);return}
          if(r.status===404){notify('API route not found. Push plaid-link.js to the api/ folder in GitHub and redeploy Vercel.','error');setPlaidLoading(false);return}
          const text=await r.text();let data;try{data=JSON.parse(text)}catch{notify('API returned invalid response. Go to Vercel > Deployments and click Redeploy.','error');setPlaidLoading(false);return}
          if(!r.ok||!data.link_token){
            const msg=typeof data.error==='string'?data.error:data.error_message||data.error?.message||'Unknown error';
            notify('Plaid: '+msg,'error');setPlaidLoading(false);return;
          }
          if(typeof window.Plaid==='undefined'){
            await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load Plaid SDK'));document.head.appendChild(s)});
          }
          const handler=window.Plaid.create({
            token:data.link_token,
            onSuccess:async()=>{
              // Update mode keeps the same access_token valid -- do NOT exchange a token here.
              // Clear the login error, reset the auto-sync guard so the hourly hook reseats,
              // and pull recent transactions immediately.
              setPlaidSyncError('');
              try{localStorage.removeItem('mw_plaid_sync_error')}catch{}
              plaidAutoSyncRef.current=false;
              notify('Bank login updated. Syncing recent transactions...');
              setPlaidLoading(false);
              setTimeout(()=>{handlePlaidSync(plaidSyncRange==='custom'?'quarter':plaidSyncRange)},800);
            },
            onExit:(err)=>{if(err)notify('Plaid: '+(err.display_message||err.error_message||'Closed'),'error');setPlaidLoading(false)},
            onEvent:()=>{},
          });
          handler.open();
        }catch(err){notify('Update error: '+err.message,'error');setPlaidLoading(false)}
      };


      // Plaid sync handler. Dedup state is rebuilt FRESH inside handlePlaidSync below
      // (not here at render scope) so back-to-back syncs always see the latest
      // manualTxns, including any rows added by an earlier sync that hasn't yet
      // round-tripped through React's render cycle. Uses shared _bankTxnHash so a manual
      // entry stored as "125" and a Plaid record at 125.00 collapse into the same key.


      const handlePlaidSync=async(rangeOverride,silent)=>{
        if(!plaidAccessToken){if(!silent)notify('No access token. Reconnect bank.','error');return}
        // (Sep 29 2026) A tab still running an older bundle must not sync with its older rules.
        if(!(await bankSyncBundleIsCurrent())){setPlaidSyncError(BANK_STALE_BUNDLE_MSG);if(!silent)notify(BANK_STALE_BUNDLE_MSG,'error');return}
        setPlaidLoading(true);setPlaidSyncing(true);
        // Dedup sets are built from an AUTHORITATIVE fresh DB read, not React state.
        // On 7/31 a session with a partially-loaded sops list ran the hourly sync,
        // saw none of the existing rows, and re-imported 66 transactions Maureen had
        // already categorized. If the DB cannot be read in full, the sync ABORTS --
        // it never inserts against a picture of the books it cannot verify.
        // Deleted rows are part of that picture (Sep 2026): without them a re-id'd row she
        // deleted comes straight back (three deposits on 9/27). No tombstones, no import.
        const [_freshSopsForDedup,_freshTombs]=await Promise.all([db.fetchSops().catch(()=>null),db.fetchTombstones().catch(()=>null)]);
        if(!_freshSopsForDedup||!_freshTombs){
          const _msg='Sync aborted: could not verify existing transactions against the database. Nothing was imported.';
          setPlaidSyncError(_msg);if(!silent)notify(_msg,'error');
          setPlaidLoading(false);setPlaidSyncing(false);return;
        }
        setTombstones(_freshTombs);
        // Existing rows keep their ids so a pending -> posted promotion updates the row in
        // place. Fresh DB rows first, this session's rows on top (edits not yet round-tripped).
        const _existById=new Map();
        _freshSopsForDedup.forEach(x=>{if(!x||x.cat!=='ManualTxn')return;try{const c=JSON.parse(x.content);if(c&&typeof c==='object')_existById.set(x.id,{...c,id:x.id})}catch{}});
        manualTxns.forEach(mt=>_existById.set(mt.id,mt));
        // Queue and rules: this session's copy when it has one (addSop keeps it current),
        // else the fresh read -- a partial sops load must not wipe the queue or the rules.
        const _hasLocal=(id)=>(customSops||[]).some(x=>x&&x.id===id);
        const _queueNow=_hasLocal(BANK_REVIEW_QUEUE_ID)?_reviewQueue:(()=>{const r=_freshSopsForDedup.find(x=>x&&x.id===BANK_REVIEW_QUEUE_ID);let q=null;try{q=r?JSON.parse(r.content):null}catch{q=null}return q&&typeof q==='object'&&!Array.isArray(q)?q:{}})();
        const _heldNow=Array.isArray(_queueNow.held)?_queueNow.held:[];
        const _rulesNow=parseBankRules(_hasLocal(BANK_RULES_ID)?customSops:_freshSopsForDedup);
        const range=rangeOverride||plaidSyncRange;
        const n=new Date();
        // Pad endDate to today + 2 days. Plaid sometimes reports pending or
        // recently-posted transactions with future-looking effective dates;
        // a 2-day forward window guarantees we capture them.
        const endPad=new Date(n);endPad.setDate(endPad.getDate()+2);
        let startDate,endDate=endPad.toISOString().split('T')[0];
        if(range==='custom'&&plaidSyncFrom){startDate=plaidSyncFrom;endDate=plaidSyncTo||endDate}
        else if(range==='month'){const d=new Date(n);d.setMonth(d.getMonth()-1);startDate=d.toISOString().split('T')[0]}
        else if(range==='quarter'){const d=new Date(n);d.setMonth(d.getMonth()-3);startDate=d.toISOString().split('T')[0]}
        else if(range==='6months'){const d=new Date(n);d.setMonth(d.getMonth()-6);startDate=d.toISOString().split('T')[0]}
        else if(range==='year'){const d=new Date(n);d.setFullYear(d.getFullYear()-1);startDate=d.toISOString().split('T')[0]}
        else if(range==='2years'){const d=new Date(n);d.setFullYear(d.getFullYear()-2);startDate=d.toISOString().split('T')[0]}
        else if(range==='all'){startDate='2020-01-01'}
        else{const d=new Date(n);d.setMonth(d.getMonth()-3);startDate=d.toISOString().split('T')[0]}
        // For silent (auto) syncs and non-custom ranges, expand the window backward
        // to overlap the prior sync by 14 days. This guarantees that any transaction
        // posted retroactively after the last sync window's endDate gets caught.
        // Dedup (plaidId + date|amount|desc-hash) prevents duplicates from overlap.
        if(silent&&range!=='custom'&&range!=='all'){
          try{
            const lastStr=plaidLastSync||localStorage.getItem('mw_plaid_last_sync')||'';
            if(lastStr){
              const overlap=new Date(lastStr);overlap.setDate(overlap.getDate()-14);
              const overlapStr=overlap.toISOString().split('T')[0];
              if(overlapStr<startDate)startDate=overlapStr;
            }
          }catch{}
        }
        try{
          const r=await fetch('/api/plaid-transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token:plaidAccessToken,start_date:startDate,end_date:endDate})});
          const data=await r.json();
          if(!r.ok||data.error_code||data.error){
            const errMsg=data.error_message||data.error?.message||data.error||'Sync failed';
            setPlaidSyncError(errMsg);
            if(!silent)notify('Plaid: '+errMsg,'error');
            setPlaidLoading(false);setPlaidSyncing(false);return;
          }
          // Capture live account balances alongside the transactions -- feeds the
          // Balance Sheet's Cash figure with real bank numbers instead of a proxy.
          if(Array.isArray(data.accounts)&&data.accounts.length>0){try{addSop({id:'BANK_BALANCES_GLOBAL',title:'Bank Balances',cat:'BankBalances',icon:'dollar',content:JSON.stringify({asOf:new Date().toISOString(),accounts:data.accounts.map(a=>({id:a.account_id||'',name:a.name||a.official_name||'',mask:a.mask||'',type:a.type||'',subtype:a.subtype||'',current:a.balances?.current??null,available:a.balances?.available??null}))}),custom:true});}catch(_e){}}
          const txns=data.added||data.transactions||[];
          // One plan for the whole batch (planPlaidImport in App.jsx, shared with the app-level
          // auto sync): pending skipped, pending -> posted promoted in place, known ids and
          // fingerprints skipped, deleted ones skipped, same account/day/amount with a new memo
          // HELD for review, closed periods to Late Arrivals, the rest imported by the rules.
          const plan=planPlaidImport({txns,existing:[..._existById.values()],held:_heldNow,tombstones:_freshTombs,rules:_rulesNow,isLocked:_isLockedDate,now:new Date().toISOString()});
          plan.additions.forEach(x=>addSop(x));
          plan.updates.forEach(x=>addSop(x));
          if(plan.held.length)addSop({id:BANK_REVIEW_QUEUE_ID,title:'Bank Review Queue',cat:'Settings',icon:'shield',content:JSON.stringify({..._queueNow,held:[..._heldNow,...plan.held],keep:Array.isArray(_queueNow.keep)?_queueNow.keep:[]}),custom:true});
          const lateArr=plan.late;const _pc=plan.counts;
          // (Sep 29 2026) Pending items now wait until the bank posts them, so a quiet feed and a
          // stuck feed look the same unless the header says what the bank returned.
          const _visAcct=(a)=>!(a&&_bankAcctMetaGlobal[a]&&_bankAcctMetaGlobal[a].excluded);const _vis=(t)=>!!t&&_visAcct(t.account_id);const _maxD=(arr)=>arr.reduce((m,t)=>(typeof t.date==='string'&&t.date>m)?t.date:m,'');const _vt=txns.filter(_vis);const _visRec=(r)=>{try{return _visAcct(JSON.parse(r.content).account)}catch{return true}};
          const _lastResult={imported:plan.additions.filter(_visRec).length,held:plan.held.filter(h=>_visAcct(h&&h.account)).length,promoted:_pc.promoted,late:_pc.late,skippedSame:_pc.skippedSame,skippedDeleted:_pc.skippedDeleted,pending:_vt.filter(t=>t.pending===true).length,newestPosted:_maxD(_vt.filter(t=>t.pending!==true)),newestPending:_maxD(_vt.filter(t=>t.pending===true))};
          const syncTime=new Date().toISOString();
          localStorage.setItem('mw_plaid_last_sync',syncTime);setPlaidLastSync(syncTime);
          setPlaidSyncError('');
          // Update sops PLAID_CONN_STATE so other devices know about the latest sync time.
          // Without this, every device would re-sync the same recent window on its own auto-sync.
          try{const _existRec=(customSops||[]).find(s=>s.id==='PLAID_CONN_STATE');const _existData=_existRec?JSON.parse(_existRec.content||'{}'):{};addSop({id:'PLAID_CONN_STATE',title:'Plaid Connection State',cat:'PlaidConn',icon:'dollar',content:JSON.stringify({status:'connected',accessToken:plaidAccessToken,bankName:plaidBankName||_existData.bankName||'',lastSync:syncTime,lastResult:_lastResult}),custom:true})}catch{}
          if(lateArr.length){
            // Merge into the queue, dedup by plaidId (or date|amount|desc when no id).
            const seenQ=new Set(_lateArrivals.map(x=>x.plaidId||_bankTxnHash(x)));
            const fresh=lateArr.filter(x=>!seenQ.has(x.plaidId||_bankTxnHash(x)));
            if(fresh.length)addSop({id:'LATE_ARRIVALS_GLOBAL',title:'Late Arrivals',cat:'Settings',icon:'clock',content:JSON.stringify([..._lateArrivals,...fresh]),custom:true});
          }
          if(!silent||_pc.imported>0||_pc.held>0||_pc.promoted>0||lateArr.length>0)notify(_pc.imported+' new'+(_pc.held>0?', '+_pc.held+' held for review':'')+(_pc.skippedSame>0?', '+_pc.skippedSame+' skipped (already in system)':'')+(_pc.skippedDeleted>0?', '+_pc.skippedDeleted+' skipped (deleted before)':'')+(_pc.promoted>0?', '+_pc.promoted+' posted (pending updated)':'')+(lateArr.length>0?', '+lateArr.length+' routed to Late Arrivals (closed period)':'')+' ('+startDate+' to '+endDate+')');
        }catch(err){
          setPlaidSyncError(err.message||'Network error');
          if(!silent)notify('Sync error: '+err.message,'error');
        }
        setPlaidLoading(false);setPlaidSyncing(false);
      };


      // Auto-refresh every hour while bank is connected. Sets up once per session
      // (guarded by plaidAutoSyncRef) and uses setInterval to fire silent syncs.
      // Also catches up immediately if last sync was more than 1 hour ago when the
      // user lands on the Banking tab. Uses 'quarter' (3 months) as the minimum
      // window so recent backfills are always covered.
      // The latestSyncRef pattern ensures the interval always invokes the freshest
      // handlePlaidSync (with up-to-date dedup sets) on each tick, avoiding stale
      // closures that could re-import already-synced transactions.
      plaidLatestSyncRef.current=handlePlaidSync;
      if(plaidStatus==='connected'&&plaidAccessToken&&!plaidAutoSyncRef.current){
        plaidAutoSyncRef.current=true;
        const lastSync=plaidLastSync?new Date(plaidLastSync):null;
        // Catch-up sync on Banking tab mount: fire immediately if last sync
        // was more than 5 minutes ago. This keeps the displayed transactions
        // current the moment the user lands on the page, not just hourly.
        const minsSinceMount=lastSync?((Date.now()-lastSync.getTime())/60000):999;
        const initialRange=plaidSyncRange==='custom'?'quarter':plaidSyncRange;
        if(minsSinceMount>=5){setTimeout(()=>{const fn=plaidLatestSyncRef.current;if(fn)fn(initialRange,true)},1500)}
        // 15-minute background sync. Range follows the user's selected preset (or
        // falls back to quarter for the custom preset to avoid surprise re-pulls).
        // The 12-minute throttle prevents overlapping fires while still allowing the
        // 15-minute cadence to consistently catch new transactions through the day.
        setInterval(()=>{
          try{
            const tok=localStorage.getItem('mw_plaid_access_token');
            const stat=localStorage.getItem('mw_plaid_status');
            if(!tok||stat!=='connected')return;
            const lastSyncStr=localStorage.getItem('mw_plaid_last_sync');
            const last=lastSyncStr?new Date(lastSyncStr):null;
            const minsSince=last?((Date.now()-last.getTime())/60000):999;
            if(minsSince<12)return;
            const currentRange=localStorage.getItem('mw_plaid_sync_range')||'year';
            const r=currentRange==='custom'?'quarter':currentRange;
            const fn=plaidLatestSyncRef.current;
            if(fn)fn(r,true);
          }catch{}
        },900000);
      }


      // Detect the Plaid re-auth condition. When a bank forces a password reset, Plaid
      // returns ITEM_LOGIN_REQUIRED with a message like "the login details of this item
      // have changed". In that state Sync Now cannot succeed until the item is
      // re-authenticated via update mode (handlePlaidUpdate). Drives the callout + button.
      const plaidNeedsReauth=plaidStatus==='connected'&&/login details|ITEM_LOGIN_REQUIRED|login_required|credentials|re-?authenticate|password reset/i.test(plaidSyncError||'');


      const _lockedInRange=[..._closedSet].filter(mp=>{try{const st=new Date(mp+'-01T00:00:00');const en=new Date(st.getFullYear(),st.getMonth()+1,0,23,59,59);return st<=toD&&en>=fromD}catch{return false}}).sort();
      const dismissLate=(item)=>{const key=item.plaidId||_bankTxnHash(item);const next=_lateArrivals.filter(x=>(x.plaidId||_bankTxnHash(x))!==key);addSop({id:'LATE_ARRIVALS_GLOBAL',title:'Late Arrivals',cat:'Settings',icon:'clock',content:JSON.stringify(next),custom:true});notify('Removed from Late Arrivals')};
      const recordLate=(item)=>{
        const today=new Date().toISOString().split('T')[0];
        if(_isLockedDate(today)){notify(_lockMsg(today),'error');return}
        const rec={date:today,description:(item.description||'Bank transaction')+' -- late arrival, bank date '+item.date,category:'Uncategorized',amount:item.amount,type:item.type,account:item.account||'Operating',plaidId:item.plaidId||undefined,plaidCategory:item.plaidCategory||'',source:'late_arrival',originalDate:item.date};
        const id='TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-L';
        addSop({id,title:rec.description,cat:'ManualTxn',icon:'dollar',content:JSON.stringify(rec),custom:true});
        dismissLate(item);
        notify('Recorded in the open period, dated today, with the original bank date in the memo');
      };
      return <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {_lockedInRange.length>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"rgba(251,191,36,0.04)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:"1px solid rgba(251,191,36,0.2)"}}>
          <span style={{color:"#fbbf24",display:"flex"}}><I n="shield" s={14}/></span>
          <span style={{fontSize:12.5,color:"#d4d4d4",fontFamily:"'Satoshi',sans-serif"}}><span style={{color:"#fbbf24",fontWeight:700}}>Closed period{_lockedInRange.length!==1?'s':''} in view:</span> {_lockedInRange.join(', ')} -- transactions dated inside are locked at the database. Corrections go through a prior-period adjustment or an audited reopen on the Close tab.</span>
        </div>}
        {_lateArrivals.length>0&&<div style={{borderRadius:12,background:"rgba(251,191,36,0.03)",border:"1px solid rgba(251,191,36,0.18)",overflow:"hidden"}}>
          <div onClick={()=>setLateOpen(!lateOpen)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",cursor:"pointer"}}>
            <span style={{fontSize:9,fontWeight:700,color:"#fbbf24",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",padding:"3px 10px",borderRadius:20,letterSpacing:1.5,fontFamily:"'JetBrains Mono',monospace"}}>LATE ARRIVALS ({_lateArrivals.length})</span>
            <span style={{fontSize:11.5,color:"#9a9a9a",flex:1,fontFamily:"'Satoshi',sans-serif"}}>Bank transactions that arrived dated inside a closed period. Record them into the open period or dismiss.</span>
            <span style={{fontSize:10,color:"#737373",transform:lateOpen?"rotate(90deg)":"none",transition:"transform 0.2s"}}>{'\u25B6'}</span>
          </div>
          {lateOpen&&<div style={{borderTop:"1px solid rgba(251,191,36,0.12)"}}>{_lateArrivals.map((item,ix)=><div key={ix} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:11,color:"#9a9a9a",fontFamily:"'JetBrains Mono',monospace",width:78,flexShrink:0}}>{item.date}</span>
            <span style={{fontSize:12,color:"#d4d4d4",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Satoshi',sans-serif"}}>{item.description}</span>
            <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:item.type==='revenue'?"#34d399":"#f87171",flexShrink:0}}>{item.type==='revenue'?'+':'-'}{fmt(parseFloat(item.amount)||0)}</span>
            <Btn v="secondary" style={{fontSize:10,padding:"3px 10px"}} onClick={()=>recordLate(item)}>Record Today</Btn>
            <button onClick={()=>dismissLate(item)} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:10.5,fontFamily:"inherit"}}>Dismiss</button>
          </div>)}</div>}
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          {kpi("TOTAL IN",fmt(totalBankIn),filteredBankTxns.filter(t=>t.type==='revenue').length+" deposits","#34d399")}
          {kpi("TOTAL OUT",fmt(totalBankOut),filteredBankTxns.filter(t=>t.type==='expense').length+" payments","#f87171")}
          {kpi("NET",fmt(totalBankIn-totalBankOut),"","#2dd4bf")}
          <div onClick={()=>setBankCatFilter(bankCatFilter==='__uncat__'?'all':'__uncat__')} style={{cursor:"pointer"}} title={bankCatFilter==='__uncat__'?"Click to show all transactions":"Click to show only uncategorized transactions"}>{kpi("UNCATEGORIZED",String(uncategorized),bankCatFilter==='__uncat__'?"showing only these -- click to clear":(uncategorized>0?"needs review -- click to filter":"all done"),uncategorized>0?"#fbbf24":"#34d399")}</div>
        </div>


        {/* Reconciliation tie-out row: where the money went by category, and the
            per-category totals to line up against QuickBooks for the same period. */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="resp-grid-2">
          <Card style={{padding:16}} hover>
            <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>Spending by Category</div>
            <div style={{fontSize:10,color:"#525252",marginBottom:10}}>money out across the filtered transactions</div>
            {spendByCat.length===0?<div style={{padding:"50px 0",textAlign:"center",color:"#525252",fontSize:12}}>No outgoing transactions in this view</div>:
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={280}><PieChart>
                <defs>
                  {CAT_COLORS.map((col,i)=><linearGradient key={'catGrad'+i} id={'catGrad'+i} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={col} stopOpacity={1}/><stop offset="100%" stopColor={col} stopOpacity={0.55}/></linearGradient>)}
                </defs>
                <Tooltip contentStyle={{background:"rgba(10,10,10,0.92)",backdropFilter:"blur(8px)",border:"1px solid rgba(45,212,191,0.2)",borderRadius:10,fontSize:11,color:"#e5e5e5",boxShadow:"0 8px 24px rgba(0,0,0,0.6)",padding:"8px 12px"}} itemStyle={{color:"#e5e5e5",fontSize:11,padding:0}} formatter={(v,name)=>[fmt(v)+(totalBankOut>0?" ("+(v/totalBankOut*100).toFixed(1)+"%)":""),name]}/>
                <Pie data={spendByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={76} outerRadius={104} paddingAngle={spendByCat.length>1?2.5:0} cornerRadius={6} stroke="#0a0a0a" strokeWidth={3} animationDuration={1100} animationEasing="ease-out">
                  {spendByCat.map((entry,i)=><Cell key={'c'+i} fill={'url(#catGrad'+(i%CAT_COLORS.length)+')'} style={{filter:'drop-shadow(0 0 6px '+CAT_COLORS[i%CAT_COLORS.length]+'30)',outline:'none'}}/>)}
                </Pie>
              </PieChart></ResponsiveContainer>
              {/* Center label sits inside a 152px inner circle; font auto-scales with
                  the dollar-string length so it can never overlap the ring. */}
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none",width:140}}>
                <div style={{fontSize:9,color:"#737373",letterSpacing:2,fontWeight:700,marginBottom:3}}>TOTAL OUT</div>
                <div style={{fontSize:_centerFs,fontWeight:800,color:"#f87171",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1,whiteSpace:"nowrap"}}>{_centerAmt}</div>
                <div style={{fontSize:9,color:"#525252",marginTop:4}}>{spendByCat.length} categor{spendByCat.length===1?'y':'ies'}</div>
              </div>
            </div>}
            {spendByCat.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10,justifyContent:"center"}}>{spendByCat.slice(0,8).map((c2,i)=><div key={c2.name} onClick={()=>setBankCatFilter(bankCatFilter===(c2.name==='Uncategorized'?'__uncat__':c2.name)?'all':(c2.name==='Uncategorized'?'__uncat__':c2.name))} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#c4c4c4",padding:"3px 9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:20,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=CAT_COLORS[i%CAT_COLORS.length]+'60';e.currentTarget.style.background=CAT_COLORS[i%CAT_COLORS.length]+'0d'}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";e.currentTarget.style.background="rgba(255,255,255,0.03)"}} title={"Click to filter to "+c2.name}><div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],boxShadow:'0 0 5px '+CAT_COLORS[i%CAT_COLORS.length]+'80'}}/>{c2.name}<span style={{color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>{totalBankOut>0?(c2.value/totalBankOut*100).toFixed(0)+'%':''}</span></div>)}{spendByCat.length>8&&<div style={{fontSize:10,color:"#525252",padding:"3px 6px"}}>+{spendByCat.length-8} more</div>}</div>}
          </Card>
          <Card style={{padding:16}} hover>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,flexWrap:"wrap",marginBottom:6}}>
              <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Category Totals</div>
              <div style={{fontSize:10,color:"#525252"}}>line these up with QuickBooks for the same period</div>
            </div>
            {catTotals.length===0?<div style={{padding:"50px 0",textAlign:"center",color:"#525252",fontSize:12}}>No transactions in this view</div>:
            <div style={{maxHeight:280,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:"2px solid #222"}}>{["Category","Txns","In","Out","Net"].map(h=><th key={h} style={{padding:"6px 6px",textAlign:h==="Category"?"left":"right",color:"#737373",fontSize:10,fontWeight:600,letterSpacing:0.5,position:"sticky",top:0,background:"#111111"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {catTotals.map(c2=>{const net=c2.inflow-c2.outflow;const isUncat=c2.name==='Uncategorized';return <tr key={c2.name} onClick={()=>setBankCatFilter(bankCatFilter===(isUncat?'__uncat__':c2.name)?'all':(isUncat?'__uncat__':c2.name))} style={{borderBottom:"1px solid #111",cursor:"pointer",background:isUncat&&c2.count>0?"#fbbf2408":"transparent",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.05)"} onMouseLeave={e=>e.currentTarget.style.background=isUncat&&c2.count>0?"#fbbf2408":"transparent"} title="Click to filter the transaction list to this category">
                    <td style={{padding:"7px 6px",color:isUncat?"#fbbf24":"#e5e5e5",fontWeight:isUncat?700:500}}>{c2.name}<div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",marginTop:4,maxWidth:160,overflow:"hidden"}}><div style={{width:(_catFlowMax>0?Math.max(2,(c2.inflow+c2.outflow)/_catFlowMax*100):0)+"%",height:"100%",borderRadius:2,background:isUncat?"#fbbf24":(catColorOf[c2.name]||"#2dd4bf"),boxShadow:"0 0 4px "+(isUncat?"#fbbf24":(catColorOf[c2.name]||"#2dd4bf"))+"60",transition:"width 0.6s ease-out"}}/></div></td>
                    <td style={{padding:"7px 6px",textAlign:"right",color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>{c2.count}</td>
                    <td style={{padding:"7px 6px",textAlign:"right",color:c2.inflow>0?"#34d399":"#333",fontFamily:"'JetBrains Mono',monospace"}}>{c2.inflow>0?fmt(c2.inflow):"--"}</td>
                    <td style={{padding:"7px 6px",textAlign:"right",color:c2.outflow>0?"#f87171":"#333",fontFamily:"'JetBrains Mono',monospace"}}>{c2.outflow>0?fmt(c2.outflow):"--"}</td>
                    <td style={{padding:"7px 6px",textAlign:"right",fontWeight:700,color:net>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(net)}</td>
                  </tr>})}
                  <tr style={{borderTop:"2px solid #222"}}><td style={{padding:"8px 6px",fontWeight:800,color:"#f0f0f0"}}>TOTAL</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{filteredBankTxns.length}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalBankIn)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:800,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalBankOut)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:800,color:(totalBankIn-totalBankOut)>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalBankIn-totalBankOut)}</td></tr>
                </tbody>
              </table>
            </div>}
          </Card>
        </div>


        <Card style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{manualEditing?'Edit Transaction':'Add Transaction'}</div>
            {plaidStatus==='connected'&&<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:plaidSyncing?"#fbbf24":(plaidSyncError?"#f87171":"#34d399"),boxShadow:plaidSyncing?"0 0 6px #fbbf2480":(plaidSyncError?"0 0 6px #f8717180":"0 0 6px #34d39960"),animation:plaidSyncing?"pulse 1.2s ease-in-out infinite":"none"}}/>
              <span style={{fontSize:11,color:plaidSyncing?"#fbbf24":(plaidSyncError?"#f87171":"#34d399"),fontWeight:600}}>
                {plaidSyncing?'Syncing...':plaidSyncError?'Sync error':(plaidBankName||'Bank')+' connected'}
              </span>
              {plaidLastSync&&!plaidSyncing&&(()=>{
                const last=new Date(plaidLastSync);const diffMs=Date.now()-last.getTime();const diffMin=Math.floor(diffMs/60000);
                const rel=diffMin<1?'just now':diffMin<60?diffMin+' min'+(diffMin!==1?'s':'')+' ago':diffMin<1440?Math.floor(diffMin/60)+'h '+(diffMin%60)+'m ago':Math.floor(diffMin/1440)+'d ago';
                return <span style={{fontSize:10,color:"#525252"}} title={last.toLocaleString()}>Last sync: {rel}</span>;
              })()}
              {!plaidSyncing&&_plaidConnData.lastResult&&typeof _plaidConnData.lastResult==='object'&&(()=>{const lr=_plaidConnData.lastResult;const md=(d)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));return m?(+m[2])+'/'+(+m[3]):''};const parts=[(Number(lr.imported)||0)+' new'];if(Number(lr.held))parts.push(lr.held+' held for review');if(Number(lr.pending))parts.push(lr.pending+' pending at the bank');if(md(lr.newestPosted))parts.push('bank posted through '+md(lr.newestPosted));return <span className="bk-sync-summary" style={{fontSize:10,color:"#737373",fontFamily:"'JetBrains Mono',monospace"}} title="What the last sync found. Pending items are added once the bank posts them, so a transaction is never imported twice.">{parts.join(' \u00b7 ')}</span>})()}
              {plaidSyncError&&<span style={{fontSize:10,color:"#f87171",background:"#f8717115",padding:"2px 8px",borderRadius:4}} title={plaidSyncError}>{plaidSyncError.length>40?plaidSyncError.slice(0,40)+'...':plaidSyncError}</span>}
              <Btn v={plaidNeedsReauth?"primary":"secondary"} style={plaidNeedsReauth?{fontSize:11,padding:"4px 10px"}:{fontSize:11,padding:"4px 10px",color:"#a78bfa",border:"1px solid #a78bfa30"}} onClick={handlePlaidUpdate} title="Re-enter your bank password after a reset -- keeps the same connection and history">{plaidLoading?'...':'Update Login'}</Btn>
              <Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>handlePlaidSync()}>{plaidLoading?'Syncing...':'Sync Now'}</Btn>
              <Btn v="secondary" style={{fontSize:11,padding:"4px 10px",color:"#f87171",border:"1px solid #f8717130"}} onClick={()=>{localStorage.removeItem('mw_plaid_access_token');localStorage.removeItem('mw_plaid_status');localStorage.removeItem('mw_plaid_bank_name');localStorage.removeItem('mw_plaid_last_sync');setPlaidAccessToken('');setPlaidStatus('disconnected');setPlaidBankName('');setPlaidLastSync('');setPlaidSyncError('');plaidAutoSyncRef.current=false;/* Mark disconnected in sops so other devices also reflect the disconnect */addSop({id:'PLAID_CONN_STATE',title:'Plaid Connection State',cat:'PlaidConn',icon:'dollar',content:JSON.stringify({status:'disconnected',accessToken:'',bankName:'',lastSync:''}),custom:true});notify('Bank disconnected on all devices')}}>Disconnect</Btn>
            </div>}
            {plaidStatus!=='connected'&&<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#525252"}}/><span style={{fontSize:11,color:"#525252"}}>Bank not connected</span><Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={handlePlaidConnect}>{plaidLoading?'Loading...':'Connect Bank (Plaid)'}</Btn></div>}
          </div>
          {plaidNeedsReauth&&<div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",marginBottom:12,background:"#2dd4bf0d",border:"1px solid #2dd4bf40",borderRadius:10}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#2dd4bf20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,color:"#2dd4bf"}}><I n="alert" s={13}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:"#2dd4bf",marginBottom:3}}>Bank login needs updating</div>
              <div style={{fontSize:11.5,color:"#c4c4c4",lineHeight:1.5}}>Your bank changed your login, which usually means a password reset. Click Update Login, re-enter your new password for {plaidBankName||'your bank'}, and syncing resumes automatically. Your existing transactions stay in place -- nothing is deleted, and there is no need to disconnect.</div>
            </div>
            <Btn v="primary" style={{fontSize:11,padding:"6px 12px",flexShrink:0,whiteSpace:"nowrap"}} onClick={handlePlaidUpdate}>{plaidLoading?'...':'Update Login'}</Btn>
          </div>}
          {plaidStatus==='connected'&&<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:12,padding:"8px 12px",background:"#111",borderRadius:8,border:"1px solid #222"}}>
            <span style={{fontSize:11,color:"#737373",fontWeight:600}}>Sync range:</span>
            {[["month","1 Month"],["quarter","3 Months"],["6months","6 Months"],["year","1 Year"],["2years","2 Years"],["all","All Time"],["custom","Custom"]].map(([v,l])=><button key={v} onClick={()=>{setPlaidSyncRange(v);try{localStorage.setItem('mw_plaid_sync_range',v)}catch{}if(v!=='custom')handlePlaidSync(v)}} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:plaidSyncRange===v?"#2dd4bf":"transparent",color:plaidSyncRange===v?"#000":"#525252",fontSize:11,fontWeight:plaidSyncRange===v?600:400,fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}
            {plaidSyncRange==='custom'&&<><input type="date" value={plaidSyncFrom} onChange={e=>setPlaidSyncFrom(e.target.value)} style={{padding:"3px 6px",background:"#0a0a0a",border:"1px solid #333",borderRadius:6,color:"#f0f0f0",fontSize:11,fontFamily:"inherit"}}/><span style={{color:"#525252",fontSize:11}}>to</span><input type="date" value={plaidSyncTo} onChange={e=>setPlaidSyncTo(e.target.value)} style={{padding:"3px 6px",background:"#0a0a0a",border:"1px solid #333",borderRadius:6,color:"#f0f0f0",fontSize:11,fontFamily:"inherit"}}/><Btn style={{fontSize:11,padding:"4px 10px"}} onClick={()=>handlePlaidSync('custom')}>{plaidLoading?'...':'Sync Range'}</Btn></>}
            {/* Range preview: shows the exact start/end dates that will be requested for the selected preset. Auto-refresh hourly indicator on the right. */}
            {(()=>{
              const n=new Date();const endDate=n.toISOString().split('T')[0];let startDate;
              if(plaidSyncRange==='custom'){startDate=plaidSyncFrom||'(pick start date)'}
              else if(plaidSyncRange==='month'){const d=new Date(n);d.setMonth(d.getMonth()-1);startDate=d.toISOString().split('T')[0]}
              else if(plaidSyncRange==='quarter'){const d=new Date(n);d.setMonth(d.getMonth()-3);startDate=d.toISOString().split('T')[0]}
              else if(plaidSyncRange==='6months'){const d=new Date(n);d.setMonth(d.getMonth()-6);startDate=d.toISOString().split('T')[0]}
              else if(plaidSyncRange==='year'){const d=new Date(n);d.setFullYear(d.getFullYear()-1);startDate=d.toISOString().split('T')[0]}
              else if(plaidSyncRange==='2years'){const d=new Date(n);d.setFullYear(d.getFullYear()-2);startDate=d.toISOString().split('T')[0]}
              else if(plaidSyncRange==='all'){startDate='2020-01-01'}
              else{const d=new Date(n);d.setMonth(d.getMonth()-3);startDate=d.toISOString().split('T')[0]}
              const e=plaidSyncRange==='custom'&&plaidSyncTo?plaidSyncTo:endDate;
              return <span style={{fontSize:10,color:"#525252",marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace"}}>{startDate} to {e} -- auto-refresh every 1 hr</span>;
            })()}
          </div>}
          {/* Bank statement upload bar. PDF statements are parsed by Claude Vision;
              CSV exports parse locally. Extracted transactions save straight into the
              database (ManualTxn rows) with dedup, so re-uploads never duplicate. */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:12,padding:"10px 12px",background:"#111",borderRadius:8,border:"1px solid #2dd4bf25"}}>
            <span style={{fontSize:11,color:"#2dd4bf",fontWeight:700,letterSpacing:0.5}}>UPLOAD BANK STATEMENT</span>
            <select value={stmtAcct} onChange={e=>setStmtAcct(e.target.value)} disabled={stmtUploading} style={{...inputStyle,width:"auto",padding:"5px 8px",fontSize:11}} title="Which account these transactions belong to">{allAccounts.map(a=><option key={a} value={a}>{a}</option>)}</select>
            <Btn v="secondary" disabled={stmtUploading} style={{fontSize:11,padding:"5px 12px",opacity:stmtUploading?0.6:1,cursor:stmtUploading?"wait":"pointer"}} onClick={()=>{if(!stmtUploading&&stmtFileRef.current)stmtFileRef.current.click()}}><I n="upload" s={12}/> {stmtUploading?'Processing statement...':'Choose File (PDF / CSV)'}</Btn>
            <input ref={stmtFileRef} type="file" accept=".pdf,.csv,.png,.jpg,.jpeg" style={{display:"none"}} onChange={handleStatementUpload}/>
            <span style={{fontSize:10,color:"#525252"}}>Transactions are extracted, checked against existing entries, and saved to the database</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:12}}>
            <div><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Date</label><input type="date" value={manualForm.date} onChange={e=>setManualForm({...manualForm,date:e.target.value})} style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Description</label><input value={manualForm.description} onChange={e=>setManualForm({...manualForm,description:e.target.value})} placeholder="e.g. Smith System payment" style={inputStyle}/></div>
            <div style={{position:"relative"}}><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Category</label><input value={manualForm.category} onChange={e=>{const cat=e.target.value;const newType=bankCategoryType(cat,'expense');setManualForm({...manualForm,category:cat,type:newType});e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onFocus={e=>{e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onBlur={e=>{setTimeout(()=>{if(e.target.nextElementSibling)e.target.nextElementSibling.style.display='none'},150)}} placeholder="Type to search..." style={inputStyle} autoComplete="off"/><div style={{display:"none",position:"absolute",top:"100%",left:0,right:0,maxHeight:220,overflowY:"auto",background:"#111",border:"1px solid #333",borderRadius:6,zIndex:20,boxShadow:"0 8px 20px rgba(0,0,0,0.5)"}}>{categories.filter(c=>!manualForm.category||c.toLowerCase().includes(manualForm.category.toLowerCase())).map(c=><div key={c} onMouseDown={e=>{e.preventDefault();const newType=c.startsWith('Revenue')?'revenue':'expense';setManualForm({...manualForm,category:c,type:newType});e.target.closest('div[style*="position"]').style.display='none'}} style={{padding:"6px 10px",fontSize:11,color:manualForm.category===c?"#14b8a6":"#a3a3a3",cursor:"pointer",borderBottom:"1px solid #1a1a1a"}} onMouseEnter={e=>{e.currentTarget.style.background="#1a1a1a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>{c}</div>)}</div></div>
            <div><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Amount</label><input type="number" value={manualForm.amount} onChange={e=>setManualForm({...manualForm,amount:e.target.value})} placeholder="0.00" style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Type</label><select value={manualForm.type} onChange={e=>setManualForm({...manualForm,type:e.target.value})} style={inputStyle}><option value="expense">Expense (out)</option><option value="revenue">Revenue (in)</option><option value="asset">Asset</option><option value="liability">Liability</option></select></div>
            <div><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Account</label><select value={manualForm.account} onChange={e=>setManualForm({...manualForm,account:e.target.value})} style={inputStyle}>{allAccounts.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={saveTxn}>{manualEditing?'Update':'Add Transaction'}</Btn>{manualEditing&&<Btn v="secondary" onClick={()=>{setManualForm({date:'',description:'',category:'',amount:'',type:'expense',account:'Operating'});setManualEditing(null)}}>Cancel</Btn>}</div>
        </Card>


        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="Search transactions..." style={{...inputStyle,flex:1,minWidth:200,maxWidth:300}}/>
          <select value={bankCatFilter} onChange={e=>setBankCatFilter(e.target.value)} style={{...inputStyle,width:"auto"}}><option value="all">All Categories</option><option value="__uncat__">Uncategorized only</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <Btn v="secondary" style={{fontSize:11,padding:"6px 12px"}} onClick={exportBankCsv} title="Export the transactions currently shown (all active filters applied) as a CSV -- date, description, category, amount, type, account, source. Line-for-line comparable against the QuickBooks register."><I n="download" s={12}/> Export CSV</Btn>
          {allBankAcctIds.length>0&&(()=>{const visibleAccts=allBankAcctIds.filter(a=>!bankAcctMeta[a]?.excluded);return <div ref={acctFilterRef} style={{position:"relative"}}>
            <button type="button" onClick={()=>setAcctFilterOpen(!acctFilterOpen)} style={{...inputStyle,width:"auto",minWidth:180,maxWidth:260,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,cursor:"pointer",border:"1px solid "+(acctFilterActive?"rgba(45,212,191,0.4)":"#222"),background:acctFilterActive?"rgba(45,212,191,0.06)":"#111",color:acctFilterActive?"#2dd4bf":"#c4c4c4",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{!acctFilterActive?"All Accounts ("+visibleAccts.length+")":selectedAcctIds.length===1?acctDisplayName(selectedAcctIds[0]):selectedAcctIds.length+" of "+visibleAccts.length+" accounts"}</span>
              <span style={{fontSize:9,opacity:0.7,flexShrink:0}}>{acctFilterOpen?'▲':'▼'}</span>
            </button>
            {acctFilterOpen&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:280,maxWidth:360,maxHeight:380,overflowY:"auto",background:"#0a0a0a",border:"1px solid rgba(45,212,191,0.18)",borderRadius:10,zIndex:30,boxShadow:"0 12px 32px rgba(0,0,0,0.6)",padding:6}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px 8px 10px",borderBottom:"1px solid #1a1a1a",marginBottom:4}}>
                <span style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:0.8,fontWeight:700}}>Filter by Account</span>
                <div style={{display:"flex",gap:8}}>
                  <button type="button" onClick={()=>setSelectedAcctIds([])} style={{background:"none",border:"none",color:!acctFilterActive?"#2dd4bf":"#737373",fontSize:10,fontFamily:"inherit",cursor:"pointer",fontWeight:!acctFilterActive?700:400}}>All</button>
                  <span style={{color:"#333",fontSize:10}}>·</span>
                  <button type="button" onClick={()=>setSelectedAcctIds(visibleAccts)} style={{background:"none",border:"none",color:"#737373",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}>Pick all</button>
                </div>
              </div>
              {visibleAccts.map(id=>{const isOn=acctFilterActive&&selectedAcctIds.includes(id);const txnCount=allTxns.filter(t=>t.account===id).length;const meta=bankAcctMeta[id]||{};const hasNickname=!!meta.nickname;return <div key={id} onClick={()=>toggleSelectedAcct(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:6,cursor:"pointer",background:isOn?"rgba(45,212,191,0.06)":"transparent",transition:"background 0.1s"}} onMouseEnter={e=>{if(!isOn)e.currentTarget.style.background="#111"}} onMouseLeave={e=>{if(!isOn)e.currentTarget.style.background="transparent"}}>
                <div style={{width:14,height:14,borderRadius:4,border:"1.5px solid "+(isOn?"#2dd4bf":"#444"),background:isOn?"#2dd4bf":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isOn&&<span style={{color:"#000",fontSize:10,fontWeight:900,lineHeight:1}}>✓</span>}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:isOn?"#2dd4bf":"#e5e5e5",fontWeight:isOn?600:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hasNickname?meta.nickname:<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#a3a3a3"}}>{id.slice(0,16)}...</span>}</div>
                  {hasNickname&&<div style={{fontSize:9,color:"#525252",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{id.slice(0,20)}...</div>}
                </div>
                <span style={{fontSize:10,color:"#525252",flexShrink:0}}>{txnCount} txn{txnCount!==1?'s':''}</span>
              </div>})}
              <div style={{borderTop:"1px solid #1a1a1a",marginTop:6,padding:"8px 10px 4px 10px"}}>
                <button type="button" onClick={()=>{setAcctFilterOpen(false);setShowBankAcctEditor(true)}} style={{background:"none",border:"none",color:"#a78bfa",fontSize:11,fontFamily:"inherit",cursor:"pointer",padding:0,fontWeight:600}}>Name accounts & manage exclusions →</button>
              </div>
            </div>}
          </div>})()}
          <Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setShowCatEditor(!showCatEditor)}><I n="tag" s={12}/> {showCatEditor?'Close':'Manage Categories'}</Btn>
          <Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setShowAcctEditor(!showAcctEditor)}><I n="dollar" s={12}/> {showAcctEditor?'Close':'Manage Accounts'}</Btn>
          {allBankAcctIds.length>0&&<Btn v="secondary" style={{fontSize:11,padding:"4px 10px",borderColor:Object.values(bankAcctMeta).some(m=>m.excluded)?"#a78bfa40":undefined,color:Object.values(bankAcctMeta).some(m=>m.excluded)?"#a78bfa":undefined}} onClick={()=>setShowBankAcctEditor(!showBankAcctEditor)}><I n="dollar" s={12}/> {showBankAcctEditor?'Close':'Manage Bank Accounts'} ({allBankAcctIds.length})</Btn>}
          <span style={{fontSize:11,color:"#737373"}}>{filteredBankTxns.length} transaction{filteredBankTxns.length!==1?'s':''}{customCats.length>0?' -- '+customCats.length+' custom':''}</span>
        </div>


        {showCatEditor&&<Card style={{padding:16,border:"1px solid #2dd4bf20"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",marginBottom:12}}>Manage Categories</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newCatName.trim()){addCustomCat(newCatName.trim());setNewCatName('')}}} placeholder="New category name..." style={{...inputStyle,flex:1,maxWidth:300}}/>
            <Btn onClick={()=>{if(newCatName.trim()){addCustomCat(newCatName.trim());setNewCatName('')}}} style={{fontSize:12}}>Add Category</Btn>
          </div>
          {customCats.length>0&&<div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:"#737373",marginBottom:6,fontWeight:600}}>CUSTOM CATEGORIES ({customCats.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>{customCats.map(c=><div key={c} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#111",borderRadius:6,border:"1px solid #222"}}>
              {editingCat===c?<><input value={editingCatName} onChange={e=>setEditingCatName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')renameCustomCat(c,editingCatName.trim());if(e.key==='Escape'){setEditingCat(null);setEditingCatName('')}}} style={{...inputStyle,flex:1,padding:"2px 6px",fontSize:12}} autoFocus/><button onClick={()=>renameCustomCat(c,editingCatName.trim())} style={{background:"none",border:"none",color:"#34d399",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Save</button><button onClick={()=>{setEditingCat(null);setEditingCatName('')}} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Cancel</button></>
              :<><span style={{flex:1,fontSize:12,color:"#e5e5e5"}}>{c}</span><span style={{fontSize:10,color:"#525252"}}>{manualTxns.filter(t=>t.category===c).length} txns</span><button onClick={()=>{setEditingCat(c);setEditingCatName(c)}} style={{background:"none",border:"none",color:"#a3a3a3",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Rename</button><button onClick={()=>removeCustomCat(c)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Remove</button></>}
            </div>)}</div>
          </div>}
          <div style={{fontSize:11,color:"#737373",marginBottom:6,fontWeight:600}}>DEFAULT CATEGORIES ({defaultCats.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{defaultCats.map(c=><span key={c} style={{padding:"3px 8px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:5,fontSize:10,color:"#737373"}}>{c}</span>)}</div>
        </Card>}


        {showAcctEditor&&<Card style={{padding:16,border:"1px solid #a78bfa20"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",marginBottom:12}}>Manage Accounts</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input value={newAcctName} onChange={e=>setNewAcctName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newAcctName.trim()){addCustomAcct(newAcctName.trim());setNewAcctName('')}}} placeholder="New account name..." style={{...inputStyle,flex:1,maxWidth:300}}/>
            <Btn onClick={()=>{if(newAcctName.trim()){addCustomAcct(newAcctName.trim());setNewAcctName('')}}}>Add Account</Btn>
          </div>
          {customAccts.length>0&&<div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:"#737373",marginBottom:6,fontWeight:600}}>CUSTOM ACCOUNTS ({customAccts.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>{customAccts.map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#111",borderRadius:6,border:"1px solid #222"}}>
              <span style={{flex:1,fontSize:12,color:"#e5e5e5"}}>{a}</span>
              <span style={{fontSize:10,color:"#525252"}}>{manualTxns.filter(t=>t.account===a).length} txns</span>
              <button onClick={()=>removeCustomAcct(a)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Remove</button>
            </div>)}</div>
          </div>}
          <div style={{fontSize:11,color:"#737373",marginBottom:6,fontWeight:600}}>DEFAULT ACCOUNTS ({defaultAccts.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{defaultAccts.map(a=><span key={a} style={{padding:"3px 8px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:5,fontSize:10,color:"#737373"}}>{a}</span>)}</div>
        </Card>}


        {showBankAcctEditor&&<Card style={{padding:16,border:"1px solid #a78bfa20"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>Manage Bank Accounts</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:10,color:"#737373"}}>{Object.values(bankAcctMeta).filter(m=>m.excluded).length} excluded - {allBankAcctIds.length} total</span>
              <button type="button" onClick={()=>setShowBankAcctEditor(false)} style={{background:"transparent",border:"1px solid #333",borderRadius:6,color:"#a3a3a3",cursor:"pointer",padding:"4px 12px",fontSize:11,fontFamily:"inherit",fontWeight:600,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="#e5e5e5";e.currentTarget.style.borderColor="#444"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#a3a3a3";e.currentTarget.style.borderColor="#333"}}>Close</button>
            </div>
          </div>
          <div style={{fontSize:11,color:"#a3a3a3",marginBottom:14,lineHeight:1.5}}>Bank accounts pulled in from Plaid show up here. Give each one a friendly nickname so transactions are easy to read, and exclude any account you don't want showing in this view (e.g. a personal account that got pulled in by mistake). Excluded accounts are also hidden from the KPIs and the account filter dropdown.</div>
          {allBankAcctIds.length===0?<div style={{fontSize:12,color:"#525252",padding:"10px 0"}}>No bank accounts found. Connect Plaid to start importing transactions.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{allBankAcctIds.map(acctId=>{
            const meta=bankAcctMeta[acctId]||{};
            const txnCount=allTxns.filter(t=>t.account===acctId).length;
            const isExcluded=!!meta.excluded;
            const draftKey='nickname_'+acctId;
            const draftValue=acctNicknameDraft[draftKey]!==undefined?acctNicknameDraft[draftKey]:(meta.nickname||'');
            return <div key={acctId} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:isExcluded?"rgba(245,158,11,0.04)":"#0a0a0a",borderRadius:8,border:"1px solid "+(isExcluded?"rgba(245,158,11,0.18)":"#1a1a1a"),opacity:isExcluded?0.65:1,transition:"all 0.15s"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <input
                    value={draftValue}
                    onChange={e=>setAcctNicknameDraft(d=>({...d,[draftKey]:e.target.value}))}
                    onBlur={()=>{if(draftValue!==(meta.nickname||''))setAcctNickname(acctId,draftValue.trim())}}
                    onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){setAcctNicknameDraft(d=>{const n={...d};delete n[draftKey];return n});e.target.blur()}}}
                    placeholder="Add nickname (e.g. Cornerstone Operating)"
                    style={{...inputStyle,padding:"4px 8px",fontSize:12,background:"#111",maxWidth:280}}
                  />
                  {isExcluded&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"rgba(245,158,11,0.12)",color:"#fbbf24",fontWeight:700,letterSpacing:0.5}}>EXCLUDED</span>}
                </div>
                <div style={{fontSize:10,color:"#525252",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acctId}</div>
              </div>
              <div style={{fontSize:11,color:"#737373",minWidth:70,textAlign:"right"}}>{txnCount} txn{txnCount!==1?'s':''}</div>
              <button onClick={()=>toggleAcctExcluded(acctId)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid "+(isExcluded?"rgba(45,212,191,0.4)":"rgba(245,158,11,0.4)"),background:isExcluded?"rgba(45,212,191,0.08)":"rgba(245,158,11,0.06)",color:isExcluded?"#2dd4bf":"#fbbf24",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{isExcluded?'Include':'Exclude'}</button>
              <button onClick={()=>deleteAcct(acctId)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid rgba(248,113,113,0.4)",background:"rgba(248,113,113,0.06)",color:"#f87171",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}} title={"Permanently delete this account and all "+txnCount+" of its transactions"}>Delete</button>
            </div>
          })}</div>}
        </Card>}


        {txnSelected.size>0&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#2dd4bf08",border:"1px solid #2dd4bf20",borderRadius:8}}>
          <span style={{fontSize:13,color:"#2dd4bf",fontWeight:600}}>{txnSelected.size} selected</span>
          <select onChange={e=>{if(e.target.value)bulkCategorize(e.target.value);e.target.value=''}} style={{background:"#111",border:"1px solid #222",color:"#a3a3a3",borderRadius:6,padding:"4px 8px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}><option value="">Bulk categorize...</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <Btn v="secondary" style={{fontSize:11,padding:"4px 10px",color:"#f87171",border:"1px solid #f8717130"}} onClick={bulkDelete}>Delete Selected</Btn>
          <button onClick={()=>setTxnSelected(new Set())} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Clear</button>
        </div>}


        {filteredBankTxns.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,color:"#525252"}}>No transactions yet. Add entries manually or connect your bank via Plaid.</div></Card>:
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:750}}>
            <thead><tr style={{background:"#111",borderBottom:"2px solid #222"}}>{["","Date","Description","Category","Account","Amount",""].map((h,i)=><th key={i} style={{padding:"10px 8px",textAlign:i===5?"right":i===0?"center":"left",fontWeight:600,color:"#a3a3a3",fontSize:11,textTransform:"uppercase",letterSpacing:0.8}}>{i===0?<input type="checkbox" checked={txnSelected.size===filteredBankTxns.length&&filteredBankTxns.length>0} onChange={selectAllTxns} style={{accentColor:"#2dd4bf",width:14,height:14,cursor:"pointer"}}/>:h}</th>)}</tr></thead>
            <tbody>{filteredBankTxns.map(t=>{const isEditing=manualEditing===t.id;return <React.Fragment key={t.id}><tr style={{borderBottom:isEditing?"none":"1px solid #111",background:txnSelected.has(t.id)?"#2dd4bf08":"transparent",transition:"background 0.15s"}} onMouseEnter={e=>{if(!txnSelected.has(t.id)&&!isEditing)e.currentTarget.style.background="#111"}} onMouseLeave={e=>{e.currentTarget.style.background=txnSelected.has(t.id)?"#2dd4bf08":"transparent"}}>
              <td style={{padding:"8px",textAlign:"center",width:36}}><input type="checkbox" checked={txnSelected.has(t.id)} onChange={()=>toggleTxnSelect(t.id)} style={{accentColor:"#2dd4bf",width:14,height:14,cursor:"pointer"}}/></td>
              <td style={{padding:"8px",color:"#a3a3a3",whiteSpace:"nowrap"}}>{t.date||'--'}</td>
              <td style={{padding:"8px",color:"#e5e5e5",fontWeight:500}}>{t.description||'--'}{t.plaidId&&<span style={{fontSize:9,color:"#525252",marginLeft:4}}>bank</span>}{t.billId&&<span className="vb-badge" onClick={e=>{e.stopPropagation();setBillOpen(t.billId);setBillsFilter('all');setBillsSearch('');setTab('bills')}} title="Matched to a vendor bill payment -- click to open the bill" style={{fontSize:9,color:"#2dd4bf",marginLeft:6,padding:"1px 6px",borderRadius:4,background:"#2dd4bf15",fontWeight:700,letterSpacing:0.4,cursor:"pointer"}}>BILL</span>}</td>
              <td style={{padding:"8px"}}><select value={t.category||''} onChange={e=>updateCategory(t.id,e.target.value)} style={{background:"#111",border:"1px solid #222",color:(!t.category||t.category==='Uncategorized'||!categories.includes(t.category))?"#fbbf24":"#a3a3a3",borderRadius:6,padding:"3px 6px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}><option value="">Uncategorized</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></td>
              <td style={{padding:"8px",color:"#737373",fontSize:11}} title={t.account||''}>{acctDisplayName(t.account)}</td>
              <td style={{padding:"8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:t.type==='revenue'?"#34d399":"#f87171"}}>{t.type==='revenue'?'+':'-'}{fmt(parseFloat(t.amount)||0)}</td>
              <td style={{padding:"8px",textAlign:"right"}}><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}><button onClick={()=>setAttachTxn(attachTxn===t.id?null:t.id)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+((t.attachments&&t.attachments.length)||attachTxn===t.id?"#a78bfa40":"#333"),background:attachTxn===t.id?"#a78bfa10":"transparent",color:(t.attachments&&t.attachments.length)||attachTxn===t.id?"#a78bfa":"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}><I n="file" s={10}/>{t.attachments&&t.attachments.length?t.attachments.length:''}</button><button onClick={()=>{if(isEditing){setManualEditing(null)}else{editTxn(t)}}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(isEditing?"#14b8a640":"#333"),background:isEditing?"#14b8a610":"transparent",color:isEditing?"#14b8a6":"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{isEditing?'Close':'Edit'}</button><button onClick={()=>deleteTxn(t.id)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #f8717130",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Del</button></div></td>
            </tr>
            {isEditing&&<tr style={{borderBottom:"1px solid #111"}}><td colSpan={7} style={{padding:0}}>
              <div style={{padding:"12px 16px",background:"#0d0d0d",borderTop:"2px solid #14b8a640",animation:"fadeUp 0.15s"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr 1.5fr 1fr 1fr 1fr",gap:10,marginBottom:10}} className="resp-grid-2">
                  <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Date</label><input type="date" value={manualForm.date} onChange={e=>setManualForm(f=>({...f,date:e.target.value}))} style={inputStyle}/></div>
                  <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Description</label><input value={manualForm.description} onChange={e=>setManualForm(f=>({...f,description:e.target.value}))} style={inputStyle}/></div>
                  <div style={{position:"relative"}}><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Category</label><input value={manualForm.category} onChange={e=>{setManualForm(f=>({...f,category:e.target.value}));e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onFocus={e=>{e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onBlur={e=>{setTimeout(()=>{if(e.target.nextElementSibling)e.target.nextElementSibling.style.display='none'},150)}} placeholder="Type to search..." style={inputStyle} autoComplete="off"/><div style={{display:"none",position:"absolute",top:"100%",left:0,right:0,maxHeight:200,overflowY:"auto",background:"#111",border:"1px solid #333",borderRadius:6,zIndex:20,boxShadow:"0 8px 20px rgba(0,0,0,0.5)"}}>{categories.filter(c=>!manualForm.category||c.toLowerCase().includes(manualForm.category.toLowerCase())).map(c=><div key={c} onMouseDown={e=>{e.preventDefault();setManualForm(f=>({...f,category:c}));e.target.closest('div[style*="position: absolute"]').style.display='none'}} style={{padding:"6px 10px",fontSize:11,color:manualForm.category===c?"#14b8a6":"#a3a3a3",cursor:"pointer",borderBottom:"1px solid #1a1a1a"}} onMouseEnter={e=>{e.currentTarget.style.background="#1a1a1a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>{c}</div>)}</div></div>
                  <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Amount</label><input type="number" value={manualForm.amount} onChange={e=>setManualForm(f=>({...f,amount:e.target.value}))} style={inputStyle}/></div>
                  <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Type</label><select value={manualForm.type} onChange={e=>setManualForm(f=>({...f,type:e.target.value}))} style={inputStyle}><option value="expense">Expense (out)</option><option value="revenue">Revenue (in)</option></select></div>
                  <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Account</label><select value={manualForm.account} onChange={e=>setManualForm(f=>({...f,account:e.target.value}))} style={inputStyle}>{allAccounts.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
                </div>
                <div style={{display:"flex",gap:8}}><Btn onClick={saveTxn} style={{fontSize:11,padding:"5px 14px"}}>Update</Btn><Btn v="secondary" onClick={()=>setManualEditing(null)} style={{fontSize:11,padding:"5px 14px"}}>Cancel</Btn></div>
              </div>
            </td></tr>}
            {attachTxn===t.id&&<tr style={{borderBottom:"1px solid #111"}}><td colSpan={7} style={{padding:0}}>
              <div style={{padding:"12px 16px",background:"#0d0d0d",borderTop:"2px solid #a78bfa40",animation:"fadeUp 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:(t.attachments&&t.attachments.length)?10:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#a78bfa",letterSpacing:1.5,fontFamily:"'Satoshi',sans-serif"}}>RECEIPTS & DOCUMENTS</span>
                  <span style={{fontSize:10.5,color:"#737373"}}>photo or PDF, 10 MB max -- stored with the transaction for audit</span>
                  <span style={{flex:1}}/>
                  <label style={{padding:"5px 12px",borderRadius:6,border:"1px solid #a78bfa40",background:"rgba(167,139,250,0.06)",color:"#a78bfa",fontSize:11,cursor:attachBusy?"wait":"pointer",fontFamily:"inherit",opacity:attachBusy?0.5:1}}>
                    {attachBusy?'Uploading...':'+ Attach File'}
                    <input type="file" accept="image/*,.pdf,application/pdf" disabled={attachBusy} style={{display:"none"}} onChange={e=>{const f=e.target.files&&e.target.files[0];e.target.value='';attachAdd(t,f)}}/>
                  </label>
                  <button onClick={()=>setAttachTxn(null)} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Close</button>
                </div>
                {(t.attachments&&t.attachments.length)?t.attachments.map((att,ai)=><div key={ai} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 2px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{color:"#a78bfa",display:"flex",flexShrink:0}}><I n="file" s={12}/></span>
                  <a href={att.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#d4d4d4",textDecoration:"none",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.color="#a78bfa"}} onMouseLeave={e=>{e.currentTarget.style.color="#d4d4d4"}}>{att.name}</a>
                  <span style={{fontSize:9.5,color:"#525252",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{att.size?(att.size/1024).toFixed(0)+' KB':''}{att.by?' -- '+att.by:''}{att.at?' -- '+String(att.at).slice(0,10):''}</span>
                  <button onClick={()=>attachRemove(t,ai)} style={{background:"none",border:"1px solid #f8717130",borderRadius:5,color:"#f87171",cursor:"pointer",fontSize:9.5,fontFamily:"inherit",padding:"2px 8px",flexShrink:0}}>Remove</button>
                </div>):<div style={{fontSize:11,color:"#525252",padding:"4px 2px"}}>Nothing attached yet.</div>}
              </div>
            </td></tr>}
            </React.Fragment>})}
            <tr style={{borderTop:"2px solid #222",background:"#0a0a0a"}}><td/><td colSpan={4} style={{padding:"8px",fontWeight:700}}>TOTALS</td><td style={{padding:"8px",textAlign:"right",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{fmt(totalBankIn-totalBankOut)}</td><td/></tr>
            </tbody>
          </table></div>
        </Card>}
      </div>})()}


    {tab==="review"&&(()=>{
      // Review (Sep 2026): where the bank feed gets cleaned. Rows a sync held back as possible
      // copies, same account/day/amount groups already on file (369 extra copies on 9/27),
      // the deleted-row memory that keeps a sync from bringing a row back, and the rules
      // that categorize new rows on the way in.
      const _mono={fontFamily:"'JetBrains Mono',monospace"};
      const _small={padding:"4px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"};
      const _inp={...inputStyle,padding:"8px 11px",fontSize:12};
      const _lbl={fontSize:10,color:"#737373",display:"block",marginBottom:4,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase"};
      const chip=(label,color,cls)=><span className={cls} style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:color+"15",color,fontWeight:700,letterSpacing:0.4,whiteSpace:"nowrap",..._mono}}>{label}</span>;
      const head=(title,sub,right,count,color)=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:12}}><div style={{minWidth:0,flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:800,color:"#f0f0f0",letterSpacing:1.2,..._mono}}>{title}</span>{count!=null?<span style={{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:10,background:(color||"#737373")+"18",color:color||"#737373",..._mono}}>{count}</span>:null}</div><div style={{fontSize:11.5,color:"#737373",marginTop:3,maxWidth:680,lineHeight:1.5}}>{sub}</div></div>{right?<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>{right}</div>:null}</div>;
      const empty=(title,body)=><div className="rv-empty" style={{padding:"24px 0",textAlign:"center"}}><div style={{fontSize:13,color:"#a3a3a3",marginBottom:4}}>{title}</div><div style={{fontSize:12,color:"#525252",maxWidth:560,margin:"0 auto",lineHeight:1.5}}>{body}</div></div>;
      const acctName=(id)=>{if(!id)return '--';const m=_bankAcctMetaGlobal[id];return m&&m.nickname?m.nickname:(String(id).length>20?String(id).slice(0,10)+'...':id)};
      const money=(t)=>(t.type==='revenue'||t.type==='asset'?'+':'-')+fmt(Math.abs(parseFloat(t.amount)||0));
      const moneyColor=(t)=>t.type==='revenue'||t.type==='asset'?"#34d399":t.type==='liability'?"#a78bfa":"#f87171";
      const stamp=(ms)=>{if(!ms)return '--';const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
      const srcOf=(t)=>t.source==='late_arrival'?['LATE ARRIVAL',"#fbbf24"]:t.source==='statement'?['STATEMENT',"#a78bfa"]:t.plaidId?['BANK FEED',"#2dd4bf"]:['MANUAL',"#9a9a9a"];
      const ask=async(m)=>typeof fCtx.confirm==='function'?await fCtx.confirm(m):true;
      const plural=(n,one,many)=>n+' '+(n===1?one:many);
      // ---- held for review ----
      const queue=_reviewQueue;const held=queue.held;
      const saveQueue=(patch)=>addSop({id:BANK_REVIEW_QUEUE_ID,title:'Bank Review Queue',cat:'Settings',icon:'shield',content:JSON.stringify({...queue,...patch}),custom:true});
      const heldKey=(h)=>String(h.key||h.plaidId||h.fingerprint||bankTxnFingerprint(h));
      const rules=parseBankRules(customSops);
      const addHeld=(h)=>{
        if(_isLockedDate(h.date)){notify(_lockMsg(h.date),'error');return}
        const hit=applyBankRules(rules,{description:h.description,type:h.type});
        const rec={date:h.date||'',description:h.description||'',category:hit?hit.category:'Uncategorized',amount:Math.abs(parseFloat(h.amount)||0).toFixed(2),type:hit?hit.type:(h.type||'expense'),account:h.account||'Operating',plaidId:h.plaidId||undefined,plaidCategory:h.plaidCategory||'',importedAt:new Date().toISOString(),reviewedBy:_glUser};
        if(hit&&hit.ruleId)rec.ruleId=hit.ruleId;
        addSop({id:'TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-R',title:rec.description||'Bank transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify(rec),custom:true});
        saveQueue({held:held.filter(x=>heldKey(x)!==heldKey(h))});
        notify('Added: '+(rec.description||'bank transaction')+' as '+rec.category);
      };
      // A dismissed row is remembered like a deleted one, so the next sync skips it.
      const tombOf=(h)=>({sopId:null,plaidId:h.plaidId||null,fingerprint:h.fingerprint||bankTxnFingerprint(h),acctKey:h.acctKey||bankTxnAcctKey(h)||null,account:h.account||'',date:h.date||'',amount:Math.abs(parseFloat(h.amount)||0).toFixed(2),description:h.description||'',category:'',note:'dismissed from review'});
      const dismissHeld=async(h)=>{
        setReviewBusy(true);const r=await db.addTombstone(tombOf(h)).catch(()=>null);setReviewBusy(false);
        if(!r||!r.ok){notify('Could not record the dismissal -- nothing changed. Try again.','error');return}
        saveQueue({held:held.filter(x=>heldKey(x)!==heldKey(h))});_reloadTombs();
        notify('Dismissed: '+(h.description||'bank transaction')+' -- a sync will not bring it back');
      };
      const dismissAll=async()=>{
        if(!held.length)return;
        const ok=await ask('Dismiss all '+plural(held.length,'held transaction','held transactions')+'? They are remembered as deleted, so a bank sync will not bring them back.');if(!ok)return;
        setReviewBusy(true);const done=new Set();
        for(const h of held){const r=await db.addTombstone(tombOf(h)).catch(()=>null);if(r&&r.ok)done.add(heldKey(h))}
        setReviewBusy(false);
        if(done.size)saveQueue({held:held.filter(x=>!done.has(heldKey(x)))});_reloadTombs();
        notify(done.size+' dismissed'+(done.size<held.length?' -- '+(held.length-done.size)+' could not be recorded and are still here':''),done.size<held.length?'error':undefined);
      };
      // ---- possible duplicates ----
      const groups=_reviewDupGroups;
      const recRows=groups.map(g=>g.rec).filter(Boolean);
      const extraCopies=groups.reduce((s2,g)=>s2+g.rows.length-1,0);
      const doubleCounted=_vbMoney(groups.reduce((s2,g)=>s2+(g.rows.length-1)*(parseFloat(g.amount)||0),0));
      const shownGroups=reviewRecOnly?groups.filter(g=>g.rec):groups;
      const deleteCopy=(t)=>{if(_isLockedDate(t.date)){notify(_lockMsg(t.date),'error');return}deleteSop(t.id);_noteDeleted(t);notify('Copy deleted: '+(t.description||'bank transaction')+' '+fmt(Math.abs(parseFloat(t.amount)||0)))};
      const keepAll=(g)=>{saveQueue({keep:Array.from(new Set([...queue.keep,g.key]))});notify('Kept all '+g.rows.length+' -- this group will not be flagged again')};
      const deleteAllRec=async()=>{
        const open=recRows.filter(t=>!_isLockedDate(t.date));const locked=recRows.length-open.length;
        if(!open.length){notify(locked?plural(locked,'recommended copy is','recommended copies are')+' in a closed period -- nothing deleted':'Nothing is recommended for deletion',locked?'error':undefined);return}
        const total=_vbMoney(open.reduce((s2,t)=>s2+Math.abs(parseFloat(t.amount)||0),0));
        const ok=await ask('Delete '+plural(open.length,'recommended copy','recommended copies')+' totaling '+fmt(total)+'? The row each group keeps is not touched'+(locked?', and '+locked+' in closed periods are skipped':'')+'. Deleted rows are remembered so a bank sync cannot bring them back.');if(!ok)return;
        open.forEach(t=>deleteSop(t.id));_noteDeleted(open);
        notify(plural(open.length,'duplicate copy','duplicate copies')+' deleted ('+fmt(total)+')'+(locked?' -- '+locked+' in closed periods left untouched':''));
      };
      // ---- deleted bank transactions ----
      const tombList=(tombstones||[]).slice().sort((a,b)=>String(b.deletedAt||'').localeCompare(String(a.deletedAt||''))||(Number(b.id)||0)-(Number(a.id)||0));
      const allowAgain=async(tb)=>{
        if(tb._local)return;
        setReviewBusy(true);const r=await db.restoreTombstone(tb.id).catch(()=>null);setReviewBusy(false);
        if(!r||!r.ok){notify('Could not allow it again -- nothing changed','error');return}
        setTombstones(prev=>(prev||[]).filter(x=>x.id!==tb.id));_reloadTombs();
        notify('Allowed again: '+(tb.description||'bank transaction')+' can come back on the next sync');
      };
      // ---- category rules ----
      const saveRules=(next,msg)=>{addSop({id:BANK_RULES_ID,title:'Bank Rules',cat:'Settings',icon:'tag',content:JSON.stringify(next),custom:true});if(msg)notify(msg)};
      const ruleCats=_bankCategories.filter(c=>c!=='Uncategorized');
      const draftType=bankCategoryType(ruleDraft.category,'expense');
      const addRule=()=>{
        const m=String(ruleDraft.match||'').replace(/\s+/g,' ').trim();
        if(!m){notify('Type the bank memo text the rule should match','error');return}
        if(!ruleDraft.category){notify('Pick the category the rule files it under','error');return}
        let n=rules.length+1;while(rules.some(x=>x.id==='r-'+n))n++;
        saveRules([...rules,{id:'r-'+n,match:m,mode:ruleDraft.mode==='starts'?'starts':'contains',category:ruleDraft.category,type:draftType,direction:['out','in','any'].includes(ruleDraft.direction)?ruleDraft.direction:'any',enabled:true}],'Rule added: '+m+' -- '+ruleDraft.category);
        setRuleDraft({match:'',mode:'contains',category:'',direction:'out'});
      };
      const toggleRule=(r)=>saveRules(rules.map(x=>x.id===r.id?{...x,enabled:!x.enabled}:x),(r.enabled?'Rule off: ':'Rule on: ')+r.match);
      const deleteRule=(r)=>saveRules(rules.filter(x=>x.id!==r.id),'Rule deleted: '+r.match);
      const resetRules=async()=>{const ok=await ask('Replace your rules with the '+BANK_RULE_DEFAULTS.length+' default rules?');if(!ok)return;saveRules(BANK_RULE_DEFAULTS.map(r=>({...r})),'Rules reset to defaults')};
      // Apply only where nobody has decided yet: Uncategorized or a raw bank label, no bill
      // match, open period. A row she categorized herself is never rewritten.
      const ruleChanges=manualTxns.filter(t=>_isRawBankCat(t.category)&&!t.billId&&!_isLockedDate(t.date)).map(t=>({t,hit:applyBankRules(rules,{description:t.description,type:t.type})})).filter(x=>x.hit&&(x.hit.category!==x.t.category||x.hit.type!==x.t.type));
      const applyRulesNow=async()=>{
        if(!ruleChanges.length){notify('No uncategorized transactions match a rule');setRuleApplyOpen(false);return}
        const ok=await ask('Categorize '+plural(ruleChanges.length,'transaction','transactions')+' by your rules? Only Uncategorized rows and raw bank labels change.');if(!ok)return;
        const recs=ruleChanges.map(({t,hit})=>{const {id,...rest}=t;return {id,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...rest,category:hit.category,type:hit.type,ruleId:hit.ruleId||undefined}),custom:true}});
        // One upsert for the batch and one state merge when the app hands us the setter;
        // otherwise addSop per row (two requests each, but always correct).
        if(typeof fCtx.setCustomSops==='function'){
          setReviewBusy(true);const r=await db.saveSops(recs).catch(()=>null);setReviewBusy(false);
          if(!r||r.ok===false){notify('Could not save the categories -- nothing changed','error');return}
          const byId=new Map(recs.map(x=>[x.id,x]));fCtx.setCustomSops(prev=>(prev||[]).map(x=>byId.has(x.id)?byId.get(x.id):x));
        }else recs.forEach(x=>addSop(x));
        setRuleApplyOpen(false);
        notify(plural(recs.length,'transaction','transactions')+' categorized by rules');
      };
      return <div className="rv-tab" style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          {kpi('HELD FOR REVIEW',String(held.length),held.length?'waiting on you':'nothing waiting',held.length?'#fbbf24':'#34d399')}
          {kpi('DUPLICATE GROUPS',String(groups.length),plural(extraCopies,'extra copy','extra copies'),groups.length?'#f87171':'#34d399')}
          {kpi('DOUBLE COUNTED',fmt(doubleCounted),'across the extra copies',doubleCounted>0?'#f97316':'#34d399')}
          {kpi('REMEMBERED DELETIONS',String(tombList.length),'a sync will not bring these back','#a78bfa')}
        </div>

        <Card style={{padding:20}}><div className="rv-held">
          {head('HELD FOR REVIEW','A sync held these back: each looks like a copy of a row already on file, or of one you deleted -- same account, day and amount, different bank memo. Add the ones that are real; dismiss the copies.',held.length>1?<Btn v="secondary" className="rv-dismiss-all" style={{fontSize:11,padding:"4px 10px"}} onClick={dismissAll}>Dismiss all</Btn>:null,held.length,"#fbbf24")}
          {held.length===0?empty('Nothing held for review.','When a sync finds a bank row that looks like a copy of one already on file -- same account, day and amount, but a different memo -- it waits here for you instead of landing twice.'):
          <div>{held.map(h=>{const k=heldKey(h);return <div key={k} className="rv-held-row" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 4px",borderBottom:"1px solid #161616",flexWrap:"wrap"}}>
            <span style={{..._mono,fontSize:11,color:"#9a9a9a",width:78,flexShrink:0}}>{h.date||'--'}</span>
            <div style={{flex:1,minWidth:220}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:12.5,color:"#e5e5e5",fontWeight:600}}>{h.description||'--'}</span>{h.plaidCategory?chip(String(h.plaidCategory),"#737373"):null}<span style={{fontSize:10.5,color:"#737373"}}>{acctName(h.account)}</span></div>
              <div className="rv-match" style={{fontSize:11,color:h.matchSource==='deleted'?"#a78bfa":"#fbbf24",marginTop:2}}>{h.matchSource==='deleted'?'A transaction like this was deleted before':h.matchKind==='check'?'Same check as '+(h.matchDescription||'--')+(h.matchDate?' on '+h.matchDate:'')+' ('+(h.matchCategory||'Uncategorized')+')':'Matches: '+(h.matchDescription||'--')+' ('+(h.matchCategory||'Uncategorized')+')'}</div>
            </div>
            <span style={{..._mono,fontSize:13,fontWeight:700,color:moneyColor(h),whiteSpace:"nowrap"}}>{money(h)}</span>
            <div style={{display:"flex",gap:6}}><button className="rv-add" disabled={reviewBusy} onClick={()=>addHeld(h)} style={{..._small,color:"#2dd4bf",borderColor:"#2dd4bf40",fontWeight:700}}>Add</button><button className="rv-dismiss" disabled={reviewBusy} onClick={()=>dismissHeld(h)} style={_small}>Dismiss</button></div>
          </div>})}</div>}
        </div></Card>

        <Card style={{padding:0}}><div className="rv-dups">
          <div className="rv-bulk" style={{position:"sticky",top:0,zIndex:4,background:"#111111",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"18px 20px 12px",borderRadius:"14px 14px 0 0"}}>
            {head('POSSIBLE DUPLICATES','Same account, same day, same amount, more than one row -- or the same check number and amount, entered on the day it was written and imported again when it cleared. The copy marked RECOMMENDED DELETE is the one nobody worked on: no bill match, no receipt, still Uncategorized or a raw bank label. Two real charges for the same amount on the same day do happen -- Keep all stops the group from being flagged.',null,groups.length,"#f87171")}
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span className="rv-totals" style={{..._mono,fontSize:12,color:"#c4c4c4"}}>{plural(groups.length,'group','groups')}, {plural(extraCopies,'extra copy','extra copies')}, <span style={{color:doubleCounted>0?"#f87171":"#c4c4c4",fontWeight:700}}>{fmt(doubleCounted)}</span> double counted</span>
              <span style={{flex:1}}/>
              <button className="rv-rec-only" onClick={()=>{setReviewRecOnly(!reviewRecOnly);setReviewDupLimit(40)}} style={{..._small,fontSize:11,padding:"5px 12px",color:reviewRecOnly?"#000":"#a3a3a3",background:reviewRecOnly?"#2dd4bf":"transparent",borderColor:reviewRecOnly?"#2dd4bf":"#333",fontWeight:reviewRecOnly?700:400}}>Recommended only</button>
              <Btn v="danger" className="rv-delete-rec" style={{fontSize:11,padding:"5px 12px",opacity:recRows.length?1:0.5}} onClick={deleteAllRec}>Delete all recommended copies ({recRows.length})</Btn>
            </div>
          </div>
          <div style={{padding:"14px 20px 18px"}}>
            {groups.length===0?empty('No possible duplicates.','Every bank row is the only one on its account for that day and amount, or you chose to keep the group.'):shownGroups.length===0?empty('No group has a clear copy to delete.','Every row in the remaining groups is categorized or matched. Open a group and delete by hand, or keep all.'):
            <div>{shownGroups.slice(0,reviewDupLimit).map(g=><div key={g.key} className="rv-group" data-key={g.key} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,overflow:"hidden",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",background:"#0d0d0d",borderBottom:"1px solid rgba(255,255,255,0.05)",flexWrap:"wrap"}}>
                <span style={{..._mono,fontSize:12,color:"#c4c4c4",fontWeight:600}}>{g.date}</span>
                <span style={{..._mono,fontSize:14,color:"#f0f0f0",fontWeight:800}}>{fmt(parseFloat(g.amount)||0)}</span>
                <span style={{fontSize:11,color:"#9a9a9a"}} title={g.account}>{acctName(g.account)}</span>
                {chip(g.rows.length+' COPIES',"#f87171")}{g.kind==='check'?chip('SAME CHECK',"#a78bfa","rv-check"):null}
                <span style={{flex:1}}/>
                <button className="rv-keep" onClick={()=>keepAll(g)} style={_small}>Keep all</button>
              </div>
              {g.rows.map(t=>{const isRec=!!g.rec&&g.rec.id===t.id;const raw=_isRawBankCat(t.category);const src=srcOf(t);const att=Array.isArray(t.attachments)?t.attachments.length:0;return <div key={t.id} className={'rv-row'+(isRec?' rv-rec':'')} data-id={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",borderLeft:"3px solid "+(isRec?"#f87171":"transparent"),background:isRec?"rgba(248,113,113,0.045)":"transparent",borderBottom:"1px solid #161616",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:12.5,color:"#e5e5e5",fontWeight:600}}>{t.description||'--'}</span>{chip(src[0],src[1])}{t.billId?chip('BILL',"#2dd4bf","rv-bill"):null}{att?<span className="rv-att" title={plural(att,'attachment','attachments')} style={{display:"inline-flex",alignItems:"center",gap:3,color:"#a78bfa",fontSize:10}}><I n="file" s={10}/>{att}</span>:null}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:3,fontSize:11,flexWrap:"wrap"}}>{g.kind==='check'?<span className="rv-date" style={{color:"#c4c4c4",..._mono,fontSize:10}}>{t.date||'--'}</span>:null}<span className="rv-cat" style={{color:raw?"#fbbf24":"#c4c4c4",fontWeight:raw?600:400}}>{t.category||'Uncategorized'}{raw&&t.category&&t.category!=='Uncategorized'?' (raw bank label)':''}</span><span style={{color:"#737373",..._mono,fontSize:10}}>{t.type||'expense'}</span><span style={{color:"#525252",..._mono,fontSize:10}}>added {stamp(_txnCreatedMs(t))}</span></div>
                </div>
                {isRec?chip('RECOMMENDED DELETE',"#f87171","rv-rec-chip"):null}
                <button className="rv-del" onClick={()=>deleteCopy(t)} style={{..._small,color:"#f87171",borderColor:"#f8717130"}}>Delete this copy</button>
              </div>})}
            </div>)}
            {shownGroups.length>reviewDupLimit?<div style={{textAlign:"center",paddingTop:4}}><button className="rv-more" onClick={()=>setReviewDupLimit(reviewDupLimit+40)} style={_small}>Show {Math.min(40,shownGroups.length-reviewDupLimit)} more ({shownGroups.length-reviewDupLimit} not shown)</button></div>:null}
            </div>}
          </div>
        </div></Card>

        <Card style={{padding:20}}><div className="rv-tombs">
          {head('DELETED BANK TRANSACTIONS','Deleted rows are remembered here so a bank sync cannot bring them back. Allow one again only if it was deleted by mistake.',null,tombstones?tombList.length:null,"#a78bfa")}
          {tombstones===null?empty('Reading the deleted-transaction list...','If this stays empty the list could not be read. Deletions are still remembered at the database.'):tombList.length===0?empty('Nothing deleted yet.','When you delete a bank transaction here or on Banking, it is remembered so the next sync does not bring it back.'):
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:660}}>
            <thead><tr style={{borderBottom:"1px solid #222"}}>{["Date","Description","Amount","Deleted on","Note",""].map((h,i)=><th key={i} style={{padding:"7px 8px",textAlign:i===2?"right":"left",fontSize:10,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{h}</th>)}</tr></thead>
            <tbody>{tombList.slice(0,200).map(tb=><tr key={tb.id} className="rv-tomb" style={{borderBottom:"1px solid #161616"}}>
              <td style={{padding:"8px",..._mono,color:"#9a9a9a",whiteSpace:"nowrap"}}>{tb.date||'--'}</td>
              <td style={{padding:"8px",color:"#d4d4d4"}}>{tb.description||'--'}{tb.account?<span style={{color:"#525252",fontSize:10,marginLeft:8}}>{acctName(tb.account)}</span>:null}</td>
              <td style={{padding:"8px",textAlign:"right",..._mono,color:"#e5e5e5",whiteSpace:"nowrap"}}>{fmt(Math.abs(parseFloat(tb.amount)||0))}</td>
              <td style={{padding:"8px",..._mono,color:"#737373",whiteSpace:"nowrap"}}>{tb.deletedAt?String(tb.deletedAt).slice(0,10):'--'}</td>
              <td style={{padding:"8px",color:"#737373",fontSize:11}}>{tb.note||(tb._local?'saving...':'')}</td>
              <td style={{padding:"8px",textAlign:"right"}}><button className="rv-allow" disabled={!!tb._local||reviewBusy} onClick={()=>allowAgain(tb)} style={{..._small,color:"#2dd4bf",borderColor:"#2dd4bf40",opacity:tb._local?0.4:1}}>Allow again</button></td>
            </tr>)}</tbody>
          </table>{tombList.length>200?<div style={{fontSize:11,color:"#525252",marginTop:8}}>Showing the newest 200 of {tombList.length}.</div>:null}</div>}
        </div></Card>

        <Card style={{padding:20}}><div className="rv-rules">
          {head('CATEGORY RULES','New bank rows are filed by the first rule whose text matches the bank memo. Money-out rules never touch deposits, so a CHASE deposit is not filed as a card payment. Rows you categorized yourself are never changed.',<><Btn v="secondary" className="rv-apply" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setRuleApplyOpen(!ruleApplyOpen)}>Apply rules now</Btn><button className="rv-reset" onClick={resetRules} style={{..._small,fontSize:11,padding:"5px 12px"}}>Reset to defaults</button></>,rules.length,"#2dd4bf")}
          {ruleApplyOpen?<div className="rv-apply-panel" style={{padding:14,background:"#0a0a0a",border:"1px solid #2dd4bf30",borderRadius:10,marginBottom:14,animation:"fadeUp 0.15s"}}>
            {ruleChanges.length===0?<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,color:"#a3a3a3",flex:1}}>No Uncategorized row or raw bank label matches a rule right now.</span><Btn v="ghost" onClick={()=>setRuleApplyOpen(false)}>Close</Btn></div>:<>
              <div style={{fontSize:12,color:"#c4c4c4",marginBottom:8}}>{plural(ruleChanges.length,'transaction','transactions')} would be categorized. Rows you categorized yourself, bill matches and closed periods are left alone.</div>
              {ruleChanges.slice(0,8).map(({t,hit})=><div key={t.id} className="rv-apply-row" style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",fontSize:11.5,borderBottom:"1px solid #161616"}}><span style={{..._mono,color:"#737373",width:78}}>{t.date||'--'}</span><span style={{color:"#e5e5e5",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description||'--'}</span><span style={{color:"#fbbf24"}}>{t.category||'Uncategorized'}</span><span style={{color:"#525252"}}>&gt;&gt;</span><span style={{color:"#2dd4bf"}}>{hit.category}</span></div>)}
              {ruleChanges.length>8?<div style={{fontSize:11,color:"#525252",padding:"4px 0"}}>and {ruleChanges.length-8} more</div>:null}
              <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}><Btn className="rv-apply-go" onClick={applyRulesNow} style={{opacity:reviewBusy?0.5:1}}><I n="check" s={13}/> Apply to {plural(ruleChanges.length,'transaction','transactions')}</Btn><Btn v="ghost" onClick={()=>setRuleApplyOpen(false)}>Cancel</Btn></div>
            </>}
          </div>:null}
          {rules.length===0?empty('No rules.','New bank rows land as Uncategorized until you add one. Reset to defaults brings back the check, card and loan rules.'):
          <div style={{marginBottom:14}}>{rules.map(r=><div key={r.id} className="rv-rule" data-id={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",borderBottom:"1px solid #161616",opacity:r.enabled?1:0.5,flexWrap:"wrap"}}>
            <span style={{fontSize:10.5,color:"#737373",width:74}}>{r.mode==='starts'?'starts with':'contains'}</span>
            <span style={{..._mono,fontSize:12,color:"#f0f0f0",fontWeight:600,minWidth:120}}>"{r.match}"</span>
            <span style={{color:"#525252",fontSize:11}}>&gt;&gt;</span>
            <span style={{fontSize:12,color:"#c4c4c4",flex:1,minWidth:150}}>{r.category}</span>
            {chip(r.type.toUpperCase(),r.type==='liability'?"#a78bfa":r.type==='revenue'||r.type==='asset'?"#34d399":"#f97316")}
            <span style={{fontSize:10.5,color:"#737373",width:70}}>{r.direction==='out'?'money out':r.direction==='in'?'money in':'either way'}</span>
            <button className="rv-rule-toggle" onClick={()=>toggleRule(r)} style={{..._small,color:r.enabled?"#34d399":"#737373",borderColor:r.enabled?"#34d39940":"#333",fontWeight:700,width:42}}>{r.enabled?'On':'Off'}</button>
            <button className="rv-rule-del" onClick={()=>deleteRule(r)} title="Delete rule" style={{..._small,color:"#f87171",borderColor:"#f8717130",padding:"4px 8px"}}>x</button>
          </div>)}</div>}
          <div className="rv-rule-form" style={{padding:14,background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2dd4bf",marginBottom:10,letterSpacing:0.5}}>NEW RULE</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr 1fr 1fr auto",gap:10,alignItems:"end"}} className="resp-grid-2">
              <div><label style={_lbl}>Bank memo text</label><input className="rv-rule-match" value={ruleDraft.match} onChange={e=>setRuleDraft(d=>({...d,match:e.target.value}))} placeholder="AMEX, CK #, PAYMENT TO LOAN..." style={{..._inp,..._mono}}/></div>
              <div><label style={_lbl}>Match</label><select className="rv-rule-mode" value={ruleDraft.mode} onChange={e=>setRuleDraft(d=>({...d,mode:e.target.value}))} style={{..._inp,cursor:"pointer"}}><option value="contains">contains</option><option value="starts">starts with</option></select></div>
              <div><label style={_lbl}>Category</label><select className="rv-rule-cat" value={ruleDraft.category} onChange={e=>setRuleDraft(d=>({...d,category:e.target.value}))} style={{..._inp,cursor:"pointer",color:ruleDraft.category?"#e5e5e5":"#737373"}}><option value="">Pick a category...</option>{ruleCats.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={_lbl}>Direction</label><select className="rv-rule-dir" value={ruleDraft.direction} onChange={e=>setRuleDraft(d=>({...d,direction:e.target.value}))} style={{..._inp,cursor:"pointer"}}><option value="out">money out</option><option value="in">money in</option><option value="any">either way</option></select></div>
              <div><label style={_lbl}>Type</label><div className="rv-rule-type" style={{..._inp,..._mono,color:draftType==='liability'?"#a78bfa":draftType==='revenue'?"#34d399":"#f97316",background:"transparent",border:"1px dashed rgba(255,255,255,0.08)"}}>{ruleDraft.category?draftType:'--'}</div></div>
              <Btn className="rv-rule-add" onClick={addRule}><I n="plus" s={13}/> Add rule</Btn>
            </div>
          </div>
        </div></Card>
      </div>})()}
    {tab==="bills"&&(()=>{
      const _mono={fontFamily:"'JetBrains Mono',monospace"};
      const _lbl={fontSize:10,color:"#737373",display:"block",marginBottom:4,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase"};
      const _inp={...inputStyle,padding:"9px 12px",fontSize:12};
      const _small={padding:"4px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit"};
      const lineCats=billLineCategories(_finCategories);
      const q=billsSearch.trim().toLowerCase();
      const visibleBills=vendorBills.filter(b=>{const st=billStatus(b);if(billsFilter==='open'&&st==='paid')return false;if(billsFilter==='paid'&&st!=='paid')return false;if(!q)return true;const hay=[b.vendorName,b.ref,b.memo,b.date,b.dueDate,...(b.lines||[]).map(l=>l.category+' '+(l.memo||'')),...(b.payments||[]).map(p=>p.ref+' '+(p.txnDescription||''))].join(' ').toLowerCase();return hay.includes(q)||String(billTotal(b)).includes(q)}).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id).localeCompare(String(a.id)));
      const openBills=vendorBills.filter(b=>billStatus(b)!=='paid');
      const openBalance=_vbMoney(openBills.reduce((s,b)=>s+billBalance(b),0));
      const overdueBalance=_vbMoney(openBills.filter(b=>{const d=parseLocalDate(b.dueDate);return !!d&&d<now}).reduce((s,b)=>s+billBalance(b),0));
      const paidInPeriod=_vbMoney(vendorBills.reduce((s,b)=>s+(b.payments||[]).filter(p=>{const d=parseLocalDate(p.date);return !!d&&d>=fromD&&d<=toD}).reduce((s2,p)=>s2+(Number(p.amount)||0),0),0));
      const enteredInPeriod=_vbMoney(vendorBills.filter(_billInRange).reduce((s,b)=>s+billTotal(b),0));
      const daysLabel=(b)=>{const d=parseLocalDate(b.dueDate);if(!d)return '';const days=Math.floor((now-d)/86400000);if(days>0)return days+'d overdue';if(days===0)return 'due today';return 'due in '+(-days)+'d'};
      const statusBadge=(st)=><Badge label={st==='paid'?'paid':st==='partial'?'partially paid':st==='void'?'void':'open'} color={st==='paid'?'#34d399':st==='partial'?'#fbbf24':st==='void'?'#525252':'#f87171'}/>;
      const setLine=(i,patch)=>setBillForm(f=>({...f,lines:f.lines.map((l,k)=>k===i?{...l,...patch}:l)}));
      const formLinesTotal=billForm?billLinesTotal((billForm.lines||[]).map(l=>({amount:String(l.amount||'').replace(/[$,\s]/g,'')}))):0;
      const formTotalRaw=billForm?String(billForm.total||'').replace(/[$,\s]/g,''):'';
      const formTotal=formTotalRaw===''?formLinesTotal:_vbMoney(formTotalRaw);
      const formDiff=_vbMoney(formTotal-formLinesTotal);
      const formBalanced=billForm&&formTotal>0&&Math.abs(formDiff)<=0.005;
      const payBill=billPay?vendorBills.find(b=>b.id===billPay.billId):null;
      const payMatches=payBill?rankBankMatches(manualTxns,payBill,_vbMoney(String(billPay.amount||'').replace(/[$,\s]/g,'')),_billLinked,billPay.search).slice(0,8):[];
      const acctName=(id)=>{if(!id)return '--';const m=_bankAcctMetaGlobal[id];return m&&m.nickname?m.nickname:(String(id).length>20?String(id).slice(0,10)+'...':id)};
      return <div className="vb-tab" style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          {kpi('OPEN BALANCE',fmt(openBalance),openBills.length+' open bill'+(openBills.length!==1?'s':''),'#a78bfa')}
          {kpi('OVERDUE',fmt(overdueBalance),overdueBalance>0?'past the due date':'nothing past due',overdueBalance>0?'#f87171':'#34d399')}
          {kpi('BILLED THIS PERIOD',fmt(enteredInPeriod),'by bill date, on the P&L','#f87171')}
          {kpi('PAID THIS PERIOD',fmt(paidInPeriod),'payments recorded','#34d399')}
        </div>
        <Card style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:12}}>
            <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",..._mono}}>Vendor Bills</div><div style={{fontSize:11,color:"#737373",marginTop:2}}>Entered the way QuickBooks enters them: category lines that add up to the bill, paid from the bank feed, reported on the bill date.</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <input value={billsSearch} onChange={e=>setBillsSearch(e.target.value)} placeholder="Search vendor, category, memo, amount..." style={{..._inp,width:240}}/>
              <div style={{display:"flex",background:"#0a0a0a",borderRadius:8,padding:2,border:"1px solid rgba(255,255,255,0.06)"}}>{[['open','Open'],['all','All'],['paid','Paid']].map(([v,l])=><button key={v} className="vb-filter" onClick={()=>setBillsFilter(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:billsFilter===v?"#2dd4bf":"transparent",color:billsFilter===v?"#000":"#737373",fontSize:11,fontWeight:billsFilter===v?700:400,fontFamily:"inherit"}}>{l}</button>)}</div>
              {!billForm&&<Btn onClick={openNewBill}><I n="plus" s={13}/> Enter Bill</Btn>}
            </div>
          </div>
          {billForm&&<div className="vb-form" style={{padding:16,background:"#0a0a0a",border:"1px solid #2dd4bf30",borderRadius:12,marginBottom:14,animation:"fadeUp 0.2s"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#2dd4bf",marginBottom:12,letterSpacing:0.5}}>{billForm.id?'EDIT BILL':'NEW BILL'}</div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:12}} className="resp-grid-4">
              <div><label style={_lbl}>Vendor</label><input list="vb-vendor-list" value={billForm.vendorName} onChange={e=>setBillForm(f=>({...f,vendorName:e.target.value}))} placeholder="American Express, Chase, Citi..." style={_inp} autoComplete="off"/><datalist id="vb-vendor-list">{(vendors||[]).map(v=><option key={v.id} value={v.name}/>)}</datalist></div>
              <div><label style={_lbl}>Bill # / reference</label><input value={billForm.ref} onChange={e=>setBillForm(f=>({...f,ref:e.target.value}))} placeholder="statement 9/15" style={{..._inp,..._mono}}/></div>
              <div><label style={_lbl}>Bill date</label><input type="date" value={billForm.date} onChange={e=>setBillForm(f=>({...f,date:e.target.value,dueDate:f.dueDate||_vbPlusDays(e.target.value,30)}))} style={{..._inp,..._mono}}/></div>
              <div><label style={_lbl}>Due date</label><input type="date" value={billForm.dueDate} onChange={e=>setBillForm(f=>({...f,dueDate:e.target.value}))} style={{..._inp,..._mono}}/></div>
            </div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:560}}>
              <thead><tr style={{borderBottom:"1px solid #222"}}>{["Category","Amount","Memo",""].map((h,i)=><th key={i} style={{padding:"6px 6px",textAlign:i===1?"right":"left",fontSize:10,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6}}>{h}</th>)}</tr></thead>
              <tbody>{billForm.lines.map((l,i)=><tr key={i} className="vb-line" style={{borderBottom:"1px solid #161616"}}>
                <td style={{padding:"5px 6px",width:"38%"}}><select value={l.category} onChange={e=>setLine(i,{category:e.target.value})} style={{..._inp,color:l.category?"#e5e5e5":"#737373",cursor:"pointer"}}><option value="">Pick a category...</option>{lineCats.map(c=><option key={c} value={c}>{c}</option>)}</select></td>
                <td style={{padding:"5px 6px",width:140}}><input type="number" min="0" step="0.01" value={l.amount} onChange={e=>setLine(i,{amount:e.target.value})} placeholder="0.00" style={{..._inp,..._mono,textAlign:"right"}}/></td>
                <td style={{padding:"5px 6px"}}><input value={l.memo} onChange={e=>setLine(i,{memo:e.target.value})} placeholder="optional" style={_inp}/></td>
                <td style={{padding:"5px 6px",width:36,textAlign:"right"}}>{billForm.lines.length>1&&<button onClick={()=>setBillForm(f=>({...f,lines:f.lines.filter((x,k)=>k!==i)}))} title="Remove line" style={{..._small,color:"#f87171",borderColor:"#f8717130",padding:"4px 8px"}}>x</button>}</td>
              </tr>)}</tbody>
            </table></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:8}}>
              <button className="vb-add-line" onClick={()=>setBillForm(f=>({...f,lines:[...f.lines,{category:'',amount:'',memo:''}]}))} style={{..._small,color:"#2dd4bf",borderColor:"#2dd4bf40"}}>+ Add line</button>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:"#a3a3a3"}}>Lines <span style={{..._mono,color:"#e5e5e5",fontWeight:700}}>{fmt(formLinesTotal)}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:"#a3a3a3"}}>Bill total</span><input value={billForm.total} onChange={e=>setBillForm(f=>({...f,total:e.target.value}))} placeholder={fmt(formLinesTotal)} style={{..._inp,..._mono,width:120,textAlign:"right"}}/></div>
                <span className="vb-balance" style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:formBalanced?"#34d39915":"#f8717115",color:formBalanced?"#34d399":"#f87171",..._mono}}>{formTotal<=0?'enter amounts':formBalanced?'balanced':'off by '+fmt(Math.abs(formDiff))}</span>
                {!formBalanced&&formTotalRaw!==''&&formLinesTotal>0&&<button onClick={()=>setBillForm(f=>({...f,total:String(formLinesTotal)}))} style={_small}>Use line total</button>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginTop:12}}>
              <div><label style={_lbl}>Memo</label><input value={billForm.memo} onChange={e=>setBillForm(f=>({...f,memo:e.target.value}))} placeholder="optional note for the whole bill" style={_inp}/></div>
              <div style={{display:"flex",gap:6}}><Btn onClick={saveBillForm} style={{opacity:formBalanced?1:0.55}} title={formBalanced?'':'The category lines must add up to the bill total'}><I n="check" s={13}/> Save Bill</Btn><Btn v="ghost" onClick={()=>setBillForm(null)}>Cancel</Btn></div>
            </div>
          </div>}
          {visibleBills.length===0?<div style={{padding:"36px 0",textAlign:"center"}}><div style={{fontSize:14,color:"#a3a3a3",marginBottom:4}}>{vendorBills.length===0?'No vendor bills yet.':'No bills match this view.'}</div><div style={{fontSize:12,color:"#525252",maxWidth:520,margin:"0 auto"}}>{vendorBills.length===0?'Enter a credit card statement or any vendor bill with its category breakdown. The categories land on the P&L on the bill date; when you pay it, match the payment to the bank feed so the same dollars are never counted twice.':'Try another filter or search.'}</div></div>:
          <div style={{overflowX:"auto"}}><table className="vb-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:760}}>
            <thead><tr style={{borderBottom:"2px solid #222"}}>{["Vendor","Bill date","Due","Categories","Total","Paid","Balance","Status",""].map((h,i)=><th key={i} style={{padding:"9px 8px",textAlign:i>=4&&i<=6?"right":"left",fontSize:10,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{visibleBills.map(b=>{const st=billStatus(b);const isOpen=billOpen===b.id;const total=billTotal(b);const paid=billPaidTotal(b);const bal=billBalance(b);const overdue=st!=='paid'&&(()=>{const d=parseLocalDate(b.dueDate);return !!d&&d<now})();const cats=(b.lines||[]).map(l=>l.category).filter(Boolean);const catLabel=cats.length===0?'--':cats.length===1?cats[0]:cats[0]+' +'+(cats.length-1);return <React.Fragment key={b.id}>
              <tr className="vb-row" onClick={()=>setBillOpen(isOpen?null:b.id)} style={{borderBottom:"1px solid #161616",cursor:"pointer",background:isOpen?"rgba(255,255,255,0.025)":"transparent"}} onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background="#111"}} onMouseLeave={e=>{e.currentTarget.style.background=isOpen?"rgba(255,255,255,0.025)":"transparent"}}>
                <td style={{padding:"9px 8px"}}><div style={{color:"#e5e5e5",fontWeight:600}}>{b.vendorName||'Vendor'}</div>{b.ref?<div style={{fontSize:10,color:"#737373",..._mono}}>#{b.ref}</div>:null}</td>
                <td style={{padding:"9px 8px",..._mono,color:"#a3a3a3",whiteSpace:"nowrap"}}>{b.date||'--'}</td>
                <td style={{padding:"9px 8px",whiteSpace:"nowrap"}}><div style={{..._mono,color:overdue?"#f87171":"#a3a3a3"}}>{b.dueDate||'--'}</div>{st!=='paid'&&b.dueDate?<div style={{fontSize:10,color:overdue?"#f87171":"#525252"}}>{daysLabel(b)}</div>:null}</td>
                <td style={{padding:"9px 8px",color:"#c4c4c4",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={cats.join(', ')}>{catLabel}</td>
                <td style={{padding:"9px 8px",textAlign:"right",..._mono,color:"#e5e5e5",fontWeight:600}}>{fmt(total)}</td>
                <td style={{padding:"9px 8px",textAlign:"right",..._mono,color:paid>0?"#34d399":"#525252"}}>{paid>0?fmt(paid):'--'}</td>
                <td style={{padding:"9px 8px",textAlign:"right",..._mono,color:bal>0?"#fbbf24":"#525252",fontWeight:bal>0?700:400}}>{bal>0?fmt(bal):'--'}</td>
                <td style={{padding:"9px 8px"}}>{statusBadge(st)}</td>
                <td style={{padding:"9px 8px",textAlign:"right",whiteSpace:"nowrap"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>{st!=='paid'&&<button className="vb-pay" onClick={()=>openPayBill(b)} style={{..._small,color:"#2dd4bf",borderColor:"#2dd4bf40",fontWeight:700}}>Pay</button>}<button onClick={()=>openEditBill(b)} style={_small}>Edit</button><button onClick={()=>voidBill(b)} style={{..._small,color:"#f87171",borderColor:"#f8717130"}}>Void</button></div></td>
              </tr>
              {isOpen&&<tr className="vb-detail"><td colSpan={9} style={{padding:0}}><div style={{padding:"12px 16px 16px 24px",background:"#0d0d0d",borderBottom:"1px solid #161616",animation:"fadeUp 0.15s"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}} className="resp-grid-2">
                  <div>
                    <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:6}}>Category lines</div>
                    {(b.lines||[]).map((l,i)=><div key={i} className="vb-detail-line" style={{display:"flex",justifyContent:"space-between",gap:10,padding:"4px 0",fontSize:12,borderBottom:"1px solid #161616"}}><span style={{color:"#c4c4c4"}}>{l.category}{l.memo?<span style={{color:"#737373",marginLeft:8,fontSize:11}}>{l.memo}</span>:null}</span><span style={{..._mono,color:"#e5e5e5"}}>{fmt(l.amount)}</span></div>)}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:12}}><span style={{color:"#737373"}}>Bill total</span><span style={{..._mono,color:"#e5e5e5",fontWeight:700}}>{fmt(total)}</span></div>
                    {b.memo?<div style={{fontSize:11,color:"#737373",marginTop:4}}>{b.memo}</div>:null}
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:6}}>Payments</div>
                    {(b.payments||[]).length===0&&<div style={{fontSize:12,color:"#525252",padding:"4px 0"}}>None yet{st!=='paid'?' -- click Pay to record one and match it to the bank feed.':''}</div>}
                    {(b.payments||[]).map(p=><div key={p.id} className="vb-payment" style={{display:"flex",justifyContent:"space-between",gap:10,padding:"5px 0",fontSize:12,borderBottom:"1px solid #161616",alignItems:"center"}}><span><span style={{..._mono,color:"#a3a3a3"}}>{p.date}</span><span style={{color:"#c4c4c4",marginLeft:8}}>{p.method||''}{p.ref?' '+p.ref:''}</span>{p.txnId?<span title={p.txnDescription||''} style={{marginLeft:8,fontSize:9,padding:"1px 6px",borderRadius:4,background:"#2dd4bf15",color:"#2dd4bf",fontWeight:700,letterSpacing:0.4}}>BANK MATCHED</span>:<span style={{marginLeft:8,fontSize:9,padding:"1px 6px",borderRadius:4,background:"#fbbf2415",color:"#fbbf24",fontWeight:700,letterSpacing:0.4}}>NO BANK MATCH</span>}</span><span style={{display:"flex",alignItems:"center",gap:8}}><span style={{..._mono,color:"#34d399",fontWeight:600}}>{fmt(p.amount)}</span><button onClick={()=>removeBillPayment(b,p)} style={{..._small,padding:"2px 7px",color:"#f87171",borderColor:"#f8717130"}}>Remove</button></span></div>)}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:12}}><span style={{color:"#737373"}}>Balance</span><span style={{..._mono,color:bal>0?"#fbbf24":"#34d399",fontWeight:700}}>{fmt(bal)}</span></div>
                  </div>
                </div>
                {billPay&&billPay.billId===b.id&&<div className="vb-pay-panel" style={{marginTop:12,padding:14,background:"#0a0a0a",border:"1px solid #2dd4bf30",borderRadius:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#2dd4bf",marginBottom:10,letterSpacing:0.5}}>PAY BILL</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}} className="resp-grid-4">
                    <div><label style={_lbl}>Amount</label><input value={billPay.amount} onChange={e=>setBillPay(p=>({...p,amount:e.target.value}))} style={{..._inp,..._mono,textAlign:"right"}}/></div>
                    <div><label style={_lbl}>Date</label><input type="date" value={billPay.date} onChange={e=>setBillPay(p=>({...p,date:e.target.value}))} style={{..._inp,..._mono}}/></div>
                    <div><label style={_lbl}>Method</label><select value={billPay.method} onChange={e=>setBillPay(p=>({...p,method:e.target.value}))} style={{..._inp,cursor:"pointer"}}>{['ACH','Check','Credit Card','Cash','Other'].map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label style={_lbl}>Check # / reference</label><input value={billPay.ref} onChange={e=>setBillPay(p=>({...p,ref:e.target.value}))} placeholder="optional" style={{..._inp,..._mono}}/></div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                    <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:0.6,textTransform:"uppercase"}}>Match to the bank feed <span style={{color:"#525252",fontWeight:400,textTransform:"none",letterSpacing:0}}>-- the matched transaction moves to Bill Payment so it is not counted as an expense again</span></div>
                    <input value={billPay.search} onChange={e=>setBillPay(p=>({...p,search:e.target.value}))} placeholder="search description or amount" style={{..._inp,width:220,padding:"6px 10px",fontSize:11}}/>
                  </div>
                  {payMatches.length===0?<div style={{fontSize:12,color:"#525252",padding:"8px 0"}}>No unassigned bank payments to match. You can still record the payment without a match.</div>:
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>{payMatches.map(({t,remaining,exact})=>{const sel=billPay.txnId===t.id;return <div key={t.id} className="vb-match" onClick={()=>pickPayTxn(t,remaining)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,cursor:"pointer",background:sel?"#2dd4bf12":"transparent",border:"1px solid "+(sel?"#2dd4bf60":"rgba(255,255,255,0.05)")}}>
                    <span style={{width:14,height:14,borderRadius:7,border:"2px solid "+(sel?"#2dd4bf":"#444"),background:sel?"#2dd4bf":"transparent",flexShrink:0}}/>
                    <span style={{..._mono,color:"#a3a3a3",fontSize:11,whiteSpace:"nowrap"}}>{t.date||'--'}</span>
                    <span style={{flex:1,color:"#e5e5e5",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description||'--'}<span style={{color:"#525252",fontSize:10,marginLeft:8}}>{acctName(t.account)}</span></span>
                    {exact&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:"#34d39915",color:"#34d399",fontWeight:700,letterSpacing:0.4}}>EXACT</span>}
                    <span style={{..._mono,color:"#f87171",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{fmt(remaining)}{remaining<_vbMoney(t.amount)-0.005?<span style={{color:"#525252",fontSize:10}}> of {fmt(t.amount)}</span>:null}</span>
                  </div>})}</div>}
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:12}}><Btn className="vb-record" onClick={recordBillPayment}><I n="check" s={13}/> Record Payment{billPay.txnId?' + Match':''}</Btn><Btn v="ghost" onClick={()=>setBillPay(null)}>Cancel</Btn></div>
                </div>}
              </div></td></tr>}
            </React.Fragment>})}</tbody>
          </table></div>}
        </Card>
      </div>;
    })()}
    {tab==="ar"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>TOTAL AR</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(totalAR)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{unpaidJobCount} unpaid job{unpaidJobCount!==1?"s":""}</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>CURRENT</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(arAging.current)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{totalAR>0?(arAging.current/totalAR*100).toFixed(0):0}%</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>30+ DAYS</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(arAging.t30+arAging.t60+arAging.t90+arAging.over90)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{totalAR>0?((arAging.t30+arAging.t60+arAging.t90+arAging.over90)/totalAR*100).toFixed(0):0}%</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>90+ OVERDUE</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:arAging.over90>0?"#f87171":"#34d399",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(arAging.over90)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{arAging.over90>0?"Action needed":"On track"}</div></Card>
      </div>


      <Card style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Accounts Receivable Aging</div><Btn onClick={()=>generatePDF("ar")}><I n="download" s={14}/> Export PDF</Btn></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["Customer / Job","Current","1-30","31-60","61-90","90+","Total"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:h==="Customer / Job"?"left":"right",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
          {filteredJobs.filter(j=>j.paymentStatus!=="paid").map(j=>{const f=getJobFinancials(j.id);if(!_jobInvoiced(j,f))return null;const c=customers.find(c2=>c2.id===j.customer);const inv=j.dueDate?new Date(j.dueDate):new Date(j.createdDate||now);const days=Math.floor((now-inv)/86400000);return <tr key={j.id} onClick={()=>{fCtx.setSelectedJob(j.id);fCtx.setPage('jobs')}} style={{borderBottom:"1px solid #111",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"8px 6px"}}><div style={{color:"#e5e5e5",fontWeight:500}}>{j.name}</div><div style={{fontSize:11,color:"#737373"}}>{c?.name}</div></td>{[days<=0,days>0&&days<=30,days>30&&days<=60,days>60&&days<=90,days>90].map((show,i)=><td key={i} style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:show?["#34d399","#2dd4bf","#fbbf24","#f97316","#f87171"][i]:"#333"}}>{show?fmt(f.totalRevenue):""}</td>)}<td style={{padding:"8px 6px",textAlign:"right",fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</td></tr>})}
          <tr style={{borderTop:"2px solid #222"}}><td style={{padding:"8px 6px",fontWeight:700}}>TOTAL</td>{[arAging.current,arAging.t30,arAging.t60,arAging.t90,arAging.over90].map((v,i)=><td key={i} style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:["#34d399","#2dd4bf","#fbbf24","#f97316","#f87171"][i]}}>{fmt(v)}</td>)}<td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalAR)}</td></tr>
        </tbody></table></div>
      </Card>


      <Card style={{padding:16}}>
        <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>AR by Customer</div>
        {arCustomerList.slice(0,10).map((c,i)=><div key={c.name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:6,background:"#2dd4bf12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#2dd4bf",fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><div><span style={{fontSize:13,color:"#e5e5e5",fontWeight:500}}>{c.name}</span><span style={{fontSize:11,color:"#737373",marginLeft:8}}>{c.jobs} job{c.jobs!==1?"s":""}</span></div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.total)}</span><span style={{fontSize:11,color:"#737373"}}>{totalAR>0?(c.total/totalAR*100).toFixed(0):0}%</span></div></div><Bar value={c.total} max={arCustomerList[0]?.total||1} color={c.over90>0?"#f87171":c.t90>0?"#f97316":c.t60>0?"#fbbf24":"#2dd4bf"} height={5}/></div>)}
        {arCustomerList.length===0&&<div style={{textAlign:"center",padding:20,color:"#525252",fontSize:13}}>All invoices are paid</div>}
      </Card>
    </div>}


    {tab==="ap"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>TOTAL AP</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(totalAP)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{apVendorList.length} vendor{apVendorList.length!==1?"s":""}</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>CURRENT</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(apAging.current)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{totalAP>0?(apAging.current/totalAP*100).toFixed(0):0}%</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>30+ DAYS</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(apAging.t30+apAging.t60+apAging.t90+apAging.over90)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{totalAP>0?((apAging.t30+apAging.t60+apAging.t90+apAging.over90)/totalAP*100).toFixed(0):0}%</div></Card>
        <Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>90+ OVERDUE</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:apAging.over90>0?"#f87171":"#34d399",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={fmt(apAging.over90)}/></div><div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{apAging.over90>0?"Action needed":"On track"}</div></Card>
      </div>


      <Card style={{padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Accounts Payable Aging</div><Btn onClick={()=>generatePDF("ap")}><I n="download" s={14}/> Export PDF</Btn></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["Vendor","Items","Current","1-30","31-60","61-90","90+","Total"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:h==="Vendor"?"left":"right",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
          {apVendorList.map(v=><tr key={v.name} style={{borderBottom:"1px solid #111"}}><td style={{padding:"8px 6px"}}><div style={{color:"#e5e5e5",fontWeight:500}}>{v.name}</div></td><td style={{padding:"8px 6px",textAlign:"right",color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>{v.items}</td>{[v.current,v.t30,v.t60,v.t90,v.over90].map((amt,i)=><td key={i} style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:amt>0?["#a78bfa","#8b5cf6","#fbbf24","#f97316","#f87171"][i]:"#333"}}>{amt>0?fmt(amt):""}</td>)}<td style={{padding:"8px 6px",textAlign:"right",fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(v.total)}</td></tr>)}
          <tr style={{borderTop:"2px solid #222"}}><td style={{padding:"8px 6px",fontWeight:700}}>TOTAL</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#737373"}}>{filteredItems.length}</td>{[apAging.current,apAging.t30,apAging.t60,apAging.t90,apAging.over90].map((v,i)=><td key={i} style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:["#a78bfa","#8b5cf6","#fbbf24","#f97316","#f87171"][i]}}>{fmt(v)}</td>)}<td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalAP)}</td></tr>
        </tbody></table></div>
      </Card>


      <Card style={{padding:16}}>
        <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>AP by Vendor</div>
        {apVendorList.slice(0,10).map((v,i)=><div key={v.name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:6,background:"#a78bfa12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#a78bfa",fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><span style={{fontSize:13,color:"#e5e5e5",fontWeight:500}}>{v.name}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(v.total)}</span><span style={{fontSize:11,color:"#737373"}}>{totalAP>0?(v.total/totalAP*100).toFixed(0):0}%</span></div></div><Bar value={v.total} max={apVendorList[0]?.total||1} color="#a78bfa" height={5}/></div>)}
      </Card>
    </div>}


    {tab==="margin"&&<Card style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Job Margin Analysis</div><Btn onClick={()=>generatePDF("margin")}><I n="download" s={14}/> Export PDF</Btn></div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:450}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["Job","Phase","Revenue","Cost","Profit","Margin"].map(h=><th key={h} style={{padding:"8px 6px",textAlign:h==="Job"||h==="Phase"?"left":"right",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
        {filteredJobs.map(j=>{const f=getJobFinancials(j.id);const profit=f.totalRevenue-f.totalCost;return <tr key={j.id} onClick={()=>{fCtx.setSelectedJob(j.id);fCtx.setPage('jobs')}} style={{borderBottom:"1px solid #111",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{padding:"8px 6px",color:"#e5e5e5",fontWeight:500}}>{j.name}</td><td style={{padding:"8px 6px"}}><Badge label={j.phase} color={statusColor(j.phase)}/></td><td style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</td><td style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#a3a3a3"}}>{fmt(f.totalCost)}</td><td style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:profit>=0?"#34d399":"#f87171"}}>{fmt(profit)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:f.margin>=30?"#34d399":f.margin>=20?"#fbbf24":"#f87171"}}>{f.margin.toFixed(1)}%</td></tr>})}
        <tr style={{borderTop:"2px solid #222"}}><td style={{padding:"8px 6px",fontWeight:700}} colSpan={2}>TOTAL</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalRev)}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}><AnimatedNumber value={totalCost} prefix="$"/></td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:grossProfit>=0?"#34d399":"#f87171"}}><AnimatedNumber value={grossProfit} prefix="$"/></td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{grossMargin.toFixed(1)}%</td></tr>
      </tbody></table></div>
    </Card>}


    {tab==="reports"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}} className="resp-grid-2">
        {[{title:"Profit & Loss Statement",desc:"Complete income statement with revenue by job, COGS by vendor, operating expenses, and net income",icon:"dollar",fn:()=>generatePDF("pnl")},
          {title:"Balance Sheet",desc:"Assets, liabilities, and equity snapshot with cash, receivables, inventory, payables, and retained earnings",icon:"briefcase",fn:()=>generatePDF("balance")},
          {title:"AR Aging Report",desc:"Accounts receivable broken down by aging bucket (current, 30, 60, 90, 90+) with customer detail",icon:"file",fn:()=>generatePDF("ar")},
          {title:"AP Aging Report",desc:"Accounts payable broken down by aging bucket (current, 30, 60, 90, 90+) with vendor detail and item counts",icon:"truck",fn:()=>generatePDF("ap")},
          {title:"Job Margin Analysis",desc:"Revenue, cost, profit, and margin percentage for every job with color-coded health indicators",icon:"briefcase",fn:()=>generatePDF("margin")},
          {title:"Vendor Spend Report",desc:"Total spend by vendor with percentage of COGS, item counts, and discount rates",icon:"truck",fn:()=>{const csv="Vendor,Spend,% of COGS,Items,Discount\n"+vendorSpend.map(v=>v.name+","+v.spend.toFixed(2)+","+v.pct.toFixed(1)+"%,"+lineItems.filter(i=>i.vendor===vendors.find(v2=>v2.name===v.name)?.id).length+","+(vendors.find(v2=>v2.name===v.name)?.discountRate*100||0).toFixed(0)+"%").join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="vendor-spend.csv";a.click();notify("Vendor spend exported")}},
          {title:"Customer Revenue Report",desc:"Revenue by customer with job counts and percentage of total revenue",icon:"users",fn:()=>{const csv="Customer,Revenue,Jobs,% of Total\n"+custRev.map(c=>c.name+","+c.revenue.toFixed(2)+","+c.jobs+","+c.pct.toFixed(1)+"%").join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="customer-revenue.csv";a.click();notify("Customer revenue exported")}},
          {title:"Commission Summary",desc:"Commission obligations by rep with earned vs pending breakdown (commission is paid on PROFIT, not revenue)",icon:"dollar",fn:()=>{const csv="Rep,Territory,Rate,Revenue,Profit,Commission,Earned,Pending\n"+reps.filter(r=>!r.id.includes("SEED_FLAG")&&r.commissionRate>0).map(r=>{const repJobs=filteredJobs.filter(j=>j.salesRep===r.id);const rv=repJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const profit=repJobs.reduce((s,j)=>{const f=getJobFinancials(j.id);return s+Math.max(0,(f.totalRevenue||0)-(f.totalCost||0))},0);const comm=repJobs.reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);const earned=repJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);const pending=comm-earned;return r.name+","+r.territory+","+(r.commissionRate*100).toFixed(1)+"%,"+rv.toFixed(2)+","+profit.toFixed(2)+","+comm.toFixed(2)+","+earned.toFixed(2)+","+pending.toFixed(2)}).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="commission-summary.csv";a.click();notify("Commission summary exported")}}
        ].map(r=><Card key={r.title} style={{padding:16,cursor:"pointer",transition:"all 0.2s"}} hover onClick={r.fn}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:36,height:36,borderRadius:10,background:"#2dd4bf12",display:"flex",alignItems:"center",justifyContent:"center"}}><I n={r.icon} s={16} color="#2dd4bf"/></div><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0"}}>{r.title}</div></div>
          <div style={{fontSize:12,color:"#a3a3a3",lineHeight:1.5}}>{r.desc}</div>
        </Card>)}
      </div>
    </div>}


    {tab==="coa"&&(()=>{
      // ---- CHART OF ACCOUNTS (GL Phase 1) ----------------------------------
      // Real accounts live in the accounts table. Until the Journal ships (Phase 2)
      // each account's register shows the categorized bank transactions that map to
      // it through legacy_category, date-filtered by the page's period selector.
      const accs=(glAccounts||[]);
      const q=coaSearch.trim().toLowerCase();
      const vis=a=>(coaShowInactive||a.isActive)&&(!q||String(a.number).includes(q)||a.name.toLowerCase().includes(q));
      const parents=accs.filter(a=>!a.parentId).sort((a,b)=>a.number-b.number);
      const kidsOf=pid=>accs.filter(a=>a.parentId===pid).sort((a,b)=>a.number-b.number).filter(vis);
      // Movement categories are real categorizations even though they map to no
      // P&L account (Transfer is bank-to-bank by design) -- without this they would
      // wrongly surface in the 6990 Uncategorized register.
      const _knownLegacy=new Set([...accs.map(a=>a.legacyCategory).filter(Boolean),'Transfer','Owner Draw','Owner Investment']);
      const acctTxns=(a)=>{
        if(a.subtype==='bank')return filteredManualTxns.filter(t=>t.account===a.bankRef||(a.number===1010&&t.account&&_bankAcctMetaGlobal[t.account]&&!_bankAcctMetaGlobal[t.account].excluded));
        if(a.number===6990)return filteredManualTxns.filter(t=>!t.category||t.category==='Uncategorized'||t.category==='Other'||!_knownLegacy.has(t.category));
        if(a.legacyCategory)return filteredManualTxns.filter(t=>t.category===a.legacyCategory);
        return [];
      };
      const activityOf=a=>acctTxns(a).reduce((s2,t)=>s2+(parseFloat(t.amount)||0),0);
      const balanceOf=a=>{
        if(a.subtype==='bank'&&a.number===1010)return liveBankCash;
        if(a.subtype==='ar')return totalAR;
        if(a.subtype==='ap')return totalAP;
        if(a.number===2300)return totalComm;
        return null;
      };
      const typeColor={asset:"#2dd4bf",liability:"#f97316",equity:"#34d399",revenue:"#2dd4bf",cogs:"#f87171",expense:"#fbbf24"};
      const exportCoa=()=>{
        const esc=v=>{const str=String(v==null?'':v);return /[",\n\r]/.test(str)?'"'+str.replace(/"/g,'""')+'"':str};
        const rows=[['Number','Name','Type','Subtype','Normal Balance','Legacy Category','Active','System']];
        accs.sort((a,b)=>a.number-b.number).forEach(a=>rows.push([a.number,a.name,a.type,a.subtype||'',a.normalBalance,a.legacyCategory||'',a.isActive?'yes':'no',a.isSystem?'yes':'no']));
        const blob=new Blob([rows.map(r=>r.map(esc).join(',')).join('\n')],{type:'text/csv'});
        const u=URL.createObjectURL(blob);const el=document.createElement('a');el.href=u;el.download='chart_of_accounts.csv';el.click();URL.revokeObjectURL(u);
        notify('Chart of accounts exported');
      };
      const startNew=()=>{setCoaEditing('new');setCoaForm({number:'',name:'',type:'expense',description:''})};
      const startEdit=(a)=>{setCoaEditing(a.id);setCoaForm({number:String(a.number),name:a.name,type:a.type,description:a.description||''})};
      const parentForType=ty=>ty==='asset'?'ACC-1000':ty==='liability'?'ACC-2000':ty==='equity'?'ACC-3000':ty==='revenue'?'ACC-4000':ty==='cogs'?'ACC-5000':'ACC-6000';
      const saveAcct=async()=>{
        const num=parseInt(coaForm.number,10);const nm=coaForm.name.trim();
        if(!num||num<1||num>99999){notify('Enter a valid account number','error');return}
        if(!nm){notify('Enter an account name','error');return}
        const existing=coaEditing!=='new'?accs.find(a=>a.id===coaEditing):null;
        if(accs.some(a=>a.number===num&&(!existing||a.id!==existing.id))){notify('Account number '+num+' is already in use','error');return}
        let rec;
        if(existing){
          rec={...existing,name:nm,description:coaForm.description.trim()};
          if(!existing.isSystem){rec.number=num;rec.type=coaForm.type;rec.parentId=parentForType(coaForm.type);rec.normalBalance=(coaForm.type==='liability'||coaForm.type==='equity'||coaForm.type==='revenue')?'credit':'debit'}
        }else{
          rec={id:'ACC-'+num,number:num,name:nm,type:coaForm.type,subtype:'',parentId:parentForType(coaForm.type),normalBalance:(coaForm.type==='liability'||coaForm.type==='equity'||coaForm.type==='revenue')?'credit':'debit',bankRef:'',legacyCategory:nm,isActive:true,isSystem:false,description:coaForm.description.trim()};
        }
        const r=await db.saveAccount(rec);
        if(r&&r.ok){notify(existing?'Account updated':'Account '+num+' created');setCoaEditing(null);_reloadGl()}
        else notify('Save failed -- the database may have rejected the change','error');
      };
      const toggleActive=async(a)=>{
        const r=await db.saveAccount({...a,isActive:!a.isActive});
        if(r&&r.ok){notify(a.isActive?'Account deactivated':'Account reactivated');_reloadGl()}else notify('Update failed','error');
      };
      return <Card style={{padding:24,background:"#000000",border:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Chart of Accounts</div><div style={{fontSize:11,color:"#737373",marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{accs.filter(a=>a.parentId).length} accounts -- activity reflects the selected period</div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input value={coaSearch} onChange={e=>setCoaSearch(e.target.value)} placeholder="Search number or name..." style={{...inputStyle,width:190,fontSize:12}}/>
            <button onClick={()=>setCoaShowInactive(!coaShowInactive)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid "+(coaShowInactive?"#2dd4bf30":"rgba(255,255,255,0.07)"),background:coaShowInactive?"#2dd4bf0d":"rgba(17,17,17,0.55)",color:coaShowInactive?"#2dd4bf":"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Show Inactive</button>
            <Btn v="secondary" style={{fontSize:11,padding:"6px 12px"}} onClick={exportCoa}><I n="download" s={12}/> Export CSV</Btn>
            <Btn style={{fontSize:11,padding:"6px 12px"}} onClick={startNew}>+ Add Account</Btn>
          </div>
        </div>
        <div style={{fontSize:10.5,color:"#7a7a7a",marginBottom:18,letterSpacing:0.2,fontFamily:"'Satoshi',sans-serif"}}>Open an account to see its register. System accounts are part of the ledger structure -- they can be renamed but never deleted, retyped or renumbered.</div>
        {glAccounts===null?<div style={{padding:40,textAlign:"center",color:"#525252",fontSize:13}}>Loading chart of accounts...</div>:
        parents.map(par=>{
          const ch=kidsOf(par.id);if(ch.length===0)return null;
          const subtotal=ch.reduce((s2,c)=>s2+activityOf(c),0);
          const pc=typeColor[par.type]||"#2dd4bf";
          return <div key={par.id} style={{marginBottom:26}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"6px 0 10px 0",borderBottom:"1px solid "+pc+"40"}}>
              <span style={{fontSize:11,fontWeight:700,color:pc,letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}><span style={{fontFamily:"'JetBrains Mono',monospace",marginRight:10,opacity:0.7}}>{par.number}</span>{par.name}</span>
              <span style={{fontSize:13,fontWeight:700,color:"#f5f5f5",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.2}}>{fmt(subtotal)}</span>
            </div>
            {ch.map(a=>{
              const open=!!coaOpen[a.id];
              const act=activityOf(a);
              const bal=balanceOf(a);
              const isReview=(a.description||'').indexOf('Auto-created')===0;
              const reg=open?acctTxns(a).slice().sort((x,y)=>(x.date||'').localeCompare(y.date||'')):null;
              let running=0;
              return <div key={a.id}>
                <div onClick={()=>setCoaOpen(o=>({...o,[a.id]:!o[a.id]}))} style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",background:open?"rgba(255,255,255,0.018)":"transparent",transition:"background 0.2s",opacity:a.isActive?1:0.45}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.035)"}} onMouseLeave={e=>{e.currentTarget.style.background=open?"rgba(255,255,255,0.018)":"transparent"}}>
                  <span style={{width:16,height:16,borderRadius:5,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"transform 0.25s cubic-bezier(0.34,1.4,0.64,1)",transform:open?"rotate(90deg)":"none"}}><span style={{fontSize:7,color:pc,lineHeight:1}}>{'\u25B6'}</span></span>
                  <span style={{fontSize:11.5,color:"#9a9a9a",fontFamily:"'JetBrains Mono',monospace",width:44,flexShrink:0}}>{a.number}</span>
                  <span style={{fontSize:13.5,color:"#f5f5f5",fontWeight:600,letterSpacing:0.15,fontFamily:"'Satoshi',sans-serif"}}>{a.name}</span>
                  {!a.isSystem&&<span style={{fontSize:8.5,fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",padding:"2px 8px",borderRadius:20,letterSpacing:0.5}}>CUSTOM</span>}
                  {isReview&&<span style={{fontSize:8.5,fontFamily:"'JetBrains Mono',monospace",color:"#fbbf24",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",padding:"2px 8px",borderRadius:20,letterSpacing:0.5}}>REVIEW</span>}
                  {!a.isActive&&<span style={{fontSize:8.5,fontFamily:"'JetBrains Mono',monospace",color:"#737373",background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.08)",padding:"2px 8px",borderRadius:20,letterSpacing:0.5}}>INACTIVE</span>}
                  <span style={{flex:1}}/>
                  <span style={{fontSize:12.5,fontWeight:600,color:Math.abs(act)>0.005?"#e5e5e5":"#525252",fontFamily:"'JetBrains Mono',monospace",flexShrink:0,minWidth:96,textAlign:"right",letterSpacing:-0.2}}>{fmt(act)}</span>
                  <span style={{fontSize:12.5,fontWeight:700,color:bal!=null?pc:"#3a3a3a",fontFamily:"'JetBrains Mono',monospace",flexShrink:0,minWidth:110,textAlign:"right",letterSpacing:-0.2}}>{bal!=null?fmt(bal):"--"}</span>
                  <button onClick={e=>{e.stopPropagation();startEdit(a)}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#737373",fontSize:10.5,cursor:"pointer",fontFamily:"inherit",flexShrink:0,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf";e.currentTarget.style.borderColor="#2dd4bf40"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}}>Edit</button>
                </div>
                {open&&<div style={{animation:"fadeUp 0.25s",marginLeft:21,borderLeft:"1px solid rgba(255,255,255,0.07)"}}>
                  {reg.length===0?<div style={{padding:"12px 18px",fontSize:11.5,color:"#525252",fontFamily:"'Satoshi',sans-serif"}}>No activity in the selected period.</div>:
                  <>
                    <div style={{display:"flex",gap:10,padding:"8px 14px 4px 18px",fontSize:9,color:"#7a7a7a",letterSpacing:1.5,textTransform:"uppercase",fontFamily:"'Satoshi',sans-serif"}}><span style={{width:74}}>Date</span><span style={{flex:1}}>Description</span><span style={{width:90,textAlign:"right"}}>Amount</span><span style={{width:100,textAlign:"right"}}>Running</span></div>
                    {reg.slice(0,200).map((t,i)=>{const amt=parseFloat(t.amount)||0;const signed=a.subtype==='bank'?(t.type==='revenue'?amt:-amt):amt;running+=signed;
                      return <div key={t.id||i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 14px 6px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                        <span style={{width:74,fontSize:11,color:"#9a9a9a",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{t.date||'--'}</span>
                        <span style={{flex:1,fontSize:12,color:"#b8b8b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Satoshi',sans-serif"}}>{t.description||'--'}</span>
                        <span style={{width:90,textAlign:"right",fontSize:12,color:a.subtype==='bank'?(signed>=0?"#34d399":"#f87171"):"#d4d4d4",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{a.subtype==='bank'?(signed>=0?'+':'-')+fmt(Math.abs(signed)).replace('$','$'):fmt(amt)}</span>
                        <span style={{width:100,textAlign:"right",fontSize:12,color:"#8a8a8a",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{fmt(running)}</span>
                      </div>})}
                    {reg.length>200&&<div style={{padding:"8px 18px",fontSize:10.5,color:"#525252"}}>Showing first 200 of {reg.length} lines -- narrow the period selector to see the rest.</div>}
                  </>}
                </div>}
              </div>})}
          </div>})}
        {coaEditing&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setCoaEditing(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:460,background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:24,animation:"fadeUp 0.2s"}}>
            {(()=>{const existing=coaEditing!=='new'?accs.find(a=>a.id===coaEditing):null;const locked=existing&&existing.isSystem;
            return <>
              <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>{existing?'Edit Account':'New Account'}</div>
              {locked&&<div style={{fontSize:10.5,color:"#fbbf24",marginBottom:12}}>System account -- number and type are locked. Name and description can change.</div>}
              {!locked&&<div style={{fontSize:10.5,color:"#7a7a7a",marginBottom:12}}>Custom accounts map bank transactions whose category matches the account name.</div>}
              <div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:10,marginBottom:10}}>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Number</label><input type="number" value={coaForm.number} disabled={!!locked} onChange={e=>setCoaForm(f=>({...f,number:e.target.value}))} style={{...inputStyle,opacity:locked?0.5:1}}/></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Name</label><input value={coaForm.name} onChange={e=>setCoaForm(f=>({...f,name:e.target.value}))} style={inputStyle}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Type</label><select value={coaForm.type} disabled={!!locked} onChange={e=>setCoaForm(f=>({...f,type:e.target.value}))} style={{...inputStyle,opacity:locked?0.5:1}}>{['asset','liability','equity','revenue','cogs','expense'].map(ty=><option key={ty} value={ty}>{ty}</option>)}</select></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:3}}>Description</label><input value={coaForm.description} onChange={e=>setCoaForm(f=>({...f,description:e.target.value}))} style={inputStyle}/></div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:16}}>
                <div>{existing&&!existing.isSystem&&<Btn v="secondary" style={{fontSize:11,color:existing.isActive?"#f87171":"#34d399"}} onClick={()=>{toggleActive(existing);setCoaEditing(null)}}>{existing.isActive?'Deactivate':'Reactivate'}</Btn>}</div>
                <div style={{display:"flex",gap:8}}><Btn v="secondary" style={{fontSize:11}} onClick={()=>setCoaEditing(null)}>Cancel</Btn><Btn style={{fontSize:11}} onClick={saveAcct}>{existing?'Save Changes':'Create Account'}</Btn></div>
              </div>
            </>})()}
          </div>
        </div>}
      </Card>;
    })()}


    {tab==="close"&&(()=>{
      // ---- PERIOD CLOSE + AUDIT LOCK (GL Phase 1) --------------------------
      // The lock itself is a Postgres trigger -- closing here writes period_locks
      // and from that moment the database refuses every write into the period,
      // from this app, the Brain, the Plaid sync, or anyone with the SQL editor.
      const months=Array.from({length:12},(_,i)=>closeYear+'-'+String(i+1).padStart(2,'0'));
      const monthName=mp=>new Date(mp+'-15T12:00:00').toLocaleString('en-US',{month:'long'});
      const lockOf=mp=>(glLocks||[]).find(l=>l.period===mp);
      const _reconSop=mp=>{const r=(customSops||[]).find(s2=>s2.id==='PERIOD_RECON_'+mp);if(!r)return{};try{return JSON.parse(r.content)||{}}catch{return{}}};
      // Transfer / Owner Draw / Owner Investment are deliberate categorizations that
      // map to movement, not P&L accounts -- they must never count as uncategorized
      // or they would falsely block a period close.
      const _knownLegacy2=new Set([...(glAccounts||[]).map(a=>a.legacyCategory).filter(Boolean),'Transfer','Owner Draw','Owner Investment',BILL_PAYMENT_CATEGORY]);
      const monthTxns=mp=>manualTxns.filter(t=>_periodOf(t.date)===mp);
      const acctLabel=id=>(_bankAcctMetaGlobal[id]&&_bankAcctMetaGlobal[id].nickname)||(id==='Operating'?'Operating':String(id).slice(0,10)+'...');
      const checklistFor=(mp)=>{
        const tx=monthTxns(mp);
        const recon=_reconSop(mp);
        const acctIds=Array.from(new Set(tx.map(t=>t.account).filter(Boolean))).filter(id=>!(_bankAcctMetaGlobal[id]&&_bankAcctMetaGlobal[id].excluded));
        const bankPending=acctIds.filter(id=>!recon[id]);
        const uncat=tx.filter(t=>!t.category||t.category==='Uncategorized'||t.category==='Other'||!_knownLegacy2.has(t.category)).length;
        const jobsBad=(jobs||[]).filter(j=>{const d=fCtx.jobReportDate?fCtx.jobReportDate(j):j.createdDate;if(_periodOf(d)!==mp)return false;const f=getJobFinancials(j.id);return (f.totalRevenue>0.005&&f.totalCost<0.005)||(f.totalCost>0.005&&f.totalRevenue<0.005)});
        return [
          {k:'recon',label:'Every bank account reconciled through month end',pass:acctIds.length===0||bankPending.length===0,detail:acctIds.length===0?'No bank activity this month':(bankPending.length===0?String(acctIds.length)+' account'+(acctIds.length!==1?'s':'')+' attested':String(bankPending.length)+' of '+acctIds.length+' account'+(acctIds.length!==1?'s':'')+' pending'),overridable:true,recon:true,acctIds,reconData:recon},
          {k:'uncat',label:'Zero uncategorized transactions in the period',pass:uncat===0,detail:uncat===0?'All transactions categorized':String(uncat)+' uncategorized transaction'+(uncat!==1?'s':''),overridable:true,jump:uncat>0?()=>{setTab('banking');setBankCatFilter('__uncat__')}:null},
          {k:'journal',label:'Zero unposted journal entries in the period',pass:true,detail:'Arrives with the Journal (Phase 2)',phase2:true},
          {k:'tb',label:'Trial balance in balance',pass:true,detail:'Arrives with the Journal (Phase 2)',phase2:true},
          {k:'arctl',label:'AR control account ties to the subledger',pass:true,detail:'Arrives with the ledger backfill (Phase 3)',phase2:true},
          {k:'apctl',label:'AP control account ties to the subledger',pass:true,detail:'Arrives with the ledger backfill (Phase 3)',phase2:true},
          {k:'jobq',label:'No jobs with revenue and zero cost, or cost and zero revenue',pass:jobsBad.length===0,detail:jobsBad.length===0?'Job data quality clean':String(jobsBad.length)+' job'+(jobsBad.length!==1?'s':'')+' flagged: '+jobsBad.slice(0,3).map(j=>j.name).join(', ')+(jobsBad.length>3?' +'+String(jobsBad.length-3)+' more':''),overridable:true},
        ];
      };
      const saveRecon=(mp,acctId)=>{
        const v=reconDraft[mp+'|'+acctId];
        if(v==null||String(v).trim()===''){notify('Enter the statement ending balance first','error');return}
        const cur=_reconSop(mp);
        const next={...cur,[acctId]:{balance:String(v).trim(),by:_glUser,at:new Date().toISOString()}};
        addSop({id:'PERIOD_RECON_'+mp,title:'Reconciliation '+mp,cat:'Settings',icon:'check',content:JSON.stringify(next),custom:true});
        notify('Marked reconciled: '+acctLabel(acctId));
      };
      const doClose=async(mp,items)=>{
        const failing=items.filter(i=>!i.pass);
        const missing=failing.filter(i=>!(closeOverrides[mp+i.k]||'').trim());
        if(missing.length){notify('Every failing item needs a typed override reason before the period can close','error');return}
        const overrides={};failing.forEach(i=>{overrides[i.k]={reason:closeOverrides[mp+i.k].trim(),item:i.label}});
        const snapshot=items.map(i=>({k:i.k,label:i.label,pass:i.pass,detail:i.detail}));
        const r=await db.savePeriodLock({period:mp,status:'closed',closedAt:new Date().toISOString(),closedBy:_glUser,checklist:snapshot,overrides:Object.keys(overrides).length?overrides:null});
        if(r&&r.ok){db.logAudit({actor:_glUser,action:'close',entity:'period_locks',entity_id:mp,note:Object.keys(overrides).length?'Closed with '+Object.keys(overrides).length+' override(s)':'Closed clean'});notify('Period '+mp+' is closed. The database now refuses writes into it.');setCloseAsk(false);_reloadGl()}
        else notify('Close failed -- check the connection and try again','error');
      };
      const doReopen=async(mp)=>{
        const lk=lockOf(mp);if(!lk)return;
        if(reopenReason.trim().length<20){notify('The reopen reason must be at least 20 characters. This goes in the permanent audit trail.','error');return}
        const r=await db.savePeriodLock({...lk,status:'open',reopenedAt:new Date().toISOString(),reopenedBy:_glUser,reopenReason:reopenReason.trim()});
        if(r&&r.ok){db.logAudit({actor:_glUser,action:'reopen',entity:'period_locks',entity_id:mp,note:reopenReason.trim()});notify('Period '+mp+' reopened. Any statements previously exported for it are superseded.');setReopenAsk(false);setReopenReason('');_reloadGl()}
        else notify('Reopen failed','error');
      };
      const nowP=_periodOf(new Date().toISOString());
      const sel=closeMonth;const selLock=sel?lockOf(sel):null;const selClosed=selLock&&selLock.status==='closed';
      const selItems=sel&&!selClosed?checklistFor(sel):null;
      const selFails=selItems?selItems.filter(i=>!i.pass):[];
      const canClose=selItems&&selFails.every(i=>(closeOverrides[sel+i.k]||'').trim().length>0);
      return <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card style={{padding:24,background:"#000000",border:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
            <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Period Close</div><div style={{fontSize:11,color:"#737373",marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>Closed periods are locked at the database -- no app, sync or tool can write into them</div></div>
            <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(17,17,17,0.55)",backdropFilter:"blur(12px) saturate(180%)",WebkitBackdropFilter:"blur(12px) saturate(180%)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,overflow:"hidden"}}>
              <button onClick={()=>setCloseYear(y=>y-1)} style={{padding:"7px 12px",border:"none",background:"transparent",color:"#737373",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{'\u2039'}</button>
              <span style={{fontSize:13,fontWeight:700,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",padding:"0 6px"}}>{closeYear}</span>
              <button onClick={()=>setCloseYear(y=>y+1)} style={{padding:"7px 12px",border:"none",background:"transparent",color:"#737373",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{'\u203A'}</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(168px,1fr))",gap:12,marginTop:18}}>
            {months.map((mp,mi)=>{
              const lk=lockOf(mp);const closed=lk&&lk.status==='closed';
              const future=mp>nowP;
              const fails=closed||future?0:checklistFor(mp).filter(i=>!i.pass).length;
              const selNow=closeMonth===mp;
              const accent=closed?"#34d399":future?"#3a3a3a":fails>0?"#fbbf24":"#2dd4bf";
              const restBg=selNow?"rgba(255,255,255,0.045)":"rgba(255,255,255,0.015)";
              const restBorder=selNow?accent+"66":closed?"rgba(52,211,153,0.18)":"rgba(255,255,255,0.06)";
              return <div key={mp} onClick={()=>{setCloseMonth(mp);setCloseAsk(false);setReopenAsk(false)}} style={{padding:"15px 16px 13px 16px",borderRadius:14,cursor:"pointer",position:"relative",overflow:"hidden",background:restBg,backdropFilter:"blur(10px) saturate(150%)",WebkitBackdropFilter:"blur(10px) saturate(150%)",border:"1px solid "+restBorder,opacity:future?0.45:1,transition:"transform 0.22s cubic-bezier(0.34,1.3,0.64,1), border-color 0.22s, background 0.22s, opacity 0.22s",animation:"fadeUp 0.35s both",animationDelay:(mi*0.035)+"s"}} onMouseEnter={e=>{if(!future){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.borderColor=accent+"55"}e.currentTarget.style.opacity=1}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.background=restBg;e.currentTarget.style.borderColor=restBorder;e.currentTarget.style.opacity=future?0.45:1}}>
                <div style={{position:"absolute",top:0,left:14,right:14,height:1,background:"linear-gradient(90deg,transparent,"+accent+(closed||selNow?"66":"26")+",transparent)"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:11,gap:8}}>
                  <span style={{fontSize:13.5,fontWeight:700,color:future?"#737373":"#f5f5f5",fontFamily:"'Satoshi',sans-serif",letterSpacing:0.2}}>{monthName(mp)}</span>
                  <span style={{fontSize:9.5,fontFamily:"'JetBrains Mono',monospace",color:"#525252",flexShrink:0}}>{mp}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap",overflow:"hidden"}}>
                  <span style={{width:7,height:7,borderRadius:4,background:accent,flexShrink:0,boxShadow:closed?"0 0 10px rgba(52,211,153,0.55)":(!future&&fails>0)?"0 0 10px rgba(251,191,36,0.45)":(!future&&fails===0)?"0 0 10px rgba(45,212,191,0.35)":"none",animation:(!future&&!closed&&fails>0)?"pulse 2.4s infinite":"none"}}/>
                  {closed?<span style={{fontSize:11,fontWeight:600,color:"#34d399",fontFamily:"'Satoshi',sans-serif",letterSpacing:0.3}}>Closed{lk.closedBy?<span style={{color:"#527a6a",fontWeight:500}}>{' -- '+String(lk.closedAt||'').slice(5,10)}</span>:null}</span>
                  :future?<span style={{fontSize:11,fontWeight:500,color:"#525252",fontFamily:"'Satoshi',sans-serif",letterSpacing:0.3}}>Future</span>
                  :fails>0?<span style={{fontSize:11,fontWeight:600,color:"#fbbf24",fontFamily:"'Satoshi',sans-serif",letterSpacing:0.3,overflow:"hidden",textOverflow:"ellipsis"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{fails}</span>{' check'+(fails!==1?'s':'')+' failing'}</span>
                  :<span style={{fontSize:11,fontWeight:600,color:"#2dd4bf",fontFamily:"'Satoshi',sans-serif",letterSpacing:0.3}}>Ready to close</span>}
                </div>
              </div>})}
          </div>
        </Card>
        {sel&&<Card style={{padding:24,background:"#000000",border:"1px solid rgba(255,255,255,0.05)",animation:"fadeUp 0.25s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:selClosed?"#34d399":"#2dd4bf",display:"flex"}}><I n="shield" s={14}/></span><span style={{fontSize:11,fontWeight:700,color:selClosed?"#34d399":"#2dd4bf",letterSpacing:3,fontFamily:"'Satoshi',sans-serif"}}>{monthName(sel).toUpperCase()} {sel.slice(0,4)}</span></div>
            {selClosed&&<span style={{fontSize:10,color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>closed by {selLock.closedBy||'--'} {selLock.closedAt?'on '+String(selLock.closedAt).slice(0,10):''}</span>}
          </div>
          {selClosed?<>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:12,background:"rgba(52,211,153,0.04)",border:"1px solid rgba(52,211,153,0.15)",marginBottom:16}}>
              <span style={{fontSize:12.5,color:"#d4d4d4",fontFamily:"'Satoshi',sans-serif"}}>This period is locked. The database rejects every insert, update or delete dated inside it. Corrections belong in a prior-period adjustment dated in an open month.</span>
            </div>
            {Array.isArray(selLock.checklist)&&<div style={{marginBottom:16}}>{selLock.checklist.map(i=><div key={i.k} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 4px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{width:15,height:15,borderRadius:8,background:i.pass?"rgba(52,211,153,0.12)":"rgba(251,191,36,0.12)",border:"1px solid "+(i.pass?"rgba(52,211,153,0.4)":"rgba(251,191,36,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:8,color:i.pass?"#34d399":"#fbbf24"}}>{i.pass?'\u2713':'!'}</span><span style={{fontSize:12,color:"#b8b8b8",flex:1,fontFamily:"'Satoshi',sans-serif"}}>{i.label}</span><span style={{fontSize:10.5,color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>{i.detail}</span></div>)}</div>}
            {selLock.overrides&&<div style={{fontSize:10.5,color:"#fbbf24",marginBottom:16}}>Closed with overrides: {Object.keys(selLock.overrides).join(', ')}</div>}
            {_glIsAdmin&&(!reopenAsk?
              <Btn v="secondary" style={{fontSize:11,color:"#f87171",borderColor:"#f8717130"}} onClick={()=>setReopenAsk(true)}>Reopen Period...</Btn>
              :<div style={{padding:16,borderRadius:12,background:"rgba(248,113,113,0.04)",border:"1px solid rgba(248,113,113,0.2)"}}>
                <div style={{fontSize:12.5,fontWeight:700,color:"#f87171",marginBottom:8,fontFamily:"'Satoshi',sans-serif"}}>Reopening {monthName(sel)} goes in the permanent audit trail and supersedes any statements already exported for it.</div>
                <textarea value={reopenReason} onChange={e=>setReopenReason(e.target.value)} placeholder="Why is this period being reopened? Minimum 20 characters." style={{...inputStyle,width:"100%",minHeight:64,resize:"vertical",fontSize:12,marginBottom:4}}/>
                <div style={{fontSize:9.5,color:reopenReason.trim().length>=20?"#34d399":"#737373",fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}>{reopenReason.trim().length}/20 characters</div>
                <div style={{display:"flex",gap:8}}><Btn v="secondary" style={{fontSize:11}} onClick={()=>{setReopenAsk(false);setReopenReason('')}}>Cancel</Btn><Btn style={{fontSize:11,background:"#f87171",borderColor:"#f87171"}} onClick={()=>doReopen(sel)}>Confirm Reopen</Btn></div>
              </div>)}
            {!_glIsAdmin&&<div style={{fontSize:10.5,color:"#737373"}}>Only an admin can reopen a closed period.</div>}
          </>:<>
            <div style={{fontSize:10.5,color:"#7a7a7a",marginBottom:14,fontFamily:"'Satoshi',sans-serif"}}>Every item must pass, or carry a typed override reason that is stored with the close. Ledger items activate in later phases and pass automatically until then.</div>
            {selItems.map(i=><div key={i.k} style={{padding:"10px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:i.phase2?0.45:1}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{width:16,height:16,borderRadius:9,background:i.pass?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:"1px solid "+(i.pass?"rgba(52,211,153,0.4)":"rgba(248,113,113,0.4)"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:8.5,color:i.pass?"#34d399":"#f87171"}}>{i.pass?'\u2713':'\u2715'}</span>
                <span style={{fontSize:13,color:"#f0f0f0",fontWeight:600,flex:1,fontFamily:"'Satoshi',sans-serif"}}>{i.label}</span>
                <span style={{fontSize:10.5,color:i.pass?"#737373":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{i.detail}</span>
                {i.jump&&<button onClick={i.jump} style={{padding:"3px 10px",borderRadius:6,border:"1px solid rgba(45,212,191,0.3)",background:"rgba(45,212,191,0.06)",color:"#2dd4bf",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Go fix</button>}
              </div>
              {i.recon&&i.acctIds.length>0&&<div style={{marginLeft:28,marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                {i.acctIds.map(id=>{const done=i.reconData[id];return <div key={id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:11.5,color:"#b8b8b8",width:130,fontFamily:"'Satoshi',sans-serif"}}>{acctLabel(id)}</span>
                  {done?<span style={{fontSize:10,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>reconciled at ${done.balance} by {done.by}</span>
                  :<><input type="number" step="0.01" placeholder="Statement ending balance" value={reconDraft[sel+'|'+id]||''} onChange={e=>setReconDraft(d=>({...d,[sel+'|'+id]:e.target.value}))} style={{...inputStyle,width:180,fontSize:11.5,padding:"5px 8px"}}/>
                  <Btn v="secondary" style={{fontSize:10,padding:"4px 10px"}} onClick={()=>saveRecon(sel,id)}>Mark Reconciled</Btn></>}
                </div>})}
              </div>}
              {!i.pass&&i.overridable&&<div style={{marginLeft:28,marginTop:8}}>
                <input value={closeOverrides[sel+i.k]||''} onChange={e=>setCloseOverrides(o=>({...o,[sel+i.k]:e.target.value}))} placeholder="Override reason (recorded with the close)..." style={{...inputStyle,width:"100%",maxWidth:440,fontSize:11.5,borderColor:"rgba(251,191,36,0.3)"}}/>
              </div>}
            </div>)}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18,alignItems:"center"}}>
              {selFails.length>0&&<span style={{fontSize:10.5,color:canClose?"#fbbf24":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{canClose?String(selFails.length)+' item'+(selFails.length!==1?'s':'')+' will close with overrides':String(selFails.length)+' failing item'+(selFails.length!==1?'s':'')+' -- add override reasons to proceed'}</span>}
              {!closeAsk?<Btn style={{fontSize:12}} onClick={()=>{if(!canClose){notify('Every failing item needs a typed override reason before the period can close','error');return}setCloseAsk(true)}}>Close {monthName(sel)}...</Btn>
              :<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"rgba(45,212,191,0.05)",border:"1px solid rgba(45,212,191,0.25)"}}>
                <span style={{fontSize:11.5,color:"#d4d4d4"}}>Lock {monthName(sel)} {sel.slice(0,4)} at the database?</span>
                <Btn v="secondary" style={{fontSize:11}} onClick={()=>setCloseAsk(false)}>Cancel</Btn>
                <Btn style={{fontSize:11}} onClick={()=>doClose(sel,selItems)}>Confirm Close</Btn>
              </div>}
            </div>
          </>}
        </Card>}
      </div>;
    })()}
  </div>;
}

export { FinancialsPage, parseVendorBills, billStatus, billTotal, billPaidTotal, billBalance };
