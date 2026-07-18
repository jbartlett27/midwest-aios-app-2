import { BrainPage, CommissionsPage, Customer360Page, DirectoryPage, ExitReadinessPage, FilesPage, FinancialsPage, NotesPage, PlaybookPage, ProspectsPage, SalesPortalPage, TasksPage, UserMgmtPage, Vendor360Page } from "./App2.jsx";
import React, { useState, useEffect, useRef } from "react";
import { db } from "./supabase.js";
window._supabase=db;
import { useUser, useClerk, SignIn, UserButton, useAuth } from "@clerk/clerk-react";


const DEFAULT_SOPS=[
    {id:"company-overview",cat:"Company",title:"Company Overview & Mission",icon:"shield",content:"MIDWEST EDUCATIONAL FURNISHINGS, INC.\nFull-service school furniture and equipment for K-12 districts and universities.\n\nMISSION\nTo enhance and improve learning experiences for students of all ages by providing full-service school furniture and equipment solutions that create inspiring, functional, and adaptable learning environments.\n\nWHAT WE DO\n- Design Consultation and Space Planning\n- Budgeting and Product Selection\n- Product Specification from 160 manufacturer partners\n- Project Management from quote to installation\n- Delivery Coordination and Installation Oversight\n\nWHO WE SERVE\nK-12 school districts (primary) and universities across the Midwest and beyond. Facilities directors, superintendents, purchasing managers, and project managers.\n\nTHE BUSINESS MODEL\nMidwest is a purchasing agent. We sit between the manufacturer and the school district. Revenue is generated on the margin between dealer cost (after vendor discount) and customer price. We do not manufacture or warehouse inventory.\n\nSCALE\n14+ years in operation. 160 manufacturer partners. Primarily IL and WI territory with national reach through rep network. Small founder-operated team. Busy season May through September aligned to school calendar."},
    {id:"brand-voice",cat:"Company",title:"Brand Voice & Communication",icon:"send",content:"PERSONALITY\nIf Midwest were a person, they would be the most reliable contractor you have ever worked with. Direct, warm, confident, practical, can-do, professional without being stiff.\n\nVOICE GUIDELINES\n- Say the thing. Get to the point. Lean toward solutions.\n- No corporate filler. No hedging. No apologetic language.\n- Warm but efficient. Friendly but professional.\n\nON BRAND EXAMPLES\n- \"We can get that spec to you by end of day.\"\n- \"Here is what I recommend for that space.\"\n- \"We will figure it out.\"\n\nOFF BRAND EXAMPLES\n- \"We would like to take this opportunity to thank you.\"\n- \"Per our last conversation, please find attached...\"\n- \"I am sorry to bother you but...\"\n\nBRAND PHRASES\n- We will figure it out.\n- A small company that does big things.\n- Things are going to happen. It is how you handle it."},
    {id:"team",cat:"Company",title:"Team Directory & Roles",icon:"users",content:"LEADERSHIP\n- Maureen Welter: Owner and primary operator. Handles all quoting, PO management, invoicing, commission tracking.\n- Dave Welter: Co-owner and key salesperson. Broad territory coverage.\n- Lisa Monchunski: Primary operator and sales support.\n\nSALES REPRESENTATIVES\n- Jim Lindner: Milwaukee, WI territory. Commission rate set in Directory.\n- Jackie Biller: Lake Geneva, WI territory. Commission rate set in Directory.\n- Jim Harris: Arizona-based, sells into IL and Chicago. Commission rate set in Directory.\n- Dave Welter: Broad IL and WI territory.\n\nKEY NOTES\n- Commission rates are managed in the Directory tab under Sales Reps.\n- All team members should have their territory and tier documented.\n- Exit readiness goal: reduce Maureen's weekly hours from 15-20 to under 5."},
    {id:"quote-to-invoice",cat:"Workflow",title:"Quote-to-Invoice Complete Workflow",icon:"receipt",content:"COMPLETE WORKFLOW: QUOTE TO INVOICE\n\n1. VENDOR QUOTE: Manufacturer provides list price. Midwest receives dealer discount off list.\n2. BUILD CUSTOMER QUOTE: Lisa builds Excel spreadsheet with all line items. Upload to AIOS via Data Import.\n3. QUOTE APPROVAL: Go to Documents then Quotes. Generate the quote. Mark as Sent. Customer reviews and approves. Mark as Approved.\n4. PURCHASE ORDERS: Go to Documents then POs. Auto-generated per vendor from approved quote. Mark as Drafted then Sent to vendor.\n5. DELIVERY TRACKING: As items arrive, update received quantities on line items in Job Detail. Partial deliveries are normal.\n6. INVOICING: Go to Documents then Invoices. Auto-generates from received quantities. Supports partial invoicing for items received so far.\n7. PAYMENT TRACKING: Track payment status on each job (unpaid, partial, paid). Set payment terms (Net 30, Net 15, Due Upon Receipt).\n8. COMMISSION CALCULATION: Go to Documents then Commissions. Auto-calculated from job PROFIT (revenue minus cost) multiplied by rep commission rate. Loss-making jobs do not generate negative commissions (profit clamps at zero)."},
    {id:"excel-upload",cat:"Workflow",title:"Excel Quote Upload Process",icon:"download",content:"EXCEL QUOTE UPLOAD SOP\nPURPOSE: Convert Lisa's Excel quote spreadsheets into live jobs in the AIOS with all line items.\n\n1. Navigate to Data Import from the sidebar\n2. Click Choose File and select the .xls or .xlsx file\n3. System automatically parses all sheets and shows a preview\n4. Name the job (auto-detected from the spreadsheet if possible)\n5. Toggle individual sheets on or off if needed\n6. Review the items preview table for accuracy\n7. Click Import to create the job with all line items\n\nWHAT THE PARSER CAPTURES\n- Tag number\n- Manufacturer name\n- Model number\n- Full description\n- Color\n- Quantity ordered\n- List price\n- Net cost (after vendor discount)\n- Shipping per unit\n- Installation per unit\n- Customer price\n\nFILTERED AUTOMATICALLY\n- Freight charges (FRT)\n- Surcharges and tariffs\n- Address rows\n- Subtotals and totals\n- Header rows\n\nAFTER IMPORT\n- New vendors are auto-created in the Directory\n- Job appears in Quoting phase on Job Records\n- All line items are ready for quote generation"},
    {id:"discount-math",cat:"Workflow",title:"Vendor Discount Calculations",icon:"dollar",content:"VENDOR DISCOUNT MATH (VENDRUM MATH)\nEach manufacturer has a specific discount rate off their list price. This is Midwest's dealer cost.\n\nFORMULA\nNet Cost = List Price x (1 - Discount Rate)\n\nEXAMPLE\n- List Price: $1,000\n- Vendor Discount: 45%\n- Net Cost: $1,000 x 0.55 = $550\n\nMARGIN CALCULATION\nMargin = (1 - Net Cost / Customer Price) x 100\n\nEXAMPLE\n- Net Cost: $550\n- Customer Price: $850\n- Margin: (1 - 550/850) x 100 = 35.3%\n\nIN THE AIOS\n- Discount rates are stored per vendor in Directory\n- The Disc % field on line items allows per-item override\n- Edit All mode updates vendor rate and propagates to all items\n- Bidirectional: enter List + Disc to get Net, or enter List + Net to back-calculate Disc"},
    {id:"documents",cat:"Workflow",title:"Document Generation & Management",icon:"file",content:"DOCUMENT MANAGEMENT SOP\nALL DOCUMENTS follow this status lifecycle:\n\n1. New: Document has been generated but not reviewed\n2. Drafted: Document reviewed and ready to send\n3. Sent: Document has been sent to customer or vendor\n4. Approved: Customer has approved (quotes) or vendor has acknowledged (POs)\n\nDOCUMENT TYPES\n- Quotes: Customer-facing price proposals. Generated from job line items.\n- Purchase Orders: Vendor-facing orders. Auto-grouped by vendor from approved quotes.\n- Invoices: Customer billing. Auto-generated from received quantities. Supports partial invoicing.\n- Commission Statements: Rep earning reports. Calculated from job PROFIT (revenue minus cost) times commission rate. The statement PDF shows a Profit column so reps can audit the math.\n\nKEY FEATURES\n- Filter bar (All, Pending, Sent, Approved) persists across sessions\n- All documents exportable as PDF via the preview window\n- Invoice PO number selector lets you attach vendor PO numbers to invoices\n- Print and email functionality available from preview"},
    {id:"delivery",cat:"Workflow",title:"Delivery Tracking Process",icon:"truck",content:"DELIVERY TRACKING SOP\n\n1. Open the job in Job Records and click into Job Detail\n2. Find the line item that was delivered\n3. Click the Receive button next to the item\n4. Enter the quantity received\n5. System auto-stamps today's date as delivery date\n6. Repeat for each item in the shipment\n\nBULK RECEIVING\n- Use the Mark All Complete button on the Delivery Tracker to receive all items for a job at once\n- Only use this when the entire shipment has been verified\n\nPARTIAL DELIVERIES\n- Partial deliveries are standard in this industry\n- Items show partial status with received vs ordered counts\n- Invoice immediately for received items (do not wait for full delivery)\n\nSEASONAL NOTES\n- May through September is the critical delivery window\n- Everything must be installed before school starts in September\n- Confirm delivery dates with vendors 2 weeks before scheduled date\n- Order by May for standard lead time items"},
    {id:"sales-portal",cat:"Workflow",title:"Sales Rep Portal & Job Creation",icon:"users",content:"SALES PORTAL SOP\n\n1. OVERVIEW MODE: Shows all team performance metrics and pipeline summary\n2. Click any rep name to filter to their jobs only\n3. Click any job card to navigate directly to the full Job Detail\n\nCREATING A NEW JOB\n1. Click New Job button in the header\n2. Fill in job name, customer, sales rep\n3. Add payment terms, PO number, ship-to address\n4. Click Create Job Record\n\nADDING A NEW CUSTOMER\n1. Click New Customer button or type a new name in the customer field\n2. Fill in name, contact, email, phone, type, address\n3. Click Add Customer\n4. Customer is immediately available for job assignment\n\nUPLOADING A QUOTE\n- Click Upload Quote button to go directly to Data Import\n- Follow the Excel Upload SOP from there"},
    {id:"commission",cat:"Financial",title:"Commission Calculation & Statements",icon:"dollar",content:"COMMISSION CALCULATION SOP\n\nFORMULA\nCommission = Job Profit x Rep Commission Rate\n\nwhere Job Profit = max(0, Revenue - Cost)\n\nKEY RULES\n- Commission is paid on PROFIT (revenue minus cost), NOT on revenue or gross sales.\n- Profit clamps at zero -- a loss-making job does NOT generate a negative commission claim against the rep.\n- Cost includes everything in the job financials: vendor costs, freight, install, plus any vendor credits or standalone bills that flow through getJobFinancials.\n- Paid jobs = earned commission\n- Unpaid jobs = pending commission\n- Rates are set per rep in Directory under Sales Reps\n\nWHY PROFIT NOT REVENUE\nA rep selling a $100K job at 5% margin should not earn the same commission as a rep selling a $100K job at 35% margin. Profit-based commission aligns the rep's incentive with the company's profitability: bigger discounts to win a deal directly reduce the rep's commission, so reps push for healthy margins.\n\nGENERATING STATEMENTS\n1. Go to Commissions page\n2. Each rep card shows Pipeline (revenue), Earned (paid), Pending, and Total Commission\n3. Click Generate Statement to create a PDF showing per-job Profit and Commission columns\n4. The statement is what reps see -- the Profit column lets them audit the math line by line\n5. Mark statement as Drafted/Sent/Approved as you finalize\n6. Export as PDF for rep records"},
    {id:"payment",cat:"Financial",title:"Payment Tracking & Reminders",icon:"alert",content:"PAYMENT TRACKING SOP\n\nPAYMENT STATUSES\n- Unpaid: Invoice sent, no payment received\n- Partial: Some payment received\n- Paid: Full payment received\n\nPAYMENT TERMS\n- Net 30: Payment due 30 days after invoice\n- Net 15: Payment due 15 days after invoice\n- Due Upon Receipt: Payment due immediately\n\nOVERDUE MANAGEMENT\n1. Dashboard shows overdue invoice alerts automatically\n2. Click Send Reminders to draft follow-up\n3. Log internal reminder notes in the job activity feed\n4. Escalate to phone call after second reminder\n\nBEST PRACTICES\n- Invoice immediately when items are received\n- Do not wait for full delivery to start invoicing\n- Track partial payments and update status promptly\n- Review overdue accounts weekly during busy season"},
    {id:"customer-mgmt",cat:"Operations",title:"Customer Relationship Management",icon:"users",content:"CUSTOMER MANAGEMENT SOP\n\n1. ADDING A NEW CUSTOMER: Go to Directory then Customers. Click Add Customer. Fill in name, contact person, email, phone, type (K-12, University, etc), and address.\n2. EDITING A CUSTOMER: Click Edit next to any customer row. Update fields and save.\n3. CUSTOMER 360 VIEW: Click any customer name (teal text) to see their full profile with lifetime spend, all jobs, vendor breakdown, delivery progress, and activity timeline.\n4. CUSTOMER TYPES: K-12 District, University, Government, Private, Non-Profit, Corporate, Other.\n\nBEST PRACTICES\n- Keep contact info current after each interaction\n- Use the Customer 360 view before sales calls to review history\n- Track all customer types accurately for reporting\n- Remove duplicate entries when found"},
    {id:"vendor-mgmt",cat:"Operations",title:"Vendor & Manufacturer Management",icon:"package",content:"VENDOR MANAGEMENT SOP\n160 MANUFACTURER PARTNERS across every furniture category and price point.\n\n1. ADDING A VENDOR: Go to Directory then Vendors. Click Add Vendor. Enter name, contact, email, phone, category, address, and discount rate.\n2. DISCOUNT RATES: Set the dealer discount percentage for each vendor. This is used to calculate net cost from list price.\n3. CATEGORIES: Collaborative Tables, Classroom Furniture, Seating, Science Lab, Early Childhood, AV Equipment, Storage, Music, Cafeteria, Library, Office, Room Dividers, Technology.\n\nKEY VENDORS\n- Smith System: Collaborative and flexible learning\n- Haskell Education: Classroom furniture\n- National Public Seating: Seating and staging\n- KI: Education and office\n- MooreCo: Whiteboards and AV\n- Jonti-Craft: Early childhood\n- Bretford: Technology charging\n- Diversified Spaces: Science labs"},
    {id:"seasonal",cat:"Strategic",title:"Seasonal Planning & Capacity",icon:"chart",content:"SEASONAL PLANNING\nTHE SCHOOL CALENDAR DRIVES EVERYTHING.\n\nJANUARY THROUGH APRIL\n- Quoting season. Districts plan budgets.\n- Focus: respond to RFPs, build relationships, spec products.\n- Longest lead time items should be identified early.\n\nMAY THROUGH JUNE\n- Ordering season. Budgets approved, POs issued.\n- Focus: get orders to manufacturers ASAP.\n- Confirm delivery dates with every vendor.\n\nJUNE THROUGH AUGUST\n- Delivery and installation. CRITICAL WINDOW.\n- Focus: coordinate deliveries, manage partial shipments.\n- Invoice immediately upon receipt.\n- 60-70% of annual revenue books in this period.\n\nSEPTEMBER\n- HARD DEADLINE. School starts.\n- All furniture must be installed and rooms ready.\n- Escalate any outstanding deliveries.\n\nOCTOBER THROUGH DECEMBER\n- Slower period. Collections focus.\n- Review overdue payments.\n- Plan next year's strategy.\n- Update vendor relationships and discount rates."},
  ];


class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null}}
  static getDerivedStateFromError(error){return {hasError:true,error}}
  render(){if(this.state.hasError)return <div style={{padding:40,background:"#000",color:"#f87171",fontFamily:"monospace",minHeight:"100vh"}}><h2 style={{color:"#f87171",marginBottom:12}}>App Error</h2><pre style={{whiteSpace:"pre-wrap",fontSize:12,color:"#fca5a5"}}>{this.state.error?.toString()}</pre><pre style={{whiteSpace:"pre-wrap",fontSize:11,color:"#737373",marginTop:12}}>{this.state.error?.stack}</pre><button onClick={()=>{sessionStorage.removeItem("mw_user");window.location.reload()}} style={{marginTop:20,padding:"10px 20px",background:"#2dd4bf",color:"#000",border:"none",borderRadius:8,cursor:"pointer"}}>Clear Session & Reload</button></div>;return this.props.children}
}
import{BarChart,Bar as RBar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell}from"recharts";


const Bar = ({value,max,color,height=6,style={}})=><div style={{width:"100%",background:"#222",borderRadius:height/2,overflow:"hidden",height,...style}}><div style={{width:max>0?(value/max*100)+"%":"0%",height:"100%",background:color||"#2dd4bf",borderRadius:height/2,transition:"width 0.4s ease"}}/></div>;
const fmtShipJsx=(raw)=>{if(!raw)return '';if(raw.includes('\n'))return raw.split('\n').map((l,i)=><React.Fragment key={i}>{i>0&&<br/>}{l}</React.Fragment>);const parts=raw.split(',').map(s=>s.trim()).filter(Boolean);if(parts.length>=3){const last=parts[parts.length-1];if(/[A-Z]{2}\s+\d{5}/.test(last)){const merged=[...parts.slice(0,-2),parts[parts.length-2]+', '+last];return merged.map((p,i)=><React.Fragment key={i}>{i>0&&<br/>}{p}</React.Fragment>)}return parts.map((p,i)=><React.Fragment key={i}>{i>0&&<br/>}{p}</React.Fragment>)}if(parts.length===2&&/[A-Z]{2}\s+\d{5}/.test(parts[1]))return <>{parts[0]}<br/>{parts[1]}</>;return raw};
const fmtAddrJsx=(addr)=>{if(!addr)return null;if(addr.includes('\n'))return addr.split('\n').map((l,i)=><React.Fragment key={i}>{i>0&&<br/>}{l}</React.Fragment>);const parts=addr.split(',').map(s=>s.trim()).filter(Boolean);if(parts.length>=3){const last=parts[parts.length-1];if(/[A-Z]{2}\s+\d{5}/.test(last)){const merged=[...parts.slice(0,-2),parts[parts.length-2]+', '+last];return merged.map((p,i)=><React.Fragment key={i}>{i>0&&<br/>}{p}</React.Fragment>)}return parts.map((p,i)=><React.Fragment key={i}>{i>0&&<br/>}{p}</React.Fragment>)}if(parts.length===2&&/[A-Z]{2}\s+\d{5}/.test(parts[1]))return <>{parts[0]}<br/>{parts[1]}</>;return addr};
const fmtAddrHtml=(name,address,contact)=>{let lines=[];if(name)lines.push(name);if(address){let a=address||'';if(a.includes('\n')){a=a.replace(/\n/g,'<br>')}else{const parts=a.split(',').map(s=>s.trim()).filter(Boolean);if(parts.length>=3){const last=parts[parts.length-1];if(/[A-Z]{2}\s+\d{5}/.test(last)){const merged=[...parts.slice(0,-2),parts[parts.length-2]+', '+last];a=merged.join('<br>')}else{a=parts.join('<br>')}}else if(parts.length===2&&/[A-Z]{2}\s+\d{5}/.test(parts[1])){a=parts[0]+'<br>'+parts[1]}}lines.push(a)}if(contact&&!lines.some(l=>l.toLowerCase().includes('attn')))lines.push('Attn: '+contact);return lines.join('<br>')};
const fmtShipHtml=(shipTo,custName,custAddr,custContact)=>{if(shipTo){if(shipTo.includes('\n'))return shipTo.replace(/\n/g,'<br>');const parts=shipTo.split(',').map(s=>s.trim()).filter(Boolean);if(parts.length>=3){const last=parts[parts.length-1];if(/[A-Z]{2}\s+\d{5}/.test(last)){const merged=[...parts.slice(0,-2),parts[parts.length-2]+', '+last];return merged.join('<br>')}return parts.join('<br>')}if(parts.length===2&&/[A-Z]{2}\s+\d{5}/.test(parts[1]))return parts[0]+'<br>'+parts[1];return shipTo}return fmtAddrHtml(custName,custAddr,custContact)};


const Btn = ({children,onClick,v,style={},...props})=>{const base={padding:"8px 16px",borderRadius:10,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Satoshi',sans-serif",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6};const variants={primary:{...base,background:"#2dd4bf",color:"#000"},secondary:{...base,background:"transparent",border:"1px solid #333",color:"#c4c4c4"},ghost:{...base,background:"transparent",color:"#a3a3a3",padding:"6px 12px"},danger:{...base,background:"rgba(248,113,113,0.1)",color:"#f87171",border:"1px solid rgba(248,113,113,0.2)"}};const s=variants[v]||variants.primary;return <button onClick={onClick} style={{...s,...style}} {...props}>{children}</button>};


const Header = ({title,sub,action})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}><div><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0"}}>{title}</div>{sub&&<div style={{fontSize:13,color:"#737373",marginTop:2}}>{sub}</div>}</div>{action&&<div style={{flexShrink:0}}>{action}</div>}</div>;


const Card = ({children,style={},hover,onClick})=><div onClick={onClick} style={{background:"#111111",borderRadius:14,padding:"16px 22px",border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s",...style,...(hover?{cursor:"pointer"}:{})}} onMouseEnter={hover?e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.12)";e.currentTarget.style.transform="translateY(-1px)"}:undefined} onMouseLeave={hover?e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";e.currentTarget.style.transform="translateY(0)"}:undefined}>{children}</div>;


const Badge = ({label,color})=><span style={{fontSize:11,fontWeight:600,color:color||"#a3a3a3",padding:"2px 8px",borderRadius:6,background:(color||"#a3a3a3")+"15",whiteSpace:"nowrap"}}>{label}</span>;


const StatCard = ({label,value,sub,color})=><Card style={{padding:16,textAlign:"center"}} hover><span style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2}}>{label}</span><div style={{fontSize:"clamp(22px,5vw,36px)",fontWeight:800,color:color||"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:-1,lineHeight:1,margin:"8px 0 6px"}}>{value}</div>{sub&&<div style={{fontSize:12,color:"#a3a3a3"}}>{sub}</div>}</Card>;


const Tbl = ({columns,data,onRowClick})=><div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{columns.map((c,i)=><th key={i} style={{padding:"10px 8px",textAlign:"left",fontSize:11,fontWeight:600,color:"#737373",borderBottom:"1px solid #222",whiteSpace:"nowrap"}}>{c.header}</th>)}</tr></thead><tbody>{(data||[]).map((r,i)=><tr key={r.id||i} onClick={onRowClick?()=>onRowClick(r):undefined} style={{cursor:onRowClick?"pointer":"default",transition:"background 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>{columns.map((c,j)=><td key={j} style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}}>{c.render?c.render(r):r[c.key]}</td>)}</tr>)}</tbody></table></div>;


const Check = ({checked,onChange,size=16})=><div onClick={e=>{e.stopPropagation();onChange?.(!checked)}} style={{width:size,height:size,borderRadius:4,border:"1px solid "+(checked?"#2dd4bf":"#444"),background:checked?"#2dd4bf":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>{checked&&<span style={{color:"#000",fontSize:size-4,lineHeight:1}}>&#10003;</span>}</div>;


const CustomerPicker = ({value, onChange, customers, onAddNew}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const selected = customers.find(c => c.id === value);
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return <div ref={ref} style={{position:"relative"}}>
    <input value={open ? search : (selected?.name || "")} onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }} onFocus={() => { setOpen(true); setSearch(selected?.name || ""); }} placeholder="Type to search customers..." style={{padding:"10px 14px",background:"#111",border:"1px solid "+(open?"rgba(45,212,191,0.3)":"#222"),borderRadius:10,color:"#f0f0f0",fontSize:14,fontFamily:"inherit",width:"100%",boxSizing:"border-box",transition:"border 0.15s"}}/>
    {open && <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:9999,background:"#111",border:"1px solid rgba(45,212,191,0.15)",borderRadius:10,marginTop:4,maxHeight:200,overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.5)"}}>
      {filtered.length > 0 ? filtered.map(c => <div key={c.id} onClick={() => { onChange(c.id); setSearch(""); setOpen(false); }} style={{padding:"10px 14px",cursor:"pointer",fontSize:13,color:value===c.id?"#2dd4bf":"#c4c4c4",background:value===c.id?"rgba(45,212,191,0.06)":"transparent",borderBottom:"1px solid rgba(255,255,255,0.03)",transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.08)"} onMouseLeave={e=>e.currentTarget.style.background=value===c.id?"rgba(45,212,191,0.06)":"transparent"}><div style={{fontWeight:600}}>{c.name}</div>{c.contact&&<div style={{fontSize:11,color:"#737373",marginTop:2}}>{c.contact}{c.type?" | "+c.type:""}</div>}</div>) : <div style={{padding:"10px 14px",fontSize:13,color:"#525252"}}>No matching customers</div>}
      {onAddNew && <div onClick={() => { onAddNew(search); setOpen(false); setSearch(""); }} style={{padding:"10px 14px",cursor:"pointer",fontSize:13,color:"#2dd4bf",borderTop:"1px solid rgba(45,212,191,0.1)",fontWeight:600,display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="rgba(45,212,191,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:16}}>+</span> Add New Customer{search ? ': "'+search+'"' : ""}</div>}
    </div>}
  </div>;
};


const CheckMinus = ({checked,onChange,size=16})=><div onClick={e=>{e.stopPropagation();onChange?.(!checked)}} style={{width:size,height:size,borderRadius:4,border:"1px solid "+(checked?"#a78bfa":"#444"),background:checked?"#a78bfa":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.15s",flexShrink:0}}>{checked&&<span style={{color:"#000",fontSize:size-4,lineHeight:1}}>&#8722;</span>}</div>;


function CsvUploadPage({db,jobs,setJobs,lineItems,setLineItems,vendors,setVendors,customers,setCustomers,reps,setReps,notify,addJob,addLineItem,addVendor,addCustomer,addRep}){
  const [mode,setMode]=useState(null);
  const [step,setStep]=useState("upload");
  const [file,setFile]=useState(null);
  const [parsed,setParsed]=useState(null);
  const [importing,setImporting]=useState(false);
  const [done,setDone]=useState(null);
  const [jobName,setJobName]=useState("");
  const [selectedSheets,setSelectedSheets]=useState({});
  const [csvData,setCsvData]=useState(null);
  const [colMap,setColMap]=useState({});
  const [target,setTarget]=useState("vendors");
  const [errors,setErrors]=useState([]);
  const fileRef=useRef(null);
  const aiFileRef=useRef(null);
  const [aiScanning,setAiScanning]=useState(false);
  const [diAiChat,setDiAiChat]=useState([]);
  const [diAiQuery,setDiAiQuery]=useState('');
  const [diAiLoading,setDiAiLoading]=useState(false);
  const [diAiStatus,setDiAiStatus]=useState(null);
  const [aiResult,setAiResult]=useState(null);
  const [aiScanType,setAiScanType]=useState("general");
  const [aiFile,setAiFile]=useState(null);


  const validate=(val,type)=>{
    if(type==="text")return val&&val.trim().length>=2;
    if(type==="email")return !val||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)||val==="";
    if(type==="phone")return !val||val.replace(/[^0-9]/g,"").length>=7||val==="";
    if(type==="number")return val===""||!isNaN(parseFloat(val));
    if(type==="required")return val&&val.trim().length>=1;
    return true;
  };


  const parseExcel=async(f)=>{
    try{
      const XLSX=await import("xlsx");
      const data=await f.arrayBuffer();
      const wb=XLSX.read(data,{type:"array"});
      const items=[];const vendorSet=new Set();const groups=new Set();const sheets=[];
      const findHeader=(row)=>{
        const h={};
        for(let c=0;c<row.length;c++){
          const v=String(row[c]||"").toLowerCase().trim();
          if(v==="tag")h.tag=c;
          else if(v==="manuf"||v==="manuf."||v==="manufacturer")h.manuf=c;
          else if(v==="model #"||v==="model"||v==="model#"||v==="model number")h.model=c;
          else if(v==="description"||v==="desc")h.desc=c;
          else if(v==="color"||v==="finish")h.color=c;
          else if(v==="qty"||v==="quantity")h.qty=c;
          else if(v==="list"||v==="list price"||v==="list each")h.list=c;
          else if(v==="ext"&&!h.listExt){if(h.list!==undefined)h.listExt=c;else h.list=c}
          else if(v==="net each"||v==="net"||v==="net ea"||v==="net price"||v==="dealer"||v==="dealer net")h.net=c;
          else if(v==="net ext"||v==="net extended")h.netExt=c;
          else if(v==="your price"||v==="sell"||v==="sell price"||v==="unit price"||v==="price each"||v==="sell each"||v==="customer price")h.price=c;
          else if(v==="your price extended"||v==="sell ext"||v==="sell extended"||v==="price ext"||v==="extended"||v==="ext price"||v==="line total")h.priceExt=c;
          else if(v==="shipping"||v==="ship"||v==="shipping each"||v==="freight"){if(h.ship!==undefined)h.shipTotal=c;else h.ship=c}
          else if(v==="shipping total"||v==="ship total"||v==="freight total")h.shipTotal=c;
          else if(v==="install"||v==="install each"||v==="installation"){if(h.install!==undefined)h.installTotal=c;else h.install=c}
          else if(v==="install total"||v==="installation total")h.installTotal=c;
        }
        return Object.keys(h).length>=3?h:null;
      };
      const defaultMap={tag:0,manuf:1,model:2,desc:3,color:4,qty:5,list:6,listExt:7,net:8,netExt:9,price:10,priceExt:11};
      const safeNum=(raw)=>{if(typeof raw==="number"&&isFinite(raw))return raw;const s=String(raw||"").replace(/[$,]/g,"").trim();if(!s||/[a-zA-Z]/.test(s))return 0;const v=parseFloat(s);return isFinite(v)?v:0};
      for(let si=0;si<wb.SheetNames.length;si++){
        const sn=wb.SheetNames[si];const ws=wb.Sheets[sn];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        const hiddenRows=ws["!rows"]||[];
        let grp="";let ct=0;let colMap=null;let lastManuf="";
        for(let r=0;r<rows.length;r++){
          if(hiddenRows[r]&&hiddenRows[r].hidden)continue;
          const row=rows[r];if(!row||row.length<3)continue;
          if(!colMap){
            const detected=findHeader(row);
            if(detected){colMap=detected;continue}
            if(String(row[0]||"").toLowerCase().trim()==="tag"){colMap=defaultMap;continue}
          }
          const cm=colMap||defaultMap;
          const g=v=>cm[v]!==undefined?row[cm[v]]:"";
          const n=v=>safeNum(g(v));
          const s=v=>String(g(v)||"").trim();
          const rowHasTotal=row.some(cell=>{const cv=String(cell||"").trim().toLowerCase();return cv==="total"||cv==="subtotal"||cv==="grand total"});
          if(rowHasTotal)continue;
          const desc=s("desc");const tag=s("tag");const manuf=s("manuf");const model=s("model");
          if(!desc&&!tag&&!manuf)continue;
          const priceExt=n("priceExt");
          if(/^(freight|frt|surcharge|tariff|shipping|handling|delivery|install|installation|address|disclaimer|terms|conditions)/i.test(desc)&&!tag&&!model&&!manuf&&!priceExt)continue;
          const qty=n("qty")||0;if(qty<=0&&!tag)continue;
          if(qty<=0&&priceExt<=0)continue; // zero qty + zero extended sell = hidden/alternate row; skip even if the .xls hidden-row flag was not read
          const list=n("list");const net=n("net");
          const price=n("price")||(priceExt&&qty>0?priceExt/qty:0);
          // Shipping: if shipTotal column exists, use ship as per-unit; otherwise check if ship value > net (likely extended)
          let shipPerUnit=n("ship");
          const shipTotalVal=n("shipTotal");
          if(!shipPerUnit&&shipTotalVal&&qty>0)shipPerUnit=shipTotalVal/qty;
          else if(shipPerUnit&&!shipTotalVal&&qty>1&&net>0&&shipPerUnit>net)shipPerUnit=shipPerUnit/qty;
          // Install: same logic
          let installPerUnit=n("install");
          const installTotalVal=n("installTotal");
          if(!installPerUnit&&installTotalVal&&qty>0)installPerUnit=installTotalVal/qty;
          else if(installPerUnit&&!installTotalVal&&qty>1&&net>0&&installPerUnit>net)installPerUnit=installPerUnit/qty;
          if(manuf)lastManuf=manuf;
          const mfr=manuf||lastManuf||"";
          if(mfr)vendorSet.add(mfr);if(tag)groups.add(tag);
          items.push({tag,manufacturer:mfr,modelNumber:model,description:desc||("Quote for "+mfr),
            color:s("color"),qtyOrdered:qty||1,listPrice:list,
            unitCost:net||0,shippingPerUnit:shipPerUnit||0,
            installPerUnit:installPerUnit||0,unitPrice:price||(priceExt&&qty>0?priceExt/qty:0)||0,
            priceExtended:priceExt||0,
            group:grp||tag||"",sheet:sn});ct++
        }
        sheets.push({name:sn,count:ct})
      }
      let name=f.name.replace(/\.(xls|xlsx|csv)$/i,"").replace(/_/g," ");
      try{const ws0=wb.Sheets[wb.SheetNames[0]];const d0=XLSX.utils.sheet_to_json(ws0,{header:1,defval:""});
        if(d0[0]&&d0[0][4])name=String(d0[0][4]).split("\n")[0].trim()}catch{}
      if(fileRef.current)fileRef.current.value="";
      setJobName(name);
      // Sheet selection heuristic: many Midwest quote workbooks have both a customer-
      // facing sheet (e.g. "Approvals", "Quote", "Final") AND an internal worksheet
      // (e.g. "Cost Worksheet", "Internal", "Draft", "WIP", "Backup") that may have
      // stale/different line items. Reading both mixes the data. Default behavior:
      // if at least one sheet matches the "customer-facing" pattern, check ONLY those
      // by default and leave internal sheets unchecked. Otherwise (single sheet, or
      // no obvious pattern match), check all sheets like before. The user can always
      // toggle sheets manually in the picker; this just sets the safer default.
      const isCustomerFacing = (n)=>/\b(approvals?|approved|quotes?|quotations?|finals?|customer|sales)\b/i.test(n);
      const isInternal = (n)=>/\b(cost|worksheet|internal|draft|wip|backup|notes|old|scratch|temp)\b/i.test(n);
      const sheetNames = sheets.map(s2=>s2.name);
      const hasCustomerFacing = sheetNames.some(isCustomerFacing);
      const sel={};
      let autoSkipped=[];
      sheets.forEach(s2=>{
        if(hasCustomerFacing){
          // When a customer-facing sheet is present, only check customer-facing sheets.
          // Internal sheets (and ambiguous sheets) start unchecked.
          const isCF = isCustomerFacing(s2.name);
          sel[s2.name] = isCF;
          if(!isCF) autoSkipped.push(s2.name);
        } else if(isInternal(s2.name) && sheets.length > 1) {
          // No customer-facing sheet, but this one looks internal AND there are others.
          // Uncheck it; user must opt in.
          sel[s2.name] = false;
          autoSkipped.push(s2.name);
        } else {
          sel[s2.name] = true;
        }
      });
      // Safety net: never auto-skip to an empty preview. If the heuristic left no
      // selected sheet that actually has line items (e.g. a workbook whose only data
      // sheet is named "Cost Worksheet", which the internal-name pattern would otherwise
      // uncheck), fall back to selecting every sheet that has items. Prevents the
      // "lines appear then vanish" symptom on internally-named primary sheets.
      if(!sheets.some(s2=>sel[s2.name]&&s2.count>0)){
        sheets.forEach(s2=>{if(s2.count>0){sel[s2.name]=true;autoSkipped=autoSkipped.filter(n=>n!==s2.name)}});
      }
      setSelectedSheets(sel);
      setParsed({items,vendors:vendorSet,groups,sheets});
      setStep("config");
      const skippedMsg = autoSkipped.length>0 ? " ("+autoSkipped.length+" internal sheet"+(autoSkipped.length!==1?"s":"")+" auto-unchecked: "+autoSkipped.join(", ")+")" : "";
      notify(items.length+" items found by parser"+skippedMsg+(items.length>0?" -- AI verifying in background...":". AI scanning..."));
      // AI runs in parallel on EVERY quote upload
      runAiVerify(f,wb,XLSX,items);
    }catch(err){notify("Error reading file: "+err.message,"error")}
  };


  // AI verification runs alongside every quote upload
  const runAiVerify=async(f,wb,XLSX,standardItems)=>{
    setAiScanning(true);
    try{
      let textContent="FILE: "+f.name+"\n\n";
      for(const sn of wb.SheetNames){
        const ws=wb.Sheets[sn];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        const hiddenRows=ws["!rows"]||[];
        textContent+="=== Sheet: "+sn+" ("+rows.length+" rows) ===\n";
        // Send header + ALL data rows (no limit) for complete AI analysis
        rows.forEach((row,ri)=>{
          if(hiddenRows[ri]&&hiddenRows[ri].hidden)return;
          const cells=row.map(c=>String(c||"").replace(/\s*[\r\n]+\s*/g," ").trim()).filter(Boolean);
          if(cells.length<2)return;
          textContent+="R"+ri+": "+cells.join(" | ")+"\n";
        });
        textContent+="\n";
      }
      const r=await fetch("/api/ai-scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        image_data:btoa(unescape(encodeURIComponent(textContent))),media_type:"text/plain",scan_type:"quote_document",
        extra_context:"This is a furniture dealer quote spreadsheet for Midwest Educational Furnishings. Extract EVERY furniture line item with precision. For EACH item include: tag (room number like 100A, 100C), manufacturer abbreviation (DK, POPP, WB, Fomcore, NSL, etc), model number, full description (first line only -- do NOT include Item Specifics or Room Number details), color/finish, quantity (integer), list price per unit, net/dealer cost per unit, shipping per unit (NOT the extended total), install per unit (NOT the extended total), and customer sell price per unit (the Your Price column, NOT Your Price Extended). CRITICAL: When two columns share the same name like Shipping/Shipping or Install/Install, the FIRST is per-unit and the SECOND is extended total -- use the FIRST. Skip freight line items, surcharges, tariffs, totals, subtotals, headers, room-name-only rows, addresses, and disclaimers. Return the total item count and verify the Your Price Extended grand total."
      })});
      const resp=await r.json();
      if(!r.ok||resp.error){setAiScanning(false);return}
      const text=(resp.content||[])[0]?.text||"";
      const clean=text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      try{
        const aiData=JSON.parse(clean);
        if(aiData.items&&aiData.items.length>0){
          setAiResult(aiData);
          const stdCount=standardItems.length;const aiCount=aiData.items.length;
          if(stdCount===0){notify("AI found "+aiCount+" items the standard parser missed. Click 'Use AI Results' to review.");setDiAiStatus('mismatch');setDiAiChat(p=>[...p,{role:'assistant',content:'AI found '+aiCount+' items that the parser missed. Click "Use AI Results" to review, or ask me about the discrepancy.'}])}
          else if(aiCount>stdCount){notify("AI found "+(aiCount-stdCount)+" extra items vs parser ("+aiCount+" total). Click 'Use AI Results' to compare.");setDiAiStatus('mismatch');setDiAiChat(p=>[...p,{role:'assistant',content:'AI found '+aiCount+' items vs parser '+stdCount+'. There may be missing items. Ask me to investigate.'}])}
          else{notify("AI verified "+aiCount+" items. Parser results confirmed.");setDiAiStatus('verified');setDiAiChat(p=>[...p,{role:'assistant',content:'Verified: '+stdCount+' items confirmed. The parser output looks correct. Ask me if anything seems off.'}])}
        }
      }catch{}
    }catch{}
    setAiScanning(false);
  };
  const parseCSV=async(f)=>{
    const ext=f.name.split(".").pop().toLowerCase();
    if(ext==="xls"||ext==="xlsx"){
      try{
        const XLSX=await import("xlsx");
        const data=await f.arrayBuffer();
        const wb=XLSX.read(data,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
        if(rows.length<2){notify("File has no data rows","error");return}
        const headers=rows[0].map(h=>String(h||"").trim());
        const dataRows=rows.slice(1).filter(r=>r.some(c=>String(c||"").trim())).map(r=>{const obj={};headers.forEach((h,i)=>obj[h]=String(r[i]||"").trim());return obj});
        setCsvData({headers,rows:dataRows});
        autoMap(headers);
        setStep("map");
        notify(dataRows.length+" rows found in "+wb.SheetNames[0]);
      }catch(err){notify("Error reading Excel: "+err.message,"error")}
    }else{
      const reader=new FileReader();
      reader.onload=(ev)=>{
        const text=ev.target.result;
        const delim=text.split("\n")[0].includes("\t")?"\t":",";
        const lines=text.split("\n").filter(l=>l.trim());
        if(lines.length<2){notify("File has no data rows","error");return}
        const headers=lines[0].split(delim).map(h=>h.trim().replace(/^"|"$/g,""));
        const rows=lines.slice(1).map(l=>{const vals=l.split(delim).map(v=>v.trim().replace(/^"|"$/g,""));const obj={};headers.forEach((h,i)=>obj[h]=vals[i]||"");return obj});
        setCsvData({headers,rows});
        autoMap(headers);
        setStep("map");
        notify(rows.length+" rows found");
      };
      reader.readAsText(f);
    }
  };


  const MAPS={
    vendors:{fields:["name","contact","email","phone","category","address"],labels:["Company Name*","Contact","Email","Phone","Category","Address"],types:["text","text","email","phone","text","text"],
      guesses:{name:["vendor","company","name"],contact:["contact","person","rep"],email:["email","mail"],phone:["phone","tel"],category:["category","type"],address:["address","location"]}},
    customers:{fields:["name","contact","email","phone","type","address"],labels:["Organization*","Contact","Email","Phone","Type","Address"],types:["text","text","email","phone","text","text"],
      guesses:{name:["customer","client","organization","school","district","name"],contact:["contact","person"],email:["email","mail"],phone:["phone","tel"],type:["type","category"],address:["address","location"]}},
    reps:{fields:["name","email","territory","commissionRate","tier"],labels:["Name*","Email","Territory","Commission %","Tier"],types:["text","email","text","number","text"],
      guesses:{name:["name","rep","salesperson"],email:["email"],territory:["territory","region"],commissionRate:["rate","commission","%"],tier:["tier","level"]}}
  };


  const autoMap=(headers)=>{
    const map=MAPS[target];if(!map)return;
    const mapping={};
    map.fields.forEach(field=>{
      const guesses=map.guesses[field]||[];
      const match=headers.find(h=>guesses.some(g=>h.toLowerCase().trim()===g||h.toLowerCase().includes(g)));
      if(match)mapping[field]=match;
    });
    setColMap(mapping);
  };


  const handleFile=(e)=>{
    const f=e.target.files[0];if(!f)return;setFile(f);
    if(mode==="quote"){parseExcel(f)}
    else{parseCSV(f)}
  };


  const handleDiAiChat = async (query) => {
    if (!query.trim() || !parsed) return;
    setDiAiQuery('');
    setDiAiChat(p => [...p, {role:'user', content:query}]);
    setDiAiLoading(true);
    try {
      const items = parsed.items.filter(i => selectedSheets[i.sheet]);
      const itemSummary = items.slice(0, 100).map((it, idx) =>
        'Item ' + idx + ': tag=' + (it.tag||'') + ' manuf=' + (it.manufacturer||'') + ' model=' + (it.modelNumber||'') + ' desc=' + (it.description||'').slice(0,50) + ' qty=' + it.qtyOrdered + ' cost=$' + (it.unitCost||0).toFixed(2) + ' price=$' + (it.unitPrice||0).toFixed(2) + ' priceExt=$' + (it.priceExtended||0).toFixed(2)
      ).join('\n');
      const system = 'You are an AI assistant reviewing parsed Excel quote data for Midwest Educational Furnishings. The parser extracted ' + items.length + ' items. Help verify, fix, or modify data. If the user asks to change an item, respond with JSON: {"actions":[{"index":0,"field":"unitPrice","value":100}]}. Never use emoji.';
      const msgs = [...diAiChat.slice(-6).map(m => ({role:m.role, content:m.content})), {role:'user', content:query + '\n\nPARSED ITEMS (' + items.length + ' total):\n' + itemSummary + (items.length > 100 ? '\n... and ' + (items.length - 100) + ' more' : '')}];
      const resp = await fetch('/api/brain', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({system, messages:msgs, tools:[]})});
      const data = await resp.json();
      const text = (data.content||[]).filter(b => b.type === 'text').map(b => b.text).join('\n');
      try {
        const jsonMatch = text.match(/\{\s*"actions"\s*:\s*\[/);
        if (jsonMatch) {
          const jsonStr = text.slice(text.indexOf('{'));
          const p2 = JSON.parse(jsonStr.slice(0, jsonStr.lastIndexOf('}') + 1));
          if (p2.actions?.length > 0) {
            const newItems = [...parsed.items];
            const filtered = newItems.filter(i => selectedSheets[i.sheet]);
            let cc = 0;
            p2.actions.forEach(a => { if (a.index >= 0 && a.index < filtered.length && a.field) { const gi = newItems.indexOf(filtered[a.index]); if (gi >= 0) { newItems[gi] = {...newItems[gi], [a.field]: a.value}; cc++; } } });
            if (cc > 0) { setParsed({...parsed, items: newItems}); setDiAiChat(p => [...p, {role:'assistant', content:text + '\n\nApplied ' + cc + ' change(s).'}]); }
            else setDiAiChat(p => [...p, {role:'assistant', content:text}]);
          } else setDiAiChat(p => [...p, {role:'assistant', content:text}]);
        } else setDiAiChat(p => [...p, {role:'assistant', content:text}]);
      } catch(e2) { setDiAiChat(p => [...p, {role:'assistant', content:text}]); }
    } catch(e) { setDiAiChat(p => [...p, {role:'assistant', content:'Error: ' + e.message}]); }
    setDiAiLoading(false);
  };
  const importQuote=async()=>{
    if(!parsed||importing)return;setImporting(true);setErrors([]);
    try{
      const items=parsed.items.filter(i=>selectedSheets[i.sheet]);
      if(items.length===0){notify("No items selected","error");setImporting(false);return}
      const maxNum=jobs.reduce((mx,j)=>{const m=j.id.match(/JOB-\d+-(\d+)/);return m?Math.max(mx,parseInt(m[1])):mx},0);
      const jid="JOB-"+new Date().getFullYear()+"-"+String(maxNum+1).padStart(3,"0");
      addJob({id:jid,name:jobName||"Imported Quote",customer:customers[0]?.id||"",salesRep:reps[0]?.id||"",
        phase:"Quoting",createdDate:new Date().toISOString().split("T")[0],
        startDate:"",dueDate:"",endDate:"",notes:"Imported from Excel -- "+items.length+" line items",
        paymentStatus:"unpaid",terms:"Net 30",poNumber:"",shipTo:"",shipVia:"",billTo:"",orderNotes:"",
        docStatuses:{},activities:[],auditTrail:[]});
      const existNames=new Set(vendors.map(v=>v.name.toLowerCase().trim()));
      const vMap={};vendors.forEach(v=>{vMap[v.name.toLowerCase().trim()]=v.id});
      let newVendors=0;
      for(const vn of parsed.vendors){const k=vn.toLowerCase().trim();
        if(!existNames.has(k)){const vid="V-"+Math.random().toString(36).slice(2,8);
          addVendor({id:vid,name:vn,contact:"",email:"",phone:"",category:"Furniture",address:"",discountRate:0,discountType:"percentage",discountNotes:""});
          vMap[k]=vid;existNames.add(k);newVendors++}}
      let ct=0;
      for(const item of items){const vk=(item.manufacturer||"").toLowerCase().trim();
        addLineItem({id:"LI-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),jobId:jid,description:item.description,
          vendor:vMap[vk]||"",tag:item.tag,group:item.group,manufacturer:item.manufacturer,
          modelNumber:item.modelNumber,color:item.color,listPrice:item.listPrice,unitCost:item.unitCost,
          unitPrice:item.unitPrice,shippingPerUnit:item.shippingPerUnit,installPerUnit:item.installPerUnit,
          priceExtended:item.priceExtended||0,
          qtyOrdered:item.qtyOrdered,qtyReceived:0,qtyInvoiced:0,poDate:"",deliveryDate:"",invoiceDate:""});ct++}
      setDone({type:"quote",items:ct,vendors:newVendors,jobName,jobId:jid});
      notify("Imported "+ct+" items into \""+jobName+"\"");
      // Force re-fetch line items after batch import to ensure consistency across sessions
      setTimeout(async()=>{try{const d=await db.loadAll();if(d.lineItems)setLineItems(p=>{const ids=new Set(d.lineItems.map(li=>li.id));return [...d.lineItems,...p.filter(li=>!ids.has(li.id))]});if(d.jobs)setJobs(p=>{const ids=new Set(d.jobs.map(j=>j.id));return [...d.jobs,...p.filter(j=>!ids.has(j.id))]})}catch{}},3000);
    }catch(err){notify("Import error: "+err.message,"error")}
    setImporting(false);
  };


  const importCSV=async()=>{
    if(!csvData||importing)return;setImporting(true);
    const map=MAPS[target];const errs=[];let imported=0;
    try{
      const rows=csvData.rows.map((row,ri)=>{
        const obj={id:target.charAt(0).toUpperCase()+"-"+Math.random().toString(36).slice(2,8)};
        map.fields.forEach((field,fi)=>{
          const csvCol=colMap[field];
          if(csvCol&&row[csvCol]!==undefined){
            let val=row[csvCol];
            if(map.types[fi]==="number")val=parseFloat(val)||0;
            obj[field]=val;
          }
        });
        if(!validate(obj.name||obj[map.fields[0]],"text")){errs.push("Row "+(ri+2)+": missing required field");return null}
        if(obj.email&&!validate(obj.email,"email")){errs.push("Row "+(ri+2)+": invalid email format")}
        if(obj.phone&&!validate(obj.phone,"phone")){errs.push("Row "+(ri+2)+": phone seems short")}
        return obj;
      }).filter(Boolean);
      if(rows.length===0){notify("No valid rows","error");setImporting(false);return}
      for(const row of rows){
        if(target==="vendors")addVendor({...row,discountRate:0,discountType:"percentage",discountNotes:""});
        else if(target==="customers")addCustomer(row);
        else if(target==="reps")addRep({...row,commissionRate:parseFloat(row.commissionRate)||0.05});
        imported++;
      }
      setErrors(errs);
      setDone({type:"csv",target,imported,errors:errs.length});
      notify(imported+" "+target+" imported");
    }catch(err){notify("Import error: "+err.message,"error")}
    setImporting(false);
  };


  const reset=()=>{setDiAiChat([]);setDiAiStatus(null);setMode(null);setStep("upload");setFile(null);setParsed(null);setCsvData(null);setColMap({});setDone(null);setErrors([]);setJobName("");setAiResult(null);setAiFile(null);if(fileRef.current)fileRef.current.value="";if(aiFileRef.current)aiFileRef.current.value=""};


  // AI Document Scanning
  const handleAiScan=async(f,scanType)=>{
    if(!f)return;setAiScanning(true);setAiResult(null);setAiFile(f);
    try{
      const reader=new FileReader();
      const base64=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(f)});
      const parts=base64.split(",");const mediaType=parts[0].match(/:(.*?);/)?.[1]||"image/png";const data64=parts[1];
      // For PDFs, use application/pdf; for images use detected type
      const r=await fetch("/api/ai-scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_data:data64,media_type:mediaType,scan_type:scanType||aiScanType})});
      const resp=await r.json();
      if(!r.ok||resp.error){notify("Scan error: "+(resp.error?.message||JSON.stringify(resp.error)),"error");setAiScanning(false);return}
      const text=(resp.content||[])[0]?.text||"";
      // Parse JSON from response (strip markdown fences if present)
      const clean=text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      try{const parsed2=JSON.parse(clean);setAiResult(parsed2);notify("Document scanned -- review results below")}
      catch{setAiResult({raw_text:text,parse_error:true});notify("Scanned but couldn't parse structured data. Raw text extracted.","error")}
    }catch(err){notify("Scan failed: "+err.message,"error")}
    setAiScanning(false);
  };
  const importAiVendorInvoice=(data)=>{
    if(!data)return;
    const amt=data.total||data.subtotal||0;
    // Ensure vendor exists
    let vendorId='';
    if(data.vendor){
      const existing=vendors.find(v=>v.name.toLowerCase()===data.vendor.toLowerCase());
      if(existing){vendorId=existing.id}
      else{vendorId='V-AI-'+Date.now();addVendor({id:vendorId,name:data.vendor,category:'Furniture',email:'',phone:'',discountRate:0,contact:''})}
    }
    // Create a standalone line item so it appears in the vendor bills tab
    const jobId='JOB-BILL-'+Date.now();
    const liId='LI-BILL-'+Date.now();
    addJob({id:jobId,name:(data.vendor||'Vendor')+' Invoice #'+(data.invoice_number||Date.now()),customer:'',salesRep:'',phase:'Invoiced',paymentStatus:'unpaid',terms:'Net 30',poNumber:'',shipTo:'',shipVia:'',billTo:'',orderNotes:'',notes:'AI-scanned vendor invoice. Vendor: '+(data.vendor||'--')+', Invoice #: '+(data.invoice_number||'--')+', Date: '+(data.date||'--'),createdDate:new Date().toISOString().split('T')[0],startDate:'',endDate:'',dueDate:'',docStatuses:{},activities:[],auditTrail:[]});
    addLineItem({id:liId,jobId,description:'Invoice #'+(data.invoice_number||'--')+' - '+(data.vendor||'Vendor'),vendor:vendorId,tag:'',group:'',manufacturer:data.vendor||'',modelNumber:'',color:'',listPrice:0,unitCost:amt,unitPrice:amt,shippingPerUnit:0,installPerUnit:0,qtyOrdered:1,qtyReceived:1,qtyInvoiced:0,poDate:data.date||new Date().toISOString().split('T')[0],deliveryDate:'',invoiceDate:''});
    // Mark PO as drafted so it appears in vendor bills
    const poDocNum='PO-'+jobId.replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(vendorId||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
    if(typeof window._setDocStatus==='function')window._setDocStatus(poDocNum,'drafted');
    notify("Vendor invoice imported: "+(data.vendor||"Unknown")+" #"+(data.invoice_number||"")+" for $"+Number(amt).toLocaleString());
    setDone({type:"AI Scan",count:1,detail:"Vendor: "+(data.vendor||"--")+", Invoice: "+(data.invoice_number||"--")+", Amount: $"+Number(amt).toLocaleString()});setMode(null);
  };
  const importAiQuote=(data)=>{
    if(!data||!data.items||data.items.length===0){notify("No items found in scan","error");return}
    const jobId="JOB-"+new Date().getFullYear()+"-"+String(jobs.length+1).padStart(3,"0");
    const jn=jobName||(data.customer?data.customer+" - AI Import":"AI Scanned Quote");
    // Create vendor if needed
    if(data.vendor){const existing=vendors.find(v=>v.name.toLowerCase()===data.vendor.toLowerCase());if(!existing)addVendor({id:"V-AI-"+Date.now(),name:data.vendor,category:"Furniture",email:"",phone:"",discountRate:0,contact:""})}
    const vendorObj=vendors.find(v=>v.name.toLowerCase()===(data.vendor||"").toLowerCase());
    addJob({id:jobId,name:jn,customer:"",salesRep:"",phase:"Quoting",paymentStatus:"unpaid",paymentTerms:"Net 30",dueDate:"",notes:"AI scanned from "+(aiFile?.name||"document")});
    let ct=0;
    data.items.forEach((item,idx)=>{
      const v2=item.manufacturer?vendors.find(v=>v.name.toLowerCase()===item.manufacturer.toLowerCase()):vendorObj;
      if(item.manufacturer&&!vendors.find(v=>v.name.toLowerCase()===item.manufacturer.toLowerCase()))addVendor({id:"V-AI-"+Date.now()+"-"+idx,name:item.manufacturer,category:"Furniture",email:"",phone:"",discountRate:0,contact:""});
      addLineItem({id:"LI-AI-"+Date.now()+"-"+idx,jobId,description:item.description||"",modelNumber:item.model||"",color:item.color||"",tag:item.tag||"",vendor:v2?.id||vendorObj?.id||"",qtyOrdered:item.quantity||1,qtyReceived:0,unitCost:item.net_cost||item.unit_cost||0,unitPrice:item.sell_price||item.list_price||0,shippingCost:0,installCost:0});
      ct++;
    });
    notify(ct+" items imported into "+jn);
    setDone({type:"AI Quote Scan",count:ct,detail:"Job: "+jn+", Vendor: "+(data.vendor||"--")+", Items: "+ct});setMode(null);
  };
  const importAiCustomers=(data)=>{
    if(!data?.customers?.length){notify("No customers found","error");return}
    let ct=0;
    data.customers.forEach((c,i)=>{
      if(!c.name)return;
      if(customers.find(x=>x.name.toLowerCase()===c.name.toLowerCase()))return;
      addCustomer({id:"C-AI-"+Date.now()+"-"+i,name:c.name,contact:c.contact||"",email:c.email||"",phone:c.phone||"",type:c.type||"School District",address:(c.address||"")+(c.city?", "+c.city:"")+(c.state?" "+c.state:"")+(c.zip?" "+c.zip:"")});
      ct++;
    });
    notify(ct+" customers imported");setDone({type:"AI Customer Scan",count:ct});setMode(null);
  };
  const importAiVendors=(data)=>{
    if(!data?.vendors?.length){notify("No vendors found","error");return}
    let ct=0;
    data.vendors.forEach((v,i)=>{
      if(!v.name)return;
      if(vendors.find(x=>x.name.toLowerCase()===v.name.toLowerCase()))return;
      addVendor({id:"V-AI-"+Date.now()+"-"+i,name:v.name,contact:v.contact||"",email:v.email||"",phone:v.phone||"",category:v.category||"Furniture",discountRate:0,website:v.website||""});
      ct++;
    });
    notify(ct+" vendors imported");setDone({type:"AI Vendor Scan",count:ct});setMode(null);
  };


  const selCount=parsed?parsed.items.filter(i=>selectedSheets[i.sheet]).length:0;
  const selCost=parsed?parsed.items.filter(i=>selectedSheets[i.sheet]).reduce((s,i)=>s+(i.unitCost*i.qtyOrdered),0):0;
  const selRev=parsed?parsed.items.filter(i=>selectedSheets[i.sheet]).reduce((s,i)=>s+((i.unitPrice||0)*i.qtyOrdered),0):0;


  const dropZone=(label,sub,accept,onClick)=><div onClick={onClick} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(45,212,191,0.4)"}} onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.12)"}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(45,212,191,0.12)";const f=e.dataTransfer.files[0];if(f){if(fileRef.current){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files}setFile(f);if(mode==="quote")parseExcel(f);else parseCSV(f)}}} style={{textAlign:"center",padding:"48px 32px",border:"2px dashed rgba(45,212,191,0.12)",borderRadius:16,cursor:"pointer",transition:"all 0.3s",background:"rgba(45,212,191,0.02)"}}>
    <div style={{width:56,height:56,borderRadius:16,background:"rgba(45,212,191,0.08)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",transition:"transform 0.2s"}}><I n="download" s={24}/></div>
    <div style={{fontSize:16,fontWeight:600,color:"#e5e5e5",marginBottom:6}}>{label}</div>
    <div style={{fontSize:13,color:"#737373",marginBottom:16}}>{sub}</div>
    <input ref={fileRef} type="file" accept={accept} onChange={handleFile} style={{display:"none"}}/>
    <Btn v="secondary" onClick={e=>{e.stopPropagation();fileRef.current?.click()}} style={{fontSize:13}}>Choose File</Btn>
  </div>;


  // MODE SELECTION
  if(!mode&&!done)return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Data Import" sub="Smart upload portal for Excel quotes, vendors, and customers"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:24}} className="resp-grid-3">
      {[
        {id:"quote",icon:"file",title:"Upload Excel Quote",sub:"Import Lisa's Excel spreadsheets with full line item parsing. Auto-detects tags, manufacturers, model numbers, quantities, pricing, shipping, and installation costs.",color:"#2dd4bf",tags:["XLS","XLSX","Auto-Map","Multi-Sheet"]},
        {id:"vendors",icon:"package",title:"Import Vendors",sub:"Bulk import vendor data from Excel or CSV. Smart column mapping with validation for company names, contacts, emails, and phone numbers.",color:"#a78bfa",tags:["XLS","XLSX","CSV","TSV"]},
        {id:"customers",icon:"users",title:"Import Customers",sub:"Upload customer data from Excel or CSV. Auto-detects organization names, contacts, addresses, and school district types.",color:"#34d399",tags:["XLS","XLSX","CSV","TSV"]},
        {id:"ai",icon:"brain",title:"AI Document Scan",sub:"Upload any document -- vendor invoices, delivery receipts, quotes, customer lists, vendor lists. Claude Vision reads and extracts all data automatically.",color:"#fbbf24",tags:["PDF","PNG","JPG","Any Doc"]}
      ].map(m=><Card key={m.id} onClick={()=>{if(m.id==="ai"){setMode("ai")}else{setMode(m.id==="quote"?"quote":"csv");if(m.id!=="quote")setTarget(m.id)}}} style={{cursor:"pointer",transition:"all 0.25s",border:"1px solid rgba(255,255,255,0.04)",position:"relative",overflow:"hidden"}} hover>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:m.color+"15",display:"flex",alignItems:"center",justifyContent:"center",color:m.color}}><I n={m.icon} s={20}/></div>
          <div style={{fontSize:16,fontWeight:700,color:"#f0f0f0"}}>{m.title}</div>
        </div>
        <div style={{fontSize:13,color:"#a3a3a3",lineHeight:1.6,marginBottom:14}}>{m.sub}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{m.tags.map(t=><span key={t} style={{padding:"3px 10px",borderRadius:6,background:m.color+"10",color:m.color,fontSize:11,fontWeight:600}}>{t}</span>)}</div>
      </Card>)}
    </div>
    <Card style={{padding:16,border:"1px solid rgba(45,212,191,0.08)"}}>
      <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",marginBottom:10}}>Current Database</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10}} className="resp-grid-5">
        {[["Jobs",jobs.length,"#2dd4bf"],["Line Items",lineItems.length,"#a78bfa"],["Vendors",vendors.length,"#34d399"],["Customers",customers.length,"#fbbf24"],["Reps",reps.length,"#f87171"]].map(([l,c,col])=>
          <div key={l} style={{textAlign:"center",padding:"12px 8px",background:"#000",borderRadius:10}}>
            <div style={{fontSize:22,fontWeight:800,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{c}</div>
            <div style={{fontSize:11,color:"#737373"}}>{l}</div>
          </div>
        )}
      </div>
    </Card>
  </div>;


  // SUCCESS SCREEN
  if(done)return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Data Import" sub="Import complete"/>
    <Card style={{textAlign:"center",padding:"48px 32px",border:"1px solid rgba(45,212,191,0.15)"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(52,211,153,0.12)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",color:"#34d399"}}><I n="check" s={32}/></div>
      <div style={{fontSize:24,fontWeight:800,color:"#f0f0f0",marginBottom:8}}>Import Complete</div>
      <div style={{fontSize:14,color:"#a3a3a3",marginBottom:24}}>{done.type==="quote"?done.items+" line items imported into \""+done.jobName+"\"":done.detail?done.detail:done.imported+" "+done.target+" imported"+(done.errors>0?" ("+done.errors+" warnings)":"")}</div>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
        {done.type==="quote"&&<><Card style={{padding:16,minWidth:110}}><div style={{fontSize:11,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Items</div><div style={{fontSize:26,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{done.items}</div></Card><Card style={{padding:16,minWidth:110}}><div style={{fontSize:11,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>New Vendors</div><div style={{fontSize:26,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{done.vendors}</div></Card></>}
        {done.type==="csv"&&<Card style={{padding:16,minWidth:110}}><div style={{fontSize:11,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Imported</div><div style={{fontSize:26,fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{done.imported}</div></Card>}
      </div>
      {errors.length>0&&<div style={{textAlign:"left",padding:14,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:10,marginBottom:16,maxHeight:120,overflow:"auto"}}>{errors.slice(0,10).map((e,i)=><div key={i} style={{fontSize:12,color:"#fbbf24",padding:"2px 0"}}>{e}</div>)}{errors.length>10&&<div style={{fontSize:11,color:"#737373"}}>+{errors.length-10} more warnings</div>}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"center"}}><Btn onClick={reset}>Import More</Btn><Btn v="secondary" onClick={reset}>Done</Btn></div>
    </Card>
  </div>;


  // AI DOCUMENT SCAN FLOW
  if(mode==="ai")return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
      <span onClick={reset} style={{color:"#737373",cursor:"pointer",fontSize:13,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#737373"}>Data Import</span>
      <span style={{color:"#333"}}>/</span>
      <span style={{color:"#fbbf24",fontWeight:600,fontSize:13}}>AI Document Scan</span>
    </div>
    {!aiResult&&!aiScanning&&<>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"#737373",alignSelf:"center"}}>Scan type:</span>
        {[["vendor_invoice","Vendor Invoice"],["quote_document","Quote / Proposal"],["delivery_receipt","Delivery Receipt"],["customer_list","Customer List"],["vendor_list","Vendor List"],["general","General / Other"]].map(([v,l])=><button key={v} onClick={()=>setAiScanType(v)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:aiScanType===v?"#fbbf24":"#111",color:aiScanType===v?"#000":"#737373",fontSize:12,fontWeight:aiScanType===v?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}
      </div>
      <div onClick={()=>aiFileRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(251,191,36,0.4)"}} onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(251,191,36,0.12)"}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(251,191,36,0.12)";const f2=e.dataTransfer.files[0];if(f2)handleAiScan(f2,aiScanType)}} style={{textAlign:"center",padding:"48px 32px",border:"2px dashed rgba(251,191,36,0.12)",borderRadius:16,cursor:"pointer",transition:"all 0.3s",background:"rgba(251,191,36,0.02)"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"rgba(251,191,36,0.08)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#fbbf24"}}><I n="brain" s={24}/></div>
        <div style={{fontSize:16,fontWeight:600,color:"#e5e5e5",marginBottom:6}}>Drop any document here</div>
        <div style={{fontSize:13,color:"#737373",marginBottom:16}}>PDF, PNG, JPG, JPEG, TIFF -- Claude Vision will read and extract all data</div>
        <input ref={aiFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.gif,.webp" onChange={e=>{const f2=e.target.files?.[0];if(f2)handleAiScan(f2,aiScanType)}} style={{display:"none"}}/>
        <Btn v="secondary" style={{fontSize:13,border:"1px solid #fbbf2430",color:"#fbbf24"}} onClick={e=>{e.stopPropagation();aiFileRef.current?.click()}}>Choose File</Btn>
      </div>
    </>}
    {aiScanning&&<Card style={{textAlign:"center",padding:"48px 32px",border:"1px solid rgba(251,191,36,0.15)"}}><div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:16}}><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24",animation:"pulse 1s infinite"}}/><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24",animation:"pulse 1s infinite 0.2s"}}/><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24",animation:"pulse 1s infinite 0.4s"}}/></div><div style={{fontSize:16,fontWeight:600,color:"#fbbf24"}}>Claude is reading your document...</div><div style={{fontSize:13,color:"#737373",marginTop:8}}>{aiFile?.name||"Document"} -- scanning with AI vision</div></Card>}
    {aiResult&&!aiResult.parse_error&&<Card style={{border:"1px solid rgba(251,191,36,0.15)",padding:20}}>
      <div style={{fontSize:16,fontWeight:700,color:"#fbbf24",marginBottom:16}}>Scan Results</div>
      {/* Vendor Invoice Results */}
      {(aiResult.vendor||aiResult.invoice_number)&&<div style={{marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:12}}>
          {aiResult.vendor&&<div style={{padding:10,background:"#111",borderRadius:8}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase"}}>Vendor</div><div style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}>{aiResult.vendor}</div></div>}
          {aiResult.invoice_number&&<div style={{padding:10,background:"#111",borderRadius:8}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase"}}>Invoice #</div><div style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}>{aiResult.invoice_number||aiResult.quote_number}</div></div>}
          {aiResult.date&&<div style={{padding:10,background:"#111",borderRadius:8}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase"}}>Date</div><div style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}>{aiResult.date}</div></div>}
          {(aiResult.total||aiResult.total===0)&&<div style={{padding:10,background:"#111",borderRadius:8}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase"}}>Total</div><div style={{fontSize:14,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>${Number(aiResult.total).toLocaleString()}</div></div>}
        </div>
        {aiResult.items&&aiResult.items.length>0&&<div style={{overflowX:"auto",borderRadius:8,border:"1px solid #222",marginBottom:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#111"}}><th style={{padding:"8px 10px",textAlign:"left",color:"#737373"}}>Description</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373"}}>Qty</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373"}}>Unit Cost</th><th style={{padding:"8px 10px",textAlign:"right",color:"#737373"}}>Extended</th></tr></thead><tbody>{aiResult.items.map((item,i)=><tr key={i} style={{borderBottom:"1px solid #1a1a1a"}}><td style={{padding:"6px 10px",color:"#a3a3a3"}}>{item.description||item.model||"Item "+(i+1)}{item.manufacturer?" ("+item.manufacturer+")":""}{item.tag?" ["+item.tag+"]":""}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{item.quantity||item.quantity_shipped||1}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>${Number(item.unit_cost||item.net_cost||item.list_price||0).toLocaleString()}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>${Number(item.extended||(item.quantity||1)*(item.unit_cost||item.net_cost||0)).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </div>}
      {/* Customer List Results */}
      {aiResult.customers&&<div style={{marginBottom:12}}><div style={{fontSize:13,color:"#a3a3a3",marginBottom:8}}>{aiResult.customers.length} customers found</div>{aiResult.customers.slice(0,10).map((c,i)=><div key={i} style={{fontSize:12,color:"#f0f0f0",padding:"4px 0"}}>{c.name}{c.type?" ("+c.type+")":""}{c.email?" -- "+c.email:""}</div>)}{aiResult.customers.length>10&&<div style={{fontSize:11,color:"#525252"}}>+{aiResult.customers.length-10} more</div>}</div>}
      {/* Vendor List Results */}
      {aiResult.vendors&&<div style={{marginBottom:12}}><div style={{fontSize:13,color:"#a3a3a3",marginBottom:8}}>{aiResult.vendors.length} vendors found</div>{aiResult.vendors.slice(0,10).map((v,i)=><div key={i} style={{fontSize:12,color:"#f0f0f0",padding:"4px 0"}}>{v.name}{v.category?" ("+v.category+")":""}{v.email?" -- "+v.email:""}</div>)}</div>}
      {/* General/raw results */}
      {aiResult.summary&&<div style={{fontSize:13,color:"#a3a3a3",marginBottom:12}}>{aiResult.summary}</div>}
      {aiResult.raw_text&&!aiResult.items&&!aiResult.customers&&!aiResult.vendors&&<div style={{fontSize:12,color:"#a3a3a3",padding:12,background:"#111",borderRadius:8,whiteSpace:"pre-wrap",maxHeight:200,overflow:"auto"}}>{aiResult.raw_text}</div>}
      <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
        {(aiResult.vendor||aiResult.invoice_number)&&!aiResult.items?.length&&<Btn onClick={()=>importAiVendorInvoice(aiResult)} style={{background:"#fbbf24",color:"#000"}}>Import as Vendor Bill</Btn>}
        {aiResult.items?.length>0&&<><input value={jobName} onChange={e=>setJobName(e.target.value)} placeholder="Job name (optional)" style={{...inputStyle,width:200,padding:"6px 12px",fontSize:12}}/><Btn onClick={()=>importAiQuote(aiResult)} style={{background:"#2dd4bf",color:"#000"}}>Import as Job + Line Items</Btn></>}
        {aiResult.items?.length>0&&(aiResult.vendor||aiResult.invoice_number)&&<Btn onClick={()=>importAiVendorInvoice(aiResult)} v="secondary" style={{fontSize:12}}>Import as Vendor Bill Only</Btn>}
        {aiResult.customers?.length>0&&<Btn onClick={()=>importAiCustomers(aiResult)} style={{background:"#34d399",color:"#000"}}>Import {aiResult.customers.length} Customers</Btn>}
        {aiResult.vendors?.length>0&&<Btn onClick={()=>importAiVendors(aiResult)} style={{background:"#a78bfa",color:"#000"}}>Import {aiResult.vendors.length} Vendors</Btn>}
        <Btn v="secondary" onClick={()=>{setAiResult(null);setAiFile(null);if(aiFileRef.current)aiFileRef.current.value=""}}>Scan Another</Btn>
        <Btn v="secondary" onClick={reset}>Back</Btn>
      </div>
    </Card>}
    {aiResult&&aiResult.parse_error&&<Card style={{border:"1px solid rgba(251,191,36,0.15)",padding:20}}>
      <div style={{fontSize:16,fontWeight:700,color:"#fbbf24",marginBottom:12}}>Raw Scan Results</div>
      <div style={{fontSize:12,color:"#a3a3a3",padding:12,background:"#111",borderRadius:8,whiteSpace:"pre-wrap",maxHeight:400,overflow:"auto"}}>{aiResult.raw_text}</div>
      <div style={{display:"flex",gap:8,marginTop:16}}><Btn v="secondary" onClick={()=>{setAiResult(null);setAiFile(null)}}>Scan Another</Btn><Btn v="secondary" onClick={reset}>Back</Btn></div>
    </Card>}
  </div>;


  // EXCEL QUOTE FLOW
  if(mode==="quote")return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
      <span onClick={reset} style={{color:"#737373",cursor:"pointer",fontSize:13,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#737373"}>Data Import</span>
      <span style={{color:"#333"}}>/</span>
      <span style={{color:"#f0f0f0",fontWeight:600,fontSize:13}}>Excel Quote Upload</span>
    </div>


    {step==="upload"&&dropZone("Drop Excel quote here or click to browse","Supports .xls and .xlsx from Lisa's quote spreadsheets",".xls,.xlsx",()=>fileRef.current?.click())}


    {step==="config"&&parsed&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
        {[["Line Items",parsed.items.filter(i=>selectedSheets[i.sheet]&&(i.unitPrice>0||i.priceExtended>0)).length,"#2dd4bf"],["Vendors",parsed.vendors.size,"#a78bfa"],["Cost","$"+Math.round(selCost).toLocaleString(),"#fbbf24"],["Revenue","$"+Math.round(selRev).toLocaleString(),"#34d399"]].map(([l,v,c])=>
          <Card key={l} style={{padding:14,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div></Card>
        )}
      </div>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Import Settings</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}} className="resp-grid-2">
          <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={jobName} onChange={e=>setJobName(e.target.value)} style={inputStyle} placeholder="e.g. DeKalb Mitchell ES"/></div>
          <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer</label><select style={inputStyle}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </div>
      </Card>
      <Card><div style={{fontSize:15,fontWeight:700,color:"#f0f0f0",marginBottom:14}}>Sheets to Import</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {parsed.sheets.map(sh=><label key={sh.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:selectedSheets[sh.name]?"rgba(45,212,191,0.06)":"rgba(255,255,255,0.02)",border:selectedSheets[sh.name]?"1px solid rgba(45,212,191,0.15)":"1px solid rgba(255,255,255,0.04)",cursor:"pointer",transition:"all 0.15s"}}>
            <input type="checkbox" checked={!!selectedSheets[sh.name]} onChange={e=>setSelectedSheets({...selectedSheets,[sh.name]:e.target.checked})} style={{accentColor:"#2dd4bf",width:16,height:16}}/>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#e5e5e5"}}>{sh.name}</div></div>
            <span style={{fontSize:13,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{sh.count} items</span>
          </label>)}
        </div>
      </Card>
      <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:700,color:"#f0f0f0"}}>Preview ({selCount} items)</div>
          {selRev>0&&<span style={{fontSize:13,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>Revenue: ${Math.round(selRev).toLocaleString()}</span>}
        </div>
        <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1000}}>
            <thead><tr style={{background:"#0a0a0a"}}>{["Tag","Manuf","Model #","Description","Color","Qty","List","Net Ea","Ship","Install","Your Price"].map(h=>
              <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#737373",fontSize:10,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>
            )}</tr></thead>
            <tbody>{(()=>{let lastV='';return parsed.items.filter(i=>selectedSheets[i.sheet]).slice(0,40).map((it,idx)=>{const showSep=it.manufacturer&&it.manufacturer!==lastV;if(it.manufacturer)lastV=it.manufacturer;return <React.Fragment key={idx}>{showSep&&idx>0&&<tr><td colSpan={11} style={{padding:"6px 8px 2px",borderTop:"1px solid rgba(45,212,191,0.12)"}}><span style={{fontSize:10,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:1}}>{it.manufacturer}</span></td></tr>}<tr style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <td style={{padding:"5px 8px",color:"#a78bfa",fontWeight:500}}>{it.tag}</td>
                <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{it.manufacturer}</td>
                <td style={{padding:"5px 8px",color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{it.modelNumber}</td>
                <td style={{padding:"5px 8px",color:"#e5e5e5",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</td>
                <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{it.color}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{it.qtyOrdered}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#737373"}}>{it.listPrice?"$"+it.listPrice.toFixed(0):"--"}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#34d399"}}>${it.unitCost.toFixed(2)}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#fbbf24"}}>{it.shippingPerUnit?"$"+it.shippingPerUnit.toFixed(0):"--"}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa"}}>{it.installPerUnit?"$"+it.installPerUnit.toFixed(0):"--"}</td>
                <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf",fontWeight:600}}>{it.unitPrice?"$"+it.unitPrice.toFixed(2):"--"}</td>
              </tr></React.Fragment>})})()}</tbody>
          </table>
          {selCount>40&&<div style={{padding:10,textAlign:"center",color:"#525252",fontSize:12}}>Showing 40 of {selCount}</div>}
        </div>
      </Card>
      {/* AI Chat Assistant */}
      <Card style={{border:'1px solid #1a1a1a',padding:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:diAiStatus==='verified'?'#34d399':diAiStatus==='mismatch'?'#f87171':aiScanning?'#fbbf24':'#333',animation:aiScanning?'pulse 1.5s infinite':'none'}}/>
          <span style={{fontSize:12,fontWeight:600,color:diAiStatus==='verified'?'#34d399':diAiStatus==='mismatch'?'#f87171':'#737373'}}>{diAiStatus==='verified'?'AI Verified':diAiStatus==='mismatch'?'AI Found Discrepancy':aiScanning?'AI Verifying...':'AI Assistant'}</span>
        </div>
        {diAiChat.length>0&&<div style={{maxHeight:180,overflowY:'auto',marginBottom:8,display:'flex',flexDirection:'column',gap:4}}>
          {diAiChat.map((m,i)=><div key={i} style={{padding:'6px 10px',borderRadius:8,fontSize:12,lineHeight:1.5,maxWidth:'88%',alignSelf:m.role==='user'?'flex-end':'flex-start',background:m.role==='user'?'rgba(45,212,191,0.08)':'#0a0a0a',color:m.role==='user'?'#2dd4bf':'#a3a3a3',border:'1px solid '+(m.role==='user'?'rgba(45,212,191,0.12)':'#1a1a1a'),whiteSpace:'pre-wrap'}}>{m.content}</div>)}
          {diAiLoading&&<div style={{padding:'6px 10px',borderRadius:8,fontSize:11,color:'#fbbf24',alignSelf:'flex-start'}}>Thinking...</div>}
        </div>}
        <div style={{display:'flex',gap:6}}>
          <input value={diAiQuery} onChange={e=>setDiAiQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!diAiLoading)handleDiAiChat(diAiQuery)}} placeholder="Ask about the parsed data..." style={{flex:1,padding:'7px 12px',background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:16,color:'#f0f0f0',fontSize:12,outline:'none',fontFamily:'inherit'}} disabled={diAiLoading}/>
          <button onClick={()=>handleDiAiChat(diAiQuery)} disabled={diAiLoading||!diAiQuery.trim()} style={{padding:'6px 14px',borderRadius:16,border:'none',background:diAiQuery.trim()?'#2dd4bf':'#222',color:diAiQuery.trim()?'#000':'#555',fontSize:11,fontWeight:600,cursor:diAiQuery.trim()?'pointer':'default',fontFamily:'inherit',transition:'all 0.15s'}}>Send</button>
        </div>
      </Card>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",alignItems:"center",marginTop:8}}>
        {parsed&&parsed.items.length===0&&<span style={{fontSize:12,color:"#f87171",marginRight:"auto"}}>Standard parser found 0 items</span>}
        <Btn v="secondary" onClick={reset}>Cancel</Btn>
        {aiResult&&aiResult.items&&!aiScanning&&<Btn v="secondary" onClick={()=>setStep("ai_review")} style={{border:"1px solid #fbbf2430",color:"#fbbf24"}}>Use AI Results ({aiResult.items.length} items)</Btn>}
        {selCount>0&&<Btn onClick={importQuote} style={{padding:"12px 28px",fontSize:15,...(importing?{opacity:0.6,pointerEvents:"none"}:{})}}>{importing?"Importing...":"Import "+selCount+" Items"}</Btn>}
      </div>
    </div>}


    {/* AI Assist review step for Excel quotes */}
    {step==="ai_review"&&aiResult&&aiResult.items&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{border:"1px solid rgba(251,191,36,0.15)",padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24"}}/><span style={{fontSize:16,fontWeight:700,color:"#fbbf24"}}>AI Found {aiResult.items.length} Items</span></div>
        {aiResult.vendor&&<div style={{fontSize:13,color:"#a3a3a3",marginBottom:12}}>Vendor: <strong style={{color:"#f0f0f0"}}>{aiResult.vendor}</strong></div>}
        <div style={{marginBottom:12}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={jobName} onChange={e=>setJobName(e.target.value)} style={inputStyle} placeholder="e.g. DeKalb Mitchell ES"/></div>
        <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:800}}>
            <thead><tr style={{background:"#0a0a0a"}}>{["Tag","Manufacturer","Model","Description","Color","Qty","Net Cost","Sell Price"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,color:"#737373",fontSize:10,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>)}</tr></thead>
            <tbody>{aiResult.items.slice(0,50).map((it,idx)=><tr key={idx} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
              <td style={{padding:"5px 8px",color:"#a78bfa"}}>{it.tag||""}</td>
              <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{it.manufacturer||aiResult.vendor||""}</td>
              <td style={{padding:"5px 8px",color:"#c4c4c4",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{it.model||""}</td>
              <td style={{padding:"5px 8px",color:"#e5e5e5",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description||""}</td>
              <td style={{padding:"5px 8px",color:"#c4c4c4"}}>{it.color||""}</td>
              <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#f0f0f0"}}>{it.quantity||1}</td>
              <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#fbbf24"}}>${Number(it.net_cost||it.unit_cost||0).toFixed(2)}</td>
              <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf",fontWeight:600}}>${Number(it.sell_price||it.list_price||0).toFixed(2)}</td>
            </tr>)}</tbody>
          </table>
          {aiResult.items.length>50&&<div style={{padding:10,textAlign:"center",color:"#525252",fontSize:12}}>Showing 50 of {aiResult.items.length}</div>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={()=>{setAiResult(null);setStep("config")}}>Back to Standard Parser</Btn>
          <Btn onClick={()=>importAiQuote(aiResult)} style={{padding:"12px 28px",fontSize:15,background:"#fbbf24",color:"#000"}}>{importing?"Importing...":"Import "+aiResult.items.length+" Items (AI)"}</Btn>
        </div>
      </Card>
    </div>}
  </div>;


  // CSV IMPORT FLOW
  if(mode==="csv")return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
      <span onClick={reset} style={{color:"#737373",cursor:"pointer",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.color="#2dd4bf"} onMouseLeave={e=>e.currentTarget.style.color="#737373"}>Data Import</span>
      <span style={{color:"#333"}}>/</span>
      <span style={{color:"#f0f0f0",fontWeight:600,fontSize:13}}>Import {target.charAt(0).toUpperCase()+target.slice(1)}</span>
    </div>


    {step==="upload"&&<>
      <div style={{display:"flex",gap:6,marginBottom:16}}>{["vendors","customers","reps"].map(t=><button key={t} onClick={()=>setTarget(t)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",background:target===t?"#2dd4bf":"#111",color:target===t?"#000":"#737373",fontSize:13,fontWeight:target===t?600:400,fontFamily:"inherit"}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
      {dropZone("Drop Excel or CSV file here","Supports .xls, .xlsx, .csv, and .tsv files. First row must be column headers.",".csv,.tsv,.txt",()=>fileRef.current?.click())}
      <Card style={{marginTop:16,padding:14}}>
        <div style={{fontSize:13,fontWeight:600,color:"#2dd4bf",marginBottom:6}}>Expected Columns for {target}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{MAPS[target]?.labels.map(l=><span key={l} style={{padding:"4px 10px",borderRadius:6,background:"rgba(45,212,191,0.08)",color:"#2dd4bf",fontSize:11,fontWeight:500}}>{l}</span>)}</div>
        <div style={{fontSize:12,color:"#525252",marginTop:8}}>Columns are auto-detected by name. Required fields marked with *</div>
      </Card>
    </>}


    {step==="map"&&csvData&&<Card>
      <div style={{fontSize:16,fontWeight:700,color:"#f0f0f0",marginBottom:4}}>Map Columns</div>
      <div style={{fontSize:13,color:"#a3a3a3",marginBottom:16}}>{csvData.rows.length} rows found. Map your CSV columns to the system fields.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}} className="resp-grid-2">
        {MAPS[target].fields.map((field,i)=><div key={field} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:130,fontSize:12,color:MAPS[target].labels[i].includes("*")?"#2dd4bf":"#a3a3a3",fontWeight:500}}>{MAPS[target].labels[i]}</div>
          <select value={colMap[field]||""} onChange={e=>setColMap({...colMap,[field]:e.target.value})} style={{...inputStyle,flex:1}}>
            <option value="">-- skip --</option>
            {csvData.headers.map(h=><option key={h} value={h}>{h}</option>)}
          </select>
        </div>)}
      </div>
      <div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",marginBottom:8}}>Preview (first 5 rows)</div>
      <div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#0a0a0a"}}>{MAPS[target].fields.filter(f=>colMap[f]).map(f=>
            <th key={f} style={{padding:"6px 10px",textAlign:"left",color:"#737373",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:10,textTransform:"uppercase"}}>{f}</th>
          )}</tr></thead>
          <tbody>{csvData.rows.slice(0,5).map((row,ri)=>{
            return <tr key={ri}>{MAPS[target].fields.filter(f=>colMap[f]).map((f,fi)=>{
              const val=row[colMap[f]]||"";
              const type=MAPS[target].types[MAPS[target].fields.indexOf(f)];
              const isValid=validate(val,type);
              return <td key={f} style={{padding:"6px 10px",borderBottom:"1px solid rgba(255,255,255,0.03)",color:isValid?"#c4c4c4":"#f87171"}}>{val||<span style={{color:"#333"}}>--</span>}</td>
            })}</tr>
          })}</tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={importCSV} style={importing?{opacity:0.6,pointerEvents:"none"}:{}}>{importing?"Importing...":"Import "+csvData.rows.length+" "+target.charAt(0).toUpperCase()+target.slice(1)}</Btn>
        <Btn v="secondary" onClick={()=>{setStep("upload");setCsvData(null)}}>Back</Btn>
      </div>
    </Card>}
  </div>;


  return null;
}




const MW_LOGO = "data:image/png;base64,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";




// ===============================================================
// MIDWEST EDUCATIONAL FURNISHINGS -- AI OPERATING SYSTEM v2
// Full Mutable State - PDF Export - QB Integration Guide
// ===============================================================


const INIT_VENDORS = [
  { id: "V001", name: "Smith System", contact: "Sales Dept", email: "info@smithsystem.com", phone: "(800) 328-1061", category: "Collaborative Tables", address: "1714 E 14th St, Plano, TX 75074", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V002", name: "Haskell Education", contact: "Sales Dept", email: "info@haskelleducation.com", phone: "(800) 334-8988", category: "Classroom Furniture", address: "1 Haskell Dr, Pittsburgh, PA 15205", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V003", name: "National Public Seating", contact: "Sales Dept", email: "info@nps.com", phone: "(800) 235-5912", category: "Seating & Staging", address: "901 Janesville Ave, Fort Atkinson, WI 53538", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V004", name: "KI", contact: "Sales Dept", email: "info@ki.com", phone: "(800) 424-2432", category: "Education & Office", address: "1330 Bellevue St, Green Bay, WI 54302", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V005", name: "MooreCo", contact: "Sales Dept", email: "info@mooreco.com", phone: "(800) 749-2258", category: "Whiteboards & AV", address: "2885 Lorraine Ave, Temple, TX 76501", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V006", name: "Jonti-Craft", contact: "Sales Dept", email: "info@jonti-craft.com", phone: "(800) 543-4149", category: "Early Childhood", address: "171 Highway 68, Wabasso, MN 56293", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V007", name: "Bretford", contact: "Sales Dept", email: "info@bretford.com", phone: "(800) 521-9614", category: "Technology & Charging", address: "11000 Seymour Ave, Franklin Park, IL 60131", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V008", name: "Diversified Spaces", contact: "Sales Dept", email: "info@diversifiedspaces.com", phone: "(800) 253-3684", category: "Science Lab Furniture", address: "Boyertown, PA 19512", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V009", name: "Fleetwood", contact: "Sales Dept", email: "info@fleetwood.com", phone: "(800) 257-6390", category: "Classroom & Mobile", address: "Holland, MI 49423", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V010", name: "Columbia Manufacturing", contact: "Sales Dept", email: "info@columbiamfg.com", phone: "(800) 882-3056", category: "Classroom Furniture", address: "Silver Creek, NY 14136", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V011", name: "Scholar Craft", contact: "Sales Dept", email: "info@scholarcraft.com", phone: "(800) 225-7188", category: "Classroom Furniture", address: "Birmingham, AL 35210", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V012", name: "Wenger", contact: "Sales Dept", email: "info@wengercorp.com", phone: "(800) 733-0393", category: "Music & Performing Arts", address: "555 Park Dr, Owatonna, MN 55060", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V013", name: "Palmer Hamilton", contact: "Sales Dept", email: "info@palmerhamilton.com", phone: "(800) 788-1028", category: "Cafeteria & Tables", address: "Elkhorn, WI 53121", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V014", name: "BioFit", contact: "Sales Dept", email: "info@biofit.com", phone: "(800) 597-0246", category: "Lab & STEM Seating", address: "Waterville, OH 43566", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V015", name: "Screenflex", contact: "Sales Dept", email: "info@screenflex.com", phone: "(800) 553-0110", category: "Room Dividers", address: "Lake Zurich, IL 60047", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V016", name: "ECR4Kids", contact: "Sales Dept", email: "info@ecr4kids.com", phone: "(855) 327-4543", category: "Early Childhood", address: "San Diego, CA 92127", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V017", name: "Academia", contact: "Sales Dept", email: "info@academiafurniture.com", phone: "(800) 448-0980", category: "Classroom Furniture", address: "Paoli, PA 19301", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V018", name: "Allied Products", contact: "Sales Dept", email: "info@alliedprod.com", phone: "(800) 247-5268", category: "Storage & Casework", address: "Fort Worth, TX 76106", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V019", name: "AmTab Manufacturing", contact: "Sales Dept", email: "info@amtab.com", phone: "(800) 424-2531", category: "Cafeteria & Folding Tables", address: "Schiller Park, IL 60176", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V020", name: "Artopex", contact: "Sales Dept", email: "info@artopex.com", phone: "(800) 363-9897", category: "Administration Office", address: "Granby, QC Canada", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V021", name: "Carpets for Kids", contact: "Sales Dept", email: "info@carpetsforkids.com", phone: "(800) 321-2318", category: "Carpets & Rugs", address: "Dalton, GA 30720", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V022", name: "Correll", contact: "Sales Dept", email: "info@correll.com", phone: "(800) 344-1692", category: "Activity & Folding Tables", address: "Raleigh, NC 27616", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V023", name: "Da-Lite", contact: "Sales Dept", email: "info@da-lite.com", phone: "(800) 622-3737", category: "AV & Projection", address: "Warsaw, IN 46580", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V024", name: "Eurotech Seating", contact: "Sales Dept", email: "info@eurotech.com", phone: "(800) 637-7002", category: "Office Seating", address: "New London, NC 28127", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V025", name: "Hamilton Buhl", contact: "Sales Dept", email: "info@hamiltonbuhl.com", phone: "(800) 631-0868", category: "AV & Headphones", address: "Fairfield, NJ 07004", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V026", name: "Luxor", contact: "Sales Dept", email: "info@luxorfurn.com", phone: "(800) 867-2018", category: "AV Carts & Stands", address: "Waukegan, IL 60085", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V027", name: "SICO", contact: "Sales Dept", email: "info@sicoinc.com", phone: "(800) 328-6138", category: "Stages & Mobile", address: "Minneapolis, MN 55420", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V028", name: "Muzo", contact: "Sales Dept", email: "info@muzo-works.com", phone: "(855) 689-6738", category: "Collaborative & Soft Seating", address: "Charlotte, NC 28217", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V029", name: "Mitchell Furniture", contact: "Sales Dept", email: "info@mitchellfurniture.com", phone: "(800) 327-3032", category: "Library Furniture", address: "Milwaukee, WI 53215", discountRate: 0, discountType: "percentage", discountNotes: "" },
  { id: "V030", name: "Joy Carpets", contact: "Sales Dept", email: "info@joycarpets.com", phone: "(800) 645-2787", category: "Carpets & Rugs", address: "Fort Oglethorpe, GA 30742", discountRate: 0, discountType: "percentage", discountNotes: "" },
];


const INIT_CUSTOMERS = [
  { id: "C001", name: "Naperville CUSD 203", contact: "Facilities Director", email: "facilities@naperville203.org", phone: "(630) 420-6300", type: "K-12 District", address: "203 W Hillside Rd, Naperville, IL 60540" },
  { id: "C002", name: "Elmhurst CUSD 205", contact: "Purchasing Dept", email: "purchasing@elmhurst205.org", phone: "(630) 617-2300", type: "K-12 District", address: "162 S York St, Elmhurst, IL 60126" },
  { id: "C003", name: "Milwaukee Public Schools", contact: "Procurement Office", email: "procurement@milwaukee.k12.wi.us", phone: "(414) 475-8001", type: "K-12 District", address: "5225 W Vliet St, Milwaukee, WI 53208" },
  { id: "C004", name: "College of DuPage", contact: "Facilities & Planning", email: "facilities@cod.edu", phone: "(630) 942-2800", type: "Community College", address: "425 Fawell Blvd, Glen Ellyn, IL 60137" },
];


// Team member role helpers -- Push 1 groundwork.
// getRoles returns a normalized roles array for a team member. If the member has
// an explicit `roles` array, that is used. Otherwise roles are derived from the
// legacy `tier` string so pre-existing records behave identically until edited.
// isSalesRep is the single source of truth for "should this person appear on
// sales/commission pages" -- Push 2 and 3 will use it everywhere.
function getRoles(member){
  if(!member)return[];
  if(Array.isArray(member.roles)&&member.roles.length>0)return member.roles;
  const t=(member.tier||"").toLowerCase();
  if(t==="owner")return["Owner"];
  if(t.includes("admin")||t.includes("office"))return["Office"];
  if(t.includes("sales")||t.includes("manager")||t.includes("rep"))return["Sales"];
  // Unknown/empty tier: default to Sales so existing app behavior (all reps on
  // sales pages) is preserved until the record is explicitly edited.
  return["Sales"];
}
function isSalesRep(member){return getRoles(member).includes("Sales");}


// Deterministic 6-char hash of a ship-to address string. Used to disambiguate
// PO doc numbers when a single job/vendor combination has line items going to
// multiple distinct shipping addresses. Returns empty string for empty/blank
// input so legacy POs (no per-line shipTo) keep their original doc numbers.
function shipKey(s){
  const norm=(s||'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  if(!norm)return '';
  let h=5381;
  for(let i=0;i<norm.length;i++)h=((h<<5)+h+norm.charCodeAt(i))|0;
  return Math.abs(h).toString(36).slice(0,6).toUpperCase();
}


const INIT_REPS = [
  { id: "S001", name: "Dave Welter", email: "dwelter@mwfurnishings.com", territory: "Illinois & Wisconsin", commissionRate: 0, tier: "Owner", roles: ["Owner", "Sales"] },
  { id: "S002", name: "Maureen Welter", email: "mwelter@mwfurnishings.com", territory: "Illinois & Wisconsin", commissionRate: 0, tier: "Owner", roles: ["Owner", "Office"] },
  { id: "S003", name: "Lisa Monchunski", email: "lmonchunski@mwfurnishings.com", territory: "Administrative", commissionRate: 0, tier: "Administrative Support", roles: ["Office"] },
  { id: "S004", name: "Jim Harris", email: "jharris@mwfurnishings.com", territory: "Illinois", commissionRate: 0.06, tier: "Regional Sales Manager", roles: ["Sales"], salesTier: "Regional Sales Manager" },
  { id: "S005", name: "Jim Lindner", email: "jlindner@mwfurnishings.com", territory: "Wisconsin", commissionRate: 0.06, tier: "Regional Sales Manager", roles: ["Sales"], salesTier: "Regional Sales Manager" },
  { id: "S006", name: "Jackie Biller", email: "jbiller@mwfurnishings.com", territory: "Wisconsin", commissionRate: 0.05, tier: "Sales Development Manager", roles: ["Sales"], salesTier: "Sales Development Manager" },
];


const INIT_LINE_ITEMS = [
  { id: "LI001", jobId: "JOB-2026-001", description: "Virco 9000 Series Student Chair (Navy)", vendor: "V001", tag: "", manufacturer: "", modelNumber: "9000-NVY", color: "Navy", unitCost: 78.50, unitPrice: 118.00, qtyOrdered: 240, qtyReceived: 240, qtyInvoiced: 240, poDate: "2026-01-20", deliveryDate: "2026-03-15", invoiceDate: "2026-03-20" },
  { id: "LI002", jobId: "JOB-2026-001", description: "Virco 785 Series Student Desk (Maple/Chrome)", vendor: "V001", unitCost: 142.00, unitPrice: 213.00, qtyOrdered: 240, qtyReceived: 240, qtyInvoiced: 240, poDate: "2026-01-20", deliveryDate: "2026-03-15", invoiceDate: "2026-03-20" },
  { id: "LI003", jobId: "JOB-2026-001", description: 'Smith System Interchange Wing Desk 24"x30"', vendor: "V002", unitCost: 215.00, unitPrice: 322.50, qtyOrdered: 60, qtyReceived: 60, qtyInvoiced: 60, poDate: "2026-01-22", deliveryDate: "2026-04-01", invoiceDate: "2026-04-05" },
  { id: "LI004", jobId: "JOB-2026-001", description: "Haskell Rover Mobile Storage Cart", vendor: "V003", unitCost: 489.00, unitPrice: 733.50, qtyOrdered: 12, qtyReceived: 12, qtyInvoiced: 12, poDate: "2026-01-25", deliveryDate: "2026-04-10", invoiceDate: "2026-04-15" },
  { id: "LI005", jobId: "JOB-2026-001", description: "NPS 6000 Series Folding Chair (Gray)", vendor: "V004", unitCost: 52.00, unitPrice: 78.00, qtyOrdered: 200, qtyReceived: 200, qtyInvoiced: 200, poDate: "2026-02-01", deliveryDate: "2026-04-20", invoiceDate: "2026-04-25" },
  { id: "LI006", jobId: "JOB-2026-002", description: "Smith System Planner Studio Table 72x30", vendor: "V002", unitCost: 485.00, unitPrice: 727.50, qtyOrdered: 30, qtyReceived: 22, qtyInvoiced: 22, poDate: "2026-02-10", deliveryDate: "2026-04-15", invoiceDate: "2026-04-20" },
  { id: "LI007", jobId: "JOB-2026-002", description: "MooreCo Essentials Mobile Whiteboard 4x6", vendor: "V007", unitCost: 389.00, unitPrice: 583.50, qtyOrdered: 15, qtyReceived: 15, qtyInvoiced: 0, poDate: "2026-02-12", deliveryDate: "2026-05-01", invoiceDate: "" },
  { id: "LI008", jobId: "JOB-2026-002", description: "Haskell Ethos Mobile Pedestal", vendor: "V003", unitCost: 312.00, unitPrice: 468.00, qtyOrdered: 30, qtyReceived: 18, qtyInvoiced: 18, poDate: "2026-02-15", deliveryDate: "2026-05-10", invoiceDate: "2026-05-15" },
  { id: "LI009", jobId: "JOB-2026-002", description: "Virco Zuma Series Rocker Chair", vendor: "V001", unitCost: 165.00, unitPrice: 247.50, qtyOrdered: 60, qtyReceived: 0, qtyInvoiced: 0, poDate: "2026-02-15", deliveryDate: "", invoiceDate: "" },
  { id: "LI010", jobId: "JOB-2026-002", description: "Brodart Omni Library Shelving 36x84", vendor: "V006", unitCost: 278.00, unitPrice: 417.00, qtyOrdered: 24, qtyReceived: 24, qtyInvoiced: 24, poDate: "2026-02-18", deliveryDate: "2026-04-28", invoiceDate: "2026-05-02" },
  { id: "LI011", jobId: "JOB-2026-003", description: "Virco Metaphor Series Combo Desk", vendor: "V001", unitCost: 198.00, unitPrice: 297.00, qtyOrdered: 120, qtyReceived: 80, qtyInvoiced: 80, poDate: "2026-03-01", deliveryDate: "2026-05-15", invoiceDate: "2026-05-20" },
  { id: "LI012", jobId: "JOB-2026-003", description: "NPS Melody Music Chair (Black)", vendor: "V004", unitCost: 86.00, unitPrice: 129.00, qtyOrdered: 50, qtyReceived: 0, qtyInvoiced: 0, poDate: "2026-03-05", deliveryDate: "", invoiceDate: "" },
  { id: "LI013", jobId: "JOB-2026-003", description: "Datum ThinStak Open Shelf Filing", vendor: "V005", unitCost: 342.00, unitPrice: 513.00, qtyOrdered: 8, qtyReceived: 8, qtyInvoiced: 0, poDate: "2026-03-05", deliveryDate: "2026-05-20", invoiceDate: "" },
  { id: "LI014", jobId: "JOB-2026-003", description: "Knape & Vogt Heavy Duty Bracket System", vendor: "V008", unitCost: 24.50, unitPrice: 36.75, qtyOrdered: 200, qtyReceived: 200, qtyInvoiced: 200, poDate: "2026-03-08", deliveryDate: "2026-04-25", invoiceDate: "2026-04-30" },
  { id: "LI015", jobId: "JOB-2026-004", description: "Smith System Flavors Nesting Chair", vendor: "V002", unitCost: 195.00, unitPrice: 292.50, qtyOrdered: 80, qtyReceived: 0, qtyInvoiced: 0, poDate: "", deliveryDate: "", invoiceDate: "" },
  { id: "LI016", jobId: "JOB-2026-004", description: "MooreCo MediaSpace Multimedia Table", vendor: "V007", unitCost: 625.00, unitPrice: 937.50, qtyOrdered: 10, qtyReceived: 0, qtyInvoiced: 0, poDate: "", deliveryDate: "", invoiceDate: "" },
  { id: "LI017", jobId: "JOB-2026-004", description: "Haskell Fuzion Instructor Station", vendor: "V003", unitCost: 1250.00, unitPrice: 1875.00, qtyOrdered: 4, qtyReceived: 0, qtyInvoiced: 0, poDate: "", deliveryDate: "", invoiceDate: "" },
];


const INIT_JOBS = [
  { id: "JOB-2026-001", name: "Lincoln USD Summer Refresh", customer: "C001", salesRep: "S001", phase: "Invoiced", createdDate: "2026-01-15", startDate: "2026-01-20", endDate: "2026-05-28", dueDate: "2026-06-01", notes: "Full classroom furniture refresh for 12 elementary classrooms. Summer install window.", paymentStatus: "paid", terms: "Net 30", poNumber: "", shipTo: "", shipVia: "", billTo: "", orderNotes: "", docStatuses: {}, activities: [] },
  { id: "JOB-2026-002", name: "Midwest Tech STEM Lab Build-Out", customer: "C002", salesRep: "S001", phase: "In Progress", createdDate: "2026-02-03", startDate: "2026-02-10", endDate: "", dueDate: "2026-07-15", notes: "New STEM lab + library media center. Multi-vendor job -- partial shipments expected.", paymentStatus: "partial", terms: "Net 30", poNumber: "", shipTo: "", shipVia: "", billTo: "", orderNotes: "", docStatuses: {}, activities: [] },
  { id: "JOB-2026-003", name: "Oakwood Elementary ADA Compliance", customer: "C003", salesRep: "S002", phase: "In Progress", createdDate: "2026-02-20", startDate: "2026-03-01", endDate: "", dueDate: "2026-08-01", notes: "ADA-compliant furniture replacements across 3 buildings. Music room + admin offices.", paymentStatus: "unpaid", terms: "Net 30", poNumber: "", shipTo: "", shipVia: "", billTo: "", orderNotes: "", docStatuses: {}, activities: [] },
  { id: "JOB-2026-004", name: "Heritage Academy New Classroom Wing", customer: "C004", salesRep: "S003", phase: "Quoting", createdDate: "2026-03-05", startDate: "", endDate: "", dueDate: "2026-09-01", notes: "Brand new wing -- 4 classrooms, 1 media room. Awaiting final budget approval from board.", paymentStatus: "unpaid", terms: "Net 30", poNumber: "", shipTo: "", shipVia: "", billTo: "", orderNotes: "", docStatuses: {}, activities: [] },
];


// --- ICONS ---------------------------------------------------
const I = ({ n, s = 18 }) => {
  const d = { dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z", briefcase: "M2 7h20v14H2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2", truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z", dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", chart: "M18 20V10M12 20V4M6 20v-6", check: "M20 6L9 17l-5-5", alert: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01", file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", send: "M22 2L11 13M22 2l-7 20-4-9-9-4z", plus: "M12 5v14M5 12h14", close: "M18 6L6 18M6 6l12 12", receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 6h8M8 10h8M8 14h5", shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", brain: "M9.5 2A5.5 5.5 0 004 7.5c0 1.5.5 2.8 1.3 3.8A5 5 0 004 14.5 5.5 5.5 0 009.5 20h1V2zM14.5 2A5.5 5.5 0 0120 7.5c0 1.5-.5 2.8-1.3 3.8A5 5 0 0120 14.5 5.5 5.5 0 0114.5 20h-1V2z", package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12", edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z", settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z", download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3", book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2.5 2.5 0 012.5-2.5H20v15H6.5", target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z", upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12", search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35", "external-link": "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d[n]||""}/></svg>;
};


// --- UTILS ---------------------------------------------------
const fmt = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const fmtN = n => new Intl.NumberFormat("en-US").format(n);
const pct = n => `${n.toFixed(1)}%`;
const uid = () => Math.random().toString(36).substr(2,9);
const exportCSV = (headers, rows, filename) => {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => '"'+(String(c).replace(/"/g,'""'))+'"').join(','))].join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};
const statusColor = s => ({complete:"#34d399",paid:"#34d399",invoiced:"#34d399",partial:"#fbbf24","in progress":"#fbbf24",received:"#a78bfa",ordered:"#525252",not_started:"#525252",unpaid:"#f87171",quoting:"#8b5cf6"}[s?.toLowerCase()]||"#525252");
const inputStyle = {width:"100%",padding:"11px 14px",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#d4d4d4",fontSize:13,outline:"none",fontFamily:"inherit"};


// --- SHARED COMPONENTS ---------------------------------------


function usePrintOverlay() {
  const triggerPrint = (title, html) => {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow popups for PDF export'); return; }
    const fname = (title || 'document').replace(/[^a-zA-Z0-9-_ ]/g, '');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{font-family:Satoshi,Arial,sans-serif;padding:40px;color:#111;max-width:760px;margin:0 auto}' +
      'h2{font-size:14px;color:#666;margin:16px 0 8px}' +
      'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}' +
      'th{background:#f5f5f4;padding:8px;text-align:left;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;color:#666}' +
      'td{padding:8px;border-bottom:1px solid #eee}' +
      '.total-row td{border-top:2px solid #2dd4bf;font-weight:bold;font-size:14px}' +
      '.hdr{display:flex;justify-content:space-between;margin-bottom:24px}' +
      '.hdr div{font-size:12px;color:#666}' +
      '.co{font-size:18px;font-weight:bold;color:#111}' +
      '.gold{color:#b8923c}' +
      '.dl-bar{position:fixed;top:0;left:0;right:0;background:#111;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:999;border-bottom:2px solid #2dd4bf}' +
      '.dl-bar button{padding:10px 24px;font-size:14px;font-weight:700;border:none;border-radius:6px;cursor:pointer}' +
      '@media print{.dl-bar{display:none!important}}' +
      '</style></head><body>' +
      '<div class="dl-bar">' +
      '<button id="dl-btn" style="background:#2dd4bf;color:#111">Download PDF</button>' +
      '<button onclick="window.close()" style="background:#333;color:#fff">Close</button>' +
      '<span style="color:#666;font-size:13px;margin-left:12px" id="dl-status">Preview - click Download PDF to save</span>' +
      '</div>' +
      '<div style="margin-top:56px">' + html + '</div>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>' +
      '<script>' +
      'document.getElementById("dl-btn").onclick=function(){' +
        'var el=document.querySelector("[style*=margin-top]");' +
        'document.getElementById("dl-status").textContent="Generating PDF...";' +
        'document.getElementById("dl-btn").disabled=true;' +
        'html2pdf().set({' +
          'margin:[10,10,10,10],' +
          'filename:"' + fname + '.pdf",' +
          'image:{type:"jpeg",quality:0.98},' +
          'html2canvas:{scale:2,useCORS:true},' +
          'jsPDF:{unit:"mm",format:"letter",orientation:"portrait"},' +
          'pagebreak:{mode:["css","legacy"],before:".page-break-before"}' +
        '}).from(el).save().then(function(){' +
          'document.getElementById("dl-status").textContent="PDF downloaded!";' +
          'document.getElementById("dl-btn").disabled=false;' +
        '}).catch(function(){' +
          'document.getElementById("dl-status").textContent="Download failed - try Save As PDF from print";' +
          'document.getElementById("dl-btn").disabled=false;' +
          'window.print();' +
        '});' +
      '};' +
      '<\/script>' +
      '</body></html>');
    w.document.close();
    w.focus();
  };
  const PrintOverlay = () => null;
  return { triggerPrint, PrintOverlay };
}


// ===============================================================
// MAIN APP -- Supabase-backed with Auth
// ===============================================================


// --- CONFIRM DIALOG ------------------------------------------
function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise(resolve => setState({ message, resolve }));
  const ConfirmDialog = () => {
    if (!state) return null;
    const respond = (val) => { state.resolve(val); setState(null); };
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => respond(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#111111", border: "1px solid #222222", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e5e5e5", marginBottom: 16 }}>{state.message}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => respond(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "#222222", color: "#d4d4d4", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={() => respond(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#f87171", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
          </div>
        </div>
      </div>
    );
  };
  return { confirm, ConfirmDialog };
}




// ===============================================================
// SHAREABLE QUOTE PORTAL (customer-facing, no login required)
// ===============================================================
function ShareQuotePortal({quoteData,onApprove}){
  const [approved,setApproved]=useState(()=>{if(quoteData?.approved)return true;try{const stored=localStorage.getItem("quote_approved_"+(quoteData?.docNum||""));if(stored)return true}catch{}return false});
  if(!quoteData)return null;
  const {job,customer,items,total,docNum,terms}=quoteData;
  const t=job?.terms||terms||"Net 30";
  const today=new Date().toLocaleDateString();
  return <div style={{minHeight:"100vh",background:"#fff",color:"#111",fontFamily:"'Satoshi',sans-serif"}}>
    <div style={{maxWidth:960,margin:"0 auto",padding:"32px 24px"}}>
      {/* Header with logo */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><img src={MW_LOGO} alt="MW" style={{height:56,width:56,borderRadius:10,objectFit:"contain",flexShrink:0}}/><div><div style={{fontSize:16,fontWeight:700}}>Midwest Educational Furnishings, Inc.</div><div style={{fontSize:11,color:"#888"}}>21191 N Valley Rd, Kildeer, IL 60047 US | (847) 847-1865</div></div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:700}}>QUOTE</div>{docNum&&<div style={{fontSize:13,marginTop:2}}>{docNum}</div>}<div style={{fontSize:12,color:"#888",marginTop:4}}>Date: {today}</div></div>
      </div>
      <div style={{textAlign:"center",padding:"6px 0",marginBottom:16,fontSize:11,color:"#888"}}>Designing Spaces | Building Futures | WBE Certified Enterprise</div>
      {/* Prepared For / Ship To */}
      <div style={{display:"flex",gap:24,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>PREPARED FOR</div><div style={{fontSize:13,lineHeight:1.6}}>{job?.billTo||customer?.name||""}{customer?.address?<><br/>{fmtAddrJsx(customer.address)}</>:null}{customer?.contact?<><br/>{"Attn: "+customer.contact}</>:null}</div></div>
        <div style={{flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>SHIP TO</div><div style={{fontSize:13,lineHeight:1.6}}>{job?.shipTo?fmtShipJsx(job.shipTo):<>{customer?.name||""}{customer?.address&&<><br/>{fmtAddrJsx(customer.address)}</>}{customer?.contact&&<><br/>{"Attn: "+customer.contact}</>}</>}</div></div>
        <div style={{textAlign:"right",minWidth:160}}><div style={{fontSize:12,color:"#888"}}>Project: {job?.name||""}</div>{job?.poNumber&&<div style={{fontSize:12,color:"#888"}}>PO#: {job.poNumber}</div>}<div style={{fontSize:12,color:"#888"}}>Terms: {t}</div></div>
      </div>
      {/* Table - exact same columns as PDF export */}
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:16}}>
        <thead><tr style={{borderBottom:"2px solid #222"}}>{(()=>{const hc=quoteData.hiddenCols||{manuf:true,model:true,shippingEach:true,shippingTotal:true,installEach:true,installTotal:true};return [{key:"tag",label:"TAG"},{key:"manuf",label:"MANUF."},{key:"model",label:"MODEL #"},{key:"description",label:"DESCRIPTION"},{key:"color",label:"COLOR"},{key:"qty",label:"QTY"},{key:"netCost",label:"NET COST"},{key:"netTotal",label:"NET TOTAL"},{key:"shippingEach",label:"SHIPPING EACH"},{key:"shippingTotal",label:"SHIPPING TOTAL"},{key:"installEach",label:"INSTALL EACH"},{key:"installTotal",label:"INSTALL TOTAL"},{key:"unitPrice",label:"YOUR PRICE"},{key:"lineTotal",label:"LINE TOTAL"}].filter(c=>!hc[c.key]).map((c,i)=><th key={c.key} style={{padding:"6px 4px",textAlign:["tag","manuf","model","description","color"].includes(c.key)?"left":"right",fontSize:10,fontWeight:700,color:"#2dd4bf",whiteSpace:"nowrap"}}>{c.label}</th>)})()}</tr></thead>
        <tbody>{(items||[]).map((item,i)=>{const hc=quoteData.hiddenCols||{manuf:true,model:true,shippingEach:true,shippingTotal:true,installEach:true,installTotal:true};const ship=item.shippingPerUnit||0;const inst=item.installPerUnit||0;const qty=item.qtyOrdered||0;const price=item.unitPrice||0;const ext=item.priceExtended&&item.priceExtended>0?item.priceExtended:(price)*qty;const cells=[{key:"tag",v:item.tag||""},{key:"manuf",v:item.manufacturer||""},{key:"model",v:item.modelNumber||""},{key:"description",v:item.description||""},{key:"color",v:item.color||""},{key:"qty",v:qty,a:"right"},{key:"netCost",v:"$"+(item.unitCost||0).toFixed(2),a:"right"},{key:"netTotal",v:"$"+((item.unitCost||0)*qty).toFixed(2),a:"right"},{key:"shippingEach",v:ship>0?"$"+ship.toFixed(2):"",a:"right"},{key:"shippingTotal",v:ship>0?"$"+(ship*qty).toFixed(2):"",a:"right"},{key:"installEach",v:inst>0?"$"+inst.toFixed(2):"",a:"right"},{key:"installTotal",v:inst>0?"$"+(inst*qty).toFixed(2):"",a:"right"},{key:"unitPrice",v:"$"+price.toFixed(2),a:"right"},{key:"lineTotal",v:"$"+ext.toFixed(2),a:"right",b:true}];return <tr key={i} style={{borderBottom:"1px solid #e5e5e5"}}>{cells.filter(c=>!hc[c.key]).map(c=><td key={c.key} style={{padding:"6px 4px",textAlign:c.a||"left",fontWeight:c.b?600:400,whiteSpace:c.key==="description"?"pre-line":undefined}}>{c.v}</td>)}</tr>})}</tbody>
      </table></div>
      <div style={{textAlign:"right",fontSize:16,fontWeight:700,marginBottom:8}}>TOTAL: ${(total||0).toFixed(2)}</div>
      {job?.shipVia&&<div style={{fontSize:12,color:"#666",marginBottom:8}}><strong>Ship Via:</strong> {job.shipVia}</div>}
      <div style={{padding:12,background:"#f9f8f6",borderRadius:8,fontSize:12,color:"#666",marginBottom:24}}>Quote valid for 30 days. Prices subject to manufacturer availability. Payment terms: {t}.</div>
      {/* Approve button */}
      {!approved?<div style={{textAlign:"center",padding:"20px 0"}}><button onClick={()=>{setApproved(true);if(onApprove)onApprove();try{localStorage.setItem("quote_approved_"+(docNum||""),Date.now().toString());if(window.BroadcastChannel){const bc=new BroadcastChannel("mw_quote_approval");bc.postMessage({docNum:docNum,status:"approved"});bc.close()}}catch{}}} style={{padding:"16px 48px",borderRadius:12,border:"none",background:"#2dd4bf",color:"#000",fontSize:18,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(45,212,191,0.3)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}>Approve Quote</button><div style={{fontSize:12,color:"#888",marginTop:8}}>By clicking Approve, you authorize Midwest Educational Furnishings to proceed with this order.</div></div>
      :<div style={{textAlign:"center",padding:"24px 0"}}><div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 36px",background:"#d1fae5",borderRadius:12,color:"#065f46",fontSize:18,fontWeight:700}}>&#10003; Quote Approved</div><div style={{fontSize:12,color:"#888",marginTop:8}}>Thank you. Midwest Educational Furnishings has been notified and will begin processing your order.</div></div>}
    </div>
  </div>;
}




function MidwestAIOSInner() {
  // Shared quote portal - check URL hash on load
  const [sharedQuote,setSharedQuote]=useState(()=>{try{const h=window.location.hash;if(h.startsWith("#quote=")){return JSON.parse(atob(h.slice(7)))}return null}catch{return null}});


  // Auth state
  const [currentUser, setCurrentUser] = useState(()=>{try{return JSON.parse(sessionStorage.getItem("mw_user"))}catch{return null}});
  const [loginError, setLoginError] = useState("");
  const [showLegacyLogin, setShowLegacyLogin] = useState(true);
  // Clerk auth integration
  // Clerk auth integration - safe calls (only work when ClerkProvider wraps the app)
  const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  let clerkUser={user:null,isLoaded:true,isSignedIn:false},clerkAuth={isSignedIn:false},clerkSignOut=()=>{};
  try{clerkUser=useUser();clerkAuth=useAuth();const ck=useClerk();clerkSignOut=ck.signOut}catch{}
  // Auto-set currentUser from Clerk when signed in
  useEffect(()=>{
    if(clerkEnabled&&clerkUser.isLoaded&&clerkUser.isSignedIn&&clerkUser.user&&!currentUser){
      const cu=clerkUser.user;
      const email=(cu.primaryEmailAddress?.emailAddress||"").toLowerCase();
      const clerkId=cu.id;
      // Check for role override in CLERK_USER_ROLES settings
      const rolesRecord=(customSops||[]).find(s=>s.id==="CLERK_USER_ROLES"&&s.cat==="Settings");
      let storedRoles={};try{storedRoles=rolesRecord?JSON.parse(rolesRecord.content||"{}"):{};}catch{}
      const existingRole=storedRoles["clerk-"+clerkId];
      // New users default to "office" role (not admin) -- Maureen can upgrade in Users & Permissions
      const role=existingRole?.role||"office";
      const pages=existingRole?.pages||undefined;
      const mapped={id:"clerk-"+clerkId,name:cu.fullName||cu.firstName||email,username:email,role,email,clerkId:"clerk-"+clerkId,avatar:cu.imageUrl,pages,source:"clerk"};
      setCurrentUser(mapped);sessionStorage.setItem("mw_user",JSON.stringify(mapped));
      // Auto-register this Clerk user if not already in the roles store
      if(!existingRole){
        const updated={...storedRoles,["clerk-"+clerkId]:{role:"office",name:cu.fullName||cu.firstName||email,email,avatar:cu.imageUrl,pages:["dashboard","jobs","deliveries","documents","salesportal","playbook","tasks","notes","brain"],createdAt:new Date().toISOString()}};
        addSop({id:"CLERK_USER_ROLES",title:"Clerk User Roles",cat:"Settings",icon:"shield",content:JSON.stringify(updated),custom:true});
      }
    }
    if(clerkEnabled&&clerkUser.isLoaded&&!clerkUser.isSignedIn&&currentUser?.clerkId){
      setCurrentUser(null);sessionStorage.removeItem("mw_user");
    }
  },[clerkUser.isLoaded,clerkUser.isSignedIn]);
  const userRole = currentUser?.role || null; // admin, office, sales
  const userRepId = currentUser?.rep_id || null;
  const logout = () => { setCurrentUser(null); sessionStorage.removeItem("mw_user"); if(clerkEnabled&&clerkAuth.isSignedIn)clerkSignOut().catch(()=>{}); };


  const [page, setPage] = useState("dashboard");
  useEffect(()=>{if(page==="jobs"&&window._brainNavJob){setSelectedJob(window._brainNavJob);window._brainNavJob=null}},[page]);


  const [pendingCommPreview, setPendingCommPreview] = useState(null);
  const [pendingBrainFile, setPendingBrainFile] = useState(null);
  const [pendingBrainEmail, setPendingBrainEmail] = useState(null);
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [lineItems, setLineItems] = useState(INIT_LINE_ITEMS);
  const [reps, setReps] = useState(INIT_REPS);
  const [vendors, setVendors] = useState(INIT_VENDORS);
  const [customers, setCustomers] = useState(INIT_CUSTOMERS);
  const [customSops, setCustomSops] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); setSearchQuery(""); } if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  // STABLE jobNum across users: stored on the job record itself (persists in Supabase),
  // so all browsers see the same MW number for the same underlying job regardless of
  // their local jobs-array length or load timing. If a job is missing a stored jobNum,
  // we compute it deterministically (sort by createdDate ASC, then id ASC) and queue
  // a save back via db.saveJob so the value sticks. The sort key is universal across
  // browsers, so any browser assigning legacy numbers picks the SAME number for the
  // same job (provided their jobs arrays have synced via realtime). After this runs
  // once across the team, every job has a permanent stored jobNum.
  // CRITICAL: never call setJobs synchronously inside this function -- jobNum is
  // called during render, and setJobs in render triggers infinite re-render. Defer
  // via setTimeout(...,0) to escape the render phase. Track migrated job IDs in a
  // ref-Set so each legacy save fires exactly once per session per job.
  const jobNumMigrated = useRef(new Set());
  const jobNum = (jobId) => {
    const j = jobs.find(j => j.id === jobId);
    if (!j) return 'MW-0000';
    if (j.jobNum) return j.jobNum;
    const sorted = [...jobs].sort((a,b)=>(a.createdDate||'').localeCompare(b.createdDate||'')||a.id.localeCompare(b.id));
    const idx = sorted.findIndex(x => x.id === jobId);
    const computed = 'MW-'+String(idx+1).padStart(4,'0');
    if (!jobNumMigrated.current.has(jobId)) {
      jobNumMigrated.current.add(jobId);
      setTimeout(() => {
        try {
          if (db && typeof db.saveJob === 'function') {
            db.saveJob({...j, jobNum: computed}).catch(()=>{});
          }
          setJobs(p => p.map(x => x.id === jobId ? {...x, jobNum: computed} : x));
        } catch {}
      }, 0);
    }
    return computed;
  };
  const searchResults = searchQuery.length < 2 ? [] : [
    ...jobs.filter(j => j.name.toLowerCase().includes(searchQuery.toLowerCase()) || j.id.toLowerCase().includes(searchQuery.toLowerCase()) || (jobNum(j.id)||"").toLowerCase().includes(searchQuery.toLowerCase())).map(j => ({ type: "Job", name: j.name, sub: j.id + " - " + j.phase, id: j.id, action: () => { setSelectedJob(j.id); setPage("jobs"); setSearchOpen(false); } })),
    ...vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map(v => ({ type: "Vendor", name: v.name, sub: v.category + " - " + (v.discountRate * 100).toFixed(0) + "% discount", id: v.id, action: () => { setPage("directory"); setSearchOpen(false); } })),
    ...customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => ({ type: "Customer", name: c.name, sub: c.type, id: c.id, action: () => { setPage("directory"); setSearchOpen(false); } })),
    ...reps.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.id.includes("SEED_FLAG")).map(r => ({ type: "Rep", name: r.name, sub: r.territory + " - " + r.tier, id: r.id, action: () => { setPage("commissions"); setSearchOpen(false); } })),
    ...lineItems.filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8).map(i => { const j = jobs.find(j => j.id === i.jobId); return { type: "Item", name: i.description, sub: (j?.name || "") + " - " + fmtN(i.qtyOrdered) + " units", id: i.id, action: () => { if (j) { setSelectedJob(j.id); setPage("jobs"); } setSearchOpen(false); } }; }),
  ].slice(0, 12);
  const [notification, setNotification] = useState(null);
  const [brainQuery, setBrainQuery] = useState("");
  const [brainLoading, setBrainLoading] = useState(false);
  const [brainHistory, setBrainHistory] = useState([{role:"system",content:"Welcome to the Midwest Brain. I'm connected to Claude Sonnet 4.6 and have access to all your live data -- jobs, vendors, customers, deliveries, financials, SOPs, notes, and tasks. Ask me anything."}]);


  const [dbStatus, setDbStatus] = useState("connecting");
  const [appReady, setAppReady] = useState(false);
  const { triggerPrint, PrintOverlay } = usePrintOverlay();
  const { confirm, ConfirmDialog } = useConfirm();
  const [globalSearch, setGlobalSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(()=>{try{return sessionStorage.getItem("mw_date_filter")||"all"}catch{return "all"}}); // all, month, quarter, ytd


  useEffect(()=>{try{sessionStorage.setItem("mw_date_filter",dateFilter)}catch{}},[dateFilter]);
  const notify = (msg, type="success") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3500); };


  // --- LOAD FROM SUPABASE ON MOUNT ---------------------------
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const data = await db.loadAll();
        const hasData = (data.jobs && data.jobs.length > 0) || (data.vendors && data.vendors.length > 0) || (data.reps && data.reps.length > 0) || (data.customers && data.customers.length > 0);
        
        if (hasData) {
          // Database has data -- load it. Never overwrite.
          if (data.vendors && data.vendors.length > 0) setVendors(data.vendors.filter(v=>v.name && !v.id.includes("SEED_FLAG")));
          if (data.customers && data.customers.length > 0) setCustomers(data.customers);
          if (data.reps && data.reps.length > 0) setReps(data.reps.filter(r=>r.name && !r.id.includes("SEED_FLAG")));
          if (data.jobs && data.jobs.length > 0) setJobs(data.jobs);
          if (data.lineItems && data.lineItems.length > 0) setLineItems(data.lineItems);
          if (data.sops && data.sops.length > 0) {
            // Deduplicate SOPs -- keep latest version of each ID
            const deduped = [];const seen = new Set();
            for (let i = data.sops.length - 1; i >= 0; i--) {
              if (!seen.has(data.sops[i].id)) { seen.add(data.sops[i].id); deduped.unshift(data.sops[i]); }
              else { db.deleteSop(data.sops[i].id).catch(()=>{}); } // Clean up duplicate from DB
            }
            setCustomSops(deduped);
          }
        } else {
          // Database is completely empty (first-time setup only) -- seed with sample data
          await db.seedSafe(INIT_JOBS, INIT_LINE_ITEMS, INIT_VENDORS, INIT_CUSTOMERS, INIT_REPS);
          const fresh = await db.loadAll();
          if (fresh.vendors) setVendors(fresh.vendors);
          if (fresh.customers) setCustomers(fresh.customers);
          if (fresh.reps) setReps(fresh.reps);
          if (fresh.jobs) setJobs(fresh.jobs);
          if (fresh.lineItems) setLineItems(fresh.lineItems);
          if (fresh.sops) setCustomSops(fresh.sops);
        }


        setDbStatus("connected");
        setAppReady(true);
      } catch (e) {
        console.error("Supabase load error:", e);
        setDbStatus("error");
        setAppReady(true);
      }
    };
    loadFromDb();
  }, []);


  // Force re-fetch ALL data from Supabase (ensures consistency between users)
  const syncAll=async()=>{
    try{
      const d=await db.loadAll();
      if(d.jobs)setJobs(d.jobs);if(d.vendors)setVendors(d.vendors);if(d.customers)setCustomers(d.customers);
      if(d.reps)setReps(d.reps);if(d.lineItems)setLineItems(d.lineItems);if(d.sops)setCustomSops(d.sops);
      notify("Data synced -- "+(d.lineItems||[]).length+" line items, "+(d.jobs||[]).length+" jobs");
    }catch(e){notify("Sync error: "+e.message,"error")}
  };






  // --- REALTIME COLLABORATION ---
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState("off");
  useEffect(() => {
    if (!appReady || !currentUser) return;
    // Connect to Supabase Realtime
    db.connectRealtime();
    setRealtimeStatus("connected");
    // Track this user's presence
    db.trackPresence(currentUser);
    const presenceInterval = setInterval(() => db.trackPresence(currentUser), 30000);


    // Subscribe to table changes from OTHER users
    const unsubs = [];
    unsubs.push(db.onTableChange('jobs', (evt) => {
      if (!evt.record) return;
      const mapped = db.jobFromDb(evt.record);
      if (evt.type === 'INSERT') setJobs(p => p.some(j => j.id === mapped.id) ? p : [...p, mapped]);
      if (evt.type === 'UPDATE') setJobs(p => p.map(j => j.id === mapped.id ? mapped : j));
      if (evt.type === 'DELETE' && evt.oldRecord) setJobs(p => p.filter(j => j.id !== evt.oldRecord.id));
    }));
    unsubs.push(db.onTableChange('line_items', (evt) => {
      if (!evt.record) return;
      const mapped = db.liFromDb(evt.record);
      if (evt.type === 'INSERT') setLineItems(p => p.some(i => i.id === mapped.id) ? p : [...p, mapped]);
      if (evt.type === 'UPDATE') setLineItems(p => p.map(i => i.id === mapped.id ? mapped : i));
      if (evt.type === 'DELETE' && evt.oldRecord) setLineItems(p => p.filter(i => i.id !== evt.oldRecord.id));
    }));
    unsubs.push(db.onTableChange('vendors', (evt) => {
      if (!evt.record) return;
      const mapped = db.vendorFromDb(evt.record);
      if (evt.type === 'INSERT') setVendors(p => p.some(v => v.id === mapped.id) ? p : [...p, mapped]);
      if (evt.type === 'UPDATE') setVendors(p => p.map(v => v.id === mapped.id ? mapped : v));
      if (evt.type === 'DELETE' && evt.oldRecord) setVendors(p => p.filter(v => v.id !== evt.oldRecord.id));
    }));
    unsubs.push(db.onTableChange('customers', (evt) => {
      if (!evt.record) return;
      const mapped = db.custFromDb(evt.record);
      if (evt.type === 'INSERT') setCustomers(p => p.some(c => c.id === mapped.id) ? p : [...p, mapped]);
      if (evt.type === 'UPDATE') setCustomers(p => p.map(c => c.id === mapped.id ? mapped : c));
      if (evt.type === 'DELETE' && evt.oldRecord) setCustomers(p => p.filter(c => c.id !== evt.oldRecord.id));
    }));
    unsubs.push(db.onTableChange('reps', (evt) => {
      if (!evt.record) return;
      const mapped = db.repFromDb(evt.record);
      if (evt.type === 'INSERT') setReps(p => p.some(r => r.id === mapped.id) ? p : [...p, mapped]);
      if (evt.type === 'UPDATE') setReps(p => p.map(r => r.id === mapped.id ? mapped : r));
      if (evt.type === 'DELETE' && evt.oldRecord) setReps(p => p.filter(r => r.id !== evt.oldRecord.id));
    }));
    unsubs.push(db.onTableChange('sops', (evt) => {
      if (!evt.record) return;
      const mapped = db.sopFromDb(evt.record);
      if (evt.type === 'INSERT') setCustomSops(p => p.some(s => s.id === mapped.id) ? p.map(s => s.id === mapped.id ? mapped : s) : [...p, mapped]);
      if (evt.type === 'UPDATE') setCustomSops(p => p.map(s => s.id === mapped.id ? mapped : s));
      if (evt.type === 'DELETE' && evt.oldRecord) setCustomSops(p => p.filter(s => s.id !== evt.oldRecord.id));
    }));
    // Presence tracking
    unsubs.push(db.onPresence((msg) => {
      try {
        if (msg.event === 'presence_state') {
          const users = Object.values(msg.payload || {}).flat().map(p => p.metas?.[0] || p).filter(p => p.name);
          setOnlineUsers(users);
        }
        if (msg.event === 'presence_diff') {
          const joins = Object.values(msg.payload?.joins || {}).flat().map(p => p.metas?.[0] || p);
          const leaves = Object.values(msg.payload?.leaves || {}).flat().map(p => p.metas?.[0] || p);
          setOnlineUsers(prev => {
            let next = [...prev.filter(u => !leaves.some(l => l.user_id === u.user_id)), ...joins.filter(j => j.name)];
            const seen = new Set(); return next.filter(u => { if (seen.has(u.user_id)) return false; seen.add(u.user_id); return true; });
          });
        }
      } catch {}
    }));


    return () => { unsubs.forEach(fn => fn()); clearInterval(presenceInterval); db.disconnectRealtime(); setRealtimeStatus("off"); };
  }, [appReady, currentUser?.id]);


  // App-scope Plaid auto-sync. This runs regardless of which page the user
  // is viewing, ensuring transactions stay current even if she never opens
  // the Banking tab. The FinancialsPage-scoped auto-sync still handles UI
  // feedback when she IS on Banking; both share the same 12-min throttle
  // through localStorage.mw_plaid_last_sync, so they never double-fire.
  useEffect(() => {
    if (!appReady) return;
    let cancelled = false;

    const runSilentSync = async () => {
      if (cancelled) return;
      try {
        const tok = localStorage.getItem("mw_plaid_access_token");
        const stat = localStorage.getItem("mw_plaid_status");
        if (!tok || stat !== "connected") return;
        // Throttle: skip if last sync was less than 12 min ago.
        const lastStr = localStorage.getItem("mw_plaid_last_sync") || "";
        const last = lastStr ? new Date(lastStr) : null;
        const minsSince = last ? ((Date.now() - last.getTime()) / 60000) : 999;
        if (minsSince < 12) return;
        // Determine sync window. Default to quarter (3 months) for catch-up.
        const range = (localStorage.getItem("mw_plaid_sync_range") || "quarter");
        const useRange = (range === "custom" || range === "all") ? "quarter" : range;
        const now = new Date();
        const endPad = new Date(now); endPad.setDate(endPad.getDate() + 2);
        const endDate = endPad.toISOString().split("T")[0];
        let startDate;
        if (useRange === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); startDate = d.toISOString().split("T")[0]; }
        else if (useRange === "6months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); startDate = d.toISOString().split("T")[0]; }
        else if (useRange === "year") { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); startDate = d.toISOString().split("T")[0]; }
        else if (useRange === "2years") { const d = new Date(now); d.setFullYear(d.getFullYear() - 2); startDate = d.toISOString().split("T")[0]; }
        else { const d = new Date(now); d.setMonth(d.getMonth() - 3); startDate = d.toISOString().split("T")[0]; }
        // Overlap startDate backward by 14 days from last sync to catch late-posted transactions.
        if (lastStr) {
          try {
            const overlap = new Date(lastStr); overlap.setDate(overlap.getDate() - 14);
            const overlapStr = overlap.toISOString().split("T")[0];
            if (overlapStr < startDate) startDate = overlapStr;
          } catch {}
        }
        const r = await fetch("/api/plaid-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: tok, start_date: startDate, end_date: endDate })
        });
        if (cancelled) return;
        const data = await r.json();
        if (!r.ok || data.error_code || data.error) {
          // Silent failure: persist the error to localStorage so the Banking tab
          // can surface it whenever the user lands there (no toast for silent runs).
          try { localStorage.setItem("mw_plaid_sync_error", data.error_message || data.error?.message || data.error || "Sync failed"); } catch {}
          return;
        }
        try { localStorage.removeItem("mw_plaid_sync_error"); } catch {}
        const txns = data.added || data.transactions || [];
        if (cancelled) return;
        // Build dedup sets fresh from current customSops state via setCustomSops
        // updater (lets us read the latest value without depending on closure).
        setCustomSops(prev => {
          if (cancelled) return prev;
          const manualTxns = (prev || []).filter(s => s.cat === "ManualTxn").map(s => { try { return { id: s.id, ...JSON.parse(s.content) }; } catch { return null; } }).filter(Boolean);
          const existingPlaidIds = new Set(manualTxns.filter(mt => mt.plaidId).map(mt => mt.plaidId));
          // Use shared _bankTxnHash for both build and candidate-check so manual entries
          // (amount stored as string "125") and Plaid records (amount as number 125.00)
          // collapse into the same key "...|125.00|...".
          const existingHashes = new Set(manualTxns.map(mt => _bankTxnHash(mt)));
          const additions = [];
          let imported = 0;
          for (const t of txns) {
            if (t.transaction_id && existingPlaidIds.has(t.transaction_id)) continue;
            const hash = _bankTxnHash({date: t.date, amount: t.amount, description: t.name || t.merchant_name || ''});
            if (existingHashes.has(hash)) continue;
            if (t.transaction_id) existingPlaidIds.add(t.transaction_id);
            existingHashes.add(hash);
            const id = "TXN-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) + "-" + imported;
            const isDebit = t.amount > 0;
            const sopRecord = {
              id, title: t.name || t.merchant_name || "Bank transaction", cat: "ManualTxn", icon: "dollar",
              content: JSON.stringify({
                date: t.date || "", description: t.name || t.merchant_name || "",
                category: t.personal_finance_category?.primary || "Uncategorized",
                amount: String(Math.abs(t.amount).toFixed(2)),
                type: isDebit ? "expense" : "revenue", account: t.account_id || "Operating",
                plaidId: t.transaction_id, plaidCategory: t.category?.join(" > ") || ""
              }), custom: true
            };
            additions.push(sopRecord);
            // Persist to Supabase via db.saveSop (fire-and-forget, same pattern as addSop).
            try { db.deleteSop(sopRecord.id).then(() => db.saveSop(sopRecord)).catch(() => {}); } catch {}
            imported++;
          }
          if (additions.length === 0) return prev;
          return [...prev, ...additions];
        });
        const syncTime = new Date().toISOString();
        try { localStorage.setItem("mw_plaid_last_sync", syncTime); } catch {}
      } catch (err) {
        try { localStorage.setItem("mw_plaid_sync_error", err.message || "Network error"); } catch {}
      }
    };

    // Fire immediately on app mount if last sync was > 5 min ago.
    const initialTimer = setTimeout(runSilentSync, 2000);
    // Then every 15 minutes regardless of which page is active.
    const intervalId = setInterval(runSilentSync, 900000);
    return () => { cancelled = true; clearTimeout(initialTimer); clearInterval(intervalId); };
  }, [appReady]);


  // --- DERIVED COMPUTATIONS ----------------------------------
  const getJobItems = jobId => { const filtered = []; for (let i = 0; i < lineItems.length; i++) { if (lineItems[i].jobId === jobId) filtered.push(lineItems[i]); } return filtered; };
  const getJobFinancials = jobId => {
    const items = getJobItems(jobId);
    const rawCost = items.reduce((s,i)=>s+(i.unitCost||0)*(i.qtyOrdered||0),0);
    // Cost adjustments: standalone vendor credits (reduce cost) and standalone
    // vendor bills not tied to a PO (increase cost). Both live in customSops
    // with cat 'VendorCredit' or 'StandaloneBill'. Each record has
    // { vendorId, vendorName, jobId, amount, creditDate, refNumber, memo }
    // serialized in content. Pulling them into getJobFinancials propagates the
    // adjustment everywhere the app reads cost/margin -- Dashboard, Jobs list,
    // JobDetail, Customer360, Vendor360, SalesPortal, Commissions, Financials,
    // and Brain context -- with no per-page changes required.
    let creditSum = 0;
    let standaloneBillSum = 0;
    try {
      if (Array.isArray(customSops)) {
        for (let i = 0; i < customSops.length; i++) {
          const s = customSops[i];
          if (!s || (s.cat !== 'VendorCredit' && s.cat !== 'StandaloneBill')) continue;
          let d = null;
          try { d = JSON.parse(s.content || '{}'); } catch { continue; }
          if (!d || d.jobId !== jobId) continue;
          if (d.void === true) continue; // voided bills/credits stay on record for the audit trail but have no cost effect
          const amt = Number(d.amount);
          if (!isFinite(amt) || amt <= 0) continue;
          if (s.cat === 'VendorCredit') creditSum += amt;
          else standaloneBillSum += amt;
        }
      }
    } catch {}
    const totalCost = Math.max(0, rawCost + standaloneBillSum - creditSum);
    const totalRevenue = items.reduce((s,i)=>s+(i.priceExtended&&i.priceExtended>0?i.priceExtended:((i.unitPrice||0)*(i.qtyOrdered||0))),0);
    const margin = totalRevenue>0?((totalRevenue-totalCost)/totalRevenue*100):0;
    const totalReceived = items.reduce((s,i)=>s+(i.qtyReceived||0),0);
    const totalOrdered = items.reduce((s,i)=>s+(i.qtyOrdered||0),0);
    const totalInvoiced = items.reduce((s,i)=>s+(i.unitPrice||0)*(i.qtyInvoiced||0),0);
    return {totalCost,totalRevenue,margin,totalReceived,totalOrdered,totalInvoiced,itemCount:items.length,rawCost,creditSum,standaloneBillSum};
  };
  const getItemStatus = i => {
    if(i.qtyReceived>=i.qtyOrdered && i.qtyInvoiced>=i.qtyOrdered) return "complete";
    if(i.qtyReceived>0 && i.qtyReceived<i.qtyOrdered) return "partial";
    if(i.qtyReceived>=i.qtyOrdered && i.qtyInvoiced<i.qtyOrdered) return "received";
    return "ordered";
  };
  const getJobPOStatus = jobId => { const items=getJobItems(jobId); if(!items.length) return "not_started"; return items.every(i=>i.qtyReceived>=i.qtyOrdered)?"complete":items.some(i=>i.qtyReceived>0)?"partial":"ordered"; };
  const getJobInvStatus = jobId => { const items=getJobItems(jobId); if(!items.length) return "not_started"; return items.every(i=>i.qtyInvoiced>=i.qtyOrdered)?"complete":items.some(i=>i.qtyInvoiced>0)?"partial":"not_started"; };

  // Commission is paid on PROFIT (revenue - cost), NOT revenue. Single source of truth --
  // every UI surface (Dashboard, Sales Portal, Commissions page, statement PDF, dashboard
  // KPIs, Brain summaries, exports) routes through this. Profit clamped at >= 0 so a
  // loss-making job does NOT generate a negative commission claim against the rep.
  const _commissionFor = (jobId, rate) => {
    const f = getJobFinancials(jobId);
    const profit = (f.totalRevenue || 0) - (f.totalCost || 0);
    return Math.max(0, profit) * (rate || 0);
  };

  // Banking transaction dedup key. Single source of truth used by every code path that
  // either checks for or builds dedup keys for ManualTxn records:
  //   1. Top-level auto-Plaid-sync (line ~1380)
  //   2. FinancialsPage manual Plaid-sync handler (line ~10019)
  //   3. Manual UI add via saveTxn (line ~9944)
  //   4. Brain create_transaction tool (line ~6708)
  // Format: date|amount-abs-to-2-decimals|description-first-12-chars-lowercase.
  // Manual entries store amount as a string ("125"); Plaid pushes a number (125.00).
  // Without identical normalization, a manual record at "125" and a Plaid record at
  // 125.00 produce different hashes and bypass dedup. Math.abs(parseFloat).toFixed(2)
  // normalizes both into the same key "125.00". The 12-char description prefix matches
  // the prior Plaid implementation to avoid collapsing distinct same-day same-amount
  // transactions (e.g., two separate Amazon purchases) into a single record.
  const _bankTxnHash = (rec) => {
    const date = String(rec?.date || '').trim();
    const amt = Math.abs(parseFloat(rec?.amount) || 0).toFixed(2);
    const desc = String(rec?.description || '').slice(0, 12).toLowerCase().trim();
    return date + '|' + amt + '|' + desc;
  };


  // BANKING TRANSACTION DEDUP -- Single source of truth used by:
  //   1. FinancialsPage manual "Add Entry" form (saveTxn)
  //   2. Brain create_transaction tool (executeTool branch)
  //   3. FinancialsPage Plaid sync (handlePlaidSync)
  //   4. App-level silent Plaid auto-sync (1378+)
  //
  // Three key types:
  //   - plaid:<plaidId>          -- Canonical Plaid identity. Use whenever present.
  //   - acct:<date>|<amt>|<desc12>|<account>  -- Per-account hash (NEW, hardens against
  //                                              two same-day same-amount same-merchant
  //                                              transfers between different accounts).
  //   - hash:<date>|<amt>|<desc12>            -- Legacy hash (date+amount+desc only).
  //                                              Kept for backward compatibility with
  //                                              records imported before per-account keys.
  //
  // Amount is always normalized to absolute value with 2 decimals to avoid sign and
  // float-precision collisions ("123" vs "123.00" vs "-123").
  const _normTxnAmt = (a) => { const n = Number(String(a||'').replace(/[^0-9.\-]/g,'')); return isFinite(n) ? String(Math.abs(n).toFixed(2)) : '0.00'; };
  const _normTxnDesc = (d) => String(d||'').toLowerCase().trim().slice(0, 12);
  const _buildTxnKeys = (t) => {
    const keys = [];
    if (t.plaidId) keys.push('plaid:' + t.plaidId);
    const date = String(t.date || '');
    const amt = _normTxnAmt(t.amount);
    const desc = _normTxnDesc(t.description || t.name || t.merchant_name || '');
    const acct = String(t.account || '');
    if (date && amt !== '0.00') {
      keys.push('hash:' + date + '|' + amt + '|' + desc);
      if (acct) keys.push('acct:' + date + '|' + amt + '|' + desc + '|' + acct);
    }
    return keys;
  };
  // Build a Set of every existing transaction's dedup keys. Reads from current customSops
  // state. Callers that need atomicity (e.g. inside setCustomSops updater) should pass the
  // updater-provided prev array; otherwise pass the latest customSops.
  const _buildExistingTxnKeys = (sopsArr) => {
    const set = new Set();
    (sopsArr || customSops || []).filter(s => s.cat === 'ManualTxn').forEach(s => {
      try { const t = { id: s.id, ...JSON.parse(s.content) }; _buildTxnKeys(t).forEach(k => set.add(k)); } catch {}
    });
    return set;
  };
  // Test a candidate against an existing-keys Set. Mutates the set with the candidate's
  // keys so subsequent candidates in the same batch also collide. Returns the matching
  // key (truthy) on dup, or null if the candidate is new.
  const _checkTxnDup = (candidate, keysSet) => {
    const keys = _buildTxnKeys(candidate);
    for (const k of keys) { if (keysSet.has(k)) return k; }
    keys.forEach(k => keysSet.add(k));
    return null;
  };


  // --- MUTATORS (update state + save to Supabase) ------------
  const updateLineItem = (id, u) => {
    setLineItems(p => { const old=p.find(li=>li.id===id);const updated = p.map(li => li.id===id ? {...li,...u} : li); const item = updated.find(li=>li.id===id); if(item){db.saveLineItem(item);const changes=Object.keys(u).filter(k=>String(old?.[k])!==String(u[k]));if(changes.length>0){const log={time:new Date().toISOString(),type:"edit",entity:"lineItem",entityId:id,desc:(old?.description||"item"),fields:changes.map(k=>({field:k,from:old?.[k],to:u[k]}))};setTimeout(()=>{setJobs(jp=>{const jobId=item.jobId;return jp.map(j=>{if(j.id!==jobId)return j;const trail=[log,...(j.auditTrail||[])].slice(0,200);const nj={...j,auditTrail:trail};db.saveJob(nj);return nj})})},0)}} return updated; });
  };
  let _liSeq=0;
  const addLineItem = item => {
    _liSeq++;
    const newItem = {...item, id: item.id||("LI-"+Date.now()+"-"+String(_liSeq).padStart(3,'0')+"-"+Math.random().toString(36).slice(2,6))};
    setLineItems(p => [...p, newItem]);
    db.saveLineItem(newItem).then(r=>{if(!r?.ok){setTimeout(()=>db.saveLineItem(newItem).catch(()=>{}),2000)}}).catch(()=>{setTimeout(()=>db.saveLineItem(newItem).catch(()=>{}),2000)});
  };
  const deleteLineItem = async (id) => {
    if (!await confirm("Delete this line item? This cannot be undone.")) return;
    setLineItems(p => p.filter(li => li.id !== id));
    db.deleteLineItem(id);
  };
  const forceDeleteLineItem = (id) => { setLineItems(p => p.filter(li => li.id !== id)); db.deleteLineItem(id); };
  const updateJob = (id, u) => {
    setJobs(p => { const old=p.find(j=>j.id===id);const updated = p.map(j => j.id===id ? {...j,...u} : j); const job = updated.find(j=>j.id===id); if(job){const skip=new Set(["activities","docStatuses","auditTrail"]);const changes=Object.keys(u).filter(k=>!skip.has(k)&&String(old?.[k])!==String(u[k]));if(changes.length>0){const log={time:new Date().toISOString(),type:"edit",entity:"job",entityId:id,user:currentUser?.name||"System",fields:changes.map(k=>({field:k,from:old?.[k],to:u[k]}))};const trail=[log,...(job.auditTrail||[])].slice(0,200);job.auditTrail=trail}db.saveJob(job)} return updated; });
  };
  const addJob = (job) => {
    // Assign a stable jobNum at creation if the caller didn't supply one. Compute as
    // max(existing jobNums)+1, so new jobs always get the highest number even if
    // some legacy jobs haven't been migrated yet. This is the SAME formula every
    // browser uses, so a job created in one browser will display as the same MW
    // number on all other browsers once realtime syncs the record.
    let newJob = job;
    if (!newJob.jobNum) {
      let maxNum = 0;
      jobs.forEach(j => {
        if (typeof j.jobNum === 'string') {
          const m = j.jobNum.match(/^MW-(\d+)$/);
          if (m) { const n = parseInt(m[1],10); if (n > maxNum) maxNum = n; }
        }
      });
      const floor = jobs.length + 1;
      const next = Math.max(maxNum + 1, floor);
      newJob = {...job, jobNum: 'MW-'+String(next).padStart(4,'0')};
    }
    setJobs(p => [...p, newJob]);
    db.saveJob(newJob).then(r=>{if(!r?.ok){setTimeout(()=>db.saveJob(newJob).catch(()=>{}),2000)}}).catch(()=>{setTimeout(()=>db.saveJob(newJob).catch(()=>{}),2000)});
  };
  const deleteJob = async (id) => {
    if (!await confirm("Delete this entire job and all its line items? This cannot be undone.")) return;
    // Delete all line items for this job first
    const jobItems = lineItems.filter(li => li.jobId === id);
    for (const item of jobItems) { db.deleteLineItem(item.id); }
    setLineItems(p => p.filter(li => li.jobId !== id));
    setJobs(p => p.filter(j => j.id !== id));
    db.deleteJob(id);
    setSelectedJob(null);
    notify("Job and all line items deleted");
  };
  const updateRep = (id, u) => {
    setReps(p => { const updated = p.map(r => r.id===id ? {...r,...u} : r); const rep = updated.find(r=>r.id===id); if(rep) db.saveRep(rep); return updated; });
  };
  const addRep = rep => { const newRep = {...rep, id: rep.id||("S-"+uid())}; setReps(p => [...p, newRep]); db.saveRep(newRep).then(r=>{if(!r?.ok)setTimeout(()=>db.saveRep(newRep).catch(()=>{}),2000)}).catch(()=>setTimeout(()=>db.saveRep(newRep).catch(()=>{}),2000)); };
  const deleteRep = async (id) => { if (!await confirm("Delete this sales rep? Their jobs will be unassigned.")) return; setReps(p => p.filter(r => r.id !== id)); db.deleteRep(id); };
  const forceDeleteRep = (id) => { setReps(p => p.filter(r => r.id !== id)); db.deleteRep(id); };
  const addCustomer = c => { const nc = {...c, id: c.id||("C-"+uid())}; setCustomers(p => [...p, nc]); db.saveCustomer(nc).then(r=>{if(!r?.ok)setTimeout(()=>db.saveCustomer(nc).catch(()=>{}),2000)}).catch(()=>setTimeout(()=>db.saveCustomer(nc).catch(()=>{}),2000)); };
  const updateCustomer = (id, u) => {
    setCustomers(p => { const updated = p.map(c => c.id===id ? {...c,...u} : c); const cust = updated.find(c=>c.id===id); if(cust) db.saveCustomer(cust); return updated; });
  };
  const deleteCustomer = async (id) => { if (!await confirm("Delete this customer? Their jobs will be unlinked.")) return; setCustomers(p => p.filter(c => c.id !== id)); db.deleteCustomer(id); };
  const forceDeleteCustomer = (id) => { setCustomers(p => p.filter(c => c.id !== id)); db.deleteCustomer(id); };
  const addSop = (sop) => { setCustomSops(p => { const exists = p.findIndex(s => s.id === sop.id); if (exists >= 0) { const updated = [...p]; updated[exists] = sop; return updated; } return [...p, sop]; }); db.deleteSop(sop.id).then(()=>db.saveSop(sop)); };
  // Line-item ship-to override store: persists per-line shipTo addresses in a dedicated
  // sops record (LINE_ITEM_SHIP_TO_GLOBAL). This sidesteps the supabase.js line_items
  // write path which currently drops the ship_to column on save. The sops table is known
  // to round-trip reliably (same channel as DOC_STATUSES_GLOBAL, tasks, notes, etc).
  const lineItemShipTos = (()=>{const r=(customSops||[]).find(s=>s.id==="LINE_ITEM_SHIP_TO_GLOBAL");if(!r)return {};try{return JSON.parse(r.content)||{}}catch{return {}}})();
  const setLineItemShipTo = (itemId, val) => {
    if(!itemId)return;
    const cur = (()=>{const r=(customSops||[]).find(s=>s.id==="LINE_ITEM_SHIP_TO_GLOBAL");if(!r)return {};try{return JSON.parse(r.content)||{}}catch{return {}}})();
    const next = {...cur};
    if(val&&String(val).trim())next[itemId]=val;else delete next[itemId];
    addSop({id:"LINE_ITEM_SHIP_TO_GLOBAL",title:"Line Item Ship-To Overrides",cat:"LineItemShipTo",icon:"truck",content:JSON.stringify(next),custom:true});
  };
  const deleteSop = (id) => { setCustomSops(p => p.filter(s => s.id !== id)); db.deleteSop(id); };
  // ===========================================================================
  // Cross-device Plaid connection sync.
  // The Plaid access token, status, bank name, and last-sync timestamp are
  // mirrored into a sops record (PLAID_CONN_STATE) so they propagate via Supabase
  // realtime to every device the user logs in on. Local code paths still read
  // from localStorage as before -- this effect simply keeps localStorage in sync
  // with the source-of-truth sops record. This means: Maureen connects on her
  // laptop, opens the app on her phone, and the phone immediately shows
  // 'connected' to the same bank without needing to re-link.
  useEffect(() => {
    if (!appReady) return;
    try {
      const rec = (customSops || []).find(s => s.id === 'PLAID_CONN_STATE');
      if (!rec) return;
      const data = JSON.parse(rec.content || '{}');
      // Mirror each field into localStorage if the sops record has a newer or
      // different value. We treat the sops record as the source of truth: if it
      // says disconnected, we clear localStorage; if it has a token, we set it.
      if (data.status === 'connected' && data.accessToken) {
        if (localStorage.getItem('mw_plaid_access_token') !== data.accessToken) {
          localStorage.setItem('mw_plaid_access_token', data.accessToken);
        }
        if (localStorage.getItem('mw_plaid_status') !== 'connected') {
          localStorage.setItem('mw_plaid_status', 'connected');
        }
        if (data.bankName && localStorage.getItem('mw_plaid_bank_name') !== data.bankName) {
          localStorage.setItem('mw_plaid_bank_name', data.bankName);
        }
        // Only update lastSync if the sops record has a NEWER timestamp than
        // localStorage. This prevents a stale sops record from overwriting a
        // fresher local sync timestamp during the brief race window after a sync.
        if (data.lastSync) {
          const localLast = localStorage.getItem('mw_plaid_last_sync') || '';
          if (!localLast || data.lastSync > localLast) {
            localStorage.setItem('mw_plaid_last_sync', data.lastSync);
          }
        }
      } else if (data.status === 'disconnected') {
        // Remote disconnect: clear local cache too.
        if (localStorage.getItem('mw_plaid_access_token')) {
          localStorage.removeItem('mw_plaid_access_token');
          localStorage.removeItem('mw_plaid_status');
          localStorage.removeItem('mw_plaid_bank_name');
        }
      }
    } catch {}
  }, [customSops, appReady]);
  const addVendor = v => { const nv = {...v, id: v.id||("V-"+uid())}; setVendors(p => [...p, nv]); db.saveVendor(nv).then(r=>{if(!r?.ok)setTimeout(()=>db.saveVendor(nv).catch(()=>{}),2000)}).catch(()=>setTimeout(()=>db.saveVendor(nv).catch(()=>{}),2000)); };
  const updateVendor = (id, u) => {
    setVendors(p => { const updated = p.map(v => v.id===id ? {...v,...u} : v); const ven = updated.find(v=>v.id===id); if(ven) db.saveVendor(ven); return updated; });
  };
  const deleteVendor = async (id) => { if (!await confirm("Delete this vendor? Line items will be unlinked.")) return; setVendors(p => p.filter(v => v.id !== id)); db.deleteVendor(id); };
  const forceDeleteVendor = (id) => { setVendors(p => p.filter(v => v.id !== id)); db.deleteVendor(id); };


  // Role-scoped job visibility: sales-role users only ever see the jobs assigned
  // to them. Declared here, BEFORE the sidebar badge math, so the badges, the nav,
  // and every page all read from the same filtered set.
  const visibleJobs = userRole === "sales" && userRepId ? jobs.filter(j => j.salesRep === userRepId) : jobs;
  const _visibleJobIds = userRole === "sales" && userRepId ? new Set(visibleJobs.map(j => j.id)) : null;
  // Badge counts for sidebar -- computed from the user's VISIBLE jobs and items so
  // a sales login sees their own counts, not the whole company's.
  const pendingDeliveries = lineItems.filter(i=>(!_visibleJobIds||_visibleJobIds.has(i.jobId))&&i.qtyReceived<i.qtyOrdered).length;
  const pendingInvoices = lineItems.filter(i=>(!_visibleJobIds||_visibleJobIds.has(i.jobId))&&i.qtyReceived>i.qtyInvoiced).length;
  const overdueCount = visibleJobs.filter(j=>j.dueDate&&new Date(j.dueDate)<new Date()&&j.phase!=="Complete"&&j.paymentStatus!=="paid").length;


  const navItems = [
    {id:"dashboard",label:"Command Center",icon:"dashboard",badge:null,badgeColor:"#f87171"},
    {id:"jobs",label:"Job Records",icon:"briefcase",badge:visibleJobs.length||null,badgeColor:"#2dd4bf"},
    {id:"directory",label:"Directory",icon:"users"},
    {id:"deliveries",label:"Delivery Tracker",icon:"truck",badge:pendingDeliveries||null,badgeColor:"#fbbf24"},
    {id:"documents",label:"Documents",icon:"file",badge:pendingInvoices||null,badgeColor:"#2dd4bf"},
    {id:"files",label:"Files",icon:"package"},
    {id:"commissions",label:"Commissions",icon:"dollar"},
    {id:"financials",label:"Financials",icon:"dollar"},
    {id:"salesportal",label:"Sales Portal",icon:"users"},
    {id:"prospects",label:"Prospects",icon:"target"},
    {id:"playbook",label:"Playbook & SOPs",icon:"book"},
    {id:"tasks",label:"Tasks",icon:"check"},
    {id:"notes",label:"Notes",icon:"file"},
    {id:"brain",label:"Brain",icon:"brain"},
    {id:"exitready",label:"Exit Readiness",icon:"shield"},


    {id:"usermgmt",label:"Users & Permissions",icon:"shield"},
  ].filter(item => {
    // Check for custom page-level permissions (stored in Supabase users.pages column)
    const customPages=(()=>{
      if(currentUser?.pages&&Array.isArray(currentUser.pages))return currentUser.pages;
      if(currentUser?.pages&&typeof currentUser.pages==='string'){try{return JSON.parse(currentUser.pages)}catch{}}
      return null;
    })();
    if(customPages){
      if(item.id==="usermgmt")return currentUser.role==="admin";
      return customPages.includes(item.id);
    }
    if (userRole === "admin") return true;
    if (item.id === "usermgmt") return false;
    if (userRole === "office") return !["financials","commissions","exitready"].includes(item.id);
    if (userRole === "sales") return ["dashboard","jobs","documents","deliveries","tasks","notes","brain","salesportal"].includes(item.id);
    return true;
  });


  
  // Hard page guard: the sidebar already hides pages a role cannot open, but page
  // state can also be set programmatically (Brain navigation, in-app links). Any
  // attempt to navigate outside the user's allowed set is coerced to their first
  // allowed page. Customer/Vendor 360 are drill-in subpages reached from allowed
  // pages and render exclusively from role-filtered ctx data, so they pass through.
  const _allowedPageIds = new Set([...navItems.map(i=>i.id),"customer360","vendor360"]);
  const ctx = {jobs:visibleJobs,allJobs:jobs,setJobs,jobNum,currentUser,userRole,userRepId,logout,lineItems,setLineItems,reps,setReps,vendors,customers,setCustomers,setVendors,selectedJob,setSelectedJob,showNewJob,setShowNewJob,notify,getJobItems,getJobFinancials,getItemStatus,getJobPOStatus,getJobInvStatus,_commissionFor,_bankTxnHash,updateLineItem,addLineItem,deleteLineItem,updateJob,addJob,deleteJob,updateRep,addRep,deleteRep,addCustomer,updateCustomer,deleteCustomer,addVendor,updateVendor,deleteVendor,forceDeleteVendor,forceDeleteLineItem,forceDeleteCustomer,forceDeleteRep,db,lineItemShipTos,setLineItemShipTo,setPage:p=>{const _tp=_allowedPageIds.has(p)?p:(navItems[0]?.id||"dashboard");setPage(_tp);setMobileMenuOpen(false);window.scrollTo(0,0);const mc=document.querySelector('.main-content');if(mc)mc.scrollTop=0},viewCustomer:id=>{setPage("customer360");window._viewCustId=id;window.scrollTo(0,0)},brainQuery,setBrainQuery,customSops,addSop,deleteSop,brainLoading,setBrainLoading,brainHistory,setBrainHistory,triggerPrint,dbStatus,confirm,globalSearch,setGlobalSearch,dateFilter,setDateFilter,pendingCommPreview,setPendingCommPreview,pendingBrainFile,setPendingBrainFile,pendingBrainEmail,setPendingBrainEmail};


  const loadingScreen = (
<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",width:"100vw",background:"#0a0a0a",fontFamily:"'Satoshi',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <img src={MW_LOGO} alt="MW" style={{height:44,width:44,borderRadius:8,objectFit:"contain",flexShrink:0}}/>
        <div style={{fontSize:16,fontWeight:600,color:"#2dd4bf",marginBottom:8}}>Midwest Educational Furnishings</div>
        <div style={{fontSize:12,color:"#a3a3a3",marginBottom:20}}>AI Operating System</div>
        <div style={{width:120,height:3,background:"#222222",borderRadius:2,margin:"0 auto",overflow:"hidden"}}><div style={{width:"40%",height:"100%",background:"#2dd4bf",borderRadius:2,animation:"loadSlide 1.2s ease-in-out infinite"}}/></div>
        <style>{"@keyframes loadSlide{0%{transform:translateX(-100%)}50%{transform:translateX(150%)}100%{transform:translateX(-100%)}}"}</style>
        <div style={{fontSize:12,color:"#8a8a8a",marginTop:16}}>Connecting to database...</div>
      </div>
    </div>
  );




  // Login screen
  // Login screen rendered conditionally in main return
  const loginScreen = <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",width:"100vw",background:"#000",fontFamily:"'Satoshi',sans-serif",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0}}>
      <div style={{position:"absolute",top:"-15%",left:"-5%",width:"45vw",height:"45vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(45,212,191,0.08) 0%,transparent 65%)",animation:"floatA 14s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"-10%",right:"-5%",width:"35vw",height:"35vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(167,139,250,0.06) 0%,transparent 65%)",animation:"floatA 18s ease-in-out infinite reverse"}}/>
    </div>
    <style>{"@keyframes floatA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-15px,20px) scale(0.97)}}"}</style>
    <div style={{width:"100%",maxWidth:420,padding:32,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{display:"inline-block",width:100,height:100,borderRadius:22,overflow:"hidden",marginBottom:20,boxShadow:"0 0 40px rgba(45,212,191,0.15)"}}><img src={MW_LOGO} alt="MW" style={{height:100,width:100,objectFit:"contain"}}/></div>
        <div style={{fontSize:24,fontWeight:800,color:"#f0f0f0",fontFamily:"'Satoshi',sans-serif",letterSpacing:-0.5}}>Midwest Educational Furnishings</div>
        <div style={{fontSize:14,color:"#a3a3a3",marginTop:8,letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>AI OPERATING SYSTEM</div>
      </div>
      {clerkEnabled&&!showLegacyLogin?
        <><div style={{display:"flex",justifyContent:"center"}}><SignIn routing="hash" appearance={{elements:{rootBox:{width:"100%"},card:{backgroundColor:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(220%) brightness(1.15)",WebkitBackdropFilter:"blur(8px) saturate(220%) brightness(1.15)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"22px",boxShadow:"0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",padding:"24px"},formButtonPrimary:{background:"linear-gradient(135deg,#2dd4bf,#14b8a6)",color:"#000",fontWeight:700,borderRadius:"12px",padding:"14px",fontSize:"15px",boxShadow:"0 4px 20px rgba(45,212,191,0.25)"},socialButtonsBlockButton:{border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",backgroundColor:"rgba(0,0,0,0.5)",color:"#f0f0f0",padding:"12px"},formFieldInput:{backgroundColor:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",color:"#f0f0f0",padding:"14px 16px",fontSize:"16px"},headerTitle:{color:"#f0f0f0",fontSize:"18px",fontWeight:700},headerSubtitle:{color:"#a3a3a3",fontSize:"13px"},dividerLine:{borderColor:"rgba(255,255,255,0.06)"},dividerText:{color:"#525252"},footer:{display:"none"}}}}/></div>
          <div style={{textAlign:"center",marginTop:16}}><button onClick={()=>setShowLegacyLogin(true)} style={{background:"none",border:"none",color:"#525252",fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#a3a3a3"} onMouseLeave={e=>e.currentTarget.style.color="#525252"}>Sign in with username instead</button></div></>
      :
        <><div style={{background:"rgba(17,17,17,0.45)",backdropFilter:"blur(8px) saturate(220%) brightness(1.15)",WebkitBackdropFilter:"blur(8px) saturate(220%) brightness(1.15)",borderRadius:22,border:"1px solid rgba(255,255,255,0.12)",padding:32,boxShadow:"0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#f0f0f0",marginBottom:6}}>Sign In</div>
          <div style={{fontSize:13,color:"#a3a3a3",marginBottom:20}}>Enter your credentials to access the system</div>
          {clerkEnabled&&<div><div style={{display:"flex",gap:10,marginBottom:16}}>
            <button onClick={()=>setShowLegacyLogin(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.4)",color:"#f0f0f0",fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.3)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}}>Apple</button>
            <button onClick={()=>setShowLegacyLogin(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.4)",color:"#f0f0f0",fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.3)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}}>Google</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/><span style={{fontSize:12,color:"#525252"}}>or</span><div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/></div></div>}
          <div style={{marginBottom:16}}><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:6}}>Username</label><input id="lu" placeholder="Enter username" autoFocus autoComplete="username" style={{width:"100%",padding:"14px 16px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#f0f0f0",fontSize:16,fontFamily:"'Satoshi',sans-serif",outline:"none",boxSizing:"border-box",transition:"border 0.2s"}} onFocus={e=>e.target.style.borderColor="rgba(45,212,191,0.4)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/></div>
          <div style={{marginBottom:24}}><label style={{fontSize:13,color:"#c4c4c4",display:"block",marginBottom:6}}>Password</label><input id="lp" type="password" placeholder="Enter password" autoComplete="current-password" style={{width:"100%",padding:"14px 16px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#f0f0f0",fontSize:16,fontFamily:"'Satoshi',sans-serif",outline:"none",boxSizing:"border-box",transition:"border 0.2s"}} onFocus={e=>e.target.style.borderColor="rgba(45,212,191,0.4)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"} onKeyDown={e=>{if(e.key==="Enter")document.getElementById("loginBtn").click()}}/></div>
          {loginError&&<div style={{fontSize:13,color:"#f87171",marginBottom:16,textAlign:"center",padding:"10px 14px",background:"rgba(248,113,113,0.06)",borderRadius:10,border:"1px solid rgba(248,113,113,0.12)"}}>{loginError}</div>}
          <button id="loginBtn" onClick={async()=>{setLoginError("");const u=document.getElementById("lu").value.trim().toLowerCase();const p=document.getElementById("lp").value;if(!u||!p){setLoginError("Enter username and password");return}const user=await db.loginUser(u,p);if(user){setCurrentUser(user);sessionStorage.setItem("mw_user",JSON.stringify(user))}else{setLoginError("Invalid username or password")}}} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#2dd4bf,#14b8a6)",color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Satoshi',sans-serif",transition:"all 0.2s",boxShadow:"0 4px 20px rgba(45,212,191,0.25)"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(45,212,191,0.35)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 20px rgba(45,212,191,0.25)"}}>Sign In</button>
        </div></>
      }


    </div>
  </div>;


const sharedScreen = sharedQuote ? <ShareQuotePortal quoteData={sharedQuote} onApprove={()=>setSharedQuote({...sharedQuote,approved:true})}/> : null;
  if (sharedScreen) return sharedScreen;
  if (!appReady) return loadingScreen;
  if (!currentUser) return loginScreen;


  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",fontFamily:"'Satoshi','Satoshi',sans-serif",background:"#000000",color:"#d4d4d4",overflow:"hidden"}}>
      <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet"/><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {searchOpen&&<div style={{position:"fixed",inset:0,zIndex:99998,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"15vh"}}><div onClick={()=>setSearchOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(40px) saturate(180%)",WebkitBackdropFilter:"blur(40px) saturate(180%)"}}/><div style={{position:"relative",width:"100%",maxWidth:560,background:"#111111",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)",overflow:"hidden",animation:"fadeUp 0.2s cubic-bezier(0.25,0.1,0.25,1)"}}><div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:12}}><I n="search" s={18}/><input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search jobs, vendors, customers, items..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e5e5e5",fontSize:16,fontFamily:"inherit"}}/><span style={{fontSize:12,color:"#333333",background:"#1a1a1a",padding:"2px 8px",borderRadius:4}}>ESC</span></div>{searchResults.length>0&&<div style={{maxHeight:400,overflow:"auto",padding:"8px"}}>{searchResults.map((r,i)=><div key={r.id+i} onClick={r.action} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:32,height:32,borderRadius:8,background:r.type==="Job"?"#2dd4bf18":r.type==="Vendor"?"#2563eb18":r.type==="Customer"?"#05966918":"#d9770618",display:"flex",alignItems:"center",justifyContent:"center"}}><I n={r.type==="Job"?"briefcase":r.type==="Vendor"?"package":r.type==="Customer"?"users":"file"} s={14}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#e5e5e5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div><div style={{fontSize:12,color:"#a3a3a3"}}>{r.sub}</div></div><Badge label={r.type} color={r.type==="Job"?"#2dd4bf":r.type==="Vendor"?"#a78bfa":"#34d399"}/></div>)}</div>}{searchQuery.length>=2&&searchResults.length===0&&<div style={{padding:40,textAlign:"center",color:"#333333",fontSize:13}}>No results for "{searchQuery}"</div>}{searchQuery.length<2&&<div style={{padding:30,textAlign:"center",color:"#333333",fontSize:12}}>Type at least 2 characters to search</div>}</div></div>}
      {notification&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:99999,background:notification.type==="error"?"rgba(248,113,113,0.9)":"rgba(45,212,191,0.9)",color:"#fff",padding:"14px 24px",borderRadius:50,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"fadeUp 0.35s cubic-bezier(0.25,0.1,0.25,1)",maxWidth:"calc(100vw - 48px)",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>{notification.type==="error"?"!":"+"}</span>{notification.msg}</div>}
      <PrintOverlay />
      <ConfirmDialog />


      {/* Mobile hamburger */}
      {!mobileMenuOpen&&<div className="mobile-menu-btn" style={{display:"none",position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:10001,background:"rgba(10,10,10,0.25)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:28,padding:"8px 6px",backdropFilter:"blur(6px) saturate(250%) brightness(1.2) contrast(1.1)",WebkitBackdropFilter:"blur(6px) saturate(250%) brightness(1.2) contrast(1.1)",boxShadow:"0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04)"}}><div style={{display:"flex",gap:2}}>{[{id:"dashboard",icon:"dashboard",l:"Home"},{id:"jobs",icon:"briefcase",l:"Jobs"},{id:"documents",icon:"file",l:"Docs"},{id:"deliveries",icon:"truck",l:"Track"},{id:"brain",icon:"brain",l:"AI"}].map(t=><button key={t.id} onClick={()=>{setPage(t.id);setSelectedJob(null);window.scrollTo(0,0);const mc=document.querySelector('.main-content');if(mc)mc.scrollTop=0}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"7px 13px",borderRadius:20,border:"none",background:page===t.id?"rgba(45,212,191,0.2)":"transparent",color:page===t.id?"#2dd4bf":"#636363",cursor:"pointer",fontFamily:"'Satoshi',sans-serif",fontSize:9,fontWeight:page===t.id?700:400,lineHeight:1,transition:"all 0.15s ease-out",transform:page===t.id?"scale(1.1)":"scale(1)",transformOrigin:"center center",boxShadow:page===t.id?"0 4px 14px rgba(45,212,191,0.2)":"none"}}><I n={t.icon} s={18}/>{t.l}</button>)}<button onClick={()=>setMobileMenuOpen(true)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 14px",borderRadius:20,border:"none",background:"transparent",color:"#525252",cursor:"pointer",fontFamily:"'Satoshi',sans-serif",fontSize:9,fontWeight:400}}><I n="settings" s={18}/>More</button></div></div>}
      {mobileMenuOpen&&<div onClick={()=>setMobileMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999}}/>}


      {/* SIDEBAR */}
      <div className={"sidebar"+(mobileMenuOpen?" open":"")} style={{width:sidebarCollapsed?56:220,minWidth:sidebarCollapsed?56:220,background:"#000000",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",transition:"width 0.25s cubic-bezier(0.4,0,0.2,1),min-width 0.25s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden"}}>
        {/* Logo header */}
        <div style={{padding:sidebarCollapsed?"14px 12px":"14px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",minHeight:56}} onClick={()=>{if(window.innerWidth>768)setSidebarCollapsed(!sidebarCollapsed)}}>
          <img src={MW_LOGO} alt="MW" style={{height:44,width:44,borderRadius:8,objectFit:"contain",flexShrink:0}}/>
          {!sidebarCollapsed&&<div style={{flex:1,minWidth:0,overflow:"hidden"}}><div style={{fontSize:14,fontWeight:700,color:"#f0f0f0",letterSpacing:-0.3,whiteSpace:"nowrap"}}>Midwest AIOS</div></div>}
          {!sidebarCollapsed&&<button className="mobile-close-btn" onClick={e=>{e.stopPropagation();setMobileMenuOpen(false)}} style={{display:"none",width:24,height:24,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",alignItems:"center",justifyContent:"center",color:"#525252",flexShrink:0,padding:0}}><I n="close" s={14}/></button>}
        </div>


        {/* Search trigger */}
        {!sidebarCollapsed&&<div style={{padding:"0 12px",marginBottom:8}}><button onClick={()=>setSearchOpen(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"#6b6b6b",fontSize:12,fontFamily:"'Satoshi',sans-serif",cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.12)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}><I n="search" s={13}/><span style={{flex:1,textAlign:"left"}}>Search...</span><span style={{fontSize:10,color:"#333",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace"}}>K</span></button></div>}
        {sidebarCollapsed&&<div style={{padding:"4px 0",display:"flex",justifyContent:"center",marginBottom:4}}><button onClick={()=>setSearchOpen(true)} style={{width:32,height:32,borderRadius:8,border:"none",background:"transparent",cursor:"pointer",color:"#525252",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="search" s={16}/></button></div>}


        {/* Nav sections */}
        <nav style={{flex:1,padding:sidebarCollapsed?"4px":"4px 8px",display:"flex",flexDirection:"column",gap:0,overflowY:"auto",overflowX:"hidden"}}>
          {/* Core */}
          {!sidebarCollapsed&&<div style={{fontSize:10,fontWeight:600,color:"#444",textTransform:"uppercase",letterSpacing:1.5,padding:"10px 10px 6px",userSelect:"none"}}>Core</div>}
          {navItems.slice(0,2).map(item=>{const active=page===item.id;return <button key={item.id} onClick={()=>{setPage(item.id);setSelectedJob(null);setMobileMenuOpen(false);window.scrollTo(0,0)}} style={{display:"flex",alignItems:"center",gap:10,padding:sidebarCollapsed?"8px 0":"7px 10px",borderRadius:8,border:"none",cursor:"pointer",background:active?"rgba(45,212,191,0.08)":"transparent",color:active?"#2dd4bf":"#9a9a9a",fontSize:13,fontWeight:active?500:400,fontFamily:"'Satoshi',sans-serif",textAlign:"left",transition:"all 0.15s",justifyContent:sidebarCollapsed?"center":"flex-start",width:"100%",position:"relative"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,0.03)"}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent"}}>{active&&<div style={{position:"absolute",left:sidebarCollapsed?-4:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,borderRadius:2,background:"#2dd4bf"}}/>}<span style={{flexShrink:0,display:"flex",alignItems:"center"}}><I n={item.icon} s={16}/></span>{!sidebarCollapsed&&<span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}{!sidebarCollapsed&&item.badge&&<span style={{minWidth:18,height:18,borderRadius:9,background:item.badgeColor=="#f87171"?"rgba(248,113,113,0.15)":item.badgeColor=="#fbbf24"?"rgba(251,191,36,0.15)":"rgba(45,212,191,0.15)",color:item.badgeColor||"#2dd4bf",fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",fontFamily:"'JetBrains Mono',monospace"}}>{item.badge}</span>}</button>})}


          {/* Operations */}
          {!sidebarCollapsed&&<div style={{fontSize:10,fontWeight:600,color:"#444",textTransform:"uppercase",letterSpacing:1.5,padding:"14px 10px 6px",userSelect:"none"}}>Operations</div>}
          {sidebarCollapsed&&<div style={{height:1,background:"rgba(255,255,255,0.04)",margin:"8px 12px"}}/>}
          {navItems.slice(2,7).map(item=>{const active=page===item.id;return <button key={item.id} onClick={()=>{setPage(item.id);setSelectedJob(null);setMobileMenuOpen(false);window.scrollTo(0,0)}} style={{display:"flex",alignItems:"center",gap:10,padding:sidebarCollapsed?"8px 0":"7px 10px",borderRadius:8,border:"none",cursor:"pointer",background:active?"rgba(45,212,191,0.08)":"transparent",color:active?"#2dd4bf":"#9a9a9a",fontSize:13,fontWeight:active?500:400,fontFamily:"'Satoshi',sans-serif",textAlign:"left",transition:"all 0.15s",justifyContent:sidebarCollapsed?"center":"flex-start",width:"100%",position:"relative"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,0.03)"}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent"}}>{active&&<div style={{position:"absolute",left:sidebarCollapsed?-4:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,borderRadius:2,background:"#2dd4bf"}}/>}<span style={{flexShrink:0,display:"flex",alignItems:"center"}}><I n={item.icon} s={16}/></span>{!sidebarCollapsed&&<span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}{!sidebarCollapsed&&item.badge&&<span style={{minWidth:18,height:18,borderRadius:9,background:item.badgeColor=="#f87171"?"rgba(248,113,113,0.15)":item.badgeColor=="#fbbf24"?"rgba(251,191,36,0.15)":"rgba(45,212,191,0.15)",color:item.badgeColor||"#2dd4bf",fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",fontFamily:"'JetBrains Mono',monospace"}}>{item.badge}</span>}</button>})}


          {/* Intelligence */}
          {!sidebarCollapsed&&<div style={{fontSize:10,fontWeight:600,color:"#444",textTransform:"uppercase",letterSpacing:1.5,padding:"14px 10px 6px",userSelect:"none"}}>Intelligence</div>}
          {sidebarCollapsed&&<div style={{height:1,background:"rgba(255,255,255,0.04)",margin:"8px 12px"}}/>}
          {navItems.slice(7).map(item=>{const active=page===item.id;return <button key={item.id} onClick={()=>{setPage(item.id);setSelectedJob(null);setMobileMenuOpen(false);window.scrollTo(0,0)}} style={{display:"flex",alignItems:"center",gap:10,padding:sidebarCollapsed?"8px 0":"7px 10px",borderRadius:8,border:"none",cursor:"pointer",background:active?"rgba(45,212,191,0.08)":"transparent",color:active?"#2dd4bf":"#8a8a8a",fontSize:13,fontWeight:active?500:400,fontFamily:"'Satoshi',sans-serif",textAlign:"left",transition:"all 0.15s",justifyContent:sidebarCollapsed?"center":"flex-start",width:"100%",position:"relative"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,0.03)"}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent"}}>{active&&<div style={{position:"absolute",left:sidebarCollapsed?-4:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,borderRadius:2,background:"#2dd4bf"}}/>}<span style={{flexShrink:0,display:"flex",alignItems:"center"}}><I n={item.icon} s={16}/></span>{!sidebarCollapsed&&<span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}</button>})}
        </nav>


        {/* Footer */}
        <div style={{padding:sidebarCollapsed?"10px 8px":"10px 16px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
          {!sidebarCollapsed?<div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={syncAll} title="Click to force-sync all data"><div style={{width:6,height:6,borderRadius:"50%",background:realtimeStatus==="connected"?"#34d399":dbStatus==="connected"?"#2dd4bf":dbStatus==="connecting"?"#fbbf24":"#f87171",flexShrink:0,boxShadow:realtimeStatus==="connected"?"0 0 6px rgba(52,211,153,0.4)":"none"}}/><span style={{fontSize:11,color:"#444"}}>{realtimeStatus==="connected"?"Live":dbStatus==="connected"?"Connected":"Connecting..."}</span>{onlineUsers.length>1&&<span style={{fontSize:10,color:"#34d399"}}>{onlineUsers.length} online</span>}<span style={{marginLeft:"auto",fontSize:9,color:"#333",letterSpacing:1}}>DYFRENT</span></div>:<div style={{display:"flex",justifyContent:"center"}}><div style={{width:6,height:6,borderRadius:"50%",background:realtimeStatus==="connected"?"#34d399":"#fbbf24",boxShadow:realtimeStatus==="connected"?"0 0 6px rgba(52,211,153,0.4)":"none"}}/></div>}
        </div>
      </div>


      {/* MAIN */}
      <div style={{flex:1,overflow:"auto",background:"#000000"}}>
        <div className="main-content" style={{maxWidth:1400,margin:"0 auto",padding:"24px 32px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,marginBottom:8}}>
            {onlineUsers.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,marginRight:4}}>{onlineUsers.slice(0,5).map((u,i)=><div key={u.user_id||i} title={u.name+" ("+u.role+")"} style={{width:24,height:24,borderRadius:"50%",border:"2px solid #000",marginLeft:i>0?-8:0,zIndex:5-i,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#000",background:u.role==="admin"?"#2dd4bf":u.role==="office"?"#a78bfa":"#fbbf24",position:"relative"}}>{u.avatar?<img src={u.avatar} style={{width:20,height:20,borderRadius:"50%",objectFit:"cover"}}/>:(u.name||"?")[0]}<div style={{position:"absolute",bottom:-1,right:-1,width:8,height:8,borderRadius:"50%",background:"#34d399",border:"1.5px solid #000"}}/></div>)}{onlineUsers.length>5&&<span style={{fontSize:10,color:"#525252",marginLeft:4}}>+{onlineUsers.length-5}</span>}<span style={{fontSize:10,color:"#34d399",marginLeft:4}}>{onlineUsers.length} online</span></div>}
            {realtimeStatus==="connected"&&<div title="Real-time sync active" style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px rgba(52,211,153,0.5)"}}/>}
            <span style={{fontSize:12,color:"#a3a3a3"}}>{currentUser?.name}</span><Badge label={userRole} color={userRole==="admin"?"#2dd4bf":userRole==="office"?"#a78bfa":"#fbbf24"}/>{clerkEnabled&&clerkAuth.isSignedIn?<UserButton afterSignOutUrl="/" appearance={{elements:{avatarBox:{width:28,height:28}}}}/>:<button onClick={logout} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #222",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#f87171"} onMouseLeave={e=>e.currentTarget.style.color="#737373"}>Logout</button>}</div>
          {page==="dashboard"&&<Dashboard {...ctx}/>}
          {page==="jobs"&&<JobsPage {...ctx}/>}
          {page==="directory"&&<DirectoryPage {...ctx}/>}
          {page==="deliveries"&&<DeliveryPage {...ctx}/>}
          {page==="documents"&&<DocumentsPage {...ctx}/>}
          {page==="financials"&&<FinancialsPage {...ctx}/>}
          {page==="commissions"&&<CommissionsPage {...ctx} onGenerateStatement={doc=>{setPendingCommPreview(doc);}} />}
          {page==="salesportal"&&<SalesPortalPage {...ctx}/>}
          {page==="prospects"&&<ProspectsPage {...ctx}/>}
          {page==="files"&&<FilesPage {...ctx}/>}
          {page==="playbook"&&<PlaybookPage {...ctx}/>}
          {page==="customer360"&&<Customer360Page {...ctx}/>}
          {page==="vendor360"&&<Vendor360Page {...ctx}/>}
          {page==="tasks"&&<TasksPage {...ctx}/>}
          {page==="notes"&&<NotesPage {...ctx}/>}
          {page==="brain"&&<BrainPage {...ctx}/>}
          {page==="exitready"&&<ExitReadinessPage {...ctx}/>}


          {page==="usermgmt"&&<UserMgmtPage {...ctx}/>}
        </div>
      </div>
      <style>{`
          input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="time"] {
            color-scheme: dark;
          }
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
          }
          select {
            color-scheme: dark;
          }


        input[type="date"]{color-scheme:dark}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.8) brightness(1.2)}
        @keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes countUp{from{opacity:0;transform:translateY(8px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes barGrow{from{width:0%}to{width:var(--bar-width,100%)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(200,162,92,0)}50%{box-shadow:0 0 0 6px rgba(200,162,92,0.15)}}
        @keyframes donutDraw{from{stroke-dashoffset:var(--donut-circ,300)}to{stroke-dashoffset:var(--donut-offset,0)}}
        .stat-animate{animation:countUp 0.5s ease-out both}
        .stat-animate:nth-child(1){animation-delay:0s}.stat-animate:nth-child(2){animation-delay:0.08s}.stat-animate:nth-child(3){animation-delay:0.16s}.stat-animate:nth-child(4){animation-delay:0.24s}
        .slide-row{animation:slideRight 0.3s ease-out both}
        .slide-row:nth-child(1){animation-delay:0.05s}.slide-row:nth-child(2){animation-delay:0.1s}.slide-row:nth-child(3){animation-delay:0.15s}.slide-row:nth-child(4){animation-delay:0.2s}.slide-row:nth-child(5){animation-delay:0.25s}.slide-row:nth-child(6){animation-delay:0.3s}
        .hover-lift{transition:transform 0.25s cubic-bezier(0.4,0,0.2,1),box-shadow 0.25s cubic-bezier(0.4,0,0.2,1),border-color 0.25s}.hover-lift:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.3)}
        .btn-glow:hover{box-shadow:0 0 16px rgba(200,162,92,0.25)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes brainCursor{0%,49%{opacity:1}50%,100%{opacity:0}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2d37;border-radius:3px}
        input,textarea,select{font-family:Satoshi,sans-serif;font-size:16px!important}
        select{-webkit-appearance:none!important;-moz-appearance:none!important;appearance:none!important;background-color:#0a0a0a!important;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:right 12px center!important;background-size:10px!important;padding-right:32px!important;cursor:pointer!important;color:#e5e5e5!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:10px!important;padding:11px 32px 11px 14px!important;outline:none!important}
        select:focus{border-color:rgba(45,212,191,0.3)!important}
        select option{background:#111111!important;color:#e5e5e5!important;padding:8px!important}
        select::-ms-expand{display:none!important}
        button{-webkit-tap-highlight-color:transparent}
        html,body{background:#000000!important}
        .sales-hide{display:none!important}
          @media(max-width:768px){
          .sidebar{position:fixed!important;left:-240px!important;top:0!important;bottom:0!important;width:220px!important;min-width:220px!important;z-index:10000!important;transition:left 0.3s cubic-bezier(0.4,0,0.2,1)!important;background:#000000!important}
          .sidebar.open{left:0px!important}
          .mobile-menu-btn{display:flex!important}
          .mobile-close-btn{display:flex!important}
          .main-content{padding:16px 12px 90px 12px!important;overflow-x:hidden!important;max-width:100vw!important}
          body{overflow-x:hidden!important;background:#000000!important}
          html{background:#000000!important}
          h1{font-size:20px!important}
          h2{font-size:18px!important}
          table{font-size:11px!important;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
          th,td{padding:6px 6px!important;white-space:nowrap;min-width:50px}
          .kanban-grid{grid-template-columns:1fr!important;min-height:auto!important}
          .kanban-grid>div{min-height:auto!important}
          .resp-grid-2{grid-template-columns:1fr!important;gap:14px!important}
          .notes-layout{flex-direction:column!important}
          .notes-layout>div:first-child{width:100%!important;max-height:180px!important}
          .resp-grid-3{grid-template-columns:1fr!important;gap:12px!important}
          .resp-grid-4{grid-template-columns:1fr!important;gap:10px!important}
          .resp-grid-5{grid-template-columns:1fr!important;gap:10px!important}
          .dash-hero{flex-direction:column!important;text-align:center!important}
          .dash-hero>div{width:100%!important}
          .dash-stat{min-width:0!important}
          .job-sticky{margin:-16px -12px 0!important;padding:12px 12px 0!important}
          .dash-exports{gap:4px!important}
          .dash-exports>button{padding:6px 10px!important;font-size:11px!important}
          .doc-tabs{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
          .doc-tabs>button{min-width:0!important;padding:8px 6px!important;font-size:11px!important;flex:1!important}
          .doc-tabs>button>span:last-child{font-size:13px!important}
          .doc-card-row{flex-wrap:wrap!important;gap:8px!important}
          .cal-grid{grid-template-columns:repeat(7,1fr)!important;font-size:10px!important}
          .cal-grid>div{min-width:0!important;overflow:hidden!important}
          .cust-detail{padding:12px!important}
          .cust-detail>div{gap:8px!important}
          .brain-page{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:72px!important;height:auto!important;margin:0!important;padding:0!important;z-index:100!important;background:#000!important}
          .cash-val{font-size:13px!important;overflow:visible!important;white-space:nowrap!important}
          .cash-pos-grid{gap:4px!important}
          .fin-tabs{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;flex-wrap:nowrap!important}
          th,td{font-size:11px!important}
        }
        @media(max-width:480px){
          .main-content{padding:12px 10px 90px 10px!important}
          h1{font-size:18px!important}
          h2{font-size:16px!important}
          .resp-grid-4{grid-template-columns:1fr!important;gap:8px!important}
          .resp-grid-3{grid-template-columns:1fr!important;gap:8px!important}
          .brain-page{bottom:72px!important}
        }
      `}</style>
    </div>
  );
}


// ===============================================================
// DASHBOARD
// ===============================================================
function AnimNum({value}){
  const [display,setDisplay]=useState("");
  const prevRef=useRef(0);
  useEffect(()=>{
    const str=String(value||"");const numMatch=str.match(/[\d,.]+/);
    if(!numMatch){setDisplay(str);return}
    const target=parseFloat(numMatch[0].replace(/,/g,""));const prefix=str.slice(0,numMatch.index);const suffix=str.slice(numMatch.index+numMatch[0].length);
    const start=prevRef.current;const diff=target-start;const duration=700;const startTime=performance.now();
    const hasDec=str.includes(".");const isCurrency=str.includes("$");
    const fmt2=n=>{if(isCurrency)return prefix+new Intl.NumberFormat("en-US",{minimumFractionDigits:hasDec?2:0,maximumFractionDigits:hasDec?2:0}).format(Math.abs(n))+suffix;return prefix+new Intl.NumberFormat("en-US",{minimumFractionDigits:hasDec?1:0,maximumFractionDigits:hasDec?1:0}).format(Math.abs(n))+suffix};
    const step=(now)=>{const elapsed=now-startTime;const progress=Math.min(elapsed/duration,1);const eased=1-Math.pow(1-progress,3);
      const current=start+diff*eased;setDisplay(fmt2(current));
      if(progress<1)requestAnimationFrame(step);else{setDisplay(str);prevRef.current=target}};
    requestAnimationFrame(step);
  },[value]);
  return <>{display||value}</>;
}


function AnimatedNumber({value,prefix="",suffix="",duration=600}){
  const [display,setDisplay]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    const start=ref.current||0;const end=typeof value==="number"?value:parseFloat(String(value).replace(/[^0-9.-]/g,""))||0;
    if(start===end){setDisplay(end);ref.current=end;return}
    const startTime=performance.now();const diff=end-start;
    const step=(now)=>{const elapsed=now-startTime;const progress=Math.min(elapsed/duration,1);const eased=1-Math.pow(1-progress,3);
      const current=start+diff*eased;setDisplay(current);
      if(progress<1)requestAnimationFrame(step);else{setDisplay(end);ref.current=end}};
    requestAnimationFrame(step);
    return()=>{ref.current=display};
  },[value]);
  const isNeg=display<0;const abs=Math.abs(display);
  const formatted=abs>=1000?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(abs):abs>=1?new Intl.NumberFormat("en-US",{minimumFractionDigits:0,maximumFractionDigits:0}).format(abs):abs.toFixed(1);
  return <>{prefix}{isNeg?"-":""}{typeof value==="string"&&value.startsWith("$")?"":""}{formatted}{suffix}</>;
}


function AnimatedPct({value,duration=600}){
  const [display,setDisplay]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    const end=typeof value==="number"?value:parseFloat(String(value))||0;const start=ref.current||0;
    if(start===end){setDisplay(end);ref.current=end;return}
    const startTime=performance.now();const diff=end-start;
    const step=(now)=>{const elapsed=now-startTime;const progress=Math.min(elapsed/duration,1);const eased=1-Math.pow(1-progress,3);
      setDisplay(start+diff*eased);if(progress<1)requestAnimationFrame(step);else{setDisplay(end);ref.current=end}};
    requestAnimationFrame(step);
    return()=>{ref.current=display};
  },[value]);
  return <>{display.toFixed(1)}%</>;
}


function Dashboard({jobs,lineItems,reps,vendors,customers,getJobFinancials,getJobItems,_commissionFor,setPage,setSelectedJob,dateFilter,setDateFilter,jobNum,notify}){
  // Date filtering
  const now = new Date();
  const filterJob = (j) => {
    if (dateFilter === "all") return true;
    const d = new Date(j.createdDate);
    if (isNaN(d.getTime())) return true;
    if (dateFilter === "week") { const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); return d >= weekAgo; }
    if (dateFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === "quarter") { const q = Math.floor(now.getMonth() / 3); const jq = Math.floor(d.getMonth() / 3); return jq === q && d.getFullYear() === now.getFullYear(); }
    if (dateFilter === "ytd") return d.getFullYear() === now.getFullYear();
    return true;
  };
  const filtered = jobs.filter(filterJob);
  const fLineItems = lineItems.filter(li => filtered.some(j => j.id === li.jobId));
  
  const totalRev = filtered.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const totalCost = filtered.reduce((s,j)=>s+getJobFinancials(j.id).totalCost,0);
  const avgMargin = filtered.length?filtered.reduce((s,j)=>s+getJobFinancials(j.id).margin,0)/filtered.length:0;
  const activeJobs = filtered.filter(j=>j.phase==="In Progress").length;
  const totalOrdered = fLineItems.reduce((s,i)=>s+i.qtyOrdered,0);
  const totalReceived = fLineItems.reduce((s,i)=>s+i.qtyReceived,0);
  const pendingDel = fLineItems.filter(i=>i.qtyReceived<i.qtyOrdered).length;
  const pendingInv = fLineItems.filter(i=>i.qtyReceived>i.qtyInvoiced).length;


  const overdueJobs=filtered.filter(j=>j.dueDate&&new Date(j.dueDate)<new Date()&&j.phase!=='Complete'&&j.paymentStatus!=='paid');
  const phases=["Quoting","In Progress","Invoiced","Complete"];
  const phaseData=phases.map(p=>{const pj=filtered.filter(j=>j.phase===p);return{phase:p,count:pj.length,rev:pj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)}});
  const vendorSpend=(()=>{const m={};fLineItems.forEach(i=>{const v=vendors.find(v=>v.id===i.vendor);m[v?.name||"Other"]=(m[v?.name||"Other"]||0)+i.unitCost*i.qtyOrdered});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)})();
  const monthlyRev=(()=>{const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const m={};filtered.forEach(j=>{let invD="";const _it=getJobItems(j.id);for(let k=0;k<_it.length;k++){const it=_it[k];if(it&&it.invoiceDate&&(it.qtyInvoiced||0)>0&&it.invoiceDate>invD)invD=it.invoiceDate;}const rd=invD||j.dueDate||j.createdDate;if(!rd)return;let y,mo;const mm=/^(\d{4})-(\d{2})/.exec(String(rd));if(mm){y=+mm[1];mo=+mm[2]-1;}else{const d=new Date(rd);if(isNaN(d.getTime()))return;y=d.getFullYear();mo=d.getMonth();}if(mo<0||mo>11)return;const key=y+"-"+mo;if(!m[key])m[key]={name:MN[mo],rev:0,_s:y*12+mo};m[key].rev+=getJobFinancials(j.id).totalRevenue;});return Object.values(m).sort((a,b)=>a._s-b._s).map(o=>({name:o.name,rev:o.rev}));})();
  const marginData=(()=>{const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const m={};filtered.forEach(j=>{let invD="";const _it=getJobItems(j.id);for(let k=0;k<_it.length;k++){const it=_it[k];if(it&&it.invoiceDate&&(it.qtyInvoiced||0)>0&&it.invoiceDate>invD)invD=it.invoiceDate;}const rd=invD||j.dueDate||j.createdDate;if(!rd)return;let y,mo;const mm=/^(\d{4})-(\d{2})/.exec(String(rd));if(mm){y=+mm[1];mo=+mm[2]-1;}else{const d=new Date(rd);if(isNaN(d.getTime()))return;y=d.getFullYear();mo=d.getMonth();}if(mo<0||mo>11)return;const key=y+"-"+mo;if(!m[key])m[key]={name:MN[mo],rev:0,cost:0,_s:y*12+mo};const f=getJobFinancials(j.id);m[key].rev+=f.totalRevenue;m[key].cost+=f.totalCost;});return Object.values(m).sort((a,b)=>a._s-b._s).map(o=>({name:o.name,margin:o.rev>0?(o.rev-o.cost)/o.rev*100:0}));})();
  const paidRev=filtered.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const partialRev=filtered.filter(j=>j.paymentStatus==="partial").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const unpaidRev=filtered.filter(j=>j.paymentStatus==="unpaid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);


  // Extra dashboard data
  const topCustomers=(()=>{const cr={};filtered.forEach(j=>{const r=getJobFinancials(j.id).totalRevenue;const c=customers.find(c=>c.id===j.customer);if(c)cr[c.name]=(cr[c.name]||0)+r});return Object.entries(cr).sort((a,b)=>b[1]-a[1]).slice(0,5)})();
  const deliveredPct=totalOrdered?(totalReceived/totalOrdered)*100:0;
  const invoicedTotal=fLineItems.reduce((s,i)=>s+i.qtyInvoiced,0);
  const invoicedPct=totalOrdered?(invoicedTotal/totalOrdered)*100:0;
  const pendingCount=fLineItems.filter(i=>i.qtyReceived<i.qtyOrdered).length;
  const overdueInvJobs=filtered.filter(j=>{if(j.paymentStatus==="paid")return false;const jItems=getJobItems(j.id);const hasInv=jItems.some(i=>i.qtyInvoiced>0);if(!hasInv)return false;const terms2=j.terms||"Net 30";const days=terms2.includes("15")?15:terms2.includes("Receipt")?0:30;const created=new Date(j.createdDate);const due=new Date(created);due.setDate(due.getDate()+days);return new Date()>due});
  const overdueTotal=overdueInvJobs.reduce((s,j)=>s+getJobItems(j.id).reduce((s2,i)=>s2+i.unitPrice*i.qtyInvoiced,0),0);
  const commEarned=reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).reduce((s,r)=>{const paid=jobs.filter(j=>j.salesRep===r.id&&j.paymentStatus==="paid");return s+paid.reduce((s2,j)=>s2+_commissionFor(j.id,r.commissionRate||0),0)},0);
  const commPending=reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).reduce((s,r)=>{const unpaid=jobs.filter(j=>j.salesRep===r.id&&j.paymentStatus!=="paid");return s+unpaid.reduce((s2,j)=>s2+_commissionFor(j.id,r.commissionRate||0),0)},0);
  const cs=s=>({padding:"4px 10px",borderRadius:6,border:"1px solid #1a1a1a",background:"#0a0a0a",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",display:"flex",alignItems:"center",gap:4});
  const hoverCard=e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.2)";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.3)"};
  const unhoverCard=e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"};
  const darkTip={background:"#111",border:"1px solid #222",borderRadius:8,fontSize:11,color:"#a3a3a3",boxShadow:"0 4px 12px rgba(0,0,0,0.5)"};
  const darkLabel={color:"#737373",fontSize:11,marginBottom:4};
  const darkItem={color:"#a3a3a3",fontSize:11,padding:0};


  return <div style={{animation:"fadeUp 0.4s"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,flexWrap:"wrap"}}><h1 style={{fontSize:28,fontWeight:800,color:"#f0f0f0",letterSpacing:-1.5}}>Command Center</h1><div style={{padding:"3px 8px",background:"#34d399",borderRadius:20,fontSize:11,fontWeight:700,color:"#fff"}}>LIVE</div>
      <div style={{marginLeft:"auto",display:"flex",gap:3,background:"#111",padding:3,borderRadius:8,flexShrink:0}}>{[["all","All Time"],["ytd","YTD"],["quarter","Quarter"],["month","Month"],["week","Week"]].map(([v,l])=><button key={v} onClick={()=>setDateFilter(v)} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:dateFilter===v?"#2dd4bf":"transparent",color:dateFilter===v?"#000":"#525252",fontSize:11,fontWeight:dateFilter===v?600:400,fontFamily:"inherit",transition:"all 0.15s"}}>{l}</button>)}</div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{[
      {label:"Jobs CSV",fn:()=>exportCSV(["Job","Customer","Phase","Revenue","Cost","Margin","Payment"],jobs.map(j=>{const f=getJobFinancials(j.id);return[j.name,customers?.find(c=>c.id===j.customer)?.name||"",j.phase,f.totalRevenue.toFixed(2),f.totalCost.toFixed(2),f.margin.toFixed(1)+"%",j.paymentStatus]}),"midwest-jobs.csv")},
      {label:"Vendors CSV",fn:()=>exportCSV(["Vendor","Category","Discount","Spend"],vendors.map(v=>{const spend=lineItems.filter(i=>i.vendor===v.id).reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);return[v.name,v.category,(v.discountRate*100).toFixed(0)+"%",spend.toFixed(2)]}),"midwest-vendors.csv")},
      {label:"Full Export",fn:()=>{const jRows=jobs.map(j=>{const f=getJobFinancials(j.id);return[j.id,j.name,customers?.find(c=>c.id===j.customer)?.name||"",reps?.find(r=>r.id===j.salesRep)?.name||"",j.phase,j.paymentStatus,j.createdDate,j.startDate,j.dueDate,f.totalRevenue.toFixed(2),f.totalCost.toFixed(2),f.margin.toFixed(1)+"%",f.totalOrdered,f.totalReceived].join(",")});const iRows=lineItems.map(i=>{const j=jobs.find(j2=>j2.id===i.jobId);const v=vendors.find(v2=>v2.id===i.vendor);return[i.id,i.jobId,j?.name||"",i.description,v?.name||"",i.unitCost,i.unitPrice,i.qtyOrdered,i.qtyReceived,i.qtyInvoiced].join(",")});const vRows=vendors.map(v=>{const spend=lineItems.filter(i=>i.vendor===v.id).reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);return[v.id,v.name,v.contact,v.email,v.phone,v.category,(v.discountRate*100).toFixed(1)+"%",spend.toFixed(2)].join(",")});const cRows=customers.map(c=>[c.id,c.name,c.contact,c.email,c.phone,c.type].join(","));const rRows=reps.filter(r=>!r.id.includes("SEED_FLAG")).map(r=>{const rv=jobs.filter(j=>j.salesRep===r.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);return[r.id,r.name,r.email,r.territory,(r.commissionRate*100).toFixed(1)+"%",rv.toFixed(2)].join(",")});const wb="JOBS\nID,Name,Customer,Rep,Phase,Payment,Created,Start,Due,Revenue,Cost,Margin,Ordered,Received\n"+jRows.join("\n")+"\n\nLINE ITEMS\nID,JobID,Job,Description,Vendor,Cost,Price,Ordered,Received,Invoiced\n"+iRows.join("\n")+"\n\nVENDORS\nID,Name,Contact,Email,Phone,Category,Discount,TotalSpend\n"+vRows.join("\n")+"\n\nCUSTOMERS\nID,Name,Contact,Email,Phone,Type\n"+cRows.join("\n")+"\n\nSALES REPS\nID,Name,Email,Territory,Rate,Revenue\n"+rRows.join("\n");const blob=new Blob([wb],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="midwest-full-export-"+new Date().toISOString().split("T")[0]+".csv";a.click();URL.revokeObjectURL(url);notify("Full database exported -- 5 tables")}}
    ].map((b,i)=><button key={i} onClick={b.fn} style={cs()} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf";e.currentTarget.style.color="#2dd4bf";e.currentTarget.style.background="#2dd4bf08"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#737373";e.currentTarget.style.background="#0a0a0a"}}><I n="download" s={10}/> {b.label}</button>)}</div>


    {/* Row 1: Stat Cards */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}} className="resp-grid-4">
      {[{label:"PIPELINE",value:fmt(totalRev),sub:filtered.length+" jobs",color:"#2dd4bf"},{label:"ACTIVE",value:String(activeJobs),sub:filtered.filter(j=>j.phase==="Quoting").length+" quoting",color:"#a78bfa"},{label:"MARGIN",value:pct(totalRev>0?(totalRev-totalCost)/totalRev*100:0),sub:fmt(totalRev-totalCost)+" profit",color:"#34d399"},{label:"DELIVERY",value:pct(deliveredPct),sub:pendingCount+" pending",color:"#fbbf24"}].map((s,i)=><Card key={i} style={{padding:16,transition:"all 0.25s"}} hover><span style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2}}>{s.label}</span><div style={{fontSize:"clamp(22px,5vw,36px)",fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:-1,lineHeight:1,margin:"8px 0 6px"}}><AnimNum value={s.value}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>{s.sub}</div></Card>)}
    </div>


    {/* Row 2: Action Required + Revenue Chart */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Action Required</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pendingInv>0&&<div onClick={()=>setPage("documents")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:"#fbbf2406",border:"1px solid #fbbf2415",borderRadius:10,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="#fbbf2410";e.currentTarget.style.transform="translateX(4px)"}} onMouseLeave={e=>{e.currentTarget.style.background="#fbbf2406";e.currentTarget.style.transform="translateX(0)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24"}}/><span style={{fontSize:13,color:"#fbbf24"}}><strong>{pendingInv}</strong> items received, not invoiced</span></div><span style={{fontSize:11,color:"#fbbf24",opacity:0.6}}>Draft Invoices &rarr;</span></div>}
          {pendingDel>0&&<div onClick={()=>setPage("deliveries")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:"#a78bfa06",border:"1px solid #a78bfa15",borderRadius:10,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="#a78bfa10";e.currentTarget.style.transform="translateX(4px)"}} onMouseLeave={e=>{e.currentTarget.style.background="#a78bfa06";e.currentTarget.style.transform="translateX(0)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#a78bfa"}}/><span style={{fontSize:13,color:"#c4b5fd"}}><strong>{pendingDel}</strong> items awaiting delivery</span></div><span style={{fontSize:11,color:"#a78bfa",opacity:0.6}}>Track &rarr;</span></div>}
          {overdueInvJobs.length>0&&<div onClick={()=>setPage("documents")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:"#f8717106",border:"1px solid #f8717115",borderRadius:10,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="#f8717110";e.currentTarget.style.transform="translateX(4px)"}} onMouseLeave={e=>{e.currentTarget.style.background="#f8717106";e.currentTarget.style.transform="translateX(0)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#f87171"}}/><span style={{fontSize:13,color:"#fca5a5"}}><strong>{overdueInvJobs.length}</strong> overdue invoices ({fmt(overdueTotal)})</span></div><span style={{fontSize:11,color:"#f87171",opacity:0.6}}>Send Reminders &rarr;</span></div>}
          <div onClick={()=>setPage("commissions")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 12px",background:"#34d39906",border:"1px solid #34d39915",borderRadius:10,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="#34d39910";e.currentTarget.style.transform="translateX(4px)"}} onMouseLeave={e=>{e.currentTarget.style.background="#34d39906";e.currentTarget.style.transform="translateX(0)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#34d399"}}/><span style={{fontSize:13,color:"#6ee7b7"}}>Commission statements ready</span></div><span style={{fontSize:11,color:"#34d399",opacity:0.6}}>Review &rarr;</span></div>
        </div>
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Revenue by Month</div>
        <ResponsiveContainer width="100%" height={170}><BarChart data={monthlyRev}><defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.9}/><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.4}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#a3a3a3",fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#737373",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+Math.round(v/1000)+"k"}/><Tooltip contentStyle={darkTip} labelStyle={darkLabel} itemStyle={darkItem} cursor={{fill:"rgba(45,212,191,0.06)"}}/><RBar dataKey="rev" fill="url(#revGrad)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
      </Card>
    </div>


    {/* Row 3: Active Jobs + Team Leaderboard */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Active Jobs</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.filter(j=>j.phase!=='Complete').sort((a,b)=>getJobFinancials(b.id).totalRevenue-getJobFinancials(a.id).totalRevenue).slice(0,10).map(job=>{const f=getJobFinancials(job.id);return <div key={job.id} onClick={()=>{setSelectedJob(job.id);setPage("jobs")}} style={{padding:"10px 12px",background:"#000",borderRadius:10,cursor:"pointer",transition:"all 0.2s",border:"1px solid rgba(255,255,255,0.04)"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a";e.currentTarget.style.borderColor="rgba(45,212,191,0.15)";e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.background="#000";e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";e.currentTarget.style.transform="translateY(0)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#737373",fontSize:11,marginRight:6}}>{jobNum(job.id)}</span>{job.name}</span><Badge label={job.phase} color={statusColor(job.phase)}/></div><Bar value={f.totalReceived} max={f.totalOrdered||1} color={statusColor(job.phase)} height={5}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:12,color:"#a3a3a3"}}>{fmtN(f.totalReceived)}/{fmtN(f.totalOrdered)} units</span><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span></div></div>})}</div>
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Team Leaderboard</div>
        {[...reps].filter(r=>!r.id.includes("SEED_FLAG")).sort((a,b)=>{const ar=jobs.filter(j=>j.salesRep===b.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const br=jobs.filter(j=>j.salesRep===a.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);return ar-br}).map((r,i)=>{const rv=jobs.filter(j=>j.salesRep===r.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const jc=jobs.filter(j=>j.salesRep===r.id).length;const comm=jobs.filter(j=>j.salesRep===r.id).reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);return <div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid #111",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:30,height:30,borderRadius:"50%",background:["#2dd4bf","#a78bfa","#fbbf24","#34d399","#f87171","#8b5cf6"][i%6]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:["#2dd4bf","#a78bfa","#fbbf24","#34d399","#f87171","#8b5cf6"][i%6],fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}>{r.name}</div><div style={{fontSize:12,color:"#a3a3a3"}}>{r.territory||""} - {jc} job{jc!==1?"s":""} - {((r.commissionRate||0)*100).toFixed(1)}%</div></div><div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(rv)}</div><div style={{fontSize:11,color:"#737373"}}>comm: {fmt(comm)}</div></div></div></div>})}
      </Card>
    </div>


    {/* Row 4: Margin Trend + Payment Collection */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Margin Trend</div>
        <ResponsiveContainer width="100%" height={170}><LineChart data={marginData}><defs><linearGradient id="marginArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.15}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#a3a3a3",fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#737373",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"}/><Tooltip contentStyle={darkTip} labelStyle={darkLabel} itemStyle={darkItem} cursor={{stroke:"rgba(52,211,153,0.15)"}}/><Line type="monotone" dataKey="margin" stroke="#34d399" strokeWidth={3} dot={{fill:"#34d399",r:5,strokeWidth:3,stroke:"#111"}}/></LineChart></ResponsiveContainer>
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Payment Collection</div>
        <ResponsiveContainer width="100%" height={170}><BarChart data={[{name:"Paid",value:paidRev},{name:"Partial",value:partialRev},{name:"Unpaid",value:unpaidRev}]}><defs><linearGradient id="paidG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.9}/><stop offset="100%" stopColor="#34d399" stopOpacity={0.4}/></linearGradient><linearGradient id="partG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9}/><stop offset="100%" stopColor="#fbbf24" stopOpacity={0.4}/></linearGradient><linearGradient id="unpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.9}/><stop offset="100%" stopColor="#f87171" stopOpacity={0.4}/></linearGradient></defs><XAxis dataKey="name" tick={{fill:"#a3a3a3",fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#737373",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+Math.round(v/1000)+"k"}/><Tooltip contentStyle={darkTip} labelStyle={darkLabel} itemStyle={darkItem} cursor={{fill:"rgba(255,255,255,0.02)"}}/><RBar dataKey="value" radius={[6,6,0,0]}>{["url(#paidG)","url(#partG)","url(#unpG)"].map((c,i)=><Cell key={i} fill={c}/>)}</RBar></BarChart></ResponsiveContainer>
      </Card>
    </div>


    {/* Row 5: Vendor Spend + Pipeline Phase */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Vendor Spend</div>
        <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={vendorSpend.map(([name,value])=>({name,value}))} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">{["#2dd4bf","#a78bfa","#34d399","#fbbf24","#f87171","#8b5cf6"].map((c,i)=><Cell key={i} fill={c}/>)}</Pie><Tooltip contentStyle={darkTip} labelStyle={darkLabel} itemStyle={darkItem}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8,justifyContent:"center"}}>{vendorSpend.map(([name],i)=><span key={name} style={{fontSize:11,color:["#2dd4bf","#a78bfa","#34d399","#fbbf24","#f87171","#8b5cf6"][i],display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:["#2dd4bf","#a78bfa","#34d399","#fbbf24","#f87171","#8b5cf6"][i]}}/>{name}</span>)}</div>
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Pipeline by Phase</div>
        {phaseData.map(p=><div key={p.phase} style={{marginBottom:12,transition:"all 0.15s"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:14,color:"#e5e5e5",fontWeight:500}}>{p.phase}</span><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(p.rev)}</span></div><Bar value={p.rev} max={totalRev||1} color={statusColor(p.phase)} height={8}/><div style={{fontSize:12,color:"#737373",marginTop:2}}>{p.count} job{p.count!==1?"s":""}</div></div>)}
      </Card>
    </div>


    {/* Row 6: Top Customers + Top Vendors */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Top Customers</div>
        {topCustomers.map(([name,rev],i)=><div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<topCustomers.length-1?"1px solid #111":"none",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}><div style={{width:28,height:28,borderRadius:8,background:"#2dd4bf12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#2dd4bf",fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><span style={{fontSize:14,color:"#f0f0f0",flex:1,fontWeight:500}}>{name}</span><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(rev)}</span></div>)}
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Top Vendors</div>
        {vendorSpend.map(([name,spend],i)=><div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<vendorSpend.length-1?"1px solid #111":"none",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}><div style={{width:28,height:28,borderRadius:8,background:["#2dd4bf","#a78bfa","#34d399","#fbbf24","#f87171","#8b5cf6"][i%6]+"12",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:["#2dd4bf","#a78bfa","#34d399","#fbbf24","#f87171","#8b5cf6"][i%6],fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div><span style={{fontSize:14,color:"#f0f0f0",flex:1,fontWeight:500}}>{name}</span><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(spend)}</span></div>)}
      </Card>
    </div>


    {/* Row 7: Delivery Health + Commission Summary */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}} className="resp-grid-2">
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Delivery Health</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <div style={{textAlign:"center",padding:10,background:"#000",borderRadius:10}}><div style={{fontSize:28,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={pct(deliveredPct)}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>Delivered</div></div>
          <div style={{textAlign:"center",padding:10,background:"#000",borderRadius:10}}><div style={{fontSize:28,fontWeight:800,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}><AnimNum value={pct(invoicedPct)}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>Invoiced</div></div>
          <div style={{textAlign:"center",padding:10,background:"#000",borderRadius:10}}><div style={{fontSize:28,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{pendingCount}</div><div style={{fontSize:12,color:"#a3a3a3"}}>Pending</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#e5e5e5"}}>Delivery</span><span style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(totalReceived)}/{fmtN(totalOrdered)}</span></div><Bar value={totalReceived} max={totalOrdered||1} color="#2dd4bf" height={8}/></div>
          <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#e5e5e5"}}>Invoice</span><span style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(invoicedTotal)}/{fmtN(totalOrdered)}</span></div><Bar value={invoicedTotal} max={totalOrdered||1} color="#a78bfa" height={8}/></div>
        </div>
      </Card>
      <Card style={{padding:16}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Commission Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{padding:14,background:"#000",borderRadius:10,textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(commEarned)}</div><div style={{fontSize:12,color:"#a3a3a3"}}>Earned</div></div>
          <div style={{padding:14,background:"#000",borderRadius:10,textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(commPending)}</div><div style={{fontSize:12,color:"#a3a3a3"}}>Pending</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=>{const rv=jobs.filter(j=>j.salesRep===r.id).reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const jc=jobs.filter(j=>j.salesRep===r.id).length;const earned=jobs.filter(j=>j.salesRep===r.id&&j.paymentStatus==="paid").reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);const pending=jobs.filter(j=>j.salesRep===r.id&&j.paymentStatus!=="paid").reduce((s,j)=>s+_commissionFor(j.id,r.commissionRate||0),0);return <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #111"}}><span style={{fontSize:13,color:"#e5e5e5",flex:1,fontWeight:500}}>{r.name}</span><span style={{fontSize:12,color:"#737373"}}>{jc} job{jc!==1?"s":""}</span><span style={{fontSize:12,fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(earned)}</span>{pending>0&&<span style={{fontSize:11,color:"#fbbf24"}}>{fmt(pending)} pending</span>}</div>})}</div>
      </Card>
    </div>


    {/* Row 8: Margin by Job */}
    <Card style={{padding:16,marginBottom:14}} hover><div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:14,fontFamily:"'JetBrains Mono',monospace"}}>Margin by Job</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:10}} className="resp-grid-3">{filtered.map(j=>{const f=getJobFinancials(j.id);const mc=f.margin>=30?"#34d399":f.margin>=20?"#fbbf24":"#f87171";return <div key={j.id} style={{padding:"10px 12px",background:"#000",borderRadius:10,border:"1px solid rgba(255,255,255,0.04)",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(45,212,191,0.12)";e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";e.currentTarget.style.transform="translateY(0)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:14,fontWeight:600,color:"#f0f0f0"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:11,marginRight:6}}>{jobNum(j.id)}</span>{j.name}</span><span style={{fontSize:16,fontWeight:800,color:mc,fontFamily:"'JetBrains Mono',monospace"}}>{pct(f.margin)}</span></div><div style={{fontSize:13,color:"#a3a3a3",marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</div><Bar value={f.margin} max={100} color={mc} height={5}/></div>})}</div>
    </Card>
  </div>;
}


function JobsPage(ctx){
  const {jobs,reps,customers,vendors,selectedJob,setSelectedJob,showNewJob,setShowNewJob,notify,getJobFinancials,getJobItems,getItemStatus,getJobPOStatus,getJobInvStatus,updateJob,addJob,addLineItem,updateLineItem,deleteLineItem,lineItems,addCustomer,addVendor,deleteJob,confirm,db} = ctx;
  const [viewMode,setViewMode]=useState("kanban");
  const [newJob,setNewJob]=useState({name:"",customer:"",salesRep:reps[0]?.id||"",phase:"Quoting",dueDate:"",startDate:"",notes:"",terms:"Net 30",poNumber:"",shipTo:"",shipVia:""});
  const [newCust,setNewCust]=useState(false);
  const [custForm,setCustForm]=useState({name:"",contact:"",email:"",phone:"",type:"K-12 District",address:""});
  const [sortBy,setSortBy]=useState("createdDate");
  const [uploadData,setUploadData]=useState(null);
  const [uploadJobName,setUploadJobName]=useState('');
  const [uploadSheets,setUploadSheets]=useState({});
  const [uploading,setUploading]=useState(false);
  const [uploadAiChat,setUploadAiChat]=useState([]);
  const [uploadAiQuery,setUploadAiQuery]=useState('');
  const [uploadAiLoading,setUploadAiLoading]=useState(false);
  const [uploadAiStatus,setUploadAiStatus]=useState(null);
  const uploadRef=useRef();
  const [jobSelected,setJobSelected]=useState(new Set());
  const [jobBulkAction,setJobBulkAction]=useState(null);


  
  // XLS Quote Upload Parser
  const parseQuoteFile=async(file)=>{
    try{
      const XLSX=await import('xlsx');
      const data=await file.arrayBuffer();
      const wb=XLSX.read(data,{type:'array'});
      const items=[];const vendorSet=new Set();const groups=new Set();const sheets=[];
      const safeNum=(raw)=>{if(typeof raw==='number'&&isFinite(raw))return raw;const s=String(raw||'').replace(/[$,]/g,'').trim();if(!s||/[a-zA-Z]/.test(s))return 0;const v=parseFloat(s);return isFinite(v)?v:0};
      for(let si=0;si<wb.SheetNames.length;si++){
        const sn=wb.SheetNames[si];const ws=wb.Sheets[sn];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const hiddenRows=ws['!rows']||[];
        let grp='';let ct=0;let lastManuf='';
        // Dynamic column detection
        let colMap=null;
        const findHeader=(row)=>{
          const h={};
          for(let c=0;c<row.length;c++){
            const v=String(row[c]||'').toLowerCase().trim();
            if(v==='tag')h.tag=c;
            else if(v==='manuf'||v==='manuf.'||v==='manufacturer'||v==='vendor'||v==='vendor name'||v==='supplier')h.manuf=c;
            else if(v==='model #'||v==='model'||v==='model#'||v==='model number')h.model=c;
            else if(v==='description'||v==='desc'||v==='item'||v==='item description'||v==='product'||v==='product description')h.desc=c;
            else if(v==='color'||v==='finish')h.color=c;
            else if(v==='qty'||v==='quantity'||v==='qty ordered'||v==='ordered')h.qty=c;
            else if(v==='list'||v==='list price'||v==='list each')h.list=c;
            else if(v==='ext'&&!h.listExt){if(h.list!==undefined)h.listExt=c;else h.list=c}
            // Lisa's WIP spreadsheets use "Cost" (per-unit) as the net-cost column. Added
            // as an alias so the WIP format is recognized without breaking quotes that
            // use the standard "Net Each" / "Dealer" terminology.
            else if(v==='net each'||v==='net'||v==='net ea'||v==='net price'||v==='dealer'||v==='dealer net'||v==='cost'||v==='unit cost'||v==='each')h.net=c;
            else if(v==='net ext'||v==='net extended')h.netExt=c;
            else if(v==='your price'||v==='sell'||v==='sell price'||v==='unit price'||v==='price each'||v==='sell each'||v==='customer price')h.price=c;
            // Lisa's WIP uses "Total" for the per-line extended total. Added as an alias
            // to the existing priceExt vocabulary -- still detected via exact equality, so
            // value cells like "Subtotal" or "Total: $5,000" cannot trigger a false header.
            else if(v==='your price extended'||v==='sell ext'||v==='sell extended'||v==='price ext'||v==='extended'||v==='ext price'||v==='line total'||v==='total')h.priceExt=c;
            else if(v==='shipping'||v==='ship'||v==='shipping each'||v==='freight'){if(h.ship!==undefined)h.shipTotal=c;else h.ship=c}
            else if(v==='shipping total'||v==='ship total'||v==='freight total')h.shipTotal=c;
            else if(v==='install'||v==='install each'||v==='installation'){if(h.install!==undefined)h.installTotal=c;else h.install=c}
            else if(v==='install total'||v==='installation total')h.installTotal=c;
          }
          // Column-0-as-description fallback: many WIP spreadsheets leave the first column
          // header blank but use that column for item names (Lisa's standard WIP layout).
          // If at least 2 mapped columns were detected AND row[0] header is blank AND desc
          // wasn't already mapped, assume col 0 is the description column. Conservative on
          // purpose: requires >=2 real matches AND a blank first-cell header.
          if(Object.keys(h).length>=2&&h.desc===undefined&&String(row[0]||'').trim()===''){
            h.desc=0;
          }
          return Object.keys(h).length>=3?h:null;
        };
        // Fallback hardcoded map for Lisa's standard format
        const defaultMap={tag:0,manuf:1,model:2,desc:3,color:4,qty:5,list:6,listExt:7,net:8,netExt:9,price:10,priceExt:11};
        for(let r=0;r<rows.length;r++){
          if(hiddenRows[r]&&hiddenRows[r].hidden)continue;
          const row=rows[r];if(!row||row.length<3)continue;
          // Try to detect header row
          if(!colMap){
            const detected=findHeader(row);
            if(detected){colMap=detected;continue}
            if(String(row[0]||'').toLowerCase().trim()==='tag'){colMap=defaultMap;continue}
          }
          const cm=colMap||defaultMap;
          const g=v=>cm[v]!==undefined?row[cm[v]]:'';
          const n=v=>safeNum(g(v));
          const s=v=>String(g(v)||'').trim();
          // Check if any cell in the row contains "Total"/"Subtotal"/"Grand Total" (catches totals in ANY column)
          const rowHasTotal=row.some(cell=>{const cv=String(cell||'').trim().toLowerCase();return cv==='total'||cv==='subtotal'||cv==='grand total'});
          if(rowHasTotal)continue;
          const desc=s('desc');const tag=s('tag');const manuf=s('manuf');const model=s('model');
          // Group header: has description but no tag, no manuf, no qty, no prices
          if(desc&&!tag&&!manuf&&!n('qty')&&!n('list')&&!n('net')&&!n('price')){grp=desc.replace(/\n/g,' ').substring(0,80);groups.add(grp);continue}
          // Skip non-data rows
          if(!desc)continue;
          let cleanDesc=desc.replace(/\r/g,'').split('\n')[0].trim();
          const si2=cleanDesc.indexOf('Item Specifics');if(si2>0)cleanDesc=cleanDesc.substring(0,si2).trim();
          const ri=cleanDesc.indexOf('-- Room Number');if(ri>0)cleanDesc=cleanDesc.substring(0,ri).trim();
          const ri2=cleanDesc.indexOf('Room Number');if(ri2>20)cleanDesc=cleanDesc.substring(0,ri2).trim();
          if(/^quote\s*[#]?\d/i.test(cleanDesc)||cleanDesc.startsWith('#'))continue;
          if(/^(subtotal|grand total)$/i.test(cleanDesc.trim())||/^total$/i.test(cleanDesc.trim()))continue;
          // Skip disclaimer/notes rows
          if(cleanDesc.startsWith('*')&&!n('qty')&&!n('list')&&!n('net')&&!n('price')&&!n('priceExt'))continue;
          const qty=Math.round(n('qty'));const list=n('list');const net=n('net');const price=n('price');const priceExt=n('priceExt');
          // Accept row if it has ANY numeric data
          if(qty<=0&&list<=0&&net<=0&&price<=0&&priceExt<=0)continue;
          if(qty<=0&&priceExt<=0)continue; // zero qty + zero extended sell = hidden/alternate row; skip even if the .xls hidden-row flag was not read
          const mfr=manuf||lastManuf;if(manuf)lastManuf=manuf;if(mfr)vendorSet.add(mfr);
          // Smart shipping per-unit: detect if column has extended total instead of per-unit
          let shipPU=n('ship');const shipTot=n('shipTotal');
          if(!shipPU&&shipTot&&qty>0)shipPU=shipTot/qty;
          else if(shipPU&&!shipTot&&qty>1&&net>0&&shipPU>net)shipPU=shipPU/qty;
          let instPU=n('install');const instTot=n('installTotal');
          if(!instPU&&instTot&&qty>0)instPU=instTot/qty;
          else if(instPU&&!instTot&&qty>1&&net>0&&instPU>net)instPU=instPU/qty;
          items.push({tag:tag.replace(/\.0$/,''),manufacturer:mfr||sn,
            modelNumber:model.replace(/\.0$/,''),description:cleanDesc,
            color:s('color'),qtyOrdered:qty||1,listPrice:list,
            unitCost:net||0,shippingPerUnit:shipPU||0,
            installPerUnit:instPU||0,unitPrice:price||(priceExt&&qty>0?priceExt/qty:0)||0,
            priceExtended:priceExt||0,
            group:grp||tag||'',sheet:sn});ct++
        }
        sheets.push({name:sn,count:ct})
      }
      let name=file.name.replace(/\.(xls|xlsx|csv)$/i,'').replace(/_/g,' ');
      try{const ws0=wb.Sheets[wb.SheetNames[0]];const d0=XLSX.utils.sheet_to_json(ws0,{header:1,defval:''});
        if(d0[0]&&d0[0][4])name=String(d0[0][4]).split('\n')[0].trim()}catch{}
      if(uploadRef.current)uploadRef.current.value='';
      setUploadJobName(name);
      const sel={};sheets.forEach(s=>{sel[s.name]=true});setUploadSheets(sel);
      setUploadData({items,vendors:vendorSet,groups,sheets});
      notify(items.length+' items found'+(items.length>0?' -- AI verifying in background...':'. AI scanning...'));
      // Branched chat messaging: when 0 items found, the most likely cause is a
      // header row that doesn't match the parser's vocabulary. Tell the user that
      // explicitly so they don't waste time wondering why the table is empty.
      // The AI scan still runs in the background and may recover items separately.
      if(items.length===0){
        setUploadAiChat([{role:'assistant',content:'Parser found 0 items across '+sheets.length+' sheet(s). The most common cause is column headers the parser doesn\u0027t recognize. The parser looks for headers like Tag, Manuf, Model, Description, Qty, Net Each, Cost, Quantity, Total, Your Price, etc. If your spreadsheet uses different labels, the AI scan running in the background should pick up the items -- give it a moment.'}]);
      } else {
        setUploadAiChat([{role:'assistant',content:'Parser found '+items.length+' items across '+sheets.length+' sheet(s). AI is verifying in the background. You can ask me questions about the data while we wait.'}]);
      }
      setUploadAiStatus(null);
      // AI runs in parallel on Job Records uploads too
      try{
        let aiText='FILE: '+file.name+'\n\n';
        for(const sn2 of wb.SheetNames){const ws2=wb.Sheets[sn2];const rows2=XLSX.utils.sheet_to_json(ws2,{header:1,defval:''});const hr2=ws2['!rows']||[];
          aiText+='=== Sheet: '+sn2+' ('+rows2.length+' rows) ===\n';
          rows2.forEach((row2,ri2)=>{if(hr2[ri2]&&hr2[ri2].hidden)return;const cells2=row2.map(c2=>String(c2||'').replace(/\s*[\r\n]+\s*/g,' ').trim()).filter(Boolean);if(cells2.length>=2)aiText+='R'+ri2+': '+cells2.join(' | ')+'\n'});
          aiText+='\n'}
        fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          image_data:btoa(unescape(encodeURIComponent(aiText))),media_type:'text/plain',scan_type:'quote_document',
          extra_context:'This is a furniture dealer quote spreadsheet for Midwest Educational Furnishings. Extract EVERY furniture line item. Return the total item count and verify the Your Price Extended grand total.'
        })}).then(r=>r.json()).then(resp=>{
          const t=(resp.content||[])[0]?.text||'';try{const ai=JSON.parse(t.replace(/\`\`\`json\s*/g,'').replace(/\`\`\`\s*/g,'').trim());
          if(ai.items?.length>0){const diff=Math.abs((ai.items?.length||0)-items.length);
            if(diff>5){notify('AI found '+(ai.items?.length||0)+' items vs parser '+items.length+'. Review recommended.');setUploadAiStatus('mismatch');setUploadAiChat(p=>[...p,{role:'assistant',content:'I found '+(ai.items?.length||0)+' items vs the parser\'s '+items.length+'. There may be missing or extra items. Ask me to investigate.'}])}
            else{notify('AI verified: '+items.length+' items confirmed.');setUploadAiStatus('verified');setUploadAiChat(p=>[...p,{role:'assistant',content:'Verified: '+items.length+' items confirmed. The parser output looks correct. Ask me if anything seems off.'}])}}}catch{}
        }).catch(()=>{});
      }catch{}
    }catch(err){notify('Error reading file: '+err.message,'error')}
  };
  // AI quote scan for PDF/image uploads from Job Records page -- populates uploadData preview (same as Excel)
  const parseQuoteFileAI=async(file)=>{
    if(uploading)return;setUploading(true);
    notify('Scanning document with AI... this may take a moment');
    try{
      const reader=new FileReader();
      const base64=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result.split(',')[1]);reader.onerror=rej;reader.readAsDataURL(file)});
      const mediaType=file.type||'application/pdf';
      const resp=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data:base64,media_type:mediaType,scan_type:'quote_document'})});
      if(!resp.ok)throw new Error('AI scan failed: '+resp.status);
      const scanData=await resp.json();
      const text=((scanData.content||[]).find(b=>b.type==='text')?.text||'').trim();
      let parsed;
      try{const m=text.match(/\{[\s\S]*\}/);parsed=m?JSON.parse(m[0]):JSON.parse(text)}catch(e2){notify('AI could not parse this document. Try an Excel file instead.','error');setUploading(false);if(uploadRef.current)uploadRef.current.value='';return}
      if(!parsed.items||parsed.items.length===0){notify('No line items found in document.','error');setUploading(false);if(uploadRef.current)uploadRef.current.value='';return}
      // Map AI scan results into the same uploadData format as Excel parser
      const sheetName='AI Scan';
      const vendorSet=new Set();
      const items=[];
      const vendorName=parsed.vendor||'';
      for(const item of parsed.items){
        const mfr=item.manufacturer||vendorName||'';
        if(mfr)vendorSet.add(mfr);
        const qty=parseInt(item.quantity)||1;
        const listPrice=parseFloat(item.list_price)||0;
        const unitCost=parseFloat(item.net_cost)||0;
        const unitPrice=parseFloat(item.sell_price)||parseFloat(item.list_price)||0;
        items.push({
          tag:item.tag||'',manufacturer:mfr,modelNumber:item.model_number||item.model||'',
          description:item.description||'',color:item.color||'',
          qtyOrdered:qty,listPrice,unitCost,
          shippingPerUnit:parseFloat(item.shipping)||0,installPerUnit:parseFloat(item.install)||0,
          unitPrice,priceExtended:parseFloat(item.extended_price)||(unitPrice*qty)||0,
          group:'',sheet:sheetName
        });
      }
      const sheets=[{name:sheetName,count:items.length}];
      const jobName=parsed.customer||parsed.quote_number||file.name.replace(/\.(pdf|png|jpg|jpeg)$/i,'').replace(/_/g,' ');
      if(uploadRef.current)uploadRef.current.value='';
      setUploadJobName(jobName);
      setUploadSheets({[sheetName]:true});
      setUploadData({items,vendors:vendorSet,groups:new Set(),sheets});
      notify(items.length+' items found via AI scan');
      setUploadAiChat([{role:'assistant',content:'AI scan found '+items.length+' line items'+(vendorSet.size>0?' from '+vendorSet.size+' vendor(s)':'')+'. Review the data below and click Import when ready. You can ask me questions about the parsed data.'}]);
      setUploadAiStatus('verified');
    }catch(err){notify('Error scanning file: '+err.message,'error')}
    setUploading(false);if(uploadRef.current)uploadRef.current.value='';
  };
  const [uploadAiChangedRows, setUploadAiChangedRows] = useState(new Set());
  const handleUploadAiChat = async (query) => {
    if (!query.trim() || !uploadData) return;
    setUploadAiQuery('');
    setUploadAiChat(p => [...p, {role:'user', content:query}]);
    setUploadAiLoading(true);
    try {
      const items = uploadData.items.filter(i => uploadSheets[i.sheet]);
      const itemSummary = items.slice(0, 150).map((it, idx) =>
        '[' + idx + '] tag=' + (it.tag||'') + ' | manuf=' + (it.manufacturer||'') + ' | model=' + (it.modelNumber||'') + ' | desc=' + (it.description||'').slice(0,60) + ' | color=' + (it.color||'') + ' | qty=' + it.qtyOrdered + ' | cost=' + (it.unitCost||0).toFixed(2) + ' | price=' + (it.unitPrice||0).toFixed(2)
      ).join('\n');
      const system = `You are an AI assistant reviewing parsed Excel quote data for Midwest Educational Furnishings. There are ${items.length} parsed line items.


CAPABILITIES:
- Answer questions about the parsed data (totals, missing items, vendors, etc.)
- MODIFY line items when the user asks to change, fix, update, or correct something


TO MODIFY ITEMS, you MUST respond with a JSON block. Put your explanation text BEFORE the JSON. The JSON must be on its own line:
{"actions":[{"index":0,"field":"unitPrice","value":500},{"index":3,"field":"qtyOrdered","value":10}]}


Valid fields: tag, manufacturer, modelNumber, description, color, qtyOrdered, unitCost, unitPrice, shippingPerUnit, installPerUnit, listPrice
Index is the row number shown in [brackets] in the item list below.


IMPORTANT: Always include the JSON block when the user asks you to change something. Do not just describe what you would change. Actually output the JSON to make the change happen.


Never use emoji. Be concise.`;
      const msgs = [...uploadAiChat.slice(-6).map(m => ({role:m.role, content:m.content})), {role:'user', content:query + '\n\nPARSED ITEMS (' + items.length + ' total, showing first 150):\n' + itemSummary + (items.length > 150 ? '\n... and ' + (items.length - 150) + ' more items' : '')}];
      const resp = await fetch('/api/brain', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({system, messages:msgs, tools:[]})});
      const data = await resp.json();
      const text = (data.content||[]).filter(b => b.type === 'text').map(b => b.text).join('\n');
      // Parse action JSON from response
      let applied = 0;
      try {
        const jsonRegex = /\{"actions"\s*:\s*\[[\s\S]*?\]\s*\}/;
        const jsonMatch = text.match(jsonRegex);
        if (jsonMatch) {
          const parsed2 = JSON.parse(jsonMatch[0]);
          if (parsed2.actions && parsed2.actions.length > 0) {
            const newItems = [...uploadData.items];
            const filtered = newItems.filter(i => uploadSheets[i.sheet]);
            const changedIdxs = new Set();
            parsed2.actions.forEach(a => {
              if (a.index >= 0 && a.index < filtered.length && a.field) {
                const item = filtered[a.index];
                const globalIdx = newItems.indexOf(item);
                if (globalIdx >= 0) {
                  newItems[globalIdx] = {...item, [a.field]: a.value};
                  changedIdxs.add(a.index);
                  applied++;
                }
              }
            });
            if (applied > 0) {
              setUploadData({...uploadData, items: newItems});
              setUploadAiChangedRows(changedIdxs);
              setTimeout(() => setUploadAiChangedRows(new Set()), 3000);
              const cleanText = text.replace(jsonRegex, '').trim();
              setUploadAiChat(p => [...p, {role:'assistant', content:(cleanText || 'Done.') + '\n\nUpdated ' + applied + ' item(s). Changes highlighted in the table above.'}]);
            }
          }
        }
      } catch(e2) { /* JSON parse failed, treat as text */ }
      if (applied === 0) {
        setUploadAiChat(p => [...p, {role:'assistant', content:text}]);
      }
    } catch(e) {
      setUploadAiChat(p => [...p, {role:'assistant', content:'Error: ' + e.message}]);
    }
    setUploadAiLoading(false);
  };
  const handleUploadImport=()=>{
    if(!uploadData||uploading)return;setUploading(true);
    try{
      const items=uploadData.items.filter(i=>uploadSheets[i.sheet]);
      if(items.length===0){notify('No items selected','error');setUploading(false);return}
      const maxNum=jobs.reduce((mx,j)=>{const m=j.id.match(/JOB-\d+-(\d+)/);return m?Math.max(mx,parseInt(m[1])):mx},0);
      const jid='JOB-2026-'+String(maxNum+1).padStart(3,'0');
      addJob({id:jid,name:uploadJobName||'Imported Quote',customer:customers[0]?.id||'',salesRep:reps[0]?.id||'',
        phase:'Quoting',createdDate:new Date().toISOString().split('T')[0],
        startDate:'',dueDate:'',endDate:'',notes:'Imported from uploaded quote - '+items.length+' line items',
        paymentStatus:'unpaid',terms:'Net 30',poNumber:'',shipTo:'',shipVia:'',billTo:'',orderNotes:'',
        docStatuses:{},activities:[],auditTrail:[]});
      const existNames=new Set(vendors.map(v=>v.name.toLowerCase().trim()));
      const vMap={};vendors.forEach(v=>{vMap[v.name.toLowerCase().trim()]=v.id});
      for(const vn of uploadData.vendors){const k=vn.toLowerCase().trim();
        if(!existNames.has(k)){const vid='V-'+Math.random().toString(36).slice(2,8);
          addVendor({id:vid,name:vn,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0,discountType:'percentage',discountNotes:''});
          vMap[k]=vid;existNames.add(k)}}
      let ct=0;
      for(const item of items){const vk=(item.manufacturer||'').toLowerCase().trim();
        addLineItem({id:'LI-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),jobId:jid,description:item.description,
          vendor:vMap[vk]||'',tag:item.tag,group:item.group,manufacturer:item.manufacturer,
          modelNumber:item.modelNumber,color:item.color,listPrice:item.listPrice,unitCost:item.unitCost,
          unitPrice:item.unitPrice,shippingPerUnit:item.shippingPerUnit,installPerUnit:item.installPerUnit,
          priceExtended:item.priceExtended||0,
          qtyOrdered:item.qtyOrdered,qtyReceived:0,qtyInvoiced:0,poDate:'',deliveryDate:'',invoiceDate:''});ct++}
      notify('Imported '+ct+' items into "'+uploadJobName+'" -- click the job to view');
      // Force re-fetch line items after batch import to ensure consistency across sessions
      setTimeout(async()=>{try{const d=await db.loadAll();if(d.lineItems)ctx.setLineItems(p=>{const ids=new Set(d.lineItems.map(li=>li.id));return [...d.lineItems,...p.filter(li=>!ids.has(li.id))]});if(d.jobs)ctx.setJobs(p=>{const ids=new Set(d.jobs.map(j=>j.id));return [...d.jobs,...p.filter(j=>!ids.has(j.id))]})}catch{}},3000);
      setUploadData(null);setUploadJobName('');setUploadAiChat([]);setUploadAiStatus(null);setUploadAiChangedRows(new Set());setSelectedJob(jid);
    }catch(err){notify('Import error: '+err.message,'error')}
    setUploading(false);
  };
  const uploadSelCount=uploadData?uploadData.items.filter(i=>uploadSheets[i.sheet]).length:0;
  const uploadSelPricedCount=uploadData?uploadData.items.filter(i=>uploadSheets[i.sheet]&&(i.unitPrice>0||i.priceExtended>0)).length:0;
  const uploadSelCost=uploadData?uploadData.items.filter(i=>uploadSheets[i.sheet]).reduce((s,i)=>s+(i.unitCost*(i.qtyOrdered||1)),0):0;
  const uploadSelRev=uploadData?uploadData.items.filter(i=>uploadSheets[i.sheet]).reduce((s,i)=>s+(i.priceExtended&&i.priceExtended>0?i.priceExtended:(i.unitPrice||0)*(i.qtyOrdered||1)),0):0;
  const handleCreateJob=()=>{if(!newJob.name)return;const maxNum=jobs.reduce((mx,j)=>{const m=j.id.match(/JOB-\d+-(\d+)/);return m?Math.max(mx,parseInt(m[1])):mx},0);const id=`JOB-2026-${String(maxNum+1).padStart(3,"0")}`;addJob({id,...newJob,phase:newJob.phase||"Quoting",createdDate:new Date().toISOString().split("T")[0],startDate:newJob.startDate||"",endDate:"",paymentStatus:"unpaid",terms:newJob.terms||"Net 30",poNumber:newJob.poNumber||"",shipTo:newJob.shipTo||"",shipVia:newJob.shipVia||"",billTo:newJob.billTo||"",orderNotes:""});setShowNewJob(false);setNewJob({name:"",customer:"",salesRep:reps[0]?.id||"",phase:"Quoting",dueDate:"",startDate:"",notes:"",terms:"Net 30",poNumber:"",shipTo:"",shipVia:""});notify(`Job ${id} created -- saved to database`)};


  const newJobModal = <><input ref={uploadRef} type="file" accept=".xls,.xlsx,.pdf,.png,.jpg,.jpeg" onChange={e=>{if(!e.target.files[0])return;const f=e.target.files[0];const ext=(f.name||'').split('.').pop().toLowerCase();if(ext==='pdf'||f.type==='application/pdf'||f.type?.startsWith('image/'))parseQuoteFileAI(f);else parseQuoteFile(f)}} style={{display:"none"}}/>{showNewJob&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp 0.25s"}} onClick={e=>{if(e.target===e.currentTarget)setShowNewJob(false)}}><div style={{background:"#111",border:"1px solid rgba(45,212,191,0.15)",borderRadius:16,padding:28,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{fontSize:18,fontWeight:800,color:"#f0f0f0"}}>New Job Record</div><div onClick={()=>setShowNewJob(false)} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#737373",fontSize:18,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#f0f0f0"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="#737373"}}>x</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={newJob.name} onChange={e=>setNewJob({...newJob,name:e.target.value})} placeholder="e.g., Lincoln USD Media Center" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer</label><CustomerPicker value={newJob.customer} onChange={v=>setNewJob({...newJob,customer:v})} customers={customers} onAddNew={(name)=>{const id="CUST-"+Math.random().toString(36).slice(2,8);addCustomer({id,name:name||"New Customer",contact:"",email:"",phone:"",type:"K-12 District",address:""});setNewJob({...newJob,customer:id});notify("Customer created: "+(name||"New Customer"))}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Sales Rep</label><select value={newJob.salesRep} onChange={e=>setNewJob({...newJob,salesRep:e.target.value})} style={inputStyle}>{reps.filter(isSalesRep).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Phase</label><select value={newJob.phase||"Quoting"} onChange={e=>setNewJob({...newJob,phase:e.target.value})} style={inputStyle}><option>Quoting</option><option>Approved</option><option>Ordered</option><option>In Production</option><option>Delivering</option><option>Invoiced</option><option>Complete</option></select></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Start Date</label><input type="date" value={newJob.startDate} onChange={e=>setNewJob({...newJob,startDate:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Due Date</label><input type="date" value={newJob.dueDate} onChange={e=>setNewJob({...newJob,dueDate:e.target.value})} style={inputStyle}/></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Notes</label><input value={newJob.notes} onChange={e=>setNewJob({...newJob,notes:e.target.value})} placeholder="Project details..." style={inputStyle}/></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Terms</label><select value={newJob.terms||"Net 30"} onChange={e=>setNewJob({...newJob,terms:e.target.value})} style={inputStyle}><option>Net 30</option><option>Net 15</option><option>Due Upon Receipt</option></select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer PO #</label><input value={newJob.poNumber||""} onChange={e=>setNewJob({...newJob,poNumber:e.target.value})} placeholder="Customer PO number" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Ship To</label><textarea value={newJob.shipTo||""} onChange={e=>setNewJob({...newJob,shipTo:e.target.value})} placeholder={"School Name\nStreet Address\nCity, State Zip"} rows={3} style={{...inputStyle,resize:"vertical",minHeight:56,lineHeight:1.4,fontFamily:"inherit"}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Ship Via</label><input value={newJob.shipVia||""} onChange={e=>setNewJob({...newJob,shipVia:e.target.value})} placeholder="Shipping instructions" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Bill To</label><textarea value={newJob.billTo||""} onChange={e=>setNewJob({...newJob,billTo:e.target.value})} placeholder={"School Name\nStreet Address\nCity, State Zip"} rows={3} style={{...inputStyle,resize:"vertical",minHeight:56,lineHeight:1.4,fontFamily:"inherit"}}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={handleCreateJob}>Create Job Record</Btn><Btn v="secondary" onClick={()=>setShowNewJob(false)}>Cancel</Btn></div></div></div>}</>;


  // Kanban drag handler
  const handleDragStart=(e,jobId)=>{e.dataTransfer.setData("jobId",jobId)};
  const handleDrop=(e,phase)=>{e.preventDefault();const jobId=e.dataTransfer.getData("jobId");if(jobId)updateJob(jobId,{phase});notify(`Job moved to ${phase}`)};
  const handleDragOver=(e)=>e.preventDefault();


  if(selectedJob){
    const job=jobs.find(j=>j.id===selectedJob);
    if(!job){setTimeout(()=>setSelectedJob(null),0);return <div style={{padding:40,textAlign:"center",color:"#737373"}}>Loading...</div>}
    return <JobDetail job={job} ctx={ctx}/>;
  }


  const filteredJobs = jobs.filter(j => { const s = (ctx.globalSearch||"").toLowerCase(); if (!s) return true; const c = customers.find(c=>c.id===j.customer)?.name||""; const r = reps.find(r=>r.id===j.salesRep)?.name||""; return j.name.toLowerCase().includes(s)||j.id.toLowerCase().includes(s)||c.toLowerCase().includes(s)||r.toLowerCase().includes(s)||j.phase.toLowerCase().includes(s); });
  const sortedJobs = [...filteredJobs].sort((a,b)=>{ if(sortBy==="revenue") return getJobFinancials(b.id).totalRevenue-getJobFinancials(a.id).totalRevenue; if(sortBy==="margin") return getJobFinancials(b.id).margin-getJobFinancials(a.id).margin; if(sortBy==="name") return a.name.localeCompare(b.name); return (b[sortBy]||"").localeCompare(a[sortBy]||""); });


  return <>{newJobModal}<div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Job Records" sub="Central hub -- single source of truth for every project"/>


    <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
      <input value={ctx.globalSearch} onChange={e=>ctx.setGlobalSearch(e.target.value)} placeholder="Search jobs..." style={{...inputStyle,flex:"0 1 260px",minWidth:160,background:"#111111",border:"1px solid #222222",padding:"10px 14px",fontSize:14}}/><Btn onClick={()=>setShowNewJob(true)} style={{flexShrink:0,whiteSpace:"nowrap"}}><I n="plus" s={14}/> New Job</Btn><Btn onClick={()=>uploadRef.current?.click()} v="secondary" style={{flexShrink:0,whiteSpace:"nowrap"}}><I n="download" s={14}/> Upload Quote</Btn><Btn onClick={()=>setNewCust(true)} v="secondary" style={{flexShrink:0,whiteSpace:"nowrap"}}><I n="plus" s={14}/> Add Customer</Btn>
      <div style={{display:"flex",gap:4,background:"#111111",padding:3,borderRadius:8}}>
        {[["table","Table"],["kanban","Kanban"]].map(([v,l])=><button key={v} onClick={()=>setViewMode(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:viewMode===v?"#2dd4bf":"transparent",color:viewMode===v?"#000000":"#525252",fontSize:12,fontWeight:viewMode===v?600:400,fontFamily:"inherit"}}>{l}</button>)}
      </div>
      <div style={{display:"flex",gap:4,background:"#111111",padding:3,borderRadius:8,marginLeft:"auto"}}>
        <span style={{fontSize:12,color:"#a3a3a3",padding:"5px 8px"}}>Sort:</span>
        {[["createdDate","Date"],["name","Name"],["revenue","Revenue"],["margin","Margin"]].map(([v,l])=><button key={v} onClick={()=>setSortBy(v)} style={{padding:"5px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sortBy===v?"#2dd4bf22":"transparent",color:sortBy===v?"#2dd4bf":"#525252",fontSize:12,fontFamily:"inherit"}}>{l}</button>)}
      </div>
    </div>


    {uploadData&&<Card style={{marginBottom:24,border:"1px solid rgba(45,212,191,0.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,color:"#2dd4bf"}}>Quote Import Preview</div>
        <Btn v="secondary" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>{setUploadData(null);setUploadAiChat([]);setUploadAiStatus(null);setUploadAiChangedRows(new Set());if(uploadRef.current)uploadRef.current.value=''}}>Cancel</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Line Items</div><div style={{fontSize:22,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{uploadSelCount}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Vendors</div><div style={{fontSize:22,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{uploadData.vendors.size}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total Cost</div><div style={{fontSize:22,fontWeight:700,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>${Math.round(uploadSelCost).toLocaleString()}</div></div>
        <div style={{padding:12,background:"#0a0a0a",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Revenue</div><div style={{fontSize:22,fontWeight:700,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>${Math.round(uploadSelRev).toLocaleString()}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:16}}>
        <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={uploadJobName} onChange={e=>setUploadJobName(e.target.value)} style={inputStyle}/></div>
        <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Sheets</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{uploadData.sheets.map(s=><button key={s.name} onClick={()=>setUploadSheets(p=>({...p,[s.name]:!p[s.name]}))} style={{padding:"3px 8px",borderRadius:5,border:"none",cursor:"pointer",fontSize:11,fontFamily:"inherit",background:uploadSheets[s.name]?"rgba(45,212,191,0.15)":"rgba(255,255,255,0.04)",color:uploadSheets[s.name]?"#2dd4bf":"#525252",fontWeight:uploadSheets[s.name]?600:400}}>{s.name} ({s.count})</button>)}</div>
        </div>
      </div>
      <div style={{overflowX:"auto",maxHeight:240,borderRadius:8,border:"1px solid rgba(255,255,255,0.04)",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:800}}>
          <thead><tr style={{background:"#0a0a0a",position:"sticky",top:0}}>{["Tag","Manuf","Model","Description","Qty","List","Net","Ship","Your Price"].map(h=><th key={h} style={{padding:"5px 6px",textAlign:"left",fontWeight:600,color:"#525252",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{(()=>{let lastV='';return uploadData.items.filter(i=>uploadSheets[i.sheet]).slice(0,30).map((it,idx)=>{const showSep=it.manufacturer&&it.manufacturer!==lastV;if(it.manufacturer)lastV=it.manufacturer;const isChanged=uploadAiChangedRows.has(idx);return <React.Fragment key={idx}>{showSep&&idx>0&&<tr><td colSpan={9} style={{padding:"6px 6px 2px",borderTop:"1px solid rgba(45,212,191,0.12)"}}><span style={{fontSize:10,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:1}}>{it.manufacturer}</span></td></tr>}<tr style={{borderBottom:"1px solid rgba(255,255,255,0.02)",background:isChanged?"rgba(45,212,191,0.12)":"transparent",transition:"background 0.5s ease"}}>
            <td style={{padding:"4px 6px",color:"#a78bfa"}}>{it.tag}</td>
            <td style={{padding:"4px 6px",color:"#9a9a9a"}}>{it.manufacturer}</td>
            <td style={{padding:"4px 6px",color:"#9a9a9a",fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{it.modelNumber}</td>
            <td style={{padding:"4px 6px",color:"#c4c4c4",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</td>
            <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{it.qtyOrdered}</td>
            <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#525252"}}>{it.listPrice?'$'+it.listPrice.toFixed(0):'--'}</td>
            <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#34d399"}}>${it.unitCost.toFixed(2)}</td>
            <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#fbbf24"}}>{it.shippingPerUnit?'$'+it.shippingPerUnit.toFixed(0):'--'}</td>
            <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf",fontWeight:600}}>{it.unitPrice?'$'+it.unitPrice.toFixed(2):'--'}</td>
          </tr></React.Fragment>})})()}</tbody>
        </table>
        {uploadSelCount>30&&<div style={{padding:8,textAlign:"center",color:"#333",fontSize:11}}>Showing 30 of {uploadSelCount}</div>}
      </div>
      {/* AI Chat Assistant */}
      <div style={{borderTop:'1px solid #1a1a1a',paddingTop:14,marginTop:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:uploadAiStatus==='verified'?'#34d399':uploadAiStatus==='mismatch'?'#f87171':uploadAiLoading?'#fbbf24':'#333',animation:uploadAiLoading?'pulse 1.5s infinite':'none'}}/>
          <span style={{fontSize:12,fontWeight:600,color:uploadAiStatus==='verified'?'#34d399':uploadAiStatus==='mismatch'?'#f87171':'#737373'}}>{uploadAiStatus==='verified'?'AI Verified':uploadAiStatus==='mismatch'?'AI Found Discrepancy':uploadAiLoading?'AI Verifying...':'AI Assistant'}</span>
        </div>
        {uploadAiChat.length>0&&<div style={{maxHeight:180,overflowY:'auto',marginBottom:8,display:'flex',flexDirection:'column',gap:4}}>
          {uploadAiChat.map((m,i)=><div key={i} style={{padding:'6px 10px',borderRadius:8,fontSize:12,lineHeight:1.5,maxWidth:'88%',alignSelf:m.role==='user'?'flex-end':'flex-start',background:m.role==='user'?'rgba(45,212,191,0.08)':'#0a0a0a',color:m.role==='user'?'#2dd4bf':'#a3a3a3',border:'1px solid '+(m.role==='user'?'rgba(45,212,191,0.12)':'#1a1a1a'),whiteSpace:'pre-wrap'}}>{m.content}</div>)}
          {uploadAiLoading&&<div style={{padding:'6px 10px',borderRadius:8,fontSize:11,color:'#fbbf24',alignSelf:'flex-start'}}>Thinking...</div>}
        </div>}
        <div style={{display:'flex',gap:6,marginBottom:14}}>
          <input value={uploadAiQuery} onChange={e=>setUploadAiQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!uploadAiLoading)handleUploadAiChat(uploadAiQuery)}} placeholder="Ask about the parsed data..." style={{flex:1,padding:'7px 12px',background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:16,color:'#f0f0f0',fontSize:12,outline:'none',fontFamily:'inherit'}} disabled={uploadAiLoading}/>
          <button onClick={()=>handleUploadAiChat(uploadAiQuery)} disabled={uploadAiLoading||!uploadAiQuery.trim()} style={{padding:'6px 14px',borderRadius:16,border:'none',background:uploadAiQuery.trim()?'#2dd4bf':'#222',color:uploadAiQuery.trim()?'#000':'#555',fontSize:11,fontWeight:600,cursor:uploadAiQuery.trim()?'pointer':'default',fontFamily:'inherit',transition:'all 0.15s'}}>Send</button>
        </div>
      </div>
      <Btn onClick={handleUploadImport} style={{width:"100%",justifyContent:"center",padding:"12px",fontSize:14}}>
        {uploading?'Importing...':'Import '+uploadSelCount+' Line Items as New Quoting Job'}
      </Btn>
    </Card>}
    {newCust&&<Card style={{marginBottom:20,border:"1px solid #2563eb30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#a78bfa"}}>Add New Customer</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:12}}>{[["name","Name"],["contact","Contact"],["email","Email"],["phone","Phone"]].map(([k,l])=><div key={k}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>{l}</label><input value={custForm[k]} onChange={e=>setCustForm({...custForm,[k]:e.target.value})} style={inputStyle}/></div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Type</label><select value={custForm.type||"K-12 District"} onChange={e=>setCustForm({...custForm,type:e.target.value})} style={inputStyle}><option>K-12 District</option><option>Private School</option><option>University</option><option>Government</option><option>Corporate</option><option>Other</option></select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Address</label><input value={custForm.address||""} onChange={e=>setCustForm({...custForm,address:e.target.value})} placeholder="Full address (street, city, state, zip)" style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(custForm.name){addCustomer(custForm);setNewCust(false);setCustForm({name:"",contact:"",email:"",phone:"",type:"K-12 District",address:""});notify("Customer added")}}}>Add Customer</Btn><Btn v="secondary" onClick={()=>setNewCust(false)}>Cancel</Btn></div></Card>}


    {viewMode==="table"&&<>
      {/* Bulk action bar */}
      {jobSelected.size>0&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"rgba(45,212,191,0.06)",border:"1px solid rgba(45,212,191,0.15)",borderRadius:10,marginBottom:12,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:600,color:"#2dd4bf"}}>{jobSelected.size} job{jobSelected.size>1?'s':''} selected</span>
        <Btn v="danger" style={{fontSize:12,padding:"5px 12px"}} onClick={async()=>{const cnt=jobSelected.size;const ok=await confirm("Delete "+cnt+" job(s) and all their line items? This cannot be undone.");if(!ok)return;const ids=[...jobSelected];ids.forEach(id=>{const jobItems=(lineItems||[]).filter(l=>l.jobId===id);jobItems.forEach(li=>db?.deleteLineItem(li.id));db?.deleteJob(id)});ctx.setJobs(p=>p.filter(j=>!jobSelected.has(j.id)));ctx.setLineItems(p=>p.filter(l=>!jobSelected.has(l.jobId)));notify(cnt+" jobs deleted");setJobSelected(new Set())}}><I n="close" s={12}/> Delete</Btn>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.08)"}}/>
        <span style={{fontSize:12,color:"#a3a3a3"}}>Set Phase:</span>
        {["Quoting","In Progress","Invoiced","Complete"].map(ph=><button key={ph} onClick={()=>{[...jobSelected].forEach(id=>updateJob(id,{phase:ph}));notify(jobSelected.size+" job(s) moved to "+ph);setJobSelected(new Set())}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(45,212,191,0.15)",background:"transparent",color:"#c4c4c4",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(45,212,191,0.1)";e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#c4c4c4"}}>{ph}</button>)}
        <Btn v="secondary" style={{fontSize:11,padding:"4px 10px",marginLeft:"auto"}} onClick={()=>setJobSelected(new Set())}>Clear</Btn>
      </div>}
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>
        <th style={{padding:"10px 6px",width:32}}><input type="checkbox" checked={jobSelected.size===sortedJobs.length&&sortedJobs.length>0} onChange={()=>{if(jobSelected.size===sortedJobs.length)setJobSelected(new Set());else setJobSelected(new Set(sortedJobs.map(j=>j.id)))}} style={{accentColor:"#2dd4bf",cursor:"pointer"}}/></th>
        {["Project #","Job ID","Job Name","Customer","Rep","Phase","Created","Start","Due","Revenue","Margin","Payment"].map(h=><th key={h} style={{padding:"10px 8px",textAlign:"left",fontSize:11,fontWeight:600,color:"#737373",borderBottom:"1px solid #222",whiteSpace:"nowrap"}}>{h}</th>)}
      </tr></thead><tbody>{sortedJobs.map(r=><tr key={r.id} style={{cursor:"pointer",transition:"background 0.15s",background:jobSelected.has(r.id)?"rgba(45,212,191,0.06)":"transparent"}} onMouseEnter={e=>{if(!jobSelected.has(r.id))e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background=jobSelected.has(r.id)?"rgba(45,212,191,0.06)":"transparent"}}>
        <td style={{padding:"10px 6px",borderBottom:"1px solid #111"}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={jobSelected.has(r.id)} onChange={()=>{setJobSelected(prev=>{const n=new Set(prev);if(n.has(r.id))n.delete(r.id);else n.add(r.id);return n})}} style={{accentColor:"#2dd4bf",cursor:"pointer"}}/></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#a78bfa",fontWeight:600}}>{ctx.jobNum?.(r.id)}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#2dd4bf"}}>{r.id}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontWeight:600,color:"#e5e5e5"}}>{r.name}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}>{customers.find(c=>c.id===r.customer)?.name}</td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}>{reps.find(rep=>rep.id===r.salesRep)?.name}</td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><Badge label={r.phase} color={statusColor(r.phase)}/></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontSize:12,color:"#a3a3a3"}}>{r.createdDate||"--"}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontSize:12,color:r.startDate?"#a3a3a3":"#404040"}}>{r.startDate||"--"}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontSize:12,color:r.dueDate&&new Date(r.dueDate)<new Date()?"#f87171":"#a3a3a3"}}>{r.dueDate||"--"}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{fmt(getJobFinancials(r.id).totalRevenue)}</span></td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}>{(()=>{const m=getJobFinancials(r.id).margin;return <span style={{color:m>=30?"#34d399":"#fbbf24",fontSize:12}}>{pct(m)}</span>})()}</td>
        <td style={{padding:"10px 8px",borderBottom:"1px solid #111",color:"#c4c4c4"}} onClick={()=>setSelectedJob(r.id)}><Badge label={r.paymentStatus} color={statusColor(r.paymentStatus)}/></td>
      </tr>)}</tbody></table></div>
    </>}{sortedJobs.length===0&&<Card style={{textAlign:"center",padding:40,marginTop:16}}><div style={{fontSize:40,marginBottom:8}}>+</div><div style={{fontSize:16,fontWeight:600,color:"#2dd4bf",marginBottom:4}}>No jobs yet</div><div style={{fontSize:13,color:"#a3a3a3",marginBottom:16}}>Create your first job to start tracking projects, deliveries, and invoices.</div><Btn onClick={()=>setShowNewJob(true)}><I n="plus" s={14}/> Create First Job</Btn></Card>}


    {viewMode==="kanban"&&<div className="kanban-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,minHeight:400}}>
      {["Quoting","In Progress","Invoiced","Complete"].map(phase=><div key={phase} onDrop={e=>handleDrop(e,phase)} onDragOver={handleDragOver} style={{background:"#111111",borderRadius:12,padding:12,border:"1px solid #222222",minHeight:300}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:8,borderBottom:"2px solid "+statusColor(phase)}}><div style={{width:8,height:8,borderRadius:"50%",background:statusColor(phase)}}/><span style={{fontSize:13,fontWeight:700,color:"#e5e5e5"}}>{phase}</span><span style={{fontSize:12,color:"#a3a3a3",marginLeft:"auto"}}>{sortedJobs.filter(j=>j.phase===phase).length}</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sortedJobs.filter(j=>j.phase===phase).map(job=>{const f=getJobFinancials(job.id);return <div key={job.id} draggable onDragStart={e=>handleDragStart(e,job.id)} onClick={()=>setSelectedJob(job.id)} style={{background:"#1a1a1a",borderRadius:8,padding:12,cursor:"grab",border:"1px solid rgba(255,255,255,0.06)",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf44";e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#333333";e.currentTarget.style.transform="translateY(0)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#e5e5e5",marginBottom:4}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa",fontSize:11,marginRight:6}}>{ctx.jobNum?.(job.id)}</span>{job.name}</div>
            <div style={{fontSize:12,color:"#a3a3a3",marginBottom:6}}>{customers.find(c=>c.id===job.customer)?.name}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:600,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(f.totalRevenue)}</span>
              <span style={{fontSize:12,color:f.margin>=30?"#34d399":"#fbbf24"}}>{pct(f.margin)}</span>
            </div>
            <Bar value={f.totalReceived} max={f.totalOrdered||1} color={statusColor(phase)} height={3}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:12,color:"#b0b0b0"}}>{job.startDate||job.createdDate}</span><span style={{fontSize:12,fontWeight:500,color:job.dueDate&&new Date(job.dueDate)<new Date()?"#f87171":"#c4c4c4"}}>Due: {job.dueDate||"TBD"}</span></div>
          </div>})}
        </div>
      </div>)}
    </div>}
  </div></>;
}


// --- JOB DETAIL ----------------------------------------------
function DiscInput({initial,onCommit,style}){
  const [val,setVal]=useState(String(initial||""));
  const [committed,setCommitted]=useState(false);
  return <input type="number" value={val} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onChange={e=>{setVal(e.target.value);setCommitted(false)}} onBlur={()=>{if(!committed){const pct=parseFloat(val);if(!isNaN(pct)){onCommit(pct);setCommitted(true)}}}} onKeyDown={e=>{if(e.key==='Enter'){const pct=parseFloat(val);if(!isNaN(pct)){onCommit(pct);setCommitted(true)}}}} style={style} placeholder="0" min="0" max="100" step="0.01"/>;
}
// ShipToInput -- locally controlled textarea for line-item ship-to override.
// Local state prevents external re-renders (audit-trail setJobs, parent state updates,
// realtime sync) from clobbering keystrokes. Commits to onCommit on blur, on a 600ms
// debounced timer while typing, AND on unmount (so clicking Done or outside the row
// flushes any pending value before the textarea is destroyed). Re-syncs from prop
// only when not focused so updates from other clients still flow in.
function ShipToInput({initial,onCommit,style,placeholder,rows}){
  const [val,setVal]=useState(initial||"");
  const focusedRef=useRef(false);
  const timerRef=useRef(null);
  const valRef=useRef(initial||"");
  const lastCommittedRef=useRef(initial||"");
  const onCommitRef=useRef(onCommit);
  useEffect(()=>{onCommitRef.current=onCommit},[onCommit]);
  // Re-seed from prop only when not focused; never overwrite the user mid-typing.
  useEffect(()=>{if(!focusedRef.current){setVal(initial||"");valRef.current=initial||"";lastCommittedRef.current=initial||""}},[initial]);
  // Unmount cleanup: flush any pending value so clicking Done (which unmounts the
  // editing fragment) never loses keystrokes.
  useEffect(()=>{return()=>{if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}if(valRef.current!==lastCommittedRef.current){try{onCommitRef.current(valRef.current)}catch{}}}},[]);
  const flush=(v)=>{if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}lastCommittedRef.current=v;onCommit(v)};
  const scheduleCommit=(v)=>{if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(()=>{timerRef.current=null;lastCommittedRef.current=v;onCommit(v)},600)};
  return <textarea value={val} rows={rows||3} placeholder={placeholder} onFocus={()=>{focusedRef.current=true}} onBlur={()=>{focusedRef.current=false;flush(val)}} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onChange={e=>{const v=e.target.value;setVal(v);valRef.current=v;scheduleCommit(v)}} style={style}/>;
}
function QuoteColToggle({job, updateJob}){
  const rawQvc = (job.docStatuses||{}).__qcv || {};
  const qvc = {netCost:true,netTotal:true,...rawQvc};
  const toggle = (key) => {
    const next = {...qvc, [key]: !qvc[key]};
    updateJob(job.id, {docStatuses: {...(job.docStatuses||{}), __qcv: next}});
  };
  const cols=[{key:"tag",label:"Tag"},{key:"manuf",label:"Manuf."},{key:"model",label:"Model #"},{key:"description",label:"Description"},{key:"color",label:"Color"},{key:"qty",label:"Qty"},{key:"netCost",label:"Net Cost"},{key:"netTotal",label:"Net Total"},{key:"shippingEach",label:"Shipping Each"},{key:"shippingTotal",label:"Shipping Total"},{key:"installEach",label:"Install Each"},{key:"installTotal",label:"Install Total"},{key:"unitPrice",label:"Your Price"},{key:"lineTotal",label:"Line Total"}];
  return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{cols.map(c=>{const hidden=!!qvc[c.key];return <button key={c.key} onClick={()=>toggle(c.key)} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:500,fontFamily:"inherit",background:hidden?"#111":"rgba(45,212,191,0.12)",color:hidden?"#525252":"#2dd4bf",transition:"all 0.15s"}}>{hidden?"":"\u2713 "}{c.label}</button>})}</div>;
}
function JobDetail({job,ctx}){
  if(!job||!ctx)return <div style={{padding:40,textAlign:"center",color:"#f87171"}}>Missing job data. <button onClick={()=>ctx?.setSelectedJob?.(null)} style={{color:"#2dd4bf",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Back to jobs</button></div>;
  const {getJobFinancials,getJobItems,getItemStatus,vendors,customers,reps,updateJob,addJob,addLineItem,updateLineItem,deleteLineItem,deleteJob,setSelectedJob,notify,lineItems,jobs,triggerPrint,updateVendor,lineItemShipTos,setLineItemShipTo,_commissionFor}=ctx;
  // Line-item ship-to fallback: read prefers a value from the sops-backed lineItemShipTos
  // store, falling back to the column value on the line item. Writes go to BOTH the store
  // (sops, reliable) AND updateLineItem (forward-compat for when the supabase.js write path
  // is fixed to translate shipTo -> ship_to).
  const _shipTos = lineItemShipTos || {};
  const getItemShipTo = (itemId, colVal) => {const sv = _shipTos[itemId]; if(sv && String(sv).trim()) return sv; return (colVal && String(colVal).trim()) ? colVal : "";};
  const setItemShipTo = (itemId, val) => {updateLineItem(itemId,{shipTo:val}); if(setLineItemShipTo)setLineItemShipTo(itemId, val);};
  const f=getJobFinancials(job.id);
  const items=getJobItems(job.id);
  const customer=customers.find(c=>c.id===job.customer);
  const rep=reps.find(r=>r.id===job.salesRep);
  const [editing,setEditing]=useState(false);
  const [editJob,setEditJob]=useState({...job});
  const [addingItem,setAddingItem]=useState(false);
  const [newItem,setNewItem]=useState({description:"",vendor:"",tag:"",manufacturer:"",modelNumber:"",color:"",group:"",listPrice:"",unitCost:"",unitPrice:"",shippingPerUnit:"",installPerUnit:"",qtyOrdered:"",qtyReceived:0,qtyInvoiced:0,shipTo:""});
  const [editingItem,setEditingItem]=useState(null);
  // Per-item disclosure for the line-item Ship To override. Auto-expands when
  // the item already has a ship-to value (so the user can see/edit it). Stays
  // collapsed for items with no override so the edit row stays compact.
  const [shipToExpanded,setShipToExpanded]=useState(new Set());
  const toggleShipToExpanded=(itemId)=>setShipToExpanded(prev=>{const next=new Set(prev);if(next.has(itemId))next.delete(itemId);else next.add(itemId);return next});
  const [groupBy,setGroupBy]=useState("none");
  const [selectedItems,setSelectedItems]=useState(new Set());
  const toggleItem=(id)=>{const s=new Set(selectedItems);if(s.has(id))s.delete(id);else s.add(id);setSelectedItems(s)};
  const selectAllItems=()=>{if(selectedItems.size===items.length)setSelectedItems(new Set());else setSelectedItems(new Set(items.map(i=>i.id)))};
  const bulkDeleteItems=async()=>{if(selectedItems.size===0)return;const ok=await ctx.confirm("Delete "+selectedItems.size+" line items? This cannot be undone.");if(!ok)return;const ids=[...selectedItems];ids.forEach(id=>{ctx.forceDeleteLineItem?ctx.forceDeleteLineItem(id):deleteLineItem(id)});setSelectedItems(new Set());notify(ids.length+" items deleted")}; // none, group, vendor, tag
  const [activityInput,setActivityInput]=useState("");
  const manualActivities = (job.activities || []).map(a=>({...a,source:"manual"}));
  const auditEntries = (job.auditTrail || []).map(a=>({id:a.time+a.type,text:a.type==="edit"?"Edited: "+a.fields.map(f=>f.field+" changed"+(f.from?" from "+String(f.from).slice(0,20):"")+" to "+String(f.to).slice(0,30)).join(", "):a.type==="create"?"Job created":a.type,time:a.time,user:a.user||"",source:"auto"}));
  const activities = [...manualActivities,...auditEntries].sort((a,b)=>new Date(b.time)-new Date(a.time));
  const addActivity=(text)=>{const entry={text,time:new Date().toISOString(),id:Math.random().toString(36).slice(2),user:ctx.currentUser?.name||"System"};const next=[entry,...activities];updateJob(job.id,{activities:next})};
  const duplicateJob=()=>{const newId='JOB-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900)+100);const newJob={...job,id:newId,name:job.name+' (Copy)',phase:'Quoting',paymentStatus:'unpaid',createdDate:new Date().toISOString().split('T')[0],startDate:'',endDate:''};addJob(newJob);items.forEach(item=>{addLineItem({...item,id:'LI-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),jobId:newId,qtyReceived:0,qtyInvoiced:0,deliveryDate:'',invoiceDate:''})});setSelectedJob(newId);notify('Job duplicated -- '+newId+' created with all line items')};
  const jobQuoteRef=React.useRef(null);
  const [uploadingToJob,setUploadingToJob]=useState(false);
  const parseQuoteIntoJob=async(file)=>{
    if(!file||uploadingToJob)return;
    // Upload-into-existing-project guard. The "Upload Quote" button on a project
    // appends the uploaded items to THIS job. When the project already has line
    // items, silently appending is how stray vendor items ended up on North Lake
    // (Paihr) and Mount Prospect (McCourt) -- a second upload piled onto an existing
    // project. Surface a confirmation showing what's already there and let the user
    // choose to append, replace, or cancel BEFORE anything is written.
    const _existingItems=(lineItems||[]).filter(li=>li&&li.jobId===job.id&&!li._isDeleted);
    if(_existingItems.length>0){
      const _exCost=_existingItems.reduce((s,li)=>s+(Number(li.qtyOrdered)||0)*(Number(li.unitCost)||0),0);
      const _exRev=_existingItems.reduce((s,li)=>s+((Number(li.priceExtended)>0)?Number(li.priceExtended):(Number(li.unitPrice)||0)*(Number(li.qtyOrdered)||0)),0);
      const _choice=window.prompt(
        'This project already has '+_existingItems.length+' line item'+(_existingItems.length!==1?'s':'')+' ('+fmt(_exCost)+' cost / '+fmt(_exRev)+' revenue).\n\n'+
        'The uploaded quote will be ADDED to those existing items.\n\n'+
        'Type APPEND to add the uploaded items on top of the existing ones,\n'+
        'type REPLACE to clear the existing items first and import fresh,\n'+
        'or press Cancel to abort without changing anything.',
        'APPEND'
      );
      if(_choice===null){notify('Upload cancelled -- nothing changed','error');if(jobQuoteRef.current)jobQuoteRef.current.value='';return}
      const _c=_choice.trim().toUpperCase();
      if(_c==='REPLACE'){
        _existingItems.forEach(li=>{try{deleteLineItem(li.id)}catch(_e){}});
        notify('Cleared '+_existingItems.length+' existing item'+(_existingItems.length!==1?'s':'')+' -- importing replacement');
      } else if(_c==='APPEND'){
        // proceed -- uploaded items will be appended below
      } else {
        notify('Upload cancelled -- type APPEND or REPLACE to proceed','error');
        if(jobQuoteRef.current)jobQuoteRef.current.value='';
        return;
      }
    }
    setUploadingToJob(true);
    const ext=(file.name||'').split('.').pop().toLowerCase();
    const isPdf=ext==='pdf'||file.type==='application/pdf';
    const isImage=['png','jpg','jpeg','gif','webp','tiff'].includes(ext)||file.type?.startsWith('image/');
    try{
      if(isPdf||isImage){
        notify('Scanning document with AI... this may take a moment');
        const reader=new FileReader();
        const base64=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result.split(',')[1]);reader.onerror=rej;reader.readAsDataURL(file)});
        const mediaType=file.type||'application/pdf';
        const resp=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data:base64,media_type:mediaType,scan_type:'quote_document'})});
        if(!resp.ok)throw new Error('AI scan failed: '+resp.status);
        const scanData=await resp.json();
        const text=((scanData.content||[]).find(b=>b.type==='text')?.text||'').trim();
        let parsed;
        try{const jsonMatch=text.match(/\{[\s\S]*\}/);parsed=jsonMatch?JSON.parse(jsonMatch[0]):JSON.parse(text)}catch(e2){notify('AI could not parse this document. Try an Excel file instead.','error');setUploadingToJob(false);if(jobQuoteRef.current)jobQuoteRef.current.value='';return}
        if(!parsed.items||parsed.items.length===0){notify('No line items found in document.','error');setUploadingToJob(false);if(jobQuoteRef.current)jobQuoteRef.current.value='';return}
        const existNames=new Set(vendors.map(v=>v.name.toLowerCase().trim()));
        const vMap={};vendors.forEach(v=>{vMap[v.name.toLowerCase().trim()]=v.id});
        const newVendors=[];
        const vendorName=parsed.vendor||'';
        if(vendorName){const vk=vendorName.toLowerCase().trim();if(!existNames.has(vk)){const vid='V-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);ctx.addVendor({id:vid,name:vendorName,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0});vMap[vk]=vid;existNames.add(vk);newVendors.push(vendorName)}}
        let totalAdded=0;
        for(const item of parsed.items){
          const mfr=item.manufacturer||vendorName||'';
          const vk=mfr.toLowerCase().trim();
          if(vk&&!existNames.has(vk)){const vid='V-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);ctx.addVendor({id:vid,name:mfr,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0});vMap[vk]=vid;existNames.add(vk);newVendors.push(mfr)}
          addLineItem({id:'LI-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),jobId:job.id,
            description:item.description||'',vendor:vMap[vk]||'',tag:item.tag||'',group:'',
            manufacturer:mfr,modelNumber:item.model_number||item.model||'',color:item.color||'',
            listPrice:parseFloat(item.list_price)||0,unitCost:parseFloat(item.net_cost)||0,
            unitPrice:parseFloat(item.sell_price)||parseFloat(item.list_price)||0,
            shippingPerUnit:0,installPerUnit:0,priceExtended:0,
            qtyOrdered:parseInt(item.quantity)||1,qtyReceived:0,qtyInvoiced:0,
            poDate:'',deliveryDate:'',invoiceDate:''});
          totalAdded++;
        }
        notify(totalAdded+' line items added to "'+job.name+'" via AI scan'+(newVendors.length?' ('+newVendors.length+' new vendors created)':''));
      }else{
      const XLSX=await import('xlsx');
      const data=await file.arrayBuffer();
      const wb=XLSX.read(data,{type:'array'});
      const safeNum=(raw)=>{if(typeof raw==='number'&&isFinite(raw))return raw;const s=String(raw||'').replace(/[$,]/g,'').trim();if(!s||/[a-zA-Z]/.test(s))return 0;const v=parseFloat(s);return isFinite(v)?v:0};
      const findHeader=(row)=>{
        const h={};
        for(let c=0;c<row.length;c++){
          const v=String(row[c]||'').toLowerCase().trim();
          if(v==='tag')h.tag=c;
          else if(v==='manuf'||v==='manuf.'||v==='manufacturer'||v==='vendor'||v==='vendor name'||v==='supplier')h.manuf=c;
          else if(v==='model #'||v==='model'||v==='model#'||v==='model number')h.model=c;
          else if(v==='description'||v==='desc'||v==='item'||v==='item description'||v==='product'||v==='product description')h.desc=c;
          else if(v==='color'||v==='finish')h.color=c;
          else if(v==='qty'||v==='quantity'||v==='qty ordered'||v==='ordered')h.qty=c;
          else if(v==='list'||v==='list price'||v==='list each')h.list=c;
          else if(v==='ext'&&!h.listExt){if(h.list!==undefined)h.listExt=c;else h.list=c}
          // "Cost" recognized as net-each (Lisa's WIP spreadsheet convention).
          else if(v==='net each'||v==='net'||v==='net ea'||v==='net price'||v==='dealer'||v==='dealer net'||v==='cost'||v==='unit cost'||v==='each')h.net=c;
          else if(v==='net ext'||v==='net extended')h.netExt=c;
          else if(v==='your price'||v==='sell'||v==='sell price'||v==='unit price'||v==='price each'||v==='sell each'||v==='customer price')h.price=c;
          // "Total" recognized as price-extended (Lisa's WIP convention).
          else if(v==='your price extended'||v==='sell ext'||v==='sell extended'||v==='price ext'||v==='extended'||v==='ext price'||v==='line total'||v==='total')h.priceExt=c;
          else if(v==='shipping'||v==='ship'||v==='shipping each'||v==='freight'){if(h.ship!==undefined)h.shipTotal=c;else h.ship=c}
          else if(v==='install'||v==='install each'||v==='installation'){if(h.install!==undefined)h.installTotal=c;else h.install=c}
        }
        // Column-0-as-description fallback: WIP spreadsheets often leave the first column
        // header blank but use that column for item names. Conservative: requires >=2 real
        // matches AND a blank first-cell header before assuming desc=0.
        if(Object.keys(h).length>=2&&h.desc===undefined&&String(row[0]||'').trim()===''){
          h.desc=0;
        }
        return Object.keys(h).length>=3?h:null;
      };
      const defaultMap={tag:0,manuf:1,model:2,desc:3,color:4,qty:5,list:6,listExt:7,net:8,netExt:9,price:10,priceExt:11};
      let totalAdded=0;const newVendors=[];
      const existNames=new Set(vendors.map(v=>v.name.toLowerCase().trim()));
      const vMap={};vendors.forEach(v=>{vMap[v.name.toLowerCase().trim()]=v.id});
      for(let si=0;si<wb.SheetNames.length;si++){
        const sn=wb.SheetNames[si];const ws=wb.Sheets[sn];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const hiddenRows=ws['!rows']||[];
        let grp='';let colMap=null;let lastManuf='';
        for(let r=0;r<rows.length;r++){
          if(hiddenRows[r]&&hiddenRows[r].hidden)continue;
          const row=rows[r];if(!row||row.length<3)continue;
          if(!colMap){const detected=findHeader(row);if(detected){colMap=detected;continue}if(String(row[0]||'').toLowerCase().trim()==='tag'){colMap=defaultMap;continue}}
          const cm=colMap||defaultMap;
          const g=v=>cm[v]!==undefined?row[cm[v]]:'';const n=v=>safeNum(g(v));const s=v=>String(g(v)||'').trim();
          const rowHasTotal=row.some(cell=>{const cv=String(cell||'').trim().toLowerCase();return cv==='total'||cv==='subtotal'||cv==='grand total'});
          if(rowHasTotal)continue;
          const desc=s('desc');const tag=s('tag');const manuf=s('manuf');const model=s('model');
          if(desc&&!tag&&!manuf&&!n('qty')&&!n('list')&&!n('net')&&!n('price')){grp=desc.replace(/\n/g,' ').substring(0,80);continue}
          if(!desc)continue;
          let cleanDesc=desc.replace(/\r/g,'').split('\n')[0].trim();
          if(cleanDesc.startsWith('*')&&!n('qty')&&!n('list')&&!n('net')&&!n('price')&&!n('priceExt'))continue;
          if(/^(subtotal|grand total|total)$/i.test(cleanDesc.trim()))continue;
          const qty=Math.round(n('qty'));const list=n('list');const net=n('net');const price=n('price');const priceExt=n('priceExt');
          if(qty<=0&&list<=0&&net<=0&&price<=0&&priceExt<=0)continue;
          if(qty<=0&&priceExt<=0)continue; // zero qty + zero extended sell = hidden/alternate row; skip even if the .xls hidden-row flag was not read
          const mfr=manuf||lastManuf;if(manuf)lastManuf=manuf;
          // Ensure vendor exists
          const vk=(mfr||'').toLowerCase().trim();
          if(vk&&!existNames.has(vk)){const vid='V-'+Math.random().toString(36).slice(2,8);
            ctx.addVendor({id:vid,name:mfr,contact:'',email:'',phone:'',category:'Furniture',address:'',discountRate:0});
            vMap[vk]=vid;existNames.add(vk);newVendors.push(mfr)}
          let shipPU=n('ship');const shipTot=cm.shipTotal!==undefined?n('shipTotal'):0;
          if(!shipPU&&shipTot&&qty>0)shipPU=shipTot/qty;
          let instPU=n('install');const instTot=cm.installTotal!==undefined?n('installTotal'):0;
          if(!instPU&&instTot&&qty>0)instPU=instTot/qty;
          addLineItem({id:'LI-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),jobId:job.id,
            description:cleanDesc,vendor:vMap[vk]||'',tag:tag.replace(/\.0$/,''),group:grp||tag||'',
            manufacturer:mfr||sn,modelNumber:model.replace(/\.0$/,''),color:s('color'),
            listPrice:list,unitCost:net||0,unitPrice:price||(priceExt&&qty>0?priceExt/qty:0)||0,
            shippingPerUnit:shipPU||0,installPerUnit:instPU||0,priceExtended:priceExt||0,
            qtyOrdered:qty||1,qtyReceived:0,qtyInvoiced:0,poDate:'',deliveryDate:'',invoiceDate:''});
          totalAdded++;
        }
      }
      notify(totalAdded+' line items added to "'+job.name+'"'+(newVendors.length?' ('+newVendors.length+' new vendors created)':''));
      }
    }catch(err){notify('Error reading file: '+err.message,'error')}
    setUploadingToJob(false);if(jobQuoteRef.current)jobQuoteRef.current.value='';
  };


  const saveJob=()=>{updateJob(job.id,editJob);setEditing(false);notify("Job updated -- changes propagated everywhere")};
  const autoCalcFromList=(lp,vid)=>{const v=vendors.find(v=>v.id===vid);const dr=v?.discountRate||0;return{unitCost:Math.round(lp*(1-dr)*100)/100,unitPrice:Math.round(lp*100)/100}};
  const saveNewItem=()=>{if(!newItem.description)return;const newItemId="LI-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);addLineItem({...newItem,id:newItemId,jobId:job.id,group:newItem.group||"",tag:newItem.tag||"",manufacturer:newItem.manufacturer||"",modelNumber:newItem.modelNumber||"",color:newItem.color||"",listPrice:parseFloat(newItem.listPrice)||0,unitCost:parseFloat(newItem.unitCost)||0,unitPrice:parseFloat(newItem.unitPrice)||0,shippingPerUnit:parseFloat(newItem.shippingPerUnit)||0,installPerUnit:parseFloat(newItem.installPerUnit)||0,qtyOrdered:parseInt(newItem.qtyOrdered)||0,qtyReceived:parseInt(newItem.qtyReceived)||0,qtyInvoiced:parseInt(newItem.qtyInvoiced)||0,shipTo:newItem.shipTo||""});if(newItem.shipTo&&setLineItemShipTo)setLineItemShipTo(newItemId,newItem.shipTo);setAddingItem(false);setNewItem({description:"",vendor:"",tag:"",manufacturer:"",modelNumber:"",color:"",group:"",listPrice:"",unitCost:"",unitPrice:"",shippingPerUnit:"",installPerUnit:"",qtyOrdered:"",qtyReceived:0,qtyInvoiced:0,shipTo:""});notify("Line item added -- financials updated")};


  return <div style={{animation:"fadeUp 0.3s"}} onClick={e=>{const tag=e.target.tagName;if((tag==="DIV"||tag==="SECTION")&&!e.target.closest("input,select,textarea,button,td,th")&&editingItem&&editingItem!=="ALL")setEditingItem(null)}}>
    <div className="job-sticky" style={{position:"sticky",top:0,zIndex:100,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",margin:"-32px -40px 0",padding:"16px 40px 0",borderBottom:"none"}}>
      <button onClick={()=>setSelectedJob(null)} style={{background:"none",border:"none",color:"#2dd4bf",cursor:"pointer",fontSize:13,fontFamily:"inherit",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>&larr; All Jobs</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}><h2 style={{fontSize:22,fontWeight:800,color:"#e5e5e5",margin:0}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:13,marginRight:8}}>{ctx.jobNum?.(job.id)||""}</span>{job.name}</h2><Badge label={job.phase} color={statusColor(job.phase)}/><Badge label={job.paymentStatus} color={statusColor(job.paymentStatus)}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>{job.id} - {customer?.name} - {rep?.name} - {fmt(f.totalRevenue)} rev - {pct(f.margin)} margin</div></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><input ref={jobQuoteRef} type="file" accept=".xls,.xlsx,.pdf,.png,.jpg,.jpeg" onChange={e=>{if(e.target.files[0])parseQuoteIntoJob(e.target.files[0])}} style={{display:"none"}}/><Btn v="danger" onClick={()=>deleteJob(job.id)} style={{fontSize:12,padding:"6px 10px"}}><I n="close" s={12}/> Delete</Btn><Btn v="secondary" onClick={()=>setEditing(!editing)} style={{fontSize:12,padding:"6px 10px"}}><I n="edit" s={12}/> Edit</Btn><Btn v="secondary" onClick={duplicateJob} style={{fontSize:12,padding:"6px 10px"}}><I n="package" s={12}/> Duplicate</Btn><Btn onClick={()=>setAddingItem(true)} style={{fontSize:12,padding:"6px 10px"}}><I n="plus" s={12}/> Add Item</Btn><Btn v="secondary" onClick={()=>jobQuoteRef.current?.click()} style={{fontSize:12,padding:"6px 10px"}}><I n="upload" s={12}/> Upload Quote</Btn><Btn v="ghost" onClick={()=>{
  try{const allItems=items;const customer2=customer;const jobPOs=[];const groups={};allItems.forEach(i=>{if(!groups[i.vendor])groups[i.vendor]=[];groups[i.vendor].push(i)});Object.entries(groups).forEach(([vid,vitems])=>{jobPOs.push({vendor:vendors.find(v=>v.id===vid),items:vitems})});
  const invTotal=allItems.reduce((s,i)=>s+((i.unitPrice||0)+(i.shippingPerUnit||0)+(i.installPerUnit||0))*i.qtyOrdered,0);const costTotal=allItems.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);
  const hd='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div><div style="font-weight:700;font-size:14px">Midwest Educational Furnishings, Inc.</div><div style="font-size:12px;color:#888;line-height:1.6">21191 N Valley Rd<br>Kildeer, IL 60047 US<br>(847) 847-1865</div></div><div><img src="'+MW_LOGO+'" style="height:44px"/></div></div>';
  const lbl='font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px';
  const tS='width:100%;border-collapse:collapse;font-size:12px';const thS='padding:8px 6px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5';const tdS='padding:8px 6px;border-bottom:1px solid #f0f0f0';
  const today=new Date().toLocaleDateString();
  const quoteDocNum='QT-'+(job.id||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(customer2?.id||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();
  const coverHtml=hd+'<div style="text-align:center;padding:80px 0 40px"><div style="font-size:28px;font-weight:300;color:#888;letter-spacing:1;margin-bottom:8px">Job Packet</div><div style="font-size:24px;font-weight:700;margin-bottom:12px">'+(ctx.jobNum?.(job.id)||'')+' '+job.name+'</div><div style="font-size:14px;color:#888;margin-bottom:24px">'+(customer2?.name||'')+'</div><div style="display:flex;justify-content:center;gap:40px;font-size:12px;color:#888"><div><strong>Quote #:</strong> '+quoteDocNum+'</div><div><strong>Terms:</strong> '+(job.terms||'Net 30')+'</div><div><strong>Date:</strong> '+today+'</div>'+(job.poNumber?'<div><strong>PO#:</strong> '+job.poNumber+'</div>':'')+'</div>'+(job.shipTo?'<div style="margin-top:12px;font-size:12px;color:#888"><strong>Ship To:</strong> '+job.shipTo+'</div>':'')+(job.billTo?'<div style="font-size:12px;color:#888"><strong>Bill To:</strong> '+job.billTo+'</div>':'')+'</div>';
  const quoteRows=allItems.map(i=>{const sh=i.shippingPerUnit||0;const ins=i.installPerUnit||0;const each=(i.unitPrice||0)+sh+ins;return '<tr><td style="'+tdS+'">'+(i.tag||'')+'</td><td style="'+tdS+'">'+(i.manufacturer||vendors.find(v=>v.id===i.vendor)?.name||'')+'</td><td style="'+tdS+'">'+(i.modelNumber||'')+'</td><td style="'+tdS+'">'+(i.description||"").replace(/\n/g,"<br>")+'</td><td style="'+tdS+'">'+(i.color||'')+'</td><td style="'+tdS+';text-align:right">'+i.qtyOrdered+'</td><td style="'+tdS+';text-align:right">'+(sh>0?'$'+sh.toFixed(2):'')+'</td><td style="'+tdS+';text-align:right">'+(ins>0?'$'+ins.toFixed(2):'')+'</td><td style="'+tdS+';text-align:right;font-weight:600">$'+each.toFixed(2)+'</td><td style="'+tdS+';text-align:right;font-weight:700">$'+(each*i.qtyOrdered).toFixed(2)+'</td></tr>'}).join('');
  const hCols={netCost:true,netTotal:true,...((job.docStatuses||{}).__qcv||{})};const quoteHtml=hd+'<div style="font-size:24px;font-weight:300;color:#888;letter-spacing:1;margin-bottom:16px">Project Quote <span style="color:#2dd4bf;font-weight:700">'+quoteDocNum+'</span></div><div style="display:flex;gap:40px;margin-bottom:16px"><div style="flex:1"><div style="'+lbl+'">Prepared For</div><div style="font-size:13px;line-height:1.6">'+fmtAddrHtml(job.billTo||customer2?.name||'',customer2?.address||'',customer2?.contact||'')+'</div></div><div style="flex:1"><div style="'+lbl+'">Ship To</div><div style="font-size:13px;line-height:1.6">'+fmtShipHtml(job.shipTo,customer2?.name||'',customer2?.address||'',customer2?.contact||'')+'</div></div><div style="text-align:right"><div style="font-size:12px;color:#888">Date: '+today+'</div><div style="font-size:12px;color:#888">Terms: '+(job.terms||'Net 30')+'</div></div></div><table style="'+tS+'"><thead><tr><th style="'+thS+';text-align:left">Tag</th><th style="'+thS+';text-align:left">Manuf.</th><th style="'+thS+';text-align:left">Model #</th><th style="'+thS+';text-align:left">Description</th><th style="'+thS+';text-align:left">Color</th><th style="'+thS+';text-align:right">Qty</th><th style="'+thS+';text-align:right">Shipping Each</th><th style="'+thS+';text-align:right">Install Each</th><th style="'+thS+';text-align:right">Your Price</th><th style="'+thS+';text-align:right">Line Total</th></tr></thead><tbody>'+quoteRows+'</tbody></table><div style="margin-top:12px;text-align:right;font-size:16px;font-weight:700">TOTAL: $'+invTotal.toFixed(2)+'</div>';
  const poSections=jobPOs.map(po=>{const vendObj=po.vendor||{};const poTotal=po.items.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);const poShipToVal=po.shipTo||job.shipTo;return '<div style="'+lbl+';margin-top:24px;font-size:14px">Purchase Order <span style="color:#2dd4bf">'+(po.docNum||'PO-'+(job.id||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase()+'-'+(vendObj.id||po.items[0]?.vendor||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase())+'</span> -- '+(vendObj.name||'')+'</div><div style="display:flex;gap:40px;margin:12px 0"><div style="flex:1"><div style="'+lbl+'">Vendor</div><div style="font-size:13px;line-height:1.6">'+fmtAddrHtml(vendObj.name||'',vendObj.address||'','')+'</div></div><div style="flex:1"><div style="'+lbl+'">Ship To</div><div style="font-size:13px;line-height:1.6">'+fmtShipHtml(poShipToVal,customer2?.name||'',customer2?.address||'',customer2?.contact||'')+'</div></div></div>'+(job.shipVia?'<div style="margin-bottom:12px;font-size:12px;color:#888"><strong>Ship Via:</strong> '+job.shipVia+'</div>':'')+(job.notes&&(job.notes||'').split('\n').filter(l=>!l.startsWith('TASK:')&&!l.startsWith('NOTE:')).join('\n').trim()?'<div style="margin-bottom:12px;font-size:12px;color:#888;white-space:pre-wrap"><strong>Notes:</strong> '+(job.notes||'').split('\n').filter(l=>!l.startsWith('TASK:')&&!l.startsWith('NOTE:')).join('\n').trim()+'</div>':'')+'<table style="'+tS+'"><thead><tr><th style="'+thS+';text-align:left">Tag</th><th style="'+thS+';text-align:left">Description</th><th style="'+thS+';text-align:right">Qty</th><th style="'+thS+';text-align:right">Rate</th><th style="'+thS+';text-align:right">Amount</th></tr></thead><tbody>'+po.items.map(i=>'<tr><td style="'+tdS+'">'+(i.tag||'')+'</td><td style="'+tdS+';white-space:pre-wrap">'+(i.modelNumber?i.modelNumber+'<br>':'')+(i.description||'')+(i.color?'<br>'+i.color:'')+'</td><td style="'+tdS+';text-align:right">'+i.qtyOrdered+'</td><td style="'+tdS+';text-align:right">$'+i.unitCost.toFixed(2)+'</td><td style="'+tdS+';text-align:right;font-weight:600">$'+(i.unitCost*i.qtyOrdered).toFixed(2)+'</td></tr>').join('')+'</tbody></table><div style="text-align:right;margin-top:8px;font-size:14px;font-weight:700">PO Total: $'+poTotal.toFixed(2)+'</div>'}).join('<div class="page-break-before" style="page-break-before:always"></div>');
  const deliveryRows=allItems.map(i=>'<tr><td style="'+tdS+'">'+(i.tag||'')+'</td><td style="'+tdS+'">'+(i.manufacturer||vendors.find(v=>v.id===i.vendor)?.name||'')+'</td><td style="'+tdS+'">'+i.description+'</td><td style="'+tdS+';text-align:right">'+i.qtyOrdered+'</td><td style="'+tdS+';text-align:right">'+i.qtyReceived+'</td><td style="'+tdS+';text-align:right">'+(i.qtyOrdered-i.qtyReceived)+'</td><td style="'+tdS+';text-align:center;color:'+(i.qtyReceived>=i.qtyOrdered?'#059669':'#d97706')+'">'+(i.qtyReceived>=i.qtyOrdered?'Complete':'Pending')+'</td></tr>').join('');
  const deliveryHtml='<div style="font-size:24px;font-weight:300;color:#888;letter-spacing:1;margin-bottom:16px">Delivery Status</div><table style="'+tS+'"><thead><tr><th style="'+thS+';text-align:left">Tag</th><th style="'+thS+';text-align:left">Vendor</th><th style="'+thS+';text-align:left">Item</th><th style="'+thS+';text-align:right">Ordered</th><th style="'+thS+';text-align:right">Received</th><th style="'+thS+';text-align:right">Outstanding</th><th style="'+thS+';text-align:center">Status</th></tr></thead><tbody>'+deliveryRows+'</tbody></table>';
  const summaryHtml='<div style="font-size:24px;font-weight:300;color:#888;letter-spacing:1;margin:32px 0 16px">Financial Summary</div><table style="'+tS+'"><tbody><tr><td style="'+tdS+';font-weight:600">Total Revenue</td><td style="'+tdS+';text-align:right;font-weight:700;font-size:14px">$'+invTotal.toFixed(2)+'</td></tr><tr><td style="'+tdS+'">Total Cost</td><td style="'+tdS+';text-align:right">$'+costTotal.toFixed(2)+'</td></tr><tr><td style="'+tdS+';color:#059669">Gross Profit</td><td style="'+tdS+';text-align:right;color:#059669;font-weight:700">$'+(invTotal-costTotal).toFixed(2)+'</td></tr><tr><td style="'+tdS+'">Margin</td><td style="'+tdS+';text-align:right">'+(invTotal>0?((1-costTotal/invTotal)*100).toFixed(1):0)+'%</td></tr></tbody></table>';


  triggerPrint('Job Packet - '+job.name,coverHtml+'<div class="page-break-before" style="page-break-before:always"></div>'+quoteHtml+'<div class="page-break-before" style="page-break-before:always"></div>'+hd+poSections+'<div class="page-break-before" style="page-break-before:always"></div>'+hd+deliveryHtml+summaryHtml)}catch(e){console.error('Job Packet error:',e);alert('Packet error: '+e.message)}}} style={{fontSize:12,padding:"6px 10px"}}><I n="download" s={12}/> Job Packet</Btn></div>
      {/* Quote Column Visibility */}
      <Card style={{padding:14,marginBottom:16,border:"1px solid rgba(45,212,191,0.1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}><div style={{fontSize:13,fontWeight:700,color:"#2dd4bf"}}>Quote Columns</div><span style={{fontSize:11,color:"#737373"}}>Select which columns appear on quotes for this project</span></div>
        <QuoteColToggle job={job} updateJob={updateJob}/>
      </Card>
      </div>


    </div>
    <div style={{paddingTop:12}}>


    {editing&&<Card style={{marginBottom:20,border:"1px solid #2dd4bf30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#2dd4bf"}}>Edit Job Record</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Job Name</label><input value={editJob.name} onChange={e=>setEditJob({...editJob,name:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Phase</label><select value={editJob.phase} onChange={e=>setEditJob({...editJob,phase:e.target.value})} style={inputStyle}>{["Quoting","In Progress","Invoiced","Complete"].map(p=><option key={p}>{p}</option>)}</select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Status</label><select value={editJob.paymentStatus} onChange={e=>setEditJob({...editJob,paymentStatus:e.target.value})} style={inputStyle}>{["unpaid","partial","paid"].map(p=><option key={p}>{p}</option>)}</select></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer</label><CustomerPicker value={editJob.customer} onChange={v=>setEditJob({...editJob,customer:v})} customers={customers} onAddNew={(name)=>{const id="CUST-"+Math.random().toString(36).slice(2,8);addCustomer({id,name:name||"New Customer",contact:"",email:"",phone:"",type:"K-12 District",address:""});setEditJob({...editJob,customer:id});notify("Customer created: "+(name||"New Customer"))}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Sales Rep</label><select value={editJob.salesRep} onChange={e=>setEditJob({...editJob,salesRep:e.target.value})} style={inputStyle}>{reps.filter(isSalesRep).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Due Date</label><input type="date" value={editJob.dueDate} onChange={e=>setEditJob({...editJob,dueDate:e.target.value})} style={inputStyle}/></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Start Date</label><input type="date" value={editJob.startDate||""} onChange={e=>setEditJob({...editJob,startDate:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>End Date</label><input type="date" value={editJob.endDate||""} onChange={e=>setEditJob({...editJob,endDate:e.target.value})} style={inputStyle}/></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>PO Notes</label><textarea value={editJob.notes||""} onChange={e=>setEditJob({...editJob,notes:e.target.value})} rows={3} style={{...inputStyle,resize:"vertical",minHeight:60}}/></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Terms</label><select value={editJob.terms||"Net 30"} onChange={e=>setEditJob({...editJob,terms:e.target.value})} style={inputStyle}><option>Net 30</option><option>Net 15</option><option>Due Upon Receipt</option></select></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer PO #</label><input value={editJob.poNumber||""} onChange={e=>setEditJob({...editJob,poNumber:e.target.value})} placeholder="P044193" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Ship To</label><textarea value={editJob.shipTo||""} onChange={e=>setEditJob({...editJob,shipTo:e.target.value})} placeholder={"School Name\nStreet Address\nCity, State Zip"} rows={3} style={{...inputStyle,resize:"vertical",minHeight:56,lineHeight:1.4,fontFamily:"inherit"}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Ship Via</label><input value={editJob.shipVia||""} onChange={e=>setEditJob({...editJob,shipVia:e.target.value})} placeholder="e.g. Must deliver after 4/6" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Bill To (if different from customer)</label><textarea value={editJob.billTo||""} onChange={e=>setEditJob({...editJob,billTo:e.target.value})} placeholder={"School Name\nStreet Address\nCity, State Zip"} rows={3} style={{...inputStyle,resize:"vertical",minHeight:56,lineHeight:1.4,fontFamily:"inherit"}}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={saveJob}>Save Changes</Btn><Btn v="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div></Card>}


    <div className="resp-grid-5" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12,marginBottom:24}}>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Revenue</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#e5e5e5"}}>{fmt(f.totalRevenue)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Cost</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#e5e5e5"}}>{fmt(f.totalCost)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Margin</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#34d399"}}>{pct(f.margin)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Line Items</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#e5e5e5"}}>{f.itemCount}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:12,color:"#a3a3a3",marginBottom:4}}>Commission</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{fmt(_commissionFor(job.id,rep?.commissionRate||0))}</div></Card>
    </div>
    {/* Vendor Credits & Adjustments. Only renders when this job has any standalone
        credits or bills attached. Created from Documents > Vendor Bills tab via
        the "+ New Vendor Credit" / "+ New Vendor Bill" buttons. Each entry
        contributes to the cost adjustment that already flows through f.totalCost
        and f.margin above. */}
    {(()=>{const adj=((ctx.customSops||[]).filter(s=>(s.cat==='VendorCredit'||s.cat==='StandaloneBill'))).map(s=>{let d={};try{d=JSON.parse(s.content||'{}')}catch{}return {_sopId:s.id,_cat:s.cat,...d}}).filter(x=>x.jobId===job.id&&x.void!==true);if(adj.length===0)return null;const creditTotal=adj.filter(a=>a._cat==='VendorCredit').reduce((s,a)=>s+(Number(a.amount)||0),0);const billTotal=adj.filter(a=>a._cat==='StandaloneBill').reduce((s,a)=>s+(Number(a.amount)||0),0);return <Card style={{marginBottom:24,padding:14,border:"1px solid rgba(45,212,191,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2dd4bf"}}>Vendor Credits & Adjustments</div>
        <div style={{display:"flex",gap:14,fontSize:11,color:"#a3a3a3"}}>
          {creditTotal>0&&<span>Credits: <span style={{color:"#34d399",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>-{fmt(creditTotal)}</span></span>}
          {billTotal>0&&<span>Standalone bills: <span style={{color:"#f97316",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt(billTotal)}</span></span>}
          <span>Net cost change: <span style={{color:billTotal-creditTotal<0?"#34d399":billTotal-creditTotal>0?"#f97316":"#a3a3a3",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{billTotal-creditTotal>=0?"+":""}{fmt(billTotal-creditTotal)}</span></span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {adj.map(a=>{const isCred=a._cat==='VendorCredit';return <div key={a._sopId} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#0a0a0a",border:"1px solid "+(isCred?"rgba(52,211,153,0.18)":"rgba(249,115,22,0.18)"),borderRadius:8,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,color:isCred?"#34d399":"#f97316",letterSpacing:0.5,textTransform:"uppercase",padding:"2px 6px",background:isCred?"rgba(52,211,153,0.08)":"rgba(249,115,22,0.08)",borderRadius:4}}>{isCred?"CREDIT":"STANDALONE BILL"}</span>
          <span style={{fontSize:13,color:"#e5e5e5",fontWeight:600}}>{a.vendorName||"Vendor"}</span>
          <span style={{fontSize:12,color:"#a3a3a3"}}>{a.creditDate||""}</span>
          {a.refNumber&&<span style={{fontSize:11,color:"#737373",fontFamily:"'JetBrains Mono',monospace"}}>{a.refNumber}</span>}
          {a.memo&&<span style={{fontSize:11,color:"#737373",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.memo}>{a.memo}</span>}
          {a.fileUrl&&<a href={a.fileUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"#a78bfa",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",background:"#a78bfa10",border:"1px solid #a78bfa25",borderRadius:4}} title={a.fileName||'View attachment'}><I n="file" s={11} color="#a78bfa"/> File</a>}
          <span style={{fontSize:14,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:isCred?"#34d399":"#f97316",marginLeft:"auto"}}>{isCred?"-":"+"}{fmt(Number(a.amount)||0)}</span>
          {a.paid&&<Badge label="paid" color="#34d399"/>}
        </div>})}
      </div>
      <div style={{marginTop:10,fontSize:11,color:"#525252"}}>Manage from Documents &gt; Vendor Bills. Credits reduce vendor cost on this job; standalone bills increase it. Both reflect in the totals above.</div>
    </Card>})()}
    <div className="resp-grid-5" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:12,marginBottom:24}}>
      <Card style={{padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#c4c4c4"}}>Payment</span><Badge label={job.paymentStatus} color={statusColor(job.paymentStatus)}/></div></Card>
      <Card style={{padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#c4c4c4"}}>Delivery</span><span style={{fontSize:12,fontWeight:600,color:f.totalReceived===f.totalOrdered?"#34d399":f.totalReceived>0?"#fbbf24":"#525252"}}>{fmtN(f.totalReceived)}/{fmtN(f.totalOrdered)}</span></div><Bar value={f.totalReceived} max={f.totalOrdered||1} color={f.totalReceived===f.totalOrdered?"#34d399":"#fbbf24"} height={3}/></Card>
      <Card style={{padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#c4c4c4"}}>Invoiced</span><span style={{fontSize:13,fontWeight:700,color:items.every(i=>i.qtyInvoiced>=i.qtyOrdered)?"#34d399":"#2dd4bf"}}>{fmt(items.reduce((s,i)=>s+i.unitPrice*i.qtyInvoiced,0))}</span></div><Bar value={items.reduce((s,i)=>s+i.qtyInvoiced,0)} max={items.reduce((s,i)=>s+i.qtyOrdered,0)||1} color="#2dd4bf" height={3}/></Card>
      <Card style={{padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#c4c4c4"}}>Terms</span><span style={{fontSize:13,fontWeight:700,color:"#2dd4bf"}}>{job.terms||"Net 30"}</span></div></Card>
      <Card style={{padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#c4c4c4"}}>Due Date</span><span style={{fontSize:13,fontWeight:600,color:job.dueDate&&new Date(job.dueDate)<new Date()&&job.paymentStatus!=="paid"?"#f87171":"#e5e5e5"}}>{job.dueDate||"Not set"}</span></div>{job.dueDate&&new Date(job.dueDate)<new Date()&&job.paymentStatus!=="paid"&&<span style={{fontSize:12,color:"#f87171"}}>OVERDUE</span>}</Card>
    </div>


    {addingItem&&<Card style={{marginBottom:20,border:"1px solid #05966930"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#34d399"}}>Add Line Item</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:8}}><div style={{position:"relative"}}><label style={{fontSize:12,color:"#a78bfa",display:"block",marginBottom:3}}>Group / Section</label><input value={newItem.group} onChange={e=>setNewItem({...newItem,group:e.target.value})} placeholder="e.g. Cafeteria 179, Library" style={{...inputStyle,fontSize:12,borderColor:"#a78bfa30"}} list="group-list"/><datalist id="group-list">{[...new Set(items.map(i=>i.group).filter(Boolean))].map(g=><option key={g} value={g}/>)}</datalist></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Tag/Room</label><input value={newItem.tag} onChange={e=>setNewItem({...newItem,tag:e.target.value})} placeholder="e.g. 100A" style={{...inputStyle,fontSize:12}}/></div><div style={{position:"relative"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Vendor / Manufacturer</label><input value={newItem.manufacturer} onChange={e=>{const val=e.target.value;const match=vendors.find(v=>v.name.toLowerCase()===val.toLowerCase());const lp=parseFloat(newItem.listPrice)||0;setNewItem({...newItem,manufacturer:val,vendor:match?match.id:newItem.vendor,...(match&&lp>0?{unitCost:Math.round(lp*(1-match.discountRate)*100)/100}:{})})}} placeholder="Type to search vendors..." style={{...inputStyle,fontSize:12}} list="vendor-list"/><datalist id="vendor-list">{vendors.map(v=><option key={v.id} value={v.name}>{v.name}{v.discountRate?" ("+((v.discountRate*100).toFixed(0))+"% off)":""}</option>)}</datalist>{newItem.vendor&&vendors.find(v=>v.id===newItem.vendor)&&<div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><span style={{fontSize:10,color:"#34d399"}}>Matched: {vendors.find(v=>v.id===newItem.vendor)?.name}</span><input type="number" value={vendors.find(v=>v.id===newItem.vendor)?.discountRate?Math.round((vendors.find(v=>v.id===newItem.vendor)?.discountRate||0)*100):""} onChange={e=>{const dr=(parseFloat(e.target.value)||0)/100;updateVendor(newItem.vendor,{discountRate:dr});const lp=parseFloat(newItem.listPrice)||0;if(lp>0)setNewItem(prev=>({...prev,unitCost:Math.round(lp*(1-dr)*100)/100}));items.filter(li=>li.vendor===newItem.vendor&&li.listPrice).forEach(li=>{updateLineItem(li.id,{unitCost:Math.round((li.listPrice||0)*(1-dr)*100)/100})})}} style={{...inputStyle,width:40,fontSize:10,padding:"2px 4px",textAlign:"right"}} placeholder="0"/><span style={{fontSize:10,color:"#34d399"}}>% discount</span></div>}</div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Model #</label><input value={newItem.modelNumber} onChange={e=>setNewItem({...newItem,modelNumber:e.target.value})} placeholder="e.g. 714" style={{...inputStyle,fontSize:12}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Color/Finish</label><input value={newItem.color} onChange={e=>setNewItem({...newItem,color:e.target.value})} placeholder="e.g. Black/Chrome" style={{...inputStyle,fontSize:12}}/></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginBottom:8}}><div style={{gridColumn:"1/-1"}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Description</label><textarea value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})} rows={3} style={{...inputStyle,fontSize:12,resize:"vertical",minHeight:50,lineHeight:1.4,fontFamily:"inherit"}} placeholder="Item description (use Enter for new lines: edge detail, hinge type, hardware, finish...)"/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>List Price</label><input type="number" value={newItem.listPrice} onChange={e=>{const lp=parseFloat(e.target.value)||0;const calc=autoCalcFromList(lp,newItem.vendor);setNewItem({...newItem,listPrice:e.target.value,...calc})}} style={{...inputStyle,fontSize:12}} placeholder="0.00"/></div><div><label style={{fontSize:12,color:"#34d399",display:"block",marginBottom:3}}>Net Cost (auto)</label><input type="number" value={newItem.unitCost} onChange={e=>setNewItem({...newItem,unitCost:e.target.value})} style={{...inputStyle,fontSize:12,borderColor:"#05966930"}} placeholder="0.00"/></div><div><label style={{fontSize:12,color:"#2dd4bf",display:"block",marginBottom:3}}>Your Price</label><input type="number" value={newItem.unitPrice} onChange={e=>setNewItem({...newItem,unitPrice:e.target.value})} style={{...inputStyle,fontSize:12,borderColor:"#2dd4bf30"}} placeholder="0.00"/></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:12}}><div><label style={{fontSize:12,color:"#fbbf24",display:"block",marginBottom:3}}>Shipping/Unit</label><input type="number" value={newItem.shippingPerUnit} onChange={e=>setNewItem({...newItem,shippingPerUnit:e.target.value})} placeholder="" style={{...inputStyle,fontSize:12,borderColor:"#fbbf2430"}}/></div><div><label style={{fontSize:12,color:"#a78bfa",display:"block",marginBottom:3}}>Install/Unit</label><input type="number" value={newItem.installPerUnit} onChange={e=>setNewItem({...newItem,installPerUnit:e.target.value})} placeholder="" style={{...inputStyle,fontSize:12,borderColor:"#a78bfa30"}}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:3}}>Qty Ordered</label><input type="number" value={newItem.qtyOrdered} onChange={e=>setNewItem({...newItem,qtyOrdered:e.target.value})} style={{...inputStyle,fontSize:12}}/></div><div style={{display:"flex",alignItems:"flex-end"}}>{newItem.qtyOrdered>0&&newItem.unitPrice>0&&<div style={{fontSize:12,color:"#2dd4bf",padding:"8px 0"}}>Total: {fmt(((parseFloat(newItem.unitPrice)||0)+(parseFloat(newItem.shippingPerUnit)||0)+(parseFloat(newItem.installPerUnit)||0))*(parseInt(newItem.qtyOrdered)||0))}</div>}</div></div>{newItem.listPrice>0&&<div style={{fontSize:12,color:"#34d399",marginBottom:8}}>Vendor discount: {((vendors.find(v=>v.id===newItem.vendor)?.discountRate||0)*100).toFixed(0)}% off list -- Cost: {fmt(newItem.unitCost)} -- Sell: {fmt(newItem.unitPrice)} -- Margin: {newItem.unitPrice>0?((1-newItem.unitCost/newItem.unitPrice)*100).toFixed(1):0}%</div>}<div style={{marginBottom:12,padding:"10px 12px",background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8}}><label style={{fontSize:11,color:"#ffffff",textTransform:"uppercase",letterSpacing:0.6,fontWeight:700,display:"block",marginBottom:5}}>Ship To (line-item override)</label><textarea value={newItem.shipTo} onChange={e=>setNewItem({...newItem,shipTo:e.target.value})} rows={3} placeholder={"Leave blank to use job default. Each unique address creates its own PO.\nExample:\nLincoln Elementary School\n123 Main St\nChicago, IL 60601"} style={{...inputStyle,fontSize:13,resize:"vertical",minHeight:64,lineHeight:1.5,fontFamily:"inherit",color:"#ffffff",background:"#000000",borderColor:newItem.shipTo?"#a78bfa60":"rgba(255,255,255,0.18)"}}/><div style={{fontSize:11,color:"#a3a3a3",marginTop:6,lineHeight:1.4}}>Items grouped by vendor + this address get their own PO. Leave blank to use the job default ship-to.</div></div><div style={{display:"flex",gap:8}}><Btn onClick={saveNewItem}>Add Item</Btn><Btn v="secondary" onClick={()=>setAddingItem(false)}>Cancel</Btn></div></Card>}


    <Header title="Line Items" sub="Click any cell value to edit inline -- changes propagate across all views"/>
    {/* Bulk select bar */}
    {selectedItems.size>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(45,212,191,0.06)",border:"1px solid rgba(45,212,191,0.15)",borderRadius:10,marginBottom:10,flexWrap:"wrap"}}>
      <span style={{fontSize:13,fontWeight:600,color:"#2dd4bf"}}>{selectedItems.size} item{selectedItems.size>1?"s":""} selected</span>
      <Btn v="danger" style={{fontSize:11,padding:"4px 10px"}} onClick={bulkDeleteItems}><I n="close" s={11}/> Delete Selected</Btn>
      <Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setSelectedItems(new Set())}>Clear</Btn>
    </div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",gap:4,alignItems:"center"}}><Check checked={selectedItems.size===items.length&&items.length>0} onChange={selectAllItems}/><span style={{fontSize:12,color:selectedItems.size>0?"#2dd4bf":"#a3a3a3",marginRight:8}}>{selectedItems.size>0?selectedItems.size+"/"+items.length:"All"}</span><span style={{fontSize:12,color:"#a3a3a3",marginRight:4}}>Group by:</span>{[["none","None"],["group","Section"],["vendor","Vendor"],["tag","Tag"]].map(([v,l])=><button key={v} onClick={()=>setGroupBy(v)} style={{padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",background:groupBy===v?"#a78bfa20":"transparent",color:groupBy===v?"#a78bfa":"#555",fontSize:12,fontFamily:"inherit",fontWeight:groupBy===v?600:400}}>{l}</button>)}</div><Btn v="ghost" style={{fontSize:12}} onClick={()=>setEditingItem(editingItem==="ALL"?null:"ALL")}>{editingItem==="ALL"?"Done Editing":"Edit All"}</Btn></div>
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",borderRadius:10,border:"1px solid #222222"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1200}}><thead><tr style={{background:"#111111"}}>{["Tag","Manuf.","Disc%","Model #","Description","Color","Qty","Net Each","Net Total","Markup%","Your Price","Line Total","Recd","Status",""].map((h,i,arr)=><th key={i} style={{padding:"6px 8px",textAlign:i>=6?"right":"left",fontWeight:600,color:"#a3a3a3",fontSize:11,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid #222222",whiteSpace:"nowrap",...(i===arr.length-1?{position:"sticky",right:0,background:"#111111",zIndex:2}:{})}}>{h}</th>)}</tr></thead><tbody>{(()=>{
      const grouped=groupBy==="none"?[["",items]]:Object.entries(items.reduce((g,i)=>{const k=groupBy==="group"?(i.group||"Ungrouped"):groupBy==="vendor"?(vendors.find(v=>v.id===i.vendor)?.name||"Unknown"):groupBy==="tag"?(i.tag||"No Tag"):"";if(!g[k])g[k]=[];g[k].push(i);return g},{}));
      return grouped.map(([grp,grpItems])=>{
        const grpTotal=grpItems.reduce((s,i)=>s+(i.unitPrice||0)*(i.qtyOrdered||0),0);
        return <React.Fragment key={grp}>{grp&&<tr style={{background:"#a78bfa10"}}><td colSpan={15} style={{padding:"10px 8px",fontWeight:700,color:"#a78bfa",fontSize:13}}>{grp}<span style={{fontWeight:400,color:"#888",fontSize:12,marginLeft:12}}>{grpItems.length} items -- {fmt(grpTotal)}</span></td></tr>}{grpItems.map(item=>{
      const isE=editingItem===item.id||editingItem==="ALL";const eS={...inputStyle,fontSize:13,padding:"9px 11px",borderRadius:8};const ship=item.shippingPerUnit||0;const inst=item.installPerUnit||0;const lineTotal=item.priceExtended&&item.priceExtended>0?item.priceExtended:(item.unitPrice||0)*(item.qtyOrdered||0);
      return <tr key={item.id} onClick={e=>{const tag=e.target.tagName;if(tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA"||tag==="BUTTON"||tag==="LABEL"||e.target.closest("input,select,textarea,button"))return;if(editingItem==="ALL")return;if(isE)return;setEditingItem(item.id)}} style={{borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",background:isE?"#0a0a0a":"transparent",transition:"background 0.15s"}}>
        <td style={{padding:"6px 8px",minWidth:55}}>{isE?<input value={item.tag||""} onChange={e=>updateLineItem(item.id,{tag:e.target.value})} style={{...eS,width:80}}/>:<span style={{color:"#c4c4c4"}}>{item.tag||""}</span>}</td>
        <td style={{padding:"6px 8px",minWidth:80}}>{isE?<div><input value={item.manufacturer||""} onChange={e=>{const val=e.target.value;const match=vendors.find(v=>v.name.toLowerCase()===val.toLowerCase());const updates={manufacturer:val};if(match){updates.vendor=match.id;if(item.listPrice&&match.discountRate){updates.unitCost=Math.round((item.listPrice||0)*(1-match.discountRate)*100)/100}}updateLineItem(item.id,updates)}} list="vendor-list-tbl" style={{...eS,width:130}}/></div>:<span style={{color:"#c4c4c4"}}>{item.manufacturer||vendors.find(v=>v.id===item.vendor)?.name||""}</span>}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:50}}>{(()=>{const v=vendors.find(v=>v.id===item.vendor);const dr=v?.discountRate||0;const calcDr=item.listPrice>0&&item.unitCost>0&&item.unitCost<item.listPrice?Math.round((1-item.unitCost/item.listPrice)*10000)/100:0;const showDr=calcDr||Math.round(dr*10000)/100;return isE?<DiscInput key={item.id+"-disc"} initial={editingItem==="ALL"?(dr?Math.round(dr*10000)/100:""):(showDr||"")} onCommit={pct=>{const newDr=pct/100;if(editingItem==="ALL"){updateVendor(v?.id||"",{discountRate:newDr});items.filter(li=>li.vendor===item.vendor&&li.listPrice).forEach(li=>{updateLineItem(li.id,{unitCost:Math.round((li.listPrice||0)*(1-newDr)*100)/100})})}else{if(v?.id)updateVendor(v.id,{discountRate:newDr});if(item.listPrice){updateLineItem(item.id,{unitCost:Math.round((item.listPrice||0)*(1-newDr)*100)/100})}else if(item.unitPrice>0&&newDr>0){const impliedList=Math.round(item.unitCost/(1-newDr)*100)/100;updateLineItem(item.id,{listPrice:impliedList})}}}} style={{...eS,width:70,textAlign:"right"}}/>:showDr>0?<span style={{fontFamily:"'JetBrains Mono',monospace",color:"#34d399",fontSize:11}}>{showDr%1===0?showDr:showDr.toFixed(2)}%</span>:<span style={{color:"#555"}}>--</span>})()}</td>
        <td style={{padding:"6px 8px",minWidth:80}}>{isE?<input value={item.modelNumber||""} onChange={e=>updateLineItem(item.id,{modelNumber:e.target.value})} style={{...eS,width:120}}/>:<span style={{color:"#c4c4c4"}}>{item.modelNumber||""}</span>}</td>
        <td style={{padding:"6px 8px",color:"#e5e5e5",fontWeight:500,minWidth:240,maxWidth:340}}>{(()=>{const eShip=getItemShipTo(item.id,item.shipTo);return isE?<><textarea value={item.description} onChange={e=>updateLineItem(item.id,{description:e.target.value})} rows={Math.max(3,Math.ceil((item.description||"").length/40))} style={{...eS,width:"100%",resize:"vertical",minHeight:64,lineHeight:1.5,fontFamily:"inherit"}}/>{(()=>{const userExpanded=shipToExpanded.has(item.id);const hasValue=!!eShip;const isShipExpanded=userExpanded||(hasValue&&!shipToExpanded.has(item.id+"__hidden"));return isShipExpanded?<div style={{marginTop:8,padding:"6px 8px",background:"rgba(167,139,250,0.04)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:6}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,gap:6}}><label style={{fontSize:10,color:"#a78bfa",textTransform:"uppercase",letterSpacing:0.5,fontWeight:700}}>Ship To override</label><div style={{display:"flex",gap:4}}>{hasValue&&<button onClick={e=>{e.stopPropagation();setItemShipTo(item.id,"");}} style={{background:"transparent",border:"none",color:"#f87171",cursor:"pointer",fontSize:10,padding:"2px 6px",fontFamily:"inherit"}} title="Clear the override (revert to job default)">Clear</button>}<button onClick={e=>{e.stopPropagation();setShipToExpanded(prev=>{const next=new Set(prev);next.delete(item.id);next.add(item.id+"__hidden");return next});}} style={{background:"transparent",border:"none",color:"#737373",cursor:"pointer",fontSize:10,padding:"2px 6px",fontFamily:"inherit"}} title="Hide this field (keeps the value if set)">Hide</button></div></div><ShipToInput key={item.id+"-shipto"} initial={eShip} onCommit={v=>setItemShipTo(item.id,v)} rows={2} placeholder="Leave blank to use job default" style={{...eS,width:"100%",resize:"vertical",minHeight:42,lineHeight:1.4,fontFamily:"inherit",fontSize:12,color:"#ffffff",background:"#000000",borderColor:hasValue?"#a78bfa60":"rgba(255,255,255,0.18)",padding:"6px 8px"}}/></div>:<button onClick={e=>{e.stopPropagation();setShipToExpanded(prev=>{const next=new Set(prev);next.delete(item.id+"__hidden");next.add(item.id);return next});}} style={{marginTop:6,padding:"3px 8px",background:hasValue?"rgba(167,139,250,0.12)":"rgba(167,139,250,0.06)",border:"1px "+(hasValue?"solid":"dashed")+" rgba(167,139,250,"+(hasValue?"0.4":"0.3")+")",borderRadius:4,color:"#a78bfa",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600,letterSpacing:0.3,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={hasValue?"Click to edit ship-to override: "+eShip:"Add a per-line-item ship-to address (overrides job default)"}>{hasValue?"Ship: "+(eShip||"").split("\n")[0].slice(0,30)+((eShip||"").length>30?"...":""):"+ Ship To override"}</button>})()}</>:<><div style={{whiteSpace:"pre-line"}}>{item.description}</div>{eShip&&<div style={{marginTop:4,padding:"3px 6px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:4,fontSize:10,color:"#a78bfa",fontWeight:500,display:"inline-block",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={eShip}>Ship: {(eShip||"").split('\n')[0].slice(0,40)}{(eShip||"").length>40?"...":""}</div>}</>})()}</td>
        <td style={{padding:"6px 8px",minWidth:65}}>{isE?<input value={item.color||""} onChange={e=>updateLineItem(item.id,{color:e.target.value})} style={{...eS,width:110}}/>:<span style={{color:"#c4c4c4"}}>{item.color||""}</span>}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:55}}>{isE?<input type="number" value={item.qtyOrdered} onChange={e=>updateLineItem(item.id,{qtyOrdered:parseInt(e.target.value)||0})} style={{...eS,width:75,textAlign:"right"}}/>:fmtN(item.qtyOrdered)}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:75}}>{isE?<input type="number" value={item.unitCost} onChange={e=>updateLineItem(item.id,{unitCost:parseFloat(e.target.value)||0})} style={{...eS,width:100,textAlign:"right"}}/>:<span style={{fontFamily:"'JetBrains Mono',monospace"}}>{fmt(item.unitCost)}</span>}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:80}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#a3a3a3"}}>{fmt((item.unitCost||0)*(item.qtyOrdered||0))}</span></td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:65}}>{(()=>{const markup=item.unitCost>0?Math.round((item.unitPrice/item.unitCost-1)*100):0;return isE?<input type="number" value={markup||""} onChange={e=>{const pct=parseFloat(e.target.value)||0;updateLineItem(item.id,{unitPrice:Math.round(item.unitCost*(1+pct/100)*100)/100})}} style={{...eS,width:80,textAlign:"right"}}/>:<span style={{fontFamily:"'JetBrains Mono',monospace",color:markup>0?"#34d399":"#555"}}>{markup>0?markup+"%":"--"}</span>})()}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:80}}>{isE?<input type="number" value={item.unitPrice} onChange={e=>updateLineItem(item.id,{unitPrice:parseFloat(e.target.value)||0})} style={{...eS,width:100,textAlign:"right"}}/>:<span style={{fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{fmt(item.unitPrice)}</span>}</td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:85}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"#2dd4bf"}}>{fmt((item.unitPrice||0)*(item.qtyOrdered||0))}</span></td>
        <td style={{padding:"6px 8px",textAlign:"right",minWidth:55}}>{isE?<input type="number" value={item.qtyReceived} onChange={e=>updateLineItem(item.id,{qtyReceived:parseInt(e.target.value)||0})} style={{...eS,width:75,textAlign:"right"}}/>:<span style={{color:item.qtyReceived===item.qtyOrdered?"#34d399":item.qtyReceived>0?"#fbbf24":"#555"}}>{fmtN(item.qtyReceived)}/{fmtN(item.qtyOrdered)}</span>}</td>
        <td style={{padding:"6px 8px"}}><Badge label={getItemStatus(item)} color={statusColor(getItemStatus(item))}/></td>
        <td style={{padding:"6px 8px",position:"sticky",right:0,background:isE?"#0a0a0a":"#0a0a0a",zIndex:2}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:3}}><Btn v={isE?"primary":"ghost"} style={{fontSize:11,padding:"2px 6px"}} onClick={e=>{e.stopPropagation();setEditingItem(isE?null:item.id)}}>{isE?"Done":"Edit"}</Btn><Btn v="secondary" style={{fontSize:11,padding:"2px 6px"}} onClick={e=>{e.stopPropagation();addLineItem({...item,id:"LI-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),qtyReceived:0,qtyInvoiced:0});notify("Line item duplicated")}}>Dup</Btn><Btn v="danger" style={{fontSize:11,padding:"2px 6px"}} onClick={e=>{e.stopPropagation();deleteLineItem(item.id);if(editingItem===item.id)setEditingItem(null);notify("Line item deleted")}}>Del</Btn></div></td>
      </tr>})}{grp&&<tr style={{borderTop:"1px solid #a78bfa30"}}><td colSpan={13} style={{padding:"6px 8px",textAlign:"right",fontSize:12,color:"#a78bfa",fontWeight:600}}>{grp} Subtotal: {fmt(grpTotal)}</td><td></td><td></td></tr>}</React.Fragment>})})()}</tbody></table></div>
    <datalist id="vendor-list-tbl">{vendors.map(v=><option key={v.id} value={v.name}/>)}</datalist>




    {/* --- JOB TIMELINE ---------------------------------------- */}
    <Card style={{marginTop:32}}>
      <div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:16}}>Job Timeline</div>
      <div style={{display:"flex",alignItems:"center",gap:0,overflow:"auto",padding:"8px 0"}}>
        {[
          {label:"Created",date:job.createdDate,done:!!job.createdDate,color:"#a3a3a3"},
          {label:"Started",date:job.startDate,done:!!job.startDate,color:"#a78bfa"},
          {label:"Items Ordered",date:items.length>0?items[0]?.poDate:"",done:items.some(i=>i.qtyOrdered>0),color:"#8b5cf6"},
          {label:"Items Received",date:items.find(i=>i.qtyReceived>0)?.deliveryDate||"",done:items.some(i=>i.qtyReceived>0),color:"#fbbf24"},
          {label:"Invoiced",date:items.find(i=>i.qtyInvoiced>0)?.invoiceDate||"",done:items.some(i=>i.qtyInvoiced>0),color:"#2dd4bf"},
          {label:"Paid",date:job.paymentStatus==="paid"?job.endDate||"":"",done:job.paymentStatus==="paid",color:"#34d399"},
        ].map((step,i,arr)=><div key={i} style={{display:"flex",alignItems:"center",flex:1,minWidth:100}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:step.done?step.color:"#222222",border:"2px solid "+(step.done?step.color:"#333333"),display:"flex",alignItems:"center",justifyContent:"center"}}>{step.done&&<I n="check" s={12}/>}</div>
            <div style={{fontSize:12,fontWeight:600,color:step.done?step.color:"#8a8a8a",textAlign:"center"}}>{step.label}</div>
            {step.date&&<div style={{fontSize:12,color:"#a3a3a3"}}>{step.date}</div>}
          </div>
          {i<arr.length-1&&<div style={{flex:1,height:2,background:step.done?"#333333":"#1a1a1a",margin:"0 4px",marginBottom:20}}/>}
        </div>)}
      </div>
      <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>{[["unpaid","Unpaid"],["partial","Partial"],["paid","Paid"]].map(([val,label])=><button key={val} onClick={()=>{updateJob(job.id,{paymentStatus:val,endDate:val==="paid"?new Date().toISOString().split("T")[0]:job.endDate||""});addActivity("Payment status changed to "+val);notify("Payment: "+val)}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid "+(job.paymentStatus===val?"#2dd4bf":"#333333"),background:job.paymentStatus===val?"#2dd4bf18":"transparent",color:job.paymentStatus===val?"#2dd4bf":"#525252",fontSize:12,fontWeight:job.paymentStatus===val?600:400,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>)}</div>
    </Card>




    {/* --- AUDIT TRAIL ---------------------------------------- */}
    {(()=>{const jobAudit=job.auditTrail||[];return jobAudit.length>0?<Card style={{marginTop:24,marginBottom:8}}><details><summary style={{fontSize:14,fontWeight:700,color:"#a78bfa",cursor:"pointer"}}>Audit Trail ({jobAudit.length} changes)</summary><div style={{maxHeight:250,overflow:"auto",marginTop:8}}>{jobAudit.map((log,idx)=><div key={idx} style={{padding:"6px 0",borderBottom:"1px solid #1a1a1a",fontSize:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{color:"#a78bfa"}}>{log.entity==="job"?"Job":"Line Item"+(log.desc?" ("+log.desc+")":"")} edited</span><span style={{color:"#555"}}>{new Date(log.time).toLocaleString()}</span></div>{log.fields.map((f,fi)=><div key={fi} style={{color:"#a3a3a3",paddingLeft:12}}><span style={{color:"#e5e5e5"}}>{f.field}</span>: <span style={{color:"#f87171"}}>{String(f.from===undefined?"--":f.from).slice(0,40)}</span> &rarr; <span style={{color:"#34d399"}}>{String(f.to===undefined?"--":f.to).slice(0,40)}</span></div>)}</div>)}</div></details></Card>:null})()}


    {/* --- ACTIVITY FEED ---------------------------------------- */}
    <Card style={{marginTop:32}}>
      <div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:12}}>Activity Log</div>
      <div style={{display:"flex",gap:8,marginBottom:12}}><input value={activityInput} onChange={e=>setActivityInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&activityInput.trim()){addActivity(activityInput.trim());setActivityInput("")}}} placeholder="Add a note... (press Enter)" style={{...inputStyle,flex:1}}/><Btn onClick={()=>{if(activityInput.trim()){addActivity(activityInput.trim());setActivityInput("")}}}>Add Note</Btn></div>
      <div style={{display:"flex",flexDirection:"column",gap:0,maxHeight:300,overflow:"auto"}}>{activities.length===0?<div style={{fontSize:12,color:"#8a8a8a",padding:12,textAlign:"center"}}>No activity yet. Add notes, status updates, or reminders.</div>:activities.map(a=><div key={a.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #222222"}}><div style={{width:6,height:6,borderRadius:"50%",background:a.source==="auto"?"#a78bfa":"#2dd4bf",marginTop:6,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:12,color:"#c4c4c4"}}>{a.text}</div><div style={{display:"flex",gap:8,fontSize:11,marginTop:3}}>{a.user&&<span style={{color:"#2dd4bf",fontWeight:600}}>{a.user}</span>}<span style={{color:"#737373"}}>{new Date(a.time).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span><span style={{color:"#525252"}}>{new Date(a.time).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span></div></div></div>)}</div>
    </Card>


    </div>
  </div>;
}


// ===============================================================
// DELIVERY CALENDAR
// ===============================================================
function DeliveryCalendar({jobs,lineItems,vendors,customers,getJobItems,setPage,setSelectedJob,notify,jobNum}){
  const [monthOffset,setMonthOffset]=useState(0);
  const [calFilter,setCalFilter]=useState("all"); // all, pending, delivered, po, due
  const now=new Date();
  const viewDate=new Date(now.getFullYear(),now.getMonth()+monthOffset,1);
  const year=viewDate.getFullYear();
  const month=viewDate.getMonth();
  const monthName=viewDate.toLocaleString("default",{month:"long"});
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();


  // Build ALL events from line items and jobs
  const events=[];
  lineItems.forEach(item=>{
    const job=jobs.find(j=>j.id===item.jobId);
    const vendor=vendors.find(v=>v.id===item.vendor||v.name===item.vendor);
    const vName=vendor?.name||item.vendor||"";
    // Pending deliveries (not fully received, has a delivery/due date)
    if(item.qtyReceived<item.qtyOrdered){
      const dateStr=item.deliveryDate||job?.dueDate||"";
      if(dateStr){const d=new Date(dateStr);if(d.getFullYear()===year&&d.getMonth()===month){
        events.push({day:d.getDate(),label:vName+": "+(item.qtyOrdered-item.qtyReceived)+" "+item.description.slice(0,25),type:"pending",color:"#fbbf24",jobId:job?.id,jobName:job?.name||"",detail:item.description,qty:item.qtyOrdered-item.qtyReceived,vendor:vName});
      }}
    }
    // Delivered items (has delivery date and received qty > 0)
    if(item.qtyReceived>0&&item.deliveryDate){
      const d=new Date(item.deliveryDate);if(d.getFullYear()===year&&d.getMonth()===month){
        events.push({day:d.getDate(),label:vName+": "+item.qtyReceived+" "+item.description.slice(0,25)+" received",type:"delivered",color:"#34d399",jobId:job?.id,jobName:job?.name||"",detail:item.description,qty:item.qtyReceived,vendor:vName});
      }
    }
    // PO dates (when the order was placed)
    if(item.poDate){
      const d=new Date(item.poDate);if(d.getFullYear()===year&&d.getMonth()===month){
        events.push({day:d.getDate(),label:"PO: "+vName+" -- "+item.description.slice(0,25),type:"po",color:"#a78bfa",jobId:job?.id,jobName:job?.name||"",detail:item.description,qty:item.qtyOrdered,vendor:vName});
      }
    }
  });
  // Job due dates
  jobs.forEach(j=>{
    if(j.dueDate){const d=new Date(j.dueDate);if(d.getFullYear()===year&&d.getMonth()===month){
      const cust=customers.find(c=>c.id===j.customer);
      events.push({day:d.getDate(),label:"DUE: "+j.name,type:"due",color:"#f87171",jobId:j.id,jobName:j.name,detail:(cust?.name||"")+" -- "+j.phase,qty:0,vendor:""});
    }}
  });


  const filtered=calFilter==="all"?events:events.filter(e=>e.type===calFilter);
  const days=[];
  for(let i=0;i<firstDay;i++)days.push(null);
  for(let d=1;d<=daysInMonth;d++)days.push(d);


  const filterBtns=[["all","All Events"],["pending","Pending"],["delivered","Delivered"],["po","PO Sent"],["due","Due Dates"]];
  const filterColors={all:"#2dd4bf",pending:"#fbbf24",delivered:"#34d399",po:"#a78bfa",due:"#f87171"};


  return <div style={{animation:"fadeUp 0.4s"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:22,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>{monthName} {year}</div>
        <div style={{fontSize:12,color:"#a3a3a3",marginTop:2}}>{filtered.length} event{filtered.length!==1?"s":""} this month</div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={()=>setMonthOffset(p=>p-1)} style={{width:36,height:36,borderRadius:10,border:"1px solid #222",background:"transparent",color:"#a3a3a3",fontSize:16,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf";e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#222";e.currentTarget.style.color="#a3a3a3"}}>&larr;</button>
        <button onClick={()=>setMonthOffset(0)} style={{padding:"8px 16px",borderRadius:10,border:"1px solid "+(monthOffset===0?"#2dd4bf40":"#222"),background:monthOffset===0?"#2dd4bf10":"transparent",color:monthOffset===0?"#2dd4bf":"#a3a3a3",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>Today</button>
        <button onClick={()=>setMonthOffset(p=>p+1)} style={{width:36,height:36,borderRadius:10,border:"1px solid #222",background:"transparent",color:"#a3a3a3",fontSize:16,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#2dd4bf";e.currentTarget.style.color="#2dd4bf"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#222";e.currentTarget.style.color="#a3a3a3"}}>&rarr;</button>
      </div>
    </div>
    {/* Filter bar */}
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
      {filterBtns.map(([id,label])=>{const ct=id==="all"?events.length:events.filter(e=>e.type===id).length;return <button key={id} onClick={()=>setCalFilter(id)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(calFilter===id?filterColors[id]+"40":"#222"),background:calFilter===id?filterColors[id]+"12":"transparent",color:calFilter===id?filterColors[id]:"#525252",fontSize:12,fontWeight:calFilter===id?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>{label}{ct>0&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:calFilter===id?filterColors[id]+"20":"#222",color:calFilter===id?filterColors[id]:"#525252"}}>{ct}</span>}</button>})}
    </div>
    {/* Calendar grid */}
    <div className="cal-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"#222222",borderRadius:12,overflow:"hidden",border:"1px solid #222222"}}>
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{padding:"10px 8px",textAlign:"center",fontSize:12,fontWeight:600,color:"#a3a3a3",background:"#111111"}}>{d}</div>)}
      {days.map((day,i)=>{
        const dayEvents=day?filtered.filter(e=>e.day===day):[];
        const isToday=day&&month===now.getMonth()&&year===now.getFullYear()&&day===now.getDate();
        const isPast=day&&new Date(year,month,day)<new Date(now.getFullYear(),now.getMonth(),now.getDate());
        return <div key={i} style={{minHeight:90,padding:6,background:day?(isToday?"#0d0d0d":"#000000"):"#0a0a0a",borderTop:"1px solid #222222",position:"relative",opacity:isPast&&!isToday?0.6:1}}>
          {day&&<div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?"#2dd4bf":"#525252",marginBottom:4}}>{isToday?<span style={{background:"#2dd4bf",color:"#000000",borderRadius:10,padding:"1px 6px",fontSize:11}}>{day}</span>:day}</div>}
          {dayEvents.slice(0,3).map((ev,ei)=><div key={ei} onClick={()=>{if(ev.jobId){setSelectedJob(ev.jobId);setPage("jobs")}}} style={{fontSize:10,padding:"2px 4px",marginBottom:2,borderRadius:4,background:ev.color+"15",color:ev.color,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderLeft:"2px solid "+ev.color,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=ev.color+"25"} onMouseLeave={e=>e.currentTarget.style.background=ev.color+"15"}>{ev.label}</div>)}
          {dayEvents.length>3&&<div style={{fontSize:10,color:"#737373",padding:"1px 4px"}}>+{dayEvents.length-3} more</div>}
        </div>
      })}
    </div>
    {/* Event legend */}
    <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
      {[["#fbbf24","Pending Delivery"],["#34d399","Received"],["#a78bfa","PO Sent"],["#f87171","Job Due Date"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#737373"}}><div style={{width:10,height:10,borderRadius:3,background:c}}/>{l}</div>)}
    </div>
    {/* Monthly summary list */}
    {filtered.length>0&&<Card style={{marginTop:16}}><div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:12}}>{monthName} {year} -- {filtered.length} Events</div>{filtered.sort((a,b)=>a.day-b.day).map((ev,i)=><div key={i} className="slide-row" onClick={()=>{if(ev.jobId){setSelectedJob(ev.jobId);setPage("jobs")}}} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<filtered.length-1?"1px solid #111":"none",cursor:"pointer",transition:"background 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#0a0a0a"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
      <div style={{width:36,textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:"#f0f0f0",lineHeight:1}}>{ev.day}</div><div style={{fontSize:9,color:"#525252",textTransform:"uppercase"}}>{new Date(year,month,ev.day).toLocaleString("default",{weekday:"short"})}</div></div>
      <div style={{width:4,height:28,borderRadius:2,background:ev.color,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#d4d4d4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.label}</div><div style={{fontSize:11,color:"#737373"}}>{ev.jobName}{ev.qty?" -- "+ev.qty+" units":""}</div></div>
      <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:ev.color+"12",color:ev.color,fontWeight:600,flexShrink:0}}>{ev.type==="pending"?"PENDING":ev.type==="delivered"?"RECEIVED":ev.type==="po"?"PO SENT":"DUE"}</span>
    </div>)}</Card>}
    {filtered.length===0&&<Card style={{marginTop:16,textAlign:"center",padding:30}}><div style={{fontSize:14,color:"#a3a3a3"}}>No {calFilter==="all"?"events":calFilter} for {monthName} {year}. Set delivery dates on line items or due dates on jobs to populate the calendar.</div></Card>}
  </div>;
}


// ===============================================================
// DELIVERY TRACKER -- Real updates to state
// ===============================================================
function DeliveryPage({jobs,lineItems,vendors,customers,reps,userRole,userRepId,getItemStatus,getJobItems,updateLineItem,setPage,setSelectedJob,notify,jobNum}){
  const [deliveryView,setDeliveryView]=useState("tracker");
  const [delFilter,setDelFilter]=useState("pending");
  const [receiveModal,setReceiveModal]=useState(null);
  const [expandedJobs,setExpandedJobs]=useState(new Set());
  const [receiveQty,setReceiveQty]=useState("");
  const [searchQuery,setSearchQuery]=useState("");
  const [repFilter,setRepFilter]=useState("all");


  // Apply per-rep + search filters to the jobs and line items used by ALL views
  // (tracker KPIs, tracker job groups, calendar). Sales-role users already only
  // see their own jobs via the App-level visibleJobs filter, so the rep filter
  // dropdown is hidden for them.
  const isSalesRole=userRole==="sales";
  const jobsForView=jobs.filter(j=>{
    if(repFilter!=="all"&&j.salesRep!==repFilter)return false;
    if(searchQuery){
      const q=searchQuery.toLowerCase();
      const nameMatch=(j.name||"").toLowerCase().includes(q);
      const numMatch=jobNum?(jobNum(j.id)||"").toLowerCase().includes(q):false;
      const custMatch=(customers.find(c=>c.id===j.customer)?.name||"").toLowerCase().includes(q);
      if(!nameMatch&&!numMatch&&!custMatch)return false;
    }
    return true;
  });
  const visibleJobIds=new Set(jobsForView.map(j=>j.id));
  const lineItemsForView=lineItems.filter(i=>visibleJobIds.has(i.jobId));
  // Determine which jobs match the current filter, THEN show all line items from those
  // jobs -- not just the individual line items that match. Maureen reported May 20 2026:
  // a 4-line PO for North Shore District 112 (McCourt Series 5 Folding Chairs, Chair Cart,
  // and 2 freight lines) showed only 3 lines because the Chair Cart had qtyReceived=qtyOrdered
  // and got filtered out as "not pending." A user expects to see the FULL PO context when
  // viewing a job that still has pending work -- including the line items that have already
  // arrived. The filter's purpose is to hide entire jobs that are 100% done, not to hide
  // individual completed items within a partially-shipped job.
  const jobMatchesPending=(jobId)=>lineItemsForView.some(i=>i.jobId===jobId&&i.qtyReceived<i.qtyOrdered);
  const jobMatchesDelivered=(jobId)=>{const items=lineItemsForView.filter(i=>i.jobId===jobId);return items.length>0&&items.every(i=>i.qtyReceived>=i.qtyOrdered&&i.qtyOrdered>0)};
  const matchingJobIds=new Set(jobsForView.filter(j=>delFilter==="all"?true:delFilter==="delivered"?jobMatchesDelivered(j.id):jobMatchesPending(j.id)).map(j=>j.id));
  const allItems=lineItemsForView.filter(i=>matchingJobIds.has(i.jobId)).map(i=>({...i,jobName:jobsForView.find(j=>j.id===i.jobId)?.name||"",jobId:i.jobId}));
  const partials=lineItemsForView.filter(i=>i.qtyReceived>0&&i.qtyReceived<i.qtyOrdered);


  // Group by job
  const jobGroups={};
  allItems.forEach(item=>{if(!jobGroups[item.jobId])jobGroups[item.jobId]={job:jobsForView.find(j=>j.id===item.jobId),items:[]};jobGroups[item.jobId].items.push(item)});
  const groupedJobs=Object.values(jobGroups).filter(g=>g.job);


  const handleReceive=(item)=>{const qty=parseInt(receiveQty)||0;if(qty<=0)return;const newRcv=Math.min((item||receiveModal).qtyReceived+qty,(item||receiveModal).qtyOrdered);updateLineItem((item||receiveModal).id,{qtyReceived:newRcv,deliveryDate:new Date().toISOString().split("T")[0]});notify(`Logged ${qty} units received`);setReceiveModal(null);setReceiveQty("")};
  const completeAll=(jobItems)=>{jobItems.forEach(item=>{updateLineItem(item.id,{qtyReceived:item.qtyOrdered,deliveryDate:new Date().toISOString().split("T")[0]})});notify(`All ${jobItems.length} items marked complete`)};


  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Deliveries" sub="Track shipments and plan receiving"/>
    <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:0,background:"#111111",padding:4,borderRadius:10,width:"fit-content"}}>{[["tracker","Delivery Tracker"],["calendar","Calendar View"]].map(([id,label])=><button key={id} onClick={()=>setDeliveryView(id)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",background:deliveryView===id?"#2dd4bf":"transparent",color:deliveryView===id?"#000000":"#c4c4c4",fontSize:13,fontWeight:deliveryView===id?600:400,fontFamily:"inherit"}}>{label}</button>)}</div>
      {deliveryView==="tracker"&&<div style={{display:"flex",gap:0,background:"#111111",padding:4,borderRadius:10}}>{[["pending","Pending"],["delivered","Delivered"],["all","All"]].map(([id,label])=><button key={id} onClick={()=>setDelFilter(id)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",background:delFilter===id?"#a78bfa":"transparent",color:delFilter===id?"#000":"#c4c4c4",fontSize:12,fontWeight:delFilter===id?600:400,fontFamily:"inherit"}}>{label}</button>)}</div>}
      <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search by job name, number, or customer..." style={{padding:"8px 12px",background:"#0a0a0a",border:"1px solid #222",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",minWidth:240,flex:"0 1 280px"}}/>
      {!isSalesRole&&reps&&reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).length>0&&<select value={repFilter} onChange={e=>setRepFilter(e.target.value)} style={{padding:"8px 12px",background:"#0a0a0a",border:"1px solid #222",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",cursor:"pointer",minWidth:170}}><option value="all">All Sales Reps</option>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}
      {(searchQuery||repFilter!=="all")&&<button onClick={()=>{setSearchQuery("");setRepFilter("all")}} style={{padding:"6px 12px",background:"transparent",border:"1px solid #333",borderRadius:8,color:"#a3a3a3",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:600}} title="Clear search and filters">Clear</button>}
    </div>
    {deliveryView==="calendar"&&<DeliveryCalendar jobs={jobsForView} lineItems={lineItemsForView} vendors={vendors} customers={customers} getJobItems={getJobItems} setPage={setPage} setSelectedJob={setSelectedJob} notify={notify}/>}
    {deliveryView==="tracker"&&<>
    <div className="resp-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14,marginBottom:24}}>
      <StatCard label="Pending Delivery" value={allItems.length} sub="line items" icon="truck" color="#fbbf24"/>
      <StatCard label="Partial Shipments" value={partials.length} sub="in progress" icon="package" color="#a78bfa"/>
      <StatCard label="Total Ordered" value={fmtN(lineItemsForView.reduce((s,i)=>s+i.qtyOrdered,0))} sub="units" icon="package" color="#525252"/>
      <StatCard label="Total Received" value={fmtN(lineItemsForView.reduce((s,i)=>s+i.qtyReceived,0))} sub="units" icon="check" color="#34d399"/>
    </div>
    {/* Inline receive is now handled per-row in the table below */}


    {groupedJobs.length===0&&<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:16,color:"#34d399",fontWeight:600,marginBottom:4}}>{(searchQuery||repFilter!=="all")?"No matching jobs":delFilter==="pending"?"All deliveries complete":delFilter==="delivered"?"No delivered items yet":"No items found"}</div><div style={{fontSize:13,color:"#a3a3a3"}}>{(searchQuery||repFilter!=="all")?"Try a different search term or rep filter.":delFilter==="pending"?"No outstanding items across any job.":"Try a different filter."}</div></Card>}


    {groupedJobs.map(({job,items})=>{
      const totalOut=items.reduce((s,i)=>s+i.qtyOrdered-i.qtyReceived,0);
      const totalOrd=items.reduce((s,i)=>s+i.qtyOrdered,0);
      const totalRcv=items.reduce((s,i)=>s+i.qtyReceived,0);
      const isExpanded=expandedJobs.has(job.id);
      const toggleExpand=()=>setExpandedJobs(prev=>{const next=new Set(prev);if(next.has(job.id))next.delete(job.id);else next.add(job.id);return next});
      return <Card key={job.id} style={{marginBottom:16}}>
        <div onClick={toggleExpand} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,minWidth:0,flex:1}}>
            <div style={{transition:"transform 0.2s",transform:isExpanded?"rotate(90deg)":"rotate(0deg)",marginTop:3,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",width:14,height:14}}><svg width="10" height="10" viewBox="0 0 10 10" style={{display:"block"}}><path d="M2 1 L8 5 L2 9 Z" fill="#525252"/></svg></div>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5",wordBreak:"break-word"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:10,marginRight:4}}>{jobNum?.(job.id)}</span>{job.name}</span><Badge label={job.phase} color={statusColor(job.phase)}/></div>
              <div style={{fontSize:11,color:"#a3a3a3",marginTop:2}}>{items.length} items - {fmtN(totalOut)} outstanding</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
            <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#a3a3a3"}}>Received</div><div style={{fontSize:13,fontWeight:600,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(totalRcv)}/{fmtN(totalOrd)}</div></div>
            <Btn v="secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();completeAll(items)}}>Complete All</Btn>
          </div>
        </div>
        <Bar value={totalRcv} max={totalOrd} color="#fbbf24" height={4} style={{marginTop:10}}/>
        {isExpanded&&<div style={{marginTop:12}}>
          {/* Desktop table */}
          <div className="hide-mobile" style={{overflowX:"auto",borderRadius:8,border:"1px solid #222222"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
            <thead><tr style={{background:"#111111"}}><th style={{padding:"8px 10px",textAlign:"left",color:"#a3a3a3",fontSize:12,textTransform:"uppercase",letterSpacing:0.5,minWidth:150}}>Item</th><th style={{padding:"8px 10px",textAlign:"left",color:"#a3a3a3",fontSize:12,textTransform:"uppercase"}}>Vendor</th><th style={{padding:"8px 10px",textAlign:"right",color:"#a3a3a3",fontSize:12,textTransform:"uppercase"}}>Ordered</th><th style={{padding:"8px 10px",textAlign:"right",color:"#a3a3a3",fontSize:12,textTransform:"uppercase"}}>Received</th><th style={{padding:"8px 10px",textAlign:"right",color:"#a3a3a3",fontSize:12,textTransform:"uppercase"}}>Outstanding</th><th style={{padding:"8px 10px",textAlign:"center",color:"#a3a3a3",fontSize:12,textTransform:"uppercase"}}>Progress</th><th style={{padding:"8px 10px"}}></th></tr></thead>
            <tbody>{items.map(item=>{
              const isEditing=receiveModal?.id===item.id;
              const outstanding=item.qtyOrdered-item.qtyReceived;
              return <React.Fragment key={item.id}>
              <tr style={{borderBottom:isEditing?"none":"1px solid rgba(255,255,255,0.04)20"}}>
              <td style={{padding:"8px 10px",color:"#a3a3a3"}}>{item.description}</td>
              <td style={{padding:"8px 10px",color:"#c4c4c4"}}>{vendors.find(v=>v.id===item.vendor)?.name||"--"}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(item.qtyOrdered)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:item.qtyReceived>0?"#fbbf24":"#525252",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(item.qtyReceived)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600,color:outstanding>0?"#f87171":"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmtN(outstanding)}</td>
              <td style={{padding:"8px 10px"}}><div style={{width:80,margin:"0 auto"}}><Bar value={item.qtyReceived} max={item.qtyOrdered} color={item.qtyReceived>0?"#fbbf24":"#333333"} height={4}/></div></td>
              <td style={{padding:"8px 10px"}}>{outstanding>0?<div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>{isEditing?<Btn v="ghost" style={{fontSize:12,padding:"3px 8px",color:"#737373"}} onClick={e=>{e.stopPropagation();setReceiveModal(null);setReceiveQty("")}}>Cancel</Btn>:<Btn v="ghost" style={{fontSize:12,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();setReceiveModal(item);setReceiveQty(String(outstanding))}}>Receive</Btn>}<Btn v="secondary" style={{fontSize:12,padding:"3px 6px"}} onClick={e=>{e.stopPropagation();updateLineItem(item.id,{qtyReceived:item.qtyOrdered,deliveryDate:new Date().toISOString().split("T")[0]});notify("Complete")}}>Done</Btn></div>:<Badge label="complete" color="#34d399"/>}</td>
            </tr>
            {isEditing&&<tr style={{borderBottom:"1px solid rgba(255,255,255,0.04)20"}}><td colSpan={7} style={{padding:"8px 10px 12px"}}><div style={{display:"flex",gap:8,alignItems:"center",background:"#111",padding:"10px 12px",borderRadius:8,border:"1px solid #d9770630",flexWrap:"wrap"}}><span style={{fontSize:12,color:"#fbbf24",fontWeight:600,whiteSpace:"nowrap"}}>Receive:</span><span style={{fontSize:12,color:"#a3a3a3",whiteSpace:"nowrap"}}>{item.description?.slice(0,30)}</span><input type="number" value={receiveQty} onChange={e=>setReceiveQty(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleReceive(item)}} placeholder="Qty" min="1" max={outstanding} autoFocus style={{...inputStyle,width:70,padding:"4px 8px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace"}}/><Btn onClick={()=>handleReceive(item)} style={{fontSize:12,padding:"4px 12px"}}>Log</Btn><Btn v="secondary" style={{fontSize:12,padding:"4px 8px"}} onClick={()=>{setReceiveModal(null);setReceiveQty("")}}>Cancel</Btn></div></td></tr>}
            </React.Fragment>})}</tbody>
          </table>
          </div>
          {/* Mobile card layout */}
          <div className="show-mobile" style={{display:"flex",flexDirection:"column",gap:8}}>
            {items.map(item=>{
              const isEditing=receiveModal?.id===item.id;
              const outstanding=item.qtyOrdered-item.qtyReceived;
              const vendorName=vendors.find(v=>v.id===item.vendor)?.name||"";
              return <div key={item.id} style={{padding:"10px 12px",background:"#0a0a0a",borderRadius:8,border:"1px solid #1a1a1a"}}>
                <div style={{fontSize:12,color:"#e5e5e5",fontWeight:500,marginBottom:4,lineHeight:1.4}}>{item.description?.slice(0,80)}{item.description?.length>80?"...":""}</div>
                {vendorName&&<div style={{fontSize:11,color:"#737373",marginBottom:6}}>{vendorName}</div>}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                  <div style={{flex:1}}><Bar value={item.qtyReceived} max={item.qtyOrdered} color={item.qtyReceived>0?"#fbbf24":"#333"} height={4}/></div>
                  <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:outstanding>0?"#f87171":"#34d399",fontWeight:600,whiteSpace:"nowrap"}}>{fmtN(item.qtyReceived)}/{fmtN(item.qtyOrdered)}</span>
                </div>
                {isEditing?<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
                  <input type="number" value={receiveQty} onChange={e=>setReceiveQty(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleReceive(item)}} placeholder="Qty" min="1" max={outstanding} autoFocus style={{...inputStyle,width:60,padding:"6px 8px",textAlign:"center",fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}/>
                  <Btn onClick={()=>handleReceive(item)} style={{fontSize:12,padding:"6px 14px"}}>Log</Btn>
                  <Btn v="secondary" style={{fontSize:12,padding:"6px 10px"}} onClick={()=>{setReceiveModal(null);setReceiveQty("")}}>Cancel</Btn>
                </div>:outstanding>0?<div style={{display:"flex",gap:6,marginTop:4}}>
                  <Btn v="ghost" style={{fontSize:12,padding:"5px 12px",flex:1}} onClick={e=>{e.stopPropagation();setReceiveModal(item);setReceiveQty(String(outstanding))}}>Receive</Btn>
                  <Btn v="secondary" style={{fontSize:12,padding:"5px 10px"}} onClick={e=>{e.stopPropagation();updateLineItem(item.id,{qtyReceived:item.qtyOrdered,deliveryDate:new Date().toISOString().split("T")[0]});notify("Complete")}}>Done</Btn>
                </div>:<Badge label="complete" color="#34d399"/>}
              </div>})}
          </div>
        </div>}
      </Card>})}
    </>}
  </div>;
}


// ===============================================================
// DOCUMENTS -- Quotes, POs, Invoices, Commission Statements
// ===============================================================
function DocumentsPage({jobs,setJobs,lineItems,vendors,customers,reps,getJobItems,getJobFinancials,_commissionFor,updateJob,updateLineItem,notify,setPage,triggerPrint,pendingCommPreview,setPendingCommPreview,customSops,addSop,deleteSop,lineItemShipTos,setLineItemShipTo,...ctx}){
  const [tab,setTab]=useState("quotes");
  const [hiddenCols,setHiddenCols]=useState({netCost:true,netTotal:true,shippingEach:true,shippingTotal:true,installEach:true,installTotal:true});
  const [previewDoc,setPreviewDoc]=useState(null);
  const [isProforma,setIsProforma]=useState(false);
  // Advance Invoice flag -- set when generating a real customer invoice BEFORE items
  // are received from the vendor. Used for prepay/deposit scenarios (customer pays upfront,
  // goods ship later). The print template adds an "ADVANCE INVOICE" banner that clearly
  // signals to the customer they are being billed before shipment. Reported by Maureen
  // May 17 2026: a customer placed an order, prepaid, but vendor will not ship until June,
  // so the standard "receive items first" gate blocked the customer invoice generation.
  const [isAdvanceInvoice,setIsAdvanceInvoice]=useState(false);
  const [isCreditMemo,setIsCreditMemo]=useState(false);
  // Per-line qty overrides for the invoice preview. Keyed by line-item id, value is
  // the integer qty the user wants to invoice for this round. When present for a
  // given line, the override takes precedence over the system-suggested displayQty
  // EVERYWHERE: panel display, line items table, total, PDF export, email body, and
  // Mark All Invoiced (which bumps qtyInvoiced by the override amount, not by the
  // full received qty). Resets whenever previewDoc switches.
  const [lineOverrides,setLineOverrides]=useState({});
  // Set to true when the user clicks the new "Remaining Balance Invoice" button on
  // the Invoices job card. Drives stronger messaging in the Quantity Breakdown panel
  // (override fields highlighted, instructional text up top). Resets with previewDoc.
  const [isRemainingBalanceFlow,setIsRemainingBalanceFlow]=useState(false);
  const toggleCol=(col)=>{const next={...hiddenCols,[col]:!hiddenCols[col]};setHiddenCols(next);if(previewDoc?.job?.id){updateJob(previewDoc.job.id,{docStatuses:{...(previewDoc.job.docStatuses||{}),__qcv:next}})}};
  const allQuoteCols=[{key:"tag",label:"Tag"},{key:"manuf",label:"Manuf."},{key:"model",label:"Model #"},{key:"description",label:"Description"},{key:"color",label:"Color"},{key:"qty",label:"Qty"},{key:"netCost",label:"Net Cost"},{key:"netTotal",label:"Net Total"},{key:"shippingEach",label:"Shipping Each"},{key:"shippingTotal",label:"Shipping Total"},{key:"installEach",label:"Install Each"},{key:"installTotal",label:"Install Total"},{key:"unitPrice",label:"Your Price"},{key:"lineTotal",label:"Line Total"}];
  const projectNum=(jobId)=>{const sorted=[...jobs].sort((a,b)=>(a.createdDate||'').localeCompare(b.createdDate||'')||a.id.localeCompare(b.id));const idx=sorted.findIndex(j=>j.id===jobId);return 'MW-'+String(idx+1).padStart(4,'0')};
  useEffect(()=>{if(pendingCommPreview){setPreviewDoc(pendingCommPreview);setTab("preview");setPendingCommPreview(null)}},[pendingCommPreview]);
  // Whenever previewDoc changes (different doc opened, or preview closed), clear any
  // line-item qty overrides from the previous session so they cannot leak forward.
  // Also clear the remaining-balance flow flag unless it was set by the dedicated
  // button (which sets the flag AFTER setPreviewDoc, in the same React batch).
  useEffect(()=>{setLineOverrides({})},[previewDoc?.data?.docNum]);
  // Pick up Brain's generate_document request
  useEffect(()=>{
    if(window._brainDocTarget&&(Date.now()-window._brainDocTarget.timestamp)<5000){
      const t=window._brainDocTarget;window._brainDocTarget=null;
      const job=jobs.find(j=>j.id===t.jobId);if(!job)return;
      if(t.docType==="invoice"||t.docType==="invoices")setTab("invoices");
      else if(t.docType==="quote"||t.docType==="quotes")setTab("quotes");
      else if(t.docType==="po"||t.docType==="pos")setTab("pos");
    }
  },[]);


  // Search + rep filter for the four data tabs (quotes, POs, bills, invoices).
  // Identical pattern to the Deliveries page so the UX is consistent.
  // For sales-role users, repFilter is hidden because they're already scoped
  // to their own jobs by App-level visibleJobs filtering.
  const [docSearchQuery,setDocSearchQuery]=useState("");
  const [docRepFilter,setDocRepFilter]=useState("all");
  const [billDetail,setBillDetail]=useState(null);
  const [billInvNum,setBillInvNum]=useState('');
  const [billCheckNum,setBillCheckNum]=useState('');
  const [billPayDate,setBillPayDate]=useState('');
  const [billMemo,setBillMemo]=useState('');
  const [billSelected,setBillSelected]=useState(new Set());
  // New-payment form inputs (used in the Payment Trail card of the bill detail panel).
  // Pre-populated with the bill's current balance and today's date when the panel opens.
  // Names prefixed with billPay... to avoid collision with the unrelated Payment tab state
  // (payDate/payMemo/payAmt/etc) declared further down.
  const [billPayAmount,setBillPayAmount]=useState('');
  const [billPayInputDate,setBillPayInputDate]=useState('');
  const [billPayCheckInput,setBillPayCheckInput]=useState('');
  const [billPayMemoInput,setBillPayMemoInput]=useState('');
  // Per-payment vendor invoice number. A single PO can be filled by multiple
  // shipments, each with its own vendor invoice. Capturing the invoice number on
  // each payment turns the Payment Trail into a per-shipment ledger so each
  // shipment's invoice + check reconciles against the bank statement individually.
  // Reported by Maureen Jun 9 2026 (WB Mfg Mannheim Student Chairs split shipment).
  const [billPayInvInput,setBillPayInvInput]=useState('');
  // Vendor Credit / Standalone Bill modal: lets the user attach a credit or a
  // standalone bill (one not derived from a PO) to a project. Stored in
  // customSops with cat 'VendorCredit' or 'StandaloneBill'. Both flow through
  // getJobFinancials so cost/margin update everywhere automatically.
  // adjustMode is 'credit' or 'bill'. adjustEdit is the existing SOP id when
  // editing, null when creating.
  const [showAdjustModal,setShowAdjustModal]=useState(false);
  const [adjustMode,setAdjustMode]=useState('credit');
  const [adjustEdit,setAdjustEdit]=useState(null);
  const [adjustForm,setAdjustForm]=useState({vendorId:'',jobId:'',amount:'',creditDate:'',refNumber:'',memo:'',fileUrl:'',fileName:'',fileSize:0,uploadDate:''});
  // True while a file is uploading to Supabase storage for the credit/bill modal.
  // Disables Save + the Upload button so the user can't submit a half-uploaded record.
  const [adjustUploading,setAdjustUploading]=useState(false);
  // Expense Check modal state. Lets Maureen print a check directly for an expense
  // or reimbursement without first creating a vendor bill. Use cases: utility bills,
  // office supplies, one-off reimbursements, anything that doesn't need a bill
  // record on file. The check is rendered with the same template as printBatchCheck
  // and an ExpenseCheck SOP is written for audit trail so the check# is reserved
  // and the expense is queryable.
  const [showExpenseCheck,setShowExpenseCheck]=useState(false);
  const [expenseForm,setExpenseForm]=useState({payee:'',amount:'',memo:'',date:'',address:''});
  // Toggle for showing bills that have been marked deleted (docStatuses[billDocNum].deleted === true).
  // Off by default so the table stays clean. A "(N hidden)" counter appears even when off so the
  // user can discover and restore accidentally-deleted bills. Reported May 16 2026 -- a Doane Keyes
  // bill on G103 Furniture (BILL-6100-SUKI) had been deleted along with a mis-uploaded Deerfield HS
  // invoice. Without this toggle there was no way for the user to see or recover it from the UI.
  const [showDeletedBills,setShowDeletedBills]=useState(false);
  // Payment tab state
  const [payJob,setPayJob]=useState('');
  const [payDate,setPayDate]=useState(()=>new Date().toISOString().split('T')[0]);
  const [payRef,setPayRef]=useState('');
  const [payMethod,setPayMethod]=useState('check');
  const [payAmt,setPayAmt]=useState('');
  const [payDeposit,setPayDeposit]=useState('Operating Account');
  const [payMemo,setPayMemo]=useState('');
  const [payDocUrl,setPayDocUrl]=useState('');
  const [payDocName,setPayDocName]=useState('');
  const [paySelected,setPaySelected]=useState({});
  // Historical records state
  const [histSearch,setHistSearch]=useState('');
  const [histType,setHistType]=useState('all');
  const [histSort,setHistSort]=useState('date');
  const [histAdding,setHistAdding]=useState(null);
  const [histForm,setHistForm]=useState({type:'vendor_po',vendor:'',customer:'',docNumber:'',date:'',amount:'',job:'',description:'',notes:'',files:[]});
  const [histViewing,setHistViewing]=useState(null);
  const [histBulkCount,setHistBulkCount]=useState(0);
  const histFileRef=useRef(null);
  const histBulkRef=useRef(null);
  const histExcelRef=useRef(null);
  const histBulkExcelRef=useRef(null);
  const activeHidden=(previewDoc?.job?.docStatuses||{}).__qcv||previewDoc?.data?.hiddenCols||hiddenCols;const visibleCols=allQuoteCols.filter(c=>!activeHidden[c.key]);
  // Doc statuses stored IN each job record in Supabase -- persists across browsers, deploys, cache clears
  const allDocStatuses = jobs.reduce((acc, j) => ({...acc, ...(j.docStatuses || {})}), {});
  // Also load from sops table backup (cat="DocStatuses")
  const sopStatusRecord = (customSops||[]).find(s=>s.id==="DOC_STATUSES_GLOBAL");
  const sopStatuses = sopStatusRecord ? (()=>{try{return JSON.parse(sopStatusRecord.content)}catch{return {}}})() : {};
  // Also load from localStorage
  const lsFallback = (()=>{try{return JSON.parse(localStorage.getItem("mw_doc_statuses_fallback")||"{}")}catch{return {}}})();
  // Merge: sops backup overrides jobs, localStorage overrides sops
  const mergedDocStatuses = {...allDocStatuses, ...sopStatuses, ...lsFallback};
  const [localStatuses, setLocalStatuses] = useState({});
  const lsApprovals=(()=>{try{const a={};Object.keys(localStorage).filter(k=>k.startsWith("quote_approved_")).forEach(k=>{const dn=k.replace("quote_approved_","");if(dn)a[dn]="approved"});return a}catch{return {}}})();
  const docStatuses = {...mergedDocStatuses, ...localStatuses, ...lsApprovals};
  const setDocStatus = (docNum, status) => {
    // 1. Immediate UI
    setLocalStatuses(prev => ({...prev, [docNum]: status}));
    // 2. Save to sops table (guaranteed to work - same as tasks/notes)
    const allStatuses = {...mergedDocStatuses, ...localStatuses, [docNum]: status};
    const sopRecord = {id:"DOC_STATUSES_GLOBAL",title:"Document Statuses",cat:"DocStatuses",icon:"file",content:JSON.stringify(allStatuses),custom:true};
    // Use addSop which does upsert
    addSop(sopRecord);
    // 3. Also try to save on the job record
    const sn = (prefix, a, b) => prefix + (a||"").replace(/[^A-Z0-9]/gi,"").slice(-4).toUpperCase() + "-" + (b||"").replace(/[^A-Z0-9]/gi,"").slice(-4).toUpperCase();
    for (const j of jobs) {
      const nums = [sn("QT-",j.id,j.customer), sn("INV-",j.id,j.customer)];
      if (j.salesRep) nums.push(sn("COMM-",j.salesRep,"stmt"));
      const jItems = getJobItems ? getJobItems(j.id) : [];
      [...new Set(jItems.map(i=>i.vendor))].forEach(vid => nums.push(sn("PO-",j.id,vid)));
      if ((j.docStatuses||{})[docNum] !== undefined) nums.push(docNum);
      if (nums.includes(docNum) || nums.some(n => n.startsWith('PO-') && docNum.startsWith(n + '-S'))) {
        const newDS = {...(j.docStatuses||{}), [docNum]: status};
        setJobs(p => p.map(jj => jj.id === j.id ? {...jj, docStatuses: newDS} : jj));
        db.saveJob({...j, docStatuses: newDS});
        break;
      }
    }
    // 4. localStorage backup
    try { const fb = JSON.parse(localStorage.getItem("mw_doc_statuses_fallback") || "{}"); fb[docNum] = status; localStorage.setItem("mw_doc_statuses_fallback", JSON.stringify(fb)); } catch {}
    try{localStorage.removeItem("quote_approved_"+docNum)}catch{};
  };


  // Check for quote approvals from shared customer links
  useEffect(()=>{const check=()=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith("quote_approved_"));keys.forEach(k=>{const dn=k.replace("quote_approved_","");if(dn){setDocStatus(dn,"approved");localStorage.removeItem(k);notify("Quote "+dn+" approved by customer!")}})};check();const iv=setInterval(check,3000);return()=>clearInterval(iv)},[]);
  // Invoice PO selections - persist via docStatuses
  const getInvPOs = (invDocNum) => {
    const key = "invPO:" + invDocNum;
    const val = docStatuses[key];
    if (!val) return invPOSelect[invDocNum] || [];
    try { return JSON.parse(val); } catch { return []; }
  };
  const setInvPOs = (invDocNum, poNums) => {
    setInvPOSelect(prev => ({...prev, [invDocNum]: poNums}));
    setDocStatus("invPO:" + invDocNum, JSON.stringify(poNums));
  };
  const [emailModal,setEmailModal]=useState(null);const [emailBody,setEmailBody]=useState("");
  const [emailTo,setEmailTo]=useState("");
  const [stripeLoading,setStripeLoading]=useState(false);
  const [stripePayUrl,setStripePayUrl]=useState("");
  // emailFrom default: prefer the current user's real rep email (so Lisa sees
  // lmonchunski@mwfurnishings.com and Maureen sees mwelter@mwfurnishings.com
  // automatically). Falls back to a previously-typed value in localStorage ONLY
  // if it passes the same email format check the server uses -- this prevents
  // a previously-saved garbage value (e.g. "Lisa" from before this fix shipped)
  // from blocking the rep-derived auto-fill on every future use.
  const [emailFrom,setEmailFrom]=useState(()=>{
    // Mirror of the server's strict email-format regexes (api/send-email.js).
    // Accepts "user@host.tld" or "Name <user@host.tld>".
    const _isValid=(s)=>{
      if(!s)return false;
      const t=String(s).trim();
      if(!t)return false;
      const bare=/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
      const named=/^.+\s*<\s*[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\s*>$/;
      return bare.test(t)||named.test(t);
    };
    try{
      const stored=localStorage.getItem('mw_email_from')||"";
      // Stored value wins ONLY if it's well-formed. Garbage falls through.
      if(stored&&_isValid(stored))return stored;
      const cu=ctx.currentUser;
      if(cu&&cu.rep_id&&Array.isArray(reps)){
        const r=reps.find(x=>x.id===cu.rep_id);
        if(r&&r.email&&_isValid(r.email))return r.email;
      }
      return "";
    }catch{return ""}
  });
  const [emailSubject,setEmailSubject]=useState("");
  const [emailSending,setEmailSending]=useState(false);
  const [invPOSelect,setInvPOSelect]=useState({});


  const sendEmail = async () => {
    if(!emailTo||!emailSubject){notify("Enter recipient and subject","error");return}
    if(!emailFrom){notify("Enter a From email address","error");return}
    // Client-side format check so we surface the problem here instead of letting
    // Resend reject the entire send later. Accepts "user@host.tld" or
    // "Name <user@host.tld>" -- same formats the server (and Resend) accept.
    {
      const _ef=String(emailFrom).trim();
      const _bare=/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
      const _named=/^.+\s*<\s*[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\s*>$/;
      if(!_bare.test(_ef)&&!_named.test(_ef)){notify("From must be a valid email address (e.g. lisa@mwfurnishings.com)","error");return}
      // Validate To here too -- Resend rejects malformed recipients.
      const _et=String(emailTo).trim();
      if(!_bare.test(_et)&&!_named.test(_et)){notify("To must be a valid email address","error");return}
    }
    localStorage.setItem('mw_email_from',emailFrom);
    setEmailSending(true);
    try {
      const doc=emailModal;
      let wrapper;
      if(doc.type==="reminder"){
        // Payment reminder: simple plain-text style email, no document rendering
        const bodyHtml=(emailBody||'').split('\n').map(l=>l.trim()===''?'<br/>':'<p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">'+l.replace(/</g,'&lt;')+'</p>').join('');
        wrapper='<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:24px;text-align:left">'+bodyHtml+'</div>';
      } else {
        // Document email: use the SAME HTML as Export PDF so emails look identical to the PDF version
        const {html:docHtml,docTitle}=buildDocHtml(doc,true);
        // Build share link for quotes so customer can view/approve online
        let shareLinkBlock='';
        if(doc.type==="quote"){
          try{
            const shareData={docNum:doc.data.docNum,customer:doc.data.customer,items:doc.data.items,total:doc.data.total,projectNum:doc.data.projectNum,jobName:doc.job?.name,hiddenCols:doc.data.hiddenCols};
            const shareUrl=window.location.origin+window.location.pathname+'#quote='+btoa(JSON.stringify(shareData));
            shareLinkBlock='<p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">You can view and approve this quote online <a href="'+shareUrl+'" style="color:#0891b2;text-decoration:underline">here</a>.</p>';
          }catch(e){shareLinkBlock=''}
        }
        // For invoices, attach the Stripe payment link if one exists (either freshly created in this session, or saved on the job)
        let payLinkBlock='';
        if(doc.type==="invoice"){
          const savedStripeUrl=(doc.job?.docStatuses||{})[doc.data.docNum+"__stripe"]?.url;
          const payUrl=stripePayUrl||savedStripeUrl||'';
          if(payUrl){
            payLinkBlock='<p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">You can pay <a href="'+payUrl+'" style="color:#0891b2;text-decoration:underline">here</a>.</p>';
          }
        }
        const intro='<div style="font-family:Arial,sans-serif;padding:20px 24px 0;text-align:left"><p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">Hello,</p><p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 8px;text-align:left">Please see the '+docTitle.toLowerCase()+' below'+(doc.data.docNum?' ('+doc.data.docNum+')':'')+'. Let me know if you have any questions.</p>'+shareLinkBlock+payLinkBlock+'<p style="font-size:14px;color:#222;line-height:1.6;margin:0 0 16px;text-align:left">Thank you,<br/>Midwest Educational Furnishings</p><div style="height:1px;background:#e5e5e5;margin:8px 0 24px"></div></div>';
        wrapper='<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;text-align:left">'+intro+'<div style="padding:0 24px 24px;text-align:left">'+docHtml+'</div></div>';
      }
      const resp=await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:emailTo,from:emailFrom,subject:emailSubject,html:wrapper})});
      const data=await resp.json();
      if(resp.ok){notify("Email sent to "+emailTo);if(doc.data?.docNum)setDocStatus(doc.data.docNum,'sent');setEmailModal(null);setEmailTo("");setEmailSubject("");setEmailBody("")}
      else{notify("Email error: "+(data.error||"Failed"),"error")}
    }catch(e){notify("Network error: "+e.message,"error")}
    setEmailSending(false);
  };


  // Stable doc numbers -- same job+vendor always = same docNum, so statuses persist when you navigate away and back
  const stableNum = (prefix, a, b) => prefix + (a||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase() + '-' + (b||'').replace(/[^A-Z0-9]/gi,'').slice(-4).toUpperCase();


  const genPOs=job=>{const items=getJobItems(job.id);const _lst=lineItemShipTos||{};const groups={};items.forEach(i=>{const sv=_lst[i.id];const ship=(sv&&String(sv).trim())?sv:((i.shipTo&&String(i.shipTo).trim())?i.shipTo:'');const key=(i.vendor||'')+'||'+(ship||'');if(!groups[key])groups[key]={vid:i.vendor||'',shipTo:ship||'',items:[]};groups[key].items.push({...i,shipTo:ship||''})});return Object.values(groups).map(g=>{const sk=shipKey(g.shipTo);const docNum=sk?stableNum('PO-',job.id,g.vid)+'-S'+sk:stableNum('PO-',job.id,g.vid);return {vendor:vendors.find(v=>v.id===g.vid),items:g.items.map(i=>({...i,displayQty:i.qtyOrdered,displayPrice:i.unitCost})),total:g.items.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0),job,docNum,shipTo:g.shipTo}})};
  const genInvoice=(job,full)=>{const allItems=getJobItems(job.id);const _svc=i=>{const m=(i.modelNumber||'').trim();return /instal|labor|assembl/i.test(i.description||'')&&(m===''||/^(instal|labor|assembl|union|setup)/i.test(m));};const _allRecv=allItems.filter(i=>!_svc(i)).every(i=>(i.qtyReceived||0)>=(i.qtyOrdered||0));const _iq=i=>_svc(i)?(_allRecv?((i.qtyOrdered||0)-(i.qtyInvoiced||0)):0):((i.qtyReceived||0)-(i.qtyInvoiced||0));const items=full?allItems.filter(i=>i.qtyOrdered>0):allItems.filter(i=>_iq(i)>0);const isPartial=!full&&allItems.some(i=>!_svc(i)&&i.qtyOrdered>i.qtyReceived);const jobPONums=genPOs(job).map(po=>po.docNum);return {customer:customers.find(c=>c.id===job.customer),items:items.map(i=>({...i,displayQty:full?i.qtyOrdered:_iq(i),displayPrice:i.unitPrice})),total:items.reduce((s,i)=>s+i.unitPrice*(full?i.qtyOrdered:_iq(i)),0),job,docNum:stableNum('INV-',job.id,job.customer),isPartial,isFull:!!full,poNumbers:jobPONums}};
  const genQuote=job=>{const items=getJobItems(job.id);const customer=customers.find(c=>c.id===job.customer);const qvc=((job.docStatuses||{}).__qcv||{});const hc={netCost:true,netTotal:true,...qvc};return {customer,items:items.map(i=>({...i,displayQty:i.qtyOrdered,displayPrice:i.unitPrice})),total:items.reduce((s,i)=>s+(i.priceExtended&&i.priceExtended>0?i.priceExtended:(i.unitPrice||0)*i.qtyOrdered),0),job,docNum:stableNum('QT-',job.id,job.customer),projectNum:projectNum(job.id),hiddenCols:hc}};


  // Build the document HTML -- shared by handleExportPDF and sendEmail so they always look identical
  // When forEmail=true, use hosted logo URL instead of base64 (Gmail and other email clients strip inline base64 images)
  const buildDocHtml=(doc,forEmail)=>{
    const isQuote=doc.type==="quote";const isPO=doc.type==="po";const isInvoice=doc.type==="invoice";const isComm=doc.type==="commission";
    const logoSrc=forEmail?(window.location.origin+'/mw-logo.png'):MW_LOGO;
    const job=doc.job||{};const customer2=customers.find(c=>c.id===job.customer)||{};
    const terms=job.terms||"Net 30";const termDays=terms.includes("15")?15:terms.includes("Receipt")?0:30;
    const docDateKey=doc.data?.docNum||'';
    const overrideDate=docDateKey?docStatuses[docDateKey+'__date']||'':'';
    const overrideDue=docDateKey?docStatuses[docDateKey+'__due']||'':'';
    const baseDate=overrideDate?new Date(overrideDate+'T12:00:00'):new Date();
    const dueDate=overrideDue?new Date(overrideDue+'T12:00:00'):(()=>{const d=new Date(baseDate);d.setDate(d.getDate()+termDays);return d})();
    const fmtDate=d=>{if(!d)return"";const dt=new Date(d);return(dt.getMonth()+1)+"/"+dt.getDate()+"/"+dt.getFullYear()};
    const todayStr=fmtDate(baseDate);const dueDateStr=fmtDate(dueDate);
    const buildDesc=(i)=>{let d=i.modelNumber?i.modelNumber+"<br>":"";d+=(i.description||"").replace(/\n/g,"<br>");if(i.color)d+="<br>"+i.color;return d};
    const items=doc.data.items||[];
    const total=doc.data.total||0;
    const mwHdr='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px"><div><div style="font-weight:700;font-size:14px">Midwest Educational Furnishings, Inc.</div><div style="font-size:12px;color:#444;line-height:1.6">21191 N Valley Rd<br>Kildeer, IL 60047 US<br>(847) 847-1865</div></div><div><img src="'+logoSrc+'" style="height:48px" alt="Midwest Educational Furnishings"/></div></div>';
    let html="";
    if(isPO){
      const vendObj=doc.data.vendor||{};
      const rows=items.map(i=>'<tr><td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top">'+(i.tag||'')+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;white-space:pre-wrap">'+(buildDesc(i))+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+(i.displayQty||i.qtyOrdered)+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+fmt(i.displayPrice||i.unitCost)+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+fmt((i.displayQty||i.qtyOrdered)*(i.displayPrice||i.unitCost))+'</td></tr>').join('');
      html=mwHdr+'<div style="font-size:24px;font-weight:300;color:#888;letter-spacing:1;margin:24px 0 20px">Purchase Order</div><table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px"><tr><td style="width:38%;vertical-align:top;padding-right:24px"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">VENDOR</div><div style="font-size:13px;line-height:1.6">'+fmtAddrHtml(vendObj.name||'',vendObj.address||''+(vendObj.phone?'<br>'+vendObj.phone:''),'')+'</div></td><td style="width:38%;vertical-align:top;padding-right:24px"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">SHIP TO</div><div style="font-size:13px;line-height:1.6">'+fmtShipHtml(doc.data.shipTo||job.shipTo,customer2.name||'',customer2.address||'',customer2.contact||'')+'</div></td><td style="width:24%;vertical-align:top;text-align:right"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">P.O. NO.</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">'+(doc.data.docNum||'')+'</div><div style="font-size:12px;color:#888">Date: '+todayStr+'</div></td></tr></table>'+(job.shipVia?'<div style="margin-bottom:16px;padding:10px 14px;background:#fafafa;border-radius:6px"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">SHIP VIA</div><div style="font-size:13px">'+job.shipVia+'</div></div>':'')+'<div style="height:1px;background:#e5e5e5;margin-bottom:16px"></div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #e5e5e5"><th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;width:70px">TAG</th><th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">DESCRIPTION</th><th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;width:60px">QTY</th><th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;width:90px">RATE</th><th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;width:100px">AMOUNT</th></tr></thead><tbody>'+rows+'</tbody></table><table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:32px"><tr><td style="width:55%;vertical-align:top;padding-right:32px;font-size:12px;color:#888;white-space:pre-wrap">'+((job.notes||'').split('\n').filter(l=>!l.startsWith('TASK:')&&!l.startsWith('NOTE:')).join('\n').trim()||'')+'</td><td style="width:45%;vertical-align:top;text-align:right"><div style="font-size:13px;color:#888;margin-bottom:4px">SUBTOTAL<span style="margin-left:40px;color:#111">'+fmt(total)+'</span></div><div style="height:1px;background:#e5e5e5;margin:8px 0"></div><div style="font-size:18px;font-weight:700">TOTAL<span style="margin-left:40px">'+fmt(total)+'</span></div></td></tr></table>';
    } else if(isInvoice){
      const rows=items.map(i=>{const ship=i.shippingPerUnit||0;const inst=i.installPerUnit||0;return '<tr><td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;white-space:pre-wrap">'+(buildDesc(i))+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+(i.displayQty||i.qtyOrdered)+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+fmt(i.displayPrice||i.unitPrice)+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top">'+fmt((i.displayQty||i.qtyOrdered)*(i.displayPrice||i.unitPrice))+'</td></tr>'}).join('');
      html=mwHdr+(isProforma?'<div style="background:linear-gradient(135deg,#2e7d32,#4a7a4a);color:#fff;padding:10px 20px;border-radius:6px;text-align:center;font-size:15px;font-weight:700;letter-spacing:4px;margin-bottom:16px;text-transform:uppercase">PRO FORMA INVOICE -- FOR APPROVAL PURPOSES ONLY</div>':'')+(isAdvanceInvoice?'<div style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;padding:10px 20px;border-radius:6px;text-align:center;font-size:15px;font-weight:700;letter-spacing:4px;margin-bottom:16px;text-transform:uppercase">ADVANCE INVOICE -- ITEMS NOT YET SHIPPED</div>':'')+(isCreditMemo?'<div style="background:#c0392b;color:#fff;padding:10px 20px;border-radius:6px;text-align:center;font-size:15px;font-weight:700;letter-spacing:4px;margin-bottom:16px;text-transform:uppercase">CREDIT MEMO</div>':'')+'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div style="display:flex;gap:40px"><div><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">BILL TO</div><div style="font-size:13px;line-height:1.6">'+fmtAddrHtml(job.billTo||customer2.name||'',customer2.address||'',customer2.contact||'')+'</div></div><div><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">SHIP TO</div><div style="font-size:13px;line-height:1.6">'+fmtShipHtml(job.shipTo,customer2.name||'',customer2.address||'',customer2.contact||'')+'</div></div></div><div style="text-align:right"><div style="font-size:24px;font-weight:300;color:'+(isCreditMemo?'#c0392b':isProforma?'#2e7d32':isAdvanceInvoice?'#7c3aed':'#888')+';letter-spacing:1">'+(isCreditMemo?'Credit Memo':isProforma?'Pro Forma Invoice':isAdvanceInvoice?'Advance Invoice':'Invoice')+'</div><div style="font-size:14px;font-weight:600;margin-top:4px"> '+(doc.data.docNum||'')+'</div><div style="font-size:12px"><strong>DATE</strong> '+todayStr+'  <strong>TERMS</strong> '+terms+'</div><div style="font-size:12px;margin-top:4px;color:#2dd4bf"><strong>DUE DATE</strong> '+dueDateStr+'</div></div></div>'+(()=>{const poNums=[];if(job.poNumber)poNums.push('Customer PO: '+job.poNumber);const selPOs=getInvPOs(doc.data.docNum);selPOs.forEach(pn=>poNums.push(pn));return poNums.length>0?'<div style="margin:12px 0"><div style="font-weight:700;font-size:12px">P.O. NUMBER'+(poNums.length>1?'S':'')+'</div><div style="font-size:13px">'+poNums.join('<br>')+'</div></div>':''})()+'<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px"><thead><tr style="border-bottom:2px solid #e5e5e5"><th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">DESCRIPTION</th><th style="text-align:right;padding:8px;font-weight:600;color:#2dd4bf;width:60px">QTY</th><th style="text-align:right;padding:8px;font-weight:600;color:#2dd4bf;width:90px">RATE</th><th style="text-align:right;padding:8px;font-weight:600;color:#2dd4bf;width:100px">AMOUNT</th></tr></thead><tbody>'+rows+'</tbody></table><div style="margin-top:24px;text-align:right"><div style="font-size:13px;color:#666;margin-bottom:8px">Thank you for your business!</div><div style="font-size:13px;margin-bottom:4px">SUBTOTAL<span style="margin-left:40px">'+fmt(total)+'</span></div><div style="font-size:18px;font-weight:700;border-top:2px solid #e5e5e5;padding-top:8px;margin-top:8px;font-weight:700">'+(isCreditMemo?'TOTAL CREDIT':'TOTAL DUE')+'<span style="margin-left:40px;color:'+(isCreditMemo?'#e74c3c':'#111')+'">'+fmt(total)+'</span></div></div>';
    } else if(isQuote){try{
      const pdfHC2=(job.docStatuses||{}).__qcv||{};
      const qC=[{k:"tag",l:"TAG",a:"left"},{k:"manuf",l:"MANUF.",a:"left"},{k:"model",l:"MODEL #",a:"left"},{k:"description",l:"DESCRIPTION",a:"left"},{k:"color",l:"COLOR",a:"left"},{k:"qty",l:"QTY",a:"right"},{k:"netCost",l:"NET COST",a:"right"},{k:"netTotal",l:"NET TOTAL",a:"right"},{k:"shippingEach",l:"SHIPPING EACH",a:"right"},{k:"shippingTotal",l:"SHIPPING TOTAL",a:"right"},{k:"installEach",l:"INSTALL EACH",a:"right"},{k:"installTotal",l:"INSTALL TOTAL",a:"right"},{k:"unitPrice",l:"YOUR PRICE",a:"right"},{k:"lineTotal",l:"LINE TOTAL",a:"right"}].filter(c=>!pdfHC2[c.k]);
      const qH=qC.map(c=>'<th style="text-align:'+c.a+';padding:6px;font-weight:600;color:#2dd4bf">'+c.l+'</th>').join('');
      const qR=items.map(i=>{const ship=i.shippingPerUnit||0;const inst=i.installPerUnit||0;const qty=i.displayQty||i.qtyOrdered||0;const price=i.displayPrice||i.unitPrice||0;const lt=i.priceExtended&&i.priceExtended>0?i.priceExtended:(price)*qty;const v={tag:i.tag||"",manuf:i.manufacturer||"",model:i.modelNumber||"",description:(i.description||"").replace(/\n/g,"<br>"),color:i.color||"",qty:qty,netCost:"$"+(i.unitCost||0).toFixed(2),netTotal:"$"+((i.unitCost||0)*qty).toFixed(2),shippingEach:ship>0?"$"+ship.toFixed(2):"",shippingTotal:ship>0?"$"+(ship*qty).toFixed(2):"",installEach:inst>0?"$"+inst.toFixed(2):"",installTotal:inst>0?"$"+(inst*qty).toFixed(2):"",unitPrice:"$"+(price).toFixed(2),lineTotal:"$"+lt.toFixed(2)};return '<tr>'+qC.map(c=>'<td style="padding:6px;border-bottom:1px solid #eee;text-align:'+c.a+';'+(c.k==="lineTotal"?"font-weight:600;":"")+'">'+v[c.k]+'</td>').join('')+'</tr>'}).join('');
      html=mwHdr+'<div style="text-align:'+(forEmail?'left':'center')+';margin:12px 0 20px"><div style="font-size:12px;color:#666">Designing Spaces | Building Futures | WBE Certified Enterprise</div></div><div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12px;text-transform:uppercase;margin-bottom:4px">PREPARED FOR</div><div style="font-size:13px;line-height:1.6">'+fmtAddrHtml(job.billTo||customer2.name||'',customer2.address||'',customer2.contact||'')+'</div></div><div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">SHIP TO</div><div style="font-size:13px;line-height:1.6">'+fmtShipHtml(job.shipTo,customer2.name||'',customer2.address||'',customer2.contact||'')+'</div></div><div style="text-align:right;flex-shrink:0;max-width:220px"><div style="font-size:22px;font-weight:700;margin-bottom:4px">QUOTE</div><div style="font-size:13px">'+(doc.data.docNum||'')+'</div><div style="font-size:13px;margin-top:4px">Date: '+todayStr+'</div><div style="font-size:11px;word-wrap:break-word">Project: '+(projectNum?.(job.id)||'')+ ' '+job.name+'</div>'+(job.poNumber?'<div style="font-size:13px">PO#: '+job.poNumber+'</div>':'')+'</div></div><table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:16px"><thead><tr style="border-bottom:2px solid #222">'+qH+'</tr></thead><tbody>'+qR+'</tbody></table><div style="margin-top:16px;text-align:right;font-size:16px;font-weight:700">TOTAL: '+fmt(total)+'</div>'+(job.shipVia?'<div style="margin-top:8px;font-size:12px;color:#666"><strong>Ship Via:</strong> '+job.shipVia+'</div>':'')+'<div style="margin-top:24px;padding:16px;background:#f9f8f6;border-radius:8px;font-size:12px;color:#666"><strong>Terms:</strong> Quote valid for 30 days. Prices subject to manufacturer availability.</div>';
    }catch(e){console.error('Quote PDF error:',e);html='<div style="padding:40px;text-align:center;color:#c00">Quote rendering error: '+e.message+'</div>'}} else {
      const rep=doc.data.rep||{};const commJobs=jobs.filter(j=>j.salesRep===rep.id);
      // Commission paid on PROFIT (revenue - cost), not revenue. Statement shows the
      // Profit column instead of Revenue so the rep can audit the math line by line.
      const paidProfit=commJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>{const f=getJobFinancials(j.id);return s+Math.max(0,(f.totalRevenue||0)-(f.totalCost||0))},0);
      const paidComm=paidProfit*(rep.commissionRate||0);const unpaidComm=total-paidComm;
      const rows=commJobs.map(j=>{const f=getJobFinancials(j.id);const cust=customers.find(c=>c.id===j.customer);const isPaid=j.paymentStatus==="paid";const profit=Math.max(0,(f.totalRevenue||0)-(f.totalCost||0));const comm=profit*(rep.commissionRate||0);return '<tr><td style="padding:10px 8px;border-bottom:1px solid #eee">'+(j.name||'')+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee">'+(cust?.name||'')+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">'+fmt(profit)+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;color:'+(isPaid?'#059669':'#d97706')+'">'+(isPaid?'PAID':'PENDING')+'</td><td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">'+fmt(comm)+'</td></tr>'}).join('');
      html=mwHdr+'<div style="font-size:24px;font-weight:300;color:#888;letter-spacing:1;margin:24px 0 20px">Commission Statement</div><div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">SALES REP</div><div style="font-size:16px;font-weight:700">'+(rep.name||'')+'</div><div style="font-size:13px;color:#888">'+(rep.territory||'')+'</div><div style="font-size:13px;color:#888">Rate: '+(rep.commissionRate?((rep.commissionRate*100).toFixed(1)):'0')+'% of job profit</div></div><div style="text-align:right"><div style="font-size:12px;color:#888">Date: '+todayStr+'</div><div style="font-size:12px;color:#888">Period: Current</div>'+(doc.data.docNum?'<div style="font-size:12px;color:#888">Ref: '+doc.data.docNum+'</div>':'')+'</div></div><div style="display:flex;gap:24px;margin-bottom:24px"><div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888;text-transform:uppercase">Earned (Paid)</div><div style="font-size:18px;font-weight:700;color:#059669">'+fmt(paidComm)+'</div></div><div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888;text-transform:uppercase">Pending</div><div style="font-size:18px;font-weight:700;color:#d97706">'+fmt(unpaidComm)+'</div></div><div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888;text-transform:uppercase">Total Commission</div><div style="font-size:18px;font-weight:700">'+fmt(total)+'</div></div></div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:2px solid #e5e5e5"><th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">Job</th><th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">Customer</th><th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">Profit</th><th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">Status</th><th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px">Commission</th></tr></thead><tbody>'+rows+'</tbody></table><div style="margin-top:16px;text-align:right;border-top:2px solid #e5e5e5;padding-top:12px"><div style="font-size:18px;font-weight:700">TOTAL COMMISSION: '+fmt(total)+'</div></div>';
    }
    const docTitle=isPO?"Purchase Order":isInvoice?(isCreditMemo?"Credit Memo":isProforma?"Proforma Invoice":isAdvanceInvoice?"Advance Invoice":"Invoice"):isQuote?"Quote":"Commission Statement";
    return {html,docTitle,job};
  };


  const handleExportPDF=(doc)=>{
    const {html,docTitle,job}=buildDocHtml(doc);
    triggerPrint(docTitle+" - "+(doc.data.docNum||job.name||""),html);
    if(doc.data.docNum && !docStatuses[doc.data.docNum]) setDocStatus(doc.data.docNum,'drafted');
  };


;


  const StatusBadge=({docNum})=>{const s=docStatuses[docNum];if(!s)return <Badge label="new" color="#525252"/>;if(s==="drafted")return <Badge label="drafted" color="#fbbf24"/>;if(s==="sent")return <Badge label="sent" color="#34d399"/>;if(s==="approved")return <Badge label="approved" color="#a78bfa"/>;return <Badge label={s} color="#525252"/>};


  // Document stats
  const totalQuotes=jobs.length;
  const totalPOs=jobs.reduce((s,j)=>{const items=getJobItems(j.id);const groups={};items.forEach(i=>{groups[i.vendor]=true});return s+Object.keys(groups).length},0);
  const pendingInvJobs=jobs.filter(j=>getJobItems(j.id).some(i=>i.qtyReceived>i.qtyInvoiced));
  const fullyInvoicedJobs=jobs.filter(j=>{const items=getJobItems(j.id);return items.length>0&&items.every(i=>i.qtyInvoiced>=i.qtyOrdered)});


  // Apply search + rep filter to the master jobs list. All four data tabs
  // (quotes, POs, bills, invoices) iterate over filteredJobs instead of jobs.
  // Sales-role users are already pre-filtered by App-level visibleJobs.
  const docIsSalesRole = ctx.userRole === "sales";
  const _docJobNum = ctx.jobNum;
  const filteredJobs = jobs.filter(j => {
    if (docRepFilter !== "all" && j.salesRep !== docRepFilter) return false;
    if (docSearchQuery) {
      const q = docSearchQuery.toLowerCase();
      const nameMatch = (j.name || "").toLowerCase().includes(q);
      const numMatch = _docJobNum ? (_docJobNum(j.id) || "").toLowerCase().includes(q) : false;
      const custMatch = ((customers.find(c => c.id === j.customer) || {}).name || "").toLowerCase().includes(q);
      if (!nameMatch && !numMatch && !custMatch) return false;
    }
    return true;
  });
  // Tab badge counts derived from filteredJobs so the numbers match what's shown
  // when a search or rep filter is active. Matches Deliveries page KPI behavior.
  const filteredTotalQuotes = filteredJobs.length;
  const filteredTotalPOs = filteredJobs.reduce((s,j)=>{const items=getJobItems(j.id);const groups={};items.forEach(i=>{groups[i.vendor]=true});return s+Object.keys(groups).length},0);
  const filteredPendingInvJobs = filteredJobs.filter(j=>getJobItems(j.id).some(i=>i.qtyReceived>i.qtyInvoiced));
  const filteredOpenPayJobs = filteredJobs.filter(j=>j.paymentStatus!=="paid");
  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Documents" sub="Quotes, Purchase Orders, Invoices"/>
    <div style={{display:"flex",gap:0,alignItems:"center",marginBottom:16,padding:"10px 16px",background:"#111111",borderRadius:8,fontSize:12,overflowX:"auto",WebkitOverflowScrolling:"touch",color:"#a3a3a3"}}><span style={{color:"#2dd4bf",fontWeight:600}}>Workflow:</span><span style={{margin:"0 8px"}}>Quote</span><span style={{color:"#8a8a8a"}}>&rarr;</span><span style={{margin:"0 8px",color:"#2dd4bf"}}>Approve/Send</span><span style={{color:"#8a8a8a"}}>&rarr;</span><span style={{margin:"0 8px"}}>Purchase Orders</span><span style={{color:"#8a8a8a"}}>&rarr;</span><span style={{margin:"0 8px"}}>Draft/Send</span><span style={{color:"#8a8a8a"}}>&rarr;</span><span style={{margin:"0 8px"}}>Invoices</span><span style={{color:"#8a8a8a"}}>&rarr;</span><span style={{margin:"0 8px",color:"#34d399"}}>Mark Paid</span></div>


    <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
      <input type="text" value={docSearchQuery} onChange={e=>setDocSearchQuery(e.target.value)} placeholder="Search by job name, number, or customer..." style={{padding:"8px 12px",background:"#0a0a0a",border:"1px solid #222",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",minWidth:240,flex:"0 1 280px"}}/>
      {!docIsSalesRole&&reps&&reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).length>0&&<select value={docRepFilter} onChange={e=>setDocRepFilter(e.target.value)} style={{padding:"8px 12px",background:"#0a0a0a",border:"1px solid #222",borderRadius:8,color:"#f0f0f0",fontSize:12,fontFamily:"inherit",cursor:"pointer",minWidth:170}}><option value="all">All Sales Reps</option>{reps.filter(r=>!r.id.includes("SEED_FLAG")&&isSalesRep(r)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}
      {(docSearchQuery||docRepFilter!=="all")&&<button onClick={()=>{setDocSearchQuery("");setDocRepFilter("all")}} style={{padding:"6px 12px",background:"transparent",border:"1px solid #333",borderRadius:8,color:"#a3a3a3",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:600}} title="Clear search and filters">Clear</button>}
    </div>


    <div className="doc-tabs" style={{display:"flex",gap:0,marginBottom:20,background:"#111111",borderRadius:12,padding:3,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {[["quotes","Quotes",filteredTotalQuotes,"#2dd4bf"],["pos","Purchase Orders",filteredTotalPOs,"#a78bfa"],["bills","Vendor Bills",filteredTotalPOs,"#f97316"],["invoices","Invoices",filteredPendingInvJobs.length+" pending","#fbbf24"],["payments","Payments",filteredOpenPayJobs.length+" open","#34d399"]].map(([id,label,count,color])=>
        <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"14px 12px",borderRadius:8,border:"none",cursor:"pointer",background:tab===id?color+"18":"transparent",color:tab===id?color:"#a3a3a3",fontSize:13,fontWeight:tab===id?700:400,fontFamily:"inherit",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <span>{label}</span>
          <span style={{fontSize:18,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
        </button>
      )}
    </div>


    {(docSearchQuery||docRepFilter!=="all")&&filteredJobs.length===0&&tab!=="preview"&&tab!=="payments"&&<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:16,color:"#34d399",fontWeight:600,marginBottom:4}}>No matching jobs</div><div style={{fontSize:13,color:"#a3a3a3"}}>Try a different search term or rep filter.</div></Card>}

    {tab==="quotes"&&<div>{filteredJobs.map(job=>{const q=genQuote(job);const customer=customers.find(c=>c.id===job.customer);return <Card key={job.id} style={{marginBottom:10,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:180}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5"}}>{job.name}</span><Badge label={job.phase} color={statusColor(job.phase)}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>{customer?.name} - <span style={{fontFamily:"'JetBrains Mono',monospace",color:"#2dd4bf"}}>{q.projectNum}</span> - {q.items.length} items - {fmt(q.total)}</div></div><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><StatusBadge docNum={q.docNum}/>{docStatuses[q.docNum]==="approved"&&<span style={{fontSize:11,color:"#34d399",padding:"2px 8px",background:"#34d39910",borderRadius:6}}>POs unlocked</span>}<Btn style={{fontSize:12,padding:"6px 12px"}} onClick={()=>{setPreviewDoc({type:"quote",data:q,job});setTab("preview")}}><I n="file" s={12}/> Quote</Btn></div></div></Card>})}</div>}


    {tab==="pos"&&<div>{filteredJobs.map(job=>{const pos=genPOs(job);if(pos.length===0)return null;const quoteDocNum=stableNum('QT-',job.id,job.customer);const quoteStatus=docStatuses[quoteDocNum];const quoteApproved=quoteStatus==="approved"||quoteStatus==="sent";return <Card key={job.id} style={{marginBottom:12,opacity:quoteApproved?1:0.6}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:11,marginRight:6}}>{projectNum(job.id)}</span>{job.name}</span><span style={{fontSize:12,color:"#a3a3a3",marginLeft:8}}>{pos.length} vendor POs - {fmt(pos.reduce((s,p)=>s+p.total,0))}</span>{!quoteApproved&&<span style={{fontSize:12,color:"#fbbf24",marginLeft:8}}>Quote must be approved or sent first</span>}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>{pos.map((po,i)=><div key={i} onClick={()=>{if(!quoteApproved){notify("Approve or send the quote for this job before creating POs","error");return}setPreviewDoc({type:"po",data:po,job});setTab("preview")}} style={{padding:14,background:"#1a1a1a",borderRadius:8,border:"1px solid #222222",cursor:"pointer",transition:"border 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#2dd4bf44"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.04)"}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:"#d4d4d4"}}>{po.vendor?.name}</span><StatusBadge docNum={po.docNum}/></div>{po.shipTo&&<div style={{marginTop:2,marginBottom:4,padding:"3px 6px",background:"rgba(167,139,250,0.10)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:4,fontSize:10,color:"#a78bfa",fontWeight:500,display:"inline-block",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={po.shipTo}>Ship: {(po.shipTo||"").split("\n")[0].slice(0,32)}{(po.shipTo||"").length>32?"...":""}</div>}<div style={{fontSize:12,color:"#a3a3a3"}}>{po.items.length} items</div><div style={{fontSize:16,fontWeight:700,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{fmt(po.total)}</div></div>)}</div></Card>})}</div>}


    {tab==="bills"&&(()=>{
      // Build vendor bills from PO data. Use genPOs so each (vendor, shipTo)
      // group becomes its own bill -- consistent with the POs tab.
      const allBills=[];
      // Guard against absurd/out-of-range dates. A bad due-date override that still
      // PARSES to a valid Date (e.g. "0002-02-12" -> year 2 AD) slips past an isNaN
      // check and yields a daysUntil of ~-739000, rendering as "Overdue 739221 days
      // ago". Treat a date as usable only if it is a real Date within a sane calendar
      // window; otherwise callers fall back to a sensible default. Reported by Maureen
      // Jul 2 2026 (PO-6108-TMF1 showing "Overdue 739221 days ago").
      const _yrOK=(dt)=>!!dt&&!isNaN(dt.getTime())&&dt.getFullYear()>=2000&&dt.getFullYear()<=2100;
      // PAYMENT HISTORY HELPERS
      // -----------------------
      // Bills used to track a single payment via flat fields {paid,payDate,checkNum,memo}.
      // That broke when a bill grew over time -- e.g. Maureen's McCourt bill where a
      // partial shipment was paid for, then the rest of the order arrived and pushed
      // the bill amount higher. The old model couldn't represent "I paid $X with check
      // #A on date 1, then $Y with check #B on date 2" -- it just showed one check for
      // the full final amount, breaking reconciliation against bank statements.
      //
      // New model: payments:[{date,amount,checkNum,memo,method,isLegacy?}]. Each shipment
      // payment is its own entry. totalPaid sums them; balance = cost - totalPaid; paid
      // is fully-settled when totalPaid >= cost (penny tolerance). When a payment was
      // recorded under the old model, _getBillPayments synthesizes a single legacy entry
      // (amount = bill cost AT MIGRATION TIME, which may be wrong for grown bills --
      // the user can edit that amount in the detail panel to correct the historical record).
      const _getBillPayments = (billData, billCost) => {
        if (Array.isArray(billData?.payments)) return billData.payments;
        if ((billData?.paid || billData?.checkNum || billData?.payDate) && billData?.status !== 'unpaid' && billData?.status !== 'void') {
          // Legacy single-payment bill. Synthesize one entry with amount = current cost.
          // Marked isLegacy:true so the UI can offer an "Edit" affordance to correct it.
          return [{
            date: billData.payDate || '',
            amount: Number(billCost)||0,
            checkNum: billData.checkNum || '',
            memo: billData.memo || '',
            method: 'legacy',
            isLegacy: true
          }];
        }
        return [];
      };
      const _sumPayments = (payments) =>
        (payments||[]).reduce((s,p) => s + (Number(p.amount)||0), 0);
      // Counter for bills that have been marked deleted. Incremented inside the loop
      // regardless of whether the "Show deleted bills" toggle is on, so the user can
      // always see how many hidden bills exist in the "Show deleted (N)" pill.
      let deletedBillsCount=0;
      filteredJobs.forEach(job=>{
        const jobPOs=genPOs(job);
        jobPOs.forEach(po=>{
          const vid=po.vendor?.id||'unknown';
          const v=po.vendor;
          const poDocNum=po.docNum;
          const poStatus=docStatuses[poDocNum];
          // Show this PO's bill if EITHER:
          //   (a) the user explicitly drafted/sent the PO (poStatus !== 'new'), OR
          //   (b) any item on this PO has been received (qtyReceived > 0).
          // Rationale: when a sales rep enters a job, approves the quote, and then
          // receives items via Delivery Tracker, the underlying PO is never explicitly
          // "drafted" through the PO preview screen -- so docStatuses[poDocNum] stays
          // undefined and the bill never appears, even though the vendor has clearly
          // shipped and is owed money. Receiving items is itself proof that the PO
          // went out and a bill is due. Reported by Maureen May 13 2026 for the
          // Global Furniture Group and Doane Keyes bills on the Global-Bookcase &
          // Double Pedestal Desk and G103 Furniture jobs.
          const anyReceived=(po.items||[]).some(i=>(Number(i.qtyReceived)||0)>0);
          const isPoActive=poStatus&&poStatus!=="new";
          if(!isPoActive&&!anyReceived)return;
          const vItems=po.items;
          // Bill amount reflects what's been RECEIVED, not what's been ordered. Vendors
          // invoice on shipment, so a partial delivery means a partial bill. Reported by
          // Maureen May 21 2026 for the McCourt bill on the McCourt Series 5 Folding
          // Chairs job: bill was showing full $4,678 PO total but only some chairs had
          // arrived. The Delivery Tracker had the correct received counts; the bill
          // just wasn't reading from them. With this change, as items are received via
          // Delivery Tracker the bill amount climbs to match -- no manual override needed.
          const cost=vItems.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyReceived)||0),0);
          // orderValue = the full PO commitment (unitCost * qtyOrdered). Surfaced on the
          // bill object so any UI that wants to show "currently owed $X of $Y total" has
          // access to both numbers. Also drives the structurally-empty PO guard below.
          const orderValue=vItems.reduce((s,i)=>s+(i.unitCost||0)*(Number(i.qtyOrdered)||0),0);
          // Skip ONLY structurally-empty POs (no value committed at all). A PO with
          // value committed but nothing yet received is a legitimate bill that should
          // appear with $0 currently owed -- the user can see the bill exists, watch
          // it climb as items arrive, and pay when ready.
          if(orderValue<=0)return;
          const poDate=vItems[0]?.poDate||job.createdDate||'';
          const billDocNum='BILL-'+poDocNum.replace('PO-','');
          const billDateOverride=docStatuses[billDocNum+'__date']||'';
          const billDueOverride=docStatuses[billDocNum+'__due']||'';
          // Defensive date parsing -- a malformed override (e.g. user typo producing
          // "22026-03-28" or "0002-02-12") would otherwise yield an Invalid Date, and
          // dueDate2.toISOString() at the bottom of this block would throw RangeError,
          // crashing the entire Vendor Bills tab. Validate via isNaN(getTime()) and
          // fall back to sensible defaults when bad. Caused the "App Error: RangeError:
          // Invalid time value" reported May 12 2026 when bill BILL-6095-YTXI had a
          // typo in its due date.
          let baseBillDate=billDateOverride?new Date(billDateOverride+'T12:00:00'):(poDate?new Date(poDate):new Date());
          if(!_yrOK(baseBillDate)){const _pd=poDate?new Date(poDate):null;baseBillDate=_yrOK(_pd)?_pd:new Date();}
          let dueDate2=billDueOverride?new Date(billDueOverride+'T12:00:00'):new Date(baseBillDate.getTime()+30*86400000);
          if(!_yrOK(dueDate2))dueDate2=new Date(baseBillDate.getTime()+30*86400000);
          // Final guard: even after the fallback, if something pathological remains,
          // produce an empty string rather than crash. _safeDueDateStr captures that.
          let _safeDueDateStr='';
          try{_safeDueDateStr=dueDate2.toISOString().split('T')[0]}catch(_e){_safeDueDateStr=''}
          const now2=new Date();const daysUntil=isNaN(dueDate2.getTime())?0:Math.floor((dueDate2-now2)/86400000);
          const billData=typeof docStatuses[billDocNum]==='object'?docStatuses[billDocNum]:{};
          // Skip bills that have been deleted by the user UNLESS the user has explicitly
          // toggled "Show deleted bills" via the bills tab header. The deleted flag is set
          // via the Delete button in the bill detail view. When hidden, the bill is also
          // excluded from totals (Total Owed, Overdue, etc.) so the numbers reflect what
          // the user sees. When shown, the bill appears with a red DELETED badge and a
          // Restore button that clears the flag. The underlying PO and line items are
          // always untouched -- only the bill's docStatuses entry is marked deleted, which
          // preserves prior payment data should the bill ever need to be restored.
          if(billData.deleted===true){
            deletedBillsCount++;
            if(!showDeletedBills)return;
          }
          // Payment history model. See _getBillPayments comment block above. _isFullyPaid
          // is derived from sum(payments) >= cost (penny tolerance); legacy bills
          // synthesize a single payment entry on first read so they slot into this model
          // cleanly. _isPartiallyPaid means: at least one payment recorded, but balance > 0.
          const _payments = _getBillPayments(billData, cost);
          const _totalPaid = _sumPayments(_payments);
          const _balance = Math.max(0, cost - _totalPaid);
          // A bill with $0 currently owed (nothing received yet) is NOT "paid" -- it's just
          // empty. The old test `_totalPaid >= cost - 0.005` was true whenever cost==0
          // (0 >= -0.005), so every not-yet-received PO showed as Paid, and manually
          // marking it Unpaid reverted because this derived flag overrode the status.
          // Fully paid now requires a real balance (cost>0) that payments actually cover.
          // Reported by Maureen Jul 2 2026 (Pegasus bills showing paid though never
          // entered in AIOS and never paid).
          const _isFullyPaid = cost > 0.005 && _totalPaid >= cost - 0.005;
          const _isPartiallyPaid = _totalPaid > 0.005 && !_isFullyPaid;
          // Explicit user status is authoritative: void OR unpaid force not-paid (so a
          // manual "Unpaid" sticks and never reverts to paid), explicit paid forces paid;
          // otherwise fall back to the derived fully-paid test above.
          const paid = (billData.status==='void'||billData.status==='unpaid') ? false : (billData.status==='paid' ? true : _isFullyPaid);
          const isVoidBill=billData.status==='void';
          const isCredit=billData.isCredit||false;
          // creditAmount: when isCredit is true, the dollar amount of credit applied. Defaults
          // to the full bill cost (full credit). When set to less than cost, represents a partial
          // credit (e.g., vendor credited only part of the bill, rest still owed).
          // Clamp to [0, cost] to prevent malformed input from breaking totalOwed calculations.
          const _credRaw=(billData.creditAmount!==undefined&&billData.creditAmount!==null&&billData.creditAmount!=='')?Number(billData.creditAmount):cost;
          const _credAmt=isNaN(_credRaw)?cost:Math.max(0,Math.min(cost,_credRaw));
          // _lastPay surfaces the most recent payment's metadata as the display defaults
          // (checkNum, payDate, memo). Maintains compatibility with all the existing UI
          // surfaces that read bill.checkNum / bill.payDate. The Payment Trail card shows
          // the full history; everywhere else continues to show "the latest payment".
          const _lastPay = _payments.length > 0 ? _payments[_payments.length-1] : null;
          allBills.push({job,vendor:v,vendorId:vid,vendorName:v?.name||'Unknown',items:vItems,cost,orderValue,poDocNum,billDocNum,poDate,
            dueDate:_safeDueDateStr,daysUntil,paid,voided:isVoidBill,itemCount:vItems.length,entered:!!(billData.status||billData.vendorInvNum||(_payments&&_payments.length>0)),
            vendorInvNum:billData.vendorInvNum||'',
            checkNum:_lastPay?.checkNum||billData.checkNum||'',
            payDate:_lastPay?.date||billData.payDate||'',
            memo:_lastPay?.memo||billData.memo||'',
            checkPrinted:billData.checkPrinted||'',isCredit:billData.isCredit||false,creditAmount:_credAmt,
            payments:_payments, totalPaid:_totalPaid, balance:_balance, isPartiallyPaid:_isPartiallyPaid,
            _isDeleted:billData.deleted===true});
        });
      });
      // Inject standalone Vendor Credits and standalone Vendor Bills from
      // customSops. These are NOT derived from a PO -- the user created them
      // ad-hoc via the "+ New Vendor Credit" / "+ New Vendor Bill" buttons and
      // attached them to a project. They participate in totalOwed exactly like
      // the PO-derived bills, and their amount also flows through
      // getJobFinancials so cost/margin update across the whole app.
      // Shape: each SOP has cat 'VendorCredit' or 'StandaloneBill' and content
      // JSON { vendorId, vendorName, jobId, jobName, amount, creditDate,
      // refNumber, memo, paid, payDate, checkNum }.
      try {
        (customSops || []).forEach(s => {
          if (!s || (s.cat !== 'VendorCredit' && s.cat !== 'StandaloneBill')) return;
          let d = null;
          try { d = JSON.parse(s.content || '{}'); } catch { return; }
          if (!d) return;
          // No-project bills (jobId is '' or missing) are surfaced with a sentinel job
          // object so they show in the Vendor Bills tab and can be paid like any other
          // bill. They don't appear in any project's financials (getJobFinancials skips
          // them since d.jobId !== jobId for every real jobId). These are pure expenses
          // -- think utility bills, office rent, reimbursements, anything not tied to
          // a customer job. Sales-role users don't see them (no project membership).
          const hasProject = d.jobId && d.jobId !== '';
          let job2;
          if (hasProject) {
            job2 = jobs.find(j => j.id === d.jobId);
            if (!job2) return;
            // Respect the same filters the PO-derived loop respects: rep filter
            // (sales-role users only see their own jobs via filteredJobs) and
            // search query. Use indexOf into filteredJobs as the filter membership
            // check so this works regardless of the filter logic upstream.
            if (!filteredJobs.some(fj => fj.id === d.jobId)) return;
          } else {
            // No-project bill: synthesize a sentinel job. Hide from sales-role users
            // since they only see their own job's data (no-project bills belong to
            // no rep). Office sees them. ctx.userRole because DocumentsPage doesn't
            // destructure userRole (it lives in the spread ctx prop).
            if (ctx.userRole === 'sales') return;
            job2 = {id: '', name: '(No Project)', _noProject: true};
          }
          const amtNum = Number(d.amount);
          if (!isFinite(amtNum) || amtNum <= 0) return;
          const v2 = (vendors || []).find(vv => vv.id === d.vendorId) || null;
          const dateStrRaw = d.creditDate || '';
          let baseDate2 = dateStrRaw ? new Date(dateStrRaw + 'T12:00:00') : new Date();
          if (!baseDate2 || isNaN(baseDate2.getTime())) baseDate2 = new Date();
          // For credits there's no "due" -- they're immediately applied. Use
          // baseDate2 directly so the row sorts naturally by date. For
          // standalone bills, use baseDate2 + 30 days as a sensible default
          // (matches the PO-derived bill convention).
          const dueDate3 = s.cat === 'VendorCredit'
            ? baseDate2
            : new Date(baseDate2.getTime() + 30 * 86400000);
          const daysUntil3 = Math.ceil((dueDate3.getTime() - Date.now()) / 86400000);
          let dueStr3 = '';
          try { dueStr3 = dueDate3.toISOString().split('T')[0]; } catch { dueStr3 = ''; }
          const paid3 = d.paid === true;
          const void3 = d.void === true;
          allBills.push({
            job: job2,
            vendor: v2,
            vendorId: d.vendorId || 'unknown',
            vendorName: d.vendorName || (v2 ? v2.name : 'Unknown'),
            items: [],
            cost: amtNum,
            orderValue: amtNum,
            poDocNum: d.refNumber || '',
            billDocNum: s.id, // SOP id doubles as the bill row id
            poDate: dateStrRaw,
            dueDate: dueStr3,
            daysUntil: daysUntil3,
            paid: paid3,
            voided: void3,
            itemCount: 0,
            vendorInvNum: d.refNumber || '',
            checkNum: d.checkNum || '',
            payDate: d.payDate || '',
            memo: d.memo || '',
            checkPrinted: '',
            isCredit: s.cat === 'VendorCredit',
            creditAmount: s.cat === 'VendorCredit' ? amtNum : 0,
            // Standalone bills don't track multi-payment history (they're flat single
            // amounts). Surface the same shape as PO-derived bills for downstream
            // uniformity: balance is full amount if unpaid, zero if paid.
            payments: paid3 ? [{date: d.payDate||'', amount: amtNum, checkNum: d.checkNum||'', memo: d.memo||'', method:'standalone'}] : [],
            totalPaid: paid3 ? amtNum : 0,
            balance: paid3 ? 0 : amtNum,
            isPartiallyPaid: false,
            _standalone: true,
            entered: true,
            _sopId: s.id,
            _standaloneKind: s.cat,
            _fileUrl: d.fileUrl || '',
            _fileName: d.fileName || '',
          });
        });
      } catch {}
      allBills.sort((a,b)=>a.daysUntil-b.daysUntil);
      const overdueBills=allBills.filter(b=>b.daysUntil<0&&!b.paid&&!b.voided&&!b._isDeleted&&b.entered);
      const dueSoonBills=allBills.filter(b=>b.daysUntil>=0&&b.daysUntil<=14&&!b.paid&&!b.voided&&!b._isDeleted);
      const unpaidBills=allBills.filter(b=>!b.paid&&!b.voided&&!b._isDeleted);
      // Credits reduce the total balance owed by the credit amount (defaults to full bill cost
      // when no custom amount is entered, allowing partial-credit support).
      // For non-credit bills, use balance (cost minus payments already recorded) so partial
      // payments correctly reduce Total Owed. Standalone bills (no payment history) have
      // balance == cost.
      const totalOwed=unpaidBills.reduce((s,b)=>s+(b.isCredit?-(typeof b.creditAmount==='number'?b.creditAmount:b.cost):(typeof b.balance==='number'?b.balance:b.cost)),0);
      const overdueAmt=overdueBills.reduce((s,b)=>s+(typeof b.balance==='number'?b.balance:b.cost),0);
      const toggleSelect=(idx)=>{const next=new Set(billSelected);if(next.has(idx))next.delete(idx);else next.add(idx);setBillSelected(next)};
      const selectAll=()=>{if(billSelected.size===unpaidBills.length)setBillSelected(new Set());else setBillSelected(new Set(unpaidBills.map((_,i)=>i)))};
      // Auto-apply unapplied vendor credits when paying a batch of bills. Maureen's
      // workflow: she selects 2 DKA invoices, clicks Print Batch Check, expects the
      // standalone DKA credit to deduct from the check total automatically. This
      // helper finds credits that match each selected bill's (vendor + job) and are
      // not yet consumed, then plans how much of each credit applies to which bill.
      // Returns:
      //   - plan: array of {bill, payAmt, creditsApplied:[{sopId,vendorName,refNumber,amount,creditedAmt}]}
      //   - creditConsumes: array of {sopId, amount, memo} for credits that should be
      //     marked paid (consumed) and how much of each was used. If a credit is only
      //     partially used, the consumed amount is recorded in the memo but the SOP
      //     is still marked paid (we don't currently split credits across multiple uses).
      //     Future enhancement: support partial-credit splitting if Maureen requests.
      //   - totalCredit: sum of credits applied across all bills (for UI display)
      const _planCreditApplication = (selectedNonCreditBills) => {
        const plan = [];
        // Gather all unconsumed credits from allBills (standalone vendor credits with
        // isCredit:true, paid:false). Keyed by vendor+job for quick lookup.
        const availableCredits = allBills.filter(b => b.isCredit && !b.paid && !b.voided && !b._isDeleted);
        // Mutable working copy: each credit has a remaining amount we can apply.
        const creditPool = availableCredits.map(c => ({
          sopId: c._sopId,
          vendorId: c.vendorId,
          vendorName: c.vendorName,
          jobId: c.job?.id,
          refNumber: c.poDocNum || c.vendorInvNum || '',
          remaining: typeof c.creditAmount === 'number' ? c.creditAmount : c.cost,
          originalAmount: typeof c.creditAmount === 'number' ? c.creditAmount : c.cost
        }));
        for (const bill of selectedNonCreditBills) {
          if (bill.isCredit) { plan.push({bill, payAmt: 0, creditsApplied: []}); continue; }
          let owe = typeof bill.balance === 'number' ? bill.balance : bill.cost;
          const creditsApplied = [];
          // Apply credits for the same vendor + same job. Smallest credits first so
          // we don't waste a large credit on a small bill if a smaller one would do.
          const matching = creditPool
            .filter(c => c.remaining > 0.005 && c.vendorId === bill.vendorId && c.jobId === bill.job?.id)
            .sort((a,b) => a.remaining - b.remaining);
          for (const c of matching) {
            if (owe <= 0.005) break;
            const use = Math.min(c.remaining, owe);
            c.remaining -= use;
            owe -= use;
            creditsApplied.push({
              sopId: c.sopId,
              vendorName: c.vendorName,
              refNumber: c.refNumber,
              originalAmount: c.originalAmount,
              creditedAmt: use
            });
          }
          plan.push({bill, payAmt: Math.max(0, owe), creditsApplied});
        }
        // Build consume list: any credit whose remaining dropped below original is
        // consumed. We mark it paid with a memo listing what bills consumed it.
        const consumedBySop = new Map();
        plan.forEach(p => {
          p.creditsApplied.forEach(ca => {
            if (!consumedBySop.has(ca.sopId)) consumedBySop.set(ca.sopId, {sopId: ca.sopId, usedAmt: 0, billRefs: []});
            const rec = consumedBySop.get(ca.sopId);
            rec.usedAmt += ca.creditedAmt;
            rec.billRefs.push(p.bill.vendorInvNum || p.bill.poDocNum || ('bill '+p.bill.billDocNum));
          });
        });
        const creditConsumes = Array.from(consumedBySop.values()).map(c => {
          const pool = creditPool.find(cp => cp.sopId === c.sopId);
          const fullyUsed = pool && pool.remaining < 0.005;
          return {
            sopId: c.sopId,
            usedAmt: c.usedAmt,
            remaining: pool ? pool.remaining : 0,
            fullyUsed,
            memo: 'Applied to '+c.billRefs.join(', ')+(fullyUsed?'':' (partial: '+fmt(c.usedAmt)+' of '+fmt(pool.originalAmount)+')')
          };
        });
        const totalCredit = plan.reduce((s,p) => s + p.creditsApplied.reduce((s2,ca) => s2+ca.creditedAmt, 0), 0);
        return {plan, creditConsumes, totalCredit};
      };
      // Mark a credit SOP as consumed. If fully used, set paid:true so it disappears
      // from the unpaid list. If partially used (rare in current data shape), reduce
      // the stored creditAmount and leave paid:false so the remainder stays available.
      const _consumeCreditSops = (creditConsumes, today) => {
        creditConsumes.forEach(cc => {
          const sop = (customSops || []).find(s => s.id === cc.sopId);
          if (!sop) return;
          let d = {}; try { d = JSON.parse(sop.content || '{}'); } catch { return; }
          let updated;
          if (cc.fullyUsed) {
            updated = {...d, paid: true, payDate: today, memo: (d.memo ? d.memo + ' | ' : '') + cc.memo};
          } else {
            // Partial use: reduce the remaining credit amount and add a note. Stays unpaid.
            updated = {...d, amount: Number((cc.remaining).toFixed(2)), memo: (d.memo ? d.memo + ' | ' : '') + cc.memo};
          }
          addSop({id: sop.id, title: sop.title, cat: sop.cat, icon: sop.icon, content: JSON.stringify(updated), custom: true});
        });
      };
      const markSelectedPaid=()=>{
        const today=new Date().toISOString().split('T')[0];
        // Plan credit auto-application across all selected non-credit bills BEFORE
        // writing any payments. This ensures we don't double-apply a credit if two
        // bills could each claim the same one.
        const selectedNonCredits = [];
        const selectedStandalones = [];
        unpaidBills.forEach((bill,i)=>{
          if(!billSelected.has(i))return;
          if(bill._standalone && !bill.isCredit) selectedStandalones.push(bill);
          else if(!bill.isCredit) selectedNonCredits.push(bill);
        });
        const {plan, creditConsumes, totalCredit} = _planCreditApplication(selectedNonCredits);
        // Apply the plan to each PO-derived bill: residual payAmt becomes the payment.
        plan.forEach(p => {
          const {bill, payAmt, creditsApplied} = p;
          const existing = typeof docStatuses[bill.billDocNum]==='object' ? docStatuses[bill.billDocNum] : {};
          const prevPayments = _getBillPayments(existing, bill.cost);
          const newEntries = [];
          // Record each credit application as its own payment entry so the Payment
          // Trail clearly shows what credits were applied to settle the bill.
          creditsApplied.forEach(ca => {
            newEntries.push({date: today, amount: ca.creditedAmt, checkNum: '', memo: 'Credit '+(ca.refNumber?'#'+ca.refNumber+' ':'')+'from '+ca.vendorName, method: 'credit'});
          });
          // Then the cash payment for whatever's still owed.
          if (payAmt > 0.005) {
            newEntries.push({date: today, amount: payAmt, checkNum: '', memo: 'Batch payment', method: 'batch'});
          }
          const newPayments = [...prevPayments, ...newEntries];
          const total = _sumPayments(newPayments);
          const fullyPaid = total >= bill.cost - 0.005;
          setDocStatus(bill.billDocNum,{...existing, payments: newPayments, paid: fullyPaid, payDate: today, vendorInvNum: bill.vendorInvNum, checkNum: existing.checkNum||'', memo: 'Batch payment', status: fullyPaid?'paid':'partial'});
        });
        // Mark applied credits as consumed.
        _consumeCreditSops(creditConsumes, today);
        // Standalone non-credit bills (e.g. standalone vendor bills): flat-paid pathway.
        // Credit auto-application doesn't apply to standalone bills today since they
        // don't have a payments[] history -- they're flat paid/unpaid records.
        selectedStandalones.forEach(bill => {
          const sop=(customSops||[]).find(s=>s.id===bill._sopId);
          if(!sop)return;
          let d={};try{d=JSON.parse(sop.content||'{}')}catch{}
          const updated={...d,paid:true,payDate:today};
          addSop({id:sop.id,title:sop.title,cat:sop.cat,icon:sop.icon,content:JSON.stringify(updated),custom:true});
        });
        const creditMsg = totalCredit > 0 ? ' (with '+fmt(totalCredit)+' in credits applied)' : '';
        notify(billSelected.size+' bill'+(billSelected.size!==1?'s':'')+' marked as paid'+creditMsg);
        setBillSelected(new Set());
      };
      const selectByVendor=(vendorName)=>{const next=new Set();unpaidBills.forEach((b,i)=>{if(b.vendorName===vendorName)next.add(i)});setBillSelected(next)};
      const selectByJob=(jobName)=>{const next=new Set();unpaidBills.forEach((b,i)=>{if((b.job?.name||'(No Project)')===jobName)next.add(i)});setBillSelected(next)};
      // Standalone Vendor Credit / Vendor Bill handlers. Records live in customSops
      // (cat 'VendorCredit' or 'StandaloneBill') so they propagate via the same
      // realtime sync as everything else, and feed getJobFinancials so cost/margin
      // adjustments show across the whole app.
      const openAdjustModal=(mode, existingBill)=>{
        setAdjustMode(mode);
        if(existingBill && existingBill._standalone && existingBill._sopId){
          const sop=(customSops||[]).find(s=>s.id===existingBill._sopId);
          let d={};try{d=JSON.parse(sop?.content||'{}')}catch{}
          setAdjustEdit(existingBill._sopId);
          // Preserve no-project state: if a bill was saved with empty jobId, the
          // selector should show 'No project' (__NONE__) rather than '-- Select
          // project --' so the user understands the bill's current attachment.
          const restoredJobId = (mode==='bill' && (!d.jobId || d.jobId==='')) ? '__NONE__' : (d.jobId||'');
          setAdjustForm({vendorId:d.vendorId||'',jobId:restoredJobId,amount:String(d.amount||''),creditDate:d.creditDate||'',refNumber:d.refNumber||'',memo:d.memo||'',fileUrl:d.fileUrl||'',fileName:d.fileName||'',fileSize:Number(d.fileSize)||0,uploadDate:d.uploadDate||''});
        } else {
          setAdjustEdit(null);
          setAdjustForm({vendorId:'',jobId:'',amount:'',creditDate:new Date().toISOString().split('T')[0],refNumber:'',memo:'',fileUrl:'',fileName:'',fileSize:0,uploadDate:''});
        }
        setShowAdjustModal(true);
      };
      const closeAdjustModal=()=>{setShowAdjustModal(false);setAdjustEdit(null);setAdjustForm({vendorId:'',jobId:'',amount:'',creditDate:'',refNumber:'',memo:'',fileUrl:'',fileName:'',fileSize:0,uploadDate:''});setAdjustUploading(false)};
      const saveAdjust=()=>{
        if(adjustUploading){notify('Wait for the file upload to finish','error');return}
        const amt=Number(adjustForm.amount);
        if(!adjustForm.vendorId){notify('Pick a vendor','error');return}
        // Project selection: '__NONE__' is the explicit no-project option for vendor
        // bills (utility, rent, reimbursements, etc.). Credits always require a real
        // project since they need something to offset. Empty string is still
        // 'unselected' (user hasn't picked yet) and blocks save.
        const isNoProject = adjustForm.jobId === '__NONE__';
        if(adjustMode==='credit' && isNoProject){notify('Credits must be attached to a project','error');return}
        if(!adjustForm.jobId){notify('Attach to a project (or pick "No project" for standalone expenses)','error');return}
        if(!isFinite(amt)||amt<=0){notify('Enter an amount greater than 0','error');return}
        const v=vendors.find(vv=>vv.id===adjustForm.vendorId);
        const j=isNoProject ? null : jobs.find(jj=>jj.id===adjustForm.jobId);
        if(!v){notify('Vendor not found','error');return}
        if(!isNoProject && !j){notify('Project not found','error');return}
        const id=adjustEdit||((adjustMode==='credit'?'VC-':'SB-')+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase());
        const data={vendorId:adjustForm.vendorId,vendorName:v.name,jobId:isNoProject?'':adjustForm.jobId,jobName:isNoProject?'':(j?j.name:''),amount:amt,creditDate:adjustForm.creditDate||new Date().toISOString().split('T')[0],refNumber:(adjustForm.refNumber||'').trim(),memo:(adjustForm.memo||'').trim(),fileUrl:adjustForm.fileUrl||'',fileName:adjustForm.fileName||'',fileSize:Number(adjustForm.fileSize)||0,uploadDate:adjustForm.uploadDate||'',createdAt:adjustEdit?undefined:new Date().toISOString()};
        // Preserve createdAt + payment state if editing
        if(adjustEdit){
          const prior=(customSops||[]).find(s=>s.id===adjustEdit);
          if(prior){try{const pd=JSON.parse(prior.content||'{}');if(pd.createdAt)data.createdAt=pd.createdAt;if(pd.paid)data.paid=pd.paid;if(pd.payDate)data.payDate=pd.payDate;if(pd.checkNum)data.checkNum=pd.checkNum;}catch{}}
        }
        const cat=adjustMode==='credit'?'VendorCredit':'StandaloneBill';
        const projLabel = isNoProject ? '(No Project)' : (j?j.name:'');
        const title=(adjustMode==='credit'?'Credit ':'Bill ')+v.name+' '+projLabel+' '+fmt(amt);
        addSop({id,title,cat,icon:adjustMode==='credit'?'dollar':'receipt',content:JSON.stringify(data),custom:true});
        notify((adjustMode==='credit'?'Vendor credit ':'Vendor bill ')+(adjustEdit?'updated':'created')+' for '+v.name+' -- '+fmt(amt)+(isNoProject?' (no project)':' applied to '+(j?j.name:'')));
        closeAdjustModal();
      };
      const deleteAdjust=(sopId)=>{
        if(!sopId)return;
        deleteSop(sopId);
        notify('Adjustment removed');
        if(billDetail&&billDetail._sopId===sopId)setBillDetail(null);
      };
      // Void / unvoid for standalone vendor bills. Voiding keeps the record for the
      // audit trail (unlike Delete) but removes it from job cost, Total Owed, AP
      // aging, and the P&L adjustments -- exactly what Maureen asked for when a
      // duplicate bill gets entered. Reversible at any time via the same button.
      const adjustIsVoided=()=>{
        if(!adjustEdit)return false;
        const sop=(customSops||[]).find(s=>s.id===adjustEdit);
        if(!sop)return false;
        try{return JSON.parse(sop.content||'{}').void===true}catch{return false}
      };
      const toggleAdjustVoid=()=>{
        if(!adjustEdit)return;
        const sop=(customSops||[]).find(s=>s.id===adjustEdit);
        if(!sop){notify('Record not found','error');return}
        let d={};try{d=JSON.parse(sop.content||'{}')}catch{}
        if(d.void===true){
          delete d.void;delete d.voidDate;delete d.voidMemo;
          addSop({id:sop.id,title:sop.title,cat:sop.cat,icon:sop.icon,content:JSON.stringify(d),custom:true});
          notify('Bill unvoided: '+(d.vendorName||'vendor')+' -- counts toward totals again');
        }else{
          d.void=true;d.paid=false;d.voidDate=new Date().toISOString().split('T')[0];
          addSop({id:sop.id,title:sop.title,cat:sop.cat,icon:sop.icon,content:JSON.stringify(d),custom:true});
          notify('Bill voided: '+(d.vendorName||'vendor')+' -- removed from totals, record kept for audit trail');
        }
        closeAdjustModal();
      };
      const printBatchCheck=()=>{
        const selectedBills=Array.from(billSelected).map(i=>unpaidBills[i]).filter(Boolean);
        if(selectedBills.length===0)return;
        // Separate credits from non-credit bills. Maureen may or may not have checked
        // the credit row itself; either way we auto-apply available credits for the
        // same vendor + same job to the non-credit bills she selected. If she also
        // checked the credit row, it'll be consumed by the auto-apply path and won't
        // double-count.
        const selectedNonCredits = selectedBills.filter(b => !b.isCredit);
        if (selectedNonCredits.length === 0) {
          notify('Select at least one non-credit bill to print a check','error');
          return;
        }
        const {plan, creditConsumes, totalCredit} = _planCreditApplication(selectedNonCredits);
        // totalCost: sum of residual amounts AFTER credit application. This is what
        // gets written on the check. If credits fully cover the bills, totalCost will
        // be 0 -- in that case we don't print a check (no check needed) and just
        // settle the bills via credit application.
        const totalCost = plan.reduce((s,p) => s + p.payAmt, 0);
        const today=new Date();const mm=String(today.getMonth()+1).padStart(2,'0');const dd=String(today.getDate()).padStart(2,'0');const yyyy=today.getFullYear();
        const dateStr=mm+'/'+dd+'/'+yyyy;
        const todayIso = today.toISOString().split('T')[0];
        if (totalCost <= 0.005) {
          // Credits cover everything. Settle the bills with credit-only payments,
          // consume the credits, no check printed. Notify Maureen so she knows
          // why no check came out of the printer.
          plan.forEach(p => {
            const {bill, creditsApplied} = p;
            const existing = typeof docStatuses[bill.billDocNum]==='object' ? docStatuses[bill.billDocNum] : {};
            const prevPayments = _getBillPayments(existing, bill.cost);
            const newEntries = creditsApplied.map(ca => ({date: todayIso, amount: ca.creditedAmt, checkNum: '', memo: 'Credit '+(ca.refNumber?'#'+ca.refNumber+' ':'')+'from '+ca.vendorName, method: 'credit'}));
            const newPayments = [...prevPayments, ...newEntries];
            const total = _sumPayments(newPayments);
            const fullyPaid = total >= bill.cost - 0.005;
            setDocStatus(bill.billDocNum,{...existing, payments: newPayments, paid: fullyPaid, payDate: todayIso, vendorInvNum: bill.vendorInvNum, memo: 'Credit settled', status: fullyPaid?'paid':'partial'});
          });
          _consumeCreditSops(creditConsumes, todayIso);
          notify('Bills fully settled by '+fmt(totalCredit)+' in credits -- no check needed');
          setBillSelected(new Set());
          return;
        }
        const vendorName=selectedNonCredits[0].vendorName;
        const vendorAddr=selectedNonCredits[0].vendor?(selectedNonCredits[0].vendor.contact?(selectedNonCredits[0].vendor.contact+'\n'):'')+(vendorName||'')+'\n'+(selectedNonCredits[0].vendor.address||''):'';
        const vendorAddrHtml=vendorAddr.split('\n').filter(Boolean).join('<br>');
        // Auto-generate check number. Maureen's checkbook lives in [1127, 9999].
        // Anything outside that range in stored data is legacy/test pollution and is
        // ignored. Uses localStorage high-water mark to survive React state races.
        const CHECK_MIN=1127;
        const CHECK_MAX=1999;
        const inRange=(n)=>!isNaN(n)&&n>=CHECK_MIN&&n<=CHECK_MAX;
        const allCheckNums=Object.values(docStatuses).filter(v=>v&&typeof v==='object'&&v.checkNum&&v.checkNum!=='____').map(v=>parseInt(v.checkNum)).filter(inRange);
        const usedSet=new Set(allCheckNums);
        let highWater=0;try{const hw=parseInt(localStorage.getItem('mw_check_high_water')||'0')||0;highWater=(hw>=CHECK_MIN&&hw<=CHECK_MAX)?hw:0;if(hw>CHECK_MAX){localStorage.removeItem('mw_check_high_water')}}catch{}
        const scannedMax=allCheckNums.length>0?Math.max(...allCheckNums):0;
        let nextCheck=Math.max(highWater+1,scannedMax+1,CHECK_MIN);
        while(usedSet.has(nextCheck))nextCheck++;
        const checkNo=String(nextCheck);
        try{localStorage.setItem('mw_check_high_water',String(nextCheck))}catch{}
        const amtDollars=Math.floor(totalCost);const amtCents=Math.round((totalCost-amtDollars)*100);
        const amtWords=(()=>{const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];const convert=(n)=>{if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+convert(n%100):'');if(n<1000000)return convert(Math.floor(n/1000))+' Thousand'+(n%1000?' '+convert(n%1000):'');return String(n)};return convert(amtDollars)+' and '+String(amtCents).padStart(2,'0')+'/100'})();
        const amtFmt=totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        const micrCheckNum=String(checkNo).padStart(6,'0');
        const micrFontStr='C'+micrCheckNum+'C   A071926155A   C01597962C';
        // Build stub rows for all included bills + applied credits. Each bill shows
        // its original balance, then any applied credits as negative lines under it,
        // then the residual payment. This makes the credit-application math obvious
        // to Maureen and to anyone reconciling the check against the bank statement.
        const stubRows = plan.map(p => {
          const b = p.bill;
          const bDate=b.payDate||b.poDate||dateStr;
          const ref=b.vendorInvNum||b.poDocNum||'';
          const origBal=typeof b.balance==='number'?b.balance:b.cost;
          const origFmt=origBal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
          const payFmt=p.payAmt.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
          let row = '<tr><td>'+bDate+'</td><td>Bill</td><td>'+ref+'</td><td class="amt">'+origFmt+'</td><td class="amt">'+origFmt+'</td><td class="amt">'+payFmt+'</td></tr>';
          p.creditsApplied.forEach(ca => {
            const cFmt = ca.creditedAmt.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
            row += '<tr><td>'+dateStr+'</td><td>Credit</td><td>'+(ca.refNumber||'')+'</td><td class="amt">--</td><td class="amt">--</td><td class="amt" style="color:#c0392b">-'+cFmt+'</td></tr>';
          });
          return row;
        }).join('');
        const fontB64=(() => { try { const m=document.querySelector('style'); return ''; } catch(e) { return ''; }})();
        const html=`<!DOCTYPE html><html><head><title>Batch Check ${checkNo}</title><style>
@font-face{font-family:'MICR';src:url(data:font/truetype;base64,AAEAAAAKAIAAAwAgT1MvMhrDB94AAACsAAAATmNtYXBVqb7oAAAA/AAAA6ZnbHlmVzPUWAAABKQAADVAaGVhZODmvhYAADnkAAAANmhoZWEdMxCSAAA6HAAAACRobXR4ugQhhAAAOkAAAABcbG9jYYSUk8YAADqcAAAAMG1heHAAHADwAAA6zAAAACBuYW1lCAdeTwAAOuwAAAHQcG9zdAADAAAAADy8AAAAIAAACBYBkAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgsGAAUDAgICBAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAIPACB38AAAiBB38AAAAAAAAAAgABAAAAAAAUAAMAAQAAARoAAAEGAAABAAAAAAAAAAEDAAAAAgAAAAAAAAAAAAAAAAAAAAEAAAMAAAAAAAAAAAAAAAAAAAAEBQYHCAkKCwwNAAAAAAAAAA4REhUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADxATFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQCjAAAACIAIAAEAAIA/wFTAWEBeAGSAsYC3CAUIBogHiAiICYgMCA6ISIiGf//AAAAIAFSAWABeAGSAsYC3CATIBggHCAgICYgMCA5ISIiGf//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAiAeAB4gHkAeQB5AHkAeQB5gHqAe4B8gHyAfIB9AH0AfQAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAUABgAHAAgACQAKAAsADAANAAAAAAAAAAAAAAAAAAAADgARABIAFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AEAATABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAgABB38HfwAvAI8AAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAAAAAAAAAEAAAEAAAEAAAAAAAAAAAEAAAAAAAAAAAEAAAEAAAEAAAAAAAAAAAEAAAAAAAAAAAEAAAEAAAEAAAAAAAAAAAEAAAAAAAAAAAEAAAEAAAEAAAAAAAAAAAPB/53/RP+q/6v/Zv++/7//mP/b/9z/2QAAAAAAJwAkACUAaABBAEIAmgBVAFYAvABjAGMAuwBWAFUAmgBCAEEAaAAlACQAJwAAAAD/2f/c/9z/l/+//77/Zv+r/6r/Rf+dABMAJwAnACUAJgAkACQAIwARAEQAewA0ADMAVAAdAAf/+//v/+X/4v/h/+j/8AAAAAAAEAAYAB8AHgAbABEABf/5/+P/rf/M/8z/hf+8/+//3f/c/9z/2v/b/9n/2f/t/+z/2f/Z/9v/2v/c/9z/3f/v/7z/hP/N/8z/rf/j//gABQASABsAHwAfABgAEAAAAAD/8P/o/+H/4f/l/+7/+wAIAB0AUwA0ADQAegBFABEAIwAkACQAJgAlACcAJwABAAAAKAAkACQAaABCAEEAmgBVAFYAvABjAGMAvABVAFYAmgBBAEEAaQAkACUAJwAAAAD/2f/b/9z/l/+//7//Zv+q/6v/RP+d/53/RP+q/6v/Zv+//77/mP/c/9z/2AGQAAD/8P/n/+H/4v/l/+7/+wAHAB0AUwA0ADMAewBFABEAIwAkACUAJQAmACcAJgAUABQAJwAmACYAJQAlACQAIgASAEQAewA0ADMAVAAcAAj/+//u/+X/4f/i/+f/8QAAAAAADwAZAB4AHwAbABIABf/4/+T/rP/N/8z/hf+8/+7/3v/c/9v/2//a/9r/2f/s/+z/2v/Z/9r/2//b/9z/3f/v/7v/hv/M/83/rP/j//kABQASABsAHgAfABkAEAACASoAAAbRB1EANABrAAABAQEAAQABAAABAAABAQEAAAEAAAEAAAEAAAEBAQABAAABAAABAAABAQEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAQAAAQAAAQECvAE5ATgAOAAuAC8AJAAOABYACAAHAAkAAAAAAAAAAP/0//X/9v/l//D/7v/V/+j/6P/L/+P+4P7h/8T/zv/n/9X/7//0/+n/9//4//UAAAAAAAAAAAANAAkACQAZAA0AEAAiABQAEwAuAAb/0f+z/+D/4P/L/+j/5v/V//H/8P/vAAAAAAAAAAAADwAOAA4ALAAcABgAOwAiACIAUgAvATwBOwAxAFMAIwAjAD4AGgAcAC8AEQAQABQAAAABAAIAAP/x//L/5P/I/+v/xf/e/9//uv/g/qAAqgAAAAAAAAATABMAKQAQACYAEwAUACgAEwIXAhYAGwAyABYAFQAmAA4AEAAYAAcABwAIAAAAAAAAAAD/7//4/+T/7P/y/9v/7//v/+P/+P3D/cL/+f/h/+7/7v/b//T/8f/n//f/9//1/1YAAAATAA8AEAApABYAGABAACEAIQBBABgCRwJHABIAOgAgACEARAAdABcAKgAPAA8AEgAAAAAAAAAA//L/8//z/9n/6P/m/7//4P/f/7//5P3L/cv/2P+1/97/vf/G/+r/1f/w//D/7AAAAAAAAQOqAAAGzQdSAIYAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAEAAAEAAQEBAAABAAEAAQABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQAAAQABAQEBAQAAAQAAAQAAAQABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAEAAAEBAQEBAAABAAABAAABAAUdAAAAAAAAAAYABgAFAA8ACAAIABYACwALABYACQBxAHEACQAQAAgAEAARAAQABwACAAQAAAAAAAAAAP/9//z/+v/2//T/8v/x//T+t/64//z/9P/6//v/8v/7//v/+P/8//3//AAAAAAAAAAAAAQAAwADAAkABAAEAA4ABwAPAAwACQAIAAoACQADAA0ABwAGAA8ABQAEAAoAAwAGAAAAAAAAAAD//P/8//3/9//7//v/8v/5//n/9P/9/+//7v/7//L/+f/6//L/+//7//f//f/9//wAAAAAAAAAAAAEAAMAAwAKAAUACQAMAAYADwAIADcANwA3ADYABgAPAAYABwAOAAUABgAIAAMABwcH/lD+T//0/+f/9P/1/+r/+P/4//L/+//8//oAAAAAAAAAAP////3/+f/p//v/9v/7//X/8/66/rr/+f/x//r/8//2//T/+f/5AAAAAAAAAAAAAwADAAMACAAGAAQADgAHAAYADgAFAUkBSQAGAA8ABgAHAA0ABAAFAAoAAwAHAAAAAAAAAAAAAAAAAAUAAwADAAoABQAFAAwABgAMAAkBSAFIAAcADQAGAAYADAAEAAUACQADAAMABAAAAAAAAAAAAAQAAwADAAkABQAFAA4ABgAHAA4ABgA6ADoACgAPAAYABgAMAAUACQAHAAMABAAAAAAAAAAAAAAAAP/8//3//f/4//v/+v/z//r/8gAAAQOqABkGzgdsAIYAAAEBAQABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAQABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAQAAAQAAAQABAAEAAQABAAP4AUMBQwAPAA0ADgALAA0ADAABAAH//wAAAAAAAAAA//v//f/5//X/+//0//r/+v/y//j/LP8r/+j/6f/p/+7/9//x//r/+//6AAAAAAAAAAAABQAEAAUADQAHABAAGQAMABYACQDaANoADwAcAAoACwAOAAAAAP/1//b/9v/j/+7+vv69//P/8f/5//L/+v/7//b//f/5AAD//wAAAAAABAAEAAMACwAFAAYADgAHAA8ACgDVANYADAAXAAwAGAARAAgADAAEAAUABQAAAAAAAAAA//v//P/3/+3/+v/t//X/9v/o//X/J/8o//f/8f/5//L/+v/6//f//P/5AAAAAAAHAAgADAALAA4AEAdsAAAAAAAA//r/+f/1//P/6//5//n/+P///k7+Tv/8//L/+v/y//b/+//2//3//P/8AAAAAAAAAAD/9v/2/+3/9//s//T/9f/p//X/Kf8q//b/6f/1//b/6v/4/+3/9f/7//kAAAAAAAAAAP/x//X/9P/i//D/8P/g//T/9P/wAAAAAAAAAAAACAADAAoABQAGAA4ABwAPAAwBrwGvAAcAEQAHAAgADQAFAAYACgACAAcAAAAAAAAAAAAHAAUACwAUAAgAFQAKAAsAGAAMANMA0gALABcADAAWABUABwAPAAUABgAIAAAAAAAAAAAABwADAAoABgAFAA8ABwAQAA8AEAASABEADAAMAAYABgAAAQLVABgGygdtAI8AAAEBAQAAAQABAAABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQABAAEAAQEBAAABAAABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAMgAUYBRgAGAA4ABwAOAAwABgAKAAMABwAA//8AAAAAAAQAAwAHAA0ABgAQAAgACQATAAsAHgAeAAQACwAEAAoABwAHAAQAAgADAAAAAAAAAAD//f/+//r/+f/5//D/+P/4//L/+/5T/lP/9f/m//T/9f/uAAAAAAASAA0ADAAaAAgA2gDbAAQAFgAMAA0AGQAHAAkADQAFAAUABQAAAAAAAAAA//r/+//2/+7/8P/q/+r/5v8p/yn/6v/g//f/9//4AAAAAQAOAAoACwAdAA8A1gDXAA4AGAALABYAEgAJAA4ABAAFAAUAAAABAAIAAP/7//z//P/z//j/9f/m//T/8//n//b/Kf8p//X/5v/1//T/8AAAAAAAEAAMAAsAGgdtAAAAAAAA//3//f/6//X/+//0//r/8//z/n7+fv/3/+r/9//r/+7/+P/x//z/+//5AAAAAP//AAD//P/9//r/9v/3//P/+v/0//v+gf6B//r/9P/6//P/9//4//T//P/7//sAAAAAAAAAAAAKAAoACgAhABcAGgAiAAkACQAHAAAAAAABAAAABgAFAAUADwAJAAgAFQALAAoAFgAKANcA1wAMABgACwAZABIAEgAKAAsAAAAAAAAAAAAVAA4ADgAdAAkAEQAgAAsACwAOAAAAAAAAAAAABgAFAAkAEgAJABcACwAMABsADQDPANAADgAYAAoACgATAAkADAASAAYABQAFAAAAAAAAAAAACgAKAAoAIQAXABcAIQAKAAsACQABAf4AGQbPB20AewAAAQABAAABAAABAAABAQEAAAEAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAABAAABAAABAQEAAQABAAABAAEBAQABAAEAAAEAAAEBAQABAAABAAEAAQEBAAABAAABAAABAAEBAQABAAABAAABAAEBAQAAAQABAAABAAABAQMrAAwADgAGAA4ABgAFAAoABAAEAAQAAAAAAAAAAAAFAAUACgAUAAgAFQALABYAFQB0AHUACQAXAAsACwAWAAgACQANAAQACQAAAAAAAAAAAAMAAwACAAkABQAEAA4ABgAHAA0ABQB1AHYACgAMAA0ACwAGAAoAAgAIAAD//wAAAAD/+v/6//b/+//y//r/+f/x//n/kv+S//L/8P/5//L/+v/1//n/+QAAAAAAAAAA//n//P/7//H/+P/3/+z/9f/r/+v+uv66//P/8P/4//H/+f/8//n//f/6//4AAAAAAAAABAACAAYADAAHABAABwAHAA0ABABwB20AAP/5//3/9//6//v/8v/6//n/8f/5/ef95//1/+f/9P/n/+z/9//y//z/9gAAAAAAAAAAAAUAAwAEAA0ABwAJABUACgAXABQAEQAQAAcADQAGAAYADAAEAAUABgACAAIAAgAAAAAAAAAA//r/+f/1//v/8//6//L/9P65/rr/9P/y//P/9f/6//X//P/8//wAAAAAAAAAAAAHAAMACgAFAAsADwAOAAoAcQBxAAoAFgALAAwAFAAJAAgADgAEAAkAAAABAAAAAAAHAAQACwAIAAQACwAFAA0ADQKAAn8ACwAUAAkAEgAMAAYADAADAAQABQAAAAAAAQLRABcGzQdtAH8AAAEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAABAQEAAQABAAABAAABAQEAAQAAAQAAAQAAAQEBAAABAAABAAEAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAEBAQAAAQABAAABAAEBAQAAAQABAAABAAEBBnoADgAeAAsADAAPAAAAAf/u//T/9P/j//f+wv7D//b/6P/1//X/6//3/+v/9f/7//kAAAABAAAAAAAJAAkAEAAJABUACwAMABoADgE/AUAADQAOAAcADgAFAAYACQACAAQAAwAAAAAAAAAA//z//f/9//j//P/0//D/8f/y/lL+Uv/z/+T/9P/1//EAAAAA//8ABgAGACMAJAFAAT8ACwAYAAsACwAWAAkAEQAKAAUABgAAAAAAAAAA//r/+v/7/+//9//3/+z/9v/r/+7+vv6+//r/8f/5//H/8//7//b//f/5AAAAAAAAAAEABQADAAYADAAEAA0ABgAPABABqwdsAAD/9//1//b/3//q/+n/3//2//b/9QAAAAAAAQAA//r/+//7//L/9//u/+j/9f/o//X/LP8s/+3/6v/q/+7/9v/u//r/+f/4AAAAAAAAAAD/+f/9//X/+//6//P/+v/5//L/+f5Q/k//+P/w//v/+f/1//v/8v/4//kAAAAAAAAAAAAPAAsADAAeABAAEwAhAAsADAAOAAAAAAAAAAAABgAFAAYADgAJAA8AFgAKABgADADbANoACQAWAAsACwAWAAkACAAOAAUACQAAAAAAAAAAAAUAAwAHAAwABQAOAAYADwANAbEBsAAHAA4ABwANAAwABAAJAAQABwADAAAAAgH9ABgGzAdtAG0AjQAAAQAAAQAAAQAAAQABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAEBAQABAAABAAABAAABAQEAAAEAAQABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAATSAAcAEgAHAAkADgAGAAUACQADAAYAAAAAAAAAAP/x//T/9P/h//D/7v/h//T/9P/xAAAAAP//AAD/+v/8//v/8f/3/+3/6v/n/+r/mv+Z/+j/6f/0/+v/9//3//D/+//6//oAAAABAAAAAAAFAAQACQAQABIAGAAMABoADgGqAaoADQAdAAsACwAPAAAAAAAAAAD/+//+//3/9v/7//r/8//5//r/8f/5/en95//6//D/+f/5//H/+v/2//r//f/9AAAAAP//AAAABQADAAcACwAMAA8ADwAMAUP/lwE8ATwAGgAuABAAEQAVAAAAAAAAAAD/6//v//D/0v/m/sT+xP/m/9L/7//w/+wAAAAAAAAAAAAUABAAEQAuB20AAP/7//z//P/0//n/+v/z//r/8v/z/17/Xv/v/+P/9f/2//QAAAAAAAYACAAIACAAGQA1ADQACgAYAAsADAAYAAkAEgALAAsAAAAAAAAAAP/2//v/8v/3//f/6f/1//T/5//1/r/+wP/2/+v/9f/q/+7/7P/1//r/+QAAAAAAAAAA//H/9f/1/+X/8/68/rv/+v/x//n/+f/y//r/+v/2//3//P/8AAAAAAAAAAAABQAEAAMACwAGAAsADQAHAA0ABwNZA1oABwAQAAYADgAMAAwABwAHAAAAAflWAAAAAAAAABYAEgASADIAHABhAGEAHAAyABIAEgAVAAAAAAAAAAD/6//u/+7/zv/k/5//n//k/87/7v/u/+oAAQLYABcG1AdtAIUAAAEAAAEAAAEAAAEAAAEBAQAAAQABAAABAAABAQEBAQAAAQABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAEBAQAAAQAAAQAAAQABAQEAAQABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAEBBngACgATAAgACAAPAAYABwAJAAMAAwAEAAAAAP//AAD//wAA//7/+//+//j/+//8//f/+/+z/7P/s/+z//j/8f/5//L/9v/8//f//v/+//wAAAABAAAAAP/x//T/9P/h/+//8P/g//T/8//xAAAAAAAAAAAABAACAAQACAAFAAUADAAFAAYADAAEAI0AjAAHABMACQAJABEABQACAAQAAAACAAAAAAAAAAD/+//8//z/8f/4//f/6v/0/+f/6P8u/y//7P/p/+n/7//3//D/+//7//sAAAAAAAAAAP/z//X/9f/j/+//6v/d//X/9P/0AAAAAAABAAAABAAEAAQACwAGAA0ADwAPABEBowdtAAD//P/9//z/9v/7//r/8v/6//n/8P/5/pz+nP/8//T/+v/z//b/+//2//3//P/5//7/3P/d/9z/3P/9//f/+//2//X/+v/z//r/+v/z//r+pP6k/+r/4f/3//b/9wAAAAAAEAALAAsAHQAOAZsBmwAHAA0ABgAHAA0ABQAFAAsABAAEAAcAAgA/AD4AAwAIAAUABQAQAAwAAwAKAAQACgAMALkAuQALABcADAAMABYACQAKABIABQANAAAAAAAAAAD/9f/2/+//9v/o//X/8//m//X/lv+X//H/4//1//T/8v////8AEgANAA0AHQAKANMA0gAPABYABwAIAAwABwAMAAYABwAAAAAAAwEhABkG0wd5AB8APwCqAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAEAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQABAQEBAQAAAQAAAQABAAABAQEBAQAAAQAAAQAAAQADHQDcAN0AFwAqAA8ADwASAAAAAAAAAAD/7v/x//H/1v/p/yP/JP/o/9f/8f/x/+0AAAAAAAAAAAATAA8ADwApAB4A1gDXABgALAAQABEAEwAAAAAAAAAA/+3/7//w/9T/6P8p/yr/5//V/+//8P/tAAAAAAAAAAAAEwAQABEAK/4XAAAAAAAAAAcABQALAAcAEAAIABEADwAdAB0ABQAOAAYABwAPAAYABgAKAAQACAAAAAAAAAAAAAUABAAEAAoABgAFABAABgAHAAwAAgGqAaoADwARAAgAEgAHAAwADAADAAIAAQAAAAAAAAAAAAUAAwADAAsABQAFAAwABwAIABAACAAZABoACAAPAAYABgAMAAYACwAFAAYAAP//AAAAAAAAAAD/+//9//z/9v/6//P/8f/4//D/+P7C/sL+w/7C//f/7v/3//f/8P/5//n/9f/8//gEKQAAAAAAAAASABAAEAArABkA1ADUABkAKwAQABAAEwAAAAAAAAAA/+3/8P/w/9X/5/8s/yz/5//V//D/8P/u/KsAAAAAAAAAEwAPABAAKwAYAOAA3wAYACsAEAAPABMAAAAAAAAAAP/t//H/8f/U/+j/If8g/+j/1f/w//H/7f+mAYsBiwAMAAsACgAIAAUACgADAAYAAAAAAAAAAAAGAAMABAALAAYABgAMAAYADQAKAX4BfwAJABMACAAIABAABQAGAAsAAwAEAAQAAAAAAAEAAP/2//v/9P/4//X/6f/3//f/8v/8/ob+h//5//H/+v/5//T/+//8//j//P/9//sAAAAAAAAAAP/7//z//f/2//z/9v/y//H/8/8m/yX/Vf9V//j/7//4//j/8P/5//H/+f/8//sAAAAAAAAAAAAAAAAABgAEAAQADAAHAAcAEAAIABIAAAICAAAZBtMHbwBLAH8AAAEBAQABAAEAAAEAAAEBAQAAAQAAAQABAAEBAQAAAQAAAQABAAEBAQABAAABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQAAAQEBAAEAAAEAAQAAAloCDgIPABMAEAAQAA0ABgALAAMAAwAFAAAAAAAAAAD//f/9//3/+P/7//T/7f/u/+z/lv+X//r/8f/5//r/8f/7//X/+f/6AAAAAAAAAAD/9v/8//L/+P/3/+r/9f/0/+f/9P7B/sH/9//s//j/7//z//v/9//+//3//AAAAAAAAAAAAAUABAADAAsABwAGAA4ABwAIABEA2wE5ATkADQAbAAsADAAVAAkAEgAKAAUABgAAAAAAAAAA//r/+//8//H/9//3/+v/9P/1/+X/8/7H/sf/6P/r//X/7f/3//b/7f/6//r/+QAAAAAAAAAAAAoABQAPAAkAEwAWAAwAGgdvAAAAAAAA//n/+f/z//r/8f/4//n/7v/2/K78rv/4//H/+f/5//L/+//y//j/9wAAAAAAAAAAAAQABAAEAAsABQAKAA0ADAAMAUMBQgAZABgACwAVAAgACgARAAUABQAHAAAAAAAAAAAABAAEAAcADwAFAA8ACAAIABAABwGnAacACgATAAgACAAPAAYABgAJAAIAAwAE/KwAAAAAAAAABgAFAAUADwAJABIAGAAMABoADgDOAMwADgAbAAwADAAVAAkACQAPAAUABQAFAAAAAAAAAAD/+P/8//X/+f/3/+n/8//z/+L/8P80/zL/5v/n//T/6v/3/+3/9v/8//kAAwEqABcGwwdmACsAWACGAAABAAEAAQABAAEBAQABAAEAAQAAAQEBAAEAAQABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAEAAQABAQEAAAEAAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQABAAEAAQEBdv/x//L/8v/1//X/+//6AAAAAAAAAAAABgAGAAoACgAPAAcADwAHAGoAawAPAA8ADgAKAAsABgAGAAAAAAAAAAD/+//9//n/8//7//T/+v/6//P/+f+VAun/+P/v//n/8f/1//T/+v/6AAAAAAAAAAAABAADAAYACwAGAA0ABwAHABEACADUANQACAAQAAgADwALAAwABgAGAAAAAAAAAAD/+v/5//X/9v/w//D/8P8s/yz/+P/v//n/+f/z//r/9P/6//oAAAAAAAAAAAAEAAMABgALAAYADQAHAAcAEQAIANQA1AAIABAACAAPAAsADAAGAAYAAAAAAAAAAP/6//r/9P/1//H/8f/v/ywBWwAAAAYABQALAAsADQAPAA8CHAIbAA4ADwAPAAoACgAGAAMABAAAAAAAAAAA//n/+//1//X/8v/x//L95f3k//f/7//5//H/9f/8//n//v////0AAAAA/rwAAAADAAMABwAKAAwADwAPABAA1QDVAAgAEAAHAA8ACwAGAAkAAwADAAQAAAAAAAAAAP/8//3/+f/1//X/8f/x//D/K/8r//D/8P/x//X/9v/5//oAAAAABQIAAAADAAMAAwAJAAYADAAOAA8AEQDUANUACAARAAcADwALAAYACQACAAQAAwAAAAAAAAAA//3//P/6//X/9f/x//D/8P8r/yz/7//x//L/9P/0//r/+gAAAAAAAAMBKgAXBsMHZgArAFgAhgAAAQABAAEAAQABAQEAAQABAAEAAAEBAQABAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQABAAEAAQEBAAABAAABAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAEAAQEBAAEAAQABAAEBAXb/8f/y//L/9f/1//v/+gAAAAAAAAAAAAYABgAKAAoADwAHAA8ABwBqAGsADwAPAA4ACgALAAYABgAAAAAAAAAA//v//f/5//P/+//0//r/+v/z//n/lQLp//j/7//5//H/9f/0//r/+gAAAAAAAAAAAAQAAwAGAAsABgANAAcABwARAAgA1ADUAAgAEAAIAA8ACwAMAAYABgAAAAAAAAAA//r/+f/1//b/8P/w//D/LP8s//j/7//5//n/8//6//T/+v/6AAAAAAAAAAAABAADAAYACwAGAA0ABwAHABEACADUANQACAAQAAgADwALAAwABgAGAAAAAAAAAAD/+v/6//T/9f/x//H/7/8sAVsAAAAGAAUACwALAA0ADwAPAhwCGwAOAA8ADwAKAAoABgADAAQAAAAAAAAAAP/5//v/9f/1//L/8f/y/eX95P/3/+//+f/x//X//P/5//7////9AAAAAP68AAAAAwADAAcACgAMAA8ADwAQANUA1QAIABAABwAPAAsABgAJAAMAAwAEAAAAAAAAAAD//P/9//n/9f/1//H/8f/w/yv/K//w//D/8f/1//b/+f/6AAAAAAUCAAAAAwADAAMACQAGAAwADgAPABEA1ADVAAgAEQAHAA8ACwAGAAkAAgAEAAMAAAAAAAAAAP/9//z/+v/1//X/8f/w//D/K/8s/+//8f/y//T/9P/6//oAAAAAAAADASkAFwbFB2sAHwA/AF0AAAEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAQAAAQAAAQEBAAABAAABAQAAAQAAAQEBAAABAAABfv/v/+D/9f/0//MAAAAAAAAAAAANAAwACwAgABEAZwBmABIAHwALAAwADQAAAAAAAAAA//P/9P/1/+H/7v+aA77/7//g//X/9P/zAAAAAAAAAAAADQAMAAsAIAARAGcAZgASAB8ACwAMAA0AAAAAAAAAAP/z//T/9f/h/+7/mv3tAAEAEQAeAAwACwAOAAAAAAAAAAD/8v/1//X/4f/v////7//h//X/9f/yAAAAAAAAAAAADgALAAsAHwAXAAAADQAMAAwAHwASAT4BPgASACAADAALAA4AAAAAAAAAAP/y//X/9P/g/+7+wv7C/+7/4f/0//T/8wAAAAAEKgAAAA4ADAALACAAEgE+AT4AEgAgAAsADAAOAAAAAAAAAAD/8v/0//X/4P/u/sL+wv/u/+D/9f/0//IAAAAAAUsAAAAA//D/8v/z/9v/6/6Z/pj/7P/b//L/8//wAAAAAAAAABAADQANACYAFAFoAWcAFQAlAA0ADQARAAMBKQAXBsUHawAfAD8AXQAAAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEBAAABAAABAQEAAAEAAAEBAAABAAABAQEAAAEAAAF+/+//4P/1//T/8wAAAAAAAAAAAA0ADAALACAAEQBnAGYAEgAfAAsADAANAAAAAAAAAAD/8//0//X/4f/u/5oDvv/v/+D/9f/0//MAAAAAAAAAAAANAAwACwAgABEAZwBmABIAHwALAAwADQAAAAAAAAAA//P/9P/1/+H/7v+a/e0AAQARAB4ADAALAA4AAAAAAAAAAP/y//X/9f/h/+/////v/+H/9f/1//IAAAAAAAAAAAAOAAsACwAfABcAAAANAAwADAAfABIBPgE+ABIAIAAMAAsADgAAAAAAAAAA//L/9f/0/+D/7v7C/sL/7v/h//T/9P/zAAAAAAQqAAAADgAMAAsAIAASAT4BPgASACAACwAMAA4AAAAAAAAAAP/y//T/9f/g/+7+wv7C/+7/4P/1//T/8gAAAAABSwAAAAD/8P/y//P/2//r/pn+mP/s/9v/8v/z//AAAAAAAAAAEAANAA0AJgAUAWgBZwAVACUADQANABEAAwErAVwGzAcDAC4ASgBmAAABAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAAABAAEAAQABAQEAAQABAAABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAABNL/+P/w//n/+f/z//v/9f/6//3//AAAAAAAAAAAAAQAAwAGAAsACgAPAA8AEADVANUACAAPAAcAEAAKAAoABwAHAAAAAAAAAAD/+f/7//T/+//y//n/+f/x//j/K/2E/+7/4v/0//X/8wAAAAAAAAAAAA0ACwAMAB4AEgARAB8ACwALAA4AAAAAAAAAAP/y//X/9f/h/kP/7v/i//X/9P/zAAAAAAAAAAAADQAMAAsAHgASABIAHgALAAwADQAAAAAAAAAA//P/9P/1/+ID4QAAAAMAAgACAAkABQAJAA4ABgAOAAgBSQFJAAgADgAGAA0ACgAKAAYABQAAAAAAAAAA//3//f/6//f/9//y//L/8v63/rf/8f/z//P/9v/7//f//v/+//0AAAAA/XsAAAAMAAsACgAcABACHAIbABAAHAAKAAsADAAAAAD/9P/1//b/5P/w/eX95P/w/+T/9v/1//QAAAAAAAwACwAKABwAEAIcAhsAEAAcAAoACwAMAAAAAP/0//X/9v/k//D95f3k//D/5P/2//X/9AAAAwErAVwGzAcDAC4ASgBmAAABAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAAABAAEAAQABAQEAAQABAAABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAABNL/+P/w//n/+f/z//v/9f/6//3//AAAAAAAAAAAAAQAAwAGAAsACgAPAA8AEADVANUACAAPAAcAEAAKAAoABwAHAAAAAAAAAAD/+f/7//T/+//y//n/+f/x//j/K/2E/+7/4v/0//X/8wAAAAAAAAAAAA0ACwAMAB4AEgARAB8ACwALAA4AAAAAAAAAAP/y//X/9f/h/kP/7v/i//X/9P/zAAAAAAAAAAAADQAMAAsAHgASABIAHgALAAwADQAAAAAAAAAA//P/9P/1/+ID4QAAAAMAAgACAAkABQAJAA4ABgAOAAgBSQFJAAgADgAGAA0ACgAKAAYABQAAAAAAAAAA//3//f/6//f/9//y//L/8v63/rf/8f/z//P/9v/7//f//v/+//0AAAAA/XsAAAAMAAsACgAcABACHAIbABAAHAAKAAsADAAAAAD/9P/1//b/5P/w/eX95P/w/+T/9v/1//QAAAAAAAwACwAKABwAEAIcAhsAEAAcAAoACwAMAAAAAP/0//X/9v/k//D95f3k//D/5P/2//X/9AAAAwEqAjEGwAVUAC8AYACLAAABAAEAAAEAAAEAAQEBAAABAAEAAQAAAQEBAAABAAEAAAEAAAEBAQAAAQABAAEAAQEBAAEAAAEAAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAABAAABAAEBAQAAAQABAAEAAAEAAQAAAQABAAABAQEAAQABAAEAAAF+/+//8P/5//L/+//6//f//f/5AAAAAAAAAAAABAADAAcACwALAA8ACAAQAAkAZQBmAAkAEQAHAA4ADAAGAAkAAwAEAAMAAAAAAAAAAP/8//3/+v/0//X/8f/w/+//mgIR/+//8P/5//P/+v/7//b//f/6AAAAAAAAAAAAAwADAAcACwAFAA4ABwAIABEACABmAGYACAARAAcADwAMAAUACgADAAMABAAAAAAAAAAA//z//f/6//T/9P/x//D/8P+aAhH/7//w//n/8v/7//r/9v/9//oAAAAAAAAAAAADAAIABAAKAAwAEAAJABIACgASAA8ABwAPAAUADAAGAAMABAAAAAAAAAAA//z//P/5//X/7f/3/+wCMQAAAAUAAwAIAAQABQAMAAUADQAPAUwBSwAHAA8ABQANAAkACgAFAAMAAwAAAAAAAAAA//3//f/7//b//P/0//r/+v/y//n+tf60//j/8v/6//T/9v/3//r/+wAAAAAAAAAAAAUAAwAIAAQABQAMAAUADQAPAUwBSwAHAA8ABQANAAkABQAIAAIAAwADAAAAAAAAAAD//f/9//v/9v/8//T/+v/6//L/+f61/rT/+P/y//r/9P/2//f/+v/7AAAAAAAAAAAABwADAAoABgAGAA8ACAAQABMBNwE4AAgAEAAHAA4ADAAQAAgABAAFAAAAAP/4//3/9v/6//T/8P/4/+7/9/7I/sn/8v/z//P/9f/u//b/+//6AAMBKgIxBsAFVAAvAGAAiwAAAQABAAABAAABAAEBAQAAAQABAAEAAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAABAAABAAEBAQAAAQABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQAAAQAAAQABAQEAAAEAAQABAAABAAEAAAEAAQAAAQEBAAEAAQABAAABfv/v//D/+f/y//v/+v/3//3/+QAAAAAAAAAAAAQAAwAHAAsACwAPAAgAEAAJAGUAZgAJABEABwAOAAwABgAJAAMABAADAAAAAAAAAAD//P/9//r/9P/1//H/8P/v/5oCEf/v//D/+f/z//r/+//2//3/+gAAAAAAAAAAAAMAAwAHAAsABQAOAAcACAARAAgAZgBmAAgAEQAHAA8ADAAFAAoAAwADAAQAAAAAAAAAAP/8//3/+v/0//T/8f/w//D/mgIR/+//8P/5//L/+//6//b//f/6AAAAAAAAAAAAAwACAAQACgAMABAACQASAAoAEgAPAAcADwAFAAwABgADAAQAAAAAAAAAAP/8//z/+f/1/+3/9//sAjEAAAAFAAMACAAEAAUADAAFAA0ADwFMAUsABwAPAAUADQAJAAoABQADAAMAAAAAAAAAAP/9//3/+//2//z/9P/6//r/8v/5/rX+tP/4//L/+v/0//b/9//6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) format('truetype');font-weight:normal;font-style:normal}
@page{size:8.5in 11in;margin:0.1in 0 0 0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
body{font-family:'Arial',sans-serif;color:#111;width:8.5in;margin:0 auto}
.check-section{width:100%;height:3.5in;padding:0.3in 0.5in 0.25in 0.5in;position:relative;border-bottom:1px dashed #999;page-break-inside:avoid;overflow:hidden;background:linear-gradient(135deg,rgba(200,220,200,0.15) 0%,rgba(220,235,220,0.08) 25%,rgba(200,215,195,0.12) 50%,rgba(215,230,215,0.06) 75%,rgba(200,220,200,0.1) 100%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),radial-gradient(ellipse at 30% 50%,rgba(180,210,180,0.1) 0%,transparent 70%),radial-gradient(ellipse at 70% 50%,rgba(180,210,180,0.08) 0%,transparent 70%);background-color:#fcfcfa}
.check-section::before{content:'';position:absolute;inset:0;border:3px solid #4a7a4a;border-radius:2px;pointer-events:none}
.check-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:900;color:rgba(100,140,100,0.04);letter-spacing:20px;white-space:nowrap;pointer-events:none;font-family:serif}
.check-security-banner{position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#3a6a3a,#5a8a5a,#3a6a3a);color:#d4e8d4;text-align:center;font-size:7px;letter-spacing:1.5px;padding:2px 0;font-weight:600;text-transform:uppercase}
.check-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;margin-top:10px;position:relative;z-index:1}
.company-block{line-height:1.4}.company-name{font-size:13px;font-weight:700;letter-spacing:0.3px}.company-addr{font-size:10px;color:#444}
.bank-block{text-align:center;font-size:10px;color:#444;line-height:1.4}
.check-no{font-size:28px;font-weight:700;font-family:'Courier New',monospace;text-align:right;min-width:80px;position:relative;z-index:1}
.date-row{text-align:right;margin-bottom:8px;font-size:12px;position:relative;z-index:1}
.date-val{border-bottom:1px solid #444;padding:0 12px;font-style:italic}
.payto-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;position:relative;z-index:1;background:rgba(240,245,240,0.3);padding:4px 6px;border:1px solid #bbb}
.payto-label{font-size:10px;font-weight:700;white-space:nowrap}
.payto-name{flex:1;border-bottom:1px solid #444;padding:2px 8px;font-size:14px;font-weight:600}
.amount-dollars{border:2px solid #444;padding:3px 10px;font-size:15px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;background:rgba(255,255,255,0.6)}
.words-row{border-bottom:1px solid #444;padding:4px 6px;margin-bottom:6px;font-size:11px;position:relative;z-index:1;background:rgba(240,245,240,0.3)}
.vendor-addr{font-size:10px;line-height:1.5;margin-top:6px;min-height:40px;position:relative;z-index:1}
.memo-sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;position:relative;z-index:1}
.memo-row{display:flex;align-items:center;gap:6px;font-size:10px}.memo-label{font-weight:700}.memo-val{padding:2px 6px;font-size:10px}
.sig-line{width:250px;border-bottom:1px solid #444;font-size:7px;color:#111;text-align:right;padding-bottom:1px;letter-spacing:0.5px}
.stub-section{width:100%;height:3.5in;padding:0.25in 0.4in;position:relative;border-bottom:1px dashed #999;background:#fff}
.stub-section:last-child{border-bottom:none}
.stub-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.stub-company{font-size:12px;font-weight:700}.stub-date-vendor{font-size:11px;color:#333;margin-top:2px}
.stub-checkno{font-size:20px;font-weight:700;font-family:'Courier New',monospace}
.stub-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10px}
.stub-table th{text-align:left;padding:3px 6px;border-bottom:1.5px solid #333;font-weight:700;font-size:9px}
.stub-table td{padding:3px 6px;border-bottom:1px solid #ddd;font-size:10px}
.stub-table .amt{text-align:right;font-family:'Courier New',monospace}
.stub-total-row td{border-top:1.5px solid #333;font-weight:700}
.stub-footer{display:flex;justify-content:space-between;position:absolute;bottom:0.25in;left:0.4in;right:0.4in;font-size:11px}
.stub-bank{color:#444}.stub-amount{font-weight:700;font-family:'Courier New',monospace;font-size:13px}
.payment-record{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:48px;font-weight:700;color:rgba(0,0,0,0.06);letter-spacing:8px;white-space:nowrap;pointer-events:none}
@media print{body{width:8.5in;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}.check-section,.stub-section{page-break-inside:avoid}}
</style></head><body>
<div class="check-section">
  <div class="check-security-banner">CASH ONLY IF ALL SECURITY FEATURES ARE PRESENT &bull; ORIGINAL DOCUMENT HAS COLORED BACKGROUND &bull; VOID IF COPIED</div>
  <div class="check-watermark">MIDWEST</div>
  <div class="check-header"><div class="company-block"><div class="company-name">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="company-addr">21191 N Valley Rd<br>Kildeer, IL 60047<br>847-847-1865</div></div><div class="bank-block">CORNERSTONE NATL BANK AND TR CO<br>Palatine, IL 60067<br>70-2615/719</div><div class="check-no">${checkNo}</div></div>
  <div class="date-row"><span class="date-val">${dateStr}</span></div>
  <div class="payto-row"><div class="payto-label">PAY TO THE<br>ORDER OF</div><div class="payto-name">${vendorName}</div><div class="amount-dollars">$ **${amtFmt}</div></div>
  <div class="words-row">${amtWords}${'*'.repeat(Math.max(0,80-amtWords.length))} DOLLARS</div>
  <div class="vendor-addr">${vendorAddrHtml}</div>
  <div class="memo-sig-row"><div class="memo-row"><span class="memo-label">MEMO</span><span class="memo-val">Batch -- ${selectedNonCredits.length} POs</span></div><div class="sig-line">MP</div></div>
  <div style="text-align:center;margin-top:38px;position:relative;z-index:1"><div style="font-family:'MICR',monospace;font-size:14pt;letter-spacing:3px;color:#111">${micrFontStr}</div></div>
</div>
<div class="stub-section">
  <div class="stub-header"><div><div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${vendorName}</div></div><div class="stub-checkno">${checkNo}</div></div>
  <table class="stub-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="amt">Original Amount</th><th class="amt">Balance Due</th><th class="amt">Payment</th></tr></thead><tbody>${stubRows}<tr class="stub-total-row"><td colspan="3">${selectedNonCredits.length} POs</td><td></td><td>Check Amount</td><td class="amt">${amtFmt}</td></tr></tbody></table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>
<div class="stub-section" style="border-bottom:none">
  <div class="payment-record">PAYMENT RECORD</div>
  <div class="stub-header"><div><div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${vendorName}</div></div><div class="stub-checkno">${checkNo}</div></div>
  <table class="stub-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="amt">Original Amount</th><th class="amt">Balance Due</th><th class="amt">Payment</th></tr></thead><tbody>${stubRows}<tr class="stub-total-row"><td colspan="3">${selectedNonCredits.length} POs</td><td></td><td>Check Amount</td><td class="amt">${amtFmt}</td></tr></tbody></table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>
</body></html>`;
        const w=window.open('','_blank');
        if(!w){notify('Popup blocked. Please allow popups for this site and try again.','error')}
        else{w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e2){}},1000)}
        // Apply the plan: for each bill, append credit entries + the residual cash
        // payment with the check number stamped. This way the bill's Payment Trail
        // shows the credits and the check as separate entries, which makes bank-
        // statement reconciliation trivial (the cash entry matches the check; the
        // credit entries explain why the check was smaller than the bill total).
        plan.forEach(p => {
          const {bill, payAmt, creditsApplied} = p;
          const existing = typeof docStatuses[bill.billDocNum]==='object' ? docStatuses[bill.billDocNum] : {};
          const prevPayments = _getBillPayments(existing, bill.cost);
          const newEntries = [];
          creditsApplied.forEach(ca => {
            newEntries.push({date: todayIso, amount: ca.creditedAmt, checkNum: '', memo: 'Credit '+(ca.refNumber?'#'+ca.refNumber+' ':'')+'from '+ca.vendorName, method: 'credit'});
          });
          if (payAmt > 0.005) {
            newEntries.push({date: todayIso, amount: payAmt, checkNum: checkNo, memo: 'Batch check #'+checkNo, method: 'check'});
          }
          const newPayments = [...prevPayments, ...newEntries];
          const total = _sumPayments(newPayments);
          const fullyPaid = total >= bill.cost - 0.005;
          setDocStatus(bill.billDocNum,{...existing, payments: newPayments, paid: fullyPaid, checkNum: checkNo, checkPrinted: new Date().toISOString(), payDate: todayIso, vendorInvNum: bill.vendorInvNum, memo: existing.memo||'Batch check #'+checkNo, status: fullyPaid?'paid':'partial'});
        });
        // Mark applied credits as consumed.
        _consumeCreditSops(creditConsumes, todayIso);
        const creditMsg = totalCredit > 0 ? ' (with '+fmt(totalCredit)+' in credits applied)' : '';
        notify('Batch Check #'+checkNo+' printed for '+vendorName+' -- '+fmt(totalCost)+' ('+selectedNonCredits.length+' POs)'+creditMsg);
        setBillSelected(new Set());
      };
      // Print a check for an expense / reimbursement without first creating a bill.
      // Reuses the same check-number reservation logic as printBatchCheck so the
      // checkbook stays in a single monotonic sequence. After print, writes an
      // ExpenseCheck SOP (cat:'ExpenseCheck') as audit trail with the check#,
      // payee, amount, memo, and date so the expense is queryable and the check
      // number is reserved in docStatuses.
      const printExpenseCheck=()=>{
        const amt=Number(expenseForm.amount);
        const payee=(expenseForm.payee||'').trim();
        if(!payee){notify('Enter a payee','error');return}
        if(!isFinite(amt)||amt<=0){notify('Enter an amount greater than 0','error');return}
        const totalCost=amt;
        const today=new Date();const mm=String(today.getMonth()+1).padStart(2,'0');const dd=String(today.getDate()).padStart(2,'0');const yyyy=today.getFullYear();
        const useDate=expenseForm.date||(yyyy+'-'+mm+'-'+dd);
        const [dy,dm,dd2]=(useDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)||[null,yyyy,mm,dd]).slice(1);
        const dateStr=dm+'/'+dd2+'/'+dy;
        // Same check-number scheme as printBatchCheck (range, high-water, scan).
        const CHECK_MIN=1127;
        const CHECK_MAX=1999;
        const inRange=(n)=>!isNaN(n)&&n>=CHECK_MIN&&n<=CHECK_MAX;
        const allCheckNums=Object.values(docStatuses).filter(v=>v&&typeof v==='object'&&v.checkNum&&v.checkNum!=='____').map(v=>parseInt(v.checkNum)).filter(inRange);
        const usedSet=new Set(allCheckNums);
        let highWater=0;try{const hw=parseInt(localStorage.getItem('mw_check_high_water')||'0')||0;highWater=(hw>=CHECK_MIN&&hw<=CHECK_MAX)?hw:0;if(hw>CHECK_MAX){localStorage.removeItem('mw_check_high_water')}}catch{}
        const scannedMax=allCheckNums.length>0?Math.max(...allCheckNums):0;
        let nextCheck=Math.max(highWater+1,scannedMax+1,CHECK_MIN);
        while(usedSet.has(nextCheck))nextCheck++;
        const checkNo=String(nextCheck);
        try{localStorage.setItem('mw_check_high_water',String(nextCheck))}catch{}
        const payeeAddrHtml=(expenseForm.address||'').split('\n').filter(Boolean).join('<br>');
        const amtDollars=Math.floor(totalCost);const amtCents=Math.round((totalCost-amtDollars)*100);
        const amtWords=(()=>{const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];const convert=(n)=>{if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+convert(n%100):'');if(n<1000000)return convert(Math.floor(n/1000))+' Thousand'+(n%1000?' '+convert(n%1000):'');return String(n)};return convert(amtDollars)+' and '+String(amtCents).padStart(2,'0')+'/100'})();
        const amtFmt=totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        const micrCheckNum=String(checkNo).padStart(6,'0');
        const micrFontStr='C'+micrCheckNum+'C   A071926155A   C01597962C';
        const memo=(expenseForm.memo||'').trim()||'Expense';
        const html=`<!DOCTYPE html><html><head><title>Expense Check ${checkNo}</title><style>
@page{size:8.5in 11in;margin:0.1in 0 0 0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
body{font-family:'Arial',sans-serif;color:#111;width:8.5in;margin:0 auto}
.check-section{width:100%;height:3.5in;padding:0.3in 0.5in 0.25in 0.5in;position:relative;border-bottom:1px dashed #999;page-break-inside:avoid;overflow:hidden;background:linear-gradient(135deg,rgba(200,220,200,0.15) 0%,rgba(220,235,220,0.08) 25%,rgba(200,215,195,0.12) 50%,rgba(215,230,215,0.06) 75%,rgba(200,220,200,0.1) 100%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),radial-gradient(ellipse at 30% 50%,rgba(180,210,180,0.1) 0%,transparent 70%),radial-gradient(ellipse at 70% 50%,rgba(180,210,180,0.08) 0%,transparent 70%);background-color:#fcfcfa}
.check-section::before{content:'';position:absolute;inset:0;border:3px solid #4a7a4a;border-radius:2px;pointer-events:none}
.check-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:900;color:rgba(100,140,100,0.04);letter-spacing:20px;white-space:nowrap;pointer-events:none;font-family:serif}
.check-security-banner{position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#3a6a3a,#5a8a5a,#3a6a3a);color:#d4e8d4;text-align:center;font-size:7px;letter-spacing:1.5px;padding:2px 0;font-weight:600;text-transform:uppercase}
.check-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;margin-top:10px;position:relative;z-index:1}
.company-block{line-height:1.4}.company-name{font-size:13px;font-weight:700;letter-spacing:0.3px}.company-addr{font-size:10px;color:#444}
.bank-block{text-align:center;font-size:10px;color:#444;line-height:1.4}
.check-no{font-size:28px;font-weight:700;font-family:'Courier New',monospace;text-align:right;min-width:80px;position:relative;z-index:1}
.date-row{text-align:right;margin-bottom:8px;font-size:12px;position:relative;z-index:1}
.date-val{border-bottom:1px solid #444;padding:0 12px;font-style:italic}
.payto-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;position:relative;z-index:1;background:rgba(240,245,240,0.3);padding:4px 6px;border:1px solid #bbb}
.payto-label{font-size:10px;font-weight:700;white-space:nowrap}
.payto-name{flex:1;border-bottom:1px solid #444;padding:2px 8px;font-size:14px;font-weight:600}
.amount-dollars{border:2px solid #444;padding:3px 10px;font-size:15px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;background:rgba(255,255,255,0.6)}
.words-row{border-bottom:1px solid #444;padding:4px 6px;margin-bottom:6px;font-size:11px;position:relative;z-index:1;background:rgba(240,245,240,0.3)}
.vendor-addr{font-size:10px;line-height:1.5;margin-top:6px;min-height:40px;position:relative;z-index:1}
.memo-sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;position:relative;z-index:1}
.memo-row{display:flex;align-items:center;gap:6px;font-size:10px}.memo-label{font-weight:700}.memo-val{padding:2px 6px;font-size:10px}
.sig-line{width:250px;border-bottom:1px solid #444;font-size:7px;color:#111;text-align:right;padding-bottom:1px;letter-spacing:0.5px}
.stub-section{width:100%;height:3.5in;padding:0.25in 0.4in;position:relative;border-bottom:1px dashed #999;background:#fff}
.stub-section:last-child{border-bottom:none}
.stub-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.stub-company{font-size:13px;font-weight:700}.stub-date-vendor{font-size:11px;color:#333;margin-top:2px}
.stub-checkno{font-size:18px;font-weight:700;font-family:'Courier New',monospace}
.stub-table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px}
.stub-table th{background:#444;color:#fff;padding:4px 6px;text-align:left;font-weight:600;font-size:9px;letter-spacing:0.5px;text-transform:uppercase}
.stub-table td{border-bottom:1px solid #eee;padding:4px 6px}
.stub-table .amt{text-align:right;font-family:'Courier New',monospace}
.stub-total-row td{font-weight:700;border-top:2px solid #333;border-bottom:none;background:#f7f7f7}
.stub-footer{display:flex;justify-content:space-between;margin-top:6px;padding-top:4px;border-top:1px solid #ddd;font-size:10px}
.stub-bank{color:#666}.stub-amount{font-weight:700;font-family:'Courier New',monospace}
.payment-record{position:absolute;top:8px;right:0.4in;font-size:9px;font-weight:700;letter-spacing:1.5px;color:#999;text-transform:uppercase}
@font-face{font-family:'MICR';src:local('Arial Black')}
</style></head><body>
<div class="check-section">
  <div class="check-security-banner">CASH ONLY IF ALL SECURITY FEATURES ARE PRESENT &bull; ORIGINAL DOCUMENT HAS COLORED BACKGROUND &bull; VOID IF COPIED</div>
  <div class="check-watermark">MIDWEST</div>
  <div class="check-header"><div class="company-block"><div class="company-name">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="company-addr">21191 N Valley Rd<br>Kildeer, IL 60047<br>847-847-1865</div></div><div class="bank-block">CORNERSTONE NATL BANK AND TR CO<br>Palatine, IL 60067<br>70-2615/719</div><div class="check-no">${checkNo}</div></div>
  <div class="date-row"><span class="date-val">${dateStr}</span></div>
  <div class="payto-row"><div class="payto-label">PAY TO THE<br>ORDER OF</div><div class="payto-name">${payee}</div><div class="amount-dollars">$ **${amtFmt}</div></div>
  <div class="words-row">${amtWords}${'*'.repeat(Math.max(0,80-amtWords.length))} DOLLARS</div>
  <div class="vendor-addr">${payeeAddrHtml}</div>
  <div class="memo-sig-row"><div class="memo-row"><span class="memo-label">MEMO</span><span class="memo-val">${memo}</span></div><div class="sig-line">MP</div></div>
  <div style="text-align:center;margin-top:38px;position:relative;z-index:1"><div style="font-family:'MICR',monospace;font-size:14pt;letter-spacing:3px;color:#111">${micrFontStr}</div></div>
</div>
<div class="stub-section">
  <div class="stub-header"><div><div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${payee}</div></div><div class="stub-checkno">${checkNo}</div></div>
  <table class="stub-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="amt">Amount</th></tr></thead><tbody><tr><td>${dateStr}</td><td>Expense</td><td>${memo}</td><td class="amt">${amtFmt}</td></tr><tr class="stub-total-row"><td colspan="3">Expense Check</td><td class="amt">${amtFmt}</td></tr></tbody></table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>
<div class="stub-section" style="border-bottom:none">
  <div class="payment-record">PAYMENT RECORD</div>
  <div class="stub-header"><div><div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div><div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${payee}</div></div><div class="stub-checkno">${checkNo}</div></div>
  <table class="stub-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="amt">Amount</th></tr></thead><tbody><tr><td>${dateStr}</td><td>Expense</td><td>${memo}</td><td class="amt">${amtFmt}</td></tr><tr class="stub-total-row"><td colspan="3">Expense Check</td><td class="amt">${amtFmt}</td></tr></tbody></table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>
</body></html>`;
        const w=window.open('','_blank');
        if(!w){notify('Popup blocked. Please allow popups for this site and try again.','error')}
        else{w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e2){}},1000)}
        // Audit-trail SOP: ExpenseCheck cat. Records check#, payee, amount, date,
        // memo. Surfaced nowhere in the UI yet (separate from bills) but queryable
        // by Brain and reserves the check# so future batch checks don't collide.
        const id='EXP-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
        const expData={payee, amount: amt, date: useDate, memo, address: expenseForm.address||'', checkNum: checkNo, createdAt: new Date().toISOString()};
        addSop({id, title:'Expense Check #'+checkNo+' '+payee+' '+fmt(amt), cat:'ExpenseCheck', icon:'dollar', content:JSON.stringify(expData), custom:true});
        // Also stamp the check# into docStatuses under a synthetic key so the
        // printBatchCheck scanner sees it (its scan only looks at v.checkNum on
        // docStatuses values). Use the SOP id as the docStatuses key.
        setDocStatus(id, {checkNum: checkNo, checkPrinted: new Date().toISOString(), payDate: useDate, memo, status:'paid'});
        notify('Expense Check #'+checkNo+' printed for '+payee+' -- '+fmt(amt));
        setShowExpenseCheck(false);
        setExpenseForm({payee:'',amount:'',memo:'',date:'',address:''});
      };
      const saveBillDetail=(bill)=>{const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};setDocStatus(bill.billDocNum,{...existing,vendorInvNum:billInvNum,checkNum:billCheckNum,payDate:billPayDate,memo:billMemo,paid:existing.status==='paid'||!!billPayDate});notify('Bill updated: '+bill.vendorName);setBillDetail(null)};
      // PAYMENT HISTORY MUTATORS
      // ------------------------
      // Append/remove/edit individual payments on a bill. All three write the full
      // updated payments[] back to docStatuses and recompute paid/status from the new
      // running total. The display-default flat fields (payDate, checkNum, memo) get
      // resynced to the most recent payment so other UI surfaces stay consistent.
      const _persistPayments = (bill, newPayments) => {
        const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
        const total = _sumPayments(newPayments);
        const fullyPaid = total >= bill.cost - 0.005;
        const last = newPayments.length > 0 ? newPayments[newPayments.length-1] : null;
        setDocStatus(bill.billDocNum, {
          ...existing,
          payments: newPayments,
          paid: fullyPaid,
          status: fullyPaid ? 'paid' : (newPayments.length>0 ? 'partial' : 'unpaid'),
          payDate: last?.date || '',
          checkNum: last?.checkNum || '',
          memo: last?.memo || existing.memo || ''
        });
        // CRITICAL: also refresh the open bill detail panel with the new derived
        // state. setDocStatus triggers a re-render, but billDetail still holds the
        // STALE bill snapshot from when the panel was opened, so the Payment Trail
        // would display old payments[] / balance / isPartiallyPaid until the user
        // closes and reopens. Patching billDetail here makes Edit/Add/Remove
        // changes appear immediately in the same panel.
        if (billDetail && billDetail.billDocNum === bill.billDocNum) {
          const newBalance = Math.max(0, bill.cost - total);
          const newIsPartial = total > 0.005 && !fullyPaid;
          setBillDetail({
            ...bill,
            payments: newPayments,
            totalPaid: total,
            balance: newBalance,
            isPartiallyPaid: newIsPartial,
            paid: fullyPaid,
            payDate: last?.date || '',
            checkNum: last?.checkNum || ''
          });
          // Also re-seed the Record-a-Payment form's Amount input to the new balance,
          // so when an Edit reopens the balance (e.g., legacy correction drops paid
          // from $4678 down to $2230, opening a $2448 balance) the form is ready to
          // fill in for the next check rather than holding the old (zero) value.
          setBillPayAmount(newBalance > 0.005 ? String(newBalance.toFixed(2)) : '');
          setBillPayInputDate(new Date().toISOString().split('T')[0]);
        }
      };
      const addPayment = (bill, {date, amount, checkNum, memo, method, vendorInvNum}) => {
        // Standalone bills don't use payment history -- they're flat single records.
        // Just toggle their flat paid flag via the existing path.
        if (bill._standalone) {
          const sop=(customSops||[]).find(s=>s.id===bill._sopId);
          if(!sop){notify('Record not found','error');return}
          let d={};try{d=JSON.parse(sop.content||'{}')}catch{}
          const updated={...d,paid:true,payDate:date||new Date().toISOString().split('T')[0],checkNum:checkNum||d.checkNum||''};
          addSop({id:sop.id,title:sop.title,cat:sop.cat,icon:sop.icon,content:JSON.stringify(updated),custom:true});
          notify('Standalone bill marked paid: '+(d.vendorName||'vendor'));
          return;
        }
        const amt = Number(amount)||0;
        if (amt <= 0) { notify('Payment amount must be greater than zero','error'); return; }
        const newPayment = {
          date: date || new Date().toISOString().split('T')[0],
          amount: amt,
          checkNum: checkNum || '',
          vendorInvNum: vendorInvNum || '',
          memo: memo || '',
          method: method || 'check'
        };
        const newPayments = [...(bill.payments||[]), newPayment];
        _persistPayments(bill, newPayments);
        const total = _sumPayments(newPayments);
        const fullyPaid = total >= bill.cost - 0.005;
        notify('Payment recorded: '+fmt(amt)+(fullyPaid?' >> bill fully paid':' >> '+fmt(bill.cost-total)+' remaining'));
      };
      const removePayment = (bill, idx) => {
        if (bill._standalone) { notify('Standalone bills do not have payment history','error'); return; }
        const cur = bill.payments || [];
        if (idx<0 || idx>=cur.length) return;
        const newPayments = cur.filter((_,i)=>i!==idx);
        _persistPayments(bill, newPayments);
        notify('Payment removed');
      };
      const editPayment = (bill, idx, patch) => {
        if (bill._standalone) { notify('Standalone bills do not have payment history','error'); return; }
        const cur = bill.payments || [];
        if (idx<0 || idx>=cur.length) return;
        const updated = {...cur[idx], ...patch};
        // Clear isLegacy flag once the user has touched/confirmed the entry
        if (cur[idx].isLegacy) delete updated.isLegacy;
        if (updated.method === 'legacy') updated.method = 'check';
        updated.amount = Number(updated.amount)||0;
        const newPayments = cur.map((p,i)=>i===idx?updated:p);
        _persistPayments(bill, newPayments);
        notify('Payment updated');
      };


      // Detail view for a single bill
      if(billDetail){const bill=billDetail;const pos=genPOs?genPOs(bill.job):[];const thisPO=pos.find(p=>p.docNum===bill.poDocNum);
        const billData=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
        const currentStatus=billData.status||(bill.paid?'paid':(billData.checkPrinted||billData.checkNum)?'check_sent':'unpaid');
        const isVoid=currentStatus==='void';
        const setBillStatus=(newStatus)=>{
          const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
          setDocStatus(bill.billDocNum,{...existing,status:newStatus,paid:newStatus==='paid',vendorInvNum:billInvNum||existing.vendorInvNum||'',checkNum:billCheckNum||existing.checkNum||'',payDate:newStatus==='paid'?(billPayDate||new Date().toISOString().split('T')[0]):(existing.payDate||''),memo:billMemo||existing.memo||''});
          notify('Status changed to '+newStatus+': '+bill.vendorName);
          setBillDetail({...bill,paid:newStatus==='paid'});
        };
        const printCheck=(bill2)=>{
          try{
          const today=new Date();const mm=String(today.getMonth()+1).padStart(2,'0');const dd=String(today.getDate()).padStart(2,'0');const yyyy=today.getFullYear();
          const dateStr=mm+'/'+dd+'/'+yyyy;
          // Strict check-number assignment per spec:
          // (1) If this bill already has a saved checkNum >=1127, reuse it (reprint).
          // (2) Otherwise, auto-assign the next sequential number, with a high-water
          //     mark stored in localStorage that survives React state races.
          // The auto-computed number is the MAX of: (scanned max + 1), (high-water + 1), 1127.
          // Maureen's physical checkbook starts at 1127 and will never exceed ~9999.
          // Anything outside [1127, 9999] in stored data is legacy/test-pollution
          // (e.g. 767498) and must be ignored when computing the next number.
          const CHECK_MIN=1127;
          const CHECK_MAX=1999;
          const inRange=(n)=>!isNaN(n)&&n>=CHECK_MIN&&n<=CHECK_MAX;
          const ownDocNum=bill2.billDocNum;
          const ownStored=docStatuses[ownDocNum];
          const ownStoredCheckNum=(ownStored&&typeof ownStored==='object'&&ownStored.checkNum&&ownStored.checkNum!=='____')?parseInt(ownStored.checkNum):NaN;
          const usedByOthers=Object.entries(docStatuses).filter(([k,v])=>k!==ownDocNum&&v&&typeof v==='object'&&v.checkNum&&v.checkNum!=='____').map(([k,v])=>parseInt(v.checkNum)).filter(inRange);
          const usedSet=new Set(usedByOthers);
          // Drop any stale localStorage high-water mark above CHECK_MAX (legacy pollution).
          let highWater=0;try{const hw=parseInt(localStorage.getItem('mw_check_high_water')||'0')||0;highWater=(hw>=CHECK_MIN&&hw<=CHECK_MAX)?hw:0;if(hw>CHECK_MAX){localStorage.removeItem('mw_check_high_water')}}catch{}
          let checkNo;
          if(inRange(ownStoredCheckNum)&&!usedSet.has(ownStoredCheckNum)){
            // Reprint: reuse this bill's own previously assigned (in-range) number
            checkNo=String(ownStoredCheckNum);
          }else{
            // First print: scan in-range numbers + high-water + 1127 floor
            const scannedMax=usedByOthers.length>0?Math.max(...usedByOthers):0;
            let nextCheck=Math.max(highWater+1,scannedMax+1,CHECK_MIN);
            while(usedSet.has(nextCheck))nextCheck++;
            checkNo=String(nextCheck);
            // Bump high-water mark IMMEDIATELY so any subsequent print (even before
            // React state updates) gets the next number, not the same one.
            try{localStorage.setItem('mw_check_high_water',String(nextCheck))}catch{}
          }
          setBillCheckNum(checkNo);
          // Check amount = current payment form input, defaulting to remaining balance.
          // For partial-paid bills, this prints a check for the balance only (matches
          // what gets recorded as the next payment). Falls back to bill.cost only for
          // edge cases where balance is somehow undefined.
          const _payAmtNum = Number(billPayAmount);
          const costVal = (isFinite(_payAmtNum) && _payAmtNum > 0)
            ? _payAmtNum
            : (typeof bill2.balance==='number' && bill2.balance>0 ? bill2.balance : (Number(bill2.cost)||0));
          const amtDollars=Math.floor(costVal);const amtCents=Math.round((costVal-amtDollars)*100);
          const amtWords=(()=>{const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
            const convert=(n)=>{if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+convert(n%100):'');if(n<1000000)return convert(Math.floor(n/1000))+' Thousand'+(n%1000?' '+convert(n%1000):'');return String(n)};
            return convert(amtDollars)+' and '+String(amtCents).padStart(2,'0')+'/100';
          })();
          const amtFmt=costVal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
          const vendorAddr=bill2.vendor?(bill2.vendor.contact?(bill2.vendor.contact+'\n'):'')+(bill2.vendorName||'')+'\n'+(bill2.vendor.address||''):(bill2.vendorName||'');
          const vendorAddrHtml=vendorAddr.split('\n').filter(Boolean).join('<br>');
          const billDate=bill2.payDate||bill2.poDate||dateStr;
          const refNum=bill2.vendorInvNum||billInvNum||bill2.poDocNum||'';
          // MICR line matching Maureen's Cornerstone Bank check exactly
          const micrCheckNum=String(checkNo).padStart(6,'0');
          // MICR E-13B line rendered as inline SVG with precise character paths
          // Each character matches the ANSI X9.27 E-13B specification proportions
          // MICR E-13B: provide both MICR Encoding font chars (A=Transit, C=On-Us) and Unicode fallback
          // If MICR Encoding font is installed: A renders as ⑈, C renders as ⑆
          // If no MICR font: Unicode symbols ⑈⑆ render directly
          const micrFontStr='C'+micrCheckNum+'C   A071926155A   C01597962C';
          const micrUnicodeStr='\u2448'+micrCheckNum+'\u2448   \u2446071926155\u2446   \u244801597962\u2448';
          // Use system-installed MICR font with comprehensive fallback chain
          // Two lines: MICR font version on top (visible if font installed), Unicode fallback hidden behind
          const micrHtml='<div style="text-align:center;margin-top:38px;position:relative;z-index:1"><div style="font-family:\'MICR\',monospace;font-size:14pt;letter-spacing:3px;color:#111">'+micrFontStr+'</div></div>';
          const html=`<!DOCTYPE html><html><head><title>Check ${checkNo}</title><style>
@font-face{font-family:'MICR';src:url(data:font/truetype;base64,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8v/x//T+t/64//z/9P/6//v/8v/7//v/+P/8//3//AAAAAAAAAAAAAQAAwADAAkABAAEAA4ABwAPAAwACQAIAAoACQADAA0ABwAGAA8ABQAEAAoAAwAGAAAAAAAAAAD//P/8//3/9//7//v/8v/5//n/9P/9/+//7v/7//L/+f/6//L/+//7//f//f/9//wAAAAAAAAAAAAEAAMAAwAKAAUACQAMAAYADwAIADcANwA3ADYABgAPAAYABwAOAAUABgAIAAMABwcH/lD+T//0/+f/9P/1/+r/+P/4//L/+//8//oAAAAAAAAAAP////3/+f/p//v/9v/7//X/8/66/rr/+f/x//r/8//2//T/+f/5AAAAAAAAAAAAAwADAAMACAAGAAQADgAHAAYADgAFAUkBSQAGAA8ABgAHAA0ABAAFAAoAAwAHAAAAAAAAAAAAAAAAAAUAAwADAAoABQAFAAwABgAMAAkBSAFIAAcADQAGAAYADAAEAAUACQADAAMABAAAAAAAAAAAAAQAAwADAAkABQAFAA4ABgAHAA4ABgA6ADoACgAPAAYABgAMAAUACQAHAAMABAAAAAAAAAAAAAAAAP/8//3//f/4//v/+v/z//r/8gAAAQOqABkGzgdsAIYAAAEBAQABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAQABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAQAAAQAAAQABAAEAAQABAAP4AUMBQwAPAA0ADgALAA0ADAABAAH//wAAAAAAAAAA//v//f/5//X/+//0//r/+v/y//j/LP8r/+j/6f/p/+7/9//x//r/+//6AAAAAAAAAAAABQAEAAUADQAHABAAGQAMABYACQDaANoADwAcAAoACwAOAAAAAP/1//b/9v/j/+7+vv69//P/8f/5//L/+v/7//b//f/5AAD//wAAAAAABAAEAAMACwAFAAYADgAHAA8ACgDVANYADAAXAAwAGAARAAgADAAEAAUABQAAAAAAAAAA//v//P/3/+3/+v/t//X/9v/o//X/J/8o//f/8f/5//L/+v/6//f//P/5AAAAAAAHAAgADAALAA4AEAdsAAAAAAAA//r/+f/1//P/6//5//n/+P///k7+Tv/8//L/+v/y//b/+//2//3//P/8AAAAAAAAAAD/9v/2/+3/9//s//T/9f/p//X/Kf8q//b/6f/1//b/6v/4/+3/9f/7//kAAAAAAAAAAP/x//X/9P/i//D/8P/g//T/9P/wAAAAAAAAAAAACAADAAoABQAGAA4ABwAPAAwBrwGvAAcAEQAHAAgADQAFAAYACgACAAcAAAAAAAAAAAAHAAUACwAUAAgAFQAKAAsAGAAMANMA0gALABcADAAWABUABwAPAAUABgAIAAAAAAAAAAAABwADAAoABgAFAA8ABwAQAA8AEAASABEADAAMAAYABgAAAQLVABgGygdtAI8AAAEBAQAAAQABAAABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQABAAEAAQEBAAABAAABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAMgAUYBRgAGAA4ABwAOAAwABgAKAAMABwAA//8AAAAAAAQAAwAHAA0ABgAQAAgACQATAAsAHgAeAAQACwAEAAoABwAHAAQAAgADAAAAAAAAAAD//f/+//r/+f/5//D/+P/4//L/+/5T/lP/9f/m//T/9f/uAAAAAAASAA0ADAAaAAgA2gDbAAQAFgAMAA0AGQAHAAkADQAFAAUABQAAAAAAAAAA//r/+//2/+7/8P/q/+r/5v8p/yn/6v/g//f/9//4AAAAAQAOAAoACwAdAA8A1gDXAA4AGAALABYAEgAJAA4ABAAFAAUAAAABAAIAAP/7//z//P/z//j/9f/m//T/8//n//b/Kf8p//X/5v/1//T/8AAAAAAAEAAMAAsAGgdtAAAAAAAA//3//f/6//X/+//0//r/8//z/n7+fv/3/+r/9//r/+7/+P/x//z/+//5AAAAAP//AAD//P/9//r/9v/3//P/+v/0//v+gf6B//r/9P/6//P/9//4//T//P/7//sAAAAAAAAAAAAKAAoACgAhABcAGgAiAAkACQAHAAAAAAABAAAABgAFAAUADwAJAAgAFQALAAoAFgAKANcA1wAMABgACwAZABIAEgAKAAsAAAAAAAAAAAAVAA4ADgAdAAkAEQAgAAsACwAOAAAAAAAAAAAABgAFAAkAEgAJABcACwAMABsADQDPANAADgAYAAoACgATAAkADAASAAYABQAFAAAAAAAAAAAACgAKAAoAIQAXABcAIQAKAAsACQABAf4AGQbPB20AewAAAQABAAABAAABAAABAQEAAAEAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAABAAABAAABAQEAAQABAAABAAEBAQABAAEAAAEAAAEBAQABAAABAAEAAQEBAAABAAABAAABAAEBAQABAAABAAABAAEBAQAAAQABAAABAAABAQMrAAwADgAGAA4ABgAFAAoABAAEAAQAAAAAAAAAAAAFAAUACgAUAAgAFQALABYAFQB0AHUACQAXAAsACwAWAAgACQANAAQACQAAAAAAAAAAAAMAAwACAAkABQAEAA4ABgAHAA0ABQB1AHYACgAMAA0ACwAGAAoAAgAIAAD//wAAAAD/+v/6//b/+//y//r/+f/x//n/kv+S//L/8P/5//L/+v/1//n/+QAAAAAAAAAA//n//P/7//H/+P/3/+z/9f/r/+v+uv66//P/8P/4//H/+f/8//n//f/6//4AAAAAAAAABAACAAYADAAHABAABwAHAA0ABABwB20AAP/5//3/9//6//v/8v/6//n/8f/5/ef95//1/+f/9P/n/+z/9//y//z/9gAAAAAAAAAAAAUAAwAEAA0ABwAJABUACgAXABQAEQAQAAcADQAGAAYADAAEAAUABgACAAIAAgAAAAAAAAAA//r/+f/1//v/8//6//L/9P65/rr/9P/y//P/9f/6//X//P/8//wAAAAAAAAAAAAHAAMACgAFAAsADwAOAAoAcQBxAAoAFgALAAwAFAAJAAgADgAEAAkAAAABAAAAAAAHAAQACwAIAAQACwAFAA0ADQKAAn8ACwAUAAkAEgAMAAYADAADAAQABQAAAAAAAQLRABcGzQdtAH8AAAEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAABAQEAAQABAAABAAABAQEAAQAAAQAAAQAAAQEBAAABAAABAAEAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAEBAQAAAQABAAABAAEBAQAAAQABAAABAAEBBnoADgAeAAsADAAPAAAAAf/u//T/9P/j//f+wv7D//b/6P/1//X/6//3/+v/9f/7//kAAAABAAAAAAAJAAkAEAAJABUACwAMABoADgE/AUAADQAOAAcADgAFAAYACQACAAQAAwAAAAAAAAAA//z//f/9//j//P/0//D/8f/y/lL+Uv/z/+T/9P/1//EAAAAA//8ABgAGACMAJAFAAT8ACwAYAAsACwAWAAkAEQAKAAUABgAAAAAAAAAA//r/+v/7/+//9//3/+z/9v/r/+7+vv6+//r/8f/5//H/8//7//b//f/5AAAAAAAAAAEABQADAAYADAAEAA0ABgAPABABqwdsAAD/9//1//b/3//q/+n/3//2//b/9QAAAAAAAQAA//r/+//7//L/9//u/+j/9f/o//X/LP8s/+3/6v/q/+7/9v/u//r/+f/4AAAAAAAAAAD/+f/9//X/+//6//P/+v/5//L/+f5Q/k//+P/w//v/+f/1//v/8v/4//kAAAAAAAAAAAAPAAsADAAeABAAEwAhAAsADAAOAAAAAAAAAAAABgAFAAYADgAJAA8AFgAKABgADADbANoACQAWAAsACwAWAAkACAAOAAUACQAAAAAAAAAAAAUAAwAHAAwABQAOAAYADwANAbEBsAAHAA4ABwANAAwABAAJAAQABwADAAAAAgH9ABgGzAdtAG0AjQAAAQAAAQAAAQAAAQABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAEBAQABAAABAAABAAABAQEAAAEAAQABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAATSAAcAEgAHAAkADgAGAAUACQADAAYAAAAAAAAAAP/x//T/9P/h//D/7v/h//T/9P/xAAAAAP//AAD/+v/8//v/8f/3/+3/6v/n/+r/mv+Z/+j/6f/0/+v/9//3//D/+//6//oAAAABAAAAAAAFAAQACQAQABIAGAAMABoADgGqAaoADQAdAAsACwAPAAAAAAAAAAD/+//+//3/9v/7//r/8//5//r/8f/5/en95//6//D/+f/5//H/+v/2//r//f/9AAAAAP//AAAABQADAAcACwAMAA8ADwAMAUP/lwE8ATwAGgAuABAAEQAVAAAAAAAAAAD/6//v//D/0v/m/sT+xP/m/9L/7//w/+wAAAAAAAAAAAAUABAAEQAuB20AAP/7//z//P/0//n/+v/z//r/8v/z/17/Xv/v/+P/9f/2//QAAAAAAAYACAAIACAAGQA1ADQACgAYAAsADAAYAAkAEgALAAsAAAAAAAAAAP/2//v/8v/3//f/6f/1//T/5//1/r/+wP/2/+v/9f/q/+7/7P/1//r/+QAAAAAAAAAA//H/9f/1/+X/8/68/rv/+v/x//n/+f/y//r/+v/2//3//P/8AAAAAAAAAAAABQAEAAMACwAGAAsADQAHAA0ABwNZA1oABwAQAAYADgAMAAwABwAHAAAAAflWAAAAAAAAABYAEgASADIAHABhAGEAHAAyABIAEgAVAAAAAAAAAAD/6//u/+7/zv/k/5//n//k/87/7v/u/+oAAQLYABcG1AdtAIUAAAEAAAEAAAEAAAEAAAEBAQAAAQABAAABAAABAQEBAQAAAQABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAEBAQAAAQAAAQAAAQABAQEAAQABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAAAQABAAEBBngACgATAAgACAAPAAYABwAJAAMAAwAEAAAAAP//AAD//wAA//7/+//+//j/+//8//f/+/+z/7P/s/+z//j/8f/5//L/9v/8//f//v/+//wAAAABAAAAAP/x//T/9P/h/+//8P/g//T/8//xAAAAAAAAAAAABAACAAQACAAFAAUADAAFAAYADAAEAI0AjAAHABMACQAJABEABQACAAQAAAACAAAAAAAAAAD/+//8//z/8f/4//f/6v/0/+f/6P8u/y//7P/p/+n/7//3//D/+//7//sAAAAAAAAAAP/z//X/9f/j/+//6v/d//X/9P/0AAAAAAABAAAABAAEAAQACwAGAA0ADwAPABEBowdtAAD//P/9//z/9v/7//r/8v/6//n/8P/5/pz+nP/8//T/+v/z//b/+//2//3//P/5//7/3P/d/9z/3P/9//f/+//2//X/+v/z//r/+v/z//r+pP6k/+r/4f/3//b/9wAAAAAAEAALAAsAHQAOAZsBmwAHAA0ABgAHAA0ABQAFAAsABAAEAAcAAgA/AD4AAwAIAAUABQAQAAwAAwAKAAQACgAMALkAuQALABcADAAMABYACQAKABIABQANAAAAAAAAAAD/9f/2/+//9v/o//X/8//m//X/lv+X//H/4//1//T/8v////8AEgANAA0AHQAKANMA0gAPABYABwAIAAwABwAMAAYABwAAAAAAAwEhABkG0wd5AB8APwCqAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAEAAQAAAQABAQEAAAEAAAEAAAEAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQABAQEBAQAAAQAAAQABAAABAQEBAQAAAQAAAQAAAQADHQDcAN0AFwAqAA8ADwASAAAAAAAAAAD/7v/x//H/1v/p/yP/JP/o/9f/8f/x/+0AAAAAAAAAAAATAA8ADwApAB4A1gDXABgALAAQABEAEwAAAAAAAAAA/+3/7//w/9T/6P8p/yr/5//V/+//8P/tAAAAAAAAAAAAEwAQABEAK/4XAAAAAAAAAAcABQALAAcAEAAIABEADwAdAB0ABQAOAAYABwAPAAYABgAKAAQACAAAAAAAAAAAAAUABAAEAAoABgAFABAABgAHAAwAAgGqAaoADwARAAgAEgAHAAwADAADAAIAAQAAAAAAAAAAAAUAAwADAAsABQAFAAwABwAIABAACAAZABoACAAPAAYABgAMAAYACwAFAAYAAP//AAAAAAAAAAD/+//9//z/9v/6//P/8f/4//D/+P7C/sL+w/7C//f/7v/3//f/8P/5//n/9f/8//gEKQAAAAAAAAASABAAEAArABkA1ADUABkAKwAQABAAEwAAAAAAAAAA/+3/8P/w/9X/5/8s/yz/5//V//D/8P/u/KsAAAAAAAAAEwAPABAAKwAYAOAA3wAYACsAEAAPABMAAAAAAAAAAP/t//H/8f/U/+j/If8g/+j/1f/w//H/7f+mAYsBiwAMAAsACgAIAAUACgADAAYAAAAAAAAAAAAGAAMABAALAAYABgAMAAYADQAKAX4BfwAJABMACAAIABAABQAGAAsAAwAEAAQAAAAAAAEAAP/2//v/9P/4//X/6f/3//f/8v/8/ob+h//5//H/+v/5//T/+//8//j//P/9//sAAAAAAAAAAP/7//z//f/2//z/9v/y//H/8/8m/yX/Vf9V//j/7//4//j/8P/5//H/+f/8//sAAAAAAAAAAAAAAAAABgAEAAQADAAHAAcAEAAIABIAAAICAAAZBtMHbwBLAH8AAAEBAQABAAEAAAEAAAEBAQAAAQAAAQABAAEBAQAAAQAAAQABAAEBAQABAAABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAQAAAQEBAAABAAABAAABAAABAQEAAQAAAQAAAQAAAQEBAAEAAAEAAQAAAloCDgIPABMAEAAQAA0ABgALAAMAAwAFAAAAAAAAAAD//f/9//3/+P/7//T/7f/u/+z/lv+X//r/8f/5//r/8f/7//X/+f/6AAAAAAAAAAD/9v/8//L/+P/3/+r/9f/0/+f/9P7B/sH/9//s//j/7//z//v/9//+//3//AAAAAAAAAAAAAUABAADAAsABwAGAA4ABwAIABEA2wE5ATkADQAbAAsADAAVAAkAEgAKAAUABgAAAAAAAAAA//r/+//8//H/9//3/+v/9P/1/+X/8/7H/sf/6P/r//X/7f/3//b/7f/6//r/+QAAAAAAAAAAAAoABQAPAAkAEwAWAAwAGgdvAAAAAAAA//n/+f/z//r/8f/4//n/7v/2/K78rv/4//H/+f/5//L/+//y//j/9wAAAAAAAAAAAAQABAAEAAsABQAKAA0ADAAMAUMBQgAZABgACwAVAAgACgARAAUABQAHAAAAAAAAAAAABAAEAAcADwAFAA8ACAAIABAABwGnAacACgATAAgACAAPAAYABgAJAAIAAwAE/KwAAAAAAAAABgAFAAUADwAJABIAGAAMABoADgDOAMwADgAbAAwADAAVAAkACQAPAAUABQAFAAAAAAAAAAD/+P/8//X/+f/3/+n/8//z/+L/8P80/zL/5v/n//T/6v/3/+3/9v/8//kAAwEqABcGwwdmACsAWACGAAABAAEAAQABAAEBAQABAAEAAQAAAQEBAAEAAQABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAEAAQABAQEAAAEAAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQABAAEAAQEBdv/x//L/8v/1//X/+//6AAAAAAAAAAAABgAGAAoACgAPAAcADwAHAGoAawAPAA8ADgAKAAsABgAGAAAAAAAAAAD/+//9//n/8//7//T/+v/6//P/+f+VAun/+P/v//n/8f/1//T/+v/6AAAAAAAAAAAABAADAAYACwAGAA0ABwAHABEACADUANQACAAQAAgADwALAAwABgAGAAAAAAAAAAD/+v/5//X/9v/w//D/8P8s/yz/+P/v//n/+f/z//r/9P/6//oAAAAAAAAAAAAEAAMABgALAAYADQAHAAcAEQAIANQA1AAIABAACAAPAAsADAAGAAYAAAAAAAAAAP/6//r/9P/1//H/8f/v/ywBWwAAAAYABQALAAsADQAPAA8CHAIbAA4ADwAPAAoACgAGAAMABAAAAAAAAAAA//n/+//1//X/8v/x//L95f3k//f/7//5//H/9f/8//n//v////0AAAAA/rwAAAADAAMABwAKAAwADwAPABAA1QDVAAgAEAAHAA8ACwAGAAkAAwADAAQAAAAAAAAAAP/8//3/+f/1//X/8f/x//D/K/8r//D/8P/x//X/9v/5//oAAAAABQIAAAADAAMAAwAJAAYADAAOAA8AEQDUANUACAARAAcADwALAAYACQACAAQAAwAAAAAAAAAA//3//P/6//X/9f/x//D/8P8r/yz/7//x//L/9P/0//r/+gAAAAAAAAMBKgAXBsMHZgArAFgAhgAAAQABAAEAAQABAQEAAQABAAEAAAEBAQABAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQABAAEAAQEBAAABAAABAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAEAAQEBAAEAAQABAAEBAXb/8f/y//L/9f/1//v/+gAAAAAAAAAAAAYABgAKAAoADwAHAA8ABwBqAGsADwAPAA4ACgALAAYABgAAAAAAAAAA//v//f/5//P/+//0//r/+v/z//n/lQLp//j/7//5//H/9f/0//r/+gAAAAAAAAAAAAQAAwAGAAsABgANAAcABwARAAgA1ADUAAgAEAAIAA8ACwAMAAYABgAAAAAAAAAA//r/+f/1//b/8P/w//D/LP8s//j/7//5//n/8//6//T/+v/6AAAAAAAAAAAABAADAAYACwAGAA0ABwAHABEACADUANQACAAQAAgADwALAAwABgAGAAAAAAAAAAD/+v/6//T/9f/x//H/7/8sAVsAAAAGAAUACwALAA0ADwAPAhwCGwAOAA8ADwAKAAoABgADAAQAAAAAAAAAAP/5//v/9f/1//L/8f/y/eX95P/3/+//+f/x//X//P/5//7////9AAAAAP68AAAAAwADAAcACgAMAA8ADwAQANUA1QAIABAABwAPAAsABgAJAAMAAwAEAAAAAAAAAAD//P/9//n/9f/1//H/8f/w/yv/K//w//D/8f/1//b/+f/6AAAAAAUCAAAAAwADAAMACQAGAAwADgAPABEA1ADVAAgAEQAHAA8ACwAGAAkAAgAEAAMAAAAAAAAAAP/9//z/+v/1//X/8f/w//D/K/8s/+//8f/y//T/9P/6//oAAAAAAAADASkAFwbFB2sAHwA/AF0AAAEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAQAAAQAAAQEBAAABAAABAQAAAQAAAQEBAAABAAABfv/v/+D/9f/0//MAAAAAAAAAAAANAAwACwAgABEAZwBmABIAHwALAAwADQAAAAAAAAAA//P/9P/1/+H/7v+aA77/7//g//X/9P/zAAAAAAAAAAAADQAMAAsAIAARAGcAZgASAB8ACwAMAA0AAAAAAAAAAP/z//T/9f/h/+7/mv3tAAEAEQAeAAwACwAOAAAAAAAAAAD/8v/1//X/4f/v////7//h//X/9f/yAAAAAAAAAAAADgALAAsAHwAXAAAADQAMAAwAHwASAT4BPgASACAADAALAA4AAAAAAAAAAP/y//X/9P/g/+7+wv7C/+7/4f/0//T/8wAAAAAEKgAAAA4ADAALACAAEgE+AT4AEgAgAAsADAAOAAAAAAAAAAD/8v/0//X/4P/u/sL+wv/u/+D/9f/0//IAAAAAAUsAAAAA//D/8v/z/9v/6/6Z/pj/7P/b//L/8//wAAAAAAAAABAADQANACYAFAFoAWcAFQAlAA0ADQARAAMBKQAXBsUHawAfAD8AXQAAAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEAAAEAAAEBAQAAAQAAAQEBAAABAAABAQEBAAABAAABAQEAAAEAAAEBAAABAAABAQEAAAEAAAF+/+//4P/1//T/8wAAAAAAAAAAAA0ADAALACAAEQBnAGYAEgAfAAsADAANAAAAAAAAAAD/8//0//X/4f/u/5oDvv/v/+D/9f/0//MAAAAAAAAAAAANAAwACwAgABEAZwBmABIAHwALAAwADQAAAAAAAAAA//P/9P/1/+H/7v+a/e0AAQARAB4ADAALAA4AAAAAAAAAAP/y//X/9f/h/+/////v/+H/9f/1//IAAAAAAAAAAAAOAAsACwAfABcAAAANAAwADAAfABIBPgE+ABIAIAAMAAsADgAAAAAAAAAA//L/9f/0/+D/7v7C/sL/7v/h//T/9P/zAAAAAAQqAAAADgAMAAsAIAASAT4BPgASACAACwAMAA4AAAAAAAAAAP/y//T/9f/g/+7+wv7C/+7/4P/1//T/8gAAAAABSwAAAAD/8P/y//P/2//r/pn+mP/s/9v/8v/z//AAAAAAAAAAEAANAA0AJgAUAWgBZwAVACUADQANABEAAwErAVwGzAcDAC4ASgBmAAABAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAAABAAEAAQABAQEAAQABAAABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAABNL/+P/w//n/+f/z//v/9f/6//3//AAAAAAAAAAAAAQAAwAGAAsACgAPAA8AEADVANUACAAPAAcAEAAKAAoABwAHAAAAAAAAAAD/+f/7//T/+//y//n/+f/x//j/K/2E/+7/4v/0//X/8wAAAAAAAAAAAA0ACwAMAB4AEgARAB8ACwALAA4AAAAAAAAAAP/y//X/9f/h/kP/7v/i//X/9P/zAAAAAAAAAAAADQAMAAsAHgASABIAHgALAAwADQAAAAAAAAAA//P/9P/1/+ID4QAAAAMAAgACAAkABQAJAA4ABgAOAAgBSQFJAAgADgAGAA0ACgAKAAYABQAAAAAAAAAA//3//f/6//f/9//y//L/8v63/rf/8f/z//P/9v/7//f//v/+//0AAAAA/XsAAAAMAAsACgAcABACHAIbABAAHAAKAAsADAAAAAD/9P/1//b/5P/w/eX95P/w/+T/9v/1//QAAAAAAAwACwAKABwAEAIcAhsAEAAcAAoACwAMAAAAAP/0//X/9v/k//D95f3k//D/5P/2//X/9AAAAwErAVwGzAcDAC4ASgBmAAABAAABAAABAAEAAAEBAQAAAQABAAEAAQEBAAABAAEAAQABAQEAAQABAAABAAABAQEAAAEAAAEBAQAAAQAAAQAAAQAAAQEBAAABAAABAAABAAABAQEAAAEAAAEAAAEAAAEBAQAAAQAABNL/+P/w//n/+f/z//v/9f/6//3//AAAAAAAAAAAAAQAAwAGAAsACgAPAA8AEADVANUACAAPAAcAEAAKAAoABwAHAAAAAAAAAAD/+f/7//T/+//y//n/+f/x//j/K/2E/+7/4v/0//X/8wAAAAAAAAAAAA0ACwAMAB4AEgARAB8ACwALAA4AAAAAAAAAAP/y//X/9f/h/kP/7v/i//X/9P/zAAAAAAAAAAAADQAMAAsAHgASABIAHgALAAwADQAAAAAAAAAA//P/9P/1/+ID4QAAAAMAAgACAAkABQAJAA4ABgAOAAgBSQFJAAgADgAGAA0ACgAKAAYABQAAAAAAAAAA//3//f/6//f/9//y//L/8v63/rf/8f/z//P/9v/7//f//v/+//0AAAAA/XsAAAAMAAsACgAcABACHAIbABAAHAAKAAsADAAAAAD/9P/1//b/5P/w/eX95P/w/+T/9v/1//QAAAAAAAwACwAKABwAEAIcAhsAEAAcAAoACwAMAAAAAP/0//X/9v/k//D95f3k//D/5P/2//X/9AAAAwEqAjEGwAVUAC8AYACLAAABAAEAAAEAAAEAAQEBAAABAAEAAQAAAQEBAAABAAEAAAEAAAEBAQAAAQABAAEAAQEBAAEAAAEAAAEAAQEBAAABAAEAAAEAAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAABAAABAAEBAQAAAQABAAEAAAEAAQAAAQABAAABAQEAAQABAAEAAAF+/+//8P/5//L/+//6//f//f/5AAAAAAAAAAAABAADAAcACwALAA8ACAAQAAkAZQBmAAkAEQAHAA4ADAAGAAkAAwAEAAMAAAAAAAAAAP/8//3/+v/0//X/8f/w/+//mgIR/+//8P/5//P/+v/7//b//f/6AAAAAAAAAAAAAwADAAcACwAFAA4ABwAIABEACABmAGYACAARAAcADwAMAAUACgADAAMABAAAAAAAAAAA//z//f/6//T/9P/x//D/8P+aAhH/7//w//n/8v/7//r/9v/9//oAAAAAAAAAAAADAAIABAAKAAwAEAAJABIACgASAA8ABwAPAAUADAAGAAMABAAAAAAAAAAA//z//P/5//X/7f/3/+wCMQAAAAUAAwAIAAQABQAMAAUADQAPAUwBSwAHAA8ABQANAAkACgAFAAMAAwAAAAAAAAAA//3//f/7//b//P/0//r/+v/y//n+tf60//j/8v/6//T/9v/3//r/+wAAAAAAAAAAAAUAAwAIAAQABQAMAAUADQAPAUwBSwAHAA8ABQANAAkABQAIAAIAAwADAAAAAAAAAAD//f/9//v/9v/8//T/+v/6//L/+f61/rT/+P/y//r/9P/2//f/+v/7AAAAAAAAAAAABwADAAoABgAGAA8ACAAQABMBNwE4AAgAEAAHAA4ADAAQAAgABAAFAAAAAP/4//3/9v/6//T/8P/4/+7/9/7I/sn/8v/z//P/9f/u//b/+//6AAMBKgIxBsAFVAAvAGAAiwAAAQABAAABAAABAAEBAQAAAQABAAEAAAEBAQAAAQABAAABAAABAQEAAAEAAQABAAEBAQABAAABAAABAAEBAQAAAQABAAABAAABAQEAAAEAAQAAAQAAAQEBAAABAAEAAQABAQEAAQAAAQAAAQABAQEAAAEAAQABAAABAAEAAAEAAQAAAQEBAAEAAQABAAABfv/v//D/+f/y//v/+v/3//3/+QAAAAAAAAAAAAQAAwAHAAsACwAPAAgAEAAJAGUAZgAJABEABwAOAAwABgAJAAMABAADAAAAAAAAAAD//P/9//r/9P/1//H/8P/v/5oCEf/v//D/+f/z//r/+//2//3/+gAAAAAAAAAAAAMAAwAHAAsABQAOAAcACAARAAgAZgBmAAgAEQAHAA8ADAAFAAoAAwADAAQAAAAAAAAAAP/8//3/+v/0//T/8f/w//D/mgIR/+//8P/5//L/+//6//b//f/6AAAAAAAAAAAAAwACAAQACgAMABAACQASAAoAEgAPAAcADwAFAAwABgADAAQAAAAAAAAAAP/8//z/+f/1/+3/9//sAjEAAAAFAAMACAAEAAUADAAFAA0ADwFMAUsABwAPAAUADQAJAAoABQADAAMAAAAAAAAAAP/9//3/+//2//z/9P/6//r/8v/5/rX+tP/4//L/+v/0//b/9//6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) format('truetype');font-weight:normal;font-style:normal}
@page{size:8.5in 11in;margin:0.1in 0 0 0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
body{font-family:'Arial',sans-serif;color:#111;width:8.5in;margin:0 auto}
.check-section{width:100%;height:3.5in;padding:0.3in 0.5in 0.25in 0.5in;position:relative;border-bottom:1px dashed #999;page-break-inside:avoid;overflow:hidden;background:
  linear-gradient(135deg,rgba(200,220,200,0.15) 0%,rgba(220,235,220,0.08) 25%,rgba(200,215,195,0.12) 50%,rgba(215,230,215,0.06) 75%,rgba(200,220,200,0.1) 100%),
  repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),
  repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(100,140,100,0.02) 2px,rgba(100,140,100,0.02) 4px),
  radial-gradient(ellipse at 30% 50%,rgba(180,210,180,0.1) 0%,transparent 70%),
  radial-gradient(ellipse at 70% 50%,rgba(180,210,180,0.08) 0%,transparent 70%);
  background-color:#fcfcfa}
.check-section::before{content:'';position:absolute;inset:0;border:3px solid #4a7a4a;border-radius:2px;pointer-events:none}


.check-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:900;color:rgba(100,140,100,0.04);letter-spacing:20px;white-space:nowrap;pointer-events:none;font-family:serif}
.check-security-banner{position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,#3a6a3a,#5a8a5a,#3a6a3a);color:#d4e8d4;text-align:center;font-size:7px;letter-spacing:1.5px;padding:2px 0;font-weight:600;text-transform:uppercase}
.check-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;margin-top:10px;position:relative;z-index:1}
.company-block{line-height:1.4}
.company-name{font-size:13px;font-weight:700;letter-spacing:0.3px}
.company-addr{font-size:10px;color:#444}
.bank-block{text-align:center;font-size:10px;color:#444;line-height:1.4}
.check-no{font-size:28px;font-weight:700;font-family:'Courier New',monospace;text-align:right;min-width:80px;position:relative;z-index:1}
.date-row{text-align:right;margin-bottom:8px;font-size:12px;position:relative;z-index:1}
.date-val{border-bottom:1px solid #444;padding:0 12px;font-style:italic}
.payto-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;position:relative;z-index:1;background:rgba(240,245,240,0.3);padding:4px 6px;border:1px solid #bbb}
.payto-label{font-size:10px;font-weight:700;white-space:nowrap}
.payto-name{flex:1;border-bottom:1px solid #444;padding:2px 8px;font-size:14px;font-weight:600}
.amount-dollars{border:2px solid #444;padding:3px 10px;font-size:15px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;background:rgba(255,255,255,0.6)}
.words-row{border-bottom:1px solid #444;padding:3px 0;margin-bottom:6px;font-size:11px;position:relative;z-index:1;background:rgba(240,245,240,0.3);padding:4px 6px}
.vendor-addr{font-size:10px;line-height:1.5;margin-top:6px;min-height:40px;position:relative;z-index:1}
.memo-sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;position:relative;z-index:1}
.memo-row{display:flex;align-items:center;gap:6px;font-size:10px}
.memo-label{font-weight:700}
.memo-val{padding:2px 6px;font-size:10px}
.sig-line{width:250px;border-bottom:1px solid #444;font-size:7px;color:#111;text-align:right;padding-bottom:1px;letter-spacing:0.5px}
.stub-section{width:100%;height:3.5in;padding:0.25in 0.4in;position:relative;border-bottom:1px dashed #999;background:#fff}
.stub-section:last-child{border-bottom:none}
.stub-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.stub-company{font-size:12px;font-weight:700}
.stub-date-vendor{font-size:11px;color:#333;margin-top:2px}
.stub-checkno{font-size:20px;font-weight:700;font-family:'Courier New',monospace}
.stub-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}
.stub-table th{text-align:left;padding:4px 8px;border-bottom:1.5px solid #333;font-weight:700;font-size:10px}
.stub-table td{padding:4px 8px;border-bottom:1px solid #ddd}
.stub-table .amt{text-align:right;font-family:'Courier New',monospace}
.stub-total-row td{border-top:1.5px solid #333;font-weight:700}
.stub-footer{display:flex;justify-content:space-between;position:absolute;bottom:0.25in;left:0.4in;right:0.4in;font-size:11px}
.stub-bank{color:#444}
.stub-amount{font-weight:700;font-family:'Courier New',monospace;font-size:13px}
.payment-record{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:48px;font-weight:700;color:rgba(0,0,0,0.06);letter-spacing:8px;white-space:nowrap;pointer-events:none}
@media print{body{width:8.5in;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}.check-section,.stub-section{page-break-inside:avoid}}
</style></head><body>


<!-- CHECK (top third) -->
<div class="check-section">
  <div class="check-security-banner">CASH ONLY IF ALL SECURITY FEATURES ARE PRESENT &bull; ORIGINAL DOCUMENT HAS COLORED BACKGROUND &bull; VOID IF COPIED</div>
  <div class="check-watermark">MIDWEST</div>
  <div class="check-header">
    <div class="company-block">
      <div class="company-name">MIDWEST EDUCATIONAL FURNISHINGS, INC</div>
      <div class="company-addr">21191 N Valley Rd<br>Kildeer, IL 60047<br>847-847-1865</div>
    </div>
    <div class="bank-block">CORNERSTONE NATL BANK AND TR CO<br>Palatine, IL 60067<br>70-2615/719</div>
    <div class="check-no">${checkNo}</div>
  </div>
  <div class="date-row"><span class="date-val">${dateStr}</span></div>
  <div class="payto-row">
    <div class="payto-label">PAY TO THE<br>ORDER OF</div>
    <div class="payto-name">${bill2.vendorName||''}</div>
    <div class="amount-dollars">$ **${amtFmt}</div>
  </div>
  <div class="words-row">${amtWords}${'*'.repeat(Math.max(0,80-amtWords.length))} DOLLARS</div>
  <div class="vendor-addr">${vendorAddrHtml}</div>
  <div class="memo-sig-row">
    <div class="memo-row"><span class="memo-label">MEMO</span><span class="memo-val">${billMemo||''}</span></div>
    <div class="sig-line">MP</div>
  </div>
  ${micrHtml}
</div>


<!-- STUB 1 (middle third -- company copy) -->
<div class="stub-section">
  <div class="stub-header">
    <div>
      <div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div>
      <div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${bill2.vendorName||''}</div>
    </div>
    <div class="stub-checkno">${checkNo}</div>
  </div>
  <table class="stub-table">
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="amt">Original Amount</th><th class="amt">Balance Due</th><th class="amt">Payment</th></tr></thead>
    <tbody>
      <tr><td>${billDate}</td><td>Bill</td><td>${refNum}</td><td class="amt">${amtFmt}</td><td class="amt">${amtFmt}</td><td class="amt">${amtFmt}</td></tr>
      <tr class="stub-total-row"><td></td><td></td><td></td><td></td><td>Check Amount</td><td class="amt">${amtFmt}</td></tr>
    </tbody>
  </table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>


<!-- STUB 2 (bottom third -- payment record) -->
<div class="stub-section" style="border-bottom:none">
  <div class="payment-record">PAYMENT RECORD</div>
  <div class="stub-header">
    <div>
      <div class="stub-company">MIDWEST EDUCATIONAL FURNISHINGS, INC</div>
      <div class="stub-date-vendor">${dateStr}&nbsp;&nbsp;&nbsp;&nbsp;${bill2.vendorName||''}</div>
    </div>
    <div class="stub-checkno">${checkNo}</div>
  </div>
  <table class="stub-table">
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="amt">Original Amount</th><th class="amt">Balance Due</th><th class="amt">Payment</th></tr></thead>
    <tbody>
      <tr><td>${billDate}</td><td>Bill</td><td>${refNum}</td><td class="amt">${amtFmt}</td><td class="amt">${amtFmt}</td><td class="amt">${amtFmt}</td></tr>
      <tr class="stub-total-row"><td></td><td></td><td></td><td></td><td>Check Amount</td><td class="amt">${amtFmt}</td></tr>
    </tbody>
  </table>
  <div class="stub-footer"><div class="stub-bank">Cornerstone Bank Ch</div><div class="stub-amount">${amtFmt}</div></div>
</div>


</body></html>`;
          const w=window.open('','_blank');
          if(!w){notify('Popup blocked. Please allow popups for this site and try again.','error')}
          else{w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e2){}},1000)}
          const existing2=typeof docStatuses[bill2.billDocNum]==='object'?docStatuses[bill2.billDocNum]:{};
          setDocStatus(bill2.billDocNum,{...existing2,checkNum:checkNo,checkPrinted:new Date().toISOString(),vendorInvNum:billInvNum||existing2.vendorInvNum||'',payDate:billPayDate||existing2.payDate||'',memo:billMemo||existing2.memo||''});
          notify('Check #'+checkNo+' printed for '+bill2.vendorName+' -- '+fmt(costVal));
          }catch(err){console.error('Print check error:',err);notify('Error printing check: '+err.message,'error');alert('Print Check Error: '+err.message)}
        };
        return <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><button onClick={()=>setBillDetail(null)} style={{background:"#14b8a620",border:"1px solid #14b8a640",color:"#14b8a6",cursor:"pointer",fontSize:13,fontFamily:"inherit",padding:"8px 16px",borderRadius:8,fontWeight:600,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#14b8a630"}} onMouseLeave={e=>{e.currentTarget.style.background="#14b8a620"}}>&larr; Back to Bills</button></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}} className="resp-grid-2">
            <Card style={{padding:16}}>
              <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:8}}>VENDOR</div>
              <div style={{fontSize:18,fontWeight:800,color:"#e5e5e5",marginBottom:4}}>{bill.vendorName}</div>
              <div style={{fontSize:12,color:"#a3a3a3"}}>{bill.vendor?.contact||''}{bill.vendor?.email?' -- '+bill.vendor.email:''}{bill.vendor?.phone?' -- '+bill.vendor.phone:''}</div>
              {bill.vendor?.category&&<div style={{marginTop:4}}><Badge label={bill.vendor.category} color="#a78bfa"/></div>}
              {bill.vendor?.discountRate>0&&<div style={{fontSize:12,color:"#34d399",marginTop:4}}>Discount: {Math.round(bill.vendor.discountRate*100)}%</div>}
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:8}}>BILL SUMMARY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:11,color:"#737373"}}>PO Number</div><div style={{fontSize:13,fontWeight:600,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer"}} onClick={()=>{if(thisPO){setPreviewDoc({type:"po",data:thisPO,job:bill.job});setTab("preview")}}}>{bill.poDocNum}</div></div>
                <div><div style={{fontSize:11,color:"#737373"}}>Job</div><div style={{fontSize:13,color:bill.job?.id?"#e5e5e5":"#737373",fontStyle:bill.job?.id?"normal":"italic"}}>{bill.job?.name||'(No Project)'}</div></div>
                <div><div style={{fontSize:11,color:"#737373"}}>Amount</div>{(()=>{const ca=typeof bill.creditAmount==='number'?bill.creditAmount:bill.cost;const isPartial=bill.isCredit&&ca<bill.cost-0.005;if(bill.isCredit&&isPartial){return <div><div style={{fontSize:13,color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace",textDecoration:isVoid?"line-through":"none"}}>{fmt(bill.cost)}</div><div style={{fontSize:13,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>-{fmt(ca)} <span style={{fontSize:10,color:"#34d399"}}>CREDIT</span></div><div style={{fontSize:16,fontWeight:800,color:isVoid?"#525252":"#f97316",fontFamily:"'JetBrains Mono',monospace",borderTop:"1px solid #333",paddingTop:2,marginTop:2,textDecoration:isVoid?"line-through":"none"}}>{fmt(bill.cost-ca)}</div></div>}return <div style={{fontSize:16,fontWeight:800,color:isVoid?"#525252":bill.isCredit?"#34d399":"#f97316",fontFamily:"'JetBrains Mono',monospace",textDecoration:isVoid?"line-through":"none"}}>{bill.isCredit?"-":""}{fmt(bill.isCredit?ca:bill.cost)}{bill.isCredit&&<span style={{fontSize:10,marginLeft:4,color:"#34d399"}}>{ca>=bill.cost-0.005?"FULL CREDIT":"CREDIT"}</span>}</div>})()}</div>
                <div><div style={{fontSize:11,color:"#737373"}}>Due Date</div><div style={{fontSize:13,color:bill.daysUntil<0?"#f87171":bill.daysUntil<=14?"#fbbf24":"#a3a3a3"}}>{docStatuses[bill.billDocNum+'__due']||bill.dueDate}</div></div>
                <div><div style={{fontSize:11,color:"#737373"}}>Items</div><div style={{fontSize:13,color:"#e5e5e5"}}>{bill.itemCount} line item{bill.itemCount!==1?'s':''}</div></div>
                <div><div style={{fontSize:11,color:"#737373"}}>Status</div><div>{currentStatus==='paid'?<Badge label="paid" color="#34d399"/>:currentStatus==='void'?<Badge label="void" color="#525252"/>:currentStatus==='check_sent'?<Badge label="check sent" color="#f97316"/>:<Badge label={bill.daysUntil<0?"overdue":"open"} color={bill.daysUntil<0?"#f87171":"#fbbf24"}/>}</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10,paddingTop:10,borderTop:"1px solid #1a1a1a"}}>
                <div><label style={{fontSize:13,color:"#e5e5e5",fontWeight:600,display:"block",marginBottom:4}}>Bill Date</label><input type="date" value={docStatuses[bill.billDocNum+'__date']||''} onChange={e=>{setDocStatus(bill.billDocNum+'__date',e.target.value);if(e.target.value&&!docStatuses[bill.billDocNum+'__due']){const d=new Date(e.target.value+'T12:00:00');d.setDate(d.getDate()+30);setDocStatus(bill.billDocNum+'__due',d.toISOString().split('T')[0])}}} style={{...inputStyle,fontSize:13,padding:"6px 10px"}}/></div>
                <div><label style={{fontSize:13,color:"#e5e5e5",fontWeight:600,display:"block",marginBottom:4}}>Due Date Override</label><input type="date" value={docStatuses[bill.billDocNum+'__due']||''} onChange={e=>setDocStatus(bill.billDocNum+'__due',e.target.value)} style={{...inputStyle,fontSize:13,padding:"6px 10px"}}/></div>
              </div>
            </Card>
          </div>


          <Card style={{padding:16,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Bill Status</div>
              <div style={{display:"flex",gap:4}}>{[["unpaid","Unpaid","#fbbf24"],["check_sent","Check Sent","#f97316"],["paid","Paid","#34d399"],["void","Void","#525252"]].map(([val,label,color])=><button key={val} onClick={()=>setBillStatus(val)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid "+(currentStatus===val?color:"#333"),background:currentStatus===val?color+"18":"transparent",color:currentStatus===val?color:"#525252",fontSize:12,fontWeight:currentStatus===val?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{label}</button>)}</div>
            </div>
            {isVoid&&<div style={{padding:"8px 12px",background:"#52525210",border:"1px solid #52525225",borderRadius:6,marginBottom:8,fontSize:12,color:"#737373"}}>This bill has been voided and will not count toward outstanding payables.</div>}
            <div style={{marginTop:12,padding:"12px 16px",background:billData.isCredit?"#34d39910":"#111",border:"1px solid "+(billData.isCredit?"#34d39930":"#222"),borderRadius:8,transition:"all 0.15s"}}><div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};const newVal=!existing.isCredit;const update={...existing,isCredit:newVal};if(newVal&&(existing.creditAmount===undefined||existing.creditAmount===null||existing.creditAmount==='')){update.creditAmount=bill.cost}setDocStatus(bill.billDocNum,update);notify(newVal?'Marked as vendor credit -- reduces balance by '+fmt(update.creditAmount):'Marked as standard bill')}}><div style={{width:24,height:24,borderRadius:6,border:"2px solid "+(billData.isCredit?"#34d399":"#525252"),background:billData.isCredit?"#34d399":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{billData.isCredit&&<span style={{color:"#000",fontSize:16,fontWeight:800}}>&#10003;</span>}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:billData.isCredit?"#34d399":"#e5e5e5"}}>Vendor Credit</div><div style={{fontSize:12,color:"#e5e5e5",marginTop:2}}>Check this if this is a credit from the vendor. Credits reduce the total balance owed instead of adding to it.</div></div></div>{billData.isCredit&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #34d39920",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><div style={{flex:"1 1 220px"}}><label style={{fontSize:12,color:"#34d399",fontWeight:600,display:"block",marginBottom:4}}>Credit Amount Applied</label><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>$</span><input type="number" step="0.01" min="0" max={bill.cost} value={(billData.creditAmount!==undefined&&billData.creditAmount!==null)?billData.creditAmount:bill.cost} onChange={e=>{const v=e.target.value;const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};setDocStatus(bill.billDocNum,{...existing,isCredit:true,creditAmount:v===''?'':Number(v)})}} style={{...inputStyle,fontSize:14,padding:"6px 10px",fontFamily:"'JetBrains Mono',monospace",color:"#34d399",background:"#0a0a0a",border:"1px solid #34d39940",flex:1,maxWidth:160}}/><button onClick={()=>{const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};setDocStatus(bill.billDocNum,{...existing,isCredit:true,creditAmount:bill.cost});notify('Credit set to full bill amount: '+fmt(bill.cost))}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #34d39930",background:"transparent",color:"#34d399",fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}} title="Reset to full bill amount">Full</button></div><div style={{fontSize:11,color:"#737373",marginTop:4}}>Default: full bill amount ({fmt(bill.cost)}). Edit for partial credits.</div></div>{(()=>{const ca=(billData.creditAmount!==undefined&&billData.creditAmount!==null&&billData.creditAmount!==''&&!isNaN(Number(billData.creditAmount)))?Math.max(0,Math.min(bill.cost,Number(billData.creditAmount))):bill.cost;const remaining=bill.cost-ca;return <div style={{flex:"0 0 auto",padding:"8px 12px",background:"#0a0a0a",border:"1px solid #222",borderRadius:6,minWidth:140}}><div style={{fontSize:10,color:"#737373",textTransform:"uppercase",letterSpacing:0.5}}>Net Balance Owed</div><div style={{fontSize:16,fontWeight:800,color:remaining>0.005?"#f97316":"#34d399",fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{fmt(remaining)}</div><div style={{fontSize:10,color:remaining>0.005?"#f97316":"#34d399",marginTop:2}}>{remaining>0.005?'partial credit':'full credit'}</div></div>})()}</div>}</div>
          </Card>


          <Card style={{padding:16,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:12,fontFamily:"'JetBrains Mono',monospace"}}>Payment Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}} className="resp-grid-2">
              <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Vendor Invoice #</label><input value={billInvNum} onChange={e=>setBillInvNum(e.target.value)} placeholder="e.g. INV-6216112" style={inputStyle}/></div>
              <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Check # / Payment Ref</label><input value={billCheckNum} onChange={e=>setBillCheckNum(e.target.value)} placeholder="Auto-assigned on Print" style={inputStyle}/></div>
              <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Date</label><input type="date" value={billPayDate} onChange={e=>setBillPayDate(e.target.value)} style={inputStyle}/></div>
              <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Memo</label><input value={billMemo} onChange={e=>setBillMemo(e.target.value)} placeholder="Notes..." style={inputStyle}/></div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn onClick={()=>saveBillDetail(bill)}>Save Details</Btn>
              {!bill.paid&&!isVoid&&billPayDate&&<Btn onClick={()=>{setBillPayDate(billPayDate||new Date().toISOString().split('T')[0]);saveBillDetail(bill);setBillStatus('paid')}} style={{background:"#34d399",color:"#000"}}>Record Payment</Btn>}
              <Btn v="secondary" onClick={()=>printCheck(bill)}><I n="file" s={12}/> Print Check</Btn>
              <Btn v="secondary" onClick={()=>setBillDetail(null)}>Cancel</Btn>
              <Btn v="danger" onClick={async()=>{
                // Two-step confirm so accidental clicks do nothing. Names the
                // vendor and shows the bill amount so the user can verify the
                // exact bill being removed before committing.
                const ok=await ctx.confirm('Delete vendor bill from "'+bill.vendorName+'" for '+fmt(bill.cost)+'? This removes it from the Vendor Bills list. The underlying PO and line items are not affected.');
                if(!ok)return;
                const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
                setDocStatus(bill.billDocNum,{...existing,deleted:true});
                notify('Vendor bill deleted: '+bill.vendorName+' ('+fmt(bill.cost)+')');
                setBillDetail(null);
              }}><I n="close" s={12}/> Delete Bill</Btn>
            </div>
          </Card>
          <Card style={{padding:16,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Vendor Invoice Document</div>
              {billData.invoiceFileUrl&&<a href={billData.invoiceFileUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#a78bfa",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><I n="external-link" s={12} color="#a78bfa"/> Open Saved Invoice</a>}
            </div>
            {billData.invoiceFileUrl?<div style={{display:"flex",alignItems:"center",gap:12,padding:12,background:"#a78bfa08",border:"1px solid #a78bfa20",borderRadius:8}}>
              <div style={{width:40,height:40,borderRadius:8,background:"#a78bfa15",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="file" s={18} color="#a78bfa"/></div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e5e5e5"}}>{billData.invoiceFileName||'Vendor Invoice'}</div>
                <div style={{fontSize:11,color:"#737373"}}>{billData.invoiceUploadDate?'Uploaded '+new Date(billData.invoiceUploadDate).toLocaleDateString():''}</div>
              </div>
              <a href={billData.invoiceFileUrl} target="_blank" rel="noopener noreferrer" style={{padding:"6px 14px",borderRadius:6,border:"1px solid #a78bfa30",background:"#a78bfa15",color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"none"}}>View</a>
              <button onClick={()=>{const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};setDocStatus(bill.billDocNum,{...existing,invoiceFileUrl:'',invoiceFileName:'',invoiceUploadDate:''});notify('Invoice removed')}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #52525230",background:"transparent",color:"#737373",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
            </div>:<div>
              <input type="file" id="vendorInvoiceUpload" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.tiff" style={{display:"none"}} onChange={async e=>{
                const file=e.target.files?.[0];if(!file)return;
                const uploadBtn=document.getElementById('uploadInvBtn');
                if(uploadBtn){uploadBtn.textContent='Uploading...';uploadBtn.disabled=true}
                try{
                  // Upload to Supabase Storage
                  const ext=file.name.split('.').pop()||'pdf';
                  const path='invoices/'+bill.billDocNum.replace(/[^a-zA-Z0-9-_]/g,'_')+'_'+Date.now()+'.'+ext;
                  const url=await window._supabase.uploadFile('vendor-invoices',path,file);
                  if(url){
                    // Save file reference to docStatuses
                    const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
                    setDocStatus(bill.billDocNum,{...existing,invoiceFileUrl:url,invoiceFileName:file.name,invoiceUploadDate:new Date().toISOString()});
                    notify('Invoice uploaded: '+file.name);
                    // Send to AI to extract invoice number
                    try{
                      const reader=new FileReader();
                      reader.onload=async()=>{
                        const base64=reader.result.split(',')[1];
                        const mediaType=file.type||'application/pdf';
                        const resp=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mediaType,prompt:'Extract the invoice number from this vendor invoice document. Return ONLY the invoice number/reference number, nothing else. If you cannot find one, return "NOT FOUND".'})});
                        if(resp.ok){
                          const data=await resp.json();
                          const invNum=(data.text||'').trim();
                          if(invNum&&invNum!=='NOT FOUND'&&invNum.length<50){
                            setBillInvNum(invNum);
                            const existing2=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};
                            setDocStatus(bill.billDocNum,{...existing2,vendorInvNum:invNum});
                            notify('AI extracted invoice #: '+invNum);
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                    }catch(aiErr){console.error('AI scan error:',aiErr)}
                  }else{notify('Upload failed -- check Supabase Storage bucket')}
                }catch(err){console.error('Upload error:',err);notify('Upload error: '+err.message)}
                if(uploadBtn){uploadBtn.textContent='Upload Vendor Invoice';uploadBtn.disabled=false}
                e.target.value='';
              }}/>
              <button id="uploadInvBtn" onClick={()=>document.getElementById('vendorInvoiceUpload')?.click()} style={{padding:"10px 20px",borderRadius:8,border:"2px dashed #a78bfa40",background:"#a78bfa08",color:"#a78bfa",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onMouseEnter={e=>{e.currentTarget.style.background="#a78bfa15";e.currentTarget.style.borderColor="#a78bfa60"}} onMouseLeave={e=>{e.currentTarget.style.background="#a78bfa08";e.currentTarget.style.borderColor="#a78bfa40"}}><I n="upload" s={14} color="#a78bfa"/> Upload Vendor Invoice (PDF, Image, Screenshot)</button>
              <div style={{fontSize:11,color:"#525252",marginTop:6,textAlign:"center"}}>AI will auto-extract the invoice number from the uploaded document</div>
            </div>}
          </Card>
          <Card style={{padding:16,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:12,fontFamily:"'JetBrains Mono',monospace"}}>Line Items on This PO</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["Description","Model #","Recv / Ord","Net Each","Bill Now"].map((h,i)=><th key={i} style={{padding:"6px 8px",textAlign:i>=2?"right":"left",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
              {bill.items.map((item,idx)=>{const qr=Number(item.qtyReceived)||0;const qo=Number(item.qtyOrdered)||0;const lineTotal=(item.unitCost||0)*qr;const fullCommitted=qr>=qo;return <tr key={idx} style={{borderBottom:"1px solid #111"}}><td style={{padding:"6px 8px",color:"#e5e5e5"}}>{item.description}</td><td style={{padding:"6px 8px",color:"#a3a3a3",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{item.modelNumber||'--'}</td><td style={{padding:"6px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:fullCommitted?"#34d399":qr>0?"#fbbf24":"#737373"}}>{qr} / {qo}</td><td style={{padding:"6px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(item.unitCost)}</td><td style={{padding:"6px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:qr===0?"#525252":"#e5e5e5"}}>{fmt(lineTotal)}</td></tr>})}
              <tr style={{borderTop:"2px solid #222"}}><td colSpan={4} style={{padding:"6px 8px",fontWeight:700}}>BILL NOW (received)</td><td style={{padding:"6px 8px",textAlign:"right",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#f97316"}}>{fmt(bill.cost)}</td></tr>
              {bill.orderValue>bill.cost+0.005&&<tr style={{borderBottom:"1px solid #111"}}><td colSpan={4} style={{padding:"4px 8px",fontWeight:500,color:"#737373",fontSize:11}}>Full PO commitment (when all items received)</td><td style={{padding:"4px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:"#737373",fontSize:11}}>{fmt(bill.orderValue)}</td></tr>}
            </tbody></table></div>
          </Card>
          <Card style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>Payment Trail</div>
              {(()=>{const tp=bill.totalPaid||0;const bl=bill.balance||0;const fp=bill.cost>0.005&&tp>=bill.cost-0.005;const pp=tp>0.005&&!fp;
                const col=fp?'#34d399':pp?'#fbbf24':'#737373';
                const label=fp?'FULLY PAID':pp?'PARTIAL':'UNPAID';
                return <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:10,color:"#737373"}}>Status</div>
                    <div style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{label}</div>
                  </div>
                  <div style={{padding:"6px 12px",borderRadius:8,background:col+'12',border:'1px solid '+col+'40',textAlign:"right",minWidth:120}}>
                    <div style={{fontSize:10,color:"#737373"}}>{fp?'Paid in full':'Balance remaining'}</div>
                    <div style={{fontSize:14,fontWeight:800,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{fp?fmt(tp):fmt(bl)}</div>
                    {pp&&<div style={{fontSize:10,color:"#737373",marginTop:2}}>{fmt(tp)} of {fmt(bill.cost)}</div>}
                  </div>
                </div>})()}
            </div>
            {/* PO -> Invoice quick reference row (PO num, vendor invoice num) */}
            <div style={{display:"flex",gap:16,flexWrap:"wrap",paddingBottom:12,borderBottom:"1px solid #1a1a1a",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><I n="file" s={12} color="#a78bfa"/><span style={{fontSize:11,color:"#737373"}}>PO:</span><span style={{fontSize:12,fontWeight:600,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{bill.poDocNum}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><I n="receipt" s={12} color="#f97316"/><span style={{fontSize:11,color:"#737373"}}>Vendor Invoice:</span><span style={{fontSize:12,fontWeight:600,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{billInvNum||bill.vendorInvNum||'Not entered'}</span></div>
              {billData.checkPrinted&&<div style={{display:"flex",alignItems:"center",gap:8}}><I n="check" s={12} color="#737373"/><span style={{fontSize:11,color:"#737373"}}>Last check printed:</span><span style={{fontSize:12,color:"#a3a3a3"}}>{new Date(billData.checkPrinted).toLocaleString()}</span></div>}
            </div>
            {/* Payment history: itemized list of every payment recorded against this bill.
                Empty state when nothing's been paid. Each row shows date, check#, amount,
                memo, plus a small Delete button. Legacy entries (synthesized from old
                single-payment flat fields) get an Edit pencil so the user can correct
                the amount when the prior single payment was actually partial. */}
            {(()=>{const payments=bill.payments||[];
              if (payments.length===0) {
                return <div style={{padding:"16px 12px",background:"#0a0a0a",borderRadius:8,fontSize:13,color:"#737373",textAlign:"center",marginBottom:12,border:"1px dashed rgba(255,255,255,0.06)"}}>No payments recorded yet</div>;
              }
              return <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"#737373",letterSpacing:1.2,fontWeight:600,marginBottom:6,textTransform:"uppercase"}}>Payments ({payments.length})</div>
                {payments.map((p,idx)=>{const amt=Number(p.amount)||0;const isLeg=p.isLegacy===true;return <div key={idx} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#0a0a0a",borderRadius:8,marginBottom:6,border:isLeg?"1px solid #fbbf2440":"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{width:28,height:28,borderRadius:6,background:isLeg?"#fbbf2412":"#34d39912",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <I n={isLeg?"alert":"check"} s={12} color={isLeg?"#fbbf24":"#34d399"}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:700,color:isLeg?"#fbbf24":"#e5e5e5",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(amt)}</span>
                      {p.checkNum&&<span style={{fontSize:11,color:"#a3a3a3"}}>check #{p.checkNum}</span>}
                      {p.vendorInvNum&&<span style={{fontSize:11,color:"#f97316"}}>inv #{p.vendorInvNum}</span>}
                      <span style={{fontSize:11,color:"#737373"}}>{p.date||'no date'}</span>
                      {isLeg&&<span style={{fontSize:9,fontWeight:700,color:"#fbbf24",letterSpacing:1,padding:"1px 6px",border:"1px solid #fbbf2440",borderRadius:4}}>LEGACY -- VERIFY AMOUNT</span>}
                    </div>
                    {p.memo&&<div style={{fontSize:11,color:"#737373",marginTop:3}}>{p.memo}</div>}
                  </div>
                  <button onClick={()=>{const newAmt=prompt('Edit payment amount (this payment was originally recorded as '+fmt(amt)+(isLeg?'; legacy bills default to the full bill amount -- enter the actual amount of check '+(p.checkNum||'(no #)')+' if it was partial':'')+'):',String(amt));if(newAmt===null)return;const n=Number(newAmt);if(!isFinite(n)||n<0){notify('Invalid amount','error');return}editPayment(bill,idx,{amount:n})}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit"}} title="Edit payment amount">Edit</button>
                  <button onClick={()=>{if(confirm('Remove this payment? The bill balance will increase by '+fmt(amt)+'.')){removePayment(bill,idx)}}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #f8717125",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer",fontFamily:"inherit"}} title="Delete this payment">Delete</button>
                </div>})}
              </div>;
            })()}
            {/* Inline Record Payment form. Only when there's still a balance to pay.
                Defaults: amount = current balance, date = today, check# blank, memo blank.
                Submitting calls addPayment which appends to the payments[] array and
                recomputes the paid flag from the new running total. */}
            {!isVoid&&bill.balance>0.005&&<div style={{padding:12,background:"#0a0a0a",borderRadius:8,border:"1px solid rgba(45,212,191,0.15)"}}>
              <div style={{fontSize:11,color:"#34d399",fontWeight:700,letterSpacing:1.2,marginBottom:8,textTransform:"uppercase"}}>Record a Payment</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:8}}>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:2}}>Amount</label><input type="number" step="0.01" value={billPayAmount} onChange={e=>setBillPayAmount(e.target.value)} placeholder={fmt(bill.balance)} style={inputStyle}/></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:2}}>Date</label><input type="date" value={billPayInputDate} onChange={e=>setBillPayInputDate(e.target.value)} style={inputStyle}/></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:2}}>Check #</label><input value={billPayCheckInput} onChange={e=>setBillPayCheckInput(e.target.value)} placeholder="optional" style={inputStyle}/></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:2}}>Vendor Invoice #</label><input value={billPayInvInput} onChange={e=>setBillPayInvInput(e.target.value)} placeholder={bill.vendorInvNum?'e.g. this shipment':'optional'} style={inputStyle}/></div>
                <div><label style={{fontSize:10,color:"#737373",display:"block",marginBottom:2}}>Memo</label><input value={billPayMemoInput} onChange={e=>setBillPayMemoInput(e.target.value)} placeholder="optional" style={inputStyle}/></div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button onClick={()=>{const amt=Number(billPayAmount)||bill.balance;if(amt<=0){notify('Enter a payment amount','error');return}addPayment(bill,{date:billPayInputDate||new Date().toISOString().split('T')[0],amount:amt,checkNum:billPayCheckInput,memo:billPayMemoInput,method:'check',vendorInvNum:billPayInvInput});setBillPayAmount('');setBillPayCheckInput('');setBillPayInvInput('');setBillPayMemoInput('');setBillPayInputDate(new Date().toISOString().split('T')[0])}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #34d39940",background:"#34d39915",color:"#34d399",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Record Payment</button>
                <span style={{fontSize:11,color:"#737373"}}>Default fills the full balance ({fmt(bill.balance)}). Enter a smaller amount for partial payments.</span>
              </div>
            </div>}
          </Card>
        </div>}


      return <div>
        {/* New Vendor Credit / New Vendor Bill actions. Both create standalone
            records attached to a project; they participate in totalOwed here
            and feed getJobFinancials so cost/margin update everywhere else. */}
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
          <Btn onClick={()=>openAdjustModal('credit',null)} style={{fontSize:12,padding:"6px 14px",background:"#34d39915",border:"1px solid #34d39940",color:"#34d399",fontWeight:600}}><I n="dollar" s={12}/> + New Vendor Credit</Btn>
          <Btn onClick={()=>openAdjustModal('bill',null)} style={{fontSize:12,padding:"6px 14px",background:"#f9731615",border:"1px solid #f9731640",color:"#f97316",fontWeight:600}}><I n="receipt" s={12}/> + New Vendor Bill</Btn>
          <Btn onClick={()=>{setExpenseForm({payee:'',amount:'',memo:'',date:new Date().toISOString().split('T')[0],address:''});setShowExpenseCheck(true)}} style={{fontSize:12,padding:"6px 14px",background:"#14b8a615",border:"1px solid #14b8a640",color:"#14b8a6",fontWeight:600}} title="Print a check for an expense or reimbursement without first creating a vendor bill (utilities, office supplies, one-off reimbursements, etc.)"><I n="file" s={12}/> + Print Expense Check</Btn>
          {/* Show deleted bills toggle. Visible only when at least one deleted bill exists.
              Off by default. When on, deleted bills appear in the table with a red DELETED
              badge and a Restore button. They are still excluded from Total Owed / Overdue /
              Paid totals so the financial KPIs stay clean. */}
          {deletedBillsCount>0&&<Btn onClick={()=>setShowDeletedBills(v=>!v)} style={{fontSize:12,padding:"6px 14px",background:showDeletedBills?"#f8717115":"transparent",border:"1px solid "+(showDeletedBills?"#f8717140":"#f8717125"),color:"#f87171",fontWeight:600}}><I n="alert" s={12}/> {showDeletedBills?"Hide":"Show"} deleted bills ({deletedBillsCount})</Btn>}
          <span style={{fontSize:11,color:"#525252",marginLeft:4}}>Attach a standalone credit or bill (not tied to a PO) to a project</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:16}} className="resp-grid-4">
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL OWED</div><div style={{fontSize:22,fontWeight:800,color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalOwed)}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{unpaidBills.length} open bill{unpaidBills.length!==1?'s':''}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>OVERDUE</div><div style={{fontSize:22,fontWeight:800,color:overdueAmt>0?"#f87171":"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(overdueAmt)}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{overdueBills.length} bill{overdueBills.length!==1?'s':''}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>DUE IN 14 DAYS</div><div style={{fontSize:22,fontWeight:800,color:dueSoonBills.length>0?"#fbbf24":"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(dueSoonBills.reduce((s,b)=>s+b.cost,0))}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{dueSoonBills.length} bill{dueSoonBills.length!==1?'s':''}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>PAID</div><div style={{fontSize:22,fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(allBills.filter(b=>b.paid&&!b._isDeleted).reduce((s,b)=>s+b.cost,0))}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{allBills.filter(b=>b.paid&&!b._isDeleted).length} bill{allBills.filter(b=>b.paid&&!b._isDeleted).length!==1?'s':''}</div></Card>
        </div>
        {/* Group-by buttons */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:"#a3a3a3",fontWeight:700,letterSpacing:1}}>SELECT BY VENDOR:</span>
          {[...new Set(unpaidBills.map(b=>b.vendorName))].sort().map(v=>{const ct=unpaidBills.filter(b=>b.vendorName===v).length;const isActive=billSelected.size>0&&Array.from(billSelected).every(i=>unpaidBills[i]?.vendorName===v)&&unpaidBills.filter(b=>b.vendorName===v).length===billSelected.size;return ct>1?<button key={v} onClick={()=>selectByVendor(v)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid "+(isActive?"#a78bfa":"#333"),background:isActive?"#a78bfa20":"#111",color:isActive?"#a78bfa":"#e5e5e5",fontSize:12,fontWeight:isActive?600:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background="#1a1a1a";e.currentTarget.style.borderColor="#a78bfa60"}}} onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="#111";e.currentTarget.style.borderColor="#333"}}}>{v} <span style={{color:isActive?"#a78bfa":"#737373",fontWeight:700}}>({ct})</span></button>:null})}
        </div>
        {billSelected.size>0&&<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"10px 14px",background:"#f9731610",border:"1px solid #f9731625",borderRadius:8,flexWrap:"wrap"}}><span style={{fontSize:13,color:"#f97316",fontWeight:600}}>{billSelected.size} bill{billSelected.size!==1?'s':''} selected</span><span style={{fontSize:13,color:"#a3a3a3"}}>({fmt(Array.from(billSelected).reduce((s,i)=>{const b=unpaidBills[i];return s+(b?(typeof b.balance==='number'?b.balance:b.cost):0)},0))})</span><Btn onClick={printBatchCheck} style={{fontSize:12,padding:"4px 12px",background:"#14b8a6",color:"#000"}}><I n="file" s={12}/> Print Batch Check</Btn><Btn onClick={markSelectedPaid} style={{fontSize:12,padding:"4px 12px",background:"#34d399",color:"#000"}}>Mark Paid</Btn><button onClick={()=>setBillSelected(new Set())} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Clear</button></div>}
        {allBills.length===0?<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,color:"#525252"}}>No vendor bills yet. Bills appear after POs are drafted or sent.</div></Card>:
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
            <thead><tr style={{background:"#111111",borderBottom:"2px solid #222"}}>{["","Payee","Ref / PO #","Vendor Inv #","Job","Due Date","Status","Open Balance",""].map((h,i)=><th key={i} style={{padding:"10px 8px",textAlign:i>=7?"right":i===0?"center":"left",fontWeight:600,color:"#a3a3a3",fontSize:11,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{allBills.map((bill,idx)=>{
              const isOverdue=bill.daysUntil<0&&!bill.paid&&bill.entered;
              const isDueSoon=bill.daysUntil>=0&&bill.daysUntil<=14&&!bill.paid;
              const unpaidIdx=unpaidBills.indexOf(bill);
              return <tr key={idx} style={{borderBottom:"1px solid #111",background:bill._isDeleted?"#f8717108":bill.voided?"#52525208":bill.paid?"#34d39905":isOverdue?"#f8717108":billSelected.has(unpaidIdx)?"#f9731610":"transparent",transition:"background 0.15s",cursor:"pointer",opacity:bill._isDeleted?0.55:bill.voided?0.5:1}} onClick={()=>{if(bill._standalone){openAdjustModal(bill._standaloneKind==='VendorCredit'?'credit':'bill',bill);return}setBillInvNum(bill.vendorInvNum);setBillCheckNum(bill.checkNum);setBillPayDate(bill.payDate);setBillMemo(bill.memo);setBillPayAmount(String(bill.balance||bill.cost));setBillPayInputDate(new Date().toISOString().split('T')[0]);setBillPayCheckInput('');setBillPayInvInput('');setBillPayMemoInput('');setBillDetail(bill)}} onMouseEnter={e=>{if(!bill.paid&&!bill.voided&&!bill._isDeleted&&!billSelected.has(unpaidIdx))e.currentTarget.style.background=isOverdue?"#f8717112":"#111"}} onMouseLeave={e=>{e.currentTarget.style.background=bill._isDeleted?"#f8717108":bill.voided?"#52525208":bill.paid?"#34d39905":isOverdue?"#f8717108":billSelected.has(unpaidIdx)?"#f9731610":"transparent"}}>
                <td style={{padding:"10px 8px",textAlign:"center",width:36}} onClick={e=>e.stopPropagation()}>{!bill.paid&&!bill._standalone&&!bill._isDeleted&&<input type="checkbox" checked={billSelected.has(unpaidIdx)} onChange={()=>toggleSelect(unpaidIdx)} style={{accentColor:"#2dd4bf",width:16,height:16,cursor:"pointer"}}/>}{bill.paid&&<I n="check" s={14} color="#34d399"/>}{!bill.paid&&bill._standalone&&!bill._isDeleted&&<span style={{fontSize:10,color:bill.isCredit?"#34d399":"#f97316",fontWeight:700,letterSpacing:0.5}}>{bill.isCredit?"CR":"ADJ"}</span>}{bill._isDeleted&&<I n="close" s={14} color="#f87171"/>}</td>
                <td style={{padding:"10px 8px"}}><div style={{fontWeight:600,color:"#e5e5e5",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{bill.vendorName}{bill.isCredit&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"#34d39920",color:"#34d399",fontWeight:700,letterSpacing:0.5}}>CREDIT {(()=>{const ca=typeof bill.creditAmount==='number'?bill.creditAmount:bill.cost;return ca<bill.cost-0.005?fmt(ca):'FULL'})()}</span>}</div><div style={{fontSize:11,color:"#737373"}}>{bill.itemCount} item{bill.itemCount!==1?'s':''}</div></td>
                <td style={{padding:"10px 8px"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#a78bfa",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:2}} onClick={e=>{e.stopPropagation();const pos2=genPOs?genPOs(bill.job):[];const thisPO2=pos2.find(p=>p.docNum===bill.poDocNum);if(thisPO2){setPreviewDoc({type:"po",data:thisPO2,job:bill.job});setTab("preview")}}}>{bill.poDocNum}</span></td>
                <td style={{padding:"10px 8px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:bill.vendorInvNum?"#f97316":"#333"}}>{bill.vendorInvNum||'--'}{bill._standalone&&bill._fileUrl&&<a href={bill._fileUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title={bill._fileName||'View attached file'} style={{marginLeft:8,display:"inline-flex",alignItems:"center",gap:3,padding:"1px 6px",background:"#a78bfa10",border:"1px solid #a78bfa25",borderRadius:4,color:"#a78bfa",textDecoration:"none",fontSize:10,fontWeight:600,fontFamily:"inherit"}}><I n="file" s={10} color="#a78bfa"/> File</a>}</td>
                <td style={{padding:"10px 8px"}}><div style={{color:bill.job?.id?"#c4c4c4":"#737373",fontSize:12,fontStyle:bill.job?.id?"normal":"italic"}}>{bill.job?.name||'(No Project)'}</div></td>
                <td style={{padding:"10px 8px",whiteSpace:"nowrap"}}>{bill.paid?<span style={{color:"#34d399",fontWeight:600}}>Paid{bill.payDate?' '+bill.payDate:''}</span>:isOverdue?<div><div style={{color:"#f87171",fontWeight:600}}>Overdue</div><div style={{fontSize:10,color:"#f87171"}}>{Math.abs(bill.daysUntil)} day{Math.abs(bill.daysUntil)!==1?'s':''} ago</div></div>:isDueSoon?<div><div style={{color:"#fbbf24",fontWeight:500}}>Due soon</div><div style={{fontSize:10,color:"#fbbf24"}}>Due in {bill.daysUntil} day{bill.daysUntil!==1?'s':''}</div></div>:bill.daysUntil<0?<div><div style={{color:"#a3a3a3"}}>Not entered</div><div style={{fontSize:10,color:"#737373"}}>{bill.dueDate||'--'}</div></div>:<div><div style={{color:"#a3a3a3"}}>Due later</div><div style={{fontSize:10,color:"#737373"}}>Due in {bill.daysUntil} day{bill.daysUntil!==1?'s':''}</div></div>}</td>
                <td style={{padding:"10px 8px"}} onClick={e=>e.stopPropagation()}>{bill._isDeleted?<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><Badge label="deleted" color="#f87171"/><button onClick={()=>{if(confirm('Restore this bill? It will reappear in the active Vendor Bills list with its prior data intact (status, payment info, invoice attachment, etc).')){const existing=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};const{deleted:_d,...rest}=existing;setDocStatus(bill.billDocNum,rest);notify('Bill restored: '+bill.vendorName)}}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #34d39940",background:"transparent",color:"#34d399",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600}} title="Restore this bill keeping its prior payment data, invoice attachment, and notes">Restore</button><button onClick={()=>{if(confirm('Reset and restore this bill as a FRESH unpaid bill?\\n\\nThis wipes ALL prior bill data:\\n - paid status, payment date, check number\\n - invoice attachment and vendor invoice number\\n - any memo or notes\\n - any date overrides\\n\\nUse this when the prior bill data was wrong (e.g. wrong invoice attached, paid status was a mistake). The PO and line items are untouched. This cannot be undone.')){setDocStatus(bill.billDocNum,{});const dateKey=bill.billDocNum+'__date';const dueKey=bill.billDocNum+'__due';if(docStatuses[dateKey]!==undefined)setDocStatus(dateKey,'');if(docStatuses[dueKey]!==undefined)setDocStatus(dueKey,'');notify('Bill reset to fresh unpaid: '+bill.vendorName)}}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #fbbf2440",background:"transparent",color:"#fbbf24",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600}} title="Reset to a fresh unpaid bill -- wipes all prior bill data (paid status, attachments, memo, etc). Use when prior bill data was wrong.">Reset &amp; Restore</button></div>:(()=>{const bd=typeof docStatuses[bill.billDocNum]==='object'?docStatuses[bill.billDocNum]:{};const st=bd.status||(bill.voided?'void':bill.paid?'paid':(bd.checkPrinted||bd.checkNum||bill.checkNum)?'check_sent':'unpaid');const nextStatus={unpaid:'check_sent',check_sent:'paid',paid:'unpaid',void:'unpaid'};return <button onClick={()=>{const ns=nextStatus[st]||'unpaid';
                  // If cycling TO unpaid AND the bill has payments, the new 'unpaid'
                  // status will be overridden on next render because paid is computed
                  // from sum(payments) >= cost. Must clear payments to actually unpay.
                  if (ns === 'unpaid') {
                    const pmts = Array.isArray(bd.payments) ? bd.payments : (bill.payments || []);
                    if (pmts.length > 0) {
                      const confirmMsg = 'This bill has '+pmts.length+' payment'+(pmts.length!==1?'s':'')+' recorded. Setting it to UNPAID will clear all payment entries (you will lose the check number, payment date, and any credit applications). Continue?';
                      if (!window.confirm(confirmMsg)) return;
                      setDocStatus(bill.billDocNum,{...bd,status:'unpaid',paid:false,payments:[],checkNum:'',payDate:'',memo:''});
                      notify(bill.vendorName+' >> unpaid (payments cleared)');
                      return;
                    }
                  }
                  setDocStatus(bill.billDocNum,{...bd,status:ns,paid:ns==='paid'});notify(bill.vendorName+' >> '+ns.replace('_',' '))}} style={{background:"none",border:"none",cursor:"pointer",padding:0}} title="Click to cycle status">{st==='void'?<Badge label="void" color="#525252"/>:st==='paid'?<Badge label="paid" color="#34d399"/>:st==='check_sent'?<Badge label="check sent" color="#f97316"/>:(bill.daysUntil<0&&bill.entered)?<Badge label="overdue" color="#f87171"/>:<StatusBadge docNum={bill.poDocNum}/>}</button>})()}</td>
                <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:bill.paid?"#34d399":bill.isPartiallyPaid?"#fbbf24":isOverdue?"#f87171":"#f0f0f0"}}>{(()=>{if(bill.paid)return <span style={{textDecoration:"line-through",opacity:0.5}}>{fmt(bill.cost)}</span>;if(bill.isCredit){const ca=typeof bill.creditAmount==='number'?bill.creditAmount:bill.cost;const remaining=bill.cost-ca;const isPartial=ca<bill.cost-0.005;return <div><div style={{color:"#34d399",fontSize:12}}>{isPartial?fmt(remaining):"-"+fmt(ca)}</div><div style={{fontSize:9,color:"#34d399",fontWeight:600,marginTop:2,letterSpacing:0.5}}>{isPartial?'CREDIT '+fmt(ca):'FULL CREDIT'}</div></div>}if(bill.isPartiallyPaid){const pc=(bill.payments||[]).length;return <div><div>{fmt(bill.balance)}</div><div style={{fontSize:9,color:"#a3a3a3",fontWeight:500,marginTop:2,letterSpacing:0.3}}>of {fmt(bill.cost)} ({pc} pmt{pc!==1?'s':''})</div></div>}return fmt(bill.cost)})()}</td>
                <td style={{padding:"10px 8px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>{!bill.paid&&!bill.voided&&!bill.isCredit&&!bill._isDeleted&&<button onClick={()=>{if(bill._standalone){const sop=(customSops||[]).find(s=>s.id===bill._sopId);if(!sop){notify('Record not found','error');return}let d={};try{d=JSON.parse(sop.content||'{}')}catch{}const today=new Date().toISOString().split('T')[0];const updated={...d,paid:true,payDate:today};addSop({id:sop.id,title:sop.title,cat:sop.cat,icon:sop.icon,content:JSON.stringify(updated),custom:true});notify('Bill marked paid: '+(d.vendorName||'vendor'));return}setBillInvNum(bill.vendorInvNum);setBillCheckNum(bill.checkNum);setBillPayDate(new Date().toISOString().split('T')[0]);setBillMemo(bill.memo);setBillPayAmount(String(bill.balance||bill.cost));setBillPayInputDate(new Date().toISOString().split('T')[0]);setBillPayCheckInput('');setBillPayInvInput('');setBillPayMemoInput('');setBillDetail(bill)}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #34d39930",background:"transparent",color:"#34d399",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}} onMouseEnter={e=>{e.currentTarget.style.background="#34d39915"}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>{bill.isPartiallyPaid?'Pay Balance':'Pay'}</button>}</td>
              </tr>})}
              <tr style={{borderTop:"2px solid #222",background:"#0a0a0a"}}><td colSpan={7} style={{padding:"10px 8px",fontWeight:700,color:"#f0f0f0"}}>TOTAL OUTSTANDING</td><td style={{padding:"10px 8px",textAlign:"right",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#f97316",fontSize:14}}>{fmt(totalOwed)}</td><td/></tr>
            </tbody>
          </table></div>
        </Card>}
        {/* Standalone Vendor Credit / Vendor Bill creation+edit modal. Only mounts
            on the bills tab. Writes a customSops record with cat 'VendorCredit'
            or 'StandaloneBill' which feeds both this table and getJobFinancials. */}
        {showAdjustModal&&<div onClick={closeAdjustModal} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#111111",border:"1px solid "+(adjustMode==='credit'?"#34d39940":"#f9731640"),borderRadius:12,padding:24,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:adjustMode==='credit'?"#34d399":"#f97316",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>{adjustEdit?"Edit":"New"} {adjustMode==='credit'?"Vendor Credit":"Vendor Bill"}{adjustEdit&&adjustIsVoided()&&<span style={{marginLeft:8,padding:"2px 8px",borderRadius:5,background:"#52525230",border:"1px solid #52525260",color:"#a3a3a3",fontSize:10,letterSpacing:1}}>VOIDED</span>}</div>
                <div style={{fontSize:14,color:"#a3a3a3",marginTop:4}}>{adjustMode==='credit'?"Credit from vendor applied against a project's cost":"Standalone bill not tied to an existing PO"}</div>
              </div>
              <button onClick={closeAdjustModal} style={{background:"none",border:"none",color:"#737373",fontSize:22,cursor:"pointer",fontFamily:"inherit",padding:0,lineHeight:1}}>&times;</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Vendor *</label>
                <select value={adjustForm.vendorId} onChange={e=>setAdjustForm(p=>({...p,vendorId:e.target.value}))} style={{...inputStyle,width:"100%"}}>
                  <option value="">-- Select vendor --</option>
                  {[...(vendors||[])].sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Attach to Project {adjustMode==='credit'?'*':''}</label>
                <select value={adjustForm.jobId} onChange={e=>setAdjustForm(p=>({...p,jobId:e.target.value}))} style={{...inputStyle,width:"100%"}}>
                  <option value="">-- Select project --</option>
                  {adjustMode==='bill' && <option value="__NONE__">No project -- standalone expense (utility, rent, reimbursement, etc.)</option>}
                  {[...(jobs||[])].sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(j=>{const c=customers.find(cc=>cc.id===j.customer);return <option key={j.id} value={j.id}>{j.name}{c?" -- "+c.name:""}</option>})}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Amount *</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14,color:adjustMode==='credit'?"#34d399":"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>$</span>
                    <input type="number" step="0.01" min="0" value={adjustForm.amount} onChange={e=>setAdjustForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={{...inputStyle,width:"100%",fontFamily:"'JetBrains Mono',monospace",color:adjustMode==='credit'?"#34d399":"#f97316"}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Date</label>
                  <input type="date" value={adjustForm.creditDate} onChange={e=>setAdjustForm(p=>({...p,creditDate:e.target.value}))} style={{...inputStyle,width:"100%"}}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Reference / Credit Memo #</label>
                <input type="text" value={adjustForm.refNumber} onChange={e=>setAdjustForm(p=>({...p,refNumber:e.target.value}))} placeholder={adjustMode==='credit'?"e.g. CM-2026-001":"e.g. BILL-2026-001"} style={{...inputStyle,width:"100%"}}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Memo / Notes</label>
                <textarea value={adjustForm.memo} onChange={e=>setAdjustForm(p=>({...p,memo:e.target.value}))} placeholder={adjustMode==='credit'?"e.g. Damaged stool credit -- 7 units":"Reason for the bill"} rows={3} style={{...inputStyle,width:"100%",resize:"vertical",minHeight:60,fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Attachment {adjustMode==='credit'?'(credit memo PDF, image)':'(bill PDF, image)'}</label>
                {!adjustForm.fileUrl&&!adjustUploading&&<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <label style={{padding:"8px 14px",borderRadius:8,border:"1px dashed "+(adjustMode==='credit'?"#34d39940":"#f9731640"),background:"transparent",color:adjustMode==='credit'?"#34d399":"#f97316",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6}}>
                    <I n="upload" s={14}/> Upload File
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt" style={{display:"none"}} onChange={async e=>{
                      const file=e.target.files?.[0];if(!file){return}
                      // 25 MB safety cap (matches Supabase free-tier per-object practical limit)
                      if(file.size>25*1024*1024){notify('File too large -- max 25 MB','error');e.target.value='';return}
                      if(!window._supabase||typeof window._supabase.uploadFile!=='function'){notify('Storage not ready -- refresh the page and try again','error');return}
                      setAdjustUploading(true);
                      try{
                        const ext=(file.name.split('.').pop()||'bin').toLowerCase();
                        const kindPrefix=adjustMode==='credit'?'credits':'standalone-bills';
                        const safeId=(adjustEdit||'new').replace(/[^a-zA-Z0-9-_]/g,'_');
                        const path=kindPrefix+'/'+safeId+'_'+Date.now()+'.'+ext;
                        const url=await window._supabase.uploadFile('vendor-invoices',path,file);
                        if(url){
                          setAdjustForm(p=>({...p,fileUrl:url,fileName:file.name,fileSize:file.size,uploadDate:new Date().toISOString()}));
                          notify('File uploaded: '+file.name);
                        } else {
                          notify('Upload failed -- no URL returned','error');
                        }
                      } catch(err){
                        notify('Upload failed: '+(err?.message||'unknown error'),'error');
                      }
                      setAdjustUploading(false);
                      try{e.target.value=''}catch{}
                    }}/>
                  </label>
                  <span style={{fontSize:11,color:"#525252"}}>PDF, image, or document up to 25 MB</span>
                </div>}
                {adjustUploading&&<div style={{padding:"10px 12px",background:"#0a0a0a",border:"1px solid #2dd4bf30",borderRadius:8,display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#2dd4bf"}}>
                  <span style={{display:"inline-flex",gap:3}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite"}}/>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite 0.2s"}}/>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#2dd4bf",animation:"pulse 1s infinite 0.4s"}}/>
                  </span>
                  <span>Uploading file to storage...</span>
                </div>}
                {adjustForm.fileUrl&&!adjustUploading&&<div style={{padding:"10px 12px",background:"#a78bfa08",border:"1px solid #a78bfa25",borderRadius:8,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <I n="file" s={16} color="#a78bfa"/>
                  <div style={{flex:1,minWidth:120}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e5e5e5",wordBreak:"break-word"}}>{adjustForm.fileName||'Attached file'}</div>
                    {adjustForm.fileSize>0&&<div style={{fontSize:11,color:"#737373",marginTop:2}}>{(adjustForm.fileSize/1024).toFixed(1)} KB{adjustForm.uploadDate?' -- uploaded '+(adjustForm.uploadDate.split('T')[0]):''}</div>}
                  </div>
                  <a href={adjustForm.fileUrl} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",borderRadius:6,border:"1px solid #a78bfa30",background:"#a78bfa15",color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}><I n="external-link" s={12} color="#a78bfa"/> View</a>
                  <button onClick={()=>{setAdjustForm(p=>({...p,fileUrl:'',fileName:'',fileSize:0,uploadDate:''}));notify('Attachment removed (save to apply)')}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #52525230",background:"transparent",color:"#737373",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
                </div>}
              </div>
              {adjustForm.vendorId&&adjustForm.jobId&&Number(adjustForm.amount)>0&&<div style={{padding:"10px 12px",background:"#0a0a0a",borderRadius:8,border:"1px solid "+(adjustMode==='credit'?"#34d39930":"#f9731630"),fontSize:12,color:"#c4c4c4",lineHeight:1.6}}>
                {adjustMode==='credit'
                  ?<>This credit will reduce <strong style={{color:"#e5e5e5"}}>{jobs.find(j=>j.id===adjustForm.jobId)?.name||"the project"}</strong>'s vendor cost by <strong style={{color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(Number(adjustForm.amount))}</strong>, lifting the project margin and lowering Total Owed.</>
                  :<>This bill will add <strong style={{color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(Number(adjustForm.amount))}</strong> to <strong style={{color:"#e5e5e5"}}>{jobs.find(j=>j.id===adjustForm.jobId)?.name||"the project"}</strong>'s vendor cost and Total Owed until marked paid.</>}
              </div>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
              {adjustEdit&&adjustMode==='bill'&&<Btn v="secondary" style={{fontSize:12,color:adjustIsVoided()?"#34d399":"#a3a3a3",border:"1px solid "+(adjustIsVoided()?"#34d39940":"#52525260")}} onClick={()=>{const _msg=adjustIsVoided()?'Unvoid this bill? It will count toward job cost and Total Owed again.':'Void this bill? It stays on record for the audit trail but stops counting toward job cost and Total Owed. You can unvoid it later.';if(ctx&&typeof ctx.confirm==='function'){ctx.confirm(_msg).then(ok=>{if(ok)toggleAdjustVoid()})}else if(window.confirm(_msg)){toggleAdjustVoid()}}}>{adjustIsVoided()?'Unvoid':'Void'}</Btn>}
              {adjustEdit&&<Btn v="danger" style={{fontSize:12}} onClick={()=>{const _doDelete=()=>{deleteAdjust(adjustEdit);closeAdjustModal()};if(ctx&&typeof ctx.confirm==='function'){ctx.confirm('Delete this '+(adjustMode==='credit'?'credit':'bill')+'?').then(ok=>{if(ok)_doDelete()})}else if(window.confirm('Delete this '+(adjustMode==='credit'?'credit':'bill')+'?')){_doDelete()}}}>Delete</Btn>}
              <Btn v="secondary" onClick={closeAdjustModal}>Cancel</Btn>
              <Btn onClick={saveAdjust} disabled={adjustUploading} style={{background:adjustUploading?"#525252":(adjustMode==='credit'?"#34d399":"#f97316"),color:"#000",fontWeight:700,opacity:adjustUploading?0.6:1,cursor:adjustUploading?"not-allowed":"pointer"}}>{adjustUploading?"Uploading...":(adjustEdit?"Save Changes":"Create "+(adjustMode==='credit'?"Credit":"Bill"))}</Btn>
            </div>
          </div>
        </div>}
        {showExpenseCheck&&<div onClick={()=>setShowExpenseCheck(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0a0a0a",borderRadius:12,padding:24,maxWidth:520,width:"100%",border:"1px solid #14b8a640",maxHeight:"90vh",overflow:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <h3 style={{margin:0,fontSize:18,fontWeight:700,color:"#14b8a6"}}>Print Expense Check</h3>
                <div style={{fontSize:12,color:"#a3a3a3",marginTop:4}}>Print a check for an expense or reimbursement without first creating a vendor bill</div>
              </div>
              <button onClick={()=>setShowExpenseCheck(false)} style={{background:"none",border:"none",color:"#737373",cursor:"pointer",fontSize:24,lineHeight:1,padding:4,fontFamily:"inherit"}}>&times;</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Pay to the Order Of *</label>
                <input type="text" value={expenseForm.payee} onChange={e=>setExpenseForm(p=>({...p,payee:e.target.value}))} placeholder="e.g. ComEd, John Smith, Office Depot" style={{...inputStyle,width:"100%"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Amount *</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14,color:"#14b8a6",fontFamily:"'JetBrains Mono',monospace"}}>$</span>
                    <input type="number" step="0.01" min="0" value={expenseForm.amount} onChange={e=>setExpenseForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={{...inputStyle,width:"100%",fontFamily:"'JetBrains Mono',monospace",color:"#14b8a6"}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Date</label>
                  <input type="date" value={expenseForm.date} onChange={e=>setExpenseForm(p=>({...p,date:e.target.value}))} style={{...inputStyle,width:"100%"}}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Memo</label>
                <input type="text" value={expenseForm.memo} onChange={e=>setExpenseForm(p=>({...p,memo:e.target.value}))} placeholder="e.g. Electricity April 2026, Office supplies, Mileage reimbursement" style={{...inputStyle,width:"100%"}}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4,fontWeight:600}}>Payee Address (optional)</label>
                <textarea value={expenseForm.address} onChange={e=>setExpenseForm(p=>({...p,address:e.target.value}))} placeholder={"PO Box 805379\nChicago, IL 60680-4115"} rows={3} style={{...inputStyle,width:"100%",resize:"vertical",minHeight:60,fontFamily:"inherit"}}/>
                <div style={{fontSize:10,color:"#525252",marginTop:4}}>Shown on the check below the payee line (use for window envelopes)</div>
              </div>
              <div style={{padding:"10px 12px",background:"#14b8a608",border:"1px solid #14b8a625",borderRadius:8,fontSize:11,color:"#a3a3a3",lineHeight:1.5}}>
                <div style={{fontWeight:700,color:"#14b8a6",marginBottom:4}}>How this is different from a vendor bill</div>
                Vendor bills track invoices from vendors and live in the bills list until paid. Expense checks print a check immediately for one-off expenses (utilities, reimbursements, office supplies) without creating a bill record. The check number is reserved and the expense is logged for audit trail.
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18,paddingTop:14,borderTop:"1px solid #222"}}>
              <Btn v="secondary" onClick={()=>setShowExpenseCheck(false)}>Cancel</Btn>
              <Btn onClick={printExpenseCheck} style={{background:"#14b8a6",color:"#000",fontWeight:700}}><I n="file" s={14}/> Print Check</Btn>
            </div>
          </div>
        </div>}
      </div>})()}


    {tab==="invoices"&&<><div style={{marginBottom:12,padding:"12px 16px",background:"#111111",borderRadius:8,border:"1px solid #222222"}}><div style={{fontSize:13,fontWeight:600,color:"#2dd4bf",marginBottom:4}}>How Partial Invoicing Works</div><div style={{fontSize:12,color:"#c4c4c4"}}>Invoices are auto-generated from received quantities. If 200 units were ordered, 120 received, and 80 already invoiced, the system drafts an invoice for the remaining 40 units. Each invoice only includes items with uninvoiced received quantities.</div></div>
        {(()=>{const overdueJobs2=filteredJobs.filter(j=>{if(j.paymentStatus==="paid")return false;const items2=getJobItems(j.id);const hasInvoiced=items2.some(i=>i.qtyInvoiced>0);if(!hasInvoiced)return false;const terms2=j.terms||"Net 30";const days=terms2.includes("15")?15:terms2.includes("Receipt")?0:30;const created=new Date(j.createdDate);const due=new Date(created);due.setDate(due.getDate()+days);return new Date()>due});return overdueJobs2.length>0?<Card style={{marginBottom:12,border:"1px solid #f8717130"}}><div style={{fontSize:14,fontWeight:700,color:"#f87171",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><I n="alert" s={16}/> Payment Reminders ({overdueJobs2.length} overdue)</div>{overdueJobs2.map(job=>{const cust=customers.find(c=>c.id===job.customer);const f2=getJobFinancials(job.id);const invoicedAmt=getJobItems(job.id).reduce((s,i)=>s+i.unitPrice*i.qtyInvoiced,0);return <div key={job.id} style={{padding:"10px 12px",background:"#f8717108",borderRadius:8,marginBottom:8,border:"1px solid #f8717115"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div><span style={{fontSize:13,fontWeight:600,color:"#e5e5e5"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:10,marginRight:5}}>{projectNum(job.id)}</span>{job.name}</span><span style={{fontSize:12,color:"#a3a3a3",marginLeft:8}}>{cust?.name}</span></div><span style={{fontSize:14,fontWeight:700,color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(invoicedAmt)}</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn v="danger" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>{const email=cust?.email||"";const subject="Payment Reminder - "+job.name+" - Midwest Educational Furnishings";const body="Dear "+(cust?.contact||cust?.name||"Customer")+",\n\nThis is a friendly reminder that payment of "+fmt(invoicedAmt)+" for "+job.name+" is now past due.\n\nTerms: "+(job.terms||"Net 30")+"\n\nPlease remit payment at your earliest convenience.\n\nBlessings,\nMidwest Educational Furnishings\n(847) 847-1865";setEmailTo(email);setEmailSubject(subject);setEmailBody(body);setEmailModal({type:"reminder",job})}}>Send External Reminder</Btn><Btn v="ghost" style={{fontSize:11,padding:"4px 10px",color:"#fbbf24"}} onClick={()=>{const rep=reps.find(r=>r.id===job.salesRep);notify("REMINDER: Payment overdue for "+fmt(invoicedAmt)+" - "+(cust?.name||"")+" - notified internally");notify("Internal reminder logged for "+job.name)}}>Log Internal Reminder</Btn><span style={{fontSize:11,color:"#a3a3a3",padding:"4px 0"}}>Terms: {job.terms||"Net 30"}</span></div></div>})}</Card>:null})()}<div>{[...filteredJobs].sort((a,b)=>{const aHas=getJobItems(a.id).some(i=>i.qtyReceived>i.qtyInvoiced)?0:1;const bHas=getJobItems(b.id).some(i=>i.qtyReceived>i.qtyInvoiced)?0:1;return aHas-bHas}).map(job=>{const inv=genInvoice(job);const items=getJobItems(job.id);const invoicedTotal=items.reduce((s,i)=>s+i.unitPrice*i.qtyInvoiced,0);const fullTotal=items.reduce((s,i)=>s+i.unitPrice*i.qtyOrdered,0);const isComplete=items.length>0&&items.every(i=>i.qtyInvoiced>=i.qtyOrdered);const hasPending=inv.items.length>0;const customer=customers.find(c=>c.id===job.customer);return <Card key={job.id} style={{marginBottom:12,opacity:isComplete?0.65:1,border:hasPending?"1px solid #d9770630":"1px solid #222222"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:14,fontWeight:700,color:"#e5e5e5"}}><span style={{fontFamily:"'JetBrains Mono',monospace",color:"#525252",fontSize:11,marginRight:6}}>{projectNum(job.id)}</span>{job.name}</span>{isComplete?<Badge label="fully invoiced" color="#34d399"/>:hasPending?<Badge label="partial ready" color="#fbbf24"/>:<Badge label="awaiting delivery" color="#525252"/>}<StatusBadge docNum={inv.docNum}/></div><div style={{fontSize:12,color:"#a3a3a3"}}>{customer?.name} - {fmt(invoicedTotal)} of {fmt(fullTotal)} invoiced</div></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{(()=>{const jobPOs=genPOs(job);const anyPODrafted=jobPOs.some(po=>docStatuses[po.docNum]&&docStatuses[po.docNum]!=="new");const fullInv=genInvoice(job,true);const allReceived=items.length>0&&items.every(i=>i.qtyReceived>=i.qtyOrdered);return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(()=>{const priorInvStatus=docStatuses[inv.docNum];const hasPriorInvoice=!!(priorInvStatus&&priorInvStatus!=="new");return hasPending&&anyPODrafted&&hasPriorInvoice?<Btn v="ghost" style={{fontSize:12,color:"#2dd4bf",border:"1px solid #2dd4bf60",fontWeight:700}} onClick={()=>{setIsProforma(false);setIsCreditMemo(false);setIsAdvanceInvoice(false);setLineOverrides({});setIsRemainingBalanceFlow(true);setPreviewDoc({type:"invoice",data:inv,job});setTab("preview");notify("Remaining balance flow -- enter the qty for THIS invoice in the breakdown panel")}}><I n="receipt" s={14}/> Remaining Balance Invoice</Btn>:null})()}{hasPending&&anyPODrafted&&<Btn onClick={()=>{setIsProforma(false);setIsCreditMemo(false);setIsAdvanceInvoice(false);setLineOverrides({});setIsRemainingBalanceFlow(false);setPreviewDoc({type:"invoice",data:inv,job});setTab("preview")}}><I n="receipt" s={14}/> {inv.isPartial?"Partial":"Full"} Invoice ({fmt(inv.total)})</Btn>}{hasPending&&anyPODrafted&&<Btn v="ghost" style={{fontSize:11,color:"#a78bfa",border:"1px solid #a78bfa30"}} onClick={()=>{setIsProforma(true);setIsCreditMemo(false);setIsAdvanceInvoice(false);setLineOverrides({});setIsRemainingBalanceFlow(false);setPreviewDoc({type:"invoice",data:inv,job});setTab("preview")}}>ProForma</Btn>}{hasPending&&anyPODrafted&&<Btn v="ghost" style={{fontSize:11,color:"#f87171",border:"1px solid #f8717130"}} onClick={()=>{setIsCreditMemo(true);setIsProforma(false);setIsAdvanceInvoice(false);setLineOverrides({});setIsRemainingBalanceFlow(false);setPreviewDoc({type:"invoice",data:inv,job});setTab("preview")}}>Credit Memo</Btn>}{hasPending&&!anyPODrafted&&<span style={{fontSize:12,color:"#fbbf24",padding:"6px 10px"}}>Draft POs first</span>}{!hasPending&&!isComplete&&allReceived&&<Btn v="ghost" style={{fontSize:12}} onClick={()=>{setIsProforma(false);setIsCreditMemo(false);setIsAdvanceInvoice(false);setLineOverrides({});setIsRemainingBalanceFlow(false);setPreviewDoc({type:"invoice",data:fullInv,job});setTab("preview")}}>Full Invoice ({fmt(fullInv.total)})</Btn>}{!hasPending&&!isComplete&&!allReceived&&anyPODrafted&&fullInv.total>0&&<Btn v="ghost" style={{fontSize:12,color:"#a78bfa",border:"1px solid #a78bfa40",fontWeight:700}} title="Generate a real customer invoice BEFORE items ship -- for prepay/deposit scenarios. The invoice is clearly labeled as an Advance Invoice so the customer knows goods are not yet shipped." onClick={()=>{setIsProforma(false);setIsCreditMemo(false);setIsAdvanceInvoice(true);setLineOverrides({});setIsRemainingBalanceFlow(false);setPreviewDoc({type:"invoice",data:fullInv,job});setTab("preview");notify("Advance Invoice flow -- customer invoice for items NOT YET shipped. Use Mark All Invoiced to record amounts billed.")}}><I n="receipt" s={14}/> Advance Invoice ({fmt(fullInv.total)})</Btn>}{isComplete&&<Badge label="fully invoiced" color="#34d399"/>}</div>})()}{job.paymentStatus!=="paid"&&<Btn v="ghost" style={{fontSize:11}} onClick={()=>{updateJob(job.id,{paymentStatus:isComplete?"paid":"partial"});notify(isComplete?"Marked as paid":"Marked partial payment")}}>Mark {isComplete?"Paid":"Partial"}</Btn>}{job.paymentStatus==="paid"&&<Badge label="paid" color="#34d399"/>}</div></div><Bar value={invoicedTotal} max={fullTotal||1} color={isComplete?"#34d399":"#fbbf24"} height={4}/>{hasPending&&<div style={{marginTop:10,borderTop:"1px solid #222222",paddingTop:10}}><div style={{fontSize:12,fontWeight:600,color:"#fbbf24",marginBottom:6}}>Ready to invoice ({inv.items.length} items - {fmt(inv.total)}):</div>{inv.items.map((item,idx)=><div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:12,color:"#c4c4c4"}}><span style={{flex:1}}>{item.description}</span><span style={{display:"flex",gap:12,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}><span>ordered: {fmtN(item.qtyOrdered)}</span><span>received: {fmtN(item.qtyReceived)}</span><span>invoiced: {fmtN(item.qtyInvoiced)}</span><span style={{color:"#fbbf24",fontWeight:600}}>this invoice: {fmtN(item.displayQty)} x {fmt(item.displayPrice)} = {fmt(item.displayQty*item.displayPrice)}</span></span></div>)}</div>}</Card>})}</div></>}


    {tab==="payments"&&(()=>{
      // Get all payment records from docStatuses
      const paymentRecords=Object.entries(docStatuses).filter(([k,v])=>k.startsWith('PAY-')&&v&&typeof v==='object'&&v.jobId).map(([k,v])=>({id:k,...v})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      const totalReceived=paymentRecords.reduce((s,p)=>s+(p.amount||0),0);


      const unpaidJobs=jobs.filter(j=>j.paymentStatus!=='paid');
      const selectedJob=payJob?jobs.find(j=>j.id===payJob):null;
      const selCustomer=selectedJob?customers.find(c=>c.id===selectedJob.customer):null;
      const selItems=selectedJob?getJobItems(selectedJob.id):[];
      const selFinancials=selectedJob?getJobFinancials(selectedJob.id):{totalRevenue:0};
      const invoicedAmt=selItems.reduce((s,i)=>s+(i.unitPrice||0)*i.qtyInvoiced,0);
      const outstandingAmt=selFinancials.totalRevenue-(selectedJob?.paidAmount||0);


      // Outstanding invoices for selected job
      const invDocNum=selectedJob?stableNum('INV-',selectedJob.id,selectedJob.customer):'';
      const outstanding=selectedJob?[{description:'Invoice '+invDocNum+' - '+selectedJob.name,dueDate:selectedJob.dueDate||'',amount:invoicedAmt||selFinancials.totalRevenue,jobId:selectedJob.id}]:[];


      const handleRecord=()=>{
        if(!payJob||!payAmt)return;
        const amt=parseFloat(payAmt)||0;
        if(amt<=0)return;
        const payId='PAY-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
        setDocStatus(payId,{jobId:payJob,customer:selCustomer?.name||'',jobName:selectedJob?.name||'',amount:amt,date:payDate,ref:payRef,method:payMethod,deposit:payDeposit,memo:payMemo,invoiceNum:invDocNum,docUrl:payDocUrl||'',docName:payDocName||''});
        // Update job payment status
        const totalPaidForJob=paymentRecords.filter(p=>p.jobId===payJob).reduce((s,p)=>s+(p.amount||0),0)+amt;
        if(totalPaidForJob>=selFinancials.totalRevenue*0.99){
          updateJob(payJob,{paymentStatus:'paid',endDate:payDate});
        } else if(totalPaidForJob>0){
          updateJob(payJob,{paymentStatus:'partial'});
        }
        notify('Payment of '+fmt(amt)+' recorded for '+selectedJob?.name);
        setPayAmt('');setPayRef('');setPayMemo('');setPayJob('');setPaySelected({});setPayDocUrl('');setPayDocName('');
      };


      const syncStripePayments=async()=>{
        setStripeLoading(true);
        try{
          // Find all jobs that have Stripe payment sessions
          const stripeSessions=[];
          jobs.forEach(j=>{
            const ds=j.docStatuses||{};
            Object.entries(ds).forEach(([k,v])=>{
              if(k.endsWith('__stripe')&&v?.session_id){
                const invNum=k.replace('__stripe','');
                // Check if already recorded as payment
                const alreadyLogged=paymentRecords.some(p=>p.ref==='Stripe:'+v.session_id||p.stripeSessionId===v.session_id);
                if(!alreadyLogged)stripeSessions.push({session_id:v.session_id,jobId:j.id,jobName:j.name,invNum,amount:v.amount,customer:customers.find(c=>c.id===j.customer)?.name||''});
              }
            });
          });
          if(stripeSessions.length===0){notify('No pending Stripe payments to sync.');setStripeLoading(false);return}
          let synced=0;
          for(const sess of stripeSessions){
            try{
              const r=await fetch('/api/stripe-pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'check_status',session_id:sess.session_id})});
              const data=await r.json();
              if(data.status==='paid'){
                // Auto-log the payment
                const payId='PAY-STRIPE-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
                const amt=(data.amount||0)/100;
                setDocStatus(payId,{jobId:sess.jobId,customer:sess.customer||data.customer_name||'',jobName:sess.jobName,amount:amt,date:new Date().toISOString().split('T')[0],ref:'Stripe:'+sess.session_id,method:'credit_card',deposit:'Operating',memo:'Stripe online payment for '+sess.invNum,invoiceNum:sess.invNum,stripeSessionId:sess.session_id,customerEmail:data.customer_email||''});
                // Update job payment status
                const jobFinancials=getJobFinancials(sess.jobId);
                const existingPaid=paymentRecords.filter(p=>p.jobId===sess.jobId).reduce((s,p)=>s+(p.amount||0),0)+amt;
                if(existingPaid>=jobFinancials.totalRevenue*0.99){
                  updateJob(sess.jobId,{paymentStatus:'paid',endDate:new Date().toISOString().split('T')[0]});
                }else if(existingPaid>0){
                  updateJob(sess.jobId,{paymentStatus:'partial'});
                }
                synced++;
              }
            }catch{}
          }
          notify(synced>0?synced+' Stripe payment'+(synced!==1?'s':'')+' synced and logged!':'No completed Stripe payments found.');
        }catch(err){notify('Stripe sync error: '+err.message,'error')}
        setStripeLoading(false);
      };


      return <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}} className="resp-grid-4">
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>TOTAL RECEIVED</div><div style={{fontSize:22,fontWeight:800,color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(totalReceived)}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{paymentRecords.length} payment{paymentRecords.length!==1?'s':''}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>OUTSTANDING</div><div style={{fontSize:22,fontWeight:800,color:"#fbbf24",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(unpaidJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0))}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>{unpaidJobs.length} job{unpaidJobs.length!==1?'s':''}</div></Card>
          <Card style={{padding:14,textAlign:"center"}} hover><div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>PAID JOBS</div><div style={{fontSize:22,fontWeight:800,color:"#2dd4bf",fontFamily:"'JetBrains Mono',monospace"}}>{jobs.filter(j=>j.paymentStatus==='paid').length}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>of {jobs.length} total</div></Card>
          <Card style={{padding:14,textAlign:"center",cursor:"pointer",border:"1px solid #a78bfa20"}} hover onClick={syncStripePayments}><div style={{fontSize:10,color:"#a78bfa",fontWeight:600,letterSpacing:2,marginBottom:4}}>STRIPE SYNC</div><div style={{fontSize:14,fontWeight:800,color:stripeLoading?"#a78bfa":"#f0f0f0"}}>{stripeLoading?"Checking...":"Sync Payments"}</div><div style={{fontSize:11,color:"#a3a3a3",marginTop:4}}>check for online payments</div></Card>
        </div>


        <Card style={{padding:20}}>
          <div style={{fontSize:18,fontWeight:800,color:"#34d399",marginBottom:16,fontFamily:"'JetBrains Mono',monospace"}}>Receive Payment</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}} className="resp-grid-2">
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Customer / Job</label><select value={payJob} onChange={e=>setPayJob(e.target.value)} style={inputStyle}><option value="">Select a job...</option>{unpaidJobs.map(j=>{const c=customers.find(c2=>c2.id===j.customer);return <option key={j.id} value={j.id}>{j.name} - {c?.name||''}</option>})}</select></div>
                <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Date</label><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={inputStyle}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
                <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Reference / Check No.</label><input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="e.g. Check #4521" style={inputStyle}/></div>
                <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Payment Method</label><select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={inputStyle}><option value="check">Check</option><option value="ach">ACH / Wire</option><option value="credit_card">Credit Card</option><option value="cash">Cash</option><option value="other">Other</option></select></div>
                <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Deposit To</label><select value={payDeposit} onChange={e=>setPayDeposit(e.target.value)} style={inputStyle}><option>Operating Account</option><option>Savings Account</option><option>Money Market</option><option>Undeposited Funds</option></select></div>
              </div>
              <div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Memo</label><input value={payMemo} onChange={e=>setPayMemo(e.target.value)} placeholder="Optional notes..." style={inputStyle}/></div>
            </div>
            <Card style={{padding:16,background:"#0a0a0a",textAlign:"right"}}>
              <div style={{fontSize:10,color:"#737373",fontWeight:600,letterSpacing:2,marginBottom:4}}>AMOUNT RECEIVED</div>
              <input value={payAmt} onChange={e=>setPayAmt(e.target.value)} type="number" placeholder="0.00" style={{...inputStyle,fontSize:28,fontWeight:800,textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#34d399",background:"transparent",border:"none",borderBottom:"2px solid #34d39930",borderRadius:0,padding:"4px 0",width:"100%"}}/>
              {selectedJob&&<div style={{fontSize:12,color:"#a3a3a3",marginTop:8}}>Customer balance: {fmt(selFinancials.totalRevenue)}</div>}
            </Card>
          </div>


          {selectedJob&&<div style={{marginTop:8}}>
            <div style={{fontSize:14,fontWeight:700,color:"#e5e5e5",marginBottom:8}}>Outstanding Transactions</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["","Description","Due Date","Original Amount","Payment"].map((h,i)=><th key={i} style={{padding:"8px 6px",textAlign:i>=3?"right":i===0?"center":"left",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
              {outstanding.map((inv,idx)=><tr key={idx} style={{borderBottom:"1px solid #111"}}><td style={{padding:"8px 6px",textAlign:"center",width:36}}><input type="checkbox" checked={!!paySelected[idx]} onChange={()=>{const next={...paySelected,[idx]:!paySelected[idx]};setPaySelected(next);if(next[idx]&&!payAmt)setPayAmt(String(inv.amount.toFixed(2)))}} style={{accentColor:"#2dd4bf",width:16,height:16,cursor:"pointer"}}/></td><td style={{padding:"8px 6px"}}><span style={{color:"#2dd4bf"}}>{inv.description}</span></td><td style={{padding:"8px 6px",color:"#a3a3a3"}}>{inv.dueDate||'Not set'}</td><td style={{padding:"8px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(inv.amount)}</td><td style={{padding:"8px 6px",textAlign:"right",width:120}}><input type="number" value={paySelected[idx]?payAmt:''} onChange={e=>{setPayAmt(e.target.value);setPaySelected({...paySelected,[idx]:true})}} placeholder="0.00" style={{...inputStyle,width:100,textAlign:"right",fontSize:12,fontFamily:"'JetBrains Mono',monospace",padding:"4px 8px"}}/></td></tr>)}
            </tbody></table></div>
          </div>}


          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
            <input type="file" id="paymentDocUpload" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.tiff" style={{display:"none"}} onChange={async e=>{
              const file=e.target.files?.[0];if(!file)return;
              notify('Scanning document...');
              try{
                // Upload to Supabase Storage
                const ext=file.name.split('.').pop()||'pdf';
                const path='payments/pay_'+Date.now()+'.'+ext;
                const url=await window._supabase.uploadFile('vendor-invoices',path,file);
                if(url)setPayDocUrl(url);
                setPayDocName(file.name);
                // AI scan to extract check number, date, method
                const reader=new FileReader();
                reader.onload=async()=>{
                  const base64=reader.result.split(',')[1];
                  const mediaType=file.type||'application/pdf';
                  try{
                    const resp=await fetch('/api/ai-scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64,mediaType,prompt:'Extract from this payment document: 1) check number or reference number, 2) payment date (format YYYY-MM-DD), 3) payment method (check, ach, credit_card, cash, or other), 4) amount. Return ONLY a JSON object like: {"ref":"12345","date":"2026-03-28","method":"check","amount":"5000.00"}. If a field is not found, use empty string.'})});
                    if(resp.ok){
                      const data=await resp.json();
                      const text=(data.text||'').trim();
                      try{
                        const cleaned=text.replace(/```json\s*/g,'').replace(/```/g,'').trim();
                        const parsed=JSON.parse(cleaned);
                        if(parsed.ref)setPayRef(parsed.ref);
                        if(parsed.date)setPayDate(parsed.date);
                        if(parsed.method)setPayMethod(parsed.method);
                        if(parsed.amount)setPayAmt(parsed.amount);
                        notify('AI extracted: Ref #'+(parsed.ref||'--')+', Date: '+(parsed.date||'--')+', Method: '+(parsed.method||'--'));
                      }catch{if(text.length<50)setPayRef(text);notify('AI extracted reference: '+text)}
                    }
                  }catch(err){console.error('AI scan error:',err)}
                };
                reader.readAsDataURL(file);
              }catch(err){console.error('Upload error:',err);notify('Upload error: '+err.message)}
              e.target.value='';
            }}/>
            <Btn v="secondary" onClick={()=>document.getElementById('paymentDocUpload')?.click()} style={{display:"flex",alignItems:"center",gap:6}}><I n="upload" s={12}/> Upload Payment Doc</Btn>
            {payDocName&&<span style={{fontSize:11,color:"#a78bfa",display:"flex",alignItems:"center",gap:4}}><I n="file" s={10} color="#a78bfa"/>{payDocName}</span>}
            <Btn v="secondary" onClick={()=>{setPayJob('');setPayAmt('');setPayRef('');setPayMemo('');setPaySelected({});setPayDocUrl('');setPayDocName('')}}>Clear</Btn>
            <Btn onClick={()=>{handleRecord();if(payDocUrl){/* doc url saved with record */}}} style={{padding:"10px 24px",opacity:(!payJob||!payAmt)?0.4:1,pointerEvents:(!payJob||!payAmt)?'none':'auto'}}>Record Payment</Btn>
          </div>
        </Card>


        {paymentRecords.length>0&&<Card style={{padding:20}}>
          <div style={{fontSize:18,fontWeight:800,color:"#f0f0f0",marginBottom:16,fontFamily:"'JetBrains Mono',monospace"}}>Payment History</div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}><thead><tr style={{borderBottom:"2px solid #222"}}>{["Date","Customer / Job","Reference","Method","Deposit To","Doc","Amount",""].map((h,i)=><th key={i} style={{padding:"8px 6px",textAlign:i>=6?"right":"left",color:"#737373",fontSize:11,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>
            {paymentRecords.map(p=><tr key={p.id} style={{borderBottom:"1px solid #111"}}><td style={{padding:"8px 6px",color:"#a3a3a3",whiteSpace:"nowrap"}}>{p.date}</td><td style={{padding:"8px 6px"}}><div style={{color:"#e5e5e5",fontWeight:500,display:"flex",alignItems:"center",gap:6}}>{p.jobName}{p.stripeSessionId&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:"#a78bfa15",color:"#a78bfa",fontWeight:600}}>STRIPE</span>}</div><div style={{fontSize:11,color:"#737373"}}>{p.customer}{p.invoiceNum?" -- "+p.invoiceNum:""}</div></td><td style={{padding:"8px 6px",fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa",fontSize:11}}>{p.ref||'--'}</td><td style={{padding:"8px 6px",color:"#a3a3a3",textTransform:"capitalize"}}>{(p.method||'').replace('_',' ')}</td><td style={{padding:"8px 6px",color:"#a3a3a3"}}>{p.deposit||'--'}</td><td style={{padding:"8px 6px"}}>{p.docUrl?<a href={p.docUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#a78bfa",textDecoration:"none",display:"flex",alignItems:"center",gap:3}}><I n="file" s={10} color="#a78bfa"/>{p.docName?p.docName.slice(0,15)+'...':'View'}</a>:<span style={{color:"#333"}}>--</span>}</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:"#34d399"}}>{fmt(p.amount)}</td><td style={{padding:"8px 6px",textAlign:"right"}}><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}><button onClick={()=>{setPayJob(p.jobId||'');setPayDate(p.date||'');setPayRef(p.ref||'');setPayMethod(p.method||'check');setPayDeposit(p.deposit||'Operating Account');setPayMemo(p.memo||'');setPayAmt(String(p.amount||''));setPayDocUrl(p.docUrl||'');setPayDocName(p.docName||'');setDocStatus(p.id,'deleted');notify('Editing payment -- make changes and Record again')}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #333",background:"transparent",color:"#a3a3a3",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Edit</button><button onClick={()=>{if(confirm('Delete this payment record?')){setDocStatus(p.id,'deleted');notify('Payment deleted: '+fmt(p.amount))}}} style={{padding:"3px 8px",borderRadius:5,border:"1px solid #f8717130",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Del</button></div></td></tr>)}
            <tr style={{borderTop:"2px solid #222"}}><td colSpan={6} style={{padding:"8px 6px",fontWeight:700}}>TOTAL RECEIVED</td><td style={{padding:"8px 6px",textAlign:"right",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:"#34d399",fontSize:14}}>{fmt(totalReceived)}</td><td/></tr>
          </tbody></table></div>
        </Card>}
      </div>})()}


    {tab==="preview"&&previewDoc&&<Card style={{border:"1px solid #2dd4bf30",overflow:"hidden",maxWidth:"100%"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:16,fontWeight:700,color:"#2dd4bf"}}>{previewDoc.type==="quote"?("PROJECT QUOTE"+(previewDoc.data.projectNum?" #"+previewDoc.data.projectNum:"")):previewDoc.type==="po"?"PURCHASE ORDER":previewDoc.type==="commission"?"COMMISSION STATEMENT":previewDoc.data?.isPartial?"PARTIAL INVOICE":isCreditMemo?"CREDIT MEMO":isProforma?"PROFORMA INVOICE":isAdvanceInvoice?"ADVANCE INVOICE":"INVOICE"}</div><StatusBadge docNum={previewDoc.data.docNum}/></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{previewDoc.data.docNum&&<div style={{display:"flex",gap:4}}>{["drafted","sent","approved"].map(s=><button key={s} onClick={()=>setDocStatus(previewDoc.data.docNum,s)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+(docStatuses[previewDoc.data.docNum]===s?"#2dd4bf":"#444"),background:docStatuses[previewDoc.data.docNum]===s?"#2dd4bf20":"transparent",color:docStatuses[previewDoc.data.docNum]===s?"#2dd4bf":"#c4c4c4",fontSize:12,fontFamily:"inherit",cursor:"pointer",textTransform:"capitalize"}}>{s}</button>)}</div>}<Btn onClick={()=>{const _decorated=previewDoc.type==="invoice"?{...previewDoc,data:{...previewDoc.data,items:(previewDoc.data.items||[]).map(it=>{const _ovRaw=lineOverrides[it.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!=="";const _suggested=it.displayQty!==undefined?it.displayQty:it.qtyOrdered;const _q=_hasOv?Number(_ovRaw):_suggested;return {...it,displayQty:isNaN(_q)?_suggested:_q}}),total:(previewDoc.data.items||[]).reduce((s,i)=>{const _ovRaw=lineOverrides[i.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!=="";const _sug=i.displayQty!==undefined?i.displayQty:i.qtyOrdered;const _q=_hasOv?Number(_ovRaw):_sug;const _safe=isNaN(_q)?0:_q;const _pr=i.displayPrice!==undefined?i.displayPrice:i.unitPrice;return s+_safe*(_pr||0)},0)}}:previewDoc;handleExportPDF(_decorated);}}><I n="download" s={14}/> Export PDF</Btn>
      {previewDoc.data.docNum&&previewDoc.type!=="commission"&&<div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:10,color:"#737373",fontWeight:600,whiteSpace:"nowrap"}}>DATE</label>
          <input type="date" value={docStatuses[previewDoc.data.docNum+'__date']||''} onChange={e=>{setDocStatus(previewDoc.data.docNum+'__date',e.target.value);if(e.target.value&&!docStatuses[previewDoc.data.docNum+'__due']){const terms=previewDoc.job?.terms||'Net 30';const days=terms.includes('15')?15:terms.includes('Receipt')?0:30;const d=new Date(e.target.value+'T12:00:00');d.setDate(d.getDate()+days);setDocStatus(previewDoc.data.docNum+'__due',d.toISOString().split('T')[0])}}} style={{...inputStyle,width:130,fontSize:11,padding:"3px 6px"}}/>
        </div>
        {(previewDoc.type==="invoice"||previewDoc.type==="po")&&<div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:10,color:"#737373",fontWeight:600,whiteSpace:"nowrap"}}>DUE</label>
          <input type="date" value={docStatuses[previewDoc.data.docNum+'__due']||''} onChange={e=>setDocStatus(previewDoc.data.docNum+'__due',e.target.value)} style={{...inputStyle,width:130,fontSize:11,padding:"3px 6px"}}/>
        </div>}
        {(docStatuses[previewDoc.data.docNum+'__date']||docStatuses[previewDoc.data.docNum+'__due'])&&<button onClick={()=>{setDocStatus(previewDoc.data.docNum+'__date','');setDocStatus(previewDoc.data.docNum+'__due','');notify('Dates reset to today')}} style={{fontSize:9,color:"#f87171",background:"transparent",border:"1px solid #f8717130",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"}}>Reset</button>}
      </div>}{previewDoc.type==="quote"&&<Btn v="ghost" onClick={()=>{const data=btoa(JSON.stringify({hiddenCols,projectNum:previewDoc.data.projectNum,job:{name:previewDoc.job.name,terms:previewDoc.job.terms,shipTo:previewDoc.job.shipTo,shipVia:previewDoc.job.shipVia||"",poNumber:previewDoc.job.poNumber||"",billTo:previewDoc.job.billTo||""},customer:{name:previewDoc.data.customer?.name||"",contact:previewDoc.data.customer?.contact||"",address:previewDoc.data.customer?.address||"",email:previewDoc.data.customer?.email||""},items:previewDoc.data.items.map(it=>({description:it.description||"",tag:it.tag||"",manufacturer:it.manufacturer||"",modelNumber:it.modelNumber||"",color:it.color||"",qtyOrdered:it.qtyOrdered||0,unitPrice:it.unitPrice||0,shippingPerUnit:it.shippingPerUnit||0,installPerUnit:it.installPerUnit||0})),total:previewDoc.data.total,docNum:previewDoc.data.docNum}));const url=window.location.origin+window.location.pathname+"#quote="+data;window.open(url,"_blank");navigator.clipboard.writeText(url).catch(()=>{})}}><I n="send" s={14}/> Share Link</Btn>}<Btn v="ghost" onClick={()=>{const _baseDoc=previewDoc;const _doc=_baseDoc.type==="invoice"?{..._baseDoc,data:{..._baseDoc.data,items:(_baseDoc.data.items||[]).map(it=>{const _ovRaw=lineOverrides[it.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!=="";const _suggested=it.displayQty!==undefined?it.displayQty:it.qtyOrdered;const _q=_hasOv?Number(_ovRaw):_suggested;return {...it,displayQty:isNaN(_q)?_suggested:_q}}),total:(_baseDoc.data.items||[]).reduce((s,i)=>{const _ovRaw=lineOverrides[i.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!=="";const _sug=i.displayQty!==undefined?i.displayQty:i.qtyOrdered;const _q=_hasOv?Number(_ovRaw):_sug;const _safe=isNaN(_q)?0:_q;const _pr=i.displayPrice!==undefined?i.displayPrice:i.unitPrice;return s+_safe*(_pr||0)},0)}}:_baseDoc;const isQuote=_doc.type==="quote";const isPO=_doc.type==="po";const isComm=_doc.type==="commission";const recipient=isQuote?_doc.data.customer?.email:isPO?_doc.data.vendor?.email:isComm?_doc.data.rep?.email:_doc.data.customer?.email;setEmailTo(recipient||"");setEmailSubject((isQuote?"Project Quote":isPO?"Purchase Order":isComm?"Commission Statement":"Invoice")+" - "+_doc.job.name+" - "+(_doc.data.docNum||""));setEmailModal(_doc)}}><I n="send" s={14}/> Email</Btn><Btn v="secondary" onClick={()=>{if(previewDoc.type==="commission"){setPage("commissions");return}setTab(previewDoc.type==="quote"?"quotes":previewDoc.type==="po"?"pos":"invoices")}}>&larr; Back</Btn>{previewDoc.type==="invoice"&&previewDoc.data.items.length>0&&<Btn v="ghost" style={{fontSize:12,color:"#34d399",border:"1px solid #05966930"}} onClick={()=>{let _bumpedCount=0;previewDoc.data.items.forEach(item=>{const _ovRaw=lineOverrides[item.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!==""&&!isNaN(Number(_ovRaw));const _suggested=item.displayQty!==undefined?item.displayQty:(item.qtyReceived||0)-(item.qtyInvoiced||0);const _bump=_hasOv?Number(_ovRaw):_suggested;const _safeBump=isNaN(_bump)?0:Math.max(0,_bump);const _newQI=Math.min((item.qtyOrdered||0),(item.qtyInvoiced||0)+_safeBump);if(_safeBump>0){ctx.updateLineItem(item.id,{qtyInvoiced:_newQI,invoiceDate:new Date().toISOString().split("T")[0]});_bumpedCount++}});notify(_bumpedCount>0?("Marked invoiced -- "+_bumpedCount+" line"+(_bumpedCount!==1?"s":"")+" updated"):"No lines bumped (all overrides were 0 or empty)");setLineOverrides({})}}>Mark All Invoiced</Btn>}{previewDoc.type==="invoice"&&previewDoc.data.total>0&&!stripePayUrl&&<Btn v="ghost" style={{fontSize:12,color:"#a78bfa",border:"1px solid #a78bfa30"}} onClick={async()=>{
              setStripeLoading(true);const doc=previewDoc;const cust=doc.data.customer;
              try{const r=await fetch("/api/stripe-pay",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create_checkout",job_name:doc.job.name,customer_name:cust?.name||"",customer_email:cust?.email||"",amount_cents:Math.round(doc.data.total*100),job_id:doc.job.id,invoice_id:doc.data.docNum})});
                const data=await r.json();if(data.url){
                  const ds={...(doc.job.docStatuses||{})};ds[doc.data.docNum+"__stripe"]={url:data.url,session_id:data.session_id,created:new Date().toISOString(),amount:doc.data.total};
                  updateJob(doc.job.id,{docStatuses:ds});
                  setStripePayUrl(data.url);
                  navigator.clipboard.writeText(data.url).then(()=>notify("Payment link created and copied to clipboard!")).catch(()=>notify("Payment link created! Click the link below to open."));
                }else{notify("Stripe error: "+(data.error||"Could not create payment link"),"error")}
              }catch(err){notify("Payment link error: "+err.message,"error")}
              setStripeLoading(false);
            }}>{stripeLoading?"Creating...":"Create Payment Link"}</Btn>}{(stripePayUrl||(previewDoc.type==="invoice"&&(previewDoc.job?.docStatuses||{})[previewDoc.data.docNum+"__stripe"]?.url))&&<a href={stripePayUrl||(previewDoc.job?.docStatuses||{})[previewDoc.data.docNum+"__stripe"]?.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#a78bfa",padding:"6px 12px",border:"1px solid #a78bfa30",borderRadius:8,textDecoration:"none",display:"flex",alignItems:"center",gap:6,background:"#a78bfa08",fontWeight:600,cursor:"pointer"}}><I n="send" s={12}/>Open Payment Link</a>}{(stripePayUrl||(previewDoc.type==="invoice"&&(previewDoc.job?.docStatuses||{})[previewDoc.data.docNum+"__stripe"]?.url))&&<Btn v="ghost" style={{fontSize:11,color:"#737373"}} onClick={()=>{navigator.clipboard.writeText(stripePayUrl||(previewDoc.job?.docStatuses||{})[previewDoc.data.docNum+"__stripe"]?.url||"").then(()=>notify("Link copied!")).catch(()=>{})}}>Copy Link</Btn>}</div></div>


      {/* Modern document preview */}
      {emailModal&&<div style={{background:"#1a1a1a",border:"1px solid #2dd4bf30",borderRadius:8,padding:20,marginBottom:16}}><div style={{fontSize:14,fontWeight:700,color:"#2dd4bf",marginBottom:12}}>Email Document</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:12}}><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>From (your email)</label><input value={emailFrom} onChange={e=>setEmailFrom(e.target.value)} placeholder="lisa@mwfurnishings.com" style={inputStyle}/></div><div><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>To (recipient)</label><input value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="recipient@email.com" style={inputStyle}/></div></div><div style={{marginBottom:12}}><label style={{fontSize:12,color:"#a3a3a3",display:"block",marginBottom:4}}>Subject</label><input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} style={inputStyle}/></div><div style={{display:"flex",gap:8}}><Btn onClick={sendEmail} style={emailSending?{opacity:0.6,pointerEvents:"none"}:{}}>{emailSending?"Sending...":"Send Email"}</Btn><Btn v="secondary" onClick={()=>setEmailModal(null)}>Cancel</Btn></div></div>}


      {previewDoc.type==="invoice"&&previewDoc.data.poNumbers&&previewDoc.data.poNumbers.length>0&&<div style={{marginTop:12,marginBottom:12,padding:"12px 16px",background:"#111",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#a3a3a3"}}>Include PO# on Invoice:</span>
          {previewDoc.data.poNumbers.map(pn=>{const sel=getInvPOs(previewDoc.data.docNum);const isOn=sel.includes(pn);return <button key={pn} onClick={()=>{const cur=getInvPOs(previewDoc.data.docNum);setInvPOs(previewDoc.data.docNum,isOn?cur.filter(x=>x!==pn):[...cur,pn])}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+(isOn?"#2dd4bf":"rgba(255,255,255,0.1)"),background:isOn?"rgba(45,212,191,0.12)":"transparent",color:isOn?"#2dd4bf":"#737373",fontSize:12,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",transition:"all 0.15s"}}>{pn}</button>})}
          {previewDoc.job.poNumber&&<span style={{fontSize:11,color:"#525252",marginLeft:4}}>Customer PO ({previewDoc.job.poNumber}) auto-included</span>}
        </div>
      </div>}
      <div style={{background:"#fff",color:"#111",borderRadius:12,padding:40,fontFamily:"'Satoshi',sans-serif",maxWidth:800,margin:"0 auto"}}>
        {/* MW Header - same on all docs */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div><img src={MW_LOGO} alt="MW" style={{height:44,width:44,borderRadius:8,objectFit:"contain",flexShrink:0}}/><div style={{fontSize:16,fontWeight:700,color:"#111"}}>Midwest Educational Furnishings, Inc.</div><div style={{fontSize:12,color:"#888",lineHeight:1.6}}>21191 N Valley Rd<br/>Kildeer, IL 60047 US<br/>(847) 847-1865</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:300,color:"#888",letterSpacing:1}}>{previewDoc.type==="quote"?"Quote":previewDoc.type==="po"?"Purchase Order":previewDoc.type==="commission"?"Commission Statement":previewDoc.data?.isPartial?"Partial Invoice":"Invoice"}</div><div style={{fontSize:14,fontWeight:600,color:"#111",marginTop:4}}>{previewDoc.data.docNum||""}</div><div style={{fontSize:12,color:"#888",marginTop:8}}>Date: {new Date().toLocaleDateString()}</div></div>
        </div>


        {/* PO-specific layout */}
        {previewDoc.type==="po"&&<>
          <div style={{display:"flex",gap:40,marginBottom:20}}>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>VENDOR</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{previewDoc.data.vendor?.name||""}{previewDoc.data.vendor?.address&&<><br/>{previewDoc.data.vendor.address}</>}{previewDoc.data.vendor?.phone&&<><br/>{previewDoc.data.vendor.phone}</>}</div></div>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>SHIP TO</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{(previewDoc.data.shipTo||previewDoc.job.shipTo)?fmtShipJsx(previewDoc.data.shipTo||previewDoc.job.shipTo):<>{previewDoc.data.customer?.name||""}{previewDoc.data.customer?.address&&<><br/>{fmtAddrJsx(previewDoc.data.customer.address)}</>}{previewDoc.data.customer?.contact&&<><br/>{"Attn: "+previewDoc.data.customer.contact}</>}</>}</div></div>
            <div style={{minWidth:160}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>P.O. NO.</div><div style={{fontSize:18,fontWeight:700}}>{previewDoc.data.docNum||""}</div></div>
          </div>
          {previewDoc.job.shipVia&&<div style={{marginBottom:16,padding:"10px 14px",background:"#fafafa",borderRadius:6}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>SHIP VIA</div><div style={{fontSize:13}}>{previewDoc.job.shipVia}</div></div>}
        </>}


        {/* Invoice-specific layout */}
        {previewDoc.type==="invoice"&&<>
          <div style={{display:"flex",gap:40,marginBottom:20}}>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>BILL TO</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{previewDoc.job.billTo||previewDoc.data.customer?.name||""}{previewDoc.data.customer?.address&&<><br/>{fmtAddrJsx(previewDoc.data.customer.address)}</>}{previewDoc.data.customer?.contact&&<><br/>{"Attn: "+previewDoc.data.customer.contact}</>}</div></div>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>SHIP TO</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{previewDoc.job.shipTo?fmtShipJsx(previewDoc.job.shipTo):<>{previewDoc.data.customer?.name||""}{previewDoc.data.customer?.address&&<><br/>{fmtAddrJsx(previewDoc.data.customer.address)}</>}{previewDoc.data.customer?.contact&&<><br/>{"Attn: "+previewDoc.data.customer.contact}</>}</>}</div></div>
            <div style={{minWidth:180,textAlign:"right"}}><div style={{fontSize:12,color:"#888"}}>Terms: {previewDoc.job.terms||"Net 30"}</div><div style={{fontSize:12,color:"#2dd4bf",fontWeight:600}}>Due: {(()=>{const d=new Date();d.setDate(d.getDate()+((previewDoc.job.terms||"").includes("15")?15:(previewDoc.job.terms||"").includes("Receipt")?0:30));return d.toLocaleDateString()})()}</div></div>
          </div>
          {previewDoc.job.poNumber&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>P.O. NUMBER</div><div style={{fontSize:14,fontWeight:600}}>{previewDoc.job.poNumber}</div></div>}
        </>}


        {/* Quote-specific layout */}
        {previewDoc.type==="quote"&&<>
          <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:12,color:"#888"}}>Designing Spaces | Building Futures | WBE Certified Enterprise</div></div>
          <div style={{display:"flex",gap:40,marginBottom:20}}>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>PREPARED FOR</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{previewDoc.job.billTo||previewDoc.data.customer?.name||""}{previewDoc.data.customer?.address&&<><br/>{fmtAddrJsx(previewDoc.data.customer.address)}</>}{previewDoc.data.customer?.contact&&<><br/>{"Attn: "+previewDoc.data.customer.contact}</>}</div></div>
            <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>SHIP TO</div><div style={{fontSize:13,color:"#333",lineHeight:1.6}}>{previewDoc.job.shipTo?fmtShipJsx(previewDoc.job.shipTo):<>{previewDoc.data.customer?.name||""}{previewDoc.data.customer?.address&&<><br/>{fmtAddrJsx(previewDoc.data.customer.address)}</>}{previewDoc.data.customer?.contact&&<><br/>{"Attn: "+previewDoc.data.customer.contact}</>}</>}</div></div>
            <div style={{textAlign:"right",maxWidth:220}}><div style={{fontSize:11,wordWrap:"break-word"}}>Project: {projectNum(previewDoc.job.id)} {previewDoc.job.name}</div>{previewDoc.job.poNumber&&<div style={{fontSize:12,color:"#888",marginTop:4}}>PO#: {previewDoc.job.poNumber}</div>}</div>
          </div>
        </>}


        {/* Commission layout */}
        {previewDoc.type==="commission"&&<><div style={{display:"flex",gap:40,marginBottom:20}}>
          <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>SALES REP</div><div style={{fontSize:16,fontWeight:700}}>{previewDoc.data.rep?.name||""}</div><div style={{fontSize:12,color:"#888"}}>{previewDoc.data.rep?.territory||""}</div><div style={{fontSize:12,color:"#888"}}>Rate: {previewDoc.data.rep?.commissionRate?((previewDoc.data.rep.commissionRate*100).toFixed(1)):0}%</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#888"}}>Date: {new Date().toLocaleDateString()}</div>{previewDoc.data.docNum&&<div style={{fontSize:12,color:"#888"}}>Ref: {previewDoc.data.docNum}</div>}</div>
        </div>
        {(()=>{const rep2=previewDoc.data.rep||{};const cJobs=jobs.filter(j=>j.salesRep===rep2.id);const pComm=cJobs.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+_commissionFor(j.id,rep2.commissionRate||0),0);const uComm=(previewDoc.data.total||0)-pComm;return <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><div style={{flex:"1 1 80px",padding:10,background:"#fafafa",borderRadius:8,textAlign:"center",minWidth:80}}><div style={{fontSize:11,color:"#888",textTransform:"uppercase"}}>Earned</div><div style={{fontSize:"clamp(14px,3vw,18px)",fontWeight:700,color:"#059669"}}>{fmt(pComm)}</div></div><div style={{flex:"1 1 80px",padding:10,background:"#fafafa",borderRadius:8,textAlign:"center",minWidth:80}}><div style={{fontSize:11,color:"#888",textTransform:"uppercase"}}>Pending</div><div style={{fontSize:"clamp(14px,3vw,18px)",fontWeight:700,color:"#d97706"}}>{fmt(uComm)}</div></div><div style={{flex:"1 1 80px",padding:10,background:"#fafafa",borderRadius:8,textAlign:"center",minWidth:80}}><div style={{fontSize:11,color:"#888",textTransform:"uppercase"}}>Total</div><div style={{fontSize:"clamp(14px,3vw,18px)",fontWeight:700}}>{fmt(previewDoc.data.total)}</div></div></div>})()}</>}


        <div style={{height:1,background:"#e5e5e5",marginBottom:20}}/>


        {/* Quantity Breakdown panel -- the surgical fix for Maureen's partial-invoice issue.
            Shows the qty story per line AND lets the user override the "This Invoice" qty
            per line when the system's auto-suggested displayQty is wrong (most commonly:
            user sent a partial invoice but did NOT click Mark All Invoiced after, so on
            the second/balance invoice the system thinks no prior invoicing happened and
            suggests the full received qty). Overrides flow into:
              - The line items table render (Qty + Amount columns)
              - The total row at the bottom of this panel AND in the line items tfoot
              - Export PDF (decorated doc passed to buildDocHtml)
              - Email body / send (decorated doc passed to buildDocHtml)
              - Mark All Invoiced (bumps qtyInvoiced by override, not by qtyReceived)
            Only renders for invoices (not credit memos or proformas).
            Built as an on-screen callout in the React preview only -- the PDF is built
            separately by buildDocHtml using the decorated doc. */}
        {previewDoc.type==="invoice"&&!isCreditMemo&&!isProforma&&(()=>{
          const items=previewDoc.data.items||[];
          if(items.length===0)return null;
          const anyPriorInvoicing=items.some(i=>(i.qtyInvoiced||0)>0);
          const isPartialFlag=!!previewDoc.data.isPartial;
          // The remaining-balance heading fires either when the system detects prior
          // invoicing (qtyInvoiced > 0 on any line) OR when the user explicitly clicked
          // the "Remaining Balance Invoice" button (isRemainingBalanceFlow). The flag
          // captures the case where the system canNOT detect prior invoicing because
          // Mark All Invoiced was missed -- exactly Maureen's reported scenario.
          const isRemainingBalance=anyPriorInvoicing||isRemainingBalanceFlow;
          const heading=isRemainingBalance?"REMAINING BALANCE INVOICE":isPartialFlag?"PARTIAL INVOICE -- First Shipment":"FULL INVOICE";
          const subhead=isRemainingBalance?(anyPriorInvoicing?"Prior invoicing detected on the line items. The system has pre-filled This Invoice with the remaining balance per line. Edit any value below if it does not match what you actually want to invoice this round.":"Remaining-balance flow. The system could not auto-detect a prior partial invoice on these line items, so it has pre-filled This Invoice with the full received qty per line. Edit each value below to match ONLY what you want to invoice for this round (the balance after the previous partial)."):isPartialFlag?"Some items are still awaiting delivery. Only items received so far are being invoiced. Edit This Invoice below if you need to override.":"All items are being invoiced in full. Edit This Invoice below to override any qty.";
          const accentColor=isRemainingBalance?"#2dd4bf":isPartialFlag?"#fbbf24":"#34d399";
          const bgColor=isRemainingBalance?"#2dd4bf08":isPartialFlag?"#fbbf2408":"#34d39908";
          // Effective total uses overrides only when they\u0027re valid numbers and differ
          // from the system\u0027s suggested displayQty. Avoids false "OVERRIDES ACTIVE"
          // signal when the user typed the same number as the suggested or left it blank.
          const effectiveTotal=items.reduce((s,i)=>{
            const ovRaw=lineOverrides[i.id];
            const sug=i.displayQty!==undefined?i.displayQty:i.qtyOrdered;
            const useOv=ovRaw!==undefined&&ovRaw!==""&&!isNaN(Number(ovRaw));
            const eff=useOv?Number(ovRaw):sug;
            const price=i.displayPrice!==undefined?i.displayPrice:i.unitPrice;
            return s+(isNaN(eff)?0:eff)*(price||0);
          },0);
          const baseTotal=previewDoc.data.total||0;
          const totalDelta=effectiveTotal-baseTotal;
          const anyOverride=items.some(i=>{
            const ov=lineOverrides[i.id];
            const sug=i.displayQty!==undefined?i.displayQty:i.qtyOrdered;
            return ov!==undefined&&ov!==""&&!isNaN(Number(ov))&&Number(ov)!==sug;
          });
          return <div style={{marginBottom:20,padding:"14px 16px",background:bgColor,border:"1px solid "+accentColor+"40",borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <div style={{fontSize:12,fontWeight:700,color:accentColor,letterSpacing:0.8}}>{heading}</div>
              {anyOverride&&<div style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:accentColor+"20",color:accentColor,letterSpacing:0.5}}>OVERRIDES ACTIVE</div>}
            </div>
            <div style={{fontSize:12,color:"#555",marginBottom:10,lineHeight:1.5}}>{subhead}</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid "+accentColor+"30"}}>
                <th style={{padding:"6px 4px",textAlign:"left",fontSize:10,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:0.5}}>Item</th>
                <th style={{padding:"6px 4px",textAlign:"right",fontSize:10,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:0.5}}>Ordered</th>
                <th style={{padding:"6px 4px",textAlign:"right",fontSize:10,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:0.5}}>Received</th>
                <th style={{padding:"6px 4px",textAlign:"right",fontSize:10,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:0.5}}>Previously Invoiced</th>
                <th style={{padding:"6px 4px",textAlign:"right",fontSize:10,fontWeight:700,color:accentColor,textTransform:"uppercase",letterSpacing:0.5}}>This Invoice (editable)</th>
                <th style={{padding:"6px 4px",textAlign:"right",fontSize:10,fontWeight:600,color:"#666",textTransform:"uppercase",letterSpacing:0.5}}>Remaining After</th>
              </tr></thead>
              <tbody>{items.map((item,ii)=>{
                const ord=item.qtyOrdered||0;
                const rec=item.qtyReceived||0;
                const prev=item.qtyInvoiced||0;
                const suggested=item.displayQty!==undefined?item.displayQty:ord;
                const overrideRaw=lineOverrides[item.id];
                // hasOverrideKey -- user has touched this field (could be mid-edit / empty string).
                // hasNumericOverride -- override is a valid number we can use for calc.
                const hasOverrideKey=overrideRaw!==undefined;
                const hasNumericOverride=hasOverrideKey&&overrideRaw!==""&&!isNaN(Number(overrideRaw));
                const thisQ=hasNumericOverride?Number(overrideRaw):suggested;
                const safeQ=isNaN(thisQ)?0:thisQ;
                const remAfter=Math.max(0,ord-prev-safeQ);
                const desc=(item.description||"").split("\n")[0].slice(0,50);
                // Visual cue: highlight as override only when there\u0027s a real numeric value
                // that DIFFERS from the suggested. Avoids false-positive highlight when user
                // typed the same number as the suggested.
                const isMeaningfulOverride=hasNumericOverride&&Number(overrideRaw)!==suggested;
                return <tr key={ii} style={{borderBottom:"1px solid "+accentColor+"15"}}>
                  <td style={{padding:"6px 4px",color:"#333",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{desc}</td>
                  <td style={{padding:"6px 4px",textAlign:"right",color:"#666",fontFamily:"\u0027JetBrains Mono\u0027,monospace"}}>{fmtN(ord)}</td>
                  <td style={{padding:"6px 4px",textAlign:"right",color:rec<ord?"#fbbf24":"#666",fontFamily:"\u0027JetBrains Mono\u0027,monospace"}}>{fmtN(rec)}</td>
                  <td style={{padding:"6px 4px",textAlign:"right",color:prev>0?"#888":"#bbb",fontFamily:"\u0027JetBrains Mono\u0027,monospace"}}>{fmtN(prev)}</td>
                  <td style={{padding:"6px 4px",textAlign:"right"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                      <input type="number" min="0" max={ord} step="1" value={hasOverrideKey?overrideRaw:suggested}
                        onChange={e=>{
                          const v=e.target.value;
                          setLineOverrides(p=>({...p,[item.id]:v}));
                        }}
                        style={{width:60,padding:"4px 6px",borderRadius:4,border:"1px solid "+(isMeaningfulOverride?accentColor:accentColor+"40"),background:isMeaningfulOverride?accentColor+"15":"#fff",color:isMeaningfulOverride?accentColor:"#333",fontFamily:"\u0027JetBrains Mono\u0027,monospace",fontSize:11,fontWeight:700,textAlign:"right"}}
                      />
                      {hasOverrideKey&&<button onClick={()=>{setLineOverrides(p=>{const next={...p};delete next[item.id];return next})}} style={{padding:"2px 6px",borderRadius:4,border:"1px solid #aaa",background:"transparent",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit"}} title={"Reset to suggested ("+suggested+")"}>Reset</button>}
                    </div>
                  </td>
                  <td style={{padding:"6px 4px",textAlign:"right",color:remAfter>0?"#fbbf24":"#bbb",fontFamily:"\u0027JetBrains Mono\u0027,monospace"}}>{fmtN(remAfter)}</td>
                </tr>;
              })}</tbody>
              <tfoot><tr style={{borderTop:"2px solid "+accentColor+"40"}}>
                <td colSpan="4" style={{padding:"8px 4px",textAlign:"right",fontSize:11,fontWeight:600,color:"#666"}}>Effective Invoice Total:</td>
                <td colSpan="2" style={{padding:"8px 4px",textAlign:"right",fontSize:13,fontWeight:800,color:accentColor,fontFamily:"\u0027JetBrains Mono\u0027,monospace"}}>{fmt(effectiveTotal)}{anyOverride&&<span style={{fontSize:10,fontWeight:600,color:"#888",marginLeft:8}}>({totalDelta>=0?"+":""}{fmt(totalDelta)} vs system suggested {fmt(baseTotal)})</span>}</td>
              </tr></tfoot>
            </table></div>
            <div style={{marginTop:10,padding:"8px 12px",background:"#fffaeb",border:"1px solid #fbbf2440",borderRadius:6,fontSize:11,color:"#92400e",lineHeight:1.5}}>
              <strong>Workflow tip:</strong> After sending this invoice, click <strong>Mark All Invoiced</strong> at the top of the page. This bumps each line&#39;s &quot;previously invoiced&quot; count by exactly the qty you invoiced this round (the value in the editable column above), so the next partial invoice automatically shows only the remaining balance.
            </div>
          </div>;
        })()}


        {/* Line items table */}
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr>{(previewDoc.type==="quote"?visibleCols.map(c=>c.label):previewDoc.type==="commission"?["Job","Customer","Revenue","Status","Commission"]:["Description","Qty","Rate","Amount"]).map((h,i)=><th key={i} style={{padding:"8px 6px",textAlign:i<5&&previewDoc.type==="quote"?"left":"right",fontSize:10,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"2px solid #e5e5e5"}}>{h}</th>)}</tr></thead>
          <tbody>{previewDoc.data.items.map((item,i)=>{const _suggested=item.displayQty!==undefined?item.displayQty:item.qtyOrdered;const _ovRaw=lineOverrides[item.id];const _hasOv=_ovRaw!==undefined&&_ovRaw!=="";const _ovNum=_hasOv?Number(_ovRaw):_suggested;const qty=(previewDoc.type==="invoice"&&!isNaN(_ovNum))?_ovNum:_suggested;const price=item.displayPrice!==undefined?item.displayPrice:item.unitPrice;const ship=item.shippingPerUnit||0;const inst=item.installPerUnit||0;const allIn=price||0;
            return previewDoc.type==="quote"?<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}>{visibleCols.map(c=>{const vals={tag:item.tag||"",manuf:item.manufacturer||vendors.find(v=>v.id===item.vendor)?.name||"",model:item.modelNumber||"",description:item.description,color:item.color||"",qty:qty,netCost:fmt(item.unitCost||0),netTotal:fmt((item.unitCost||0)*qty),shippingEach:ship>0?fmt(ship):"",shippingTotal:ship>0?fmt(ship*qty):"",installEach:inst>0?fmt(inst):"",installTotal:inst>0?fmt(inst*qty):"",unitPrice:fmt(price||0),lineTotal:fmt(item.priceExtended&&item.priceExtended>0?item.priceExtended:(price||0)*qty)};const isLeft=["tag","manuf","model","description","color"].includes(c.key);return <td key={c.key} style={{padding:"8px 6px",textAlign:isLeft?"left":"right",color:isLeft?"#666":"inherit",fontWeight:c.key==="lineTotal"?700:c.key==="unitPrice"?600:400,maxWidth:c.key==="description"?220:undefined,whiteSpace:c.key==="description"?"pre-line":undefined}}>{vals[c.key]}</td>})}</tr>:previewDoc.type==="commission"?<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}>
              <td style={{padding:"8px 6px",color:"#333"}}>{(item.description||"").split(" -- ")[0]}</td>
              <td style={{padding:"8px 6px",color:"#666"}}>{(item.description||"").split(" -- ")[1]||""}</td>
              <td style={{padding:"8px 6px",textAlign:"right"}}>{fmt(price)}</td>
              <td style={{padding:"8px 6px",textAlign:"center",color:(item.description||"").includes("PAID")?"#059669":"#d97706"}}>{(item.description||"").includes("PAID")?"PAID":"PENDING"}</td>
              <td style={{padding:"8px 6px",textAlign:"right",fontWeight:600}}>{fmt(price)}</td>
            </tr>:<tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}>
              <td style={{padding:"8px 6px",color:"#333",whiteSpace:"pre-wrap"}}>{item.modelNumber?<span style={{color:"#888"}}>{item.modelNumber}<br/></span>:null}{item.description}{item.color?<span style={{color:"#888"}}><br/>{item.color}</span>:null}</td>
              <td style={{padding:"8px 6px",textAlign:"right"}}>{qty}</td>
              <td style={{padding:"8px 6px",textAlign:"right"}}>{fmt(price)}</td>
              <td style={{padding:"8px 6px",textAlign:"right",fontWeight:600}}>{fmt(qty*price)}</td>
            </tr>})}</tbody>
          <tfoot><tr><td colSpan={previewDoc.type==="quote"?visibleCols.length-1:previewDoc.type==="commission"?4:3} style={{padding:"12px 6px",textAlign:"right",fontWeight:600,fontSize:13,borderTop:"2px solid #e5e5e5"}}>TOTAL</td><td style={{padding:"12px 6px",textAlign:"right",fontWeight:700,fontSize:16,borderTop:"2px solid #e5e5e5",color:"#111"}}>{(()=>{if(previewDoc.type!=="invoice")return fmt(previewDoc.data.total);const eff=(previewDoc.data.items||[]).reduce((s,i)=>{const ov=lineOverrides[i.id];const hasOv=ov!==undefined&&ov!=="";const sug=i.displayQty!==undefined?i.displayQty:i.qtyOrdered;const q=hasOv?Number(ov):sug;const safeQ=isNaN(q)?0:q;const pr=i.displayPrice!==undefined?i.displayPrice:i.unitPrice;return s+safeQ*(pr||0)},0);return fmt(eff)})()}</td></tr></tfoot>
        </table></div>


        {/* Footer */}
        {previewDoc.type==="quote"&&<div style={{marginTop:24,padding:16,background:"#fafafa",borderRadius:8,fontSize:12,color:"#888"}}>Quote valid for 30 days. Prices subject to manufacturer availability.</div>}
        {previewDoc.type==="invoice"&&<div style={{marginTop:24,fontSize:13,color:"#888",textAlign:"center"}}>Thank you for your business!</div>}
        {previewDoc.type==="po"&&((previewDoc.job.notes||"").split("\n").filter(l=>!l.startsWith("TASK:")&&!l.startsWith("NOTE:")).join("").trim())&&<div style={{marginTop:16,padding:"12px 14px",background:"#fafafa",borderRadius:6}}><div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>NOTES</div><div style={{fontSize:12,color:"#555",whiteSpace:"pre-wrap"}}>{(previewDoc.job.notes||"").split("\n").filter(l=>!l.startsWith("TASK:")&&!l.startsWith("NOTE:")).join("\n").trim()}</div></div>}
      </div>
    </Card>}
  </div>;
}


export { AnimNum, AnimatedNumber, Badge, Bar, Btn, Card, Check, CheckMinus, DEFAULT_SOPS, Dashboard, DocumentsPage, Header, I, fmt, fmtN, getRoles, inputStyle, isSalesRep, pct, shipKey, statusColor };
export default function MidwestAIOS(){return <ErrorBoundary><MidwestAIOSInner/></ErrorBoundary>}
