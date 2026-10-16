const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * True for absolute URLs a public link may point at. Rejects relative paths and
 * schemes such as `javascript:` or `data:` that would run in the visitor's tab.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSafeOutboundUrl(value) {
  if (typeof value !== 'string') return false

  try {
    return SAFE_LINK_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    return false
  }
}
