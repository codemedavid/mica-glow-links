# TDD Evidence — Book a Consultation link

## Source plan

No `*.plan.md` was supplied. The user journey below was derived during this TDD run
from the request: add a button to book a GLP-1 consultation with Dr. Andrei Francis
Flandes at `https://nowserving.seriousmd.com/doctor/andrei-francis-flandes`.

## User journey

> As a community member considering GLP-1, I want to book a consultation with
> Dr. Andrei Francis Flandes straight from the links page, so that I can get
> medical guidance before ordering.

## Task report

### 1. Establish a test runner

The project had no test tooling (`package.json` had only `dev`, `build`, `lint`,
`preview`), so the RED gate could not be executed. Added Vitest + jsdom +
React Testing Library as devDependencies, a `test` block in `vite.config.js`,
`src/test/setup.js`, and the `test` / `test:watch` / `test:coverage` scripts.

### 2. RED — reproducer added and executed

Command: `npm test`

```
 Test Files  1 failed (1)
      Tests  4 failed (4)
```

Failure cause (all four): `Unable to find an accessible element with the role
"link" and name /book a consultation/i` — the intended missing-implementation
signal, not a setup or syntax error.

### 3. GREEN — minimal implementation

Added `CONSULTATION_URL` and a `CONSULT` link group as the first entry of
`linkGroups` in `src/App.jsx`, plus a `variant` field so a link can carry its own
modifier class.

Command: `npm test`

```
 ✓ src/App.test.jsx (4 tests) 459ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

### 4. Refactor — clinical accent styling

Added `.home-link-consult` to `src/components/home/home.css` (mint accent) so the
medical CTA is visually distinct from the violet commerce links. Tests stayed green;
`npx eslint src/App.jsx src/App.test.jsx` exited 0; `npm run build` succeeded
(`✓ 34 modules transformed`, `dist/assets/index-N1BwwC4g.js 228.76 kB │ gzip: 69.82 kB`).

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | A "Book a Consultation" link is visible on the home view | `src/App.test.jsx:is visible on the home view` | unit | PASS | `npm test` |
| 2 | The link points at Dr. Flandes' NowServing booking page | `src/App.test.jsx:points to the doctor booking page` | unit | PASS | `npm test` |
| 3 | The link opens in a new tab with `rel="noopener noreferrer"` (no `window.opener` leak) | `src/App.test.jsx:opens in a new tab without leaking the opener` | unit | PASS | `npm test` |
| 4 | The link names the doctor so visitors know who they are booking with | `src/App.test.jsx:names the doctor so visitors know who they are booking with` | unit | PASS | `npm test` |

## Coverage and known gaps

`npm run test:coverage`:

```
All files             |   55.64 |    68.96 |     7.4 |   55.64
  App.jsx             |   63.61 |    66.66 |       8 |   63.61
  OrderCalculator.jsx |    4.38 |      100 |       0 |    4.38
  products.js         |     100 |      100 |     100 |     100
```

Below the 80% project target. The shortfall is **pre-existing untested code**, not
the new feature: `OrderCalculator`, the reviews view, and the access-code / member-info
modals had no tests before this change. Backfilling them is out of scope for this
request and is left as a follow-up.

Not covered by automated tests:

- Visual regression / responsive screenshots of the new card (no Playwright in this repo).
- That the booking URL is live and correct for this doctor — verified only as a string
  matching what the user supplied.

## Merge evidence

No checkpoint commits were created: the working tree already had unrelated
uncommitted work (`M src/App.jsx`, untracked `src/components/`, `src/data/`) and no
commit was requested. If these changes are squashed later, the RED → GREEN → refactor
summary above is the record of what was verified and how.
