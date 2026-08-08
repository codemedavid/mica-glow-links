import { useCallback, useEffect, useState } from 'react'
import { createAdminSupabaseClient } from '../lib/supabase'

const NO_CLIENT = 'Supabase is not configured for this deploy.'

/**
 * The signed-in state of the admin page.
 *
 * No credential is ever held here. `signIn` hands the email and password
 * straight to Supabase Auth and keeps only the session it returns; the password
 * is never stored, logged, or placed in component state.
 *
 * Authorisation is not this hook's job. Being signed in is not the same as
 * being allowed to write — row-level security decides that per statement, so a
 * session belonging to the wrong account still fails at the database.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 */
export function useAdminSession({ client = createAdminSupabaseClient() } = {}) {
  const [session, setSession] = useState(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [signInError, setSignInError] = useState(null)

  useEffect(() => {
    // An absent client is a configuration fact, not an event to react to; it is
    // derived below rather than pushed into state from inside this effect.
    if (!client) return undefined

    let active = true

    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data?.session ?? null)
      setHasChecked(true)
    })

    // Keeps the page honest if the session expires or is revoked in another tab.
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next ?? null)
    })

    return () => {
      active = false
      data?.subscription?.unsubscribe?.()
    }
  }, [client])

  const signIn = useCallback(
    async (email, password) => {
      if (!client) return { ok: false, error: NO_CLIENT }

      setSignInError(null)

      const { data, error: cause } = await client.auth.signInWithPassword({ email, password })

      if (cause) {
        const message = cause.message ?? String(cause)
        setSignInError(message)
        return { ok: false, error: message }
      }

      setSession(data?.session ?? null)
      return { ok: true, error: null }
    },
    [client]
  )

  const signOut = useCallback(async () => {
    if (!client) return
    await client.auth.signOut()
    setSession(null)
  }, [client])

  // Derived rather than stored, so no effect writes state synchronously.
  const isLoading = client ? !hasChecked : false
  const error = client ? signInError : NO_CLIENT

  return { session, isLoading, error, signIn, signOut }
}
