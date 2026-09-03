// One painter per storyboard scene type. Each receives the scene, the frame
// index inside that scene, and the preloaded asset images.
import {
  PALETTE,
  SANS,
  clamp,
  getBrandMark,
  drawCaptionPill,
  drawImageCard,
  drawTracked,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  roundRect,
  wrapText,
} from './draw.mjs'

const ENTER_FRAMES = 7
const EXIT_FRAMES = 5

// Content fades and settles on entry, then fades out, so cuts never feel abrupt.
export function sceneAlpha(local, duration) {
  const entering = clamp(local / ENTER_FRAMES, 0, 1)
  const leaving = clamp((duration - local) / EXIT_FRAMES, 0, 1)
  return easeOutCubic(entering) * easeOutCubic(leaving)
}

const CARD_BOX = { x: 70, y: 336, w: 940, h: 1150 }

// Text-only crops of short chat messages are wide and shallow. Centred in the
// full card area they float in a void, so the shorter the card the closer it
// sits to the pull-quote beneath it.
function cardBoxFor(image) {
  const fitted = image.height * Math.min(CARD_BOX.w / image.width, CARD_BOX.h / image.height)
  const fullness = clamp(fitted / CARD_BOX.h, 0, 1)
  const centreY = lerp(1120, CARD_BOX.y + CARD_BOX.h / 2, fullness)

  return { ...CARD_BOX, y: centreY - CARD_BOX.h / 2 }
}

export function drawReviewScene(ctx, scene, local, assets) {
  const p = local / scene.durationInFrames
  const alpha = sceneAlpha(local, scene.durationInFrames)
  const enter = easeOutCubic(clamp(local / ENTER_FRAMES, 0, 1))

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(0, lerp(26, 0, enter))

  drawCaptionPill(ctx, scene.caption, 540, 246, alpha)

  const image = assets.get(scene.review.asset)
  // Kept small on purpose: the card is clipped to its zoom-1 frame, so a
  // larger push crops the outer characters off text-heavy screenshots.
  const zoom = lerp(1, 1.028, easeInOutCubic(p))
  drawImageCard(ctx, image, CARD_BOX, { zoom })

  drawQuoteStrip(ctx, scene.review.quote, p)
  ctx.restore()
}

function drawQuoteStrip(ctx, quote, p) {
  const reveal = easeOutCubic(clamp((p - 0.2) / 0.22, 0, 1))
  if (reveal <= 0) return

  const boxX = 70
  const boxW = 940
  const boxY = 1548
  const padX = 40

  ctx.save()
  ctx.globalAlpha *= reveal
  ctx.translate(0, lerp(16, 0, reveal))

  ctx.font = `500 41px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const lines = wrapText(ctx, `“${quote}”`, boxW - padX * 2 - 26, 2)
  const boxH = 46 + lines.length * 52

  const bg = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH)
  bg.addColorStop(0, 'rgba(139,92,246,0.22)')
  bg.addColorStop(1, 'rgba(139,92,246,0.08)')
  ctx.fillStyle = bg
  roundRect(ctx, boxX, boxY, boxW, boxH, 26)
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(167,139,250,0.34)'
  ctx.stroke()

  const bar = ctx.createLinearGradient(0, boxY + 18, 0, boxY + boxH - 18)
  bar.addColorStop(0, PALETTE.light)
  bar.addColorStop(1, PALETTE.mint)
  ctx.fillStyle = bar
  roundRect(ctx, boxX + 20, boxY + 18, 6, boxH - 36, 3)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  lines.forEach((line, index) => {
    ctx.fillText(line, boxX + padX + 22, boxY + 34 + index * 52 + 12)
  })
  ctx.restore()
}

// Every tile is the same plate whatever the screenshot's shape. Cropping a
// wide text-only crop to fill would enlarge it into an unreadable fragment,
// and letting it float leaves a ragged grid, so the artwork is fitted whole
// and centred on a consistent card instead.
function drawCollageTile(ctx, image, box) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = 'rgba(14, 9, 26, 0.86)'
  roundRect(ctx, box.x, box.y, box.w, box.h, 26)
  ctx.fill()
  ctx.restore()

  const inset = 14
  const innerW = box.w - inset * 2
  const innerH = box.h - inset * 2
  const scale = Math.min(innerW / image.width, innerH / image.height)
  const drawW = image.width * scale
  const drawH = image.height * scale

  ctx.save()
  roundRect(ctx, box.x, box.y, box.w, box.h, 26)
  ctx.clip()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    box.x + (box.w - drawW) / 2,
    box.y + (box.h - drawH) / 2,
    drawW,
    drawH,
  )
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, box.x, box.y, box.w, box.h, 26)
  ctx.stroke()
  ctx.restore()
}

export function drawCollageScene(ctx, scene, local, assets) {
  const alpha = sceneAlpha(local, scene.durationInFrames)
  const p = local / scene.durationInFrames

  ctx.save()
  ctx.globalAlpha = alpha
  drawCaptionPill(ctx, scene.caption, 540, 246, alpha)

  const cols = 2
  const tileW = 440
  const tileH = 566
  const gap = 28
  const originX = (1080 - (cols * tileW + gap)) / 2
  const originY = 372

  scene.reviews.forEach((review, index) => {
    const stagger = easeOutCubic(clamp((local - index * 3) / 10, 0, 1))
    if (stagger <= 0) return

    const col = index % cols
    const row = Math.floor(index / cols)
    const box = {
      x: originX + col * (tileW + gap),
      y: originY + row * (tileH + gap),
      w: tileW,
      h: tileH,
    }

    ctx.save()
    ctx.globalAlpha *= stagger
    const scale = lerp(0.94, 1, stagger)
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2)
    ctx.scale(scale, scale)
    ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2))
    drawCollageTile(ctx, assets.get(review.asset), box)
    ctx.restore()
  })

  ctx.restore()
}

export function drawHookScene(ctx, scene, local, assets, wallAssets) {
  const p = local / scene.durationInFrames
  const alpha = sceneAlpha(local, scene.durationInFrames)

  // A dim wall of real screenshots sits behind the hook so the promise of
  // social proof is visible before a single word is read.
  ctx.save()
  ctx.globalAlpha = 0.16 * alpha
  const tileW = 320
  const tileH = 520
  const gap = 24
  wallAssets.forEach((asset, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const drift = -p * 40
    drawImageCard(
      ctx,
      assets.get(asset),
      {
        x: 36 + col * (tileW + gap),
        y: 108 + row * (tileH + gap) + drift,
        w: tileW,
        h: tileH,
      },
      { radius: 22, fit: 'cover' },
    )
  })
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(19,10,36,0.62)'
  ctx.fillRect(0, 0, 1080, 1920)

  const enter = easeOutCubic(clamp(local / 10, 0, 1))
  ctx.translate(0, lerp(36, 0, enter))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Branded from the first frame: the roundel lands above the headline.
  const mark = getBrandMark()
  if (mark) {
    const size = lerp(180, 208, enter)
    ctx.save()
    ctx.shadowColor = 'rgba(139,92,246,0.6)'
    ctx.shadowBlur = 40
    ctx.drawImage(mark, 540 - size / 2, 596 - size / 2, size, size)
    ctx.restore()
  }

  ctx.font = `700 88px ${SANS}`
  const lines = wrapText(ctx, scene.line, 900)
  const startY = 860 - ((lines.length - 1) * 108) / 2
  ctx.fillStyle = '#FFFFFF'
  lines.forEach((line, index) => ctx.fillText(line, 540, startY + index * 108))

  const underlineY = startY + (lines.length - 1) * 108 + 86
  const wipe = easeOutCubic(clamp((local - 6) / 14, 0, 1))
  const underline = ctx.createLinearGradient(540 - 190, 0, 540 + 190, 0)
  underline.addColorStop(0, PALETTE.light)
  underline.addColorStop(1, PALETTE.accent)
  ctx.fillStyle = underline
  roundRect(ctx, 540 - 190 * wipe, underlineY, 380 * wipe, 8, 4)
  ctx.fill()

  ctx.font = `500 42px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.74)'
  ctx.fillText(scene.sub, 540, underlineY + 76)
  ctx.restore()
}

export function drawCtaScene(ctx, scene, local) {
  const alpha = sceneAlpha(local, scene.durationInFrames)
  const enter = easeOutCubic(clamp(local / 12, 0, 1))

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.translate(0, lerp(30, 0, enter))

  // Typographic roundel: an on-brand mark that does not borrow anyone's logo.
  const markY = 470
  const ring = ctx.createLinearGradient(540 - 96, markY - 96, 540 + 96, markY + 96)
  ring.addColorStop(0, PALETTE.light)
  ring.addColorStop(1, PALETTE.accent)
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(540, markY, 96, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(19,10,36,0.9)'
  ctx.beginPath()
  ctx.arc(540, markY, 84, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `700 62px ${SANS}`
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('VR', 540, markY + 2)
  ctx.font = `700 26px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  drawTracked(ctx, 'VR JONINA', 540, markY + 138, 8)

  const [headline, join, ask, visitLabel, farewell] = scene.lines

  ctx.font = `600 56px ${SANS}`
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(headline, 540, 730)

  ctx.font = `500 46px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.fillText(join, 540, 806)

  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(300, 886)
  ctx.lineTo(780, 886)
  ctx.stroke()

  ctx.font = `500 40px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.76)'
  ctx.fillText(ask, 540, 962)

  ctx.font = `500 34px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(visitLabel, 540, 1030)

  drawUrlPill(ctx, scene, local)

  ctx.font = `500 38px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(farewell, 540, 1300)
  ctx.restore()
}

function drawUrlPill(ctx, scene, local) {
  const start = scene.durationInFrames - scene.urlVisibleFrames
  const reveal = easeOutCubic(clamp((local - start) / 9, 0, 1))
  if (reveal <= 0) return

  const label = scene.url.replace('https://', '')
  ctx.save()
  ctx.globalAlpha *= reveal
  ctx.font = `700 58px ${SANS}`

  const w = ctx.measureText(label).width + 108
  const h = 128
  const x = 540 - w / 2
  const y = 1130 - h / 2
  const scale = lerp(0.93, 1, reveal)
  ctx.translate(540, 1130)
  ctx.scale(scale, scale)
  ctx.translate(-540, -1130)

  ctx.shadowColor = 'rgba(139,92,246,0.55)'
  ctx.shadowBlur = 46
  const bg = ctx.createLinearGradient(x, y, x + w, y + h)
  bg.addColorStop(0, PALETTE.primary)
  bg.addColorStop(1, '#6D4AE0')
  ctx.fillStyle = bg
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.stroke()

  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 540, 1132)
  ctx.restore()
}
