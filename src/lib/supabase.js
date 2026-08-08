import { createClient } from '@supabase/supabase-js'

/**
 * Supabase configuration lives in exactly two env vars. This module is the
 * only place that reads them, and the only place that decides whether a
 * deploy counts as "Supabase-enabled".
 */

const URL_VAR = 'VITE_SUPABASE_URL'
const KEY_VAR = 'VITE_SUPABASE_PUBLISHABLE_KEY'

/**
 * One client per url+key+mode triple; supabase-js is stateful and should not be
 * rebuilt per render. Mode is part of the key because the public and admin
 * clients share a url and key but differ in auth configuration — keying on
 * url+key alone would hand the second caller the first caller's client.
 */
const clients = new Map()

/** Read-only catalogue access. No session to keep, so none is stored. */
const PUBLIC_AUTH = { persistSession: false, autoRefreshToken: false }

/**
 * Authenticated admin access. The session persists so the owner stays signed in
 * across reloads, under its own storage key so the two clients never share
 * GoTrue state in the same tab.
 */
const ADMIN_AUTH = {
  persistSession: true,
  autoRefreshToken: true,
  storageKey: 'mica-glow-admin-auth',
}

const clean = (value) => (typeof value === 'string' ? value.trim() : '')

const assertUsableUrl = (url) => {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(
      `${URL_VAR} is not a valid absolute URL. Expected something like https://<project-ref>.supabase.co`
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${URL_VAR} must use http or https, but got "${parsed.protocol}".`)
  }
}

/**
 * @param {Record<string, string|undefined>} [env]
 * @returns {{url: string, key: string}|null} null when Supabase is deliberately absent.
 * @throws {Error} when only one of the two variables is set, or the url is unusable.
 */
export function readSupabaseConfig(env = import.meta.env) {
  const url = clean(env?.[URL_VAR])
  const key = clean(env?.[KEY_VAR])

  // Neither set is a legitimate "this deploy has no Supabase" state.
  if (!url && !key) return null

  // One set is a typo or a half-finished setup. Never guess.
  const missing = [!url && URL_VAR, !key && KEY_VAR].filter(Boolean)
  if (missing.length) {
    throw new Error(
      `Supabase is only half configured: ${missing.join(' and ')} is missing. Set both variables, or neither.`
    )
  }

  assertUsableUrl(url)

  return { url, key }
}

/**
 * Non-throwing form for callers that just want to know whether to try.
 * @param {Record<string, string|undefined>} [env]
 */
export function isSupabaseConfigured(env = import.meta.env) {
  try {
    return readSupabaseConfig(env) !== null
  } catch {
    return false
  }
}

/**
 * @param {'public'|'admin'} mode
 * @param {Record<string, string|undefined>} env
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function getClient(mode, env) {
  let config
  try {
    config = readSupabaseConfig(env)
  } catch (error) {
    // A broken config must not take the app down; the caller falls back.
    console.warn(`[supabase] ${error.message}`)
    return null
  }

  if (!config) return null

  const cacheKey = `${config.url}::${config.key}::${mode}`
  if (!clients.has(cacheKey)) {
    clients.set(
      cacheKey,
      createClient(config.url, config.key, {
        auth: mode === 'admin' ? ADMIN_AUTH : PUBLIC_AUTH,
      })
    )
  }

  return clients.get(cacheKey)
}

/**
 * The catalogue is public, read-only data. No user sessions to keep.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function createSupabaseClient(env = import.meta.env) {
  return getClient('public', env)
}

/**
 * Authenticated client for the admin page. Writes are authorised server-side by
 * row-level security against the signed-in account, so this client carries no
 * more privilege than whoever is logged in.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function createAdminSupabaseClient(env = import.meta.env) {
  return getClient('admin', env)
}
