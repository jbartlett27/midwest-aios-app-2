# Vendor catalogue controls >> November 12, 2026

## Request and scope

J: "make sure there's a delete button or whatever and the brain can edit and delete the vendors catalogues push the update and write the email back to Maureen."

Implementation base: `de1a3b501119da9b3b112d127f9a16d928586163`, isolated branch `codex/catalog-controls-20261112`. The release coordinator owns publication, verification and the client reply. This note records the tested implementation; deployment verification is recorded separately.

The vendor profile had upload/read controls but no Delete Catalog control. Brain had upload/read tools but no catalogue lifecycle tools. Generic SOP writes optimistically deleted/reinserted rows without verifying persistence. Catalogue uploads reused deterministic row IDs and storage paths, which could overwrite an archived catalogue's retained files during concurrent upload.

## Change

- Vendor Directory's Catalogue button opens the profile for active or deleted catalogues. Profile has a selector for multiple uploads and obvious Edit Catalog / Delete Catalog controls, including when the catalogue file cannot load.
- Delete moves only the exact selected `sops` row to `VendorCatalogDeleted`. Restore is explicit and confirmed on the vendor profile. No storage file is deleted or rewritten by edit/delete/restore.
- Edit supports only title (1 to 160 characters) and publication edition (unknown, year, or valid date, 1900 to 2100). It retains vendor identity, file addresses, original PDFs/page pictures, products and all other content metadata. Replacement content uses a separate upload. Displayed title/edition takes the persisted metadata, not the old values embedded in the static JSON file.
- Brain edit/delete tools require the exact catalogue ID and a uniquely resolved Directory vendor. The proposal names vendor, catalogue, edition, ID and proposed metadata changes, captures the expected row, and waits for the existing on-screen Confirm. Cancel does not write. Sales/unknown roles cannot execute these tools. New lifecycle tools deliberately do not use the unsafe generic undo mechanism; deleted catalogues can be restored on the vendor page.
- Catalogue lists disclose all loaded IDs, including multiple uploads for the same vendor. A failed JSON load still discloses metadata IDs, allowing management of broken uploads. Read tools also accept an exact catalogue ID in their vendor argument.
- Catalogue-specific persistence performs one atomic conditional PATCH on exact ID, category, content string and title, then verifies exactly one matching returned row. Failed, stale, wrong-row, zero-row or unverified responses do not report success or optimistically remove a record. Upload uses verified insert-only POST, not upsert or delete/reinsert. Local state changes only after verified persistence.
- Every new upload gets a unique record ID and storage namespace. Same-title/same-edition uploads add separate catalogues instead of silently replacing any existing upload. This preserves archived files and prevents concurrent new-client upload from resurrecting/deleting an existing row. Repeated upload clicks and Brain confirmations have synchronous locks.

## Verification

The committed reliability battery includes three new offline suites:

- `catalog-lifecycle-test.mjs`: injected HTTP row store, exact CAS filters/body, insert-only behavior, stale/repeated writes, wrong/no/multiple returned rows, network/permission errors, strict metadata validation, retained metadata, vendor isolation and the actual shell's awaited persistence/local state update.
- `catalog-controls-ui-test.mjs`: actual Vendor360/Directory components, exact confirmation, Cancel, repeated clicks, failure/retry, restore/reload, interrupted vendor navigation, metadata edit persistence, multiple catalogue selection and failed/pending upload insert.
- `catalog-brain-controls-test.mjs`: actual Brain proposal/confirmation execution, Cancel, repeated Confirm, role denial, ambiguous/no/wrong record selection, stale UI/database, failed/unverified save, metadata restrictions, complete metadata IDs including broken files.

Existing catalogue tests cover isolated same-title upload namespaces/record IDs and unchanged existing blobs, metadata display overrides and exact-ID read selection. Deliberate mutants are required to fail on behavior, and the aggregate runner now rejects missing mutation anchors rather than counting setup failure as a killed mutant. All app/API files are parsed and protected financial/import/ID helpers remain unchanged. No live login, client-data mutation, storage change, schema migration or email send is used as a test.

Final frozen-candidate checks passed: `node tests/reliability/run.mjs` (complete committed battery, all deliberate mutants including 21 new lifecycle/controls/Brain mutants, and final clean shell), `npm run build` (486 modules), and `git diff --check`. The final local app asset was `index-Bq2Eloff.js`, SHA-256 `39286a4f5468cd1db1e4aabce3f961720ce46b5084e2c50fc21d9785f4f9d518`. All source/test files matched the recorded tested manifest after checks. Existing Vite CJS API and large-chunk warnings remain; there is no root lint script. This evidence does not claim authenticated live interaction or deployment completion.

## Limits and operating notes

- This is recoverable removal, not physical erasure. Stored PDFs, extracted catalogue JSON and page pictures remain. Cancelled/failed uploads may leave unlinked files; no cleanup or bulk deletion is introduced.
- Existing already-open pre-release clients still hold their old upload/delete-reinsert logic until refreshed. No database migration or policy change was authorized, so this release cannot retroactively constrain those clients or other legacy writers. Users should refresh before uploading or managing catalogues. New clients use the conditional/insert-only paths above.
- A request can commit remotely while its response is lost. The UI reports the outcome as unconfirmed and asks for a refresh; it does not claim failure proves no write happened. Retrying a stale delete/edit cannot silently mutate a changed row. A retry of an unconfirmed upload can add another separate catalogue, never overwrite the prior one.
- Confirmation and concurrency guards are application behavior, not new database authorization rules. Existing account/role/storage/database policies remain unchanged. Atomic conditional row writes do not establish a global cross-system constraint.
- Read tools using only a vendor name retain the prior newest-edition preference. Use the listed exact catalogue ID to inspect a particular upload. Management tools never infer that preference.
- Root dependency installation remains the documented unlocked fallback because the root lockfile is inconsistent. No lockfiles, dependencies, unrelated financial behavior, production data or security settings were changed.
- The separately approved earlier removal of the mistaken NPS legal-document catalogue is not repeated by this code change.
