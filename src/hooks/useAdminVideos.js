import { useCallback, useEffect, useState } from 'react'
import { fetchTutorialVideos, updateTutorialVideos } from '../data/videosRepository'

/**
 * The editable tutorial list behind the admin page's Videos tab.
 *
 * Every change writes the whole list, so a list that failed to load must never
 * be written: it would replace the owner's real videos with the bundled
 * defaults. `canEdit` is false until a read has succeeded, and `reload` lets
 * the owner retry instead.
 *
 * Writes are confirmed before local state changes — the list on screen is
 * always the list in the database.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 */
export function useAdminVideos({ client } = {}) {
  const [videos, setVideos] = useState([])
  const [source, setSource] = useState('fallback')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true

    fetchTutorialVideos({ client }).then((result) => {
      if (!active) return
      setVideos(result.videos)
      setSource(result.source)
      setError(result.error)
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [client, reloadCount])

  const reload = useCallback(() => {
    setIsLoading(true)
    setReloadCount((count) => count + 1)
  }, [])

  const commit = useCallback(
    async (next) => {
      const result = await updateTutorialVideos(next, { client })
      if (!result.ok) return result

      setVideos(result.videos)
      setSource('supabase')
      return result
    },
    [client]
  )

  const canEdit = !isLoading && !error && Boolean(client)

  return { videos, source, error, isLoading, canEdit, reload, commit }
}
