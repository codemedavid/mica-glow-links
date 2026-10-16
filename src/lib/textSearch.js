/**
 * Forgiving client-side text search for short lists — tutorials today.
 * Case, accents and word order are ignored; every typed word must appear
 * somewhere in the searchable fields.
 */

const DIACRITICS = /[̀-ͯ]/g
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

/**
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeForSearch(text) {
  if (typeof text !== 'string') return ''

  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} query
 * @returns {string[]}
 */
function queryTerms(query) {
  return normalizeForSearch(query).split(' ').filter(Boolean)
}

/**
 * @param {ReadonlyArray<string|null|undefined>} fields
 * @param {string} query
 * @returns {boolean}
 */
export function matchesSearch(fields, query) {
  const terms = queryTerms(query)
  if (terms.length === 0) return true

  const haystack = fields.map(normalizeForSearch).join(' ')
  return terms.every((term) => haystack.includes(term))
}

/**
 * Splits text into plain and matching runs so a result can mark what the
 * visitor typed. Matching here is case-insensitive only — an accented title
 * still matches through matchesSearch, it just is not highlighted.
 *
 * @param {string} text
 * @param {string} query
 * @returns {Array<{text: string, isMatch: boolean}>}
 */
export function splitHighlights(text, query) {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [{ text, isMatch: false }]

  const escaped = terms.map((term) => term.replace(REGEX_SPECIALS, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const lowerTerms = terms.map((term) => term.toLowerCase())

  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, isMatch: lowerTerms.includes(part.toLowerCase()) }))
}
