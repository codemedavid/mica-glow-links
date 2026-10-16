import { useEffect, useState } from 'react'
import { fetchTutorialVideos } from '../data/videosRepository'
import { tutorials } from '../data/tutorials'
import { createSupabaseClient } from '../lib/supabase'

/**
 * The tutorial list customers see.
 *
 * Unlike the shipping fee, the bundled list is not painted first: once the
 * owner has published their own videos, flashing six "Coming soon" cards and
 * then swapping them out reads as a glitch. The page shows a skeleton for the
 * one short read instead. With no Supabase configured there is nothing to
 * wait for, so the bundled list renders immediately.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {{ videos: readonly import('../data/tutorials').Tutorial[], isLoading: boolean }}
 */
export function useTutorialVideos({ client = createSupabaseClient() } = {}) {
  const [fetched, setFetched] = useState(null)

  useEffect(() => {
    if (!client) return undefined

    let active = true

    fetchTutorialVideos({ client }).then((result) => {
      if (active) setFetched(result.videos)
    })

    return () => {
      active = false
    }
  }, [client])

  // Derived rather than stored, so no effect writes state synchronously.
  if (!client) return { videos: tutorials, isLoading: false }

  return { videos: fetched ?? [], isLoading: fetched === null }
}
