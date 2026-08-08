import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderCalculator } from './OrderCalculator'
import { products } from '../../data/products'

/**
 * Journey: As a customer, I want to search the August price list and add a
 * newly released blend to my order, so that I can see what it will cost me
 * before I message the shop.
 */

const SHIPPING_FEE = 250

const setup = () => ({
  user: userEvent.setup(),
  ...render(<OrderCalculator onBack={() => {}} />),
})

const search = async (user, term) => {
  const input = screen.getByRole('textbox', { name: /search products/i })
  await user.clear(input)
  await user.type(input, term)
  return input
}

describe('OrderCalculator — August 4 catalogue', () => {
  it('advertises the full catalogue size', async () => {
    setup()

    expect(await screen.findByText(`${products.length} products`)).toBeVisible()
  })

  it('finds a newly released blend by name', async () => {
    const { user } = setup()

    await search(user, 'RETALIDE')

    const results = screen.getByRole('listbox')
    expect(
      within(results).getByText('Retatrutide 30mg + Cagrilintide 5mg')
    ).toBeVisible()
    expect(within(results).getByText('PHP 2,606.50')).toBeVisible()
  })

  it('finds a product by its code', async () => {
    const { user } = setup()

    await search(user, 'MICABLEND70')

    const results = screen.getByRole('listbox')
    expect(
      within(results).getByText('Tirzepatide 60mg + Cagrilintide 10mg')
    ).toBeVisible()
  })

  it('totals a new product at its August price plus shipping', async () => {
    const { user } = setup()

    await search(user, 'RETALIDE')
    await user.click(screen.getByRole('button', { name: /retatrutide 30mg/i }))

    const expected = (2606.5 + SHIPPING_FEE).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    expect(screen.getByText(`PHP ${expected}`)).toBeVisible()
  })

  it('multiplies the line total by the vial quantity', async () => {
    const { user } = setup()

    await search(user, 'TMB-NGO15')
    await user.click(screen.getByRole('button', { name: /nail growth/i }))
    await user.click(screen.getByRole('button', { name: /increase quantity/i }))

    expect(screen.getByText('PHP 298.00')).toBeVisible()
  })

  it('breaks the total down into subtotal and shipping on request', async () => {
    const { user } = setup()

    await search(user, 'RETALIDE')
    await user.click(screen.getByRole('button', { name: /retatrutide 30mg/i }))
    await user.click(screen.getByRole('button', { name: /estimated total/i }))

    const subtotalRow = screen.getByText('Subtotal').parentElement
    expect(within(subtotalRow).getByText('PHP 2,606.50')).toBeVisible()

    const shippingRow = screen.getByText('Shipping fee').parentElement
    expect(within(shippingRow).getByText(`PHP ${SHIPPING_FEE}.00`)).toBeVisible()
  })

  it('no longer offers products delisted in August', async () => {
    const { user } = setup()

    await search(user, 'IGF-DES')

    expect(screen.getByText(/no products match/i)).toBeVisible()
  })
})

/**
 * Journey: As the shop owner, I want to change a price in Supabase and have
 * the calculator quote the new figure without a redeploy — but never at the
 * cost of the calculator working at all.
 */
describe('OrderCalculator — live prices from Supabase', () => {
  const clientReturning = (result) => ({
    from: () => ({ select: () => Promise.resolve(result) }),
  })

  const LIVE_ROW = {
    code: 'TR5',
    name: 'Tirzepatide',
    spec: '5 mg/vial, 10 vials/kits',
    vial_price: 111,
    stock: 'in',
  }

  it('quotes the Supabase price rather than the bundled one', async () => {
    const user = userEvent.setup()
    render(
      <OrderCalculator
        onBack={() => {}}
        supabaseClient={clientReturning({ data: [LIVE_ROW], error: null })}
      />
    )

    await screen.findByText('1 products')
    await search(user, 'TR5')
    await user.click(screen.getByRole('button', { name: /tirzepatide/i }))

    expect(screen.getByText(`PHP ${(111 + SHIPPING_FEE).toFixed(2)}`)).toBeVisible()
  })

  it('falls back to the bundled catalogue when Supabase errors', async () => {
    render(
      <OrderCalculator
        onBack={() => {}}
        supabaseClient={clientReturning({ data: null, error: { message: 'permission denied' } })}
      />
    )

    expect(await screen.findByText(`${products.length} products`)).toBeVisible()
  })

  it('renders the bundled catalogue immediately, then upgrades once Supabase answers', async () => {
    render(
      <OrderCalculator
        onBack={() => {}}
        supabaseClient={clientReturning({ data: [LIVE_ROW], error: null })}
      />
    )

    expect(screen.getByText(`${products.length} products`)).toBeVisible()

    // Settling here also proves the upgrade happens, and keeps the update inside act().
    expect(await screen.findByText('1 products')).toBeVisible()
  })
})
