# 2026-11-23 Furniture Planner and quote portal (midwestaios.com/plan)

## The ask

A public page where a school or business plans a space with a scoped Midwest Brain, gets a planning quote built from the real catalogues (no prices), downloads it as a branded PDF and requests a priced quote, which lands as a Prospect card. Booking is optional, the link is set in admin (Dave first), and only a confirmed booking assigns the rep. White page with a dark mode toggle, admin picks the default look, and a daily AI spend limit any admin can change.

## What shipped

- `src/main.jsx` >> `/plan` loads `src/planner/Planner.jsx` on its own (no Clerk, no app bundle). Everything else loads the app as before.
- `vercel.json` >> two rewrites so `/plan` serves the SPA. Crons untouched.
- `api/plan.js` (function 11 of 12) >> `op=config`, `op=chat`, `op=request`, `op=booking`.
  - The Brain sees four tools only: `list_vendors`, `search_products`, `get_product`, `update_plan`. They read the approved VendorCatalog files. No job, customer, cost, pricing or note data is reachable.
  - `src/planCatalog.js` is the allowlist: price-list catalogues give no specs or images, money is scrubbed from specs, and a plan line must exist in a catalogue (anything else is reported as unconfirmed).
  - `op=request` validates the contact, is idempotent on a browser request id, stores the PDF in `vendor-invoices/planner/`, and creates or updates the Prospect with the same duplicate keys as the Prospects page (`src/prospectKeys.js`). It confirms only after the save.
  - `op=booking` is a signed Calendly `invitee.created` webhook. It sets Meeting Set and assigns the rep whose calendar took the meeting. A link click changes nothing.
  - Daily spend limit: table `planner_spend` plus `planner_spend_get()` and `planner_spend_add(cents)` (America/Chicago day, migration `planner_daily_spend`). The chat stops with 429 when today's spend reaches `PLANNER_SETTINGS.dailyLimit` (default $10). Downloads and quote requests keep working. Each model call adds its token cost.
  - Per IP: 40 chats and 8 requests per 10 minutes.
- `src/planner/planPdf.js` >> pdf-lib letter PDF with a logo header and footer on every page, Page X of Y, and table rows that never split. There is no price column.
- `src/plannerSettings.jsx` >> the Users & Permissions card (App2 UserMgmtPage). It sets the default look (light or dark), the daily AI limit with today's spend, the default rep, a booking link and calendar emails per rep, and the webhook setup text. All of it is saved in the `PLANNER_SETTINGS` sops row.

## Tests

- `tests/reliability/planner-test.mjs` covers no price leaks, unknown codes dropped, the four tools, the prompt rules, create, repeat and duplicate-merge requests, email validation, the booking URL, a signed vs forged webhook, rep assignment, booking dedupe, the config keys, prospect keys equal to App2's, and the daily limit (under, at, and 0).
  - 8 mutants, all killed, wired into `run.mjs`.
- Browser test (Playwright, mocked API) at 402x874, 874x402, 820x1180, 1440x900 and 2560x1440: 48 of 48 pass.
  - It checks the white landing, no sideways scroll, product cards, the plan, quantity edits, a real PDF download, that the request carries the plan, campaign and PDF, the booking offered after the save, the admin dark default and the toggle.
- Full battery green, `vite build` green.

## Setup left for Midwest

1. Users & Permissions >> Furniture Planner: paste Dave's booking link (Calendly) and his calendar email.
2. For confirmed-booking assignment: create a Calendly webhook (invitee.created) to `https://midwestaios.com/api/plan?op=booking` and set its signing key as `PLAN_BOOKING_SIGNING_KEY` in Vercel.
3. Adjust the daily AI limit if $10 is not right.
