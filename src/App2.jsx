import React, { useState, useEffect, useRef } from "react";
import { db } from "./supabase.js";
import { useUser, useClerk, SignIn, UserButton, useAuth } from "@clerk/clerk-react";
import{BarChart,Bar as RBar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell}from"recharts";
import { AnimNum, AnimatedNumber, Badge, Bar, Btn, Card, Check, CheckMinus, DEFAULT_SOPS, Dashboard, DocumentsPage, Header, I, fmt, fmtN, getRoles, inputStyle, isSalesRep, pct, shipKey, statusColor } from "./App.jsx";
// ===============================================================
// COMMISSIONS -- Editable Reps + PDF Export
// ===============================================================
function CommissionsPage({jobs,reps,customers,updateRep,addRep,deleteRep,getJobFinancials,getJobItems,_commissionFor,setJobs,db,customSops,addSop,notify,triggerPrint,setPage,onGenerateStatement}){
  const [editingRep,setEditingRep]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [addingRep,setAddingRep]=useState(false);
  const [newRepForm,setNewRepForm]=useState({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate"});


  // Doc statuses: read from jobs[].docStatuses + DOC_STATUSES_GLOBAL SOP record + localStorage fallback.
  // Mirrors DocumentsPage's persistence model so commission status badges stay in sync across pages.
  const allDocStatuses=jobs.reduce((acc,j)=>({...acc,...(j.docStatuses||{})}),{});
  const sopStatusRecord=(customSops||[]).find(s=>s.id==="DOC_STATUSES_GLOBAL");
  const sopStatuses=sopStatusRecord?(()=>{try{return JSON.parse(sopStatusRecord.content)}catch{return {}}})():{};
  const lsFallback=(()=>{try{return JSON.parse(localStorage.getItem("mw_doc_statuses_fallback")||"{}")}catch{return {}}})();
  const docStatuses={...allDocStatuses,...sopStatuses,...lsFallback};
  const stableNum=(prefix,a,b)=>prefix+(a||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(b||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
  const StatusBadge=({docNum})=>{const s=docStatuses[docNum];if(!s)return <Badge label="new" color="#525252"/>;if(s==="drafted")return <Badge label="drafted" color="#fbbf24"/>;if(s==="sent")return <Badge label="sent" color="#34d399"/>;if(s==="approved")return <Badge label="approved" color="#a78bfa"/>;return <Badge label={s} color="#525252"/>};
  const setCommDocStatus=(docNum,status)=>{
    // Write to SOP record (cross-device) and localStorage backup. Same persistence
    // pattern as DocumentsPage so status reads merge correctly across both pages.
    const updated={...sopStatuses,[docNum]:status};
    addSop({id:"DOC_STATUSES_GLOBAL",title:"Document Statuses",cat:"DocStatuses",icon:"file",content:JSON.stringify(updated),custom:true});
    try{const fb=JSON.parse(localStorage.getItem("mw_doc_statuses_fallback")||"{}");fb[docNum]=status;localStorage.setItem("mw_doc_statuses_fallback",JSON.stringify(fb))}catch{}
  };


  const startEdit=rep=>{setEditingRep(rep.id);setEditForm({...rep})};
  const saveEdit=()=>{updateRep(editingRep,{name:editForm.name,email:editForm.email,territory:editForm.territory,commissionRate:parseFloat(editForm.commissionRate)||0,tier:editForm.tier});setEditingRep(null);notify("Sales rep updated -- commissions recalculated everywhere")};
  const handleAddRep=()=>{if(!newRepForm.name)return;addRep({...newRepForm,commissionRate:parseFloat(newRepForm.commissionRate)||0.05});setAddingRep(false);setNewRepForm({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate"});notify("Sales rep added")};


  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Commission Engine" sub="Editable reps, customizable rates -- auto-calculated on every job" action={<Btn onClick={()=>setAddingRep(true)}><I n="plus" s={14}/> Add Sales Rep</Btn>}/>


    {addingRep&&<Card style={{marginBottom:20,border:"1px solid #05966930"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#34d399"}}>Add New Sales Rep</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:12}}>{[["name","Name"],["email","Email"],["territory","Territory"],["tier","Tier"]].map(([k,l])=><div key={k}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>{l}</label>{k==="tier"?<select value={newRepForm[k]} onChange={e=>setNewRepForm({...newRepForm,[k]:e.target.value})} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select>:<input value={newRepForm[k]} onChange={e=>setNewRepForm({...newRepForm,[k]:e.target.value})} style={inputStyle}/>}</div>)}<div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Commission Rate (%)</label><input type="number" step="0.5" value={(newRepForm.commissionRate*100)} onChange={e=>setNewRepForm({...newRepForm,commissionRate:parseFloat(e.target.value)/100||0})} style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={handleAddRep}>Add Rep</Btn><Btn v="secondary" onClick={()=>setAddingRep(false)}>Cancel</Btn></div></Card>}


    <div>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)&&r.commissionRate>0).map(rep=>{
      const rj=jobs.filter(j=>j.salesRep===rep.id);
      const totalRev=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
      const totalProfit=rj.reduce((s,j)=>{const f=getJobFinancials(j.id);return s+Math.max(0,(f.totalRevenue||0)-(f.totalCost||0))},0);
      const comm=rj.reduce((s,j)=>s+_commissionFor(j.id,rep.commissionRate||0),0);
      const paidRev=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
      const paidComm=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+_commissionFor(j.id,rep.commissionRate||0),0);
      const unpaidComm=comm-paidComm;
      const docNum=stableNum('COMM-',rep.id,'stmt');
      const isEd=editingRep===rep.id;
      return <Card key={rep.id} style={{marginBottom:10,padding:14,border:isEd?"1px solid #2dd4bf44":(unpaidComm>0?"1px solid #d9770625":"1px solid #222222")}}>
        {isEd?<div style={{overflow:"hidden"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#2dd4bf"}}>Edit Sales Rep</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:11,color:"#9a9a9a",display:"block",marginBottom:3}}>Name</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#9a9a9a",display:"block",marginBottom:3}}>Email</label><input value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#9a9a9a",display:"block",marginBottom:3}}>Territory</label><input value={editForm.territory} onChange={e=>setEditForm({...editForm,territory:e.target.value})} style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#9a9a9a",display:"block",marginBottom:3}}>Rate (%)</label><input type="number" step="0.5" value={(editForm.commissionRate*100).toFixed(1)} onChange={e=>setEditForm({...editForm,commissionRate:parseFloat(e.target.value)/100||0})} style={inputStyle}/></div>
            <div><label style={{fontSize:11,color:"#9a9a9a",display:"block",marginBottom:3}}>Tier</label><select value={editForm.tier} onChange={e=>setEditForm({...editForm,tier:e.target.value})} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Btn style={{fontSize:12,padding:"6px 12px"}} onClick={saveEdit}>Save</Btn>
            <Btn v="secondary" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>setEditingRep(null)}>Cancel</Btn>
            <Btn v="danger" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>{deleteRep(rep.id);setEditingRep(null);notify("Sales rep removed")}}>Delete</Btn>
          </div>
        </div>:<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontSize:15,fontWeight:700,color:"#e5e5e5"}}>{rep.name}</span>
              <Badge label={rep.tier} color="#2dd4bf"/>
              <Badge label={pct(rep.commissionRate*100)} color="#34d399"/>
              <StatusBadge docNum={docNum}/>
              <button onClick={()=>startEdit(rep)} style={{background:"none",border:"none",cursor:"pointer",color:"#a3a3a3",padding:2,marginLeft:"auto"}} title="Edit rep"><I n="edit" s={14}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:6,fontSize:12}}>
              <div style={{padding:"6px 10px",background:"#111111",borderRadius:6,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3"}}>Jobs</div><div style={{fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{rj.length}</div></div>
              <div style={{padding:"6px 10px",background:"#111111",borderRadius:6,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3"}}>Pipeline</div><div style={{fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalRev)}</div></div>
              <div style={{padding:"6px 10px",background:"#05966910",borderRadius:6,textAlign:"center"}}><div style={{fontSize:12,color:"#34d399"}}>Earned</div><div style={{fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(paidComm)}</div></div>
              <div style={{padding:"6px 10px",background:"#d9770610",borderRadius:6,textAlign:"center"}}><div style={{fontSize:12,color:"#fbbf24"}}>Pending</div><div style={{fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(unpaidComm)}</div></div>
              <div style={{padding:"6px 10px",background:"#2dd4bf10",borderRadius:6,textAlign:"center"}}><div style={{fontSize:12,color:"#2dd4bf"}}>Total Comm.</div><div style={{fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(comm)}</div></div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginLeft:0,marginTop:8,minWidth:180}}>
            <Btn onClick={()=>{
              const items=rj.map(j=>{const f=getJobFinancials(j.id);const isPaid=j.paymentStatus==="paid";return{description:j.name+' -- '+(customers.find(c=>c.id===j.customer)?.name||'')+' -- '+(isPaid?'PAID':'PENDING'),displayQty:1,displayPrice:_commissionFor(j.id,rep.commissionRate||0)}});
              if(onGenerateStatement){onGenerateStatement({type:"commission",data:{rep,items,total:comm,docNum},job:{id:'ALL',name:rep.name+' Commission Statement',notes:'Period: '+new Date().toLocaleDateString()+'\nEarned (paid jobs): '+fmt(paidComm)+'\nPending (unpaid jobs): '+fmt(unpaidComm)+'\nTotal commission: '+fmt(comm)}});setPage("documents")}
            }}><I n="file" s={14}/> Generate Statement</Btn>
            {rj.length>0&&<div style={{display:"flex",gap:4}}>{["drafted","sent","approved"].map(s=><button key={s} onClick={()=>setCommDocStatus(docNum,s)} style={{padding:"4px 10px",borderRadius:6,flex:1,textAlign:"center",border:"1px solid "+(docStatuses[docNum]===s?"#2dd4bf":"#444"),background:docStatuses[docNum]===s?"#2dd4bf15":"transparent",color:docStatuses[docNum]===s?"#2dd4bf":"#c4c4c4",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>{s}</button>)}</div>}
          </div>
        </div>
        {rj.length>0&&<div style={{marginTop:10}}><Bar value={paidRev} max={totalRev||1} color="#34d399" height={3}/></div>}
        {rj.length>0&&<div style={{marginTop:8,fontSize:12,color:"#a3a3a3"}}><strong>Jobs:</strong> {rj.map(j=>{const isPaid=j.paymentStatus==="paid";return <span key={j.id} style={{marginRight:8}}><span style={{color:isPaid?"#34d399":"#fbbf24"}}>{isPaid?"*":"o"}</span> {j.name} ({fmt(_commissionFor(j.id,rep.commissionRate||0))})</span>})}</div>}
        </>}
      </Card>;
    })}
    {reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)&&r.commissionRate===0&&jobs.some(j=>j.salesRep===r.id)).length>0&&<Card style={{marginTop:8,opacity:0.6}}><div style={{fontSize:13,color:"#a3a3a3"}}>Team members without commission rates: {reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)&&r.commissionRate===0).map(r=>r.name).join(', ')}</div></Card>}
    </div>
  </div>;
}


// ===============================================================
// SALES PORTAL
// ===============================================================
function SalesPortalPage({jobs,reps,customers,lineItems,getJobFinancials,getJobItems,_commissionFor,vendors,setPage,setSelectedJob,updateJob,notify,addSop,deleteSop,customSops,triggerPrint,jobNum,userRole,userRepId}){
  // Sales-role users only ever see their own tab. Default activeRep to their
  // rep id so they land directly on their own portal instead of the global Overview.
  const isSalesRole=userRole==="sales"&&!!userRepId;
  // Team visibility is OWNER-ONLY (admin role: Maureen, Dave, Master). Office and
  // sales users are pinned to their own rep view and never see the Overview, other
  // reps' tabs, or the Team directory.
  const canSeeTeam=userRole==="admin";
  const [activeRep,setActiveRep]=useState(userRole==="admin"?"overview":(userRepId||"overview"));
  const [crmTab,setCrmTab]=useState("pipeline");
  const [noteText,setNoteText]=useState("");
  const [taskText,setTaskText]=useState("");
  const [taskDue,setTaskDue]=useState("");
  const [repDetail,setRepDetail]=useState(null);


  // Sales-role users can never enter Overview mode -- coerce 'overview' to their own rep id
  // in case state somehow gets out of sync (e.g. stale state, manual intervention).
  const effectiveActiveRep=canSeeTeam?activeRep:(userRepId||activeRep);
  const isOverview=effectiveActiveRep==="overview";
  const rep=reps.find(r=>r.id===effectiveActiveRep)||reps.filter(isSalesRep)[0]||reps[0];
  const rj=isOverview?jobs:jobs.filter(j=>j.salesRep===effectiveActiveRep);
  const totalRev=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const paidRev=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const totalCost=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
  const avgMargin=totalRev>0?(1-totalCost/totalRev)*100:0;
  const quotingJobs=rj.filter(j=>j.phase==="Quoting");
  const activeJobs=rj.filter(j=>j.phase==="In Progress");
  const invoicedJobs=rj.filter(j=>j.phase==="Invoiced");
  const pendingItems=lineItems.filter(li=>rj.some(j=>j.id===li.jobId)&&li.qtyReceived<li.qtyOrdered);
  const commRate=isOverview?0:rep.commissionRate;
  const wonRev=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const lostJobs=0;
  const winRate=rj.length>0?Math.round((rj.filter(j=>j.phase!=="Quoting").length/rj.length)*100):0;


  // CRM: Activities from audit trails
  const allActivities=rj.flatMap(j=>(j.auditTrail||[]).map(a=>({...a,jobName:(jobNum?.(j.id)||"")+" "+j.name,jobId:j.id}))).sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,30);
  // CRM: Tasks from job notes (lines starting with "TASK:")
  const allTasks=rj.flatMap(j=>{const notes=(j.orderNotes||"").split("\n").filter(l=>l.startsWith("TASK:")).map(l=>{const assignMatch=l.match(/\[assign:([^\]]+)\]/);const dueMatch=l.match(/\[due:([^\]]+)\]/);return{text:l.replace("TASK:","").trim(),jobId:j.id,jobName:(jobNum?.(j.id)||"")+" "+j.name,done:l.includes("[DONE]"),inProgress:l.includes("[IP]"),assignees:assignMatch?assignMatch[1].split(","):[],due:dueMatch?dueMatch[1]:""}});return notes});
  // CRM: Notes from job notes (lines starting with "NOTE:")
  const allNotes=rj.flatMap(j=>{const notes=(j.orderNotes||"").split("\n").filter(l=>l.startsWith("NOTE:")).map(l=>({text:l.replace("NOTE:","").trim(),jobId:j.id,jobName:(jobNum?.(j.id)||"")+" "+j.name,time:l.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]||""}));return notes}).reverse().slice(0,20);


  const addNote=(jobId)=>{if(!noteText.trim())return;const job=jobs.find(j=>j.id===jobId);if(!job)return;const stamp=new Date().toLocaleDateString();const line="NOTE: "+noteText.trim()+" ("+stamp+")";updateJob(jobId,{orderNotes:(job.orderNotes||"")+"\n"+line});setNoteText("");notify("Note added")};
  const [taskAssignees,setTaskAssignees]=useState([]);
  const [taskStatus,setTaskStatus]=useState("To Do");
  const [showAddTask,setShowAddTask]=useState(false);
  const [editingNoteId,setEditingNoteId]=useState(null);
  const [editNoteTitle,setEditNoteTitle]=useState("");
  const [editNoteContent,setEditNoteContent]=useState("");
  const addTask=(jobId,status)=>{if(!taskText.trim())return;const job=jobs.find(j=>j.id===jobId);if(!job)return;const assignStr=taskAssignees.length>0?" [assign:"+taskAssignees.join(",")+"]":"";const statusTag=status==="In Progress"?" [IP]":status==="Done"?" [DONE]":"";const line="TASK: "+taskText.trim()+(taskDue?" [due:"+taskDue+"]":"")+assignStr+statusTag;updateJob(jobId,{orderNotes:(job.orderNotes||"")+"\n"+line});setTaskText("");setTaskDue("");setTaskAssignees([]);setTaskStatus("To Do");setShowAddTask(false);notify("Task added")};


  const kpi=(label,value,color)=><div style={{textAlign:"center",padding:"14px 10px",background:"#0a0a0a",borderRadius:10,flex:"1 1 100px"}}><div style={{fontSize:22,fontWeight:800,color:color||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-1}}><AnimNum value={String(value)}/></div><div style={{fontSize:11,color:"#9a9a9a",marginTop:2}}>{label}</div></div>;


  if(!canSeeTeam&&!userRepId){return <div style={{animation:"fadeUp 0.4s"}}><Header title="Sales Portal" sub="Your pipeline, CRM, and activity"/><Card><div style={{fontSize:13,color:"#9a9a9a",padding:"8px 0"}}>No sales profile is linked to your account. Ask an administrator to assign one in Users & Permissions.</div></Card></div>;}
  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Sales Portal" sub={!canSeeTeam?"Your pipeline, CRM, and activity":"Pipeline management, CRM, and team performance"}/>
    {/* Rep selector. Sales-role users see only their own tab. */}
    <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {canSeeTeam&&<button onClick={()=>setActiveRep("overview")} style={{padding:"8px 16px",borderRadius:8,cursor:"pointer",background:isOverview?"#2dd4bf":"#111",color:isOverview?"#000":"#737373",fontSize:13,fontWeight:isOverview?600:400,fontFamily:"inherit",border:isOverview?"none":"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap",flexShrink:0}}>Overview</button>}
      {reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)&&(canSeeTeam||r.id===userRepId)).map(r=><button key={r.id} onClick={()=>setActiveRep(r.id)} style={{padding:"8px 16px",borderRadius:8,cursor:"pointer",background:activeRep===r.id?"#2dd4bf":"#111",color:activeRep===r.id?"#000":"#737373",fontSize:13,fontWeight:activeRep===r.id?600:400,fontFamily:"inherit",border:activeRep===r.id?"none":"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap",flexShrink:0}}>{r.name}</button>)}
    </div>


    {/* Hero stats */}
    <Card style={{marginBottom:20,background:"linear-gradient(135deg,rgba(45,212,191,0.03),rgba(167,139,250,0.03))",border:"1px solid rgba(45,212,191,0.08)"}}>
      <div style={{marginBottom:16}}><div style={{fontSize:22,fontWeight:800,color:"#f0f0f0"}}>{isOverview?"Midwest Educational Furnishings":rep.name}</div><div style={{fontSize:13,color:"#9a9a9a"}}>{isOverview?"All team -- All territories":rep.territory+" -- "+rep.tier+(commRate>0?" -- "+pct(commRate*100)+" rate":"")}</div></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {kpi("Pipeline",fmt(totalRev),"#2dd4bf")}
        {kpi("Won Revenue",fmt(wonRev),"#34d399")}
        {kpi("Avg Margin",pct(avgMargin),avgMargin>=30?"#34d399":"#fbbf24")}
        {kpi("Active",activeJobs.length,"#a78bfa")}
        {kpi("Quoting",quotingJobs.length,"#8b5cf6")}
        {kpi("Win Rate",winRate+"%",winRate>=70?"#34d399":"#fbbf24")}
        {!isOverview&&commRate>0&&kpi("Commission",fmt(rj.reduce((s,j)=>s+_commissionFor(j.id,commRate),0)),"#fbbf24")}
      </div>
    </Card>


    {/* CRM Tabs. Sales-role users do not see the Team tab -- they only see their own work. */}
    <div className="doc-tabs" style={{display:"flex",gap:0,marginBottom:20,background:"#111",borderRadius:10,padding:3,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {[["pipeline","Pipeline"],["activity","Activity Feed"],["tasks","Tasks"],["notes","Notes"],["team","Team"]].filter(([id])=>canSeeTeam||id!=="team").map(([id,label])=>
        <button key={id} onClick={()=>setCrmTab(id)} style={{padding:"10px 18px",borderRadius:8,border:"none",cursor:"pointer",background:crmTab===id?"#2dd4bf":"transparent",color:crmTab===id?"#000":"#737373",fontSize:13,fontWeight:crmTab===id?600:400,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>{label}</button>
      )}
    </div>


    {/* PIPELINE */}
    {crmTab==="pipeline"&&<>
      <div className="resp-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
        <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Pipeline by Phase</div>
          {["Quoting","In Progress","Invoiced","Complete"].map(phase=>{const pj=rj.filter(j=>j.phase===phase);const pRev=pj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const maxRev=Math.max(...["Quoting","In Progress","Invoiced","Complete"].map(p=>rj.filter(j=>j.phase===p).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)),1);return <div key={phase} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#c4c4c4"}}>{phase} ({pj.length})</span><span style={{fontSize:13,fontWeight:700,color:statusColor(phase),fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={fmt(pRev)}/></span></div><div style={{height:6,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(maxRev>0?(pRev/maxRev*100):0)+"%",background:statusColor(phase),borderRadius:3,transition:"width 0.8s ease-out"}}/></div></div>})}
        </Card>
        <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Pending Deliveries ({pendingItems.length})</div>
          {pendingItems.length===0?<div style={{fontSize:13,color:"#34d399",padding:"12px 0"}}>All deliveries complete</div>:pendingItems.slice(0,6).map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:"#c4c4c4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.description}</div><div style={{fontSize:11,color:"#737373"}}>{jobs.find(j=>j.id===item.jobId)?.name}</div></div><span style={{fontSize:12,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{fmtN(item.qtyOrdered-item.qtyReceived)} pending</span></div>)}
        </Card>
      </div>
      {/* Job cards */}
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>{isOverview?"All Jobs":"Jobs for "+rep.name} ({rj.length})</div>
        {rj.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{const f=getJobFinancials(j.id);const cust=customers.find(c=>c.id===j.customer);return <div key={j.id} onClick={()=>{setSelectedJob(j.id);setPage("jobs")}} className="hover-lift" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"#0a0a0a",borderRadius:10,marginBottom:8,cursor:"pointer",border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s",flexWrap:"wrap",gap:8}}>
          <div style={{flex:1,minWidth:200}}><div style={{fontSize:14,fontWeight:600,color:"#f0f0f0",marginBottom:4}}>{j.name}</div><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><Badge label={j.phase} color={statusColor(j.phase)}/><Badge label={j.paymentStatus} color={statusColor(j.paymentStatus)}/><span style={{fontSize:12,color:"#9a9a9a"}}>{cust?.name}</span></div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</div><div style={{fontSize:11,color:"#737373"}}>{f.margin.toFixed(0)}% margin</div></div>
        </div>})}
      </Card>
    </>}


    {/* ACTIVITY FEED */}
    {crmTab==="activity"&&<Card>
      <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Activity Feed</div>
      {allActivities.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No activity recorded yet. Changes to jobs will appear here automatically.</div>:
      allActivities.map((a,i)=><div key={i} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:a.type==="edit"?"#2dd4bf":"#a78bfa",marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:"#e5e5e5",lineHeight:1.5}}>{a.fields?a.fields.map(f=>f.field+" changed to \""+String(f.to)+"\"").join(", "):a.type}</div>
          <div style={{fontSize:12,color:"#9a9a9a",marginTop:2}}>{a.jobName} -- {new Date(a.time).toLocaleDateString()} {new Date(a.time).toLocaleTimeString()}</div>{a.user&&<div style={{fontSize:11,color:"#2dd4bf",marginTop:2}}>{a.user}</div>}
        </div>
      </div>)}
    </Card>}


    {/* TASKS */}
    {crmTab==="tasks"&&<TasksKanban jobs={rj} allJobs={jobs} reps={reps} updateJob={updateJob} notify={notify} inputStyle={inputStyle} customSops={customSops} addSop={addSop} deleteSop={deleteSop}/>}


    {/* NOTES */}
    {crmTab==="notes"&&<NotesView customSops={customSops} addSop={addSop} deleteSop={deleteSop} jobs={rj} reps={reps} notify={notify} triggerPrint={triggerPrint}/>}


    {/* TEAM. Hidden entirely from sales-role users -- defense in depth even though
        the Team tab button is filtered out for them above. */}
    {crmTab==="team"&&!repDetail&&canSeeTeam&&<Card>
      <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Team Directory</div>
      {reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=>{const rJobs=jobs.filter(j=>j.salesRep===r.id);const rv=rJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const pRev=rJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const comm=rJobs.reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);const costTotal=rJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);const margin=rv>0?(1-costTotal/rv)*100:0;return <div key={r.id} onClick={()=>setRepDetail(r)} className="hover-lift" style={{display:"flex",alignItems:"center",gap:14,padding:"16px",background:"#0a0a0a",borderRadius:12,marginBottom:10,cursor:"pointer",border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s"}}>
        <div style={{width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,rgba(45,212,191,0.12),rgba(167,139,250,0.12))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#2dd4bf",flexShrink:0}}>{r.name.split(" ").map(n=>n[0]).join("")}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:600,color:"#f0f0f0"}}>{r.name}</div><div style={{fontSize:12,color:"#9a9a9a"}}>{r.territory} -- {r.tier} -- {rJobs.length} jobs</div></div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",flexShrink:0}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(rv)}</div><div style={{fontSize:10,color:"#737373"}}>Pipeline</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:margin>=30?"#34d399":"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{margin.toFixed(0)}%</div><div style={{fontSize:10,color:"#737373"}}>Margin</div></div>
          {r.commissionRate>0&&<div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(comm)}</div><div style={{fontSize:10,color:"#737373"}}>Comm</div></div>}
        </div>
      </div>})}
    </Card>}


    {/* REP PROFILE PAGE. Hidden from sales-role users. */}
    {crmTab==="team"&&repDetail&&canSeeTeam&&(()=>{
      const r=repDetail;const rJobs=jobs.filter(j=>j.salesRep===r.id);
      const rv=rJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
      const costTotal=rJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
      const margin=rv>0?(1-costTotal/rv)*100:0;
      const pRev=rJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
      const comm=rJobs.reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);const earnedComm=rJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);
      const custBreak={};rJobs.forEach(j=>{const c=customers.find(c=>c.id===j.customer);if(c)custBreak[c.name]=(custBreak[c.name]||0)+getJobFinancials(j.id).totalRevenue});
      const topCusts=Object.entries(custBreak).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const activities=rJobs.flatMap(j=>(j.auditTrail||[]).map(a=>({...a,jobName:(jobNum?.(j.id)||"")+" "+j.name}))).sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,15);
      return <>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span onClick={()=>setRepDetail(null)} style={{color:"#9a9a9a",cursor:"pointer",fontSize:14}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#9a9a9a"}>Team</span>
          <span style={{color:"#525252"}}>/</span>
          <span style={{color:"#f0f0f0",fontWeight:600,fontSize:14}}>{r.name}</span>
        </div>
        <Card style={{marginBottom:20,background:"linear-gradient(135deg,rgba(45,212,191,0.04),rgba(167,139,250,0.04))",border:"1px solid rgba(45,212,191,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,rgba(45,212,191,0.15),rgba(167,139,250,0.15))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#2dd4bf",flexShrink:0}}>{r.name.split(" ").map(n=>n[0]).join("")}</div>
            <div style={{flex:1}}><div style={{fontSize:22,fontWeight:800,color:"#f0f0f0"}}>{r.name}</div><div style={{fontSize:13,color:"#9a9a9a"}}>{r.territory} -- {r.tier} -- {r.email}</div><div style={{fontSize:12,color:"#737373"}}>Commission rate: {(r.commissionRate*100).toFixed(1)}%</div></div>
          </div>
        </Card>
        <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
          {kpi("Pipeline",fmt(rv),"#2dd4bf")}
          {kpi("Won",fmt(pRev),"#34d399")}
          {kpi("Margin",margin.toFixed(1)+"%",margin>=30?"#34d399":"#fbbf24")}
          {kpi("Jobs",rJobs.length,"#a78bfa")}
          {r.commissionRate>0&&kpi("Total Comm",fmt(comm),"#fbbf24")}
          {r.commissionRate>0&&kpi("Earned",fmt(earnedComm),"#34d399")}
        </div>
        <div className="resp-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
          <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Jobs ({rJobs.length})</div>
            {rJobs.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{const f=getJobFinancials(j.id);return <div key={j.id} onClick={()=>{setSelectedJob(j.id);setPage("jobs")}} style={{padding:"12px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:8,cursor:"pointer",border:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:"#f0f0f0"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:10,marginRight:5}}>{jobNum?.(j.id)}</span>{j.name}</span><span style={{fontSize:13,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span></div>
              <div style={{display:"flex",gap:6}}><Badge label={j.phase} color={statusColor(j.phase)}/><Badge label={j.paymentStatus} color={statusColor(j.paymentStatus)}/></div>
            </div>})}
          </Card>
          <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Top Customers</div>
            {topCusts.length===0?<div style={{fontSize:13,color:"#737373"}}>No customer data yet.</div>:topCusts.map(([name,rev])=>{const mx=topCusts[0][1]||1;return <div key={name} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#c4c4c4"}}>{name}</span><span style={{fontSize:13,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(rev)}</span></div>
              <div style={{height:4,background:"rgba(255,255,255,0.04)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(rev/mx*100)+"%",background:"linear-gradient(90deg,#a78bfa,#2dd4bf)",borderRadius:2}}/></div>
            </div>})}
          </Card>
        </div>
        {activities.length>0&&<Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Recent Activity</div>
          {activities.map((a,i)=><div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#2dd4bf",marginTop:4,flexShrink:0}}/>
            <div><div style={{fontSize:12,color:"#c4c4c4"}}>{a.fields?a.fields.map(f=>f.field+" updated").join(", "):a.type}</div><div style={{fontSize:11,color:"#737373"}}>{a.jobName} -- {new Date(a.time).toLocaleDateString()}{a.user?" - "+a.user:""}</div></div>
          </div>)}
        </Card>}
      </>
    })()}


    </div>;
}


// ===============================================================
// MIDWEST BRAIN
// ===============================================================


// ===============================================================
// CUSTOMER 360 - Full Customer Profile
// ===============================================================
function Customer360Page({jobs,lineItems,vendors,customers,reps,getJobFinancials,getJobItems,setPage,setSelectedJob,notify,updateCustomer,jobNum}){
  const custId=window._viewCustId||customers[0]?.id;
  const cust=customers.find(c=>c.id===custId);
  if(!cust) return <div style={{animation:"fadeUp 0.4s"}}><Header title="Customer Profile" sub="Select a customer from the Directory"/><Card style={{textAlign:"center",padding:40}}><div style={{color:"#737373",fontSize:14}}>No customer selected. Go to Directory and click a customer name.</div></Card></div>;


  const custJobs=jobs.filter(j=>j.customer===custId);
  const totalSpend=custJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const totalCost=custJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
  const avgMargin=totalSpend>0?(1-totalCost/totalSpend)*100:0;
  const avgJobSize=custJobs.length>0?totalSpend/custJobs.length:0;
  const paidJobs=custJobs.filter(j=>j.paymentStatus==="paid");
  const paymentScore=custJobs.length>0?Math.round(paidJobs.length/Math.max(custJobs.filter(j=>j.phase!=="Quoting").length,1)*100):0;
  const totalItems=custJobs.reduce((s,j)=>s+getJobItems(j.id).length,0);
  const totalOrdered=custJobs.reduce((s,j)=>s+getJobItems(j.id).reduce((a,i)=>a+i.qtyOrdered,0),0);
  const totalReceived=custJobs.reduce((s,j)=>s+getJobItems(j.id).reduce((a,i)=>a+i.qtyReceived,0),0);
  const vendorSpend={};
  custJobs.forEach(j=>{getJobItems(j.id).forEach(i=>{const v=vendors.find(v=>v.id===i.vendor);if(v){vendorSpend[v.name]=(vendorSpend[v.name]||0)+i.unitCost*i.qtyOrdered}})});
  const topVendors=Object.entries(vendorSpend).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const allActivities=custJobs.flatMap(j=>(j.auditTrail||[]).map(a=>({...a,jobName:(jobNum?.(j.id)||"")+" "+j.name,jobId:j.id}))).sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,20);
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({...cust});


  const kpiStyle={textAlign:"center",padding:"18px 14px",background:"#0a0a0a",borderRadius:12,border:"1px solid rgba(255,255,255,0.04)"};
  const kpiVal=(v,c)=>({fontSize:28,fontWeight:800,color:c||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-1,lineHeight:1.1,marginBottom:4});
  const kpiLabel={fontSize:12,color:"#9a9a9a",fontWeight:500,letterSpacing:0.5};


  return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
      <span onClick={()=>setPage("directory")} style={{color:"#9a9a9a",cursor:"pointer",fontSize:14,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#9a9a9a"}>Directory</span>
      <span style={{color:"#525252",fontSize:14}}>/</span>
      <span style={{color:"#f0f0f0",fontSize:14,fontWeight:600}}>{cust.name}</span>
    </div>


    <Card style={{marginBottom:28,background:"linear-gradient(135deg,rgba(45,212,191,0.04),rgba(167,139,250,0.04))",border:"1px solid rgba(45,212,191,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:"#f0f0f0",marginBottom:8,letterSpacing:-0.5}}>{cust.name}</div>
          <div style={{fontSize:14,color:"#c4c4c4",marginBottom:4}}>{cust.contact}{cust.email?" | "+cust.email:""}{cust.phone?" | "+cust.phone:""}</div>
          <div style={{fontSize:13,color:"#9a9a9a"}}>{cust.type}{cust.address?" | "+cust.address:""}</div>
        </div>
        <Btn v="secondary" onClick={()=>{setEditing(!editing);setEditForm({...cust})}}><I n="edit" s={14}/> Edit</Btn>
      </div>
    </Card>


    {editing&&<Card style={{marginBottom:20,border:"1px solid #2dd4bf30"}}><div style={{fontSize:15,fontWeight:700,marginBottom:14,color:"#2dd4bf"}}>Edit Customer</div>
      <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Name</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Contact</label><input value={editForm.contact||""} onChange={e=>setEditForm({...editForm,contact:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Email</label><input value={editForm.email||""} onChange={e=>setEditForm({...editForm,email:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Phone</label><input value={editForm.phone||""} onChange={e=>setEditForm({...editForm,phone:e.target.value})} style={inputStyle}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Type</label><select value={editForm.type} onChange={e=>setEditForm({...editForm,type:e.target.value})} style={inputStyle}><option>K-12 District</option><option>University</option><option>Government</option><option>Private</option><option>Non-Profit</option></select></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Address</label><input value={editForm.address||""} onChange={e=>setEditForm({...editForm,address:e.target.value})} style={inputStyle}/></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={()=>{updateCustomer(custId,editForm);setEditing(false);notify("Customer updated")}}>Save</Btn><Btn v="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div>
    </Card>}


    <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14,marginBottom:28}}>
      <div style={kpiStyle}><div style={kpiVal(0,"#2dd4bf")}>{fmt(totalSpend)}</div><div style={kpiLabel}>Lifetime Spend</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#a78bfa")}>{custJobs.length}</div><div style={kpiLabel}>Total Jobs</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#34d399")}>{fmt(avgJobSize)}</div><div style={kpiLabel}>Avg Job Size</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,avgMargin>=30?"#34d399":avgMargin>=20?"#fbbf24":"#f87171")}>{avgMargin.toFixed(1)}%</div><div style={kpiLabel}>Avg Margin</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,paymentScore>=80?"#34d399":paymentScore>=50?"#fbbf24":"#f87171")}>{paymentScore}%</div><div style={{...kpiLabel}}>{paidJobs.length} of {custJobs.filter(j=>j.phase!=="Quoting").length} paid</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#e5e5e5")}>{totalItems}</div><div style={kpiLabel}>Line Items</div></div>
    </div>


    <div className="resp-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:28}}>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Jobs ({custJobs.length})</div>
        {custJobs.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No jobs yet for this customer.</div>:
        custJobs.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{
          const f=getJobFinancials(j.id);
          return <div key={j.id} onClick={()=>{setSelectedJob(j.id);setPage("jobs")}} className="hover-lift" style={{padding:"14px 16px",background:"#0a0a0a",borderRadius:10,cursor:"pointer",marginBottom:10,border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:11,marginRight:6}}>{jobNum(j.id)}</span>{j.name}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Badge label={j.phase} color={statusColor(j.phase)}/>
              <Badge label={j.paymentStatus} color={statusColor(j.paymentStatus)}/>
              <span style={{fontSize:12,color:"#9a9a9a",marginLeft:"auto"}}>{j.createdDate}</span>
            </div>
          </div>
        })}
      </Card>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Customer Spend Breakdown</div>
        {topVendors.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No vendor data yet.</div>:
        topVendors.map(([name,spend])=>{
          const max=topVendors[0][1]||1;
          return <div key={name} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,color:"#c4c4c4"}}>{name}</span>
              <span style={{fontSize:13,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(spend)}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:(spend/max*100)+"%",background:"linear-gradient(90deg,#a78bfa,#2dd4bf)",borderRadius:3}}/>
            </div>
          </div>
        })}
      </Card>
    </div>


    {totalOrdered>0&&<Card style={{marginBottom:28}}>
      <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:16}}>Delivery Progress</div>
      <div className="resp-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:20,textAlign:"center"}}>
        <div><div style={{fontSize:32,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{totalOrdered>0?Math.round(totalReceived/totalOrdered*100):0}%</div><div style={{fontSize:13,color:"#9a9a9a"}}>Received</div></div>
        <div><div style={{fontSize:32,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{(totalOrdered-totalReceived).toLocaleString()}</div><div style={{fontSize:13,color:"#9a9a9a"}}>Pending</div></div>
        <div><div style={{fontSize:32,fontWeight:800,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{totalOrdered.toLocaleString()}</div><div style={{fontSize:13,color:"#9a9a9a"}}>Total Units</div></div>
      </div>
      <div style={{height:10,background:"rgba(255,255,255,0.04)",borderRadius:5,overflow:"hidden"}}>
        <div style={{height:"100%",width:(totalReceived/totalOrdered*100)+"%",background:"linear-gradient(90deg,#2dd4bf,#34d399)",borderRadius:5,transition:"width 1.5s ease"}}/>
      </div>
    </Card>}


    <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Activity Timeline</div>
      {allActivities.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No activity recorded yet. Changes to jobs will appear here.</div>:
      allActivities.map((a,i)=><div key={i} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:a.type==="edit"?"#2dd4bf":"#a78bfa",marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:"#e5e5e5",lineHeight:1.5}}>{a.fields?a.fields.map(f=>f.field+" changed from \""+String(f.from||"empty")+"\" to \""+String(f.to)+"\"").join(", "):a.type}</div>
          <div style={{fontSize:12,color:"#9a9a9a",marginTop:2}}>{a.jobName} | {new Date(a.time).toLocaleDateString()} {new Date(a.time).toLocaleTimeString()}</div>{a.user&&<div style={{fontSize:11,color:"#2dd4bf",marginTop:2}}>{a.user}</div>}
        </div>
      </div>)}
    </Card>
  </div>;
}




// ===============================================================
// VENDOR 360 -- Full profile page mirroring Customer360Page
// ===============================================================
function Vendor360Page({jobs,lineItems,vendors,customers,reps,getJobFinancials,getJobItems,setPage,setSelectedJob,notify,updateVendor,jobNum}){
  const vendorId=window._viewVendorId||vendors[0]?.id;
  const vend=vendors.find(v=>v.id===vendorId);
  if(!vend) return <div style={{animation:"fadeUp 0.4s"}}><Header title="Vendor Profile" sub="Select a vendor from the Directory"/><Card style={{textAlign:"center",padding:40}}><div style={{color:"#737373",fontSize:14}}>No vendor selected. Go to Directory and click a vendor name.</div></Card></div>;


  // Spend = OUR cost spent with this vendor (unitCost * qtyOrdered).
  // Revenue = what WE charged customers for this vendor's items (unitPrice * qtyOrdered).
  // Margin = (revenue - spend) / revenue.
  const vItems=lineItems.filter(i=>i.vendor===vendorId);
  const jobIdSet=new Set(vItems.map(i=>i.jobId));
  const vJobs=jobs.filter(j=>jobIdSet.has(j.id));
  const totalSpend=vItems.reduce((s,i)=>s+(i.unitCost||0)*(i.qtyOrdered||0),0);
  const totalRevenue=vItems.reduce((s,i)=>s+(i.unitPrice||0)*(i.qtyOrdered||0),0);
  const avgMargin=totalRevenue>0?(1-totalSpend/totalRevenue)*100:0;
  const avgJobSize=vJobs.length>0?totalSpend/vJobs.length:0;
  const paidJobs=vJobs.filter(j=>j.paymentStatus==="paid");
  const paymentScore=vJobs.length>0?Math.round(paidJobs.length/Math.max(vJobs.filter(j=>j.phase!=="Quoting").length,1)*100):0;
  const totalItems=vItems.length;
  const totalOrdered=vItems.reduce((s,i)=>s+(i.qtyOrdered||0),0);
  const totalReceived=vItems.reduce((s,i)=>s+(i.qtyReceived||0),0);
  // Top customers by spend on this vendor's items
  const customerSpend={};
  vItems.forEach(i=>{const j=jobs.find(jj=>jj.id===i.jobId);if(!j)return;const c=customers.find(cc=>cc.id===j.customer);if(c){customerSpend[c.name]=(customerSpend[c.name]||0)+(i.unitCost||0)*(i.qtyOrdered||0)}});
  const topCustomers=Object.entries(customerSpend).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const allActivities=vJobs.flatMap(j=>(j.auditTrail||[]).map(a=>({...a,jobName:(jobNum?.(j.id)||"")+" "+j.name,jobId:j.id}))).sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,20);
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({...vend});


  const kpiStyle={textAlign:"center",padding:"18px 14px",background:"#0a0a0a",borderRadius:12,border:"1px solid rgba(255,255,255,0.04)"};
  const kpiVal=(v,c)=>({fontSize:28,fontWeight:800,color:c||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-1,lineHeight:1.1,marginBottom:4});
  const kpiLabel={fontSize:12,color:"#9a9a9a",fontWeight:500,letterSpacing:0.5};


  return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
      <span onClick={()=>setPage("directory")} style={{color:"#9a9a9a",cursor:"pointer",fontSize:14,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#9a9a9a"}>Directory</span>
      <span style={{color:"#525252",fontSize:14}}>/</span>
      <span style={{color:"#f0f0f0",fontSize:14,fontWeight:600}}>{vend.name}</span>
    </div>


    <Card style={{marginBottom:28,background:"linear-gradient(135deg,rgba(45,212,191,0.04),rgba(167,139,250,0.04))",border:"1px solid rgba(45,212,191,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:"#f0f0f0",marginBottom:8,letterSpacing:-0.5}}>{vend.name}</div>
          <div style={{fontSize:14,color:"#c4c4c4",marginBottom:4}}>{vend.contact}{vend.email?" | "+vend.email:""}{vend.phone?" | "+vend.phone:""}</div>
          <div style={{fontSize:13,color:"#9a9a9a"}}>{vend.category||"--"}{vend.address?" | "+vend.address:""}{vend.discountRate?" | Discount: "+((vend.discountType==="reciprocal"&&vend.reciprocalTiers)?vend.reciprocalTiers:((vend.discountRate*100).toFixed(0)+"%")):""}</div>
        </div>
        <Btn v="secondary" onClick={()=>{setEditing(!editing);setEditForm({...vend})}}><I n="edit" s={14}/> Edit</Btn>
      </div>
    </Card>


    {editing&&<Card style={{marginBottom:20,border:"1px solid #2dd4bf30"}}><div style={{fontSize:15,fontWeight:700,marginBottom:14,color:"#2dd4bf"}}>Edit Vendor</div>
      <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Name</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Contact</label><input value={editForm.contact||""} onChange={e=>setEditForm({...editForm,contact:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Email</label><input value={editForm.email||""} onChange={e=>setEditForm({...editForm,email:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Phone</label><input value={editForm.phone||""} onChange={e=>setEditForm({...editForm,phone:e.target.value})} style={inputStyle}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Category</label><input value={editForm.category||""} onChange={e=>setEditForm({...editForm,category:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Address</label><input value={editForm.address||""} onChange={e=>setEditForm({...editForm,address:e.target.value})} style={inputStyle}/></div>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={()=>{updateVendor(vendorId,editForm);setEditing(false);notify("Vendor updated")}}>Save</Btn><Btn v="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div>
    </Card>}


    <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14,marginBottom:28}}>
      <div style={kpiStyle}><div style={kpiVal(0,"#2dd4bf")}>{fmt(totalSpend)}</div><div style={kpiLabel}>Lifetime Spend</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#a78bfa")}>{vJobs.length}</div><div style={kpiLabel}>Total Jobs</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#34d399")}>{fmt(avgJobSize)}</div><div style={kpiLabel}>Avg Job Size</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,avgMargin>=30?"#34d399":avgMargin>=20?"#fbbf24":"#f87171")}>{avgMargin.toFixed(1)}%</div><div style={kpiLabel}>Avg Margin</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,paymentScore>=80?"#34d399":paymentScore>=50?"#fbbf24":"#f87171")}>{paymentScore}%</div><div style={{...kpiLabel}}>{paidJobs.length} of {vJobs.filter(j=>j.phase!=="Quoting").length} paid</div></div>
      <div style={kpiStyle}><div style={kpiVal(0,"#e5e5e5")}>{totalItems}</div><div style={kpiLabel}>Line Items</div></div>
    </div>


    <div className="resp-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:28}}>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Jobs ({vJobs.length})</div>
        {vJobs.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No jobs yet for this vendor.</div>:
        vJobs.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{
          const f=getJobFinancials(j.id);
          const jSpend=vItems.filter(i=>i.jobId===j.id).reduce((s,i)=>s+(i.unitCost||0)*(i.qtyOrdered||0),0);
          return <div key={j.id} onClick={()=>{setSelectedJob(j.id);setPage("jobs")}} className="hover-lift" style={{padding:"14px 16px",background:"#0a0a0a",borderRadius:10,cursor:"pointer",marginBottom:10,border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:11,marginRight:6}}>{jobNum(j.id)}</span>{j.name}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(jSpend)}</span>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Badge label={j.phase} color={statusColor(j.phase)}/>
              <Badge label={j.paymentStatus} color={statusColor(j.paymentStatus)}/>
              <span style={{fontSize:12,color:"#9a9a9a",marginLeft:"auto"}}>{j.createdDate}</span>
            </div>
          </div>
        })}
      </Card>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Vendor Spend Breakdown</div>
        {topCustomers.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No customer data yet.</div>:
        topCustomers.map(([name,spend])=>{
          const max=topCustomers[0][1]||1;
          return <div key={name} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,color:"#c4c4c4"}}>{name}</span>
              <span style={{fontSize:13,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(spend)}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:(spend/max*100)+"%",background:"linear-gradient(90deg,#a78bfa,#2dd4bf)",borderRadius:3}}/>
            </div>
          </div>
        })}
      </Card>
    </div>


    {totalOrdered>0&&<Card style={{marginBottom:28}}>
      <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:16}}>Delivery Progress</div>
      <div className="resp-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:20,textAlign:"center"}}>
        <div><div style={{fontSize:32,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{totalOrdered>0?Math.round(totalReceived/totalOrdered*100):0}%</div><div style={{fontSize:13,color:"#9a9a9a"}}>Received</div></div>
        <div><div style={{fontSize:32,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{(totalOrdered-totalReceived).toLocaleString()}</div><div style={{fontSize:13,color:"#9a9a9a"}}>Pending</div></div>
        <div><div style={{fontSize:32,fontWeight:800,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{totalOrdered.toLocaleString()}</div><div style={{fontSize:13,color:"#9a9a9a"}}>Total Units</div></div>
      </div>
      <div style={{height:10,background:"rgba(255,255,255,0.04)",borderRadius:5,overflow:"hidden"}}>
        <div style={{height:"100%",width:(totalReceived/totalOrdered*100)+"%",background:"linear-gradient(90deg,#2dd4bf,#34d399)",borderRadius:5,transition:"width 1.5s ease"}}/>
      </div>
    </Card>}


    <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Activity Timeline</div>
      {allActivities.length===0?<div style={{fontSize:13,color:"#737373",padding:"12px 0"}}>No activity recorded yet. Changes to jobs will appear here.</div>:
      allActivities.map((a,i)=><div key={i} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:a.type==="edit"?"#2dd4bf":"#a78bfa",marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:"#e5e5e5",lineHeight:1.5}}>{a.fields?a.fields.map(f=>f.field+" changed from \""+String(f.from||"empty")+"\" to \""+String(f.to)+"\"").join(", "):a.type}</div>
          <div style={{fontSize:12,color:"#9a9a9a",marginTop:2}}>{a.jobName} | {new Date(a.time).toLocaleDateString()} {new Date(a.time).toLocaleTimeString()}</div>{a.user&&<div style={{fontSize:11,color:"#2dd4bf",marginTop:2}}>{a.user}</div>}
        </div>
      </div>)}
    </Card>
  </div>;
}




// ===============================================================
// PLAYBOOK & SOPs
// ===============================================================
function PlaybookPage({jobs,reps,vendors,customers,lineItems,getJobFinancials,setPage,customSops,addSop,deleteSop,notify}){
  const [activeDoc,setActiveDoc]=useState(null);
  const [search,setSearch]=useState("");
  // customSops comes from props (Supabase-backed)
  const [showNewSop,setShowNewSop]=useState(false);
  const [editingSop,setEditingSop]=useState(null);
  const [newSop,setNewSop]=useState({title:'',cat:'Company',content:'',icon:'file'});
  // addSop/deleteSop come from props
  const iconOpts=['shield','send','users','receipt','download','dollar','file','truck','package','check','alert','chart','brain','edit','settings','book'];
  const catOpts=['Company','Workflow','Financial','Operations','Strategic','Custom'];


  // Rich SOP renderer
  const RichSOP=({doc})=>{
    const sections=doc.content.split('\n\n').filter(Boolean);
    return <div style={{animation:"fadeUp 0.3s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span onClick={()=>setActiveDoc(null)} style={{color:"#525252",cursor:"pointer",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#525252"}>Playbook</span>
        <span style={{color:"#333",fontSize:13}}>/</span>
        <span style={{color:"#e5e5e5",fontSize:13,fontWeight:600}}>{doc.title}</span><Btn v="ghost" style={{fontSize:11,padding:"3px 10px",marginLeft:12}} onClick={()=>{if(doc.custom){setEditingSop(doc)}else{setEditingSop({...doc,id:"SOP-"+Math.random().toString(36).slice(2,8),overrideId:doc.id,custom:true})}setActiveDoc(null)}}>{"Edit"}</Btn>{doc.custom&&<Btn v="danger" style={{fontSize:11,padding:"3px 10px",marginLeft:4}} onClick={()=>{deleteSop(doc.id);setActiveDoc(null);notify("SOP deleted")}}>Delete</Btn>}
      </div>
      <Card style={{border:"1px solid rgba(45,212,191,0.1)",background:"linear-gradient(180deg,rgba(45,212,191,0.02),transparent)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
          <div style={{width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,rgba(45,212,191,0.12),rgba(167,139,250,0.12))",display:"flex",alignItems:"center",justifyContent:"center",color:"#2dd4bf"}}><I n={doc.icon} s={22}/></div>
          <div><div style={{fontSize:20,fontWeight:800,color:"#f0f0f0",letterSpacing:-0.5}}>{doc.title}</div><div style={{fontSize:12,color:"#2dd4bf",fontWeight:600,textTransform:"uppercase",letterSpacing:1.5}}>{doc.cat}</div></div>
        </div>
        {sections.map((section,si)=>{
          const lines=section.split('\n').filter(Boolean);
          const firstLine=lines[0]||'';
          const isHeading=firstLine===firstLine.toUpperCase()&&firstLine.length<80&&!firstLine.startsWith('-')&&!firstLine.startsWith('*');
          const isNumberedList=lines.some(l=>/^\d+[\.\)]\s/.test(l));
          const isBulletList=lines.every(l=>l.startsWith('-')||l.startsWith('*'));
          const isFlowSteps=isNumberedList&&lines.filter(l=>/^\d+[\.\)]\s/.test(l)).length>=3;


          if(isFlowSteps){
            const steps=lines.filter(l=>/^\d+[\.\)]\s/.test(l)).map(l=>l.replace(/^\d+[\.\)]\s*/,''));
            return <div key={si} style={{marginBottom:28}}>
              {isHeading&&<div style={{fontSize:14,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><div style={{width:20,height:2,background:"linear-gradient(90deg,#a78bfa,transparent)",borderRadius:1}}/>{firstLine}</div>}
              <div style={{position:"relative",paddingLeft:24}}>
                <div style={{position:"absolute",left:11,top:12,bottom:12,width:2,background:"linear-gradient(180deg,#2dd4bf,#a78bfa,rgba(167,139,250,0.2))",borderRadius:1}}/>
                {steps.map((step,i)=>{
                  const parts=step.split(':');
                  const hasLabel=parts.length>1&&parts[0].length<30;
                  return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:i<steps.length-1?20:0,position:"relative"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:i===0?"rgba(45,212,191,0.15)":i===steps.length-1?"rgba(52,211,153,0.15)":"rgba(167,139,250,0.1)",border:"2px solid "+(i===0?"#2dd4bf":i===steps.length-1?"#34d399":"#a78bfa"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i===0?"#2dd4bf":i===steps.length-1?"#34d399":"#a78bfa",flexShrink:0,zIndex:1}}>{i+1}</div>
                    <div style={{flex:1,paddingTop:2}}>
                      {hasLabel?<><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5"}}>{parts[0].trim()}</span><span style={{fontSize:13,color:"#9a9a9a"}}>{': '+parts.slice(1).join(':').trim()}</span></>:<span style={{fontSize:13,color:"#c4c4c4",lineHeight:1.7}}>{step}</span>}
                    </div>
                  </div>
                })}
              </div>
            </div>
          }


          if(isBulletList){
            return <div key={si} style={{marginBottom:24}}>
              {lines.map((line,li)=><div key={li} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",marginTop:6,flexShrink:0}}/>
                <span style={{fontSize:13,color:"#c4c4c4",lineHeight:1.7}}>{line.replace(/^[-*]\s*/,'')}</span>
              </div>)}
            </div>
          }


          if(isHeading){
            const rest=lines.slice(1);
            return <div key={si} style={{marginBottom:28}}>
              <div style={{fontSize:14,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><div style={{width:20,height:2,background:"linear-gradient(90deg,#a78bfa,transparent)",borderRadius:1}}/>{firstLine}</div>
              {rest.map((line,li)=>{
                if(line.startsWith('-')||line.startsWith('*'))return <div key={li} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6,paddingLeft:4}}><div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",marginTop:6,flexShrink:0}}/><span style={{fontSize:13,color:"#c4c4c4",lineHeight:1.7}}>{line.replace(/^[-*]\s*/,'')}</span></div>;
                const kv=line.split(':');
                if(kv.length>=2&&kv[0].length<25)return <div key={li} style={{marginBottom:6,paddingLeft:4}}><span style={{fontSize:13,fontWeight:600,color:"#2dd4bf"}}>{kv[0].trim()}</span><span style={{fontSize:13,color:"#9a9a9a"}}>{': '+kv.slice(1).join(':').trim()}</span></div>;
                return <div key={li} style={{fontSize:13,color:"#c4c4c4",lineHeight:1.8,marginBottom:4,paddingLeft:4}}>{line}</div>
              })}
            </div>
          }


          // Default paragraph
          return <div key={si} style={{marginBottom:20}}>
            {lines.map((line,li)=>{
              const kv=line.split(':');
              if(kv.length>=2&&kv[0].length<30&&kv[0]===kv[0].toUpperCase())return <div key={li} style={{marginBottom:6}}><span style={{fontSize:13,fontWeight:700,color:"#2dd4bf"}}>{kv[0].trim()}</span><span style={{fontSize:13,color:"#c4c4c4"}}>{': '+kv.slice(1).join(':').trim()}</span></div>;
              if(line.startsWith('-')||line.startsWith('*'))return <div key={li} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}><div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",marginTop:6,flexShrink:0}}/><span style={{fontSize:13,color:"#c4c4c4",lineHeight:1.7}}>{line.replace(/^[-*]\s*/,'')}</span></div>;
              return <div key={li} style={{fontSize:13,color:"#c4c4c4",lineHeight:1.8,marginBottom:4}}>{line}</div>
            })}
          </div>
        })}
      </Card>
    </div>
  };


  // DEFAULT_SOPS defined at module level


  // Categories that share the `sops` table but are NOT user-facing SOPs. The sops table is
  // polymorphic -- it stores actual SOPs alongside internal infrastructure records (Brain
  // memories, prospects, file index, line item ship-to overrides, Plaid connection state,
  // doc status registry, vendor credit/bill SOP entries, etc). These categories MUST be
  // filtered out so the Playbook & SOPs page only shows real SOP documents to the user.
  // Each of these categories has its own dedicated page or is purely internal:
  //   Notes / Task -> Tasks + Notes pages
  //   DocStatuses -> internal doc state registry (not user-facing)
  //   ManualTxn -> Financials page (28k+ Plaid transactions)
  //   HistoricalDoc -> internal archive
  //   Settings -> internal config
  //   BrainMemory -> Brain page memory store
  //   Prospect -> Prospects page (295 records)
  //   Config -> internal config
  //   File -> Files page
  //   LineItemShipTo -> per-line ship-to overrides applied silently in PO generation
  //   PlaidConn -> Plaid connection token storage
  //   VendorCredit / StandaloneBill -> Documents > Vendor Bills tab
  const internalCats=new Set(["Notes","Task","DocStatuses","ManualTxn","HistoricalDoc","Settings","BrainMemory","Prospect","Config","File","LineItemShipTo","PlaidConn","VendorCredit","StandaloneBill","ExpenseCheck","BankBalances"]);
  const customIds=new Set((customSops||[]).filter(s=>!internalCats.has(s.cat)).map(s=>s.overrideId||s.id));const allSops=[...DEFAULT_SOPS.filter(d=>!customIds.has(d.id)),...(customSops||[])].filter(s=>!internalCats.has(s.cat));
  const cats=[...new Set(allSops.map(s=>s.cat))];
  const filtered=search?allSops.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())||s.content.toLowerCase().includes(search.toLowerCase())):allSops;


  if(activeDoc){const doc=allSops.find(s=>s.id===activeDoc);if(!doc){setActiveDoc(null);return null}return <RichSOP doc={doc}/>}


  return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Playbook & SOPs" sub={"Documented systems, workflows, and operating procedures -- "+allSops.length+" documents"}/>
    <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:24,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SOPs..." style={{...inputStyle,flex:1,minWidth:200,maxWidth:400}}/>
      <Btn onClick={()=>setShowNewSop(!showNewSop)} v={showNewSop?"secondary":"primary"}><I n="plus" s={14}/> {showNewSop?"Cancel":"New SOP"}</Btn>
    </div>
    {showNewSop&&<Card style={{marginBottom:24,border:"1px solid rgba(45,212,191,0.2)",background:"linear-gradient(135deg,rgba(45,212,191,0.02),transparent)"}}>
      <div style={{fontSize:15,fontWeight:700,color:"#2dd4bf",marginBottom:16}}>Create New SOP</div>
      <div className="resp-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Title</label><input value={newSop.title} onChange={e=>setNewSop({...newSop,title:e.target.value})} placeholder="e.g., Vendor Returns Process" style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Category</label><select value={newSop.cat} onChange={e=>setNewSop({...newSop,cat:e.target.value})} style={inputStyle}>{catOpts.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Icon</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{iconOpts.slice(0,12).map(ic=><div key={ic} onClick={()=>setNewSop({...newSop,icon:ic})} style={{width:28,height:28,borderRadius:6,background:newSop.icon===ic?"rgba(45,212,191,0.15)":"transparent",border:"1px solid "+(newSop.icon===ic?"#2dd4bf":"rgba(255,255,255,0.06)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:newSop.icon===ic?"#2dd4bf":"#525252",transition:"all 0.15s"}}><I n={ic} s={13}/></div>)}</div></div>
      </div>
      <div style={{marginBottom:14}}><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Content</label>
        <div style={{fontSize:11,color:"#737373",marginBottom:6}}>ALL CAPS = section headers. "- " = bullets. "1. 2. 3." = flow steps. Blank lines = section breaks.</div>
        <textarea value={newSop.content} onChange={e=>setNewSop({...newSop,content:e.target.value})} placeholder={"SECTION HEADER\nContent goes here.\n\nWORKFLOW STEPS\n1. First step: Do this\n2. Second step: Then this\n3. Third step: Finally this\n\nKEY NOTES\n- Important point\n- Another point"} rows={10} style={{...inputStyle,resize:"vertical",minHeight:180,lineHeight:1.6}}/>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(!newSop.title||!newSop.content){notify("Title and content are required","error");return}const sop={id:"SOP-"+Math.random().toString(36).slice(2,8),title:newSop.title,cat:newSop.cat,icon:newSop.icon,content:newSop.content,custom:true};addSop(sop);setNewSop({title:"",cat:"Company",content:"",icon:"file"});setShowNewSop(false);notify("SOP created")}}>Save SOP</Btn><Btn v="secondary" onClick={()=>setShowNewSop(false)}>Cancel</Btn></div>
    </Card>}
    {editingSop&&<Card style={{marginBottom:24,border:"1px solid rgba(167,139,250,0.2)",background:"linear-gradient(135deg,rgba(167,139,250,0.02),transparent)"}}>
      <div style={{fontSize:15,fontWeight:700,color:"#a78bfa",marginBottom:16}}>Edit SOP</div>
      <div className="resp-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Title</label><input value={editingSop.title} onChange={e=>setEditingSop({...editingSop,title:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Category</label><select value={editingSop.cat} onChange={e=>setEditingSop({...editingSop,cat:e.target.value})} style={inputStyle}>{catOpts.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Icon</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{iconOpts.slice(0,12).map(ic=><div key={ic} onClick={()=>setEditingSop({...editingSop,icon:ic})} style={{width:28,height:28,borderRadius:6,background:editingSop.icon===ic?"rgba(167,139,250,0.15)":"transparent",border:"1px solid "+(editingSop.icon===ic?"#a78bfa":"rgba(255,255,255,0.06)"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:editingSop.icon===ic?"#a78bfa":"#525252",transition:"all 0.15s"}}><I n={ic} s={13}/></div>)}</div></div>
      </div>
      <div style={{marginBottom:14}}><label style={{fontSize:12,color:"#9a9a9a",display:"block",marginBottom:4}}>Content</label>
        <textarea value={editingSop.content} onChange={e=>setEditingSop({...editingSop,content:e.target.value})} rows={10} style={{...inputStyle,resize:"vertical",minHeight:180,lineHeight:1.6}}/>
      </div>
      <div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(!editingSop.title){notify("Title required","error");return}addSop({...editingSop,custom:true});setEditingSop(null);notify("SOP updated")}}>Save Changes</Btn><Btn v="secondary" onClick={()=>setEditingSop(null)}>Cancel</Btn><Btn v="danger" onClick={()=>{deleteSop(editingSop.id);setEditingSop(null);notify("SOP deleted")}}>Delete SOP</Btn></div>
    </Card>}
    {cats.map(cat=>{const cd=filtered.filter(s=>s.cat===cat);if(!cd.length)return null;return <div key={cat} style={{marginBottom:32}}>
      <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#444",marginBottom:12}}>{cat}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {cd.map(doc=><div key={doc.id} onClick={()=>setActiveDoc(doc.id)} className="hover-lift" style={{padding:16,background:"#111111",borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",transition:"all 0.2s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:8,background:"rgba(45,212,191,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"#2dd4bf"}}><I n={doc.icon} s={16}/></div>
            <div style={{fontSize:14,fontWeight:600,color:"#e5e5e5"}}>{doc.title}</div>
          </div>
          <div style={{fontSize:12,color:"#737373",lineHeight:1.5}}>{doc.content.split('\n').filter(Boolean).slice(0,2).join('. ').slice(0,100)}...</div>
        </div>)}
      </div>
    </div>})}
  </div>;
}


// ===============================================================
// TASKS KANBAN (drag-and-drop, used in Sales Portal + standalone)
// ===============================================================
function TasksKanban({jobs,allJobs,reps,updateJob,notify,customSops,addSop,deleteSop,filterRep,filterJob,currentUser}){
  const [editTask,setEditTask]=useState(null);
  const [dragId,setDragId]=useState(null);


  const allTasks=(customSops||[]).filter(s=>s.cat==="Task").map(s=>{try{const d=JSON.parse(s.content);return{...d,id:s.id,sopId:s.id}}catch{return{id:s.id,sopId:s.id,text:s.title,status:"To Do",assignees:[],due:"",jobId:"",jobName:"",notes:"",link:"",priority:"normal"}}});
  const filtered=allTasks.filter(t=>{if(filterRep&&filterRep!=="all"&&!(t.assignees||[]).includes(filterRep))return false;if(filterJob&&filterJob!=="all"&&t.jobId!==filterJob)return false;return true});
  const cols={"To Do":[],"In Progress":[],"Done":[]};
  filtered.forEach(t=>{const s=t.status||"To Do";if(cols[s])cols[s].push(t);else cols["To Do"].push(t)});
  const colColors={"To Do":"#fbbf24","In Progress":"#2dd4bf","Done":"#34d399"};
  const priColors={"high":"#f87171","normal":"#525252","low":"#333"};


  // Email notifications. Sends via the existing /api/send-email Resend endpoint.
  // Fire-and-forget -- failures are surfaced via notify() but never block the save.
  // Recipient names are looked up against the reps directory for email addresses;
  // reps with no email on record are skipped with a notify (so the user knows the
  // task did save, but the email could not deliver to that person).
  //
  // kind:
  //   'assigned'        -- you've just been put on a task (new task OR added later)
  //   'status_changed'  -- task you're on moved to a different status
  //   'manual'          -- user clicked "Send Email" in the edit overlay
  const _sendTaskEmail = async ({task, recipients, kind, oldStatus}) => {
    try {
      if (!Array.isArray(recipients) || recipients.length === 0) return;
      // Map assignee names -> rep emails. Missing emails are tracked separately.
      const targets = []; const missing = [];
      recipients.forEach(name => {
        const rep = (reps||[]).find(r => r.name === name);
        if (rep && rep.email) targets.push({name, email: rep.email});
        else missing.push(name);
      });
      if (missing.length > 0) notify('Email skipped (no address on record): '+missing.join(', '), 'error');
      if (targets.length === 0) return;
      // From: prefer the logged-in user's rep email; fall back to a sensible default.
      let fromEmail = '';
      try {
        if (currentUser && currentUser.rep_id) {
          const me = (reps||[]).find(r => r.id === currentUser.rep_id);
          if (me && me.email) fromEmail = me.email;
        }
      } catch {}
      if (!fromEmail) fromEmail = 'tasks@mwfurnishings.com';
      // Subject + heading per notification kind.
      const taskText = task.text || 'Untitled task';
      let subject = '';
      let heading = '';
      if (kind === 'assigned') {
        subject = 'New Task Assigned: ' + taskText;
        heading = 'You have been assigned a new task';
      } else if (kind === 'status_changed') {
        subject = 'Task Status Updated: ' + taskText;
        heading = 'A task you are on changed status (' + (oldStatus||'') + ' &rarr; ' + (task.status||'') + ')';
      } else {
        subject = 'Task Update: ' + taskText;
        heading = 'Task update from ' + (currentUser?.name || 'Midwest AIOS');
      }
      // Build the body. Plain HTML, no logo header -- this is internal team comms.
      const esc = (s) => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const rows = [];
      rows.push(['Status', esc(task.status||'To Do')]);
      if (task.jobName) rows.push(['Project', esc(task.jobName)]);
      if (task.due) rows.push(['Due', esc(task.due)]);
      if (task.priority && task.priority !== 'normal') rows.push(['Priority', esc(task.priority).toUpperCase()]);
      const meta = rows.map(([k,v]) => '<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;vertical-align:top;white-space:nowrap">'+k+'</td><td style="padding:4px 0;font-size:13px;color:#111">'+v+'</td></tr>').join('');
      const notesBlock = task.notes ? '<div style="margin-top:14px;padding:10px 14px;background:#f7f7f5;border-left:3px solid #d4d4d4;font-size:13px;color:#333;line-height:1.55;white-space:pre-wrap">'+esc(task.notes)+'</div>' : '';
      const linkBlock = task.link ? '<div style="margin-top:12px;font-size:13px"><a href="'+esc(task.link)+'" style="color:#2dd4bf;text-decoration:underline">'+esc(task.link)+'</a></div>' : '';
      const html =
        '<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:24px;max-width:600px;margin:0 auto">'+
          '<div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px">Midwest AIOS &middot; Task Notification</div>'+
          '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:14px">'+heading+'</div>'+
          '<div style="font-size:16px;font-weight:600;color:#111;margin-bottom:10px;padding:12px 14px;background:#f7f7f5;border-radius:6px">'+esc(taskText)+'</div>'+
          '<table style="border-collapse:collapse;margin-top:6px">'+meta+'</table>'+
          notesBlock+
          linkBlock+
          '<div style="margin-top:22px;font-size:13px;color:#555;line-height:1.6">Open <a href="https://midwestaios.com/tasks" style="color:#2dd4bf;text-decoration:underline">Midwest AIOS &rsaquo; Tasks</a> to view all of your assigned tasks.</div>'+
          '<div style="margin-top:22px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px">This notification was sent automatically by Midwest AIOS. Sender: '+esc(currentUser?.name||'Midwest AIOS')+'</div>'+
        '</div>';
      // Send one request per recipient so a single bad address does not block the others.
      let okCount = 0; const failures = [];
      for (const t of targets) {
        try {
          const resp = await fetch('/api/send-email', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({to: t.email, from: fromEmail, subject, html})
          });
          if (resp.ok) okCount++;
          else { const d = await resp.json().catch(()=>({})); failures.push(t.name+' ('+(d.error||resp.status)+')'); }
        } catch(e) { failures.push(t.name+' (network)'); }
      }
      if (okCount > 0) notify('Email sent to '+okCount+' assignee'+(okCount===1?'':'s'));
      if (failures.length > 0) notify('Email failed for: '+failures.join(', '), 'error');
    } catch (e) {
      // Defensive: notifications must never break task save.
      try { notify('Task email error: '+e.message, 'error'); } catch {}
    }
  };


  const saveTask=(td,existingId)=>{
    const jn=td.jobId?(allJobs||jobs).find(j=>j.id===td.jobId)?.name||"":"";
    // Capture the prior state BEFORE saving so we can diff assignees + status.
    // (After addSop runs, allTasks won't reflect the change until the next render
    // anyway, but capturing here is the cleanest pattern.)
    const oldTask = existingId ? allTasks.find(t => t.sopId === existingId) : null;
    const oldAssignees = (oldTask && Array.isArray(oldTask.assignees)) ? oldTask.assignees : [];
    const newAssignees = Array.isArray(td.assignees) ? td.assignees : [];
    const addedAssignees = newAssignees.filter(a => !oldAssignees.includes(a));
    const statusChanged = !!(oldTask && oldTask.status !== td.status);
    const {id:_id,sopId:_sid,isNew:_n,...cleanTd}=td;
    const enrichedTd = {...cleanTd, jobName: jn};
    const sop={id:existingId||("TASK-"+Math.random().toString(36).slice(2,8)),title:td.text||"Untitled",cat:"Task",icon:"check",content:JSON.stringify(enrichedTd),custom:true};
    addSop(sop);
    notify(existingId?"Task updated":"Task created");
    // Fire notifications AFTER the save commits. Wrapped in try so any failure here
    // is fully isolated from the save itself.
    try {
      if (!oldTask) {
        // Brand-new task: notify every assignee (if any).
        if (newAssignees.length > 0) {
          _sendTaskEmail({task: enrichedTd, recipients: newAssignees, kind: 'assigned'});
        }
      } else {
        // Existing task update. Split recipients:
        //   - addedAssignees get an 'assigned' email (more informative -- includes status)
        //   - assignees who were already on it AND remain on it get a 'status_changed' email
        //     IF the status actually changed
        if (addedAssignees.length > 0) {
          _sendTaskEmail({task: enrichedTd, recipients: addedAssignees, kind: 'assigned'});
        }
        if (statusChanged) {
          const continuing = oldAssignees.filter(a => newAssignees.includes(a) && !addedAssignees.includes(a));
          if (continuing.length > 0) {
            _sendTaskEmail({task: enrichedTd, recipients: continuing, kind: 'status_changed', oldStatus: oldTask.status});
          }
        }
      }
    } catch {}
  };
  const moveTask=(id,newStatus)=>{const t=allTasks.find(x=>x.id===id);if(t)saveTask({...t,status:newStatus},t.sopId)};
  const handleDragStart=(e,id)=>{setDragId(id);e.dataTransfer.setData("taskId",id);e.dataTransfer.effectAllowed="move"};
  const handleDrop=(e,status)=>{e.preventDefault();const id=e.dataTransfer.getData("taskId")||dragId;if(id)moveTask(id,status);setDragId(null)};
  const handleDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move"};


  




  return <div>
    {editTask&&<EditTaskOverlay task={editTask} setEditTask={setEditTask} jobs={jobs} reps={reps} saveTask={saveTask} deleteSop={deleteSop} notify={notify} inputStyle={inputStyle} sendTaskEmail={_sendTaskEmail}/>}
    <div className="resp-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
      {["To Do","In Progress","Done"].map(status=><div key={status} onDrop={e=>handleDrop(e,status)} onDragOver={handleDragOver} style={{background:"#0a0a0a",borderRadius:14,border:"1px solid rgba(255,255,255,0.04)",padding:16,minHeight:200,transition:"border-color 0.2s"}} onDragEnter={e=>{e.currentTarget.style.borderColor=colColors[status]+"60"}} onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:12,height:12,borderRadius:"50%",background:colColors[status]}}/><span style={{fontSize:16,fontWeight:800,color:"#f0f0f0"}}>{status}</span><span style={{fontSize:13,color:"#525252",background:"rgba(255,255,255,0.04)",padding:"2px 10px",borderRadius:12,marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace"}}>{cols[status].length}</span><button onClick={()=>setEditTask({text:"",due:"",assignees:[],status:status,jobId:"",notes:"",link:"",priority:"normal",isNew:true})} style={{width:28,height:28,borderRadius:8,border:"1px dashed rgba(255,255,255,0.12)",background:"transparent",color:"#2dd4bf",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontFamily:"inherit"}}>+</button></div>
        {cols[status].length===0&&<div style={{fontSize:13,color:"#333",padding:"28px 0",textAlign:"center",border:"1px dashed rgba(255,255,255,0.06)",borderRadius:10}}>Drop tasks here</div>}
        {cols[status].map(t=><div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onClick={()=>setEditTask(t)} style={{padding:"14px 16px",background:"#111",borderRadius:12,marginBottom:10,border:"1px solid rgba(255,255,255,0.04)",cursor:"grab",transition:"all 0.15s",borderLeft:"3px solid "+(priColors[t.priority]||"#525252")}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.15)";e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";e.currentTarget.style.transform="translateY(0)"}}>
          <div style={{fontSize:15,fontWeight:600,color:status==="Done"?"#737373":"#f0f0f0",textDecoration:status==="Done"?"line-through":"none",marginBottom:8,lineHeight:1.4}}>{t.text}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>{t.jobName&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"rgba(45,212,191,0.06)",color:"#2dd4bf"}}>{t.jobName}</span>}{t.due&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"rgba(251,191,36,0.06)",color:"#fbbf24"}}>{t.due}</span>}{(t.assignees||[]).map(a=><span key={a} style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:"rgba(167,139,250,0.06)",color:"#a78bfa"}}>{a}</span>)}{t.priority==="high"&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(248,113,113,0.08)",color:"#f87171",fontWeight:600}}>HIGH</span>}</div>
          {t.notes&&<div style={{fontSize:13,color:"#c4c4c4",marginTop:8,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8,lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",borderLeft:"2px solid rgba(167,139,250,0.2)"}}><span style={{fontSize:10,color:"#a78bfa",fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:3}}>Notes</span>{t.notes}</div>}
          {t.link&&<a href={t.link} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"#2dd4bf",marginTop:4,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.link}</a>}
        </div>)}
      </div>)}
    </div>
  </div>;
}


// Edit Task Overlay (click blank space to close)
function EditTaskOverlay({task,setEditTask,jobs,reps,saveTask,deleteSop,notify,inputStyle,sendTaskEmail}){
  const [t,setT]=useState({...task});
  const [emailSending,setEmailSending]=useState(false);
  const handleSave=()=>{if(t.text?.trim()){saveTask(t,t.isNew?null:(t.sopId||t.id))}setEditTask(null)};
  const handleDelete=()=>{const id=t.sopId||t.id;if(id){deleteSop(id)}setEditTask(null);notify("Task deleted")};
  // Manual send: ping all current assignees with the task's current (possibly edited)
  // state. Does NOT save the task -- the user can hit Save afterward if they also want
  // to persist their edits. Button is disabled when there are no assignees because
  // there is nobody to send to. Also disabled while a send is in flight.
  const assigneeCount = Array.isArray(t.assignees) ? t.assignees.length : 0;
  const handleSendEmail = async () => {
    if (assigneeCount === 0) { notify('No assignees on this task to email','error'); return; }
    if (!t.text?.trim()) { notify('Add a task title first','error'); return; }
    setEmailSending(true);
    try {
      const jn = t.jobId ? (jobs||[]).find(j => j.id === t.jobId)?.name || '' : '';
      await sendTaskEmail({task: {...t, jobName: jn}, recipients: t.assignees, kind: 'manual'});
    } finally { setEmailSending(false); }
  };
  return <div onClick={(e)=>{if(e.target===e.currentTarget)setEditTask(null)}} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(10,10,10,0.75)",backdropFilter:"blur(40px) saturate(180%)",WebkitBackdropFilter:"blur(40px) saturate(180%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#0a0a0a",borderRadius:16,border:"1px solid rgba(45,212,191,0.15)",padding:24,width:"100%",maxWidth:480,maxHeight:"85vh",overflow:"auto"}}>
      <div style={{fontSize:16,fontWeight:700,color:t.isNew?"#2dd4bf":"#f0f0f0",marginBottom:12}}>{t.isNew?"New Task":"Edit Task"}</div>
      <input value={t.text||""} onChange={e=>setT({...t,text:e.target.value})} autoFocus placeholder="What needs to be done?" style={{...inputStyle,fontSize:18,fontWeight:700,background:"transparent",border:"none",padding:"8px 0",color:"#f0f0f0",marginBottom:12}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:12}}>
        <div><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Status</label><select value={t.status||"To Do"} onChange={e=>setT({...t,status:e.target.value})} style={inputStyle}><option>To Do</option><option>In Progress</option><option>Done</option></select></div>
        <div><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Due</label><input type="date" value={t.due||""} onChange={e=>setT({...t,due:e.target.value})} style={inputStyle}/></div>
        <div><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Priority</label><select value={t.priority||"normal"} onChange={e=>setT({...t,priority:e.target.value})} style={inputStyle}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></div>
        <div><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Project</label><select value={t.jobId||""} onChange={e=>setT({...t,jobId:e.target.value})} style={inputStyle}><option value="">None</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
      </div>
      <div style={{marginBottom:12}}><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Assign</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=>{const on=(t.assignees||[]).includes(r.name);return <button key={r.id} onClick={()=>setT({...t,assignees:on?(t.assignees||[]).filter(a=>a!==r.name):[...(t.assignees||[]),r.name]})} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+(on?"#2dd4bf":"rgba(255,255,255,0.08)"),background:on?"rgba(45,212,191,0.1)":"transparent",color:on?"#2dd4bf":"#737373",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{r.name.split(" ")[0]}</button>})}</div></div>
      <div style={{marginBottom:12}}><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Notes</label><textarea value={t.notes||""} onChange={e=>setT({...t,notes:e.target.value})} rows={3} placeholder="Details, context, follow-ups..." style={{...inputStyle,resize:"vertical"}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,color:"#737373",display:"block",marginBottom:3}}>Link</label><input value={t.link||""} onChange={e=>setT({...t,link:e.target.value})} placeholder="https://..." style={inputStyle}/></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn onClick={handleSave}>Save</Btn>
        <button onClick={handleSendEmail} disabled={assigneeCount===0||emailSending||!t.text?.trim()} title={assigneeCount===0?"Assign someone first to enable email":(emailSending?"Sending...":"Send this task to "+assigneeCount+" assignee"+(assigneeCount===1?"":"s")+" via email")} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+(assigneeCount===0||emailSending||!t.text?.trim()?"rgba(255,255,255,0.08)":"#a78bfa40"),background:assigneeCount===0||emailSending||!t.text?.trim()?"transparent":"rgba(167,139,250,0.08)",color:assigneeCount===0||emailSending||!t.text?.trim()?"#525252":"#a78bfa",fontSize:13,fontWeight:600,cursor:assigneeCount===0||emailSending||!t.text?.trim()?"not-allowed":"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>{emailSending?"Sending...":"Send Email"+(assigneeCount>0?" ("+assigneeCount+")":"")}</button>
        <Btn v="danger" onClick={handleDelete}>Delete</Btn>
        <Btn v="secondary" onClick={()=>setEditTask(null)}>Cancel</Btn>
      </div>
    </div>
  </div>;
}


function TasksPage({jobs,reps,updateJob,notify,customSops,addSop,deleteSop,currentUser}){
  const [filterRep,setFilterRep]=useState("all");
  const [filterJob,setFilterJob]=useState("all");
  const open=(customSops||[]).filter(s=>s.cat==="Task").filter(s=>{try{return JSON.parse(s.content).status!=="Done"}catch{return true}}).length;
  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Tasks" sub={open+" open tasks"}/>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <select value={filterRep} onChange={e=>setFilterRep(e.target.value)} style={{...inputStyle,width:160,padding:"6px 10px",fontSize:12}}><option value="all">Everyone</option>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=><option key={r.id} value={r.name}>{r.name}</option>)}</select>
      <select value={filterJob} onChange={e=>setFilterJob(e.target.value)} style={{...inputStyle,width:180,padding:"6px 10px",fontSize:12}}><option value="all">All Projects</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select>
    </div>
    <TasksKanban jobs={jobs} allJobs={jobs} reps={reps} updateJob={updateJob} notify={notify} customSops={customSops} addSop={addSop} deleteSop={deleteSop} filterRep={filterRep} filterJob={filterJob} currentUser={currentUser}/>
  </div>;
}


// ===============================================================
// NOTES
// ===============================================================
function NotesView({customSops,addSop,deleteSop,jobs,reps,notify,triggerPrint}){
  const [content,setContent]=useState("");
  const [folder,setFolder]=useState("General");
  const [newFolder,setNewFolder]=useState("");
  const [showNewFolder,setShowNewFolder]=useState(false);
  const [search,setSearch]=useState("");
  const [activeNote,setActiveNote]=useState(null);
  const [editId,setEditId]=useState(null);
  const [editContent,setEditContent]=useState("");
  const editorRef=useRef(null);
  const [draftId,setDraftId]=useState(()=>"NOTE-"+Math.random().toString(36).slice(2,8));
  const [saved,setSaved]=useState(false);
  const saveTimerRef=useRef(null);


  const notes=(customSops||[]).filter(s=>s.cat==="Notes").sort((a,b)=>b.id.localeCompare(a.id));
  const parseNote=(n)=>{try{return JSON.parse(n.content)}catch{return{text:n.content,folder:"General"}}};
  const allFolders=[...new Set(["General",...notes.map(n=>(parseNote(n).folder||"General"))])].sort();
  const folders=["All",...allFolders];
  const filtered=notes.filter(n=>{if(search){const q=search.toLowerCase();if(!n.title.toLowerCase().includes(q)&&!(parseNote(n).text||"").toLowerCase().includes(q))return false}if(folder!=="All"&&(parseNote(n).folder||"General")!==folder)return false;return true});


  // Auto-save as you type
  const autoSave=(text)=>{setContent(text);setSaved(false);if(saveTimerRef.current)clearTimeout(saveTimerRef.current);if(!text.trim())return;saveTimerRef.current=setTimeout(()=>{const title=text.split("\n")[0].replace(/^#+\s*/,"").slice(0,60)||"Untitled";const data={text,folder:folder==="All"?"General":folder,date:new Date().toISOString()};const existing=(customSops||[]).find(s=>s.id===draftId);if(existing)deleteSop(draftId);addSop({id:draftId,title,cat:"Notes",icon:"file",content:JSON.stringify(data),custom:true});setSaved(true)},800)};


  const finishNote=()=>{if(!content.trim())return;const id=draftId;setContent("");setActiveNote(id);setDraftId("NOTE-"+Math.random().toString(36).slice(2,8));setSaved(false)};


  const updateNote=(note,newText)=>{const data=parseNote(note);const title=(newText||data.text||"").split("\n")[0].replace(/^#+\s*/,"").slice(0,60)||"Untitled";addSop({...note,title,content:JSON.stringify({...data,text:newText||data.text})});notify("Saved")};
  const toggleItem=(note,idx)=>{const data=parseNote(note);const lines=(data.text||"").split("\n");if(idx<lines.length){const l=lines[idx];if(l.startsWith("[x] "))lines[idx]="[ ] "+l.slice(4);else if(l.startsWith("[ ] "))lines[idx]="[x] "+l.slice(4);updateNote(note,lines.join("\n"))}};
  const exportPDF=(note)=>{const data=parseNote(note);const body=String(data.text||"").split("<").join("&lt;");const html="<div style=\"font-family:sans-serif;max-width:700px;margin:0 auto;padding:40px\"><h1>"+note.title+"</h1><div style=\"font-size:12px;color:#888;margin-bottom:20px\">"+(data.date?new Date(data.date).toLocaleDateString():"")+"</div><div style=\"font-size:14px;line-height:1.8;white-space:pre-wrap\">"+body+"</div></div>";if(triggerPrint)triggerPrint(note.title,html);else{const w=window.open("","_blank");w.document.write(html);w.print()}};
  const createFolder=()=>{if(!newFolder.trim())return;setFolder(newFolder.trim());setShowNewFolder(false);setNewFolder("");notify("Folder created")};


  // Toolbar actions - insert at cursor
  const insertAt=(prefix,suffix)=>{const el=editorRef.current;if(!el)return;const start=el.selectionStart;const end=el.selectionEnd;const text=content;const selected=text.slice(start,end);const newText=text.slice(0,start)+prefix+selected+suffix+text.slice(end);autoSave(newText);setTimeout(()=>{el.selectionStart=start+prefix.length;el.selectionEnd=start+prefix.length+selected.length;el.focus()},10)};
  const insertLine=(prefix)=>{const el=editorRef.current;if(!el)return;const pos=el.selectionStart;const before=content.slice(0,pos);const needsNewline=before.length>0&&!before.endsWith("\n");autoSave(before+(needsNewline?"\n":"")+prefix+content.slice(pos));setTimeout(()=>{el.selectionStart=el.selectionEnd=pos+(needsNewline?1:0)+prefix.length;el.focus()},10)};


  const viewing=activeNote?notes.find(n=>n.id===activeNote):null;
  const viewData=viewing?parseNote(viewing):null;


  return <div className="notes-layout" style={{display:"flex",gap:16,minHeight:400}}>
    {/* Sidebar */}
    <div style={{width:220,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{...inputStyle,padding:"8px 12px",fontSize:12}}/>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{folders.map(f=><button key={f} onClick={()=>setFolder(f)} style={{padding:"3px 8px",borderRadius:6,border:"none",background:folder===f?"#2dd4bf":"rgba(255,255,255,0.04)",color:folder===f?"#000":"#737373",fontSize:10,fontWeight:folder===f?600:400,cursor:"pointer",fontFamily:"inherit"}}>{f}</button>)}<button onClick={()=>setShowNewFolder(true)} style={{padding:"3px 8px",borderRadius:6,border:"1px dashed rgba(255,255,255,0.1)",background:"transparent",color:"#525252",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>+</button></div>
      {showNewFolder&&<div style={{display:"flex",gap:4}}><input value={newFolder} onChange={e=>setNewFolder(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createFolder()}} placeholder="Name" autoFocus style={{...inputStyle,padding:"4px 8px",fontSize:11,flex:1}}/><Btn style={{fontSize:10,padding:"3px 8px"}} onClick={createFolder}>Add</Btn></div>}
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:3}}>
        <div onClick={()=>{setActiveNote(null);setEditId(null);setContent("")}} style={{padding:"8px 10px",borderRadius:8,background:!activeNote?"rgba(45,212,191,0.06)":"transparent",border:"1px solid "+(!activeNote?"rgba(45,212,191,0.12)":"transparent"),cursor:"pointer"}}><div style={{fontSize:12,fontWeight:600,color:"#2dd4bf"}}>+ New Note</div></div>
        {filtered.map(n=>{const d=parseNote(n);return <div key={n.id} onClick={()=>{setActiveNote(n.id);setEditId(null)}} style={{padding:"8px 10px",borderRadius:8,background:activeNote===n.id?"rgba(255,255,255,0.03)":"transparent",border:"1px solid "+(activeNote===n.id?"rgba(255,255,255,0.06)":"transparent"),cursor:"pointer"}}><div style={{fontSize:12,fontWeight:600,color:activeNote===n.id?"#f0f0f0":"#a3a3a3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div><div style={{fontSize:10,color:"#525252"}}>{d.date?new Date(d.date).toLocaleDateString():""}</div></div>})}
      </div>
    </div>


    {/* Main editor area */}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>


      {/* NEW NOTE: Always-ready editor */}
      {!activeNote&&<div style={{flex:1,display:"flex",flexDirection:"column"}}>
        {/* Toolbar */}
        <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>insertAt("**","**")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:11}}>Bold</button>
          <button onClick={()=>insertAt("*","*")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontFamily:"inherit",fontStyle:"italic",fontSize:11}}>Italic</button>
          <button onClick={()=>insertAt("__","__")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",fontSize:11}}>Underline</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,0.06)",margin:"0 4px"}}/>
          <button onClick={()=>insertLine("- ")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>Bullet</button>
          <button onClick={()=>insertLine("[ ] ")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#2dd4bf",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>Checklist</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,0.06)",margin:"0 4px"}}/>
          <select value={folder==="All"?"General":folder} onChange={e=>{if(e.target.value==="__new")setShowNewFolder(true);else setFolder(e.target.value)}} style={{...inputStyle,width:110,padding:"4px 8px",fontSize:11}}>{[...new Set(["General",...allFolders])].map(f=><option key={f}>{f}</option>)}<option value="__new">+ Folder</option></select>
          <select id="noteJobSelect" style={{...inputStyle,width:120,padding:"4px 8px",fontSize:11}}><option value="">No project</option>{(jobs||[]).map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select>
          <select id="noteAssignSelect" style={{...inputStyle,width:110,padding:"4px 8px",fontSize:11}}><option value="">Unassigned</option>{(reps||[]).filter(r=>!r.id?.includes("SEED_FLAG")).map(r=><option key={r.id} value={r.name}>{r.name}</option>)}</select>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            {content.trim()&&<span style={{fontSize:11,color:saved?"#34d399":"#525252"}}>{saved?"Saved":"..."}</span>}
            {content.trim()&&<Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={finishNote}>Done</Btn>}
          </div>
        </div>
        {/* Editor */}
        <textarea ref={editorRef} value={content} onChange={e=>autoSave(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){const lines=content.slice(0,e.target.selectionStart).split("\n");const last=lines[lines.length-1]||"";if(last.startsWith("[ ] ")||last.startsWith("[x] ")){e.preventDefault();autoSave(content.slice(0,e.target.selectionStart)+"\n[ ] "+content.slice(e.target.selectionEnd))}else if(last.startsWith("- ")){e.preventDefault();autoSave(content.slice(0,e.target.selectionStart)+"\n- "+content.slice(e.target.selectionEnd))}}}} placeholder={"Start typing...\n\nFirst line becomes the title.\nAuto-saves as you type."} style={{flex:1,width:"100%",padding:20,background:"#000",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,color:"#e5e5e5",fontSize:15,lineHeight:1.8,fontFamily:"inherit",resize:"none",minHeight:320,outline:"none"}}/>
      </div>}


      {/* VIEW existing note */}
      {viewing&&!editId&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1}}><div style={{fontSize:22,fontWeight:800,color:"#f0f0f0",marginBottom:4}}>{viewing.title}</div><div style={{fontSize:12,color:"#525252"}}>{viewData?.date?new Date(viewData.date).toLocaleDateString():""}{viewData?.folder&&viewData.folder!=="General"?" | "+viewData.folder:""}</div></div>
          <div style={{display:"flex",gap:6,flexShrink:0}}><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{setEditId(viewing.id);setEditContent(viewData?.text||"")}}>Edit</Btn><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>exportPDF(viewing)}>PDF</Btn><Btn v="danger" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{deleteSop(viewing.id);setActiveNote(null);notify("Deleted")}}>Delete</Btn></div>
        </div>
        <div style={{fontSize:14,color:"#c4c4c4",lineHeight:1.9}}>
          {(viewData?.text||"").split("\n").map((line,i)=>{
            if(line.startsWith("[x] "))return <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"4px 0",cursor:"pointer"}}><div style={{flexShrink:0}}><Check checked={true} size={18} onChange={()=>toggleItem(viewing,i)}/></div><span onClick={()=>toggleItem(viewing,i)} style={{textDecoration:"line-through",color:"#525252",cursor:"pointer"}}>{line.slice(4)}</span></div>;
            if(line.startsWith("[ ] "))return <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"4px 0",cursor:"pointer"}}><div style={{flexShrink:0}}><Check checked={false} size={18} onChange={()=>toggleItem(viewing,i)}/></div><span onClick={()=>toggleItem(viewing,i)} style={{cursor:"pointer"}}>{line.slice(4)}</span></div>;
            if(line.startsWith("- "))return <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"3px 0"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",marginTop:8,flexShrink:0}}/><span>{line.slice(2)}</span></div>;
            // Bold **text**, Italic *text*, Underline __text__
            const rendered=line.replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/\*([^*]+)\*/g,"<i>$1</i>").replace(/__([^_]+)__/g,"<u>$1</u>");
            if(rendered!==line)return <div key={i} style={{padding:"2px 0"}} dangerouslySetInnerHTML={{__html:rendered}}/>;
            return <div key={i} style={{padding:"2px 0",minHeight:line?"auto":16}}>{line}</div>;
          })}
        </div>
      </div>}


      {/* EDIT existing note */}
      {editId&&<div style={{flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",gap:4,marginBottom:8}}>
          <button onClick={()=>{const el=document.getElementById("editTA");if(el){const s=el.selectionStart,e2=el.selectionEnd,sel=editContent.slice(s,e2);setEditContent(editContent.slice(0,s)+"**"+sel+"**"+editContent.slice(e2))}}} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>B</button>
          <button onClick={()=>{const el=document.getElementById("editTA");if(el){const s=el.selectionStart,e2=el.selectionEnd,sel=editContent.slice(s,e2);setEditContent(editContent.slice(0,s)+"*"+sel+"*"+editContent.slice(e2))}}} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontStyle:"italic",fontSize:13,fontFamily:"inherit"}}>I</button>
          <button onClick={()=>{const el=document.getElementById("editTA");if(el){const s=el.selectionStart,e2=el.selectionEnd,sel=editContent.slice(s,e2);setEditContent(editContent.slice(0,s)+"__"+sel+"__"+editContent.slice(e2))}}} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",textDecoration:"underline",fontSize:13,fontFamily:"inherit"}}>U</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,0.06)",margin:"0 4px"}}/>
          <button onClick={()=>setEditContent(c=>c+(c?"\n":"")+"- ")} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>*</button>
          <button onClick={()=>setEditContent(c=>c+(c?"\n":"")+"[ ] ")} style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#2dd4bf",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>&#9745;</button>
        </div>
        <textarea id="editTA" value={editContent} onChange={e=>setEditContent(e.target.value)} style={{flex:1,width:"100%",padding:20,background:"#000",border:"1px solid rgba(167,139,250,0.15)",borderRadius:14,color:"#e5e5e5",fontSize:15,lineHeight:1.8,fontFamily:"inherit",resize:"none",minHeight:320,outline:"none"}}/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn onClick={()=>{const note=notes.find(n=>n.id===editId);if(note)updateNote(note,editContent);setEditId(null);setActiveNote(editId)}}>Save</Btn>
          <Btn v="secondary" onClick={()=>setEditId(null)}>Cancel</Btn>
        </div>
      </div>}
    </div>
  </div>;
}


function NotesPage({customSops,addSop,deleteSop,jobs,reps,notify,triggerPrint}){
  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Notes" sub={(customSops||[]).filter(s=>s.cat==="Notes").length+" notes saved"}/><NotesView customSops={customSops} addSop={addSop} deleteSop={deleteSop} jobs={jobs} reps={reps} notify={notify} triggerPrint={triggerPrint}/></div>;
}


function BrainPage({jobs,reps,lineItems,vendors,customers,getJobFinancials,getJobItems,_commissionFor,_bankTxnHash,brainQuery,setBrainQuery,customSops,addSop,deleteSop,brainLoading,setBrainLoading,brainHistory,setBrainHistory,updateJob,addJob,updateLineItem,addLineItem,deleteLineItem,updateRep,addRep,addCustomer,updateCustomer,addVendor,updateVendor,notify,setPage,deleteJob,pendingBrainFile,setPendingBrainFile,pendingBrainEmail,setPendingBrainEmail,currentUser}){
  // Sales-role scoping: the Brain must only know what the logged-in user is allowed
  // to see. jobs arrives pre-filtered (visibleJobs), but line items arrive
  // unfiltered -- without this filter a sales login could ask the Brain about other
  // reps' jobs, costs, and margins and get real answers. Office and admin are
  // untouched (they see all jobs in the UI already).
  if(currentUser&&currentUser.role==='sales'){
    const _visIds=new Set((jobs||[]).map(j=>j.id));
    lineItems=(lineItems||[]).filter(li=>_visIds.has(li.jobId));
  }
  const [brainFile, setBrainFile] = useState(null);
  const [brainFilePreview, setBrainFilePreview] = useState(null);
  const [brainFileContext, setBrainFileContext] = useState(null);
  // Most recent binary attachment in this Brain session (paperclip upload or file
  // loaded from the Files page). Lets tools like attach_file_to_bill use the file
  // the user just attached without needing a URL or re-supplied base64 -- the model
  // cannot re-emit megabytes of base64 into tool arguments, which is why 'attach
  // this PDF to the bill' previously failed. Reported by Maureen Jul 17 2026.
  const brainLastFileRef = useRef(null);
  const brainFileRef = React.useRef(null);
  const [brainEmailSending, setBrainEmailSending] = useState(false);
  // Consume pending file from Files page (Read with Brain)
  useEffect(()=>{
    if(pendingBrainFile){
      setBrainFileContext(pendingBrainFile);
      try{const _db=(pendingBrainFile.blocks||[]).find(b=>b&&(b.type==='document'||b.type==='image')&&b.source&&b.source.type==='base64'&&b.source.data);if(_db)brainLastFileRef.current={name:pendingBrainFile.name||'attachment',base64:_db.source.data,mediaType:_db.source.media_type||'application/pdf'};}catch{}
      setPendingBrainFile(null);
      notify('Loaded "'+pendingBrainFile.name+'" into Brain. Ask away.');
    }
  },[pendingBrainFile]);
  const history=brainHistory;const setHistory=setBrainHistory;
  // === BRAIN MEMORY SYSTEM ===
  const [brainMemory, setBrainMemory] = useState([]);
  const memoryLoaded = useRef(false);
  useEffect(() => {
    if (memoryLoaded.current) return;
    memoryLoaded.current = true;
    const existing = (customSops || []).filter(s => s.cat === "BrainMemory");
    if (existing.length > 0) setBrainMemory(existing);
  }, [customSops]);
  const saveMemory = (category, content, metadata) => {
    const id = "MEM-" + category.replace(/\s+/g, "-").toLowerCase() + "-" + Date.now();
    const mem = { id, title: category, cat: "BrainMemory", icon: "brain", content: JSON.stringify({ text: content, metadata: metadata || {}, updatedAt: new Date().toISOString() }), custom: true };
    addSop(mem); setBrainMemory(p => [...p.filter(m => m.title !== category), mem]); return mem;
  };
  const updateMemory = (category, content, metadata) => {
    const existing = brainMemory.find(m => m.title === category);
    if (existing) {
      let parsed = {}; try { parsed = JSON.parse(existing.content); } catch {}
      const updated = { ...existing, content: JSON.stringify({ ...parsed, text: content, metadata: { ...parsed.metadata, ...metadata }, updatedAt: new Date().toISOString() }) };
      addSop(updated); setBrainMemory(p => p.map(m => m.title === category ? updated : m)); return updated;
    }
    return saveMemory(category, content, metadata);
  };
  const getMemoryText = () => {
    if (brainMemory.length === 0) return "";
    return brainMemory.map(m => { try { const d = JSON.parse(m.content); return "## " + m.title + " (updated: " + (d.updatedAt || "unknown") + ")\n" + d.text; } catch { return "## " + m.title + "\n" + m.content; } }).join("\n\n");
  };
  const suggestedQueries=["Show me the Hopewell Valley job details","What is our total pipeline revenue?","Which vendor do we spend the most with?","Run a health check on the business","Draft a follow-up email for pending quotes","What anomalies should I know about?","List all jobs with deliveries pending","What are our margins by vendor?","Summarize our commission obligations","Which jobs are past due?","Compare our top 5 jobs by revenue","What is our cash position outlook?"];
  const chatRef=useRef(null);
  const [animatingIdx,setAnimatingIdx]=useState(-1);
  const [pendingActions,setPendingActions]=useState([]);
  // Streaming state for the typewriter effect on Brain responses.
  // isStreaming: true while text deltas are arriving for the most recent assistant
  // message. Used to render a blinking cursor next to the live message.
  const [isStreaming,setIsStreaming]=useState(false);
  // === VOICE INPUT ===
  const [isListening, setIsListening] = useState(false);
  const [isCleaningTranscript, setIsCleaningTranscript] = useState(false);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const rawTranscriptRef = useRef("");
  // AI-powered transcript cleanup using the existing Brain API
  const cleanTranscript = async (raw) => {
    if (!raw.trim()) return raw;
    setIsCleaningTranscript(true);
    try {
      const resp = await fetch("/api/brain", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          system: "You are a transcript cleaner for a furniture business called Midwest Educational Furnishings. Fix the speech-to-text transcript below. Rules:\n1. Fix capitalization, punctuation, and grammar\n2. Fix industry terms: KI, Virco, Marco, NPS (National Public Seating), Ruckus, MyPlace, STEM, CUSD, USD, DuPage, Naperville, Glenbrook, Kildeer\n3. Fix common mishearings: 'ki' -> 'KI', 'marco' -> 'Marco', 'virco' -> 'Virco', 'nps' -> 'NPS', 'see you SD' -> 'CUSD', 'do page' -> 'DuPage'\n4. Fix numbers and dollar amounts: 'three hundred dollars' -> '$300', 'twenty five' -> '25'\n5. Keep the meaning identical. Do NOT add content, rephrase, or summarize.\n6. Return ONLY the cleaned transcript text. No quotes, no explanation, no preamble.",
          messages: [{role: "user", content: "Clean this transcript:\n\n" + raw}],
          tools: []
        })
      });
      const data = await resp.json();
      const cleaned = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
      if (cleaned && cleaned.length > 0) {
        setIsCleaningTranscript(false);
        return cleaned;
      }
    } catch (e) { console.error("Transcript cleanup error:", e); }
    setIsCleaningTranscript(false);
    // Fallback: basic local cleanup
    let t = raw.trim();
    if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
    t = t.replace(/\bi\b/g, 'I');
    return t;
  };
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { notify("Voice input not supported on this browser"); return; }
    if (isListening) {
      // Stop listening -- clean up transcript with AI
      listeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e2) {} }
      recognitionRef.current = null;
      // Send raw transcript through AI for cleanup
      const raw = rawTranscriptRef.current;
      if (raw.trim()) {
        cleanTranscript(raw).then(cleaned => { setBrainQuery(cleaned); });
      }
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;
    let finalTranscript = brainQuery || "";
    let interimTranscript = "";
    rawTranscriptRef.current = finalTranscript;
    recognition.onstart = () => { setIsListening(true); listeningRef.current = true; };
    recognition.onresult = (event) => {
      interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        let bestIdx = 0;
        let bestConf = 0;
        for (let a = 0; a < event.results[i].length; a++) {
          if (event.results[i][a].confidence > bestConf) { bestConf = event.results[i][a].confidence; bestIdx = a; }
        }
        const t = event.results[i][bestIdx].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interimTranscript = t;
        }
      }
      rawTranscriptRef.current = finalTranscript;
      setBrainQuery(finalTranscript + interimTranscript);
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognitionRef.current?.start(); } catch(e2) {
          listeningRef.current = false;
          setIsListening(false);
          recognitionRef.current = null;
        }
        return;
      }
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech" && listeningRef.current) {
        try { recognitionRef.current?.start(); } catch(e2) {}
        return;
      }
      if (e.error === "aborted") return;
      listeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      notify("Voice error: " + e.error);
    };
    finalTranscript = brainQuery || "";
    rawTranscriptRef.current = finalTranscript;
    recognitionRef.current = recognition;
    recognition.start();
  };
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},[history,animatingIdx,pendingActions]);


  // Tool definitions for Claude function calling
  // Helper: find job by ID or name keywords
  const findJob=(ref)=>{if(!ref)return null;const r=ref.toLowerCase();return jobs.find(j=>j.id.toLowerCase()===r)||jobs.find(j=>j.name.toLowerCase().includes(r))||jobs.find(j=>{const words=r.split(/\s+/).filter(w=>w.length>3);return words.length>0&&words.every(w=>j.name.toLowerCase().includes(w))})};
  const findVendor=(ref)=>{if(!ref)return null;const r=ref.toLowerCase();return vendors.find(v=>v.id===ref)||vendors.find(v=>v.name.toLowerCase().includes(r))};
  const findCustomer=(ref)=>{if(!ref)return null;const r=ref.toLowerCase();return customers.find(c=>c.id===ref)||customers.find(c=>c.name.toLowerCase().includes(r))};


  const brainTools=[
    {name:"update_job",description:"Update a job's phase, payment status, notes, due date, or other fields.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},updates:{type:"object",properties:{phase:{type:"string"},paymentStatus:{type:"string"},notes:{type:"string"},dueDate:{type:"string"},paymentTerms:{type:"string"},shipTo:{type:"string"},poNumber:{type:"string"}}}},required:["job_id","updates"]}},
    {name:"create_job",description:"Create a new job record.",input_schema:{type:"object",properties:{name:{type:"string"},customer_name:{type:"string",description:"Customer name to link"},sales_rep_name:{type:"string",description:"Rep name to link"},phase:{type:"string"},notes:{type:"string"}},required:["name"]}},
    {name:"update_line_item",description:"Update a line item by ID or by job + description match. Can update price, cost, qty, description, color, model number, received qty, and more. Use when user says 'change the price on the desks to $300' or 'update the chair qty to 25'.",input_schema:{type:"object",properties:{item_id:{type:"string",description:"Line item ID (if known)"},job_id:{type:"string",description:"Job ID or name (used with item_description to find the item)"},item_description:{type:"string",description:"Keywords to match the line item (e.g. 'desk', 'apex chair', 'table dolly')"},updates:{type:"object",properties:{qtyOrdered:{type:"number"},qtyReceived:{type:"number"},unitPrice:{type:"number"},unitCost:{type:"number"},listPrice:{type:"number"},description:{type:"string"},color:{type:"string"},modelNumber:{type:"string"},manufacturer:{type:"string"},shippingPerUnit:{type:"number"},installPerUnit:{type:"number"},deliveryDate:{type:"string"}}}},required:["updates"]}},
    {name:"get_job_details",description:"Get full details of a job including ALL line items formatted as a table. Use when user says 'show me the Hopewell job', 'pull up job details', 'what line items are on this job', 'show me the line items'. Returns job info and a markdown table of all line items with prices, quantities, and status.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"}},required:["job_id"]}},
    {name:"bulk_edit_line_items",description:"Update multiple line items on a job at once. Use when user says 'change all prices by 10%', 'mark everything as received', 'update shipping on all items'. Can filter by description keywords and apply the same update to all matches.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name"},filter_description:{type:"string",description:"Optional keywords to filter which items to update (e.g. 'chair', 'KI'). Leave empty to update ALL items."},updates:{type:"object",properties:{qtyReceived:{type:"number"},unitPrice:{type:"number"},unitCost:{type:"number"},shippingPerUnit:{type:"number"},installPerUnit:{type:"number"},price_multiply:{type:"number",description:"Multiply current unitPrice by this factor (e.g. 1.10 for +10%)"},cost_multiply:{type:"number",description:"Multiply current unitCost by this factor"}}}},required:["job_id","updates"]}},
    {name:"log_delivery",description:"Log a specific quantity received for a line item on a job. Use when user says 'log 25 desks received' or 'received 10 chairs on job X'. Finds the item by description keywords.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name"},item_description:{type:"string",description:"Keywords to match the line item description (e.g. 'desk', 'chair', 'table')"},quantity:{type:"number",description:"Number of units received"}},required:["job_id","item_description","quantity"]}},
    {name:"bulk_update_jobs",description:"Update multiple jobs at once based on a filter. Use for 'mark all Quoting jobs as Ordered' or 'set all delivered jobs to paid'.",input_schema:{type:"object",properties:{filter:{type:"object",description:"Filter criteria",properties:{phase:{type:"string",description:"Match jobs in this phase"},paymentStatus:{type:"string",description:"Match jobs with this payment status"},all_delivered:{type:"boolean",description:"Match jobs where all items are received"}}},updates:{type:"object",properties:{phase:{type:"string"},paymentStatus:{type:"string"},notes:{type:"string"}}}},required:["filter","updates"]}},
    {name:"create_task",description:"Create a new task/to-do.",input_schema:{type:"object",properties:{text:{type:"string"},assignees:{type:"array",items:{type:"string"}},due:{type:"string"},priority:{type:"string"},status:{type:"string"},job_id:{type:"string"}},required:["text"]}},
    {name:"add_note",description:"Create a note.",input_schema:{type:"object",properties:{title:{type:"string"},content:{type:"string"},folder:{type:"string"}},required:["content"]}},
    {name:"update_payment_status",description:"Update payment status on a job.",input_schema:{type:"object",properties:{job_id:{type:"string"},status:{type:"string"},amount:{type:"number"},method:{type:"string"}},required:["job_id","status"]}},
    {name:"create_payment_link",description:"Create a Stripe payment link for a job's invoice. Returns a payment URL to share with the customer.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name"}},required:["job_id"]}},
    {name:"add_vendor",description:"Add a new vendor/manufacturer to the directory.",input_schema:{type:"object",properties:{name:{type:"string"},category:{type:"string",description:"e.g. Furniture, Cafeteria, STEM, Technology"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},discount_rate:{type:"number",description:"Decimal, e.g. 0.35 for 35%"}},required:["name"]}},
    {name:"update_vendor",description:"Update an existing vendor's info (discount rate, contact, email, category, etc).",input_schema:{type:"object",properties:{vendor_name:{type:"string",description:"Vendor name to find"},updates:{type:"object",properties:{name:{type:"string"},category:{type:"string"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},discountRate:{type:"number"}}}},required:["vendor_name","updates"]}},
    {name:"add_customer",description:"Add a new customer/organization to the directory.",input_schema:{type:"object",properties:{name:{type:"string"},type:{type:"string",description:"School District, Private School, Charter School, University, Other"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},address:{type:"string"}},required:["name"]}},
    {name:"update_customer",description:"Update an existing customer's info.",input_schema:{type:"object",properties:{customer_name:{type:"string"},updates:{type:"object",properties:{name:{type:"string"},type:{type:"string"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},address:{type:"string"}}}},required:["customer_name","updates"]}},
    {name:"create_sop",description:"Create a new SOP/playbook document.",input_schema:{type:"object",properties:{title:{type:"string"},category:{type:"string",description:"Company, Workflow, Financial, Operations, Strategic, Custom"},content:{type:"string",description:"The full SOP content"}},required:["title","content"]}},
    {name:"conditional_update",description:"Find all jobs matching a condition, then update them. Use for: 'For every job that is In Progress with all items received, change phase to Delivered' or 'Mark all jobs with payment status partial as paid'. First finds matching jobs and shows them, then updates on confirm.",input_schema:{type:"object",properties:{condition_description:{type:"string",description:"Human-readable description of the condition"},filters:{type:"object",description:"Filter criteria to match jobs",properties:{phase:{type:"string"},paymentStatus:{type:"string"},all_items_received:{type:"boolean",description:"true to match only jobs where qtyReceived >= qtyOrdered for ALL items"},has_invoiced_items:{type:"boolean"},customer_name:{type:"string"},rep_name:{type:"string"}}},updates:{type:"object",description:"What to change on matched jobs",properties:{phase:{type:"string"},paymentStatus:{type:"string"},notes:{type:"string"},dueDate:{type:"string"}}}},required:["condition_description","filters","updates"]}},
    {name:"generate_document",description:"Generate and open a document preview (invoice, quote, or PO) for a specific job. Use when user says 'generate invoice for X', 'create the quote for Y', 'show me the PO for Z'. This navigates to the Documents page and opens the document preview.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},doc_type:{type:"string",description:"invoice, quote, or po"}},required:["job_id","doc_type"]}},
    {name:"delete_job",description:"Delete a job and all its line items. Use when user says 'delete this job', 'remove the test job', etc. Always confirm the job name before deleting.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"}},required:["job_id"]}},
    {name:"duplicate_job",description:"Duplicate a job with all its line items, customer, and rep. Resets phase to Quoting and payment to unpaid. Use when user says 'duplicate this job', 'copy the job for next year', 'clone this project'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords to duplicate"},new_name:{type:"string",description:"Optional new name for the duplicated job. If not provided, appends ' (Copy)' to the original name."}},required:["job_id"]}},
    {name:"search_and_report",description:"Search and filter jobs, vendors, customers, or line items by complex criteria and return a formatted report. Use for 'list all jobs over $50K', 'show me vendors with spend over $10K', 'find all unpaid jobs for College of DuPage', 'which jobs have the lowest margin'.",input_schema:{type:"object",properties:{entity:{type:"string",description:"What to search: jobs, vendors, customers, or items"},filters:{type:"object",description:"Filter criteria",properties:{min_revenue:{type:"number"},max_revenue:{type:"number"},min_margin:{type:"number"},max_margin:{type:"number"},phase:{type:"string"},paymentStatus:{type:"string"},customer_name:{type:"string"},vendor_name:{type:"string"},rep_name:{type:"string"},min_spend:{type:"number",description:"For vendors: minimum total spend across all jobs"}}},sort_by:{type:"string",description:"Sort field: revenue, cost, margin, name, spend"},limit:{type:"number",description:"Max results to return (default 20)"}},required:["entity"]}},
    {name:"add_line_items",description:"Add one or more line items to a job. Use when user says 'add 20 desks to the Lincoln job at $297 each', 'add a line item for chairs', etc.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},items:{type:"array",description:"Array of items to add",items:{type:"object",properties:{description:{type:"string"},manufacturer:{type:"string"},model_number:{type:"string"},color:{type:"string"},quantity:{type:"number"},unit_price:{type:"number",description:"Customer price per unit"},unit_cost:{type:"number",description:"Dealer cost per unit"},vendor_name:{type:"string",description:"Vendor/manufacturer name"}}}}},required:["job_id","items"]}},
    {name:"navigate_to_page",description:"Navigate to a page in the app.",input_schema:{type:"object",properties:{page:{type:"string"}},required:["page"]}},
    {name:"save_memory",description:"Save or update a persistent memory that the Brain remembers across all future conversations. Use PROACTIVELY to remember user preferences, business patterns, vendor quirks, customer preferences, seasonal patterns, key decisions, frequently asked questions. Categories: UserPreferences, BusinessPatterns, VendorIntel, CustomerIntel, Decisions, FrequentQueries, SeasonalNotes, ProcessNotes, FinancialPatterns.",input_schema:{type:"object",properties:{category:{type:"string"},content:{type:"string"},metadata:{type:"object"}},required:["category","content"]}},
    {name:"recall_memory",description:"Search saved memories. Check what you already know before answering recurring questions.",input_schema:{type:"object",properties:{query:{type:"string"}},required:["query"]}},
    {name:"detect_anomalies",description:"Scan all business data for anomalies: overdue payments, stalled jobs, price mismatches, missing deliveries, margin outliers, vendor concentration risk. Returns prioritized findings.",input_schema:{type:"object",properties:{focus:{type:"string",description:"payments, deliveries, margins, vendors, all"}},required:[]}},
    {name:"analyze_trends",description:"Analyze business trends: revenue by month, vendor spend patterns, margin trends, rep performance, seasonal cycles.",input_schema:{type:"object",properties:{metric:{type:"string",description:"revenue, margins, vendor_spend, rep_performance, customer_growth"},period:{type:"string",description:"monthly, quarterly, ytd, all_time"}},required:["metric"]}},
    {name:"workflow_trigger",description:"Execute multi-step workflow automations. Examples: flag all overdue invoices and draft collection emails, find all received-but-not-invoiced items, check jobs past due and create tasks.",input_schema:{type:"object",properties:{workflow:{type:"string"},dry_run:{type:"boolean",description:"If true, preview without executing"}},required:["workflow"]}},
    {name:"summarize_context",description:"Generate a comprehensive briefing on any job, vendor, customer, or the entire business. Use for 'brief me on X', 'what do I need to know about Y'.",input_schema:{type:"object",properties:{entity_type:{type:"string",description:"job, vendor, customer, rep, or business"},entity_name:{type:"string",description:"Name or ID. Use 'all' for full business briefing."}},required:["entity_type"]}},
    {name:"predictive_flag",description:"Surface jobs/customers/vendors at risk. Predicts payment delays, delivery misses, margin erosion. Uses historical patterns and current data.",input_schema:{type:"object",properties:{focus:{type:"string",description:"payment_risk, delivery_risk, margin_risk, cash_flow, all"}},required:["focus"]}},
    {name:"database_query",description:"Run a structured query against the live database. Query jobs, line_items, vendors, customers, reps tables with filters. Use for complex lookups like 'how many jobs created in March' or 'total cost of all items from Virco'.",input_schema:{type:"object",properties:{table:{type:"string",description:"jobs, line_items, vendors, customers, reps, sops"},filters:{type:"object",description:"Key:value filter pairs. Keys are field names."},order_by:{type:"string"},limit:{type:"number",description:"Max rows (default 50)"}},required:["table"]}},
    {name:"parse_uploaded_file",description:"Parse and extract data from an uploaded file (PDF, image, CSV, Excel) using Claude Vision or structured parsing. Returns structured JSON.",input_schema:{type:"object",properties:{file_url:{type:"string",description:"Public URL of the uploaded file"},file_type:{type:"string",description:"pdf, image, csv, excel, json"},scan_type:{type:"string",description:"vendor_invoice, delivery_receipt, quote_document, customer_list, vendor_list, general"},extra_context:{type:"string"}},required:["file_url","file_type"]}},
    {name:"create_job_from_file",description:"Create a complete new job with line items extracted from an attached file (quote, invoice, spreadsheet). Use this when user attaches a file and says 'create a job from this', 'import this quote', 'add this to the system', etc. Extracts all line items and creates everything in one action.",input_schema:{type:"object",properties:{job_name:{type:"string",description:"Name for the new job"},customer_name:{type:"string",description:"Customer/school name"},sales_rep_name:{type:"string",description:"Sales rep name"},items:{type:"array",description:"Line items extracted from the file",items:{type:"object",properties:{description:{type:"string"},manufacturer:{type:"string"},model_number:{type:"string"},color:{type:"string"},quantity:{type:"number"},list_price:{type:"number"},unit_cost:{type:"number",description:"Dealer net cost per unit"},unit_price:{type:"number",description:"Customer sell price per unit"},shipping:{type:"number"},install:{type:"number"},tag:{type:"string"},vendor_name:{type:"string"}}}},notes:{type:"string"},terms:{type:"string",description:"Net 30, Net 15, Due Upon Receipt"},po_number:{type:"string"}},required:["job_name","items"]}},
    {name:"compare_quote_to_job",description:"Compare an attached vendor quote/price list against an existing job's line items. Finds matching products and highlights price differences, missing items, and potential savings. Use when user says 'compare this quote to job X', 'check these prices against the Hopewell job', etc.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name to compare against"},items:{type:"array",description:"Items extracted from the attached file to compare",items:{type:"object",properties:{description:{type:"string"},model_number:{type:"string"},manufacturer:{type:"string"},unit_cost:{type:"number"},unit_price:{type:"number"},quantity:{type:"number"}}}}},required:["job_id","items"]}},
    {name:"import_customers_from_file",description:"Import customers/schools from an attached file (CSV, Excel, or list). Creates customer records in the directory. Use when user attaches a customer list, school directory, or district roster.",input_schema:{type:"object",properties:{customers:{type:"array",items:{type:"object",properties:{name:{type:"string"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},type:{type:"string",description:"K-12 District, Private School, University, Government, Corporate"},address:{type:"string"}}}}},required:["customers"]}},
    {name:"import_vendors_from_file",description:"Import vendors/manufacturers from an attached file. Creates vendor records in the directory.",input_schema:{type:"object",properties:{vendors:{type:"array",items:{type:"object",properties:{name:{type:"string"},contact:{type:"string"},email:{type:"string"},phone:{type:"string"},category:{type:"string"},address:{type:"string"},discount_rate:{type:"number",description:"Decimal e.g. 0.40 for 40%"}}}}},required:["vendors"]}},
    {name:"set_doc_status",description:"Set the status of a document (quote, PO, invoice, commission statement). Use when user says 'mark the Hopewell quote as sent', 'approve the PO for Marco', 'set the invoice to drafted'. Statuses: new, drafted, sent, approved.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name"},doc_type:{type:"string",description:"quote, po, invoice, commission"},vendor_name:{type:"string",description:"For POs: which vendor's PO to update"},status:{type:"string",description:"new, drafted, sent, approved"}},required:["job_id","doc_type","status"]}},
    {name:"calculate_financials",description:"Calculate detailed financial breakdown for a job or across all jobs. Returns revenue, cost, margin, shipping total, install total, commission, and per-vendor breakdown. Use for 'what's the margin on Hopewell', 'break down costs by vendor', 'what's our total commission exposure'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name. Use 'all' for entire business."},include_vendor_breakdown:{type:"boolean",description:"Include per-vendor cost breakdown"}},required:["job_id"]}},
    {name:"schedule_followup",description:"Create a follow-up task tied to a job with a specific due date. Use when user says 'remind me to follow up on the Lincoln quote next Tuesday', 'schedule a check-in with Naperville in 2 weeks'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name"},text:{type:"string",description:"What to follow up on"},due_date:{type:"string",description:"Due date (YYYY-MM-DD or relative like 'next Tuesday', '2 weeks')"},assignee:{type:"string",description:"Who to assign to"}},required:["text","due_date"]}},
    {name:"export_data",description:"Export job line items, vendor list, customer list, or financial summary as a formatted table the user can copy. Use when user says 'export the Hopewell items', 'give me a vendor list I can copy', 'export all jobs as a table'.",input_schema:{type:"object",properties:{type:{type:"string",description:"job_items, jobs_list, vendors, customers, reps, financials"},job_id:{type:"string",description:"For job_items: which job"},format:{type:"string",description:"table (markdown) or csv"}},required:["type"]}},
    {name:"create_transaction",description:"Create a banking transaction (expense or revenue) on the Financials page. Use when user says 'add an expense for $500 rent', 'log a payment of $1200 from customer', 'record a $300 office supply purchase', 'add a deposit of $5000'.",input_schema:{type:"object",properties:{description:{type:"string",description:"What the transaction is for"},amount:{type:"number",description:"Dollar amount (positive number)"},type:{type:"string",description:"expense or revenue",enum:["expense","revenue"]},category:{type:"string",description:"Category like Operating - Rent, COGS - Vendor Payments, Revenue - Product Sales, etc."},date:{type:"string",description:"Date in YYYY-MM-DD format. Defaults to today."},account:{type:"string",description:"Account name like Operating, Savings, Credit Card, Payroll. Defaults to Operating."}},required:["description","amount"]}},
    {name:"categorize_transaction",description:"Change the category on an existing banking transaction. Use when user says 'categorize the Chesapeake payment as insurance', 'change the United Airlines charge to travel', 'mark that $500 as rent'.",input_schema:{type:"object",properties:{transaction_description:{type:"string",description:"Description keywords to find the transaction"},category:{type:"string",description:"New category to assign"},date:{type:"string",description:"Date to narrow search if needed"}},required:["transaction_description","category"]}},
    {name:"get_banking_summary",description:"Get a summary of banking transactions -- totals by category, recent transactions, account balances, cash flow. Use when user says 'what did we spend this month', 'show me our expenses by category', 'what is our cash position', 'banking summary', 'how much have we spent on rent'.",input_schema:{type:"object",properties:{period:{type:"string",description:"month, quarter, ytd, year, all. Defaults to ytd."},category_filter:{type:"string",description:"Optional: filter to a specific category"}},required:[]}},
    {name:"get_payables_summary",description:"Get accounts payable / vendor bills summary -- what is owed, what is overdue, upcoming payments. Use when user says 'what do we owe vendors', 'show overdue bills', 'AP aging', 'what bills are due this week'.",input_schema:{type:"object",properties:{},required:[]}},
    {name:"draft_email",description:"Draft an email for the user to review before sending. ALWAYS use this first when the user asks to write, draft, compose, or send an email. The user reviews the draft inline and clicks Send to actually send it. Use when user says 'draft an email to', 'write an email to', 'compose an email to', 'email maureen about', 'send an email to' (still drafts first for safety). The recipient can be specified by name (looks up customer/vendor/rep email) or direct email address.",input_schema:{type:"object",properties:{recipient_email:{type:"string",description:"Direct email address. Use this if user provides one explicitly."},customer_name:{type:"string",description:"Customer name to look up email for. Use if user references a customer."},vendor_name:{type:"string",description:"Vendor name to look up email for."},rep_name:{type:"string",description:"Sales rep name to look up email for."},subject:{type:"string",description:"Email subject line"},body:{type:"string",description:"Plain text email body. Will be formatted into a clean HTML email automatically. Use natural paragraph breaks. End with 'Best regards,' on its own line, then 'Midwest Educational Furnishings' on the next line. Do not sign with a personal name -- always sign off as the business."}},required:["subject","body"]}},
    {name:"send_email",description:"Send an email IMMEDIATELY without showing a draft preview first. Only use this when the user explicitly says 'send right now', 'send it without showing me', or has just reviewed a draft and confirms 'send it'. Default to draft_email instead -- it is much safer. Same recipient/content schema as draft_email.",input_schema:{type:"object",properties:{recipient_email:{type:"string",description:"Direct email address."},customer_name:{type:"string",description:"Customer name to look up email for."},vendor_name:{type:"string",description:"Vendor name to look up email for."},rep_name:{type:"string",description:"Sales rep name to look up email for."},subject:{type:"string",description:"Email subject line"},body:{type:"string",description:"Plain text email body."}},required:["subject","body"]}},
    {name:"list_prospects",description:"List/search/filter prospects on the Prospects board. Returns a count and a sample of matching records as a markdown table. Use when user says \'show me prospects\', \'list Illinois prospects\', \'find prospects at Chicago Public Schools\', \'how many prospects in Wisconsin\'. Use a high limit (or omit) for an unfiltered count; use small limit for a sample.",input_schema:{type:"object",properties:{state:{type:"string",description:"Filter by state name, e.g. Illinois, Wisconsin. Partial match supported. Empty string matches blank state."},status:{type:"string",description:"Filter by prospect status: New, Contacted, Replied, Meeting Set, Proposal, Won, Lost, Nurture"},company_contains:{type:"string",description:"Substring match on company name (case-insensitive)"},name_contains:{type:"string",description:"Substring match on contact name (case-insensitive)"},assigned_rep_name:{type:"string",description:"Filter by assigned rep name (case-insensitive partial match)"},unassigned_only:{type:"boolean",description:"If true, only return prospects with no assigned rep"},limit:{type:"number",description:"Max records to show in the sample table (default 25, max 100)"}},required:[]}},
    {name:"update_prospect",description:"Update a single prospect record. Find the prospect by name + company (or email). Updates ONE prospect; if more than one matches the identifier the tool returns an error listing the candidates so you can disambiguate. Use when user says \'mark Mark Altmayer as Contacted\', \'change the email on the Huntley contact to ...\', \'assign Dave to the Chicago prospects\' (use bulk_update_prospects for the last one if it spans many).",input_schema:{type:"object",properties:{prospect_id:{type:"string",description:"Internal prospect ID (PROS-...) if known"},name:{type:"string",description:"Contact name to match exactly or partially"},company:{type:"string",description:"Company name to disambiguate when multiple people share a name"},email:{type:"string",description:"Email address to match exactly"},updates:{type:"object",description:"Fields to update. Any subset of: status, notes, assignedRep (rep ID or name), state, city, title, email, phone, linkedin, website, employees, tier, rank, address",properties:{status:{type:"string"},notes:{type:"string"},assignedRep:{type:"string"},state:{type:"string"},city:{type:"string"},title:{type:"string"},email:{type:"string"},phone:{type:"string"},linkedin:{type:"string"},website:{type:"string"},employees:{type:"string"},tier:{type:"string"},rank:{type:"number"},address:{type:"string"},name:{type:"string"},company:{type:"string"}}}},required:["updates"]}},
    {name:"delete_prospect",description:"Delete a SINGLE prospect record permanently. Find by name+company or email. Returns an error if more than one record matches the identifier so you can disambiguate. For deleting many at once (e.g. \'remove all Ohio prospects\') use bulk_delete_prospects instead. Use when user says \'delete this prospect\', \'remove Mark Altmayer from prospects\'.",input_schema:{type:"object",properties:{prospect_id:{type:"string",description:"Internal prospect ID (PROS-...) if known"},name:{type:"string",description:"Contact name to match"},company:{type:"string",description:"Company name to disambiguate"},email:{type:"string",description:"Email to match exactly"}},required:[]}},
    {name:"bulk_update_prospects",description:"Apply the same update to every prospect matching a filter. Use for sweeps like \'mark all Wisconsin prospects as Nurture\', \'assign Dave to all Cook County prospects\'. Requires confirm:true to actually apply; without confirm it returns a dry-run preview showing how many records would be affected.",input_schema:{type:"object",properties:{filter:{type:"object",description:"Match criteria. Combine multiple for AND logic.",properties:{state:{type:"string"},status:{type:"string"},company_contains:{type:"string"},name_contains:{type:"string"},assigned_rep_name:{type:"string"},unassigned_only:{type:"boolean"}}},updates:{type:"object",description:"Fields to apply to every matched prospect",properties:{status:{type:"string"},notes:{type:"string"},assignedRep:{type:"string"},state:{type:"string"},city:{type:"string"},tier:{type:"string"}}},confirm:{type:"boolean",description:"Must be true to actually apply. Without confirm, returns a dry-run preview."}},required:["filter","updates"]}},
    {name:"bulk_delete_prospects",description:"Delete every prospect matching a filter, in one operation. Use for cleanup like \'delete all prospects outside Illinois and Wisconsin\', \'remove every Ohio and Michigan prospect\', \'clear out all Lost prospects from last year\'. Requires confirm:true to actually delete; without confirm it returns a dry-run preview showing exactly how many records and which states/statuses would be affected. ALWAYS run the dry-run first and surface the count to the user before deleting.",input_schema:{type:"object",properties:{filter:{type:"object",description:"Match criteria. Combine multiple for AND logic. Use exclude_states to delete everything except the listed states (the common Maureen-style cleanup).",properties:{state:{type:"string",description:"Match prospects in this state"},exclude_states:{type:"array",items:{type:"string"},description:"Keep these states, delete everything else. E.g. [\"Illinois\",\"Wisconsin\"] deletes all non-IL/WI prospects."},status:{type:"string"},company_contains:{type:"string"},name_contains:{type:"string"},assigned_rep_name:{type:"string"},unassigned_only:{type:"boolean"}}},confirm:{type:"boolean",description:"Must be true to actually delete. Without confirm, returns a dry-run preview."}},required:["filter"]}},
    // ==============================================================
    // VENDOR BILLS, CREDITS, AND STANDALONE BILLS (16 tools, May 20 2026)
    // ==============================================================
    // Vendor Bills: queries
    {name:"list_vendor_bills",description:"List vendor bills with rich filters. Returns a markdown table. Use when the user says 'show me unpaid bills', 'what bills are due this week', 'list all bills from Marco Group', 'overdue bills', 'show me bills for the Sandburg job', 'show deleted bills'. Bills include both PO-derived bills (auto-generated from purchase orders) and standalone bills (created ad-hoc). Default behavior with no filters returns the 25 most-due-soon unpaid bills.",input_schema:{type:"object",properties:{vendor_name:{type:"string",description:"Filter by vendor name (partial match, case-insensitive)"},job_id:{type:"string",description:"Filter by job ID or name keywords"},status:{type:"string",description:"unpaid | paid | overdue | check_sent | void | deleted | all (default: unpaid)"},due_within_days:{type:"number",description:"Only show bills due within N days from today"},date_from:{type:"string",description:"Bill date from (YYYY-MM-DD)"},date_to:{type:"string",description:"Bill date to (YYYY-MM-DD)"},has_file:{type:"boolean",description:"true to show only bills with attached invoice files, false to show only bills without"},amount_min:{type:"number",description:"Minimum bill amount"},amount_max:{type:"number",description:"Maximum bill amount"},limit:{type:"number",description:"Max rows to return (default 25)"}}}},
    {name:"get_vendor_bill",description:"Get the full record of a vendor bill by its docNum (e.g. BILL-1234-VENDR or a standalone SB-/VC- id). Returns bill details, line items if PO-derived, payment history, and attached file info. Use when user says 'show me bill BILL-6100-SUKI', 'pull up the Doane Keyes bill on G103', 'get the full record for the Marco credit'.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string",description:"The billDocNum (e.g. BILL-1234-VENDR) or standalone SOP id (e.g. SB-xxxxxx, VC-xxxxxx)"}},required:["bill_doc_num"]}},
    {name:"search_bills_by_amount",description:"Find bills within a dollar amount range. Useful for fuzzy lookups like 'find that ~$5K Marco bill' or 'show me all bills between $1000 and $2000'. Searches both unpaid and paid bills unless status is specified.",input_schema:{type:"object",properties:{amount_min:{type:"number",description:"Minimum amount"},amount_max:{type:"number",description:"Maximum amount"},vendor_name:{type:"string",description:"Optional vendor name filter (partial match)"},status:{type:"string",description:"unpaid | paid | all (default: all)"}},required:["amount_min","amount_max"]}},
    {name:"get_bills_summary",description:"Get aggregate totals across all vendor bills: total owed, total paid YTD, total overdue, count of unpaid bills, total credits. Can be broken down by vendor or by job. Use when user says 'how much do we owe vendors right now', 'what is the total outstanding to Marco', 'give me a bills summary', 'how much have we paid out this year'.",input_schema:{type:"object",properties:{group_by:{type:"string",description:"Optional: 'vendor' or 'job' to break down totals by that dimension"},job_id:{type:"string",description:"Optional: restrict summary to a single job"},vendor_name:{type:"string",description:"Optional: restrict summary to a single vendor (partial match)"}}}},
    // Vendor Bills: actions
    {name:"mark_bill_paid",description:"Mark a vendor bill as paid. Sets status to paid, records check number, pay date, and optional memo. Use when user says 'mark the Marco bill paid with check 1234', 'log payment on BILL-6100-SUKI'. If no pay_date provided, defaults to today.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string",description:"The billDocNum or standalone SOP id"},check_num:{type:"string",description:"Check number (optional but recommended)"},pay_date:{type:"string",description:"Payment date YYYY-MM-DD (defaults to today)"},memo:{type:"string",description:"Optional payment memo"}},required:["bill_doc_num"]}},
    {name:"void_bill",description:"Void a vendor bill (set status to void). Works on BOTH PO-derived bills (BILL-...) and standalone bills (SB-...). The bill stays on record for the audit trail but stops counting toward job cost and Total Owed. Reversible via unvoid_bill. Use when a bill was a duplicate or entered in error.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"},memo:{type:"string",description:"Optional reason for voiding"}},required:["bill_doc_num"]}},
    {name:"unvoid_bill",description:"Reverse a void on a bill (PO-derived or standalone), returning it to unpaid status.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"}},required:["bill_doc_num"]}},
    {name:"restore_deleted_bill",description:"Restore a bill that was previously deleted, KEEPING all prior data (payment info, invoice attachment, memo, check number). Equivalent to clicking the green Restore button on the deleted bill row. Use when user says 'restore the bill that was accidentally deleted', 'bring back BILL-XXXX'.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"}},required:["bill_doc_num"]}},
    {name:"reset_and_restore_bill",description:"Restore a deleted bill as a FRESH unpaid bill, WIPING all prior data (paid status, payment date, check number, invoice attachment, memo, date overrides). Use when prior bill data was wrong (e.g. wrong invoice attached, paid status was a mistake). Equivalent to clicking the yellow Reset & Restore button.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"}},required:["bill_doc_num"]}},
    {name:"attach_file_to_bill",description:"Attach a PDF or image file to a vendor bill. Uploads to the vendor-invoices storage bucket and links it to the bill. THREE sources, in order of preference: (1) if the user attached the file in THIS chat (paperclip) or loaded it from the Files page, call with JUST bill_doc_num -- the most recently attached file is used automatically; (2) a public file_url; (3) file_base64 with file_name and content_type. Use when user says 'attach this PDF to BILL-XXXX', 'add this invoice to the bill'.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"},file_url:{type:"string",description:"Public URL of the file to fetch and re-upload"},file_base64:{type:"string",description:"Alternative to file_url: base64-encoded file content"},file_name:{type:"string",description:"Required when using file_base64; recommended for file_url"},content_type:{type:"string",description:"MIME type (e.g. application/pdf, image/jpeg)"}},required:["bill_doc_num"]}},
    {name:"update_bill_details",description:"Update details on an existing PO-tied vendor bill: vendor invoice number, memo, bill date, and due date. Use when user says 'add invoice number 771566 to BILL-6289-SUKI', 'set the vendor invoice number on that bill', 'change the memo'. For standalone bills (SB-/VC- records) use update_vendor_credit. For attaching a PDF use attach_file_to_bill.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string",description:"The bill doc number (e.g. BILL-6289-SUKI)"},vendor_invoice_num:{type:"string",description:"The vendor's invoice number to record on the bill"},memo:{type:"string"},bill_date:{type:"string",description:"Bill date YYYY-MM-DD"},due_date:{type:"string",description:"Due date YYYY-MM-DD"}},required:["bill_doc_num"]}},
    {name:"update_bill_due_date",description:"Override a bill's due date. Stored as a date-override key separate from the bill record so it can be cleared without touching payment data. Use when user says 'push the Marco bill due date out to June 15', 'change the due date on BILL-XXXX'.",input_schema:{type:"object",properties:{bill_doc_num:{type:"string"},due_date:{type:"string",description:"New due date YYYY-MM-DD. Pass an empty string to clear the override and revert to the default (bill date + 30 days)."}},required:["bill_doc_num","due_date"]}},
    {name:"batch_mark_paid",description:"Mark multiple bills paid in one operation. Provide an array of bill_doc_nums, or a filter (vendor + status) to select bills. Set check_num if paying via one check, or method='ach' for ACH. Requires confirm:true to actually apply; without confirm returns a dry-run preview with the count and total.",input_schema:{type:"object",properties:{bill_doc_nums:{type:"array",items:{type:"string"},description:"Explicit list of bill docNums to mark paid"},filter:{type:"object",properties:{vendor_name:{type:"string"},job_id:{type:"string"},status:{type:"string",description:"Filter to unpaid | check_sent | overdue (default unpaid)"}}},check_num:{type:"string",description:"Check number to apply to all selected bills"},method:{type:"string",description:"'check' | 'ach' | 'wire' (defaults to check if check_num provided, else ach)"},pay_date:{type:"string",description:"YYYY-MM-DD, defaults to today"},memo:{type:"string"},confirm:{type:"boolean",description:"Must be true to actually mark paid. Without confirm, returns dry-run preview."}}}},
    // Vendor Credits & Standalone Bills
    {name:"create_vendor_credit",description:"Create a new vendor credit attached to a project. Credits reduce the project's cost and lift margin. Use when a vendor issues a credit memo (e.g. Marco Group credited $1,245.94 for damaged goods on Sandburg MS).",input_schema:{type:"object",properties:{vendor_name:{type:"string",description:"Vendor name (partial match)"},job_id:{type:"string",description:"Job ID or name keywords"},amount:{type:"number",description:"Credit amount in dollars"},credit_date:{type:"string",description:"YYYY-MM-DD (defaults to today)"},ref_number:{type:"string",description:"Vendor credit memo number / reference"},memo:{type:"string",description:"Notes about the credit"},file_url:{type:"string",description:"Optional URL of the credit memo PDF to attach"}},required:["vendor_name","job_id","amount"]}},
    {name:"record_bill_against_po",description:"Enter/record a vendor bill AGAINST an existing purchase order -- the PO-tied bill flow, identical to opening the PO's bill in Documents >> Vendor Bills and entering it. This ATTACHES the bill to the project: the amount reconciles against the cost already on the job's line items instead of adding new cost. ALWAYS PREFER this over create_standalone_bill when the job has a PO for that vendor. Calling it again on an existing bill UPDATES it in place -- e.g. to add the vendor invoice number or correct dates after creation. Use when user says 'enter the Doane Keyes invoice against the PO', 'record bill 771566 on PO-6289-SUKI', 'attach this vendor invoice to the job', 'enter this bill on the project'.",input_schema:{type:"object",properties:{po_doc_num:{type:"string",description:"The PO doc number (e.g. PO-6289-SUKI). If unknown, provide job_id and vendor_name instead."},job_id:{type:"string",description:"Job ID or name keywords -- used with vendor_name to find the PO when po_doc_num is not given"},vendor_name:{type:"string",description:"Vendor name (partial match) -- used with job_id to find the PO"},vendor_invoice_num:{type:"string",description:"The vendor's invoice number to record on the bill"},bill_date:{type:"string",description:"Bill date YYYY-MM-DD (sets the bill date override)"},due_date:{type:"string",description:"Due date YYYY-MM-DD (defaults to bill date + 30 days)"},memo:{type:"string",description:"Optional memo"}}}},
    {name:"create_standalone_bill",description:"Create a standalone vendor bill not tied to a PO. ONLY for charges with no purchase order behind them (one-off vendor charges, freight that arrived without a PO, rebill scenarios). IMPORTANT: standalone bills ADD cost on top of the job's line items. If the job has a PO for this vendor, use record_bill_against_po instead so the bill reconciles against existing cost rather than inflating it.",input_schema:{type:"object",properties:{vendor_name:{type:"string"},job_id:{type:"string"},amount:{type:"number"},bill_date:{type:"string",description:"YYYY-MM-DD (defaults to today)"},ref_number:{type:"string",description:"Vendor invoice number"},memo:{type:"string"},file_url:{type:"string",description:"Optional URL of the bill PDF to attach"}},required:["vendor_name","job_id","amount"]}},
    {name:"update_vendor_credit",description:"Update an existing vendor credit or standalone bill record. Match by sop_id (VC-xxx or SB-xxx) or by vendor + job + approximate amount. Fields: amount, ref_number, memo, credit_date, paid status.",input_schema:{type:"object",properties:{sop_id:{type:"string",description:"The credit/bill SOP id (VC-xxxxxx or SB-xxxxxx)"},vendor_name:{type:"string",description:"Vendor name for disambiguation when sop_id is unknown"},job_id:{type:"string",description:"Job for disambiguation"},updates:{type:"object",properties:{amount:{type:"number"},ref_number:{type:"string"},memo:{type:"string"},credit_date:{type:"string"},paid:{type:"boolean"},pay_date:{type:"string"},check_num:{type:"string"}}}},required:["updates"]}},
    {name:"delete_vendor_credit",description:"Delete a vendor credit or standalone bill record. Permanent. Match by sop_id, or by vendor + job + amount. The underlying job/PO/line items are untouched.",input_schema:{type:"object",properties:{sop_id:{type:"string",description:"The credit/bill SOP id"},vendor_name:{type:"string"},job_id:{type:"string"},amount:{type:"number",description:"Used with vendor+job to disambiguate"}}}},
    {name:"list_vendor_credits",description:"List vendor credits and standalone bills with filters. Returns a markdown table. Use when user says 'show me all open credits', 'list Marco credits', 'what credits do we have on the Sandburg job'.",input_schema:{type:"object",properties:{vendor_name:{type:"string"},job_id:{type:"string"},kind:{type:"string",description:"'credit' | 'standalone_bill' | 'all' (default all)"},applied_status:{type:"string",description:"'applied' to show only credits applied to a specific bill, 'unapplied' for unapplied, 'all' for both (default all)"},limit:{type:"number"}}}},
    {name:"apply_credit_to_bill",description:"Explicitly link a vendor credit to a specific bill. The credit will be shown on the bill detail view and counted against that bill's owed amount. Use when user says 'apply the Marco credit to BILL-XXXX'.",input_schema:{type:"object",properties:{credit_sop_id:{type:"string",description:"The VC-xxxxxx SOP id of the credit"},bill_doc_num:{type:"string",description:"The bill to link the credit to"}},required:["credit_sop_id","bill_doc_num"]}},
    {name:"find_unmatched_credits",description:"Find vendor credits that have NOT been applied to a specific bill. Useful when reviewing what credits are still available to apply, or auditing unallocated credits at month-end. Returns a markdown table sorted by amount desc.",input_schema:{type:"object",properties:{vendor_name:{type:"string",description:"Optional vendor name filter"},job_id:{type:"string",description:"Optional job filter"}}}},
    // ==============================================================
    // PURCHASE ORDERS (6 tools, May 21 2026)
    // ==============================================================
    {name:"list_pos",description:"List purchase orders with filters. Returns a markdown table. Use when user says 'show me all open POs', 'list POs for Marco Group', 'what POs are still in new status', 'show me the POs for the Sandburg job'. PO status reflects docStatuses: new (default, not yet drafted), drafted, sent, approved.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords (partial match)"},vendor_name:{type:"string",description:"Vendor name (partial match)"},status:{type:"string",description:"new | drafted | sent | approved | all (default: all)"},older_than_days:{type:"number",description:"Only show POs created more than N days ago"},limit:{type:"number",description:"Max rows to return (default 30)"}}}},
    {name:"get_po",description:"Get the full record of a purchase order by its docNum (e.g. PO-1234-VENDR or PO-1234-VENDR-Sxxxx for ship-to variants). Returns vendor info, job info, all line items with cost/qty/received status, total, and current PO status. Use when user says 'pull up PO-1234-MARCO', 'show me the McCourt PO on North Shore'.",input_schema:{type:"object",properties:{po_doc_num:{type:"string",description:"The PO docNum (PO-XXXX-YYYY or with -SXXXX ship-to suffix)"}},required:["po_doc_num"]}},
    {name:"update_po_status",description:"Set the status of a purchase order to drafted, sent, or approved. Use when user says 'mark PO-XXXX as sent', 'approve the Marco PO on Sandburg'. Once a PO transitions to drafted/sent/approved, the corresponding vendor bill becomes visible in the Vendor Bills tab.",input_schema:{type:"object",properties:{po_doc_num:{type:"string"},status:{type:"string",description:"new | drafted | sent | approved"}},required:["po_doc_num","status"]}},
    {name:"mark_items_received",description:"Bump qtyReceived on one or more line items on a job. The programmatic equivalent of clicking Receive in the Delivery Tracker. Items can be selected by job + description keywords, or by item_id. If quantity is omitted, marks the item fully received (qtyReceived = qtyOrdered). Use when user says 'log 25 chairs received on Sandburg', 'mark the McCourt freight as received', 'receive all items on PO-XXXX'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords (used with item_description to find items)"},po_doc_num:{type:"string",description:"Alternative: receive items on a specific PO"},item_description:{type:"string",description:"Keywords matching the line item description (omit to apply to all items on the job/PO)"},item_id:{type:"string",description:"Direct line item ID (overrides job+description matching)"},quantity:{type:"number",description:"Number of units received this time. Omit to mark fully received (qtyReceived = qtyOrdered)."},delivery_date:{type:"string",description:"Optional delivery date (YYYY-MM-DD, defaults to today)"}}}},
    {name:"create_po_from_quote",description:"Promote all of a job's POs from 'new' to 'drafted' once the underlying quote is approved or sent. This is the programmatic equivalent of opening each PO in the UI and saving the draft. Side effect: makes the associated vendor bills appear in the Vendor Bills tab. Use when user says 'draft all POs on Sandburg', 'now that the quote is approved, push the POs', 'create POs for this job'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"}},required:["job_id"]}},
    {name:"find_pos_awaiting_action",description:"Find purchase orders that are stuck in a state requiring action: created but never drafted, drafted but never sent, sent but never approved. Returns a markdown table sorted by age. Use when user says 'what POs need attention', 'find stuck POs', 'show me POs that have been sitting in new for a week'.",input_schema:{type:"object",properties:{older_than_days:{type:"number",description:"Only flag POs older than this many days (default 7)"},stuck_in_status:{type:"string",description:"Filter to POs stuck in a single status: new | drafted | sent (default: any of the above)"}}}},
    // ==============================================================
    // CUSTOMER INVOICES (7 tools, May 21 2026)
    // ==============================================================
    {name:"list_invoices",description:"List customer invoices with filters. Each job has an invoice (INV-XXXX docNum). Status reflects docStatuses (drafted/sent/approved) AND job.paymentStatus (unpaid/partial/paid). Use when user says 'show me unpaid invoices', 'list invoices for Pewaukee', 'what invoices have been sent but not paid'.",input_schema:{type:"object",properties:{customer_name:{type:"string",description:"Customer name (partial match)"},job_id:{type:"string",description:"Job ID or name keywords"},status:{type:"string",description:"unpaid | paid | partial | sent | drafted | overdue | all (default: unpaid)"},limit:{type:"number"}}}},
    {name:"generate_invoice",description:"Generate a customer invoice for a job in one of five modes. PARTIAL (default): invoice only items where qtyReceived > qtyInvoiced. FULL: invoice all ordered quantities (used when allReceived). ADVANCE: real invoice for items not yet shipped (prepay scenarios), bumps qtyInvoiced to qtyOrdered when accepted. PROFORMA: non-financial 'for approval' invoice. CREDIT_MEMO: credit against prior invoice. Sets the invoice docStatus to 'drafted' and (for ADVANCE) bumps qtyInvoiced on items. Use when user says 'generate an invoice for X', 'create the advance invoice for Y', 'draft a proforma for Z'.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},mode:{type:"string",description:"partial | full | advance | proforma | credit_memo (default: partial)"},mark_qty_invoiced:{type:"boolean",description:"For advance mode: if true, bumps qtyInvoiced = qtyOrdered on all items (recording the bill as issued). Defaults to true for advance, false for proforma/credit_memo."}},required:["job_id"]}},
    {name:"mark_all_invoiced_for_job",description:"Set qtyInvoiced = qtyOrdered on every line item for a job. The programmatic equivalent of the 'Mark All Invoiced' button in the invoice preview. Use after generating a full or advance invoice to record that the customer has been billed for all items. Use when user says 'mark everything invoiced on Sandburg', 'we billed them in full'.",input_schema:{type:"object",properties:{job_id:{type:"string"}},required:["job_id"]}},
    {name:"send_invoice_email",description:"Draft an email to the customer with the invoice information. The email is staged in the Brain's pending email panel for the user to review, edit, and send (not sent automatically). Use when user says 'email the Sandburg invoice', 'send the invoice to the Pewaukee contact'. The draft prefills to the customer's on-file email and pulls the invoice docNum + total into the subject/body.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},custom_message:{type:"string",description:"Optional additional message to include in the email body"},from_email:{type:"string",description:"Sender email address (e.g. mwelter@mwfurnishings.com)"}},required:["job_id"]}},
    {name:"record_payment",description:"Log a customer payment against a job's invoice. Sets job.paymentStatus and records payment metadata (date, amount, method, ref). Use when user says 'log $5,000 payment on Sandburg via check 8421', 'mark Pewaukee paid in full'. If amount equals or exceeds invoiced total, sets status to paid; otherwise partial.",input_schema:{type:"object",properties:{job_id:{type:"string"},amount:{type:"number",description:"Payment amount in dollars"},pay_date:{type:"string",description:"YYYY-MM-DD (defaults to today)"},method:{type:"string",description:"check | ach | wire | card | cash"},reference:{type:"string",description:"Check number, transaction ID, etc."},memo:{type:"string"}},required:["job_id","amount"]}},
    {name:"find_overdue_invoices",description:"Find customer invoices that are past their payment terms. Returns aging buckets (1-30, 31-60, 60+ days overdue) with total outstanding per bucket. Use when user says 'show me overdue invoices', 'who owes us money', 'aging report'. Only considers jobs with hasInvoiced (qtyInvoiced > 0) and paymentStatus != 'paid'.",input_schema:{type:"object",properties:{customer_name:{type:"string",description:"Optional customer name filter"},min_days_overdue:{type:"number",description:"Only show invoices overdue by at least this many days"}}}},
    {name:"generate_payment_reminder_email",description:"Draft a warm-but-firm payment reminder email for an overdue invoice. Stages the draft in the Brain's pending email panel for the user to review and send. Use when user says 'draft a reminder for the Pewaukee overdue invoice', 'send a payment reminder to Hopewell Valley'. Pulls customer contact, terms, amount owed, days overdue automatically.",input_schema:{type:"object",properties:{job_id:{type:"string",description:"Job ID or name keywords"},tone:{type:"string",description:"warm (default) | firm | final"},from_email:{type:"string"}},required:["job_id"]}}
  ];


  // Execute a tool call locally
  const executeTool=async(toolName,input)=>{
    try{
      if(toolName==="update_job"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        updateJob(job.id,input.updates||{});
        return{success:true,message:"Updated "+job.name+": "+Object.entries(input.updates||{}).map(([k,v])=>k+"="+v).join(", ")};
      }
      if(toolName==="create_job"){
        const id="JOB-"+new Date().getFullYear()+"-"+String(jobs.length+1).padStart(3,"0");
        const cust=input.customer_name?findCustomer(input.customer_name):null;
        const rep=input.sales_rep_name?reps.find(r=>r.name.toLowerCase().includes(input.sales_rep_name.toLowerCase())):null;
        addJob({id,name:input.name,customer:cust?.id||"",salesRep:rep?.id||"",phase:input.phase||"Quoting",paymentStatus:"unpaid",notes:input.notes||""});
        return{success:true,message:"Created job: "+input.name+" ("+id+")"+(cust?" for "+cust.name:"")+(rep?" rep: "+rep.name:"")};
      }
      if(toolName==="update_line_item"){
        let item=null;
        if(input.item_id)item=lineItems.find(i=>i.id===input.item_id);
        if(!item&&input.job_id&&input.item_description){
          const job=findJob(input.job_id);
          if(!job)return{error:"Job not found: "+input.job_id};
          const jobItems=getJobItems(job.id);
          const desc=(input.item_description||'').toLowerCase();
          item=jobItems.find(i=>i.description.toLowerCase().includes(desc))||jobItems.find(i=>(i.modelNumber||'').toLowerCase().includes(desc))||jobItems.find(i=>(i.manufacturer||'').toLowerCase().includes(desc));
        }
        if(!item)return{error:"Line item not found. Provide item_id or job_id + item_description."};
        updateLineItem(item.id,input.updates||{});
        return{success:true,message:"Updated line item: "+item.description+" on job "+item.jobId};
      }
      if(toolName==="get_job_details"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const items=getJobItems(job.id);
        const f=getJobFinancials(job.id);
        const cust=customers.find(c=>c.id===job.customer);
        const rep=reps.find(r=>r.id===job.salesRep);
        const clean=(s)=>(s||'--').replace(/\n/g,' ').replace(/\r/g,'').replace(/\|/g,'/').replace(/\s+/g,' ').trim()||'--';
        let msg="**"+job.name+"** ("+job.id+")\n";
        msg+="Customer: "+(cust?.name||"--")+" | Rep: "+(rep?.name||"--")+" | Phase: "+job.phase+" | Payment: "+job.paymentStatus+"\n";
        msg+="Revenue: $"+f.totalRevenue.toFixed(2)+" | Cost: $"+f.totalCost.toFixed(2)+" | Margin: "+f.margin.toFixed(1)+"% | Items: "+items.length+"\n";
        if(job.terms)msg+="Terms: "+job.terms+(job.poNumber?" | PO#: "+job.poNumber:"")+(job.dueDate?" | Due: "+job.dueDate:"")+"\n";
        msg+="\n| # | Description | Vendor | Model | Color | Qty | Cost | Price | Line Total | Received | Status |\n";
        msg+="| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";
        items.forEach((it,idx)=>{
          const v=vendors.find(v2=>v2.id===it.vendor);
          const total=((it.priceExtended&&it.priceExtended>0)?it.priceExtended:(it.unitPrice||0)*(it.qtyOrdered||0));
          const status=it.qtyReceived>=it.qtyOrdered?"complete":it.qtyReceived>0?"partial":"ordered";
          msg+="| "+(idx+1)+" | "+clean(it.description)+" | "+clean(v?.name||it.manufacturer)+" | "+clean(it.modelNumber)+" | "+clean(it.color)+" | "+it.qtyOrdered+" | $"+(it.unitCost||0).toFixed(2)+" | $"+(it.unitPrice||0).toFixed(2)+" | $"+total.toFixed(2)+" | "+it.qtyReceived+"/"+it.qtyOrdered+" | "+status+" |\n";
        });
        msg+="\nYou can ask me to update any line item by description (e.g. 'change the desk price to $300') or make bulk changes.";
        return{success:true,message:msg};
      }
      if(toolName==="bulk_edit_line_items"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const allItems=getJobItems(job.id);
        const filter=(input.filter_description||'').toLowerCase();
        const targets=filter?allItems.filter(i=>i.description.toLowerCase().includes(filter)||(i.manufacturer||'').toLowerCase().includes(filter)||(i.modelNumber||'').toLowerCase().includes(filter)):allItems;
        if(targets.length===0)return{error:"No items matched filter: "+(input.filter_description||"(all)")};
        let ct=0;const u=input.updates||{};
        targets.forEach(item=>{
          const changes={};
          if(u.qtyReceived!==undefined)changes.qtyReceived=u.qtyReceived;
          if(u.unitPrice!==undefined)changes.unitPrice=u.unitPrice;
          if(u.unitCost!==undefined)changes.unitCost=u.unitCost;
          if(u.shippingPerUnit!==undefined)changes.shippingPerUnit=u.shippingPerUnit;
          if(u.installPerUnit!==undefined)changes.installPerUnit=u.installPerUnit;
          if(u.price_multiply)changes.unitPrice=Math.round(item.unitPrice*u.price_multiply*100)/100;
          if(u.cost_multiply)changes.unitCost=Math.round(item.unitCost*u.cost_multiply*100)/100;
          if(Object.keys(changes).length>0){updateLineItem(item.id,changes);ct++}
        });
        return{success:true,message:"Updated "+ct+" line items on "+job.name+(filter?" (filter: "+input.filter_description+")":"")};
      }
      if(toolName==="log_delivery"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const items=getJobItems(job.id);
        const kw=(input.item_description||"").toLowerCase();
        const item=items.find(i=>i.description.toLowerCase().includes(kw))||items.find(i=>{const words=kw.split(/\s+/);return words.some(w=>w.length>2&&i.description.toLowerCase().includes(w))});
        if(!item)return{error:"No line item matching '"+input.item_description+"' on "+job.name+". Items: "+items.map(i=>i.description).join(", ")};
        const qty=input.quantity||0;
        const newRcv=Math.min(item.qtyReceived+qty,item.qtyOrdered);
        updateLineItem(item.id,{qtyReceived:newRcv,deliveryDate:new Date().toISOString().split("T")[0]});
        return{success:true,message:"Logged "+qty+" received for '"+item.description+"' on "+job.name+" (now "+newRcv+"/"+item.qtyOrdered+")"};
      }
      if(toolName==="bulk_update_jobs"){
        const f=input.filter||{};const u=input.updates||{};
        let matched=jobs;
        if(f.phase)matched=matched.filter(j=>j.phase.toLowerCase()===f.phase.toLowerCase());
        if(f.paymentStatus)matched=matched.filter(j=>j.paymentStatus===f.paymentStatus);
        if(f.all_delivered)matched=matched.filter(j=>{const items=getJobItems(j.id);return items.length>0&&items.every(i=>i.qtyReceived>=i.qtyOrdered)});
        if(matched.length===0)return{error:"No jobs matched the filter: "+JSON.stringify(f)};
        matched.forEach(j=>updateJob(j.id,u));
        return{success:true,message:"Updated "+matched.length+" jobs: "+matched.map(j=>j.name).join(", ")+" >> "+Object.entries(u).map(([k,v])=>k+"="+v).join(", ")};
      }
      if(toolName==="create_task"){
        const id="TASK-"+Math.random().toString(36).slice(2,8);
        const job=input.job_id?findJob(input.job_id):null;
        addSop({id,title:input.text||"Untitled",cat:"Task",icon:"check",content:JSON.stringify({text:input.text,assignees:input.assignees||[],due:input.due||"",priority:input.priority||"normal",status:input.status||"To Do",jobId:job?.id||"",jobName:job?.name||"",notes:"",link:""}),custom:true});
        return{success:true,message:"Created task: "+input.text+(input.assignees?.length?" (assigned to "+input.assignees.join(", ")+")":"")+(input.due?" due "+input.due:"")};
      }
      if(toolName==="add_note"){
        const id="NOTE-"+Math.random().toString(36).slice(2,8);
        const title=input.title||(input.content||"").split("\n")[0].slice(0,60)||"Untitled";
        addSop({id,title,cat:"Notes",icon:"file",content:JSON.stringify({text:input.content,folder:input.folder||"General",date:new Date().toISOString()}),custom:true});
        return{success:true,message:"Note saved: "+title};
      }
      if(toolName==="update_payment_status"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        updateJob(job.id,{paymentStatus:input.status,endDate:input.status==="paid"?new Date().toISOString().split("T")[0]:job.endDate||""});
        return{success:true,message:job.name+" payment >> "+input.status};
      }
      if(toolName==="create_payment_link"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const f=getJobFinancials(job.id);const cust=customers.find(c=>c.id===job.customer);
        if(f.totalRevenue<=0)return{error:job.name+" has $0 revenue -- cannot create payment link"};
        try{
          const r=await fetch("/api/stripe-pay",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create_checkout",job_name:job.name,customer_name:cust?.name||"",customer_email:cust?.email||"",amount_cents:Math.round(f.totalRevenue*100),job_id:job.id})});
          const data=await r.json();
          if(data.url)return{success:true,message:"Payment link created for "+job.name+" ($"+f.totalRevenue.toLocaleString()+"): "+data.url,paymentUrl:data.url};
          return{error:"Stripe error: "+(data.error||"Failed")};
        }catch(err){return{error:"Stripe error: "+err.message}}
      }
      if(toolName==="add_vendor"){
        const existing=vendors.find(v=>v.name.toLowerCase()===input.name.toLowerCase());
        if(existing)return{error:"Vendor already exists: "+existing.name};
        const id="V-"+Date.now()+"-"+Math.random().toString(36).slice(2,6);
        addVendor({id,name:input.name,category:input.category||"Furniture",contact:input.contact||"",email:input.email||"",phone:input.phone||"",discountRate:input.discount_rate||0});
        return{success:true,message:"Added vendor: "+input.name+(input.category?" ("+input.category+")":"")+(input.discount_rate?" at "+Math.round(input.discount_rate*100)+"% discount":"")};
      }
      if(toolName==="update_vendor"){
        const v=findVendor(input.vendor_name);
        if(!v)return{error:"Vendor not found: "+input.vendor_name};
        updateVendor(v.id,input.updates||{});
        return{success:true,message:"Updated "+v.name+": "+Object.entries(input.updates||{}).map(([k,val])=>k+"="+val).join(", ")};
      }
      if(toolName==="add_customer"){
        const existing=customers.find(c=>c.name.toLowerCase()===input.name.toLowerCase());
        if(existing)return{error:"Customer already exists: "+existing.name};
        const id="C-"+Date.now()+"-"+Math.random().toString(36).slice(2,6);
        addCustomer({id,name:input.name,type:input.type||"School District",contact:input.contact||"",email:input.email||"",phone:input.phone||"",address:input.address||""});
        return{success:true,message:"Added customer: "+input.name+(input.type?" ("+input.type+")":"")};
      }
      if(toolName==="update_customer"){
        const c=findCustomer(input.customer_name);
        if(!c)return{error:"Customer not found: "+input.customer_name};
        updateCustomer(c.id,input.updates||{});
        return{success:true,message:"Updated "+c.name+": "+Object.entries(input.updates||{}).map(([k,val])=>k+"="+val).join(", ")};
      }
      if(toolName==="create_sop"){
        const id="SOP-"+Math.random().toString(36).slice(2,8);
        addSop({id,title:input.title,cat:input.category||"Custom",icon:"file",content:input.content,custom:true});
        return{success:true,message:"Created SOP: "+input.title+" ["+( input.category||"Custom")+"]"};
      }
      if(toolName==="conditional_update"){
        const f=input.filters||{};const u=input.updates||{};
        let matched=[...jobs];
        if(f.phase)matched=matched.filter(j=>j.phase.toLowerCase()===f.phase.toLowerCase());
        if(f.paymentStatus)matched=matched.filter(j=>j.paymentStatus===f.paymentStatus);
        if(f.all_items_received)matched=matched.filter(j=>{const items=getJobItems(j.id);return items.length>0&&items.every(i=>i.qtyReceived>=i.qtyOrdered)});
        if(f.has_invoiced_items)matched=matched.filter(j=>{const items=getJobItems(j.id);return items.some(i=>i.qtyInvoiced>0)});
        if(f.customer_name){const cn=f.customer_name.toLowerCase();matched=matched.filter(j=>{const c=customers.find(c2=>c2.id===j.customer);return c&&c.name.toLowerCase().includes(cn)})}
        if(f.rep_name){const rn=f.rep_name.toLowerCase();matched=matched.filter(j=>{const r=reps.find(r2=>r2.id===j.salesRep);return r&&r.name.toLowerCase().includes(rn)})}
        if(matched.length===0)return{error:"No jobs matched: "+input.condition_description+". Filters: "+JSON.stringify(f)};
        matched.forEach(j=>updateJob(j.id,u));
        const details=matched.map(j=>{const c=customers.find(c2=>c2.id===j.customer);return j.name+(c?" ("+c.name+")":"")}).join(", ");
        return{success:true,message:"Condition: "+input.condition_description+"\nMatched "+matched.length+" jobs: "+details+"\nApplied: "+Object.entries(u).map(([k,v])=>k+" >> "+v).join(", ")};
      }
      if(toolName==="generate_document"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const dt=(input.doc_type||"").toLowerCase();
        // Navigate to documents page and set up for the right tab
        if(setPage)setPage("documents");
        // Store the target document info globally so DocumentsPage can pick it up
        window._brainDocTarget={jobId:job.id,docType:dt,timestamp:Date.now()};
        const docLabel=dt==="invoice"?"Invoice":dt==="quote"?"Quote":dt==="po"?"Purchase Orders":"Document";
        return{success:true,message:"Opening "+docLabel+" for "+job.name+". Navigate to the "+docLabel+" tab in Documents to view and export it."};
      }
      if(toolName==="delete_job"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const jobItems=getJobItems(job.id);
        jobItems.forEach(i=>deleteLineItem(i.id));
        deleteJob(job.id);
        return{success:true,message:"Deleted job '"+job.name+"' and "+jobItems.length+" line items."};
      }
      if(toolName==="duplicate_job"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const newId="JOB-"+new Date().getFullYear()+"-"+String(jobs.length+1).padStart(3,"0");
        const newName=input.new_name||job.name+" (Copy)";
        addJob({id:newId,name:newName,customer:job.customer,salesRep:job.salesRep,phase:"Quoting",paymentStatus:"unpaid",notes:job.notes||"",terms:job.terms||"Net 30",shipTo:job.shipTo||"",billTo:job.billTo||""});
        const srcItems=getJobItems(job.id);
        let ct=0;
        srcItems.forEach(item=>{
          const newItemId=newId+"-item-"+String(ct+1).padStart(3,"0");
          addLineItem({id:newItemId,jobId:newId,description:item.description,vendor:item.vendor,tag:item.tag||"",manufacturer:item.manufacturer||"",modelNumber:item.modelNumber||"",color:item.color||"",unitCost:item.unitCost,unitPrice:item.unitPrice,shippingPerUnit:item.shippingPerUnit||0,installPerUnit:item.installPerUnit||0,qtyOrdered:item.qtyOrdered,qtyReceived:0,qtyInvoiced:0,listPrice:item.listPrice||0});
          ct++;
        });
        const cust=customers.find(c=>c.id===job.customer);
        return{success:true,message:"Duplicated '"+job.name+"' as '"+newName+"' ("+newId+") with "+ct+" line items. Phase: Quoting. Customer: "+(cust?.name||"same")+"."};
      }
      if(toolName==="search_and_report"){
        const f=input.filters||{};const entity=(input.report_type||"jobs").toLowerCase();const limit=input.limit||20;
        if(entity==="jobs"||entity==="job"){
          let results=[...jobs];
          if(f.phase)results=results.filter(j=>j.phase.toLowerCase()===f.phase.toLowerCase());
          if(f.paymentStatus)results=results.filter(j=>j.paymentStatus===f.paymentStatus);
          if(f.customer_name){const cn=f.customer_name.toLowerCase();results=results.filter(j=>{const c=customers.find(c2=>c2.id===j.customer);return c&&c.name.toLowerCase().includes(cn)})}
          if(f.rep_name){const rn=f.rep_name.toLowerCase();results=results.filter(j=>{const r=reps.find(r2=>r2.id===j.salesRep);return r&&r.name.toLowerCase().includes(rn)})}
          results=results.map(j=>{const fin=getJobFinancials(j.id);const c=customers.find(c2=>c2.id===j.customer);const r=reps.find(r2=>r2.id===j.salesRep);return{...j,revenue:fin.totalRevenue,cost:fin.totalCost,margin:fin.margin,customerName:c?.name||"",repName:r?.name||""}});
          if(f.min_revenue)results=results.filter(j=>j.revenue>=f.min_revenue);
          if(f.max_revenue)results=results.filter(j=>j.revenue<=f.max_revenue);
          if(f.min_margin)results=results.filter(j=>j.margin>=f.min_margin);
          if(f.max_margin)results=results.filter(j=>j.margin<=f.max_margin);
          const sortKey=input.sort_by||"revenue";
          results.sort((a,b)=>(b[sortKey]||0)-(a[sortKey]||0));
          results=results.slice(0,limit);
          if(results.length===0)return{success:true,message:"No jobs matched the criteria."};
          const report=results.map((j,i)=>(i+1)+". **"+j.name+"** | "+j.phase+" | Rev: $"+Math.round(j.revenue).toLocaleString()+" | Cost: $"+Math.round(j.cost).toLocaleString()+" | Margin: "+j.margin.toFixed(1)+"% | Pay: "+j.paymentStatus+" | Customer: "+j.customerName+" | Rep: "+j.repName).join("\n");
          return{success:true,message:"Found "+results.length+" jobs:\n\n"+report};
        }
        if(entity==="vendors"||entity==="vendor"){
          let results=vendors.map(v=>{const spend=lineItems.filter(i=>i.vendor===v.id||i.vendor===v.name).reduce((s,i)=>s+(i.unitCost||0)*i.qtyOrdered,0);const jobCount=new Set(lineItems.filter(i=>i.vendor===v.id||i.vendor===v.name).map(i=>i.jobId)).size;return{...v,spend,jobCount}});
          if(f.min_spend)results=results.filter(v=>v.spend>=f.min_spend);
          if(f.vendor_name)results=results.filter(v=>v.name.toLowerCase().includes(f.vendor_name.toLowerCase()));
          results.sort((a,b)=>b.spend-a.spend);
          results=results.filter(v=>v.spend>0).slice(0,limit);
          if(results.length===0)return{success:true,message:"No vendors matched the criteria."};
          const report=results.map((v,i)=>(i+1)+". **"+v.name+"** | Spend: $"+Math.round(v.spend).toLocaleString()+" | "+v.jobCount+" jobs | Cat: "+(v.category||"--")+" | Discount: "+(v.discountRate?(v.discountRate*100).toFixed(0)+"%":"--")).join("\n");
          return{success:true,message:"Found "+results.length+" vendors:\n\n"+report};
        }
        if(entity==="customers"||entity==="customer"){
          let results=customers.map(c=>{const cJobs=jobs.filter(j=>j.customer===c.id);const revenue=cJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);return{...c,revenue,jobCount:cJobs.length}});
          if(f.customer_name)results=results.filter(c=>c.name.toLowerCase().includes(f.customer_name.toLowerCase()));
          if(f.min_revenue)results=results.filter(c=>c.revenue>=f.min_revenue);
          results.sort((a,b)=>b.revenue-a.revenue);
          results=results.filter(c=>c.revenue>0).slice(0,limit);
          if(results.length===0)return{success:true,message:"No customers matched the criteria."};
          const report=results.map((c,i)=>(i+1)+". **"+c.name+"** | Revenue: $"+Math.round(c.revenue).toLocaleString()+" | "+c.jobCount+" jobs | Type: "+(c.type||"--")).join("\n");
          return{success:true,message:"Found "+results.length+" customers:\n\n"+report};
        }
        return{error:"Unknown entity type: "+entity+". Use: jobs, vendors, or customers"};
      }
      if(toolName==="add_line_items"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const items=input.items||[];
        if(items.length===0)return{error:"No items provided"};
        let ct=0;const existingCount=getJobItems(job.id).length;
        items.forEach((item,idx)=>{
          const itemId=job.id+"-item-"+String(existingCount+idx+1).padStart(3,"0");
          const vendor=item.vendor?findVendor(item.vendor):(item.vendor_name?findVendor(item.vendor_name):null);
          addLineItem({id:itemId,jobId:job.id,description:item.description||"",manufacturer:item.manufacturer||"",modelNumber:item.model_number||"",color:item.color||"",vendor:vendor?.id||item.vendor_name||"",unitPrice:item.unit_price||0,unitCost:item.unit_cost||0,qtyOrdered:item.quantity||1,qtyReceived:0,qtyInvoiced:0,shippingPerUnit:0,installPerUnit:0,listPrice:0,tag:""});
          ct++;
        });
        const totalRev=items.reduce((s,i)=>(s+(i.unit_price||0)*(i.quantity||1)),0);
        return{success:true,message:"Added "+ct+" line item"+(ct!==1?"s":"")+" to "+job.name+":\n"+items.map(i=>"- "+(i.quantity||1)+"x "+(i.description||i.manufacturer||"item")+" @ $"+(i.unit_price||0).toLocaleString()+" each").join("\n")+"\nTotal added: $"+totalRev.toLocaleString()};
      }
      if(toolName==="navigate_to_page"){
        const pageMap={dashboard:"dashboard",jobs:"jobs",documents:"documents",deliveries:"deliveries",financials:"financials",playbook:"playbook",tasks:"tasks",notes:"notes",brain:"brain",commissions:"commissions",salesportal:"salesportal",import:"jobs",sales:"salesportal"};
        const p=pageMap[(input.page||"").toLowerCase()]||input.page;
        if(p&&setPage)setPage(p);
        return{success:true,message:"Navigated to "+p};
      }
      if(toolName==="save_memory"){
        const mem=updateMemory(input.category,input.content,input.metadata);
        return{success:true,message:"Memory saved: ["+input.category+"] "+input.content.slice(0,100)+(input.content.length>100?"...":"")};
      }
      if(toolName==="recall_memory"){
        const q2=(input.query||"").toLowerCase();
        const matches=brainMemory.filter(m=>{const title=(m.title||"").toLowerCase();let text="";try{text=JSON.parse(m.content).text||""}catch{text=m.content||""}text=text.toLowerCase();return q2.split(/\s+/).filter(w=>w.length>2).some(w=>title.includes(w)||text.includes(w))});
        if(matches.length===0)return{success:true,message:"No memories found matching '"+input.query+"'. "+brainMemory.length+" total memories stored."};
        const results=matches.map(m=>{try{const d=JSON.parse(m.content);return"["+m.title+"] "+d.text}catch{return"["+m.title+"] "+m.content}}).join("\n\n");
        return{success:true,message:"Found "+matches.length+" memories:\n\n"+results};
      }
      if(toolName==="detect_anomalies"){
        const findings=[];const focus=(input.focus||"all").toLowerCase();
        if(focus==="all"||focus==="payments"){
          const unpaid=jobs.filter(j=>{if(j.paymentStatus==="paid")return false;const items=getJobItems(j.id);return items.some(i=>i.qtyInvoiced>0)});
          const overdue=unpaid.filter(j=>{const days=j.terms?.includes("15")?15:j.terms?.includes("Receipt")?0:30;const due=new Date(j.createdDate);due.setDate(due.getDate()+days);return new Date()>due});
          if(overdue.length>0)findings.push({severity:"HIGH",area:"Payments",detail:overdue.length+" overdue invoices totaling $"+Math.round(overdue.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)).toLocaleString()});
        }
        if(focus==="all"||focus==="deliveries"){
          const stalled=jobs.filter(j=>{const items=getJobItems(j.id);return j.phase==="Ordered"&&items.length>0&&items.every(i=>i.qtyReceived===0)&&new Date()-new Date(j.createdDate)>14*86400000});
          if(stalled.length>0)findings.push({severity:"MEDIUM",area:"Deliveries",detail:stalled.length+" jobs ordered 14+ days ago with zero deliveries"});
        }
        if(focus==="all"||focus==="margins"){
          const lowMargin=jobs.filter(j=>{const f=getJobFinancials(j.id);return f.totalRevenue>1000&&f.margin<15});
          if(lowMargin.length>0)findings.push({severity:"HIGH",area:"Margins",detail:lowMargin.length+" jobs below 15% margin: "+lowMargin.map(j=>j.name+" ("+getJobFinancials(j.id).margin.toFixed(1)+"%)").join(", ")});
        }
        if(focus==="all"||focus==="vendors"){
          const vs={};lineItems.forEach(i=>{const v=vendors.find(v2=>v2.id===i.vendor);if(v){vs[v.name]=(vs[v.name]||0)+i.unitCost*i.qtyOrdered}});
          const tot=Object.values(vs).reduce((s,v)=>s+v,0);const top=Object.entries(vs).sort((a,b)=>b[1]-a[1])[0];
          if(top&&tot>0&&top[1]/tot>0.4)findings.push({severity:"MEDIUM",area:"Vendors",detail:"Concentration risk: "+top[0]+" = "+Math.round(top[1]/tot*100)+"% of spend"});
        }
        if(findings.length===0)return{success:true,message:"No anomalies detected. Business looks healthy."};
        return{success:true,message:"Found "+findings.length+" items:\n\n"+findings.sort((a,b)=>(a.severity==="HIGH"?0:1)-(b.severity==="HIGH"?0:1)).map(f=>"**["+f.severity+"] "+f.area+":** "+f.detail).join("\n\n")};
      }
      if(toolName==="analyze_trends"){
        const metric=(input.metric||"revenue").toLowerCase();
        if(metric.includes("revenue")){
          const monthly={};jobs.forEach(j=>{const d=new Date(j.createdDate);const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");monthly[key]=(monthly[key]||0)+getJobFinancials(j.id).totalRevenue});
          const sorted=Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0]));
          return{success:true,message:"**Revenue by Month:**\n\n"+sorted.map(([m,v])=>m+": $"+Math.round(v).toLocaleString()).join("\n")+"\n\nTotal: $"+Math.round(sorted.reduce((s,e)=>s+e[1],0)).toLocaleString()};
        }
        if(metric.includes("margin")){
          const jm=jobs.map(j=>({name:j.name,margin:getJobFinancials(j.id).margin,rev:getJobFinancials(j.id).totalRevenue})).filter(j=>j.rev>0).sort((a,b)=>a.margin-b.margin);
          const avg=jm.reduce((s,j)=>s+j.margin,0)/jm.length;
          return{success:true,message:"**Margin Analysis:**\nAvg: "+avg.toFixed(1)+"%\nLowest: "+jm.slice(0,3).map(j=>j.name+" ("+j.margin.toFixed(1)+"%)").join(", ")+"\nHighest: "+jm.slice(-3).reverse().map(j=>j.name+" ("+j.margin.toFixed(1)+"%)").join(", ")};
        }
        if(metric.includes("vendor")){
          const vs={};lineItems.forEach(i=>{const v=vendors.find(v2=>v2.id===i.vendor);if(v){vs[v.name]=(vs[v.name]||0)+i.unitCost*i.qtyOrdered}});
          return{success:true,message:"**Top Vendor Spend:**\n\n"+Object.entries(vs).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,s],i)=>(i+1)+". "+n+": $"+Math.round(s).toLocaleString()).join("\n")};
        }
        if(metric.includes("rep")){
          const rd=reps.filter(r=>!r.id.includes("SEED_FLAG")).map(r=>{const rj=jobs.filter(j=>j.salesRep===r.id);return{name:r.name,jobs:rj.length,rev:rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)}}).sort((a,b)=>b.rev-a.rev);
          return{success:true,message:"**Rep Performance:**\n\n"+rd.map((r,i)=>(i+1)+". "+r.name+": "+r.jobs+" jobs, $"+Math.round(r.rev).toLocaleString()).join("\n")};
        }
        return{success:true,message:"Available metrics: revenue, margins, vendor_spend, rep_performance"};
      }
      if(toolName==="workflow_trigger"){
        const w=(input.workflow||"").toLowerCase();const results=[];
        if(w.includes("overdue")&&(w.includes("email")||w.includes("remind")||w.includes("collect"))){
          const oj=jobs.filter(j=>{if(j.paymentStatus==="paid")return false;const items=getJobItems(j.id);if(!items.some(i=>i.qtyInvoiced>0))return false;const days=j.terms?.includes("15")?15:j.terms?.includes("Receipt")?0:30;const due=new Date(j.createdDate);due.setDate(due.getDate()+days);return new Date()>due});
          results.push("Found "+oj.length+" overdue jobs:");
          oj.forEach(j=>{const c=customers.find(c2=>c2.id===j.customer);results.push("- "+j.name+" ("+(c?.name||"")+": $"+Math.round(getJobFinancials(j.id).totalRevenue).toLocaleString()+")")});
        } else if(w.includes("uninvoiced")||w.includes("not yet invoiced")||(w.includes("received")&&w.includes("invoice"))){
          const ui=lineItems.filter(i=>i.qtyReceived>i.qtyInvoiced);const byJob={};
          ui.forEach(i=>{const j=jobs.find(j2=>j2.id===i.jobId);byJob[j?.name||i.jobId]=(byJob[j?.name||i.jobId]||[]);byJob[j?.name||i.jobId].push(i)});
          results.push("Found "+ui.length+" items received but not invoiced:");
          Object.entries(byJob).forEach(([n,items])=>{results.push("- "+n+": "+items.length+" items, $"+Math.round(items.reduce((s,i)=>s+i.unitPrice*(i.qtyReceived-i.qtyInvoiced),0)).toLocaleString())});
        } else {results.push("Available workflows: overdue collection emails, uninvoiced items flagging, past-due task creation")}
        if(input.dry_run!==false)results.push("\n**DRY RUN** -- no actions taken.");
        return{success:true,message:results.join("\n")};
      }
      if(toolName==="summarize_context"){
        const type=(input.entity_type||"").toLowerCase();
        if(type==="business"||input.entity_name==="all"){
          const tr=jobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const tc=jobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
          const phases={};jobs.forEach(j=>{phases[j.phase]=(phases[j.phase]||0)+1});
          return{success:true,message:"**BUSINESS BRIEFING**\n\nPipeline: "+jobs.length+" jobs | $"+Math.round(tr).toLocaleString()+" revenue | "+(tr>0?((tr-tc)/tr*100).toFixed(1):0)+"% margin\nBy Phase: "+Object.entries(phases).map(([p,c])=>p+": "+c).join(", ")+"\nVendors: "+vendors.length+" | Customers: "+customers.length+" | Reps: "+reps.filter(r=>!r.id.includes("SEED_FLAG")).length+"\nItems: "+lineItems.length+" total, "+lineItems.filter(i=>i.qtyOrdered>i.qtyReceived).length+" pending delivery"};
        }
        if(type==="job"){const job=findJob(input.entity_name);if(!job)return{error:"Job not found"};const f=getJobFinancials(job.id);const items=getJobItems(job.id);const c=customers.find(c2=>c2.id===job.customer);const r=reps.find(r2=>r2.id===job.salesRep);return{success:true,message:"**JOB: "+job.name+"**\n"+job.phase+" | "+(job.paymentStatus||"unpaid")+"\nCustomer: "+(c?.name||"--")+" | Rep: "+(r?.name||"--")+"\nRev: $"+Math.round(f.totalRevenue).toLocaleString()+" | Cost: $"+Math.round(f.totalCost).toLocaleString()+" | Margin: "+f.margin.toFixed(1)+"%\nItems: "+items.length+", "+f.totalReceived+"/"+f.totalOrdered+" received"+(job.notes?"\nNotes: "+job.notes:"")};}
        if(type==="vendor"){const v=findVendor(input.entity_name);if(!v)return{error:"Vendor not found"};const vi=lineItems.filter(i=>i.vendor===v.id);const spend=vi.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);return{success:true,message:"**VENDOR: "+v.name+"**\n"+v.category+" | Discount: "+(v.discountRate*100).toFixed(0)+"%\nContact: "+(v.contact||"--")+" | "+(v.email||"--")+"\nSpend: $"+Math.round(spend).toLocaleString()+" across "+[...new Set(vi.map(i=>i.jobId))].length+" jobs"};}
        if(type==="customer"){const c2=findCustomer(input.entity_name);if(!c2)return{error:"Customer not found"};const cj=jobs.filter(j=>j.customer===c2.id);return{success:true,message:"**CUSTOMER: "+c2.name+"**\n"+c2.type+" | "+(c2.email||"--")+" | "+(c2.phone||"--")+"\nJobs: "+cj.length+" | Revenue: $"+Math.round(cj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)).toLocaleString()};}
        return{error:"Use entity_type: job, vendor, customer, or business"};
      }
      if(toolName==="predictive_flag"){
        const flags=[];const f2=(input.focus||"all").toLowerCase();
        if(f2.includes("payment")||f2==="all"){
          jobs.filter(j=>j.paymentStatus!=="paid"&&getJobItems(j.id).some(i=>i.qtyInvoiced>0)).forEach(j=>{
            const days=Math.round((new Date()-new Date(j.createdDate))/86400000);
            if(days>45)flags.push({risk:"HIGH",type:"Payment",detail:j.name+": $"+Math.round(getJobFinancials(j.id).totalRevenue).toLocaleString()+" unpaid "+days+" days"});
            else if(days>30)flags.push({risk:"MEDIUM",type:"Payment",detail:j.name+": approaching overdue at "+days+" days"});
          });
        }
        if(f2.includes("delivery")||f2==="all"){
          jobs.filter(j=>["Ordered","In Production"].includes(j.phase)).forEach(j=>{
            const pending=getJobItems(j.id).filter(i=>i.qtyOrdered>i.qtyReceived);
            if(pending.length>0&&j.dueDate){const dt=Math.round((new Date(j.dueDate)-new Date())/86400000);
              if(dt<0)flags.push({risk:"HIGH",type:"Delivery",detail:j.name+": PAST DUE "+Math.abs(dt)+" days, "+pending.length+" items pending"});
              else if(dt<7)flags.push({risk:"HIGH",type:"Delivery",detail:j.name+": due in "+dt+" days, "+pending.length+" items pending"});
            }
          });
        }
        if(f2.includes("margin")||f2==="all"){
          jobs.forEach(j=>{const ff=getJobFinancials(j.id);if(ff.totalRevenue>5000&&ff.margin<10)flags.push({risk:"HIGH",type:"Margin",detail:j.name+": "+ff.margin.toFixed(1)+"% on $"+Math.round(ff.totalRevenue).toLocaleString()})});
        }
        if(flags.length===0)return{success:true,message:"No significant risks detected."};
        return{success:true,message:"**RISK FLAGS** ("+flags.length+"):\n\n"+flags.sort((a,b)=>(a.risk==="HIGH"?0:1)-(b.risk==="HIGH"?0:1)).map(f=>"**["+f.risk+"] "+f.type+":** "+f.detail).join("\n\n")};
      }
      if(toolName==="database_query"){
        try{
          const table=input.table||"jobs";let data2;
          if(table==="jobs")data2=jobs;else if(table==="line_items")data2=lineItems;else if(table==="vendors")data2=vendors;else if(table==="customers")data2=customers;else if(table==="reps")data2=reps.filter(r=>!r.id.includes("SEED_FLAG"));else return{error:"Invalid table"};
          if(input.filters){Object.entries(input.filters).forEach(([k,v])=>{data2=data2.filter(row=>{const rv=row[k]||row[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]||"";if(typeof v==="string")return String(rv).toLowerCase().includes(v.toLowerCase());return rv===v})});}
          data2=data2.slice(0,input.limit||50);
          if(data2.length===0)return{success:true,message:"No results in "+table+"."};
          if(table==="jobs")return{success:true,message:"Found "+data2.length+" jobs:\n"+data2.map(j=>{const f=getJobFinancials(j.id);return j.name+" ["+j.phase+"] $"+Math.round(f.totalRevenue).toLocaleString()+" "+f.margin.toFixed(1)+"% "+j.paymentStatus}).join("\n")};
          if(table==="line_items")return{success:true,message:"Found "+data2.length+" items:\n"+data2.map(i=>(i.description||'').replace(/\n/g,' ').trim()+" qty:"+i.qtyOrdered+" $"+i.unitPrice).join("\n")};
          if(table==="vendors")return{success:true,message:"Found "+data2.length+" vendors:\n"+data2.map(v=>v.name+" ["+v.category+"] "+(v.discountRate*100).toFixed(0)+"%").join("\n")};
          return{success:true,message:"Found "+data2.length+" records:\n"+JSON.stringify(data2.slice(0,10),null,2).slice(0,2000)};
        }catch(e){return{error:"Query error: "+e.message}}
      }
      if(toolName==="parse_uploaded_file"){
        try{
          if(!input.file_url)return{error:"file_url required"};
          const ft=(input.file_type||"").toLowerCase();
          if(ft==="csv"||ft==="json"){
            const resp=await fetch(input.file_url);if(!resp.ok)return{error:"Could not fetch file"};
            const text=await resp.text();
            if(ft==="json"){try{return{success:true,message:"Parsed JSON:\n"+JSON.stringify(JSON.parse(text),null,2).slice(0,3000)}}catch(e2){return{error:"Invalid JSON"}}}
            const rows=text.split("\n").filter(r=>r.trim());
            return{success:true,message:"CSV: "+rows.length+" rows. Header: "+rows[0]+"\nFirst 20:\n"+rows.slice(0,21).join("\n").slice(0,3000)};
          }
          const resp=await fetch(input.file_url);if(!resp.ok)return{error:"Could not fetch file"};
          const blob=await resp.blob();const reader=new FileReader();
          const base64=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result.split(",")[1]);reader.onerror=rej;reader.readAsDataURL(blob)});
          const sr=await fetch("/api/ai-scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_data:base64,media_type:blob.type||"application/pdf",scan_type:input.scan_type||"general",extra_context:input.extra_context||""})});
          const sd=await sr.json();if(sd.error)return{error:"Scan error: "+(sd.error.message||JSON.stringify(sd.error))};
          return{success:true,message:"Parsed:\n"+(sd.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n").slice(0,4000)};
        }catch(e3){return{error:"Parse error: "+e3.message}}
      }
      if(toolName==="create_job_from_file"){
        try{
          const maxNum=jobs.reduce((mx,j)=>{const m=j.id.match(/JOB-\d+-(\d+)/);return m?Math.max(mx,parseInt(m[1])):mx},0);
          const jid='JOB-2026-'+String(maxNum+1).padStart(3,'0');
          const custMatch=input.customer_name?customers.find(c=>c.name.toLowerCase().includes(input.customer_name.toLowerCase())):null;
          const repMatch=input.sales_rep_name?reps.find(r=>r.name.toLowerCase().includes(input.sales_rep_name.toLowerCase())):null;
          let custId=custMatch?.id||'';
          if(input.customer_name&&!custMatch){custId='C-'+Date.now();addCustomer({id:custId,name:input.customer_name,contact:'',email:'',phone:'',type:'K-12 District',address:''})}
          addJob({id:jid,name:input.job_name,customer:custId,salesRep:repMatch?.id||reps[0]?.id||'',phase:'Quoting',createdDate:new Date().toISOString().split('T')[0],startDate:'',dueDate:'',endDate:'',notes:input.notes||'Created from uploaded file via Brain',paymentStatus:'unpaid',terms:input.terms||'Net 30',poNumber:input.po_number||'',shipTo:'',shipVia:'',billTo:'',orderNotes:'',docStatuses:{},activities:[],auditTrail:[]});
          const existNames=new Set(vendors.map(v=>v.name.toLowerCase().trim()));
          const vMap={};vendors.forEach(v=>{vMap[v.name.toLowerCase().trim()]=v.id});
          let ct=0;
          for(const item of (input.items||[])){
            const mfr=item.manufacturer||item.vendor_name||'';
            const vk=mfr.toLowerCase().trim();
            if(vk&&!existNames.has(vk)){const vid='V-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);addVendor({id:vid,name:mfr,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0});vMap[vk]=vid;existNames.add(vk)}
            addLineItem({jobId:jid,description:item.description||'',vendor:vMap[vk]||'',tag:item.tag||'',group:'',manufacturer:mfr,modelNumber:item.model_number||'',color:item.color||'',listPrice:parseFloat(item.list_price)||0,unitCost:parseFloat(item.unit_cost)||0,unitPrice:parseFloat(item.unit_price)||parseFloat(item.list_price)||0,shippingPerUnit:parseFloat(item.shipping)||0,installPerUnit:parseFloat(item.install)||0,priceExtended:0,qtyOrdered:parseInt(item.quantity)||1,qtyReceived:0,qtyInvoiced:0,poDate:'',deliveryDate:'',invoiceDate:''});
            ct++;
          }
          window._brainNavJob=jid;
          return{success:true,message:'Created job "'+input.job_name+'" ('+jid+') with '+ct+' line items.'+(input.customer_name&&!custMatch?' New customer "'+input.customer_name+'" also created.':'')+' Click "View Job" below to see it.'};        }catch(e){return{error:'Failed to create job: '+e.message}}
      }
      if(toolName==="compare_quote_to_job"){
        try{
          const job=jobs.find(j=>j.id===input.job_id)||jobs.find(j=>j.name.toLowerCase().includes((input.job_id||'').toLowerCase()));
          if(!job)return{error:'Job not found: '+input.job_id};
          const jobItems=getJobItems(job.id);
          const results=[];
          for(const qi of (input.items||[])){
            const match=jobItems.find(ji=>{
              if(qi.model_number&&ji.modelNumber&&ji.modelNumber.toLowerCase()===qi.model_number.toLowerCase())return true;
              if(qi.description&&ji.description.toLowerCase().includes(qi.description.toLowerCase().slice(0,20)))return true;
              return false;
            });
            if(match){
              const costDiff=qi.unit_cost&&match.unitCost?(qi.unit_cost-match.unitCost).toFixed(2):null;
              const priceDiff=qi.unit_price&&match.unitPrice?(qi.unit_price-match.unitPrice).toFixed(2):null;
              results.push((qi.description||qi.model_number)+': MATCH found -- '+(costDiff?'Cost diff: $'+costDiff+' ':'')+(priceDiff?'Price diff: $'+priceDiff:'')+((!costDiff&&!priceDiff)?'prices match':''));
            }else{
              results.push((qi.description||qi.model_number)+': NO MATCH in job');
            }
          }
          return{success:true,message:'Comparison against "'+job.name+'" ('+jobItems.length+' items):\n'+results.join('\n')};
        }catch(e){return{error:'Compare error: '+e.message}}
      }
      if(toolName==="import_customers_from_file"){
        try{
          let ct=0;
          for(const c of (input.customers||[])){
            if(!c.name)continue;
            if(customers.find(ex=>ex.name.toLowerCase()===c.name.toLowerCase()))continue;
            addCustomer({name:c.name,contact:c.contact||'',email:c.email||'',phone:c.phone||'',type:c.type||'K-12 District',address:c.address||''});ct++;
          }
          return{success:true,message:'Imported '+ct+' new customers. '+(input.customers.length-ct)+' skipped (duplicates or missing name).'};
        }catch(e){return{error:'Import error: '+e.message}}
      }
      if(toolName==="import_vendors_from_file"){
        try{
          let ct=0;
          for(const v of (input.vendors||[])){
            if(!v.name)continue;
            if(vendors.find(ex=>ex.name.toLowerCase()===v.name.toLowerCase()))continue;
            addVendor({name:v.name,contact:v.contact||'',email:v.email||'',phone:v.phone||'',category:v.category||'',address:v.address||'',discountRate:parseFloat(v.discount_rate)||0});ct++;
          }
          return{success:true,message:'Imported '+ct+' new vendors. '+(input.vendors.length-ct)+' skipped (duplicates or missing name).'};
        }catch(e){return{error:'Import error: '+e.message}}
      }
      if(toolName==="set_doc_status"){
        const job=findJob(input.job_id);
        if(!job)return{error:"Job not found: "+input.job_id};
        const stableNum2=(prefix,a,b)=>prefix+(a||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(b||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
        let docNum='';
        if(input.doc_type==='quote')docNum=stableNum2('QT-',job.id,job.customer);
        else if(input.doc_type==='invoice')docNum=stableNum2('INV-',job.id,job.customer);
        else if(input.doc_type==='commission'){const rep2=reps.find(r=>r.id===job.salesRep);docNum=stableNum2('COMM-',rep2?.id||'',  'stmt')}
        else if(input.doc_type==='po'&&input.vendor_name){const v=findVendor(input.vendor_name);docNum=stableNum2('PO-',job.id,v?.id||'')}
        else return{error:"For POs, provide vendor_name to identify which PO"};
        const ds={...(job.docStatuses||{}),[docNum]:input.status};
        updateJob(job.id,{docStatuses:ds});
        return{success:true,message:"Set "+input.doc_type+" "+docNum+" to "+input.status+" on "+job.name};
      }
      if(toolName==="calculate_financials"){
        const isAll=!input.job_id||input.job_id==='all';
        const targetJobs=isAll?jobs:[findJob(input.job_id)].filter(Boolean);
        if(targetJobs.length===0)return{error:"Job not found: "+input.job_id};
        let totalRev2=0,totalCost2=0,totalShip=0,totalInstall=0,totalComm=0;
        const vendorSpend={};
        targetJobs.forEach(j=>{
          const f=getJobFinancials(j.id);const items=getJobItems(j.id);
          totalRev2+=f.totalRevenue;totalCost2+=f.totalCost;
          totalShip+=items.reduce((s,i)=>(s+(i.shippingPerUnit||0)*i.qtyOrdered),0);
          totalInstall+=items.reduce((s,i)=>(s+(i.installPerUnit||0)*i.qtyOrdered),0);
          const rep2=reps.find(r=>r.id===j.salesRep);totalComm+=_commissionFor(j.id,rep2?.commissionRate||0);
          if(input.include_vendor_breakdown)items.forEach(i=>{const v=vendors.find(v2=>v2.id===i.vendor);const vn=v?.name||'Unknown';vendorSpend[vn]=(vendorSpend[vn]||0)+i.unitCost*i.qtyOrdered});
        });
        const margin=totalRev2>0?((totalRev2-totalCost2)/totalRev2*100):0;
        let msg="**Financial Summary"+(isAll?" (All Jobs)":" -- "+targetJobs[0].name)+"**\n\n";
        msg+="| Metric | Amount |\n| --- | --- |\n";
        msg+="| Revenue | $"+totalRev2.toFixed(2)+" |\n";
        msg+="| Cost | $"+totalCost2.toFixed(2)+" |\n";
        msg+="| Gross Profit | $"+(totalRev2-totalCost2).toFixed(2)+" |\n";
        msg+="| Margin | "+margin.toFixed(1)+"% |\n";
        msg+="| Shipping | $"+totalShip.toFixed(2)+" |\n";
        msg+="| Install | $"+totalInstall.toFixed(2)+" |\n";
        msg+="| Commission Exposure | $"+totalComm.toFixed(2)+" |\n";
        msg+="| Net After Commission | $"+(totalRev2-totalCost2-totalComm).toFixed(2)+" |\n";
        if(input.include_vendor_breakdown&&Object.keys(vendorSpend).length>0){
          msg+="\n**Vendor Cost Breakdown:**\n\n| Vendor | Spend | % of Cost |\n| --- | --- | --- |\n";
          Object.entries(vendorSpend).sort((a,b)=>b[1]-a[1]).forEach(([vn,s])=>{msg+="| "+vn+" | $"+s.toFixed(2)+" | "+(totalCost2>0?(s/totalCost2*100).toFixed(1):0)+"% |\n"});
        }
        return{success:true,message:msg};
      }
      if(toolName==="schedule_followup"){
        let dueDate=input.due_date;
        // Parse relative dates
        if(dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)){
          const d=new Date();const lower=dueDate.toLowerCase();
          if(lower.includes('tomorrow'))d.setDate(d.getDate()+1);
          else if(lower.includes('next week')||lower.includes('1 week'))d.setDate(d.getDate()+7);
          else if(lower.includes('2 week'))d.setDate(d.getDate()+14);
          else if(lower.includes('next month')||lower.includes('1 month'))d.setMonth(d.getMonth()+1);
          else if(lower.includes('monday'))d.setDate(d.getDate()+((1-d.getDay()+7)%7||7));
          else if(lower.includes('tuesday'))d.setDate(d.getDate()+((2-d.getDay()+7)%7||7));
          else if(lower.includes('wednesday'))d.setDate(d.getDate()+((3-d.getDay()+7)%7||7));
          else if(lower.includes('thursday'))d.setDate(d.getDate()+((4-d.getDay()+7)%7||7));
          else if(lower.includes('friday'))d.setDate(d.getDate()+((5-d.getDay()+7)%7||7));
          else{const numMatch=lower.match(/(\d+)\s*day/);if(numMatch)d.setDate(d.getDate()+parseInt(numMatch[1]))}
          dueDate=d.toISOString().split('T')[0];
        }
        const job=input.job_id?findJob(input.job_id):null;
        const taskText='FOLLOW-UP: '+input.text+(job?' ['+job.name+']':'');
        addSop({id:'TASK-'+Date.now(),title:taskText,cat:'Task',icon:'check',content:JSON.stringify({text:taskText,status:'todo',priority:'normal',due:dueDate,assignees:[input.assignee||''],jobId:job?.id||'',createdAt:new Date().toISOString()}),custom:true});
        return{success:true,message:'Follow-up scheduled for '+dueDate+': "'+input.text+'"'+(job?' on '+job.name:'')};
      }
      if(toolName==="export_data"){
        const fmt3=n=>'$'+Number(n||0).toFixed(2);
        const clean2=(s)=>(s||'--').replace(/\n/g,' ').replace(/\r/g,'').replace(/\|/g,'/').replace(/\s+/g,' ').trim()||'--';
        const isCsv=input.format==='csv';
        const sep=isCsv?',':' | ';
        if(input.type==='job_items'){
          const job=findJob(input.job_id);if(!job)return{error:"Job not found"};
          const items=getJobItems(job.id);
          let msg=isCsv?"Tag,Manufacturer,Model,Description,Color,Qty,Cost,Price,Line Total,Status\n":
            "| Tag | Manufacturer | Model | Description | Qty | Cost | Price | Line Total | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";
          items.forEach(it=>{const v=vendors.find(v2=>v2.id===it.vendor);const total=(it.unitPrice||0)*it.qtyOrdered;const status=it.qtyReceived>=it.qtyOrdered?'complete':it.qtyReceived>0?'partial':'ordered';
            msg+=isCsv?[it.tag,v?.name||it.manufacturer,it.modelNumber,'"'+(it.description||'').replace(/"/g,'""').replace(/\n/g,' ')+'"',it.color,it.qtyOrdered,it.unitCost,it.unitPrice,total.toFixed(2),status].join(',')+"\n":
              "| "+clean2(it.tag)+" | "+clean2(v?.name||it.manufacturer)+" | "+clean2(it.modelNumber)+" | "+clean2(it.description)+" | "+it.qtyOrdered+" | "+fmt3(it.unitCost)+" | "+fmt3(it.unitPrice)+" | "+fmt3(total)+" | "+status+" |\n";
          });
          return{success:true,message:"**"+job.name+" -- "+items.length+" line items:**\n\n"+msg};
        }
        if(input.type==='jobs_list'){
          let msg=isCsv?"ID,Name,Customer,Rep,Phase,Revenue,Cost,Margin,Payment\n":
            "| ID | Name | Customer | Rep | Phase | Revenue | Margin | Payment |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n";
          jobs.forEach(j=>{const f=getJobFinancials(j.id);const c=customers.find(c2=>c2.id===j.customer);const r=reps.find(r2=>r2.id===j.salesRep);
            msg+=isCsv?[j.id,'"'+j.name+'"',c?.name||'',r?.name||'',j.phase,f.totalRevenue.toFixed(2),f.totalCost.toFixed(2),f.margin.toFixed(1)+'%',j.paymentStatus].join(',')+"\n":
              "| "+j.id+" | "+j.name+" | "+(c?.name||"--")+" | "+(r?.name||"--")+" | "+j.phase+" | "+fmt3(f.totalRevenue)+" | "+f.margin.toFixed(1)+"% | "+j.paymentStatus+" |\n";
          });
          return{success:true,message:"**All Jobs ("+jobs.length+"):**\n\n"+msg};
        }
        if(input.type==='vendors'){
          let msg="| Name | Category | Contact | Email | Phone | Discount |\n| --- | --- | --- | --- | --- | --- |\n";
          vendors.filter(v=>v.name&&!v.id.includes('SEED')).forEach(v=>{msg+="| "+v.name+" | "+(v.category||"--")+" | "+(v.contact||"--")+" | "+(v.email||"--")+" | "+(v.phone||"--")+" | "+((v.discountRate||0)*100).toFixed(0)+"% |\n"});
          return{success:true,message:"**Vendors ("+vendors.length+"):**\n\n"+msg};
        }
        if(input.type==='customers'){
          let msg="| Name | Type | Contact | Email | Phone |\n| --- | --- | --- | --- | --- |\n";
          customers.forEach(c=>{msg+="| "+c.name+" | "+(c.type||"--")+" | "+(c.contact||"--")+" | "+(c.email||"--")+" | "+(c.phone||"--")+" |\n"});
          return{success:true,message:"**Customers ("+customers.length+"):**\n\n"+msg};
        }
        return{error:"Unknown export type: "+input.type};
      }
      if(toolName==="create_transaction"){
        const txnDate=input.date||new Date().toISOString().split('T')[0];
        const txnType=input.type||'expense';
        const txnCat=input.category||(txnType==='revenue'?'Revenue - Product Sales':'Uncategorized');
        const txnAcct=input.account||'Operating';
        const txnAmt=String(Math.abs(Number(input.amount)||0));
        // Dedup against current ManualTxn store. Same shared _bankTxnHash that
        // the manual UI add and Plaid sync use. Brain can't bypass dedup -- if
        // it's told twice or asked to create a row that already exists from
        // Plaid sync, the duplicate is rejected with a clear message so Claude
        // can explain to the user.
        const _txnsNow=(customSops||[]).filter(s=>s.cat==='ManualTxn').map(s=>{try{return JSON.parse(s.content)}catch{return null}}).filter(Boolean);
        const _candHash=_bankTxnHash({date:txnDate,amount:txnAmt,description:input.description||''});
        if(Math.abs(Number(input.amount)||0)>0&&_txnsNow.some(t=>_bankTxnHash(t)===_candHash)){
          return{error:'Duplicate transaction -- a record with the same date, amount, and description already exists. Use categorize_transaction to update the existing record instead, or change the date / amount / description if this is genuinely a separate transaction.'};
        }
        const id='TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
        addSop({id,title:input.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({date:txnDate,description:input.description||'',category:txnCat,amount:txnAmt,type:txnType,account:txnAcct}),custom:true});
        return{success:true,message:'Created '+txnType+': $'+Number(txnAmt).toFixed(2)+' -- "'+input.description+'" ['+txnCat+'] on '+txnDate+' ('+txnAcct+' account)'};
      }
      if(toolName==="categorize_transaction"){
        const txns=(customSops||[]).filter(s=>s.cat==='ManualTxn').map(s=>{try{return{id:s.id,...JSON.parse(s.content)}}catch{return null}}).filter(Boolean);
        const desc=(input.transaction_description||'').toLowerCase();
        const dateFilter=input.date||'';
        let matches=txns.filter(t=>(t.description||'').toLowerCase().includes(desc));
        if(dateFilter)matches=matches.filter(t=>t.date===dateFilter);
        if(matches.length===0)return{error:'No transaction found matching "'+input.transaction_description+'"'+(dateFilter?' on '+dateFilter:'')};
        const t=matches[0];
        const newType=input.category.startsWith('Revenue')?'revenue':'expense';
        addSop({id:t.id,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,category:input.category,type:newType}),custom:true});
        return{success:true,message:'Categorized "'+t.description+'" ($'+Number(t.amount||0).toFixed(2)+') as '+input.category+(matches.length>1?' (matched first of '+matches.length+' results)':'')};
      }
      if(toolName==="get_banking_summary"){
        const txns=(customSops||[]).filter(s=>s.cat==='ManualTxn').map(s=>{try{return{id:s.id,...JSON.parse(s.content)}}catch{return null}}).filter(Boolean);
        const now2=new Date();const y=now2.getFullYear();const m=now2.getMonth();
        let fromDate='2020-01-01';
        const period=input.period||'ytd';
        if(period==='month')fromDate=new Date(y,m,1).toISOString().split('T')[0];
        else if(period==='quarter'){const qm=Math.floor(m/3)*3;fromDate=new Date(y,qm,1).toISOString().split('T')[0]}
        else if(period==='ytd')fromDate=new Date(y,0,1).toISOString().split('T')[0];
        else if(period==='year')fromDate=new Date(y-1,m,now2.getDate()).toISOString().split('T')[0];
        const filtered=txns.filter(t=>{if(!t.date)return true;return t.date>=fromDate});
        const catFilter=(input.category_filter||'').toLowerCase();
        const final=catFilter?filtered.filter(t=>(t.category||'').toLowerCase().includes(catFilter)):filtered;
        const totalIn=final.filter(t=>t.type==='revenue').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
        const totalOut=final.filter(t=>t.type==='expense').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
        // Group by category
        const byCat={};final.forEach(t=>{const c=t.category||'Uncategorized';byCat[c]=(byCat[c]||0)+(t.type==='revenue'?1:-1)*(parseFloat(t.amount)||0)});
        let msg='## Banking Summary ('+period.toUpperCase()+')\n\n';
        msg+='| Metric | Amount |\n| --- | --- |\n';
        msg+='| Total In (deposits) | $'+totalIn.toFixed(2)+' |\n';
        msg+='| Total Out (payments) | $'+totalOut.toFixed(2)+' |\n';
        msg+='| Net | $'+(totalIn-totalOut).toFixed(2)+' |\n';
        msg+='| Transactions | '+final.length+' |\n';
        if(Object.keys(byCat).length>0){
          msg+='\n## By Category\n\n| Category | Amount | Type |\n| --- | --- | --- |\n';
          Object.entries(byCat).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).forEach(([c,v])=>{
            const catTxns=final.filter(t=>(t.category||'Uncategorized')===c);
            const catTotal=catTxns.reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
            msg+='| '+c+' | $'+catTotal.toFixed(2)+' | '+(catTxns[0]?.type||'expense')+' |\n';
          });
        }
        if(final.length>0){
          msg+='\n## Recent Transactions\n\n| Date | Description | Category | Account | Amount |\n| --- | --- | --- | --- | --- |\n';
          final.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,15).forEach(t=>{
            msg+='| '+(t.date||'--')+' | '+(t.description||'--')+' | '+(t.category||'--')+' | '+(t.account||'Operating')+' | '+(t.type==='revenue'?'+':'-')+'$'+(parseFloat(t.amount)||0).toFixed(2)+' |\n';
          });
        }
        return{success:true,message:msg};
      }
      if(toolName==="get_payables_summary"){
        const f2=getJobFinancials;const gi=getJobItems;
        let allBills2=[];
        jobs.forEach(j=>{
          const items2=gi(j.id);const pos2=[];
          const byVendor={};items2.forEach(it=>{const vid=it.vendor||'unknown';if(!byVendor[vid])byVendor[vid]=[];byVendor[vid].push(it)});
          Object.entries(byVendor).forEach(([vid,vitems])=>{
            const v=vendors.find(v2=>v2.id===vid);
            const cost=vitems.reduce((s,it)=>s+(it.unitCost||0)*it.qtyOrdered,0);
            if(cost>0){
              const poDoc='PO-'+(j.id||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(vid||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
              const ds=typeof docStatuses[poDoc]==='object'&&docStatuses[poDoc]?docStatuses[poDoc]:{};
              const paid=ds.status==='paid'||ds.paid;
              const voided=ds.status==='void';
              if(!paid&&!voided){
                const created=new Date(j.createdDate||Date.now());
                const due=new Date(created);due.setDate(due.getDate()+30);
                const daysUntil=Math.floor((due-new Date())/(1000*60*60*24));
                const _bd=typeof docStatuses['BILL-'+poDoc.replace('PO-','')]==='object'&&docStatuses['BILL-'+poDoc.replace('PO-','')]?docStatuses['BILL-'+poDoc.replace('PO-','')]:{};
                const _entered=!!(_bd.status||_bd.vendorInvNum||(Array.isArray(_bd.payments)&&_bd.payments.length>0)||_bd.paid||_bd.checkNum||_bd.payDate);
                allBills2.push({vendor:v?.name||'Unknown',job:j.name,amount:cost,dueDate:due.toISOString().split('T')[0],daysUntil,overdue:daysUntil<0&&_entered,poDoc});
              }
            }
          });
        });
        allBills2.sort((a,b)=>a.daysUntil-b.daysUntil);
        const totalOwed=allBills2.reduce((s,b)=>s+b.amount,0);
        const overdueBills=allBills2.filter(b=>b.overdue);
        const overdueAmt=overdueBills.reduce((s,b)=>s+b.amount,0);
        const dueSoon=allBills2.filter(b=>!b.overdue&&b.daysUntil<=14);
        let msg='## Accounts Payable Summary\n\n';
        msg+='| Metric | Amount |\n| --- | --- |\n';
        msg+='| Total Outstanding | $'+totalOwed.toFixed(2)+' |\n';
        msg+='| Overdue | $'+overdueAmt.toFixed(2)+' ('+overdueBills.length+' bills) |\n';
        msg+='| Due in 14 Days | $'+dueSoon.reduce((s,b)=>s+b.amount,0).toFixed(2)+' ('+dueSoon.length+' bills) |\n';
        msg+='| Total Open Bills | '+allBills2.length+' |\n';
        if(allBills2.length>0){
          msg+='\n## Open Bills\n\n| Vendor | Job | Amount | Due Date | Status |\n| --- | --- | --- | --- | --- |\n';
          allBills2.slice(0,20).forEach(b=>{
            msg+='| '+b.vendor+' | '+b.job+' | $'+b.amount.toFixed(2)+' | '+b.dueDate+' | '+(b.overdue?'OVERDUE ('+Math.abs(b.daysUntil)+'d)':b.daysUntil<=14?'Due soon ('+b.daysUntil+'d)':'OK ('+b.daysUntil+'d)')+' |\n';
          });
        }
        return{success:true,message:msg};
      }
      if(toolName==="draft_email"||toolName==="send_email"){
        // Resolve recipient email
        let recipient=input.recipient_email||'';
        let recipientLabel='';
        if(!recipient&&input.customer_name){const c=findCustomer(input.customer_name);if(c){recipient=c.email||'';recipientLabel=c.name||''}else{return{error:'Customer "'+input.customer_name+'" not found in directory.'}}}
        if(!recipient&&input.vendor_name){const v=findVendor(input.vendor_name);if(v){recipient=v.email||'';recipientLabel=v.name||''}else{return{error:'Vendor "'+input.vendor_name+'" not found in directory.'}}}
        if(!recipient&&input.rep_name){const r=reps.find(x=>x.name.toLowerCase().includes(input.rep_name.toLowerCase()));if(r){recipient=r.email||'';recipientLabel=r.name||''}else{return{error:'Sales rep "'+input.rep_name+'" not found.'}}}
        if(!recipient){
          if(input.customer_name||input.vendor_name||input.rep_name)return{error:'No email address on file for '+(recipientLabel||input.customer_name||input.vendor_name||input.rep_name)+'. Please ask the user for the email address, or have them add it in the Directory.'};
          return{error:'No recipient. Provide recipient_email, customer_name, vendor_name, or rep_name.'};
        }
        // Derive the sender's email from their rep record (the users table has
        // no email column -- the real address lives on reps via rep_id).
        let _senderEmail='';
        try{if(currentUser&&currentUser.rep_id&&Array.isArray(reps)){const _r=reps.find(x=>x.id===currentUser.rep_id);if(_r&&_r.email)_senderEmail=_r.email}}catch{}
        const draft={to:recipient,toLabel:recipientLabel,subject:input.subject||'',body:input.body||'',from:_senderEmail,autoSend:toolName==="send_email"};
        setPendingBrainEmail(draft);
        if(toolName==="send_email"){
          return{success:true,message:'Email staged for '+recipient+(recipientLabel?' ('+recipientLabel+')':'')+'. The user is being shown a one-click send confirmation. Subject: "'+(input.subject||'')+'"'};
        }
        return{success:true,message:'Email draft prepared for '+recipient+(recipientLabel?' ('+recipientLabel+')':'')+'. The user can review, edit, and click Send. Subject: "'+(input.subject||'')+'"'};
      }
      // ===== PROSPECT TOOLS =====
      // All five tools below give the Brain read/write/delete access to the
      // Prospects board. Prospect records live in customSops with cat=='Prospect'
      // and content as a JSON-encoded blob mirroring the ProspectsPage editForm
      // shape (name, company, email, phone, state, city, status, assignedRep,
      // notes, etc.). Writes go through addSop (upsert by id) and deleteSop --
      // the exact same primitives the on-screen Prospects page uses, so anything
      // the Brain does is indistinguishable from a manual click on that page.

      // Shared helpers (scoped to this branch so they cannot leak out).
      const _getProspects=()=>(customSops||[]).filter(s=>s.cat==='Prospect').map(s=>{try{return{_sopId:s.id,data:JSON.parse(s.content||'{}')}}catch(_e){return null}}).filter(Boolean);
      const _matchFilter=(p,filter)=>{
        if(!filter)return true;
        if(filter.state!==undefined){
          const sf=String(filter.state||'').toLowerCase();
          const ps=String(p.data.state||'').toLowerCase();
          if(sf===''){if(ps!=='')return false;}
          else if(!ps.includes(sf))return false;
        }
        if(filter.exclude_states&&Array.isArray(filter.exclude_states)){
          const excludes=filter.exclude_states.map(s=>String(s||'').toLowerCase());
          const ps=String(p.data.state||'').toLowerCase();
          if(excludes.some(ex=>ex&&ps===ex))return false;
        }
        if(filter.status&&p.data.status!==filter.status)return false;
        if(filter.company_contains&&!String(p.data.company||'').toLowerCase().includes(String(filter.company_contains).toLowerCase()))return false;
        if(filter.name_contains&&!String(p.data.name||'').toLowerCase().includes(String(filter.name_contains).toLowerCase()))return false;
        if(filter.unassigned_only&&p.data.assignedRep)return false;
        if(filter.assigned_rep_name){
          const r=reps.find(x=>(x.name||'').toLowerCase().includes(String(filter.assigned_rep_name).toLowerCase()));
          if(!r||p.data.assignedRep!==r.id)return false;
        }
        return true;
      };
      const _matchIdentifier=(p,input)=>{
        if(input.prospect_id&&p._sopId===input.prospect_id)return true;
        if(input.email&&String(p.data.email||'').toLowerCase()===String(input.email).toLowerCase())return true;
        if(input.name||input.company){
          const nm=input.name?String(p.data.name||'').toLowerCase().includes(String(input.name).toLowerCase()):true;
          const cm=input.company?String(p.data.company||'').toLowerCase().includes(String(input.company).toLowerCase()):true;
          return nm&&cm;
        }
        return false;
      };
      const _resolveRepRef=(repRef)=>{
        // Allows assignedRep to be specified by ID or by name; returns the ID or '' if not found.
        if(!repRef)return '';
        const direct=reps.find(r=>r.id===repRef);if(direct)return direct.id;
        const byName=reps.find(r=>(r.name||'').toLowerCase().includes(String(repRef).toLowerCase()));
        return byName?byName.id:'';
      };

      if(toolName==='list_prospects'){
        const all=_getProspects();
        const matched=all.filter(p=>_matchFilter(p,input||{}));
        const limit=Math.min(100,Math.max(1,Number(input?.limit)||25));
        const sample=matched.slice(0,limit);
        const totalLine='**'+matched.length+' prospect'+(matched.length===1?'':'s')+' matched** (out of '+all.length+' total).\n\n';
        if(matched.length===0)return{success:true,message:totalLine+'No matches for the filter you provided.'};
        let table='| Name | Company | State | Status | Rep | Email |\n| --- | --- | --- | --- | --- | --- |\n';
        sample.forEach(p=>{
          const rep=reps.find(r=>r.id===p.data.assignedRep);
          table+='| '+(p.data.name||'')+' | '+(p.data.company||'')+' | '+(p.data.state||'')+' | '+(p.data.status||'')+' | '+(rep?rep.name:'(unassigned)')+' | '+(p.data.email||'')+' |\n';
        });
        const more=matched.length>limit?'\n_Showing first '+limit+' of '+matched.length+'. Use a tighter filter or higher limit for more._':'';
        return{success:true,message:totalLine+table+more};
      }

      if(toolName==='update_prospect'){
        const all=_getProspects();
        const candidates=all.filter(p=>_matchIdentifier(p,input||{}));
        if(candidates.length===0)return{error:'No prospect found matching the identifier you provided. Try list_prospects first to find the exact record.'};
        if(candidates.length>1){
          const preview=candidates.slice(0,8).map(p=>'- '+(p.data.name||'(no name)')+' | '+(p.data.company||'')+' | '+(p.data.state||'')+' | '+(p.data.email||'')).join('\n');
          return{error:candidates.length+' prospects match that identifier. Be more specific (e.g. add company or use email). Top matches:\n'+preview};
        }
        const target=candidates[0];
        const updates=input.updates||{};
        const next={...target.data};
        Object.keys(updates).forEach(k=>{
          if(updates[k]===undefined||updates[k]===null)return;
          if(k==='assignedRep'){next.assignedRep=_resolveRepRef(updates[k])}
          else next[k]=updates[k];
        });
        addSop({id:target._sopId,title:next.name||'Prospect',cat:'Prospect',icon:'target',content:JSON.stringify(next),custom:true});
        const changedFields=Object.keys(updates).filter(k=>updates[k]!==undefined);
        return{success:true,message:'Updated **'+(next.name||target._sopId)+'** ('+(next.company||'')+'). Fields changed: '+changedFields.join(', ')+'.'};
      }

      if(toolName==='delete_prospect'){
        const all=_getProspects();
        const candidates=all.filter(p=>_matchIdentifier(p,input||{}));
        if(candidates.length===0)return{error:'No prospect found matching the identifier you provided.'};
        if(candidates.length>1){
          const preview=candidates.slice(0,8).map(p=>'- '+(p.data.name||'(no name)')+' | '+(p.data.company||'')+' | '+(p.data.state||'')+' | '+(p.data.email||'')).join('\n');
          return{error:candidates.length+' prospects match. Be more specific, or use bulk_delete_prospects if you want all of them. Top matches:\n'+preview};
        }
        const target=candidates[0];
        deleteSop(target._sopId);
        return{success:true,message:'Deleted prospect: **'+(target.data.name||target._sopId)+'** ('+(target.data.company||'')+').'};
      }

      if(toolName==='bulk_update_prospects'){
        const all=_getProspects();
        const filter=input?.filter||{};
        const updates=input?.updates||{};
        if(Object.keys(filter).length===0)return{error:'bulk_update_prospects requires at least one filter criterion (refusing to update every prospect). Use update_prospect for single records.'};
        if(Object.keys(updates).length===0)return{error:'bulk_update_prospects requires at least one field in updates.'};
        const matched=all.filter(p=>_matchFilter(p,filter));
        if(matched.length===0)return{success:true,message:'No prospects match the filter. Nothing to update.'};
        if(!input.confirm){
          const sample=matched.slice(0,5).map(p=>'- '+(p.data.name||'')+' | '+(p.data.company||'')+' | '+(p.data.state||'')).join('\n');
          return{success:true,message:'**Dry run -- '+matched.length+' prospect'+(matched.length===1?'':'s')+' would be updated** with fields: '+Object.keys(updates).join(', ')+'.\n\nSample of affected records:\n'+sample+'\n\nRe-run with confirm:true to apply.'};
        }
        let applied=0;
        matched.forEach(target=>{
          const next={...target.data};
          Object.keys(updates).forEach(k=>{
            if(updates[k]===undefined||updates[k]===null)return;
            if(k==='assignedRep'){next.assignedRep=_resolveRepRef(updates[k])}
            else next[k]=updates[k];
          });
          addSop({id:target._sopId,title:next.name||'Prospect',cat:'Prospect',icon:'target',content:JSON.stringify(next),custom:true});
          applied++;
        });
        return{success:true,message:'Updated **'+applied+' prospect'+(applied===1?'':'s')+'**. Fields changed: '+Object.keys(updates).join(', ')+'.'};
      }

      if(toolName==='bulk_delete_prospects'){
        const all=_getProspects();
        const filter=input?.filter||{};
        const hasFilter=Object.keys(filter).some(k=>filter[k]!==undefined&&filter[k]!==null&&filter[k]!==''&&!(Array.isArray(filter[k])&&filter[k].length===0));
        if(!hasFilter)return{error:'bulk_delete_prospects requires at least one filter criterion (refusing to delete every prospect). To delete a single record use delete_prospect.'};
        const matched=all.filter(p=>_matchFilter(p,filter));
        if(matched.length===0)return{success:true,message:'No prospects match the filter. Nothing to delete.'};
        // Group by state for the preview so the user can sanity-check the cut.
        const byState={};
        matched.forEach(p=>{const s=p.data.state||'(no state)';byState[s]=(byState[s]||0)+1});
        const stateBreakdown=Object.entries(byState).sort((a,b)=>b[1]-a[1]).map(([s,n])=>'- '+s+': '+n).join('\n');
        if(!input.confirm){
          const sample=matched.slice(0,5).map(p=>'- '+(p.data.name||'')+' | '+(p.data.company||'')+' | '+(p.data.state||'')).join('\n');
          return{success:true,message:'**Dry run -- '+matched.length+' prospect'+(matched.length===1?'':'s')+' would be PERMANENTLY DELETED.**\n\nBy state:\n'+stateBreakdown+'\n\nSample of affected records:\n'+sample+'\n\nRe-run with confirm:true to actually delete. This cannot be undone.'};
        }
        let removed=0;
        matched.forEach(target=>{deleteSop(target._sopId);removed++});
        return{success:true,message:'**Deleted '+removed+' prospect'+(removed===1?'':'s')+'**\n\nBy state:\n'+stateBreakdown};
      }

      // ==============================================================
      // VENDOR BILLS, CREDITS, AND STANDALONE BILLS (16 tools, May 20 2026)
      // ==============================================================
      // Shared helpers, defined once and reused across the 16 bill/credit tools below.
      // These reconstruct the same merged docStatuses + bills list that DocumentsPage
      // renders, but from primitives that ARE in ctx (customSops, jobs, lineItems,
      // vendors, addSop, deleteSop). DocumentsPage owns the canonical merge, so this
      // intentionally mirrors its logic. If DocumentsPage logic changes, update here.
      //
      // The PO/quote/invoice/COMM doc numbering uses the same `stableNum` formula
      // DocumentsPage uses, inlined here so the Brain doesn't depend on DocumentsPage
      // being mounted. The `genPOs` equivalent is also inlined (_genPOsForJob) since
      // DocumentsPage's genPOs is in its own component scope.
      const _stableNumBrain = (prefix, a, b) => prefix + (a||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase() + '-' + (b||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
      const _genPOsForJob = (job) => {
        const items = getJobItems(job.id);
        const lst = lineItemShipTos || {};
        const groups = {};
        items.forEach(i => {
          const sv = lst[i.id];
          const ship = (sv && String(sv).trim()) ? sv : ((i.shipTo && String(i.shipTo).trim()) ? i.shipTo : '');
          const key = (i.vendor||'') + '||' + (ship||'');
          if (!groups[key]) groups[key] = { vid: i.vendor||'', shipTo: ship||'', items: [] };
          groups[key].items.push({...i, shipTo: ship||''});
        });
        return Object.values(groups).map(g => {
          const sk = (typeof shipKey === 'function') ? shipKey(g.shipTo) : '';
          const docNum = sk ? (_stableNumBrain('PO-', job.id, g.vid) + '-S' + sk) : _stableNumBrain('PO-', job.id, g.vid);
          return {
            vendor: vendors.find(v => v.id === g.vid),
            items: g.items.map(i => ({...i, displayQty: i.qtyOrdered, displayPrice: i.unitCost})),
            total: g.items.reduce((s,i) => s + (i.unitCost||0)*i.qtyOrdered, 0),
            job, docNum, shipTo: g.shipTo
          };
        });
      };
      const _getDocStatusesBrain = () => {
        const allDS = jobs.reduce((acc, j) => ({...acc, ...(j.docStatuses || {})}), {});
        const sopRec = (customSops||[]).find(s=>s.id==='DOC_STATUSES_GLOBAL');
        let sopDS = {};
        if (sopRec) { try { sopDS = JSON.parse(sopRec.content||'{}'); } catch {} }
        let lsDS = {};
        try { lsDS = JSON.parse(localStorage.getItem('mw_doc_statuses_fallback')||'{}'); } catch {}
        return {...allDS, ...sopDS, ...lsDS};
      };
      const _setDocStatusBrain = (docNum, value) => {
        // Upsert into DOC_STATUSES_GLOBAL SOP (durable cross-browser source).
        const merged = _getDocStatusesBrain();
        const next = {...merged, [docNum]: value};
        addSop({id:'DOC_STATUSES_GLOBAL',title:'Document Statuses',cat:'DocStatuses',icon:'file',content:JSON.stringify(next),custom:true});
        // Also update localStorage so it doesn't shadow our write on next read in this browser.
        try {
          const fb = JSON.parse(localStorage.getItem('mw_doc_statuses_fallback')||'{}');
          fb[docNum] = value;
          localStorage.setItem('mw_doc_statuses_fallback', JSON.stringify(fb));
        } catch {}
      };
      const _buildBillsList = () => {
        // Reconstruct the same allBills array DocumentsPage builds. Returns the same
        // shape so all bill tools can share a single lookup model.
        const docStatuses = _getDocStatusesBrain();
        const allBills = [];
        // PO-derived bills
        jobs.forEach(job => {
          const jobPOs = _genPOsForJob(job);
          jobPOs.forEach(po => {
            const vid = po.vendor?.id || 'unknown';
            const v = po.vendor;
            const poDocNum = po.docNum;
            const poStatus = docStatuses[poDocNum];
            const anyReceived = (po.items||[]).some(i => (Number(i.qtyReceived)||0) > 0);
            const isPoActive = poStatus && poStatus !== 'new';
            if (!isPoActive && !anyReceived) return;
            const vItems = po.items;
            // Match the UI: bill on RECEIVED quantity, not ordered. Vendors invoice on
            // shipment, so the bill amount is unitCost * qtyReceived. The full PO
            // commitment is also exposed as orderValue.
            const cost = vItems.reduce((s,i) => s + (i.unitCost||0)*(Number(i.qtyReceived)||0), 0);
            const orderValue = vItems.reduce((s,i) => s + (i.unitCost||0)*(Number(i.qtyOrdered)||0), 0);
            // Structurally-empty PO guard: skip only if no value committed at all. A PO
            // with value committed but nothing yet received is a valid $0-currently-owed
            // bill that should still appear in the Brain's tool output.
            if (orderValue <= 0) return;
            const poDate = vItems[0]?.poDate || job.createdDate || '';
            const billDocNum = 'BILL-' + poDocNum.replace('PO-','');
            const billDateOverride = docStatuses[billDocNum+'__date'] || '';
            const billDueOverride = docStatuses[billDocNum+'__due'] || '';
            let baseBillDate = billDateOverride ? new Date(billDateOverride+'T12:00:00') : (poDate ? new Date(poDate) : new Date());
            if (!baseBillDate || isNaN(baseBillDate.getTime())) baseBillDate = new Date();
            let dueDate2 = billDueOverride ? new Date(billDueOverride+'T12:00:00') : new Date(baseBillDate.getTime() + 30*86400000);
            if (!dueDate2 || isNaN(dueDate2.getTime())) dueDate2 = new Date(baseBillDate.getTime() + 30*86400000);
            let dueStr = '';
            try { dueStr = dueDate2.toISOString().split('T')[0]; } catch {}
            const billData = typeof docStatuses[billDocNum] === 'object' ? docStatuses[billDocNum] : {};
            // Payment history (mirrors the UI helpers in DocumentsPage). When a bill has
            // a payments[] array, paid is derived from sum(payments) >= cost. Legacy
            // single-payment bills synthesize one entry so the Brain reports the same
            // numbers the UI shows.
            const _payments = Array.isArray(billData?.payments)
              ? billData.payments
              : ((billData?.paid || billData?.checkNum || billData?.payDate) && billData?.status !== 'unpaid' && billData?.status !== 'void'
                ? [{date: billData.payDate||'', amount: cost, checkNum: billData.checkNum||'', memo: billData.memo||'', method:'legacy', isLegacy:true}]
                : []);
            const _totalPaid = _payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
            const _balance = Math.max(0, cost - _totalPaid);
            const _isFullyPaid = cost > 0.005 && _totalPaid >= cost - 0.005;
            const _isPartiallyPaid = _totalPaid > 0.005 && !_isFullyPaid;
            const paid = (billData.status==='void'||billData.status==='unpaid') ? false : (billData.status==='paid' ? true : _isFullyPaid);
            const daysUntil = isNaN(dueDate2.getTime()) ? 0 : Math.floor((dueDate2 - new Date())/86400000);
            allBills.push({
              job, vendor: v, vendorId: vid, vendorName: v?.name||'Unknown',
              items: vItems, cost, orderValue, poDocNum, billDocNum, poDate, dueDate: dueStr, daysUntil,
              paid, voided: billData.status==='void', entered: !!(billData.status||billData.vendorInvNum||(_payments&&_payments.length>0)),
              vendorInvNum: billData.vendorInvNum||'', checkNum: billData.checkNum||'',
              payDate: billData.payDate||'', memo: billData.memo||'',
              payments: _payments, totalPaid: _totalPaid, balance: _balance, isPartiallyPaid: _isPartiallyPaid,
              status: billData.status||(paid?'paid':(_isPartiallyPaid?'partial':'unpaid')),
              _isDeleted: billData.deleted===true,
              _isStandalone: false,
              _fileUrl: billData.invoiceFileUrl||'', _fileName: billData.invoiceFileName||''
            });
          });
        });
        // Standalone credits/bills
        (customSops||[]).forEach(s => {
          if (!s || (s.cat !== 'VendorCredit' && s.cat !== 'StandaloneBill')) return;
          let d = null;
          try { d = JSON.parse(s.content||'{}'); } catch { return; }
          if (!d) return;
          // No-project standalone bills get a sentinel job. Mirrors UI behavior so
          // Brain tools (list_vendor_bills, mark_bill_paid, pay_bills_batch) operate
          // on the same dataset Maureen sees in the app.
          const hasProj = d.jobId && d.jobId !== '';
          let job2;
          if (hasProj) {
            job2 = jobs.find(j => j.id === d.jobId);
            if (!job2) return;
          } else {
            job2 = {id:'', name:'(No Project)', _noProject:true};
          }
          const amt = Number(d.amount);
          if (!isFinite(amt) || amt <= 0) return;
          const v2 = (vendors||[]).find(vv => vv.id === d.vendorId) || null;
          const _stdPaid = d.paid===true;
          allBills.push({
            job: job2, vendor: v2, vendorId: d.vendorId||'unknown',
            vendorName: d.vendorName || (v2?v2.name:'Unknown'),
            items: [], cost: amt, orderValue: amt,
            poDocNum: d.refNumber||'', billDocNum: s.id,
            poDate: d.creditDate||'', dueDate: d.creditDate||'',
            daysUntil: 0, paid: _stdPaid, voided: d.void===true,
            vendorInvNum: d.refNumber||'', checkNum: d.checkNum||'',
            payDate: d.payDate||'', memo: d.memo||'',
            // Standalone bills don't track multi-payment history -- balance is full
            // amount or zero. Surface the same shape for Brain consumer uniformity.
            payments: _stdPaid ? [{date: d.payDate||'', amount: amt, checkNum: d.checkNum||'', memo: d.memo||'', method:'standalone'}] : [],
            totalPaid: _stdPaid ? amt : 0,
            balance: _stdPaid ? 0 : amt,
            isPartiallyPaid: false,
            status: d.void===true?'void':(_stdPaid?'paid':'unpaid'),
            _isDeleted: false,
            _isStandalone: true, _standaloneKind: s.cat, _sopId: s.id,
            _fileUrl: d.fileUrl||'', _fileName: d.fileName||'',
            _appliedToBill: d.appliedToBill||''
          });
        });
        return allBills;
      };
      const _findBill = (docNum) => {
        if (!docNum) return null;
        const bills = _buildBillsList();
        const want = String(docNum).toLowerCase();
        return bills.find(b => (b.billDocNum||'').toLowerCase() === want) || null;
      };
      const _formatBillsTable = (bills, max) => {
        if (!bills || bills.length === 0) return 'No bills found.';
        const limit = Math.min(max||25, bills.length);
        const head = '| # | Bill | Vendor | Job | Amount | Status | Due | Days | File |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
        const rows = bills.slice(0, limit).map((b,i)=>{
          const amt = (b._standaloneKind==='VendorCredit'?'-':'')+'$'+(b.cost||0).toFixed(2);
          const status = b._isDeleted?'deleted':b.voided?'void':b.paid?'paid':b.daysUntil<0?'overdue':b.status||'unpaid';
          const file = b._fileUrl?'yes':'no';
          return '| '+(i+1)+' | '+b.billDocNum+' | '+(b.vendorName||'--')+' | '+(b.job?.name||'--')+' | '+amt+' | '+status+' | '+(b.dueDate||'--')+' | '+(isFinite(b.daysUntil)?b.daysUntil:'--')+' | '+file+' |';
        }).join('\n');
        const tail = bills.length > limit ? '\n\n... and '+(bills.length-limit)+' more.' : '';
        return head+'\n'+rows+tail;
      };

      // ----------- VENDOR BILLS: QUERIES -----------
      if (toolName === 'list_vendor_bills') {
        let bills = _buildBillsList();
        const status = (input.status||'unpaid').toLowerCase();
        if (status === 'deleted') { bills = bills.filter(b => b._isDeleted); }
        else if (status === 'all') { /* keep everything */ }
        else if (status === 'unpaid') { bills = bills.filter(b => !b._isDeleted && !b.paid && !b.voided); }
        else if (status === 'paid') { bills = bills.filter(b => !b._isDeleted && b.paid); }
        else if (status === 'overdue') { bills = bills.filter(b => !b._isDeleted && !b.paid && !b.voided && b.daysUntil < 0); }
        else if (status === 'check_sent') { bills = bills.filter(b => !b._isDeleted && b.status === 'check_sent'); }
        else if (status === 'void') { bills = bills.filter(b => b.voided); }
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); bills = bills.filter(b => (b.vendorName||'').toLowerCase().includes(q)); }
        if (input.job_id) { const job = findJob(input.job_id); if (job) bills = bills.filter(b => b.job?.id === job.id); else return {error: 'Job not found: '+input.job_id}; }
        if (typeof input.due_within_days === 'number') { bills = bills.filter(b => b.daysUntil <= input.due_within_days); }
        if (input.date_from) { bills = bills.filter(b => (b.poDate||b.dueDate||'') >= input.date_from); }
        if (input.date_to) { bills = bills.filter(b => (b.poDate||b.dueDate||'') <= input.date_to); }
        if (typeof input.has_file === 'boolean') { bills = bills.filter(b => !!b._fileUrl === input.has_file); }
        if (typeof input.amount_min === 'number') { bills = bills.filter(b => b.cost >= input.amount_min); }
        if (typeof input.amount_max === 'number') { bills = bills.filter(b => b.cost <= input.amount_max); }
        bills.sort((a,b) => (a.daysUntil||0) - (b.daysUntil||0));
        const total = bills.reduce((s,b) => s+(b._standaloneKind==='VendorCredit'?-b.cost:b.cost), 0);
        const msg = '**Vendor Bills ('+bills.length+' matching, status='+status+')**\n\nNet total: $'+total.toFixed(2)+'\n\n'+_formatBillsTable(bills, input.limit||25);
        return {success: true, message: msg};
      }
      if (toolName === 'get_vendor_bill') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        let msg = '**'+b.billDocNum+'**\n\n';
        msg += '- Vendor: '+b.vendorName+'\n- Job: '+(b.job?.name||'--')+'\n- Amount: $'+b.cost.toFixed(2);
        if (b._standaloneKind === 'VendorCredit') msg += ' (CREDIT)';
        msg += '\n- Status: '+(b._isDeleted?'deleted':b.voided?'void':b.paid?'paid':b.daysUntil<0?'overdue':b.status||'unpaid');
        msg += '\n- Bill date: '+(b.poDate||'--')+'\n- Due date: '+(b.dueDate||'--')+' ('+(isFinite(b.daysUntil)?b.daysUntil+' days':'--')+')';
        if (b.vendorInvNum) msg += '\n- Vendor invoice #: '+b.vendorInvNum;
        if (b.checkNum) msg += '\n- Check #: '+b.checkNum;
        if (b.payDate) msg += '\n- Pay date: '+b.payDate;
        if (b.memo) msg += '\n- Memo: '+b.memo;
        if (b._fileUrl) msg += '\n- File: '+(b._fileName||'attached')+' ('+b._fileUrl+')';
        if (b._appliedToBill) msg += '\n- Applied to bill: '+b._appliedToBill;
        if (b.items && b.items.length > 0) {
          msg += '\n\n**Line items ('+b.items.length+'):**\n| Description | Qty | Unit Cost | Line Total |\n| --- | --- | --- | --- |\n';
          b.items.forEach(it => { msg += '| '+(it.description||'--')+' | '+it.qtyOrdered+' | $'+(it.unitCost||0).toFixed(2)+' | $'+((it.unitCost||0)*it.qtyOrdered).toFixed(2)+' |\n'; });
        }
        return {success: true, message: msg};
      }
      if (toolName === 'search_bills_by_amount') {
        let bills = _buildBillsList().filter(b => !b._isDeleted);
        const lo = Number(input.amount_min)||0, hi = Number(input.amount_max)||Infinity;
        bills = bills.filter(b => b.cost >= lo && b.cost <= hi);
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); bills = bills.filter(b => (b.vendorName||'').toLowerCase().includes(q)); }
        const status = (input.status||'all').toLowerCase();
        if (status === 'unpaid') bills = bills.filter(b => !b.paid && !b.voided);
        else if (status === 'paid') bills = bills.filter(b => b.paid);
        bills.sort((a,b) => b.cost - a.cost);
        return {success: true, message: '**'+bills.length+' bills in range $'+lo.toFixed(2)+' -- $'+(isFinite(hi)?hi.toFixed(2):'inf')+'**\n\n'+_formatBillsTable(bills, 25)};
      }
      if (toolName === 'get_bills_summary') {
        let bills = _buildBillsList().filter(b => !b._isDeleted && !b.voided);
        if (input.job_id) { const job = findJob(input.job_id); if (job) bills = bills.filter(b => b.job?.id === job.id); }
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); bills = bills.filter(b => (b.vendorName||'').toLowerCase().includes(q)); }
        const unpaid = bills.filter(b => !b.paid);
        const paid = bills.filter(b => b.paid);
        const overdue = unpaid.filter(b => b.daysUntil < 0 && b.entered);
        const credits = bills.filter(b => b._standaloneKind === 'VendorCredit');
        const totalOwed = unpaid.reduce((s,b) => s+(b._standaloneKind==='VendorCredit'?-b.cost:b.cost), 0);
        const totalPaid = paid.reduce((s,b) => s+b.cost, 0);
        const totalOverdue = overdue.reduce((s,b) => s+b.cost, 0);
        const totalCredits = credits.reduce((s,b) => s+b.cost, 0);
        const thisYear = new Date().getFullYear();
        const paidYTD = paid.filter(b => (b.payDate||'').startsWith(String(thisYear))).reduce((s,b)=>s+b.cost,0);
        let msg = '**Bills Summary**\n\n';
        msg += '- Total Owed (unpaid net of credits): $'+totalOwed.toFixed(2)+'\n';
        msg += '- Unpaid bills: '+unpaid.length+'\n- Overdue bills: '+overdue.length+' ($'+totalOverdue.toFixed(2)+')\n';
        msg += '- Paid this year (YTD '+thisYear+'): $'+paidYTD.toFixed(2)+' ('+paid.filter(b => (b.payDate||'').startsWith(String(thisYear))).length+' bills)\n';
        msg += '- Total paid (all time): $'+totalPaid.toFixed(2)+'\n';
        msg += '- Vendor credits: '+credits.length+' ($'+totalCredits.toFixed(2)+')\n';
        if (input.group_by === 'vendor') {
          const byVendor = {};
          unpaid.forEach(b => { const v = b.vendorName||'Unknown'; byVendor[v] = (byVendor[v]||0) + (b._standaloneKind==='VendorCredit'?-b.cost:b.cost); });
          const rows = Object.entries(byVendor).sort((a,b)=>b[1]-a[1]).slice(0,20);
          msg += '\n**By vendor (top 20 unpaid):**\n| Vendor | Owed |\n| --- | --- |\n';
          rows.forEach(([v,a]) => { msg += '| '+v+' | $'+a.toFixed(2)+' |\n'; });
        } else if (input.group_by === 'job') {
          const byJob = {};
          unpaid.forEach(b => { const j = b.job?.name||'Unknown'; byJob[j] = (byJob[j]||0) + (b._standaloneKind==='VendorCredit'?-b.cost:b.cost); });
          const rows = Object.entries(byJob).sort((a,b)=>b[1]-a[1]).slice(0,20);
          msg += '\n**By job (top 20 unpaid):**\n| Job | Owed |\n| --- | --- |\n';
          rows.forEach(([j,a]) => { msg += '| '+j+' | $'+a.toFixed(2)+' |\n'; });
        }
        return {success: true, message: msg};
      }

      // ----------- VENDOR BILLS: ACTIONS -----------
      if (toolName === 'mark_bill_paid') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        if (b._isDeleted) return {error: 'Bill is deleted. Restore it first.'};
        const today = new Date().toISOString().split('T')[0];
        if (b._isStandalone) {
          // Standalone credits/bills are stored as SOPs
          const sop = (customSops||[]).find(s => s.id === b._sopId);
          if (!sop) return {error: 'Underlying SOP record missing'};
          let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
          d.paid = true;
          d.payDate = input.pay_date || today;
          if (input.check_num) d.checkNum = input.check_num;
          if (input.memo) d.memo = input.memo;
          addSop({...sop, content: JSON.stringify(d)});
        } else {
          // PO-derived bills use the payment history model. Append a payment entry for
          // the remaining balance so partial-paid bills get completed (not double-counted),
          // and the new payment is itemized in the UI's payment history.
          const ds = _getDocStatusesBrain();
          const existing = typeof ds[b.billDocNum] === 'object' ? ds[b.billDocNum] : {};
          const prevPayments = (b.payments||[]);
          const bal = typeof b.balance==='number' ? b.balance : b.cost;
          const newPayment = {
            date: input.pay_date || today,
            amount: bal > 0.005 ? bal : 0,
            checkNum: input.check_num || '',
            memo: input.memo || '',
            method: 'brain'
          };
          const newPayments = bal > 0.005 ? [...prevPayments, newPayment] : prevPayments;
          _setDocStatusBrain(b.billDocNum, {
            ...existing,
            payments: newPayments,
            status:'paid', paid:true,
            payDate: input.pay_date || today,
            checkNum: input.check_num || existing.checkNum || '',
            memo: input.memo || existing.memo || ''
          });
        }
        return {success: true, message: 'Marked paid: '+b.billDocNum+' ('+b.vendorName+', $'+b.cost.toFixed(2)+')'};
      }
      if (toolName === 'void_bill' || toolName === 'unvoid_bill') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        if (b._isStandalone) {
          // Standalone bills/credits live in a SOP record -- void is a flag on the
          // record itself (d.void). Every consumer respects it: Documents bills tab,
          // AP aging, getJobFinancials cost adjustments, and Brain summaries. The
          // record is kept for the audit trail and is reversible via unvoid_bill.
          const sop = (customSops||[]).find(s => s.id === b._sopId);
          if (!sop) return {error: 'Underlying SOP record missing'};
          let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
          if (toolName === 'void_bill') {
            d.void = true; d.paid = false; d.voidDate = new Date().toISOString().split('T')[0];
            if (input.memo) d.voidMemo = input.memo;
            addSop({...sop, content: JSON.stringify(d)});
            return {success: true, message: 'Voided: '+b.billDocNum+' ('+b.vendorName+', $'+(b.cost||0).toFixed(2)+'). No longer counts toward job cost or Total Owed; record kept for the audit trail. Reversible via unvoid_bill.'};
          } else {
            delete d.void; delete d.voidDate; delete d.voidMemo;
            addSop({...sop, content: JSON.stringify(d)});
            return {success: true, message: 'Unvoided: '+b.billDocNum+' ('+b.vendorName+') -- active again'};
          }
        }
        const ds = _getDocStatusesBrain();
        const existing = typeof ds[b.billDocNum] === 'object' ? ds[b.billDocNum] : {};
        if (toolName === 'void_bill') {
          _setDocStatusBrain(b.billDocNum, {...existing, status:'void', paid:false, memo: input.memo || existing.memo || ''});
          return {success: true, message: 'Voided: '+b.billDocNum};
        } else {
          _setDocStatusBrain(b.billDocNum, {...existing, status:'unpaid', paid:false});
          return {success: true, message: 'Unvoided: '+b.billDocNum+' (now unpaid)'};
        }
      }
      if (toolName === 'restore_deleted_bill') {
        const ds = _getDocStatusesBrain();
        const existing = typeof ds[input.bill_doc_num] === 'object' ? ds[input.bill_doc_num] : {};
        if (existing.deleted !== true) return {error: 'Bill is not deleted: '+input.bill_doc_num};
        const {deleted:_d, ...rest} = existing;
        _setDocStatusBrain(input.bill_doc_num, rest);
        return {success: true, message: 'Restored bill (kept prior data): '+input.bill_doc_num};
      }
      if (toolName === 'reset_and_restore_bill') {
        const ds = _getDocStatusesBrain();
        const existing = typeof ds[input.bill_doc_num] === 'object' ? ds[input.bill_doc_num] : {};
        if (existing.deleted !== true) return {error: 'Bill is not deleted: '+input.bill_doc_num};
        _setDocStatusBrain(input.bill_doc_num, {});
        // Also clear date/due overrides
        if (ds[input.bill_doc_num+'__date'] !== undefined) _setDocStatusBrain(input.bill_doc_num+'__date', '');
        if (ds[input.bill_doc_num+'__due'] !== undefined) _setDocStatusBrain(input.bill_doc_num+'__due', '');
        return {success: true, message: 'Reset and restored as fresh unpaid bill: '+input.bill_doc_num+' (all prior payment data, attachments, and overrides wiped)'};
      }
      if (toolName === 'attach_file_to_bill') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        if (typeof window === 'undefined' || !window._supabase || typeof window._supabase.uploadFile !== 'function') return {error: 'Storage not ready -- file uploads require browser context.'};
        try {
          let file;
          let fileName = input.file_name || 'attachment-'+Date.now()+'.pdf';
          const contentType = input.content_type || 'application/pdf';
          if (input.file_url) {
            const resp = await fetch(input.file_url);
            if (!resp.ok) return {error: 'Failed to fetch file: HTTP '+resp.status};
            const blob = await resp.blob();
            file = new File([blob], fileName, {type: contentType});
          } else if (input.file_base64) {
            const bin = atob(input.file_base64);
            const arr = new Uint8Array(bin.length);
            for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
            file = new File([arr], fileName, {type: contentType});
          } else if (brainLastFileRef.current && brainLastFileRef.current.base64) {
            // No explicit source -- use the most recent file attached in this chat
            // (paperclip upload or file loaded from the Files page). This is the
            // normal path when the user says 'attach this PDF to BILL-XXXX'.
            const att = brainLastFileRef.current;
            if (!input.file_name && att.name) fileName = att.name;
            const bin = atob(att.base64);
            const arr = new Uint8Array(bin.length);
            for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
            file = new File([arr], fileName, {type: att.mediaType || contentType});
          } else {
            return {error: 'No file available. Attach the file in this chat (paperclip) and call again with just bill_doc_num, or provide file_url / file_base64.'};
          }
          const path = b.billDocNum + '/' + Date.now() + '_' + fileName;
          const url = await window._supabase.uploadFile('vendor-invoices', path, file);
          if (b._isStandalone) {
            const sop = (customSops||[]).find(s => s.id === b._sopId);
            if (!sop) return {error: 'Underlying SOP record missing'};
            let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
            d.fileUrl = url; d.fileName = fileName; d.uploadDate = new Date().toISOString();
            addSop({...sop, content: JSON.stringify(d)});
          } else {
            const ds = _getDocStatusesBrain();
            const existing = typeof ds[b.billDocNum] === 'object' ? ds[b.billDocNum] : {};
            _setDocStatusBrain(b.billDocNum, {...existing, invoiceFileUrl:url, invoiceFileName:fileName, invoiceUploadDate: new Date().toISOString()});
          }
          return {success: true, message: 'Attached '+fileName+' to '+b.billDocNum};
        } catch (e) { return {error: 'Attach failed: '+(e.message||String(e))}; }
      }
      if (toolName === 'update_bill_details') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        if (b._isStandalone) return {error: 'Use update_vendor_credit for standalone bills (SB-/VC- records).'};
        for (const dk of ['bill_date','due_date']) {
          if (input[dk] && !/^\d{4}-\d{2}-\d{2}$/.test(String(input[dk]).trim())) return {error: dk+' must be YYYY-MM-DD format'};
        }
        const dsBD = _getDocStatusesBrain();
        const existing = (typeof dsBD[b.billDocNum] === 'object' && dsBD[b.billDocNum]) ? dsBD[b.billDocNum] : {};
        const patch = {...existing};
        if (input.vendor_invoice_num !== undefined) patch.vendorInvNum = String(input.vendor_invoice_num);
        if (input.memo !== undefined) patch.memo = String(input.memo);
        // An update on a never-entered bill also marks it entered (status unpaid),
        // matching what the UI's bill-entry screen does.
        if (!patch.status) { patch.status = 'unpaid'; patch.paid = false; }
        _setDocStatusBrain(b.billDocNum, patch);
        if (input.bill_date) _setDocStatusBrain(b.billDocNum+'__date', String(input.bill_date).trim());
        if (input.due_date) _setDocStatusBrain(b.billDocNum+'__due', String(input.due_date).trim());
        return {success: true, message: 'Updated '+b.billDocNum+(input.vendor_invoice_num!==undefined?' -- vendor invoice #'+input.vendor_invoice_num:'')+(input.bill_date?', bill date '+input.bill_date:'')+(input.due_date?', due '+input.due_date:'')+(input.memo!==undefined?', memo saved':'')+'.'};
      }
      if (toolName === 'update_bill_due_date') {
        const b = _findBill(input.bill_doc_num);
        if (!b) return {error: 'Bill not found: '+input.bill_doc_num};
        if (b._isStandalone) return {error: 'Due date override is only supported for PO-derived bills. For standalone records, use update_vendor_credit with credit_date.'};
        const due = (input.due_date||'').trim();
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return {error: 'due_date must be YYYY-MM-DD format or empty string to clear'};
        _setDocStatusBrain(b.billDocNum+'__due', due);
        return {success: true, message: due ? ('Due date set to '+due+' for '+b.billDocNum) : ('Cleared due date override for '+b.billDocNum)};
      }
      if (toolName === 'batch_mark_paid') {
        let bills = _buildBillsList().filter(b => !b._isDeleted && !b.voided && !b.paid);
        if (Array.isArray(input.bill_doc_nums) && input.bill_doc_nums.length > 0) {
          const wanted = new Set(input.bill_doc_nums.map(x => String(x).toLowerCase()));
          bills = bills.filter(b => wanted.has((b.billDocNum||'').toLowerCase()));
        } else if (input.filter) {
          if (input.filter.vendor_name) { const q = input.filter.vendor_name.toLowerCase(); bills = bills.filter(b => (b.vendorName||'').toLowerCase().includes(q)); }
          if (input.filter.job_id) { const job = findJob(input.filter.job_id); if (job) bills = bills.filter(b => b.job?.id === job.id); }
          const st = (input.filter.status||'unpaid').toLowerCase();
          if (st === 'check_sent') bills = bills.filter(b => b.status === 'check_sent');
          else if (st === 'overdue') bills = bills.filter(b => b.daysUntil < 0);
        } else {
          return {error: 'Provide bill_doc_nums (array) or filter (object).'};
        }
        if (bills.length === 0) return {error: 'No matching unpaid bills found.'};
        const total = bills.reduce((s,b)=>s+b.cost,0);
        if (!input.confirm) {
          return {success: true, message: '**DRY RUN -- '+bills.length+' bill'+(bills.length===1?'':'s')+' would be marked paid**\n\nTotal: $'+total.toFixed(2)+'\n\n'+_formatBillsTable(bills, 50)+'\n\nRe-run with confirm:true to apply.'};
        }
        const today = input.pay_date || new Date().toISOString().split('T')[0];
        const checkNum = input.check_num || '';
        const method = input.method || (checkNum ? 'check' : 'ach');
        const memo = input.memo || ('Batch '+method+(checkNum?' #'+checkNum:''));
        let n = 0;
        bills.forEach(b => {
          if (b._isStandalone) {
            const sop = (customSops||[]).find(s => s.id === b._sopId);
            if (!sop) return;
            let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
            d.paid = true; d.payDate = today; if (checkNum) d.checkNum = checkNum; d.memo = memo;
            addSop({...sop, content: JSON.stringify(d)});
          } else {
            const ds = _getDocStatusesBrain();
            const existing = typeof ds[b.billDocNum] === 'object' ? ds[b.billDocNum] : {};
            // Append a payment entry for the remaining balance (matches mark_bill_paid).
            // Partial-paid bills get a payment that finishes them off without
            // double-counting prior partial payments.
            const prevPayments = (b.payments||[]);
            const bal = typeof b.balance==='number' ? b.balance : b.cost;
            const newPayments = bal > 0.005
              ? [...prevPayments, {date: today, amount: bal, checkNum: checkNum||'', memo, method: method||'check'}]
              : prevPayments;
            _setDocStatusBrain(b.billDocNum, {...existing, payments: newPayments, status:'paid', paid:true, payDate:today, checkNum:checkNum||existing.checkNum||'', memo});
          }
          n++;
        });
        return {success: true, message: 'Marked '+n+' bill'+(n===1?'':'s')+' paid via '+method+' (total $'+total.toFixed(2)+', date '+today+(checkNum?', check #'+checkNum:'')+')'};
      }

      if (toolName === 'record_bill_against_po') {
        // PO-tied bill entry -- the same action as opening the PO's bill row in
        // Documents >> Vendor Bills and entering it. Writes the bill's docStatuses
        // record (which is what makes a PO bill 'entered'), so the amount reconciles
        // against the job's existing line-item cost and NOTHING is added to job cost.
        // Closes the gap Maureen reported Jul 16 2026: the Brain could previously only
        // create standalone bills, which inflated project cost and tanked margins.
        let poDocNum = String(input.po_doc_num||'').trim().toUpperCase();
        let poObj = null;
        if (poDocNum) {
          for (let ji = 0; ji < jobs.length && !poObj; ji++) {
            const hit = _genPOsForJob(jobs[ji]).find(p => String(p.docNum||'').toUpperCase() === poDocNum);
            if (hit) poObj = hit;
          }
          if (!poObj) return {error: 'PO not found: '+poDocNum+'. Check the doc number, or pass job_id + vendor_name instead.'};
          poDocNum = poObj.docNum;
        } else {
          const job = findJob(input.job_id);
          if (!job) return {error: 'Provide po_doc_num, or job_id + vendor_name. Job not found: '+(input.job_id||'(none)')};
          const vq = (input.vendor_name||'').toLowerCase();
          const pos = _genPOsForJob(job).filter(p => !vq || (p.vendor?.name||'').toLowerCase().includes(vq));
          if (pos.length === 0) return {error: 'No PO found on '+job.name+(vq?' for vendor "'+input.vendor_name+'"':'')+'. Generate the POs first (create_po_from_quote), then record the bill against one.'};
          if (pos.length > 1) return {error: pos.length+' POs match on '+job.name+' -- specify po_doc_num. Candidates: '+pos.map(p=>p.docNum+' ('+(p.vendor?.name||'Unknown')+', $'+(p.total||0).toFixed(2)+')').join(', ')};
          poObj = pos[0];
          poDocNum = poObj.docNum;
        }
        const dsPO = _getDocStatusesBrain();
        const billDocNum = 'BILL-' + poDocNum.replace('PO-','');
        const existing = (typeof dsPO[billDocNum] === 'object' && dsPO[billDocNum]) ? dsPO[billDocNum] : {};
        if (existing.deleted === true) return {error: 'That bill exists but is deleted ('+billDocNum+'). Use restore_deleted_bill first, then record against it.'};
        // Activate the PO if still new/unset -- bills only render in the Vendor Bills
        // tab for active or received POs, so this guarantees the entered bill is visible.
        const poStatus = dsPO[poDocNum];
        if (!poStatus || poStatus === 'new') _setDocStatusBrain(poDocNum, 'drafted');
        const newStatus = (existing.status && existing.status !== 'void') ? existing.status : 'unpaid';
        _setDocStatusBrain(billDocNum, {
          ...existing,
          status: newStatus,
          paid: newStatus === 'paid',
          vendorInvNum: input.vendor_invoice_num || existing.vendorInvNum || '',
          memo: input.memo || existing.memo || ''
        });
        if (input.bill_date) _setDocStatusBrain(billDocNum+'__date', input.bill_date);
        if (input.due_date) _setDocStatusBrain(billDocNum+'__due', input.due_date);
        const costRecv = (poObj.items||[]).reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyReceived)||0),0);
        const orderVal = (poObj.items||[]).reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyOrdered)||0),0);
        return {success: true, message: 'Recorded bill '+billDocNum+' against '+poDocNum+' ('+(poObj.vendor?.name||'Unknown')+' on '+poObj.job.name+')'+(input.vendor_invoice_num?', vendor invoice #'+input.vendor_invoice_num:'')+'. Currently owed $'+costRecv.toFixed(2)+' of the $'+orderVal.toFixed(2)+' PO total (bill amounts track received quantities). The bill reconciles against the job\'s existing line-item cost -- nothing was added to job cost. Record payments with mark_bill_paid.'};
      }
      // ----------- VENDOR CREDITS & STANDALONE BILLS -----------
      if (toolName === 'create_vendor_credit' || toolName === 'create_standalone_bill') {
        const isCredit = toolName === 'create_vendor_credit';
        const v = vendors.find(vv => (vv.name||'').toLowerCase().includes((input.vendor_name||'').toLowerCase()));
        if (!v) return {error: 'Vendor not found: '+input.vendor_name};
        const job = findJob(input.job_id);
        if (!job) return {error: 'Job not found: '+input.job_id};
        const amt = Number(input.amount);
        if (!isFinite(amt) || amt <= 0) return {error: 'amount must be a positive number'};
        const id = (isCredit?'VC-':'SB-') + Math.random().toString(36).slice(2,10);
        const dateStr = input.credit_date || input.bill_date || new Date().toISOString().split('T')[0];
        const content = {
          vendorId: v.id, vendorName: v.name,
          jobId: job.id, jobName: job.name,
          amount: amt, creditDate: dateStr,
          refNumber: input.ref_number || '', memo: input.memo || '',
          fileUrl: input.file_url || '', fileName: input.file_url ? (input.file_url.split('/').pop()||'') : '',
          uploadDate: input.file_url ? new Date().toISOString() : '',
          paid: false, payDate: '', checkNum: '',
          createdAt: new Date().toISOString()
        };
        addSop({id, title: (isCredit?'Credit ':'Bill ')+v.name+' '+job.name+' $'+amt.toFixed(2), cat: isCredit?'VendorCredit':'StandaloneBill', icon:'receipt', content: JSON.stringify(content), custom:true});
        return {success: true, message: 'Created '+(isCredit?'vendor credit':'standalone bill')+' '+id+': '+v.name+' / '+job.name+' / $'+amt.toFixed(2)};
      }
      if (toolName === 'update_vendor_credit') {
        let sop = null;
        if (input.sop_id) sop = (customSops||[]).find(s => s.id === input.sop_id);
        if (!sop && (input.vendor_name || input.job_id)) {
          const candidates = (customSops||[]).filter(s => s.cat==='VendorCredit' || s.cat==='StandaloneBill').map(s => {
            let d = {}; try { d = JSON.parse(s.content||'{}'); } catch {}
            return {sop: s, d};
          });
          let filtered = candidates;
          if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); filtered = filtered.filter(x => (x.d.vendorName||'').toLowerCase().includes(q)); }
          if (input.job_id) { const job = findJob(input.job_id); if (job) filtered = filtered.filter(x => x.d.jobId === job.id); }
          if (filtered.length === 0) return {error: 'No matching credit/bill found'};
          if (filtered.length > 1) return {error: filtered.length+' matches -- provide sop_id to disambiguate. Candidates: '+filtered.map(x=>x.sop.id+' ($'+x.d.amount+')').join(', ')};
          sop = filtered[0].sop;
        }
        if (!sop) return {error: 'Credit/bill not found. Provide sop_id or vendor_name + job_id.'};
        let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
        const u = input.updates || {};
        if (typeof u.amount === 'number') d.amount = u.amount;
        if (typeof u.ref_number === 'string') d.refNumber = u.ref_number;
        if (typeof u.memo === 'string') d.memo = u.memo;
        if (typeof u.credit_date === 'string') d.creditDate = u.credit_date;
        if (typeof u.paid === 'boolean') d.paid = u.paid;
        if (typeof u.pay_date === 'string') d.payDate = u.pay_date;
        if (typeof u.check_num === 'string') d.checkNum = u.check_num;
        addSop({...sop, content: JSON.stringify(d)});
        return {success: true, message: 'Updated '+sop.id+': '+Object.keys(u).join(', ')};
      }
      if (toolName === 'delete_vendor_credit') {
        let sop = null;
        if (input.sop_id) sop = (customSops||[]).find(s => s.id === input.sop_id);
        if (!sop && (input.vendor_name || input.job_id || input.amount)) {
          const candidates = (customSops||[]).filter(s => s.cat==='VendorCredit' || s.cat==='StandaloneBill').map(s => {
            let d = {}; try { d = JSON.parse(s.content||'{}'); } catch {}
            return {sop: s, d};
          });
          let filtered = candidates;
          if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); filtered = filtered.filter(x => (x.d.vendorName||'').toLowerCase().includes(q)); }
          if (input.job_id) { const job = findJob(input.job_id); if (job) filtered = filtered.filter(x => x.d.jobId === job.id); }
          if (typeof input.amount === 'number') filtered = filtered.filter(x => Math.abs(Number(x.d.amount) - input.amount) < 0.01);
          if (filtered.length === 0) return {error: 'No matching credit/bill found'};
          if (filtered.length > 1) return {error: filtered.length+' matches -- provide sop_id. Candidates: '+filtered.map(x=>x.sop.id+' ($'+x.d.amount+')').join(', ')};
          sop = filtered[0].sop;
        }
        if (!sop) return {error: 'Credit/bill not found.'};
        deleteSop(sop.id);
        return {success: true, message: 'Deleted '+sop.id};
      }
      if (toolName === 'list_vendor_credits') {
        const kind = (input.kind||'all').toLowerCase();
        let records = (customSops||[]).filter(s => {
          if (kind === 'credit') return s.cat === 'VendorCredit';
          if (kind === 'standalone_bill') return s.cat === 'StandaloneBill';
          return s.cat === 'VendorCredit' || s.cat === 'StandaloneBill';
        }).map(s => { let d = {}; try { d = JSON.parse(s.content||'{}'); } catch {} return {sop: s, d}; });
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); records = records.filter(x => (x.d.vendorName||'').toLowerCase().includes(q)); }
        if (input.job_id) { const job = findJob(input.job_id); if (job) records = records.filter(x => x.d.jobId === job.id); }
        const ap = (input.applied_status||'all').toLowerCase();
        if (ap === 'applied') records = records.filter(x => x.d.appliedToBill);
        else if (ap === 'unapplied') records = records.filter(x => !x.d.appliedToBill);
        records.sort((a,b) => (b.d.amount||0) - (a.d.amount||0));
        const limit = Math.min(input.limit||25, records.length);
        let msg = '**'+records.length+' '+(kind==='all'?'credits & standalone bills':kind)+' matching**\n\n';
        msg += '| # | ID | Kind | Vendor | Job | Amount | Date | Ref | Applied to | Paid |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
        records.slice(0,limit).forEach((x,i) => {
          msg += '| '+(i+1)+' | '+x.sop.id+' | '+(x.sop.cat==='VendorCredit'?'credit':'bill')+' | '+(x.d.vendorName||'--')+' | '+(x.d.jobName||'--')+' | $'+Number(x.d.amount||0).toFixed(2)+' | '+(x.d.creditDate||'--')+' | '+(x.d.refNumber||'--')+' | '+(x.d.appliedToBill||'--')+' | '+(x.d.paid?'yes':'no')+' |\n';
        });
        if (records.length > limit) msg += '\n... and '+(records.length-limit)+' more.';
        return {success: true, message: msg};
      }
      if (toolName === 'apply_credit_to_bill') {
        const sop = (customSops||[]).find(s => s.id === input.credit_sop_id);
        if (!sop || sop.cat !== 'VendorCredit') return {error: 'Credit not found: '+input.credit_sop_id};
        const bill = _findBill(input.bill_doc_num);
        if (!bill) return {error: 'Bill not found: '+input.bill_doc_num};
        if (bill._isDeleted) return {error: 'Cannot apply credit to a deleted bill. Restore the bill first.'};
        let d = {}; try { d = JSON.parse(sop.content||'{}'); } catch {}
        d.appliedToBill = bill.billDocNum;
        d.appliedDate = new Date().toISOString().split('T')[0];
        addSop({...sop, content: JSON.stringify(d)});
        return {success: true, message: 'Applied credit '+sop.id+' ($'+Number(d.amount||0).toFixed(2)+') to bill '+bill.billDocNum+' ('+bill.vendorName+')'};
      }
      if (toolName === 'find_unmatched_credits') {
        let records = (customSops||[]).filter(s => s.cat === 'VendorCredit').map(s => { let d = {}; try { d = JSON.parse(s.content||'{}'); } catch {} return {sop:s, d}; });
        records = records.filter(x => !x.d.appliedToBill);
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); records = records.filter(x => (x.d.vendorName||'').toLowerCase().includes(q)); }
        if (input.job_id) { const job = findJob(input.job_id); if (job) records = records.filter(x => x.d.jobId === job.id); }
        records.sort((a,b) => (b.d.amount||0) - (a.d.amount||0));
        const total = records.reduce((s,x) => s + Number(x.d.amount||0), 0);
        let msg = '**'+records.length+' unapplied vendor credit'+(records.length===1?'':'s')+'**\n\nTotal unapplied: $'+total.toFixed(2)+'\n\n';
        msg += '| # | ID | Vendor | Job | Amount | Date | Ref |\n| --- | --- | --- | --- | --- | --- | --- |\n';
        records.forEach((x,i) => { msg += '| '+(i+1)+' | '+x.sop.id+' | '+(x.d.vendorName||'--')+' | '+(x.d.jobName||'--')+' | $'+Number(x.d.amount||0).toFixed(2)+' | '+(x.d.creditDate||'--')+' | '+(x.d.refNumber||'--')+' |\n'; });
        return {success: true, message: msg};
      }

      // ==============================================================
      // PURCHASE ORDERS (6 tools, May 21 2026)
      // ==============================================================
      // PO and Invoice tools reuse the helpers defined at the top of the vendor-bills
      // block above: _genPOsForJob, _stableNumBrain, _getDocStatusesBrain, _setDocStatusBrain.
      const _formatDateAge = (dateStr) => {
        if (!dateStr) return '--';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '--';
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days < 1) return 'today';
        if (days === 1) return '1 day ago';
        return days + ' days ago';
      };
      const _buildAllPOs = () => {
        const ds = _getDocStatusesBrain();
        const out = [];
        jobs.forEach(job => {
          const pos = _genPOsForJob(job);
          pos.forEach(po => {
            const status = ds[po.docNum] || 'new';
            const poDate = po.items?.[0]?.poDate || job.createdDate || '';
            out.push({ ...po, status, poDate, jobId: job.id, jobName: job.name });
          });
        });
        return out;
      };
      if (toolName === 'list_pos') {
        let pos = _buildAllPOs();
        if (input.job_id) { const job = findJob(input.job_id); if (!job) return {error:'Job not found: '+input.job_id}; pos = pos.filter(p => p.jobId === job.id); }
        if (input.vendor_name) { const q = input.vendor_name.toLowerCase(); pos = pos.filter(p => (p.vendor?.name||'').toLowerCase().includes(q)); }
        const status = (input.status||'all').toLowerCase();
        if (status !== 'all') pos = pos.filter(p => (p.status||'new').toLowerCase() === status);
        if (typeof input.older_than_days === 'number') {
          const cutoff = Date.now() - input.older_than_days * 86400000;
          pos = pos.filter(p => { const d = new Date(p.poDate); return !isNaN(d.getTime()) && d.getTime() < cutoff; });
        }
        pos.sort((a,b) => (a.poDate||'').localeCompare(b.poDate||''));
        const limit = Math.min(input.limit||30, pos.length);
        const total = pos.reduce((s,p) => s + (p.total||0), 0);
        let msg = '**Purchase Orders ('+pos.length+' matching, status='+status+')**\n\nTotal cost across matches: $'+total.toFixed(2)+'\n\n';
        msg += '| # | PO | Vendor | Job | Items | Total | Status | Age | Ship To |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
        pos.slice(0,limit).forEach((p,i) => {
          const ship = p.shipTo ? (p.shipTo.split('\n')[0].slice(0,30)+(p.shipTo.length>30?'...':'')) : '--';
          msg += '| '+(i+1)+' | '+p.docNum+' | '+(p.vendor?.name||'--')+' | '+p.jobName+' | '+(p.items?.length||0)+' | $'+(p.total||0).toFixed(2)+' | '+p.status+' | '+_formatDateAge(p.poDate)+' | '+ship+' |\n';
        });
        if (pos.length > limit) msg += '\n... and '+(pos.length-limit)+' more.';
        return {success:true, message: msg};
      }
      if (toolName === 'get_po') {
        const all = _buildAllPOs();
        const po = all.find(p => (p.docNum||'').toLowerCase() === String(input.po_doc_num||'').toLowerCase());
        if (!po) return {error:'PO not found: '+input.po_doc_num};
        let msg = '**'+po.docNum+'**\n\n';
        msg += '- Vendor: '+(po.vendor?.name||'--')+'\n- Job: '+po.jobName+' ('+po.jobId+')\n- Status: '+po.status+'\n- PO Date: '+(po.poDate||'--')+'\n- Total: $'+(po.total||0).toFixed(2)+'\n- Items: '+(po.items?.length||0);
        if (po.shipTo) msg += '\n- Ship To: '+po.shipTo;
        if (po.items && po.items.length) {
          msg += '\n\n**Line items:**\n| Description | Qty Ord | Qty Recv | Unit Cost | Line Total | Status |\n| --- | --- | --- | --- | --- | --- |\n';
          po.items.forEach(it => {
            const lt = (it.unitCost||0)*it.qtyOrdered;
            const st = it.qtyReceived >= it.qtyOrdered ? 'complete' : it.qtyReceived > 0 ? 'partial' : 'ordered';
            msg += '| '+(it.description||'--')+' | '+it.qtyOrdered+' | '+it.qtyReceived+' | $'+(it.unitCost||0).toFixed(2)+' | $'+lt.toFixed(2)+' | '+st+' |\n';
          });
        }
        const billDocNum = 'BILL-' + po.docNum.replace('PO-','');
        const ds = _getDocStatusesBrain();
        const billData = typeof ds[billDocNum] === 'object' ? ds[billDocNum] : {};
        if (billData && Object.keys(billData).length) {
          msg += '\n**Associated bill ('+billDocNum+'):** status='+(billData.status||(billData.paid?'paid':'unpaid'))+(billData.vendorInvNum?', vendor inv #'+billData.vendorInvNum:'')+(billData.deleted?' [DELETED]':'');
        }
        return {success:true, message: msg};
      }
      if (toolName === 'update_po_status') {
        const all = _buildAllPOs();
        const po = all.find(p => (p.docNum||'').toLowerCase() === String(input.po_doc_num||'').toLowerCase());
        if (!po) return {error:'PO not found: '+input.po_doc_num};
        const valid = ['new','drafted','sent','approved'];
        const newStatus = String(input.status||'').toLowerCase();
        if (!valid.includes(newStatus)) return {error:'Invalid status: '+input.status+'. Must be one of: '+valid.join(', ')};
        _setDocStatusBrain(po.docNum, newStatus);
        return {success:true, message:'PO '+po.docNum+' status: '+po.status+' >> '+newStatus};
      }
      if (toolName === 'mark_items_received') {
        let targets = [];
        const today = input.delivery_date || new Date().toISOString().split('T')[0];
        // Detect the "legacy/job-only" call shape: only job_id provided, no narrower
        // targeting. In that case preserve the prior tool's side effect of bumping
        // job.phase to Delivered after all items are marked received. Item-level or
        // PO-level calls do NOT touch phase.
        const isJobLevelOnly = !!input.job_id && !input.po_doc_num && !input.item_description && !input.item_id && typeof input.quantity !== 'number';
        let parentJob = null;
        if (input.item_id) {
          const it = lineItems.find(i => i.id === input.item_id);
          if (!it) return {error:'Item not found: '+input.item_id};
          targets = [it];
        } else if (input.po_doc_num) {
          const all = _buildAllPOs();
          const po = all.find(p => (p.docNum||'').toLowerCase() === String(input.po_doc_num).toLowerCase());
          if (!po) return {error:'PO not found: '+input.po_doc_num};
          targets = po.items || [];
          if (input.item_description) { const q = input.item_description.toLowerCase(); targets = targets.filter(it => (it.description||'').toLowerCase().includes(q)); }
        } else if (input.job_id) {
          const job = findJob(input.job_id);
          if (!job) return {error:'Job not found: '+input.job_id};
          parentJob = job;
          targets = getJobItems(job.id);
          if (input.item_description) { const q = input.item_description.toLowerCase(); targets = targets.filter(it => (it.description||'').toLowerCase().includes(q)); }
        } else {
          return {error:'Provide item_id, po_doc_num, or job_id'};
        }
        if (targets.length === 0) return {error:'No items matched the filter'};
        if (typeof input.quantity === 'number' && targets.length > 1) return {error:targets.length+' items matched but a single quantity was given. Provide item_id, or omit quantity to mark all matched items fully received.'};
        let updated = 0;
        targets.forEach(it => {
          const remaining = (it.qtyOrdered||0) - (it.qtyReceived||0);
          if (remaining <= 0) return;
          let qty;
          if (typeof input.quantity === 'number') qty = Math.min(input.quantity, remaining);
          else qty = remaining;
          const newRecv = (it.qtyReceived||0) + qty;
          updateLineItem(it.id, { qtyReceived: newRecv, deliveryDate: today });
          updated++;
        });
        let phaseMsg = '';
        if (isJobLevelOnly && parentJob) {
          updateJob(parentJob.id, { phase: 'Delivered' });
          phaseMsg = ' Phase >> Delivered.';
        }
        return {success:true, message:'Marked '+updated+' item'+(updated===1?'':'s')+' received'+(typeof input.quantity==='number'?(' (qty '+input.quantity+' each)'):' (fully)')+' on '+today+'.'+phaseMsg};
      }
      if (toolName === 'create_po_from_quote') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const quoteDocNum = _stableNumBrain('QT-', job.id, job.customer);
        const ds = _getDocStatusesBrain();
        const quoteStatus = ds[quoteDocNum];
        if (quoteStatus !== 'approved' && quoteStatus !== 'sent') {
          return {error:'Quote '+quoteDocNum+' is not approved or sent (status: '+(quoteStatus||'new')+'). Approve or send the quote first using update_po_status on the quote docNum, or via the UI.'};
        }
        const pos = _genPOsForJob(job);
        if (pos.length === 0) return {error:'No line items on this job -- nothing to PO'};
        let drafted = 0;
        const promoted = [];
        pos.forEach(po => {
          const cur = ds[po.docNum];
          if (cur === 'drafted' || cur === 'sent' || cur === 'approved') return;
          _setDocStatusBrain(po.docNum, 'drafted');
          drafted++;
          promoted.push(po.docNum+' ('+(po.vendor?.name||'?')+', $'+(po.total||0).toFixed(2)+')');
        });
        if (drafted === 0) return {success:true, message:'All '+pos.length+' POs on '+job.name+' are already drafted/sent/approved'};
        return {success:true, message:'Drafted '+drafted+' PO'+(drafted===1?'':'s')+' on '+job.name+':\n- '+promoted.join('\n- ')};
      }
      if (toolName === 'find_pos_awaiting_action') {
        const cutoffDays = typeof input.older_than_days === 'number' ? input.older_than_days : 7;
        const cutoff = Date.now() - cutoffDays * 86400000;
        const stuck = String(input.stuck_in_status||'').toLowerCase();
        let pos = _buildAllPOs().filter(p => {
          const status = (p.status||'new').toLowerCase();
          if (stuck && status !== stuck) return false;
          if (!stuck && !['new','drafted','sent'].includes(status)) return false;
          const d = new Date(p.poDate);
          if (isNaN(d.getTime())) return false;
          return d.getTime() < cutoff;
        });
        pos.sort((a,b) => (a.poDate||'').localeCompare(b.poDate||''));
        let msg = '**'+pos.length+' PO'+(pos.length===1?'':'s')+' awaiting action**\n\nFilter: '+(stuck||'any of new/drafted/sent')+', older than '+cutoffDays+' days\n\n';
        if (pos.length === 0) { msg += 'All POs are moving along nicely.'; return {success:true, message: msg}; }
        msg += '| # | PO | Vendor | Job | Status | Total | Age |\n| --- | --- | --- | --- | --- | --- | --- |\n';
        pos.slice(0,50).forEach((p,i) => {
          msg += '| '+(i+1)+' | '+p.docNum+' | '+(p.vendor?.name||'--')+' | '+p.jobName+' | '+p.status+' | $'+(p.total||0).toFixed(2)+' | '+_formatDateAge(p.poDate)+' |\n';
        });
        if (pos.length > 50) msg += '\n... and '+(pos.length-50)+' more.';
        return {success:true, message: msg};
      }

      // ==============================================================
      // CUSTOMER INVOICES (7 tools, May 21 2026)
      // ==============================================================
      // Local genInvoice equivalent so the Brain doesn't depend on DocumentsPage scope.
      const _genInvoiceForJob = (job, full) => {
        const allItems = getJobItems(job.id);
        const _svc = i => { const m = (i.modelNumber||'').trim(); return /instal|labor|assembl/i.test(i.description||'') && (m==='' || /^(instal|labor|assembl|union|setup)/i.test(m)); };
        const _allRecv = allItems.filter(i => !_svc(i)).every(i => (i.qtyReceived||0) >= (i.qtyOrdered||0));
        const _iq = i => _svc(i) ? (_allRecv ? ((i.qtyOrdered||0) - (i.qtyInvoiced||0)) : 0) : ((i.qtyReceived||0) - (i.qtyInvoiced||0));
        const items = full
          ? allItems.filter(i => (i.qtyOrdered||0) > 0)
          : allItems.filter(i => _iq(i) > 0);
        const isPartial = !full && allItems.some(i => !_svc(i) && (i.qtyOrdered||0) > (i.qtyReceived||0));
        return {
          customer: customers.find(c => c.id === job.customer),
          items: items.map(i => ({
            ...i,
            displayQty: full ? (i.qtyOrdered||0) : _iq(i),
            displayPrice: i.unitPrice||0
          })),
          total: items.reduce((s,i) => s + (i.unitPrice||0) * (full ? (i.qtyOrdered||0) : _iq(i)), 0),
          job,
          docNum: _stableNumBrain('INV-', job.id, job.customer),
          isPartial,
          isFull: !!full
        };
      };
      const _invoiceTermsDays = (job) => {
        const t = (job.terms||'Net 30').toLowerCase();
        if (t.includes('15')) return 15;
        if (t.includes('receipt') || t.includes('cod')) return 0;
        if (t.includes('60')) return 60;
        if (t.includes('45')) return 45;
        return 30;
      };
      if (toolName === 'list_invoices') {
        const ds = _getDocStatusesBrain();
        let rows = jobs.map(job => {
          const items = getJobItems(job.id);
          if (items.length === 0) return null;
          const fullTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyOrdered||0), 0);
          const invoicedTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyInvoiced||0), 0);
          const isFullyInvoiced = items.length > 0 && items.every(i => (i.qtyInvoiced||0) >= (i.qtyOrdered||0));
          const hasInvoiced = items.some(i => (i.qtyInvoiced||0) > 0);
          const docNum = _stableNumBrain('INV-', job.id, job.customer);
          const docStatus = ds[docNum] || 'new';
          const customer = customers.find(c => c.id === job.customer);
          const days = _invoiceTermsDays(job);
          const created = new Date(job.createdDate||new Date());
          const due = new Date(created.getTime() + days*86400000);
          const overdue = hasInvoiced && job.paymentStatus !== 'paid' && Date.now() > due.getTime();
          return { job, items, docNum, docStatus, customer, fullTotal, invoicedTotal, isFullyInvoiced, hasInvoiced, overdue, due, paymentStatus: job.paymentStatus||'unpaid', terms: job.terms||'Net 30' };
        }).filter(Boolean);
        if (input.customer_name) { const q = input.customer_name.toLowerCase(); rows = rows.filter(r => (r.customer?.name||'').toLowerCase().includes(q)); }
        if (input.job_id) { const job = findJob(input.job_id); if (job) rows = rows.filter(r => r.job.id === job.id); else return {error:'Job not found: '+input.job_id}; }
        const status = String(input.status||'unpaid').toLowerCase();
        if (status === 'unpaid') rows = rows.filter(r => r.hasInvoiced && r.paymentStatus !== 'paid');
        else if (status === 'paid') rows = rows.filter(r => r.paymentStatus === 'paid');
        else if (status === 'partial') rows = rows.filter(r => r.paymentStatus === 'partial');
        else if (status === 'overdue') rows = rows.filter(r => r.overdue);
        else if (status === 'sent') rows = rows.filter(r => r.docStatus === 'sent');
        else if (status === 'drafted') rows = rows.filter(r => r.docStatus === 'drafted');
        // 'all' = keep all
        rows.sort((a,b) => (b.invoicedTotal||0) - (a.invoicedTotal||0));
        const limit = Math.min(input.limit||30, rows.length);
        const totalUnpaid = rows.reduce((s,r) => r.paymentStatus !== 'paid' ? s + r.invoicedTotal : s, 0);
        let msg = '**'+rows.length+' invoice'+(rows.length===1?'':'s')+' (status='+status+')**\n\nUnpaid total in this view: $'+totalUnpaid.toFixed(2)+'\n\n';
        msg += '| # | INV | Customer | Job | Invoiced | Order Total | Doc Status | Payment | Terms | Overdue |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
        rows.slice(0,limit).forEach((r,i) => {
          msg += '| '+(i+1)+' | '+r.docNum+' | '+(r.customer?.name||'--')+' | '+r.job.name+' | $'+r.invoicedTotal.toFixed(2)+' | $'+r.fullTotal.toFixed(2)+' | '+r.docStatus+' | '+r.paymentStatus+' | '+r.terms+' | '+(r.overdue?'yes':'no')+' |\n';
        });
        if (rows.length > limit) msg += '\n... and '+(rows.length-limit)+' more.';
        return {success:true, message: msg};
      }
      if (toolName === 'generate_invoice') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const mode = String(input.mode||'partial').toLowerCase();
        const validModes = ['partial','full','advance','proforma','credit_memo'];
        if (!validModes.includes(mode)) return {error:'Invalid mode: '+mode+'. Must be one of: '+validModes.join(', ')};
        const items = getJobItems(job.id);
        if (items.length === 0) return {error:'No line items on this job'};
        const full = (mode === 'full' || mode === 'advance' || mode === 'proforma' || mode === 'credit_memo');
        const inv = _genInvoiceForJob(job, full);
        if (mode === 'partial' && inv.items.length === 0) return {error:'No items ready to invoice (no qtyReceived > qtyInvoiced delta). Use mode=advance for prepay scenarios, or mark items received first.'};
        if (inv.total <= 0 && mode !== 'credit_memo') return {error:'Invoice total is $0 -- nothing to invoice'};
        _setDocStatusBrain(inv.docNum, 'drafted');
        const shouldMark = (typeof input.mark_qty_invoiced === 'boolean')
          ? input.mark_qty_invoiced
          : (mode === 'advance');
        let bumped = 0;
        if (shouldMark) {
          inv.items.forEach(it => {
            const real = items.find(x => x.id === it.id);
            if (!real) return;
            const newQI = Math.min(real.qtyOrdered||0, (real.qtyInvoiced||0) + (it.displayQty||0));
            if (newQI !== real.qtyInvoiced) {
              updateLineItem(real.id, { qtyInvoiced: newQI });
              bumped++;
            }
          });
        }
        const label = mode === 'partial' ? 'Partial' : mode === 'full' ? 'Full' : mode === 'advance' ? 'Advance' : mode === 'proforma' ? 'ProForma' : 'Credit Memo';
        let msg = '**'+label+' invoice drafted: '+inv.docNum+'**\n\n';
        msg += '- Job: '+job.name+'\n- Customer: '+(inv.customer?.name||'--')+'\n- Total: $'+inv.total.toFixed(2)+'\n- Line items in invoice: '+inv.items.length+'\n- Doc status set to: drafted';
        if (bumped > 0) msg += '\n- Bumped qtyInvoiced on '+bumped+' line item'+(bumped===1?'':'s');
        if (mode === 'advance') msg += '\n\nNote: this is an ADVANCE invoice. Items have not yet shipped. The customer is being billed up front.';
        if (mode === 'proforma') msg += '\n\nNote: this is a PROFORMA invoice (for approval only -- not a real bill). qtyInvoiced was not changed.';
        if (mode === 'credit_memo') msg += '\n\nNote: this is a CREDIT MEMO -- it should reduce the customer balance, not add to it.';
        return {success:true, message: msg};
      }
      if (toolName === 'mark_all_invoiced_for_job') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const items = getJobItems(job.id);
        if (items.length === 0) return {error:'No line items on this job'};
        let bumped = 0;
        items.forEach(it => {
          if ((it.qtyInvoiced||0) < (it.qtyOrdered||0)) {
            updateLineItem(it.id, { qtyInvoiced: it.qtyOrdered });
            bumped++;
          }
        });
        return {success:true, message:'Marked '+bumped+' item'+(bumped===1?'':'s')+' as fully invoiced on '+job.name+' (total items: '+items.length+')'};
      }
      if (toolName === 'send_invoice_email') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const customer = customers.find(c => c.id === job.customer);
        if (!customer) return {error:'Customer not found for job: '+job.name};
        const to = customer.email || '';
        if (!to) return {error:'Customer '+(customer.name||'')+' has no email on file. Add one via update_customer, or pass a recipient explicitly.'};
        const items = getJobItems(job.id);
        const invoicedTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyInvoiced||0), 0);
        const docNum = _stableNumBrain('INV-', job.id, job.customer);
        const subject = 'Invoice '+docNum+' - '+job.name+' - Midwest Educational Furnishings';
        let body = 'Dear '+(customer.contact || customer.name || 'Customer')+',\n\nPlease find the invoice for '+job.name+' (Invoice #'+docNum+', Amount: '+(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(invoicedTotal))+').\n\nTerms: '+(job.terms||'Net 30')+'\n';
        if (input.custom_message) body += '\n'+input.custom_message+'\n';
        body += '\nThank you for your business.\n\nBlessings,\nMidwest Educational Furnishings\n(847) 847-1865';
        if (typeof setPendingBrainEmail === 'function') {
          setPendingBrainEmail({
            to, from: input.from_email || '', subject, body, toLabel: customer.name || customer.contact || to
          });
          return {success:true, message:'Drafted email to '+to+' for invoice '+docNum+' ('+(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(invoicedTotal))+'). Review and edit it in the pending email panel below, then click Send.'};
        }
        return {error:'Email staging is unavailable in this context.'};
      }
      if (toolName === 'record_payment') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const amount = Number(input.amount);
        if (!isFinite(amount) || amount <= 0) return {error:'amount must be a positive number'};
        const items = getJobItems(job.id);
        const invoicedTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyInvoiced||0), 0);
        const today = input.pay_date || new Date().toISOString().split('T')[0];
        const newStatus = amount + 0.005 >= invoicedTotal && invoicedTotal > 0 ? 'paid' : 'partial';
        updateJob(job.id, { paymentStatus: newStatus });
        const invDocNum = _stableNumBrain('INV-', job.id, job.customer);
        // Log the payment as a docStatuses entry keyed PAY-<docNum>-<timestamp> for audit trail.
        const payId = 'PAY-'+invDocNum+'-'+Date.now();
        _setDocStatusBrain(payId, {
          jobId: job.id,
          customer: (customers.find(c => c.id === job.customer)||{}).name || '',
          jobName: job.name,
          amount,
          date: today,
          method: input.method || 'check',
          ref: input.reference || '',
          memo: input.memo || '',
          invoiceNum: invDocNum
        });
        const fmtMoney = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
        return {success:true, message:'Logged '+fmtMoney(amount)+' '+(input.method||'check')+' payment on '+job.name+' ('+invDocNum+'). Job payment status >> '+newStatus+'. Invoiced total: '+fmtMoney(invoicedTotal)+(input.reference?(', ref '+input.reference):'')};
      }
      if (toolName === 'find_overdue_invoices') {
        const minDays = typeof input.min_days_overdue === 'number' ? input.min_days_overdue : 1;
        const customerQ = (input.customer_name||'').toLowerCase();
        const today = Date.now();
        const rows = [];
        jobs.forEach(job => {
          if (job.paymentStatus === 'paid') return;
          const items = getJobItems(job.id);
          const hasInvoiced = items.some(i => (i.qtyInvoiced||0) > 0);
          if (!hasInvoiced) return;
          const days = _invoiceTermsDays(job);
          const created = new Date(job.createdDate||new Date());
          if (isNaN(created.getTime())) return;
          const due = new Date(created.getTime() + days*86400000);
          const daysOverdue = Math.floor((today - due.getTime()) / 86400000);
          if (daysOverdue < minDays) return;
          const customer = customers.find(c => c.id === job.customer);
          if (customerQ && !((customer?.name||'').toLowerCase().includes(customerQ))) return;
          const invoicedTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyInvoiced||0), 0);
          rows.push({ job, customer, invoicedTotal, daysOverdue, terms: job.terms||'Net 30', paymentStatus: job.paymentStatus||'unpaid' });
        });
        rows.sort((a,b) => b.daysOverdue - a.daysOverdue);
        const bucket = { '1-30':0, '31-60':0, '60+':0 };
        const bucketCount = { '1-30':0, '31-60':0, '60+':0 };
        rows.forEach(r => {
          const b = r.daysOverdue <= 30 ? '1-30' : r.daysOverdue <= 60 ? '31-60' : '60+';
          bucket[b] += r.invoicedTotal;
          bucketCount[b]++;
        });
        const grandTotal = rows.reduce((s,r) => s + r.invoicedTotal, 0);
        let msg = '**Overdue Invoices ('+rows.length+' total, $'+grandTotal.toFixed(2)+' outstanding)**\n\n';
        msg += '**Aging buckets:**\n- 1-30 days: '+bucketCount['1-30']+' invoice(s), $'+bucket['1-30'].toFixed(2)+'\n- 31-60 days: '+bucketCount['31-60']+' invoice(s), $'+bucket['31-60'].toFixed(2)+'\n- 60+ days: '+bucketCount['60+']+' invoice(s), $'+bucket['60+'].toFixed(2)+'\n\n';
        if (rows.length === 0) return {success:true, message: msg + 'No overdue invoices.'};
        msg += '**Details:**\n| # | Customer | Job | Invoiced | Days Overdue | Terms | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n';
        rows.slice(0,50).forEach((r,i) => {
          msg += '| '+(i+1)+' | '+(r.customer?.name||'--')+' | '+r.job.name+' | $'+r.invoicedTotal.toFixed(2)+' | '+r.daysOverdue+' | '+r.terms+' | '+r.paymentStatus+' |\n';
        });
        if (rows.length > 50) msg += '\n... and '+(rows.length-50)+' more.';
        return {success:true, message: msg};
      }
      if (toolName === 'generate_payment_reminder_email') {
        const job = findJob(input.job_id);
        if (!job) return {error:'Job not found: '+input.job_id};
        const customer = customers.find(c => c.id === job.customer);
        if (!customer) return {error:'Customer not found for job: '+job.name};
        const to = customer.email || '';
        if (!to) return {error:'Customer '+(customer.name||'')+' has no email on file.'};
        const items = getJobItems(job.id);
        const invoicedTotal = items.reduce((s,i) => s + (i.unitPrice||0)*(i.qtyInvoiced||0), 0);
        const docNum = _stableNumBrain('INV-', job.id, job.customer);
        const days = _invoiceTermsDays(job);
        const created = new Date(job.createdDate||new Date());
        const due = new Date(created.getTime() + days*86400000);
        const daysOverdue = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000));
        const tone = String(input.tone||'warm').toLowerCase();
        const fmtMoney = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
        let subject, body;
        if (tone === 'final') {
          subject = 'FINAL NOTICE - Past Due Invoice '+docNum+' - Midwest Educational Furnishings';
          body = 'Dear '+(customer.contact || customer.name || 'Customer')+',\n\nThis is a final notice that invoice '+docNum+' for '+job.name+' in the amount of '+fmtMoney(invoicedTotal)+' is now '+daysOverdue+' days past due.\n\nTerms: '+(job.terms||'Net 30')+'\n\nWe ask that payment be remitted within the next five business days. Please contact us immediately if there is an issue with this invoice or you need to make alternative arrangements.\n\nBlessings,\nMidwest Educational Furnishings\n(847) 847-1865';
        } else if (tone === 'firm') {
          subject = 'Past Due - Invoice '+docNum+' - Midwest Educational Furnishings';
          body = 'Dear '+(customer.contact || customer.name || 'Customer')+',\n\nInvoice '+docNum+' for '+job.name+' in the amount of '+fmtMoney(invoicedTotal)+' is now '+daysOverdue+' days past due.\n\nTerms: '+(job.terms||'Net 30')+'\n\nWe would appreciate it if you could remit payment at your earliest opportunity. If you have any questions or concerns about this invoice, please reach out directly so we can resolve them quickly.\n\nBlessings,\nMidwest Educational Furnishings\n(847) 847-1865';
        } else {
          subject = 'Friendly Payment Reminder - Invoice '+docNum+' - Midwest Educational Furnishings';
          body = 'Dear '+(customer.contact || customer.name || 'Customer')+',\n\nThis is a friendly reminder that invoice '+docNum+' for '+job.name+' in the amount of '+fmtMoney(invoicedTotal)+' is '+(daysOverdue>0?(daysOverdue+' days past due'):'now due')+'.\n\nTerms: '+(job.terms||'Net 30')+'\n\nIf payment has already been sent, please disregard this note. Otherwise, we appreciate you remitting at your earliest convenience.\n\nBlessings,\nMidwest Educational Furnishings\n(847) 847-1865';
        }
        if (typeof setPendingBrainEmail === 'function') {
          setPendingBrainEmail({
            to, from: input.from_email || '', subject, body, toLabel: customer.name || customer.contact || to
          });
          return {success:true, message:'Drafted '+tone+' reminder email to '+to+' for '+docNum+' ('+fmtMoney(invoicedTotal)+', '+daysOverdue+' days overdue). Review and edit it in the pending email panel below, then click Send.'};
        }
        return {error:'Email staging is unavailable in this context.'};
      }

      return{error:"Unknown tool: "+toolName};
    }catch(err){return{error:"Execution error: "+err.message}}
  };


  const buildContext = (query) => {
    const q = (query || "").toLowerCase();
    const memoryText = getMemoryText();
    const wantsSops = /sop|playbook|process|procedure|how.?to|training|workflow|step|guide|protocol|policy|onboard/i.test(q);
    const wantsItems = /item|line.?item|deliver|ship|receive|product|furniture|chair|desk|table|model|vendor.*order|what.*order|what.*deliver|po |purchase.?order|detail|breakdown|specific/i.test(q);
    const wantsFinancials = /financ|revenue|cost|margin|profit|loss|p&l|balance|expense|money|dollar|budget|invoice|payment|commission|paid|unpaid|overdue|ar |ap |receivable|payable/i.test(q);
    const today = new Date().toLocaleDateString("en-US", {weekday:"long",year:"numeric",month:"long",day:"numeric"});
    const totalRev = jobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
    const totalCost = jobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);


    // Smart job matching: find which jobs the query is about
    const matchedJobs=jobs.filter(j=>{const jn=j.name.toLowerCase();const words=q.split(/\s+/).filter(w=>w.length>3);return words.some(w=>jn.includes(w))||q.includes(j.id.toLowerCase())});
    // Also match by customer name
    const matchedByCustomer=q.length>5?jobs.filter(j=>{const c=customers.find(c2=>c2.id===j.customer);return c&&c.name.toLowerCase().split(/\s+/).some(w=>w.length>3&&q.includes(w.toLowerCase()))}):[]; 
    // Also match by vendor name
    const matchedVendors=vendors.filter(v=>v.name.toLowerCase().split(/\s+/).some(w=>w.length>3&&q.includes(w.toLowerCase())));
    const relevantJobs=[...new Set([...matchedJobs,...matchedByCustomer])];


    // Build job summaries -- always included, compact
    const jobSummaries = jobs.map(j => {const f=getJobFinancials(j.id);const c=customers.find(c2=>c2.id===j.customer);const r=reps.find(r2=>r2.id===j.salesRep);const items=getJobItems(j.id);const totalOrd=items.reduce((s2,i2)=>s2+i2.qtyOrdered,0);const totalRcv=items.reduce((s2,i2)=>s2+i2.qtyReceived,0);return j.name+"("+j.phase+"|"+(c?.name||"")+" | Rep:"+(r?.name||"")+" | Rev:$"+Math.round(f.totalRevenue)+" | Cost:$"+Math.round(f.totalCost)+" | Margin:"+f.margin.toFixed(1)+"% | Delivered:"+totalRcv+"/"+totalOrd+" | Pay:"+j.paymentStatus+" | Due:"+(j.dueDate||"none")+" | ID:"+j.id+")"}).join("\n");


    // Line item details: include for relevant jobs OR if user asks about items/deliveries
    let lineItemDetail="";
    const jobsToDetail=relevantJobs.length>0?relevantJobs:(wantsItems?jobs.slice(0,5):[]); 
    if(jobsToDetail.length>0){
      lineItemDetail="\n\nLINE ITEM DETAILS:\n"+jobsToDetail.map(j=>{
        const items=getJobItems(j.id);if(items.length===0)return "";
        return "--- "+j.name+" ("+j.id+") ---\n"+items.map(i=>{
          const v=vendors.find(v2=>v2.id===i.vendor);
          const desc=(i.description||'').replace(/\n/g,' ').replace(/\r/g,'').trim();
          return "  "+desc+" | Vendor:"+(v?.name||"--")+" | Model:"+(i.modelNumber||"--")+" | Qty:"+i.qtyOrdered+" | Received:"+i.qtyReceived+" | Cost:$"+(i.unitCost||0).toFixed(2)+" | Price:$"+(i.unitPrice||0).toFixed(2)+" | Color:"+(i.color||"--")+" | Tag:"+(i.tag||"--")+" | ID:"+i.id;
        }).join("\n");
      }).filter(Boolean).join("\n");
    }


    // Vendor details: include item breakdown if asking about specific vendors
    let vendorDetail="";
    if(matchedVendors.length>0){
      vendorDetail="\n\nVENDOR ITEM DETAILS:\n"+matchedVendors.map(v=>{
        const vItems=lineItems.filter(i=>i.vendor===v.id);
        return "--- "+v.name+" ---\n"+vItems.slice(0,30).map(i=>{
          const j=jobs.find(j2=>j2.id===i.jobId);
          const desc=(i.description||'').replace(/\n/g,' ').replace(/\r/g,'').trim();
          return "  "+desc+" | Job:"+(j?.name||"--")+" | Qty:"+i.qtyOrdered+" | Cost:$"+(i.unitCost||0).toFixed(2)+" | Price:$"+(i.unitPrice||0).toFixed(2);
        }).join("\n");
      }).join("\n");
    }


    // Compact vendor and customer summaries
    const vendorSummaries = vendors.map(v=>{const spend=lineItems.filter(i=>i.vendor===v.id).reduce((s2,i2)=>s2+i2.unitCost*i2.qtyOrdered,0);const itemCount=lineItems.filter(i=>i.vendor===v.id).length;return v.name+"($"+Math.round(spend)+"|"+itemCount+" items|"+(v.discountRate*100).toFixed(0)+"%)"}).join(", ");
    const custSummaries = customers.map(c=>{const cJobs=jobs.filter(j=>j.customer===c.id);const rev=cJobs.reduce((s2,j)=>s2+getJobFinancials(j.id).totalRevenue,0);return c.name+"("+cJobs.length+" jobs|$"+Math.round(rev)+")"}).join(", ");
    const repSummaries = reps.filter(r=>!r.id.includes("SEED_FLAG")).map(r=>{const rJobs=jobs.filter(j=>j.salesRep===r.id);const rev=rJobs.reduce((s2,j)=>s2+getJobFinancials(j.id).totalRevenue,0);return r.name+"("+rJobs.length+" jobs|$"+Math.round(rev)+"|"+(r.commissionRate*100).toFixed(0)+"%)"}).join(", ");


    // Smart SOP matching -- always know what SOPs exist, include full content when relevant
    const allSopDocs=(customSops||[]).filter(s=>!["Notes","Task","DocStatuses","ManualTxn","HistoricalDoc","Settings"].includes(s.cat));
    // Build a compact index of all SOPs (always sent -- very cheap, ~50 tokens)
    const sopIndex=allSopDocs.map(s=>s.title+" ["+s.cat+"]").join(", ");
    // Determine which SOPs are relevant to this query using multi-signal matching
    const qWords=q.split(/\s+/).filter(w=>w.length>2);
    const matchedSops=allSopDocs.filter(s=>{
      const title=s.title.toLowerCase();const content=(s.content||'').toLowerCase().slice(0,500);const cat=(s.cat||'').toLowerCase();
      // Direct keyword match in title
      if(qWords.some(w=>title.includes(w)))return true;
      // Category match
      if(qWords.some(w=>cat.includes(w)))return true;
      // Semantic matches -- common question patterns to SOP topics
      const topicMap=[
        [/how.*(quote|bid|price|pricing|estimate)/,'quote'],
        [/how.*(invoice|bill|invoicing)/,'invoice'],
        [/how.*(order|purchase|po |buying)/,'purchase'],
        [/how.*(deliver|ship|receive|track)/,'deliver'],
        [/how.*(commission|comp|pay.*rep|rep.*pay)/,'commission'],
        [/how.*(customer|client|school|district)/,'customer'],
        [/how.*(vendor|manufacturer|supplier)/,'vendor'],
        [/how.*(document|report|export|pdf|print)/,'document'],
        [/how.*(discount|markup|margin|pricing)/,'discount'],
        [/how.*(new.*job|create.*job|start.*job|setup.*job|add.*job)/,'job'],
        [/how.*(sale|sell|selling|close|pipeline)/,'sale'],
        [/how.*(onboard|train|new.*hire|new.*person)/,'onboard'],
        [/how.*(plan|season|capacity|forecast)/,'plan'],
        [/what.*(process|procedure|workflow|system|step)/,'process'],
        [/what.*(brand|voice|tone|communication|messaging)/,'brand'],
        [/what.*(guideline|standard|rule|policy|requirement)/,'guide'],
        [/what.*(role|responsibility|team|who.*does|who.*handle)/,'role'],
        [/what.*(mission|vision|values|about.*company|company.*about)/,'mission'],
        [/who.*(contact|call|reach|responsible|handle)/,'role'],
        [/where.*(find|look|go|navigate|located)/,'process'],
        [/when.*(should|need|do.*i|supposed)/,'process'],
        [/can.*you.*(explain|walk|show|help|tell).*how/,'process'],
        [/tell.*me.*about.*(process|system|how)/,'process'],
        [/explain.*(process|system|how|workflow)/,'process'],
        [/walk.*me.*through/,'process'],
        [/step.*by.*step/,'process'],
        [/what.*are.*the.*steps/,'process'],
      ];
      for(const [pattern,keyword] of topicMap){
        if(pattern.test(q)&&(title.includes(keyword)||content.includes(keyword)))return true;
      }
      // Fuzzy: if query has 3+ word overlap with SOP content
      const contentWords=new Set(content.split(/\s+/).filter(w=>w.length>3));
      const overlap=qWords.filter(w=>contentWords.has(w)).length;
      if(overlap>=3)return true;
      return false;
    });
    // Broad detection: is this a "how do I" / process / help question?
    const isHelpQuestion=/^(how|what|where|when|who|can you|tell me|explain|walk|show me|help|steps|guide|process)/i.test(q);
    // If it's a help question and no SOPs matched, try a looser match
    let extraSops=[];
    if(isHelpQuestion&&matchedSops.length===0){
      extraSops=allSopDocs.filter(s=>{const t=s.title.toLowerCase();const c=(s.content||'').toLowerCase().slice(0,300);return qWords.filter(w=>w.length>3).some(w=>t.includes(w)||c.includes(w))}).slice(0,3);
    }
    const relevantSops=[...matchedSops,...extraSops];
    // Build SOP text: full content for matched SOPs, just index for everything else
    const sopFullText=relevantSops.length>0?relevantSops.map(s=>"=== "+s.title+" ["+s.cat+"] ===\n"+s.content.slice(0,1200)).join("\n\n"):"";
    const sopSection="\n\nALL SOPs AVAILABLE: "+sopIndex+(sopFullText?"\n\nRELEVANT SOP DETAILS:\n"+sopFullText:"");


    // Only include tasks when relevant
    const taskText = /task|todo|assign|follow.?up/i.test(q) ? (customSops||[]).filter(s=>s.cat==="Task").map(s=>{try{const d=JSON.parse(s.content);return d.text+" ["+d.status+"]"+(d.assignees?.length?" -> "+d.assignees.join(","):"")+(d.due?" due:"+d.due:"")}catch{return s.title}}).join("\n") : "";


    return "You are the Midwest Brain -- a full-capability AI assistant powered by Claude, built into the operating system for Midwest Educational Furnishings (Kildeer, IL). Owner: Maureen Welter. Today: " + today + ".\n\nYou are a COMPLETE AI assistant. You can do everything Claude can do: write emails, draft proposals, create content, analyze data, brainstorm ideas, explain concepts, write code, give advice, and more. You happen to ALSO have full access to the live Midwest business database below, so you can weave in real company data when relevant.\n\nIf someone asks you to write an email -- write a great email, using Midwest context if relevant. If they ask for a marketing idea -- give one. If they ask to explain a concept -- explain it. You are not limited to just answering data questions.\n\nBUSINESS CONTEXT:\nSTATS: " + jobs.length + " jobs | Rev $" + Math.round(totalRev) + " | Cost $" + Math.round(totalCost) + " | Margin " + (totalRev>0?Math.round((totalRev-totalCost)/totalRev*100):0) + "% | " + lineItems.length + " line items | " + vendors.length + " vendors | " + customers.length + " customers | " + ((customSops||[]).filter(s=>s.cat==='Prospect').length) + " prospects\n\nALL JOBS:\n" + jobSummaries + lineItemDetail + "\n\nVENDORS: " + vendorSummaries + vendorDetail + "\n\nCUSTOMERS: " + custSummaries + "\n\nREPS: " + repSummaries + sopSection + (taskText?"\n\nTASKS:\n"+taskText:"") + "\n\nRULES:\n1. You are a FULL AI assistant. You can write emails, draft documents, create proposals, brainstorm, explain anything, give business advice, and do everything Claude can normally do.\n2. When the question relates to Midwest business data, use the real numbers above. NEVER say you don't have the data.\n3. When writing emails or documents, use Midwest context naturally: 'Midwest Educational Furnishings', Maureen Welter, Kildeer IL, the customer/vendor names from the database.\n4. For 'how do I' questions about business processes: check the RELEVANT SOP DETAILS section. If an SOP covers it, answer FROM the SOP.\n5. For general knowledge questions, advice, brainstorming, writing help: answer like a world-class AI assistant would. You are not limited to business data.\n6. When asked about a job, use its LINE ITEM DETAILS for specific products, vendors, quantities, and costs.\n7. Show your math when doing financial calculations.\n8. Think like a CFO+COO+executive assistant combined.\n9. Keep answers concise but complete. Match the tone to what's being asked -- formal for emails, casual for brainstorming, detailed for analysis.\n10. FORMAT DATA AS TABLES: When showing line items, price comparisons, job lists, vendor data, or any structured data with 3+ rows, ALWAYS use markdown table format (| Col1 | Col2 |). The chat renders markdown tables as styled interactive tables. Include dollar signs for money columns. This is critical for readability.\n11. At the end of business-related answers, suggest 2-3 follow-up questions:\n>> [question 1]\n>> [question 2]\n>> [question 3]\n12. NEVER use emoji. Text only.\n13. When the user asks you to DO something (update, create, mark, change, set, navigate), USE THE TOOLS. Don't just describe what would happen -- call the tool. You will see a confirmation before the action executes.\n14. For job references: match by job ID or by name keywords. If ambiguous, ask which job.\n15. When using tools, briefly explain what you are about to do BEFORE the tool call.\n16. PROACTIVELY USE save_memory to remember important patterns, preferences, decisions, and insights from conversations. Your memory persists forever and makes you smarter over time.\n16. Use detect_anomalies for health checks. Use analyze_trends for patterns. Use summarize_context for briefings. Use predictive_flag for risk assessment.\n17. Use draft_email for professional emails with Midwest branding.\n18. Use database_query for complex data lookups. Use parse_uploaded_file ONLY for files at public URLs.\n19. CRITICAL FILE ATTACHMENT RULE: When a user attaches a file via the paperclip button, the file content is ALREADY EMBEDDED directly in the user message as text or document blocks. You can read it right there. Do NOT call parse_uploaded_file for attached files. The data is already here.\n\nWhen a file is attached, be PROACTIVE about what you can do with it:\n- VENDOR QUOTE (has model numbers, prices, quantities): Extract all line items and use create_job_from_file to build a complete job. Ask for the customer name if not obvious.\n- CUSTOMER LIST (schools, districts, contacts): Use import_customers_from_file to add them to the directory.\n- VENDOR LIST (manufacturers, suppliers): Use import_vendors_from_file to add them.\n- INVOICE/RECEIPT: Extract the data, match to existing jobs, summarize what is owed.\n- PRICE LIST: Compare against existing job prices using compare_quote_to_job.\n- GENERAL DOCUMENT: Analyze thoroughly, extract key data, suggest next actions.\n\nAlways tell the user what you found AND what you can do with it. Don't just describe the file -- offer to take action.\n21. You have WEB SEARCH capability. When asked about current events, market prices, competitor info, or anything needing real-time data, the web_search tool is always available and Claude uses it automatically.\n22. After substantive interactions, consider what should be saved to memory." + (memoryText ? "\n\nBRAIN MEMORY (persistent knowledge):\n" + memoryText : "");
  };


  // Convert attached file to Anthropic API content blocks
  const processFileForBrain = async (file) => {
    if (!file || !file.name) throw new Error('Invalid file');
    // Size check: 30MB max (Anthropic API has a 32MB limit, leave headroom for base64 encoding)
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File is too large ('+(file.size/1024/1024).toFixed(1)+'MB). Max is 30MB. Try compressing or splitting the file.');
    }
    if (file.size === 0) throw new Error('File appears to be empty');
    const parts = file.name.split('.');
    const ext = (parts.length > 1 ? parts.pop() : '').toLowerCase().trim();
    const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);
    const isHeic = ['heic','heif'].includes(ext);
    const isPdf = ext === 'pdf';
    const isExcel = ['xls','xlsx','xlsm'].includes(ext);
    const isCsv = ['csv','tsv'].includes(ext);
    const isDocx = ext === 'docx' || ext === 'doc';
    const isText = ['txt','json','md','log','xml'].includes(ext);
    // Helper: read file as base64 with robust error handling
    const readBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result;
          if (typeof result !== 'string') return reject(new Error('Unexpected file read result'));
          const commaIdx = result.indexOf(',');
          if (commaIdx < 0) return reject(new Error('Invalid data URL'));
          resolve(result.slice(commaIdx + 1));
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Could not read file. It may be corrupted or inaccessible.'));
      reader.onabort = () => reject(new Error('File read was cancelled'));
      try { reader.readAsDataURL(f); } catch (e) { reject(e); }
    });
    // Helper: read file as text with fallback for older browsers
    const readText = async (f) => {
      if (typeof f.text === 'function') return await f.text();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read file as text'));
        reader.readAsText(f);
      });
    };
    // Helper: read file as ArrayBuffer with fallback
    const readArrayBuffer = async (f) => {
      if (typeof f.arrayBuffer === 'function') return await f.arrayBuffer();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsArrayBuffer(f);
      });
    };


    if (isHeic) {
      throw new Error('HEIC images from iPhone are not supported. Change your iPhone camera setting to "Most Compatible" (Settings > Camera > Formats), or convert the image to JPEG before uploading.');
    }


    if (isExcel) {
      const XLSX = await import('xlsx');
      const data = await readArrayBuffer(file);
      const wb = XLSX.read(data, {type:'array'});
      let textContent = 'FILE: ' + file.name + '\n\n';
      for (const sn of wb.SheetNames) {
        const ws = wb.Sheets[sn];
        const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        textContent += '=== Sheet: ' + sn + ' (' + rows.length + ' rows) ===\n';
        rows.forEach((row, ri) => {
          const cells = row.map(c => String(c||'').replace(/\s*[\r\n]+\s*/g,' ').trim()).filter(Boolean);
          if (cells.length >= 1) textContent += 'R' + ri + ': ' + cells.join(' | ') + '\n';
        });
        textContent += '\n';
      }
      return [{type:'text', text:'[Attached Excel file: ' + file.name + ']\n\n' + textContent.slice(0, 200000)}];
    }
    
    if (isCsv) {
      const text = await readText(file);
      return [{type:'text', text:'[Attached '+ext.toUpperCase()+' file: ' + file.name + ']\n\n' + text.slice(0, 100000)}];
    }


    if (isDocx) {
      const base64 = await readBase64(file);
      brainLastFileRef.current = {name:file.name, base64, mediaType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
      return [{type:'document', source:{type:'base64', media_type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data:base64}}, {type:'text', text:'[Attached Word document: ' + file.name + '] Analyze this document thoroughly. Extract all content.'}];
    }


    if (isPdf) {
      const base64 = await readBase64(file);
      brainLastFileRef.current = {name:file.name, base64, mediaType:'application/pdf'};
      return [{type:'document', source:{type:'base64', media_type:'application/pdf', data:base64}}, {type:'text', text:'[Attached PDF: ' + file.name + '] Analyze this document thoroughly.'}];
    }


    if (isImage) {
      const base64 = await readBase64(file);
      const mimeMap = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'};
      brainLastFileRef.current = {name:file.name, base64, mediaType:mimeMap[ext]||'image/jpeg'};
      return [{type:'image', source:{type:'base64', media_type:mimeMap[ext]||'image/jpeg', data:base64}}, {type:'text', text:'[Attached image: ' + file.name + '] Describe and analyze what you see.'}];
    }


    if (isText || !ext) {
      const text = await readText(file);
      if (ext === 'json') {
        try { const parsed = JSON.parse(text); return [{type:'text', text:'[Attached JSON file: ' + file.name + ']\n\n' + JSON.stringify(parsed, null, 2).slice(0, 100000)}]; } catch {}
      }
      return [{type:'text', text:'[Attached file: ' + file.name + ']\n\n' + text.slice(0, 100000)}];
    }


    // Unknown extension: try reading as text, fall back to error
    try {
      const text = await readText(file);
      if (text && text.length > 0) {
        return [{type:'text', text:'[Attached file: ' + file.name + ']\n\n' + text.slice(0, 100000)}];
      }
    } catch {}
    throw new Error('Unsupported file type: .'+ext+'. Supported: PDF, images (JPG/PNG/GIF/WebP), Excel, CSV, Word, and text files.');
  };


  const handleQuery = async () => {
    if (!brainQuery.trim() && !brainFile) return;
    const q = brainQuery.trim();
    setBrainQuery("");
    setHistory(p => [...p, { role: "user", content: (brainFile ? "[Attached: " + brainFile.name + "] " : "") + q }]);
    setBrainLoading(true);
    setPendingActions([]);
    try {
      const ctx = buildContext(q);
      // Build message content - include attached file if present
      let userContent = q;
      if (brainFile) {
        try {
          const fileBlocks = await processFileForBrain(brainFile);
          userContent = [...fileBlocks, {type:'text', text:(q || 'A file has been attached. Analyze it thoroughly: identify what type of document this is (quote, invoice, customer list, vendor list, price sheet, etc), extract ALL data including line items/rows/entries, and then tell me what you found and what actions you can take with it (create a job, import customers, import vendors, compare prices, etc). Be specific about the data you extracted.') + '\n\n[SYSTEM: The file content is embedded above. Read it directly. Do NOT call parse_uploaded_file. The data is already here in this message.]'}];
          // Save file context for follow-up messages
          const textBlock = fileBlocks.find(b => b.type === 'text');
          const hasDoc = fileBlocks.some(b => b.type === 'document' || b.type === 'image');
          setBrainFileContext({name: brainFile.name, content: textBlock?.text || '', blocks: fileBlocks, hasDoc});
          setBrainFile(null); setBrainFilePreview(null);
        } catch(e) {
          notify('File error: ' + e.message, 'error');
          setHistory(p => [...p, {role:"assistant", content: "I couldn't read that file. " + e.message + "\n\nPlease try again with a different file or format."}]);
          setBrainFile(null); setBrainFilePreview(null);
          setBrainLoading(false);
          return;
        }
      } else if (brainFileContext) {
        // Include file context in follow-up messages so the AI remembers the file
        if (brainFileContext.hasDoc && brainFileContext.blocks) {
          // For PDFs/images, re-send the actual document/image blocks so Claude can see them
          userContent = [...brainFileContext.blocks, {type:'text', text:q + '\n\n[SYSTEM: The previously attached file "' + brainFileContext.name + '" is embedded above. Read it directly.]'}];
        } else {
          userContent = [{type:'text', text:'[Context: Previously uploaded file "' + brainFileContext.name + '" -- the full file content is below. Read it directly, do NOT call parse_uploaded_file.]\n' + (brainFileContext.content || '').slice(0, 30000) + '\n\n' + q}];
        }
      }
      const msgs = [...history.filter(h=>h.role==="user"||h.role==="assistant").slice(-8).map(h=>({role:h.role,content:typeof h.content==="string"?h.content:h.content})),{role:"user",content:userContent}];
      let data;
      let streamPlaceholderIdx = -1;
      // Auto-retry transient API overloads (HTTP 529 "Overloaded", rate limits) with exponential
      // backoff so a busy-API blip during an upload self-heals instead of surfacing "Try again".
      let brainAttempt = 0;
      while (true) {
      if (brainAttempt > 0) { await new Promise(r => setTimeout(r, 700 * Math.pow(2, brainAttempt - 1))); }
      brainAttempt++;
      streamPlaceholderIdx = -1;
      const response = await fetch("/api/brain", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:ctx,messages:msgs,tools:brainTools,stream:true})});
      // If server fell back to non-streaming (e.g. error path), parse as JSON.
      const ctype = (response.headers.get("content-type")||"").toLowerCase();
      if (!ctype.includes("text/event-stream")) {
        data = await response.json();
      } else {
        // === STREAMING PATH ===
        // Accumulate SSE events into a `data` shape that matches the non-streaming
        // response (data.content = array of content blocks). Update the displayed
        // assistant message in real time as text deltas arrive.
        const reconstructed = { content: [], stop_reason: null, usage: null };
        // Per-block working state: text accumulators and tool_use partial-json accumulators
        const blocks = {}; // index -> { type, text?, name?, id?, partialJson? }
        let placeholderInserted = false;
        // Append placeholder assistant bubble so the cursor can render next to it.
        // The placeholder is always the LAST item in history once inserted, so we
        // identify it by index at append-time using a pure setHistory updater.
        const insertPlaceholder = () => {
          if (placeholderInserted) return;
          placeholderInserted = true;
          setIsStreaming(true);
          setHistory(p => [...p, { role:"assistant", content:"" }]);
        };
        const appendToPlaceholder = (deltaText) => {
          if (!placeholderInserted) insertPlaceholder();
          // Pure updater: find the last assistant bubble (which is our placeholder
          // since we just inserted it) and append the delta to its content.
          setHistory(p => {
            // Walk backward to find the most recent assistant message. This is
            // the placeholder we inserted (newer messages haven't been added).
            let lastAssistantIdx = -1;
            for (let k = p.length - 1; k >= 0; k--) {
              if (p[k].role === "assistant") { lastAssistantIdx = k; break; }
            }
            if (lastAssistantIdx < 0) return p;
            // Track the placeholder's index in the outer scope so the post-stream
            // cleanup code can find it.
            streamPlaceholderIdx = lastAssistantIdx;
            const next = [...p];
            const cur = next[lastAssistantIdx];
            next[lastAssistantIdx] = { ...cur, content: (cur.content || "") + deltaText };
            return next;
          });
        };
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamErr = null;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream:true });
            // Parse SSE events: each event is separated by a blank line.
            // An event has lines like "event: foo\ndata: {...}".
            let nlIdx;
            while ((nlIdx = sseBuffer.indexOf("\n\n")) !== -1) {
              const rawEvent = sseBuffer.slice(0, nlIdx);
              sseBuffer = sseBuffer.slice(nlIdx + 2);
              if (!rawEvent.trim()) continue;
              const dataLine = rawEvent.split("\n").find(l => l.startsWith("data:"));
              if (!dataLine) continue;
              const jsonStr = dataLine.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              let evt;
              try { evt = JSON.parse(jsonStr); } catch { continue; }
              if (evt.type === "error") {
                streamErr = evt.error?.message || "Stream error";
                break;
              }
              if (evt.type === "message_start" && evt.message) {
                reconstructed.id = evt.message.id;
                reconstructed.role = evt.message.role;
                reconstructed.model = evt.message.model;
              } else if (evt.type === "content_block_start") {
                const cb = evt.content_block || {};
                blocks[evt.index] = { ...cb, partialJson: "" };
              } else if (evt.type === "content_block_delta") {
                const b = blocks[evt.index] || {};
                if (evt.delta?.type === "text_delta" && typeof evt.delta.text === "string") {
                  b.text = (b.text || "") + evt.delta.text;
                  blocks[evt.index] = b;
                  // Only stream text deltas to the visible bubble. Tool-use and web-search
                  // deltas are accumulated silently and surfaced after stream completion.
                  if (b.type === "text") appendToPlaceholder(evt.delta.text);
                } else if (evt.delta?.type === "input_json_delta" && typeof evt.delta.partial_json === "string") {
                  b.partialJson = (b.partialJson || "") + evt.delta.partial_json;
                  blocks[evt.index] = b;
                }
              } else if (evt.type === "content_block_stop") {
                const b = blocks[evt.index];
                if (b) {
                  // Finalize tool_use blocks: parse the accumulated partial_json into input.
                  if (b.type === "tool_use" && b.partialJson) {
                    try { b.input = JSON.parse(b.partialJson); } catch { b.input = b.input || {}; }
                  }
                  // Strip our internal partialJson scratch field before pushing.
                  const finalBlock = { ...b };
                  delete finalBlock.partialJson;
                  reconstructed.content.push(finalBlock);
                }
              } else if (evt.type === "message_delta") {
                if (evt.delta?.stop_reason) reconstructed.stop_reason = evt.delta.stop_reason;
                if (evt.usage) reconstructed.usage = evt.usage;
              }
              // ping and message_stop are no-ops here.
            }
          }
        } catch (readErr) {
          streamErr = readErr.message || "Stream read error";
        }
        // Stream ended.
        setIsStreaming(false);
        if (streamErr) {
          // Transient API overload / rate limit before any text streamed -> auto-retry with backoff.
          if (/overload|rate limit|429|529|too many requests|temporarily/i.test(String(streamErr)) && (!placeholderInserted || !reconstructed.content.some(b => b.type === "text" && b.text)) && brainAttempt <= 3) {
            continue;
          }
          // If we already streamed some text, leave it visible and append a note.
          // Otherwise, surface the error directly.
          if (placeholderInserted && reconstructed.content.some(b => b.type === "text" && b.text)) {
            setHistory(p => {
              if (streamPlaceholderIdx < 0 || streamPlaceholderIdx >= p.length) return p;
              const next = [...p];
              const cur = next[streamPlaceholderIdx];
              next[streamPlaceholderIdx] = { ...cur, content: (cur.content || "") + "\n\n[Stream interrupted: " + streamErr + " -- partial response shown above. Try again to retry.]" };
              return next;
            });
          } else {
            setHistory(p => [...p, { role:"assistant", content:"Connection error: " + streamErr + ". Try again." }]);
          }
          setBrainLoading(false);
          return;
        }
        data = reconstructed;
        // If we streamed text into a placeholder bubble AND there are tool-use blocks,
        // the downstream tool-handling code is going to APPEND a new bubble for the
        // action confirmation. To avoid duplicating the streamed text, remove the
        // placeholder before tool handling runs (the streamed text is already in
        // data.content as a text block, so it will be re-rendered alongside tool calls
        // by the existing tool-routing code below).
        const hasAnyToolBlocks = reconstructed.content.some(b => b.type === "tool_use");
        if (placeholderInserted && hasAnyToolBlocks) {
          // Streaming produced text AND tool calls. KEEP the placeholder bubble
          // (with its streamed text) and let the downstream code append a
          // separate action-confirmation bubble below it. Signal to that code
          // not to prepend the same text to the action bubble.
          data._brainStreamedTextWithTools = true;
        } else if (placeholderInserted && !hasAnyToolBlocks) {
          // Pure text response -- the placeholder bubble already shows the full text.
          // Skip the downstream "append assistant text bubble" code by signaling we
          // are done. We use a sentinel flag on data to communicate this.
          data._brainStreamedTextOnly = true;
        }
      }
      break;
      } // end Brain auto-retry loop (transient overload backoff)
      if(data.error){
        const msg=data.error.message||JSON.stringify(data.error);
        setHistory(p=>[...p,{role:"assistant",content:msg.includes("rate limit")?"I need a moment -- rate limit hit. Try again in 30 seconds.":"API Error: "+msg}]);
        setBrainLoading(false);return;
      }
      // Process response content blocks
      // Handle web search + regular tool responses
      const textBlocks=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
      const toolBlocks=(data.content||[]).filter(b=>b.type==="tool_use");
      // Extract web search citations
      const webCitations=[];
      (data.content||[]).filter(b=>b.type==="web_search_tool_result").forEach(b=>{(b.content||[]).filter(r=>r.type==="web_search_result").forEach(r=>{if(r.url&&r.title)webCitations.push({url:r.url,title:r.title})})});
      if(toolBlocks.length>0){
        // Separate read-only tools (auto-execute) from write tools (require confirmation)
        const readOnlyTools=new Set(['get_job_details','search_and_report','detect_anomalies','analyze_trends','summarize_context','recall_memory','predictive_flag','database_query','compare_quote_to_job','calculate_financials','export_data','get_banking_summary','get_payables_summary','draft_email','send_email']);
        const readTools=toolBlocks.filter(tb=>readOnlyTools.has(tb.name));
        const writeTools=toolBlocks.filter(tb=>!readOnlyTools.has(tb.name));
        // Auto-execute read-only tools and show results inline
        if(readTools.length>0&&writeTools.length===0){
          // Parallel tool execution: fire all read-only tools simultaneously instead of one at a time.
          // 5 tools that take 1s each go from 5s sequential to ~1s parallel.
          const readResults=await Promise.all(readTools.map(tb=>executeTool(tb.name,tb.input).catch(err=>({success:false,error:'Tool '+tb.name+' failed: '+(err?.message||String(err))}))));
          const readText=readResults.map(r=>r.success?r.message:(r.error||'Error')).join('\n\n');
          setHistory(p=>[...p,{role:"assistant",content:(data._brainStreamedTextWithTools?"":(textBlocks?textBlocks+"\n\n":""))+readText}]);
          setAnimatingIdx(history.length+1);setTimeout(()=>setAnimatingIdx(-1),800);
        } else {
        // Write tools -- show confirmation
        const allToolBlocks=writeTools.length>0?toolBlocks:writeTools;
        const actions=(allToolBlocks.length>0?allToolBlocks:toolBlocks).map(tb=>({id:tb.id,name:tb.name,input:tb.input,status:"pending"}));
        setPendingActions(actions);
        const actionSummary=actions.map(a=>{
          if(a.name==="update_job")return "Update "+((a.input.job_id||"job")+": "+Object.entries(a.input.updates||{}).map(([k,v])=>"**"+k+"** to **"+v+"**").join(", "));
          if(a.name==="create_job")return "Create new job: **"+(a.input.name||"")+"**"+(a.input.customer_name?" for "+a.input.customer_name:"");
          if(a.name==="mark_items_received")return "Mark all items on **"+(a.input.job_id||"job")+"** as received";
          if(a.name==="log_delivery")return "Log **"+a.input.quantity+"** received for '"+a.input.item_description+"' on **"+(a.input.job_id||"job")+"**";
          if(a.name==="bulk_update_jobs")return "Bulk update jobs matching "+JSON.stringify(a.input.filter)+" >> "+Object.entries(a.input.updates||{}).map(([k,v])=>"**"+k+"**=**"+v+"**").join(", ");
          if(a.name==="create_task")return "Create task: **"+(a.input.text||"")+"**"+(a.input.assignees?.length?" for "+a.input.assignees.join(", "):"");
          if(a.name==="add_note")return "Save note: **"+(a.input.title||a.input.content?.slice(0,40)||"")+"**";
          if(a.name==="update_payment_status")return "Set **"+(a.input.job_id||"job")+"** payment to **"+(a.input.status||"")+"**";
          if(a.name==="create_payment_link")return "Create Stripe payment link for **"+(a.input.job_id||"job")+"**";
          if(a.name==="add_vendor")return "Add vendor: **"+(a.input.name||"")+"**"+(a.input.category?" ("+a.input.category+")":"");
          if(a.name==="update_vendor")return "Update vendor **"+(a.input.vendor_name||"")+"**: "+Object.entries(a.input.updates||{}).map(([k,v])=>"**"+k+"**=**"+v+"**").join(", ");
          if(a.name==="add_customer")return "Add customer: **"+(a.input.name||"")+"**"+(a.input.type?" ("+a.input.type+")":"");
          if(a.name==="update_customer")return "Update customer **"+(a.input.customer_name||"")+"**: "+Object.entries(a.input.updates||{}).map(([k,v])=>"**"+k+"**=**"+v+"**").join(", ");
          if(a.name==="create_sop")return "Create SOP: **"+(a.input.title||"")+"** ["+(a.input.category||"Custom")+"]";
          if(a.name==="conditional_update")return "Conditional update: **"+(a.input.condition_description||"")+"** >> "+Object.entries(a.input.updates||{}).map(([k,v])=>"**"+k+"**=**"+v+"**").join(", ");
          if(a.name==="generate_document")return "Generate **"+(a.input.doc_type||"document")+"** for **"+(a.input.job_id||"job")+"**";
          if(a.name==="delete_job")return "Delete job **"+(a.input.job_id||"")+"** and all its line items";
          if(a.name==="duplicate_job")return "Duplicate **"+(a.input.job_id||"")+"** as **"+(a.input.new_name||"copy")+"**";
          if(a.name==="add_line_items")return "Add "+(a.input.items?.length||0)+" line item"+(a.input.items?.length!==1?"s":"")+" to **"+(a.input.job_id||"job")+"**";
          if(a.name==="search_and_report")return "Search **"+(a.input.report_type||"jobs")+"** with filters";
          if(a.name==="delete_job")return "Delete job: **"+(a.input.job_id||"")+"** and all its line items";
          if(a.name==="duplicate_job")return "Duplicate **"+(a.input.job_id||"job")+"**"+(a.input.new_name?" as **"+a.input.new_name+"**":" (Copy)");
          if(a.name==="search_and_report")return "Search **"+(a.input.entity||"jobs")+"**"+(a.input.filters?" with filters: "+JSON.stringify(a.input.filters):"");
          if(a.name==="add_line_items")return "Add **"+(a.input.items?.length||0)+" item"+(a.input.items?.length!==1?"s":"")+"** to **"+(a.input.job_id||"job")+"**";
          if(a.name==="navigate_to_page")return "Navigate to **"+(a.input.page||"")+"**";
          if(a.name==="update_line_item")return "Update line item **"+(a.input.item_id||"")+"**";
          if(a.name==="create_job_from_file")return "Create job **"+(a.input.job_name||"")+"** with **"+(a.input.items?.length||0)+" line items** from uploaded file";
          if(a.name==="compare_quote_to_job")return "Compare **"+(a.input.items?.length||0)+" items** against job **"+(a.input.job_id||"")+"**";
          if(a.name==="import_customers_from_file")return "Import **"+(a.input.customers?.length||0)+" customers** from file";
          if(a.name==="import_vendors_from_file")return "Import **"+(a.input.vendors?.length||0)+" vendors** from file";
          if(a.name==="get_job_details")return "Pull details for **"+(a.input.job_id||"job")+"**";
          if(a.name==="bulk_edit_line_items")return "Bulk update **"+(a.input.filter_description||"all")+"** items on **"+(a.input.job_id||"job")+"**";
          if(a.name==="set_doc_status")return "Set **"+(a.input.doc_type||"document")+"** on **"+(a.input.job_id||"job")+"** to **"+(a.input.status||"")+"**";
          if(a.name==="schedule_followup")return "Schedule follow-up: **"+(a.input.text||"")+"** due **"+(a.input.due_date||"")+"**";
          if(a.name==="calculate_financials")return "Calculate financials for **"+(a.input.job_id||"all jobs")+"**";
          if(a.name==="export_data")return "Export **"+(a.input.type||"data")+"**"+(a.input.job_id?" for **"+a.input.job_id+"**":"");
          if(a.name==="create_transaction")return "Add "+(a.input.type||"expense")+": **$"+(a.input.amount||0)+"** -- "+(a.input.description||"transaction")+" ["+(a.input.category||"Uncategorized")+"]";
          if(a.name==="categorize_transaction")return "Categorize **"+(a.input.transaction_description||"transaction")+"** as **"+(a.input.category||"")+"**";
          if(a.name==="update_line_item")return "Update line item: **"+(a.input.item_description||a.input.item_id||"")+"**"+(a.input.updates?" >> "+Object.entries(a.input.updates).map(([k,v])=>k+"="+v).join(", "):"");
          return a.name+"("+JSON.stringify(a.input).slice(0,60)+")";
        }).join("\n");
        setHistory(p=>[...p,{role:"assistant",content:(data._brainStreamedTextWithTools?"":(textBlocks?textBlocks+"\n\n":""))+"I'd like to take these actions:\n"+actionSummary,actions}]);
        setAnimatingIdx(history.length+1);setTimeout(()=>setAnimatingIdx(-1),800);
        }
      } else if(textBlocks){
        const citeText=webCitations.length>0?"\n\n**Sources:**\n"+webCitations.slice(0,5).map(c=>"- ["+c.title+"]("+c.url+")").join("\n"):"";
        if (data._brainStreamedTextOnly && streamPlaceholderIdx >= 0) {
          // The streaming path already displayed the text in a placeholder bubble.
          // Just append citations (if any) to that same bubble.
          if (citeText) {
            setHistory(p => {
              if (streamPlaceholderIdx >= p.length) return p;
              const next = [...p];
              const cur = next[streamPlaceholderIdx];
              next[streamPlaceholderIdx] = { ...cur, content: (cur.content || "") + citeText };
              return next;
            });
          }
          setAnimatingIdx(streamPlaceholderIdx);setTimeout(()=>setAnimatingIdx(-1),800);
        } else {
          setHistory(p=>[...p,{role:"assistant",content:textBlocks+citeText}]);
          setAnimatingIdx(history.length+1);setTimeout(()=>setAnimatingIdx(-1),800);
        }
      } else {
        setHistory(p=>[...p,{role:"assistant",content:"Unexpected response: "+JSON.stringify(data).slice(0,200)}]);
      }
    } catch (err) {
      setHistory(p => [...p, { role: "assistant", content: "Connection error: " + err.message }]);
    }
    setBrainLoading(false);
    // Auto-log interaction to memory
    try{const el=brainMemory.find(m=>m.title==="InteractionLog");let log=[];if(el){try{log=JSON.parse(JSON.parse(el.content).text||"[]")}catch{}}log.push({q:q.slice(0,80),t:new Date().toISOString().split("T")[0]});if(log.length>50)log=log.slice(-50);updateMemory("InteractionLog",JSON.stringify(log),{type:"auto"})}catch(e){}
  };


  // Execute pending actions after user confirms
  const executeActions=async()=>{
    setBrainLoading(true);
    const results=[];
    for(const action of pendingActions){
      const result=await executeTool(action.name,action.input);
      results.push({...action,result});
    }
    const summary=results.map(r=>r.result.success?"Done: "+r.result.message:"Failed: "+(r.result.error||"Unknown error")).join("\n");
    setHistory(p=>[...p,{role:"assistant",content:summary,actionResults:results}]);
    setPendingActions([]);
    notify(results.filter(r=>r.result.success).length+" action"+(results.length!==1?"s":"")+" completed");
    setAnimatingIdx(history.length+1);setTimeout(()=>setAnimatingIdx(-1),800);
    setBrainLoading(false);
  };
  const cancelActions=()=>{setPendingActions([]);setHistory(p=>[...p,{role:"assistant",content:"Actions cancelled. No changes were made."}])};


  const renderMsg = (msg) => {
    const text=typeof msg.content==="string"?msg.content:JSON.stringify(msg.content);
    const hasActions=msg.actions&&msg.actions.length>0;
    const hasResults=msg.actionResults&&msg.actionResults.length>0;
    // Parse markdown tables from text
    const renderContent=(text)=>{
      const lines=text.split("\n");
      const result=[];let i=0;
      while(i<lines.length){
        // Detect markdown table: line with |, next line with |---|
        if(lines[i]&&lines[i].includes("|")&&lines[i].trim().startsWith("|")&&i+1<lines.length&&lines[i+1]&&/^\|[\s\-:|]+\|$/.test(lines[i+1].trim())){
          const headers=lines[i].split("|").slice(1,-1).map(h=>h.trim());
          i+=2; // skip header and separator
          const rows=[];
          while(i<lines.length&&lines[i]&&lines[i].includes("|")&&lines[i].trim().startsWith("|")){
            rows.push(lines[i].split("|").slice(1,-1).map(c=>c.trim()));i++;
          }
          result.push(<div key={"tbl-"+i} style={{overflowX:"auto",margin:"8px 0",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:Math.max(400,headers.length*100)}}>
              <thead><tr style={{background:"#0a0a0a"}}>{headers.map((h,hi)=><th key={hi} style={{padding:"6px 8px",textAlign:hi>0&&/^\$|^\d/.test(rows[0]?.[hi]||"")?"right":"left",fontWeight:600,color:"#737373",fontSize:10,textTransform:"uppercase",letterSpacing:0.5,borderBottom:"1px solid #222",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((row,ri)=><tr key={ri} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>{row.map((cell,ci)=>{
                const isNum=/^\$?[\d,.]+%?$/.test(cell.trim());
                const isMoney=/^\$/.test(cell.trim());
                return <td key={ci} style={{padding:"5px 8px",textAlign:isNum?"right":"left",color:isMoney?"#2dd4bf":ci===0?"#e5e5e5":"#a3a3a3",fontFamily:isNum?"'JetBrains Mono',monospace":"inherit",fontSize:11,fontWeight:isMoney?600:400}}>{cell}</td>;
              })}</tr>)}</tbody>
            </table>
          </div>);
          continue;
        }
        const line=lines[i];
        const bold=line.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,'<code style="background:#1a1a1a;padding:1px 5px;borderRadius:4;fontSize:11;fontFamily:JetBrains Mono,monospace;color:#2dd4bf">$1</code>');
        // Headings
        if(line.startsWith("### "))result.push(<div key={i} style={{fontSize:14,fontWeight:700,color:"#e5e5e5",margin:"12px 0 4px",borderBottom:"1px solid #1a1a1a",paddingBottom:4}} dangerouslySetInnerHTML={{__html:bold.slice(4)}}/>);
        else if(line.startsWith("## "))result.push(<div key={i} style={{fontSize:15,fontWeight:800,color:"#f0f0f0",margin:"14px 0 6px",borderBottom:"1px solid #222",paddingBottom:6}} dangerouslySetInnerHTML={{__html:bold.slice(3)}}/>);
        // Suggested follow-ups
        else if(line.startsWith(">> "))result.push(<div key={i} onClick={()=>{setBrainQuery(line.slice(3));setTimeout(handleQuery,50)}} style={{padding:"6px 12px",margin:"3px 0",borderRadius:8,border:"1px solid rgba(45,212,191,0.12)",background:"rgba(45,212,191,0.03)",color:"#2dd4bf",fontSize:12,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(45,212,191,0.08)"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(45,212,191,0.03)"}}>{line.slice(3)}</div>);
        // Bullet lists
        else if(line.startsWith("- ")||line.startsWith("* "))result.push(<div key={i} style={{display:"flex",gap:8,padding:"2px 0"}}><div style={{width:4,height:4,borderRadius:"50%",background:"#2dd4bf",marginTop:8,flexShrink:0}}/><span dangerouslySetInnerHTML={{__html:bold.slice(2)}}/></div>);
        // Numbered lists
        else if(/^\d+\.\s/.test(line)){const numEnd=line.indexOf('. ');result.push(<div key={i} style={{display:"flex",gap:8,padding:"2px 0"}}><span style={{color:"#2dd4bf",fontWeight:600,fontSize:12,minWidth:16,flexShrink:0}}>{line.slice(0,numEnd+1)}</span><span dangerouslySetInnerHTML={{__html:bold.slice(numEnd+2)}}/></div>)}
        // Bold text
        else if(bold!==line)result.push(<div key={i} style={{padding:"2px 0"}} dangerouslySetInnerHTML={{__html:bold}}/>);
        else result.push(<div key={i} style={{padding:"2px 0",minHeight:line?"auto":8}}>{line}</div>);
        i++;
      }
      return result;
    };
    return <div>
      {renderContent(text)}
      {/* Show View Job button when an action result created a job */}
      {hasResults&&msg.actionResults.some(r=>r.result.success&&r.result.message&&/Created job/.test(r.result.message))&&(()=>{
        const m=msg.actionResults.find(r=>r.result.message&&/Created job/.test(r.result.message));
        const jidMatch=m?.result.message.match(/\((JOB-[^)]+)\)/);
        return jidMatch?<button onClick={()=>{window._brainNavJob=jidMatch[1];setPage("jobs")}} style={{marginTop:8,padding:"8px 16px",borderRadius:10,border:"1px solid rgba(45,212,191,0.2)",background:"rgba(45,212,191,0.06)",color:"#2dd4bf",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(45,212,191,0.12)"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(45,212,191,0.06)"}}>View Job: {jidMatch[1]}</button>:null;
      })()}
      {hasActions&&pendingActions.length>0&&<div style={{marginTop:12,padding:"12px 16px",background:"linear-gradient(135deg,rgba(167,139,250,0.06),rgba(45,212,191,0.04))",border:"1px solid rgba(167,139,250,0.15)",borderRadius:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:8,height:8,borderRadius:"50%",background:"#a78bfa",animation:"pulse 1.5s infinite"}}/><span style={{fontSize:12,fontWeight:700,color:"#a78bfa",letterSpacing:0.5}}>ACTIONS READY</span></div>
        {pendingActions.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",fontSize:12,color:"#d4d4d4"}}><div style={{width:6,height:6,borderRadius:2,background:"#a78bfa",flexShrink:0}}/><span>{a.name.replace(/_/g," ")}: <strong>{a.name==="update_job"?(a.input.job_id||"")+" >> "+Object.entries(a.input.updates||{}).map(([k,v])=>k+"="+v).join(", "):a.name==="create_job"?a.input.name:a.name==="create_task"?a.input.text:a.name==="mark_items_received"?a.input.job_id:a.name==="navigate_to_page"?a.input.page:JSON.stringify(a.input).slice(0,60)}</strong></span></div>)}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={executeActions} style={{padding:"8px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2dd4bf,#14b8a6)",color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(45,212,191,0.3)",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"}}>Confirm</button>
          <button onClick={cancelActions} style={{padding:"8px 16px",borderRadius:10,border:"1px solid #333",background:"transparent",color:"#737373",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#f87171"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373"}}>Cancel</button>
        </div>
      </div>}
      {hasResults&&<div style={{marginTop:10}}>
        {msg.actionResults.map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",marginBottom:4,borderRadius:8,background:r.result.success?"rgba(52,211,153,0.06)":"rgba(248,113,113,0.06)",border:"1px solid "+(r.result.success?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)"),fontSize:12}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:r.result.success?"#34d399":"#f87171",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:"#000",fontSize:11,fontWeight:700}}>{r.result.success?"✓":"!"}</span></div>
          <span style={{color:r.result.success?"#34d399":"#f87171"}}>{r.result.message||r.result.error}</span>
        </div>)}
      </div>}
    </div>;
  };


  return <div className="brain-page" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 80px)",background:"#000"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",flexShrink:0}}>
      <div style={{width:10,height:10,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d39980"}}/>
      <span style={{fontSize:13,color:"#34d399",fontWeight:600}}>Live</span>
      <span style={{fontSize:13,fontWeight:700,color:"#f0f0f0"}}>Brain</span>
      <span style={{fontSize:11,color:"#333"}}>|</span>
      <span style={{fontSize:11,color:"#525252"}}>{jobs.length} jobs, {vendors.length} vendors, {customers.length} customers</span>
      <div style={{marginLeft:"auto",display:"flex",gap:4}}>
        {history.length>1&&<button onClick={()=>{setBrainHistory([history[0]]);setPendingActions([]);setBrainFileContext(null)}} title="Clear chat" style={{padding:"4px 10px",borderRadius:6,border:"1px solid #222",background:"transparent",color:"#525252",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="#f8717130"}} onMouseLeave={e=>{e.currentTarget.style.color="#525252";e.currentTarget.style.borderColor="#222"}}>Clear</button>}
      </div>
    </div>
    <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"8px 16px",display:"flex",flexDirection:"column",gap:8,background:"#000",minHeight:0}}>
      {history.map((msg,i)=><div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",animation:i===animatingIdx?"fadeUp 0.5s ease-out":"none"}}>
        {msg.role==="user"?
          <div style={{maxWidth:"75%",padding:"10px 16px",borderRadius:"18px 18px 4px 18px",background:"#1a1a1a",border:"1px solid #222",color:"#f0f0f0",fontSize:13,lineHeight:1.6}}>{msg.content}</div>
        :msg.role==="system"?
          <div style={{maxWidth:"85%",padding:"10px 0",color:"#525252",fontSize:13,lineHeight:1.6,fontStyle:"italic"}}>{msg.content}</div>
        :
          <div style={{maxWidth:"85%",padding:"2px 0",color:"#d4d4d4",fontSize:13,lineHeight:1.7,animation:i===animatingIdx?"fadeUp 0.5s ease-out":"none"}}>{renderMsg(msg)}{isStreaming&&i===history.length-1&&<span style={{display:"inline-block",width:8,height:14,marginLeft:2,verticalAlign:"middle",background:"#2dd4bf",borderRadius:1,animation:"brainCursor 0.9s steps(2) infinite"}}/>}</div>
        }
      </div>)}
      {brainLoading&&!isStreaming&&<div style={{display:"flex",gap:4,padding:"8px 0"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite"}}/>
        <div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite 0.2s"}}/>
        <div style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite 0.4s"}}/></div>}
    </div>
    {/* Brain-drafted email -- editable inline before send */}
    {pendingBrainEmail&&<div style={{padding:"12px 16px",flexShrink:0,borderTop:"1px solid #111",background:"linear-gradient(135deg,rgba(167,139,250,0.04),rgba(45,212,191,0.03))"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#a78bfa",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:11,fontWeight:700,color:"#a78bfa",letterSpacing:0.5,fontFamily:"'JetBrains Mono',monospace"}}>EMAIL DRAFT READY</span>
        {pendingBrainEmail.toLabel&&<span style={{fontSize:11,color:"#a3a3a3"}}>to {pendingBrainEmail.toLabel}</span>}
        <button onClick={()=>setPendingBrainEmail(null)} style={{marginLeft:"auto",background:"transparent",border:"1px solid #1a1a1a",color:"#a3a3a3",cursor:"pointer",fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:"4px 10px",borderRadius:5}} onMouseEnter={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="#f8717130"}} onMouseLeave={e=>{e.currentTarget.style.color="#a3a3a3";e.currentTarget.style.borderColor="#1a1a1a"}}>DISCARD</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:6,marginBottom:6,alignItems:"center"}}>
        <label style={{fontSize:11,color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace"}}>From:</label>
        <input value={pendingBrainEmail.from||''} onChange={e=>setPendingBrainEmail({...pendingBrainEmail,from:e.target.value})} placeholder="your@mwfurnishings.com" style={{padding:"6px 10px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:6,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        <label style={{fontSize:11,color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace"}}>To:</label>
        <input value={pendingBrainEmail.to||''} onChange={e=>setPendingBrainEmail({...pendingBrainEmail,to:e.target.value})} placeholder="recipient@email.com" style={{padding:"6px 10px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:6,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        <label style={{fontSize:11,color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace"}}>Subject:</label>
        <input value={pendingBrainEmail.subject||''} onChange={e=>setPendingBrainEmail({...pendingBrainEmail,subject:e.target.value})} placeholder="Subject" style={{padding:"6px 10px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:6,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
      </div>
      <textarea value={pendingBrainEmail.body||''} onChange={e=>setPendingBrainEmail({...pendingBrainEmail,body:e.target.value})} placeholder="Email body" rows={16} style={{width:"100%",padding:"8px 12px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:6,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:320,boxSizing:"border-box",lineHeight:1.5}}/>
      <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
        <button onClick={async()=>{
          if(!pendingBrainEmail.to||!pendingBrainEmail.subject||!pendingBrainEmail.body){notify("Fill in To, Subject, and Body","error");return}
          if(!pendingBrainEmail.from){notify("Fill in From email address","error");return}
          // Format-check the From field locally so the user gets a clear message
          // instead of Resend's cryptic "Invalid reply_to field" error.
          {
            const _f=String(pendingBrainEmail.from).trim();
            const _bare2=/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
            const _named2=/^.+\s*<\s*[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\s*>$/;
            if(!_bare2.test(_f)&&!_named2.test(_f)){notify("From must be a valid email address (e.g. lisa@mwfurnishings.com)","error");setBrainEmailSending(false);return}
            // Same check on To so we surface bad recipients before the send too.
            const _t=String(pendingBrainEmail.to||"").trim();
            if(!_bare2.test(_t)&&!_named2.test(_t)){notify("To must be a valid email address","error");setBrainEmailSending(false);return}
          }
          setBrainEmailSending(true);
          try{
            const bodyHtml=(pendingBrainEmail.body||'').split('\n').map(l=>l.trim()===''?'<br/>':'<p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">'+l.replace(/</g,'&lt;')+'</p>').join('');
            const wrapper='<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:24px;text-align:left">'+bodyHtml+'</div>';
            const resp=await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:pendingBrainEmail.to,from:pendingBrainEmail.from,subject:pendingBrainEmail.subject,html:wrapper})});
            const data=await resp.json();
            if(resp.ok){notify("Email sent to "+pendingBrainEmail.to);setPendingBrainEmail(null)}
            else{notify("Email error: "+(data.error||"Failed"),"error")}
          }catch(e){notify("Network error: "+e.message,"error")}
          setBrainEmailSending(false);
        }} disabled={brainEmailSending} style={{padding:"8px 20px",borderRadius:10,border:"none",background:brainEmailSending?"#1a1a1a":"linear-gradient(135deg,#2dd4bf,#14b8a6)",color:brainEmailSending?"#525252":"#000",fontWeight:700,fontSize:13,cursor:brainEmailSending?"wait":"pointer",fontFamily:"inherit",boxShadow:brainEmailSending?"none":"0 4px 16px rgba(45,212,191,0.3)",transition:"all 0.2s"}}>{brainEmailSending?"Sending...":"Send Email"}</button>
        <button onClick={()=>setPendingBrainEmail(null)} disabled={brainEmailSending} style={{padding:"8px 16px",borderRadius:10,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>Cancel</button>
        <span style={{marginLeft:"auto",fontSize:10,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>Edit any field above before sending</span>
      </div>
    </div>}
    {history.length<=1&&<div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 16px",flexShrink:0,maxHeight:"40vh",overflowY:"auto"}}>{suggestedQueries.map(q=><button key={q} onClick={()=>{setBrainQuery(q);setTimeout(handleQuery,50)}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #1a1a1a",background:"transparent",color:"#525252",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf30";e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#525252"}}>{q}</button>)}</div>}
    <div style={{display:"flex",gap:8,padding:"12px 16px",background:"#000",flexShrink:0,borderTop:"1px solid #111",alignItems:"center"}}>
      <input ref={brainFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif,.xls,.xlsx,.xlsm,.csv,.tsv,.txt,.json,.md,.doc,.docx,application/pdf,image/*,text/*" onChange={e=>{
        const f=e.target.files?.[0];
        if(f){
          const MAX=30*1024*1024;
          if(f.size>MAX){notify('File too large: '+(f.size/1024/1024).toFixed(1)+'MB. Max 30MB.','error');e.target.value='';return}
          if(f.size===0){notify('File appears to be empty','error');e.target.value='';return}
          setBrainFile(f);setBrainFilePreview(f.name);notify("File attached: "+f.name);
        }
        e.target.value="";
      }} style={{display:"none"}}/>
      {brainFileContext&&!brainFile&&!brainFilePreview&&<div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:"rgba(45,212,191,0.05)",borderRadius:12,fontSize:10,color:"#525252",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>{brainFileContext.name}<span onClick={()=>setBrainFileContext(null)} style={{cursor:"pointer",marginLeft:2,color:"#444",fontSize:12,padding:"0 4px",minHeight:24,display:"inline-flex",alignItems:"center"}}>x</span></div>}
      {brainFilePreview&&<div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:"rgba(45,212,191,0.08)",borderRadius:12,fontSize:11,color:"#2dd4bf",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>{brainFilePreview}<span onClick={()=>{setBrainFile(null);setBrainFilePreview(null)}} style={{cursor:"pointer",marginLeft:2,color:"#737373",fontSize:14,padding:"0 4px",minHeight:24,display:"inline-flex",alignItems:"center"}}>×</span></div>}
      <button onClick={()=>brainFileRef.current?.click()} aria-label="Attach a file" title="Attach a file (PDF, image, Excel, CSV, Word)" style={{background:"transparent",border:"none",cursor:"pointer",color:brainFile?"#2dd4bf":"#525252",fontSize:18,padding:"10px 10px",borderRadius:8,transition:"color 0.15s",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",minWidth:40,minHeight:40,touchAction:"manipulation"}} onMouseEnter={e=>{e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{if(!brainFile)e.currentTarget.style.color="#525252"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
      <input value={brainQuery} onChange={e=>setBrainQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!isCleaningTranscript)handleQuery()}} placeholder={isCleaningTranscript?"Cleaning up transcript...":isListening?"Listening... click DONE when finished":brainFile?"Ask about "+brainFile.name+"...":brainFileContext?"Ask about "+brainFileContext.name+"...":"Ask the Brain anything..."} style={{flex:1,padding:"10px 16px",background:"#0a0a0a",border:isCleaningTranscript?"1px solid rgba(167,139,250,0.4)":isListening?"1px solid rgba(248,113,113,0.4)":brainFile?"1px solid rgba(45,212,191,0.2)":"1px solid #1a1a1a",borderRadius:24,color:"#f0f0f0",fontSize:13,outline:"none",fontFamily:"inherit",transition:"border-color 0.3s"}} onFocus={e=>{if(!isListening)e.currentTarget.style.borderColor="#2dd4bf30"}} onBlur={e=>{if(!isListening&&!brainFile)e.currentTarget.style.borderColor="#1a1a1a"}}/>
      <button onClick={startListening} title={isListening?"Click to stop dictation":"Voice input (continuous)"} style={{width:40,height:40,borderRadius:20,border:"none",background:isListening?"rgba(248,113,113,0.15)":"#0a0a0a",color:isListening?"#f87171":"#525252",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0,position:"relative"}} onMouseEnter={e=>{if(!isListening)e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{if(!isListening)e.currentTarget.style.color="#525252"}}>{isListening&&<div style={{position:"absolute",inset:-2,borderRadius:22,border:"2px solid #f87171",animation:"pulse 1.5s infinite",opacity:0.6}}/>}{isListening?<span style={{fontSize:10,fontWeight:700,letterSpacing:0.5}}>DONE</span>:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>}</button>
      <button onClick={handleQuery} disabled={brainLoading} style={{width:40,height:40,borderRadius:20,border:"none",background:brainQuery.trim()?"#2dd4bf":"#1a1a1a",color:brainQuery.trim()?"#000":"#333",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}} onMouseEnter={e=>{if(brainQuery.trim())e.currentTarget.style.background="#34d399"}} onMouseLeave={e=>{e.currentTarget.style.background=brainQuery.trim()?"#2dd4bf":"#1a1a1a"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    </div>
  </div>;
}
function ProspectsPage({reps,customSops,addSop,deleteSop,notify}){
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [stateFilter,setStateFilter]=useState('all');
  const [repFilter,setRepFilter]=useState('all');
  const [sortCol,setSortCol]=useState('rank');
  const [sortDir,setSortDir]=useState('asc');
  const [editing,setEditing]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [addForm,setAddForm]=useState({name:'',title:'',company:'',email:'',phone:'',city:'',state:'',linkedin:'',website:'',twitter:'',employees:'',status:'New',notes:'',address:'',assignedRep:'',revenue:'',funding:''});
  const [selected,setSelected]=useState(new Set());
  const [expandedId,setExpandedId]=useState(null);
  const [viewMode,setViewMode]=useState('table');
  const [pageNum,setPageNum]=useState(0);
  const PAGE_SIZE=50;
  const fileRef=React.useRef(null);


  const prospects=(customSops||[]).filter(s=>s.cat==='Prospect').map(s=>{try{return{id:s.id,...JSON.parse(s.content)}}catch{return null}}).filter(Boolean);
  const statuses=['New','Contacted','Replied','Meeting Set','Proposal','Won','Lost','Nurture'];
  const sc={New:'#525252',Contacted:'#a78bfa',Replied:'#2dd4bf','Meeting Set':'#fbbf24',Proposal:'#f97316',Won:'#34d399',Lost:'#f87171',Nurture:'#8b5cf6'};


  const allStates=[...new Set(prospects.map(p=>p.state).filter(Boolean))].sort();
  let filtered=prospects;
  if(search){const q=search.toLowerCase();filtered=filtered.filter(p=>[p.name,p.company,p.email,p.city,p.title,p.state,p.address].some(f=>(f||'').toLowerCase().includes(q)))}
  if(statusFilter!=='all')filtered=filtered.filter(p=>p.status===statusFilter);
  if(stateFilter!=='all')filtered=filtered.filter(p=>p.state===stateFilter);
  if(repFilter!=='all')filtered=filtered.filter(p=>p.assignedRep===repFilter);
  filtered.sort((a,b)=>{let va=a[sortCol]||'',vb=b[sortCol]||'';if(['employees','rank'].includes(sortCol)){va=parseInt(va)||0;vb=parseInt(vb)||0}else{va=String(va).toLowerCase();vb=String(vb).toLowerCase()}return sortDir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0)});


  const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  const paged=filtered.slice(pageNum*PAGE_SIZE,(pageNum+1)*PAGE_SIZE);
  const statusCounts={};statuses.forEach(s=>{statusCounts[s]=prospects.filter(p=>p.status===s).length});


  const save=(id,data)=>{addSop({id,title:data.name||'Prospect',cat:'Prospect',icon:'target',content:JSON.stringify(data),custom:true})};
  const del=(id)=>{deleteSop(id);notify('Prospect deleted')};
  const handleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('asc')}};


  // ---------- Prospect duplicate detection ----------
  // A prospect is considered a duplicate of an existing one if ANY of three keys collide:
  // Strict normalization for dedup:
  //   1. Normalized name + normalized company (case-insensitive, punctuation-stripped, org-suffix-stripped)
  //   2. Normalized email (case-insensitive, trimmed)
  //   3. Normalized LinkedIn URL (scheme/www/trailing-slash stripped, lowercased)
  //   4. Normalized phone (digits-only, last 10) -- catches cross-source dupes (LinkedIn export + Apollo export
  //      of the same person where the work-vs-personal email differs but mobile is the same).
  //   5. Name-only fallback (n:<normalized-name>) -- ONLY when no other identifier is present, so bare lead
  //      lists with just names don't bypass dedup entirely. Two rows of "John Smith" with nothing else will
  //      now be caught. (Two genuinely-different "John Smith"s with company/email differ would each have
  //      their own nc:/e:/l:/p: key and never fall back to n:, so they remain distinct.)
  // Apostrophes (including curly U+2019) are removed entirely so "Bobby's School" === "Bobbys School".
  // Other punctuation becomes whitespace, then whitespace is collapsed. Common org suffixes
  // (Inc, LLC, Corp, Co, Ltd, "The") are stripped so "ABC Schools, Inc." === "ABC Schools".
  const _normProspectText=(s)=>String(s||'').toLowerCase().replace(/['\u2018\u2019`]/g,'').replace(/[.,"\u201C\u201D&()\/\\]/g,' ').replace(/\s+/g,' ').trim();
  const _normProspectCompany=(s)=>{let n=_normProspectText(s);if(n.startsWith('the '))n=n.slice(4);n=n.replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|the)\b/g,' ').replace(/\s+/g,' ').trim();return n};
  const _normProspectEmail=(s)=>String(s||'').toLowerCase().trim();
  const _normProspectLinkedin=(s)=>String(s||'').toLowerCase().trim().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/+$/,'');
  const _normProspectPhone=(s)=>{const d=String(s||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):''};
  const _prospectKeys=(p)=>{
    const name=_normProspectText(p.name);
    const company=_normProspectCompany(p.company);
    const email=_normProspectEmail(p.email);
    const linkedin=_normProspectLinkedin(p.linkedin);
    const phone=_normProspectPhone(p.phone);
    const keys=[];
    if(name&&company)keys.push('nc:'+name+'|'+company);
    if(email)keys.push('e:'+email);
    if(linkedin)keys.push('l:'+linkedin);
    if(phone)keys.push('p:'+phone);
    // Name-only fallback ONLY when the row has no other identifier at all. Without this, a bare name-only
    // row produced zero keys and was un-dedup-able.
    if(name&&!company&&!email&&!linkedin&&!phone)keys.push('n:'+name);
    return keys;
  };
  // Build a Set of all existing prospect keys, ready to test new uploads against.
  const _buildExistingProspectKeys=()=>{
    const set=new Set();
    prospects.forEach(p=>_prospectKeys(p).forEach(k=>set.add(k)));
    return set;
  };
  // Test a candidate against an existing-keys Set. Returns either null (not a dup) or the
  // first matching key so we can report WHY it was flagged. The same Set is mutated as we
  // add new prospects, which also catches in-batch duplicates within a single CSV.
  const _checkProspectDup=(candidate,keysSet)=>{
    const keys=_prospectKeys(candidate);
    for(const k of keys){if(keysSet.has(k))return k}
    keys.forEach(k=>keysSet.add(k));
    return null;
  };


  const handleCsv=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;e.target.value='';
    try{
      const text=await file.text();const lines=text.split('\n').filter(l=>l.trim());if(lines.length<2){notify('Empty CSV');return}
      const sep=lines[0].includes('\t')?'\t':',';
      const parseRow=(line)=>{const r=[];let c='';let q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"')q=!q;else if(ch===sep&&!q){r.push(c.trim());c=''}else c+=ch}r.push(c.trim());return r};
      const hdr=parseRow(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim().toLowerCase());
      const col=(names)=>hdr.findIndex(h=>names.some(n=>h.includes(n)));
      const ci={name:col(['name','full name']),title:col(['title','job title']),company:col(['company','organization']),email:col(['email']),
        mobile:col(['mobile']),directPhone:col(['direct','work phone']),corpPhone:col(['corporate phone']),compPhone:col(['company phone']),otherPhone:col(['other phone']),
        linkedin:col(['linkedin']),compLinkedin:col(['company linkedin']),website:col(['website']),twitter:col(['twitter']),
        emp:col(['employee','# employees']),city:col(['city']),state:col(['state']),address:col(['address']),
        tier:col(['tier']),status:col(['status']),notes:col(['notes']),rank:col(['rank','#'])};
      const g=(row,idx)=>(idx>=0?(row[idx]||''):'').replace(/^"|"$/g,'').trim();
      const existingKeys=_buildExistingProspectKeys();
      let added=0,skipped=0;const skipReasons={nc:0,e:0,l:0,p:0,n:0};
      for(let i=1;i<lines.length;i++){
        const row=parseRow(lines[i]);if(row.length<3)continue;
        const name=g(row,ci.name);const company=g(row,ci.company);if(!name)continue;
        const phone=g(row,ci.mobile)||g(row,ci.directPhone)||g(row,ci.corpPhone)||g(row,ci.compPhone)||g(row,ci.otherPhone);
        const candidate={name,company,email:g(row,ci.email),linkedin:g(row,ci.linkedin),phone};
        const dupKey=_checkProspectDup(candidate,existingKeys);
        if(dupKey){skipped++;const prefix=dupKey.split(':')[0];if(skipReasons[prefix]!==undefined)skipReasons[prefix]++;continue}
        save('PROS-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),{
          rank:parseInt(g(row,ci.rank))||i,name,title:g(row,ci.title),company,email:g(row,ci.email),phone,
          linkedin:g(row,ci.linkedin),companyLinkedin:g(row,ci.compLinkedin),website:g(row,ci.website),twitter:g(row,ci.twitter),
          employees:g(row,ci.emp).replace(/,/g,''),city:g(row,ci.city),state:g(row,ci.state),address:g(row,ci.address),
          status:g(row,ci.status)||'New',notes:g(row,ci.notes),assignedRep:'',addedAt:new Date().toISOString()
        });added++;
      }
      // Primary notification: always shown, same shape as before so existing UX is preserved.
      notify(added+' prospects imported'+(skipped>0?', '+skipped+' duplicates skipped':''));
      // Secondary breakdown only when matches happened on email, LinkedIn, phone, or name-only.
      if(skipped>0&&(skipReasons.e>0||skipReasons.l>0||skipReasons.p>0||skipReasons.n>0)){
        const bits=[];
        if(skipReasons.nc>0)bits.push(skipReasons.nc+' by name+company');
        if(skipReasons.e>0)bits.push(skipReasons.e+' by email');
        if(skipReasons.l>0)bits.push(skipReasons.l+' by LinkedIn');
        if(skipReasons.p>0)bits.push(skipReasons.p+' by phone');
        if(skipReasons.n>0)bits.push(skipReasons.n+' by name (no other identifier)');
        notify('Duplicates: '+bits.join(', '));
      }
    }catch(err){notify('CSV error: '+err.message,'error')}
  };


  const addSingle=()=>{
    if(!addForm.name.trim()){notify('Name required');return}
    // Dedup: rebuild the keys-set fresh each time (prospects state changes between renders).
    const existingKeys=_buildExistingProspectKeys();
    const candidate={name:addForm.name,company:addForm.company,email:addForm.email,linkedin:addForm.linkedin,phone:addForm.phone};
    const dupKey=_checkProspectDup(candidate,existingKeys);
    if(dupKey){
      const prefix=dupKey.split(':')[0];
      const reason=prefix==='e'?'email already exists':prefix==='l'?'LinkedIn already exists':prefix==='p'?'phone number already exists':prefix==='n'?'name already exists (no other identifier on the record)':'name + company already exists';
      notify('Duplicate prospect -- '+reason,'error');
      return;
    }
    save('PROS-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),{...addForm,rank:prospects.length+1,addedAt:new Date().toISOString()});
    setAddForm({name:'',title:'',company:'',email:'',phone:'',city:'',state:'',linkedin:'',website:'',twitter:'',employees:'',status:'New',notes:'',address:'',assignedRep:'',revenue:'',funding:''});
    setShowAdd(false);
    notify('Added: '+addForm.name);
  };
  const bulkStatus=(s)=>{selected.forEach(id=>{const p=prospects.find(x=>x.id===id);if(p)save(id,{...p,status:s})});notify(selected.size+' >> '+s);setSelected(new Set())};
  const bulkDel=()=>{if(!confirm('Delete '+selected.size+' prospects?'))return;selected.forEach(id=>deleteSop(id));notify(selected.size+' deleted');setSelected(new Set())};
  const bulkAssign=(rid)=>{selected.forEach(id=>{const p=prospects.find(x=>x.id===id);if(p)save(id,{...p,assignedRep:rid})});notify(selected.size+' assigned');setSelected(new Set())};
  const selectAll=()=>{if(selected.size===paged.length)setSelected(new Set());else setSelected(new Set(paged.map(p=>p.id)))};
  const is=({...inputStyle,padding:'8px 12px',fontSize:12,borderRadius:8});
  const fN=n=>{const v=parseInt(String(n).replace(/,/g,''));if(isNaN(v))return'--';if(v>=1000000)return(v/1000000).toFixed(1)+'M';if(v>=1000)return(v/1000).toFixed(v>=10000?0:1)+'k';return String(v)};


  return <div style={{animation:'fadeUp 0.4s'}}>
    <Header title="Prospects" sub={"Sales prospecting and lead tracking -- "+prospects.length+" total contacts"}/>


    {/* KPI Dashboard Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:18}}>
      {[
        {label:'TOTAL LEADS',value:String(prospects.length),color:'#2dd4bf'},
        {label:'NEW',value:String(statusCounts['New']||0),color:'#525252'},
        {label:'CONTACTED',value:String(statusCounts['Contacted']||0),color:'#a78bfa'},
        {label:'REPLIED',value:String(statusCounts['Replied']||0),color:'#2dd4bf'},
        {label:'MEETINGS',value:String(statusCounts['Meeting Set']||0),color:'#fbbf24'},
        {label:'PROPOSALS',value:String(statusCounts['Proposal']||0),color:'#f97316'},
        {label:'WON',value:String(statusCounts['Won']||0),color:'#34d399'},
        {label:'RESPONSE RATE',value:(prospects.length>0?((((statusCounts['Replied']||0)+(statusCounts['Meeting Set']||0)+(statusCounts['Proposal']||0)+(statusCounts['Won']||0))/prospects.length)*100).toFixed(1):'0')+'%',color:((statusCounts['Replied']||0)+(statusCounts['Meeting Set']||0)+(statusCounts['Proposal']||0)+(statusCounts['Won']||0))>0?'#34d399':'#525252'},
      ].map((kpi,i)=><Card key={i} style={{padding:14,textAlign:'center',transition:'all 0.25s'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>{kpi.label}</div>
        <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:kpi.color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={kpi.value}/></div>
      </Card>)}
    </div>


    {/* Status pipeline */}
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:16,overflowX:'auto',WebkitOverflowScrolling:'touch',paddingBottom:4}}>
      <button onClick={()=>{setStatusFilter('all');setPageNum(0)}} style={{padding:'5px 12px',borderRadius:20,border:statusFilter==='all'?'1px solid #2dd4bf':'1px solid #1a1a1a',background:statusFilter==='all'?'#2dd4bf12':'transparent',color:statusFilter==='all'?'#2dd4bf':'#525252',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap',transition:'all 0.15s'}}>ALL {prospects.length}</button>
      {statuses.map(s=><button key={s} onClick={()=>{setStatusFilter(statusFilter===s?'all':s);setPageNum(0)}} style={{padding:'5px 12px',borderRadius:20,border:'1px solid '+(statusFilter===s?(sc[s]||'#333')+'60':'#1a1a1a'),background:statusFilter===s?(sc[s]||'#333')+'12':'transparent',color:statusFilter===s?sc[s]||'#f0f0f0':'#333',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap',transition:'all 0.15s'}}>{s} {statusCounts[s]||0}</button>)}
    </div>
    {/* Toolbar */}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
      <input value={search} onChange={e=>{setSearch(e.target.value);setPageNum(0)}} placeholder={"Search "+filtered.length+" prospects..."} style={{...inputStyle,maxWidth:300,background:'#111',border:'1px solid #222',padding:'10px 16px',fontSize:13}}/>
      <select value={stateFilter} onChange={e=>{setStateFilter(e.target.value);setPageNum(0)}} style={{...inputStyle,width:'auto',background:'#111',border:'1px solid #222',padding:'10px 16px',fontSize:13}}><option value="all">All States</option>{allStates.map(s=><option key={s} value={s}>{s}</option>)}</select>
      <select value={repFilter} onChange={e=>{setRepFilter(e.target.value);setPageNum(0)}} style={{...inputStyle,width:'auto',background:'#111',border:'1px solid #222',padding:'10px 16px',fontSize:13}}><option value="all">All Reps</option><option value="">Unassigned</option>{reps.filter(r=>!r.id.includes('SEED')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid #1a1a1a'}}>
          <button onClick={()=>setViewMode('table')} style={{padding:'6px 12px',border:'none',background:viewMode==='table'?'#2dd4bf15':'transparent',color:viewMode==='table'?'#2dd4bf':'#525252',fontSize:11,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>TABLE</button>
          <button onClick={()=>setViewMode('kanban')} style={{padding:'6px 12px',border:'none',borderLeft:'1px solid #1a1a1a',background:viewMode==='kanban'?'#2dd4bf15':'transparent',color:viewMode==='kanban'?'#2dd4bf':'#525252',fontSize:11,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>BOARD</button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.tsv" onChange={handleCsv} style={{display:'none'}}/>
        <Btn v="secondary" onClick={()=>fileRef.current?.click()} style={{fontSize:11,padding:'7px 14px'}}><I n="upload" s={13}/> CSV</Btn>
        <Btn onClick={()=>setShowAdd(!showAdd)} style={{fontSize:11,padding:'7px 14px'}}><I n="plus" s={13}/> Add</Btn>
      </div>
    </div>
    {/* Bulk */}
    {selected.size>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',marginBottom:10,background:'rgba(45,212,191,0.04)',border:'1px solid rgba(45,212,191,0.12)',borderRadius:10,flexWrap:'wrap'}}>
      <span style={{fontSize:12,color:'#2dd4bf',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{selected.size} selected</span>
      <select onChange={e=>{if(e.target.value)bulkStatus(e.target.value);e.target.value=''}} style={{...is,width:'auto',fontSize:11,padding:'4px 8px'}}><option value="">Status...</option>{statuses.map(s=><option key={s}>{s}</option>)}</select>
      <select onChange={e=>{if(e.target.value==='__none')bulkAssign('');else if(e.target.value)bulkAssign(e.target.value);e.target.value=''}} style={{...is,width:'auto',fontSize:11,padding:'4px 8px'}}><option value="">Assign...</option><option value="__none">Unassign</option>{reps.filter(r=>!r.id.includes('SEED')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button onClick={bulkDel} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #f8717125',background:'transparent',color:'#f87171',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
      <button onClick={()=>setSelected(new Set())} style={{background:'none',border:'none',color:'#737373',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Clear</button>
    </div>}
    {/* Add form */}
    {showAdd&&<Card style={{padding:16,marginBottom:14,border:'1px solid rgba(45,212,191,0.1)'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0',marginBottom:10}}>New Prospect</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8,marginBottom:10}}>
        {[['name','Name *'],['title','Title'],['company','Company'],['email','Email'],['phone','Phone'],['city','City'],['state','State'],['address','Address'],['linkedin','LinkedIn URL'],['website','Website'],['twitter','Twitter'],['employees','Employees'],['revenue','Annual Revenue'],['funding','Latest Funding']].map(([k,label])=>
          <div key={k}><label style={{fontSize:12,color:'#737373',display:'block',marginBottom:2,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:0.5}}>{label}</label><input value={addForm[k]||''} onChange={e=>setAddForm({...addForm,[k]:e.target.value})} style={{...is,fontSize:11}} placeholder={label}/></div>
        )}
        <div><label style={{fontSize:12,color:'#737373',display:'block',marginBottom:2,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:0.5}}>Rep</label><select value={addForm.assignedRep||''} onChange={e=>setAddForm({...addForm,assignedRep:e.target.value})} style={{...is,fontSize:11}}><option value="">--</option>{reps.filter(r=>!r.id.includes('SEED')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      </div>
      <div style={{display:'flex',gap:6}}><Btn onClick={addSingle} style={{fontSize:11}}>Save</Btn><Btn v="secondary" onClick={()=>setShowAdd(false)} style={{fontSize:11}}>Cancel</Btn></div>
    </Card>}
    {/* Kanban Board View */}
    {viewMode==='kanban'&&<div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:16,WebkitOverflowScrolling:'touch',minHeight:400}}>
      {statuses.map(status=>{
        const col=filtered.filter(p=>p.status===status);
        return <div key={status} style={{minWidth:240,maxWidth:280,flex:'0 0 260px',background:'#050505',borderRadius:12,border:'1px solid #1a1a1a',display:'flex',flexDirection:'column',maxHeight:'70vh'}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid #1a1a1a',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:sc[status]||'#525252'}}/>
              <span style={{fontSize:12,fontWeight:700,color:'#e5e5e5',fontFamily:"'JetBrains Mono',monospace"}}>{status}</span>
            </div>
            <span style={{fontSize:11,color:'#525252',fontFamily:"'JetBrains Mono',monospace"}}>{col.length}</span>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:8,display:'flex',flexDirection:'column',gap:6}}>
            {col.slice(0,30).map(p=>{
              const rep2=reps.find(r=>r.id===p.assignedRep);
              return <div key={p.id} style={{padding:'10px 12px',background:'#0a0a0a',borderRadius:8,border:'1px solid #111',transition:'all 0.15s',cursor:'pointer'}} onClick={()=>{setViewMode('table');setExpandedId(p.id);setStatusFilter('all');setPageNum(0)}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#2dd4bf30';e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#111';e.currentTarget.style.transform='translateY(0)'}}>
                <div style={{fontSize:12,fontWeight:600,color:'#f0f0f0',marginBottom:3}}>{p.name}</div>
                <div style={{fontSize:11,color:'#a3a3a3',marginBottom:2}}>{p.title||'--'}</div>
                <div style={{fontSize:11,color:'#2dd4bf',marginBottom:4}}>{p.company||'--'}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#525252',fontFamily:"'JetBrains Mono',monospace"}}>{p.city}{p.state?', '+p.state:''}</span>
                  {rep2&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:'#a78bfa15',color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace"}}>{rep2.name}</span>}
                </div>
                <div style={{display:'flex',gap:4,marginTop:6}}>
                  {p.linkedin&&<a href={p.linkedin.startsWith('http')?p.linkedin:'https://'+p.linkedin} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{padding:'3px 6px',borderRadius:4,background:'#0a66c215',border:'1px solid #0a66c225',color:'#0a66c2',fontSize:9,fontWeight:700,textDecoration:'none'}}>in</a>}
                  {p.email&&<a href={'mailto:'+p.email} onClick={e=>e.stopPropagation()} style={{padding:'3px 6px',borderRadius:4,background:'#a78bfa10',border:'1px solid #a78bfa20',color:'#a78bfa',fontSize:9,fontWeight:600,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>EMAIL</a>}
                </div>
                <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
                  {statuses.filter(s2=>s2!==status).slice(0,4).map(s2=><button key={s2} onClick={e=>{e.stopPropagation();save(p.id,{...p,status:s2});notify(p.name+' >> '+s2)}} style={{padding:'2px 6px',borderRadius:4,border:'1px solid '+(sc[s2]||'#333')+'25',background:'transparent',color:(sc[s2]||'#525252')+'99',fontSize:8,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.background=(sc[s2]||'#333')+'15'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>{s2}</button>)}
                </div>
              </div>;
            })}
            {col.length>30&&<div style={{fontSize:10,color:'#525252',textAlign:'center',padding:8,fontFamily:"'JetBrains Mono',monospace"}}>+{col.length-30} more</div>}
            {col.length===0&&<div style={{fontSize:11,color:'#333',textAlign:'center',padding:20,fontFamily:"'JetBrains Mono',monospace"}}>Empty</div>}
          </div>
        </div>;
      })}
    </div>}
    {/* Table View */}
    {viewMode==='table'&&<>
    {/* Select All + count */}
    <div style={{marginBottom:8,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={selectAll}>{selected.size>0&&selected.size<paged.length?<CheckMinus checked={true} onChange={selectAll}/>:<Check checked={selected.size===paged.length&&paged.length>0} onChange={selectAll}/>}<span style={{fontSize:12,color:selected.size>0?'#2dd4bf':'#737373',fontWeight:selected.size>0?600:400}}>{selected.size>0?selected.size+' of '+filtered.length+' selected':'Select All'}</span></div>
    </div>
    <div style={{overflowX:'auto',borderRadius:12,border:'1px solid #1a1a1a',background:'#000'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
        <thead><tr style={{background:'#050505'}}>
          <th style={{padding:'10px 6px',width:32}}><Check checked={selected.size===paged.length&&paged.length>0} onChange={selectAll}/></th>
          {[['name','Name',180],['title','Title',130],['company','Company',150],['email','Email',180],['phone','Phone',120],['city','Location',120],['employees','Size',60],['status','Status',90],['assignedRep','Rep',80],['','',100]].map(([col,label,w])=>
            <th key={label||'actions'} onClick={col?()=>handleSort(col):undefined} style={{padding:'10px 6px',textAlign:'left',fontSize:12,fontWeight:700,color:'#737373',textTransform:'uppercase',letterSpacing:1.2,cursor:col?'pointer':'default',whiteSpace:'nowrap',fontFamily:"'JetBrains Mono',monospace",minWidth:w,borderBottom:'1px solid #111'}}>{label}{sortCol===col&&<span style={{color:'#2dd4bf',marginLeft:3}}>{sortDir==='asc'?'\u25B2':'\u25BC'}</span>}</th>
          )}
        </tr></thead>
        <tbody>{paged.map(p=>{
          const rep=reps.find(r=>r.id===p.assignedRep);
          const isExp=expandedId===p.id;
          return <React.Fragment key={p.id}>
          <tr style={{borderBottom:'1px solid #0a0a0a',transition:'background 0.1s',background:selected.has(p.id)?'rgba(45,212,191,0.03)':'transparent',cursor:'pointer'}} onClick={()=>setExpandedId(isExp?null:p.id)} onMouseEnter={e=>{if(!selected.has(p.id))e.currentTarget.style.background='#050505'}} onMouseLeave={e=>{e.currentTarget.style.background=selected.has(p.id)?'rgba(45,212,191,0.03)':'transparent'}}>
            <td style={{padding:'8px 6px'}} onClick={e=>e.stopPropagation()}><Check checked={selected.has(p.id)} onChange={()=>{const s=new Set(selected);if(s.has(p.id))s.delete(p.id);else s.add(p.id);setSelected(s)}}/></td>
            <td style={{padding:'8px 6px'}}><span style={{fontWeight:600,color:'#e5e5e5',fontSize:12}}>{p.name}</span></td>
            <td style={{padding:'8px 6px',fontSize:12,color:'#c4c4c4',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title||'--'}</td>
            <td style={{padding:'8px 6px'}}>{p.website?<a href={p.website.startsWith('http')?p.website:'https://'+p.website} target="_blank" rel="noopener noreferrer" style={{color:'#2dd4bf',fontSize:12,textDecoration:'none',fontWeight:500}} onClick={e=>e.stopPropagation()}>{p.company||'--'}</a>:<span style={{fontSize:12,color:'#a3a3a3'}}>{p.company||'--'}</span>}</td>
            <td style={{padding:'8px 6px'}} onClick={e=>e.stopPropagation()}>{p.email?<a href={'mailto:'+p.email} style={{color:'#a78bfa',fontSize:12,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>{p.email}</a>:<span style={{color:'#333',fontSize:10}}>--</span>}</td>
            <td style={{padding:'8px 6px',fontSize:12,color:'#c4c4c4',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap'}}>{p.phone||'--'}</td>
            <td style={{padding:'8px 6px',fontSize:12,color:'#737373',whiteSpace:'nowrap'}}>{p.city?(p.city+(p.state?', '+p.state:'')):'--'}</td>
            <td style={{padding:'8px 6px',fontSize:12,color:'#c4c4c4',fontFamily:"'JetBrains Mono',monospace",textAlign:'right'}}>{fN(p.employees)}</td>
            <td style={{padding:'8px 6px'}} onClick={e=>e.stopPropagation()}><select value={p.status||'New'} onChange={e=>{save(p.id,{...p,status:e.target.value});notify(p.name+' >> '+e.target.value)}} style={{background:'transparent',border:'1px solid '+(sc[p.status]||'#333')+'30',color:sc[p.status]||'#525252',borderRadius:6,padding:'3px 6px',fontSize:12,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer',outline:'none',fontWeight:500}}>{statuses.map(s=><option key={s} style={{background:'#111',color:'#e5e5e5'}}>{s}</option>)}</select></td>
            <td style={{padding:'8px 6px'}} onClick={e=>e.stopPropagation()}><select value={p.assignedRep||''} onChange={e=>{save(p.id,{...p,assignedRep:e.target.value});const r2=reps.find(r3=>r3.id===e.target.value);notify(p.name+' >> '+(r2?.name||'unassigned'))}} style={{...is,padding:'3px 6px',fontSize:11,width:'auto',minWidth:60}}><option value="">--</option>{reps.filter(r=>!r.id.includes('SEED')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></td>
            <td style={{padding:'8px 6px',whiteSpace:'nowrap'}} onClick={e=>e.stopPropagation()}>
              {p.linkedin&&<a href={p.linkedin.startsWith('http')?p.linkedin:'https://'+p.linkedin} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:6,background:'#0a66c215',border:'1px solid #0a66c230',color:'#0a66c2',fontSize:12,fontWeight:800,textDecoration:'none',marginRight:4,transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='#0a66c230'}} onMouseLeave={e=>{e.currentTarget.style.background='#0a66c215'}}>in</a>}
              <button onClick={()=>{setEditing(p.id);setEditForm({...p})}} style={{background:'none',border:'none',color:'#737373',cursor:'pointer',fontSize:12,fontFamily:"'JetBrains Mono',monospace",padding:'4px 6px'}} onMouseEnter={e=>{e.currentTarget.style.color='#2dd4bf'}} onMouseLeave={e=>{e.currentTarget.style.color='#525252'}}>EDIT</button>
              <button onClick={()=>{if(confirm('Delete '+p.name+'?'))del(p.id)}} style={{background:'none',border:'none',color:'#525252',cursor:'pointer',fontSize:12,fontFamily:"'JetBrains Mono',monospace",padding:'4px 6px'}} onMouseEnter={e=>{e.currentTarget.style.color='#f87171'}} onMouseLeave={e=>{e.currentTarget.style.color='#333'}}>DEL</button>
            </td>
          </tr>
          {/* Expanded detail row */}
          {isExp&&<tr style={{background:'#050505'}}><td colSpan={11} style={{padding:'12px 16px 16px 42px',borderBottom:'1px solid #1a1a1a'}}>
            {editing===p.id?<div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginBottom:10}}>
                {[['name','Name'],['title','Title'],['company','Company'],['email','Email'],['phone','Phone'],['city','City'],['state','State'],['address','Address'],['linkedin','LinkedIn'],['website','Website'],['twitter','Twitter'],['employees','Employees'],['revenue','Revenue'],['funding','Funding'],['notes','Notes']].map(([k,l])=>
                  <div key={k}><label style={{fontSize:12,color:'#737373',display:'block',marginBottom:2,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:0.8}}>{l}</label><input value={editForm[k]||''} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={{...is,fontSize:11,padding:'6px 10px'}}/></div>
                )}
                <div><label style={{fontSize:12,color:'#737373',display:'block',marginBottom:2,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:0.8}}>Rep</label><select value={editForm.assignedRep||''} onChange={e=>setEditForm({...editForm,assignedRep:e.target.value})} style={{...is,fontSize:11,padding:'6px 10px'}}><option value="">--</option>{reps.filter(r=>!r.id.includes('SEED')).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              <div style={{display:'flex',gap:6}}><Btn onClick={()=>{save(p.id,editForm);setEditing(null);notify('Updated: '+editForm.name)}} style={{fontSize:11}}>Save</Btn><Btn v="secondary" onClick={()=>setEditing(null)} style={{fontSize:11}}>Cancel</Btn></div>
            </div>:
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
              <div>
                <div style={{fontSize:12,color:'#525252',fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>CONTACT</div>
                <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0',marginBottom:2}}>{p.name}</div>
                <div style={{fontSize:12,color:'#c4c4c4',marginBottom:2}}>{p.title||'--'}</div>
                <div style={{fontSize:12,color:'#a3a3a3',marginBottom:6}}>{p.company||'--'}</div>
                {p.email&&<div style={{fontSize:11,marginBottom:2}}><a href={'mailto:'+p.email} style={{color:'#a78bfa',textDecoration:'none',fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{p.email}</a></div>}
                {p.phone&&<div style={{fontSize:12,color:'#c4c4c4',fontFamily:"'JetBrains Mono',monospace",marginBottom:2}}>{p.phone}</div>}
              </div>
              <div>
                <div style={{fontSize:12,color:'#525252',fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>LOCATION</div>
                {p.address&&<div style={{fontSize:12,color:'#c4c4c4',marginBottom:2}}>{p.address}</div>}
                <div style={{fontSize:12,color:'#a3a3a3'}}>{p.city}{p.state?', '+p.state:''}</div>
                {p.employees&&<div style={{fontSize:12,color:'#737373',fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{fN(p.employees)} employees</div>}
              </div>
              <div>
                <div style={{fontSize:12,color:'#525252',fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>LINKS</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {p.linkedin&&<a href={p.linkedin.startsWith('http')?p.linkedin:'https://'+p.linkedin} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,background:'#0a66c215',border:'1px solid #0a66c225',color:'#0a66c2',fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>LinkedIn</a>}
                  {p.companyLinkedin&&<a href={p.companyLinkedin.startsWith('http')?p.companyLinkedin:'https://'+p.companyLinkedin} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,background:'#0a66c210',border:'1px solid #0a66c218',color:'#0a66c280',fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>Co. LinkedIn</a>}
                  {p.website&&<a href={p.website.startsWith('http')?p.website:'https://'+p.website} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,background:'#2dd4bf10',border:'1px solid #2dd4bf20',color:'#2dd4bf',fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>Website</a>}
                  {p.twitter&&<a href={p.twitter.startsWith('http')?p.twitter:'https://'+p.twitter} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:6,background:'#1d9bf010',border:'1px solid #1d9bf020',color:'#1d9bf0',fontSize:12,fontWeight:600,textDecoration:'none',fontFamily:"'JetBrains Mono',monospace"}}>Twitter</a>}
                </div>
                {(p.revenue||p.funding)&&<div style={{marginTop:8,fontSize:12,color:'#737373',fontFamily:"'JetBrains Mono',monospace"}}>{p.revenue?'Revenue: '+p.revenue:''}{p.revenue&&p.funding?' | ':''}{p.funding?'Funding: '+p.funding:''}</div>}
                {p.notes&&<div style={{marginTop:6,fontSize:12,color:'#737373',fontStyle:'italic'}}>{p.notes}</div>}
              </div>
            </div>}
          </td></tr>}
          </React.Fragment>;
        })}</tbody>
      </table>
    </div>
    {/* Pagination */}
    {totalPages>1&&<div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,padding:'14px 0'}}>
      <button onClick={()=>setPageNum(Math.max(0,pageNum-1))} disabled={pageNum===0} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #1a1a1a',background:'transparent',color:pageNum===0?'#222':'#737373',fontSize:11,cursor:pageNum===0?'default':'pointer',fontFamily:"'JetBrains Mono',monospace",transition:'all 0.15s'}}>PREV</button>
      <span style={{fontSize:12,color:'#525252',fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>{pageNum+1} / {totalPages}</span>
      <button onClick={()=>setPageNum(Math.min(totalPages-1,pageNum+1))} disabled={pageNum>=totalPages-1} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #1a1a1a',background:'transparent',color:pageNum>=totalPages-1?'#222':'#737373',fontSize:11,cursor:pageNum>=totalPages-1?'default':'pointer',fontFamily:"'JetBrains Mono',monospace",transition:'all 0.15s'}}>NEXT</button>
    </div>}
    </>}
    <div style={{fontSize:12,color:'#525252',textAlign:'center',padding:'8px 0',fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} prospect{filtered.length!==1?'s':''}{search?' matching "'+search+'"':''}</div>
  </div>;
}
function FilesPage({customSops,addSop,deleteSop,notify,currentUser,setPage,setPendingBrainFile,db}){
  const [search,setSearch]=useState('');
  const [catFilter,setCatFilter]=useState('all');
  const [sortBy,setSortBy]=useState('date');
  const [sortDir,setSortDir]=useState('desc');
  const [uploading,setUploading]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [pendingFiles,setPendingFiles]=useState([]);
  const [pendingCat,setPendingCat]=useState('Other');
  const [pendingTags,setPendingTags]=useState('');
  const [editTagsFor,setEditTagsFor]=useState(null);
  const [tagInput,setTagInput]=useState('');
  const [previewFile,setPreviewFile]=useState(null);
  const [showHistorySection,setShowHistorySection]=useState(false);
  const [loadingBrainFile,setLoadingBrainFile]=useState(null);
  const [showVersionsFor,setShowVersionsFor]=useState(null);
  const fileRef=React.useRef(null);
  const dropRef=React.useRef(null);
  const [dragOver,setDragOver]=useState(false);


  const PREDEFINED_CATEGORIES=['Quote','Purchase Order','Vendor Invoice','Customer Invoice','QB Export','Tax Document','Bank Statement','Contract','Insurance','Invoice','Receipt','Other'];
  // Custom categories saved as a single SOP for persistence to Supabase
  const customCatSop=(customSops||[]).find(s=>s.id==='CUSTOM_FILE_CATEGORIES');
  const customCategories=(()=>{try{return JSON.parse(customCatSop?.content||'[]')}catch{return[]}})();
  const CATEGORIES=[...PREDEFINED_CATEGORIES,...customCategories];
  const CAT_COLORS={'Quote':'#2dd4bf','Purchase Order':'#a78bfa','Vendor Invoice':'#f97316','Customer Invoice':'#fbbf24','QB Export':'#a78bfa','Tax Document':'#f97316','Bank Statement':'#2dd4bf','Contract':'#fbbf24','Insurance':'#34d399','Invoice':'#f87171','Receipt':'#8b5cf6','Other':'#737373'};
  const colorFor=(c)=>CAT_COLORS[c]||'#8b5cf6';
  const [showCatEditor,setShowCatEditor]=useState(false);
  const [newCatName,setNewCatName]=useState('');
  const addCustomCat=()=>{const n=newCatName.trim();if(!n)return;if(CATEGORIES.includes(n)){notify('Category already exists','error');return}const next=[...customCategories,n];addSop({id:'CUSTOM_FILE_CATEGORIES',title:'File Categories',cat:'Config',icon:'package',content:JSON.stringify(next),custom:true});setNewCatName('');notify('Added category: '+n)};
  const removeCustomCat=(c)=>{if(!confirm('Remove category "'+c+'"? Files using it will keep the label.'))return;const next=customCategories.filter(x=>x!==c);addSop({id:'CUSTOM_FILE_CATEGORIES',title:'File Categories',cat:'Config',icon:'package',content:JSON.stringify(next),custom:true});notify('Removed: '+c)};


  // FOLDERS -- flat (no nesting). Stored in a single SOP for persistence.
  const foldersSop=(customSops||[]).find(s=>s.id==='FILE_FOLDERS');
  const folders=(()=>{try{return JSON.parse(foldersSop?.content||'[]')}catch{return[]}})();
  const [currentFolder,setCurrentFolder]=useState(null); // null = All Files
  const [showFolderEditor,setShowFolderEditor]=useState(false);
  const [newFolderName,setNewFolderName]=useState('');
  const [renamingFolder,setRenamingFolder]=useState(null);
  const [renameFolderText,setRenameFolderText]=useState('');
  const [pendingFolder,setPendingFolder]=useState(null); // folder for new uploads
  const saveFolders=(next)=>{addSop({id:'FILE_FOLDERS',title:'File Folders',cat:'Config',icon:'package',content:JSON.stringify(next),custom:true})};
  const addFolder=()=>{const n=newFolderName.trim();if(!n)return;if(folders.some(f=>f.name.toLowerCase()===n.toLowerCase())){notify('Folder already exists','error');return}const next=[...folders,{id:'FOLDER-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:n,createdAt:new Date().toISOString()}];saveFolders(next);setNewFolderName('');notify('Created folder: '+n)};
  const renameFolder=(id,newName)=>{const n=newName.trim();if(!n)return;const next=folders.map(f=>f.id===id?{...f,name:n}:f);saveFolders(next);setRenamingFolder(null);setRenameFolderText('');notify('Renamed folder')};
  const deleteFolder=(folder)=>{
    const filesInFolder=allFiles.filter(f=>f.folderId===folder.id);
    if(filesInFolder.length>0&&!confirm('Delete folder "'+folder.name+'"? '+filesInFolder.length+' file'+(filesInFolder.length!==1?'s':'')+' will be moved to All Files (no folder).'))return;
    if(filesInFolder.length===0&&!confirm('Delete empty folder "'+folder.name+'"?'))return;
    // Move all files out of this folder first
    filesInFolder.forEach(f=>{
      addSop({id:f.id,title:f.name,cat:'File',icon:'package',content:JSON.stringify({...f,folderId:null,_legacy:undefined}),custom:true});
    });
    saveFolders(folders.filter(f=>f.id!==folder.id));
    if(currentFolder===folder.id)setCurrentFolder(null);
    notify('Deleted folder: '+folder.name);
  };
  const moveFileToFolder=(f,folderId)=>{
    if(f._legacy){notify('Cannot move legacy historical docs','error');return}
    addSop({id:f.id,title:f.name,cat:'File',icon:'package',content:JSON.stringify({...f,folderId:folderId||null,_legacy:undefined}),custom:true});
    const folderName=folderId?(folders.find(x=>x.id===folderId)?.name||'folder'):'All Files';
    notify(f.name+' >> '+folderName);
  };


  // Load files from SOPs (cat: 'File') AND legacy historical docs (cat: 'HistoricalDoc')
  const allFiles=(customSops||[]).filter(s=>s.cat==='File').map(s=>{try{return{id:s.id,...JSON.parse(s.content),_legacy:false}}catch{return null}}).filter(Boolean);
  const legacyDocs=(customSops||[]).filter(s=>s.cat==='HistoricalDoc').map(s=>{try{const d=JSON.parse(s.content);const file0=(d.files&&d.files[0])||{};return{id:s.id,name:file0.name||(d.docNumber||'Historical Doc'),originalName:file0.name||(d.docNumber||'Historical Doc'),size:file0.size||0,type:file0.type||'application/octet-stream',url:file0.url||'',path:'',category:d.type==='vendor_po'?'Invoice':d.type==='customer_invoice'?'Invoice':'Other',uploadedBy:d.uploadedBy||'Legacy',uploadedAt:d.date||d.uploadedAt||new Date(0).toISOString(),version:1,parentId:null,_legacy:true,_legacyMeta:d}}catch{return null}}).filter(Boolean);


  // Group files by base name (originalName) to find versions; only show latest per group in main list
  const groupKey=(f)=>(f.parentId||f.id);
  const grouped={};
  [...allFiles,...legacyDocs].forEach(f=>{const k=f._legacy?'__legacy_'+f.id:groupKey(f);if(!grouped[k])grouped[k]=[];grouped[k].push(f)});
  const latestPerGroup=Object.values(grouped).map(g=>g.sort((a,b)=>(b.version||1)-(a.version||1))[0]);
  const versionsByGroup=Object.fromEntries(Object.entries(grouped).map(([k,g])=>[k,g.sort((a,b)=>(b.version||1)-(a.version||1))]));


  // Filter
  let filtered=latestPerGroup;
  if(currentFolder!==null)filtered=filtered.filter(f=>f.folderId===currentFolder);
  if(catFilter!=='all')filtered=filtered.filter(f=>(f.category||'Other')===catFilter);
  if(search){const q=search.toLowerCase();filtered=filtered.filter(f=>(f.name||'').toLowerCase().includes(q)||(f.originalName||'').toLowerCase().includes(q)||(f.category||'').toLowerCase().includes(q)||(f.uploadedBy||'').toLowerCase().includes(q)||(f.tags||[]).some(t=>(t||'').toLowerCase().includes(q)))}
  // Sort
  filtered.sort((a,b)=>{let va,vb;if(sortBy==='name'){va=(a.originalName||a.name||'').toLowerCase();vb=(b.originalName||b.name||'').toLowerCase()}else if(sortBy==='size'){va=a.size||0;vb=b.size||0}else if(sortBy==='category'){va=a.category||'';vb=b.category||''}else{va=a.uploadedAt||'';vb=b.uploadedAt||''}return sortDir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0)});


  // Stats
  const totalFiles=latestPerGroup.length;
  const totalSize=latestPerGroup.reduce((s,f)=>s+(f.size||0),0);
  const catCounts={};CATEGORIES.forEach(c=>{catCounts[c]=latestPerGroup.filter(f=>(f.category||'Other')===c).length});


  const fmtSize=(b)=>{if(!b||b<=0)return'--';if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';if(b<1073741824)return(b/1048576).toFixed(1)+' MB';return(b/1073741824).toFixed(2)+' GB'};
  const fmtDate=(d)=>{if(!d)return'--';try{const dt=new Date(d);return dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}catch{return d}};
  const ext=(name)=>(name||'').split('.').pop().toLowerCase();
  const isImage=(t,n)=>(t||'').startsWith('image/')||['png','jpg','jpeg','gif','webp','svg'].includes(ext(n));
  const isPdf=(t,n)=>(t||'').includes('pdf')||ext(n)==='pdf';
  const isText=(t,n)=>(t||'').startsWith('text/')||['txt','csv','tsv','md','json','log'].includes(ext(n));


  const handleFileSelect=(files)=>{
    const arr=Array.from(files||[]);
    if(arr.length===0)return;
    const validated=[];
    for(const f of arr){
      if(f.size>50*1024*1024){notify(f.name+' is too large (max 50MB)','error');continue}
      validated.push(f);
    }
    if(validated.length>0){setPendingFiles(validated);setShowAdd(true)}
  };


  const doUpload=async()=>{
    if(pendingFiles.length===0)return;
    setUploading(true);
    let uploaded=0,failed=0;
    for(let i=0;i<pendingFiles.length;i++){
      const file=pendingFiles[i];
      setUploadProgress({current:i+1,total:pendingFiles.length,name:file.name});
      try{
        // Versioning: find existing files with same originalName
        const existing=allFiles.filter(f=>(f.originalName||f.name)===file.name);
        const isVersion=existing.length>0;
        const parentId=isVersion?(existing[0].parentId||existing[0].id):null;
        const version=isVersion?(Math.max(...existing.map(f=>f.version||1))+1):1;
        // Upload to storage with unique path
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const path='files/'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'-'+safeName;
        const url=await db.uploadFile('vendor-invoices',path,file);
        if(!url){failed++;continue}
        // Save metadata as SOP
        const id='FILE-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
        const tagArr=pendingTags.split(',').map(t=>t.trim()).filter(Boolean);
        addSop({id,title:file.name,cat:'File',icon:'package',content:JSON.stringify({
          name:file.name,originalName:file.name,size:file.size,type:file.type||'application/octet-stream',
          url,path,category:pendingCat,tags:tagArr,folderId:pendingFolder||currentFolder||null,uploadedBy:currentUser?.name||currentUser?.email||'Unknown',
          uploadedAt:new Date().toISOString(),version,parentId
        }),custom:true});
        uploaded++;
      }catch(err){console.error(err);failed++}
    }
    setUploading(false);setUploadProgress(null);setPendingFiles([]);setShowAdd(false);setPendingCat('Other');setPendingTags('');setPendingFolder(null);
    notify(uploaded+' file'+(uploaded!==1?'s':'')+' uploaded'+(failed>0?', '+failed+' failed':''));
  };


  const deleteFile=(f)=>{
    if(!confirm('Delete "'+f.name+'"? This cannot be undone.'))return;
    deleteSop(f.id);
    notify('Deleted: '+f.name);
  };


  const updateCat=(f,newCat)=>{
    if(f._legacy){notify('Cannot recategorize legacy historical docs','error');return}
    addSop({id:f.id,title:f.name,cat:'File',icon:'package',content:JSON.stringify({...f,category:newCat,_legacy:undefined}),custom:true});
    notify(f.name+' >> '+newCat);
  };


  const updateTags=(f,newTagsStr)=>{
    if(f._legacy){notify('Cannot tag legacy historical docs','error');return}
    const tagArr=newTagsStr.split(',').map(t=>t.trim()).filter(Boolean);
    addSop({id:f.id,title:f.name,cat:'File',icon:'package',content:JSON.stringify({...f,tags:tagArr,_legacy:undefined}),custom:true});
    notify('Tags updated for '+f.name);
  };


  const sendToBrain=async(f)=>{
    setLoadingBrainFile(f.id);
    try{
      // Fetch the file
      const r=await fetch(f.url);
      if(!r.ok)throw new Error('Could not fetch file from storage');
      const blob=await r.blob();
      const isDoc=isPdf(f.type,f.name)||isImage(f.type,f.name);
      let fileBlocks=[];let textContent='';let hasDoc=false;
      if(isDoc){
        const reader=new FileReader();
        const b64=await new Promise((resolve,reject)=>{
          reader.onload=()=>resolve(reader.result.split(',')[1]);
          reader.onerror=()=>reject(new Error('Read failed'));
          reader.readAsDataURL(blob);
        });
        if(isPdf(f.type,f.name)){
          fileBlocks=[{type:'document',source:{type:'base64',media_type:'application/pdf',data:b64}}];
        }else{
          const mt=f.type||'image/png';
          fileBlocks=[{type:'image',source:{type:'base64',media_type:mt,data:b64}}];
        }
        hasDoc=true;
      }else{
        textContent=await blob.text();
      }
      setPendingBrainFile({name:f.name,content:textContent,blocks:fileBlocks,hasDoc});
      setPage('brain');
    }catch(err){
      notify('Could not load file into Brain: '+err.message,'error');
    }
    setLoadingBrainFile(null);
  };


  const handleSort=(col)=>{if(sortBy===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortBy(col);setSortDir('desc')}};


  // Drag and drop
  const onDrop=(e)=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files)handleFileSelect(e.dataTransfer.files)};
  const onDragOver=(e)=>{e.preventDefault();setDragOver(true)};
  const onDragLeave=(e)=>{e.preventDefault();setDragOver(false)};


  const isLegacyVisible=showHistorySection||legacyDocs.length===0;


  return <div style={{animation:'fadeUp 0.4s'}}>
    <Header title="Files" sub={"Document repository -- "+totalFiles+" file"+(totalFiles!==1?'s':'')+", "+fmtSize(totalSize)+" total"}/>


    {/* KPI Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:18}}>
      <Card style={{padding:14,textAlign:'center'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>TOTAL FILES</div>
        <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:'#2dd4bf',fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={String(totalFiles)}/></div>
      </Card>
      <Card style={{padding:14,textAlign:'center'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>STORAGE USED</div>
        <div style={{fontSize:'clamp(18px,3.5vw,24px)',fontWeight:800,color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{fmtSize(totalSize)}</div>
      </Card>
      <Card style={{padding:14,textAlign:'center'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>QB EXPORTS</div>
        <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:CAT_COLORS['QB Export'],fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={String(catCounts['QB Export']||0)}/></div>
      </Card>
      <Card style={{padding:14,textAlign:'center'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>CONTRACTS</div>
        <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:CAT_COLORS['Contract'],fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={String(catCounts['Contract']||0)}/></div>
      </Card>
      <Card style={{padding:14,textAlign:'center'}} hover>
        <div style={{fontSize:9,color:'#525252',fontWeight:700,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace",marginBottom:6}}>TAX DOCS</div>
        <div style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:CAT_COLORS['Tax Document'],fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={String(catCounts['Tax Document']||0)}/></div>
      </Card>
    </div>


    {/* Category filter chips */}
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:16,overflowX:'auto',WebkitOverflowScrolling:'touch',paddingBottom:4}}>
      <button onClick={()=>setCatFilter('all')} style={{padding:'5px 12px',borderRadius:20,border:catFilter==='all'?'1px solid #2dd4bf':'1px solid #1a1a1a',background:catFilter==='all'?'#2dd4bf12':'transparent',color:catFilter==='all'?'#2dd4bf':'#525252',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap',transition:'all 0.15s'}}>ALL {totalFiles}</button>
      {CATEGORIES.map(c=><button key={c} onClick={()=>setCatFilter(catFilter===c?'all':c)} style={{padding:'5px 12px',borderRadius:20,border:'1px solid '+(catFilter===c?colorFor(c)+'60':'#1a1a1a'),background:catFilter===c?colorFor(c)+'12':'transparent',color:catFilter===c?colorFor(c):'#333',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap',transition:'all 0.15s'}}>{c} {catCounts[c]||0}</button>)}
    </div>


    {/* Toolbar */}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={"Search "+totalFiles+" files..."} style={{...inputStyle,maxWidth:300,background:'#111',border:'1px solid #222',padding:'10px 16px',fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}/>
      <select value={sortBy+'-'+sortDir} onChange={e=>{const[s,d]=e.target.value.split('-');setSortBy(s);setSortDir(d)}} style={{...inputStyle,width:'auto',background:'#111',border:'1px solid #222',padding:'10px 16px',fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}>
        <option value="date-desc">Newest first</option>
        <option value="date-asc">Oldest first</option>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="size-desc">Largest first</option>
        <option value="size-asc">Smallest first</option>
        <option value="category-asc">Category</option>
      </select>
      <button onClick={()=>setShowFolderEditor(!showFolderEditor)} style={{padding:'10px 14px',borderRadius:8,border:'1px solid '+(showFolderEditor?'#a78bfa60':'#222'),background:showFolderEditor?'rgba(167,139,250,0.08)':'#111',color:showFolderEditor?'#a78bfa':'#c4c4c4',cursor:'pointer',fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,whiteSpace:'nowrap'}}>{showFolderEditor?'Done':'Manage Folders'}{folders.length>0?' ('+folders.length+')':''}</button>
      <button onClick={()=>setShowCatEditor(!showCatEditor)} style={{padding:'10px 14px',borderRadius:8,border:'1px solid '+(showCatEditor?'#a78bfa60':'#222'),background:showCatEditor?'rgba(167,139,250,0.08)':'#111',color:showCatEditor?'#a78bfa':'#c4c4c4',cursor:'pointer',fontSize:12,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,whiteSpace:'nowrap'}}>{showCatEditor?'Done':'Manage Categories'}{customCategories.length>0?' ('+customCategories.length+')':''}</button>
      <div style={{marginLeft:'auto',display:'flex',gap:6}}>
        <input ref={fileRef} type="file" multiple onChange={e=>handleFileSelect(e.target.files)} style={{display:'none'}}/>
        <Btn onClick={()=>fileRef.current?.click()} style={{fontSize:12,padding:'8px 16px'}}><I n="upload" s={13}/> Upload Files</Btn>
      </div>
    </div>


    {/* Manage Folders panel */}
    {showFolderEditor&&<Card style={{padding:16,marginBottom:12,border:'1px solid rgba(167,139,250,0.2)'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0',marginBottom:10,fontFamily:"'JetBrains Mono',monospace"}}>FOLDERS</div>
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        <input value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addFolder()}} placeholder="New folder name (e.g. 2024 Tax Returns)" style={{...inputStyle,flex:1,background:'#0a0a0a',padding:'8px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}/>
        <Btn onClick={addFolder} style={{fontSize:12,padding:'6px 16px'}}>Create Folder</Btn>
      </div>
      {folders.length===0?<div style={{fontSize:12,color:'#a3a3a3',padding:'12px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace"}}>No folders yet. Create your first folder to organize files.</div>:
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{folders.map(folder=>{
        const fileCount=allFiles.filter(f=>f.folderId===folder.id).length;
        const isRenaming=renamingFolder===folder.id;
        return <div key={folder.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#0a0a0a',borderRadius:8,border:'1px solid #1a1a1a'}}>
          <I n="package" s={14} color="#a78bfa"/>
          {isRenaming?
            <input value={renameFolderText} onChange={e=>setRenameFolderText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')renameFolder(folder.id,renameFolderText);if(e.key==='Escape')setRenamingFolder(null)}} autoFocus style={{...inputStyle,flex:1,background:'#000',padding:'6px 10px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}/>:
            <span style={{flex:1,fontSize:13,color:'#e5e5e5',fontWeight:600}}>{folder.name}</span>}
          <span style={{fontSize:11,color:'#a3a3a3',fontFamily:"'JetBrains Mono',monospace"}}>{fileCount} file{fileCount!==1?'s':''}</span>
          {isRenaming?<>
            <button onClick={()=>renameFolder(folder.id,renameFolderText)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #2dd4bf60',background:'rgba(45,212,191,0.08)',color:'#2dd4bf',fontSize:10,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>SAVE</button>
            <button onClick={()=>setRenamingFolder(null)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #1a1a1a',background:'transparent',color:'#a3a3a3',fontSize:10,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>CANCEL</button>
          </>:<>
            <button onClick={()=>{setCurrentFolder(folder.id);setShowFolderEditor(false)}} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #1a1a1a',background:'transparent',color:'#c4c4c4',fontSize:10,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>OPEN</button>
            <button onClick={()=>{setRenamingFolder(folder.id);setRenameFolderText(folder.name)}} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #1a1a1a',background:'transparent',color:'#c4c4c4',fontSize:10,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>RENAME</button>
            <button onClick={()=>deleteFolder(folder)} style={{padding:'4px 10px',borderRadius:5,border:'1px solid #1a1a1a',background:'transparent',color:'#c4c4c4',fontSize:10,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}} onMouseEnter={e=>{e.currentTarget.style.color='#f87171';e.currentTarget.style.borderColor='#f8717130'}} onMouseLeave={e=>{e.currentTarget.style.color='#c4c4c4';e.currentTarget.style.borderColor='#1a1a1a'}}>DELETE</button>
          </>}
        </div>;
      })}</div>}
    </Card>}


    {/* Manage Categories panel */}
    {showCatEditor&&<Card style={{padding:16,marginBottom:12,border:'1px solid rgba(167,139,250,0.2)'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0',marginBottom:10,fontFamily:"'JetBrains Mono',monospace"}}>CUSTOM CATEGORIES</div>
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addCustomCat()}} placeholder="New category name" style={{...inputStyle,flex:1,background:'#0a0a0a',padding:'8px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}/>
        <Btn onClick={addCustomCat} style={{fontSize:12,padding:'6px 16px'}}>Add Category</Btn>
      </div>
      {customCategories.length===0?<div style={{fontSize:12,color:'#a3a3a3',padding:'12px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace"}}>No custom categories yet. The 12 built-in categories are always available.</div>:
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{customCategories.map(c=><span key={c} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:14,background:'rgba(139,92,246,0.08)',border:'1px solid rgba(139,92,246,0.25)',fontSize:11,color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace"}}>{c}<button onClick={()=>removeCustomCat(c)} style={{background:'none',border:'none',color:'#a78bfa',cursor:'pointer',fontSize:14,padding:0,lineHeight:1}}>x</button></span>)}</div>}
    </Card>}


    {/* Folder breadcrumb */}
    {currentFolder!==null&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',marginBottom:12,background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:10}}>
      <button onClick={()=>setCurrentFolder(null)} style={{background:'transparent',border:'none',color:'#a78bfa',cursor:'pointer',fontSize:11,fontFamily:"'JetBrains Mono',monospace",padding:0}}>&larr; All Files</button>
      <span style={{color:'#525252'}}>/</span>
      <span style={{fontSize:13,fontWeight:600,color:'#f0f0f0'}}><I n="package" s={13} color="#a78bfa"/> {folders.find(fo=>fo.id===currentFolder)?.name||'Unknown folder'}</span>
      <span style={{marginLeft:'auto',fontSize:11,color:'#c4c4c4',fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} file{filtered.length!==1?'s':''}</span>
    </div>}


    {/* Drop zone */}
    <div ref={dropRef} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={()=>fileRef.current?.click()} style={{border:'2px dashed '+(dragOver?'#2dd4bf':'#1a1a1a'),background:dragOver?'rgba(45,212,191,0.04)':'transparent',borderRadius:12,padding:'24px 16px',textAlign:'center',cursor:'pointer',marginBottom:14,transition:'all 0.15s'}}>
      <I n="upload" s={24} color={dragOver?'#2dd4bf':'#333'}/>
      <div style={{fontSize:13,color:dragOver?'#2dd4bf':'#737373',marginTop:8,fontWeight:600}}>{dragOver?'Drop files to upload':'Drop files here or click to browse'}</div>
      <div style={{fontSize:11,color:'#525252',marginTop:4,fontFamily:"'JetBrains Mono',monospace"}}>PDF, Excel, CSV, images, anything up to 50MB</div>
    </div>


    {/* Pending upload preview */}
    {showAdd&&pendingFiles.length>0&&<Card style={{padding:16,marginBottom:14,border:'1px solid rgba(45,212,191,0.2)'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#f0f0f0',marginBottom:12}}>Ready to upload {pendingFiles.length} file{pendingFiles.length!==1?'s':''}</div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:10}}>
        <label style={{fontSize:11,color:'#c4c4c4'}}>Category:</label>
        <select value={pendingCat} onChange={e=>setPendingCat(e.target.value)} style={{...inputStyle,width:'auto',background:'#0a0a0a',padding:'6px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <label style={{fontSize:11,color:'#c4c4c4',marginLeft:6}}>Folder:</label>
        <select value={pendingFolder||''} onChange={e=>setPendingFolder(e.target.value||null)} style={{...inputStyle,width:'auto',background:'#0a0a0a',padding:'6px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>
          <option value="">-- No folder --</option>
          {folders.map(fo=><option key={fo.id} value={fo.id}>{fo.name}</option>)}
        </select>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
        <label style={{fontSize:11,color:'#c4c4c4',whiteSpace:'nowrap'}}>Tags (comma-separated):</label>
        <input value={pendingTags} onChange={e=>setPendingTags(e.target.value)} placeholder="e.g. 2024, college of dupage, q3" style={{...inputStyle,flex:1,minWidth:200,background:'#0a0a0a',padding:'6px 12px',fontSize:12}}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12,maxHeight:160,overflowY:'auto'}}>
        {pendingFiles.map((f,i)=>{
          const existing=allFiles.filter(af=>(af.originalName||af.name)===f.name);
          const willVersion=existing.length>0;
          return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#0a0a0a',borderRadius:6,fontSize:12}}>
            <I n="file" s={12} color="#737373"/>
            <span style={{color:'#e5e5e5',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
            <span style={{color:'#525252',fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{fmtSize(f.size)}</span>
            {willVersion&&<span style={{padding:'2px 6px',borderRadius:4,background:'#fbbf2415',color:'#fbbf24',fontSize:10,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>v{Math.max(...existing.map(e=>e.version||1))+1}</span>}
            <button onClick={()=>setPendingFiles(pendingFiles.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#525252',cursor:'pointer',fontSize:14,padding:'0 4px'}} title="Remove">x</button>
          </div>;
        })}
      </div>
      {uploadProgress&&<div style={{marginBottom:10,padding:'8px 12px',background:'rgba(45,212,191,0.05)',borderRadius:6,fontSize:11,color:'#2dd4bf',fontFamily:"'JetBrains Mono',monospace"}}>Uploading {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.name}</div>}
      <div style={{display:'flex',gap:6}}>
        <Btn onClick={doUpload} style={{fontSize:12}} disabled={uploading}>{uploading?'Uploading...':'Upload '+pendingFiles.length+' file'+(pendingFiles.length!==1?'s':'')}</Btn>
        <Btn v="secondary" onClick={()=>{setShowAdd(false);setPendingFiles([]);setPendingCat('Other');setPendingTags('');setPendingFolder(null)}} style={{fontSize:12}} disabled={uploading}>Cancel</Btn>
      </div>
    </Card>}


    {/* Legacy docs notice */}
    {legacyDocs.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',marginBottom:12,background:'rgba(139,92,246,0.04)',border:'1px solid rgba(139,92,246,0.15)',borderRadius:10,flexWrap:'wrap'}}>
      <span style={{fontSize:11,color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace"}}>{legacyDocs.length} legacy historical document{legacyDocs.length!==1?'s':''} from old History tab</span>
      <button onClick={()=>setShowHistorySection(!showHistorySection)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(139,92,246,0.3)',background:'transparent',color:'#a78bfa',fontSize:11,cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>{showHistorySection?'Hide':'Show'} legacy</button>
    </div>}


    {/* Files table */}
    <div style={{overflowX:'auto',borderRadius:12,border:'1px solid #1a1a1a',background:'#000'}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:780}}>
        <thead><tr style={{background:'#050505'}}>
          {[['name','Name',220],['category','Category',110],['folder','Folder',130],['size','Size',80],['uploadedBy','Uploaded By',130],['date','Date',150],['','',180]].map(([col,label,w])=>
            <th key={label||'actions'} onClick={col?()=>handleSort(col):undefined} style={{padding:'10px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:'#a3a3a3',textTransform:'uppercase',letterSpacing:1.2,cursor:col?'pointer':'default',whiteSpace:'nowrap',fontFamily:"'JetBrains Mono',monospace",minWidth:w,borderBottom:'1px solid #111'}}>{label}{sortBy===col&&<span style={{color:'#2dd4bf',marginLeft:3}}>{sortDir==='asc'?'\u25B2':'\u25BC'}</span>}</th>
          )}
        </tr></thead>
        <tbody>{filtered.length===0?<tr><td colSpan={7} style={{padding:'40px 16px',textAlign:'center',fontSize:12,color:'#a3a3a3',fontFamily:"'JetBrains Mono',monospace"}}>No files{search||catFilter!=='all'?' match these filters':' yet -- upload your first file above'}</td></tr>:filtered.filter(f=>!f._legacy||isLegacyVisible).map(f=>{
          const versions=versionsByGroup[f._legacy?'__legacy_'+f.id:groupKey(f)]||[];
          const hasVersions=versions.length>1;
          return <React.Fragment key={f.id}>
          <tr style={{borderBottom:'1px solid #0a0a0a',transition:'background 0.1s',background:f._legacy?'rgba(139,92,246,0.03)':'transparent'}} onMouseEnter={e=>{e.currentTarget.style.background=f._legacy?'rgba(139,92,246,0.06)':'#050505'}} onMouseLeave={e=>{e.currentTarget.style.background=f._legacy?'rgba(139,92,246,0.03)':'transparent'}}>
            <td style={{padding:'10px 10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <I n={isPdf(f.type,f.name)?'file':isImage(f.type,f.name)?'package':'file'} s={14} color={isPdf(f.type,f.name)?'#f87171':isImage(f.type,f.name)?'#a78bfa':'#737373'}/>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#e5e5e5',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.originalName||f.name}</div>
                  <div style={{fontSize:10,color:'#525252',fontFamily:"'JetBrains Mono',monospace"}}>
                    {f._legacy?'LEGACY':'v'+(f.version||1)}
                    {hasVersions&&!f._legacy&&<button onClick={()=>setShowVersionsFor(showVersionsFor===f.id?null:f.id)} style={{background:'none',border:'none',color:'#a78bfa',cursor:'pointer',fontSize:10,fontFamily:'inherit',marginLeft:6,padding:0}}>{showVersionsFor===f.id?'hide':versions.length+' versions'}</button>}
                  </div>
                  {(f.tags||[]).length>0&&<div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:4}}>{(f.tags||[]).slice(0,5).map(t=><span key={t} style={{padding:'1px 7px',borderRadius:10,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',fontSize:9,color:'#fbbf24',fontFamily:"'JetBrains Mono',monospace"}}>{t}</span>)}{(f.tags||[]).length>5&&<span style={{fontSize:9,color:'#525252',fontFamily:"'JetBrains Mono',monospace"}}>+{(f.tags||[]).length-5}</span>}</div>}
                </div>
              </div>
            </td>
            <td style={{padding:'10px 10px'}}>
              {f._legacy?<span style={{padding:'3px 8px',borderRadius:4,background:'#8b5cf615',color:'#8b5cf6',fontSize:10,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>Legacy</span>:
              <select value={f.category||'Other'} onChange={e=>updateCat(f,e.target.value)} style={{background:'transparent',border:'1px solid '+colorFor(f.category)+'30',color:colorFor(f.category),borderRadius:5,padding:'2px 6px',fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer',outline:'none',fontWeight:600}}>{[...new Set([...CATEGORIES,f.category].filter(Boolean))].map(c=><option key={c} style={{background:'#111',color:'#e5e5e5'}}>{c}</option>)}</select>}
            </td>
            <td style={{padding:'10px 10px'}}>
              {f._legacy?<span style={{fontSize:11,color:'#737373',fontFamily:"'JetBrains Mono',monospace"}}>--</span>:
              <select value={f.folderId||''} onChange={e=>moveFileToFolder(f,e.target.value||null)} style={{background:'transparent',border:'1px solid '+(f.folderId?'#a78bfa30':'#1a1a1a'),color:f.folderId?'#a78bfa':'#a3a3a3',borderRadius:5,padding:'2px 6px',fontSize:9,fontFamily:"'JetBrains Mono',monospace",cursor:'pointer',outline:'none',fontWeight:600,maxWidth:110}}><option value="" style={{background:'#111',color:'#e5e5e5'}}>(none)</option>{folders.map(fo=><option key={fo.id} value={fo.id} style={{background:'#111',color:'#e5e5e5'}}>{fo.name}</option>)}</select>}
            </td>
            <td style={{padding:'10px 10px',fontSize:11,color:'#c4c4c4',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap'}}>{fmtSize(f.size)}</td>
            <td style={{padding:'10px 10px',fontSize:11,color:'#c4c4c4',whiteSpace:'nowrap'}}>{f.uploadedBy||'--'}</td>
            <td style={{padding:'10px 10px',fontSize:11,color:'#c4c4c4',whiteSpace:'nowrap',fontFamily:"'JetBrains Mono',monospace"}}>{fmtDate(f.uploadedAt)}</td>
            <td style={{padding:'10px 10px',whiteSpace:'nowrap'}}>
              <button onClick={()=>setPreviewFile(f)} style={{background:'none',border:'1px solid #1a1a1a',color:'#a3a3a3',cursor:'pointer',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'4px 8px',borderRadius:5,marginRight:4,transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#2dd4bf';e.currentTarget.style.borderColor='#2dd4bf30'}} onMouseLeave={e=>{e.currentTarget.style.color='#a3a3a3';e.currentTarget.style.borderColor='#1a1a1a'}}>VIEW</button>
              <button onClick={()=>sendToBrain(f)} disabled={loadingBrainFile===f.id} style={{background:'none',border:'1px solid '+(loadingBrainFile===f.id?'#525252':'rgba(167,139,250,0.3)'),color:loadingBrainFile===f.id?'#525252':'#a78bfa',cursor:loadingBrainFile===f.id?'wait':'pointer',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'4px 8px',borderRadius:5,marginRight:4,transition:'all 0.15s'}}>{loadingBrainFile===f.id?'LOADING':'BRAIN'}</button>
              {!f._legacy&&<button onClick={()=>{setEditTagsFor(editTagsFor===f.id?null:f.id);setTagInput((f.tags||[]).join(', '))}} style={{background:'none',border:'1px solid '+(editTagsFor===f.id?'#fbbf24':'#1a1a1a'),color:editTagsFor===f.id?'#fbbf24':'#a3a3a3',cursor:'pointer',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'4px 8px',borderRadius:5,marginRight:4,transition:'all 0.15s'}}>TAGS</button>}
              {f.url&&<a href={f.url} download={f.originalName||f.name} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',background:'none',border:'1px solid #1a1a1a',color:'#a3a3a3',textDecoration:'none',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'4px 8px',borderRadius:5,marginRight:4,transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#2dd4bf';e.currentTarget.style.borderColor='#2dd4bf30'}} onMouseLeave={e=>{e.currentTarget.style.color='#a3a3a3';e.currentTarget.style.borderColor='#1a1a1a'}}>DOWNLOAD</a>}
              <button onClick={()=>deleteFile(f)} style={{background:'none',border:'1px solid #1a1a1a',color:'#a3a3a3',cursor:'pointer',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'4px 8px',borderRadius:5,transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.color='#f87171';e.currentTarget.style.borderColor='#f8717130'}} onMouseLeave={e=>{e.currentTarget.style.color='#a3a3a3';e.currentTarget.style.borderColor='#1a1a1a'}}>DEL</button>
            </td>
          </tr>
          {/* Tag editor expansion */}
          {editTagsFor===f.id&&!f._legacy&&<tr style={{background:'#050505'}}><td colSpan={7} style={{padding:'12px 16px 16px 42px',borderBottom:'1px solid #1a1a1a'}}>
            <div style={{fontSize:10,color:'#525252',fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8,textTransform:'uppercase'}}>EDIT TAGS (comma-separated)</div>
            <div style={{display:'flex',gap:6}}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){updateTags(f,tagInput);setEditTagsFor(null)}}} placeholder="e.g. 2024, college of dupage, q3, urgent" style={{...inputStyle,flex:1,background:'#000',padding:'8px 12px',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}} autoFocus/>
              <Btn onClick={()=>{updateTags(f,tagInput);setEditTagsFor(null)}} style={{fontSize:11,padding:'6px 14px'}}>Save</Btn>
              <Btn v="secondary" onClick={()=>setEditTagsFor(null)} style={{fontSize:11,padding:'6px 14px'}}>Cancel</Btn>
            </div>
          </td></tr>}
          {/* Version history expansion */}
          {showVersionsFor===f.id&&hasVersions&&!f._legacy&&<tr style={{background:'#050505'}}><td colSpan={7} style={{padding:'12px 16px 16px 42px',borderBottom:'1px solid #1a1a1a'}}>
            <div style={{fontSize:10,color:'#525252',fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8,textTransform:'uppercase'}}>VERSION HISTORY</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {versions.map(v=><div key={v.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#0a0a0a',borderRadius:6,fontSize:11}}>
                <span style={{padding:'2px 6px',borderRadius:4,background:v.id===f.id?'#2dd4bf15':'#52525215',color:v.id===f.id?'#2dd4bf':'#737373',fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>v{v.version||1}{v.id===f.id?' CURRENT':''}</span>
                <span style={{color:'#a3a3a3',fontFamily:"'JetBrains Mono',monospace"}}>{fmtDate(v.uploadedAt)}</span>
                <span style={{color:'#525252',marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace"}}>{fmtSize(v.size)}</span>
                <span style={{color:'#737373'}}>{v.uploadedBy}</span>
                {v.url&&<a href={v.url} download={v.originalName||v.name} target="_blank" rel="noopener noreferrer" style={{color:'#2dd4bf',textDecoration:'none',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'2px 6px'}}>DL</a>}
                {v.id!==f.id&&<button onClick={()=>{if(confirm('Delete v'+(v.version||1)+'?'))deleteSop(v.id)}} style={{background:'none',border:'none',color:'#525252',cursor:'pointer',fontSize:10,fontFamily:"'JetBrains Mono',monospace",padding:'2px 6px'}}>DEL</button>}
              </div>)}
            </div>
          </td></tr>}
          </React.Fragment>;
        })}</tbody>
      </table>
    </div>
    <div style={{fontSize:11,color:'#525252',textAlign:'center',padding:'10px 0',fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} of {totalFiles} file{totalFiles!==1?'s':''}{search?' matching "'+search+'"':''}</div>


    {/* Preview modal */}
    {previewFile&&<div style={{position:'fixed',inset:0,zIndex:99998,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeUp 0.15s'}}>
      <div onClick={()=>setPreviewFile(null)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(20px)'}}/>
      <div style={{position:'relative',width:'100%',maxWidth:900,maxHeight:'90vh',background:'#0a0a0a',borderRadius:14,border:'1px solid #1a1a1a',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #1a1a1a',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <I n={isPdf(previewFile.type,previewFile.name)?'file':isImage(previewFile.type,previewFile.name)?'package':'file'} s={16} color="#737373"/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:'#e5e5e5',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{previewFile.originalName||previewFile.name}</div>
            <div style={{fontSize:10,color:'#525252',fontFamily:"'JetBrains Mono',monospace"}}>{fmtSize(previewFile.size)} -- {previewFile.category||'Other'} -- {fmtDate(previewFile.uploadedAt)}</div>
          </div>
          <Btn v="secondary" onClick={()=>{sendToBrain(previewFile);setPreviewFile(null)}} style={{fontSize:11,padding:'6px 12px'}}>Send to Brain</Btn>
          {previewFile.url&&<a href={previewFile.url} download={previewFile.originalName||previewFile.name} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}><Btn v="secondary" style={{fontSize:11,padding:'6px 12px'}}>Download</Btn></a>}
          <button onClick={()=>setPreviewFile(null)} style={{background:'none',border:'1px solid #1a1a1a',color:'#737373',cursor:'pointer',fontSize:11,fontFamily:'inherit',padding:'6px 12px',borderRadius:6}}>Close</button>
        </div>
        <div style={{flex:1,overflow:'auto',background:'#000'}}>
          {isImage(previewFile.type,previewFile.name)?<img src={previewFile.url} alt={previewFile.name} style={{display:'block',maxWidth:'100%',margin:'0 auto'}}/>:
           isPdf(previewFile.type,previewFile.name)?<iframe src={previewFile.url} style={{width:'100%',height:'70vh',border:'none',background:'#fff'}} title={previewFile.name}/>:
           <div style={{padding:40,textAlign:'center',color:'#737373'}}>
             <I n="file" s={32} color="#333"/>
             <div style={{fontSize:13,marginTop:12}}>Preview not available for this file type</div>
             <div style={{fontSize:11,color:'#525252',marginTop:6,fontFamily:"'JetBrains Mono',monospace"}}>{(previewFile.type||'unknown')} -- click Download to open</div>
           </div>}
        </div>
      </div>
    </div>}
  </div>;
}


function FinancialsPage({jobs,lineItems,vendors,customers,reps,getJobFinancials,getJobItems,_commissionFor,_bankTxnHash,notify,triggerPrint,dateFilter,jobNum,customSops,addSop,deleteSop,...fCtx}){
  const [tab,setTab]=useState("overview");
  const now=new Date();
  const [period,setPeriod]=useState("ytd");
  const [dateFrom,setDateFrom]=useState(()=>{const d=new Date(now.getFullYear(),0,1);return d.toISOString().split("T")[0]});
  const [dateTo,setDateTo]=useState(()=>now.toISOString().split("T")[0]);
  // Banking / manual transaction state
  const [manualForm,setManualForm]=useState({date:'',description:'',category:'',amount:'',type:'expense',account:'Operating'});
  const [manualEditing,setManualEditing]=useState(null);
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
  const [stmtUploading,setStmtUploading]=useState(false);
  const [stmtAcct,setStmtAcct]=useState('Operating');
  const stmtFileRef=useRef(null);


  // Period presets
  const setPeriodPreset=(p)=>{setPeriod(p);const n=new Date();const y=n.getFullYear();const m=n.getMonth();if(p==="month"){const s=new Date(y,m,1);setDateFrom(s.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="quarter"){const qm=Math.floor(m/3)*3;setDateFrom(new Date(y,qm,1).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="ytd"){setDateFrom(new Date(y,0,1).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="year"){setDateFrom(new Date(y-1,m,n.getDate()).toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0])}else if(p==="all"){setDateFrom("2020-01-01");setDateTo(n.toISOString().split("T")[0])}};


  // Filter jobs by date range
  const fromD=new Date(dateFrom+"T00:00:00");const toD=new Date(dateTo+"T23:59:59");
  const filteredJobs=jobs.filter(j=>{const d=new Date(j.createdDate);return d>=fromD&&d<=toD});
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
    const d=new Date(t.date);
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
  const _plMovementCats=new Set(['Transfer','Owner Draw','Owner Investment']);
  // Also hard-exclude balance-sheet rows (asset/liability by type OR legacy category)
  // so no row can ever count in both the P&L and the Balance Sheet.
  const _isManualPL=t=>!t.plaidId&&t.source!=='statement'&&!_plMovementCats.has(t.category)&&t.type!=='asset'&&t.type!=='liability'&&t.category!=='asset'&&t.category!=='liability';
  const manualRevenue=filteredManualTxns.filter(t=>t.type==='revenue'&&_isManualPL(t)).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
  const manualExpenses=filteredManualTxns.filter(t=>t.type==='expense'&&_isManualPL(t)).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
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
  const liveBankCash=(()=>{const r=(customSops||[]).find(s=>s.id==='BANK_BALANCES_GLOBAL');if(!r)return null;try{const d=JSON.parse(r.content||'{}');if(!Array.isArray(d.accounts)||d.accounts.length===0)return null;return d.accounts.filter(a=>(a.type||'')==='depository').reduce((s,a)=>s+(Number(a.current)||0),0);}catch{return null}})();


  // Monthly revenue data
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Year-aware monthly buckets. The old version filtered to the CURRENT calendar year
  // only, so Past Year / All Time / custom ranges silently dropped prior-year months
  // from the Overview chart. Keys are year+month; labels carry a 'YY suffix for
  // non-current years; chronological sort.
  const monthlyData=(()=>{const curY=new Date().getFullYear();const m={};filteredJobs.forEach(j=>{const mm=/^(\d{4})-(\d{2})/.exec(String(j.createdDate||''));let y,mo;if(mm){y=+mm[1];mo=+mm[2]-1}else{const d=new Date(j.createdDate);if(isNaN(d.getTime()))return;y=d.getFullYear();mo=d.getMonth()}if(mo<0||mo>11)return;const k=y+'-'+mo;if(!m[k])m[k]={name:months[mo]+(y!==curY?" '"+String(y).slice(2):""),revenue:0,cost:0,_s:y*12+mo};const f=getJobFinancials(j.id);m[k].revenue+=f.totalRevenue;m[k].cost+=f.totalCost;});return Object.values(m).sort((a,b)=>a._s-b._s).map(o=>({name:o.name,revenue:o.revenue,cost:o.cost,profit:o.revenue-o.cost,margin:o.revenue>0?((o.revenue-o.cost)/o.revenue*100):0}));})();
  // Monthly bank cash flow (deposits vs payments) across the filtered transactions.
  // The cash-basis companion to the accrual Revenue vs Cost chart, and the fast
  // visual check that a statement upload landed in the right months.
  const monthlyBank=(()=>{const curY=new Date().getFullYear();const m={};filteredManualTxns.forEach(t=>{const mm=/^(\d{4})-(\d{2})/.exec(String(t.date||''));if(!mm)return;const y=+mm[1],mo=+mm[2]-1;if(mo<0||mo>11)return;const k=y+'-'+mo;if(!m[k])m[k]={name:months[mo]+(y!==curY?" '"+String(y).slice(2):""),inflow:0,outflow:0,_s:y*12+mo};const amt=parseFloat(t.amount)||0;if(t.type==='revenue')m[k].inflow+=amt;else if(t.type==='expense')m[k].outflow+=amt;});return Object.values(m).sort((a,b)=>a._s-b._s);})();


  // Vendor spend breakdown
  const vendorSpend=vendors.map(v=>{const spend=filteredItems.filter(i=>i.vendor===v.id).reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);return{name:v.name,spend,pct:totalCost>0?(spend/totalCost*100):0}}).filter(v=>v.spend>0).sort((a,b)=>b.spend-a.spend);


  // Customer revenue
  const custRev=customers.map(c=>{const rev=filteredJobs.filter(j=>j.customer===c.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const jc=filteredJobs.filter(j=>j.customer===c.id).length;return{name:c.name,revenue:rev,jobs:jc,pct:totalRev>0?(rev/totalRev*100):0}}).filter(c=>c.revenue>0).sort((a,b)=>b.revenue-a.revenue);


  const generatePDF=(type)=>{
    const today=new Date().toLocaleDateString();
    const hd='<div style="font-family:Helvetica,Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#111;font-size:12px">';
    const logo='<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px"><div style="font-size:18px;font-weight:700">Midwest Educational Furnishings, Inc.</div></div><div style="font-size:11px;color:#888;margin-bottom:24px">21191 N Valley Rd, Kildeer, IL 60047 US | (847) 847-1865</div>';
    let html=hd+logo;
    if(type==="pnl"){
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Profit & Loss Statement</div><div style="font-size:12px;color:#888;margin-bottom:20px">Generated: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>';
      html+='<tr style="border-bottom:2px solid #222"><td style="padding:10px 0;font-weight:700;font-size:14px">REVENUE</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px">$'+totalRev.toFixed(2)+'</td></tr>';
      filteredJobs.forEach(j=>{const f=getJobFinancials(j.id);html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">'+j.name+'</td><td style="text-align:right;padding:6px 0;color:#555">$'+f.totalRevenue.toFixed(2)+'</td></tr>'});
      html+='<tr style="border-bottom:2px solid #222;margin-top:8px"><td style="padding:10px 0;font-weight:700;font-size:14px">COST OF GOODS SOLD</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px">$'+totalCost.toFixed(2)+'</td></tr>';
      vendorSpend.forEach(v=>{html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">'+v.name+'</td><td style="text-align:right;padding:6px 0;color:#555">$'+v.spend.toFixed(2)+'</td></tr>'});
      html+='<tr style="border-top:2px solid #222;background:#f9f9f9"><td style="padding:10px 0;font-weight:700;font-size:14px">GROSS PROFIT</td><td style="text-align:right;padding:10px 0;font-weight:700;font-size:14px;color:'+(grossProfit>=0?"#059669":"#dc2626")+'">$'+grossProfit.toFixed(2)+' ('+grossMargin.toFixed(1)+'%)</td></tr>';
      html+='<tr style="border-bottom:2px solid #222"><td style="padding:10px 0;font-weight:700;font-size:14px">OPERATING EXPENSES</td><td></td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Sales Commissions</td><td style="text-align:right;padding:6px 0;color:#555">$'+totalComm.toFixed(2)+'</td></tr>';
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
      const inventory=filteredItems.reduce((s,i)=>s+(i.unitCost||0)*Math.max(0,i.qtyOrdered-i.qtyReceived),0);
      const bsTotalAR2=totalAR;const bsTotalAP2=totalAP;const bsRetained=totalRev-totalCost-totalComm;
      const bsCash=liveBankCash!==null?liveBankCash:(paidRev-totalAP);const bsTotalAssets=Math.max(0,bsCash)+bsTotalAR2+inventory;
      const bsEquity=bsTotalAssets-bsTotalAP2;
      html+='<div style="font-size:22px;font-weight:300;color:#888;margin-bottom:20px">Balance Sheet</div><div style="font-size:12px;color:#888;margin-bottom:20px">As of: '+today+'</div>';
      html+='<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>';
      html+='<tr style="border-bottom:2px solid #222;background:#f9f9f9"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">ASSETS</td></tr>';
      html+='<tr style="border-bottom:2px solid #ddd"><td colspan="2" style="padding:8px 0;font-weight:600;font-size:13px;color:#555">Current Assets</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Cash & Cash Equivalents</td><td style="text-align:right;padding:6px 0">$'+Math.max(0,bsCash).toFixed(2)+'</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Accounts Receivable</td><td style="text-align:right;padding:6px 0">$'+bsTotalAR2.toFixed(2)+'</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Inventory (In Transit)</td><td style="text-align:right;padding:6px 0">$'+inventory.toFixed(2)+'</td></tr>';
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL ASSETS</td><td style="text-align:right;padding:8px 0">$'+bsTotalAssets.toFixed(2)+'</td></tr>';
      html+='<tr><td colspan="2" style="padding:8px 0"></td></tr>';
      html+='<tr style="border-bottom:2px solid #222;background:#f9f9f9"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">LIABILITIES</td></tr>';
      html+='<tr style="border-bottom:2px solid #ddd"><td colspan="2" style="padding:8px 0;font-weight:600;font-size:13px;color:#555">Current Liabilities</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Accounts Payable</td><td style="text-align:right;padding:6px 0">$'+bsTotalAP2.toFixed(2)+'</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Commissions Payable</td><td style="text-align:right;padding:6px 0">$'+totalComm.toFixed(2)+'</td></tr>';
      html+='<tr style="border-top:2px solid #222;font-weight:700"><td style="padding:8px 0">TOTAL LIABILITIES</td><td style="text-align:right;padding:8px 0">$'+(bsTotalAP2+totalComm).toFixed(2)+'</td></tr>';
      html+='<tr><td colspan="2" style="padding:8px 0"></td></tr>';
      html+='<tr style="border-bottom:2px solid #222;background:#f0fdf4"><td colspan="2" style="padding:10px 0;font-weight:700;font-size:15px">EQUITY</td></tr>';
      html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 12px;color:#555">Retained Earnings</td><td style="text-align:right;padding:6px 0;color:'+(bsRetained>=0?"#059669":"#dc2626")+'">$'+bsRetained.toFixed(2)+'</td></tr>';
      html+='<tr style="border-top:3px double #222;font-weight:700;font-size:15px"><td style="padding:12px 0">TOTAL LIABILITIES & EQUITY</td><td style="text-align:right;padding:12px 0">$'+(bsTotalAP2+totalComm+bsRetained).toFixed(2)+'</td></tr>';
      html+='</tbody></table>';
    }
    html+='</div>';
    const w=window.open("","_blank");if(!w||w.closed){notify('Please allow popups to print','error');return}w.document.write(html);w.document.close();if(w.document.fonts){w.document.fonts.ready.then(()=>w.print())}else{setTimeout(()=>w.print(),800)}
  };


  const kpi=(label,value,sub,color)=><Card style={{padding:16,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:6}}>{label}</div><div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:800,color:color||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}><AnimNum value={value}/></div>{sub&&<div style={{fontSize:12,color:"#a3a3a3",marginTop:6}}>{sub}</div>}</Card>;


  return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Financials" sub="Financial Intelligence"/>
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[{k:"month",l:"Month"},{k:"quarter",l:"Quarter"},{k:"ytd",l:"YTD"},{k:"year",l:"Past Year"},{k:"all",l:"All Time"}].map(p=><button key={p.k} onClick={()=>setPeriodPreset(p.k)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(period===p.k?"#2dd4bf":"#333"),background:period===p.k?"rgba(45,212,191,0.1)":"transparent",color:period===p.k?"#2dd4bf":"#737373",fontSize:12,fontWeight:period===p.k?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{p.l}</button>)}</div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}><input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPeriod("custom")}} style={{padding:"8px 12px",background:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(200%) brightness(1.1)",WebkitBackdropFilter:"blur(8px) saturate(200%) brightness(1.1)",border:"1px solid #333",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/><span style={{color:"#525252",fontSize:12}}>to</span><input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPeriod("custom")}} style={{padding:"8px 12px",background:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(200%) brightness(1.1)",WebkitBackdropFilter:"blur(8px) saturate(200%) brightness(1.1)",border:"1px solid #333",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none"}}/></div>
      <div style={{fontSize:12,color:"#525252",fontFamily:"'JetBrains Mono',monospace"}}>{filteredJobs.length} job{filteredJobs.length!==1?"s":""}</div>
    </div>
        <div className="fin-tabs" style={{display:"flex",gap:3,background:"#111",padding:3,borderRadius:8,marginBottom:16,flexWrap:"wrap"}}>{[["overview","Overview"],["pnl","P&L"],["balance","Balance Sheet"],["banking","Banking"],["ar","Receivables"],["ap","Payables"],["margin","Margins"],["reports","Reports"]].map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:tab===v?"#2dd4bf":"transparent",color:tab===v?"#000":"#737373",fontSize:12,fontWeight:tab===v?600:400,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>{l}</button>)}</div>


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


    {tab==="pnl"&&<Card style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Profit & Loss</div><div style={{display:"flex",gap:8}}><Btn v="secondary" onClick={()=>setTab("banking")} style={{fontSize:11}}><I n="plus" s={12}/> Add Entry</Btn><Btn onClick={()=>generatePDF("pnl")}><I n="download" s={14}/> Export PDF</Btn></div></div>
      <div style={{borderBottom:"2px solid #222",padding:"10px 0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>REVENUE</span><span style={{fontSize:15,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalRev)}</span></div>
      {filteredJobs.map(j=>{const f=getJobFinancials(j.id);return <div key={j.id} onClick={()=>{fCtx.setSelectedJob(j.id);fCtx.setPage('jobs')}} style={{padding:"6px 16px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #111",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:13,color:"#a3a3a3"}}>{j.name}</span><span style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span></div>})}
      {filteredManualTxns.filter(t=>t.type==='revenue'&&_isManualPL(t)).map(t=><div key={t.id} style={{padding:"6px 16px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #111",background:"#2dd4bf05"}}><span style={{fontSize:13,color:"#2dd4bf"}}>{t.description||'Manual entry'} <span style={{fontSize:10,color:"#525252"}}>(manual)</span></span><span style={{fontSize:13,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(parseFloat(t.amount)||0)}</span></div>)}
      <div style={{borderBottom:"2px solid #222",padding:"10px 0",display:"flex",justifyContent:"space-between",marginTop:12}}><span style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>COST OF GOODS SOLD</span><span style={{fontSize:15,fontWeight:700,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimatedNumber value={totalCost} prefix="$"/></span></div>
      {vendorSpend.map(v=><div key={v.name} onClick={()=>{fCtx.setGlobalSearch(v.name);fCtx.setPage('jobs')}} style={{padding:"6px 16px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #111",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:13,color:"#a3a3a3"}}>{v.name}</span><span style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(v.spend)}</span></div>)}
      {filteredManualTxns.filter(t=>t.type==='expense'&&_isManualPL(t)).map(t=><div key={t.id} style={{padding:"6px 16px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #111",background:"#f8717105"}}><span style={{fontSize:13,color:"#f87171"}}>{t.description||'Manual expense'} <span style={{fontSize:10,color:"#525252"}}>({t.category||'manual'})</span></span><span style={{fontSize:13,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(parseFloat(t.amount)||0)}</span></div>)}
      <div style={{background:"#0a0a0a",borderRadius:8,padding:"12px 0",marginTop:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:15,fontWeight:700,color:"#f0f0f0",paddingLeft:4}}>GROSS PROFIT</span><span style={{fontSize:15,fontWeight:700,color:grossProfit>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimatedNumber value={grossProfit} prefix="$"/> ({grossMargin.toFixed(1)}%)</span></div>
      <div style={{borderBottom:"2px solid #222",padding:"10px 0",display:"flex",justifyContent:"space-between",marginTop:12}}><span style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>OPERATING EXPENSES</span><span style={{fontSize:15,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalComm)}</span></div>
      <div style={{padding:"6px 16px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #111"}}><span style={{fontSize:13,color:"#a3a3a3"}}>Sales Commissions</span><span style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalComm)}</span></div>
      <div style={{background:"#34d39908",borderRadius:8,padding:"14px 4px",marginTop:16,display:"flex",justifyContent:"space-between",border:"1px solid #34d39920"}}><span style={{fontSize:17,fontWeight:800,color:"#f0f0f0"}}>NET INCOME</span><span style={{fontSize:17,fontWeight:800,color:netIncome>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}><AnimatedNumber value={netIncome} prefix="$"/></span></div>
    </Card>}


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
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL ASSETS</div><div style={{fontSize:22,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalAssets)}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL LIABILITIES</div><div style={{fontSize:22,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalLiab)}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>EQUITY</div><div style={{fontSize:22,fontWeight:800,color:bsEquity>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsEquity)}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>BALANCED</div><div style={{fontSize:22,fontWeight:800,color:isBalanced?"#34d399":"#f87171"}}>{isBalanced?"Yes":"No"}</div><div style={{fontSize:11,color:"#737373",marginTop:4}}>A = L + E</div></Card>
        </div>


        <Card style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
            <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Balance Sheet</div><div style={{fontSize:12,color:"#737373",marginTop:2}}>As of {new Date(dateTo).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div>
            <div style={{display:"flex",gap:8}}><Btn v="secondary" onClick={()=>setTab("banking")} style={{fontSize:11}}><I n="plus" s={12}/> Add Entry</Btn><Btn onClick={()=>generatePDF("balance")}><I n="download" s={14}/> Export PDF</Btn></div>
          </div>


          <div style={{background:"#2dd4bf08",borderRadius:10,padding:2,marginBottom:20,border:"1px solid #2dd4bf15"}}>
            <div style={{padding:"12px 14px",borderBottom:"2px solid #2dd4bf20"}}><span style={{fontSize:15,fontWeight:800,color:"#2dd4bf",letterSpacing:1}}>ASSETS</span></div>
            <div style={{padding:"8px 14px",borderBottom:"1px solid #222"}}><span style={{fontSize:12,fontWeight:700,color:"#e5e5e5",letterSpacing:0.5}}>Current Assets</span></div>
            {bsLine("Cash & Cash Equivalents",bsCash,true,false,"#34d399")}
            {bsLine("Accounts Receivable",totalAR,true,false,"#2dd4bf")}
            {bsLine("Inventory (In Transit)",inventory,true,false,"#a78bfa")}
            {manualAssets>0&&bsLine("Other Assets (Manual)",manualAssets,true,false,"#8b5cf6")}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #2dd4bf30",margin:"0 14px"}}><span style={{fontSize:14,fontWeight:800,color:"#f0f0f0"}}>Total Current Assets</span><span style={{fontSize:15,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalCurrentAssets)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:"#2dd4bf10",borderRadius:"0 0 8px 8px"}}><span style={{fontSize:15,fontWeight:800,color:"#f0f0f0"}}>TOTAL ASSETS</span><span style={{fontSize:16,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalAssets)}</span></div>
          </div>


          <div style={{background:"#f9731608",borderRadius:10,padding:2,marginBottom:20,border:"1px solid #f9731615"}}>
            <div style={{padding:"12px 14px",borderBottom:"2px solid #f9731620"}}><span style={{fontSize:15,fontWeight:800,color:"#f97316",letterSpacing:1}}>LIABILITIES</span></div>
            <div style={{padding:"8px 14px",borderBottom:"1px solid #222"}}><span style={{fontSize:12,fontWeight:700,color:"#e5e5e5",letterSpacing:0.5}}>Current Liabilities</span></div>
            {bsLine("Accounts Payable",totalAP,true,false,"#f97316")}
            {bsLine("Commissions Payable",totalComm,true,false,"#fbbf24")}
            {manualLiabilities>0&&bsLine("Other Liabilities (Manual)",manualLiabilities,true,false,"#f97316")}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #f9731630",margin:"0 14px"}}><span style={{fontSize:14,fontWeight:800,color:"#f0f0f0"}}>Total Current Liabilities</span><span style={{fontSize:15,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalCurrentLiab)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:"#f9731610",borderRadius:"0 0 8px 8px"}}><span style={{fontSize:15,fontWeight:800,color:"#f0f0f0"}}>TOTAL LIABILITIES</span><span style={{fontSize:16,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalLiab)}</span></div>
          </div>


          <div style={{background:bsEquity>=0?"#34d39908":"#f8717108",borderRadius:10,padding:2,marginBottom:20,border:"1px solid "+(bsEquity>=0?"#34d39915":"#f8717115")}}>
            <div style={{padding:"12px 14px",borderBottom:"2px solid "+(bsEquity>=0?"#34d39920":"#f8717120")}}><span style={{fontSize:15,fontWeight:800,color:bsEquity>=0?"#34d399":"#f87171",letterSpacing:1}}>EQUITY</span></div>
            {bsLine("Retained Earnings",bsRetained,true,false,bsRetained>=0?"#34d399":"#f87171")}
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:bsEquity>=0?"#34d39910":"#f8717110",borderRadius:"0 0 8px 8px"}}><span style={{fontSize:15,fontWeight:800,color:"#f0f0f0"}}>TOTAL EQUITY</span><span style={{fontSize:16,fontWeight:800,color:bsEquity>=0?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsEquity)}</span></div>
          </div>


          <div style={{background:isBalanced?"#34d39908":"#f8717108",borderRadius:10,padding:"14px 16px",border:"1px solid "+(isBalanced?"#34d39920":"#f8717120"),display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:17,fontWeight:800,color:"#f0f0f0"}}>TOTAL LIABILITIES & EQUITY</span>
            <span style={{fontSize:18,fontWeight:800,color:isBalanced?"#34d399":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(bsTotalLiabEquity)}</span>
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
      const defaultCats=['Uncategorized','Revenue - Product Sales','Revenue - Shipping','Revenue - Installation','COGS - Vendor Payments','COGS - Freight','Operating - Rent','Operating - Utilities','Operating - Insurance','Operating - Office Supplies','Operating - Commissions','Operating - Payroll','Operating - Marketing','Operating - Professional Services','Tax Payment','Transfer','Owner Draw','Owner Investment','Refund','Other'];
      const customCatRecord=(customSops||[]).find(s=>s.id==='CUSTOM_CATEGORIES');
      const customCats=customCatRecord?(()=>{try{return JSON.parse(customCatRecord.content)}catch{return []}})():[];
      const categories=[...defaultCats,...customCats.filter(c=>!defaultCats.includes(c))];
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
        acctTxns.forEach(t=>{deleteSop(t.id)});
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
          }
        }
        const id=manualEditing||'TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
        addSop({id,title:manualForm.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify(manualForm),custom:true});
        notify(manualEditing?'Transaction updated':'Transaction added');
        setManualForm({date:'',description:'',category:'',amount:'',type:'expense',account:'Operating'});
        setManualEditing(null);
      };
      const deleteTxn=(id)=>{deleteSop(id);notify('Transaction deleted')};
      const editTxn=(t)=>{setManualForm({date:t.date||'',description:t.description||'',category:t.category||'',amount:t.amount||'',type:t.type||'expense',account:t.account||'Operating'});setManualEditing(t.id)};
      const updateCategory=(txnId,cat)=>{const t=allTxns.find(x=>x.id===txnId);if(!t)return;const newType=cat.startsWith('Revenue')?'revenue':cat==='asset'?'asset':cat==='liability'?'liability':'expense';addSop({id:txnId,title:t.description||'Transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({...t,category:cat,type:newType}),custom:true});notify('Categorized: '+cat)};
      const totalBankIn=filteredBankTxns.filter(t=>t.type==='revenue').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const totalBankOut=filteredBankTxns.filter(t=>t.type==='expense').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const uncategorized=filteredBankTxns.filter(t=>!t.category||t.category==='Uncategorized'||!categories.includes(t.category)).length;
      const toggleTxnSelect=(id)=>{const next=new Set(txnSelected);if(next.has(id))next.delete(id);else next.add(id);setTxnSelected(next)};
      const selectAllTxns=()=>{if(txnSelected.size===filteredBankTxns.length)setTxnSelected(new Set());else setTxnSelected(new Set(filteredBankTxns.map(t=>t.id)))};
      const bulkDelete=()=>{txnSelected.forEach(id=>deleteSop(id));notify(txnSelected.size+' transaction'+(txnSelected.size!==1?'s':'')+' deleted');setTxnSelected(new Set())};
      const bulkCategorize=(cat)=>{txnSelected.forEach(id=>{const t=allTxns.find(x=>x.id===id);if(t)updateCategory(id,cat)});notify(txnSelected.size+' transaction'+(txnSelected.size!==1?'s':'')+' categorized as '+cat);setTxnSelected(new Set())};
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
        let imported=0,skipped=0,invalid=0;
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
          existingHashes.add(hash);
          const id='TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-S'+i;
          addSop({id,title:rec.description,cat:'ManualTxn',icon:'dollar',content:JSON.stringify(rec),custom:true});
          imported++;
        });
        return {imported,skipped,invalid};
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
          const {imported,skipped,invalid}=_stmtImport(txnList,file.name||'');
          notify(imported+' transaction'+(imported!==1?'s':'')+' imported to '+stmtAcct+(skipped>0?' -- '+skipped+' skipped (already in system)':'')+(invalid>0?' -- '+invalid+' unreadable row'+(invalid!==1?'s':'')+' ignored':'')+' from '+(file.name||'statement'));
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
        setPlaidLoading(true);setPlaidSyncing(true);
        // Rebuild dedup sets inline -- guarantees freshness against current manualTxns.
        const existingPlaidIds=new Set(manualTxns.filter(mt=>mt.plaidId).map(mt=>mt.plaidId));
        const existingHashes=new Set(manualTxns.map(mt=>_bankTxnHash(mt)));
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
          if(Array.isArray(data.accounts)&&data.accounts.length>0){try{addSop({id:'BANK_BALANCES_GLOBAL',title:'Bank Balances',cat:'BankBalances',icon:'dollar',content:JSON.stringify({asOf:new Date().toISOString(),accounts:data.accounts.map(a=>({name:a.name||a.official_name||'',mask:a.mask||'',type:a.type||'',subtype:a.subtype||'',current:a.balances?.current??null,available:a.balances?.available??null}))}),custom:true});}catch(_e){}}
          const txns=data.added||data.transactions||[];
          let imported=0;let skipped=0;
          txns.forEach(t=>{
            // Smart dedup: check Plaid transaction ID first
            if(t.transaction_id&&existingPlaidIds.has(t.transaction_id)){skipped++;return}
            // Fallback dedup: shared _bankTxnHash so manual rows and Plaid pulls collapse
            // to the same key when describing the same transaction. The 12-char description
            // prefix avoids collapsing distinct same-day same-amount transactions (e.g.,
            // two separate Amazon purchases).
            const hash=_bankTxnHash({date:t.date,amount:t.amount,description:t.name||t.merchant_name||''});
            if(existingHashes.has(hash)){skipped++;return}
            // Mark as seen for this sync batch
            if(t.transaction_id)existingPlaidIds.add(t.transaction_id);
            existingHashes.add(hash);
            const id='TXN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-'+imported;
            const isDebit=t.amount>0;
            addSop({id,title:t.name||t.merchant_name||'Bank transaction',cat:'ManualTxn',icon:'dollar',content:JSON.stringify({
              date:t.date||'',description:t.name||t.merchant_name||'',category:t.personal_finance_category?.primary||'Uncategorized',
              amount:String(Math.abs(t.amount).toFixed(2)),type:isDebit?'expense':'revenue',account:t.account_id||'Operating',
              plaidId:t.transaction_id,plaidCategory:t.category?.join(' > ')||''
            }),custom:true});imported++;
          });
          const syncTime=new Date().toISOString();
          localStorage.setItem('mw_plaid_last_sync',syncTime);setPlaidLastSync(syncTime);
          setPlaidSyncError('');
          // Update sops PLAID_CONN_STATE so other devices know about the latest sync time.
          // Without this, every device would re-sync the same recent window on its own auto-sync.
          try{const _existRec=(customSops||[]).find(s=>s.id==='PLAID_CONN_STATE');const _existData=_existRec?JSON.parse(_existRec.content||'{}'):{};addSop({id:'PLAID_CONN_STATE',title:'Plaid Connection State',cat:'PlaidConn',icon:'dollar',content:JSON.stringify({status:'connected',accessToken:plaidAccessToken,bankName:plaidBankName||_existData.bankName||'',lastSync:syncTime}),custom:true})}catch{}
          if(!silent||imported>0)notify(imported+' new'+(skipped>0?', '+skipped+' skipped (already in system)':'')+' ('+startDate+' to '+endDate+')');
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


      return <div style={{display:"flex",flexDirection:"column",gap:16}}>
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
            <div style={{position:"relative"}}><label style={{fontSize:11,color:"#a3a3a3",display:"block",marginBottom:3}}>Category</label><input value={manualForm.category} onChange={e=>{const cat=e.target.value;const newType=cat.startsWith('Revenue')?'revenue':'expense';setManualForm({...manualForm,category:cat,type:newType});e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onFocus={e=>{e.target.nextElementSibling&&(e.target.nextElementSibling.style.display='block')}} onBlur={e=>{setTimeout(()=>{if(e.target.nextElementSibling)e.target.nextElementSibling.style.display='none'},150)}} placeholder="Type to search..." style={inputStyle} autoComplete="off"/><div style={{display:"none",position:"absolute",top:"100%",left:0,right:0,maxHeight:220,overflowY:"auto",background:"#111",border:"1px solid #333",borderRadius:6,zIndex:20,boxShadow:"0 8px 20px rgba(0,0,0,0.5)"}}>{categories.filter(c=>!manualForm.category||c.toLowerCase().includes(manualForm.category.toLowerCase())).map(c=><div key={c} onMouseDown={e=>{e.preventDefault();const newType=c.startsWith('Revenue')?'revenue':'expense';setManualForm({...manualForm,category:c,type:newType});e.target.closest('div[style*="position"]').style.display='none'}} style={{padding:"6px 10px",fontSize:11,color:manualForm.category===c?"#14b8a6":"#a3a3a3",cursor:"pointer",borderBottom:"1px solid #1a1a1a"}} onMouseEnter={e=>{e.currentTarget.style.background="#1a1a1a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>{c}</div>)}</div></div>
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
              <td style={{padding:"8px",color:"#e5e5e5",fontWeight:500}}>{t.description||'--'}{t.plaidId&&<span style={{fontSize:9,color:"#525252",marginLeft:4}}>bank</span>}</td>
              <td style={{padding:"8px"}}><select value={t.category||''} onChange={e=>updateCategory(t.id,e.target.value)} style={{background:"#111",border:"1px solid #222",color:(!t.category||t.category==='Uncategorized'||!categories.includes(t.category))?"#fbbf24":"#a3a3a3",borderRadius:6,padding:"3px 6px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}><option value="">Uncategorized</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></td>
              <td style={{padding:"8px",color:"#737373",fontSize:11}} title={t.account||''}>{acctDisplayName(t.account)}</td>
              <td style={{padding:"8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:t.type==='revenue'?"#34d399":"#f87171"}}>{t.type==='revenue'?'+':'-'}{fmt(parseFloat(t.amount)||0)}</td>
              <td style={{padding:"8px",textAlign:"right"}}><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}><button onClick={()=>{if(isEditing){setManualEditing(null)}else{editTxn(t)}}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+(isEditing?"#14b8a640":"#333"),background:isEditing?"#14b8a610":"transparent",color:isEditing?"#14b8a6":"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{isEditing?'Close':'Edit'}</button><button onClick={()=>deleteTxn(t.id)} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #f8717130",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Del</button></div></td>
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
            </React.Fragment>})}
            <tr style={{borderTop:"2px solid #222",background:"#0a0a0a"}}><td/><td colSpan={4} style={{padding:"8px",fontWeight:700}}>TOTALS</td><td style={{padding:"8px",textAlign:"right",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{fmt(totalBankIn-totalBankOut)}</td><td/></tr>
            </tbody>
          </table></div>
        </Card>}
      </div>})()}


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
  </div>;
}


function UserMgmtPage({notify,reps,customSops,addSop,deleteSop}){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [changingPw,setChangingPw]=useState(null);
  const [editingUser,setEditingUser]=useState(null);
  const [newUser,setNewUser]=useState({name:"",username:"",password:"",role:"sales",rep_id:""});


  useEffect(()=>{(async()=>{const data=await db.fetchUsers();if(data)setUsers(data);setLoading(false)})()},[]);


  // Load Clerk user roles from SOPs settings
  const clerkRolesRaw=(customSops||[]).find(s=>s.id==="CLERK_USER_ROLES"&&s.cat==="Settings");
  const clerkRoles=clerkRolesRaw?JSON.parse(clerkRolesRaw.content||"{}"):{}; 
  // clerkRoles = { "clerk-id-xxx": { role: "admin", pages: [...], name: "...", email: "..." } }


  const saveClerkRole=(clerkId,roleData)=>{
    const updated={...clerkRoles,[clerkId]:roleData};
    addSop({id:"CLERK_USER_ROLES",title:"Clerk User Roles",cat:"Settings",icon:"shield",content:JSON.stringify(updated),custom:true});
    notify("Updated role for "+roleData.name);
  };


  // Get all Clerk users from the clerkRoles store
  const clerkUsers=Object.entries(clerkRoles).map(([id,data])=>({id,clerkId:id,...data}));


  const addUser=async()=>{if(!newUser.name||!newUser.username||!newUser.password){notify("All fields required");return}const user={id:"USR-"+Math.random().toString(36).slice(2,8).toUpperCase(),username:newUser.username.trim().toLowerCase(),password:newUser.password,role:newUser.role,rep_id:newUser.role==="sales"?newUser.rep_id:"",name:newUser.name.trim()};const res=await db.saveUser(user);if(res?.ok){setUsers(p=>[...p,user]);setNewUser({name:"",username:"",password:"",role:"sales",rep_id:""});setShowAdd(false);notify("User created: "+user.name)}else{notify("Error creating user -- username may exist")}};


  const deleteUser=async(id)=>{if(!confirm("Delete this user?"))return;await db.deleteUser(id);setUsers(p=>p.filter(u=>u.id!==id));notify("User deleted")};


  const roleColor={admin:"#2dd4bf",office:"#a78bfa",sales:"#fbbf24"};
  const allPages=["dashboard","jobs","deliveries","documents","files","commissions","financials","salesportal","prospects","playbook","tasks","notes","brain","exitreadiness","usermgmt"];
  const pageLabels={dashboard:"Command Center",jobs:"Job Records",deliveries:"Delivery Tracker",documents:"Documents",files:"Files",commissions:"Commissions",financials:"Financials",salesportal:"Sales Portal",prospects:"Prospects",playbook:"Playbook & SOPs",tasks:"Tasks",notes:"Notes",brain:"Brain",exitreadiness:"Exit Readiness",usermgmt:"Users & Permissions"};
  const roleDefaults={admin:allPages,office:["dashboard","jobs","deliveries","documents","files","salesportal","prospects","playbook","tasks","notes","brain"],sales:["dashboard","jobs","deliveries","documents","files","tasks","notes","brain","salesportal","prospects"]};


  const allUsersList=[
    ...users.map(u=>{const dbPages=(()=>{try{return u.pages?JSON.parse(u.pages):null}catch{return null}})();return{...u,source:"password",pages:u.pages,_pages:dbPages||roleDefaults[u.role]||roleDefaults.sales}}),
    ...clerkUsers.map(u=>({...u,source:"clerk",username:u.email||"Google/Apple",pages:u.pages,_pages:u.pages||roleDefaults[u.role||"admin"]}))
  ];


  return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Users & Permissions" sub="Manage team access"/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{fontSize:13,color:"#a3a3a3"}}>{allUsersList.length} user{allUsersList.length!==1?"s":""} ({users.length} password, {clerkUsers.length} Google/Apple)</div>
      <Btn onClick={()=>setShowAdd(!showAdd)}>{showAdd?"Cancel":"+ Add User"}</Btn>
    </div>


    {showAdd&&<Card style={{padding:20,marginBottom:16,border:"1px solid rgba(45,212,191,0.15)"}}>
      <div style={{fontSize:15,fontWeight:700,color:"#2dd4bf",marginBottom:14}}>New User (Username/Password)</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}>
        <div><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:4}}>Full Name</label><input value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} style={{width:"100%",padding:"10px 14px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#f0f0f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} placeholder="Full name"/></div>
        <div><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:4}}>Username</label><input value={newUser.username} onChange={e=>setNewUser({...newUser,username:e.target.value})} style={{width:"100%",padding:"10px 14px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#f0f0f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} placeholder="Username"/></div>
        <div><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:4}}>Password</label><input value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} type="password" style={{width:"100%",padding:"10px 14px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#f0f0f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} placeholder="Password"/></div>
      </div>
      <div style={{marginBottom:12}}><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:6}}>Role</label><div style={{display:"flex",gap:6}}>{[{v:"admin",l:"Admin",d:"Full access"},{v:"office",l:"Office",d:"Operations access"},{v:"sales",l:"Sales",d:"Own jobs only"}].map(r=><button key={r.v} onClick={()=>setNewUser({...newUser,role:r.v})} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+(newUser.role===r.v?roleColor[r.v]+"60":"#222"),background:newUser.role===r.v?roleColor[r.v]+"12":"transparent",color:newUser.role===r.v?roleColor[r.v]:"#737373",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",textAlign:"center"}}><div style={{fontWeight:600,marginBottom:2}}>{r.l}</div><div style={{fontSize:11,opacity:0.7}}>{r.d}</div></button>)}</div></div>
      {newUser.role==="sales"&&<div style={{marginBottom:12}}><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:4}}>Link to Sales Rep</label><select value={newUser.rep_id} onChange={e=>setNewUser({...newUser,rep_id:e.target.value})} style={{width:"100%",padding:"10px 14px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#f0f0f0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}><option value="">Select rep...</option>{reps.filter(r=>!r.id.includes("SEED_FLAG")).map(r=><option key={r.id} value={r.id}>{r.name} -- {r.territory}</option>)}</select></div>}
      <Btn onClick={addUser}>Create User</Btn>
    </Card>}


    {loading?<div style={{textAlign:"center",padding:40,color:"#737373"}}>Loading users...</div>:
    <div style={{display:"grid",gap:10}}>
      {allUsersList.map(u=><Card key={u.id} style={{padding:16,border:editingUser===u.id?"1px solid #a78bfa30":"1px solid rgba(255,255,255,0.04)"}} hover>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {u.avatar?<img src={u.avatar} style={{width:40,height:40,borderRadius:12,objectFit:"cover"}}/>:
            <div style={{width:40,height:40,borderRadius:12,background:(roleColor[u.role]||"#525252")+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:roleColor[u.role]||"#525252",fontFamily:"'JetBrains Mono',monospace"}}>{(u.name||"?")[0]}</div>}
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#f0f0f0"}}>{u.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{u.username||u.email||""}</span>{u.source==="clerk"&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"#a78bfa15",color:"#a78bfa",fontWeight:600}}>{u.email?.includes("google")?"GOOGLE":"SSO"}</span>}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Badge label={u.role||"admin"} color={roleColor[u.role||"admin"]||"#525252"}/>
            {u.rep_id&&<span style={{fontSize:12,color:"#737373"}}>{reps.find(r=>r.id===u.rep_id)?.name||""}</span>}
            <button onClick={()=>setEditingUser(editingUser===u.id?null:u.id)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#a78bfa";e.currentTarget.style.borderColor="#a78bfa"}} onMouseLeave={e=>{e.currentTarget.style.color="#a3a3a3";e.currentTarget.style.borderColor="#333"}}>{editingUser===u.id?"Close":"Edit"}</button>
            {u.id!=="USR-000"&&u.source!=="clerk"&&<button onClick={()=>deleteUser(u.id)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#737373",fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="#f87171"}} onMouseLeave={e=>{e.currentTarget.style.color="#737373";e.currentTarget.style.borderColor="#333"}}>Remove</button>}
          </div>
        </div>


        {editingUser===u.id&&<div style={{marginTop:14,padding:16,background:"#0a0a0a",borderRadius:12,border:"1px solid #222"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#a78bfa",marginBottom:12}}>Edit Permissions -- {u.name}</div>
          {/* Role selector */}
          <div style={{marginBottom:14}}><label style={{fontSize:12,color:"#737373",display:"block",marginBottom:6}}>Role</label>
          <div style={{display:"flex",gap:6}}>{[{v:"admin",l:"Admin"},{v:"office",l:"Office"},{v:"sales",l:"Sales"}].map(r=><button key={r.v} onClick={()=>{
            const newPages=JSON.stringify(roleDefaults[r.v]);
            if(u.source==="clerk"){saveClerkRole(u.clerkId,{...clerkRoles[u.clerkId],role:r.v,name:u.name,email:u.email||"",pages:roleDefaults[r.v]})}
            else{
              db.saveUser({...u,role:r.v,pages:newPages}).then(()=>{setUsers(prev=>prev.map(x=>x.id===u.id?{...x,role:r.v,pages:newPages}:x));notify("Role updated to "+r.l+" -- pages reset to default")}).catch(()=>{})
            }
          }} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+((u.role||"admin")===r.v?(roleColor[r.v]||"#525252")+"60":"#222"),background:(u.role||"admin")===r.v?(roleColor[r.v]||"#525252")+"12":"transparent",color:(u.role||"admin")===r.v?roleColor[r.v]:"#737373",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{r.l}</button>)}</div></div>


          {/* Page-level permissions -- granular control regardless of role */}
          <div><label style={{fontSize:12,color:"#737373",display:"block",marginBottom:8}}>Visible Pages<span style={{color:"#525252",fontWeight:400,marginLeft:6}}>Click to show/hide</span></label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {allPages.map(p=>{
              const storedPages=u.source==="clerk"?(clerkRoles[u.clerkId]?.pages||null):null;
              const dbPages=(()=>{try{return u.pages?JSON.parse(u.pages):null}catch{return null}})();
              const pages=storedPages||dbPages||roleDefaults[u.role||"admin"];
              const isOn=pages.includes(p);
              return <button key={p} onClick={()=>{
                const newPages=isOn?pages.filter(x=>x!==p):[...pages,p];
                const newPagesStr=JSON.stringify(newPages);
                if(u.source==="clerk"){saveClerkRole(u.clerkId,{...clerkRoles[u.clerkId],role:u.role||"admin",name:u.name,email:u.email||"",pages:newPages})}
                else{
                  db.saveUser({...u,pages:newPagesStr}).then(()=>{
                    setUsers(prev=>prev.map(x=>x.id===u.id?{...x,pages:newPagesStr}:x));
                    notify(pageLabels[p]+" "+(isOn?"hidden from":"shown to")+" "+u.name);
                  }).catch(()=>{notify("Error saving permissions")});
                }
              }} style={{padding:"5px 10px",borderRadius:6,border:"1px solid "+(isOn?"#2dd4bf30":"#222"),background:isOn?"#2dd4bf08":"transparent",color:isOn?"#2dd4bf":"#525252",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{pageLabels[p]||p}</button>
            })}
          </div></div>


          {/* Password change for password users */}
          {u.source!=="clerk"&&<div style={{marginTop:12}}><button onClick={()=>setChangingPw(changingPw===u.id?null:u.id)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Change Password</button>
          {changingPw===u.id&&<div style={{marginTop:8,display:"flex",gap:8,alignItems:"center"}}><input id={"pw-"+u.id} type="password" placeholder="New password" style={{flex:1,padding:"8px 12px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none"}}/><Btn onClick={async()=>{const pw=document.getElementById("pw-"+u.id)?.value;if(!pw||pw.length<4){notify("Password must be at least 4 characters");return}const res=await db.saveUser({...u,password:pw});if(res?.ok){notify("Password updated for "+u.name);setChangingPw(null)}else{notify("Error updating password")}}}>Save</Btn></div>}</div>}


          {/* Clerk user info */}
          {u.source==="clerk"&&<div style={{marginTop:12,fontSize:11,color:"#525252"}}>Signed in via Google/Apple. Role and page access managed here.</div>}
        </div>}
      </Card>)}
    </div>}


    <Card style={{marginTop:20,padding:16,border:"1px solid rgba(167,139,250,0.1)"}}>
      <div style={{fontSize:14,fontWeight:700,color:"#a78bfa",marginBottom:8}}>Permission Levels</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}} className="resp-grid-3">
        <div style={{padding:12,background:"#000",borderRadius:10}}><div style={{fontSize:13,fontWeight:600,color:"#2dd4bf",marginBottom:6}}>Admin</div><div style={{fontSize:12,color:"#a3a3a3",lineHeight:1.6}}>Full access to all pages including Command Center, Job Records, Documents, Financials, Commissions, Exit Readiness, Brain, and Users & Permissions.</div></div>
        <div style={{padding:12,background:"#000",borderRadius:10}}><div style={{fontSize:13,fontWeight:600,color:"#a78bfa",marginBottom:6}}>Office Manager</div><div style={{fontSize:12,color:"#a3a3a3",lineHeight:1.6}}>Access to all operational pages: Jobs, Documents, Deliveries, Directory, Tasks, Notes, Sales Portal, Playbook, and Brain. Cannot see Financials, Commissions, or Exit Readiness.</div></div>
        <div style={{padding:12,background:"#000",borderRadius:10}}><div style={{fontSize:13,fontWeight:600,color:"#fbbf24",marginBottom:6}}>Sales Rep</div><div style={{fontSize:12,color:"#a3a3a3",lineHeight:1.6}}>Sees only their own assigned jobs. Access to Dashboard (own data), Job Records, Documents, Deliveries, Tasks, Notes, Brain, and Sales Portal. Cannot see other reps' data.</div></div>
      </div>
    </Card>
  </div>;
}


function DirectoryPage({vendors,customers,reps,updateVendor,addVendor,deleteVendor,forceDeleteVendor,forceDeleteCustomer,forceDeleteRep,updateCustomer,addCustomer,deleteCustomer,updateRep,addRep,deleteRep,notify,jobs,lineItems,getJobFinancials,getJobItems,setPage,confirm}){
  
  // Custom checkbox component




const [tab,setTab]=useState("vendors");
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({});
  const [adding,setAdding]=useState(false);
  const [sort,setSort]=useState("name");
  const [dirSearch,setDirSearch]=useState("");
  const [selected,setSelected]=useState(new Set());
  const [bulkAction,setBulkAction]=useState(null);
  const [custDetail,setCustDetail]=useState(null);
  const [vendorDetail,setVendorDetail]=useState(null);


  const startEdit=(item)=>{if(editId===item.id){setEditId(null);setForm({});return}setEditId(item.id);setForm({...item,roles:Array.isArray(item.roles)&&item.roles.length>0?item.roles:getRoles(item)});setAdding(false);setSelected(new Set())};
  const startAdd=()=>{setAdding(true);setEditId(null);setSelected(new Set());
    if(tab==="vendors") setForm({name:"",contact:"",email:"",phone:"",category:"",address:""});
    if(tab==="customers") setForm({name:"",contact:"",email:"",phone:"",type:"K-12 District",address:""});
    if(tab==="reps") setForm({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate",roles:["Sales"]});
  };
  const save=()=>{
    if(!form.name){notify("Name is required","error");return}
    if(adding){
      if(tab==="vendors") addVendor(form);
      if(tab==="customers") addCustomer(form);
      if(tab==="reps") addRep({...form,commissionRate:parseFloat(form.commissionRate)||0.05});
      notify((tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Team member")+" added");
    } else {
      if(tab==="vendors") updateVendor(editId,form);
      if(tab==="customers") updateCustomer(editId,form);
      if(tab==="reps") updateRep(editId,{...form,commissionRate:parseFloat(form.commissionRate)||0});
      notify("Updated -- changes propagated");
    }
    setEditId(null);setAdding(false);setForm({});
  };
  const del=(id)=>{
    if(tab==="vendors") deleteVendor(id);
    if(tab==="customers") deleteCustomer(id);
    if(tab==="reps") deleteRep(id);
    setEditId(null);notify("Deleted");
  };
  const cancel=()=>{setEditId(null);setAdding(false);setForm({})};
  const field = (k, l, type) => <div key={k}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>{l}</label>{type==="select-tier"?<select value={form[k]||""} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select>:<input type={type||"text"} value={form[k]==null?"":form[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))} style={inputStyle}/>}</div>;


  // Bulk operations
  const toggleSelect=(id)=>{const s=new Set(selected);if(s.has(id))s.delete(id);else s.add(id);setSelected(s)};
  const list=tab==="vendors"?vendors:tab==="customers"?customers:reps;
  const filteredList=tab==="vendors"?[...vendors].filter(v=>{const s=dirSearch.toLowerCase();return !s||v.name.toLowerCase().includes(s)||v.contact.toLowerCase().includes(s)||v.category.toLowerCase().includes(s)||v.email.toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()))
    :tab==="customers"?[...customers].filter(c=>{const s=dirSearch.toLowerCase();return !s||c.name.toLowerCase().includes(s)||(c.contact||"").toLowerCase().includes(s)||(c.type||"").toLowerCase().includes(s)||(c.email||"").toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()))
    :[...reps].filter(r=>{const s=dirSearch.toLowerCase();return !s||r.name.toLowerCase().includes(s)||(r.territory||"").toLowerCase().includes(s)||(r.tier||"").toLowerCase().includes(s)||(r.email||"").toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()));
  const selectAll=()=>{if(selected.size===filteredList.length)setSelected(new Set());else setSelected(new Set(filteredList.map(i=>i.id)))};
  const handleBulkDelete=async()=>{
    if(selected.size===0)return;
    const ok=await confirm("Delete "+selected.size+" "+tab+"? This cannot be undone.");
    if(!ok)return;
    const ids=[...selected];
    if(tab==="vendors") ids.forEach(id=>forceDeleteVendor(id));
    else if(tab==="customers") ids.forEach(id=>forceDeleteCustomer(id));
    else ids.forEach(id=>forceDeleteRep(id));
    setSelected(new Set());
    notify(ids.length+" "+tab+" deleted");
  };
  const handleBulkEdit=(field,value)=>{
    for(const id of selected){
      if(tab==="vendors") updateVendor(id,{[field]:value});
      else if(tab==="customers") updateCustomer(id,{[field]:value});
      else updateRep(id,{[field]:value});
    }
    notify(selected.size+" "+tab+" updated");
    setBulkAction(null);
  };


  // Customer analytics mini-view
  const CustAnalytics=({cust})=>{
    const cJobs=jobs.filter(j=>j.customer===cust.id);
    const totalSpend=cJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
    const totalCost=cJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
    const avgMargin=totalSpend>0?(1-totalCost/totalSpend)*100:0;
    const totalItems=cJobs.reduce((s,j)=>s+getJobItems(j.id).length,0);
    const totalOrdered=cJobs.reduce((s,j)=>s+getJobItems(j.id).reduce((a,i)=>a+i.qtyOrdered,0),0);
    const totalReceived=cJobs.reduce((s,j)=>s+getJobItems(j.id).reduce((a,i)=>a+i.qtyReceived,0),0);
    const paidJobs=cJobs.filter(j=>j.paymentStatus==="paid").length;
    const activeJobs=cJobs.filter(j=>j.phase!=="Complete"&&j.phase!=="Quoting").length;
    // Vendor breakdown
    const vSpend={};
    cJobs.forEach(j=>{getJobItems(j.id).forEach(i=>{const v=vendors.find(v=>v.id===i.vendor);if(v)vSpend[v.name]=(vSpend[v.name]||0)+i.unitCost*i.qtyOrdered})});
    const topV=Object.entries(vSpend).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return <Card style={{marginBottom:16,border:"1px solid rgba(45,212,191,0.12)",background:"linear-gradient(180deg,rgba(45,212,191,0.02),transparent)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0"}}>{cust.name}</div><div style={{fontSize:12,color:"#737373"}}>{cust.contact} {cust.email?" | "+cust.email:""} {cust.phone?" | "+cust.phone:""}</div></div>
        <div style={{display:"flex",gap:8}}><Btn v="ghost" style={{fontSize:12}} onClick={()=>{window._viewCustId=cust.id;setPage("customer360")}}>Full Profile</Btn><Btn v="secondary" style={{fontSize:12}} onClick={()=>setCustDetail(null)}>Close</Btn></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12,marginBottom:16}}>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalSpend)}</div><div style={{fontSize:10,color:"#737373"}}>Lifetime Spend</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{cJobs.length}</div><div style={{fontSize:10,color:"#737373"}}>Total Jobs</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:avgMargin>=30?"#34d399":avgMargin>=20?"#fbbf24":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{avgMargin.toFixed(1)}%</div><div style={{fontSize:10,color:"#737373"}}>Avg Margin</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{activeJobs}</div><div style={{fontSize:10,color:"#737373"}}>Active</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{paidJobs}/{cJobs.filter(j=>j.phase!=="Quoting").length||1}</div><div style={{fontSize:10,color:"#737373"}}>Paid</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{totalItems}</div><div style={{fontSize:10,color:"#737373"}}>Line Items</div></div>
      </div>
      {cJobs.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Jobs</div>{cJobs.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{const f=getJobFinancials(j.id);return <div key={j.id} onClick={()=>{window._viewCustId=cust.id;setPage("jobs");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#0a0a0a",borderRadius:8,marginBottom:4,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#111"} onMouseLeave={e=>e.currentTarget.style.background="#0a0a0a"}><div><span style={{fontSize:12,fontWeight:600,color:"#e5e5e5"}}>{j.name}</span><span style={{fontSize:11,color:"#525252",marginLeft:8}}>{j.createdDate}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><Badge label={j.phase} color={statusColor(j.phase)}/><span style={{fontSize:12,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span></div></div>})}</div>}
      {topV.length>0&&<div><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Top Vendors</div>{topV.map(([n,s])=><div key={n} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}><span style={{color:"#c4c4c4"}}>{n}</span><span style={{color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt(s)}</span></div>)}</div>}
      {totalOrdered>0&&<div style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#737373",marginBottom:3}}><span>Delivery Progress</span><span>{totalReceived}/{totalOrdered} units</span></div><div style={{height:6,background:"#111",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(totalReceived/totalOrdered*100)+"%",background:"linear-gradient(90deg,#2dd4bf,#34d399)",borderRadius:3}}/></div></div>}
    </Card>
  };


  // Inline vendor analytics panel -- mirrors CustAnalytics structure but scoped
  // to line items where i.vendor === vend.id. "Spend" here is OUR cost (unitCost*qtyOrdered).
  const VendorAnalytics=({vend})=>{
    const vItems=lineItems.filter(i=>i.vendor===vend.id);
    const jobIdSet=new Set(vItems.map(i=>i.jobId));
    const vJobs=jobs.filter(j=>jobIdSet.has(j.id));
    const totalSpend=vItems.reduce((s,i)=>s+(i.unitCost||0)*(i.qtyOrdered||0),0);
    const totalRevenue=vItems.reduce((s,i)=>s+(i.unitPrice||0)*(i.qtyOrdered||0),0);
    const avgMargin=totalRevenue>0?(1-totalSpend/totalRevenue)*100:0;
    const totalItems=vItems.length;
    const totalOrdered=vItems.reduce((s,i)=>s+(i.qtyOrdered||0),0);
    const totalReceived=vItems.reduce((s,i)=>s+(i.qtyReceived||0),0);
    const paidJobs=vJobs.filter(j=>j.paymentStatus==="paid").length;
    const activeJobs=vJobs.filter(j=>j.phase!=="Complete"&&j.phase!=="Quoting").length;
    // Customer breakdown -- top customers by our cost spend on this vendor's items
    const cSpend={};
    vItems.forEach(i=>{const j=jobs.find(jj=>jj.id===i.jobId);if(!j)return;const c=customers.find(cc=>cc.id===j.customer);if(c)cSpend[c.name]=(cSpend[c.name]||0)+(i.unitCost||0)*(i.qtyOrdered||0)});
    const topC=Object.entries(cSpend).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return <Card style={{marginBottom:16,border:"1px solid rgba(45,212,191,0.12)",background:"linear-gradient(180deg,rgba(45,212,191,0.02),transparent)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0"}}>{vend.name}</div><div style={{fontSize:12,color:"#737373"}}>{vend.contact} {vend.email?" | "+vend.email:""} {vend.phone?" | "+vend.phone:""}{vend.category?" | "+vend.category:""}</div></div>
        <div style={{display:"flex",gap:8}}><Btn v="ghost" style={{fontSize:12}} onClick={()=>{window._viewVendorId=vend.id;setPage("vendor360")}}>Full Profile</Btn><Btn v="secondary" style={{fontSize:12}} onClick={()=>setVendorDetail(null)}>Close</Btn></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12,marginBottom:16}}>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalSpend)}</div><div style={{fontSize:10,color:"#737373"}}>Lifetime Spend</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{vJobs.length}</div><div style={{fontSize:10,color:"#737373"}}>Total Jobs</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:avgMargin>=30?"#34d399":avgMargin>=20?"#fbbf24":"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{avgMargin.toFixed(1)}%</div><div style={{fontSize:10,color:"#737373"}}>Avg Margin</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{activeJobs}</div><div style={{fontSize:10,color:"#737373"}}>Active</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{paidJobs}/{vJobs.filter(j=>j.phase!=="Quoting").length||1}</div><div style={{fontSize:10,color:"#737373"}}>Paid</div></div>
        <div style={{textAlign:"center",padding:12,background:"#0a0a0a",borderRadius:10}}><div style={{fontSize:20,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{totalItems}</div><div style={{fontSize:10,color:"#737373"}}>Line Items</div></div>
      </div>
      {vJobs.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Jobs</div>{vJobs.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate)).map(j=>{const f=getJobFinancials(j.id);const jSpend=vItems.filter(i=>i.jobId===j.id).reduce((s,i)=>s+(i.unitCost||0)*(i.qtyOrdered||0),0);return <div key={j.id} onClick={()=>{setPage("jobs")}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#0a0a0a",borderRadius:8,marginBottom:4,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#111"} onMouseLeave={e=>e.currentTarget.style.background="#0a0a0a"}><div><span style={{fontSize:12,fontWeight:600,color:"#e5e5e5"}}>{j.name}</span><span style={{fontSize:11,color:"#525252",marginLeft:8}}>{j.createdDate}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><Badge label={j.phase} color={statusColor(j.phase)}/><span style={{fontSize:12,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(jSpend)}</span></div></div>})}</div>}
      {topC.length>0&&<div><div style={{fontSize:12,fontWeight:600,color:"#a3a3a3",marginBottom:8}}>Top Customers</div>{topC.map(([n,s])=><div key={n} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}><span style={{color:"#c4c4c4"}}>{n}</span><span style={{color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt(s)}</span></div>)}</div>}
      {totalOrdered>0&&<div style={{marginTop:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#737373",marginBottom:3}}><span>Delivery Progress</span><span>{totalReceived}/{totalOrdered} units</span></div><div style={{height:6,background:"#111",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(totalReceived/totalOrdered*100)+"%",background:"linear-gradient(90deg,#2dd4bf,#34d399)",borderRadius:3}}/></div></div>}
    </Card>
  };


  // CSV Upload for vendors/customers/reps
  const csvUploadRef=React.useRef(null);
  const enrichUploadRef=React.useRef(null);
  const [csvPreview,setCsvPreview]=useState(null); // {rows:[{...,_action,_existingId,_changes}], tab, dupeCount, newCount, enrichCount}
  const [enrichLoading,setEnrichLoading]=useState(false);


  // Heuristic field validator -- detects when CSV columns hold the wrong kind of
  // data (e.g. an email in the phone column, an address in the name column) and
  // moves the value to the right field. Run on every parsed row before dedupe.
  const looksLikeEmail=(v)=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const looksLikePhone=(v)=>{if(typeof v!=='string')return false;const digits=v.replace(/\D/g,'');return digits.length>=7&&digits.length<=15&&!looksLikeEmail(v)};
  const looksLikeAddress=(v)=>typeof v==='string'&&v.length>5&&(/\d+\s+\S+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pkwy|parkway|pl|place|hwy|highway|cir|terrace|ter)/i.test(v)||/,\s*[A-Z]{2}\s*\d{5}/.test(v));
  const looksLikePersonName=(v)=>typeof v==='string'&&!looksLikeEmail(v)&&!looksLikePhone(v)&&!looksLikeAddress(v)&&v.trim().split(/\s+/).length>=1&&v.length<60;
  const validateAndFixRow=(row)=>{
    // Build a working copy and normalize string-y values
    const r={...row};
    Object.keys(r).forEach(k=>{if(typeof r[k]==='string')r[k]=r[k].trim()});
    // Pool of all string values for cross-field rescue
    const all=Object.entries(r).filter(([,v])=>typeof v==='string'&&v.length>0);
    // Email field correction
    if(r.email&&!looksLikeEmail(r.email)){
      // Look for an email anywhere else and swap
      const found=all.find(([k,v])=>k!=='email'&&looksLikeEmail(v));
      if(found){const [k,v]=found;const old=r.email;r.email=v;r[k]=old}else{r.email=''}
    }
    // If email blank, look for one in any unstructured field
    if(!r.email){
      const found=all.find(([k,v])=>looksLikeEmail(v)&&k!=='name');
      if(found){r.email=found[1];r[found[0]]=''}
    }
    // Phone field correction
    if(r.phone&&!looksLikePhone(r.phone)){
      const found=all.find(([k,v])=>k!=='phone'&&looksLikePhone(v)&&!looksLikeEmail(v));
      if(found){const [k,v]=found;const old=r.phone;r.phone=v;r[k]=old}else{r.phone=''}
    }
    if(!r.phone){
      const found=all.find(([k,v])=>looksLikePhone(v)&&!looksLikeEmail(v)&&k!=='name'&&k!=='address');
      if(found){r.phone=found[1];r[found[0]]=''}
    }
    // Address field correction -- be conservative, only swap if address slot looks
    // wrong AND another field clearly contains an address
    if(r.address&&!looksLikeAddress(r.address)&&r.address.length<10){
      const found=all.find(([k,v])=>k!=='address'&&looksLikeAddress(v));
      if(found){const [k,v]=found;const old=r.address;r.address=v;r[k]=old}
    }
    // Name field -- if it looks like an email or address, try to find a real name
    if(r.name&&(looksLikeEmail(r.name)||looksLikeAddress(r.name)||looksLikePhone(r.name))){
      const found=all.find(([k,v])=>k!=='name'&&looksLikePersonName(v)&&v!==r.contact);
      if(found){const [k,v]=found;const old=r.name;r.name=v;r[k]=old}
    }
    return r;
  };


  const handleCsvUpload=async(file)=>{
    if(!file)return;
    try{
      const text=await file.text();
      const sep=text.indexOf('\t')!==-1&&text.split('\t').length>text.split(',').length?'\t':',';
      const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
      if(lines.length<2){notify('CSV must have a header row and at least one data row','error');return}
      const splitRow=(line)=>{if(sep==='\t')return line.split('\t').map(v=>v.trim().replace(/^"|"$/g,''));const vals=[];let cur='';let inQ=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"')inQ=!inQ;else if(c===sep&&!inQ){vals.push(cur.trim().replace(/^"|"$/g,''));cur=''}else cur+=c}vals.push(cur.trim().replace(/^"|"$/g,''));return vals};
      const headers=splitRow(lines[0]).map(h=>h.toLowerCase().replace(/['"]/g,''));
      const rows=lines.slice(1).map(line=>{const vals=splitRow(line);const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||''});return obj});
      ingestParsedRows(rows);
    }catch(e){notify('Error reading CSV: '+e.message,'error')}
    if(csvUploadRef.current)csvUploadRef.current.value='';
    if(enrichUploadRef.current)enrichUploadRef.current.value='';
  };


  // PDF / image directory ingestion via Claude Vision (/api/ai-scan).
  // Sends the file as base64 and asks Claude to extract a JSON array of vendor
  // or customer records with the field categorization we need.
  const handlePdfUpload=async(file)=>{
    if(!file)return;
    setEnrichLoading(true);
    try{
      const b64=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const result=fr.result;const comma=result.indexOf(',');res(comma>=0?result.slice(comma+1):result)};fr.onerror=()=>rej(new Error('Failed to read file'));fr.readAsDataURL(file)});
      const mediaType=file.type||(file.name.toLowerCase().endsWith('.pdf')?'application/pdf':'image/jpeg');
      const tabLabel=tab==='vendors'?'vendors (suppliers, manufacturers, contractors)':tab==='customers'?'customers (schools, districts, organizations)':'sales reps (team members)';
      const fieldList=tab==='vendors'?'name (company), contact (person), email, phone, category (e.g. Furniture, Seating, AV), address':tab==='customers'?'name (organization), contact (person), email, phone, type (K-12 District, University, Government, Private, Non-Profit), address':'name, email, territory, tier (Associate, Mid-Level, Senior), commissionRate (decimal, e.g. 0.05 for 5%)';
      const extra='You are extracting '+tabLabel+' records from this document for a furniture dealer business directory. Read carefully and return a JSON object with one key "records" containing an array. Each record must have these fields: '+fieldList+'. Be very strict about field categorization: emails contain @, phones are digit sequences, addresses contain a street number plus street type, names are organization or person names. Never put an email in the phone field, never put a phone in the address field, never put an address in the name field. If a field is not present, return an empty string for it. Skip rows that are headers, totals, or non-record rows. Return ONLY the JSON object, no markdown, no commentary.';
      const r=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data:b64,media_type:mediaType,scan_type:'directory_extract',extra_context:extra})});
      const resp=await r.json();
      if(!r.ok||resp.error){notify('AI extraction failed: '+(resp.error||'unknown error'),'error');setEnrichLoading(false);if(enrichUploadRef.current)enrichUploadRef.current.value='';return}
      const text=(resp.content||[])[0]?.text||'';
      const clean=text.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
      let aiData;try{aiData=JSON.parse(clean)}catch{notify('AI returned unparseable response','error');setEnrichLoading(false);if(enrichUploadRef.current)enrichUploadRef.current.value='';return}
      const rec=aiData.records||aiData.rows||aiData.items||[];
      if(!Array.isArray(rec)||rec.length===0){notify('No records found in document','error');setEnrichLoading(false);if(enrichUploadRef.current)enrichUploadRef.current.value='';return}
      ingestParsedRows(rec);
    }catch(e){notify('Error processing file: '+e.message,'error')}
    setEnrichLoading(false);
    if(enrichUploadRef.current)enrichUploadRef.current.value='';
  };


  // Common ingestion path -- runs validation, dedupe, and enrichment-vs-new
  // classification on a parsed array of rows from either CSV or PDF.
  const ingestParsedRows=(rows)=>{
    let previewRows=[];let newCount=0;let enrichCount=0;
    if(tab==='vendors'){
      rows.forEach(r=>{
        const fixed=validateAndFixRow({name:r.name||r.company||r.vendor||r['company name']||r['vendor name']||'',contact:r.contact||r['contact person']||r['contact name']||'',email:r.email||'',phone:r.phone||r.telephone||'',category:r.category||r.type||'',address:r.address||[r.street,r.city,r.state,r.zip].filter(Boolean).join(', ')||'',discountRate:parseFloat(r['discount rate']||r.discount||'0')/100||0});
        if(!fixed.name)return;
        const existing=vendors.find(v=>v.name.toLowerCase()===fixed.name.toLowerCase());
        if(existing){
          // Compute which fields would be enriched (only fill in empty existing ones)
          const changes={};
          ['contact','email','phone','category','address'].forEach(f=>{if(!existing[f]&&fixed[f])changes[f]=fixed[f]});
          if(fixed.discountRate&&!existing.discountRate)changes.discountRate=fixed.discountRate;
          if(Object.keys(changes).length===0)return; // nothing to add
          previewRows.push({_include:true,_action:'enrich',_existingId:existing.id,_changes:changes,...fixed});
          enrichCount++;
        }else{
          previewRows.push({_include:true,_action:'new',...fixed});
          newCount++;
        }
      });
    }else if(tab==='customers'){
      rows.forEach(r=>{
        const fixed=validateAndFixRow({name:r.name||r.company||r.customer||r['organization']||r['company name']||r['customer name']||r['school']||r['school name']||r['district']||'',contact:r.contact||r['contact person']||r['contact name']||'',email:r.email||'',phone:r.phone||r.telephone||'',type:r.type||r.category||'K-12 District',address:r.address||[r.street,r.city,r.state,r.zip].filter(Boolean).join(', ')||''});
        if(!fixed.name)return;
        const existing=customers.find(c=>c.name.toLowerCase()===fixed.name.toLowerCase());
        if(existing){
          const changes={};
          ['contact','email','phone','type','address'].forEach(f=>{if(!existing[f]&&fixed[f])changes[f]=fixed[f]});
          if(Object.keys(changes).length===0)return;
          previewRows.push({_include:true,_action:'enrich',_existingId:existing.id,_changes:changes,...fixed});
          enrichCount++;
        }else{
          previewRows.push({_include:true,_action:'new',...fixed});
          newCount++;
        }
      });
    }else if(tab==='reps'){
      rows.forEach(r=>{
        const fixed=validateAndFixRow({name:r.name||r['rep name']||r['sales rep']||r['full name']||'',email:r.email||'',territory:r.territory||r.region||r.area||'',commissionRate:parseFloat(r['commission rate']||r.commission||r.rate||'5')/100||0.05,tier:r.tier||r.level||'Associate'});
        if(!fixed.name)return;
        const existing=reps.find(rep=>rep.name.toLowerCase()===fixed.name.toLowerCase());
        if(existing){
          const changes={};
          ['email','territory','tier'].forEach(f=>{if(!existing[f]&&fixed[f])changes[f]=fixed[f]});
          if(fixed.commissionRate&&!existing.commissionRate)changes.commissionRate=fixed.commissionRate;
          if(Object.keys(changes).length===0)return;
          previewRows.push({_include:true,_action:'enrich',_existingId:existing.id,_changes:changes,...fixed});
          enrichCount++;
        }else{
          previewRows.push({_include:true,_action:'new',...fixed});
          newCount++;
        }
      });
    }
    if(previewRows.length===0){notify('No new or enrichable records found','error');return}
    setCsvPreview({rows:previewRows,tab,newCount,enrichCount,dupeCount:0});
    notify(previewRows.length+' records ready: '+newCount+' new, '+enrichCount+' enrichments');
  };


  const csvPreviewUpdate=(idx,field,value)=>{setCsvPreview(prev=>{if(!prev)return prev;const rows=[...prev.rows];rows[idx]={...rows[idx],[field]:value};return{...prev,rows}})};
  const csvPreviewToggle=(idx)=>{setCsvPreview(prev=>{if(!prev)return prev;const rows=[...prev.rows];rows[idx]={...rows[idx],_include:!rows[idx]._include};return{...prev,rows}})};
  const csvPreviewConfirm=()=>{
    if(!csvPreview)return;
    const selected=csvPreview.rows.filter(r=>r._include);
    let newCount=0;let enrichCount=0;
    if(csvPreview.tab==='vendors'){selected.forEach(r=>{const {_include,_action,_existingId,_changes,...data}=r;if(_action==='enrich'&&_existingId){updateVendor(_existingId,_changes||{});enrichCount++}else{addVendor(data);newCount++}})}
    else if(csvPreview.tab==='customers'){selected.forEach(r=>{const {_include,_action,_existingId,_changes,...data}=r;if(_action==='enrich'&&_existingId){updateCustomer(_existingId,_changes||{});enrichCount++}else{addCustomer(data);newCount++}})}
    else if(csvPreview.tab==='reps'){selected.forEach(r=>{const {_include,_action,_existingId,_changes,...data}=r;if(_action==='enrich'&&_existingId){updateRep(_existingId,_changes||{});enrichCount++}else{addRep({...data,commissionRate:parseFloat(data.commissionRate)||0.05});newCount++}})}
    const label=csvPreview.tab==='vendors'?'vendors':csvPreview.tab==='customers'?'customers':'sales reps';
    const parts=[];if(newCount>0)parts.push(newCount+' new');if(enrichCount>0)parts.push(enrichCount+' enriched');
    notify(parts.join(', ')+' '+label+' saved');
    setCsvPreview(null);
  };


  // CSV Export -- download the current tab's list as a .csv file
  const exportCsv=()=>{
    const data=tab==='vendors'?vendors:tab==='customers'?customers:reps;
    if(!data||data.length===0){notify('Nothing to export','error');return}
    const cols=tab==='vendors'?['name','contact','email','phone','category','address','discountRate']:tab==='customers'?['name','contact','email','phone','type','address']:['name','email','territory','tier','commissionRate'];
    const escape=(v)=>{if(v===undefined||v===null)return '';const s=String(v);if(s.includes(',')||s.includes('"')||s.includes('\n'))return '"'+s.replace(/"/g,'""')+'"';return s};
    const lines=[cols.join(',')];
    data.forEach(r=>{lines.push(cols.map(c=>escape(r[c])).join(','))});
    const csv=lines.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url;a.download='midwest-'+tab+'-'+stamp+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Exported '+data.length+' '+tab+' to CSV');
  };


  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Directory" sub="Manage all vendors, customers, and team members -- edit, add, sort" action={<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <input ref={csvUploadRef} type="file" accept=".csv,.tsv" onChange={e=>{if(e.target.files[0])handleCsvUpload(e.target.files[0])}} style={{display:"none"}}/>
      <input ref={enrichUploadRef} type="file" accept=".csv,.tsv,.pdf,image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const ext=f.name.toLowerCase().split('.').pop();if(ext==='csv'||ext==='tsv')handleCsvUpload(f);else handlePdfUpload(f)}} style={{display:"none"}}/>
      <Btn v="secondary" onClick={()=>csvUploadRef.current?.click()}><I n="upload" s={14}/> Upload CSV</Btn>
      <Btn v="secondary" onClick={()=>enrichUploadRef.current?.click()} disabled={enrichLoading}><I n="brain" s={14}/> {enrichLoading?'Reading...':'Enrich (CSV/PDF)'}</Btn>
      <Btn v="secondary" onClick={exportCsv}><I n="download" s={14}/> Export CSV</Btn>
      <Btn onClick={startAdd}><I n="plus" s={14}/> Add {tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Team Member"}</Btn>
    </div>}/>
    <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:"#111111",padding:4,borderRadius:10}}>{[["vendors","Vendors ("+vendors.length+")"],["customers","Customers ("+customers.length+")"],["reps","Team ("+reps.length+")"]].map(([id,label])=><button key={id} onClick={()=>{setTab(id);setEditId(null);setAdding(false);setSort("name");setDirSearch("");setSelected(new Set());setCustDetail(null);setVendorDetail(null)}} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===id?"#2dd4bf":"transparent",color:tab===id?"#000000":"#525252",fontSize:13,fontWeight:tab===id?600:400,fontFamily:"inherit"}}>{label}</button>)}</div>
      <input value={dirSearch} onChange={e=>setDirSearch(e.target.value)} placeholder={"Search "+tab+"..."} style={{...inputStyle,maxWidth:260,background:"#111111",border:"1px solid #222222",padding:"8px 14px"}}/>
    </div>


    {/* Bulk action bar */}
    {selected.size>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"rgba(45,212,191,0.06)",border:"1px solid rgba(45,212,191,0.15)",borderRadius:10,marginBottom:16,flexWrap:"wrap"}}>
      <span style={{fontSize:13,fontWeight:600,color:"#2dd4bf"}}>{selected.size} selected</span>
      <Btn v="danger" style={{fontSize:12,padding:"5px 12px"}} onClick={handleBulkDelete}><I n="close" s={12}/> Delete Selected</Btn>
      {tab==="customers"&&<Btn v="ghost" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setBulkAction(bulkAction?"":("type"))}>Set Type</Btn>}
      {tab==="vendors"&&<Btn v="ghost" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setBulkAction(bulkAction?"":"category")}>Set Category</Btn>}
      <Btn v="secondary" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setSelected(new Set())}>Clear Selection</Btn>
      {bulkAction==="type"&&<div style={{display:"flex",gap:8,alignItems:"center"}}><select onChange={e=>{if(e.target.value)handleBulkEdit("type",e.target.value)}} style={{...inputStyle,width:160,padding:"5px 10px"}}><option value="">Choose type...</option><option>K-12 District</option><option>University</option><option>Government</option><option>Private</option><option>Non-Profit</option><option>Corporate</option></select></div>}
      {bulkAction==="category"&&<div style={{display:"flex",gap:8,alignItems:"center"}}><select onChange={e=>{if(e.target.value)handleBulkEdit("category",e.target.value)}} style={{...inputStyle,width:180,padding:"5px 10px"}}><option value="">Choose category...</option><option>Classroom Furniture</option><option>Collaborative Tables</option><option>Seating</option><option>Science Lab</option><option>Early Childhood</option><option>AV Equipment</option><option>Storage</option><option>Library</option><option>Cafeteria</option><option>Office</option></select></div>}
    </div>}


    {adding&&<Card style={{marginBottom:16,border:"1px solid #2dd4bf30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#2dd4bf"}}>Add New {tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Team Member"}</div>
      {tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1fr",gap:12,marginBottom:12}}>{field("name","Company Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("category","Category")}</div>}{tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Address</label><input value={form.address||""} onChange={e=>setForm(prev=>({...prev,address:e.target.value}))} placeholder="Full address..." style={{...inputStyle,width:"100%"}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Rate (%)</label><input type="number" step="1" value={((form.discountRate||0)*100).toFixed(0)} onChange={e=>setForm(prev=>({...prev,discountRate:parseFloat(e.target.value)/100||0}))} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Method</label><select value={form.discountType||"percentage"} onChange={e=>setForm(prev=>({...prev,discountType:e.target.value}))} style={inputStyle}><option value="percentage">Straight %</option><option value="reciprocal">Reciprocal (e.g. 50/10/5)</option></select></div></div>}{tab==="vendors"&&form.discountType==="reciprocal"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Reciprocal Tiers (e.g. 50/10/5)</label><input value={form.reciprocalTiers||""} onChange={e=>{const tiers=e.target.value;const parts=tiers.split("/").map(s=>parseFloat(s.trim())/100).filter(n=>!isNaN(n)&&n>0);const compound=parts.length>0?1-parts.reduce((acc,p)=>acc*(1-p),1):0;setForm(prev=>({...prev,reciprocalTiers:tiers,discountRate:compound}))}} placeholder="50/10/5" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Effective Rate</label><div style={{padding:"8px 12px",background:"#0a0a0a",borderRadius:6,border:"1px solid #222",fontSize:14,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{((form.discountRate||0)*100).toFixed(2)}%</div></div></div>}{tab==="vendors"&&<div style={{marginBottom:12}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Notes</label><textarea value={form.discountNotes||""} onChange={e=>setForm(prev=>({...prev,discountNotes:e.target.value}))} placeholder="Volume thresholds, freight terms..." rows={3} style={{...inputStyle,resize:"vertical",minHeight:60,width:"100%"}}/></div>}
      {tab==="customers"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1fr",gap:12,marginBottom:12}}>{field("name","Organization Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("type","Type")}</div>}{tab==="customers"&&<div style={{marginBottom:12}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Address</label><input value={form.address||""} onChange={e=>setForm(prev=>({...prev,address:e.target.value}))} placeholder="Full address..." style={{...inputStyle,width:"100%"}}/></div>}
      {tab==="reps"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}>{field("name","Name")}{field("email","Email")}{field("territory","Territory")}<div style={{gridColumn:"span 2"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Role (select one or more)</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Owner","Sales","Office"].map(role=>{const on=Array.isArray(form.roles)&&form.roles.includes(role);return <button type="button" key={role} onClick={()=>{const current=Array.isArray(form.roles)?form.roles:[];const next=on?current.filter(r=>r!==role):[...current,role];setForm(prev=>({...prev,roles:next}))}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(on?"#2dd4bf":"rgba(255,255,255,0.08)"),background:on?"rgba(45,212,191,0.1)":"transparent",color:on?"#2dd4bf":"#737373",fontSize:12,fontWeight:on?600:400,cursor:"pointer",fontFamily:"inherit"}}>{role}</button>})}</div></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Commission Rate (%)</label><input type="number" step="0.5" value={((form.commissionRate||0)*100).toFixed(1)} onChange={e=>setForm(prev=>({...prev,commissionRate:parseFloat(e.target.value)/100||0}))} style={inputStyle}/></div></div>}
      <div style={{display:"flex",gap:8}}><Btn onClick={save}>Add</Btn><Btn v="secondary" onClick={cancel}>Cancel</Btn></div>
    </Card>}


    {/* Import & Enrichment Preview */}
    {csvPreview&&<Card style={{marginBottom:20,border:"1px solid rgba(45,212,191,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:800,color:"#2dd4bf"}}>Import & Enrichment Preview</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn v="secondary" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>setCsvPreview(null)}>Cancel</Btn>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:16}}>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>New Records</div><div style={{fontSize:22,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{csvPreview.rows.filter(r=>r._include&&r._action!=='enrich').length}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Enrichments</div><div style={{fontSize:22,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{csvPreview.rows.filter(r=>r._include&&r._action==='enrich').length}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total Parsed</div><div style={{fontSize:22,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{csvPreview.rows.length}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Type</div><div style={{fontSize:16,fontWeight:700,color:"#e5e5e5"}}>{csvPreview.tab==='vendors'?'Vendors':csvPreview.tab==='customers'?'Customers':'Sales Reps'}</div></div>
      </div>
      <div style={{overflowX:"auto",maxHeight:360,borderRadius:8,border:"1px solid rgba(255,255,255,0.04)",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:csvPreview.tab==='reps'?500:700}}>
          <thead><tr style={{background:"#0a0a0a",position:"sticky",top:0}}>
            <th style={{padding:"5px 6px",width:32}}/>
            <th style={{padding:"5px 6px",width:80,textAlign:"left",fontWeight:600,color:"#525252",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>Action</th>
            {csvPreview.tab==='vendors'&&["Name","Contact","Email","Phone","Category","Address","Discount %"].map(h=><th key={h} style={{padding:"5px 6px",textAlign:"left",fontWeight:600,color:"#525252",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}
            {csvPreview.tab==='customers'&&["Name","Contact","Email","Phone","Type","Address"].map(h=><th key={h} style={{padding:"5px 6px",textAlign:"left",fontWeight:600,color:"#525252",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}
            {csvPreview.tab==='reps'&&["Name","Email","Territory","Tier","Rate %"].map(h=><th key={h} style={{padding:"5px 6px",textAlign:"left",fontWeight:600,color:"#525252",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}
          </tr></thead>
          <tbody>{csvPreview.rows.map((r,idx)=><tr key={idx} style={{borderBottom:"1px solid rgba(255,255,255,0.02)",opacity:r._include?1:0.35,transition:"opacity 0.15s",background:r._action==='enrich'?"rgba(251,191,36,0.04)":"transparent"}}>
            <td style={{padding:"4px 6px",textAlign:"center"}}><input type="checkbox" checked={r._include} onChange={()=>csvPreviewToggle(idx)} style={{accentColor:"#2dd4bf",cursor:"pointer"}}/></td>
            <td style={{padding:"4px 6px"}}><span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:r._action==='enrich'?"rgba(251,191,36,0.15)":"rgba(45,212,191,0.15)",color:r._action==='enrich'?"#fbbf24":"#2dd4bf",textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}} title={r._action==='enrich'&&r._changes?'Will fill empty fields: '+Object.keys(r._changes).join(', '):'New record'}>{r._action==='enrich'?'enrich':'new'}</span></td>
            {csvPreview.tab==='vendors'&&<>
              <td style={{padding:"4px 6px"}}><input value={r.name} onChange={e=>csvPreviewUpdate(idx,'name',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#e5e5e5",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.contact} onChange={e=>csvPreviewUpdate(idx,'contact',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#9a9a9a",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.email} onChange={e=>csvPreviewUpdate(idx,'email',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#2dd4bf",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.phone} onChange={e=>csvPreviewUpdate(idx,'phone',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#9a9a9a",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.category} onChange={e=>csvPreviewUpdate(idx,'category',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#a78bfa",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.address} onChange={e=>csvPreviewUpdate(idx,'address',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#737373",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px",fontFamily:"'JetBrains Mono',monospace"}}><input value={((r.discountRate||0)*100).toFixed(0)} onChange={e=>csvPreviewUpdate(idx,'discountRate',parseFloat(e.target.value)/100||0)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#34d399",fontSize:11,width:50,fontFamily:"'JetBrains Mono',monospace",textAlign:"right",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
            </>}
            {csvPreview.tab==='customers'&&<>
              <td style={{padding:"4px 6px"}}><input value={r.name} onChange={e=>csvPreviewUpdate(idx,'name',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#e5e5e5",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.contact} onChange={e=>csvPreviewUpdate(idx,'contact',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#9a9a9a",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.email} onChange={e=>csvPreviewUpdate(idx,'email',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#2dd4bf",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.phone} onChange={e=>csvPreviewUpdate(idx,'phone',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#9a9a9a",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><select value={r.type||'K-12 District'} onChange={e=>csvPreviewUpdate(idx,'type',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#a78bfa",fontSize:11,fontFamily:"inherit",outline:"none",cursor:"pointer"}}><option style={{background:"#111"}} value="K-12 District">K-12 District</option><option style={{background:"#111"}} value="Private School">Private School</option><option style={{background:"#111"}} value="University">University</option><option style={{background:"#111"}} value="Government">Government</option><option style={{background:"#111"}} value="Corporate">Corporate</option><option style={{background:"#111"}} value="Other">Other</option></select></td>
              <td style={{padding:"4px 6px"}}><input value={r.address} onChange={e=>csvPreviewUpdate(idx,'address',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#737373",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
            </>}
            {csvPreview.tab==='reps'&&<>
              <td style={{padding:"4px 6px"}}><input value={r.name} onChange={e=>csvPreviewUpdate(idx,'name',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#e5e5e5",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.email} onChange={e=>csvPreviewUpdate(idx,'email',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#2dd4bf",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><input value={r.territory} onChange={e=>csvPreviewUpdate(idx,'territory',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#9a9a9a",fontSize:11,width:"100%",fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
              <td style={{padding:"4px 6px"}}><select value={r.tier||'Associate'} onChange={e=>csvPreviewUpdate(idx,'tier',e.target.value)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#a78bfa",fontSize:11,fontFamily:"inherit",outline:"none",cursor:"pointer"}}><option style={{background:"#111"}} value="Owner">Owner</option><option style={{background:"#111"}} value="Sales Development Manager">Sales Development Manager</option><option style={{background:"#111"}} value="Regional Sales Manager">Regional Sales Manager</option><option style={{background:"#111"}} value="Administrative Support">Administrative Support</option><option style={{background:"#111"}} value="Associate">Associate</option></select></td>
              <td style={{padding:"4px 6px",fontFamily:"'JetBrains Mono',monospace"}}><input value={((r.commissionRate||0)*100).toFixed(1)} onChange={e=>csvPreviewUpdate(idx,'commissionRate',parseFloat(e.target.value)/100||0)} style={{background:"transparent",border:"1px solid transparent",borderRadius:4,padding:"2px 4px",color:"#34d399",fontSize:11,width:50,fontFamily:"'JetBrains Mono',monospace",textAlign:"right",outline:"none"}} onFocus={e=>e.target.style.borderColor='rgba(45,212,191,0.3)'} onBlur={e=>e.target.style.borderColor='transparent'}/></td>
            </>}
          </tr>)}</tbody>
        </table>
      </div>
      <Btn onClick={csvPreviewConfirm} style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14}}>
        {(()=>{const sel=csvPreview.rows.filter(r=>r._include);const newC=sel.filter(r=>r._action!=='enrich').length;const enC=sel.filter(r=>r._action==='enrich').length;const lbl=csvPreview.tab==='vendors'?'Vendors':csvPreview.tab==='customers'?'Customers':'Sales Reps';if(newC>0&&enC>0)return 'Save '+newC+' new + '+enC+' enriched '+lbl;if(enC>0)return 'Enrich '+enC+' '+lbl;return 'Import '+newC+' '+lbl})()}
      </Btn>
    </Card>}


    {/* Customer analytics panel */}
    {custDetail&&tab==="customers"&&<CustAnalytics cust={custDetail}/>}


    {/* Vendor analytics panel */}
    {vendorDetail&&tab==="vendors"&&<VendorAnalytics vend={vendorDetail}/>}


    {/* Sort + Select All */}
    <div style={{marginBottom:8,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={selectAll}>{selected.size>0&&selected.size<filteredList.length?<CheckMinus checked={true} onChange={selectAll}/>:<Check checked={selected.size===filteredList.length&&filteredList.length>0} onChange={selectAll}/>}<span style={{fontSize:12,color:selected.size>0?"#2dd4bf":"#737373",fontWeight:selected.size>0?600:400}}>{selected.size>0?selected.size+" of "+filteredList.length+" selected":"Select All"}</span></div>
      <div style={{width:1,height:16,background:"rgba(255,255,255,0.06)"}}/>
      <span style={{fontSize:12,color:"#a3a3a3"}}>Sort by:</span>
      {(tab==="vendors"?["name","category","contact"]:tab==="customers"?["name","type","contact"]:["name","territory","tier"]).map(s=><button key={s} onClick={()=>setSort(s)} style={{fontSize:12,padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sort===s?"#2dd4bf22":"transparent",color:sort===s?"#2dd4bf":"#525252",fontFamily:"inherit"}}>{s}</button>)}
    </div>


    {/* Inline edit form renderer */}
    {(()=>{
      const inlineForm=<tr><td colSpan={99} style={{padding:0,border:"none"}}><div style={{padding:"16px 12px",background:"#0a0a0a",borderTop:"1px solid #2dd4bf30",borderBottom:"1px solid #2dd4bf30",animation:"fadeUp 0.25s ease-out"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2dd4bf",marginBottom:10}}>Edit {tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Sales Rep"}</div>
        {tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1fr",gap:10,marginBottom:10}}>{field("name","Company Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("category","Category")}</div>}{tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Address</label><input value={form.address||""} onChange={e=>setForm(prev=>({...prev,address:e.target.value}))} placeholder="Full address..." style={{...inputStyle,width:"100%"}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Rate (%)</label><input type="number" step="1" value={((form.discountRate||0)*100).toFixed(0)} onChange={e=>setForm(prev=>({...prev,discountRate:parseFloat(e.target.value)/100||0}))} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Method</label><select value={form.discountType||"percentage"} onChange={e=>setForm(prev=>({...prev,discountType:e.target.value}))} style={inputStyle}><option value="percentage">Straight %</option><option value="reciprocal">Reciprocal (e.g. 50/10/5)</option></select></div></div>}{tab==="vendors"&&form.discountType==="reciprocal"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Reciprocal Tiers (e.g. 50/10/5)</label><input value={form.reciprocalTiers||""} onChange={e=>{const tiers=e.target.value;const parts=tiers.split("/").map(s=>parseFloat(s.trim())/100).filter(n=>!isNaN(n)&&n>0);const compound=parts.length>0?1-parts.reduce((acc,p)=>acc*(1-p),1):0;setForm(prev=>({...prev,reciprocalTiers:tiers,discountRate:compound}))}} placeholder="50/10/5" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Effective Rate</label><div style={{padding:"6px 10px",background:"#0a0a0a",borderRadius:6,border:"1px solid #222",fontSize:13,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{((form.discountRate||0)*100).toFixed(2)}%</div></div></div>}{tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Discount Notes</label><textarea value={form.discountNotes||""} onChange={e=>setForm(prev=>({...prev,discountNotes:e.target.value}))} placeholder="Volume thresholds, freight terms..." rows={2} style={{...inputStyle,resize:"vertical",minHeight:40,width:"100%"}}/></div></div>}
        {tab==="customers"&&<div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 2fr 1fr 1fr",gap:10,marginBottom:10}}>{field("name","Organization Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("type","Type")}</div>}{tab==="customers"&&<div style={{marginBottom:10}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Address</label><input value={form.address||""} onChange={e=>setForm(prev=>({...prev,address:e.target.value}))} placeholder="Full address..." style={{...inputStyle,width:"100%"}}/></div>}
        {tab==="reps"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:10}}>{field("name","Name")}{field("email","Email")}{field("territory","Territory")}<div style={{gridColumn:"span 2"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Role (select one or more)</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Owner","Sales","Office"].map(role=>{const on=Array.isArray(form.roles)&&form.roles.includes(role);return <button type="button" key={role} onClick={()=>{const current=Array.isArray(form.roles)?form.roles:[];const next=on?current.filter(r=>r!==role):[...current,role];setForm(prev=>({...prev,roles:next}))}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(on?"#2dd4bf":"rgba(255,255,255,0.08)"),background:on?"rgba(45,212,191,0.1)":"transparent",color:on?"#2dd4bf":"#737373",fontSize:12,fontWeight:on?600:400,cursor:"pointer",fontFamily:"inherit"}}>{role}</button>})}</div></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Commission Rate (%)</label><input type="number" step="0.5" value={((form.commissionRate||0)*100).toFixed(1)} onChange={e=>setForm(prev=>({...prev,commissionRate:parseFloat(e.target.value)/100||0}))} style={inputStyle}/></div></div>}
        <div style={{display:"flex",gap:8}}><Btn onClick={save}>Save Changes</Btn><Btn v="secondary" onClick={cancel}>Cancel</Btn><Btn v="danger" onClick={()=>del(editId)}>Delete</Btn></div>
      </div></td></tr>;


      const vCols=["","Name","Contact","Email","Phone","Category","Address","Discount",""];
      const cCols=["","Name","Contact","Email","Phone","Type","Address",""];
      const rCols=["","Name","Email","Territory","Role","Rate",""];
      const headers=tab==="vendors"?vCols:tab==="customers"?cCols:rCols;


      return <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{headers.map((h,i)=><th key={i} style={{padding:"10px 8px",textAlign:"left",fontSize:11,fontWeight:600,color:"#737373",borderBottom:"1px solid #222",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>
        {filteredList.map(r=><React.Fragment key={r.id}>
          <tr style={{transition:"background 0.15s",background:editId===r.id?"#0a0a0a":"transparent"}} onMouseEnter={e=>{if(editId!==r.id)e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{if(editId!==r.id)e.currentTarget.style.background="transparent"}}>
            {tab==="vendors"&&<><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Check checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}/></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><span onClick={e=>{e.stopPropagation();setVendorDetail(vendorDetail?.id===r.id?null:r)}} style={{fontWeight:600,color:"#2dd4bf",cursor:"pointer"}}>{r.name}</span></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.contact}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#2dd4bf"}}>{r.email}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.phone}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.category}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",fontSize:11,color:"#737373",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis"}}>{r.address||"--"}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",fontFamily:"'JetBrains Mono',monospace",color:"#34d399",fontWeight:600}}>{r.discountRate?((r.discountType==="reciprocal"&&r.reciprocalTiers)?r.reciprocalTiers:((r.discountRate*100).toFixed(0)+"%")):"--"}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Btn v="ghost" style={{fontSize:12,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>{editId===r.id?"Close":"Edit"}</Btn></td></>}
            {tab==="customers"&&<><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Check checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}/></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><span onClick={e=>{e.stopPropagation();setCustDetail(custDetail?.id===r.id?null:r)}} style={{fontWeight:600,color:"#2dd4bf",cursor:"pointer"}}>{r.name}</span></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.contact}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#2dd4bf"}}>{r.email}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.phone}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Badge label={r.type||"--"} color="#a78bfa"/></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",fontSize:12,color:"#c4c4c4"}}>{r.address||"--"}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Btn v="ghost" style={{fontSize:12,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>{editId===r.id?"Close":"Edit"}</Btn></td></>}
            {tab==="reps"&&<><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Check checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}/></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",fontWeight:600,color:"#e5e5e5"}}>{r.name}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#2dd4bf"}}>{r.email}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{r.territory}</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{getRoles(r).map(role=><Badge key={role} label={role} color={role==="Owner"?"#fbbf24":role==="Sales"?"#2dd4bf":"#8b5cf6"}/>)}</div></td><td style={{padding:"10px 8px",borderBottom:"1px solid #111",fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{(r.commissionRate*100).toFixed(1)}%</td><td style={{padding:"10px 8px",borderBottom:"1px solid #111"}}><Btn v="ghost" style={{fontSize:12,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>{editId===r.id?"Close":"Edit"}</Btn></td></>}
          </tr>
          {editId===r.id&&inlineForm}
        </React.Fragment>)}
      </tbody></table></div>;
    })()}
  </div>;
}




// ===============================================================
// EXIT READINESS
// ===============================================================
function ExitReadinessPage({jobs,vendors,customers,lineItems}){
  const criteria=[{category:"Operational Documentation",items:[{name:"Job Record Hub",status:true,note:`${jobs.length} jobs in system`},{name:"Vendor database",status:true,note:`${vendors.length} vendors`},{name:"Customer database",status:true,note:`${customers.length} customers`},{name:"Pricing templates",status:true,note:"30-35% district margin"},{name:"Naming conventions",status:true,note:"JOB-YYYY-NNN format"}]},{category:"Automated Workflows",items:[{name:"Quote -> PO generation",status:true,note:"One-click"},{name:"Quote -> Invoice generation",status:true,note:"Partial support"},{name:"Partial shipment tracking",status:true,note:"Quantity-specific"},{name:"Commission auto-calculation",status:true,note:"Real-time"},{name:"Email integration",status:true,note:"Resend live - mwfurnishings.com"}]},{category:"Reporting & Visibility",items:[{name:"Real-time dashboard",status:true,note:"Command Center"},{name:"Financial reporting",status:true,note:"Per-job + aggregate"},{name:"Commission statements",status:true,note:"PDF export"},{name:"Sales portal",status:true,note:"Per-rep filtered"},{name:"Vendor performance",status:"partial",note:"Distribution tracked"}]},{category:"Knowledge Transfer",items:[{name:"Midwest Brain AI",status:true,note:"Queryable"},{name:"Operational playbooks",status:"partial",note:"In progress"},{name:"Workflow diagrams",status:true,note:"Before/after"},{name:"System architecture",status:true,note:"Full stack"},{name:"KPI reporting",status:true,note:"Margins, delivery, commission"}]}];
  const all=criteria.flatMap(c=>c.items);const done=all.filter(i=>i.status===true).length;const partial=all.filter(i=>i.status==="partial").length;const score=(done+partial*0.5)/all.length*100;


  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Exit Readiness Score" sub="Buyer due diligence -- systemized, transferable, auditable"/>
    <Card style={{marginBottom:24,background:"linear-gradient(135deg,#0a0a0a,#111111)",border:"1px solid #2dd4bf30"}}><div style={{display:"flex",alignItems:"center",gap:32}}><div style={{width:120,height:120,borderRadius:"50%",border:"4px solid #2dd4bf",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:28,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(score)}</div><div style={{fontSize:12,color:"#a3a3a3"}}>/ 100</div></div><div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:"#e5e5e5",marginBottom:4}}>Exit Readiness Assessment</div><div style={{fontSize:13,color:"#a3a3a3",marginBottom:12}}>{done} complete - {partial} in progress</div><Bar value={score} max={100} color="#2dd4bf" height={8}/><div style={{marginTop:8,fontSize:12,color:"#2dd4bf"}}>{score>=90?"Excellent -- buyer-ready":score>=70?"Strong -- minor items remaining":"In Progress"}</div></div><div style={{textAlign:"center",padding:"0 24px"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Valuation Impact</div><div style={{fontSize:13,fontWeight:600,color:"#34d399"}}>+1.5-2x multiple uplift</div></div></div></Card>
    <div className="resp-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>{criteria.map((s,si)=><Card key={si}><div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:14}}>{s.category}</div>{s.items.map((item,ii)=><div key={ii} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:ii<s.items.length-1?"1px solid #1e213044":"none"}}><div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:item.status===true?"#34d399":item.status==="partial"?"#fbbf24":"#333333",display:"flex",alignItems:"center",justifyContent:"center"}}>{item.status===true&&<I n="check" s={12}/>}{item.status==="partial"&&<span style={{fontSize:12,fontWeight:700,color:"#fff"}}>~</span>}</div><div style={{flex:1}}><div style={{fontSize:13,color:item.status?"#d4d4d4":"#525252",fontWeight:500}}>{item.name}</div><div style={{fontSize:12,color:"#8a8a8a",marginTop:1}}>{item.note}</div></div></div>)}</Card>)}</div>
    <Card style={{marginTop:20,textAlign:"center",borderTop:"2px solid #2dd4bf"}}><div style={{fontSize:12,color:"#a3a3a3",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Powered by</div><div style={{fontSize:20,fontWeight:800,color:"#2dd4bf",letterSpacing:1}}>DYFRENT</div></Card>
  </div>;
}


export { BrainPage, CommissionsPage, Customer360Page, DirectoryPage, ExitReadinessPage, FilesPage, FinancialsPage, NotesPage, PlaybookPage, ProspectsPage, SalesPortalPage, TasksPage, UserMgmtPage, Vendor360Page };
