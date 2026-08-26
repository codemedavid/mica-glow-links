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

  // Superseded on the 8/25 sheet: see "stock the sheet now states outright".
  it('does not infer FR5 stock from its price cell', () => {
    expect(get('FR5').vial).toBe(741)
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

/**
 * Journey: As a customer, I want to search the August 25 price list and add a
 * newly released item to my order, so that I can see what it will cost me
 * before I message the shop.
 *
 * Source of truth: "Mica - Pricelist 8_25_25.xlsx", sheet "Updated Pricelist".
 */
describe('August 25 price list — newly listed products', () => {
  it.each([
    ['SP01', 399, /sponge spicule/i],
    ['DC01', 749, /deep collagen/i],
    ['KN01', 749, /kojic acid/i],
    ['PV01', 749, /pdrn pink vitamin/i],
    ['GS01', 899, /glutathione serum/i],
    ['SC01', 899, /stem cell culture/i],
    ['NBG60 mm', 549, /biotin gummies/i],
    ['ORALGTT', 599, /liposomal glutathione/i],
    ['ASMB', 190, /blue algae/i],
    ['ASMBE', 480, /enhanced blue algae/i],
    ['ASMBN', 250, /brown algae/i],
    ['ASMG', 120, /green algae/i],
    ['ASMPNK', 250, /pink algae/i],
    ['ASMW', 250, /white algae/i],
    ['ASMBLK', 250, /black algae/i],
  ])('lists %s at PHP %d per unit', (code, vial, name) => {
    expect(get(code)).toMatchObject({ code, vial })
    expect(get(code).name).toMatch(name)
  })
})

describe('August 25 price list — specs describe packaging, not marketing', () => {
  it.each([
    ['NBG60 mm', '60 gummies | Good for 1 month'],
    ['ORALGTT', '60 mL | 2,000 mg Glutathione'],
  ])('describes %s by what is in the box', (code, spec) => {
    expect(get(code).spec).toBe(spec)
  })

  it('leaves no sales copy in any spec', () => {
    const salesy = /blueberry|no pinning needed|daily routine|💜/i
    const bad = products.filter((p) => p.spec && salesy.test(p.spec))

    expect(bad).toEqual([])
  })
})

describe('August 25 price list — repriced products', () => {
  it.each([
    ['PDRNSerum', 345],
    ['EXO30', 999],
    ['HA5', 585],
  ])('drops %s to PHP %d', (code, vial) => {
    expect(get(code).vial).toBe(vial)
  })
})

/**
 * The August ruling was that FR5's "OUT OF STOCK" text sat in the per-vial
 * price column, which says nothing about availability. On the 8/25 sheet the
 * on-hand column itself reads OUT, so the stock value is now supported.
 */
describe('August 25 price list — stock the sheet now states outright', () => {
  it.each([
    ['FR5', 'out'],
    ['BA3PHRMAGREEN', 'out'],
    ['BA10PHRMAGREEN', 'out'],
  ])('marks %s as %s', (code, stock) => {
    expect(get(code).stock).toBe(stock)
  })

  it.each([
    'TMB-GHKCU-SH250',
    'TMB-GHKCND-CND250',
    'TMB-AHKM100',
    'TMB-NGO15',
    'TMB-GHKSER30',
    'RETALIDE',
    'MICABLEND 3.0',
    'EXO30',
  ])('marks %s in stock, as the on-hand column reports', (code) => {
    expect(get(code).stock).toBe('in')
  })

  it.each([
    ['TR100', 'low'],
    ['RT60', 'low'],
    ['MICABLEND 2.0', 'low'],
  ])('treats an explicit small count on %s as %s stock', (code, stock) => {
    expect(get(code).stock).toBe(stock)
  })

  it('leaves to-order-basis items unknown rather than claiming stock', () => {
    expect(get('DHA20').stock).toBe('unknown')
  })
})

describe('August 25 price list — catalogue size', () => {
  it('carries every priced row from the Updated Pricelist sheet', () => {
    expect(products).toHaveLength(196)
  })

  it('lists RETALIDE once, though the sheet repeats it in two sections', () => {
    expect(products.filter((p) => p.code === 'RETALIDE')).toHaveLength(1)
  })
})
