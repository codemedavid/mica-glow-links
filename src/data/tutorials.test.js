import { describe, it, expect } from 'vitest'
import { TUTORIAL_CATEGORIES, tutorials } from './tutorials'

/**
 * Journey: As the shop owner, I want the tutorial library to stay coherent as I
 * publish videos over time, so that the tutorials page never renders a broken
 * card, a dead link, or an empty category filter.
 *
 * Source of truth: "Tutorials.dc.html" in the Mama Mica GLW design project.
 */

describe('tutorial library integrity', () => {
  it('has no duplicate ids', () => {
    const seen = tutorials.map((t) => t.id)

    expect(new Set(seen).size).toBe(seen.length)
  })

  it('gives every tutorial a non-empty title', () => {
    const bad = tutorials.filter((t) => !t.title || !t.title.trim())

    expect(bad).toEqual([])
  })

  it('gives every tutorial a non-empty description', () => {
    const bad = tutorials.filter((t) => !t.desc || !t.desc.trim())

    expect(bad).toEqual([])
  })

  it('files every tutorial under a known category', () => {
    const bad = tutorials.filter((t) => !TUTORIAL_CATEGORIES.includes(t.category))

    expect(bad).toEqual([])
  })

  it('leaves no category filter empty', () => {
    const unused = TUTORIAL_CATEGORIES.filter(
      (category) => !tutorials.some((t) => t.category === category)
    )

    expect(unused).toEqual([])
  })

  it('times every tutorial as m:ss', () => {
    const bad = tutorials.filter((t) => !/^\d{1,2}:[0-5]\d$/.test(t.length))

    expect(bad).toEqual([])
  })

  it('marks exactly one tutorial as featured', () => {
    const featured = tutorials.filter((t) => t.isFeatured)

    expect(featured).toHaveLength(1)
  })

  it('gives youtubeId as null while unpublished, never undefined', () => {
    const bad = tutorials.filter((t) => !(t.youtubeId === null || typeof t.youtubeId === 'string'))

    expect(bad).toEqual([])
  })

  it('stores a bare 11-character video id, never a pasted watch URL', () => {
    const bad = tutorials.filter(
      (t) => t.youtubeId !== null && !/^[A-Za-z0-9_-]{11}$/.test(t.youtubeId)
    )

    expect(bad).toEqual([])
  })

  it('keeps titles short enough to render on one card line', () => {
    const bad = tutorials.filter((t) => t.title.includes('\n') || t.title.length > 60)

    expect(bad).toEqual([])
  })
})

describe('tutorial library — ported from the design', () => {
  it('carries every tutorial from the design', () => {
    expect(tutorials).toHaveLength(6)
  })

  it('features the recorded walkthrough as the starting point', () => {
    const featured = tutorials.find((t) => t.isFeatured)

    expect(featured).toMatchObject({
      title: 'Reconstituting vials & using peptide pens',
      category: 'Reconstitution',
      length: '8:08',
    })
  })

  it('names both topics the featured recording covers', () => {
    const featured = tutorials.find((t) => t.isFeatured)

    expect(featured.desc).toMatch(/reconstitut/i)
    expect(featured.desc).toMatch(/pen/i)
  })

  it.each([
    ['Drawing your dose in units', 'Dosing', '3:20'],
    ['Mixing without damaging the peptide', 'Reconstitution', '2:55'],
    ['Choosing your syringe size', 'Dosing', '3:41'],
    ['Storage, handling and sharps', 'Storage', '5:05'],
    ['Changing a pen cartridge', 'Peptide pens', '3:12'],
  ])('lists "%s" under %s at %s', (title, category, length) => {
    expect(tutorials.find((t) => t.title === title)).toMatchObject({ category, length })
  })

  it('has no video published yet, so every card is a coming-soon card', () => {
    const published = tutorials.filter((t) => t.youtubeId !== null)

    expect(published).toEqual([])
  })
})
