import { describe, it, expect } from 'vitest'
import {
  isYouTubeId,
  parseYouTubeId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from './youtube'

/**
 * Journey: As the shop owner, I want to paste whatever YouTube link my phone
 * gives me — share sheet, browser bar, Shorts — and have the site understand
 * it, so that publishing a tutorial never needs me to dig out a video id.
 */

const ID = 'aBcDeFgHiJ1'

describe('parseYouTubeId — reading the links people actually paste', () => {
  it.each([
    ['a watch URL', `https://www.youtube.com/watch?v=${ID}`],
    ['a watch URL with extra parameters', `https://www.youtube.com/watch?feature=share&v=${ID}&t=42s`],
    ['a mobile watch URL', `https://m.youtube.com/watch?v=${ID}`],
    ['a share-sheet short link', `https://youtu.be/${ID}?si=Xy12_ab`],
    ['a Shorts link', `https://youtube.com/shorts/${ID}`],
    ['an embed link', `https://www.youtube.com/embed/${ID}`],
    ['a privacy-enhanced embed link', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['a live link', `https://www.youtube.com/live/${ID}?feature=shared`],
    ['a link without the protocol', `youtu.be/${ID}`],
    ['a bare id', ID],
    ['a link with stray whitespace', `  https://youtu.be/${ID}  `],
  ])('understands %s', (_label, input) => {
    expect(parseYouTubeId(input)).toBe(ID)
  })

  it.each([
    ['an empty string', ''],
    ['another site', `https://vimeo.com/${ID}`],
    ['a look-alike domain', `https://youtube.com.evil.example/watch?v=${ID}`],
    ['a channel page', 'https://www.youtube.com/@mamamica'],
    ['an id of the wrong length', 'https://youtu.be/abc123'],
    ['a script URL', `javascript:alert("${ID}")`],
    ['a non-string', 42],
  ])('refuses %s', (_label, input) => {
    expect(parseYouTubeId(input)).toBeNull()
  })
})

describe('isYouTubeId', () => {
  it('accepts exactly eleven URL-safe characters', () => {
    expect(isYouTubeId(ID)).toBe(true)
    expect(isYouTubeId('a-b_c-d_e-f')).toBe(true)
  })

  it('rejects anything that could smuggle extra path or query into an embed', () => {
    expect(isYouTubeId(`${ID}?autoplay`)).toBe(false)
    expect(isYouTubeId('../../evil1')).toBe(false)
    expect(isYouTubeId(null)).toBe(false)
  })
})

describe('YouTube URL builders', () => {
  it('embeds through the privacy-enhanced domain', () => {
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
  })

  it('points thumbnails at the image size every video is guaranteed to have', () => {
    expect(youtubeThumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  })

  it('links to the normal watch page', () => {
    expect(youtubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
  })
})
