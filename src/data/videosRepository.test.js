import { describe, it, expect, vi } from 'vitest'
import {
  TUTORIAL_VIDEOS_KEY,
  fetchTutorialVideos,
  normalizeTutorialVideos,
  updateTutorialVideos,
} from './videosRepository'
import { tutorials } from './tutorials'

/**
 * Journeys:
 *  - As the shop owner, I want the videos I add from the admin page to be the
 *    ones customers see, so that publishing a tutorial needs no code change.
 *  - As a customer, I want the tutorials page to keep working when the
 *    database is unreachable or holds something broken, so that I am never
 *    shown a blank page or a player pointed somewhere unsafe.
 */

const VIDEO = {
  id: 'video-abc',
  title: 'Drawing your dose',
  desc: 'Reading the syringe scale.',
  category: 'Dosing',
  length: '3:20',
  youtubeId: 'aBcDeFgHiJ1',
  isFeatured: false,
}

const row = (videos) => ({ key: TUTORIAL_VIDEOS_KEY, value: { videos } })

const clientReturning = (result) => {
  const maybeSingle = vi.fn(() => Promise.resolve(result))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  return { from: vi.fn(() => ({ select })), eq }
}

describe('normalizeTutorialVideos — trusting only safe, complete videos', () => {
  it('reads the stored videos in order', () => {
    expect(normalizeTutorialVideos(row([VIDEO]))).toEqual([VIDEO])
  })

  it('fills optional fields with safe blanks', () => {
    const bare = { id: 'video-bare', title: 'Bare' }

    expect(normalizeTutorialVideos(row([bare]))).toEqual([
      {
        id: 'video-bare',
        title: 'Bare',
        desc: '',
        category: '',
        length: '',
        youtubeId: null,
        isFeatured: false,
      },
    ])
  })

  it('downgrades a malformed YouTube id to "coming soon" instead of embedding it', () => {
    const [video] = normalizeTutorialVideos(row([{ ...VIDEO, youtubeId: '"><script>' }]))

    expect(video.youtubeId).toBeNull()
  })

  it('drops videos without an id or title', () => {
    expect(
      normalizeTutorialVideos(row([{ ...VIDEO, id: '' }, { ...VIDEO, id: 'x', title: '  ' }]))
    ).toEqual([])
  })

  it('keeps only the first copy of a duplicated id', () => {
    const videos = normalizeTutorialVideos(row([VIDEO, { ...VIDEO, title: 'Copy' }]))

    expect(videos).toHaveLength(1)
    expect(videos[0].title).toBe('Drawing your dose')
  })

  it('lets only one video lead the page', () => {
    const videos = normalizeTutorialVideos(
      row([
        { ...VIDEO, id: 'a', isFeatured: true },
        { ...VIDEO, id: 'b', isFeatured: true },
      ])
    )

    expect(videos.map((video) => video.isFeatured)).toEqual([true, false])
  })

  it('blanks an unknown category and an unreadable runtime', () => {
    const [video] = normalizeTutorialVideos(
      row([{ ...VIDEO, category: 'Gossip', length: 'about 3 minutes' }])
    )

    expect(video.category).toBe('')
    expect(video.length).toBe('')
  })

  it('returns null when the row is missing or malformed', () => {
    expect(normalizeTutorialVideos(null)).toBeNull()
    expect(normalizeTutorialVideos({ value: { videos: {} } })).toBeNull()
  })
})

describe('fetchTutorialVideos — falling back to the built-in library', () => {
  it('returns the stored list when the owner has saved one', async () => {
    const { from, eq } = clientReturning({ data: row([VIDEO]), error: null })

    expect(await fetchTutorialVideos({ client: { from } })).toEqual({
      videos: [VIDEO],
      source: 'supabase',
      error: null,
    })
    expect(eq).toHaveBeenCalledWith('key', TUTORIAL_VIDEOS_KEY)
  })

  it('keeps an intentionally empty list rather than resurrecting the defaults', async () => {
    const { from } = clientReturning({ data: row([]), error: null })

    expect((await fetchTutorialVideos({ client: { from } })).videos).toEqual([])
  })

  it('uses the built-in library before the owner has saved anything', async () => {
    const { from } = clientReturning({ data: null, error: null })

    expect(await fetchTutorialVideos({ client: { from } })).toEqual({
      videos: tutorials,
      source: 'fallback',
      error: null,
    })
  })

  it('uses the built-in library when Supabase is not configured', async () => {
    expect(await fetchTutorialVideos({ client: null })).toEqual({
      videos: tutorials,
      source: 'fallback',
      error: null,
    })
  })

  it('reports the failure when Supabase errors', async () => {
    const { from } = clientReturning({ data: null, error: { message: 'boom' } })

    expect(await fetchTutorialVideos({ client: { from } })).toEqual({
      videos: tutorials,
      source: 'fallback',
      error: 'boom',
    })
  })

  it('reports a thrown network error instead of rejecting', async () => {
    const client = {
      from: () => {
        throw new Error('offline')
      },
    }

    expect((await fetchTutorialVideos({ client })).error).toBe('offline')
  })
})

describe('updateTutorialVideos — saving the owner’s list', () => {
  const upsertSpy = (result) => {
    const upsert = vi.fn(() => Promise.resolve(result))
    return { upsert, client: { from: vi.fn(() => ({ upsert })) } }
  }

  it('upserts the whole list onto the tutorial_videos settings row', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    expect(await updateTutorialVideos([VIDEO], { client })).toEqual({
      ok: true,
      videos: [VIDEO],
      error: null,
    })
    expect(client.from).toHaveBeenCalledWith('site_settings')
    expect(upsert).toHaveBeenCalledWith(
      { key: TUTORIAL_VIDEOS_KEY, value: { videos: [VIDEO] } },
      { onConflict: 'key' }
    )
  })

  it('trims what the owner typed before saving it', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    await updateTutorialVideos([{ ...VIDEO, title: '  Drawing your dose  ' }], { client })

    expect(upsert.mock.calls[0][0].value.videos[0].title).toBe('Drawing your dose')
  })

  it('refuses a video without a title without touching the database', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateTutorialVideos([{ ...VIDEO, title: ' ' }], { client })

    expect(result).toEqual({ ok: false, videos: null, error: 'Every video needs a title.' })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses a YouTube id it cannot embed safely', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateTutorialVideos([{ ...VIDEO, youtubeId: 'not-an-id' }], { client })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/youtube/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses to write when nobody is signed in', async () => {
    const result = await updateTutorialVideos([VIDEO], { client: null })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign in/i)
  })

  it('surfaces a row-level-security rejection as a readable failure', async () => {
    const { client } = upsertSpy({ error: { message: 'new row violates row-level security policy' } })

    expect(await updateTutorialVideos([VIDEO], { client })).toEqual({
      ok: false,
      videos: null,
      error: 'new row violates row-level security policy',
    })
  })
})
