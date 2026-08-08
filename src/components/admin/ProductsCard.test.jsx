import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductsCard } from './ProductsCard'

/**
 * Journeys:
 *  - As the shop owner, I want to see every product the order calculator
 *    quotes, so that I can audit the price list.
 *  - As the shop owner, I want to find one SKU among two hundred, so that
 *    editing is not a scroll hunt.
 *  - As the shop owner, I want to change a price and save it, so that the
 *    calculator charges the new amount without a redeploy.
 *  - As the shop owner, I want to switch a product in or out of stock, so that
 *    customers are not quoted something I cannot ship.
 *  - As the shop owner, I want to add a product from the "+ Add" sheet.
 *  - As the shop owner, I want removal to take two taps, so that I cannot
 *    delete a product by brushing the screen.
 *
 * The client is injected; these tests never reach a real Supabase project.
 */

const TR5 = {
  code: 'TR5',
  name: 'Tirzepatide',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 422.5,
  stock: 'low',
}

const BC5 = {
  code: 'BC5',
  name: 'BPC-157',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 429,
  stock: 'in',
}

/** In-memory `products` table, wired through the supabase-js call shapes. */
const fakeTable = (seed = []) => {
  let rows = seed.map((row) => ({ ...row }))
  const upsert = vi.fn((row) => {
    rows = [...rows.filter((existing) => existing.code !== row.code), { ...row }]
    return Promise.resolve({ error: null })
  })
  const update = vi.fn((patch) => ({
    eq: (_column, value) => {
      rows = rows.map((row) => (row.code === value ? { ...row, ...patch } : row))
      return Promise.resolve({ error: null })
    },
  }))
  const remove = vi.fn(() => ({
    eq: (_column, value) => {
      rows = rows.filter((row) => row.code !== value)
      return Promise.resolve({ error: null })
    },
  }))

  return {
    upsert,
    update,
    remove,
    rows: () => rows.map((row) => ({ ...row })),
    from: () => ({
      select: () => Promise.resolve({ data: rows.map((row) => ({ ...row })), error: null }),
      upsert,
      update,
      delete: remove,
    }),
  }
}

const clientRefusing = (message) => ({
  from: () => ({
    select: () => Promise.resolve({ data: [{ ...TR5 }], error: null }),
    upsert: () => Promise.resolve({ error: { message } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: { message } }) }),
  }),
})

const setup = (client = fakeTable([TR5, BC5]), props = {}) => {
  const onSaved = vi.fn()
  render(<ProductsCard client={client} onSaved={onSaved} {...props} />)
  return { user: userEvent.setup(), client, onSaved }
}

describe('ProductsCard — showing the price list', () => {
  it('lists the products the calculator quotes', async () => {
    setup()

    expect(await screen.findByText('Tirzepatide')).toBeVisible()
    expect(screen.getByText('BPC-157')).toBeVisible()
  })

  it('shows each product at its current price', async () => {
    setup()

    expect(await screen.findByLabelText('Price for TR5')).toHaveValue(422.5)
  })

  it('shows each product at its current stock state', async () => {
    setup()

    expect(await screen.findByLabelText('Stock for TR5')).toHaveValue('low')
  })

  it('counts the catalogue, so an empty table is obvious', async () => {
    setup()

    expect(await screen.findByText(/2 products/i)).toBeVisible()
  })

  it('says so plainly when the table holds nothing yet', async () => {
    setup(fakeTable([]))

    expect(await screen.findByText(/no products/i)).toBeVisible()
  })

  it('reports a read failure rather than showing an empty list as the truth', async () => {
    setup({
      from: () => ({
        select: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
      }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/permission denied/i)
  })
})

describe('ProductsCard — finding a product', () => {
  it('filters by name', async () => {
    const { user } = setup()

    await user.type(await screen.findByLabelText(/search products/i), 'tirzep')

    expect(screen.getByText('Tirzepatide')).toBeVisible()
    expect(screen.queryByText('BPC-157')).not.toBeInTheDocument()
  })

  it('filters by SKU code, which is what the owner reads off an order', async () => {
    const { user } = setup()

    await user.type(await screen.findByLabelText(/search products/i), 'bc5')

    expect(screen.getByText('BPC-157')).toBeVisible()
    expect(screen.queryByText('Tirzepatide')).not.toBeInTheDocument()
  })

  it('caps a long catalogue and says it has done so, rather than truncating silently', async () => {
    const many = Array.from({ length: 45 }, (_index, position) => ({
      code: `P${String(position).padStart(3, '0')}`,
      name: `Product ${String(position).padStart(3, '0')}`,
      spec: null,
      vial_price: 100 + position,
      stock: 'in',
    }))
    setup(fakeTable(many))

    expect(await screen.findByText(/showing the first 40/i)).toBeVisible()
    expect(screen.getByText(/45 products/i)).toBeVisible()
  })

  it('says nothing matched instead of rendering a blank list', async () => {
    const { user } = setup()

    await user.type(await screen.findByLabelText(/search products/i), 'zzzz')

    expect(await screen.findByText(/no products match/i)).toBeVisible()
  })
})

describe('ProductsCard — changing a price', () => {
  it('saves the edited price against the product code', async () => {
    const { user, client } = setup()

    const price = await screen.findByLabelText('Price for TR5')
    await user.clear(price)
    await user.type(price, '999')
    await user.click(screen.getByRole('button', { name: 'Save TR5' }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TR5', vial_price: 999 }),
        expect.anything()
      )
    )
  })

  it('confirms the save, so the owner knows the calculator has the new price', async () => {
    const { user, onSaved } = setup()

    const price = await screen.findByLabelText('Price for TR5')
    await user.clear(price)
    await user.type(price, '999')
    await user.click(screen.getByRole('button', { name: 'Save TR5' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/TR5/)))
  })

  it('offers no save until something actually changed', async () => {
    setup()

    expect(await screen.findByRole('button', { name: 'Save TR5' })).toBeDisabled()
  })

  it('refuses a zero price without calling the database', async () => {
    const { user, client } = setup()

    const price = await screen.findByLabelText('Price for TR5')
    await user.clear(price)
    await user.type(price, '0')
    await user.click(screen.getByRole('button', { name: 'Save TR5' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/price/i)
    expect(client.upsert).not.toHaveBeenCalled()
  })

  it('surfaces a row-level-security rejection rather than claiming success', async () => {
    const { user, onSaved } = setup(clientRefusing('new row violates row-level security policy'))

    const price = await screen.findByLabelText('Price for TR5')
    await user.clear(price)
    await user.type(price, '999')
    await user.click(screen.getByRole('button', { name: 'Save TR5' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/row-level security/i)
    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('ProductsCard — the stock switch', () => {
  it('writes the chosen state as soon as it is picked', async () => {
    const { user, client } = setup()

    await user.selectOptions(await screen.findByLabelText('Stock for TR5'), 'out')

    await waitFor(() => expect(client.update).toHaveBeenCalledWith({ stock: 'out' }))
  })

  it('keeps showing the new state after the write', async () => {
    const { user } = setup()

    await user.selectOptions(await screen.findByLabelText('Stock for TR5'), 'out')

    await waitFor(() => expect(screen.getByLabelText('Stock for TR5')).toHaveValue('out'))
  })

  it('surfaces a refused stock change', async () => {
    const { user } = setup(clientRefusing('new row violates row-level security policy'))

    await user.selectOptions(await screen.findByLabelText('Stock for TR5'), 'out')

    expect(await screen.findByRole('alert')).toHaveTextContent(/row-level security/i)
  })
})

describe('ProductsCard — removing a product', () => {
  it('asks for confirmation before deleting anything', async () => {
    const { user, client } = setup()

    await user.click(await screen.findByRole('button', { name: 'Remove TR5' }))

    expect(client.remove).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm remove TR5/i })).toBeVisible()
  })

  it('deletes the product on the second tap', async () => {
    const { user, client } = setup()

    await user.click(await screen.findByRole('button', { name: 'Remove TR5' }))
    await user.click(screen.getByRole('button', { name: /confirm remove TR5/i }))

    await waitFor(() => expect(client.rows().map((row) => row.code)).toEqual(['BC5']))
  })

  it('drops the deleted product from the list', async () => {
    const { user } = setup()

    await user.click(await screen.findByRole('button', { name: 'Remove TR5' }))
    await user.click(screen.getByRole('button', { name: /confirm remove TR5/i }))

    await waitFor(() => expect(screen.queryByText('Tirzepatide')).not.toBeInTheDocument())
  })
})

describe('ProductsCard — the "+ Add" sheet', () => {
  const openSheet = async (user) => {
    await user.click(await screen.findByRole('button', { name: '+ Add' }))
    return screen.getByRole('dialog', { name: /add a product/i })
  }

  const fillSheet = async (user, sheet) => {
    await user.type(within(sheet).getByLabelText('Product code'), 'AAA1')
    await user.type(within(sheet).getByLabelText('Product name'), 'Adamax')
    await user.type(within(sheet).getByLabelText('Price (₱)'), '500')
  }

  it('opens a sheet with the fields a new product needs', async () => {
    const { user } = setup()

    const sheet = await openSheet(user)

    expect(within(sheet).getByLabelText('Product code')).toBeVisible()
    expect(within(sheet).getByLabelText('Product name')).toBeVisible()
    expect(within(sheet).getByLabelText('Price (₱)')).toBeVisible()
  })

  it('writes the new product to the table the calculator reads', async () => {
    const { user, client } = setup()

    const sheet = await openSheet(user)
    await fillSheet(user, sheet)
    await user.click(within(sheet).getByRole('button', { name: /save new product/i }))

    await waitFor(() =>
      expect(client.rows()).toContainEqual(
        expect.objectContaining({ code: 'AAA1', name: 'Adamax', vial_price: 500 })
      )
    )
  })

  it('shows the new product in the list once saved', async () => {
    const { user } = setup()

    const sheet = await openSheet(user)
    await fillSheet(user, sheet)
    await user.click(within(sheet).getByRole('button', { name: /save new product/i }))

    expect(await screen.findByText('Adamax')).toBeVisible()
  })

  it('closes itself after a successful save', async () => {
    const { user } = setup()

    const sheet = await openSheet(user)
    await fillSheet(user, sheet)
    await user.click(within(sheet).getByRole('button', { name: /save new product/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('explains a missing code instead of writing a row with no primary key', async () => {
    const { user, client } = setup()

    const sheet = await openSheet(user)
    await user.type(within(sheet).getByLabelText('Product name'), 'Adamax')
    await user.type(within(sheet).getByLabelText('Price (₱)'), '500')
    await user.click(within(sheet).getByRole('button', { name: /save new product/i }))

    expect(await within(sheet).findByRole('alert')).toHaveTextContent(/code/i)
    expect(client.upsert).not.toHaveBeenCalled()
  })

  it('closes without saving when cancelled', async () => {
    const { user, client } = setup()

    const sheet = await openSheet(user)
    await user.type(within(sheet).getByLabelText('Product code'), 'AAA1')
    await user.click(within(sheet).getByRole('button', { name: /cancel/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(client.upsert).not.toHaveBeenCalled()
  })
})
