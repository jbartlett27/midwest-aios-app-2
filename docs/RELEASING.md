# Midwest AIOS >> release and verify

Use [DEVELOPMENT.md](DEVELOPMENT.md) for setup/tests and [PARALLEL-WORK.md](PARALLEL-WORK.md) for ownership and integration. A code request is not automatically authority for schema/data changes or sending email. Main auto-builds production, including documentation-only pushes. No staging environment is configured.

## Correct deployment scope

| Resource | Identifier |
|---|---|
| GitHub app repository / release branch | jbartlett27/midwest-aios-app-2 / main |
| DYFRENT Vercel team | team_0m4pPzEkP4AFN83M4dgvzWdj |
| Vercel app project | midwest-aios-app-2 / prj_ieep0jTQdew1xj9OPzt6O0BdtbB4 |
| Production domain | midwestaios.com |
| Separate Claude MCP service | midwest-aios-mcp / prj_c3aIPIg9WvV8DlQi8yr2egeqJ3QE, repo jbartlett27/midwest-aios-mcp- |

List authorized teams before project calls and select DYFRENT explicitly. A personal-team 404 does not prove the project is missing. The personal midwest-aios-app-2-wq6v project is a stale duplicate that may still build; its READY state does not verify production. Do not disconnect or delete projects without J's explicit instruction.

## Candidate gate

The named release coordinator owns the release from integration through verification. Record the base and final candidate SHAs, scope, changed files, test commands/results, deliberate failures, diff review and remaining limits. Check current remote main immediately before publication. Reconcile and rerun checks if it advanced. No force pushes or whole-file overwrites of newer work.

For app changes, run the committed offline reliability battery, relevant added regressions/mutants and production build. For a strictly Markdown-only change, verify relative links, diff scope and whitespace; an app test rerun is unnecessary unless source/config also changed. Existing deployment still rebuilds after the docs push; report its actual result separately from code behavior.

## Working publication routes

Prefer authenticated Git on the isolated candidate when available. A local clone does not imply push authentication. On October 30, command-line HTTPS push had no saved authentication; the authorized GitHub connector successfully created blobs, trees and scoped commits, then advanced main with expected old SHA and force false. Every uploaded blob and complete tree was checked against the tested local content, and the remote content was fetched back for comparison. These connector commits can have different commit identities from local commits while preserving identical trees; record both and refresh from remote for subsequent work.

Use existing authorized connectors rather than requesting raw keys or J's login. A browser paste is a fallback only when needed and permitted, after coordination and fresh source comparison. The Mac folder spelling is `/Users/jbartlett/Desktop/\]/CLAUDE/CLAUDE FOR MIDWEST/`, with a literal backslash before the bracket. Historical paste instructions are in [HANDOFF.md](HANDOFF.md); use a unique staging name, UTF-8 clipboard round-trip checks, and never overwrite newer main. Do not treat browser write access as a way around an approval denial.

## Verify the actual shipment

1. Read remote main after publication and fetch the exact commit. Compare every changed file or the complete tree with the tested candidate. A command issued is not proof that bytes landed.
2. List deployments on the DYFRENT app project filtered by the exact Git commit and branch. Record the deployment ID. Inspect that deployment until terminal READY or a concrete error; do not confuse a simultaneous branch/duplicate/older build with this candidate.
3. Confirm the deployment's Git repository/commit, project, team and production target. Confirm aliases include midwestaios.com. Recheck current main/production if another session released while verification was running; do not call an older deployment current.
4. Fetch public production HTML without credentials, identify the actual referenced JavaScript asset, fetch it, and verify the changed behavior's stable code markers. Record HTTP status, asset path and checksum. Local and hosted asset hashes may differ because build environment values differ; do not read secret env values to manufacture a match.
5. Use safe offline component tests for behavior. Public bytes plus READY establish publication, not a live financial transaction or exhaustive user journey. Do not sign in, send messages, create a real checkout or mutate client data to prove a release. Report limitations plainly.
6. Write release evidence under docs/builds/ or the task artifact: exact commit/tree, deployment ID/state, aliases, fetched asset/hash, checks and limits. A follow-up docs commit itself rebuilds production, so distinguish that revision from the functional release rather than repeatedly editing a supposedly final SHA record.
7. Prepare the client update only after verification. Gmail remains a formatted in-thread draft to Maureen. Leave Joe off Midwest emails by default unless J explicitly asks to include him. Verify the existing thread audience without retaining Joe solely from history; preserve existing drafts, use the required sign-off and no bare domains/URLs in authored client text. Do not send without J's separate explicit instruction.

## Verified reference release

October 30 invoice reliability release: commit `6e88cfeffcd0ce2a286e543dc6a3d963acbadabd`, tree `503578be8cd67e78cf920d15685fcfdf8dfd38f2`, deployment `dpl_F1JWZNtPq65q4UA4wdWp2k7MfbCK`, READY and aliased to midwestaios.com. All 21 changed files matched the tested source. HTML/asset returned HTTP 200; served asset was index-CUvSAQps.js, SHA-256 `77135866f64aa7c6c5b4042f77a127200cbec77fdb3e7fb491f595c15db3ba75`. This is a historical verification record, not a claim that the same revision remains latest.

The build passed with 683 modules; seven deliberate mutants were rejected. The historical 28-suite scratchpad was unavailable. Same-field/nested-JSON concurrent writes, unknown legacy invoice dates, previously shared payment sessions and the root lockfile mismatch remain limitations; see [the build report](builds/2026-10-30-invoice-reliability.md).
