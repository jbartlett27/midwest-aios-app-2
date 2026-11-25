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

## Follow-up after the first live test

- The live Brain wrote em dashes. Replies now go through `plainDashes` (ranges keep a hyphen, other dashes become commas), and the prompt forbids them.
- About 70% of catalogue lines carry a sentence fragment or a bare size where the name should be. `productName` uses the name when it is a real name, otherwise the page series or section (with the size kept, as in "Classroom Table 60 x 30"), otherwise "Model CODE". It was checked against all 63,170 live catalogue rows.
- The live request test found a real bug: Midwest has 1,156 Prospect cards and the database answers at most 1,000 rows per call, so newer cards were invisible to the duplicate and repeat checks (three test requests made three cards). `db.prospects()` now reads every page. The test card fakes 1,156 rows.
- A page titled with a file name ("2026_Section1_pages-001-049_02") is never used as a product name.
- 4 more mutants; planner total 12. First live spend reading: 65 cents for 3 conversations, so the $10 default allows roughly 45 a day.

## Setup left for Midwest

1. Users & Permissions >> Furniture Planner: paste Dave's booking link (Calendly) and his calendar email.
2. For confirmed-booking assignment: create a Calendly webhook (invitee.created) to `https://midwestaios.com/api/plan?op=booking` and set its signing key as `PLAN_BOOKING_SIGNING_KEY` in Vercel.
3. Adjust the daily AI limit if $10 is not right.

## Round 2 from J's iPad review

- The Brain builds the quote itself: as soon as it knows the space and headcount it picks products and saves them to the plan in the same turn, keeps every existing line, saves every project fact, and asks at most 3 questions about the missing essentials (school, grade, room size, timeline, location). The chat shows "Added N items to your plan" with a View plan button. `runChat` returns `added`.
- Project details: filled ones show as tiles, missing ones as "+ Label" chips that open in place.
- Dark mode uses a white-wordmark logo (`public/mw-logo-dark.png`); the PDF keeps the original.
- Light mode declares itself to the browser (`color-scheme: only light`, `theme-color`, `darkreader-lock`), because a Safari dark-mode extension was darkening the white page.
- Composer hint fits on one line; safe-area padding only on phones; "New plan" shows as "New" on narrow phones; Start planning always opens the chat.
- Sales Portal and Users & Permissions have a Furniture Planner bar with Open planner (new tab) and Copy link.
- 15 planner mutants; browser check 74 of 74.

## Vendor purchase history for every login (Maureen, Nov 23 2026)

Ask: Jim Lindner (sales) looked up purchase history for a vendor and saw only his own purchases; Maureen wants everyone to see the company's full history with each vendor.
Cause: sales logins get role-filtered jobs, and both the Brain (pre-filtered data) and the Directory vendor panel built the history from those.
Fix: `src/vendorHistory.js` (company history and vendor ranking), a read-only Brain tool `vendor_purchase_history` fed from the whole company (captured before the sales filter), and the Directory vendor panel counting every company job with a "Most ordered products" list. Sales logins see it without dollars (units instead of cost; spend and margin cards hidden for them; jobs on other reps' accounts are listed but not clickable). Tests: `vendor-history-test.mjs`, 6 mutants.

## Round 3 from J's iPad review

- Any size of project: plan lines up to 250, quantities up to 100,000, an `area` on each line ("Grade 3 classrooms (12 rooms)", "Cafeteria"), model room 8000 tokens and 10 tool rounds. The prompt plans big projects by area (a standard room package times the room count) and asks about room counts and phases.
- Iteration: any change the customer asks for is saved to the quote in the same turn (update_plan with the full list); notes and areas already on screen are kept when the model re-sends a line.
- Product names: a nameless line takes its name from the catalogue row before falling back to the section ("Mobile CafeteriaTable with Benches or Stools", not "Tables").
- Quote screen: lines grouped under area bands; project details and notes wrap onto as many lines as they need; roomy line layout when the quote pane is narrow.
- PDF: opens in a new tab every time it is pressed (the tab opens at the tap, so Safari never blocks it; falls back to a download); area bands, repeated as "(continued)" across pages.
- "Request a priced quote" comes first.
- Planner link bar redesigned: icon, link, Copy link with a Copied state (and fallbacks), Open planner in a new tab; checked in a browser at desktop and phone width.
- 24 planner mutants; browser check 94 of 94.

## Reps and the default rep (Maureen, Nov 24 2026)

Ask: "please make Dave the default rep. The email address his calendar uses is dwelter@mwfurnishings.com. We don't use a booking link. Is this something that we will need to set up for this new feature?" and "If a customer wants to book a meeting with Jim Lindner, our rep in the Milwaukee area, how would that work?"

Cause: a planner request saved the Prospect card with no rep (`assignedRep: ''`); the default rep only chose whose booking link to offer. There was no way for a customer to ask for a particular rep.

- `api/plan.js`: `plannerReps(settings)` lists the reps Midwest offers (name and area only, never an email); `chooseRep` takes the customer's pick when it is offered, otherwise the default rep. A new card is assigned to that rep; an existing card keeps its rep (an unassigned one takes the new rep). The card notes say who was asked for and the best time to reach the customer. `bookingFor` uses the chosen rep's own link (none if that rep has none, never another rep's calendar). `op=config` adds `reps`; `op=request` returns the rep's name.
- `src/planner/Planner.jsx`: the request form has "Who would you like to talk with?" (No preference, then each offered rep with their area) and "Best time to reach you (optional)". The confirmation names the rep ("Jim Lindner from Midwest has your plan..."), and the booking button says "Book a call with Jim" when Jim has a link.
- `src/plannerSettings.jsx`: per rep, "Customers can choose" (defaults to reps with the Sales role) and an area shown to customers; booking link and calendar emails are marked optional; any https booking page works (Calendly, Microsoft Bookings with me).
- Booking links stay optional: without one, the rep follows up by email or phone from the card.
- Tests: section 6 of `planner-test.mjs`, 6 more mutants (planner total 30). Browser check (mocked API) at 402x874 and 1440x900: rep list, pick, best time, request payload, confirmation text, no sideways scroll.
- Data: `PLANNER_SETTINGS` written with Dave (S001) as the default rep, his calendar email, and the sales reps offered (Dave, Jim Harris, Jim Lindner, Jackie Biller).

## Connect Calendly per rep (J, Nov 25 2026)

- Users & Permissions >> Furniture Planner: each rep has a "Connect Calendly" button. The rep's Calendly personal access token is pasted once and sent to `POST /api/plan?op=calendly-connect`, which reads the rep's name, calendar email and booking page (their one active event type, otherwise their Calendly page) and creates a user-scope `invitee.created` webhook to `?op=booking`. The browser fills the link and calendar email, marks the rep `calendly: true` and saves the settings. The token is never stored, logged or returned.
- The webhook signing key is `signingKey(env)`: `PLAN_BOOKING_SIGNING_KEY` when set, otherwise an HMAC derived from the server's existing secret, so connecting a rep needs no new environment setting and the key never reaches a browser.
- A signed booking whose host calendar email matches no configured rep now returns `unknownHost` and leaves the card alone, so a calendar Midwest did not connect cannot move or assign a Prospect card.
- Tests: section 7 of `tests/reliability/planner-test.mjs`, mutants 30 to 34. `render-test.mjs` had an invoice due 2026-11-24 that became overdue on its own; its due date is now far in the future.

## Rep share links, added reps and the email path (J, Nov 25 2026)

- Share links: `midwestaios.com/plan?rep=jim-lindner` (the slug comes from the rep's name; the rep id also works). The planner remembers it on that device (`mw_plan_rep`) and preselects that rep in the quote request. Customers still pick a rep only inside "Request a priced quote", never before. Without a link, the request goes to the default rep, named in the first option ("I don't know my rep (Dave Welter will help you)"). Only reps marked "Customers can choose" are matched.
- Config now returns `defaultRep` (the default rep's id, only when that rep is offered by name) and a `slug` per offered rep. It still carries no email.
- Users & Permissions >> Furniture Planner: per rep an Email field, "Copy share link", and for reps added here (id `PX-...`, `added: true`) editable names and Remove. "Add a sales rep" takes name, email, area and booking link. Add and remove save immediately; removing the default rep falls back to Dave (S001).
- After a request, when the rep reached has no booking link, the response carries `repEmail` (the rep's email, otherwise their calendar email) and the confirmation shows "Email <first name>". With a booking link there is no email, only "Book a call with <first name>". Both open in a new tab.
- Tests: section 8 of `planner-test.mjs`, mutants 35 to 39.
