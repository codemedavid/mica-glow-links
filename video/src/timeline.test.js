import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ALLOWED_VISUALS, APPROVED_CAPTIONS, BRAND, CTA, HOOK, REVIEWS } from './reviews.js'
import { FPS, HEIGHT, WIDTH, buildTimeline, secondsToFrames } from './timeline.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE_DIR = path.join(REPO_ROOT, 'customer reviews')

const MIN_TOTAL_SECONDS = 20
const MAX_TOTAL_SECONDS = 40
const MIN_REVIEW_SECONDS = 1.6
const MIN_URL_SECONDS = 3.5

const normalize = (value) => value.replace(/\s+/g, ' ').trim().toLowerCase()

describe('secondsToFrames', () => {
  it('converts seconds to whole frames at the composition frame rate', () => {
    expect(secondsToFrames(2)).toBe(2 * FPS)
  })

  it('never returns a fractional frame count', () => {
    expect(Number.isInteger(secondsToFrames(2.37))).toBe(true)
  })
})

describe('composition format', () => {
  it('renders a 1080x1920 vertical frame for short-form feeds', () => {
    expect({ WIDTH, HEIGHT }).toEqual({ WIDTH: 1080, HEIGHT: 1920 })
  })
})

describe('buildTimeline', () => {
  const timeline = buildTimeline()

  it('runs between 20 and 40 seconds', () => {
    const seconds = timeline.durationInFrames / FPS

    expect(seconds).toBeGreaterThanOrEqual(MIN_TOTAL_SECONDS)
    expect(seconds).toBeLessThanOrEqual(MAX_TOTAL_SECONDS)
  })

  it('opens on the hook scene within the first 3 seconds', () => {
    const [first] = timeline.scenes

    expect(first.type).toBe('hook')
    expect(first.from).toBe(0)
    expect(first.durationInFrames / FPS).toBeGreaterThanOrEqual(2)
    expect(first.durationInFrames / FPS).toBeLessThanOrEqual(3)
  })

  it('closes on the call to action', () => {
    const last = timeline.scenes.at(-1)

    expect(last.type).toBe('cta')
  })

  it('keeps the store URL on screen for at least 3.5 seconds', () => {
    const cta = timeline.scenes.at(-1)

    expect(cta.urlVisibleFrames / FPS).toBeGreaterThanOrEqual(MIN_URL_SECONDS)
    expect(cta.urlVisibleFrames).toBeLessThanOrEqual(cta.durationInFrames)
  })

  it('spells out the store URL exactly once, without a trailing slash', () => {
    const cta = timeline.scenes.at(-1)

    expect(cta.url).toBe('https://vrjonina.pepweb.store')
  })

  it('offers the community site under the join line', () => {
    const cta = timeline.scenes.at(-1)

    expect(cta.communityUrl).toBe('mamamicaglw.com')
  })

  it('keeps the community site secondary to the ordering link', () => {
    const cta = timeline.scenes.at(-1)

    // The brief asks for the store URL to stay the large, primary call to
    // action, so the second link must never be given more room than it.
    expect(cta.communityUrlSize).toBeLessThan(cta.urlSize)
  })

  it('holds every review long enough to actually read it', () => {
    const reviewScenes = timeline.scenes.filter((scene) => scene.type === 'review')

    expect(reviewScenes.length).toBeGreaterThan(0)
    for (const scene of reviewScenes) {
      expect(scene.durationInFrames / FPS).toBeGreaterThanOrEqual(MIN_REVIEW_SECONDS)
    }
  })

  it('lays scenes out back to back with no gaps or overlaps', () => {
    let cursor = 0

    for (const scene of timeline.scenes) {
      expect(scene.from).toBe(cursor)
      expect(Number.isInteger(scene.durationInFrames)).toBe(true)
      expect(scene.durationInFrames).toBeGreaterThan(0)
      cursor += scene.durationInFrames
    }

    expect(cursor).toBe(timeline.durationInFrames)
  })

  it('builds momentum with at least one multi-review collage before the CTA', () => {
    const collages = timeline.scenes.filter((scene) => scene.type === 'collage')

    expect(collages.length).toBeGreaterThanOrEqual(1)
    for (const collage of collages) {
      expect(collage.reviews.length).toBeGreaterThanOrEqual(2)
      expect(collage.reviews.length).toBeLessThanOrEqual(4)
    }
  })

  it('never shows the same review screenshot twice in the single-review montage', () => {
    const ids = timeline.scenes
      .filter((scene) => scene.type === 'review')
      .map((scene) => scene.review.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('review sources', () => {
  it('points every review at a screenshot that exists in customer reviews/', () => {
    for (const review of REVIEWS) {
      expect(existsSync(path.join(SOURCE_DIR, review.source))).toBe(true)
    }
  })

  it('gives every review a unique id', () => {
    const ids = REVIEWS.map((review) => review.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('derives each prepared asset name from the review id', () => {
    for (const review of REVIEWS) {
      expect(review.asset).toBe(`${review.id}.jpg`)
    }
  })
})

describe('testimonial integrity', () => {
  it('quotes only wording that appears in the screenshot transcript', () => {
    for (const review of REVIEWS) {
      expect(normalize(review.transcript)).toContain(normalize(review.quote))
    }
  })

  it('uses only pre-approved editorial captions, never invented testimonials', () => {
    for (const review of REVIEWS) {
      expect(APPROVED_CAPTIONS).toContain(review.caption)
    }
  })

  it('keeps the hook and CTA copy free of customer claims', () => {
    const editorial = [HOOK.line, ...CTA.lines].join(' ')

    expect(editorial).not.toMatch(/\d+\s?kg/i)
    expect(editorial).not.toMatch(/lost|weight|before|after/i)
  })
})

describe('privacy redaction', () => {
  it('covers flagged private details on every screenshot that has them', () => {
    const flagged = REVIEWS.filter((review) => review.hasPrivateDetails)

    expect(flagged.length).toBeGreaterThan(0)
    for (const review of flagged) {
      expect(review.redactions.length).toBeGreaterThan(0)
    }
  })

  it('keeps every redaction box inside the frame', () => {
    for (const review of REVIEWS) {
      for (const box of review.redactions) {
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w).toBeLessThanOrEqual(1)
        expect(box.y + box.h).toBeLessThanOrEqual(1)
      }
    }
  })

  it('keeps every crop window inside the frame', () => {
    for (const review of REVIEWS) {
      const { x, y, w, h } = review.crop

      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(w).toBeGreaterThan(0)
      expect(h).toBeGreaterThan(0)
      expect(x + w).toBeLessThanOrEqual(1)
      expect(y + h).toBeLessThanOrEqual(1)
    }
  })
})

describe('product imagery', () => {
  it('offers no vocabulary for vials or product shots', () => {
    for (const visual of ALLOWED_VISUALS) {
      expect(visual).not.toMatch(/vial|product|peptide/i)
    }
  })

  it('shows nothing outside the allowed subject vocabulary', () => {
    for (const review of REVIEWS) {
      expect(review.visuals.length).toBeGreaterThan(0)
      for (const visual of review.visuals) {
        expect(ALLOWED_VISUALS).toContain(visual)
      }
    }
  })

  it('keeps the customer message visible in every single-review scene', () => {
    const timeline = buildTimeline()
    const reviewScenes = timeline.scenes.filter((scene) => scene.type === 'review')

    for (const scene of reviewScenes) {
      expect(scene.review.visuals).toContain('message-text')
    }
  })
})

describe('brand treatment', () => {
  it('names a logo asset for the intro and the watermark', () => {
    expect(BRAND.logo).toBe('brand-mark.png')
  })

  it('tints the frame enough to be seen but not enough to fight the text', () => {
    expect(BRAND.tintAlpha).toBeGreaterThan(0)
    expect(BRAND.tintAlpha).toBeLessThanOrEqual(0.12)
  })

  it('keeps the repeating watermark faint enough to read through', () => {
    expect(BRAND.watermarkAlpha).toBeGreaterThan(0)
    expect(BRAND.watermarkAlpha).toBeLessThanOrEqual(0.12)
  })

  it('keeps the backdrop logo faint enough to stay behind the reviews', () => {
    expect(BRAND.backdropAlpha).toBeGreaterThan(0)
    expect(BRAND.backdropAlpha).toBeLessThanOrEqual(0.12)
  })
})
