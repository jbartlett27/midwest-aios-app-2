# 2026-11-06 Vendor catalogue: upload for any vendor, full page cards in the Brain, split PDFs

## The ask

J: "it should have prices and all the information in the catalogue, and it should not simply say its on page 2 or whatever it needs to pull all information from page 2 and give it to the user with really nice ui ux in the brain when asked ... make it so in the directory you can upload a catelogue to any vendor ... make sure can upload larger 150mb large pdfs ... the brain can do that also and the brain can read and see all the vendor catelogues in detail". Follow-ups: "it would be nice to be able to open the pdf" and "this one didnt have prices but others may, dont make a rule against it".

## What changed

- **Prices.** The WB PDF is the no-price edition (only the third-party insert on pages 139-140 shows figures such as $6995.00). Nothing was invented. Any catalogue that has prices carries them: model rows keep their columns and dollar figures, the page text keeps every printed line, and `hasPrices` is detected from price-style column headings and dollar figures (scaled to page count so a few stray "$" never flip it). The upload dialog also lets the office say yes or no.
- **No sales-role price rule.** The earlier rule that hid priced catalogues from the sales role is gone. Every role sees every loaded catalogue.
- **Page cards in the Brain.** `read_catalog_page` and the one-page results of `search_vendor_catalog` now return a full card: the page picture, every model row on the page with its columns, every line printed on the page (prices included), and links to the previous and next page and into the PDF at that page. The Brain is told privately to explain the page for the user's question and never to answer with only a page number. `see: true` also hands the page picture to the model for questions about drawings and finishes.
- **Open the PDF.** The 148 MB WB PDF is stored in five pieces under the 50 MB single-file limit of the storage bucket (pages 1-59, 60-102, 103-138, 139-171 and 172-180, each 24 to 35 MB). The vendor page shows one Open button per piece and a "This page in the PDF" button that opens the piece holding the page. The Brain cites the same links.
- **Upload for any vendor (Directory, vendor page, Brain).** `src/catalogIngest.js` reads a catalogue PDF in the browser with pdf.js (pinned CDN), rebuilds table rows from text positions, finds model codes, sections (bookmarks, falling back to page titles) and prices, renders a JPEG of every page, splits a large PDF into page runs with pdf-lib (sized to stay under the 50 MB single-file limit, and halved again if a piece still comes out too big), uploads everything to `vendor-invoices/catalogs/<vendorId>/<slug>/`, and writes the link row. Size is limited only by browser memory (tested with a 143 MB made-up PDF and the real 148 MB WB PDF). Dialog: Directory row button "+ Catalogue" or "Catalogue", the vendor page "Upload catalogue", with progress, Stop, and a result summary with warnings.
- **Brain upload.** Attach a PDF with the paperclip (PDFs over 25 MB are never base64-sent to the model) and say whose catalogue it is. `ingest_vendor_catalog` asks for Confirm, then runs the same engine. Office only. It refuses when no PDF is attached, the vendor is not in the Directory, or two vendors match.

## Files

`src/catalogIngest.js` (new engine), `src/vendorCatalog.js` (page card text, picture and PDF links), `src/App2.jsx` (dialog, Directory button, vendor-page panel, four updated Brain tools plus `ingest_vendor_catalog`, image rendering in the Brain chat, big-PDF attach path), `tools/ingest-browser-check.mjs` (manual real-browser check), tests below. `src/App.jsx` is untouched. `App2.jsx` is now 731 KB.

## Live data changed

Link row `VCAT-V-z1tb0ol6x-2026` now carries `pageImgBase` and `pdfParts`; storage holds 180 page JPEGs and the 5 PDF pieces for WB. The WB JSON is unchanged.

## Proof

- Battery (`node tests/reliability/run.mjs`): module suite (22 mutants), upload engine suite (20 mutants: column rebuilding, price detection, bookmarks, splitting, retries, cancel), page, dialog, Directory and Brain suite in jsdom (29 mutants: Directory button, link row saved, edition validation, Stop, progress, big PDF kept from the model, office-only, no-PDF, unknown vendor, two vendors). Every mutant is rejected.
- Real browser (Playwright, storage replaced by a stand-in that refuses any file over 50 MB like the live bucket): a 143 MB made-up PDF and the real WB PDF both ingest, pieces are contiguous and cover every page, no stored file is over 50 MB.
- `vite build` succeeds; the built bundle contains the new strings.

## Limits and notes

- Reading happens in the browser tab; the tab must stay open until the progress bar finishes (a 150 MB file takes a few minutes).
- Scanned catalogues with no text layer produce page pictures but no model rows; the dialog warns about pages with no readable text.
- A newer edition for the same vendor is added and becomes the one in use; the same title and edition replaces that upload.
- Secrets: storage uses the public anon policies already in place; no credentials were added.
