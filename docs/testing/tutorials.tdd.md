# TDD Evidence — Tutorials

**Date:** 2026-08-08
**Branch:** `main`

## Source plan

No `*.plan.md` artifact was written. The plan was produced inline by `/ecc:plan` in this
session, from the Claude Design project `b8690fa8-5422-4b5c-8eb1-21dbb90d4dcd`, file
`Tutorials.dc.html`, read through the DesignSync MCP.

As with the calculator port, the design's logic lives in its `<script type="text/x-dc">`
block and `support.js` is the Design Canvas runtime shim (`DCLogic`, `<sc-for>`, `<sc-if>`,
`{{ }}` bindings) — not portable, React replaces it. `assets/mamamica-logo.png` is the brand
mark already at `public/logo.png`; the tutorials page does not re-render the avatar, so it
is not referenced here.

### Scope decisions

- **`Video Tutorials.dc.html` is deliberately out of scope.** It is a drag-and-drop upload
  surface whose published videos live only in `URL.createObjectURL` blobs for the current
  browser session. Shipping it would need real blob storage plus an authenticated admin
  route, and the owner confirmed: *"Video Tutorials.dc.html no need to do this since we dont
  have an admin page"*.
- **No video is published yet.** The design's cards are placeholders with no URLs. Rather
  than ship `href="#"` dead links, every tutorial carries `href: null` and renders an
  explicit "Coming soon" state. Publishing later is a one-line data change per tutorial.

## User journeys

1. As a community member who has just received a vial, I want to browse short walkthroughs,
   so that I can watch the technique before I try it myself.
2. As someone stuck on one specific step, I want to narrow the library to that step, so that
   I am not scrolling past videos that do not apply to me.
3. As someone who has finished watching, I want to be sent on to the calculator, so that I
   can turn the technique into an actual number of units.
4. As a visitor, I want to know when a video is not available yet, so that I do not click
   into a broken page.
5. As a community member unsure how to mix or inject, I want to reach the tutorials from the
   links page, so that I can find them without asking an admin.

## Task report

### Task 1 — tutorial library (`src/data/tutorials.js`)

Wrote `tutorials.test.js` first: unique ids, non-empty titles and descriptions, every
category known, no category filter left empty, `m:ss` runtimes, exactly one featured entry,
`href` null-or-string (never `undefined`), https-only links, and the seven titles ported
from the design.

- RED: `npx vitest run src/data/tutorials.test.js`
  → test file failed to collect; the `./tutorials` import did not resolve. Compile-time RED,
  the intended signal that the module did not exist.
- GREEN: implemented `tutorials.js` with the seven design entries, all `href: null`.
  → all tests pass; coverage 100% / 100% / 100%.

The https-only and null-not-undefined assertions exist for the future: they are the guard
rail that catches a bad paste when the owner starts publishing real video URLs.

### Task 2 — tutorials page (`src/components/tutorials/Tutorials.jsx`)

Wrote `Tutorials.test.jsx` first, asserting behavior through accessible roles only: the `h1`,
the featured walkthrough as an `h2` plus its "Start here · 6:12" meta, six `h3` cards before
filtering, six "Coming soon" markers, no link for an unpublished tutorial, `All` selected on
load, filtering to `Dosing` leaving exactly the two dosing cards, `aria-checked` moving with
the selection, `All` restoring the full library, the featured card surviving a filter, the
back button invoking `onBack`, the CTA pointing at `#peptide`, and the prescriber notice.

- RED: `npx vitest run src/components/tutorials/Tutorials.test.jsx`
  → test file failed to collect; `./Tutorials` did not resolve.
- GREEN: implemented `Tutorials.jsx` + `tutorials.css`.
  → all tests pass; coverage 99.01% stmts / 92.85% branch / 100% funcs.

The single uncovered line is the empty-category fallback. It is unreachable with the current
data — `tutorials.test.js` asserts no category filter is ever empty — but it is kept so a
future data edit degrades into a message rather than a blank grid.

Accessibility notes: the filter chips reuse the calculator's `role="radio"` inside
`role="radiogroup"` pattern rather than plain buttons, so the selected category is announced.
Cards are `<article>` elements labelled by their heading. Play glyphs are `aria-hidden`
decoration. `prefers-reduced-motion` disables the chip/card transitions and the pulsing
"Next step" dot.

### Task 3 — wiring into the links page (`src/App.jsx`)

Extended `App.test.jsx` with the fifth journey: the link is visible on the links page, points
at `#tutorials`, opens the page when followed, and the links page stays the default view.

- RED: `npx vitest run src/App.test.jsx`
  → `Tests 3 failed | 8 passed (11)` — no such link, and `#tutorials` rendered the home view.
- GREEN: added `'#tutorials': 'tutorials'` to `VIEW_BY_HASH`, a `Video Tutorials` entry in
  the `LEARN & VERIFY` group directly after the Peptide Calculator, and a `view === 'tutorials'`
  render branch alongside the calculators.

Placement is deliberate: `LEARN & VERIFY` now reads calculator → tutorials → guides → COA,
and the tutorials page ends by handing the visitor back to the calculator.

## Verification

| Check | Command | Result |
|---|---|---|
| Full suite | `npx vitest run` | 143 passed (7 files) |
| Coverage | `npx vitest run --coverage` | `Tutorials.jsx` 99.01%, `tutorials.js` 100% — both over the 80% target |
| Lint | `npm run lint` | 0 errors; 1 pre-existing warning in generated `coverage/` output |
| Build | `npm run build` | ✓ built; CSS 10.42 kB gzip, JS 75.20 kB gzip — inside the landing-page budget |

## Amendment — 2026-08-08: real recording, hosting decision

Request: *"WhatsApp Video 2026-08-07 at 23.58.04.mp4 in the downloads today can you upload it
in the website this is the tutorial vid for How to reconsitite vials and how to use peptide
pens"*.

### Why the file is not self-hosted

The source is 56.2 MB, H.264/AAC, 832×464, **8:08 long**. Self-hosting it was attempted and
abandoned on evidence:

| Attempt | Result |
|---|---|
| `avconvert --preset Preset640x480` | **144 MB** — the preset re-encodes at a higher bitrate than the source |
| `avconvert --preset Preset960x540` | 56 MB — no reduction |
| `avconvert --preset PresetLowQuality` | 9.0 MB but downscaled to **192×108** — unreadable for syringe markings |
| `PresetAppleM4ViPod` / `PresetAppleM4VCellular` | Rejected: these presets only emit `.m4v` |

macOS's built-in encoder has no usable middle preset, and `ffmpeg` is not installed
(no Homebrew on this machine). Even with `ffmpeg`, watchable quality at this resolution is
~400 kbps ≈ 20–25 MB, which would live in git history permanently.

Free-tier bandwidth decided it: at 56 MB per view, Supabase Storage (~5 GB/mo) allows roughly
90 views per month. The owner chose **YouTube unlisted** — unlimited free bandwidth and
adaptive bitrate, which matters for a community that opens this on mobile data.

No video file was committed. `public/` is unchanged.

### Task 4 — merge the two cards into one recording

The recording covers both "How to reconstitute a vial" and "Loading and priming a peptide
pen", so those two entries were merged into one featured tutorial,
`Reconstituting vials & using peptide pens` (8:08). The library drops from 7 to 6; the
`Peptide pens` category is still populated by "Changing a pen cartridge", so the
no-empty-category guarantee still holds.

### Task 5 — YouTube embed support

`href` was replaced by `youtubeId`: a bare 11-character id, or `null` while unpublished.
A test rejects a pasted watch URL, which is the likely mistake when publishing.

- RED: `npx vitest run src/data/tutorials.test.js src/components/tutorials/Tutorials.test.jsx`
  → `11 failed` — missing `youtubeId`, 7-vs-6 length, unmerged featured entry, and no player.
- GREEN: implemented `youtubeId`, the merged entry, and `TutorialPlayer`.
  → `Test Files 7 passed | Tests 147 passed`.

`Tutorials` now takes an optional `items` prop (defaulting to the data module) so playback
can be tested against a published fixture while the real library is still unpublished.

**Spec correction made during RED:** the featured hero originally had no "Coming soon"
marker, which would have left it looking playable while empty. The expectation was changed
from 5 markers to 6 (five grid cards plus the hero) and the hero now carries one.

Embeds use `https://www.youtube-nocookie.com/embed/<id>` — the privacy-enhanced domain, which
sets no tracking cookies until playback starts — with `loading="lazy"`,
`referrerPolicy="strict-origin-when-cross-origin"`, and an iframe `title` for screen readers.
On a published card the category/length badges move from the media box into a caption,
because overlaying them on the iframe would block YouTube's own controls.

### Verification after the amendment

| Check | Command | Result |
|---|---|---|
| Full suite | `npx vitest run` | **147 passed** (7 files) |
| Coverage | `npx vitest run --coverage` | `Tutorials.jsx` 99.24% stmts / 96% branch / 100% funcs; `tutorials.js` 100% |
| Lint | `npm run lint` | 0 errors; 1 pre-existing warning in generated `coverage/` |
| Build | `npm run build` | ✓ CSS 10.44 kB gzip, JS 75.41 kB gzip |

### Blocked on

The tutorials page still shows "Coming soon" everywhere. Publishing needs the owner to upload
the recording to YouTube as unlisted and supply the watch URL; the 11-character id then goes
into the featured entry's `youtubeId`. That is the only remaining step.

## Follow-ups

- Publishing a video = set that tutorial's `href` to its `https://` URL. The card becomes a
  link; the "Coming soon" marker and its test expectation come off at the same time.
- Real thumbnails would replace the gradient placeholders. Keep the `16 / 9` aspect-ratio
  containers and add explicit `width`/`height` so the grid does not shift while they load.
