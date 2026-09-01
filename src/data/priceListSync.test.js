import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { products } from './products'

/**
 * Journey: As the shop owner, I want the price list I upload to reach the live
 * site, so that customers are quoted the August 25 prices rather than the ones
 * seeded back in August 4.
 *
 * The calculator reads Supabase and falls back to the bundled catalogue, so a
 * sync that updates only src/data/products.js would leave every customer who
 * reaches Supabase -- which is all of them, when it is up -- on stale prices.
 * These tests hold the migration and the bundled catalogue to the same numbers.
 */

const PATH = 'supabase/migrations/0005_sync_august_25_pricelist.sql'

/**
 * Migrations that decide what the products table ends up holding, in the order
 * Postgres applies them. The guarantee below is not "0005 alone matches the
 * bundled catalogue" -- it is "what Supabase ends up holding matches it" -- so a
 * later dated migration adding SKUs has to be read too, with later files winning
 * on a shared code exactly as their upserts do.
 */
const CATALOGUE = [PATH, 'supabase/migrations/0006_add_september_1_skus.sql']

describe('August 25 Supabase sync migration', () => {
  it('exists, so the live catalogue is updated and not just the fallback', () => {
    expect(existsSync(PATH)).toBe(true)
  })

  const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '')
  const sql = read(PATH)

  const unquote = (v) => (v === 'null' ? null : v.slice(1, -1).replace(/''/g, "'"))

  /** Row shape: ('CODE', 'name', spec, price, 'stock', category) */
  const parse = (source) =>
    [...source.matchAll(
      /^\s*\('((?:[^']|'')*)',\s*'(?:[^']|'')*',\s*(null|'(?:[^']|'')*'),\s*([\d.]+),\s*'(in|low|out|unknown)'\s*(?:,[^)]*)?\)/gm
    )].map((m) => [
      m[1].replace(/''/g, "'"),
      { spec: unquote(m[2]), vial: Number(m[3]), stock: m[4] },
    ])

  const rows = new Map(CATALOGUE.flatMap((file) => parse(read(file))))

  it('carries every product in the bundled catalogue', () => {
    const missing = products.filter((p) => !rows.has(p.code)).map((p) => p.code)

    expect(missing).toEqual([])
  })

  it('carries no product the bundled catalogue does not have', () => {
    const codes = new Set(products.map((p) => p.code))
    const extra = [...rows.keys()].filter((code) => !codes.has(code))

    expect(extra).toEqual([])
  })

  it('quotes the same price as the bundled catalogue for every product', () => {
    const mismatched = products
      .filter((p) => rows.get(p.code)?.vial !== p.vial)
      .map((p) => ({ code: p.code, bundled: p.vial, migration: rows.get(p.code)?.vial }))

    expect(mismatched).toEqual([])
  })

  it('carries the same stock state as the bundled catalogue', () => {
    const mismatched = products
      .filter((p) => rows.get(p.code)?.stock !== p.stock)
      .map((p) => ({ code: p.code, bundled: p.stock, migration: rows.get(p.code)?.stock }))

    expect(mismatched).toEqual([])
  })

  it('carries the same spec as the bundled catalogue', () => {
    const mismatched = products
      .filter((p) => rows.get(p.code)?.spec !== p.spec)
      .map((p) => ({ code: p.code, bundled: p.spec, migration: rows.get(p.code)?.spec }))

    expect(mismatched).toEqual([])
  })

  it('updates existing rows rather than skipping them on conflict', () => {
    // 0002 seeded with DO NOTHING so a re-run could not clobber owner edits.
    // A price sync is the opposite intent: it must overwrite.
    expect(sql).toMatch(/on conflict\s*\(code\)\s*do update/i)
    expect(sql).not.toMatch(/on conflict\s*\(code\)\s*do nothing/i)
  })

  it('refreshes updated_at so the sync is auditable in the table', () => {
    expect(sql).toMatch(/updated_at\s*=\s*now\(\)/i)
  })
})
