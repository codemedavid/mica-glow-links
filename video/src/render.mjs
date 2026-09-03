// Renders the reel frame by frame and streams JPEGs straight into ffmpeg, so a
// ~1000-frame 1080x1920 render never materialises as files on disk.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'

import { createCanvas, loadImage } from '@napi-rs/canvas'
import ffmpegPath from 'ffmpeg-static'

import { BRAND, CTA, REVIEWS } from './reviews.js'
import { FPS, HEIGHT, WIDTH, buildTimeline } from './timeline.js'
import { drawBackground, drawBrandMark, drawBrandOverlay, drawFooter, setBrandMark } from './draw.mjs'
import { drawCollageScene, drawCtaScene, drawHookScene, drawReviewScene } from './scenes.mjs'

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSET_DIR = path.join(VIDEO_DIR, 'assets')
const OUT_DIR = path.join(VIDEO_DIR, 'out')
const OUT_FILE = path.join(OUT_DIR, 'vrjonina-social-proof.mp4')
const MUSIC_FILE = path.join(ASSET_DIR, 'music.mp3')

// Nine tiles: a 3x3 wall that reaches the bottom of the 1080x1920 frame.
const HOOK_WALL = [
  'r-second-gb.jpg',
  'r-third-order.jpg',
  'r-first-time-buyer.jpg',
  'r-thank-you-parcel.jpg',
  'r-vancouver.jpg',
  'r-raffle-tr30.jpg',
  'r-two-gbs.jpg',
  'r-gb-raffle-haul.jpg',
  'r-raffle-scale.jpg',
]

async function loadAssets() {
  const assets = new Map()
  for (const review of REVIEWS) {
    const file = path.join(ASSET_DIR, review.asset)
    if (!existsSync(file)) {
      throw new Error(`Missing prepared asset ${review.asset}. Run: npm run prepare-assets`)
    }
    assets.set(review.asset, await loadImage(file))
  }

  const markFile = path.join(ASSET_DIR, BRAND.logo)
  if (!existsSync(markFile)) {
    throw new Error(`Missing ${BRAND.logo}. Run: npm run prepare-assets`)
  }
  setBrandMark(await loadImage(markFile))

  return assets
}

function drawFrame(ctx, timeline, frame, assets) {
  const scene = timeline.scenes.find(
    (candidate) => frame >= candidate.from && frame < candidate.from + candidate.durationInFrames,
  )
  const local = frame - scene.from

  drawBackground(ctx, WIDTH, HEIGHT, frame / FPS)

  switch (scene.type) {
    case 'hook':
      drawHookScene(ctx, scene, local, assets, HOOK_WALL)
      break
    case 'collage':
      drawCollageScene(ctx, scene, local, assets)
      break
    case 'review':
      drawReviewScene(ctx, scene, local, assets)
      break
    case 'cta':
      drawCtaScene(ctx, scene, local)
      break
    default:
      throw new Error(`Unknown scene type: ${scene.type}`)
  }

  // Ownership marking sits above the artwork so a lifted screenshot carries it.
  drawBrandOverlay(ctx, WIDTH, HEIGHT)

  if (scene.type !== 'cta') {
    drawBrandMark(ctx, WIDTH)
    drawFooter(ctx, WIDTH, HEIGHT, frame / timeline.durationInFrames, CTA.url)
  }
}

function buildFfmpegArgs(hasMusic) {
  // Frames are piped as MJPEG rather than raw RGBA. Raw frames are 8.3MB each,
  // and a queue of them drove the machine into swap (and, on a nearly full
  // disk, into an unrecoverable uninterruptible wait). JPEG frames are ~16KB.
  const args = ['-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-r', String(FPS), '-i', 'pipe:0']
  if (hasMusic) args.push('-i', MUSIC_FILE, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k', '-shortest')
  args.push(
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '20',
    '-preset', 'medium',
    '-r', String(FPS),
    '-movflags', '+faststart',
    OUT_FILE,
  )
  return args
}

const timeline = buildTimeline()
const assets = await loadAssets()
mkdirSync(OUT_DIR, { recursive: true })

const hasMusic = existsSync(MUSIC_FILE)
const ffmpeg = spawn(ffmpegPath, buildFfmpegArgs(hasMusic), {
  stdio: ['pipe', 'ignore', 'pipe'],
})

let ffmpegError = ''
ffmpeg.stderr.on('data', (chunk) => {
  ffmpegError += chunk.toString()
  if (ffmpegError.length > 8000) ffmpegError = ffmpegError.slice(-8000)
})

const canvas = createCanvas(WIDTH, HEIGHT)
const ctx = canvas.getContext('2d')

process.stdout.write(
  `Rendering ${timeline.durationInFrames} frames ` +
    `(${(timeline.durationInFrames / FPS).toFixed(1)}s @ ${WIDTH}x${HEIGHT})` +
    `${hasMusic ? ' with music' : ' silent (drop an MP3 at video/assets/music.mp3 for audio)'}\n`,
)

for (let frame = 0; frame < timeline.durationInFrames; frame += 1) {
  drawFrame(ctx, timeline, frame, assets)
  // Quality 90 is visually indistinguishable after the x264 pass and keeps the
  // pipe queue small enough that the writer never backs up.
  if (!ffmpeg.stdin.write(canvas.encodeSync('jpeg', 90))) {
    await once(ffmpeg.stdin, 'drain')
  }
  if (frame % 60 === 0) process.stdout.write(`  frame ${frame}/${timeline.durationInFrames}\n`)
}

ffmpeg.stdin.end()
const [code] = await once(ffmpeg, 'close')

if (code !== 0) {
  process.stderr.write(`${ffmpegError}\n`)
  throw new Error(`ffmpeg exited with code ${code}`)
}
process.stdout.write(`\nWrote ${path.relative(VIDEO_DIR, OUT_FILE)}\n`)
