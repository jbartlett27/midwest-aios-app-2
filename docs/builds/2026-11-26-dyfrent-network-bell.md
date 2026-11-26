# 2026-11-26 DYFRENT Network >> Midwest's bell

## The ask

J (Nov 26): the Midwest Enterprise Network slices, built and live. This one: what is waiting for a person on the DYFRENT Network shows in Midwest's top bar, so they do not have to open the Network tabs to find out. DYFRENT issue 1488.

## How it works

- `api/enterprise-network.js`: new `bell` op. For the signed-in person only (same session, same-origin and pilot or open-request checks as every other op), it makes up to three signed reads DYFRENT already answers for that person: `net_mk_overview` (unread messages, introductions waiting on them, replies to their work requests, open work that fits them), `net_wire_unread` (messages from agents) and, only once they are listed, `net_overview` (connection requests). It answers counts only, capped at 999. No names, words or Midwest records cross in either direction.
- Why `net_overview` waits for listed: DYFRENT lists a person the first time `net_overview` runs for them. The bell must never list someone who has not opened the Network themselves; someone not listed cannot get connection requests anyway.
- `src/enterprise.jsx`: `NetworkBell`, shown in the top bar next to the person's name for a login with a verified Network session whom DYFRENT answers for. Anyone not approved (waiting, paused) gets nothing back and sees no bell. It reads on load, every two minutes while the page is visible, when the page becomes visible again, when opened, and when the person leaves a Network tab. The badge counts what needs the person; work that fits them is listed but never counted. Each row opens the tab where it is answered (messages to Messages, the rest to Network). The panel is fixed inside the viewport, closes on Escape or a click outside, rows are 44px.

## Order of release

Midwest only. DYFRENT needs no change: every read is one a workspace member may already make (`PUBLIC_MEMBER_OPS`).

## Rollback

Revert this commit. Nothing is stored.

## Proof

`tests/reliability/enterprise-network-test.mjs`: the bell answers exactly six counts and nothing else DYFRENT sent; three reads, all as the session's own person; no `net_overview` for someone not listed; garbage counts read as zero, huge ones are capped; a person DYFRENT refuses gets no counts; no session and another site are refused. UI: no session no bell and nothing asked; badge 4 for 3 messages and 1 request with 4 work matches left out; rows only for what is waiting, singular and plural right; a row opens its tab and closes the panel; leaving a Network tab reads again, moving between Midwest pages does not; empty panel says so; Escape and an outside click close it; a refused person sees no bell. 22 mutants, all rejected (4 new; `run.mjs` now runs all 22, it ran 18 of 19 before). Full battery green; `vite build` passes. Geometry at 1440 and 390: the bell centres on the name row and the panel stays 16px inside a phone screen with no sideways scroll.

## Known limit

Counts refresh every two minutes, not instantly. A person who has never opened the Network sees no connection request count until they do.
