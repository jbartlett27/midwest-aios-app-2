// Users & Permissions >> Furniture Planner booking. Who a planner customer can book a call with after "Request a priced
// quote" (/plan). One booking link per rep, a default rep, and the calendar emails that tell the server which rep a
// confirmed booking belongs to. Saved as the PLANNER_SETTINGS row; no code change to swap reps or add routing later.
import React, { useState, useEffect } from "react";

export const PLANNER_SETTINGS_ID = "PLANNER_SETTINGS";
// The same public key the app already uses (src/supabase.js); planner_spend_get only reads a total.
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZ2p0aGdjZWVqcHp4bmVrcHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODgyODUsImV4cCI6MjA4ODg2NDI4NX0.W0bhVfPNjCPYKzs6KpIeYaXk5epKRbLmDzgSN8NEjHo";
export function readPlannerSettings(customSops) {
  const row = (customSops || []).find((s) => s && s.id === PLANNER_SETTINGS_ID);
  try { const v = JSON.parse((row && row.content) || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; }
}

const box = { background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20, marginBottom: 16 };
const inp = { width: "100%", padding: "10px 12px", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f0f0f0", fontSize: 13, boxSizing: "border-box" };

// The public planner's link, for anyone in the app: open it in a new tab or copy it to share (Sales Portal and Users & Permissions).
export const PLANNER_URL = "https://midwestaios.com/plan";
// A rep's share link: midwestaios.com/plan?rep=jim-lindner. The same slug rule as the server (api/plan.js repSlug).
export const repSlug = (name) => String(name || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
export const repShareUrl = (name) => PLANNER_URL + "?rep=" + repSlug(name);
function copyText(text, ok) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, () => window.prompt("Copy this link", text)); return; } } catch (e) { }
  window.prompt("Copy this link", text);
}
export function PlannerLinkBar({ notify }) {
  const [copied, setCopied] = useState(false);
  const done = () => { setCopied(true); if (notify) notify("Planner link copied"); setTimeout(() => setCopied(false), 2200); };
  const copy = () => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(PLANNER_URL).then(done, fallback); return; } } catch (e) { }
    fallback();
  };
  // Older browsers and some embedded views: copy through a hidden field, and as a last resort show the link to copy by hand.
  const fallback = () => {
    try { const t = document.createElement("textarea"); t.value = PLANNER_URL; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0;top:0;left:0"; document.body.appendChild(t); t.select(); const ok = document.execCommand && document.execCommand("copy"); t.remove(); if (ok) { done(); return; } } catch (e) { }
    window.prompt("Copy the planner link", PLANNER_URL);
  };
  const btn = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none", transition: "background .15s,border-color .15s,color .15s" };
  return (
    <div data-planner-link className="mw-plink" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "linear-gradient(135deg,rgba(45,212,191,0.06),rgba(167,139,250,0.04))", border: "1px solid rgba(45,212,191,0.16)", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
      <style>{"@media (max-width:560px){.mw-plink .acts{width:100%}.mw-plink .acts>*{flex:1 1 auto}.mw-plink .acts .url{flex-basis:100%;text-align:center}}"}</style>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(45,212,191,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M5 10v8M19 10v8M3 18h18M7 6h10l2 4H5z" /></svg>
      </div>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#f0f0f0", fontWeight: 600, marginBottom: 3 }}>Furniture Planner</div>
        <div style={{ fontSize: 12.5, color: "#9a9a9a", lineHeight: 1.5 }}>Customers plan a space and request a priced quote. Requests land in Prospects.</div>
      </div>
      <div className="acts" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="url" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#c4c4c4", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", whiteSpace: "nowrap" }}>midwestaios.com/plan</span>
        <button type="button" onClick={copy} style={{ ...btn, background: copied ? "rgba(52,211,153,0.12)" : "transparent", color: copied ? "#34d399" : "#f0f0f0", border: "1px solid " + (copied ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.14)") }} data-planner-copy aria-live="polite">
          {copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={PLANNER_URL} target="_blank" rel="noopener noreferrer" style={{ ...btn, background: "#2dd4bf", color: "#000", border: "1px solid #2dd4bf" }} data-planner-open>
          Open planner
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
        </a>
      </div>
    </div>
  );
}

export function PlannerBookingCard({ reps, customSops, addSop, notify }) {
  const saved = readPlannerSettings(customSops);
  const b = saved.booking || {};
  const staff = (reps || []).filter((r) => r && r.id && r.name && !String(r.id).includes("SEED"));
  // Reps added here (not in the staff list), kept in the planner settings: Maureen can add, edit and remove them.
  const [added, setAdded] = useState(() => Object.entries(b.reps || {}).filter(([id, r]) => r && r.added && !staff.some((x) => x.id === id)).map(([id, r]) => ({ id, name: r.name || "", added: true })));
  const selling = [...staff, ...added];
  // Before anything is saved, the sales team (reps with the Sales role) is offered to customers by name.
  const isSales = (r) => Array.isArray(r.roles) ? r.roles.includes("Sales") : /sales/i.test(String(r.tier || ""));
  const rowFor = (r) => { const s0 = b.reps && b.reps[r.id]; return { name: (s0 && s0.name) || r.name || "", email: (s0 && typeof s0.email === "string" ? s0.email : (r.email || "")), url: (s0 && s0.url) || "", hostEmails: ((s0 && s0.hostEmails) || []).join(", "), offer: s0 && typeof s0.offer === "boolean" ? s0.offer : (r.added ? true : isSales(r)), calendly: !!(s0 && s0.calendly), area: s0 && typeof s0.area === "string" ? s0.area : (r.territory || "") }; };
  const [defRep, setDefRep] = useState(b.defaultRep || "S001");
  const [theme, setTheme] = useState(saved.theme === "dark" ? "dark" : "light");
  const [limit, setLimit] = useState(String(saved.dailyLimit != null ? saved.dailyLimit : 10));
  const [spent, setSpent] = useState(null);
  useEffect(() => { fetch("https://kogjthgceejpzxnekprr.supabase.co/rest/v1/rpc/planner_spend_get", { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()).then((c) => setSpent(Number(c) || 0)).catch(() => setSpent(null)); }, []);
  const [rows, setRows] = useState(() => Object.fromEntries(selling.map((r) => [r.id, rowFor(r)])));
  useEffect(() => { setRows((x) => { const n = { ...x }; selling.forEach((r) => { if (!n[r.id]) n[r.id] = rowFor(r); }); return n; }); }, [reps]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id, k) => (e) => setRows((x) => ({ ...x, [id]: { ...x[id], [k]: k === "offer" ? e.target.checked : e.target.value } }));
  const [nw, setNw] = useState({ name: "", email: "", area: "", url: "" });
  const addRep = () => {
    const name = nw.name.trim();
    if (!name) { notify("Add the rep's name"); return; }
    if (nw.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nw.email.trim())) { notify("That email does not look right"); return; }
    if (nw.url.trim() && !/^https:\/\/\S+$/.test(nw.url.trim())) { notify("A booking link must start with https://"); return; }
    if (selling.some((r) => repSlug((rows[r.id] || {}).name || r.name) === repSlug(name))) { notify("There is already a rep with that name"); return; }
    const id = "PX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const nextAdded = [...added, { id, name, added: true }];
    const nextRows = { ...rows, [id]: { name, email: nw.email.trim(), url: nw.url.trim(), hostEmails: nw.email.trim(), offer: true, calendly: false, area: nw.area.trim() } };
    setAdded(nextAdded); setRows(nextRows); setNw({ name: "", email: "", area: "", url: "" });
    save(nextRows, nextAdded, null, name + " added");
  };
  const removeRep = (rep) => {
    if (!window.confirm("Remove " + ((rows[rep.id] || {}).name || rep.name) + " from the planner? Prospect cards already assigned to them keep their rep.")) return;
    const nextAdded = added.filter((r) => r.id !== rep.id);
    const nextRows = { ...rows }; delete nextRows[rep.id];
    const nextDef = defRep === rep.id ? (staff[0] ? (staff.find((r) => r.id === "S001") || staff[0]).id : (nextAdded[0] || {}).id || "") : defRep;
    setAdded(nextAdded); setRows(nextRows); setDefRep(nextDef);
    save(nextRows, nextAdded, nextDef, "Rep removed");
  };
  const [linking, setLinking] = useState({}); // repId -> { open, token, busy, note }
  const setLink = (id, patch) => setLinking((x) => ({ ...x, [id]: { ...(x[id] || {}), ...patch } }));
  // Connect Calendly: the rep's personal access token goes to the server once, which reads the rep's booking link and
  // calendar email and turns on confirmed bookings for that calendar. The token is never saved, here or on the server.
  const connect = async (rep) => {
    const l = linking[rep.id] || {};
    const token = String(l.token || "").trim();
    if (!token) { setLink(rep.id, { note: "Paste the token from Calendly first." }); return; }
    setLink(rep.id, { busy: true, note: "" });
    try {
      const r = await fetch("/api/plan?op=calendly-connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const c = await r.json().catch(() => ({}));
      if (!r.ok || !c.ok) { setLink(rep.id, { busy: false, token: "", note: c.error || "Calendly could not be reached. Try again in a minute." }); return; }
      const cur = rows[rep.id] || rowFor(rep);
      const emails = [...new Set([...String(cur.hostEmails || "").split(/[,\s]+/), c.email || ""].map((e) => e.trim().toLowerCase()).filter((e) => /@/.test(e)))].join(", ");
      const nextRows = { ...rows, [rep.id]: { ...cur, url: c.url || cur.url, hostEmails: emails, calendly: true } };
      setRows(nextRows);
      setLink(rep.id, { busy: false, open: false, token: "", note: (c.url ? "Connected: " + c.url + "." : "Connected, but no booking page was found in Calendly.") + (c.hooked ? " Bookings now assign the card automatically." : " The booking link works; automatic assignment on booking was not turned on by Calendly.") });
      save(nextRows);
    } catch (e) { setLink(rep.id, { busy: false, token: "", note: "Calendly could not be reached. Try again in a minute." }); }
  };
  const save = (useRows, useAdded, useDef, msg) => {
    const rows0 = useRows && typeof useRows === "object" && !useRows.nativeEvent ? useRows : rows;
    const list = [...staff, ...(Array.isArray(useAdded) ? useAdded : added)];
    const def0 = typeof useDef === "string" ? useDef : defRep;
    for (const [, r] of Object.entries(rows0)) if (r.email && r.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim())) { notify("A rep email does not look right: " + r.email); return; }
    for (const [id, r] of Object.entries(rows0)) if (r.url && !/^https:\/\/\S+$/.test(r.url.trim())) { notify("A booking link must start with https://"); return; }
    const repsOut = {};
    // Every rep is kept with its name, so the public planner can show the ones offered without reading the staff list.
    for (const rep of list) { const r = rows0[rep.id] || rowFor(rep); repsOut[rep.id] = { name: (rep.added ? String(r.name || rep.name).trim().slice(0, 80) : rep.name) || rep.name, email: String(r.email || "").trim().toLowerCase(), ...(rep.added ? { added: true } : {}), offer: !!r.offer, area: String(r.area || "").trim().slice(0, 80), url: r.url.trim(), hostEmails: r.hostEmails.split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => /@/.test(e)), ...(r.calendly ? { calendly: true } : {}) }; }
    const lim = Number(limit);
    if (!Number.isFinite(lim) || lim < 0 || lim > 1000) { notify("Daily limit: a dollar amount from 0 to 1000"); return; }
    const next = { ...saved, theme, dailyLimit: Math.round(lim * 100) / 100, booking: { defaultRep: def0, reps: repsOut } };
    addSop({ id: PLANNER_SETTINGS_ID, title: "Furniture Planner settings", cat: "Config", icon: "settings", content: JSON.stringify(next), custom: true });
    notify(msg || "Planner settings saved");
  };
  const def = rows[defRep] || {};
  return (
    <>
    <PlannerLinkBar notify={notify} />
    <div style={box} data-planner-booking>
      <div style={{ fontSize: 15, color: "#f0f0f0", fontWeight: 600, marginBottom: 4 }}>Furniture Planner</div>
      <div style={{ fontSize: 12.5, color: "#9a9a9a", lineHeight: 1.6, marginBottom: 14 }}>
        When a customer requests a priced quote at midwestaios.com/plan, the Prospect card is assigned to the rep they chose, or to the default rep when they have no preference, and the rep follows up. A booking link is optional: when the rep has one, the customer is also offered it right after the request is saved.
        {!def.url && <span style={{ color: "#9a9a9a" }}> No booking link for the default rep: customers are told the rep will follow up.</span>}
      </div>
      <label style={{ fontSize: 12, color: "#9a9a9a", display: "block", marginBottom: 12 }}>Daily AI spend limit for the public planner, in dollars (0 turns the chat off)
        <input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ""))} style={{ ...inp, marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }} data-planner-limit />
        <span style={{ display: "block", marginTop: 6, color: "#737373" }}>{spent == null ? "" : "Spent today: $" + (spent / 100).toFixed(2) + ". When the limit is reached the chat pauses until tomorrow; downloads and quote requests keep working."}</span>
      </label>
      <label style={{ fontSize: 12, color: "#9a9a9a", display: "block", marginBottom: 12 }}>Look a visitor sees first (they can still switch)
        <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ ...inp, marginTop: 6 }} data-planner-theme><option value="light">Light (white)</option><option value="dark">Dark (like the Midwest app)</option></select>
      </label>
      <label style={{ fontSize: 12, color: "#9a9a9a", display: "block", marginBottom: 12 }}>Default rep for new planner requests
        <select value={defRep} onChange={(e) => setDefRep(e.target.value)} style={{ ...inp, marginTop: 6 }}>{selling.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </label>
      <div style={{ fontSize: 12, color: "#9a9a9a", margin: "4px 0 10px" }}>Reps customers can choose. A checked rep is listed by name and area in the quote request form ("Who would you like to talk with?"). The rep's email is shown only to a customer who just sent that rep a request, and only when the rep has no booking link.</div>
      {selling.map((r) => (
        <div key={r.id} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 12, marginBottom: 8 }} data-planner-rep={r.id}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 600 }}>{(rows[r.id] || {}).name || r.name}{r.id === defRep ? <span style={{ color: "#2dd4bf", fontWeight: 500 }}> (default)</span> : ""}{r.added ? <span style={{ color: "#737373", fontWeight: 500 }}> (added here)</span> : ""}</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#c4c4c4", cursor: "pointer" }}><input type="checkbox" checked={!!(rows[r.id] || {}).offer} onChange={set(r.id, "offer")} data-planner-offer={r.id} /> Customers can choose</label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }} className="resp-grid-2">
            {r.added && <input style={inp} placeholder="Name" value={(rows[r.id] || {}).name || ""} onChange={set(r.id, "name")} data-planner-name={r.id} />}
            <input style={inp} placeholder="Email (offered when there is no booking link)" value={(rows[r.id] || {}).email || ""} onChange={set(r.id, "email")} data-planner-email={r.id} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }} className="resp-grid-2">
            <input style={inp} placeholder="Area shown to customers (e.g. Milwaukee area)" value={(rows[r.id] || {}).area || ""} onChange={set(r.id, "area")} data-planner-area={r.id} />
            <input style={inp} placeholder="Booking link, optional (https://...)" value={(rows[r.id] || {}).url || ""} onChange={set(r.id, "url")} />
            <input style={inp} placeholder="Calendar email(s), optional" value={(rows[r.id] || {}).hostEmails || ""} onChange={set(r.id, "hostEmails")} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {!(linking[r.id] || {}).open && <button type="button" onClick={() => setLink(r.id, { open: true, note: "" })} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(45,212,191,0.4)", background: "transparent", color: "#2dd4bf", fontSize: 12, fontWeight: 600, cursor: "pointer" }} data-planner-calendly={r.id}>{(rows[r.id] || {}).calendly ? "Reconnect Calendly" : "Connect Calendly"}</button>}
            {(rows[r.id] || {}).calendly && !(linking[r.id] || {}).open && <span style={{ fontSize: 12, color: "#9a9a9a" }}>Calendly connected</span>}
            {!(linking[r.id] || {}).open && (rows[r.id] || {}).offer && <button type="button" onClick={() => copyText(repShareUrl((rows[r.id] || {}).name || r.name), () => notify("Share link copied: " + repShareUrl((rows[r.id] || {}).name || r.name)))} title={repShareUrl((rows[r.id] || {}).name || r.name)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#c4c4c4", fontSize: 12, cursor: "pointer" }} data-planner-share={r.id}>Copy share link</button>}
            {!(linking[r.id] || {}).open && r.added && <button type="button" onClick={() => removeRep(r)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(248,113,113,0.35)", background: "transparent", color: "#f87171", fontSize: 12, cursor: "pointer", marginLeft: "auto" }} data-planner-remove={r.id}>Remove</button>}
            {(linking[r.id] || {}).open && (<>
              <input type="password" autoComplete="off" spellCheck={false} style={{ ...inp, flex: "1 1 260px" }} placeholder="Paste the rep's Calendly personal access token" value={(linking[r.id] || {}).token || ""} onChange={(e) => setLink(r.id, { token: e.target.value })} data-planner-calendly-token={r.id} />
              <button type="button" disabled={!!(linking[r.id] || {}).busy} onClick={() => connect(r)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "#2dd4bf", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }} data-planner-calendly-go={r.id}>{(linking[r.id] || {}).busy ? "Connecting..." : "Connect"}</button>
              <button type="button" onClick={() => setLink(r.id, { open: false, token: "" })} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9a9a9a", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </>)}
          </div>
          {(linking[r.id] || {}).note && <div style={{ fontSize: 12, color: "#c4c4c4", marginTop: 6, lineHeight: 1.5 }} data-planner-calendly-note={r.id}>{(linking[r.id] || {}).note}</div>}
        </div>
      ))}
      <div style={{ background: "#0a0a0a", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, marginBottom: 8 }} data-planner-add>
        <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 600, marginBottom: 8 }}>Add a sales rep</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} className="resp-grid-2">
          <input style={inp} placeholder="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} data-planner-add-name />
          <input style={inp} placeholder="Email" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} data-planner-add-email />
          <input style={inp} placeholder="Area shown to customers" value={nw.area} onChange={(e) => setNw({ ...nw, area: e.target.value })} />
          <input style={inp} placeholder="Booking link, optional (https://...)" value={nw.url} onChange={(e) => setNw({ ...nw, url: e.target.value })} />
        </div>
        <button type="button" onClick={addRep} style={{ marginTop: 8, padding: "7px 14px", borderRadius: 7, border: "none", background: "#2dd4bf", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }} data-planner-add-go>Add rep</button>
      </div>
      <div style={{ fontSize: 12, color: "#737373", lineHeight: 1.6, margin: "10px 0 14px" }}>Each rep's share link (Copy share link) opens the planner with that rep already chosen when the customer requests a quote; customers who arrive without one reach the default rep. Customers pick a rep only in the quote request, never before. When a rep has no booking link, the customer is offered to email the rep instead. Booking links are optional and any https booking page works (Calendly, Microsoft Bookings with me, and others). Connect Calendly fills in the rep's booking link and calendar email and turns on confirmed bookings: when a customer books, the Prospect card is matched and assigned to the rep whose calendar took it. Get the token in Calendly under Integrations & apps >> API and webhooks >> Personal access tokens. It is used once and never saved. A link click alone changes nothing.</div>
      <button type="button" onClick={() => save()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save planner settings</button>
    </div>
    </>
  );
}
