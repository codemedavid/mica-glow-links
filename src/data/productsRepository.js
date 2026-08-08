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

// ---------------------------------------------------------------------------
// Admin-side reads and writes
// ---------------------------------------------------------------------------
// The read above degrades to the bundled catalogue so a customer always gets a
// quote. The owner editing the catalogue needs the opposite: the exact table,
// empty if it is empty, because editing a price that is not in the database
// would be editing nothing. Hence a second read rather than a flag on the
// first -- the two have opposite failure modes.

/** The order the calculator lists products in, so the admin list matches it. */
const byNameThenCode = (a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code)

/**
 * Sorts a copy, never the array it was handed.
 *
 * @param {readonly import('./products').Product[]} products
 * @returns {import('./products').Product[]}
 */
export function sortProducts(products) {
  return [...products].sort(byNameThenCode)
}

const reason = (cause) => cause?.message ?? String(cause)

/**
 * Turns what the owner typed into a row the `products` table will accept.
 * Every rule here mirrors a database constraint, so a rejection is explained
 * in the admin page rather than bouncing back as a Postgres error string.
 *
 * @param {Record<string, unknown>|null|undefined} input
 * @returns {{ok: true, row: Record<string, unknown>, error: null}|{ok: false, row: null, error: string}}
 */
export function normalizeProductInput(input) {
  const reject = (error) => ({ ok: false, row: null, error })

  if (!input || typeof input !== 'object') return reject('Enter the product details.')

  const code = clean(input.code)
  if (!code) return reject('Enter a product code.')

  const name = clean(input.name)
  if (!name) return reject('Enter a product name.')

  // '' and undefined both land on a non-finite number, so one check covers a
  // blank field and a missing one.
  const vial = Number(input.vial)
  if (!Number.isFinite(vial) || vial <= 0) return reject('Enter a price above zero.')

  const stock = clean(input.stock).toLowerCase()

  return {
    ok: true,
    row: {
      code,
      name,
      spec: clean(input.spec) || null,
      vial_price: vial,
      stock: STOCK_STATES.includes(stock) ? stock : DEFAULT_STOCK,
    },
    error: null,
  }
}

/**
 * The catalogue exactly as stored, for editing. Unlike fetchProducts this never
 * substitutes the bundled list: an empty table must read as empty.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{products: readonly import('./products').Product[], error: string|null}>}
 */
export async function listProducts({ client } = {}) {
  const empty = (error) => ({ products: [], error })

  if (!client) return empty('Sign in to load the price list.')

  try {
    const { data, error } = await client.from(TABLE).select(COLUMNS)

    if (error) return empty(reason(error))

    const normalized = (data ?? []).map(normalizeProductRow).filter(Boolean)

    return { products: sortProducts(normalized), error: null }
  } catch (cause) {
    return empty(reason(cause))
  }
}

/**
 * Creates or updates one product. The code is the primary key, so the same
 * call covers "change this price" and "add this SKU".
 *
 * Authorisation lives in the `products_owner_write` row-level-security policy,
 * so a rejected write surfaces here rather than being guessed at client-side.
 *
 * @param {Record<string, unknown>} input
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, product: import('./products').Product|null, error: string|null}>}
 */
export async function saveProduct(input, { client } = {}) {
  const fail = (error) => ({ ok: false, product: null, error })

  if (!client) return fail('Sign in before changing the price list.')

  const normalized = normalizeProductInput(input)
  if (!normalized.ok) return fail(normalized.error)

  try {
    const { error } = await client.from(TABLE).upsert(normalized.row, { onConflict: 'code' })

    if (error) return fail(reason(error))

    // Returned in the app's Product shape so callers can splice it into a list
    // without a second round trip.
    return { ok: true, product: normalizeProductRow(normalized.row), error: null }
  } catch (cause) {
    return fail(reason(cause))
  }
}

/**
 * @param {string} code
 * @param {string} stock
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, stock: string|null, error: string|null}>}
 */
export async function setProductStock(code, stock, { client } = {}) {
  const fail = (error) => ({ ok: false, stock: null, error })

  if (!client) return fail('Sign in before changing stock.')

  const productCode = clean(code)
  if (!productCode) return fail('Choose a product first.')

  const next = clean(stock).toLowerCase()
  // The table carries the same check constraint; rejecting here turns a
  // Postgres error into a sentence.
  if (!STOCK_STATES.includes(next)) return fail(`"${stock}" is not a stock state.`)

  try {
    const { error } = await client.from(TABLE).update({ stock: next }).eq('code', productCode)

    if (error) return fail(reason(error))

    return { ok: true, stock: next, error: null }
  } catch (cause) {
    return fail(reason(cause))
  }
}

/**
 * @param {string} code
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
export async function deleteProduct(code, { client } = {}) {
  const fail = (error) => ({ ok: false, error })

  if (!client) return fail('Sign in before removing a product.')

  const productCode = clean(code)
  // Without this guard a blank code would issue a delete with no filter.
  if (!productCode) return fail('Choose a product first.')

  try {
    const { error } = await client.from(TABLE).delete().eq('code', productCode)

    if (error) return fail(reason(error))

    return { ok: true, error: null }
  } catch (cause) {
    return fail(reason(cause))
  }
}
