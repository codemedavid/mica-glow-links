import { describe, it, expect } from 'vitest'
import { addVideo, moveVideo, removeVideo, replaceVideo, toggleFeatured } from './videoList'

/**
 * Journey: As the shop owner, I want to add, edit, reorder, feature and remove
 * tutorials, so that the Tutorials page reads in the order I choose and leads
 * with the one video I want every new customer to see.
 *
 * Every operation returns a new list; the input is never changed.
 */

const video = (id, extra = {}) => ({
  id,
  title: id.toUpperCase(),
  desc: '',
  category: 'Dosing',
  length: '',
  youtubeId: null,
  isFeatured: false,
  ...extra,
})

const ids = (list) => list.map((item) => item.id)
const LIST = Object.freeze([video('a', { isFeatured: true }), video('b'), video('c')])

describe('addVideo', () => {
  it('puts the new video at the top of the library', () => {
    expect(ids(addVideo(LIST, video('new')))).toEqual(['new', 'a', 'b', 'c'])
  })

  it('takes the lead spot when added as featured', () => {
    const next = addVideo(LIST, video('new', { isFeatured: true }))

    expect(next.filter((item) => item.isFeatured).map((item) => item.id)).toEqual(['new'])
  })
})

describe('replaceVideo', () => {
  it('swaps in the edited copy at the same position', () => {
    const next = replaceVideo(LIST, video('b', { title: 'Edited' }))

    expect(ids(next)).toEqual(['a', 'b', 'c'])
    expect(next[1].title).toBe('Edited')
  })

  it('moves the lead spot when the edit features a different video', () => {
    const next = replaceVideo(LIST, video('c', { isFeatured: true }))

    expect(next.map((item) => item.isFeatured)).toEqual([false, false, true])
  })
})

describe('removeVideo', () => {
  it('drops only the chosen video', () => {
    expect(ids(removeVideo(LIST, 'b'))).toEqual(['a', 'c'])
  })
})

describe('moveVideo', () => {
  it('moves a video up or down one place', () => {
    expect(ids(moveVideo(LIST, 'c', -1))).toEqual(['a', 'c', 'b'])
    expect(ids(moveVideo(LIST, 'a', 1))).toEqual(['b', 'a', 'c'])
  })

  it('leaves the list alone at either end', () => {
    expect(ids(moveVideo(LIST, 'a', -1))).toEqual(['a', 'b', 'c'])
    expect(ids(moveVideo(LIST, 'c', 1))).toEqual(['a', 'b', 'c'])
  })
})

describe('toggleFeatured', () => {
  it('features one video and unfeatures the rest', () => {
    expect(toggleFeatured(LIST, 'b').map((item) => item.isFeatured)).toEqual([false, true, false])
  })

  it('unfeatures the lead video when toggled again, leaving no hero', () => {
    expect(toggleFeatured(LIST, 'a').some((item) => item.isFeatured)).toBe(false)
  })
})
