// Low-level drawing helpers shared by the scene renderers.
// Everything here is pure painting: no timeline or storyboard knowledge.

import { createCanvas } from '@napi-rs/canvas'

export const SANS = '"Helvetica Neue", Helvetica, Arial, "Apple Color Emoji"'

export const PALETTE = {
  bgTop: '#251544',
  bgBottom: '#130A24',
  primary: '#8B5CF6',
  light: '#A78BFA',
  accent: '#EC4899',
  mint: '#5EEAD4',
  ink: '#FFFFFF',
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
export const lerp = (a, b, t) => a + (b - a) * t
export const easeOutCubic = (t) => 1 - (1 - t) ** 3
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

// Canvas has no letter-spacing, so tracked wordmarks are drawn glyph by glyph.
export function drawTracked(ctx, text, centerX, y, spacing) {
  const chars = [...text]
  const widths = chars.map((char) => ctx.measureText(char).width)
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1)
  let cursor = centerX - total / 2
  ctx.textAlign = 'left'
  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y)
    cursor += widths[index] + spacing
  })
  ctx.textAlign = 'center'
  return total
}

export function wrapText(ctx, text, maxWidth, maxLines = Infinity) {
  const words = text.split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)

  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1)
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`
  }
  return lines
}

// The backdrop is expensive to paint live (two full-frame radial gradients per
// frame), so it is baked once into sprites and blitted with a drifting offset.
let backdrop = null

function glowSprite(radius, color) {
  const size = radius * 2
  const sprite = createCanvas(size, size)
  const sctx = sprite.getContext('2d')
  const g = sctx.createRadialGradient(radius, radius, 0, radius, radius, radius)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  sctx.fillStyle = g
  sctx.fillRect(0, 0, size, size)
  return sprite
}

function buildBackdrop(width, height) {
  const base = createCanvas(width, height)
  const bctx = base.getContext('2d')
  const gradient = bctx.createLinearGradient(0, 0, width * 0.3, height)
  gradient.addColorStop(0, PALETTE.bgTop)
  gradient.addColorStop(1, PALETTE.bgBottom)
  bctx.fillStyle = gradient
  bctx.fillRect(0, 0, width, height)

  return {
    width,
    height,
    base,
    primary: glowSprite(760, PALETTE.primary),
    accent: glowSprite(700, PALETTE.accent),
  }
}

export function drawBackground(ctx, width, height, t) {
  if (!backdrop || backdrop.width !== width || backdrop.height !== height) {
    backdrop = buildBackdrop(width, height)
  }

  ctx.drawImage(backdrop.base, 0, 0)

  const blit = (sprite, cx, cy, alpha) => {
    ctx.globalAlpha = alpha
    ctx.drawImage(sprite, cx - sprite.width / 2, cy - sprite.height / 2)
    ctx.globalAlpha = 1
  }

  // Slow drift keeps the backdrop alive without pulling focus off the reviews.
  blit(backdrop.primary, width * 0.18 + Math.sin(t * 1.6) * 60, height * 0.16 + Math.cos(t * 1.2) * 50, 0.4)
  blit(backdrop.accent, width * 0.86 + Math.cos(t * 1.1) * 50, height * 0.82 + Math.sin(t * 1.4) * 60, 0.22)
}

export function drawBrandMark(ctx, width) {
  ctx.save()
  const y = 118
  ctx.font = `700 30px ${SANS}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  const label = drawTracked(ctx, 'VR JONINA', width / 2 + 20, y, 7)

  const dotX = width / 2 + 20 - label / 2 - 26
  const dot = ctx.createLinearGradient(dotX - 9, y - 9, dotX + 9, y + 9)
  dot.addColorStop(0, PALETTE.light)
  dot.addColorStop(1, PALETTE.accent)
  ctx.fillStyle = dot
  ctx.beginPath()
  ctx.arc(dotX, y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawFooter(ctx, width, height, progress, url) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `500 29px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(url.replace('https://', ''), width / 2, height - 108)

  const barW = width - 200
  const barX = 100
  const barY = height - 58
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, barX, barY, barW, 5, 3)
  ctx.fill()

  const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  fill.addColorStop(0, PALETTE.light)
  fill.addColorStop(1, PALETTE.accent)
  ctx.fillStyle = fill
  roundRect(ctx, barX, barY, Math.max(6, barW * progress), 5, 3)
  ctx.fill()
  ctx.restore()
}

export function drawCaptionPill(ctx, text, centerX, centerY, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = `600 40px ${SANS}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const w = ctx.measureText(text).width + 76
  const h = 82
  const x = centerX - w / 2
  const y = centerY - h / 2

  const bg = ctx.createLinearGradient(x, y, x + w, y + h)
  bg.addColorStop(0, 'rgba(139,92,246,0.34)')
  bg.addColorStop(1, 'rgba(236,72,153,0.24)')
  ctx.fillStyle = bg
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()

  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(196,181,253,0.55)'
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.fillText(text, centerX, centerY + 1)
  ctx.restore()
}

const shadowCache = new Map()

// Skia re-blurs a 44px shadow every frame (~100ms at 1080x1920), so each
// distinct card geometry gets its shadow baked once and blitted thereafter.
function shadowSprite(w, h, radius) {
  const key = `${w}x${h}r${radius}`
  const cached = shadowCache.get(key)
  if (cached) return cached

  const pad = 90
  const sprite = createCanvas(Math.ceil(w + pad * 2), Math.ceil(h + pad * 2))
  const sctx = sprite.getContext('2d')
  sctx.shadowColor = 'rgba(0,0,0,0.55)'
  sctx.shadowBlur = 44
  sctx.shadowOffsetY = 18
  sctx.fillStyle = 'rgba(10,6,20,0.92)'
  roundRect(sctx, pad, pad, w, h, radius)
  sctx.fill()

  const entry = { sprite, pad }
  shadowCache.set(key, entry)
  return entry
}

// Draws `image` inside a rounded window, scaled to fit or cover, with a Ken
// Burns zoom applied to the picture while the window itself stays put.
export function drawImageCard(ctx, image, box, { zoom = 1, radius = 34, fit = 'contain' } = {}) {
  const scale =
    fit === 'cover'
      ? Math.max(box.w / image.width, box.h / image.height)
      : Math.min(box.w / image.width, box.h / image.height)

  const frameW = fit === 'cover' ? box.w : image.width * scale
  const frameH = fit === 'cover' ? box.h : image.height * scale
  const frameX = Math.round(box.x + (box.w - frameW) / 2)
  const frameY = Math.round(box.y + (box.h - frameH) / 2)
  const w = Math.round(frameW)
  const h = Math.round(frameH)

  const { sprite, pad } = shadowSprite(w, h, radius)
  ctx.drawImage(sprite, frameX - pad, frameY - pad)

  ctx.save()
  roundRect(ctx, frameX, frameY, w, h, radius)
  ctx.clip()
  const drawW = image.width * scale * zoom
  const drawH = image.height * scale * zoom
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, frameX + (w - drawW) / 2, frameY + (h - drawH) / 2, drawW, drawH)
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  roundRect(ctx, frameX, frameY, w, h, radius)
  ctx.stroke()
  ctx.restore()

  return { x: frameX, y: frameY, w, h }
}
