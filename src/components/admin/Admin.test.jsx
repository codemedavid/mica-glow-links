import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

const SETTINGS_ROWS = {
  shipping_fee: { amount: 250 },
  link_visibility: { visibility: {} },
  link_overrides: { overrides: {} },
  custom_links: { links: [] },
}

const SAVED_CUSTOM_LINK = {
  id: 'custom-restock',
  groupId: 'shop',
  icon: '🛍️',
  title: 'Restock form',
  desc: 'Reserve your next batch',
  href: 'https://example.com/restock',
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
  isOwner = true,
  ownerCheckError = null,
  settings = SETTINGS_ROWS,
} = {}) => {
  const upsert = vi.fn(() => Promise.resolve({ error: upsertError }))
  let current = session
  const listeners = []

  return {
    upsert,
    // is_shop_owner() answers for whoever holds the session, as the real RPC does.
    rpc: vi.fn(() =>
      Promise.resolve(
        ownerCheckError ? { data: null, error: ownerCheckError } : { data: isOwner, error: null }
      )
    ),
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
          eq: (_column, key) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: settings[key] ? { key, value: settings[key] } : null,
                error: null,
              }),
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

describe('Admin — link visibility', () => {
  it('shows button visibility controls on the Links tab', async () => {
    const { user } = setup({ session: SESSION })

    await user.click(await screen.findByRole('button', { name: /links/i }))

    expect(
      await screen.findByRole('checkbox', { name: /peptide calculator/i })
    ).toBeChecked()
  })

  it('saves when the owner hides the peptide calculator button', async () => {
    const { user, client } = setup({ session: SESSION })

    await user.click(await screen.findByRole('button', { name: /links/i }))
    await user.click(await screen.findByRole('checkbox', { name: /peptide calculator/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        {
          key: 'link_visibility',
          value: { visibility: expect.objectContaining({ 'peptide-calculator': false }) },
        },
        { onConflict: 'key' }
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)
  })

  it('loads saved link edits into the Links tab', async () => {
    const { user } = setup({
      session: SESSION,
      settings: {
        ...SETTINGS_ROWS,
        link_overrides: {
          overrides: {
            'price-list': {
              title: 'Updated Prices',
              desc: 'Newest spreadsheet',
              href: 'https://example.com/prices',
            },
          },
        },
      },
    })

    await user.click(await screen.findByRole('button', { name: /links/i }))

    expect(await screen.findByDisplayValue('Updated Prices')).toBeVisible()
    expect(screen.getByDisplayValue('https://example.com/prices')).toBeVisible()
  })

  it('saves edited title and URL for external links', async () => {
    const { user, client } = setup({ session: SESSION })

    await user.click(await screen.findByRole('button', { name: /links/i }))

    const titleInput = await screen.findByDisplayValue('Price List')
    const editor = titleInput.closest('.admin-link-editor')

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Prices')
    await user.clear(within(editor).getByDisplayValue(/docs\.google\.com\/spreadsheets/i))
    await user.type(within(editor).getByRole('textbox', { name: /url/i }), 'https://example.com/prices')
    await user.click(within(editor).getByRole('button', { name: /save details/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        {
          key: 'link_overrides',
          value: {
            overrides: expect.objectContaining({
              'price-list': {
                title: 'Updated Prices',
                desc: 'Full catalog with updated per-vial pricing',
                href: 'https://example.com/prices',
              },
            }),
          },
        },
        { onConflict: 'key' }
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/details saved/i)
  })
})

describe('Admin — adding links', () => {
  const openLinksTab = async (user) => {
    await user.click(await screen.findByRole('button', { name: /links/i }))
    await screen.findByRole('heading', { name: /home page buttons/i })
  }

  const groupSection = (label) =>
    screen.getByRole('heading', { name: label }).closest('.admin-link-group')

  it('offers an add button in every category except the featured banner', async () => {
    const { user } = setup({ session: SESSION })

    await openLinksTab(user)

    expect(screen.getAllByRole('button', { name: /\+ add link/i })).toHaveLength(5)
    expect(within(groupSection('Featured')).queryByRole('button', { name: /add link/i })).toBeNull()
  })

  it('adds a new link to the chosen category and saves it', async () => {
    const { user, client } = setup({ session: SESSION })

    await openLinksTab(user)
    const shop = groupSection('SHOP')
    await user.click(within(shop).getByRole('button', { name: /\+ add link/i }))

    const form = within(shop).getByRole('form', { name: /new link in shop/i })
    await user.type(within(form).getByLabelText(/icon/i), '🛍️')
    await user.type(within(form).getByLabelText(/title/i), 'Restock form')
    await user.type(within(form).getByLabelText(/description/i), 'Reserve your next batch')
    await user.type(within(form).getByLabelText(/url/i), 'https://example.com/restock')
    await user.click(within(form).getByRole('button', { name: /^add link$/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        {
          key: 'custom_links',
          value: {
            links: [
              {
                id: expect.stringMatching(/^custom-/),
                groupId: 'shop',
                icon: '🛍️',
                title: 'Restock form',
                desc: 'Reserve your next batch',
                href: 'https://example.com/restock',
              },
            ],
          },
        },
        { onConflict: 'key' }
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/link added/i)
    expect(within(groupSection('SHOP')).getByDisplayValue('Restock form')).toBeVisible()
  })

  it('refuses a link without a usable URL and saves nothing', async () => {
    const { user, client } = setup({ session: SESSION })

    await openLinksTab(user)
    const learn = groupSection('LEARN & VERIFY')
    await user.click(within(learn).getByRole('button', { name: /\+ add link/i }))

    const form = within(learn).getByRole('form', { name: /new link/i })
    await user.type(within(form).getByLabelText(/title/i), 'Storage guide')
    await user.type(within(form).getByLabelText(/url/i), 'not a url')
    await user.click(within(form).getByRole('button', { name: /^add link$/i }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(/valid url/i)
    expect(client.upsert).not.toHaveBeenCalled()
  })

  it('shows links added earlier inside their category', async () => {
    const { user } = setup({
      session: SESSION,
      settings: { ...SETTINGS_ROWS, custom_links: { links: [SAVED_CUSTOM_LINK] } },
    })

    await openLinksTab(user)

    expect(await within(groupSection('SHOP')).findByDisplayValue('Restock form')).toBeVisible()
    expect(within(groupSection('SHOP')).getByDisplayValue('https://example.com/restock')).toBeVisible()
  })

  it('saves edits to an added link back onto the custom list', async () => {
    const { user, client } = setup({
      session: SESSION,
      settings: { ...SETTINGS_ROWS, custom_links: { links: [SAVED_CUSTOM_LINK] } },
    })

    await openLinksTab(user)
    const titleInput = await screen.findByDisplayValue('Restock form')
    const editor = titleInput.closest('.admin-link-editor')

    await user.clear(titleInput)
    await user.type(titleInput, 'Pre-order form')
    await user.click(within(editor).getByRole('button', { name: /save details/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        {
          key: 'custom_links',
          value: { links: [{ ...SAVED_CUSTOM_LINK, title: 'Pre-order form' }] },
        },
        { onConflict: 'key' }
      )
    )
  })

  it('removes an added link after the owner confirms', async () => {
    const { user, client } = setup({
      session: SESSION,
      settings: { ...SETTINGS_ROWS, custom_links: { links: [SAVED_CUSTOM_LINK] } },
    })

    await openLinksTab(user)
    const editor = (await screen.findByDisplayValue('Restock form')).closest('.admin-link-editor')

    await user.click(within(editor).getByRole('button', { name: /^remove$/i }))
    expect(client.upsert).not.toHaveBeenCalled()
    await user.click(within(editor).getByRole('button', { name: /yes, remove/i }))

    await waitFor(() =>
      expect(client.upsert).toHaveBeenCalledWith(
        { key: 'custom_links', value: { links: [] } },
        { onConflict: 'key' }
      )
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/link removed/i)
    expect(screen.queryByDisplayValue('Restock form')).toBeNull()
  })

  it('does not offer to remove the built-in buttons', async () => {
    const { user } = setup({ session: SESSION })

    await openLinksTab(user)
    const editor = (await screen.findByDisplayValue('Price List')).closest('.admin-link-editor')

    expect(within(editor).queryByRole('button', { name: /remove/i })).toBeNull()
  })
})

describe('Admin — only the shop owners get in', () => {
  it('turns away an account that is not an owner, and signs it out', async () => {
    const { user, client } = setup({ isOwner: false })

    await user.type(await screen.findByLabelText(/email/i), 'stranger@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct horse battery staple')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not have admin access/i)
    expect(client.rpc).toHaveBeenCalledWith('is_shop_owner')
    expect(client.auth.signOut).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: /price list/i })).toBeNull()
    expect(screen.queryByRole('navigation', { name: /admin sections/i })).toBeNull()
  })

  it('never shows the admin to a non-owner who arrives already signed in', async () => {
    const { client } = setup({ session: SESSION, isOwner: false })

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not have admin access/i)
    expect(screen.getByLabelText(/password/i)).toBeVisible()
    expect(screen.queryByRole('navigation', { name: /admin sections/i })).toBeNull()
    expect(client.auth.signOut).toHaveBeenCalled()
  })

  it('keeps the admin closed when ownership cannot be confirmed', async () => {
    setup({ session: SESSION, ownerCheckError: { message: 'network down' } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not confirm admin access/i)
    expect(screen.queryByRole('navigation', { name: /admin sections/i })).toBeNull()
  })

  it('lets an owner straight in', async () => {
    const { client } = setup({ session: SESSION })

    expect(await screen.findByRole('navigation', { name: /admin sections/i })).toBeVisible()
    expect(client.auth.signOut).not.toHaveBeenCalled()
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
