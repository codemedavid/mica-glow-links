/**
 * Everything the app knows about YouTube URLs lives here.
 *
 * The only thing ever stored or rendered is the bare 11-character video id,
 * checked against a strict pattern. Embed, thumbnail and watch URLs are built
 * from that id, so nothing an admin pastes can reach an iframe `src` verbatim.
 */

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

// Privacy-enhanced domain: it sets no tracking cookies until the visitor
// actually presses play.
const EMBED_BASE = 'https://www.youtube-nocookie.com/embed/'

const LONG_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])
const SHORT_HOST = 'youtu.be'

/** Path prefixes whose next segment is the video id. */
const ID_PATH_PREFIXES = new Set(['embed', 'shorts', 'live', 'v'])

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isYouTubeId(value) {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value)
}

/**
 * @param {string} text
 * @returns {URL|null}
 */
function toUrl(text) {
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`

  try {
    return new URL(withProtocol)
  } catch {
    return null
  }
}

/**
 * Pulls the video id out of anything a person is likely to paste: watch,
 * share-sheet, Shorts, live and embed links, with or without the protocol, or
 * the bare id itself.
 *
 * @param {unknown} input
 * @returns {string|null} null when the input is not a recognisable YouTube video.
 */
export function parseYouTubeId(input) {
  if (typeof input !== 'string') return null

  const text = input.trim()
  if (!text) return null
  if (isYouTubeId(text)) return text

  const url = toUrl(text)
  if (!url || !['http:', 'https:'].includes(url.protocol)) return null

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)

  let candidate = null

  if (host === SHORT_HOST) {
    candidate = segments[0]
  } else if (LONG_HOSTS.has(host)) {
    candidate =
      segments[0] === 'watch'
        ? url.searchParams.get('v')
        : ID_PATH_PREFIXES.has(segments[0])
          ? segments[1]
          : null
  }

  return isYouTubeId(candidate) ? candidate : null
}

/** @param {string} id */
export function youtubeEmbedUrl(id) {
  return `${EMBED_BASE}${id}`
}

/** `hqdefault` exists for every public video, unlike the larger sizes. */
export function youtubeThumbnailUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/** @param {string} id */
export function youtubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`
}
