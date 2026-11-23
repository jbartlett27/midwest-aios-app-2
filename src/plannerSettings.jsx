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
export function PlannerLinkBar({ notify }) {
  const copy = () => {
    const done = () => notify && notify("Planner link copied");
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(PLANNER_URL).then(done, () => { window.prompt("Copy the planner link", PLANNER_URL); }); return; } } catch (e) { }
    window.prompt("Copy the planner link", PLANNER_URL);
  };
  const b = { padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
  return (
    <div data-planner-link style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "#f0f0f0", fontWeight: 600 }}>Furniture Planner</div>
        <div style={{ fontSize: 12, color: "#9a9a9a", fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>midwestaios.com/plan &gt;&gt; customers plan a space and request a priced quote</div>
      </div>
      <a href={PLANNER_URL} target="_blank" rel="noopener noreferrer" style={{ ...b, background: "#2dd4bf", color: "#000", textDecoration: "none" }} data-planner-open>Open planner</a>
      <button type="button" onClick={copy} style={{ ...b, background: "transparent", color: "#f0f0f0", border: "1px solid rgba(255,255,255,0.14)" }} data-planner-copy>Copy link</button>
    </div>
  );
}

export function PlannerBookingCard({ reps, customSops, addSop, notify }) {
  const saved = readPlannerSettings(customSops);
  const b = saved.booking || {};
  const selling = (reps || []).filter((r) => r && r.id && r.name);
  const [defRep, setDefRep] = useState(b.defaultRep || "S001");
  const [theme, setTheme] = useState(saved.theme === "dark" ? "dark" : "light");
  const [limit, setLimit] = useState(String(saved.dailyLimit != null ? saved.dailyLimit : 10));
  const [spent, setSpent] = useState(null);
  useEffect(() => { fetch("https://kogjthgceejpzxnekprr.supabase.co/rest/v1/rpc/planner_spend_get", { method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()).then((c) => setSpent(Number(c) || 0)).catch(() => setSpent(null)); }, []);
  const [rows, setRows] = useState(() => Object.fromEntries(selling.map((r) => [r.id, { url: (b.reps && b.reps[r.id] && b.reps[r.id].url) || "", hostEmails: ((b.reps && b.reps[r.id] && b.reps[r.id].hostEmails) || []).join(", ") }])));
  useEffect(() => { setRows((x) => { const n = { ...x }; selling.forEach((r) => { if (!n[r.id]) n[r.id] = { url: "", hostEmails: "" }; }); return n; }); }, [reps]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id, k) => (e) => setRows((x) => ({ ...x, [id]: { ...x[id], [k]: e.target.value } }));
  const save = () => {
    for (const [id, r] of Object.entries(rows)) if (r.url && !/^https:\/\/\S+$/.test(r.url.trim())) { notify("A booking link must start with https://"); return; }
    const repsOut = {};
    for (const [id, r] of Object.entries(rows)) if (r.url.trim() || r.hostEmails.trim()) repsOut[id] = { url: r.url.trim(), hostEmails: r.hostEmails.split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => /@/.test(e)) };
    const lim = Number(limit);
    if (!Number.isFinite(lim) || lim < 0 || lim > 1000) { notify("Daily limit: a dollar amount from 0 to 1000"); return; }
    const next = { ...saved, theme, dailyLimit: Math.round(lim * 100) / 100, booking: { defaultRep: defRep, reps: repsOut } };
    addSop({ id: PLANNER_SETTINGS_ID, title: "Furniture Planner settings", cat: "Config", icon: "settings", content: JSON.stringify(next), custom: true });
    notify("Planner settings saved");
  };
  const def = rows[defRep] || {};
  return (
    <>
    <PlannerLinkBar notify={notify} />
    <div style={box} data-planner-booking>
      <div style={{ fontSize: 15, color: "#f0f0f0", fontWeight: 600, marginBottom: 4 }}>Furniture Planner</div>
      <div style={{ fontSize: 12.5, color: "#9a9a9a", lineHeight: 1.6, marginBottom: 14 }}>
        After a customer requests a priced quote at midwestaios.com/plan, they are offered the default rep's booking link. The request is always saved first, with or without a link.
        {!def.url && <span style={{ color: "#fbbf24" }}> No link for the default rep yet: customers are told Midwest will follow up.</span>}
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
      {selling.map((r) => (
        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(110px,160px) 1fr 1fr", gap: 8, alignItems: "center", marginBottom: 8 }} className="resp-grid-2">
          <div style={{ fontSize: 13, color: "#c4c4c4" }}>{r.name}{r.id === defRep ? " (default)" : ""}</div>
          <input style={inp} placeholder="Booking link (https://calendly.com/...)" value={(rows[r.id] || {}).url || ""} onChange={set(r.id, "url")} />
          <input style={inp} placeholder="Calendar email(s) for confirmed bookings" value={(rows[r.id] || {}).hostEmails || ""} onChange={set(r.id, "hostEmails")} />
        </div>
      ))}
      <div style={{ fontSize: 12, color: "#737373", lineHeight: 1.6, margin: "10px 0 14px" }}>Confirmed bookings: in Calendly, add a webhook for "invitee created" to https://midwestaios.com/api/plan?op=booking and put its signing key in the PLAN_BOOKING_SIGNING_KEY setting. A booking is matched to the prospect and the card is assigned to the rep whose calendar took it. A link click alone changes nothing.</div>
      <button type="button" onClick={save} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save planner settings</button>
    </div>
    </>
  );
}
