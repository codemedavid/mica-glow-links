import { useEffect, useState } from 'react'
import { fetchShippingFee, DEFAULT_SHIPPING_FEE } from '../data/settingsRepository'
import { createSupabaseClient } from '../lib/supabase'

/**
 * Stale-while-revalidate over the shipping fee, mirroring useProducts: the
 * default compiled into the build renders on the first paint, then Supabase
 * replaces it if the fetch succeeds. The calculator therefore never shows a
 * blank shipping row and never blocks on the network.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {number} [options.fallback]
 */
export function useShippingFee({
  client = createSupabaseClient(),
  fallback = DEFAULT_SHIPPING_FEE,
} = {}) {
  const [state, setState] = useState({
    amount: fallback,
    source: 'fallback',
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    let active = true

    fetchShippingFee({ client, fallback }).then((result) => {
      if (active) setState({ ...result, isLoading: false })
    })

    return () => {
      active = false
    }
  }, [client, fallback])

  return state
}
