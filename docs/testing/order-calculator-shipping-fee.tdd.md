# TDD Evidence — Order Calculator Shipping Fee

**Date:** 2026-08-08
**Branch:** `main`

## Source plan

No `*.plan.md` artifact was used. The journey below was derived during this TDD run from the
instruction: "change the shipping fee in the order calculator to 250".

## User journeys

1. As a customer, I want the order calculator's shipping fee to be PHP 250, so that the
   estimated total I see matches what the shop actually charges me.

## Task report

### Task 1 — shipping fee is PHP 250

`SHIPPING_FEE` lives in two places: the module-private constant in
`src/components/order-calculator/OrderCalculator.jsx:5` (read at line 83, where an empty cart
still pays zero shipping) and the fixture constant mirroring it in
`OrderCalculator.test.jsx:13`. The test fixture was changed to `250` first, so the two
existing shipping assertions became the reproducer.

- RED: `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx`
  → `Test Files 1 failed (1) | Tests 2 failed | 5 passed (7)`

  ```
  FAIL  breaks the total down into subtotal and shipping on request
  TestingLibraryElementError: Unable to find an element with the text: PHP 250.00.
    <span class="oc-summary-value">PHP 500.00</span>
  ```

  Runtime RED for the intended reason: the component still rendered the old 500 fee in both
  the summary breakdown and the grand total.

- Fix: `OrderCalculator.jsx:5` — `const SHIPPING_FEE = 500` → `const SHIPPING_FEE = 250`.

- GREEN: `npx vitest run`
  → `Test Files 5 passed (5) | Tests 108 passed (108)`

- Refactor: none. The change is a single named constant that was already extracted; no
  duplication or naming improvement was available.

**What the passing tests guarantee:** adding a product charges exactly PHP 250 shipping on
top of the line subtotal, the summary breakdown displays that fee as `PHP 250.00`, and the
grand total equals `subtotal + 250`.

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | A single added product totals its August price plus PHP 250 shipping | `src/components/order-calculator/OrderCalculator.test.jsx:totals a new product at its August price plus shipping` | unit | PASS | `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx` |
| 2 | The summary breakdown shows subtotal and a `PHP 250.00` shipping row | `src/components/order-calculator/OrderCalculator.test.jsx:breaks the total down into subtotal and shipping on request` | unit | PASS | `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx` |
| 3 | Catalogue search, quantity multiplication, and delisting behaviour are unaffected | `src/components/order-calculator/OrderCalculator.test.jsx` (5 remaining cases) | unit | PASS | `npx vitest run` |
| 4 | No regression elsewhere in the app | `src/App.test.jsx`, `src/data/products.test.js`, `src/components/peptide-calculator/*` | unit | PASS | `npx vitest run` — 108 passed |

## Coverage and known gaps

`npx vitest run --coverage`

```
All files                    |   86.57 |    92.40 |   56.25 |   86.57
 order-calculator/…jsx       |   96.05 |    91.83 |   81.81 |   96.05  (uncovered: 33-36,46,70-73)
 App.jsx                     |   65.02 |    75.00 |    7.69 |   65.02
```

Overall statements 86.57% — above the 80% threshold. `OrderCalculator.jsx` is at 96.05%.
`App.jsx` remains the low outlier at 65.02%; that gap predates this change and was not
addressed here.

Known gaps intentionally left:

- The zero-cart branch (`cart.length ? SHIPPING_FEE : 0`) has no dedicated assertion that an
  empty cart shows `PHP 0.00` shipping. Pre-existing gap, unchanged by this task.
- No E2E/visual check was run; the change is a numeric constant with no layout impact.

## Merge evidence

No checkpoint commits were created — the working tree already held unrelated in-progress
changes (`App.jsx`, `coverage/`, untracked `peptide-calculator/`), so committing was left to
the user. RED/GREEN summary for whoever commits this:

- RED: `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx` → 2 failed
  (expected `PHP 250.00`, rendered `PHP 500.00`)
- GREEN: `npx vitest run` → 108 passed after `SHIPPING_FEE` 500 → 250
- Refactor: none required
