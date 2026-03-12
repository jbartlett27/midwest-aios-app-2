import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// MIDWEST EDUCATIONAL FURNISHINGS — AI OPERATING SYSTEM v2
// Full Mutable State · PDF Export · QB Integration Guide
// ═══════════════════════════════════════════════════════════════

const INIT_VENDORS = [
  { id: "V001", name: "Virco Inc.", contact: "Sales Dept", email: "sales@virco.com", phone: "(800) 448-4726", category: "Classroom Furniture", address: "2027 Harpers Way, Torrance, CA 90501", discountRate: 0.42, discountType: "percentage", discountNotes: "42% off list. Volume 15K+ gets 3% freight allowance." },
  { id: "V002", name: "Smith System", contact: "Sales Dept", email: "info@smithsystem.com", phone: "(800) 328-1061", category: "Collaborative Tables", address: "1714 E 14th St, Plano, TX 75074", discountRate: 0.38, discountType: "percentage", discountNotes: "38% off list standard. 40% on orders over $25K." },
  { id: "V003", name: "Haskell Education", contact: "Sales Dept", email: "info@haskelleducation.com", phone: "(800) 334-8988", category: "Storage & Media", address: "1 Haskell Dr, Pittsburgh, PA 15205", discountRate: 0.35, discountType: "percentage", discountNotes: "35% off list. Free freight on $10K+." },
  { id: "V004", name: "National Public Seating", contact: "Sales Dept", email: "info@nps.com", phone: "(800) 235-5912", category: "Seating & Staging", address: "901 Janesville Ave, Fort Atkinson, WI 53538", discountRate: 0.40, discountType: "percentage", discountNotes: "40% off list. 45% on seating orders 200+ units." },
  { id: "V005", name: "KI", contact: "Sales Dept", email: "info@ki.com", phone: "(800) 424-2432", category: "Education & Office", address: "1330 Bellevue St, Green Bay, WI 54302", discountRate: 0.45, discountType: "percentage", discountNotes: "45% off list. Project pricing available on $50K+." },
  { id: "V006", name: "MooreCo", contact: "Sales Dept", email: "info@mooreco.com", phone: "(800) 749-2258", category: "Whiteboards & AV", address: "2885 Lorraine Ave, Temple, TX 76501", discountRate: 0.36, discountType: "percentage", discountNotes: "36% off list standard." },
  { id: "V007", name: "Jonti-Craft", contact: "Sales Dept", email: "info@jonti-craft.com", phone: "(800) 543-4149", category: "Early Childhood", address: "171 Highway 68, Wabasso, MN 56293", discountRate: 0.40, discountType: "percentage", discountNotes: "40% off list. Free freight on $5K+." },
  { id: "V008", name: "Bretford", contact: "Sales Dept", email: "info@bretford.com", phone: "(800) 521-9614", category: "Technology Furniture", address: "11000 Seymour Ave, Franklin Park, IL 60131", discountRate: 0.38, discountType: "percentage", discountNotes: "38% off list. Tech cart orders get additional 5% on 50+ units." },
];

const INIT_CUSTOMERS = [
  { id: "C001", name: "Naperville CUSD 203", contact: "Facilities Director", email: "facilities@naperville203.org", phone: "(630) 420-6300", type: "K-12 District", address: "203 W Hillside Rd, Naperville, IL 60540" },
  { id: "C002", name: "Elmhurst CUSD 205", contact: "Purchasing Dept", email: "purchasing@elmhurst205.org", phone: "(630) 617-2300", type: "K-12 District", address: "162 S York St, Elmhurst, IL 60126" },
  { id: "C003", name: "Milwaukee Public Schools", contact: "Procurement Office", email: "procurement@milwaukee.k12.wi.us", phone: "(414) 475-8001", type: "K-12 District", address: "5225 W Vliet St, Milwaukee, WI 53208" },
  { id: "C004", name: "College of DuPage", contact: "Facilities & Planning", email: "facilities@cod.edu", phone: "(630) 942-2800", type: "Community College", address: "425 Fawell Blvd, Glen Ellyn, IL 60137" },
];

const INIT_REPS = [
  { id: "S001", name: "Jim Harris", email: "jharris@mwfurnishings.com", territory: "Illinois", commissionRate: 0.06, tier: "Regional Sales Manager" },
  { id: "S002", name: "Jim Lindner", email: "jlindner@mwfurnishings.com", territory: "Wisconsin", commissionRate: 0.06, tier: "Regional Sales Manager" },
  { id: "S003", name: "Jackie Biller", email: "jbiller@mwfurnishings.com", territory: "Wisconsin", commissionRate: 0.05, tier: "Sales Development Manager" },
];

const INIT_LINE_ITEMS = [
  { id: "LI001", jobId: "JOB-2026-001", description: "Virco 9000 Series Student Chair (Navy)", vendor: "V001", unitCost: 78.50, unitPrice: 118.00, qtyOrdered: 240, qtyReceived: 240, qtyInvoiced: 240, poDate: "2026-01-20", deliveryDate: "2026-03-15", invoiceDate: "2026-03-20" },
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
  { id: "JOB-2026-001", name: "Lincoln USD Summer Refresh", customer: "C001", salesRep: "S001", phase: "Invoiced", createdDate: "2026-01-15", startDate: "2026-01-20", endDate: "2026-05-28", dueDate: "2026-06-01", notes: "Full classroom furniture refresh for 12 elementary classrooms. Summer install window.", paymentStatus: "paid" },
  { id: "JOB-2026-002", name: "Midwest Tech STEM Lab Build-Out", customer: "C002", salesRep: "S001", phase: "In Progress", createdDate: "2026-02-03", startDate: "2026-02-10", endDate: "", dueDate: "2026-07-15", notes: "New STEM lab + library media center. Multi-vendor job — partial shipments expected.", paymentStatus: "partial" },
  { id: "JOB-2026-003", name: "Oakwood Elementary ADA Compliance", customer: "C003", salesRep: "S002", phase: "In Progress", createdDate: "2026-02-20", startDate: "2026-03-01", endDate: "", dueDate: "2026-08-01", notes: "ADA-compliant furniture replacements across 3 buildings. Music room + admin offices.", paymentStatus: "unpaid" },
  { id: "JOB-2026-004", name: "Heritage Academy New Classroom Wing", customer: "C004", salesRep: "S003", phase: "Quoting", createdDate: "2026-03-05", startDate: "", endDate: "", dueDate: "2026-09-01", notes: "Brand new wing — 4 classrooms, 1 media room. Awaiting final budget approval from board.", paymentStatus: "unpaid" },
];

// ─── ICONS ───────────────────────────────────────────────────
const I = ({ n, s = 18 }) => {
  const d = { dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z", briefcase: "M2 7h20v14H2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2", truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z", dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", chart: "M18 20V10M12 20V4M6 20v-6", check: "M20 6L9 17l-5-5", alert: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01", file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6", send: "M22 2L11 13M22 2l-7 20-4-9-9-4z", plus: "M12 5v14M5 12h14", close: "M18 6L6 18M6 6l12 12", receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 6h8M8 10h8M8 14h5", shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", brain: "M9.5 2A5.5 5.5 0 004 7.5c0 1.5.5 2.8 1.3 3.8A5 5 0 004 14.5 5.5 5.5 0 009.5 20h1V2zM14.5 2A5.5 5.5 0 0120 7.5c0 1.5-.5 2.8-1.3 3.8A5 5 0 0120 14.5 5.5 5.5 0 0114.5 20h-1V2z", package: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12", edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z", settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z", download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d[n]||""}/></svg>;
};

// ─── UTILS ───────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const fmtN = n => new Intl.NumberFormat("en-US").format(n);
const pct = n => `${n.toFixed(1)}%`;
const uid = () => Math.random().toString(36).substr(2,9);
const statusColor = s => ({complete:"#059669",paid:"#059669",invoiced:"#059669",partial:"#d97706","in progress":"#d97706",received:"#2563eb",ordered:"#6b7280",not_started:"#6b7280",unpaid:"#ef4444",quoting:"#8b5cf6"}[s?.toLowerCase()]||"#6b7280");
const inputStyle = {width:"100%",padding:"8px 12px",background:"#1a1d27",border:"1px solid #2a2d37",borderRadius:6,color:"#e8e6e3",fontSize:13,outline:"none",fontFamily:"inherit"};

// ─── SHARED COMPONENTS ───────────────────────────────────────
const Card = ({children,style,onClick,hover}) => <div onClick={onClick} style={{background:"#12141b",border:"1px solid #1e2130",borderRadius:12,padding:20,cursor:onClick?"pointer":"default",transition:"all 0.2s",...style}} onMouseEnter={e=>{if(hover){e.currentTarget.style.borderColor="#c8a25c44";e.currentTarget.style.transform="translateY(-1px)"}}} onMouseLeave={e=>{if(hover){e.currentTarget.style.borderColor="#1e2130";e.currentTarget.style.transform="translateY(0)"}}}>{children}</div>;
const Badge = ({label,color}) => <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:0.3,background:`${color}18`,color,border:`1px solid ${color}30`}}>{label}</span>;
const StatCard = ({label,value,sub,icon,color="#c8a25c"}) => <Card style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#6b7280",fontWeight:500,textTransform:"uppercase",letterSpacing:1}}>{label}</span><span style={{color,opacity:0.6}}><I n={icon} s={16}/></span></div><div style={{fontSize:26,fontWeight:700,color:"#f5f5f4",fontFamily:"'DM Mono',monospace"}}>{value}</div>{sub&&<div style={{fontSize:12,color:"#6b7280"}}>{sub}</div>}</Card>;
const Header = ({title,sub,action}) => <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}><div><h2 style={{fontSize:22,fontWeight:700,color:"#f5f5f4",marginBottom:4,letterSpacing:-0.5}}>{title}</h2>{sub&&<p style={{fontSize:13,color:"#6b7280"}}>{sub}</p>}</div>{action}</div>;
const Btn = ({children,onClick,v="primary",style:s}) => {const st={primary:{background:"linear-gradient(135deg,#c8a25c,#b8923c)",color:"#0a0c10",fontWeight:600},secondary:{background:"#1e2130",color:"#e8e6e3",border:"1px solid #2a2d37"},ghost:{background:"transparent",color:"#c8a25c",border:"1px solid #c8a25c30"},danger:{background:"#ef444420",color:"#ef4444",border:"1px solid #ef444430"}};return <button onClick={onClick} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,transition:"all 0.2s",...st[v],...s}}>{children}</button>};
const Bar = ({value,max,color="#c8a25c",height=6}) => <div style={{width:"100%",height,background:"#1e2130",borderRadius:height/2,overflow:"hidden"}}><div style={{width:`${Math.min((value/(max||1))*100,100)}%`,height:"100%",background:color,borderRadius:height/2,transition:"width 0.5s"}}/></div>;

const Tbl = ({columns,data,onRowClick}) => <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #1e2130"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:"#12141b"}}>{columns.map((c,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:11,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid #1e2130"}}>{c.header}</th>)}</tr></thead><tbody>{data.map((row,ri)=><tr key={row.id||ri} onClick={()=>onRowClick?.(row)} style={{cursor:onRowClick?"pointer":"default",transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#16182144"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{columns.map((c,ci)=><td key={ci} style={{padding:"10px 14px",borderBottom:"1px solid #1a1d2710",color:"#d1d5db"}}>{c.render?c.render(row):row[c.key]}</td>)}</tr>)}</tbody></table></div>;

import { db } from './supabase';
import CsvUploadPage from './CsvUpload';

// ─── PDF EXPORT: zero dependencies, works everywhere ─────────
function usePrintOverlay() {
  const triggerPrint = (title, html) => {
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow popups for PDF export'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:760px;margin:0 auto}' +
      'h2{font-size:14px;color:#666;margin:16px 0 8px}' +
      'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}' +
      'th{background:#f5f5f4;padding:8px;text-align:left;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;color:#666}' +
      'td{padding:8px;border-bottom:1px solid #eee}' +
      '.total-row td{border-top:2px solid #c8a25c;font-weight:bold;font-size:14px}' +
      '.hdr{display:flex;justify-content:space-between;margin-bottom:24px}' +
      '.hdr div{font-size:12px;color:#666}' +
      '.co{font-size:18px;font-weight:bold;color:#111}' +
      '.gold{color:#b8923c}' +
      '.btn-bar{position:fixed;top:0;left:0;right:0;background:#222;padding:12px 20px;display:flex;gap:10px;z-index:999}' +
      '.btn-bar button{padding:10px 24px;font-size:14px;font-weight:700;border:none;border-radius:6px;cursor:pointer}' +
      '@media print{.btn-bar{display:none!important}}' +
      '</style></head><body>' +
      '<div class="btn-bar">' +
      '<button onclick="window.print()" style="background:#c8a25c;color:#111">Save as PDF</button>' +
      '<button onclick="window.close()" style="background:#555;color:#fff">Close</button>' +
      '<span style="color:#999;font-size:12px;line-height:40px;margin-left:12px">Click Save as PDF → choose "Save as PDF" as the printer</span>' +
      '</div>' +
      '<div style="margin-top:60px">' + html + '</div>' +
      '</body></html>');
    w.document.close();
    w.focus();
  };
  const PrintOverlay = () => null;
  return { triggerPrint, PrintOverlay };
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP — Supabase-backed with Auth
// ═══════════════════════════════════════════════════════════════

// ─── CONFIRM DIALOG ──────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise(resolve => setState({ message, resolve }));
  const ConfirmDialog = () => {
    if (!state) return null;
    const respond = (val) => { state.resolve(val); setState(null); };
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => respond(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#12141b", border: "1px solid #1e2130", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f4", marginBottom: 16 }}>{state.message}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => respond(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2d37", background: "#1e2130", color: "#e8e6e3", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={() => respond(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
          </div>
        </div>
      </div>
    );
  };
  return { confirm, ConfirmDialog };
}

export default function MidwestAIOS() {
  const [page, setPage] = useState("dashboard");
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [lineItems, setLineItems] = useState(INIT_LINE_ITEMS);
  const [reps, setReps] = useState(INIT_REPS);
  const [vendors, setVendors] = useState(INIT_VENDORS);
  const [customers, setCustomers] = useState(INIT_CUSTOMERS);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [brainQuery, setBrainQuery] = useState("");
  const [brainLoading, setBrainLoading] = useState(false);
  const [qbConfig, setQbConfig] = useState({connected:false, clientId:"", clientSecret:"", realmId:"", accessToken:"", refreshToken:""});
  const [dbStatus, setDbStatus] = useState("connecting");
  const { triggerPrint, PrintOverlay } = usePrintOverlay();
  const { confirm, ConfirmDialog } = useConfirm();
  const [globalSearch, setGlobalSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // all, month, quarter, ytd

  const notify = (msg, type="success") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),3500); };

  // ─── LOAD FROM SUPABASE ON MOUNT ───────────────────────────
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const data = await db.loadAll();
        if (data.jobs && data.jobs.length > 0) setJobs(data.jobs);
        if (data.lineItems && data.lineItems.length > 0) setLineItems(data.lineItems);
        if (data.vendors && data.vendors.length > 0) setVendors(data.vendors);
        if (data.customers && data.customers.length > 0) setCustomers(data.customers);
        if (data.reps && data.reps.length > 0) setReps(data.reps);
        // If DB is empty, seed it with initial data
        if (!data.jobs || data.jobs.length === 0) {
          await db.seed(INIT_JOBS, INIT_LINE_ITEMS, INIT_VENDORS, INIT_CUSTOMERS, INIT_REPS);
        }
        // Load QB config from localStorage (credentials stay local for security)
        try { const qb = localStorage.getItem('mw_qbConfig'); if (qb) setQbConfig(JSON.parse(qb)); } catch {}
        setDbStatus("connected");
      } catch (e) {
        console.error("Supabase load error:", e);
        setDbStatus("error");
      }
    };
    loadFromDb();
  }, []);

  // Save QB config to localStorage (not DB — contains secrets)
  useEffect(() => { try { localStorage.setItem('mw_qbConfig', JSON.stringify(qbConfig)); } catch {} }, [qbConfig]);

  // ─── DERIVED COMPUTATIONS ──────────────────────────────────
  const getJobItems = jobId => lineItems.filter(li => li.jobId === jobId);
  const getJobFinancials = jobId => {
    const items = getJobItems(jobId);
    const totalCost = items.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0);
    const totalRevenue = items.reduce((s,i)=>s+i.unitPrice*i.qtyOrdered,0);
    const margin = totalRevenue>0?((totalRevenue-totalCost)/totalRevenue*100):0;
    const totalReceived = items.reduce((s,i)=>s+i.qtyReceived,0);
    const totalOrdered = items.reduce((s,i)=>s+i.qtyOrdered,0);
    const totalInvoiced = items.reduce((s,i)=>s+i.unitPrice*i.qtyInvoiced,0);
    return {totalCost,totalRevenue,margin,totalReceived,totalOrdered,totalInvoiced,itemCount:items.length};
  };
  const getItemStatus = i => {
    if(i.qtyReceived>=i.qtyOrdered && i.qtyInvoiced>=i.qtyOrdered) return "complete";
    if(i.qtyReceived>0 && i.qtyReceived<i.qtyOrdered) return "partial";
    if(i.qtyReceived>=i.qtyOrdered && i.qtyInvoiced<i.qtyOrdered) return "received";
    return "ordered";
  };
  const getJobPOStatus = jobId => { const items=getJobItems(jobId); if(!items.length) return "not_started"; return items.every(i=>i.qtyReceived>=i.qtyOrdered)?"complete":items.some(i=>i.qtyReceived>0)?"partial":"ordered"; };
  const getJobInvStatus = jobId => { const items=getJobItems(jobId); if(!items.length) return "not_started"; return items.every(i=>i.qtyInvoiced>=i.qtyOrdered)?"complete":items.some(i=>i.qtyInvoiced>0)?"partial":"not_started"; };

  // ─── MUTATORS (update state + save to Supabase) ────────────
  const updateLineItem = (id, u) => {
    setLineItems(p => { const updated = p.map(li => li.id===id ? {...li,...u} : li); const item = updated.find(li=>li.id===id); if(item) db.saveLineItem(item); return updated; });
  };
  const addLineItem = item => {
    const newItem = {...item, id: "LI-"+uid()};
    setLineItems(p => [...p, newItem]);
    db.saveLineItem(newItem);
  };
  const deleteLineItem = async (id) => {
    if (!await confirm("Delete this line item? This cannot be undone.")) return;
    setLineItems(p => p.filter(li => li.id !== id));
    db.deleteLineItem(id);
  };
  const updateJob = (id, u) => {
    setJobs(p => { const updated = p.map(j => j.id===id ? {...j,...u} : j); const job = updated.find(j=>j.id===id); if(job) db.saveJob(job); return updated; });
  };
  const addJob = (job) => {
    setJobs(p => [...p, job]);
    db.saveJob(job);
  };
  const updateRep = (id, u) => {
    setReps(p => { const updated = p.map(r => r.id===id ? {...r,...u} : r); const rep = updated.find(r=>r.id===id); if(rep) db.saveRep(rep); return updated; });
  };
  const addRep = rep => { const newRep = {...rep, id: "S-"+uid()}; setReps(p => [...p, newRep]); db.saveRep(newRep); };
  const deleteRep = async (id) => { if (!await confirm("Delete this sales rep? Their jobs will be unassigned.")) return; setReps(p => p.filter(r => r.id !== id)); db.deleteRep(id); };
  const addCustomer = c => { const nc = {...c, id: "C-"+uid()}; setCustomers(p => [...p, nc]); db.saveCustomer(nc); };
  const updateCustomer = (id, u) => {
    setCustomers(p => { const updated = p.map(c => c.id===id ? {...c,...u} : c); const cust = updated.find(c=>c.id===id); if(cust) db.saveCustomer(cust); return updated; });
  };
  const deleteCustomer = async (id) => { if (!await confirm("Delete this customer? Their jobs will be unlinked.")) return; setCustomers(p => p.filter(c => c.id !== id)); db.deleteCustomer(id); };
  const addVendor = v => { const nv = {...v, id: "V-"+uid()}; setVendors(p => [...p, nv]); db.saveVendor(nv); };
  const updateVendor = (id, u) => {
    setVendors(p => { const updated = p.map(v => v.id===id ? {...v,...u} : v); const ven = updated.find(v=>v.id===id); if(ven) db.saveVendor(ven); return updated; });
  };
  const deleteVendor = async (id) => { if (!await confirm("Delete this vendor? Line items will be unlinked.")) return; setVendors(p => p.filter(v => v.id !== id)); db.deleteVendor(id); };

  const navItems = [
    {id:"dashboard",label:"Command Center",icon:"dashboard"},
    {id:"jobs",label:"Job Records",icon:"briefcase"},
    {id:"directory",label:"Directory",icon:"users"},
    {id:"dataimport",label:"Data Import",icon:"download"},
    {id:"deliveries",label:"Delivery Tracker",icon:"truck"},
    {id:"documents",label:"PO & Invoices",icon:"file"},
    {id:"commissions",label:"Commissions",icon:"dollar"},
    {id:"salesportal",label:"Sales Portal",icon:"users"},
    {id:"brain",label:"Midwest Brain",icon:"brain"},
    {id:"exitready",label:"Exit Readiness",icon:"shield"},
    {id:"qbsetup",label:"QuickBooks",icon:"settings"},
  ];

  const ctx = {jobs,setJobs,lineItems,setLineItems,reps,setReps,vendors,customers,setCustomers,setVendors,selectedJob,setSelectedJob,showNewJob,setShowNewJob,notify,getJobItems,getJobFinancials,getItemStatus,getJobPOStatus,getJobInvStatus,updateLineItem,addLineItem,deleteLineItem,updateJob,addJob,updateRep,addRep,deleteRep,addCustomer,updateCustomer,deleteCustomer,addVendor,updateVendor,deleteVendor,setPage:p=>{setPage(p);setMobileMenuOpen(false)},brainQuery,setBrainQuery,brainLoading,setBrainLoading,qbConfig,setQbConfig,triggerPrint,dbStatus,confirm,globalSearch,setGlobalSearch,dateFilter,setDateFilter};

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",fontFamily:"'DM Sans','Satoshi',sans-serif",background:"#0a0c10",color:"#e8e6e3",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {notification&&<div style={{position:"fixed",top:24,right:24,zIndex:9999,background:notification.type==="success"?"#059669":"#ef4444",color:"#fff",padding:"12px 20px",borderRadius:8,fontSize:13,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"slideIn 0.3s ease",maxWidth:"calc(100vw - 48px)"}}>{notification.msg}</div>}
      <PrintOverlay />
      <ConfirmDialog />

      {/* Mobile hamburger */}
      <button onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-btn" style={{display:"none",position:"fixed",top:12,left:12,zIndex:10001,width:40,height:40,borderRadius:8,background:"#12141b",border:"1px solid #1e2130",cursor:"pointer",alignItems:"center",justifyContent:"center",color:"#c8a25c"}}><I n={mobileMenuOpen?"close":"dashboard"} s={20}/></button>
      {mobileMenuOpen&&<div onClick={()=>setMobileMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999}}/>}

      {/* SIDEBAR */}
      <div className={"sidebar"+(mobileMenuOpen?" open":"")} style={{width:sidebarCollapsed?64:240,minWidth:sidebarCollapsed?64:240,background:"#0d0f14",borderRight:"1px solid #1a1d27",display:"flex",flexDirection:"column",transition:"all 0.3s",overflow:"hidden"}}>
        <div style={{padding:sidebarCollapsed?"20px 12px":"20px 20px",borderBottom:"1px solid #1a1d27",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}>
          <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#c8a25c,#f0d68a)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:"#0a0c10",flexShrink:0}}>MW</div>
          {!sidebarCollapsed&&<div><div style={{fontSize:14,fontWeight:700,color:"#f0d68a",letterSpacing:0.5}}>MIDWEST</div><div style={{fontSize:10,color:"#6b7280",letterSpacing:1.5,textTransform:"uppercase"}}>AI Operating System</div></div>}
        </div>
        <nav style={{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(item=> <button key={item.id} onClick={()=>{setPage(item.id);setSelectedJob(null);setMobileMenuOpen(false)}} style={{display:"flex",alignItems:"center",gap:12,padding:sidebarCollapsed?"10px 12px":"10px 14px",borderRadius:8,border:"none",cursor:"pointer",background:page===item.id?"rgba(200,162,92,0.12)":"transparent",color:page===item.id?"#f0d68a":"#9ca3af",fontSize:13,fontWeight:page===item.id?600:400,fontFamily:"inherit",textAlign:"left",transition:"all 0.2s",justifyContent:sidebarCollapsed?"center":"flex-start"}} onMouseEnter={e=>{if(page!==item.id)e.target.style.background="rgba(255,255,255,0.04)"}} onMouseLeave={e=>{if(page!==item.id)e.target.style.background="transparent"}}><span style={{flexShrink:0,opacity:page===item.id?1:0.6}}><I n={item.icon} s={18}/></span>{!sidebarCollapsed&&item.label}</button>)}
        </nav>
        {!sidebarCollapsed&&<div style={{padding:"12px 20px",borderTop:"1px solid #1a1d27",fontSize:10,color:"#4b5563"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:dbStatus==="connected"?"#059669":dbStatus==="connecting"?"#d97706":"#ef4444"}}/>
            <span>Supabase: {dbStatus==="connected"?"Connected":dbStatus==="connecting"?"Connecting...":"Error"}</span>
          </div>
          <div style={{color:"#c8a25c",fontStyle:"italic"}}>"We don't advise. We install."</div>
        </div>}
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflow:"auto",background:"#0a0c10"}}>
        <div className="main-content" style={{maxWidth:1400,margin:"0 auto",padding:"24px 32px"}}>
          {page==="dashboard"&&<Dashboard {...ctx}/>}
          {page==="jobs"&&<JobsPage {...ctx}/>}
          {page==="directory"&&<DirectoryPage {...ctx}/>}
          {page==="dataimport"&&<CsvUploadPage {...ctx} db={db}/>}
          {page==="deliveries"&&<DeliveryPage {...ctx}/>}
          {page==="documents"&&<DocumentsPage {...ctx}/>}
          {page==="commissions"&&<CommissionsPage {...ctx}/>}
          {page==="salesportal"&&<SalesPortalPage {...ctx}/>}
          {page==="brain"&&<BrainPage {...ctx}/>}
          {page==="exitready"&&<ExitReadinessPage {...ctx}/>}
          {page==="qbsetup"&&<QBSetupPage {...ctx}/>}
        </div>
      </div>
      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2d37;border-radius:3px}
        input,textarea,select{font-family:'DM Sans',sans-serif;font-size:16px!important}
        button{-webkit-tap-highlight-color:transparent}
        @media(max-width:768px){
          .sidebar{position:fixed!important;left:-260px!important;top:0!important;bottom:0!important;width:240px!important;min-width:240px!important;z-index:10000!important;transition:left 0.3s ease!important}
          .sidebar.open{left:0px!important}
          .mobile-menu-btn{display:flex!important}
          .main-content{padding:16px 12px!important;padding-top:56px!important}
          h1{font-size:22px!important}
          h2{font-size:18px!important}
          table{font-size:11px!important}
          th,td{padding:8px 6px!important;white-space:nowrap}
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({jobs,lineItems,reps,vendors,getJobFinancials,getJobItems,setPage,setSelectedJob,dateFilter,setDateFilter}){
  // Date filtering
  const now = new Date();
  const filterJob = (j) => {
    if (dateFilter === "all") return true;
    const d = new Date(j.createdDate);
    if (isNaN(d.getTime())) return true;
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

  return <div style={{animation:"fadeUp 0.4s"}}><div style={{marginBottom:28}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}><h1 style={{fontSize:28,fontWeight:800,color:"#f5f5f4",letterSpacing:-1}}>Command Center</h1><div style={{padding:"4px 10px",background:"#059669",borderRadius:20,fontSize:10,fontWeight:700,color:"#fff",letterSpacing:0.5}}>LIVE</div>
    <div style={{marginLeft:"auto",display:"flex",gap:4,background:"#12141b",padding:3,borderRadius:8}}>{[["all","All Time"],["ytd","YTD"],["quarter","Quarter"],["month","Month"]].map(([v,l])=> <button key={v} onClick={()=>setDateFilter(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:dateFilter===v?"#c8a25c":"transparent",color:dateFilter===v?"#0a0c10":"#6b7280",fontSize:11,fontWeight:dateFilter===v?600:400,fontFamily:"inherit"}}>{l}</button>)}</div>
  </div><p style={{fontSize:14,color:"#6b7280"}}>Midwest Educational Furnishings — {dateFilter==="all"?"All time":dateFilter==="ytd"?"Year to date":dateFilter==="quarter"?"This quarter":"This month"} · {filtered.length} jobs</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <StatCard label="Pipeline Revenue" value={fmt(totalRev)} sub={`${jobs.length} total jobs`} icon="chart" color="#c8a25c"/>
      <StatCard label="Active Jobs" value={activeJobs} sub={`${jobs.filter(j=>j.phase==="Quoting").length} quoting`} icon="briefcase" color="#2563eb"/>
      <StatCard label="Avg Margin" value={pct(avgMargin)} sub={fmt(totalRev-totalCost)+" total profit"} icon="dollar" color="#059669"/>
      <StatCard label="Delivery Rate" value={pct(totalOrdered?(totalReceived/totalOrdered)*100:0)} sub={`${pendingDel} items pending`} icon="truck" color="#d97706"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><I n="alert" s={16}/> Action Required</div><div style={{display:"flex",flexDirection:"column",gap:10}}>
        {pendingInv>0&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#d9770610",border:"1px solid #d9770625",borderRadius:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#d97706"}}/><span style={{fontSize:13,color:"#d97706",flex:1}}>{pendingInv} line items received but not yet invoiced</span><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setPage("documents")}>Draft Invoices</Btn></div>}
        {pendingDel>0&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#2563eb10",border:"1px solid #2563eb25",borderRadius:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#2563eb"}}/><span style={{fontSize:13,color:"#93c5fd",flex:1}}>{pendingDel} line items awaiting delivery</span><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setPage("deliveries")}>Track</Btn></div>}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#05966910",border:"1px solid #05966925",borderRadius:8}}><div style={{width:8,height:8,borderRadius:"50%",background:"#059669"}}/><span style={{fontSize:13,color:"#6ee7b7",flex:1}}>Commission statements ready for review</span><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setPage("commissions")}>Review</Btn></div>
      </div></Card>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><I n="briefcase" s={16}/> Active Jobs</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{jobs.map(job=>{const f=getJobFinancials(job.id);return <div key={job.id} onClick={()=>{setSelectedJob(job.id);setPage("jobs")}} style={{padding:"10px 12px",background:"#1a1d27",borderRadius:8,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#1e2130"} onMouseLeave={e=>e.currentTarget.style.background="#1a1d27"}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,color:"#e8e6e3"}}>{job.name}</span><Badge label={job.phase} color={statusColor(job.phase)}/></div><Bar value={f.totalReceived} max={f.totalOrdered||1} color={statusColor(job.phase)} height={4}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:11,color:"#6b7280"}}>{fmtN(f.totalReceived)}/{fmtN(f.totalOrdered)} units</span><span style={{fontSize:11,color:"#6b7280"}}>{fmt(f.totalRevenue)}</span></div></div>})}</div></Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>Revenue by Sales Rep</div>{reps.map(rep=>{const rj=jobs.filter(j=>j.salesRep===rep.id);const rv=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);return <div key={rep.id} style={{padding:"12px 0",borderBottom:"1px solid #1e2130"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div><span style={{fontSize:13,fontWeight:600,color:"#e8e6e3"}}>{rep.name}</span><span style={{fontSize:11,color:"#6b7280",marginLeft:8}}>{rep.territory}</span></div><span style={{fontSize:13,fontWeight:600,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{fmt(rv)}</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#6b7280"}}>{rj.length} job(s) · {pct(rep.commissionRate*100)} rate</span><span style={{fontSize:11,color:"#c8a25c"}}>Est. commission: {fmt(rv*rep.commissionRate)}</span></div></div>})}</Card>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>Vendor Distribution</div>{(()=>{const vt={};lineItems.forEach(i=>{const v=vendors.find(v=>v.id===i.vendor);if(v)vt[v.name]=(vt[v.name]||0)+i.unitCost*i.qtyOrdered});const sorted=Object.entries(vt).sort((a,b)=>b[1]-a[1]);const mx=sorted[0]?.[1]||1;return sorted.map(([name,total])=><div key={name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#d1d5db"}}>{name}</span><span style={{fontSize:12,color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>{fmt(total)}</span></div><Bar value={total} max={mx} color="#c8a25c" height={4}/></div>)})()}</Card>
    </div>

    {/* ─── CHARTS ──────────────────────────────────────────────── */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>Revenue by Job</div>
        {(()=>{const data=filtered.map(j=>({name:j.name.length>20?j.name.slice(0,20)+'...':j.name,rev:getJobFinancials(j.id).totalRevenue,cost:getJobFinancials(j.id).totalCost}));const mx=Math.max(...data.map(d=>d.rev),1);const w=500,h=data.length*36+20;return <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:"auto"}}>{data.map((d,i)=>{const bw=d.rev/mx*(w-160);const cw=d.cost/mx*(w-160);return <g key={i} transform={`translate(0,${i*36})`}><text x={0} y={20} fill="#9ca3af" fontSize={10} fontFamily="DM Sans">{d.name}</text><rect x={160} y={8} width={bw} height={10} rx={3} fill="#c8a25c" opacity={0.8}/><rect x={160} y={20} width={cw} height={6} rx={2} fill="#6b7280" opacity={0.5}/><text x={165+bw} y={18} fill="#c8a25c" fontSize={9} fontFamily="DM Mono">{fmt(d.rev)}</text></g>})}</svg>})()}
        <div style={{display:"flex",gap:16,marginTop:8}}><span style={{fontSize:10,color:"#c8a25c",display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:6,background:"#c8a25c",borderRadius:2,display:"inline-block"}}/> Revenue</span><span style={{fontSize:10,color:"#6b7280",display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:4,background:"#6b7280",borderRadius:2,display:"inline-block"}}/> Cost</span></div>
      </Card>
      <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>Margin by Job</div>
        {(()=>{const data=filtered.map(j=>({name:j.name.length>20?j.name.slice(0,20)+'...':j.name,margin:getJobFinancials(j.id).margin}));const w=500,h=data.length*36+20;return <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:"auto"}}>{data.map((d,i)=>{const bw=d.margin/50*(w-200);const color=d.margin>=30?"#059669":d.margin>=20?"#d97706":"#ef4444";return <g key={i} transform={`translate(0,${i*36})`}><text x={0} y={18} fill="#9ca3af" fontSize={10} fontFamily="DM Sans">{d.name}</text><rect x={160} y={6} width={Math.max(bw,2)} height={14} rx={4} fill={color} opacity={0.7}/><text x={165+bw} y={18} fill={color} fontSize={10} fontWeight={600} fontFamily="DM Mono">{d.margin.toFixed(1)}%</text><line x1={160+30/50*(w-200)} y1={0} x2={160+30/50*(w-200)} y2={26} stroke="#059669" strokeWidth={1} strokeDasharray="3,3" opacity={0.3}/></g>})}<text x={160+30/50*(w-200)} y={h-2} fill="#059669" fontSize={8} textAnchor="middle" opacity={0.5}>30% target</text></svg>})()}
      </Card>
    </div>
    <Card style={{marginTop:16}}><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>Pipeline by Phase</div>
      {(()=>{const phases=["Quoting","In Progress","Invoiced","Complete"];const data=phases.map(p=>{const pJobs=filtered.filter(j=>j.phase===p);return{phase:p,count:pJobs.length,rev:pJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0)}});const maxRev=Math.max(...data.map(d=>d.rev),1);return <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>{data.map(d=><div key={d.phase} style={{textAlign:"center"}}><div style={{height:120,display:"flex",alignItems:"flex-end",justifyContent:"center",marginBottom:8}}><div style={{width:48,height:Math.max(d.rev/maxRev*100,4),background:statusColor(d.phase),borderRadius:"6px 6px 0 0",opacity:0.8,transition:"height 0.5s"}}/></div><div style={{fontSize:12,fontWeight:600,color:statusColor(d.phase)}}>{d.phase}</div><div style={{fontSize:16,fontWeight:700,color:"#f5f5f4",fontFamily:"'DM Mono',monospace"}}>{fmt(d.rev)}</div><div style={{fontSize:11,color:"#6b7280"}}>{d.count} job{d.count!==1?'s':''}</div></div>)}</div>})()}
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// JOB RECORDS — Full CRUD + Line Items
// ═══════════════════════════════════════════════════════════════
function JobsPage(ctx){
  const {jobs,reps,customers,vendors,selectedJob,setSelectedJob,showNewJob,setShowNewJob,notify,getJobFinancials,getJobItems,getItemStatus,getJobPOStatus,getJobInvStatus,updateJob,addJob,addLineItem,updateLineItem,deleteLineItem,lineItems,addCustomer} = ctx;
  const [newJob,setNewJob]=useState({name:"",customer:customers[0]?.id||"",salesRep:reps[0]?.id||"",dueDate:"",startDate:"",notes:""});
  const [newCust,setNewCust]=useState(false);
  const [custForm,setCustForm]=useState({name:"",contact:"",email:"",phone:"",type:"K-12 District"});
  const [viewMode,setViewMode]=useState("table"); // table or kanban
  const [sortBy,setSortBy]=useState("createdDate");

  const handleCreateJob=()=>{if(!newJob.name)return;const id=`JOB-2026-${String(jobs.length+1).padStart(3,"0")}`;addJob({id,...newJob,phase:"Quoting",createdDate:new Date().toISOString().split("T")[0],startDate:newJob.startDate||"",endDate:"",paymentStatus:"unpaid"});setShowNewJob(false);setNewJob({name:"",customer:customers[0]?.id||"",salesRep:reps[0]?.id||"",dueDate:"",startDate:"",notes:""});notify(`Job ${id} created — saved to database`)};

  // Kanban drag handler
  const handleDragStart=(e,jobId)=>{e.dataTransfer.setData("jobId",jobId)};
  const handleDrop=(e,phase)=>{e.preventDefault();const jobId=e.dataTransfer.getData("jobId");if(jobId)updateJob(jobId,{phase});notify(`Job moved to ${phase}`)};
  const handleDragOver=(e)=>e.preventDefault();

  if(selectedJob){
    const job=jobs.find(j=>j.id===selectedJob);
    if(!job) return null;
    return <JobDetail job={job} ctx={ctx}/>;
  }

  const filteredJobs = jobs.filter(j => { const s = (ctx.globalSearch||"").toLowerCase(); if (!s) return true; const c = customers.find(c=>c.id===j.customer)?.name||""; const r = reps.find(r=>r.id===j.salesRep)?.name||""; return j.name.toLowerCase().includes(s)||j.id.toLowerCase().includes(s)||c.toLowerCase().includes(s)||r.toLowerCase().includes(s)||j.phase.toLowerCase().includes(s); });
  const sortedJobs = [...filteredJobs].sort((a,b)=>{ if(sortBy==="revenue") return getJobFinancials(b.id).totalRevenue-getJobFinancials(a.id).totalRevenue; if(sortBy==="margin") return getJobFinancials(b.id).margin-getJobFinancials(a.id).margin; if(sortBy==="name") return a.name.localeCompare(b.name); return (b[sortBy]||"").localeCompare(a[sortBy]||""); });

  return <div style={{animation:"fadeUp 0.4s"}}>
    <Header title="Job Records" sub="Central hub — single source of truth for every project" action={<div style={{display:"flex",gap:8}}><Btn onClick={()=>setNewCust(true)} v="secondary"><I n="plus" s={14}/> New Customer</Btn><Btn onClick={()=>setShowNewJob(true)}><I n="plus" s={14}/> New Job</Btn></div>}/>

    <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
      <input value={ctx.globalSearch} onChange={e=>ctx.setGlobalSearch(e.target.value)} placeholder="Search jobs..." style={{...inputStyle,maxWidth:300,background:"#12141b",border:"1px solid #1e2130",padding:"10px 14px",fontSize:14}}/>
      <div style={{display:"flex",gap:4,background:"#12141b",padding:3,borderRadius:8}}>
        {[["table","Table"],["kanban","Kanban"]].map(([v,l])=><button key={v} onClick={()=>setViewMode(v)} style={{padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",background:viewMode===v?"#c8a25c":"transparent",color:viewMode===v?"#0a0c10":"#6b7280",fontSize:11,fontWeight:viewMode===v?600:400,fontFamily:"inherit"}}>{l}</button>)}
      </div>
      <div style={{display:"flex",gap:4,background:"#12141b",padding:3,borderRadius:8,marginLeft:"auto"}}>
        <span style={{fontSize:11,color:"#6b7280",padding:"5px 8px"}}>Sort:</span>
        {[["createdDate","Date"],["name","Name"],["revenue","Revenue"],["margin","Margin"]].map(([v,l])=><button key={v} onClick={()=>setSortBy(v)} style={{padding:"5px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sortBy===v?"#c8a25c22":"transparent",color:sortBy===v?"#c8a25c":"#6b7280",fontSize:11,fontFamily:"inherit"}}>{l}</button>)}
      </div>
    </div>

    {newCust&&<Card style={{marginBottom:20,border:"1px solid #2563eb30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#2563eb"}}>Add New Customer</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>{[["name","Name"],["contact","Contact"],["email","Email"],["phone","Phone"]].map(([k,l])=><div key={k}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>{l}</label><input value={custForm[k]} onChange={e=>setCustForm({...custForm,[k]:e.target.value})} style={inputStyle}/></div>)}</div><div style={{display:"flex",gap:8}}><Btn onClick={()=>{if(custForm.name){addCustomer(custForm);setNewCust(false);setCustForm({name:"",contact:"",email:"",phone:"",type:"K-12 District"});notify("Customer added")}}}>Add Customer</Btn><Btn v="secondary" onClick={()=>setNewCust(false)}>Cancel</Btn></div></Card>}

    {showNewJob&&<Card style={{marginBottom:20,border:"1px solid #c8a25c30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#c8a25c"}}>Create New Job Record</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Job Name</label><input value={newJob.name} onChange={e=>setNewJob({...newJob,name:e.target.value})} placeholder="e.g., Lincoln USD Media Center" style={inputStyle}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Customer</label><select value={newJob.customer} onChange={e=>setNewJob({...newJob,customer:e.target.value})} style={inputStyle}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Sales Rep</label><select value={newJob.salesRep} onChange={e=>setNewJob({...newJob,salesRep:e.target.value})} style={inputStyle}>{reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Start Date</label><input type="date" value={newJob.startDate} onChange={e=>setNewJob({...newJob,startDate:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Due Date</label><input type="date" value={newJob.dueDate} onChange={e=>setNewJob({...newJob,dueDate:e.target.value})} style={inputStyle}/></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Notes</label><input value={newJob.notes} onChange={e=>setNewJob({...newJob,notes:e.target.value})} placeholder="Project details..." style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={handleCreateJob}>Create Job Record</Btn><Btn v="secondary" onClick={()=>setShowNewJob(false)}>Cancel</Btn></div></Card>}

    {viewMode==="table"&&<Tbl columns={[
      {header:"Job ID",render:r=><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#c8a25c"}}>{r.id}</span>},
      {header:"Job Name",render:r=><span style={{fontWeight:600,color:"#f5f5f4"}}>{r.name}</span>},
      {header:"Customer",render:r=>customers.find(c=>c.id===r.customer)?.name},
      {header:"Rep",render:r=>reps.find(rep=>rep.id===r.salesRep)?.name},
      {header:"Phase",render:r=><Badge label={r.phase} color={statusColor(r.phase)}/>},
      {header:"Created",render:r=><span style={{fontSize:11,color:"#6b7280"}}>{r.createdDate||"—"}</span>},
      {header:"Start",render:r=><span style={{fontSize:11,color:r.startDate?"#d1d5db":"#4b5563"}}>{r.startDate||"—"}</span>},
      {header:"Due",render:r=><span style={{fontSize:11,color:r.dueDate&&new Date(r.dueDate)<new Date()?"#ef4444":"#d1d5db"}}>{r.dueDate||"—"}</span>},
      {header:"Revenue",render:r=><span style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{fmt(getJobFinancials(r.id).totalRevenue)}</span>},
      {header:"Margin",render:r=>{const m=getJobFinancials(r.id).margin;return <span style={{color:m>=30?"#059669":"#d97706",fontSize:12}}>{pct(m)}</span>}},
      {header:"Payment",render:r=><Badge label={r.paymentStatus} color={statusColor(r.paymentStatus)}/>},
    ]} data={sortedJobs} onRowClick={r=>setSelectedJob(r.id)}/>}

    {viewMode==="kanban"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,minHeight:400}}>
      {["Quoting","In Progress","Invoiced","Complete"].map(phase=><div key={phase} onDrop={e=>handleDrop(e,phase)} onDragOver={handleDragOver} style={{background:"#12141b",borderRadius:12,padding:12,border:"1px solid #1e2130",minHeight:300}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:8,borderBottom:"2px solid "+statusColor(phase)}}><div style={{width:8,height:8,borderRadius:"50%",background:statusColor(phase)}}/><span style={{fontSize:13,fontWeight:700,color:"#f5f5f4"}}>{phase}</span><span style={{fontSize:11,color:"#6b7280",marginLeft:"auto"}}>{sortedJobs.filter(j=>j.phase===phase).length}</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sortedJobs.filter(j=>j.phase===phase).map(job=>{const f=getJobFinancials(job.id);return <div key={job.id} draggable onDragStart={e=>handleDragStart(e,job.id)} onClick={()=>setSelectedJob(job.id)} style={{background:"#1a1d27",borderRadius:8,padding:12,cursor:"grab",border:"1px solid #2a2d37",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#c8a25c44";e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2d37";e.currentTarget.style.transform="translateY(0)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#f5f5f4",marginBottom:4}}>{job.name}</div>
            <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{customers.find(c=>c.id===job.customer)?.name}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:600,color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>{fmt(f.totalRevenue)}</span>
              <span style={{fontSize:10,color:f.margin>=30?"#059669":"#d97706"}}>{pct(f.margin)}</span>
            </div>
            <Bar value={f.totalReceived} max={f.totalOrdered||1} color={statusColor(phase)} height={3}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:10,color:"#4b5563"}}>{job.startDate||job.createdDate}</span><span style={{fontSize:10,color:job.dueDate&&new Date(job.dueDate)<new Date()?"#ef4444":"#4b5563"}}>Due: {job.dueDate||"TBD"}</span></div>
          </div>})}
        </div>
      </div>)}
    </div>}
  </div>;
}

// ─── JOB DETAIL ──────────────────────────────────────────────
function JobDetail({job,ctx}){
  const {getJobFinancials,getJobItems,getItemStatus,vendors,customers,reps,updateJob,addLineItem,updateLineItem,deleteLineItem,setSelectedJob,notify}=ctx;
  const f=getJobFinancials(job.id);
  const items=getJobItems(job.id);
  const customer=customers.find(c=>c.id===job.customer);
  const rep=reps.find(r=>r.id===job.salesRep);
  const [editing,setEditing]=useState(false);
  const [editJob,setEditJob]=useState({...job});
  const [addingItem,setAddingItem]=useState(false);
  const [newItem,setNewItem]=useState({description:"",vendor:vendors[0]?.id||"",unitCost:0,unitPrice:0,qtyOrdered:0,qtyReceived:0,qtyInvoiced:0});
  const [editingItem,setEditingItem]=useState(null);

  const saveJob=()=>{updateJob(job.id,editJob);setEditing(false);notify("Job updated — changes propagated everywhere")};
  const saveNewItem=()=>{if(!newItem.description)return;addLineItem({...newItem,jobId:job.id,unitCost:parseFloat(newItem.unitCost)||0,unitPrice:parseFloat(newItem.unitPrice)||0,qtyOrdered:parseInt(newItem.qtyOrdered)||0,qtyReceived:parseInt(newItem.qtyReceived)||0,qtyInvoiced:parseInt(newItem.qtyInvoiced)||0});setAddingItem(false);setNewItem({description:"",vendor:vendors[0]?.id||"",unitCost:0,unitPrice:0,qtyOrdered:0,qtyReceived:0,qtyInvoiced:0});notify("Line item added — financials updated")};

  return <div style={{animation:"fadeUp 0.3s"}}>
    <button onClick={()=>setSelectedJob(null)} style={{background:"none",border:"none",color:"#c8a25c",cursor:"pointer",fontSize:13,fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>&larr; Back to All Jobs</button>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}><h2 style={{fontSize:24,fontWeight:800,color:"#f5f5f4"}}>{job.name}</h2><Badge label={job.phase} color={statusColor(job.phase)}/></div><div style={{fontSize:13,color:"#6b7280"}}><span style={{fontFamily:"'DM Mono',monospace",color:"#c8a25c"}}>{job.id}</span>{" · "}{customer?.name}{" · "}Rep: {rep?.name}</div></div>
      <div style={{display:"flex",gap:8}}><Btn v="secondary" onClick={()=>setEditing(!editing)}><I n="edit" s={14}/> Edit Job</Btn><Btn onClick={()=>setAddingItem(true)}><I n="plus" s={14}/> Add Line Item</Btn></div>
    </div>

    {editing&&<Card style={{marginBottom:20,border:"1px solid #c8a25c30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#c8a25c"}}>Edit Job Record</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Job Name</label><input value={editJob.name} onChange={e=>setEditJob({...editJob,name:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Phase</label><select value={editJob.phase} onChange={e=>setEditJob({...editJob,phase:e.target.value})} style={inputStyle}>{["Quoting","In Progress","Invoiced","Complete"].map(p=><option key={p}>{p}</option>)}</select></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Payment Status</label><select value={editJob.paymentStatus} onChange={e=>setEditJob({...editJob,paymentStatus:e.target.value})} style={inputStyle}>{["unpaid","partial","paid"].map(p=><option key={p}>{p}</option>)}</select></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Customer</label><select value={editJob.customer} onChange={e=>setEditJob({...editJob,customer:e.target.value})} style={inputStyle}>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Sales Rep</label><select value={editJob.salesRep} onChange={e=>setEditJob({...editJob,salesRep:e.target.value})} style={inputStyle}>{reps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Due Date</label><input type="date" value={editJob.dueDate} onChange={e=>setEditJob({...editJob,dueDate:e.target.value})} style={inputStyle}/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Start Date</label><input type="date" value={editJob.startDate||""} onChange={e=>setEditJob({...editJob,startDate:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>End Date</label><input type="date" value={editJob.endDate||""} onChange={e=>setEditJob({...editJob,endDate:e.target.value})} style={inputStyle}/></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Notes</label><input value={editJob.notes} onChange={e=>setEditJob({...editJob,notes:e.target.value})} style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={saveJob}>Save Changes</Btn><Btn v="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div></Card>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Revenue</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#f5f5f4"}}>{fmt(f.totalRevenue)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Cost</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#f5f5f4"}}>{fmt(f.totalCost)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Margin</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#059669"}}>{pct(f.margin)}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Line Items</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#f5f5f4"}}>{f.itemCount}</div></Card>
      <Card style={{padding:14,textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Commission</div><div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#c8a25c"}}>{fmt(f.totalRevenue*(rep?.commissionRate||0))}</div></Card>
    </div>

    {addingItem&&<Card style={{marginBottom:20,border:"1px solid #05966930"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#059669"}}>Add Line Item</div><div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>{[["description","Description","text"],["vendor","Vendor","select"],["unitCost","Unit Cost","number"],["unitPrice","Unit Price","number"],["qtyOrdered","Qty Ordered","number"],["qtyReceived","Qty Received","number"],["qtyInvoiced","Qty Invoiced","number"]].map(([k,l,t])=><div key={k}><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>{l}</label>{t==="select"?<select value={newItem[k]} onChange={e=>setNewItem({...newItem,[k]:e.target.value})} style={{...inputStyle,fontSize:12}}>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>:<input type={t==="number"?"number":"text"} value={newItem[k]} onChange={e=>setNewItem({...newItem,[k]:e.target.value})} style={{...inputStyle,fontSize:12}}/>}</div>)}</div><div style={{display:"flex",gap:8}}><Btn onClick={saveNewItem}>Add Item</Btn><Btn v="secondary" onClick={()=>setAddingItem(false)}>Cancel</Btn></div></Card>}

    <Header title="Line Items" sub="Click any cell value to edit inline — changes propagate across all views"/>
    <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #1e2130"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#12141b"}}>{["Item","Vendor","Unit Cost","Unit Price","Ordered","Received","Invoiced","Status","Line Total",""].map((h,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:"#6b7280",fontSize:10,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid #1e2130"}}>{h}</th>)}</tr></thead><tbody>{items.map(item=>{
      const isEditing=editingItem===item.id;
      return <tr key={item.id} style={{borderBottom:"1px solid #1a1d2708"}}>
        <td style={{padding:"8px 10px",color:"#f5f5f4",fontWeight:500,maxWidth:200}}>{isEditing?<input value={item.description} onChange={e=>updateLineItem(item.id,{description:e.target.value})} style={{...inputStyle,fontSize:12,padding:"4px 8px"}}/>:item.description}</td>
        <td style={{padding:"8px 10px",color:"#d1d5db"}}>{isEditing?<select value={item.vendor} onChange={e=>updateLineItem(item.id,{vendor:e.target.value})} style={{...inputStyle,fontSize:12,padding:"4px 8px"}}>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>:vendors.find(v=>v.id===item.vendor)?.name}</td>
        <td style={{padding:"8px 10px"}}>{isEditing?<input type="number" value={item.unitCost} onChange={e=>updateLineItem(item.id,{unitCost:parseFloat(e.target.value)||0})} style={{...inputStyle,fontSize:12,padding:"4px 8px",width:80}}/>:<span style={{fontFamily:"'DM Mono',monospace"}}>{fmt(item.unitCost)}</span>}</td>
        <td style={{padding:"8px 10px"}}>{isEditing?<input type="number" value={item.unitPrice} onChange={e=>updateLineItem(item.id,{unitPrice:parseFloat(e.target.value)||0})} style={{...inputStyle,fontSize:12,padding:"4px 8px",width:80}}/>:<span style={{fontFamily:"'DM Mono',monospace"}}>{fmt(item.unitPrice)}</span>}</td>
        <td style={{padding:"8px 10px"}}>{isEditing?<input type="number" value={item.qtyOrdered} onChange={e=>updateLineItem(item.id,{qtyOrdered:parseInt(e.target.value)||0})} style={{...inputStyle,fontSize:12,padding:"4px 8px",width:60}}/>:fmtN(item.qtyOrdered)}</td>
        <td style={{padding:"8px 10px"}}>{isEditing?<input type="number" value={item.qtyReceived} onChange={e=>updateLineItem(item.id,{qtyReceived:parseInt(e.target.value)||0})} style={{...inputStyle,fontSize:12,padding:"4px 8px",width:60}}/>:<span style={{color:item.qtyReceived===item.qtyOrdered?"#059669":item.qtyReceived>0?"#d97706":"#6b7280"}}>{fmtN(item.qtyReceived)}/{fmtN(item.qtyOrdered)}</span>}</td>
        <td style={{padding:"8px 10px"}}>{isEditing?<input type="number" value={item.qtyInvoiced} onChange={e=>updateLineItem(item.id,{qtyInvoiced:parseInt(e.target.value)||0})} style={{...inputStyle,fontSize:12,padding:"4px 8px",width:60}}/>:fmtN(item.qtyInvoiced)}</td>
        <td style={{padding:"8px 10px"}}><Badge label={getItemStatus(item)} color={statusColor(getItemStatus(item))}/></td>
        <td style={{padding:"8px 10px"}}><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(item.unitPrice*item.qtyOrdered)}</span></td>
        <td style={{padding:"8px 10px"}}><div style={{display:"flex",gap:4}}><Btn v={isEditing?"primary":"ghost"} style={{fontSize:10,padding:"3px 8px"}} onClick={()=>setEditingItem(isEditing?null:item.id)}>{isEditing?"Done":"Edit"}</Btn>{isEditing&&<Btn v="danger" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>{deleteLineItem(item.id);setEditingItem(null);notify("Line item deleted")}}>Del</Btn>}</div></td>
      </tr>})}</tbody></table></div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// DELIVERY TRACKER — Real updates to state
// ═══════════════════════════════════════════════════════════════
function DeliveryPage({jobs,lineItems,vendors,getItemStatus,updateLineItem,notify}){
  const [receiveModal,setReceiveModal]=useState(null);
  const [receiveQty,setReceiveQty]=useState("");
  const allItems=lineItems.filter(i=>i.qtyReceived<i.qtyOrdered).map(i=>({...i,jobName:jobs.find(j=>j.id===i.jobId)?.name||""}));
  const partials=lineItems.filter(i=>i.qtyReceived>0&&i.qtyReceived<i.qtyOrdered);

  const handleReceive=()=>{const qty=parseInt(receiveQty)||0;if(qty<=0)return;const newRcv=Math.min(receiveModal.qtyReceived+qty,receiveModal.qtyOrdered);updateLineItem(receiveModal.id,{qtyReceived:newRcv});notify(`Logged ${qty} units received — dashboard, invoices, and deliveries updated`);setReceiveModal(null);setReceiveQty("")};

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Delivery Tracker" sub="Quantity-specific tracking — updates propagate to invoices and dashboard"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <StatCard label="Pending Delivery" value={allItems.length} sub="line items" icon="truck" color="#d97706"/>
      <StatCard label="Partial Shipments" value={partials.length} sub="in progress" icon="package" color="#2563eb"/>
      <StatCard label="Total Ordered" value={fmtN(lineItems.reduce((s,i)=>s+i.qtyOrdered,0))} sub="units" icon="package" color="#6b7280"/>
      <StatCard label="Total Received" value={fmtN(lineItems.reduce((s,i)=>s+i.qtyReceived,0))} sub="units" icon="check" color="#059669"/>
    </div>
    {receiveModal&&<Card style={{marginBottom:20,border:"1px solid #d9770644"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#d97706"}}>Log Shipment Received</div><div style={{fontSize:13,color:"#d1d5db",marginBottom:4}}>{receiveModal.description}</div><div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Outstanding: {fmtN(receiveModal.qtyOrdered-receiveModal.qtyReceived)} units · Already received: {fmtN(receiveModal.qtyReceived)}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" value={receiveQty} onChange={e=>setReceiveQty(e.target.value)} placeholder="Qty received" min="1" max={receiveModal.qtyOrdered-receiveModal.qtyReceived} style={{...inputStyle,width:120}}/><Btn onClick={handleReceive}>Log Receipt</Btn><Btn v="secondary" onClick={()=>{setReceiveModal(null);setReceiveQty("")}}>Cancel</Btn></div></Card>}
    <Tbl columns={[
      {header:"Job",render:r=><span style={{fontWeight:500,color:"#c8a25c",fontSize:12}}>{r.jobName}</span>},
      {header:"Item",render:r=><span style={{fontSize:12}}>{r.description}</span>},
      {header:"Vendor",render:r=>vendors.find(v=>v.id===r.vendor)?.name},
      {header:"Ordered",render:r=>fmtN(r.qtyOrdered)},
      {header:"Received",render:r=>fmtN(r.qtyReceived)},
      {header:"Outstanding",render:r=><span style={{fontWeight:600,color:"#d97706",fontFamily:"'DM Mono',monospace"}}>{fmtN(r.qtyOrdered-r.qtyReceived)}</span>},
      {header:"Progress",render:r=><div style={{width:100}}><Bar value={r.qtyReceived} max={r.qtyOrdered} color={r.qtyReceived>0?"#d97706":"#2a2d37"} height={5}/></div>},
      {header:"",render:r=><div style={{display:"flex",gap:4}}><Btn v="ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={e=>{e.stopPropagation();setReceiveModal(r)}}>Receive</Btn>{r.qtyOrdered-r.qtyReceived>0&&<Btn v="secondary" style={{fontSize:10,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();updateLineItem(r.id,{qtyReceived:r.qtyOrdered,deliveryDate:new Date().toISOString().split("T")[0]});notify("Marked complete — all "+fmtN(r.qtyOrdered)+" units received")}}>Complete</Btn>}</div>},
    ]} data={allItems}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS — POs & Invoices with REAL PDF Export
// ═══════════════════════════════════════════════════════════════
function DocumentsPage({jobs,lineItems,vendors,customers,reps,getJobItems,notify,qbConfig,setPage,triggerPrint}){
  const [tab,setTab]=useState("pos");
  const [previewDoc,setPreviewDoc]=useState(null);
  const [pushing,setPushing]=useState(false);

  const genPOs=job=>{const items=getJobItems(job.id);const groups={};items.forEach(i=>{if(!groups[i.vendor])groups[i.vendor]=[];groups[i.vendor].push(i)});return Object.entries(groups).map(([vid,vitems])=>({vendor:vendors.find(v=>v.id===vid),items:vitems,total:vitems.reduce((s,i)=>s+i.unitCost*i.qtyOrdered,0),job}))};
  const genInvoice=job=>{const items=getJobItems(job.id).filter(i=>i.qtyReceived>i.qtyInvoiced);return {customer:customers.find(c=>c.id===job.customer),items,total:items.reduce((s,i)=>s+i.unitPrice*(i.qtyReceived-i.qtyInvoiced),0),job}};

  const handleExportPDF=(doc)=>{
    const isQuote=doc.type==="quote";
    const isPO=doc.type==="po";
    const isInv=doc.type==="invoice";
    const docTitle=isQuote?"PROJECT QUOTE":isPO?"PURCHASE ORDER":"INVOICE";
    const name=isQuote?doc.data.customer?.name:isPO?doc.data.vendor?.name:doc.data.customer?.name;
    const addr=isQuote?doc.data.customer?.address:isPO?doc.data.vendor?.address:doc.data.customer?.address;
    const rows=doc.data.items.map(i=>{
      const q=isQuote?i.qtyOrdered:isPO?i.qtyOrdered:(i.qtyReceived-i.qtyInvoiced);
      const p=isQuote?i.unitPrice:isPO?i.unitCost:i.unitPrice;
      return '<tr><td>'+i.description+'</td><td style="text-align:right">'+q+'</td><td style="text-align:right">$'+p.toFixed(2)+'</td><td style="text-align:right"><strong>$'+(q*p).toFixed(2)+'</strong></td></tr>';
    }).join("");
    const total=isQuote?doc.data.items.reduce((s,i)=>s+i.unitPrice*i.qtyOrdered,0):doc.data.total;
    triggerPrint(docTitle+" - "+doc.job.name,
      '<div class="hdr"><div><div class="co">MIDWEST EDUCATIONAL FURNISHINGS</div><div>Designing Spaces | Building Futures</div><div style="margin-top:4px">(847) 847-1865 · info@mwfurnishings.com · www.mwfurnishings.com</div></div><div style="text-align:right"><div class="gold" style="font-weight:bold;font-size:14px">'+docTitle+'</div><div>Date: '+new Date().toLocaleDateString()+'</div><div>Job: '+doc.job.id+'</div>'+(isQuote?'<div>Valid for 30 days</div>':'')+'</div></div>'
      +'<h2>'+(isQuote?"Prepared For":isPO?"Vendor":"Bill To")+': '+name+'</h2>'
      +(addr?'<div style="font-size:12px;color:#666;margin-bottom:8px">'+addr+'</div>':'')
      +'<h2>Project: '+doc.job.name+'</h2>'
      +(doc.job.notes?'<div style="font-size:12px;color:#666;margin-bottom:12px">'+doc.job.notes+'</div>':'')
      +'<table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr class="total-row"><td colspan="3" style="text-align:right;padding:10px 8px">TOTAL</td><td style="text-align:right;padding:10px 8px">$'+total.toFixed(2)+'</td></tr></tfoot></table>'
      +(isQuote?'<div style="margin-top:24px;padding:16px;background:#f9f8f6;border-radius:8px;font-size:12px;color:#666"><strong>Terms & Conditions:</strong> Quote valid for 30 days from date above. Prices subject to manufacturer availability. Delivery and installation included unless noted. Payment terms: Net 30 from invoice date. Thank you for choosing Midwest Educational Furnishings.</div>':'')
    );
  };

  const pushToQB = async (doc) => {
    if(!qbConfig.connected||!qbConfig.accessToken||!qbConfig.realmId){notify("Connect QuickBooks first — go to QB Setup page","error");return}
    setPushing(true);
    try {
      const isPO = doc.type==="po";
      const path = isPO ? 'purchaseorder?minorversion=73' : 'invoice?minorversion=73';
      const lines = doc.data.items.map((item,idx) => {
        const qty = isPO ? item.qtyOrdered : (item.qtyReceived - item.qtyInvoiced);
        const price = isPO ? item.unitCost : item.unitPrice;
        return isPO
          ? { Id: String(idx+1), Amount: qty * price, DetailType: "ItemBasedExpenseLineDetail", ItemBasedExpenseLineDetail: { ItemRef: { value: "1", name: item.description.slice(0,100) }, Qty: qty, UnitPrice: price }, Description: item.description }
          : { Id: String(idx+1), Amount: qty * price, DetailType: "SalesItemLineDetail", SalesItemLineDetail: { ItemRef: { value: "1", name: item.description.slice(0,100) }, Qty: qty, UnitPrice: price }, Description: item.description };
      });
      const payload = isPO
        ? { VendorRef: { value: "1", name: doc.data.vendor?.name || "Vendor" }, Line: lines }
        : { CustomerRef: { value: "1", name: doc.data.customer?.name || "Customer" }, Line: lines };
      
      const resp = await fetch('/api/qb-proxy?path=' + encodeURIComponent(path), {
        method: "POST",
        headers: { "Authorization": "Bearer " + qbConfig.accessToken, "Content-Type": "application/json", "x-qb-realmid": qbConfig.realmId },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if(resp.ok) { notify("Pushed to QuickBooks — " + (isPO ? "PO" : "Invoice") + " created"); }
      else { notify("QB Error: " + (data.Fault?.Error?.[0]?.Message || data.error || resp.status),"error"); }
    } catch(e) { notify("Network error: " + e.message,"error"); }
    setPushing(false);
  };

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="PO & Invoice Engine" sub="Quotes, POs, Invoices, Commission Statements — all auto-drafted from job records"/>
    <div style={{display:"flex",gap:4,marginBottom:20,background:"#12141b",padding:4,borderRadius:10,width:"fit-content"}}>{[["quotes","Quotes"],["pos","Purchase Orders"],["invoices","Invoices"],["preview","Document Preview"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===id?"#c8a25c":"transparent",color:tab===id?"#0a0c10":"#6b7280",fontSize:13,fontWeight:tab===id?600:400,fontFamily:"inherit"}}>{label}</button>)}</div>

    {tab==="quotes"&&jobs.map(job=>{const items=getJobItems(job.id);const customer=customers.find(c=>c.id===job.customer);const total=items.reduce((s,i)=>s+i.unitPrice*i.qtyOrdered,0);return <Card key={job.id} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><span style={{fontSize:14,fontWeight:700,color:"#f5f5f4"}}>{job.name}</span><span style={{fontSize:12,color:"#6b7280",marginLeft:10}}>{customer?.name} · {items.length} items · {fmt(total)}</span></div><Btn onClick={()=>{setPreviewDoc({type:"quote",data:{customer,items,total,job},job});setTab("preview")}}><I n="file" s={14}/> Generate Quote</Btn></div><Bar value={job.phase==="Quoting"?0.2:job.phase==="In Progress"?0.5:1} max={1} color={statusColor(job.phase)} height={3}/></Card>})}

    {tab==="pos"&&jobs.map(job=>{const pos=genPOs(job);return <Card key={job.id} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><span style={{fontSize:14,fontWeight:700,color:"#f5f5f4"}}>{job.name}</span><span style={{fontSize:12,color:"#6b7280",marginLeft:10}}>{pos.length} vendor POs</span></div><Btn v="secondary" onClick={()=>{if(pos[0]){setPreviewDoc({type:"po",data:pos[0],job});setTab("preview")}}}><I n="file" s={14}/> View POs</Btn></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>{pos.map((po,i)=><div key={i} style={{padding:12,background:"#1a1d27",borderRadius:8,border:"1px solid #1e2130",cursor:"pointer"}} onClick={()=>{setPreviewDoc({type:"po",data:po,job});setTab("preview")}}><div style={{fontSize:13,fontWeight:600,color:"#e8e6e3",marginBottom:4}}>{po.vendor?.name}</div><div style={{fontSize:12,color:"#6b7280"}}>{po.items.length} items</div><div style={{fontSize:14,fontWeight:600,color:"#c8a25c",fontFamily:"'DM Mono',monospace",marginTop:4}}>{fmt(po.total)}</div></div>)}</div></Card>})}

    {tab==="invoices"&&jobs.map(job=>{const inv=genInvoice(job);const items=getJobItems(job.id);const invoicedTotal=items.reduce((s,i)=>s+i.unitPrice*i.qtyInvoiced,0);const fullTotal=items.reduce((s,i)=>s+i.unitPrice*i.qtyOrdered,0);return <Card key={job.id} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><span style={{fontSize:14,fontWeight:700,color:"#f5f5f4"}}>{job.name}</span></div>{inv.items.length>0&&<Btn onClick={()=>{setPreviewDoc({type:"invoice",data:inv,job});setTab("preview")}}><I n="receipt" s={14}/> Draft Partial Invoice</Btn>}</div><div style={{display:"flex",gap:20,fontSize:12,color:"#6b7280"}}><span>Total: <strong style={{color:"#f5f5f4"}}>{fmt(fullTotal)}</strong></span><span>Invoiced: <strong style={{color:"#059669"}}>{fmt(invoicedTotal)}</strong></span><span>Pending: <strong style={{color:inv.total>0?"#d97706":"#6b7280"}}>{fmt(inv.total)}</strong></span><span>Ready: <strong style={{color:"#c8a25c"}}>{inv.items.length} items</strong></span></div><div style={{marginTop:8}}><Bar value={invoicedTotal} max={fullTotal||1} color="#059669" height={4}/></div></Card>})}

    {tab==="preview"&&previewDoc&&<Card style={{border:"1px solid #c8a25c30"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{fontSize:16,fontWeight:700,color:"#c8a25c"}}>{previewDoc.type==="quote"?"PROJECT QUOTE":previewDoc.type==="po"?"PURCHASE ORDER":"INVOICE"} — Draft Preview</div><div style={{display:"flex",gap:8}}><Btn onClick={()=>handleExportPDF(previewDoc)}><I n="download" s={14}/> Export PDF</Btn>{previewDoc.type!=="quote"&&<Btn v={qbConfig.connected?"primary":"secondary"} onClick={()=>qbConfig.connected?pushToQB(previewDoc):setPage("qbsetup")} style={pushing?{opacity:0.6,pointerEvents:"none"}:{}}><I n="send" s={14}/> {pushing?"Pushing...":qbConfig.connected?"Push to QuickBooks":"Connect QB First"}</Btn>}</div></div>
      <div style={{background:"#fff",color:"#111",borderRadius:8,padding:32,fontFamily:"'DM Sans',sans-serif"}}><div style={{display:"flex",justifyContent:"space-between",borderBottom:"2px solid #c8a25c",paddingBottom:16,marginBottom:20}}><div><div style={{fontSize:20,fontWeight:800}}>MIDWEST EDUCATIONAL FURNISHINGS</div><div style={{fontSize:12,color:"#666",marginTop:4}}>(847) 847-1865 · info@mwfurnishings.com · www.mwfurnishings.com</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#c8a25c",textTransform:"uppercase"}}>{previewDoc.type==="po"?"Purchase Order":"Invoice"}</div><div style={{fontSize:12,color:"#666",marginTop:4}}>Date: {new Date().toLocaleDateString()}</div><div style={{fontSize:12,color:"#666"}}>Job: {previewDoc.job.id}</div></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}><div><div style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",marginBottom:4}}>{previewDoc.type==="po"?"Vendor":"Bill To"}</div><div style={{fontSize:13,fontWeight:600}}>{previewDoc.type==="po"?previewDoc.data.vendor?.name:previewDoc.data.customer?.name}</div></div><div><div style={{fontSize:11,fontWeight:700,color:"#999",textTransform:"uppercase",marginBottom:4}}>Job</div><div style={{fontSize:13,fontWeight:600}}>{previewDoc.job.name}</div></div></div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:20}}><thead><tr style={{borderBottom:"1px solid #ddd"}}><th style={{padding:"8px 4px",textAlign:"left",color:"#666"}}>Description</th><th style={{padding:"8px 4px",textAlign:"right",color:"#666"}}>Qty</th><th style={{padding:"8px 4px",textAlign:"right",color:"#666"}}>Unit Price</th><th style={{padding:"8px 4px",textAlign:"right",color:"#666"}}>Total</th></tr></thead><tbody>{previewDoc.data.items.map((item,i)=>{const qty=previewDoc.type==="po"?item.qtyOrdered:item.qtyReceived-item.qtyInvoiced;const price=previewDoc.type==="po"?item.unitCost:item.unitPrice;return <tr key={i} style={{borderBottom:"1px solid #eee"}}><td style={{padding:"8px 4px"}}>{item.description}</td><td style={{padding:"8px 4px",textAlign:"right"}}>{qty}</td><td style={{padding:"8px 4px",textAlign:"right"}}>{fmt(price)}</td><td style={{padding:"8px 4px",textAlign:"right",fontWeight:600}}>{fmt(qty*price)}</td></tr>})}</tbody><tfoot><tr style={{borderTop:"2px solid #c8a25c"}}><td colSpan="3" style={{padding:"10px 4px",fontWeight:700,textAlign:"right"}}>TOTAL</td><td style={{padding:"10px 4px",fontWeight:700,textAlign:"right",fontSize:14}}>{fmt(previewDoc.data.total)}</td></tr></tfoot></table>
      </div>
    </Card>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// COMMISSIONS — Editable Reps + PDF Export
// ═══════════════════════════════════════════════════════════════
function CommissionsPage({jobs,reps,customers,updateRep,addRep,deleteRep,getJobFinancials,notify,triggerPrint}){
  const [selectedRep,setSelectedRep]=useState(null);
  const [editingRep,setEditingRep]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [addingRep,setAddingRep]=useState(false);
  const [newRepForm,setNewRepForm]=useState({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate"});

  const startEdit=rep=>{setEditingRep(rep.id);setEditForm({...rep})};
  const saveEdit=()=>{updateRep(editingRep,{name:editForm.name,email:editForm.email,territory:editForm.territory,commissionRate:parseFloat(editForm.commissionRate)||0,tier:editForm.tier});setEditingRep(null);notify("Sales rep updated — commissions recalculated everywhere")};
  const handleAddRep=()=>{if(!newRepForm.name)return;addRep({...newRepForm,commissionRate:parseFloat(newRepForm.commissionRate)||0.05});setAddingRep(false);setNewRepForm({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate"});notify("Sales rep added")};

  const exportCommStatement=(rep)=>{
    const repJobs=jobs.filter(j=>j.salesRep===rep.id);
    const rows=repJobs.map(j=>{const f=getJobFinancials(j.id);return '<tr><td>'+j.name+'</td><td>'+(customers.find(c=>c.id===j.customer)?.name||'')+'</td><td style="text-align:right">$'+f.totalRevenue.toFixed(2)+'</td><td style="text-align:center">'+j.paymentStatus+'</td><td style="text-align:right;font-weight:bold">$'+(f.totalRevenue*rep.commissionRate).toFixed(2)+'</td></tr>';}).join('');
    const total=repJobs.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue*rep.commissionRate,0);
    triggerPrint('Commission Statement - '+rep.name, '<div class="hdr"><div><div class="co">COMMISSION STATEMENT</div><div>Midwest Educational Furnishings</div></div><div style="text-align:right"><div>Period: Q1 2026</div><div>Rep: '+rep.name+'</div><div>Rate: '+(rep.commissionRate*100).toFixed(1)+'%</div></div></div><table><thead><tr><th>Job</th><th>Customer</th><th style="text-align:right">Revenue</th><th style="text-align:center">Status</th><th style="text-align:right">Commission</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr class="total-row"><td colspan="4" style="text-align:right;padding:10px 8px">TOTAL COMMISSION</td><td style="text-align:right;padding:10px 8px">$'+total.toFixed(2)+'</td></tr></tfoot></table>');
  };

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Commission Engine" sub="Editable reps, customizable rates — auto-calculated on every job" action={<Btn onClick={()=>setAddingRep(true)}><I n="plus" s={14}/> Add Sales Rep</Btn>}/>

    {addingRep&&<Card style={{marginBottom:20,border:"1px solid #05966930"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#059669"}}>Add New Sales Rep</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>{[["name","Name"],["email","Email"],["territory","Territory"],["tier","Tier"]].map(([k,l])=><div key={k}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>{l}</label>{k==="tier"?<select value={newRepForm[k]} onChange={e=>setNewRepForm({...newRepForm,[k]:e.target.value})} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select>:<input value={newRepForm[k]} onChange={e=>setNewRepForm({...newRepForm,[k]:e.target.value})} style={inputStyle}/>}</div>)}<div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Commission Rate (%)</label><input type="number" step="0.5" value={(newRepForm.commissionRate*100)} onChange={e=>setNewRepForm({...newRepForm,commissionRate:parseFloat(e.target.value)/100||0})} style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={handleAddRep}>Add Rep</Btn><Btn v="secondary" onClick={()=>setAddingRep(false)}>Cancel</Btn></div></Card>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>{reps.map(rep=>{const rj=jobs.filter(j=>j.salesRep===rep.id);const totalRev=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const paidRev=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);const isEd=editingRep===rep.id;

      return <Card key={rep.id} style={{border:isEd?"1px solid #c8a25c44":undefined}}>
        {isEd?<div><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#c8a25c"}}>Edit Sales Rep</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>Name</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>Email</label><input value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>Territory</label><input value={editForm.territory} onChange={e=>setEditForm({...editForm,territory:e.target.value})} style={inputStyle}/></div><div><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>Commission Rate (%)</label><input type="number" step="0.5" value={(editForm.commissionRate*100).toFixed(1)} onChange={e=>setEditForm({...editForm,commissionRate:parseFloat(e.target.value)/100||0})} style={inputStyle}/></div><div><label style={{fontSize:10,color:"#6b7280",display:"block",marginBottom:3}}>Tier</label><select value={editForm.tier} onChange={e=>setEditForm({...editForm,tier:e.target.value})} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select></div></div><div style={{display:"flex",gap:8}}><Btn onClick={saveEdit}>Save</Btn><Btn v="secondary" onClick={()=>setEditingRep(null)}>Cancel</Btn><Btn v="danger" onClick={()=>{deleteRep(rep.id);setEditingRep(null);notify("Sales rep removed")}}>Delete</Btn></div></div>

        :<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:15,fontWeight:700,color:"#f5f5f4"}}>{rep.name}</div><div style={{fontSize:12,color:"#6b7280"}}>{rep.territory} · {rep.tier}</div></div><div style={{display:"flex",gap:6}}><Badge label={`${(rep.commissionRate*100).toFixed(1)}%`} color="#c8a25c"/><button onClick={()=>startEdit(rep)} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",padding:2}}><I n="edit" s={14}/></button></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><div style={{fontSize:11,color:"#6b7280"}}>Earned (Paid)</div><div style={{fontSize:18,fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{fmt(paidRev*rep.commissionRate)}</div></div><div><div style={{fontSize:11,color:"#6b7280"}}>Projected (All)</div><div style={{fontSize:18,fontWeight:700,color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>{fmt(totalRev*rep.commissionRate)}</div></div></div>
        <div style={{marginTop:12}}><Bar value={paidRev} max={totalRev||1} color="#059669" height={4}/><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:11,color:"#6b7280"}}>{rj.length} jobs · {fmt(totalRev)} revenue</span><Btn v="ghost" style={{fontSize:10,padding:"3px 8px"}} onClick={()=>{setSelectedRep(rep.id===selectedRep?null:rep.id)}}>Statement</Btn></div></div>
        {selectedRep===rep.id&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1e2130"}}><Btn onClick={()=>exportCommStatement(rep)}><I n="download" s={14}/> Export Commission PDF</Btn></div>}
        </>}
      </Card>})}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// SALES PORTAL
// ═══════════════════════════════════════════════════════════════
function SalesPortalPage({jobs,reps,customers,getJobFinancials}){
  const [activeRep,setActiveRep]=useState(reps[0]?.id||"");
  const rep=reps.find(r=>r.id===activeRep);
  if(!rep) return <div style={{color:"#6b7280"}}>No sales reps configured. Add reps in the Commissions page.</div>;
  const rj=jobs.filter(j=>j.salesRep===activeRep);
  const totalRev=rj.reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);
  const paidRev=rj.filter(j=>j.paymentStatus==="paid").reduce((s,j)=>s+getJobFinancials(j.id).totalRevenue,0);

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Sales Portal" sub="Per-rep filtered dashboard — pipeline visibility and commission tracking"/>
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{reps.map(r=><button key={r.id} onClick={()=>setActiveRep(r.id)} style={{padding:"8px 16px",borderRadius:8,cursor:"pointer",background:activeRep===r.id?"linear-gradient(135deg,#c8a25c,#b8923c)":"#12141b",color:activeRep===r.id?"#0a0c10":"#9ca3af",fontSize:13,fontWeight:activeRep===r.id?600:400,fontFamily:"inherit",border:activeRep===r.id?"none":"1px solid #1e2130"}}>{r.name}</button>)}</div>
    <Card style={{marginBottom:20,background:"linear-gradient(135deg,#12141b,#1a1d27)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:20,fontWeight:800,color:"#f5f5f4"}}>{rep.name}</div><div style={{fontSize:13,color:"#6b7280"}}>{rep.territory} · {rep.tier} · {pct(rep.commissionRate*100)} commission rate</div></div><div style={{display:"flex",gap:24}}><div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280"}}>Active Deals</div><div style={{fontSize:24,fontWeight:700,color:"#f5f5f4",fontFamily:"'DM Mono',monospace"}}>{rj.length}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280"}}>Pipeline</div><div style={{fontSize:24,fontWeight:700,color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>{fmt(totalRev)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#6b7280"}}>Earned</div><div style={{fontSize:24,fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{fmt(paidRev*rep.commissionRate)}</div></div></div></div></Card>
    <Tbl columns={[
      {header:"Job",render:r=><span style={{fontWeight:600,color:"#f5f5f4"}}>{r.name}</span>},
      {header:"Customer",render:r=>customers.find(c=>c.id===r.customer)?.name},
      {header:"Phase",render:r=><Badge label={r.phase} color={statusColor(r.phase)}/>},
      {header:"Revenue",render:r=><span style={{fontFamily:"'DM Mono',monospace"}}>{fmt(getJobFinancials(r.id).totalRevenue)}</span>},
      {header:"Payment",render:r=><Badge label={r.paymentStatus} color={statusColor(r.paymentStatus)}/>},
      {header:"Commission",render:r=><span style={{fontFamily:"'DM Mono',monospace",color:r.paymentStatus==="paid"?"#059669":"#c8a25c"}}>{fmt(getJobFinancials(r.id).totalRevenue*rep.commissionRate)}{r.paymentStatus!=="paid"&&<span style={{fontSize:10,color:"#6b7280"}}> (est)</span>}</span>},
    ]} data={rj}/>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// MIDWEST BRAIN
// ═══════════════════════════════════════════════════════════════
function BrainPage({jobs,reps,lineItems,vendors,customers,getJobFinancials,brainQuery,setBrainQuery,brainLoading,setBrainLoading}){
  const [history,setHistory]=useState([{role:"system",content:"Welcome to the Midwest Brain. I query your live database — real vendors, real jobs, real numbers. Ask me anything."}]);
  
  const buildAnswer = (q) => {
    const ql = q.toLowerCase();
    
    // ─── VENDOR QUERIES ────────────────────────────────────
    const matchedVendor = vendors.find(v => ql.includes(v.name.toLowerCase().split(' ')[0].toLowerCase()));
    if (matchedVendor || ql.includes("vendor")) {
      if (matchedVendor) {
        const vendorItems = lineItems.filter(li => li.vendor === matchedVendor.id);
        const totalSpend = vendorItems.reduce((s, i) => s + i.unitCost * i.qtyOrdered, 0);
        const jobIds = [...new Set(vendorItems.map(i => i.jobId))];
        const avgCost = vendorItems.length ? totalSpend / vendorItems.reduce((s, i) => s + i.qtyOrdered, 0) : 0;
        return `**${matchedVendor.name}**\n\nContact: ${matchedVendor.contact}\nEmail: ${matchedVendor.email}\nPhone: ${matchedVendor.phone}\nCategory: ${matchedVendor.category}\nAddress: ${matchedVendor.address || 'Not set'}\n\n**History from your data:**\n• Total spend: ${fmt(totalSpend)}\n• ${vendorItems.length} line items across ${jobIds.length} jobs\n• Average unit cost: ${fmt(avgCost)}\n• Jobs: ${jobIds.map(id => jobs.find(j => j.id === id)?.name || id).join(', ')}`;
      }
      return `**All Vendors (${vendors.length}):**\n\n${vendors.map(v => { const spend = lineItems.filter(li => li.vendor === v.id).reduce((s, i) => s + i.unitCost * i.qtyOrdered, 0); return `• **${v.name}** (${v.category}) — ${fmt(spend)} total spend — ${v.contact}`; }).join('\n')}`;
    }
    
    // ─── CUSTOMER QUERIES ──────────────────────────────────
    const matchedCust = customers.find(c => ql.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
    if (matchedCust || ql.includes("customer") || ql.includes("school") || ql.includes("district")) {
      if (matchedCust) {
        const custJobs = jobs.filter(j => j.customer === matchedCust.id);
        const totalRev = custJobs.reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0);
        const avgMargin = custJobs.length ? custJobs.reduce((s, j) => s + getJobFinancials(j.id).margin, 0) / custJobs.length : 0;
        return `**${matchedCust.name}** (${matchedCust.type})\n\nContact: ${matchedCust.contact}\nEmail: ${matchedCust.email}\nPhone: ${matchedCust.phone}\nAddress: ${matchedCust.address || 'Not set'}\n\n**History:**\n• ${custJobs.length} jobs — ${fmt(totalRev)} total revenue\n• Average margin: ${pct(avgMargin)}\n• Jobs: ${custJobs.map(j => `${j.name} (${j.phase})`).join(', ')}`;
      }
      return `**All Customers (${customers.length}):**\n\n${customers.map(c => { const rev = jobs.filter(j => j.customer === c.id).reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0); return `• **${c.name}** (${c.type}) — ${fmt(rev)} revenue — ${c.contact}`; }).join('\n')}`;
    }
    
    // ─── COMMISSION QUERIES ────────────────────────────────
    if (ql.includes("commission") || ql.includes("sales rep") || ql.includes("rep")) {
      return `**Commission Structure (Live Data):**\n\n${reps.map(rep => { const rv = jobs.filter(j => j.salesRep === rep.id).reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0); const paidRv = jobs.filter(j => j.salesRep === rep.id && j.paymentStatus === 'paid').reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0); return `• **${rep.name}** (${rep.tier}) — ${(rep.commissionRate * 100).toFixed(1)}% rate\n  Pipeline: ${fmt(rv)} — Earned: ${fmt(paidRv * rep.commissionRate)} — Projected: ${fmt(rv * rep.commissionRate)}`; }).join('\n\n')}\n\n**Total pipeline:** ${fmt(jobs.reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0))}`;
    }
    
    // ─── JOB QUERIES ───────────────────────────────────────
    if (ql.includes("job") || ql.includes("status") || ql.includes("active") || ql.includes("project")) {
      const byPhase = {};
      jobs.forEach(j => { byPhase[j.phase] = (byPhase[j.phase] || 0) + 1; });
      return `**Jobs (${jobs.length} total):**\n\n${Object.entries(byPhase).map(([phase, count]) => `• ${phase}: ${count}`).join('\n')}\n\n${jobs.map(j => { const f = getJobFinancials(j.id); return `• **${j.name}** (${j.id})\n  ${j.phase} — ${fmt(f.totalRevenue)} — ${fmtN(f.totalReceived)}/${fmtN(f.totalOrdered)} delivered — ${j.paymentStatus}`; }).join('\n\n')}`;
    }
    
    // ─── MARGIN QUERIES ────────────────────────────────────
    if (ql.includes("margin") || ql.includes("profit") || ql.includes("profitab")) {
      const margins = jobs.map(j => ({ name: j.name, ...getJobFinancials(j.id) }));
      const avgMargin = margins.reduce((s, m) => s + m.margin, 0) / margins.length;
      const best = margins.sort((a, b) => b.margin - a.margin)[0];
      const worst = margins.sort((a, b) => a.margin - b.margin)[0];
      return `**Margin Analysis (Live Data):**\n\n• Average margin across all jobs: **${pct(avgMargin)}**\n• Best margin: **${best?.name}** at ${pct(best?.margin || 0)}\n• Lowest margin: **${worst?.name}** at ${pct(worst?.margin || 0)}\n• Total profit: ${fmt(margins.reduce((s, m) => s + m.totalRevenue - m.totalCost, 0))}\n\n${margins.sort((a, b) => b.margin - a.margin).map(m => `• ${m.name}: ${pct(m.margin)} margin — ${fmt(m.totalRevenue)} revenue`).join('\n')}`;
    }
    
    // ─── DELIVERY QUERIES ──────────────────────────────────
    if (ql.includes("delivery") || ql.includes("partial") || ql.includes("shipment") || ql.includes("outstanding")) {
      const pending = lineItems.filter(i => i.qtyReceived < i.qtyOrdered);
      const totalOrd = lineItems.reduce((s, i) => s + i.qtyOrdered, 0);
      const totalRcv = lineItems.reduce((s, i) => s + i.qtyReceived, 0);
      return `**Delivery Status (Live Data):**\n\n• Overall: ${fmtN(totalRcv)} / ${fmtN(totalOrd)} units received (${pct(totalOrd ? totalRcv / totalOrd * 100 : 0)})\n• ${pending.length} line items still pending\n\n**Outstanding items:**\n${pending.map(i => { const job = jobs.find(j => j.id === i.jobId); const vendor = vendors.find(v => v.id === i.vendor); return `• ${i.description} — ${fmtN(i.qtyOrdered - i.qtyReceived)} outstanding — ${vendor?.name || 'Unknown'} — ${job?.name || 'Unknown job'}`; }).join('\n')}`;
    }
    
    // ─── INVOICE QUERIES ───────────────────────────────────
    if (ql.includes("invoice") || ql.includes("billing") || ql.includes("receivable")) {
      const uninvoiced = lineItems.filter(i => i.qtyReceived > i.qtyInvoiced);
      const uninvTotal = uninvoiced.reduce((s, i) => s + i.unitPrice * (i.qtyReceived - i.qtyInvoiced), 0);
      return `**Invoice Status (Live Data):**\n\n• ${uninvoiced.length} line items received but not yet invoiced\n• Uninvoiced value: **${fmt(uninvTotal)}**\n\n**Ready to invoice:**\n${uninvoiced.map(i => { const job = jobs.find(j => j.id === i.jobId); return `• ${i.description} — ${fmtN(i.qtyReceived - i.qtyInvoiced)} units × ${fmt(i.unitPrice)} = ${fmt(i.unitPrice * (i.qtyReceived - i.qtyInvoiced))} — ${job?.name || ''}`; }).join('\n')}`;
    }
    
    // ─── REVENUE / FINANCIAL QUERIES ───────────────────────
    if (ql.includes("revenue") || ql.includes("financial") || ql.includes("money") || ql.includes("total")) {
      const totalRev = jobs.reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0);
      const totalCost = jobs.reduce((s, j) => s + getJobFinancials(j.id).totalCost, 0);
      const byRep = reps.map(r => ({ name: r.name, rev: jobs.filter(j => j.salesRep === r.id).reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0) }));
      return `**Financial Overview (Live Data):**\n\n• Total pipeline revenue: **${fmt(totalRev)}**\n• Total cost: ${fmt(totalCost)}\n• Total profit: **${fmt(totalRev - totalCost)}**\n• Average margin: ${pct(jobs.reduce((s, j) => s + getJobFinancials(j.id).margin, 0) / jobs.length)}\n\n**Revenue by Rep:**\n${byRep.map(r => `• ${r.name}: ${fmt(r.rev)}`).join('\n')}\n\n**By Payment Status:**\n• Paid: ${fmt(jobs.filter(j => j.paymentStatus === 'paid').reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0))}\n• Partial: ${fmt(jobs.filter(j => j.paymentStatus === 'partial').reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0))}\n• Unpaid: ${fmt(jobs.filter(j => j.paymentStatus === 'unpaid').reduce((s, j) => s + getJobFinancials(j.id).totalRevenue, 0))}`;
    }
    
    // ─── DEFAULT ───────────────────────────────────────────
    return `I have access to your full database with **${jobs.length} jobs**, **${vendors.length} vendors**, **${customers.length} customers**, **${reps.length} reps**, and **${lineItems.length} line items**.\n\nTry asking:\n• "Show me all vendors" or "Tell me about Virco"\n• "What are our margins?"\n• "Commission breakdown"\n• "What's outstanding for delivery?"\n• "Revenue overview"\n• "Uninvoiced items"\n• "Tell me about Lincoln" (any customer name)\n• "Active job status"`;
  };

  const handleQuery = () => {
    if (!brainQuery.trim()) return;
    const q = brainQuery.trim();
    setBrainQuery("");
    setHistory(p => [...p, { role: "user", content: q }]);
    setBrainLoading(true);
    
    // Try AI API (Claude or OpenAI)
    const claudeKey = localStorage.getItem('mw_claude_key');
    const openaiKey = localStorage.getItem('mw_openai_key');
    const apiKey = claudeKey || openaiKey;
    const provider = claudeKey ? 'claude' : openaiKey ? 'openai' : null;
    
    if (apiKey && provider) {
      const snap = `VENDORS(${vendors.length}):${vendors.map(v=>v.name+'('+v.category+') '+v.contact+' '+v.email+' '+v.phone).join('; ')}. CUSTOMERS(${customers.length}):${customers.map(c=>c.name+'('+c.type+') '+c.contact).join('; ')}. REPS(${reps.length}):${reps.map(r=>r.name+' '+r.territory+' '+(r.commissionRate*100).toFixed(1)+'% '+r.tier).join('; ')}. JOBS(${jobs.length}):${jobs.map(j=>{const f=getJobFinancials(j.id);return j.name+' '+j.phase+' $'+f.totalRevenue.toFixed(0)+' margin:'+f.margin.toFixed(1)+'% '+f.totalReceived+'/'+f.totalOrdered+'delivered '+j.paymentStatus+' start:'+j.startDate+' due:'+j.dueDate}).join('; ')}. PENDING_DELIVERY:${lineItems.filter(i=>i.qtyReceived<i.qtyOrdered).length} READY_TO_INVOICE:${lineItems.filter(i=>i.qtyReceived>i.qtyInvoiced).length}`;
      const sysMsg = 'You are the Midwest Brain for Midwest Educational Furnishings, a 14yr educational furniture company in Indiana. Answer from the live data below. Use **bold** headers and bullet points. Be concise and specific with real numbers.\n\nDATA:\n'+snap;
      
      const callAI = provider === 'claude'
        ? fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1024,system:sysMsg,messages:[{role:'user',content:q}]})}).then(r=>r.json()).then(d=>d.content?.[0]?.text||'No response')
        : fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},body:JSON.stringify({model:'gpt-4o',max_tokens:1024,messages:[{role:'system',content:sysMsg},{role:'user',content:q}]})}).then(r=>r.json()).then(d=>d.choices?.[0]?.message?.content||'No response');
      
      callAI.then(answer=>{setHistory(p=>[...p,{role:"assistant",content:answer}]);setBrainLoading(false);})
      .catch(()=>{const answer=buildAnswer(q);setHistory(p=>[...p,{role:"assistant",content:answer}]);setBrainLoading(false);});
    } else {
      setTimeout(()=>{const answer=buildAnswer(q);setHistory(p=>[...p,{role:"assistant",content:answer}]);setBrainLoading(false);},400);
    }
  };
  // AI API key management
  const [showApiKey,setShowApiKey]=useState(false);
  const [claudeKeyInput,setClaudeKeyInput]=useState(()=>localStorage.getItem('mw_claude_key')||'');
  const [openaiKeyInput,setOpenaiKeyInput]=useState(()=>localStorage.getItem('mw_openai_key')||'');
  const saveKeys=()=>{if(claudeKeyInput)localStorage.setItem('mw_claude_key',claudeKeyInput);else localStorage.removeItem('mw_claude_key');if(openaiKeyInput)localStorage.setItem('mw_openai_key',openaiKeyInput);else localStorage.removeItem('mw_openai_key');notify(claudeKeyInput||openaiKeyInput?'AI key saved — Brain is now powered by '+(claudeKeyInput?'Claude':'ChatGPT'):'Keys cleared — using local mode');setShowApiKey(false)};
  const activeProvider = localStorage.getItem('mw_claude_key') ? 'Claude API' : localStorage.getItem('mw_openai_key') ? 'ChatGPT API' : 'Local mode';
  return <div style={{animation:"fadeUp 0.4s",display:"flex",flexDirection:"column",height:"calc(100vh - 48px)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}><div><h2 style={{fontSize:22,fontWeight:700,color:"#f5f5f4",marginBottom:4,letterSpacing:-0.5}}>Midwest Brain</h2><p style={{fontSize:13,color:"#6b7280"}}>{activeProvider}{' · '}14 years of institutional knowledge</p></div><Btn v="secondary" onClick={()=>setShowApiKey(!showApiKey)} style={{fontSize:11}}><I n="settings" s={14}/> {showApiKey?'Hide':'AI Setup'}</Btn></div>
    {showApiKey&&<Card style={{marginBottom:12,border:"1px solid #c8a25c30"}}><div style={{fontSize:13,fontWeight:600,color:"#c8a25c",marginBottom:8}}>AI API Keys (Claude or ChatGPT — only one needed)</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:8}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Claude API Key (Anthropic)</label><input type="password" value={claudeKeyInput} onChange={e=>setClaudeKeyInput(e.target.value)} placeholder="sk-ant-..." style={inputStyle}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>OpenAI API Key (ChatGPT)</label><input type="password" value={openaiKeyInput} onChange={e=>setOpenaiKeyInput(e.target.value)} placeholder="sk-..." style={inputStyle}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={saveKeys}>Save</Btn><Btn v="secondary" onClick={()=>{setClaudeKeyInput('');setOpenaiKeyInput('');localStorage.removeItem('mw_claude_key');localStorage.removeItem('mw_openai_key');notify('Keys cleared')}}>Clear All</Btn></div><div style={{fontSize:11,color:"#4b5563",marginTop:6}}>Claude: console.anthropic.com · OpenAI: platform.openai.com/api-keys · Keys stay in your browser only. If both are set, Claude takes priority.</div></Card>}
    <Card style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:0}}>
      <div style={{flex:1,overflow:"auto",padding:20}}>{history.map((msg,i)=><div key={i} style={{marginBottom:16,maxWidth:"80%",marginLeft:msg.role==="user"?"auto":0}}><div style={{padding:"12px 16px",borderRadius:12,background:msg.role==="user"?"#c8a25c":msg.role==="system"?"#1e213044":"#1a1d27",color:msg.role==="user"?"#0a0c10":"#d1d5db",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{msg.content.split("**").map((part,pi)=>pi%2===1?<strong key={pi} style={{color:msg.role==="user"?"#0a0c10":"#f5f5f4"}}>{part}</strong>:part)}</div><div style={{fontSize:10,color:"#4b5563",marginTop:4,textAlign:msg.role==="user"?"right":"left"}}>{msg.role==="user"?"You":"Midwest Brain"}</div></div>)}{brainLoading&&<div style={{padding:"12px 16px",background:"#1a1d27",borderRadius:12,maxWidth:"80%",fontSize:13,color:"#6b7280"}}><span style={{animation:"pulse 1.5s infinite"}}>Searching operational data...</span></div>}</div>
      <div style={{padding:16,borderTop:"1px solid #1e2130",display:"flex",gap:8}}><input value={brainQuery} onChange={e=>setBrainQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleQuery()} placeholder="Ask anything — vendors, pricing, job status, commissions..." style={{flex:1,padding:"10px 16px",background:"#1a1d27",border:"1px solid #2a2d37",borderRadius:8,color:"#e8e6e3",fontSize:13,outline:"none",fontFamily:"inherit"}}/><Btn onClick={handleQuery} style={{padding:"10px 20px"}}><I n="send" s={14}/> Ask</Btn></div>
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// DIRECTORY — Vendors, Customers, Sales Reps (full CRUD + sort)
// ═══════════════════════════════════════════════════════════════
function DirectoryPage({vendors,customers,reps,updateVendor,addVendor,deleteVendor,updateCustomer,addCustomer,deleteCustomer,updateRep,addRep,deleteRep,notify}){
  const [tab,setTab]=useState("vendors");
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({});
  const [adding,setAdding]=useState(false);
  const [sort,setSort]=useState("name");
  const [dirSearch,setDirSearch]=useState("");

  const startEdit=(item)=>{setEditId(item.id);setForm({...item});setAdding(false)};
  const startAdd=()=>{setAdding(true);setEditId(null);
    if(tab==="vendors") setForm({name:"",contact:"",email:"",phone:"",category:"",address:""});
    if(tab==="customers") setForm({name:"",contact:"",email:"",phone:"",type:"K-12 District",address:""});
    if(tab==="reps") setForm({name:"",email:"",territory:"",commissionRate:0.05,tier:"Associate"});
  };
  const save=()=>{
    if(!form.name){notify("Name is required","error");return}
    if(adding){
      if(tab==="vendors") addVendor(form);
      if(tab==="customers") addCustomer(form);
      if(tab==="reps") addRep({...form,commissionRate:parseFloat(form.commissionRate)||0.05});
      notify((tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Sales rep")+" added");
    } else {
      if(tab==="vendors") updateVendor(editId,form);
      if(tab==="customers") updateCustomer(editId,form);
      if(tab==="reps") updateRep(editId,{...form,commissionRate:parseFloat(form.commissionRate)||0});
      notify("Updated — changes propagated");
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
  // render helper (NOT a React component — prevents remount/focus loss on each keystroke)
  const field = (k, l, type) => <div key={k}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>{l}</label>{type==="select-tier"?<select value={form[k]||""} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))} style={inputStyle}>{["Associate","Mid-Level","Senior"].map(t=><option key={t}>{t}</option>)}</select>:<input type={type||"text"} value={form[k]==null?"":form[k]} onChange={e=>setForm(prev=>({...prev,[k]:e.target.value}))} style={inputStyle}/>}</div>;

  const sortedVendors=[...vendors].filter(v=>{const s=dirSearch.toLowerCase();return !s||v.name.toLowerCase().includes(s)||v.contact.toLowerCase().includes(s)||v.category.toLowerCase().includes(s)||v.email.toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()));
  const sortedCustomers=[...customers].filter(c=>{const s=dirSearch.toLowerCase();return !s||c.name.toLowerCase().includes(s)||c.contact.toLowerCase().includes(s)||c.type.toLowerCase().includes(s)||c.email.toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()));
  const sortedReps=[...reps].filter(r=>{const s=dirSearch.toLowerCase();return !s||r.name.toLowerCase().includes(s)||r.territory.toLowerCase().includes(s)||r.tier.toLowerCase().includes(s)||r.email.toLowerCase().includes(s)}).sort((a,b)=>(a[sort]||"").toString().localeCompare((b[sort]||"").toString()));

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Directory" sub="Manage all vendors, customers, and sales reps — edit, add, sort" action={<Btn onClick={startAdd}><I n="plus" s={14}/> Add {tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Sales Rep"}</Btn>}/>
    <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:"#12141b",padding:4,borderRadius:10}}>{[["vendors","Vendors ("+vendors.length+")"],["customers","Customers ("+customers.length+")"],["reps","Sales Reps ("+reps.length+")"]].map(([id,label])=><button key={id} onClick={()=>{setTab(id);setEditId(null);setAdding(false);setSort("name");setDirSearch("")}} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===id?"#c8a25c":"transparent",color:tab===id?"#0a0c10":"#6b7280",fontSize:13,fontWeight:tab===id?600:400,fontFamily:"inherit"}}>{label}</button>)}</div>
      <input value={dirSearch} onChange={e=>setDirSearch(e.target.value)} placeholder={"Search "+tab+"..."} style={{...inputStyle,maxWidth:260,background:"#12141b",border:"1px solid #1e2130",padding:"8px 14px"}}/>
    </div>

    {(adding||editId)&&<Card style={{marginBottom:16,border:"1px solid #c8a25c30"}}><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#c8a25c"}}>{adding?"Add New":"Edit"} {tab==="vendors"?"Vendor":tab==="customers"?"Customer":"Sales Rep"}</div>
      {tab==="vendors"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>{field("name","Company Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("category","Category")}{field("address","Address")}</div>}
      {tab==="customers"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>{field("name","Organization Name")}{field("contact","Contact Person")}{field("email","Email")}{field("phone","Phone")}{field("type","Type")}{field("address","Address")}</div>}
      {tab==="reps"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>{field("name","Name")}{field("email","Email")}{field("territory","Territory")}{field("tier","Tier","select-tier")}<div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Commission Rate (%)</label><input type="number" step="0.5" value={((form.commissionRate||0)*100).toFixed(1)} onChange={e=>setForm(prev=>({...prev,commissionRate:parseFloat(e.target.value)/100||0}))} style={inputStyle}/></div></div>}
      <div style={{display:"flex",gap:8}}><Btn onClick={save}>{adding?"Add":"Save Changes"}</Btn><Btn v="secondary" onClick={cancel}>Cancel</Btn>{editId&&<Btn v="danger" onClick={()=>del(editId)}>Delete</Btn>}</div>
    </Card>}

    {tab==="vendors"&&<><div style={{marginBottom:8,display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:"#6b7280"}}>Sort by:</span>{["name","category","contact"].map(s=><button key={s} onClick={()=>setSort(s)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sort===s?"#c8a25c22":"transparent",color:sort===s?"#c8a25c":"#6b7280",fontFamily:"inherit"}}>{s}</button>)}</div>
      <Tbl columns={[{header:"Name",render:r=><span style={{fontWeight:600,color:"#f5f5f4"}}>{r.name}</span>},{header:"Contact",render:r=>r.contact},{header:"Email",render:r=><span style={{color:"#c8a25c"}}>{r.email}</span>},{header:"Phone",render:r=>r.phone},{header:"Category",render:r=>r.category},{header:"Address",render:r=><span style={{fontSize:12,color:"#9ca3af"}}>{r.address||"—"}</span>},{header:"",render:r=><Btn v="ghost" style={{fontSize:10,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>Edit</Btn>}]} data={sortedVendors}/></>}

    {tab==="customers"&&<><div style={{marginBottom:8,display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:"#6b7280"}}>Sort by:</span>{["name","type","contact"].map(s=><button key={s} onClick={()=>setSort(s)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sort===s?"#c8a25c22":"transparent",color:sort===s?"#c8a25c":"#6b7280",fontFamily:"inherit"}}>{s}</button>)}</div>
      <Tbl columns={[{header:"Name",render:r=><span style={{fontWeight:600,color:"#f5f5f4"}}>{r.name}</span>},{header:"Contact",render:r=>r.contact},{header:"Email",render:r=><span style={{color:"#c8a25c"}}>{r.email}</span>},{header:"Phone",render:r=>r.phone},{header:"Type",render:r=> <Badge label={r.type} color="#2563eb"/>},{header:"Address",render:r=><span style={{fontSize:12,color:"#9ca3af"}}>{r.address||"—"}</span>},{header:"",render:r=><Btn v="ghost" style={{fontSize:10,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>Edit</Btn>}]} data={sortedCustomers}/></>}

    {tab==="reps"&&<><div style={{marginBottom:8,display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:"#6b7280"}}>Sort by:</span>{["name","territory","tier"].map(s=><button key={s} onClick={()=>setSort(s)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",background:sort===s?"#c8a25c22":"transparent",color:sort===s?"#c8a25c":"#6b7280",fontFamily:"inherit"}}>{s}</button>)}</div>
      <Tbl columns={[{header:"Name",render:r=><span style={{fontWeight:600,color:"#f5f5f4"}}>{r.name}</span>},{header:"Email",render:r=><span style={{color:"#c8a25c"}}>{r.email}</span>},{header:"Territory",render:r=>r.territory},{header:"Tier",render:r=> <Badge label={r.tier} color="#8b5cf6"/>},{header:"Rate",render:r=><span style={{fontFamily:"'DM Mono',monospace",color:"#c8a25c"}}>{(r.commissionRate*100).toFixed(1)}%</span>},{header:"",render:r=><Btn v="ghost" style={{fontSize:10,padding:"3px 8px"}} onClick={e=>{e.stopPropagation();startEdit(r)}}>Edit</Btn>}]} data={sortedReps}/></>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// EXIT READINESS
// ═══════════════════════════════════════════════════════════════
function ExitReadinessPage({jobs,vendors,customers,lineItems}){
  const criteria=[{category:"Operational Documentation",items:[{name:"Job Record Hub",status:true,note:`${jobs.length} jobs in system`},{name:"Vendor database",status:true,note:`${vendors.length} vendors`},{name:"Customer database",status:true,note:`${customers.length} customers`},{name:"Pricing templates",status:true,note:"30-35% district margin"},{name:"Naming conventions",status:true,note:"JOB-YYYY-NNN format"}]},{category:"Automated Workflows",items:[{name:"Quote → PO generation",status:true,note:"One-click"},{name:"Quote → Invoice generation",status:true,note:"Partial support"},{name:"Partial shipment tracking",status:true,note:"Quantity-specific"},{name:"Commission auto-calculation",status:true,note:"Real-time"},{name:"QuickBooks integration",status:"partial",note:"Setup guide ready"}]},{category:"Reporting & Visibility",items:[{name:"Real-time dashboard",status:true,note:"Command Center"},{name:"Financial reporting",status:true,note:"Per-job + aggregate"},{name:"Commission statements",status:true,note:"PDF export"},{name:"Sales portal",status:true,note:"Per-rep filtered"},{name:"Vendor performance",status:"partial",note:"Distribution tracked"}]},{category:"Knowledge Transfer",items:[{name:"Midwest Brain AI",status:true,note:"Queryable"},{name:"Operational playbooks",status:"partial",note:"In progress"},{name:"Workflow diagrams",status:true,note:"Before/after"},{name:"System architecture",status:true,note:"Full stack"},{name:"KPI reporting",status:true,note:"Margins, delivery, commission"}]}];
  const all=criteria.flatMap(c=>c.items);const done=all.filter(i=>i.status===true).length;const partial=all.filter(i=>i.status==="partial").length;const score=(done+partial*0.5)/all.length*100;

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="Exit Readiness Score" sub="Buyer due diligence — systemized, transferable, auditable"/>
    <Card style={{marginBottom:24,background:"linear-gradient(135deg,#12141b,#1a1d27)",border:"1px solid #c8a25c30"}}><div style={{display:"flex",alignItems:"center",gap:32}}><div style={{width:120,height:120,borderRadius:"50%",border:"4px solid #c8a25c",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:32,fontWeight:800,color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>{Math.round(score)}</div><div style={{fontSize:11,color:"#6b7280"}}>/ 100</div></div><div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:"#f5f5f4",marginBottom:4}}>Exit Readiness Assessment</div><div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>{done} complete · {partial} in progress</div><Bar value={score} max={100} color="#c8a25c" height={8}/><div style={{marginTop:8,fontSize:12,color:"#c8a25c"}}>{score>=90?"Excellent — buyer-ready":score>=70?"Strong — minor items remaining":"In Progress"}</div></div><div style={{textAlign:"center",padding:"0 24px"}}><div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Valuation Impact</div><div style={{fontSize:13,fontWeight:600,color:"#059669"}}>+1.5-2x multiple uplift</div></div></div></Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{criteria.map((s,si)=><Card key={si}><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:14}}>{s.category}</div>{s.items.map((item,ii)=><div key={ii} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:ii<s.items.length-1?"1px solid #1e213044":"none"}}><div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:item.status===true?"#059669":item.status==="partial"?"#d97706":"#2a2d37",display:"flex",alignItems:"center",justifyContent:"center"}}>{item.status===true&&<I n="check" s={12}/>}{item.status==="partial"&&<span style={{fontSize:10,fontWeight:700,color:"#fff"}}>~</span>}</div><div style={{flex:1}}><div style={{fontSize:13,color:item.status?"#e8e6e3":"#6b7280",fontWeight:500}}>{item.name}</div><div style={{fontSize:11,color:"#4b5563",marginTop:1}}>{item.note}</div></div></div>)}</Card>)}</div>
    <Card style={{marginTop:20,textAlign:"center",borderTop:"2px solid #c8a25c"}}><div style={{fontSize:11,color:"#6b7280",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Installed by</div><div style={{fontSize:20,fontWeight:800,color:"#c8a25c",letterSpacing:1,marginBottom:8}}>DYFRENT</div><div style={{fontSize:13,color:"#6b7280",fontStyle:"italic"}}>"We don't advise. We don't consult. We install."</div></Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// QUICKBOOKS SETUP — Integration Guide + OAuth Flow Docs
// ═══════════════════════════════════════════════════════════════
function QBSetupPage({notify,qbConfig,setQbConfig}){
  const [showSecret,setShowSecret]=useState(false);
  const [testing,setTesting]=useState(false);

  const testConnection = async () => {
    if(!qbConfig.accessToken||!qbConfig.realmId){notify("Enter Access Token and Realm ID first","error");return}
    setTesting(true);
    try {
      const resp = await fetch('/api/qb-proxy?path=' + encodeURIComponent('companyinfo/' + qbConfig.realmId + '?minorversion=73'), {
        headers: { "Authorization": "Bearer " + qbConfig.accessToken, "x-qb-realmid": qbConfig.realmId, "Accept": "application/json" }
      });
      if(resp.ok){
        const data = await resp.json();
        const name = data?.CompanyInfo?.CompanyName || "Connected";
        setQbConfig(p=>({...p,connected:true}));
        notify(`Connected to QuickBooks: ${name}`);
      } else {
        const data = await resp.json().catch(()=>({}));
        notify(`Connection failed (${resp.status}): ${data?.Fault?.Error?.[0]?.Message || data?.error || 'Check credentials'}`,"error");
      }
    } catch(e) {
      notify(`Network error: ${e.message}`,"error");
    }
    setTesting(false);
  };

  const updateField = (field, value) => setQbConfig(p=>({...p,[field]:value}));

  return <div style={{animation:"fadeUp 0.4s"}}><Header title="QuickBooks Integration" sub="Enter your API credentials to connect — invoices and POs push directly"/>

    {/* Connection Status */}
    <Card style={{marginBottom:20,border:qbConfig.connected?"1px solid #05966944":"1px solid #2563eb44"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:qbConfig.connected?"#059669":"#6b7280",boxShadow:qbConfig.connected?"0 0 8px #05966966":"none"}}/>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:qbConfig.connected?"#059669":"#93c5fd"}}>{qbConfig.connected?"Connected to QuickBooks Online":"Not Connected"}</div>
            <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{qbConfig.connected?"Push POs and Invoices from the Documents page":"Enter your credentials below to connect"}</div>
          </div>
        </div>
        {qbConfig.connected&&<Btn v="danger" onClick={()=>{setQbConfig(p=>({...p,connected:false,accessToken:"",refreshToken:""}));notify("Disconnected from QuickBooks")}}>Disconnect</Btn>}
      </div>
    </Card>

    {/* Credentials Form */}
    <Card style={{marginBottom:20}}>
      <div style={{fontSize:16,fontWeight:700,color:"#f5f5f4",marginBottom:16}}>API Credentials</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div>
          <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6,fontWeight:500}}>Client ID</label>
          <input value={qbConfig.clientId} onChange={e=>updateField("clientId",e.target.value)} placeholder="ABcDeFgHiJkLmNoPqRsTuVw..." style={inputStyle}/>
          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>From developer.intuit.com → My Apps → Keys & credentials</div>
        </div>
        <div>
          <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6,fontWeight:500}}>Client Secret</label>
          <div style={{display:"flex",gap:8}}>
            <input type={showSecret?"text":"password"} value={qbConfig.clientSecret} onChange={e=>updateField("clientSecret",e.target.value)} placeholder="aBcDeFgHiJkLm..." style={{...inputStyle,flex:1}}/>
            <Btn v="secondary" style={{padding:"8px 12px",fontSize:11}} onClick={()=>setShowSecret(!showSecret)}>{showSecret?"Hide":"Show"}</Btn>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
        <div>
          <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6,fontWeight:500}}>Realm ID (Company ID)</label>
          <input value={qbConfig.realmId} onChange={e=>updateField("realmId",e.target.value)} placeholder="1234567890" style={inputStyle}/>
          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>Found in the URL when logged into QBO</div>
        </div>
        <div>
          <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6,fontWeight:500}}>Access Token</label>
          <input type="password" value={qbConfig.accessToken} onChange={e=>updateField("accessToken",e.target.value)} placeholder="eyJhbGciOiJSUzI1NiIsInR5..." style={inputStyle}/>
          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>OAuth 2.0 bearer token (expires in 1hr)</div>
        </div>
        <div>
          <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6,fontWeight:500}}>Refresh Token</label>
          <input type="password" value={qbConfig.refreshToken} onChange={e=>updateField("refreshToken",e.target.value)} placeholder="AB11..." style={inputStyle}/>
          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>Used to get new access tokens (expires in 100 days)</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <Btn onClick={testConnection} style={testing?{opacity:0.6,pointerEvents:"none"}:{}}>{testing?"Testing Connection...":"Test Connection & Connect"}</Btn>
        <Btn v="secondary" onClick={()=>{setQbConfig({connected:false,clientId:"",clientSecret:"",realmId:"",accessToken:"",refreshToken:""});notify("Credentials cleared")}}>Clear All</Btn>
        {qbConfig.connected&&<span style={{fontSize:13,color:"#059669",fontWeight:600,marginLeft:8}}>Connected</span>}
      </div>
    </Card>

    {/* How to get tokens */}
    <Card style={{marginBottom:16}}><div style={{fontSize:16,fontWeight:700,color:"#f5f5f4",marginBottom:12}}>How to Get Your Credentials</div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div><div style={{fontSize:13,fontWeight:700,color:"#c8a25c",marginBottom:4}}>Step 1: Create a QuickBooks Developer App</div><div style={{fontSize:13,color:"#d1d5db",lineHeight:1.7}}>Go to <span style={{color:"#c8a25c",fontFamily:"'DM Mono',monospace"}}>developer.intuit.com</span> and sign up. Create a new app, choose "QuickBooks Online and Payments." Your Client ID and Client Secret are on the Keys & credentials page.</div></div>
        <div><div style={{fontSize:13,fontWeight:700,color:"#c8a25c",marginBottom:4}}>Step 2: Get Your Realm ID</div><div style={{fontSize:13,color:"#d1d5db",lineHeight:1.7}}>Log into QuickBooks Online. Look at the URL — it contains your Realm ID (Company ID) as a number like <span style={{fontFamily:"'DM Mono',monospace",color:"#c8a25c"}}>https://app.qbo.intuit.com/app/homepage?companyId=<strong>1234567890</strong></span></div></div>
        <div><div style={{fontSize:13,fontWeight:700,color:"#c8a25c",marginBottom:4}}>Step 3: Generate Access Token</div><div style={{fontSize:13,color:"#d1d5db",lineHeight:1.7}}>In the Intuit Developer portal, go to your app's <strong>OAuth 2.0 Playground</strong> (under "Test" section). Select scopes <span style={{fontFamily:"'DM Mono',monospace",color:"#c8a25c"}}>com.intuit.quickbooks.accounting</span>, authorize, and copy both the Access Token and Refresh Token.</div></div>
        <div><div style={{fontSize:13,fontWeight:700,color:"#c8a25c",marginBottom:4}}>Step 4: Paste & Connect</div><div style={{fontSize:13,color:"#d1d5db",lineHeight:1.7}}>Paste all credentials above and click "Test Connection." If successful, you can push POs and Invoices directly from the Documents page. Access tokens expire in 1 hour — refresh in the OAuth Playground when needed.</div></div>
      </div>
    </Card>

    {/* API Reference */}
    <Card><div style={{fontSize:14,fontWeight:700,color:"#f5f5f4",marginBottom:12}}>API Endpoints Used</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#d1d5db",background:"#0a0c10",padding:16,borderRadius:8,lineHeight:2}}>
      <div><span style={{color:"#059669"}}>POST</span> <span style={{color:"#c8a25c"}}>/v3/company/{"{realmId}"}/invoice</span> — Create invoice</div>
      <div><span style={{color:"#059669"}}>POST</span> <span style={{color:"#c8a25c"}}>/v3/company/{"{realmId}"}/purchaseorder</span> — Create PO</div>
      <div><span style={{color:"#2563eb"}}>GET</span>  <span style={{color:"#c8a25c"}}>/v3/company/{"{realmId}"}/companyinfo/{"{realmId}"}</span> — Test connection</div>
      <div><span style={{color:"#d97706"}}>POST</span> <span style={{color:"#c8a25c"}}>/oauth2/v1/tokens/bearer</span> — Token refresh</div>
    </div></Card>

    <Card style={{marginTop:16,borderLeft:"3px solid #c8a25c"}}><div style={{fontSize:13,color:"#d1d5db",lineHeight:1.7}}>
      <strong style={{color:"#c8a25c"}}>How it works:</strong> When you push a PO or Invoice from the Documents page, the system sends the document data to the QuickBooks API using your access token. QuickBooks creates the record and returns a confirmation. The Job Record stays the source of truth — QB receives the finalized document. One entry, one record, everything flows.
    </div></Card>
  </div>;
}
