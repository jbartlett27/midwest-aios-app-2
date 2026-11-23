# 2026-11-23 DYFRENT Network tabs >> Profile, Network and Messages inside Midwest

## The ask

J (Nov 23): Midwest gets J's actual DYFRENT Profile, Network and Messages pages as new tabs, with Midwest's own sign-in, connected to the DYFRENT Network. Nothing that exists changes. Ships live but visible only to J and Maureen until J reviews. Midwest's jobs, customers, quotes, bills and finances stay sealed. (Midwest issue 3, DYFRENT issue 1382, PR jbartlett27/dyfrent-aios#1386.)

## How it works

- `src/enterprise.jsx` (new): the three tabs. Each is an iframe of `https://www.dyfrent.app/enterprise`. The frame asks this page for every Network call by postMessage; the page answers only that frame at the DYFRENT origin and passes the call to Midwest's own server.
- `api/enterprise-network.js` (new): `login` checks the same username and password as the sign-in screen and sets an HttpOnly, Secure, SameSite=Strict signed cookie (12 hours, this route only), for pilot logins only. `hello` and `call` sign each call (HMAC, nonce, 30 seconds) for the signed-in person and send it to DYFRENT. Same-origin requests only. Reads one Midwest table (users, for the sign-in check) and no business table.
- `src/App.jsx` (four lines): the sign-in also opens the Network session (fire and forget, never blocks sign-in); sign-out clears it; the three tabs join the menu when the server says this login is on the pilot list; the page router draws them.
- A pilot login with no Network session (signed in before this release) confirms the password once on the tab.

## Settings (server only)

`ENTERPRISE_NETWORK_PREVIEW=on`, `ENTERPRISE_INSTALLATION_ID=midwest`, `ENTERPRISE_BROKER_KEY` (shared with DYFRENT), `ENTERPRISE_SESSION_KEY`, `ENTERPRISE_PILOT_USERS=USR-000,USR-001`, `ENTERPRISE_APP_ORIGIN=https://midwestaios.com`, `ENTERPRISE_NETWORK_ENDPOINT=https://www.dyfrent.app/api/mcp?s=enterprise`. With any of them missing the server answers closed and no tab shows.

## Rollback

Remove `ENTERPRISE_NETWORK_PREVIEW` (or `ENTERPRISE_PILOT_USERS`) and redeploy: the tabs disappear for everyone. DYFRENT can close the company on its side at once.

## Proof

`tests/reliability/enterprise-network-test.mjs` (8 mutants): sign-in and cookie flags, wrong password, a non-pilot login gets nothing, status, hello and calls signed and verified the way DYFRENT verifies them, forged and foreign cookies, expired session, other origins, op filtering, sign-out, preview switch, the relay ignoring any other origin or window, the password never reaching the frame. Full battery green, every mutant rejected. `vite build` passes.

## Known limit

Midwest's `users` table keeps passwords readable with the public key, so a Network identity is only as strong as that table. Locking it (a server sign-in and no password column for the browser) is the recommended next step before staff beyond the pilot are added.
