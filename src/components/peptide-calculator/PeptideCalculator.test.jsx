import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PeptideCalculator } from './PeptideCalculator'

const CONSULTATION_URL = 'https://nowserving.seriousmd.com/doctor/andrei-francis-flandes'

const setup = (props = {}) => ({
  user: userEvent.setup(),
  ...render(<PeptideCalculator onBack={() => {}} {...props} />),
})

const result = () => screen.getByRole('status')

const statTile = (label) => screen.getByRole('group', { name: label })

/**
 * Journey: As someone reconstituting a peptide vial, I want to enter my vial
 * size, water volume, and target dose, so that I know exactly how far to draw
 * the plunger on my insulin syringe.
 */
describe('PeptideCalculator — reading a dose', () => {
  it('opens on the standard 10 mg / 2 ml / 250 mcg setup', () => {
    setup()

    expect(within(result()).getByText('5')).toBeVisible()
    expect(
      within(result()).getByText('Draw 0.05 ml to get 250 mcg (0.25 mg) per dose.')
    ).toBeVisible()
  })

  it('reports the concentration, doses per vial and syringe fill', () => {
    setup()

    expect(within(statTile(/concentration/i)).getByText('5 mg/ml')).toBeVisible()
    expect(within(statTile(/doses per vial/i)).getByText('40 doses')).toBeVisible()
    expect(within(statTile(/syringe fill/i)).getByText('10%')).toBeVisible()
  })

  it('recalculates when more water is added to the same vial', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: '5 ml' }))

    // 10 mg in 5 ml is 2 mg/ml, so 250 mcg is 0.125 ml — 12.5 units.
    expect(within(result()).getByText('12.5')).toBeVisible()
    expect(within(statTile(/concentration/i)).getByText('2 mg/ml')).toBeVisible()
  })

  it('restates the barrel markings when a different syringe is chosen', async () => {
    const { user } = setup()

    expect(screen.getByText('A 0.5 ml insulin syringe is marked 0–50 units.')).toBeVisible()

    await user.click(screen.getByRole('radio', { name: '1.0 ml' }))

    expect(screen.getByText('A 1.0 ml insulin syringe is marked 0–100 units.')).toBeVisible()
  })

  it('marks the chosen option so the current selection is obvious', async () => {
    const { user } = setup()

    expect(screen.getByRole('radio', { name: '0.5 ml' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: '1.0 ml' }))

    expect(screen.getByRole('radio', { name: '1.0 ml' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '0.5 ml' })).not.toBeChecked()
  })
})

/**
 * Journey: As someone with a vial that is not a preset size, I want to type my
 * own numbers, so that the tool still works for my product.
 */
describe('PeptideCalculator — custom amounts', () => {
  it('hides the custom vial field until it is asked for', () => {
    setup()

    expect(screen.queryByLabelText(/mg in the vial/i)).not.toBeInTheDocument()
  })

  it('calculates from a hand-typed vial size', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: /other vial size/i }))
    const field = screen.getByLabelText(/mg in the vial/i)
    await user.clear(field)
    await user.type(field, '20')

    // 20 mg in 2 ml is 10 mg/ml, so 250 mcg is 0.025 ml — 2.5 units.
    expect(within(result()).getByText('2.5')).toBeVisible()
  })

  it('calculates from a hand-typed water volume', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: /other water volume/i }))
    const field = screen.getByLabelText(/ml of water/i)
    await user.clear(field)
    await user.type(field, '4')

    expect(within(statTile(/concentration/i)).getByText('2.5 mg/ml')).toBeVisible()
  })

  it('prompts instead of showing zeroes while the field is empty', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: /other water volume/i }))
    await user.clear(screen.getByLabelText(/ml of water/i))

    expect(within(result()).getByText('—')).toBeVisible()
    expect(
      within(result()).getByText('Fill in the fields above to see your draw volume.')
    ).toBeVisible()
  })
})

/**
 * Journey: As someone whose protocol is written in mg rather than mcg, I want
 * to switch units, so that I can enter the dose the way my protocol states it.
 */
describe('PeptideCalculator — dose units', () => {
  it('carries the current dose across a switch to milligrams', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /measure in milligrams/i }))

    // 250 mcg is 0.25 mg — the same dose, so the draw does not move.
    expect(screen.getByRole('radio', { name: '0.25 mg' })).toBeChecked()
    expect(within(result()).getByText('5')).toBeVisible()
  })

  it('offers milligram presets once milligrams are selected', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /measure in milligrams/i }))

    expect(screen.getByRole('radio', { name: '2.5 mg' })).toBeVisible()
    expect(screen.queryByRole('radio', { name: '500 mcg' })).not.toBeInTheDocument()
  })

  it('leaves the dose untouched when the unit already in use is tapped again', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /measure in micrograms/i }))

    expect(screen.getByRole('radio', { name: '250 mcg' })).toBeChecked()
    expect(within(result()).getByText('5')).toBeVisible()
  })

  it('labels the custom dose field with the unit in play', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /measure in milligrams/i }))
    await user.click(screen.getByRole('radio', { name: /other dose/i }))

    expect(screen.getByLabelText(/mg per dose/i)).toBeVisible()
  })
})

/**
 * Journey: As someone about to inject, I want to be warned when my dose will
 * not fit in my syringe, so that I do not under-dose by accident.
 */
describe('PeptideCalculator — overfill', () => {
  it('stays quiet while the dose fits', () => {
    setup()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('warns and explains the fix when the dose exceeds the barrel', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: '0.3 ml' }))
    await user.click(screen.getByRole('radio', { name: '500 mcg' }))
    await user.click(screen.getByRole('radio', { name: /other water volume/i }))
    const water = screen.getByLabelText(/ml of water/i)
    await user.clear(water)
    await user.type(water, '20')

    // 10 mg in 20 ml is 0.5 mg/ml, so 500 mcg needs a full 1 ml.
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That dose needs 1 ml — more than your 0.3 ml syringe holds. Use less water or a larger syringe.'
    )
  })
})

describe('PeptideCalculator — page controls', () => {
  it('returns the visitor to the links page', async () => {
    const onBack = vi.fn()
    const { user } = setup({ onBack })

    await user.click(screen.getByRole('button', { name: /back to links/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('restores the starting setup on reset', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: '1.0 ml' }))
    await user.click(screen.getByRole('radio', { name: '500 mcg' }))
    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByRole('radio', { name: '0.5 ml' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '250 mcg' })).toBeChecked()
    expect(within(result()).getByText('5')).toBeVisible()
  })

  it('offers a consultation with the doctor without leaking the opener', () => {
    setup()

    const link = screen.getByRole('link', { name: /book a consultation/i })

    expect(link).toHaveAttribute('href', CONSULTATION_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('tells visitors this is a reference tool, not a prescription', () => {
    setup()

    expect(screen.getByText(/always confirm dosing with your prescriber/i)).toBeVisible()
  })

  it('can drop the disclaimer where the surrounding page already carries one', () => {
    setup({ showDisclaimer: false })

    expect(screen.queryByText(/always confirm dosing with your prescriber/i)).not.toBeInTheDocument()
  })
})
