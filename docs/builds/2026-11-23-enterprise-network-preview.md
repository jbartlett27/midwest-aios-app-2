# Midwest enterprise Network draft

The implementation and December 3 demo acceptance plan are tracked in [DYFRENT #1382](https://github.com/jbartlett27/dyfrent-aios/issues/1382), with the source contract in docs/engineering/ENTERPRISE-MIDWEST-PILOT.md there.

This draft implements the gated dashboard host and BFF foundation. The actual shared component receiver, canonical Profile/Network/Messages adapters, legacy server-session migration and member-bound Claude connection remain unfinished. Both flags stay off. Every actual canonical action is refused until its adapter is reviewed. Live conversation, attachment and direct-wake proofs are pending.

## Local preview

Run the usual development server on an owned strict localhost port and open enterprise-preview.html. It mounts the actual new Midwest host with synthetic identity. It calls only the local BFF, which stays closed by default. The standalone saved HTML displays the same closed state without a server. No customer data is loaded.

Use VITE_ENTERPRISE_NETWORK_PREVIEW=on only for a reviewed build to reveal the Profile, Network and Messages entries in Midwest's shell. ENTERPRISE_NETWORK_PREVIEW is a separate server gate. The broker requires exact ENTERPRISE_APP_ORIGIN, ENTERPRISE_INSTALLATION_ID, ENTERPRISE_NETWORK_ENDPOINT and a server-only ENTERPRISE_BROKER_KEY. Existing legacy browser login JSON cannot authorize it. Clerk tokens use the explicitly configured dyfrent-network template, subject to authoritative server membership.

## Checks

- node tests/reliability/enterprise-protocol-test.mjs
- node tests/reliability/enterprise-host-test.mjs
- node tests/reliability/enterprise-broker-test.mjs
- node tests/reliability/enterprise-broker-test.mjs --mutant must fail
- node tests/reliability/run.mjs
- npm run build
- PLAYWRIGHT_MODULE=<installed Playwright entry> AIOS_CHROME=<browser> node tests/reliability/enterprise-host-browser.mjs

The existing invariant suite hardcodes historical Git commit daa7defe. This environment lacks authenticated shell Git. For local invariant execution only, that ref was mapped to a reconstructed tree containing the two exact historical App.jsx and supabase.js blobs read through GitHub and verified by Git blob hashes. Other files come from the source snapshot. This is a local baseline reconstruction, not a fetched full historical commit. No upstream ref was changed.

## Rollback

Remove the build preview flag and close the server gate. No Midwest database migration is included. Pairing rollback belongs to the separate DYFRENT migration, which preserves records. No live account, grant, message or deployment was changed by this draft.

## Visual evidence limits

The real React host tests cover source/origin/nonce checks, short expiry, revoke and identity switch, finite RPC dispatch and explicit context. Chromium screenshot launch failed with Unix socket EPERM. The separate browser could not reach localhost. Responsive side-by-side source screenshots remain pending. The HTML fixture is explicitly synthetic and does not establish actual Profile/Network/Messages parity.

