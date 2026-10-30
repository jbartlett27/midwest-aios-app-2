# Midwest invoice reliability updates

Request from J: "Go through and make these updates. Make sure they are perfect. And deploy after everything is perfect and shipped write up an email to Maureen with the updates in nice formatting."

Starting main: daa7defe26115151d57c02e6d83ee93e767821cc. The five requested changes are overdue-invoice accuracy, separate invoice dates, issued-amount payment links, invalid-date prevention, and safer job saves. No schema/data repair, permissions change, account cleanup or backlog expansion is included.

## Result

- Dashboard and invoice reminder cards use registered invoice due dates and the existing invoice-payment allocator, counting unpaid balances rather than full invoiced totals. Legacy unregistered invoices use a recorded invoice date when available. A job's creation date is never used to invent invoice age; records with no reliable invoice date are omitted from overdue alerts.
- Date and due-date overrides belong to the issued invoice number. Filing stores both on the register record. Preview, PDF and email share the date reader. Proformas and credits have separate date keys. Related status changes persist together rather than dropping one field during React batching.
- Checkout requests use the same selected quantities, amount and issued invoice number as the issued document. Links are stored per invoice and shown only while their amount matches. Filing keeps the selected quantities on screen. Credit/proforma previews do not offer checkout.
- All literal date inputs in the three active app files use a shared control that rejects impossible dates and years outside 2000-2100 before changing the parent form value. It explains that the previous date was kept; other fields stay intact. Existing bad data is not silently repaired.
- Existing job edits PATCH only changed mapped columns, including audit-only writes made after line edits. They cannot recreate a deleted job. Unchanged edit-form fields and mapper defaults are excluded. Save failures show a notification.

## Verification

`node tests/reliability/run.mjs` passes. It includes real component interactions and stored-state assertions, exact shipped-code simulations, strict calendar boundaries in three timezones, all-source/API parsing, source-size and protected-helper checks, three-file stubbed bundling, default-shell initialization, and seven rejected deliberate mutants. `npm run build` passes with 683 transformed modules. Existing large-chunk/CJS warnings remain.

The historical scratchpad suite was unavailable. This report describes the reconstructed battery actually run, not the historical 28 suites. Tests use fake data and intercept all provider/database activity. No real checkout, payment, email or database mutation was used as a test.

## Remaining limits

Field-level PATCH reduces overwrites of unrelated job columns. Simultaneous edits to the same column, or separate keys inside the same JSON column, still require stronger database concurrency controls and are not claimed solved. Invoice balances follow the existing allocator and explicit paid/open marks. Unknown legacy invoice dates require review rather than guessed aging. Previously created payment sessions are not revoked by this change.

Root package-lock.json remains inconsistent with package.json. Local production dependencies were installed with lifecycle scripts disabled and package-lock changes disabled; production compilation passed. The isolated test package has its own consistent lockfile.

Deployment and live-byte verification must be recorded in the release result after the authorized main update. The release follow-up was prepared as a formatted in-thread draft with Joe CC'd under the then-current preference. For future Midwest messages, leave Joe off by default unless J explicitly asks to include him; verify the thread audience without automatically retaining Joe from history. This audience correction does not modify existing messages/drafts or change sending authorization.
