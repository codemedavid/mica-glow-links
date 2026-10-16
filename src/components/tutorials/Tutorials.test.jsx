import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tutorials, TutorialsPage } from './Tutorials'

/**
 * Journey: As a community member who has just received a vial, I want to browse
 * short walkthroughs and narrow them to the step I am stuck on, so that I can
 * mix and dose correctly before touching a syringe.
 */

const noop = () => {}

describe('Tutorials page', () => {
  it('announces itself as the tutorials page', () => {
    render(<Tutorials onBack={noop} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Peptide Tutorials' })).toBeVisible()
  })

  it('leads with the recorded walkthrough as the starting point', () => {
    render(<Tutorials onBack={noop} />)

    expect(
      screen.getByRole('heading', { level: 2, name: 'Reconstituting vials & using peptide pens' })
    ).toBeVisible()
    expect(screen.getByText(/start here · 8:08/i)).toBeVisible()
  })

  it('shows the whole library before any filter is applied', () => {
    render(<Tutorials onBack={noop} />)

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  })

  it('tells the visitor no video is watchable yet rather than offering a dead link', () => {
    render(<Tutorials onBack={noop} />)

    // Five grid cards plus the featured hero — the hero must not look playable
    // while its recording is still unpublished.
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(6)
    expect(screen.queryByRole('link', { name: /drawing your dose in units/i })).toBeNull()
  })
})

/**
 * Journey: As a community member, I want to press play on a tutorial and watch
 * it without leaving the page, so that I can follow along while I work.
 */
describe('Tutorials video playback', () => {
  const items = [
    {
      id: 'featured-published',
      title: 'Reconstituting vials & using peptide pens',
      desc: 'Both topics in one recording.',
      category: 'Reconstitution',
      length: '8:08',
      youtubeId: 'aBcDeFgHiJ1',
      isFeatured: true,
    },
    {
      id: 'grid-published',
      title: 'Drawing your dose in units',
      desc: 'Reading the syringe scale.',
      category: 'Dosing',
      length: '3:20',
      youtubeId: 'kLmNoPqRsT2',
      isFeatured: false,
    },
    {
      id: 'grid-unpublished',
      title: 'Storage, handling and sharps',
      desc: 'Fridge temperatures and safe disposal.',
      category: 'Storage',
      length: '5:05',
      youtubeId: null,
      isFeatured: false,
    },
  ]

  it('plays the featured recording inline once it is published', () => {
    render(<Tutorials onBack={noop} items={items} />)

    const player = screen.getByTitle('Reconstituting vials & using peptide pens')

    expect(player).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/aBcDeFgHiJ1'
    )
  })

  it('plays a published tutorial in the grid too', () => {
    render(<Tutorials onBack={noop} items={items} />)

    expect(screen.getByTitle('Drawing your dose in units')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/kLmNoPqRsT2'
    )
  })

  it('drops the coming-soon notice from anything that is now watchable', () => {
    render(<Tutorials onBack={noop} items={items} />)

    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1)
  })

  it('defers loading the players so the page is not slowed by them', () => {
    render(<Tutorials onBack={noop} items={items} />)

    expect(screen.getByTitle('Drawing your dose in units')).toHaveAttribute('loading', 'lazy')
  })
})

describe('Tutorials category filter', () => {
  it('starts on All', () => {
    render(<Tutorials onBack={noop} />)

    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('narrows the library to the chosen category', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.click(screen.getByRole('radio', { name: 'Dosing' }))

    expect(
      screen.getByRole('heading', { level: 3, name: 'Drawing your dose in units' })
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Choosing your syringe size' })
    ).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })

  it('marks the chosen category as the selected one', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.click(screen.getByRole('radio', { name: 'Storage' }))

    expect(screen.getByRole('radio', { name: 'Storage' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'All' })).not.toBeChecked()
  })

  it('restores the whole library when All is chosen again', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.click(screen.getByRole('radio', { name: 'Storage' }))
    await user.click(screen.getByRole('radio', { name: 'All' }))

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  })

  it('keeps the featured walkthrough visible while a filter is applied', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.click(screen.getByRole('radio', { name: 'Dosing' }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'Reconstituting vials & using peptide pens' })
    ).toBeVisible()
  })
})

describe('Tutorials navigation', () => {
  it('offers a way back to the links page', async () => {
    const user = userEvent.setup()
    const handleBack = vi.fn()
    render(<Tutorials onBack={handleBack} />)

    await user.click(screen.getByRole('button', { name: /back to links/i }))

    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it('sends the visitor on to the calculator as the next step', () => {
    render(<Tutorials onBack={noop} />)

    const cta = screen.getByRole('link', { name: /open the calculator/i })

    expect(cta).toHaveAttribute('href', '#peptide')
  })

  it('reminds the visitor to confirm technique with their prescriber', () => {
    render(<Tutorials onBack={noop} />)

    expect(screen.getByText(/confirm technique and dosing with your prescriber/i)).toBeVisible()
  })
})

/**
 * Journey: As a community member who knows what I am stuck on, I want to type
 * it and see only the matching videos, so that I do not have to scan the
 * whole library on my phone.
 */
describe('Tutorials search', () => {
  const searchBox = () => screen.getByRole('searchbox', { name: /search tutorials/i })

  it('narrows the library to videos whose title or description match', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'syringe')

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Drawing your dose in units',
      'Choosing your syringe size',
    ])
  })

  it('announces how many videos were found', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'syringe')

    expect(screen.getByText('2 tutorials for “syringe”')).toBeVisible()
  })

  it('searches the featured walkthrough too, listing it with the other results', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'bacteriostatic')

    expect(screen.queryByRole('heading', { level: 2, name: /reconstituting vials/i })).toBeNull()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Reconstituting vials & using peptide pens' })
    ).toBeVisible()
  })

  it('marks the words that matched in each result title', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'syringe')

    expect(screen.getByText('syringe', { selector: 'mark' })).toBeVisible()
  })

  it('combines with the category filter', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.click(screen.getByRole('radio', { name: 'Reconstitution' }))
    await user.type(searchBox(), 'swirl')

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Reconstituting vials & using peptide pens',
      'Mixing without damaging the peptide',
    ])
  })

  it('offers a way out when nothing matches', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'zzz')
    expect(screen.getByText(/no tutorials match “zzz”/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^clear search$/i }))

    expect(searchBox()).toHaveValue('')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  })

  it('clears with the Escape key', async () => {
    const user = userEvent.setup()
    render(<Tutorials onBack={noop} />)

    await user.type(searchBox(), 'pen{Escape}')

    expect(searchBox()).toHaveValue('')
  })
})

describe('Tutorials library from the admin page', () => {
  const ONLY_DOSING = [
    {
      id: 'video-dose',
      title: 'Drawing your dose',
      desc: '',
      category: 'Dosing',
      length: '',
      youtubeId: 'aBcDeFgHiJ1',
      isFeatured: false,
    },
  ]

  it('only offers category filters that have videos behind them', () => {
    render(<Tutorials onBack={noop} items={ONLY_DOSING} />)

    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['All', 'Dosing'])
  })

  it('shows a loading state instead of an empty library while the list arrives', () => {
    render(<Tutorials onBack={noop} items={[]} isLoading />)

    expect(screen.getByRole('status')).toHaveTextContent(/loading tutorials/i)
    expect(screen.queryByText(/no tutorials/i)).toBeNull()
  })

  it('shows the videos the owner published', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: { value: { videos: ONLY_DOSING } }, error: null })
    )
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }

    render(<TutorialsPage onBack={noop} client={client} />)

    expect(await screen.findByRole('heading', { level: 3, name: 'Drawing your dose' })).toBeVisible()
    expect(screen.getByTitle('Drawing your dose')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/aBcDeFgHiJ1'
    )
  })
})
