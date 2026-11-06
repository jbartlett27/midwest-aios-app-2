# Catalogue editions preserve the source's precision

Request: "the authenticated catalogue uploader rejects a blank edition date"; accept unknown or year-only editions without inventing a publication date.

Owner and release coordinator: Codex session 01a1afc6, delegated catalogue edition fix. Isolated branch codex/catalogue-edition-01a1afc6 in task/edition-fix. Base main: f352798593bfa2029fded7ccf3bc6ece84c97e7d. No local server or shared process is used. The parent retains the authenticated catalogue loading session and client communication. No open GitHub issues or PRs were returned during coordination discovery; remote main was checked for changes before implementation and must be checked again before release.

## Cause and behavior

The dialog prefilled today's date and required YYYY-MM-DD; the shared engine also substituted today when no edition was passed. This blocked honest unknown/year-only entries and conflated upload date with publication date.

The dialog starts blank, labels Edition optional, and explains the permitted formats. A shared normalizer accepts an omitted/null/blank edition as an empty string, a four-digit year exactly as supplied, or a real calendar date. Whitespace is trimmed. Invalid types and impossible dates are refused before PDF reads or writes. The same engine serves the dialog and Brain upload tool, whose metadata instructions now prohibit using the upload date as the edition.

Both the JSON catalogue and vendor link row retain the same edition precision. Unknown editions display as "unknown" in vendor and Brain text. Storage paths and row IDs use an explicit unknown suffix; supplied year/date IDs retain their existing form. uploadedAt/generatedAt remain separate processing dates. Known editions retain the current selection/sort behavior, and unknown editions sort after known editions. No existing catalogue or vendor data is migrated, merged or deleted.

## Scope and checks

Changed source: src/catalogIngest.js, src/App2.jsx, src/vendorCatalog.js. Regression tests and runner are scoped to catalogue edition behavior. No auth, permissions, security, database schema, vendor identity, model-code parser or provider settings changed.

Before source edits, new regressions failed on original code: engine returned 2026-11-06 for an omitted edition instead of empty, and the real dialog started with that date instead of blank. Engine checks assert persisted JSON/link metadata for undefined, null, blank, whitespace, year-only and full dates, and refuse invalid values with zero writes. Real dialog tests assert the saved link row for blank/year-only input; Brain tests verify metadata passed to the shared engine and saved from its result. Vendor and prompt tests verify unknown/year displays. Deliberate mutants restore invented dates, append January 1 to years, accept impossible dates, erase unknown labels or restore incorrect Brain instructions; each must fail.

Validation passed on the final candidate: node tests/reliability/run.mjs (all source/API parse and size checks, financial/import/ID invariants, UTC/Chicago/Los Angeles date checks, synthetic component/storage tests, full offline three-file bundle, and all 101 deliberate mutants rejected); npm run build (484 modules); git diff --check; complete hunk review. The regression failures on original code and four new engine, two module and three UI mutants were observed. The shallow clone needed git fetch --unshallow to supply the invariant suite's historical baseline; the baseline was not changed. The production build retains its existing Vite CJS API and large-chunk warnings. Exact commit/tree/deployment/live-asset evidence is recorded in the task release artifact after publication.

## Limits

This is an offline-tested code release, not proof of a live catalogue upload. This session does not sign in or load catalogues. The parent must refresh the authenticated app after verified deployment and continue loading, vendor-association checks and actual search verification. Existing rows with previously invented edition dates are unchanged because their actual publication metadata cannot be inferred safely. Same-title/same-edition re-upload behavior remains as before, including explicit unknown editions; distinguish genuinely different undated catalogues by title rather than inventing dates.
