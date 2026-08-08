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

const TABLE = 'site_settings'
const COLUMNS = 'key, value'

export const SHIPPING_FEE_KEY = 'shipping_fee'

/**
 * The fee the calculator charges when Supabase has never been configured, is
 * unreachable, or holds an unusable value. Matches the fee the shop charged
 * before it became editable.
 */
export const DEFAULT_SHIPPING_FEE = 250

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
