# Directory Catalogue opens the loaded vendor catalogue

Maureen asked: "One question, should the catalog in the directory open when we click on it?"

Owner and release coordinator: Codex session 01a1b1b7-1faa-70d2-b774-7142f5b1a00f. Isolated branch codex/directory-catalogue-01a1b1b7, base main abfde3901d3e4f73274a962005548211b23c04d9. No shared local servers or processes. Initial discovery found no open issues/PRs and only the main remote branch. The task thread records ownership and scope. Public issue creation was rejected by automatic approval review; no issue was created or retried. Main must be rechecked immediately before publication.

## Cause and surgical change

The Directory vendor-row button said Catalogue when a catalogue existed, but always called setCatUp, opening the upload dialog. The existing synthetic regression even expected this behavior. The public production asset /assets/index-Ce2uE1CP.js, SHA-256 97271bdf310260a54d816324987e7f3c44457c7eba8a1ecab87fbd1268425ce0, confirmed the same handler. Vercel production was READY at abfde3901d3e4f73274a962005548211b23c04d9, deployment dpl_3Lvph39C7PwKmVFt8azswKuwaX1t.

Only that button handler changes: if a catalogue is loaded, select the row's vendor ID and navigate to the existing vendor360 page, which already renders Vendor Catalogue, search, page text/images and PDF controls. Otherwise + Catalogue retains the upload dialog. Existing vendor-page Upload catalogue remains available. Vendor names still open their inline analytics; Full Profile also opens the vendor page.

No catalogue import/index, live record, storage, database, role, auth or deployment configuration changes. The separate existing-index approval remains untouched.

## Verification

The new regression failed on original code: after clicking Catalogue, selected vendor remained V-plain rather than V-acme. With the fix, it asserts the exact vendor ID, vendor360 navigation, no upload dialog and no additional save. Existing checks still exercise + Catalogue upload, vendor association, vendor-page search, page images/text and PDF pieces. An added mutant restores the old click handler and must fail; the existing upload mutant now targets the unchanged no-catalogue branch.

Validation: full offline reliability battery and all 105 deliberate mutants; production Vite build; node syntax checks for edited test files; source/API parse, source size and three-file stub bundle checks in the battery; complete hunk review and git diff --check. Build retains existing Vite CJS and large-chunk warnings. Exact publication/tree/deployment/asset evidence is saved in the task artifact after release.

## Practical steps and limits

Refresh the AIOS, open Directory >> Vendors, then click Catalogue on WB Mfg's row. The vendor page includes Vendor Catalogue. Use a section or model/word search, then click the page number to read a page; the PDF buttons open the stored PDF pieces. To replace/add a catalogue, use Upload catalogue on that vendor page. + Catalogue is for vendors without one.

The complete latest email and its sole image were inspected; the image is the Midwest signature logo, not an app screenshot. Read-only live browser verification reached Sign In. No sign-in or live data mutation was performed. Behavior is proven with real components and synthetic records; READY plus public assets prove publication, not an authenticated production click journey. No email was sent.
