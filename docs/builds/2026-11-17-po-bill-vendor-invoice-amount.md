# 2026-11-17 Vendor Bills >> a PO bill can hold the amount on the vendor's invoice

## The ask

Maureen forwarded Lisa (11/17): "Since we received the chairs separately, 19 of the 20 chairs were shipped immediately. We were invoiced for the 19 chairs plus freight, and we entered invoice 774758 for $3,377.80 without any issues. Once we received the second invoice for the remaining single chair, we entered a standalone invoice, 774970, for the balance of $171.20. When we receive the last chair, it will add the remaining balance of the order to the original invoice 774758. Currently, we need to leave one chair showing as not yet received in the job records, so the invoices match what the vendor has sent us." (JOB-2026-963 Woodfield ES - Chairs, Doane Keyes, BILL-6963-SUKI.)

## Cause

A PO-tied bill has always been priced from what has been received on its PO (unit cost x qty received), so it climbs as items arrive (the May 2026 McCourt fix). That is right when the vendor sends one invoice that grows with the order. Doane Keyes invoiced each shipment separately, so receiving the 20th chair would push BILL-6963-SUKI from $3,377.80 to $3,549.00 while standalone bill 774970 also billed that chair: $171.20 counted twice. The only way to keep the payables right was to leave the chair unreceived, which makes the Delivery Tracker wrong instead.

## Change

- `src/poBill.js` (new): `poBillAmount(items, billData)` returns the received value, and the vendor invoice amount when the office entered one (`invoicedAmount` on the bill's DocStatuses entry). Blank or unreadable means "follow what has been received", exactly as before.
- Every place that prices a PO bill uses it: the Vendor Bills tab and bill detail (`src/App.jsx`), the Brain's bill list and `record_bill_against_po` message (`src/App2.jsx`), Financials accounts payable (`src/App3.jsx`).
- Bill detail >> BILL SUMMARY has **Amount on Vendor Invoice** (PO bills only): shows what has been received so far, saves on blur or Enter, refuses anything that is not a dollar amount, and clearing it returns the bill to following receipts. The open panel refreshes at once.
- No existing bill changes: no bill carries `invoicedAmount` today, so every amount stays as it was until someone fills the box. Job cost (`getJobFinancials`) is untouched; it never read bills.

## For JOB-2026-963

On BILL-6963-SUKI enter 3,377.80 in Amount on Vendor Invoice, then mark the 20th chair received. The PO bill stays at $3,377.80, 774970 stays at $171.20, Total Owed is $3,549.00 and the Delivery Tracker shows all 20 chairs.

## Proof

`tests/reliability/po-bill-amount-test.mjs` (8 mutants): the helper on the DKA numbers, the real DocumentsPage Vendor Bills list before (the $3,549.00 double count) and after ($3,377.80 plus $171.20), the detail box save, clear and refusal, and a guard that no PO-bill pricing outside the helper remains in App.jsx, App2.jsx or App3.jsx. Full battery green, every mutant rejected, `vite build` passes.
