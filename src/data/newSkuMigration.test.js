import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { products } from './products'

/**
 * Journey: As the shop owner, I want the five SG11-SG15 skincare SKUs from the
 * latest price list on the live site, so that a customer can be quoted them
 * without me typing each one into the admin page.
 *
 * The calculator reads Supabase and only falls back to the bundled catalogue,
 * so adding a SKU to src/data/products.js alone would leave it invisible to
 * every customer who reaches Supabase. These tests hold the new migration and
 * the bundled catalogue to the same five rows.
 *
 * Specs come from the packaging column of the sheet, not the sales copy, with
 * the sheet's "Contains" / "Set Contains" lead-in dropped -- that is chrome for
 * a human reading a spreadsheet, not part of what is in the box.
 *
 * Stock is 'unknown' for all five: the sheet's stock columns are blank for
 * these rows, and guessing 'in' would quote a customer something unstocked.
 */

const PATH = 'supabase/migrations/0006_add_september_1_skus.sql'

/** The price list, transcribed. This list is the specification. */
const NEW_SKUS = [
  { code: 'SG11', name: 'PDRN Peptide Eye Patches', spec: '30 pairs / 85 grams', vial: 499, stock: 'unknown' },
  { code: 'SG12', name: 'Dark Spot Brightening Cream', spec: '35 mL Tube', vial: 499, stock: 'unknown' },
  { code: 'SG13', name: 'Rejuvenating Solution Serum', spec: '10ml x 5 vials', vial: 699, stock: 'unknown' },
  { code: 'SG14', name: 'Microbiome Radiance Ampoule', spec: '7ml x 5 Ampoules', vial: 649, stock: 'unknown' },
  { code: 'SG15', name: 'Kojic Acid Brightening Cream', spec: '50.7grams tube', vial: 499, stock: 'unknown' },
]

describe('September 1 new-SKU migration', () => {
  it('exists, so the new products reach the live catalogue and not just the fallback', () => {
    expect(existsSync(PATH)).toBe(true)
  })

  const sql = existsSync(PATH) ? readFileSync(PATH, 'utf8') : ''

  const unquote = (v) => (v === 'null' ? null : v.slice(1, -1).replace(/''/g, "'"))

  /** Row shape: ('CODE', 'name', spec, price, 'stock', category) */
  const rows = new Map(
    [...sql.matchAll(
      /^\s*\('((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(null|'(?:[^']|'')*'),\s*([\d.]+),\s*'(in|low|out|unknown)'\s*(?:,[^)]*)?\)/gm
    )].map((m) => [
      m[1].replace(/''/g, "'"),
      { name: m[2].replace(/''/g, "'"), spec: unquote(m[3]), vial: Number(m[4]), stock: m[5] },
    ])
  )

  it('carries every new SKU from the price list', () => {
    const missing = NEW_SKUS.filter((p) => !rows.has(p.code)).map((p) => p.code)

    expect(missing).toEqual([])
  })

  it('carries nothing beyond the five new SKUs, so no existing price is touched', () => {
    const codes = new Set(NEW_SKUS.map((p) => p.code))
    const extra = [...rows.keys()].filter((code) => !codes.has(code))

    expect(extra).toEqual([])
  })

  it('quotes the price list name, spec, price and stock for each new SKU', () => {
    const mismatched = NEW_SKUS.filter((p) => {
      const row = rows.get(p.code)
      return (
        row?.name !== p.name ||
        row?.spec !== p.spec ||
        row?.vial !== p.vial ||
        row?.stock !== p.stock
      )
    }).map((p) => ({ code: p.code, expected: p, migration: rows.get(p.code) ?? null }))

    expect(mismatched).toEqual([])
  })

  it('adds the same five SKUs to the bundled catalogue, so the fallback agrees', () => {
    const bundled = new Map(products.map((p) => [p.code, p]))
    const mismatched = NEW_SKUS.filter((p) => {
      const row = bundled.get(p.code)
      return (
        row?.name !== p.name ||
        row?.spec !== p.spec ||
        row?.vial !== p.vial ||
        row?.stock !== p.stock
      )
    }).map((p) => ({ code: p.code, expected: p, bundled: bundled.get(p.code) ?? null }))

    expect(mismatched).toEqual([])
  })

  it('updates existing rows rather than skipping them, so a re-run corrects a typo', () => {
    expect(sql).toMatch(/on conflict\s*\(code\)\s*do update/i)
    expect(sql).not.toMatch(/on conflict\s*\(code\)\s*do nothing/i)
  })

  it('refreshes updated_at so the addition is auditable in the table', () => {
    expect(sql).toMatch(/updated_at\s*=\s*now\(\)/i)
  })
})
