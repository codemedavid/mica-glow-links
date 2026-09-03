# TDD evidence — VR Jonina customer social-proof reel

**Task:** produce one short-form (20–40s) vertical video for VR Jonina built from
the screenshots in `customer reviews/`, showing that real people are ordering,
receiving orders, and giving positive feedback.

**Source plan:** none. No `*.plan.md` was supplied; the journeys below were
written during this TDD run from the brief.

## User journeys

1. As someone scrolling a feed, I want the first three seconds to tell me this
   is other customers talking, so that I keep watching instead of skipping an ad.
2. As a viewer on a phone, I want each review large enough to actually read in
   the time it is on screen, so that the proof registers instead of blurring past.
3. As a viewer, I want to see enough separate people that the community reads as
   busy, so that I believe there is real volume behind it.
4. As a viewer who is convinced, I want the store URL on screen long enough to
   read and act on, so that I can actually go and order.
5. As a customer whose screenshot is being used, I want my name, handle, and
   order details hidden, so that being quoted does not expose me.
6. As the business owner, I want the edit to be unable to put words in a
   customer's mouth, so that the social proof stays honest.

## Task report

### 1. Timeline and curation module (RED → GREEN)

Wrote `video/src/timeline.test.js` first, covering all six journeys.

**RED** — `npx vitest run --config video/vitest.config.js`

```
FAIL  video/src/timeline.test.js [ video/src/timeline.test.js ]
Error: Cannot find module './reviews.js' imported from '.../video/src/timeline.test.js'
 Test Files  1 failed (1)
      Tests  no tests
```

Compile-time RED: the new test newly references the montage builder, and the
resolution failure is the intended signal. Checkpoint commit `e277d84`.

**GREEN** — after writing `video/src/reviews.js` and `video/src/timeline.js`:

```
 ✓ video/src/timeline.test.js (21 tests) 10ms
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

Checkpoint commit `daa5d95`.

**Guaranteed by the passing tests:** the cut cannot silently drift out of the
20–40s window, lose its hook or CTA, flash a review too briefly to read, leave a
gap in the timeline, repeat a screenshot in the single-review montage, quote
words a customer did not write, invent an overlay caption, point at a screenshot
that is not in `customer reviews/`, or ship an unredacted screenshot that was
flagged as containing private details.

### 2. Asset preparation

`npm run prepare-assets` decodes HEIC through macOS `sips`, mosaics the flagged
regions, crops to the readable part of each message, and caps the long edge at
1400px.

```
r-second-gb.jpg               989x978   redactions=1
r-super-bilis.jpg            1014x1389  redactions=2
r-third-order.jpg             967x1381  redactions=1
r-first-time-buyer.jpg        923x1400  redactions=1
r-vancouver.jpg              1002x1390  redactions=1
r-trusted-five-times.jpg      979x645   redactions=1
r-third-transaction.jpg       964x394   redactions=0
r-two-gbs.jpg                 945x1400  redactions=1
r-raffle-scale.jpg            884x1400  redactions=1
r-raffle-tr30.jpg             945x1400  redactions=1
r-raffle-printer.jpg         1038x1383  redactions=1
r-thank-you-parcel.jpg       1038x1392  redactions=1
r-gb-raffle-haul.jpg          990x1360  redactions=1

Prepared 13 assets into video/assets/
```

Each prepared asset was inspected visually. Two crops clipped text at the frame
edge on first pass (`r-super-bilis`, `r-third-transaction`) and were widened
before re-preparing.

### 3. Render and visual verification

`npm run render` paints 981 frames and streams them into the bundled ffmpeg.

```
Rendering 981 frames (32.7s @ 1080x1920) silent
Wrote out/vrjonina-social-proof.mp4

Duration: 00:00:32.70, bitrate: 3074 kb/s
Stream #0:0: h264 (High), yuv420p, 1080x1920 [SAR 1:1 DAR 9:16], 30 fps
```

The first render pipes raw RGBA frames instead of JPEG. That wedged the
machine: each frame is 8.3MB, the queued buffers pushed the process into swap,
and with the disk at ~480MB free the writer entered an unrecoverable
uninterruptible wait (`ps` state `U`, both processes at 0% CPU, output frozen).
Switching the pipe back to MJPEG (~16KB/frame) removed the memory pressure and
the render completed in about two minutes. The pipe format is commented in
`src/render.mjs` so nobody re-introduces it.

Frames were then extracted at nine timestamps and inspected. Four defects were
found and fixed, and the fixes were confirmed in a second render:

| Defect | Cause | Fix |
| --- | --- | --- |
| Outer characters clipped off text-heavy cards | Ken Burns zoom of 1.055 pushed content past the card's zoom-1 clip | Zoom reduced to 1.028 |
| "Thankee" rendered as "I hankee" | The shared 8%-height username mosaic reaches into the first text line on a 1596px-tall screenshot | Dedicated 4.5% strip for that review |
| `r-third-transaction` lost its last line ("sainyo.") | Crop ended at 0.29 of the source height, flush against the text | Crop extended to 0.315 |
| Hook screenshot wall filled only the top half of the frame | 6 tiles in a 3x2 grid at 430px | 9 tiles in a 3x3 grid at 520px |

## Test specification

| # | What is guaranteed | Test | Type | Result |
| --- | --- | --- | --- | --- |
| 1 | Seconds convert to whole frames at the composition rate | `timeline.test.js:converts seconds to whole frames…` | unit | PASS |
| 2 | No scene is ever a fractional number of frames | `timeline.test.js:never returns a fractional frame count` | unit | PASS |
| 3 | Output is 1080×1920 vertical | `timeline.test.js:renders a 1080x1920 vertical frame…` | unit | PASS |
| 4 | Total runtime stays inside 20–40s | `timeline.test.js:runs between 20 and 40 seconds` | unit | PASS |
| 5 | The reel opens on the hook, within 2–3s | `timeline.test.js:opens on the hook scene…` | unit | PASS |
| 6 | The reel closes on the CTA | `timeline.test.js:closes on the call to action` | unit | PASS |
| 7 | The store URL holds for ≥3.5s | `timeline.test.js:keeps the store URL on screen…` | unit | PASS |
| 8 | The URL is exactly `https://vrjonina.pepweb.store` | `timeline.test.js:spells out the store URL exactly once…` | unit | PASS |
| 9 | Every review holds ≥1.6s so it can be read | `timeline.test.js:holds every review long enough…` | unit | PASS |
| 10 | Scenes tile the timeline with no gaps or overlaps | `timeline.test.js:lays scenes out back to back…` | unit | PASS |
| 11 | At least one 2–4 review collage builds momentum | `timeline.test.js:builds momentum with at least one…` | unit | PASS |
| 12 | No screenshot repeats in the single-review montage | `timeline.test.js:never shows the same review screenshot twice…` | unit | PASS |
| 13 | Every review resolves to a file in `customer reviews/` | `timeline.test.js:points every review at a screenshot…` | integration | PASS |
| 14 | Review ids are unique | `timeline.test.js:gives every review a unique id` | unit | PASS |
| 15 | Prepared asset names derive from the review id | `timeline.test.js:derives each prepared asset name…` | unit | PASS |
| 16 | Every quote is literally in that screenshot's transcript | `timeline.test.js:quotes only wording that appears…` | unit | PASS |
| 17 | Overlay captions come only from the approved list | `timeline.test.js:uses only pre-approved editorial captions…` | unit | PASS |
| 18 | Our own hook/CTA copy makes no customer claim | `timeline.test.js:keeps the hook and CTA copy free…` | unit | PASS |
| 19 | Flagged screenshots always carry a redaction | `timeline.test.js:covers flagged private details…` | unit | PASS |
| 20 | Redaction boxes stay inside the frame | `timeline.test.js:keeps every redaction box inside the frame` | unit | PASS |
| 21 | Crop windows stay inside the frame | `timeline.test.js:keeps every crop window inside the frame` | unit | PASS |

Command: `npx vitest run --config video/vitest.config.js`

## Coverage and known gaps

- `video/src/timeline.js` and `video/src/reviews.js` are fully exercised by the
  suite above; every exported symbol and every storyboard branch is executed.
- **Not unit tested:** `draw.mjs`, `scenes.mjs`, `render.mjs`, and
  `prepare-assets.mjs`. These are pixel painters and a process pipeline; their
  correct output is a picture, so they were verified by inspecting the prepared
  assets and extracted frames rather than by assertions. Per the project's own
  web testing rule, visual regression carries more signal than brittle markup
  assertions for highly visual work.
- **No automated visual regression baseline** is committed. Adding one would
  mean checking ~5MB of reference frames into a repository on a machine that is
  currently at 100% disk usage; it is the obvious next step once space allows.
- The app's own suite still passes with the video work in place, and picks the
  new tests up automatically:

  ```
  npm test
   Test Files  17 passed (17)
        Tests  428 passed (428)
  ```

  `video/vitest.config.js` exists so the suite can also be run on its own in a
  Node environment. Coverage is unaffected either way: the root config's
  `coverage.include` is `src/**/*.{js,jsx}`, so `video/` never enters the app's
  coverage numbers.

## Editorial decisions worth reviewing

**What was left out, deliberately.** Roughly 50 of the 63 screenshots are
weight-loss testimonials carrying kilogram figures and named compounds
(Tirzepatide, Retatrutide); most of those also embed before/after body photos,
though a handful are text only. Meta prohibits before/after imagery and
weight-loss claims, and
TikTok restricts weight-management content, so a reel built on them risks a
takedown or account strike rather than an ad rejection. The 13 selected
screenshots are delivery and service proof instead — which is what the brief
actually asked for ("real people ordering from us, receiving their orders").
Reinstating any of them is a one-line change in `STORYBOARD`.

**Attribution.** The selected testimonials thank "Mica" / "Mama Mics" and the
shared admin team, not VR Jonina by name. The reel is branded VR Jonina and
frames the proof as "our community", which is accurate for a verified reseller
inside that community, but it is worth a conscious sign-off before posting.

**Music.** No track is bundled. Nothing available here is licensed for
commercial use, so the render is silent by default; dropping an MP3 at
`video/assets/music.mp3` and re-running `npm run render` muxes it in.
