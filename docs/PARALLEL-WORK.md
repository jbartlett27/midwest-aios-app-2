# Midwest AIOS >> concurrent sessions

J prefers many simultaneous build sessions across Codex, Claude and developers. Assume other sessions may already be coding or deploying. Concurrent coding is allowed. Integration to main and production release are serialized. This is a cooperative workflow, not an enforced lock; Git catches some textual conflicts but cannot prevent incompatible behavior or overlapping live releases.

## Before editing

Every Claude, Codex or human session records its owner/session identifier, request, base commit, branch/worktree, expected files, tests, owned local server ports/processes and release coordinator in a shared GitHub issue, draft PR or agreed task record. Read active work first. Do not assume a private scratchpad is visible to other builders. Do not claim that an issue label/branch automatically reserves a file.

If another session owns the same function or large file, agree on boundaries before editing. App.jsx is shared by many features: disjoint line numbers are not sufficient evidence of disjoint behavior. One session can hand its patch to the current owner, wait, or take an independent scope. Keep ownership current when a session stops or hands off; never silently take over a claim.

## Isolate each working copy

Use unique names, including owner and task/session ID. From a clean repository:

```
git fetch origin main
git worktree list
git worktree add -b codex/invoice-date-session123 ../midwest-invoice-date-session123 origin/main
cd ../midwest-invoice-date-session123
git rev-parse HEAD
git status --short --branch
```

Claude can use claude/task-session123; humans can use their own prefix. Install dependencies separately using [DEVELOPMENT.md](DEVELOPMENT.md). Do not edit another worktree, switch its branch, reset its files, reuse its staging filenames, or share mutable node_modules/dist/test outputs. Preserve dirty work. A session resumes by checking its own status and current remote state, not by assuming yesterday's copy is current.

Each session owns its local server ports and processes. Record an explicit unused port, for example `npm run preview -- --port 4174 --strictPort` when a local preview is actually appropriate. The dev server defaults to port 3000 and auto-opens a browser; do not start it blindly. Use strictPort so a conflict fails clearly rather than silently moving to another session's assumed address. Pick another port if occupied. Do not kill, restart or reuse a process owned by another session. Local dev/preview still needs service isolation before any interaction with live data.

Keep Midwest and DYFRENT separate. This repository's workflow and Vercel project apply here; DYFRENT's separate coordination/release scripts do not automatically apply.

Commit scoped changes on the topic branch. Prefer a reviewable PR for discussion and ownership; a topic push may produce a preview build, but a preview is not an isolated database or an approved production release. Current repo/account permissions and approvals still apply.

## Reconcile before integration

1. Nominate one integration/release coordinator in the shared record. Other sessions can keep coding but stop publishing to main while that release is being integrated and verified.
2. Coordinator fetches current main and records its exact SHA. Create a separate release-candidate branch/worktree from it, preserving original topic branches.
3. Review each proposed commit and its overlap with changes landed since its base. Merge/cherry-pick the agreed scoped work into the candidate. For conflicts, read both intentions and surrounding code. Do not resolve with whole-file ours/theirs or blindly paste a full older App.jsx.
4. If requirements overlap, involve the owners and reconcile behavior explicitly. Textual conflict-free merging does not establish correctness. Rerun relevant tests, mutants and build on the combined candidate, even when each topic was green alone.
5. Inspect the complete candidate diff and provenance. Keep unrelated work out of the release. Do not amend/rebase a published or shared branch under another session. A private unpublished branch can be rebased with its owner's knowledge; otherwise merge and preserve history.
6. Fetch main again immediately before publication. If it moved, refresh/reconcile and retest. A normal push that is rejected for non-fast-forward is a stop-and-reconcile signal, never a reason to force-push.

## Publish one candidate at a time

Publish only with the task's release authorization. Use a normal fast-forward main update. A connected GitHub API flow must verify blob/tree bytes against the tested candidate, parent from the freshly read main, and use an expected-head check with force false. Do not assume a successful read or browser login proves every tool can write.

No force pushes, resets of shared main, overwritten browser files, broad permission grants or deployment-setting changes to avoid coordination. If main changed after your check, preserve both branches, inspect the new head and reconcile. Do not retry a denied action through another route; check uncertain outcomes first and report exact blockers.

Hand off the release coordinator role only with the candidate SHA, current main SHA, deployment IDs/states and remaining steps. Treat the role as active until the specific deployment and live bytes are verified, not merely until Git accepts a push.

## Multiple builds can exist at once

Topic branches, the real DYFRENT project and stale duplicate projects can all produce builds. Never use "the latest deployment" alone to identify a release. Record repository, branch, exact commit, team, project, deployment ID, terminal state and aliases. Match all of them in [RELEASING.md](RELEASING.md). A READY build for another commit/project is not your success. If another authorized coordinator has already advanced production, stop and coordinate rather than promoting an older candidate over it.

Rollback is also a serialized production action. Prefer an approved scoped revert from current main or an explicitly authorized rollback with compatibility review. Never reset main or undo another session's newer work to make your own release appear successful.
