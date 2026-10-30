# Midwest AIOS >> Codex Handoff

> Canonical copy lives in the repo at `docs/HANDOFF.md`. A mirror is kept in the MIDWEST APP project on claude.ai. If they differ, the repo wins.

## Current workflow update, October 30, 2026

Read [DEVELOPMENT.md](DEVELOPMENT.md), [PARALLEL-WORK.md](PARALLEL-WORK.md) and [RELEASING.md](RELEASING.md) alongside this handoff. These describe the current working build/test/release flow for Claude, Codex and humans. This original handoff is preserved below as dated business and engineering history; its old source checksums, missing-harness and access assumptions are not current startup facts.

Release `6e88cfeffcd0ce2a286e543dc6a3d963acbadabd` shipped October 30. It added invoice-level overdue balances, independent issued-invoice dates, correct partial-invoice checkout amounts/numbers, validated date inputs and field-only job PATCH updates. Historical backlog items 3, 4, 5 (input prevention) and 6 below were addressed in code; existing invalid data was not repaired. Same-field/nested-JSON concurrency and already-shared payment sessions remain limitations. See [build notes](builds/2026-10-30-invoice-reliability.md).

The harness now lives in [tests/reliability](../tests/reliability/README.md). It is a recorded focused battery, not a claim that the unavailable historical 28 suites were rerun. Local Git read/build access and connected GitHub writes were verified; command-line HTTPS push authentication was not available in that session. Do not ask for raw login credentials. Isolated topic branches/worktrees are now the collaboration workflow; main remains the production release branch.

Written 2026-10-29 by Claude for J (j@dyfrent.vip, DYFRENT). Repo HEAD at time of writing: `5621e1c`. Read this whole file before touching code. It is the operating manual for continuing the build.

## 1. What this is

The Midwest Educational Furnishings AI Operating System ("AIOS"), built by DYFRENT for client Maureen Welter. It is a single-page Vite + React app backed by Supabase, deployed on Vercel at midwestaios.com. It runs the business: Jobs, Quotes, POs, Vendor Bills, Invoices, Payments, Deliveries, Commissions, Sales Portal, Customer/Vendor 360, Tasks, Notes, Prospects, Files, Financials (bank feed, categories, balance sheet, reports), and a "Brain" (Claude-powered agent that reads and writes the data, with undo).

It is live and in daily use. Treat every change as a production change. There is no staging environment.

### People
- **J Bartlett** (j@dyfrent.vip): founder of DYFRENT. Does not write code. Terse, fast.
- **Maureen Welter** (mwelter@mwfurnishings.com): owner, primary user, reports bugs by email.
- **Lisa Monchunski** (lmonchunski@mwfurnishings.com): enters financials, uploads worksheets.
- **Dave Welter**: owner, sales. Reps with logins: Dave Welter, Jim Harris, Jim Lindner, Jackie Biller.
- **Joe LaPoint** (joe@dyfrent.vip): CC on every client email.
- Current contract runs through April 2027. Next meeting with Maureen and Dave: Thu 11/5 at 3pm EST.

### J's standing instruction (verbatim, applies to every task)
"Just make this update, only make this one update. Make sure you're surgical with the changes, make sure the code is perfect, and make sure you double-check your work and that everything is perfect."

Scope creep is a bug. One change per push. Prove it. Verify the live bytes.

## 2. Hard rules (do not break)

1. **Never enter, read aloud, or store credentials.** No passwords, API keys, tokens. Do not sign in to the AIOS. Do not print env var values. The GitHub login belongs to J.
2. **Gmail: drafts only, never send.** CC joe@dyfrent.vip on Maureen emails. Reply in-thread.
3. **Voice:** no emoji, no em dashes anywhere (code, UI copy, email). Use `>>` as the connector in prose and UI copy (`&gt;&gt;` inside JSX text). Use `--` only inside code comments or UI strings where a dash is needed. Numbers in JetBrains Mono.
4. **Email sign-off:** `Blessings,` / `J` / `DYFRENT | The Art of Business`. Warm, short, plain language, bold section headers if long, own the cause when it was ours.
5. **No bare URLs or domains in client emails** (Gmail rewrites them into redirects). Say "live in the AIOS".
6. **Do not permanently delete** data, projects, or drafts without J saying yes in chat. Never run destructive SQL without a rolled-back dry run and J's approval.
7. **Every test must be seen failing** (on HEAD or a deliberate mutant) before it counts. A green test that cannot fail is worse than none.
8. **The database is the law.** Rules that must hold across browser tabs, the Brain, the Plaid sync and the MCP connector belong in Postgres constraints or triggers, not app guards.

## 3. Ids and endpoints

| Thing | Value |
|---|---|
| Repo | github.com/jbartlett27/midwest-aios-app-2 (public, trunk-only, branch `main`) |
| Live app | midwestaios.com |
| Supabase project | `kogjthgceejpzxnekprr` (Pro, daily backups, RLS on with permissive "Allow all", anon key baked into `src/supabase.js`) |
| Vercel team | "D Y F R E N T" = `team_0m4pPzEkP4AFN83M4dgvzWdj` (Pro) |
| Vercel app project | `midwest-aios-app-2` = `prj_ieep0jTQdew1xj9OPzt6O0BdtbB4`, git-connected, push to main auto-builds in 60-90 s |
| Vercel MCP project | `midwest-aios-mcp` = `prj_c3aIPIg9WvV8DlQi8yr2egeqJ3QE`, serves `/mcp` at midwest-aios-mcp.vercel.app, repo jbartlett27/midwest-aios-mcp-. This is **Maureen's Claude connector** |
| Other project on team | `dyfrent-aios` = `prj_0lLdV6QceN4QmRyYrgDB9zhxtvZn` (not Midwest) |
| Stale, personal Vercel account (paused, nothing live) | midwestaios, -anml, -8hl6, -c5xt, -4ept, midwest-aios-app-2-wq6v (a duplicate that still builds on every push), maureen, vitejs-vite-kkwtrurv |

History note: the Vercel project moved from J's personal Hobby account to the DYFRENT team on 10/19-10/21. When the personal account was paused, Maureen's connector returned errors (DEPLOYMENT_DISABLED surfaced as a 402). The fix was moving the MCP project to the DYFRENT team. Vercel tooling must be authorized for the DYFRENT team; discover scope with a team list before any project call.

Env vars live in Vercel (bind at deploy time): `ANTHROPIC_API_KEY` (+ `_2`/`_3`/`_4` rotation), `RESEND_API_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=production`, `STRIPE_*` (test), Clerk keys, `VITE_CLERK_PUBLISHABLE_KEY`. `CRON_SECRET` is NOT set. `SUPABASE_SERVICE_ROLE_KEY`, `MCP_JWT_SECRET`, `MCP_ACCESS_SECRET` exist only on the MCP project, not the app project, so `api/index.js` in the app repo cannot authorize. Never read or print values.

## 4. Architecture

### File map (all in `src/` unless noted)
- `App.jsx` (about 6,942 lines, 858 KB): imports, `window._supabase`, `DEFAULT_SOPS`, ErrorBoundary, all shared helpers and components, `MidwestAIOSInner` (all state, `ctx`, `loadFromDb`, routing), Dashboard, JobsPage/JobDetail, Delivery, DocumentsPage (Quotes, POs, Vendor Bills, Invoices, Payments), the `export {}` block, and last `export default function MidwestAIOS()`. **It must stay last.**
- `App2.jsx` (about 6,452 lines): Commissions, SalesPortal, Customer360, Vendor360, Playbook, Tasks, Notes, BrainPage, Prospects, Files, UserMgmt, Directory, ExitReadiness.
- `App3.jsx` (about 2,551 lines): FinancialsPage and vendor-bill helpers.
- `supabase.js`: fetch-only client (no npm deps), camelCase to snake_case mappers, `fetchAll` pages by 1000 and returns NULL on any failed page.
- `CsvUpload.jsx`: legacy, not imported.
- `main.jsx`: imports the default export from App.jsx. Never break it.
- `api/*.js`: `brain`, `ai-scan`, `send-email` (Resend, verified domain mwfurnishings.com), `plaid-link`, `plaid-transactions`, `stripe-pay`, `index` (MCP server, inactive on this project), `_tools`, `task-reminders` (cron).
- `vercel.json`: crons only. **Never add build overrides**; the project auto-detects Vite.

### Why the split exists
GitHub's web editor chokes above about 1 MB, and J deploys through that editor. `App.jsx` is at 858 KB and near the ceiling. Plan a split (or the parts/ concatenation pattern) before it passes about 900 KB. If Codex gets a real git/token path (see section 8), the 1 MB constraint disappears and the split can be done properly.

### Import wiring (fragile, read twice)
- App2 imports shared helpers from App.jsx. The circular import is safe because all App2 definitions are hoisted function declarations. Module-scope `const`s in App2 are fine if only used at render time; calling an App.jsx import at App2 module-eval time is not.
- A new shared helper goes in App.jsx and must be added to **both** App.jsx's `export {}` and App2's `import {}` in the same edit, or the bundle breaks.
- Current export surface (keep lists byte-identical): `AnimNum, AnimatedNumber, Badge, Bar, Btn, CUSTOMER_TYPES, Card, Check, CheckMinus, DEFAULT_SOPS, Dashboard, DocumentsPage, Header, I, LINK_KINDS, LinkChips, LinkPicker, LinkedItemsPanel, customerTypeOptions, fmt, fmtN, getLinks, getProspectList, getRoles, inputStyle, isSalesRep, isoDay, openLink, parseLocalDate, pct, resolveLinkNames, shipKey, statusColor`.
- Locate code with `grep "function PageName("`. Line numbers drift.

### State and ctx
All state is in `MidwestAIOSInner`, passed down as a `ctx` spread. Pages are pure top-level functions taking props. `jobs` in ctx is the role-filtered `visibleJobs`; `allJobs` is everything; `lineItems` is unfiltered, so money shown to a sales role must be filtered by visible job ids. `getJobFinancials(jobId)` is the **single source of truth** for revenue, cost and margin. Never fork it. If a page needs something new, it is almost always already in ctx; destructure it.

ctx keys: `jobs, allJobs, setJobs, jobNum, currentUser, userRole, userRepId, logout, lineItems, setLineItems, reps, setReps, vendors, customers, setCustomers, setVendors, selectedJob, setSelectedJob, notify, getJobItems, getJobFinancials, getItemStatus, updateLineItem, addLineItem, deleteLineItem, updateJob, addJob, deleteJob, updateRep, addRep, deleteRep, addCustomer, updateCustomer, deleteCustomer, addVendor, updateVendor, deleteVendor, forceDeleteVendor, db, setPage, viewCustomer, brainQuery, customSops, addSop, deleteSop, triggerPrint, dbStatus, confirm, confirmJobId, globalSearch, dateFilter, pendingCommPreview, pendingBrainFile, pendingBrainEmail`.

`ctx.confirm(message, opts)` takes `opts = {ok, cancel}` to relabel buttons. A named ok button renders teal; the default is Cancel / red Delete.

### Roles
admin sees everything. office sees everything minus financial and comp pages. sales sees only own data. Cuts happen at the source: `visibleJobs` filters by rep, prospects by `assignedRep`, the Brain receives pre-filtered data, `_allowedPageIds` hard-guards the router, Vendor 360 is excluded for sales. `jobReportDate(job)` is the business date for period filters (invoice doc date, then latest delivery date, then due date, then created date).

### Dates
Bare `YYYY-MM-DD` strings are wall-clock. Parse with `parseLocalDate`. **Never** `new Date("YYYY-MM-DD")` (UTC, renders a day early in Central). Server "today" is `Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'})`.

### Design system
Pure black `#000000` page. Cards `#111111`, subtle `#0a0a0a`. Teal `#2dd4bf` (primary), purple `#a78bfa`, success `#34d399`, warning `#fbbf24`, danger `#f87171`, orange `#f97316`. Text ramp `#f0f0f0 > #c4c4c4 > #9a9a9a > #737373 > #525252`. Satoshi for UI, JetBrains Mono for numbers. Radii 14/10/8/6. Reuse `Card, Btn, Badge, Bar, Header, Check, I, AnimNum`. Never recreate them. Responsive helpers: `resp-grid-2`, `resp-grid-4`, `notes-layout` collapse under 768px.

## 5. Data model

Supabase tables (snake_case in DB, camelCase in JS): `jobs`, `line_items`, `reps`, `customers` (has `type`), `users` (email, hashed password, role admin|office|sales, rep_id, page overrides), and `sops`, the polymorphic table whose `content` is a **JSON string** (cast `content::jsonb` in SQL). GL Phase 1 tables: `accounts` (numbered chart), `period_locks` (PK `period` 'YYYY-MM'), `ledger_audit` (append-only via trigger).

### jobs
- `id` is `JOB-2026-###` (the UI shows `MW-####`). `jobs` has **no job_num column**; `jobToDb` drops `jobNum`.
- `db.saveJob` is POST `on_conflict=id` merge-duplicates (an **upsert**). `db.insertJob` is a plain POST that reports 409 as a conflict. New jobs use `fetchJobIds` for database-numbered ids and `insertJob` with a 409 retry/rekey; never upsert a new job (that is how a stale tab once overwrote another job).
- `updateJob` saves the whole object (a field-level PATCH would be safer; backlog).

### sops (by `cat`)
`ManualTxn` (amount is a STRING), `StandaloneBill`, `VendorCredit` (amount NUMBER, date key `creditDate`), `Prospect`, `Notes`, `Task`, `File`, `DocStatuses`, `Invoice` (register). Never surface `PlaidConn`, `Config`, `Settings` cats. Singleton settings rows: `DOC_STATUSES_GLOBAL`, `BANK_ACCOUNT_META`, `BANK_BALANCES_GLOBAL`, `CUSTOM_CATEGORIES`, `LATE_ARRIVALS_GLOBAL`, `PLAID_CONN_STATE`.

### Doc numbers, statuses, payments, invoices
- `stableNum(prefix, jobId, customerId)` gives `INV-<last4 job>-<last4 customer>`, e.g. `INV-6309-W67E`.
- Doc statuses and payments live in `sops` id `DOC_STATUSES_GLOBAL` (cat `DocStatuses`), keyed by stable doc number. Statuses persist in three places (per-job `j.docStatuses`, the global sop, localStorage) and reads merge all three.
- Payments are keys `PAY-<ts>-<rand>` holding `{jobId, amount, date, ref, method, deposit, memo, invoiceNum, docUrl, docName}`.
- `__date`, `__due`, `__stripe` suffix keys are per base doc number (so all invoices on a job share one date/due date today; backlog).
- **Invoice register:** `sops` rows with cat `Invoice`, id `INVR-...`, content `{invoiceNum, jobId, ..., lines:[{lineItemId, description, qty, unitPrice}], total, paid, kind, source}`.
- Partial invoicing (round 20): `fileInvoice()` writes a register row; second and later invoices get suffixes (`-2`, `-3`) via `nextInvoiceNum`; invoice preview/PDF/email show only lines with qty > 0 (held-back lines at qty 0 are dropped); Receive Payment shows "Balance due on this project" and per-invoice open balances via `allocateInvoicePayments` (oldest first). Export PDF and Email call `offerToFileInvoice()` when `invoiceNeedsFiling()`.

### Postgres law already in place
- Period-lock trigger `enforce_period_lock()` on financial cats (BEFORE INSERT/UPDATE/DELETE).
- Unique index on the Plaid transaction id inside `sops.content`.
- System-account protection on `accounts`; `ledger_audit` append-only.
- Prove a trigger by attempting the forbidden write as anon inside a rolled-back transaction and catching the exact exception.
- `fetchAll` returns NULL on a failed page (a partial list once rendered every transaction Uncategorized and let a sync re-import 66 duplicates). Never "fix" this by returning partial data.
- The `vendor-invoices` storage bucket needs both upload and select policies.

### Other code patterns that must survive edits
- **Vendor bills:** `unpaidBills` derives from full `allBills`; `unpaidIdx = unpaidBills.indexOf(bill)` is identity-based; `billVendorFilter` narrows only what is rendered. `_isFullyPaid` needs `cost > 0.005`; explicit void/unpaid beats computed; sane-date guard (2000 to 2100) before overdue math. Keep the Brain's bill tools in sync.
- **Brain** (`api/brain.js`): models `claude-sonnet-5` (complex) and `claude-haiku-4-5` (simple). Output caps are the API maxima (128000 and 64000). Non-streaming callers clamp to 21333. An empty `max_tokens` turn retries at the ceiling; a `max_tokens: X > Y` 400 self-heals at Y. Brain tools `create_job`, `duplicate_job`, `create_job_from_file` await `confirmJobId`. Brain has an undo.
- **Notes:** one renderer (`noteInlineHtml` + `NoteBody`) drives live preview and saved view; text is HTML-escaped before markdown replacement (output goes through `dangerouslySetInnerHTML`).
- **Tasks:** `_sendTaskEmail` fires from `saveTask`; future-dated tasks email on the due morning via `api/task-reminders.js` (`dueNotifiedFor` is the dedup marker).
- **Links:** `LINK_KINDS` (job, customer, vendor, prospect) plus `calDate` put one Task/Note on the calendar, board, notes page and the linked record.
- **Plaid:** hourly sync to `/api/plaid-transactions`; dedup first by feed id, then by content hash against a fresh authoritative DB read; if that read fails the sync aborts; feed categories never become user categories; transactions inside a closed period go to `LATE_ARRIVALS_GLOBAL`.
- **Worksheet/vision import:** PDFs, images, worksheets go through `/api/ai-scan`. Excel quirks (embedded newlines, hidden columns, header detection) are the top import failure.
- **Stale-tab protection (round 19):** a wake/interval re-sync (30 s tick; after a 120 s gap, debounced to 60 s) replaces jobs, lineItems, vendors, customers, reps, sops only when non-empty and keeps pending (`_pendKey`) jobs; a `.newer-build-banner` prompts Refresh.

## 6. Build and test harness

The harness lives in an ephemeral scratchpad and is **not in the repo**. Recreate it. This is the part that makes changes safe, so do not skip it.

### Setup (outline)
1. `mkdir nodework && cd nodework && npm i esbuild jsdom react react-dom @babel/parser` (add `@babel/core` if you want parse checks via Babel).
2. Stubs (tiny files): `stubs/clerk.js` (exports `ClerkProvider`, `useUser`, etc. as no-ops returning a signed-out/empty shape), `stubs/recharts.js` (components that render `null`), `stubs/xlsx.js` (an object with no-op `read`/`utils`).
3. A build script (`buildA.js`): `esbuild.build({entryPoints:[SRC+'/App.jsx'], bundle:true, format:'cjs', platform:'node', jsx:'automatic', alias:{'@clerk/clerk-react':clerkStub, recharts:rechartsStub, xlsx:xlsxStub}, define:{'import.meta.env':'{}'}, outfile:OUT})`. A second script bundles App2/App3 as entries for their own tests.
4. A stub `supabase.js` where `window._supabase.db` has every method as an async stub (`loadAll, saveSop, saveJob, insertJob, fetchJobIds, fetchJobRow, ...`) so tests can override only what they assert on.
5. `_dom.js`: sets up jsdom globals (window, document, sessionStorage, localStorage, matchMedia). Tests mount the default export with an admin session in `sessionStorage` (`mw_user`) and override `db.*` per test.

### Battery (run all, every change)
Parse every edited file with Babel/esbuild (`api/*.js` as plain modules). Bundle App.jsx as entry and confirm the two/three-file wiring resolves. Confirm each src file is under 1 MB. Audit the diff: every hunk maps to an intended edit, nothing else moved. Run an invariant string battery (expected counts for every new symbol and for untouched anchors such as `getJobFinancials`, `unpaidIdx`, the export/import lists). Run adversarial sims on the **shipped** slices (extract with `indexOf`, wrap in `new Function`, feed null/undefined/garbage/boundary dates/DST/leap day; never retype the logic). Run jsdom render and interaction tests that drive the real component and assert on stored state, not on what an input displays. As of round 20 the suite had 28 suites (parse, bills_tab, review_tab, human_cats, commissions_page, sales_quarter, brain_credits, bill_credit, fin_csv, app_flow, helpers, stale_sync, sync, modinit, planner, supabase_map, vendor_credits in two timezones, balance_sheet, brain_power, brain_undo, job_ids, job_insert, supabase_jobs, stale_tab, partial_invoice, prodbundle) all green, with a production bundle of about 2.02 MB.

### Mutation rule
For each change, build a mutant that reverts or breaks it and confirm the test goes red. After round 20, 12 of 12 mutants were killed. A new test that passes on HEAD proves nothing. The round 20 partial-invoice test (25 assertions) passed only 5 of 25 on HEAD, which is exactly why it counts.

### Known test traps
- In jsdom, input events on unfocused elements are no-ops.
- `AnimNum` floods `act()` warnings; filter them.
- `sops.content` is a JSON string.
- Button text can carry suffixes ("N items"); match with regex.
- The bills table has a totals row inside `tbody` (filter rows by cell count).
- `Check` renders a `div`, not an input.
- Assignee toggles show first names only.
- Doc invoice buttons only appear after PO statuses are seeded in `DOC_STATUSES_GLOBAL`.
- Order-insensitive assertions (sort first) avoid false failures.
- A page `useEffect` reading `localStorage`/`matchMedia` needs those on `global`.

## 7. Deploy path

J has no local git and no token, so production deploys are **paste-commits through the GitHub web editor in J's Chrome**. If Codex has repo write access of its own, use normal git (still one change per commit, still verify the live bytes). Otherwise follow this exactly:

1. **Stage the verified file under a NEW unique name each round** (e.g. `_push_r21_App.jsx`). Reusing a name once delivered a stale cached file; an md5 check caught it.
2. Place it in J's connected Mac folder `/Users/jbartlett/Desktop/\]/CLAUDE/CLAUDE FOR MIDWEST/` (the folder name contains a literal `]`; in AppleScript strings write it `\\]`).
3. On the Mac: md5 the file; `export LANG=en_US.UTF-8; export LC_ALL=en_US.UTF-8; cat file | pbcopy` (without the LANG export pbcopy mojibakes UTF-8); `pbpaste` to a check file and confirm the md5 matches.
4. In Chrome open `github.com/jbartlett27/midwest-aios-app-2/edit/main/src/App.jsx`, click into a long code line, confirm the active element is the CodeMirror content area, select all, paste, jump to the end. The gutter's last line number must equal `wc -l` + 1.
5. "Commit changes...", type a clear message, add the description with the attribution lines, confirm Commit changes in the dialog.
6. Cleanup: delete the `_push_*` and check files, clear the clipboard.
7. **Verify:** `git clone --depth 1` and `cmp` against the tested file; Vercel `list_deployments` on the DYFRENT team shows READY; fetch the live JS asset and grep for the new strings. Only then call it shipped.

Never claim a step is done because a command was issued. Read the bytes back.

### Supabase migrations
Apply by name via the Supabase connector (migrations, not ad hoc DDL). Take or confirm a backup before any data repair. Rule of thumb: migrate the database first only if the new code requires it; otherwise code first.

## 8. Access Codex will need

J has no local git or token, so Codex needs its own path: either (a) J adds Codex as a collaborator or provides a fork/PR workflow he approves, or (b) Codex produces the final verified file(s) and J (or Claude) paste-commits them. Codex must not ask for or handle J's GitHub login. Supabase and Vercel access run through connectors authorized by J; Codex should not request raw keys. Production reads of Supabase data should be SELECT-only unless J approves a specific write. The anon key is already in the public repo (RLS is permissive by design for now; tightening RLS is a larger roadmap item, not a quick fix).

## 9. Current state (HEAD 5621e1c)

File md5s at this commit: `App.jsx` 8807e383df863357fa7b2b835b496798 (6,942 lines), `App2.jsx` 662ee829c9d97e31e79d1aa38ccd1d52, `App3.jsx` 16165133f5a610dfdfca2c4346d3c9cf, `supabase.js` c2eb758a09df0bac43ab151cafd0d7e3. Live deploy `dpl_4bXPtQifrg33Betz8dTX6quZBbDW` READY on the DYFRENT team, asset `index-CgiFVtZa.js`.

Recent builds (full write-ups are in the MIDWEST APP project docs, newest first): partial invoices, invoice numbers and balance due (10/24); connector outage and Vercel team move (10/21); stale tabs never rewrite jobs plus wake re-read and refresh banner (10/14); database-numbered jobs, insert never overwrite (10/14); job number collision fix (10/13); Brain undo (10/07); Brain agent loop, reports and bookkeeping (10/06); balance sheet book balances (10/05); vendor credits at pay time (10/01); Sales Portal quarter/year picker (10/01); commissions by quarter (9/30); bank feed dedup, tombstones, rules, Review tab (9/27); App3 split and vendor bills (9/27).

## 10. Backlog and known issues (priority order)

1. **JOB-2026-321 (Anne M. Jeans Elementary Table Tops)** was resurrected on 10/14 without its 2 line items: `LI-1784826483112-001-zktv` ('36" Square Table Top - SLB', received 4) and `LI-1784826483113-002-hstj` (Freight, received 1), prices 0, Storlie bill $462.80. Needs the Supabase backup (J must pull it) to restore, plus a diff of `jobs` against the 10/14 backup to find any other casualties. Do not guess the data.
2. **App.jsx is at 858 KB** with a 1 MB paste ceiling. Split DocumentsPage (and its helpers) into its own file, or adopt the parts/ concatenation pattern. If Codex has real git access this constraint relaxes.
3. **Per-invoice date/due overrides:** `__date` and `__due` are keyed by the base docNum, so all invoices on a job share one date and due date. Key them by issued invoice number.
4. **Stripe "Create Payment Link"** uses the preview's base total, not the issued partial invoice total.
5. **Date inputs accept year 0002.** Add a sane-year guard (2000 to 2100). JOB-2026-309's `INV-6309-W67E__due` is currently "0002-08-19" (a typo Maureen was told to fix in the Due box). Maureen has not yet filed the two Branka's Office invoices (no Invoice register rows for that job).
6. **`updateJob` saves the full object;** move to field-level PATCH to shrink the lost-update window.
7. **MCP `get_job`** does not list invoice records; add them in the MCP repo, not here.
8. **GL Phase 2** (journal entries) is pending. `CRON_SECRET` is unset on the app project.
9. **`CsvUpload.jsx`** is dead code carrying old logic; remove when convenient (its own change).
10. **Housekeeping (needs J's yes):** disconnect the duplicate/paused personal Vercel projects (especially `midwest-aios-app-2-wq6v`, which still builds on every push); about 20 old unsent drafts to Maureen sit in Gmail.

## 11. Working loop for each change

1. Read the ask literally. Quote Maureen's or J's words in the build doc.
2. Fresh clone of HEAD; record md5 of every file you will touch. Never edit a copy from an earlier turn.
3. Find the real cause in code, not the symptom. Read the whole function. Check every save path that could drop a field (`{...p}` spreads, form resets).
4. Surgical edits: assert each anchor appears exactly once; several small edits beat one rewrite.
5. Run the full battery plus mutants (section 6).
6. Deploy (section 7) and verify live bytes.
7. Write a build doc to the MIDWEST APP project: `claude/YYYY-MM-DD <what> build.md` with the ask quoted, root cause, hunks, battery table, live evidence, backlog carried over.
8. Draft (never send) a plain-language note to Maureen in J's Gmail, CC joe@dyfrent.vip, in-thread.

If nothing needs to change after reading Maureen's mail, change nothing and give J a short write-up.

## 12. Things that have bitten us (do not repeat)

- Stale cached staging file reused by name: always use a fresh filename and md5 both ends.
- `pbcopy` without UTF-8 locale mojibakes non-ASCII characters (it once corrupted comment glyphs in a shipped commit).
- A job upsert from a stale tab overwrote a different job: new jobs are insert-only with database-assigned ids; wake re-sync keeps pending jobs.
- A partial `fetchAll` made every bank transaction look uncategorized: failed page must return NULL and abort the sync.
- Anchors that appeared twice (e.g. `invoiceNum:invDocNum,`) caused a missed edit: widen anchors until unique, and count after.
- Vercel scope: resources 404 when the connector lacks the right team; list teams first.
- Feed categories must never become user categories.
- Never `new Date("YYYY-MM-DD")`.
- Tests that cannot fail: always watch them go red on a mutant first.
