// Turns the raw screenshots in `customer reviews/` into render-ready assets:
// private details are mosaicked out, the frame is cropped to the part of the
// message worth reading, and the result is capped at 1400px on its long edge.
//
// HEIC is decoded with macOS `sips` first, because Skia cannot read it.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCanvas, loadImage } from '@napi-rs/canvas'

import { BRAND, REVIEWS } from './reviews.js'

const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(VIDEO_DIR, '..')
const SOURCE_DIR = path.join(REPO_ROOT, 'customer reviews')
const ASSET_DIR = path.join(VIDEO_DIR, 'assets')
const TMP_DIR = path.join(VIDEO_DIR, 'tmp')

const MAX_EDGE = 1400
const MOSAIC_BLOCKS = 10

// The MamaMica roundel sits on a white plate in public/logo.png. Measured ink
// bounding box is 282,25 -> 739,487, i.e. a circle at (510.5, 256) r~231.
const LOGO_SOURCE = 'public/logo.png'
const LOGO_CIRCLE = { cx: 510.5, cy: 256, r: 232 }

// Replaces a region with a coarse mosaic. Reads as a deliberate privacy screen
// rather than a rendering glitch, and never leaks a legible downscale.
function mosaic(ctx, canvas, box) {
  const x = Math.round(box.x * canvas.width)
  const y = Math.round(box.y * canvas.height)
  const w = Math.round(box.w * canvas.width)
  const h = Math.round(box.h * canvas.height)
  if (w <= 0 || h <= 0) return

  const smallW = Math.max(1, Math.round(MOSAIC_BLOCKS * (w / Math.max(w, h))))
  const smallH = Math.max(1, Math.round(MOSAIC_BLOCKS * (h / Math.max(w, h))))
  const small = createCanvas(smallW, smallH)
  small.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, smallW, smallH)

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, smallW, smallH, x, y, w, h)
  ctx.restore()
}

// Lifts the roundel off its white plate into a transparent PNG, so it can be
// laid over artwork as a watermark without dragging a white box along.
async function prepareBrandMark() {
  const image = await loadImage(path.join(REPO_ROOT, LOGO_SOURCE))
  const { cx, cy, r } = LOGO_CIRCLE
  const size = r * 2

  const out = createCanvas(size, size)
  const ctx = out.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.arc(r, r, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(image, cx - r, cy - r, size, size, 0, 0, size, size)
  ctx.restore()

  writeFileSync(path.join(ASSET_DIR, BRAND.logo), out.toBuffer('image/png'))
  return `${BRAND.logo.padEnd(28)} ${size}x${size}  transparent roundel`
}

function prepare(review) {
  const source = path.join(SOURCE_DIR, review.source)
  if (!existsSync(source)) throw new Error(`Missing screenshot: ${review.source}`)

  const decoded = path.join(TMP_DIR, `${review.id}.src.jpg`)
  execFileSync('sips', ['-s', 'format', 'jpeg', source, '--out', decoded], { stdio: 'ignore' })

  return loadImage(decoded).then((image) => {
    const stage = createCanvas(image.width, image.height)
    const stageCtx = stage.getContext('2d')
    stageCtx.drawImage(image, 0, 0)
    for (const box of review.redactions) mosaic(stageCtx, stage, box)

    const cropX = Math.round(review.crop.x * image.width)
    const cropY = Math.round(review.crop.y * image.height)
    const cropW = Math.round(review.crop.w * image.width)
    const cropH = Math.round(review.crop.h * image.height)

    const scale = Math.min(1, MAX_EDGE / Math.max(cropW, cropH))
    const outW = Math.max(1, Math.round(cropW * scale))
    const outH = Math.max(1, Math.round(cropH * scale))

    const out = createCanvas(outW, outH)
    const outCtx = out.getContext('2d')
    outCtx.imageSmoothingEnabled = true
    outCtx.imageSmoothingQuality = 'high'
    outCtx.drawImage(stage, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

    writeFileSync(path.join(ASSET_DIR, review.asset), out.toBuffer('image/jpeg', 90))
    return `${review.asset.padEnd(28)} ${outW}x${outH}  redactions=${review.redactions.length}`
  })
}

mkdirSync(ASSET_DIR, { recursive: true })
mkdirSync(TMP_DIR, { recursive: true })

const lines = [await prepareBrandMark()]
for (const review of REVIEWS) lines.push(await prepare(review))
rmSync(TMP_DIR, { recursive: true, force: true })

console.log(lines.join('\n'))
console.log(`\nPrepared ${REVIEWS.length} assets into video/assets/`)
