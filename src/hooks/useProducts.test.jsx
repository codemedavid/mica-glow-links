import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts } from './useProducts'

/**
 * Journey: As a customer, I want the calculator to be usable the instant it
 * opens and to quietly upgrade to live prices, so that a slow or broken
 * database never leaves me staring at an empty catalogue.
 *
 * This is stale-while-revalidate: the bundled price list renders first, then
 * Supabase replaces it if the fetch succeeds.
 */

const FALLBACK = [
  { code: 'FB1', name: 'Bundled product', spec: null, vial: 100, stock: 'in' },
]

const LIVE_ROW = {
  code: 'TR5',
  name: 'Tirzepatide',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 999,
  stock: 'in',
}

const clientReturning = (result) => ({
  from: () => ({ select: () => Promise.resolve(result) }),
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useProducts — first paint', () => {
  it('serves the bundled catalogue synchronously, before any request resolves', async () => {
    const client = clientReturning({ data: [LIVE_ROW], error: null })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    expect(result.current.products).toEqual(FALLBACK)
    expect(result.current.source).toBe('fallback')

    // Let the in-flight revalidation settle so it lands inside act().
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('reports that it is revalidating on first paint', async () => {
    const client = clientReturning({ data: [LIVE_ROW], error: null })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })
})

describe('useProducts — upgrading to live prices', () => {
  it('replaces the bundled catalogue with Supabase rows once they arrive', async () => {
    const client = clientReturning({ data: [LIVE_ROW], error: null })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    await waitFor(() => expect(result.current.source).toBe('supabase'))
    expect(result.current.products).toEqual([
      {
        code: 'TR5',
        name: 'Tirzepatide',
        spec: '5 mg/vial, 10 vials/kits',
        vial: 999,
        stock: 'in',
      },
    ])
  })

  it('stops reporting loading once the request settles', async () => {
    const client = clientReturning({ data: [LIVE_ROW], error: null })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })
})

describe('useProducts — when Supabase fails', () => {
  it('keeps showing the bundled catalogue', async () => {
    const client = clientReturning({ data: null, error: { message: 'permission denied' } })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.products).toEqual(FALLBACK)
    expect(result.current.source).toBe('fallback')
  })

  it('exposes the failure reason rather than swallowing it', async () => {
    const client = clientReturning({ data: null, error: { message: 'permission denied' } })

    const { result } = renderHook(() => useProducts({ client, fallback: FALLBACK }))

    await waitFor(() => expect(result.current.error).toMatch(/permission denied/))
  })

  it('serves the bundled catalogue when Supabase is not configured', async () => {
    const { result } = renderHook(() => useProducts({ client: null, fallback: FALLBACK }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.products).toEqual(FALLBACK)
    expect(result.current.error).toBeNull()
  })
})

describe('useProducts — unmounting mid-flight', () => {
  it('does not set state after unmount, so React logs no update warning', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let release
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const client = { from: () => ({ select: () => pending }) }

    const { unmount } = renderHook(() => useProducts({ client, fallback: FALLBACK }))
    unmount()
    release({ data: [LIVE_ROW], error: null })
    await pending

    expect(consoleError).not.toHaveBeenCalled()
  })
})
