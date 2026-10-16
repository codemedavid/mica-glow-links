import { useCallback, useEffect, useState } from 'react'
import { createAdminSupabaseClient } from '../lib/supabase'

const NO_CLIENT = 'Supabase is not configured for this deploy.'
export const NOT_AN_OWNER = 'This account does not have admin access.'
export const OWNER_CHECK_FAILED =
  'Could not confirm admin access. Check your connection and sign in again.'

/**
 * Asks the database whether the current session belongs to a shop owner. The
 * owner list lives only in public.is_shop_owner(), the same function the
 * write policies use, so the page and the database can never disagree and the
 * owners' emails never ship in the bundle. Fails closed.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @returns {Promise<{isOwner: boolean, error: string|null}>}
 */
async function checkIsOwner(client) {
  try {
    const { data, error } = await client.rpc('is_shop_owner')
    if (error) return { isOwner: false, error: OWNER_CHECK_FAILED }
    return data === true ? { isOwner: true, error: null } : { isOwner: false, error: NOT_AN_OWNER }
  } catch {
    return { isOwner: false, error: OWNER_CHECK_FAILED }
  }
}

const sessionKey = (session) => session?.user?.id ?? session?.user?.email ?? null

/**
 * The signed-in state of the admin page.
 *
 * No credential is ever held here. `signIn` hands the email and password
 * straight to Supabase Auth and keeps only the session it returns; the password
 * is never stored, logged, or placed in component state.
 *
 * Only a session the database confirms as a shop owner is ever returned; any
 * other account is signed straight back out with `accessError` explaining why.
 * That gate keeps the admin screens from showing, but it is not the security
 * boundary: row-level security still decides every write per statement.
 *
 * @param {object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient|null} [options.client]
 */
export function useAdminSession({ client = createAdminSupabaseClient() } = {}) {
  const [session, setSession] = useState(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [signInError, setSignInError] = useState(null)
  const [ownerCheck, setOwnerCheck] = useState({ key: null, isOwner: false })
  const [accessError, setAccessError] = useState(null)

  const currentKey = sessionKey(session)

  useEffect(() => {
    if (!client || !session || ownerCheck.key === currentKey) return undefined

    let active = true

    checkIsOwner(client).then(({ isOwner, error: denial }) => {
      if (!active) return

      setOwnerCheck({ key: currentKey, isOwner })
      if (isOwner) return

      setAccessError(denial)
      setSession(null)
      client.auth.signOut()
    })

    return () => {
      active = false
    }
  }, [client, session, currentKey, ownerCheck.key])

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
      setAccessError(null)

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
  const isCheckingOwner = Boolean(session) && ownerCheck.key !== currentKey
  const isOwner = Boolean(session) && ownerCheck.key === currentKey && ownerCheck.isOwner
  const isLoading = client ? !hasChecked || isCheckingOwner : false
  const error = client ? signInError : NO_CLIENT

  return {
    session: isOwner ? session : null,
    isLoading,
    error,
    accessError,
    signIn,
    signOut,
  }
}
