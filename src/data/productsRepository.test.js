import { describe, it, expect } from 'vitest'
import { normalizeProductRow, fetchProducts } from './productsRepository'
import { products as staticProducts } from './products'

/**
 * Journeys:
 *  - As the shop owner, I want to update prices in Supabase and have the
 *    calculator pick them up without a redeploy.
 *  - As a customer, I want the calculator to work even if Supabase is down,
 *    so that I always get a quote.
 *
 * The repository is the only place that knows the database column names.
 * Everything above it speaks the existing Product shape from products.js.
 */

const ROW = {
  code: 'TR5',
  name: 'Tirzepatide',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 422.5,
  stock: 'low',
}

/** Minimal stand-in for the supabase-js query builder we actually use. */
const clientReturning = (result) => ({
  from: () => ({ select: () => Promise.resolve(result) }),
})

const clientThatThrows = (error) => ({
  from: () => ({ select: () => Promise.reject(error) }),
})

const FALLBACK = [
  { code: 'FB1', name: 'Fallback product', spec: null, vial: 100, stock: 'in' },
]

describe('normalizeProductRow — column mapping', () => {
  it('renames vial_price to the vial field the app already uses', () => {
    expect(normalizeProductRow(ROW)).toEqual({
      code: 'TR5',
      name: 'Tirzepatide',
      spec: '5 mg/vial, 10 vials/kits',
      vial: 422.5,
      stock: 'low',
    })
  })

  it('produces exactly the five Product fields and nothing else', () => {
    expect(Object.keys(normalizeProductRow(ROW)).sort()).toEqual(
      ['code', 'name', 'spec', 'stock', 'vial'].sort()
    )
  })

  it('ignores extra database columns such as ids and timestamps', () => {
    const row = { ...ROW, id: 7, updated_at: '2026-08-08T00:00:00Z' }

    expect(normalizeProductRow(row)).not.toHaveProperty('id')
    expect(normalizeProductRow(row)).not.toHaveProperty('updated_at')
  })

  it('accepts a numeric price serialized as a string, as PostgREST may send it', () => {
    expect(normalizeProductRow({ ...ROW, vial_price: '422.50' }).vial).toBe(422.5)
  })

  it('trims whitespace off code and name', () => {
    const row = { ...ROW, code: '  TR5 ', name: ' Tirzepatide\n' }

    expect(normalizeProductRow(row)).toMatchObject({ code: 'TR5', name: 'Tirzepatide' })
  })

  it('turns a blank spec into null rather than an empty string', () => {
    expect(normalizeProductRow({ ...ROW, spec: '   ' }).spec).toBeNull()
  })

  it('turns a missing spec into null, never undefined', () => {
    const { spec, ...withoutSpec } = ROW

    expect(normalizeProductRow(withoutSpec).spec).toBeNull()
  })
})

describe('normalizeProductRow — rejecting unusable rows', () => {
  it('rejects a null or undefined row', () => {
    expect(normalizeProductRow(null)).toBeNull()
    expect(normalizeProductRow(undefined)).toBeNull()
  })

  it('rejects a row with no code, which could not be added to a cart', () => {
    expect(normalizeProductRow({ ...ROW, code: '  ' })).toBeNull()
  })

  it('rejects a row with no name, which would render as a blank result', () => {
    expect(normalizeProductRow({ ...ROW, name: '' })).toBeNull()
  })

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['not a number', 'free'],
    ['null', null],
    ['infinite', Infinity],
  ])('rejects a %s price rather than quoting it', (_label, vial_price) => {
    expect(normalizeProductRow({ ...ROW, vial_price })).toBeNull()
  })
})

describe('normalizeProductRow — stock states', () => {
  it.each(['in', 'low', 'out', 'unknown'])('preserves the known %s state', (stock) => {
    expect(normalizeProductRow({ ...ROW, stock }).stock).toBe(stock)
  })

  it('downgrades an unrecognised stock state to unknown, keeping the price usable', () => {
    expect(normalizeProductRow({ ...ROW, stock: 'backordered' }).stock).toBe('unknown')
  })

  it('treats a missing stock state as unknown', () => {
    const { stock, ...withoutStock } = ROW

    expect(normalizeProductRow(withoutStock).stock).toBe('unknown')
  })

  it('matches stock states case-insensitively', () => {
    expect(normalizeProductRow({ ...ROW, stock: 'IN' }).stock).toBe('in')
  })
})

describe('fetchProducts — serving live prices', () => {
  it('returns normalized supabase rows and reports supabase as the source', async () => {
    const client = clientReturning({ data: [ROW], error: null })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.source).toBe('supabase')
    expect(result.products).toEqual([
      {
        code: 'TR5',
        name: 'Tirzepatide',
        spec: '5 mg/vial, 10 vials/kits',
        vial: 422.5,
        stock: 'low',
      },
    ])
  })

  it('keeps the good rows and drops only the unusable ones', async () => {
    const client = clientReturning({
      data: [ROW, { ...ROW, code: 'BAD', vial_price: 0 }],
      error: null,
    })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.products).toHaveLength(1)
    expect(result.products[0].code).toBe('TR5')
  })
})

describe('fetchProducts — degrading to the bundled price list', () => {
  it('falls back when Supabase is not configured at all', async () => {
    const result = await fetchProducts({ client: null, fallback: FALLBACK })

    expect(result).toMatchObject({ products: FALLBACK, source: 'fallback' })
  })

  it('falls back when Supabase returns an error', async () => {
    const client = clientReturning({ data: null, error: { message: 'relation does not exist' } })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.source).toBe('fallback')
    expect(result.products).toEqual(FALLBACK)
  })

  it('falls back when the request rejects, e.g. the network is down', async () => {
    const client = clientThatThrows(new Error('fetch failed'))

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.source).toBe('fallback')
    expect(result.products).toEqual(FALLBACK)
  })

  it('falls back when the table is empty, so an unseeded database cannot blank the calculator', async () => {
    const client = clientReturning({ data: [], error: null })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.source).toBe('fallback')
    expect(result.products).toEqual(FALLBACK)
  })

  it('falls back when every returned row is unusable', async () => {
    const client = clientReturning({ data: [{ code: '', name: '' }], error: null })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.source).toBe('fallback')
  })

  it('reports an error reason on fallback so the cause is not swallowed silently', async () => {
    const client = clientReturning({ data: null, error: { message: 'relation does not exist' } })

    const result = await fetchProducts({ client, fallback: FALLBACK })

    expect(result.error).toMatch(/relation does not exist/)
  })

  it('reports no error when it falls back purely because Supabase is absent', async () => {
    const result = await fetchProducts({ client: null, fallback: FALLBACK })

    expect(result.error).toBeNull()
  })

  it('defaults to the bundled catalogue when no fallback is supplied', async () => {
    const result = await fetchProducts({ client: null })

    expect(result.products).toBe(staticProducts)
  })

  it('never mutates the fallback array it was handed', async () => {
    const fallback = [...FALLBACK]
    const client = clientReturning({ data: [ROW], error: null })

    await fetchProducts({ client, fallback })

    expect(fallback).toEqual(FALLBACK)
  })
})
