# AGENTS.md

Instructions for AI coding agents (Codex, Claude, others) working in this repo. Read this first, then [the developer guide](docs/DEVELOPMENT.md), [parallel-session workflow](docs/PARALLEL-WORK.md), and `docs/HANDOFF.md` in full before changing anything. The dated handoff retains historical context; the current guides and inspected source describe the working flow.

## What this repo is

The Midwest Educational Furnishings AIOS: a live, production Vite + React single-page app (Supabase backend, Vercel hosting at midwestaios.com) built by DYFRENT for Maureen Welter. Every push to `main` deploys to production in about 60-90 seconds. There is no staging environment.

## Non-negotiables

1. Make exactly one surgical change per commit. Do not refactor, reformat or "clean up" anything outside the ask.
2. Never enter, request, print or commit credentials, API keys or tokens. Do not sign in to the app.
3. Never send email. Drafts only. Leave Joe off Midwest emails by default unless J explicitly asks to include him. Verify the existing thread audience; do not retain Joe merely because he appeared earlier.
4. No emoji and no em dashes anywhere (code, UI copy, docs, email). Use `>>` as the prose and UI connector.
5. Bare `YYYY-MM-DD` strings are wall-clock dates. Parse with `parseLocalDate`, never `new Date("YYYY-MM-DD")`.
6. `getJobFinancials(jobId)` is the single source of truth for revenue, cost and margin. Never fork it.
7. Cross-tab and cross-system rules belong in Postgres constraints or triggers, not app guards.
8. A new shared helper in `src/App.jsx` must be added to both its `export {}` block and `src/App2.jsx`'s `import {}`. `export default function MidwestAIOS()` stays last in `App.jsx`.
9. Do not add build overrides to `vercel.json` (crons only).
10. Every test must be seen failing (on HEAD or a deliberate mutant) before it counts.

## File map

- `src/App.jsx` shell, ctx, shared helpers, Dashboard, Jobs, Delivery, Documents (about 858 KB, near the 1 MB web-editor ceiling)
- `src/App2.jsx` Commissions, Sales Portal, 360 views, Tasks, Notes, Brain page, Prospects, Files, Users, Directory
- `src/App3.jsx` Financials and vendor-bill helpers
- `src/supabase.js` fetch-only database client and mappers
- `api/*.js` Vercel serverless functions (brain, ai-scan, send-email, plaid, stripe, task-reminders cron)

## Verify before you call it done

Parse every edited file, bundle `src/App.jsx` with esbuild (stub clerk, recharts, xlsx), run the jsdom suites, confirm every hunk in the diff is intended, push, then confirm the Vercel deployment is READY and the live asset contains the new strings. Full harness recipe and the deploy path are in `docs/HANDOFF.md`.

## Where the history lives

Per-change build write-ups (root cause, hunks, test results) are kept in the MIDWEST APP project on claude.ai, newest first. Ask J (j@dyfrent.vip) if you need one. Open backlog is in section 10 of `docs/HANDOFF.md`.

## Shared build and release entry points

- [Development and architecture](docs/DEVELOPMENT.md): working install commands, scripts, current date/invoice conventions and offline checks.
- [Parallel sessions](docs/PARALLEL-WORK.md): one branch/worktree per session, explicit ownership for overlapping files, and serialized integration/release.
- [Production release runbook](docs/RELEASING.md): correct Vercel team/project, exact commit/deployment tracking, live-byte verification and rollback boundaries.
- [Claude entry point](CLAUDE.md) and [human overview](README.md) point to these same documents. No separate competing rulebook.
- [Committed reliability tests](tests/reliability/README.md) and [October 30 build notes](docs/builds/2026-10-30-invoice-reliability.md) supplement the historical scratchpad recipe.

J prefers many simultaneous sessions across Codex, Claude and developers. Assume others may already be working or deploying. Coding sessions can run concurrently in isolated working copies with owned local preview ports/processes; preserve other sessions' work and running processes. Keep Midwest separate from DYFRENT and do not import its release tooling by assumption. Integration to main and production verification have one named coordinator at a time. A cooperative claim is not an enforced lock; Git does not detect every semantic conflict. Never overwrite another session's files, force-push, or treat another session's deployment as proof of your release. Refresh main, reconcile overlapping work and rerun checks before integration. A docs-only push to main still triggers the existing production build.
