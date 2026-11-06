# Catalogue model identifiers: numeric-leading suffixes and short series

Request: "Jonti-Craft's PDF contains model codes 0469JC and 0269JC on page 7, but the current importer detected zero model rows. CEF also produced zero."

Owner and release coordinator: Codex 01a1afc6, isolated branch codex/catalogue-models-01a1afc6, checkout task/model-parser-fix. Base main 950e900137d5226c4bddb250907fcc4d47fa9446. Parent owns the separate live importer and all client communication. No shared local servers/processes or live catalogue records are touched here. Discovery returned no open GitHub issues/PRs; main was rechecked during work and must be rechecked immediately before publication.

## Root cause and bounded fix

The reader already extracts text. The model recognizer allowed letter-leading codes and numeric-leading codes only when hyphenated. It therefore missed digit-plus-letter suffix identifiers such as 0469JC and 0324JC18. A separate four-character minimum discarded CEF's three-character ED4 and ED8 series identifiers.

The recognizer adds a bounded numeric-leading pattern (2-7 digits followed by 2-6 uppercase letters, optional alphanumeric suffixes/hyphenated variants), retains leading zeros, and allows three-character letter-leading identifiers. A unit suffix guard prevents common metric/imperial/electrical measurements from becoming models. Existing token boundaries, standard-body exclusions, deduplication and maximum length remain. Dates, phone numbers, prices, dimensions, units and standards have negative regression fixtures. No arbitrary named product is converted into an invented SKU.

Changed production file: src/catalogIngest.js only. Tests and runner count are updated. The prior optional-edition release stays intact; no app shell, role, auth, security, vendor data or catalogue display changes are included.

## Verification

Before source changes, regressions failed on original code for both numeric-leading suffix identifiers and ED4/ED8. Synthetic row/page fixtures now flow through ingestion into stored JSON, then exact catalogue search and product lookup, preserving source page numbers. New mutants remove the suffix pattern, restore the old minimum length, or remove the unit guard; each is rejected.

Local real-source check used the same pinned pdf.js 4.10.38 reader as the app, on downloaded public PDFs, and passed its text items through the actual old/new line and row functions:

| Source | PDF pages | Old model rows | New model rows | Distinct codes |
|---|---:|---:|---:|---:|
| Jonti-Craft | 68 | 0 | 741 | 713 |
| CEF 2026 Lookbook | 54 | 0 | 10 | 2 |

0469JC and 0269JC both resolve to Jonti-Craft PDF page 7. CEF yields ED4 on pages 5, 37, 38 and 51, and ED8 on pages 37 and 51 (some multiple occurrences). These counts are text/model occurrences, not an audited complete product inventory. Much of CEF is descriptive product/series content without printed SKU codes. Its text and page pictures remain the source for those products.

No manufacturer PDFs, full source text or client purchasing data are committed. Task-only parser-real-pdf-evidence.json records the measured counts. Validation passed: node tests/reliability/run.mjs (full offline battery, all 104 mutants rejected), the final added stored-JSON/search fixtures and 27 engine mutants, npm run build (484 modules), git diff --check and complete hunk review. Parse/size/invariant checks are included in the full battery. Exact deployed bytes are recorded in the task release evidence. Existing Vite CJS API and chunk-size warnings remain.

## Live-data handoff and safe re-ingestion plan

This code affects future imports only. Existing catalogue JSON with zero rows is not silently rebuilt. Do not interrupt a running import or refresh its tab until it finishes.

Before any re-ingest, the parent should record the exact vendor ID, current catalogue row/title/edition and source URL, and preserve the current row/JSON. Use a distinct accurate review title to generate a separate row and storage path, preserving the original import; do not use the same title/edition because the current uploader replaces that slot. Verify the new record's vendor ID, both exact Jonti-Craft examples on PDF page 7, ED4/ED8 for CEF, readable text and PDF/page links. Multiple records may affect which edition is automatically selected, so inspect actual selection and report it rather than assuming the new row is active. Any later replacement/retirement of the prior row is separate work; no deletes, merges or live re-imports are performed by this session.
