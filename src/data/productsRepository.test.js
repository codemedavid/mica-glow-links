import { describe, it, expect } from 'vitest'
import {
  normalizeProductRow,
  normalizeProductInput,
  fetchProducts,
  listProducts,
  saveProduct,
  setProductStock,
  deleteProduct,
} from './productsRepository'
import { products as staticProducts } from './products'

/**
 * Journeys:
 *  - As the shop owner, I want to update prices in Supabase and have the
 *    calculator pick them up without a redeploy.
 *  - As a customer, I want the calculator to work even if Supabase is down,
 *    so that I always get a quote.
 *  - As the shop owner, I want to edit prices, stock and the product list from
 *    the admin page, so that the catalogue is not frozen into the build.
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
    const { spec: _spec, ...withoutSpec } = ROW

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
    const { stock: _stock, ...withoutStock } = ROW

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

// ---------------------------------------------------------------------------
// Admin-side reads and writes
// ---------------------------------------------------------------------------

/**
 * An in-memory stand-in for the `products` table, wired through the same
 * supabase-js call shapes the repository uses. Because reads and writes share
 * one array, a test can prove that what the admin page saves is exactly what
 * the order calculator later reads — the whole point of the feature.
 */
const fakeTable = (seed = []) => {
  let rows = seed.map((row) => ({ ...row }))

  return {
    rows: () => rows.map((row) => ({ ...row })),
    from: () => ({
      select: () => Promise.resolve({ data: rows.map((row) => ({ ...row })), error: null }),
      upsert: (row) => {
        rows = [...rows.filter((existing) => existing.code !== row.code), { ...row }]
        return Promise.resolve({ error: null })
      },
      update: (patch) => ({
        eq: (_column, value) => {
          rows = rows.map((row) => (row.code === value ? { ...row, ...patch } : row))
          return Promise.resolve({ error: null })
        },
      }),
      delete: () => ({
        eq: (_column, value) => {
          rows = rows.filter((row) => row.code !== value)
          return Promise.resolve({ error: null })
        },
      }),
    }),
  }
}

/** A client whose every write is refused, as row-level security would refuse it. */
const clientRefusing = (message) => ({
  from: () => ({
    select: () => Promise.resolve({ data: null, error: { message } }),
    upsert: () => Promise.resolve({ error: { message } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
  }),
})

describe('normalizeProductInput — validating what the owner typed', () => {
  const INPUT = { code: 'NEW1', name: 'New peptide', spec: '5 mg/vial', vial: 500, stock: 'in' }

  it('maps the app-facing vial field back to the vial_price column', () => {
    expect(normalizeProductInput(INPUT).row).toEqual({
      code: 'NEW1',
      name: 'New peptide',
      spec: '5 mg/vial',
      vial_price: 500,
      stock: 'in',
    })
  })

  it('accepts a price typed into a text field as a string', () => {
    expect(normalizeProductInput({ ...INPUT, vial: '422.50' }).row.vial_price).toBe(422.5)
  })

  it('trims the code and name the owner typed', () => {
    const result = normalizeProductInput({ ...INPUT, code: ' NEW1 ', name: ' New peptide ' })

    expect(result.row).toMatchObject({ code: 'NEW1', name: 'New peptide' })
  })

  it('stores a blank spec as null rather than an empty string', () => {
    expect(normalizeProductInput({ ...INPUT, spec: '  ' }).row.spec).toBeNull()
  })

  it('defaults a missing stock state to unknown rather than rejecting the product', () => {
    const { stock: _stock, ...withoutStock } = INPUT

    expect(normalizeProductInput(withoutStock).row.stock).toBe('unknown')
  })

  it('explains a missing code instead of writing a row with no primary key', () => {
    const result = normalizeProductInput({ ...INPUT, code: '   ' })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/code/i)
  })

  it('explains a missing name instead of writing a blank row', () => {
    const result = normalizeProductInput({ ...INPUT, name: '' })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/name/i)
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['blank', ''],
    ['not a number', 'free'],
  ])('explains a %s price, which the database check constraint would reject anyway', (_l, vial) => {
    const result = normalizeProductInput({ ...INPUT, vial })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/price/i)
  })
})

describe('listProducts — the exact table, for editing', () => {
  it('returns the catalogue sorted by name then code, as the calculator shows it', async () => {
    const client = fakeTable([
      { code: 'TR10', name: 'Tirzepatide', spec: null, vial_price: 520, stock: 'low' },
      { code: 'BC5', name: 'BPC-157', spec: null, vial_price: 429, stock: 'in' },
      { code: 'TR5', name: 'Tirzepatide', spec: null, vial_price: 422.5, stock: 'low' },
    ])

    const result = await listProducts({ client })

    expect(result.products.map((product) => product.code)).toEqual(['BC5', 'TR10', 'TR5'])
  })

  it('reports an empty table as empty, so the owner is not shown bundled prices they cannot edit', async () => {
    const result = await listProducts({ client: fakeTable([]) })

    expect(result.products).toEqual([])
    expect(result.error).toBeNull()
  })

  it('surfaces a read error rather than pretending the catalogue is empty', async () => {
    const result = await listProducts({ client: clientRefusing('permission denied') })

    expect(result.error).toMatch(/permission denied/)
  })

  it('asks for a sign-in when there is no client at all', async () => {
    const result = await listProducts({ client: null })

    expect(result.products).toEqual([])
    expect(result.error).toMatch(/sign in/i)
  })
})

describe('saveProduct — changing a price', () => {
  it('writes the new price under the existing code', async () => {
    const client = fakeTable([{ ...ROW }])

    const result = await saveProduct({ ...ROW, vial: 999, spec: ROW.spec }, { client })

    expect(result.ok).toBe(true)
    expect(client.rows()).toEqual([expect.objectContaining({ code: 'TR5', vial_price: 999 })])
  })

  it('returns the saved product in the shape the calculator speaks', async () => {
    const client = fakeTable([])

    const result = await saveProduct(
      { code: 'NEW1', name: 'New peptide', spec: null, vial: 500, stock: 'in' },
      { client }
    )

    expect(result.product).toEqual({
      code: 'NEW1',
      name: 'New peptide',
      spec: null,
      vial: 500,
      stock: 'in',
    })
  })

  it('adds a product the table has never seen', async () => {
    const client = fakeTable([{ ...ROW }])

    await saveProduct({ code: 'NEW1', name: 'New peptide', vial: 500, stock: 'in' }, { client })

    expect(client.rows()).toHaveLength(2)
  })

  it('refuses an invalid price without touching the database', async () => {
    const client = fakeTable([{ ...ROW }])

    const result = await saveProduct({ ...ROW, vial: 0 }, { client })

    expect(result.ok).toBe(false)
    expect(client.rows()).toEqual([expect.objectContaining({ vial_price: 422.5 })])
  })

  it('surfaces a row-level-security rejection instead of reporting success', async () => {
    const result = await saveProduct(
      { code: 'TR5', name: 'Tirzepatide', vial: 500 },
      { client: clientRefusing('new row violates row-level security policy') }
    )

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/row-level security/)
  })

  it('asks for a sign-in when there is no client at all', async () => {
    const result = await saveProduct({ code: 'TR5', name: 'Tirzepatide', vial: 500 }, {})

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign in/i)
  })
})

describe('setProductStock — the stock switch', () => {
  it.each(['in', 'low', 'out', 'unknown'])('writes the %s state against the product code', async (stock) => {
    const client = fakeTable([{ ...ROW }])

    const result = await setProductStock('TR5', stock, { client })

    expect(result.ok).toBe(true)
    expect(client.rows()[0].stock).toBe(stock)
  })

  it('leaves the price untouched when only stock changes', async () => {
    const client = fakeTable([{ ...ROW }])

    await setProductStock('TR5', 'out', { client })

    expect(client.rows()[0].vial_price).toBe(422.5)
  })

  it('refuses a state the database check constraint would reject', async () => {
    const client = fakeTable([{ ...ROW }])

    const result = await setProductStock('TR5', 'backordered', { client })

    expect(result.ok).toBe(false)
    expect(client.rows()[0].stock).toBe('low')
  })

  it('surfaces a row-level-security rejection', async () => {
    const result = await setProductStock('TR5', 'out', {
      client: clientRefusing('new row violates row-level security policy'),
    })

    expect(result.error).toMatch(/row-level security/)
  })
})

describe('deleteProduct — retiring a product', () => {
  it('removes only the product asked for', async () => {
    const client = fakeTable([{ ...ROW }, { ...ROW, code: 'TR10' }])

    const result = await deleteProduct('TR5', { client })

    expect(result.ok).toBe(true)
    expect(client.rows().map((row) => row.code)).toEqual(['TR10'])
  })

  it('refuses a blank code rather than issuing an unfiltered delete', async () => {
    const client = fakeTable([{ ...ROW }])

    const result = await deleteProduct('  ', { client })

    expect(result.ok).toBe(false)
    expect(client.rows()).toHaveLength(1)
  })

  it('surfaces a row-level-security rejection', async () => {
    const result = await deleteProduct('TR5', {
      client: clientRefusing('new row violates row-level security policy'),
    })

    expect(result.error).toMatch(/row-level security/)
  })
})

describe('admin writes when the network itself fails', () => {
  /** Rejects rather than resolving with an error, as a dropped connection does. */
  const clientThatRejects = () => ({
    from: () => ({
      select: () => Promise.reject(new Error('fetch failed')),
      upsert: () => Promise.reject(new Error('fetch failed')),
      update: () => ({ eq: () => Promise.reject(new Error('fetch failed')) }),
      delete: () => ({ eq: () => Promise.reject(new Error('fetch failed')) }),
    }),
  })

  it('reports a failed read rather than throwing at the admin page', async () => {
    const result = await listProducts({ client: clientThatRejects() })

    expect(result.products).toEqual([])
    expect(result.error).toMatch(/fetch failed/)
  })

  it('reports a failed save rather than throwing', async () => {
    const result = await saveProduct(
      { code: 'TR5', name: 'Tirzepatide', vial: 500 },
      { client: clientThatRejects() }
    )

    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/fetch failed/) })
  })

  it('reports a failed stock change rather than throwing', async () => {
    const result = await setProductStock('TR5', 'out', { client: clientThatRejects() })

    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/fetch failed/) })
  })

  it('reports a failed delete rather than throwing', async () => {
    const result = await deleteProduct('TR5', { client: clientThatRejects() })

    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/fetch failed/) })
  })
})

describe('the admin page and the order calculator share one table', () => {
  it('quotes the price the admin page just saved', async () => {
    const client = fakeTable([{ ...ROW }])

    await saveProduct({ ...ROW, vial: 777 }, { client })
    const { products } = await fetchProducts({ client, fallback: FALLBACK })

    expect(products.find((product) => product.code === 'TR5').vial).toBe(777)
  })

  it('offers a product the admin page just added', async () => {
    const client = fakeTable([{ ...ROW }])

    await saveProduct({ code: 'NEW1', name: 'New peptide', vial: 500, stock: 'in' }, { client })
    const { products } = await fetchProducts({ client, fallback: FALLBACK })

    expect(products.map((product) => product.code)).toContain('NEW1')
  })

  it('stops offering a product the admin page removed', async () => {
    const client = fakeTable([{ ...ROW }, { ...ROW, code: 'TR10' }])

    await deleteProduct('TR5', { client })
    const { products } = await fetchProducts({ client, fallback: FALLBACK })

    expect(products.map((product) => product.code)).toEqual(['TR10'])
  })

  it('shows the stock state the admin page switched', async () => {
    const client = fakeTable([{ ...ROW }])

    await setProductStock('TR5', 'out', { client })
    const { products } = await fetchProducts({ client, fallback: FALLBACK })

    expect(products[0].stock).toBe('out')
  })
})
