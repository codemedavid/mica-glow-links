import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin'

/**
 * Journeys:
 *  - As the shop owner, I want to sign in to the admin page with my email and
 *    password, so that only I can change what the bio page shows.
 *  - As a visitor who guesses the /#admin URL, I want to see nothing but a
 *    login form, so that the shop's settings are not exposed.
 *  - As the shop owner, I want to change the shipping fee and see it confirmed,
 *    so that I know the order calculator will charge the new amount.
 *
 * The client is injected. These tests never reach a real Supabase project, so
 * they assert the page's behaviour rather than the network's.
 */

const SESSION = { user: { email: 'owner@example.com' } }

const PRODUCT_ROW = {
  code: 'TR5',
  name: 'Tirzepatide',
  spec: '5 mg/vial, 10 vials/kits',
  vial_price: 422.5,
  stock: 'low',
}

/**
 * Stand-in for the slices of supabase-js the admin page actually calls.
 *
 * @param {object} [options]
 * @param {object|null} [options.session]  Session returned by getSession.
 * @param {object|null} [options.signInError]
 * @param {object|null} [options.upsertError]
 * @param {Array<object>} [options.products]  Rows in the fake `products` table.
 */
const fakeClient = ({
  session = null,
  signInError = null,
  upsertError = null,
  products = [PRODUCT_ROW],
} = {}) => {
  const upsert = vi.fn(() => Promise.resolve({ error: upsertError }))
  let current = session
  const listeners = []

  return {
    upsert,
    auth: {
      getSession: () => Promise.resolve({ data: { session: current }, error: null }),
      onAuthStateChange: (callback) => {
        listeners.push(callback)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signInWithPassword: vi.fn(({ email }) => {
        if (signInError) return Promise.resolve({ data: { session: null }, error: signInError })
        current = { user: { email } }
        listeners.forEach((notify) => notify('SIGNED_IN', current))
        return Promise.resolve({ data: { session: current }, error: null })
      }),
      signOut: vi.fn(() => {
        current = null
        listeners.forEach((notify) => notify('SIGNED_OUT', null))
        return Promise.resolve({ error: null })
      }),
    },
    // Two tables behind one entry point, as supabase-js presents them. The
    // shipping fee is read through .eq().maybeSingle(); the catalogue is read
    // by awaiting .select() directly.
    from: (table) => {
      if (table === 'products') {
        return {
          select: () => Promise.resolve({ data: products.map((row) => ({ ...row })), error: null }),
          upsert,
          update: () => ({ eq: () => Promise.resolve({ error: upsertError }) }),
          delete: () => ({ eq: () => Promise.resolve({ error: upsertError }) }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { value: { amount: 250 } }, error: null }),
          }),
        }),
        upsert,
      }
    },
  }
}

const setup = (clientOptions) => {
  const client = fakeClient(clientOptions)
  return { user: userEvent.setup(), client, ...render(<Admin client={client} />) }
}

describe('Admin — the login gate', () => {
  it('shows a password form to a signed-out visitor', async () => {
    setup()

    expect(await screen.findByLabelText(/password/i)).toBeVisible()
    expect(screen.getByLabelText(/email/i)).toBeVisible()
  })

  it('shows no shop settings at all until someone signs in', async () => {
    setup()

    await screen.findByLabelText(/password/i)
    expect(screen.queryByLabelText(/shipping fee/i)).not.toBeInTheDocument()
  })

  it('signs the owner in with the email and password they typed', async () => {
    const { user, client } = setup()

    await user.type(await screen.findByLabelText(/email/i), 'owner@example.com')
    await user.type(screen.getByLabelText(/password/i), 'a-long-passphrase')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'a-long-passphrase',
    })
  })

  it('reveals the admin shell once the session exists', async () => {
    setup({ session: SESSION })

    expect(await screen.findByRole('heading', { name: /price list/i })).toBeVisible()
  })

  it('explains a rejected sign-in instead of failing silently', async () => {
    const { user } = setup({ signInError: { message: 'Invalid login credentials' } })

    await user.type(await screen.findByLabelText(/email/i), 'owner@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid login credentials/i)
  })

  it('does not submit an empty form to the auth server', async () => {
    const { user, client } = setup()

    await user.click(await screen.findByRole('button', { name: /sign in/i }))

    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('Admin — editing the shipping fee', () => {
  it('loads the fee the shop currently charges', async () => {
    setup({ session: SESSION })

    await waitFor(() => expect(screen.getByLabelText(/shipping fee/i)).toHaveValue(250))
  })

  it('saves a new fee and confirms it', async () => {
    const { user, client } = setup({ session: SESSION })

    const input = await screen.findByLabelText(/shipping fee/i)
    await waitFor(() => expect(input).toHaveValue(250))

    await user.clear(input)
    await user.type(input, '180')
    await user.click(screen.getByRole('button', { name: /save shipping/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'shipping_fee', value: { amount: 180 } }),
        expect.anything()
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)
  })

  it('saves a zero fee, so a free-shipping promo can be switched on', async () => {
    const { user, client } = setup({ session: SESSION })

    const input = await screen.findByLabelText(/shipping fee/i)
    await waitFor(() => expect(input).toHaveValue(250))

    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: /save shipping/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ value: { amount: 0 } }),
        expect.anything()
      )
    )
  })

  it('refuses a negative fee without calling the database', async () => {
    const { user, client } = setup({ session: SESSION })

    const input = await screen.findByLabelText(/shipping fee/i)
    await waitFor(() => expect(input).toHaveValue(250))

    await user.clear(input)
    await user.type(input, '-5')
    await user.click(screen.getByRole('button', { name: /save shipping/i }))

    expect(await screen.findByRole('alert')).toBeVisible()
    expect(client.upsert).not.toHaveBeenCalled()
  })

  it('surfaces a row-level-security rejection rather than claiming success', async () => {
    const { user } = setup({
      session: SESSION,
      upsertError: { message: 'new row violates row-level security policy' },
    })

    const input = await screen.findByLabelText(/shipping fee/i)
    await waitFor(() => expect(input).toHaveValue(250))

    await user.clear(input)
    await user.type(input, '180')
    await user.click(screen.getByRole('button', { name: /save shipping/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/row-level security/i)
  })
})

describe('Admin — the Prices tab', () => {
  it('shows the catalogue the order calculator quotes', async () => {
    setup({ session: SESSION })

    expect(await screen.findByText('Tirzepatide')).toBeVisible()
  })

  it('offers the "+ Add" sheet the design calls for', async () => {
    setup({ session: SESSION })

    expect(await screen.findByRole('button', { name: '+ Add' })).toBeVisible()
  })

  it('no longer claims the product list is unbuilt', async () => {
    setup({ session: SESSION })

    await screen.findByText('Tirzepatide')
    expect(screen.queryByText(/not built yet/i)).not.toBeInTheDocument()
  })

  it('still shows the shipping fee alongside the catalogue', async () => {
    setup({ session: SESSION })

    await waitFor(() => expect(screen.getByLabelText(/shipping fee/i)).toHaveValue(250))
  })
})

describe('Admin — signing out', () => {
  it('returns the owner to the login form', async () => {
    const { user, client } = setup({ session: SESSION })

    await screen.findByRole('heading', { name: /price list/i })
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(client.auth.signOut).toHaveBeenCalled()
    expect(await screen.findByLabelText(/password/i)).toBeVisible()
  })
})
