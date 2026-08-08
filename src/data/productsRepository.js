import { products as bundledProducts } from './products'

/**
 * The boundary between the Supabase `products` table and the Product shape
 * the rest of the app speaks. Column names appear here and nowhere else.
 *
 * Guiding rule: a price we cannot trust is worse than a price that is a few
 * hours stale, so anything malformed is dropped and the bundled catalogue
 * stands in rather than the calculator going blank.
 */

const TABLE = 'products'
const COLUMNS = 'code, name, spec, vial_price, stock'
const STOCK_STATES = ['in', 'low', 'out', 'unknown']
const DEFAULT_STOCK = 'unknown'

const clean = (value) => (typeof value === 'string' ? value.trim() : '')

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {import('./products').Product|null} null when the row is unusable.
 */
export function normalizeProductRow(row) {
  if (!row || typeof row !== 'object') return null

  const code = clean(row.code)
  const name = clean(row.name)
  if (!code || !name) return null

  // numeric columns can arrive as strings over PostgREST.
  const vial = Number(row.vial_price)
  if (!Number.isFinite(vial) || vial <= 0) return null

  const stock = clean(row.stock).toLowerCase()

  return {
    code,
    name,
    spec: clean(row.spec) || null,
    vial,
    stock: STOCK_STATES.includes(stock) ? stock : DEFAULT_STOCK,
  }
}

/**
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @param {readonly import('./products').Product[]} [options.fallback]
 * @returns {Promise<{products: readonly import('./products').Product[], source: 'supabase'|'fallback', error: string|null}>}
 */
export async function fetchProducts({ client, fallback = bundledProducts } = {}) {
  const degrade = (error = null) => ({ products: fallback, source: 'fallback', error })

  if (!client) return degrade()

  try {
    const { data, error } = await client.from(TABLE).select(COLUMNS)

    if (error) return degrade(error.message ?? String(error))

    const normalized = (data ?? []).map(normalizeProductRow).filter(Boolean)

    // An empty or entirely malformed table must not blank the calculator.
    if (!normalized.length) return degrade()

    return { products: normalized, source: 'supabase', error: null }
  } catch (cause) {
    return degrade(cause?.message ?? String(cause))
  }
}
