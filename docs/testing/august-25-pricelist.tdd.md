# TDD Evidence — August 25 price list sync

**Date:** 2026-08-26
**Source of truth:** `🪬🧿 🧬Mica - Pricelist 8_25_25 🪬 𓂀 🪬✨🧿 (3).xlsx`, sheet `Updated Pricelist` (219 rows, 205 with a code)
**Source plan:** none — journeys were derived during this TDD run from the
spreadsheet and the previous sync, [`august-4-pricelist.tdd.md`](./august-4-pricelist.tdd.md).

## User journeys

1. As the shop owner, I want the catalogue to stay in sync with the latest
   price list, so that quotes I give customers match what they are charged.
2. As a customer, I want to search the August 25 list and add a newly released
   item to my order, so that I can see what it costs before messaging the shop.
3. As the shop owner, I want the price list I upload to reach the **live** site,
   not just the bundled fallback, so that customers are not quoted August 4
   prices by a Supabase table nobody updated.

## Method

The column layout is unchanged from the August 4 sheet, so the mapping recorded
in that report still applies (A `code`, B `name`, C `spec`, F per-vial price,
E box price fallback, G `/N` divisor markers, I on-hand with H as fallback).

One deliberate change in approach: **the existing catalogue is treated as
curated truth for names and specs, and the spreadsheet as truth for price,
stock and membership.** Column B is mostly lab-report and marketing copy — 27
rows inherit their name from the row above and 10 have nothing but assay
blocks — so re-deriving names mechanically would have regressed the manual
corrections made on August 4 (`GTT` → Glutathione, `5AD` → AOD-9604 5mg, the
Lemon Bottle and 5-amino renames). Those names are now only ever changed
deliberately.

Stock mapping, extending the August 4 rules for values new to this sheet:

| Column I reads | Maps to | Note |
|---|---|---|
| `OUT…` (incl. `OUT, arrives in 2 weeks`) | `out` | prefix match |
| `TO ORDER BASIS`, `INCOMING`/`INCOMINH`, blank | `unknown` | not yet on hand; `INCOMINH` is a typo in the sheet |
| `LOW`, `LIMITED STOCK`, `COUPLE BOXES`, `N BOXES`, `N vials left` | `low` | an explicit small count outranks an accompanying `ONHAND` |
| `PLENTY`, `ONHAND`, `ON HAND` | `in` | |

## Task report

### 1. Extract and diff

Parsed with `openpyxl`, then diffed against the 181-product catalogue.
Result: **15 added, 0 removed, 4 price changes, 26 stock changes.**

`RETALIDE` appears twice in the sheet (rows 34 and 162). The later row is the
one already curated, and is the one kept.

### 2. RED

Wrote the August 25 expectations into `src/data/products.test.js` **before**
touching `src/data/products.js`.

```
$ npx vitest run src/data/products.test.js
 Test Files  1 failed (1)
      Tests  34 failed | 40 passed (74)
```

Failures were the intended business reason — the catalogue was still the
August 4 extract, so it lacked the 15 new items, carried the stale
PDRNSerum/EXO30/HA5 prices, and reported stock the 8/25 on-hand column
contradicts.

### 3. GREEN

Regenerated `src/data/products.js` (181 → 196 products).

```
$ npx vitest run src/data/products.test.js
      Tests  74 passed (74)
$ npm test
 Test Files  14 passed (14)
      Tests  389 passed (389)
```

### 4. RED → GREEN for the live catalogue

Updating only `products.js` would have been a half-sync: `useProducts` reads
Supabase and falls back to the bundle, so every customer reaching a healthy
Supabase would still have seen August 4 prices. Wrote
`src/data/priceListSync.test.js` first:

```
$ npx vitest run src/data/priceListSync.test.js
      Tests  6 failed | 1 passed (7)     # migration 0005 did not exist
```

Then added `supabase/migrations/0005_sync_august_25_pricelist.sql`:

```
$ npx vitest run src/data/priceListSync.test.js
      Tests  7 passed (7)
```

One correction was made to the test rather than the implementation: its row
regex omitted the schema's `category` column and so matched nothing. The
"carries every product" assertion is what exposed it — a vacuous regex fails
that test rather than passing silently.

### 5. RED → GREEN for the new items' specs

Reviewing the generated rows caught a defect in user-visible copy: the
extractor collapsed each spec cell to its **last** line, which on multi-line
cells is sales copy rather than packaging. `NBG60 mm` read "Plus, they're
blueberry flavored! 💜" and `ORALGTT` read "No pinning needed!…".

```
$ npx vitest run src/data/products.test.js
      Tests  3 failed | 74 passed (77)     # both specs, plus a no-sales-copy sweep
```

Both now read their packaging line (`60 gummies | Good for 1 month`,
`60 mL | 2,000 mg Glutathione`) and the suite is green at 77.

The migration carried the same drifted specs — and `priceListSync.test.js` did
not compare `spec` at all, so it passed while out of step with the catalogue.
That gap was closed before regenerating the migration:

```
$ npx vitest run src/data/priceListSync.test.js
      Tests  1 failed | 7 passed (8)       # spec comparison added
      Tests  8 passed (8)                  # after regenerating the migration
```

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|--------------------|-----------|------|--------|
| 1 | Codes are unique and trimmed; every product has a name and a positive, finite, 2-dp price | `products.test.js:catalogue integrity` | unit | PASS |
| 2 | `stock` is only `in`/`low`/`out`/`unknown`; `spec` is a non-empty string or `null` | `products.test.js:catalogue integrity` | unit | PASS |
| 3 | Names carry no lab-report boilerplate, no promo badges, no newlines, ≤90 chars | `products.test.js:catalogue integrity` | unit | PASS |
| 4 | All 15 newly listed items exist at their 8/25 price and under the right name | `products.test.js:August 25 — newly listed products` | unit | PASS |
| 5 | PDRNSerum, EXO30 and HA5 carry their reduced prices | `products.test.js:August 25 — repriced products` | unit | PASS |
| 6 | FR5, BA3PHRMAGREEN and BA10PHRMAGREEN read `out`, as the on-hand column now states | `products.test.js:August 25 — stock…` | unit | PASS |
| 7 | The five TMB products, RETALIDE, MICABLEND 3.0 and EXO30 read `in` | `products.test.js:August 25 — stock…` | unit | PASS |
| 8 | An explicit small count (TR100, RT60, MICABLEND 2.0) reads `low`, not `in` | `products.test.js:August 25 — stock…` | unit | PASS |
| 9 | To-order-basis items stay `unknown` rather than claiming stock | `products.test.js:August 25 — stock…` | unit | PASS |
| 10 | NS10 stays PHP 55 per ampoule with its pack size visible in the spec | `products.test.js:owner-confirmed corrections` | unit | PASS |
| 11 | Niimbot label printers remain excluded | `products.test.js:owner-confirmed corrections` | unit | PASS |
| 12 | The August 4 corrections and delistings still hold | `products.test.js:August 4 — corrections / delisted` | unit | PASS |
| 13 | Catalogue holds all 196 priced rows, with RETALIDE listed once | `products.test.js:August 25 — catalogue size` | unit | PASS |
| 13a | Specs describe packaging; no sales copy survives in any spec | `products.test.js:August 25 — specs describe packaging` | unit | PASS |
| 14 | The migration carries every bundled product and no extras | `priceListSync.test.js` | integration | PASS |
| 15 | Migration price, stock and spec match the bundled catalogue exactly | `priceListSync.test.js` | integration | PASS |
| 16 | The migration upserts rather than skipping on conflict, and stamps `updated_at` | `priceListSync.test.js` | integration | PASS |
| 17 | A new item is findable by name and code and totals price + shipping | `OrderCalculator.test.jsx` | integration | PASS |

Evidence command: `npm test`

## Coverage

```
$ npm run test:coverage
 Test Files  15 passed (15)
      Tests  400 passed (400)

File               | % Stmts | % Branch | % Funcs | % Lines
All files          |   92.55 |    87.53 |   79.37 |   92.55
  products.js      |     100 |      100 |     100 |     100
  OrderCalculator  |   96.17 |    92.15 |   81.81 |   96.17
  productsRepo.js  |     100 |    89.88 |     100 |     100
  App.jsx          |   57.76 |    74.41 |   10.34 |   57.76
```

Comfortably over the 80% threshold. `products.js` is at 100%. `App.jsx` (the
links page) is pre-existing and out of scope for this task.

Also verified: `npx eslint` clean on the changed files; `npm run build`
succeeds (493.18 kB JS, 140.13 kB gzipped).

## Owner-confirmed decisions (2026-08-26)

1. **NS10 stays PHP 55 per ampoule.** Column F still reads 275 with a `/5`
   marker and the row is otherwise unchanged from August, so the August 5
   ruling — that 275 is the 5-ampoule pack price — still applies. Guarded by a
   regression test.
2. **The three price reductions are applied as the sheet reads them.**
   PDRNSerum 910 → 345, EXO30 1,499 → 999, HA5 975 → 585.
3. **All 15 new items join the calculator.** They sit inline in the main
   catalogue with ordinary codes and prices, above the Niimbot group-buy header
   that starts the excluded section.

## Judgement calls and known gaps

Recorded because the spreadsheet is ambiguous, not because the tests are weak.

1. **FR5 now reads `out`, reversing the August ruling.** That ruling was
   specifically that "OUT OF STOCK" sitting in the *price* column says nothing
   about availability. On this sheet the *on-hand* column reads `OUT` outright,
   which is direct evidence. The old test was rewritten to assert the price it
   was really protecting (741) rather than deleted.
2. **`SP01` keeps the sheet's spelling, "Sponge Spicule Bio-Microneedline".**
   Apparently a typo for "Microneedling", but product names are the owner's
   copy and are not silently rewritten. Its price is quoted per pair, so
   `spec` is set to `1 pair` — the "399/pair" text would otherwise be lost.
3. **`NBG60 mm` keeps its odd code**, trimmed of the trailing space in the cell.
4. **`category` is not resynced on existing rows.** It is a hand-corrected
   grouping the spreadsheet has no column for; only newly inserted rows get the
   SKU-prefix guess.
5. **Stock remains metadata.** `OrderCalculator.jsx` still does not read the
   `stock` field, so the 26 stock changes are not user-visible yet.
6. **Applying 0005 reverts admin-page price edits made since 8/25.** That is
   the intent of a sync, but it is why the migration is a dated one-shot rather
   than something to re-run casually.
7. **The migration has not been applied.** It needs `supabase db push`, or
   pasting into the SQL editor. Until then the live table still serves August 4
   prices. Verification queries are at the foot of the migration file.

## Merge evidence

Four checkpoint commits on `feat/supabase-pricelist`:

| Commit | Stage | Evidence |
|---|---|---|
| `86e562f` | RED | `products.test.js`: 34 failed \| 40 passed (74) |
| `87ab287` | GREEN | `products.test.js`: 74 passed; `npm test`: 389 passed |
| `4b5f3c8` | RED | `priceListSync.test.js`: 6 failed \| 1 passed (7) |
| `a7e9bbc` | GREEN | `priceListSync.test.js`: 7 passed; suite 396 passed, 92.55% |
| `a37ba46` | RED→GREEN | specs: 3 failed → 77 passed; sync 1 failed → 8 passed; suite 400 passed, 92.55% |

No refactor commit: the generated catalogue and migration are data, and the
extraction logic lives in the throwaway sync script rather than in `src/`.
