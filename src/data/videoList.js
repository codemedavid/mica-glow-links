/**
 * Pure, immutable edits to the tutorial list the admin page manages. Each
 * returns a new array and keeps the "at most one featured video" rule, so the
 * Videos tab never has to reason about it.
 */

/** @typedef {import('./tutorials').Tutorial} Tutorial */

/**
 * @param {readonly Tutorial[]} list
 * @param {string} featuredId  The only id allowed to stay featured.
 * @returns {Tutorial[]}
 */
function keepOnlyFeatured(list, featuredId) {
  return list.map((item) =>
    item.isFeatured && item.id !== featuredId ? { ...item, isFeatured: false } : item
  )
}

/**
 * @param {readonly Tutorial[]} list
 * @param {Tutorial} video
 * @returns {Tutorial[]}
 */
export function addVideo(list, video) {
  const next = [video, ...list]
  return video.isFeatured ? keepOnlyFeatured(next, video.id) : next
}

/**
 * @param {readonly Tutorial[]} list
 * @param {Tutorial} video  Edited copy, matched by id.
 * @returns {Tutorial[]}
 */
export function replaceVideo(list, video) {
  const next = list.map((item) => (item.id === video.id ? video : item))
  return video.isFeatured ? keepOnlyFeatured(next, video.id) : next
}

/**
 * @param {readonly Tutorial[]} list
 * @param {string} id
 * @returns {Tutorial[]}
 */
export function removeVideo(list, id) {
  return list.filter((item) => item.id !== id)
}

/**
 * @param {readonly Tutorial[]} list
 * @param {string} id
 * @param {-1|1} direction  -1 moves up the page, 1 moves down.
 * @returns {Tutorial[]}
 */
export function moveVideo(list, id, direction) {
  const from = list.findIndex((item) => item.id === id)
  const to = from + direction

  if (from === -1 || to < 0 || to >= list.length) return [...list]

  return list.map((item, index) => {
    if (index === from) return list[to]
    if (index === to) return list[from]
    return item
  })
}

/**
 * @param {readonly Tutorial[]} list
 * @param {string} id
 * @returns {Tutorial[]}
 */
export function toggleFeatured(list, id) {
  const target = list.find((item) => item.id === id)
  if (!target) return [...list]

  if (target.isFeatured) {
    return list.map((item) => (item.id === id ? { ...item, isFeatured: false } : item))
  }

  return keepOnlyFeatured(
    list.map((item) => (item.id === id ? { ...item, isFeatured: true } : item)),
    id
  )
}
