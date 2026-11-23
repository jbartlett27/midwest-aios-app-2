// The Midwest Furniture Planner (midwestaios.com/plan). Public, no account. A customer describes a space, plans with a
// scoped assistant over Midwest's vendor catalogues, reviews a planning quote, downloads it as a PDF and can ask for a
// priced quote. Everything it sends goes to /api/plan, which holds the rules (no prices, no internal data).
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const API = '/api/plan';
const STORE = 'mw_plan_v1';
const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
const STARTERS = ['A 3rd grade classroom for 28 students', 'A high school library refresh', 'A cafeteria seating about 250', 'A flexible collaboration room for staff'];
const EMPTY_PLAN = { project: {}, items: [], assumptions: [] };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));
const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } };
const save = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { } };
const post = async (op, body) => {
  try {
    const r = await fetch(API + '?op=' + op, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return r.ok && d.ok ? d : { ok: false, error: d.error || 'Something went wrong. Please try again.' };
  } catch (e) { return { ok: false, error: 'No connection just now. Please try again.' }; }
};
// Campaign attribution: kept from the first landing in this browser session.
function campaignNow() {
  let c = {}; try { c = JSON.parse(sessionStorage.getItem('mw_plan_campaign') || '{}'); } catch (e) { }
  if (!c.landing) {
    const q = new URLSearchParams(location.search);
    CAMPAIGN_KEYS.forEach((k) => { if (q.get(k)) c[k] = q.get(k).slice(0, 200); });
    c.landing = location.pathname + location.search; c.referrer = document.referrer ? new URL(document.referrer).hostname : '';
    try { sessionStorage.setItem('mw_plan_campaign', JSON.stringify(c)); } catch (e) { }
  }
  return c;
}

const CSS = `
.mwp{--ink:#111418;--soft:#5b636e;--faint:#8a929c;--line:#e6e8eb;--wash:#f4f5f6;--bg:#ffffff;--card:#ffffff;--field:#ffffff;--paper:#ffffff;--bar:rgba(255,255,255,.86);--btn:#111418;--btnInk:#ffffff;--blue:#3fc8f4;--lime:#d4e25b;--accent:#111418;--r:18px;color-scheme:light}
.mwp[data-theme=dark]{--ink:#f0f0f0;--soft:#c4c4c4;--faint:#8a8a8a;--line:rgba(255,255,255,.08);--wash:#0a0a0a;--bg:#000000;--card:#111111;--field:#000000;--paper:#111111;--bar:rgba(0,0,0,.82);--btn:#2dd4bf;--btnInk:#000000;--accent:#2dd4bf;color-scheme:dark}
.mwp .theme{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;padding:0}
.mwp .theme:hover{border-color:var(--ink)}
.mwp,.mwp *{box-sizing:border-box}
.mwp{min-height:100dvh;background:var(--bg);color:var(--ink);font-family:'Satoshi',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;font-size:16px;line-height:1.5}
.mwp button{font:inherit;cursor:pointer}
.mwp a{color:inherit}
.mwp .bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:calc(12px + env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) 12px max(20px,env(safe-area-inset-left));background:var(--bar);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid transparent}
.mwp .bar.edge{border-bottom-color:var(--line)}
.mwp .bar img{height:34px;width:auto;display:block}
.mwp[data-theme=dark] .bar img,.mwp[data-theme=dark] .sheet .top img{background:#fff;border-radius:10px;padding:4px 8px;box-sizing:content-box}
.mwp .bar .sp{flex:1}
.mwp .bar button{white-space:nowrap}
@media (max-width:479px){.mwp .bar{gap:8px;padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right))}.mwp .bar .tabs button{padding:7px 12px}.mwp .bar .btn.sm{padding:0 12px}.mwp .bar .long{display:none}}
.mwp .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border-radius:999px;border:1px solid var(--btn);background:var(--btn);color:var(--btnInk);font-weight:600;font-size:15px;transition:transform .15s,box-shadow .2s}
.mwp .btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -12px rgba(17,20,24,.45)}
.mwp .btn:active{transform:none}
.mwp .btn.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.mwp .btn.ghost:hover{border-color:var(--ink);box-shadow:none}
.mwp .btn.sm{min-height:38px;padding:0 16px;font-size:14px}
.mwp .btn:disabled{opacity:.45;cursor:default;transform:none;box-shadow:none}
.mwp .btn:focus-visible,.mwp input:focus-visible,.mwp textarea:focus-visible,.mwp select:focus-visible,.mwp .chip:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
/* landing */
.mwp .hero{max-width:1120px;margin:0 auto;padding:clamp(48px,9vh,120px) max(20px,env(safe-area-inset-left)) 40px;display:grid;gap:28px}
.mwp .kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);font-weight:600}
.mwp .kicker i{width:22px;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--blue) 50%,var(--lime) 50%)}
.mwp h1{font-size:clamp(38px,6.4vw,76px);line-height:1.02;letter-spacing:-.035em;margin:0;font-weight:700;max-width:14ch}
.mwp .lede{font-size:clamp(17px,1.6vw,21px);color:var(--soft);max-width:52ch;margin:0}
.mwp .ctas{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.mwp .ctas .note{font-size:14px;color:var(--faint)}
.mwp .steps{max-width:1120px;margin:0 auto;padding:8px max(20px,env(safe-area-inset-left)) 40px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.mwp .step{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px 24px}
.mwp .step b{display:block;font-size:13px;color:var(--faint);font-weight:600;margin-bottom:14px;font-variant-numeric:tabular-nums}
.mwp .step h3{margin:0 0 6px;font-size:19px;letter-spacing:-.01em}
.mwp .step p{margin:0;color:var(--soft);font-size:15px}
.mwp .brands{max-width:1120px;margin:0 auto;padding:12px max(20px,env(safe-area-inset-left)) 72px}
.mwp .brands h4{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin:0 0 14px;font-weight:600}
.mwp .brands div{display:flex;flex-wrap:wrap;gap:8px}
.mwp .brands span{font-size:14px;color:var(--soft);border:1px solid var(--line);border-radius:999px;padding:6px 12px;background:var(--card)}
.mwp .foot{border-top:1px solid var(--line);padding:24px max(20px,env(safe-area-inset-left)) calc(24px + env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between;color:var(--faint);font-size:13px;max-width:1120px;margin:0 auto}
/* workspace */
.mwp .ws{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;max-width:1680px;margin:0 auto;padding:16px max(20px,env(safe-area-inset-right)) 20px max(20px,env(safe-area-inset-left));height:calc(100dvh - 66px - env(safe-area-inset-top))}
.mwp .pane{min-height:0;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden}
.mwp .tabs{display:none}
.mwp .msgs{flex:1;overflow-y:auto;padding:24px clamp(16px,3vw,32px);display:flex;flex-direction:column;gap:18px;overscroll-behavior:contain}
.mwp .m{max-width:min(620px,88%);font-size:15.5px}
.mwp .m.u{align-self:flex-end;background:var(--btn);color:var(--btnInk);padding:11px 16px;border-radius:20px 20px 6px 20px;white-space:pre-wrap;overflow-wrap:anywhere}
.mwp .m.a{align-self:flex-start;color:var(--ink)}
.mwp .m.a p{margin:0 0 8px}.mwp .m.a p:last-child{margin:0}
.mwp .m.a ul{margin:4px 0 8px;padding-left:20px}.mwp .m.a li{margin:3px 0}
.mwp .who{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--faint);font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.mwp .who i{width:16px;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--blue) 50%,var(--lime) 50%)}
.mwp .typing span{display:inline-block;width:7px;height:7px;margin-right:4px;border-radius:50%;background:var(--faint);animation:mwpb 1.2s infinite}
.mwp .typing span:nth-child(2){animation-delay:.15s}.mwp .typing span:nth-child(3){animation-delay:.3s}
@keyframes mwpb{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.mwp .cards{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x mandatory;max-width:100%;-webkit-overflow-scrolling:touch}
.mwp .pc{flex:0 0 232px;scroll-snap-align:start;border:1px solid var(--line);border-radius:16px;background:var(--card);overflow:hidden;display:flex;flex-direction:column}
.mwp .pc .img{height:128px;background:var(--wash) center/cover no-repeat;border-bottom:1px solid var(--line)}
.mwp .pc .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
.mwp .pc .v{font-size:12px;color:var(--faint);font-weight:600;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mwp .pc .n{font-size:15px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mwp .pc .c{font-size:13px;color:var(--soft);font-variant-numeric:tabular-nums}
.mwp .pc .s{font-size:12.5px;color:var(--faint);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mwp .pc .btn{margin-top:auto;align-self:flex-start}
.mwp .starters{display:flex;flex-wrap:wrap;gap:8px}
.mwp .chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:9px 14px;font-size:14px;color:var(--ink);text-align:left}
.mwp .chip:hover{border-color:var(--ink)}
.mwp .comp{border-top:1px solid var(--line);padding:12px clamp(12px,2vw,20px) calc(12px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:flex-end;background:var(--card)}
.mwp .comp textarea{flex:1;resize:none;border:1px solid var(--line);border-radius:22px;padding:12px 16px;font:inherit;font-size:16px;line-height:1.4;max-height:160px;min-height:48px;background:var(--field);color:var(--ink)}
.mwp .comp .btn{min-height:48px;width:48px;padding:0}
/* the quote */
.mwp .qhead{display:flex;align-items:center;gap:12px;padding:16px clamp(16px,3vw,28px);border-bottom:1px solid var(--line)}
.mwp .qhead h2{margin:0;font-size:18px;letter-spacing:-.01em;flex:1}
.mwp .badge{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;border-radius:999px;padding:5px 10px;background:var(--wash);color:var(--soft)}
.mwp .doc{flex:1;overflow-y:auto;padding:clamp(18px,3vw,36px);background:var(--wash)}
.mwp .sheet{max-width:760px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 60px -40px rgba(17,20,24,.35);overflow:hidden}
.mwp .sheet .stripe{height:6px;background:linear-gradient(90deg,var(--blue) 50%,var(--lime) 50%)}
.mwp .sheet .in{padding:clamp(20px,4vw,40px)}
.mwp .sheet .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}
.mwp .sheet .top img{height:40px}
.mwp .sheet .ref{text-align:right;font-size:12px;color:var(--faint);line-height:1.6}
.mwp .sheet h3{font-size:clamp(22px,2.6vw,28px);margin:0 0 4px;letter-spacing:-.02em}
.mwp .notice{margin:18px 0 22px;padding:12px 14px;border-radius:12px;background:var(--wash);font-size:13.5px;color:var(--soft)}
.mwp .notice b{color:var(--ink)}
.mwp .lbl{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:700;margin:26px 0 10px}
.mwp .facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px}
.mwp .facts label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--faint);font-weight:600}
.mwp .facts input{border:1px solid var(--line);border-radius:10px;padding:9px 11px;font:inherit;font-size:15px;color:var(--ink);background:var(--field);min-width:0}
.mwp .item{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:start;padding:14px 0;border-top:1px solid var(--line)}
.mwp .item .th{width:64px;height:64px;border-radius:10px;background:var(--wash) center/cover no-repeat;border:1px solid var(--line)}
.mwp .item .t{font-weight:600;font-size:15px;line-height:1.3}
.mwp .item .m2{font-size:13px;color:var(--soft);margin-top:2px}
.mwp .item .nt{margin-top:8px;width:100%;border:1px solid transparent;border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;color:var(--soft);background:var(--wash)}
.mwp .item .nt:focus{border-color:var(--line);background:var(--field)}
.mwp .qty{display:flex;align-items:center;border:1px solid var(--line);border-radius:999px;overflow:hidden;height:38px}
.mwp .qty button{width:36px;height:38px;border:0;background:transparent;font-size:18px;color:var(--ink)}
.mwp .qty input{width:52px;text-align:center;border:0;font:inherit;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink);background:transparent;-moz-appearance:textfield}
.mwp .qty input::-webkit-inner-spin-button{-webkit-appearance:none}
.mwp .rm{border:0;background:none;color:var(--faint);font-size:13px;margin-top:8px;text-decoration:underline;text-underline-offset:3px}
.mwp .empty{padding:28px 0;color:var(--faint);font-size:15px;text-align:center}
.mwp .assume li{color:var(--soft);font-size:14px;margin:4px 0}
.mwp .warn{font-size:13px;color:#b7791f;background:rgba(251,191,36,.12);border-radius:10px;padding:10px 12px;margin-top:12px}
.mwp .qfoot{display:flex;gap:10px;flex-wrap:wrap;padding:14px clamp(16px,3vw,28px) calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--card)}
.mwp .qfoot .btn{flex:1 1 200px}
/* request sheet */
.mwp .scrim{position:fixed;inset:0;z-index:50;background:rgba(17,20,24,.4);display:flex;align-items:center;justify-content:center;padding:20px;animation:mwpf .2s}
@keyframes mwpf{from{opacity:0}}
.mwp .dlg{width:min(560px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;background:var(--card);color:var(--ink);border-radius:24px;padding:28px;box-shadow:0 40px 80px -30px rgba(0,0,0,.5)}
.mwp .dlg h3{margin:0 0 6px;font-size:22px;letter-spacing:-.02em}
.mwp .dlg p{margin:0 0 18px;color:var(--soft);font-size:15px}
.mwp .form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.mwp .form label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:var(--soft)}
.mwp .form .w{grid-column:1/-1}
.mwp .form input,.mwp .form select{border:1px solid var(--line);border-radius:12px;padding:12px;font:inherit;font-size:16px;color:var(--ink);background:var(--field);min-width:0}
.mwp .err{color:#b42318;font-size:14px;margin-top:12px}
.mwp .ok{text-align:center;padding:8px 0}
.mwp .ok .tick{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,var(--blue),var(--lime));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700}
.mwp .ok .row{display:flex;flex-direction:column;gap:10px;margin-top:18px}
/* phones and narrow tablets: one pane at a time */
@media (max-width:899px){
  .mwp .ws{grid-template-columns:1fr;padding:0;gap:0;height:calc(100dvh - 58px - env(safe-area-inset-top))}
  .mwp .pane{border:0;border-radius:0}
  .mwp .ws[data-tab=chat] .pane.q,.mwp .ws[data-tab=plan] .pane.c{display:none}
  .mwp .tabs{display:flex;gap:4px;padding:4px;background:var(--wash);border-radius:999px}
  .mwp .tabs button{border:0;background:transparent;border-radius:999px;padding:7px 14px;font-size:14px;font-weight:600;color:var(--soft)}
  .mwp .tabs button[aria-pressed=true]{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .mwp .bar img{height:28px}
  .mwp .steps{grid-template-columns:1fr}
  .mwp .facts,.mwp .form{grid-template-columns:1fr}
  .mwp .doc{padding:12px}
  .mwp .sheet{border-radius:12px}
  .mwp .item{grid-template-columns:52px minmax(0,1fr);}
  .mwp .item .th{width:52px;height:52px}
  .mwp .item .side{grid-column:2;display:flex;align-items:center;gap:14px}
  .mwp .item .side .rm{margin:0}
  .mwp .dlg{border-radius:22px 22px 0 0;align-self:flex-end;max-height:92dvh;padding:24px 20px calc(24px + env(safe-area-inset-bottom))}
  .mwp .scrim{padding:0;align-items:flex-end}
}
@media (max-width:899px) and (orientation:landscape) and (max-height:520px){.mwp .bar{padding-top:6px;padding-bottom:6px}.mwp .ws{height:calc(100dvh - 46px)}.mwp .hero{padding-top:28px}}
/* dual-screen devices: one pane per screen, the hinge between them */
@media (horizontal-viewport-segments:2){
  .mwp .ws{grid-template-columns:env(viewport-segment-width 0 0) env(viewport-segment-width 1 0);column-gap:calc(env(viewport-segment-left 1 0) - env(viewport-segment-right 0 0));padding:0;height:calc(100dvh - 66px)}
  .mwp .ws[data-tab] .pane{display:flex}
  .mwp .tabs{display:none}
  .mwp .pane{border-radius:0;border-width:0 0 0 0}
}
@media (vertical-viewport-segments:2){
  .mwp .ws{grid-template-columns:1fr;grid-template-rows:calc(env(viewport-segment-height 0 0) - 66px) env(viewport-segment-height 0 1);row-gap:calc(env(viewport-segment-top 0 1) - env(viewport-segment-bottom 0 0));padding:0;height:auto}
  .mwp .ws[data-tab] .pane{display:flex}
  .mwp .tabs{display:none}
}
@media (min-width:1800px){.mwp{font-size:17px}.mwp .ws{gap:28px}}
@media (prefers-reduced-motion:reduce){.mwp *{animation:none!important;transition:none!important}}
`;

// Assistant text: paragraphs, "- " bullets and **bold**, rendered as elements (never as HTML).
function Rich({ text }) {
  const blocks = []; let list = null;
  String(text || '').split('\n').forEach((line) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) { if (!list) { list = []; blocks.push({ list }); } list.push(t.replace(/^[-*•]\s+/, '')); }
    else { list = null; if (t) blocks.push({ p: t }); }
  });
  const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (/^\*\*[^*]+\*\*$/.test(x) ? <strong key={i}>{x.slice(2, -2)}</strong> : <React.Fragment key={i}>{x}</React.Fragment>));
  return blocks.map((b, i) => (b.list ? <ul key={i}>{b.list.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul> : <p key={i}>{inline(b.p)}</p>));
}

function ProductCard({ p, onAdd, added }) {
  return (
    <div className="pc" data-product={p.code}>
      <div className="img" style={p.image ? { backgroundImage: 'url(' + p.image + ')' } : undefined} role="img" aria-label={p.name || p.code} />
      <div className="bd">
        <div className="v">{p.vendor}</div>
        <div className="n">{p.name || p.series || p.code}</div>
        <div className="c">Model {p.code}</div>
        {p.specs && <div className="s">{p.specs}</div>}
        <button type="button" className={'btn sm' + (added ? ' ghost' : '')} onClick={() => onAdd(p)} style={{ marginTop: 10 }} disabled={added}>{added ? 'In your plan' : 'Add to plan'}</button>
      </div>
    </div>
  );
}

function Landing({ onStart, vendors }) {
  return (
    <>
      <section className="hero">
        <div className="kicker"><i />Midwest Furniture Planner</div>
        <h1>Plan your space in minutes.</h1>
        <p className="lede">Describe your classroom, library, office or commons. Explore real furniture from the brands Midwest carries, and leave with a planning quote you can download and share.</p>
        <div className="ctas">
          <button type="button" className="btn" onClick={onStart} data-cta="start">Start planning</button>
          <span className="note">Free. No account needed.</span>
        </div>
      </section>
      <section className="steps" aria-label="How it works">
        <div className="step"><b>01</b><h3>Describe your space</h3><p>Room type, how many people, size and timeline, in your own words.</p></div>
        <div className="step"><b>02</b><h3>Explore options</h3><p>Real products from manufacturer catalogues, with alternatives and quantities.</p></div>
        <div className="step"><b>03</b><h3>Download your plan</h3><p>A clean planning quote as a PDF. Ask Midwest for pricing when you are ready.</p></div>
      </section>
      {vendors.length > 0 && <section className="brands"><h4>Brands in the planner</h4><div>{vendors.slice(0, 40).map((v) => <span key={v}>{v}</span>)}</div></section>}
      <footer className="foot"><span>Midwest Educational Furnishings</span><span>Planning quotes are not priced offers. Pricing and availability are confirmed by Midwest.</span></footer>
    </>
  );
}

function RequestDialog({ plan, onClose, makePdf, campaign }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', company: plan.project.organization || '', title: '', city: '', state: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(null);
  const reqId = useRef(uid());   // the same id on every retry, so a repeat never makes a second card
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const send = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('');
    let pdf = ''; try { const bytes = await makePdf(f); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); pdf = btoa(s); } catch (x) { pdf = ''; }
    const r = await post('request', { requestId: reqId.current, contact: f, plan: { project: plan.project, assumptions: plan.assumptions, items: plan.items.map((i) => ({ vendor: i.vendor, code: i.code, name: i.name, qty: i.qty, note: i.note, catalog: i.catalog, page: i.page })) }, campaign, pdf });
    setBusy(false);
    if (r.ok) setDone(r); else setErr(r.error);
  };
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label="Request a priced quote">
        {done ? (
          <div className="ok" data-request="saved">
            <div className="tick">&#10003;</div>
            <h3>Your request is in</h3>
            <p>Midwest has your plan and will follow up with pricing. Keep your PDF for your records.</p>
            <div className="row">
              {done.booking && <a className="btn" href={done.booking} target="_blank" rel="noopener noreferrer" data-booking>Book a call with Midwest</a>}
              <button type="button" className="btn ghost" onClick={onClose}>Back to my plan</button>
            </div>
          </div>
        ) : (
          <form onSubmit={send}>
            <h3>Request a priced quote</h3>
            <p>Midwest will price your plan and reach out. Nothing is ordered and there is no commitment.</p>
            <div className="form">
              <label>Your name<input required autoComplete="name" value={f.name} onChange={set('name')} /></label>
              <label>Email<input required type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
              <label>Phone<input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
              <label>Title<input autoComplete="organization-title" value={f.title} onChange={set('title')} /></label>
              <label className="w">School or company<input required autoComplete="organization" value={f.company} onChange={set('company')} /></label>
              <label>City<input autoComplete="address-level2" value={f.city} onChange={set('city')} /></label>
              <label>State<input autoComplete="address-level1" value={f.state} onChange={set('state')} /></label>
            </div>
            {err && <div className="err" role="alert">{err}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="submit" className="btn" disabled={busy} style={{ flex: '1 1 200px' }}>{busy ? 'Sending' : 'Send request'}</button>
              <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Planner() {
  const kept = useMemo(() => load(), []);
  const [view, setView] = useState(kept && kept.messages && kept.messages.length ? 'plan' : 'landing');
  const [messages, setMessages] = useState((kept && kept.messages) || []);
  const [plan, setPlan] = useState((kept && kept.plan) || EMPTY_PLAN);
  const [ref] = useState(() => (kept && kept.ref) || 'MW-' + uid().slice(0, 8).toUpperCase());
  const [draft, setDraft] = useState(''); const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('chat'); const [asking, setAsking] = useState(false); const [vendors, setVendors] = useState([]);
  const [unknown, setUnknown] = useState([]); const [scrolled, setScrolled] = useState(false); const [pdfBusy, setPdfBusy] = useState(false);
  const campaign = useMemo(() => campaignNow(), []);
  // The visitor's own choice wins; otherwise the look Midwest set as the default (Users & Permissions >> Furniture Planner).
  const chosen = useMemo(() => { try { const t = localStorage.getItem('mw_plan_theme'); return t === 'dark' || t === 'light' ? t : ''; } catch (e) { return ''; } }, []);
  const [theme, setTheme] = useState(chosen || 'light');
  const flip = () => setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('mw_plan_theme', n); } catch (e) { } return n; });
  useEffect(() => { document.body.style.background = theme === 'dark' ? '#000000' : '#ffffff'; }, [theme]);
  const end = useRef(null);
  useEffect(() => { save({ messages, plan, ref }); }, [messages, plan, ref]);
  useEffect(() => { fetch(API + '?op=config').then((r) => r.json()).then((d) => { setVendors(Array.isArray(d.vendors) ? d.vendors : []); if (!chosen && d.theme === 'dark') setTheme('dark'); }).catch(() => { }); }, []);
  useEffect(() => { document.title = 'Midwest Furniture Planner'; const on = () => setScrolled(window.scrollY > 4); window.addEventListener('scroll', on); return () => window.removeEventListener('scroll', on); }, []);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  const inPlan = useMemo(() => new Set(plan.items.map((i) => i.id)), [plan.items]);
  const send = useCallback(async (text) => {
    const t = String(text || '').trim(); if (!t || busy) return;
    const next = [...messages, { role: 'user', text: t }];
    setMessages(next); setDraft(''); setBusy(true);
    const r = await post('chat', { messages: next.map((m) => ({ role: m.role, text: m.text })), plan: { project: plan.project, assumptions: plan.assumptions, items: plan.items.map((i) => ({ catalog_id: i.catalogId, code: i.code, qty: i.qty, note: i.note })) } });
    setBusy(false);
    if (!r.ok) { setMessages([...next, { role: 'assistant', text: r.error, failed: true }]); return; }
    if (r.plan) { setPlan({ project: { ...plan.project, ...r.plan.project }, items: r.plan.items, assumptions: r.plan.assumptions }); }
    setUnknown(Array.isArray(r.unknown) ? r.unknown : []);
    setMessages([...next, { role: 'assistant', text: r.reply || 'Here is what I found.', products: r.products || [] }]);
  }, [messages, plan, busy]);
  const add = (p) => setPlan((x) => (x.items.some((i) => i.id === p.id) ? x : { ...x, items: [...x.items, { ...p, qty: 1, note: '', confirmed: true }] }));
  const setItem = (id, patch) => setPlan((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const remove = (id) => setPlan((x) => ({ ...x, items: x.items.filter((i) => i.id !== id) }));
  const setFact = (k) => (e) => { const v = e.target.value; setPlan((x) => ({ ...x, project: { ...x.project, [k]: v } })); };
  const pieces = plan.items.reduce((n, i) => n + (Number(i.qty) || 0), 0);
  const makePdf = async (contact) => {
    const [{ buildPlanPdf }, logo] = await Promise.all([import('./planPdf.js'), fetch('/mw-logo.png').then((r) => r.arrayBuffer()).catch(() => null)]);
    return buildPlanPdf({ plan, contact, logoBytes: logo, refId: ref });
  };
  const download = async () => {
    setPdfBusy(true);
    try {
      const bytes = await makePdf(null);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'Midwest-planning-quote-' + ref + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setPdfBusy(false); }
  };
  const reset = () => { if (!window.confirm('Start a new plan? This clears the conversation and the plan on this device.')) return; setMessages([]); setPlan(EMPTY_PLAN); setUnknown([]); };
  const facts = [['room', 'Space'], ['organization', 'School or organization'], ['headcount', 'People'], ['dimensions', 'Dimensions'], ['age_group', 'Age group'], ['timeline', 'Timeline'], ['location', 'Location'], ['constraints', 'Constraints']];

  return (
    <div className="mwp" data-view={view} data-theme={theme}>
      <style>{CSS}</style>
      <header className={'bar' + (scrolled || view === 'plan' ? ' edge' : '')}>
        <a href="/plan" onClick={(e) => { e.preventDefault(); setView('landing'); }} aria-label="Midwest Furniture Planner home"><img src="/mw-logo.png" alt="Midwest" width="60" height="34" /></a>
        <span className="sp" />
        <button type="button" className="theme" onClick={flip} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} data-theme-toggle>{theme === 'dark' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" /></svg>}</button>
        {view === 'plan' ? (
          <>
            <div className="tabs" role="group" aria-label="Show">
              <button type="button" aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Chat</button>
              <button type="button" aria-pressed={tab === 'plan'} onClick={() => setTab('plan')} data-tab-plan>Plan{plan.items.length ? ' (' + plan.items.length + ')' : ''}</button>
            </div>
            <button type="button" className="btn ghost sm" onClick={reset}>New<span className="long"> plan</span></button>
          </>
        ) : <button type="button" className="btn sm" onClick={() => setView('plan')}>Start planning</button>}
      </header>
      {view === 'landing' ? <Landing onStart={() => setView('plan')} vendors={vendors} /> : (
        <main className="ws" data-tab={tab}>
          <section className="pane c" aria-label="Planning conversation">
            <div className="msgs" aria-live="polite">
              <div className="m a"><div className="who"><i />Midwest Planner</div><p>Hi! Tell me about the space you are planning: what kind of room, about how many people, and anything I should know. I will suggest real furniture from the brands Midwest carries and build your planning quote as we go.</p>
                {!messages.length && <div className="starters" style={{ marginTop: 12 }}>{STARTERS.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}</div>}
              </div>
              {messages.map((m, i) => (
                <div key={i} className={'m ' + (m.role === 'user' ? 'u' : 'a')}>
                  {m.role === 'user' ? m.text : <>
                    <div className="who"><i />Midwest Planner</div><Rich text={m.text} />
                    {m.products && m.products.length > 0 && <div className="cards" style={{ marginTop: 12 }}>{m.products.map((p) => <ProductCard key={p.id} p={p} onAdd={add} added={inPlan.has(p.id)} />)}</div>}
                  </>}
                </div>
              ))}
              {busy && <div className="m a"><div className="who"><i />Midwest Planner</div><div className="typing" aria-label="Thinking"><span /><span /><span /></div></div>}
              <div ref={end} />
            </div>
            <form className="comp" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <textarea rows={1} value={draft} placeholder="Describe your space or ask about a product" aria-label="Message" maxLength={2000}
                onChange={(e) => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(160, e.target.scrollHeight) + 'px'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(draft); } }} />
              <button type="submit" className="btn" disabled={busy || !draft.trim()} aria-label="Send">&#8593;</button>
            </form>
          </section>
          <section className="pane q" aria-label="Your planning quote">
            <div className="qhead"><h2>Your planning quote</h2><span className="badge">No prices</span></div>
            <div className="doc">
              <article className="sheet" data-quote>
                <div className="stripe" />
                <div className="in">
                  <div className="top"><img src="/mw-logo.png" alt="Midwest" /><div className="ref">Planning quote<br />{ref}<br />{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
                  <h3>{plan.project.room ? plan.project.room : 'Your furniture plan'}</h3>
                  <div style={{ color: 'var(--soft)', fontSize: 14 }}>{plan.items.length ? pieces + (pieces === 1 ? ' piece' : ' pieces') + ' across ' + plan.items.length + (plan.items.length === 1 ? ' product' : ' products') : 'Products appear here as you plan.'}</div>
                  <div className="notice"><b>Planning quote, not a priced offer.</b> Products and quantities for review. Pricing, availability and lead times are confirmed by Midwest.</div>
                  <div className="lbl">Project</div>
                  <div className="facts">{facts.map(([k, l]) => <label key={k}>{l}<input value={plan.project[k] || ''} onChange={setFact(k)} placeholder="Add" /></label>)}</div>
                  <div className="lbl">Furniture</div>
                  {plan.items.length === 0 && <div className="empty">Ask the planner for ideas, or add products from the suggestions.</div>}
                  {plan.items.map((it) => (
                    <div className="item" key={it.id} data-item={it.code}>
                      <div className="th" style={it.image ? { backgroundImage: 'url(' + it.image + ')' } : undefined} />
                      <div style={{ minWidth: 0 }}>
                        <div className="t">{it.name || it.series || it.code}</div>
                        <div className="m2">{it.vendor} &middot; Model {it.code}{it.page ? ' · catalogue page ' + it.page : ''}</div>
                        <input className="nt" value={it.note || ''} placeholder="Add a note (finish, size, placement)" onChange={(e) => setItem(it.id, { note: e.target.value.slice(0, 200) })} aria-label={'Note for ' + it.code} />
                      </div>
                      <div className="side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div className="qty">
                          <button type="button" aria-label="Fewer" onClick={() => setItem(it.id, { qty: Math.max(1, (Number(it.qty) || 1) - 1) })}>&minus;</button>
                          <input inputMode="numeric" value={it.qty} aria-label={'Quantity of ' + it.code} onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); setItem(it.id, { qty: Number.isFinite(n) ? Math.min(10000, Math.max(1, n)) : 1 }); }} />
                          <button type="button" aria-label="More" onClick={() => setItem(it.id, { qty: Math.min(10000, (Number(it.qty) || 1) + 1) })}>+</button>
                        </div>
                        <button type="button" className="rm" onClick={() => remove(it.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  {unknown.length > 0 && <div className="warn">Not confirmed in the catalogues and left out: {unknown.join(', ')}. A Midwest specialist can help with these.</div>}
                  {plan.assumptions.length > 0 && <><div className="lbl">Assumptions</div><ul className="assume">{plan.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
                </div>
              </article>
            </div>
            <div className="qfoot">
              <button type="button" className="btn ghost" onClick={download} disabled={!plan.items.length || pdfBusy} data-download>{pdfBusy ? 'Preparing PDF' : 'Download PDF'}</button>
              <button type="button" className="btn" onClick={() => setAsking(true)} disabled={!plan.items.length} data-request-open>Request a priced quote</button>
            </div>
          </section>
        </main>
      )}
      {asking && <RequestDialog plan={plan} onClose={() => setAsking(false)} makePdf={makePdf} campaign={campaign} />}
    </div>
  );
}
