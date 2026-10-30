# Midwest invoice reliability regression checks

Run from the repository root:

```
npm --prefix tests/reliability ci --ignore-scripts --no-audit --no-fund
node tests/reliability/run.mjs
npm run build
```

The test package is separate from the app's existing mismatched root lockfile. It uses synthetic records and a mocked database, auth, charts, spreadsheet module, clipboard and fetch. It never logs in, calls a real payment provider, sends email or writes client data.

The battery parses all app/API files, checks source sizes and protected money/import/ID helpers, bundles the real three-file app with stubs, initializes its default shell, drives the real invoice and dashboard components, and checks exact shipped updater/ledger slices. Date boundaries run in UTC, Chicago and Los Angeles. Seven deliberately broken variants must fail before the final clean render passes.

This is a durable battery for the five invoice-reliability changes. It does not claim to recreate Claude's missing historical 28-suite scratchpad or to exercise live payment/provider behavior. The root production build must pass independently.
