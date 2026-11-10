# 2026-11-10 Vendor catalogues: load from a link, and read every product (codes and names)

## The ask

J: "make it so Maureen can upload a link or catalogue into the brain and it'll add it to the vendor ... they can add vendor catalogues and it adds a link or pdf and the brain reads it and is smart and puts everything in there like WB. But Maureen can do this in the brain or in the directory for each vendor without having to send them to me ... make sure the model rows for all the ones that maybe should have more, Joy Carpets, Columbia Manufacturing etc. they have a bunch of pages, make sure you get all their products and models."

## Why the thin catalogues had almost no rows

The text was always there. The model-code reader only knew codes that mix letters and digits (AB1000, 0469JC). These catalogues print theirs differently:

- Joy Carpets and Carpets for Kids print item numbers with a number sign: "#2066", "#18116", "#72.91".
- Columbia prints hyphenated letter series: "CH-OM-CL-G-12", "CH-OM-LF-C-AD", "DK-TLG-HEXA-2133-AL".
- CEF and MITY are lookbooks: products are named ("HYVE ROCKER", "DuraBench 40", "PALMANOVA") with no codes at all, and MITY prints names letter-spaced ("P A L M A N O V A").

## What changed

- `src/catalogIngest.js`: two new code patterns (number-sign item numbers, hyphenated letter series with guards against "STATE-OF-THE-ART", "PRE-K-12", "#1" and phone numbers); letter-spaced names closed up in the page text; a product-name pass for pages with readable text but no model codes, where an AI reader lists the products and only names and codes actually printed on that page are kept (nothing invented can get in); `fetchCatalogFromLink` / `clearDownload` / `aiProductsVia` for links; the link a catalogue came from is kept as `sourceUrl`.
- `api/catalog.js` (new function, 9 of 12 on Hobby): `fetch` downloads a vendor PDF from a link (any size up to 600 MB, Google Drive and Dropbox share links turned into downloads, redirects followed, private network addresses refused on every hop) into 40 MB temporary pieces in storage that the browser joins back into one PDF; a web page link answers with the PDF links found on it; `clear` empties the temporary pieces afterwards; `products` asks the small model (claude-haiku-4-5, no web search) for the products on up to 8 pages at a time.
- `src/App2.jsx`: the upload dialog (Directory "+ Catalogue" and the vendor page "Upload catalogue") takes a PDF or a pasted link; a web page with one PDF is followed, with several it lists them to pick from; the summary counts named products. The Brain's `ingest_vendor_catalog` takes a `url` (a pasted link wins over an attached file) and lists the PDFs on a web page link and asks which one.

## Results on the live catalogues (same PDFs, old reader vs new code reader, before the name pass)

| Catalogue | Pages | Rows before | Rows now (codes only) |
|---|---:|---:|---:|
| Joy for Learning | 37 | 0 | 119 |
| Carpets for Kids 2025 | 72 | 4 | 766 |
| Columbia Manufacturing | 64 | 0 | 338 |
| CEF 2026 Lookbook | 54 | 10 | 10 (names come from the name pass) |
| MITY Product Guide | 30 | 1 | 5 (names come from the name pass) |

Re-ingest results with the name pass are recorded in the project build note.

## Proof

Full battery `node tests/reliability/run.mjs` green: catalogue upload engine 44 mutants, new catalogue link and product-name server suite 13 mutants, vendor page / dialog / Directory / Brain 44 mutants, every one rejected. `vite build` passes. No client PDFs or data are committed.
