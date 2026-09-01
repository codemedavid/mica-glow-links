# TDD Evidence — September 1 new SKUs (SG11–SG15)

**Date:** 2026-09-01
**Source of truth:** price list screenshot, rows 182–186 (codes `SG11`–`SG15`)
**Source plan:** none — journeys were derived during this TDD run from the
screenshot and the previous sync, [`august-25-pricelist.tdd.md`](./august-25-pricelist.tdd.md).

## User journey

> As the shop owner, I want the five SG11–SG15 skincare SKUs from the latest
> price list on the live site, so that a customer can be quoted them without me
> typing each one into the admin page.

## Method

This is an **addition**, not a sync. `0005` restated all 196 catalogue rows
because the August 25 spreadsheet was newer than the table; five new SKUs do
not justify that, and restating the catalogue would revert any price the owner
has edited from the admin page since. `0006` therefore names only the five new
codes.

Three transcription decisions, each recorded in the migration header:

| Decision | Why |
|----------|-----|
| `spec` from the packaging column, not the description | Continues [`a37ba46`](../../). The description column is sales copy; the packaging column is what is in the box. |
| The sheet's `Contains` / `Set Contains` lead-in dropped | Spreadsheet chrome for a human reader. No existing spec carries it — compare `5ml/10vials`, `1 pair`. |
| `stock` is `unknown` for all five | The sheet's stock columns are blank for these rows. `in` would quote a customer something that may not be there. |

`category` is `Peptides`, matching `SG01`–`SG10`. The grouping is coarser than
the products are, but a new SKU is not the thing that should split it.

### The transcribed rows

| Code | Name | Spec | Price |
|------|------|------|-------|
| SG11 | PDRN Peptide Eye Patches | 30 pairs / 85 grams | ₱499 |
| SG12 | Dark Spot Brightening Cream | 35 mL Tube | ₱499 |
| SG13 | Rejuvenating Solution Serum | 10ml x 5 vials | ₱699 |
| SG14 | Microbiome Radiance Ampoule | 7ml x 5 Ampoules | ₱649 |
| SG15 | Kojic Acid Brightening Cream | 50.7grams tube | ₱499 |

## Task report

### 1. Reproducer — `src/data/newSkuMigration.test.js`

Holds the migration and the bundled catalogue to the same five rows, with the
transcribed price list embedded as the specification.

```
$ npx vitest run src/data/newSkuMigration.test.js
Tests  6 failed | 1 passed (7)
AssertionError: expected false to be true   # migration 0006 absent
AssertionError: expected '' to match /on conflict\s*\(code\)\s*do update/i
```

RED for the intended reason: `0006` did not exist and `SG11`–`SG15` were not in
`products.js`. The single pass was vacuous — "carries nothing beyond the five"
over an empty row map. Checkpoint: `b96c44c`.

### 2. Migration — `supabase/migrations/0006_add_september_1_skus.sql`

Five-row upsert inside a transaction. `ON CONFLICT (code) DO UPDATE` rather
than `DO NOTHING`: nothing here exists yet, so the conflict branch only fires
on a re-run, and on a re-run the intent is to correct a mistyped row rather
than silently skip it. Refreshes `updated_at` so the addition is auditable.

### 3. Bundled catalogue — `src/data/products.js`

The same five rows appended. The calculator reads Supabase and only *falls back*
to the bundle, so a migration alone would leave the SKUs invisible to every
customer the fallback serves — and a bundle-only edit would leave them invisible
to everyone else.

### 4. Invariant — `src/data/priceListSync.test.js`

Previously read `0005` alone and asserted it carried every bundled product.
Adding a SKU in a later migration would have failed it. The guarantee it is
actually defending is *what Supabase ends up holding matches the bundle*, so it
now reads the catalogue migrations in order, later files winning on a shared
code exactly as their upserts do.

### 5. Catalogue size — `src/data/products.test.js`

`toHaveLength(196)` split into `AUGUST_25_ROWS + ADDED_SINCE`, so the
spreadsheet's own count stays the record it is and a future addition moves only
the second number.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|--------------------|------|------|--------|
| 1 | The migration exists, so the SKUs reach the live catalogue and not just the fallback | `newSkuMigration.test.js:exists, so the new products reach the live catalogue` | unit | PASS |
| 2 | All five price-list SKUs are in the migration | `newSkuMigration.test.js:carries every new SKU from the price list` | unit | PASS |
| 3 | The migration touches nothing but those five, so no existing price is reverted | `newSkuMigration.test.js:carries nothing beyond the five new SKUs` | unit | PASS |
| 4 | Name, spec, price and stock match the price list exactly | `newSkuMigration.test.js:quotes the price list name, spec, price and stock` | unit | PASS |
| 5 | The bundled fallback carries the same five rows | `newSkuMigration.test.js:adds the same five SKUs to the bundled catalogue` | unit | PASS |
| 6 | A re-run corrects a mistyped row rather than skipping it | `newSkuMigration.test.js:updates existing rows rather than skipping them` | unit | PASS |
| 7 | The addition is auditable via `updated_at` | `newSkuMigration.test.js:refreshes updated_at` | unit | PASS |
| 8 | Every bundled product exists across the catalogue migrations, at the same price, spec and stock | `priceListSync.test.js` (8 tests) | unit | PASS |
| 9 | The catalogue is 196 sheet rows plus 5 later additions | `products.test.js:carries every priced row from the Updated Pricelist sheet` | unit | PASS |

```
$ npx vitest run
Test Files  16 passed (16)
     Tests  407 passed (407)
```

Checkpoint: `becec63`.

## Coverage

```
$ npx vitest run --coverage
File       | % Stmts | % Branch | % Funcs | % Lines
All files  |   92.57 |    87.53 |   79.37 |   92.57
 src/data  |   98.31 |    84.51 |     100 |   98.31
```

Above the 80% floor. No tests skipped or disabled.

## Known gaps

- **Stock is a placeholder.** All five land as `unknown` because the sheet left
  those columns blank. The owner sets real stock from the admin page; until
  then the calculator shows them without a stock claim.
- **The migration is not applied by this change.** It has to be run — `supabase
  db push`, or pasted into Dashboard → SQL Editor. Until then the five SKUs are
  served only by the bundled fallback. The migration file carries three
  verification queries for after the run.
- **Transcribed from a screenshot, not the workbook.** The prices and packaging
  lines were read off the image rather than parsed from the `.xlsx`, so they
  are worth a glance against the source sheet before the run.

## Merge evidence

RED `b96c44c` → GREEN `becec63`. No refactor commit: the implementation was
five data rows plus two test-invariant updates, with nothing left to clean up.
