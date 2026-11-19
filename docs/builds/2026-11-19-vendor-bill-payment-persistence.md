# Vendor Bills payment persistence

Vendor Bills placed its browser fallback ahead of the shared document registry. An older fallback could display an unpaid bill, blank check fields and an empty payment trail even when the database still held the payment. A render regression reproduced the partial-payment case against the prior code. A read-only production check confirmed the four reported checks and eight bills with a November 2 pay date. No payment records needed to be recreated.

Vendor Bills, Financials and Brain bill reads now use the shared bill data ahead of browser state. Document edits send only the keys changed, and Postgres applies them atomically against the version the user saw. Distinct edits can coexist, while conflicting edits require review of the current data. Cached older clients cannot delete or replace the shared registry. Refresh any browser tab that was open before this release.

The payment flow confirms the shared write before reporting success. A rejected batch edit does not proceed to print or apply the remaining plan. Verify offline with the committed reliability battery and the production build. A local PostgreSQL regression exercises conflicts, preservation of unrelated keys, batch rejection, retries, rollback of a key, and the legacy-write guard. The production readback uses the stored records and requires no payment entry or check printing.
