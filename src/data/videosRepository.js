/**
 * The boundary between Supabase and the tutorial library on the Tutorials page.
 *
 * Videos live as one ordered list on the `site_settings` row `tutorial_videos`
 * ({ videos: Tutorial[] }), so the existing owner-only RLS policy on that table
 * already guards writes and no migration is needed.
 *
 * Until the owner saves for the first time there is no row, and the library
 * bundled in ./tutorials stands in. Once a row exists it wins, even if empty —
 * deleting every video must not resurrect the defaults.
 */

import { TUTORIAL_CATEGORIES, tutorials } from './tutorials'
import { isYouTubeId } from '../lib/youtube'

/** @typedef {import('./tutorials').Tutorial} Tutorial */

const TABLE = 'site_settings'
const COLUMNS = 'key, value'

export const TUTORIAL_VIDEOS_KEY = 'tutorial_videos'

/** m:ss or h:mm:ss, the way YouTube prints a runtime. */
const LENGTH_PATTERN = /^(\d{1,2}:)?\d{1,2}:[0-5]\d$/

const text = (value) => (typeof value === 'string' ? value.trim() : '')

/**
 * @param {unknown} raw
 * @returns {Tutorial|null} null when the entry cannot be shown at all.
 */
function normalizeVideo(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const id = text(raw.id)
  const title = text(raw.title)
  if (!id || !title) return null

  const category = text(raw.category)
  const length = text(raw.length)

  return {
    id,
    title,
    desc: text(raw.desc),
    category: TUTORIAL_CATEGORIES.includes(category) ? category : '',
    length: LENGTH_PATTERN.test(length) ? length : '',
    // Anything other than a strict id becomes "coming soon", never an embed.
    youtubeId: isYouTubeId(raw.youtubeId) ? raw.youtubeId : null,
    isFeatured: raw.isFeatured === true,
  }
}

/**
 * @param {readonly unknown[]} list
 * @returns {Tutorial[]}
 */
function normalizeList(list) {
  const seen = new Set()
  let hasFeatured = false

  return list.map(normalizeVideo).reduce((kept, video) => {
    if (!video || seen.has(video.id)) return kept
    seen.add(video.id)

    const isFeatured = video.isFeatured && !hasFeatured
    hasFeatured = hasFeatured || isFeatured

    return [...kept, { ...video, isFeatured }]
  }, [])
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {Tutorial[]|null} null when the row is missing or malformed.
 */
export function normalizeTutorialVideos(row) {
  if (!row || typeof row !== 'object') return null

  const value = row.value
  if (!value || typeof value !== 'object' || !Array.isArray(value.videos)) return null

  return normalizeList(value.videos)
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {readonly Tutorial[]} [options.fallback]
 * @returns {Promise<{videos: readonly Tutorial[], source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchTutorialVideos({ client, fallback = tutorials } = {}) {
  const degrade = (error = null) => ({ videos: fallback, source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq('key', TUTORIAL_VIDEOS_KEY)
      .maybeSingle()

    if (error) return degrade(error.message ?? String(error))

    const videos = normalizeTutorialVideos(data)
    if (videos === null) return degrade()

    return { videos, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}

/**
 * @param {readonly Tutorial[]} videos
 * @returns {string|null} The first reason the list cannot be saved.
 */
function findInvalidVideo(videos) {
  for (const video of videos) {
    if (!text(video?.title)) return 'Every video needs a title.'

    const id = video.youtubeId
    if (id !== null && id !== undefined && id !== '' && !isYouTubeId(id)) {
      return `“${text(video.title)}” needs a valid YouTube link.`
    }
  }

  return null
}

/**
 * Replaces the whole stored list. Authorisation is row-level security against
 * the signed-in account, exactly as for the other site settings.
 *
 * @param {readonly Tutorial[]} videos
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, videos: Tutorial[]|null, error: string|null}>}
 */
export async function updateTutorialVideos(videos, { client } = {}) {
  const fail = (error) => ({ ok: false, videos: null, error })

  if (!client) return fail('Sign in before changing the tutorial videos.')
  if (!Array.isArray(videos)) return fail('Tutorial videos must be a list.')

  const invalid = findInvalidVideo(videos)
  if (invalid) return fail(invalid)

  const cleanVideos = normalizeList(videos)

  try {
    const { error } = await client
      .from(TABLE)
      .upsert({ key: TUTORIAL_VIDEOS_KEY, value: { videos: cleanVideos } }, { onConflict: 'key' })

    if (error) return fail(error.message ?? String(error))

    return { ok: true, videos: cleanVideos, error: null }
  } catch (cause) {
    return fail(cause?.message ?? String(cause))
  }
}
