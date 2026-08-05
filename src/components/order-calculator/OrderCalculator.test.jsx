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

const SHIPPING_FEE = 500

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
