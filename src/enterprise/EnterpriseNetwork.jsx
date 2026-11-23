import React, { useEffect, useRef, useState } from 'react';
import { ENTERPRISE_TABS, ENTERPRISE_VERSION, enterpriseMessage, enterpriseSession, enterpriseRpc, selectedShare } from './protocol.mjs';
import './enterprise.css';

async function requestSession(getToken, signal) {
  const token = typeof getToken === 'function' ? await getToken() : '';
  if (!token) throw new Error('Your current sign-in cannot verify your Network identity yet. Your admin can finish the connection setup.');
  const response = await fetch('/api/enterprise-network', {
    method: 'POST', signal, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'session' }), cache: 'no-store', credentials: 'same-origin',
  });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new Error(data.error || 'The Network connection is not available for this installation.');
  const session = enterpriseSession(data);
  if (!session) throw new Error('The Network returned an invalid or expired session. Try again.');
  if (session.frame.origin === window.location.origin) throw new Error('The shared Network must use its own isolated origin.');
  return session;
}

export default function EnterpriseNetwork({ currentUser, getToken, initialTab = 'network', screenLabel = '', onClose }) {
  const [tab, setTab] = useState(ENTERPRISE_TABS.includes(initialTab) ? initialTab : 'network');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ phase: 'loading', error: '' });
  const [shareOpen, setShareOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [includeScreen, setIncludeScreen] = useState(false);
  const [files, setFiles] = useState([]);
  const [shareError, setShareError] = useState('');
  const frame = useRef(null);
  const sessionRef = useRef(null);
  const nonceRef = useRef('');
  const tabRef = useRef(tab);
  const memberId = String(currentUser && currentUser.id || '');
  const dialog = useRef(null);
  const tokenGetter = useRef(getToken);
  tokenGetter.current = getToken;

  function post(type, body = {}) {
    const session = sessionRef.current;
    if (!session || !frame.current || Date.now() >= session.expires) return;
    frame.current.contentWindow.postMessage({ type, version: ENTERPRISE_VERSION, nonce: nonceRef.current, ...body }, session.frame.origin);
  }

  useEffect(() => {
    const controller = new AbortController();
    sessionRef.current = null;
    nonceRef.current = crypto.randomUUID();
    setState({ phase: 'loading', error: '' });
    setShareOpen(false);
    setDescription('');
    setFiles([]);
    setIncludeScreen(false);
    let timeout;
    let expiration;
    const pending = new Set();
    const completed = new Set();
    let accepted = false;
    if (!memberId) {
      setState({ phase: 'error', error: 'Sign in to Midwest to open your Network.' });
      return () => controller.abort();
    }
    requestSession(() => tokenGetter.current && tokenGetter.current(), controller.signal).then(session => {
      if (controller.signal.aborted) return;
      sessionRef.current = session;
      setState({ phase: 'connecting', session, error: '' });
      timeout = setTimeout(() => {
        sessionRef.current = null;
        setState({ phase: 'error', error: 'The shared Network view did not finish connecting. Try again.' });
      }, 15000);
      expiration = setTimeout(() => {
        sessionRef.current = null;
        setState({ phase: 'error', error: 'Your short-lived Network session expired. Reconnect to verify current access.' });
      }, session.expires - Date.now());
    }).catch(error => {
      if (!controller.signal.aborted) setState({ phase: 'error', error: error.message || 'The Network could not connect.' });
    });

    function receive(event) {
      const session = sessionRef.current;
      const child = frame.current && frame.current.contentWindow;
      if (!session || Date.now() >= session.expires) return;
      if (enterpriseMessage(event, child, session.frame.origin, nonceRef.current, 'dyfrent.enterprise.ready')) {
        post('dyfrent.enterprise.session', { session_id: session.session_id, tab: tabRef.current });
      }
      if (enterpriseMessage(event, child, session.frame.origin, nonceRef.current, 'dyfrent.enterprise.accepted')) {
        clearTimeout(timeout);
        accepted = true;
        setState({ phase: 'ready', session, error: '' });
      }
      if (enterpriseMessage(event, child, session.frame.origin, nonceRef.current, 'dyfrent.enterprise.revoked')) {
        sessionRef.current = null;
        setState({ phase: 'error', error: 'Your Network access changed. Reconnect to verify your membership.' });
      }
      if (enterpriseMessage(event, child, session.frame.origin, nonceRef.current, 'dyfrent.enterprise.tab') && ENTERPRISE_TABS.includes(event.data.tab)) {
        setTab(event.data.tab);
      }
      if (enterpriseMessage(event, child, session.frame.origin, nonceRef.current, 'dyfrent.enterprise.rpc') && accepted && enterpriseRpc(event.data)) {
        const request = event.data;
        if (pending.has(request.request_id) || completed.has(request.request_id) || pending.size >= 8 || completed.size >= 256) return;
        pending.add(request.request_id);
        (async () => {
          try {
            const token = await tokenGetter.current();
            if (!token || controller.signal.aborted) return;
            const response = await fetch('/api/enterprise-network', {
              method: 'POST', signal: controller.signal, credentials: 'same-origin', cache: 'no-store',
              headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ op: 'call', action: request.action, payload: request.payload, request_id: request.request_id }),
            });
            const result = await response.json();
            if (controller.signal.aborted || sessionRef.current !== session) return;
            post('dyfrent.enterprise.rpc.result', { request_id: request.request_id, status: response.status, result });
          } catch {
            if (!controller.signal.aborted && sessionRef.current === session) post('dyfrent.enterprise.rpc.result', {
              request_id: request.request_id, status: 503, result: { ok: false, error: 'The Network could not answer. Check the thread before retrying a send.' },
            });
          } finally { pending.delete(request.request_id); completed.add(request.request_id); }
        })();
      }
    }
    window.addEventListener('message', receive);
    return () => {
      controller.abort();
      clearTimeout(timeout);
      clearTimeout(expiration);
      window.removeEventListener('message', receive);
      sessionRef.current = null;
      nonceRef.current = '';
    };
  }, [memberId, attempt]);

  useEffect(() => {
    tabRef.current = tab;
    if (state.phase === 'ready') post('dyfrent.enterprise.navigate', { tab });
  }, [tab, state.phase]);

  useEffect(() => {
    if (!shareOpen) return;
    const previous = document.activeElement;
    function keyboard(event) {
      if (event.key === 'Escape') { event.preventDefault(); setShareOpen(false); }
      if (event.key !== 'Tab' || !dialog.current) return;
      const controls = Array.from(dialog.current.querySelectorAll('button,input,textarea,[tabindex="0"]')).filter(element => !element.disabled);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('keydown', keyboard); if (previous && previous.isConnected) previous.focus(); };
  }, [shareOpen]);

  function share() {
    try {
      const payload = selectedShare(description, screenLabel, includeScreen, files);
      if (state.phase !== 'ready') throw new Error('Connect to the Network before preparing a message.');
      post('dyfrent.enterprise.share-preview', { recipient: 'jarvis', payload });
      setShareOpen(false);
      setDescription('');
      setFiles([]);
      setIncludeScreen(false);
      setTab('messages');
    } catch (error) { setShareError(error.message); }
  }

  return <section className="enterprise-network" aria-label="DYFRENT Network">
    <header className="enterprise-network-header">
      <div><h1>Network</h1><p>{currentUser && currentUser.name || 'Your profile'}<span aria-hidden="true"> &gt;&gt; </span> Midwest</p></div>
      <div className="enterprise-actions">
        <button type="button" disabled={state.phase !== 'ready' || state.session.capabilities?.share_preview !== true} onClick={() => { setShareError(''); setShareOpen(true); }}>Ask Jarvis about this screen</button>
        {onClose && <button type="button" aria-label="Close Network" onClick={onClose}>Close</button>}
      </div>
    </header>
    <nav className="enterprise-tabs" aria-label="Network views">{ENTERPRISE_TABS.map(value => <button type="button" key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</nav>
    {state.phase === 'loading' && <div className="enterprise-state" role="status" aria-busy="true"><div className="enterprise-skeleton" /><p>Verifying your company and membership</p></div>}
    {state.phase === 'error' && <div className="enterprise-state" role="alert"><h2>Network connection unavailable</h2><p>{state.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {(state.phase === 'connecting' || state.phase === 'ready') && <div className="enterprise-frame-wrap">
      {state.phase === 'connecting' && <p className="enterprise-connecting" role="status">Connecting the shared Network view</p>}
      <iframe ref={frame} key={memberId + ':' + attempt} title="DYFRENT Profile, Network and Messages" src={state.session.frame.href}
        sandbox="allow-scripts allow-forms allow-same-origin allow-downloads" referrerPolicy="no-referrer"
        onLoad={() => post('dyfrent.enterprise.hello')} onError={() => { sessionRef.current = null; setState({ phase: 'error', error: 'The shared Network view could not load.' }); }} />
    </div>}
    <p className="enterprise-pickup">{state.session && state.session.capabilities && state.session.capabilities.direct_wake_verified === true ? 'Direct wake verified for this connection' : 'Ordinary inbox pickup available after your AI is paired'}</p>
    {shareOpen && <div className="enterprise-modal-backdrop"><div ref={dialog} className="enterprise-modal" role="dialog" aria-modal="true" aria-labelledby="enterprise-share-title">
      <h2 id="enterprise-share-title">Prepare a question for Jarvis</h2>
      <p>Choose the information to include. The shared Messages composer opens a draft for your final review.</p>
      <label>Description<textarea autoFocus value={description} maxLength={4000} onChange={event => setDescription(event.target.value)} /></label>
      {screenLabel && <label className="enterprise-check"><input type="checkbox" checked={includeScreen} onChange={event => setIncludeScreen(event.target.checked)} />Include screen name <strong>{screenLabel}</strong></label>}
      <label>Attachments<input type="file" multiple onChange={event => setFiles(Array.from(event.target.files || []))} /></label>
      {files.length > 0 && <ul>{files.map((file, index) => <li key={index}>{file.name} <button type="button" aria-label={'Remove ' + file.name} onClick={() => setFiles(values => values.filter((_, fileIndex) => fileIndex !== index))}>Remove</button></li>)}</ul>}
      <div className="enterprise-share-summary"><strong>Preview</strong><p>{description || 'Your question will appear here.'}</p>{includeScreen && <p>Screen name {screenLabel}</p>}<p>{files.length} selected attachment{files.length === 1 ? '' : 's'}</p></div>
      {shareError && <p role="alert">{shareError}</p>}
      <div className="enterprise-actions"><button type="button" onClick={() => setShareOpen(false)}>Cancel</button><button type="button" onClick={share}>Open draft in Messages</button></div>
    </div></div>}
  </section>;
}
