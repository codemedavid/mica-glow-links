import { describe, it, expect } from 'vitest'
import { products } from './products'

/**
 * Journey: As the shop owner, I want the catalogue to stay in sync with the
 * latest price list, so that quotes I give customers match what they are
 * actually charged.
 *
 * Source of truth: "Mica Pricelist August 4.xlsx", sheet "Updated Pricelist".
 */

const byCode = new Map(products.map((p) => [p.code, p]))
const get = (code) => byCode.get(code)

describe('catalogue integrity', () => {
  it('has no duplicate product codes', () => {
    const seen = products.map((p) => p.code)

    expect(new Set(seen).size).toBe(seen.length)
  })

  it('has no untrimmed or empty codes', () => {
    const bad = products.filter((p) => !p.code || p.code !== p.code.trim())

    expect(bad).toEqual([])
  })

  it('gives every product a non-empty name', () => {
    const bad = products.filter((p) => !p.name || !p.name.trim())

    expect(bad).toEqual([])
  })

  it('prices every product with a positive finite per-vial amount', () => {
    const bad = products.filter(
      (p) => typeof p.vial !== 'number' || !Number.isFinite(p.vial) || p.vial <= 0
    )

    expect(bad).toEqual([])
  })

  it('rounds every price to at most two decimal places', () => {
    const bad = products.filter((p) => Math.round(p.vial * 100) !== p.vial * 100)

    expect(bad).toEqual([])
  })

  it('uses only the four known stock states', () => {
    const bad = products.filter(
      (p) => !['in', 'low', 'out', 'unknown'].includes(p.stock)
    )

    expect(bad).toEqual([])
  })

  it('gives spec as a non-empty string or null, never undefined', () => {
    const bad = products.filter(
      (p) => !(p.spec === null || (typeof p.spec === 'string' && p.spec.trim()))
    )

    expect(bad).toEqual([])
  })

  it('keeps lab-report boilerplate out of product names', () => {
    const noise = /janoshik|vanguard|unique key|analysis conducted|task #|laboratory id/i
    const bad = products.filter((p) => noise.test(p.name))

    expect(bad).toEqual([])
  })

  it('keeps promotional badge text out of product names', () => {
    const badge = /top pick|highly recommends|favorite/i
    const bad = products.filter((p) => badge.test(p.name))

    expect(bad).toEqual([])
  })

  it('keeps names to a single line short enough to render in a result row', () => {
    const bad = products.filter((p) => p.name.includes('\n') || p.name.length > 90)

    expect(bad).toEqual([])
  })
})

describe('August 4 price list — newly listed products', () => {
  it.each([
    ['BA3PHRMAGREEN', 85],
    ['BA10PHRMAGREEN', 149.9],
    ['FR5', 741],
    ['MICABLEND 3.0', 1365],
    ['RETALIDE', 2606.5],
    ['MICABLEND70', 2730],
    ['SG06', 409],
    ['SG07', 345],
    ['SG08', 300],
    ['SG09', 340],
    ['SG10', 300],
    ['IS24', 1054],
    ['TMB-GHKCU-SH250', 799],
    ['TMB-GHKCND-CND250', 699],
  ])('lists %s at PHP %d per vial', (code, vial) => {
    expect(get(code)).toMatchObject({ code, vial })
  })
})

describe('August 4 price list — corrections to existing products', () => {
  it('raises AOD-9604 10mg (10AD) to the August price', () => {
    expect(get('10AD').vial).toBe(1105)
  })

  it.each([
    ['TMB-AHKM100', 599],
    ['TMB-NGO15', 149],
    ['TMB-GHKSER30', 299],
  ])('prices %s at its PHP retail price, not its USD figure', (code, vial) => {
    expect(get(code).vial).toBe(vial)
  })

  it('renames the Lemon Bottle products, which were mislabelled as HGH', () => {
    expect(get('LB').name).toMatch(/lemon bottle/i)
    expect(get('LB50').name).toMatch(/lemon bottle/i)
  })

  it('renames the 5-amino products, which were mislabelled as NAD+', () => {
    expect(get('5AM.').name).toMatch(/5-amino/i)
    expect(get('10AM.').name).toMatch(/5-amino/i)
    expect(get('50AM.').name).toMatch(/5-amino/i)
  })

  it('renames GTT to Glutathione, which was mislabelled as GLP-1', () => {
    expect(get('GTT').name).toMatch(/glutathione/i)
  })

  it('names 5AD by its own strength rather than inheriting 2AD', () => {
    expect(get('5AD').name).toBe('AOD-9604 5mg')
  })

  it('corrects the SLU-PP-332 code, previously listed as 322', () => {
    expect(get('332')).toMatchObject({ name: 'SLU-PP-332', vial: 1040 })
    expect(get('322')).toBeUndefined()
  })
})

/**
 * Resolved with the shop owner on 2026-08-05, where the spreadsheet was
 * ambiguous. These override the raw "Per vial cost" column.
 */
describe('August 4 price list — owner-confirmed corrections', () => {
  it('prices NS10 per ampoule, not per 5-ampoule pack', () => {
    expect(get('NS10').vial).toBe(55)
  })

  it('keeps the NS10 pack size visible in the spec', () => {
    expect(get('NS10').spec).toMatch(/5 ampoules\/pack/i)
  })

  it('does not mark FR5 as out of stock', () => {
    expect(get('FR5').stock).not.toBe('out')
  })

  it('excludes the Niimbot label printers, which are not peptide products', () => {
    const niimbot = products.filter((p) => /niimbot/i.test(`${p.code} ${p.name}`))

    expect(niimbot).toEqual([])
  })
})

describe('August 4 price list — delisted products', () => {
  it.each(['BW10-India', 'IGD'])('no longer offers %s', (code) => {
    expect(get(code)).toBeUndefined()
  })
})

describe('August 4 price list — catalogue size', () => {
  it('carries every priced row from the Updated Pricelist sheet', () => {
    expect(products).toHaveLength(181)
  })
})
