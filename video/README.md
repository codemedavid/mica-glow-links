# VR Jonina — customer social-proof reel

Renders one vertical short-form video (1080×1920, 30fps, ~33s) from the
screenshots in `../customer reviews/`.

```bash
cd video
npm install
npm run build        # prepare-assets + render
```

Output: `video/out/vrjonina-social-proof.mp4`

## What the two steps do

| Step | Command | What it does |
| --- | --- | --- |
| Prepare | `npm run prepare-assets` | Decodes HEIC via macOS `sips`, mosaics the regions marked in `src/reviews.js`, crops to the readable part of each message, caps the long edge at 1400px, and writes `assets/*.jpg`. |
| Render | `npm run render` | Paints every frame with `@napi-rs/canvas` and streams raw RGBA into the bundled `ffmpeg` (H.264, yuv420p, CRF 20). No frame ever touches disk. |

**Always eyeball `video/assets/*.jpg` after preparing.** Those are exactly the
pixels that go on screen, so that folder is the last checkpoint before anything
private is published.

## Adding music

Drop an MP3 at `video/assets/music.mp3` and re-run `npm run render`. The audio
is muxed with `-shortest`, so a longer track is trimmed to the video. Without
that file the reel renders silent — no placeholder track is bundled, because
none of the obvious sources are licensed for a commercial post.

## Editing the cut

- **Which reviews, what is quoted, what is hidden** → `src/reviews.js`
- **Scene order and durations** → `STORYBOARD` in `src/timeline.js`
- **Look and layout** → `src/draw.mjs` (primitives) and `src/scenes.mjs` (scenes)

`src/timeline.js` and `src/reviews.js` are covered by tests that fail the build
on the things that are easy to get wrong under time pressure:

```bash
npm test                                        # repo root: runs app + video
npx vitest run --config video/vitest.config.js  # video only, Node environment
```

The guarantees worth knowing about:

- Every `quote` must be a literal substring of that screenshot's `transcript`,
  so no testimonial can be sharpened into something the customer never wrote.
- Every overlay `caption` must come from `APPROVED_CAPTIONS`.
- Every screenshot flagged `hasPrivateDetails` must carry at least one
  redaction box, and every box and crop must stay inside the frame.
- Total runtime stays in 20–40s, each review holds ≥1.6s, and the CTA holds the
  store URL for ≥3.5s.

## Curation note

The montage leads with delivery and service proof — parcels received, repeat
orders, admin responsiveness, raffle prizes — rather than weight-loss
before/after photos. Those are the majority of the source folder, but Meta bans
before/after imagery and weight-loss claims in ads and TikTok restricts
weight-management content, so a reel built on them risks a takedown rather than
a rejection. See `docs/testing/vrjonina-social-proof-reel.tdd.md` for the full
list of what was left out.
