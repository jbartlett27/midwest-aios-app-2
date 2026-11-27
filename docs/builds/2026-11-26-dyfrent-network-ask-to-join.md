# 2026-11-26 DYFRENT Network >> ask to join, J approves each person

## The ask

J (Nov 26): the next step of the Midwest Enterprise Network. Until now only the pilot logins in `ENTERPRISE_PILOT_USERS` (Maureen and the test login) could open the Profile, Network and Messages tabs, and adding anyone meant changing a server setting. Now any Midwest login can ask to join and J approves or pauses each person himself on DYFRENT (Team & Access >> People >> Partner companies). DYFRENT issue 1488, PR jbartlett27/dyfrent-aios (next to this one).

## How it works

- `api/enterprise-network.js`: new `join` op. It signs a `join` request (`status`, or `ask` when the person pressed Ask to join) for the signed-in person, exactly like every other call: only their Midwest user id and name cross. `ENTERPRISE_OPEN_REQUESTS=on` lets every Midwest login open the tabs, confirm their password and ask; without it only the pilot list can, as before. DYFRENT decides who is approved and refuses everyone else on every call.
- `src/enterprise.jsx`: after the password, the tab asks DYFRENT for the person's state once. Approved: the Network frame as before. Not asked yet: a Join the DYFRENT Network card with Ask to join. Waiting: Waiting for J to approve you, with Check again. Paused: says so, nothing to press. DYFRENT unreachable: Try again, never the frame.

## Order of release

DYFRENT first (it must understand `join`), then this. Then set `ENTERPRISE_OPEN_REQUESTS=on` on the Midwest project to open the tabs to every login.

## Rollback

Remove `ENTERPRISE_OPEN_REQUESTS` and redeploy: only the pilot list sees the tabs again. J can pause anyone on DYFRENT at once.

## Proof

`tests/reliability/enterprise-network-test.mjs`: join signed for the session's own person, looking never asks, ask needs `ask: true`, no session refused, another site refused, open requests let Dave sign in and ask with his own password (and still need the right one); the tab shows Ask to join, then Waiting, opens the frame only once approved, tells a paused person, and shows Try again when DYFRENT cannot answer. 18 mutants, all rejected (3 new). Full battery green; `vite build` passes.

## Known limit

The earlier note stands: Midwest's `users` table keeps passwords readable with the public key, so a Network identity is only as strong as that table. J's approval of each person is what stands between a request and access.
