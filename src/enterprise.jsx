// The DYFRENT Network inside Midwest (Midwest issue 3, DYFRENT issue 1382): Profile, Network and Messages.
//
// Each tab is J's actual DYFRENT page in a frame (https://www.dyfrent.app/enterprise). The frame asks this page for
// every Network call; this page passes it to Midwest's own server (/api/enterprise-network), which checks the signed
// session it set at sign-in and signs the call for DYFRENT. No key, token or password ever reaches the frame, and
// nothing from Midwest's own records is sent: only the call the person made on the Network page.
//
// Shown to the pilot logins the server names (ENTERPRISE_PILOT_USERS), or to every login when the server has
// ENTERPRISE_OPEN_REQUESTS=on (DYFRENT issue 1488): a login J has not approved yet sees Ask to join instead of the frame.
import React, { useState, useEffect, useRef } from "react";

export const NETWORK_APP = "https://www.dyfrent.app";
export const FRAME_PROTOCOL = "dyfrent.enterprise.frame/1";
export const NETWORK_PAGES = [
  { id: "netprofile", view: "profile", label: "Profile", icon: "users" },
  { id: "network", view: "network", label: "Network", icon: "target" },
  { id: "netmessages", view: "messages", label: "Messages", icon: "file" },
];
const API = "/api/enterprise-network";
const post = async (body) => {
  try {
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let d = {}; try { d = await r.json(); } catch (e) { d = {}; }
    return { status: r.status, body: d && typeof d === "object" ? d : {} };
  } catch (e) { return { status: 503, body: { ok: false, error: "No connection just now. Try again in a moment." } }; }
};

// After the normal Midwest sign-in succeeds: the same username and password also open a verified Network session on
// Midwest's server, for pilot logins only. Never blocks or changes the sign-in itself.
let pendingSignIn = null;
export function networkSignIn(username, password) {
  pendingSignIn = post({ op: "login", username, password }).catch(() => null);
  return pendingSignIn;
}
export function networkSignOut() {
  post({ op: "logout" }).catch(() => { });
}

// Is this login on the pilot list (shows the three tabs), and does it already have a verified session?
export function useNetworkPilot(currentUser) {
  const [st, setSt] = useState({ pilot: false, session: false, checked: false });
  const id = currentUser && currentUser.id ? String(currentUser.id) : "";
  useEffect(() => {
    if (!id) { setSt({ pilot: false, session: false, checked: true }); return undefined; }
    let live = true;
    Promise.resolve(pendingSignIn).then(() => post({ op: "status", user: id })).then(r => { if (live) setSt({ pilot: r.body.pilot === true, session: r.body.session === true, checked: true }); });
    return () => { live = false; };
  }, [id]);
  return [st, setSt];
}

function ConfirmPassword({ currentUser, onDone }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!pw) return; setBusy(true); setErr("");
    const r = await post({ op: "login", username: String(currentUser.username || ""), password: pw });
    setBusy(false); setPw("");
    if (r.body.ok === true) onDone(); else setErr(r.body.error || "That password did not match.");
  };
  return (
    <div style={{ maxWidth: 420, margin: "10vh auto", padding: 28, background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#2dd4bf", marginBottom: 10 }}>DYFRENT Network</div>
      <div style={{ fontSize: 18, color: "#f0f0f0", marginBottom: 8 }}>Confirm your password</div>
      <div style={{ fontSize: 13, color: "#9a9a9a", lineHeight: 1.6, marginBottom: 18 }}>Once per sign-in, so the Network knows it is really you. Only your Network activity is shared; Midwest's jobs, customers and finances stay here.</div>
      <input type="password" value={pw} autoComplete="current-password" placeholder="Your Midwest password" onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === "Enter") go(); }}
        style={{ width: "100%", padding: "12px 14px", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f0f0f0", fontSize: 16, boxSizing: "border-box", outline: "none" }} />
      {err && <div role="alert" style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{err}</div>}
      <button type="button" disabled={busy || !pw} onClick={go} style={{ marginTop: 16, width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy || !pw ? 0.6 : 1 }}>{busy ? "Checking" : "Open the Network"}</button>
    </div>
  );
}

// The views the frame may ask to switch to (DYFRENT issue 1422: Open full profile, Messages): each is one of our tabs.
export const GO_PAGE = Object.freeze({ profile: "netprofile", network: "network", messages: "netmessages" });

// Add to Apple Wallet on the Network card (DYFRENT issue 1492). An iPhone does not hand a pass opened inside a frame to
// Wallet, so the frame asks this page to open the person's own signed pass link here, at the top. Only DYFRENT's pass
// download address with its token is ever opened; anything else is ignored.
export const PASS_LINK = /^https:\/\/www\.dyfrent\.app\/api\/book\?action=netpass&t=[A-Za-z0-9_-]{100,200}$/;
export const openPass = (url, go) => { const u = String(url || ""); if (!PASS_LINK.test(u)) return false; (go || ((x) => window.location.assign(x)))(u); return true; };

// The relay: answers the frame's hello and calls, only from that frame at the DYFRENT origin.
function NetworkFrame({ view, onSignedOut, onGo, onPass }) {
  const ref = useRef(null);
  const host = typeof window !== "undefined" ? window.location.origin : "";
  useEffect(() => {
    const on = async (e) => {
      const f = ref.current;
      if (!f || e.source !== f.contentWindow || e.origin !== NETWORK_APP) return;
      const m = e.data;
      if (!m || typeof m !== "object" || m.t !== FRAME_PROTOCOL || typeof m.id !== "string" || m.id.length > 64) return;
      let r;
      if (m.kind === "go") { const p = GO_PAGE[m.view]; if (p && m.view !== view && onGo) onGo(p); return; }
      if (m.kind === "pass") { openPass(m.url, onPass); return; }
      if (m.kind === "hello") r = await post({ op: "hello" });
      else if (m.kind === "call") r = await post({ op: "call", route: m.route, body: m.body });
      else return;
      if (r.status === 401 && r.body.code === "signin") onSignedOut();
      if (ref.current && ref.current.contentWindow) ref.current.contentWindow.postMessage({ t: FRAME_PROTOCOL, kind: "result", id: m.id, status: r.status, body: r.body }, NETWORK_APP);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onSignedOut, onGo, onPass, view]);
  const src = NETWORK_APP + "/enterprise?host=" + encodeURIComponent(host) + "&view=" + encodeURIComponent(view);
  return <iframe ref={ref} key={view} src={src} title={"DYFRENT " + view} data-network-frame={view}
    style={{ display: "block", width: "100%", height: "calc(100dvh - 120px)", minHeight: 520, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, background: "#000" }}
    allow="clipboard-write" referrerPolicy="strict-origin-when-cross-origin" />;
}

// DYFRENT issue 1488: a login J has not approved yet asks to join here; J approves each person on DYFRENT.
const JOIN_COPY = {
  none: { title: "Join the DYFRENT Network", body: "Profile, Network and Messages connect you with DYFRENT and the businesses on its Network. Ask to join and J will approve you. Only your name and Midwest login id are shared; Midwest's jobs, customers and finances stay here." },
  pending: { title: "Waiting for J to approve you", body: "Your request is with J at DYFRENT. These tabs open as soon as he approves you; you do not need to ask again." },
  paused: { title: "Your Network access is paused", body: "J has paused your access to the DYFRENT Network. Ask him if you need it back." },
};
function JoinCard({ state, busy, err, onAsk, onCheck }) {
  const c = JOIN_COPY[state] || JOIN_COPY.none;
  return (
    <div data-network-join={state} style={{ maxWidth: 460, margin: "10vh auto", padding: 28, background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "#2dd4bf", marginBottom: 10 }}>DYFRENT Network</div>
      <div style={{ fontSize: 18, color: "#f0f0f0", marginBottom: 8 }}>{c.title}</div>
      <div style={{ fontSize: 13, color: "#9a9a9a", lineHeight: 1.6, marginBottom: state === "paused" ? 0 : 18 }}>{c.body}</div>
      {err && <div role="alert" style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {state === "none" && <button type="button" disabled={busy} onClick={onAsk} data-network-ask style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Sending" : "Ask to join"}</button>}
      {state === "pending" && <button type="button" disabled={busy} onClick={onCheck} data-network-check style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", fontWeight: 600, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Checking" : "Check again"}</button>}
    </div>
  );
}

// Asks DYFRENT once per tab visit whether this person is approved; only an approved person gets the frame.
function JoinGate({ children, onSignedOut }) {
  const [st, setSt] = useState({ state: "", busy: false, err: "" });
  const ask = async (want) => {
    setSt(s => ({ ...s, busy: true, err: "" }));
    const r = await post({ op: "join", ask: want === true });
    if (r.status === 401 && r.body.code === "signin") { onSignedOut(); return; }
    if (r.body.ok === true && ["approved", "pending", "paused", "none"].includes(r.body.state)) setSt({ state: r.body.state, busy: false, err: "" });
    else setSt(s => ({ state: s.state || "error", busy: false, err: r.body.error || "The Network could not answer just now. Try again." }));
  };
  useEffect(() => { ask(false); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!st.state) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (st.state === "approved") return children;
  if (st.state === "error") return (
    <div data-network-join="error" style={{ maxWidth: 460, margin: "10vh auto", padding: 28, background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ fontSize: 13, color: "#9a9a9a", lineHeight: 1.6, marginBottom: 14 }}>{st.err}</div>
      <button type="button" disabled={st.busy} onClick={() => ask(false)} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", fontWeight: 600, fontSize: 14 }}>Try again</button>
    </div>
  );
  return <JoinCard state={st.state} busy={st.busy} err={st.err} onAsk={() => ask(true)} onCheck={() => ask(false)} />;
}

export function NetworkPage({ view, currentUser, pilotState, setPilotState, setPage, onPass }) {
  if (!pilotState.checked) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (!pilotState.pilot) return null;
  const signedOut = () => setPilotState(s => ({ ...s, session: false }));
  if (!pilotState.session) return <ConfirmPassword currentUser={currentUser} onDone={() => setPilotState(s => ({ ...s, session: true }))} />;
  return <JoinGate onSignedOut={signedOut}><NetworkFrame view={view} onSignedOut={signedOut} onGo={setPage} onPass={onPass} /></JoinGate>;
}

// DYFRENT issue 1488 >> the Network in Midwest's bell: what is waiting for this person on the Network, as counts only
// (the server's bell op), each opening the tab where it is answered. Shown only to a person with a verified Network
// session whom J has approved; anyone else gets nothing back and the bell stays hidden.
export const BELL_EVERY_MS = 120000;
export const BELL_GAP_MS = 20000;
export const BELL_ROWS = [
  { key: "messages", page: "netmessages", one: "unread message", many: "unread messages" },
  { key: "agents", page: "netmessages", one: "message from an agent", many: "messages from agents" },
  { key: "requests", page: "network", one: "connection request", many: "connection requests" },
  { key: "intros", page: "network", one: "introduction waiting on you", many: "introductions waiting on you" },
  { key: "decide", page: "network", one: "reply to your work request", many: "replies to your work requests" },
  { key: "work", page: "network", one: "work request that fits you", many: "work requests that fit you" },
];
// The badge counts what needs the person; work that fits them is listed but never nags.
export const bellTotal = (c) => (c ? BELL_ROWS.filter(r => r.key !== "work").reduce((n, r) => n + (Number(c[r.key]) || 0), 0) : 0);
const BELL_PATH = "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0";

export function NetworkBell({ pilotState, page, setPage, screen }) {
  const [counts, setCounts] = useState(null);
  const [open, setOpen] = useState(false);
  // DYFRENT issue 1488 >> Ask Jarvis about this screen: the panel turns into a short composer. The draft survives closing
  // the panel; only the question and the screen's name are sent (the server's ask op fixes the recipient).
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState("");
  // The screen a question was started on travels with it, and a nonce makes a retry of the same question one message.
  const draftOf = useRef({ screen: "", nonce: "" });
  const askBox = useRef(null), doneBtn = useRef(null), sending = useRef(false);
  const [ask, setAsk] = useState({ busy: false, err: "", sent: "" });
  const composing = useRef(false); composing.current = open && mode === "ask" && !ask.sent;
  const shownScreen = String(screen || "").trim().slice(0, 40) || "Dashboard";
  const [at, setAt] = useState({ top: 64, right: 16 });
  const wrap = useRef(null);
  const on = pilotState.checked && pilotState.pilot && pilotState.session;
  const btn = useRef(null);
  const onRef = useRef(on); onRef.current = on;
  // One read at a time, never more than one each 20 seconds unless the person opens the bell; only the newest answer
  // counts. A refusal (signed out, not approved, paused) hides the bell; a passing failure keeps the last counts.
  const seq = useRef(0), lastAt = useRef(0), busy = useRef(false);
  const load = useRef(null);
  load.current = async (force) => {
    const t = Date.now();
    if (busy.current || (!force && t - lastAt.current < BELL_GAP_MS)) return;
    busy.current = true; lastAt.current = t; const mine = ++seq.current;
    const r = await post({ op: "bell" });
    busy.current = false;
    if (mine !== seq.current || !onRef.current) return;
    if (r.status === 200 && r.body.ok === true) setCounts(r.body);
    else if (r.status === 401 || r.status === 403) setCounts(null);
  };
  useEffect(() => {
    if (!on) { seq.current++; busy.current = false; lastAt.current = 0; setCounts(null); setOpen(false); return undefined; }
    const tick = () => { if (typeof document === "undefined" || document.visibilityState !== "hidden") load.current(); };
    load.current(true);
    const t = setInterval(tick, BELL_EVERY_MS);
    const vis = () => { if (document.visibilityState === "visible") load.current(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [on]);
  // Coming back from a Network tab: what was read there is no longer waiting.
  const last = useRef(page);
  useEffect(() => { const was = last.current; last.current = page; if (on && was !== page && Object.values(GO_PAGE).includes(was)) load.current(true); }, [page, on]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { setOpen(false); if (btn.current) btn.current.focus(); } };
    // Placed once when opened: a scroll, resize or rotation, or a click into the Network frame (which never reaches this
    // page), closes it rather than leave it hanging away from the bell.
    // Not while writing to Jarvis: a phone's keyboard opening resizes and scrolls the page.
    const shut = (e) => { if (!(composing.current && e && e.type !== "blur" && typeof document !== "undefined" && document.activeElement && document.activeElement.id === "network-ask-text")) setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("touchstart", away); document.addEventListener("keydown", esc);
    window.addEventListener("resize", shut); window.addEventListener("blur", shut);   // blur: a click into the Network frame document.addEventListener("scroll", shut, true);
    const first = wrap.current && wrap.current.querySelector("[data-network-bell-panel] textarea, [data-network-bell-panel] button");
    if (first) first.focus();
    return () => {
      document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", shut); window.removeEventListener("blur", shut); document.removeEventListener("scroll", shut, true);
    };
  }, [open, mode]);
  if (!on || !counts) return null;
  const total = bellTotal(counts);
  const rows = BELL_ROWS.filter(r => (Number(counts[r.key]) || 0) > 0);
  const go = (p) => { setOpen(false); setMode("list"); setPage(p); };   // setPage scrolls to the top itself
  const askScreen = draft.trim() && draftOf.current.screen ? draftOf.current.screen : shownScreen;
  const startAsk = () => { setAsk({ busy: false, err: "", sent: "" }); setMode("ask"); };
  const write = (v) => {
    if (!draft.trim() && v.trim()) draftOf.current = { screen: shownScreen, nonce: Math.random().toString(36).slice(2, 14) + Date.now().toString(36) };
    setDraft(v);
  };
  const send = async () => {
    const text = draft.trim();
    if (!text || sending.current) return;
    sending.current = true;
    setAsk({ busy: true, err: "", sent: "" });
    const r = await post({ op: "ask", screen: askScreen, text, nonce: draftOf.current.nonce });
    sending.current = false;
    if (r.status === 200 && r.body.ok === true) {
      setDraft(""); draftOf.current = { screen: "", nonce: "" };
      setAsk({ busy: false, err: "", sent: askScreen }); load.current(true);
      setTimeout(() => { if (doneBtn.current) doneBtn.current.focus(); }, 0);
    } else {
      setAsk({ busy: false, err: String(r.body.error || "Jarvis could not be reached just now. Try again.").slice(0, 160), sent: "" });
      setTimeout(() => { if (askBox.current) askBox.current.focus(); }, 0);
    }
  };
  const label = total ? total + " waiting on the DYFRENT Network" : "DYFRENT Network";
  return (
    <div ref={wrap} style={{ position: "relative" }} data-network-bell={total}>
      <button ref={btn} type="button" aria-label={label} title={label} aria-expanded={open} aria-controls="network-bell-panel" onClick={(e) => {
          // Fixed to the viewport, kept 16px inside it, so it never runs off a phone screen.
          const b = e.currentTarget.getBoundingClientRect();
          const w = window.innerWidth, pw = Math.min(300, w - 32);
          setAt({ top: Math.round(b.bottom + 8), right: Math.max(16, Math.round(Math.min(w - b.right, w - 16 - pw))) });
          if (!open && !draft.trim()) setMode("list");   // an unsent question to Jarvis reopens where it was left
          if (!open) setAsk(a => (a.busy ? a : { busy: false, err: "", sent: "" }));
          setOpen(o => !o); if (!open) load.current(true);
        }}
        style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", background: open ? "rgba(45,212,191,0.08)" : "transparent", color: total ? "#2dd4bf" : "#737373", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={BELL_PATH} /></svg>
        {total > 0 && <span data-network-bell-count style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", boxSizing: "border-box", borderRadius: 8, background: "#2dd4bf", color: "#000", fontSize: 10, fontWeight: 700, lineHeight: "16px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{total > 99 ? "99+" : total}</span>}
      </button>
      {open && (
        <div id="network-bell-panel" role="region" aria-label="DYFRENT Network" data-network-bell-panel style={{ position: "fixed", top: at.top, right: at.right, zIndex: 10002, width: 300, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", padding: 8, background: "#111111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
          <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#2dd4bf", padding: "8px 10px 6px" }}>{mode === "ask" ? "Ask Jarvis" : "DYFRENT Network"}</div>
          {mode === "ask" && (ask.sent ? (
            <div data-network-ask-sent role="status" style={{ padding: "2px 10px 8px" }}>
              <div style={{ fontSize: 13, color: "#f0f0f0", lineHeight: 1.5, marginBottom: 12 }}>Sent to Jarvis. The answer will arrive in Messages and on this bell.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button ref={doneBtn} type="button" onClick={() => { setMode("list"); setAsk({ busy: false, err: "", sent: "" }); }} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
                <button type="button" onClick={() => go("netmessages")} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Open Messages</button>
              </div>
            </div>
          ) : (
            <div data-network-ask style={{ padding: "2px 10px 8px" }}>
              <label htmlFor="network-ask-text" style={{ display: "block", fontSize: 13, color: "#f0f0f0", marginBottom: 8 }}>{"About the " + askScreen + " screen"}</label>
              <textarea ref={askBox} id="network-ask-text" value={draft} maxLength={4000} rows={4} placeholder="What do you want to know or change?" readOnly={ask.busy} aria-busy={ask.busy}
                onChange={e => write(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 88, padding: "10px 12px", background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#f0f0f0", fontSize: 16, lineHeight: 1.45, fontFamily: "inherit", outline: "none" }} />
              <div style={{ fontSize: 11.5, color: "#9a9a9a", lineHeight: 1.5, margin: "8px 0 10px" }}>Jarvis gets your question and the name of this screen, nothing else from Midwest.</div>
              {ask.err && <div role="alert" style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{ask.err}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={ask.busy} onClick={() => setMode("list")} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f0f0f0", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Back</button>
                <button type="button" data-network-ask-send disabled={ask.busy || !draft.trim()} onClick={send} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: "none", background: "#2dd4bf", color: "#000", fontWeight: 700, fontSize: 13, cursor: ask.busy || !draft.trim() ? "default" : "pointer", opacity: ask.busy || !draft.trim() ? 0.6 : 1, fontFamily: "inherit" }}>{ask.busy ? "Sending" : "Send"}</button>
              </div>
            </div>
          ))}
          {mode === "list" && <button type="button" data-network-ask-open onClick={startAsk}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "8px 10px", marginBottom: 2, border: "1px solid rgba(45,212,191,0.25)", borderRadius: 10, background: "rgba(45,212,191,0.06)", color: "#2dd4bf", fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
            Ask Jarvis about this screen
          </button>}
          {mode === "list" && rows.map(r => {
            const n = Number(counts[r.key]) || 0;
            return (
              <button key={r.key} type="button" data-network-bell-row={r.key} onClick={() => go(r.page)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "8px 10px", border: "none", borderRadius: 10, background: "transparent", color: "#f0f0f0", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ minWidth: 24, color: r.key === "work" ? "#9a9a9a" : "#2dd4bf", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n > 999 ? "999+" : n}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{n === 1 ? r.one : r.many}</span>
              </button>
            );
          })}
          {mode === "list" && !rows.length && <div data-network-bell-empty style={{ fontSize: 13, color: "#9a9a9a", padding: "6px 10px 10px" }}>Nothing new on the Network.</div>}
          {mode === "list" && <button type="button" onClick={() => go("network")} style={{ display: "block", width: "100%", minHeight: 40, marginTop: 4, padding: "8px 10px", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", borderRadius: 0, background: "transparent", color: "#9a9a9a", fontSize: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>Open the Network</button>}
        </div>
      )}
    </div>
  );
}
