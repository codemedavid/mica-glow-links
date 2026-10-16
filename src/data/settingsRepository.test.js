import { describe, it, expect, vi } from 'vitest'
import {
  CUSTOM_LINKS_KEY,
  DEFAULT_SHIPPING_FEE,
  LINK_OVERRIDES_KEY,
  LINK_VISIBILITY_KEY,
  normalizeShippingFee,
  normalizeCustomLinks,
  normalizeLinkOverrides,
  normalizeLinkVisibility,
  fetchShippingFee,
  fetchCustomLinks,
  fetchLinkOverrides,
  fetchLinkVisibility,
  updateShippingFee,
  updateCustomLinks,
  updateLinkOverrides,
  updateLinkVisibility,
} from './settingsRepository'

/**
 * Journeys:
 *  - As the shop owner, I want to change the shipping fee from the admin page,
 *    so that I do not need a developer and a redeploy when courier rates move.
 *  - As the shop owner, I want to set shipping to PHP 0 during a promo, so that
 *    free shipping shows as genuinely free.
 *  - As a customer, I want the calculator to still total correctly if the
 *    settings fetch fails, so that I never see a blank or wrong shipping row.
 *
 * The trap this guards: products reject a price of 0 as unusable, but a
 * shipping fee of 0 is a deliberate business decision. "Zero" and "missing"
 * must not collapse into the same value.
 */

const SETTINGS_TABLE = 'site_settings'
const SHIPPING_KEY = 'shipping_fee'

/** Minimal stand-in for the supabase-js query builder we actually use. */
const clientReturning = (result) => ({
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
  }),
})

const clientThatThrows = (error) => ({
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(error) }) }),
  }),
})

describe('normalizeShippingFee — trusting the stored value', () => {
  it('reads the amount out of the settings value object', () => {
    expect(normalizeShippingFee({ key: SHIPPING_KEY, value: { amount: 250 } })).toBe(250)
  })

  it('accepts zero, because free shipping is a real promotion', () => {
    expect(normalizeShippingFee({ value: { amount: 0 } })).toBe(0)
  })

  it('accepts a numeric string, since jsonb can arrive as text over PostgREST', () => {
    expect(normalizeShippingFee({ value: { amount: '180' } })).toBe(180)
  })

  it('accepts a decimal fee', () => {
    expect(normalizeShippingFee({ value: { amount: 99.5 } })).toBe(99.5)
  })

  it('rejects a negative fee, which would pay the customer to order', () => {
    expect(normalizeShippingFee({ value: { amount: -50 } })).toBeNull()
  })

  it('rejects a non-numeric amount rather than coercing it to zero', () => {
    expect(normalizeShippingFee({ value: { amount: 'free' } })).toBeNull()
  })

  it('rejects an infinite fee', () => {
    expect(normalizeShippingFee({ value: { amount: Infinity } })).toBeNull()
  })

  it('returns null for a missing row, which is not the same as a zero fee', () => {
    expect(normalizeShippingFee(null)).toBeNull()
  })

  it('returns null when the value object has no amount at all', () => {
    expect(normalizeShippingFee({ key: SHIPPING_KEY, value: {} })).toBeNull()
  })
})

describe('normalizeLinkVisibility — trusting only boolean toggles', () => {
  it('reads boolean values from the settings row', () => {
    expect(
      normalizeLinkVisibility({
        key: LINK_VISIBILITY_KEY,
        value: { visibility: { 'peptide-calculator': false, 'price-list': true } },
      })
    ).toEqual({ 'peptide-calculator': false, 'price-list': true })
  })

  it('drops non-boolean values rather than guessing', () => {
    expect(
      normalizeLinkVisibility({
        value: { visibility: { 'peptide-calculator': 'false', 'price-list': true } },
      })
    ).toEqual({ 'price-list': true })
  })

  it('returns null when the row is missing or malformed', () => {
    expect(normalizeLinkVisibility(null)).toBeNull()
    expect(normalizeLinkVisibility({ value: {} })).toBeNull()
    expect(normalizeLinkVisibility({ value: { visibility: [] } })).toBeNull()
  })
})

describe('normalizeLinkOverrides — trusting only editable text fields', () => {
  it('reads title, description, and href overrides from the settings row', () => {
    expect(
      normalizeLinkOverrides({
        key: LINK_OVERRIDES_KEY,
        value: {
          overrides: {
            'price-list': {
              title: 'Updated prices',
              desc: 'Fresh catalogue',
              href: 'https://example.com/prices',
            },
          },
        },
      })
    ).toEqual({
      'price-list': {
        title: 'Updated prices',
        desc: 'Fresh catalogue',
        href: 'https://example.com/prices',
      },
    })
  })

  it('drops non-string fields rather than guessing', () => {
    expect(
      normalizeLinkOverrides({
        value: {
          overrides: {
            'price-list': { title: 'Prices', desc: null, href: 123 },
          },
        },
      })
    ).toEqual({ 'price-list': { title: 'Prices' } })
  })

  it('returns null when the row is missing or malformed', () => {
    expect(normalizeLinkOverrides(null)).toBeNull()
    expect(normalizeLinkOverrides({ value: {} })).toBeNull()
    expect(normalizeLinkOverrides({ value: { overrides: [] } })).toBeNull()
  })
})

describe('fetchShippingFee — degrading without blanking the calculator', () => {
  it('returns the stored fee when Supabase answers', async () => {
    const result = await fetchShippingFee({
      client: clientReturning({ data: { value: { amount: 180 } }, error: null }),
    })

    expect(result).toEqual({ amount: 180, source: 'supabase', error: null })
  })

  it('returns a stored zero as a real fee, not as a fallback', async () => {
    const result = await fetchShippingFee({
      client: clientReturning({ data: { value: { amount: 0 } }, error: null }),
    })

    expect(result).toEqual({ amount: 0, source: 'supabase', error: null })
  })

  it('falls back to the default when no client is configured', async () => {
    const result = await fetchShippingFee({ client: null })

    expect(result).toEqual({
      amount: DEFAULT_SHIPPING_FEE,
      source: 'fallback',
      error: null,
    })
  })

  it('falls back when the settings row has never been created', async () => {
    const result = await fetchShippingFee({
      client: clientReturning({ data: null, error: null }),
    })

    expect(result.amount).toBe(DEFAULT_SHIPPING_FEE)
    expect(result.source).toBe('fallback')
  })

  it('falls back and reports the message when Supabase errors', async () => {
    const result = await fetchShippingFee({
      client: clientReturning({ data: null, error: { message: 'permission denied' } }),
    })

    expect(result).toEqual({
      amount: DEFAULT_SHIPPING_FEE,
      source: 'fallback',
      error: 'permission denied',
    })
  })

  it('falls back rather than throwing when the request rejects outright', async () => {
    const result = await fetchShippingFee({
      client: clientThatThrows(new Error('offline')),
    })

    expect(result.amount).toBe(DEFAULT_SHIPPING_FEE)
    expect(result.error).toBe('offline')
  })

  it('falls back when the stored fee is corrupt, rather than charging nonsense', async () => {
    const result = await fetchShippingFee({
      client: clientReturning({ data: { value: { amount: -1 } }, error: null }),
    })

    expect(result.amount).toBe(DEFAULT_SHIPPING_FEE)
    expect(result.source).toBe('fallback')
  })

  it('honours an explicit fallback so callers can supply their own default', async () => {
    const result = await fetchShippingFee({ client: null, fallback: 99 })

    expect(result.amount).toBe(99)
  })
})

describe('fetchLinkVisibility — degrading without hiding links', () => {
  it('returns the stored visibility map when Supabase answers', async () => {
    const result = await fetchLinkVisibility({
      client: clientReturning({
        data: { value: { visibility: { 'peptide-calculator': false } } },
        error: null,
      }),
    })

    expect(result).toEqual({
      visibility: { 'peptide-calculator': false },
      source: 'supabase',
      error: null,
    })
  })

  it('falls back to visible-by-default when no client is configured', async () => {
    const result = await fetchLinkVisibility({ client: null })

    expect(result).toEqual({ visibility: {}, source: 'fallback', error: null })
  })

  it('falls back when Supabase errors', async () => {
    const result = await fetchLinkVisibility({
      client: clientReturning({ data: null, error: { message: 'permission denied' } }),
    })

    expect(result.visibility).toEqual({})
    expect(result.error).toBe('permission denied')
  })
})

describe('fetchLinkOverrides — degrading without changing links', () => {
  it('returns the stored overrides when Supabase answers', async () => {
    const result = await fetchLinkOverrides({
      client: clientReturning({
        data: { value: { overrides: { 'price-list': { title: 'Updated prices' } } } },
        error: null,
      }),
    })

    expect(result).toEqual({
      overrides: { 'price-list': { title: 'Updated prices' } },
      source: 'supabase',
      error: null,
    })
  })

  it('falls back to no overrides when no client is configured', async () => {
    const result = await fetchLinkOverrides({ client: null })

    expect(result).toEqual({ overrides: {}, source: 'fallback', error: null })
  })

  it('falls back when Supabase errors', async () => {
    const result = await fetchLinkOverrides({
      client: clientReturning({ data: null, error: { message: 'permission denied' } }),
    })

    expect(result.overrides).toEqual({})
    expect(result.error).toBe('permission denied')
  })
})

describe('updateShippingFee — writing the owner’s new fee', () => {
  const upsertSpy = (result) => {
    const upsert = vi.fn(() => Promise.resolve(result))
    return { upsert, client: { from: vi.fn(() => ({ upsert })) } }
  }

  it('upserts the fee onto the shipping_fee settings row', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    await updateShippingFee(180, { client })

    expect(client.from).toHaveBeenCalledWith(SETTINGS_TABLE)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: SHIPPING_KEY, value: { amount: 180 } }),
      expect.anything()
    )
  })

  it('reports success so the admin page can confirm the save', async () => {
    const { client } = upsertSpy({ error: null })

    expect(await updateShippingFee(180, { client })).toEqual({ ok: true, error: null })
  })

  it('writes a zero fee, so a free-shipping promo can actually be set', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateShippingFee(0, { client })

    expect(result.ok).toBe(true)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: { amount: 0 } }),
      expect.anything()
    )
  })

  it('refuses a negative fee without touching the database', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateShippingFee(-1, { client })

    expect(result.ok).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses a non-numeric fee without touching the database', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateShippingFee('free', { client })

    expect(result.ok).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses to write when nobody is signed in', async () => {
    const result = await updateShippingFee(180, { client: null })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign|auth/i)
  })

  it('surfaces a row-level-security rejection as a readable failure', async () => {
    const { client } = upsertSpy({
      error: { message: 'new row violates row-level security policy' },
    })

    const result = await updateShippingFee(180, { client })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/row-level security/)
  })

  it('reports a thrown network failure instead of rejecting', async () => {
    const client = {
      from: () => ({ upsert: () => Promise.reject(new Error('offline')) }),
    }

    expect(await updateShippingFee(180, { client })).toEqual({ ok: false, error: 'offline' })
  })
})

describe('updateLinkVisibility — writing button on/off states', () => {
  const upsertSpy = (result) => {
    const upsert = vi.fn(() => Promise.resolve(result))
    return { upsert, client: { from: vi.fn(() => ({ upsert })) } }
  }

  it('upserts the visibility map onto the link_visibility settings row', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    await updateLinkVisibility({ 'peptide-calculator': false, 'price-list': true }, { client })

    expect(client.from).toHaveBeenCalledWith(SETTINGS_TABLE)
    expect(upsert).toHaveBeenCalledWith(
      {
        key: LINK_VISIBILITY_KEY,
        value: { visibility: { 'peptide-calculator': false, 'price-list': true } },
      },
      { onConflict: 'key' }
    )
  })

  it('reports success so the admin page can confirm the save', async () => {
    const { client } = upsertSpy({ error: null })

    expect(await updateLinkVisibility({ 'peptide-calculator': false }, { client })).toEqual({
      ok: true,
      error: null,
    })
  })

  it('refuses to write when nobody is signed in', async () => {
    const result = await updateLinkVisibility({ 'peptide-calculator': false }, { client: null })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign|auth/i)
  })

  it('surfaces a row-level-security rejection as a readable failure', async () => {
    const { client } = upsertSpy({
      error: { message: 'new row violates row-level security policy' },
    })

    const result = await updateLinkVisibility({ 'peptide-calculator': false }, { client })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/row-level security/)
  })
})

describe('updateLinkOverrides — writing editable link details', () => {
  const upsertSpy = (result) => {
    const upsert = vi.fn(() => Promise.resolve(result))
    return { upsert, client: { from: vi.fn(() => ({ upsert })) } }
  }

  it('upserts editable details onto the link_overrides settings row', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    await updateLinkOverrides(
      { 'price-list': { title: 'Updated prices', desc: 'Fresh list', href: 'https://example.com' } },
      { client }
    )

    expect(client.from).toHaveBeenCalledWith(SETTINGS_TABLE)
    expect(upsert).toHaveBeenCalledWith(
      {
        key: LINK_OVERRIDES_KEY,
        value: {
          overrides: {
            'price-list': {
              title: 'Updated prices',
              desc: 'Fresh list',
              href: 'https://example.com',
            },
          },
        },
      },
      { onConflict: 'key' }
    )
  })

  it('reports success so the admin page can confirm the save', async () => {
    const { client } = upsertSpy({ error: null })

    expect(await updateLinkOverrides({ 'price-list': { title: 'Updated prices' } }, { client }))
      .toEqual({ ok: true, error: null })
  })

  it('refuses to write when nobody is signed in', async () => {
    const result = await updateLinkOverrides({ 'price-list': { title: 'Updated prices' } }, { client: null })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign|auth/i)
  })
})

describe('normalizeCustomLinks — trusting only complete, safe links', () => {
  const VALID = {
    id: 'custom-abc',
    groupId: 'shop',
    icon: '🛍️',
    title: 'Restock form',
    desc: 'Reserve your next batch',
    href: 'https://example.com/restock',
  }

  it('reads the stored links in order', () => {
    expect(normalizeCustomLinks({ value: { links: [VALID] } })).toEqual([VALID])
  })

  it('defaults a missing icon and description to empty strings', () => {
    const { icon: _icon, desc: _desc, ...bare } = VALID

    expect(normalizeCustomLinks({ value: { links: [bare] } })).toEqual([
      { ...bare, icon: '', desc: '' },
    ])
  })

  it('drops a link whose URL could run script, rather than rendering it', () => {
    const links = [VALID, { ...VALID, id: 'custom-bad', href: 'javascript:alert(1)' }]

    expect(normalizeCustomLinks({ value: { links } })).toEqual([VALID])
  })

  it('drops links missing an id, category, or title', () => {
    const links = [
      { ...VALID, id: '' },
      { ...VALID, groupId: undefined },
      { ...VALID, title: '   ' },
    ]

    expect(normalizeCustomLinks({ value: { links } })).toEqual([])
  })

  it('returns null when the row is missing or malformed', () => {
    expect(normalizeCustomLinks(null)).toBeNull()
    expect(normalizeCustomLinks({ value: { links: {} } })).toBeNull()
  })
})

describe('fetchCustomLinks — degrading to the built-in links only', () => {
  it('returns the stored links when Supabase answers', async () => {
    const link = {
      id: 'custom-abc',
      groupId: 'shop',
      icon: '',
      title: 'Restock form',
      desc: '',
      href: 'https://example.com/restock',
    }
    const client = clientReturning({
      data: { key: CUSTOM_LINKS_KEY, value: { links: [link] } },
      error: null,
    })

    expect(await fetchCustomLinks({ client })).toEqual({
      links: [link],
      source: 'supabase',
      error: null,
    })
  })

  it('falls back to no custom links when no client is configured', async () => {
    expect(await fetchCustomLinks({ client: null })).toEqual({
      links: [],
      source: 'fallback',
      error: null,
    })
  })

  it('falls back when Supabase errors', async () => {
    const client = clientReturning({ data: null, error: { message: 'boom' } })

    expect(await fetchCustomLinks({ client })).toEqual({
      links: [],
      source: 'fallback',
      error: 'boom',
    })
  })
})

describe('updateCustomLinks — writing links the owner added', () => {
  const upsertSpy = (result) => {
    const upsert = vi.fn(() => Promise.resolve(result))
    return { upsert, client: { from: vi.fn(() => ({ upsert })) } }
  }

  const LINK = {
    id: 'custom-abc',
    groupId: 'learn',
    icon: '📗',
    title: 'Storage guide',
    desc: 'How to store your vials',
    href: 'https://example.com/storage',
  }

  it('upserts the list onto the custom_links settings row', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    expect(await updateCustomLinks([LINK], { client })).toEqual({ ok: true, error: null })
    expect(client.from).toHaveBeenCalledWith(SETTINGS_TABLE)
    expect(upsert).toHaveBeenCalledWith(
      { key: CUSTOM_LINKS_KEY, value: { links: [LINK] } },
      { onConflict: 'key' }
    )
  })

  it('refuses an unsafe URL without touching the database', async () => {
    const { upsert, client } = upsertSpy({ error: null })

    const result = await updateCustomLinks([{ ...LINK, href: 'javascript:alert(1)' }], { client })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/url/i)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('refuses to write when nobody is signed in', async () => {
    const result = await updateCustomLinks([LINK], { client: null })

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign/i)
  })

  it('surfaces a row-level-security rejection as a readable failure', async () => {
    const { client } = upsertSpy({ error: { message: 'new row violates row-level security policy' } })

    expect(await updateCustomLinks([LINK], { client })).toEqual({
      ok: false,
      error: 'new row violates row-level security policy',
    })
  })
})
