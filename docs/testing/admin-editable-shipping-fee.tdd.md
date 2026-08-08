# TDD Evidence — Admin foundation & editable shipping fee

**Date:** 2026-08-08
**Branch:** `feat/supabase-pricelist`

## Source plan

No `*.plan.md` artifact was written. The plan was produced inline by `/ecc:plan` in this
session from the Claude Design project `b8690fa8-5422-4b5c-8eb1-21dbb90d4dcd`, file
`Admin.dc.html`, read through the DesignSync MCP. The owner then asked to add "the shipping
in the order calculator to be edited" to that plan.

As with the tutorials and calculator ports, the design's logic lives in its
`<script type="text/x-dc">` block and `support.js` is the Design Canvas runtime shim
(`DCLogic`, `<sc-for>`, `<sc-if>`, `{{ }}` bindings) — not portable, React replaces it.

This report covers **Phases 0–2 groundwork only**: the data and auth layer beneath the admin
page. The admin UI itself (login screen, tab shell, Prices tab) is not yet implemented and is
tracked as remaining work below.

### Scope decisions

- **Owner chose Supabase-backed real writes** over an in-memory port, and a single fixed
  login rather than per-user accounts.
- **Credentials are not hardcoded in the bundle.** The owner asked for "hardcoded gmail and
  password". That was implemented as one pre-created Supabase Auth account instead, because
  the publishable key already ships in the public bundle: a literally-hardcoded gate would
  require row-level security to permit anonymous writes, leaving the price list rewritable by
  anyone with `curl`. The typed experience is identical — one email, one password, no signup.
  The concern was raised with the owner before implementing.
- **The design's demo catalogue was rejected** in favour of the real ~100-product catalogue
  rendered in the design's layout, at the owner's direction.

## User journeys

1. As the shop owner, I want to stay signed in to the admin page across reloads, so that
   editing prices does not mean logging in every time.
2. As the shop owner, I want to change the shipping fee from the admin page, so that I do not
   need a developer and a redeploy when courier rates move.
3. As the shop owner, I want to set shipping to PHP 0 during a promo, so that free shipping
   shows as genuinely free rather than falling back to the default.
4. As a customer, I want the calculator to still total correctly if the settings fetch fails,
   so that I never see a blank or wrong shipping row.

## Task report

### Task 1 — a session-persisting admin Supabase client

The public client is deliberately session-less (`persistSession: false`) because the
catalogue is public read-only data. An admin client needs the opposite. The client cache at
`src/lib/supabase.js:85` was keyed on `url::key` alone, so whichever client was built first
would be handed back to the second caller, silently discarding its auth configuration.

- RED: `npx vitest run src/lib/supabase.test.js`
  → `Tests 6 failed | 17 passed (23)`

  ```
  TypeError: (0 , createAdminSupabaseClient) is not a function
  ```

  Runtime RED for the intended reason: the export did not exist.

- Fix: `src/lib/supabase.js` — extracted the shared build path into `getClient(mode, env)`,
  added `mode` to the cache key, and added `createAdminSupabaseClient` using
  `persistSession: true`, `autoRefreshToken: true` under its own `storageKey` so two GoTrue
  instances never share state in one tab.

- GREEN: `npx vitest run` → `Test Files 11 passed | Tests 214 passed`

- Refactor: folded into the fix — the `getClient` extraction removed the duplication that
  adding a second client would otherwise have introduced.

**Not directly asserted:** that `persistSession: true` actually writes a session to
`localStorage`. That would need a live auth server. The tests pin the distinctness and
memoization that the configuration depends on, which is where the real bug was.

### Task 2 — a settings repository owning the shipping fee

- RED: `npx vitest run src/data/settingsRepository.test.js`
  → `Tests no tests` / transform failure

  ```
  Error: Failed to resolve import "./settingsRepository" from
  "src/data/settingsRepository.test.js". Does the file exist?
  ```

  Compile-time RED for the intended reason: the module under test did not exist.

- Fix: added `src/data/settingsRepository.js` over a new `site_settings` key/value table
  (`key text primary key`, `value jsonb`), so later settings need no further migration.

- GREEN: `npx vitest run` → `Test Files 11 passed | Tests 239 passed`

**The distinction this task exists to protect:** `normalizeProductRow` rejects a price of
`0` as unusable. Copying that rule here would be a bug — a shipping fee of `0` is a
deliberate free-shipping promotion, while a *missing* row is not. `normalizeShippingFee`
therefore accepts `0`, rejects negative/non-finite/non-numeric, and returns `null` only for
genuinely absent data. `fetchShippingFee` checks `amount === null` rather than falsiness for
the same reason.

### Task 3 — serving the calculator's fee from Supabase

- RED: `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx`
  → `Tests 2 failed | 11 passed (13)`

  ```
  FAIL  charges the shipping fee the owner has configured, not a hardcoded one
  TestingLibraryElementError: Unable to find an element with the text: PHP 180.00
  FAIL  shows free shipping as PHP 0.00 during a promo, not as the default fee
  TestingLibraryElementError: Unable to find an element with the text: PHP 0.00
  ```

  Runtime RED for the intended reason: the component ignored the new prop and still rendered
  the hardcoded `PHP 250.00`.

- Fix: added `src/hooks/useShippingFee.js` (stale-while-revalidate, mirroring `useProducts`);
  `OrderCalculator.jsx:5` lost its private `SHIPPING_FEE` constant, and the fee now resolves
  as `shippingFee ?? configuredShippingFee` — `??` and not `||`, so a configured `0` is not
  mistaken for unset.

- One test correction during GREEN: the free-shipping case originally asserted
  `getByText('PHP 2,606.50')`, which is ambiguous — when shipping is free the grand total
  equals the line total, so the figure legitimately renders twice. The assertion was scoped
  to the estimated-total row. This was a fault in the test, not the implementation.

- GREEN: `npx vitest run` → `Test Files 11 passed | Tests 242 passed`

- Refactor: none required.

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | The admin client is distinct from the public one, so neither overwrites the other's auth config | `src/lib/supabase.test.js:is a distinct client from the public one` | unit | PASS | `npx vitest run src/lib/supabase.test.js` |
| 2 | Each client is memoized per config rather than rebuilt per call | `src/lib/supabase.test.js:reuses one admin client per config` | unit | PASS | same |
| 3 | A broken or absent config yields `null` rather than throwing | `src/lib/supabase.test.js:returns null rather than throwing` | unit | PASS | same |
| 4 | A stored fee of `0` survives as free shipping and is not treated as missing | `src/data/settingsRepository.test.js:accepts zero, because free shipping is a real promotion` | unit | PASS | `npx vitest run src/data/settingsRepository.test.js` |
| 5 | Negative, infinite, and non-numeric fees are rejected rather than coerced | `src/data/settingsRepository.test.js:rejects a negative fee` (+3 sibling cases) | unit | PASS | same |
| 6 | A Supabase error, missing row, or corrupt value degrades to PHP 250 without throwing | `src/data/settingsRepository.test.js:fetchShippingFee — degrading without blanking the calculator` (8 cases) | unit | PASS | same |
| 7 | Writes validate before touching the database, and refuse when nobody is signed in | `src/data/settingsRepository.test.js:refuses a negative fee without touching the database` (+2) | unit | PASS | same |
| 8 | A row-level-security rejection surfaces as a readable failure rather than a silent no-op | `src/data/settingsRepository.test.js:surfaces a row-level-security rejection` | unit | PASS | same |
| 9 | The calculator charges the owner's configured fee, not a hardcoded one | `src/components/order-calculator/OrderCalculator.test.jsx:charges the shipping fee the owner has configured` | unit | PASS | `npx vitest run src/components/order-calculator/OrderCalculator.test.jsx` |
| 10 | A free-shipping promo renders `PHP 0.00` and a grand total equal to the subtotal | `…:shows free shipping as PHP 0.00 during a promo` | unit | PASS | same |
| 11 | An empty cart still ships free whatever the configured fee | `…:still charges no shipping on an empty cart` | unit | PASS | same |
| 12 | No regression across the catalogue, calculators, tutorials, and links page | full suite | unit | PASS | `npx vitest run` — 242 passed (11 files) |

## Coverage and known gaps

`npx vitest run --coverage`

```
File               | % Stmts | % Branch | % Funcs | % Lines
All files          |   90.55 |    92.56 |   67.41 |   90.55
 src               |   65.89 |    75.86 |    7.40 |   65.89
 src/data          |   99.53 |    86.95 |     100 |   99.53
 src/hooks         |     100 |      100 |     100 |     100
 src/lib           |     100 |      100 |     100 |     100
```

Overall statements 90.55% — above the 80% threshold. `App.jsx` remains the low outlier at
65.89%; that gap predates this work and was not addressed here.

Known gaps intentionally left:

- `persistSession` behaviour is not asserted end-to-end (see Task 1) — it needs a live auth
  server.
- No E2E or visual check was run; no UI was added in this batch.
- **Pre-existing lint failures**, untouched by this work and last modified in `a7b8359`:
  `src/data/productsRepository.test.js:76` (`'spec' is assigned a value but never used`) and
  `:117` (`'stock' …`). `npx eslint src/` reports 2 errors. All files added here lint clean.

## Remaining work

Not yet implemented, tracked for the next session:

1. **Migration SQL** for `site_settings`, plus `products.category`, and RLS policies pinned to
   the owner's email. **Blocked on:** the gmail address. Signup must also be disabled in the
   Supabase dashboard, or any self-registered account would satisfy a `to authenticated`
   policy.
2. **`useShippingFee` needs its own test file** — it is currently covered only transitively
   through `OrderCalculator`.
3. **Admin UI**: `useAdminSession`, `AdminLogin`, the `Admin` shell (sticky header, 5-tab bar,
   bottom sheet, toast), `admin.css`, `PricesTab` with the shipping card, and the `#admin`
   route in `App.jsx`.
4. **Write methods on `productsRepository`** (`upsertProduct`, `deleteProduct`, `setStock`).

## Merge evidence

Checkpoint commits on `feat/supabase-pricelist`, oldest first:

| Commit | Stage | Evidence |
|---|---|---|
| `b369fe4` | RED | `test: add reproducer for a session-persisting admin Supabase client` — 6 failed \| 17 passed |
| `5f3d6c7` | GREEN | `feat: add a session-persisting admin Supabase client` — 214 passed |
| `1b539ef` | RED | `test: add reproducer for an admin-editable shipping fee` — unresolved import |
| `64accc3` | GREEN | `feat: add a settings repository owning the editable shipping fee` — 239 passed |
| `fd749da` | RED | `test: add reproducer for an owner-configurable shipping fee` — 2 failed \| 11 passed |
| `311ab36` | GREEN | `feat: serve the order calculator's shipping fee from Supabase` — 242 passed |

No refactor-only commits were created; both refactors were folded into their GREEN commits
and are described in the task report above.
