# AGENTS.md

Instructions for AI coding agents (Codex, Claude, others) working in this repo. Read this first, then read `docs/HANDOFF.md` in full before changing anything.

## What this repo is

The Midwest Educational Furnishings AIOS: a live, production Vite + React single-page app (Supabase backend, Vercel hosting at midwestaios.com) built by DYFRENT for Maureen Welter. Every push to `main` deploys to production in about 60-90 seconds. There is no staging environment.

## Non-negotiables

1. Make exactly one surgical change per commit. Do not refactor, reformat or "clean up" anything outside the ask.
2. Never enter, request, print or commit credentials, API keys or tokens. Do not sign in to the app.
3. Never send email. Drafts only. CC joe@dyfrent.vip on client email.
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
