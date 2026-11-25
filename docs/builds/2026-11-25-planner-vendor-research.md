# Furniture Planner vendor research

Maureen, November 25, after setting up Academia and excluding Lakeshore Learning: "Next, I'll work through the rest of the vendors in the AIOS. Many of them offer a wide range of products, so I need to figure out the best way to research them, so the Furniture Plan pulls from the vendors we use most."

## What changed

Users & Permissions >> Furniture Planner vendor recommendations now does that research for staff.

- **Vendors Midwest buys from most** sits at the top of the card. It ranks every vendor with an indexed catalog by how many jobs Midwest has ordered from it (the existing `vendorUsage` company history), shows whether each is set up (Preferences set, Do not recommend, Not set up yet) and selects a vendor in one click. Vendors Midwest orders from whose catalogs have no indexed products are named underneath, because the planner cannot recommend them until a catalog with products is loaded.
- **Research >> suggested tags** appears under the tag fields for the chosen vendor. It reads that vendor's loaded catalogs in the browser and Midwest's orders with it, then offers grade, category and space tags as chips with two numbers: matching catalog products, and Midwest jobs that mention the tag. A chip adds the tag to the field; Add all suggestions adds every one. Nothing is saved until Save vendor settings, which uses the existing version-checked save.

A tag is offered only when the planner's own matching (`plannerWords`, `categoryWords`, `indexedProductText` from `src/plannerVendorPolicy.js`) finds it in that vendor's indexed products, so a suggestion cannot be a tag that does nothing. `preferredProduct` was refactored only to share `indexedProductText`; its behavior is unchanged. No money is shown: rankings and suggestions use job counts and product labels only.

## Files

- `src/plannerVendorResearch.js` (new): ranking, suggestions, top purchases, tag merging. Pure functions.
- `src/plannerSettings.jsx`: `MostUsedVendors` and `VendorResearch` in the vendor card.
- `src/plannerVendorPolicy.js`: exports `categoryWords` and `indexedProductText`.
- `src/App2.jsx`: Users & Permissions passes company jobs, line items and customers to the card.
- `tests/reliability/planner-vendor-research-test.mjs` (new) and `run.mjs`.

## Checks

The new jsdom test renders the real card with a synthetic company and catalogs: ranking order and statuses, the no-catalog note, no dollars on screen, only the chosen vendor's catalog fetched, expected and absent suggestions with counts, one-click add beside typed text, Add all, the saved JSON keeping other vendors' rules, and the saved tags making `preferredProduct` true for a pre-K cubby request. Five deliberate mutants (catalog presence, ranking, category normalization, keeping typed tags, excluded status) each fail it. The full reliability battery and `npm run build` pass.

Limits: suggestions are only as good as the indexed catalog text; a catalog with no products or unreadable text yields none. Staff still decide which tags fit.
