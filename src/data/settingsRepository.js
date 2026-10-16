/**
 * The boundary between the Supabase `site_settings` table and the small pieces
 * of shop configuration the owner edits from the admin page. Column names and
 * setting keys appear here and nowhere else.
 *
 * `site_settings` is a key/value table: `key text primary key`, `value jsonb`.
 * One row per setting keeps new settings from needing a migration each time.
 *
 * Guiding rule, inherited from productsRepository: a number we cannot trust is
 * worse than one that is a few hours stale, so anything malformed is dropped
 * and the bundled default stands in rather than the calculator charging
 * nonsense.
 */

import { isSafeOutboundUrl } from '../lib/url'

const TABLE = 'site_settings'
const COLUMNS = 'key, value'

export const SHIPPING_FEE_KEY = 'shipping_fee'
export const LINK_VISIBILITY_KEY = 'link_visibility'
export const LINK_OVERRIDES_KEY = 'link_overrides'
export const CUSTOM_LINKS_KEY = 'custom_links'

/**
 * The fee the calculator charges when Supabase has never been configured, is
 * unreachable, or holds an unusable value. Matches the fee the shop charged
 * before it became editable.
 */
export const DEFAULT_SHIPPING_FEE = 250

export const DEFAULT_LINK_VISIBILITY = Object.freeze({})
export const DEFAULT_LINK_OVERRIDES = Object.freeze({})
export const DEFAULT_CUSTOM_LINKS = Object.freeze([])

/**
 * A fee of 0 is a deliberate free-shipping promotion and must survive; only a
 * missing, negative, or non-finite amount is treated as unusable. This is the
 * one place this repository deliberately differs from normalizeProductRow,
 * which rejects a price of 0.
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {number|null} null when the row is unusable.
 */
export function normalizeShippingFee(row) {
  if (!row || typeof row !== 'object') return null

  const value = row.value
  if (!value || typeof value !== 'object') return null

  // Number(null) is 0, so an explicit nullish check keeps a null or absent
  // amount from reading as free shipping.
  if (value.amount === null || value.amount === undefined) return null

  // jsonb numbers can arrive as strings over PostgREST.
  const amount = Number(value.amount)
  if (!Number.isFinite(amount) || amount < 0) return null

  return amount
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {Record<string, boolean>|null} null when the row is unusable.
 */
export function normalizeLinkVisibility(row) {
  if (!row || typeof row !== 'object') return null

  const value = row.value
  if (!value || typeof value !== 'object') return null

  const visibility = value.visibility
  if (!visibility || typeof visibility !== 'object' || Array.isArray(visibility)) return null

  return Object.fromEntries(
    Object.entries(visibility).filter(([, enabled]) => typeof enabled === 'boolean')
  )
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {Record<string, {title?: string, desc?: string, href?: string}>|null}
 */
export function normalizeLinkOverrides(row) {
  if (!row || typeof row !== 'object') return null

  const value = row.value
  if (!value || typeof value !== 'object') return null

  const overrides = value.overrides
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return null

  const cleanOverrides = {}

  for (const [id, override] of Object.entries(overrides)) {
    if (!id.trim() || !override || typeof override !== 'object' || Array.isArray(override)) {
      continue
    }

    const cleanOverride = {}

    for (const field of ['title', 'desc', 'href']) {
      if (typeof override[field] === 'string') cleanOverride[field] = override[field]
    }

    if (Object.keys(cleanOverride).length > 0) cleanOverrides[id] = cleanOverride
  }

  return cleanOverrides
}

/**
 * @typedef {{id: string, groupId: string, icon: string, title: string, desc: string, href: string}} CustomLink
 */

/**
 * @param {unknown} link
 * @returns {CustomLink|null} null when the link is incomplete or its URL unsafe.
 */
function normalizeCustomLink(link) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) return null

  const { id, groupId, icon, title, desc, href } = link
  const isFilled = (field) => typeof field === 'string' && field.trim() !== ''

  if (!isFilled(id) || !isFilled(groupId) || !isFilled(title)) return null
  if (!isSafeOutboundUrl(href)) return null

  return {
    id,
    groupId,
    icon: typeof icon === 'string' ? icon : '',
    title,
    desc: typeof desc === 'string' ? desc : '',
    href,
  }
}

/**
 * Links the owner added from the admin page. Anything incomplete or pointing at
 * an unsafe URL is dropped, so a bad row can never render as a live button.
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {CustomLink[]|null} null when the row is unusable.
 */
export function normalizeCustomLinks(row) {
  if (!row || typeof row !== 'object') return null

  const value = row.value
  if (!value || typeof value !== 'object') return null

  if (!Array.isArray(value.links)) return null

  return value.links.map(normalizeCustomLink).filter(Boolean)
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {number} [options.fallback]
 * @returns {Promise<{amount: number, source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchShippingFee({ client, fallback = DEFAULT_SHIPPING_FEE } = {}) {
  const degrade = (error = null) => ({ amount: fallback, source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq('key', SHIPPING_FEE_KEY)
      .maybeSingle()

    if (error) return degrade(error.message ?? String(error))

    const amount = normalizeShippingFee(data)

    // Explicit null check, not a falsy check: a stored 0 is a real fee.
    if (amount === null) return degrade()

    return { amount, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {Record<string, boolean>} [options.fallback]
 * @returns {Promise<{visibility: Record<string, boolean>, source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchLinkVisibility({
  client,
  fallback = DEFAULT_LINK_VISIBILITY,
} = {}) {
  const degrade = (error = null) => ({ visibility: { ...fallback }, source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq('key', LINK_VISIBILITY_KEY)
      .maybeSingle()

    if (error) return degrade(error.message ?? String(error))

    const visibility = normalizeLinkVisibility(data)
    if (visibility === null) return degrade()

    return { visibility, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {Record<string, {title?: string, desc?: string, href?: string}>} [options.fallback]
 * @returns {Promise<{overrides: Record<string, {title?: string, desc?: string, href?: string}>, source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchLinkOverrides({
  client,
  fallback = DEFAULT_LINK_OVERRIDES,
} = {}) {
  const degrade = (error = null) => ({ overrides: { ...fallback }, source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq('key', LINK_OVERRIDES_KEY)
      .maybeSingle()

    if (error) return degrade(error.message ?? String(error))

    const overrides = normalizeLinkOverrides(data)
    if (overrides === null) return degrade()

    return { overrides, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {CustomLink[]} [options.fallback]
 * @returns {Promise<{links: CustomLink[], source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchCustomLinks({ client, fallback = DEFAULT_CUSTOM_LINKS } = {}) {
  const degrade = (error = null) => ({ links: [...fallback], source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client
      .from(TABLE)
      .select(COLUMNS)
      .eq('key', CUSTOM_LINKS_KEY)
      .maybeSingle()

    if (error) return degrade(error.message ?? String(error))

    const links = normalizeCustomLinks(data)
    if (links === null) return degrade()

    return { links, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}

/**
 * Writes the owner's new fee. Authorisation is enforced by row-level security
 * against the signed-in account, so a rejected write surfaces as an error here
 * rather than being prevented client-side.
 *
 * @param {number|string} amount
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
export async function updateShippingFee(amount, { client } = {}) {
  const fail = (error) => ({ ok: false, error })

  if (!client) return fail('Sign in before changing the shipping fee.')

  if (amount === null || amount === undefined || amount === '') {
    return fail('Enter a shipping fee.')
  }

  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee < 0) {
    return fail('Shipping fee must be zero or more.')
  }

  try {
    const { error } = await client
      .from(TABLE)
      .upsert({ key: SHIPPING_FEE_KEY, value: { amount: fee } }, { onConflict: 'key' })

    if (error) return fail(error.message ?? String(error))

    return { ok: true, error: null }
  } catch (cause) {
    return fail(cause?.message ?? String(cause))
  }
}

/**
 * @param {Record<string, boolean>} visibility
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
export async function updateLinkVisibility(visibility, { client } = {}) {
  const fail = (error) => ({ ok: false, error })

  if (!client) return fail('Sign in before changing link visibility.')

  if (!visibility || typeof visibility !== 'object' || Array.isArray(visibility)) {
    return fail('Link visibility must be a list of on/off values.')
  }

  const cleanVisibility = Object.fromEntries(
    Object.entries(visibility).filter(
      ([id, enabled]) => typeof id === 'string' && id.trim() && typeof enabled === 'boolean'
    )
  )

  try {
    const { error } = await client
      .from(TABLE)
      .upsert(
        { key: LINK_VISIBILITY_KEY, value: { visibility: cleanVisibility } },
        { onConflict: 'key' }
      )

    if (error) return fail(error.message ?? String(error))

    return { ok: true, error: null }
  } catch (cause) {
    return fail(cause?.message ?? String(cause))
  }
}

/**
 * @param {Record<string, {title?: string, desc?: string, href?: string}>} overrides
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
export async function updateLinkOverrides(overrides, { client } = {}) {
  const fail = (error) => ({ ok: false, error })

  if (!client) return fail('Sign in before changing link details.')

  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return fail('Link details must be a list of editable fields.')
  }

  const cleanOverrides = normalizeLinkOverrides({ value: { overrides } }) ?? {}

  try {
    const { error } = await client
      .from(TABLE)
      .upsert(
        { key: LINK_OVERRIDES_KEY, value: { overrides: cleanOverrides } },
        { onConflict: 'key' }
      )

    if (error) return fail(error.message ?? String(error))

    return { ok: true, error: null }
  } catch (cause) {
    return fail(cause?.message ?? String(cause))
  }
}

/**
 * Replaces the whole list of owner-added links. Unlike the read path, an
 * invalid link is refused rather than dropped, so the owner is told instead of
 * watching a button silently vanish.
 *
 * @param {CustomLink[]} links
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
export async function updateCustomLinks(links, { client } = {}) {
  const fail = (error) => ({ ok: false, error })

  if (!client) return fail('Sign in before changing links.')

  if (!Array.isArray(links)) return fail('Links must be a list.')

  const cleanLinks = links.map(normalizeCustomLink)
  if (cleanLinks.some((link) => link === null)) {
    return fail('Every link needs a title and a valid URL (https://…).')
  }

  try {
    const { error } = await client
      .from(TABLE)
      .upsert({ key: CUSTOM_LINKS_KEY, value: { links: cleanLinks } }, { onConflict: 'key' })

    if (error) return fail(error.message ?? String(error))

    return { ok: true, error: null }
  } catch (cause) {
    return fail(cause?.message ?? String(cause))
  }
}
