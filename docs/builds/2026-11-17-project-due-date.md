# Midwest AIOS >> Project and invoice due dates

Maureen reported that some jobs showed a Due Date in Edit Job Record even though Lisa was not entering one; she reported clearing the dates. J asked to resolve the issue in code. The invoice preview and filing paths already use invoice-specific metadata; source inspection did not confirm the suggestion that those paths stamped the reported jobs. Historical origin of those specific dates is not established.

- Edit Job Record now calls this field Project Due Date (optional), explains the scheduling purpose, and omits it from a save when the form user did not change it. An unrelated edit in a still-open form can no longer re-submit the originally loaded project deadline after a newer value came in.
- A duplicate project starts with no project due date, matching the existing Brain duplicate behavior. Original projects and deliberate Delivery calendar date edits are untouched.
- In Receive Payment, each filed invoice displays its own validated due date, or derives it from its own valid invoice date and current job terms when necessary. The single legacy fallback row uses recorded invoice metadata or an unambiguous invoiced line date; without reliable evidence it shows Not set, not the project deadline or today's date. Multiple distinct line invoice dates alone do not establish one due date for that legacy row.
- This is display and job-form behavior only. No payment amounts, posting, terms, record storage, legacy A/R report calculations, schema, or historical dates changed. The existing invoice preview DateInput and change handler already reject year 0002; the invoice date reader filters invalid stored values without rewriting history.

The six focused assertions in project-due-date-test.mjs failed against baseline 7cf2d165bf33ef4540823e13f48a136612f858c8; the final fixture additionally checks ambiguity when multiple invoiced line dates exist. Tests use synthetic state and no provider or client data writes.
