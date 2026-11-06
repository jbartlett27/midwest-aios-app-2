# 2026-11-05 Vendor catalogue: WB Mfg on the vendor page and in the Brain

## The ask

J: "LOOK AT THE VENDOR CATALOGUE IN THIS FOLDER FOR WB mfg. i want the full product list full catalogue list all the information about this vendor I want it linked to the Vendor WB in the Midwest app >> so if you click on the vendor, you can get all the information. also the brain can pull all the vendor catalogue information >> the brain can fully read see and report on everything it knows about the vendor when that vendor catalogue is uploaded. ... and then we can do this for all the vendors just starting with this one for now."

## How it works

A catalogue is a structured JSON file in storage plus one small `sops` row (cat `VendorCatalog`) that links it to a vendor id. The row says where the file is; the file holds every page of text, the table of contents, and every model row found in the product tables. Nothing about a catalogue is stored in the app bundle.

- `tools/extract_vendor_catalog.py <pdf> <config.json> <out.json>` turns a catalogue PDF into the JSON (needs `pdftotext`, standard library only). The per-vendor config (`tools/vendor-catalogs/wb-mfg-2026.config.json`) names the vendor, the PDF's own table of contents and the pages that carry no products.
- `src/vendorCatalog.js` (pure, network injected): loads and caches a catalogue, searches model codes and words, looks up one model, reads one page, and writes the text the Brain and the page show.
- `src/App2.jsx`: `VendorCatalogPanel` on the vendor page (shows only for a vendor with a catalogue), four read-only Brain tools (`list_vendor_catalogs`, `search_vendor_catalog`, `get_catalog_product`, `read_catalog_page`), a one-paragraph catalogue line in the Brain system prompt, and `VendorCatalog` kept out of the Playbook and the Brain's procedure list.

## WB Mfg result

180 pages, 72 sections, 5,020 model rows covering 4,439 distinct model codes, 213 product index entries. Edition 2026-07-31, no prices. File stored at `vendor-invoices/catalogs/V-z1tb0ol6x/wb-mfg-2026.json` (1,229,147 bytes); the row is `VCAT-V-z1tb0ol6x-2026`.

## Proof

- Battery: `vendor-catalog-test.mjs` (synthetic catalogue, 15 mutants, every one rejected) and `vendor-catalog-brain-test.mjs` (real Vendor360Page, BrainPage and PlaybookPage in jsdom, 10 mutants, every one rejected). Full `run.mjs` battery and `npm run build` pass.
- Live: commits d66433538d (App2) on top of b2830417ab (module). Vercel deployment READY on midwestaios.com; the live asset contains all four tool names, the prompt line and the panel text; the catalogue file is fetchable from the app origin and identical to the local copy (md5 bf694a2a).

## Limits

- Parsed rows are text taken from the PDF. Colors, finishes and drawings are visual only; the page text and the PDF carry them.
- No prices in this edition, so the Brain says so rather than guessing. The sales role never sees a catalogue marked as having prices.
- Page numbers are PDF pages; the printed page number is the PDF page minus 2.
- A few false-positive "codes" exist (for example CLW6, D780487 from a patent line). The page text is always the source of truth.
- The PDF itself is not stored (148 MB); the panel shows an Open PDF button only when a `pdfUrl` is on the row.
- The catalogue lists phone 800.242.2303 and a Thorp, WI address; the vendor record in the app has 800-242-2323 and a Carol Stream, IL remit-to address. Not changed.

## Adding the next vendor

1. Run the extractor with a new config (vendor id, table of contents, non-product pages).
2. Upload the JSON to `vendor-invoices/catalogs/<vendorId>/`.
3. Insert one `VendorCatalog` row with the vendor id, url, counts and `hasPrices`.
