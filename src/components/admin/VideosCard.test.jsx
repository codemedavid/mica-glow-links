import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideosCard } from './VideosCard'
import { tutorials } from '../../data/tutorials'

/**
 * Journeys:
 *  - As the shop owner, I want to paste a YouTube link, give it a title and
 *    see it go live on the Tutorials page, so that publishing needs no code.
 *  - As the shop owner, I want to search my videos, so that I can find the
 *    one I need to fix without scrolling the whole library.
 *  - As the shop owner, I want a failed load to stop me from saving, so that
 *    one bad connection cannot wipe out the videos I already published.
 */

const STORED = [
  {
    id: 'video-pen',
    title: 'Changing a pen cartridge',
    desc: 'Swap and re-prime.',
    category: 'Peptide pens',
    length: '3:12',
    youtubeId: 'kLmNoPqRsT2',
    isFeatured: true,
  },
  {
    id: 'video-storage',
    title: 'Storage and sharps',
    desc: 'Fridge temperatures.',
    category: 'Storage',
    length: '',
    youtubeId: null,
    isFeatured: false,
  },
]

/**
 * @param {object} [options]
 * @param {object|null} [options.row]  The stored tutorial_videos row, or null for none.
 * @param {object|null} [options.readError]
 * @param {object|null} [options.writeError]
 */
const fakeClient = ({ row = { value: { videos: STORED } }, readError = null, writeError = null } = {}) => {
  const upsert = vi.fn(() => Promise.resolve({ error: writeError }))
  const maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: readError }))
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }), upsert }))
  return { client: { from }, upsert, maybeSingle }
}

const savedVideos = (upsert, call = 0) => upsert.mock.calls[call][0].value.videos

const renderCard = (options) => {
  const fake = fakeClient(options)
  const onSaved = vi.fn()
  const user = userEvent.setup()
  render(<VideosCard client={fake.client} onSaved={onSaved} />)
  return { ...fake, onSaved, user }
}

describe('VideosCard — browsing', () => {
  it('lists the stored videos with their live state', async () => {
    renderCard()

    const pen = await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    expect(within(pen).getByText('Live')).toBeVisible()
    expect(within(pen).getByText('Featured')).toBeVisible()
    expect(
      within(screen.getByRole('listitem', { name: /storage and sharps/i })).getByText('Coming soon')
    ).toBeVisible()
  })

  it('starts from the built-in library before anything is saved, and says so', async () => {
    renderCard({ row: null })

    expect(await screen.findByText(/built-in tutorials/i)).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(tutorials.length)
  })

  it('narrows the list as the owner searches', async () => {
    const { user } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.type(screen.getByRole('searchbox', { name: /search videos/i }), 'fridge')

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('1 of 2 videos')).toBeVisible()
  })

  it('says plainly when the search finds nothing', async () => {
    const { user } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.type(screen.getByRole('searchbox', { name: /search videos/i }), 'zzz')

    expect(screen.getByText(/no videos match “zzz”/i)).toBeVisible()
  })
})

describe('VideosCard — adding a video', () => {
  it('publishes a pasted YouTube link with its title at the top of the list', async () => {
    const { user, upsert, onSaved } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.click(screen.getByRole('button', { name: /add video/i }))
    const sheet = screen.getByRole('dialog', { name: /add a video/i })
    await user.type(within(sheet).getByLabelText(/youtube link/i), 'https://youtu.be/aBcDeFgHiJ1?si=x')
    await user.type(within(sheet).getByLabelText(/^title/i), 'Drawing your dose')
    await user.click(within(sheet).getByRole('button', { name: /publish video/i }))

    const [added] = savedVideos(upsert)
    expect(added).toMatchObject({ title: 'Drawing your dose', youtubeId: 'aBcDeFgHiJ1' })
    expect(onSaved).toHaveBeenCalledWith('Video added')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('listitem', { name: /drawing your dose/i })).toBeVisible()
  })

  it('confirms the link was understood before saving', async () => {
    const { user } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.click(screen.getByRole('button', { name: /add video/i }))
    await user.type(screen.getByLabelText(/youtube link/i), 'https://www.youtube.com/watch?v=aBcDeFgHiJ1')

    expect(screen.getByText(/video found/i)).toBeVisible()
    expect(screen.getByRole('img', { name: /preview/i })).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/aBcDeFgHiJ1/hqdefault.jpg'
    )
  })

  it('refuses a link that is not a YouTube video', async () => {
    const { user, upsert } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.click(screen.getByRole('button', { name: /add video/i }))
    await user.type(screen.getByLabelText(/youtube link/i), 'https://vimeo.com/123')
    await user.type(screen.getByLabelText(/^title/i), 'Wrong site')
    await user.click(screen.getByRole('button', { name: /publish video/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/youtube/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('requires a title', async () => {
    const { user, upsert } = renderCard()
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.click(screen.getByRole('button', { name: /add video/i }))
    await user.click(screen.getByRole('button', { name: /publish video/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/title/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('keeps the sheet open with the reason when the save is rejected', async () => {
    const { user } = renderCard({ writeError: { message: 'row-level security' } })
    await screen.findByRole('listitem', { name: /changing a pen cartridge/i })

    await user.click(screen.getByRole('button', { name: /add video/i }))
    await user.type(screen.getByLabelText(/^title/i), 'Anything')
    await user.click(screen.getByRole('button', { name: /publish video/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('row-level security')
    expect(screen.getByRole('dialog')).toBeVisible()
  })
})

describe('VideosCard — managing videos', () => {
  it('edits a title in place', async () => {
    const { user, upsert } = renderCard()
    const row = await screen.findByRole('listitem', { name: /storage and sharps/i })

    await user.click(within(row).getByRole('button', { name: /edit/i }))
    const title = screen.getByLabelText(/^title/i)
    await user.clear(title)
    await user.type(title, 'Storage, handling and sharps')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(savedVideos(upsert).map((video) => video.title)).toEqual([
      'Changing a pen cartridge',
      'Storage, handling and sharps',
    ])
  })

  it('removes a video only after a second confirming tap', async () => {
    const { user, upsert } = renderCard()
    const row = await screen.findByRole('listitem', { name: /storage and sharps/i })

    await user.click(within(row).getByRole('button', { name: /^remove/i }))
    expect(upsert).not.toHaveBeenCalled()

    await user.click(within(row).getByRole('button', { name: /remove for good/i }))

    expect(savedVideos(upsert).map((video) => video.id)).toEqual(['video-pen'])
  })

  it('moves a video up the page', async () => {
    const { user, upsert } = renderCard()
    const row = await screen.findByRole('listitem', { name: /storage and sharps/i })

    await user.click(within(row).getByRole('button', { name: /move .* up/i }))

    expect(savedVideos(upsert).map((video) => video.id)).toEqual(['video-storage', 'video-pen'])
  })
})

describe('VideosCard — when the list cannot be read', () => {
  it('blocks every change and offers a retry instead', async () => {
    const { user, maybeSingle } = renderCard({ readError: { message: 'network down' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('network down')
    expect(screen.getByRole('button', { name: /add video/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(maybeSingle).toHaveBeenCalledTimes(2)
  })
})
