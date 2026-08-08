import { describe, it, expect } from 'vitest'
import {
  isSupabaseConfigured,
  readSupabaseConfig,
  createSupabaseClient,
} from './supabase'

/**
 * Journey: As a developer, I want misconfigured Supabase env vars to fail
 * loudly rather than silently serving stale prices.
 *
 * The distinction that matters: *neither* variable set is a legitimate
 * "this deploy has no Supabase" state and must stay quiet. *One* variable
 * set is a typo or a half-finished setup, and must be loud.
 */

const VALID = {
  VITE_SUPABASE_URL: 'https://qghvprleycdaefmpfyjc.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
}

describe('readSupabaseConfig', () => {
  it('reads a well-formed url and key', () => {
    expect(readSupabaseConfig(VALID)).toEqual({
      url: 'https://qghvprleycdaefmpfyjc.supabase.co',
      key: 'sb_publishable_test_key',
    })
  })

  it('returns null when neither variable is set, so a Supabase-less deploy stays quiet', () => {
    expect(readSupabaseConfig({})).toBeNull()
  })

  it('treats blank strings as absent rather than as a misconfiguration', () => {
    const config = readSupabaseConfig({
      VITE_SUPABASE_URL: '   ',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    })

    expect(config).toBeNull()
  })

  it('trims surrounding whitespace off both values', () => {
    const config = readSupabaseConfig({
      VITE_SUPABASE_URL: '  https://abc.supabase.co  ',
      VITE_SUPABASE_PUBLISHABLE_KEY: '\tsb_publishable_x\n',
    })

    expect(config).toEqual({ url: 'https://abc.supabase.co', key: 'sb_publishable_x' })
  })

  it('throws when the url is set but the key is missing', () => {
    expect(() =>
      readSupabaseConfig({ VITE_SUPABASE_URL: VALID.VITE_SUPABASE_URL })
    ).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('throws when the key is set but the url is missing', () => {
    expect(() =>
      readSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: VALID.VITE_SUPABASE_PUBLISHABLE_KEY })
    ).toThrow(/VITE_SUPABASE_URL/)
  })

  it('throws when the url is not a parseable absolute url', () => {
    expect(() =>
      readSupabaseConfig({ ...VALID, VITE_SUPABASE_URL: 'qghv.supabase.co' })
    ).toThrow(/VITE_SUPABASE_URL/)
  })

  it('throws when the url uses a non-http protocol', () => {
    expect(() =>
      readSupabaseConfig({ ...VALID, VITE_SUPABASE_URL: 'postgres://db.supabase.co:5432' })
    ).toThrow(/VITE_SUPABASE_URL/)
  })

  it('names the offending variable in the error rather than saying "invalid config"', () => {
    let message = ''
    try {
      readSupabaseConfig({ VITE_SUPABASE_URL: VALID.VITE_SUPABASE_URL })
    } catch (error) {
      message = error.message
    }

    expect(message).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('never echoes the key value into an error message', () => {
    let message = ''
    try {
      readSupabaseConfig({ ...VALID, VITE_SUPABASE_URL: 'not a url' })
    } catch (error) {
      message = error.message
    }

    expect(message).not.toContain('sb_publishable_test_key')
  })
})

describe('isSupabaseConfigured', () => {
  it('is true for a complete, valid pair', () => {
    expect(isSupabaseConfigured(VALID)).toBe(true)
  })

  it('is false when nothing is set', () => {
    expect(isSupabaseConfigured({})).toBe(false)
  })

  it('is false rather than throwing for a broken pair, so callers can degrade gracefully', () => {
    expect(isSupabaseConfigured({ VITE_SUPABASE_URL: VALID.VITE_SUPABASE_URL })).toBe(false)
  })
})

describe('createSupabaseClient', () => {
  it('returns null when Supabase is not configured', () => {
    expect(createSupabaseClient({})).toBeNull()
  })

  it('returns null rather than throwing when the config is broken', () => {
    expect(createSupabaseClient({ VITE_SUPABASE_URL: 'not a url' })).toBeNull()
  })

  it('returns a queryable client when configured', () => {
    const client = createSupabaseClient(VALID)

    expect(client).not.toBeNull()
    expect(typeof client.from).toBe('function')
  })

  it('reuses one client per config instead of building a new one per call', () => {
    expect(createSupabaseClient(VALID)).toBe(createSupabaseClient(VALID))
  })
})
