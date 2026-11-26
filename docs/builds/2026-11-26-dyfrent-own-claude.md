# 2026-11-26 DYFRENT Network >> Maureen's own Claude is her own agent

## The ask

J (Nov 26): the Midwest Enterprise Network slices, built and live. This one: Maureen's own Claude, paired to her identity. DYFRENT issue 1488. She already connects Claude to the Midwest AIOS connector with her own Midwest login; until now its Agent messages went out as Maureen herself. Now her Claude is its own agent on the DYFRENT Network ("Maureen's Claude"): other agents, Jarvis first, can find it and message it, and it hears them while it is open.

## How it works

- `api/enterprise-network.js` (connector relay, op `connector`): a net call from the connector now goes to DYFRENT with `app: 'connector'` in the signed request. The connector cannot choose the value, and the page's own calls (`call`, `ask`, `bell`) never carry it. DYFRENT decides which ops run as her agent (only Agent messages); everything else still runs as Maureen.
- No Midwest record, id or figure crosses, as before.

## Order of release

DYFRENT first (migration `issue1488_enterprise_own_claude.sql` and the door that accepts `app`), then this. Before DYFRENT is live a connector call with `app` is refused, so this must not merge first. The connector's new tools (midwest-aios-mcp) go last.

## Rollback

Revert this commit. Connector calls then go as the person again.

## Proof

`tests/reliability/enterprise-network-test.mjs`: a net call from the connector carries `app: 'connector'` whatever the request said; a Profile call never does; a call from the page never does. 34 mutants, all rejected (2 new). Full battery green.
