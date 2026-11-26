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

// The relay: answers the frame's hello and calls, only from that frame at the DYFRENT origin.
function NetworkFrame({ view, onSignedOut, onGo }) {
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
      if (m.kind === "hello") r = await post({ op: "hello" });
      else if (m.kind === "call") r = await post({ op: "call", route: m.route, body: m.body });
      else return;
      if (r.status === 401 && r.body.code === "signin") onSignedOut();
      if (ref.current && ref.current.contentWindow) ref.current.contentWindow.postMessage({ t: FRAME_PROTOCOL, kind: "result", id: m.id, status: r.status, body: r.body }, NETWORK_APP);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onSignedOut, onGo, view]);
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

export function NetworkPage({ view, currentUser, pilotState, setPilotState, setPage }) {
  if (!pilotState.checked) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (!pilotState.pilot) return null;
  const signedOut = () => setPilotState(s => ({ ...s, session: false }));
  if (!pilotState.session) return <ConfirmPassword currentUser={currentUser} onDone={() => setPilotState(s => ({ ...s, session: true }))} />;
  return <JoinGate onSignedOut={signedOut}><NetworkFrame view={view} onSignedOut={signedOut} onGo={setPage} /></JoinGate>;
}
