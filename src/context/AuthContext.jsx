import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { clearAllCaches, setCacheUser, invalidate } from '../lib/store'

const AuthContext = createContext(undefined)

// status: loading | unconfigured | signedOut | mfa | setup | denied | ready
async function evaluate(session) {
  if (!session) return 'signedOut'

  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (!aalError && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return 'mfa'

  const { data, error } = await supabase
    .from('app_members')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return 'setup'
    if (String(error.message).toLowerCase().includes('fetch')) return 'ready' // offline: cache tonen
    return 'denied'
  }
  return data ? 'ready' : 'denied'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState(isConfigured ? 'loading' : 'unconfigured')
  const lastKey = useRef(null)

  const apply = useCallback(async (nextSession) => {
    const key = nextSession ? `${nextSession.user.id}` : 'none'
    setSession(nextSession)
    if (nextSession) setCacheUser(nextSession.user.id)
    const nextStatus = await evaluate(nextSession)
    lastKey.current = `${key}|${nextStatus}`
    setStatus(nextStatus)
  }, [])

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') clearAllCaches()
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(nextSession)
        return
      }
      // Supabase-aanroepen niet rechtstreeks in deze callback doen (kan blokkeren).
      setTimeout(() => apply(nextSession), 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [apply])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return { error }
      },
      async verifyMfa(code) {
        const { data: factors, error } = await supabase.auth.mfa.listFactors()
        if (error) return { error }
        const factor = factors.totp.find((f) => f.status === 'verified')
        if (!factor) return { error: new Error('Geen authenticator gevonden') }
        const result = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
        if (!result.error) {
          const { data } = await supabase.auth.getSession()
          await apply(data.session)
          invalidate('*')
        }
        return { error: result.error }
      },
      async recheck() {
        const { data } = await supabase.auth.getSession()
        await apply(data.session)
      },
      async signOut({ everywhere = false } = {}) {
        clearAllCaches()
        await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' })
        setSession(null)
        setStatus('signedOut')
      },
    }),
    [session, status, apply],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth moet binnen een AuthProvider gebruikt worden')
  return ctx
}
