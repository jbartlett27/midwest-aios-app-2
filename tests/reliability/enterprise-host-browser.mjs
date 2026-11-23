import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const origin = 'http://127.0.0.1:4786';
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4786', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let boot = '';
preview.stdout.on('data', chunk => { boot += chunk; });
preview.stderr.on('data', chunk => { boot += chunk; });
const deadline = Date.now() + 20000;
while (!boot.includes('4786') && Date.now() < deadline && preview.exitCode === null) await new Promise(resolve => setTimeout(resolve, 100));
assert.ok(boot.includes('4786'), boot);
let browser;
try { browser = await chromium.launch({ executablePath: process.env.AIOS_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }); }
catch (error) { preview.kill('SIGTERM'); throw error; }
const evidence = new URL('../../docs/enterprise-preview/', import.meta.url);
await mkdir(evidence, { recursive: true });
const requests = [];
let mode = 'blocked';
let sessionMember = 'fixture-maureen';
const page = await browser.newPage();
await page.route('**/api/enterprise-network', async route => {
  const request = route.request().postDataJSON();
  requests.push(request);
  if (mode === 'loading') return;
  if (mode === 'blocked') return route.fulfill({ status: 403, json: { ok: false, error: 'This enterprise installation is awaiting admin pairing and review.' } });
  if (request.op === 'call') return route.fulfill({ json: { ok: false, error: 'Canonical participant adapter is pending.' } });
  return route.fulfill({ json: { ok: true, session_id: 'synthetic-nonsecret-session', member: { id: sessionMember }, ui_url: 'https://network-fixture.example/enterprise', expires_at: new Date(Date.now() + (mode === 'expired' ? -1000 : 60000)).toISOString(), capabilities: { direct_wake_verified: false, share_preview: true } } });
});
await page.route('https://network-fixture.example/enterprise', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body style="background:#000;color:#aaa;font:16px sans-serif;padding:24px"><h2>Shared component receiver pending</h2><p>This synthetic frame exercises the secure connection handshake.</p><p>Source Profile, Network and Messages parity is unverified.</p><script>let nonce;addEventListener('message',event=>{if(event.origin!=='${origin}')return;const d=event.data;if(d.type==='dyfrent.enterprise.hello'){nonce=d.nonce;parent.postMessage({type:'dyfrent.enterprise.ready',version:1,nonce},event.origin)}if(d.type==='dyfrent.enterprise.session'){window.sessionMessage=d;parent.postMessage({type:'dyfrent.enterprise.accepted',version:1,nonce},event.origin)}if(d.type==='dyfrent.enterprise.share-preview')window.shared=d.payload;});</script></body></html>` }));
try {
  for (const [label, width, height] of [['desktop', 1440, 960], ['phone', 390, 844], ['split', 700, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin + '/enterprise-preview.html');
    await page.getByRole('heading', { name: 'Network connection unavailable' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: new URL('host-blocked-' + label + '.png', evidence).pathname, fullPage: true });
  }
  mode = 'loading';
  await page.goto(origin + '/enterprise-preview.html');
  await page.getByText('Verifying your company and membership').waitFor();
  await page.screenshot({ path: new URL('host-loading.png', evidence).pathname, fullPage: true });
  mode = 'expired';
  await page.goto(origin + '/enterprise-preview.html');
  await page.getByText('The Network returned an invalid or expired session. Try again.').waitFor();
  await page.screenshot({ path: new URL('host-expired.png', evidence).pathname, fullPage: true });
  mode = 'ready';
  await page.goto(origin + '/enterprise-preview.html');
  await page.getByRole('button', { name: 'Ask Jarvis about this screen' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.enterprise-actions button').disabled);
  const child = page.frames().find(frame => frame.url().includes('network-fixture.example'));
  const received = await child.evaluate(() => window.sessionMessage);
  assert.equal(received.access_token, undefined);
  assert.equal(received.session_id, 'synthetic-nonsecret-session');
  assert.equal(await page.evaluate(() => sessionStorage.length + localStorage.length), 0);
  await page.getByRole('button', { name: 'Ask Jarvis about this screen' }).click();
  await page.getByLabel('Description', { exact: true }).fill('Please help with the selected screen.');
  await page.getByRole('button', { name: 'Open draft in Messages' }).click();
  const shared = await child.evaluate(() => window.shared);
  assert.equal(shared.screen, '');
  assert.equal(shared.description, 'Please help with the selected screen.');
  assert.deepEqual(shared.attachments, []);
  await page.screenshot({ path: new URL('host-synthetic-handshake.png', evidence).pathname, fullPage: true });
  await child.evaluate(() => parent.postMessage({ type: 'dyfrent.enterprise.rpc', version: 1, nonce: window.sessionMessage.nonce, request_id: 'first', action: 'net_directory', payload: {} }, 'http://127.0.0.1:4786'));
  await page.waitForFunction(() => true);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(requests.filter(request => request.op === 'call').length, 1);
  await page.evaluate(() => window.postMessage({ type: 'dyfrent.enterprise.rpc', version: 1, request_id: 'spoof', action: 'net_directory', payload: {} }, '*'));
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(requests.filter(request => request.op === 'call').length, 1);
  sessionMember = 'fixture-dave';
  await page.getByRole('button', { name: 'Switch fixture identity' }).click();
  await page.getByText('Second demo member', { exact: false }).waitFor();
  console.log('PASS real host blocked/loading/expired states, three widths, synthetic handshake, no iframe credential/storage, explicit share, BFF RPC and spoof refusal, identity remount');
} finally {
  await browser.close();
  preview.kill('SIGTERM');
}
