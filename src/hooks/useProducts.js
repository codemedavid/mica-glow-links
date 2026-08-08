import { useEffect, useState } from 'react'
import { fetchProducts } from '../data/productsRepository'
import { products as bundledProducts } from '../data/products'
import { createSupabaseClient } from '../lib/supabase'

/**
 * Stale-while-revalidate over the product catalogue: the catalogue bundled
 * into the build renders on the first paint, then Supabase replaces it if the
 * fetch succeeds. The calculator is therefore never empty and never blocks.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {readonly import('../data/products').Product[]} [options.fallback]
 */
export function useProducts({ client = createSupabaseClient(), fallback = bundledProducts } = {}) {
  const [state, setState] = useState({
    products: fallback,
    source: 'fallback',
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    let active = true

    fetchProducts({ client, fallback }).then((result) => {
      if (active) setState({ ...result, isLoading: false })
    })

    return () => {
      active = false
    }
  }, [client, fallback])

  return state
}
