import { describe, it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAdminProducts } from './useAdminProducts'

/**
 * Journeys:
 *  - As the shop owner, I want the price list I am editing to show what the
 *    database really holds, so that I never edit a stale copy.
 *  - As the shop owner, I want a saved change to appear in the list at once,
 *    so that I can see the edit landed without reloading the page.
 *
 * The hook owns list state and reconciles it after each write. The repository
 * below it owns the column names; the card above it owns the markup.
 */

const ROW = {
  code: 'TR5',
  name: 'Tirzepatide',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 422.5,
  stock: 'low',
}

/** In-memory `products` table wired through the supabase-js call shapes. */
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

const clientRefusing = (message) => ({
  from: () => ({
    select: () => Promise.resolve({ data: null, error: { message } }),
    upsert: () => Promise.resolve({ error: { message } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
  }),
})

const mount = (client) => renderHook(() => useAdminProducts({ client }))

describe('useAdminProducts — loading the list', () => {
  it('starts loading and finishes with the table contents', async () => {
    const { result } = mount(fakeTable([ROW]))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.products).toEqual([
      {
        code: 'TR5',
        name: 'Tirzepatide',
        spec: '5 mg/vial, 10 vials/kits',
        vial: 422.5,
        stock: 'low',
      },
    ])
  })

  it('reports a read failure instead of showing an empty list as if it were the truth', async () => {
    const { result } = mount(clientRefusing('permission denied'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toMatch(/permission denied/)
  })
})

describe('useAdminProducts — saving', () => {
  it('shows the new price in the list straight after saving', async () => {
    const { result } = mount(fakeTable([ROW]))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.save({ ...ROW, vial: 999, spec: ROW.spec })
    })

    expect(result.current.products[0].vial).toBe(999)
  })

  it('adds a brand-new product to the list without a reload', async () => {
    const { result } = mount(fakeTable([ROW]))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.save({ code: 'AAA1', name: 'Adamax', vial: 500, stock: 'in' })
    })

    // Re-sorted by name, so Adamax lands before Tirzepatide.
    expect(result.current.products.map((product) => product.code)).toEqual(['AAA1', 'TR5'])
  })

  it('leaves the list untouched and reports why when the save is refused', async () => {
    const { result } = mount(clientRefusing('new row violates row-level security policy'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let outcome
    await act(async () => {
      outcome = await result.current.save({ code: 'TR5', name: 'Tirzepatide', vial: 999 })
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.error).toMatch(/row-level security/)
    expect(result.current.products).toEqual([])
  })
})

describe('useAdminProducts — stock and removal', () => {
  it('switches a product to out of stock in the list', async () => {
    const { result } = mount(fakeTable([ROW]))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setStock('TR5', 'out')
    })

    expect(result.current.products[0].stock).toBe('out')
  })

  it('drops a removed product from the list', async () => {
    const { result } = mount(fakeTable([ROW, { ...ROW, code: 'TR10' }]))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.remove('TR5')
    })

    expect(result.current.products.map((product) => product.code)).toEqual(['TR10'])
  })

  it('keeps a product that the repository refused to delete', async () => {
    const { result } = mount(fakeTable([ROW]))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let outcome
    await act(async () => {
      outcome = await result.current.remove('   ')
    })

    expect(outcome.ok).toBe(false)
    expect(result.current.products).toHaveLength(1)
  })
})
