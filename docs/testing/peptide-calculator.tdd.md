# TDD Evidence — Peptide Calculator

**Date:** 2026-08-05
**Branch:** `main`

## Source plan

No `*.plan.md` artifact was written. The plan was produced inline by `/ecc:plan` in this
session, from the Claude Design project `Advanced Peptide Calculator`
(`b8690fa8-5422-4b5c-8eb1-21dbb90d4dcd`), file `Peptide Calculator.dc.html`, read through
the DesignSync MCP.

The design's logic lives in its `<script type="text/x-dc">` block. `support.js` is the
Design Canvas runtime shim (`DCLogic`, `<sc-for>`, `<sc-if>`, `{{ }}` bindings); it is not
portable and React replaces it. `assets/mamamica-logo.png` is the brand mark already at
`public/logo.png`, which is reused rather than duplicated.

## User journeys

1. As someone reconstituting a peptide vial, I want to enter my vial size, water volume and
   target dose, so that I know exactly how far to draw the plunger.
2. As someone with a vial that is not a preset size, I want to type my own numbers, so that
   the tool still works for my product.
3. As someone whose protocol is written in mg rather than mcg, I want to switch units, so
   that I can enter the dose the way my protocol states it.
4. As someone about to inject, I want to be warned when my dose will not fit in my syringe,
   so that I do not under-dose by accident.
5. As a community member who has just received a vial, I want to reach the calculator from
   the links page, so that I can work out my dose before mixing anything.

## Task report

### Task 1 — dosing math (`dosing.js`)

Wrote `dosing.test.js` first, covering concentration, draw volume, U-100 units, fill ratio,
doses per vial, mg/mcg conversion, overfill, divide-by-zero guards, and string formatting.

- RED: `npx vitest run src/components/peptide-calculator/dosing.test.js`
  → `Test Files 1 failed (1) | Tests no tests` — compile-time RED, the `./dosing` import did
  not resolve. This is the intended signal: the module did not exist.
- Implemented `dosing.js`, re-ran the same target:
  → `Tests 1 failed | 31 passed (32)`. The failure was a **wrong test expectation**, not a
  code defect: doses-per-vial depends only on vial mg and dose size, so it stays knowable
  when the water field is blank, and the source design behaves the same way. The spec was
  corrected into two explicit tests (blank water still counts doses; blank vial shows a dash).
- GREEN: same command → `Test Files 1 passed (1) | Tests 34 passed (34)`.

Guaranteed: the arithmetic matches the design exactly, including its `Number(n.toFixed(d))`
formatting (so `5` prints as `5`, not `5.0`) and its tick-label rounding.

### Task 2 — page component (`PeptideCalculator.jsx` + `peptide-calculator.css`)

Wrote `PeptideCalculator.test.jsx` first (20 behaviour tests across the four journeys).

- RED: `npx vitest run src/components/peptide-calculator/PeptideCalculator.test.jsx`
  → `Test Files 1 failed (1) | Tests no tests` — the `./PeptideCalculator` import did not
  resolve.
- GREEN after implementing the component and stylesheet:
  `npx vitest run src/components/peptide-calculator/`
  → `Test Files 2 passed (2) | Tests 53 passed (53)`.

The design ships inline styles and no accessibility semantics. The port moves styling into
tokenised CSS on `.pc` and adds: `role="radiogroup"`/`role="radio"` with `aria-checked` for
the chip groups, `aria-pressed` on the mcg/mg toggle, labelled custom inputs, an
`aria-live="polite"` result region, `role="alert"` on the overfill banner, `aria-hidden` on
the decorative syringe, a visible focus ring, and 44px minimum touch targets.

### Task 3 — links-page button and route (`App.jsx`)

- RED: `npx vitest run src/App.test.jsx` →
  `× Peptide Calculator link > is offered on the links page` —
  `Unable to find an accessible element with the role "link" and name /peptide calculator/i`
  and `× ... opens the calculator when the link is followed` —
  `Unable to find an accessible element with the role "heading" and name "Peptide Calculator"`.
  `Tests 2 failed | 5 passed (7)`.
- Implemented: new link in the **LEARN & VERIFY** group (`href: '#peptide'`, `kind: 'route'`),
  a `VIEW_BY_HASH` lookup replacing the nested hash ternary, and a `view === 'peptide'` branch.
- GREEN: `Tests 7 passed (7)`.

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | 10 mg in 2 ml gives 5 mg/ml, and a 250 mcg dose is 0.05 ml / 5 units | `dosing.test.js:calculateDose` | unit | PASS | `npx vitest run src/components/peptide-calculator/dosing.test.js` |
| 2 | A 10 mg vial yields 40 whole 250 mcg doses; partial doses are discarded | `dosing.test.js:counts whole doses available in the vial` | unit | PASS | same |
| 3 | A dose entered in mg is read as the equivalent micrograms | `dosing.test.js:reads a dose entered in mg` | unit | PASS | same |
| 4 | A dose larger than the barrel is flagged; one that exactly fills it is not | `dosing.test.js:flags a dose that will not fit` / `does not flag a dose that exactly fills` | unit | PASS | same |
| 5 | Blank or non-numeric custom input yields zeroes, never `NaN` or a divide-by-zero | `dosing.test.js:treats empty custom-input text as zero` | unit | PASS | same |
| 6 | mcg↔mg conversion round-trips without drift | `dosing.test.js:survives a round trip without drifting` | unit | PASS | same |
| 7 | Barrel gradations rescale to the chosen syringe (0.5 ml → 13/25/38/50) | `dosing.test.js:buildTicks` | unit | PASS | same |
| 8 | The page opens on the design's default setup and reads 5 units | `PeptideCalculator.test.jsx:opens on the standard 10 mg / 2 ml / 250 mcg setup` | component | PASS | `npx vitest run src/components/peptide-calculator/` |
| 9 | Changing water recomputes the draw and the concentration tile | `PeptideCalculator.test.jsx:recalculates when more water is added` | component | PASS | same |
| 10 | Choosing a different syringe restates its unit markings | `PeptideCalculator.test.jsx:restates the barrel markings` | component | PASS | same |
| 11 | The custom field stays hidden until "Other" is chosen, then drives the result | `PeptideCalculator.test.jsx:hides the custom vial field` / `calculates from a hand-typed vial size` | component | PASS | same |
| 12 | An emptied field prompts rather than showing zeroes | `PeptideCalculator.test.jsx:prompts instead of showing zeroes` | component | PASS | same |
| 13 | Switching to mg carries the dose across (250 mcg → 0.25 mg, draw unchanged) | `PeptideCalculator.test.jsx:carries the current dose across a switch` | component | PASS | same |
| 14 | Re-tapping the unit already in use does not convert the value again | `PeptideCalculator.test.jsx:leaves the dose untouched` | component | PASS | same |
| 15 | An overfilling dose raises an alert naming the volume and the fix | `PeptideCalculator.test.jsx:warns and explains the fix` | component | PASS | same |
| 16 | Reset restores the starting setup | `PeptideCalculator.test.jsx:restores the starting setup on reset` | component | PASS | same |
| 17 | The consultation CTA points at the doctor's booking page and cannot leak the opener | `PeptideCalculator.test.jsx:offers a consultation` | component | PASS | same |
| 18 | The prescriber disclaimer ships by default and can be suppressed | `PeptideCalculator.test.jsx:tells visitors this is a reference tool` / `can drop the disclaimer` | component | PASS | same |
| 19 | The links page offers the calculator, `#peptide` opens it, and home stays the default | `App.test.jsx:Peptide Calculator link` | integration | PASS | `npx vitest run src/App.test.jsx` |

## Coverage

`npx vitest run --coverage`

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
 ...ide-calculator |     100 |    98.76 |   92.59 |     100
  ...alculator.jsx |     100 |     100  |   90.47 |     100
  dosing.js        |     100 |    97.05 |     100 |     100
All files          |   86.57 |    91.66 |   54.68 |   86.57
```

`Test Files 5 passed (5) | Tests 108 passed (108)`

Also run: `npm run lint` → 0 errors (1 pre-existing warning in generated `coverage/`);
`npm run build` → `✓ built in 798ms`.

### Known gaps

- `dosing.js` line 66 — the `syringeMl > 0` false branch is unreachable from the UI, since
  syringe volume comes only from the three presets. Left untested deliberately.
- `App.jsx` remains at 65% statements. That is pre-existing: its modals, reviews grid and
  parallax effect have no tests. Not widened here.
- No automated visual-regression or axe assertions exist in this repo. Verification was
  manual (below).

## Manual verification

Chrome via devtools MCP against `npm run dev` (`http://localhost:5173/#peptide`):

- 390×900 and 1440×900 full-page screenshots — layout correct, no horizontal overflow, no
  console errors or warnings.
- Overfill state driven live (0.3 ml syringe, 5 ml water, 2.5 mg dose): readout `125` units,
  `--pc-fill` computed to `1`, barrel filled and plunger driven to the end, ticks rescaled to
  8/15/23/30, and the rose alert reading *"That dose needs 1.25 ml — more than your 0.3 ml
  syringe holds. Use less water or a larger syringe."*

Two fixes came out of that pass: the cards were inheriting the links page's centred text
(the design left-aligns them), and the final tick label was clipped by the barrel's
`overflow: hidden`.

### Deliberate deviations from the design

- The design animates `width` and `left`. The port animates `transform: scaleX()` and
  `translateX()` (via container-query units) instead, so motion stays on the compositor, and
  wraps all of it in a `prefers-reduced-motion` guard.
- The design's column is 680px wide. This app's global `.content` is capped at
  `--max-width: 400px` (`src/App.css:28`), which also constrains the existing Order
  Calculator. The calculator was kept consistent with that rather than widening the whole
  site. Consequence: the three stat tiles stack instead of sitting three-across.

## Merge evidence

Checkpoint commits were **not** created — the work sits uncommitted on `main` pending a
decision on whether to branch first. The RED/GREEN evidence above is the record; copy it
into the PR or commit body if these changes are squashed.
