# TDD evidence — admin product management

Feature: the Prices tab of the admin page can manage the product catalogue the
order calculator quotes from — list, search, edit a price, switch stock, add a
product, remove a product.

Branch: `feat/supabase-pricelist`
Checkpoints: `cd74452` (RED), `7973fc1` (GREEN), plus the gap-closing commit
that follows this document.

## Source plan

No `*.plan.md` was supplied. The journeys below were derived during this TDD
run from the request — "add here the product management that is connected to
the order calculator" — and from the design's Prices tab in `Admin.dc.html`,
which the previous session had stubbed out with a "not built yet" panel.

## User journeys

1. As the shop owner, I want to see every product the order calculator quotes,
   so that I can audit the price list.
2. As the shop owner, I want to find one SKU among two hundred, so that editing
   is not a scroll hunt.
3. As the shop owner, I want to change a price and save it, so that the
   calculator charges the new amount without a redeploy.
4. As the shop owner, I want to switch a product in or out of stock, so that
   customers are not quoted something I cannot ship.
5. As the shop owner, I want to add a product from the "+ Add" sheet, so that a
   new SKU reaches the calculator.
6. As the shop owner, I want removal to take two taps, so that I cannot delete a
   product by brushing the screen.
7. As the shop owner, I want a refused write explained, so that a row-level
   security rejection never reads as success.

## Task report

### 1. Repository writes (`src/data/productsRepository.js`)

Added `normalizeProductInput`, `listProducts`, `saveProduct`, `setProductStock`,
`deleteProduct` and `sortProducts` beside the existing read path.

- Command: `npx vitest run src/data/productsRepository.test.js src/hooks/useAdminProducts.test.jsx src/components/admin/ProductsCard.test.jsx`
- RED: `Tests 35 failed | 33 passed (68)` — failures were
  `TypeError: (0 , saveProduct) is not a function`,
  `(0 , setProductStock) is not a function`,
  `(0 , deleteProduct) is not a function`, and
  `Failed to resolve import "./useAdminProducts"`. The 33 passing were the
  pre-existing read tests, which stayed green throughout.
- GREEN: `Test Files 3 passed (3) / Tests 102 passed (102)`.
- Guaranteed: the DB column names (`vial_price`, `stock`) stay behind this
  module; input that would violate a table constraint is rejected with a
  sentence before any network call; a blank code cannot issue an unfiltered
  delete; a refused or dropped write returns a reason instead of throwing.

`listProducts` is deliberately **not** `fetchProducts`. The customer read
degrades to the catalogue bundled into the build so a quote is always possible;
the owner read must not, or they would be editing rows that do not exist. The
two have opposite correct failure modes, so they are two functions.

### 2. List state (`src/hooks/useAdminProducts.js`)

- Command: as above.
- RED: `Failed to resolve import "./useAdminProducts"` (compile-time RED — the
  test newly referenced a module that did not exist).
- GREEN: 8 tests pass.
- Guaranteed: the list reflects the table, not the bundled catalogue; a saved
  product appears immediately, re-sorted by name then code; a refused write
  leaves the list untouched and returns why.

### 3. The card (`src/components/admin/ProductsCard.jsx`)

- Command: as above.
- RED: `Failed to resolve import "./ProductsCard"`.
- GREEN: 27 tests pass.
- Guaranteed: rows render at their current price and stock; search filters by
  name, code and spec; Save is offered only once something changed; a zero price
  is refused without calling the database; the stock select writes on change;
  removal needs a confirm tap; the "+ Add" sheet writes to the same table and
  closes only on success.

### 4. Wiring (`src/components/admin/Admin.jsx`)

- Command: `npx vitest run src/components/admin/Admin.test.jsx`
- RED: `Tests 3 failed | 13 passed (16)` — the page still rendered
  "The product list, stock switches and “+ Add” sheet from the design are not
  built yet", so `findByText('Tirzepatide')` timed out.
- GREEN: `Tests 16 passed (16)`.
- Guaranteed: the Prices tab shows the catalogue and the shipping fee together,
  offers "+ Add", and no longer claims the feature is unbuilt.

### 5. Gap closing after GREEN

Coverage showed the four `catch` blocks (a rejected request, not an error
response) and the list-truncation hint untested. Five tests were added; no
production code changed.

- Command: `npm run test:coverage`
- Result: `Tests 332 passed (332)`.

## Test specification

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|--------------------|------|------|--------|----------|
| 1 | A price saved in admin is the price the calculator reads back | `productsRepository.test.js:the admin page and the order calculator share one table > quotes the price the admin page just saved` | integration | PASS | `npx vitest run src/data/productsRepository.test.js` |
| 2 | A product added in admin is offered by the calculator | `…share one table > offers a product the admin page just added` | integration | PASS | same |
| 3 | A product removed in admin stops being offered | `…share one table > stops offering a product the admin page removed` | integration | PASS | same |
| 4 | A stock switch in admin shows in the calculator | `…share one table > shows the stock state the admin page switched` | integration | PASS | same |
| 5 | The `vial` field maps to the `vial_price` column on write | `normalizeProductInput > maps the app-facing vial field back to the vial_price column` | unit | PASS | same |
| 6 | A price of zero or below is refused before any network call | `normalizeProductInput > explains a %s price…` (4 cases) | unit | PASS | same |
| 7 | A missing code or name is refused with a readable reason | `normalizeProductInput > explains a missing code / missing name` | unit | PASS | same |
| 8 | An empty table reads as empty for the owner, not as the bundled list | `listProducts > reports an empty table as empty…` | unit | PASS | same |
| 9 | A stock state outside the table's check constraint is refused | `setProductStock > refuses a state the database check constraint would reject` | unit | PASS | same |
| 10 | A blank code cannot issue an unfiltered delete | `deleteProduct > refuses a blank code rather than issuing an unfiltered delete` | unit | PASS | same |
| 11 | An RLS rejection is reported, never reported as success | `saveProduct / setProductStock / deleteProduct > surfaces a row-level-security rejection` | unit | PASS | same |
| 12 | A dropped connection is reported, not thrown | `admin writes when the network itself fails` (4 tests) | unit | PASS | same |
| 13 | The list shows the table and updates in place after a write | `useAdminProducts.test.jsx` (8 tests) | unit | PASS | `npx vitest run src/hooks/useAdminProducts.test.jsx` |
| 14 | The catalogue is listed, searchable by name and by code | `ProductsCard — showing the price list / finding a product` | component | PASS | `npx vitest run src/components/admin/ProductsCard.test.jsx` |
| 15 | Save is offered only when the price actually changed | `ProductsCard — changing a price > offers no save until something actually changed` | component | PASS | same |
| 16 | A zero price is refused in the UI without a database call | `ProductsCard — changing a price > refuses a zero price without calling the database` | component | PASS | same |
| 17 | Picking a stock state writes it and keeps showing it | `ProductsCard — the stock switch` (3 tests) | component | PASS | same |
| 18 | Removal takes two taps and only then deletes | `ProductsCard — removing a product` (3 tests) | component | PASS | same |
| 19 | The "+ Add" sheet writes a new product and closes on success only | `ProductsCard — the "+ Add" sheet` (7 tests) | component | PASS | same |
| 20 | A long catalogue is capped visibly, never truncated silently | `ProductsCard > caps a long catalogue and says it has done so` | component | PASS | same |
| 21 | The Prices tab shows the catalogue beside the shipping fee | `Admin — the Prices tab` (4 tests) | component | PASS | `npx vitest run src/components/admin/Admin.test.jsx` |

## Coverage

Command: `npm run test:coverage`

```
Tests  332 passed (332)

File                | % Stmts | % Branch | % Funcs | % Lines
All files           |   92.62 |    90.65 |   75.55 |   92.62
 ProductsCard.jsx   |     100 |    95.23 |      90 |     100
 productsRepository |     100 |    89.88 |     100 |     100
 useAdminProducts   |     100 |    95.45 |     100 |     100
 Admin.jsx          |   94.71 |    85.71 |      90 |   94.71
```

Above the 80% floor on every new file.

### Known gaps

- No end-to-end test runs against a real Supabase project. The row-level
  security policy `products_owner_write` is asserted only through a fake client
  that mimics a refusal. The manual verification steps at the foot of
  `supabase/migrations/0001_admin_settings.sql` remain the check that the policy
  is actually enforced in the deployed project.
- No visual regression coverage for the new card or the "+ Add" sheet.
- `Admin.jsx` lines 277-286 and 290-292 (the non-Prices tabs' pending copy) stay
  uncovered; those tabs are still unbuilt by design.
- The catalogue is capped at 40 visible rows with an on-screen notice; there is
  no pagination.
- Editing a product's name or spec is only possible through the "+ Add" sheet
  re-entering the same code (an upsert). There is no inline name editor.

## Merge evidence

If these commits are squashed, the summary to preserve is:

- **RED** — `npx vitest run src/data/productsRepository.test.js src/hooks/useAdminProducts.test.jsx src/components/admin/ProductsCard.test.jsx` → `35 failed | 33 passed`, failing because the write functions and the two new modules did not exist. `npx vitest run src/components/admin/Admin.test.jsx` → `3 failed | 13 passed`, failing on the "not built yet" panel.
- **GREEN** — the same commands after implementation → `102 passed` and `16 passed`; full suite `npx vitest run` → `327 passed (14 files)`.
- **Gap closing** — five tests added for the network-rejection paths and the
  truncation hint; `npm run test:coverage` → `332 passed`, 92.62% statements
  overall, 100% on every new module.
