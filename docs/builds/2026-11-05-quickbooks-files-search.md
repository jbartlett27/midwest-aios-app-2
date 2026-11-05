# QuickBooks exports searchable in the Files tab and the Brain

Date: 2026-11-05. Base: `e45be50`. Scope: one feature, no data or schema change.

## The ask

J: the QuickBooks exports (invoices, purchase orders, customer payments, vendor payments, check expenses) go into the Files tab; the Brain and the whole system should know what each document is, search and pull it up, and Maureen must be able to use it.

## What was found

The three exports already in the Files tab (2026 Invoices, 2026 Purchase Orders, 2026 Vendor Payments) are whole-year QuickBooks workbooks, not one file per document. The Files tab searched only file names and tags, and the Brain had no tool that read a stored file except the one-file "Read with Brain" button. So neither could answer "what was invoice 10367" or "what did we pay a vendor".

## What changed

- `src/fileIndex.js` (new, pure functions): reads workbook rows, finds the header row under the report title, classifies each sheet (invoices, purchase orders, bill payments, customer payments, checks and expenses, Journal Detail), builds records with number, name, amount, date and source file/sheet/row, skips the TOTAL and footer rows, links Journal Detail lines to a record, and searches by kind, number, name, words, amount, amount range and date range with totals over every match. Only the newest version of a file is indexed. A file that cannot be read is reported and never hides the others.
- Brain (`src/App2.jsx`): `list_files`, `search_file_records`, `get_file_record`, `load_file`. All read-only. The record tools are admin only, like the other Financials tools. The system prompt tells an admin that the Files tab holds QuickBooks exports, to cite file, sheet and row, and to say which system a number came from. Non-admin conversations get no QuickBooks data and no instructions about it. Brain replies now render `[text](https://...)` links as clickable links.
- Files tab (`src/App2.jsx`): admin-only "Search inside QuickBooks files" panel with a kind filter, a results table, and a detail view with Journal Detail lines and a link to the stored file. New categories Customer Payment, Vendor Payment and Check Expense; the category list is de-duplicated so a custom category with the same name is not shown twice.

## Evidence

- Real exports, checked locally and not committed (the repo is public): 313 invoices / $3,530,618.88, 336 bill payments / $2,747,468.44, 217 checks and expenses / $668,357.48 match the TOTAL rows QuickBooks wrote; 389 purchase orders; 3,731 Journal Detail lines. The first attempt without the TOTAL-row rule double counted the invoices, which is why the rule and its mutant exist.
- `tests/reliability/file-index-test.mjs` (synthetic data): dates and amounts, classification, search, totals, journal links, versions, failure isolation and caching, plus a real xlsx round trip when the package is installed. 8 deliberate mutants, each rejected by the intended assertion.
- `tests/reliability/files-brain-test.mjs`: the real FilesPage and BrainPage in jsdom. An admin searches and opens a record; a non-admin sees nothing; the Brain calls each tool through its real tool loop and the results carry source links; a non-admin conversation contains no QuickBooks data; the reply link is clickable. 6 deliberate mutants, each rejected by the intended assertion.
- Full battery (`node tests/reliability/run.mjs`) and `npm run build` pass.

## Limits

- The index reads the stored exports; it is a snapshot as of the export date. Upload a newer export (same file name makes a new version) to refresh.
- QuickBooks numbers are not matched to the app's INV-/PO- numbers. The Brain is told to say which system a number came from and to report differences.
- No customer-payments export has been uploaded yet. That sheet shape is covered by synthetic tests and the header rules only; check it against the first real file.
- PDFs and images take two Brain steps: `load_file`, then the user's next message carries the file. Spreadsheets are searched, not loaded.
- Admin only, matching the Financials tools. Document search by content inside PDFs is not part of this change.
