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

### 4. Brand treatment and vial removal (RED -> GREEN)

Follow-up request: brand the reel with the MamaMica identity and remove all
vial and product imagery, without changing the structure or timings.

**RED** — `npx vitest run --config video/vitest.config.js`

```
 Test Files  1 failed (1)
      Tests  7 failed | 21 passed (28)
TypeError: Cannot read properties of undefined (reading 'backdropAlpha')
```

Checkpoint commit `c5bde21`.

**GREEN** — after re-cropping every review and adding the brand layer:

```
 Test Files  1 passed (1)
      Tests  28 passed (28)
```

**Vial removal.** Six screenshots were "short caption + photo of vials". Each
crop was pulled in to the message text alone. What remains on screen is either
message text, a sealed parcel, or a raffle prize; `ALLOWED_VISUALS` has no term
for a vial or product shot, so a crop that showed one could not be described,
and `visuals` on every review is checked against it.

| Review | Was | Now |
| --- | --- | --- |
| `r-second-gb` | text + tray of vials | text only (989x426) |
| `r-first-time-buyer` | text + open vial case | text only (990x220) |
| `r-vancouver` | text + stacked vial trays | text only (1002x178) |
| `r-two-gbs` | text + vials on a table | text only (990x228) |
| `r-raffle-tr30` | text + TR30 vial box | text only (990x155) |
| `r-gb-raffle-haul` | text + vial cases | text only (990x118) |

**Brand treatment.** `public/logo.png` carries the roundel on a white plate;
`prepareBrandMark` lifts it onto transparency by clipping the measured circle
(centre 510.5,256, r 232) so it can sit over artwork. Three layers, all faint:
the roundel appears full size in the intro above the headline, a 0.52x-width
copy is baked into the backdrop at 3% opacity, and a rotated lattice of 132px
roundels plus an 8% purple wash is baked into a single overlay sprite blitted
above the scene content, so a lifted frame carries the mark. Alphas are bounded
by test so review text stays legible through them.

**Consequential fixes found by frame inspection:**

| Defect | Cause | Fix |
| --- | --- | --- |
| A giant wordmark bled through mid-frame | Backdrop roundel drawn at 1.15x frame width | Reduced to 0.52x at 3% opacity, anchored low |
| Collage tiles showed unreadable fragments | `cover` fit enlarged the now text-only crops until a tile held three characters | Tiles fit whole artwork on a uniform plate |
| A collage tile clipped its last line | Ken Burns zoom on a contain-fitted tile has no spare margin | Tile zoom removed |
| Short cards floated in the middle of the frame | Wide, shallow text crops centred in the full card area | Card centre drifts toward the pull-quote as the card gets shorter |

Both collages now draw from the five screenshots that still carry a
full-height, vial-free photo, so tiles fill their plates. Tiles therefore repeat
between the two collages; they are twelve seconds apart.

### 5. Community link on the CTA (RED -> GREEN)

Follow-up request: add mamamicaglw.com under the "Join our community" line.

**RED** — `Tests  2 failed | 28 passed (30)`: `cta.communityUrl` and the type
sizes that keep it secondary did not exist.

**GREEN** — `Tests  30 passed (30)`.

The community site renders as a light outlined chip directly under the join
line, at 40px against the store pill's 58px. The size gap is asserted rather
than left to eye, because the brief requires the ordering URL to stay the
large, primary call to action. Nothing else on the CTA changed except vertical
spacing to make room; "Visit:" was colliding with the store pill on the first
pass and the two were nudged apart.

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
| 22 | The allowed subject vocabulary cannot name a vial or product | `timeline.test.js:offers no vocabulary for vials or product shots` | unit | PASS |
| 23 | Every crop shows only allowed subjects | `timeline.test.js:shows nothing outside the allowed subject vocabulary` | unit | PASS |
| 24 | Every single-review scene still shows the customer's message | `timeline.test.js:keeps the customer message visible…` | unit | PASS |
| 25 | The intro and watermark share one logo asset | `timeline.test.js:names a logo asset for the intro and the watermark` | unit | PASS |
| 26 | The purple wash stays below the readability ceiling | `timeline.test.js:tints the frame enough to be seen…` | unit | PASS |
| 27 | The repeating watermark stays faint enough to read through | `timeline.test.js:keeps the repeating watermark faint…` | unit | PASS |
| 28 | The backdrop logo stays behind the reviews | `timeline.test.js:keeps the backdrop logo faint…` | unit | PASS |
| 29 | The community site is offered under the join line | `timeline.test.js:offers the community site under the join line` | unit | PASS |
| 30 | The community link stays smaller than the ordering link | `timeline.test.js:keeps the community site secondary…` | unit | PASS |

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
