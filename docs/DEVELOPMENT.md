# Midwest AIOS >> build and edit

Start with [AGENTS.md](../AGENTS.md) and the full [handoff](HANDOFF.md). Use [parallel-session rules](PARALLEL-WORK.md) before coding and the [release runbook](RELEASING.md) before publishing. These instructions apply equally to Claude, Codex and human developers.

## Setup that actually worked

Verified October 30, 2026 with Node 24.14.0, npm 11.9.0 and Git 2.54.0. Vercel uses Node 24.x. Use a fresh clone or isolated worktree from current origin/main; record its full base SHA and hashes of files you will touch.

```
git clone https://github.com/jbartlett27/midwest-aios-app-2.git
cd midwest-aios-app-2
git status --short --branch
git rev-parse HEAD
npm install --ignore-scripts --package-lock=false --no-audit --no-fund
npm --prefix tests/reliability ci --ignore-scripts --no-audit --no-fund
node tests/reliability/run.mjs
npm run build
```

The root package-lock.json does not match package.json: it contains incompatible React/Vite versions and lacks declared dependencies. Root `npm ci` fails. The install above resolved the manifest ranges and built successfully without lifecycle scripts or tracked lockfile changes. It is an unlocked fallback, not a reproducible root install. Do not silently fix or commit the lockfile during another task; a deliberate dependency/lockfile repair needs its own review. The isolated test package has its own consistent lockfile. Do not use another session's node_modules or mutate a shared dependency directory.

No keys or app login are needed for offline tests/builds. Use authorized service connectors when necessary; never request or copy raw credentials. Network/install permissions still apply. A public Git clone proves read access, not authenticated push access.

## Commands

| Command | Actual behavior |
|---|---|
| `npm run build` | Vite production compile to ignored dist/. It does not deploy. |
| `npm run dev` | Vite development server on port 3000, with browser auto-open enabled. |
| `npm run preview` | Vite serves the compiled output locally. |
| `node tests/reliability/run.mjs` | Offline regression, render, invariant and deliberate-failure battery. |

There is no root test/lint script. Do not invent one in a report. A local dev/preview page can still call production-backed services: it is not a staging environment. Prefer the stubbed harness. Do not sign in or use live data/provider writes as smoke tests. Check env file presence without printing values, and do not copy production credentials into a checkout.

## Where to edit

| Area | Entry points |
|---|---|
| Browser boot | index.html -> src/main.jsx -> default export in src/App.jsx |
| Shell, roles, state, ctx, jobs, deliveries, documents, dashboard | src/App.jsx; state belongs in MidwestAIOSInner and passes through ctx |
| Commissions, sales portal, 360 pages, tasks, notes, Brain UI, prospects, files, directory | src/App2.jsx |
| Financials and vendor-bill helpers | src/App3.jsx |
| Database mappings and HTTP client | src/supabase.js; camelCase in JS, snake_case in database |
| Calendar validation and inputs | src/businessDate.js, src/DateInput.jsx |
| Issued invoice dates and checkout payload/link matching | src/invoiceDates.js, src/invoicePayments.js; document orchestration remains in App.jsx |
| Server handlers | api/brain.js, ai-scan.js, send-email.js, plaid-link.js, plaid-transactions.js, stripe-pay.js, task-reminders.js |
| Separate client MCP service | jbartlett27/midwest-aios-mcp-, not the app's inactive MCP authorization path |

Locate functions with `rg`; line numbers and file sizes drift. App2/App3 import shared helpers from App.jsx, creating circular dependencies that rely on hoisted functions and deferred use. Do not call App.jsx imports during another module's initialization. Update both sides of shared export/import wiring. Keep the default MidwestAIOS export last in App.jsx. CsvUpload.jsx is legacy and not imported; confirm the active import path before editing it.

Inline styles and the existing components/design system are intentional. Reuse the handoff's components, colors and fonts. No unrelated refactor or new UI/state library. Keep app files below the current 1 MB editor gate enforced by the test battery. The historical web-editor ceiling is not a Git size limit.

## Conventions and current behavior

- Bare YYYY-MM-DD values are local business dates. Use parseLocalDate; never parse a bare date with new Date(string). isBusinessDate adds strict calendar/year validation; DateInput rejects invalid entries before changing parent form state. Supported years are 2000 through 2100. Do not silently repair historical data.
- getJobFinancials is the existing single source of truth for job revenue/cost/margin. Preserve sales-role filtering; ctx.jobs is visibleJobs while lineItems may include other jobs.
- Invoice register records are JSON strings in sops with cat Invoice. Each issued invoice number owns its __date, __due and __stripe keys; proforma/credit dates are separated. Keep preview/PDF/email/register dates and selected quantities consistent.
- Overdue rows use invoice due dates and remaining balances from the existing payment allocator. Legacy invoices need a recorded invoice date; job creation is not invoice age. Explicit paid/open marks retain their current semantics.
- Existing job edits use db.patchJob for changed mapped columns; new jobs remain insert-only with database ID discovery and conflict retry. Do not reintroduce full-object upserts. PATCH reduces unrelated-column overwrites; it does not solve simultaneous same-column or nested-JSON edits.
- Payments, imports, financial locks, failed-page handling and cross-system constraints retain the detailed rules in the handoff. Persistent rules shared by browser, Brain, sync and MCP belong in database constraints/triggers. No schema/data mutation is implied by a code task.

## Edit and prove it

1. Quote the requested behavior, record base SHA and scoped files, and coordinate ownership.
2. Read the entire affected function and every save/render path. Use unique asserted anchors for small edits; audit every diff hunk.
3. Reproduce the defect on original code or a deliberate mutant. Every new regression must be seen failing before it counts.
4. Run the committed reliability battery, relevant new offline tests, and production build on the final reconciled candidate. Use actual shipped functions/components and assert persisted fake state, not just visible input text. Include null/garbage/boundary values and timezones for date work.
5. Inspect diff, status, and generated-file/secret exclusions; make one scoped change per commit. Record root cause, checks, observed failures and remaining limits under docs/builds/.
6. Follow serialized integration and release verification. Only then prepare an in-thread Gmail draft with Joe CC'd, stating what actually shipped.

The October 30 battery checks parse/size/financial-import-ID invariants, the stubbed three-file bundle/default shell, real invoice/dashboard interactions, exact updater/ledger slices and dates in UTC/Chicago/Los Angeles. Seven deliberate mutants must fail. This is not the missing historical 28-suite scratchpad, complete live end-to-end coverage, or proof of every provider/database policy. Build warnings about the large bundle and Vite's CJS API remain documented.
