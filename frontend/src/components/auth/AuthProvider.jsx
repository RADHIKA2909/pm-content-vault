import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const AuthContext = createContext(null)

/**
 * The current session, kept in sync with Supabase.
 *
 * `ready` exists so the app can wait for the first `getSession()` to resolve.
 * Without it every reload renders the signed-out state for a frame and the
 * route guard bounces an authenticated user to /login before their stored
 * session has loaded — a flash of the login page on every refresh.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })

    // Fires on sign-in, sign-out and silent token refresh, so a token that
    // rotates mid-session doesn't leave the app holding a stale one.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      ready,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
