import { CTA, HOOK, findReview } from './reviews.js'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

export const secondsToFrames = (seconds) => Math.round(seconds * FPS)

// The storyboard, in order. Durations are the readable-on-a-phone minimum plus
// headroom: longer for dense paragraphs, shorter for one-line delivery posts.
const STORYBOARD = [
  { type: 'hook', seconds: 2.6 },
  {
    type: 'collage',
    seconds: 2.2,
    caption: 'Community feedback',
    reviewIds: ['r-second-gb', 'r-third-order', 'r-vancouver', 'r-gb-raffle-haul'],
  },
  { type: 'review', seconds: 3.0, reviewId: 'r-second-gb' },
  { type: 'review', seconds: 2.4, reviewId: 'r-super-bilis' },
  { type: 'review', seconds: 2.3, reviewId: 'r-third-order' },
  { type: 'review', seconds: 2.4, reviewId: 'r-first-time-buyer' },
  {
    type: 'collage',
    seconds: 2.0,
    caption: 'Another successful order',
    reviewIds: ['r-raffle-scale', 'r-raffle-tr30', 'r-raffle-printer', 'r-thank-you-parcel'],
  },
  { type: 'review', seconds: 2.2, reviewId: 'r-vancouver' },
  { type: 'review', seconds: 3.2, reviewId: 'r-trusted-five-times' },
  { type: 'review', seconds: 2.8, reviewId: 'r-third-transaction' },
  { type: 'review', seconds: 2.2, reviewId: 'r-two-gbs' },
  { type: 'cta', seconds: 5.4, urlSeconds: 4.4 },
]

const buildScene = (step, from) => {
  const durationInFrames = secondsToFrames(step.seconds)
  const base = { type: step.type, from, durationInFrames }

  switch (step.type) {
    case 'hook':
      return { ...base, line: HOOK.line, sub: HOOK.sub }
    case 'collage':
      return { ...base, caption: step.caption, reviews: step.reviewIds.map(findReview) }
    case 'review': {
      const review = findReview(step.reviewId)
      return { ...base, review, caption: review.caption }
    }
    case 'cta':
      return {
        ...base,
        lines: CTA.lines,
        url: CTA.url,
        urlVisibleFrames: secondsToFrames(step.urlSeconds),
      }
    default:
      throw new Error(`Unknown storyboard step: ${step.type}`)
  }
}

export function buildTimeline() {
  let cursor = 0
  const scenes = STORYBOARD.map((step) => {
    const scene = buildScene(step, cursor)
    cursor += scene.durationInFrames
    return scene
  })

  return { fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames: cursor, scenes }
}
