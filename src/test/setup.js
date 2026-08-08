import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Vite loads .env into import.meta.env during tests too. Without this, any
// component rendered without an injected client would build a real Supabase
// client and fire live HTTP at the production project — slow, flaky, and
// dependent on someone else's database. Tests that want Supabase inject a
// fake client explicitly.
vi.stubEnv('VITE_SUPABASE_URL', '')
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')

afterEach(() => {
  cleanup()
})
