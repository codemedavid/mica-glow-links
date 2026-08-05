# TDD Evidence — August 4 price list sync

**Date:** 2026-08-05
**Source of truth:** `Mica Pricelist August 4.xlsx`, sheet `Updated Pricelist` (204 rows)
**Source plan:** none — journeys were derived during this TDD run from the spreadsheet and the existing catalogue.

## User journeys

1. As the shop owner, I want the catalogue to stay in sync with the latest price
   list, so that quotes I give customers match what they are actually charged.
2. As a customer, I want to search the August price list and add a newly
   released blend to my order, so that I can see what it will cost me before I
   message the shop.
3. As the shop owner, I want products removed from the price list to disappear
   from the calculator, so that I never quote something I cannot sell.

## Task report

### 1. Extract the spreadsheet

Parsed with `openpyxl`. Column mapping in `Updated Pricelist`:

| Col | Meaning | Used as |
|-----|---------|---------|
| A | Code | `code` (trimmed) |
| B | Name / lab reports / marketing copy | `name` (cleaned) |
| C | Dosage & packaging | `spec` (cleaned) |
| D | Price USD | not used |
| E | 10 vials or 1 box (PHP) | fallback price |
| F | **Per vial cost (PHP)** | `vial` — primary |
| G | `*NEW` / divisor markers | not used |
| H | Mica's on-hand (Luzon & Visayas) | `stock` fallback |
| I | Mindanao/GLIA on-hand | `stock` — primary |

`stock` mapping from column I: `OUT*` → `out`; `PLENTY`/`ONHAND` → `in`;
`LOW`/`COUPLE BOXES`/`N BOXES`/`N vials left` → `low`; `TO ORDER BASIS` and
blank → `unknown`. Falls back to column H when I is blank.

Name cleaning drops `Mica's Top Pick`/`HIGHLY RECOMMENDS`/`FAVORITE` badges and
Janoshik/Vanguard lab-report blocks, then takes the first remaining line.

### 2. RED

Wrote `src/data/products.test.js` and
`src/components/order-calculator/OrderCalculator.test.jsx` **before** touching
`src/data/products.js`.

```
$ npx vitest run src/data/products.test.js src/components/order-calculator/OrderCalculator.test.jsx
 Test Files  2 failed (2)
      Tests  32 failed | 10 passed (42)
```

Failures were the intended business reason — the April catalogue had none of the
August products, carried the stale `10AD` and `TMB-*` prices, and still listed
`322`, `BW10-India`, and `IGD`.

### 3. GREEN

Regenerated `src/data/products.js` (169 → 181 products).

```
$ npm test
 Test Files  3 passed (3)
      Tests  47 passed (47)
```

The pre-existing `src/App.test.jsx` suite stayed green — no regression.

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|--------------------|-----------|------|--------|
| 1 | Product codes are unique and trimmed | `src/data/products.test.js:catalogue integrity` | unit | PASS |
| 2 | Every product has a name and a positive, finite, 2-dp price | `src/data/products.test.js:catalogue integrity` | unit | PASS |
| 3 | `stock` is only `in`/`low`/`out`/`unknown`; `spec` is a non-empty string or `null` | `src/data/products.test.js:catalogue integrity` | unit | PASS |
| 4 | Names carry no lab-report boilerplate, no promo badges, no newlines, ≤90 chars | `src/data/products.test.js:catalogue integrity` | unit | PASS |
| 5 | All 14 newly listed products exist at their August per-vial price | `src/data/products.test.js:newly listed products` | unit | PASS |
| 6 | `10AD` and the three `TMB-*` prices are corrected | `src/data/products.test.js:corrections` | unit | PASS |
| 7 | `LB`/`LB50`, `5AM.`/`10AM.`/`50AM.`, `GTT`, `5AD` are no longer mislabelled | `src/data/products.test.js:corrections` | unit | PASS |
| 8 | `332` replaces the mistyped `322` | `src/data/products.test.js:corrections` | unit | PASS |
| 9 | `BW10-India` and `IGD` are gone | `src/data/products.test.js:delisted products` | unit | PASS |
| 10 | Catalogue holds all 181 priced rows | `src/data/products.test.js:catalogue size` | unit | PASS |
| 11 | A new blend is findable by name and by code, and shows its price | `OrderCalculator.test.jsx` | integration | PASS |
| 12 | Adding a new product totals price + PHP 500 shipping | `OrderCalculator.test.jsx` | integration | PASS |
| 13 | Line total scales with vial quantity | `OrderCalculator.test.jsx` | integration | PASS |
| 14 | Total breaks down into subtotal and shipping rows | `OrderCalculator.test.jsx` | integration | PASS |
| 15 | Searching a delisted product shows the empty state | `OrderCalculator.test.jsx` | integration | PASS |

Evidence command: `npm test`

## Coverage

```
$ npm run test:coverage
File               | % Stmts | % Branch | % Funcs | % Lines
All files          |   80.32 |    82.89 |   30.55 |   80.32
  App.jsx          |   63.77 |    66.66 |       8 |   63.77
  OrderCalculator  |   96.05 |    91.83 |   81.81 |   96.05
  products.js      |     100 |      100 |     100 |     100
```

Meets the 80% threshold. `products.js` and `OrderCalculator.jsx` — the surfaces
this change touches — are at 100% and 96%. `App.jsx` (the links page) is
pre-existing and out of scope for this task.

Also verified: `npx eslint` clean, `npm run build` succeeds (233.55 kB JS,
71.41 kB gzipped).

## Owner-confirmed corrections (2026-08-05)

Three spreadsheet ambiguities were raised with the shop owner and resolved.
Covered by `products.test.js:owner-confirmed corrections`.

1. **`NS10` is priced per ampoule.** Column F says `275`, but that is the price
   of a 5-ampoule pack (column G carries a `/5` marker). Confirmed by the owner:
   per-ampoule price is **55**. The misleading "Priced at ₱275.00/5 ampoules"
   text was dropped from `spec` in favour of `5 ampoules/pack`, so the spec no
   longer contradicts the price the calculator shows.
2. **`FR5` is not marked out of stock.** Column F literally reads
   `OUT OF STOCK`, so the price `741` is still derived from the box price
   (`7410 / 10 vials`). Per the owner, stock is **not** `out`; set to `unknown`
   rather than asserting an availability the sheet does not support.
3. **Niimbot printers stay excluded.** Confirmed. Rows 183–190 are a separate
   hardware group buy and three of the six variants carry no price at all. A
   regression test now fails if any Niimbot row is ever imported.

## Remaining judgement calls

Recorded because the spreadsheet is ambiguous, not because the tests are weak.

1. **`BA*RMAGREEN` names.** Rows 10–11 have no name cell and would otherwise be
   indistinguishable from `BA3PH`/`BA10PH` in search. Suffixed `(RMA Green)`,
   taken from the code itself.
2. **`MICABLEND70` name.** Stripped the trailing `(ETA: August 2026)` — that is
   availability, not a product name. Its stock is `unknown`.
3. **Stock data is metadata only.** `OrderCalculator.jsx` does not currently
   read the `stock` field, so these values are not user-visible yet.

## Merge evidence

No checkpoint commits were created: the working tree already carried unrelated
in-progress changes (`package.json`, `App.jsx`, `vite.config.js`, `coverage/`)
and the branch is `main`. RED/GREEN evidence is preserved in this report.
