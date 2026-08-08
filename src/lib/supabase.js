import { createClient } from '@supabase/supabase-js'

/**
 * Supabase configuration lives in exactly two env vars. This module is the
 * only place that reads them, and the only place that decides whether a
 * deploy counts as "Supabase-enabled".
 */

const URL_VAR = 'VITE_SUPABASE_URL'
const KEY_VAR = 'VITE_SUPABASE_PUBLISHABLE_KEY'

/** One client per url+key pair; supabase-js is stateful and should not be rebuilt per render. */
const clients = new Map()

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
 * @param {Record<string, string|undefined>} [env]
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function createSupabaseClient(env = import.meta.env) {
  let config
  try {
    config = readSupabaseConfig(env)
  } catch (error) {
    // A broken config must not take the app down; the caller falls back.
    console.warn(`[supabase] ${error.message}`)
    return null
  }

  if (!config) return null

  const cacheKey = `${config.url}::${config.key}`
  if (!clients.has(cacheKey)) {
    clients.set(
      cacheKey,
      createClient(config.url, config.key, {
        // The catalogue is public, read-only data. No user sessions to keep.
        auth: { persistSession: false, autoRefreshToken: false },
      })
    )
  }

  return clients.get(cacheKey)
}
